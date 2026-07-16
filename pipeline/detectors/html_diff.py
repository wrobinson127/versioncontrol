"""HTML index detector for labs without RSS.

Extracts anchor titles and hrefs from the lab's news index and emits signals
for release-shaped items that are not yet known. "Diff" is against the
registry dataset (via correlate), not against a stored snapshot, so the
detector has no state to corrupt. A too-small page (JS shell, block page) is
a loud failure, never an empty success.
"""
import re
from html.parser import HTMLParser
from urllib.parse import urljoin

from . import common

MIN_INDEX_BYTES = 5000


class _AnchorParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anchors = []          # (href, text)
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._text = []

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            text = re.sub(r"\s+", " ", " ".join(self._text)).strip()
            if text:
                self.anchors.append((self._href, text))
            self._href = None

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)


def parse_index(org: str, content: bytes, base_url: str) -> list:
    if len(content) < MIN_INDEX_BYTES:
        raise RuntimeError(
            f"html_diff {org}: index is {len(content)} bytes, too small to be "
            f"a real news page (JS shell or block page)")
    parser = _AnchorParser()
    parser.feed(content.decode("utf-8", errors="replace"))
    signals = []
    seen = set()
    for href, text in parser.anchors:
        if not common.looks_like_release(text):
            continue
        url = urljoin(base_url, href)
        key = (url, text)
        if key in seen:
            continue
        seen.add(key)
        signals.append(common.signal(
            "html_diff", org, common.model_hint_from(text),
            url=url, title=text))
    return signals


def detect(org: str, news_cfg: dict) -> list:
    status, content = common.fetch(news_cfg["url"])
    if status != 200:
        raise RuntimeError(f"html_diff {org}: HTTP {status} from {news_cfg['url']}")
    return parse_index(org, content, news_cfg["url"])
