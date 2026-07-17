"""Aggregate store tests: round trip, manifest-drift guard (invariant 9),
idempotent writes."""
import gzip
import json
import os

import pytest

from pipeline import store

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "entries",
                       "sample_entries.json")


def _entries():
    with open(FIXTURE, encoding="utf-8") as f:
        return json.load(f)


def test_write_read_round_trip(tmp_path):
    entries = _entries()
    manifest = store.write_entries(entries, root=str(tmp_path))
    assert manifest["entry_count"] == len(entries)
    loaded = store.read_entries(root=str(tmp_path))
    assert {e["id"] for e in loaded} == {e["id"] for e in entries}
    # Per-year split: fixture spans 2023 and 2025.
    assert set(manifest["files"]) == {"data/entries/2023.json.gz",
                                      "data/entries/2025.json.gz"}


def test_manifest_guard_clean_after_write(tmp_path):
    store.write_entries(_entries(), root=str(tmp_path))
    assert store.check_manifest(root=str(tmp_path)) == []


def test_manifest_guard_catches_tampered_aggregate(tmp_path):
    store.write_entries(_entries(), root=str(tmp_path))
    target = tmp_path / "data" / "entries" / "2025.json.gz"
    entries = json.loads(gzip.decompress(target.read_bytes()))
    entries.pop()
    target.write_bytes(gzip.compress(json.dumps(entries).encode()))
    problems = store.check_manifest(root=str(tmp_path))
    assert problems, "guard must catch an aggregate that drifted from the manifest"


def test_manifest_guard_catches_missing_file(tmp_path):
    store.write_entries(_entries(), root=str(tmp_path))
    os.remove(tmp_path / "data" / "entries" / "2023.json.gz")
    problems = store.check_manifest(root=str(tmp_path))
    assert any("missing" in p for p in problems)


def test_manifest_guard_reports_missing_manifest(tmp_path):
    assert store.check_manifest(root=str(tmp_path)) == [
        "manifest missing: " + store.MANIFEST_PATH]


def test_duplicate_ids_refused(tmp_path):
    entries = _entries()
    entries.append(dict(entries[0]))
    with pytest.raises(ValueError, match="duplicate"):
        store.write_entries(entries, root=str(tmp_path))


def test_rewrite_is_byte_identical(tmp_path):
    """Idempotence: rewriting identical content produces identical bytes,
    so a re-run backfill creates no spurious git diff."""
    entries = _entries()
    m1 = store.write_entries(entries, root=str(tmp_path))
    hashes1 = {rel: meta["sha256"] for rel, meta in m1["files"].items()}
    m2 = store.write_entries(entries, root=str(tmp_path))
    hashes2 = {rel: meta["sha256"] for rel, meta in m2["files"].items()}
    assert hashes1 == hashes2
