# Concept C: Control Room

**The idea.** Version Control as the console an analyst keeps open all day. One screen answers "what shipped, who disclosed what, and what was measured" without scrolling: four headline measures, a release grid with one row per lab and one cell per week since ChatGPT, a live feed of the newest entries, twelve lab panels on one scale, and a rail of findings computed from the record. Everything is one selection. Drag across the grid, pick a year, click a lab or a country, and every measure, panel, chart, table and the explorer link follow; the selection lives in the address, so any view can be shared. A command palette (Ctrl K or Cmd K) jumps to any of the 366 entries, any lab or any view. Compare puts two labs side by side on shared scales, as a comparison of records and never a ranking. The explorer is a windowed data grid with a filter in every column and an inspector that shows every source, its archived copy and the settings behind each score.

## Pages

- `index.html`: the console (overview).
- `explorer.html`: the full record. Sticky header and first column, a filter in every column, sortable headers, windowed rows (about 36 of 366 in the DOM at a time), LAB and IND chips, inline deltas and refusals, disclosure cells, and a right-side inspector. On a phone the grid becomes a list of two-line rows and the inspector a full-screen sheet; Back closes it. URL state: `q`, `lab`, `year`, `type`, `avail`, `country`, `gpqa`, `swe`, `sc`, `mc`, `up`, `pa`, `params`, `origin`, `from`, `to`, `sort`, `id`.
- `page.html`: the methodology's introduction and four rules, verbatim, each beside a note counted from the record at load.

## Systems

**Type.** Mona Sans (variable, width 100 to 125) for every word; width rises a little for titles (112%) and the wordmark (118%) instead of switching face. Martian Mono at 87.5% width for figures, dates and IDs only. Scale: 11 / 12 / 13 / 14 / 15 / 20 / 22 / 26 px. Both from Google Fonts, requested at only the axes in use.

**Colour.** Dark by default, graphite rather than blue-black (`#111110` ground, `#171716` panels); a light theme on a neutral off-white, remembered on the device (localStorage, wrapped in try/catch). Colour goes on data only, and every meaning has one reserved encoding that nothing else borrows:

| Meaning | Mark | Dark | Light |
| --- | --- | --- | --- |
| A release | amber cell, bar or tick | `#c98422`, heat ramp to `#f0b354` | `#b26a00`, ramp to `#6e4200` |
| IND (independent, Epoch AI) | filled circle, tag "IND" | `#3a9dc2` | `#0b7fa6` |
| LAB (reported by the lab) | open diamond, outlined tag "LAB" | `#d2668a` | `#c2406a` |
| Link on record | filled square | ink | ink |
| Not disclosed | empty square | `#b5b0a6` outline | `#56534d` outline |
| Not yet researched | short dash, italic words | `#7c776e` | `#8b877e` |

The three categorical hues pass the dataviz validator in both modes (lightness band, chroma, CVD separation ΔE 9.8 deutan, contrast). Status never leans on colour alone: LAB and IND always carry their word, and the three disclosure states differ in shape and in words. Shares divide by researched releases only and print their denominators; "not yet researched" is listed beside every share and never counted as absent.

**Motion.** Feedback only: hover and focus states, the brush and the cursor in the release grid, the sheets opening. Nothing performs an entrance and no content waits on an animation. `prefers-reduced-motion` removes every transition and smooth scroll; every view is reachable and correct without motion.

**Layout.** Four rows on a `1fr / 368px` grid at desktop. Rows balance by measurement: the feed fills the height of the grid beside it, the scores chart grows to meet the pairs table, the disclosure squares grow to meet the right column. Below 1040px one column; below 720px a bottom tab bar (Overview, Explorer, Search, Method, Theme), dates and country behind "More filters", long panels folded by default, month cells instead of week cells.

## Libraries

None. Vanilla JavaScript and hand-built SVG; no CDN scripts, so no SRI is needed. Fonts: Mona Sans and Martian Mono from Google Fonts. Transfer measured with gzip (as GitHub Pages serves it) on a throttled phone (4x CPU, 150 ms RTT, 1.6 Mbps): about 240 KB in total including 70 KB of data; first contentful paint about 0.75 s, the console filled with data about 1.8 s (explorer 2.1 s, prose page 2.0 s).

## Claim-bearing sentences added

Numbers in braces are computed at load. Everything else on the three pages reuses wording from `methodology.html`, `about.html`, `data.html`, `site/js/app.js` or the story's text version (the findings rail reuses the story's sentences with runtime numbers).

1. "{366} entries from twelve tracked labs, {2022-11-30} to {2026-10-17}: {352} releases and {14} revisions."
2. "{98} by the same date in {2025}. Revisions are counted apart."
3. "All twelve labs pooled; same-day releases count as 0. Line: the 365-day median since 2023."
4. "{51} of {164} researched. {188} not yet researched, so not counted."
5. "{Meta}, {2026-10-15}. {4} days before the last update ({2026-10-19})."
6. "Every one is Epoch AI's measurement." (closing the independent-scores finding)
7. "The same release and benchmark, scored by the lab and by Epoch AI. Both numbers are kept; they are never averaged."
8. "Gap is the lab's number minus Epoch's. Settings are read from the configuration on record; "not stated" means the record does not say."
9. "{54} changes against a predecessor are on record. {3} comparisons were refused."
10. "{175} of {352} releases in view shipped with open weights ({50}%). This share divides by all releases: availability is on record for every one."
11. "Two records side by side, on the same scales. A comparison of what is on record, not a ranking."
12. "Squares show the latest {11} of {48} releases; counts are links on record of researched releases, all {48}."
13. "Every GPQA Diamond score on record, by release date. Percentages from 0 to 100; a vertical line joins two scores of one release."
14. "{132} of {132} carry a source URL, a benchmark name and version, and a retrieval date." (page note, rule 1)
15. "The share counts only the {164} researched: {31}%. Not yet researched is never a zero." (page note, rule 2)
16. "Two benchmarks, each held to one version." (page note, rule 4)
17. "The record's first {2} releases, from 2022, are in the table view."
18. Explorer inspector: "This entry is outside the current filters." and, under a refusal, "A change is shown only when both scores share a benchmark, its version and the kind of source."

## Quality gate

- taste-skill v2 inspector, `--app`, at 1440 / 768 / 390: `index.html` 0 FAIL, 1 WARN; `explorer.html` 0 FAIL, 0 WARN; `explorer.html?id=openai--gpt-5.5` (inspector open) 0 FAIL, 0 WARN; `page.html` 0 FAIL, 0 WARN.
  - Defended WARN, `panel-void` in "Scores over time": the blank band is the 0 to 25 part of a fixed 0 to 100 percentage axis; cutting the axis to remove it would exaggerate the climb.
- Playwright: no sideways scroll and no console errors on all pages at 1440, 768 and 390, with and without reduced motion; Tab reaches every control from the skip link to the footer with a visible focus ring; Ctrl K, Escape, `?`, `c`, `t`, `j`, `k` work; brushing writes `from` and `to` and the measures and feed follow; the theme persists across reloads; the grid is windowed; phone list, sheet and Back work. One tap-target exception: the inline "Walker Robinson" link in the footer sentence (WCAG 2.5.8 inline exception).
- `pipeline/lint_voice.py` page-copy lint over every string in the concept: 0 violations. No em dashes, en dashes or spaced double hyphens.

## Self-critique: where it is weakest

- **Keyboard path length.** The feed renders up to 80 links, so tabbing from the grid to the lab panels is long. A roving tabindex inside the feed would make it one stop.
- **Week cells are small.** At 1440 each week is about 4 px wide. Hover, the tooltip, keyboard arrows and the table view all reach every cell, but pointer precision on a laptop trackpad is fiddly, and on a phone the cells become months.
- **The balancing is computed.** The scores chart and the disclosure squares change size to make columns end on one line. That keeps the grid honest but means the chart's aspect depends on the pairs table's length.
- **The lowest heat step is quiet.** One release in a week against an empty cell is about 2:1 in dark and lower in light. Every cell's count is in its tooltip and in the table view, but the faintest step is easy to miss on a dim screen.
- **The type is from the Google shelf.** Mona Sans and Martian Mono were chosen for their width axes and tabular figures; a licensed face would carry more identity.
- **The phone overview is still long,** even with four panels folded. A phone-first build would likely show the grid and the feed only and push the rest behind tabs.
- **Native date inputs** show the browser's locale format while every other date on the page is ISO.
