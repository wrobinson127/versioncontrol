"""Derived-views tests: the site's delta chips come from deltas.py through
this file and nowhere else."""
import gzip
import json
import os

from pipeline import derive, store


def test_derive_against_real_dataset(tmp_path):
    # Copy the committed aggregates into a temp root, derive there, and
    # check the outputs without touching the working tree.
    import shutil
    shutil.copytree("data/entries", tmp_path / "data" / "entries")
    shutil.copy("data/manifest.json", tmp_path / "data" / "manifest.json")

    meta = derive.build(root=str(tmp_path), run_date="2026-07-16")
    # Counted from the dataset, not pinned to a literal. A pinned count breaks
    # on every Epoch capture refresh, which trains the reader to bump the
    # number rather than ask why it moved; the 2026-08-24 refresh took this
    # from 293 to 326. What matters is that derive counts what is there.
    expected = len(store.read_entries(root=str(tmp_path)))
    assert meta["entry_count"] == expected
    assert expected > 290, "the real dataset should be substantial"
    assert meta["delta_chips"] > 0
    assert meta["last_successful_update"] == "2026-07-16"

    with gzip.open(tmp_path / "data" / "derived" / "deltas.json.gz") as f:
        delta_map = json.load(f)
    entries = {e["id"]: e for e in store.read_entries(root=str(tmp_path))}
    for eid, chips in delta_map.items():
        e = entries[eid]
        assert e["predecessor"], f"{eid} has chips but no predecessor"
        for chip in chips:
            assert chip["kind"] in ("delta", "REFUSED_COMPARISON")
            if chip["kind"] == "delta":
                # The chip's arithmetic must reconcile with the entry's own
                # stored value (single-implementation check). Key by benchmark
                # AND source_class: an entry can now carry both a LAB_REPORTED
                # and an INDEPENDENT number for the same benchmark (the pairs
                # from the content pass), and each has its own delta chip.
                stored = {(b["benchmark"], b["provenance"]["source_class"]): b["value"]
                          for b in e["benchmarks"]}
                assert abs(stored[(chip["benchmark"], chip["source_class"])]
                           - chip["current"]) < 1e-9


def test_gpt4o_aug_revision_has_a_real_chip(tmp_path):
    import shutil
    shutil.copytree("data/entries", tmp_path / "data" / "entries")
    shutil.copy("data/manifest.json", tmp_path / "data" / "manifest.json")
    derive.build(root=str(tmp_path), run_date="2026-07-16")
    with gzip.open(tmp_path / "data" / "derived" / "deltas.json.gz") as f:
        delta_map = json.load(f)
    chips = delta_map.get("openai--gpt-4o-aug-2024")
    assert chips and chips[0]["kind"] == "delta"
    assert abs(chips[0]["value"] - (49.2 - 48.9)) < 1e-6
