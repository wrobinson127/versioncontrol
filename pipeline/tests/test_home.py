"""The home page counts its figures from the record when it loads.

The release count, the monthly pulse and the three findings are filled by
site/js/home.js from the published files, so the page itself carries no
typed-in count that could drift from the data.
"""
import pathlib
import re

SITE = pathlib.Path(__file__).resolve().parents[2] / "site"
HTML = (SITE / "index.html").read_text(encoding="utf-8")
JS = (SITE / "js" / "home.js").read_text(encoding="utf-8")


def _el(id_):
    m = re.search(r'<(\w+)[^>]*id="' + id_ + r'"[^>]*>(.*?)</\1>', HTML, re.S)
    assert m, id_
    return m.group(2)


def test_home_loads_its_script():
    assert '<script src="js/home.js"></script>' in HTML


def test_no_count_is_typed_into_the_page():
    for id_ in ("hm-n", "hm-bars", "hm-first", "hm-last"):
        assert not re.search(r"\d", re.sub(r"<[^>]+>", "", _el(id_))), id_
    for id_ in ("t-pace", "t-card", "t-pair"):
        num = re.search(r'<span class="hm-tn num">(.*?)</span></span>', _el(id_), re.S).group(1)
        assert not re.search(r"\d", re.sub(r"<[^>]+>", "", num)), id_


def test_the_findings_are_counted_from_the_record():
    assert "CR.load()" in JS
    assert 'CR.discCounts(rel, "system_card")' in JS  # shares divide by checked releases
    assert "CR.pairs(D)" in JS
    assert "D.views.tiles.releases_recorded" in JS
