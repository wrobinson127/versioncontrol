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


def lint_entry_prose(entry: dict) -> list:
    """Lint every prose-bearing field of a draft entry dict."""
    violations = []
    for field in ("summary", "notes"):
        value = entry.get(field)
        if isinstance(value, str):
            violations.extend(lint_text(value, context=field))
    return violations
