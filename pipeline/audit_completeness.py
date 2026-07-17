"""D24 completeness audit: is the record as complete as its sources?

Three nets, in order of automation (Walker ruling 2026-07-17, flag 6:
currency is a permanent credibility floor, and manual is the third net,
never the first):

1. Epoch leg: rebuild the expected entry set from an Epoch capture with
   the exact backfill pipeline (same filter, clustering, corrections) and
   diff it against the published record. Missing IDs are gaps; record
   entries beyond the capture are listed by origin so manual and nightly
   additions are visible rather than alarming.
2. AA leg: the D19 coverage audit, run when ARTIFICIALANALYSIS_API_KEY is
   present; a stated no-run note otherwise.
3. The manual sweep is Walker's, at launch-prep; this module only reminds.

Output is a markdown gap report. Nothing here writes entries; gaps are
drafted and approved per invariant 6, never auto-published.
"""
import argparse
import os
import sys

from . import backfill, config, store


def expected_from_capture(csv_path: str, retrieval_date: str) -> list:
    with open(csv_path, encoding="utf-8-sig") as f:
        rows = backfill.load_epoch_rows(f.read())
    entries, _refusals, _problems = backfill.build_entries(
        rows, [], retrieval_date)
    return entries


def diff_record(expected: list, record: list) -> dict:
    record_ids = {e["id"] for e in record}
    expected_ids = {e["id"] for e in expected}
    missing = [{"id": e["id"], "model_name": e["model_name"],
                "org": e["org"], "date": e["date"],
                "entry_type": e["entry_type"]}
               for e in sorted(expected, key=lambda e: e["date"])
               if e["id"] not in record_ids]
    beyond = {}
    for e in record:
        if e["id"] not in expected_ids:
            beyond.setdefault(e["origin"], []).append(e["id"])
    return {"missing": missing,
            "beyond_capture": {k: sorted(v) for k, v in sorted(beyond.items())}}


def staleness(record: list, capture_date: str) -> list:
    """Newest entry per registry org: the at-a-glance freshness table."""
    newest = {org: None for org in config.REGISTRY}
    for e in record:
        if e["org"] in newest:
            if newest[e["org"]] is None or e["date"] > newest[e["org"]]:
                newest[e["org"]] = e["date"]
    return [{"org": org, "newest": date or "no entries",
             "days_before_capture":
                 (backfill._date_ordinal(capture_date)
                  - backfill._date_ordinal(date)) if date else None}
            for org, date in newest.items()]


def report_markdown(diff: dict, stale: list, capture_date: str,
                    aa_section: str) -> str:
    lines = [f"# Completeness audit against the Epoch capture of {capture_date}",
             ""]
    if diff["missing"]:
        n = len(diff["missing"])
        word = "entry" if n == 1 else "entries"
        lines.append(f"## Gaps: {n} expected {word} absent from the record "
                     "(draft and approve per invariant 6; never "
                     "auto-published)")
        for m in diff["missing"]:
            lines.append(f"- {m['date']}  {m['model_name']}  ({m['org']}, "
                         f"{m['entry_type']})  ->  {m['id']}")
    else:
        lines.append("## Gaps: none. Every entry the backfill derives from "
                     "this capture is in the record.")
    lines.append("")
    lines.append("## Record entries beyond this capture, by origin")
    if diff["beyond_capture"]:
        for origin, ids in diff["beyond_capture"].items():
            lines.append(f"- {origin}: {len(ids)}")
            for i in ids:
                lines.append(f"  - {i}")
    else:
        lines.append("- none")
    lines.append("")
    lines.append("## Newest entry per organization (freshness at a glance)")
    for s in stale:
        tail = ("" if s["days_before_capture"] is None
                else f"  ({s['days_before_capture']} days before the capture)")
        lines.append(f"- {s['org']}: {s['newest']}{tail}")
    lines.append("")
    lines.append("## Artificial Analysis leg (D19)")
    lines.append(aa_section)
    lines.append("")
    lines.append("Reminder: the third net is the manual sweep of the window "
                 "between this capture and the flip; it runs at launch-prep "
                 "and is recorded in the cutover runbook.")
    return "\n".join(lines) + "\n"


def run_aa_leg(record: list, run_date: str) -> str:
    key = os.environ.get("ARTIFICIALANALYSIS_API_KEY", "").strip()
    if not key:
        return ("Not run: ARTIFICIALANALYSIS_API_KEY is not set in this "
                "environment. The weekly workflow runs it when the secret "
                "exists; this leg degrades to a stated no-run note, "
                "never a silent skip.")
    from . import aa_audit
    models = aa_audit.fetch_models(key)
    audit = aa_audit.coverage_audit(models, record)
    return aa_audit.report_markdown(audit, run_date)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epoch-csv", required=True)
    ap.add_argument("--capture-date", required=True,
                    help="the capture's retrieval date, YYYY-MM-DD")
    ap.add_argument("--out", default="completeness_audit.md")
    ap.add_argument("--root", default=".")
    args = ap.parse_args()

    record = store.read_entries(root=args.root)
    expected = expected_from_capture(args.epoch_csv, args.capture_date)
    diff = diff_record(expected, record)
    stale = staleness(record, args.capture_date)
    aa_section = run_aa_leg(record, args.capture_date)
    md = report_markdown(diff, stale, args.capture_date, aa_section)
    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        f.write(md)
    print(f"{len(diff['missing'])} gaps; report -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
