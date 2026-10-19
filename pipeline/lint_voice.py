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


# ---- page copy -------------------------------------------------------------
# Site pages are not entry prose: they legitimately say "commit" in a code
# sense, name the dataset's fields, and quote lab terms, so the full banned
# list above would flag honest copy. Pages get a focused check instead: no
# dash substitutes of any kind, and none of the internal jargon the 2026-10-19
# audit removed. Ranges are written in words ("0 to 100"), so any en dash in
# rendered page text is a failure, not just a spaced one.
EN_DASH_RE = re.compile("–")
_DASH_ENTITY_RE = re.compile(r"&(#8211|#8212|#x2013|#x2014|ndash|mdash);|\\u201[34]", re.IGNORECASE)

# Words that leave the public copy and must not come back. Each was a build
# or project-internal name that a reader has no way to decode.
PAGE_JARGON = [
    (r"\bregistrar'?s?\b", "jargon"),
    (r"\bend state\b", "jargon"),
    (r"\btransforming canvas\b", "jargon"),
    (r"\bfrontier\b", "jargon"),
]
_PAGE_JARGON = [(re.compile(p, re.IGNORECASE), c) for p, c in PAGE_JARGON]


def lint_page_copy(text: str, context: str = "") -> list:
    """Dash and jargon check for rendered site copy (pages, UI strings)."""
    violations = [v for v in lint_text(text, context=context) if v["category"] == "em-dash"]
    m = EN_DASH_RE.search(text)
    if m:
        violations.append({"pattern": "en-dash", "category": "en-dash",
                           "match": m.group(0), "context": context})
    for m in _DASH_ENTITY_RE.finditer(text):
        s = m.group(0).lower()
        cat = "en-dash" if ("8211" in s or "2013" in s or "ndash" in s) else "em-dash"
        violations.append({"pattern": "dash-entity", "category": cat,
                           "match": m.group(0), "context": context})
    for rx, cat in _PAGE_JARGON:
        m = rx.search(text)
        if m:
            violations.append({"pattern": rx.pattern, "category": cat,
                               "match": m.group(0), "context": context})
    return violations


def strip_js_comments(src: str) -> str:
    """Remove /* */ and // comments from JavaScript, leaving string literals.

    Line comments are found with a per-line quote scan, so "https://" inside
    a string survives. Good enough for this site's hand-written scripts; it
    is not a JavaScript parser.
    """
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    out = []
    for line in src.split("\n"):
        q = None
        i = 0
        cut = None
        while i < len(line):
            c = line[i]
            if q:
                if c == "\\":
                    i += 2
                    continue
                if c == q:
                    q = None
            elif c in "'\"`":
                q = c
            elif c == "/" and line[i + 1:i + 2] == "/":
                cut = i
                break
            i += 1
        out.append(line if cut is None else line[:cut])
    return "\n".join(out)


_JS_STRING_RE = re.compile(r'"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'')


def js_strings(src: str) -> list:
    """Every string literal in a script, comments removed first."""
    return [m.group(0)[1:-1] for m in _JS_STRING_RE.finditer(strip_js_comments(src))]


_VISIBLE_ATTRS = {"title", "aria-label", "alt", "placeholder", "content",
                  "data-tip", "data-atip", "data-swetip"}


def page_strings(html_text: str) -> list:
    """The strings a reader can see or hear on a page.

    Text nodes outside <script> and <style>, the attributes that render as
    tooltips, labels or link previews, and the string literals of inline
    scripts (the story builds its notes from them). Entities are decoded.
    """
    import html as _html
    from html.parser import HTMLParser

    found = []

    class _P(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.skip = None

        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style"):
                self.skip = tag
            for k, v in attrs:
                if k in _VISIBLE_ATTRS and v:
                    found.append(v)

        def handle_endtag(self, tag):
            if tag == self.skip:
                self.skip = None

        def handle_data(self, data):
            if self.skip == "script":
                found.extend(js_strings(data))
            elif self.skip is None and data.strip():
                found.append(data)

        def handle_entityref(self, name):
            if self.skip is None:
                found.append(f"&{name};")

        def handle_charref(self, name):
            if self.skip is None:
                found.append(f"&#{name};")

    _P().feed(html_text)
    # keep raw entity spellings visible to the dash check, then decode
    return [s if _DASH_ENTITY_RE.search(s) else _html.unescape(s) for s in found]


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
