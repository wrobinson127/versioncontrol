# Methodology

Version Control is a registrar, not a reviewer. It records what shipped, what changed against the predecessor, what the lab disclosed, and where every number comes from. This page is the contract for reading it honestly.

## How to read this honestly

**1. Every number tells you where it came from, or it does not appear.** Every benchmark number carries a provenance tag rendered next to it: `LAB` means the releasing lab reported the number; `IND` means an independent evaluation produced it (in v1, Epoch AI's Benchmarking Hub). Behind each tag the data model stores the source class, the source URL, the benchmark name and version, and the retrieval date. A number missing any of those fields cannot enter the dataset; validation rejects it.

**2. Absence is signal, not blank space.** `NOT_DISCLOSED` is a distinct recorded value, never null and never zero, and it is a researched claim: someone looked at the lab's own sites and found nothing. Where the registrar has not yet looked, the value is `NOT_RESEARCHED`, rendered as plain words and excluded from every share, because a lab's silence nobody has checked for is not a lab's silence. When a parameter count shows the not-disclosed mark, the lab did not state one. A missing benchmark number means no measurement with completable provenance exists; nothing is interpolated.

**3. Deltas exist only for comparable pairs.** A delta against the predecessor renders only when both numbers share the same benchmark, the same benchmark version, and the same provenance class. Anything else returns an explicit refusal that renders in words ("no comparable measurement"), not in whitespace. No cross-eval-version comparison is computed anywhere, including derived files.

**4. Eval versions are pinned and visible.** The v1 benchmark set is exactly two: **GPQA Diamond** and **SWE-Bench Verified**. "GPQA Diamond" is permanently a different measurement axis from "GPQA"; a lab-stated number whose benchmark name lacks the version qualifier is quarantined as an unpinned claim and never published as a number.

## What gets an entry

A tracked release is a new named model or versioned variant from a registry organization that is publicly usable: open weights, public API, or public service. Lab-announced point releases are tracked as releases. Silent snapshot updates get a lighter `revision` entry type. In scope: language models, and multimodal models with a language component, which is why audio-language and vision-language entries appear in the record. Excluded: third-party fine-tunes, quantizations and reposts, no-access research previews, and models Epoch AI's dataset classifies as neither language nor multimodal. A blank classification is not an exclusion: an absent field is not evidence about the model, so those entries are resolved by hand and recorded with `origin: manual`. OpenAI's o3-pro is the standing example.

The registry is a closed set of twelve organizations: OpenAI, Anthropic, Google (DeepMind), Meta, xAI, Mistral, DeepSeek, Alibaba (Qwen), Moonshot AI, Z.ai (Zhipu), Cohere, Amazon (Nova). It is append-only. An organization enters when it ships a model meeting Epoch AI's notability bar or sustains top-tier leaderboard presence. Every registry change is logged publicly.

## The measures, defined

Every headline number on the site is computed from the published files by a stated rule; nothing is smoothed or modeled.

- **Median gap between releases (the story counter)**: the median of the gaps, in days, between consecutive releases across all tracked organizations, over a trailing 365 day window evaluated at each release date. It pools twelve organizations, which is why it saturates at a few days once the record densifies.
- **Median gap this year (the tile)**: the median of the gaps between consecutive releases dated within the current calendar year. A different window from the story counter, stated on each surface.
- **Releases per year and per month**: raw counts of release entries by date. Revisions are counted separately and excluded from release cadence.
- **Days since the last release**: calendar days from the newest release date to the last successful update.
- **Releases with a paper link / system card link**: the count of release entries whose disclosure row carries a link on record for that artifact.
- **Under review**: a disclosure artifact column renders "under review" when researched links exist in the registrar's queue but none has been approved onto the record. This is the registrar's own state, distinct from a lab's `NOT_DISCLOSED`, and it is never rendered as a zero or a percentage.

## How releases are detected

A nightly pipeline reads four independent signal classes: official lab announcement feeds and news indexes (primary), organization-scoped Hugging Face listings (open-weights signal), the OpenRouter catalog (tripwire), and Epoch AI's models dataset (trailing confirmation). Signals correlate into candidate events; sibling repositories (quantizations, size ladders) cluster into one event. Candidates queue for human review. **Nothing publishes without explicit human approval.** Pending candidates have no public trace.

## Sources and licensing

- **Epoch AI, "Data on AI Models"** and **"AI Benchmarking Hub"**: CC-BY 4.0, attribution in `DATA_LICENSE.md`. Backfilled entries and all independent benchmark numbers derive from these.
- **Lab announcements**: facts and links only; no republication of announcement text beyond short attributed fragments.
- **OpenRouter**: used for detection and cross-checking. Pricing and context-length figures shown on the site carry "per OpenRouter" attribution and are **never included in the downloadable dataset**, because OpenRouter publishes no redistribution license for its catalog.
- **Artificial Analysis**: used for a weekly coverage audit (models they track that this registry lacks become review flags) and, where shown, as an additional independent measurement source with "per Artificial Analysis" attribution. Independent sources are never averaged or merged; when two disagree, both render, each attributed. Their free tier grants no redistribution rights, so their data is display-only and never enters the downloadable dataset. Their documentation states that nulls mean not measured, never zero, a convention this registry shares.
- The published dataset is CC-BY 4.0. The code is MIT.

## Known limits

- Backfilled entries (2022-11-30 through 2026-07-16) carry independent numbers only; lab-reported numbers accrue going forward through the nightly path. Era sparsity is visible by design.
- Predecessor chains are heuristic and can be wrong in both directions; a wrong chain can suppress a delta but can never fabricate one, because delta computation independently verifies comparability.
- Upstream errors in source datasets are carried with a note and corrected through the public review flow, never silently.
- The record begins 2022-11-30 and does not reconstruct earlier history; a single prehistory note marks the boundary.
- Costs, stated plainly: the infrastructure is $0 (static site, scheduled jobs on a free tier); the pipeline's language-model drafting costs are metered, expected under $1 per month with a $2 per month hard cap enforced in configuration.
