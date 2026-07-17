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

from . import derive, pending, store, validate
from .backfill import family_key


class PromotionError(ValueError):
    pass


def _numeric(value: str) -> float:
    m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*%?\s*$", str(value))
    if not m:
        raise PromotionError(f"benchmark value {value!r} is not numeric")
    return float(m.group(1))


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

    predecessor = None
    fam = family_key(model_name)
    for e in sorted(existing_entries, key=lambda e: e["date"]):
        if e["org"] == org and family_key(e["model_name"]) == fam \
                and e["date"] < date:
            predecessor = e["id"]

    sources = [{"kind": "lab_announcement",
                "url": candidate["announcement_url"],
                "retrieval_date": draft["extraction"]["retrieval_date"]}]

    entry = {
        "id": entry_id,
        "entry_type": candidate.get("entry_type", "release"),
        "model_name": model_name,
        "org": org,
        "date": date,
        "availability_class": availability,
        "parameters": validate.NOT_DISCLOSED,
        "summary": draft["summary"],
        "benchmarks": benchmarks,
        "disclosure_links": draft["disclosure_links"],
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
    return entry


def promote(run_date: str, ids: list = None, root: str = ".") -> dict:
    """Promote approved candidates. Returns a report dict; raises nothing
    for per-candidate problems (they are reported and stay pending)."""
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

    if promoted:
        store.write_entries(entries, root=root)
        derive.build(root=root, run_date=run_date)
        for _, path, _ in promoted:
            os.remove(path)

    return {
        "promoted": [{"candidate": c, "entry": e} for c, _, e in promoted],
        "skipped": skipped,
        "problems": problems,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-date", required=True)
    ap.add_argument("--ids", nargs="*", default=None,
                    help="promote only these candidate ids (default: every "
                         "candidate marked approved)")
    ap.add_argument("--root", default=".")
    args = ap.parse_args()
    report = promote(args.run_date, ids=args.ids, root=args.root)
    print(json.dumps(report, indent=2))
    return 1 if report["problems"] else 0


if __name__ == "__main__":
    sys.exit(main())
