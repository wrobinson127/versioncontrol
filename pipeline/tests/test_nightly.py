"""Nightly orchestrator unit tests (P6): draft attachment respects the key,
the fetch status, and the spend cap; failures become notes, never guesses."""
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
