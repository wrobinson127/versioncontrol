# Verification notes: ten draft entries (retrieval 2026-10-19)

How this was checked: every URL was fetched with curl and a browser user agent on 2026-10-19, and the status shown is what came back. HTML was reduced to text and PDFs were read with pdftotext. Quotes are short fragments kept as evidence. All ten drafts were run through `pipeline.promote.candidate_to_entry` and `pipeline.validate.validate_entry` from the repo, read-only, and all returned zero errors. Every summary passes `lint_voice`. No draft contains an em dash or " -- ".

Points that apply to all drafts:
- **NOT_DISCLOSED will not survive promote as written.** `candidate_to_entry` turns any non-URL disclosure value into `NOT_RESEARCHED`. NOT_DISCLOSED only reaches the record through an APPROVED row in `content/disclosure_links/<org>.json`. To keep the researched NOT_DISCLOSED cells below, add matching rows there; the notes below can serve as the row notes.
- **Benchmarks: none recorded.** None of the ten lab announcement pages states a GPQA Diamond or SWE-bench Verified number. Anthropic and OpenAI system cards were also searched; their only mentions of GPQA or SWE-bench Verified are CoT-controllability task sources, with no score attached. One Meta GPQA Diamond figure exists but comes from Artificial Analysis (see entry 8).
- **OpenAI 403.** An earlier check found that openai.com returns 403 to tools. With a browser user agent, both openai.com announcement pages and the usage policy page returned 200 on 2026-10-19. Each OpenAI fact was also checked against a second host: the community staff post and deploymentsafety.openai.com.
- **Usage policy convention.** These match how existing entries handle each org. Anthropic uses https://www.anthropic.com/legal/aup in 20 rows. OpenAI uses https://openai.com/policies/usage-policies/ in 23 rows. xAI uses https://x.ai/legal/acceptable-use-policy in 13 rows. Meta has no lab-wide convention for the Muse line, so each Meta entry uses the policy the lab ties to that model.
- **xAI convention.** For xAI, the existing rows put the lab's "model card" PDF in the `system_card` column and mark `model_card` NOT_DISCLOSED. Grok 4.7 follows that.

---

## 1. anthropic--claude-opus-5.5 (2026-09-22, public_api)
- 200 https://www.anthropic.com/claude-opus-5-5. The page header reads "September 22, 2026". Availability: "Claude Opus 5.5 is now available on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure." The page also gives the API model id `claude-opus-5-5`.
- 200 https://www.anthropic.com/claude-opus-5-5-system-card. It redirects to a www-cdn.anthropic.com PDF named "Claude Opus 5.5 System Card.pdf". The announcement links to it ("Full details of our evaluation are available in the Opus 5.5 System Card").
- 200 https://www.anthropic.com/system-cards. The hub lists "Claude Opus 5.5 September 2026".
- 200 https://www.anthropic.com/legal/aup.
- model_card and paper are NOT_DISCLOSED. The announcement links only the system card, and the hub lists only system cards. This matches existing Anthropic rows such as Opus 4.7 and Sonnet 5.
- Parameters: none stated on the page or in the card.
- Predecessor: anthropic--claude-opus-5 (on record). The page says Opus 5.5 "is a major step up from Opus 5".
- Benchmarks: the page table covers Terminal-Bench 4.0, FrontierCode, CursorBench, GDPval-AA, AutomationBench, HLE, Terminal-Bench-Science, OSWorld 2.1 and Chartography. None of these is a pinned benchmark. The system card PDF has no SWE-bench Verified or GPQA Diamond score.
- The machine draft was built from OpenRouter, with Artificial Analysis unpinned claims. All of that was discarded.
- Fast mode ("Fast mode for Opus 5.5 is also available ... with up to 2.5x speed") is a serving option. Under the opus-5-fast precedent it is not a variant.

## 2. anthropic--claude-sonnet-5.5 (2026-09-28, public_api)
- 200 https://www.anthropic.com/claude-sonnet-5-5. The header reads "September 28, 2026". Availability: "Claude Sonnet 5.5 is now available on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure. Developers can get started on the Claude Platform with claude-sonnet-5-5."
- 200 https://www.anthropic.com/claude-sonnet-5-5-system-card. It redirects to the "Claude Sonnet 5.5 System Card.pdf" PDF. The hub lists "Claude Sonnet 5.5 September 2026".
- 200 https://www.anthropic.com/legal/aup. model_card and paper are NOT_DISCLOSED, on the same basis as entry 1.
- Predecessor: anthropic--claude-sonnet-5 (on record). The page says "Sonnet 5.5 improves over Sonnet 5".
- Benchmarks: the table has no GPQA or SWE-bench rows, and the system card has no pinned scores.
- The machine draft's system_card "https://anthropic.com" was bogus and has been replaced.

## 3. anthropic--claude-haiku-5.5 (2026-10-07, public_api)
- 200 https://www.anthropic.com/claude-haiku-5-5. The header reads "October 7, 2026". Availability: "Claude Haiku 5.5 is available now on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure. On the Claude Platform, developers can get started with claude-haiku-5-5."
- 200 https://www.anthropic.com/claude-haiku-5-5-system-card. This is the href on the announcement page. It redirects to the "Claude Haiku 5.5 System Card.pdf" PDF. The hub lists "Claude Haiku 5.5 October 2026". The machine draft's "https://www.anthropic.com/" has been replaced.
- 200 https://www.anthropic.com/legal/aup. model_card and paper are NOT_DISCLOSED.
- Predecessor: anthropic--claude-haiku-4.5 (on record). The page compares directly with Haiku 4.5, and the system cards hub lists no Haiku between 4.5 and 5.5.
- Benchmarks: the system card lists SWE-Bench Pro, SWE-bench Multilingual and SWE-bench Multimodal, but not SWE-bench Verified. There is no GPQA Diamond score.

## 4. openai--gpt-6-sol (2026-09-22, public_api)
- 200 https://openai.com/index/introducing-gpt-6-sol-and-luna/. The page metadata has `publicationDateText: "September 22, 2026"`. Availability: "GPT-6 Sol and GPT-6 Luna are available in ChatGPT Work and Codex starting today for all Plus, Pro, Business, Enterprise, and Edu users ... In the OpenAI API, they are available as gpt-6-sol and gpt-6-luna."
- 200 https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna-in-the-api-codex-and-chatgpt/1399925. The topic JSON shows created_at 2026-09-22T18:16Z. The author, VeitB, is flagged staff and moderator. Quote: "GPT-6 Sol and Luna roll out today in ChatGPT Work and Codex ... Both are also available in the API." The post links the openai.com announcement.
- 200 https://deploymentsafety.openai.com/gpt-6-astra. The announcement's "See the system card" link points here. The card's changelog says "September 22, 2026: We added an Appendix: GPT-6 Sol, GPT-6 Luna". This is recorded as the system card.
- 200 https://deploymentsafety.openai.com/gpt-6-october. This is the hub item "GPT-6 Sol and GPT-6 Luna: October 2026 update", dated Oct 07, 2026, and is listed in extra_sources.
- 200 https://openai.com/policies/usage-policies/.
- model_card and paper are NOT_DISCLOSED. The hub has no other Sol-specific document, and this matches existing OpenAI rows.
- Predecessor: openai--gpt-5.6-sol (on record). The page's pricing table reads "GPT-5.6 Sol -> GPT-6 Sol".
- Benchmarks: none pinned. The page reports AutomationBench, Agents' Last Exam and internal factuality. The machine draft's numbers were from Artificial Analysis and have been dropped.

## 5. openai--gpt-6-luna (2026-09-22, public_api)
- The URLs and date evidence are the same as entry 4. Luna-specific line: "Free and Go users can access GPT-6 Luna in the desktop app." The pricing table reads "GPT-5.6 Luna -> GPT-6 Luna".
- Predecessor: openai--gpt-5.6-luna (on record).
- Benchmarks: the draft's GPQA figure was sourced from OpenRouter and Artificial Analysis and labeled LAB. It has been dropped because the OpenAI page has no GPQA figure.

## 6. openai--gpt-6.1-sol (2026-09-29, public_api)
- 200 https://openai.com/index/introducing-gpt-6-1-sol/. The page metadata has `publicationDateText: "September 29, 2026"`, and the Sol/Luna page carries "Update on September 29, 2026: Learn about OpenAI's latest model: GPT-6.1 Sol". Availability: "GPT-6.1 Sol is available starting today to all Plus, Pro, Business, Enterprise, and Edu users in ChatGPT Work and Codex ... Developers can also access it through the OpenAI API as gpt-6.1-sol."
- The machine draft's date of 2026-01-01 was wrong and has been fixed.
- 200 https://deploymentsafety.openai.com/gpt-6-1-sol. "Addendum to GPT-6 Astra System Card: GPT-6.1 Sol", "Published September 29, 2026". The announcement links it as "the GPT-6.1 Sol system card addendum". The machine draft's openai.com/gpt-6-1-sol-system-card-addendum was unverified and has been replaced.
- 200 https://openai.com/policies/usage-policies/. model_card and paper are NOT_DISCLOSED. Epoch https://epoch.ai/models/gpt-6-1-sol also returned 200 but is not cited.
- Predecessor: left null on purpose, because openai--gpt-6-sol is not yet on the record. The page calls this model "an upgrade to GPT-6 Sol". If gpt-6-sol is promoted in the same run, the family heuristic chains to openai--gpt-6-sol; this was verified by running candidate_to_entry over the drafts in sorted order. If gpt-6-sol is not promoted, the heuristic falls back to openai--gpt-5.6-sol. Set `"predecessor": "openai--gpt-6-sol"` explicitly once that entry exists.
- "GPT-6.1 Sol Ultrafast" was announced as coming "in the coming days". It is a speed tier and is not a variant.

## 7. xai--grok-4.7 (2026-09-21, public_api)
- 200 https://x.ai/news/grok-4-7. The page reads "Sep 21, 2026". Availability: "Grok 4.7 is available today in Cursor and Grok Build. It is also available through the Grok API, third-party coding harnesses, and model routers and cloud platforms."
- 200 https://media.x.ai/v1/website/card4p7-3a96f40b.pdf. This is "Model Card: Grok 4.7, September 21, 2026", linked from https://x.ai/safety (200), which lists "Grok 4.7" under Model cards. The card says xAI "plans to add Grok 4.7 to its consumer surfaces ... at a later date". The PDF is recorded under system_card, following the xAI convention.
- 200 https://docs.x.ai/developers/models. It lists "New grok-4.7".
- 200 https://x.ai/legal/acceptable-use-policy. The card says "The model's use is subject to SpaceXAI's Acceptable Use Policy".
- model_card and paper are NOT_DISCLOSED, matching the xAI rows. Weights are closed.
- Organization naming: the card says "SpaceXAI is a doing-business-as (DBA) name of XAI LLC". The registry key stays xai.
- Parameters: not stated. The page says only "a new, larger base model".
- Predecessor: xai--grok-4.6 (on record). The card says "It extends Grok 4.6".
- Benchmarks: none pinned. The page and card cover CursorBench, DeepSWE, EEBench, Terminal-Bench, FrontierSWE, SWE-Marathon and others.
- The fast variant ("twice the output speed at twice the price") is not recorded separately.

## 8. meta--muse-spark-open (2026-10-15, open_weights)
- 200 https://research.meta.ai/blog/muse-spark-open. The post reads "October 15, 2026". Quotes: "Today, we're releasing the weights for Muse Spark Open" and "816B total parameters (42B active)". Weights are on Hugging Face, SageMaker, Model Garden and Foundry, with API access through third-party providers.
- 200 https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B. This is the "Muse Spark Open Model Card", with "Date of Release October 15th, 2026" and "Parameters 816B total / 42B active". It is used as model_card. The blog says "Detailed results are in the Muse Spark Open model card". The machine draft pointed at the collection page instead.
- 200 https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B/blob/main/LICENSE.md. This is the Muse Model License, which contains "EXHIBIT A - Muse Spark Open Usage Policy". It is used as usage_policy. The repo also has a separate USE_POLICY.md, but it returned 401 because the repo is gated, so it is not used.
- 200 https://research.meta.ai/static/muse-spark-open-evaluation-methodology (PDF).
- paper is NOT_DISCLOSED as of 2026-10-19. The blog says "with a full evaluation report available soon".
- system_card is NOT_DISCLOSED. No system card exists, which matches Meta's Llama rows.
- Parameters: 816B, as the lab states it. The HF API safetensors total is 822,036,529,664, which presumably includes the 1.8B perception encoder and the embeddings. The lab-stated figure was used.
- Predecessor: null. The blog calls it "The open-weight version of Muse Spark" but does not name a version.
- Benchmarks: none. The HF model card shows a GPQA Diamond figure, but the methodology PDF says that for GPQA Diamond Meta will "source results for the remaining models from Artificial Analysis", which covers everything except Beam. That makes it an Artificial Analysis number, not a lab measurement. The blog's benchmark table is not present as text.

## 9. meta--muse-wonder (2026-10-12, public_api)
- 200 https://research.meta.ai/blog/muse-wonder. The post reads "October 12, 2026". Quote: "Muse Wonder is available today through the Meta Model API and Muse Code, and Muse Wonder Full is available today for Muse Code subscribers."
- 200 https://research.meta.ai/static/muse-wonder-model-card (PDF). This is the "Muse Wonder Model Card", with Name "Muse Wonder and Muse Wonder Full" and "Date of Release October 12, 2026". It is linked from the post.
- 200 https://dev.meta.ai/legal/acceptable-use-policy. This is the "Meta Model API Acceptable Use Policy", named in the model card ("Muse Wonder's use is subject to ... Meta Model Acceptable Use Policy").
- 200 https://dev.meta.ai/. Quote: "Muse Wonder, now on Meta Model API and Muse Code. Muse Wonder Full, now on Muse Code."
- system_card and paper are NOT_DISCLOSED as of 2026-10-19. The post says "A full report with additional safety evaluations will be available soon". Re-check later.
- Parameters: not stated. Predecessor: null, because this is a new series.
- Benchmarks: none. The post's results are images. The card has no GPQA Diamond or SWE-bench Verified row, and its coding rows come from third parties.

## 10. Muse Wonder Full: ruled a separate model with its own entry, meta--muse-wonder-full (2026-10-12, public_service)
- Ruling: separate model, so it gets its own entry and is not a `variants` item on entry 9. Evidence from the 200 blog post: "introduce the Muse Wonder series with Muse Wonder and Muse Wonder Full, our most capable models"; "We trained both models on diverse, long-running tasks"; "Both of our models improve similarly"; "Muse Wonder and Muse Wonder Full build on larger, stronger base models". Nothing says Full is the same weights on a different tier. The model card calls Full "our most capable variant", and dev.meta.ai lists it as its own model card in "Recent models". The same-weights precedent (rule out or fold in) does not fit, so the different-model rule applies.
- Availability: 200 https://developer.meta.com/ai/products/muse-code. The Power Usage plan lists "Access to the most powerful Muse models, including Muse Wonder Full", and the Maximum Usage plan includes "Everything from the Power Usage plan". It is a publicly purchasable subscription that is generally available, not labeled a preview, so it is public_service. No API listing for Full was found. dev.meta.ai lists it on Muse Code only.
- Disclosures, retrieval date and NOT_DISCLOSED basis are the same as entry 9, because the model card covers both models.

---

## Pending queue items these drafts supersede or touch
- The batch, pro and pro-batch candidates for these models stay ruled out. The merged candidates `openai--gpt-6.1` and `openai--devday-2026` are unaffected.
- `meta--muse-wonder-full` has no pending candidate. A candidate file would need to be created by hand with `origin: manual`.
