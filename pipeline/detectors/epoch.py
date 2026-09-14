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


def in_scope_domain(domain: str) -> bool:
    """The domain half of the scope rule, applied where candidates are proposed.

    backfill.py applies this same test when building the record, but the
    detector did not, so every Video, Vision, or forecasting row from a
    registry org was eligible to become a candidate on any night it was
    touched. Veo, Sora, and Imagen are all registry-org rows; they stayed out
    of the queue only because they sat outside the recency window, and the
    next release in any of those lines would have come straight through. That
    is the Nova loop: rejected by hand, re-proposed forever.

    A blank domain still passes. An absent field is not evidence about the
    model, so it reaches a human rather than being silently dropped; that is
    the rule the o3-pro entry rests on.
    """
    dom = (domain or "").strip().lower()
    if not dom:
        return True
    return "language" in dom or "multimodal" in dom


def in_scope_row(r: dict) -> bool:
    """The whole scope rule, applied where candidates are proposed.

    Three tests, each mirroring backfill.py, each passing a blank field
    through to a human:

    - domain: language or multimodal (see in_scope_domain).
    - date: on or after the record's start. A row published before
      2022-11-30 cannot be a release the record covers, whatever its
      Last-modified says. Rows from 2016 (BIG LSTM+CNN), 2020 (GShard) and
      2022-11-28 (davinci-003) were all proposed on the 2026-09 nights
      because Epoch had touched them recently.
    - accessibility: a value the record can map (open weights, public API,
      or hosted service). "Unreleased" is a positive statement that the
      model is not publicly usable, and it fails the test; Claude Mythos 5,
      Mythos Preview and Llama 4 Behemoth (preview) all carry it and were
      all proposed anyway.

    Five of the 33 candidates queued between 2026-09-02 and 2026-09-11 would
    have been stopped here.
    """
    from ..backfill import ACCESSIBILITY_MAP  # local: backfill is heavy
    if not in_scope_domain(r.get("Domain")):
        return False
    published = (r.get("Publication date") or "").strip()
    if published and published < config.BACKFILL_START:
        return False
    access = (r.get("Model accessibility") or "").strip()
    if access and access not in ACCESSIBILITY_MAP:
        return False
    return True


def parse_csv(csv_text: str, lookback_days: int, now_date: str) -> list:
    reader = csv.reader(io.StringIO(csv_text))
    check_schema(next(reader))
    rows = csv.DictReader(io.StringIO(csv_text))
    from .hf_orgs import _shift_date
    horizon = _shift_date(now_date, -lookback_days)
    signals = []
    # Rows belonging to a registry org are what this detector actually
    # examines; the rest of Epoch's catalog is out of scope, so counting it
    # would make a quiet night look busy.
    examined = 0
    name_to_org = {}
    for key, org in config.REGISTRY.items():
        for n in org["epoch_names"]:
            name_to_org[n] = key
    for r in rows:
        org = name_to_org.get((r["Organization"] or "").split(",")[0].strip())
        if org is None:
            continue
        examined += 1
        if not in_scope_row(r):
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
    return common.SignalList(signals, examined=examined)


def detect(lookback_days: int, now_date: str) -> list:
    status, content = common.fetch(config.EPOCH_CSV_URL)
    if status != 200:
        raise RuntimeError(f"epoch: HTTP {status}")
    return parse_csv(content.decode("utf-8-sig"), lookback_days, now_date)
