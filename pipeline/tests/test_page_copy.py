"""Page-copy guard (2026-10-19 audit, method_copy 2.1, 2.2 and 2B).

The entry lint never ran on the site's own pages, so dash substitutes and
internal jargon reached readers. These tests read the shipped pages and
scripts the way a reader meets them and fail on any em dash, typewriter
dash (" -- "), en dash, or a word the audit retired. The methodology tables
must quote the content files they render, word for word.
"""
import html
import json
import pathlib
import re

from pipeline import lint_voice

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
PAGES = sorted(SITE.glob("*.html"))
SCRIPTS = sorted((SITE / "js").glob("*.js"))


SEEDED = [
    ("The model shipped — a large one.", "em-dash"),
    ("The model shipped -- a large one.", "em-dash"),
    ("Scores run 0–100.", "en-dash"),
    ("GPQA Diamond, 0&#8211;100", "en-dash"),
    ("A pause&mdash;then the release.", "em-dash"),
    ("Awaiting the registrar's approval.", "jargon"),
    ("Skip to the end state", "jargon"),
    ("One transforming canvas of every release.", "jargon"),
    ("The frontier reaches 93.", "jargon"),
]

CLEAN = [
    "GPQA Diamond, 0 to 100",
    "Run it with --check to compare.",
    "Released 2026-10-12, retrieved 2026-10-19.",
    "Every number shows where it came from, or it is left out.",
    "Pricing is not shown; the catalog is used only to spot new models.",
]


def test_page_lint_catches_seeded_violations():
    for text, cat in SEEDED:
        cats = {v["category"] for v in lint_voice.lint_page_copy(text)}
        assert cat in cats, f"page lint missed {text!r} (got {cats})"


def test_page_lint_passes_clean_copy():
    for text in CLEAN:
        assert lint_voice.lint_page_copy(text) == [], text


def test_page_strings_reads_text_attributes_and_script_literals():
    page = ('<html><head><meta name="description" content="A — B">'
            '<style>.x{content:"—"}</style></head><body>'
            '<p title="registrar">Hello</p><!-- the frontier -->'
            '<script>// end state\nvar n={"b":"0–100"};</script></body></html>')
    strings = lint_voice.page_strings(page)
    joined = " | ".join(strings)
    assert "A — B" in joined
    assert "registrar" in joined
    assert "0–100" in joined
    # styles and comments are not reader-visible
    assert "frontier" not in joined
    assert "end state" not in joined


def test_every_page_and_script_has_clean_copy():
    """Covers the generated story.html too: build_story --check keeps it
    equal to a fresh build, so a clean file means a clean generator."""
    problems = []
    for p in PAGES:
        for s in lint_voice.page_strings(p.read_text(encoding="utf-8")):
            for v in lint_voice.lint_page_copy(s, context=p.name):
                problems.append(f"{p.name}: {v['category']} {v['match']!r} in {s[:80]!r}")
    for p in SCRIPTS:
        for s in lint_voice.js_strings(p.read_text(encoding="utf-8")):
            for v in lint_voice.lint_page_copy(s, context=p.name):
                problems.append(f"{p.name}: {v['category']} {v['match']!r} in {s[:80]!r}")
    assert not problems, "\n".join(problems)


def test_story_ships_without_comments():
    story = (SITE / "story.html").read_text(encoding="utf-8")
    assert "<!--" not in story
    assert "/*" not in story
    script = "\n".join(re.findall(r"<script>(.*?)</script>", story, flags=re.S))
    assert lint_voice.strip_js_comments(script) == script, "a JS comment ships in story.html"


def _md_table(path):
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("|") and not line.startswith("|---"):
            rows.append([c.strip() for c in line.strip().strip("|").split("|")])
    return rows[1:]


def test_methodology_quotes_the_content_tables_exactly():
    page = html.unescape((SITE / "methodology.html").read_text(encoding="utf-8"))
    missing = []
    for name in ("scope_rulings.md", "registry_log.md"):
        for row in _md_table(ROOT / "content" / name):
            for cell in row:
                if f"<td>{cell}</td>" not in page:
                    missing.append(f"{name}: {cell[:70]}")
    for x in json.loads((ROOT / "content" / "scope_exclusions.json").read_text(encoding="utf-8")):
        for key in ("model_name", "reason", "ruled_on", "source_url"):
            if x[key] not in page:
                missing.append(f"scope_exclusions.json {x['id']}: {key}")
    assert not missing, "methodology.html no longer quotes:\n" + "\n".join(missing)


def test_every_page_links_error_reports():
    url = "https://github.com/wrobinson127/versioncontrol/issues/new"
    for p in PAGES:
        assert url in p.read_text(encoding="utf-8"), f"{p.name} has no Report an error link"
