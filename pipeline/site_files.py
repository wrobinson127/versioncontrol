"""Generate the derived public files at deploy time: sitemap.xml with real
lastmod dates; llms.txt, the plain-text front door for language-model
agents; and two plain CSVs of the record for spreadsheet readers. All read
the published record, so none can drift from it.

    python -m pipeline.site_files --out dist
"""
import argparse
import csv
import io
import json
import os

from . import config, store, validate

SITE = "https://versioncontrol.walker-robinson.com"

# (path, which date it changes with). "record" pages change whenever the
# record does; "content" pages only when their text is edited, which the
# last record update is a safe upper bound for.
PAGES = (
    ("/", "record"),
    ("/story.html", "record"),
    ("/data.html", "record"),
    ("/methodology.html", "content"),
    ("/about.html", "content"),
    ("/changes.html", "record"),
)


def _meta(root: str) -> dict:
    with open(os.path.join(root, "data", "derived", "site_meta.json"),
              encoding="utf-8") as f:
        return json.load(f)


def sitemap(meta: dict) -> str:
    lastmod = meta["last_successful_update"]
    rows = "\n".join(
        f"  <url><loc>{SITE}{path}</loc><lastmod>{lastmod}</lastmod></url>"
        for path, _ in PAGES)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{rows}\n</urlset>\n")


def llms_txt(meta: dict, files: list) -> str:
    file_lines = "\n".join(f"- {SITE}/{rel}" for rel in files)
    return f"""# Version Control

> A public record of AI model releases from twelve tracked labs since
> 2022-11-30: when each model shipped, how the public can use it, which
> disclosure documents the lab published, and benchmark scores. Every
> number names its source.

The record holds {meta['entry_count']} entries ({meta['releases']} releases and {meta['revisions']} revisions), from {meta['first_date']} to {meta['last_date']}. Last update: {meta['last_successful_update']}.

## Rules a reader needs

- Each benchmark score carries its source class: LAB_REPORTED (the lab's own figure) or INDEPENDENT (measured by Epoch AI). Do not mix the two when comparing.
- NOT_DISCLOSED means we checked the lab's pages and found no such document. NOT_RESEARCHED means we have not researched it yet. Neither means zero.
- A change against a predecessor is published only when both scores share the benchmark, its version, and the source class. Otherwise the comparison is refused.

## Pages

- {SITE}/ : timeline of every entry, with filters
- {SITE}/story.html : the record told year by year, with a full text version
- {SITE}/methodology.html : the rules, the scope, and the known limits
- {SITE}/data.html : download, field notes, license and citation
- {SITE}/changes.html : every correction, retraction and addition, dated

## Data (CC BY 4.0, with Epoch AI attribution)

The two CSV files are the easiest way in. The full record is gzipped JSON, one file per year, indexed by the manifest. The paths are stable.

- {SITE}/data/releases.csv : one row per entry (plain CSV)
- {SITE}/data/scores.csv : one row per benchmark score, with its source
- {SITE}/data/manifest.json
{file_lines}
- {SITE}/data/derived/site_meta.json

Cite as: Walker Robinson, Version Control, {SITE}, accessed on the date you retrieved it. Release data derives from Epoch AI, "Data on AI Models"; independent scores from Epoch AI, "Capabilities & benchmarking".
"""


RELEASE_COLUMNS = (
    "id", "model_name", "org", "organization", "date", "entry_type",
    "availability_class", "origin", "parameters", "predecessor",
    "system_card", "model_card", "usage_policy", "paper", "retracted",
    "correction_note", "primary_source_url")
SCORE_COLUMNS = (
    "entry_id", "benchmark", "benchmark_name", "benchmark_version", "value",
    "source_class", "source_url", "retrieval_date", "configuration")


def _csv(columns, rows) -> str:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=columns, lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue()


def releases_csv(entries: list) -> str:
    """One row per entry. Absence states stay words (NOT_DISCLOSED,
    NOT_RESEARCHED), never blanks, so a spreadsheet cannot read silence
    as zero."""
    rows = []
    for e in sorted(entries, key=lambda e: (e["date"], e["id"])):
        links = e["disclosure_links"]
        rows.append({
            "id": e["id"], "model_name": e["model_name"], "org": e["org"],
            "organization": config.REGISTRY[e["org"]]["display"],
            "date": e["date"], "entry_type": e["entry_type"],
            "availability_class": e["availability_class"],
            "origin": e["origin"],
            "parameters": (int(e["parameters"])
                           if isinstance(e["parameters"], (int, float))
                           else e["parameters"]),
            "predecessor": e["predecessor"] or "",
            **{a: links.get(a, validate.NOT_RESEARCHED)
               for a in validate.DISCLOSURE_ARTIFACTS},
            "retracted": str(e["retracted"]).lower(),
            "correction_note": e.get("correction_note", ""),
            "primary_source_url": next(
                (s["url"] for s in e["sources"]
                 if s["kind"] != "epoch_csv"), e["sources"][0]["url"]),
        })
    return _csv(RELEASE_COLUMNS, rows)


def scores_csv(entries: list) -> str:
    """One row per benchmark number, with its full provenance."""
    rows = []
    for e in sorted(entries, key=lambda e: (e["date"], e["id"])):
        for b in e["benchmarks"]:
            pv = b["provenance"]
            rows.append({
                "entry_id": e["id"], "benchmark": b["benchmark"],
                "benchmark_name": pv["benchmark_name"],
                "benchmark_version": pv["benchmark_version"],
                "value": b["value"], "source_class": pv["source_class"],
                "source_url": pv["source_url"],
                "retrieval_date": pv["retrieval_date"],
                "configuration": b.get("configuration", ""),
            })
    return _csv(SCORE_COLUMNS, rows)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--root", default=".")
    args = ap.parse_args(argv)
    meta = _meta(args.root)
    with open(os.path.join(args.root, store.MANIFEST_PATH), encoding="utf-8") as f:
        files = sorted(json.load(f)["files"])
    entries = store.read_entries(root=args.root)
    os.makedirs(os.path.join(args.out, "data"), exist_ok=True)
    for name, text in (("sitemap.xml", sitemap(meta)),
                       ("llms.txt", llms_txt(meta, files)),
                       ("data/releases.csv", releases_csv(entries)),
                       ("data/scores.csv", scores_csv(entries))):
        with open(os.path.join(args.out, name), "w", encoding="utf-8",
                  newline="\n") as f:
            f.write(text)
    print(f"wrote sitemap.xml, llms.txt, data/releases.csv and "
          f"data/scores.csv to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
