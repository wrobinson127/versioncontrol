"""D19 coverage-audit tests: pure-parse over a synthetic AA payload; the
audit never touches data/ and degrades gracefully without a key."""
import subprocess
import sys

from pipeline import aa_audit


def _aa(name, creator, mid=None):
    return {"id": mid or name.lower().replace(" ", "-"), "name": name,
            "model_creator": {"slug": creator}}


def _entries():
    return [
        {"org": "openai", "model_name": "GPT-5", "variants": []},
        {"org": "moonshot", "model_name": "Kimi K2.5", "variants": []},
        {"org": "anthropic", "model_name": "Claude Sonnet 5", "variants": []},
    ]


def test_known_models_are_covered_fragment_aware():
    aa_models = [
        _aa("GPT-5", "openai"),
        _aa("Kimi K2.5", "moonshotai"),
        _aa("Sonnet 5", "anthropic"),          # fragment of the known name
    ]
    audit = aa_audit.coverage_audit(aa_models, _entries())
    assert audit["covered"] == 3
    assert audit["missing"] == []


def test_untracked_model_becomes_a_flag():
    audit = aa_audit.coverage_audit([_aa("GPT-6", "openai")], _entries())
    assert audit["covered"] == 0
    assert audit["missing"] == [{"aa_id": "gpt-6", "name": "GPT-6",
                                 "org": "openai"}]
    report = aa_audit.report_markdown(audit, "2026-07-17")
    assert "GPT-6" in report and "Detection-QA FLAGs" in report
    assert "per Artificial Analysis" in report or "Artificial Analysis" in report


def test_non_registry_creator_listed_not_flagged():
    audit = aa_audit.coverage_audit([_aa("Nemotron 3", "nvidia")], _entries())
    assert audit["missing"] == []
    assert audit["unmatched_creators"] == {"nvidia": 1}
    assert "nvidia" in aa_audit.report_markdown(audit, "2026-07-17")


def test_renamed_creators_are_mapped():
    """The 2026-10-19 weekly audit listed these as unmapped, so xAI, Z.ai and
    Moonshot were never audited (audit F4)."""
    entries = [{"org": "xai", "model_name": "Grok 4.7", "variants": []},
               {"org": "zai", "model_name": "GLM-5.3", "variants": []},
               {"org": "moonshot", "model_name": "Kimi K3", "variants": []}]
    aa_models = [_aa("Grok 4.7", "spacexai"), _aa("GLM-5.3", "z ai"),
                 _aa("Kimi K3", "kimi")]
    audit = aa_audit.coverage_audit(aa_models, entries)
    assert audit["unmatched_creators"] == {}
    assert audit["covered"] == 3


def test_creator_name_spelling_normalises_to_the_key():
    """_creator_slug lowercases slug-or-name; 'Z AI' arrives as 'z ai'."""
    m = {"name": "GLM-5.3", "model_creator": {"name": "Z AI"}}
    assert aa_audit.AA_CREATOR_TO_ORG[aa_audit._creator_slug(m)] == "zai"


def test_effort_suffix_is_stripped_before_matching():
    """'GPT-5.6 Luna (Low)' and 'Muse Spark 1.2 (Xhigh)' are on record; 99
    false 'missing' rows came from the suffix."""
    entries = [{"org": "openai", "model_name": "GPT-5.6 Luna", "variants": []},
               {"org": "meta", "model_name": "Muse Spark 1.2", "variants": []}]
    aa_models = [_aa("GPT-5.6 Luna (Low)", "openai"),
                 _aa("GPT-5.6 Luna (high)", "openai"),
                 _aa("Muse Spark 1.2 (Xhigh)", "meta")]
    audit = aa_audit.coverage_audit(aa_models, entries)
    assert audit["missing"] == []
    assert audit["covered"] == 3
    assert aa_audit.strip_effort_suffix("Muse Spark 1.2 (Xhigh)") == \
        "Muse Spark 1.2"
    assert aa_audit.strip_effort_suffix("(Low)") == "(Low)"


def test_pending_ids_count_as_known():
    aa_models = [_aa("Claude Haiku 5.5", "anthropic"),
                 _aa("GPT-6 Sol (Low)", "openai"),
                 _aa("GPT-7", "openai")]
    audit = aa_audit.coverage_audit(
        aa_models, _entries(),
        pending_ids={"anthropic--claude-haiku-5.5", "openai--gpt-6-sol"})
    assert [m["name"] for m in audit["missing"]] == ["GPT-7"]


def test_docstring_says_internal_use_only():
    """Their Data Platform Terms v1.1 bar display and publication; the module
    must not read as licensing a display use."""
    doc = aa_audit.__doc__
    assert "never displayed" in doc and "never published" in doc
    assert "display rows" not in doc or "withdrawn" in doc


def test_no_key_exits_zero_with_note(tmp_path):
    out = tmp_path / "aa_audit.md"
    env_clear = {"SYSTEMROOT": "C:\\Windows", "PATH": ""}
    proc = subprocess.run(
        [sys.executable, "-m", "pipeline.aa_audit",
         "--run-date", "2026-07-17", "--out", str(out)],
        capture_output=True, text=True, cwd=".",
        env={**__import__('os').environ, "ARTIFICIALANALYSIS_API_KEY": ""})
    assert proc.returncode == 0
    assert "did not run" in out.read_text(encoding="utf-8")
