# alibaba-qwen evidence

Researched 2026-10-19. All URL checks used a desktop Chrome user agent. "401/404" is Hugging Face's response for a nonexistent repo (page title "404"). Qwen.ai blog pages are JavaScript-rendered; they return 200 to a bare fetch with an empty shell and were read in a real browser ("browser render").

Common basis for every system_card NOT_DISCLOSED: Qwen and the other Alibaba groups publish no system cards or safety cards. Searches of each HF card, the release blog and arXiv found none; the only "system card" strings on Qwen blogs are benchmark footnotes citing other labs' system cards (qwen.ai/blog?id=qwen3.8, qwen.ai/blog?id=qwen3.5). This matches all approved Qwen rows.

Common basis for usage_policy: approved Qwen rows use the lab-wide Alibaba Cloud International product terms URL (fetched 200 this session). The qwen.ai site footer also has a "Usage Policy" entry, but it is a JS element with no link URL, so the convention URL was kept.

## alibaba-qwen--one-peace (ONE-PEACE, 2023-05-18)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://modelscope.cn/models/damo/ONE-PEACE-4B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://huggingface.co/OFA-Sys/ONE-PEACE (README is YAML metadata only: license, language, tags; siblings are .gitattributes and README.md, no weights)
- 200 https://github.com/OFA-Sys/ONE-PEACE (links ModelScope damo/ONE-PEACE-4B; checkpoints served from OSS)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: ModelScope card (Alibaba DAMO), fetched 200; HF OFA-Sys/ONE-PEACE exists but holds only a metadata-only README and no weights, so ModelScope used (convention extension).

## alibaba-qwen--qwen-vl (Qwen-VL, 2023-08-24)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen-VL (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--qwen-14b (Qwen-14B, 2023-09-28)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen-14B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--tongyi-qianwen-2.0 (Tongyi Qianwen 2.0, 2023-10-31)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://www.alibabacloud.com/blog/alibaba-cloud-launches-tongyi-qianwen-2-0-and-industry-specific-models-to-support-customers-reap-benefits-of-generative-ai_600526 (no occurrence of technical report, paper, arxiv, model card, system card, safety)
- - arXiv API ti:"Tongyi Qianwen": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API and chat product, no weights; nothing in the Qwen HF org; announcement is an Alibaba Cloud blog only; paper NOT_DISCLOSED: no technical report; the announcement blog (fetched 200) cites none; arXiv title search "Tongyi Qianwen" returns nothing.

## alibaba-qwen--mplug-owl2 (mPLUG-Owl2, 2023-11-07)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/MAGAer13/mplug-owl2-llama2-7b (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://github.com/X-PLUG/mPLUG-Owl (mPLUG-Owl2 README: "Huggingface Model Hub ... mPLUG-Owl2 | Instruction tuning | Download link" pointing to huggingface.co/MAGAer13/mplug-owl2-llama2-7b)
- 200 https://www.modelscope.cn/models/damo/mPLUG-Owl2 (short Chinese card)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF repo that the X-PLUG/mPLUG-Owl GitHub lists as the official HF download, fetched 200; the card is a stub (title and figure).

## alibaba-qwen--qwen-audio-chat (Qwen-Audio-Chat, 2023-11-14)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen-Audio-Chat (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--seallm-7b-v2.5 (SeaLLM-7B-v2.5, 2023-12-01)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/SeaLLMs/SeaLLM-7B-v2.5 (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card (SeaLLMs, Alibaba DAMO), fetched 200.

## alibaba-qwen--qwen-vl-max (Qwen-VL-Max, 2024-01-25)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen-vl/ (text: "you can access Qwen-VL-Plus and Qwen-VL-Max through the Huggingface Spaces, the Qwen website, and Dashscope APIs"; no report, paper or card mention)
- 401/404 https://huggingface.co/Qwen/Qwen-VL-Max
- - HF API author=Qwen search "VL-Max": 0 repos
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen-VL-Max returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper NOT_DISCLOSED: release blog qwenlm.github.io/blog/qwen-vl (fetched 200) cites no report; the Qwen-VL paper 2308.12966 predates Max and does not cover it; arXiv search finds nothing.

## alibaba-qwen--qwen1.5-14b (Qwen1.5-14B, 2024-02-04)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen1.5-14B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen1.5/ (no technical report or arXiv mention)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: Qwen1.5 shipped with a blog only (approved Qwen1.5-72B ruling); the card cites only the Qwen-1 report.

## alibaba-qwen--qwen1.5-7b (Qwen1.5-7B, 2024-02-04)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen1.5-7B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen1.5/
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: Qwen1.5 shipped with a blog only (approved Qwen1.5-72B ruling).

## alibaba-qwen--qwen1.5-32b (Qwen1.5-32B, 2024-02-05)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen1.5-32B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen1.5/
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: Qwen1.5 shipped with a blog only (approved Qwen1.5-72B ruling).

## alibaba-qwen--qwen-plus (Qwen Plus, 2024-02-06)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 401/404 https://huggingface.co/Qwen/Qwen-Plus
- 200 https://www.alibabacloud.com/help/en/model-studio/models (product list, no report)
- - HF API author=Qwen search "Plus": 0 repos
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen-Plus returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper NOT_DISCLOSED: API-only 2024 Plus model; no report found on the Qwen blog, Model Studio docs or arXiv.

## alibaba-qwen--ovis-7b (Ovis-7B, 2024-06-17)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/ATH-MaaS/Ovis-Clip-Qwen1_5-7B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card for the 7B Ovis release (org AIDC-AI renamed ATH-MaaS; the old URL redirects), fetched 200.

## alibaba-qwen--qwen2-audio (Qwen2-Audio, 2024-07-15)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2-Audio-7B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--qwen2-math-72b (Qwen2-Math-72B, 2024-08-09)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2-Math-72B (model_card)
- 200 https://arxiv.org/abs/2409.12122 (paper)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen2-math/ (no report link)
- 200 https://arxiv.org/html/2409.12122 (text: "we train a math-specific reward model Qwen2-Math-RM, derived from Qwen2-Math-72B, to create the Qwen2-Math-Instruct models")
- 200 https://arxiv.org/html/2407.10671 (Qwen2 report: 0 mentions of Qwen2-Math)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper: Qwen2.5-Math Technical Report, fetched 200; it describes the Qwen2-Math-72B training pipeline (Qwen2-Math named 70 times).

## alibaba-qwen--ovis1.6-gemma2-9b (Ovis1.6-Gemma2-9B, 2024-09-16)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/ATH-MaaS/Ovis1.6-Gemma2-9B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://huggingface.co/AIDC-AI/Ovis1.6-Gemma2-9B redirects to ATH-MaaS
- 200 https://arxiv.org/html/2405.20797 (0 matches for Ovis1.6, Ovis-1.6, Gemma2, Gemma 2)
- - arXiv API abs:"Ovis1.6": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card (AIDC-AI renamed ATH-MaaS), fetched 200; paper NOT_DISCLOSED: the card cites only the original Ovis paper 2405.20797, whose text never mentions Ovis1.6 or Gemma2; arXiv abstract search "Ovis1.6" finds nothing.

## alibaba-qwen--qwen2.5-32b (Qwen2.5-32B, 2024-09-17)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2.5-32B (model_card)
- 200 https://arxiv.org/abs/2412.15115 (paper)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen2.5/
- 200 https://arxiv.org/html/2412.15115 (Qwen2.5-32B in base model tables)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper: Qwen2.5 Technical Report, fetched 200, reports Qwen2.5-32B results.

## alibaba-qwen--qwen2-vl-72b (Qwen2-VL-72B, 2024-09-18)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2-VL-72B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--qwen2.5-coder-7b (Qwen2.5-Coder (7B), 2024-09-18)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2.5-Coder-7B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--qwen2.5-3b (Qwen2.5-3B, 2024-09-19)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2.5-3B (model_card)
- 200 https://arxiv.org/abs/2412.15115 (paper)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen2.5-llm/
- 200 https://arxiv.org/html/2412.15115 (Qwen2.5-3B in tables)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper: Qwen2.5 Technical Report, fetched 200, reports Qwen2.5-3B results.

## alibaba-qwen--qwen2.5-math-7b-base (Qwen2.5-Math-7B-Base, 2024-09-19)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2.5-Math-7B (model_card)
- 200 https://arxiv.org/abs/2409.12122 (paper)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen2.5-math/
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card for the base model, fetched 200; paper: Qwen2.5-Math Technical Report, fetched 200, cited by the HF card.

## alibaba-qwen--marco-o1 (Marco-o1, 2024-10-16)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/ATH-MaaS/Marco-o1 (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card (AIDC-AI renamed ATH-MaaS), fetched 200.

## alibaba-qwen--qwen2.5-coder-32b (Qwen2.5-Coder (32B), 2024-11-12)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2.5-Coder-32B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--qwen2.5-turbo (Qwen2.5-Turbo, 2024-11-15)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://arxiv.org/abs/2412.15115 (paper)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen2.5-turbo/ (API documentation and demos only)
- 401/404 https://huggingface.co/Qwen/Qwen2.5-Turbo
- 200 https://arxiv.org/html/2412.15115 ("Qwen2.5-14B/32B & Qwen2.5-Turbo" evaluation sections; 33 mentions)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen2.5-Turbo returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper: Qwen2.5 Technical Report, fetched 200; it covers the proprietary Qwen2.5-Turbo explicitly (33 mentions).

## alibaba-qwen--ovis1.6-gemma2-27b (Ovis1.6-Gemma2-27B, 2024-11-26)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/ATH-MaaS/Ovis1.6-Gemma2-27B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://arxiv.org/html/2405.20797 (0 matches for Ovis1.6 or Gemma2)
- - arXiv API abs:"Ovis1.6": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card (AIDC-AI renamed ATH-MaaS), fetched 200; paper NOT_DISCLOSED: the card cites only the original Ovis paper 2405.20797, which never mentions Ovis1.6 or Gemma2; arXiv abstract search "Ovis1.6" finds nothing.

## alibaba-qwen--qvq (QVQ, 2024-12-25)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/QVQ-72B-Preview (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qvq-72b-preview/ (only "Safety and Ethical Considerations" limitation bullet; no system card)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--gte-modernbert (gte-modernbert, 2025-01-22)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Alibaba-NLP/gte-modernbert-base (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://arxiv.org/abs/2407.19669 (mGTE: text encoder "enhanced with RoPE and unpadding", not ModernBERT)
- - arXiv API abs:"gte-modernbert": one third-party paper (2602.16609 ColBERT-Zero)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card, fetched 200; paper NOT_DISCLOSED: the card cites only the earlier GTE and mGTE papers (2407.19669 covers the mGTE encoder, not the ModernBERT version); arXiv abstract search "gte-modernbert" finds only third-party work.

## alibaba-qwen--qwen2.5-vl-72b (Qwen2.5-VL-72B, 2025-02-19)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2.5-VL-72B-Instruct (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card (Instruct; no base repo was released), fetched 200.

## alibaba-qwen--qwen2.5-omni-7b (Qwen2.5-Omni 7B, 2025-03-26)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen2.5-Omni-7B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200.

## alibaba-qwen--qwq-plus (QWQ-Plus, 2025-04-08)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://www.alibabacloud.com/help/en/model-studio/qwq (API doc; no report)
- 401/404 https://huggingface.co/Qwen/QwQ-Plus
- - arXiv API ti:QwQ: 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/QwQ-Plus returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper NOT_DISCLOSED: the Model Studio QwQ doc (fetched 200) cites no report; the QwQ line has no report (approved QwQ-32B ruling); arXiv title search QwQ finds nothing from Qwen.

## alibaba-qwen--qwen3-reranker (Qwen3 Reranker, 2025-06-05)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3-Reranker-8B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card for the largest size of the family (0.6B, 4B and 8B cards share the same text), fetched 200.

## alibaba-qwen--qwen3-coder-480b-a35b (Qwen3-Coder-480B-A35B, 2025-07-22)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://qwenlm.github.io/blog/qwen3-coder/ (no report or arXiv mention)
- - arXiv API ti:"Qwen3-Coder": only 2603.00729 Qwen3-Coder-Next and a third-party paper
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: blog qwenlm.github.io/blog/qwen3-coder (fetched 200) has no report; the card cites only the Qwen3 report 2505.09388, which does not cover Qwen3-Coder (Qwen3-Max ruling); arXiv title search Qwen3-Coder finds only Qwen3-Coder-Next.

## alibaba-qwen--ovis2.5-9b (Ovis2.5 9B, 2025-08-15)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/ATH-MaaS/Ovis2.5-9B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card (AIDC-AI renamed ATH-MaaS), fetched 200.

## alibaba-qwen--qwen3-next-80b-a3b (Qwen3-Next-80B-A3B, 2025-09-10)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=4074cca80393150c248e508aa62983f9cb7d27cd&from=research.latest-advancements-list (only "technical report" match is the cited DeepSeek-V3 Technical Report)
- 401/404 https://huggingface.co/Qwen/Qwen3-Next-80B-A3B
- - arXiv API ti:"Qwen3-Next": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card (Instruct; a Thinking variant also exists, no base repo), fetched 200; paper NOT_DISCLOSED: the release blog (rendered in a browser) has no report; the card cites the Qwen3 and Qwen2.5-1M reports, neither of which covers Qwen3-Next; arXiv title search Qwen3-Next finds nothing.

## alibaba-qwen--agentfounder-30b (AgentFounder-30B, 2025-09-16)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 401/404 https://huggingface.co/Alibaba-NLP/AgentFounder-30B-A3B
- - HF API search AgentFounder: []
- 200 https://github.com/Alibaba-NLP/DeepResearch (Agent/AgentFounder contains only README.md and assets; README links no weights)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card NOT_DISCLOSED: no weights released; HF Alibaba-NLP/AgentFounder-30B-A3B returns 404, HF search AgentFounder is empty, GitHub Alibaba-NLP/DeepResearch Agent/AgentFounder holds only a README.

## alibaba-qwen--qwen3-omni-30b-a3b (Qwen3-Omni-30B-A3B, 2025-09-22)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card (Instruct), fetched 200.

## alibaba-qwen--tongyi-deepresearch (Tongyi DeepResearch, 2025-10-28)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Alibaba-NLP/Tongyi-DeepResearch-30B-A3B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://github.com/Alibaba-NLP/DeepResearch (lists HF Alibaba-NLP/Tongyi-DeepResearch-30B-A3B)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms, fetched 200; convention extended from Qwen-team rows to this other Alibaba group's release; model_card: HF card, fetched 200.

## alibaba-qwen--qwen3-max-thinking (Qwen3-Max-Thinking, 2026-01-25)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3-max-thinking (no matches for technical report, system card, model card, safety, open weight)
- 401/404 https://huggingface.co/Qwen/Qwen3-Max-Thinking
- - arXiv API ti:"Qwen3-Max": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen3-Max-Thinking returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper NOT_DISCLOSED: blog qwen.ai/blog?id=qwen3-max-thinking (rendered) has no report link; arXiv title search Qwen3-Max finds nothing.

## alibaba-qwen--qwen3-coder-next (Qwen3-Coder-Next, 2026-02-02)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3-Coder-Next (model_card)
- 200 https://arxiv.org/abs/2603.00729 (paper)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3-coder-next (header "TECH REPORT" links github.com/QwenLM/Qwen3-Coder/blob/main/qwen3_coder_next_tech_report.pdf)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper: Qwen3-Coder-Next Technical Report (arXiv version of the PDF the blog links), fetched 200.

## alibaba-qwen--qwen3.5-35b-a3b (Qwen3.5-35B-A3B, 2026-02-24)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3.5-35B-A3B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.5 (text: "Additional scaling results across a broader range of tasks will be detailed in our upcoming technical report.")
- - arXiv API ti:"Qwen3.5": only 2604.15804 Qwen3.5-Omni Technical Report plus third-party papers
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: the Qwen3.5 blog still calls the report upcoming; the card cites only the blog; arXiv title search Qwen3.5 finds only the Qwen3.5-Omni report and third-party work.

## alibaba-qwen--qwen3.5-omni-plus (Qwen3.5-Omni-Plus, 2026-03-29)
Cells researched: model_card, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 401/404 https://huggingface.co/Qwen/Qwen3.5-Omni-Plus
- - HF API author=Qwen search Omni: only Qwen2.5-Omni and Qwen3-Omni repos
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen3.5-Omni-Plus returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); no Qwen3.5-Omni weights on HF.

## alibaba-qwen--qwen-3.6-plus (Qwen 3.6 Plus, 2026-04-01)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.6 ("Available immediately via our API"; no matches for technical report, system card, model card, safety, weights)
- 401/404 https://huggingface.co/Qwen/Qwen3.6-Plus
- - arXiv API ti:"Qwen3.6": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen3.6-Plus returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper NOT_DISCLOSED: blog qwen.ai/blog?id=qwen3.6 (rendered) mentions no report; arXiv title search Qwen3.6 finds nothing.

## alibaba-qwen--qwen3.6-27b (Qwen3.6 27B, 2026-04-22)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3.6-27B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.6-27b (links HF Qwen/Qwen3.6-27B; no technical report mention)
- - arXiv API ti:"Qwen3.6": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: blog qwen.ai/blog?id=qwen3.6-27b and the card cite only the blog; arXiv title search Qwen3.6 finds nothing.

## alibaba-qwen--qwen3.7-max (Qwen3.7-Max, 2026-05-19)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.7 ("our latest proprietary model"; "Further analysis of the scaling dynamics and methodology will be detailed in our upcoming technical report.")
- 401/404 https://huggingface.co/Qwen/Qwen3.7-Max
- - arXiv API ti:"Qwen3.7": 0 results; HF API author=Qwen search 3.7: 0 repos
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen3.7-Max returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper NOT_DISCLOSED: blog qwen.ai/blog?id=qwen3.7 calls the technical report upcoming; arXiv title search Qwen3.7 finds nothing.

## alibaba-qwen--qwen3.7-plus (Qwen3.7-Plus, 2026-06-03)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.7-plus (no matches for technical report, system card, model card, safety, open weight)
- 401/404 https://huggingface.co/Qwen/Qwen3.7-Plus
- - arXiv API ti:"Qwen3.7": 0 results
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen3.7-Plus returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); paper NOT_DISCLOSED: blog qwen.ai/blog?id=qwen3.7-plus mentions no report; arXiv title search Qwen3.7 finds nothing.

## alibaba-qwen--qwen-3.8-max (Qwen 3.8 Max, 2026-07-19)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.8 ("This also marks the first time we will open-source the weights of a Qwen-Max-class model"; no technical report mention; "system card" appears only in benchmark footnotes about other labs)
- 200 (browser render) https://www.qwencloud.com/models/qwen3.8-max (product listing)
- 401/404 https://huggingface.co/Qwen/Qwen3.8-Max
- - HF card Qwen3.8-2.4T-A95B text: "Qwen3.8-Max is the official version based on Qwen3.8-2.4T-A95B with more features, such as vision input & non-thinking support"
- - arXiv API ti:"Qwen3.8": only 2609.25611 Qwen3.8-Omni and 2608.30320 Qwen3.8-Next architecture
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card for Qwen3.8-2.4T-A95B, fetched 200; it names Qwen3.8-Max as the official API version based on these weights (family card that names it; doubtful, see report); paper NOT_DISCLOSED: blog qwen.ai/blog?id=qwen3.8 has no report; the card cites only the blog; arXiv title search Qwen3.8 finds only the Omni and Flash-Next architecture reports.

## alibaba-qwen--qwen3.7-flash (Qwen3.7 Flash, 2026-07-27)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://www.qwencloud.com/models/qwen3.7-flash (product listing: overview, pricing, limits)
- 200 https://www.alibabacloud.com/help/en/model-studio/newly-released-models (2026-07-21 qwen3.7-flash entry, no report)
- 401/404 https://huggingface.co/Qwen/Qwen3.7-Flash
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card NOT_DISCLOSED: API-only, no weights; HF Qwen/Qwen3.7-Flash returns 404 and the Qwen HF org has no repo for it (Qwen2.5-Max and Qwen3-Max convention); the QwenCloud page is a product listing; paper NOT_DISCLOSED: the QwenCloud model page and Model Studio release notes cite no report; arXiv title search Qwen3.7 finds nothing.

## alibaba-qwen--qwen3.8-2.4t-a95b (Qwen3.8-2.4T-A95B, 2026-08-08)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- - HF card citation is only @misc qwen38 pointing to https://qwen.ai/blog?id=qwen3.8
- - arXiv API ti:"Qwen3.8": only Omni and Next-architecture reports
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: the card cites only the Qwen3.8 blog; arXiv title search Qwen3.8 finds only the Omni and Flash-Next architecture reports.

## alibaba-qwen--qwen-3.8-27b (Qwen 3.8 27B, 2026-08-14)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3.8-27B (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- - HF card citation is only @misc qwen38 pointing to the Qwen3.8 blog
- - arXiv API ti:"Qwen3.8": only Omni and Next-architecture reports
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card, fetched 200; paper NOT_DISCLOSED: the card cites only the Qwen3.8 blog; arXiv title search Qwen3.8 finds only the Omni and Flash-Next architecture reports.

## alibaba-qwen--qwen3.8-flash-next (Qwen3.8-Flash-Next, 2026-08-24)
Cells researched: paper, system_card, usage_policy
Fetched:
- 200 https://arxiv.org/abs/2608.30320 (paper)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.8-flash-next (header "TECH REPORT" links github.com/QwenLM/Qwen3.8-Flash-Next/blob/main/tech_report.pdf)
- - arXiv 2608.30320 abstract: "We describe the architecture and ablations of Qwen3.8-Flash-Next"
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; paper: On the Design of Qwen3.8-Next Architecture (Qwen Team tech report cited by the HF card; the blog links its PDF), fetched 200.

## alibaba-qwen--qwen3.8-flash (Qwen3.8 Flash, 2026-08-26)
Cells researched: model_card, paper, system_card, usage_policy
Fetched:
- 200 https://huggingface.co/Qwen/Qwen3.8-Flash-Next (model_card)
- 200 https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0 (usage_policy)
- 200 https://www.alibabacloud.com/help/en/model-studio/newly-released-models (2026-08-26 qwen3.8-flash entry)
- 200 (browser render) https://qwen.ai/blog?id=qwen3.8-flash-next ("The production version, with 1M context by default and official built-in tools, is served as Qwen3.8-Flash on QwenCloud")
- 401/404 https://huggingface.co/Qwen/Qwen3.8-Flash
- 200 https://arxiv.org/html/2608.30320 (0 matches for "Qwen3.8-Flash" outside "Qwen3.8-Flash-Next", 0 for QwenCloud)
Basis: system_card NOT_DISCLOSED: not found, checked the HF card, the release blog or announcement, the Qwen blog (Qwen publishes no system or safety cards) and arXiv; usage_policy: lab-wide Alibaba Cloud International product terms (Model Studio sections), fetched 200, per the approved Qwen convention; model_card: HF card for Qwen3.8-Flash-Next, fetched 200; it names Qwen3.8-Flash as the official API version based on these weights (doubtful, see report); paper left NOT_RESEARCHED: arXiv 2608.30320 covers Qwen3.8-Flash-Next, the open model Qwen3.8-Flash is served from, but never names Qwen3.8-Flash; needs a ruling.
