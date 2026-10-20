"""One gap rule on every page.

A pooled gap counts only between two releases in the same calendar year.
The overview computes its median in the browser (site/js/app.js
`pooledGaps` and `median`); the story prints its per-year median from
pipeline/build_story.py. These tests run the overview's own functions in
Node over the published entries and fail if the story's text version gives
a different median for any year, or if the overview's figure for the
current year differs from the derived tile.
"""
import gzip
import json
import pathlib
import re
import shutil
import subprocess
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[2]
APP_JS = (ROOT / "site" / "js" / "app.js").read_text(encoding="utf-8")
STORY = (ROOT / "site" / "story.html").read_text(encoding="utf-8")


def _js_function(name):
    """The source of one named function in app.js, by brace matching."""
    start = APP_JS.index(f"function {name}(")
    depth = 0
    for i in range(APP_JS.index("{", start), len(APP_JS)):
        depth += {"{": 1, "}": -1}.get(APP_JS[i], 0)
        if depth == 0:
            return APP_JS[start:i + 1]
    raise AssertionError(f"unbalanced braces in {name}")


def _releases():
    manifest = json.loads((ROOT / "data" / "manifest.json").read_text(encoding="utf-8"))
    out = []
    for f in manifest["files"]:
        if not f.startswith("data/entries/"):
            continue
        for e in json.loads(gzip.decompress((ROOT / f).read_bytes())):
            out.append({"_rel": e["entry_type"] == "release",
                        "_day": date.fromisoformat(e["date"]).toordinal(),
                        "_year": e["date"][:4]})
    return out


def _overview_medians(years):
    node = shutil.which("node")
    assert node, "Node is needed to run the overview's own gap functions"
    script = (_js_function("median") + "\n" + _js_function("pooledGaps") + "\n"
              "var list = JSON.parse(require('fs').readFileSync(0, 'utf8'));\n"
              "var out = {};\n"
              + "".join(f"out['{y}'] = median(pooledGaps(list.filter(function (e) {{ return e._year === '{y}'; }})));\n"
                        for y in years)
              + "process.stdout.write(JSON.stringify(out));\n")
    r = subprocess.run([node, "-e", script], input=json.dumps(_releases()),
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def _story_medians():
    """Year -> the median printed in the story's text version."""
    found = {}
    for y, body in re.findall(r"<h3>(\d{4}) &#183; [^<]*</h3><p>(.*?)</p>", STORY):
        m = re.search(r"Median time between one release and the next: ([\d.]+) days", body)
        if m:
            found[y] = float(m.group(1))
    return found


def test_story_and_overview_agree_on_2023_and_2026():
    story = _story_medians()
    overview = _overview_medians(["2023", "2026"])
    for y in ("2023", "2026"):
        assert y in story, f"the story's text version gives no median for {y}"
        assert overview[y] == story[y], f"{y}: overview {overview[y]}, story {story[y]}"


def test_story_and_overview_agree_on_every_year():
    story = _story_medians()
    overview = _overview_medians(sorted(story))
    assert {y: overview[y] for y in story} == story


def test_overview_current_year_matches_the_derived_tile():
    views = json.loads(gzip.decompress((ROOT / "data" / "derived" / "views.json.gz").read_bytes()))
    year = json.loads((ROOT / "data" / "derived" / "site_meta.json").read_text(encoding="utf-8"))["last_successful_update"][:4]
    assert _overview_medians([year])[year] == views["tiles"]["median_gap_days_this_year"]
