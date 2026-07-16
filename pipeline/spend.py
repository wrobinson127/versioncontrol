"""LLM spend ledger and hard cap (invariant 7, ruling D8).

The ledger is a small committed JSON file counting calls and estimated spend
per calendar month (UTC). The cap check runs BEFORE every call; at the cap
the pipeline skips extraction and FLAGs, it never spends past it.
"""
import json
import os

from . import config

LEDGER_PATH = os.path.join("data", "derived", "llm_ledger.json")


def _load(root: str = ".") -> dict:
    path = os.path.join(root, LEDGER_PATH)
    if not os.path.exists(path):
        return {"months": {}}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _save(ledger: dict, root: str = ".") -> None:
    path = os.path.join(root, LEDGER_PATH)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(ledger, f, indent=2, sort_keys=True)
        f.write("\n")


def month_of(run_date: str) -> str:
    return run_date[:7]


def can_spend(run_date: str, root: str = ".") -> bool:
    month = _load(root)["months"].get(month_of(run_date),
                                      {"calls": 0, "usd": 0.0})
    return (month["calls"] < config.LLM_MONTHLY_CALL_CAP
            and month["usd"] < config.LLM_MONTHLY_SPEND_CAP_USD)


def record_call(run_date: str, input_tokens: int, output_tokens: int,
                root: str = ".") -> dict:
    """Record one completed call. Returns the month's totals."""
    usd = (input_tokens * config.LLM_PRICE_INPUT_PER_MTOK
           + output_tokens * config.LLM_PRICE_OUTPUT_PER_MTOK) / 1_000_000
    ledger = _load(root)
    month = ledger["months"].setdefault(
        month_of(run_date), {"calls": 0, "usd": 0.0,
                             "input_tokens": 0, "output_tokens": 0})
    month["calls"] += 1
    month["usd"] = round(month["usd"] + usd, 6)
    month["input_tokens"] += input_tokens
    month["output_tokens"] += output_tokens
    _save(ledger, root)
    return month


def cap_flag(run_date: str, root: str = ".") -> str:
    month = _load(root)["months"].get(month_of(run_date),
                                      {"calls": 0, "usd": 0.0})
    return (f"LLM spend cap reached for {month_of(run_date)} "
            f"({month['calls']} calls, ${month['usd']:.2f}); extraction "
            f"skipped, candidates written without drafts (invariant 7).")
