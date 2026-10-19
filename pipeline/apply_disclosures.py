"""Apply APPROVED disclosure-table rows into the published entries.

The tables in content/disclosure_links/ are the working surface of the
content pass. Walker approves a row by setting its "status" to "APPROVED"
(everything starts DRAFT_FLAGGED). This module applies approved rows to
their entries: a URL cell becomes the entry's disclosure link, an explicit
NOT_DISCLOSED cell stays the enum, and a blank cell leaves the entry's
current value untouched. Rows that are not APPROVED change nothing.

Runs at build time, before derive; publication still requires the merge.

    python -m pipeline.apply_disclosures --run-date <date> [--root .]
"""
import argparse
import glob
import json
import os
import sys

from . import archive, store, validate

TABLES_DIR = os.path.join("content", "disclosure_links")


def load_approved(root: str = ".") -> dict:
    """entry_id -> {artifact: value} for APPROVED rows; blanks dropped."""
    approved = {}
    for path in sorted(glob.glob(os.path.join(root, TABLES_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            table = json.load(f)
        for row in table.get("rows", []):
            if row.get("status") != "APPROVED":
                continue
            cells = {}
            for artifact in validate.DISCLOSURE_ARTIFACTS:
                v = (row.get(artifact) or "").strip()
                if v:
                    cells[artifact] = v
            if cells:
                approved[row["entry_id"]] = cells
    return approved


def apply(root: str = ".", run_date: str = None) -> dict:
    approved = load_approved(root)
    entries = store.read_entries(root=root)
    amap = archive.load_map(root)
    by_id = {e["id"]: e for e in entries}

    applied, missing, problems = [], [], []
    for entry_id, cells in sorted(approved.items()):
        entry = by_id.get(entry_id)
        if entry is None:
            missing.append(entry_id)
            continue
        before = dict(entry["disclosure_links"])
        entry["disclosure_links"].update(cells)
        # A changed link takes its own archive snapshot (or none), never
        # the old link's.
        before_archived = entry.get("disclosure_archived")
        archive.apply_to_entry(entry, amap)
        errors = validate.validate_entry(entry)
        if errors:
            entry["disclosure_links"] = before
            if before_archived is None:
                entry.pop("disclosure_archived", None)
            else:
                entry["disclosure_archived"] = before_archived
            problems.append(f"{entry_id}: {'; '.join(errors)}")
            continue
        if entry["disclosure_links"] != before:
            applied.append(entry_id)

    if applied:
        store.write_entries(entries, root=root)
        from . import derive
        derive.build(root=root, run_date=run_date)

    return {"applied": applied, "unknown_entry_ids": missing,
            "problems": problems,
            "approved_rows": len(approved)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-date", required=True)
    ap.add_argument("--root", default=".")
    args = ap.parse_args()
    report = apply(root=args.root, run_date=args.run_date)
    print(json.dumps(report, indent=2))
    return 1 if report["problems"] or report["unknown_entry_ids"] else 0


if __name__ == "__main__":
    sys.exit(main())
