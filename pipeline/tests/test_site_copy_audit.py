"""a design review of the Control Room site (2026-10-19), held in place.

The copy audit removed framing phrases and sentences that restate a chart;
these tests fail if one comes back. They also hold the decisions that came
with it: the overview's fourth measure is the open-weights share (the
newest release is the feed's job), a revision is glossed where it first
appears, the two kinds of absence read "not disclosed (we checked)" and
"not yet checked", the explorer explains a missing change in one line, the
prehistory note is gone, and every required disclosure survives the cuts.
"""
import pathlib
import re

from pipeline import lint_voice

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
PAGES = {p.name: p.read_text(encoding="utf-8") for p in sorted(SITE.glob("*.html"))}
JS = {p.name: p.read_text(encoding="utf-8") for p in sorted((SITE / "js").glob("*.js"))}

FRAMING = [
    "What the record shows, in", "in four findings", "The record, in two lines", "Here is what", "Here's what",
    "It turns out", "Other trackers list releases", "Three things here are different", "The reason it exists",
    "Before this record begins", "It tracks releases of AI models.",
]


def _visible_strings():
    for name, text in PAGES.items():
        for s in lint_voice.page_strings(text):
            yield name, s
    for name, text in JS.items():
        for s in lint_voice.js_strings(text):
            yield name, s


def test_no_framing_phrases_anywhere():
    hits = [f"{n}: {f!r} in {s[:70]!r}" for n, s in _visible_strings() for f in FRAMING if f.lower() in s.lower()]
    assert not hits, "\n".join(hits)


def test_prehistory_note_is_gone():
    assert "prehistory" not in PAGES["index.html"]
    assert not (ROOT / "content" / "prehistory.md").exists()
    assert ".prehistory" not in (SITE / "css" / "site.css").read_text(encoding="utf-8")


def test_overview_measures_open_weights_not_the_newest_release():
    ov = JS["overview.js"]
    assert '"Newest release' not in ov and "Newest release" not in PAGES["index.html"]
    assert 'kpi("k4", "Open-weights share of releases, "' in ov
    assert 'e.availability_class === "open_weights"' in ov and "sparkLine(owPts" in ov
    # the feed keeps every entry and names what a revision revises
    assert '"Newest on record"' in ov
    assert """'">revision of ' + esc(D.byId[e.predecessor].model_name)""" in ov


def test_a_revision_is_glossed_where_it_first_appears():
    gloss = "an update to a model already on record"
    assert "revision only (" + gloss + ")" in JS["overview.js"]
    assert '["revision", "Revision (' + gloss + ')"]' in JS["explorer.js"]
    assert "revisions (updates to a model already on record)" in JS["explorer.js"]
    assert "Revisions, updates to a model already on record," in PAGES["story.html"]
    assert 'REVISION_GLOSS = "Revision: ' + gloss + '."' in JS["app.js"]
    assert "revision of " in JS["app.js"]


def test_absence_reads_the_same_everywhere():
    app = JS["app.js"]
    assert 'not_disclosed: "not disclosed (we checked)"' in app
    assert 'not_researched: "not yet checked"' in app
    # one paragraph explains the difference, on the methodology page only
    explain = re.compile(r"a fact about the lab", re.I)
    for name, s in _visible_strings():
        if explain.search(s):
            assert name == "methodology.html", name
    assert explain.search(PAGES["methodology.html"])


def test_explorer_explains_a_missing_change_in_one_line():
    ex = JS["explorer.js"]
    assert "No change shown: the predecessor's score is from a different source or test version." in ex
    assert "Reason on record" not in ex and "No comparable measurement" not in ex


def test_required_disclosures_survive_the_cuts():
    m = PAGES["methodology.html"]
    for must in ('id="who-decides"', "Claude Haiku", "Walker Robinson approved", 'id="corrections"', 'id="limits"',
                 "https://epoch.ai/data/ai-models", "https://epoch.ai/benchmarks", "CC-BY 4.0",
                 "the record cannot support a comparison between countries"):
        assert must in m, must
    d = PAGES["data.html"]
    for must in ("https://creativecommons.org/licenses/by/4.0/", "https://epoch.ai/data/ai-models", "https://epoch.ai/benchmarks"):
        assert must in d, must
    a = PAGES["about.html"]
    assert "methodology.html#who-decides" in a and "issues/new" in a
    assert "issues/new" in PAGES["changes.html"]
    # stale references to the retired timeline cards are gone
    for name in ("methodology.html", "data.html"):
        assert "timeline" not in PAGES[name], name


def test_not_yet_checked_shows_only_where_the_view_holds_one():
    """With the disclosure research done (5 of 1,408 cells unchecked), the
    "not yet checked" legend item and counts appear only when the releases
    in view contain one; no page carries a paragraph explaining it."""
    assert 'var nr = marks.some(function (m) { return m.t === "d" && m.cell === "not_researched"; });' in JS["story.js"]
    assert "function discLegend(list)" in JS["overview.js"] and 'concat(nr ? ["not_researched"] : [])' in JS["overview.js"]
    assert 'c.not_researched ? c.not_researched + " not yet checked" : ""' in JS["overview.js"]
    assert '["disclosed", "not_disclosed"].concat(rows.some(' in JS["explorer.js"]
    assert '(sc.not_researched ? "<li>"' in JS["doc.js"]
    for name, s in _visible_strings():
        assert "so it can move as we check more" not in s, name


def test_the_lean_caveat_needs_a_material_lean():
    """The caveat that checked releases lean toward the newest ones is said
    only when a material part of the year is unchecked; the merged record
    no longer supports it, so the story does not say it."""
    src = (ROOT / "pipeline" / "build_story.py").read_text(encoding="utf-8")
    assert "material = len(res) < 0.9 * len(ys) and k / len(res) - m / len(ys) >= 0.1" in src
    assert "res.length < 0.9 * ys.length && k / res.length - m / ys.length >= 0.1" in JS["overview.js"]
    assert "a period holding" not in PAGES["story.html"]
