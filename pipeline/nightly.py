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
    examined = {}
    lookback = config.DETECTION_LOOKBACK_DAYS

    def _run(label, fn):
        try:
            got = fn()
            counts[label] = len(got)
            # None means the detector errored or does not report a count;
            # it is never conflated with a genuine zero.
            examined[label] = getattr(got, "examined", None)
            signals.extend(got)
        except Exception as e:
            counts[label] = "ERROR"
            examined[label] = None
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
    return signals, errors, counts, examined


def adapter_flags(counts: dict, examined: dict) -> list:
    """Flags for detector classes that look broken rather than quiet.

    A single source examining records and finding nothing recent is a quiet
    night and gets no flag; flagging those trained the reader to ignore the
    section. A whole detector CLASS examining zero records everywhere is the
    shape of a broken adapter, because a real quiet night still returns a
    catalog to filter. Sources that errored are excluded: they already have
    a louder home in the detector-problems section.
    """
    by_class = {}
    for label, n in examined.items():
        if counts.get(label) == "ERROR" or n is None:
            continue
        by_class.setdefault(label.split(" ")[0], []).append(n)
    flags = []
    for cls, seen in sorted(by_class.items()):
        if seen and all(n == 0 for n in seen):
            flags.append(
                f"{cls}: every source returned zero records to examine. A "
                f"quiet night still returns a catalog with nothing recent in "
                f"it, so a whole class examining nothing is the shape of a "
                f"broken adapter. Check it before trusting tonight's absence.")
    return flags


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


def reap_published_candidates(entries: list, root: str) -> list:
    """Delete queued candidates whose model is now on the record.

    correlate stops a published model becoming a NEW candidate, but nothing
    removed one that was already queued when it got published. A candidate can
    reach the record by a route other than its own approval: the 2026-08-24
    Epoch refresh backfilled 26 of the 64 queued candidates in one go, and
    every one of them stayed in the queue afterwards, where a reviewer could
    approve a model the record already held.

    Returns the ids reaped, for the morning report.
    """
    published = {e["id"] for e in entries}
    directory = os.path.join(root, pending.PENDING_DIR)
    if not os.path.isdir(directory):
        return []
    reaped = []
    for name in sorted(os.listdir(directory)):
        if not name.endswith(".json") or name == "rejected.json":
            continue
        candidate_id = name[:-5]
        if candidate_id in published:
            os.remove(os.path.join(directory, name))
            reaped.append(candidate_id)
    return reaped


def redraft_pending(run_date: str, root: str) -> list:
    """Retry drafting for pending candidates that still have none.

    extract_drafts only ever sees candidates correlated fresh that night, so a
    draft lost to a truncated response, a voice-lint refusal or a 403 was never
    retried: the candidate sat in the queue draft-less until someone wrote it
    by hand. The 2026-08-24 run left thirteen in exactly that state. This is
    the deliberate second pass, run once the cause is fixed. Attempt counts are
    recorded so a candidate that fails every time is visible rather than
    quietly re-billed each time it is tried.
    """
    notes = []
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return ["ANTHROPIC_API_KEY absent; no redraft attempted."]
    directory = os.path.join(root, pending.PENDING_DIR)
    if not os.path.isdir(directory):
        return notes
    for name in sorted(os.listdir(directory)):
        if not name.endswith(".json") or name == "rejected.json":
            continue
        path = os.path.join(directory, name)
        with open(path, encoding="utf-8") as f:
            payload = json.load(f)
        if payload.get("draft_entry") or not payload.get("announcement_url"):
            continue
        payload["draft_attempts"] = payload.get("draft_attempts", 0) + 1
        try:
            status, content = common.fetch(payload["announcement_url"])
            if status != 200:
                notes.append(f"{payload['id']}: announcement fetch HTTP "
                             f"{status}; still no draft.")
            else:
                draft, note = extract.extract_candidate(
                    payload, content.decode("utf-8", errors="replace"),
                    run_date, root=root)
                payload["draft_entry"] = draft
                notes.append(f"{payload['id']}: {note}")
        except Exception as e:
            notes.append(f"{payload['id']}: redraft error: {e}")
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False, sort_keys=True)
            f.write("\n")
    return notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--redraft-pending", action="store_true",
                    help="also retry drafting for queued candidates that "
                         "have no draft yet (spend-capped like any other "
                         "call); use after fixing a cause of draft failure")
    ap.add_argument("--report-path", default="morning_report.md")
    ap.add_argument("--now", default=None,
                    help="ISO date override for replay; default: today UTC")
    args = ap.parse_args()

    now = datetime.datetime.now(datetime.timezone.utc)
    now_date = args.now or now.strftime("%Y-%m-%d")
    now_ts = now.timestamp()

    signals, errors, counts, examined = run_detectors(now_ts, now_date)
    entries = store.read_entries(root=args.root)
    # Before correlating, so a candidate that reached the record by another
    # route stops occupying the queue and suppressing its own re-detection.
    reaped = reap_published_candidates(entries, args.root)
    pending_ids = pending.existing_pending_ids(args.root)
    candidates = correlate.correlate(signals, entries, pending_ids)

    llm_notes = extract_drafts(candidates, now_date, args.root)

    manifest_problems = store.check_manifest(root=args.root)
    flags = [f"manifest drift: {p}" for p in manifest_problems]
    flags.extend(adapter_flags(counts, examined))
    if reaped:
        flags.append(
            f"reaped {len(reaped)} queued candidate(s) already on the record: "
            + ", ".join(reaped))

    pending.write_candidates(candidates, now_date, root=args.root)

    if args.redraft_pending:
        # Strictly after write_candidates: redraft edits the files on disk, so
        # running it first would have its work overwritten by the fresh write.
        # Placed here it also picks up a candidate detected tonight whose first
        # draft attempt failed.
        redraft_notes = redraft_pending(now_date, args.root)
        if redraft_notes:
            llm_notes.append("Redraft of queued candidates:")
            llm_notes.extend(redraft_notes)

    report = pending.morning_report(candidates, now_date, errors, flags,
                                    llm_note="\n".join(llm_notes),
                                    source_counts=counts,
                                    source_examined=examined)
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
