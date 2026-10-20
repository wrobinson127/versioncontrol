# Moonshot evidence (researched 2026-10-19)

Status codes from curl with a Chrome user agent, redirects followed. kimi.com redirects to kimi.ai; the Kimi blog was read rendered in a browser.

Org rulings applied (from APPROVED rows): system card NOT_DISCLOSED (Moonshot publishes no system or safety cards); model card is the moonshotai HF README; usage policy is https://www.kimi.com/user/agreement/modelUse for all models, including API-only k1.5; paper is the arXiv abs page of the Kimi Team report.

HF org listing (https://huggingface.co/api/models?author=moonshotai&limit=200, 200) returned 19 repos: Kimi-K3, Kimi-K2.6, Kimi-K2.5, Kimi-K2-Thinking, Kimi-K2.7-Code, Kimi-K2-Instruct, Moonlight-16B-A3B, Moonlight-16B-A3B-Instruct, Kimi-VL-A3B-Instruct, Kimi-VL-A3B-Thinking, MoonViT-SO-400M, Kimi-Audio-7B-Instruct, Kimi-Audio-7B, Kimi-Dev-72B, Kimi-VL-A3B-Thinking-2506, Kimi-K2-Base, Kimi-K2-Instruct-0905, Kimi-Linear-48B-A3B-Instruct, Kimi-Linear-48B-A3B-Base.

## moonshot--kimi-explorer
- 404 https://www.53ai.com/news/LargeLanguageModel/2024101137012.html (source, dead)
- 200 https://www.kimi.com/user/agreement/modelUse
- Web search: press (ctol.digital, Wikipedia Kimi chatbot) describes Kimi Explorer Edition as a Kimi chat search mode that went live 11 October 2024. The entry date 2024-01-01 does not match.
- model_card NOT_DISCLOSED: no Explorer repo in the 19-repo HF listing above; no platform.moonshot.ai model page for it.
- paper NOT_DISCLOSED: arXiv query all:"Kimi Explorer" returned zero entries.
- system_card NOT_DISCLOSED: none on moonshotai.github.io or the Kimi blog; org ruling.

## moonshot--kimi-dev-72b
- 200 https://moonshotai.github.io/Kimi-Dev/ (source)
- 200 https://huggingface.co/moonshotai/Kimi-Dev-72B (license: mit, base Qwen2.5-72B)
- 200 https://github.com/MoonshotAI/Kimi-Dev
- 200 https://arxiv.org/abs/2509.23045 "Kimi-Dev: Agentless Training as Skill Prior for SWE-Agents"; comments field: "68 pages. GitHub repo at" github.com/MoonshotAI/Kimi-Dev; abstract presents Kimi-Dev, 60.4% on SWE-bench Verified.
- 200 https://www.kimi.com/user/agreement/modelUse
- HF README still shows "Tech Report (Coming soon...)"; the arXiv report appeared later (Sept 2025), which counts under the methodology.
- system_card NOT_DISCLOSED: no card on the project page, HF card or GitHub; org ruling.

## moonshot--kimi-linear
- 200 https://github.com/MoonshotAI/Kimi-Linear/blob/master/tech_report.pdf (source)
- 200 https://huggingface.co/moonshotai/Kimi-Linear-48B-A3B-Instruct (license: mit; also 200 for the -Base repo)
- 200 https://arxiv.org/abs/2510.26692 "Kimi Linear: An Expressive, Efficient Attention Architecture", first author "Kimi Team"; linked from the HF card as Paper (huggingface.co/papers/2510.26692).
- 200 https://www.kimi.com/user/agreement/modelUse
- system_card NOT_DISCLOSED: none on HF or GitHub; org ruling.

## moonshot--kimi-k3
- 200 https://huggingface.co/moonshotai/Kimi-K3 (license: other, kimi-k3)
- 200 https://www.kimi.com/blog/kimi-k3 (redirects to kimi.ai; title "Kimi K3 Tech Blog: Open Frontier Intelligence")
- 200 https://github.com/MoonshotAI/Kimi-K3/blob/main/k3_tech_report.pdf (linked from HF as "Full Report")
- 200 https://arxiv.org/abs/2607.24653 "Kimi K3: Open Frontier Intelligence", author "Kimi Team", published 2026-07-27
- 200 https://www.kimi.com/user/agreement/modelUse (blog footer links kimi.ai/user/agreement/modelUse?version=v2)
- system_card NOT_DISCLOSED: rendered blog has no safety or system card; its only card mention is "the context-compaction strategy used in the Claude model cards". HF README mentions safety only in benchmark refusal counts for other models. Org ruling.
