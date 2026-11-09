"""Backtest of a proposed auto-approve rule against Walker's past decisions.

Not wired into the nightly or promote. Nothing here approves anything; it
only reports what the rule would have done. See docs/AUTO_APPROVE_BACKTEST.md.

Usage:
  python -m tools.auto_approve_backtest collect OUT.json REPO [REPO ...] [--first]
      Recover the last committed version of every data/pending/<id>.json
      from each repository's full history (all refs, --full-history, so
      files that only ever lived on a merged side branch are found).
  python -m tools.auto_approve_backtest run OUT.json [--json RESULT.json]
      Label every recovered candidate with Walker's decision and apply the
      rule. Prints the confusion counts and every disagreement.

The candidate files live in git history, including the pre-cutover
development repository, which is not public. Only the counts, ids and
reasons go into the report.
"""
import argparse
import collections
import datetime
import glob
import gzip
import json
import os
import subprocess
import sys

from pipeline import config, validate
from pipeline.backfill import slugify
from pipeline.correlate import base_slug
from pipeline.pending import normalize_url

# Detectors that are not the lab's own web page. An Epoch row is curated by
# Epoch AI; an OpenRouter listing is an API catalog; a Hugging Face repo is a
# separate publication channel. Each counts once as the independent signal.
INDEPENDENT_DETECTORS = ("epoch", "hf_orgs", "openrouter")


def _git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], capture_output=True,
                          text=True, encoding="utf-8").stdout


def collect(out_path, repos, first=False):
    """Last committed version of each candidate (the state Walker decided
    on), or with first=True the first one (the nightly's output as detected,
    before any triage edit). The approval flag is taken from any version."""
    out = {}
    for repo in repos:
        paths = sorted({p for p in _git(repo, "log", "--all", "--full-history",
                                        "--name-only", "--format=", "--",
                                        "data/pending").split("\n")
                        if p.endswith(".json") and not p.endswith("rejected.json")})
        for p in paths:
            cid = os.path.basename(p)[:-5]
            versions = []
            for line in _git(repo, "log", "--all", "--full-history",
                             "--format=%H %cI", "--", p).split("\n"):
                if not line:
                    continue
                h, t = line.split()
                r = subprocess.run(["git", "-C", repo, "show", f"{h}:{p}"],
                                   capture_output=True, text=True,
                                   encoding="utf-8")
                if r.returncode == 0:
                    try:
                        versions.append((t, json.loads(r.stdout)))
                    except ValueError:
                        pass
            if not versions:
                continue
            approved = any(v.get("approved") is True for _, v in versions)
            pick = min if first else max
            t, latest = pick(versions, key=lambda x: x[0])
            prev = out.get(cid)
            if prev is None or (t < prev["seen_at"] if first else t > prev["seen_at"]):
                out[cid] = {"seen_at": t, "c": latest,
                            "approved_flag": approved or bool(prev and prev["approved_flag"])}
            else:
                prev["approved_flag"] = prev["approved_flag"] or approved
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    return out


def _is_lab_web_page(org, url):
    """The lab's own web page: a lab domain, not a Hugging Face repo."""
    return bool(url) and config.is_lab_url(org, url) \
        and config.url_host(url) != "huggingface.co"


def _days(a, b):
    return abs((datetime.date.fromisoformat(a[:10])
                - datetime.date.fromisoformat(b[:10])).days)


def rule(c, variant="AA-1"):
    """Rule AA-1 (or AA-2). Returns (would_publish, reason).

    A candidate publishes without Walker only when every clause holds:
      1. A draft exists and was read from the lab's own web page (a lab
         domain, not Hugging Face, not an aggregator), with no review note.
      2. The lab page states all four copied fields: model name, org (the
         candidate's registry org), release date, and an availability class
         in the schema's three public classes.
      3. At least one independent signal (an Epoch row, a Hugging Face repo
         or an API catalog listing) names the same model: its base slug
         equals the drafted name's base slug.
      4. That signal's date agrees with the lab page's date within
         config.DATE_TOLERANCE_DAYS.
    AA-2 is AA-1 with two clauses tightened:
      3'. The independent signal is an API catalog listing or a Hugging Face
          repo. An Epoch row does not count: for most Epoch-detected
          candidates the lab page was found through the Epoch row's own
          link, so the two are one chain, and Epoch's date is usually copied
          from that page.
      3''. Names match exactly (same slug), not by base slug, so a sized or
          suffixed name is not merged into a shorter one.
    What it would publish: those four fields and the source URLs. Summary,
    benchmarks, parameters and disclosure links are never auto-published;
    they wait for the weekly list.
    """
    org = c["org"]
    d = c.get("draft_entry") or {}
    if not d:
        return False, "no draft"
    src = (d.get("extraction") or {}).get("source_url") or c.get("announcement_url")
    if d.get("third_party_source") or d.get("review_note"):
        return False, "draft carries a review note"
    if not _is_lab_web_page(org, src):
        return False, "no lab page: draft not read from a lab domain"
    name, date, avail = d.get("model_name"), d.get("date"), d.get("availability_class")
    if not name or not date:
        return False, "lab page does not give name and date"
    if avail not in validate.AVAILABILITY_CLASSES:
        return False, f"lab page gives no public availability class ({avail})"
    want = base_slug(name)
    allowed = INDEPENDENT_DETECTORS if variant == "AA-1"         else ("hf_orgs", "openrouter")
    indep = [s for s in c.get("signals", []) if s.get("detector") in allowed]
    if not indep:
        return False, ("no independent signal (lab page only)"
                       if variant == "AA-1" else
                       "no API catalog or Hugging Face signal")
    if variant == "AA-1":
        named = [s for s in indep
                 if base_slug(s.get("model_hint") or "") == want]
    else:
        named = [s for s in indep
                 if slugify(s.get("model_hint") or "") == slugify(name)]
    if not named:
        hints = sorted({s.get("model_hint") for s in indep})
        return False, f"independent signal names a different model ({', '.join(map(str, hints))} vs {name})"
    dated = [s for s in named if s.get("date_hint")
             and _days(s["date_hint"], date) <= config.DATE_TOLERANCE_DAYS]
    if not dated:
        return False, "independent signal's date disagrees with the lab page"
    return True, "lab page + " + "/".join(sorted({s["detector"] for s in dated}))


def label(cands, root="."):
    rej = {r["id"]: r for r in json.load(open(
        os.path.join(root, "data/pending/rejected.json"), encoding="utf-8"))}
    entries = []
    for f in sorted(glob.glob(os.path.join(root, "data/entries/*.json.gz"))):
        with gzip.open(f) as g:
            entries += json.load(g)
    byid = {e["id"]: e for e in entries}
    by_url = collections.defaultdict(set)
    for e in entries:
        for s in e.get("sources", []):
            by_url[normalize_url(s["url"])].add(e["id"])
    pend = {p.split("/")[-1][:-5] for p in _git(
        root, "ls-tree", "--name-only", "origin/nightly-pending",
        "data/pending/").split() if not p.endswith("rejected.json")}
    out = {}
    for cid, rec in cands.items():
        c = rec["c"]
        d = c.get("draft_entry") or {}
        eid = None
        if d.get("model_name"):
            x = validate.make_entry_id(c["org"], d["model_name"])
            eid = x if x in byid else None
        if not eid and cid in byid:
            eid = cid
        if not eid and c.get("announcement_url"):
            hits = by_url.get(normalize_url(c["announcement_url"])) or set()
            eid = next(iter(hits)) if len(hits) == 1 else None
        if cid in pend:
            lab = "pending"
        elif cid in rej:
            lab = "rejected"
        elif rec["approved_flag"] or (eid and byid[eid].get("origin") in ("nightly-pipeline", "manual")):
            lab = "approved"
        elif eid:
            lab = "on_record_via_epoch"
        else:
            lab = "unresolved"
        out[cid] = {"label": lab, "entry": eid,
                    "reject_reason": rej.get(cid, {}).get("reason")}
    return out


def run(cands_path, json_out=None, variant="AA-1"):
    with open(cands_path, encoding="utf-8") as f:
        cands = json.load(f)
    labels = label(cands)
    rows = []
    for cid in sorted(cands):
        ok, why = rule(cands[cid]["c"], variant)
        rows.append({"id": cid, **labels[cid], "rule": ok, "why": why,
                     "detectors": sorted({s.get("detector", "manual")
                                          for s in cands[cid]["c"].get("signals", [])})})
    tally = collections.Counter((r["label"], r["rule"]) for r in rows)
    for k in sorted(tally):
        print(f"{k[0]:22} rule={'publish' if k[1] else 'hold':8} {tally[k]}")
    print("\nRejections the rule would have published:")
    for r in rows:
        if r["label"] == "rejected" and r["rule"]:
            print(f"  {r['id']}: {r['why']} | Walker: {r['reject_reason']}")
    print("\nApprovals the rule would have held:")
    for r in rows:
        if r["label"] == "approved" and not r["rule"]:
            print(f"  {r['id']} [{','.join(r['detectors'])}]: {r['why']}")
    if json_out:
        with open(json_out, "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=1, ensure_ascii=False)
    return rows


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("collect")
    c.add_argument("out")
    c.add_argument("repos", nargs="+")
    c.add_argument("--first", action="store_true",
                   help="keep each candidate's first committed version")
    r = sub.add_parser("run")
    r.add_argument("candidates")
    r.add_argument("--json", default=None)
    r.add_argument("--variant", default="AA-1", choices=("AA-1", "AA-2"))
    a = ap.parse_args()
    if a.cmd == "collect":
        print(len(collect(a.out, a.repos, a.first)), "candidates recovered")
    else:
        run(a.candidates, a.json, a.variant)
    return 0


if __name__ == "__main__":
    sys.exit(main())
