"""Delta computation tests (invariant 3): comparable pairs get numbers,
everything else gets the explicit refusal, silence only when there is nothing
to compare at all."""
import copy

from pipeline import deltas


def _num(benchmark="gpqa-diamond", value=85.7, source_class="LAB_REPORTED",
         version="diamond", name="GPQA Diamond"):
    return {
        "benchmark": benchmark,
        "value": value,
        "provenance": {
            "source_class": source_class,
            "source_url": "https://example.com/announcement",
            "benchmark_name": name,
            "benchmark_version": version,
            "retrieval_date": "2026-07-16",
        },
    }


def test_comparable_pair_yields_delta():
    d = deltas.compute_delta(_num(value=85.7), _num(value=71.4))
    assert d["kind"] == "delta"
    assert d["value"] == 14.3
    assert d["current"] == 85.7 and d["predecessor"] == 71.4
    assert d["source_class"] == "LAB_REPORTED"


def test_cross_version_refused():
    # "GPQA Diamond" versus bare "GPQA" is permanently a different axis
    # (DESIGN semantic rule 4); the marker renders in words, never whitespace.
    d = deltas.compute_delta(
        _num(),
        _num(version="main", name="GPQA"),
    )
    assert d["kind"] == deltas.REFUSED_COMPARISON
    assert "version" in d["reason"]


def test_cross_provenance_class_refused():
    d = deltas.compute_delta(_num(source_class="LAB_REPORTED"),
                             _num(source_class="INDEPENDENT"))
    assert d["kind"] == deltas.REFUSED_COMPARISON
    assert "provenance" in d["reason"]


def test_cross_benchmark_refused():
    d = deltas.compute_delta(
        _num(),
        _num(benchmark="swe-bench-verified", name="SWE-Bench Verified",
             version="verified"),
    )
    assert d["kind"] == deltas.REFUSED_COMPARISON


def test_entry_deltas_pairs_by_benchmark_and_class():
    entry = {"benchmarks": [_num(value=85.7)]}
    pred = {"benchmarks": [
        _num(value=71.4),
        _num(value=69.0, source_class="INDEPENDENT"),
    ]}
    out = deltas.entry_deltas(entry, pred)
    assert len(out) == 1
    assert out[0]["kind"] == "delta"
    assert out[0]["predecessor"] == 71.4, "must pair with the same-class number"


def test_entry_deltas_silent_when_predecessor_lacks_measurement():
    # No measurement is different from a refused comparison: no chip renders.
    entry = {"benchmarks": [_num()]}
    pred = {"benchmarks": []}
    assert deltas.entry_deltas(entry, pred) == []


def test_entry_deltas_refuses_when_only_cross_class_available():
    entry = {"benchmarks": [_num(source_class="LAB_REPORTED")]}
    pred = {"benchmarks": [_num(value=64.2, source_class="INDEPENDENT")]}
    out = deltas.entry_deltas(entry, pred)
    assert len(out) == 1
    assert out[0]["kind"] == deltas.REFUSED_COMPARISON
