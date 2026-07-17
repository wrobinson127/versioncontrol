"""Artificial Analysis coverage audit (Amendment 2, D19).

Primary role: diff the registry's entries against Artificial Analysis's
tracked-model list; models they track that the registry lacks become
detection-QA FLAGs. Runs weekly (not nightly), key-gated, free tier,
100 requests per day, attribution required.

Posture mirrors D4: display and cross-check freely with "per Artificial
Analysis" attribution; their data NEVER enters the downloadable dataset.
This module writes an audit report artifact only; it writes nothing under
data/. The second approved use (their GPQA Diamond numbers as additional
INDEPENDENT display rows) is deliberately not built until Walker confirms
the key ruling; see the module TODO note in the report it emits.

The key (ARTIFICIALANALYSIS_API_KEY) lives only in GitHub Actions secrets
and this process's environment, never in code, git, or client-side files.
"""
import argparse
import json
import os
import sys

import requests

from . import config, correlate, store

AA_MODELS_URL = "https://artificialanalysis.ai/api/v2/language/models/free"

# AA creator slugs to registry org keys; unmatched creators are listed in
# the report so this map can be extended deliberately.
AA_CREATOR_TO_ORG = {
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


def coverage_audit(aa_models: list, entries: list) -> dict:
    """Which AA-tracked models have no matching registry entry."""
    known = correlate.known_slugs(entries)
    missing, covered, unmatched_creators = [], 0, {}
    for m in aa_models:
        creator = _creator_slug(m)
        org = AA_CREATOR_TO_ORG.get(creator)
        if org is None:
            unmatched_creators[creator] = unmatched_creators.get(creator, 0) + 1
            continue
        name = m.get("name") or m.get("slug") or m.get("id") or ""
        slug = correlate.base_slug(str(name))
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
                 "(artificialanalysis.ai); attribution required by their "
                 "terms; their data never enters the downloadable dataset "
                 "(D19).")
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
    audit = coverage_audit(aa_models, entries)
    text = report_markdown(audit, args.run_date)
    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
