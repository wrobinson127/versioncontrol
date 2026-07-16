"""One-command live verification of the extraction path (Phase 0 gate 6
deferred item). Needs ANTHROPIC_API_KEY in the environment. Costs about
$0.006 per announcement, three announcements total (~$0.02).

    python -m pipeline.verify_llm
"""
import json
import os
import sys
from datetime import datetime, timezone

from . import config, extract, lint_voice, spend

FIXTURES = {
    "openai_gpt5_launch.html": "https://openai.com/index/introducing-gpt-5/",
    "mistral_mixtral_8x7b.html": "https://mistral.ai/news/mixtral-of-experts/",
    "openai_gpt41_point.html": "https://openai.com/index/gpt-4-1/",
}


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set; nothing was run.")
        return 2
    base = os.path.join(os.path.dirname(__file__), "tests", "fixtures",
                        "announcements")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    failures = 0
    total_usd = 0.0
    for name, url in FIXTURES.items():
        with open(os.path.join(base, name), encoding="utf-8",
                  errors="replace") as f:
            html = f.read()
        if not spend.can_spend(today):
            print(f"skipping {name}: {spend.cap_flag(today)}")
            failures += 1
            continue
        raw, t_in, t_out = extract.call_extraction(html)
        spend.record_call(today, t_in, t_out)
        usd = (t_in * config.LLM_PRICE_INPUT_PER_MTOK
               + t_out * config.LLM_PRICE_OUTPUT_PER_MTOK) / 1_000_000
        total_usd += usd
        print(f"\n=== {name} ({t_in} in / {t_out} out tokens, ${usd:.4f})")
        try:
            draft = extract.parse_extraction(raw, url, retrieval_date=today)
        except extract.ExtractionError as e:
            print(f"PARSE FAILED: {e}")
            failures += 1
            continue
        violations = lint_voice.lint_text(draft["summary"])
        print(json.dumps({k: draft[k] for k in
                          ("model_name", "organization", "date",
                           "availability_class", "disclosure_links")},
                         indent=2))
        print("benchmarks:", [(b["benchmark"], b["value"]) for b in draft["benchmarks"]],
              "| unpinned:", [c["benchmark_as_stated"] for c in draft["unpinned_claims"]])
        print("summary:", draft["summary"])
        if violations:
            print("VOICE LINT FAILED:", violations)
            failures += 1
        else:
            print("voice lint: clean")
    print(f"\nTotal cost: ${total_usd:.4f}. "
          f"{'ALL CLEAN' if failures == 0 else f'{failures} FAILURES'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
