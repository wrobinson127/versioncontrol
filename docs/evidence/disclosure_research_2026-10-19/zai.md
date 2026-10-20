# Z.ai evidence (researched 2026-10-19)

Status codes from curl with a Chrome user agent, redirects followed. z.ai/blog pages are a JS app (curl gets a 598 byte shell), so blog text was read in a browser.

Org rulings applied (from APPROVED rows): system card is NOT_DISCLOSED (Z.ai publishes no system cards); model card is the zai-org HF README; usage policy is https://chat.z.ai/legal-agreement/terms-of-service for every model, open or API; paper is the arXiv report the HF card cites, including family reports when there is no dedicated one (GLM-4.6, GLM-4.7, GLM-5.2 precedents).

## zai--chatglm3-6b
- 200 https://huggingface.co/zai-org/chatglm3-6b (https://huggingface.co/THUDM/chatglm3-6b redirects here)
- 200 https://www.zhipuai.cn/en/news/76 (source announcement)
- 200 https://arxiv.org/abs/2406.12793 "ChatGLM: A Family of Large Language Models from GLM-130B to GLM-4 All Tools"
- 200 https://chat.z.ai/legal-agreement/terms-of-service
- HF README Citation section: "If you find our work helpful, please consider citing the following paper." followed by the bibtex for eprint 2406.12793. License section points to Apache-2.0 for code and a MODEL_LICENSE for weights.
- system_card NOT_DISCLOSED: HF README links only GitHub, Twitter, GLM and GLM-130B papers; no safety or system card. arXiv title search "ChatGLM3" returned no entries. Org ruling: no Z.ai system cards.

## zai--glm-4.7-flash
- 200 https://huggingface.co/zai-org/GLM-4.7-Flash (license: mit)
- 200 https://arxiv.org/abs/2508.06471 "GLM-4.5: Agentic, Reasoning, and Coding (ARC) Foundation Models"
- 200 https://chat.z.ai/legal-agreement/terms-of-service
- HF README: "Check out the GLM-4.7 technical blog, technical report(GLM-4.5)", linking https://arxiv.org/abs/2508.06471; Citation section uses the same URL.
- system_card NOT_DISCLOSED: README mentions no safety card; the only "System Card" string is a link to Anthropic's Claude Opus 4.5 card used for a tau2-Bench fix. arXiv title search "GLM-4.7" returned no entries.

## zai--glm-5.1
- 200 https://z.ai/blog/glm-5.1 (rendered title "GLM-5.1: Towards Long-Horizon Tasks")
- 200 https://huggingface.co/zai-org/GLM-5.1 (license: mit)
- 200 https://arxiv.org/abs/2602.15763 "GLM-5: from Vibe Coding to Agentic Engineering"
- 200 https://chat.z.ai/legal-agreement/terms-of-service (linked from the blog footer)
- HF README: "Check out the GLM-5.1 blog and GLM-5 Technical report"; Citation: "If you find GLM-5.1 or GLM-5 useful in your research, please cite our technical report" (2602.15763).
- system_card NOT_DISCLOSED: rendered blog links only HF, arXiv 2502.10517v1 (a benchmark reference) and the terms; no safety or system card text. arXiv title search "GLM-5.1" returned no entries.

## zai--glm-5.3
- 200 https://z.ai/blog/glm-5.3 (rendered title "GLM-5.3: Frontier Coding with Emergent Cyber Capabilities")
- 200 https://huggingface.co/zai-org/GLM-5.3 (license: other, license_name glm-5.3)
- 200 https://arxiv.org/abs/2602.15763
- 200 https://chat.z.ai/legal-agreement/terms-of-service (linked from the blog)
- HF README Citation: "If you find GLM-5.3 useful in your research, please cite our technical report", url https://arxiv.org/abs/2602.15763.
- Blog arXiv links checked: 2603.12201 "IndexCache: Accelerating Sparse Attention via Cross-Layer Index Reuse" and 2607.07508 "Single-Rollout Asynchronous Optimization for Agentic Reinforcement Learning", cited as parts of the training stack, not model reports.
- system_card NOT_DISCLOSED: the blog says "We will release the weights in two weeks after launch, once safety evaluation and hardening are complete." but links no safety report or card (its links are HF, the two arXiv papers, privacy policy, terms). No safety section in the HF README. arXiv search abs:"GLM-5.3" returned only third-party papers. Press search (codersera.com GLM-5.3 cyber article) states the concern is "the absence of any published system card or safety report".

## zai--glm-5.3-flash
- model_card unchanged (https://huggingface.co/zai-org/GLM-5.3-Flash, 200)
- 200 https://arxiv.org/abs/2602.15763
- 200 https://chat.z.ai/legal-agreement/terms-of-service
- HF README: "Check out the GLM-5.3-Flash blog and GLM-5 Technical report"; Citation: "please cite our technical report" (2602.15763).
- system_card NOT_DISCLOSED: README has no safety or system card; arXiv title search "GLM-5.3" returned only 2609.15030 "Validating Hybrid-State Cache Recovery for GLM-5.3-Flash with vLLM and LMCache", a serving study, not a Z.ai report. Org ruling.
