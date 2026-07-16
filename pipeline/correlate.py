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


def known_slugs(entries: list) -> set:
    known = set()
    for e in entries:
        for name in {e["model_name"], e.get("epoch_row_name", e["model_name"])}:
            known.add((e["org"], base_slug(name)))
        for v in e.get("variants", []):
            known.add((e["org"], base_slug(v)))
    return known


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

    candidates = []
    for (org, slug), cluster in sorted(clusters.items()):
        if not slug or (org, slug) in known:
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
