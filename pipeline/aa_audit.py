"""Artificial Analysis coverage audit (Amendment 2, D19).

Sole role: diff the registry's entries (and the review queue) against
Artificial Analysis's tracked-model list; models they track that the
registry lacks become detection-QA FLAGs. Runs weekly (not nightly),
key-gated, free tier.

Internal coverage audit only. Artificial Analysis data is never displayed,
never published, and never enters the dataset or the site, in any form. Their
Data Platform Terms v1.1 (revised 2026-08-19) allow internal use; s.2.4 bars
making Data available through any customer-facing product or dataset and
s.2.5 bars use in a product whose purpose is benchmarking or comparison
(audit W2, 2026-10-19). An earlier plan to show their GPQA Diamond numbers as
display rows is withdrawn, not deferred. This module writes an audit report
artifact only; it writes nothing under data/.

The key (ARTIFICIALANALYSIS_API_KEY) lives only in GitHub Actions secrets
and this process's environment, never in code, git, or client-side files.
"""
import argparse
import json
import os
import re
import sys

import requests

from . import config, correlate, pending, store

AA_MODELS_URL = "https://artificialanalysis.ai/api/v2/language/models/free"

# AA creator slugs to registry org keys; unmatched creators are listed in
# the report so this map can be extended deliberately. Keys are compared
# after _creator_slug lowercases them; AA's spellings are kept as they arrive
# ("z ai" with a space), which is why both styles appear.
AA_CREATOR_TO_ORG = {
    # Added 2026-10-19 from the weekly-audit run of that day, which listed
    # them as unmapped: xAI's current AA name (9 models), Z.ai (9), Moonshot's
    # Kimi brand (2). Until then three registry orgs were never audited.
    "spacexai": "xai",
    "z ai": "zai",
    "kimi": "moonshot",
    "openai": "openai",
    "anthropic": "anthropic",
    "google": "google-deepmind",
    "google-deepmind": "google-deepmind",
    "meta": "meta",
    "meta-ai": "meta",
    "xai": "xai",
    "x-ai": "xai",
    "mistral": "mistral",
    "mistralai": "mistral",
    "deepseek": "deepseek",
    "alibaba": "alibaba-qwen",
    "qwen": "alibaba-qwen",
    "moonshot": "moonshot",
    "moonshotai": "moonshot",
    "zhipu": "zai",
    "z-ai": "zai",
    "zai": "zai",
    "cohere": "cohere",
    "amazon": "amazon",
}


def fetch_models(api_key: str) -> list:
    r = requests.get(AA_MODELS_URL,
                     headers={"x-api-key": api_key,
                              "User-Agent": config.USER_AGENT},
                     timeout=config.FETCH_TIMEOUT_SECONDS)
    if r.status_code != 200:
        raise RuntimeError(f"artificialanalysis: HTTP {r.status_code}")
    payload = r.json()
    return payload.get("data", payload if isinstance(payload, list) else [])


def _creator_slug(model: dict) -> str:
    creator = model.get("model_creator") or model.get("creator") or {}
    if isinstance(creator, dict):
        return (creator.get("slug") or creator.get("name") or "").lower()
    return str(creator).lower()


# AA lists one model per reasoning-effort setting: "GPT-5.6 Luna (Low)",
# "Muse Spark 1.2 (Xhigh)". The effort is a serving setting, not a release, and
# left on the name it slugs to "gpt-5.6-luna-low", which matches nothing: 99
# rows of the 2026-10-19 audit were "missing" that way (audit F4).
_EFFORT_SUFFIX_RE = re.compile(r"\s*\([^()]*\)\s*$")


def strip_effort_suffix(name: str) -> str:
    stripped = _EFFORT_SUFFIX_RE.sub("", name)
    return stripped or name


def coverage_audit(aa_models: list, entries: list,
                   pending_ids: set = None) -> dict:
    """Which AA-tracked models have no matching registry entry.

    pending_ids (pending.existing_pending_ids: queued candidates, rejections
    and scope exclusions) count as known: a model already awaiting review or
    already ruled on is not a detection gap.
    """
    known = correlate.known_slugs(entries)
    for pid in pending_ids or ():
        org, sep, slug = pid.partition("--")
        if sep and slug:
            known.setdefault(org, set()).add(slug)
    missing, covered, unmatched_creators = [], 0, {}
    for m in aa_models:
        creator = _creator_slug(m)
        org = AA_CREATOR_TO_ORG.get(creator)
        if org is None:
            unmatched_creators[creator] = unmatched_creators.get(creator, 0) + 1
            continue
        name = m.get("name") or m.get("slug") or m.get("id") or ""
        slug = correlate.base_slug(strip_effort_suffix(str(name)))
        if slug and correlate.is_known(org, slug, known):
            covered += 1
        else:
            missing.append({
                "aa_id": m.get("id") or m.get("slug"),
                "name": name,
                "org": org,
            })
    return {"covered": covered, "missing": missing,
            "unmatched_creators": unmatched_creators}


def report_markdown(audit: dict, run_date: str) -> str:
    lines = [f"# Artificial Analysis coverage audit, {run_date} (UTC)", ""]
    lines.append(f"Registry coverage of AA-tracked registry-org models: "
                 f"{audit['covered']} matched, {len(audit['missing'])} "
                 f"missing from the registry.")
    lines.append("")
    lines.append("Data cross-checked against Artificial Analysis "
                 "(artificialanalysis.ai) for internal coverage QA only; "
                 "their data is never displayed or published and never "
                 "enters the dataset (D19; Data Platform Terms v1.1).")
    if audit["missing"]:
        lines.append("")
        lines.append("## Detection-QA FLAGs: tracked there, absent here")
        lines.append("")
        lines.append("| AA model | Registry org | AA id |")
        lines.append("|---|---|---|")
        for m in sorted(audit["missing"], key=lambda m: (m["org"], str(m["name"]))):
            lines.append(f"| {m['name']} | {m['org']} | {m['aa_id']} |")
        lines.append("")
        lines.append("Each row is a candidate the detectors should have "
                     "caught or a deliberate scope exclusion; disposition "
                     "goes through the normal review flow.")
    if audit["unmatched_creators"]:
        lines.append("")
        lines.append("## Creators with no registry mapping (extend the map "
                     "deliberately or ignore)")
        for c, n in sorted(audit["unmatched_creators"].items()):
            lines.append(f"- {c or '(blank)'}: {n} models")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-date", required=True)
    ap.add_argument("--out", default="aa_audit.md")
    ap.add_argument("--root", default=".")
    args = ap.parse_args()

    api_key = os.environ.get("ARTIFICIALANALYSIS_API_KEY")
    if not api_key:
        text = (f"# Artificial Analysis coverage audit, {args.run_date}\n\n"
                "ARTIFICIALANALYSIS_API_KEY is not set; the audit did not "
                "run (D19 key exception awaits the key or was vetoed).\n")
        with open(args.out, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        print(text)
        return 0

    aa_models = fetch_models(api_key)
    entries = store.read_entries(root=args.root)
    audit = coverage_audit(aa_models, entries,
                           pending_ids=pending.existing_pending_ids(args.root))
    text = report_markdown(audit, args.run_date)
    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
