"""Lab-number content pass: only APPROVED rows apply, numbers arrive
provenance-complete and pinned, duplicates skip, bad rows never mutate."""
import json
import os
import shutil

from pipeline import apply_lab_numbers, store, validate


def _seed(tmp_path):
    root = str(tmp_path)
    shutil.copytree("data/entries", tmp_path / "data" / "entries")
    shutil.copy("data/manifest.json", tmp_path / "data" / "manifest.json")
    return root


def _table(root, rows):
    d = os.path.join(root, "content", "lab_numbers")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "openai.json"), "w", encoding="utf-8") as f:
        json.dump({"org": "openai", "rows": rows}, f)


def _row(status="APPROVED", benchmark="gpqa-diamond", entry_id="openai--gpt-5"):
    return {
        "entry_id": entry_id, "model_name": "x", "benchmark": benchmark,
        "value": 71.5, "benchmark_name_as_stated": "GPQA Diamond",
        "configuration": "pass@1", "source_url": "https://openai.com/x",
        "source_kind": "announcement", "retrieval_date": "2026-07-17",
        "quote": "71.5% on GPQA Diamond", "status": status,
    }


def test_approved_row_applies_with_pinned_provenance(tmp_path):
    root = _seed(tmp_path)
    _table(root, [_row()])
    report = apply_lab_numbers.apply(root=root, run_date="2026-07-17")
    assert report["problems"] == [] and report["unknown_entry_ids"] == []
    assert report["applied"] == ["openai--gpt-5: gpqa-diamond"]
    e = {x["id"]: x for x in store.read_entries(root=root)}["openai--gpt-5"]
    added = [n for n in e["benchmarks"]
             if n["provenance"]["source_class"] == "LAB_REPORTED"]
    assert len(added) == 1
    assert added[0]["provenance"]["benchmark_name"] == "GPQA Diamond"
    assert added[0]["provenance"]["benchmark_version"] == "diamond"
    assert added[0]["configuration"] == "pass@1"
    assert validate.validate_entry(e) == []
    assert store.check_manifest(root=root) == []


def test_draft_rows_change_nothing(tmp_path):
    root = _seed(tmp_path)
    before = store.read_entries(root=root)
    _table(root, [_row(status="DRAFT_FLAGGED")])
    report = apply_lab_numbers.apply(root=root, run_date="2026-07-17")
    assert report["applied"] == [] and report["approved_rows"] == 0
    assert store.read_entries(root=root) == before


def test_duplicate_lab_number_skips(tmp_path):
    root = _seed(tmp_path)
    _table(root, [_row()])
    apply_lab_numbers.apply(root=root, run_date="2026-07-17")
    report = apply_lab_numbers.apply(root=root, run_date="2026-07-17")
    assert report["applied"] == []
    assert any("already on the entry" in s for s in report["skipped"])


def test_unknown_entry_and_unpinned_benchmark_refused(tmp_path):
    root = _seed(tmp_path)
    _table(root, [_row(entry_id="openai--nope"),
                  _row(benchmark="mmlu")])
    report = apply_lab_numbers.apply(root=root, run_date="2026-07-17")
    assert report["unknown_entry_ids"] == ["openai--nope"]
    assert any("not a pinned benchmark" in p for p in report["problems"])
    assert report["applied"] == []
