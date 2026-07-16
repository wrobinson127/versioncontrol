"""Pending-state writer and morning report (invariant 1).

Candidates are written one file per event under data/pending/ on a branch.
Nothing in this module or anywhere else writes to the live dataset;
publication is Walker merging the branch. The morning report is the
artifact a human reads first: signals, confidence, and what needs eyes.
"""
import json
import os

PENDING_DIR = os.path.join("data", "pending")


def existing_pending_ids(root: str = ".") -> set:
    path = os.path.join(root, PENDING_DIR)
    if not os.path.isdir(path):
        return set()
    return {f[:-5] for f in os.listdir(path) if f.endswith(".json")}


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


def morning_report(candidates: list, run_date: str, detector_errors: list,
                   flags: list, llm_note: str = "") -> str:
    """Markdown artifact summarizing the night. Registrar voice."""
    lines = [f"# Morning report, {run_date} (UTC)", ""]
    if not candidates and not detector_errors and not flags:
        lines.append("No new candidate releases detected. All detectors ran clean.")
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
        lines.append("Each candidate has a file under data/pending/. "
                     "Approval is merging this branch; deleting a candidate "
                     "file rejects it.")
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

    return "\n".join(lines) + "\n"
