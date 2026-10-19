/* Observatory landing page: the hero sky, the scroll-driven sequence, the
   findings and the door into the record. Every figure is read from data/ at
   load time (see obs-data.js); this file only lays it out and draws it. */
(function () {
  "use strict";
  var V = window.VCO, S = window.VCOSky, C = S.C, FONT = S.FONT;
  var esc = V.esc;
  var $ = function (s) { return document.querySelector(s); };
  var RM = V.reducedMotion();
  var D, recs, N, firstDay;

  /* ---------------- the record card (hover, tap, keyboard) ---------------- */
  var Tip = (function () {
    var el = $("#tip"), body = el.querySelector(".tip-body"), closeBtn = el.querySelector(".tip-close");
    var api = { pinned: false, onClose: null };
    api.show = function (rec, cx, cy, mode) {
      var hint = mode === "pin" ?
        '<a class="btn" href="./explorer.html#' + esc(rec.id) + '">Open the full record <span aria-hidden="true">&#8599;</span></a>' :
        '<p class="tip-hint">' + (mode === "key" ? "Press Enter to open the full record." : "Click to open the full record.") + "</p>";
      body.innerHTML = S.cardHtml(rec) + hint;
      el.classList.add("on");
      api.pinned = mode === "pin";
      el.classList.toggle("pinned", api.pinned);
      if (window.innerWidth >= 700) {
        var w = el.offsetWidth, h = el.offsetHeight;
        var x = cx + 18, y = cy + 18;
        if (x + w > window.innerWidth - 12) { x = cx - w - 18; }
        if (y + h > window.innerHeight - 12) { y = Math.max(12, cy - h - 18); }
        el.style.left = Math.max(12, x) + "px"; el.style.top = y + "px";
      } else { el.style.left = ""; el.style.top = ""; }
    };
    api.hide = function () { el.classList.remove("on", "pinned"); api.pinned = false; };
    closeBtn.addEventListener("click", function () { api.hide(); if (api.onClose) { api.onClose(); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && api.pinned) { api.hide(); if (api.onClose) { api.onClose(); } } });
    return api;
  })();

  /* pointer, touch and keyboard on any star canvas.
     o.points(): positions per record index (CSS px inside the canvas), o.ok(i): visible,
     o.mark(i): highlight index for redraw, o.live: aria-live element */
  function interact(cv, o) {
    var hover = -1, sel = -1, down = null;
    function rect() { return cv.getBoundingClientRect(); }
    function setMark(i) { o.mark(i); }
    function open(i) { location.href = "./explorer.html#" + encodeURIComponent(recs[i].id); }
    cv.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") { return; }
      var r = rect(), i = S.nearest(o.points(), e.clientX - r.left, e.clientY - r.top, 16, o.ok);
      if (i !== hover) {
        hover = i; setMark(i);
        cv.style.cursor = i >= 0 ? "pointer" : "crosshair";
        if (i >= 0) { Tip.show(recs[i], e.clientX, e.clientY, "hover"); } else if (!Tip.pinned) { Tip.hide(); }
      } else if (i >= 0) { Tip.show(recs[i], e.clientX, e.clientY, "hover"); }
    });
    cv.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse" && !Tip.pinned) { hover = -1; setMark(-1); Tip.hide(); }
    });
    cv.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY, t: e.pointerType }; });
    cv.addEventListener("pointerup", function (e) {
      if (!down) { return; }
      var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 10;
      var kind = down.t; down = null;
      if (moved) { return; }
      var r = rect(), i = S.nearest(o.points(), e.clientX - r.left, e.clientY - r.top, kind === "mouse" ? 16 : 26, o.ok);
      if (kind === "mouse") { if (i >= 0) { open(i); } return; }
      if (i >= 0) { sel = i; setMark(i); Tip.show(recs[i], e.clientX, e.clientY, "pin"); Tip.onClose = function () { setMark(-1); }; }
      else { Tip.hide(); setMark(-1); }
    });
    /* keyboard: arrows walk the lanes in time order */
    function lanes() {
      var by = {}, pts = o.points();
      for (var i = 0; i < recs.length; i++) {
        if (!pts[i] || (o.ok && !o.ok(i))) { continue; }
        (by[recs[i].lane] = by[recs[i].lane] || []).push(i);
      }
      Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return recs[a].day - recs[b].day; }); });
      return by;
    }
    function showKey(i) {
      sel = i; setMark(i);
      var p = o.points()[i], r = rect();
      Tip.show(recs[i], r.left + p.x, r.top + p.y, "key");
      if (o.live) { o.live.textContent = S.ariaLine(recs[i]); }
    }
    cv.addEventListener("focus", function () {
      if (sel < 0) {
        var by = lanes(), first = -1;
        Object.keys(by).forEach(function (k) { var c = by[k][0]; if (first < 0 || recs[c].day < recs[first].day) { first = c; } });
        if (first >= 0) { showKey(first); }
      } else { showKey(sel); }
    });
    cv.addEventListener("blur", function () { if (!Tip.pinned) { Tip.hide(); } setMark(-1); });
    cv.addEventListener("keydown", function (e) {
      var by = lanes(); if (sel < 0) { return; }
      var lane = recs[sel].lane, list = by[lane] || [], at = list.indexOf(sel), nxt = -1;
      var horiz = o.vertical && o.vertical() ? false : true;
      var along = horiz ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
      var across = horiz ? ["ArrowDown", "ArrowUp"] : ["ArrowRight", "ArrowLeft"];
      if (e.key === along[0]) { nxt = list[Math.min(list.length - 1, at + 1)]; }
      else if (e.key === along[1]) { nxt = list[Math.max(0, at - 1)]; }
      else if (e.key === across[0] || e.key === across[1]) {
        var dir = e.key === across[0] ? 1 : -1;
        for (var l = lane + dir; l >= 0 && l < V.ORGS.length; l += dir) {
          var cand = by[l];
          if (cand && cand.length) {
            var best = cand[0];
            cand.forEach(function (c) { if (Math.abs(recs[c].day - recs[sel].day) < Math.abs(recs[best].day - recs[sel].day)) { best = c; } });
            nxt = best; break;
          }
        }
      } else if (e.key === "Home") { nxt = list[0]; }
      else if (e.key === "End") { nxt = list[list.length - 1]; }
      else if (e.key === "Enter") { e.preventDefault(); open(sel); return; }
      else if (e.key === "Escape") { Tip.hide(); return; }
      else { return; }
      e.preventDefault();
      if (nxt != null && nxt >= 0) { showKey(nxt); }
    });
  }

  function drawKey() { S.drawKeys(); }

  /* ---------------- hero sky ---------------- */
  function Hero() {
    var cv = $("#sky"), wrap = cv.parentElement, copy = $(".hero-copy");
    var ctx, W, H, L, pts = [], mark = -1, vertical = false, neb = null;
    var flare = new Float32Array(N), sweep = -1, running = false, lastT = 0, visible = true, raf = 0;
    var SWEEP_MS = 19000, PAUSE_MS = 5000, cycleT = 0;
    var chat = recs.findIndex(function (r) { return r.id === "openai--chatgpt"; });

    function layout() {
      W = wrap.clientWidth; H = wrap.clientHeight;
      if (!W || !H) { return; }
      ctx = S.fit(cv, W, H);
      vertical = W < 700;
      var rect;
      if (!vertical) {
        var stacked = getComputedStyle(wrap).position !== "absolute";
        var top = stacked ? 36 : Math.max(copy.offsetTop + copy.offsetHeight + 66, H * 0.4);
        var left = Math.max(150, Math.min(200, W * 0.12));
        rect = { x: left, y: top, w: W - left - 48, h: H - top - 34 };
        L = S.laneLayout(recs, rect, -6, D.span + 6, "h", { minSep: 7 });
      } else {
        rect = { x: 44, y: 112, w: W - 44 - 12, h: H - 112 - 14 };
        L = S.laneLayout(recs, rect, -6, D.span + 6, "v", { minSep: 4 });
      }
      pts = L.pos;
      neb = S.nebula(recs, pts, W, H, vertical ? 26 : 38);
      draw();
    }
    function draw() {
      if (!ctx) { return; }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(neb, 0, 0, W, H);
      S.drawLaneFrame(ctx, L, D.t0, firstDay, { labelSize: vertical ? 11 : 13 });
      var R = L.rect, along = vertical ? R.h : R.w;
      if (sweep >= 0) {
        var p = sweep * along;
        ctx.save();
        ctx.globalAlpha = 0.2; ctx.strokeStyle = "rgb(" + C.indLight + ")"; ctx.lineWidth = 1;
        ctx.beginPath();
        if (!vertical) { ctx.moveTo(R.x + p, R.y - 2); ctx.lineTo(R.x + p, R.y + R.h); }
        else { ctx.moveTo(R.x - 2, R.y + p); ctx.lineTo(R.x + R.w, R.y + p); }
        ctx.stroke();
        ctx.restore();
      }
      var s = vertical ? 0.85 : 1.12, h = vertical ? 0.75 : 1;
      for (var i = 0; i < N; i++) {
        S.drawStar(ctx, pts[i].x, pts[i].y, recs[i], { s: s, halo: h, flare: flare[i], sel: i === mark });
      }
      /* two plain anchors: where the record starts and the day it was last updated */
      ctx.font = "500 11px " + FONT.mono; ctx.fillStyle = C.ink2; ctx.globalAlpha = 0.95;
      if (chat >= 0) {
        var c = pts[chat];
        if (!vertical) { ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("ChatGPT " + recs[chat].date, c.x + 9, c.y + 9); }
        else { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("ChatGPT", c.x + 9, c.y + 2); }
      }
      if (!vertical) { ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("as of " + D.asOf, R.x + R.w, R.y - 6); }
      ctx.globalAlpha = 1;
    }
    function frame(t) {
      raf = 0;
      if (!running) { return; }
      var dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;
      cycleT += dt;
      var prev = sweep;
      if (cycleT < SWEEP_MS) { sweep = cycleT / SWEEP_MS; } else { sweep = -1; }
      if (cycleT > SWEEP_MS + PAUSE_MS) { cycleT = 0; prev = 0; }
      var decay = Math.exp(-dt / 900);
      var R = L.rect, along = vertical ? R.h : R.w;
      for (var i = 0; i < N; i++) {
        flare[i] *= decay;
        if (sweep >= 0 && prev >= 0) {
          var q = ((vertical ? pts[i].y - R.y : pts[i].x - R.x)) / along;
          if (q >= prev && q < sweep) { flare[i] = 1; }
        }
      }
      draw();
      raf = requestAnimationFrame(frame);
    }
    function start() { if (RM || running || !visible || document.hidden) { return; } running = true; lastT = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } sweep = -1; for (var i = 0; i < N; i++) { flare[i] = 0; } draw(); }

    layout();
    new ResizeObserver(function () { layout(); }).observe(wrap);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { start(); } else { stop(); } }).observe(wrap);
    document.addEventListener("visibilitychange", function () { if (document.hidden) { stop(); } else { start(); } });
    interact(cv, {
      points: function () { return pts; }, ok: null, live: $("#sky-live"),
      vertical: function () { return vertical; },
      mark: function (i) { mark = i; if (!running) { draw(); } }
    });
    start();
  }

  /* ---------------- the newest releases, at the door ---------------- */
  function Recent() {
    var cv = $("#recent"), ctx, W, H, L, pts = [], mark = -1;
    var d0 = D.span - 150;
    var title = $("#recent-title");
    title.textContent = "The newest releases on record, " + V.isoOf(D.t0 + d0) + " to " + D.asOf;
    function ok(i) { return recs[i].day >= d0; }
    function layout() {
      W = cv.clientWidth; H = cv.clientHeight; if (!W) { return; }
      ctx = S.fit(cv, W, H);
      var left = W < 500 ? 96 : 124;
      L = S.laneLayout(recs, { x: left, y: 26, w: W - left - 12, h: H - 30 }, d0, D.span + 3, "h", { minSep: 9 });
      pts = L.pos.map(function (p, i) { return ok(i) ? p : null; });
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      S.drawLaneFrame(ctx, L, D.t0, firstDay, { labelSize: 13 });
      /* month ticks (the window is under a year, so year meridians alone say little) */
      ctx.font = "500 11px " + FONT.mono; ctx.fillStyle = C.ink2; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      var R = L.rect;
      for (var d = d0; d <= D.span; d++) {
        var iso = V.isoOf(D.t0 + d);
        if (iso.slice(8) === "01") {
          var x = R.x + (d - d0) * L.k;
          ctx.globalAlpha = 0.1; ctx.strokeStyle = C.star; ctx.beginPath(); ctx.moveTo(x, R.y - 4); ctx.lineTo(x, R.y + R.h); ctx.stroke();
          ctx.globalAlpha = 0.9; ctx.fillText(iso.slice(0, 7), x + 3, R.y - 6);
        }
      }
      ctx.globalAlpha = 1;
      for (var i = 0; i < N; i++) { if (pts[i]) { S.drawStar(ctx, pts[i].x, pts[i].y, recs[i], { s: 1.1, halo: 1, sel: i === mark }); } }
    }
    layout();
    new ResizeObserver(layout).observe(cv);
    interact(cv, { points: function () { return pts; }, ok: ok, live: $("#sky-live"), mark: function (i) { mark = i; draw(); } });
  }

  /* ---------------- the scroll sequence ---------------- */
  var F; /* findings */

  function el(tag, cls, html) { var x = document.createElement(tag); if (cls) { x.className = cls; } if (html != null) { x.innerHTML = html; } return x; }

  function tableHtml(caption, head, rows, numCols) {
    numCols = numCols || [];
    var h = '<div class="tscroll"><table><caption>' + caption + "</caption><thead><tr>";
    head.forEach(function (c, i) { h += '<th scope="col"' + (numCols.indexOf(i) >= 0 ? ' class="n"' : "") + ">" + c + "</th>"; });
    h += "</tr></thead><tbody>";
    rows.forEach(function (r) {
      h += "<tr>";
      r.forEach(function (c, i) { h += (i === 0 ? '<th scope="row">' : "<td" + (numCols.indexOf(i) >= 0 ? ' class="n"' : "") + ">") + c + (i === 0 ? "</th>" : "</td>"); });
      h += "</tr>";
    });
    return h + "</tbody></table></div>";
  }

  function chapters() {
    var CASE = F.waits.map(function (w) { return w.org; });
    var yearly = {}; D.views.cadence.yearly.forEach(function (y) { yearly[y.year] = y; });
    var cadRows = D.views.cadence.yearly.map(function (y) {
      var p = F.pulse.filter(function (q) { return q.year === y.year; })[0];
      return [y.year, y.releases, y.revisions, p && p.median != null ? V.fmtNum(p.median) : "", p ? p.busiest : ""];
    });
    var orgRows = V.ORGS.map(function (o) {
      var rows = D.views.disclosure_matrix.rows.filter(function (r) { return r.org === o; });
      var cells = V.SLOTS.map(function (s) {
        var on = 0, nd = 0, nr = 0;
        rows.forEach(function (r) { var c = r.cells[s[0]]; if (c === "disclosed") { on++; } else if (c === "not_disclosed") { nd++; } else { nr++; } });
        return on + " of " + (on + nd) + (nr ? " (" + nr + " not yet)" : "");
      });
      return [esc(V.ORG_NAMES[o])].concat([rows.length]).concat(cells);
    });
    var shareRows = F.slots.map(function (y) {
      var rows = D.views.disclosure_matrix.rows.filter(function (r) { return r.date.slice(0, 4) === y; });
      function share(k) {
        var on = 0, res = 0;
        rows.forEach(function (r) { if (r.cells[k] !== "not_researched") { res++; } if (r.cells[k] === "disclosed") { on++; } });
        return res ? on + " of " + res + " (" + Math.round(100 * on / res) + "%)" : "none researched";
      }
      return [y, rows.length, share("paper"), share("system_card")];
    });
    var climbRows = F.climb.map(function (c, i) { return [c.year, c.n, c.max, F.capVals[i]]; });
    var pairRows = F.pairs.map(function (p) {
      return [esc(p.model), esc(p.benchLabel), p.lab, p.ind, (p.gap > 0 ? "+" : "") + p.gap.toFixed(1), esc(p.labSet), esc(p.indSet)];
    });
    var refRows = F.refused.map(function (r) { return [esc(r.model), esc(V.ORG_NAMES[r.org] || r.org), r.date, esc(r.reason)]; });
    var reasons = {};
    F.refused.forEach(function (r) { (reasons[r.reason] = reasons[r.reason] || []).push(r.model); });
    var refusedBody = "We show a change against the previous model only when both scores are on the same benchmark, the same version of it, and from the same kind of source. " +
      V.cap(V.nword(F.refused.length)) + " comparisons on record were refused: " +
      Object.keys(reasons).map(function (k) { return V.joinAnd(reasons[k].map(esc)) + " (" + esc(k) + ")"; }).join("; ") + ".";

    return [
      { id: "cadence", h2: "How often they ship", scene: "cadence",
        intro: "Each star drops into the month it shipped, and the columns become a count of releases per month. Revisions are counted separately and left out of release counts.",
        steps: F.pulse.map(function (p) { return { focus: { year: p.year }, h3: esc(p.head), body: "<p>" + esc(p.body) + "</p>" }; }).concat([{
          focus: { orgs: CASE }, h3: "The wait between releases",
          body: '<ul class="waits">' + F.waits.map(function (w) { return "<li><b>" + esc(w.name) + ".</b> " + esc(w.body) + "</li>"; }).join("") + "</ul>"
        }]),
        table: tableHtml("Releases and revisions per year, with the median days between one release and the next and the most releases in any one week.",
          ["Year", "Releases", "Revisions", "Median gap, days", "Busiest week"], cadRows, [1, 2, 3, 4]) },
      { id: "disclosure", h2: "What they publish", scene: "orbits",
        intro: "Each lab is a small system. Its releases sit on the outer ring in date order, clockwise from the top. The four orbits inside hold its documents.",
        key: true,
        steps: [
          { focus: { slot: "paper" }, h3: esc(F.paper.head), body: "<p>" + esc(F.paper.body) + "</p>" +
            (F.pendingPaper ? "<p>" + F.pendingPaper + " more paper links are under review and not yet on record.</p>" : "") },
          { focus: { slot: "system_card" }, h3: F.syscard.dir === "rose" ? "More arrive with a system card" : "Releases with a system card", body: "<p>" + esc(F.syscard.body) + "</p>" },
          { focus: { slot: "usage_policy" }, h3: "Usage policies, where we looked", body: "<p>" + esc(F.usage.body) + "</p><p>A link on record means the document exists. We do not grade what it says.</p>" }
        ],
        table: tableHtml("Links on record out of the releases researched for each document, by lab. Releases not yet researched are counted apart and never in the share.",
          ["Lab", "Releases", "System card", "Model card", "Usage policy", "Paper"], orgRows, [1]) +
          tableHtml("Shares by year, researched releases only.", ["Year", "Releases", "With a paper", "With a system card"], shareRows, [1]) },
      { id: "scores", h2: "Independent scores", scene: "climb",
        intro: "Each release with an independent GPQA Diamond score rises to that score and leaves a trail. Releases with no score on record wait in the band under the axis, never at zero. The bright line is the highest score reached so far.",
        steps: F.climb.map(function (c) { return { focus: { year: c.year, bench: "gpqa-diamond" }, h3: c.year, body: "<p>" + esc(c.body) + "</p>" }; }).concat([
          { focus: { bench: "swe-bench-verified" }, h3: "A second benchmark", body: "<p>" + esc(F.sweBody) + "</p><p>The two benchmarks never share a line or an axis. A revised benchmark is a different test.</p>" }
        ]),
        table: tableHtml("Independent GPQA Diamond scores by year (Epoch AI). Highest so far is the running top across all earlier years.",
          ["Year", "Releases scored", "Highest that year", "Highest so far"], climbRows, [1, 2, 3]) },
      { id: "pairs", h2: "The lab's number beside Epoch's", scene: "binaries",
        intro: "Where a lab and Epoch scored the same release on the same benchmark, the two scores are drawn as a binary star: amber ring for the lab, ice for Epoch, with the gap and each side's settings.",
        steps: [
          { focus: {}, h3: "What the pairs show", body: "<p>" + esc(F.pairsBody) + "</p>" },
          { scene: "refused", focus: { ids: F.refused.map(function (r) { return r.id; }) }, h3: "Comparisons we refused", body: "<p>" + refusedBody + "</p>" }
        ],
        table: tableHtml("Lab-reported and independent scores for the same release on the same benchmark. Gap is lab minus Epoch, in points.",
          ["Release", "Benchmark", "Lab", "Epoch", "Gap", "Lab setting", "Epoch setting"], pairRows, [2, 3, 4]) +
          tableHtml("Comparisons against the predecessor that were refused, with the recorded reason.", ["Release", "Lab", "Date", "Reason"], refRows) },
      { id: "whole", h2: "The whole record", scene: "sky",
        intro: "Every star on this page opens to its full record: sources, archived copies, disclosures, and scores with their provenance.",
        cta: true, steps: [], table: "" }
    ];
  }

  function buildSteps() {
    var host = $("#steps"), list = [];
    chapters().forEach(function (ch) {
      var sec = el("section", "chapter"); sec.id = "ch-" + ch.id; sec.setAttribute("aria-labelledby", "h-" + ch.id);
      var first = el("div", "step lead"); first.dataset.scene = ch.scene;
      var card = el("div", "card");
      card.innerHTML = '<h2 id="h-' + ch.id + '">' + esc(ch.h2) + "</h2><p>" + esc(ch.intro) + "</p>" +
        (ch.key ? '<ul class="orbit-key"><li>Inner to outer: system card, model card, usage policy, paper.</li>' +
          '<li class="d-on"><span class="dmark" aria-hidden="true"></span>solid arc: a link on record</li>' +
          '<li><span class="gapmark" aria-hidden="true"><i></i><i></i></span>a gap: we looked and found none</li>' +
          '<li class="d-nr"><span class="dmark" aria-hidden="true"></span>faint dots: not yet researched</li></ul>' : "") +
        (ch.cta ? '<a class="btn" href="./explorer.html">Open the explorer <span class="arr" aria-hidden="true">&#8599;</span></a>' : "");
      first.appendChild(card); sec.appendChild(first);
      list.push({ el: first, card: card, scene: ch.scene, focus: {} });
      ch.steps.forEach(function (s) {
        var st = el("div", "step"); var c = el("div", "card");
        c.innerHTML = "<h3>" + s.h3 + "</h3>" + s.body;
        st.appendChild(c); sec.appendChild(st);
        list.push({ el: st, card: c, scene: s.scene || ch.scene, focus: s.focus || {} });
      });
      if (ch.table) {
        var t = el("div", "step");
        t.innerHTML = '<details class="teq"><summary>Read this chapter as a table</summary><div class="card">' + ch.table + "</div></details>";
        sec.appendChild(t);
        list.push({ el: t, card: t.querySelector("summary"), scene: ch.scene, focus: {}, table: true });
      }
      host.appendChild(sec);
    });
    return list;
  }

  function Stage(steps) {
    var cv = $("#stage"), ctx, W, H, R, mobile;
    var cur = mk(), from = mk(), to = mk(), del = new Float32Array(N);
    var tStart = 0, dur = 0, scene = null, sceneName = "", focus = {}, newOv = null, oldOv = null, raf = 0, mark = -1;
    var visible = false;
    function mk() { return { x: new Float32Array(N), y: new Float32Array(N), s: new Float32Array(N), a: new Float32Array(N), h: new Float32Array(N) }; }
    for (var i = 0; i < N; i++) { del[i] = 0.22 * (recs[i].day / D.span); }

    function region() {
      mobile = W < 1000;
      var navH = mobile && W < 700 ? 96 : 64;
      if (!mobile) { var x = Math.min(500, Math.round(W * 0.35)); return { x: x, y: navH + 46, w: W - x - 56, h: H - navH - 46 - 64 }; }
      var top = navH + 22;
      return { x: 16, y: top, w: W - 32, h: Math.max(240, Math.round(H * 0.535) - top) };
    }

    /* ---- scenes: each returns per-star targets and an overlay ---- */
    function setT(i, x, y, s, a, h) { to.x[i] = x; to.y[i] = y; to.s[i] = s; to.a[i] = a; to.h[i] = h; }
    var SCN = {};

    SCN.sky = function (f) {
      var vert = mobile && W < 700;
      var r = vert ? { x: R.x + 30, y: R.y + 88, w: R.w - 30, h: R.h - 88 } : { x: R.x + 116, y: R.y + 26, w: R.w - 116, h: R.h - 26 };
      var L = S.laneLayout(recs, r, -6, D.span + 6, vert ? "v" : "h", { minSep: vert ? 4 : 6 });
      var ids = f.ids || null;
      for (var i = 0; i < N; i++) {
        var hit = ids && ids.indexOf(recs[i].id) >= 0;
        setT(i, L.pos[i].x, L.pos[i].y, hit ? 2 : (vert ? 0.8 : 0.95), ids ? (hit ? 1 : 0.22) : 1, ids ? (hit ? 1 : 0) : (vert ? 0.6 : 0.9));
      }
      return function (ctx, k) {
        S.drawLaneFrame(ctx, L, D.t0, firstDay, { alpha: k, labelSize: vert ? 11 : 13 });
        if (ids) {
          ctx.save(); ctx.globalAlpha = k; ctx.font = "600 13px " + FONT.display; ctx.fillStyle = C.star; ctx.textBaseline = "middle";
          for (var j = 0; j < N; j++) {
            if (ids.indexOf(recs[j].id) < 0) { continue; }
            var right = cur.x[j] < r.x + r.w - 150;
            ctx.textAlign = right ? "left" : "right";
            ctx.fillText(recs[j].name, cur.x[j] + (right ? 18 : -18), cur.y[j] - 14);
          }
          ctx.restore();
        }
      };
    };

    SCN.cadence = function (f) {
      var fd = V.dayNum(D.meta.first_date), y0 = +D.meta.first_date.slice(0, 4), m0 = +D.meta.first_date.slice(5, 7) - 1;
      var yA = +D.asOf.slice(0, 4), mA = +D.asOf.slice(5, 7) - 1;
      var M = (yA - y0) * 12 + mA - m0 + 1;
      var maxM = 1; D.views.cadence.monthly.forEach(function (m) { maxM = Math.max(maxM, m.releases); });
      var left = mobile ? 24 : 34;
      var P = { x: R.x + left, y: R.y + 20, w: R.w - left, h: R.h - 20 - (mobile ? 44 : 56) };
      var colW = P.w / M, pitch = Math.min(colW * 1.7, P.h * 0.94 / maxM), sc = Math.max(0.5, Math.min(1.25, colW / 13));
      var base = P.y + P.h, cnt = new Int16Array(M);
      function mi(r) { return (+r.date.slice(0, 4) - y0) * 12 + (+r.date.slice(5, 7) - 1) - m0; }
      for (var i = 0; i < N; i++) {
        var r = recs[i], m = mi(r), x = P.x + (m + 0.5) * colW;
        var a = 1;
        if (f.year) { a = r.year === f.year ? 1 : 0.2; }
        if (f.orgs) { a = f.orgs.indexOf(r.org) >= 0 ? 1 : 0.14; }
        if (!r.release) { setT(i, x, base - 3, sc, 0, 0); continue; }
        cnt[m]++;
        setT(i, x, base - (cnt[m] - 0.5) * pitch, sc, a, 0);
      }
      void fd;
      var colYear = [];
      for (var mm = 0; mm < M; mm++) { colYear.push(String(y0 + Math.floor((m0 + mm) / 12))); }
      var glow = S.sprite(C.starRGB);
      return function (ctx, k) {
        ctx.save();
        /* the luminous histogram: each month's column glows with its count */
        for (var c = 0; c < M; c++) {
          if (!cnt[c]) { continue; }
          var on = (!f.year || f.year === colYear[c]) && !f.orgs;
          var hgt = cnt[c] * pitch, cx = P.x + (c + 0.5) * colW;
          ctx.globalAlpha = k * (on ? 0.5 : 0.18);
          ctx.drawImage(glow, cx - colW * 1.1, base - hgt - colW * 0.6, colW * 2.2, hgt + colW * 1.2);
        }
        ctx.globalAlpha = 0.3 * k; ctx.strokeStyle = C.star; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(P.x, base + 0.5); ctx.lineTo(P.x + P.w, base + 0.5); ctx.stroke();
        /* count scale */
        ctx.font = "500 11px " + FONT.mono; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        [5, 10].forEach(function (v) {
          if (v > maxM) { return; }
          var yy = base - v * pitch;
          ctx.globalAlpha = 0.09 * k; ctx.beginPath(); ctx.moveTo(P.x, yy); ctx.lineTo(P.x + P.w, yy); ctx.stroke();
          ctx.globalAlpha = 0.85 * k; ctx.fillStyle = C.ink2; ctx.fillText(String(v), P.x - 8, yy);
        });
        ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.globalAlpha = k; ctx.fillStyle = C.star;
        ctx.font = "600 13px " + FONT.display;
        ctx.fillText("Releases per month, each star one release", P.x - left, Math.min(base - maxM * pitch, base - 10 * pitch) - 18);
        /* years along the base */
        ctx.textBaseline = "top";
        for (var y = y0; y <= yA; y++) {
          var idx = Math.max(0, (y - y0) * 12 - m0);
          var x = P.x + idx * colW;
          var on = !f.year || f.year === String(y);
          ctx.globalAlpha = (on ? 0.9 : 0.4) * k; ctx.fillStyle = C.ink2; ctx.font = "500 12px " + FONT.mono;
          ctx.beginPath(); ctx.moveTo(x + 0.5, base); ctx.lineTo(x + 0.5, base + 6); ctx.stroke();
          var yr = D.views.cadence.yearly.filter(function (q) { return q.year === String(y); })[0];
          var monthsIn = y === y0 ? 12 - m0 : (y === yA ? mA + 1 : 12);
          if (monthsIn * colW < 40) { continue; }
          ctx.fillText(String(y), x + 4, base + 10);
          if (yr && monthsIn * colW > 90) {
            ctx.font = "500 13px " + FONT.display; ctx.fillStyle = on ? C.star : C.ink3;
            ctx.fillText(yr.releases + (String(y) === F.curY ? " so far" : " releases"), x + 4, base + 28);
          }
        }
        ctx.restore();
      };
    };

    SCN.orbits = function (f) {
      var cols = R.w >= 760 || R.w / R.h > 0.85 ? 4 : 3, rows = Math.ceil(V.ORGS.length / cols);
      var lab = mobile ? 18 : 30;
      var cw = R.w / cols, ch = R.h / rows;
      var Rs = Math.min(cw * 0.5, (ch - lab) * 0.5) * 0.86;
      var RADII = [0.36, 0.52, 0.68, 0.84];
      var sys = {};
      V.ORGS.forEach(function (o, k) {
        var c = k % cols, r = Math.floor(k / cols);
        sys[o] = { cx: R.x + (c + 0.5) * cw, cy: R.y + r * ch + (ch - lab) / 2, list: [] };
      });
      for (var i = 0; i < N; i++) { if (recs[i].release) { sys[recs[i].org].list.push(i); } }
      var sc = Math.max(0.5, Math.min(0.95, Rs / 75));
      for (var j = 0; j < N; j++) {
        var s0 = sys[recs[j].org];
        if (!recs[j].release) { setT(j, s0.cx, s0.cy, sc, 0, 0); continue; }
        var n = s0.list.length, q = s0.list.indexOf(j);
        var ang = -Math.PI / 2 + (q + 0.5) / n * Math.PI * 2;
        setT(j, s0.cx + Math.cos(ang) * Rs, s0.cy + Math.sin(ang) * Rs, sc, 1, 0);
      }
      var lw = Rs > 60 ? 2.2 : 1.6;
      return function (ctx, k) {
        ctx.save();
        V.ORGS.forEach(function (o) {
          var s0 = sys[o], n = s0.list.length;
          V.SLOTS.forEach(function (slot, si) {
            var rr = RADII[si] * Rs, on = !f.slot || f.slot === slot[0];
            var fa = on ? 1 : 0.16;
            ctx.setLineDash([]); ctx.globalAlpha = 0.08 * k; ctx.strokeStyle = C.star; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(s0.cx, s0.cy, rr, 0, Math.PI * 2); ctx.stroke();
            var half = Math.PI / n;
            s0.list.forEach(function (idx, q) {
              var st = recs[idx].disc[slot[0]];
              var a = -Math.PI / 2 + (q + 0.5) / n * Math.PI * 2;
              var g = Math.min(half * 0.24, 0.05);
              if (st === "on") {
                ctx.setLineDash([]); ctx.globalAlpha = 0.92 * k * fa; ctx.strokeStyle = C.star; ctx.lineWidth = lw;
                ctx.beginPath(); ctx.arc(s0.cx, s0.cy, rr, a - half + g, a + half - g); ctx.stroke();
              } else if (st === "nr") {
                ctx.setLineDash([1, 3.2]); ctx.globalAlpha = 0.5 * k * fa; ctx.strokeStyle = C.ink3; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.arc(s0.cx, s0.cy, rr, a - half + g, a + half - g); ctx.stroke();
              }
              /* not disclosed: the gap is the mark */
            });
          });
          ctx.setLineDash([]);
          ctx.globalAlpha = k; ctx.fillStyle = C.star; ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.font = "600 " + (mobile ? 11 : 14) + "px " + FONT.display;
          ctx.fillText(V.SHORT_NAMES[o], s0.cx, s0.cy + Rs + (mobile ? 7 : 12));
          if (!mobile) {
            ctx.font = "500 12px " + FONT.display; ctx.fillStyle = C.ink2;
            ctx.fillText(n + " releases", s0.cx, s0.cy + Rs + 30);
          }
        });
        ctx.restore();
      };
    };

    SCN.climb = function (f) {
      var bench = f.bench || "gpqa-diamond";
      var left = mobile ? 30 : 40;
      var P = { x: R.x + left, y: R.y + 30, w: R.w - left - 8, h: R.h - 30 - (mobile ? 72 : 92) };
      var bandY = P.y + P.h + (mobile ? 54 : 66);
      function xd(d) { return P.x + (d + 6) / (D.span + 12) * P.w; }
      function yv(v) { return P.y + P.h - v / 100 * P.h; }
      var scored = [];
      for (var i = 0; i < N; i++) {
        var r = recs[i], b = r.ind[bench];
        var a = f.year ? (r.year === f.year ? 1 : 0.22) : 1;
        if (b) { setT(i, xd(r.day), yv(b.value), mobile ? 1 : 1.35, a, 0); scored.push(i); }
        else { setT(i, xd(r.day), bandY + ((r.lane % 5) - 2) * 3, 0.5, 0.34 * (f.year ? (r.year === f.year ? 1 : 0.5) : 1), 0); }
      }
      scored.sort(function (p, q) { return recs[p].day - recs[q].day; });
      var labs = [];
      for (var j = 0; j < N; j++) { if (recs[j].lab[bench]) { labs.push(j); } }
      var label = (D.byId && V.BENCH_LABEL[bench]) || bench;
      return function (ctx, k) {
        ctx.save();
        ctx.font = "500 11px " + FONT.mono; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.lineWidth = 1;
        [0, 25, 50, 75, 100].forEach(function (v) {
          ctx.globalAlpha = (v === 0 ? 0.3 : 0.1) * k; ctx.strokeStyle = C.star;
          ctx.beginPath(); ctx.moveTo(P.x, yv(v) + 0.5); ctx.lineTo(P.x + P.w, yv(v) + 0.5); ctx.stroke();
          ctx.globalAlpha = 0.85 * k; ctx.fillStyle = C.ink2; ctx.fillText(String(v), P.x - 8, yv(v));
        });
        ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.font = "600 13px " + FONT.display; ctx.fillStyle = C.star; ctx.globalAlpha = k;
        ctx.fillText(label + ", independent scores (Epoch AI), 0 to 100", P.x - left, P.y - 12);
        /* years */
        ctx.font = "500 12px " + FONT.mono; ctx.textBaseline = "top";
        for (var y = +D.meta.first_date.slice(0, 4) + 1; y <= +D.asOf.slice(0, 4); y++) {
          var x = xd(V.dayNum(y + "-01-01") - D.t0);
          var on = !f.year || f.year === String(y);
          ctx.globalAlpha = (on ? 0.9 : 0.4) * k; ctx.fillStyle = C.ink2; ctx.strokeStyle = C.star;
          ctx.beginPath(); ctx.moveTo(x + 0.5, P.y + P.h); ctx.lineTo(x + 0.5, P.y + P.h + 6); ctx.stroke();
          ctx.fillText(String(y), x + 4, P.y + P.h + 8);
        }
        ctx.globalAlpha = 0.85 * k; ctx.fillStyle = C.ink2; ctx.font = "500 12px " + FONT.display; ctx.textBaseline = "bottom";
        ctx.fillText("No independent " + label + " score on record", P.x - left, bandY - 12);
        /* trails: from the axis to each star, like a long exposure */
        for (var t = 0; t < scored.length; t++) {
          var ii = scored[t];
          var top = cur.y[ii], bot = P.y + P.h;
          if (top >= bot - 1) { continue; }
          var gr = ctx.createLinearGradient(0, bot, 0, top);
          gr.addColorStop(0, "rgba(" + C.indLight + ",0)");
          gr.addColorStop(1, "rgba(" + C.indLight + ",0.42)");
          ctx.globalAlpha = k * cur.a[ii]; ctx.strokeStyle = gr; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cur.x[ii] + 0.5, bot); ctx.lineTo(cur.x[ii] + 0.5, top); ctx.stroke();
        }
        /* the highest score reached so far */
        if (scored.length) {
          ctx.globalAlpha = 0.85 * k; ctx.strokeStyle = "rgb(" + C.indLight + ")"; ctx.lineWidth = 1.6;
          ctx.beginPath();
          var best = -1, lastX = 0;
          scored.forEach(function (ii2, n) {
            var v = recs[ii2].ind[bench].value, x2 = xd(recs[ii2].day);
            if (v > best) {
              if (n === 0) { ctx.moveTo(x2, yv(v)); } else { ctx.lineTo(x2, yv(best)); ctx.lineTo(x2, yv(v)); }
              best = v;
            }
            lastX = x2;
          });
          var endX = xd(D.span);
          ctx.lineTo(Math.max(lastX, endX), yv(best)); ctx.stroke();
          ctx.globalAlpha = k; ctx.fillStyle = C.star; ctx.font = "600 13px " + FONT.display; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
          ctx.fillText("highest so far: " + best, P.x + P.w, yv(best) - 8);
        }
        /* lab-reported values for the same benchmark: amber rings */
        labs.forEach(function (ii3) {
          var r = recs[ii3], v = r.lab[bench].value;
          ctx.globalAlpha = k * (f.year ? (r.year === f.year ? 1 : 0.3) : 1);
          ctx.strokeStyle = C.lab; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(xd(r.day) + 5, yv(v), 3.6, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.restore();
      };
    };

    SCN.binaries = function () {
      var pairs = F.pairs, n = pairs.length;
      var vals = []; pairs.forEach(function (p) { vals.push(p.lab, p.ind); });
      var lo = Math.floor((Math.min.apply(null, vals) - 4) / 10) * 10, hi = 100;
      var first = {};
      pairs.forEach(function (p, j) { if (first[p.id] == null) { first[p.id] = j; } });
      var vert = R.w / n < 150;
      var bg = S.laneLayout(recs, { x: 40, y: 120, w: W - 80, h: H - 200 }, -6, D.span + 6, "h", {});
      var geo = [];
      var P;
      if (!vert) {
        P = { x: R.x + 46, y: R.y + 34, w: R.w - 54, h: R.h - 34 - 118 };
        pairs.forEach(function (p, j) {
          var cx = P.x + (j + 0.5) * P.w / n;
          geo.push({ ix: cx - 10, iy: P.y + P.h - (p.ind - lo) / (hi - lo) * P.h, lx: cx + 10, ly: P.y + P.h - (p.lab - lo) / (hi - lo) * P.h, cx: cx });
        });
      } else {
        P = { x: R.x + 6, y: R.y + 28, w: R.w - 12, h: R.h - 28 };
        var rowH = P.h / n;
        pairs.forEach(function (p, j) {
          var yy = P.y + j * rowH + rowH * 0.55;
          var ix = P.x + (p.ind - lo) / (hi - lo) * P.w, lx = P.x + (p.lab - lo) / (hi - lo) * P.w;
          var close = Math.abs(ix - lx) < 12;
          geo.push({ ix: ix, iy: yy - (close ? 5 : 0), lx: lx, ly: yy + (close ? 5 : 0), cy: yy, rowH: rowH });
        });
      }
      for (var i = 0; i < N; i++) {
        var j = first[recs[i].id];
        if (j != null) { setT(i, geo[j].ix, geo[j].iy, 1.9, 1, 0); }
        else { setT(i, bg.pos[i].x, bg.pos[i].y, 0.7, 0.07, 0); }
      }
      return function (ctx, k) {
        ctx.save();
        ctx.lineWidth = 1;
        /* axis */
        ctx.font = "500 11px " + FONT.mono; ctx.fillStyle = C.ink2; ctx.strokeStyle = C.star;
        for (var v = lo; v <= hi; v += 10) {
          ctx.globalAlpha = 0.11 * k;
          ctx.beginPath();
          if (!vert) { var yy = P.y + P.h - (v - lo) / (hi - lo) * P.h; ctx.moveTo(P.x, yy + 0.5); ctx.lineTo(P.x + P.w, yy + 0.5); ctx.stroke(); ctx.globalAlpha = 0.85 * k; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(String(v), P.x - 8, yy); }
          else { var xx = P.x + (v - lo) / (hi - lo) * P.w; ctx.moveTo(xx + 0.5, P.y); ctx.lineTo(xx + 0.5, P.y + P.h); ctx.stroke(); ctx.globalAlpha = 0.85 * k; ctx.textAlign = v === hi ? "right" : "center"; ctx.textBaseline = "bottom"; ctx.fillText(String(v), xx, P.y - 4); }
        }
        ctx.globalAlpha = k; ctx.fillStyle = C.star; ctx.font = "600 13px " + FONT.display; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        if (!vert) { ctx.fillText("Score, " + lo + " to " + hi + ". The axis starts at " + lo + ", not zero.", P.x - 46, P.y - 14); }
        else { ctx.fillText("Score, " + lo + " to " + hi + " (axis starts at " + lo + ")", P.x, P.y - 20); }
        pairs.forEach(function (p, j) {
          var g = geo[j], r = D.byId[p.id];
          /* the pair's tether */
          ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = C.star; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(g.ix, g.iy); ctx.lineTo(g.lx, g.ly); ctx.stroke();
          /* a second pair for the same release draws its own independent star */
          if (first[p.id] !== j) { S.drawStar(ctx, g.ix, g.iy, r, { s: 1.9 * k, a: k, halo: 0, lab: false }); }
          ctx.globalAlpha = k; ctx.strokeStyle = C.lab; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(g.lx, g.ly, 5.5, 0, Math.PI * 2); ctx.stroke();
          var gap = (p.gap > 0 ? "+" : "") + p.gap.toFixed(1);
          ctx.fillStyle = C.star; ctx.font = "600 12px " + FONT.mono;
          if (!vert) {
            ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(gap, g.lx + 12, Math.min(g.ly, g.iy) - 2);
            var ty = P.y + P.h + 22;
            ctx.textAlign = "center"; ctx.textBaseline = "top";
            ctx.font = "600 14px " + FONT.display; ctx.fillText(p.model, g.cx, ty);
            ctx.font = "500 12px " + FONT.display; ctx.fillStyle = C.ink2; ctx.fillText(p.benchLabel, g.cx, ty + 20);
            ctx.fillStyle = "#E2B46A"; ctx.fillText("lab: " + p.labSet, g.cx, ty + 44);
            ctx.fillStyle = "#86D0E0"; ctx.fillText("Epoch: " + p.indSet, g.cx, ty + 62);
          } else {
            ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.font = "600 12px " + FONT.display;
            ctx.fillText(p.model + ", " + p.benchLabel, P.x, g.cy - 12);
            ctx.textAlign = "right"; ctx.font = "600 12px " + FONT.mono;
            ctx.fillText(gap, P.x + P.w, g.cy - 12);
            ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.font = "500 11px " + FONT.display;
            ctx.fillStyle = "#E2B46A"; ctx.fillText("lab: " + p.labSet, P.x, g.cy + 10);
            ctx.fillStyle = "#86D0E0"; ctx.textAlign = "right"; ctx.fillText("Epoch: " + p.indSet, P.x + P.w, g.cy + 10);
          }
        });
        ctx.restore();
      };
    };

    SCN.refused = function (f) { return SCN.sky(f); };

    var LABELS = {
      sky: "The release sky: one lane per lab, one star per release, time left to right.",
      cadence: "Releases per month as stacked stars, one column per month. The table at the end of the chapter has the yearly counts.",
      orbits: "Twelve lab systems. Releases on the outer ring in date order; four inner orbits for system card, model card, usage policy and paper. Solid arcs are links on record, gaps are not disclosed, dotted arcs are not yet researched.",
      climb: "Independent benchmark scores over time, each release a star at its score with a trail to the axis, and a line for the highest score so far.",
      binaries: "Six pairs of scores: the lab's own report as an amber ring and Epoch's measurement as an ice star, with the gap and settings.",
      refused: "The release sky with the three refused comparisons marked."
    };

    function go(name, f, instant) {
      var key = name + JSON.stringify(f || {});
      if (key === sceneName && !instant) { return; }
      sceneName = key;
      for (var i = 0; i < N; i++) { from.x[i] = cur.x[i]; from.y[i] = cur.y[i]; from.s[i] = cur.s[i]; from.a[i] = cur.a[i]; from.h[i] = cur.h[i]; }
      oldOv = newOv;
      scene = name; focus = f || {};
      newOv = SCN[name](focus);
      cv.setAttribute("aria-label", LABELS[name]);
      dur = instant || RM ? 0 : (oldOv ? 1300 : 0);
      tStart = performance.now();
      if (!raf) { raf = requestAnimationFrame(frame); }
    }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function frame(now) {
      raf = 0;
      var p = dur ? Math.min(1, (now - tStart) / dur) : 1;
      for (var i = 0; i < N; i++) {
        var q = dur ? ease(Math.max(0, Math.min(1, (p - del[i]) / 0.78))) : 1;
        cur.x[i] = from.x[i] + (to.x[i] - from.x[i]) * q;
        cur.y[i] = from.y[i] + (to.y[i] - from.y[i]) * q;
        cur.s[i] = from.s[i] + (to.s[i] - from.s[i]) * q;
        cur.a[i] = from.a[i] + (to.a[i] - from.a[i]) * q;
        cur.h[i] = from.h[i] + (to.h[i] - from.h[i]) * q;
      }
      draw(p);
      if (p < 1) { raf = requestAnimationFrame(frame); }
    }
    var lastP = 1;
    function draw(p) {
      if (p == null) { p = lastP; } lastP = p;
      ctx.clearRect(0, 0, W, H);
      var ko = oldOv && p < 1 ? Math.max(0, 1 - p * 2.2) : 0, kn = dur ? Math.max(0, Math.min(1, (p - 0.4) / 0.6)) : 1;
      if (ko > 0) { oldOv(ctx, ko); }
      newOv(ctx, kn);
      for (var i = 0; i < N; i++) {
        S.drawStar(ctx, cur.x[i], cur.y[i], recs[i], { s: cur.s[i], a: cur.a[i], halo: cur.h[i], sel: i === mark, lab: scene !== "binaries" });
      }
    }
    function layout() {
      W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) { return; }
      ctx = S.fit(cv, W, H); R = region();
      var name = scene || "sky", f = focus;
      sceneName = ""; oldOv = null;
      newOv = SCN[name](f);
      for (var i = 0; i < N; i++) { cur.x[i] = to.x[i]; cur.y[i] = to.y[i]; cur.s[i] = to.s[i]; cur.a[i] = to.a[i]; cur.h[i] = to.h[i]; }
      sceneName = name + JSON.stringify(f || {});
      draw(1);
    }

    layout();
    scene = "sky"; go("sky", {}, true);
    new ResizeObserver(function () { layout(); }).observe(cv);

    /* the step whose card crosses the trigger line sets the scene */
    var io;
    function observe() {
      if (io) { io.disconnect(); }
      var line = window.innerWidth < 1000 ? "-60% 0px -39.5% 0px" : "-50% 0px -49.5% 0px";
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) { return; }
          var st = steps.filter(function (s) { return s.card === e.target || s.el === e.target; })[0];
          if (!st) { return; }
          steps.forEach(function (s) { s.el.classList.toggle("is-active", s === st); });
          go(st.scene, st.focus);
        });
      }, { rootMargin: line });
      steps.forEach(function (s) { io.observe(s.el); });
    }
    observe();
    var lastWide = window.innerWidth >= 1000;
    window.addEventListener("resize", function () { var w = window.innerWidth >= 1000; if (w !== lastWide) { lastWide = w; observe(); } });
    interact(cv, {
      points: function () { var a = []; for (var i = 0; i < N; i++) { a.push(cur.a[i] > 0.15 ? { x: cur.x[i], y: cur.y[i] } : null); } return a; },
      ok: null, live: $("#sky-live"),
      mark: function (i) { mark = i; if (!raf) { draw(); } }
    });
    void visible;
  }

  /* ---------------- findings ---------------- */
  function findings() {
    var p = F.pulse, first = p[0], cur = p[p.length - 1];
    var prev = p.length > 1 ? p[p.length - 2] : first;
    var w = F.waits[0];
    function fig(a, b) { return '<p class="fig">' + a + '<span class="to">to</span>' + b + "</p>"; }
    var items = [
      { fig: fig(first.releases, prev.releases), h: "Releases per year",
        p: first.releases + " releases in " + first.year + ", " + prev.releases + " in " + prev.year + ". " + esc(cur.body.split(". ").slice(0, 2).join(". ")) + ".",
        a: "#ch-cadence", al: "See the cadence" },
      { fig: fig(V.fmtNum(w.early), V.fmtNum(w.late) + " days"), h: esc(w.name) + ": the wait between releases",
        p: esc(w.body) + " " + F.waits.slice(1).map(function (x) { return esc(x.name) + ": about " + V.fmtNum(x.early) + " days, then about " + V.fmtNum(x.late) + "."; }).join(" "),
        a: "#ch-cadence", al: "See the cadence" },
      { fig: fig(F.capVals[0], F.capVals[F.capVals.length - 1]), h: "The highest independent GPQA Diamond score",
        p: "From " + F.D0 + " to " + F.D1 + ", the highest independent GPQA Diamond score " + (F.capVals[F.capVals.length - 1] > F.capVals[0] ? "rose" : "moved") +
          " from " + F.capVals[0] + " to " + F.capVals[F.capVals.length - 1] + ". Every independent score here is Epoch AI's measurement.",
        a: "#ch-scores", al: "See the climb" },
      { fig: fig(F.paper.p0 + "%", F.paper.p1 + "%"), h: esc(F.paper.head),
        p: "In " + F.D0 + ", " + F.paper.a0 + " of " + F.paper.n0 + " researched releases had a paper on record. In " + F.D1 + " so far, " + F.paper.a1 + " of " + F.paper.n1 + ". Papers can come out weeks after a release, so recent years may rise.",
        a: "#ch-disclosure", al: "See the orbits" },
      { fig: fig(F.syscard.p0 + "%", F.syscard.p1 + "%"), h: F.syscard.dir === "rose" ? "More arrive with a system card" : "Releases with a system card",
        p: "Of researched releases, " + F.syscard.a0 + " of " + F.syscard.n0 + " had a system card in " + F.D0 + ", and " + F.syscard.a1 + " of " + F.syscard.n1 + " in " + F.D1 + " so far.",
        a: "#ch-disclosure", al: "See the orbits" },
      { fig: '<p class="fig">' + F.near + '<span class="to">of</span>' + F.pairs.length + "</p>", h: "Lab and Epoch pairs within a point",
        p: F.near + " of the " + F.pairs.length + " pairs sit within a single point, and the gaps run both ways. With so few pairs this is not a test of whether labs overstate.",
        a: "#ch-pairs", al: "See the pairs" }
    ];
    $("#flist").innerHTML = items.map(function (it) {
      return "<li>" + it.fig + '<h3><a href="' + it.a + '" title="' + it.al + ' in the story above">' + it.h + "</a></h3><p>" + it.p + "</p></li>";
    }).join("");
  }

  function footer() {
    var el2 = $("#foot-update"), m = D.meta;
    var txt = "Last successful update: " + esc(m.last_successful_update) + ".";
    var age = Math.floor((Date.now() - Date.parse(m.last_successful_update + "T00:00:00Z")) / 86400000);
    if (age > 3) {
      txt += ' <span class="stale">This record is ' + age + " days old: no new entries have been approved since " + esc(m.last_successful_update) +
        ". New releases wait in a review queue until a person approves them.</span>";
    }
    el2.innerHTML = txt;
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) { return Promise.resolve(); }
    var t = new Promise(function (r) { setTimeout(r, 1500); });
    return Promise.race([Promise.all([
      document.fonts.load('500 13px "Mona Sans"'), document.fonts.load('600 14px "Mona Sans"'), document.fonts.load('500 11px "Martian Mono"')
    ]), t]);
  }

  V.load().then(function (data) {
    D = data; recs = D.recs; N = recs.length; F = D.findings; firstDay = S.firstDays(recs);
    var rel = D.views.tiles.releases_recorded;
    $("#lede").innerHTML = "Each point of light is one of <b>" + rel + "</b> releases from " + V.nword(V.ORGS.length) +
      " tracked labs, with its sources, its disclosures and its scores.";
    footer();
    findings();
    var steps = buildSteps();
    return fontsReady().then(function () {
      drawKey(); Hero(); Stage(steps); Recent();
      S.rise(".flist li, .door-grid > *");
    });
  }).catch(function (err) {
    var m = document.createElement("p");
    m.className = "load-error";
    m.textContent = "The record could not be loaded in this session (" + (err && err.message ? err.message : "unknown error") + "). Reloading the page retries.";
    document.querySelector(".hero-copy").appendChild(m);
    if (window.console) { console.warn(err); }
  });
})();
