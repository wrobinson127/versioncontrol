"""Delta computation between benchmark numbers (invariant 3).

A delta exists only for a comparable pair: same pinned benchmark, same
benchmark version, same provenance class. Anything else returns the explicit
REFUSED_COMPARISON marker, which the site renders in words. No code path
anywhere computes a cross-eval-version comparison; this module is the only
delta implementation.
"""

REFUSED_COMPARISON = "REFUSED_COMPARISON"


def compute_delta(current: dict, predecessor: dict) -> dict:
    """Compare two benchmark-number objects.

    Returns {"kind": "delta", "value": float, ...} for a comparable pair, or
    {"kind": "REFUSED_COMPARISON", "reason": str} otherwise. Both inputs are
    schema-valid benchmark numbers (validate.validate_benchmark_number).
    """
    cp = current.get("provenance", {})
    pp = predecessor.get("provenance", {})

    # Self-defending against unvalidated inputs: an absent provenance class
    # or version must never satisfy the equality gates by both being None.
    for prov, side in ((cp, "current"), (pp, "predecessor")):
        if not prov.get("source_class") or not prov.get("benchmark_version"):
            return {"kind": REFUSED_COMPARISON,
                    "reason": f"{side} number lacks provenance"}

    if current.get("benchmark") != predecessor.get("benchmark"):
        return {"kind": REFUSED_COMPARISON,
                "reason": "different benchmarks"}
    if cp.get("benchmark_name") != pp.get("benchmark_name") \
            or cp.get("benchmark_version") != pp.get("benchmark_version"):
        return {"kind": REFUSED_COMPARISON,
                "reason": "different benchmark versions"}
    if cp.get("source_class") != pp.get("source_class"):
        return {"kind": REFUSED_COMPARISON,
                "reason": "different provenance classes"}

    value = current.get("value")
    prior = predecessor.get("value")
    if not isinstance(value, (int, float)) or not isinstance(prior, (int, float)) \
            or isinstance(value, bool) or isinstance(prior, bool):
        return {"kind": REFUSED_COMPARISON, "reason": "non-numeric value"}

    return {
        "kind": "delta",
        "benchmark": current["benchmark"],
        "benchmark_version": cp.get("benchmark_version"),
        "source_class": cp.get("source_class"),
        "value": round(value - prior, 6),
        "current": value,
        "predecessor": prior,
    }


def entry_deltas(entry: dict, predecessor_entry: dict) -> list:
    """Delta objects for every benchmark on `entry`.

    Pairs each of the entry's numbers with the predecessor's number for the
    same pinned benchmark. A benchmark with no predecessor measurement yields
    no delta object at all (nothing to compare is different from a refused
    comparison and renders differently: no chip versus a worded refusal).
    """
    by_key = {}
    for num in predecessor_entry.get("benchmarks", []):
        by_key.setdefault(num.get("benchmark"), []).append(num)

    deltas = []
    for num in entry.get("benchmarks", []):
        candidates = by_key.get(num.get("benchmark"), [])
        if not candidates:
            continue
        # Prefer a same-provenance-class pairing; if none exists, the
        # comparison is refused rather than silently crossing classes.
        same_class = [c for c in candidates
                      if c.get("provenance", {}).get("source_class")
                      == num.get("provenance", {}).get("source_class")]
        partner = same_class[0] if same_class else candidates[0]
        deltas.append(compute_delta(num, partner))
    return deltas
