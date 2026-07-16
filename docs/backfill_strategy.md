# Backfill strategy: reach and refusals

How the launch timeline was built, what it includes, and what it deliberately refuses to include. Run date: 2026-07-16 (UTC). The backfill is deterministic and idempotent: re-running it against the same captured inputs produces byte-identical aggregates.

## Sources

- **Epoch AI, "Data on AI Models"** (CC-BY, attribution in `DATA_LICENSE.md`): the spine of the backfill. Captured 2026-07-16: 3,555 rows.
- **Epoch AI, "AI Benchmarking Hub"** (CC-BY): the only source of benchmark numbers in the backfill, all carrying `INDEPENDENT` provenance. Captured 2026-07-16.
- No LLM was used anywhere in the backfill. Summaries are deterministic registrar-voice templates that pass the same voice lint as everything else. The budgeted backfill LLM assist (under $5, flagged before spending) was not needed: $0 spent.

## Inclusion (the D3 test, applied in order)

| Step | Rule | Rows refused |
|---|---|---|
| 1 | Primary organization is one of the twelve registry orgs | 2,605 |
| 2 | Publication date on or after 2022-11-30 | 342 |
| 3 | Publicly usable: accessibility maps to open weights, public API, or public service ("Unreleased" and blank refused) | 118 |
| 4 | Language or multimodal domain | 84 |

406 rows survived, clustering into **292 entries: 278 releases and 14 revisions.** Sibling rows (size ladders, same-day same-announcement releases) cluster into one entry; the flagship is the largest-parameter row and siblings are recorded as variants. Epoch's parenthetical snapshot naming ("GPT-4o (Mar 2025)") maps to the `revision` entry type. Duplicate listings of one release (an announcement-dated row and a paper-dated row within 30 days, observed with GLM-5) merge, keeping the earliest date and every link.

Per-year entry counts: 2022: 1, 2023: 45, 2024: 98, 2025: 118, 2026: 30.

## Benchmark numbers: what attached and what was refused

The pinned pair only (GPQA Diamond, SWE-Bench Verified; ruling D5). The Benchmarking Hub carried 205 evaluation runs for registry-org models. 101 numbers attached to 80 entries (78 GPQA Diamond, 23 SWE-Bench Verified); every one carries `INDEPENDENT` provenance, the hub URL, the exact benchmark version, the retrieval date, and the verbatim hub model string as its configuration.

The join is deliberately conservative, and its refusals are the point:

- **Revision-aware routing.** A date-stamped evaluation (`gpt-4o-2024-11-20`, `DeepSeek-V3-0324`) attaches to the entry whose date falls within 45 days of the stamp, which routes snapshot evaluations to the matching revision entry, never to the original release. A stamp matching no entry within the window attaches nowhere.
- **Variants never inherit.** A `gpt-5-mini` score cannot land on the GPT-5 entry; tier and mode tokens (mini, nano, flash, thinking, turbo, exp) are never stripped during matching because they name different models.
- **Unmatched hub runs are dropped, not forced.** Runs whose model string could not be matched to an entry with confidence were left out. Missing numbers display as absent; no number was ever approximated into place.

**No LAB_REPORTED numbers exist in the backfill.** Lab-reported numbers require parsing the lab's own announcement, which the backfill does not do; they enter the record through the nightly extraction path going forward. Era sparsity is visible by design: a 2023 release with no independent measurement shows no number, because none with completable provenance exists.

## Disclosure links

Backfilled entries carry a paper link where Epoch's data recorded an arXiv link for the release; every other artifact (system card, model card, usage policy) is `NOT_DISCLOSED` pending the curated content pass. The per-lab draft tables in `content/disclosure_links/` (278 rows across 12 labs) are the working surface for that pass; every row is flagged and nothing publishes from them without approval.

## Known limits

- **Predecessor chains are heuristic** (same organization, same coarse model family, nearest earlier entry; 105 of 292 entries are chained). A wrong chain can suppress or misdirect a delta chip but can never fabricate a comparison: delta computation independently requires identical benchmark, version, and provenance class, and refuses everything else.
- **Meta's announcement surfaces block scripted fetches** (HTTP 400, Phase 0 finding), so Meta entries lean entirely on Epoch data.
- Epoch's `Link` field is empty on some recent rows; affected entries carry the Epoch dataset as their only source until the nightly pipeline or the content pass adds the lab's own link.
