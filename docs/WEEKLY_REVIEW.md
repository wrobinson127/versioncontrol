# Weekly review of pending candidates

Ruling 2026-11-09 (Walker): candidates are reviewed once a week, not every
morning. The nightly keeps detecting and queuing every night; nothing about
detection changes. What changes is when a person looks.

## The day

**Monday**, after the 08:20 UTC nightly has run. That run covers the
weekend, so the list holds a full week. `pipeline/config.py` records the day
(`REVIEW_WEEKDAY`) and the interval (`REVIEW_INTERVAL_DAYS = 7`).

## The morning report between reviews

The nightly still writes its morning report and refreshes the review PR
("Pending release candidates", head `nightly-pending`) every night. A
candidate that has waited up to seven days is normal and is listed without a
flag. One that has waited longer than seven days has sat through a weekly
review with no decision, and the report's FLAGS section names it:
`OVERDUE: N candidate(s) queued more than 7 days, past a weekly review`.
The flag is informational; it does not fail the run.

## The procedure (Claude Code, each Monday)

1. `git fetch` and read every candidate file in `data/pending/` on
   `origin/nightly-pending` (not `rejected.json`).
2. Check each against the record, `data/pending/rejected.json`,
   `content/scope_rulings.md` and `content/scope_exclusions.json`, so each
   default cites a precedent where one exists.
3. Send Walker one list, one row per candidate:

   | # | Model | Org | Date | Source | Default |
   |---|---|---|---|---|---|

   - **Source** is the URL the candidate was detected on, and the detector
     that found it (Epoch row, lab page, Hugging Face repo, API catalog).
   - **Default** is yes or no with one short reason ("No: image generation,
     precedent openai--chatgpt-images-2.5"). A yes on a candidate with no
     lab-page draft says so: "Yes, after anchoring on the lab's own page".
4. Walker answers per row (`1 yes, 2 no, ...`) or with "defaults". A default
   is a recommendation only. **No answer means nothing publishes**: an
   unanswered row stays queued and is flagged OVERDUE the next week.
5. For each **no**: `python -m pipeline.pending reject <id> --reason "..."`,
   with the reason from the list. This records the id and URLs in
   `rejected.json`, so the candidate is not re-proposed.
6. For each **yes**:
   - If the draft was not read from the lab's own page (an OpenRouter, arXiv
     or Hugging Face anchor, or no draft), re-anchor it on the lab's page and
     write the copied fields (name, org, date, availability) from that page.
   - Set `"approved": true` in the candidate file.
7. Run `python -m pipeline.promote --run-date YYYY-MM-DD`, then
   `python -m pipeline.build_story`, `python -m pipeline.validate` and
   `python -m pytest -q`. Commit to `nightly-pending` and push. (The
   promote workflow does the same on GitHub.)
8. The review PR is the one PR for the week. Its diff shows every promoted
   entry, including the summary text, which is claim-bearing: Walker reads
   it there. Claude Code merges only on Walker's explicit OK for that PR
   (ruling C1), then confirms the merge on GitHub.

## What does not change

- Nothing publishes without Walker's approval. A default is not an approval.
- Claim-bearing text (summaries, benchmark numbers, disclosure findings)
  never publishes without Walker reading it.
- An auto-approve rule has been designed and backtested
  (`docs/AUTO_APPROVE_BACKTEST.md`) but is not switched on. Walker decides
  after reading the backtest.
