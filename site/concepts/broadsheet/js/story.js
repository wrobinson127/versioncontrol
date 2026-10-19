/* Broadsheet: the landing page.
   One persistent canvas of marks that morphs through six views as the reader
   scrolls: beeswarm by lab, cadence by year, disclosure waffle, independent
   climb, lab beside independent, twelve small multiples. CSS sticky holds the
   graphic; GSAP ScrollTrigger reports scroll progress (WHEN); the canvas
   draws (DRAW). render(P) is a pure function of scroll position, so fast or
   reversed scrolling cannot corrupt the picture. Every number is counted from
   the published files at load. */
(function () {
  "use strict";
  var BS = window.BS, esc = BS.esc;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var G = document.getElementById("graphic");
  var cv = document.getElementById("cv");
  var ctx = cv.getContext("2d");
  var ov = document.getElementById("ov");
  var hit = document.getElementById("hit");
  var tip = document.getElementById("tip");
  var live = document.getElementById("live");
  var mctx = document.createElement("canvas").getContext("2d");
  var TAU = Math.PI * 2;
  var NV = 6;
  var C = {};
  var D = null, S = null;
  var marks = [], emark = {};
  var W = 0, H = 0, DPR = 1, narrow = false, region = 0, LW0 = 132;
  var R = [];          // plot rect per view
  var geo = [];        // per-view geometry for overlays
  var prog = [0, 0, 0, 0, 0, 0];
  var P = 0, Pt = 0, raf = 0, intro = reduce ? 1 : 0, introStart = 0;
  var shownV = -1, activeStep = -1;
  var focusList = [], focusIdx = -1, tipMark = null;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ["paper", "paper-2", "ink", "ink-2", "ink-3", "accent", "api", "nr"].forEach(function (k) {
      C[k] = cs.getPropertyValue("--" + k).trim();
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hash(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function measure(t, font) { mctx.font = font; return mctx.measureText(t).width * 1.05; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  var FONT_H = "700 13.5px 'Libre Franklin', sans-serif", FONT_B = "400 13px 'Libre Franklin', sans-serif";

  /* ======================= data derivations ======================= */
  function derive(d) {
    var E = d.entries;
    var rows = d.views.disclosure_matrix.rows;
    var cells = {};
    rows.forEach(function (r) { cells[r.entry_id] = r.cells; });
    var first = {};
    E.forEach(function (e) { if (!(e.org in first)) { first[e.org] = e.date; } });
    var labs = Object.keys(BS.ORG_NAMES).filter(function (o) { return first[o]; }).sort(function (a, b) {
      return first[a] < first[b] ? -1 : first[a] > first[b] ? 1 : (a < b ? -1 : 1);
    });
    var rel = E.filter(function (e) { return e.entry_type === "release"; });
    var series = {};
    d.views.trajectory.series.forEach(function (s) { series[s.benchmark + "|" + s.source_class] = s; });
    var gpqa = {}, gpqaPts = (series["gpqa-diamond|INDEPENDENT"] || { points: [] }).points.slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    gpqaPts.forEach(function (p) { gpqa[p.entry_id] = p; });
    var swePts = (series["swe-bench-verified|INDEPENDENT"] || { points: [] }).points.slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var tiles = d.views.tiles;
    var asOf = tiles.as_of, curY = asOf.slice(0, 4), prevY = String(+curY - 1);
    var prevCut = asOf.slice(5) === "02-29" ? prevY + "-02-28" : prevY + asOf.slice(4);
    var relDates = rel.map(function (e) { return e.date; });
    var curN = relDates.filter(function (x) { return x.slice(0, 4) === curY && x <= asOf; }).length;
    var prevN = relDates.filter(function (x) { return x.slice(0, 4) === prevY && x <= prevCut; }).length;
    var yearly = d.views.cadence.yearly;

    /* busiest ISO week of releases, and the month with the most open-weights releases */
    var wk = {}, wkMon = {};
    relDates.forEach(function (x) { var w = BS.isoWeek(x); wk[w.key] = (wk[w.key] || 0) + 1; wkMon[w.key] = w.monday; });
    var bw = null;
    Object.keys(wk).sort().forEach(function (k) { if (!bw || wk[k] > wk[bw]) { bw = k; } });
    var om = {};
    rel.forEach(function (e) { if (e.availability_class === "open_weights") { var k = e.date.slice(0, 7); om[k] = (om[k] || 0) + 1; } });
    var omMax = null;
    Object.keys(om).sort().forEach(function (k) { if (!omMax || om[k] > om[omMax]) { omMax = k; } });

    /* shares by year, researched releases only, from the derived matrix */
    function byYear(art) {
      var o = {};
      rows.forEach(function (r) {
        var y = r.date.slice(0, 4), st = r.cells[art] || "not_researched";
        var b = o[y] = o[y] || { dis: 0, nd: 0, nr: 0 };
        if (st === "disclosed") { b.dis++; } else if (st === "not_disclosed") { b.nd++; } else { b.nr++; }
      });
      return o;
    }
    var params = {};
    rel.forEach(function (e) {
      var y = e.date.slice(0, 4), b = params[y] = params[y] || { has: 0, n: 0 };
      b.n++; if (typeof e.parameters === "number") { b.has++; }
    });
    var years = yearly.map(function (y) { return y.year; });
    var D0 = String(+years[0] + 1), D1 = curY;
    function skew(art) {
      var ys = rows.filter(function (r) { return r.date.slice(0, 4) === D1; }).map(function (r) { return r.date; }).sort();
      if (!ys.length) { return null; }
      var cm = Math.max(1, +ys[ys.length - 1].slice(5, 7) - 1), cut = D1 + "-" + pad2(cm) + "-01";
      var res = rows.filter(function (r) { return r.date.slice(0, 4) === D1 && (r.cells[art] || "not_researched") !== "not_researched"; })
        .map(function (r) { return r.date; });
      if (!res.length) { return null; }
      var k = res.filter(function (x) { return x >= cut; }).length, m = ys.filter(function (x) { return x >= cut; }).length;
      return k / res.length > m / ys.length ? { k: k, n: res.length, m: m, N: ys.length, mon: BS.monthName(D1 + "-" + pad2(cm)).split(" ")[0] } : null;
    }
    /* highest independent GPQA Diamond score reached by the end of each year */
    var capByYear = {}, run = 0, nByYear = {};
    years.forEach(function (y) {
      gpqaPts.forEach(function (p) { if (p.date.slice(0, 4) <= y) { run = Math.max(run, p.value); } });
      var n = gpqaPts.filter(function (p) { return p.date.slice(0, 4) === y; });
      nByYear[y] = { n: n.length, max: n.length ? Math.max.apply(null, n.map(function (p) { return p.value; })) : null };
      capByYear[y] = run;
    });
    var pairs = BS.pairsOf(E);
    pairs.forEach(function (p) { p.gap = Math.round((p.lab.value - p.ind.value) * 10) / 10; });
    var refused = [];
    Object.keys(d.deltas).forEach(function (id) {
      (d.deltas[id] || []).forEach(function (it) { if (it.kind === "REFUSED_COMPARISON") { refused.push({ id: id, reason: it.reason }); } });
    });
    var byId = {};
    E.forEach(function (e) { byId[e.id] = e; });
    refused.forEach(function (r) { r.entry = byId[r.id]; });
    refused.sort(function (a, b) { return (a.entry ? a.entry.date : "") < (b.entry ? b.entry.date : "") ? -1 : 1; });
    return {
      E: E, rel: rel, rows: rows, cells: cells, labs: labs, first: first, gpqa: gpqa, gpqaPts: gpqaPts, swePts: swePts,
      tiles: tiles, asOf: asOf, curY: curY, prevY: prevY, prevCut: prevCut, curN: curN, prevN: prevN, yearly: yearly,
      bw: { n: wk[bw], monday: wkMon[bw] }, om: { n: om[omMax], month: omMax }, byYear: byYear, params: params,
      years: years, D0: D0, D1: D1, skew: skew, capByYear: capByYear, nByYear: nByYear, pairs: pairs, refused: refused,
      byId: byId, dm: d.views.disclosure_matrix, meta: d.meta
    };
  }

  /* ======================= marks ======================= */
  function styOf(av) { return av === "open_weights" ? "open" : av === "public_api" ? "api" : "svc"; }
  function buildMarks() {
    marks = []; emark = {};
    S.E.forEach(function (e, i) {
      var m = { t: "e", e: e, i: i, rev: e.entry_type === "revision", sty: styOf(e.availability_class), st: [], dl: [] };
      marks.push(m); emark[e.id] = m;
    });
    S.rel.forEach(function (e) {
      var c = S.cells[e.id]; if (!c) { return; }
      BS.SLOTS.forEach(function (s, k) {
        var st = c[s[0]] || "not_researched";
        marks.push({ t: "d", e: e, k: k, cell: st, parent: emark[e.id], st: [], dl: [] });
      });
    });
    S.pairs.forEach(function (p, j) {
      ["ind", "lab"].forEach(function (side) { marks.push({ t: "p", e: p.entry, pair: p, j: j, side: side, parent: emark[p.entry.id], st: [], dl: [] }); });
    });
  }

  /* ======================= geometry ======================= */
  function contentBox() {
    var gut = clamp(W * 0.034, 16, 48);
    var x0 = W > 1380 ? (W - 1380) / 2 + gut : gut;
    return { x0: x0, x1: W - x0, gut: gut };
  }
  function computeRects() {
    var gb = G.getBoundingClientRect();
    W = Math.round(gb.width); H = Math.round(gb.height);
    narrow = W < 900;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ov.setAttribute("viewBox", "0 0 " + W + " " + H);
    var cb = contentBox();
    var stepsTop = document.querySelector(".steps").getBoundingClientRect().top;
    var heroB = document.getElementById("hero-text").getBoundingClientRect().bottom - stepsTop;
    var band = narrow ? 50 : 72;
    LW0 = narrow ? 70 : 132;
    var r0 = { x0: cb.x0 + LW0, x1: cb.x1, y0: heroB + band + (narrow ? 8 : 16), y1: H - (narrow ? 30 : 40) };
    var minH = narrow ? 12 * 24 : 12 * 26;
    if (r0.y1 - r0.y0 < minH) { r0.y0 = r0.y1 - minH; }
    region = narrow ? Math.round(H * 0.56) : H;
    var rs;
    if (narrow) { rs = { x0: cb.x0, x1: cb.x1, y0: 12, y1: region - 12 }; }
    else { rs = { x0: cb.x0 + Math.min(390, W * 0.31) + 64, x1: cb.x1, y0: 30, y1: H - 34 }; }
    R = [r0, rs, rs, rs, rs, rs];
  }
  function timeScale(x0, x1) {
    var d0 = BS.dayNum(S.E[0].date) - 12, d1 = BS.dayNum(S.E[S.E.length - 1].date) + 12;
    return function (dt) { return x0 + (BS.dayNum(dt) - d0) / (d1 - d0) * (x1 - x0); };
  }
  function set(m, v, x, y, r, sh, sty, a) { m.st[v] = { x: x, y: y, r: r, sh: sh, sty: sty, a: a }; }

  /* view 0: beeswarm, one row per lab */
  function layV0() {
    var r0 = R[0], v = 0, n = S.labs.length, rowH = (r0.y1 - r0.y0) / n;
    var tx = timeScale(r0.x0, r0.x1);
    var byLab = {};
    S.E.forEach(function (e) { (byLab[e.org] = byLab[e.org] || []).push(emark[e.id]); });
    var rad = narrow ? clamp(rowH * 0.11, 2.2, 3) : clamp(rowH * 0.15, 3.2, 4.6), out;
    /* A strict swarm would shrink every dot to fit the densest week; instead
       dots keep their size and the few that cannot fit are pressed against
       the band edge, overlapping slightly. */
    function swarm(rad) {
      var res = {};
      for (var li = 0; li < n; li++) {
        var list = (byLab[S.labs[li]] || []).slice().sort(function (a, b) { return a.e.date < b.e.date ? -1 : 1; });
        var placed = [];
        for (var i = 0; i < list.length; i++) {
          var m = list[i], x = tx(m.e.date), rr = m.rev ? rad * 0.6 : rad;
          var cand = [0], iv = [];
          for (var j = placed.length - 1; j >= 0; j--) {
            var p = placed[j], dx = x - p.x, Dd = rr + p.r + 0.9;
            if (dx > rad * 2 + 2) { break; }
            if (Math.abs(dx) < Dd) { var h = Math.sqrt(Dd * Dd - dx * dx); iv.push([p.y - h, p.y + h]); cand.push(p.y - h, p.y + h); }
          }
          cand.sort(function (a, b) { return Math.abs(a) - Math.abs(b); });
          var y = 0;
          for (var c = 0; c < cand.length; c++) {
            var ok = true;
            for (var q = 0; q < iv.length; q++) { if (cand[c] > iv[q][0] + 0.01 && cand[c] < iv[q][1] - 0.01) { ok = false; break; } }
            if (ok) { y = cand[c]; break; }
          }
          var lim = rowH / 2 - rr - 0.5;
          if (Math.abs(y) > lim) { y = (y < 0 ? -1 : 1) * (lim - hash(i + li * 97) * rr * 0.8); }
          placed.push({ x: x, y: y, r: rr });
          res[m.e.id] = { x: x, y: r0.y0 + rowH * (li + 0.5) + y, r: rr };
        }
      }
      return res;
    }
    out = swarm(rad);
    S.E.forEach(function (e) {
      var m = emark[e.id], o = out[e.id] || { x: tx(e.date), y: r0.y0 + rowH * (S.labs.indexOf(e.org) + 0.5), r: rad };
      set(m, v, o.x, o.y, o.r, 0, m.sty, 1);
    });
    geo[0] = { rowH: rowH, tx: tx, rad: rad };
  }

  /* view 1: cadence by year, one dot per entry, stacked */
  function layV1() {
    var r = R[1], v = 1, years = S.years, n = years.length;
    var top = narrow ? 50 : 64, bot = narrow ? 24 : 34;
    var slotW = (r.x1 - r.x0) / n, colW = slotW * (narrow ? 0.86 : 0.72);
    var groups = {};
    S.E.forEach(function (e) { (groups[e.date.slice(0, 4)] = groups[e.date.slice(0, 4)] || []).push(emark[e.id]); });
    var max = 0;
    years.forEach(function (y) { max = Math.max(max, (groups[y] || []).length); });
    var avH = r.y1 - r.y0 - top - bot, best = { s: 0, c: 1 };
    for (var c = 2; c <= 40; c++) { var s = Math.min(colW / c, avH / Math.ceil(max / c)); if (s > best.s) { best = { s: s, c: c }; } }
    var s1 = best.s, cc = best.c, base = r.y1 - bot, cols = [];
    var ord = { open: 0, api: 1, svc: 2 };
    years.forEach(function (y, i) {
      var list = (groups[y] || []).slice().sort(function (a, b) {
        if (a.rev !== b.rev) { return a.rev ? 1 : -1; }
        if (ord[a.sty] !== ord[b.sty]) { return ord[a.sty] - ord[b.sty]; }
        return a.e.date < b.e.date ? -1 : 1;
      });
      var cx0 = r.x0 + slotW * i + (slotW - cc * s1) / 2;
      list.forEach(function (m, k) {
        var col = k % cc, row = Math.floor(k / cc);
        set(m, v, cx0 + (col + 0.5) * s1, base - (row + 0.5) * s1, m.rev ? s1 * 0.25 : s1 * 0.4, 0, m.sty, 1);
      });
      cols.push({ y: y, x0: cx0, x1: cx0 + cc * s1, cx: cx0 + cc * s1 / 2, top: base - Math.ceil(list.length / cc) * s1, n: list.length });
    });
    geo[1] = { base: base, s: s1, c: cc, cols: cols };
  }

  /* view 2: disclosure waffle, lab rows x four documents */
  function layV2() {
    var r = R[2], v = 2;
    var lw = narrow ? 64 : 122, hh = narrow ? 52 : 62, foot = narrow ? 30 : 38, gapB = narrow ? 7 : 20, gapR = narrow ? 5 : 9;
    var bw = (r.x1 - r.x0 - lw - gapB * 3) / 4;
    var counts = S.labs.map(function (o) { return S.rel.filter(function (e) { return e.org === o && S.cells[e.id]; }).length; });
    var avH = r.y1 - r.y0 - hh - foot, s = 16, per = 1;
    for (; s > 3; s -= 0.25) {
      per = Math.floor(bw / s); if (per < 1) { continue; }
      var tot = 0; counts.forEach(function (c) { tot += Math.max(1, Math.ceil(c / per)) * s; });
      tot += gapR * (counts.length - 1);
      if (tot <= avH) { break; }
    }
    var y = r.y0 + hh, rowsGeo = [], idx = {};
    S.labs.forEach(function (o, li) {
      var list = S.rel.filter(function (e) { return e.org === o && S.cells[e.id]; });
      list.forEach(function (e, k) { idx[e.id] = { li: li, k: k, top: y }; });
      var h = Math.max(1, Math.ceil(list.length / per)) * s;
      rowsGeo.push({ o: o, top: y, h: h, n: list.length });
      y += h + gapR;
    });
    var bx = function (k) { return r.x0 + lw + k * (bw + gapB); };
    marks.forEach(function (m) {
      if (m.t !== "d") { return; }
      var p = idx[m.e.id]; if (!p) { return; }
      var col = p.k % per, row = Math.floor(p.k / per);
      var sty = m.cell === "disclosed" ? "disc" : m.cell === "not_disclosed" ? "nd" : "nr";
      set(m, v, bx(m.k) + (col + 0.5) * s, p.top + (row + 0.5) * s, s * 0.4, 1, sty, 1);
    });
    S.E.forEach(function (e) {
      var m = emark[e.id], p = idx[e.id];
      if (p) {
        var col = p.k % per, row = Math.floor(p.k / per);
        set(m, v, bx(0) + (col + 0.5) * s, p.top + (row + 0.5) * s, s * 0.4, 1, m.sty, 0);
      } else { var s1 = m.st[1]; set(m, v, s1.x, s1.y, s1.r, 0, m.sty, 0); }
    });
    geo[2] = { lw: lw, hh: hh, bw: bw, bx: bx, rows: rowsGeo, s: s, per: per, bottom: y };
  }

  /* view 3: the independent climb on GPQA Diamond */
  function layV3() {
    var r = R[3], v = 3;
    var lx = r.x0 + (narrow ? 30 : 40);
    var tx = timeScale(lx, r.x1);
    var yTop = r.y0 + (narrow ? 22 : 40), yBot = r.y1 - (narrow ? 56 : 74);
    var rug0 = yBot + (narrow ? 24 : 30), rug1 = r.y1 - 4;
    var ys = function (val) { return yBot - val / 100 * (yBot - yTop); };
    var rr = narrow ? 3.3 : 4.8;
    S.E.forEach(function (e, i) {
      var m = emark[e.id], p = S.gpqa[e.id];
      if (p) { set(m, v, tx(e.date), ys(p.value), m.rev ? rr * 0.75 : rr, 0, m.sty, 1); }
      else { set(m, v, tx(e.date), rug0 + hash(i) * (rug1 - rug0), narrow ? 1.5 : 2.1, 0, m.sty, 0.6); }
    });
    geo[3] = { tx: tx, ys: ys, yTop: yTop, yBot: yBot, rug0: rug0, rug1: rug1, lx: lx };
  }

  /* view 4: lab-reported beside independent, with settings */
  function layV4() {
    var r = R[4], v = 4, n = S.pairs.length;
    var vals = [];
    S.pairs.forEach(function (p) { vals.push(p.lab.value, p.ind.value); });
    var lo = Math.floor((Math.min.apply(null, vals) - (narrow ? 14 : 3)) / 5) * 5, hi = 100;
    var lw = narrow ? 0 : Math.min(230, (r.x1 - r.x0) * 0.3);
    var px0 = r.x0 + lw + (narrow ? 4 : 10), px1 = r.x1 - (narrow ? 8 : 24);
    var xs = function (val) { return px0 + (val - lo) / (hi - lo) * (px1 - px0); };
    var top = r.y0 + (narrow ? 26 : 40), foot = narrow ? 58 : 76;
    var rowH = Math.min(narrow ? 66 : 84, (r.y1 - foot - top) / Math.max(1, n));
    var rad = narrow ? 5.2 : 7;
    var rowsGeo = S.pairs.map(function (p, j) { return { y: top + rowH * (j + 0.62), p: p }; });
    marks.forEach(function (m) {
      if (m.t !== "p") { return; }
      var g = rowsGeo[m.j];
      if (m.side === "ind") { set(m, v, xs(m.pair.ind.value), g.y, rad, 0, "ind", 1); }
      else { set(m, v, xs(m.pair.lab.value), g.y, rad * 0.92, 1, "lab", 1); }
    });
    S.E.forEach(function (e) { var m = emark[e.id], s3 = m.st[3]; set(m, v, s3.x, s3.y, s3.r, 0, m.sty, 0); });
    geo[4] = { xs: xs, lo: lo, hi: hi, top: top, rowH: rowH, rows: rowsGeo, lw: lw, px0: px0, px1: px1, foot: foot };
  }

  /* view 5: twelve small multiples, stacked by quarter */
  function layV5() {
    var r = R[5], v = 5, cols = narrow ? 3 : 4, rows = Math.ceil(S.labs.length / cols);
    /* each panel: stacks sitting on a baseline, year ticks under it, then the
       lab's name, so a title can only be read with the dots directly above it */
    var gx = narrow ? 12 : 26, gy = narrow ? 10 : 18, th = narrow ? 34 : 56, ax = 0;
    var pw = (r.x1 - r.x0 - gx * (cols - 1)) / cols, ph = (r.y1 - r.y0 - ax - gy * (rows - 1)) / rows;
    var q0 = +S.E[0].date.slice(0, 4) * 4 + Math.floor((+S.E[0].date.slice(5, 7) - 1) / 3);
    var qe = S.E[S.E.length - 1].date, q1 = +qe.slice(0, 4) * 4 + Math.floor((+qe.slice(5, 7) - 1) / 3);
    var nq = q1 - q0 + 1;
    var stacks = {}, max = 0;
    var ord = { open: 0, api: 1, svc: 2 };
    var list = S.E.map(function (e) { return emark[e.id]; }).sort(function (a, b) {
      if (a.rev !== b.rev) { return a.rev ? 1 : -1; }
      if (ord[a.sty] !== ord[b.sty]) { return ord[a.sty] - ord[b.sty]; }
      return a.e.date < b.e.date ? -1 : 1;
    });
    list.forEach(function (m) {
      var q = +m.e.date.slice(0, 4) * 4 + Math.floor((+m.e.date.slice(5, 7) - 1) / 3) - q0;
      var k = m.e.org + "|" + q; stacks[k] = (stacks[k] || 0) + 1; max = Math.max(max, stacks[k]);
      m._q = q; m._k = stacks[k] - 1;
    });
    var cw = pw / nq, plotH = ph - th - 4, s = Math.min(cw, plotH / max);
    var panels = S.labs.map(function (o, i) {
      var px = r.x0 + (i % cols) * (pw + gx), py = r.y0 + Math.floor(i / cols) * (ph + gy);
      return { o: o, x: px, y: py, base: py + ph - th, w: pw };
    });
    var pIdx = {};
    panels.forEach(function (p) { pIdx[p.o] = p; });
    list.forEach(function (m) {
      var p = pIdx[m.e.org];
      set(m, v, p.x + (m._q + 0.5) * cw, p.base - (m._k + 0.5) * s, m.rev ? s * 0.27 : s * 0.4, 0, m.sty, 1);
    });
    geo[5] = { panels: panels, cw: cw, q0: q0, nq: nq, th: th, s: s, max: max };
  }

  /* hidden companions follow their parent; per-transition stagger by x */
  function finishLayout() {
    marks.forEach(function (m) {
      if (m.t === "e") { return; }
      for (var v = 0; v < NV; v++) {
        if (m.st[v]) { continue; }
        var p = m.parent.st[v];
        m.st[v] = { x: p.x, y: p.y, r: p.r, sh: p.sh, sty: m.t === "d" ? (m.cell === "disclosed" ? "disc" : m.cell === "not_disclosed" ? "nd" : "nr") : (m.side === "ind" ? "ind" : "lab"), a: 0 };
      }
    });
    for (var v = 0; v < NV - 1; v++) {
      var lo = Infinity, hi = -Infinity;
      marks.forEach(function (m) { lo = Math.min(lo, m.st[v + 1].x); hi = Math.max(hi, m.st[v + 1].x); });
      marks.forEach(function (m) { m.dl[v] = (m.st[v + 1].x - lo) / Math.max(1, hi - lo) * 0.32; });
    }
  }
  function layoutAll() {
    computeRects();
    layV0(); layV1(); layV2(); layV3(); layV4(); layV5();
    finishLayout();
    buildOverlays();
    shownV = -1;
    focusList = [];
    schedule();
  }

  /* ======================= drawing ======================= */
  function shape(x, y, r, sh) {
    ctx.beginPath();
    if (sh < 0.03) { ctx.arc(x, y, r, 0, TAU); return; }
    var rad = r * (1 - sh);
    if (ctx.roundRect) { ctx.roundRect(x - r, y - r, 2 * r, 2 * r, rad); } else { ctx.rect(x - r, y - r, 2 * r, 2 * r); }
  }
  function paint(x, y, r, sh, sty, al) {
    ctx.globalAlpha = al;
    shape(x, y, r, sh);
    switch (sty) {
      case "open": ctx.fillStyle = C.accent; ctx.fill(); break;
      case "api": ctx.fillStyle = C.api; ctx.fill(); break;
      case "svc": ctx.fillStyle = C.paper; ctx.fill(); ctx.lineWidth = Math.min(1.5, Math.max(0.9, r * 0.42)); ctx.strokeStyle = C["ink-2"]; ctx.stroke(); break;
      case "disc": ctx.fillStyle = C.ink; ctx.fill(); break;
      case "nd":
        ctx.fillStyle = C.paper; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r);
        if (r > 3.2) { ctx.moveTo(x - r, y); ctx.lineTo(x, y - r); ctx.moveTo(x, y + r); ctx.lineTo(x + r, y); }
        ctx.stroke(); break;
      case "nr": ctx.lineWidth = 1; ctx.strokeStyle = C.nr; ctx.stroke(); break;
      case "ind": ctx.fillStyle = C.ink; ctx.fill(); break;
      case "lab": ctx.fillStyle = C.paper; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.stroke(); break;
    }
  }
  function draw() {
    raf = 0;
    if (!reduce && Math.abs(Pt - P) > 0.0005) { P += (Pt - P) * 0.2; raf = requestAnimationFrame(draw); } else { P = Pt; }
    if (intro < 1) {
      intro = clamp((performance.now() - introStart) / 1500, 0, 1);
      if (intro < 1 && !raf) { raf = requestAnimationFrame(draw); }
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var a = Math.min(NV - 1, Math.floor(P + 1e-6)), t = P - a;
    if (a === NV - 1) { t = 0; }
    if (t < 1e-4) { t = 0; }
    if (narrow && P > 0.001) {
      ctx.globalAlpha = Math.min(1, P * 1.6); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, region);
    }
    /* on phones, once the marks have left the lower half, the pinned graphic
       is cut to its painted band so the steps below it are never underneath it */
    var clip = narrow && P > 0.97 ? "inset(0 0 " + (H - region) + "px 0)" : "";
    if (G.style.clipPath !== clip) { G.style.clipPath = clip; }
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i], s0 = m.st[a], x, y, r, sh, sty, al;
      if (t > 0) {
        var s1 = m.st[a + 1], lt = clamp((t - m.dl[a]) / (1 - 0.32), 0, 1), e = ease(lt);
        x = s0.x + (s1.x - s0.x) * e; y = s0.y + (s1.y - s0.y) * e; r = s0.r + (s1.r - s0.r) * e;
        sh = s0.sh + (s1.sh - s0.sh) * e; al = s0.a + (s1.a - s0.a) * e; sty = e < 0.5 ? s0.sty : s1.sty;
      } else { x = s0.x; y = s0.y; r = s0.r; sh = s0.sh; sty = s0.sty; al = s0.a; }
      if (a === 0 && t === 0 && intro < 1 && m.t === "e") {
        var k = clamp((intro * 1.35 - (x - R[0].x0) / Math.max(1, R[0].x1 - R[0].x0)) / 0.35, 0, 1);
        r *= k; y += (1 - k) * -10;
      }
      m.cx = x; m.cy = y; m.cr = r; m.ca = al;
      if (al < 0.01 || r < 0.2) { continue; }
      paint(x, y, r, sh, sty, al);
    }
    if (tipMark && tipMark.ca > 0.4) {
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(tipMark.cx, tipMark.cy, tipMark.cr + 4, 0, TAU);
      ctx.lineWidth = 2; ctx.strokeStyle = C.accent; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* labels belong to a finished view: hidden while the marks are travelling */
    var fr = P - Math.floor(P), vNow = fr < 0.18 ? Math.floor(P) : fr > 0.82 ? Math.ceil(P) : -1;
    if (vNow !== shownV) { showView(vNow); }
    setActiveStep(Math.round(P));
  }
  function schedule() { if (!raf) { raf = requestAnimationFrame(draw); } }

  /* ======================= overlays (SVG, per view) ======================= */
  function T(x, y, s, cls, anchor) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (cls ? ' class="' + cls + '"' : "") +
      (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + esc(s) + "</text>";
  }
  function L(x1, y1, x2, y2, cls) {
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" class="' + cls + '"/>';
  }
  function yearTicks(tx, y0, y1, yl, grid) {
    var s = "", y = +S.E[0].date.slice(0, 4) + 1, last = +S.E[S.E.length - 1].date.slice(0, 4);
    for (; y <= last; y++) {
      var x = tx(y + "-01-01");
      if (grid) { s += L(x, y0, x, y1, "ax-g"); }
      s += T(x, yl, String(y), "ax-t", "middle");
    }
    return s;
  }
  /* callouts: label above the plot, elbow leader down to the mark or band */
  function callouts(list, r, bandTop) {
    var s = "", cb = contentBox();
    list.forEach(function (c) { c.w = Math.max(measure(c.h, FONT_H), measure(c.b, FONT_B), c.b2 ? measure(c.b2, FONT_B) : 0) + 2; c.left = c.tx - c.w / 2; });
    list.sort(function (a, b) { return a.tx - b.tx; });
    var minL = narrow ? cb.x0 : r.x0 - 40;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      c.left = clamp(c.left, minL, r.x1 - c.w);
      if (i && c.left < list[i - 1].left + list[i - 1].w + 16) { c.left = list[i - 1].left + list[i - 1].w + 16; }
    }
    for (var j = list.length - 1; j >= 0; j--) {
      var cj = list[j], lim = j === list.length - 1 ? r.x1 : list[j + 1].left - 16;
      if (cj.left + cj.w > lim) { cj.left = lim - cj.w; }
    }
    list.forEach(function (c) { c.left = Math.max(c.left, minL); });
    list.forEach(function (c) {
      var lx = clamp(c.tx, c.left + 3, c.left + c.w - 3), yl = bandTop + (c.b2 ? 50 : 35), ye = c.br ? r.y0 - 12 : r.y0 - 5;
      var g = '<g class="call">' + T(c.left, bandTop + 12, c.h, "c-h") + T(c.left, bandTop + 27, c.b, "c-b") + (c.b2 ? T(c.left, bandTop + 42, c.b2, "c-b") : "");
      if (c.br) {
        g += '<polyline class="bracket" points="' + [[c.br[0], ye + 5], [c.br[0], ye], [c.br[1], ye], [c.br[1], ye + 5]].map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
      }
      var pts = Math.abs(lx - c.tx) < 1 ? [[lx, yl], [c.tx, ye]] : [[lx, yl], [lx, Math.max(yl, ye - 6)], [c.tx, ye]];
      if (c.ty != null) { pts.push([c.tx, c.ty - c.r - 4]); }
      g += '<polyline class="lead" points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
      g += '<circle cx="' + lx.toFixed(1) + '" cy="' + yl.toFixed(1) + '" r="2" fill="currentColor" style="color:var(--ink)"/>';
      if (c.ty != null) { g += '<circle class="ring" cx="' + c.tx.toFixed(1) + '" cy="' + c.ty.toFixed(1) + '" r="' + (c.r + 3.5).toFixed(1) + '"/>'; }
      s += g + "</g>";
    });
    return s;
  }
  function ov0() {
    var r = R[0], g = geo[0], s = "";
    S.labs.forEach(function (o, i) {
      var yc = r.y0 + g.rowH * (i + 0.5);
      s += L(r.x0, yc, r.x1, yc, "ax-g");
      s += T(r.x0 - (narrow ? 8 : 14), yc + 4.5, narrow ? BS.ORG_SHORT[o] : BS.ORG_NAMES[o], "row-l", "end");
    });
    s += yearTicks(g.tx, r.y0 - 4, r.y1 + 2, r.y1 + (narrow ? 18 : 22), true);
    var f = S.E[0], l = S.E[S.E.length - 1], fm = emark[f.id].st[0], lm = emark[l.id].st[0];
    var wk0 = S.bw.monday, wkx0 = g.tx(wk0) - 2, wkx1 = g.tx(new Date(Date.parse(wk0) + 6 * 864e5).toISOString().slice(0, 10)) + 2;
    s += '<rect class="band" x="' + wkx0.toFixed(1) + '" y="' + (r.y0 - 4) + '" width="' + Math.max(3, wkx1 - wkx0).toFixed(1) + '" height="' + (r.y1 - r.y0 + 6).toFixed(1) + '"/>';
    var list = [{ tx: fm.x, ty: fm.y, r: fm.r, h: f.model_name, b: narrow ? f.date : f.date + ". The record starts here." }];
    var same = S.om.month && wk0.slice(0, 7) === S.om.month;
    if (same) {
      var m0 = S.om.month + "-01", mx0 = g.tx(m0), mx1 = g.tx(new Date(Date.UTC(+m0.slice(0, 4), +m0.slice(5, 7), 0)).toISOString().slice(0, 10));
      s += '<rect class="band" x="' + mx0.toFixed(1) + '" y="' + (r.y0 - 4) + '" width="' + (mx1 - mx0).toFixed(1) + '" height="' + (r.y1 - r.y0 + 6).toFixed(1) + '"/>';
      list.push(narrow ? { tx: (wkx0 + wkx1) / 2, h: BS.monthName(S.om.month).replace(/^(\w{3})\w*/, "$1"), b: "busiest week: " + S.bw.n }
        : { tx: (wkx0 + wkx1) / 2, h: BS.monthName(S.om.month), b: "Busiest week on record: " + S.bw.n + " releases", b2: "Most open-weights releases in a month: " + S.om.n });
    } else {
      list.push({ tx: (wkx0 + wkx1) / 2, h: narrow ? "Busiest week" : "Busiest week: " + S.bw.n + " releases", b: narrow ? S.bw.n + " releases" : "week of " + wk0 });
    }
    if (!narrow) {
      var bx0 = g.tx(S.curY + "-01-01"), bx1 = g.tx(S.asOf < l.date ? S.asOf : l.date);
      list.push({ tx: (bx0 + bx1) / 2, br: [bx0, bx1], h: S.curY + " so far: " + S.curN + " releases", b: "median gap between releases: " + S.tiles.median_gap_days_this_year + " days" });
    }
    list.push({ tx: lm.x, ty: lm.y, r: lm.r, h: narrow ? "Newest" : "Newest: " + l.model_name, b: l.date });
    s += callouts(list, r, r.y0 - (narrow ? 50 : 72));
    return s;
  }
  function ov1() {
    var r = R[1], g = geo[1], s = "", yr = {};
    S.yearly.forEach(function (y) { yr[y.year] = y; });
    s += L(r.x0, g.base + 1, r.x1, g.base + 1, "ax-l");
    /* the same-date comparison: a rule across last year's column at the
       height its count had reached by this date, carried over to this year */
    var ly = g.base - Math.ceil(S.prevN / g.c) * g.s;
    g.cols.forEach(function (c) {
      var y = yr[c.y] || { releases: 0, revisions: 0 }, partial = c.y === S.curY;
      var top = partial ? Math.min(c.top, ly - (narrow ? 22 : 28)) : c.top;
      s += T(c.cx, g.base + (narrow ? 17 : 22), c.y + (partial ? (narrow ? "*" : ", so far") : ""), "ax-t", "middle");
      s += '<g class="call">' + T(c.cx, top - (narrow ? 22 : 30), String(y.releases), "c-big", "middle");
      s += T(c.cx, top - (narrow ? 8 : 11), narrow ? (y.revisions ? "+" + y.revisions + " rev." : "releases") : "releases" + (y.revisions ? ", " + y.revisions + " revision" + (y.revisions === 1 ? "" : "s") : ""), "c-b", "middle") + "</g>";
      if (c.y === S.prevY) {
        var nxt = g.cols.filter(function (k) { return k.y === S.curY; })[0];
        s += '<g class="call">' + L(c.x0 - 4, ly, nxt ? nxt.x1 + 4 : c.x1 + 4, ly, "bracket");
        s += T(nxt ? nxt.cx : c.x1 + 8, ly - 7, narrow ? S.prevN + " in " + S.prevY : S.prevN + " in " + S.prevY + " by " + S.prevCut.slice(5), "c-b", nxt ? "middle" : null) + "</g>";
      }
    });
    if (narrow) { s += T(r.x0, r.y1 + 6, "* " + S.curY + " so far, to " + S.asOf, "ax-t"); }
    return s;
  }
  function ov2() {
    var r = R[2], g = geo[2], s = "", counts = S.dm.counts, stat = S.dm.artifact_status;
    BS.SLOTS.forEach(function (sl, k) {
      var c = counts[sl[0]], res = c.disclosed + c.not_disclosed, x = g.bx(k);
      s += T(x, r.y0 + 16, narrow ? sl[1].replace("Usage policy", "Usage pol.").replace("System card", "Sys. card").replace("Model card", "Mod. card") : sl[1], "hd-t");
      if (narrow) {
        s += T(x, r.y0 + 32, BS.pct(c.disclosed, res) + "%", "hd-s");
        s += T(x, r.y0 + 46, "of " + res, "hd-s");
      } else {
        s += T(x, r.y0 + 34, c.disclosed + " of " + res + " researched", "hd-s");
        s += T(x, r.y0 + 50, "(" + BS.pct(c.disclosed, res) + "%)" + (stat[sl[0]] && stat[sl[0]].pending_review > 0 && stat[sl[0]].links_on_record > 0 ? ", more under review" : ""), "hd-s");
      }
    });
    g.rows.forEach(function (rw) {
      s += T(r.x0 + g.lw - (narrow ? 6 : 12), rw.top + Math.min(rw.h, g.s) / 2 + 4.5, narrow ? BS.ORG_SHORT[rw.o] : BS.ORG_NAMES[rw.o], "row-l", "end");
    });
    s += T(narrow ? r.x0 : r.x0 + g.lw, Math.min(r.y1, g.bottom + 14), "Releases only; shares divide by researched releases.", "ax-t");
    return s;
  }
  function ov3() {
    var r = R[3], g = geo[3], s = "";
    [0, 25, 50, 75, 100].forEach(function (v) {
      var y = g.ys(v);
      s += L(g.lx, y, r.x1, y, v === 0 ? "ax-l" : "ax-g");
      s += T(g.lx - 8, y + 4, String(v), "ax-t", "end");
    });
    s += T(g.lx, g.yTop - (narrow ? 10 : 16), narrow ? "GPQA Diamond, independent" : "GPQA Diamond score, measured by Epoch AI (independent)", "hd-t");
    s += yearTicks(g.tx, 0, 0, g.yBot + (narrow ? 16 : 20), false);
    var pts = S.gpqaPts, d = "", run = -1;
    pts.forEach(function (p) {
      var x = g.tx(p.date);
      if (p.value > run) {
        if (run < 0) { d = "M" + x.toFixed(1) + "," + g.ys(p.value).toFixed(1); }
        else { d += "H" + x.toFixed(1) + "V" + g.ys(p.value).toFixed(1); }
        run = p.value;
      }
    });
    d += "H" + g.tx(S.E[S.E.length - 1].date).toFixed(1);
    s += '<path class="climb" d="' + d + '"/>';
    var first = pts[0], top = pts.reduce(function (a, b) { return b.value > a.value ? b : a; }, pts[0]);
    if (first) {
      var fx = g.tx(first.date), fy = g.ys(first.value);
      s += '<g class="call">' + L(fx, fy - 8, fx, fy - (narrow ? 26 : 40), "lead") +
        T(fx - 2, fy - (narrow ? 32 : 58), narrow ? first.value.toFixed(1) : "First: " + first.model_name + ", " + first.value.toFixed(1), "c-h") +
        (narrow ? "" : T(fx - 2, fy - 44, first.date.slice(0, 4), "c-b")) + "</g>";
    }
    if (top) {
      var tx2 = g.tx(top.date), ty2 = g.ys(top.value), lab = narrow ? top.value.toFixed(1) : "Highest: " + top.model_name + ", " + top.value.toFixed(1);
      var w2 = measure(lab, FONT_H);
      s += '<g class="call">' + T(Math.min(tx2 - 10, r.x1 - w2) - 0, ty2 - (narrow ? 12 : 18), lab, "c-h", null) + "</g>";
    }
    var nUn = S.E.length - Object.keys(S.gpqa).length;
    s += T(g.lx, r.y1 + (narrow ? 12 : 18), narrow ? nUn + " with no score sit below the axis. Not a zero." : nUn + " entries with no independent score, shown below the axis. Not a zero.", "ax-t");
    return s;
  }
  function ov4() {
    var r = R[4], g = geo[4], s = "";
    for (var v = g.lo; v <= g.hi; v += 5) {
      var x = g.xs(v);
      s += L(x, g.top - 10, x, g.top + g.rowH * S.pairs.length, v % 10 === 0 ? "ax-g" : "ax-g");
      if (v % 10 === 0 || !narrow) { s += T(x, g.top - 16, String(v), "ax-t", "middle"); }
    }
    s += T(narrow ? r.x0 : r.x0, g.top - (narrow ? 34 : 34) + (narrow ? 4 : 0), narrow ? "" : "Score, 0 to 100, axis cut at " + g.lo, "ax-t");
    g.rows.forEach(function (rw) {
      var p = rw.p, xi = g.xs(p.ind.value), xl = g.xs(p.lab.value), name = p.entry.model_name + ", " + BS.BENCH_NAMES[p.bench];
      s += '<g class="call">';
      s += L(Math.min(xi, xl), rw.y, Math.max(xi, xl), rw.y, "dumb");
      if (narrow) {
        s += T(r.x0, rw.y - 14, name, "c-h");
      } else {
        s += T(r.x0 + g.lw - 4, rw.y - 3, p.entry.model_name, "c-h", "end");
        s += T(r.x0 + g.lw - 4, rw.y + 13, BS.BENCH_NAMES[p.bench], "c-b", "end");
      }
      var loS = p.lab.value < p.ind.value ? "lab" : "ind";
      var lx = Math.min(xi, xl) - 11, hx = Math.max(xi, xl) + 11;
      var loT = (loS === "lab" ? "LAB " + p.lab.value : "IND " + p.ind.value), hiT = (loS === "lab" ? "IND " + p.ind.value : "LAB " + p.lab.value);
      if (Math.abs(xi - xl) < 4) { hiT = "LAB " + p.lab.value + ", IND " + p.ind.value; loT = ""; }
      if (loT) { s += T(lx, rw.y + 4.5, loT, "c-b", "end"); }
      s += T(hx, rw.y + 4.5, hiT, "c-b");
      s += T(narrow ? r.x0 : g.px0, rw.y + (narrow ? 19 : 22), "Lab: " + p.labSet.text + ". Epoch: " + p.indSet.text + ".", "ax-t");
      s += "</g>";
    });
    var fy = g.top + g.rowH * S.pairs.length + (narrow ? 20 : 30);
    if (S.refused.length) {
      var names = S.refused.map(function (x) { return x.entry ? x.entry.model_name : x.id; });
      var reasons = S.refused.map(function (x) { return x.reason; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      s += T(r.x0, fy, "Refused comparisons against the previous model: " + S.refused.length, "c-h");
      var line = names.join(", ") + ". Reason on record: " + reasons.join("; ") + ".";
      var maxW = r.x1 - r.x0, words = line.split(" "), cur = "", yy = fy + 17;
      words.forEach(function (w) {
        if (measure(cur + " " + w, FONT_B) > maxW && cur) { s += T(r.x0, yy, cur, "c-b"); yy += 16; cur = w; } else { cur = cur ? cur + " " + w : w; }
      });
      if (cur) { s += T(r.x0, yy, cur, "c-b"); }
    }
    return s;
  }
  function ov5() {
    var g = geo[5], s = "", cnt = {};
    S.E.forEach(function (e) { cnt[e.org] = (cnt[e.org] || 0) + 1; });
    g.panels.forEach(function (p) {
      s += L(p.x, p.base + 1, p.x + p.w, p.base + 1, "ax-l");
      (narrow ? [2024, 2026] : [2023, 2024, 2025, 2026]).forEach(function (y) {
        var x = p.x + (y * 4 - g.q0) * g.cw;
        if (x > p.x + 4 && x < p.x + p.w - 4) { s += L(x, p.base + 1, x, p.base + 5, "ax-l") + (narrow ? "" : T(x, p.base + 16, String(y), "ax-t", "middle")); }
      });
      if (narrow) {
        s += T(p.x, p.base + 19, BS.ORG_SHORT[p.o] + " " + cnt[p.o], "hd-t");
      } else {
        s += T(p.x, p.base + 35, BS.ORG_NAMES[p.o], "hd-t");
        s += T(p.x, p.base + 51, cnt[p.o] + " entries, " + BS.ORG_COUNTRY[p.o], "hd-s");
      }
    });
    if (narrow) { s += T(R[5].x0, R[5].y1 + 4, "Ticks mark 1 January of 2024 and 2026; figures are entry counts.", "ax-t"); }
    return s;
  }
  function buildOverlays() {
    var parts = [ov0, ov1, ov2, ov3, ov4, ov5].map(function (f, i) {
      var inner = "";
      try { inner = f(); } catch (err) { inner = ""; if (window.console) { console.warn("overlay " + i, err); } }
      return '<g class="ovg" data-v="' + i + '">' + inner + "</g>";
    });
    ov.innerHTML = parts.join("");
  }
  function showView(v) {
    shownV = v;
    [].forEach.call(ov.querySelectorAll(".ovg"), function (g) { g.classList.toggle("on", +g.getAttribute("data-v") === v); });
    focusList = []; focusIdx = -1;
    hideTip();
    if (v < 0) { return; }
    var r = R[v], pad = 10;
    hit.style.left = (r.x0 - (v === 0 ? LW0 : 0) - pad) + "px";
    hit.style.top = (r.y0 - pad) + "px";
    hit.style.width = (r.x1 - r.x0 + (v === 0 ? LW0 : 0) + pad * 2) + "px";
    hit.style.height = (r.y1 - r.y0 + pad * 2) + "px";
  }
  function setActiveStep(v) {
    if (v === activeStep) { return; }
    activeStep = v;
    [].forEach.call(document.querySelectorAll(".step"), function (el) { el.classList.toggle("is-active", +el.getAttribute("data-step") === v); });
    var h = v === 0 ? document.getElementById("hed") : document.getElementById("s" + v + "h");
    if (h && v > 0) { live.textContent = "Chart now shows: " + h.textContent + "."; }
  }

  /* ======================= tooltips & keyboard ======================= */
  function tipHtml(m, v) {
    var e = m.e, org = BS.ORG_NAMES[e.org], h = "<b>" + esc(e.model_name) + "</b>";
    var meta = esc(org) + ", " + esc(e.date);
    var link = '<br><a tabindex="-1" href="./explorer.html?entry=' + encodeURIComponent(e.id) + '">Open in the record</a>';
    if (m.t === "d") {
      var slot = BS.SLOTS[m.k][1];
      var st = m.cell === "disclosed" ? "link on record" : m.cell === "not_disclosed" ? "not disclosed: we checked and found none" : "not yet researched";
      return h + meta + '<br><span class="k">' + esc(slot) + ":</span> " + esc(st) + link;
    }
    if (m.t === "p") {
      var p = m.pair, bn = BS.BENCH_NAMES[p.bench];
      return h + esc(bn) + '<br>' + esc(p.lab.value) + '<span class="prov">LAB</span> lab setting: ' + esc(p.labSet.text) +
        '<br>' + esc(p.ind.value) + '<span class="prov prov-ind">IND</span> Epoch setting: ' + esc(p.indSet.text) + link;
    }
    var av = BS.AVAIL_NAMES[e.availability_class] + (m.rev ? ", revision" : "");
    if (v === 3) {
      var sc = S.gpqa[e.id];
      return h + meta + "<br>" + (sc ? "GPQA Diamond " + esc(sc.value) + '<span class="prov prov-ind">IND</span><br><span class="k">tested as</span> ' + esc(sc.configuration || "not stated") :
        "No independent GPQA Diamond score on record.") + link;
    }
    return h + meta + "<br>" + esc(av) + link;
  }
  function placeTip(m) {
    tip.innerHTML = tipHtml(m, shownV);
    tip.classList.add("on");
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = m.cx + 14, y = m.cy - th - 12;
    if (x + tw > W - 8) { x = m.cx - tw - 14; }
    if (x < 8) { x = 8; }
    if (y < 8) { y = m.cy + 16; }
    if (narrow && y + th > region) { y = Math.max(4, m.cy - th - 12); }
    tip.style.transform = "none";
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hideTip() { tip.classList.remove("on"); tipMark = null; schedule(); }
  function nearest(px, py) {
    var best = null, bd = 1e9;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i]; if (m.ca == null || m.ca < 0.5) { continue; }
      var dx = m.cx - px, dy = m.cy - py, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = m; }
    }
    if (!best) { return null; }
    var lim = Math.max(10, best.cr + 6);
    return bd <= lim * lim ? best : null;
  }
  function onMove(ev) {
    if (Math.abs(P - Math.round(P)) > 0.02) { return; }
    var gb = G.getBoundingClientRect(), m = nearest(ev.clientX - gb.left, ev.clientY - gb.top);
    if (m) { if (m !== tipMark) { tipMark = m; placeTip(m); schedule(); } }
    else if (ev.pointerType === "mouse") { hideTip(); }
  }
  function visibleList() {
    if (focusList.length) { return focusList; }
    focusList = marks.filter(function (m) { return m.ca >= 0.5 && m.cr > 0.5; }).sort(function (a, b) { return a.cx - b.cx || a.cy - b.cy; });
    return focusList;
  }
  function onKey(ev) {
    var k = ev.key, list = visibleList();
    if (!list.length) { return; }
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10, Home: -1e6, End: 1e6 }[k];
    if (step != null) {
      ev.preventDefault();
      focusIdx = focusIdx < 0 ? 0 : clamp(focusIdx + step, 0, list.length - 1);
      tipMark = list[focusIdx]; placeTip(tipMark); schedule();
      live.textContent = tip.textContent.replace("Open in the record", "");
    } else if (k === "Enter" && tipMark) {
      location.href = "./explorer.html?entry=" + encodeURIComponent(tipMark.e.id);
    } else if (k === "Escape") { hideTip(); }
  }

  /* ======================= scroll wiring ======================= */
  function setPt() {
    var p = 0;
    for (var k = 1; k < NV; k++) { p += reduce ? (prog[k] >= 0.5 ? 1 : 0) : prog[k]; }
    Pt = clamp(p, 0, NV - 1);
    if (reduce) { P = Pt; }
    schedule();
  }
  function wireScroll() {
    var steps = [].slice.call(document.querySelectorAll(".step"));
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      steps.forEach(function (el) {
        var k = +el.getAttribute("data-step");
        window.ScrollTrigger.create({
          trigger: el,
          start: function () { return narrow ? "top 99%" : "top 92%"; },
          end: function () { return narrow ? "top 72%" : "top 46%"; },
          onUpdate: function (self) { prog[k] = self.progress; setPt(); },
          onRefresh: function (self) { prog[k] = self.progress; setPt(); }
        });
      });
    } else if ("IntersectionObserver" in window) {
      /* fallback without the library: discrete steps */
      var io = new IntersectionObserver(function (list) {
        list.forEach(function (en) {
          var k = +en.target.getAttribute("data-step");
          prog[k] = en.boundingClientRect.top < window.innerHeight * 0.7 ? 1 : 0;
        });
        steps.forEach(function (el) { var k = +el.getAttribute("data-step"); prog[k] = el.getBoundingClientRect().top < window.innerHeight * 0.7 ? 1 : 0; });
        setPt();
      }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "0px 0px -30% 0px" });
      steps.forEach(function (el) { io.observe(el); });
    }
  }

  /* ======================= step copy (all numbers counted at load) ======================= */
  function n(v) { return '<b class="n">' + esc(v) + "</b>"; }
  function joinAnd(a) { return a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function table(head, rows, rightFrom) {
    var h = "<table><thead><tr>" + head.map(function (x, i) { return '<th scope="col"' + (i >= rightFrom ? ' class="r"' : "") + ">" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) { h += "<tr>" + r.map(function (x, i) { return (i === 0 ? '<th scope="row">' : "<td" + (i >= rightFrom ? ' class="r"' : "") + ">") + esc(x) + (i === 0 ? "</th>" : "</td>"); }).join("") + "</tr>"; });
    return h + "</tbody></table>";
  }
  function details(sum, inner) { return "<details><summary>" + esc(sum) + "</summary>" + inner + "</details>"; }
  function fillSteps() {
    var yr = {}; S.yearly.forEach(function (y) { yr[y.year] = y; });
    var full = S.years.filter(function (y) { return y !== S.years[0] && y !== S.curY; });
    var s1 = "<p>Each column stacks one calendar year of entries, one dot each. We recorded " +
      joinAnd(full.map(function (y) { return n(yr[y].releases) + " releases in " + y; })) + ".</p>" +
      "<p>" + S.curY + " is a partial year: " + n(S.curN) + " releases by " + n(S.asOf) + ". By the same date in " + S.prevY +
      " there were " + n(S.prevN) + ".</p>" +
      "<p>Revisions, the smaller dots on top, are counted apart from releases. Pooled across the twelve labs, the median gap between releases this year is " +
      n(S.tiles.median_gap_days_this_year) + " days.</p>" +
      details("The numbers", table(["Year", "Releases", "Revisions"], S.yearly.map(function (y) { return [y.year, y.releases, y.revisions]; }), 1));
    document.getElementById("sb1").innerHTML = s1;

    var c = S.dm.counts, sc = c.system_card, scRes = sc.disclosed + sc.not_disclosed;
    var labRows = S.labs.map(function (o) {
      var out = [BS.ORG_NAMES[o]];
      BS.SLOTS.forEach(function (sl) {
        var d = 0, nd = 0, nr = 0;
        S.rows.forEach(function (r) { if (r.org !== o) { return; } var st = r.cells[sl[0]]; if (st === "disclosed") { d++; } else if (st === "not_disclosed") { nd++; } else { nr++; } });
        out.push(d + " / " + nd + " / " + nr);
      });
      return out;
    });
    var s2 = "<p>Each release now splits into four cells: system card, model card, usage policy and paper.</p>" +
      '<ul class="legend"><li><span class="sw sw-disc" aria-hidden="true"></span>A link on record</li>' +
      '<li><span class="sw sw-nd" aria-hidden="true"></span>Not disclosed: we checked, none found</li>' +
      '<li><span class="sw sw-nr" aria-hidden="true"></span>Not yet researched</li></ul>' +
      "<p>“Not disclosed” is a fact about the lab. “Not yet researched” is work we have not done. Shares divide by researched releases only: system cards are on record for " +
      n(sc.disclosed) + " of " + n(scRes) + " researched releases (" + n(BS.pct(sc.disclosed, scRes) + "%") + ").</p>" +
      details("The numbers: on record / not disclosed / not yet researched", table(["Lab"].concat(BS.SLOTS.map(function (s) { return s[1]; })), labRows, 9));
    document.getElementById("sb2").innerHTML = s2;

    var cap0 = Math.round(S.capByYear[S.D0]), cap1 = Math.round(S.capByYear[S.D1]);
    var swe = S.swePts, sweHi = swe.length ? Math.max.apply(null, swe.map(function (p) { return p.value; })) : null;
    var s3 = "<p>Each dot is an entry with a GPQA Diamond score measured by Epoch AI, an independent evaluator: " + n(S.gpqaPts.length) + " on record. Colour still shows availability.</p>" +
      "<p>The line is the highest score reached so far: " + n(cap0) + " by the end of " + S.D0 + ", " + n(cap1) + " in " + S.D1 + ". Entries with no independent score sit below the axis. A missing score is not a zero.</p>" +
      (swe.length ? "<p>On a second benchmark, SWE-Bench Verified, the first independent score on record is " + n(Math.round(swe[0].value)) + " and the highest is " + n(Math.round(sweHi)) + ".</p>" : "") +
      details("The numbers", table(["Year", "Scored", "Highest that year"], S.years.map(function (y) { var b = S.nByYear[y]; return [y, b.n, b.max == null ? "none" : b.max.toFixed(1)]; }), 1));
    document.getElementById("sb3").innerHTML = s3;

    var P2 = S.pairs, models = P2.map(function (p) { return p.entry.model_name; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var near = P2.filter(function (p) { return Math.abs(p.gap) <= 1; }).length;
    var pos = P2.some(function (p) { return p.gap > 0; }), neg = P2.some(function (p) { return p.gap < 0; });
    var diff = P2.filter(function (p) { return p.labSet.lvl && p.indSet.lvl && p.labSet.lvl !== p.indSet.lvl; });
    var s4 = "<p>" + n(models.length) + " releases were graded twice on the same benchmark: once by the releasing lab, once by Epoch, giving " + n(P2.length) + " pairs.</p>" +
      '<ul class="legend"><li><span class="sw sw-lab" aria-hidden="true"></span>LAB: reported by the lab</li><li><span class="sw sw-ind" aria-hidden="true"></span>IND: measured by Epoch</li></ul>' +
      "<p>" + n(near) + " of the " + P2.length + " pairs sit within a single point" + (pos && neg ? ", and the gaps run both ways." : ".") +
      (diff.length ? " In " + n(diff.length) + " pairs (" + esc(joinAnd(diff.map(function (p) { return p.entry.model_name; }))) + ") the lab and Epoch ran different reasoning settings, so those gaps include a settings difference." : "") + "</p>" +
      "<p>With so few pairs this is not a test of whether labs overstate. The record keeps both numbers and never averages them.</p>" +
      details("The numbers, with settings as written", table(["Model", "Benchmark", "LAB", "IND", "Lab setting", "Epoch setting"], P2.map(function (p) {
        return [p.entry.model_name, BS.BENCH_NAMES[p.bench], p.lab.value, p.ind.value, p.lab.configuration || "not stated", p.ind.configuration || "not stated"];
      }), 9));
    document.getElementById("sb4").innerHTML = s4;

    var cnt = {}, ow = {};
    S.E.forEach(function (e) { cnt[e.org] = (cnt[e.org] || 0) + 1; if (e.availability_class === "open_weights") { ow[e.org] = (ow[e.org] || 0) + 1; } });
    var s5 = "<p>Every entry again, now split by lab and stacked by quarter, on the same time axis and the same scale. Panels follow each lab's first entry on record, not a ranking.</p>" +
      "<p>Because ByteDance, Tencent and Baidu are not tracked, the record cannot support a comparison between countries.</p>" +
      '<p><a href="./explorer.html">Open the record</a> to filter by lab, country, type and date.</p>' +
      details("The numbers", table(["Lab", "Country", "Entries", "Open weights", "First on record"], S.labs.map(function (o) {
        return [BS.ORG_NAMES[o], BS.ORG_COUNTRY[o], cnt[o] || 0, ow[o] || 0, S.first[o]];
      }), 2));
    document.getElementById("sb5").innerHTML = s5;

    var dek = document.getElementById("dek");
    dek.innerHTML = "A public record of AI model releases from twelve tracked labs. It starts on " + n(S.E[0].date) +
      ", the day ChatGPT launched, and holds " + n(S.E.length) + " entries. " +
      '<a class="skipto" href="#findings">Skip to the findings</a>';
  }

  /* ======================= findings ======================= */
  function svgOpen(w, h, label) { return '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label) + '">'; }
  function shareChart(get, years, label, hatchRest, restLabel) {
    var w = 430, rowH = 30, h = years.length * rowH + 6, x0 = 46, x1 = 300, s = svgOpen(w, h, label);
    s += '<defs><pattern id="hp' + label.length + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#f0f0ec"/><line x1="0" y1="0" x2="0" y2="5" stroke="#14161b" stroke-width="1.6"/></pattern></defs>';
    years.forEach(function (y, i) {
      var b = get(y), yy = i * rowH + 4, wd = b.den ? (x1 - x0) * b.num / b.den : 0;
      s += '<text x="0" y="' + (yy + 16) + '" font-size="14" font-weight="700" fill="#14161b">' + y + "</text>";
      s += '<rect x="' + x0 + '" y="' + yy + '" width="' + (x1 - x0) + '" height="20" fill="' + (hatchRest ? "url(#hp" + label.length + ")" : "#f0f0ec") + '" stroke="#14161b" stroke-width="1.5"/>';
      s += '<rect x="' + x0 + '" y="' + yy + '" width="' + wd.toFixed(1) + '" height="20" fill="#14161b"/>';
      s += '<text x="' + (x1 + 10) + '" y="' + (yy + 15) + '" font-size="14" fill="#14161b"><tspan font-weight="700">' + BS.pct(b.num, b.den) + "%</tspan> " + b.num + " of " + b.den + "</text>";
    });
    return s + "</svg>";
  }
  function paceChart() {
    var yr = S.yearly, w = 640, h = 250, max = Math.max.apply(null, yr.map(function (y) { return y.releases; }));
    var bw = 72, gap = (w - 20 - yr.length * bw) / (yr.length - 1), s = svgOpen(w, h, "Releases per year");
    var sy = function (v) { return 200 - v / max * 170; };
    yr.forEach(function (y, i) {
      var x = 10 + i * (bw + gap), part = y.year === S.curY;
      s += '<rect x="' + x + '" y="' + sy(y.releases).toFixed(1) + '" width="' + bw + '" height="' + (200 - sy(y.releases)).toFixed(1) + '" fill="' + (part ? "#f0f0ec" : "#14161b") + '"' + (part ? ' stroke="#14161b" stroke-width="2.5"' : "") + "/>";
      s += '<text x="' + (x + bw / 2) + '" y="' + (part ? sy(y.releases) + 30 : sy(y.releases) - 10).toFixed(1) + '" text-anchor="middle" font-family="Besley, Georgia, serif" font-weight="800" font-size="24" fill="#14161b">' + y.releases + "</text>";
      s += '<text x="' + (x + bw / 2) + '" y="224" text-anchor="middle" font-size="14" fill="#3c3f47">' + y.year + (part ? ", so far" : "") + "</text>";
      if (y.year === S.prevY) {
        var ly = sy(S.prevN);
        s += '<line x1="' + (x - 6) + '" x2="' + (x + bw * 2 + gap + 6) + '" y1="' + ly.toFixed(1) + '" y2="' + ly.toFixed(1) + '" stroke="#1f44d6" stroke-width="2.5"/>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (ly + 18).toFixed(1) + '" text-anchor="middle" font-size="14" fill="#f0f0ec" font-weight="700">' + S.prevN + "</text>";
      }
    });
    s += '<line x1="0" x2="' + w + '" y1="201" y2="201" stroke="#14161b" stroke-width="2"/>';
    return s + "</svg>";
  }
  function climbChart() {
    var w = 520, h = 230, pts = S.gpqaPts, tx = function (d) { return 34 + (BS.dayNum(d) - BS.dayNum(pts[0].date)) / Math.max(1, BS.dayNum(S.E[S.E.length - 1].date) - BS.dayNum(pts[0].date)) * (w - 44); };
    var ys = function (v) { return 206 - v / 100 * 186; }, s = svgOpen(w, h, "Independent GPQA Diamond scores and the highest so far");
    [0, 50, 100].forEach(function (v) { s += '<line x1="34" x2="' + w + '" y1="' + ys(v) + '" y2="' + ys(v) + '" stroke="' + (v ? "rgba(20,22,27,.14)" : "#14161b") + '" stroke-width="' + (v ? 1 : 1.5) + '"/><text x="26" y="' + (ys(v) + 4) + '" text-anchor="end" font-size="13" fill="#5f626a">' + v + "</text>"; });
    pts.forEach(function (p) { s += '<circle cx="' + tx(p.date).toFixed(1) + '" cy="' + ys(p.value).toFixed(1) + '" r="2.6" fill="#7e828a"/>'; });
    var d = "", run = -1;
    pts.forEach(function (p) { if (p.value > run) { d += (run < 0 ? "M" + tx(p.date).toFixed(1) + "," : "H" + tx(p.date).toFixed(1) + "V") + ys(p.value).toFixed(1); run = p.value; } });
    d += "H" + (w - 10);
    s += '<path d="' + d + '" fill="none" stroke="#14161b" stroke-width="2.5"/>';
    return s + "</svg>";
  }
  function pairsChart() {
    var P2 = S.pairs, w = 520, rowH = 32, h = P2.length * rowH + 34, lo = Math.floor((Math.min.apply(null, P2.map(function (p) { return Math.min(p.lab.value, p.ind.value); })) - 3) / 5) * 5;
    var xs = function (v) { return 150 + (v - lo) / (100 - lo) * (w - 170); }, s = svgOpen(w, h, "Lab-reported and independent scores, pair by pair");
    P2.forEach(function (p, i) {
      var y = 14 + i * rowH, a = xs(p.ind.value), b = xs(p.lab.value);
      s += '<text x="0" y="' + (y + 4) + '" font-size="13" fill="#14161b">' + esc(p.entry.model_name) + (p.bench === "swe-bench-verified" ? " (SWE)" : "") + "</text>";
      s += '<line x1="' + Math.min(a, b) + '" x2="' + Math.max(a, b) + '" y1="' + y + '" y2="' + y + '" stroke="#14161b" stroke-width="2"/>';
      s += '<circle cx="' + a + '" cy="' + y + '" r="5.5" fill="#14161b"/><rect x="' + (b - 5) + '" y="' + (y - 5) + '" width="10" height="10" fill="#f0f0ec" stroke="#14161b" stroke-width="2"/>';
    });
    var yb = P2.length * rowH + 12;
    [lo, 100].forEach(function (v) { s += '<text x="' + xs(v) + '" y="' + (yb + 12) + '" text-anchor="middle" font-size="13" fill="#5f626a">' + v + "</text>"; });
    return s + "</svg>";
  }
  function fillFindings() {
    var yr = {}; S.yearly.forEach(function (y) { yr[y.year] = y; });
    var full = S.years.filter(function (y) { return y !== S.years[0] && y !== S.curY; });
    var fa = full[0], fz = full[full.length - 1];
    var up = yr[fz].releases > yr[fa].releases ? "up from" : yr[fz].releases < yr[fa].releases ? "down from" : "the same as";
    var pap = S.byYear("paper"), sc = S.byYear("system_card"), D0 = S.D0, D1 = S.D1;
    var pp = function (b) { return { num: b.dis, den: b.dis + b.nd }; };
    var p0 = pp(pap[D0]), p1 = pp(pap[D1]), c0 = pp(sc[D0]), c1 = pp(sc[D1]);
    var dir = function (a, b) { return b > a ? "rose" : b < a ? "fell" : "held"; };
    var pdir = dir(BS.pct(p0.num, p0.den), BS.pct(p1.num, p1.den)), cdir = dir(BS.pct(c0.num, c0.den), BS.pct(c1.num, c1.den));
    var skP = S.skew("paper"), skC = S.skew("system_card");
    var skewS = function (sk, what) {
      return sk ? " In " + D1 + ", " + sk.k + " of the " + sk.n + " checked releases are from " + sk.mon + " or later, a period that holds " + sk.m +
        " of the year's " + sk.N + " releases. The checked releases lean toward the newest ones, so " + what + " may move as earlier " + D1 + " releases are checked." : "";
    };
    var par = S.params, m0 = par[D0], m1 = par[D1];
    var cap0 = Math.round(S.capByYear[D0]), cap1 = Math.round(S.capByYear[D1]);
    var P2 = S.pairs, near = P2.filter(function (p) { return Math.abs(p.gap) <= 1; }).length;
    var models = P2.map(function (p) { return p.entry.model_name; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var yrs4 = S.years.filter(function (y) { return y >= D0; });
    var html = "";
    html += '<article class="find lead-f"><h3>' + yr[fz].releases + " releases in " + fz + ", " + up + " " + yr[fa].releases + " in " + fa + "</h3>" +
      "<p>" + D1 + " is a partial year: " + n(S.curN) + " releases by " + n(S.asOf) + ", against " + n(S.prevN) + " by the same date in " + S.prevY + ", marked by the blue rule.</p>" +
      '<figure class="fig" data-ui>' + paceChart() + "</figure>" +
      '<p class="caveat">The twelve labs were chosen in July 2026 and applied back to 2022. Growth in release counts partly reflects that choice.</p></article>';
    html += '<article class="find mid-f"><h3>The highest independent GPQA Diamond score</h3><span class="big-n">' + cap0 + " to " + cap1 + '</span><span class="big-sub">' + D0 + " to " + D1 + "</span>" +
      '<p>Every one of these scores was measured by one evaluator, Epoch AI.</p><figure class="fig" data-ui>' + climbChart() + "</figure></article>";
    html += '<article class="find mid-f"><h3>Lab and Epoch, side by side</h3><p>' + models.length + " releases were graded both ways, giving " + P2.length + " pairs; " + near +
      " fall within a single point. That is too few pairs, run at different settings, to test whether labs overstate.</p>" +
      '<figure class="fig" data-ui>' + pairsChart() + '</figure><ul class="legend"><li><span class="sw sw-lab" aria-hidden="true"></span>LAB</li><li><span class="sw sw-ind" aria-hidden="true"></span>IND</li></ul></article>';
    html += '<article class="find"><h3>' + (pdir === "fell" ? "Fewer arrive with a paper" : pdir === "rose" ? "More arrive with a paper" : "Releases with a paper") + "</h3>" +
      "<p>In " + D0 + ", " + p0.num + " of " + p0.den + " researched releases had a paper on record (" + BS.pct(p0.num, p0.den) + "%). In " + D1 + " so far, " + p1.num + " of " + p1.den +
      " (" + BS.pct(p1.num, p1.den) + "%). Papers can come out weeks after a release, so recent years may rise.</p>" +
      '<figure class="fig" data-ui>' + shareChart(function (y) { return pp(pap[y]); }, yrs4, "Share of researched releases with a paper", true) + "</figure>" +
      '<p class="caveat">Solid: a paper on record. Hatched: we checked, none found. Releases not yet researched are left out.' + skewS(skP, "the share") + "</p></article>";
    html += '<article class="find"><h3>' + (cdir === "rose" ? "More arrive with a system card" : cdir === "fell" ? "Fewer arrive with a system card" : "Releases with a system card") + "</h3>" +
      "<p>" + c0.num + " of " + c0.den + " researched releases in " + D0 + " (" + BS.pct(c0.num, c0.den) + "%), then " + c1.num + " of " + c1.den + " in " + D1 + " so far (" + BS.pct(c1.num, c1.den) + "%).</p>" +
      '<figure class="fig" data-ui>' + shareChart(function (y) { return pp(sc[y]); }, yrs4, "Share of researched releases with a system card", true) + "</figure>" +
      '<p class="caveat">A link on record means the document exists. We do not grade what it says.' + skewS(skC, "the share") + "</p></article>";
    html += '<article class="find"><h3>' + (m1.has / m1.n < m0.has / m0.n ? "Fewer have a parameter count on record" : "Parameter counts on record") + "</h3>" +
      "<p>In " + D0 + ", " + m0.has + " of " + m0.n + " releases had a parameter count in Epoch AI's data (" + BS.pct(m0.has, m0.n) + "%). In " + D1 + " so far, " + m1.has + " of " + m1.n + " (" + BS.pct(m1.has, m1.n) + "%).</p>" +
      '<figure class="fig" data-ui>' + shareChart(function (y) { var b = par[y]; return { num: b.has, den: b.n }; }, yrs4, "Share of releases with a parameter count", false) + "</figure>" +
      '<p class="caveat">This share divides by all releases. Epoch often adds counts for recent models late, and we have not checked the blanks against the labs\' own pages.</p></article>';
    var grid = document.getElementById("find-grid");
    grid.innerHTML = html;
    var finds = [].slice.call(grid.querySelectorAll(".find"));
    if (!reduce && "IntersectionObserver" in window) {
      finds.forEach(function (f) { f.classList.add("pre"); });
      var io = new IntersectionObserver(function (list) {
        list.forEach(function (en) { if (en.isIntersecting) { en.target.classList.remove("pre"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      finds.forEach(function (f) { io.observe(f); });
    }
  }

  /* ======================= the lookup ======================= */
  function wireLookup() {
    var q = document.getElementById("q"), out = document.getElementById("hits");
    function row(e) {
      return '<li><span class="d">' + esc(e.date) + '</span><span class="m"><a href="./explorer.html?entry=' + encodeURIComponent(e.id) + '">' + esc(e.model_name) +
        '</a></span><span class="o">' + esc(BS.ORG_NAMES[e.org]) + "</span></li>";
    }
    function run() {
      var v = q.value.trim().toLowerCase();
      var list = S.E.slice().reverse();
      if (v) { list = list.filter(function (e) { return (e.model_name + " " + (e.variants || []).join(" ") + " " + e.id).toLowerCase().indexOf(v) >= 0; }); }
      var html = list.slice(0, 7).map(row).join("");
      if (!v) { html = '<li><span class="none">Newest on record</span></li>' + html; }
      else if (!list.length) { html = '<li><span class="none">No entry matches “' + esc(q.value.trim()) + '”. The record covers twelve tracked labs.</span></li>'; }
      else { html += '<li><span class="none"><a href="./explorer.html?q=' + encodeURIComponent(q.value.trim()) + '">See all ' + list.length + " matches in the record</a></span></li>"; }
      out.innerHTML = html;
    }
    var tm = null;
    q.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(run, 90); });
    q.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { location.href = "./explorer.html?q=" + encodeURIComponent(q.value.trim()); } });
    run();
  }

  /* ======================= boot ======================= */
  function boot(d) {
    D = d; S = derive(d);
    readColors();
    buildMarks();
    fillSteps();
    fillFindings();
    wireLookup();
    var start = function () {
      layoutAll();
      introStart = performance.now();
      wireScroll();
      schedule();
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      if (window.gsap) { start(); } else { window.addEventListener("load", start, { once: true }); }
    });
    hit.addEventListener("pointermove", onMove);
    hit.addEventListener("pointerdown", onMove);
    hit.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") { hideTip(); } });
    hit.addEventListener("keydown", onKey);
    hit.addEventListener("blur", function () { setTimeout(function () { if (!tip.contains(document.activeElement)) { hideTip(); } }, 0); });
    var rt = null, lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (narrow && Math.abs(window.innerWidth - lastW) < 2) { return; } /* phone toolbar resize: keep layout */
        lastW = window.innerWidth;
        layoutAll();
        if (window.ScrollTrigger) { window.ScrollTrigger.refresh(); }
      }, 160);
    });
  }
  BS.renderFooter();
  BS.loadAll().then(boot).catch(function (err) {
    var p = document.createElement("p");
    p.className = "load-err";
    p.textContent = "The record could not be loaded in this session (" + (err && err.message ? err.message : "unknown error") + "). Reloading the page retries.";
    G.appendChild(p);
    if (window.console) { console.error(err); }
  });
})();
