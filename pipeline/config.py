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
# news: announcement source(s). Either one source dict or a list of them;
#   kind is "rss" or "html_diff". Read through news_sources(), never directly.
# lab_domains: hosts the lab itself publishes on. A page on any other host is
#   not the lab's own statement, so nothing read from it may carry the
#   LAB_REPORTED source class (2026-10-19 audit F1: OpenRouter pages carry
#   Artificial Analysis numbers, which were drafted as lab-reported). A
#   subdomain of a listed host counts (api-docs.deepseek.com under
#   deepseek.com). Huggingface repos under the org's own hf_handles also count.
# hf_name_filter: optional regex (case-insensitive) a repo name must match
#   for hf_orgs to emit a signal, for handles that mostly host research repos.
# --------------------------------------------------------------------------

# "country" is the country where the organization's parent company has its
# headquarters (Google DeepMind: Alphabet, United States). It is context for
# a filter, never a ranking or a grouping in the story.
REGISTRY = {
    "openai": {
        "country": "United States",
        "display": "OpenAI",
        "lab_domains": ["openai.com"],
        "epoch_names": ["OpenAI"],
        "hf_handles": ["openai"],
        "news": {"kind": "rss", "url": "https://openai.com/news/rss.xml"},
    },
    "anthropic": {
        "country": "United States",
        "display": "Anthropic",
        "lab_domains": ["anthropic.com", "claude.com"],
        "epoch_names": ["Anthropic"],
        # Org page exists but hosts no models; kept as a tripwire.
        "hf_handles": ["anthropic"],
        "news": {"kind": "html_diff", "url": "https://www.anthropic.com/news"},
    },
    "google-deepmind": {
        "country": "United States",
        "display": "Google DeepMind",
        # storage.googleapis.com/deepmind-media serves every Gemini model
        # card and safety report; the path, not the shared host, makes it
        # Google's own (see config.is_lab_url).
        "lab_domains": ["deepmind.google", "blog.google", "ai.google.dev",
                        "developers.googleblog.com", "research.google",
                        "storage.googleapis.com/deepmind-media"],
        "epoch_names": ["Google DeepMind", "Google", "DeepMind", "Google Brain", "Google Research", "Google AI"],
        "hf_handles": ["google"],
        # The deepmind.google feed alone missed EmbeddingGemma 2 (2026-10-06;
        # audit F2): Google announces Gemini and Gemma models on blog.google.
        # The gemini-models section feed runs about seven weeks deep; the
        # whole-blog feed holds only the last 20 posts (about four days, fine
        # for a daily run) but is the one that carries Gemma posts filed under
        # other sections. No leading \b on Gemma so "EmbeddingGemma" matches.
        "news": [
            {"kind": "rss", "url": "https://deepmind.google/blog/rss.xml"},
            {"kind": "rss",
             "url": "https://blog.google/innovation-and-ai/models-and-research/gemini-models/rss/"},
            {"kind": "rss", "url": "https://blog.google/rss/",
             "title_filter": r"Gemini|Gemma"},
        ],
    },
    "meta": {
        "country": "United States",
        "display": "Meta",
        "lab_domains": ["ai.meta.com", "research.meta.ai", "llama.com",
                        "about.fb.com", "dev.meta.ai", "developer.meta.com"],
        "epoch_names": ["Meta AI", "Facebook AI Research"],
        # meta-models hosts the Muse open weights (Muse Spark Open, 2026-10-15),
        # which only OpenRouter and Epoch had surfaced (Phase 3 review).
        "hf_handles": ["meta-llama", "meta-models"],
        # ai.meta.com returns HTTP 400 to scripted fetches (Phase 0 finding),
        # but research.meta.ai/blog answers 200 (checked 2026-10-19; it
        # redirects to the research.meta.ai index, which lists the blog posts
        # as plain anchors). Without it Muse Wonder Full was invisible: not on
        # OpenRouter, no HF repo (audit F2).
        "news": {"kind": "html_diff", "url": "https://research.meta.ai/blog"},
    },
    "xai": {
        "country": "United States",
        "display": "xAI",
        "lab_domains": ["x.ai"],
        "epoch_names": ["xAI"],
        "hf_handles": ["xai-org"],
        "news": {"kind": "html_diff", "url": "https://x.ai/news"},
    },
    "mistral": {
        "country": "France",
        "display": "Mistral",
        "lab_domains": ["mistral.ai"],
        "epoch_names": ["Mistral AI"],
        "hf_handles": ["mistralai"],
        "news": {"kind": "html_diff", "url": "https://mistral.ai/news"},
    },
    "deepseek": {
        "country": "China",
        "display": "DeepSeek",
        "lab_domains": ["deepseek.com"],
        "epoch_names": ["DeepSeek"],
        "hf_handles": ["deepseek-ai"],
        "news": {"kind": "html_diff", "url": "https://api-docs.deepseek.com/news"},
    },
    "alibaba-qwen": {
        "country": "China",
        "display": "Alibaba (Qwen)",
        "lab_domains": ["qwenlm.github.io", "qwen.ai", "alibabacloud.com"],
        "epoch_names": ["Alibaba", "Alibaba DAMO Academy"],
        "hf_handles": ["Qwen"],
        "news": {"kind": "rss", "url": "https://qwenlm.github.io/blog/index.xml"},
    },
    "moonshot": {
        "country": "China",
        "display": "Moonshot AI",
        "lab_domains": ["moonshot.ai", "moonshot.cn", "kimi.com", "kimi.ai"],
        "epoch_names": ["Moonshot"],
        "hf_handles": ["moonshotai"],
        # moonshot.ai serves a JS shell; kimi.com/blog is the working index.
        "news": {"kind": "html_diff", "url": "https://www.kimi.com/blog/"},
    },
    "zai": {
        "country": "China",
        "display": "Z.ai (Zhipu)",
        "lab_domains": ["z.ai", "bigmodel.cn", "zhipuai.cn"],
        "epoch_names": ["Z.ai (Zhipu AI)"],
        "hf_handles": ["zai-org"],
        "news": {"kind": "html_diff", "url": "https://docs.z.ai/release-notes/new-released"},
    },
    "cohere": {
        "country": "Canada",
        "display": "Cohere",
        "lab_domains": ["cohere.com"],
        # Epoch renamed "Cohere for AI" to "Cohere Labs (formerly Cohere for
        # AI)" between the 2026-07-16 and 2026-08-24 captures. Both spellings
        # are pinned: the old one so historical captures still replay, the new
        # one so the three Aya entries keep matching. Caught by
        # backfill.check_org_names, which now fails the run on an unmatched
        # spelling rather than dropping the rows.
        "epoch_names": ["Cohere", "Cohere for AI",
                        "Cohere Labs (formerly Cohere for AI)"],
        "hf_handles": ["CohereLabs"],
        "news": {"kind": "html_diff", "url": "https://cohere.com/blog"},
    },
    "amazon": {
        "country": "United States",
        "display": "Amazon",
        "lab_domains": ["aws.amazon.com", "amazon.science", "nova.amazon.com",
                        "aboutamazon.com"],
        "epoch_names": ["Amazon", "Amazon Web Services (AWS)"],
        # Handle is noisy (non-Nova research repos); hf_orgs filters on
        # Nova-pattern repo names. The filter was documented here long before
        # it existed: nine Amazon research repos (strands-decider, poiss-bge-m3,
        # ALoDLM, LAR), all fine-tunes of other labs' models, reached the queue
        # (audit W5).
        "hf_handles": ["amazon"],
        "hf_name_filter": r"\bnova\b",
        "news": {"kind": "rss", "url": "https://aws.amazon.com/blogs/aws/feed/",
                 "title_filter": r"\bNova\b"},
    },
}



def news_sources(org_key: str) -> list:
    """The org's announcement sources as a list (possibly empty)."""
    news = REGISTRY[org_key].get("news")
    if news is None:
        return []
    return list(news) if isinstance(news, list) else [news]


def url_host(url: str) -> str:
    from urllib.parse import urlsplit
    host = (urlsplit(url or "").hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def is_lab_url(org_key: str, url: str) -> bool:
    """True when url is on a host the org itself publishes on.

    Pass org_key=None to accept any registry org's hosts (used where the org
    is not known, so a page on one lab's site is still first-party). An
    aggregator such as openrouter.ai never qualifies: its model pages carry
    Artificial Analysis numbers, which must never be drafted as lab-reported
    (audit F1). A Hugging Face URL qualifies only under the org's own
    first-party handle, never under a third-party account.
    """
    host = url_host(url)
    if not host:
        return False
    orgs = [org_key] if org_key else list(REGISTRY)
    for key in orgs:
        org = REGISTRY.get(key)
        if org is None:
            continue
        for d in org.get("lab_domains", []):
            if "/" in d:
                # a shared host qualifies only under the lab's own path
                d_host, d_path = d.split("/", 1)
                from urllib.parse import urlsplit
                path = urlsplit(url).path.lstrip("/")
                if host == d_host and (path == d_path
                                       or path.startswith(d_path + "/")):
                    return True
            elif host == d or host.endswith("." + d):
                return True
        if host == "huggingface.co":
            from urllib.parse import urlsplit
            first = urlsplit(url).path.strip("/").split("/")[0]
            if first and first.lower() in {h.lower() for h in org["hf_handles"]}:
                return True
    return False


# --------------------------------------------------------------------------
# Epoch adapter
# --------------------------------------------------------------------------

# Organization spellings Epoch has retired. Rows are still matched under them
# so an older capture replays identically, but backfill.check_org_names does
# not require them to appear: a retired name matching nothing is expected, and
# failing on it would make the drift tripwire fire every run.
EPOCH_NAMES_HISTORICAL = {
    "Cohere for AI",   # renamed to "Cohere Labs (formerly Cohere for AI)"
}

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
DETECTION_LOOKBACK_DAYS = 14           # signals older than this are not candidates
HF_API_URL = "https://huggingface.co/api/models"
HF_RECENT_LIMIT = 30                   # repos pulled per org per night
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

# Sibling-repo clustering: suffixes stripped to find the release base name.
# Validated against zai-org GLM history (Phase 0 gate 3).
# Formats, quantizations and companion repos of one release. "assistant" and
# "drafter" are speculative-decoding helpers shipped beside the main weights
# (Muse-Glimmer-30B-assistant, 2026-10-20).
SIBLING_SUFFIX_RE = (
    r"-(FP8|fp8|INT[48]|int[48]|AWQ|awq|GPTQ|gptq|GGUF|gguf|w4a16|bf16"
    r"|4bit|8bit|Base|base|Instruct|it|hf"
    r"|nvfp4|mxfp4|fp4|mlx|pte|executorch|assistant|drafter)$"
)

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

LLM_MODEL_ID = "claude-haiku-5-5"            # pinned snapshot, verified 2026-10-20
# Prompts stay far under 100,000 tokens, so the lower price tier always
# applies. Haiku 4.5 was $1.00 / $5.00.
LLM_PRICE_INPUT_PER_MTOK = 0.10              # USD, verified 2026-10-20
LLM_PRICE_OUTPUT_PER_MTOK = 0.50             # USD, verified 2026-10-20
# Haiku 5.5 thinks before it answers, and thinking tokens count against
# max_tokens. Low effort keeps that short on a plain extraction task.
LLM_EFFORT = "low"
# 1024 truncated 11 of 52 drafts on the 2026-08-24 production run (Haiku
# 4.5): dense extraction JSON runs about 2.8 characters per token, so a long
# benchmark table hit the ceiling mid-string and the draft was thrown away as
# malformed. Measured output on that run averaged 398 tokens. Haiku 5.5's
# tokenizer counts the same text as about 30% more tokens and its thinking
# shares the ceiling. 4096 still cut off the first live Haiku 5.5 draft on
# 2026-10-21 (a Hugging Face model card), so the ceiling is 8192.
LLM_MAX_OUTPUT_TOKENS = 8192
# Measured on Haiku 4.5: about $0.005 a call, so a full 300-call month cost
# roughly $1.50. At Haiku 5.5 prices a worst-case call (the budgeted input
# plus the full output ceiling) costs under $0.006, so 300 such calls stay
# under the spend cap below. The call cap is now the binding gate; the
# spend cap stays as a backstop if prices change.
LLM_MONTHLY_CALL_CAP = 300
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
