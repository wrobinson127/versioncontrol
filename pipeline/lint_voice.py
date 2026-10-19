"""Registrar-voice lint (invariant 5).

Every string that can render publicly (LLM drafts, UI strings, tooltips,
empty states, OG text) passes through here before it may enter pending state.
Enforces a banned-pattern list and the global em-dash strip. Attribution of
lab claims is enforced by the extraction prompt and human review; this module
catches the mechanical violations.
"""
import re

# Em dash family is stripped globally from rendered strings (invariant 5 and
# the DESIGN prohibition). En dash in date ranges is allowed.
EM_DASH_RE = re.compile(r"[—―]")

# A spaced double hyphen is the typewriter em dash: the same break in a
# sentence, and the same prohibition. Spaces on both sides are required, so
# "--flag" in a quoted command and "a--b" identifiers stay legal.
DOUBLE_HYPHEN_DASH_RE = re.compile(r"(?<=\S) -- (?=\S)")

# Banned patterns, each with a category for the violation report.
# Quality adjectives, ranking language, editorial characterization, and
# corporate speak are all banned in registrar prose.
BANNED_PATTERNS = [
    # quality adjectives
    (r"\bimpressive\b", "quality-adjective"),
    (r"\bpowerful\b", "quality-adjective"),
    (r"\bgroundbreaking\b", "quality-adjective"),
    (r"\bcutting[- ]edge\b", "quality-adjective"),
    (r"\brevolutionary\b", "quality-adjective"),
    (r"\bremarkable\b", "quality-adjective"),
    (r"\bstunning\b", "quality-adjective"),
    (r"\bexcellent\b", "quality-adjective"),
    (r"\bamazing\b", "quality-adjective"),
    (r"\bincredible\b", "quality-adjective"),
    (r"\bimpressively\b", "quality-adjective"),
    (r"\bstate[- ]of[- ]the[- ]art\b", "quality-adjective"),
    (r"\bworld[- ]class\b", "quality-adjective"),
    (r"\bbest[- ]in[- ]class\b", "ranking"),
    # ranking language (invariant 10 adjacency: no ranking anywhere)
    (r"\bthe best\b", "ranking"),
    (r"\btop[- ]performing\b", "ranking"),
    (r"\bindustry[- ]leading\b", "ranking"),
    (r"\bmarket[- ]leading\b", "ranking"),
    (r"\bleads the (field|pack|industry|market)\b", "ranking"),
    (r"\boutperforms (all|every|the competition)\b", "ranking"),
    (r"\bnumber one\b", "ranking"),
    (r"#1\b", "ranking"),
    (r"\bbeats\b", "ranking"),
    (r"\bcrushes\b", "ranking"),
    (r"\bdominates\b", "ranking"),
    # Cross-model comparative claims. The registry publishes deltas only for
    # comparable pairs and refuses everything else in words, so a summary that
    # ranks one model against another in prose smuggles back exactly the
    # comparison the delta rules refuse, with no benchmark, no version, and no
    # provenance. Caught on the 2026-08-31 run: a GLM-5.3-Flash draft passed
    # lint carrying "outperforms GLM-5.2 across benchmarks and approaches
    # Claude Opus 4.8 on coding and agentic benchmarks while costing
    # one-tenth as much". Attributing it to the lab does not make it a
    # measurement. A lab's comparative claim belongs in a benchmark row with a
    # source, or nowhere.
    (r"\boutperform(s|ing|ed)?\b", "comparative-claim"),
    (r"\bsurpass(es|ing|ed)?\b", "comparative-claim"),
    (r"\brival(s|ing|ed)?\b", "comparative-claim"),
    (r"\bon par with\b", "comparative-claim"),
    (r"\bcompetitive with\b", "comparative-claim"),
    (r"\bbetter than\b", "comparative-claim"),
    (r"\bcheaper than\b", "comparative-claim"),
    (r"\bfaster than\b", "comparative-claim"),
    (r"\bat a fraction of\b", "comparative-claim"),
    (r"\bone[- ](tenth|fifth|quarter|half)\b", "comparative-claim"),
    # Followed by a capital letter: comparison against a named model, not the
    # ordinary verb ("approaches the context limit" stays legal). The capital
    # is load-bearing, so the lookahead turns IGNORECASE off for itself:
    # without (?-i:...) the whole list's re.I makes [A-Z] match any letter and
    # the pattern swallows every ordinary use of the verb.
    (r"\bapproach(es|ing)\s+(?=(?-i:[A-Z]))", "comparative-claim"),
    (r"\bmatch(es|ing)\s+(?=(?-i:[A-Z]))", "comparative-claim"),
    (r"\bexceeds?\s+(?=(?-i:[A-Z]))", "comparative-claim"),
    (r"\bclose to\s+(?=(?-i:[A-Z]))", "comparative-claim"),
    # editorial characterization
    (r"\bdisappointing\b", "editorial"),
    (r"\bunderwhelming\b", "editorial"),
    (r"\bimpressed\b", "editorial"),
    (r"\bnotably weak\b", "editorial"),
    (r"\bfalls short\b", "editorial"),
    (r"\bfails to impress\b", "editorial"),
    (r"\ba major (leap|jump|step)\b", "editorial"),
    (r"\bgame[- ]chang(er|ing)\b", "editorial"),
    # corporate speak
    (r"\bdelve\b", "corporate-speak"),
    (r"\bleverag(e|es|ing)\b", "corporate-speak"),
    (r"\bunlock(s|ing)?\b", "corporate-speak"),
    (r"\bsupercharge(s|d)?\b", "corporate-speak"),
    (r"\bexcited to\b", "corporate-speak"),
    (r"\bthrilled\b", "corporate-speak"),
    (r"\bproud to\b", "corporate-speak"),
    (r"\bnext[- ]level\b", "corporate-speak"),
    (r"\bsynerg(y|ies|istic)\b", "corporate-speak"),
    (r"\bbest[- ]effort journey\b", "corporate-speak"),
    # git-culture vocabulary outside masthead/tagline/about (invariant 6).
    # These are linted in entry prose and UI strings; the site build exempts
    # the three permitted surfaces before calling the lint.
    (r"\bcommit(s|ted)?\b", "git-metaphor"),
    (r"\bmerge(s|d)?\b", "git-metaphor"),
    (r"\bpull request\b", "git-metaphor"),
    (r"\brepo culture\b", "git-metaphor"),
]

_COMPILED = [(re.compile(pat, re.IGNORECASE), cat) for pat, cat in BANNED_PATTERNS]


def strip_em_dashes(text: str) -> str:
    """Replace em dashes with a comma-space or period heuristically.

    The strip is mechanical: an em dash surrounded by spaces becomes a comma;
    a bare em dash becomes ", ". Drafts should not contain them at all; this
    is the last-resort normalizer.
    """
    text = re.sub(r"\s*[—―]\s*", ", ", text)
    return text


def lint_text(text: str, context: str = "") -> list:
    """Return a list of violations found in text.

    Each violation is a dict: {pattern, category, match, context}.
    An empty list means the text passes.
    """
    violations = []
    if EM_DASH_RE.search(text):
        violations.append({
            "pattern": "em-dash",
            "category": "em-dash",
            "match": "—",
            "context": context,
        })
    if DOUBLE_HYPHEN_DASH_RE.search(text):
        violations.append({
            "pattern": "double-hyphen-dash",
            "category": "em-dash",
            "match": " -- ",
            "context": context,
        })
    for rx, cat in _COMPILED:
        m = rx.search(text)
        if m:
            violations.append({
                "pattern": rx.pattern,
                "category": cat,
                "match": m.group(0),
                "context": context,
            })
    return violations


def lint_identifier(text: str, context: str = "") -> list:
    """Em-dash check only, for fields that are names rather than prose.

    A model name is recorded as the lab writes it, so the banned-vocabulary
    list must not apply here: a lab is free to ship something called Ultra and
    the registrar's job is to record that, not to object to it. The em-dash
    prohibition still holds, because it is a rendering rule rather than a voice
    one. In practice an em-dash in a scraped name is a mangled page title
    rather than the real name (observed 2026-08-24: "TIPS - L/14" arrived as
    "TIPS <emdash> L/14"), so this flags it for a human instead of guessing at
    the correct name.
    """
    return [v for v in lint_text(text, context=context)
            if v["category"] == "em-dash"]


def lint_entry_prose(entry: dict) -> list:
    """Lint every publicly rendered field of a draft entry dict.

    Prose fields get the full voice lint; name fields get the em-dash rule
    only. model_name is included because it renders on every card and in every
    heading: leaving it unlinted let two em-dashes through the 2026-08-24 run
    on drafts that were otherwise reported clean.
    """
    violations = []
    for field in ("summary", "notes"):
        value = entry.get(field)
        if isinstance(value, str):
            violations.extend(lint_text(value, context=field))
    for field in ("model_name",):
        value = entry.get(field)
        if isinstance(value, str):
            violations.extend(lint_identifier(value, context=field))
    return violations
