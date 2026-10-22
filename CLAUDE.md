# CLAUDE.md

Version Control is a registrar of AI model releases: a static site plus a
nightly detection pipeline, both in this repository. Read `README.md` for
what it is and `docs/METHODOLOGY.md` for the rules every number obeys.

## Commands

```
python -m pytest -q                     # 339 tests
python -m pipeline.validate             # every entry against the schema and provenance rules
python -m pipeline.build_story          # regenerate site/story.html from data/
python -m pipeline.build_story --check  # fail if story.html has drifted from the data (CI runs this)
python -m pipeline.nightly              # detect -> correlate -> draft -> write data/pending/
python -m pipeline.promote --run-date YYYY-MM-DD   # approved candidates -> entries -> derived views (+ archive.org snapshots)
python -m pipeline.archive              # snapshot lab URLs on archive.org -> content/archive_map.json -> entries
python -m pipeline.archive --apply      # re-apply content/archive_map.json to the entries; no network
python -m pipeline.archive --report     # count lab URLs with no snapshot (CI prints it as a ::warning::)
```

The full record rebuild, in order: `backfill` -> `apply_disclosures` ->
`apply_lab_numbers` -> `derive`. `backfill` replaces the record wholesale
and carries `manual` and `nightly-pipeline` entries forward; run the steps in
that order or disclosure links and lab-reported numbers are lost. Archive
snapshots (D5) need no step of their own: `backfill`, `apply_disclosures` and
`apply_lab_numbers` each re-apply `content/archive_map.json` to what they
write, so every `archived_url` and `disclosure_archived` survives the
rebuild. New snapshots come from `python -m pipeline.archive` (or `promote`
for new entries); `python -m pipeline.archive --apply` re-applies the map
alone.

## Invariants (the code enforces these; do not route around them)

- A benchmark number without full provenance (source class, source URL,
  benchmark name and version, retrieval date) is rejected, never published.
- `NOT_DISCLOSED` is a researched claim about the lab. `NOT_RESEARCHED` is
  the registrar's own gap. Null is refused. Shares divide by researched
  releases only.
- Nothing publishes without human approval: the nightly writes candidates to
  `data/pending/` on a branch; a person sets `"approved": true`; `promote`
  runs; merging the branch is publication.
- Registrar voice: `pipeline/lint_voice.py` refuses quality adjectives,
  rankings, comparative claims, and em dashes in any public string.
- API keys live only in GitHub Actions secrets. Never in files.
- Colour law: green is data marks only; annotation blue is outline only; red
  marks a correction or a retraction, and nothing else; no per-organization hues.

## Local-only surfaces

`board/`, `DESIGN.md`, `docs/reviews/`, and `.scratch/` are gitignored
working areas. `DESIGN.md` is the design authority and overrides any
general design guidance; it is distilled into the public methodology page.

## Layout

- `pipeline/` the detectors, correlation, extraction, validation, promotion,
  derivation, and the story generator; tests in `pipeline/tests/`.
- `data/entries/*.json.gz` the record, one file per year; `data/derived/` the
  views the site renders verbatim; `data/pending/` the review queue.
- `content/` hand-curated tables: disclosure links per lab, scope rulings.
- `site/` the static site. `site/story.html` is generated; edit
  `pipeline/build_story.py` instead.
- `.github/workflows/` CI, nightly detection, promotion, Pages deploy.
