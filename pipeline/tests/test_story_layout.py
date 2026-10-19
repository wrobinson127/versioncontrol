"""Story layout guards.

The story ships as generated HTML (pipeline/build_story.py) with the step
texts, the findings, their figures and the text version already in the page,
and one canvas that site/js/story.js draws on top. These tests read the
generated story.html, the stylesheet and the script, and fail if the page
stops reading without script, if a finding's figure draws outside its own
frame, if a pair loses either of its settings, if the chart loses its
keyboard path, or if chart labels drop below a readable size.
"""
import gzip
import json
import pathlib
import re
from collections import defaultdict
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[2]
STORY = (ROOT / "site" / "story.html").read_text(encoding="utf-8")
CSS = (ROOT / "site" / "css" / "site.css").read_text(encoding="utf-8")
JS = (ROOT / "site" / "js" / "story.js").read_text(encoding="utf-8")


class _Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []; self.attrs = []; self.texts = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag); self.attrs.append(dict(attrs))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if data.strip():
            self.texts.append(data.strip())


def _parse(fragment):
    t = _Tree(); t.feed(fragment); return t


def _record_pairs():
    """Lab-reported and independent scores on one release and benchmark,
    counted from the published entries (the story must show every one)."""
    manifest = json.loads((ROOT / "data" / "manifest.json").read_text(encoding="utf-8"))
    n = 0
    for f in manifest["files"]:
        for e in json.loads(gzip.decompress((ROOT / f).read_bytes())):
            if e["entry_type"] != "release":
                continue
            by = defaultdict(set)
            for b in e.get("benchmarks", []):
                by[b["benchmark"]].add(b["provenance"]["source_class"])
            n += sum(1 for s in by.values() if {"LAB_REPORTED", "INDEPENDENT"} <= s)
    return n


def test_hero_title_is_one_sentence_with_the_count_beneath():
    m = re.search(r'<h1 class="hero-head"[^>]*>(.*?)</h1>\s*<p class="hero-count">(.*?)</p>', STORY)
    assert m, "hero title and count line"
    assert m.group(1) == "A public registry of AI model releases."
    assert m.group(2).startswith("From ")
    assert "hero-scroll" not in STORY and "@keyframes bob" not in STORY


def test_headings_do_not_skip_a_level():
    levels = [int(h) for h in re.findall(r"<h([1-6])[ >]", STORY)]
    assert levels and levels[0] == 1 and levels.count(1) == 1
    for a, b in zip(levels, levels[1:]):
        assert b <= a + 1, levels


def test_five_steps_in_order_each_with_a_heading_and_text():
    steps = re.findall(r'<article class="step" data-step="(\d)" aria-labelledby="s(\d)h"><h2 id="s\d+h">([^<]+)</h2><div class="sb">(.*?)</div></article>', STORY, re.S)
    assert [int(s[0]) for s in steps] == [1, 2, 3, 4, 5]
    for n, ref, title, body in steps:
        assert n == ref and title.strip()
        assert len(re.sub(r"<[^>]+>", "", body)) > 120, f"step {n} has too little text to read without the chart"


def test_the_page_reads_without_script():
    # the chart is script-only and stays out of the no-script page
    assert re.search(r"\.graphic \{ display: none;", CSS)
    assert re.search(r"\.story-js \.graphic \{ display: block; \}", CSS)
    assert 'classList.add("story-js")' in JS
    # the keyboard target is hidden until the script has drawn something to explore
    assert re.search(r'<div class="hit"[^>]*\shidden>', STORY)
    # the text version ships open; the script folds it
    assert '<details class="textver" id="text-version" open>' in STORY
    assert "tv.open = false" in JS


def test_text_version_holds_every_view_in_words():
    seg = STORY[STORY.index('<section class="nfallback"'):]
    seg = seg[:seg.index("</section>")]
    heads = re.findall(r'<div class="nfb"><h3>(.*?)</h3><p>(.+?)</p></div>', seg)
    titles = [h for h, _ in heads]
    # four years of releases, four labs' waits, four years of scores, four
    # labs' climbs, a second benchmark, the pairs, two disclosure notes, the close
    assert len([t for t in titles if re.match(r"\d{4} &#183; \d+ (releases|so far)$", t)]) == 4
    assert len([t for t in titles if t.endswith("the wait between releases")]) == 4
    assert len([t for t in titles if t.endswith("the independent climb")]) == 4
    assert "A second benchmark" in titles
    assert "What the lab said, beside what Epoch measured" in titles
    assert any(t.startswith("What changed, ") for t in titles)
    assert all(b.strip() for _, b in heads)


def test_every_pair_shows_both_settings():
    seg = STORY[STORY.index("The numbers, with settings as written"):]
    seg = seg[:seg.index("</table>")]
    rows = re.findall(r"<tr><th scope=\"row\">.*?</tr>", seg, re.S)
    n = _record_pairs()
    assert n and len(rows) == n, (len(rows), n)
    for r in rows:
        cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", r)
        assert len(cells) == 6 and cells[4].strip() and cells[5].strip(), cells
    # the chart's pair rows print both settings too
    assert '"Lab: " + p.labSet.words + ". Epoch: " + p.indSet.words + "."' in JS


def test_finding_figures_stay_inside_their_frames():
    figs = re.findall(r'<svg class="fig-svg" viewBox="0 0 ([\d.]+) ([\d.]+)" role="img" aria-label="([^"]+)">(.*?)</svg>', STORY, re.S)
    assert len(figs) == 4, "one figure per finding"
    for w, h, label, inner in figs:
        w, h = float(w), float(h)
        assert len(label) > 40, "each figure names its numbers"
        t = _parse(inner)
        for tag, a in zip(t.tags, t.attrs):
            if tag == "circle":
                assert 0 <= float(a["cx"]) <= w and 0 <= float(a["cy"]) <= h, a
            if tag == "rect":
                assert float(a["x"]) >= 0 and float(a["x"]) + float(a["width"]) <= w + 0.5, a
                assert float(a["y"]) >= 0 and float(a["y"]) + float(a["height"]) <= h + 0.5, a
            if tag == "text":
                assert 0 <= float(a["y"]) <= h, a


def test_the_chart_has_a_keyboard_path():
    m = re.search(r'<div class="hit"([^>]*)>', STORY)
    assert m
    attrs = m.group(1)
    assert 'tabindex="0"' in attrs and 'role="application"' in attrs
    label = re.search(r'aria-label="([^"]+)"', attrs).group(1)
    assert "arrow keys" in label and "Enter" in label
    for key in ("ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"):
        assert key in JS, key
    assert 'id="live"' in STORY and 'aria-live="polite"' in STORY


def test_reduced_motion_snaps_between_finished_views():
    assert "var reduce = CR.reducedMotion();" in JS
    assert "reduce ? (prog[k] >= 0.5 ? 1 : 0) : prog[k]" in JS
    assert "if (reduce) { P = Pt; }" in JS


def test_libraries_are_pinned_with_integrity():
    scripts = re.findall(r'<script src="(https://[^"]+)"([^>]*)>', STORY)
    assert scripts
    for src, rest in scripts:
        assert src.startswith("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/"), src
        assert 'integrity="sha512-' in rest and 'crossorigin="anonymous"' in rest, src


def test_no_crossing_label():
    assert "the lines cross" not in STORY
    assert "clcross" not in STORY


def test_closing_links_name_their_destination():
    assert ">Read more<" not in STORY
    doors = re.findall(r'<a class="enddoor" href="([^"]+)"><b>([^<]+)</b>', STORY)
    assert [d[0] for d in doors] == ["explorer.html", "methodology.html", "about.html", "data.html"]


def test_canvas_labels_are_floored():
    for cls in ["ax-t", "row-l", "c-h", "c-b", "hd-t", "hd-s"]:
        rule = re.search(r"\.ov \." + cls + r" \{([^}]*)\}", CSS)
        assert rule, cls
        size = re.search(r"(\d+(?:\.\d+)?)px", rule.group(1))
        assert size and float(size.group(1)) >= 11, (cls, rule.group(1))
    for cls in ["f-ax", "f-lab", "f-name", "f-v"]:
        rule = re.search(r"\.fig-svg \." + cls + r" \{([^}]*)\}", CSS)
        assert rule and float(re.search(r"(\d+(?:\.\d+)?)px", rule.group(1)).group(1)) >= 11, cls
