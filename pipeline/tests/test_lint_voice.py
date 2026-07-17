"""Seeded-violation tests for the registrar-voice lint (Phase 0 gate 6 /
invariant 5). Each seeded string is a violation the lint MUST catch."""
from pipeline import lint_voice

SEEDED_VIOLATIONS = [
    ("An impressive leap in capability.", "quality-adjective"),
    ("The most powerful model yet.", "quality-adjective"),
    ("A state-of-the-art system.", "quality-adjective"),
    ("This is the best model available.", "ranking"),
    ("It beats every competitor.", "ranking"),
    ("An industry-leading score.", "ranking"),
    ("The release dominates the leaderboard.", "ranking"),
    ("A disappointing showing on math.", "editorial"),
    ("A game-changing release.", "editorial"),
    ("We are excited to announce this.", "corporate-speak"),
    ("Developers can leverage the new API.", "corporate-speak"),
    ("This unlocks new use cases.", "corporate-speak"),
    ("Users delve into the details.", "corporate-speak"),
    ("The lab shipped the model — a large one.", "em-dash"),
    ("The lab merged the release into production.", "git-metaphor"),
]

CLEAN_STRINGS = [
    "OpenAI reports a GPQA Diamond score of 88.4 for the new model.",
    "The model is available by public API. Anthropic published a system card.",
    "Meta released the weights under a restricted-use license.",
    "No comparable measurement exists for this pair.",
    "Mistral reports 84.2 on SWE-Bench Verified; the predecessor entry records 79.1.",
]


def test_every_seeded_violation_is_caught():
    for text, expected_category in SEEDED_VIOLATIONS:
        violations = lint_voice.lint_text(text)
        assert violations, f"lint missed a seeded violation: {text!r}"
        categories = {v["category"] for v in violations}
        assert expected_category in categories, (
            f"lint caught {text!r} but as {categories}, expected {expected_category}"
        )


def test_clean_registrar_prose_passes():
    for text in CLEAN_STRINGS:
        violations = lint_voice.lint_text(text)
        assert violations == [], f"lint false-positive on clean prose {text!r}: {violations}"


def test_em_dash_strip_removes_all_em_dashes():
    text = "The model — released today — is available."
    stripped = lint_voice.strip_em_dashes(text)
    assert "—" not in stripped
    assert lint_voice.lint_text(stripped) == []


def test_entry_prose_lint_covers_summary_field():
    entry = {"summary": "An incredible model.", "notes": "Plain factual note."}
    violations = lint_voice.lint_entry_prose(entry)
    assert any(v["context"] == "summary" for v in violations)
