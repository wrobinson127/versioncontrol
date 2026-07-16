# Version Control

**The release record of the model era.** Version Control is a public registry of major AI model releases: what shipped, what changed against the predecessor, what the lab disclosed, and where every number comes from. It tracks the versions of frontier AI models, not source code, and it is not an MLOps tool.

## Status

Under construction. This repository currently contains the project scaffold: license terms, data license terms, and configuration groundwork. The detection pipeline, dataset, and site are being built in phases and will be documented here as they land.

## What this will be

- A timeline of release entries for major AI models from twelve tracked organizations, backfilled to 2022-11-30.
- Each entry records the release date, the organization, availability class, benchmark numbers with full provenance (source class, source URL, benchmark name and version, retrieval date), deltas against the predecessor where the measurements are comparable, and disclosure links (system card, model card, usage policy, paper) with explicit `NOT_DISCLOSED` marks where a lab published nothing.
- A nightly pipeline detects candidate releases from four independent signals and drafts entries for human review. Nothing publishes without approval.

## Licensing

- Code: MIT (see `LICENSE`).
- Published dataset: CC-BY 4.0 with required attribution for Epoch AI derived fields (see `DATA_LICENSE.md`).
