"""Backfill: Epoch-derived entries, 2022-11-30 forward, registry orgs only.

Deterministic and idempotent: same inputs produce byte-identical aggregates
(store.py guarantees the byte level; this module sorts everything it emits).
No LLM is used; summaries are registrar-voice templates that pass lint_voice.

The D3 inclusion test, applied in order:
  1. primary organization is a registry org
  2. publication date inside the window (D7)
  3. publicly usable (accessibility maps to an availability class)
  4. language or multimodal domain
  5. sibling variants (size ladders, same-day same-link releases) cluster
     into one entry; quantizations and reposts never appear because only
     registry-org rows enter
Rows refused at each step are counted and reported for backfill_strategy.md.

Benchmark numbers: INDEPENDENT only, joined from Epoch's Benchmarking Hub
for the pinned pair, conservative exact-slug matching, org-checked. Scores
are stored on a 0-100 scale. LAB_REPORTED numbers arrive via the nightly
extraction path, never from backfill (no announcement parsing happens here,
so no lab-reported provenance is completable here).
"""
import argparse
import csv
import io
import json
import re
import zipfile
from collections import Counter

from . import config, lint_voice, store, validate

HUB_URL = "https://epoch.ai/benchmarks"
HUB_FILES = {
    "gpqa-diamond": "gpqa_diamond.csv",
    "swe-bench-verified": "swe_bench_verified.csv",
}

_EPOCH_NAME_TO_ORG = {}
for _key, _org in config.REGISTRY.items():
    for _name in _org["epoch_names"]:
        _EPOCH_NAME_TO_ORG[_name] = _key

_REVISION_RE = re.compile(r"\((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\)\s*$")
_SIZE_SUFFIX_RE = re.compile(
    r"[- ]\(?(\d+(?:\.\d+)?[BbMm])\)?$|[- ](7B|13B|34B|70B|8B|405B|72B|32B|14B|3B|1B)$")

ACCESSIBILITY_MAP = {
    "API access": "public_api",
    "Open weights (unrestricted)": "open_weights",
    "Open weights (restricted use)": "open_weights",
    "Open weights (non-commercial)": "open_weights",
    "Hosted access (no API)": "public_service",
}


def primary_org_key(org_field: str):
    return _EPOCH_NAME_TO_ORG.get(org_field.split(",")[0].strip())


def split_links(link_field: str) -> list:
    parts = re.split(r"[\n,;]\s*|\s{2,}", (link_field or "").strip())
    return [p.strip() for p in parts if p.strip().startswith("http")]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9.]+", "-", name.lower().replace("+", " plus")).strip("-")


def family_key(model_name: str) -> str:
    """Coarse family for predecessor chaining: name minus trailing size and
    snapshot markers, digits kept (GPT-4 and GPT-5 are the same family only
    up to the shared prefix, so keep the letters, drop the version digits)."""
    name = _REVISION_RE.sub("", model_name).strip()
    name = _SIZE_SUFFIX_RE.sub("", name).strip()
    return re.sub(r"[\d.]+", "", name).replace("-", " ").split("(")[0].strip().lower()


def load_epoch_rows(csv_text: str) -> list:
    header_check = csv.reader(io.StringIO(csv_text))
    header = next(header_check)
    missing = [c for c in config.EPOCH_CONSUMED_COLUMNS if c not in header]
    if missing:
        raise ValueError(f"Epoch schema drift, consumed columns missing: {missing}")
    return list(csv.DictReader(io.StringIO(csv_text)))


def d3_filter(rows: list):
    """Apply the D3 inclusion test. Returns (kept_rows, refusal_counter)."""
    refusals = Counter()
    kept = []
    for r in rows:
        org = primary_org_key(r["Organization"])
        if org is None:
            refusals["non_registry_org"] += 1
            continue
        date = (r["Publication date"] or "").strip()
        if not date or date < config.BACKFILL_START:
            refusals["outside_window"] += 1
            continue
        access = (r["Model accessibility"] or "").strip()
        if access not in ACCESSIBILITY_MAP:
            refusals["not_publicly_usable"] += 1
            continue
        dom = (r.get("Domain") or "").lower()
        if not ("language" in dom or "multimodal" in dom):
            refusals["non_language_domain"] += 1
            continue
        kept.append({**r, "_org": org, "_availability": ACCESSIBILITY_MAP[access]})
    return kept, refusals


_DUPLICATE_LISTING_WINDOW_DAYS = 30


def _date_ordinal(date_str: str) -> int:
    y, m, d = (int(x) for x in date_str.split("-"))
    return y * 372 + m * 31 + d  # close enough to calendar days for a 30-day window


def cluster_variants(rows: list) -> list:
    """Group sibling rows (size ladders, same announcement) into release
    events. Cluster key: org + date + first link, falling back to
    org + date + size-stripped name when no link exists.

    A second pass merges duplicate listings: Epoch sometimes carries the
    same release twice (an announcement-dated row, then a paper-dated row
    days later; observed with GLM-5). Clusters with the same org and the
    identical model-name set within a 30-day window merge into one event;
    the earliest date wins and every row's links survive as sources."""
    clusters = {}
    for r in rows:
        links = split_links(r["Link"])
        anchor = links[0] if links else _SIZE_SUFFIX_RE.sub("", r["Model"]).strip().lower()
        key = (r["_org"], r["Publication date"].strip(), anchor)
        clusters.setdefault(key, []).append(r)

    merged = []
    ordered = sorted(clusters.items(), key=lambda kv: (kv[0][1], kv[0][0], kv[0][2]))
    for (org, date, _anchor), cluster in ordered:
        names = frozenset(r["Model"].strip() for r in cluster)
        target = None
        for m in merged:
            if m["org"] == org and m["names"] == names and \
                    _date_ordinal(date) - _date_ordinal(m["date"]) \
                    <= _DUPLICATE_LISTING_WINDOW_DAYS:
                target = m
                break
        if target:
            target["rows"].extend(cluster)
        else:
            merged.append({"org": org, "names": names, "date": date,
                           "rows": cluster})
    return [m["rows"] for m in merged]


def _params(row) -> object:
    raw = (row.get("Parameters") or "").strip()
    try:
        value = float(raw)
        return value if value > 0 else validate.NOT_DISCLOSED
    except ValueError:
        return validate.NOT_DISCLOSED


def pick_flagship(cluster: list) -> dict:
    """Flagship = the row with the most parameters; ties and unknowns fall
    back to the shortest model name (base model over long variant names)."""
    def sort_key(r):
        p = _params(r)
        return (-(p if isinstance(p, float) else 0), len(r["Model"]), r["Model"])
    return sorted(cluster, key=sort_key)[0]


def load_hub_rows(zip_path: str, retrieval_date: str) -> list:
    """INDEPENDENT measurements from the Benchmarking Hub for the pinned
    pair, one dict per evaluation run, with the verbatim hub slug kept as
    the number's configuration string."""
    out = []
    z = zipfile.ZipFile(zip_path)
    for bench_key, filename in HUB_FILES.items():
        pin = config.BENCHMARKS[bench_key]
        rows = csv.DictReader(io.StringIO(z.read(filename).decode("utf-8-sig")))
        for r in rows:
            org = _EPOCH_NAME_TO_ORG.get((r.get("Organization") or "").strip())
            if org is None:
                continue
            slug = (r.get("Model version") or "").strip()
            if not slug:
                continue
            try:
                value = round(float(r["mean_score"]) * 100, 1)
            except (ValueError, KeyError):
                continue
            out.append({
                "org": org,
                "slug": slug,
                "benchmark": bench_key,
                "benchmark_name": pin["name"],
                "benchmark_version": pin["version"],
                "value": value,
                "retrieval_date": retrieval_date,
            })
    return out


# Hub slugs are API model strings. Decorations that are serving-channel or
# packaging markers get stripped to find the model core; date stamps are
# revision markers and drive revision-aware matching. Tier and mode tokens
# (mini, nano, thinking, turbo, exp) are NEVER stripped: they name distinct
# models and stripping them would misattribute scores.
_STRIP_PREFIXES = ("open-", "meta-")
# "v" suffixes require a dot (v0.1, v0.3): a bare -v3 is a model version
# (DeepSeek-V3), not a packaging marker, and must survive.
_STRIP_SUFFIX_RE = re.compile(
    r"-(instruct|chat|it|hf|preview|pre-release|beta|reasoning"
    r"|v\d+\.\d+|\d{3})$")
_STAMP_FULL_RE = re.compile(r"-(\d{4})-(\d{2})-(\d{2})$")
_STAMP_8_RE = re.compile(r"-(\d{4})(\d{2})(\d{2})$")
_STAMP_4_RE = re.compile(r"-(\d{2})(\d{2})$")
_STAMP_WINDOW_DAYS = 45


def normalize_hub_slug(slug: str):
    """Return (core, stamp). core is the model base for matching; stamp is
    None or {"kind": "full"|"short", ...} describing a trailing date."""
    s = slug.lower().partition("_")[0]
    if "/" in s:
        s = s.split("/", 1)[1]
    for pre in _STRIP_PREFIXES:
        if s.startswith(pre):
            s = s[len(pre):]
    stamp = None
    changed = True
    while changed:
        changed = False
        if stamp is None:
            m = _STAMP_FULL_RE.search(s) or _STAMP_8_RE.search(s)
            if m and 1 <= int(m.group(2)) <= 12 and 1 <= int(m.group(3)) <= 31:
                stamp = {"kind": "full",
                         "date": f"{m.group(1)}-{m.group(2)}-{m.group(3)}"}
                s = s[:m.start()]
                changed = True
                continue
            m = _STAMP_4_RE.search(s)
            if m:
                a, b = int(m.group(1)), int(m.group(2))
                # Ambiguous 4-digit stamp: MMDD (deepseek-v3-0324) or YYMM
                # (mistral-large-2402). Record both readings.
                readings = []
                if 1 <= a <= 12 and 1 <= b <= 31:
                    readings.append(("mmdd", a, b))
                if 20 <= a <= 29 and 1 <= b <= 12:
                    readings.append(("yymm", a, b))
                if readings:
                    stamp = {"kind": "short", "readings": readings}
                    s = s[:m.start()]
                    changed = True
                    continue
        m = _STRIP_SUFFIX_RE.search(s)
        if m:
            s = s[:m.start()]
            changed = True
    return s, stamp


def _slug_probes(name: str) -> set:
    s = slugify(name)
    return {s, s.replace(".", "-"), s.replace("-", ""), s.replace(".", "")}


def _stamp_candidates(stamp, entry_date: str) -> list:
    """Possible calendar dates a stamp could mean, given a candidate entry's
    date (supplies the year for MMDD readings)."""
    if stamp["kind"] == "full":
        return [stamp["date"]]
    year = int(entry_date[:4])
    dates = []
    for kind, a, b in stamp["readings"]:
        if kind == "mmdd":
            for y in (year - 1, year, year + 1):
                dates.append(f"{y:04d}-{a:02d}-{b:02d}")
        else:
            dates.append(f"20{a:02d}-{b:02d}-15")
    return dates


def attach_hub_numbers(entries: list, hub_rows: list) -> int:
    """Attach INDEPENDENT numbers to entries, revision-aware.

    Matching: the hub slug's core must equal the entry's model slug (probes
    cover dot/hyphen spelling differences). Variant names never match: only
    the flagship name is indexed, so a mini/8B score cannot land on the
    flagship entry. Date-stamped slugs must additionally land within 45 days
    of the entry's date, which routes snapshot evals (gpt-4o-2024-11-20,
    deepseek-v3-0324) to the matching revision entry rather than the
    original release. Undated slugs attach to the earliest matching release.

    Returns the count of entries that received at least one number.
    """
    index = {}
    for e in entries:
        names = {e["model_name"]}
        stripped = _REVISION_RE.sub("", e["model_name"]).strip()
        names.add(stripped)
        for name in names:
            for probe in _slug_probes(name):
                index.setdefault((e["org"], probe), []).append(e)

    picked = {}
    for row in sorted(hub_rows, key=lambda r: (len(r["slug"]), r["slug"])):
        core, stamp = normalize_hub_slug(row["slug"])
        candidates = []
        seen_ids = set()
        for probe in {core, core.replace(".", "-"), core.replace("-", ""),
                      core.replace(".", "")}:
            for e in index.get((row["org"], probe), []):
                if e["id"] not in seen_ids:
                    seen_ids.add(e["id"])
                    candidates.append(e)
        if not candidates:
            continue

        if stamp is None:
            releases = [e for e in candidates if e["entry_type"] == "release"]
            pool = releases or candidates
            target = min(pool, key=lambda e: (e["date"], e["id"]))
        else:
            best = None
            for e in candidates:
                for d in _stamp_candidates(stamp, e["date"]):
                    diff = abs(_date_ordinal(d) - _date_ordinal(e["date"]))
                    if diff <= _STAMP_WINDOW_DAYS and (best is None or diff < best[0]):
                        best = (diff, e)
            if best is None:
                continue
            target = best[1]

        key = (target["id"], row["benchmark"])
        # Prefer the least-decorated slug for an entry+benchmark; the sort
        # above (shortest slug first) makes the first hit the plainest run.
        if key in picked:
            continue
        picked[key] = True
        num = {
            "benchmark": row["benchmark"],
            "value": row["value"],
            "configuration": row["slug"],
            "provenance": {
                "source_class": "INDEPENDENT",
                "source_url": HUB_URL,
                "benchmark_name": row["benchmark_name"],
                "benchmark_version": row["benchmark_version"],
                "retrieval_date": row["retrieval_date"],
            },
        }
        target["benchmarks"].append(num)

    touched = 0
    for e in entries:
        if e["benchmarks"]:
            e["benchmarks"].sort(key=lambda n: n["benchmark"])
            touched += 1
    return touched


def _availability_phrase(availability: str, access_raw: str) -> str:
    if availability == "open_weights":
        low = access_raw.lower()
        if "unrestricted" in low:
            return "with open weights under an unrestricted license"
        if "non-commercial" in low:
            return "with open weights under a non-commercial license"
        return "with open weights under a restricted-use license"
    if availability == "public_api":
        return "by public API"
    return "as a public service without an API"


def build_summary(org_display: str, model_name: str, entry_type: str,
                  availability: str, access_raw: str, has_ind: bool) -> str:
    phrase = _availability_phrase(availability, access_raw)
    if entry_type == "revision":
        base = _REVISION_RE.sub("", model_name).strip()
        text = (f"{org_display} updated the {base} snapshot in service. "
                f"The change is recorded from Epoch AI's models dataset; "
                f"the lab published no separate announcement link for it.")
    else:
        text = (f"{org_display} released {model_name}, available {phrase}. "
                f"The entry is backfilled from Epoch AI's models dataset.")
    if has_ind:
        text += (" Benchmark measurements shown are independent evaluations "
                 "from Epoch AI's Benchmarking Hub.")
    return text


def build_entries(rows: list, hub_rows: list, retrieval_date: str):
    """Full pipeline: D3 filter, clustering, entry construction, hub-number
    attachment, predecessor chaining. Returns (entries, refusals, problems)."""
    kept, refusals = d3_filter(rows)
    clusters = cluster_variants(kept)

    entries = []
    access_by_id = {}
    for cluster in clusters:
        flagship = pick_flagship(cluster)
        org = flagship["_org"]
        model_name = flagship["Model"].strip()
        entry_type = "revision" if _REVISION_RE.search(model_name) else "release"
        entry_date = min(r["Publication date"].strip() for r in cluster)
        access_raw = flagship["Model accessibility"].strip()

        links = []
        for r in cluster:
            for u in split_links(r["Link"]):
                if u not in links:
                    links.append(u)
        paper = next((u for u in links if "arxiv.org" in u), None)
        sources = [{"kind": "epoch_csv", "url": config.EPOCH_CSV_URL,
                    "retrieval_date": retrieval_date}]
        for u in links:
            kind = "paper" if "arxiv.org" in u else "lab_link"
            sources.append({"kind": kind, "url": u,
                            "retrieval_date": retrieval_date})

        variants = sorted(r["Model"].strip() for r in cluster
                          if r["Model"].strip() != model_name)

        entry = {
            "id": validate.make_entry_id(org, model_name),
            "entry_type": entry_type,
            "model_name": model_name,
            "org": org,
            "date": entry_date,
            "availability_class": flagship["_availability"],
            "parameters": _params(flagship),
            "summary": "",  # set after hub numbers attach
            "benchmarks": [],
            "disclosure_links": {
                "system_card": validate.NOT_DISCLOSED,
                "model_card": validate.NOT_DISCLOSED,
                "usage_policy": validate.NOT_DISCLOSED,
                "paper": paper or validate.NOT_DISCLOSED,
            },
            "predecessor": None,
            "license_note": (f"{access_raw}. {flagship.get('Accessibility notes', '').strip()}".strip()
                             .rstrip(".") + "."),
            "sources": sources,
            "origin": "backfill-epoch",
            "retracted": False,
        }
        if variants:
            entry["variants"] = variants
        entries.append(entry)
        access_by_id[entry["id"]] = access_raw

    # Duplicate ids (same org, same model name, different clusters) get a
    # date suffix so both survive; rare, but Epoch has re-listed names.
    seen = Counter(e["id"] for e in entries)
    for e in entries:
        if seen[e["id"]] > 1:
            access_by_id[f"{e['id']}-{e['date']}"] = access_by_id[e["id"]]
            e["id"] = f"{e['id']}-{e['date']}"

    # Predecessor chaining: previous entry of the same org + family by date.
    entries.sort(key=lambda e: (e["date"], e["id"]))
    last_by_family = {}
    for e in entries:
        fam = (e["org"], family_key(e["model_name"]))
        if fam in last_by_family:
            e["predecessor"] = last_by_family[fam]["id"]
        last_by_family[fam] = e

    attach_hub_numbers(entries, hub_rows)
    for e in entries:
        e["summary"] = build_summary(
            config.REGISTRY[e["org"]]["display"], e["model_name"],
            e["entry_type"], e["availability_class"],
            access_by_id[e["id"]], bool(e["benchmarks"]))

    problems = []
    for e in entries:
        errors = validate.validate_entry(e)
        for err in errors:
            problems.append(f"{e['id']}: {err}")
        violations = lint_voice.lint_entry_prose(e)
        for v in violations:
            problems.append(f"{e['id']}: voice lint {v['category']} {v['match']!r}")
    return entries, refusals, problems


def main():
    ap = argparse.ArgumentParser(description="Backfill Epoch-derived entries.")
    ap.add_argument("--epoch-csv", required=True)
    ap.add_argument("--hub-zip", required=True)
    ap.add_argument("--retrieval-date", required=True)
    ap.add_argument("--root", default=".")
    ap.add_argument("--report", default=None,
                    help="write a JSON refusal/summary report here")
    args = ap.parse_args()

    with open(args.epoch_csv, encoding="utf-8-sig", newline="") as f:
        rows = load_epoch_rows(f.read())
    hub_rows = load_hub_rows(args.hub_zip, args.retrieval_date)
    entries, refusals, problems = build_entries(rows, hub_rows,
                                                args.retrieval_date)
    if problems:
        for p in problems:
            print("INVALID:", p)
        raise SystemExit(f"{len(problems)} validation problems; nothing written")

    manifest = store.write_entries(entries, root=args.root)
    report = {
        "entries_written": manifest["entry_count"],
        "with_independent_numbers": sum(1 for e in entries if e["benchmarks"]),
        "releases": sum(1 for e in entries if e["entry_type"] == "release"),
        "revisions": sum(1 for e in entries if e["entry_type"] == "revision"),
        "with_predecessor": sum(1 for e in entries if e["predecessor"]),
        "refusals": dict(sorted(refusals.items())),
    }
    print(json.dumps(report, indent=2))
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
