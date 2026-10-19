/* Control Room overview. Every panel reads one shared selection (a date
   range, labs, a country) and redraws from the record when it changes:
   brush the release grid and the measures, the feed, the lab panels, the
   scores, the pairs, the disclosure squares and the availability bars all
   follow. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc, $ = CR.$, $$ = CR.$$;
  var D = null;
  var S = { from: null, to: null, labs: [], country: "", bench: "gpqa-diamond" };
  var cmp = { a: "openai", b: "anthropic" };

  /* ---------- state and URL ---------- */

  function readUrl() {
    var p = new URLSearchParams(location.search);
    S.from = CR.validDate(p.get("from")) ? p.get("from") : null;
    S.to = CR.validDate(p.get("to")) ? p.get("to") : null;
    if (S.from && S.to && S.from > S.to) { var t = S.from; S.from = S.to; S.to = t; }
    S.labs = (p.get("labs") || "").split(",").filter(function (o) { return CR.ORG_NAMES[o]; });
    var c = p.get("country") || "";
    S.country = Object.keys(CR.ORG_COUNTRY).some(function (k) { return CR.ORG_COUNTRY[k] === c; }) ? c : "";
    S.bench = p.get("bench") === "swe-bench-verified" ? "swe-bench-verified" : "gpqa-diamond";
    var cp = (p.get("compare") || "").split(",");
    if (cp.length === 2 && CR.ORG_NAMES[cp[0]] && CR.ORG_NAMES[cp[1]]) { cmp.a = cp[0]; cmp.b = cp[1]; return true; }
    return false;
  }
  function query(extra) {
    var p = new URLSearchParams();
    if (S.from) { p.set("from", S.from); }
    if (S.to) { p.set("to", S.to); }
    if (S.labs.length) { p.set("labs", S.labs.join(",")); }
    if (S.country) { p.set("country", S.country); }
    if (S.bench !== "gpqa-diamond") { p.set("bench", S.bench); }
    if (extra) { Object.keys(extra).forEach(function (k) { p.set(k, extra[k]); }); }
    return p.toString();
  }
  function writeUrl(extra) {
    var q = query(extra);
    history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
  }
  function filtered() { return !!(S.from || S.to || S.labs.length || S.country); }
  function labIn(o) {
    if (S.labs.length && S.labs.indexOf(o) < 0) { return false; }
    if (S.country && CR.ORG_COUNTRY[o] !== S.country) { return false; }
    return true;
  }
  function dateIn(d) { return !(S.from && d < S.from) && !(S.to && d > S.to); }
  function inView(e) { return labIn(e.org) && dateIn(e.date); }

  function set(patch) {
    Object.keys(patch).forEach(function (k) { S[k] = patch[k]; });
    writeUrl();
    render();
  }
  function clearAll() { set({ from: null, to: null, labs: [], country: "" }); }
  function toggleLab(o, multi) {
    var labs = S.labs.slice();
    var i = labs.indexOf(o);
    if (multi) { if (i >= 0) { labs.splice(i, 1); } else { labs.push(o); } }
    else { labs = (i >= 0 && labs.length === 1) ? [] : [o]; }
    set({ labs: labs });
  }

  /* ---------- formatting ---------- */

  function days(n) { return n == null ? "-" : CR.fmtNum(n); }
  function rangeWords() {
    if (!S.from && !S.to) { return null; }
    return (S.from || D.meta.first_date) + " to " + (S.to || D.asOf);
  }
  function viewWords() {
    var parts = [];
    if (S.labs.length) { parts.push(S.labs.map(function (o) { return CR.ORG_NAMES[o]; }).join(", ")); }
    if (S.country) { parts.push("labs based in " + S.country); }
    var r = rangeWords(); if (r) { parts.push(r); }
    return parts.join("; ");
  }

  /* ---------- svg helpers ---------- */

  function svgOpen(w, h, cls, label) {
    return '<svg class="' + (cls || "") + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '"' +
      (label ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + ">";
  }
  function ticks(max, n) {
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200];
    for (var i = 0; i < steps.length; i++) { if (max / steps[i] <= n) { var s = steps[i]; var out = []; for (var v = 0; v <= max + s * 0.999; v += s) { out.push(v); } return out; } }
    return [0, max];
  }

  /* ---------- title row and filter bar ---------- */

  function renderTitle() {
    var m = D.meta;
    $("#scope-line").innerHTML = m.entry_count + " entries from twelve tracked labs, <span class=\"nw\">" + m.first_date + "</span> to <span class=\"nw\">" + m.last_date +
      "</span>: " + m.releases + " releases and " + m.revisions + " revisions.";
    $("#fresh").innerHTML = 'Record updated <time datetime="' + esc(m.last_successful_update) + '">' + esc(m.last_successful_update) + "</time>";
  }

  var PRESETS = [];
  function buildPresets() {
    var y = +D.asOf.slice(0, 4);
    PRESETS = [{ k: "all", label: "All", from: null, to: null }];
    for (var yr = 2023; yr <= y; yr++) {
      PRESETS.push({ k: String(yr), label: yr === y ? yr + " so far" : String(yr), from: yr + "-01-01", to: yr === y ? null : yr + "-12-31" });
    }
    PRESETS.push({ k: "90", label: "Last 90 days", from: CR.dateOf(D.asOfDay - 89), to: null });
    $("#presets").innerHTML = PRESETS.map(function (p) {
      return '<button type="button" role="radio" aria-checked="false" data-k="' + p.k + '">' + esc(p.label) + "</button>";
    }).join("");
    $("#presets").addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) { return; }
      var p = PRESETS.filter(function (x) { return x.k === b.getAttribute("data-k"); })[0];
      set({ from: p.from, to: p.to });
    });
    $("#presets").addEventListener("keydown", function (ev) {
      if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") { return; }
      var bs = $$("button", $("#presets")); var i = bs.indexOf(document.activeElement);
      if (i < 0) { return; }
      ev.preventDefault();
      var n = bs[(i + (ev.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
    });
    var countries = [];
    CR.ORG_ORDER.forEach(function (o) { if (countries.indexOf(CR.ORG_COUNTRY[o]) < 0) { countries.push(CR.ORG_COUNTRY[o]); } });
    $("#f-country").innerHTML = '<option value="">All countries</option>' + countries.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    $("#f-country").addEventListener("change", function () { set({ country: this.value }); });
    var fi = $("#f-from"), ti = $("#f-to");
    fi.max = ti.max = D.asOf;
    fi.addEventListener("change", function () { set({ from: CR.validDate(fi.value) ? fi.value : null }); });
    ti.addEventListener("change", function () { set({ to: CR.validDate(ti.value) ? ti.value : null }); });
    $("#clear-all").addEventListener("click", clearAll);
    $("#more-filters").addEventListener("click", function () {
      var fb = $(".filterbar"), open = !fb.classList.contains("open");
      fb.classList.toggle("open", open);
      this.setAttribute("aria-expanded", open ? "true" : "false");
      this.textContent = open ? "Fewer filters" : "More filters";
    });
  }

  function renderFilterbar() {
    var active = null;
    PRESETS.forEach(function (p) { if (p.from === S.from && p.to === S.to) { active = p.k; } });
    $$("button", $("#presets")).forEach(function (b) {
      var on = b.getAttribute("data-k") === active;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on || (!active && b.getAttribute("data-k") === "all") ? 0 : -1;
    });
    $("#f-from").value = S.from || "";
    $("#f-to").value = S.to || "";
    $("#f-country").value = S.country;
    $("#labchips").innerHTML = S.labs.map(function (o) {
      return '<button type="button" class="chip" data-org="' + o + '" aria-label="Remove ' + esc(CR.ORG_NAMES[o]) + ' from the filter">' + esc(CR.ORG_NAMES[o]) + '<span aria-hidden="true">×</span></button>';
    }).join("");
    $("#clear-all").hidden = !filtered();
    var p = new URLSearchParams();
    if (S.from) { p.set("from", S.from); }
    if (S.to) { p.set("to", S.to); }
    if (S.labs.length) { p.set("lab", S.labs.join(",")); }
    if (S.country) { p.set("country", S.country); }
    var q = p.toString();
    $("#to-explorer").href = "explorer.html" + (q ? "?" + q : "");
    var n = D.entries.filter(inView).length;
    $("#to-explorer").textContent = filtered() ? "Open " + n + " in explorer" : "Open in explorer";
  }

  /* ---------- measures ---------- */

  function sparkBars(vals, hi, w, h) {
    var n = vals.length, max = Math.max.apply(null, vals) || 1, bw = w / n;
    var s = svgOpen(w, h, "spark");
    vals.forEach(function (v, i) {
      if (!v) { return; }
      var bh = Math.max(1.5, (h - 2) * v / max);
      s += '<rect x="' + (i * bw + 0.5).toFixed(1) + '" y="' + (h - bh).toFixed(1) + '" width="' + Math.max(1, bw - 1).toFixed(1) + '" height="' + bh.toFixed(1) + '" class="' + (hi[i] ? "sp-on" : "sp-off") + '"/>';
    });
    s += '<line x1="0" x2="' + w + '" y1="' + (h - 0.5) + '" y2="' + (h - 0.5) + '" class="sp-base"/>';
    return s + "</svg>";
  }
  function sparkLine(pts, x0, x1, ymax, w, h, hiFrom, hiTo) {
    if (!pts.length) { return ""; }
    var sx = function (d) { return 2 + (w - 4) * (d - x0) / ((x1 - x0) || 1); };
    var sy = function (v) { return 3 + (h - 6) * (1 - Math.min(v, ymax) / ymax); };
    var dAll = "", dOn = "";
    pts.forEach(function (p, i) {
      dAll += (i ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.y).toFixed(1);
    });
    var on = pts.filter(function (p) { return (hiFrom == null || p.x >= hiFrom) && (hiTo == null || p.x <= hiTo); });
    on.forEach(function (p, i) { dOn += (i ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.y).toFixed(1); });
    var last = on.length ? on[on.length - 1] : pts[pts.length - 1];
    return svgOpen(w, h, "spark") + '<path d="' + dAll + '" class="sp-line-off"/>' + (dOn ? '<path d="' + dOn + '" class="sp-line"/>' : "") +
      '<circle cx="' + sx(last.x).toFixed(1) + '" cy="' + sy(last.y).toFixed(1) + '" r="2.5" class="sp-dot"/></svg>';
  }

  function kpi(id, label, valueHtml, sub, spark) {
    var el = $("#" + id);
    $(".k-l", el).textContent = label;
    $(".k-v", el).innerHTML = valueHtml;
    $(".k-s", el).innerHTML = sub;
    $(".k-spark", el).innerHTML = spark || "";
  }

  function renderKpis() {
    var view = D.entries.filter(inView), rel = view.filter(function (e) { return e._rel; });
    var y = D.asOf.slice(0, 4), py = String(+y - 1);
    var f = filtered();
    var w = Math.max(120, Math.min(260, ($("#k1 .k-spark").clientWidth || 220)));
    var sh = 28;

    /* monthly releases across the record */
    var m0 = D.meta.first_date.slice(0, 7), months = [], mi = {};
    for (var yy = +m0.slice(0, 4), mm = +m0.slice(5, 7); ; mm++) {
      if (mm > 12) { mm = 1; yy++; }
      var key = yy + "-" + (mm < 10 ? "0" : "") + mm;
      if (key > D.asOf.slice(0, 7)) { break; }
      mi[key] = months.length; months.push(key);
    }
    var mv = months.map(function () { return 0; });
    D.releases.forEach(function (e) { if (labIn(e.org)) { mv[mi[e.date.slice(0, 7)]]++; } });
    var hi = months.map(function (k) {
      if (!f) { return k.slice(0, 4) === y; }
      var a = k + "-01", b = k + "-31";
      return !(S.from && b < S.from) && !(S.to && a > S.to);
    });

    if (!f) {
      var cut = py + D.asOf.slice(4);
      var nY = D.releases.filter(function (e) { return e._year === y && e.date <= D.asOf; }).length;
      var nP = D.releases.filter(function (e) { return e._year === py && e.date <= cut; }).length;
      kpi("k1", "Releases in " + y + " so far", '<span class="num">' + nY + "</span>",
        '<span class="num">' + nP + "</span> by the same date in " + py + ". Revisions are counted apart.", sparkBars(mv, hi, w, sh));
    } else {
      var nrev = view.length - rel.length;
      kpi("k1", "Releases in view", '<span class="num">' + rel.length + "</span>",
        "of " + D.releases.length + " releases on record" + (nrev ? ", plus " + CR.plural(nrev, "revision") : "") + ".", sparkBars(mv, hi, w, sh));
    }

    /* median gap */
    if (!f) {
      var yr = D.releases.filter(function (e) { return e._year === y; });
      var g = CR.median(CR.pooledGaps(yr));
      console.assert(g === D.views.tiles.median_gap_days_this_year, "median gap this year matches the derived tile");
      var mg = D.views.cadence.median_gap.map(function (p) { return { x: CR.dayNum(p.date), y: p.days }; });
      kpi("k2", "Median days between releases, " + y, '<span class="num">' + days(g) + '</span><span class="unit">days</span>',
        "All twelve labs pooled; same-day releases count as 0. Line: the 365-day median since 2023.",
        sparkLine(mg, mg[0].x, D.asOfDay, Math.max.apply(null, mg.map(function (p) { return p.y; })), w, sh));
    } else {
      var gv = CR.median(CR.pooledGaps(rel));
      /* the same rule as the published series, applied to the releases in view */
      var sorted = D.releases.filter(function (e) { return labIn(e.org); }).map(function (e) { return e._day; }).sort(function (a, b) { return a - b; });
      var roll = [];
      for (var i = 1; i < sorted.length; i++) {
        var gaps = [];
        for (var j = i; j >= 1 && sorted[i] - sorted[j] <= 365; j--) { gaps.push(sorted[j] - sorted[j - 1]); }
        if (gaps.length) { roll.push({ x: sorted[i], y: CR.median(gaps) }); }
      }
      var fromD = S.from ? CR.dayNum(S.from) : null, toD = S.to ? CR.dayNum(S.to) : null;
      kpi("k2", "Median days between releases in view", gv == null ? '<span class="num dash">-</span>' : '<span class="num">' + days(gv) + '</span><span class="unit">days</span>',
        gv == null ? "Fewer than two releases in view." : "Pooled across " + CR.plural(rel.length, "release") + "; same-day releases count as 0.",
        roll.length ? sparkLine(roll, roll[0].x, D.asOfDay, Math.max.apply(null, roll.map(function (p) { return p.y; })), w, sh, fromD, toD) : "");
    }

    /* system card share, researched only */
    var sc = CR.discCounts(f ? rel : D.releases, "system_card");
    var years = ["2022", "2023", "2024", "2025", "2026"].filter(function (yy) { return yy <= y; });
    var pts = [];
    years.forEach(function (yy) {
      var c = CR.discCounts(D.releases.filter(function (e) { return e._year === yy && labIn(e.org); }), "system_card");
      if (c.researched) { pts.push({ x: +yy, y: 100 * c.share }); }
    });
    var label3 = f ? "Researched releases in view with a system card" : "Researched releases with a system card";
    if (!f) { console.assert(Math.abs(sc.share - D.views.tiles.share_with_system_card) < 0.001, "system card share matches the derived tile"); }
    kpi("k3", label3, sc.researched ? '<span class="num">' + Math.round(100 * sc.share) + '</span><span class="unit">%</span>' : '<span class="num dash">-</span>',
      sc.researched ? '<span class="num">' + sc.disclosed + "</span> of " + sc.researched + " researched. " + sc.not_researched + " not yet researched, so not counted."
        : "None of the " + CR.plural(sc.not_researched, "release") + " in view has been researched for a system card.",
      pts.length > 1 ? sparkLine(pts, pts[0].x, pts[pts.length - 1].x, 100, w, sh) : "");

    /* newest release */
    var newest = (f ? rel : D.releases)[0];
    var spanDays = 120, d1 = D.asOfDay, d0 = d1 - spanDays + 1;
    var dayHit = {};
    (f ? rel : D.releases).forEach(function (e) { if (e._day >= d0) { dayHit[e._day] = (dayHit[e._day] || 0) + 1; } });
    var s = svgOpen(w, sh, "spark");
    Object.keys(dayHit).forEach(function (k) {
      var x = 1 + (w - 3) * (k - d0) / (spanDays - 1);
      var on = newest && +k === newest._day;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (on ? 2 : 8) + '" width="2" height="' + (sh - (on ? 2 : 8)) + '" class="' + (on ? "sp-new" : "sp-on") + '"/>';
    });
    s += '<line x1="0" x2="' + w + '" y1="' + (sh - 0.5) + '" y2="' + (sh - 0.5) + '" class="sp-base"/></svg>';
    if (newest) {
      var ago = D.asOfDay - newest._day;
      kpi("k4", f ? "Newest release in view" : "Newest release",
        '<a class="k-name" href="explorer.html?id=' + encodeURIComponent(newest.id) + '">' + esc(newest.model_name) + "</a>",
        esc(newest._orgName) + ", " + newest.date + ". " + (ago === 0 ? "The day of the last update." : CR.plural(ago, "day") + " before the last update (" + D.asOf + ")."),
        s + '<span class="sr">Release days in the last 120 days before the update.</span>');
    } else {
      kpi("k4", "Newest release in view", '<span class="num dash">-</span>', "No release in view.", "");
    }
  }

  /* ---------- the release grid ---------- */

  var H = null; /* geometry of the last drawn grid */

  function mondayOf(n) { return n - ((n + 3) % 7); }

  function heatBins(plotW) {
    var start = mondayOf(D.startDay), end = mondayOf(D.asOfDay);
    var nW = Math.round((end - start) / 7) + 1;
    var bins = [];
    if (plotW / nW >= 3) {
      for (var i = 0; i < nW; i++) { var a = start + 7 * i; bins.push({ a: a, b: a + 6 }); }
      return { unit: "week", bins: bins };
    }
    var y = +D.meta.first_date.slice(0, 4), m = +D.meta.first_date.slice(5, 7);
    for (; ;) {
      var k = y + "-" + (m < 10 ? "0" : "") + m;
      if (k > D.asOf.slice(0, 7)) { break; }
      var a2 = CR.dayNum(k + "-01");
      var nm = m === 12 ? (y + 1) + "-01" : y + "-" + (m + 1 < 10 ? "0" : "") + (m + 1);
      bins.push({ a: a2, b: CR.dayNum(nm + "-01") - 1 });
      m++; if (m > 12) { m = 1; y++; }
    }
    return { unit: "month", bins: bins };
  }

  function binIndex(day) {
    var bins = H.bins, lo = 0, hi = bins.length - 1;
    if (day <= bins[0].b) { return 0; }
    if (day >= bins[hi].a) { return hi; }
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (day < bins[mid].a) { hi = mid - 1; } else if (day > bins[mid].b) { lo = mid + 1; } else { return mid; }
    }
    return Math.max(0, Math.min(bins.length - 1, lo));
  }

  function drawHeat() {
    var host = $("#heat");
    var total = host.clientWidth;
    var mobile = total < 560;
    var labW = mobile ? 92 : 128, cntW = mobile ? 30 : 44;
    var plotW = Math.max(200, total - labW - cntW);
    var B = heatBins(plotW);
    var RH = 24, TH = mobile ? 34 : 48, GAP = 8, AX = 22;
    var rows = CR.ORG_ORDER;
    var bw = plotW / B.bins.length;
    H = { bins: B.bins, unit: B.unit, bw: bw, RH: RH, TH: TH, GAP: GAP, plotW: plotW, rows: rows, y0: TH + GAP, height: TH + GAP + rows.length * RH + AX };

    /* counts per lab per bin, releases and revisions apart */
    var cell = {}, agg = B.bins.map(function () { return 0; });
    D.entries.forEach(function (e) {
      var bi = binIndex(e._day);
      var k = e.org + "|" + bi;
      var c = cell[k] || (cell[k] = { rel: 0, rev: 0, ids: [] });
      if (e._rel) { c.rel++; agg[bi]++; } else { c.rev++; }
      c.ids.push(e.id);
    });
    H.cell = cell; H.agg = agg;
    var aggMax = Math.max.apply(null, agg) || 1;
    H.aggMax = aggMax;

    var cw = Math.max(1, bw - (bw >= 4 ? 1 : 0.6));
    var s = svgOpen(plotW, H.height, "heat-svg");
    /* year lines */
    var years = [];
    for (var yy = +D.meta.first_date.slice(0, 4) + 1; yy <= +D.asOf.slice(0, 4); yy++) { years.push(yy); }
    years.forEach(function (yy) {
      var x = xOfDay(CR.dayNum(yy + "-01-01"));
      s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="0" y2="' + (H.height - AX + 4) + '" class="h-year"/>';
      s += '<text x="' + (x + 3).toFixed(1) + '" y="' + (H.height - 6) + '" class="h-axis">' + yy + "</text>";
    });
    /* all labs: releases per bin */
    s += '<g class="h-agg">';
    agg.forEach(function (v, i) {
      if (!v) { return; }
      var bh = Math.max(1.5, (TH - 16) * v / aggMax);
      s += '<rect x="' + (i * bw).toFixed(2) + '" y="' + (TH - bh).toFixed(1) + '" width="' + cw.toFixed(2) + '" height="' + bh.toFixed(1) + '"/>';
    });
    s += '</g><line x1="0" x2="' + plotW + '" y1="' + (TH + 0.5) + '" y2="' + (TH + 0.5) + '" class="h-base"/>';
    s += '<text x="' + (plotW - 2) + '" y="10" text-anchor="end" class="h-axis h-max">' + aggMax + " a " + B.unit + "</text>";
    /* one row per lab */
    rows.forEach(function (o, r) {
      var y = H.y0 + r * RH;
      s += '<g class="h-row" data-org="' + o + '">';
      for (var i = 0; i < B.bins.length; i++) {
        var c = cell[o + "|" + i];
        var lv = c ? Math.min(4, c.rel) : 0;
        var cls = "lv" + lv + (c && !c.rel && c.rev ? " rv" : "");
        s += '<rect x="' + (i * bw).toFixed(2) + '" y="' + (y + 2) + '" width="' + cw.toFixed(2) + '" height="' + (RH - 4) + '" class="' + cls + '"/>';
      }
      s += "</g>";
    });
    /* selection, shade and cursor layers */
    s += '<g class="h-shade"><rect class="sh-l" x="0" y="0" width="0" height="' + (H.height - AX) + '"/><rect class="sh-r" x="0" y="0" width="0" height="' + (H.height - AX) + '"/></g>';
    s += '<rect class="h-sel" x="0" y="0.5" width="0" height="' + (H.height - AX - 1) + '" rx="2"/>';
    s += '<rect class="h-hand h-hand-a" x="0" y="' + (H.height - AX) / 2 + '" width="4" height="22" rx="2" transform="translate(-2,-11)"/>';
    s += '<rect class="h-hand h-hand-b" x="0" y="' + (H.height - AX) / 2 + '" width="4" height="22" rx="2" transform="translate(-2,-11)"/>';
    s += '<rect class="h-cur" x="0" y="0" width="0" height="0" rx="1"/>';
    s += "</svg>";

    var labs = '<div class="hl-top">All labs</div>' + rows.map(function (o) {
      return '<button type="button" class="hl" data-org="' + o + '" aria-pressed="false" style="height:' + RH + 'px">' + esc(mobile ? shortName(o) : CR.ORG_NAMES[o]) + "</button>";
    }).join("");
    var counts = '<div class="hc-top num" id="hc-all"></div>' + rows.map(function (o) {
      return '<div class="hc num" data-org="' + o + '" style="height:' + RH + 'px"></div>';
    }).join("");

    host.innerHTML = '<div class="heat-grid" style="--th:' + TH + "px;--gap:" + GAP + "px;--ax:" + AX + 'px">' +
      '<div class="heat-labels">' + labs + "</div>" +
      '<div class="heat-plot" tabindex="0" role="application" aria-roledescription="release grid" aria-label="Release weeks by lab. Arrow keys move between cells, Enter selects the cell\'s ' + B.unit + ', Shift and an arrow extends the selection, Escape clears it." aria-describedby="cad-meta">' + s + "</div>" +
      '<div class="heat-counts" aria-hidden="true">' + counts + "</div></div>";
    $("#cad-meta").textContent = "One cell per lab per " + B.unit + " since " + CR.dateOf(B.bins[0].a) + ". Drag across the grid to select a range; every panel follows.";
    $("#cad-legend").innerHTML = heatLegend();
    wireHeat();
    paintSelection();
  }
  function shortName(o) {
    return { "google-deepmind": "Google DM", "alibaba-qwen": "Qwen", "moonshot": "Moonshot", "zai": "Z.ai", "amazon": "Amazon" }[o] || CR.ORG_NAMES[o];
  }
  function heatLegend() {
    var cells = [1, 2, 3, 4].map(function (lv) { return '<svg width="9" height="12" aria-hidden="true"><rect x="0" y="0" width="9" height="12" rx="1" class="lv' + lv + '"/></svg>'; }).join("");
    return '<span class="lg-item">' + '<svg width="9" height="12" aria-hidden="true"><rect x="0.5" y="0.5" width="8" height="11" rx="1" class="lv0"/></svg>' + " none</span>" +
      '<span class="lg-item">' + cells + " 1 to 4 or more releases</span>" +
      '<span class="lg-item"><svg width="9" height="12" aria-hidden="true"><rect x="0.5" y="0.5" width="8" height="11" rx="1" class="lv0 rv"/></svg> revision only</span>';
  }
  function xOfDay(day) {
    var i = binIndex(day), b = H.bins[i];
    return (i + (day - b.a) / (b.b - b.a + 1)) * H.bw;
  }

  function paintSelection() {
    if (!H) { return; }
    var svg = $("#heat .heat-svg");
    if (!svg) { return; }
    var has = !!(S.from || S.to);
    var a = has ? binIndex(S.from ? CR.dayNum(S.from) : D.startDay) : 0;
    var b = has ? binIndex(S.to ? CR.dayNum(S.to) : D.asOfDay) : H.bins.length - 1;
    var x0 = a * H.bw, x1 = (b + 1) * H.bw;
    var sel = $(".h-sel", svg), shL = $(".sh-l", svg), shR = $(".sh-r", svg);
    var ha = $(".h-hand-a", svg), hb = $(".h-hand-b", svg);
    svg.classList.toggle("has-sel", has);
    if (has) {
      sel.setAttribute("x", x0.toFixed(1)); sel.setAttribute("width", Math.max(1, x1 - x0).toFixed(1));
      shL.setAttribute("width", x0.toFixed(1));
      shR.setAttribute("x", x1.toFixed(1)); shR.setAttribute("width", Math.max(0, H.plotW - x1).toFixed(1));
      ha.setAttribute("x", x0.toFixed(1)); hb.setAttribute("x", x1.toFixed(1));
    } else {
      sel.setAttribute("width", 0); shL.setAttribute("width", 0); shR.setAttribute("width", 0);
    }
    H.selA = has ? a : null; H.selB = has ? b : null;
    $$(".h-row", svg).forEach(function (g) { g.classList.toggle("dim", !labIn(g.getAttribute("data-org"))); });
    $$(".hl", $("#heat")).forEach(function (bt) {
      var o = bt.getAttribute("data-org");
      bt.setAttribute("aria-pressed", S.labs.indexOf(o) >= 0 ? "true" : "false");
      bt.classList.toggle("dim", !labIn(o));
    });
    var tot = 0;
    $$(".hc", $("#heat")).forEach(function (el) {
      var o = el.getAttribute("data-org");
      var n = D.releases.filter(function (e) { return e.org === o && dateIn(e.date); }).length;
      if (labIn(o)) { tot += n; }
      el.textContent = n;
      el.classList.toggle("dim", !labIn(o));
    });
    var all = $("#hc-all"); if (all) { all.textContent = tot; }
  }

  function cellEntries(org, bi) {
    var bin = H.bins[bi];
    return D.entries.filter(function (e) { return (!org || e.org === org) && e._day >= bin.a && e._day <= bin.b; })
      .sort(function (a, b) { return a._day - b._day; });
  }
  function binLabel(bi) {
    var b = H.bins[bi];
    if (H.unit === "month") { return CR.dateOf(b.a).slice(0, 7); }
    return "Week of " + CR.dateOf(b.a);
  }
  function tipForCell(org, bi) {
    var list = cellEntries(org, bi);
    var rels = list.filter(function (e) { return e._rel; }).length;
    var h = '<p class="t-h">' + esc(org ? CR.ORG_NAMES[org] : "All labs") + '</p><p class="t-s">' + binLabel(bi) + ": " +
      (list.length ? CR.plural(rels, "release") + (list.length - rels ? ", " + CR.plural(list.length - rels, "revision") : "") : "no entries") + "</p>";
    if (list.length) {
      h += '<ul class="t-list">' + list.slice(0, 8).map(function (e) {
        return "<li><span class=\"num\">" + e.date.slice(5) + "</span> " + esc(e.model_name) + (org ? "" : ' <span class="t-m">' + esc(e._orgName) + "</span>") + (e._rel ? "" : ' <span class="t-m">revision</span>') + "</li>";
      }).join("") + (list.length > 8 ? '<li class="t-m">and ' + (list.length - 8) + " more</li>" : "") + "</ul>";
    }
    return h;
  }

  var cursor = { r: 0, i: 0, shown: false };
  function showCursor(r, bi) {
    var svg = $("#heat .heat-svg"); if (!svg) { return; }
    var cur = $(".h-cur", svg);
    if (r < 0) {
      cur.setAttribute("x", (bi * H.bw - 1).toFixed(1)); cur.setAttribute("y", 0);
      cur.setAttribute("width", (H.bw + 1).toFixed(1)); cur.setAttribute("height", H.TH + 1);
    } else {
      cur.setAttribute("x", (bi * H.bw - 1).toFixed(1)); cur.setAttribute("y", H.y0 + r * H.RH + 1);
      cur.setAttribute("width", (H.bw + 1).toFixed(1)); cur.setAttribute("height", H.RH - 2);
    }
    svg.classList.add("cur-on");
  }
  function hideCursor() {
    var svg = $("#heat .heat-svg"); if (svg) { svg.classList.remove("cur-on"); }
    linkFeed([]);
    $$(".lab.hl-on").forEach(function (c) { c.classList.remove("hl-on"); });
    $$(".hl.hover").forEach(function (c) { c.classList.remove("hover"); });
  }
  function linkFeed(ids) {
    $$("#feed-list .fr").forEach(function (a) { a.classList.toggle("hl-on", ids.indexOf(a.getAttribute("data-id")) >= 0); });
  }
  function linkLab(org) {
    $$(".lab").forEach(function (c) { c.classList.toggle("hl-on", c.getAttribute("data-org") === org); });
    $$(".hl").forEach(function (c) { c.classList.toggle("hover", c.getAttribute("data-org") === org); });
  }

  function wireHeat() {
    var plot = $("#heat .heat-plot"), svg = $(".heat-svg", plot);
    $$(".hl", $("#heat")).forEach(function (b) {
      b.addEventListener("click", function (ev) { toggleLab(b.getAttribute("data-org"), ev.shiftKey || ev.metaKey || ev.ctrlKey); });
    });
    function locate(ev) {
      var r = svg.getBoundingClientRect();
      var x = ev.clientX - r.left, y = ev.clientY - r.top;
      var bi = Math.max(0, Math.min(H.bins.length - 1, Math.floor(x / H.bw)));
      var row = y < H.TH + H.GAP / 2 ? -1 : Math.floor((y - H.y0) / H.RH);
      if (row >= H.rows.length) { row = H.rows.length - 1; }
      return { x: x, bi: bi, row: row };
    }
    var drag = null;
    svg.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) { return; }
      var p = locate(ev);
      var mode = "new";
      if (H.selA != null) {
        var xa = H.selA * H.bw, xb = (H.selB + 1) * H.bw;
        if (Math.abs(p.x - xa) < 7) { mode = "a"; } else if (Math.abs(p.x - xb) < 7) { mode = "b"; }
        else if (p.x > xa && p.x < xb && ev.pointerType !== "touch") { mode = "move"; }
      }
      drag = { mode: mode, start: p, a: H.selA, b: H.selB, moved: false, id: ev.pointerId };
    });
    svg.addEventListener("pointermove", function (ev) {
      var p = locate(ev);
      if (drag) {
        if (!drag.moved && Math.abs(p.x - drag.start.x) > 4) {
          drag.moved = true;
          try { svg.setPointerCapture(drag.id); } catch (err) { /* capture not available */ }
          CR.untip();
        }
        if (drag.moved) {
          var a, b;
          if (drag.mode === "new") { a = Math.min(drag.start.bi, p.bi); b = Math.max(drag.start.bi, p.bi); }
          else if (drag.mode === "a") { a = Math.min(p.bi, drag.b); b = Math.max(p.bi, drag.b); }
          else if (drag.mode === "b") { a = Math.min(p.bi, drag.a); b = Math.max(p.bi, drag.a); }
          else {
            var d = p.bi - drag.start.bi, len = drag.b - drag.a;
            a = Math.max(0, Math.min(H.bins.length - 1 - len, drag.a + d)); b = a + len;
          }
          previewRange(a, b);
          return;
        }
      }
      if (ev.pointerType === "touch") { return; }
      showCursor(p.row, p.bi);
      var org = p.row >= 0 ? H.rows[p.row] : null;
      var list = cellEntries(org, p.bi);
      linkFeed(list.map(function (e) { return e.id; }));
      linkLab(org);
      CR.tip(tipForCell(org, p.bi), ev.clientX, ev.clientY);
    });
    function end(ev) {
      if (!drag) { return; }
      var p = locate(ev);
      if (drag.moved) {
        commitRange(H.prevA, H.prevB);
      } else if (drag.mode !== "move" || ev.pointerType === "touch") {
        commitRange(p.bi, p.bi);
      }
      drag = null;
    }
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", function () { drag = null; paintSelection(); });
    svg.addEventListener("pointerleave", function () { if (!drag) { hideCursor(); CR.untip(); } });

    /* keyboard: a cell cursor, Enter to select, Shift to extend */
    plot.addEventListener("focus", function () {
      if (!cursor.shown) { cursor.r = 0; cursor.i = H.bins.length - 1; cursor.shown = true; }
      keyShow();
    });
    plot.addEventListener("blur", function () { hideCursor(); CR.untip(); });
    plot.addEventListener("keydown", function (ev) {
      var k = ev.key, moved = true;
      if (k === "ArrowLeft") { cursor.i = Math.max(0, cursor.i - (ev.altKey ? 4 : 1)); }
      else if (k === "ArrowRight") { cursor.i = Math.min(H.bins.length - 1, cursor.i + (ev.altKey ? 4 : 1)); }
      else if (k === "ArrowUp") { cursor.r = Math.max(-1, cursor.r - 1); }
      else if (k === "ArrowDown") { cursor.r = Math.min(H.rows.length - 1, cursor.r + 1); }
      else if (k === "Home") { cursor.i = 0; }
      else if (k === "End") { cursor.i = H.bins.length - 1; }
      else if (k === "Enter" || k === " ") { ev.preventDefault(); commitRange(cursor.i, cursor.i); keyShow(); return; }
      else if (k === "Escape") { if (S.from || S.to) { ev.preventDefault(); ev.stopPropagation(); set({ from: null, to: null }); } return; }
      else { moved = false; }
      if (moved) {
        ev.preventDefault();
        if (ev.shiftKey && (k === "ArrowLeft" || k === "ArrowRight")) {
          var a = H.selA == null ? cursor.i : H.selA, b = H.selB == null ? cursor.i : H.selB;
          if (cursor.i < a) { a = cursor.i; } else if (cursor.i > b) { b = cursor.i; } else if (k === "ArrowLeft") { b = cursor.i; } else { a = cursor.i; }
          commitRange(a, b);
        }
        keyShow();
      }
    });
  }
  function keyShow() {
    showCursor(cursor.r, cursor.i);
    var svg = $("#heat .heat-svg"), r = svg.getBoundingClientRect();
    var org = cursor.r >= 0 ? H.rows[cursor.r] : null;
    var list = cellEntries(org, cursor.i);
    linkFeed(list.map(function (e) { return e.id; }));
    linkLab(org);
    var x = r.left + (cursor.i + 0.5) * H.bw, y = r.top + (cursor.r < 0 ? H.TH / 2 : H.y0 + (cursor.r + 0.5) * H.RH);
    CR.tip(tipForCell(org, cursor.i), x, y);
  }
  function previewRange(a, b) {
    H.prevA = a; H.prevB = b;
    var svg = $("#heat .heat-svg");
    var x0 = a * H.bw, x1 = (b + 1) * H.bw;
    svg.classList.add("has-sel");
    $(".h-sel", svg).setAttribute("x", x0.toFixed(1)); $(".h-sel", svg).setAttribute("width", (x1 - x0).toFixed(1));
    $(".sh-l", svg).setAttribute("width", x0.toFixed(1));
    $(".sh-r", svg).setAttribute("x", x1.toFixed(1)); $(".sh-r", svg).setAttribute("width", Math.max(0, H.plotW - x1).toFixed(1));
    $(".h-hand-a", svg).setAttribute("x", x0.toFixed(1)); $(".h-hand-b", svg).setAttribute("x", x1.toFixed(1));
    var from = CR.dateOf(Math.max(H.bins[a].a, D.startDay)), to = CR.dateOf(Math.min(H.bins[b].b, D.asOfDay));
    $("#cad-meta").textContent = "Selecting " + from + " to " + to + ".";
  }
  function commitRange(a, b) {
    if (a == null) { return; }
    var from = CR.dateOf(Math.max(H.bins[a].a, D.startDay));
    var to = CR.dateOf(Math.min(H.bins[b].b, D.asOfDay));
    if (from <= D.meta.first_date && to >= D.asOf) { set({ from: null, to: null }); return; }
    set({ from: from === D.meta.first_date ? null : from, to: to === D.asOf ? null : to });
    $("#cad-meta").textContent = "Selected " + from + " to " + to + ". Escape or Clear filters returns to the whole record.";
  }

  function renderHeatTable() {
    var years = ["2022", "2023", "2024", "2025", "2026"];
    var h = '<table class="dt"><caption>Releases per lab per year, in view' + (filtered() ? " (" + esc(viewWords()) + ")" : "") + '. Revisions are left out.</caption><thead><tr><th scope="col">Lab</th>' +
      years.map(function (y) { return '<th scope="col" class="n">' + y + "</th>"; }).join("") + '<th scope="col" class="n">Total</th></tr></thead><tbody>';
    CR.ORG_ORDER.forEach(function (o) {
      if (!labIn(o)) { return; }
      var tot = 0;
      h += '<tr><th scope="row">' + esc(CR.ORG_NAMES[o]) + "</th>" + years.map(function (y) {
        var n = D.releases.filter(function (e) { return e.org === o && e._year === y && dateIn(e.date); }).length; tot += n;
        return '<td class="n num">' + n + "</td>";
      }).join("") + '<td class="n num">' + tot + "</td></tr>";
    });
    $("#cad-table").innerHTML = h + "</tbody></table>";
  }

  /* ---------- feed ---------- */

  function renderFeed() {
    var list = D.entries.filter(inView);
    $("#h-feed").textContent = filtered() ? "In view, newest first" : "Newest on record";
    $("#feed-meta").textContent = filtered() ? CR.plural(list.length, "entry", "entries") + " match. Hover a row to find it in the grid." : "The latest entries, releases and revisions. Hover a row to find it in the grid.";
    var shown = list.slice(0, 80);
    var h = shown.map(function (e) {
      var tags = "";
      if (!e._rel) { tags += '<span class="tag">revision</span>'; }
      var sc = e._score[S.bench] || e._score["gpqa-diamond"] || e._score["swe-bench-verified"];
      if (sc) {
        var b = sc.INDEPENDENT || sc.LAB_REPORTED;
        tags += '<span class="fr-sc">' + CR.provGlyph(b.provenance.source_class, 8) + '<span class="num">' + b.value + "</span></span>";
      }
      return '<li><a class="fr" href="explorer.html?id=' + encodeURIComponent(e.id) + '" data-id="' + esc(e.id) + '" data-org="' + e.org + '">' +
        '<time class="num" datetime="' + e.date + '">' + e.date + "</time>" +
        '<span class="fr-name">' + esc(e.model_name) + "</span>" +
        '<span class="fr-lab">' + esc(e._orgName) + "</span>" + (tags ? '<span class="fr-tags">' + tags + "</span>" : "") + "</a></li>";
    }).join("");
    if (list.length > shown.length) {
      h += '<li class="fr-more"><a href="' + esc($("#to-explorer").getAttribute("href")) + '">' + (list.length - shown.length) + " more in the explorer</a></li>";
    }
    if (!list.length) { h = '<li class="empty">No entries match this view. <button type="button" class="link-btn" data-clear>Clear filters</button></li>'; }
    $("#feed-list").innerHTML = h;
  }
  function wireFeed() {
    var fl = $("#feed-list");
    fl.addEventListener("mouseover", function (ev) {
      var a = ev.target.closest(".fr"); if (!a || !H) { return; }
      var e = D.byId[a.getAttribute("data-id")];
      var r = H.rows.indexOf(e.org), bi = binIndex(e._day);
      showCursor(r, bi); linkLab(e.org);
      $$(".fr", fl).forEach(function (x) { x.classList.toggle("hl-on", x === a); });
    });
    fl.addEventListener("focusin", function (ev) { var a = ev.target.closest(".fr"); if (a) { a.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); } });
    fl.addEventListener("mouseleave", hideCursor);
    fl.addEventListener("focusout", hideCursor);
    fl.addEventListener("click", function (ev) { if (ev.target.closest("[data-clear]")) { clearAll(); } });
  }

  /* ---------- lab panels ---------- */

  function quarters() {
    var out = [], y = +D.meta.first_date.slice(0, 4), q = Math.floor((+D.meta.first_date.slice(5, 7) - 1) / 3);
    var endY = +D.asOf.slice(0, 4), endQ = Math.floor((+D.asOf.slice(5, 7) - 1) / 3);
    while (y < endY || (y === endY && q <= endQ)) {
      var a = y + "-" + ["01", "04", "07", "10"][q] + "-01";
      var b = y + "-" + ["03-31", "06-30", "09-30", "12-31"][q];
      out.push({ a: a, b: b, k: y + " Q" + (q + 1) });
      q++; if (q > 3) { q = 0; y++; }
    }
    return out;
  }

  function renderLabs() {
    var grid = $("#labs-grid");
    var W = grid.clientWidth;
    if (!W) { return; }
    var cols = W > 860 ? 4 : W > 560 ? 2 : 1;
    var cardW = Math.floor((W - (cols - 1) * 12) / cols) - 24;
    var Q = quarters();
    var qMax = 0, qc = {};
    CR.ORG_ORDER.forEach(function (o) {
      qc[o] = Q.map(function (q) {
        var n = D.releases.filter(function (e) { return e.org === o && e.date >= q.a && e.date <= q.b; }).length;
        if (n > qMax) { qMax = n; }
        return n;
      });
    });
    var bench = "gpqa-diamond";
    var html = "";
    CR.ORG_ORDER.forEach(function (o) {
      var all = D.releases.filter(function (e) { return e.org === o; });
      var view = all.filter(function (e) { return dateIn(e.date); });
      var active = labIn(o);
      var g = CR.median(CR.labGaps(view).map(function (x) { return x.gap; }));
      var pressed = S.labs.indexOf(o) >= 0;
      html += '<article class="lab' + (active ? "" : " dim") + '" data-org="' + o + '" aria-labelledby="lab-' + o + '">' +
        '<header class="lab-h"><button type="button" class="lab-name" id="lab-' + o + '" data-org="' + o + '" aria-pressed="' + pressed + '">' + esc(CR.ORG_NAMES[o]) + "</button>" +
        '<span class="lab-c">' + esc(CR.ORG_COUNTRY[o]) + "</span></header>" +
        '<dl class="lab-stats"><div><dt>Releases</dt><dd class="num">' + view.length + "</dd></div>" +
        "<div><dt>Median wait</dt><dd>" + (g == null ? '<span class="num dash">-</span>' : '<span class="num">' + days(g) + '</span> <span class="unit">days</span>') + "</dd></div>" +
        "</dl>";

      /* cadence: releases per quarter, one scale for all twelve */
      var ch = 34, bw = cardW / Q.length;
      var s = svgOpen(cardW, ch + 12, "lab-cad", CR.ORG_NAMES[o] + ": releases per quarter. " + Q.map(function (q, i) { return qc[o][i] ? q.k + " " + qc[o][i] : ""; }).filter(Boolean).join(", ") + ".");
      Q.forEach(function (q, i) {
        var n = qc[o][i]; if (!n) { return; }
        var bh = Math.max(2, ch * n / qMax);
        var on = !(S.from && q.b < S.from) && !(S.to && q.a > S.to);
        s += '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (ch - bh).toFixed(1) + '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + bh.toFixed(1) + '" class="' + (on ? "c-on" : "c-off") + '"><title>' + q.k + ": " + CR.plural(n, "release") + "</title></rect>";
      });
      s += '<line x1="0" x2="' + cardW + '" y1="' + (ch + 0.5) + '" y2="' + (ch + 0.5) + '" class="c-base"/>';
      [2023, 2024, 2025, 2026].forEach(function (yy) {
        var qi = Q.map(function (q) { return q.k; }).indexOf(yy + " Q1");
        if (qi >= 0) { s += '<text x="' + (qi * bw + 1).toFixed(1) + '" y="' + (ch + 11) + '" class="c-ax">' + String(yy).slice(2) + "</text>"; }
      });
      s += "</svg>";
      html += '<div class="lab-cad">' + s + "</div>";

      /* disclosure: the latest releases in view, oldest to newest */
      var pitch = 9, labelW = cols === 1 ? 76 : 72, cntW = cols === 1 ? 48 : 44;
      var k = Math.max(6, Math.floor((cardW - labelW - cntW) / pitch));
      var recent = view.slice(0, k).reverse();
      html += '<div class="lab-disc" role="table" aria-label="' + esc(CR.ORG_NAMES[o]) + ': disclosure for the latest ' + recent.length + ' releases in view">';
      CR.DISC_SLOTS.forEach(function (sl) {
        var c = CR.discCounts(view, sl[0]);
        html += '<div class="ld-row" role="row"><span class="ld-l" role="rowheader">' + sl[1] + '</span><span class="ld-g" role="cell">';
        recent.forEach(function (e) {
          html += '<span class="ld-c" data-id="' + esc(e.id) + '" data-slot="' + sl[0] + '">' + CR.discGlyph(e._disc[sl[0]], 8) + "</span>";
        });
        html += '<span class="sr">' + c.disclosed + " with a link, " + c.not_disclosed + " not disclosed, " + c.not_researched + " not yet researched</span></span>" +
          '<span class="ld-n" role="cell">' + (c.researched ? '<span class="num">' + c.disclosed + "</span>/" + c.researched : '<span class="nr-w">none checked</span>') + "</span></div>";
      });
      html += "</div>";
      if (view.length > recent.length) { html += '<p class="lab-note">Squares show the latest ' + recent.length + " of " + view.length + " releases; counts are links on record of researched releases, all " + view.length + ".</p>"; }
      else if (view.length) { html += '<p class="lab-note">Counts: links on record of researched releases.</p>'; }

      /* independent score trend */
      var sh = 44, pts = [];
      D.entries.forEach(function (e) {
        if (e.org !== o) { return; }
        var sc = e._score[bench];
        if (sc && sc.INDEPENDENT) { pts.push({ e: e, v: sc.INDEPENDENT.value, c: "INDEPENDENT" }); }
        if (sc && sc.LAB_REPORTED) { pts.push({ e: e, v: sc.LAB_REPORTED.value, c: "LAB_REPORTED" }); }
      });
      pts.sort(function (a, b) { return a.e._day - b.e._day; });
      var ind = pts.filter(function (p) { return p.c === "INDEPENDENT"; });
      var x0 = D.startDay, x1 = D.asOfDay;
      var sx = function (d) { return 4 + (cardW - 40) * (d - x0) / (x1 - x0); };
      var sy = function (v) { return 4 + (sh - 8) * (1 - v / 100); };
      if (ind.length) {
        var last = ind[ind.length - 1];
        var t = svgOpen(cardW, sh, "lab-sc", CR.ORG_NAMES[o] + ": independent GPQA Diamond scores, first " + ind[0].v + " (" + ind[0].e.model_name + "), latest " + last.v + " (" + last.e.model_name + ").");
        [0, 50, 100].forEach(function (v) { t += '<line x1="4" x2="' + (cardW - 36) + '" y1="' + sy(v).toFixed(1) + '" y2="' + sy(v).toFixed(1) + '" class="s-grid"/>'; });
        t += '<path d="' + ind.map(function (p, i) { return (i ? "L" : "M") + sx(p.e._day).toFixed(1) + " " + sy(p.v).toFixed(1); }).join("") + '" class="s-line"/>';
        pts.forEach(function (p) {
          var on = dateIn(p.e.date) ? "" : " off";
          if (p.c === "INDEPENDENT") { t += '<circle cx="' + sx(p.e._day).toFixed(1) + '" cy="' + sy(p.v).toFixed(1) + '" r="2.4" class="s-ind' + on + '"/>'; }
          else { var cx = sx(p.e._day), cy = sy(p.v); t += '<path d="M' + cx.toFixed(1) + " " + (cy - 3.2).toFixed(1) + "l3.2 3.2l-3.2 3.2l-3.2 -3.2Z" + '" class="s-lab' + on + '"/>'; }
        });
        t += '<text x="' + (cardW - 32) + '" y="' + (sy(last.v) + 4).toFixed(1) + '" class="s-v">' + last.v + "</text></svg>";
        html += '<div class="lab-sc-wrap"><p class="lab-sc-h">Independent GPQA Diamond, 0 to 100</p>' + t + "</div>";
      } else {
        html += '<div class="lab-sc-wrap"><p class="lab-sc-h">Independent GPQA Diamond, 0 to 100</p><p class="lab-none">No independent score on record.</p></div>';
      }
      html += "</article>";
    });
    grid.style.setProperty("--cols", cols);
    grid.innerHTML = html;
    $("#labs-legend").innerHTML = discLegend() + '<span class="lg-item">' + CR.provGlyph("INDEPENDENT", 9) + " IND</span>";
  }
  function discLegend() {
    return '<span class="lg-item">' + CR.discGlyph("disclosed", 9) + " link on record</span>" +
      '<span class="lg-item">' + CR.discGlyph("not_disclosed", 9) + " not disclosed</span>" +
      '<span class="lg-item">' + CR.discGlyph("not_researched", 9) + " not yet researched</span>";
  }
  function wireLabs() {
    var grid = $("#labs-grid");
    grid.addEventListener("click", function (ev) {
      var b = ev.target.closest(".lab-name"); if (b) { toggleLab(b.getAttribute("data-org"), ev.shiftKey || ev.metaKey || ev.ctrlKey); }
    });
    grid.addEventListener("mouseover", function (ev) {
      var c = ev.target.closest(".ld-c");
      if (c) {
        var e = D.byId[c.getAttribute("data-id")], sl = c.getAttribute("data-slot");
        var r = c.getBoundingClientRect();
        CR.tip('<p class="t-h">' + esc(e.model_name) + '</p><p class="t-s">' + esc(e._orgName) + ", " + e.date + "</p>" +
          '<p class="t-row">' + CR.DISC_SLOTS.filter(function (x) { return x[0] === sl; })[0][1] + ": " + CR.discMark(e._disc[sl]) + "</p>", r.right, r.bottom);
        return;
      }
      var card = ev.target.closest(".lab");
      if (card && H) { $$(".hl").forEach(function (x) { x.classList.toggle("hover", x.getAttribute("data-org") === card.getAttribute("data-org")); }); }
    });
    grid.addEventListener("mouseout", function (ev) { if (ev.target.closest(".ld-c")) { CR.untip(); } });
    grid.addEventListener("mouseleave", function () { $$(".hl.hover").forEach(function (x) { x.classList.remove("hover"); }); });
  }

  /* ---------- findings ---------- */

  function findings() {
    var F = [];
    var rel = D.releases;
    var yearly = {}; D.views.cadence.yearly.forEach(function (y) { yearly[y.year] = y.releases; });
    var y = D.asOf.slice(0, 4), py = String(+y - 1), cut = py + D.asOf.slice(4);
    var nY = rel.filter(function (e) { return e._year === y && e.date <= D.asOf; }).length;
    var nP = rel.filter(function (e) { return e._year === py && e.date <= cut; }).length;
    F.push({
      t: "Releases per year",
      p: '<span class="num">' + yearly["2023"] + "</span> releases in 2023, <span class=\"num\">" + yearly["2024"] + "</span> in 2024 and <span class=\"num\">" + yearly["2025"] + "</span> in 2025. A partial year: <span class=\"num\">" + nY + "</span> releases by " + D.asOf + ". By the same date in " + py + " there were <span class=\"num\">" + nP + "</span>.",
      a: "Select " + y, run: function () { set({ from: y + "-01-01", to: null }); scrollTo("#p-cadence"); }
    });

    var fl = {};
    ["openai", "anthropic"].forEach(function (o) { fl[o] = CR.firstLately(rel.filter(function (e) { return e.org === o; })); });
    F.push({
      t: "The wait between releases",
      p: "OpenAI: about <span class=\"num\">" + fl.openai.first + "</span> days between releases at first, about <span class=\"num\">" + fl.openai.lately + "</span> lately. Anthropic: about <span class=\"num\">" + fl.anthropic.first + "</span> at first, about <span class=\"num\">" + fl.anthropic.lately + "</span> lately.",
      a: "Compare the two", run: function () { openCompare("openai", "anthropic"); }
    });

    var ind = D.views.trajectory.series.filter(function (s) { return s.benchmark === "gpqa-diamond" && s.source_class === "INDEPENDENT"; })[0].points;
    var maxBy = {};
    ind.forEach(function (p) { var yy = p.date.slice(0, 4); if (CR.ORG_NAMES[p.org]) { maxBy[yy] = Math.max(maxBy[yy] || 0, p.value); } });
    var ys = Object.keys(maxBy).sort();
    F.push({
      t: "Independent scores climbed",
      p: "From " + ys[0] + " to " + ys[ys.length - 1] + ", the highest independent GPQA Diamond score rose from <span class=\"num\">" + Math.round(maxBy[ys[0]]) + "</span> to <span class=\"num\">" + Math.round(maxBy[ys[ys.length - 1]]) + "</span>. Every one is Epoch AI's measurement.",
      a: "Show the scores", run: function () { set({ bench: "gpqa-diamond" }); scrollTo("#p-scores"); }
    });

    var p0 = CR.discCounts(rel.filter(function (e) { return e._year === "2023"; }), "paper");
    var p1 = CR.discCounts(rel.filter(function (e) { return e._year === y; }), "paper");
    F.push({
      t: p1.share < p0.share ? "Fewer arrive with a paper" : "Releases with a paper",
      p: "In 2023, <span class=\"num\">" + p0.disclosed + "</span> of " + p0.researched + " researched releases had a paper on record (" + CR.pct(p0.disclosed, p0.researched) + "%). In " + y + " so far, <span class=\"num\">" + p1.disclosed + "</span> of " + p1.researched + " (" + CR.pct(p1.disclosed, p1.researched) + "%). Papers can come out weeks after a release, so recent years may rise." + skewSentence("paper", "the share"),
      a: "Show disclosure", run: function () { scrollTo("#p-disc"); }
    });

    var s0 = CR.discCounts(rel.filter(function (e) { return e._year === "2023"; }), "system_card");
    var s1 = CR.discCounts(rel.filter(function (e) { return e._year === y; }), "system_card");
    F.push({
      t: s1.share > s0.share ? "More arrive with a system card" : "Releases with a system card",
      p: "The share of researched releases with a system card " + (s1.share > s0.share ? "rose" : s1.share < s0.share ? "fell" : "held") + " from " + CR.pct(s0.disclosed, s0.researched) + "% in 2023 to " + CR.pct(s1.disclosed, s1.researched) + "% in " + y + " (<span class=\"num\">" + s0.disclosed + "</span> of " + s0.researched + ", then <span class=\"num\">" + s1.disclosed + "</span> of " + s1.researched + ")." + skewSentence("system_card", "these " + y + " shares"),
      a: "Show " + y, run: function () { set({ from: y + "-01-01", to: null }); scrollTo("#p-disc"); }
    });

    var P = CR.pairs(D);
    var nModels = {}; P.forEach(function (p) { nModels[p.e.id] = 1; });
    var within = P.filter(function (p) { return Math.abs(p.lab.value - p.ind.value) <= 1; }).length;
    var up = P.filter(function (p) { return p.lab.value > p.ind.value; }).length, down = P.filter(function (p) { return p.lab.value < p.ind.value; }).length;
    var diff = P.filter(function (p) { var a = CR.labSetting(p.lab.configuration), b = CR.indSetting(p.ind.configuration); return a.lvl && b.lvl && a.lvl !== b.lvl; });
    F.push({
      t: "What the lab said, beside what Epoch measured",
      p: "<span class=\"num\">" + Object.keys(nModels).length + "</span> releases were graded twice on the same benchmark: once by the releasing lab, once by Epoch. " + within + " of the " + P.length + " pairs sit within a single point" + (up && down ? ", and the gaps run both ways" : "") + "." +
        (diff.length ? " In " + CR.nword(diff.length) + " of the " + CR.nword(P.length) + " pairs the lab and Epoch ran different reasoning settings, so those gaps include a settings difference." : "") + " With so few pairs this is not a test of whether labs overstate.",
      a: "Show the pairs", run: function () { scrollTo("#p-pairs"); }
    });
    return F;
  }
  /* The story's caveat when the checked releases of the latest year lean
     toward its newest months. */
  function skewSentence(slot, what) {
    var y = D.asOf.slice(0, 4);
    var ys = D.releases.filter(function (e) { return e._year === y; }).map(function (e) { return e.date; }).sort();
    if (!ys.length) { return ""; }
    var lm = +ys[ys.length - 1].slice(5, 7), cm = Math.max(1, lm - 1);
    var cut = y + "-" + (cm < 10 ? "0" : "") + cm + "-01";
    var res = D.releases.filter(function (e) { return e._year === y && e._disc[slot] !== "not_researched"; }).map(function (e) { return e.date; });
    if (!res.length) { return ""; }
    var k = res.filter(function (d) { return d >= cut; }).length, m = ys.filter(function (d) { return d >= cut; }).length;
    if (!(k / res.length > m / ys.length)) { return ""; }
    var MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return " In " + y + ", " + k + " of the " + res.length + " checked releases are from " + MON[cm - 1] + " or later, a period that holds " + m + " of the year's " + ys.length + " releases. The checked releases lean toward the newest ones, so " + what + " may move as earlier " + y + " releases are checked.";
  }
  var FINDINGS = [];
  function renderFindings() {
    FINDINGS = findings();
    $("#findings-list").innerHTML = FINDINGS.map(function (f, i) {
      return '<li class="fd"><h3>' + esc(f.t) + "</h3><p>" + f.p + '</p><button type="button" class="link-btn" data-f="' + i + '">' + esc(f.a) + "</button></li>";
    }).join("");
  }
  function scrollTo(sel) {
    var el = $(sel); if (!el) { return; }
    el.scrollIntoView({ behavior: CR.reducedMotion() ? "auto" : "smooth", block: "start" });
    var h = el.querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  /* ---------- scores over time ---------- */

  var SC = null, SC_H = 0, WF_P = 8;
  function scorePoints() {
    var pts = [];
    D.views.trajectory.series.forEach(function (s) {
      if (s.benchmark !== S.bench) { return; }
      s.points.forEach(function (p) {
        var e = D.byId[p.entry_id];
        pts.push({ e: e, v: p.value, c: s.source_class, cfg: p.configuration, url: p.source_url, rd: p.retrieval_date, day: CR.dayNum(p.date) });
      });
    });
    return pts.sort(function (a, b) { return a.day - b.day || (a.c < b.c ? -1 : 1); });
  }
  function renderScores() {
    var host = $("#scores-chart");
    var W = host.clientWidth, mobile = W < 560;
    if (!W) { return; }
    var Hh = mobile ? 220 : (SC_H || 300);
    var m = { l: 34, r: mobile ? 10 : 120, t: 12, b: 26 };
    var pw = W - m.l - m.r, ph = Hh - m.t - m.b;
    var pts = scorePoints();
    var x0 = D.startDay, x1 = D.asOfDay;
    var sx = function (d) { return m.l + pw * (d - x0) / (x1 - x0); };
    var sy = function (v) { return m.t + ph * (1 - v / 100); };
    var nIn = pts.filter(function (p) { return inView(p.e); });
    var label = CR.BENCH[S.bench] + " scores over time: " + pts.filter(function (p) { return p.c === "INDEPENDENT"; }).length + " independent and " +
      pts.filter(function (p) { return p.c === "LAB_REPORTED"; }).length + " lab-reported scores. The table view lists every score in view.";
    var s = svgOpen(W, Hh, "sc-svg", label);
    [0, 25, 50, 75, 100].forEach(function (v) {
      s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + sy(v).toFixed(1) + '" y2="' + sy(v).toFixed(1) + '" class="' + (v === 0 ? "ax-base" : "ax-grid") + '"/>';
      s += '<text x="' + (m.l - 8) + '" y="' + (sy(v) + 4).toFixed(1) + '" text-anchor="end" class="ax-t">' + v + "</text>";
    });
    for (var yy = +D.meta.first_date.slice(0, 4) + 1; yy <= +D.asOf.slice(0, 4); yy++) {
      var xx = sx(CR.dayNum(yy + "-01-01"));
      s += '<line x1="' + xx.toFixed(1) + '" x2="' + xx.toFixed(1) + '" y1="' + (m.t + ph) + '" y2="' + (m.t + ph + 4) + '" class="ax-base"/><text x="' + (xx + 4).toFixed(1) + '" y="' + (Hh - 8) + '" class="ax-t">' + yy + "</text>";
    }
    /* outside the selected range */
    if (S.from || S.to) {
      var fa = S.from ? sx(CR.dayNum(S.from)) : m.l, fb = S.to ? sx(CR.dayNum(S.to)) : m.l + pw;
      s += '<rect x="' + m.l + '" y="' + m.t + '" width="' + Math.max(0, fa - m.l).toFixed(1) + '" height="' + ph + '" class="sc-out"/>';
      s += '<rect x="' + fb.toFixed(1) + '" y="' + m.t + '" width="' + Math.max(0, m.l + pw - fb).toFixed(1) + '" height="' + ph + '" class="sc-out"/>';
    }
    /* highest independent score to date, a step line */
    var best = -1, step = "", indPts = pts.filter(function (p) { return p.c === "INDEPENDENT"; });
    indPts.forEach(function (p) {
      if (p.v > best) {
        step += (step ? "L" + sx(p.day).toFixed(1) + " " + sy(best).toFixed(1) : "M" + sx(p.day).toFixed(1) + " " + sy(p.v).toFixed(1)) + "L" + sx(p.day).toFixed(1) + " " + sy(p.v).toFixed(1);
        best = p.v;
      }
    });
    if (step) {
      step += "L" + sx(x1).toFixed(1) + " " + sy(best).toFixed(1);
      s += '<path d="' + step + '" class="sc-best"/>';
      if (!mobile) { s += '<text x="' + (m.l + pw + 6) + '" y="' + (sy(best) + 4).toFixed(1) + '" class="ax-t">Highest so far: <tspan class="num-t">' + best + "</tspan></text>"; }
    }
    /* pairs: the lab's score and Epoch's on one release */
    var byE = {};
    pts.forEach(function (p) { (byE[p.e.id] = byE[p.e.id] || {})[p.c] = p; });
    Object.keys(byE).forEach(function (id) {
      var q = byE[id];
      if (q.INDEPENDENT && q.LAB_REPORTED) {
        var on = inView(q.INDEPENDENT.e) ? "" : " off";
        s += '<line x1="' + sx(q.INDEPENDENT.day).toFixed(1) + '" x2="' + sx(q.INDEPENDENT.day).toFixed(1) + '" y1="' + sy(q.INDEPENDENT.v).toFixed(1) + '" y2="' + sy(q.LAB_REPORTED.v).toFixed(1) + '" class="sc-pair' + on + '"/>';
      }
    });
    pts.forEach(function (p, i) {
      var on = inView(p.e) ? "" : " off";
      var cx = sx(p.day), cy = sy(p.v);
      if (p.c === "INDEPENDENT") { s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" class="sc-ind' + on + '" data-i="' + i + '"/>'; }
      else { s += '<path d="M' + cx.toFixed(1) + " " + (cy - 5).toFixed(1) + "l5 5l-5 5l-5 -5Z" + '" class="sc-lab' + on + '" data-i="' + i + '"/>'; }
    });
    s += '<circle class="sc-ring" r="8" cx="-20" cy="-20"/></svg>';
    host.innerHTML = '<div class="sc-plot" tabindex="0" role="application" aria-roledescription="scatter chart" aria-label="' + esc(label) + ' Arrow keys step through the scores in date order; Enter opens the release.">' + s + "</div>";
    SC = { pts: pts, sx: sx, sy: sy, host: host, k: -1 };
    $("#scores-legend").innerHTML = '<span class="lg-item">' + CR.provGlyph("INDEPENDENT", 10) + ' <b>IND</b> measured by Epoch AI</span><span class="lg-item">' + CR.provGlyph("LAB_REPORTED", 10) +
      ' <b>LAB</b> reported by the lab</span><span class="lg-item"><svg width="16" height="10" aria-hidden="true"><line x1="0" x2="16" y1="5" y2="5" class="sc-best"/></svg> highest independent score so far</span>' +
      '<span class="lg-item lg-n">' + CR.plural(nIn.length, "score") + " in view</span>";
    $("#scores-meta").textContent = "Every " + CR.BENCH[S.bench] + " score on record, by release date. Percentages from 0 to 100; a vertical line joins two scores of one release.";
    $$("#bench-seg button").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-b") === S.bench ? "true" : "false"); b.tabIndex = b.getAttribute("data-b") === S.bench ? 0 : -1; });
    wireScores();
  }
  function scoreTip(p) {
    return '<p class="t-h">' + esc(p.e.model_name) + '</p><p class="t-s">' + esc(p.e._orgName) + ", " + p.e.date + "</p>" +
      '<p class="t-row">' + CR.BENCH[S.bench] + ': <b class="num">' + p.v + "</b> " + CR.provTag(p.c, null, p.rd) + "</p>" +
      (p.cfg ? '<p class="t-m">Settings: ' + esc(p.cfg) + "</p>" : '<p class="t-m">Settings: not stated</p>') +
      '<p class="t-m">Retrieved ' + esc(p.rd) + (p.c === "INDEPENDENT" ? " from Epoch AI" : " from the lab's page") + ".</p>";
  }
  function wireScores() {
    var plot = $(".sc-plot", SC.host), svg = $("svg", plot);
    function nearest(ev) {
      var r = svg.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, best = null, bd = 196;
      SC.pts.forEach(function (p, i) { var dx = SC.sx(p.day) - x, dy = SC.sy(p.v) - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      return best;
    }
    function ring(i) {
      var rg = $(".sc-ring", svg);
      if (i == null) { rg.classList.remove("on"); return; }
      rg.classList.add("on");
      var p = SC.pts[i]; rg.setAttribute("cx", SC.sx(p.day).toFixed(1)); rg.setAttribute("cy", SC.sy(p.v).toFixed(1));
    }
    svg.addEventListener("pointermove", function (ev) {
      var i = nearest(ev);
      ring(i);
      if (i == null) { CR.untip(); svg.style.cursor = ""; return; }
      svg.style.cursor = "pointer";
      CR.tip(scoreTip(SC.pts[i]), ev.clientX, ev.clientY);
    });
    svg.addEventListener("pointerleave", function () { ring(null); CR.untip(); });
    svg.addEventListener("click", function (ev) { var i = nearest(ev); if (i != null) { location.href = "explorer.html?id=" + encodeURIComponent(SC.pts[i].e.id); } });
    plot.addEventListener("keydown", function (ev) {
      var n = SC.pts.length; if (!n) { return; }
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") { SC.k = Math.min(n - 1, SC.k + 1); }
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") { SC.k = Math.max(0, SC.k - 1); }
      else if (ev.key === "Home") { SC.k = 0; } else if (ev.key === "End") { SC.k = n - 1; }
      else if (ev.key === "Enter" && SC.k >= 0) { location.href = "explorer.html?id=" + encodeURIComponent(SC.pts[SC.k].e.id); return; }
      else { return; }
      ev.preventDefault();
      ring(SC.k);
      var r = svg.getBoundingClientRect(), p = SC.pts[SC.k];
      CR.tip(scoreTip(p), r.left + SC.sx(p.day), r.top + SC.sy(p.v));
    });
    plot.addEventListener("blur", function () { ring(null); CR.untip(); });
  }
  function renderScoresTable() {
    var pts = scorePoints().filter(function (p) { return inView(p.e); }).reverse();
    $("#scores-table").innerHTML = '<table class="dt"><caption>' + CR.BENCH[S.bench] + " scores in view, newest first. LAB is the lab's own report; IND is Epoch AI's measurement.</caption>" +
      '<thead><tr><th scope="col">Release</th><th scope="col">Lab</th><th scope="col" class="n">Date</th><th scope="col" class="n">Score</th><th scope="col">Source</th><th scope="col">Settings</th></tr></thead><tbody>' +
      pts.map(function (p) {
        return '<tr><th scope="row"><a href="explorer.html?id=' + encodeURIComponent(p.e.id) + '">' + esc(p.e.model_name) + "</a></th><td>" + esc(p.e._orgName) + '</td><td class="n num">' + p.e.date + '</td><td class="n num">' + p.v + "</td><td>" + CR.provTag(p.c, p.url, p.rd) + '</td><td class="cfg">' + esc(p.cfg || "not stated") + "</td></tr>";
      }).join("") + (pts.length ? "" : '<tr><td colspan="6" class="empty">No ' + CR.BENCH[S.bench] + " score in view.</td></tr>") + "</tbody></table>";
  }

  /* ---------- pairs and refusals ---------- */

  function renderPairs() {
    var P = CR.pairs(D);
    var h = '<table class="dt pairs"><thead><tr><th scope="col">Release</th><th scope="col" class="n">' + CR.provGlyph("LAB_REPORTED", 9) + ' LAB</th><th scope="col" class="n">' + CR.provGlyph("INDEPENDENT", 9) + ' IND</th><th scope="col" class="n">Gap</th></tr></thead><tbody>';
    P.forEach(function (p) {
      var gap = Math.round((p.lab.value - p.ind.value) * 10) / 10;
      var ls = CR.labSetting(p.lab.configuration), is = CR.indSetting(p.ind.configuration);
      var differ = ls.lvl && is.lvl && ls.lvl !== is.lvl;
      var on = inView(p.e) ? "" : ' class="off"';
      h += "<tr" + on + '><th scope="row"><a href="explorer.html?id=' + encodeURIComponent(p.e.id) + '">' + esc(p.e.model_name) + '</a><span class="pr-sub">' + CR.BENCH[p.bench] + "</span>" + '<span class="pr-sub">Lab ' + esc(ls.words) + ", Epoch " + esc(is.words) + (differ ? ' <span class="pr-diff">(differ)</span>' : "") + "</span></th>" +
        '<td class="n"><a class="num" href="' + esc(p.lab.provenance.source_url) + '" rel="external noopener" target="_blank" title="LAB: reported by the releasing lab. Retrieved ' + esc(p.lab.provenance.retrieval_date) + '.">' + p.lab.value + "</a></td>" +
        '<td class="n"><a class="num" href="' + esc(p.ind.provenance.source_url) + '" rel="external noopener" target="_blank" title="IND: measured by Epoch AI. Retrieved ' + esc(p.ind.provenance.retrieval_date) + '.">' + p.ind.value + "</a></td>" +
        '<td class="n num">' + (gap > 0 ? "+" : gap < 0 ? "−" : "") + Math.abs(gap).toFixed(1) + "</td></tr>";
    });
    h += '</tbody></table><p class="pr-note">Gap is the lab\'s number minus Epoch\'s. Settings are read from the configuration on record; "not stated" means the record does not say.</p>';
    $("#pairs-body").innerHTML = h;
    renderRefused();
  }
  function renderRefused() {
    var h;
    var refused = [];
    Object.keys(D.deltas).forEach(function (id) { D.deltas[id].forEach(function (d) { if (d.kind === "REFUSED_COMPARISON") { refused.push({ e: D.byId[id], r: d.reason }); } }); });
    refused.sort(function (a, b) { return a.e.date < b.e.date ? 1 : -1; });
    h = '<p class="rf-big"><span class="num">' + D.meta.delta_chips + '</span> changes against a predecessor are on record. <span class="num">' + refused.length + "</span> " + (refused.length === 1 ? "comparison was" : "comparisons were") + " refused:</p><ul class=\"refusals\">" +
      refused.map(function (x) {
        return '<li><a href="explorer.html?id=' + encodeURIComponent(x.e.id) + '">' + esc(x.e.model_name) + '</a> <span class="ref-r">No comparable measurement against the predecessor: ' + esc(x.r) + ".</span></li>";
      }).join("") + "</ul>";
    $("#refused-body").innerHTML = h;
  }

  /* ---------- disclosure squares ---------- */

  function renderDisc() {
    var host = $("#waffles");
    var W = host.clientWidth, mobile = W < 640;
    if (!W) { return; }
    var y = D.asOf.slice(0, 4);
    var years = ["2023", "2024", "2025", "2026"].filter(function (yy) { return yy <= y; });
    var labelW = mobile ? 0 : 108;
    var colW = Math.floor((W - labelW) / years.length) - 10;
    var pitch = mobile ? 6 : WF_P, sq = pitch - (pitch > 9 ? 2.5 : 1.5);
    var perRow = Math.max(4, Math.floor(colW / pitch));
    var byYear = {};
    years.forEach(function (yy) { byYear[yy] = D.releases.filter(function (e) { return e._year === yy && inView(e); }); });
    var maxN = Math.max.apply(null, years.map(function (yy) { return D.releases.filter(function (e) { return e._year === yy; }).length; }));
    var rowsMax = Math.ceil(maxN / perRow);
    var order = { disclosed: 0, not_disclosed: 1, not_researched: 2 };
    var h = '<div class="wf-grid" style="--wf-cols:' + years.length + ";--wf-label:" + labelW + 'px">';
    if (!mobile) { h += '<div class="wf-corner"></div>'; }
    years.forEach(function (yy) { h += '<div class="wf-yh">' + (yy === y ? yy + " so far" : yy) + ' <span class="num">' + byYear[yy].length + "</span></div>"; });
    CR.DISC_SLOTS.forEach(function (sl) {
      if (!mobile) { h += '<div class="wf-rh">' + sl[1] + "</div>"; }
      years.forEach(function (yy) {
        var list = byYear[yy].slice().sort(function (a, b) { return order[a._disc[sl[0]]] - order[b._disc[sl[0]]] || a._day - b._day; });
        var c = CR.discCounts(list, sl[0]);
        var hh = rowsMax * pitch;
        var lab = sl[1] + ", " + yy + ": " + c.disclosed + " with a link on record, " + c.not_disclosed + " not disclosed, " + c.not_researched + " not yet researched.";
        var s = svgOpen(perRow * pitch, Math.max(pitch, Math.ceil(list.length / perRow) * pitch), "wf", lab);
        list.forEach(function (e, i) {
          var cx = (i % perRow) * pitch, cy = Math.floor(i / perRow) * pitch, st = e._disc[sl[0]];
          if (st === "disclosed") { s += '<rect x="' + cx + '" y="' + cy + '" width="' + sq + '" height="' + sq + '" rx="0.8" class="g-dy" data-id="' + esc(e.id) + '"/>'; }
          else if (st === "not_disclosed") { s += '<rect x="' + (cx + 0.6) + '" y="' + (cy + 0.6) + '" width="' + (sq - 1.2) + '" height="' + (sq - 1.2) + '" rx="0.8" class="g-dn" data-id="' + esc(e.id) + '"/>'; }
          else { s += '<line x1="' + (cx + 1) + '" x2="' + (cx + sq - 1) + '" y1="' + (cy + sq / 2) + '" y2="' + (cy + sq / 2) + '" class="g-dr"/><rect x="' + cx + '" y="' + cy + '" width="' + sq + '" height="' + sq + '" class="hit" data-id="' + esc(e.id) + '"/>'; }
        });
        s += "</svg>";
        h += '<div class="wf-cell" data-slot="' + sl[0] + '">' + (mobile ? '<p class="wf-mh">' + sl[1] + "</p>" : "") + '<div class="wf-sq" style="min-height:' + hh + 'px">' + s + "</div>" +
          '<p class="wf-n">' + (c.researched ? '<b class="num">' + Math.round(100 * c.share) + "%</b> <span>" + c.disclosed + " of " + c.researched + "</span>" : '<span class="nr-w">none researched</span>') + "</p>" +
          '<p class="wf-nr">' + (list.length ? c.not_researched + " not yet researched" : "no releases in view") + "</p></div>";
      });
    });
    h += "</div>";
    var n22 = D.releases.filter(function (e) { return e._year === "2022" && inView(e); }).length;
    if (n22) { h += '<p class="pr-note">The record\'s first ' + CR.plural(n22, "release") + ', from 2022, ' + (n22 === 1 ? "is" : "are") + ' in the table view.</p>'; }
    host.innerHTML = h;
    $("#disc-legend").innerHTML = discLegend();
  }
  function wireDisc() {
    var host = $("#waffles");
    host.addEventListener("mouseover", function (ev) {
      var t = ev.target.closest("[data-id]"); if (!t) { return; }
      var e = D.byId[t.getAttribute("data-id")], sl = t.closest(".wf-cell").getAttribute("data-slot");
      CR.tip('<p class="t-h">' + esc(e.model_name) + '</p><p class="t-s">' + esc(e._orgName) + ", " + e.date + '</p><p class="t-row">' +
        CR.DISC_SLOTS.filter(function (x) { return x[0] === sl; })[0][1] + ": " + CR.discMark(e._disc[sl]) + "</p>", ev.clientX, ev.clientY);
    });
    host.addEventListener("mouseout", function (ev) { if (ev.target.closest("[data-id]")) { CR.untip(); } });
    host.addEventListener("click", function (ev) { var t = ev.target.closest("[data-id]"); if (t) { location.href = "explorer.html?id=" + encodeURIComponent(t.getAttribute("data-id")); } });
  }
  function renderDiscTable() {
    var y = D.asOf.slice(0, 4);
    var years = ["2022", "2023", "2024", "2025", "2026"].filter(function (yy) { return yy <= y; });
    var h = '<table class="dt"><caption>Disclosure by year for releases in view. A share divides by researched releases only; not yet researched releases are listed apart and never counted as absent.</caption><thead><tr><th scope="col">Document</th><th scope="col">Year</th><th scope="col" class="n">Link on record</th><th scope="col" class="n">Not disclosed</th><th scope="col" class="n">Not yet researched</th><th scope="col" class="n">Share of researched</th></tr></thead><tbody>';
    CR.DISC_SLOTS.forEach(function (sl) {
      years.forEach(function (yy) {
        var c = CR.discCounts(D.releases.filter(function (e) { return e._year === yy && inView(e); }), sl[0]);
        h += "<tr><th scope=\"row\">" + sl[1] + "</th><td>" + yy + '</td><td class="n num">' + c.disclosed + '</td><td class="n num">' + c.not_disclosed + '</td><td class="n num">' + c.not_researched + '</td><td class="n num">' + (c.researched ? Math.round(100 * c.share) + "%" : "-") + "</td></tr>";
      });
    });
    $("#disc-table").innerHTML = h + "</tbody></table>";
  }

  /* ---------- availability ---------- */

  function renderAccess() {
    var host = $("#access-body");
    if (!host.clientWidth) { return; }
    var y = D.asOf.slice(0, 4);
    var years = ["2022", "2023", "2024", "2025", "2026"].filter(function (yy) { return yy <= y; });
    var kinds = [["open_weights", "Open weights"], ["public_api", "Public API"], ["public_service", "Public service"]];
    var W = Math.max(160, host.clientWidth - 2);
    var h = '<p class="legend legend-row">' + kinds.map(function (k) { return '<span class="lg-item"><svg width="10" height="10" aria-hidden="true"><rect x="0.5" y="0.5" width="9" height="9" rx="1" class="av-' + k[0] + '"/></svg> ' + k[1] + "</span>"; }).join("") + "</p>";
    h += '<table class="dt av"><caption class="sr">Releases in view by availability and year.</caption><thead><tr><th scope="col">Year</th><th scope="col"><span class="sr">Share</span></th><th scope="col" class="n">Open</th><th scope="col" class="n">All</th></tr></thead><tbody>';
    var barW = Math.max(80, W - 150);
    years.forEach(function (yy) {
      var list = D.releases.filter(function (e) { return e._year === yy && inView(e); });
      var n = list.length, x = 0, s = svgOpen(barW, 14, "av-bar");
      kinds.forEach(function (k) {
        var c = list.filter(function (e) { return e.availability_class === k[0]; }).length;
        if (!c) { return; }
        var w = (barW - 4) * c / n;
        s += '<rect x="' + x.toFixed(1) + '" y="1" width="' + Math.max(1, w - 2).toFixed(1) + '" height="12" rx="1" class="av-' + k[0] + '"><title>' + k[1] + ": " + c + " of " + n + "</title></rect>";
        x += w;
      });
      s += "</svg>";
      var ow = list.filter(function (e) { return e.availability_class === "open_weights"; }).length;
      h += '<tr><th scope="row" class="num">' + yy + "</th><td>" + (n ? s : '<span class="t-m">none in view</span>') + '</td><td class="n num">' + (n ? ow : "-") + '</td><td class="n num">' + n + "</td></tr>";
    });
    var all = D.releases.filter(inView), ow2 = all.filter(function (e) { return e.availability_class === "open_weights"; }).length;
    h += "</tbody></table>";
    h += '<p class="pr-note">' + (all.length ? "<span class=\"num\">" + ow2 + "</span> of " + CR.plural(all.length, "release") + " in view shipped with open weights (" + CR.pct(ow2, all.length) + "%). This share divides by all releases: availability is on record for every one." : "No releases in view.") + "</p>";
    host.innerHTML = h;
  }

  /* ---------- compare ---------- */

  function openCompare(a, b) {
    if (a) { cmp.a = a; } if (b) { cmp.b = b; }
    if (cmp.a === cmp.b) { cmp.b = CR.ORG_ORDER.filter(function (o) { return o !== cmp.a; })[0]; }
    $("#cmp-a").value = cmp.a; $("#cmp-b").value = cmp.b;
    CR.openDialog($("#compare"), "#cmp-a");
    renderCompare();
    writeUrl({ compare: cmp.a + "," + cmp.b });
  }
  function renderCompare() {
    var body = $("#cmp-body");
    var labs = [cmp.a, cmp.b];
    var y = D.asOf.slice(0, 4);
    var years = ["2022", "2023", "2024", "2025", "2026"].filter(function (yy) { return yy <= y; });
    var W = Math.max(150, Math.floor((body.clientWidth || 900) / 2) - 40);
    var data = labs.map(function (o) {
      var all = D.entries.filter(function (e) { return e.org === o; });
      var rel = all.filter(function (e) { return e._rel; });
      var per = years.map(function (yy) { return rel.filter(function (e) { return e._year === yy; }).length; });
      var ind = [], lab = [];
      all.forEach(function (e) { var sc = e._score["gpqa-diamond"]; if (sc && sc.INDEPENDENT) { ind.push({ e: e, v: sc.INDEPENDENT.value }); } if (sc && sc.LAB_REPORTED) { lab.push({ e: e, v: sc.LAB_REPORTED.value }); } });
      ind.sort(function (a, b) { return a.e._day - b.e._day; });
      return { o: o, all: all, rel: rel, per: per, fl: CR.firstLately(rel), gaps: CR.labGaps(rel), ind: ind, lab: lab };
    });
    var perMax = Math.max.apply(null, data.map(function (d) { return Math.max.apply(null, d.per); })) || 1;
    var gapCap = 120;
    var cols = data.map(function (d) {
      var h = '<section class="cmp-col" aria-label="' + esc(CR.ORG_NAMES[d.o]) + '"><h3>' + esc(CR.ORG_NAMES[d.o]) + '</h3><p class="cmp-sub">' + esc(CR.ORG_COUNTRY[d.o]) + ". " +
        CR.plural(d.rel.length, "release") + (d.all.length - d.rel.length ? " and " + CR.plural(d.all.length - d.rel.length, "revision") : "") + " on record" +
        (d.rel.length ? ", first " + d.rel[d.rel.length - 1].date + ", newest " + d.rel[0].date : "") + ".</p>";
      /* releases per year */
      var bw = W / years.length, ch = 70;
      var s = svgOpen(W, ch + 18, "cmp-bars", CR.ORG_NAMES[d.o] + ": releases per year. " + years.map(function (yy, i) { return yy + " " + d.per[i]; }).join(", ") + ".");
      years.forEach(function (yy, i) {
        var v = d.per[i], bh = v ? Math.max(2, (ch - 14) * v / perMax) : 0;
        if (v) { s += '<rect x="' + (i * bw + 6).toFixed(1) + '" y="' + (ch - bh).toFixed(1) + '" width="' + (bw - 12).toFixed(1) + '" height="' + bh.toFixed(1) + '" class="c-on"/>'; }
        s += '<text x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (ch - bh - 4).toFixed(1) + '" text-anchor="middle" class="cmp-v">' + v + "</text>";
        s += '<text x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (ch + 14) + '" text-anchor="middle" class="ax-t">' + (W < 260 ? "'" + yy.slice(2) : yy) + "</text>";
      });
      s += '<line x1="0" x2="' + W + '" y1="' + (ch + 0.5) + '" y2="' + (ch + 0.5) + '" class="ax-base"/></svg>';
      h += '<h4>Releases per year</h4>' + s;
      /* waits */
      h += "<h4>Days between releases</h4>";
      if (d.fl) {
        h += '<p class="cmp-big"><span class="num">' + d.fl.first + '</span> <span class="unit">days at first</span> <span class="num">' + d.fl.lately + '</span> <span class="unit">days lately</span></p>';
      } else { h += '<p class="cmp-big"><span class="num dash">-</span> <span class="unit">fewer than four releases on record</span></p>'; }
      var gh = 64, x0 = D.startDay, x1 = D.asOfDay;
      var gx = function (dd) { return 34 + (W - 38) * (dd - x0) / (x1 - x0); }, gy = function (v) { return 6 + (gh - 12) * (1 - Math.min(v, gapCap) / gapCap); };
      var g = svgOpen(W, gh + 16, "cmp-gaps", CR.ORG_NAMES[d.o] + ": days between one release and the next, over time.");
      [0, 60, 120].forEach(function (v) { g += '<line x1="34" x2="' + W + '" y1="' + gy(v).toFixed(1) + '" y2="' + gy(v).toFixed(1) + '" class="ax-grid"/><text x="28" y="' + (gy(v) + 4).toFixed(1) + '" text-anchor="end" class="ax-t">' + v + (v === 120 ? "+" : "") + "</text>"; });
      d.gaps.forEach(function (p) {
        var over = p.gap > gapCap;
        g += over ? '<path d="M' + gx(p.day).toFixed(1) + " " + (gy(gapCap) + 4).toFixed(1) + "l-3 4h6Z" + '" class="cmp-over"><title>' + p.gap + " days, above the scale</title></path>"
          : '<circle cx="' + gx(p.day).toFixed(1) + '" cy="' + gy(p.gap).toFixed(1) + '" r="2.4" class="cmp-gap"><title>' + p.gap + " days, to " + CR.dateOf(p.day) + "</title></circle>";
      });
      for (var yy2 = 2023; yy2 <= +y; yy2++) { g += '<text x="' + gx(CR.dayNum(yy2 + "-01-01")).toFixed(1) + '" y="' + (gh + 14) + '" class="ax-t">' + (W < 260 ? "'" + String(yy2).slice(2) : yy2) + "</text>"; }
      g += "</svg>";
      h += g;
      /* disclosure */
      h += '<h4>Disclosure, researched releases only</h4><dl class="cmp-disc">';
      CR.DISC_SLOTS.forEach(function (sl) {
        var c = CR.discCounts(d.rel, sl[0]);
        var strip = d.rel.slice().reverse().map(function (e) { return CR.discGlyph(e._disc[sl[0]], 7); }).join("");
        h += "<div><dt>" + sl[1] + "</dt><dd>" + (c.researched ? '<b class="num">' + Math.round(100 * c.share) + "%</b> " + c.disclosed + " of " + c.researched : '<span class="nr-w">none researched</span>') +
          ' <span class="t-m">' + c.not_researched + ' not yet researched</span><span class="cmp-strip" aria-hidden="true">' + strip + "</span></dd></div>";
      });
      h += "</dl>";
      /* scores */
      h += "<h4>Independent GPQA Diamond</h4>";
      var sh = 92;
      var sx = function (dd) { return 26 + (W - 30) * (dd - x0) / (x1 - x0); }, sy = function (v) { return 6 + (sh - 14) * (1 - v / 100); };
      var t = svgOpen(W, sh, "cmp-sc", CR.ORG_NAMES[d.o] + ": " + (d.ind.length ? d.ind.length + " independent GPQA Diamond scores, first " + d.ind[0].v + ", latest " + d.ind[d.ind.length - 1].v : "no independent GPQA Diamond score") + ".");
      [0, 50, 100].forEach(function (v) { t += '<line x1="26" x2="' + W + '" y1="' + sy(v).toFixed(1) + '" y2="' + sy(v).toFixed(1) + '" class="ax-grid"/><text x="20" y="' + (sy(v) + 4).toFixed(1) + '" text-anchor="end" class="ax-t">' + v + "</text>"; });
      if (d.ind.length) { t += '<path d="' + d.ind.map(function (p, i) { return (i ? "L" : "M") + sx(p.e._day).toFixed(1) + " " + sy(p.v).toFixed(1); }).join("") + '" class="s-line"/>'; }
      d.ind.forEach(function (p) { t += '<circle cx="' + sx(p.e._day).toFixed(1) + '" cy="' + sy(p.v).toFixed(1) + '" r="3" class="s-ind"><title>' + esc(p.e.model_name) + ": " + p.v + " IND</title></circle>"; });
      d.lab.forEach(function (p) { var cx = sx(p.e._day), cy = sy(p.v); t += '<path d="M' + cx.toFixed(1) + " " + (cy - 4).toFixed(1) + "l4 4l-4 4l-4 -4Z" + '" class="s-lab"><title>' + esc(p.e.model_name) + ": " + p.v + " LAB</title></path>"; });
      t += "</svg>";
      h += t + (d.ind.length ? '<p class="t-m">First on record: ' + d.ind[0].v + " (" + esc(d.ind[0].e.model_name) + "). Latest: " + d.ind[d.ind.length - 1].v + " (" + esc(d.ind[d.ind.length - 1].e.model_name) + ").</p>" : '<p class="t-m">No independent score on record.</p>');
      /* availability */
      var ow = d.rel.filter(function (e) { return e.availability_class === "open_weights"; }).length;
      h += '<h4>Open weights</h4><p class="cmp-big"><span class="num">' + ow + '</span> <span class="unit">of ' + d.rel.length + " releases</span></p>";
      return h + "</section>";
    });
    body.innerHTML = '<div class="cmp-cols">' + cols.join("") + "</div>";
  }
  function wireCompare() {
    var opts = CR.ORG_ORDER.map(function (o) { return '<option value="' + o + '">' + esc(CR.ORG_NAMES[o]) + "</option>"; }).join("");
    $("#cmp-a").innerHTML = opts; $("#cmp-b").innerHTML = opts;
    CR.wireDialog($("#compare"));
    $("#cmp-a").addEventListener("change", function () { cmp.a = this.value; if (cmp.a === cmp.b) { cmp.b = CR.ORG_ORDER.filter(function (o) { return o !== cmp.a; })[0]; $("#cmp-b").value = cmp.b; } renderCompare(); writeUrl({ compare: cmp.a + "," + cmp.b }); });
    $("#cmp-b").addEventListener("change", function () { cmp.b = this.value; if (cmp.a === cmp.b) { cmp.a = CR.ORG_ORDER.filter(function (o) { return o !== cmp.b; })[0]; $("#cmp-a").value = cmp.a; } renderCompare(); writeUrl({ compare: cmp.a + "," + cmp.b }); });
    $("#cmp-swap").addEventListener("click", function () { var t = cmp.a; cmp.a = cmp.b; cmp.b = t; $("#cmp-a").value = cmp.a; $("#cmp-b").value = cmp.b; renderCompare(); writeUrl({ compare: cmp.a + "," + cmp.b }); });
    $("#compare").addEventListener("close", function () { writeUrl(); });
    $("#compare-open").addEventListener("click", function () { openCompare(S.labs[0] || cmp.a, S.labs[1] || cmp.b); });
  }

  /* ---------- table toggles, collapse, resize ---------- */

  function wirePanels() {
    $$(".tbl-toggle").forEach(function (b) {
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.textContent = on ? "Chart" : "Table";
        var t = document.getElementById(b.getAttribute("aria-controls"));
        t.hidden = !on;
        var chart = t.previousElementSibling;
        while (chart && chart.classList.contains("legend")) { chart = chart.previousElementSibling; }
        var vis = t.parentNode.querySelectorAll(".heat, .chart, .waffles");
        vis.forEach(function (v) { v.hidden = on; });
        renderTables();
      });
    });
    $$(".pcollapse").forEach(function (b) {
      b.addEventListener("click", function () {
        var open = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", open ? "true" : "false");
        document.getElementById(b.getAttribute("aria-controls")).hidden = !open;
        if (open) { render(); }
      });
    });
    $("#bench-seg").addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b) { set({ bench: b.getAttribute("data-b") }); } });
    $("#bench-seg").addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { ev.preventDefault(); set({ bench: S.bench === "gpqa-diamond" ? "swe-bench-verified" : "gpqa-diamond" }); $('#bench-seg [aria-checked="true"]').focus(); }
    });
    $("#findings-list").addEventListener("click", function (ev) { var b = ev.target.closest("[data-f]"); if (b) { FINDINGS[+b.getAttribute("data-f")].run(); } });
    $("#labchips").addEventListener("click", function (ev) { var b = ev.target.closest(".chip"); if (b) { toggleLab(b.getAttribute("data-org"), true); } });
    var lastW = window.innerWidth, t = null;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () { if (Math.abs(window.innerWidth - lastW) > 2) { lastW = window.innerWidth; drawHeat(); render(); } }, 120);
    });
  }
  function renderTables() {
    if ($("#cad-table") && !$("#cad-table").hidden) { renderHeatTable(); }
    if ($("#scores-table") && !$("#scores-table").hidden) { renderScoresTable(); }
    if ($("#disc-table") && !$("#disc-table").hidden) { renderDiscTable(); }
  }

  /* ---------- render ---------- */

  function render() {
    renderFilterbar();
    renderKpis();
    paintSelection();
    renderFeed();
    renderLabs();
    renderScores();
    renderPairs();
    renderDisc();
    renderAccess();
    renderTables();
    balance();
    if ($("#compare").open) { renderCompare(); }
  }
  /* The scores chart takes the height the right column needs, so the two
     columns of the lower row end on one line. */
  function balance() {
    var sp = $("#p-scores"), pp = $("#p-pairs");
    if (window.innerWidth <= 1040 || $("#scores-chart").hidden || $("#scores-body").hidden) { if (SC_H) { SC_H = 0; renderScores(); } return; }
    var h = function (el) { var kids = $(".pbody", el) || el; return kids.getBoundingClientRect().bottom - el.getBoundingClientRect().top; };
    var diff = h(pp) - h(sp);
    var cur = SC_H || 300;
    var next = Math.max(300, Math.min(560, Math.round(cur + diff)));
    if (Math.abs(next - cur) > 1) { SC_H = next; renderScores(); }
    /* the disclosure squares grow until their panel meets the right column */
    var dp = $("#p-disc"), col = $(".row-d .col");
    if (!dp || !col || $("#waffles").hidden || $("#disc-body").hidden) { return; }
    var right = col.lastElementChild.getBoundingClientRect().bottom - col.getBoundingClientRect().top;
    WF_P = 8; renderDisc();
    while (WF_P < 14 && h(dp) < right - 6) { WF_P++; renderDisc(); }
    if (h(dp) > right + 6 && WF_P > 8) { WF_P--; renderDisc(); }
  }

  /* ---------- boot ---------- */

  CR.initShell();
  CR.shortcut("c", "Compare two labs", function () { openCompare(S.labs[0] || cmp.a, S.labs[1] || cmp.b); }, "Overview");
  CR.shortcut("Escape", "Clear the selection and filters", function () { if (filtered()) { clearAll(); } }, "Overview");
  CR.shortcut("b", "Switch the scores benchmark", function () { set({ bench: S.bench === "gpqa-diamond" ? "swe-bench-verified" : "gpqa-diamond" }); }, "Overview");
  CR.shortcut("x", "Open the current view in the explorer", function () { location.href = $("#to-explorer").href; }, "Overview");
  CR.shortcut("←", "In the release grid: move one cell (Alt moves four)", null, "Release grid");
  CR.shortcut("Enter", "In the release grid: select the cell's week", null, "Release grid");
  CR.shortcut("Shift →", "In the release grid: extend the selection", null, "Release grid");

  CR.load().then(function (data) {
    D = data;
    var wantCompare = readUrl();
    CR.addRecordToPalette(D, function (o) { set({ labs: [o] }); scrollTo("#p-cadence"); }, function (e) { location.href = "explorer.html?id=" + encodeURIComponent(e.id); });
    CR.paletteSource(function () {
      var a = [
        { title: "Compare two labs", meta: "Side by side on the same scales", hint: "c", run: function () { openCompare(S.labs[0] || cmp.a, S.labs[1] || cmp.b); } },
        { title: "Clear filters", meta: filtered() ? "Now: " + viewWords() : "No filter is set", hint: "Esc", run: clearAll },
        { title: "Switch the scores benchmark", meta: "GPQA Diamond or SWE-Bench Verified", hint: "b", run: function () { set({ bench: S.bench === "gpqa-diamond" ? "swe-bench-verified" : "gpqa-diamond" }); scrollTo("#p-scores"); } }
      ];
      PRESETS.forEach(function (p) { if (p.k !== "all") { a.push({ title: "Select " + p.label, meta: "Set the console's date range", run: function () { set({ from: p.from, to: p.to }); } }); } });
      a.forEach(function (x, i) { x.group = "Actions"; x.rank = 20 + i; });
      return a;
    });
    renderTitle();
    buildPresets();
    wireFeed(); wireLabs(); wireDisc(); wireCompare(); wirePanels();
    renderFindings();
    /* on a phone the long panels start folded; their headers stay in place */
    if (window.innerWidth <= 720) {
      ["#p-labs", "#p-pairs", "#p-access", "#p-refused"].forEach(function (sel) {
        var b = $(sel + " .pcollapse"); if (!b) { return; }
        b.setAttribute("aria-expanded", "false");
        document.getElementById(b.getAttribute("aria-controls")).hidden = true;
      });
    }
    drawHeat();
    /* the first screen paints first; the panels below follow a moment later */
    renderFilterbar(); renderKpis(); paintSelection(); renderFeed();
    document.documentElement.classList.add("ready");
    setTimeout(render, 30);
    if (wantCompare) { openCompare(); }
  }).catch(function (err) {
    console.error(err);
    var msg = '<div class="load-error"><p>The record could not be loaded in this session (' + esc(err && err.message ? err.message : "unknown error") + ").</p><p>The dataset itself is unaffected; it is versioned with the site. Reloading the page retries the fetch.</p></div>";
    $("#heat").innerHTML = msg;
  });
})();
