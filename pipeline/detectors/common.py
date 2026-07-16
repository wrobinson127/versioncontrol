"""Shared fetch and release-pattern helpers for detectors."""
import re

import requests

from .. import config

# A release-shaped title: a versioned model token ("GPT-5.5", "Llama 4",
# "GLM-5.2", "Kimi K2.7", "o3-mini", "Qwen3-Max") or an unambiguous release
# verb near a capitalized name.
MODEL_TOKEN_RE = re.compile(
    r"\b([A-Z][A-Za-z]*[- ]?[0-9]+(?:\.[0-9]+)*[A-Za-z0-9-]*"
    r"|o[0-9]+(?:-mini|-pro)?)\b")
RELEASE_VERB_RE = re.compile(
    r"\b(introduc|announc|releas|launch|unveil|available|open[- ]sourc|"
    r"weights|preview of)\w*\b", re.IGNORECASE)

# Words that mark a post as clearly not a model release even when a model
# token appears (partnership stories, research updates, usage guides).
NOISE_RE = re.compile(
    r"\b(how (we|to)|case study|customer|partnership|hiring|joins?|"
    r"grant|policy update|forum|event|summit|conference)\b", re.IGNORECASE)


def fetch(url: str):
    """GET with the project UA and timeout. Returns (status_code, bytes)."""
    r = requests.get(url, timeout=config.FETCH_TIMEOUT_SECONDS,
                     headers={"User-Agent": config.USER_AGENT})
    return r.status_code, r.content


def looks_like_release(title: str) -> bool:
    if NOISE_RE.search(title):
        return False
    has_token = bool(MODEL_TOKEN_RE.search(title))
    has_verb = bool(RELEASE_VERB_RE.search(title))
    return has_token and has_verb or (has_token and len(title) < 60)


def model_hint_from(title: str) -> str:
    m = MODEL_TOKEN_RE.search(title)
    return m.group(1) if m else title.strip()[:60]


def signal(detector: str, org: str, model_hint: str, url=None,
           date_hint=None, title="") -> dict:
    return {"detector": detector, "org": org, "model_hint": model_hint,
            "url": url, "date_hint": date_hint, "title": title}
