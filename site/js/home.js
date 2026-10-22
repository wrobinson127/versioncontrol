/* The front door: a field of every release on record, one dot each, placed
   by date, that fills in from ChatGPT's launch to the latest entry; and three
   numbers counted from the published files when the page loads. Hover, tap
   or the arrow keys read a dot's model name and date; nothing else is
   interactive. With reduced motion the field is drawn whole at once. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc;
  CR.initShell();

  var fig = document.getElementById("field");
  var cv = document.getElementById("fcv");
  var ctx = cv.getContext("2d");
  var hit = document.getElementById("fhit");
  var tip = document.getElementById("ftip");
  var live = document.getElementById("flive");
  var years = document.getElementById("fyears");
  var reduce = CR.reducedMotion();
  var TAU = Math.PI * 2, DAY = 86400000;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DUR = 3400, GROW = 520;

  var C = {}, E = [], dots = [], W = 0, H = 0, DPR = 1, R = 3, t0 = 0, raf = 0, done = reduce, hot = -1, d0 = 0, d1 = 1;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ["accent", "accent-text", "text", "ground"].forEach(function (k) { C[k] = cs.getPropertyValue("--" + k).trim(); });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function day(d) { return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / DAY; }
  function longDate(d) { return +d.slice(8, 10) + " " + MONTHS[+d.slice(5, 7) - 1] + " " + d.slice(0, 4); }

  /* ---------- the three numbers, counted from the record ---------- */
  function takeaways(D) {
    var asOf = day(D.asOf);
    var lastYear = D.releases.filter(function (e) { var x = day(e.date); return x > asOf - 365 && x <= asOf; }).length;
    var every = lastYear ? 365 / lastYear : null;
    var sc = CR.discCounts(D.releases, "system_card");
    var pairs = CR.pairs(D).filter(function (p) { return p.e._rel; });
    var above = pairs.filter(function (p) { return p.lab.value > p.ind.value; }).length;
    var rows = [
      every === null ? null : [(every < 1.5 ? "1 day" : Math.round(every) + " days"), "between new models over the past year, on average."],
      sc.share === null ? null : [Math.round(sc.share * 100) + "%", "of the releases we checked came with a system card, the lab's safety report."],
      pairs.length ? [above + " of " + pairs.length, "lab-reported scores came in above the independent score on the same test."] : null
    ];
    rows.forEach(function (r, i) {
      var li = document.getElementById("tk" + (i + 1)).closest("li");
      if (!r) { li.hidden = true; return; }
      document.getElementById("tk" + (i + 1)).textContent = r[0];
      document.getElementById("tk" + (i + 1) + "l").textContent = r[1];
    });
  }

  /* ---------- the field ---------- */
  /* x is the date; y is free: each dot takes the spot, among a few candidate
     heights, farthest from the dots already placed, so the field stays even
     and its density follows the pace of releases */
  function layout() {
    var r = fig.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    R = clamp(W / 320, 2.4, 4.2);
    var padX = R * 2, top = R * 2.5, bot = H - 30;
    var span = Math.max(1, d1 - d0);
    dots = [];
    E.forEach(function (e, i) {
      var bx = padX + (day(e.date) - d0) / span * (W - 2 * padX), best = null, bestD = -1;
      for (var k = 0; k < 14; k++) {
        var x = clamp(bx + (hash(i * 31 + k) - 0.5) * R * 1.6, padX, W - padX);
        var y = top + hash(i * 17 + k * 7 + 3) * (bot - top);
        var m = Infinity;
        for (var j = dots.length - 1; j >= 0; j--) {
          var dx = x - dots[j].x;
          if (dx > 80) { break; }
          var dd = dx * dx + (y - dots[j].y) * (y - dots[j].y);
          if (dd < m) { m = dd; }
        }
        if (m > bestD) { bestD = m; best = [x, y]; }
      }
      dots.push({ x: best[0], y: best[1], e: e, at: (day(e.date) - d0) / span });
    });
    years.innerHTML = "";
    for (var y = +E[0].date.slice(0, 4) + 1; y <= +E[E.length - 1].date.slice(0, 4); y++) {
      var x = padX + (day(y + "-01-01") - d0) / span * (W - 2 * padX);
      years.insertAdjacentHTML("beforeend", '<span style="left:' + (x / W * 100).toFixed(3) + '%">' + y + "</span>");
    }
  }

  function draw() {
    raf = 0;
    var now = performance.now(), p = done ? 2 : (now - t0) / DUR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var more = false;
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i], k = done ? 1 : clamp((now - t0 - d.at * DUR) / GROW, 0, 1);
      if (k < 1) { more = true; }
      if (k <= 0) { continue; }
      var ek = 1 - Math.pow(1 - k, 3);
      var r = R * ek, al = hot < 0 || hot === i ? 1 : 0.34;
      if (hot === i) { r = R * 1.8; }
      ctx.globalAlpha = al;
      ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, TAU);
      ctx.fillStyle = k < 1 ? C["accent-text"] : C.accent;
      ctx.fill();
    }
    if (hot >= 0) {
      var h = dots[hot];
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(h.x, h.y, R * 1.8 + 3, 0, TAU);
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.text; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!done && (more || p < 1)) { raf = requestAnimationFrame(draw); } else { done = true; fig.setAttribute("data-drawn", dots.length); }
  }
  function schedule() { if (!raf) { raf = requestAnimationFrame(draw); } }

  /* ---------- reading a dot ---------- */
  function nearest(px, py, reach) {
    var best = -1, bd = reach * reach;
    dots.forEach(function (d, i) {
      var dd = (d.x - px) * (d.x - px) + (d.y - py) * (d.y - py);
      if (dd < bd) { bd = dd; best = i; }
    });
    return best;
  }
  function show(i, say) {
    if (i === hot) { return; }
    hot = i;
    if (i < 0) { tip.classList.remove("on"); schedule(); return; }
    var d = dots[i];
    tip.innerHTML = '<div class="t-h">' + esc(d.e.model_name) + '</div><div class="t-s">' + longDate(d.e.date) + "</div>";
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = clamp(d.x - tw / 2, 0, W - tw), y = d.y - th - R * 2 - 10;
    if (y < 0) { y = d.y + R * 2 + 10; }
    tip.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    tip.classList.add("on");
    if (say) { live.textContent = d.e.model_name + ", " + longDate(d.e.date) + ". " + (i + 1) + " of " + dots.length + "."; }
    schedule();
  }
  function local(ev) { var b = hit.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; }
  function onMove(ev) {
    if (!done) { return; }
    var p = local(ev);
    show(nearest(p[0], p[1], ev.pointerType === "mouse" ? 14 : 24), false);
  }
  function onKey(ev) {
    if (!done || !dots.length) { return; }
    var i = hot, n = dots.length;
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") { i = i < 0 ? 0 : Math.min(n - 1, i + 1); }
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") { i = i < 0 ? n - 1 : Math.max(0, i - 1); }
    else if (ev.key === "Home") { i = 0; }
    else if (ev.key === "End") { i = n - 1; }
    else if (ev.key === "Escape") { show(-1); return; }
    else { return; }
    ev.preventDefault();
    show(i, true);
  }

  /* ---------- boot ---------- */
  CR.load().then(function (D) {
    CR.addRecordToPalette(D);
    takeaways(D);
    E = D.releases.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id < b.id ? -1 : 1); });
    if (!E.length) { return; }
    d0 = day(E[0].date); d1 = Math.max(day(D.asOf), day(E[E.length - 1].date));
    readColors();
    layout();
    hit.setAttribute("aria-label", E.length + " releases from " + longDate(E[0].date) + " to " + longDate(E[E.length - 1].date) +
      ", one dot each, placed by date. The arrow keys move between releases.");
    hit.hidden = false;
    fig.classList.add("on");
    t0 = performance.now() + 200;
    schedule();
    hit.addEventListener("pointermove", onMove);
    hit.addEventListener("pointerdown", onMove);
    hit.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") { show(-1); } });
    document.addEventListener("pointerdown", function (ev) { if (!hit.contains(ev.target)) { show(-1); } });
    hit.addEventListener("keydown", onKey);
    hit.addEventListener("blur", function () { show(-1); });
    document.addEventListener("vc:theme", function () { readColors(); schedule(); });
    var rt = null, lastW = W;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (Math.abs(fig.getBoundingClientRect().width - lastW) < 2) { return; }
        show(-1); layout(); lastW = W; schedule();
      }, 160);
    });
  }).catch(function (err) {
    var p = document.createElement("p");
    p.className = "load-error";
    p.textContent = "The record could not be loaded in this session (" + (err && err.message ? err.message : "unknown error") + "). Reloading the page retries.";
    fig.appendChild(p);
    document.querySelector(".h-takes").hidden = true;
    if (window.console) { console.error(err); }
  });
})();
