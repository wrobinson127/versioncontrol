# Amazon evidence (researched 2026-10-19)

Status codes from curl with a Chrome user agent, redirects followed.

Org rulings applied (from APPROVED rows): system card is the AWS AI Service Card; model card is the Bedrock or Nova user guide page; usage policy is https://aws.amazon.com/ai/responsible-ai/policy/; paper is an amazon.science technical report. The Titan Text documents below existed, and AWS later took them down. For each one the record keeps the original URL with its dated archived copy, so neither a live URL nor NOT_DISCLOSED is claimed.

## Shared checks
- 200 https://aws.amazon.com/ai/responsible-ai/resources/ lists these service cards (docs.aws.amazon.com/ai/responsible-ai/<slug>/): amazon-polly, aws-aidevops-agent, aws-healthscribe, bedrock-guardrails, comprehend-detectpii, nova-2-5-sonic, nova-2-lite, nova-2-sonic, nova-act, nova-canvas, nova-micro-lite-pro, nova-multimodal-embeddings, nova-reel, q-business-for-rag-apps, rekognition-face-liveness, rekognition-face-matching, textract-analyzeid, titan-image-generator, titan-text-embeddings, transcribe-speech-recognition, transcribe-toxicity-detection. No titan-text, titan-text-premier or Q Developer card.
- 200 https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html lists Titan model cards only for Titan Embeddings G1 Text, Titan Multimodal Embeddings G1, Titan Text Embeddings V2.
- 200 https://aws.amazon.com/ai/responsible-ai/policy/: "applies to your use of artificial intelligence and machine learning Services, features, and functionality (including third-party models) that we provide".

## amazon--amazon-titan (system_card only)
- 404 https://docs.aws.amazon.com/ai/responsible-ai/titan-text/overview.html
- 200 https://web.archive.org/web/20250120035524/https://docs.aws.amazon.com/ai/responsible-ai/titan-text/overview.html, title "Amazon Titan Text Lite and Titan Text Express - AWS AI Service Cards"
- 200 https://docs.aws.amazon.com/ai/responsible-ai/titan-text-embeddings/overview.html (live card for a Titan model from the Sept 2023 launch)
- Recorded: the original Titan Text card URL, with its archived copy of 2025-01-20 (web.archive.org/web/20250120035524/). The card existed; AWS later took it down.

## amazon--amazon-titan-text-lite (model_card, system_card)
- 404 https://docs.aws.amazon.com/ai/responsible-ai/titan-text/overview.html; archived 200 (see above), card covers Titan Text Lite explicitly.
- 200 but redirects to https://docs.aws.amazon.com/bedrock/latest/userguide/ : .../titan-text-models.html and .../model-card-amazon-titan-text-lite.html
- 200 https://web.archive.org/web/20240709233201/https://docs.aws.amazon.com/bedrock/latest/userguide/titan-text-models.html, title "Amazon Titan Text models - Amazon Bedrock"
- 200 https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-text.html: inference parameters only (maxTokenCount table: Titan Text Lite 4,096, Express 8,192, Premier 3,072); not a model card.
- Recorded: both original URLs, with their archived copies (service card 2025-01-20, web.archive.org/web/20250120035524/; models page 2024-07-09, web.archive.org/web/20240709233201/). The documents existed; AWS later took them down.

## amazon--amazon-q-developer (all four)
- 200 https://aws.amazon.com/blogs/aws/amazon-q-developer-now-generally-available-includes-new-capabilities-to-reimagine-developer-experience/ (source announcement)
- 200 https://aws.amazon.com/q/developer/ and https://aws.amazon.com/q/developer/faqs/
- 200 https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/what-is.html: "Amazon Q is powered by Amazon Bedrock, a fully managed service that makes foundation models (FMs) available through an API. The model that powers Amazon Q has been augmented with high quality AWS content". No model named or documented. The page also notes the IDE plugins are reaching end of support in favour of Kiro.
- 404 https://docs.aws.amazon.com/ai/responsible-ai/amazon-q-developer/overview.html and .../q-developer/overview.html
- model_card NOT_DISCLOSED: no named model, no Bedrock model card, no HF repo.
- system_card NOT_DISCLOSED: the service card index has only Q Business for RAG apps, no Q Developer card.
- paper NOT_DISCLOSED: web search for an amazon.science Q Developer technical report found none (only job posts and third-party indexes).
- usage_policy: AWS Responsible AI Policy, 200, applies to all AWS AI/ML services.

## amazon--amazon-titan-text-premier (model_card, system_card)
- 404 https://docs.aws.amazon.com/ai/responsible-ai/titan-text-premier/overview.html
- 200 https://web.archive.org/web/20250213041500/https://docs.aws.amazon.com/ai/responsible-ai/titan-text-premier/overview.html, title "Amazon Titan Text Premier - AWS AI Service Cards", sections Overview, Intended use cases and limitations, Design of Amazon Titan Text Premier.
- 200 redirect to user guide root: .../model-card-amazon-titan-text-premier.html and .../titan-text-models.html
- 200 archived titan-text-models.html (20240709233201) includes "AWS AI Service Card - Amazon Titan Text Premier".
- Recorded: both original URLs, with their archived copies (service card 2025-02-13, web.archive.org/web/20250213041500/; models page 2024-07-09, web.archive.org/web/20240709233201/). The documents existed; AWS later took them down.
