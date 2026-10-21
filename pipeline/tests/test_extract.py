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


# --- truncation and empty output are named, not passed off as bad JSON -----

class _FakeResponse:
    def __init__(self, text, stop_reason, thinking=False):
        self.content = [type("B", (), {"type": "text", "text": text})()]
        if thinking:
            self.content.insert(0, type("T", (), {"type": "thinking",
                                                   "thinking": ""})())
        self.usage = type("U", (), {"input_tokens": 100, "output_tokens": 50})()
        self.stop_reason = stop_reason


class _FakeClient:
    def __init__(self, text, stop_reason, thinking=False):
        self._r = _FakeResponse(text, stop_reason, thinking)
        self.messages = self

    def create(self, **kwargs):
        self.kwargs = kwargs
        return self._r


def _candidate():
    return {"id": "openai--gpt-6",
            "announcement_url": "https://example.com/a"}


def test_truncated_output_reports_the_ceiling(tmp_path):
    """A draft cut off at max_tokens must say so. Reported as a JSON syntax
    error it sends the reader hunting for a prompt bug that is not there."""
    client = _FakeClient('{"model_name": "GPT-6", "summ', "max_tokens")
    draft, note = extract.extract_candidate(
        _candidate(), "<html>x</html>", "2026-08-24",
        client=client, root=str(tmp_path))
    assert draft is None
    assert "ceiling" in note and str(config.LLM_MAX_OUTPUT_TOKENS) in note


def test_request_sets_effort_and_no_sampling_params(tmp_path):
    """Haiku 5.5 rejects temperature, top_p and top_k, and its thinking shares
    max_tokens, so the call sends an effort level and nothing else extra."""
    client = _FakeClient('{"model_name": "GPT-6"}', "end_turn")
    extract.call_extraction("<html>x</html>", client=client)
    assert client.kwargs["model"] == config.LLM_MODEL_ID
    assert client.kwargs["extra_body"] == {
        "output_config": {"effort": config.LLM_EFFORT}}
    assert not {"temperature", "top_p", "top_k"} & set(client.kwargs)


def test_ceiling_note_blames_thinking_when_no_text_arrived(tmp_path):
    client = _FakeClient("", "max_tokens", thinking=True)
    draft, note = extract.extract_candidate(
        _candidate(), "<html>x</html>", "2026-10-21",
        client=client, root=str(tmp_path))
    assert draft is None
    assert "thinking used it before any text" in note


def test_ceiling_note_counts_text_after_thinking(tmp_path):
    client = _FakeClient('{"model_name": "GPT-6", "summ', "max_tokens",
                         thinking=True)
    draft, note = extract.extract_candidate(
        _candidate(), "<html>x</html>", "2026-10-21",
        client=client, root=str(tmp_path))
    assert draft is None
    assert "text reached 29 characters after a thinking block" in note


def test_refusal_reports_itself(tmp_path):
    client = _FakeClient("I can't help with that.", "refusal")
    draft, note = extract.extract_candidate(
        _candidate(), "<html>x</html>", "2026-10-20",
        client=client, root=str(tmp_path))
    assert draft is None
    assert "refusal" in note


def test_empty_output_reports_itself(tmp_path):
    client = _FakeClient("", "end_turn")
    draft, note = extract.extract_candidate(
        _candidate(), "<html>x</html>", "2026-08-24",
        client=client, root=str(tmp_path))
    assert draft is None
    assert "no text output" in note


# --- F1: a page off the lab's domain never yields LAB_REPORTED numbers ------

def test_openrouter_page_yields_no_benchmarks_or_claims():
    """Audit F1: the anthropic--claude-sonnet-5.5-batch draft carried
    Artificial Analysis's GPQA 93.9 as LAB_REPORTED, source_url the
    OpenRouter page. Every provenance field was present, so validate passed."""
    url = "https://openrouter.ai/anthropic/claude-sonnet-5.5:batch"
    entry = extract.parse_extraction(SAMPLE_OUTPUT, url,
                                     retrieval_date="2026-10-19",
                                     org="anthropic")
    assert entry["benchmarks"] == []
    assert entry["unpinned_claims"] == []
    assert "LAB_REPORTED" not in json.dumps(entry)
    # Identity fields and summary are kept for the reviewer.
    assert entry["model_name"] == "Mixtral 8x7B"
    assert entry["date"] == "2023-12-11"
    assert entry["availability_class"] == "open_weights"
    # the summary is dropped too: it carried an Artificial Analysis figure
    # as the lab's own words (Phase 3 review)
    assert entry["summary"] is None
    # Links read off an aggregator are not research into the lab.
    assert set(entry["disclosure_links"].values()) == {"NOT_RESEARCHED"}
    assert entry["third_party_source"] is True
    assert "openrouter.ai" in entry["review_note"]


def test_any_non_lab_host_is_treated_as_third_party():
    for url in ("https://example.com/news/mixtral",
                "https://huggingface.co/TheBloke/Mixtral-8x7B-GGUF",
                "https://epoch.ai/models/mixtral"):
        entry = extract.parse_extraction(SAMPLE_OUTPUT, url, org="mistral")
        assert entry["benchmarks"] == [], url
        assert entry["unpinned_claims"] == [], url


def test_another_labs_domain_is_not_this_labs_page():
    """mistral.ai is a lab domain, but not Anthropic's."""
    entry = extract.parse_extraction(SAMPLE_OUTPUT, ANNOUNCEMENT_URL,
                                     org="anthropic")
    assert entry["benchmarks"] == []


def test_lab_domain_subdomain_and_first_party_hf_keep_benchmarks():
    for org, url in (("mistral", "https://docs.mistral.ai/models/mixtral"),
                     ("mistral", "https://www.mistral.ai/news/mixtral"),
                     ("mistral", "https://huggingface.co/mistralai/Mixtral-8x7B-v0.1"),
                     ("deepseek", "https://api-docs.deepseek.com/news/x")):
        entry = extract.parse_extraction(SAMPLE_OUTPUT, url, org=org)
        assert len(entry["benchmarks"]) == 1, url
        assert entry["benchmarks"][0]["provenance"]["source_class"] == \
            "LAB_REPORTED"
        assert "third_party_source" not in entry


def test_extract_candidate_passes_the_candidates_org(tmp_path):
    """The full path decides by the candidate's own org."""
    client = _FakeClient(SAMPLE_OUTPUT, "end_turn")
    cand = {"id": "mistral--mixtral-8x7b", "org": "mistral",
            "announcement_url": "https://openrouter.ai/mistralai/mixtral-8x7b"}
    draft, note = extract.extract_candidate(cand, "<html>x</html>",
                                            "2026-10-19", client=client,
                                            root=str(tmp_path))
    assert draft is not None, note
    assert draft["benchmarks"] == [] and draft["unpinned_claims"] == []


def test_every_registry_org_declares_lab_domains():
    """An org with no lab domains would have every draft stripped, silently."""
    for key, org in config.REGISTRY.items():
        assert org.get("lab_domains"), key
        assert not any(d in ("openrouter.ai", "huggingface.co", "epoch.ai",
                             "artificialanalysis.ai")
                       for d in org["lab_domains"]), key


def test_output_ceiling_is_high_enough_for_a_real_draft():
    """1024 truncated 11 of 52 drafts in production; dense extraction JSON
    runs about 2.8 characters per token."""
    assert config.LLM_MAX_OUTPUT_TOKENS >= 2048


def test_every_registry_org_has_a_country():
    from pipeline import config
    for org, cfg in config.REGISTRY.items():
        assert cfg.get("country") in {"United States", "China", "France", "Canada"}, org
def test_shared_host_counts_only_under_the_labs_path():
    from pipeline import config
    assert config.is_lab_url("google-deepmind",
        "https://storage.googleapis.com/deepmind-media/Model-Cards/x.pdf")
    assert not config.is_lab_url("google-deepmind",
        "https://storage.googleapis.com/someone-else/x.pdf")
    assert config.is_lab_url("meta", "https://dev.meta.ai/legal/aup")
    assert config.is_lab_url("meta", "https://huggingface.co/meta-models/x")

