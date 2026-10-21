"""Correlate detector signals into candidate release events.

Signals cluster by (org, base model slug) with the same sibling-suffix
stripping the backfill validated against real HF release history. A cluster
that matches an already-published entry or an existing pending candidate is
dropped; the dataset is the detector state.
"""
import re

from . import config
from .backfill import slugify
from .pending import normalize_url

_SIBLING_RE = re.compile(config.SIBLING_SUFFIX_RE)
# HF repos and API slugs decorate with sizes and formats that the base name
# strips for clustering: "Kimi-K2.5-FP8" and "Kimi-K2.5" are one event. A
# mixture-of-experts repo also carries its active parameters ("A42B" in
# Muse-Spark-Open-816B-A42B), which is a size, not a version.
_SIZE_RE = re.compile(r"-(\d+(?:\.\d+)?[bm]|a\d+(?:\.\d+)?b)(?=$|-)",
                      re.IGNORECASE)


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


def record_urls(entries: list) -> dict:
    """Normalized URL -> on-record entry ids, from every source and every
    disclosure link. A page already cited by an entry is that entry's page."""
    urls = {}
    for e in entries:
        cited = [s.get("url") for s in e.get("sources") or []]
        cited += list((e.get("disclosure_links") or {}).values())
        for u in cited:
            if isinstance(u, str) and u.startswith("http"):
                urls.setdefault(normalize_url(u), set()).add(e["id"])
    return urls


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


_DETECTOR_PREFERENCE = ("rss", "html_diff", "epoch", "hf_orgs", "openrouter")


def choose_announcement_url(org: str, cluster: list):
    """The page a draft is extracted from.

    A URL on the lab's own domain wins over any other, then detector order
    (rss, html_diff, epoch, hf_orgs, openrouter) breaks ties. Detector order
    alone let an OpenRouter page anchor Opus 5.5, GPT-6 Sol/Luna and Gemini 4
    Argon although lab pages existed (audit U1), and an OpenRouter-anchored
    draft is read from a page whose numbers are Artificial Analysis's (F1).
    """
    for lab_only in (True, False):
        for pref in _DETECTOR_PREFERENCE:
            for s in cluster:
                if s["detector"] != pref or not s["url"]:
                    continue
                if lab_only and not config.is_lab_url(org, s["url"]):
                    continue
                return s["url"]
    return next((s["url"] for s in cluster if s["url"]), None)


def correlate(signals: list, entries: list, pending_ids: set,
              rejected_urls: dict = None, suppressed: list = None,
              on_record: list = None) -> list:
    """Group signals into candidate events, drop known ones, score the rest.

    rejected_urls maps a normalized URL to the rejected candidate id it came
    from (pending.rejected_urls). A cluster whose every signal URL is already
    in it is the same thing a person already ruled out under another name,
    and is dropped; each drop is appended to `suppressed` as (id, rejected
    ids) for the morning report, so suppression is never silent.

    A cluster whose every signal URL is already cited by an entry (a source
    or a disclosure link) is that entry seen again under another name, and is
    dropped the same way; each drop is appended to `on_record` as (id, entry
    ids). Muse-Spark-Open-816B-A42B was queued on 2026-10-20 although it was
    already the model card of meta--muse-spark-open.

    Returns candidates sorted by confidence then org/slug, each:
      {id, org, base_slug, model_hints, signals, announcement_url,
       date_hint, confidence, detectors}
    """
    rejected_urls = rejected_urls or {}
    known = known_slugs(entries)
    cited = record_urls(entries)
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
        # Rejections were matched by id alone, so a renamed post came back:
        # x.ai retitled the Voice Think Fast posts and xai--grok-voice-1.0/2.0
        # re-entered the queue on the same URLs (audit W4). Every URL must be
        # a rejected one, so a real model that merely shares an announcement
        # post with a rejected sibling still surfaces through its other
        # signals.
        urls = {normalize_url(s["url"]) for s in cluster if s["url"]}
        if urls and urls <= set(rejected_urls):
            if suppressed is not None:
                suppressed.append(
                    (cand_id, sorted({rejected_urls[u] for u in urls})))
            continue
        if urls and urls <= set(cited):
            if on_record is not None:
                on_record.append(
                    (cand_id, sorted(set().union(*(cited[u] for u in urls)))))
            continue
        detectors = sorted({s["detector"] for s in cluster})
        url = choose_announcement_url(org, cluster)
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
