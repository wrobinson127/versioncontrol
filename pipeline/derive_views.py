"""Narrative and explorer datasets, derived from committed entries at build
time (Amendment 1, P4.5).

The narrative and explorer never compute from raw entries at runtime; they
read these files. Every benchmark point is re-validated through the P1
validation module before it may enter a trajectory series, so the D15
honesty rules (no mixing of eval versions or provenance classes) cannot be
reimplemented divergently: a number that fails validation refuses the whole
build, loudly.

Outputs (data/derived/views.json.gz), all keyed for direct rendering:
  cadence            monthly counts + median-gap series (Beat 2)
  trajectory         one series per benchmark+version+provenance class,
                     plus era bands per benchmark (Beats 3-5, explorer)
  disclosure_matrix  presence/absence per release per artifact (Beat 6, D16)
  tiles              metric tile values (explorer)
"""
import datetime
import glob
import json
import os
import statistics

from . import config, store, validate


class ViewsError(ValueError):
    pass


def _date(d: str) -> datetime.date:
    return datetime.date.fromisoformat(d)


def pending_link_counts(root: str = ".") -> dict:
    """Disclosure links researched into content/disclosure_links/ but not
    yet APPROVED by Walker. The site must render this registrar state as
    'under review', never as a zero (DESIGN.md rule 2: 'not yet collected'
    is visually disjoint from NOT_DISCLOSED and from any value)."""
    counts = {a: 0 for a in validate.DISCLOSURE_ARTIFACTS}
    table_dir = os.path.join(root, "content", "disclosure_links")
    if not os.path.isdir(table_dir):
        return counts
    for path in sorted(glob.glob(os.path.join(table_dir, "*.json"))):
        with open(path, encoding="utf-8") as fh:
            table = json.load(fh)
        for row in table.get("rows", []):
            if row.get("status") == "APPROVED":
                continue
            for a in counts:
                value = row.get(a)
                if value and value != validate.NOT_DISCLOSED:
                    counts[a] += 1
    return counts


def build_cadence(entries: list) -> dict:
    releases = sorted((e for e in entries if e["entry_type"] == "release"),
                      key=lambda e: e["date"])
    monthly = {}
    for e in entries:
        key = e["date"][:7]
        m = monthly.setdefault(key, {"month": key, "releases": 0, "revisions": 0})
        m["releases" if e["entry_type"] == "release" else "revisions"] += 1

    # Median gap between consecutive releases over a trailing 365-day
    # window, evaluated at each release date (the Beat 2 counter). A pooled
    # gap counts only between two releases in the same calendar year, the
    # rule the per-year medians use too.
    dates = [_date(e["date"]) for e in releases]
    median_gap = []
    for i, d in enumerate(dates):
        window = [x for x in dates[:i + 1] if (d - x).days <= 365]
        if len(window) < 3:
            continue
        gaps = [(b - a).days for a, b in zip(window, window[1:])
                if a.year == b.year]
        if not gaps:
            continue
        median_gap.append({"date": d.isoformat(),
                           "days": round(statistics.median(gaps), 1)})
    yearly = {}
    for e in entries:
        key = e["date"][:4]
        y = yearly.setdefault(key, {"year": key, "releases": 0, "revisions": 0})
        y["releases" if e["entry_type"] == "release" else "revisions"] += 1
    return {"monthly": sorted(monthly.values(), key=lambda m: m["month"]),
            "yearly": sorted(yearly.values(), key=lambda y: y["year"]),
            "median_gap": median_gap}


def build_trajectory(entries: list) -> dict:
    """Series strictly partitioned by (benchmark, version, provenance
    class). Any number failing P1 validation refuses the build (D15)."""
    series = {}
    eras = {}
    for e in sorted(entries, key=lambda e: (e["date"], e["id"])):
        for i, num in enumerate(e.get("benchmarks", [])):
            errors = []
            validate.validate_benchmark_number(
                num, errors, f"{e['id']}.benchmarks[{i}]")
            if errors:
                raise ViewsError(
                    "trajectory refused, number failed validation: "
                    + "; ".join(errors))
            prov = num["provenance"]
            key = "|".join((num["benchmark"], prov["benchmark_version"],
                            prov["source_class"]))
            s = series.setdefault(key, {
                "benchmark": num["benchmark"],
                "benchmark_name": prov["benchmark_name"],
                "benchmark_version": prov["benchmark_version"],
                "source_class": prov["source_class"],
                "points": [],
            })
            # D15 partitioning is the series key itself (benchmark, version,
            # class); the refusal mechanism is the P1 validator above. This
            # assertion only documents the impossibility of mixing.
            assert (s["benchmark_version"] == prov["benchmark_version"]
                    and s["source_class"] == prov["source_class"])
            point = {
                "date": e["date"],
                "value": num["value"],
                "entry_id": e["id"],
                "model_name": e["model_name"],
                "org": e["org"],
                "source_url": prov["source_url"],
                "retrieval_date": prov["retrieval_date"],
            }
            if num.get("configuration"):
                point["configuration"] = num["configuration"]
            s["points"].append(point)
            era = eras.setdefault(num["benchmark"], {})
            v = era.setdefault(prov["benchmark_version"],
                               {"version": prov["benchmark_version"],
                                "start": e["date"], "end": None})
            v["start"] = min(v["start"], e["date"])

    return {
        "series": [series[k] for k in sorted(series)],
        "eras": {b: sorted(v.values(), key=lambda x: x["start"])
                 for b, v in sorted(eras.items())},
    }


def build_disclosure_matrix(entries: list, pending: dict = None) -> dict:
    artifacts = list(validate.DISCLOSURE_ARTIFACTS)
    pending = pending or {}
    rows = []
    # Three states per cell, rendered verbatim by the site. "not_researched"
    # is the registrar's own gap and is excluded from every share; it is
    # never a lab's silence and never a zero.
    counts = {a: {"disclosed": 0, "not_disclosed": 0, "not_researched": 0}
              for a in artifacts}
    for e in sorted((e for e in entries if e["entry_type"] == "release"),
                    key=lambda e: (e["date"], e["id"])):
        cells = {}
        for a in artifacts:
            v = e["disclosure_links"].get(a, validate.NOT_RESEARCHED)
            if v == validate.NOT_RESEARCHED:
                state = "not_researched"
            elif v == validate.NOT_DISCLOSED:
                state = "not_disclosed"
            else:
                state = "disclosed"
            cells[a] = state
            counts[a][state] += 1
        rows.append({"entry_id": e["id"], "model_name": e["model_name"],
                     "org": e["org"], "date": e["date"], "cells": cells})
    # An artifact column with zero links on record but researched rows
    # awaiting approval is the registrar's pending state, not the labs'
    # disclosure record; the site renders it as such.
    artifact_status = {
        a: {"links_on_record": counts[a]["disclosed"],
            "researched": counts[a]["disclosed"] + counts[a]["not_disclosed"],
            "not_researched": counts[a]["not_researched"],
            "pending_review": pending.get(a, 0)}
        for a in artifacts
    }
    return {"artifacts": artifacts, "rows": rows, "counts": counts,
            "artifact_status": artifact_status}


def build_tiles(entries: list, run_date: str, pending: dict = None) -> dict:
    pending = pending or {}
    releases = sorted((e for e in entries if e["entry_type"] == "release"),
                      key=lambda e: e["date"])
    if not releases:
        raise ViewsError("no releases in the record")
    last = _date(releases[-1]["date"])
    year = run_date[:4]
    year_dates = [_date(e["date"]) for e in releases
                  if e["date"].startswith(year)]
    year_gaps = [(b - a).days for a, b in zip(year_dates, year_dates[1:])]

    def with_link(artifact):
        return sum(1 for e in releases
                   if e["disclosure_links"].get(artifact,
                                                validate.NOT_RESEARCHED)
                   not in validate.DISCLOSURE_ABSENT)

    def researched(artifact):
        # A share is a fraction of the releases the registrar actually looked
        # at. Never-researched releases are not in the denominator: the
        # registrar cannot count a lab's silence it has not looked for.
        return sum(1 for e in releases
                   if e["disclosure_links"].get(artifact,
                                                validate.NOT_RESEARCHED)
                   != validate.NOT_RESEARCHED)

    sc_researched = researched("system_card")
    return {
        "releases_recorded": len(releases),
        "entries_recorded": len(entries),
        "days_since_last_release": (_date(run_date) - last).days,
        # The site shows the newest release's date, not a day count: a count
        # computed at derive time freezes when updates stop, and a frozen
        # "4 days since the last release" reads as "nothing has shipped"
        # (audit 2026-10-19, FAIL 4). A date stays true however old it is.
        "last_release_date": last.isoformat(),
        "median_gap_days_this_year":
            round(statistics.median(year_gaps), 1) if year_gaps else None,
        "share_with_system_card": (round(with_link("system_card")
                                         / sc_researched, 3)
                                   if sc_researched else None),
        "system_card_researched": sc_researched,
        "papers_on_record": with_link("paper"),
        "system_card_links_pending": pending.get("system_card", 0),
        "as_of": run_date,
    }


def build_views(root: str = ".", run_date: str = None) -> dict:
    entries = store.read_entries(root=root)
    pending = pending_link_counts(root=root)
    views = {
        "cadence": build_cadence(entries),
        "trajectory": build_trajectory(entries),
        "disclosure_matrix": build_disclosure_matrix(entries, pending),
        "tiles": build_tiles(entries, run_date, pending),
    }
    store.write_derived_json(views, "views.json.gz", root=root)
    return views
