"""Story layout guards (Phase 5, phone and keyboard).

The story canvas ships in two geometries: the wide one in the page and a
narrow one in a <template> that the page swaps in on small screens by pairing
elements one to one. These tests read the generated story.html and fail if
the two drift apart, if a divergence marker leaves the chart, or if the
fixes from the visual audit (F6 to F8, W7 to W10, W18) regress.
"""
import json
import pathlib
import re
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[2]
STORY = (ROOT / "site" / "story.html").read_text(encoding="utf-8")


class _Tree(HTMLParser):
    """Collects the tag sequence under the first <svg> it is pointed at."""

    VOID = {"rect", "circle", "line", "path", "polyline"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0; self.tags = []; self.attrs = []; self.texts = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag); self.attrs.append(dict(attrs))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if data.strip():
            self.texts.append(data.strip())


def _svg(markup_start):
    i = STORY.index("<svg", STORY.index(markup_start))
    j = STORY.index("</svg>", i)
    t = _Tree(); t.feed(STORY[i:j]); return t


def _without_marks_and_tspans(t):
    out = []
    for tag, a in zip(t.tags, t.attrs):
        if tag == "tspan":
            continue
        if tag == "rect" and "rmk" in a.get("class", ""):
            continue
        out.append((tag, a.get("class")))
    return out


def test_narrow_canvas_pairs_with_wide_element_for_element():
    wide = _svg('<svg class="canvas" id="canvas"')
    narrow = _svg('<template id="canvasN"><svg')
    assert _without_marks_and_tspans(wide)[1:] == _without_marks_and_tspans(narrow)[1:]


def test_every_mark_has_a_narrow_position():
    n_marks = STORY.count('<rect class="rmk"')
    mkn = json.loads(re.search(r"MKN=(\[\[.*?\]\]),", STORY).group(1))
    attrs = json.loads(re.search(r"MKATTRS=(\[.*?\]),", STORY).group(1))
    assert n_marks == len(mkn) > 0
    assert all(len(row) == len(attrs) for row in mkn)


def _viewbox(svg_attrs):
    return [float(v) for v in svg_attrs["viewbox"].split()]


def test_divergence_markers_stay_on_the_chart():
    for start in ('<svg class="canvas" id="canvas"', '<template id="canvasN"><svg'):
        t = _svg(start)
        _, _, w, h = _viewbox(t.attrs[0])
        rings = [a for tag, a in zip(t.tags, t.attrs) if tag == "circle" and a.get("class") in ("dlab", "dind")]
        assert rings, start
        for a in rings:
            assert 0 <= float(a["cx"]) <= w and 0 <= float(a["cy"]) <= h, (start, a)


def test_every_pair_shows_both_settings():
    t = _svg('<svg class="canvas" id="canvas"')
    n_pairs = sum(1 for tag, a in zip(t.tags, t.attrs) if tag == "g" and a.get("class") == "dpair")
    labs = [x for x in t.texts if x.startswith("lab: ")]
    epochs = [x for x in t.texts if x.startswith("Epoch: ")]
    assert n_pairs and len(labs) == len(epochs) == n_pairs


def test_no_crossing_label():
    assert "the lines cross" not in STORY
    assert "clcross" not in STORY


def test_hero_title_is_one_sentence_with_the_count_beneath():
    m = re.search(r'<h1 class="hero-head">(.*?)</h1>\s*<p class="hero-count">(.*?)</p>', STORY)
    assert m, "hero title and count line"
    assert m.group(1) == "A public registry of AI model releases."
    assert m.group(2).startswith("From ")
    assert "hero-scroll" not in STORY and "@keyframes bob" not in STORY


def test_headings_do_not_skip_a_level():
    levels = [int(h) for h in re.findall(r"<h([1-6])[ >]", STORY)]
    assert levels and levels[0] == 1
    for a, b in zip(levels, levels[1:]):
        assert b <= a + 1, levels


def test_hints_name_an_action_every_input_can_take():
    assert "hover any" not in STORY and '"h": "hover' not in STORY
    assert 'id="hint">select any mark for its record' in STORY
    assert 'tabindex="0"' in STORY.split('<svg class="canvas"', 1)[1].split(">", 1)[0]


def test_closing_links_name_their_destination():
    assert ">Read more<" not in STORY


def test_canvas_labels_are_floored():
    css = STORY.split("<style>", 1)[1].split("</style>", 1)[0]
    for cls in ["orglab", "scoreax", "provlab", "pbench", "pgap", "dgax", "pcfg"]:
        rule = re.search(r"\." + cls + r"\{([^}]*)\}", css)
        assert rule and "var(--u" in rule.group(1), cls
