"""The front door (index.html): one sentence, the field, two paths, three
numbers. The numbers are counted from the record when the page loads, so the
page itself carries none of them; the two paths lead to the story and the
overview."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
HOME = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
JS = (ROOT / "site" / "js" / "home.js").read_text(encoding="utf-8")


def _main():
    return HOME[HOME.index('<main id="main"'):HOME.index("</main>")]


def test_two_paths_lead_to_the_story_and_the_overview():
    paths = re.findall(r'<a class="btn btn-primary h-path" href="([^"]+)">([^<]+)</a>', _main())
    assert paths == [("story.html", "Read the story"), ("overview.html", "Explore the record")]


def test_the_takeaways_hold_no_number_until_the_record_loads():
    takes = _main()[_main().index('class="h-takes'):]
    text = re.sub(r"<[^>]+>", "", takes)
    assert not re.search(r"\d", text), text
    assert takes.count('class="sk sk-v"') == 3


def test_the_takeaways_are_counted_from_the_record():
    assert 'CR.discCounts(D.releases, "system_card")' in JS
    assert "CR.pairs(D).filter(function (p) { return p.e._rel; })" in JS
    assert "p.lab.value > p.ind.value" in JS
    assert "D.releases.filter(" in JS


def test_the_field_respects_reduced_motion():
    assert "CR.reducedMotion()" in JS and "done = reduce" in JS


def test_the_front_door_loads_its_script():
    assert '<script src="js/home.js"></script>' in HOME
