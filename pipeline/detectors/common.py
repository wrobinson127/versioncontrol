"""Shared fetch and release-pattern helpers for detectors."""
import re

import requests

from .. import config

# A release-shaped title carries a versioned model token: one or more
# capitalized name words followed by a version number ("GPT-5.5", "Llama 4",
# "GLM-5.2", "Kimi K2.7", "Claude Sonnet 5", "Qwen3-Max"), or an o-series
# name. Multi-word capture keeps "Kimi K3" whole so signals from different
# detectors cluster to the same base.
MODEL_TOKEN_RE = re.compile(
    r"\b((?:[A-Z][A-Za-z0-9]*[ -]){0,3}[A-Za-z]*[0-9]+(?:\.[0-9]+)*"
    r"[A-Za-z0-9.-]*|o[0-9]+(?:-mini|-pro)?)\b")

# Date fragments look exactly like model tokens to the regex ("Jul 14",
# "December 11"). Any candidate token whose leading word is a month name is
# a date, not a model (P3 review R1). Same for bare "K-12"-style tokens.
_DATE_TOKEN_RE = re.compile(
    r"^(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|"
    r"Aug(ust)?|Sep(t(ember)?)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)"
    r"[ -]?\d", re.IGNORECASE)
_NON_MODEL_TOKEN_RE = re.compile(
    r"\b(K-12|Microsoft 365|Office 365|S&P 500|Fortune 500|COVID-19"
    r"|Series [A-H])\b", re.IGNORECASE)

RELEASE_VERB_RE = re.compile(
    r"\b(introduc|announc|releas|launch|unveil|available|open[- ]sourc|"
    r"weights|preview of)\w*\b", re.IGNORECASE)

# Words that mark a post as clearly not a model release even when a model
# token appears (partnership stories, funding, usage guides, policy posts).
NOISE_RE = re.compile(
    r"\b(how\b|case study|customer|partnership|hiring|joins?|"
    r"grant|policy|forum|event|summit|conference|series [a-h] funding|"
    r"funding round|raises \$|valuation|marketplace|plugin|teachers|"
    r"students|classroom|24/7)\b", re.IGNORECASE)


def fetch(url: str):
    """GET with the project UA and timeout. Returns (status_code, bytes)."""
    r = requests.get(url, timeout=config.FETCH_TIMEOUT_SECONDS,
                     headers={"User-Agent": config.USER_AGENT})
    return r.status_code, r.content


class SignalList(list):
    """Signals from one detector, plus how many records it examined.

    A detector returning zero signals is ambiguous on its own: the source may
    have handed back nothing at all, or it may have handed back plenty and
    none of it was recent. Those look identical in a bare count and the 2026
    07-26 run proved the cost of that: a healthy HuggingFace adapter reported
    0 for all twelve orgs on a genuinely quiet fortnight and was written up as
    broken. Carrying the examined count lets the morning report tell a quiet
    night from a dead source.

    Subclasses list so every existing caller (len, iteration, +=, equality
    against a plain list) keeps working unchanged.
    """

    def __init__(self, items=(), examined=0):
        super().__init__(items)
        self.examined = examined


# Title verbs and articles that the multi-word capture may swallow ahead of
# the actual model name ("Introducing Claude Sonnet 5").
_LEAD_WORDS = {
    "introducing", "announcing", "presenting", "releasing", "launching",
    "meet", "the", "our", "a", "an", "new", "say", "hello", "get", "try",
    "now", "why", "what", "update", "updates", "available", "preview",
    "early", "inside", "with", "from", "about", "building", "deploy",
    "research", "announcements", "announcement", "news", "blog", "product",
    "api",
}

# Anchors on news indexes concatenate the post title with its date text
# ("Mistral NeMo July 18"); the trailing date is never part of a model name.
_TRAILING_DATE_RE = re.compile(
    r"[ -](Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|"
    r"Aug(ust)?|Sep(t(ember)?)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)"
    r"[ -]?\d{1,2}(,? ?\d{4})?$", re.IGNORECASE)


def _strip_lead_words(tok: str) -> str:
    words = tok.split(" ")
    while len(words) > 1 and words[0].lower() in _LEAD_WORDS:
        words.pop(0)
    return " ".join(words)


def _dedupe_halves(tok: str) -> str:
    """Some index anchors repeat the title ("Kimi K3 Kimi K3"); collapse an
    exact doubled word sequence."""
    words = tok.split(" ")
    half = len(words) // 2
    if len(words) % 2 == 0 and words[:half] == words[half:]:
        return " ".join(words[:half])
    return tok


def model_tokens(title: str) -> list:
    """Model tokens in a title, with date and known non-model tokens
    filtered out."""
    tokens = []
    for m in MODEL_TOKEN_RE.finditer(title):
        tok = _dedupe_halves(_strip_lead_words(m.group(1).strip(" -")))
        tok = _TRAILING_DATE_RE.sub("", tok).strip(" -")
        tok = _strip_lead_words(tok)
        if not tok or _DATE_TOKEN_RE.match(tok) or _NON_MODEL_TOKEN_RE.search(tok):
            continue
        # After date-stripping the token must still carry both letters and a
        # digit; a digit-less remainder means the only digits were the date
        # ("Codestral May 29" -> "Codestral"), which this detector cannot
        # distinguish from prose. Digit-less model names reach the registry
        # through the HF, OpenRouter, and Epoch signals instead.
        if not re.search(r"[A-Za-z]", tok) or not re.search(r"\d", tok):
            continue
        tokens.append(tok)
    return tokens


def looks_like_release(title: str) -> bool:
    if NOISE_RE.search(title):
        return False
    tokens = model_tokens(title)
    if not tokens:
        return False
    has_verb = bool(RELEASE_VERB_RE.search(title))
    return has_verb or len(title) < 60


def model_hint_from(title: str) -> str:
    tokens = model_tokens(title)
    if not tokens:
        return title.strip()[:60]
    # Prefer the longest token: "Claude Sonnet 5" over a stray "5.5" figure.
    return max(tokens, key=len)


def signal(detector: str, org: str, model_hint: str, url=None,
           date_hint=None, title="") -> dict:
    return {"detector": detector, "org": org, "model_hint": model_hint,
            "url": url, "date_hint": date_hint, "title": title}
