# cohere evidence (researched 2026-10-19)

All fetches used a desktop Chrome user agent. Status is the final HTTP status after redirects.

## Lab-wide checks

- https://docs.cohere.com/docs/usage-policy : 200
- https://docs.cohere.com/docs/responsible-use : 200
- https://cohere.com/research/papers : 200
- HF API https://huggingface.co/api/models?author=CohereLabs&limit=1000 (200, 55 public repos); CohereForAI and Cohere authors return 0 repos (redirected org).
- arXiv searches (arxiv.org/search, 200): title 'Tiny Aya', 'Command A', 'North Mini', 'North Micro', 'Embed 4'; abstract 'Tiny Aya', 'North Mini Code', 'Cohere Embed', 'Command Light', 'Command A+', 'Embed 4 Cohere'; author 'Team Cohere' (only 2504.00698 Command A), Marzieh Fadaee (Cohere Labs). No reports found for Embed v3, Command Light, Embed 4, Command A+, North Mini Code.
- system_card NOT_DISCLOSED: https://docs.cohere.com/docs/responsible-use (200) is titled 'Command R and Command R+ Model Card' and covers only those two models; approved Cohere rows other than R and R+ record NOT_DISCLOSED.

## cohere--cohere-embed (Cohere Embed, 2023-11-02)

| URL | Status |
|---|---|
| https://cohere.com/blog/introducing-embed-v3 | 200 |
| https://huggingface.co/CohereLabs/Cohere-embed-english-v3.0 | 200 |
| https://huggingface.co/CohereLabs/Cohere-embed-multilingual-v3.0 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/CohereLabs/Cohere-embed-english-v3.0; usage_policy=https://docs.cohere.com/docs/usage-policy; paper=NOT_DISCLOSED


## cohere--cohere-command-light (Cohere Command Light, 2023-11-30)

| URL | Status |
|---|---|
| https://cohere.com/blog/embed-command-light-fine-tuning-on-amazon-bedrock | 200 |
| https://docs.cohere.com/docs/command-beta | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://docs.cohere.com/docs/usage-policy; paper=NOT_DISCLOSED

- model_card ND: deprecated docs listing. https://docs.cohere.com/docs/command-beta: "ive models. Text 4k 4k Chat , Summarize command-light Deprecated September 15, 2025 A smaller, faster version of command . Almost as capable, but a lot faster. Text 4k 4k Chat , Summarize The Command family of models responds well with instruction-like prompts, and are available in two variants: com"
- the 'Command model card' link goes to docs/responsible-use, now the R/R+ card. https://docs.cohere.com/docs/command-beta: "plications that require fast responses. For information on toxicity, safety, and using this model responsibly check out our Command model card . Example Prompts FAQ Can users train Command? Users cannot train Command in OS at this time. However, our team can handle this on a case-by-case basis. Plea"

## cohere--cohere-embed-4 (Cohere Embed 4, 2025-04-15)

| URL | Status |
|---|---|
| https://cohere.com/blog/embed-4 | 200 |
| https://docs.cohere.com/docs/cohere-embed | 200 |

Result: system_card=NOT_DISCLOSED; model_card=NOT_DISCLOSED; usage_policy=https://docs.cohere.com/docs/usage-policy; paper=NOT_DISCLOSED

- model_card ND: product listing only; no HF repo. https://docs.cohere.com/docs/cohere-embed: "ct Similarity, Euclidean Distance Embed embed-v4.0 A model that allows for text and images to be classified or turned into embeddings Text, Images, Mixed texts/images (i.e. PDFs) One of ‘[256, 512, 1024, 1536 (default)]‘ 128k Cosine Similarity, Dot Product Similarity, Euclidean Distance Embed embed-"

## cohere--command-a-plus (Command A+, 2026-05-20)

| URL | Status |
|---|---|
| https://docs.cohere.com/changelog/command-a-plus-05-2026 | 200 |
| https://cohere.com/blog/command-a-plus | 200 |
| https://huggingface.co/CohereLabs/command-a-plus-05-2026-bf16 | 200 |
| https://arxiv.org/abs/2506.07982 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/CohereLabs/command-a-plus-05-2026-bf16; usage_policy=https://docs.cohere.com/docs/usage-policy; paper=NOT_DISCLOSED

- paper ND: the blog's only arXiv link is tau2-bench, a third-party benchmark. https://arxiv.org/abs/2506.07982: "06.07982 (cs) [Submitted on 9 Jun 2025] Title: $τ^2$-Bench: Evaluating Conversational Agents in a Dual-Control Environment Authors: Victor Barres , Honghua Dong , Soham Ray , Xujie Si , Karthik Narasimhan View a PDF of the paper titled $\tau^2$-Bench: Evaluating Conversational Agents in a Dual-Contr"

## cohere--north-mini-code (North Mini Code, 2026-06-09)

| URL | Status |
|---|---|
| https://cohere.com/blog/north-mini-code | 200 |
| https://huggingface.co/CohereLabs/North-Mini-Code-1.0 | 200 |
| https://huggingface.co/blog/CohereLabs/introducing-north-mini-code | 200 |
| https://huggingface.co/blog/CohereLabs/introducing-command-a-vision-07-2025 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/CohereLabs/North-Mini-Code-1.0; usage_policy=https://docs.cohere.com/docs/usage-policy; paper=NOT_DISCLOSED

- paper ND: HF community blog post, the same kind of page the approved Command A Vision row did not count as a paper. https://huggingface.co/blog/CohereLabs/introducing-north-mini-code: "de: Cohere’s First Model For Developers Community Article Published June 9, 2026 Upvote 87 +81 Cohere Code Agents Team coherecode Follow CohereLabs :last-child]:mb-0"> Architecture Post-Training for Coding Excellence Robustness Across Harnesses Asynchronous RL for Agentic Coding Internal Human Evalu"

## cohere--north-micro-vision-instruct (North Micro Vision Instruct, 2026-08-10)

| URL | Status |
|---|---|
| https://huggingface.co/CohereLabs/North-Micro-Vision-Instruct | 200 |
| https://huggingface.co/blog/CohereLabs/meet-north-micro-vision-instruct | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/CohereLabs/North-Micro-Vision-Instruct; usage_policy=https://docs.cohere.com/docs/usage-policy; paper=https://huggingface.co/blog/CohereLabs/meet-north-micro-vision-instruct


## cohere--tiny-aya (Tiny Aya, 2026-09-02)

| URL | Status |
|---|---|
| https://huggingface.co/CohereLabs/tiny-aya-en-thinker | 200 |
| https://huggingface.co/CohereLabs/tiny-aya-l2-thinker | 200 |
| https://huggingface.co/CohereLabs/tiny-aya-base-32K | 200 |
| https://arxiv.org/abs/2609.10445 | 200 |
| https://arxiv.org/abs/2603.11510 | 200 |

Result: system_card=NOT_DISCLOSED; model_card=https://huggingface.co/CohereLabs/tiny-aya-en-thinker; usage_policy=https://docs.cohere.com/docs/usage-policy; paper=https://arxiv.org/abs/2609.10445

- paper URL support. https://arxiv.org/abs/2609.10445: "ng in SFT for reasoning generalization. Building Tiny Aya L2-Thinker at 3.35B scale, we achieve an L2 reasoning rate above 93% across 60 languages on 6 benchmarks spanning math, commonsense reasoning, instruction following, open-ended generation, and cultural reasoning while keeping performance stro"
- the card links the paper. https://huggingface.co/CohereLabs/tiny-aya-en-thinker: "ce Provider. 🙋 Ask for provider support Paper for CohereLabs/tiny-aya-en-thinker Building Multilingual Bridges: Data Mixing as the Pillar of Generalization for In-Language Reasoning Paper • 2609.10445 • Published Sep 9 • 33 ","eos_token":"<EOS_TOKEN>","pad_token":"<PAD>","unk_token":"<UNK>"},"chat_t"
