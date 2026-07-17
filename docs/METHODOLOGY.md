# Methodology

Version Control is a registrar, not a reviewer. It records what shipped, what changed against the predecessor, what the lab disclosed, and where every number comes from. This page is the contract for reading it honestly.

## How to read this honestly

**1. Every number tells you where it came from, or it does not appear.** Every benchmark number carries a provenance tag rendered next to it: `LAB` means the releasing lab reported the number; `IND` means an independent evaluation produced it (in v1, Epoch AI's Benchmarking Hub). Behind each tag the data model stores the source class, the source URL, the benchmark name and version, and the retrieval date. A number missing any of those fields cannot enter the dataset; validation rejects it.

**2. Absence is signal, not blank space.** `NOT_DISCLOSED` is a distinct recorded value, never null and never zero. When a release entry shows no system card, that is the lab's disclosure record, displayed. When a parameter count shows the not-disclosed mark, the lab did not state one. A missing benchmark number means no measurement with completable provenance exists; nothing is interpolated.

**3. Deltas exist only for comparable pairs.** A delta against the predecessor renders only when both numbers share the same benchmark, the same benchmark version, and the same provenance class. Anything else returns an explicit refusal that renders in words ("no comparable measurement"), not in whitespace. No cross-eval-version comparison is computed anywhere, including derived files.

**4. Eval versions are pinned and visible.** The v1 benchmark set is exactly two: **GPQA Diamond** and **SWE-Bench Verified**. "GPQA Diamond" is permanently a different measurement axis from "GPQA"; a lab-stated number whose benchmark name lacks the version qualifier is quarantined as an unpinned claim and never published as a number.

## What gets an entry

A tracked release is a new named model or versioned variant from a registry organization that is publicly usable: open weights, public API, or public service. Lab-announced point releases are tracked as releases. Silent snapshot updates get a lighter `revision` entry type. Excluded: third-party fine-tunes, quantizations and reposts, no-access research previews, and models whose domain classification in Epoch AI's dataset includes neither language nor multimodal capability. A multimodal model with a language component is in scope, which is why audio-language and vision-language entries appear in the record.

The registry is a closed set of twelve organizations: OpenAI, Anthropic, Google (DeepMind), Meta, xAI, Mistral, DeepSeek, Alibaba (Qwen), Moonshot AI, Z.ai (Zhipu), Cohere, Amazon (Nova). It is append-only. An organization enters when it ships a model meeting Epoch AI's notability bar or sustains top-tier leaderboard presence. Every registry change is logged publicly.

## How releases are detected

A nightly pipeline reads four independent signal classes: official lab announcement feeds and news indexes (primary), organization-scoped Hugging Face listings (open-weights signal), the OpenRouter catalog (tripwire), and Epoch AI's models dataset (trailing confirmation). Signals correlate into candidate events; sibling repositories (quantizations, size ladders) cluster into one event. Candidates queue for human review. **Nothing publishes without explicit human approval.** Pending candidates have no public trace.

## Sources and licensing

- **Epoch AI, "Data on AI Models"** and **"AI Benchmarking Hub"**: CC-BY 4.0, attribution in `DATA_LICENSE.md`. Backfilled entries and all independent benchmark numbers derive from these.
- **Lab announcements**: facts and links only; no republication of announcement text beyond short attributed fragments.
- **OpenRouter**: used for detection and cross-checking. Pricing and context-length figures shown on the site carry "per OpenRouter" attribution and are **never included in the downloadable dataset**, because OpenRouter publishes no redistribution license for its catalog.
- The published dataset is CC-BY 4.0. The code is MIT.

## Known limits

- Backfilled entries (2022-11-30 through 2026-07-16) carry independent numbers only; lab-reported numbers accrue going forward through the nightly path. Era sparsity is visible by design.
- Predecessor chains are heuristic and can be wrong in both directions; a wrong chain can suppress a delta but can never fabricate one, because delta computation independently verifies comparability.
- Upstream errors in source datasets are carried with a note and corrected through the public review flow, never silently.
- The record begins 2022-11-30 and does not reconstruct earlier history; a single prehistory note marks the boundary.
- Costs, stated plainly: the infrastructure is $0 (static site, scheduled jobs on a free tier); the pipeline's language-model drafting costs are metered, expected under $1 per month with a $2 per month hard cap enforced in configuration.
