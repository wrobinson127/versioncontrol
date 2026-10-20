# Disclosure research protocol (2026-10-19)

The files in this folder are the evidence for the disclosure cells researched on 2026-10-19, one file per lab. This page is the protocol the research followed.

Version Control records, for every AI model release, whether the lab published four documents:
- system_card
- model_card
- usage_policy
- paper

Each cell holds one of these values:
- a URL to the document;
- `NOT_DISCLOSED`, a researched claim that we looked on the lab's own pages and the document does not exist for that model;
- `NOT_RESEARCHED`, meaning nobody has checked yet.

## Conventions

Each lab's existing approved rows in `content/disclosure_links/<org>.json` set its conventions, and the research matched them:
- which page counts as its model card (Hugging Face card, docs page, PDF);
- whether a lab-wide usage policy URL is used;
- how system cards are found (safety hubs, model-card hubs, technical reports filed as papers);
- what counts as a paper (an arXiv or lab technical report covering the model).

Where no convention existed, the closest one was applied and the notes say so. The public rules are in `docs/METHODOLOGY.md`.

## Method, for each cell
1. Look where the lab publishes that kind of document:
   - the announcement post;
   - the lab's model-card or system-card hub;
   - its Hugging Face org page for the model (model card = the HF README when the lab published one);
   - arXiv: search for the model name with the lab as author;
   - the lab's docs.
2. If the document is found, record the URL only after fetching it and confirming status 200. The page must be about this model, or explicitly cover it (for example, a family card that names it).
3. If every reasonable place was checked and the document does not exist, record `NOT_DISCLOSED`, with a note saying where we looked.
4. If it cannot be determined (the page is blocked, or the evidence is ambiguous), leave it `NOT_RESEARCHED` and say why. No guessed values and no invented URLs.
5. Cells that already held a URL or `NOT_DISCLOSED` were not changed.

## What each lab file records

Per release: the URLs fetched with their status codes, and the page text that supports each `NOT_DISCLOSED`. Every URL recorded in a row was rechecked for status 200 with a browser user agent, because some labs block bare clients. Walker Robinson approved the resulting rows.
