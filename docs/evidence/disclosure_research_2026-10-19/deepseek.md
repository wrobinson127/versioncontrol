# DeepSeek disclosure evidence (researched 2026-10-19)

Method: curl with a Chrome user agent and browser Accept headers. HF org listing from `https://huggingface.co/api/models?author=deepseek-ai`. Final recheck of every URL in deepseek.json: all 200 (work/final_check.txt).

Conventions applied (from the APPROVED rows in content/disclosure_links/deepseek.json):
- model_card: the HF README of the model repo. Where base and chat or instruct variants exist, the base repo is used, matching the LLM 67B row.
- usage_policy: the lab-wide Terms of Use, https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html (200).
- system_card: NOT_DISCLOSED. DeepSeek publishes no system or safety card. For each release I checked the HF card, the GitHub repo and the api-docs news list (https://api-docs.deepseek.com/news/news1120/, 200, whose sidebar lists every news post from 2024/07/25 to 2026/10/17). None of them links a system card or safety report.
- paper: an arXiv report, or a lab-hosted tech report PDF where no arXiv version exists.

## deepseek--deepseek-coder-33b
- 200 https://huggingface.co/deepseek-ai/deepseek-coder-33b-base. The card is "Introduction of Deepseek Coder" and covers the 1B to 33B versions.
- 200 Terms of Use. system_card NOT_DISCLOSED: the card has no safety or system card link.

## deepseek--deepseekmoe-16b
- 200 https://huggingface.co/deepseek-ai/deepseek-moe-16b-base. Links arxiv.org/pdf/2401.06066.
- 200 Terms of Use. system_card NOT_DISCLOSED, same basis as above.

## deepseek--deepseekmath-7b
- 200 https://huggingface.co/deepseek-ai/deepseek-math-7b-base. Links arxiv.org/pdf/2402.03300.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseek-vl-7b
- 200 https://huggingface.co/deepseek-ai/deepseek-vl-7b-base. Links arxiv.org/abs/2403.05525.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseek-coder-v2-236b
- 200 https://huggingface.co/deepseek-ai/DeepSeek-Coder-V2-Base. The heading reads "DeepSeek-Coder-V2: Breaking the Barrier of Closed-Source Models in Code Intelligence". DeepSeek-Coder-V2-Instruct (also 236B) is 200 too.
- 200 https://arxiv.org/abs/2406.11931. The title matches the card heading, and the first citation_author is "DeepSeek-AI".
- 200 https://github.com/deepseek-ai/DeepSeek-Coder-V2.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseek-prover-v1.5
- 200 https://huggingface.co/deepseek-ai/DeepSeek-Prover-V1.5-RL. Heading: "DeepSeek-Prover-V1.5: Harnessing Proof Assistant Feedback for Reinforcement Learning and Monte-Carlo Tree Search". The Base and SFT repos are also published.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--janus-1.3b
- 200 https://huggingface.co/deepseek-ai/Janus-1.3B. Links arxiv.org/abs/2410.13848.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseek-r1-lite-preview
- 200 https://api-docs.deepseek.com/news/news1120/. Text: "DeepSeek-R1-Lite-Preview is now live", "Open-source models & API coming soon!", "Try it now at http://chat.deepseek.com". The post links no card or report.
- model_card NOT_DISCLOSED: the HF API search `models?search=R1-Lite&author=deepseek-ai` returned `[]`. The GitHub search `org:deepseek-ai R1-Lite` returned total_count 0. The deepseek-ai HF listing has no R1-Lite repo. The open release that followed was DeepSeek-R1, which is a separate entry.
- paper NOT_DISCLOSED: the arXiv API search for "R1-Lite" returned no entries. The R1 paper (arXiv 2501.12948 HTML, about 61 KB of text) never contains the string "lite".
- usage_policy: the Terms of Use (200) govern chat.deepseek.com, where the preview ran.
- system_card NOT_DISCLOSED.

## deepseek--deepseek-r1-distill-llama-70b
- 200 https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-70B. This is the shared DeepSeek-R1 card, and it links arxiv.org/abs/2501.12948.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--janus-pro-7b
- 200 https://huggingface.co/deepseek-ai/Janus-Pro-7B.
- 200 https://arxiv.org/abs/2501.17811 "Janus-Pro: Unified Multimodal Understanding and Generation with Data and Model Scaling" (authors Chen, Wu, Liu et al.).
- 200 https://github.com/deepseek-ai/Janus/blob/main/janus_pro_tech_report.pdf. This is the same report, hosted by the lab. arXiv was chosen as the stable copy.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseek-prover-v2-671b
- 200 https://huggingface.co/deepseek-ai/DeepSeek-Prover-V2-671B.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseek-ocr
- 200 https://huggingface.co/deepseek-ai/DeepSeek-OCR. Links arxiv.org/abs/2510.18234.
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseekmath-v2
- 200 https://huggingface.co/deepseek-ai/DeepSeek-Math-V2. Heading: "DeepSeekMath-V2: Towards Self-Verifiable Mathematical Reasoning".
- 200 Terms of Use. system_card NOT_DISCLOSED.

## deepseek--deepseek-v4-flash-0731
- 200 https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731. The repo was created 2026-07-31. The card says the model "is the official release of DeepSeek-V4-Flash, superseding the preview version", and its "Technical Report" link points to https://arxiv.org/abs/2606.19348.
- 200 https://arxiv.org/abs/2606.19348 "DeepSeek-V4: Towards Highly Efficient Million-Token Context Intelligence" (author DeepSeek-AI).
- 200 Terms of Use. system_card NOT_DISCLOSED: the repo files are code, config, encoding, inference, LICENSE and README, with no safety document.

## deepseek--deepseek-v4.1-flash
- model_card is unchanged (already a URL, rechecked 200).
- 200 https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/main/DeepSeek_V41_Tech_Report.pdf. The card links it as "Technical Report", and it is the same paper URL the approved V4.1-Flash-1017 row uses.
- 200 Terms of Use. system_card NOT_DISCLOSED: the repo file list (README, LICENSE, tech report PDF, assets, encoding, evaluation, inference) has no system or safety card.
