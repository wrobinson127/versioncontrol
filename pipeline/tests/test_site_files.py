"""Crawler files are generated from the published record (audit 2026-10-19,
launch W1 and W3): a hand-written sitemap had no lastmod, and there was no
llms.txt."""
import os
import xml.etree.ElementTree as ET

from pipeline import site_files

META = {"entry_count": 366, "releases": 352, "revisions": 14,
        "first_date": "2022-11-30", "last_date": "2026-10-17",
        "last_successful_update": "2026-10-19"}


def test_sitemap_is_valid_xml_with_lastmod_on_every_url():
    root = ET.fromstring(site_files.sitemap(META))
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = root.findall("s:url", ns)
    assert len(urls) == len(site_files.PAGES)
    for u in urls:
        assert u.find("s:loc", ns).text.startswith(site_files.SITE)
        assert u.find("s:lastmod", ns).text == "2026-10-19"


def test_llms_txt_states_counts_and_lists_every_data_file():
    text = site_files.llms_txt(META, ["data/entries/2026.json.gz"])
    assert "366 entries" in text and "2026-10-17" in text
    assert f"{site_files.SITE}/data/entries/2026.json.gz" in text
    assert "—" not in text and " -- " not in text


def test_every_shipped_page_is_in_the_sitemap_and_llms_txt():
    paths = {p for p, _ in site_files.PAGES}
    assert {"/", "/explorer.html", "/story.html", "/data.html", "/methodology.html",
            "/about.html", "/changes.html"} <= paths
    text = site_files.llms_txt(META, [])
    for p in paths:
        assert f"{site_files.SITE}{p} :" in text, p


def test_main_writes_both_files(tmp_path):
    site_files.main(["--out", str(tmp_path)])
    assert (tmp_path / "sitemap.xml").exists()
    assert (tmp_path / "llms.txt").exists()


def _entry(**kw):
    e = {"id": "openai--x", "model_name": "X", "org": "openai",
         "date": "2026-01-01", "entry_type": "release",
         "availability_class": "public_api", "origin": "manual",
         "parameters": "NOT_DISCLOSED", "parameters_basis": "NOT_DISCLOSED",
         "predecessor": None,
         "disclosure_links": {"system_card": "https://example.com/c",
                              "model_card": "NOT_DISCLOSED",
                              "usage_policy": "NOT_RESEARCHED",
                              "paper": "NOT_RESEARCHED"},
         "retracted": False,
         "sources": [{"kind": "lab_announcement", "url": "https://example.com/a",
                      "retrieval_date": "2026-01-02"}],
         "benchmarks": [{"benchmark": "gpqa-diamond", "value": 80.1,
                         "configuration": "pass@1",
                         "provenance": {"benchmark_name": "GPQA Diamond",
                                        "benchmark_version": "diamond",
                                        "source_class": "LAB_REPORTED",
                                        "source_url": "https://example.com/a",
                                        "retrieval_date": "2026-01-02"}}]}
    e.update(kw)
    return e


def test_releases_csv_keeps_absence_as_words_never_blank():
    import csv, io
    rows = list(csv.DictReader(io.StringIO(site_files.releases_csv([_entry()]))))
    assert rows[0]["model_card"] == "NOT_DISCLOSED"
    assert rows[0]["paper"] == "NOT_RESEARCHED"
    assert rows[0]["parameters"] == "NOT_DISCLOSED"
    assert rows[0]["organization"] == "OpenAI"


def test_scores_csv_carries_full_provenance():
    import csv, io
    rows = list(csv.DictReader(io.StringIO(site_files.scores_csv([_entry()]))))
    assert rows[0]["source_class"] == "LAB_REPORTED"
    assert rows[0]["source_url"] and rows[0]["retrieval_date"]
