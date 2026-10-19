"""Promote approved pending candidates into the published dataset.

The approval flow (D11, invariant 1): the nightly writes candidates to
data/pending/ on the nightly-pending branch. Walker marks a candidate
approved by setting "approved": true in its JSON (one click in the GitHub
web editor), then runs the promote workflow, which converts every approved
candidate into a validated entry, rewrites the aggregates and derived
views, and deletes the candidate file, all still on the branch. Merging
the branch is publication. No code path here or anywhere writes to main.
"""
import argparse
import json
import os
import re
import sys

from . import archive, derive, pending, store, validate
from .backfill import family_key


class PromotionError(ValueError):
    pass


def _numeric(value: str) -> float:
    m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*%?\s*$", str(value))
    if not m:
        raise PromotionError(f"benchmark value {value!r} is not numeric")
    return float(m.group(1))


def _parameters(draft: dict):
    """Total parameter count from the draft, or NOT_DISCLOSED.

    Absent and unparseable both resolve to NOT_DISCLOSED, which is the honest
    reading: the registrar has no count it can source. A stated count is
    recorded as a number so it joins the disclosure measure on the same terms
    as a backfilled one.
    """
    raw = draft.get("parameters")
    if raw in (None, "", validate.NOT_DISCLOSED):
        return validate.NOT_DISCLOSED
    if isinstance(raw, (int, float)):
        return float(raw) if float(raw) > 0 else validate.NOT_DISCLOSED
    m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([BbMmTt])?\s*$", str(raw))
    if not m:
        return validate.NOT_DISCLOSED
    scale = {"b": 1e9, "m": 1e6, "t": 1e12}.get((m.group(2) or "").lower(), 1)
    value = float(m.group(1)) * scale
    return value if value > 0 else validate.NOT_DISCLOSED


def candidate_to_entry(candidate: dict, existing_entries: list) -> dict:
    """Build a schema-valid entry from an approved candidate's draft.

    Raises PromotionError when required facts are missing; the candidate
    then stays pending with the error reported (flag, not guess).
    """
    draft = candidate.get("draft_entry")
    if not draft:
        raise PromotionError("candidate has no extracted draft")
    date = draft.get("date") or candidate.get("date_hint")
    if not date:
        raise PromotionError("no release date in draft or signals")
    availability = draft.get("availability_class")
    if not availability:
        raise PromotionError("draft does not state an availability class")

    org = candidate["org"]
    model_name = draft["model_name"]
    entry_id = validate.make_entry_id(org, model_name)

    benchmarks = []
    for b in draft.get("benchmarks", []):
        benchmarks.append({**b, "value": _numeric(b["value"])})

    # An explicit predecessor in the draft wins over the family heuristic. A
    # revision of a model recorded under a different name (Qwen3.8-Max-0902
    # revising the Qwen3.8-2.4T-A95B entry) has no family match, and the
    # heuristic would leave it unchained.
    predecessor = draft.get("predecessor") or None
    if predecessor and not any(e["id"] == predecessor for e in existing_entries):
        raise PromotionError(f"predecessor {predecessor!r} is not on the record")
    if not predecessor:
        fam = family_key(model_name)
        for e in sorted(existing_entries, key=lambda e: e["date"]):
            if e["org"] == org and family_key(e["model_name"]) == fam \
                    and e["date"] < date:
                predecessor = e["id"]

    retrieval = draft["extraction"]["retrieval_date"]
    sources = [{"kind": "lab_announcement",
                "url": candidate["announcement_url"],
                "retrieval_date": retrieval}]
    # A release shipped as several repositories (Tiny Aya: three) cites each
    # of them, the same way a backfilled entry cites every Epoch link.
    for url in draft.get("extra_sources") or []:
        sources.append({"kind": "lab_link", "url": url,
                        "retrieval_date": retrieval})

    entry = {
        "id": entry_id,
        "entry_type": candidate.get("entry_type", "release"),
        "model_name": model_name,
        "org": org,
        "date": date,
        "availability_class": availability,
        # A lab-stated count is recorded when the draft carries one. Hardcoding
        # NOT_DISCLOSED here asserted that the lab disclosed nothing, which is
        # a claim about the lab, not an absence of data: GLM-5.3-Flash states
        # 320B total on its own model card. Parameter disclosure is one of the
        # two headline findings on the site, so a promoted entry that
        # under-reports it biases the exact number the story rests on.
        "parameters": _parameters(draft),
        "summary": draft["summary"],
        "benchmarks": benchmarks,
        # Extraction reads one announcement page; it can find a link but it
        # cannot establish that a lab published nothing. Anything that is not
        # a URL is recorded as not researched. NOT_DISCLOSED enters only through
        # an APPROVED row in content/disclosure_links/.
        "disclosure_links": {
            a: (v if isinstance(v, str) and v.startswith("http")
                else validate.NOT_RESEARCHED)
            for a, v in draft["disclosure_links"].items()},
        "predecessor": predecessor,
        "license_note": None,
        "sources": sources,
        # Manually drafted candidates (D24 gap entries) carry their honest
        # origin; the validator holds it to ORIGIN_KINDS either way.
        "origin": candidate.get("origin", "nightly-pipeline"),
        "retracted": False,
    }
    if draft.get("unpinned_claims"):
        entry["unpinned_claims"] = draft["unpinned_claims"]
    if draft.get("variants"):
        entry["variants"] = list(draft["variants"])
    return entry


def promote(run_date: str, ids: list = None, root: str = ".",
            archive_urls: bool = False, archiver=None) -> dict:
    """Promote approved candidates. Returns a report dict; raises nothing
    for per-candidate problems (they are reported and stay pending).

    `archive_urls` looks up or saves each new entry's lab URLs on
    archive.org and records them in content/archive_map.json. The CLI
    turns it on; it defaults off so library callers and tests make no
    network calls."""
    pending_dir = os.path.join(root, pending.PENDING_DIR)
    promoted, skipped, problems = [], [], []
    entries = store.read_entries(root=root)
    existing_ids = {e["id"] for e in entries}

    if not os.path.isdir(pending_dir):
        return {"promoted": [], "skipped": [], "problems": []}
    for name in sorted(os.listdir(pending_dir)):
        if not name.endswith(".json") or name == "rejected.json":
            continue
        path = os.path.join(pending_dir, name)
        with open(path, encoding="utf-8") as f:
            candidate = json.load(f)
        cid = candidate["id"]
        if ids is not None and cid not in ids:
            skipped.append(cid)
            continue
        if candidate.get("approved") is not True:
            skipped.append(cid)
            continue
        try:
            entry = candidate_to_entry(candidate, entries)
            if entry["id"] in existing_ids:
                raise PromotionError(f"entry id {entry['id']} already published")
            errors = validate.validate_entry(entry)
            if errors:
                raise PromotionError("; ".join(errors))
        except PromotionError as e:
            problems.append(f"{cid}: {e}")
            continue
        entries.append(entry)
        existing_ids.add(entry["id"])
        promoted.append((cid, path, entry["id"]))

    archive_report = None
    if promoted and archive_urls:
        # Snapshot the new entries' lab URLs (D5). Best-effort: archive.org
        # being slow or down never blocks a promotion; whatever is missing
        # shows up as the CI warning and the next archive run fills it.
        new_ids = {e for _, _, e in promoted}
        new_entries = [e for e in entries if e["id"] in new_ids]
        archive_report = archive.archive_entries(new_entries, root=root,
                                                 archiver=archiver)
        for e in new_entries:
            if validate.validate_entry(e):
                # Never publish an entry the archive pass made invalid.
                for s in e.get("sources", []):
                    s.pop("archived_url", None)
                for b in e.get("benchmarks", []):
                    (b.get("provenance") or {}).pop("archived_url", None)
                e.pop("disclosure_archived", None)

    if promoted:
        store.write_entries(entries, root=root)
        derive.build(root=root, run_date=run_date)
        for _, path, _ in promoted:
            os.remove(path)

    return {
        "promoted": [{"candidate": c, "entry": e} for c, _, e in promoted],
        "skipped": skipped,
        "problems": problems,
        "archive": archive_report,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-date", required=True)
    ap.add_argument("--ids", nargs="*", default=None,
                    help="promote only these candidate ids (default: every "
                         "candidate marked approved)")
    ap.add_argument("--root", default=".")
    ap.add_argument("--no-archive", action="store_true",
                    help="skip the archive.org lookup/save for new entries")
    args = ap.parse_args()
    report = promote(args.run_date, ids=args.ids, root=args.root,
                     archive_urls=not args.no_archive)
    print(json.dumps(report, indent=2))
    return 1 if report["problems"] else 0


if __name__ == "__main__":
    sys.exit(main())
