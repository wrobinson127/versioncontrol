"""Every page carries the one shell: the same top bar, footer and phone tab
bar (pipeline/site_shell.py), so navigation cannot fork between pages, and
every page reaches every section."""
import pathlib
import re

from pipeline import site_shell

SITE = pathlib.Path(__file__).resolve().parents[2] / "site"
PAGES = sorted(p.name for p in SITE.glob("*.html"))


def _base(name):
    return "/" if name == "404.html" else ""


def test_the_pages_are_the_ones_the_site_ships():
    assert PAGES == ["404.html", "about.html", "changes.html", "data.html", "explorer.html",
                     "index.html", "methodology.html", "story.html"]


def test_every_page_carries_the_shared_shell():
    for name in PAGES:
        html = (SITE / name).read_text(encoding="utf-8")
        b = _base(name)
        assert site_shell.topbar(name, b) in html, f"{name}: top bar drifted from site_shell"
        assert site_shell.footer(b) in html, f"{name}: footer drifted from site_shell"
        assert site_shell.tabbar(name, b) in html, f"{name}: tab bar drifted from site_shell"
        assert site_shell.BOOT in html, name
        assert f'<script src="{b}js/app.js"></script>' in html, f"{name}: the core is not loaded"


def test_navigation_reaches_every_section_and_the_footer_links():
    for name in PAGES:
        html = (SITE / name).read_text(encoding="utf-8")
        b = _base(name)
        for f, _, _ in site_shell.NAV:
            assert f'href="{b}{f}"' in html, (name, f)
        for href in (f"{b}about.html", f"{b}changes.html", site_shell.REPORT_URL, site_shell.SOURCE_URL):
            assert f'href="{href}"' in html, (name, href)
        current = re.findall(r'aria-current="page"', html)
        assert len(current) == (2 if name in [f for f, _, _ in site_shell.NAV] else 0), name


def test_old_timeline_links_open_the_entry():
    index = (SITE / "index.html").read_text(encoding="utf-8")
    assert site_shell.REDIRECT in index
    assert 'location.replace("explorer.html?id="' in site_shell.REDIRECT
