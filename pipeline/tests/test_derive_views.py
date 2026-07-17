"""P4.5 tests: derived narrative/explorer datasets. The ruled test: a
trajectory series must never mix eval versions or provenance classes, and a
seeded mixed input must be refused."""
import copy
import gzip
import json
import shutil

import pytest

from pipeline import derive_views, store, validate


def _num(value=50.0, source_class="INDEPENDENT", version="diamond",
         name="GPQA Diamond", benchmark="gpqa-diamond"):
    return {
        "benchmark": benchmark,
        "value": value,
        "provenance": {
            "source_class": source_class,
            "source_url": "https://epoch.ai/benchmarks",
            "benchmark_name": name,
            "benchmark_version": version,
            "retrieval_date": "2026-07-16",
        },
    }


def _entry(eid, date, benchmarks=None, entry_type="release",
           system_card="NOT_DISCLOSED"):
    return {
        "id": eid, "entry_type": entry_type, "model_name": eid.split("--")[1],
        "org": eid.split("--")[0], "date": date,
        "availability_class": "public_api", "parameters": "NOT_DISCLOSED",
        "summary": "x", "benchmarks": benchmarks or [],
        "disclosure_links": {"system_card": system_card,
                             "model_card": "NOT_DISCLOSED",
                             "usage_policy": "NOT_DISCLOSED",
                             "paper": "NOT_DISCLOSED"},
        "predecessor": None, "license_note": None,
        "sources": [{"kind": "epoch_csv", "url": "https://example.com",
                     "retrieval_date": "2026-07-16"}],
        "origin": "backfill-epoch", "retracted": False,
    }


# ------------------------------------------------------------- trajectory

def test_series_partition_by_version_and_class():
    entries = [
        _entry("openai--a1", "2024-01-01", [_num(40.0, "INDEPENDENT")]),
        _entry("openai--a2", "2024-06-01", [_num(50.0, "LAB_REPORTED")]),
        _entry("openai--a3", "2025-01-01", [_num(60.0, "INDEPENDENT")]),
    ]
    t = derive_views.build_trajectory(entries)
    keys = {(s["benchmark_version"], s["source_class"],
             len(s["points"])) for s in t["series"]}
    assert keys == {("diamond", "INDEPENDENT", 2), ("diamond", "LAB_REPORTED", 1)}
    for s in t["series"]:
        assert s["points"] == sorted(s["points"], key=lambda p: p["date"])


def test_seeded_mixed_series_is_refused():
    # A number whose provenance version disagrees with its pin fails P1
    # validation, and the views build refuses rather than repairing (D15).
    bad = _num(70.0)
    bad["provenance"]["benchmark_version"] = "main"
    entries = [_entry("openai--bad", "2024-01-01", [bad])]
    with pytest.raises(derive_views.ViewsError, match="refused"):
        derive_views.build_trajectory(entries)


def test_missing_provenance_field_refuses_build():
    bad = _num(70.0)
    del bad["provenance"]["source_url"]
    entries = [_entry("openai--bad", "2024-01-01", [bad])]
    with pytest.raises(derive_views.ViewsError, match="refused"):
        derive_views.build_trajectory(entries)


def test_eras_record_version_spans():
    entries = [
        _entry("openai--a1", "2024-01-01", [_num(40.0)]),
        _entry("openai--a2", "2025-01-01", [_num(60.0)]),
    ]
    t = derive_views.build_trajectory(entries)
    assert t["eras"]["gpqa-diamond"] == [
        {"version": "diamond", "start": "2024-01-01", "end": None}]


# ---------------------------------------------------------------- cadence

def test_cadence_monthly_and_median_gap():
    entries = [
        _entry("openai--m1", "2024-01-01"),
        _entry("openai--m2", "2024-01-31"),   # gap 30
        _entry("openai--m3", "2024-03-01"),   # gap 30
        _entry("openai--m4", "2024-03-11"),   # gap 10
        _entry("openai--r1", "2024-03-15", entry_type="revision"),
    ]
    c = derive_views.build_cadence(entries)
    assert {"month": "2024-01", "releases": 2, "revisions": 0} in c["monthly"]
    assert {"month": "2024-03", "releases": 2, "revisions": 1} in c["monthly"]
    # median over gaps [30, 30] then [30, 30, 10]
    assert c["median_gap"][0] == {"date": "2024-03-01", "days": 30}
    assert c["median_gap"][1] == {"date": "2024-03-11", "days": 30}


# ------------------------------------------------------ matrix and tiles

def test_matrix_counts_presence_only():
    entries = [
        _entry("openai--a1", "2024-01-01",
               system_card="https://example.com/card.pdf"),
        _entry("openai--a2", "2024-02-01"),
        _entry("openai--r1", "2024-03-01", entry_type="revision"),  # excluded
    ]
    m = derive_views.build_disclosure_matrix(entries)
    assert len(m["rows"]) == 2
    assert m["counts"]["system_card"] == {"disclosed": 1, "not_disclosed": 1}
    assert m["rows"][0]["cells"]["system_card"] is True
    # presence booleans only, no values or scores anywhere in a cell
    assert set(m["rows"][0]["cells"].values()) <= {True, False}


def test_tiles():
    entries = [
        _entry("openai--a1", "2026-01-01",
               system_card="https://example.com/card.pdf"),
        _entry("openai--a2", "2026-01-21"),
        _entry("openai--a3", "2026-02-10"),
    ]
    t = derive_views.build_tiles(entries, "2026-02-20")
    assert t["releases_recorded"] == 3
    assert t["days_since_last_release"] == 10
    assert t["median_gap_days_this_year"] == 20
    assert t["share_with_system_card"] == round(1 / 3, 3)


# ------------------------------------------- integration + manifest guard

def test_build_views_against_real_dataset_and_guard(tmp_path):
    shutil.copytree("data/entries", tmp_path / "data" / "entries")
    # Fresh root: drop the real manifest's derived registrations, since only
    # the views file is rebuilt here (the guard rightly flags absent files).
    manifest = json.loads(open("data/manifest.json", encoding="utf-8").read())
    manifest.pop("derived", None)
    (tmp_path / "data").mkdir(exist_ok=True)
    (tmp_path / "data" / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    views = derive_views.build_views(root=str(tmp_path), run_date="2026-07-16")

    assert views["tiles"]["releases_recorded"] == 281
    assert views["trajectory"]["series"], "real data yields series"
    for s in views["trajectory"]["series"]:
        assert s["source_class"] in ("INDEPENDENT", "LAB_REPORTED")

    with gzip.open(tmp_path / "data" / "derived" / "views.json.gz") as f:
        on_disk = json.loads(f.read())
    assert on_disk["tiles"] == views["tiles"]

    # Registered in the manifest and guard-covered.
    manifest = json.loads((tmp_path / "data" / "manifest.json").read_text())
    assert "data/derived/views.json.gz" in manifest["derived"]
    assert store.check_manifest(root=str(tmp_path)) == []

    # Tamper: guard catches derived drift.
    (tmp_path / "data" / "derived" / "views.json.gz").write_bytes(b"junk")
    problems = store.check_manifest(root=str(tmp_path))
    assert any("derived hash drift" in p for p in problems)
