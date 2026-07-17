"""Correlate detector signals into candidate release events.

Signals cluster by (org, base model slug) with the same sibling-suffix
stripping the backfill validated against real HF release history. A cluster
that matches an already-published entry or an existing pending candidate is
dropped; the dataset is the detector state.
"""
import re

from . import config
from .backfill import slugify

_SIBLING_RE = re.compile(config.SIBLING_SUFFIX_RE)
# HF repos and API slugs decorate with sizes and formats that the base name
# strips for clustering: "Kimi-K2.5-FP8" and "Kimi-K2.5" are one event.
_SIZE_RE = re.compile(r"-(\d+(?:\.\d+)?[bm])(?=$|-)", re.IGNORECASE)


def base_slug(model_hint: str) -> str:
    s = slugify(model_hint)
    prev = None
    while prev != s:
        prev = s
        s = _SIBLING_RE.sub("", s)
        s = _SIZE_RE.sub("", s)
        s = s.rstrip("-")
    return s or slugify(model_hint)


def known_slugs(entries: list) -> dict:
    """Per-org set of known base slugs (flagship names, Epoch row names,
    variants)."""
    known = {}
    for e in entries:
        org = known.setdefault(e["org"], set())
        for name in {e["model_name"], e.get("epoch_row_name", e["model_name"])}:
            org.add(base_slug(name))
        for v in e.get("variants", []):
            org.add(base_slug(v))
    return known


def is_known(org: str, slug: str, known: dict) -> bool:
    """Fragment-aware suppression (P3 review R2). Detector hints are often
    name fragments ("Sonnet 5" for "Claude Sonnet 5", "K2.5" for
    "Kimi K2.5"); a candidate is known when its slug equals a known slug or
    aligns with one at a hyphen boundary in either direction."""
    org_known = known.get(org, set())
    if slug in org_known:
        return True
    for k in org_known:
        if k.endswith("-" + slug) or slug.endswith("-" + k):
            return True
        # A candidate that a longer known name extends at a hyphen boundary
        # is a fragment of that release ("mistral-3" of "mistral-3-large").
        # The reverse (candidate extends known: "mistral-ocr-3" over known
        # "mistral-ocr") is a NEW version and stays a candidate.
        if k.startswith(slug + "-"):
            return True
    # Deep-suffix check: a hint like "Redeploying Fable 5" slugs to
    # "redeploying-fable-5"; its digit-bearing multi-segment suffix
    # "fable-5" aligns with known "claude-fable-5". Single-segment suffixes
    # (e.g. "flash") are too generic to suppress on.
    segments = slug.split("-")
    for i in range(1, len(segments) - 1):
        suffix = "-".join(segments[i:])
        if not re.search(r"\d", suffix):
            continue
        for k in org_known:
            if suffix == k or k.endswith("-" + suffix):
                return True
    return False


def correlate(signals: list, entries: list, pending_ids: set) -> list:
    """Group signals into candidate events, drop known ones, score the rest.

    Returns candidates sorted by confidence then org/slug, each:
      {id, org, base_slug, model_hints, signals, announcement_url,
       date_hint, confidence, detectors}
    """
    known = known_slugs(entries)
    clusters = {}
    for s in signals:
        key = (s["org"], base_slug(s["model_hint"]))
        clusters.setdefault(key, []).append(s)

    # Merge fragment clusters into their superset within one org: a
    # cluster whose slug is a hyphen-boundary suffix of another cluster's
    # slug is the same event seen by a detector that only caught the tail
    # ("k3" from a title, "kimi-k3" from a catalog slug).
    merged_into = {}
    org_slugs = {}
    for org, slug in clusters:
        org_slugs.setdefault(org, []).append(slug)
    for org, slugs in org_slugs.items():
        for s in slugs:
            supersets = [t for t in slugs
                         if t != s and t.endswith("-" + s)]
            if len(supersets) == 1:
                merged_into[(org, s)] = (org, supersets[0])
    for src, dst in merged_into.items():
        clusters[dst].extend(clusters.pop(src))

    candidates = []
    for (org, slug), cluster in sorted(clusters.items()):
        if not slug or is_known(org, slug, known):
            continue
        cand_id = f"{org}--{slug}"
        if cand_id in pending_ids:
            continue
        detectors = sorted({s["detector"] for s in cluster})
        # The announcement anchor prefers primary sources: rss, then
        # html_diff, then anything with a URL.
        url = None
        for pref in ("rss", "html_diff", "epoch", "hf_orgs", "openrouter"):
            url = next((s["url"] for s in cluster
                        if s["detector"] == pref and s["url"]), None)
            if url:
                break
        date_hint = min((s["date_hint"] for s in cluster if s["date_hint"]),
                        default=None)
        candidates.append({
            "id": cand_id,
            "org": org,
            "base_slug": slug,
            "model_hints": sorted({s["model_hint"] for s in cluster}),
            "signals": cluster,
            "announcement_url": url,
            "date_hint": date_hint,
            "confidence": len(detectors),
            "detectors": detectors,
        })
    candidates.sort(key=lambda c: (-c["confidence"], c["org"], c["base_slug"]))
    return candidates
