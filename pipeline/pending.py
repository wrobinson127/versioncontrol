"""Pending-state writer and morning report (invariant 1).

Candidates are written one file per event under data/pending/ on a branch.
Nothing in this module or anywhere else writes to the live dataset;
publication is Walker merging the branch. The morning report is the
artifact a human reads first: signals, confidence, and what needs eyes.
"""
import argparse
import json
import os
import sys
from urllib.parse import urlsplit

PENDING_DIR = os.path.join("data", "pending")
REJECTED_PATH = os.path.join("data", "pending", "rejected.json")


def normalize_url(url: str) -> str:
    """Comparable form of a signal URL: scheme, www., fragment, query and a
    trailing slash do not make a different page."""
    parts = urlsplit((url or "").strip())
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return f"{host}{parts.path.rstrip('/')}"


def _load_rejected(root: str) -> list:
    path = os.path.join(root, REJECTED_PATH)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def rejected_urls(root: str = ".") -> dict:
    """Normalized URL -> rejected candidate id, from rejections that recorded
    their URLs. Rejections written before 2026-10-19 carry ids only; their
    URLs were lost with the deleted candidate files and cannot be recovered
    here, so they still match by id alone."""
    urls = {}
    for r in _load_rejected(root):
        if not isinstance(r, dict):
            continue
        for u in r.get("urls") or []:
            if u:
                urls[normalize_url(u)] = r["id"]
    return urls


def candidate_urls(candidate: dict) -> list:
    """Every URL a candidate was detected or anchored on."""
    urls = {candidate.get("announcement_url")}
    urls |= {s.get("url") for s in candidate.get("signals") or []}
    return sorted(u for u in urls if u)


def reject(candidate_id: str, reason: str, run_date: str,
           root: str = ".") -> dict:
    """Move a pending candidate onto the durable rejection list.

    Records the candidate's URLs alongside its id so a later post retitled
    under a new slug is still recognised (audit W4). Deletes the candidate
    file only after the rejection is written.
    """
    path = os.path.join(root, PENDING_DIR, f"{candidate_id}.json")
    with open(path, encoding="utf-8") as f:
        candidate = json.load(f)
    rejected = _load_rejected(root)
    record = {"id": candidate_id, "reason": reason, "rejected_on": run_date,
              "urls": candidate_urls(candidate)}
    rejected.append(record)
    with open(os.path.join(root, REJECTED_PATH), "w", encoding="utf-8",
              newline="\n") as f:
        json.dump(rejected, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.remove(path)
    return record


def existing_pending_ids(root: str = ".") -> set:
    """Ids that must not be re-created: open candidates plus the durable
    rejection list (detection is stateless, so a deleted candidate file
    alone would resurrect the next night; P3 review R2)."""
    ids = set()
    path = os.path.join(root, PENDING_DIR)
    if os.path.isdir(path):
        ids |= {f[:-5] for f in os.listdir(path)
                if f.endswith(".json") and f != "rejected.json"}
    ids |= {r["id"] if isinstance(r, dict) else r
            for r in _load_rejected(root)}
    # A model ruled out of scope for the record is also not a candidate. The
    # ruling lives in one place and must bind both paths: without this,
    # amazon--nova-2.0-pro-preview is excluded from the record by backfill and
    # then re-proposed by detection every single night, forever.
    from .backfill import load_scope_exclusions  # local: backfill is heavy
    ids |= set(load_scope_exclusions(root))
    return ids


def held_candidates(new_ids: set, root: str = ".") -> list:
    """Candidates sitting in the queue from an earlier run.

    correlate() suppresses ids that are already pending, so a candidate only
    ever appears in the run that first detected it. Without this, one held
    overnight is in no report ever again: it stays on disk, unreviewed and
    unmentioned, and the only trace is a file nobody is looking at.
    deepseek--deepseek-v4-flash-vision-exp sat that way for ten days.
    """
    path = os.path.join(root, PENDING_DIR)
    if not os.path.isdir(path):
        return []
    held = []
    for name in sorted(os.listdir(path)):
        if not name.endswith(".json") or name == "rejected.json":
            continue
        if name[:-5] in new_ids:
            continue
        with open(os.path.join(path, name), encoding="utf-8") as f:
            c = json.load(f)
        held.append(c)
    return held


def write_candidates(candidates: list, run_date: str, root: str = ".") -> list:
    """One JSON file per candidate event. Returns the paths written."""
    os.makedirs(os.path.join(root, PENDING_DIR), exist_ok=True)
    paths = []
    for c in candidates:
        payload = {
            "id": c["id"],
            "org": c["org"],
            "model_hints": c["model_hints"],
            "announcement_url": c["announcement_url"],
            "date_hint": c["date_hint"],
            "confidence": c["confidence"],
            "detectors": c["detectors"],
            "detected_on": run_date,
            "signals": c["signals"],
            "draft_entry": c.get("draft_entry"),
            "status": "pending-review",
        }
        path = os.path.join(root, PENDING_DIR, f"{c['id']}.json")
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False, sort_keys=True)
            f.write("\n")
        paths.append(path)
    return paths


def _source_line(label, count, examined: dict) -> str:
    """One source's tally. A zero always says what it is made of: nothing
    examined reads as a dead source, plenty examined reads as a quiet night.
    """
    n = (examined or {}).get(label)
    if n is None:
        return f"{label}: {count}"
    noun = "record" if n == 1 else "records"
    return f"{label}: {count} of {n} {noun} examined"


def morning_report(candidates: list, run_date: str, detector_errors: list,
                   flags: list, llm_note: str = "",
                   source_counts: dict = None,
                   source_examined: dict = None,
                   held: list = None) -> str:
    """Markdown artifact summarizing the night. Registrar voice."""
    held = held or []
    lines = [f"# Morning report, {run_date} (UTC)", ""]
    if not candidates and not held and not detector_errors and not flags:
        lines.append("No new candidate releases detected. All detectors ran clean.")
        if source_counts:
            lines.append("")
            lines.append("Signals by source: " + ", ".join(
                _source_line(k, v, source_examined)
                for k, v in sorted(source_counts.items())))
        return "\n".join(lines) + "\n"

    if candidates:
        lines.append(f"## Detected tonight: {len(candidates)}")
        lines.append("")
        lines.append("| Candidate | Org | Signals | Confidence | Date hint | Anchor |")
        lines.append("|---|---|---|---|---|---|")
        for c in candidates:
            anchor = c["announcement_url"] or "none found"
            lines.append(
                f"| {c['id']} | {c['org']} | {', '.join(c['detectors'])} "
                f"| {c['confidence']}/5 | {c['date_hint'] or 'unknown'} "
                f"| {anchor} |")
        lines.append("")
        lines.append("Each candidate has a file under data/pending/. To "
                     "publish one: set \"approved\": true in its file, run "
                     "the promote workflow, review the diff, and merge this "
                     "branch. To reject one permanently, run `python -m "
                     "pipeline.pending reject <id> --reason \"...\"`, which "
                     "records its id and URLs in data/pending/rejected.json; "
                     "deleting the file alone only rejects it until the next "
                     "detection run.")
    else:
        lines.append("No new candidate releases detected.")

    if held:
        lines.append("")
        lines.append(f"## Held from earlier runs: {len(held)}")
        lines.append("")
        lines.append("Queued on a previous night and still unreviewed. These "
                     "are not re-detected, so this is the only place they "
                     "appear.")
        lines.append("")
        lines.append("| Candidate | Org | Detected | Date hint | Draft |")
        lines.append("|---|---|---|---|---|")
        for c in held:
            lines.append(
                f"| {c.get('id', 'unknown')} | {c.get('org', 'unknown')} "
                f"| {c.get('detected_on', 'unknown')} "
                f"| {c.get('date_hint') or 'unknown'} "
                f"| {'yes' if c.get('draft_entry') else 'none'} |")

    total = len(candidates) + len(held)
    lines.append("")
    lines.append(f"**Awaiting review in total: {total}.**")

    if detector_errors:
        lines.append("")
        lines.append("## Detector problems (needs eyes)")
        for err in detector_errors:
            lines.append(f"- {err}")

    if llm_note:
        lines.append("")
        lines.append("## Extraction")
        lines.append(llm_note)

    if flags:
        lines.append("")
        lines.append("## FLAGS")
        for f in flags:
            lines.append(f"- {f}")

    if source_counts:
        lines.append("")
        lines.append("## Signals by source")
        for k, v in sorted(source_counts.items()):
            lines.append(f"- {_source_line(k, v, source_examined)}")

    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    rj = sub.add_parser("reject", help="move a pending candidate onto the "
                                       "durable rejection list, with its URLs")
    rj.add_argument("candidate_id")
    rj.add_argument("--reason", required=True)
    rj.add_argument("--date", default=None,
                    help="rejection date, ISO; default today UTC")
    rj.add_argument("--root", default=".")
    args = ap.parse_args()
    import datetime
    date = args.date or datetime.datetime.now(
        datetime.timezone.utc).strftime("%Y-%m-%d")
    record = reject(args.candidate_id, args.reason, date, root=args.root)
    print(json.dumps(record, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
