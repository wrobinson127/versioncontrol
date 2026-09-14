"""Promotion tests (P6): approved candidates become validated entries in the
aggregates; everything else stays pending; problems flag, never guess."""
import copy
import json
import os

from pipeline import pending, promote, store, validate

RUN_DATE = "2026-07-17"


def _seed_entries(root):
    entries = [{
        "id": "openai--gpt-5.5", "entry_type": "release",
        "model_name": "GPT-5.5", "org": "openai", "date": "2026-04-23",
        "availability_class": "public_api", "parameters": "NOT_DISCLOSED",
        "summary": "OpenAI released GPT-5.5, available by public API. "
                   "The entry is backfilled from Epoch AI's models dataset.",
        "benchmarks": [], "disclosure_links": {
            "system_card": "NOT_DISCLOSED", "model_card": "NOT_DISCLOSED",
            "usage_policy": "NOT_DISCLOSED", "paper": "NOT_DISCLOSED"},
        "predecessor": None, "license_note": None,
        "sources": [{"kind": "epoch_csv",
                     "url": "https://epoch.ai/data/all_ai_models.csv",
                     "retrieval_date": "2026-07-16"}],
        "origin": "backfill-epoch", "retracted": False,
    }]
    assert validate.validate_entry(entries[0]) == []
    store.write_entries(entries, root=root)
    return entries


def _candidate(approved=True, with_draft=True):
    draft = {
        "model_name": "GPT-6",
        "organization": "OpenAI",
        "date": "2026-07-15",
        "availability_class": "public_api",
        "benchmarks": [{
            "benchmark": "gpqa-diamond",
            "benchmark_name": "GPQA Diamond",
            "benchmark_version": "diamond",
            "value": "97.1",
            "provenance": {
                "source_class": "LAB_REPORTED",
                "source_url": "https://openai.com/index/gpt-6/",
                "benchmark_name": "GPQA Diamond",
                "benchmark_version": "diamond",
                "retrieval_date": "2026-07-16",
            },
        }],
        "unpinned_claims": [],
        "disclosure_links": {
            "system_card": "https://cdn.openai.com/gpt-6.pdf",
            "model_card": "NOT_DISCLOSED",
            "usage_policy": "NOT_DISCLOSED",
            "paper": "NOT_DISCLOSED",
        },
        "summary": "OpenAI released GPT-6, available by public API. OpenAI "
                   "reports benchmark results in the announcement and "
                   "published a system card.",
        "extraction": {"source_url": "https://openai.com/index/gpt-6/",
                       "retrieval_date": "2026-07-16",
                       "model": "claude-haiku-4-5-20251001"},
    }
    return {
        "id": "openai--gpt-6", "org": "openai", "model_hints": ["GPT-6"],
        "announcement_url": "https://openai.com/index/gpt-6/",
        "date_hint": "2026-07-15", "confidence": 2,
        "detectors": ["rss", "openrouter"], "detected_on": "2026-07-16",
        "signals": [], "status": "pending-review",
        "draft_entry": draft if with_draft else None,
        "approved": approved,
    }


def _write_candidate(root, cand):
    pdir = os.path.join(root, pending.PENDING_DIR)
    os.makedirs(pdir, exist_ok=True)
    with open(os.path.join(pdir, f"{cand['id']}.json"), "w",
              encoding="utf-8") as f:
        json.dump(cand, f)


def test_approved_candidate_publishes(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate())
    report = promote.promote(RUN_DATE, root=root)
    assert report["problems"] == []
    assert report["promoted"] == [{"candidate": "openai--gpt-6",
                                   "entry": "openai--gpt-6"}]
    entries = {e["id"]: e for e in store.read_entries(root=root)}
    e = entries["openai--gpt-6"]
    assert validate.validate_entry(e) == []
    assert e["origin"] == "nightly-pipeline"
    assert e["benchmarks"][0]["value"] == 97.1
    assert e["predecessor"] == "openai--gpt-5.5"  # same family, earlier
    assert store.check_manifest(root=root) == []
    # Candidate file consumed; derived views refreshed.
    assert not os.path.exists(tmp_path / "data" / "pending" / "openai--gpt-6.json")
    assert (tmp_path / "data" / "derived" / "site_meta.json").exists()


def test_manual_candidate_keeps_its_origin(tmp_path):
    # D24 gap entries are drafted by hand; their candidate carries
    # origin "manual" and the published entry keeps it honestly.
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate() | {"origin": "manual"})
    report = promote.promote(RUN_DATE, root=root)
    assert report["problems"] == []
    entries = {e["id"]: e for e in store.read_entries(root=root)}
    assert entries["openai--gpt-6"]["origin"] == "manual"


def test_unapproved_candidate_stays_pending(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate(approved=False))
    report = promote.promote(RUN_DATE, root=root)
    assert report["promoted"] == [] and report["skipped"] == ["openai--gpt-6"]
    assert os.path.exists(tmp_path / "data" / "pending" / "openai--gpt-6.json")
    assert "openai--gpt-6" not in {e["id"] for e in store.read_entries(root=root)}


def test_draftless_approval_is_a_problem_not_a_guess(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate(with_draft=True) | {"draft_entry": None})
    report = promote.promote(RUN_DATE, root=root)
    assert report["promoted"] == []
    assert any("no extracted draft" in p for p in report["problems"])
    assert os.path.exists(tmp_path / "data" / "pending" / "openai--gpt-6.json")


def test_non_numeric_value_refused(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    cand = _candidate()
    cand["draft_entry"]["benchmarks"][0]["value"] = "state of the art"
    _write_candidate(root, cand)
    report = promote.promote(RUN_DATE, root=root)
    assert any("not numeric" in p for p in report["problems"])


def test_duplicate_entry_id_refused(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    cand = _candidate()
    cand["draft_entry"]["model_name"] = "GPT-5.5"
    _write_candidate(root, cand)
    report = promote.promote(RUN_DATE, root=root)
    assert any("already published" in p for p in report["problems"])


def test_ids_filter_limits_promotion(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate())
    report = promote.promote(RUN_DATE, ids=["some--other"], root=root)
    assert report["promoted"] == [] and "openai--gpt-6" in report["skipped"]


def test_draft_variants_sources_and_predecessor_are_honoured(tmp_path):
    """Three draft fields promote previously ignored.

    variants: a release shipped as several repositories (Tiny Aya: three) is
    one entry with variants, per the one-mark-one-release rule, not three.
    extra_sources: each of those repositories is cited, the way a backfilled
    entry cites every Epoch link.
    predecessor: a revision of a model recorded under a different name
    (Qwen3.8-Max-0902 revising Qwen3.8-2.4T-A95B) has no family match, so the
    heuristic would leave it unchained; an explicit predecessor wins, and one
    that is not on the record is a problem, not a guess.
    """
    root = str(tmp_path)
    _seed_entries(root)
    cand = _candidate()
    # A name with no family match to the seeded GPT-5.5, so only an explicit
    # predecessor can chain it.
    cand["draft_entry"]["model_name"] = "Astra"
    cand["draft_entry"]["variants"] = ["Astra Mini", "Astra Nano"]
    cand["draft_entry"]["extra_sources"] = ["https://example.com/astra-mini",
                                           "https://example.com/astra-nano"]
    cand["draft_entry"]["predecessor"] = "openai--gpt-5.5"
    _write_candidate(root, cand)
    report = promote.promote(RUN_DATE, root=root)
    assert report["problems"] == []
    e = {x["id"]: x for x in store.read_entries(root=root)}["openai--astra"]
    assert validate.validate_entry(e) == []
    assert e["variants"] == ["Astra Mini", "Astra Nano"]
    assert [s["url"] for s in e["sources"][1:]] == [
        "https://example.com/astra-mini", "https://example.com/astra-nano"]
    assert all(s["kind"] == "lab_link" for s in e["sources"][1:])
    assert e["predecessor"] == "openai--gpt-5.5"


def test_unknown_explicit_predecessor_is_a_problem(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    cand = _candidate()
    cand["draft_entry"]["predecessor"] = "openai--does-not-exist"
    _write_candidate(root, cand)
    report = promote.promote(RUN_DATE, root=root)
    assert report["promoted"] == []
    assert any("does-not-exist" in p for p in report["problems"])


def test_promote_never_asserts_a_lab_silence_it_did_not_research(tmp_path):
    """Extraction reads one announcement page. It can find a link; it cannot
    establish that a lab published nothing. So a draft's NOT_DISCLOSED lands
    on the record as NOT_RESEARCHED, and only an APPROVED row in
    content/disclosure_links/ can turn that into a researched absence."""
    root = str(tmp_path)
    _seed_entries(root)
    cand = _candidate()
    cand["draft_entry"]["disclosure_links"] = {
        "system_card": "https://example.com/card.pdf",
        "model_card": "NOT_DISCLOSED", "usage_policy": "NOT_DISCLOSED",
        "paper": "NOT_DISCLOSED"}
    _write_candidate(root, cand)
    report = promote.promote(RUN_DATE, root=root)
    assert report["problems"] == []
    e = {x["id"]: x for x in store.read_entries(root=root)}["openai--gpt-6"]
    assert e["disclosure_links"]["system_card"] == "https://example.com/card.pdf"
    for a in ("model_card", "usage_policy", "paper"):
        assert e["disclosure_links"][a] == validate.NOT_RESEARCHED
