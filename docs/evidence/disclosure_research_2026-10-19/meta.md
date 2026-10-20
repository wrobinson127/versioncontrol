# Meta disclosure evidence (researched 2026-10-19)

Method: curl with a Chrome user agent plus browser headers (Accept, Accept-Language, Sec-Fetch-*). With a user agent alone, ai.meta.com returns 400; with the full headers it returns 200. PDFs were downloaded and their text extracted with pypdf. Final recheck of every URL in meta.json: all 200 (work/final_check.txt).

Conventions applied:
- From the approved meta rows:
  - Llama-era model cards are the MODEL_CARD.md files on GitHub.
  - A bespoke non-commercial research license without an AUP gives usage_policy NOT_DISCLOSED (LLaMA-65B).
  - Llama releases have no system card.
  - For Muse API models, usage_policy is the Meta Model API AUP and model_card is a dedicated card PDF (Muse Wonder).
- Extended from google-deepmind: a standalone release safety report counts as system_card (the Gemini 3 Pro FSF report). A model card that carries the safety results while relying on another model's report gives NOT_DISCLOSED (Gemini 3.1 Flash-Lite).
- Extended from deepseek: for a model offered only in a consumer product, the product terms of service with an acceptable-use section count as usage_policy (Muse Spark 1.0 only).

## meta--opt-iml-175b
- 200 https://github.com/facebookresearch/metaseq/tree/main/projects/OPT-IML. The folder holds only README.md, download_optiml175b.md and optiml_paper_v1.pdf. The README lists OPT-IML-175B weights as "[Request]" and says "The use of OPT-IML model weights is subject to the OPT Model License".
- 200 https://huggingface.co/facebook/opt-iml-30b. HF has only the opt-iml-30b, opt-iml-max-30b and 1.3b cards. The 30B card describes OPT-IML generically ("a set of instruction-tuned versions of OPT") and never mentions 175B.
- metaseq projects/OPT holds model_card.md, but that card is for base OPT.
- model_card NOT_DISCLOSED (doubtful, see report). system_card NOT_DISCLOSED.
- usage_policy NOT_DISCLOSED: the OPT MODEL_LICENSE.md opens "OPT-175B LICENSE AGREEMENT" and has 0 matches for "acceptable use". This matches the LLaMA-65B ruling.

## meta--llama-33b
- 200 https://github.com/meta-llama/llama/blob/llama_v1/MODEL_CARD.md. The raw text says: "The model comes in different sizes: 7B, 13B, 33B and 65B parameters."
- system_card and usage_policy NOT_DISCLOSED, on the same basis as the approved LLaMA-65B row (the same release).

## meta--incoder-6.7b
- 200 https://huggingface.co/facebook/incoder-6B. The card is titled "InCoder 6B" ("A 6B parameter decoder-only Transformer"), its license is "cc-by-nc-4.0", and it links the paper arXiv 2204.05999, which calls the model 6.7B.
- 200 https://github.com/dpfried/incoder (the author's repo, example code only).
- system_card NOT_DISCLOSED: none on the card, the repo or the project site links. usage_policy NOT_DISCLOSED: CC-BY-NC-4.0 and no AUP.

## meta--imagebind
- 200 https://github.com/facebookresearch/ImageBind/blob/main/model_card.md. Text: "Model Card for ImageBind", "Developed by: Meta AI", "License: CC BY-NC-SA 4.0".
- Repo contents: .assets, CODE_OF_CONDUCT.md, CONTRIBUTING.md, LICENSE, README.md, imagebind, model_card.md, requirements.txt, setup.py. There is no use policy and no system card. system_card and usage_policy NOT_DISCLOSED.

## meta--multi-token-prediction-7b
- 200 https://huggingface.co/facebook/multi-token-prediction. The card text (rendered on the gated page) reads: "Models accompanying the research paper 'Better & Faster Large Language Models via Multi-token Prediction'", with "four 7B parameter models trained on code".
- The gate's "MULTI-TOKEN PREDICTION RESEARCH LICENSE AGREEMENT 18th June 2024" says: "'Acceptable Use Policy' means the LLaMA Acceptable Use Policy (https://ai.meta.com/llama/use-policy/) ... incorporated into this Agreement".
- 200 https://ai.meta.com/llama/use-policy/ (with browser headers). This is the URL the approved Llama 2 rows use.
- system_card NOT_DISCLOSED: none on the card or the paper.

## meta--chameleon-34b
- 200 https://huggingface.co/facebook/chameleon-30b. Card text: "Meta Chameleon 30B. Repository for Meta Chameleon, a mixed-modal early-fusion foundation model from FAIR." The HF metadata gives safetensors total 34,323,732,480 parameters, so this is the paper's 34B model. The gate is titled "Meta Chameleon Research License and Acceptable Use Policy".
- 200 https://github.com/facebookresearch/chameleon/blob/main/USE_POLICY.md: "Meta Chameleon Acceptable Use Policy". The repo files include LICENSE, README.md and USE_POLICY.md, with no system card.
- 400 https://ai.meta.com/resources/models-and-libraries/chameleon-downloads/ (not used).
- system_card NOT_DISCLOSED.

## meta--longvu
- 200 https://github.com/Vision-CAIR/LongVU. The README links Vision-CAIR's HF checkpoints and project page. 200 https://huggingface.co/Vision-CAIR/LongVU_Qwen2_7B, a minimal card under license apache-2.0. All public artifacts are Vision-CAIR (KAUST) pages. HF searches for longvu under facebook or meta orgs found nothing.
- model_card left NOT_RESEARCHED: it is unclear whether a co-author lab's card counts as Meta's.
- usage_policy left NOT_RESEARCHED: the repo is Apache-2.0 with no AUP, but the Llama 3.2 based checkpoints may carry the Llama 3.2 AUP.
- system_card NOT_DISCLOSED: no system card on any of these pages.

## meta--muse-spark
- 200 https://ai.meta.com/blog/introducing-muse-spark-msl/ (April 8, 2026). Text: "Muse Spark is available today at meta.ai and the Meta AI app. We're opening a private API preview to select users." It also says: "Full results are available in our Safety & Preparedness Report." The links found are the eval methodology, the safety report and the Scaling Framework.
- 200 https://ai.meta.com/static-resource/muse-spark-safety-and-preparedness-report/ (PDF, 160 pages). Title: "Muse Spark Safety & Preparedness Report". Abstract: "we first present evaluations for catastrophic risk domains under Meta's Advanced AI Scaling Framework, along with the evidence that informed our launch decision". Used as system_card.
- 200 https://ai.meta.com/static-resource/muse-spark-eval-methodology (6 pages, benchmark methodology only).
- model_card NOT_DISCLOSED:
  - The safety report says "as reported in the model card.21", and footnote 21 is the blog URL. No card document exists.
  - 200 https://dev.meta.ai/models/muse-spark/ is a product page, now titled "Muse Spark 1.3".
  - 404 https://research.meta.ai/static/muse-spark-model-card.
  - 500 https://ai.meta.com/static-resource/muse-spark-model-card.
- usage_policy:
  - 200 https://dev.meta.ai/docs/models says Muse Spark 1.1 is "the original version" on the API, and the 1.1 blog says "For the first time, developers can begin building with Muse Spark 1.1 via the new Meta Model API". So 1.0 shipped in Meta AI only.
  - 200 https://www.facebook.com/legal/ai-terms, "Meta AIs Terms of Service", which apply to "Meta AIs ... through any Meta Product". It has an "Acceptable Uses" section ("You may not access, use, or allow others to access or use AIs in any manner that would: ...") and an effective date of May 13, 2026. Used as usage_policy (convention extension).
- paper NOT_DISCLOSED: none on the blog, on ai.meta.com or on arXiv. A web search for a Muse Spark technical report found only press coverage.

## meta--muse-spark-1.1
- 200 https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/. Text: "Our full safety posture for 1.1 is documented in our Muse Spark 1.1 Evaluation Report."
- 200 https://ai.meta.com/static-resource/muse-spark-1-1-evaluation-report (PDF, 112 pages): "we present Muse Spark 1.1's evaluation profile, including its performance capabilities and its safety under Meta's Advanced AI Scaling Framework". Used as system_card.
- 500 https://ai.meta.com/static-resource/muse-spark-1-1-eval-methodology.
- model_card NOT_DISCLOSED: 200 https://dev.meta.ai/models/muse-spark-1-1/ is a product page with a benchmark table that says "see our report" and links the evaluation report. 404 research.meta.ai/static/muse-spark-1-1-model-card.
- usage_policy: 200 https://dev.meta.ai/legal/acceptable-use-policy, which covers "Services and Meta Materials as defined in the Meta Model API Terms of Service". 1.1 is on the Model API (docs/models).
- paper NOT_DISCLOSED: nothing beyond the evaluation report.

## meta--muse-spark-1.2
- 200 https://research.meta.ai/blog/introducing-muse-code-and-muse-spark-1-2. The blog has no Safety section, and its only document link is /static/muse-spark-1-2-methodology.
- 200 https://research.meta.ai/static/muse-spark-1-2-methodology (3 pages, "Muse Spark 1.2 & Muse Code Evaluation Methodology", benchmarks only).
- system_card, model_card and paper NOT_DISCLOSED:
  - 200 https://dev.meta.ai/models/muse-spark-1-2/ is a product page.
  - 404 research.meta.ai/static/muse-spark-1-2-model-card.
- usage_policy: Meta Model API AUP (200). docs/models lists muse-spark-1.2 on the API.

## meta--muse-glimmer
- 200 https://research.meta.ai/blog/introducing-muse-glimmer-open-agentic-model (August 10, 2026, Apache 2.0). It links the HF model, /static/muse-glimmer-methodology and "Read the Muse Glimmer Technical Report".
- 200 https://huggingface.co/meta-models/Muse-Glimmer-30B: "Muse Glimmer Model Card", "Model Release Date: August 2026".
- 200 https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/main/USAGE_POLICY.md: "Muse Glimmer Usage Policy". The card says "Our Usage Policy can be found here".
- 200 https://ai.meta.com/research/publications/muse-glimmer-30b-an-on-device-agentic-model/: "Muse Glimmer 30B: An On-Device Agentic Model", dated October 19, 2026, with "Download the Paper". The PDF link is an expiring fbcdn URL, so the publication page is recorded.
- 200 https://research.meta.ai/static/muse-glimmer-methodology (7 pages).
- system_card NOT_DISCLOSED: the HF card carries the frontier-risk tables itself and says "See the Muse Spark Safety & Preparedness Report for a detailed description of the above evaluations and our methodology". No Glimmer-specific safety report is linked from the blog, the card, or dev.meta.ai/models/muse-glimmer (200).

## meta--muse-spark-1.3
- 200 https://research.meta.ai/blog/introducing-muse-spark-1-3. Its Safety paragraph ("We've improved safety along several axes...") links no report. The only document link is /static/muse-spark-1-3-multimodal-evaluation-methodology.
- 200 https://research.meta.ai/static/muse-spark-1-3-multimodal-evaluation-methodology (4 pages, "Muse Spark 1.3 Evaluation Methodology").
- system_card, model_card and paper NOT_DISCLOSED:
  - 404 https://dev.meta.ai/models/muse-spark-1-3/.
  - 200 https://dev.meta.ai/models/muse-spark/ is a product page with a benchmark table and pricing.
  - 404 research.meta.ai/static/muse-spark-1-3-model-card.
- usage_policy: Meta Model API AUP (200). docs/models lists muse-spark-1.3 on the API and on Muse Code.
