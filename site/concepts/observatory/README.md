# Concept A: Observatory

**The idea.** The release record is drawn as a night sky. Time runs left to right from ChatGPT to the day of the last update, each of the twelve labs has its own lane, and every entry is a point of light whose glyph carries its record: the core lights up when an independent score is on record, an amber companion ring marks a lab-reported score, and a four-part halo shows the four documents (system card, model card, usage policy, paper) as solid (on record), dashed (not disclosed) or a single faint dot (not yet researched). The same 366 stars then move through the scroll sequence: they fall into monthly columns to form a luminous histogram, gather into twelve lab "systems" whose orbits show what each lab published (absence is a gap in the orbit, never a zero), rise to their independent GPQA Diamond and SWE-Bench Verified scores with long-exposure trails, and pair up as binary stars where a lab and Epoch scored the same release. The explorer is the same sky as an instrument: zoom, pan, brush, filter, and open any star into a drawer with its full provenance.

## Pages

- `index.html`: hero sky, the five-chapter scroll sequence, six findings, the door into the record (search plus the newest releases).
- `explorer.html`: the whole record. Filter rail (search, lab, country, type, availability, scores, dates), zoomable and brushable sky, result list, entry drawer (bottom sheet on phones). State lives in the URL; `explorer.html#<entry-id>` opens an entry.
- `page.html`: the methodology's introduction and four rules, verbatim, with a live specimen from the record beside each rule.

## Systems

**Type.** Mona Sans (variable, width 75 to 125) for everything a reader reads: the display cut runs wide (font-stretch 112 to 125%) and tight; text runs at normal width. Martian Mono appears only where the content is literally technical: chart axes and year marks on the canvases, and entry ids in `<code>`. Both from Google Fonts.

**Colour.** One ground, a warm night `#0D0B09`, stepped up by tone for surfaces (`#15120F`, `#1E1A16`, `#2A251F`); no borders or shadows define boxes. One ink, starlight `#EAE8E5`, with two quieter inks for secondary text. Two accents, each with one job and validated with the dataviz skill's palette checker against the ground (lightness band, chroma floor, CVD separation, normal-vision floor and contrast all pass): amber `#C2852F` means lab-reported, ice `#2FA3BF` means independent. Text never wears the mark colours; LAB and IND always carry a shape (hollow ring, filled dot) and the word. No per-lab hues. The old green and cream are gone.

**Motion.** Motion carries the narrative and nothing else. In the hero a slow transit line sweeps from ChatGPT to today and each star flares as it is passed. In the sequence the same star particles travel between scenes with a staggered ease (earlier releases move first), and overlays cross-fade. Cards and findings settle into place with a transform only; nothing is ever hidden waiting for an animation. Under `prefers-reduced-motion` the sweep is off, scene changes are instant and every transition is zero; every view is reachable and correct.

**Shape.** 2px corners on every surface and control.

## Libraries

None. Canvas2D, IntersectionObserver, ResizeObserver, Pointer Events and `DecompressionStream` only. Fonts from Google Fonts. The data loads from `../../data/` (the deployed layout) with a fallback to `../../../data/` (the repo layout).

## Honesty encodings

- Absence: not disclosed is a dashed arc on a star and a gap in an orbit; not yet researched is a faint dot or dotted arc; neither is ever drawn as zero. Shares divide by researched releases and say so. Scores that are missing sit in a labelled band under the axis, not at 0.
- Provenance: LAB and IND are distinguishable by shape, colour and word in the charts, the tooltip, the list, the drawer and the phone layout. LAB scores and independent scores never share a line; the two benchmarks never share an axis.
- Refusals: the three refused predecessor comparisons get their own scene and appear in each drawer with the recorded reason. Deltas and refusals are read verbatim from `deltas.json.gz`.
- Every number on every page is computed from the record at load time (`js/obs-data.js` mirrors `pipeline/build_story.py`; a node check against the story's text version matched sentence for sentence).

## Claim-bearing sentences added

Numbers in braces are computed at runtime; the values shown are today's.

1. Each point of light is one of {352} releases from twelve tracked labs, with its sources, its disclosures and its scores.
2. Each star drops into the month it shipped, and the columns become a count of releases per month.
3. {47} more paper links are under review and not yet on record.
4. {167} of the {168} releases we researched for a usage policy have one on record. {184} releases are not yet researched for it.
5. Releases with no score on record wait in the band under the axis, never at zero.
6. The two benchmarks never share a line or an axis.
7. We show a change against the previous model only when both scores are on the same benchmark, the same version of it, and from the same kind of source. {Three} comparisons on record were refused: {GPT-5.4, GLM-5.2 and Claude Sonnet 5} ({different provenance classes}).
8. Every star on this page opens to its full record: sources, archived copies, disclosures, and scores with their provenance.
9. Every entry opens to its sources, an archived copy where one exists, its disclosure record and its scores with their provenance. Each entry has its own link.
10. Findings: {45} releases in {2023}, {120} in {2025}. / {Anthropic}: about {104} days, then about {21}. / Every independent score here is Epoch AI's measurement. / Of researched releases, {2} of {18} had a system card in {2023}, and {19} of {40} in {2026} so far.
11. Explorer: A filter for context, never a ranking. / No benchmark score is recorded for this entry. That is not a disclosure signal. / {+7.5} points against the predecessor ({name} scored {73.2}), on the same benchmark, version and kind of source. / No comparable measurement against the predecessor. Reason on record: {reason}.
12. Methodology specimens: Across the four documents and every release on record: {428} links on record, {293} not disclosed, {687} not yet researched. / The published file holds {54} computed comparisons and {3} refused ones. / Scores on record per benchmark version. The charts draw each version on its own axis.

Everything else is reused from `methodology.html`, `about.html` or the story's computed text.

## Self-critique (where it is weakest)

- **Canvas text is invisible to assistive tech and to search.** Every chart has an accessible name, keyboard navigation (arrow keys walk the lanes, Enter opens) with a live region, and a table at the end of each chapter, but the labels drawn on the canvases are pixels. A reader with a screen reader gets the tables, not the pictures.
- **The hero halos are tiny.** At full zoom a halo is about 8px across; the four states are legible on a good screen and in the explorer when zoomed, but on a phone hero they read as texture until tapped. The tooltip and drawer carry the words.
- **Dense months overlap.** The lane layout nudges same-week releases sideways, but heavy weeks in 2025 and 2026 still cluster; the explorer zoom is the answer, not the hero.
- **The constellation shows order, not dates.** Orbit position is release order clockwise, so time within a lab is readable but years are not marked on the rings; the by-year shares live in the chapter text and table.
- **Mobile scenes are small.** On a phone the sticky chart gets the top half of the screen; the orbits scene in particular is at the edge of legibility (system radius about 38px).
- **Inspector exceptions defended:** `no-real-pictures` / `no-footage`: the brief forbids stock imagery and the subject has no honest photograph; the canvases are the pictures. `lopsided` (desktop story chapters): the empty right side of each chapter is the sticky chart, which sits in a sibling layer the meter cannot see. `pinned-over-picture` (768px): on tablets and phones the step cards dock below the chart by design and only cross it while scrolling between steps. `size-count`: eleven sizes, because the findings figures, chapter cards and long-read share one page. `off-centre` (methodology, 1440px) is the specimen column ending at the grid line, 22px short of the margin. `still-page` (methodology): a long read should sit still; nine parts settle in and that is enough. Explorer `app-title-size` and `below-fold`: the title is a page title on a public site, and the result list sits under the instrument on purpose. Explorer `tabular`: the body sets `tabular-nums` globally; the meter counts figures inside buttons as untabulated.

Final inspector counts: index 0 FAIL / 5 WARN, explorer (`--app`) 0 FAIL / 3 WARN, methodology 0 FAIL / 4 WARN.
