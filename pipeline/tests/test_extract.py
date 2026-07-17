"""Offline tests for the extraction path (Phase 0 gate 6).

The live API round trip is deferred (no key in the build environment; see
docs/verification_report.md gate 6). Everything else is verified here:
prompt construction from a real captured announcement, JSON parsing,
provenance population, and rejection of malformed output.
"""
import json
import os

import pytest

from pipeline import config, extract, lint_voice

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "announcements")


def _read_fixture(name: str) -> str:
    with open(os.path.join(FIXTURES, name), encoding="utf-8", errors="replace") as f:
        return f.read()


def test_prompt_builds_from_real_mixtral_announcement():
    html = _read_fixture("mistral_mixtral_8x7b.html")
    prompt = extract.build_prompt(html)
    assert "Mixtral" in prompt, "announcement text lost in HTML stripping"
    assert "<script" not in prompt.lower()
    assert len(prompt) < 20000, "prompt exceeds the budgeted input size"


def test_prompt_builds_from_gpt5_and_gpt41_fixtures():
    for name, marker in [("openai_gpt5_launch.html", "GPT-5"),
                         ("openai_gpt41_point.html", "GPT-4.1")]:
        prompt = extract.build_prompt(_read_fixture(name))
        assert marker in prompt, f"{name}: marker {marker!r} not in stripped text"


# A realistic extraction output for the Mixtral announcement, shaped exactly
# as the prompt requests. This stands in for the live model until the API key
# lands; the live round trip re-runs this same validation path.
SAMPLE_OUTPUT = json.dumps({
    "model_name": "Mixtral 8x7B",
    "organization": "Mistral AI",
    "date": "2023-12-11",
    "availability_class": "open_weights",
    "claimed_benchmarks": [
        {"benchmark_as_stated": "MT-Bench", "value": "8.30", "comparison_stated": None},
        {"benchmark_as_stated": "GPQA Diamond", "value": "29.9", "comparison_stated": None},
    ],
    "disclosure_links": {
        "system_card": None,
        "model_card": "https://huggingface.co/mistralai/Mixtral-8x7B-v0.1",
        "usage_policy": None,
        "paper": "https://arxiv.org/abs/2401.04088",
    },
    "summary": "Mistral AI released Mixtral 8x7B, a sparse mixture-of-experts language model, with open weights under the Apache 2.0 license. Mistral AI reports results on public benchmarks and provides a paper and model card.",
})

ANNOUNCEMENT_URL = "https://mistral.ai/news/mixtral-of-experts/"


def test_parse_populates_all_mandatory_provenance_fields():
    entry = extract.parse_extraction(SAMPLE_OUTPUT, ANNOUNCEMENT_URL,
                                     retrieval_date="2026-07-16")
    assert entry["model_name"] == "Mixtral 8x7B"
    assert entry["availability_class"] == "open_weights"

    # Pinned benchmark got a complete provenance block (invariant 2).
    assert len(entry["benchmarks"]) == 1
    b = entry["benchmarks"][0]
    assert b["benchmark"] == "gpqa-diamond"
    prov = b["provenance"]
    for field in ("source_class", "source_url", "benchmark_name",
                  "benchmark_version", "retrieval_date"):
        assert prov.get(field), f"provenance field {field} missing or empty"
    assert prov["source_class"] == "LAB_REPORTED"
    assert prov["source_url"] == ANNOUNCEMENT_URL

    # Non-pinned benchmark is quarantined, not published (D5).
    assert entry["unpinned_claims"] == [
        {"benchmark_as_stated": "MT-Bench", "value": "8.30"}]

    # Absent disclosure artifacts are the explicit enum, never null (invariant 4).
    assert entry["disclosure_links"]["system_card"] == "NOT_DISCLOSED"
    assert entry["disclosure_links"]["usage_policy"] == "NOT_DISCLOSED"
    assert entry["disclosure_links"]["paper"] == "https://arxiv.org/abs/2401.04088"


def test_sample_summary_passes_voice_lint():
    entry = extract.parse_extraction(SAMPLE_OUTPUT, ANNOUNCEMENT_URL,
                                     retrieval_date="2026-07-16")
    assert lint_voice.lint_text(entry["summary"]) == []


def test_parse_rejects_invalid_json():
    with pytest.raises(extract.ExtractionError):
        extract.parse_extraction("not json {", ANNOUNCEMENT_URL)


def test_parse_rejects_missing_fields():
    bad = json.dumps({"model_name": "X"})
    with pytest.raises(extract.ExtractionError, match="missing fields"):
        extract.parse_extraction(bad, ANNOUNCEMENT_URL)


def test_parse_rejects_unknown_availability_class():
    data = json.loads(SAMPLE_OUTPUT)
    data["availability_class"] = "research_preview"
    with pytest.raises(extract.ExtractionError, match="availability_class"):
        extract.parse_extraction(json.dumps(data), ANNOUNCEMENT_URL)


def test_parse_rejects_malformed_date():
    data = json.loads(SAMPLE_OUTPUT)
    data["date"] = "Dec 11, 2023"
    with pytest.raises(extract.ExtractionError, match="ISO"):
        extract.parse_extraction(json.dumps(data), ANNOUNCEMENT_URL)


def test_benchmark_alias_matching_is_exact_about_versions():
    # "GPQA" without the Diamond qualifier is a DIFFERENT axis and must not
    # match the pin (DESIGN semantic rule 4).
    assert extract.match_pinned_benchmark("GPQA") is None
    assert extract.match_pinned_benchmark("GPQA Diamond") == "gpqa-diamond"
    assert extract.match_pinned_benchmark("SWE-bench Verified") == "swe-bench-verified"
    assert extract.match_pinned_benchmark("SWE-bench") is None
