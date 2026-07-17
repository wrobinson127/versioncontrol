"""LLM structured extraction from lab announcements.

The prompt asks for exactly the fields the data model needs; the parser
validates the model's JSON and populates provenance blocks. The live call is
gated by the monthly spend ledger (invariant 7) and runs only inside the
nightly Action on detection-positive nights.
"""
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser

from . import config

EXTRACTION_FIELDS = [
    "model_name", "organization", "date", "availability_class",
    "claimed_benchmarks", "disclosure_links", "summary",
]

AVAILABILITY_CLASSES = ("open_weights", "public_api", "public_service")

DISCLOSURE_ARTIFACTS = ("system_card", "model_card", "usage_policy", "paper")

EXTRACTION_PROMPT = """You are a registrar's clerk extracting facts from an AI lab's release announcement. Record only what the text states. Do not evaluate, praise, or rank anything.

Return a single JSON object with exactly these fields:

- "model_name": the released model's name as the lab writes it.
- "organization": the releasing organization's name.
- "date": the release date stated or implied by the announcement, ISO format YYYY-MM-DD, or null if not stated.
- "availability_class": one of "open_weights", "public_api", "public_service", or null if the text does not say how the model can be used.
- "claimed_benchmarks": a list of objects, one per benchmark number the lab reports, each with:
  - "benchmark_as_stated": the benchmark's name EXACTLY as written in the text, including any version or subset qualifier (write "GPQA Diamond" if the text says Diamond; write "GPQA" only if the text gives no subset).
  - "value": the reported number as a string, exactly as written.
  - "comparison_stated": any predecessor or competitor number the lab states alongside it, as a string, or null.
- "disclosure_links": an object with keys "system_card", "model_card", "usage_policy", "paper". Each value is a URL found in the text for that artifact, or null if the announcement links no such artifact.
- "summary": one paragraph, at most 80 words, in a neutral registrar voice. State what shipped, from whom, and how it is available. Attribute every claim to the lab by name ("X reports..."). No quality adjectives, no ranking language, no em dashes.

Announcement text follows.

---

{announcement_text}"""


class _TextExtractor(HTMLParser):
    _SKIP = {"script", "style", "noscript", "svg", "head"}

    def __init__(self):
        super().__init__()
        self._skip_depth = 0
        self.chunks = []

    def handle_starttag(self, tag, attrs):
        if tag in self._SKIP:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in self._SKIP and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if not self._skip_depth and data.strip():
            self.chunks.append(data.strip())


def html_to_text(html: str, max_chars: int = 16000) -> str:
    """Strip an announcement page to visible text for the extraction prompt.

    16,000 characters is roughly 4,000 tokens, the input size the budget
    arithmetic assumes.
    """
    p = _TextExtractor()
    p.feed(html)
    text = "\n".join(p.chunks)
    # Labs typeset model names with Unicode hyphens (observed: U+2011
    # non-breaking hyphen in "GPT-4.1" on openai.com). Normalize the hyphen
    # family so downstream matching sees ASCII.
    text = re.sub(r"[‐‑‒]", "-", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text[:max_chars]


def build_prompt(announcement_html: str) -> str:
    return EXTRACTION_PROMPT.format(announcement_text=html_to_text(announcement_html))


# Benchmark-as-stated names that map to the pinned pair. Anything else is
# recorded as unpinned and never published as a number (invariant 2 requires a
# version pin; D5 limits v1 to the pinned pair).
_BENCHMARK_ALIASES = {
    "gpqa-diamond": ["gpqa diamond", "gpqa-diamond", "gpqa (diamond)"],
    "swe-bench-verified": ["swe-bench verified", "swe bench verified",
                           "swebench verified", "swe-bench-verified"],
}


def match_pinned_benchmark(as_stated: str):
    """Return the pinned benchmark key for an as-stated name, or None."""
    low = as_stated.strip().lower()
    for key, aliases in _BENCHMARK_ALIASES.items():
        if low in aliases:
            return key
    return None


class ExtractionError(ValueError):
    pass


def parse_extraction(raw_json: str, announcement_url: str,
                     retrieval_date: str = None) -> dict:
    """Validate the model's JSON and populate provenance.

    Returns a draft-entry dict. Every benchmark number that survives carries a
    complete provenance block (invariant 2): source_class, source_url,
    benchmark name AND version, retrieval_date. Numbers whose as-stated name
    does not match a pinned benchmark are kept under unpinned_claims for the
    morning report but can never enter the published dataset.
    """
    if retrieval_date is None:
        retrieval_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise ExtractionError(f"extraction output is not valid JSON: {e}")

    missing = [f for f in EXTRACTION_FIELDS if f not in data]
    if missing:
        raise ExtractionError(f"extraction output missing fields: {missing}")

    if data["availability_class"] is not None \
            and data["availability_class"] not in AVAILABILITY_CLASSES:
        raise ExtractionError(
            f"unknown availability_class: {data['availability_class']!r}")

    if data["date"] is not None \
            and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(data["date"])):
        raise ExtractionError(f"date is not ISO YYYY-MM-DD: {data['date']!r}")

    links = data["disclosure_links"]
    if not isinstance(links, dict):
        raise ExtractionError("disclosure_links must be an object")
    disclosure = {}
    for artifact in DISCLOSURE_ARTIFACTS:
        url = links.get(artifact)
        # Absence is displayed signal (invariant 4): a missing link is the
        # distinct enum value NOT_DISCLOSED, never null-coerced.
        disclosure[artifact] = url if url else "NOT_DISCLOSED"

    benchmarks = []
    unpinned = []
    claims = data["claimed_benchmarks"]
    if not isinstance(claims, list):
        raise ExtractionError("claimed_benchmarks must be a list")
    for claim in claims:
        as_stated = str(claim.get("benchmark_as_stated", "")).strip()
        value = str(claim.get("value", "")).strip()
        if not as_stated or not value:
            raise ExtractionError(f"benchmark claim missing name or value: {claim}")
        key = match_pinned_benchmark(as_stated)
        if key is None:
            unpinned.append({"benchmark_as_stated": as_stated, "value": value})
            continue
        pin = config.BENCHMARKS[key]
        benchmarks.append({
            "benchmark": key,
            "benchmark_name": pin["name"],
            "benchmark_version": pin["version"],
            "value": value,
            "provenance": {
                "source_class": "LAB_REPORTED",
                "source_url": announcement_url,
                "benchmark_name": pin["name"],
                "benchmark_version": pin["version"],
                "retrieval_date": retrieval_date,
            },
        })

    return {
        "model_name": str(data["model_name"]).strip(),
        "organization": str(data["organization"]).strip(),
        "date": data["date"],
        "availability_class": data["availability_class"],
        "benchmarks": benchmarks,
        "unpinned_claims": unpinned,
        "disclosure_links": disclosure,
        "summary": str(data["summary"]).strip(),
        "extraction": {
            "source_url": announcement_url,
            "retrieval_date": retrieval_date,
            "model": config.LLM_MODEL_ID,
        },
    }
