# Verification notes: eight non-frontier-lab drafts (retrieved 2026-10-19)

All URLs fetched with curl (redirects followed) on 2026-10-19. Status is the final HTTP status. Every draft was dry-run through the repo's own `promote.candidate_to_entry` and `validate.validate_entry` (read-only import, nothing written to the repo): all eight produce zero validation errors, zero `lint_voice` violations, the computed id equals the file name, and every predecessor id exists in `data/entries/*.json.gz`.

## Pipeline facts that affect these drafts (from pipeline/promote.py)

1. `entry_type` is read from the CANDIDATE top level (`candidate.get("entry_type", "release")`), not from `draft_entry`. For the 1017 revision the candidate file needs top-level `"entry_type": "revision"`. The draft also needs `draft_entry.predecessor = "deepseek--deepseek-v4.1-flash"` (explicit predecessor wins over the family heuristic and is checked against the record). `entry_type` is also included in the draft file for reference; it has no effect there.
2. `promote` rewrites every non-URL disclosure value to `NOT_RESEARCHED`. The `NOT_DISCLOSED` values in these drafts only reach the record through an APPROVED row in `content/disclosure_links/<org>.json`. The research behind each NOT_DISCLOSED is below so those rows can be written.
3. `promote` hardcodes `license_note: None`. The license_note strings in the open-weights drafts (backfill style) are dropped unless set by hand.
4. `draft_entry.extraction.retrieval_date` is required (KeyError otherwise). Each draft carries `extraction` with retrieval_date 2026-10-19.
5. Several pending drafts have no `date` (V4.1-Flash-1017 had null) or a wrong one (Qwen draft said 09-21). Dates below are set explicitly.

Org usage_policy precedent (approved rows in content/disclosure_links): Google `policies.google.com/terms/generative-ai/use-policy` for Gemini, `ai.google.dev/gemma/prohibited_use_policy` for Gemma; Mistral `legal.mistral.ai/terms/usage-policy`; DeepSeek `cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html`; Qwen Alibaba Cloud product terms v3.8.0; Cohere `docs.cohere.com/docs/usage-policy`. All re-fetched 200 today.

No draft carries a benchmark. For each entry I searched the lab page(s) and the model card for "GPQA" and "SWE-bench"; findings below.

---

## 1. google-deepmind--gemini-4-argon (2026-10-13, public_api)

| URL | Status |
|---|---|
| https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon | 200 |
| https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/ (2026-09-30 Fairwind post; deepmind.google/blog/gemini-4-argon-our-next-era-of-frontier-intelligence/ redirects here) | 200 |
| https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-4-Argon-Model-Card.pdf (application/pdf, "Published: October 2026") | 200 |
| https://storage.googleapis.com/deepmind-media/gemini/gemini_4_safety_report.pdf (application/pdf, "Gemini 4 Argon Safety & Security Report, October 2026") | 200 |
| https://blog.google/innovation-and-ai/technology/safety-security/gemini-4-model-safety-security/ | 200 |
| https://deepmind.google/models/evals-methodology/gemini-4-argon (301 to storage.googleapis.com/deepmind-media/gemini/gemini_4_argon_model_evaluation.pdf) | 200 |
| https://policies.google.com/terms/generative-ai/use-policy | 200 |
| https://deepmind.google/fairwind-program/ | 200 |

- Date: page dateline "Oct 13, 2026".
- Availability: "Gemini 4 Argon is now globally available today for developers and enterprises via the API in AI Studio and Gemini platform, for Google AI Ultra subscribers in Google Antigravity, and Google AI Ultra and Pro subscribers in the Gemini app and AI Mode in Search."
- Fairwind: the Oct 13 post says "Starting today, we're beginning expansion to hundreds of additional Fairwind Program partners", so the summary mentions it. The Sep 30 post: "Argon is currently rolling out to trusted cyber defenders through the Fairwind Program", and says developer access would come later. Folded in, dated to GA.
- system_card: the Safety & Security Report, following the gemini-3-pro precedent (FSF report PDF in the system_card cell, note: "Google does not use the system card label").
- paper NOT_DISCLOSED: no technical report linked from the GA post, the Sep 30 post, the safety post, the model card or the safety report; a web search for a Gemini 4 Argon technical report found none. This matches the Gemini 3 series rows.
- parameters NOT_DISCLOSED: the model card says "large scale sparse mixture-of-experts" and gives no count.
- Benchmarks: the post and the evals methodology PDF list no GPQA Diamond or SWE-bench Verified. The model card results table is an image, so its text is not extractable. The safety report mentions GPQA only as filtered question subsets (29/40 questions) for CoT monitoring, not as a score. Empty.
- Predecessor: google-deepmind--gemini-3.1-pro. JUDGMENT CALL. The lab names no predecessor. The safety report compares against "Gemini 3.7 Flash, 3.8 Flash and 3.1 Pro", and 3.1 Pro is the newest Pro-tier entry on record. The family heuristic would leave it null ("gemini argon" matches nothing).
- Pending draft errors: announcement_url was OpenRouter; summary carried prices and context length; 13 AA/Design Arena "unpinned claims". All dropped.

## 2. google-deepmind--embeddinggemma-2 (2026-10-06, open_weights)

| URL | Status |
|---|---|
| https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2 | 200 |
| https://huggingface.co/google/embeddinggemma-2 (API: license apache-2.0, not gated, created 2026-09-14, lastModified 2026-10-06) | 200 |
| https://huggingface.co/google/embeddinggemma-2/raw/main/README.md | 200 |
| https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2 (linked from the post as "the EmbeddingGemma 2 model card") | 200 |
| https://www.kaggle.com/models/google/embeddinggemma-2 | 200 |
| https://ai.google.dev/gemma/prohibited_use_policy (200 with a plain UA; a Chrome UA gets a cookie 302) | 200 |

- Date: dateline "Oct 06, 2026".
- Availability and parameters: "Today, we're launching EmbeddingGemma 2 ... released under a commercially permissive Apache 2.0 license, EmbeddingGemma 2 has 740 million parameters". The model card table reads "Parameters | Total | 740M". The post also says "Find the model weights on Hugging Face and Kaggle".
- usage_policy: the card says "Deployments must adhere to the Gemma Prohibited Use Policy" and links the URL above.
- paper NOT_DISCLOSED: the card, post and docs link no paper. A web search returns only the v1 paper (arXiv 2509.20354, Gemma 3 based). system_card NOT_DISCLOSED, matching the Gemma 4 rows.
- Benchmarks: embedding benchmarks only (MTEB, MAEB). Empty.
- Predecessor google-deepmind--embeddinggemma; the post says "We introduced EmbeddingGemma last year".
- Scope: embedding model. The predecessor is on record, and you said embeddings are in.

## 3. mistral--mistral-large-4 (2026-10-06, public_api)

| URL | Status |
|---|---|
| https://mistral.ai/news/mistral-large-4/ | 200 |
| https://docs.mistral.ai/models/mistral-large-4 (also reached from /models/model-cards/mistral-large-4) | 200 |
| https://legal.mistral.ai/terms/usage-policy | 200 |
| HF API search author=mistralai "Large-4": only Large-3 repos (no weights yet) | 200 |

- Date: dateline "October 6, 2026"; the docs page also shows "October 6, 2026".
- Availability: "Today, we're launching a public preview of Mistral Large 4 ... You can try the preview API today on Mistral Studio. Weights drop end of this month." and "We will release the weights by the end of the month." So public_api until the weights ship.
- Parameters: the post says "a 1 trillion-parameter natively multimodal model with 52 billion active parameters". The docs say "52B active parameters and 1.05T total parameters, and a 1.6B vision encoder". The draft uses 1.05T (the precise lab figure); the summary states both. The pending draft's "49 billion active" was wrong.
- model_card = the docs model page. JUDGMENT CALL: it is a spec page (architecture, params, features, pricing), and Mistral's own URL scheme routes /models/model-cards/<slug> to it. The precedent is mixed: mistral-large (v1, API-only) was approved as NOT_DISCLOSED. If you want only HF cards counted, set NOT_DISCLOSED and revisit when the weights ship.
- paper NOT_DISCLOSED: the post says "we will share further details on the model architecture ... and our post-training methodology". system_card NOT_DISCLOSED, matching the lab-wide pattern in the approved rows.
- Benchmarks: no GPQA or SWE-bench anywhere in the post HTML. Empty.
- Predecessor mistral--mistral-large-3. The pending mistral--mistral-large-4-0 is the same model (docs slug mistral-large-4-0).

## 4. mistral--codestral-25.01 (2025-01-13, public_api)

| URL | Status |
|---|---|
| https://mistral.ai/news/codestral-2501/ | 200 |
| https://docs.mistral.ai/models/codestral-25-01 (also reached from /models/model-cards/codestral-25-01) | 200 |
| https://huggingface.co/mistralai/Codestral-25.01 | 401 (no public repo); HF search finds only Codestral-22B-v0.1 and Mamba-Codestral |
| https://legal.mistral.ai/terms/usage-policy | 200 |

- Date: dateline "January 13, 2025"; the docs page also shows "January 13, 2025".
- Availability: "Available starting today. Codestral 25.01 is being rolled out to developers worldwide through our IDE / IDE plugin partners" and "To build your own integration with the Codestral API, head over to la Plateforme and use codestral-latest. The API is also available on Google Cloud's Vertex AI". On-prem deployment is for enterprise customers only, so this is not open weights. The docs label it "Premier".
- Docs: "This model is retired ... Retirement date 11/30/2025, Replacement Codestral (codestral-25-08)". The summary says so.
- Parameters NOT_DISCLOSED: the post compares to "sub-100B parameter coding models" but gives no count.
- Benchmarks: HumanEval, MBPP and others only. Empty.
- Predecessor mistral--codestral (2024-05-29). The post calls the earlier model "Codestral-2405 22B". FOLLOW-UP: mistral--codestral-25.08 currently chains to mistral--codestral. Once 25.01 is on record, 25.08 should chain to mistral--codestral-25.01. That is a manual edit; promote will not change it.
- The pending file has draft_entry null, so this draft must be pasted in as its draft_entry, and the candidate should carry origin "manual" (an entry the nightly check missed, recorded by hand).

## 5. deepseek--deepseek-v4-flash-vision-exp (2026-08-21, open_weights)

| URL | Status |
|---|---|
| https://api-docs.deepseek.com/updates/ | 200 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp (API: license mit, not gated, not private, created 2026-08-31, 48 safetensors files) | 200 |
| https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html | 200 |

- Date: change-log heading "Date: 2026-08-21", "DeepSeek-V4-Flash-Vision-Exp Release": "Today, the new multimodal vision understanding model DeepSeek-V4-Flash-Vision-Exp is now available on the DeepSeek API platform."
- Availability: the weights are public on HF under MIT (repo created 2026-08-31), so open_weights. The date stays at the 08-21 lab announcement. This changes the earlier check and the pending draft, which assumed public_api.
- Retirement: the 2026-09-10 change-log entry says "The previous-generation models V4 Flash and V4 Flash Vision Exp have been retired; ... the model names deepseek-v4-flash and deepseek-v4-flash-vision-exp are temporarily routed to V4.1 Flash."
- Parameters NOT_DISCLOSED: the card states no count. The OpenRouter-derived "284B total, 13B active" in the pending draft is V4-Flash's figure. The HF safetensors metadata total (about 304.6B) is computed, not lab-stated, so it is not used.
- paper NOT_DISCLOSED: the card and change log link none. The V4 arXiv paper (2606.19348) predates the vision modules. system_card NOT_DISCLOSED, matching the DeepSeek lab-wide pattern.
- Benchmarks: none pinned (Terminal Bench 2.1, NL2Repo, DeepSWE and others). Empty.
- Predecessor deepseek--deepseek-v4-flash-0731. JUDGMENT CALL: the card says it "builds on the DeepSeek-V4-Flash architecture" and compares to "DeepSeek-V4-Flash-0731". The family heuristic would leave it null.

## 6. deepseek--deepseek-v4.1-flash-1017 (2026-10-17, open_weights, REVISION)

| URL | Status |
|---|---|
| https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017 (API: license mit, created 2026-10-17, 48 safetensors files) | 200 |
| https://api-docs.deepseek.com/updates/ | 200 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/main/DeepSeek_V41_Tech_Report.pdf (linked as "Paper" from https://api-docs.deepseek.com/news/news260910, 200) | 200 |
| https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html | 200 |

- Date and availability: change log "Date: 2026-10-17 ... DeepSeek V4.1 Flash has been upgraded to DeepSeek-V4.1-Flash-1017. The official web and APP models have also been updated to the new version. The API calling method and pricing remain unchanged". The HF card says it "is a minor update to DeepSeek-V4.1-Flash" and "This repository and the model weights are licensed under the MIT License."
- REQUIRED for promote: candidate top-level `"entry_type": "revision"` and `draft_entry.predecessor: "deepseek--deepseek-v4.1-flash"`. The pending draft also has `date: null`; set it to 2026-10-17.
- paper: the V4.1 tech report. This follows the 0813 precedent, which cites the V4 paper for the revision.
- Parameters NOT_DISCLOSED, matching the 0813 precedent; the card states no count.
- Benchmarks: HLE, Terminal-Bench 4.0, DeepSWE and others. No GPQA Diamond or SWE-bench Verified. Empty. (The 2026-09-10 V4.1-Flash release lists "GPQA Diamond: 90.9". That belongs to the existing V4.1-Flash entry, not this one.)

## 7. alibaba-qwen--qwen3.8-omni-flash (2026-09-20, public_api)

| URL | Status |
|---|---|
| https://www.alibabacloud.com/blog/qwen3-8-omni-flash-omni-senses--agentic-delivery-_603580 | 200 |
| https://www.alibabacloud.com/help/en/model-studio/qwen-omni (API guide, model="qwen3.8-omni-flash") | 200 |
| https://arxiv.org/abs/2609.25611 ("Qwen3.8-Omni: Towards Native Omni-Modal Agents", Qwen Team, submitted 22 Sep 2026) | 200 |
| https://qwen.ai/blog?id=qwen3.8-omni-flash (cited in the post's BibTeX) | 200 |
| Alibaba Cloud product terms v3.8.0 | 200 |
| HF API search author=Qwen "3.8-Omni": empty (no weights) | 200 |

- Date: dateline "September 20, 2026". The pending draft's 09-21 (OpenRouter) was wrong. One third-party news item says Sept 18; the lab page governs.
- Availability: "Today, we are launching Qwen3.8-Omni-Flash ... now available on the Qianwen AI Platform", with OpenAI-compatible API examples using a DASHSCOPE_API_KEY. Realtime variant: "Qwen3.8-Omni-Flash-Realtime supports connections over WebSocket and WebRTC."
- model_card NOT_DISCLOSED: there is no HF card and the Model Studio page is a usage guide. This matches the approved API-only Qwen rows (qwen3-max, qwen2.5-max).
- Parameters NOT_DISCLOSED: the paper abstract says it "inherits the sparse mixture-of-experts (MoE) architecture of Qwen3.8-Next" and gives no count.
- Benchmarks: the blog has no GPQA or SWE-bench. FLAG: the arXiv paper (lab-authored, Qwen Team) states "obtaining 91.0 on GPQA Diamond" (section 4, Table 2). I left it out because you limited benchmarks to the lab's own page or model card. If papers count as lab sources: benchmark gpqa-diamond, value 91.0, LAB_REPORTED, source_url https://arxiv.org/abs/2609.25611, retrieval 2026-10-19. The table's configuration footnotes do not cover GPQA. The paper reports SWE-bench Pro and Multilingual only, not Verified.
- Predecessor alibaba-qwen--qwen3.5-omni-plus; the post compares against "Qwen3.5-Omni-Plus".

## 8. cohere--embed-5 (2026-09-30, public_api)

| URL | Status |
|---|---|
| https://cohere.com/blog/embed-5 | 200 |
| https://docs.cohere.com/docs/cohere-embed (lists embed-v5.0-pro and embed-v5.0-fast) | 200 |
| https://docs.cohere.com/docs/usage-policy | 200 |
| HF API search author=CohereLabs "embed": only v3.0 repos (no Embed 5 weights) | 200 |

- Date: dateline "Sep 30, 2026".
- Availability: "Embed 5 is generally available today on the Cohere API and Model Vault, Microsoft Foundry, and Amazon SageMaker."
- Variants: Pro and Fast ("now available in Pro and Fast tiers"; "Pro and Fast share an embedding space").
- model_card, paper, system_card NOT_DISCLOSED: the post links none, and HF has no repo. This matches cohere--cohere-command (API-only, model card NOT_DISCLOSED); the docs models page is a product listing.
- Parameters NOT_DISCLOSED: the post says only that Fast is "roughly half the size" of a 2B model, with no stated count.
- Benchmarks: retrieval only (ViDoRe V3, FinanceBench and others). Empty.
- Predecessor cohere--cohere-embed-4 (exists, 2025-04-15). The post compares against "Embed 4".
- The pending signal title carries an em dash ("Introducing Embed 5" + em dash + "A New Family..."). The draft model_name is "Embed 5", which is clean.
