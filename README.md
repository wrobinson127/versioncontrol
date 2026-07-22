# Version Control

**The release record of the model era.** Version Control is a public registry of major AI model releases: what shipped, what changed against the predecessor, what the lab disclosed, and where every number comes from. It tracks the versions of frontier AI models, not source code, and it is not an MLOps tool.

Live site: [versioncontrol.walker-robinson.com](https://versioncontrol.walker-robinson.com) (goes live at launch; the site in `site/` renders the committed dataset).

## The one rule

Every number tells you where it came from, or it does not appear. Every benchmark number carries a provenance block (source class, source URL, benchmark name and version, retrieval date) that validation enforces; `NOT_DISCLOSED` is a recorded value, never a blank; deltas exist only for comparable pairs (same benchmark, same version, same provenance class) and everything else renders as an explicit refusal, in words.

## How it works

1. **Detection.** A nightly pipeline reads four independent signal classes: official lab feeds and news indexes, organization-scoped Hugging Face listings, the OpenRouter catalog, and Epoch AI's models dataset (`pipeline/detectors/`).
2. **Correlation.** Signals cluster into candidate release events; sibling repositories collapse into one event; anything already in the record is suppressed (`pipeline/correlate.py`).
3. **Drafting.** On detection-positive nights a small language model drafts a structured entry under a hard monthly spend cap; drafts must pass a registrar-voice lint before they attach (`pipeline/extract.py`, `pipeline/lint_voice.py`, `pipeline/spend.py`).
4. **Human approval.** Candidates queue on a review branch. Nothing publishes without explicit approval; merging the branch is publication (`pipeline/pending.py`, `pipeline/promote.py`).
5. **The record.** 293 entries reaching back to 2022-11-30: seeded from Epoch AI's CC-BY data, with independent benchmark numbers from Epoch's Benchmarking Hub, and extended by the nightly pipeline. Committed data is gzipped aggregates plus a checksummed manifest (`data/`), guarded against drift in CI.

Tests: `python -m pytest pipeline/tests` (129 tests). CI runs them plus the manifest-drift guard on every push (`.github/workflows/ci.yml`).

## Licensing

- Code: MIT (see `LICENSE`).
- Published dataset: CC-BY 4.0 with required attribution for Epoch AI derived fields (see `DATA_LICENSE.md`).

Maintained by [Walker Robinson](https://walker-robinson.com).
