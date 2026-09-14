"""VERSION CONTROL: single transforming canvas, full sequence (R-CANVAS).

ONE persistent SVG. The 281 release marks are the SAME DOM elements through
every beat; they re-fly, re-sort and re-form on the same canvas (BUILD-not-
SWAP, craft standard rule 2). Beats:
  1 PULSE      marks by org x date (the release timeline)
  2 TRAJECTORY the scored marks rise to their independent GPQA score; a
               frontier line draws; the rest park. hover a mark -> its whole
               company lights, the rest dim (neutral, no per-org hue: R-#9)
  3 DIVERGENCE the credential beat (R-DIVERGENCE / B5): release marks recede
               to a faint band; 4 lab-vs-independent dumbbells build centre-
               stage with the caption-law sentence and n stated honestly
  4 DISCLOSURE the same marks re-gather into per-year ISOTYPE waffles; filled =
               disclosed, hollow = not. two movements: paper decline, then the
               R-PARAM-confirmed parameter decline
Country grouping is an EXPLORER/METHODOLOGY facet, not a beat (R-COUNTRY).
Compute-disclosure dropped (R-A1). Fallbacks first: static/no-JS = pulse,
reduced-motion = instant. Caption law on every hover; four-ink colour law held
(green = data, no per-org hue, annotation blue outline-only).
"""
import gzip, json, pathlib, math, sys
from datetime import date
from collections import defaultdict

ROOT = pathlib.Path(".")
V = json.loads(gzip.decompress((ROOT / "data/derived/views.json.gz").read_bytes()))
tiles = V["tiles"]
# Rendered dates come from the data. Three were hardcoded to 2026-07-16 and
# survived the 2026-08-24 capture refresh, including a "retrieved" line,
# which states provenance and so must never be a stale literal. --check
# cannot catch this class on its own: a constant inside the generator
# rebuilds identically every time and stays self-consistent while wrong.
AS_OF = tiles["as_of"]
REG = ["openai", "anthropic", "google-deepmind", "meta", "xai", "mistral",
       "deepseek", "alibaba-qwen", "moonshot", "zai", "cohere", "amazon"]
NM = {"openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind",
      "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
      "alibaba-qwen": "Alibaba (Qwen)", "moonshot": "Moonshot AI", "zai": "Z.ai",
      "cohere": "Cohere", "amazon": "Amazon"}
ro = {o: i for i, o in enumerate(REG)}
rel = sorted(V["disclosure_matrix"]["rows"], key=lambda r: r["date"])
series = {f'{s["benchmark"]}|{s["source_class"]}': s for s in V["trajectory"]["series"]}
gpqa_pts = sorted(series["gpqa-diamond|INDEPENDENT"]["points"], key=lambda p: p["date"])
score_by_entry = {p["entry_id"]: p["value"] for p in gpqa_pts}
# second benchmark for the story: SWE-Bench Verified, independent (also Epoch-measured)
swe_pts = sorted(series["swe-bench-verified|INDEPENDENT"]["points"], key=lambda p: p["date"])
swe_by_entry = {p["entry_id"]: p["value"] for p in swe_pts}
# Three paper states, straight from the derived matrix: "disclosed" (filled),
# "not_disclosed" (a researched absence, dashed), "not_researched" (the
# registrar's own gap, faint, and never in a denominator).
paper_state = {r["entry_id"]: r["cells"]["paper"] for r in V["disclosure_matrix"]["rows"]}
paper_by_entry = {k: v == "disclosed" for k, v in paper_state.items()}
paper_researched = {k: v != "not_researched" for k, v in paper_state.items()}
param_by_entry = {}
yearly = {y["year"]: y["releases"] for y in V["cadence"]["yearly"]}
# real lab-vs-independent pairs, computed from the record (same entry + same
# benchmark measured both ways). The content pass (2026-07-20) brought these to 5.
_pairs = {}
BENCH_LABEL = {"gpqa-diamond": "GPQA Diamond", "swe-bench-verified": "SWE-Bench Verified"}
for yr in ["2022", "2023", "2024", "2025", "2026"]:
    for e in json.loads(gzip.decompress((ROOT / f"data/entries/{yr}.json.gz").read_bytes())):
        param_by_entry[e["id"]] = e.get("parameters") not in (None, "NOT_DISCLOSED", "")
        bb = defaultdict(dict)
        for b in e.get("benchmarks", []):
            bb[b["benchmark"]][b["provenance"]["source_class"]] = b
        for bench, d in bb.items():
            if "LAB_REPORTED" in d and "INDEPENDENT" in d:
                _pairs[(e["id"], bench)] = {
                    "model": e["model_name"], "date": e["date"], "bench": bench,
                    "lab": d["LAB_REPORTED"]["value"], "ind": d["INDEPENDENT"]["value"],
                    "labcfg": d["LAB_REPORTED"].get("configuration", "")}
PAIRS = sorted(_pairs.values(), key=lambda p: p["date"])
# some releases are measured both ways on MORE than one benchmark (DeepSeek-V4-Pro
# on GPQA and SWE), so the comparison count exceeds the distinct-release count.
n_pair_models = len(set(p["model"] for p in PAIRS))
for p in PAIRS:
    lc = (p["labcfg"] or "").strip()
    p["cfg"] = f"lab {lc[:22]} &#183; ind Epoch default" if lc else "lab reported &#183; ind Epoch default"
    p["benchlabel"] = BENCH_LABEL.get(p["bench"], p["bench"])

DAY0 = "2022-11-30"
def dd(d): return (date.fromisoformat(d) - date.fromisoformat(DAY0)).days
SPAN = dd(rel[-1]["date"])
def esc(s): return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

W, H = 920, 560
X0, X1 = 158, 892
TOP, BOT = 46, 486
ROWH = (BOT - TOP) / len(REG)
PARK = 520
GREEN = "#173404"
def xp(d): return X0 + (X1 - X0) * dd(d) / SPAN
def y_pulse(org): return TOP + ro[org] * ROWH + ROWH / 2
def y_traj(v): return BOT - (v / 100.0) * (BOT - TOP)

# ---- disclosure waffle: NORMALIZED columns (each year fills the same height,
# marks sized to fit) so the green fill fraction reads as SHARE and every column
# fills the frame uniformly -- no ragged skyline from 1-vs-112 releases a year.
slots = ["2023", "2024", "2025", "2026"]
slotw = (X1 - X0) / len(slots)
DBOT = 492; HCOL = 396; WMAX = slotw - 26
byyr_marks = defaultdict(list)
for r in rel:
    if r["org"] in ro: byyr_marks[r["date"][:4]].append(r)
# every column is an IDENTICAL bounding box: WMAX wide, HCOL tall (uniform),
# marks fill non-square cells so both width AND height read uniform across years
YWW = {}; YCW = {}; YCH = {}; YMK = {}
for y in slots:
    N = max(1, len(byyr_marks.get(y, [])))
    YWW[y] = 7  # fixed column count -> every year is an identical WMAX x HCOL box
    YCW[y] = WMAX / YWW[y]
    rows = math.ceil(N / YWW[y])
    YCH[y] = HCOL / max(rows, 1)
    YMK[y] = round(min(YCW[y], YCH[y]) * 0.62 / 7, 3)
def waffle_positions(flag_map):
    pos = {}
    for si, y in enumerate(slots):
        rows_y = sorted(byyr_marks.get(y, []), key=lambda r: (0 if flag_map.get(r["entry_id"]) else 1, r["date"]))
        cw = YCW[y]; ch = YCH[y]; wwy = YWW[y]
        bx = X0 + si * slotw + (slotw - WMAX) / 2 + cw / 2
        for k, r in enumerate(rows_y):
            col = k % wwy; row = k // wwy
            pos[r["entry_id"]] = (bx + col * cw, DBOT - row * ch - ch / 2)
    return pos
paper_pos = waffle_positions(paper_by_entry)
param_pos = waffle_positions(param_by_entry)

# per-release "days since this org's previous release" (the acceleration metric),
# baked onto each mark so the SAME marks can morph into the acceleration beat.
ACAP = 135
def y_acc(v): return BOT - min(v, ACAP)/ACAP*(BOT - TOP)
# gap is measured between DISTINCT release dates, so a same-day batch (e.g. Opus 4
# + Sonnet 4) shares one gap and sits ON the line instead of dropping to 0. One
# release per date is the visible "representative" dot; its hover lists them all.
gap_by_entry = {}; accrep_by_entry = {}; atip_by_entry = {}
_od = defaultdict(list); _names_od = defaultdict(list)
for r in rel:
    if r["org"] in ro:
        _od[r["org"]].append((r["date"], r["entry_id"])); _names_od[(r["org"], r["date"])].append(r["model_name"])
for o, lst in _od.items():
    lst.sort()
    dates = sorted(set(d for d, _ in lst))
    prevd = {d: (dates[i-1] if i > 0 else None) for i, d in enumerate(dates)}
    seen = set()
    for (d, eid) in lst:
        pd = prevd[d]
        g = None if pd is None else (date.fromisoformat(d) - date.fromisoformat(pd)).days
        gap_by_entry[eid] = g
        rep = d not in seen; seen.add(d)
        accrep_by_entry[eid] = 1 if rep else 0
        nm = ", ".join(_names_od[(o, d)])
        atip_by_entry[eid] = (f'{esc(nm)} &#183; {d} &#183; {g} days after the previous release' if g is not None
                              else f'{esc(nm)} &#183; {d} &#183; first on record for {esc(NM[o])}')

# ---- marks: one per release, all target positions baked in ----
marks = ""; n_scored = 0
org_traj = defaultdict(list)  # for per-company connector lines
for r in rel:
    if r["org"] not in ro: continue
    eid = r["entry_id"]; px = xp(r["date"])
    # small stable vertical jitter so same-week releases in a row don't overlap
    py = y_pulse(r["org"]) + ((sum(ord(c) for c in eid) % 7) - 3) * 1.8
    sc = score_by_entry.get(eid)
    if sc is not None:
        tx, ty = xp(r["date"]), y_traj(sc); scored = 1; n_scored += 1
        org_traj[r["org"]].append((tx, ty))
        cap = f'{esc(r["model_name"])} &#183; GPQA Diamond {sc}, measured by Epoch &#183; {r["date"]} &#183; {esc(NM[r["org"]])}'
    else:
        tx, ty = xp(r["date"]), PARK; scored = 0
        cap = f'{esc(r["model_name"])} &#183; {r["date"]} &#183; {esc(NM[r["org"]])} &#183; no independent GPQA on record'
    g = gap_by_entry.get(eid)
    acx, acy, hasacc = (px, y_acc(g), 1) if g is not None else (px, PARK, 0)
    accrep = accrep_by_entry.get(eid, 1); atip = atip_by_entry.get(eid, "")
    # SWE-Bench Verified position (second benchmark beat); only the scored subset moves
    ssw = swe_by_entry.get(eid)
    if ssw is not None:
        swx, swy, hasswe = xp(r["date"]), y_traj(ssw), 1
        swetip = f'{esc(r["model_name"])} &#183; SWE-Bench Verified {ssw}, measured by Epoch &#183; {r["date"]} &#183; {esc(NM[r["org"]])}'
    else:
        swx, swy, hasswe = xp(r["date"]), PARK, 0; swetip = ""  # hidden in swe beat; no tip needed
    yr = r["date"][:4]
    pp = paper_pos.get(eid, (X0 - 30, PARK)); mp = param_pos.get(eid, (X0 - 30, PARK))
    # 1 = paper on record, 0 = researched and none, 2 = not yet researched
    pap = 1 if paper_by_entry.get(eid) else (0 if paper_researched.get(eid) else 2)
    par = 1 if param_by_entry.get(eid) else 0
    wsc = YMK.get(yr, 1.0)  # scale 8px base to fill the (uniform) waffle cell
    marks += (f'<rect class="rmk" data-org="{r["org"]}" data-yr="{yr}" data-scored="{scored}" data-paper="{pap}" data-param="{par}" data-wsc="{wsc}" '
              f'data-hasaccel="{hasacc}" data-accrep="{accrep}" data-atip="{atip}" data-tip="{cap}" data-hasswe="{hasswe}" data-swetip="{swetip}" data-px="{px:.1f}" data-py="{py:.1f}" '
              f'data-pulsex="{px:.1f}" data-pulsey="{py:.1f}" data-trajx="{tx:.1f}" data-trajy="{ty:.1f}" '
              f'data-swex="{swx:.1f}" data-swey="{swy:.1f}" '
              f'data-accelx="{acx:.1f}" data-accely="{acy:.1f}" data-dpaperx="{pp[0]:.1f}" data-dpapery="{pp[1]:.1f}" '
              f'data-dparamx="{mp[0]:.1f}" data-dparamy="{mp[1]:.1f}" '
              f'x="{px-3.5:.1f}" y="{py-3.5:.1f}" width="7" height="7" rx="1.6"/>')

# faint full-height year-column bands (shown on year hover, all time-axis charts)
yrbands = ""
_ybounds = [("2023", "2023-01-01", "2024-01-01"), ("2024", "2024-01-01", "2025-01-01"),
            ("2025", "2025-01-01", "2026-01-01"), ("2026", "2026-01-01", None)]
for y, a, bb in _ybounds:
    x1 = xp(a); x2 = X1 if bb is None else xp(bb)
    yrbands += f'<rect class="yrband" data-year="{y}" x="{x1:.1f}" y="{TOP-6}" width="{max(0,x2-x1):.1f}" height="{BOT-(TOP-6):.1f}"/>'

# per-company connector polylines (traj coords), neutral, shown on company hover
conns = ""
for o, pts in org_traj.items():
    if len(pts) < 2: continue
    pts = sorted(pts)
    d = "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    conns += f'<path class="conn" data-org="{o}" d="{d}" fill="none"/>'

# frontier (running max) traj coords
run = -1.0; front = []
for p in gpqa_pts:
    if p["value"] > run: run = p["value"]
    front.append((xp(p["date"]), y_traj(run)))
frontier_d = "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in front)
# SWE-Bench Verified frontier (running max), for the second-benchmark beat
_swrun = -1.0; _swfront = []
for p in swe_pts:
    if p["value"] > _swrun: _swrun = p["value"]
    _swfront.append((xp(p["date"]), y_traj(_swrun)))
swefront_d = "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in _swfront)
swe_lo, swe_hi = round(swe_pts[0]["value"]), round(max(p["value"] for p in swe_pts))
n_swe = len(swe_pts)

# per-lab SWE-Bench Verified trajectories (the company-specific second-benchmark
# beat, mirroring the GPQA per-lab climb). Only labs with >=2 independent SWE
# scores can trace a trajectory; Qwen has GPQA depth but too little SWE coverage
# to trace, so it steps out of this batch (stated honestly in the copy).
swe_org_vals = defaultdict(list)
for r in rel:
    if r["org"] in ro and r["entry_id"] in swe_by_entry:
        swe_org_vals[r["org"]].append((r["date"], swe_by_entry[r["entry_id"]]))
for o in swe_org_vals: swe_org_vals[o].sort()
SWE_CASE_ORDER = [o for o in ["openai", "anthropic", "google-deepmind"] if len(swe_org_vals[o]) >= 2]
sweconns = ""
for o in SWE_CASE_ORDER:
    _pts = [(xp(d), y_traj(v)) for d, v in swe_org_vals[o]]
    _sd = "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in _pts)
    sweconns += f'<path class="sweconn" data-org="{o}" d="{_sd}" fill="none"/>'

# hero line: the first and last COMPLETE years on record, read from the data.
# "Arriving faster every year" was a constant here until 2026-09-14; the drift
# guard rebuilt it identically while 2026 ran below 2025's pace.
_hero_years = sorted(y for y in yearly if y != "2022" and y < AS_OF[:4])
_hero_first_y, _hero_last_y = _hero_years[0], _hero_years[-1]
_hero_first_n, _hero_last_n = yearly[_hero_first_y], yearly[_hero_last_y]
# hero visual: releases logged per year as a small bar chart (Walker's pick). A real,
# legible chart that shows both "AI model releases" and the acceleration that opens
# the story. Green bars = data (colour law); the partial current year is dimmed and
# labelled so the shorter bar never reads as a slowdown.
HVZ_W, HVZ_H = 640, 300
_HB_YEARS = ["2023", "2024", "2025", "2026"]
_hb_counts = [yearly[y] for y in _HB_YEARS]
_hb_max = max(_hb_counts)
_hb_l, _hb_r, _hb_b = 22, 22, 48
_hb_pw = HVZ_W - _hb_l - _hb_r
_hb_ph = HVZ_H - 46 - _hb_b
_hb_slot = _hb_pw / len(_HB_YEARS)
_hb_w = _hb_slot * 0.5
_hb_base = HVZ_H - _hb_b
hero_bars = ""
for i, y in enumerate(_HB_YEARS):
    c = _hb_counts[i]; bh = (c / _hb_max) * _hb_ph
    cx = _hb_l + i * _hb_slot + _hb_slot / 2; bxx = cx - _hb_w / 2; byy = _hb_base - bh
    partial = (y == "2026")
    hero_bars += f'<rect class="hbar{" partial" if partial else ""}" x="{bxx:.1f}" y="{byy:.1f}" width="{_hb_w:.1f}" height="{bh:.1f}" rx="2" style="animation-delay:{i*130}ms"/>'
    hero_bars += f'<text class="hbar-n" x="{cx:.1f}" y="{byy-9:.1f}" text-anchor="middle">{c}</text>'
    hero_bars += f'<text class="hbar-y" x="{cx:.1f}" y="{_hb_base+24:.1f}" text-anchor="middle">{"2026, so far" if partial else y}</text>'
hero_bars += f'<line class="hbar-base" x1="{_hb_l}" y1="{_hb_base:.1f}" x2="{HVZ_W-_hb_r}" y2="{_hb_base:.1f}"/>'
_hb_aria = ", ".join(f"{_hb_counts[i]} in {y}" for i, y in enumerate(_HB_YEARS))
n_hero = sum(1 for r in rel if r["org"] in ro)

# ---- shared axis chrome ----
# year labels sit at the MIDPOINT of each year's band (text-anchor middle) so they
# line up under the per-year release totals at the top of the pulse chart.
def _yrmid(y):
    return (xp(y + "-01-01") + xp(min(y + "-12-31", rel[-1]["date"]))) / 2
years = "".join(
    f'<line x1="{xp(y+"-01-01"):.1f}" y1="{TOP-6}" x2="{xp(y+"-01-01"):.1f}" y2="{BOT}" class="yrgrid"/>'
    f'<text x="{_yrmid(y):.1f}" y="{H-30}" text-anchor="middle" class="ax yearlbl" data-year="{y}">{y}</text>'
    for y in ["2023", "2024", "2025", "2026"])
ax_pulse = ""
for o in REG:
    yb = y_pulse(o)
    ax_pulse += (f'<line x1="{X0}" y1="{yb:.1f}" x2="{X1}" y2="{yb:.1f}" class="rowrule"/>'
                 f'<text x="{X0-10}" y="{yb+3:.1f}" text-anchor="end" class="orglab" data-org="{o}">{esc(NM[o])}</text>')
# per-year release totals across the top of the pulse (the acceleration, felt)
ax_pulse += f'<text x="{X0-10}" y="40" text-anchor="end" class="ytoth">releases/yr</text>'
for y in ["2023", "2024", "2025"]:
    ax_pulse += f'<text x="{_yrmid(y):.1f}" y="42" text-anchor="middle" class="ytot" data-year="{y}">{yearly[y]}</text>'
ax_pulse += f'<text x="{_yrmid("2026"):.1f}" y="42" text-anchor="middle" class="ytotsm" data-year="2026">{yearly["2026"]} so far</text>'
# ChatGPT origin anchor: the record starts at ChatGPT's launch (day 0). An
# annotation-blue OUTLINE stamp (never a data fill: colour law) so the first
# green mark -- Meta, three weeks later -- is not misread as "before ChatGPT".
# ChatGPT is now a real promoted entry at day 0 (the first green mark on the OpenAI
# row), so we no longer draw an annotation dot -- just the anchor line + label call
# it out as the origin. (Content pass 2026-07-20 promoted the ChatGPT entry.)
ax_pulse += (f'<line x1="{X0}" y1="{TOP-6}" x2="{X0}" y2="{BOT}" class="cganchor"/>'
             f'<text x="{X0+5}" y="{TOP-20}" class="cglab">ChatGPT &#183; the first</text>'
             f'<text x="{X0+5}" y="{TOP-9}" class="cglab cglab2">Nov 2022 &#183; day 0</text>')
ax_traj = ""
for v in [0, 25, 50, 75, 100]:
    yy = y_traj(v)
    ax_traj += (f'<line x1="{X0}" y1="{yy:.1f}" x2="{X1}" y2="{yy:.1f}" class="scoregrid"/>'
                f'<text x="{X0-10}" y="{yy+3:.1f}" text-anchor="end" class="scoreax">{v}</text>')
ax_traj += f'<text x="{X0-10}" y="{TOP-16}" text-anchor="end" class="axunit">GPQA Diamond, 0&#8211;100</text>'
ax_traj += f'<text x="{X1-4}" y="{TOP+14}" text-anchor="end" class="frontlbl">the frontier: the highest score reached so far</text>'
_n_total = sum(1 for r in rel if r["org"] in ro)
ax_traj += f'<text x="{(X0+X1)/2:.1f}" y="{TOP+2}" text-anchor="middle" class="companylbl" id="companylbl"></text>'
# SWE-Bench Verified axis (same 0-100 grid, different benchmark label)
ax_swe = ""
for v in [0, 25, 50, 75, 100]:
    yy = y_traj(v)
    ax_swe += (f'<line x1="{X0}" y1="{yy:.1f}" x2="{X1}" y2="{yy:.1f}" class="scoregrid"/>'
               f'<text x="{X0-10}" y="{yy+3:.1f}" text-anchor="end" class="scoreax">{v}</text>')
ax_swe += f'<text x="{X0-10}" y="{TOP-16}" text-anchor="end" class="axunit">SWE-Bench Verified, 0&#8211;100</text>'
ax_swe += f'<text x="{X1-4}" y="{TOP+14}" text-anchor="end" class="frontlbl">a second benchmark, also measured by Epoch</text>'

# disclosure axis: year labels + the disclosed SHARE per year (updated per beat
# so the different-sized blocks read as a share, not as raw volume)
byyr_n = defaultdict(int); byyr_pap = defaultdict(int); byyr_par = defaultdict(int)
# The paper share's denominator is releases the registrar has researched,
# never all releases: a lab's silence nobody checked for is not a lab's silence.
byyr_pap_res = defaultdict(int)
for r in rel:
    if r["org"] not in ro: continue
    y = r["date"][:4]; byyr_n[y] += 1
    if paper_researched.get(r["entry_id"]): byyr_pap_res[y] += 1
    if paper_by_entry.get(r["entry_id"]): byyr_pap[y] += 1
    if param_by_entry.get(r["entry_id"]): byyr_par[y] += 1
# a loud variable tag so the two disclosure movements read as DIFFERENT cuts,
# not one waffle shown twice (JS swaps the word per beat)
ax_disc = f'<text x="{X0-10}" y="{TOP+2}" class="discvar" id="discvar">on record: a paper</text>'
ax_disc += f'<text x="{X0-10}" y="{TOP+22}" class="foldnote">2022 is folded out: its two releases sit before the yearly columns shown here.</text>'
for si, y in enumerate(slots):
    cx = X0 + si * slotw + slotw / 2
    pp = round(100 * byyr_pap[y] / byyr_pap_res[y]) if byyr_pap_res[y] else 0
    pm = round(100 * byyr_par[y] / byyr_n[y]) if byyr_n[y] else 0
    ax_disc += (f'<text x="{cx:.1f}" y="{H-30}" text-anchor="middle" class="ax">{y}</text>'
                f'<text x="{cx:.1f}" y="{H-14}" text-anchor="middle" class="wpct" data-p="{pp}" data-m="{pm}">{pp}%</text>')

# ---- CLOSE beat (coda): the two headline trends on one 0-100 axis. Capability
# (best independent GPQA score, cumulative) RISES; disclosure (share of releases
# with a paper on record) FALLS. Both are percentages, so a shared 0-100 axis is
# honest; the two labelled lines carry the meaning. Purely descriptive (Walker):
# the reader draws the conclusion. The falling line is dashed, echoing the "dashed
# = not disclosed" mark from the disclosure beats.
_cap_run = 0.0; close_cap = []; close_dis = []; _cap_vals = []; _dis_vals = []
for y in ["2023", "2024", "2025", "2026"]:
    ys = [score_by_entry[r["entry_id"]] for r in rel
          if r["org"] in ro and r["date"][:4] <= y and r["entry_id"] in score_by_entry]
    if ys: _cap_run = max(ys)
    close_cap.append((_yrmid(y), y_traj(_cap_run))); _cap_vals.append(round(_cap_run))
    pct = round(100 * byyr_pap[y] / byyr_pap_res[y]) if byyr_pap_res[y] else 0
    close_dis.append((_yrmid(y), y_traj(pct))); _dis_vals.append(pct)
_cap_d = "M " + " L ".join(f"{x:.1f} {yy:.1f}" for x, yy in close_cap)
_dis_d = "M " + " L ".join(f"{x:.1f} {yy:.1f}" for x, yy in close_dis)
_capx, _capy = close_cap[-1]; _disx, _disy = close_dis[-1]
# the CROSSING: where the rising capability line meets the falling disclosure line.
# The emphasis moment (P4). Computed from the real series and labelled with the
# TRUE period it falls in -- never a rounder/dramatic year (Walker's binding rule).
_cross_svg = ""; CLOSE_YEARS = ["2023", "2024", "2025", "2026"]
_cross_label = None
for i in range(len(_cap_vals) - 1):
    d0 = _cap_vals[i] - _dis_vals[i]; d1 = _cap_vals[i+1] - _dis_vals[i+1]
    if d0 == 0:
        _cxr, _cyr = close_cap[i]; _cross_label = CLOSE_YEARS[i]
    elif d0 * d1 < 0:
        t = d0 / (d0 - d1)
        _cxr = close_cap[i][0] + t * (close_cap[i+1][0] - close_cap[i][0])
        _cvr = _cap_vals[i] + t * (_cap_vals[i+1] - _cap_vals[i]); _cyr = y_traj(_cvr)
        _ddr = (_cxr - X0) * SPAN / (X1 - X0)
        _cdate = date.fromordinal(date.fromisoformat(DAY0).toordinal() + int(round(_ddr)))
        _cross_label = _cdate.strftime("%b %Y")
    if _cross_label:
        _cross_svg = (f'<line x1="{_cxr:.1f}" y1="{_cyr:.1f}" x2="{_cxr:.1f}" y2="{BOT:.1f}" class="clcrosstick"/>'
                      f'<circle cx="{_cxr:.1f}" cy="{_cyr:.1f}" r="4.4" class="clcrossdot"/>'
                      f'<text x="{_cxr:.1f}" y="{BOT+18:.1f}" text-anchor="middle" class="clcrosslab">the lines cross, {esc(_cross_label)}</text>')
        break
closelines = (f'<path class="clcap" d="{_cap_d}" fill="none"/>'
              f'<path class="cldis" d="{_dis_d}" fill="none"/>'
              + "".join(f'<circle cx="{x:.1f}" cy="{yy:.1f}" r="3.4" class="cldot"/>' for x, yy in close_cap)
              + "".join(f'<circle cx="{x:.1f}" cy="{yy:.1f}" r="3.4" class="cldot cldotd"/>' for x, yy in close_dis)
              + _cross_svg
              + f'<text x="{_capx-6:.1f}" y="{_capy-9:.1f}" text-anchor="end" class="cllab">highest independent GPQA score</text>'
              + f'<text x="{_disx-6:.1f}" y="{_disy+17:.1f}" text-anchor="end" class="cllab cllabd">released with a paper on record</text>')
# close axis: 0-100 grid, neutral unit (both series are percentages, 0 to 100)
ax_close = ""
for v in [0, 25, 50, 75, 100]:
    yy = y_traj(v)
    ax_close += (f'<line x1="{X0}" y1="{yy:.1f}" x2="{X1}" y2="{yy:.1f}" class="scoregrid"/>'
                 f'<text x="{X0-10}" y="{yy+3:.1f}" text-anchor="end" class="scoreax">{v}</text>')
ax_close += f'<text x="{X0-10}" y="{TOP-16}" text-anchor="end" class="axunit">0 to 100</text>'

# ---- divergence dumbbell group (credential beat) ----
# NOTE: this is a ZOOMED GAP axis (lab minus independent, in points, range ~+-3),
# NOT the 0-100 score axis. The axis labels below make the true magnitude explicit
# so a 2.9-point gap is not misread as a large difference (honesty > drama).
dz = 306; dscale = 74
_dleft, _dright = 224, 858
def dxi(i): return _dleft + i * ((_dright - _dleft) / max(1, len(PAIRS) - 1))
divg = ""
gaps = [round(p["lab"] - p["ind"], 1) for p in PAIRS]
for i, p in enumerate(PAIRS):
    x = dxi(i); g = round(p["lab"] - p["ind"], 1); sg = "+" if g >= 0 else ""
    yl = dz - g * dscale; above = g >= 0
    tip = f'{esc(p["model"])} &#183; {esc(p["benchlabel"])}: lab reported {p["lab"]}, Epoch measured {p["ind"]} ({sg}{g}); the record keeps both'
    boxy = yl - 30 if above else yl + 12
    prov = ""
    if i == 0:
        prov = (f'<text x="{x+18:.1f}" y="{yl+4:.1f}" class="provlab">lab-reported</text>'
                f'<text x="{x+18:.1f}" y="{dz+18:.1f}" class="provlab">independent (Epoch)</text>')
    divg += (f'<g class="dpair" data-tip="{tip}">'
             f'<line x1="{x:.1f}" y1="{dz:.1f}" x2="{x:.1f}" y2="{yl:.1f}" class="gaplink"/>'
             f'<circle cx="{x:.1f}" cy="{dz}" r="12.5" class="dind"/>'
             f'<circle cx="{x:.1f}" cy="{yl:.1f}" r="12.5" class="dlab"/>'
             f'<rect x="{x-26:.1f}" y="{boxy:.1f}" width="52" height="19" rx="3" class="gapbox"/>'
             f'<text x="{x:.1f}" y="{boxy+13:.1f}" text-anchor="middle" class="pgap">{sg}{g}</text>{prov}'
             f'<text x="{x:.1f}" y="{H-96:.1f}" text-anchor="middle" class="pmodel">{esc(p["model"])}</text>'
             f'<text x="{x:.1f}" y="{H-82:.1f}" text-anchor="middle" class="pbench">{esc(p["benchlabel"])}</text></g>')
near = sum(1 for g in gaps if abs(g) <= 1)
# an explicit GAP axis (in points) so the stem length is anchored to a true scale
dgrid = ""
for gv in [-1, 0, 1, 2, 3]:
    yy = dz - gv * dscale
    dgrid += (f'<line x1="196" y1="{yy:.1f}" x2="880" y2="{yy:.1f}" class="{"baseline" if gv==0 else "dgrid"}"/>'
              f'<text x="188" y="{yy+3:.1f}" text-anchor="end" class="dgax">{"+" if gv>0 else ""}{gv}</text>')
dgrid += f'<text x="188" y="{dz-3*dscale-10:.1f}" text-anchor="end" class="dgaxu">gap, in points</text>'
divbase = dgrid  # the explanatory sentence lives in the teach line, not floating on the plot

# ---- CASE STUDIES: full-size, scroll-driven multi-line charts, one batch per
# parent beat. batch "accel" (under beat 1) = days between a firm's releases (the
# acceleration). batch "traj" (under beat 2) = each firm's independent GPQA climb.
# Same four labs on shared, time-aligned axes; each lab's line DRAWS IN on its own
# scroll beat, so every lab gets its own moment while staying comparable at a glance.
from datetime import date as _date
_byorg = defaultdict(list)
for r in rel:
    if r["org"] in ro: _byorg[r["org"]].append(r["date"])
CASE_ORDER = ["openai", "anthropic", "google-deepmind", "alibaba-qwen"]
CW, CH = 920, 428
CX0, CX1 = 150, 884
CTOP, CBOT = 44, 372
def cx(d): return CX0 + (CX1 - CX0) * dd(d) / SPAN

def _case_series(kind):
    s = {}
    for o in CASE_ORDER:
        if kind == "accel":
            ds = sorted(set(_byorg.get(o, [])))
            s[o] = [(ds[i], (_date.fromisoformat(ds[i]) - _date.fromisoformat(ds[i-1])).days) for i in range(1, len(ds))]
        else:
            s[o] = sorted((r["date"], score_by_entry[r["entry_id"]]) for r in rel if r["org"] == o and r["entry_id"] in score_by_entry)
    return s

def _lsq(xs, ys):
    n = len(xs); sx = sum(xs); sy = sum(ys); sxx = sum(x*x for x in xs); sxy = sum(x*y for x, y in zip(xs, ys))
    den = (n*sxx - sx*sx) or 1; m = (n*sxy - sx*sy)/den; return m, (sy - m*sx)/n

def _case_stat(kind, o, ser):
    pts = ser[o]
    if kind == "accel":
        vals = [v for _, v in pts]; n = len(vals)
        early = sorted(vals[:max(1, n//3)]); late = sorted(vals[-max(1, n//3):])
        return early[len(early)//2], late[len(late)//2]
    return pts[0][1], pts[-1][1]

def accel_group():
    # the acceleration line per lab, in MAIN-canvas coords (shared time x-axis,
    # days y-scale). NO dots -- the SAME release marks morph in to BE the dots.
    # Just the connecting line + a fitted trend (annotation blue = outline only).
    ser = _case_series("accel")
    out = ""
    for o in CASE_ORDER:
        pts = ser[o]
        if len(pts) < 2: continue
        poly = "M " + " L ".join(f"{xp(d):.1f} {y_acc(v):.1f}" for d, v in pts)
        xs = [dd(d) for d, _ in pts]; ys = [v for _, v in pts]; m, b = _lsq(xs, ys)
        trend = (f'<line x1="{xp(pts[0][0]):.1f}" y1="{y_acc(max(0,b+m*xs[0])):.1f}" '
                 f'x2="{xp(pts[-1][0]):.1f}" y2="{y_acc(max(0,b+m*xs[-1])):.1f}" class="ccltrend"/>')
        # no on-line lab label: the instrument header already names the lab, and a
        # label at the last point clipped off the right edge ("Ant.", "Goo."). Cut.
        out += f'<g class="ccl" data-lab="{o}">{trend}<path class="cclpath" d="{poly}" fill="none"/></g>'
    return out
accel_lines = accel_group()
# accel days axis (climb reuses the score axis / ax-traj grid)
ax_accel = ""
for gv in [30, 60, 90, 120]:
    yy = y_acc(gv)
    ax_accel += (f'<line x1="{X0}" y1="{yy:.1f}" x2="{X1}" y2="{yy:.1f}" class="scoregrid"/>'
                 f'<text x="{X0-10}" y="{yy+3:.1f}" text-anchor="end" class="scoreax">{gv}</text>')
ax_accel += f'<text x="{X0-10}" y="{TOP-16}" text-anchor="end" class="axunit">days between releases</text>'
ax_accel += f'<text x="{X1-4}" y="{TOP+14}" text-anchor="end" class="frontlbl">lower = shipping faster</text>'

# per-batch copy (stats baked from the real series)
_sa = _case_series("accel"); _st = _case_series("traj")
def _stat(kind, o): return _case_stat(kind, o, _sa if kind == "accel" else _st)
NMSHORT = {"openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind", "alibaba-qwen": "Qwen"}
ACCEL_COPY = {
 "openai": ("OpenAI", f"From about {_stat('accel','openai')[0]} days between releases to about {_stat('accel','openai')[1]}. Roughly two months down to three weeks."),
 "anthropic": ("Anthropic", f"A similar compression: about {_stat('accel','anthropic')[0]} days between releases early on, about {_stat('accel','anthropic')[1]} lately."),
 "google-deepmind": ("Google DeepMind", f"From about {_stat('accel','google-deepmind')[0]} days to about {_stat('accel','google-deepmind')[1]} between releases, the same downward pull."),
 "alibaba-qwen": ("Qwen", f"Alibaba's Qwen started fast and stayed fast: about {_stat('accel','alibaba-qwen')[0]} days then, about {_stat('accel','alibaba-qwen')[1]} now. The American labs converged toward a pace it had set."),
}
TRAJ_COPY = {
 "openai": ("OpenAI", f"GPT-4 opened at {_stat('traj','openai')[0]} on GPQA Diamond; the latest OpenAI model on record sits at {_stat('traj','openai')[1]}."),
 "anthropic": ("Anthropic", f"Claude's independently measured score climbed from {_stat('traj','anthropic')[0]} to {_stat('traj','anthropic')[1]} over the same window."),
 "google-deepmind": ("Google DeepMind", f"From {_stat('traj','google-deepmind')[0]} to {_stat('traj','google-deepmind')[1]}. Fewer models on record, the same steep climb."),
 "alibaba-qwen": ("Qwen", f"Qwen rose from {_stat('traj','alibaba-qwen')[0]} to {_stat('traj','alibaba-qwen')[1]}, tracking the frontier from open weights."),
}
# per-lab SWE-Bench Verified copy (the company-specific second-benchmark climb).
# n>=3 reads as a trajectory; n==2 is stated as two scores on record, not a trend.
def _swe_copy(o):
    vals = swe_org_vals[o]; first = round(vals[0][1]); last = round(vals[-1][1]); n = len(vals)
    if n >= 3:
        return f"On SWE-Bench Verified, {NMSHORT.get(o, NM[o])}'s independent score moves from {first} to {last} across {n} releases on record."
    return f"On SWE-Bench Verified, {NMSHORT.get(o, NM[o])} has two independent scores on record, months apart: {first}, then {last}."
SWE_CLIMB_COPY = {o: (NMSHORT.get(o, NM[o]), _swe_copy(o)) for o in SWE_CASE_ORDER}
nmjs = json.dumps(NM)

# ---- per-year narrative for the two POPULATE charts (chart 1 pulse, chart 2
# trajectory). Walker's ask: the right-hand text boxes STACK, one per year, and
# STAY until the chart changes -- so the reader isn't racing scrolling copy. The
# case-study beats keep a single swapping box (not enough per-lab copy to stack).
# count from the EXACT scored-marks set that populates the chart (registry orgs with
# an independent score), not raw gpqa_pts -- so the per-year notes match what appears.
traj_yr_vals = defaultdict(list)
for r in rel:
    if r["org"] in ro and r["entry_id"] in score_by_entry:
        traj_yr_vals[r["date"][:4]].append(score_by_entry[r["entry_id"]])
def _tmax(y): return round(max(traj_yr_vals[y])) if traj_yr_vals.get(y) else 0
def _tn(y): return len(traj_yr_vals.get(y, []))
PULSE_NOTES = [
 ("2023", f'2023 &#183; {yearly["2023"]} releases', "The first full year after ChatGPT. A handful of labs, often weeks or months between models."),
 ("2024", f'2024 &#183; {yearly["2024"]} releases', "More than double 2023. New labs enter the record, and the time between releases shrinks."),
 ("2025", f'2025 &#183; {yearly["2025"]} releases', "The busiest year on record. In some weeks several models arrive at once."),
 ("2026", f'2026 &#183; {yearly["2026"]} so far', "A partial year, already tracking the 2025 pace."),
]
TRAJ_NOTES = [
 ("2023", "2023", f"The first {_tn('2023')} independent scores land, reaching {_tmax('2023')} on GPQA Diamond."),
 ("2024", "2024", f"{_tn('2024')} more measured this year; the highest independent score climbs to {_tmax('2024')}."),
 ("2025", "2025", f"{_tn('2025')} measured; the frontier reaches {_tmax('2025')}."),
 ("2026", "2026", f"{_tn('2026')} so far, topping out at {_tmax('2026')}."),
]
mark_dates = sorted(r["date"] for r in rel if r["org"] in ro)
scored_dates = sorted(r["date"] for r in rel if r["org"] in ro and r["entry_id"] in score_by_entry)
PULSE_THR = {y: sum(1 for d in mark_dates if d < f"{y}-01-01") for y in ["2023", "2024", "2025", "2026"]}
TRAJ_THR = {y: sum(1 for d in scored_dates if d < f"{y}-01-01") for y in ["2023", "2024", "2025", "2026"]}

# notes carry the TREND only; the legend (filled/dashed) lives in the instrument
# header teach line, so the two don't restate each other on screen. Rates are
# COMPUTED from the record (2022 is folded out of the waffle, so the trend is
# framed over the columns shown, 2023-2026).
def _paperpct(y): return round(100 * byyr_pap[y] / byyr_n[y]) if byyr_n[y] else 0
def _parampct(y): return round(100 * byyr_par[y] / byyr_n[y]) if byyr_n[y] else 0
DPAPER_NOTE = f"In 2023, {_paperpct('2023')}% of releases had a paper on record; by 2026, {_paperpct('2026')}%."
DPARAM_NOTE = f"In 2023, {_parampct('2023')}% stated a parameter count; by 2026, {_parampct('2026')}%. A separate decline, on a different signal."
NOTES = {
 "pulse": [{"y": y, "h": h, "b": b} for (y, h, b) in PULSE_NOTES],
 "traj":  [{"y": y, "h": h, "b": b} for (y, h, b) in TRAJ_NOTES],
 "accel": {o: {"h": f"{ACCEL_COPY[o][0]}: the wait between releases", "b": ACCEL_COPY[o][1]} for o in CASE_ORDER},
 "climb": {o: {"h": f"{TRAJ_COPY[o][0]}: the independent climb", "b": TRAJ_COPY[o][1]} for o in CASE_ORDER},
 "swe": {"h": "", "b": f"Not one benchmark's story: on SWE-Bench Verified, a software-engineering task, the frontier climbs from {swe_lo} to {swe_hi} over the same window. Still Epoch-measured; a second benchmark, not a second source."},
 "sclimb": {o: {"h": f"{SWE_CLIMB_COPY[o][0]}: on SWE-Bench", "b": SWE_CLIMB_COPY[o][1]} for o in SWE_CASE_ORDER},
 "div": {"h": "", "b": f"When a lab grades its own model and Epoch grades the same model on the same benchmark, do they match? Each stem is one release: the ring on top is the lab's reported score, the dot below is Epoch's. The stems are short. {near} of the {len(PAIRS)} comparisons sit within a single point, and the gaps run both ways. The record keeps both numbers and never averages them."},
 "dpaper": {"h": "Fewer arrive with a paper", "b": DPAPER_NOTE},
 "dparam": {"h": "And fewer state their size", "b": DPARAM_NOTE},
 "close": {"h": "", "b": "Independent scores rose. Disclosure fell."},
}
# cumulative reveal count at the END of each year (2023..2026); drives the paced
# populate (fill each year, then DWELL so the reader can read the year box).
PULSE_ENDS = [PULSE_THR["2024"], PULSE_THR["2025"], PULSE_THR["2026"], _n_total]
TRAJ_ENDS = [TRAJ_THR["2024"], TRAJ_THR["2025"], TRAJ_THR["2026"], n_scored]
notesjs = json.dumps(NOTES)
thrjs = json.dumps({"pulse": PULSE_THR, "traj": TRAJ_THR})
endsjs = json.dumps({"pulse": PULSE_ENDS, "traj": TRAJ_ENDS})

# invisible scroll-track: one <section> per beat drives the IntersectionObserver
# and provides scroll height; the visible copy is the sticky notewrap (JS-filled).
def _spc(beat, cls="spc", extra=""):
    return f'<section class="{cls}" data-beat="{beat}"{extra}></section>'
spacers = (_spc("pulse", "spc pop", ' id="popstep"')
           + "".join(_spc(f"accel:{o}") for o in CASE_ORDER)
           + _spc("traj", "spc trin", ' id="trajstep"')
           + "".join(_spc(f"climb:{o}") for o in CASE_ORDER)
           + _spc("swe") + "".join(_spc(f"sclimb:{o}") for o in SWE_CASE_ORDER)
           + _spc("div") + _spc("dpaper") + _spc("dparam") + _spc("close"))
# no-JS / reduced-motion fallback: the notes rendered inline (the sticky overlay is JS-only)
def _nfb(h, b): return f'<div class="nfb"><h4>{h}</h4><p>{b}</p></div>'
fallback = ("".join(_nfb(h, b) for (_, h, b) in PULSE_NOTES)
            + "".join(_nfb(f"{esc(NM[o])}: the acceleration", ACCEL_COPY[o][1]) for o in CASE_ORDER)
            + "".join(_nfb(h, b) for (_, h, b) in TRAJ_NOTES)
            + "".join(_nfb(f"{esc(NM[o])}: the climb", TRAJ_COPY[o][1]) for o in CASE_ORDER)
            + _nfb("A second benchmark", f"On SWE-Bench Verified, a software-engineering task also measured by Epoch, the frontier climbs from {swe_lo} to {swe_hi} over the same window.")
            + "".join(_nfb(f"{SWE_CLIMB_COPY[o][0]}: on SWE-Bench", SWE_CLIMB_COPY[o][1]) for o in SWE_CASE_ORDER)
            + _nfb("What the lab said, beside what Epoch measured", f"Each of {n_pair_models} releases was graded twice on the same benchmark: once by the releasing lab, once independently by Epoch. Across {len(PAIRS)} comparisons the two numbers sit close, {near} of them within a single point, and the gaps run both ways. The record keeps both and averages neither.")
            + _nfb("Fewer arrive with a paper", DPAPER_NOTE) + _nfb("And fewer state their size", DPARAM_NOTE)
            + _nfb("The record, in two lines", "Independent scores rose. Disclosure fell."))

# META for the sticky instrument header (left). For the populate charts it holds the
# chart-level frame; the per-year detail lives in the stacking notes on the right.
_meta = {
    "pulse": {"n": "Beat 1 of 4", "t": "Every model release since ChatGPT",
              "te": f'One mark = one model release: which lab shipped it (down the side), and when (across). {tiles["releases_recorded"]} in all.', "h": "hover any mark for its record"},
    "traj": {"n": "Beat 2 of 4", "t": "Benchmark scores, independently measured",
             "te": f'The same marks rise to their GPQA Diamond score, measured by Epoch, not the lab. Of {_n_total}, the {n_scored} with an independent score rise; the rest have none on record.', "h": "hover a mark to light its whole lab"},
    "swe": {"n": "", "t": "The same climb, on a second benchmark",
            "te": f'The {n_swe} releases with an independent SWE-Bench Verified score rise to it, measured by Epoch. A different task from GPQA, the same shape. Still one measurer: a second benchmark, not a second source.', "h": "hover a mark for its record"},
    "div": {"n": "Beat 3 of 4", "t": "What the lab said, beside what Epoch measured",
            "te": f'Each stem is one release measured twice on the same benchmark. The ring at the top is the lab\'s own reported score; the dot at the bottom is Epoch\'s independent measurement. The number is the gap between them, and the axis is zoomed to a few points, so a short stem means the two agree.', "h": "hover a pair for its numbers"},
    "dpaper": {"n": "Beat 4 of 4", "t": "Fewer arrive with a paper",
               "te": "The same marks, gathered by year. Filled = a paper on record; a dashed slot = researched, none found; a faint slot = not yet researched. The share is of researched releases.", "h": "hover a mark for its record"},
    "dparam": {"n": "Beat 4 of 4", "t": "And fewer state their size",
               "te": "Re-sorted by a different disclosure: a stated parameter count. Filled = on record; a dashed slot = none.", "h": "hover a mark for its record"},
    "close": {"n": "In sum", "t": "The record, in two lines",
              "te": f'Over the same four years: the highest independent GPQA Diamond score rose from {_cap_vals[0]} to {_cap_vals[-1]}; the share of researched releases with a paper on record fell from {_dis_vals[0]}% to {_dis_vals[-1]}%. Both are percentages, on one axis.', "h": ""},
}
# why these labs: the four with the most releases on record and the widest
# independent benchmark coverage, so a per-lab trend is well supported. Stated once,
# on the first case beat, as a plain selection rule (not a ranking of the models).
_WHY = ("These four labs carry the most releases on record and the widest independent coverage, "
        "so a per-lab trend is well supported. They span US and Chinese labs, open weights and closed. ")
for k, o in enumerate(CASE_ORDER):
    # numberless: sub-beats don't restart the "of 4" counter (Walker: top-level only)
    _meta[f"accel:{o}"] = {"n": "", "t": f"The wait between releases: {ACCEL_COPY[o][0]}",
                           "te": (_WHY if k == 0 else "") + "Days between one release and the next, for this lab alone.", "h": "hover any point for its record"}
    _meta[f"climb:{o}"] = {"n": "", "t": f"The independent climb: {TRAJ_COPY[o][0]}",
                           "te": "Each release rises to its independent GPQA Diamond score, measured by Epoch.", "h": "hover any point for its record"}
for k, o in enumerate(SWE_CASE_ORDER):
    _meta[f"sclimb:{o}"] = {"n": "", "t": f"On SWE-Bench, by lab: {SWE_CLIMB_COPY[o][0]}",
                            "te": (("The same labs on a second benchmark. Qwen's independent SWE-Bench coverage is too thin to trace, so it steps out here. " if k == 0 else "")
                                   + "Each release rises to its independent SWE-Bench Verified score, measured by Epoch."), "h": "hover any point for its record"}
metajs = json.dumps(_meta)
swecorderjs = json.dumps(SWE_CASE_ORDER)

HTML = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Version Control: the record of the model era</title>
<meta name="description" content="One transforming canvas: {tiles["releases_recorded"]} AI model releases since ChatGPT. Independent scores rise as disclosure falls, every number traced to its source.">
<link rel="icon" type="image/svg+xml" href="./assets/favicon.svg">
<link rel="canonical" href="https://versioncontrol.walker-robinson.com/story.html">
<meta property="og:title" content="Version Control: the record of the model era">
<meta property="og:description" content="One transforming canvas of every model release since ChatGPT. Scores rise, disclosure falls.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://versioncontrol.walker-robinson.com/story.html">
<meta property="og:image" content="https://versioncontrol.walker-robinson.com/assets/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Version Control: the record of the AI model era">
<meta name="twitter:description" content="One transforming canvas of every model release since ChatGPT. Scores rise, disclosure falls.">
<meta name="twitter:image" content="https://versioncontrol.walker-robinson.com/assets/og.png">
<style>
:root{{--paper:#f1f3e9;--surface:#f8f9f1;--surface-edge:#dde1cd;--ink:#1d211a;--ink-muted:#57604e;
--ink-faint:#646c5a;--annotation:#3d5a70;--verified:{GREEN};--nav-h:46px;
--ease:cubic-bezier(0.23,1,0.32,1);
--slab:Rockwell,"Rockwell Nova","Roboto Slab","DejaVu Serif",Georgia,serif;
--body:system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--mono:ui-monospace,Consolas,Menlo,monospace;}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.5}}
.wrap{{max-width:1460px;margin:0 auto;padding:20px 26px 40px}}
.masthead{{border-bottom:3px solid var(--ink);padding-bottom:11px;position:relative;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}}
.masthead::after{{content:"";position:absolute;left:0;right:0;bottom:-6px;border-bottom:1px solid var(--ink)}}
.masthead h1{{font-family:var(--slab);font-size:1.9rem;font-weight:700;margin:0}}
.masthead p{{margin:3px 0 0;font-family:var(--slab);font-style:italic;color:var(--ink-muted)}}
.mast-by{{font-size:12px;color:var(--ink-muted)}}.mast-by a{{color:var(--annotation)}}
.mast-asof{{color:var(--ink);font-weight:600}}
.scrolly{{display:grid;grid-template-columns:minmax(0,2.75fr) 320px;gap:44px;margin-top:20px}}
.stage-col{{position:sticky;top:var(--nav-h);height:calc(100vh - var(--nav-h));display:flex;flex-direction:column;justify-content:center;align-self:start}}
/* persistent top nav: a slim sticky bar that stays through the whole scroll (Walker
   #6). The tall masthead below it scrolls away; this keeps the section links reachable. */
.storynav{{position:sticky;top:0;z-index:45;background:var(--paper);border-bottom:1px solid var(--ink);display:flex;justify-content:space-between;align-items:center;gap:16px;padding:0 26px;height:var(--nav-h)}}
.storynav-brand{{font-family:var(--slab);font-weight:700;color:var(--ink);text-decoration:none;font-size:15px;white-space:nowrap}}
/* The bar is a fixed height, so nothing in it may wrap: a wrapped brand or a
   second row of links overflows the bar rather than growing it. */
.storynav-links{{display:flex;gap:15px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}}
.storynav-links::-webkit-scrollbar{{display:none}}
.storynav-links a{{white-space:nowrap}}
.storynav-links a{{color:var(--annotation);text-decoration:none;font-size:13px}}
.storynav-links a[aria-current="page"]{{color:var(--ink);font-weight:700;text-decoration:underline}}
.storynav-links a:hover{{text-decoration:underline}}
.instrument{{width:100%;background:var(--surface);border:1px solid var(--surface-edge);border-radius:12px;padding:13px 22px 10px;display:flex;flex-direction:column;position:relative}}
.beatnum{{font-family:var(--mono);font-size:10.5px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.06em}}
.ctitle{{font-family:var(--slab);font-size:22px;font-weight:700;margin:2px 0 2px;line-height:1.14}}
.teach{{font-family:var(--slab);font-size:12.5px;color:var(--ink);margin:0 0 5px;min-height:32px}}
.canvas{{width:100%;height:auto;display:block}}
.source{{font-family:var(--mono);font-size:9.5px;color:var(--ink-faint);margin-top:5px}}
.controls{{display:flex;gap:8px;margin:3px 0 1px;min-height:22px;align-items:center}}
.controls .clab{{font-size:10px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.05em}}
.controls .grp{{display:inline-flex;border:1px solid var(--surface-edge);border-radius:6px;overflow:hidden}}
.controls button{{font:inherit;font-size:11px;font-family:var(--mono);padding:2px 9px;background:var(--surface);color:var(--ink-muted);border:0;cursor:pointer;border-right:1px solid var(--surface-edge)}}
.controls button:last-child{{border-right:0}}.controls button.on{{background:var(--verified);color:var(--paper)}}

.rmk{{fill:var(--verified);transform-box:fill-box;transform-origin:center;transition:transform 820ms var(--ease),opacity 480ms var(--ease),fill 300ms;opacity:0.9}}
/* populate-on-scroll: during the pulse, marks not yet revealed are hidden. Gated
   on html.js so a no-JS reader still sees the full chart (fallback = static). */
html.js .canvas[data-beat="pulse"] .rmk:not(.in){{opacity:0;transition:opacity 300ms var(--ease)}}
.canvas[data-beat="traj"] .rmk{{transform:translate(var(--tx),var(--ty))}}
.canvas[data-beat="traj"] .rmk[data-scored="0"]{{opacity:0;pointer-events:none}}
/* trajectory starts EMPTY and populates year by year: scored marks stay hidden
   until revealed (.trin), synced to the stacking year-notes on the right */
html.js .canvas[data-beat="traj"] .rmk[data-scored="1"]:not(.trin){{opacity:0;pointer-events:none;transition:opacity 340ms var(--ease)}}
.canvas[data-beat="div"] .rmk{{transform:translate(var(--tx),var(--ty));opacity:0;pointer-events:none}}
.canvas[data-beat="dpaper"] .rmk{{transform:translate(var(--tx),var(--ty)) scale(var(--ws,1))}}
.canvas[data-beat="dparam"] .rmk{{transform:translate(var(--tx),var(--ty)) scale(var(--ws,1))}}
/* disclosure ABSENCE reads as an empty dashed slot (a recorded not-disclosed),
   visually distinct from beat 3's crisp lab-reported hollow ring: different
   meaning, different mark, so the solid/hollow grammar is not overloaded */
.canvas[data-beat="dpaper"] .rmk[data-paper="0"],.canvas[data-beat="dparam"] .rmk[data-param="0"]{{fill:none;stroke:var(--ink-faint);stroke-width:0.8;stroke-dasharray:1.5 2;opacity:0.33}}
/* not yet researched: the registrar's own gap, faint and undashed so it never
   reads as the recorded absence above, and never counted in a share */
.canvas[data-beat="dpaper"] .rmk[data-paper="2"]{{fill:none;stroke:var(--ink-faint);stroke-width:0.6;opacity:0.14}}
.rmk.co{{opacity:1;stroke:var(--ink);stroke-width:0.5}}.canvas.filtering .rmk:not(.co){{opacity:0.07}}
/* keep the unscored (parked) marks hidden even while a company is spotlighted --
   the filtering rule above must not bring the phantom boxes back on hover */
.canvas[data-beat="traj"].filtering .rmk[data-scored="0"],.canvas[data-beat="climb"] .rmk[data-scored="0"]{{opacity:0}}
.canvas[data-beat="dpaper"] .rmk[data-yr="2022"],.canvas[data-beat="dparam"] .rmk[data-yr="2022"]{{opacity:0}}
.canvas.filtering .frontier{{opacity:0.05}}
.rmk.hot{{transform-box:fill-box;transform-origin:center;stroke:var(--ink);stroke-width:1.1}}

.ax-pulse,.ax-traj,.ax-swe,.ax-accel,.ax-disc,.ax-close,.ax-div,.axis-shared,.frontier,.conn{{transition:opacity 480ms var(--ease)}}
.ax-pulse{{opacity:1}}.ax-traj,.ax-swe,.ax-accel,.ax-disc,.ax-close,.ax-div{{opacity:0}}
/* faded (opacity:0) axis groups still capture pointer events -- turn them off so
   e.g. the disclosure label can't intercept a hover on the pulse's year totals */
.ax-traj,.ax-swe,.ax-accel,.ax-disc,.ax-close,.ax-div{{pointer-events:none}}.canvas:not([data-beat="pulse"]) .ax-pulse{{pointer-events:none}}
.canvas[data-beat="pulse"] .ax-pulse{{opacity:1}}.canvas:not([data-beat="pulse"]) .ax-pulse{{opacity:0}}
.canvas[data-beat="traj"] .ax-traj,.canvas[data-beat="climb"] .ax-traj{{opacity:1}}
.canvas[data-beat="climb"] .frontlbl{{opacity:0}}
/* SWE-Bench beat: a second benchmark on the same 0-100 axis. Only the SWE-scored
   marks move to their score; the frontier draws; the GPQA axis/frontier hide. */
.swefrontier{{stroke:var(--verified);stroke-width:2;fill:none;stroke-linecap:round;stroke-dasharray:0.1 7;opacity:0;transition:opacity 500ms var(--ease)}}
.canvas[data-beat="swe"] .ax-swe{{opacity:1}}
.canvas[data-beat="swe"] .swefrontier{{opacity:0.5}}
.canvas[data-beat="swe"] .axis-shared,.canvas[data-beat="swe"] .frontier{{opacity:0}}
.canvas[data-beat="swe"] .yrbands{{opacity:1}}
.canvas[data-beat="swe"] .rmk{{transform:translate(var(--tx),var(--ty));opacity:0;pointer-events:none}}
.canvas[data-beat="swe"] .rmk[data-hasswe="1"]{{opacity:0.95;pointer-events:auto}}
/* per-lab SWE-Bench climb (company-specific second benchmark): one lab's line at a
   time on the SWE 0-100 axis; visited labs stay as faint ghosts, mirroring the GPQA
   climb. Only the active lab's SWE-scored marks show. */
.canvas[data-beat="sclimb"] .ax-swe{{opacity:1}}
.canvas[data-beat="sclimb"] .swefrontier,.canvas[data-beat="sclimb"] .frontier{{opacity:0}}
.canvas[data-beat="sclimb"] .rmk{{transform:translate(var(--tx),var(--ty));opacity:0;pointer-events:none}}
.canvas[data-beat="sclimb"] .rmk.caseon{{opacity:0.95;pointer-events:auto}}
.sweconn{{stroke:var(--verified);stroke-width:2;fill:none;opacity:0;transition:opacity 480ms var(--ease)}}
.sweconn.co{{opacity:1;stroke-width:2.8}}
.sweconn.ghost{{opacity:0.18;stroke:var(--ink-faint);stroke-width:1.4}}
.canvas[data-beat="accel"] .ax-accel{{opacity:1}}
.canvas[data-beat="dpaper"] .ax-disc,.canvas[data-beat="dparam"] .ax-disc{{opacity:1}}
.canvas[data-beat="dpaper"] .axis-shared,.canvas[data-beat="dparam"] .axis-shared{{opacity:0}}
/* DIVERGENCE (credential beat): release marks recede to a faint band; the 5
   lab-vs-independent dumbbells build centre-stage on a zoomed gap axis */
.divg{{opacity:0;transition:opacity 560ms var(--ease)}}
.canvas[data-beat="div"] .divg,.canvas[data-beat="div"] .ax-div{{opacity:1}}
.canvas[data-beat="div"] .axis-shared,.canvas[data-beat="div"] .frontier{{opacity:0}}
.canvas[data-beat="div"] .yrbands{{opacity:0}}
.canvas[data-beat="div"] .rmk[data-scored="0"]{{opacity:0}}
.pbench{{font-family:var(--mono);font-size:9px;fill:var(--ink-faint)}}
.dpair{{cursor:pointer}}
/* CLOSE coda: two labelled green lines on a shared 0-100% axis, marks a faint cloud */
.canvas[data-beat="close"] .ax-close{{opacity:1}}
.closelines{{opacity:0;transition:opacity 620ms var(--ease)}}
.canvas[data-beat="close"] .closelines{{opacity:1}}
.canvas[data-beat="close"] .rmk{{opacity:0;pointer-events:none;transform:translate(var(--tx),var(--ty))}}
.canvas[data-beat="close"] .rmk[data-scored="0"]{{opacity:0}}
.canvas[data-beat="close"] .frontier{{opacity:0}}
.clcap{{stroke:var(--verified);stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round}}
.cldis{{stroke:var(--verified);stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:5 4;opacity:0.85}}
.cldot{{fill:var(--verified)}}.cldotd{{fill:var(--surface);stroke:var(--verified);stroke-width:1.6}}
.cllab{{font-family:var(--body);font-size:11.5px;font-weight:700;fill:var(--verified)}}
.cllabd{{font-weight:400;font-style:italic}}
/* the crossing marker: a plain ink tick + dot + factual period label (P4). Ink,
   not green -- it annotates the geometry, it is not a data mark. */
.clcrosstick{{stroke:var(--ink);stroke-width:1;stroke-dasharray:2 3;opacity:0.45}}
.clcrossdot{{fill:var(--ink)}}
.clcrosslab{{font-family:var(--mono);font-size:10px;fill:var(--ink);letter-spacing:0.02em}}
/* the coda's one true statement, made the largest text moment (emphasis by size,
   never by adjective) */
.nbox.codanote .nb{{font-family:var(--slab);font-size:20px;line-height:1.32;color:var(--ink);max-width:30ch;font-weight:700}}
.yrband{{fill:var(--ink);opacity:0;transition:opacity 260ms var(--ease);pointer-events:none}}.yrband.on{{opacity:0.05}}
.canvas[data-beat="dpaper"] .yrbands,.canvas[data-beat="dparam"] .yrbands{{opacity:0}}
.rowrule{{stroke:var(--surface-edge)}}.scoregrid{{stroke:var(--surface-edge);opacity:0.7}}.yrgrid{{stroke:var(--surface-edge);opacity:0.45}}
.orglab{{font-family:var(--body);font-size:10.5px;fill:var(--ink-muted);cursor:pointer}}.orglab.co{{fill:var(--verified);font-weight:700}}
.yearlbl{{cursor:pointer}}.yearlbl.co{{fill:var(--verified);font-weight:700}}
.ytoth{{font-family:var(--body);font-size:9px;fill:var(--ink-faint);text-transform:uppercase;letter-spacing:0.04em}}
.ytot{{font-family:var(--slab);font-size:15px;font-weight:700;fill:var(--verified);cursor:pointer;font-variant-numeric:tabular-nums}}
.ytotsm{{font-family:var(--slab);font-size:10px;fill:var(--ink-muted);cursor:pointer}}
.cganchor{{stroke:var(--annotation);stroke-width:1;stroke-dasharray:2 3;opacity:0.55}}
.cgdot{{fill:var(--surface);stroke:var(--annotation);stroke-width:2}}
.cgtie{{stroke:var(--annotation);stroke-width:1;opacity:0.4}}
.cglab{{font-family:var(--body);font-size:10px;fill:var(--annotation);font-style:italic}}
.cglab2{{font-size:9px;opacity:0.85}}
.companylbl{{font-family:var(--slab);font-size:16px;font-weight:700;fill:var(--verified);opacity:0;transition:opacity 150ms}}
.canvas.filtering .companylbl{{opacity:1}}
.scoreax{{font-family:var(--mono);font-size:10px;fill:var(--ink-muted)}}.axunit,.ax{{font-family:var(--body);font-size:10px;fill:var(--ink-muted)}}.ax{{font-family:var(--mono)}}
.discvar{{font-family:var(--slab);font-size:15px;font-weight:700;fill:var(--verified)}}
.foldnote{{font-family:var(--body);font-size:10px;font-style:italic;fill:var(--ink-faint)}}
.wpct{{font-family:var(--slab);font-size:14px;font-weight:700;fill:var(--ink);font-variant-numeric:tabular-nums}}
.frontier{{stroke:var(--verified);stroke-width:2;fill:none;stroke-linecap:round;stroke-dasharray:0.1 7;opacity:0;transition:opacity 500ms var(--ease)}}
.canvas[data-beat="traj"] .frontier{{opacity:0.45}}
.conn{{stroke:var(--verified);stroke-width:2;fill:none;opacity:0}}.conn.co{{opacity:1;stroke-width:2.8}}
.frontlbl{{font-family:var(--body);font-size:10px;fill:var(--verified);font-style:italic}}
.baseline{{stroke:var(--ink);opacity:0.8;stroke-width:1.4}}
.dgrid{{stroke:var(--surface-edge)}}.dgax{{font-family:var(--mono);font-size:10px;fill:var(--ink-muted)}}.dgaxu{{font-family:var(--body);font-size:10px;fill:var(--ink-muted)}}.axhint{{font-family:var(--body);font-size:10px;fill:var(--ink-muted)}}
.dind{{fill:var(--verified)}}.dlab{{fill:var(--surface);stroke:var(--verified);stroke-width:3}}
.gaplink{{stroke:var(--verified);stroke-width:2.5;opacity:0.4}}
.gapbox{{fill:var(--surface);stroke:var(--verified);stroke-width:1.4}}.pgap{{font-family:var(--mono);font-size:12px;font-weight:700;fill:var(--ink)}}
.pmodel{{font-family:var(--body);font-size:11.5px;font-weight:600;fill:var(--ink)}}.provlab{{font-family:var(--mono);font-size:9.5px;fill:var(--ink-faint)}}

/* right column: a STICKY notes panel that stacks per-year boxes for the two
   populate charts (and swaps a single box for the case/disclosure beats). The
   invisible .notetrack behind it provides the scroll distance + IO triggers. */
.notecol{{min-width:0;position:relative}}
.notewrap{{position:sticky;top:var(--nav-h);height:calc(100vh - var(--nav-h));display:flex;flex-direction:column;justify-content:center;gap:14px;pointer-events:none}}
html.js .notetrack{{margin-top:-100vh}}
.spc{{min-height:92vh;pointer-events:none}}
.spc.pop{{min-height:480vh}}.spc.trin{{min-height:340vh}}
.nbox{{background:var(--surface);border:1px solid var(--surface-edge);border-radius:10px;padding:14px 18px;pointer-events:auto;opacity:0;transform:translateY(10px);transition:opacity .55s var(--ease),transform .55s var(--ease);box-shadow:0 2px 8px rgba(29,33,26,0.05)}}
.nbox.show{{opacity:1;transform:none}}
.nbox .nh{{font-family:var(--slab);font-weight:700;font-size:16px;margin:0 0 4px;color:var(--ink)}}
.nbox .nb{{margin:0;font-size:14.5px;color:var(--ink-muted);line-height:1.5;max-width:38ch}}
/* the full narrative kept in the ACCESSIBILITY TREE always: visually-hidden when
   JS drives the sticky notes (so screen readers still get the whole story), and
   fully visible as the static fallback when JS is off (P2). */
.nfallback{{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;padding:0;margin:-1px}}
html:not(.js) .nfallback{{position:static;width:auto;height:auto;overflow:visible;clip:auto;clip-path:none;white-space:normal;padding-top:20px;margin:0}}
.nfb{{margin-bottom:14px;padding:11px 15px;background:var(--surface);border:1px solid var(--surface-edge);border-radius:10px}}
.nfb h4{{margin:0 0 3px;font-family:var(--slab);font-size:14px}}.nfb p{{margin:0;font-size:12.5px;color:var(--ink-muted)}}
.hovertip{{position:fixed;z-index:30;pointer-events:none;background:var(--surface);color:var(--ink);border:1px solid var(--ink);font-family:var(--mono);font-size:11px;white-space:nowrap;box-shadow:0 3px 10px rgba(29,33,26,0.18);padding:5px 10px;border-radius:4px;opacity:0;transition:opacity 120ms;max-width:none}}
.bd-title{{font-family:var(--slab);font-size:1.9rem;font-weight:700;margin:6px 0 8px;line-height:1.15;max-width:24ch}}
.bd-lede{{font-size:15px;color:var(--ink-muted);max-width:66ch;margin:0 0 4px}}
.bd-take{{font-family:var(--slab);font-size:17px;color:var(--ink);max-width:66ch;margin:8px 0 0;line-height:1.45}}
/* CASE STUDIES on the canvas: per-lab line groups interleaved as beats between
   the parents. Marks fade out; one lab's line draws in at a time; each flows into
   the next. Same time x-axis throughout. Trend line = annotation blue (outline,
   never a data fill). */
.canvas[data-beat="accel"] .rmk,.canvas[data-beat="climb"] .rmk{{opacity:0;pointer-events:none}}
.canvas[data-beat="accel"] .rmk.caseon,.canvas[data-beat="climb"] .rmk.caseon{{opacity:0.95;pointer-events:auto}}
.canvas[data-beat="accel"] .rmk{{transform:translate(var(--tx),var(--ty))}}
.canvas[data-beat="climb"] .rmk{{transform:translate(var(--tx),var(--ty))}}
.caselines{{opacity:0;pointer-events:none}}
.canvas[data-beat="accel"] .caselines[data-kind="accel"]{{opacity:1}}
.ccl{{opacity:0;transition:opacity 520ms var(--ease)}}.ccl.on,.ccl.ghost{{opacity:1}}
.cclpath{{stroke:var(--verified);stroke-width:2;fill:none;stroke-linejoin:round;stroke-linecap:round;opacity:0.5;transition:stroke-dashoffset 950ms var(--ease),opacity 400ms,stroke 400ms}}
.ccltrend{{stroke:var(--annotation);stroke-width:1.6;stroke-dasharray:4 4;opacity:0.75;transition:opacity 400ms}}
.ccllabel{{font-family:var(--body);font-size:12px;font-weight:700;fill:var(--ink);transition:opacity 400ms}}
/* a visited lab stays as a faint grey ghost so the four build up a comparison */
.ccl.ghost .cclpath{{stroke:var(--ink-faint);opacity:0.2}}
.ccl.ghost .ccltrend,.ccl.ghost .ccllabel{{opacity:0}}
.conn.ghost{{opacity:0.18;stroke:var(--ink-faint);stroke-width:1.4}}
.note{{margin-top:28px;background:var(--surface);border:1px solid var(--surface-edge);border-radius:10px;padding:16px 20px;font-size:13.5px}}
.endpitch{{font-family:var(--slab);font-size:clamp(17px,2.4vw,22px);font-weight:700;line-height:1.3;margin:0 0 8px;max-width:32ch}}
.enddemo{{font-size:12.5px;color:var(--ink-muted);max-width:70ch;margin:0 0 14px;line-height:1.5}}.enddemo em{{font-style:italic;color:var(--ink)}}
.endstance{{margin:0 0 14px;max-width:70ch}}
/* the closing summary: the four findings of the story compiled in one place, then
   the doors into the archive (Walker #6). Descriptive labels only, no ranking. */
.endsum{{margin:0 0 20px;padding:0 0 18px;border-bottom:1px solid var(--surface-edge)}}
.endsum-h{{font-family:var(--slab);font-size:clamp(17px,2.4vw,22px);font-weight:700;margin:0 0 13px;color:var(--ink)}}
.endsum-list{{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:15px 28px}}
.endsum-list li{{margin:0;font-size:13.5px;color:var(--ink-muted);line-height:1.5;border-left:3px solid var(--verified);padding-left:13px}}
.endsum-list b{{display:block;font-family:var(--slab);font-size:12.5px;color:var(--ink);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px}}
@media (max-width:720px){{.endsum-list{{grid-template-columns:1fr}}}}
.readmore{{margin:34px 0 10px;padding-top:28px;border-top:1px solid var(--surface-edge)}}
.readmore-h{{font-family:var(--slab);font-size:16px;font-weight:700;margin:0 0 18px;color:var(--ink);text-transform:uppercase;letter-spacing:0.06em}}
.enddoors{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:0}}
@media (max-width:900px){{.enddoors{{grid-template-columns:1fr 1fr}}}}
.enddoor{{display:flex;flex-direction:column;gap:7px;padding:22px 20px;min-height:112px;justify-content:space-between;border:1px solid var(--surface-edge);border-radius:12px;background:var(--paper);text-decoration:none;color:var(--ink);transition:border-color 150ms,transform 150ms,box-shadow 150ms}}
.enddoor:hover{{border-color:var(--verified);transform:translateY(-2px);box-shadow:0 5px 16px rgba(29,33,26,0.09)}}
.enddoor b{{font-family:var(--slab);font-size:18px;line-height:1.1}}.enddoor span{{font-size:12.5px;color:var(--ink-muted);line-height:1.35}}
@media (max-width:560px){{.enddoors{{grid-template-columns:1fr}}}}
.protonote{{display:block;margin-top:8px;font-size:11px;color:var(--ink-faint);font-style:italic}}
.skip{{position:absolute;left:14px;top:-46px;background:var(--ink);color:var(--paper);padding:7px 13px;z-index:40;transition:top 120ms}}.skip:focus{{top:0}}
/* cold open: "it started with one" -- a full-screen counter that sets the pace */
.hero{{min-height:calc(96vh - var(--nav-h));display:flex;align-items:center;justify-content:center;text-align:center;padding:20px}}
.hero-inner{{max-width:840px;width:100%}}
.hero-num{{font-family:var(--slab);font-size:clamp(96px,19vw,230px);font-weight:700;color:var(--verified);line-height:0.86;letter-spacing:-0.02em}}
.hero-head{{font-family:var(--slab);font-size:clamp(28px,4.8vw,50px);font-weight:700;color:var(--ink);line-height:1.06;letter-spacing:-0.01em;margin:8px auto 2px;max-width:19ch}}
/* the hero visual: releases-per-year bars. They grow from the baseline on load, so
   the acceleration is the first thing the reader sees. Colour law holds: green =
   data marks only; the partial current year is a dimmed green, never a new hue. */
.hero-viz{{width:100%;max-width:520px;height:auto;display:block;margin:18px auto 8px}}
.hbar{{fill:var(--verified);transform:scaleY(0);transform-box:fill-box;transform-origin:center bottom;animation:hbargrow .7s var(--ease) forwards}}
.hbar.partial{{opacity:0.42}}
@keyframes hbargrow{{to{{transform:scaleY(1)}}}}
.hbar-n{{font-family:var(--slab);font-size:19px;font-weight:700;fill:var(--verified);font-variant-numeric:tabular-nums;opacity:0;animation:hbnfade .45s var(--ease) .55s forwards}}
.hbar-y{{font-family:var(--mono);font-size:12.5px;fill:var(--ink-muted)}}
.hbar-base{{stroke:var(--ink);stroke-width:1.4}}
@keyframes hbnfade{{to{{opacity:1}}}}
.hero-meta{{font-family:var(--mono);font-size:11.5px;color:var(--ink-muted);letter-spacing:0.05em}}
.hero-tension{{font-family:var(--slab);font-size:clamp(30px,5.2vw,58px);font-weight:700;color:var(--ink);line-height:1.08;letter-spacing:-0.01em;margin-top:6px}}
.hero-tension br{{}}
.hero-cap{{font-family:var(--mono);font-size:12.5px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.16em;margin-top:10px}}
.hero-line{{font-family:var(--slab);font-size:clamp(21px,3.3vw,33px);margin-top:30px;color:var(--ink);line-height:1.25}}
.hero-sub{{font-size:14.5px;color:var(--ink-muted);margin:14px auto 0;max-width:52ch}}
.hero-dek{{font-family:var(--slab);font-style:italic;font-size:clamp(15px,2vw,19px);color:var(--ink-muted);margin:16px auto 0;max-width:40ch;line-height:1.4}}
.hero-scroll{{font-family:var(--mono);font-size:11.5px;color:var(--ink-muted);margin-top:40px;letter-spacing:0.08em;text-transform:uppercase}}
.hero-scroll span{{display:inline-block;animation:bob 1.8s var(--ease) infinite}}
@keyframes bob{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(4px)}}}}
/* the counter that climbs 1->281 while the marks stream into the timeline behind it */
.bignum{{position:absolute;left:0;right:0;top:46%;transform:translateY(-50%);text-align:center;pointer-events:none;opacity:0;transition:opacity 300ms;z-index:5}}
.bignum b{{display:block;font-family:var(--slab);font-size:clamp(70px,11vw,132px);font-weight:700;color:var(--verified);line-height:0.9;opacity:0.9;font-variant-numeric:tabular-nums}}
.bignum small{{display:block;font-family:var(--mono);font-size:11.5px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.13em;margin-top:6px}}
.instrument.populating .bignum{{opacity:1}}
.instrument.populating .teach,.instrument.populating .controls{{opacity:0.25;transition:opacity 300ms}}
/* reduced-motion = the SAME sticky desktop layout, just instant. We do NOT un-pin
   the canvas (that was the bug: it scrolled off-screen). Transitions off, counter
   animation off, marks revealed instantly; the sticky canvas stays visible and
   each beat's arrangement simply appears as you scroll. setBeat shows all note
   boxes when reduce is set, so the stacking notes still populate. */
@media (prefers-reduced-motion:reduce){{*,*::before,*::after{{transition-duration:0s!important;animation-duration:0s!important;animation-iteration-count:1!important}}.rmk,.ax-pulse,.ax-traj,.ax-disc,.frontier,.conn{{transition:none}}.hero{{min-height:auto;padding:40px 20px}}.hero-scroll span{{animation:none}}.bignum{{display:none}}.hbar{{animation:none;transform:none}}.hbar-n{{animation:none;opacity:1}}
  html.js .canvas[data-beat="traj"] .rmk[data-scored="1"]:not(.trin){{opacity:0.9}}}}
/* mobile: sticky GRAPHIC on top (canvas capped so the notes have room), a sticky
   NOTE strip pinned just beneath it, and the invisible notetrack scrolling behind
   to drive the beats. The canvas stays visible through every beat (the desktop
   bug was un-pinning it). Single column; notes flow in the lower band. */
@media (max-width:900px){{.scrolly{{display:block}}
  .storynav{{padding:0 14px}}.storynav-brand{{font-size:13px}}.storynav-links{{gap:11px}}.storynav-links a{{font-size:12px}}
}}
@media (max-width:430px){{
  .storynav{{padding:0 12px;gap:10px}}.storynav-links{{gap:9px}}.storynav-links a{{font-size:11.5px}}
  .stage-col{{position:sticky;top:var(--nav-h);height:auto;z-index:3;background:var(--paper);padding-bottom:4px}}
  .canvas{{max-height:44vh}}
  .notewrap{{position:sticky;top:calc(var(--nav-h) + 45vh);height:auto;min-height:0;max-height:44vh;overflow:hidden;justify-content:flex-start;pointer-events:none;z-index:2;background:var(--paper);padding:6px 0 10px;gap:8px}}
  html.js .notetrack{{margin-top:0}}.spc,.spc.pop,.spc.trin{{min-height:74vh}}
  .nbox{{opacity:1;transform:none;margin-bottom:8px}}}}
</style></head>
<body>
<a class="skip" href="#end">Skip to the end state</a>
<nav class="storynav" aria-label="Site">
  <a class="storynav-brand" href="./index.html">Version Control</a>
  <div class="storynav-links">
    <a href="./story.html" aria-current="page">Story</a>
    <a href="./index.html">Timeline</a>
    <a href="./methodology.html">Methodology</a>
    <a href="./about.html">About</a>
    <a href="./data.html">Data</a>
  </div>
</nav>
<div class="wrap">
<div class="masthead"><div><h1>Version Control</h1><p>The release record of the AI model era.</p></div>
<div class="mast-by">Maintained by <a href="https://walker-robinson.com">Walker Robinson</a> &#183; <a href="./methodology.html">methodology &amp; sources</a> &#183; <span class="mast-asof">the record as of {AS_OF}</span></div></div>
<section class="hero" id="hero">
  <div class="hero-inner">
    <p class="hero-head">A public registry of AI model releases.<br>From {_hero_first_n} in {_hero_first_y} to {_hero_last_n} in {_hero_last_y}.</p>
    <svg class="hero-viz" viewBox="0 0 {HVZ_W} {HVZ_H}" role="img" aria-label="Bar chart of AI model releases logged per year: {_hb_aria}. The count rises through each complete year; 2026 is a partial year.">{hero_bars}</svg>
    <div class="hero-scroll"><span>Scroll &#8595;</span></div>
  </div>
</section>
<div class="scrolly">
  <div class="stage-col"><div class="instrument">
    <div class="ctitle" id="ctitle">Every model release since ChatGPT</div>
    <p class="teach" id="teach">One mark = one model release, placed by the lab that shipped it (down the side) and when (across). The record opens at ChatGPT's launch; {tiles["releases_recorded"]} releases follow.</p>
    <div class="controls" id="controls"><span class="clab" id="hint">hover any mark for its record</span></div>
    <svg class="canvas" id="canvas" data-beat="pulse" viewBox="0 0 {W} {H}" role="img"
      aria-label="One canvas of {tiles["releases_recorded"]} release marks moving between four views: the release timeline, independent benchmark scores, the gap between lab-reported and independent numbers, and the yearly disclosure decline. Across the four years, the highest independent score rises while the share of researched releases with a paper on record falls. The full narrative in words follows below.">
      <g class="yrbands">{yrbands}</g>
      <g class="axis-shared">{years}</g>
      <g class="ax-pulse">{ax_pulse}</g>
      <g class="ax-traj">{ax_traj}</g>
      <g class="ax-swe">{ax_swe}</g>
      <g class="ax-accel">{ax_accel}</g>
      <g class="ax-disc">{ax_disc}</g>
      <g class="ax-close">{ax_close}</g>
      <g class="ax-div">{divbase}</g>
      <g class="conns">{conns}</g>
      <g class="sweconns">{sweconns}</g>
      <path class="frontier" d="{frontier_d}"/>
      <path class="swefrontier" d="{swefront_d}"/>
      <g class="marks" id="marks">{marks}</g>
      <g class="caselines" data-kind="accel">{accel_lines}</g>
      <g class="divg">{divg}</g>
      <g class="closelines">{closelines}</g>
    </svg>
    <div class="bignum" id="bignum" aria-hidden="true"><b id="bignumN">1</b><small>releases on record</small></div>
    <div class="source" id="src">Releases: Epoch AI, Data on AI Models &#183; independent scores: Epoch AI Benchmarking Hub &#183; retrieved {AS_OF}</div>
  </div></div>
  <div class="notecol">
    <div class="notewrap" id="notewrap" aria-live="polite"></div>
    <div class="notetrack">{spacers}</div>
    <div class="nfallback"><h2>The record in words</h2><p>A text version of each view below. For every entry as a filterable table with full provenance, see <a href="./index.html">the timeline explorer</a>.</p>{fallback}</div>
  </div>
</div>
<div class="note" id="end">
  <div class="endsum">
    <h2 class="endsum-h">What the record shows, in four findings</h2>
    <ul class="endsum-list">
      <li><b>Cadence</b>{yearly["2023"]} releases in 2023, {yearly["2025"]} in 2025. The time between one release and the next keeps shrinking.</li>
      <li><b>Independent scores</b>The highest independent GPQA Diamond score rose from {_cap_vals[0]} to {_cap_vals[-1]}; SWE-Bench Verified from {swe_lo} to {swe_hi}. Every figure measured by Epoch.</li>
      <li><b>Lab beside independent</b>{n_pair_models} releases were graded both ways; {near} of {len(PAIRS)} comparisons fall within a single point. Both numbers are kept, neither is averaged.</li>
      <li><b>Disclosure</b>Releases arriving with a paper on record fell from {_dis_vals[0]}% to {_dis_vals[-1]}%; those stating a parameter count from {_parampct("2023")}% to {_parampct("2026")}%.</li>
    </ul>
  </div>
  <p class="endstance"><b>The record is public, and it maintains itself.</b> It re-checks its sources nightly, drafts candidate entries, and waits for a person to approve them; nothing publishes on its own. Every number carries its provenance, or it does not appear.</p>
  <div class="readmore">
    <h2 class="readmore-h">Read more</h2>
    <div class="enddoors">
      <a class="enddoor" href="./index.html"><b>Timeline</b><span>every entry, filterable &#8594;</span></a>
      <a class="enddoor" href="./methodology.html"><b>Methodology</b><span>the rules every number follows &#8594;</span></a>
      <a class="enddoor" href="./about.html"><b>About</b><span>what this is, and who keeps it &#8594;</span></a>
      <a class="enddoor" href="./data.html"><b>Data</b><span>download the dataset, CC-BY 4.0 &#8594;</span></a>
    </div>
  </div>
  <span class="protonote">Parameter values are counts on record; a small share are Epoch estimates, footnoted in methodology. Data current as of {AS_OF}.</span></div>
</div>
<div class="hovertip" id="tip"></div>
<script>
(function(){{
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
var NOHOVER=matchMedia("(hover: none)").matches;  // touch devices: say "tap", not "hover"
var canvas=document.getElementById("canvas"),marks=[].slice.call(document.querySelectorAll(".rmk"));
var ctitle=document.getElementById("ctitle"),teach=document.getElementById("teach"),hint=document.getElementById("hint");
var steps=[].slice.call(document.querySelectorAll(".spc"));
var conns=[].slice.call(document.querySelectorAll(".conn")),orglabs=[].slice.call(document.querySelectorAll(".orglab"));
var sweconns=[].slice.call(document.querySelectorAll(".sweconn"));
var SWE_CORDER={swecorderjs};
var wpcts=[].slice.call(document.querySelectorAll(".wpct"));
// LEAD: a settle zone at the start of each populate beat -- the empty chart is fully
// in place and framed before any mark appears (Walker #2: don't populate off-screen).
var LEAD=0.13;
var META={metajs};
function modeOf(b){{ var i=b.indexOf(":"); return i<0?b:b.slice(0,i); }}
function labOf(b){{ var i=b.indexOf(":"); return i<0?"":b.slice(i+1); }}
// ---- the stacking notes panel (right column). The two populate charts build a
// STACK of per-year boxes revealed in sync with the marks; the case/disclosure
// beats swap a single box. THR[mode][year] = the reveal count that unlocks a box.
var notewrap=document.getElementById("notewrap");
var NOTES={notesjs},THR={thrjs},ENDS={endsjs},curNotesMode=null;
// paced populate: split scroll into one slice per year; within a year, FILL the
// marks over the first ~62% of the slice, then HOLD (dwell) for the rest so the
// reader can read that year's box before the next year starts. Later years pack
// more marks into an equal slice, so the fill visibly accelerates on its own.
function yearPaced(p, ends){{ var nY=ends.length, starts=[0];
  for(var i=1;i<nY;i++) starts.push(ends[i-1]);
  p=p<0?0:(p>1?1:p);
  var seg=p*nY, yi=seg>=nY?nY-1:Math.floor(seg), f=seg-yi, fill=0.62;
  var local=f<fill?Math.pow(f/fill,1.4):1;
  return Math.round(starts[yi]+local*(ends[yi]-starts[yi])); }}
function buildStack(mode){{ var arr=NOTES[mode],h="";
  for(var i=0;i<arr.length;i++) h+='<div class="nbox" data-y="'+arr[i].y+'"><div class="nh">'+arr[i].h+'</div><p class="nb">'+arr[i].b+'</p></div>';
  notewrap.innerHTML=h; curNotesMode=mode; }}
// single-box beats: the note carries ONLY its sentence -- the instrument header on
// the left already states the title (dropping the heading kills a verbatim repeat).
function buildSingle(mode,lab){{ var n=(mode==="accel"||mode==="climb"||mode==="sclimb")?(NOTES[mode]||{{}})[lab]:NOTES[mode];
  var cls="nbox show"+(mode==="close"?" codanote":"");  // coda note gets emphasis type
  notewrap.innerHTML=n?('<div class="'+cls+'"><p class="nb">'+n.b+'</p></div>'):"";
  curNotesMode=mode+":"+(lab||""); }}
function showStack(mode,count){{ var thr=THR[mode]; if(!thr)return;
  var bx=notewrap.querySelectorAll(".nbox");
  for(var i=0;i<bx.length;i++){{ var y=bx[i].getAttribute("data-y"); bx[i].classList.toggle("show", count>thr[y]); }} }}
function applyPos(mode){{
  var k=(mode==="dpaper")?"dpaper":(mode==="dparam")?"dparam":(mode==="swe"||mode==="sclimb")?"swe":(mode==="traj"||mode==="climb"||mode==="close"||mode==="div")?"traj":"pulse";
  var wf=(k==="dpaper"||k==="dparam");
  marks.forEach(function(m){{
    var tx=(+m.getAttribute("data-"+k+"x"))-(+m.getAttribute("data-px"));
    var ty=(+m.getAttribute("data-"+k+"y"))-(+m.getAttribute("data-py"));
    m.style.setProperty("--tx",tx.toFixed(1)+"px");m.style.setProperty("--ty",ty.toFixed(1)+"px");
    m.style.setProperty("--ws",wf?m.getAttribute("data-wsc"):"1");
  }});
}}
// accel: only the active lab's marks slide (from their pulse row) to the gap
// height; every other mark stays parked at its pulse spot (invisible), so leaving
// the beat they rise naturally instead of flying in from all over.
function applyAccel(lab){{
  marks.forEach(function(m){{
    if(m.getAttribute("data-org")===lab&&m.getAttribute("data-hasaccel")==="1"){{
      var tx=(+m.getAttribute("data-accelx"))-(+m.getAttribute("data-px"));
      var ty=(+m.getAttribute("data-accely"))-(+m.getAttribute("data-py"));
      m.style.setProperty("--tx",tx.toFixed(1)+"px");m.style.setProperty("--ty",ty.toFixed(1)+"px");
    }} else {{ m.style.setProperty("--tx","0px");m.style.setProperty("--ty","0px"); }}
    m.style.setProperty("--ws","1");
  }});
}}
// which marks are "on" for a case beat: accel -> the lab's releases that have a
// gap; climb -> the lab's independently-scored releases (already at their scores)
function setCaseMarks(mode,lab){{
  marks.forEach(function(m){{
    var ok=(m.getAttribute("data-org")===lab)&&((mode==="accel")
      ?(m.getAttribute("data-hasaccel")==="1"&&m.getAttribute("data-accrep")==="1")
      :(mode==="sclimb")?(m.getAttribute("data-hasswe")==="1")
      :m.getAttribute("data-scored")==="1");
    m.classList.toggle("caseon",ok);
  }});
}}
// the accel connecting line (climb reuses the trajectory connector polylines).
// release-rate case studies show ONE lab's line at a time (no ghosts -- Walker: the
// faint lines belong only to the benchmark climb, where the comparison earns its keep).
var CORDER=["openai","anthropic","google-deepmind","alibaba-qwen"];
var accelG={{}};
[].slice.call(document.querySelectorAll('.caselines[data-kind="accel"] .ccl')).forEach(function(c){{accelG[c.getAttribute("data-lab")]=c;}});
function drawAccel(lab){{ var idx=CORDER.indexOf(lab);
  CORDER.forEach(function(o,i){{ var c=accelG[o]; if(!c)return;
    var on=(i===idx);
    c.classList.toggle("on",on); c.classList.remove("ghost");
    if(on){{ var p=c.querySelector(".cclpath"); if(p){{ if(reduce){{p.style.strokeDashoffset=0;}} else {{var L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;p.getBoundingClientRect();p.style.strokeDashoffset=0;}} }} }}
  }}); }}
// trajectory populate: the scored marks reveal in date order (.trin), year by year,
// as you scroll the traj beat -- the chart "starts empty and fills" (Walker #3).
var scoredMarks=marks.filter(function(m){{return m.getAttribute("data-scored")==="1";}});
var NSC=scoredMarks.length,trRevealed=0;
function trReveal(t){{ t=t<0?0:(t>NSC?NSC:t); if(t===trRevealed)return;
  if(t>trRevealed){{ for(var i=trRevealed;i<t;i++) scoredMarks[i].classList.add("trin"); }}
  else {{ for(var j=t;j<trRevealed;j++) scoredMarks[j].classList.remove("trin"); }}
  trRevealed=t; }}
var trajstep=document.getElementById("trajstep");
function trajScroll(){{ if(!trajstep||cur!=="traj") return;
  var r=trajstep.getBoundingClientRect(),vh=innerHeight;
  var p=(vh*0.5-r.top)/(r.height*0.86); p=(p-LEAD)/(1-LEAD); p=p<0?0:(p>1?1:p);
  trReveal(yearPaced(p, ENDS.traj)); showStack("traj",trRevealed);
  if(p>=0.995) trReveal(NSC); }}
var cur=null;
function setBeat(b){{ if(b===cur)return; cur=b;
  var mode=modeOf(b),lab=labOf(b);
  if(mode==="accel") applyAccel(lab); else applyPos(mode);
  canvas.setAttribute("data-beat",mode); canvas.setAttribute("data-lab",lab);
  var m=META[b]||META[mode]; if(m){{ctitle.innerHTML=m.t; teach.innerHTML=m.te;
    hint.textContent=NOHOVER?m.h.replace(/hover/gi,"tap"):m.h;}}  // "hover" is a lie on touch
  // right-hand notes: STACK for the two populate charts, single swap otherwise
  if(mode==="pulse"||mode==="traj"){{ if(curNotesMode!==mode) buildStack(mode);
    if(reduce) notewrap.querySelectorAll(".nbox").forEach(function(x){{x.classList.add("show");}}); }}
  else buildSingle(mode,lab);
  var pk=(mode==="dparam")?"data-m":"data-p"; wpcts.forEach(function(w){{w.textContent=w.getAttribute(pk)+"%";}});
  var dv=document.getElementById("discvar"); if(dv&&(mode==="dpaper"||mode==="dparam")) dv.textContent=(mode==="dparam")?"on record: a parameter count":"on record: a paper";
  // reset then apply case emphasis
  canvas.classList.remove("filtering");
  marks.forEach(function(mm){{mm.classList.remove("caseon");}});
  conns.forEach(function(c){{c.classList.remove("co");c.classList.remove("ghost");}});
  sweconns.forEach(function(c){{c.classList.remove("co");c.classList.remove("ghost");}});
  if(companylbl) companylbl.textContent="";
  if(mode==="accel"){{ setCaseMarks("accel",lab); drawAccel(lab); }}
  else if(mode==="climb"){{ setCaseMarks("climb",lab); drawAccel(null);
    var ci=CORDER.indexOf(lab);
    conns.forEach(function(c){{ var o=c.getAttribute("data-org"),i=CORDER.indexOf(o);
      c.classList.toggle("co", o===lab); c.classList.toggle("ghost", i>=0&&i<ci); }}); }}
  else if(mode==="sclimb"){{ setCaseMarks("sclimb",lab); drawAccel(null);
    var si=SWE_CORDER.indexOf(lab);
    sweconns.forEach(function(c){{ var o=c.getAttribute("data-org"),i=SWE_CORDER.indexOf(o);
      c.classList.toggle("co", o===lab); c.classList.toggle("ghost", i>=0&&i<si); }}); }}
  else drawAccel(null);
  if(mode!=="pulse"){{ reveal(marks.length); if(instrument) instrument.classList.remove("populating"); }}
  else if(!reduce){{ populateScroll(); }}
  if(mode==="traj"){{ if(reduce) trReveal(NSC); else {{ trReveal(0); trajScroll(); }} }} }}
var io=new IntersectionObserver(function(es){{
  es.forEach(function(e){{ if(e.isIntersecting) setBeat(e.target.getAttribute("data-beat")); }});
}},{{rootMargin:"-45% 0px -45% 0px",threshold:0}});
steps.forEach(function(s){{io.observe(s);}});

// ---- cold open / populate-on-scroll: the marks stream in chronologically (marks
// are in DOM order = date order) while the counter climbs 1 -> {tiles["releases_recorded"]}.
document.documentElement.classList.add("js");
// with JS on, the .nfallback narrative is visually-hidden (a11y tree only); pull its
// links out of tab order so sighted keyboard focus never lands on a clipped element
// (WCAG 2.4.7). The same destinations are reachable via the visible closing doors.
[].forEach.call(document.querySelectorAll(".nfallback a"),function(a){{a.tabIndex=-1;}});
var instrument=document.querySelector(".instrument"),bignum=document.getElementById("bignum"),bignumN=document.getElementById("bignumN"),popstep=document.getElementById("popstep");
var NMK=marks.length,revealed=0;
function reveal(t){{ t=t<0?0:(t>NMK?NMK:t); if(t===revealed)return;
  if(t>revealed){{ for(var i=revealed;i<t;i++) marks[i].classList.add("in"); }}
  else {{ for(var j=t;j<revealed;j++) marks[j].classList.remove("in"); }}
  revealed=t; if(bignumN) bignumN.textContent=t; }}
function populateScroll(){{ if(!popstep) return;
  var r=popstep.getBoundingClientRect(),vh=innerHeight;
  var p=(vh*0.5-r.top)/(r.height*0.86); p=(p-LEAD)/(1-LEAD); p=p<0?0:(p>1?1:p);
  // per-year fill-then-dwell: each year fills, then holds so the year box can be
  // read before the next starts; later years pack more marks -> felt acceleration.
  reveal(yearPaced(p, ENDS.pulse));
  if(cur==="pulse") showStack("pulse",revealed);
  instrument.classList.toggle("populating", cur==="pulse"&&p>0.01&&p<0.99);
  if(p>=0.995) reveal(NMK); }}
// rAF-batch scroll work: many scroll events collapse to one update per frame, so
// a heavy machine can't stutter on the populate/reveal math (P6 perf hardening).
var _raf=0;
function onScroll(){{ if(_raf) return; _raf=requestAnimationFrame(function(){{ _raf=0; populateScroll(); trajScroll(); }}); }}
if(reduce){{ reveal(NMK); }}
else {{ addEventListener("scroll",onScroll,{{passive:true}}); addEventListener("resize",onScroll); onScroll(); }}

// hover: caption tooltip + company highlight (neutral, no hue) + connector in traj
var tip=document.getElementById("tip"),hot=null,curOrg=null;
function showTip(el){{ var bt=canvas.getAttribute("data-beat");
  var txt=el&&(bt==="accel"&&el.getAttribute("data-atip")?el.getAttribute("data-atip"):((bt==="swe"||bt==="sclimb")&&el.getAttribute("data-swetip")?el.getAttribute("data-swetip"):el.getAttribute("data-tip")));
  if(el&&txt){{ tip.innerHTML=txt; tip.style.opacity="1";
    var r=el.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight,cx=r.left+r.width/2,top=r.top-th-12; if(top<6)top=r.bottom+12;
    tip.style.left=Math.max(8,Math.min(cx-tw/2,innerWidth-tw-8))+"px"; tip.style.top=top+"px"; }} else tip.style.opacity="0"; }}
var yearlbls=[].slice.call(document.querySelectorAll(".yearlbl,.ytot,.ytotsm"));
var yrbandEls=[].slice.call(document.querySelectorAll(".yrband"));
function setYearBand(y){{ yrbandEls.forEach(function(bd){{bd.classList.toggle("on",y!=null&&bd.getAttribute("data-year")===y);}}); }}
var companylbl=document.getElementById("companylbl");
var NMJS={nmjs};
function spotlight(attr,val){{ var key=(val==null)?null:(attr+"="+val); if(key===curOrg)return; curOrg=key;
  var on=!!val;
  canvas.classList.toggle("filtering",on);
  marks.forEach(function(m){{m.classList.toggle("co",on&&m.getAttribute(attr)===val);}});
  orglabs.forEach(function(l){{l.classList.toggle("co",on&&attr==="data-org"&&l.getAttribute("data-org")===val);}});
  yearlbls.forEach(function(l){{l.classList.toggle("co",on&&attr==="data-yr"&&l.getAttribute("data-year")===val);}});
  conns.forEach(function(c){{c.classList.toggle("co",on&&attr==="data-org"&&cur==="traj"&&c.getAttribute("data-org")===val);}});
  if(companylbl) companylbl.textContent=(on&&attr==="data-org"&&cur==="traj")?(NMJS[val]||""):""; }}
function setHot(el){{ if(hot===el)return; if(hot)hot.classList.remove("hot"); hot=el; if(hot)hot.classList.add("hot"); }}
canvas.addEventListener("mousemove",function(e){{ var t=e.target;
  var m=t.closest?t.closest(".rmk"):null;
  var ol=t.closest?t.closest(".orglab"):null, y2=t.closest?t.closest("[data-year]"):null;
  setHot(m); showTip(m);
  setYearBand(y2?y2.getAttribute("data-year"):null); // the faint column, in every time-axis chart
  // case beats manage their own emphasis; don't let hover-spotlight clobber it
  var mode=cur?(cur.indexOf(":")<0?cur:cur.slice(0,cur.indexOf(":"))):"";
  if(mode==="div"){{ var dp=t.closest?t.closest(".dpair"):null; if(dp) showTip(dp); return; }}
  if(mode==="accel"||mode==="climb"||mode==="close"||mode==="swe"||mode==="sclimb") return;
  if(ol) spotlight("data-org",ol.getAttribute("data-org"));
  else if(y2) spotlight("data-yr",y2.getAttribute("data-year"));
  else if(m&&cur==="traj") spotlight("data-org",m.getAttribute("data-org"));
  else spotlight(null,null); }});
canvas.addEventListener("mouseleave",function(){{setHot(null);showTip(null);setYearBand(null);spotlight(null,null);}});
setBeat("pulse");
}})();
</script></body></html>
"""
OUT = ROOT / "site" / "story.html"  # the canvas story is now the canonical /story.html (C1)
_STATS = f"marks={len(rel)} scored={n_scored} pairs={len(PAIRS)}"

# --check regenerates into memory and compares, so CI can fail on a story page
# that has drifted from the record it describes. Every figure on this page is
# read from data/ at build time, so a refreshed capture silently falsifies the
# whole page unless something forces the rebuild: the 2026-08-24 refresh left
# the hero reading 95/112/30 for years that had become 94/116/60, and 282
# marks for a record holding 315. A page of stale numbers is the exact failure
# this project exists to point at, so the guard is not optional.
if "--check" in sys.argv:
    current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if current != HTML:
        print(f"STORY DRIFT: {OUT} does not match a rebuild from the current "
              f"data ({_STATS}). Run: python -m pipeline.build_story")
        raise SystemExit(1)
    print(f"story.html is current ({_STATS})")
else:
    OUT.write_text(HTML, encoding="utf-8")
    print("wrote", OUT, f"({len(HTML)} bytes) | {_STATS}")
