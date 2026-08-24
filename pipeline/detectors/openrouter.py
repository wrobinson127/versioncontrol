"""OpenRouter catalog tripwire (posture D4: detect and cross-check freely;
never redistribute OpenRouter data in the published dataset)."""
import datetime
import json

from . import common
from .. import config

# OpenRouter slugs map to registry orgs by their provider prefix.
PROVIDER_TO_ORG = {
    "openai": "openai",
    "anthropic": "anthropic",
    "google": "google-deepmind",
    "meta": "meta",
    "meta-llama": "meta",
    "x-ai": "xai",
    "mistral": "mistral",
    "mistralai": "mistral",
    "deepseek": "deepseek",
    "qwen": "alibaba-qwen",
    "alibaba": "alibaba-qwen",
    "moonshotai": "moonshot",
    "z-ai": "zai",
    "zhipu": "zai",
    "cohere": "cohere",
    "amazon": "amazon",
}


def parse_catalog(payload: dict, lookback_days: int, now_ts: float) -> list:
    signals = []
    catalog = payload.get("data", [])
    horizon = now_ts - lookback_days * 86400
    for m in catalog:
        created = m.get("created") or 0
        if created < horizon:
            continue
        slug = m.get("id", "")
        provider = slug.split("/", 1)[0] if "/" in slug else ""
        org = PROVIDER_TO_ORG.get(provider)
        if org is None:
            continue
        name = slug.split("/", 1)[-1]
        date_hint = datetime.datetime.fromtimestamp(
            created, tz=datetime.timezone.utc).strftime("%Y-%m-%d")
        signals.append(common.signal(
            "openrouter", org, name,
            url=f"https://openrouter.ai/{slug}",
            date_hint=date_hint, title=m.get("name", slug)))
    return common.SignalList(signals, examined=len(catalog))


def detect(lookback_days: int, now_ts: float) -> list:
    status, content = common.fetch(config.OPENROUTER_MODELS_URL)
    if status != 200:
        raise RuntimeError(f"openrouter: HTTP {status}")
    return parse_catalog(json.loads(content), lookback_days, now_ts)
