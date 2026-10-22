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
                     "index.html", "methodology.html", "overview.html", "story.html"]


def test_every_page_carries_the_shared_shell():
    for name in PAGES:
        html = (SITE / name).read_text(encoding="utf-8")
        b = _base(name)
        assert site_shell.topbar(name, b) in html, f"{name}: top bar drifted from site_shell"
        assert site_shell.footer(b) in html, f"{name}: footer drifted from site_shell"
        assert site_shell.tabbar(name, b) in html, f"{name}: tab bar drifted from site_shell"
        assert site_shell.BOOT in html, name
        assert f'<script src="{b}js/app.js"></script>' in html, f"{name}: the core is not loaded"


def test_theme_follows_the_system_until_the_reader_chooses():
    boot = site_shell.BOOT
    assert boot.index('localStorage.getItem("vc-theme")') < boot.index("prefers-color-scheme: light")
    assert 'if(t!=="light"&&t!=="dark")' in boot
    app = (SITE / "js" / "app.js").read_text(encoding="utf-8")
    assert "setTheme(getTheme(), false);" in app
    assert "if (!savedTheme())" in app


def test_overview_byline_sits_beside_the_update_stamp():
    html = (SITE / "overview.html").read_text(encoding="utf-8")
    stamp = html[html.index('<div class="stamp">'):]
    stamp = stamp[:stamp.index("</div>")]
    assert 'id="fresh"' in stamp
    assert 'Built by <a href="https://walker-robinson.com">Walker Robinson</a>' in stamp


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


def test_old_overview_links_open_the_overview():
    """The overview moved from / to overview.html; a filtered link shared
    before the move (/?labs=...&from=...) still opens it, filters intact."""
    index = (SITE / "index.html").read_text(encoding="utf-8")
    assert site_shell.HOME_REDIRECT in index
    assert 'location.replace("overview.html"+location.search+location.hash)' in site_shell.HOME_REDIRECT
    ov = (SITE / "js" / "overview.js").read_text(encoding="utf-8")
    for k in ("from", "to", "labs", "country", "bench"):
        assert f'"{k}"' in site_shell.HOME_REDIRECT and f'p.get("{k}")' in ov, k
