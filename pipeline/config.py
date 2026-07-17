"""Single source of truth for the Version Control pipeline.

Org registry, source adapters, detection thresholds, benchmark pins, LLM
budget, and fetch behavior all live here. Nothing else in the pipeline
hardcodes a URL, an org spelling, or a threshold.
"""

# --------------------------------------------------------------------------
# Registry (D2: closed v1 set, append-only; changes are logged in content/)
#
# epoch_names: exact Organization spellings observed in the Epoch CSV that map
#   to this org (primary-org match on the first comma-separated token).
# hf_handles: Hugging Face org handles, org-scoped detection only. An empty
#   list means the org publishes no open weights under a first-party handle.
# news: primary announcement source. kind is "rss" or "html_diff".
# --------------------------------------------------------------------------

REGISTRY = {
    "openai": {
        "display": "OpenAI",
        "epoch_names": ["OpenAI"],
        "hf_handles": ["openai"],
        "news": {"kind": "rss", "url": "https://openai.com/news/rss.xml"},
    },
    "anthropic": {
        "display": "Anthropic",
        "epoch_names": ["Anthropic"],
        # Org page exists but hosts no models; kept as a tripwire.
        "hf_handles": ["anthropic"],
        "news": {"kind": "html_diff", "url": "https://www.anthropic.com/news"},
    },
    "google-deepmind": {
        "display": "Google DeepMind",
        "epoch_names": ["Google DeepMind", "Google", "DeepMind", "Google Brain", "Google Research", "Google AI"],
        "hf_handles": ["google"],
        "news": {"kind": "rss", "url": "https://deepmind.google/blog/rss.xml"},
    },
    "meta": {
        "display": "Meta",
        "epoch_names": ["Meta AI", "Facebook AI Research"],
        "hf_handles": ["meta-llama"],
        # ai.meta.com returns HTTP 400 to scripted fetches (Phase 0 finding).
        # No primary news source until retested from an Actions runner;
        # coverage via HF, Epoch, OpenRouter. FLAGGED in verification report.
        "news": None,
    },
    "xai": {
        "display": "xAI",
        "epoch_names": ["xAI"],
        "hf_handles": ["xai-org"],
        "news": {"kind": "html_diff", "url": "https://x.ai/news"},
    },
    "mistral": {
        "display": "Mistral",
        "epoch_names": ["Mistral AI"],
        "hf_handles": ["mistralai"],
        "news": {"kind": "html_diff", "url": "https://mistral.ai/news"},
    },
    "deepseek": {
        "display": "DeepSeek",
        "epoch_names": ["DeepSeek"],
        "hf_handles": ["deepseek-ai"],
        "news": {"kind": "html_diff", "url": "https://api-docs.deepseek.com/news"},
    },
    "alibaba-qwen": {
        "display": "Alibaba (Qwen)",
        "epoch_names": ["Alibaba", "Alibaba DAMO Academy"],
        "hf_handles": ["Qwen"],
        "news": {"kind": "rss", "url": "https://qwenlm.github.io/blog/index.xml"},
    },
    "moonshot": {
        "display": "Moonshot AI",
        "epoch_names": ["Moonshot"],
        "hf_handles": ["moonshotai"],
        # moonshot.ai serves a JS shell; kimi.com/blog is the working index.
        "news": {"kind": "html_diff", "url": "https://www.kimi.com/blog/"},
    },
    "zai": {
        "display": "Z.ai (Zhipu)",
        "epoch_names": ["Z.ai (Zhipu AI)"],
        "hf_handles": ["zai-org"],
        "news": {"kind": "html_diff", "url": "https://docs.z.ai/release-notes/new-released"},
    },
    "cohere": {
        "display": "Cohere",
        "epoch_names": ["Cohere", "Cohere for AI"],
        "hf_handles": ["CohereLabs"],
        "news": {"kind": "html_diff", "url": "https://cohere.com/blog"},
    },
    "amazon": {
        "display": "Amazon (Nova)",
        "epoch_names": ["Amazon", "Amazon Web Services (AWS)"],
        # Handle is noisy (non-Nova research repos); detector filters on
        # Nova-pattern repo names.
        "hf_handles": ["amazon"],
        "news": {"kind": "rss", "url": "https://aws.amazon.com/blogs/aws/feed/",
                 "title_filter": r"\bNova\b"},
    },
}

# --------------------------------------------------------------------------
# Epoch adapter
# --------------------------------------------------------------------------

EPOCH_CSV_URL = "https://epoch.ai/data/all_ai_models.csv"

# Exact header retrieved 2026-07-16 (Phase 0 gate 1). The detector asserts
# this pin against the live header and fails loudly on drift.
EPOCH_EXPECTED_COLUMNS = [
    "Model", "Domain", "Task", "Organization", "Authors", "Publication date",
    "Reference", "Link", "Citations", "Notability criteria",
    "Notability criteria notes", "Parameters", "Parameters notes",
    "Training compute (FLOP)", "Training compute notes",
    "Training dataset size (total)", "Dataset size notes",
    "Training time (hours)", "Training time notes", "Training hardware",
    "Approach", "Confidence", "Abstract", "Epochs",
    "WikiText and Penn Treebank data", "Model accessibility",
    "Country (of organization)", "Base model", "Finetune compute (FLOP)",
    "Finetune compute notes", "Hardware quantity",
    "Hardware utilization (MFU)", "Last modified",
    "Training cloud compute vendor", "Training data center", "Archived links",
    "Batch size", "Batch size notes", "Organization categorization",
    "Foundation model", "Training compute lower bound",
    "Training compute upper bound", "Training chip-hours",
    "Training code accessibility", "Accessibility notes",
    "Possibly over 1e23 FLOP", "Training compute cost (2023 USD)",
    "Utilization notes", "Numerical format", "Frontier model",
    "Training power draw (W)", "Training compute estimation method",
    "Hugging Face developer id", "Post-training compute (FLOP)",
    "Post-training compute notes", "Hardware utilization (HFU)",
    "Open model weights?",
]

# Columns the pipeline actually reads; subset check runs even if new columns
# are appended upstream.
EPOCH_CONSUMED_COLUMNS = [
    "Model", "Organization", "Publication date", "Model accessibility",
    "Parameters", "Link", "Reference", "Notability criteria",
    "Accessibility notes", "Open model weights?", "Hugging Face developer id",
    "Base model", "Last modified",
]

# --------------------------------------------------------------------------
# Detection
# --------------------------------------------------------------------------

BACKFILL_START = "2022-11-30"          # D7
DATE_TOLERANCE_DAYS = 3                # max observed Epoch-vs-announcement gap was 2
HF_API_URL = "https://huggingface.co/api/models"
HF_RECENT_LIMIT = 30                   # repos pulled per org per night
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

# Sibling-repo clustering: suffixes stripped to find the release base name.
# Validated against zai-org GLM history (Phase 0 gate 3).
SIBLING_SUFFIX_RE = (
    r"-(FP8|fp8|INT[48]|int[48]|AWQ|awq|GPTQ|gptq|GGUF|gguf|w4a16|bf16"
    r"|4bit|8bit|Base|base|Instruct|it|hf)$"
)
SIBLING_WINDOW_DAYS = 2                # repos created within this window may cluster

# --------------------------------------------------------------------------
# Benchmarks (D5: pinned pair, versions explicit)
# --------------------------------------------------------------------------

BENCHMARKS = {
    "gpqa-diamond": {
        "name": "GPQA Diamond",
        # The Diamond subset IS the version pin; "GPQA" without the subset
        # qualifier is a different axis and never comparable.
        "version": "diamond",
    },
    "swe-bench-verified": {
        "name": "SWE-Bench Verified",
        "version": "verified",
    },
}

# Provenance source classes (invariant 2)
PROVENANCE_CLASSES = ("LAB_REPORTED", "INDEPENDENT")

# --------------------------------------------------------------------------
# LLM budget (invariant 7; §10 arithmetic in docs/verification_report.md)
# --------------------------------------------------------------------------

LLM_MODEL_ID = "claude-haiku-4-5-20251001"   # pinned snapshot, verified 2026-07-16
LLM_PRICE_INPUT_PER_MTOK = 1.00              # USD, verified 2026-07-16
LLM_PRICE_OUTPUT_PER_MTOK = 5.00             # USD, verified 2026-07-16
LLM_MAX_OUTPUT_TOKENS = 1024
LLM_MONTHLY_CALL_CAP = 300                   # 300 * ~$0.006 = $1.80 <= $2.00 hard cap
LLM_MONTHLY_SPEND_CAP_USD = 2.00             # D8 hard cap; skip-with-FLAG at cap
LLM_SPEND_LEDGER_PATH = "data/derived/llm_ledger.json"

# --------------------------------------------------------------------------
# Fetch behavior
# --------------------------------------------------------------------------

FETCH_TIMEOUT_SECONDS = 30
USER_AGENT = (
    "Mozilla/5.0 (compatible; VersionControlBot/0.1; "
    "+https://versioncontrol.walker-robinson.com/methodology.html)"
)

# All data dates are UTC (invariant 9).
DATA_TIMEZONE = "UTC"
