"""The site carries small copies of registry facts in app.js (display names,
countries). These tests hold them to pipeline/config.py so they cannot
drift."""
import os
import re

from pipeline import config

APP_JS = os.path.join(os.path.dirname(__file__), "..", "..", "site", "js", "app.js")


def _js_map(name):
    src = open(APP_JS, encoding="utf-8").read()
    body = re.search(r"var " + name + r" = \{(.*?)\};", src, re.S).group(1)
    return dict(re.findall(r'"([^"]+)":\s*"([^"]+)"', body))


def test_site_countries_match_the_registry():
    assert _js_map("ORG_COUNTRY") == {k: v["country"] for k, v in config.REGISTRY.items()}


def test_site_org_names_cover_the_registry():
    assert set(_js_map("ORG_NAMES")) == set(config.REGISTRY)
