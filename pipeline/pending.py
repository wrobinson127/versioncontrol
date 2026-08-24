"""Pending-state writer and morning report (invariant 1).

Candidates are written one file per event under data/pending/ on a branch.
Nothing in this module or anywhere else writes to the live dataset;
publication is Walker merging the branch. The morning report is the
artifact a human reads first: signals, confidence, and what needs eyes.
"""
import json
import os

PENDING_DIR = os.path.join("data", "pending")
REJECTED_PATH = os.path.join("data", "pending", "rejected.json")


def existing_pending_ids(root: str = ".") -> set:
    """Ids that must not be re-created: open candidates plus the durable
    rejection list (detection is stateless, so a deleted candidate file
    alone would resurrect the next night; P3 review R2)."""
    ids = set()
    path = os.path.join(root, PENDING_DIR)
    if os.path.isdir(path):
        ids |= {f[:-5] for f in os.listdir(path)
                if f.endswith(".json") and f != "rejected.json"}
    rejected = os.path.join(root, REJECTED_PATH)
    if os.path.exists(rejected):
        with open(rejected, encoding="utf-8") as f:
            ids |= {r["id"] if isinstance(r, dict) else r
                    for r in json.load(f)}
    return ids


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
                   source_examined: dict = None) -> str:
    """Markdown artifact summarizing the night. Registrar voice."""
    lines = [f"# Morning report, {run_date} (UTC)", ""]
    if not candidates and not detector_errors and not flags:
        lines.append("No new candidate releases detected. All detectors ran clean.")
        if source_counts:
            lines.append("")
            lines.append("Signals by source: " + ", ".join(
                _source_line(k, v, source_examined)
                for k, v in sorted(source_counts.items())))
        return "\n".join(lines) + "\n"

    if candidates:
        lines.append(f"## Candidates awaiting review: {len(candidates)}")
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
                     "branch. To reject one permanently, add its id to "
                     "data/pending/rejected.json; deleting the file alone "
                     "only rejects it until the next detection run.")
    else:
        lines.append("No new candidate releases detected.")

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
