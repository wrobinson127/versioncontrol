/* Observatory: the star glyph, the lane layout and the record card.
   Shared by the landing page and the explorer.

   The glyph (read the legend on each page):
   - core: one release. Bigger and lit in ice when an independent (IND) score is on record.
   - amber companion ring: the lab reported its own (LAB) score.
   - halo, four quarter arcs, clockwise from twelve o'clock: system card, model card,
     usage policy, paper. Solid arc = link on record. Dashed arc = not disclosed
     (we checked, none found). A single faint dot = not yet researched.
   - a revision (same model name, updated) is a small hollow ring with no core. */
(function () {
  "use strict";
  var V = window.VCO;

  var C = {
    ground: "#0D0B09",
    star: "#EAE8E5",
    starRGB: "234,232,229",
    ind: "#2FA3BF", indRGB: "47,163,191", indLight: "150,216,232",
    lab: "#C2852F", labRGB: "194,133,47", labLight: "226,180,106",
    ink2: "#B8AFA2", ink3: "#9A9184"
  };
  var FONT = { display: '"Mona Sans", system-ui, sans-serif', mono: '"Martian Mono", ui-monospace, monospace' };

  /* glow sprites: a radial falloff drawn once per colour, stamped with drawImage */
  var sprites = {};
  function sprite(rgb) {
    if (sprites[rgb]) { return sprites[rgb]; }
    var s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    var g = c.getContext("2d"), grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, "rgba(" + rgb + ",0.55)");
    grad.addColorStop(0.25, "rgba(" + rgb + ",0.22)");
    grad.addColorStop(0.6, "rgba(" + rgb + ",0.05)");
    grad.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
    sprites[rgb] = c;
    return c;
  }

  var Q = [["system_card", 0], ["model_card", 1], ["usage_policy", 2], ["paper", 3]];

  /* draw one star. o: {s: scale, a: alpha, halo: 0..1, flare: 0..1, glow: bool, sel: bool} */
  function drawStar(ctx, x, y, rec, o) {
    var s = o.s == null ? 1 : o.s, a = o.a == null ? 1 : o.a;
    if (a <= 0.01 || s <= 0.01) { return; }
    var flare = o.flare || 0;
    var core = (rec.hasInd ? 2.5 : 1.55) * s;
    if (!rec.release) {
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = C.star; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.4, 1.7 * s), 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (o.glow !== false && (rec.hasInd || flare > 0)) {
      var gr = (rec.hasInd ? 9 : 6) * s * (1 + flare * 0.9);
      ctx.globalAlpha = a * (rec.hasInd ? 0.9 : 0.5 * flare);
      ctx.drawImage(sprite(rec.hasInd ? C.indLight : C.starRGB), x - gr, y - gr, gr * 2, gr * 2);
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = C.star;
    ctx.beginPath(); ctx.arc(x, y, core * (1 + flare * 0.35), 0, 6.2832); ctx.fill();
    if (rec.hasLab && o.lab !== false) {
      var d = core + 2.6 * s;
      ctx.strokeStyle = C.lab; ctx.lineWidth = Math.max(1, 1.1 * s);
      ctx.beginPath(); ctx.arc(x + d * 0.75, y - d * 0.75, Math.max(1.5, 1.6 * s), 0, 6.2832); ctx.stroke();
    }
    var h = o.halo == null ? 1 : o.halo;
    if (h > 0.02) { drawHalo(ctx, x, y, rec, core + 3.2 * Math.max(0.8, s), a * h, s); }
    if (o.sel) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = C.star; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, core + 10 * Math.max(0.8, s), 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawHalo(ctx, x, y, rec, R, a, s) {
    var gap = 0.2;
    for (var i = 0; i < 4; i++) {
      var st = rec.disc[Q[i][0]];
      var a0 = -Math.PI / 2 + i * Math.PI / 2 + gap, a1 = -Math.PI / 2 + (i + 1) * Math.PI / 2 - gap;
      if (st === "on") {
        ctx.globalAlpha = a * 0.9; ctx.setLineDash([]);
        ctx.strokeStyle = C.star; ctx.lineWidth = Math.max(1, 1.15 * s);
        ctx.beginPath(); ctx.arc(x, y, R, a0, a1); ctx.stroke();
      } else if (st === "nd") {
        ctx.globalAlpha = a * 0.75;
        ctx.strokeStyle = C.ink3; ctx.lineWidth = Math.max(0.9, 1 * s);
        var seg = R * (a1 - a0);
        var dl = Math.max(1.2, seg / 5);
        ctx.setLineDash([dl, dl]);
        ctx.beginPath(); ctx.arc(x, y, R, a0, a1); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        var am = (a0 + a1) / 2;
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = C.ink3;
        ctx.beginPath(); ctx.arc(x + Math.cos(am) * R, y + Math.sin(am) * R, Math.max(0.7, 0.8 * s), 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- lane layout ----
     rect: {x,y,w,h}; orient "h" (time left to right, lanes stacked) or "v"
     (time top to bottom, lanes side by side). d0,d1: day range shown.
     Returns positions keyed by record index plus the geometry. */
  function laneLayout(recs, rect, d0, d1, orient, opt) {
    opt = opt || {};
    var n = V.ORGS.length;
    var along = orient === "h" ? rect.w : rect.h;
    var across = orient === "h" ? rect.h : rect.w;
    var laneW = across / n;
    var k = along / Math.max(1, d1 - d0);
    var pos = new Array(recs.length);
    var minSep = opt.minSep || 7;
    var last = {};
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      var t = (r.day - d0) * k;
      var laneC = (r.lane + 0.5) * laneW;
      var off = 0;
      /* releases on nearly the same day in one lane step sideways in turn */
      var L = last[r.lane];
      if (L && t - L.t < minSep) { L.n += 1; off = ((L.n % 3) === 1 ? -1 : (L.n % 3) === 2 ? 1 : 0) * laneW * 0.24; }
      else { last[r.lane] = { t: t, n: 0 }; }
      if (orient === "h") { pos[i] = { x: rect.x + t, y: rect.y + laneC + off }; }
      else { pos[i] = { x: rect.x + laneC + off, y: rect.y + t }; }
    }
    return { pos: pos, laneW: laneW, k: k, d0: d0, d1: d1, rect: rect, orient: orient };
  }

  /* lane guides, year meridians, lane names */
  function drawLaneFrame(ctx, L, t0, firstDay, opt) {
    opt = opt || {};
    var a = opt.alpha == null ? 1 : opt.alpha;
    var R = L.rect, n = V.ORGS.length;
    ctx.save();
    /* lanes light up from each lab's first release */
    for (var i = 0; i < n; i++) {
      var f = firstDay[V.ORGS[i]];
      if (f == null) { continue; }
      var s = Math.max(0, (f - L.d0) * L.k);
      ctx.globalAlpha = 0.11 * a;
      ctx.strokeStyle = C.star; ctx.lineWidth = 1;
      ctx.beginPath();
      if (L.orient === "h") {
        var yy = R.y + (i + 0.5) * L.laneW;
        ctx.moveTo(R.x + s, yy); ctx.lineTo(R.x + R.w, yy);
      } else {
        var xx = R.x + (i + 0.5) * L.laneW;
        ctx.moveTo(xx, R.y + s); ctx.lineTo(xx, R.y + R.h);
      }
      ctx.stroke();
    }
    /* year meridians */
    var y0 = +V.isoOf(t0 + L.d0).slice(0, 4), y1 = +V.isoOf(t0 + L.d1).slice(0, 4);
    ctx.font = "500 11px " + FONT.mono;
    for (var y = y0; y <= y1 + 1; y++) {
      var d = V.dayNum(y + "-01-01") - t0;
      if (d < L.d0 || d > L.d1) { continue; }
      var p = (d - L.d0) * L.k;
      ctx.globalAlpha = 0.12 * a; ctx.strokeStyle = C.star;
      ctx.beginPath();
      if (L.orient === "h") { ctx.moveTo(R.x + p, R.y - 6); ctx.lineTo(R.x + p, R.y + R.h); }
      else { ctx.moveTo(R.x - 6, R.y + p); ctx.lineTo(R.x + R.w, R.y + p); }
      ctx.stroke();
      ctx.globalAlpha = 0.85 * a; ctx.fillStyle = C.ink2;
      if (L.orient === "h") { ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(String(y), R.x + p + 4, R.y - 6); }
      else { ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(String(y), R.x - 8, R.y + p); }
    }
    /* lane names */
    if (opt.labels !== false) {
      ctx.globalAlpha = 0.95 * a; ctx.fillStyle = C.ink2;
      if (L.orient === "h") {
        ctx.font = "500 " + (opt.labelSize || 13) + "px " + FONT.display;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (var j = 0; j < n; j++) { ctx.fillText(V.SHORT_NAMES[V.ORGS[j]], R.x - 14, R.y + (j + 0.5) * L.laneW); }
      } else {
        ctx.font = "500 " + (opt.labelSize || 11) + "px " + FONT.display;
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        for (var m = 0; m < n; m++) {
          ctx.save();
          ctx.translate(R.x + (m + 0.5) * L.laneW, R.y - 10);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(V.SHORT_NAMES[V.ORGS[m]], 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  function firstDays(recs) {
    var f = {};
    recs.forEach(function (r) { if (f[r.org] == null || r.day < f[r.org]) { f[r.org] = r.day; } });
    return f;
  }

  /* nearest star to a point, within a radius */
  function nearest(points, x, y, maxD, filter) {
    var best = -1, bd = maxD * maxD;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (!p || (filter && !filter(i))) { continue; }
      var dx = p.x - x, dy = p.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /* the haze: every release splashes a wide, faint glow, so the sky is
     brightest where the record is densest. It is a smoothing of the real
     points, drawn once per layout at low resolution. */
  function nebula(recs, pts, W, H, rad) {
    var k = 0.5, c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
    var g = c.getContext("2d"), spr = sprite(C.starRGB), spi = sprite(C.indLight);
    g.globalCompositeOperation = "lighter";
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i]; if (!p) { continue; }
      var r = rad * k * (recs[i].hasInd ? 1.25 : 1);
      g.globalAlpha = recs[i].hasInd ? 0.07 : 0.05;
      g.drawImage(recs[i].hasInd ? spi : spr, p.x * k - r, p.y * k - r, r * 2, r * 2);
    }
    return c;
  }

  /* HiDPI canvas sizing */
  function fit(canvas, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* ---- words ---- */
  var DISC_WORD = { on: "on record", nd: "not disclosed", nr: "not yet researched" };

  function provTag(cls) {
    return cls === "LAB_REPORTED" ?
      '<span class="prov prov-lab"><span class="pmark" aria-hidden="true"></span>LAB</span>' :
      '<span class="prov prov-ind"><span class="pmark" aria-hidden="true"></span>IND</span>';
  }

  /* the short record shown on hover or tap */
  function cardHtml(rec) {
    var e = rec.e, esc = V.esc;
    var h = '<p class="tip-name">' + esc(e.model_name) + "</p>";
    h += '<p class="tip-meta">' + esc(V.ORG_NAMES[e.org] || e.org) + ", " + '<time datetime="' + esc(e.date) + '">' + esc(e.date) + "</time>" +
      (rec.release ? "" : ", revision") + "</p>";
    h += '<p class="tip-meta">' + esc(V.AVAIL_NAMES[e.availability_class] || e.availability_class) + "</p>";
    if (e.benchmarks && e.benchmarks.length) {
      h += '<ul class="tip-scores">';
      e.benchmarks.forEach(function (b) {
        var p = b.provenance || {};
        h += "<li><span>" + esc(p.benchmark_name || b.benchmark) + "</span><b>" + esc(b.value) + "</b>" + provTag(p.source_class) + "</li>";
      });
      h += "</ul>";
    } else {
      h += '<p class="tip-none">No benchmark score on record.</p>';
    }
    h += '<ul class="tip-disc">';
    V.SLOTS.forEach(function (s) {
      var st = rec.disc[s[0]];
      h += '<li class="d-' + st + '"><span class="dmark" aria-hidden="true"></span>' + s[1] + ": " + DISC_WORD[st] + "</li>";
    });
    h += "</ul>";
    return h;
  }

  function ariaLine(rec) {
    var e = rec.e;
    var parts = [e.model_name + ", " + (V.ORG_NAMES[e.org] || e.org) + ", " + e.date + (rec.release ? "" : ", revision")];
    (e.benchmarks || []).forEach(function (b) {
      parts.push((b.provenance.benchmark_name || b.benchmark) + " " + b.value + " " + (b.provenance.source_class === "LAB_REPORTED" ? "lab reported" : "independent"));
    });
    V.SLOTS.forEach(function (s) { parts.push(s[1] + " " + DISC_WORD[rec.disc[s[0]]]); });
    return parts.join(". ") + ".";
  }

  /* legend glyphs: the same drawStar the charts use */
  function drawKeys(size) {
    [].forEach.call(document.querySelectorAll(".kglyph"), function (cv) {
      var z = size || cv.width, ctx = fit(cv, z, z), k = cv.getAttribute("data-k"), m = z / 2;
      var fake = { release: true, hasInd: false, hasLab: false, disc: { system_card: "nr", model_card: "nr", usage_policy: "nr", paper: "nr" } };
      if (k === "ind") { fake.hasInd = true; drawStar(ctx, m, m, fake, { s: 1.3, halo: 0 }); }
      if (k === "lab") { fake.hasLab = true; drawStar(ctx, m - 3, m + 3, fake, { s: 1.6, halo: 0 }); }
      if (k === "halo") { fake.disc = { system_card: "on", model_card: "nd", usage_policy: "on", paper: "nr" }; drawStar(ctx, m, m, fake, { s: z / 18, halo: 1 }); }
      if (k === "rev") { fake.release = false; drawStar(ctx, m, m, fake, { s: 2.2 }); }
    });
  }

  /* settle each part into place as it scrolls in (transform only; never hidden) */
  function rise(sel) {
    if (!("IntersectionObserver" in window) || V.reducedMotion()) { return; }
    var els = [].slice.call(document.querySelectorAll(sel));
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el, i) { el.classList.add("rise"); el.style.transitionDelay = (i % 3) * 70 + "ms"; io.observe(el); });
  }

  window.VCOSky = {
    rise: rise,
    drawKeys: drawKeys,
    C: C, FONT: FONT, drawStar: drawStar, drawHalo: drawHalo, sprite: sprite, laneLayout: laneLayout,
    drawLaneFrame: drawLaneFrame, firstDays: firstDays, nebula: nebula, nearest: nearest, fit: fit,
    cardHtml: cardHtml, ariaLine: ariaLine, provTag: provTag, DISC_WORD: DISC_WORD
  };
})();
