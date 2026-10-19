/* The reading pages: methodology, about, data and changes. The approved text
   is in the page; this script adds what is counted from the record when the
   page loads (the notes beside the four rules, the per-year file rows, the
   citation dates, the record card, the lists of changes) and the table of
   contents' "you are here" mark. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc, $ = CR.$, $$ = CR.$$;
  CR.initShell();

  /* ---------- table of contents ---------- */

  var toc = $(".toc details");
  if (toc && window.innerWidth <= 1040) { toc.open = false; }
  if (toc && "IntersectionObserver" in window) {
    var links = $$(".toc a");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        var id = en.target.getAttribute("aria-labelledby");
        links.forEach(function (a) { if (a.getAttribute("href") === "#" + id) { a.setAttribute("aria-current", "location"); } else { a.removeAttribute("aria-current"); } });
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    $$(".doc-sec").forEach(function (s) { io.observe(s); });
    links.forEach(function (a) { a.addEventListener("click", function () { if (window.innerWidth <= 1040) { toc.open = false; } }); });
  }

  /* ---------- copy buttons (the citation box) ---------- */

  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var el = document.getElementById(b.getAttribute("data-copy"));
      if (el) { CR.copyText(el.textContent.replace(/\s+\n/g, "\n").trim(), b.textContent.replace("Copy ", "") + " copied"); }
    });
  });

  /* ---------- the data page: one row per year file, and today's dates ---------- */

  var today = new Date().toISOString().slice(0, 10);
  $$(".cite-accessed").forEach(function (el) { el.textContent = today; });

  function entryLink(e) {
    return '<a href="explorer.html?id=' + encodeURIComponent(e.id) + '">' + esc(e.model_name) + "</a> (" + esc(e._orgName) + ", " + '<span class="num">' + esc(e.date) + "</span>)";
  }

  CR.load().then(function (D) {
    CR.addRecordToPalette(D);
    var m = D.meta;
    $$(".cite-updated").forEach(function (el) { el.textContent = m.last_successful_update; });
    $$(".cite-year").forEach(function (el) { el.textContent = m.last_successful_update.slice(0, 4); });

    var rows = $("#file-rows");
    if (rows) {
      var anchor = rows.children[3];
      Object.keys(D.manifest.files || {}).sort().forEach(function (rel) {
        var short = rel.replace(/^data\//, "");
        var year = (short.match(/(\d{4})\.json\.gz$/) || [])[1] || "";
        var n = D.manifest.files[rel].count;
        var tr = document.createElement("tr");
        tr.innerHTML = '<td><a href="./data/' + esc(short) + '">' + esc(short) + "</a></td><td>Entries dated " + esc(year) + " (" + n + (n === 1 ? " entry)." : " entries).") + "</td>";
        rows.insertBefore(tr, anchor);
      });
    }

    methodologyNotes(D);
    aboutCard(D);
    changesLists(D);
    document.documentElement.classList.add("ready");
  }).catch(function () {
    $$(".rule-note, .rec-card").forEach(function (n) { n.hidden = true; });
    ["changes-corrections", "changes-retractions", "changes-added"].forEach(function (id) {
      var el = document.getElementById(id); if (el) { el.innerHTML = "<p>The dataset could not be loaded in this session.</p>"; }
    });
  });

  /* ---------- methodology: each rule beside its count in the record ---------- */

  function note(id, html) { var el = $("#n-" + id + " .rn-b"); if (el) { el.outerHTML = html; } }
  function methodologyNotes(D) {
    if (!$("#n-r1")) { return; }
    var ind = 0, lab = 0, full = 0, all = 0;
    D.entries.forEach(function (e) {
      (e.benchmarks || []).forEach(function (b) {
        var p = b.provenance || {};
        all++;
        if (p.source_class === "INDEPENDENT") { ind++; } else if (p.source_class === "LAB_REPORTED") { lab++; }
        if (p.source_url && p.benchmark_name && p.benchmark_version && p.retrieval_date) { full++; }
      });
    });
    note("r1", '<div class="rn-b"><p class="rn-big"><span class="num">' + all + '</span> scores</p><ul class="rn-list">' +
      "<li>" + CR.provTag("INDEPENDENT", null, null) + ' <span class="num">' + ind + "</span> measured by Epoch AI</li>" +
      "<li>" + CR.provTag("LAB_REPORTED", null, null) + ' <span class="num">' + lab + "</span> reported by the lab</li></ul>" +
      '<p class="rn-s"><span class="num">' + full + "</span> of " + all + " carry a source URL, a benchmark name and version, and a retrieval date.</p></div>");

    var c = CR.discCounts(D.releases, "system_card");
    var strip = D.releases.slice().reverse().map(function (e) { return CR.discGlyph(e._disc.system_card, 7); }).join("");
    note("r2", '<div class="rn-b"><p class="rn-s">System cards, across ' + D.releases.length + " releases, oldest first:</p>" +
      '<div class="rn-strip" aria-hidden="true">' + strip + '</div><ul class="rn-list">' +
      "<li>" + CR.discGlyph("disclosed", 10) + ' <span class="num">' + c.disclosed + "</span> link on record</li>" +
      "<li>" + CR.discGlyph("not_disclosed", 10) + ' <span class="num">' + c.not_disclosed + "</span> not disclosed</li>" +
      "<li>" + CR.discGlyph("not_researched", 10) + ' <span class="num">' + c.not_researched + "</span> not yet researched</li></ul>" +
      '<p class="rn-s">The share counts only the ' + c.researched + ' researched: <b class="num">' + Math.round(100 * c.share) + "%</b>. Not yet researched is never a zero.</p></div>");

    var refused = [];
    Object.keys(D.deltas).forEach(function (id) { D.deltas[id].forEach(function (d) { if (d.kind === "REFUSED_COMPARISON" && D.byId[id]) { refused.push({ e: D.byId[id], r: d.reason }); } }); });
    note("r3", '<div class="rn-b"><p class="rn-big"><span class="num">' + D.meta.delta_chips + '</span> changes</p><p class="rn-s">against a predecessor are on record. ' + CR.plural(refused.length, "comparison was", "comparisons were") + " refused:</p><ul class=\"rn-list rn-ref\">" +
      refused.map(function (x) { return '<li><a href="explorer.html?id=' + encodeURIComponent(x.e.id) + '">' + esc(x.e.model_name) + '</a><span class="t-m">' + esc(x.r) + "</span></li>"; }).join("") + "</ul></div>");

    var eras = D.views.trajectory.eras;
    note("r4", '<div class="rn-b"><p class="rn-s">Two benchmarks, each held to one version:</p><ul class="rn-list">' +
      Object.keys(eras).map(function (k) {
        var e = eras[k][0], n = 0;
        D.entries.forEach(function (x) { (x.benchmarks || []).forEach(function (b) { if (b.benchmark === k) { n++; } }); });
        return "<li><b>" + esc(CR.BENCH[k] || k) + '</b><span class="t-m">version "' + esc(e.version) + '", ' + n + " scores, from " + esc(e.start) + "</span></li>";
      }).join("") + "</ul></div>");
  }

  /* ---------- about: the record as it stands ---------- */

  function aboutCard(D) {
    var card = $("#rec-card");
    if (!card) { return; }
    var m = D.meta;
    $(".rn-b", card).outerHTML = '<dl>' +
      '<div><dt>Entries</dt><dd><span class="num">' + m.entry_count + "</span> (" + m.releases + " releases, " + m.revisions + " revisions)</dd></div>" +
      '<div><dt>Labs tracked</dt><dd><span class="num">' + CR.ORG_ORDER.length + "</span></dd></div>" +
      '<div><dt>First entry</dt><dd><span class="num">' + esc(m.first_date) + "</span></dd></div>" +
      '<div><dt>Newest entry</dt><dd><span class="num">' + esc(m.last_date) + "</span></dd></div>" +
      '<div><dt>Last successful update</dt><dd><span class="num">' + esc(m.last_successful_update) + "</span></dd></div>" +
      '</dl><p class="rn-s" style="margin-top:12px"><a href="explorer.html">Open the record in the explorer</a></p>';
  }

  /* ---------- changes: corrections, retractions, additions ---------- */

  function changesLists(D) {
    var corrEl = $("#changes-corrections");
    if (!corrEl) { return; }
    var all = D.entries;
    function firstRead(e) {
      var dates = (e.sources || []).map(function (s) { return s.retrieval_date; }).filter(Boolean).sort();
      return dates[0] || e.date;
    }
    var corrected = all.filter(function (e) { return e.correction_note; });
    corrEl.innerHTML = corrected.length ? corrected.map(function (e) {
      return '<div class="corr-item"><p class="corr-h"><span class="corr-tag">Correction</span>' + entryLink(e) + "</p><p>" + esc(e.correction_note) + "</p></div>";
    }).join("") : "<p>No corrections on record.</p>";

    var retracted = all.filter(function (e) { return e._retracted; });
    $("#changes-retractions").innerHTML = retracted.length ? retracted.map(function (e) {
      return '<div class="corr-item"><p class="corr-h"><span class="corr-tag">Retracted</span>' + entryLink(e) + "</p><p>" + esc(e.retraction_note || "") + "</p></div>";
    }).join("") : "<p>No entry has been retracted.</p>";

    var backfill = all.filter(function (e) { return e.origin === "backfill-epoch"; });
    var byDate = {};
    all.forEach(function (e) {
      if (e.origin === "backfill-epoch") { return; }
      var d = firstRead(e);
      (byDate[d] = byDate[d] || []).push(e);
    });
    var html = '<ul class="doc-list">';
    if (backfill.length) {
      html += "<li><b>Initial build</b>: " + backfill.length + " entries from Epoch AI's dataset, read " + esc(firstRead(backfill[0])) + ".</li>";
    }
    Object.keys(byDate).sort().reverse().forEach(function (d) {
      var list = byDate[d].sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      html += '<li><b class="num">' + esc(d) + "</b>: " + list.map(entryLink).join("; ") + ".</li>";
    });
    $("#changes-added").innerHTML = html + "</ul>";
  }
})();
