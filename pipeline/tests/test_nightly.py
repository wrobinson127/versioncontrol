"""Nightly orchestrator unit tests (P6): draft attachment respects the key,
the fetch status, and the spend cap; failures become notes, never guesses."""
import json
import os
from unittest import mock

from pipeline import nightly


def _cand(url="https://example.com/announce"):
    return {"id": "openai--gpt-6", "org": "openai",
            "announcement_url": url, "model_hints": ["GPT-6"],
            "signals": [], "date_hint": None, "confidence": 2,
            "detectors": ["rss", "hf_orgs"]}


def test_no_key_writes_no_drafts(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    cands = [_cand()]
    notes = nightly.extract_drafts(cands, "2026-07-16", str(tmp_path))
    assert cands[0].get("draft_entry") is None
    assert any("ANTHROPIC_API_KEY absent" in n for n in notes)


def test_missing_announcement_url_skips_draft(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    cands = [_cand(url=None)]
    notes = nightly.extract_drafts(cands, "2026-07-16", str(tmp_path))
    assert cands[0].get("draft_entry") is None
    assert any("no announcement URL" in n for n in notes)


def test_failed_fetch_becomes_note_not_crash(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    cands = [_cand()]
    with mock.patch("pipeline.detectors.common.fetch", return_value=(403, b"")):
        notes = nightly.extract_drafts(cands, "2026-07-16", str(tmp_path))
    assert cands[0].get("draft_entry") is None
    assert any("HTTP 403" in n for n in notes)


def test_extraction_exception_becomes_note(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    cands = [_cand()]
    with mock.patch("pipeline.detectors.common.fetch",
                    return_value=(200, b"<html>GPT-6</html>")), \
         mock.patch("pipeline.extract.extract_candidate",
                    side_effect=RuntimeError("api down")):
        notes = nightly.extract_drafts(cands, "2026-07-16", str(tmp_path))
    assert cands[0].get("draft_entry") is None
    assert any("api down" in n for n in notes)


# --- adapter flags: a quiet night must not read as a broken adapter --------

def test_quiet_source_is_not_flagged():
    """Zero signals from a source that examined a full catalog is a quiet
    night. Flagging it is what made a healthy HF adapter look broken."""
    counts = {"hf_orgs openai": 0, "hf_orgs meta": 0, "epoch": 3}
    examined = {"hf_orgs openai": 30, "hf_orgs meta": 30, "epoch": 312}
    assert nightly.adapter_flags(counts, examined) == []


def test_class_examining_nothing_anywhere_is_flagged():
    counts = {"hf_orgs openai": 0, "hf_orgs meta": 0, "epoch": 3}
    examined = {"hf_orgs openai": 0, "hf_orgs meta": 0, "epoch": 312}
    flags = nightly.adapter_flags(counts, examined)
    assert len(flags) == 1
    assert flags[0].startswith("hf_orgs:")


def test_one_empty_source_among_populated_peers_is_not_flagged():
    """Anthropic publishes no open weights, so its HF listing is empty every
    night. A permanent flag there would be noise, not signal."""
    counts = {"hf_orgs anthropic": 0, "hf_orgs meta": 0}
    examined = {"hf_orgs anthropic": 0, "hf_orgs meta": 30}
    assert nightly.adapter_flags(counts, examined) == []


def test_errored_source_is_left_to_the_error_section():
    counts = {"epoch": "ERROR"}
    examined = {"epoch": None}
    assert nightly.adapter_flags(counts, examined) == []


# --- redraft: a candidate whose first draft failed must be retryable -------

def _write_pending(tmp_path, draft=None, url="https://example.com/a"):
    d = tmp_path / "data" / "pending"
    d.mkdir(parents=True)
    payload = {"id": "openai--gpt-6", "org": "openai",
               "announcement_url": url, "draft_entry": draft,
               "status": "pending-review"}
    (d / "openai--gpt-6.json").write_text(json.dumps(payload), encoding="utf-8")
    return d / "openai--gpt-6.json"


def test_redraft_fills_a_missing_draft(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    path = _write_pending(tmp_path)
    with mock.patch("pipeline.detectors.common.fetch",
                    return_value=(200, b"<html>GPT-6</html>")), \
         mock.patch("pipeline.extract.extract_candidate",
                    return_value=({"model_name": "GPT-6"}, "drafted")):
        notes = nightly.redraft_pending("2026-08-24", str(tmp_path))
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["draft_entry"] == {"model_name": "GPT-6"}
    assert saved["draft_attempts"] == 1
    assert any("drafted" in n for n in notes)


def test_redraft_leaves_an_existing_draft_alone(tmp_path, monkeypatch):
    """Never re-bill a candidate that already has a draft."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    path = _write_pending(tmp_path, draft={"model_name": "already here"})
    with mock.patch("pipeline.detectors.common.fetch") as fetched:
        nightly.redraft_pending("2026-08-24", str(tmp_path))
    assert not fetched.called
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["draft_entry"] == {"model_name": "already here"}
    assert "draft_attempts" not in saved


def test_redraft_records_the_attempt_even_when_it_fails(tmp_path, monkeypatch):
    """A candidate that fails every night must show its attempts, not look
    untried."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    path = _write_pending(tmp_path)
    with mock.patch("pipeline.detectors.common.fetch",
                    return_value=(403, b"")):
        nightly.redraft_pending("2026-08-24", str(tmp_path))
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["draft_entry"] is None
    assert saved["draft_attempts"] == 1


def test_redraft_without_key_does_nothing(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    path = _write_pending(tmp_path)
    notes = nightly.redraft_pending("2026-08-24", str(tmp_path))
    assert any("absent" in n for n in notes)
    assert json.loads(path.read_text(encoding="utf-8"))["draft_entry"] is None


# --- reaping candidates that reached the record another way ---------------

def _pending_file(tmp_path, candidate_id):
    d = tmp_path / "data" / "pending"
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{candidate_id}.json"
    p.write_text(json.dumps({"id": candidate_id, "status": "pending-review"}),
                 encoding="utf-8")
    return p


def test_published_candidate_is_reaped(tmp_path):
    """The 2026-08-24 Epoch refresh backfilled 26 of 64 queued candidates in
    one go; every one stayed in the queue where it could be approved twice."""
    p = _pending_file(tmp_path, "anthropic--claude-opus-5")
    entries = [{"id": "anthropic--claude-opus-5"}]
    reaped = nightly.reap_published_candidates(entries, str(tmp_path))
    assert reaped == ["anthropic--claude-opus-5"]
    assert not p.exists()


def test_unpublished_candidate_survives(tmp_path):
    p = _pending_file(tmp_path, "openai--gpt-9")
    reaped = nightly.reap_published_candidates([{"id": "openai--gpt-8"}],
                                               str(tmp_path))
    assert reaped == []
    assert p.exists()


def test_reaping_never_touches_the_durable_rejection_list(tmp_path):
    d = tmp_path / "data" / "pending"
    d.mkdir(parents=True)
    rejected = d / "rejected.json"
    rejected.write_text('["openai--some-tool"]', encoding="utf-8")
    nightly.reap_published_candidates([{"id": "rejected"}], str(tmp_path))
    assert rejected.exists(), "rejected.json is durable state, not a candidate"


def test_reaping_an_absent_directory_is_a_no_op(tmp_path):
    assert nightly.reap_published_candidates([{"id": "x"}], str(tmp_path)) == []
