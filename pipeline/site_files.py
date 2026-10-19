"""Generate the crawler-facing files at deploy time: sitemap.xml with real
lastmod dates, and llms.txt, the plain-text front door for language-model
agents. Both read the published record, so neither can drift from it.

    python -m pipeline.site_files --out dist
"""
import argparse
import json
import os

from . import store

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
- NOT_DISCLOSED means we checked the lab's pages and found no such document. NOT_RESEARCHED means we have not checked yet. Neither means zero.
- A change against a predecessor is published only when both scores share the benchmark, its version, and the source class. Otherwise the comparison is refused.

## Pages

- {SITE}/ : timeline of every entry, with filters
- {SITE}/story.html : the record told year by year, with a full text version
- {SITE}/methodology.html : the rules, the scope, and the known limits
- {SITE}/data.html : download, field notes, license and citation

## Data (CC BY 4.0, with Epoch AI attribution)

Entries are gzipped JSON, one file per year, indexed by the manifest. The paths are stable.

- {SITE}/data/manifest.json
{file_lines}
- {SITE}/data/derived/site_meta.json

Cite as: Walker Robinson, Version Control, {SITE}, accessed on the date you retrieved it. Release data derives from Epoch AI, "Data on AI Models"; independent scores from Epoch AI, "Capabilities & benchmarking".
"""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--root", default=".")
    args = ap.parse_args(argv)
    meta = _meta(args.root)
    with open(os.path.join(args.root, store.MANIFEST_PATH), encoding="utf-8") as f:
        files = sorted(json.load(f)["files"])
    os.makedirs(args.out, exist_ok=True)
    for name, text in (("sitemap.xml", sitemap(meta)),
                       ("llms.txt", llms_txt(meta, files))):
        with open(os.path.join(args.out, name), "w", encoding="utf-8",
                  newline="\n") as f:
            f.write(text)
    print(f"wrote sitemap.xml and llms.txt to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
