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


def test_main_writes_both_files(tmp_path):
    site_files.main(["--out", str(tmp_path)])
    assert (tmp_path / "sitemap.xml").exists()
    assert (tmp_path / "llms.txt").exists()
