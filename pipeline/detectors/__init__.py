"""Detection signals. Each detector is a pure parser over fetched bytes plus
a thin fetch wrapper, so the nightly run and the fixture replay harness share
one code path. Detectors emit signal dicts:

    {"detector": str, "org": registry key, "model_hint": str,
     "url": str or None, "date_hint": "YYYY-MM-DD" or None, "title": str}

Detection is stateless: candidates are signals that do not correspond to any
published entry or pending candidate. The dataset is the state.
"""
