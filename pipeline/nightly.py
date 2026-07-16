"""Nightly orchestrator: detect -> correlate -> extract -> lint -> pending
plus the morning report. Called by .github/workflows/nightly.yml (dormant
behind a workflow variable until Walker flips it at launch).

LLM calls happen only on detection-positive nights, only under the spend cap
(invariant 7). Every unresolved judgment becomes a FLAG in the morning
report, never a guess.
"""
import argparse
import datetime
import json
import os
import sys

from . import config, correlate, extract, pending, store
from .detectors import common, epoch, hf_orgs, html_diff, openrouter, rss


def run_detectors(now_ts: float, now_date: str):
    """All four signal classes. A detector failure is recorded and the rest
    continue; a silent skip never happens. Per-source signal counts go to
    the morning report so a zero-signal source is visible, not silent."""
    signals, errors = [], []
    counts = {}
    lookback = config.DETECTION_LOOKBACK_DAYS

    def _run(label, fn):
        try:
            got = fn()
            counts[label] = len(got)
            signals.extend(got)
        except Exception as e:
            counts[label] = "ERROR"
            errors.append(f"{label}: {e}")

    for org_key, org in config.REGISTRY.items():
        news = org.get("news")
        if news is not None:
            if news["kind"] == "rss":
                _run(f"rss {org_key}",
                     lambda n=news, o=org_key: rss.detect(o, n, lookback, now_ts))
            else:
                _run(f"html_diff {org_key}",
                     lambda n=news, o=org_key: html_diff.detect(o, n))
        _run(f"hf_orgs {org_key}",
             lambda o=org_key, h=org["hf_handles"]:
             hf_orgs.detect(o, h, lookback, now_date))

    _run("openrouter", lambda: openrouter.detect(lookback, now_ts))
    _run("epoch", lambda: epoch.detect(lookback, now_date))
    return signals, errors, counts


def extract_drafts(candidates: list, run_date: str, root: str) -> list:
    """Attach LLM drafts to candidates that have an announcement URL.
    Returns notes for the morning report."""
    notes = []
    if not os.environ.get("ANTHROPIC_API_KEY"):
        if candidates:
            notes.append("ANTHROPIC_API_KEY absent; candidates written "
                         "without drafts.")
        return notes
    for c in candidates:
        if not c["announcement_url"]:
            notes.append(f"{c['id']}: no announcement URL; draft skipped.")
            continue
        try:
            status, content = common.fetch(c["announcement_url"])
            if status != 200:
                notes.append(f"{c['id']}: announcement fetch HTTP {status}; "
                             f"draft skipped.")
                continue
            draft, note = extract.extract_candidate(
                c, content.decode("utf-8", errors="replace"), run_date,
                root=root)
            c["draft_entry"] = draft
            notes.append(f"{c['id']}: {note}")
        except Exception as e:
            notes.append(f"{c['id']}: extraction error, draft skipped: {e}")
    return notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--report-path", default="morning_report.md")
    ap.add_argument("--now", default=None,
                    help="ISO date override for replay; default: today UTC")
    args = ap.parse_args()

    now = datetime.datetime.now(datetime.timezone.utc)
    now_date = args.now or now.strftime("%Y-%m-%d")
    now_ts = now.timestamp()

    signals, errors, counts = run_detectors(now_ts, now_date)
    entries = store.read_entries(root=args.root)
    pending_ids = pending.existing_pending_ids(args.root)
    candidates = correlate.correlate(signals, entries, pending_ids)

    llm_notes = extract_drafts(candidates, now_date, args.root)

    manifest_problems = store.check_manifest(root=args.root)
    flags = [f"manifest drift: {p}" for p in manifest_problems]
    zero_sources = sorted(k for k, v in counts.items() if v == 0)
    if zero_sources:
        flags.append("zero-signal sources tonight (fine on a quiet night, "
                     "a pattern is a broken adapter): " + ", ".join(zero_sources))

    pending.write_candidates(candidates, now_date, root=args.root)
    report = pending.morning_report(candidates, now_date, errors, flags,
                                    llm_note="\n".join(llm_notes),
                                    source_counts=counts)
    with open(os.path.join(args.root, args.report_path), "w",
              encoding="utf-8", newline="\n") as f:
        f.write(report)

    print(report)
    print(json.dumps({"signals": len(signals), "candidates": len(candidates),
                      "detector_errors": len(errors)}))
    # Detector errors surface in the report AND fail the job so the run is
    # visibly unhealthy, never silently degraded.
    return 1 if errors or manifest_problems else 0


if __name__ == "__main__":
    sys.exit(main())
