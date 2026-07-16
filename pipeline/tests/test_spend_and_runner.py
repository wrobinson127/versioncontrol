"""P4 tests: spend ledger + cap enforcement, and the extraction runner path
with a stub client (the live round trip is a flagged one-command check)."""
import json
import os

from pipeline import config, extract, spend

RUN_DATE = "2026-07-16"


def test_ledger_accumulates_and_caps(tmp_path):
    root = str(tmp_path)
    assert spend.can_spend(RUN_DATE, root=root)
    month = spend.record_call(RUN_DATE, 4000, 400, root=root)
    assert month["calls"] == 1
    # $0.004 + $0.002 per the verified pricing arithmetic
    assert abs(month["usd"] - 0.006) < 1e-9
    for _ in range(config.LLM_MONTHLY_CALL_CAP - 1):
        spend.record_call(RUN_DATE, 4000, 400, root=root)
    assert not spend.can_spend(RUN_DATE, root=root)
    assert "cap reached" in spend.cap_flag(RUN_DATE, root=root)
    # A new month spends again.
    assert spend.can_spend("2026-08-01", root=root)


def test_usd_cap_binds_independently_of_call_count(tmp_path):
    root = str(tmp_path)
    spend.record_call(RUN_DATE, 1_500_000, 100_000, root=root)  # $2.00
    assert not spend.can_spend(RUN_DATE, root=root)


class _StubClient:
    """Anthropic-shaped stub returning a canned extraction output."""
    def __init__(self, text):
        class _Msgs:
            def __init__(self, outer):
                self._outer = outer

            def create(self, **kwargs):
                assert kwargs["model"] == config.LLM_MODEL_ID
                class Block:
                    type = "text"
                    text = self._outer._text
                class Usage:
                    input_tokens = 4000
                    output_tokens = 400
                class Resp:
                    content = [Block()]
                    usage = Usage()
                return Resp()
        self._text = text
        self.messages = _Msgs(self)


GOOD_OUTPUT = json.dumps({
    "model_name": "GPT-6",
    "organization": "OpenAI",
    "date": "2026-07-15",
    "availability_class": "public_api",
    "claimed_benchmarks": [
        {"benchmark_as_stated": "GPQA Diamond", "value": "97.1",
         "comparison_stated": None},
    ],
    "disclosure_links": {"system_card": "https://cdn.openai.com/gpt-6.pdf",
                         "model_card": None, "usage_policy": None,
                         "paper": None},
    "summary": "OpenAI released GPT-6, available by public API. OpenAI "
               "reports benchmark results in the announcement and published "
               "a system card.",
})

CANDIDATE = {"id": "openai--gpt-6",
             "announcement_url": "https://openai.com/index/gpt-6/"}
HTML = "<html><body><h1>GPT-6</h1><p>Announcement text.</p></body></html>"


def test_extract_candidate_full_path(tmp_path):
    root = str(tmp_path)
    draft, note = extract.extract_candidate(
        CANDIDATE, HTML, RUN_DATE, client=_StubClient(GOOD_OUTPUT), root=root)
    assert draft is not None, note
    assert draft["model_name"] == "GPT-6"
    assert draft["benchmarks"][0]["provenance"]["source_class"] == "LAB_REPORTED"
    assert draft["disclosure_links"]["model_card"] == "NOT_DISCLOSED"
    # The call was recorded against the ledger.
    ledger = json.load(open(os.path.join(root, spend.LEDGER_PATH)))
    assert ledger["months"]["2026-07"]["calls"] == 1


def test_extract_candidate_lint_gate_blocks_draft(tmp_path):
    bad = json.loads(GOOD_OUTPUT)
    bad["summary"] = "OpenAI released an impressive model that beats rivals."
    draft, note = extract.extract_candidate(
        CANDIDATE, HTML, RUN_DATE, client=_StubClient(json.dumps(bad)),
        root=str(tmp_path))
    assert draft is None
    assert "voice lint" in note


def test_extract_candidate_malformed_output_rejected(tmp_path):
    draft, note = extract.extract_candidate(
        CANDIDATE, HTML, RUN_DATE, client=_StubClient("not json"),
        root=str(tmp_path))
    assert draft is None
    assert "rejected" in note


def test_extract_candidate_skips_at_cap(tmp_path):
    root = str(tmp_path)
    spend.record_call(RUN_DATE, 1_500_000, 100_000, root=root)  # hits $2 cap
    draft, note = extract.extract_candidate(
        CANDIDATE, HTML, RUN_DATE, client=_StubClient(GOOD_OUTPUT), root=root)
    assert draft is None
    assert "cap reached" in note
    # No call recorded past the cap.
    ledger = json.load(open(os.path.join(root, spend.LEDGER_PATH)))
    assert ledger["months"]["2026-07"]["calls"] == 1


def test_fenced_output_tolerated(tmp_path):
    fenced = "```json\n" + GOOD_OUTPUT + "\n```"
    draft, note = extract.extract_candidate(
        CANDIDATE, HTML, RUN_DATE, client=_StubClient(fenced),
        root=str(tmp_path))
    assert draft is not None, note
