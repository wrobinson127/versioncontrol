/* Control Room prose page: the methodology's four rules, each beside a
   note counted from the record when the page loads. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc, $ = CR.$, $$ = CR.$$;
  CR.initShell();

  /* the table of contents marks the rule in view */
  if ("IntersectionObserver" in window) {
    var links = $$(".toc a");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { if (a.getAttribute("href") === "#" + en.target.id) { a.setAttribute("aria-current", "location"); } else { a.removeAttribute("aria-current"); } });
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    $$(".rule").forEach(function (s) { io.observe(s); });
  }

  function note(id, html) { $("#" + id + " .rn-b").outerHTML = html; }

  CR.load().then(function (D) {
    CR.addRecordToPalette(D, function (o) { location.href = "explorer.html?lab=" + o; }, function (e) { location.href = "explorer.html?id=" + encodeURIComponent(e.id); });

    /* rule 1 */
    var ind = 0, lab = 0, full = 0, all = 0;
    D.entries.forEach(function (e) {
      (e.benchmarks || []).forEach(function (b) {
        var p = b.provenance || {};
        all++;
        if (p.source_class === "INDEPENDENT") { ind++; } else if (p.source_class === "LAB_REPORTED") { lab++; }
        if (p.source_url && p.benchmark_name && p.benchmark_version && p.retrieval_date) { full++; }
      });
    });
    note("n1", '<div class="rn-b"><p class="rn-big"><span class="num">' + all + '</span> scores</p><ul class="rn-list">' +
      "<li>" + CR.provTag("INDEPENDENT", null, null) + ' <span class="num">' + ind + "</span> measured by Epoch AI</li>" +
      "<li>" + CR.provTag("LAB_REPORTED", null, null) + ' <span class="num">' + lab + "</span> reported by the lab</li></ul>" +
      '<p class="rn-s"><span class="num">' + full + "</span> of " + all + " carry a source URL, a benchmark name and version, and a retrieval date.</p></div>");

    /* rule 2 */
    var c = CR.discCounts(D.releases, "system_card");
    note("n2", '<div class="rn-b"><p class="rn-s">System cards, across ' + D.releases.length + " releases:</p><ul class=\"rn-list\">" +
      "<li>" + CR.discGlyph("disclosed", 10) + ' <span class="num">' + c.disclosed + "</span> link on record</li>" +
      "<li>" + CR.discGlyph("not_disclosed", 10) + ' <span class="num">' + c.not_disclosed + "</span> not disclosed</li>" +
      "<li>" + CR.discGlyph("not_researched", 10) + ' <span class="num">' + c.not_researched + "</span> not yet researched</li></ul>" +
      '<p class="rn-s">The share counts only the ' + c.researched + ' researched: <b class="num">' + Math.round(100 * c.share) + "%</b>. Not yet researched is never a zero.</p></div>");

    /* rule 3 */
    var refused = [];
    Object.keys(D.deltas).forEach(function (id) { D.deltas[id].forEach(function (d) { if (d.kind === "REFUSED_COMPARISON") { refused.push({ e: D.byId[id], r: d.reason }); } }); });
    note("n3", '<div class="rn-b"><p class="rn-big"><span class="num">' + D.meta.delta_chips + '</span> changes</p><p class="rn-s">against a predecessor are on record. ' + CR.plural(refused.length, "comparison was", "comparisons were") + " refused:</p><ul class=\"rn-list rn-ref\">" +
      refused.map(function (x) { return '<li><a href="explorer.html?id=' + encodeURIComponent(x.e.id) + '">' + esc(x.e.model_name) + '</a><span class="t-m">' + esc(x.r) + "</span></li>"; }).join("") + "</ul></div>");

    /* rule 4 */
    var eras = D.views.trajectory.eras;
    note("n4", '<div class="rn-b"><p class="rn-s">Two benchmarks, each held to one version:</p><ul class="rn-list">' +
      Object.keys(eras).map(function (k) {
        var e = eras[k][0];
        var n = 0; D.entries.forEach(function (x) { (x.benchmarks || []).forEach(function (b) { if (b.benchmark === k) { n++; } }); });
        return '<li><b>' + esc(CR.BENCH[k] || k) + '</b><span class="t-m">version "' + esc(e.version) + '", ' + n + " scores, from " + esc(e.start) + "</span></li>";
      }).join("") + "</ul></div>");
    document.documentElement.classList.add("ready");
  }).catch(function () {
    $$(".rule-note").forEach(function (n) { n.hidden = true; });
  });
})();
