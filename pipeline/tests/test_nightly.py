"""Nightly orchestrator unit tests (P6): draft attachment respects the key,
the fetch status, and the spend cap; failures become notes, never guesses."""
import json
import os
from unittest import mock

from pipeline import nightly, pending


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


# --- an exhausted API account fails the run, not the candidate (audit W1) --

_CREDIT = RuntimeError(
    "Error code: 400 - {'type': 'error', 'error': {'type': "
    "'invalid_request_error', 'message': 'Your credit balance is too low to "
    "access the Anthropic API. Please go to Plans & Billing to upgrade or "
    "purchase credits.'}}")


def test_credit_exhaustion_is_run_level(tmp_path, monkeypatch):
    """Run 35512376637 (2026-09-20) recorded three per-candidate notes and
    went green; the drafting step was dead and nobody was told."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    cands = [_cand(), {**_cand(), "id": "openai--gpt-6-mini"}]
    fatal = []
    with mock.patch("pipeline.detectors.common.fetch",
                    return_value=(200, b"<html>GPT-6</html>")), \
         mock.patch("pipeline.extract.extract_candidate",
                    side_effect=_CREDIT) as ex:
        notes = nightly.extract_drafts(cands, "2026-09-20", str(tmp_path),
                                       fatal=fatal)
    assert len(fatal) == 1 and "credit" in fatal[0]
    assert ex.call_count == 1, "drafting stops at the first refusal"
    assert all(c.get("draft_entry") is None for c in cands)
    assert any("credit" in n for n in notes)


def test_other_api_errors_stay_per_candidate(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    fatal = []
    with mock.patch("pipeline.detectors.common.fetch",
                    return_value=(200, b"<html>GPT-6</html>")), \
         mock.patch("pipeline.extract.extract_candidate",
                    side_effect=RuntimeError("Error code: 529 overloaded")):
        nightly.extract_drafts([_cand()], "2026-09-20", str(tmp_path),
                               fatal=fatal)
    assert fatal == []


def test_redraft_stops_on_credit_exhaustion_without_billing_attempts(
        tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    path = _write_pending(tmp_path)
    fatal = []
    with mock.patch("pipeline.detectors.common.fetch",
                    return_value=(200, b"<html>GPT-6</html>")), \
         mock.patch("pipeline.extract.extract_candidate", side_effect=_CREDIT):
        nightly.redraft_pending("2026-09-20", str(tmp_path), fatal=fatal)
    assert len(fatal) == 1
    assert "draft_attempts" not in json.loads(path.read_text(encoding="utf-8"))


def test_main_writes_candidates_then_exits_red_on_credit_exhaustion(
        tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.chdir(tmp_path)
    sig = {"detector": "rss", "org": "openai", "model_hint": "GPT-6",
           "url": "https://openai.com/index/gpt-6", "date_hint": "2026-09-20",
           "title": "Introducing GPT-6"}
    monkeypatch.setattr("sys.argv", ["nightly", "--root", str(tmp_path),
                                     "--now", "2026-09-20"])
    with mock.patch.object(nightly, "run_detectors",
                           return_value=([sig], [], {"rss openai": 1}, {})), \
         mock.patch("pipeline.store.read_entries", return_value=[]), \
         mock.patch("pipeline.store.check_manifest", return_value=[]), \
         mock.patch("pipeline.detectors.common.fetch",
                    return_value=(200, b"<html>GPT-6</html>")), \
         mock.patch("pipeline.extract.extract_candidate", side_effect=_CREDIT):
        code = nightly.main()
    assert code == 1
    assert (tmp_path / "data" / "pending" / "openai--gpt-6.json").exists()
    report = (tmp_path / "morning_report.md").read_text(encoding="utf-8")
    assert "RUN FAILED" in report and "credit" in report


# --- detector wiring: several news sources per org, HF name filter ---------

def test_run_detectors_runs_every_news_source_with_distinct_labels():
    seen = []

    def fake_rss(org, news, lookback, now_ts):
        seen.append(("rss", org, news["url"]))
        return []

    def fake_html(org, news):
        seen.append(("html_diff", org, news["url"]))
        return []

    hf_calls = {}

    def fake_hf(org, handles, lookback, now_date, name_filter=None):
        hf_calls[org] = name_filter
        return []

    with mock.patch("pipeline.detectors.rss.detect", side_effect=fake_rss), \
         mock.patch("pipeline.detectors.html_diff.detect",
                    side_effect=fake_html), \
         mock.patch("pipeline.detectors.hf_orgs.detect", side_effect=fake_hf), \
         mock.patch("pipeline.detectors.openrouter.detect", return_value=[]), \
         mock.patch("pipeline.detectors.epoch.detect", return_value=[]):
        _, errors, counts, _ = nightly.run_detectors(0.0, "2026-10-19")
    assert errors == []
    google = [u for kind, org, u in seen if org == "google-deepmind"]
    assert len(google) == len(nightly.config.news_sources("google-deepmind"))
    assert ("html_diff", "meta", "https://research.meta.ai/blog") in seen
    google_labels = [k for k in counts if "google-deepmind" in k
                     and not k.startswith("hf_orgs")]
    assert len(google_labels) == len(google), "labels must not collide"
    assert hf_calls["amazon"] == r"\bnova\b"
    assert hf_calls["openai"] is None


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


# --- a scope ruling binds detection too ------------------------------------

def test_scope_exclusions_suppress_candidates(tmp_path):
    """amazon--nova-2.0-pro-preview is excluded from the record by backfill.
    Without this the detector re-proposes it every night, forever."""
    content = tmp_path / "content"
    content.mkdir()
    (content / "scope_exclusions.json").write_text(
        json.dumps([{"id": "amazon--nova-2.0-pro-preview",
                     "reason": "no-access preview"}]), encoding="utf-8")
    ids = pending.existing_pending_ids(str(tmp_path))
    assert "amazon--nova-2.0-pro-preview" in ids


def test_no_exclusions_file_is_fine(tmp_path):
    assert pending.existing_pending_ids(str(tmp_path)) == set()
