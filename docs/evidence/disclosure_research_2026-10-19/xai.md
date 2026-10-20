# xAI evidence (researched 2026-10-19)

All fetches used a desktop Chrome user agent. A plain client gets 403 on x.ai. Status codes are final codes after redirects.

## Shared sources
- 200 https://x.ai/legal/acceptable-use-policy ("SpaceXSI Acceptable Use Policy Effective: August 14, 2026 ... applies to anyone using our Service"). Recorded as usage_policy, following the approved rows.
- 200 https://x.ai/safety. "Model cards: We publish detailed model cards for each of our frontier models ... Grok 4.7 Grok 4.6 Grok 4.5 Grok 4 Fast Grok Code Fast 1 Grok 4". It links data.x.ai cards for Grok 4, Code Fast 1 and 4 Fast, and media.x.ai cards 4p5-5184fdf9.pdf, card-4p6-4cd2dc57.pdf and card4p7-3a96f40b.pdf. The index omits the existing Grok 4.1 and Grok 4.20 cards, so it is incomplete.
- 200 https://huggingface.co/api/models?author=xai-org lists only xai-org/grok-1 and xai-org/grok-2.
- Convention: xAI model card PDFs are recorded under system_card, and model_card is ND for closed weights.
- arXiv title search: "Grok 4.5" returned 2601.10527 only (Ma et al., a third-party safety report). "Grok 4.6", "Grok Build" and "Grok-0" returned no results. paper is ND on every row.

## xai--grok-0
- 200 https://x.ai/news/grok. "After announcing xAI, we trained a prototype LLM (Grok-0) with 33 billion parameters ... We provide a summary of the important technical details of Grok-1 in the model card."
- 200 https://x.ai/news/grok/model-card ("Grok-1 Model Card ... fine-tuned using extensive feedback from both humans and the early Grok-0 models"). This card is about Grok-1, not Grok-0.
- No Grok-0 card on x.ai/safety, no HF repo, no paper. system_card, model_card and paper are ND. usage_policy follows the lab-wide convention, even though Grok-0 was never offered to the public (flagged).

## xai--grok-4.1-fast (system_card only; left NOT_RESEARCHED)
- 200 https://x.ai/news/grok-4-1-fast ("Nov 19, 2025 Grok 4.1 Fast and Agent Tools API"). It links no card.
- 200 https://data.x.ai/2025-11-17-grok-4-1-model-card.pdf (6 pages). A search for "Fast" finds no match, so the 4.1 card does not cover Fast.
- 404 https://data.x.ai/2025-11-19-grok-4-1-fast-model-card.pdf and 404 https://data.x.ai/2025-11-17-grok-4-1-fast-model-card.pdf.
- 200 https://docs.x.ai/developers/models/grok-4-1-fast-reasoning, which redirects to the models index and has no card links.
- Web search, restricted to x.ai domains and also unrestricted, found no Grok 4.1 Fast card.
- I left the cell NOT_RESEARCHED for two reasons. The Grok 4.20 card turned out to be unlinked from every xAI page, so an unlisted card is possible. And Azure AI Foundry (ai.azure.com/catalog/models/grok-4-1-fast-reasoning, read via WebFetch) says "benchmarks and system evaluations are detailed in the xAI Grok 4.1 Fast Reasoning model card". That wording looks like a template, but it is specific enough that I cannot rule the card out.

## xai--grok-4.20 (system_card)
- 404 https://x.ai/news/grok-4-20, 404 /news/grok-4-20-beta, 404 /news/grok-4.20. 404 data.x.ai/2026-02-17-grok-4-20-model-card.pdf and the -4.20- variant.
- 200 https://docs.x.ai/developers/release-notes ("Mar 10 Grok 4.20 and Grok 4.20 Multi-agent are live"). 200 https://docs.x.ai/developers/models/grok-4.20, with no card link.
- Web search (allowed domains x.ai, data.x.ai, media.x.ai) returned https://data.x.ai/2026-04-07-grok-4-20-model-card.pdf.
- 200 application/pdf, %PDF, 8 pages. "Grok 4.20 System Card xAI April 7, 2026 1 Introduction Grok 4.20 is the latest model from xAI ... In this model card, we assess the safety profile of Grok 4.20". It also says "All use of Grok 4.20 ... must follow xAI's Acceptable Use Policy." Recorded as system_card. It was published about seven weeks after the row date of 2026-02-17.

## xai--grok-4.3-beta (system_card only; left NOT_RESEARCHED)
- 404 https://x.ai/news/grok-4-3 and 404 /news/grok-4-3-beta. 404 https://data.x.ai/2026-04-17-grok-4-3-model-card.pdf.
- 200 https://docs.x.ai/developers/models/grok-4.3, with no card link. 200 https://grok.com/release-notes, a JS page where no Grok 4.3 text could be extracted.
- x.ai/safety has no 4.3 entry. The Grok 4.5 and 4.6 cards mention Grok 4.3 only as a benchmark comparator.
- Third-party pages, all 200: AWS Bedrock model-card-xai-grok-4-3.html, Google Cloud grok-4-3 ("View model card in Model Garden"), and Oracle xai-grok-4-3.htm. None links an xAI card.
- Azure AI Foundry (ai.azure.com/catalog/models/grok-4.3, WebFetch): "Details about the evaluation and mitigation for top RAI risks are included in the xAI Grok 4.3 model card." It gives no link.
- The evidence is ambiguous, so the cell stays NOT_RESEARCHED.

## xai--grok-build-0.1
- 200 https://x.ai/news/grok-build-0-1 ("May 29, 2026 Grok Build 0.1 on API ... grok-build-0.1 is a coding model specifically trained for agentic coding tasks"). Its only policy link is /legal/acceptable-use-policy, and it links no card.
- 200 https://docs.x.ai/developers/models/grok-build-0.1, with no card link. 200 https://docs.x.ai/developers/release-notes ("May 19 Grok Build 0.1 SpaceXSI's coding model ... Currently in early access."). 200 https://x.ai/changelog/build.
- x.ai/safety lists no Grok Build card. The Grok 4.5 and 4.6 cards use "Grok Build" only for the harness and coding-agent product (for example "The default model in SpaceXAI's terminal-based coding agent").
- A web search for "Grok Build 0.1 model card" on x.ai domains found no card. system_card is ND; model_card and paper are ND.

## xai--grok-4.5
- 200 https://x.ai/news/grok-4-5 ("Jul 16, 2026 Introducing Grok 4.5"). The row date is 2026-07-08, which is a possible date discrepancy and is not my cell.
- 200 https://media.x.ai/v1/website/4p5-5184fdf9.pdf (29 pages). "Model Card: Grok 4.5 July 14, 2026 Revision: 2026-07-20". It is listed on x.ai/safety and cites "SpaceXAI Acceptable Use Policy: https://x.ai/legal/acceptable-use-policy".

## xai--grok-4.6
- 200 https://x.ai/news/grok-4-6 ("Aug 12, 2026 Introducing Grok 4.6").
- 200 https://media.x.ai/v1/website/card-4p6-4cd2dc57.pdf (42 pages). "Model Card: Grok 4.6 August 12, 2026 Revision: 2026-08-17". It is listed on x.ai/safety and cites the AUP.
