"""Schema validation tests (P1). Fixture entries are cut from real Phase 0
captures; every invariant the validator owns has a rejection test."""
import copy
import json
import os

from pipeline import validate

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "entries",
                       "sample_entries.json")


def _entries():
    with open(FIXTURE, encoding="utf-8") as f:
        return json.load(f)


def _valid_entry():
    return copy.deepcopy(_entries()[0])  # Mixtral


def test_all_fixture_entries_validate_clean():
    for entry in _entries():
        errors = validate.validate_entry(entry)
        assert errors == [], f"{entry['id']}: {errors}"


def test_fixture_covers_release_and_revision_types():
    types = {e["entry_type"] for e in _entries()}
    assert types == {"release", "revision"}


def test_missing_provenance_field_rejected():
    for field in validate.PROVENANCE_FIELDS:
        entry = _valid_entry()
        del entry["benchmarks"][0]["provenance"][field]
        errors = validate.validate_entry(entry)
        assert any(f"provenance.{field}" in e for e in errors), \
            f"validator accepted a number missing provenance.{field}"


def test_empty_provenance_field_rejected():
    entry = _valid_entry()
    entry["benchmarks"][0]["provenance"]["source_url"] = ""
    assert validate.validate_entry(entry)


def test_unpinned_benchmark_rejected():
    entry = _valid_entry()
    entry["benchmarks"][0]["benchmark"] = "mmlu"
    assert any("not a pinned benchmark" in e for e in validate.validate_entry(entry))


def test_provenance_version_must_match_pin():
    entry = _valid_entry()
    entry["benchmarks"][0]["provenance"]["benchmark_version"] = "main"
    assert any("does not match pin" in e for e in validate.validate_entry(entry))


def test_null_disclosure_link_rejected():
    entry = _valid_entry()
    entry["disclosure_links"]["system_card"] = None
    errors = validate.validate_entry(entry)
    assert any("invariant 4" in e for e in errors), \
        "null disclosure link must be rejected; absence is NOT_DISCLOSED"


def test_null_parameters_rejected_not_disclosed_accepted():
    entry = _valid_entry()
    entry["parameters"] = None
    assert validate.validate_entry(entry)
    entry["parameters"] = "NOT_DISCLOSED"
    assert validate.validate_entry(entry) == []


def test_zero_parameters_rejected():
    # NOT_DISCLOSED must never be rendered or stored as zero (invariant 4).
    entry = _valid_entry()
    entry["parameters"] = 0
    assert validate.validate_entry(entry)


def test_non_iso_date_rejected():
    entry = _valid_entry()
    entry["date"] = "12/11/2023"
    assert validate.validate_entry(entry)


def test_pre_window_date_rejected():
    entry = _valid_entry()
    entry["date"] = "2022-11-29"
    assert any("D7" in e for e in validate.validate_entry(entry))


def test_non_registry_org_rejected():
    entry = _valid_entry()
    entry["org"] = "nvidia"
    entry["id"] = "nvidia--nemotron"
    assert any("D2" in e for e in validate.validate_entry(entry))


def test_summary_violating_voice_lint_rejected():
    entry = _valid_entry()
    entry["summary"] = "Mistral AI released an impressive model that beats rivals."
    errors = validate.validate_entry(entry)
    assert any("registrar voice" in e for e in errors)


def test_retracted_requires_note():
    entry = _valid_entry()
    entry["retracted"] = True
    assert any("retraction_note" in e for e in validate.validate_entry(entry))
    entry["retraction_note"] = "Score withdrawn by the lab on 2026-01-05; see source."
    assert validate.validate_entry(entry) == []


def test_predecessor_self_reference_rejected():
    entry = _valid_entry()
    entry["predecessor"] = entry["id"]
    assert validate.validate_entry(entry)


def test_id_must_start_with_org_key():
    entry = _valid_entry()
    entry["id"] = "openai--mixtral-8x7b"
    assert any("org key" in e for e in validate.validate_entry(entry))


def test_make_entry_id_is_stable_and_wellformed():
    eid = validate.make_entry_id("openai", "GPT-4o (Mar 2025)")
    assert eid == "openai--gpt-4o-mar-2025"
    entry = _valid_entry()
    entry["id"] = validate.make_entry_id("mistral", "Mixtral 8x7B")
    assert validate.validate_entry(entry) == []
