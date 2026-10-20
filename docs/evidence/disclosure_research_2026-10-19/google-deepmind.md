# google-deepmind evidence (researched 2026-10-19)

Fetch method: Python urllib and curl with a Chrome user agent and a cookie jar. ai.google.dev pages 302 into a Google auto sign-in loop that ends at the page with status 200 once cookies are kept. nature.com serves a bot challenge to bare clients and the real article (200) with Accept and gzip headers. Statuses below are final statuses after redirects.

Shared pages used across releases: model-card hub https://deepmind.google/models/model-cards/ (200), Generative AI Prohibited Use Policy (200, scope line: 'The following restrictions apply to your interactions with generative AI in the Google products and services that refer to this policy.'), Gemini API Additional Terms https://ai.google.dev/gemini-api/terms (200, 'you must comply with our Prohibited Use Policy'), Gemma Prohibited Use Policy (200), HAI-DEF Prohibited Use Policy (200).

Final check: every URL recorded in the Google DeepMind rows returned 200.

## Flan UL2 (google-deepmind--flan-ul2, 2023-03-03)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/google/flan-ul2 | usage_policy=NOT_DISCLOSED | paper=https://arxiv.org/abs/2205.05131

Fetched:
- https://huggingface.co/google/flan-ul2 : 200
- https://www.yitay.net/blog/flan-ul2-20b : 200
- https://arxiv.org/abs/2205.05131 : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- HF card: 'License: apache-2.0'; Contribution section says the model was added to HF by Younes Belkada and Arthur Zucker (HF staff), so the card is in the google org but HF-authored.
- Usage policy ND: the Generative AI Prohibited Use Policy text reads 'The following restrictions apply to your interactions with generative AI in the Google products and services that refer to this policy.' Neither the card nor the blog refers to it; no other policy is linked.
- System card ND: no system card on the card, blog, or paper.

## PaLM-2 Bison (google-deepmind--palm-2-bison, 2023-05-10)

Cells: system_card=NOT_DISCLOSED | model_card=https://arxiv.org/pdf/2305.10403 | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2305.10403

Fetched:
- https://ai.google.dev/palm_docs/palm : 404
- https://arxiv.org/pdf/2305.10403 : 200
- https://arxiv.org/abs/2305.10403 : 200
- https://blog.google/technology/ai/google-palm-2-ai-large-language-model/ : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- blog.google: 'We'll be making PaLM 2 available in four sizes from smallest to largest: Gecko, Otter, Bison and Unicorn.'
- Report D.10 PaLM 2 Model Card: 'Services and products built on top of PaLM 2 are also being made available to external developers via MakerSuite and APIs'. The report cites the Generative AI Prohibited Use Policy and the PaLM API terms.
- System card ND: no system card for PaLM 2 (approved PaLM 2 row ruling); the PaLM docs page is now 404.

## MADLAD-400 10B (google-deepmind--madlad-400-10b, 2023-09-09)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/google/madlad400-10b-mt | usage_policy=NOT_DISCLOSED | paper=https://arxiv.org/abs/2309.04662

Fetched:
- https://huggingface.co/google/madlad400-10b-mt : 200
- https://arxiv.org/abs/2309.04662 : 200

Supporting text:
- HF card titled 'Model Card for MADLAD-400-10B-MT', License Apache 2.0; the card says a converter not involved in the research wrote it.
- Usage policy ND: Apache 2.0, no use policy linked from card or paper. System card ND: none on card or paper.

## Gemini 1.0 Pro (google-deepmind--gemini-1.0-pro, 2023-12-06)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2312.11805

Fetched:
- https://deepmind.google/models/model-cards/ : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_1_report.pdf : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-1-0-Pro-Model-Card.pdf : 404
- https://storage.googleapis.com/model-cards/documents/gemini-pro.pdf : 403
- https://storage.googleapis.com/model-cards/documents/gemini-1.0-pro.pdf : 403
- http://web.archive.org/cdx/search/cdx?url=storage.googleapis.com/model-cards/documents/* : 200

Supporting text:
- Hub 'Gemini 1.0 View model card' links gemini_1_report.pdf#page=71. Page 71 text: '10.1. Gemini Ultra Model Card ... The post-trained models described in this model card are Gemini API and Gemini Apps model variants (Section 6) built on top of the Gemini Ultra pre-trained model.'
- Report section 7.5: 'See Appendix 10.1 for the Gemini Ultra model card.' Wayback CDX of the old model-cards bucket lists only gemini-2-flash, gemini-2-flash-lite, gemini-2.5-* and veo-2 cards, no 1.0 Pro card.

## FunSearch (google-deepmind--funsearch, 2023-12-14)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=NOT_DISCLOSED | paper=https://www.nature.com/articles/s41586-023-06924-6

Fetched:
- https://www.nature.com/articles/s41586-023-06924-6 : 200 (title Mathematical discoveries from program search with large language models | Nature; a bare client gets a bot challenge page)
- https://deepmind.google/discover/blog/funsearch-making-new-discoveries-in-mathematical-sciences-using-large-language-models/ : 200
- https://github.com/google-deepmind/funsearch : 200
- https://api.crossref.org/works/10.1038/s41586-023-06924-6 : 200

Supporting text:
- Blog: 'FunSearch uses Google's PaLM 2, but it is compatible with other LLMs trained on code.' No 'model card' string on blog or repo.
- Repo README: 'This repository accompanies the publication Romera-Paredes, B. et al. Mathematical discoveries from program search with large language models. Nature (2023)'; 'All software is licensed under the Apache License, Version 2.0'. No use policy or model or system card.

## Gemini Nano-1 (google-deepmind--gemini-nano-1, 2023-12-19)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2312.11805

Fetched:
- https://arxiv.org/abs/2312.11805 : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_1_report.pdf : 200
- https://deepmind.google/models/model-cards/ : 200
- https://developer.android.com/ai/gemini-nano : 200
- https://developers.google.com/ml-kit/genai-terms : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Model card ND: same as Gemini 1.0 Pro; the only published 1.0 card is the Gemini Ultra Model Card.
- ML Kit GenAI terms: 'you must comply with our Prohibited Use Policy' linking policies.google.com/terms/generative-ai/use-policy; these terms also name Gemini Nano.
- System card ND: report 7.5 says external model and system cards are released within tech report updates; none for Nano.

## Gemini 1.0 Pro Vision (google-deepmind--gemini-1.0-pro-vision, 2024-02-15)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2312.11805

Fetched:
- https://arxiv.org/abs/2312.11805 : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_1_report.pdf : 200
- https://deepmind.google/models/model-cards/ : 200
- https://ai.google.dev/gemini-api/docs/changelog : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200
- https://ai.google.dev/gemini-api/terms : 200

Supporting text:
- Changelog: 'gemini-pro-vision: New multimodal model for a wide variety of tasks.'
- Model card ND and system card ND as for Gemini 1.0 Pro.

## Gemma 1.1 7B Instruct (google-deepmind--gemma-1.1-7b-instruct, 2024-02-24)

Cells: system_card=NOT_DISCLOSED | model_card=https://ai.google.dev/gemma/docs/model_card | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2403.08295

Fetched:
- https://huggingface.co/google/gemma-1.1-7b-it : 200
- https://ai.google.dev/gemma/docs/model_card : 200 (after Google sign-in redirect dance; final URL core/model_card)
- https://arxiv.org/abs/2403.08295 : 200
- https://arxiv.org/pdf/2403.08295 : 200
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- Gemma model card page has a 'Gemma 1.1 Benchmark Metric Gemma 1.1 IT 2B Gemma 1.1 IT 7B' table. arXiv report v2 to v4 (April 2024) include 'Table 5 Win rate of Gemma 1.1 IT models'.
- System card ND: Gemma convention.

## Gemini 1.5 Flash 8B (google-deepmind--gemini-1.5-flash-8b, 2024-05-10)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2403.05530

Fetched:
- https://storage.googleapis.com/deepmind-media/gemini/gemini_v1_5_report.pdf : 200
- https://arxiv.org/abs/2403.05530 : 200
- https://arxiv.org/pdf/2403.05530 : 200
- https://deepmind.google/models/model-cards/ : 200
- https://storage.googleapis.com/model-cards/documents/gemini-1.5-flash-8b.pdf : 403
- https://policies.google.com/terms/generative-ai/use-policy : 200
- https://ai.google.dev/gemini-api/terms : 200

Supporting text:
- Report Section 8: 'Flash-8B: Pushing the frontier for more efficient models'.
- Model card ND: Appendix 12.1 text 'Gemini 1.5 Pro is a sparse mixture-of-expert ... Gemini 1.5 Flash is a dense Transformer based model that is online distilled from Gemini 1.5 Pro.' Pages 105 to 107 contain no '8B'. Hub lists only a 'Gemini 1.5' card pointing to this appendix.

## LearnLM-Tutor (google-deepmind--learnlm-tutor, 2024-05-14)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/LearnLM/LearnLM_paper.pdf | usage_policy=NOT_DISCLOSED | paper=https://arxiv.org/abs/2407.12687

Fetched:
- https://storage.googleapis.com/deepmind-media/LearnLM/LearnLM_paper.pdf : 200
- https://arxiv.org/abs/2407.12687 : 200

Supporting text:
- Report: 'the internal model [189] and system cards. See Section A for the external model card.' Supplementary A: 'LearnLM-Tutor model card ... LearnLM-Tutor is a version of Gemini 1.0 finetuned for good tutoring.'
- Report: 'Our roll-outs and studies were staged, e.g., via a restricted beta'. Usage policy ND: no policy linked for the research model.

## DataGemma (google-deepmind--datagemma, 2024-09-12)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/google/datagemma-rig-27b-it | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2409.13741

Fetched:
- https://huggingface.co/google/datagemma-rig-27b-it : 200
- https://huggingface.co/google/datagemma-rag-27b-it : 200
- https://ai.google.dev/gemma/docs/datagemma : 200
- https://ai.google.dev/gemma/docs/datagemma/model_card : 404
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- HF RIG card: 'License: gemma', 'DataGemma is a series of fine-tuned Gemma 2 models'. System card ND: Gemma convention.

## Gemini-Exp-1114 (google-deepmind--gemini-exp-1114, 2024-11-15)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://ai.google.dev/gemini-api/docs/changelog : 200
- https://www.tomsguide.com/ai/google-gemini/google-drops-new-gemini-model-and-it-goes-straight-to-the-top-of-the-llm-leaderboard : 200
- https://deepmind.google/models/model-cards/ : 200
- https://arxiv.org/pdf/2507.06261 : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200
- https://ai.google.dev/gemini-api/terms : 200

Supporting text:
- Changelog: 'November 14, 2024 Model updates: Released gemini-exp-1114, a powerful experimental Gemini API model.'
- Hub lists no exp model; the Gemini 2.5 report has no 'exp-1114' or 'Gemini-Exp' string. No model card, system card, or paper.

## Gemini 2.0 Pro (google-deepmind--gemini-2.0-pro, 2024-12-11)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/models/model-cards/ : 200
- https://deepmind.google/technologies/gemini/pro/ : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-0-Pro-Model-Card.pdf : 404
- https://arxiv.org/pdf/2507.06261 : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200
- https://ai.google.dev/gemini-api/terms : 200

Supporting text:
- Hub footnote: 'Gemini 2.0 Pro was released as an experimental model only.'
- Gemini 2.5 report 2.7: 'In February 2025, we released an experimental version of Gemini 2.0 Pro ... For further information about Gemini 2.0 Pro, please see our earlier blog posts'. Treated as not a report covering the model, matching the approved Gemini 2.0 Flash paper ruling.

## Gemini 2.0 Flash Thinking (google-deepmind--gemini-2.0-flash-thinking, 2024-12-19)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/technologies/gemini/flash-thinking/ : 404
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-0-Flash-Thinking-Model-Card.pdf : 404
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-0-Flash-Model-Card.pdf : 200
- https://deepmind.google/models/model-cards/ : 200
- https://ai.google.dev/gemini-api/docs/changelog : 200
- https://arxiv.org/pdf/2507.06261 : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Changelog: 'December 19, 2024 Model updates: Released Gemini 2.0 Flash Thinking Mode for public preview.'
- Gemini 2.0 Flash card has no 'Thinking' string. Gemini 2.5 report: 'Our training recipe has evolved from the original experimental thinking model, Gemini 2.0 Flash Thinking (launched in December 2024)'; one-sentence mention only.

## Gemini 2.0 Flash-Lite (google-deepmind--gemini-2.0-flash-lite, 2025-02-05)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-0-Flash-Lite-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-0-Flash-Lite-Model-Card.pdf : 200
- https://storage.googleapis.com/model-cards/documents/gemini-2-flash-lite.pdf : 403 (old bucket from the sources list)
- https://deepmind.google/models/model-cards/ : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200
- https://ai.google.dev/gemini-api/terms : 200

Supporting text:
- Card text: 'Gemini 2.0 Flash-Lite Model Card Model card published April 10, 2025'. System card and paper ND: Gemini 2.0 convention.

## PaliGemma 2 3B Mix 224 (google-deepmind--paligemma-2-3b-mix-224, 2025-02-19)

Cells: system_card=NOT_DISCLOSED | model_card=https://ai.google.dev/gemma/docs/paligemma/model-card-2 | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2412.03555

Fetched:
- https://ai.google.dev/gemma/docs/paligemma/model-card-2 : 200
- https://huggingface.co/google/paligemma2-3b-mix-224 : 200
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- ai.google.dev card: 'we train the mix model with a mixture of the transfer tasks'; 'Prohibited uses of Gemma models are outlined in the Gemma Prohibited Use Policy'.

## Gemini 2.5 Pro (google-deepmind--gemini-2.5-pro, 2025-03-25)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Pro-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2507.06261

Fetched:
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Pro-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_2_5_pro_fsf_report.pdf : 404
- https://arxiv.org/abs/2507.06261 : 200
- https://deepmind.google/models/model-cards/ : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200
- https://ai.google.dev/gemini-api/terms : 200

Supporting text:
- Card: 'Model card updated June 27, 2025 Gemini 2.5 Pro Model Card'; FSF results table sits inside the card. No separate FSF report.

## T5Gemma (Gemma 9B-9B) (google-deepmind--t5gemma-gemma-9b-9b, 2025-04-08)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/google/t5gemma-9b-9b-ul2 | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2504.06225

Fetched:
- https://huggingface.co/google/t5gemma-9b-9b-ul2 : 200
- https://ai.google.dev/gemma/docs/t5gemma/model_card : 404
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- HF card: 'License: gemma'; 'Prohibited uses of Gemma models are outlined in the Gemma Prohibited Use Policy'.

## TxGemma 27B (google-deepmind--txgemma-27b, 2025-04-08)

Cells: system_card=NOT_DISCLOSED | model_card=https://developers.google.com/health-ai-developer-foundations/txgemma/model-card | usage_policy=https://developers.google.com/health-ai-developer-foundations/prohibited-use-policy | paper=https://arxiv.org/abs/2504.06196

Fetched:
- https://developers.google.com/health-ai-developer-foundations/txgemma/model-card : 200
- https://huggingface.co/google/txgemma-27b-predict : 200
- https://developers.google.com/health-ai-developer-foundations/terms : 200
- https://developers.google.com/health-ai-developer-foundations/prohibited-use-policy : 200

Supporting text:
- Card: 'It comes in 3 sizes, 2B, 9B, and 27B'; 'The use of TxGemma is governed by the Health AI Developer Foundations terms of use.' HAI-DEF terms 3.2: 'for the restricted uses described in the Health AI Developer Foundations Prohibited Use Policy ... which is hereby incorporated by reference'.

## Gemma 3 QAT 27B (google-deepmind--gemma-3-qat-27b, 2025-04-18)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/google/gemma-3-27b-it-qat-q4_0-gguf | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2503.19786

Fetched:
- https://huggingface.co/google/gemma-3-27b-it-qat-q4_0-gguf : 200
- https://ai.google.dev/gemma/docs/core/model_card_3 : 200
- https://arxiv.org/pdf/2503.19786 : 200
- https://arxiv.org/abs/2503.19786 : 200
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- HF card: 'This repository corresponds to the 27 instruction-tuned version of the Gemma 3 model in GGUF format using Quantization Aware Training (QAT).' Report 2.3: 'Quantization Aware Training ... we also provide quantized versions of our models'.

## Gemma 3n (google-deepmind--gemma-3n, 2025-05-20)

Cells: system_card=NOT_DISCLOSED | model_card=https://ai.google.dev/gemma/docs/gemma-3n/model_card | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=NOT_DISCLOSED

Fetched:
- https://ai.google.dev/gemma/docs/gemma-3n/model_card : 200
- https://ai.google.dev/gemma/docs/gemma-3n : 200
- https://arxiv.org/search/?query=Gemma+3n&searchtype=title : 200 (no results)
- https://arxiv.org/search/?query=%22Gemma+3n%22+technical+report : 200 (no Google report)
- https://arxiv.org/pdf/2607.02770 : 200

Supporting text:
- Card citation: '@article{gemma_3n_2025, title={Gemma 3n}, url={https://ai.google.dev/gemma/docs/gemma-3n}, publisher={Google DeepMind}'.
- Gemma 4 report reference list: 'Gemma Team. Gemma 3n. https://deepmind.google/models/gemma/gemma-3n/, 2025b.' Google cites a web page, not a report.

## MedGemma 27B (google-deepmind--medgemma-27b, 2025-05-20)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/google/medgemma-27b-text-it | usage_policy=https://developers.google.com/health-ai-developer-foundations/prohibited-use-policy | paper=https://arxiv.org/abs/2507.05201

Fetched:
- https://huggingface.co/google/medgemma-27b-text-it : 200
- https://huggingface.co/google/medgemma-27b-it : 200
- https://developers.google.com/health-ai-developer-foundations/medgemma/model-card : 200 (now the MedGemma 1.5 card)
- https://developers.google.com/health-ai-developer-foundations/prohibited-use-policy : 200
- https://arxiv.org/abs/2507.05201 : 200

Supporting text:
- HF card: 'MedGemma currently comes in two variants: a 4B multimodal version and a 27B text-only version'; 'The use of MedGemma is governed by the Health AI Developer Foundations terms of use.'

## Gemini Embedding (google-deepmind--gemini-embedding, 2025-07-14)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2503.07891

Fetched:
- https://ai.google.dev/gemini-api/docs/embeddings : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-Embedding-Model-Card.pdf : 404
- https://deepmind.google/models/model-cards/ : 200
- https://ai.google.dev/gemini-api/docs/changelog : 200
- https://arxiv.org/abs/2503.07891 : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200
- https://ai.google.dev/gemini-api/terms : 200

Supporting text:
- Hub lists Gemini, generative, robotics and Gemma cards; no embedding model. Embeddings docs page has no 'model card' string. Changelog: 'July 14, 2025 Released gemini-embedding-001, the stable version of our text embedding model.'

## Aeneas (google-deepmind--aeneas, 2025-07-23)

Cells: system_card=NOT_DISCLOSED | model_card=NOT_DISCLOSED | usage_policy=NOT_DISCLOSED | paper=https://www.nature.com/articles/s41586-025-09292-5

Fetched:
- https://www.nature.com/articles/s41586-025-09292-5 : 200 (title Contextualizing ancient texts with generative neural networks | Nature)
- https://deepmind.google/discover/blog/aeneas-transforms-how-historians-connect-the-past/ : 200
- https://github.com/google-deepmind/predictingthepast : 200
- https://predictingthepast.com/ : 200

Supporting text:
- Blog: 'we're making an interactive version of Aeneas freely-available ... at predictingthepast.com. To support further research, we're also open-sourcing our code and dataset.' No model card, system card or policy on blog, repo (Apache-2.0) or site (site has no terms or policy links).

## Gemma 3 270M (google-deepmind--gemma-3-270m, 2025-08-14)

Cells: system_card=NOT_DISCLOSED | model_card=https://ai.google.dev/gemma/docs/core/model_card_3 | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=NOT_DISCLOSED

Fetched:
- https://ai.google.dev/gemma/docs/core/model_card_3 : 200
- https://huggingface.co/google/gemma-3-270m : 200
- https://arxiv.org/pdf/2503.19786 : 200
- https://arxiv.org/abs/2503.19786 : 200 (only v1, 25 Mar 2025)
- https://arxiv.org/search/?query=Gemma+3+270M : 200 (no Google report)
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- Card: 'the 270M with 6 trillion tokens'. Paper ND: the Gemma 3 report PDF has 0 hits for '270M'; the 270M model postdates it and no later version exists.

## EmbeddingGemma (google-deepmind--embeddinggemma, 2025-09-05)

Cells: system_card=NOT_DISCLOSED | model_card=https://ai.google.dev/gemma/docs/embeddinggemma/model_card | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2509.20354

Fetched:
- https://ai.google.dev/gemma/docs/embeddinggemma/model_card : 200
- https://huggingface.co/google/embeddinggemma-300m : 200
- https://arxiv.org/abs/2509.20354 : 200
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- Card: 'EmbeddingGemma is a 300M parameter ... open embedding model'; cites arxiv.org/abs/2509.20354.

## Gemini Robotics-ER 1.5 (google-deepmind--gemini-robotics-er-1.5, 2025-09-25)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-1-5-Tech-Report.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=https://arxiv.org/abs/2510.03342

Fetched:
- https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-1-5-Tech-Report.pdf : 200
- https://arxiv.org/abs/2510.03342 : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-Robotics-ER-1-5-Model-Card.pdf : 404
- https://deepmind.google/discover/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/ : 200
- https://deepmind.google/models/model-cards/ : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Report Appendix A: 'We present the model card for Gemini Robotics-ER 1.5 and Gemini Robotics 1.5 models in Table 2.' Blog: 'we're making Gemini Robotics-ER 1.5 available to developers via the Gemini API in Google AI Studio.' Safety is report Section 6; no separate safety report.

## Gemini 2.5 Computer Use (google-deepmind--gemini-2.5-computer-use, 2025-10-07)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Computer-Use-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Computer-Use-Model-Card.pdf : 200
- https://blog.google/technology/google-deepmind/gemini-computer-use-model/ : 200
- https://arxiv.org/pdf/2507.06261 : 200
- https://deepmind.google/models/model-cards/ : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Blog: 'safety features ... (described in the Gemini 2.5 Computer Use System Card)'; that link's href is the Model-Cards/Gemini-2-5-Computer-Use-Model-Card.pdf file, so no separate system card exists.
- Card: 'Frontier Safety Assessment: Because model usage is restricted to the Gemini 2.5 Computer Use tool ... it is therefore not in scope for a Frontier Safety Framework assessment.' Gemini 2.5 report has 0 hits for 'Computer Use'.

## C2S-Scale (google-deepmind--c2s-scale, 2025-10-11)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/vandijklab/C2S-Scale-Gemma-2-27B | usage_policy=NOT_DISCLOSED | paper=https://www.biorxiv.org/content/10.1101/2025.04.14.648850v2

Fetched:
- https://www.biorxiv.org/content/10.1101/2025.04.14.648850v2 : 200 (curl later hit a Cloudflare 429; urllib client 200)
- https://huggingface.co/vandijklab/C2S-Scale-Gemma-2-27B : 200
- https://blog.google/technology/ai/google-gemma-ai-cancer-therapy-discovery/ : 200

Supporting text:
- blog.google: 'as part of our research collaboration with Yale University, we're releasing Cell2Sentence-Scale 27B (C2S-Scale)'; links the bioRxiv preprint, the vandijklab HF card and the vandijklab GitHub.
- HF card: 'License: cc-by-4.0'; no prohibited-use text. Usage policy ND. System card ND.

## Gemini 3 Deep Think (google-deepmind--gemini-3-deep-think, 2025-11-18)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-deep-think/ : 200 (Feb 12, 2026 update post)
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3_pro_fsf_report.pdf : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Deep-Think-Model-Card.pdf : 404
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Deep-Think-Model-Card.pdf : 404
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-1-Deep-Think-Model-Card.pdf : 404
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3_deep_think_fsf_report.pdf : 404
- https://deepmind.google/models/model-cards/ : 200
- https://arxiv.org/search/?query=Gemini+3&searchtype=title (only third-party papers) : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Gemini 3 Pro card: 'Gemini 3 Pro now features Deep Think mode'; 'Evaluations of Gemini 3 Pro using Deep Think mode yielded results consistent with the original Gemini 3 Pro safety assessment'; 'Frontier Safety evaluations of Gemini 3 Pro using Deep Think mode yielded results consistent with the original Gemini 3 Pro assessment.'
- Gemini 3 Pro FSF report mentions only 'Gemini 2.5 Deep Think' as a comparison model. The blog has no 'model card' or report link.

## Gemma 4 26B A4B (google-deepmind--gemma-4-26b-a4b, 2026-04-02)

Cells: system_card=NOT_DISCLOSED | model_card=https://ai.google.dev/gemma/docs/core/model_card_4 | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2607.02770

Fetched:
- https://ai.google.dev/gemma/docs/core/model_card_4 : 200
- https://arxiv.org/abs/2607.02770 : 200
- https://arxiv.org/pdf/2607.02770 : 200
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- Card: 'available in five distinct sizes: E2B, E4B, 12B, 26B A4B, and 31B'. Report: 'an MoE model with 3.8B activated parameters for 26B total parameters (26B-A4B)'.

## Gemini Robotics-ER 1.6 (google-deepmind--gemini-robotics-er-1.6, 2026-04-14)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-Robotics-ER-1-6-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-Robotics-ER-1-6-Model-Card.pdf : 200
- https://deepmind.google/blog/gemini-robotics-er-1-6/ : 200
- https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-ER-1-6-Tech-Report.pdf : 404
- https://arxiv.org/search/?query=Gemini+Robotics+ER : 200 (no ER 1.6 report)
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Card: 'The model card below covers Gemini Robotics-ER 1.6. Published: April 2026'; 'See Figure 1, Figure 2 in the release post for ... evaluation results, and Figure 3 for Gemini Robotics Safety evaluation results.' No report or safety document linked. Blog: 'available to developers via the Gemini API and Google AI Studio'.

## Gemini 3.5 Flash (google-deepmind--gemini-3.5-flash, 2026-05-19)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-5-Flash-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/models/model-cards/gemini-3-5-flash/ : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-5-Flash-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3-5_flash_fsf_report.pdf : 404
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3_5_flash_fsf_report.pdf : 404
- https://arxiv.org/search/?query=Gemini+3&searchtype=title (only third-party papers) : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Card: 'We evaluated Gemini 3.1 Pro for Frontier Safety as it was the most generally capable model ... For more information on our Frontier Safety Assessment, read the Gemini 3.1 Pro Model Card.' No technical report referenced.

## DiffusionGemma 26B-A4B (google-deepmind--diffusiongemma-26b-a4b, 2026-06-10)

Cells: system_card=NOT_DISCLOSED | model_card=https://huggingface.co/google/diffusiongemma-26B-A4B-it | usage_policy=https://ai.google.dev/gemma/prohibited_use_policy | paper=https://arxiv.org/abs/2608.00146

Fetched:
- https://huggingface.co/google/diffusiongemma-26B-A4B-it : 200
- https://ai.google.dev/gemma/docs/diffusiongemma/model_card : 200
- https://arxiv.org/abs/2608.00146 : 200
- https://ai.google.dev/gemma/prohibited_use_policy : 200

Supporting text:
- arXiv abstract: 'We introduce DiffusionGemma, an experimental open-weight language model ... by fine-tuning the mixture-of-experts Gemma 4 model'. Card: 'License: Apache 2.0'; Gemma PUP applied per the approved Gemma 4 rows, which are also Apache 2.0. System card ND: Gemma convention.

## Gemini 3.5 Flash-Lite (google-deepmind--gemini-3.5-flash-lite, 2026-07-21)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-5-Flash-Lite-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/models/model-cards/gemini-3-5-flash-lite/ : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-5-Flash-Lite-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3-5_flash-lite_fsf_report.pdf : 404
- https://arxiv.org/search/?query=Gemini+3&searchtype=title (only third-party papers) : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Card: 'based on Gemini 3.1 Pro results, we are confident that Gemini 3.5 Flash-Lite is also unlikely to reach any CCLs. For more information on our Frontier Safety Assessment, read the Gemini 3.1 Pro Model Card.'

## Gemini 3.6 Flash (google-deepmind--gemini-3.6-flash, 2026-07-21)

Cells: system_card=NOT_DISCLOSED | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-6-Flash-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/models/model-cards/gemini-3-6-flash/ : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-6-Flash-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3-6_flash_fsf_report.pdf : 404
- https://arxiv.org/search/?query=Gemini+3&searchtype=title (only third-party papers) : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Card: 'based on Gemini 3.1 Pro results, we are confident that Gemini 3.6 Flash is also unlikely to reach any CCLs.' No standalone safety report.

## Gemini Robotics-ER 2 (google-deepmind--gemini-robotics-er-2, 2026-07-30)

Cells: system_card=https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-2-Safety.pdf | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-Robotics-ER-2-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/models/model-cards/gemini-robotics-er-2/ : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-Robotics-ER-2-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-2-Safety.pdf : 200
- https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/ : 200
- https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-2-Tech-Report.pdf : 404
- https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-ER-2-Tech-Report.pdf : 404
- https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-2-Technical-Report.pdf : 404
- https://arxiv.org/search/?query=Gemini+Robotics+2&searchtype=title : 200 (no results)
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Safety PDF: '2026-07-29 Gemini Robotics 2: Safety Evaluations Gemini Robotics Team Google DeepMind'; 'report evaluations for the Gemini Robotics Embodied Reasoning (ER 2) model'. Card: 'please see our safety technical report'. Blog: 'For details, see our safety technical report'; 'publicly available to developers via the Gemini API'.

## Gemini 3.7 Flash (google-deepmind--gemini-3.7-flash, 2026-08-13)

Cells: system_card=https://storage.googleapis.com/deepmind-media/gemini/gemini_3-7_flash_fsf_report.pdf | model_card=https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-7-Flash-Model-Card.pdf | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/models/model-cards/gemini-3-7-flash/ : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-7-Flash-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3-7_flash_fsf_report.pdf : 200
- https://arxiv.org/search/?query=Gemini+3&searchtype=title (only third-party papers) : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- FSF report: 'Published: August 2026 Gemini 3.7 Flash Frontier Safety Framework Report'. Card: 'The Gemini 3.7 Frontier Safety Framework Report is available here.'

## Gemini 3.8 Flash (google-deepmind--gemini-3.8-flash, 2026-09-02)

Cells: system_card=NOT_DISCLOSED | model_card=https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash | usage_policy=https://policies.google.com/terms/generative-ai/use-policy | paper=NOT_DISCLOSED

Fetched:
- https://deepmind.google/models/model-cards/gemini-3-8-flash/ : 200
- https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-8-Flash-Model-Card.pdf : 200
- https://storage.googleapis.com/deepmind-media/gemini/gemini_3-8_flash_fsf_report.pdf : 404
- https://arxiv.org/search/?query=Gemini+3&searchtype=title (only third-party papers) : 200
- https://policies.google.com/terms/generative-ai/use-policy : 200

Supporting text:
- Card: 'We evaluated Gemini 3.7 Flash as outlined in our latest Frontier Safety Framework ... based on Gemini 3.7 Flash results, we are confident that Gemini 3.8 Flash is also unlikely to reach any T/CCLs. For more information on our Frontier Safety assessment, read the Gemini 3.7 Flash model card.'
