"""Apply APPROVED lab-number rows into the published entries.

The tables in content/lab_numbers/ are the D22-stretch working surface:
LAB_REPORTED benchmark numbers researched from the labs' own materials,
collected newest-and-most-notable-first (Walker ruling 2026-07-17,
flag 5). Every row starts DRAFT_FLAGGED; Walker approves by setting
"status" to "APPROVED". An approved row becomes a provenance-complete
LAB_REPORTED benchmark number on its entry; the P1 validator holds it to
the pinned benchmark name and version, so an unpinned claim can never
enter as a number (those stay in the table's unpinned_claims list, which
this module never applies).

Rows that are not APPROVED change nothing. An entry that already carries
a LAB_REPORTED number for the same benchmark is skipped with a note, so
the pass is idempotent and re-runnable.

    python -m pipeline.apply_lab_numbers --run-date <date> [--root .]
"""
import argparse
import glob
import json
import os
import sys

from . import archive, config, store, validate

TABLES_DIR = os.path.join("content", "lab_numbers")


def row_to_number(row: dict) -> dict:
    bench = row["benchmark"]
    pin = config.BENCHMARKS[bench]
    number = {
        "benchmark": bench,
        "value": float(row["value"]),
        "provenance": {
            "source_class": "LAB_REPORTED",
            "source_url": row["source_url"],
            "benchmark_name": pin["name"],
            "benchmark_version": pin["version"],
            "retrieval_date": row["retrieval_date"],
        },
    }
    if row.get("configuration"):
        number["configuration"] = row["configuration"]
    return number


def load_approved(root: str = ".") -> list:
    rows = []
    for path in sorted(glob.glob(os.path.join(root, TABLES_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            table = json.load(f)
        for row in table.get("rows", []):
            if row.get("status") == "APPROVED":
                rows.append(row)
    return rows


def apply(root: str = ".", run_date: str = None) -> dict:
    approved = load_approved(root)
    entries = store.read_entries(root=root)
    amap = archive.load_map(root)
    by_id = {e["id"]: e for e in entries}

    applied, missing, skipped, problems = [], [], [], []
    for row in approved:
        entry_id = row["entry_id"]
        entry = by_id.get(entry_id)
        if entry is None:
            missing.append(entry_id)
            continue
        if row["benchmark"] not in config.BENCHMARKS:
            problems.append(f"{entry_id}: benchmark {row['benchmark']!r} "
                            "is not a pinned benchmark")
            continue
        already = any(
            n["benchmark"] == row["benchmark"]
            and n["provenance"]["source_class"] == "LAB_REPORTED"
            for n in entry.get("benchmarks", []))
        if already:
            skipped.append(f"{entry_id}: {row['benchmark']} LAB_REPORTED "
                           "already on the entry")
            continue
        number = row_to_number(row)
        archived = archive.lookup(amap, number["provenance"]["source_url"])
        if archived:
            number["provenance"]["archived_url"] = archived
        before = list(entry.get("benchmarks", []))
        entry.setdefault("benchmarks", []).append(number)
        errors = validate.validate_entry(entry)
        if errors:
            entry["benchmarks"] = before
            problems.append(f"{entry_id}: {'; '.join(errors)}")
            continue
        applied.append(f"{entry_id}: {row['benchmark']}")

    if applied:
        store.write_entries(entries, root=root)
        from . import derive
        derive.build(root=root, run_date=run_date)

    return {"applied": applied, "unknown_entry_ids": missing,
            "skipped": skipped, "problems": problems,
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
