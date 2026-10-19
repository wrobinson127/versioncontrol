/* Broadsheet: figures for the methodology page. Each rule gets one figure
   drawn from the published files, so the prose sits beside the record it
   describes. Nothing is typed in: counts, dates and versions are read here. */
(function () {
  "use strict";
  var BS = window.BS, esc = BS.esc;
  var INK = "#14161b", INK2 = "#3c3f47", INK3 = "#5f626a", NR = "#8a8d94", API = "#7e828a", PAPER = "#f0f0ec";
  function svg(w, h, label, body) {
    return '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label) + '">' + body + "</svg>";
  }
  function t(x, y, s, o) {
    o = o || {};
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (o.size || 13) + '"' + (o.weight ? ' font-weight="' + o.weight + '"' : "") +
      ' fill="' + (o.fill || INK3) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") + ">" + esc(s) + "</text>";
  }
  function line(x1, y1, x2, y2, c, w) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + (c || INK) + '" stroke-width="' + (w || 1.5) + '"/>'; }
  var HATCH = '<defs><pattern id="pgh" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="' + PAPER + '"/><line x1="0" y1="0" x2="0" y2="4" stroke="' + INK + '" stroke-width="1.4"/></pattern></defs>';

  function put(id, html, cap) {
    var el = document.getElementById(id); if (!el) { return; }
    el.innerHTML = html + "<figcaption>" + cap + "</figcaption>";
  }

  function figScores(d) {
    var E = d.entries, pts = [];
    E.forEach(function (e) {
      (e.benchmarks || []).forEach(function (b) { if (b.benchmark === "gpqa-diamond") { pts.push({ e: e, b: b }); } });
    });
    var w = 700, h = 250, x0 = 34, x1 = w - 8, d0 = BS.dayNum(E[0].date), d1 = BS.dayNum(E[E.length - 1].date);
    var tx = function (dt) { return x0 + (BS.dayNum(dt) - d0) / (d1 - d0) * (x1 - x0); };
    var ys = function (v) { return 220 - v / 100 * 200; };
    var s = "";
    [0, 50, 100].forEach(function (v) { s += line(x0, ys(v), x1, ys(v), v ? "rgba(20,22,27,.14)" : INK, v ? 1 : 1.5) + t(x0 - 8, ys(v) + 4, String(v), { anchor: "end" }); });
    for (var y = +E[0].date.slice(0, 4) + 1; y <= +E[E.length - 1].date.slice(0, 4); y++) { s += t(tx(y + "-01-01"), 240, String(y), { anchor: "middle" }); }
    var nI = 0, nL = 0;
    pts.forEach(function (p) {
      var x = tx(p.e.date), yv = ys(p.b.value);
      if (p.b.provenance.source_class === "INDEPENDENT") { nI++; s += '<circle cx="' + x.toFixed(1) + '" cy="' + yv.toFixed(1) + '" r="3.6" fill="' + API + '"/>'; }
    });
    pts.forEach(function (p) {
      var x = tx(p.e.date), yv = ys(p.b.value);
      if (p.b.provenance.source_class !== "INDEPENDENT") { nL++; s += '<rect x="' + (x - 4.5).toFixed(1) + '" y="' + (yv - 4.5).toFixed(1) + '" width="9" height="9" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/>'; }
    });
    put("fig-r1", svg(w, h, "GPQA Diamond scores on record by source", s),
      "Every GPQA Diamond score on record: " + nI + ' tagged <span class="prov prov-ind">IND</span> (grey dots, measured by Epoch AI) and ' + nL +
      ' tagged <span class="prov">LAB</span> (squares, reported by the lab). Score, 0 to 100, by release date.');
  }

  function figDisclosure(d) {
    var rows = d.views.disclosure_matrix.rows, years = {};
    rows.forEach(function (r) { var y = r.date.slice(0, 4); (years[y] = years[y] || []).push(r.cells.system_card || "not_researched"); });
    var ys = Object.keys(years).sort(), per = 46, cell = 13, gap = 2, lx = 52, w = lx + per * (cell + gap) + 4;
    var ord = { disclosed: 0, not_disclosed: 1, not_researched: 2 }, s = HATCH, y = 6, tot = { disclosed: 0, not_disclosed: 0, not_researched: 0 };
    ys.forEach(function (yr) {
      var list = years[yr].slice().sort(function (a, b) { return ord[a] - ord[b]; });
      s += t(0, y + 11, yr, { weight: 700, fill: INK, size: 14 });
      list.forEach(function (st, i) {
        tot[st]++;
        var cx = lx + (i % per) * (cell + gap), cy = y + Math.floor(i / per) * (cell + gap);
        s += '<rect x="' + (cx + 0.75) + '" y="' + (cy + 0.75) + '" width="' + (cell - 1.5) + '" height="' + (cell - 1.5) + '" ' +
          (st === "disclosed" ? 'fill="' + INK + '" stroke="' + INK + '"' : st === "not_disclosed" ? 'fill="url(#pgh)" stroke="' + INK + '"' : 'fill="none" stroke="' + NR + '"') + ' stroke-width="1.5"/>';
      });
      y += Math.ceil(list.length / per) * (cell + gap) + 12;
    });
    var res = tot.disclosed + tot.not_disclosed;
    put("fig-r2", svg(w, y, "System cards by year: on record, not disclosed, not yet researched", s),
      "System cards, one square per release, by year: solid is a link on record (" + tot.disclosed + "), hatched is not disclosed (" + tot.not_disclosed +
      "), an empty frame is not yet researched (" + tot.not_researched + "). The share on record is " + tot.disclosed + " of " + res + " researched releases (" + BS.pct(tot.disclosed, res) + "%).");
  }

  function figDeltas(d) {
    var items = [], refused = [];
    Object.keys(d.deltas).forEach(function (id) {
      (d.deltas[id] || []).forEach(function (it) {
        if (it.kind === "delta") { items.push(it); } else if (it.kind === "REFUSED_COMPARISON") { refused.push({ id: id, reason: it.reason }); }
      });
    });
    var byId = {}; d.entries.forEach(function (e) { byId[e.id] = e; });
    var vals = items.map(function (i) { return i.value; }), lo = Math.floor(Math.min.apply(null, vals.concat([0])) / 10) * 10, hi = Math.ceil(Math.max.apply(null, vals) / 10) * 10;
    var w = 700, x0 = 150, x1 = w - 10, xs = function (v) { return x0 + (v - lo) / (hi - lo) * (x1 - x0); };
    var s = HATCH, benches = [["gpqa-diamond", "GPQA Diamond"], ["swe-bench-verified", "SWE-Bench Verified"]], y = 40;
    for (var v = lo; v <= hi; v += 10) { s += line(xs(v), 22, xs(v), 150, v === 0 ? INK : "rgba(20,22,27,.14)", v === 0 ? 1.5 : 1) + t(xs(v), 16, (v > 0 ? "+" : "") + v, { anchor: "middle" }); }
    benches.forEach(function (bn) {
      var list = items.filter(function (i) { return i.benchmark === bn[0]; });
      s += t(0, y + 4, bn[1], { weight: 700, fill: INK, size: 14 }) + t(0, y + 20, list.length + " computed", {});
      list.forEach(function (i, k) {
        var cy = y + ((k % 5) - 2) * 5.5;
        s += i.source_class === "INDEPENDENT" ? '<circle cx="' + xs(i.value).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3.8" fill="' + API + '"/>'
          : '<rect x="' + (xs(i.value) - 4).toFixed(1) + '" y="' + (cy - 4).toFixed(1) + '" width="8" height="8" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/>';
      });
      y += 62;
    });
    s += t(0, y + 22, "Refused", { weight: 700, fill: INK, size: 14 }) + t(0, y + 38, refused.length + " on record", {});
    refused.forEach(function (r, k) {
      var x = x0 + k * 170;
      s += '<rect x="' + x + '" y="' + (y + 10) + '" width="16" height="16" fill="url(#pgh)" stroke="' + INK + '" stroke-width="1.5"/>' +
        t(x + 24, y + 23, byId[r.id] ? byId[r.id].model_name : r.id, { fill: INK, size: 14 });
    });
    var reasons = refused.map(function (r) { return r.reason; }).filter(function (v2, i, a) { return a.indexOf(v2) === i; });
    put("fig-r3", svg(w, y + 50, "Changes against the previous model on record, and refused comparisons", s),
      "Each dot is a change against the previous model, in points, computed before publishing: " + items.length + " on record. " +
      refused.length + " comparisons are refused; the reason on record is “" + esc(reasons.join("; ")) + "”.");
  }

  function figVersions(d) {
    var E = d.entries, eras = d.views.trajectory.eras, w = 700, x0 = 150, x1 = w - 10;
    var d0 = BS.dayNum(E[0].date), d1 = BS.dayNum(E[E.length - 1].date), tx = function (dt) { return x0 + (BS.dayNum(dt) - d0) / (d1 - d0) * (x1 - x0); };
    var s = "", y = 30, names = { "gpqa-diamond": "GPQA Diamond", "swe-bench-verified": "SWE-Bench Verified" };
    for (var yr = +E[0].date.slice(0, 4) + 1; yr <= +E[E.length - 1].date.slice(0, 4); yr++) { var gx = tx(yr + "-01-01"); s += line(gx, 14, gx, 190, "rgba(20,22,27,.14)", 1) + t(gx, 206, String(yr), { anchor: "middle" }); }
    var caps = [];
    Object.keys(eras).forEach(function (k) {
      var era = eras[k][0], n = 0;
      E.forEach(function (e) { (e.benchmarks || []).forEach(function (b) { if (b.benchmark === k) { n++; } }); });
      var xa = tx(era.start), xb = era.end ? tx(era.end) : x1;
      s += t(0, y + 6, names[k] || k, { weight: 700, fill: INK, size: 14 }) + t(0, y + 22, "version: " + era.version, {});
      s += '<rect x="' + xa.toFixed(1) + '" y="' + (y - 12) + '" width="' + (xb - xa).toFixed(1) + '" height="30" fill="' + INK + '"/>';
      s += t(xa + 8, y + 7, era.version + ", from " + era.start, { fill: PAPER, size: 13, weight: 700 });
      E.forEach(function (e) { (e.benchmarks || []).forEach(function (b) { if (b.benchmark === k) { var bx = tx(e.date); s += line(bx, y + 22, bx, y + 30, INK2, 1.2); } }); });
      caps.push((names[k] || k) + ": one version (" + era.version + "), " + n + " scores");
      y += 80;
    });
    put("fig-r4", svg(w, 214, "Benchmark versions on record", s),
      "Each benchmark keeps one version across the record. " + esc(caps.join("; ")) + ". Ticks mark each score's release date.");
  }

  function settle() {
    var els = [].slice.call(document.querySelectorAll(".art-body h2, .side, .pull, .pfig"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { return; }
    els.forEach(function (el) { el.classList.add("settle"); if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("pre"); } });
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) { if (en.isIntersecting) { en.target.classList.remove("pre"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  BS.renderFooter();
  settle();
  BS.loadAll().then(function (d) {
    [figScores, figDisclosure, figDeltas, figVersions].forEach(function (f) {
      try { f(d); } catch (err) { if (window.console) { console.error(err); } }
    });
  }).catch(function () {
    [].forEach.call(document.querySelectorAll(".pfig"), function (el) { el.innerHTML = "<figcaption>The figure could not load the record in this session.</figcaption>"; });
  });
})();
