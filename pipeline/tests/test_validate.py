"""Schema validation tests (P1). Fixture entries are cut from real Phase 0
captures; every invariant the validator owns has a rejection test.

The mutation baseline is the GPT-5 entry because it carries benchmark
numbers whose values trace to the committed announcement capture
(openai_gpt5_launch.html: 85.7 GPQA Diamond, 74.9 SWE-Bench Verified).
"""
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
    entry = copy.deepcopy(_entries()[1])  # GPT-5
    assert entry["id"] == "openai--gpt-5"
    return entry


def test_all_fixture_entries_validate_clean():
    for entry in _entries():
        errors = validate.validate_entry(entry)
        assert errors == [], f"{entry['id']}: {errors}"


def test_fixture_covers_release_and_revision_types():
    types = {e["entry_type"] for e in _entries()}
    assert types == {"release", "revision"}


def test_fixture_covers_empty_benchmark_list_era_sparsity():
    # Mixtral predates both pinned benchmarks; the honest entry records no
    # numbers at all rather than a number with invented provenance.
    mixtral = _entries()[0]
    assert mixtral["benchmarks"] == []
    assert validate.validate_entry(mixtral) == []


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
    errors = validate.validate_entry(entry)
    assert any("provenance.source_url" in e for e in errors)


def test_invalid_source_class_rejected():
    entry = _valid_entry()
    entry["benchmarks"][0]["provenance"]["source_class"] = "OPENROUTER"
    errors = validate.validate_entry(entry)
    assert any("source_class" in e for e in errors)


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
    entry["disclosure_links"]["model_card"] = None
    errors = validate.validate_entry(entry)
    assert any("invariant 4" in e for e in errors), \
        "null disclosure link must be rejected; absence is NOT_DISCLOSED"


def test_null_parameters_rejected_not_disclosed_accepted():
    entry = _valid_entry()
    entry["parameters"] = None
    assert any("invariant 4" in e for e in validate.validate_entry(entry))
    entry["parameters"] = "NOT_DISCLOSED"
    entry["parameters_basis"] = "NOT_DISCLOSED"
    assert validate.validate_entry(entry) == []


def test_zero_parameters_rejected():
    # NOT_DISCLOSED must never be rendered or stored as zero (invariant 4).
    entry = _valid_entry()
    entry["parameters"] = 0
    assert any("invariant 4" in e for e in validate.validate_entry(entry))


def test_non_iso_date_rejected():
    entry = _valid_entry()
    entry["date"] = "08/07/2025"
    assert any("ISO" in e for e in validate.validate_entry(entry))


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
    entry["summary"] = "OpenAI released an impressive model that beats rivals."
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
    assert any("not be the entry itself" in e for e in validate.validate_entry(entry))


def test_id_must_start_with_org_key():
    entry = _valid_entry()
    entry["id"] = "mistral--gpt-5"
    assert any("org key" in e for e in validate.validate_entry(entry))


def test_make_entry_id_is_stable_and_wellformed():
    assert validate.make_entry_id("openai", "GPT-4o (Mar 2025)") == "openai--gpt-4o-mar-2025"
    entry = _valid_entry()
    entry["id"] = validate.make_entry_id("openai", "GPT-5")
    assert entry["id"] == "openai--gpt-5"
    assert validate.validate_entry(entry) == []


def test_disclosure_links_accept_not_researched_and_reject_null():
    """Two absences, both explicit. NOT_DISCLOSED is a researched claim about
    the lab; NOT_RESEARCHED is the registrar's own gap. Null is neither and
    is refused, so a gap can never be silent."""
    import copy
    e = copy.deepcopy(_valid_entry())
    e["disclosure_links"]["system_card"] = validate.NOT_RESEARCHED
    assert validate.validate_entry(e) == []
    e["disclosure_links"]["system_card"] = None
    assert any("null" in x for x in validate.validate_entry(e))
    e["disclosure_links"]["system_card"] = "unknown"
    assert any("NOT_RESEARCHED" in x for x in validate.validate_entry(e))


def test_record_refuses_a_predecessor_not_on_the_record():
    entries = _entries()
    entries[0] = dict(entries[0], predecessor="openai--no-such-model")
    errors = validate.validate_record(entries)
    assert any("not on the record" in e for e in errors)


def test_record_refuses_duplicate_ids():
    entries = _entries()
    entries.append(copy.deepcopy(entries[0]))
    assert any("duplicate entry id" in e for e in validate.validate_record(entries))


def test_record_accepts_the_fixture():
    entries = _entries()
    ids = {e["id"] for e in entries}
    for e in entries:
        if e["predecessor"] not in ids:
            e["predecessor"] = None
    assert validate.validate_record(entries) == []


def test_validate_has_an_entry_point():
    # it once had none: `python -m pipeline.validate` checked nothing and
    # exited 0 while being cited as a gate
    assert callable(validate.main)


def test_lab_announcement_must_be_on_the_labs_domain():
    e = copy.deepcopy(_entries()[0])
    e["sources"] = [{"kind": "lab_announcement", "url": "https://openrouter.ai/x/y",
                     "retrieval_date": "2026-10-19"}]
    assert any("not on the lab's own domain" in m for m in validate.validate_entry(e))



def test_placeholder_urls_are_refused_on_the_record():
    entries = _entries()
    ids = {e["id"] for e in entries}
    for e in entries:
        if e["predecessor"] not in ids:
            e["predecessor"] = None
    entries[0]["disclosure_links"]["model_card"] = "https://example.com/3.6-flash-model-card"
    assert any("placeholder" in m for m in validate.validate_record(entries))
    entries[0]["disclosure_links"]["model_card"] = "https://examples.dev/card"
    assert not any("placeholder" in m for m in validate.validate_record(entries))
