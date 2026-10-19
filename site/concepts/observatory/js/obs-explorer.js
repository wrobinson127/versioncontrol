/* Observatory explorer: the whole record as a zoomable, brushable sky, a
   filter rail, a result list and an entry drawer. State lives in the URL
   (?q=&lab=&country=&type=&avail=&scores=&from=&to=#entry-id), so every view
   and every entry has a link. Deltas and refusals are rendered verbatim from
   data/derived/deltas.json.gz; nothing here computes a comparison. */
(function () {
  "use strict";
  var V = window.VCO, S = window.VCOSky, C = S.C, FONT = S.FONT, esc = V.esc;
  var $ = function (s) { return document.querySelector(s); };
  var RM = V.reducedMotion();
  var D, recs, N, firstDay, full0, full1;
  var st = { q: "", lab: "", country: "", type: "", avail: "", scores: "", from: null, to: null, asc: false };
  var v0, v1; /* the sky's visible window, in days since the first entry */
  var match = null; /* Uint8Array: passes every filter but the dates */
  var selId = null;

  /* ---------------- filters ---------------- */
  function passes(r) {
    var e = r.e;
    if (st.lab && r.org !== st.lab) { return false; }
    if (st.country && r.country !== st.country) { return false; }
    if (st.type && e.entry_type !== st.type) { return false; }
    if (st.avail && e.availability_class !== st.avail) { return false; }
    if (st.scores === "any" && !r.scored) { return false; }
    if (st.scores === "ind" && !r.hasInd) { return false; }
    if (st.scores === "lab" && !r.hasLab) { return false; }
    if (st.scores === "none" && r.scored) { return false; }
    if (st.q) {
      var hay = (e.model_name + " " + (e.variants || []).join(" ") + " " + e.id).toLowerCase();
      if (hay.indexOf(st.q) < 0) { return false; }
    }
    return true;
  }
  function inDates(r) {
    if (st.from && r.date < st.from) { return false; }
    if (st.to && r.date > st.to) { return false; }
    return true;
  }
  function recompute() {
    match = new Uint8Array(N);
    for (var i = 0; i < N; i++) { match[i] = passes(recs[i]) ? 1 : 0; }
  }
  function shown() {
    var out = [];
    for (var i = 0; i < N; i++) { if (match[i] && inDates(recs[i])) { out.push(i); } }
    out.sort(function (a, b) { return st.asc ? recs[a].day - recs[b].day || (recs[a].id < recs[b].id ? -1 : 1) : recs[b].day - recs[a].day || (recs[a].id < recs[b].id ? -1 : 1); });
    return out;
  }

  /* ---------------- URL state ---------------- */
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function readUrl() {
    var p = new URLSearchParams(location.search);
    st.q = (p.get("q") || "").trim().toLowerCase();
    st.lab = V.ORGS.indexOf(p.get("lab")) >= 0 ? p.get("lab") : "";
    st.country = p.get("country") || "";
    st.type = ["release", "revision"].indexOf(p.get("type")) >= 0 ? p.get("type") : "";
    st.avail = ["open_weights", "public_api", "public_service"].indexOf(p.get("avail")) >= 0 ? p.get("avail") : "";
    st.scores = ["any", "ind", "lab", "none"].indexOf(p.get("scores")) >= 0 ? p.get("scores") : "";
    st.from = DATE_RE.test(p.get("from") || "") ? p.get("from") : null;
    st.to = DATE_RE.test(p.get("to") || "") ? p.get("to") : null;
    if (st.from && st.to && st.from > st.to) { var t = st.from; st.from = st.to; st.to = t; }
  }
  var urlTimer = null;
  function writeUrl() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () {
      var p = new URLSearchParams();
      ["q", "lab", "country", "type", "avail", "scores", "from", "to"].forEach(function (k) { if (st[k]) { p.set(k, st[k]); } });
      var q = p.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + (selId ? "#" + encodeURIComponent(selId) : ""));
    }, 200);
  }
  function syncControls() {
    $("#f-q").value = st.q; $("#f-lab").value = st.lab; $("#f-country").value = st.country;
    $("#f-type").value = st.type; $("#f-avail").value = st.avail; $("#f-scores").value = st.scores;
    $("#f-from").value = st.from || ""; $("#f-to").value = st.to || "";
    var n = ["q", "lab", "country", "type", "avail", "scores"].filter(function (k) { return st[k]; }).length + (st.from || st.to ? 1 : 0);
    $("#rail-n").textContent = n ? "(" + n + " on)" : "";
  }

  /* dates <-> window */
  function windowFromDates() {
    v0 = st.from ? V.dayNum(st.from) - D.t0 : full0;
    v1 = st.to ? V.dayNum(st.to) - D.t0 : full1;
    if (v1 - v0 < 14) { var c = (v0 + v1) / 2; v0 = c - 7; v1 = c + 7; }
  }
  function datesFromWindow() {
    var whole = v0 <= full0 + 0.5 && v1 >= full1 - 0.5;
    st.from = whole || v0 <= full0 + 0.5 ? null : V.isoOf(D.t0 + Math.ceil(v0));
    st.to = whole || v1 >= full1 - 0.5 ? null : V.isoOf(D.t0 + Math.floor(v1));
  }
  function clampWindow() {
    var span = full1 - full0, w = Math.max(14, Math.min(span, v1 - v0));
    if (v0 < full0) { v0 = full0; }
    v1 = v0 + w;
    if (v1 > full1) { v1 = full1; v0 = v1 - w; }
  }

  /* ---------------- results ---------------- */
  var listTimer = null;
  function scheduleList() { clearTimeout(listTimer); listTimer = setTimeout(renderList, 90); }
  function renderList() {
    var ids = shown();
    var total = N;
    var desc = [];
    if (st.q) { desc.push("names containing “" + esc(st.q) + "”"); }
    if (st.lab) { desc.push(esc(V.ORG_NAMES[st.lab])); }
    if (st.country) { desc.push("labs based in " + esc(st.country)); }
    if (st.type) { desc.push(st.type === "release" ? "releases only" : "revisions only"); }
    if (st.avail) { desc.push(esc(V.AVAIL_NAMES[st.avail])); }
    if (st.scores) { desc.push({ any: "with a score", ind: "with an independent score", lab: "with a lab-reported score", none: "with no score" }[st.scores]); }
    if (st.from || st.to) { desc.push((st.from || V.isoOf(D.t0)) + " to " + (st.to || D.asOf)); }
    $("#count").innerHTML = "Showing <b>" + ids.length + "</b> of " + total + " entries" + (desc.length ? ": " + desc.join(", ") : "") + ".";
    $("#empty").hidden = ids.length > 0;
    var h = "";
    for (var k = 0; k < ids.length; k++) {
      var r = recs[ids[k]], e = r.e;
      var sc = "";
      (e.benchmarks || []).forEach(function (b) {
        var p = b.provenance || {};
        sc += "<span>" + esc(p.benchmark_name || b.benchmark) + ' <span class="v">' + esc(b.value) + "</span> " + S.provTag(p.source_class) + "</span>";
      });
      var disc = "", words = [];
      V.SLOTS.forEach(function (s) { disc += '<i class="' + r.disc[s[0]] + '"></i>'; words.push(s[1] + " " + S.DISC_WORD[r.disc[s[0]]]); });
      h += '<li><button type="button" class="row" data-id="' + esc(r.id) + '"' + (r.id === selId ? ' aria-current="true"' : "") + ">" +
        '<time datetime="' + esc(e.date) + '">' + esc(e.date) + "</time>" +
        '<span class="who"><span class="nm">' + esc(e.model_name) + "</span>" +
        '<span class="lb">' + esc(V.ORG_NAMES[e.org] || e.org) + (r.release ? "" : ", revision") + ", " + esc(V.AVAIL_NAMES[e.availability_class] || "") + "</span></span>" +
        '<span class="sc">' + (sc || '<span class="none">No score on record</span>') + "</span>" +
        '<span class="discrow" role="img" aria-label="Disclosure: ' + esc(words.join(", ")) + '">' + disc + "</span>" +
        "</button></li>";
    }
    $("#results").innerHTML = h;
  }

  /* ---------------- the sky ---------------- */
  var sky = { cv: null, ctx: null, W: 0, H: 0, L: null, pts: [], vert: false, mark: -1, raf: 0 };
  function skyRect() {
    if (sky.vert) { return { x: 46, y: 108, w: sky.W - 46 - 10, h: sky.H - 108 - 56 }; }
    return { x: 152, y: 58, w: sky.W - 152 - 22, h: sky.H - 58 - 16 };
  }
  function layoutSky() {
    var cv = sky.cv;
    sky.W = cv.clientWidth; sky.H = cv.clientHeight; if (!sky.W) { return; }
    sky.ctx = S.fit(cv, sky.W, sky.H);
    sky.vert = sky.W < 640;
    drawSky();
  }
  function drawSky() {
    sky.raf = 0;
    var ctx = sky.ctx, W = sky.W, H = sky.H; if (!ctx) { return; }
    var R = skyRect();
    var L = S.laneLayout(recs, R, v0, v1, sky.vert ? "v" : "h", { minSep: sky.vert ? 5 : 8 });
    sky.L = L;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(S.nebula(recs, L.pos.map(function (p, i) { return match[i] ? p : null; }), W, H, sky.vert ? 26 : 36), 0, 0, W, H);
    S.drawLaneFrame(ctx, L, D.t0, firstDay, { labelSize: sky.vert ? 11 : 13 });
    monthTicks(ctx, L);
    var pts = [], zoom = (full1 - full0) / (v1 - v0);
    var s = Math.min(1.7, (sky.vert ? 0.85 : 1.05) * Math.pow(zoom, 0.18));
    for (var i = 0; i < N; i++) {
      var p = L.pos[i];
      var vis = sky.vert ? (p.y >= R.y - 4 && p.y <= R.y + R.h + 4) : (p.x >= R.x - 4 && p.x <= R.x + R.w + 4);
      if (!vis) { pts.push(null); continue; }
      var on = match[i] === 1;
      pts.push(on ? p : null);
      S.drawStar(ctx, p.x, p.y, recs[i], { s: on ? s : s * 0.7, a: on ? 1 : 0.13, halo: on ? 1 : 0, glow: on, sel: recs[i].id === selId || i === sky.mark });
    }
    /* name the selected star on the sky */
    var si = selId ? D.byId[selId] : null;
    if (si) {
      var ix = recs.indexOf(si), sp = L.pos[ix];
      if (sp && pts[ix]) {
        ctx.font = "600 13px " + FONT.display; ctx.fillStyle = C.star; ctx.textBaseline = "middle";
        var right = sp.x < R.x + R.w - 160;
        ctx.textAlign = right ? "left" : "right";
        ctx.fillText(si.name, sp.x + (right ? 20 : -20), sp.y - 16);
      }
    }
    sky.pts = pts;
    drawBrush();
  }
  function monthTicks(ctx, L) {
    var span = L.d1 - L.d0, R = L.rect;
    if (span > 520) { return; }
    var step = span > 260 ? 3 : 1;
    ctx.save();
    ctx.font = "500 11px " + FONT.mono; ctx.fillStyle = C.ink2;
    var d0 = Math.floor(L.d0), last = "";
    for (var d = d0; d <= L.d1; d++) {
      var iso = V.isoOf(D.t0 + d);
      if (iso.slice(8) !== "01" || iso.slice(5, 7) === "01") { continue; }
      if ((+iso.slice(5, 7) - 1) % step) { continue; }
      if (iso === last) { continue; } last = iso;
      var p = (d - L.d0) * L.k;
      ctx.globalAlpha = 0.07; ctx.strokeStyle = C.star; ctx.beginPath();
      if (L.orient === "h") { ctx.moveTo(R.x + p, R.y - 4); ctx.lineTo(R.x + p, R.y + R.h); }
      else { ctx.moveTo(R.x - 4, R.y + p); ctx.lineTo(R.x + R.w, R.y + p); }
      ctx.stroke();
      ctx.globalAlpha = 0.75;
      if (L.orient === "h") { ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(iso.slice(5, 7), R.x + p + 4, R.y - 6); }
      else { ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(iso.slice(5, 7), R.x - 8, R.y + p); }
    }
    ctx.restore();
  }
  function redraw() { if (!sky.raf) { sky.raf = requestAnimationFrame(drawSky); } }

  /* zoom about a day, keep that day under the pointer */
  function zoomAt(day, f) {
    var w = v1 - v0, nw = Math.max(14, Math.min(full1 - full0, w * f));
    var t = (day - v0) / w;
    v0 = day - t * nw; v1 = v0 + nw;
    clampWindow(); windowChanged();
  }
  function windowChanged() {
    datesFromWindow(); syncControls(); writeUrl(); redraw(); scheduleList(); noteRange();
  }
  function noteRange() {
    var a = st.from || V.isoOf(D.t0 + Math.max(full0, Math.ceil(v0))), b = st.to || V.isoOf(D.t0 + Math.min(full1, Math.floor(v1)));
    if (a < D.meta.first_date) { a = D.meta.first_date; }
    if (b > D.asOf) { b = D.asOf; }
    $("#range-note").textContent = "Showing " + a + " to " + b + ". " +
      (sky.vert ? "Drag the sky to move through time; pinch to zoom." : "Drag the sky to pan. Pinch, or hold Ctrl and scroll, to zoom.");
  }
  function dayAt(clientX, clientY) {
    var r = sky.cv.getBoundingClientRect(), R = skyRect();
    var t = sky.vert ? (clientY - r.top - R.y) / R.h : (clientX - r.left - R.x) / R.w;
    return v0 + t * (v1 - v0);
  }
  function bindSky() {
    var cv = sky.cv, ptrs = {}, drag = null, pinch = null, moved = 0;
    cv.addEventListener("wheel", function (e) {
      if (!e.ctrlKey && !e.metaKey) { return; }
      e.preventDefault();
      zoomAt(dayAt(e.clientX, e.clientY), Math.exp(e.deltaY * 0.0028));
    }, { passive: false });
    cv.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      cv.setPointerCapture(e.pointerId);
      var ids = Object.keys(ptrs);
      if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY, v0: v0, v1: v1 }; moved = 0; }
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        pinch = { d: sky.vert ? Math.abs(a.y - b.y) : Math.abs(a.x - b.x), w: v1 - v0, mid: dayAt((a.x + b.x) / 2, (a.y + b.y) / 2) };
        drag = null; moved = 99;
      }
    });
    cv.addEventListener("pointermove", function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; }
      var ids = Object.keys(ptrs);
      if (pinch && ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        var d = Math.max(20, sky.vert ? Math.abs(a.y - b.y) : Math.abs(a.x - b.x));
        var nw = Math.max(14, Math.min(full1 - full0, pinch.w * pinch.d / d));
        var t = 0.5; v0 = pinch.mid - t * nw; v1 = v0 + nw; clampWindow(); windowChanged();
        return;
      }
      if (drag && ids.length === 1) {
        var R = skyRect();
        var dpx = sky.vert ? e.clientY - drag.y : e.clientX - drag.x;
        moved = Math.max(moved, Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y));
        if (moved > 4) {
          cv.classList.add("dragging"); hideTip();
          var dd = -dpx / (sky.vert ? R.h : R.w) * (drag.v1 - drag.v0);
          v0 = drag.v0 + dd; v1 = drag.v1 + dd; clampWindow(); windowChanged();
        }
        return;
      }
      if (e.pointerType === "mouse" && !ids.length) {
        var r = cv.getBoundingClientRect();
        var i = S.nearest(sky.pts, e.clientX - r.left, e.clientY - r.top, 16);
        if (i !== sky.mark) { sky.mark = i; redraw(); }
        cv.style.cursor = i >= 0 ? "pointer" : "grab";
        if (i >= 0) { showTip(recs[i], e.clientX, e.clientY, "Click to open the entry."); } else { hideTip(); }
      }
    });
    function up(e) {
      var wasDrag = moved > 4, ids = Object.keys(ptrs);
      delete ptrs[e.pointerId];
      cv.classList.remove("dragging");
      if (ids.length === 2) { pinch = null; drag = null; return; }
      drag = null;
      if (e.type === "pointerup" && !wasDrag) {
        var r = cv.getBoundingClientRect();
        var i = S.nearest(sky.pts, e.clientX - r.left, e.clientY - r.top, e.pointerType === "mouse" ? 16 : 24);
        if (i >= 0) { hideTip(); openEntry(recs[i].id, cv); }
      }
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { sky.mark = -1; hideTip(); redraw(); } });

    /* keyboard: walk lanes in time, zoom with + and - */
    var kSel = -1;
    function lanes() {
      var by = {};
      for (var i = 0; i < N; i++) { if (sky.pts[i]) { (by[recs[i].lane] = by[recs[i].lane] || []).push(i); } }
      Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return recs[a].day - recs[b].day; }); });
      return by;
    }
    function keyShow(i) {
      kSel = i; sky.mark = i; redraw();
      var p = sky.pts[i] || sky.L.pos[i], r = cv.getBoundingClientRect();
      showTip(recs[i], r.left + p.x, r.top + p.y, "Press Enter to open the entry.");
      $("#live").textContent = S.ariaLine(recs[i]);
    }
    cv.addEventListener("focus", function () {
      var by = lanes(), first = -1;
      if (kSel >= 0 && sky.pts[kSel]) { keyShow(kSel); return; }
      Object.keys(by).forEach(function (k) { var c = by[k][0]; if (first < 0 || recs[c].day < recs[first].day) { first = c; } });
      if (first >= 0) { keyShow(first); }
    });
    cv.addEventListener("blur", function () { hideTip(); sky.mark = -1; redraw(); });
    cv.addEventListener("keydown", function (e) {
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomAt((v0 + v1) / 2, 0.7); return; }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomAt((v0 + v1) / 2, 1 / 0.7); return; }
      if (kSel < 0) { return; }
      var by = lanes(), lane = recs[kSel].lane, list = by[lane] || [], at = list.indexOf(kSel), nxt = -1;
      var along = sky.vert ? ["ArrowDown", "ArrowUp"] : ["ArrowRight", "ArrowLeft"];
      var across = sky.vert ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
      if (e.key === along[0]) { nxt = list[Math.min(list.length - 1, at + 1)]; }
      else if (e.key === along[1]) { nxt = list[Math.max(0, at - 1)]; }
      else if (e.key === across[0] || e.key === across[1]) {
        var dir = e.key === across[0] ? 1 : -1;
        for (var l = lane + dir; l >= 0 && l < V.ORGS.length; l += dir) {
          var cand = by[l];
          if (cand && cand.length) {
            var best = cand[0];
            cand.forEach(function (c) { if (Math.abs(recs[c].day - recs[kSel].day) < Math.abs(recs[best].day - recs[kSel].day)) { best = c; } });
            nxt = best; break;
          }
        }
      } else if (e.key === "Home") { nxt = list[0]; }
      else if (e.key === "End") { nxt = list[list.length - 1]; }
      else if (e.key === "Enter") { e.preventDefault(); hideTip(); openEntry(recs[kSel].id, cv); return; }
      else if (e.key === "Escape") { hideTip(); return; }
      else { return; }
      e.preventDefault();
      if (nxt != null && nxt >= 0) { keyShow(nxt); }
    });
    $("#z-in").addEventListener("click", function () { zoomAt((v0 + v1) / 2, 0.6); });
    $("#z-out").addEventListener("click", function () { zoomAt((v0 + v1) / 2, 1 / 0.6); });
    $("#z-all").addEventListener("click", function () { v0 = full0; v1 = full1; windowChanged(); });
  }

  /* ---------------- the brush (overview with the window) ---------------- */
  var br = { cv: null, ctx: null, W: 0, H: 0 };
  function layoutBrush() {
    br.W = br.cv.clientWidth; br.H = br.cv.clientHeight; if (!br.W) { return; }
    br.ctx = S.fit(br.cv, br.W, br.H); drawBrush();
  }
  function brushX(d) { return 12 + (d - full0) / (full1 - full0) * (br.W - 24); }
  function brushDay(x) { return full0 + (x - 12) / (br.W - 24) * (full1 - full0); }
  function drawBrush() {
    var ctx = br.ctx; if (!ctx) { return; }
    var W = br.W, H = br.H;
    ctx.clearRect(0, 0, W, H);
    /* every matching entry as a grain of light, by lane */
    var top = 8, lh = (H - 16) / V.ORGS.length;
    ctx.fillStyle = C.star;
    for (var i = 0; i < N; i++) {
      if (!match[i]) { continue; }
      ctx.globalAlpha = recs[i].hasInd ? 0.9 : 0.5;
      ctx.fillRect(brushX(recs[i].day) - 0.75, top + (recs[i].lane + 0.5) * lh - 0.75, 1.5, 1.5);
    }
    /* year marks */
    ctx.font = "500 11px " + FONT.mono; ctx.textBaseline = "top"; ctx.textAlign = "left";
    for (var y = +D.meta.first_date.slice(0, 4) + 1; y <= +D.asOf.slice(0, 4); y++) {
      var x = brushX(V.dayNum(y + "-01-01") - D.t0);
      ctx.globalAlpha = 0.18; ctx.fillRect(x, 0, 1, H);
      ctx.globalAlpha = 0.8; ctx.fillStyle = C.ink2; ctx.fillText(String(y), x + 4, 3); ctx.fillStyle = C.star;
    }
    /* the window: everything outside it is shaded */
    var a = brushX(v0), b = brushX(v1);
    ctx.globalAlpha = 0.62; ctx.fillStyle = "#0D0B09";
    ctx.fillRect(0, 0, a, H); ctx.fillRect(b, 0, W - b, H);
    ctx.globalAlpha = 1; ctx.strokeStyle = "#86D0E0"; ctx.lineWidth = 1.5;
    ctx.strokeRect(a + 0.75, 1, Math.max(2, b - a - 1.5), H - 2);
    ctx.fillStyle = "#86D0E0";
    ctx.fillRect(a - 2, H / 2 - 10, 4, 20); ctx.fillRect(b - 2, H / 2 - 10, 4, 20);
    ctx.globalAlpha = 1;
    var whole = v0 <= full0 + 0.5 && v1 >= full1 - 0.5;
    br.cv.setAttribute("aria-valuenow", String(Math.round(100 * (v0 - full0) / (full1 - full0))));
    br.cv.setAttribute("aria-valuetext", whole ? "All dates" : V.isoOf(D.t0 + Math.round(v0)) + " to " + V.isoOf(D.t0 + Math.round(v1)));
  }
  function bindBrush() {
    var cv = br.cv, g = null;
    cv.addEventListener("pointerdown", function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, a = brushX(v0), b = brushX(v1);
      cv.setPointerCapture(e.pointerId);
      var tol = e.pointerType === "mouse" ? 8 : 16;
      if (Math.abs(x - a) < tol) { g = { mode: "a" }; }
      else if (Math.abs(x - b) < tol) { g = { mode: "b" }; }
      else if (x > a && x < b) { g = { mode: "move", x: x, v0: v0, v1: v1 }; }
      else { var w = v1 - v0, c = brushDay(x); v0 = c - w / 2; v1 = c + w / 2; clampWindow(); windowChanged(); g = { mode: "move", x: x, v0: v0, v1: v1 }; }
    });
    cv.addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left;
      if (!g) { var a0 = brushX(v0), b0 = brushX(v1); cv.style.cursor = Math.abs(x - a0) < 8 || Math.abs(x - b0) < 8 ? "ew-resize" : (x > a0 && x < b0 ? "grab" : "pointer"); return; }
      if (g.mode === "a") { v0 = Math.min(brushDay(x), v1 - 14); if (v0 < full0) { v0 = full0; } }
      else if (g.mode === "b") { v1 = Math.max(brushDay(x), v0 + 14); if (v1 > full1) { v1 = full1; } }
      else { var dd = (x - g.x) / (br.W - 24) * (full1 - full0); v0 = g.v0 + dd; v1 = g.v1 + dd; clampWindow(); }
      windowChanged();
    });
    cv.addEventListener("pointerup", function () { g = null; });
    cv.addEventListener("pointercancel", function () { g = null; });
    cv.addEventListener("keydown", function (e) {
      var w = v1 - v0, step = w * 0.15;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        var dir = e.key === "ArrowRight" ? 1 : -1;
        if (e.shiftKey) { v1 = v1 + dir * step; if (v1 - v0 < 14) { v1 = v0 + 14; } }
        else { v0 += dir * step; v1 += dir * step; }
        clampWindow(); windowChanged();
      } else if (e.key === "Home") { e.preventDefault(); var w2 = v1 - v0; v0 = full0; v1 = v0 + w2; windowChanged(); }
      else if (e.key === "End") { e.preventDefault(); var w3 = v1 - v0; v1 = full1; v0 = v1 - w3; windowChanged(); }
    });
  }

  /* ---------------- tooltip ---------------- */
  var tip = $("#tip"), tipBody = tip.querySelector(".tip-body");
  function showTip(rec, cx, cy, hint) {
    tipBody.innerHTML = S.cardHtml(rec) + '<p class="tip-hint">' + hint + "</p>";
    tip.classList.add("on");
    if (window.innerWidth >= 700) {
      var w = tip.offsetWidth, h = tip.offsetHeight, x = cx + 18, y = cy + 18;
      if (x + w > window.innerWidth - 12) { x = cx - w - 18; }
      if (y + h > window.innerHeight - 12) { y = Math.max(12, cy - h - 18); }
      tip.style.left = Math.max(12, x) + "px"; tip.style.top = y + "px";
    }
  }
  function hideTip() { tip.classList.remove("on"); }

  /* ---------------- the entry drawer ---------------- */
  var drawer = $("#drawer"), scrim = $("#scrim"), returnTo = null;
  function sheetMode() { return window.innerWidth < 700; }
  function link(u, text) { return '<a href="' + esc(u) + '" rel="external">' + text + "</a>"; }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }

  function detailHtml(r) {
    var e = r.e, items = D.deltas[r.id] || [];
    var h = '<div class="d-top"><div><h2 id="d-title" tabindex="-1">' + esc(e.model_name) + "</h2>" +
      '<p class="d-meta">' + esc(V.ORG_NAMES[e.org] || e.org) + ", " + esc(r.country) + ". " + (r.release ? "Released" : "Revision dated") +
      ' <time datetime="' + esc(e.date) + '">' + esc(e.date) + "</time>.</p></div>" +
      '<canvas class="d-glyph" id="d-glyph" width="76" height="76" role="img" aria-label="This entry\'s star: ' + esc(S.ariaLine(r)) + '"></canvas></div>';
    h += '<div class="d-actions"><button type="button" class="btn" id="d-copy">Copy link to this entry</button>' +
      '<a href="../../index.html#' + esc(e.id) + '">Open on the current site</a></div>';
    if (e.summary) { h += '<p class="d-summary">' + esc(e.summary) + "</p>"; }
    if (e.correction_note) { h += '<p class="d-correction"><b>Correction.</b> ' + esc(e.correction_note) + "</p>"; }
    if (e.retracted) { h += '<p class="d-correction"><b>Retracted.</b> ' + esc(e.retraction_note || "") + "</p>"; }

    /* scores, each with where it came from */
    h += "<h3>Scores</h3>";
    var pred = e.predecessor && D.byId[e.predecessor] ? D.byId[e.predecessor] : null;
    if (e.benchmarks && e.benchmarks.length) {
      e.benchmarks.forEach(function (b) {
        var p = b.provenance || {};
        var who = p.source_class === "LAB_REPORTED" ? "Reported by the releasing lab." : "Measured by an independent evaluator.";
        h += '<div class="d-score"><div class="d-score-top"><span class="d-score-name">' + esc(p.benchmark_name || b.benchmark) +
          '</span><span class="d-score-val">' + esc(b.value) + "</span></div>" +
          "<p>" + (p.source_url ? '<a class="prov-link" href="' + esc(p.source_url) + '" rel="external">' + S.provTag(p.source_class) + "</a>" : S.provTag(p.source_class)) +
          " " + who + " Version: " + esc(p.benchmark_version || "") + ". Retrieved " + esc(p.retrieval_date || "") + "." +
          (p.source_url ? " Source: " + link(p.source_url, esc(host(p.source_url))) + "." : "") +
          (p.archived_url ? " " + link(p.archived_url, "Archived copy, " + esc(V.archiveDate(p.archived_url))) + "." : "") + "</p>" +
          (b.configuration ? "<p>Settings, as written: " + esc(b.configuration) + "</p>" : "");
        items.forEach(function (d) {
          if (d.kind === "delta" && d.benchmark === b.benchmark && d.source_class === p.source_class) {
            var sign = d.value >= 0 ? "+" : "";
            h += '<p class="d-delta">' + sign + Number(d.value).toFixed(1) + " points against the predecessor" +
              (pred ? " (" + esc(pred.name) + " scored " + esc(d.predecessor) + ")" : " (it scored " + esc(d.predecessor) + ")") +
              ", on the same benchmark, version and kind of source.</p>";
          }
        });
        h += "</div>";
      });
    } else {
      h += "<p>No benchmark score is recorded for this entry. That is not a disclosure signal.</p>";
    }
    items.forEach(function (d) {
      if (d.kind === "REFUSED_COMPARISON") {
        h += '<p class="d-refused">No comparable measurement against the predecessor' + (pred ? " (" + esc(pred.name) + ")" : "") +
          ". Reason on record: " + esc(d.reason || "not stated") + ".</p>";
      }
    });

    /* disclosure */
    h += "<h3>Disclosure</h3><ul class=\"d-list\">";
    V.SLOTS.forEach(function (s) {
      var stt = r.disc[s[0]], u = (e.disclosure_links || {})[s[0]], arc = (e.disclosure_archived || {})[s[0]];
      h += '<li class="d-' + stt + '"><span class="k"><span class="dmark" aria-hidden="true"></span>' + V.cap(s[1]) + '</span><span class="v">';
      if (stt === "on") {
        h += link(u, "On record, " + esc(host(u))) + (arc ? "<small>" + link(arc, "Archived copy, " + esc(V.archiveDate(arc))) + "</small>" : "");
      } else if (stt === "nd") {
        h += '<span class="nd-word">Not disclosed</span><small>We checked the lab\'s pages and found none.</small>';
      } else {
        h += '<span class="nr-word">Not yet researched</span><small>A gap in our record, not a statement about the lab.</small>';
      }
      h += "</span></li>";
    });
    h += "</ul>";

    /* sources */
    if (e.sources && e.sources.length) {
      h += '<h3>Sources</h3><ul class="d-src">';
      e.sources.forEach(function (sr) {
        h += "<li>" + link(sr.url, esc(V.SOURCE_KIND_NAMES[sr.kind] || sr.kind.replace(/_/g, " ")) + ", " + esc(host(sr.url))) +
          ". Retrieved " + esc(sr.retrieval_date) + "." +
          (sr.archived_url ? " " + link(sr.archived_url, "Archived copy, " + esc(V.archiveDate(sr.archived_url))) + "." : "") + "</li>";
      });
      h += "</ul>";
    }

    /* facts */
    var params = typeof e.parameters === "number" ? esc(V.fmtParams(e.parameters)) :
      '<span class="nr-word">No count on record</span><small>Epoch AI\'s data has no parameter count. We have not checked the lab\'s pages.</small>';
    h += '<h3>The entry</h3><ul class="d-list">' +
      '<li><span class="k">Availability</span><span class="v">' + esc(V.AVAIL_NAMES[e.availability_class] || e.availability_class) + "</span></li>" +
      '<li><span class="k">Parameters</span><span class="v">' + params + "</span></li>" +
      (e.variants && e.variants.length ? '<li><span class="k">Variants</span><span class="v">' + e.variants.map(esc).join(", ") + "</span></li>" : "") +
      (pred ? '<li><span class="k">Predecessor</span><span class="v"><a href="#' + esc(pred.id) + '" data-open="' + esc(pred.id) + '">' + esc(pred.name) + "</a></span></li>" : "") +
      '<li><span class="k">Reached the record</span><span class="v">' + esc(V.ORIGIN_NAMES[e.origin] || e.origin) + "</span></li>" +
      (e.license_note ? '<li><span class="k">License note</span><span class="v">' + esc(e.license_note) + "</span></li>" : "") +
      '<li><span class="k">Entry id</span><span class="v"><code>' + esc(e.id) + "</code></span></li></ul>";
    return h;
  }

  function openEntry(id, from) {
    var r = D.byId[id]; if (!r) { return; }
    returnTo = from || document.activeElement;
    selId = id;
    $("#d-body").innerHTML = detailHtml(r);
    var g = $("#d-glyph"), gctx = S.fit(g, g.clientWidth || 76, g.clientHeight || 76), gs = (g.clientWidth || 76) / 2;
    S.drawStar(gctx, gs, gs, r, { s: gs / 9, halo: 1 });
    var wasHidden = drawer.hidden;
    drawer.hidden = false;
    document.body.classList.add("drawer-open");
    var modal = sheetMode();
    drawer.setAttribute("aria-modal", modal ? "true" : "false");
    scrim.hidden = !modal;
    if (wasHidden && !RM) { drawer.classList.add("entering"); requestAnimationFrame(function () { requestAnimationFrame(function () { drawer.classList.remove("entering"); }); }); }
    $("#d-body").scrollTop = 0;
    $("#d-title").focus({ preventScroll: true });
    $("#d-copy").addEventListener("click", function () {
      var u = location.origin + location.pathname + "#" + encodeURIComponent(id), btn = this;
      var done = function () { btn.textContent = "Link copied"; setTimeout(function () { btn.textContent = "Copy link to this entry"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(u).then(done, done); } else { done(); }
    });
    [].forEach.call(document.querySelectorAll("[data-open]"), function (a) {
      a.addEventListener("click", function (ev) { ev.preventDefault(); openEntry(a.getAttribute("data-open"), returnTo); });
    });
    /* bring the entry's date into the sky's window */
    if (r.day < v0 || r.day > v1) { var w = v1 - v0; v0 = r.day - w / 2; v1 = v0 + w; clampWindow(); datesFromWindow(); syncControls(); noteRange(); scheduleList(); }
    writeUrl(); redraw();
    [].forEach.call(document.querySelectorAll(".row"), function (b) { b.setAttribute("aria-current", b.getAttribute("data-id") === id ? "true" : "false"); });
    $("#live").textContent = "Opened " + r.name + ".";
  }
  function closeEntry() {
    if (drawer.hidden) { return; }
    drawer.hidden = true; scrim.hidden = true; selId = null;
    document.body.classList.remove("drawer-open");
    writeUrl(); redraw();
    [].forEach.call(document.querySelectorAll(".row[aria-current='true']"), function (b) { b.setAttribute("aria-current", "false"); });
    if (returnTo && returnTo.focus && document.contains(returnTo)) { returnTo.focus({ preventScroll: true }); }
  }

  /* ---------------- wiring ---------------- */
  function bindRail() {
    var lab = $("#f-lab");
    V.ORGS.slice().sort(function (a, b) { return V.ORG_NAMES[a].localeCompare(V.ORG_NAMES[b]); }).forEach(function (o) {
      var op = document.createElement("option"); op.value = o; op.textContent = V.ORG_NAMES[o]; lab.appendChild(op);
    });
    var countries = {};
    V.ORGS.forEach(function (o) { countries[V.ORG_COUNTRY[o]] = 1; });
    Object.keys(countries).sort().forEach(function (c) { var op = document.createElement("option"); op.value = c; op.textContent = c; $("#f-country").appendChild(op); });
    function changed() { recompute(); syncControls(); writeUrl(); redraw(); renderList(); }
    var qt = null;
    $("#f-q").addEventListener("input", function () { clearTimeout(qt); var v = this.value; qt = setTimeout(function () { st.q = v.trim().toLowerCase(); changed(); }, 140); });
    [["#f-lab", "lab"], ["#f-country", "country"], ["#f-type", "type"], ["#f-avail", "avail"], ["#f-scores", "scores"]].forEach(function (p) {
      $(p[0]).addEventListener("change", function () { st[p[1]] = this.value; changed(); });
    });
    function dateChanged() {
      var f = $("#f-from").value, t = $("#f-to").value;
      st.from = DATE_RE.test(f) ? f : null; st.to = DATE_RE.test(t) ? t : null;
      if (st.from && st.to && st.from > st.to) { var x = st.from; st.from = st.to; st.to = x; }
      windowFromDates(); clampWindow(); syncControls(); writeUrl(); redraw(); renderList(); noteRange();
    }
    $("#f-from").addEventListener("change", dateChanged);
    $("#f-to").addEventListener("change", dateChanged);
    function reset() {
      st.q = st.lab = st.country = st.type = st.avail = st.scores = ""; st.from = st.to = null;
      v0 = full0; v1 = full1; changed(); noteRange();
    }
    $("#f-reset").addEventListener("click", reset);
    $("#empty-reset").addEventListener("click", reset);
    $("#rail").addEventListener("submit", function (e) { e.preventDefault(); });
    $("#rail-toggle").addEventListener("click", function () {
      var open = !$("#rail").classList.contains("open");
      $("#rail").classList.toggle("open", open); this.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $("#sort").addEventListener("click", function () {
      st.asc = !st.asc; this.textContent = st.asc ? "Newest first" : "Oldest first"; renderList();
    });
    $("#results").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".row") : null;
      if (b) { openEntry(b.getAttribute("data-id"), b); }
    });
    $("#d-close").addEventListener("click", closeEntry);
    scrim.addEventListener("click", closeEntry);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) { closeEntry(); } });
    /* keep keyboard focus inside the bottom sheet while it is modal */
    drawer.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !sheetMode()) { return; }
      var f = drawer.querySelectorAll('a[href], button, [tabindex="-1"]');
      var list = [].filter.call(f, function (x) { return x.offsetParent !== null; });
      if (!list.length) { return; }
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener("hashchange", function () {
      var id = decodeURIComponent(location.hash.slice(1));
      if (id && D.byId[id] && id !== selId) { openEntry(id); }
      if (!id) { closeEntry(); }
    });
  }

  function footer() {
    var m = D.meta, el = $("#foot-update");
    var txt = "Last successful update: " + esc(m.last_successful_update) + ".";
    var age = Math.floor((Date.now() - Date.parse(m.last_successful_update + "T00:00:00Z")) / 86400000);
    if (age > 3) {
      txt += ' <span class="stale">This record is ' + age + " days old: no new entries have been approved since " + esc(m.last_successful_update) +
        ". New releases wait in a review queue until a person approves them.</span>";
    }
    el.innerHTML = txt;
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) { return Promise.resolve(); }
    return Promise.race([Promise.all([document.fonts.load('500 13px "Mona Sans"'), document.fonts.load('500 11px "Martian Mono"')]),
      new Promise(function (r) { setTimeout(r, 1500); })]);
  }

  V.load().then(function (data) {
    D = data; recs = D.recs; N = recs.length; firstDay = S.firstDays(recs);
    full0 = -6; full1 = D.span + 6;
    readUrl(); recompute(); windowFromDates(); clampWindow(); syncControls();
    footer(); bindRail(); renderList();
    sky.cv = $("#xsky"); br.cv = $("#xbrush");
    return fontsReady().then(function () {
      S.drawKeys(); layoutSky(); layoutBrush(); noteRange();
      new ResizeObserver(function () { layoutSky(); layoutBrush(); }).observe(sky.cv);
      bindSky(); bindBrush();
      var id = decodeURIComponent(location.hash.slice(1));
      if (id && D.byId[id]) { openEntry(id, sky.cv); }
    });
  }).catch(function (err) {
    $("#count").textContent = "The record could not be loaded in this session (" + (err && err.message ? err.message : "unknown error") + "). Reloading the page retries.";
    if (window.console) { console.warn(err); }
  });
})();
