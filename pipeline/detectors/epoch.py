"""Epoch trailing detector: registry-org rows added or modified recently.

Also the schema tripwire: the pinned column set is asserted on every run and
drift fails loudly (Phase 0 gate 1)."""
import csv
import io

from . import common
from .. import config


def check_schema(header: list) -> None:
    missing = [c for c in config.EPOCH_CONSUMED_COLUMNS if c not in header]
    if missing:
        raise RuntimeError(f"epoch: consumed columns missing: {missing}")
    if header != config.EPOCH_EXPECTED_COLUMNS:
        added = [c for c in header if c not in config.EPOCH_EXPECTED_COLUMNS]
        dropped = [c for c in config.EPOCH_EXPECTED_COLUMNS if c not in header]
        raise RuntimeError(
            f"epoch: schema drift from the pinned header; added={added} "
            f"dropped={dropped}; update the pin deliberately, not silently")


def parse_csv(csv_text: str, lookback_days: int, now_date: str) -> list:
    reader = csv.reader(io.StringIO(csv_text))
    check_schema(next(reader))
    rows = csv.DictReader(io.StringIO(csv_text))
    from .hf_orgs import _shift_date
    horizon = _shift_date(now_date, -lookback_days)
    signals = []
    name_to_org = {}
    for key, org in config.REGISTRY.items():
        for n in org["epoch_names"]:
            name_to_org[n] = key
    for r in rows:
        org = name_to_org.get((r["Organization"] or "").split(",")[0].strip())
        if org is None:
            continue
        modified = (r.get("Last modified") or "")[:10]
        published = (r.get("Publication date") or "").strip()
        recent = (modified and modified >= horizon) or \
                 (published and published >= horizon)
        if not recent:
            continue
        links = [u for u in (r.get("Link") or "").replace("\n", ",").split(",")
                 if u.strip().startswith("http")]
        signals.append(common.signal(
            "epoch", org, r["Model"].strip(),
            url=links[0].strip() if links else None,
            date_hint=published or None, title=r["Model"].strip()))
    return signals


def detect(lookback_days: int, now_date: str) -> list:
    status, content = common.fetch(config.EPOCH_CSV_URL)
    if status != 200:
        raise RuntimeError(f"epoch: HTTP {status}")
    return parse_csv(content.decode("utf-8-sig"), lookback_days, now_date)
