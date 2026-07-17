"""Derived views for the site: precomputed delta chips and site metadata.

The site renders these verbatim. Delta semantics live in deltas.py and
nowhere else (invariant 3); precomputing at build time means no second
implementation exists in JavaScript.
"""
import argparse
import json
import os

from . import deltas, store

DELTAS_PATH = os.path.join("data", "derived", "deltas.json.gz")
META_PATH = os.path.join("data", "derived", "site_meta.json")


def build(root: str = ".", run_date: str = None) -> dict:
    entries = store.read_entries(root=root)
    by_id = {e["id"]: e for e in entries}

    delta_map = {}
    refused = 0
    chips = 0
    for e in entries:
        pred = by_id.get(e["predecessor"]) if e["predecessor"] else None
        if not pred or not e["benchmarks"]:
            continue
        result = deltas.entry_deltas(e, pred)
        if result:
            delta_map[e["id"]] = result
            chips += sum(1 for d in result if d["kind"] == "delta")
            refused += sum(1 for d in result
                           if d["kind"] == deltas.REFUSED_COMPARISON)

    store.write_derived_json(delta_map, "deltas.json.gz", root=root)

    meta = {
        "entry_count": len(entries),
        "releases": sum(1 for e in entries if e["entry_type"] == "release"),
        "revisions": sum(1 for e in entries if e["entry_type"] == "revision"),
        "entries_with_numbers": sum(1 for e in entries if e["benchmarks"]),
        "delta_chips": chips,
        "refused_comparisons": refused,
        "last_successful_update": run_date,
        "first_date": min(e["date"] for e in entries),
        "last_date": max(e["date"] for e in entries),
    }
    store.write_derived_json(meta, "site_meta.json", root=root)

    # The narrative/explorer datasets rebuild with every derive pass so no
    # flow can update entries without refreshing them (Amendment 1, P4.5).
    from . import derive_views
    derive_views.build_views(root=root, run_date=run_date)
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--run-date", required=True)
    args = ap.parse_args()
    print(json.dumps(build(args.root, args.run_date), indent=2))


if __name__ == "__main__":
    main()
