"""Detector tests (P3) against the real fixtures captured at Phase 0, plus
the replay harness: fixtures through the full detect -> correlate -> pending
path against the real backfilled dataset."""
import datetime
import json
import os

import pytest

from pipeline import config, correlate, pending, store
from pipeline.detectors import common, epoch, hf_orgs, html_diff, openrouter, rss

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "captures",
                   "2026-07-16")
CAPTURE_DATE = "2026-07-16"
CAPTURE_TS = datetime.datetime(2026, 7, 16,
                               tzinfo=datetime.timezone.utc).timestamp()


def _read(name: str) -> bytes:
    with open(os.path.join(FIX, name), "rb") as f:
        return f.read()


# ------------------------------------------------------------------- rss

def test_rss_parses_real_openai_feed():
    signals = rss.parse_feed("openai", _read("rss_openai.xml"),
                             lookback_days=3650, now_ts=CAPTURE_TS)
    assert signals, "no release-shaped items in 1,038 real posts"
    for s in signals:
        assert s["org"] == "openai" and s["url"] and s["model_hint"]
    hints = " ".join(s["title"] for s in signals)
    assert "GPT" in hints


def test_rss_lookback_excludes_old_items():
    recent = rss.parse_feed("openai", _read("rss_openai.xml"),
                            lookback_days=30, now_ts=CAPTURE_TS)
    all_time = rss.parse_feed("openai", _read("rss_openai.xml"),
                              lookback_days=3650, now_ts=CAPTURE_TS)
    assert len(recent) < len(all_time)


def test_rss_title_filter_applies():
    signals = rss.parse_feed("amazon", _read("rss_aws_blog.xml"),
                             lookback_days=3650, now_ts=CAPTURE_TS,
                             title_filter=r"\bNova\b")
    for s in signals:
        assert "Nova" in s["title"]


# --------------------------------------------------------------- html_diff

def test_html_diff_parses_real_anthropic_index():
    signals = html_diff.parse_index("anthropic", _read("html_anthropic.html"),
                                    "https://www.anthropic.com/news")
    assert signals
    hints = " ".join(s["title"] for s in signals)
    assert "Claude" in hints
    for s in signals:
        assert s["url"].startswith("http")


def test_html_diff_rejects_js_shell_loudly():
    # html_moonshot.html is the real 615-byte JS shell moonshot.ai serves;
    # kept as a negative fixture exactly for this guard.
    with pytest.raises(RuntimeError, match="too small"):
        html_diff.parse_index("moonshot", _read("html_moonshot.html"),
                              "https://www.moonshot.ai/blog")


# ----------------------------------------------------------------- hf_orgs

def test_hf_parses_real_zai_listing():
    models = json.loads(_read("hf_zai_org_60.json"))
    signals = hf_orgs.parse_listing("zai", models, lookback_days=45,
                                    now_date=CAPTURE_DATE)
    names = {s["model_hint"] for s in signals}
    assert "GLM-5.2" in names and "GLM-5.2-FP8" in names
    old = hf_orgs.parse_listing("zai", models, lookback_days=5,
                                now_date=CAPTURE_DATE)
    assert len(old) < len(signals)


# -------------------------------------------------------------- openrouter

def test_openrouter_parses_real_catalog():
    payload = json.loads(_read("openrouter_models.json"))
    signals = openrouter.parse_catalog(payload, lookback_days=30,
                                       now_ts=CAPTURE_TS)
    assert signals
    orgs = {s["org"] for s in signals}
    assert orgs <= set(config.REGISTRY), f"unknown org keys: {orgs}"
    hints = {s["model_hint"] for s in signals}
    assert "kimi-k3" in hints  # created 2026-07-16 in the capture


# ------------------------------------------------------------------- epoch

def _epoch_csv(rows: list) -> str:
    import csv as _csv
    import io
    buf = io.StringIO()
    w = _csv.DictWriter(buf, fieldnames=config.EPOCH_EXPECTED_COLUMNS)
    w.writeheader()
    for r in rows:
        w.writerow({**{c: "" for c in config.EPOCH_EXPECTED_COLUMNS}, **r})
    return buf.getvalue()


def test_epoch_schema_drift_fails_loudly():
    bad = _epoch_csv([]).replace("Training power draw (W)", "Power draw")
    with pytest.raises(RuntimeError, match="drift"):
        epoch.parse_csv(bad, 14, CAPTURE_DATE)


def test_epoch_detects_recent_registry_rows_only():
    text = _epoch_csv([
        {"Model": "GPT-6", "Organization": "OpenAI",
         "Publication date": "2026-07-10", "Last modified": "2026-07-11",
         "Link": "https://openai.com/index/gpt-6/"},
        {"Model": "Old Model", "Organization": "OpenAI",
         "Publication date": "2024-01-01", "Last modified": "2024-01-02"},
        {"Model": "OtherLab-1", "Organization": "NVIDIA",
         "Publication date": "2026-07-10", "Last modified": "2026-07-11"},
    ])
    signals = epoch.parse_csv(text, 14, CAPTURE_DATE)
    assert [s["model_hint"] for s in signals] == ["GPT-6"]
    assert signals[0]["url"] == "https://openai.com/index/gpt-6/"


# --------------------------------------------------------------- correlate

def _sig(detector, org, hint, url=None, date=None):
    return common.signal(detector, org, hint, url=url, date_hint=date)


def test_sibling_signals_cluster_to_one_candidate():
    signals = [
        _sig("hf_orgs", "zai", "GLM-6", "https://huggingface.co/zai-org/GLM-6", "2026-07-15"),
        _sig("hf_orgs", "zai", "GLM-6-FP8", "https://huggingface.co/zai-org/GLM-6-FP8", "2026-07-15"),
        _sig("html_diff", "zai", "GLM-6", "https://docs.z.ai/glm-6"),
    ]
    cands = correlate.correlate(signals, entries=[], pending_ids=set())
    assert len(cands) == 1
    c = cands[0]
    assert c["id"] == "zai--glm-6"
    assert c["confidence"] == 2
    assert c["announcement_url"] == "https://docs.z.ai/glm-6"  # html > hf


def test_known_entries_are_not_candidates():
    signals = [_sig("hf_orgs", "zai", "GLM-5.2-FP8")]
    entries = [{"org": "zai", "model_name": "GLM-5.2", "variants": []}]
    assert correlate.correlate(signals, entries, set()) == []


def test_existing_pending_not_recreated():
    signals = [_sig("rss", "openai", "GPT-6", "https://openai.com/gpt-6")]
    assert correlate.correlate(signals, [], {"openai--gpt-6"}) == []


# ------------------------------------------------- replay harness (full path)

def test_replay_fixtures_through_full_path(tmp_path):
    """Phase 0 captures -> detectors -> correlate against the real dataset ->
    pending files + morning report."""
    signals = []
    signals += html_diff.parse_index("anthropic", _read("html_anthropic.html"),
                                     "https://www.anthropic.com/news")
    signals += hf_orgs.parse_listing("zai", json.loads(_read("hf_zai_org_60.json")),
                                     config.DETECTION_LOOKBACK_DAYS, CAPTURE_DATE)
    signals += openrouter.parse_catalog(json.loads(_read("openrouter_models.json")),
                                        config.DETECTION_LOOKBACK_DAYS, CAPTURE_TS)
    signals += rss.parse_feed("openai", _read("rss_openai.xml"),
                              config.DETECTION_LOOKBACK_DAYS, CAPTURE_TS)

    entries = store.read_entries()  # the real committed dataset
    candidates = correlate.correlate(signals, entries,
                                     pending.existing_pending_ids(str(tmp_path)))
    assert candidates, "capture window contains releases newer than the dataset"

    paths = pending.write_candidates(candidates, CAPTURE_DATE, root=str(tmp_path))
    assert len(paths) == len(candidates)
    reloaded = json.loads(open(paths[0], encoding="utf-8").read())
    assert reloaded["status"] == "pending-review"
    assert reloaded["signals"]

    report = pending.morning_report(candidates, CAPTURE_DATE,
                                    detector_errors=[], flags=["test flag"])
    assert "Candidates awaiting review" in report
    assert candidates[0]["id"] in report
    assert "FLAGS" in report

    # Idempotence of the pending state: a second correlate run sees the
    # written candidates and produces nothing new.
    again = correlate.correlate(signals, entries,
                                pending.existing_pending_ids(str(tmp_path)))
    assert again == []


def test_morning_report_quiet_night():
    report = pending.morning_report([], CAPTURE_DATE, [], [])
    assert "No new candidate releases" in report
