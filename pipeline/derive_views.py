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
import statistics

from . import config, store, validate


class ViewsError(ValueError):
    pass


def _date(d: str) -> datetime.date:
    return datetime.date.fromisoformat(d)


def build_cadence(entries: list) -> dict:
    releases = sorted((e for e in entries if e["entry_type"] == "release"),
                      key=lambda e: e["date"])
    monthly = {}
    for e in entries:
        key = e["date"][:7]
        m = monthly.setdefault(key, {"month": key, "releases": 0, "revisions": 0})
        m["releases" if e["entry_type"] == "release" else "revisions"] += 1

    # Median gap between consecutive releases over a trailing 365-day
    # window, evaluated at each release date (the Beat 2 counter).
    dates = [_date(e["date"]) for e in releases]
    median_gap = []
    for i, d in enumerate(dates):
        window = [x for x in dates[:i + 1] if (d - x).days <= 365]
        if len(window) < 3:
            continue
        gaps = [(b - a).days for a, b in zip(window, window[1:])]
        median_gap.append({"date": d.isoformat(),
                           "days": round(statistics.median(gaps), 1)})
    return {"monthly": sorted(monthly.values(), key=lambda m: m["month"]),
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
            # Structural guard: a point can only join a series whose key it
            # reproduces exactly (D15: never mix versions or classes).
            if (s["benchmark_version"] != prov["benchmark_version"]
                    or s["source_class"] != prov["source_class"]):
                raise ViewsError(f"mixed series refused at {e['id']}")
            point = {
                "date": e["date"],
                "value": num["value"],
                "entry_id": e["id"],
                "model_name": e["model_name"],
                "org": e["org"],
                "source_url": prov["source_url"],
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


def build_disclosure_matrix(entries: list) -> dict:
    artifacts = list(validate.DISCLOSURE_ARTIFACTS)
    rows = []
    counts = {a: {"disclosed": 0, "not_disclosed": 0} for a in artifacts}
    for e in sorted((e for e in entries if e["entry_type"] == "release"),
                    key=lambda e: (e["date"], e["id"])):
        cells = {}
        for a in artifacts:
            disclosed = e["disclosure_links"].get(a, validate.NOT_DISCLOSED) \
                != validate.NOT_DISCLOSED
            cells[a] = disclosed
            counts[a]["disclosed" if disclosed else "not_disclosed"] += 1
        rows.append({"entry_id": e["id"], "model_name": e["model_name"],
                     "org": e["org"], "date": e["date"], "cells": cells})
    return {"artifacts": artifacts, "rows": rows, "counts": counts}


def build_tiles(entries: list, run_date: str) -> dict:
    releases = sorted((e for e in entries if e["entry_type"] == "release"),
                      key=lambda e: e["date"])
    if not releases:
        raise ViewsError("no releases in the record")
    last = _date(releases[-1]["date"])
    year = run_date[:4]
    year_dates = [_date(e["date"]) for e in releases
                  if e["date"].startswith(year)]
    year_gaps = [(b - a).days for a, b in zip(year_dates, year_dates[1:])]
    with_card = sum(1 for e in releases
                    if e["disclosure_links"].get("system_card",
                                                 validate.NOT_DISCLOSED)
                    != validate.NOT_DISCLOSED)
    return {
        "releases_recorded": len(releases),
        "days_since_last_release": (_date(run_date) - last).days,
        "median_gap_days_this_year":
            round(statistics.median(year_gaps), 1) if year_gaps else None,
        "share_with_system_card": round(with_card / len(releases), 3),
        "as_of": run_date,
    }


def build_views(root: str = ".", run_date: str = None) -> dict:
    entries = store.read_entries(root=root)
    views = {
        "cadence": build_cadence(entries),
        "trajectory": build_trajectory(entries),
        "disclosure_matrix": build_disclosure_matrix(entries),
        "tiles": build_tiles(entries, run_date),
    }
    store.write_derived_json(views, "views.json.gz", root=root)
    return views
