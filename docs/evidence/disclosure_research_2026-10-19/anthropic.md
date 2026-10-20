# Anthropic evidence (researched 2026-10-19)

All fetches used a desktop Chrome user agent. Status codes are final codes after redirects.

## Shared sources
- 200 https://www.anthropic.com/legal/aup ("Usage Policy ... Effective November 12, 2026 ... Our Usage Policy (also referred to as our 'Acceptable Use Policy' or 'AUP') applies to anyone who submits inputs"). Recorded as usage_policy, following the approved rows.
- 200 https://www.anthropic.com/system-cards. The hub lists Claude Haiku 5.5, Sonnet 5.5, Opus 5.5, Fable 5.1 and Mythos 5.1, Opus 5, Sonnet 5, Opus 4.8, Fable 5 and Mythos 5, Opus 4.7, Mythos Preview, and older cards. It has no separate model cards.
- 200 https://huggingface.co/api/models?author=Anthropic returned `[]`, so Anthropic has no HF model repos. 200 https://huggingface.co/anthropic.
- model_card is ND on all rows under the approved ruling "No separate model card; Anthropic folds it into the system card".
- arXiv title search on arxiv.org/search returned only third-party papers: "Claude Opus 4.8" gave 2608.07776 (Sethi, Errico); "Claude Opus 5" gave 2608.14992 (Bronder) and 2608.07776; "Claude Fable" gave 2608.07776 and 2607.10849 (Okonkwo et al.). None is an Anthropic technical report, so paper is ND.

## anthropic--claude-opus-4.8
- 200 https://www.anthropic.com/news/claude-opus-4-8. The only card link is https://www.anthropic.com/claude-opus-4-8-system-card. The post has no paper link.
- 200 https://www.anthropic.com/claude-opus-4-8-system-card redirects to www-cdn.anthropic.com/0f0c97ad.../Claude Opus 4.8 System Card.pdf (application/pdf, %PDF, 246 pages). Page 1: "System Card: Claude Opus 4.8 May 28, 2026", which matches the row date.

## anthropic--claude-opus-5
- 200 https://www.anthropic.com/news/claude-opus-5. The only card link is https://www.anthropic.com/claude-opus-5-system-card. The post has no paper link.
- 200 https://www.anthropic.com/claude-opus-5-system-card redirects to www-cdn.anthropic.com/ceaf5c7f.../Claude Opus 5 System Card.pdf (application/pdf, %PDF, 198 pages). Page 1: "System Card: Claude Opus 5 July 24, 2026", which matches the row date.

## anthropic--claude-fable-5.1
- 200 https://www.anthropic.com/claude-fable-and-mythos-5-1. It links the system card (on record) and no paper or model card.
- 200 https://www.anthropic.com/claude-fable-5-1-mythos-5-1-system-card redirects to the PDF "System Card: Claude Fable 5.1 & Claude Mythos 5.1 September 1, 2026" (212 pages). This cell is unchanged.
