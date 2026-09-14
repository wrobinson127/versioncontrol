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
    # Positive case on a synthetic feed (the AWS capture happens to carry no
    # Nova post, which made a fixture-only test vacuous; P3 review F2).
    feed = b"""<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Introducing Amazon Nova 3</title>
        <link>https://aws.amazon.com/nova-3</link>
        <pubDate>Wed, 15 Jul 2026 12:00:00 GMT</pubDate></item>
      <item><title>Introducing Amazon EC2 M8g instances</title>
        <link>https://aws.amazon.com/ec2</link>
        <pubDate>Wed, 15 Jul 2026 12:00:00 GMT</pubDate></item>
    </channel></rss>"""
    signals = rss.parse_feed("amazon", feed, lookback_days=30,
                             now_ts=CAPTURE_TS, title_filter=r"\bNova\b")
    assert [s["model_hint"] for s in signals] == ["Amazon Nova 3"]
    # And on the real capture nothing non-Nova leaks through.
    for s in rss.parse_feed("amazon", _read("rss_aws_blog.xml"),
                            lookback_days=3650, now_ts=CAPTURE_TS,
                            title_filter=r"\bNova\b"):
        assert "Nova" in s["title"]


def test_date_tokens_are_never_model_hints():
    # P3 review R1: date fragments dominated candidates.
    for title in ("Jul 14 update", "Announcing our December 11 event",
                  "Claude for K-12 classrooms", "Series B funding round",
                  "How Cars24 scales conversations with OpenAI"):
        assert not common.looks_like_release(title), title
    assert common.model_hint_from("Introducing Claude Sonnet 5") == "Claude Sonnet 5"
    assert common.looks_like_release("Introducing GPT-5")
    assert common.looks_like_release("Kimi K2.7 Code is here")


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


def test_epoch_detector_applies_the_scope_domain_rule():
    """The domain rule binds detection, not just backfill.

    Without this, a Video or Vision row from a registry org is proposed as a
    candidate every night it is touched, rejected by hand, and proposed again:
    the Nova loop. Veo and Sora are registry-org rows and are classified
    exactly this way in Epoch's dataset.
    """
    text = _epoch_csv([
        {"Model": "Veo 9", "Organization": "Google DeepMind",
         "Domain": "Video,Vision", "Publication date": "2026-07-10",
         "Last modified": "2026-07-11"},
        {"Model": "Imagen 5", "Organization": "Google DeepMind",
         "Domain": "Vision", "Publication date": "2026-07-10",
         "Last modified": "2026-07-11"},
        {"Model": "Gemini 9", "Organization": "Google DeepMind",
         "Domain": "Language,Vision,Multimodal",
         "Publication date": "2026-07-10", "Last modified": "2026-07-11"},
        {"Model": "Gemma 5", "Organization": "Google DeepMind",
         "Domain": "Language", "Publication date": "2026-07-10",
         "Last modified": "2026-07-11"},
        # Blank domain still reaches a human: an absent field is not evidence
        # about the model. This is the rule the o3-pro entry rests on.
        {"Model": "Unclassified 1", "Organization": "Google DeepMind",
         "Domain": "", "Publication date": "2026-07-10",
         "Last modified": "2026-07-11"},
    ])
    signals = epoch.parse_csv(text, 14, CAPTURE_DATE)
    assert [s["model_hint"] for s in signals] == [
        "Gemini 9", "Gemma 5", "Unclassified 1"]
    # Out-of-domain rows are still counted as examined: they were looked at
    # and ruled out, which is not the same as a source going dark.
    assert signals.examined == 5


def test_epoch_detector_applies_the_date_window_and_accessibility_rules():
    """The other two halves of the scope rule, also mirrored from backfill.

    Epoch touches old rows constantly, and the recency test keys on Last
    modified, so rows from 2016, 2020 and 2022-11-28 were all proposed as
    release candidates on the 2026-09 nights. "Unreleased" is a positive
    statement that a model is not publicly usable; Claude Mythos 5 and Llama
    4 Behemoth (preview) carry it and were proposed anyway. Blank fields still
    pass: an absent value is not evidence about the model.
    """
    text = _epoch_csv([
        {"Model": "Old Thing", "Organization": "Google DeepMind",
         "Domain": "Language", "Publication date": "2016-02-11",
         "Model accessibility": "", "Last modified": "2026-07-11"},
        {"Model": "Day Before", "Organization": "OpenAI",
         "Domain": "Language", "Publication date": "2022-11-28",
         "Model accessibility": "", "Last modified": "2026-07-11"},
        {"Model": "Day Of", "Organization": "OpenAI",
         "Domain": "Language", "Publication date": "2022-11-30",
         "Model accessibility": "", "Last modified": "2026-07-11"},
        {"Model": "Locked Away", "Organization": "Anthropic",
         "Domain": "Language,Multimodal", "Publication date": "2026-06-09",
         "Model accessibility": "Unreleased", "Last modified": "2026-07-11"},
        {"Model": "App Only", "Organization": "Google DeepMind",
         "Domain": "Language", "Publication date": "2026-07-10",
         "Model accessibility": "Hosted access (no API)",
         "Last modified": "2026-07-11"},
        {"Model": "Blank Everything", "Organization": "Google DeepMind",
         "Domain": "", "Publication date": "", "Model accessibility": "",
         "Last modified": "2026-07-11"},
    ])
    signals = epoch.parse_csv(text, 14, CAPTURE_DATE)
    assert [s["model_hint"] for s in signals] == [
        "Day Of", "App Only", "Blank Everything"]
    assert signals.examined == 6


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


def test_fragment_hints_of_known_models_are_suppressed():
    # P3 review R2: hints are often fragments of the dataset name.
    entries = [
        {"org": "anthropic", "model_name": "Claude Sonnet 5", "variants": []},
        {"org": "moonshot", "model_name": "Kimi K2.5", "variants": []},
        {"org": "xai", "model_name": "Grok Code Fast 1", "variants": []},
    ]
    signals = [
        _sig("html_diff", "anthropic", "Sonnet 5"),
        _sig("html_diff", "moonshot", "K2.5"),
        _sig("html_diff", "xai", "Fast 1"),
    ]
    assert correlate.correlate(signals, entries, set()) == []


def test_fragment_and_full_hints_merge_to_one_candidate():
    # P3 review F3: "K3" from a title and "kimi-k3" from a catalog slug are
    # one release.
    signals = [
        _sig("html_diff", "moonshot", "K3", "https://kimi.com/blog/k3"),
        _sig("openrouter", "moonshot", "kimi-k3",
             "https://openrouter.ai/moonshotai/kimi-k3", "2026-07-16"),
    ]
    cands = correlate.correlate(signals, [], set())
    assert len(cands) == 1
    assert cands[0]["id"] == "moonshot--kimi-k3"
    assert cands[0]["confidence"] == 2


def test_rejected_ids_are_durable(tmp_path):
    import json as _json
    pdir = tmp_path / "data" / "pending"
    pdir.mkdir(parents=True)
    (pdir / "rejected.json").write_text(
        _json.dumps([{"id": "openai--gpt-6", "reason": "not a model"}]))
    ids = pending.existing_pending_ids(str(tmp_path))
    assert "openai--gpt-6" in ids
    signals = [_sig("rss", "openai", "GPT-6", "https://openai.com/gpt-6")]
    assert correlate.correlate(signals, [], ids) == []


def test_existing_pending_not_recreated():
    signals = [_sig("rss", "openai", "GPT-6", "https://openai.com/gpt-6")]
    assert correlate.correlate(signals, [], {"openai--gpt-6"}) == []


# ------------------------------------------------- replay harness (full path)

_HTML_SOURCES = {
    "anthropic": ("html_anthropic.html", "https://www.anthropic.com/news"),
    "xai": ("html_xai.html", "https://x.ai/news"),
    "mistral": ("html_mistral.html", "https://mistral.ai/news"),
    "deepseek": ("html_deepseek.html", "https://api-docs.deepseek.com/news"),
    "cohere": ("html_cohere.html", "https://cohere.com/blog"),
    "moonshot": ("html_moonshot_kimi_blog.html", "https://www.kimi.com/blog/"),
    "zai": ("html_zai_release_notes.html", "https://docs.z.ai/release-notes/new-released"),
}


def _all_fixture_signals():
    """Every configured source that has a Phase 0 capture (P3 review F1)."""
    signals = []
    for org, (name, base) in _HTML_SOURCES.items():
        signals += html_diff.parse_index(org, _read(name), base)
    signals += hf_orgs.parse_listing("zai", json.loads(_read("hf_zai_org_60.json")),
                                     config.DETECTION_LOOKBACK_DAYS, CAPTURE_DATE)
    signals += openrouter.parse_catalog(json.loads(_read("openrouter_models.json")),
                                        config.DETECTION_LOOKBACK_DAYS, CAPTURE_TS)
    for org, name in (("openai", "rss_openai.xml"),
                      ("google-deepmind", "rss_deepmind.xml"),
                      ("alibaba-qwen", "rss_qwen_index.xml")):
        signals += rss.parse_feed(org, _read(name),
                                  config.DETECTION_LOOKBACK_DAYS, CAPTURE_TS)
    signals += rss.parse_feed("amazon", _read("rss_aws_blog.xml"),
                              config.DETECTION_LOOKBACK_DAYS, CAPTURE_TS,
                              title_filter=r"\bNova\b")
    return signals


def test_replay_fixtures_through_full_path(tmp_path):
    """Phase 0 captures for EVERY configured source -> detectors ->
    correlate against the real dataset -> pending files + morning report,
    with candidate-quality assertions (P3 review R1/R2/F1)."""
    import re as _re
    signals = _all_fixture_signals()

    entries = store.read_entries()  # the real committed dataset
    candidates = correlate.correlate(signals, entries,
                                     pending.existing_pending_ids(str(tmp_path)))
    assert candidates, "capture window contains releases newer than the dataset"

    # Naming a specific model as "must be a candidate" is self-destructing:
    # the assertion holds only until that model is published. kimi-k3 was the
    # example here and it entered the record in the 2026-08-24 refresh, so the
    # property is asserted instead of the instance, and kimi-k3 moves to the
    # published set below where it now tests suppression rather than detection.
    ids = {c["id"] for c in candidates}
    assert ids, "the capture window should surface at least one candidate"

    # No candidate may be a date fragment (R1) or a published model (R2).
    # The R2 check uses a curated list of models known to be in the dataset,
    # independent of the suppression predicate correlate itself filters on.
    month_re = _re.compile(
        r"--(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*-?\d")
    published = {"anthropic--claude-sonnet-5", "moonshot--kimi-k2.5",
                 "moonshot--kimi-k2.6", "moonshot--kimi-k2-thinking",
                 "mistral--mistral-small-3.1", "mistral--mistral-medium-3.5",
                 "xai--grok-code-fast-1", "anthropic--claude-fable-5",
                 "openai--gpt-5.5", "zai--glm-5.2",
                 # Entered the record in the 2026-08-24 capture refresh.
                 "moonshot--kimi-k3", "anthropic--claude-opus-5",
                 "xai--grok-4.5", "meta--muse-spark-1.1"}
    for c in candidates:
        assert not month_re.search(c["id"]), f"date-fragment candidate {c['id']}"
        assert c["id"] not in published, f"published model resurfaced: {c['id']}"
        for pub in published:
            org, _, k = pub.partition("--")
            assert not (c["org"] == org and c["base_slug"] == k), c["id"]

    paths = pending.write_candidates(candidates, CAPTURE_DATE, root=str(tmp_path))
    assert len(paths) == len(candidates)
    reloaded = json.loads(open(paths[0], encoding="utf-8").read())
    assert reloaded["status"] == "pending-review"
    assert reloaded["signals"]

    report = pending.morning_report(candidates, CAPTURE_DATE,
                                    detector_errors=[], flags=["test flag"])
    assert "Detected tonight" in report
    assert candidates[0]["id"] in report
    assert "FLAGS" in report
    assert f"Awaiting review in total: {len(candidates)}." in report

    # A candidate held from an earlier run is suppressed by correlate() and so
    # never reappears in a later night's candidate list. It must still be named
    # in the report, or it sits in the queue unreviewed and unmentioned.
    held = pending.held_candidates({c["id"] for c in candidates},
                                   root=str(tmp_path))
    assert held == [], "nothing is held on a fresh queue"

    stale = {"id": "someorg--held-model", "org": "someorg",
             "detected_on": "2000-01-01", "date_hint": "2000-01-01",
             "draft_entry": None, "status": "pending-review"}
    with open(os.path.join(str(tmp_path), "data", "pending",
                           "someorg--held-model.json"), "w",
              encoding="utf-8") as f:
        json.dump(stale, f)
    held = pending.held_candidates({c["id"] for c in candidates},
                                   root=str(tmp_path))
    assert [c["id"] for c in held] == ["someorg--held-model"]

    report = pending.morning_report(candidates, CAPTURE_DATE,
                                    detector_errors=[], flags=[], held=held)
    assert "Held from earlier runs: 1" in report
    assert "someorg--held-model" in report
    assert f"Awaiting review in total: {len(candidates) + 1}." in report

    # The held candidate is also reported on a night that detects nothing new,
    # which is the night it would otherwise vanish on.
    quiet = pending.morning_report([], CAPTURE_DATE, detector_errors=[],
                                   flags=[], held=held)
    assert "someorg--held-model" in quiet
    assert "Awaiting review in total: 1." in quiet

    # Idempotence of the pending state: a second correlate run sees the
    # written candidates and produces nothing new.
    again = correlate.correlate(signals, entries,
                                pending.existing_pending_ids(str(tmp_path)))
    assert again == []


def test_morning_report_quiet_night():
    report = pending.morning_report([], CAPTURE_DATE, [], [])
    assert "No new candidate releases" in report


# --- examined counts: a zero must say what it is made of -------------------

def test_hf_listing_reports_records_examined():
    models = json.loads(_read("hf_zai_org_60.json"))
    recent = hf_orgs.parse_listing("zai", models, lookback_days=45,
                                   now_date=CAPTURE_DATE)
    stale = hf_orgs.parse_listing("zai", models, lookback_days=5,
                                  now_date=CAPTURE_DATE)
    # Same catalog either way: the signal count moves, examined does not.
    assert recent.examined == len(models)
    assert stale.examined == len(models)
    assert len(stale) < len(recent)


def test_openrouter_reports_records_examined():
    payload = json.loads(_read("openrouter_models.json"))
    signals = openrouter.parse_catalog(payload, lookback_days=30,
                                       now_ts=CAPTURE_TS)
    assert signals.examined == len(payload["data"])


def test_empty_listing_examines_nothing():
    """The distinction the morning report depends on: no records at all is
    not the same fact as records that were all too old."""
    assert hf_orgs.parse_listing("zai", [], 45, CAPTURE_DATE).examined == 0


def test_signal_list_behaves_as_a_plain_list():
    sl = common.SignalList([1, 2], examined=7)
    assert sl == [1, 2] and len(sl) == 2 and list(sl) == [1, 2]
