"""Hugging Face detector: org-scoped only (never the firehose).

New repos under a registry org's first-party handle inside the lookback
window are open-weights release signals. Sibling repos (FP8, Base, size
ladders) are one release; the correlator clusters them.
"""
import json
import re

import requests

from . import common
from .. import config


def parse_listing(org: str, models: list, lookback_days: int,
                  now_date: str) -> list:
    signals = []
    horizon = _shift_date(now_date, -lookback_days)
    for m in models:
        created = (m.get("createdAt") or "")[:10]
        if not created or created < horizon:
            continue
        repo = m.get("id", "")
        name = repo.split("/", 1)[-1]
        signals.append(common.signal(
            "hf_orgs", org, name,
            url=f"https://huggingface.co/{repo}",
            date_hint=created, title=repo))
    return common.SignalList(signals, examined=len(models))


def _shift_date(date_str: str, days: int) -> str:
    import datetime
    d = datetime.date.fromisoformat(date_str) + datetime.timedelta(days=days)
    return d.isoformat()


def detect(org: str, handles: list, lookback_days: int, now_date: str) -> list:
    signals = []
    examined = 0
    for handle in handles:
        r = requests.get(
            config.HF_API_URL,
            params={"author": handle, "sort": "createdAt", "direction": "-1",
                    "limit": str(config.HF_RECENT_LIMIT)},
            timeout=config.FETCH_TIMEOUT_SECONDS,
            headers={"User-Agent": config.USER_AGENT})
        if r.status_code != 200:
            raise RuntimeError(f"hf_orgs {org}/{handle}: HTTP {r.status_code}")
        listing = r.json()
        examined += len(listing)
        signals.extend(parse_listing(org, listing, lookback_days, now_date))
    return common.SignalList(signals, examined=examined)
