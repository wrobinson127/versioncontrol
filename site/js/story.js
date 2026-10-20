/* The story: one persistent canvas of release marks that morphs as the
   reader scrolls, from one row per lab (the hero) through five views:
   releases by year, what each lab published, independent scores, the lab's
   number beside Epoch's, and twelve labs on one time axis. Each view
   finishes forming as its step text reaches the middle of the screen, and
   each settled view can be explored: hover, tap or the arrow keys read a
   mark's record, and a click or Enter opens it in the explorer.

   CSS sticky holds the graphic; GSAP ScrollTrigger reports each step's
   scroll progress (when it is missing, an IntersectionObserver steps between
   finished views); the canvas draws render(P), a pure function of scroll
   position, so fast or reversed scrolling cannot corrupt the picture. The
   step text, the findings and the text version are in the page already; this
   script only draws, labels the chart and makes it explorable. Every number
   is counted from the published files at load. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc;
  CR.initShell();

  var reduce = CR.reducedMotion();
  var G = document.getElementById("graphic");
  var cv = document.getElementById("cv");
  var ctx = cv.getContext("2d");
  var ov = document.getElementById("ov");
  var ovb = document.getElementById("ovb");
  var hit = document.getElementById("hit");
  var tip = document.getElementById("tip");
  var live = document.getElementById("live");
  var mctx = document.createElement("canvas").getContext("2d");
  var TAU = Math.PI * 2;
  var NV = 6;
  var C = {};
  var S = null;
  var marks = [], emark = {};
  var W = 0, H = 0, DPR = 1, narrow = false, region = 0, LW0 = 132;
  var R = [], geo = [];
  var prog = [0, 0, 0, 0, 0, 0];
  var P = 0, Pt = 0, raf = 0, intro = reduce ? 1 : 0, introStart = 0;
  var shownV = -1, activeStep = -1;
  var focusList = [], focusIdx = -1, tipMark = null;

  var SHORT = { "openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google", "meta": "Meta", "xai": "xAI", "mistral": "Mistral",
    "deepseek": "DeepSeek", "alibaba-qwen": "Qwen", "moonshot": "Moonshot", "zai": "Z.ai", "cohere": "Cohere", "amazon": "Amazon" };
  var SLOTS = CR.DISC_SLOTS;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ["ground", "surface", "text", "muted", "faint", "rule", "border", "accent", "accent-text", "ind", "lab", "disc-yes", "disc-no", "disc-nr", "mark-off", "control-strong"].forEach(function (k) {
      C[k] = cs.getPropertyValue("--" + k).trim();
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hash(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  var FONT_H = "600 13px 'Mona Sans', system-ui, sans-serif", FONT_B = "400 12.5px 'Mona Sans', system-ui, sans-serif";
  function measure(t, font) { mctx.font = font; return mctx.measureText(t).width * 1.04; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function isoWeek(d) {
    var t = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    var wk = Math.ceil(((t - y0) / 86400000 + 1) / 7);
    var mon = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) - (day - 1)));
    return { key: t.getUTCFullYear() + "-W" + pad2(wk), monday: mon.toISOString().slice(0, 10) };
  }

  /* ======================= data ======================= */
  function derive(D) {
    var E = D.releases.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id < b.id ? -1 : 1); });
    var rows = D.views.disclosure_matrix.rows, cells = {};
    rows.forEach(function (r) { cells[r.entry_id] = r.cells; });
    var labs = CR.ORG_ORDER.filter(function (o) { return E.some(function (e) { return e.org === o; }); });
    var series = {};
    D.views.trajectory.series.forEach(function (s) { series[s.benchmark + "|" + s.source_class] = s; });
    var gpqa = {}, gpqaPts = (series["gpqa-diamond|INDEPENDENT"] || { points: [] }).points.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    gpqaPts.forEach(function (p) { gpqa[p.entry_id] = p; });
    var asOf = D.asOf, curY = asOf.slice(0, 4), prevY = String(+curY - 1);
    var prevCut = asOf.slice(5) === "02-29" ? prevY + "-02-28" : prevY + asOf.slice(4);
    var dates = E.map(function (e) { return e.date; });
    var curN = dates.filter(function (x) { return x.slice(0, 4) === curY && x <= asOf; }).length;
    var prevN = dates.filter(function (x) { return x.slice(0, 4) === prevY && x <= prevCut; }).length;
    var wk = {}, wkMon = {}, bw = null;
    dates.forEach(function (x) { var w = isoWeek(x); wk[w.key] = (wk[w.key] || 0) + 1; wkMon[w.key] = w.monday; });
    Object.keys(wk).sort().forEach(function (k) { if (!bw || wk[k] > wk[bw]) { bw = k; } });
    var years = D.views.cadence.yearly.map(function (y) { return y.year; });
    var pairs = CR.pairs(D).filter(function (p) { return p.e._rel; });
    pairs.forEach(function (p) { p.labSet = CR.labSetting(p.lab.configuration); p.indSet = CR.indSetting(p.ind.configuration); });
    return { D: D, E: E, cells: cells, labs: labs, gpqa: gpqa, gpqaPts: gpqaPts, asOf: asOf, curY: curY, prevY: prevY, prevCut: prevCut,
      curN: curN, prevN: prevN, bw: { n: wk[bw], monday: wkMon[bw] }, years: years, yearly: D.views.cadence.yearly, pairs: pairs,
      dm: D.views.disclosure_matrix, medGap: D.views.tiles.median_gap_days_this_year };
  }

  /* ======================= marks ======================= */
  /* one mark per release; four disclosure cells and the pair marks travel
     hidden with their release until their view separates them */
  function buildMarks() {
    marks = []; emark = {};
    S.E.forEach(function (e, i) { var m = { t: "e", e: e, i: i, st: [], dl: [] }; marks.push(m); emark[e.id] = m; });
    S.E.forEach(function (e) {
      var c = S.cells[e.id]; if (!c) { return; }
      SLOTS.forEach(function (s, k) { marks.push({ t: "d", e: e, k: k, cell: c[s[0]] || "not_researched", parent: emark[e.id], st: [], dl: [] }); });
    });
    S.pairs.forEach(function (p, j) {
      ["ind", "lab"].forEach(function (side) { marks.push({ t: "p", e: p.e, pair: p, j: j, side: side, parent: emark[p.e.id], st: [], dl: [] }); });
    });
  }

  /* ======================= geometry ======================= */
  function contentBox() {
    var gut = clamp(W * 0.03, 16, 40);
    var x0 = W > 1440 ? (W - 1440) / 2 + gut : gut;
    return { x0: x0, x1: W - x0, gut: gut };
  }
  function computeRects() {
    var gb = G.getBoundingClientRect();
    W = Math.round(gb.width); H = Math.round(gb.height);
    narrow = W < 900;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ov.setAttribute("viewBox", "0 0 " + W + " " + H);
    ovb.setAttribute("viewBox", "0 0 " + W + " " + H);
    var cb = contentBox();
    var stepsTop = document.querySelector(".steps").getBoundingClientRect().top;
    var heroB = document.getElementById("hero-text").getBoundingClientRect().bottom - stepsTop;
    var band = narrow ? 50 : 66;
    LW0 = narrow ? 70 : 128;
    var r0 = { x0: cb.x0 + LW0, x1: cb.x1, y0: heroB + band + (narrow ? 8 : 12), y1: H - (narrow ? 40 : 60) };
    var minH = narrow ? 12 * 22 : 12 * 24;
    if (r0.y1 - r0.y0 < minH) { r0.y0 = r0.y1 - minH; }
    region = narrow ? Math.round(H * 0.56) : H;
    var rs = narrow ? { x0: cb.x0, x1: cb.x1, y0: 12, y1: region - 14 } : { x0: cb.x0 + Math.min(400, W * 0.3) + 56, x1: cb.x1, y0: 28, y1: H - 58 };
    R = [r0, rs, rs, rs, rs, rs];
  }
  function timeScale(x0, x1) {
    var d0 = CR.dayNum(S.E[0].date) - 12, d1 = CR.dayNum(S.E[S.E.length - 1].date) + 12;
    return function (dt) { return x0 + (CR.dayNum(dt) - d0) / (d1 - d0) * (x1 - x0); };
  }
  function set(m, v, x, y, r, sty, a) { m.st[v] = { x: x, y: y, r: r, sty: sty, a: a }; }

  /* view 0: one row per lab, a swarm on the time axis */
  function layV0() {
    var r0 = R[0], n = S.labs.length, rowH = (r0.y1 - r0.y0) / n, tx = timeScale(r0.x0, r0.x1);
    var byLab = {};
    S.E.forEach(function (e) { (byLab[e.org] = byLab[e.org] || []).push(emark[e.id]); });
    var rad = narrow ? clamp(rowH * 0.12, 2.2, 3) : clamp(rowH * 0.15, 3, 4.4);
    /* dots keep their size; the few that cannot fit in a busy week are
       pressed against the band edge, overlapping slightly */
    for (var li = 0; li < n; li++) {
      var list = byLab[S.labs[li]] || [], placed = [];
      for (var i = 0; i < list.length; i++) {
        var m = list[i], x = tx(m.e.date), cand = [0], iv = [];
        for (var j = placed.length - 1; j >= 0; j--) {
          var p = placed[j], dx = x - p.x, Dd = rad * 2 + 0.9;
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
        var lim = rowH / 2 - rad - 0.5;
        if (Math.abs(y) > lim) { y = (y < 0 ? -1 : 1) * (lim - hash(i + li * 97) * rad * 0.8); }
        placed.push({ x: x, y: y });
        set(m, 0, x, r0.y0 + rowH * (li + 0.5) + y, rad, "rel", 1);
      }
    }
    geo[0] = { rowH: rowH, tx: tx, rad: rad };
  }

  /* view 1: releases stacked by calendar year */
  function layV1() {
    var r = R[1], years = S.years, n = years.length, top = narrow ? 46 : 64, bot = narrow ? 24 : 34;
    var slotW = (r.x1 - r.x0) / n, colW = slotW * (narrow ? 0.84 : 0.7), groups = {}, max = 0;
    S.E.forEach(function (e) { (groups[e.date.slice(0, 4)] = groups[e.date.slice(0, 4)] || []).push(emark[e.id]); });
    years.forEach(function (y) { max = Math.max(max, (groups[y] || []).length); });
    var avH = r.y1 - r.y0 - top - bot, best = { s: 0, c: 1 };
    for (var c = 2; c <= 40; c++) { var s = Math.min(colW / c, avH / Math.ceil(max / c)); if (s > best.s) { best = { s: s, c: c }; } }
    var s1 = best.s, cc = best.c, base = r.y1 - bot, cols = [];
    years.forEach(function (y, i) {
      var list = groups[y] || [];
      var cx0 = r.x0 + slotW * i + (slotW - cc * s1) / 2;
      list.forEach(function (m, k) { set(m, 1, cx0 + (k % cc + 0.5) * s1, base - (Math.floor(k / cc) + 0.5) * s1, s1 * 0.4, "rel", 1); });
      cols.push({ y: y, x0: cx0, x1: cx0 + cc * s1, cx: cx0 + cc * s1 / 2, top: base - Math.ceil(list.length / cc) * s1, n: list.length });
    });
    geo[1] = { base: base, s: s1, c: cc, cols: cols };
  }

  /* view 2: each release splits into four document cells, lab by lab */
  function layV2() {
    var r = R[2], lw = narrow ? 64 : 118, hh = narrow ? 52 : 62, foot = narrow ? 46 : 36, gapB = narrow ? 7 : 18, gapR = narrow ? 5 : 8;
    var bw = (r.x1 - r.x0 - lw - gapB * 3) / 4;
    var counts = S.labs.map(function (o) { return S.E.filter(function (e) { return e.org === o && S.cells[e.id]; }).length; });
    var avH = r.y1 - r.y0 - hh - foot, s = 16, per = 1;
    for (; s > 3; s -= 0.25) {
      per = Math.floor(bw / s); if (per < 1) { continue; }
      var tot = 0; counts.forEach(function (c) { tot += Math.max(1, Math.ceil(c / per)) * s; });
      if (tot + gapR * (counts.length - 1) <= avH) { break; }
    }
    var y = r.y0 + hh, rowsGeo = [], idx = {};
    S.labs.forEach(function (o, li) {
      var list = S.E.filter(function (e) { return e.org === o && S.cells[e.id]; });
      list.forEach(function (e, k) { idx[e.id] = { k: k, top: y }; });
      var h = Math.max(1, Math.ceil(list.length / per)) * s;
      rowsGeo.push({ o: o, top: y, h: h, n: list.length });
      y += h + gapR;
    });
    var bx = function (k) { return r.x0 + lw + k * (bw + gapB); };
    marks.forEach(function (m) {
      if (m.t !== "d") { return; }
      var p = idx[m.e.id]; if (!p) { return; }
      set(m, 2, bx(m.k) + (p.k % per + 0.5) * s, p.top + (Math.floor(p.k / per) + 0.5) * s, s * 0.4, m.cell, 1);
    });
    S.E.forEach(function (e) {
      var m = emark[e.id], p = idx[e.id];
      if (p) { set(m, 2, bx(0) + (p.k % per + 0.5) * s, p.top + (Math.floor(p.k / per) + 0.5) * s, s * 0.4, "rel", 0); }
      else { var s1 = m.st[1]; set(m, 2, s1.x, s1.y, s1.r, "rel", 0); }
    });
    geo[2] = { lw: lw, hh: hh, bw: bw, bx: bx, rows: rowsGeo, s: s, bottom: y };
  }

  /* view 3: the independent GPQA Diamond scores, and the highest so far */
  function layV3() {
    var r = R[3], lx = r.x0 + (narrow ? 30 : 40), tx = timeScale(lx, r.x1);
    var yTop = r.y0 + (narrow ? 22 : 40), yBot = r.y1 - (narrow ? 50 : 66);
    var rug0 = yBot + (narrow ? 22 : 28), rug1 = r.y1 - 4;
    var ys = function (v) { return yBot - v / 100 * (yBot - yTop); };
    var rr = narrow ? 3.2 : 4.4;
    S.E.forEach(function (e, i) {
      var m = emark[e.id], p = S.gpqa[e.id];
      if (p) { set(m, 3, tx(e.date), ys(p.value), rr, "ind", 1); }
      else { set(m, 3, tx(e.date), rug0 + hash(i) * (rug1 - rug0), narrow ? 1.5 : 2, "off", 0.85); }
    });
    geo[3] = { tx: tx, ys: ys, yTop: yTop, yBot: yBot, lx: lx };
  }

  /* view 4: the lab's number beside Epoch's, one row per pair */
  function layV4() {
    var r = R[4], n = S.pairs.length, vals = [];
    S.pairs.forEach(function (p) { vals.push(p.lab.value, p.ind.value); });
    var lo = Math.floor((Math.min.apply(null, vals) - (narrow ? 14 : 6)) / 5) * 5, hi = 100;
    var lw = narrow ? 0 : Math.min(220, (r.x1 - r.x0) * 0.26);
    var px0 = r.x0 + lw + (narrow ? 6 : 24), px1 = r.x1 - (narrow ? 64 : 24);
    var xs = function (v) { return px0 + (v - lo) / (hi - lo) * (px1 - px0); };
    var top = r.y0 + (narrow ? 44 : 64), foot = narrow ? 8 : 24;
    var rowH = Math.min(narrow ? 62 : 92, (r.y1 - foot - top) / Math.max(1, n)), rad = narrow ? 5 : 6.5;
    var rowsGeo = S.pairs.map(function (p, j) { return { y: top + rowH * (j + (narrow ? 0.56 : 0.42)), p: p }; });
    marks.forEach(function (m) {
      if (m.t !== "p") { return; }
      var g = rowsGeo[m.j];
      set(m, 4, xs(m.side === "ind" ? m.pair.ind.value : m.pair.lab.value), g.y, m.side === "ind" ? rad : rad * 1.15, m.side, 1);
    });
    S.E.forEach(function (e) { var m = emark[e.id], s3 = m.st[3]; set(m, 4, s3.x, s3.y, s3.r, s3.sty, 0); });
    geo[4] = { xs: xs, lo: lo, hi: hi, top: top, rowH: rowH, rows: rowsGeo, lw: lw, px0: px0, px1: px1 };
  }

  /* view 5: twelve panels, stacked by quarter, one time axis, one scale */
  function layV5() {
    var r = R[5], cols = narrow ? 3 : 4, rows = Math.ceil(S.labs.length / cols);
    var gx = narrow ? 12 : 26, gy = narrow ? 10 : 18, th = narrow ? 34 : 54;
    var pw = (r.x1 - r.x0 - gx * (cols - 1)) / cols, ph = (r.y1 - r.y0 - gy * (rows - 1)) / rows;
    var q0 = +S.E[0].date.slice(0, 4) * 4 + Math.floor((+S.E[0].date.slice(5, 7) - 1) / 3);
    var qe = S.E[S.E.length - 1].date, q1 = +qe.slice(0, 4) * 4 + Math.floor((+qe.slice(5, 7) - 1) / 3);
    var nq = q1 - q0 + 1, stacks = {}, max = 0;
    S.E.forEach(function (e) {
      var m = emark[e.id], q = +e.date.slice(0, 4) * 4 + Math.floor((+e.date.slice(5, 7) - 1) / 3) - q0, k = e.org + "|" + q;
      stacks[k] = (stacks[k] || 0) + 1; max = Math.max(max, stacks[k]); m._q = q; m._k = stacks[k] - 1;
    });
    var cw = pw / nq, s = Math.min(cw, (ph - th - 4) / max), pIdx = {};
    var panels = S.labs.map(function (o, i) {
      var p = { o: o, x: r.x0 + (i % cols) * (pw + gx), y: r.y0 + Math.floor(i / cols) * (ph + gy), w: pw };
      p.base = p.y + ph - th; pIdx[o] = p; return p;
    });
    S.E.forEach(function (e) { var m = emark[e.id], p = pIdx[e.org]; set(m, 5, p.x + (m._q + 0.5) * cw, p.base - (m._k + 0.5) * s, s * 0.4, "rel", 1); });
    geo[5] = { panels: panels, cw: cw, q0: q0, nq: nq, s: s };
  }

  /* hidden companions follow their release; a left-to-right stagger per transition */
  function finishLayout() {
    marks.forEach(function (m) {
      if (m.t === "e") { return; }
      for (var v = 0; v < NV; v++) {
        if (m.st[v]) { continue; }
        var p = m.parent.st[v];
        m.st[v] = { x: p.x, y: p.y, r: p.r, sty: m.t === "d" ? m.cell : m.side, a: 0 };
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
    shownV = -1; focusList = [];
    schedule();
  }

  /* ======================= drawing ======================= */
  function paint(x, y, r, sty, al) {
    ctx.globalAlpha = al;
    ctx.beginPath();
    switch (sty) {
      case "rel": ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = C.accent; ctx.fill(); break;
      case "off": ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = C["mark-off"]; ctx.fill(); break;
      case "ind": ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = C.ind; ctx.fill(); break;
      case "lab":
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.lab; ctx.stroke(); break;
      case "disclosed": roundSq(x, y, r); ctx.fillStyle = C["disc-yes"]; ctx.fill(); break;
      case "not_disclosed": roundSq(x, y, r * 0.86); ctx.lineWidth = 1.2; ctx.strokeStyle = C["disc-no"]; ctx.stroke(); break;
      default: ctx.moveTo(x - r * 0.6, y); ctx.lineTo(x + r * 0.6, y); ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.strokeStyle = C["disc-nr"]; ctx.stroke();
    }
  }
  function roundSq(x, y, r) {
    if (ctx.roundRect) { ctx.roundRect(x - r, y - r, 2 * r, 2 * r, Math.min(1.5, r * 0.25)); } else { ctx.rect(x - r, y - r, 2 * r, 2 * r); }
  }
  function draw() {
    raf = 0;
    if (!reduce && Math.abs(Pt - P) > 0.0005) { P += (Pt - P) * 0.2; raf = requestAnimationFrame(draw); } else { P = Pt; }
    if (intro < 1) {
      intro = clamp((performance.now() - introStart) / 1400, 0, 1);
      if (intro < 1 && !raf) { raf = requestAnimationFrame(draw); }
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var a = Math.min(NV - 1, Math.floor(P + 1e-6)), t = P - a;
    if (a === NV - 1 || t < 1e-4) { t = 0; }
    if (narrow && P > 0.001) { ctx.globalAlpha = Math.min(1, P * 1.6); ctx.fillStyle = C.ground; ctx.fillRect(0, 0, W, region); }
    /* on phones, once the marks have left the lower half, the pinned graphic
       is cut to its painted band so the steps below are never underneath it */
    var clip = narrow && P > 0.97 ? "inset(0 0 " + (H - region) + "px 0)" : "";
    if (G.style.clipPath !== clip) { G.style.clipPath = clip; }
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i], s0 = m.st[a], x, y, r, sty, al;
      if (t > 0) {
        var s1 = m.st[a + 1], e = ease(clamp((t - m.dl[a]) / (1 - 0.32), 0, 1));
        x = s0.x + (s1.x - s0.x) * e; y = s0.y + (s1.y - s0.y) * e; r = s0.r + (s1.r - s0.r) * e;
        al = s0.a + (s1.a - s0.a) * e; sty = e < 0.5 ? s0.sty : s1.sty;
      } else { x = s0.x; y = s0.y; r = s0.r; sty = s0.sty; al = s0.a; }
      if (a === 0 && t === 0 && intro < 1 && m.t === "e") {
        /* the first paint: the record fills in from ChatGPT's launch to today */
        var k = clamp((intro * 1.35 - (x - R[0].x0) / Math.max(1, R[0].x1 - R[0].x0)) / 0.35, 0, 1);
        r *= k;
      }
      m.cx = x; m.cy = y; m.cr = r; m.ca = al;
      if (al < 0.01 || r < 0.2) { continue; }
      paint(x, y, r, sty, al);
    }
    if (tipMark && tipMark.ca > 0.4) {
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(tipMark.cx, tipMark.cy, tipMark.cr + 4, 0, TAU);
      ctx.lineWidth = 2; ctx.strokeStyle = C.text; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* labels belong to a finished view: hidden while the marks travel */
    var fr = P - Math.floor(P), vNow = fr < 0.18 ? Math.floor(P) : fr > 0.82 ? Math.ceil(P) : -1;
    if (vNow !== shownV) { showView(vNow); }
    setActiveStep(Math.round(P));
  }
  function schedule() { if (!raf && W) { raf = requestAnimationFrame(draw); } }

  /* ======================= labels (SVG, one group per view) ======================= */
  function T(x, y, s, cls, anchor) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (cls ? ' class="' + cls + '"' : "") + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + esc(s) + "</text>";
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
  /* callouts sit in a band above the plot and drop an elbow leader to the
     mark or a bracket over a span; widths are measured and overlaps resolved */
  function callouts(list, r, bandTop) {
    var s = "", cb = contentBox(), minL = narrow ? cb.x0 : r.x0 - 40;
    list.forEach(function (c) { c.w = Math.max(measure(c.h, FONT_H), measure(c.b, FONT_B)) + 2; c.left = c.tx - c.w / 2; });
    list.sort(function (a, b) { return a.tx - b.tx; });
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
      var lx = clamp(c.tx, c.left + 3, c.left + c.w - 3), yl = bandTop + 35, ye = c.br ? r.y0 - 12 : r.y0 - 5;
      var g = '<g class="call">' + T(c.left, bandTop + 12, c.h, "c-h") + T(c.left, bandTop + 27, c.b, "c-b");
      if (c.br) { g += '<polyline class="bracket" points="' + [[c.br[0], ye + 5], [c.br[0], ye], [c.br[1], ye], [c.br[1], ye + 5]].map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>'; }
      var pts = Math.abs(lx - c.tx) < 1 ? [[lx, yl], [c.tx, ye]] : [[lx, yl], [lx, Math.max(yl, ye - 6)], [c.tx, ye]];
      if (c.ty != null) { pts.push([c.tx, c.ty - c.r - 4]); }
      g += '<polyline class="lead" points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
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
      s += T(r.x0 - (narrow ? 8 : 14), yc + 4, narrow ? SHORT[o] : CR.ORG_NAMES[o], "row-l", "end");
    });
    s += yearTicks(g.tx, r.y0 - 4, r.y1 + 2, r.y1 + (narrow ? 18 : 22), true);
    var f = S.E[0], l = S.E[S.E.length - 1], fm = emark[f.id].st[0], lm = emark[l.id].st[0];
    var wk0 = S.bw.monday, wkx0 = g.tx(wk0) - 2, wkx1 = g.tx(CR.dateOf(CR.dayNum(wk0) + 6)) + 2;
    s += '<rect class="band" x="' + wkx0.toFixed(1) + '" y="' + (r.y0 - 4) + '" width="' + Math.max(3, wkx1 - wkx0).toFixed(1) + '" height="' + (r.y1 - r.y0 + 6).toFixed(1) + '"/>';
    var list = [{ tx: fm.x, ty: fm.y, r: fm.r, h: f.model_name, b: narrow ? f.date : f.date + ". The record starts here." },
      { tx: (wkx0 + wkx1) / 2, h: narrow ? "Busiest week" : "Busiest week: " + S.bw.n + " releases", b: narrow ? S.bw.n + " releases" : "week of " + wk0 }];
    if (!narrow) {
      var bx0 = g.tx(S.curY + "-01-01"), bx1 = g.tx(S.asOf < l.date ? S.asOf : l.date);
      list.push({ tx: (bx0 + bx1) / 2, br: [bx0, bx1], h: S.curY + " so far: " + S.curN + " releases", b: "median gap between releases: " + S.medGap + " days" });
    }
    list.push({ tx: lm.x, ty: lm.y, r: lm.r, h: narrow ? "Newest" : "Newest: " + l.model_name, b: l.date });
    return s + callouts(list, r, r.y0 - (narrow ? 48 : 64));
  }
  function ov1() {
    var r = R[1], g = geo[1], s = "", yr = {};
    S.yearly.forEach(function (y) { yr[y.year] = y; });
    s += L(r.x0, g.base + 1, r.x1, g.base + 1, "ax-l");
    var ly = g.base - Math.ceil(S.prevN / g.c) * g.s;
    g.cols.forEach(function (c) {
      var y = yr[c.y] || { releases: 0 }, partial = c.y === S.curY;
      var top = partial ? Math.min(c.top, ly - (narrow ? 22 : 28)) : c.top;
      s += T(c.cx, g.base + (narrow ? 17 : 22), c.y + (partial ? (narrow ? "*" : ", so far") : ""), "ax-t", "middle");
      s += '<g class="call">' + T(c.cx, top - (narrow ? 20 : 26), String(y.releases), "c-big", "middle") + T(c.cx, top - (narrow ? 7 : 9), "releases", "c-b", "middle") + "</g>";
      if (c.y === S.prevY) {
        var nxt = g.cols.filter(function (k) { return k.y === S.curY; })[0];
        s += '<g class="call">' + L(c.x0 - 4, ly, nxt ? nxt.x1 + 4 : c.x1 + 4, ly, "bracket");
        s += T(nxt ? nxt.cx : c.x1 + 8, ly - 7, narrow ? S.prevN + " in " + S.prevY : S.prevN + " in " + S.prevY + " by " + S.prevCut.slice(5), "c-b", nxt ? "middle" : null) + "</g>";
      }
    });
    if (narrow) { s += T(r.x0, r.y1 + 8, "* " + S.curY + " so far, to " + S.asOf, "ax-t"); }
    return s;
  }
  function ov2() {
    var r = R[2], g = geo[2], s = "", counts = S.dm.counts;
    SLOTS.forEach(function (sl, k) {
      var c = counts[sl[0]], res = c.disclosed + c.not_disclosed, x = g.bx(k);
      s += T(x, r.y0 + 16, narrow ? { "System card": "Sys. card", "Model card": "Mod. card", "Usage policy": "Usage pol." }[sl[1]] || sl[1] : sl[1], "hd-t");
      if (narrow) { s += T(x, r.y0 + 32, CR.pct(c.disclosed, res) + "%", "hd-s") + T(x, r.y0 + 46, "of " + res, "hd-s"); }
      else { s += T(x, r.y0 + 34, c.disclosed + " of " + res + " checked", "hd-s") + T(x, r.y0 + 50, "(" + CR.pct(c.disclosed, res) + "%)", "hd-s"); }
    });
    g.rows.forEach(function (rw) {
      s += T(r.x0 + g.lw - (narrow ? 6 : 12), rw.top + Math.min(rw.h, g.s) / 2 + 4, narrow ? SHORT[rw.o] : CR.ORG_NAMES[rw.o], "row-l", "end");
    });
    /* the three states, decoded beside the marks they name */
    var x0 = narrow ? r.x0 : r.x0 + g.lw, lx = x0, ly = g.bottom + 14;
    var nr = marks.some(function (m) { return m.t === "d" && m.cell === "not_researched"; });
    [["disclosed", CR.DISC_WORDS.disclosed], ["not_disclosed", CR.DISC_WORDS.not_disclosed]].concat(nr ? [["not_researched", CR.DISC_WORDS.not_researched]] : []).forEach(function (it) {
      var wd = 14 + measure(it[1], FONT_B);
      if (lx > x0 && lx + wd > r.x1) { lx = x0; ly += 17; }
      s += '<g class="lg" transform="translate(' + lx.toFixed(1) + "," + (ly - 9).toFixed(1) + ')">' + legendGlyph(it[0]) + "</g>" + T(lx + 14, ly, it[1], "ax-t");
      lx += wd + (narrow ? 12 : 20);
    });
    return s;
  }
  function legendGlyph(state) {
    if (state === "disclosed") { return '<rect x="0" y="0" width="9" height="9" rx="1.5" class="lg-dy"/>'; }
    if (state === "not_disclosed") { return '<rect x="0.6" y="0.6" width="7.8" height="7.8" rx="1.5" class="lg-dn"/>'; }
    return '<line x1="1.5" x2="7.5" y1="4.5" y2="4.5" class="lg-dr"/>';
  }
  function ov3() {
    var r = R[3], g = geo[3], s = "";
    [0, 25, 50, 75, 100].forEach(function (v) {
      var y = g.ys(v);
      s += L(g.lx, y, r.x1, y, v === 0 ? "ax-l" : "ax-g") + T(g.lx - 8, y + 4, String(v), "ax-t", "end");
    });
    s += T(g.lx, g.yTop - (narrow ? 10 : 16), narrow ? "GPQA Diamond, independent" : "GPQA Diamond score, measured by Epoch AI (independent)", "hd-t");
    s += yearTicks(g.tx, 0, 0, g.yBot + (narrow ? 16 : 20), false);
    var pts = S.gpqaPts.filter(function (p) { return S.gpqa[p.entry_id] && emark[p.entry_id]; }), d = "", run = -1;
    pts.forEach(function (p) {
      var x = g.tx(p.date);
      if (p.value > run) { d += run < 0 ? "M" + x.toFixed(1) + "," + g.ys(p.value).toFixed(1) : "H" + x.toFixed(1) + "V" + g.ys(p.value).toFixed(1); run = p.value; }
    });
    d += "H" + g.tx(S.E[S.E.length - 1].date).toFixed(1);
    s += '<path class="climb" d="' + d + '"/>';
    var first = pts[0], top = pts.reduce(function (a, b) { return b.value > a.value ? b : a; }, pts[0]);
    if (first) {
      var fx = g.tx(first.date), fy = g.ys(first.value);
      s += '<g class="call">' + L(fx, fy - 8, fx, fy - (narrow ? 26 : 40), "lead") +
        T(fx - 2, fy - (narrow ? 32 : 46), narrow ? first.value.toFixed(1) : "First: " + first.model_name + ", " + first.value.toFixed(1), "c-h") + "</g>";
    }
    if (top) {
      var lab = narrow ? top.value.toFixed(1) : "Highest: " + top.model_name + ", " + top.value.toFixed(1);
      s += '<g class="call">' + T(Math.min(g.tx(top.date) - 10, r.x1 - measure(lab, FONT_H)), g.ys(top.value) - (narrow ? 12 : 18), lab, "c-h") + "</g>";
    }
    var nUn = S.E.length - S.E.filter(function (e) { return S.gpqa[e.id]; }).length;
    s += T(g.lx, r.y1 + (narrow ? 12 : 18), narrow ? nUn + " with no score sit below the axis. Not a zero." : nUn + " releases with no independent score, shown below the axis. Not a zero.", "ax-t");
    return s;
  }
  function ov4() {
    var r = R[4], g = geo[4], s = "", n = S.pairs.length;
    /* the decode: shape and tag carry provenance, the colour repeats it */
    var lx = narrow ? r.x0 : g.px0, ly = g.top - (narrow ? 34 : 46);
    [["lab", narrow ? "LAB: the lab" : "LAB: reported by the lab"], ["ind", narrow ? "IND: Epoch" : "IND: measured by Epoch AI"]].forEach(function (it) {
      s += '<g class="lg" transform="translate(' + (lx + 5).toFixed(1) + "," + (ly - 4).toFixed(1) + ')">' +
        (it[0] === "ind" ? '<circle r="5" class="lg-ind"/>' : '<path d="M0 -5.5L5.5 0L0 5.5L-5.5 0Z" class="lg-lab"/>') + "</g>" + T(lx + 15, ly, it[1], "ax-t");
      lx += 15 + measure(it[1], FONT_B) + (narrow ? 12 : 22);
    });
    s += T(lx, ly, narrow ? "gap: lab minus Epoch" : "Gap: the lab's number minus Epoch's", "ax-t");
    for (var v = g.lo; v <= g.hi; v += 5) {
      var x = g.xs(v);
      s += L(x, g.top - 8, x, g.top + g.rowH * n, "ax-g");
      if (v % 10 === 0 || !narrow) { s += T(x, g.top - 14, String(v), "ax-t", "middle"); }
    }
    if (!narrow) { s += T(r.x0 + g.lw, g.top - 14, "Score, axis cut at " + g.lo, "ax-t", "end"); }
    g.rows.forEach(function (rw) {
      var p = rw.p, xi = g.xs(p.ind.value), xl = g.xs(p.lab.value), bn = CR.BENCH[p.bench];
      var a = Math.min(xi, xl), b = Math.max(xi, xl), gap = Math.round((p.lab.value - p.ind.value) * 10) / 10;
      var gapT = (gap > 0 ? "+" : gap < 0 ? "−" : "") + Math.abs(gap).toFixed(1);
      s += '<g class="call">' + L(a, rw.y, b, rw.y, "dumb");
      if (narrow) { s += T(r.x0, rw.y - 15, p.e.model_name + ", " + bn, "c-h"); }
      else { s += T(r.x0 + g.lw, rw.y - 3, p.e.model_name, "c-h", "end") + T(r.x0 + g.lw, rw.y + 13, bn, "c-b", "end"); }
      var labLow = p.lab.value < p.ind.value;
      var loT = labLow ? "LAB " + p.lab.value : "IND " + p.ind.value, hiT = labLow ? "IND " + p.ind.value : "LAB " + p.lab.value;
      if (b - a < 4) { hiT = "LAB " + p.lab.value + ", IND " + p.ind.value; loT = ""; }
      if (loT) { s += T(a - 11, rw.y + 4, loT, "c-b", "end"); }
      s += T(b + 11, rw.y + 4, hiT, "c-b");
      /* the gap sits over its line; a line too short to carry it gets it after the values */
      if (narrow) { s += T(r.x1, rw.y - 15, gapT, "c-gap", "end"); }
      else if (b - a >= 40) { s += T((a + b) / 2, rw.y - 8, gapT, "c-gap", "middle"); }
      else { s += T(b + 11 + measure(hiT, FONT_B) + 8, rw.y + 4, "gap " + gapT, "c-gap"); }
      var differ = p.labSet.lvl && p.indSet.lvl && p.labSet.lvl !== p.indSet.lvl;
      s += T(narrow ? r.x0 : g.px0, rw.y + (narrow ? 20 : 25), "Lab: " + p.labSet.words + " / Epoch: " + p.indSet.words + (differ ? " (settings differ)" : ""), differ ? "ax-t ax-em" : "ax-t") + "</g>";
    });
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
      if (narrow) { s += T(p.x, p.base + 19, SHORT[p.o] + " " + cnt[p.o], "hd-t"); }
      else { s += T(p.x, p.base + 34, CR.ORG_NAMES[p.o], "hd-t") + T(p.x, p.base + 49, cnt[p.o] + " releases, " + CR.ORG_COUNTRY[p.o], "hd-s"); }
    });
    if (narrow) { s += T(R[5].x0, R[5].y1 + 6, "Ticks mark 1 January of 2024 and 2026; figures count releases.", "ax-t"); }
    return s;
  }
  /* guide lines and bands go on a layer behind the marks; labels in front */
  var BACK = /<line [^>]*class="ax-g"\/>|<rect class="band"[^>]*\/>/g;
  function buildOverlays() {
    var front = "", back = "";
    [ov0, ov1, ov2, ov3, ov4, ov5].forEach(function (f, i) {
      var inner = "";
      try { inner = f(); } catch (err) { if (window.console) { console.warn("labels for view " + i, err); } }
      back += '<g class="ovg" data-v="' + i + '">' + (inner.match(BACK) || []).join("") + "</g>";
      front += '<g class="ovg" data-v="' + i + '">' + inner.replace(BACK, "") + "</g>";
    });
    ov.innerHTML = front; ovb.innerHTML = back;
  }
  function showView(v) {
    shownV = v;
    [].forEach.call(document.querySelectorAll("#ov .ovg, #ovb .ovg"), function (g) { g.classList.toggle("on", +g.getAttribute("data-v") === v); });
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
    var h = document.getElementById("s" + v + "h");
    if (h && v > 0) { live.textContent = "The chart now shows: " + h.textContent + "."; }
  }

  /* ======================= tooltips and keyboard ======================= */
  /* every mark reads its record: name, lab, date, then the value the view
     draws, then each score on record with its LAB or IND tag and setting */
  function scoreRows(e, first) {
    var rows = [], benches = Object.keys(e._score || {}).sort(function (a, b) { return a === first ? -1 : b === first ? 1 : a < b ? -1 : 1; });
    benches.forEach(function (bk) {
      [["LAB_REPORTED", CR.labSetting], ["INDEPENDENT", CR.indSetting]].forEach(function (c) {
        var sc = e._score[bk][c[0]]; if (!sc) { return; }
        rows.push('<p class="t-row">' + esc(CR.BENCH[bk] || bk) + ' <b class="num">' + esc(sc.value) + "</b> " + CR.provTag(c[0]) +
          ' <span class="t-m">' + (c[0] === "LAB_REPORTED" ? "lab" : "Epoch") + " setting: " + esc(c[1](sc.configuration).words) + "</span></p>");
      });
    });
    return rows.length ? rows.join("") : '<p class="t-m">No benchmark score on record.</p>';
  }
  function tipHtml(m, v) {
    var e = m.e, h = '<p class="t-h">' + esc(e.model_name) + '</p><p class="t-s">' + esc(e._orgName) + ", " + esc(e.date) + ", " + esc(CR.AVAIL_NAMES[e.availability_class] || "") + "</p>";
    var link = '<p class="t-m">Enter or a click opens the record.</p>';
    if (m.t === "d") { return h + '<p class="t-row">' + SLOTS[m.k][1] + ": " + CR.discMark(m.cell) + "</p>" + link; }
    if (m.t === "p") { return h + scoreRows(e, m.pair.bench) + link; }
    if (v === 3 && !S.gpqa[e.id]) { return h + '<p class="t-m">No independent GPQA Diamond score on record.</p>' + scoreRows(e, "gpqa-diamond").replace('<p class="t-m">No benchmark score on record.</p>', "") + link; }
    return h + scoreRows(e, "gpqa-diamond") + link;
  }
  function placeTip(m) {
    tip.innerHTML = tipHtml(m, shownV);
    tip.classList.add("on");
    var tw = tip.offsetWidth, th = tip.offsetHeight, x = m.cx + 14, y = m.cy - th - 12;
    if (x + tw > W - 8) { x = m.cx - tw - 14; }
    if (x < 8) { x = 8; }
    if (y < 8) { y = m.cy + 16; }
    if (narrow && y + th > region) { y = Math.max(4, m.cy - th - 12); }
    tip.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
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
    if (m) { if (m !== tipMark) { tipMark = m; placeTip(m); schedule(); } hit.style.cursor = "pointer"; }
    else { hit.style.cursor = ""; if (ev.pointerType === "mouse") { hideTip(); } }
  }
  function visibleList() {
    if (focusList.length) { return focusList; }
    focusList = marks.filter(function (m) { return m.ca >= 0.5 && m.cr > 0.5; }).sort(function (a, b) { return a.cx - b.cx || a.cy - b.cy; });
    return focusList;
  }
  function open(m) { location.href = "explorer.html?id=" + encodeURIComponent(m.e.id); }
  function onKey(ev) {
    var list = visibleList();
    if (!list.length) { return; }
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10, Home: -1e6, End: 1e6 }[ev.key];
    if (step != null) {
      ev.preventDefault();
      focusIdx = focusIdx < 0 ? 0 : clamp(focusIdx + step, 0, list.length - 1);
      tipMark = list[focusIdx]; placeTip(tipMark); schedule();
      live.textContent = tip.textContent.replace("Enter or a click opens the record.", "");
    } else if (ev.key === "Enter" && tipMark) { open(tipMark); }
    else if (ev.key === "Escape" && tipMark) { ev.stopPropagation(); hideTip(); }
  }

  /* ======================= scroll: something says when ======================= */
  function setPt() {
    var p = 0;
    for (var k = 1; k < NV; k++) { p += reduce ? (prog[k] >= 0.5 ? 1 : 0) : prog[k]; }
    Pt = clamp(p, 0, NV - 1);
    if (reduce) { P = Pt; }
    schedule();
  }
  function midPct() {
    if (!narrow) { return 50; }
    var bar = document.querySelector(".topbar"), tb = document.querySelector(".tabbar");
    var top = (bar ? bar.offsetHeight : 0) + region, bot = window.innerHeight - (tb && getComputedStyle(tb).display !== "none" ? tb.offsetHeight : 0);
    return Math.round(100 * (top + bot) / 2 / window.innerHeight);
  }
  function wireScroll() {
    var steps = [].slice.call(document.querySelectorAll(".step"));
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      steps.forEach(function (el) {
        var k = +el.getAttribute("data-step");
        window.ScrollTrigger.create({
          trigger: el,
          /* the view finishes forming as the step's text reaches the middle
             of the screen: the viewport's middle on a desktop, the middle of
             the band under the pinned chart on a phone */
          start: "top bottom",
          end: function () { return "center " + midPct() + "%"; },
          onUpdate: function (self) { prog[k] = self.progress; setPt(); },
          onRefresh: function (self) { prog[k] = self.progress; setPt(); }
        });
      });
    } else if ("IntersectionObserver" in window) {
      /* without the library: finished views, one per step */
      var io = new IntersectionObserver(function () {
        steps.forEach(function (el) { var b = el.getBoundingClientRect(); prog[+el.getAttribute("data-step")] = (b.top + b.bottom) / 2 < window.innerHeight * midPct() / 100 ? 1 : 0; });
        setPt();
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
      steps.forEach(function (el) { io.observe(el); });
    }
  }

  /* ======================= boot ======================= */
  document.documentElement.classList.add("story-js");
  CR.load().then(function (D) {
    CR.addRecordToPalette(D);
    S = derive(D);
    readColors();
    buildMarks();
    var start = function () {
      if (W) { return; }
      layoutAll();
      introStart = performance.now();
      wireScroll();
      hit.hidden = false;
      G.classList.add("on");
      schedule();
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      if (window.gsap || document.readyState === "complete") { start(); } else { window.addEventListener("load", start, { once: true }); }
    });
    hit.addEventListener("pointermove", onMove);
    hit.addEventListener("pointerdown", onMove);
    hit.addEventListener("click", function () { if (tipMark && Math.abs(P - Math.round(P)) <= 0.02) { open(tipMark); } });
    hit.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") { hideTip(); } });
    hit.addEventListener("keydown", onKey);
    hit.addEventListener("blur", hideTip);
    document.addEventListener("vc:theme", function () { readColors(); schedule(); });
    var rt = null, lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!W) { return; }
        if (narrow && Math.abs(window.innerWidth - lastW) < 2) { return; } /* a phone toolbar resize keeps the layout */
        lastW = window.innerWidth;
        layoutAll();
        if (window.ScrollTrigger) { window.ScrollTrigger.refresh(); }
      }, 160);
    });
  }).catch(function (err) {
    var p = document.createElement("p");
    p.className = "load-error";
    p.textContent = "The chart could not load the record in this session (" + (err && err.message ? err.message : "unknown error") + "). The text on this page is complete without it; reloading the page retries.";
    G.appendChild(p);
    if (window.console) { console.error(err); }
  });
})();
