# Scope rulings

Rulings on which kinds of model count as a release. Append only. Each row has a date and a reason. The general rule is in `docs/METHODOLOGY.md`: language models, and multimodal models with a language component, that the public can use.

| Date (UTC) | Ruling | Reason |
|---|---|---|
| 2026-10-19 | Embedding models are in scope. | The record already holds six embedding entries from the backfill (Cohere Embed, Cohere Embed 4, text-embedding-3-large, Codestral Embed, Gemini Embedding, EmbeddingGemma). A text embedding model reads language. Admits Embed 5 and EmbeddingGemma 2. |
| 2026-10-19 | Dedicated voice, speech-to-text, text-to-speech, image, video and time-series models are out of scope. | They take or return no text as their main interface. Entries already on record that also accept and return text (gpt-realtime, Qwen-Audio-Chat, Qwen2-Audio) stay. Rules out the Grok Voice family, Voxtral Mini Realtime Arabic, Qwen-Image 2.1, Nano Banana 2.1 and Timestral. |
| 2026-10-19 | Research previews open only to paid tiers of a consumer product are out of scope until generally available. | It is the same rule as for no-access previews: the lab itself labels the model not generally available, and putting it behind a paid tier does not change that. Rules out GPT-5.3-Codex-Spark. |
| 2026-10-19 | A generally available model offered only on a paid plan of the lab's own product is in scope, as public_service. | Anyone can buy the plan, so the public can use the model. This is the same footing as models first offered only in ChatGPT or the Claude app. What the earlier ruling excludes is a research preview, which the lab labels as not generally available. Admits Muse Wonder Full (Muse Code, Power Usage plan). |
