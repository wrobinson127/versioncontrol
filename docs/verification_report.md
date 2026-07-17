# Phase 0 Verification Report

Date: 2026-07-16 (UTC). All fetches performed live from a residential connection; captures stored under `pipeline/tests/fixtures/`. Raw Epoch CSV stored locally under `data/raw/` (not committed).

Gate verdicts: 1 PASS, 2 PASS, 3 PASS, 4 PASS, 5 PASS, 6 PARTIAL (flagged, see below), 7 PASS.

---

## Gate 1: Epoch schema

Source: `https://epoch.ai/data/all_ai_models.csv`. HTTP 200, 6,712,040 bytes, 3,555 data rows, 57 columns.

Full header, in order, transcribed from the capture at `.scratch/epoch_header.json` (an earlier revision of this report mis-transcribed two columns; caught by phase review, corrected against the capture):

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

Columns the pipeline consumes, all present: `Model`, `Organization`, `Publication date`, `Model accessibility`, `Parameters`, `Link`, `Reference`, `Notability criteria`, `Accessibility notes`, `Open model weights?`, `Hugging Face developer id`, `Base model`, `Last modified`.

Findings that shape the adapter:

- There is no dedicated license column. License information, where Epoch records it, lives in `Accessibility notes` and in the accessibility class itself (`Open weights (unrestricted)` / `(restricted use)` / `(non-commercial)`). The data model treats license as derived from these two fields, never asserted beyond them.
- `Link` may be EMPTY on recent rows (observed on rows added within the last two weeks), and may contain MULTIPLE URLs separated by newlines or comma-space. The adapter splits on both and tolerates absence.
- Epoch names silent snapshot revisions with a parenthetical month convention: `GPT-4 (Mar 2023)`, `GPT-4o (Mar 2025)`, `DeepSeek-V3 (Mar 2025)`. This maps directly onto the D3 `revision` entry type and the correlator uses it.
- `Model accessibility` observed values: `API access`, `Open weights (unrestricted)`, `Open weights (restricted use)`, `Open weights (non-commercial)`, `Unreleased`, empty.
- `Organization` is a comma-joined list for collaborations. Registry matching uses the primary (first) organization plus an exact-spelling set captured in `pipeline/config.py`.

The expected-column set is pinned in `pipeline/config.py` (`EPOCH_EXPECTED_COLUMNS`, all 57, plus the consumed subset `EPOCH_CONSUMED_COLUMNS`); the nightly Epoch detector (built in P3) asserts the pin against the live header and fails loudly on drift.

## Gate 2: Known truth

Ten releases, ten found. Spans nine registry orgs; five open-weights, five API-only. Announcement URL column shows the HTTP status retrieved live on 2026-07-16.

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

Maximum date delta 2 days (Epoch pins paper or repo dates where they differ from press dates). Tolerance for the correlator set to 3 days. Epoch carries current data: 76 rows dated 2026, most recent 2026-07-07, nine days before this capture.

## Gate 3: Detection signals

All four signal classes returned parseable output on 2026-07-16.

**Signal 1, lab RSS.** `openai.com/news/rss.xml`: HTTP 200, 1,038 entries, parsed clean (bozo=0). `deepmind.google/blog/rss.xml`: HTTP 200, 100 entries, parsed clean. Bonus: Qwen's blog is Hugo and exposes real RSS at `qwenlm.github.io/blog/index.xml` (HTTP 200, parsed), so Qwen moves from the HTML-diff column to the RSS column. AWS blog RSS (`aws.amazon.com/blogs/aws/feed/`) works and is the Amazon (Nova) signal, filtered on Nova-related titles.

**Signal 2, HTML news indexes.** Working with real content: Anthropic (`anthropic.com/news`, 200, 407KB), xAI (`x.ai/news`, 200, 204KB), Mistral (`mistral.ai/news`, 200, 779KB), DeepSeek (`api-docs.deepseek.com/news`, 200, 45KB), Cohere (`cohere.com/blog`, 200, 988KB), Moonshot via `kimi.com/blog` (200, 110KB; `moonshot.ai` itself serves a 615-byte JS shell), Z.ai via `docs.z.ai/release-notes` (200, 309KB; `z.ai/blog` is 404). **Meta is blocked:** `ai.meta.com/blog/` and related surfaces return HTTP 400 to scripted fetches from this connection. FLAG below.

**Signal 3, Hugging Face org listings.** Keyless API, all handles verified live:

| Registry org | HF handle(s) | Status |
|---|---|---|
| OpenAI | `openai` | 200, active (open-weights side projects) |
| Anthropic | `anthropic` | 200, zero models (expected; keep for tripwire) |
| Google (DeepMind) | `google` | 200, active (Gemma line) |
| Meta | `meta-llama` | 200, active |
| xAI | `xai-org` | 200, 2 models (grok-1, grok-2) |
| Mistral | `mistralai` | 200, active |
| DeepSeek | `deepseek-ai` | 200, active |
| Alibaba (Qwen) | `Qwen` | 200, active |
| Moonshot AI | `moonshotai` | 200, active |
| Z.ai (Zhipu) | `zai-org` | 200, active; legacy `THUDM` returned zero models and is dropped |
| Cohere | `CohereLabs` | 200, active |
| Amazon (Nova) | `amazon` | 200, active but noisy (mostly speculative-decoding repos, not Nova) |

This mapping is captured in `pipeline/config.py` (`REGISTRY[org]["hf_handles"]`) and FLAGGED for Walker's confirmation per the handoff.

**Sibling-repo clustering.** Validated against zai-org's real release history (60 most recent repos). Suffix stripping (`-FP8`, `-Base`, quantization tags) plus same-day `createdAt` grouping correctly clusters nine consecutive GLM releases, e.g. `GLM-5.2` + `GLM-5.2-FP8` (both 2026-06-16) as one event, and `GLM-4.5` + `GLM-4.5-FP8` + `GLM-4.5-Base` (all 2025-07-20) as one event. Capture in `pipeline/tests/fixtures/captures/2026-07-16/hf_zai_org_60.json`.

**Signal 4, OpenRouter catalog.** `openrouter.ai/api/v1/models`: HTTP 200, 344 models, 529KB. Model objects carry `id`, `canonical_slug`, `created` (unix timestamp, diffable), `context_length`, `pricing`, `hugging_face_id`. Suitable as tripwire and for the display-only pricing fields under the D4 posture.

## Gate 4: Volume

Nightly workload: one Epoch CSV (6.7MB), three RSS feeds (~1MB), seven HTML indexes (~3MB), twelve HF API queries (~1MB), one OpenRouter call (0.5MB). Roughly 25 requests and 12MB per night, minutes of runtime. GitHub Actions allows far more per job; the private-repo free tier of 2,000 minutes per month absorbs a nightly job at ~5 minutes (about 150 minutes per month) with an order of magnitude to spare.

Dataset growth: 404 Epoch rows are backfill-eligible today (registry orgs, 2022-11-30 forward, publicly usable, language or multimodal domain; the count includes 5 rows with an empty Domain field, an over-count of about one percent inside an estimate) before D3 variant clustering reduces the count. Recent cadence is ~150 rows per year before clustering. At a generous 250 published entries per year and ~2KB gzipped per entry, five years is roughly 2 to 3MB of aggregates against Pages limits of 100MB per file and ~1GB per repo. No pressure.

## Gate 5: Adapter brittleness fixtures

Captured 2026-07-16 into `pipeline/tests/fixtures/captures/2026-07-16/`: `rss_openai.xml`, `rss_deepmind.xml`, `rss_qwen_index.xml`, `rss_aws_blog.xml`, `html_anthropic.html`, `html_xai.html`, `html_mistral.html`, `html_deepseek.html`, `html_cohere.html`, `html_qwen.html`, `html_moonshot_kimi_blog.html`, `html_zai_release_notes.html`, `html_amazon_nova.html`, `hf_org_samples.json`, `hf_zai_org_60.json`, `openrouter_models.json`. One additional capture, `html_moonshot.html` (615 bytes), is the JS shell that `moonshot.ai` serves to scripted fetches; it is kept deliberately as a negative-example fixture so the adapter's too-small-to-be-an-index guard has a real specimen to test against. Adapter tests asserting against these fixtures are built with the detectors in P3 (extraction and voice-lint tests exist now under `pipeline/tests/`); this gate's deliverable is the captures themselves. Era-drift lesson applied to Epoch specifically: the adapter treats `Link` format, accessibility values, and the parenthetical revision naming as era-dependent, with fixture rows spanning 2023 through 2026.

## Gate 6: LLM extraction (PARTIAL, flagged)

The gate asks for four things: run the extraction prompt on 3 real historical announcements, verify structured output parses, verify provenance fields populate, verify `lint_voice.py` catches a seeded violation, plus pricing arithmetic. Everything except the live API round trip was built and executed; the round trip is blocked on a missing key and FLAGGED.

Verified by execution (test run: `python -m pytest pipeline/tests`, 13 passed):

- Three real historical announcements captured as extraction fixtures: `openai_gpt5_launch.html` (API-only launch, 988KB), `mistral_mixtral_8x7b.html` (open-weights drop, 223KB) plus `deepseek_v31_open.html` as a static open-weights backup (25KB), and `openai_gpt41_point.html` (point release, 797KB).
- The extraction prompt (`pipeline/extract.py`) builds from all three fixtures with announcement text intact after HTML stripping and stays inside the budgeted ~4K-token input size. Incidental finding: OpenAI typesets model names with a Unicode non-breaking hyphen (U+2011 in "GPT-4.1"); the text normalizer folds the hyphen family to ASCII.
- Structured output parses and provenance fields populate: `parse_extraction` validates a realistic extraction output shaped exactly as the prompt requests and emits benchmark numbers carrying the complete mandatory provenance block (source class, source URL, benchmark name AND version, retrieval date). Malformed JSON, missing fields, unknown availability classes, and non-ISO dates are rejected. Numbers whose as-stated benchmark name does not match the pinned pair (for example bare "GPQA" without the Diamond qualifier) are quarantined as unpinned claims and cannot be published.
- `pipeline/lint_voice.py` catches all 15 seeded violations across every banned category (quality adjectives, ranking language, editorial characterization, corporate speak, em dashes, git metaphor) and passes 5 clean registrar-voice strings without false positives.
- Current pricing verified against the live model documentation on 2026-07-16. Chosen model: Claude Haiku 4.5, pinned ID `claude-haiku-4-5-20251001`, $1.00 per million input tokens, $5.00 per million output tokens.
- Cost arithmetic: one extraction call at ~4,000 input + ~400 output tokens costs 4,000 x $1/1M + 400 x $5/1M = $0.004 + $0.002 = **$0.006 per call**. At the observed cadence of 10 to 15 detection-positive nights per month: **$0.06 to $0.09 per month expected**, with a 3x retry buffer still under $0.30. The $2.00 monthly hard cap corresponds to 333 calls; `pipeline/config.py` sets `LLM_MONTHLY_CALL_CAP = 300`. One-time backfill assist, if used on ~150 entries, is ~$0.90, under the $5 target.

**Live round trip: VERIFIED 2026-07-17.** After Walker added `ANTHROPIC_API_KEY` as a GitHub Actions secret, the check ran on real Actions runners against the three committed fixtures (workflow runs 29550247737 and the follow-up on branch verify/llm-live, since deleted). First run: all three extractions parsed with correct pinning behavior (GPT-5's bare "GPQA" claim correctly quarantined as unpinned; SWE-Bench Verified numbers captured), and the voice lint REFUSED one draft that echoed the announcement's "state-of-the-art", exactly as the gate is designed to do. The extraction prompt was hardened against quoted promotional vocabulary and the re-run came back all clean: three drafts, three lint passes, $0.018 total, within the cost arithmetic above. Gate 6 is closed.

## Gate 7: Name context

`grep -i "the earlier working name"` across tracked files and drafted copy: zero matches. (The word does appear inside third-party abstract text in the gitignored raw Epoch CSV, which is not project copy.) README's first sentence carries the tagline and states that the project tracks AI model versions and is not an MLOps tool, disambiguating from software "model version control" tooling.

---

## Amendment 1 gate: D17 library licensing (verified 2026-07-17)

- **GSAP + ScrollTrigger**: gsap.com/pricing states "GSAP is now 100% free for all users, thanks to Webflow's support", covering all plugins including ScrollTrigger. The Standard License grants a non-exclusive worldwide license for commercial use at no charge; prohibited uses are limited to building no-code animation tools competing with Webflow and removing proprietary notices. Vendoring/redistribution is not explicitly addressed in the license text, so this project pins GSAP from its official CDN with SRI hashes rather than vendoring (satisfies D17's "vendored or CDN-pinned with SRI").
- **D3**: ISC license, permissive; pin with SRI.
- **Scrollama** (approved fallback): MIT.

## FLAGs raised by Phase 0

1. **Meta announcement source blocked.** All `ai.meta.com` surfaces return HTTP 400 to scripted fetches. Interim Meta coverage: HF `meta-llama` (open-weights signal), Epoch trailing detection, OpenRouter tripwire. Worth retesting from a GitHub Actions runner IP before launch; if still blocked, Meta's primary-source column stays empty by design and the methodology page says so.
2. **HF org-to-handle mapping needs Walker's confirmation** (table in Gate 3). Two judgment calls: keeping the empty `anthropic` handle as a tripwire, and keeping the noisy `amazon` handle with Nova-pattern filtering.
3. **No ANTHROPIC_API_KEY in the build environment** (Gate 6). Live extraction verification deferred; needs the key locally and as an Actions secret before the nightly can extract.
4. **Moonshot and Z.ai sources are non-obvious**: `kimi.com/blog` and `docs.z.ai/release-notes` are the working indexes captured in config. Noting because both are likelier than average to move.
