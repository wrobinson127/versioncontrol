# Source verification

What every upstream source was checked for before the registry was built, what was found, and
what is known to be unreliable about each. Fetches were performed live on 2026-07-16 and
2026-07-17 (UTC); the captures are committed under `pipeline/tests/fixtures/` so the adapter
tests run against real specimens rather than invented ones. The raw Epoch CSV is held locally
and is not committed.

This is a dated record of that verification, not a live status page. The pipeline has changed
since. `docs/METHODOLOGY.md` and the site's methodology page are the current contract.

---

## Epoch AI models dataset: schema

Source: `https://epoch.ai/data/all_ai_models.csv`. HTTP 200, 6,712,040 bytes, 3,555 data rows,
57 columns.

Full header, in order:

```
Model, Domain, Task, Organization, Authors, Publication date, Reference, Link,
Citations, Notability criteria, Notability criteria notes, Parameters,
Parameters notes, Training compute (FLOP), Training compute notes,
Training dataset size (total), Dataset size notes, Training time (hours),
Training time notes, Training hardware, Approach, Confidence, Abstract, Epochs,
WikiText and Penn Treebank data, Model accessibility, Country (of organization),
Base model, Finetune compute (FLOP), Finetune compute notes, Hardware quantity,
Hardware utilization (MFU), Last modified, Training cloud compute vendor,
Training data center, Archived links, Batch size, Batch size notes,
Organization categorization, Foundation model, Training compute lower bound,
Training compute upper bound, Training chip-hours, Training code accessibility,
Accessibility notes, Possibly over 1e23 FLOP, Training compute cost (2023 USD),
Utilization notes, Numerical format, Frontier model, Training power draw (W),
Training compute estimation method, Hugging Face developer id,
Post-training compute (FLOP), Post-training compute notes,
Hardware utilization (HFU), Open model weights?
```

Columns the pipeline consumes, all present: `Model`, `Organization`, `Publication date`,
`Model accessibility`, `Parameters`, `Link`, `Reference`, `Notability criteria`,
`Accessibility notes`, `Open model weights?`, `Hugging Face developer id`, `Base model`,
`Last modified`.

Findings that shape the adapter:

- There is no dedicated license column. License information, where Epoch records it, lives in
  `Accessibility notes` and in the accessibility class itself (`Open weights (unrestricted)` /
  `(restricted use)` / `(non-commercial)`). The data model treats license as derived from those
  two fields and never asserts beyond them.
- `Link` may be empty on recent rows, and may contain multiple URLs separated by newlines or by
  comma-space. The adapter splits on both and tolerates absence.
- Epoch names silent snapshot revisions with a parenthetical month convention: `GPT-4 (Mar 2023)`,
  `GPT-4o (Mar 2025)`, `DeepSeek-V3 (Mar 2025)`. That convention maps onto the `revision` entry
  type, and the correlator uses it.
- `Model accessibility` observed values: `API access`, `Open weights (unrestricted)`,
  `Open weights (restricted use)`, `Open weights (non-commercial)`, `Unreleased`, empty.
- `Organization` is a comma-joined list for collaborations. Registry matching uses the primary
  (first) organization plus an exact-spelling set held in `pipeline/config.py`.

All 57 columns are pinned in `pipeline/config.py` (`EPOCH_EXPECTED_COLUMNS`, plus the consumed
subset `EPOCH_CONSUMED_COLUMNS`). The nightly Epoch detector asserts the pin against the live
header and fails loudly on drift rather than silently reading a moved column.

## Epoch AI models dataset: accuracy against known releases

Ten releases chosen in advance, ten found. Nine registry organizations; five open-weights, five
API-only. The URL status column is the HTTP response retrieved live on 2026-07-16.

| Release | Org (Epoch spelling) | Epoch date | Lab announcement | Delta | URL status |
|---|---|---|---|---|---|
| GPT-4 (Mar 2023) | OpenAI | 2023-03-15 | 2023-03-14 | +1d | 200 |
| Llama 2-70B | Meta AI | 2023-07-18 | 2023-07-18 | 0 | 200 |
| Mixtral 8x7B | Mistral AI | 2023-12-11 | 2023-12-11 | 0 | 200 |
| Gemini 1.5 Pro | Google DeepMind | 2024-02-15 | 2024-02-15 | 0 | 200 |
| Claude 3 Opus | Anthropic | 2024-03-04 | 2024-03-04 | 0 | 200 |
| Qwen2.5-72B | Alibaba | 2024-09-19 | 2024-09-19 | 0 | 200 |
| DeepSeek-V3 | DeepSeek | 2024-12-24 | 2024-12-26 | -2d | 200 |
| Grok 3 | xAI | 2025-02-17 | 2025-02-17 | 0 | 200 |
| Kimi K2 | Moonshot | 2025-07-11 | 2025-07-11 | 0 | 200 |
| GPT-5 | OpenAI | 2025-08-07 | 2025-08-07 | 0 | 200 |

Across these ten launches the maximum date delta is 2 days, because Epoch pins paper or
repository dates where those differ from press dates. That holds for this sample of major launches,
not for the whole record: for some open-weight models Epoch's paper date falls weeks after the
weights shipped (DeepSeek's first models are one case), and the methodology page says so. The correlator's tolerance is set to 3 days accordingly. Epoch carried current
data at capture: 76 rows dated 2026, the most recent nine days before the capture.

## Detection signals

All four signal classes returned parseable output on 2026-07-16.

**Lab RSS.** `openai.com/news/rss.xml`: HTTP 200, 1,038 entries, parsed clean.
`deepmind.google/blog/rss.xml`: HTTP 200, 100 entries, parsed clean. Qwen's blog is Hugo and
exposes real RSS at `qwenlm.github.io/blog/index.xml` (HTTP 200, parsed), so Qwen sits in the RSS
column rather than the HTML-diff column. AWS blog RSS (`aws.amazon.com/blogs/aws/feed/`) is the
Amazon (Nova) signal, filtered on Nova-related titles.

**HTML news indexes.** Working with real content: Anthropic (`anthropic.com/news`, 200, 407KB),
xAI (`x.ai/news`, 200, 204KB), Mistral (`mistral.ai/news`, 200, 779KB), DeepSeek
(`api-docs.deepseek.com/news`, 200, 45KB), Cohere (`cohere.com/blog`, 200, 988KB), Moonshot via
`kimi.com/blog` (200, 110KB; `moonshot.ai` itself serves a 615-byte JavaScript shell), Z.ai via
`docs.z.ai/release-notes` (200, 309KB; `z.ai/blog` returns 404). Meta is blocked: see known
limitations below.

**Hugging Face organization listings.** Keyless API, all handles verified live:

| Registry org | HF handle | Status |
|---|---|---|
| OpenAI | `openai` | 200, active (open-weights side projects) |
| Anthropic | `anthropic` | 200, zero models (expected; kept as a tripwire) |
| Google (DeepMind) | `google` | 200, active (Gemma line) |
| Meta | `meta-llama` | 200, active |
| xAI | `xai-org` | 200, 2 models (grok-1, grok-2) |
| Mistral | `mistralai` | 200, active |
| DeepSeek | `deepseek-ai` | 200, active |
| Alibaba (Qwen) | `Qwen` | 200, active |
| Moonshot AI | `moonshotai` | 200, active |
| Z.ai (Zhipu) | `zai-org` | 200, active; legacy `THUDM` returned zero models and is dropped |
| Cohere | `CohereLabs` | 200, active |
| Amazon (Nova) | `amazon` | 200, active but noisy (mostly speculative-decoding repositories) |

Two of these are deliberate judgment calls rather than obvious choices: the `anthropic` handle is
kept despite carrying zero models, so that a first open-weights release would register; and the
`amazon` handle is kept despite being noisy, with Nova-pattern filtering applied downstream.

**Sibling-repository clustering.** Validated against zai-org's real release history (60 most
recent repositories). Suffix stripping (`-FP8`, `-Base`, quantization tags) plus same-day
`createdAt` grouping correctly clusters nine consecutive GLM releases: `GLM-5.2` and
`GLM-5.2-FP8` (both 2026-06-16) as one event, `GLM-4.5`, `GLM-4.5-FP8` and `GLM-4.5-Base` (all
2025-07-20) as one event.

**OpenRouter catalog.** `openrouter.ai/api/v1/models`: HTTP 200, 344 models, 529KB. Model objects
carry `id`, `canonical_slug`, `created` (a unix timestamp, so diffable), `context_length`,
`pricing`, and `hugging_face_id`. Used as a tripwire only. The site does not show its pricing,
and the catalog never enters the downloadable dataset.

## Volume and cost

Nightly workload: one Epoch CSV (6.7MB), three RSS feeds (~1MB), seven HTML indexes (~3MB),
twelve Hugging Face API queries (~1MB), one OpenRouter call (0.5MB). Roughly 25 requests and 12MB
per night, minutes of runtime.

Dataset growth: 404 Epoch rows were backfill-eligible at capture (registry organizations,
2022-11-30 forward, publicly usable, language or multimodal domain; that count includes 5 rows
with an empty Domain field, an over-count of about one percent) before variant clustering reduces
it. Recent cadence is roughly 150 rows per year before clustering. At a generous 250 published
entries per year and about 2KB gzipped per entry, five years is roughly 2 to 3MB of aggregates,
against GitHub Pages limits of 100MB per file and about 1GB per repository. No pressure.

## Adapter brittleness fixtures

Captured 2026-07-16 into `pipeline/tests/fixtures/captures/2026-07-16/`: `rss_openai.xml`,
`rss_deepmind.xml`, `rss_qwen_index.xml`, `rss_aws_blog.xml`, `html_anthropic.html`,
`html_xai.html`, `html_mistral.html`, `html_deepseek.html`, `html_cohere.html`, `html_qwen.html`,
`html_moonshot_kimi_blog.html`, `html_zai_release_notes.html`, `html_amazon_nova.html`,
`hf_org_samples.json`, `hf_zai_org_60.json`, `openrouter_models.json`.

One further capture, `html_moonshot.html` (615 bytes), is the JavaScript shell that
`moonshot.ai` serves to scripted fetches. It is kept deliberately as a negative example, so the
adapter's too-small-to-be-an-index guard has a real specimen to test against rather than a
synthetic one.

The fixture rows span 2023 through 2026 on purpose: `Link` format, accessibility values, and the
parenthetical revision naming are all era-dependent, and an adapter tested only against today's
shape breaks silently on older data.

## Extraction and voice lint

Three real historical announcements are committed as extraction fixtures:
`openai_gpt5_launch.html` (an API-only launch, 988KB), `mistral_mixtral_8x7b.html` (an
open-weights drop, 223KB) with `deepseek_v31_open.html` as a static open-weights backup (25KB),
and `openai_gpt41_point.html` (a point release, 797KB).

Verified by execution:

- The extraction prompt builds from all three fixtures with announcement text intact after HTML
  stripping, and stays inside the budgeted input size. Incidental finding: OpenAI typesets model
  names with a Unicode non-breaking hyphen (U+2011 in "GPT-4.1"), so the text normalizer folds the
  hyphen family to ASCII.
- Structured output parses and provenance fields populate. Emitted benchmark numbers carry the
  complete mandatory provenance block: source class, source URL, benchmark name **and** version,
  and retrieval date. Malformed JSON, missing fields, unknown availability classes, and non-ISO
  dates are all rejected. A number whose as-stated benchmark name does not match the pinned pair,
  for example a bare "GPQA" without the Diamond qualifier, is quarantined as an unpinned claim and
  cannot be published.
- The voice lint catches every seeded violation across all banned categories (quality adjectives,
  ranking language, editorial characterization, corporate speak, em dashes, git metaphor) and
  passes clean registrar-voice strings without false positives.

**Live round trip, verified 2026-07-17.** The check ran on GitHub Actions runners against the
three committed fixtures. On the first run all three extractions parsed with correct pinning
behaviour: GPT-5's bare "GPQA" claim was quarantined as unpinned, and the SWE-Bench Verified
numbers were captured. The voice lint refused one draft that had echoed the announcement's
"state-of-the-art", which is exactly what it exists to do. The extraction prompt was then
hardened against quoted promotional vocabulary, and the re-run came back clean: three drafts,
three lint passes.

The pinned drafting model is Claude Haiku 4.5 (`claude-haiku-4-5-20251001`). Its cost is metered and
capped in configuration (`pipeline/config.py`); we do not publish the figures.

## Naming

The registry tracks the versions of AI models. It is not a source-control tool and not an MLOps
product. The README's first sentence states this, to disambiguate from software "model version
control" tooling.

## Known source limitations

These were open at verification and are stated rather than hidden. Where one still applies, it
also appears on the methodology page.

1. **Meta's announcement surfaces block scripted fetches.** All `ai.meta.com` surfaces return
   HTTP 400. Meta coverage therefore leans on the `meta-llama` Hugging Face listing for the
   open-weights signal, Epoch for trailing confirmation, and OpenRouter as a tripwire. Where this
   leaves Meta's primary-source column empty, the methodology page says so rather than implying
   the disclosure does not exist.
2. **Moonshot and Z.ai index URLs are non-obvious.** `kimi.com/blog` and `docs.z.ai/release-notes`
   are the working indexes, rather than the more obvious `moonshot.ai` and `z.ai/blog`. Both are
   likelier than average to move, and a move shows up as a source examining zero records rather
   than as a quiet night.
3. **Artificial Analysis is for an internal coverage check only.** Their terms (Data Platform
   Terms v1.1) bar displaying or redistributing their data in a product like this one, so their
   figures never appear on the site or in the downloadable dataset. Their stated convention, verbatim: "Nulls mean
   'not measured' or 'not applicable'. They never mean zero." That is the same convention this
   registry uses.

## Third-party library licensing, verified 2026-07-17

- **GSAP and ScrollTrigger.** gsap.com/pricing states that GSAP is free for all users, covering
  all plugins including ScrollTrigger. The Standard License grants a non-exclusive worldwide
  license for commercial use at no charge; prohibited uses are limited to building competing
  no-code animation tools and to removing proprietary notices. Vendoring and redistribution are
  not explicitly addressed in the license text, so this project pins GSAP from its official CDN
  with subresource-integrity hashes rather than vendoring it.
- **D3** (the charting library). ISC license, permissive; pinned with subresource integrity.
- **Scrollama.** MIT.
