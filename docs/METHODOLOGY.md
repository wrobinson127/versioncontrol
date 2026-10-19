# Methodology

This file mirrors the methodology page on the site (`site/methodology.html`). If the two ever disagree, the site page is the one we keep current, and this file is a bug.

Version Control is a public release record of AI models from twelve tracked AI labs. For each release we track when it shipped, how the public can use it, what it scored on independent evaluations, and whether the lab published a paper, a system card, a model card, and a usage policy.

## The four rules

**1. Every score names its source.** Each benchmark score carries a tag. `LAB` means the lab reported the score. `IND` means an independent evaluator measured it. The record stores the source URL, the benchmark name and version, and the date we retrieved it. Our checks reject any score that has no source, so an untagged number cannot get onto the site.

**2. We record what a lab did not publish.** A release still gets a card when the lab publishes no system card, model card, usage policy, or paper. Each missing item is marked `NOT_DISCLOSED`. That mark means we looked. Where we have not checked yet, the value is `NOT_RESEARCHED`, shown as "not yet researched". For these four items, only researched releases count toward a percentage. For releases before July 2026, we looked in July 2026, so a document published after launch still counts. A link on record means the document exists; we do not grade what it says.

Parameter counts work differently. They come from Epoch AI's data, and we have not checked the labs' pages for them. In the data a missing count is stored as `NOT_DISCLOSED`, but the site shows it as "no count on record", because nobody looked. Parameter percentages divide by all releases and say so.

**3. We do not compare scores that are not comparable.** A change against the previous model appears only when both scores are on the same benchmark, the same version, and from the same kind of source. Otherwise the card says "no comparable measurement". Every comparison between models is calculated once, before publishing, and the site displays that result. The site only counts and rounds what is in the published files, and works out how many days old the record is.

**4. Benchmark versions are fixed.** The benchmark set is exactly two: **GPQA Diamond** and **SWE-Bench Verified**. "GPQA Diamond" is never "GPQA". A lab-stated number whose benchmark name lacks the version is held back as an unpinned claim and never published as a number.

## Scope

We track twelve labs: OpenAI, Anthropic, Google DeepMind, Meta, xAI, Mistral, DeepSeek, Alibaba (Qwen), Moonshot AI, Z.ai (Zhipu), Cohere, and Amazon (Nova). The record starts on 2022-11-30, the day ChatGPT launched.

The list can grow. A lab is added when it ships a model that Epoch AI counts as notable, or that holds a top spot on major leaderboards over time. Every change to the list is logged with a date and a reason in `content/registry_log.md`, and the log is never edited.

The twelve labs were chosen in July 2026 for their record up to then, and the same list is applied back to 2022. Labs that were prominent earlier and later faded are not counted, among them Inflection, AI21 Labs, Aleph Alpha, Stability AI and 01.AI. Some large producers are not tracked yet: ByteDance, Tencent, Baidu, MiniMax, StepFun, Microsoft, NVIDIA and IBM. Growth in release counts partly reflects that choice. Because ByteDance, Tencent and Baidu are not tracked, the record cannot support a comparison between countries.

A release counts if it is a newly named model or version that the public can use: open weights, a public API, or a public service. Language models are in scope, and so are multimodal models that include language. Not in scope: third-party fine-tunes, quantized copies and reposts, research previews with no public access, and models Epoch AI classifies as neither language nor multimodal. If Epoch AI has left the classification blank, we decide by hand and mark the entry `manual`. Rulings on edge cases are in `content/scope_rulings.md`; models kept off the record are in `content/scope_exclusions.json`.

A family of sizes announced together counts as one release, with the sizes listed as variants. When a lab updates a model under the same name, as with GPT-4o's dated snapshots, we record a `revision`. Revisions are counted separately and left out of release counts.

A release date is the date in Epoch AI's dataset, which is usually the announcement or paper date. For some open-weight models the paper came weeks after the weights, so Epoch dates them late. Where we found the date the weights went public, the record uses it with a correction note (DeepSeek's first models: November 2023, where Epoch has January 2024). Other open-weight entries may still carry a paper date. For entries found by the nightly check or recorded by hand, the date is the day the lab announced the release. Corrected dates carry a correction note with the old value and the evidence.

We record the country where each lab's parent company is based (Google DeepMind counts as the United States, through Alphabet), and the timeline can filter by it. The story never ranks or groups labs by country.

## How releases are detected

Each night a script watches four independent sources: lab announcement feeds and news pages, organization-scoped Hugging Face listings, the OpenRouter catalog, and Epoch AI's models dataset. Signals about the same model are grouped into one candidate, and a candidate that passes our checks is drafted as an entry. Candidates wait in a review queue and have no public trace. Nothing is published without a person approving it.

## Who decides, and how

Entries reach the record by three paths. We used AI tools on all three.

- **The nightly check.** A language model (Claude Haiku) drafts the entry's summary and pulls the lab's stated benchmark numbers from its announcement. Code checks every draft: a number with no source, or with a benchmark name that is not tied to a version, is rejected. Walker Robinson reads and approves every entry before it appears.
- **The October 2026 catch-up.** Releases from September and October 2026 waited in the review queue while it was stalled. Their entries were drafted with AI tools from the labs' own pages. Every URL was fetched, and Walker Robinson approved each entry.
- **The record built from Epoch AI's data** (up to its 2026-08-24 release). A script generated these entries from Epoch AI's data. No language model wrote them. Their disclosure links were researched with AI tools, every URL was fetched, and Walker Robinson approved the links row by row. The lab-reported scores on older entries were also found with AI tools from the labs' own pages; each number and its URL was checked and approved the same way.

Each entry's `origin` field says which path it took:

- `backfill-epoch`: generated by script from Epoch AI's dataset.
- `nightly-pipeline`: first found by the nightly check. The entry text was drafted by a language model, or, for the October 2026 catch-up, with AI tools from the lab's own pages. Code checked it, and Walker Robinson approved it.
- `manual`: found and recorded by hand, because the nightly check missed it or Epoch AI left its classification blank. Some of these were drafted with AI tools from the lab's own pages, then checked and approved the same way.

## How each number is calculated

Every headline number is computed from the published files by a stated rule. Nothing is smoothed or modeled.

- **Median gap between releases** (in the published views file): the median number of days between one release and the next, across all twelve labs, over the 365 days before each release. Because it pools twelve labs, it drops to a few days once the record is well populated. Releases on the same day count as a gap of zero, and the window runs across year boundaries. The story's per-lab gaps count a lab's same-day releases once.
- **Median gap this year** (the tile on the home page): the same gap, limited to releases in the current calendar year.
- **Releases per year and per month**: raw counts by date. Revisions are left out.
- **Newest release on record**: the date of the newest release, shown with the date of our last update.
- **Percentages**: a share of releases with a paper, system card, model card or usage policy divides by the releases we have researched for that item. A parameter-count share divides by all releases. Each percentage states its denominator.
- **Under review**: a column shows "under review" when we have found links but not yet approved them. That is our backlog, not the lab's record, and it never shows as a zero or a percentage.

GPQA Diamond has 198 questions, so one question is worth about half a point, and two runs of the same model can differ by a few points by chance.

## Sources and licensing

- **Epoch AI, "Data on AI Models"** (release dates, lab names, parameter counts, availability) and **Epoch AI, "Capabilities & benchmarking"** (every independent score): CC-BY 4.0, citations in `DATA_LICENSE.md`. All independent scores come from one evaluator, Epoch AI. The lab-versus-independent view holds only a few pairs so far, picked from recent major releases and run at different settings, so it is not a test of whether labs overstate.
- **Lab announcements**: facts and links only; no republication of announcement text beyond short attributed fragments. Lab-reported scores cite the lab's own publication.
- **OpenRouter**: used only to spot new models. The site does not show OpenRouter's prices or context lengths, and its catalog is not in the dataset. Prices quoted in an entry's summary are the lab's own figures.
- **Artificial Analysis**: used only for an internal coverage check (models they track that we lack become review flags). Its terms do not allow us to display its numbers, so none appear on the site or in the dataset.
- The published dataset is CC-BY 4.0. The code is MIT.

## Corrections

When we find an error, the entry shows a correction note with the old value and the evidence. Red on the site means only that. Errors in Epoch AI's data are corrected the same way (`UPSTREAM_CORRECTIONS` in `pipeline/backfill.py`), and the original value stays in the note. To report an error, open an issue: https://github.com/wrobinson127/versioncontrol/issues/new

## Known limits

- Lab-reported scores come in through the nightly update. The older part of the record was built from independent scores first, so a recent release may show an independent score before the lab's own.
- Benchmark coverage is thin in the early record. Thin coverage shows as absence, not as zero.
- Meta's main announcement site blocks automated reads, so Meta entries rely on Epoch AI's data, Meta's Hugging Face listings and, since October 2026, its research blog.
- The nightly news-page check only recognises model names that contain a digit. A release with a name that has no digit and no API listing can be missed. Muse Wonder Full was found by hand.
- Each entry's predecessor is chosen by rule and can be wrong. A wrong predecessor can hide a comparison but cannot create a false one, because each comparison is checked on its own.
- A score goes on the snapshot it was measured on when the evaluator names one. When it does not, it goes on the original release, and the card shows the exact model string tested.
- When we match Epoch AI's scores to entries, a chat or instruct variant counts as the release it serves. This is the loosest rule in the match and the one most likely to change.
- The record begins 2022-11-30 and does not reconstruct earlier history.
