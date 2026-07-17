"""D24 completeness audit: the diff must name gaps, must not alarm on
legitimate beyond-capture entries, and must degrade the AA leg to a
stated no-run note without a key."""
import os

from pipeline import audit_completeness


def _e(eid, date, org="openai", origin="backfill-epoch"):
    return {"id": eid, "model_name": eid.split("--")[1], "org": org,
            "date": date, "entry_type": "release", "origin": origin}


def test_diff_names_gaps_and_beyond_capture():
    expected = [_e("openai--a", "2024-01-01"), _e("openai--b", "2024-06-01")]
    record = [_e("openai--a", "2024-01-01"),
              _e("openai--chatgpt", "2022-11-30", origin="manual")]
    d = audit_completeness.diff_record(expected, record)
    assert [m["id"] for m in d["missing"]] == ["openai--b"]
    assert d["beyond_capture"] == {"manual": ["openai--chatgpt"]}


def test_diff_clean_when_complete():
    expected = [_e("openai--a", "2024-01-01")]
    d = audit_completeness.diff_record(expected, expected)
    assert d["missing"] == [] and d["beyond_capture"] == {}


def test_staleness_covers_every_registry_org():
    record = [_e("openai--a", "2026-07-01")]
    stale = audit_completeness.staleness(record, "2026-07-16")
    by_org = {s["org"]: s for s in stale}
    assert len(by_org) == 12
    assert by_org["openai"]["days_before_capture"] == 15
    assert by_org["anthropic"]["newest"] == "no entries"


def test_aa_leg_states_no_run_without_key(monkeypatch):
    monkeypatch.delenv("ARTIFICIALANALYSIS_API_KEY", raising=False)
    note = audit_completeness.run_aa_leg([], "2026-07-16")
    assert "Not run" in note and "no-run note" in note


def test_report_renders_all_sections():
    d = {"missing": [{"id": "openai--b", "model_name": "b", "org": "openai",
                      "date": "2024-06-01", "entry_type": "release"}],
         "beyond_capture": {"manual": ["openai--chatgpt"]}}
    stale = [{"org": "openai", "newest": "2024-06-01",
              "days_before_capture": 40}]
    md = audit_completeness.report_markdown(d, stale, "2026-07-16", "Not run.")
    assert "Gaps: 1" in md
    assert "openai--chatgpt" in md
    assert "manual sweep" in md
