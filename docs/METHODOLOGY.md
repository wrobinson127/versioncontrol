# Methodology

This file mirrors the methodology page on the site (`site/methodology.html`). If the two ever disagree, the site page is the one we keep current, and this file is a bug.

Version Control is a public release record of AI models from twelve tracked AI labs. For each release we track when it shipped, how the public can use it, what it scored on independent evaluations, and whether the lab published a paper, a system card, a model card, and a usage policy.

Four rules apply to every number on the site.

## The four rules

**1. Every score names its source.** Each benchmark score carries a tag. `LAB` means the lab reported the score. `IND` means an independent evaluator measured it. The tag links to the source, and the record stores the source URL, the benchmark name and version, and the date we retrieved it. Our checks reject any score that has no source, so an untagged number cannot get onto the site.

**2. We record what a lab did not publish.** A release is recorded even when the lab publishes no system card, model card, usage policy or paper. Each missing item is marked "not disclosed (we checked)" (`NOT_DISCLOSED` in the data). That mark means we looked on the lab's own sites and found nothing. "Not yet checked" (`NOT_RESEARCHED`) means we have not looked yet: work we have not done, not a fact about the lab. Only checked releases count toward a percentage.

For releases before July 2026, we checked in mid-2026, and again in October 2026 for 161 releases, so a document the lab published after launch still counts. A link on record means the document exists; we do not grade what it says.

Parameter counts work differently. They come from Epoch AI's data, and we have not checked the labs' pages for them. Where Epoch has no count, the entry says "no count on record" (`NOT_DISCLOSED` in the data). Parameter percentages divide by all releases and say so.

**3. We do not compare scores that are not comparable.** A change against the previous model appears only when both scores are on the same benchmark, the same version of it, and from the same kind of source. If the previous model was scored but the pair does not match, the entry says "no change shown", and why. If the previous model was never scored, the entry says nothing: a missing score and a mismatched one are different things.

Comparisons between models are calculated before publishing. The site also works out counts, shares and medians for whatever view you filter to, using the rules on this page.

**4. Benchmark versions are fixed.** Every benchmark label carries its version: **GPQA Diamond** (graduate-level science questions), never "GPQA"; **SWE-bench Verified**, never "SWE-bench". A revised benchmark is a different test. We never draw a line, a delta, or a chart across two versions. Where a lab published its evaluation settings, they appear under the score as written. A lab-stated number whose benchmark name lacks the version is held back as an unpinned claim and never published as a number.

## Scope

We track twelve labs: OpenAI, Anthropic, Google DeepMind, Meta, xAI, Mistral, DeepSeek, Alibaba (Qwen), Moonshot AI, Z.ai (Zhipu), Cohere, and Amazon. The record starts on 2022-11-30, the day ChatGPT launched.

The list can grow. A lab is added when it ships a model that Epoch AI counts as notable, or that holds a top spot on major leaderboards over time. Every change to the list is logged with a date and a reason in `content/registry_log.md`, and the log is never edited.

The twelve labs were chosen in July 2026 for their record up to then, and the same list is applied back to 2022. Labs not chosen in July 2026 include Inflection, AI21 Labs, Aleph Alpha, Stability AI and 01.AI. Some large producers are not tracked yet: ByteDance, Tencent, Baidu, MiniMax, StepFun, Microsoft, NVIDIA and IBM. Growth in release counts partly reflects that choice. Because ByteDance, Tencent and Baidu are not tracked, the record cannot support a comparison between countries.

A release counts if it is a newly named model or version that the public can use: open weights, a public API, or a public service. Language models are in scope, and so are multimodal models that include language, which is why vision-language and audio-language models appear. Not in scope: third-party fine-tunes, quantized copies and reposts, research previews with no public access, and models Epoch AI classifies as neither language nor multimodal. If Epoch AI has left the classification blank, we decide by hand and mark the entry `manual`. OpenAI's o3-pro is one such entry. Rulings on edge cases are in `content/scope_rulings.md`; models kept off the record are in `content/scope_exclusions.json`.

A family of sizes announced together counts as one release, with the sizes listed as variants. When a lab updates a model under the same name, as with GPT-4o's dated snapshots, we record a `revision`. Revisions are counted separately and left out of release counts.

A release date is the date in Epoch AI's dataset, which is usually the announcement or paper date. For some open-weight models the paper came weeks after the weights, so Epoch dates them late. Where we found the date the weights went public, the record uses it and the entry shows a correction note with the old value and the evidence: DeepSeek's first models are one case (November 2023, where Epoch has January 2024). Other open-weight entries may still carry a paper date. For entries found by the nightly check or recorded by hand, the date is the day the lab announced the release.

We record the country where each lab's parent company is based (Google DeepMind counts as the United States, through Alphabet), and the overview and the explorer can filter by it. No page ranks or groups labs by country.

## How releases are detected

Each night a script watches four independent sources: Epoch AI's models dataset, lab announcement feeds and page changes, model repository activity, and API catalog listings. Signals about the same model are grouped into one candidate, and a candidate that passes our checks is drafted as an entry. Candidates wait on a review branch in the public repository and do not appear on the site until approved.

## Who decides, and how

Entries reach the record by three paths. We used AI tools on all three, and this is where.

- **The nightly check.** When the script finds a new release, a language model (Claude Haiku) drafts the entry's summary and pulls the lab's stated benchmark numbers from its announcement. Code checks every draft: a number with no source, or with a benchmark name that is not tied to a version, is rejected. Walker Robinson reads and approves every entry before it appears.
- **The October 2026 catch-up.** Releases from September and October 2026 waited in the review queue while it was stalled. Their entries were drafted with AI tools from the labs' own pages. Every URL was fetched, and Walker Robinson approved each entry.
- **The record built from Epoch AI's data** (up to its 2026-08-24 release). A script generated these entries from Epoch AI's data. No language model wrote them. Their disclosure links were researched with AI tools, every URL was fetched, and Walker Robinson approved the links. The lab-reported scores on older entries were also found with AI tools from the labs' own pages; each number and its URL was checked and approved the same way. The research evidence is in `docs/evidence/`.

Every entry added after the initial build from Epoch AI's data was approved by a person. The entries from that build were generated by script and checked by code against Epoch AI's rows, and Walker Robinson approved their disclosure links.

Each entry records how it reached the record, in a field called `origin`:

- `backfill-epoch`: generated by script from Epoch AI's dataset.
- `nightly-pipeline`: first found by the nightly check. The entry text was drafted by a language model, or, for the October 2026 catch-up, with AI tools from the lab's own pages. Code checked it, and Walker Robinson approved it.
- `manual`: found and recorded by hand, because the nightly check missed it or Epoch AI left its classification blank. Some of these were drafted with AI tools from the lab's own pages, then checked and approved the same way.

## The two benchmarks

We record two benchmarks. Each has a stable, versioned definition maintained by the people who built it, and each is measured independently on an ongoing basis. We do not define them; we fix the version and record the measurements.

- **GPQA Diamond**: the expert-validated "diamond" subset of GPQA, a graduate-level science benchmark from Rein et al. (2023), built to stay hard even with web access.
- **SWE-bench Verified**: a human-validated subset of SWE-bench (Jimenez et al., 2023), a software-engineering benchmark drawn from real GitHub issues. OpenAI screened the Verified subset in 2024 for tasks that are solvable and well specified.

Scores are percentages from 0 to 100, recorded as the source published them.

GPQA Diamond has 198 questions, so one question is worth about half a point. Two runs of the same model can differ by a few points by chance. A difference of a few points between two models can be chance too, and near the top of the scale small changes mean little.

Benchmarks decay. As training data grows, the test questions can end up inside it. We prefer versioned benchmarks run by independent parties, and we watch newer designs built to resist this, such as LiveCodeBench (Jain et al., 2024), which uses problems dated after a model's training cutoff. We watch it but do not record it: no LiveCodeBench numbers appear on the site or in the dataset.

## How each number is calculated

Every headline number is computed from the published files by a stated rule. Nothing is smoothed or modeled.

- **Gap rule**: when releases from all twelve labs are pooled, a gap counts only between two releases in the same calendar year.
- **Median gap between releases** (in the published views file): the median number of days between one release and the next, across all twelve labs, over the 365 days before each release. Because it pools twelve labs, it drops to a few days once the record is well populated. Releases on the same day count as a gap of zero. The window runs across year boundaries, but the gap from one year's last release to the next year's first is left out. The story's per-lab gaps count a lab's same-day releases once and do run across years.
- **Median gap this year** (a measure on the overview): the median number of days between one release and the next, limited to releases in the current calendar year. A different window, stated where it appears. The story's median for each year uses the same rule.
- **Releases per year and per month**: raw counts by date. Revisions are counted separately and left out of release counts.
- **Open-weights share**: releases with open weights in a calendar year, divided by all releases that year. Availability is on record for every release.
- **Releases with a paper link, or a system card link**: the number of releases with a link on record for that item.
- **Percentages**: a percentage of releases with a paper, system card, model card or usage policy on record divides by the releases we have checked for that item, never by all releases. A release we have not checked is not in the denominator. A parameter-count percentage divides by all releases, because those counts come from Epoch AI's data. Each percentage states its denominator.

## Sources

Release dates, lab names, parameter counts and availability come from Epoch AI's models dataset. The independent benchmark scores come from Epoch AI's benchmarking data. Both are used under CC-BY 4.0; the citations are in `DATA_LICENSE.md`.

All independent scores come from one evaluator, Epoch AI, and that is a limit: the view that sets lab scores against independent ones compares each lab's own report with Epoch alone. It holds only a few pairs so far, picked from recent major releases, and the lab and Epoch often run different settings (reasoning effort, number of attempts), shown under each score. With so few pairs it is not a test of whether labs overstate.

A second evaluator that publishes per-benchmark scores openly would strengthen the record. Few exist. We will not use leaderboards that combine several tests into one score, because a combined score cannot name its source. If a second source appears, its numbers will carry their own tag and will never be averaged with Epoch's. Lab-reported scores cite the lab's own publication.

We use Artificial Analysis's free data only for an internal check of which models we might be missing. Its terms do not allow us to display its numbers, and none appear on the site or in the dataset.

Where the site says "availability", it is showing Epoch AI's "Model accessibility" field under a shorter name. The values are Epoch's. OpenAI's Operator is one case to read with care: it carries Epoch's value (API access), though OpenAI's system card describes it at launch as a research preview.

Some counts for closed models are third-party reports that Epoch AI records (GPT-4's 1.8T is one). We label them as reported by others and leave them out of the parameter findings. The entry's `parameters_basis` field says which counts these are (`third_party`), and `parameters_note` keeps Epoch's note on where the count came from.

One finding on the site is that fewer recent releases have a parameter count in Epoch AI's data. That is not yet the same as labs publishing fewer counts: Epoch often adds counts for recent models late, and we have not checked the blanks against the labs' own pages.

## Pricing and context length

Prices quoted in an entry's summary are the lab's own figures. We do not show OpenRouter's prices or context lengths on the site, and OpenRouter's catalog is not in the dataset. We use that catalog only to spot new models.

## Corrections

When we find an error, the entry shows a correction note with the old value and the evidence. Red marks a correction or a retraction, and nothing else. Errors in Epoch AI's data are corrected the same way (`UPSTREAM_CORRECTIONS` in `pipeline/backfill.py`), and the original value stays in the note. OpenAI's Operator is one such entry: Epoch dated it 2023-01-23, and OpenAI announced it on 2025-01-23.

To report an error, open an issue: https://github.com/wrobinson127/versioncontrol/issues/new. Say which entry and what is wrong, and link a source if you have one.

## Known limits

- Lab-reported scores are added by hand-checked research or the nightly check. Most of the record has independent scores only.
- Benchmark coverage is thin in the early record, because the two benchmarks did not exist yet or were rarely run. Thin coverage shows as missing scores, which are never counted as zero.
- Summaries say what the sources support and attribute lab claims to the lab. They do not judge quality.
- Meta's main announcement site blocks automated reads, so Meta entries rely on Epoch AI's data, Meta's Hugging Face listings and, since October 2026, its research blog.
- The nightly news-page check only recognizes model names that contain a digit. A release with a name that has no digit and no API listing can be missed. Muse Wonder Full was found by hand.
- Each entry's predecessor is chosen by rule and can be wrong. A wrong predecessor can hide a comparison but cannot create a false one, because each comparison is checked on its own.
- A score goes on the snapshot it was measured on when the evaluator names one. When it does not, the score goes on the original release, and the entry shows the exact model string tested.
- When we match Epoch AI's scores to entries, a chat or instruct variant counts as the release it serves. This is the loosest rule in the match and the one most likely to change. The entry shows the exact model string tested.
- The record begins 2022-11-30 and does not reconstruct earlier history.
