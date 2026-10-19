/* Observatory prose page: a specimen from the live record beside each rule.
   Every example and count is read from data/ at load time. */
(function () {
  "use strict";
  var V = window.VCO, S = window.VCOSky, C = S.C, esc = V.esc;
  var $ = function (s) { return document.querySelector(s); };

  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }
  function body(id) { return $("#" + id + " .spec-body"); }

  S.rise(".prose, .specimen, .read-more");
  V.load().then(function (D) {
    var F = D.findings, recs = D.recs;

    /* rule 1: one release scored both ways, each score with its tag and source */
    var p = F.pairs[0];
    if (p) {
      body("spec-1").innerHTML = '<p class="spec-title">' + esc(p.model) + '</p><p class="spec-sub">' + esc(p.benchLabel) + ", " + esc(p.date) + "</p>" +
        '<canvas class="spec-canvas" id="c1" role="img" aria-label="A binary star: the lab\'s score as an amber ring, Epoch\'s as an ice star."></canvas>' +
        '<ul class="spec-rows"><li><span class="spec-val">' + esc(p.lab) + '</span><span><a href="' + esc(p.labUrl) + '" rel="external">' + S.provTag("LAB_REPORTED") +
        "</a> " + esc(host(p.labUrl)) + "</span></li>" +
        '<li><span class="spec-val">' + esc(p.ind) + '</span><span><a href="' + esc(p.indUrl) + '" rel="external">' + S.provTag("INDEPENDENT") + "</a> " + esc(host(p.indUrl)) + "</span></li></ul>" +
        '<p class="spec-note"><a href="./explorer.html#' + esc(p.id) + '">Open this entry</a></p>';
      var cv = $("#c1"), W = cv.clientWidth, H = cv.clientHeight, ctx = S.fit(cv, W, H);
      var lo = Math.floor(Math.min(p.lab, p.ind) / 10) * 10 - 10, hi = 100;
      function x(v) { return 18 + (v - lo) / (hi - lo) * (W - 36); }
      ctx.strokeStyle = C.star; ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.moveTo(18, H / 2); ctx.lineTo(W - 18, H / 2); ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.font = "500 11px " + S.FONT.mono; ctx.fillStyle = C.ink2; ctx.textAlign = "center";
      [lo, hi].forEach(function (v) { ctx.fillText(String(v), x(v), H / 2 + 26); });
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x(p.ind), H / 2); ctx.lineTo(x(p.lab), H / 2); ctx.stroke(); ctx.globalAlpha = 1;
      S.drawStar(ctx, x(p.ind), H / 2, D.byId[p.id], { s: 2.2, halo: 0, lab: false });
      ctx.strokeStyle = C.lab; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x(p.lab), H / 2, 7, 0, Math.PI * 2); ctx.stroke();
    }

    /* rule 2: the newest entry whose halo holds all three states */
    var pick = null;
    for (var i = recs.length - 1; i >= 0 && !pick; i--) {
      var st = {}; V.SLOTS.forEach(function (s) { st[recs[i].disc[s[0]]] = 1; });
      if (st.on && st.nd && st.nr && recs[i].release) { pick = recs[i]; }
    }
    var cnt = D.views.disclosure_matrix.counts, tot = { d: 0, n: 0, r: 0 };
    Object.keys(cnt).forEach(function (k) { tot.d += cnt[k].disclosed; tot.n += cnt[k].not_disclosed; tot.r += cnt[k].not_researched; });
    if (pick) {
      var rows = V.SLOTS.map(function (s) {
        return '<li class="d-' + pick.disc[s[0]] + '"><span class="dmark" aria-hidden="true"></span>' + V.cap(s[1]) + ": " + S.DISC_WORD[pick.disc[s[0]]] + "</li>";
      }).join("");
      body("spec-2").innerHTML = '<p class="spec-title">' + esc(pick.name) + '</p><p class="spec-sub">' + esc(V.ORG_NAMES[pick.org]) + ", " + esc(pick.date) + "</p>" +
        '<canvas class="spec-canvas" id="c2" role="img" aria-label="This release\'s star with its four-part halo."></canvas><ul class="spec-rows">' + rows + "</ul>" +
        '<p class="spec-note">Across the four documents and every release on record: ' + tot.d + " links on record, " + tot.n + " not disclosed, " + tot.r + " not yet researched.</p>";
      var c2 = $("#c2"), w2 = c2.clientWidth, h2 = c2.clientHeight, x2 = S.fit(c2, w2, h2);
      S.drawStar(x2, w2 / 2, h2 / 2, pick, { s: 6, halo: 1 });
    }

    /* rule 3: a refused comparison, with its reason, beside the count of computed ones */
    var rf = F.refused[F.refused.length - 1];
    if (rf) {
      var pr = D.byId[rf.id] && D.byId[rf.id].e.predecessor ? D.byId[D.byId[rf.id].e.predecessor] : null;
      body("spec-3").innerHTML = '<p class="spec-title">' + esc(rf.model) + '</p><p class="spec-sub">' + esc(V.ORG_NAMES[rf.org] || rf.org) + ", " + esc(rf.date) + "</p>" +
        '<p class="spec-note" style="color:var(--ink);font-size:16px">No comparable measurement against the predecessor' + (pr ? " (" + esc(pr.name) + ")" : "") +
        ". Reason on record: " + esc(rf.reason) + ".</p>" +
        '<p class="spec-note">The published file holds ' + F.deltaCount + " computed comparisons and " + F.refused.length + " refused ones.</p>" +
        '<p class="spec-note"><a href="./explorer.html#' + esc(rf.id) + '">Open this entry</a></p>';
    }

    /* rule 4: the versions on record and how many scores each holds */
    var ser = D.views.trajectory.series, by = {};
    ser.forEach(function (s) {
      var k = s.benchmark_name + "|" + s.benchmark_version;
      by[k] = by[k] || { name: s.benchmark_name, ver: s.benchmark_version, LAB_REPORTED: 0, INDEPENDENT: 0 };
      by[k][s.source_class] += s.points.length;
    });
    body("spec-4").innerHTML = '<ul class="spec-rows">' + Object.keys(by).map(function (k) {
      var b = by[k];
      return '<li><span class="spec-val">' + (b.INDEPENDENT + b.LAB_REPORTED) + '</span><span><b style="color:var(--ink)">' + esc(b.name) + "</b>, version " + esc(b.ver) + ". " +
        b.INDEPENDENT + " " + S.provTag("INDEPENDENT") + " and " + b.LAB_REPORTED + " " + S.provTag("LAB_REPORTED") + " scores.</span></li>";
    }).join("") + '</ul><p class="spec-note">Scores on record per benchmark version. The charts draw each version on its own axis.</p>';

    var m = D.meta;
    $("#foot-update").textContent = "Last successful update: " + m.last_successful_update + ".";
  }).catch(function () {
    [].forEach.call(document.querySelectorAll(".spec-body"), function (el) { el.textContent = "The record could not be loaded in this session."; });
  });
})();
