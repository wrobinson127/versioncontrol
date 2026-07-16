"""RSS detector: official lab feeds (OpenAI, Google DeepMind, Qwen, AWS)."""
import calendar
import re
import time

import feedparser

from . import common


def parse_feed(org: str, content: bytes, lookback_days: int,
               now_ts: float, title_filter: str = None) -> list:
    """Pure parse: signals for release-shaped items inside the lookback."""
    feed = feedparser.parse(content)
    signals = []
    horizon = now_ts - lookback_days * 86400
    for item in feed.entries:
        parsed = item.get("published_parsed") or item.get("updated_parsed")
        # feedparser structs are UTC; timegm keeps them UTC (invariant 9).
        if parsed and calendar.timegm(parsed) < horizon:
            continue
        title = item.get("title", "")
        if title_filter and not re.search(title_filter, title):
            continue
        if not common.looks_like_release(title):
            continue
        date_hint = time.strftime("%Y-%m-%d", parsed) if parsed else None
        signals.append(common.signal(
            "rss", org, common.model_hint_from(title),
            url=item.get("link"), date_hint=date_hint, title=title))
    return signals


def detect(org: str, news_cfg: dict, lookback_days: int, now_ts: float) -> list:
    status, content = common.fetch(news_cfg["url"])
    if status != 200:
        raise RuntimeError(f"rss {org}: HTTP {status} from {news_cfg['url']}")
    return parse_feed(org, content, lookback_days, now_ts,
                      title_filter=news_cfg.get("title_filter"))
