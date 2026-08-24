"""Content-pass application tests: only APPROVED rows change entries; URLs
and explicit NOT_DISCLOSED apply; blanks never clobber; invalid results are
refused and reported."""
import json
import os
import shutil

from pipeline import apply_disclosures, store


def _root(tmp_path):
    shutil.copytree("data/entries", tmp_path / "data" / "entries")
    shutil.copy("data/manifest.json", tmp_path / "data" / "manifest.json")
    (tmp_path / "content" / "disclosure_links").mkdir(parents=True)
    root = str(tmp_path)
    # Clean-slate the disclosure baseline so these logic tests assert against a
    # known state, not the mutable published disclosure data (which the content
    # pass fills). Every artifact starts NOT_DISCLOSED; the tests then verify how
    # apply_disclosures transitions it. (Content pass 2026-07-20.)
    from pipeline import validate
    entries = store.read_entries(root=root)
    for e in entries:
        e["disclosure_links"] = {a: "NOT_DISCLOSED"
                                 for a in validate.DISCLOSURE_ARTIFACTS}
    store.write_entries(entries, root=root)
    return root


def _write_table(root, rows, org="openai"):
    with open(os.path.join(root, "content", "disclosure_links",
                           f"{org}.json"), "w", encoding="utf-8") as f:
        json.dump({"org": org, "display": org, "reviewed_by_walker": False,
                   "rows": rows}, f)


def _row(entry_id, status="APPROVED", **cells):
    base = {"entry_id": entry_id, "model_name": "x", "date": "2025-08-07",
            "system_card": "", "model_card": "", "usage_policy": "",
            "paper": "", "status": status, "notes": ""}
    base.update(cells)
    return base


def test_approved_url_and_explicit_nd_apply_blanks_do_not(tmp_path):
    root = _root(tmp_path)
    entries = {e["id"]: e for e in store.read_entries(root=root)}
    target = entries["openai--gpt-5"]
    original_paper = target["disclosure_links"]["paper"]
    _write_table(root, [_row(
        "openai--gpt-5",
        system_card="https://cdn.openai.com/gpt-5-system-card.pdf",
        model_card="NOT_DISCLOSED")])

    report = apply_disclosures.apply(root=root, run_date="2026-07-17")
    assert report["applied"] == ["openai--gpt-5"]
    assert report["problems"] == [] and report["unknown_entry_ids"] == []

    updated = {e["id"]: e for e in store.read_entries(root=root)}["openai--gpt-5"]
    assert updated["disclosure_links"]["system_card"] == \
        "https://cdn.openai.com/gpt-5-system-card.pdf"
    assert updated["disclosure_links"]["model_card"] == "NOT_DISCLOSED"
    # Blank cells never clobber what the entry already has.
    assert updated["disclosure_links"]["paper"] == original_paper
    assert store.check_manifest(root=root) == []


def test_draft_flagged_rows_change_nothing(tmp_path):
    root = _root(tmp_path)
    _write_table(root, [_row("openai--gpt-5", status="DRAFT_FLAGGED",
                             system_card="https://example.com/card.pdf")])
    report = apply_disclosures.apply(root=root, run_date="2026-07-17")
    assert report["applied"] == [] and report["approved_rows"] == 0


def test_invalid_value_refused_and_entry_untouched(tmp_path):
    root = _root(tmp_path)
    _write_table(root, [_row("openai--gpt-5", system_card="not a url")])
    report = apply_disclosures.apply(root=root, run_date="2026-07-17")
    assert report["applied"] == []
    assert any("openai--gpt-5" in p for p in report["problems"])
    updated = {e["id"]: e for e in store.read_entries(root=root)}["openai--gpt-5"]
    assert updated["disclosure_links"]["system_card"] == "NOT_DISCLOSED"


def test_unknown_entry_id_reported(tmp_path):
    root = _root(tmp_path)
    _write_table(root, [_row("openai--no-such-model",
                             system_card="https://example.com/card.pdf")])
    report = apply_disclosures.apply(root=root, run_date="2026-07-17")
    assert report["unknown_entry_ids"] == ["openai--no-such-model"]


def test_applied_rows_flow_into_views(tmp_path):
    import gzip
    root = _root(tmp_path)
    _write_table(root, [_row(
        "openai--gpt-5",
        system_card="https://cdn.openai.com/gpt-5-system-card.pdf")])
    apply_disclosures.apply(root=root, run_date="2026-07-17")
    with gzip.open(tmp_path / "data" / "derived" / "views.json.gz") as f:
        views = json.loads(f.read())
    assert views["tiles"]["share_with_system_card"] > 0
    assert views["disclosure_matrix"]["counts"]["system_card"]["disclosed"] == 1
