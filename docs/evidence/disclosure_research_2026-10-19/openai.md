# OpenAI evidence (researched 2026-10-19)

All fetches used a desktop Chrome user agent. Status codes are final codes after redirects.

## Shared sources
- 200 https://openai.com/policies/usage-policies/ (title "Usage policies"). Recorded as usage_policy on every row, following the approved OpenAI rows.
- 200 https://deploymentsafety.openai.com/ (hub homepage). Listed updates: Oct 15 2026 GPT-Live-1.1; Oct 07 GPT-6 Sol and Luna October update; Sep 29 GPT-6.1 Sol addendum; Sep 08 ChatGPT Images 2.5; Sep 03 GPT-6 Astra; Aug 06 "GPT-5.6 August Updates"; Jul 09 GPT-5.6 System Card; Jul 08 GPT-Live.
- 200 https://deploymentsafety.openai.com/sitemap.xml. Top-level card slugs: 4o-native-image-generation, chatgpt-agent, chatgpt-images-2-0, chatgpt-images-2-5, deep-research, gpt-5, gpt-5-1, gpt-5-1-codex-max, gpt-5-2, gpt-5-2-codex, gpt-5-3-codex, gpt-5-3-instant, gpt-5-4-thinking, gpt-5-5, gpt-5-5-instant, gpt-5-6, gpt-5-6-august-update, gpt-5-6-preview, gpt-5-codex, gpt-5-sensitive-conversations, gpt-6-1-sol, gpt-6-astra, gpt-6-october, gpt-live, gpt-live-1-1, gpt-oss, gpt-rosalind-5-5, o3, sora-2. There is no slug for ChatGPT (2022), GPT-3.5, GPT-4 Turbo, embeddings, gpt-realtime, or GPT-5.6-Cyber.
- arXiv: export API query `ti:"system card"` and `au:OpenAI`. The OpenAI-authored hits are 2601.03267 (OpenAI GPT-5 System Card), 2412.16720 (o1), 2410.21276 (GPT-4o), 2508.10925 (gpt-oss), 2303.08774 (GPT-4) and older non-LLM papers. Title searches on arxiv.org/search returned no OpenAI paper for GPT-5.6, GPT-6 Astra (third-party papers only), GPT-5.5 Instant, codex-1, GPT-5-Codex, Operator system card, ChatGPT agent system card, gpt-realtime, text-embedding-3, o3-pro, o1-pro, GPT-3.5 Turbo, or GPT-4 Turbo (third-party only).
- model_card on every row is NOT_DISCLOSED under the approved ruling "OpenAI publishes system cards, not standalone model cards, for proprietary models". None of these models has open weights or a Hugging Face repo.

## openai--chatgpt
- 200 https://openai.com/index/chatgpt/. Links found: a feedback-contest PDF, two arXiv papers by others (2210.10760, 2004.07213), and policies pages. There is no card. Text: "ChatGPT is a sibling model to InstructGPT" and "using the same methods as InstructGPT, but with slight differences in the data collection setup."
- system_card ND: no hub slug, and OpenAI system cards begin with GPT-4. paper ND: no ChatGPT report.

## openai--gpt-4
- 200 https://openai.com/index/gpt-4-research/. It links https://cdn.openai.com/papers/gpt-4-system-card.pdf and arXiv 2303.08774.
- 200 https://cdn.openai.com/papers/gpt-4-system-card.pdf (application/pdf, 60 pages). Page 1: "GPT-4 System Card OpenAI ... This system card analyzes GPT-4". Recorded as system_card.
- 200 https://openai.com/index/gpt-4/, https://cdn.openai.com/papers/gpt-4.pdf, https://arxiv.org/abs/2303.08774 (paper already on record).

## openai--gpt-3.5-turbo / openai--gpt-3.5-turbo-instruct
- These are API endpoints with no announcement post that carries a card. Neither cdn.openai.com nor the hub sitemap has a GPT-3.5 card. arXiv title search ("GPT-3.5 Turbo technical report") found nothing.
- system_card, model_card and paper are ND.

## openai--gpt-4-turbo
- 200 https://openai.com/index/new-models-and-developer-products-announced-at-devday/. The only safety-related link is the deploymentsafety.openai.com footer. There is no card. The hub has no GPT-4 Turbo slug. arXiv search found only third-party papers. ND for system_card and paper.

## openai--text-embedding-3-large
- 200 https://openai.com/index/new-embedding-models-and-api-updates/. Links: platform safety best practices, plus arXiv 2205.13147 (Matryoshka Representation Learning, a third-party paper). There is no card or OpenAI report. ND for system_card and paper.

## openai--computer-using-agent-cua and openai--operator
- 200 https://openai.com/index/computer-using-agent/. It links /index/operator-system-card/ and https://cdn.openai.com/cua/CUA_eval_extra_information.pdf. The latter is an eval appendix, not a technical report.
- 200 https://openai.com/index/operator-system-card. The trailing-slash form returned 403 once, a Cloudflare challenge. The page reads "January 23, 2025 Safety Publication Operator System Card" and carries "API Availability Added March 11, 2025: Launching the Computer-Using Agent (CUA) model in the API".
- 200 https://cdn.openai.com/operator_system_card.pdf (17 pages). "Operator System Card OpenAI January 23, 2025 ... Operator is a research preview of our Computer-Using Agent (CUA) model". Recorded as system_card for both rows.
- 200 https://openai.com/index/introducing-operator/. It links /policies/usage-policies/ and /policies/using-chatgpt-agent-in-line-with-our-policies/. The lab-wide page is kept, per convention.
- paper ND for both rows: no arXiv or OpenAI technical report.

## openai--o1-pro
- 200 https://openai.com/index/introducing-chatgpt-pro/. Text: "It also includes o1 pro mode, a version of o1 that uses more compute to think harder." The post links no card.
- 200 https://cdn.openai.com/o1-system-card-20241205.pdf (52 pages). A search for "o1 pro|o1-pro|pro mode" returns no hit for pro mode.
- 200 https://arxiv.org/abs/2412.16720 and 200 https://arxiv.org/pdf/2412.16720 (51 pages). Neither mentions pro mode.
- Recorded under the closest approved ruling (openai--gpt-5.2-pro: the family card counts even when it does not name Pro). Doubtful; flagged for review.

## openai--codex-1
- 200 https://openai.com/index/introducing-codex/. It links /index/o3-o4-mini-codex-system-card-addendum/.
- 200 https://openai.com/index/o3-o4-mini-codex-system-card-addendum/ ("May 16, 2025 ... Addendum to OpenAI o3 and o4-mini system card: Codex").
- 200 https://cdn.openai.com/pdf/8df7697b-c1b2-4222-be00-1fd3298f351d/codex_system_card.pdf (8 pages). "Codex is powered by codex-1, a version of OpenAI o3 optimized for software engineering."

## openai--o3-operator
- 200 https://cdn.openai.com/pdf/4375e605-f9a6-438d-bcc8-190599c183a6/o3_cua_system_card.pdf (5 pages). "Addendum to OpenAI o3 and o4-mini system card: OpenAI o3 Operator OpenAI May 23, 2025".
- 404 https://help.openai.com/en/articles/10561834-operator-release-notes. This was a source URL in the work list and is now gone.

## openai--o3-pro
- 200 https://help.openai.com/en/articles/9624314-model-release-notes. "Launching OpenAI o3-pro ... (June 10, 2025) ... As o3-pro uses the same underlying model as o3, full safety details can be found in the o3 system card."
- 200 https://cdn.openai.com/pdf/2221c875-02dc-4789-800b-e7758f3722c1/o3-and-o4-mini-system-card.pdf. This is the same URL as the approved o3 row. 200 https://deploymentsafety.openai.com/o3.
- paper ND, matching the o3 row (no report).

## openai--chatgpt-agent
- 200 https://cdn.openai.com/pdf/6bcccca6-3b64-43cb-a66e-4647073142d7/chatgpt_agent_system_card_launch.pdf (42 pages). "ChatGPT Agent System Card OpenAI July 17, 2025".
- 200 https://deploymentsafety.openai.com/chatgpt-agent. The hub version links a later PDF, cdn.openai.com/pdf/839e66fc-.../chatgpt_agent_system_card.pdf. I did not fetch it, and the launch PDF is kept.

## openai--gpt-realtime
- 200 https://openai.com/index/introducing-gpt-realtime/. "Safety & privacy The Realtime API incorporates multiple layers of safeguards ... You can learn more about our safety approach and system card details in the beta announcement blog."
- 200 https://openai.com/index/introducing-the-realtime-api/ (Oct 2024 beta). "The Realtime API is built on the same version of GPT-4o that powers Advanced Voice Mode ... detailed in the GPT-4o System Card." That card covers the 2024 GPT-4o model, not the August 2025 gpt-realtime model.
- The hub has no gpt-realtime slug. gpt-live and gpt-live-1-1 are the later GPT-Live models. system_card ND (doubtful; see report). paper ND.

## openai--gpt-5-codex
- 200 https://openai.com/index/introducing-upgrades-to-codex/. It links /index/gpt-5-system-card-addendum-gpt-5-codex/ (200).
- 200 https://cdn.openai.com/pdf/97cc5669-7a25-4e63-b15f-5fd5bdc4d149/gpt-5-codex-system-card.pdf (7 pages). "Addendum to GPT-5 system card: GPT-5-Codex OpenAI September 15, 2025".
- 200 https://deploymentsafety.openai.com/gpt-5-codex ("Published September 15, 2025").

## openai--gpt-5-pro
- 200 https://cdn.openai.com/gpt-5-system-card.pdf (60 pages). "we also provide access to gpt-5-thinking using a setting that makes use of parallel test time compute; we refer to this as gpt-5-thinking-pro". Table 1 lists "OpenAI o3 Pro -> gpt-5-thinking-pro". The card also measures gpt-5-thinking-pro on the biological evaluations.
- 200 https://arxiv.org/abs/2601.03267. "OpenAI GPT-5 System Card ... [Submitted on 19 Dec 2025 ... last revised 1 May 2026 (v2)] ... This is the system card published alongside the OpenAI GPT-5 launch, August 2025." The author list runs to 485 authors and starts with Aaditya Singh. Recorded as paper under the o1/GPT-4o ruling. On 2026-10-19 the openai--gpt-5 row was changed from NOT_DISCLOSED to record the same paper, for consistency with the o1 and GPT-4o rows.
- 200 https://deploymentsafety.openai.com/gpt-5.

## openai--gpt-5.5-instant
- 200 https://openai.com/index/gpt-5-5-instant/. The only hub link is the root.
- 200 https://deploymentsafety.openai.com/gpt-5-5-instant ("GPT-5.5 Instant System Card ... Published May 5, 2026").
- 200 https://deploymentsafety.openai.com/gpt-5-5-instant/gpt-5-5-instant.pdf (%PDF, 21 pages). "GPT-5.5 Instant System Card OpenAI May 4, 2026". The PDF form is used, following the GPT-5.4 and GPT-5.5 rows.

## openai--gpt-5.6-luna / openai--gpt-5.6-sol / openai--gpt-5.6-terra
- 200 https://openai.com/index/gpt-5-6/. It links https://deploymentsafety.openai.com/gpt-5-6.
- 200 https://deploymentsafety.openai.com/gpt-5-6 ("Published July 9, 2026"). "GPT-5.6 is a new family of three models: Sol, our new flagship model; Terra, a capable lower-cost option; and Luna, our fastest and most cost-efficient model."
- 200 https://deploymentsafety.openai.com/gpt-5-6/gpt-5-6.pdf (82 pages). "OpenAI GPT-5.6 SystemCard 2026-07-09".
- Also fetched: 200 https://deploymentsafety.openai.com/gpt-5-6-preview (preview card) and 200 https://deploymentsafety.openai.com/gpt-5-6-august-update.

## openai--gpt-5.6-cyber
- 200 https://openai.com/index/expanding-daybreak-as-the-cyber-defense-window-narrows/ (August 10, 2026). "We're also introducing GPT-5.6-Cyber, available through Daybreak Red. Built on GPT-5.6 Sol ..." and "We will publish a system card with further evaluations of GPT-5.6-Cyber at a later date."
- As of 2026-10-19 the hub homepage and sitemap have no GPT-5.6-Cyber entry. The GPT-5.6 card mentions only "Trusted Access for Cyber", and the August update has no Cyber-model match. system_card is ND as of today; recheck.

## openai--gpt-6-astra
- 200 https://deploymentsafety.openai.com/gpt-6-astra (system_card on record, unchanged). The page links /gpt-6-astra/gpt-6-astra.pdf and no model card or report.
- An arXiv title search for "GPT-6 Astra" returns 14 third-party papers and none by OpenAI. Among them, 2609.38415 "Evaluating Whether GPT-6 Astra Performs Unsanctioned Supply-Chain Attacks" lists Souly et al. as authors (unclear whether OpenAI or AISI) and is not a lab model report.
