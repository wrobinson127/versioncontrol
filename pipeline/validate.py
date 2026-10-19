"""Entry schema and validation.

The schema is enforced here and only here; nothing enters `data/` without
passing `validate_entry` with zero errors. The invariants this module owns:

- Every published benchmark number carries a complete provenance block
  (invariant 2). A number missing any field is rejected, not repaired.
- `NOT_DISCLOSED` is a distinct enum value, never null (invariant 4).
- All data dates are UTC calendar dates in ISO YYYY-MM-DD form (invariant 9).
- Registrar voice in stored prose (invariant 5, via lint_voice).
"""
import re

from . import config, lint_voice

ENTRY_TYPES = ("release", "revision")
AVAILABILITY_CLASSES = ("open_weights", "public_api", "public_service")
NOT_DISCLOSED = "NOT_DISCLOSED"
# The registrar has not researched this artifact for this release. Distinct
# from NOT_DISCLOSED, which is a researched claim that the lab published
# nothing. Until 2026-09-14 the two were one value, so 475 never-researched
# cells read on the site as "the lab did not disclose". The registrar cannot
# assert a lab's silence it has not looked for.
NOT_RESEARCHED = "NOT_RESEARCHED"
DISCLOSURE_ABSENT = (NOT_DISCLOSED, NOT_RESEARCHED)
DISCLOSURE_ARTIFACTS = ("system_card", "model_card", "usage_policy", "paper")
ORIGIN_KINDS = ("backfill-epoch", "nightly-pipeline", "manual")

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*--[a-z0-9][a-z0-9.-]*$")
_URL_RE = re.compile(r"^https?://\S+$")

# Fields every entry must carry. `predecessor` and `license_note` are
# required keys that may hold null; absence and null are different states
# everywhere else in this codebase, so the schema says which is allowed.
REQUIRED_FIELDS = (
    "id", "entry_type", "model_name", "org", "date", "availability_class",
    "parameters", "summary", "benchmarks", "disclosure_links", "predecessor",
    "license_note", "sources", "origin", "retracted",
)

PROVENANCE_FIELDS = (
    "source_class", "source_url", "benchmark_name", "benchmark_version",
    "retrieval_date",
)


def make_entry_id(org_key: str, model_name: str) -> str:
    """Stable entry id: registry key, double hyphen, model slug.

    "+" is meaningful in model names (Command R vs Command R+) and becomes
    "-plus" rather than vanishing into the same slug.
    """
    slug = model_name.lower().replace("+", " plus")
    slug = re.sub(r"[^a-z0-9.]+", "-", slug).strip("-")
    return f"{org_key}--{slug}"


def _is_iso_date(value) -> bool:
    if not isinstance(value, str) or not _DATE_RE.match(value):
        return False
    y, m, d = (int(x) for x in value.split("-"))
    return 1 <= m <= 12 and 1 <= d <= 31


def validate_benchmark_number(num, errors, where):
    if not isinstance(num, dict):
        errors.append(f"{where}: benchmark number must be an object")
        return
    key = num.get("benchmark")
    if key not in config.BENCHMARKS:
        errors.append(f"{where}: benchmark {key!r} is not a pinned benchmark (D5)")
    value = num.get("value")
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        errors.append(f"{where}: value must be numeric, got {value!r}")
    prov = num.get("provenance")
    if not isinstance(prov, dict):
        errors.append(f"{where}: provenance block missing (invariant 2)")
        return
    for field in PROVENANCE_FIELDS:
        v = prov.get(field)
        if not v or not isinstance(v, str):
            errors.append(f"{where}: provenance.{field} missing or empty (invariant 2)")
    sc = prov.get("source_class")
    if sc is not None and sc not in config.PROVENANCE_CLASSES:
        errors.append(f"{where}: provenance.source_class {sc!r} not in {config.PROVENANCE_CLASSES}")
    if "source_url" in prov and isinstance(prov.get("source_url"), str) \
            and prov["source_url"] and not _URL_RE.match(prov["source_url"]):
        errors.append(f"{where}: provenance.source_url is not a URL")
    if "retrieval_date" in prov and isinstance(prov.get("retrieval_date"), str) \
            and prov["retrieval_date"] and not _is_iso_date(prov["retrieval_date"]):
        errors.append(f"{where}: provenance.retrieval_date is not ISO YYYY-MM-DD")
    if key in config.BENCHMARKS and isinstance(prov, dict):
        pin = config.BENCHMARKS[key]
        if prov.get("benchmark_name") and prov["benchmark_name"] != pin["name"]:
            errors.append(f"{where}: provenance.benchmark_name {prov['benchmark_name']!r} "
                          f"does not match pin {pin['name']!r}")
        if prov.get("benchmark_version") and prov["benchmark_version"] != pin["version"]:
            errors.append(f"{where}: provenance.benchmark_version {prov['benchmark_version']!r} "
                          f"does not match pin {pin['version']!r}")


def validate_entry(entry) -> list:
    """Return a list of error strings. Empty list means the entry is valid."""
    errors = []
    if not isinstance(entry, dict):
        return ["entry must be an object"]

    for field in REQUIRED_FIELDS:
        if field not in entry:
            errors.append(f"missing required field: {field}")
    if errors:
        return errors

    eid = entry["id"]
    if not isinstance(eid, str) or not _ID_RE.match(eid):
        errors.append(f"id {eid!r} does not match org-key--model-slug form")

    if entry["entry_type"] not in ENTRY_TYPES:
        errors.append(f"entry_type {entry['entry_type']!r} not in {ENTRY_TYPES}")

    if not isinstance(entry["model_name"], str) or not entry["model_name"].strip():
        errors.append("model_name must be a non-empty string")

    if entry["org"] not in config.REGISTRY:
        errors.append(f"org {entry['org']!r} is not a registry org (D2)")
    elif isinstance(eid, str) and not eid.startswith(entry["org"] + "--"):
        errors.append(f"id {eid!r} does not begin with org key {entry['org']!r}")

    if not _is_iso_date(entry["date"]):
        errors.append(f"date {entry['date']!r} is not an ISO UTC calendar date")
    elif entry["date"] < config.BACKFILL_START:
        errors.append(f"date {entry['date']} precedes the backfill window start "
                      f"{config.BACKFILL_START} (D7)")

    if entry["availability_class"] not in AVAILABILITY_CLASSES:
        errors.append(f"availability_class {entry['availability_class']!r} "
                      f"not in {AVAILABILITY_CLASSES}")

    params = entry["parameters"]
    if params != NOT_DISCLOSED and (
            not isinstance(params, (int, float)) or isinstance(params, bool) or params <= 0):
        errors.append(f"parameters must be a positive number or the string "
                      f"{NOT_DISCLOSED!r}, got {params!r} (invariant 4: never null)")

    if not isinstance(entry["summary"], str) or not entry["summary"].strip():
        errors.append("summary must be a non-empty string")
    else:
        for v in lint_voice.lint_text(entry["summary"], context="summary"):
            errors.append(f"summary fails registrar voice lint: {v['category']} "
                          f"({v['match']!r})")

    # model_name renders on every card and heading, so the em-dash rule
    # applies to it too. Name fields are exempt from the vocabulary list: the
    # registrar records a name as the lab writes it.
    if isinstance(entry.get("model_name"), str):
        for v in lint_voice.lint_identifier(entry["model_name"],
                                            context="model_name"):
            errors.append(f"model_name fails the em-dash prohibition "
                          f"({v['match']!r})")

    if not isinstance(entry["benchmarks"], list):
        errors.append("benchmarks must be a list")
    else:
        for i, num in enumerate(entry["benchmarks"]):
            validate_benchmark_number(num, errors, f"benchmarks[{i}]")

    links = entry["disclosure_links"]
    if not isinstance(links, dict):
        errors.append("disclosure_links must be an object")
    else:
        for artifact in DISCLOSURE_ARTIFACTS:
            v = links.get(artifact)
            if v is None:
                errors.append(f"disclosure_links.{artifact} is null; absence must be "
                              f"the explicit {NOT_DISCLOSED!r} or "
                              f"{NOT_RESEARCHED!r} (invariant 4)")
            elif v not in DISCLOSURE_ABSENT and not (isinstance(v, str) and _URL_RE.match(v)):
                errors.append(f"disclosure_links.{artifact} must be a URL, "
                              f"{NOT_DISCLOSED!r}, or {NOT_RESEARCHED!r}, got {v!r}")
        for k in links:
            if k not in DISCLOSURE_ARTIFACTS:
                errors.append(f"disclosure_links has unknown artifact {k!r}")

    pred = entry["predecessor"]
    if pred is not None and (not isinstance(pred, str) or not _ID_RE.match(pred)):
        errors.append(f"predecessor {pred!r} must be null or an entry id")
    if pred is not None and pred == entry.get("id"):
        errors.append("predecessor must not be the entry itself")

    ln = entry["license_note"]
    if ln is not None and (not isinstance(ln, str) or not ln.strip()):
        errors.append("license_note must be null or a non-empty string")

    if not isinstance(entry["sources"], list) or not entry["sources"]:
        errors.append("sources must be a non-empty list")
    else:
        for i, src in enumerate(entry["sources"]):
            if not isinstance(src, dict):
                errors.append(f"sources[{i}] must be an object")
                continue
            if not (isinstance(src.get("url"), str) and _URL_RE.match(src["url"])):
                errors.append(f"sources[{i}].url missing or not a URL")
            if not _is_iso_date(src.get("retrieval_date", "")):
                errors.append(f"sources[{i}].retrieval_date missing or not ISO")
            if not (isinstance(src.get("kind"), str) and src["kind"].strip()):
                errors.append(f"sources[{i}].kind missing")

    if entry["origin"] not in ORIGIN_KINDS:
        errors.append(f"origin {entry['origin']!r} not in {ORIGIN_KINDS}")

    retracted = entry["retracted"]
    if not isinstance(retracted, bool):
        errors.append("retracted must be a boolean")
    elif retracted and not (isinstance(entry.get("retraction_note"), str)
                            and entry["retraction_note"].strip()):
        errors.append("a retracted entry must carry a retraction_note")

    return errors


def validate_record(entries: list) -> list:
    """Record-level rules no single entry can check: ids are unique and
    every predecessor names an entry on the record. A carried-forward entry
    can otherwise keep pointing at an id a rebuild renamed (found
    2026-10-19: Gemini 3.5 Flash-Lite still chained to the misnamed
    "gemini-3.0-flash-lite" after the upstream name correction)."""
    errors = []
    ids = [e.get("id") for e in entries]
    seen = set()
    for i in ids:
        if i in seen:
            errors.append(f"{i}: duplicate entry id")
        seen.add(i)
    for e in entries:
        pred = e.get("predecessor")
        if pred is not None and pred not in seen:
            errors.append(f"{e.get('id')}: predecessor {pred!r} is not on the record")
    return errors


def main(root: str = ".") -> int:
    """Validate every published entry, then the record as a whole. Until
    2026-10-19 this module had no entry point, so `python -m
    pipeline.validate` imported, checked nothing, and exited 0."""
    from . import store
    entries = store.read_entries(root=root)
    errors = []
    for e in entries:
        errors.extend(f"{e.get('id')}: {msg}" for msg in validate_entry(e))
    errors.extend(validate_record(entries))
    errors.extend(store.check_manifest(root=root))
    for msg in errors:
        print(msg)
    print(f"{len(entries)} entries checked, {len(errors)} problems")
    return 1 if errors else 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
