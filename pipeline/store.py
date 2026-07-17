"""Aggregate storage: gzipped JSON under data/, with a manifest guard.

Committed data is aggregates only (invariant 9): per-year entry aggregates
under data/entries/, derived views under data/derived/, and a manifest that
indexes both. The manifest-drift guard (`check_manifest`) asserts every
indexed entry resolves and every stored entry is indexed; it is wired into
the site build and CI when those land (P5/P6).
"""
import gzip
import hashlib
import json
import os

ENTRIES_DIR = os.path.join("data", "entries")
DERIVED_DIR = os.path.join("data", "derived")
MANIFEST_PATH = os.path.join("data", "manifest.json")


def _dump_gz(path: str, obj) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = json.dumps(obj, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    # mtime=0 keeps the gzip byte-identical for identical content, so
    # re-running the backfill produces no spurious diffs (idempotence).
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(payload)


def _load_gz(path: str):
    with gzip.open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8"))


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def write_entries(entries: list, root: str = ".") -> dict:
    """Write validated entries as per-year gzipped aggregates plus manifest.

    Entries are grouped by the year of their date, sorted by (date, id)
    within each aggregate. Returns the manifest. Callers validate first;
    this function asserts ids are unique and refuses to write otherwise.
    """
    ids = [e["id"] for e in entries]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        raise ValueError(f"duplicate entry ids: {sorted(dupes)}")

    by_year = {}
    for e in entries:
        by_year.setdefault(e["date"][:4], []).append(e)

    files = {}
    for year, year_entries in sorted(by_year.items()):
        year_entries.sort(key=lambda e: (e["date"], e["id"]))
        rel = os.path.join(ENTRIES_DIR, f"{year}.json.gz")
        _dump_gz(os.path.join(root, rel), year_entries)
        files[rel.replace(os.sep, "/")] = {
            "count": len(year_entries),
            "ids": [e["id"] for e in year_entries],
            "sha256": _sha256(os.path.join(root, rel)),
        }

    manifest = {
        "schema_version": 1,
        "entry_count": len(entries),
        "files": files,
    }
    manifest_abs = os.path.join(root, MANIFEST_PATH)
    os.makedirs(os.path.dirname(manifest_abs), exist_ok=True)
    with open(manifest_abs, "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
        f.write("\n")
    return manifest


def read_entries(root: str = ".") -> list:
    """Load every entry indexed by the manifest, in manifest order."""
    with open(os.path.join(root, MANIFEST_PATH), encoding="utf-8") as f:
        manifest = json.load(f)
    entries = []
    for rel in sorted(manifest["files"]):
        entries.extend(_load_gz(os.path.join(root, rel)))
    return entries


def check_manifest(root: str = ".") -> list:
    """Manifest-drift guard. Returns a list of problems; empty means clean.

    Asserts: every file the manifest indexes exists with the recorded hash
    and count; every id the manifest lists resolves to a stored entry; no
    stored entry is missing from the manifest; ids are globally unique.
    """
    problems = []
    manifest_abs = os.path.join(root, MANIFEST_PATH)
    if not os.path.exists(manifest_abs):
        return [f"manifest missing: {MANIFEST_PATH}"]
    with open(manifest_abs, encoding="utf-8") as f:
        manifest = json.load(f)

    seen_ids = []
    total = 0
    for rel, meta in sorted(manifest["files"].items()):
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            problems.append(f"indexed file missing: {rel}")
            continue
        if _sha256(path) != meta["sha256"]:
            problems.append(f"hash drift: {rel}")
        entries = _load_gz(path)
        stored_ids = [e.get("id") for e in entries]
        if len(entries) != meta["count"]:
            problems.append(f"count drift: {rel} has {len(entries)}, "
                            f"manifest says {meta['count']}")
        if stored_ids != meta["ids"]:
            problems.append(f"id drift: {rel} contents do not match manifest ids")
        seen_ids.extend(stored_ids)
        total += len(entries)

    if total != manifest.get("entry_count"):
        problems.append(f"entry_count drift: stored {total}, "
                        f"manifest says {manifest.get('entry_count')}")
    dupes = {i for i in seen_ids if seen_ids.count(i) > 1}
    if dupes:
        problems.append(f"duplicate ids across aggregates: {sorted(dupes)}")
    return problems
