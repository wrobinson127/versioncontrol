"""Generate site/story.html: the story of the record, in the site's shell.

What is built here, from data/ at build time:
  - every sentence on the page that carries a number: the five step texts,
    the four findings, the text version ("The record in words") and the
    source line. They are approved wording with computed figures, so they
    must be rebuilt whenever the record changes (CI runs --check);
  - the four finding figures, as static SVG, so the findings read without
    script;
  - the page itself, in the shared shell (pipeline/site_shell.py).

What is drawn in the browser (site/js/story.js): the one canvas of release
marks that morphs through the hero and the five views as the reader
scrolls. It reads the same published files at load and adds no sentence of
its own beyond chart labels. Without script, or before it runs, the page is
the hero, the five step texts, the findings and the text version.

    python -m pipeline.build_story            # write site/story.html
    python -m pipeline.build_story --check    # fail if it has drifted
"""
import gzip
import json
import pathlib
import re
import statistics
import sys
from collections import defaultdict
from datetime import date

from pipeline import site_shell

ROOT = pathlib.Path(".")
OUT = ROOT / "site" / "story.html"

V = json.loads(gzip.decompress((ROOT / "data/derived/views.json.gz").read_bytes()))
tiles = V["tiles"]
# Rendered dates come from the data, never from a literal in this file: a
# constant here rebuilds identically every time and stays self-consistent
# while wrong, which --check cannot catch.
AS_OF = tiles["as_of"]
REG = ["openai", "anthropic", "google-deepmind", "meta", "xai", "mistral",
       "deepseek", "alibaba-qwen", "moonshot", "zai", "cohere", "amazon"]
NM = {"openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind",
      "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
      "alibaba-qwen": "Alibaba (Qwen)", "moonshot": "Moonshot AI", "zai": "Z.ai",
      "cohere": "Cohere", "amazon": "Amazon"}
ro = {o: i for i, o in enumerate(REG)}
# releases only: the disclosure matrix holds one row per release
rel = sorted(V["disclosure_matrix"]["rows"], key=lambda r: r["date"])
series = {f'{s["benchmark"]}|{s["source_class"]}': s for s in V["trajectory"]["series"]}
gpqa_pts = sorted(series["gpqa-diamond|INDEPENDENT"]["points"], key=lambda p: p["date"])
score_by_entry = {p["entry_id"]: p["value"] for p in gpqa_pts}
swe_pts = sorted(series["swe-bench-verified|INDEPENDENT"]["points"], key=lambda p: p["date"])
swe_by_entry = {p["entry_id"]: p["value"] for p in swe_pts}
# Three paper states, straight from the derived matrix: "disclosed",
# "not_disclosed" (a researched absence) and "not_researched" (our own gap,
# never in a denominator).
paper_state = {r["entry_id"]: r["cells"]["paper"] for r in V["disclosure_matrix"]["rows"]}
paper_by_entry = {k: v == "disclosed" for k, v in paper_state.items()}
paper_researched = {k: v != "not_researched" for k, v in paper_state.items()}
yearly = {y["year"]: y["releases"] for y in V["cadence"]["yearly"]}
BENCH_LABEL = {"gpqa-diamond": "GPQA Diamond", "swe-bench-verified": "SWE-Bench Verified"}

# ---- the entries: parameter counts, availability, provenance dates, pairs ----
param_by_entry = {}
avail_by_entry = {}
_epoch_models_rd = []   # sources of kind epoch_csv ("Data on AI models")
_epoch_bench_rd = []    # INDEPENDENT scores (Epoch's benchmarking data)
_pairs = {}
for yr in sorted(json.loads((ROOT / "data/manifest.json").read_text(encoding="utf-8"))["files"]):
    for e in json.loads(gzip.decompress((ROOT / yr).read_bytes())):
        param_by_entry[e["id"]] = e.get("parameters") not in (None, "NOT_DISCLOSED", "")
        avail_by_entry[e["id"]] = e.get("availability_class")
        for s in e.get("sources", []):
            if s.get("kind") == "epoch_csv" and s.get("retrieval_date"):
                _epoch_models_rd.append(s["retrieval_date"])
        bb = defaultdict(dict)
        for b in e.get("benchmarks", []):
            pv = b.get("provenance", {})
            if pv.get("source_class") == "INDEPENDENT" and pv.get("retrieval_date"):
                _epoch_bench_rd.append(pv["retrieval_date"])
            bb[b["benchmark"]][pv["source_class"]] = b
        for bench, d in bb.items():
            if "LAB_REPORTED" in d and "INDEPENDENT" in d:
                _pairs[(e["id"], bench)] = {
                    "model": e["model_name"], "date": e["date"], "bench": bench,
                    "lab": d["LAB_REPORTED"]["value"], "ind": d["INDEPENDENT"]["value"],
                    "labcfg": d["LAB_REPORTED"].get("configuration", ""),
                    "indcfg": d["INDEPENDENT"].get("configuration", "")}
PAIRS = sorted(_pairs.values(), key=lambda p: p["date"])

# The reasoning setting each side ran at, read from the configuration strings
# on record. Epoch's run ids end in the effort level ("_low", "_max"); the
# lab's configuration is prose, so only an explicit effort or thinking level
# is read from it. Anything else is shown as not stated, never guessed.
# site/js/app.js applies the same two rules in the browser.
_LVL = r"(xhigh|x-high|high|medium|low|max)"


def _lab_setting(cfg):
    c = (cfg or "").lower()
    m = (re.search(r"think " + _LVL, c) or re.search(_LVL + r" thinking", c)
         or re.search(r"effort (?:set to |of )?" + _LVL, c))
    if not m:
        return None, "not stated"
    lvl = m.group(1).replace("-", "")
    return lvl, f"{lvl} {'thinking' if 'think' in m.group(0) else 'effort'}"


def _ind_setting(cfg):
    m = re.search(r"_" + _LVL + r"$", (cfg or "").lower())
    if not m:
        return None, "not stated"
    lvl = m.group(1).replace("-", "")
    return lvl, f"{lvl} effort"


def _join_and(names):
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


# some releases are measured both ways on more than one benchmark, so the
# pair count can exceed the distinct-release count
n_pair_models = len(set(p["model"] for p in PAIRS))
for p in PAIRS:
    p["benchlabel"] = BENCH_LABEL.get(p["bench"], p["bench"])
    p["lab_lvl"], p["lab_set"] = _lab_setting(p["labcfg"])
    p["ind_lvl"], p["ind_set"] = _ind_setting(p["indcfg"])
SET_DIFF = [p for p in PAIRS if p["lab_lvl"] and p["ind_lvl"] and p["lab_lvl"] != p["ind_lvl"]]

# The source line names the date each Epoch dataset was retrieved. It comes
# from the entries' own retrieval dates, never from AS_OF: the derive date
# says when we computed, not when Epoch's rows were read.
RD_MODELS = max(_epoch_models_rd) if _epoch_models_rd else None
RD_BENCH = max(_epoch_bench_rd) if _epoch_bench_rd else None
if RD_MODELS and RD_MODELS == RD_BENCH:
    SOURCE_LINE = (f"Releases: Epoch AI, Data on AI models &#183; independent scores: "
                   f"Epoch AI, Capabilities &amp; benchmarking &#183; both retrieved <span class=\"nw\">{RD_MODELS}</span>")
else:
    SOURCE_LINE = (f"Releases: Epoch AI, Data on AI models, retrieved <span class=\"nw\">{RD_MODELS}</span> &#183; "
                   f"independent scores: Epoch AI, Capabilities &amp; benchmarking, retrieved <span class=\"nw\">{RD_BENCH}</span>")

NUMWORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven",
            8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen",
            14: "fourteen", 15: "fifteen", 16: "sixteen"}


def nword(n):
    return NUMWORDS.get(n, str(n))


N_LABS = len(REG)
SCOPE_T = f"Every release from {nword(N_LABS)} tracked labs since ChatGPT"


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


slots = ["2023", "2024", "2025", "2026"]
_rel_t = [r for r in rel if r["org"] in ro]

# hero line: the first and last complete years on record, read from the data
_hero_years = sorted(y for y in yearly if y != "2022" and y < AS_OF[:4])
_hero_first_y, _hero_last_y = _hero_years[0], _hero_years[-1]
_hero_first_n, _hero_last_n = yearly[_hero_first_y], yearly[_hero_last_y]

# ---- per-year share counts (paper researched-only; parameters of all) ----
byyr_n = defaultdict(int); byyr_pap = defaultdict(int); byyr_par = defaultdict(int); byyr_pap_res = defaultdict(int)
for r in _rel_t:
    y = r["date"][:4]; byyr_n[y] += 1
    if paper_researched.get(r["entry_id"]): byyr_pap_res[y] += 1
    if paper_by_entry.get(r["entry_id"]): byyr_pap[y] += 1
    if param_by_entry.get(r["entry_id"]): byyr_par[y] += 1

# highest independent GPQA Diamond score reached by the end of each year
_cap_run = 0.0; _cap_vals = []; _cap_by_y = {}
for y in slots:
    ys = [score_by_entry[r["entry_id"]] for r in _rel_t if r["date"][:4] <= y and r["entry_id"] in score_by_entry]
    if ys: _cap_run = max(ys)
    _cap_vals.append(round(_cap_run)); _cap_by_y[y] = _cap_run

swe_lo, swe_hi = round(swe_pts[0]["value"]), round(max(p["value"] for p in swe_pts))
n_swe = len(swe_pts)
n_scored = sum(1 for r in _rel_t if r["entry_id"] in score_by_entry)
_n_total = len(_rel_t)
gaps = [round(p["lab"] - p["ind"], 1) for p in PAIRS]
near = sum(1 for g in gaps if abs(g) <= 1)

# ---- the four labs with long records: waits and climbs ----
CASE_ORDER = ["openai", "anthropic", "google-deepmind", "alibaba-qwen"]
NMSHORT = {"openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind", "alibaba-qwen": "Qwen"}
_byorg = defaultdict(list)
for r in _rel_t:
    _byorg[r["org"]].append(r["date"])


def _waits(o):
    """Days between a lab's distinct release dates (same-day releases once)."""
    ds = sorted(set(_byorg.get(o, [])))
    return [(date.fromisoformat(ds[i]) - date.fromisoformat(ds[i - 1])).days for i in range(1, len(ds))]


def _med(v):
    m = statistics.median(v)
    return int(m) if float(m).is_integer() else round(m, 1)


def _accel_sentence(o):
    vals = _waits(o); n = len(vals)
    early = vals[:max(1, n // 3)]; late = vals[-max(1, n // 3):]
    return f"About {_med(early)} days between releases at first, about {_med(late)} lately."


ACCEL_COPY = {o: (NMSHORT[o], _accel_sentence(o)) for o in CASE_ORDER}


def _traj_sentence(o):
    rows = sorted((r["date"], score_by_entry[r["entry_id"]], r["model_name"], r["entry_id"])
                  for r in _rel_t if r["org"] == o and r["entry_id"] in score_by_entry)
    (d0, v0, m0, _), (d1, v1, m1, _) = rows[0], rows[-1]
    s = (f"First independent GPQA Diamond score on record: {v0} ({esc(m0)}, {d0[:4]}). "
         f"Latest: {v1} ({esc(m1)}, {d1[:4]}).")
    vmax, mmax = max((v, m) for _, v, m, _ in rows)
    if vmax != v1:
        s += f" Highest: {vmax} ({esc(mmax)})."
    n_open = sum(1 for *_, eid in rows if avail_by_entry.get(eid) == "open_weights")
    if n_open:
        s += f" {n_open} of these {len(rows)} scored releases {'has' if n_open == 1 else 'have'} open weights."
    return s


TRAJ_COPY = {o: (NMSHORT[o], _traj_sentence(o)) for o in CASE_ORDER}

swe_org_vals = defaultdict(list)
for r in _rel_t:
    if r["entry_id"] in swe_by_entry:
        swe_org_vals[r["org"]].append((r["date"], swe_by_entry[r["entry_id"]]))
for o in swe_org_vals:
    swe_org_vals[o].sort()
# n >= 3 reads as a trajectory; n == 2 is stated as two scores, not a trend
SWE_CASE_ORDER = [o for o in ["openai", "anthropic", "google-deepmind"] if len(swe_org_vals[o]) >= 2]


def _swe_copy(o):
    vals = swe_org_vals[o]; first = round(vals[0][1]); last = round(vals[-1][1]); n = len(vals)
    if n >= 3:
        return f"On SWE-Bench Verified, {NMSHORT[o]}'s independent score moves from {first} to {last} across {n} releases on record."
    return f"On SWE-Bench Verified, {NMSHORT[o]} has two independent scores on record, months apart: {first}, then {last}."


SWE_CLIMB_COPY = {o: (NMSHORT[o], _swe_copy(o)) for o in SWE_CASE_ORDER}

# ---- per-year notes: labs active, first appearances, median gap, busiest week ----
traj_yr_vals = defaultdict(list)
for r in _rel_t:
    if r["entry_id"] in score_by_entry:
        traj_yr_vals[r["date"][:4]].append(score_by_entry[r["entry_id"]])


def _tmax(y): return round(max(traj_yr_vals[y])) if traj_yr_vals.get(y) else 0
def _tn(y): return len(traj_yr_vals.get(y, []))


_labs_by_y = defaultdict(set); _first_y = {}
for r in _rel_t:
    _labs_by_y[r["date"][:4]].add(r["org"])
    _first_y.setdefault(r["org"], r["date"][:4])
_dates_all = sorted(r["date"] for r in _rel_t)
_gaps_by_y = defaultdict(list)
for _a, _b in zip(_dates_all, _dates_all[1:]):
    _gaps_by_y[_b[:4]].append((date.fromisoformat(_b) - date.fromisoformat(_a)).days)


def _median(v):
    v = sorted(v); n = len(v)
    if not n: return None
    m = v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2
    return int(m) if float(m).is_integer() else m


MEDGAP = {y: _median(v) for y, v in _gaps_by_y.items()}


def _busiest_week(y):
    wk = defaultdict(int)
    for d in _dates_all:
        if d[:4] == y:
            iso = date.fromisoformat(d).isocalendar(); wk[(iso[0], iso[1])] += 1
    return max(wk.values()) if wk else 0


def _list_names(orgs):
    names = [NM[o] for o in REG if o in orgs]
    if len(names) <= 1: return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def _pulse_note(y):
    n_labs = len(_labs_by_y.get(y, ()))
    s = (f"All {nword(N_LABS)} tracked labs released at least one model." if n_labs == N_LABS
         else f"{n_labs} of the {nword(N_LABS)} tracked labs released at least one model.")
    new = [o for o, fy in _first_y.items() if fy == y]
    if new and y > slots[0]:
        s += f" First on record this year: {_list_names(new)}."
    if MEDGAP.get(y) is not None:
        s += f" Median time between one release and the next: {MEDGAP[y]} days."
    bw = _busiest_week(y)
    if bw > 1:
        s += f" The busiest week brought {bw} releases."
    return s


# the partial current year is set against the same span of the year before
_cur_y = AS_OF[:4]; _prev_y = str(int(_cur_y) - 1)
_cur_n = sum(1 for d in _dates_all if d[:4] == _cur_y and d <= AS_OF)
_prev_cut = f"{_prev_y}{AS_OF[4:]}" if AS_OF[5:] != "02-29" else f"{_prev_y}-02-28"
_prev_n = sum(1 for d in _dates_all if d[:4] == _prev_y and d <= _prev_cut)
_PARTIAL_NOTE = (f"A partial year: {_cur_n} releases by {AS_OF}. By the same date in {_prev_y} "
                 f"there were {_prev_n}.")
PULSE_NOTES = [
    ("2023", f'2023 &#183; {yearly["2023"]} releases', "The first full year after ChatGPT. " + _pulse_note("2023")),
    ("2024", f'2024 &#183; {yearly["2024"]} releases', _pulse_note("2024")),
    ("2025", f'2025 &#183; {yearly["2025"]} releases', _pulse_note("2025")),
    ("2026", f'2026 &#183; {yearly["2026"]} so far', _PARTIAL_NOTE + " " + _pulse_note("2026")),
]
TRAJ_NOTES = [
    ("2023", "2023", f"The first {_tn('2023')} independent scores on record; the highest is {_tmax('2023')} on GPQA Diamond."),
    ("2024", "2024", f"{_tn('2024')} scored this year; the highest is {_tmax('2024')}."),
    ("2025", "2025", f"{_tn('2025')} scored this year; the highest is {_tmax('2025')}."),
    ("2026", "2026", f"{_tn('2026')} scored so far; the highest is {_tmax('2026')}."),
]

# ---- disclosure shares: every share states its denominator ----
def _paperpct(y): return round(100 * byyr_pap[y] / byyr_pap_res[y]) if byyr_pap_res[y] else 0
def _parampct(y): return round(100 * byyr_par[y] / byyr_n[y]) if byyr_n[y] else 0


_D0, _D1 = slots[0], slots[-1]
_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
           "September", "October", "November", "December"]


def _skew(art):
    """When the checked rows of the latest year lean toward its newest months,
    the share leans on them, and the copy says so."""
    ys = sorted(r["date"] for r in V["disclosure_matrix"]["rows"] if r["org"] in ro and r["date"][:4] == _D1)
    if not ys: return None
    lm = int(ys[-1][5:7]); cm = max(1, lm - 1)
    cut = f"{_D1}-{cm:02d}-01"
    res = [r["date"] for r in V["disclosure_matrix"]["rows"]
           if r["org"] in ro and r["date"][:4] == _D1 and r["cells"].get(art, "not_researched") != "not_researched"]
    if not res: return None
    k = sum(1 for d in res if d >= cut); m = sum(1 for d in ys if d >= cut)
    return (k, len(res), m, len(ys), _MONTHS[cm - 1]) if k / len(res) > m / len(ys) else None


_SKEW_PAPER = _skew("paper"); _SKEW_SC = _skew("system_card")


def _skew_sentence(sk, what):
    k, n, m, N, mon = sk
    return (f" In {_D1}, {k} of the {n} checked releases are from {mon} or later, a period that holds "
            f"{m} of the year's {N} releases. The checked releases lean toward the newest ones, so {what} "
            f"may move as earlier {_D1} releases are checked.")


DPAPER_NOTE = (f"In {_D0}, {byyr_pap[_D0]} of {byyr_pap_res[_D0]} researched releases had a paper on record "
               f"({_paperpct(_D0)}%). In {_D1} so far, {byyr_pap[_D1]} of {byyr_pap_res[_D1]} "
               f"({_paperpct(_D1)}%). Papers can come out weeks after a release, so recent years may rise."
               + (_skew_sentence(_SKEW_PAPER, "the share") if _SKEW_PAPER else ""))
DPARAM_NOTE = (f"In {_D0}, {byyr_par[_D0]} of {byyr_n[_D0]} releases had a parameter count in Epoch AI's data "
               f"({_parampct(_D0)}%). In {_D1} so far, {byyr_par[_D1]} of {byyr_n[_D1]} ({_parampct(_D1)}%). "
               f"Epoch often adds counts for recent models late, and we have not checked the blanks against the labs' own pages.")
_sc_dis = defaultdict(int); _sc_res = defaultdict(int)
for r in V["disclosure_matrix"]["rows"]:
    if r["org"] not in ro: continue
    st = r["cells"].get("system_card", "not_researched")
    if st == "not_researched": continue
    _sc_res[r["date"][:4]] += 1
    if st == "disclosed": _sc_dis[r["date"][:4]] += 1


def _scpct(y): return round(100 * _sc_dis[y] / _sc_res[y]) if _sc_res[y] else 0
def _moved(a, b): return "rose" if b > a else ("fell" if b < a else "held")


_PAPER_DIR = _moved(_paperpct(_D0), _paperpct(_D1))
_PARAM_DIR = _moved(_parampct(_D0), _parampct(_D1))
_SC_DIR = _moved(_scpct(_D0), _scpct(_D1))
_DPAPER_T = {"fell": "Fewer arrive with a paper", "rose": "More arrive with a paper"}.get(_PAPER_DIR, "Releases with a paper")
_DPARAM_T = {"fell": "And fewer have a parameter count on record", "rose": "And more have a parameter count on record"}.get(_PARAM_DIR, "And a parameter count on record")
CLOSE_NOTE = (f"From {_D0} to {_D1}, the highest independent GPQA Diamond score {_moved(_cap_vals[0], _cap_vals[-1])} "
              f"from {_cap_vals[0]} to {_cap_vals[-1]}. The share of researched releases with a paper {_PAPER_DIR} "
              f"from {_paperpct(_D0)}% to {_paperpct(_D1)}%, and the share with a parameter count in Epoch AI's data "
              f"{_PARAM_DIR} from {_parampct(_D0)}% to {_parampct(_D1)}%. The share with a system card "
              f"{_SC_DIR} from {_scpct(_D0)}% to {_scpct(_D1)}% ({_sc_dis[_D0]} of {_sc_res[_D0]}, then "
              f"{_sc_dis[_D1]} of {_sc_res[_D1]})."
              + (_skew_sentence(_SKEW_PAPER or _SKEW_SC, f"these {_D1} shares") if (_SKEW_PAPER or _SKEW_SC) else ""))
_cap_dir = _moved(_cap_vals[0], _cap_vals[-1])
if _PAPER_DIR == "fell" and _PARAM_DIR == "fell":
    _c2 = "Fewer releases came with a paper or a parameter count on record."
else:
    _c2 = f"The share with a paper {_PAPER_DIR}; the share with a parameter count on record {_PARAM_DIR}."
_c3 = "More came with a system card." if _SC_DIR == "rose" else f"The share with a system card {_SC_DIR}."
CLOSE_SHORT = f"Independent scores {_cap_dir}. {_c2} {_c3}"
DIV_NOTE = (f"{near} of the {len(PAIRS)} pairs sit within a single point, and the gaps run both ways. "
            + (f"In {nword(len(SET_DIFF))} of the {nword(len(PAIRS))} pairs ({_join_and([esc(p['model']) for p in SET_DIFF])}) "
               f"the lab and Epoch ran different reasoning settings, so those gaps include a settings difference. "
               if SET_DIFF else "")
            + f"These {nword(len(PAIRS))} pairs come from recent major releases, and the lab and Epoch often run "
              f"different settings (reasoning effort, number of attempts). With so few pairs this is not a test "
              f"of whether labs overstate. The record keeps both numbers and never averages them.")
PAIRS_LEAD = (f"{n_pair_models} releases were graded twice on the same benchmark: once by the releasing lab, "
              f"once by Epoch. ")
SWE_NOTE = (f"On a second benchmark, SWE-Bench Verified (fixing real GitHub issues), the top score rose from "
            f"{swe_lo} to {swe_hi} over the same years. Epoch measured these too.")
_case_n = {o: sum(1 for r in _rel_t if r["org"] == o) for o in CASE_ORDER}
_case_s = {o: sum(1 for r in _rel_t if r["org"] == o and r["entry_id"] in score_by_entry) for o in CASE_ORDER}
WHY_FOUR = ("Four labs with long records and many independent scores: "
            + ", ".join(f"{NMSHORT[o]} ({_case_n[o]} releases, {_case_s[o]} scored)" for o in CASE_ORDER) + ".")
WAIT_RULE = ("Days between one release and the next, for this lab alone. \"At first\" is the median of its first "
             "third of gaps on record; \"lately\" is the median of its last third.")
TRAJ_TEACH = (f"The same marks rise to their GPQA Diamond score, measured by Epoch, not the lab. Of {_n_total}, "
              f"the {n_scored} with an independent score rise; the rest have none on record.")

# refused comparisons against the predecessor, from the derived file
DELTAS = json.loads(gzip.decompress((ROOT / "data/derived/deltas.json.gz").read_bytes()))
_names = {r["entry_id"]: r["model_name"] for r in V["disclosure_matrix"]["rows"]}
REFUSED = sorted(((eid, it["reason"]) for eid, items in DELTAS.items() for it in items
                  if it.get("kind") == "REFUSED_COMPARISON"), key=lambda x: x[0])

# ---------------------------------------------------------------------------
# Markup helpers
# ---------------------------------------------------------------------------


def _nfb(h, b):
    return f'<div class="nfb"><h3>{h}</h3><p>{b}</p></div>'


def _table(caption, head, rows, num_cols=None):
    """A plain table; num_cols are the right-aligned figure columns (default: all but the first)."""
    num = set(range(1, len(head))) if num_cols is None else set(num_cols)
    th = "".join(f'<th scope="col"{NUMC if i in num else ""}>{h}</th>' for i, h in enumerate(head))
    body = ""
    for r in rows:
        body += "<tr>" + "".join((f'<th scope="row">{c}</th>' if i == 0 else f'<td{NUMC if i in num else ""}>{c}</td>')
                                 for i, c in enumerate(r)) + "</tr>"
    return f'<table class="dt"><caption>{caption}</caption><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>'


NUMC = ' class="n"'


def _details(summary, inner):
    return f'<details class="sd"><summary>{summary}</summary>{inner}</details>'


def _svg(w, h, label, inner, cls="fig-svg"):
    return (f'<svg class="{cls}" viewBox="0 0 {w} {h}" role="img" aria-label="{esc(label)}">'
            f"{inner}</svg>")


# ---------------------------------------------------------------------------
# The five steps (text a reader meets beside the chart; static, so it reads
# without script)
# ---------------------------------------------------------------------------

_yearly_rows = [[y["year"], str(y["releases"]), str(y["revisions"])] for y in V["cadence"]["yearly"]]
STEP1 = ("<p>Each column stacks one calendar year of releases, one mark each.</p>"
         f"<p>{yearly['2023']} releases in 2023, {yearly['2025']} in 2025. Pooled across the {nword(N_LABS)} labs, the median "
         f"time between one release and the next was {MEDGAP['2023']} days in 2023, {MEDGAP['2024']} in 2024 and {MEDGAP['2025']} in 2025.</p>"
         f"<p>{_PARTIAL_NOTE}</p>"
         + _details("Year by year", "".join(f'<p class="sd-p"><b>{h}.</b> {b}</p>' for _, h, b in PULSE_NOTES)
                    + _table("Releases and revisions per year. Revisions are counted apart.", ["Year", "Releases", "Revisions"], _yearly_rows)))

_DISC_SLOTS = [("system_card", "System card"), ("model_card", "Model card"), ("usage_policy", "Usage policy"), ("paper", "Paper")]
_lab_disc_rows = []
for o in REG:
    row = [esc(NM[o])]
    for k, _ in _DISC_SLOTS:
        d = nd = nr = 0
        for r in rel:
            if r["org"] != o: continue
            st = r["cells"].get(k, "not_researched")
            if st == "disclosed": d += 1
            elif st == "not_disclosed": nd += 1
            else: nr += 1
        row.append(f"{d} / {nd} / {nr}")
    _lab_disc_rows.append(row)
STEP2 = ("<p>Each release splits into four cells: system card, model card, usage policy and paper. "
         "A filled square is a link on record; an empty square, we checked and found none; a short dash, not yet researched.</p>"
         "<p>\"Not disclosed\" is a fact about the lab. \"Not yet researched\" is work we have not done.</p>"
         f'<p><b>{_DPAPER_T}.</b> {DPAPER_NOTE}</p>'
         + _details("The numbers: on record / not disclosed / not yet researched",
                    _table("Releases per lab, by document. Labs are listed in registry order.", ["Lab"] + [s[1] for s in _DISC_SLOTS], _lab_disc_rows, num_cols=())))

_traj_rows = [[y, str(_tn(y)), str(_tmax(y)) if _tn(y) else "none"] for y in slots]
STEP3 = (f"<p>{TRAJ_TEACH}</p>"
         f"<p>The line is the highest score reached so far. A missing score is not a zero: releases with none sit below the axis.</p>"
         f"<p>{SWE_NOTE}</p>"
         + _details("Year by year", "".join(f'<p class="sd-p"><b>{h}.</b> {b}</p>' for _, h, b in TRAJ_NOTES)
                    + "".join(f'<p class="sd-p"><b>{TRAJ_COPY[o][0]}.</b> {TRAJ_COPY[o][1]}</p>' for o in CASE_ORDER)))

_pair_rows = [[esc(p["model"]), p["benchlabel"], str(p["lab"]), str(p["ind"]), esc(p["lab_set"]), esc(p["ind_set"])] for p in PAIRS]
STEP4 = ("<p>Each row is one release scored twice on one benchmark: the open diamond is the lab's own number, tagged LAB; "
         "the filled dot is Epoch's measurement, tagged IND.</p>"
         f"<p>{PAIRS_LEAD}{DIV_NOTE}</p>"
         + _details("The numbers, with settings as written",
                    '<div class="sd-scroll">' + _table("Lab-reported and independent scores on the same release and benchmark.",
                           ["Release", "Benchmark", "LAB", "IND", "Lab setting", "Epoch setting"], _pair_rows, num_cols=(2, 3)) + "</div>"))

STEP5 = ("<p>Every release again, split by lab and stacked by quarter, on one time axis and one scale. "
         "Labs are listed in registry order.</p>"
         "<p>Because ByteDance, Tencent and Baidu are not tracked, the record cannot support a comparison between countries.</p>"
         + _details("The wait between releases, for four labs",
                    f'<p class="sd-p">{WHY_FOUR} {WAIT_RULE}</p>'
                    + "".join(f'<p class="sd-p"><b>{ACCEL_COPY[o][0]}.</b> {ACCEL_COPY[o][1]}</p>' for o in CASE_ORDER)))

STEPS = [
    ("The pace, year by year", STEP1),
    ("What each lab published", STEP2),
    ("Benchmark scores, independently measured", STEP3),
    ("What the lab said, beside what Epoch measured", STEP4),
    ("Twelve labs, one time axis", STEP5),
]

# ---------------------------------------------------------------------------
# The four findings, each with a static figure drawn from the same numbers
# ---------------------------------------------------------------------------


def _fig_cadence():
    w, h, base, top = 320, 150, 118, 22
    mx = max(yearly[y] for y in slots)
    slot = w / len(slots); bw = slot * 0.56
    s = ""
    for i, y in enumerate(slots):
        v = yearly[y]; bh = (base - top) * v / mx; x = i * slot + (slot - bw) / 2
        part = y == _cur_y
        s += (f'<rect x="{x:.1f}" y="{base - bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="2" class="{"f-bar-part" if part else "f-bar"}"/>'
              f'<text x="{x + bw / 2:.1f}" y="{base - bh - 7:.1f}" text-anchor="middle" class="f-v">{v}</text>'
              f'<text x="{x + bw / 2:.1f}" y="{base + 18}" text-anchor="middle" class="f-ax">{y + (", so far" if part else "")}</text>')
        if y == _cur_y:
            ly = base - (base - top) * _prev_n / mx
            s += (f'<line x1="{x - 6:.1f}" x2="{x + bw + 6:.1f}" y1="{ly:.1f}" y2="{ly:.1f}" class="f-mark"/>')
    s += f'<line x1="0" x2="{w}" y1="{base + 0.5}" y2="{base + 0.5}" class="f-base"/>'
    label = ("Releases per year: " + ", ".join(f"{yearly[y]} in {y}" for y in slots)
             + f" ({_cur_y} so far). The rule across {_cur_y} marks {_prev_n}, the count by the same date in {_prev_y}.")
    return _svg(w, h, label, s)


def _fig_scores():
    w, h, l, r, t, b = 320, 150, 26, 8, 10, 126
    d0 = date.fromisoformat(gpqa_pts[0]["date"]); d1 = date.fromisoformat(AS_OF)
    sx = lambda d: l + (w - l - r) * (date.fromisoformat(d) - d0).days / max(1, (d1 - d0).days)
    sy = lambda v: b - (b - t) * v / 100
    s = ""
    for v in (0, 50, 100):
        s += f'<line x1="{l}" x2="{w - r}" y1="{sy(v):.1f}" y2="{sy(v):.1f}" class="{"f-base" if v == 0 else "f-grid"}"/><text x="{l - 6}" y="{sy(v) + 4:.1f}" text-anchor="end" class="f-ax">{v}</text>'
    for y in slots:
        if f"{y}-01-01" > gpqa_pts[0]["date"]:
            s += f'<text x="{sx(y + "-01-01"):.1f}" y="{b + 18}" text-anchor="middle" class="f-ax">{y}</text>'

    def step(pts, cls):
        run = -1.0; d = ""
        for p in pts:
            if p["date"] < gpqa_pts[0]["date"]: continue
            if p["value"] > run:
                d += (f"M{sx(p['date']):.1f} {sy(p['value']):.1f}" if run < 0 else f"H{sx(p['date']):.1f}V{sy(p['value']):.1f}")
                run = p["value"]
        d += f"H{w - r}"
        return f'<path d="{d}" class="{cls}"/>'
    s += step(gpqa_pts, "f-ind") + step(swe_pts, "f-ind f-ind-2")
    s += f'<text x="{w - r}" y="{sy(_cap_vals[-1]) - 6:.1f}" text-anchor="end" class="f-lab">GPQA Diamond</text>'
    s += f'<text x="{w - r}" y="{sy(swe_hi) + 15:.1f}" text-anchor="end" class="f-lab">SWE-Bench Verified</text>'
    label = (f"The highest independent score so far, by date: GPQA Diamond from {_cap_vals[0]} to {_cap_vals[-1]}, "
             f"SWE-Bench Verified from {swe_lo} to {swe_hi}. Both measured by Epoch AI.")
    return _svg(w, h, label, s)


def _fig_pairs():
    rowh = 22; w = 320; t = 8; h = t + rowh * len(PAIRS) + 22
    vals = [v for p in PAIRS for v in (p["lab"], p["ind"])]
    lo = int(min(vals) // 10 * 10); l = 128; r = 10
    sx = lambda v: l + (w - l - r) * (v - lo) / (100 - lo)
    s = ""
    for v in range(lo, 101, 10):
        s += f'<line x1="{sx(v):.1f}" x2="{sx(v):.1f}" y1="{t}" y2="{t + rowh * len(PAIRS)}" class="f-grid"/>'
        if v in (lo, 100) or v % 20 == 0:
            s += f'<text x="{sx(v):.1f}" y="{t + rowh * len(PAIRS) + 15}" text-anchor="middle" class="f-ax">{v}</text>'
    for i, p in enumerate(PAIRS):
        y = t + rowh * i + rowh / 2
        name = p["model"] + (" (SWE)" if p["bench"] == "swe-bench-verified" else "")
        a, bx = sx(p["ind"]), sx(p["lab"])
        s += (f'<text x="0" y="{y + 4:.1f}" class="f-name">{esc(name)}</text>'
              f'<line x1="{min(a, bx):.1f}" x2="{max(a, bx):.1f}" y1="{y:.1f}" y2="{y:.1f}" class="f-link"/>'
              f'<circle cx="{a:.1f}" cy="{y:.1f}" r="4.2" class="f-dot-ind"/>'
              f'<path d="M{bx:.1f} {y - 5:.1f}l5 5l-5 5l-5 -5Z" class="f-dot-lab"/>')
    label = (f"{len(PAIRS)} pairs, each a release scored by its lab (LAB) and by Epoch (IND): "
             + "; ".join(f"{p['model']}, {p['benchlabel']}: LAB {p['lab']}, IND {p['ind']}" for p in PAIRS)
             + f". The axis starts at {lo}.")
    return _svg(w, h, label, s)


def _fig_disclosure():
    w, rowh, l, r, t = 320, 30, 104, 34, 6
    items = [("Paper", _paperpct(_D0), _paperpct(_D1)),
             ("Parameter count", _parampct(_D0), _parampct(_D1)),
             ("System card", _scpct(_D0), _scpct(_D1))]
    h = t + rowh * len(items) + 30
    sx = lambda v: l + (w - l - r) * v / 100
    s = ""
    for v in (0, 50, 100):
        s += (f'<line x1="{sx(v):.1f}" x2="{sx(v):.1f}" y1="{t}" y2="{t + rowh * len(items)}" class="f-grid"/>'
              f'<text x="{sx(v):.1f}" y="{t + rowh * len(items) + 14}" text-anchor="middle" class="f-ax">{v}%</text>')
    for i, (name, a, b) in enumerate(items):
        y = t + rowh * i + rowh / 2
        s += (f'<text x="0" y="{y + 4:.1f}" class="f-name">{name}</text>'
              f'<line x1="{sx(min(a, b)):.1f}" x2="{sx(max(a, b)):.1f}" y1="{y:.1f}" y2="{y:.1f}" class="f-link"/>'
              f'<circle cx="{sx(a):.1f}" cy="{y:.1f}" r="4.2" class="f-dot-0"/>'
              f'<circle cx="{sx(b):.1f}" cy="{y:.1f}" r="4.2" class="f-dot-1"/>')
    s += (f'<circle cx="{l + 4}" cy="{h - 6}" r="4" class="f-dot-0"/><text x="{l + 12}" y="{h - 2}" class="f-ax">{_D0}</text>'
          f'<circle cx="{l + 64}" cy="{h - 6}" r="4" class="f-dot-1"/><text x="{l + 72}" y="{h - 2}" class="f-ax">{_D1} so far</text>')
    label = (f"Shares in {_D0} and {_D1}: paper {_paperpct(_D0)}% then {_paperpct(_D1)}% of researched releases; "
             f"parameter count {_parampct(_D0)}% then {_parampct(_D1)}% of all releases; "
             f"system card {_scpct(_D0)}% then {_scpct(_D1)}% of researched releases.")
    return _svg(w, h, label, s)


FINDINGS = [
    ("Cadence", f"{yearly['2023']} releases in 2023, {yearly['2025']} in 2025. Pooled across the {nword(N_LABS)} labs, the median time between one release and the next was {MEDGAP['2023']} days in 2023, {MEDGAP['2024']} in 2024 and {MEDGAP['2025']} in 2025.", _fig_cadence()),
    ("Independent scores", f"The highest independent GPQA Diamond score went from {_cap_vals[0]} to {_cap_vals[-1]}; SWE-Bench Verified from {swe_lo} to {swe_hi}. Every figure measured by Epoch.", _fig_scores()),
    ("Lab beside independent", f"{n_pair_models} releases were graded both ways, giving {len(PAIRS)} pairs; {near} fall within a single point. That is too few pairs, run at different settings, to test whether labs overstate. Both numbers are kept, neither is averaged.", _fig_pairs()),
    ("Disclosure", f"With a paper on record: {byyr_pap[_D0]} of {byyr_pap_res[_D0]} researched releases in {_D0} ({_paperpct(_D0)}%), {byyr_pap[_D1]} of {byyr_pap_res[_D1]} in {_D1} so far ({_paperpct(_D1)}%). With a parameter count in Epoch AI's data: {_parampct(_D0)}%, then {_parampct(_D1)}%. With a system card: {_sc_dis[_D0]} of {_sc_res[_D0]} ({_scpct(_D0)}%), then {_sc_dis[_D1]} of {_sc_res[_D1]} ({_scpct(_D1)}%)." + (_skew_sentence(_SKEW_PAPER or _SKEW_SC, f"the {_D1} shares") if (_SKEW_PAPER or _SKEW_SC) else ""), _fig_disclosure()),
]

# ---------------------------------------------------------------------------
# The text version: every view in words (also what a reader without script
# or a screen reader gets in full)
# ---------------------------------------------------------------------------

FALLBACK = ("".join(_nfb(h, b) for (_, h, b) in PULSE_NOTES)
            + "".join(_nfb(f"{ACCEL_COPY[o][0]}: the wait between releases", ACCEL_COPY[o][1]) for o in CASE_ORDER)
            + "".join(_nfb(h, b) for (_, h, b) in TRAJ_NOTES)
            + "".join(_nfb(f"{TRAJ_COPY[o][0]}: the independent climb", TRAJ_COPY[o][1]) for o in CASE_ORDER)
            + _nfb("A second benchmark", SWE_NOTE)
            + "".join(_nfb(f"{SWE_CLIMB_COPY[o][0]}: on SWE-Bench", SWE_CLIMB_COPY[o][1]) for o in SWE_CASE_ORDER)
            + _nfb("What the lab said, beside what Epoch measured", PAIRS_LEAD + DIV_NOTE)
            + _nfb(_DPAPER_T, DPAPER_NOTE) + _nfb(_DPARAM_T, DPARAM_NOTE)
            + _nfb(f"What changed, {_D0} to {_D1}", CLOSE_NOTE))

# ---------------------------------------------------------------------------
# The page
# ---------------------------------------------------------------------------

_steps_html = "".join(
    f'<article class="step" data-step="{i}" aria-labelledby="s{i}h"><h2 id="s{i}h">{t}</h2><div class="sb">{b}</div></article>\n'
    for i, (t, b) in enumerate(STEPS, 1))
_find_html = "".join(
    f'<article class="find panel" data-ui><h3>{t}</h3><p>{p}</p><figure class="fig">{fig}</figure></article>\n'
    for t, p, fig in FINDINGS)
_refused_html = "".join(
    f'<li><a href="explorer.html?id={esc(eid)}">{esc(_names.get(eid, eid))}</a> <span class="t-m">{esc(reason)}</span></li>'
    for eid, reason in REFUSED)

MAIN = f"""<main id="main" class="story" tabindex="-1">
<section class="scrolly" aria-labelledby="hed">
<div class="graphic" id="graphic" data-ui>
<svg class="ov ovb" id="ovb" aria-hidden="true" focusable="false"></svg>
<canvas id="cv" aria-hidden="true"></canvas>
<svg class="ov" id="ov" aria-hidden="true" focusable="false"></svg>
<div class="hit" id="hit" tabindex="0" role="application" aria-roledescription="chart" aria-label="The chart of every release on record. The arrow keys move between marks and read each record; Enter opens it in the explorer." aria-describedby="live" hidden></div>
<div class="stip" id="tip" aria-hidden="true"></div>
<p class="g-src" id="gsrc">{SOURCE_LINE}</p>
</div>
<div class="steps">
<header class="hero-step" data-step="0">
<div class="hero-text" id="hero-text">
<h1 class="hero-head" id="hed">A public registry of AI model releases.</h1>
<p class="hero-count">From {_hero_first_n} in {_hero_first_y} to {_hero_last_n} in {_hero_last_y}.</p>
<p class="hero-dek"><b>{SCOPE_T}.</b> One mark = one model release, placed by lab (down the side) and by date (across). The record opens at ChatGPT's launch: {tiles["releases_recorded"]} releases in all, ChatGPT included.</p>
<p class="hero-act"><a class="btn btn-primary" href="#findings">Skip to the findings</a><a class="btn" href="#text-version">Read it as text</a></p>
</div>
</header>
{_steps_html}</div>
<div class="live sr" id="live" aria-live="polite"></div>
</section>

<section class="sfind" id="findings" aria-labelledby="fh">
<header class="sfind-h"><h2 id="fh">What the record shows, in four findings</h2>
<p class="sfind-lead">{CLOSE_SHORT}</p>
<p class="sfind-note">{CLOSE_NOTE}</p></header>
<div class="find-grid">
{_find_html}</div>
<div class="panel refusals-p"><h3>Refused comparisons</h3><p class="t-m">A change against the previous model appears only when both scores are on the same benchmark, the same version of it, and from the same kind of source. {len(REFUSED)} comparisons are refused on the record:</p><ul class="refusals">{_refused_html}</ul></div>
</section>

<details class="textver" id="text-version" open>
<summary><span class="tv-h">The record in words</span><span class="t-m">Every view above, as text</span></summary>
<section class="nfallback" aria-label="The record in words"><p>A text version of each view above. For every entry as a filterable list with its sources, see <a href="explorer.html">the explorer</a>.</p>{FALLBACK}</section>
</details>

<section class="sclose" aria-labelledby="ch">
<p class="endstance"><b>The record is public.</b> Each night it checks its sources and drafts new entries, and a person approves each one before it appears. Every number shows where it came from, or it is left out.</p>
<h2 class="readmore-h" id="ch">The full record, its rules and who keeps it</h2>
<div class="enddoors">
<a class="enddoor" href="explorer.html"><b>Explorer</b><span>every entry, filterable</span></a>
<a class="enddoor" href="methodology.html"><b>Methodology</b><span>the rules every number follows</span></a>
<a class="enddoor" href="about.html"><b>About</b><span>what this is, and who keeps it</span></a>
<a class="enddoor" href="data.html"><b>Data</b><span>download the dataset, CC-BY 4.0</span></a>
</div>
<p class="protonote">Parameter counts come from Epoch AI's data, and a few are Epoch's own estimates, which the record does not yet mark. Data current as of {AS_OF}.</p>
</section>
</main>
"""

GSAP = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" integrity="sha512-7eHRwcbYkK4d9g/6tD/mhkf++eoTHwpNM9woBxtPUBWm67zeAfFC+HrdoE2GanKeocly/VxeLvIqwvCdk7qScg==" crossorigin="anonymous" referrerpolicy="no-referrer" defer></script>\n'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" integrity="sha512-onMTRKJBKz8M1TnqqDuGBlowlH0ohFzMXYRNebz+yOcc5TQr/zAKsthzhuv0hiyUKEiQEQXEynnXCvNTOk50dg==" crossorigin="anonymous" referrerpolicy="no-referrer" defer></script>\n')

HTML = site_shell.page(
    "story.html", "Version Control: the story of the record",
    f"{SCOPE_T}: the pace of releases, what each lab published, independent scores, and the lab's number beside Epoch's, in five views and four findings.",
    "pg-story", MAIN, ("app.js", "story.js"), extra_head=GSAP, skip="Skip to the findings")
HTML = HTML.replace('<a class="skip" href="#main">Skip to the findings</a>', '<a class="skip" href="#findings">Skip to the findings</a>', 1)
_STATS = f"marks={_n_total} scored={n_scored} pairs={len(PAIRS)}"


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    # --check regenerates into memory and compares, so CI fails on a story
    # page that has drifted from the record it describes: every figure here
    # is read from data/ at build time, and a page of stale numbers is the
    # exact failure this project exists to point at.
    if "--check" in argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != HTML:
            print(f"STORY DRIFT: {OUT} does not match a rebuild from the current "
                  f"data ({_STATS}). Run: python -m pipeline.build_story")
            return 1
        print(f"story.html is current ({_STATS})")
        return 0
    OUT.write_text(HTML, encoding="utf-8", newline="\n")
    print("wrote", OUT, f"({len(HTML)} bytes) | {_STATS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
