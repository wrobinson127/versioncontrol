# mistral evidence (researched 2026-10-19)

All fetches used a desktop Chrome user agent. Status is the final HTTP status after redirects.

## Lab-wide checks

- https://legal.mistral.ai/terms/usage-policy : 200
- https://mistral.ai/research : 200
- https://legal.mistral.ai/ : 200
- HF API https://huggingface.co/api/models?author=mistralai&limit=1000 (200, 81 public repos) checked for every release.
- arXiv searches (arxiv.org/search, 200): title Devstral, Leanstral, Codestral, Mathstral, Saba, Ministral, Pixtral, Magistral, Voxtral, 'Mistral Small', 'Mistral Large', 'Mistral Medium'; abstract 'Mistral OCR', 'Mistral Moderation', 'Codestral Embed', Leanstral, Mathstral, 'Mistral Saba'; author Mistral-AI, Guillaume Lample, Alexandre Sablayrolles, Devendra Singh Chaplot. Mistral-authored reports found: Mistral 7B, Mixtral, Pixtral 12B, Magistral (2506.10910), Voxtral (2507.13264), Devstral (2509.25193), Ministral 3 (2601.08584), Voxtral Realtime, Voxtral TTS, Robostral Navigate, Shieldstral. This matches the publications list on https://mistral.ai/research (200).
- system_card NOT_DISCLOSED: no system card linked on the post; https://mistral.ai/research (200) lists models and publications only; https://legal.mistral.ai/ (200) lists terms only. Approved rows record NOT_DISCLOSED lab-wide.

## mistral--mistral-medium (Mistral Medium, 2023-12-11)

| URL | Status |
|---|---|
| https://mistral.ai/news/la-plateforme/ | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- model_card ND: API endpoint described in the la Plateforme post, no weights or HF repo. https://mistral.ai/news/la-plateforme/: "ur two released open models; the third, mistral-medium, uses a prototype model with higher performances that we are testing in a deployed setting. We serve instructed versions of our models. We have worked on consolidating the most effective alignment techniques (efficient fine-tuning, direct prefer"

## mistral--codestral (Codestral, 2024-05-29)

| URL | Status |
|---|---|
| https://mistral.ai/news/codestral/ | 200 |
| https://huggingface.co/mistralai/Codestral-22B-v0.1 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Codestral-22B-v0.1; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED


## mistral--codestral-mamba (Codestral Mamba, 2024-07-16)

| URL | Status |
|---|---|
| https://mistral.ai/news/codestral-mamba/ | 200 |
| https://huggingface.co/mistralai/Mamba-Codestral-7B-v0.1 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Mamba-Codestral-7B-v0.1; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- paper ND: the post links arXiv 2312.00752 (Gu and Dao, Mamba), a third-party architecture paper. https://mistral.ai/news/codestral-mamba/: "https://mistral.ai/news/codestral-mamba/ 200 Codestral Mamba | Mistral AI Get in touch Menu Research Sovereign AI Cloud Customers Company Get in touch Login Why Sovereign AI Products Method Sovereign AI in practice Inference Compute Energy & utilities Manufacturing Financial services Public s"

## mistral--mathstral (Mathstral, 2024-07-16)

| URL | Status |
|---|---|
| https://mistral.ai/news/mathstral | 200 |
| https://huggingface.co/mistralai/Mathstral-7B-v0.1 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Mathstral-7B-v0.1; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED


## mistral--mistral-small-v24.09 (Mistral Small v24.09, 2024-09-17)

| URL | Status |
|---|---|
| https://mistral.ai/news/september-24-release/ | 200 |
| https://huggingface.co/mistralai/Mistral-Small-Instruct-2409 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Mistral-Small-Instruct-2409; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED


## mistral--ministral-8b (Ministral 8B, 2024-10-16)

| URL | Status |
|---|---|
| https://mistral.ai/news/ministraux/ | 200 |
| https://huggingface.co/mistralai/Ministral-8B-Instruct-2410 | 200 |
| https://arxiv.org/abs/2601.08584 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Ministral-8B-Instruct-2410; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- paper ND: the Ministral 3 report is a later generation (2512). https://arxiv.org/abs/2601.08584: "View PDF HTML (experimental) Abstract: We introduce the Ministral 3 series, a family of parameter-efficient dense language models designed for compute and memory constrained applications, available in three model sizes: 3B, 8B, and 14B parameters. For each model size, we release three variants: a p"

## mistral--mistral-moderation (Mistral Moderation, 2024-11-07)

| URL | Status |
|---|---|
| https://mistral.ai/news/mistral-moderation | 200 |
| https://docs.mistral.ai/models/mistral-moderation-24-11 | 200 |
| https://arxiv.org/abs/2607.25857 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- paper ND: the post points to API docs, not a report. https://mistral.ai/news/mistral-moderation: "sation within a conversational context. Check out our technical documentation for more information. The model is natively multilingual and in particular trained on Arabic, Chinese, English, French, German, Italian, Japanese, Korean, Portuguese, Russian, Spanish. The Content Moderation classifier lev"
- model_card ND: docs spec page only. https://docs.mistral.ai/models/mistral-moderation-24-11: "6, 2024 Blog Deprecated Premier v 24.11 Mistral Moderation Our moderation service that enables our users to detect harmful text content mistral-moderation-2411 Modalities Context 8k This model is deprecated. Use Mistral Moderation 2 for new integrations. Deprecation date 3/31/2026 Replacement Mistra"

## mistral--mistral-large-2.1 (Mistral Large 2.1, 2024-11-15)

| URL | Status |
|---|---|
| https://huggingface.co/mistralai/Mistral-Large-Instruct-2411 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Mistral-Large-Instruct-2411; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED


## mistral--pixtral-large (Pixtral Large, 2024-11-18)

| URL | Status |
|---|---|
| https://mistral.ai/news/pixtral-large/ | 200 |
| https://huggingface.co/mistralai/Pixtral-Large-Instruct-2411 | 200 |
| https://arxiv.org/abs/2410.07073 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Pixtral-Large-Instruct-2411; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- paper ND: the post cites the 12B report for evaluation details only. https://mistral.ai/news/pixtral-large/: "eal-world use cases of multimodal LLMs (see the Pixtral 12B technical report for details). Finally, on the LMSys Vision Leaderboard , Pixtral Large is the best open-weights model by a substantial margin, surpassing the nearest competitor by nearly 50 ELO points. Pixtral Large also outperforms a numb"
- the report is about the 12B model. https://arxiv.org/abs/2410.07073: "View PDF HTML (experimental) Abstract: We introduce Pixtral-12B, a 12--billion-parameter multimodal language model. Pixtral-12B is trained to understand both natural images and documents, achieving leading performance on various multimodal benchmarks, surpassing a number of larger models. Unlike ma"

## mistral--mistral-saba (Mistral Saba, 2025-02-17)

| URL | Status |
|---|---|
| https://mistral.ai/news/mistral-saba | 200 |
| https://docs.mistral.ai/models/mistral-saba-25-02 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- model_card ND: docs spec page; no HF repo. https://docs.mistral.ai/models/mistral-saba-25-02: "y 17, 2025 Blog Retired Premier v 25.02 Mistral Saba A finetuned Small model trained on meticulously curated datasets from across the Middle East and South Asia. mistral-saba-2502 +1 Modalities Context 32k This model is retired. Use Mistral Small 4 for new integrations. Retirement date 9/30/2025 Rep"

## mistral--mistral-ocr (Mistral OCR, 2025-03-06)

| URL | Status |
|---|---|
| https://mistral.ai/news/mistral-ocr | 200 |
| https://docs.mistral.ai/models | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED


## mistral--devstral-small (Devstral Small, 2025-05-21)

| URL | Status |
|---|---|
| https://mistral.ai/news/devstral | 200 |
| https://huggingface.co/mistralai/Devstral-Small-2505 | 200 |
| https://arxiv.org/abs/2509.25193 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Devstral-Small-2505; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=https://arxiv.org/abs/2509.25193

- paper URL support. https://arxiv.org/abs/2509.25193: "View PDF HTML (experimental) Abstract: We introduce Devstral-Small, a lightweight open source model for code agents with the best performance among models below 100B size. In this technical report, we give an overview of how we design and develop a model and craft specializations in agentic softwar"

## mistral--codestral-embed (Codestral Embed, 2025-05-28)

| URL | Status |
|---|---|
| https://mistral.ai/news/codestral-embed | 200 |
| https://docs.mistral.ai/models/codestral-embed-25-05 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- model_card ND: docs spec page; no HF repo. https://docs.mistral.ai/models/codestral-embed-25-05: "al May 28, 2025 Blog GA Premier v 25.05 Codestral Embed Our state-of-the-art semantic for extracting representation of code extracts codestral-embed-2505 +1 Speed Performance Modalities Context i 8k Price i USD EUR $0.15 /M Tokens Speed Performance Modalities Context 8k Price USD EUR $0.15 /M Tokens"

## mistral--devstral-medium (Devstral Medium, 2025-06-10)

| URL | Status |
|---|---|
| https://mistral.ai/news/devstral-2507 | 200 |
| https://docs.mistral.ai/models/devstral-medium-1-0-25-07 | 200 |
| https://arxiv.org/abs/2509.25193 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- model_card ND: API-only. https://mistral.ai/news/devstral-2507: "rt amongst open models for code agents. Devstral Medium is available through our API, and sets a new point on the cost/performance pareto frontier, surpassing Gemini 2.5 Pro and GPT 4.1 for a quarter of the price. Devstral Small 1.1 As with the previous version of Devstral Small, we release Devstral"
- docs date is July 10, 2025, not the row's 2025-06-10. https://docs.mistral.ai/models/devstral-medium-1-0-25-07: "m 1.0 Try in playground ↗ Compare Legal July 10, 2025 Blog Deprecated Premier v 25.07 Devstral Medium 1.0 An enterprise grade text model, that excels at using tools to explore codebases, editing multiple files and power software engineering agents. devstral-medium-2507 Modalities Context 128k This m"

## mistral--magistral-small-1.0 (Magistral Small 1.0, 2025-06-10)

| URL | Status |
|---|---|
| https://mistral.ai/news/magistral | 200 |
| https://huggingface.co/mistralai/Magistral-Small-2506 | 200 |
| https://arxiv.org/abs/2506.10910 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Magistral-Small-2506; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=https://arxiv.org/abs/2506.10910

- paper URL support. https://arxiv.org/abs/2506.10910: "of Mistral Medium 3 with RL alone, and we open-source Magistral Small (Apache 2.0) which further includes cold-start data from Magistral Medium. Subjects: Computation and Language (cs.CL) Cite as: arXiv:2506.10910 [cs.CL] (or arXiv:2506.10910v1 [cs.CL] for this version) https://doi.org/10.48550/arX"

## mistral--mistral-small-3.2 (Mistral Small 3.2, 2025-06-15)

| URL | Status |
|---|---|
| https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED


## mistral--voxtral-mini (Voxtral Mini, 2025-07-15)

| URL | Status |
|---|---|
| https://mistral.ai/news/voxtral | 200 |
| https://huggingface.co/mistralai/Voxtral-Mini-3B-2507 | 200 |
| https://arxiv.org/abs/2507.13264 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Voxtral-Mini-3B-2507; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=https://arxiv.org/abs/2507.13264


## mistral--codestral-25.08 (Codestral 25.08, 2025-07-30)

| URL | Status |
|---|---|
| https://mistral.ai/news/codestral-25-08/ | 200 |
| https://docs.mistral.ai/models/codestral-25-08 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- model_card ND: docs spec page; no HF repo. https://docs.mistral.ai/models/codestral-25-08: "l July 30, 2025 Blog GA Premier v 25.08 Codestral Our cutting-edge language model for code completion released end of July 2025, Codestral specializes in low-latency, high-frequency tasks such as fill-in-the-middle (FIM) and code generation. codestral-2508 +1 Speed Performance Modalities Context i 1"

## mistral--mistral-medium-3.1 (Mistral Medium 3.1, 2025-08-12)

| URL | Status |
|---|---|
| https://x.com/MistralAI/status/1955316715417382979 | 200 |
| https://docs.mistral.ai/models/mistral-medium-3-1-25-08 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- model_card ND: docs spec page; no HF repo. https://docs.mistral.ai/models/mistral-medium-3-1-25-08: "ust 12, 2025 Deprecated Premier v 25.08 Mistral Medium 3.1 Our frontier-class multimodal model released August 2025. Improving tone and performance. mistral-medium-2508 Modalities Context 128k This model is deprecated. Use Mistral Medium 3.5 for new integrations. Deprecation date 5/22/2026 Replaceme"

## mistral--ministral-3-14b (Ministral 3 14B, 2025-12-02)

| URL | Status |
|---|---|
| https://mistral.ai/news/mistral-3 | 200 |
| https://huggingface.co/mistralai/Ministral-3-14B-Instruct-2512 | 200 |
| https://arxiv.org/abs/2601.08584 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Ministral-3-14B-Instruct-2512; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=https://arxiv.org/abs/2601.08584

- paper URL support. https://mistral.ai/news/mistral-3: "ngside this launch, you can explore the full details of the Ministral 3 series architecture in our latest research paper here . We believe that the future of AI should be built on transparency, accessibility, and collective progress. With this release, we invite the world to explore, build, and inno"

## mistral--devstral-small-2 (Devstral Small 2, 2025-12-09)

| URL | Status |
|---|---|
| https://mistral.ai/news/devstral-2-vibe-cli/ | 200 |
| https://huggingface.co/mistralai/Devstral-Small-2-24B-Instruct-2512 | 200 |
| https://arxiv.org/abs/2501.19399 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Devstral-Small-2-24B-Instruct-2512; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

- paper ND: the only arXiv link in the card is a third-party method paper. https://arxiv.org/abs/2501.19399: "iv.org/abs/2501.19399 200 [2501.19399] Scalable-Softmax Is Superior for Attention Skip to main content Search Submit Donate Log in Search arXiv Press Enter to search · Advanced search --> Computer Science > Computation and Language arXiv:2501.19399 (cs) [Submitted on 31 Jan 2025] Title: Scalable-So"

## mistral--mistral-small-4 (Mistral Small 4, 2026-03-16)

| URL | Status |
|---|---|
| https://mistral.ai/news/mistral-small-4/ | 200 |
| https://huggingface.co/mistralai/Mistral-Small-4-119B-2603 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Mistral-Small-4-119B-2603; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED


## mistral--leanstral-1.5 (Leanstral 1.5, 2026-06-30)

| URL | Status |
|---|---|
| https://mistral.ai/news/leanstral-1-5 | 200 |
| https://huggingface.co/mistralai/Leanstral-1.5-119B-A6B | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/mistralai/Leanstral-1.5-119B-A6B; usage_policy=https://legal.mistral.ai/terms/usage-policy; paper=NOT_DISCLOSED

