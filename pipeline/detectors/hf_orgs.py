"""Hugging Face detector: org-scoped only (never the firehose).

New repos under a registry org's first-party handle inside the lookback
window are open-weights release signals. Sibling repos (FP8, Base, size
ladders) are one release; the correlator clusters them.

"New" means newly public, which createdAt does not measure: a repo created
private and opened weeks later has an old createdAt on the day it ships.
google/embeddinggemma-2 was created 2026-09-14 and made public 2026-10-06; a
createdAt filter with a 14-day lookback skipped it (audit F2). The window is
therefore applied to lastModified, which moves when a repo is opened, with
createdAt bounded by PRIVATE_GRACE_DAYS so a README edit to a years-old repo
is not mistaken for a release.
"""
import re

import requests

from . import common
from .. import config

# How long a repo may sit private before it is opened and still be treated as
# a release. EmbeddingGemma 2 sat 22 days; 90 leaves room without letting old
# repos back in on every touch.
PRIVATE_GRACE_DAYS = 90


def parse_listing(org: str, models: list, lookback_days: int,
                  now_date: str, name_filter: str = None) -> list:
    signals = []
    horizon = _shift_date(now_date, -lookback_days)
    created_floor = _shift_date(now_date,
                                -max(lookback_days, PRIVATE_GRACE_DAYS))
    name_rx = re.compile(name_filter, re.IGNORECASE) if name_filter else None
    for m in models:
        created = (m.get("createdAt") or "")[:10]
        # A listing fetched without lastModified (older captures) falls back
        # to createdAt, which is the old rule exactly.
        touched = (m.get("lastModified") or "")[:10] or created
        if not created or not touched or touched < horizon:
            continue
        if created < created_floor:
            continue
        repo = m.get("id", "")
        name = repo.split("/", 1)[-1]
        if name_rx and not name_rx.search(name):
            continue
        # Created inside the window: createdAt is the public date. Created
        # earlier: the repo was opened later, and lastModified is the nearest
        # date the listing offers to that opening.
        date_hint = created if created >= horizon else touched
        signals.append(common.signal(
            "hf_orgs", org, name,
            url=f"https://huggingface.co/{repo}",
            date_hint=date_hint, title=repo))
    return common.SignalList(signals, examined=len(models))


def _shift_date(date_str: str, days: int) -> str:
    import datetime
    d = datetime.date.fromisoformat(date_str) + datetime.timedelta(days=days)
    return d.isoformat()


def detect(org: str, handles: list, lookback_days: int, now_date: str,
           name_filter: str = None) -> list:
    signals = []
    examined = 0
    for handle in handles:
        # Both orders: newest-created catches a repo public from birth even
        # when a busy org has touched thirty older repos since; newest-
        # modified catches one opened late. Merged by id.
        listing, seen = [], set()
        for sort in ("createdAt", "lastModified"):
            # expand[] limits the response to the named fields (plus id), and
            # is the only way the listing returns lastModified. Checked
            # 2026-10-19 against the live API.
            r = requests.get(
                config.HF_API_URL,
                params=[("author", handle), ("sort", sort),
                        ("direction", "-1"),
                        ("limit", str(config.HF_RECENT_LIMIT)),
                        ("expand[]", "createdAt"),
                        ("expand[]", "lastModified")],
                timeout=config.FETCH_TIMEOUT_SECONDS,
                headers={"User-Agent": config.USER_AGENT})
            if r.status_code != 200:
                raise RuntimeError(
                    f"hf_orgs {org}/{handle}: HTTP {r.status_code}")
            for m in r.json():
                if m.get("id") not in seen:
                    seen.add(m.get("id"))
                    listing.append(m)
        examined += len(listing)
        signals.extend(parse_listing(org, listing, lookback_days, now_date,
                                     name_filter=name_filter))
    return common.SignalList(signals, examined=examined)
