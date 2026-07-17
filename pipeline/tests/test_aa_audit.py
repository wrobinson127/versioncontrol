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
