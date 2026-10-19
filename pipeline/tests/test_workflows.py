"""Workflow guards checked as text (no YAML parser in the toolchain)."""
import os

WORKFLOWS = os.path.join(os.path.dirname(__file__), "..", "..", ".github",
                         "workflows")


def _step(workflow: str, name: str) -> str:
    """The body of one named step, up to the next step."""
    with open(os.path.join(WORKFLOWS, workflow), encoding="utf-8") as f:
        text = f.read()
    start = text.index(f"- name: {name}")
    nxt = text.find("\n      - ", start + 1)
    return text[start:nxt if nxt != -1 else len(text)]


def test_nightly_push_is_retried_once_after_fetch_and_merge():
    """Run 36585744246 (2026-09-29) lost a night to one 'Internal Server
    Error' on push (audit W12)."""
    step = _step("nightly.yml", "Commit candidates and ledger to the pending branch")
    assert "if ! git push origin nightly-pending; then" in step
    retry = step.split("if ! git push origin nightly-pending; then", 1)[1]
    fetch = retry.index("git fetch origin nightly-pending")
    merge = retry.index("git merge --no-edit FETCH_HEAD")
    push = retry.index("git push origin nightly-pending")
    assert fetch < merge < push
    # Exactly one retry, and never forced.
    assert step.count("git push origin nightly-pending") == 2
    for line in step.splitlines():
        if "git push" in line:
            assert "--force" not in line and " -f" not in line, line
