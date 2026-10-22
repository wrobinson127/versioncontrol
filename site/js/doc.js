/* The reading pages: methodology, about, data, changes and the 404 page.
   The approved text is in the page; this script adds what is counted from
   the record when the page loads: the specimens beside the text (each one a
   small live view of the claim next to it), the per-year file rows, the
   citation dates, the lists of changes, and the table of contents' "you are
   here" mark. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc, $ = CR.$, $$ = CR.$$;
  CR.initShell();
  /* the 404 page is served at any depth, so its links are absolute */
  var B = document.body.classList.contains("pg-404") ? "/" : "";

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
    $$(".doc-sec[aria-labelledby]").forEach(function (s) { io.observe(s); });
    links.forEach(function (a) { a.addEventListener("click", function () { if (window.innerWidth <= 1040) { toc.open = false; } }); });
  }

  /* ---------- copy buttons (the citation box) ---------- */

  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var el = document.getElementById(b.getAttribute("data-copy"));
      if (el) { CR.copyText(el.textContent.replace(/\s+\n/g, "\n").trim(), b.textContent.replace("Copy ", "") + " copied"); }
    });
  });

  var today = new Date().toISOString().slice(0, 10);
  $$(".cite-accessed").forEach(function (el) { el.textContent = today; });

  function entryHref(e) { return B + "explorer.html?id=" + encodeURIComponent(e.id); }
  function entryLink(e) {
    return '<a href="' + entryHref(e) + '">' + esc(e.model_name) + "</a> (" + esc(e._orgName) + ", " + '<span class="num">' + esc(e.date) + "</span>)";
  }
  function fill(id, html) { var el = $("#sp-" + id + " .rn-b"); if (el) { el.outerHTML = '<div class="rn-b">' + html + "</div>"; } }
  function has(id) { return !!$("#sp-" + id); }
  function num(n) { return '<span class="num">' + n + "</span>"; }

  /* bars with their value above each, one per label; a quiet, labelled chart */
  function bars(labels, values, aria, opts) {
    opts = opts || {};
    var w = 280, h = 132, base = 104, top = 20, n = labels.length, slot = w / n, bw = Math.min(34, slot * 0.6);
    var mx = Math.max.apply(null, values) || 1, s = CR.svgOpen(w, h, "spec-svg", aria);
    labels.forEach(function (l, i) {
      var v = values[i], bh = v ? Math.max(2, (base - top) * v / mx) : 0, x = i * slot + (slot - bw) / 2;
      if (v) { s += '<rect style="--i:' + i + '" x="' + x.toFixed(1) + '" y="' + (base - bh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" class="' + (opts.partial === l ? "sb-part" : "sb") + '"/>'; }
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (base - bh - 6).toFixed(1) + '" text-anchor="middle" class="sv-n">' + v + "</text>";
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (base + 18) + '" text-anchor="middle" class="sv-l">' + esc(l) + "</text>";
    });
    return s + '<line x1="0" x2="' + w + '" y1="' + (base + 0.5) + '" y2="' + (base + 0.5) + '" class="sb-base"/></svg>';
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
        tr.innerHTML = '<td><code><a href="./data/' + esc(short) + '">' + esc(short) + "</a></code></td><td>Entries dated " + esc(year) + " (" + n + (n === 1 ? " entry)." : " entries).") + "</td>";
        rows.insertBefore(tr, anchor);
      });
    }

    specimens(D);
    changesLists(D);
    settle();
    document.documentElement.classList.add("ready");
  }).catch(function () {
    $$(".spec").forEach(function (n) { n.hidden = true; });
    ["changes-corrections", "changes-retractions", "changes-added"].forEach(function (id) {
      var el = document.getElementById(id); if (el) { el.innerHTML = "<p>The dataset could not be loaded in this session.</p>"; }
    });
  });

  function settle() {
    var specs = $$(".spec");
    if (!("IntersectionObserver" in window)) { specs.forEach(function (x) { x.classList.add("in"); }); return; }
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io2.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    specs.forEach(function (x) { io2.observe(x); });
  }

  /* ---------- the specimens ---------- */

  function specimens(D) {
    var m = D.meta, y = D.asOf.slice(0, 4);
    var scores = { all: 0, ind: 0, lab: 0, full: 0 };
    D.entries.forEach(function (e) {
      (e.benchmarks || []).forEach(function (b) {
        var p = b.provenance || {};
        scores.all++;
        if (p.source_class === "INDEPENDENT") { scores.ind++; } else if (p.source_class === "LAB_REPORTED") { scores.lab++; }
        if (p.source_url && p.benchmark_name && p.benchmark_version && p.retrieval_date) { scores.full++; }
      });
    });
    var sc = CR.discCounts(D.releases, "system_card");
    var scStrip = D.releases.slice().reverse().map(function (e, i) { return CR.discGlyph(e._disc.system_card, 7).replace('<svg ', '<svg style="--i:' + i + '" '); }).join("");
    var years = D.views.cadence.yearly;

    var scoresHtml = '<p class="rn-big">' + num(scores.all) + ' scores</p><ul class="rn-list">' +
      "<li>" + CR.provTag("INDEPENDENT", null, null) + " " + num(scores.ind) + " measured by Epoch AI</li>" +
      "<li>" + CR.provTag("LAB_REPORTED", null, null) + " " + num(scores.lab) + " reported by the lab</li></ul>" +
      '<p class="rn-s">' + num(scores.full) + " of " + scores.all + " carry a source URL, a benchmark name and version, and a retrieval date.</p>";
    var discHtml = '<p class="rn-s">System cards, across ' + D.releases.length + " releases, oldest first:</p>" +
      '<div class="rn-strip" aria-hidden="true">' + scStrip + '</div><ul class="rn-list">' +
      "<li>" + CR.discGlyph("disclosed", 10) + " " + num(sc.disclosed) + " link on record</li>" +
      "<li>" + CR.discGlyph("not_disclosed", 10) + " " + num(sc.not_disclosed) + " not disclosed (we checked)</li>" +
      (sc.not_researched ? "<li>" + CR.discGlyph("not_researched", 10) + " " + num(sc.not_researched) + " not yet checked</li>" : "") + "</ul>" +
      '<p class="rn-s">The share counts only the ' + sc.researched + " checked: <b>" + num(Math.round(100 * sc.share) + "%") + "</b>.</p>";
    var changesHtml = '<p class="rn-big">' + num(m.delta_chips) + ' changes</p><p class="rn-s">against a predecessor are on record, each between scores on one benchmark version from one kind of source.</p>';
    var countHtml = bars(years.map(function (r) { return r.year === y ? r.year + "*" : r.year; }), years.map(function (r) { return r.releases; }),
      "Releases per year: " + years.map(function (r) { return r.releases + " in " + r.year; }).join(", ") + ".", { partial: y + "*" }) +
      '<p class="rn-s">* ' + y + " so far, to " + esc(D.asOf) + ". Revisions are counted apart.</p>";
    var origins = { "backfill-epoch": 0, "nightly-pipeline": 0, "manual": 0 };
    D.entries.forEach(function (e) { origins[e.origin] = (origins[e.origin] || 0) + 1; });
    var recordHtml = "<dl>" +
      "<div><dt>Entries</dt><dd>" + num(m.entry_count) + " (" + m.releases + " releases, " + m.revisions + " revisions)</dd></div>" +
      "<div><dt>Labs tracked</dt><dd>" + num(CR.ORG_ORDER.length) + "</dd></div>" +
      "<div><dt>From Epoch AI data, nightly detection, by hand</dt><dd>" + num(origins["backfill-epoch"]) + ", " + num(origins["nightly-pipeline"]) + ", " + num(origins.manual) + "</dd></div>" +
      "<div><dt>First and newest entry</dt><dd>" + num(esc(m.first_date)) + " to " + num(esc(m.last_date)) + "</dd></div>" +
      "<div><dt>Last successful update</dt><dd>" + num(esc(m.last_successful_update)) + "</dd></div></dl>";

    if (has("r1")) { fill("r1", scoresHtml); }
    if (has("r2")) { fill("r2", discHtml); }
    if (has("r3")) { fill("r3", changesHtml); }
    if (has("r4")) { fill("r4", eraHtml(D)); }
    if (has("scores")) { fill("scores", scoresHtml); }
    if (has("record")) { fill("record", recordHtml); }
    if (has("count")) { fill("count", countHtml); }
    if (has("disc")) { fill("disc", discHtml); }
    if (has("archive")) { fill("archive", archiveHtml(D)); }
    if (has("files")) { fill("files", filesHtml(D)); }
    if (has("csv")) { fill("csv", csvHtml(D)); }
    if (has("json")) { fill("json", jsonHtml(D)); }
    if (has("epoch")) { fill("epoch", epochHtml(D, origins, scores)); }
    if (has("corr")) { fill("corr", corrHtml(D)); }
    if (has("red")) { fill("red", redHtml(D)); }
    if (has("added")) { fill("added", addedHtml(D)); }
    if (has("origin")) { fill("origin", originHtml(origins)); }
    if (has("newest")) { fill("newest", newestHtml(D)); }
  }

  /* rule 4: each benchmark's scores on one line from the start of its version */
  function eraHtml(D) {
    var eras = D.views.trajectory.eras, keys = Object.keys(eras), w = 280, rowH = 40, h = keys.length * rowH + 24;
    var d0 = D.startDay, d1 = D.asOfDay, sx = function (d) { return 4 + (w - 8) * (d - d0) / (d1 - d0); };
    var s = CR.svgOpen(w, h, "spec-svg", "Every score on record, by release date, on one line per benchmark version.");
    var list = "";
    keys.forEach(function (k, i) {
      var e = eras[k][0], y = 14 + i * rowH, n = 0;
      s += '<text x="0" y="' + (y - 2) + '" class="sv-l sv-left">' + esc(CR.BENCH[k] || k) + ', version "' + esc(e.version) + '"</text>';
      var xs = sx(CR.dayNum(e.start));
      s += '<line x1="' + xs.toFixed(1) + '" x2="' + (w - 4) + '" y1="' + (y + 12) + '" y2="' + (y + 12) + '" class="sb-base"/>';
      s += '<line x1="' + xs.toFixed(1) + '" x2="' + xs.toFixed(1) + '" y1="' + (y + 5) + '" y2="' + (y + 19) + '" class="sb-mark"/>';
      D.entries.forEach(function (x) {
        (x.benchmarks || []).forEach(function (b) {
          if (b.benchmark !== k) { return; }
          n++;
          var cx = sx(x._day), ind = b.provenance.source_class === "INDEPENDENT";
          s += ind ? '<circle cx="' + cx.toFixed(1) + '" cy="' + (y + 12) + '" r="2.4" class="g-ind"/>'
            : '<path d="M' + cx.toFixed(1) + " " + (y + 8.6) + "l3.4 3.4l-3.4 3.4l-3.4 -3.4Z" + '" class="g-lab"/>';
        });
      });
      list += "<li><b>" + esc(CR.BENCH[k] || k) + '</b><span class="t-m">version "' + esc(e.version) + '", ' + n + " scores, from " + esc(e.start) + "</span></li>";
    });
    for (var yy = +D.meta.first_date.slice(0, 4) + 1; yy <= +D.asOf.slice(0, 4); yy++) {
      s += '<text x="' + sx(CR.dayNum(yy + "-01-01")).toFixed(1) + '" y="' + (h - 2) + '" text-anchor="middle" class="sv-l">' + yy + "</text>";
    }
    return '<p class="rn-s">Two benchmarks, each held to one version:</p>' + s + '</svg><ul class="rn-list">' + list + "</ul>";
  }

  /* about: lab pages and disclosure documents with an archived copy */
  function archiveHtml(D) {
    var lab = 0, arch = 0, disc = 0, discArch = 0, latest = "";
    D.entries.forEach(function (e) {
      (e.sources || []).forEach(function (s) {
        if (s.kind === "epoch_csv") { return; }
        lab++;
        if (s.archived_url) { arch++; var d = CR.archiveDate(s.archived_url); if (d > latest && /^\d/.test(d)) { latest = d; } }
      });
      CR.DISC_SLOTS.forEach(function (sl) {
        if (e._disc[sl[0]] !== "disclosed") { return; }
        disc++;
        if ((e.disclosure_archived || {})[sl[0]]) { discArch++; }
      });
    });
    return '<p class="rn-big">' + num(arch) + " of " + lab + "</p>" +
      '<p class="rn-s">source pages from the labs have an archived copy on archive.org.</p>' +
      '<p class="rn-big" style="margin-top:14px">' + num(discArch) + " of " + disc + "</p>" +
      '<p class="rn-s">disclosure links on record have an archived copy.</p>' +
      (latest ? '<p class="rn-s" style="margin-top:10px">Newest snapshot: ' + num(latest) + ".</p>" : "");
  }

  function filesHtml(D) {
    var files = Object.keys(D.manifest.files || {}).sort();
    var labels = files.map(function (f) { return (f.match(/(\d{4})\.json\.gz$/) || [])[1] || f; });
    var vals = files.map(function (f) { return D.manifest.files[f].count; });
    return bars(labels, vals, "Entries per year file: " + labels.map(function (l, i) { return vals[i] + " in " + l; }).join(", ") + ".") +
      '<p class="rn-s">' + num(D.entries.length) + " entries across " + files.length + " files, each with a SHA-256 checksum in the manifest.</p>";
  }

  function word(v) { return v === "NOT_DISCLOSED" || v === "NOT_RESEARCHED" ? v : v ? "(a URL)" : "NOT_RESEARCHED"; }
  function csvHtml(D) {
    var rows = D.entries.slice(0, 6);
    return '<div class="spec-tbl"><table class="dt"><thead><tr><th scope="col">model_name</th><th scope="col">date</th><th scope="col">paper</th></tr></thead><tbody>' +
      rows.map(function (e) { return '<tr><th scope="row" class="ell"><a href="' + entryHref(e) + '" title="' + esc(e.id) + '">' + esc(e.model_name) + "</a></th><td>" + num(e.date) + "</td><td>" + esc(word((e.disclosure_links || {}).paper)) + "</td></tr>"; }).join("") +
      '</tbody></table></div><p class="rn-s">Three of releases.csv\'s columns are shown here; in the disclosure columns, absence is written as NOT_DISCLOSED or NOT_RESEARCHED, never left blank.</p>';
  }

  function jsonHtml(D) {
    var e = D.entries[0], keep = {};
    ["id", "model_name", "org", "date", "entry_type", "availability_class", "origin", "parameters", "parameters_basis", "predecessor", "disclosure_links"].forEach(function (k) { if (k in e) { keep[k] = e[k]; } });
    keep.benchmarks = (e.benchmarks || []).length + " on record";
    keep.sources = (e.sources || []).map(function (s) { return { kind: s.kind, retrieval_date: s.retrieval_date, archived: !!s.archived_url }; });
    var txt = JSON.stringify(keep, null, 2).replace(/"(https?:\/\/[^"]{0,38})[^"]*"/g, '"$1..."');
    return "<pre class=\"spec-json\"><code>" + esc(txt) + '</code></pre><p class="rn-s">Long links are cut here; <a href="' + entryHref(e) + '">the entry in the explorer</a> shows them in full.</p>';
  }

  function epochHtml(D, origins, scores) {
    var rd = "";
    D.entries.forEach(function (e) { (e.sources || []).forEach(function (s) { if (s.kind === "epoch_csv" && s.retrieval_date > rd) { rd = s.retrieval_date; } }); });
    return '<ul class="rn-list rn-big-list">' +
      "<li>" + num(origins["backfill-epoch"]) + " entries built from Epoch AI's models dataset</li>" +
      "<li>" + num(scores.ind) + " independent scores from Epoch AI's benchmarking data, each tagged " + CR.provTag("INDEPENDENT", null, null) + "</li>" +
      "<li>Epoch AI's models data last read " + num(esc(rd)) + "</li></ul>";
  }

  function corrHtml(D) {
    var list = D.entries.filter(function (e) { return e.correction_note; });
    if (!list.length) { return '<p class="rn-big">' + num(0) + "</p><p class=\"rn-s\">No corrections on record.</p>"; }
    return '<p class="rn-big">' + num(list.length) + " entries</p><ul class=\"rn-list rn-ref\">" +
      list.map(function (e) { return '<li><a href="' + entryHref(e) + '">' + esc(e.model_name) + '</a><span class="t-m">' + esc(e._orgName) + ", " + esc(e.date) + "</span></li>"; }).join("") +
      '</ul>';
  }

  function redHtml(D) {
    var n = D.entries.filter(function (e) { return e._retracted; }).length;
    return '<p class="rn-big">' + num(n) + " of " + D.entries.length + '</p><p class="rn-s">entries are retracted. A retracted entry is marked <span class="tag-retracted">retracted</span> wherever it appears.</p>' +
      '<p class="rn-s" style="margin-top:10px">Red marks a correction or a retraction, and nothing else.</p>';
  }

  function firstRead(e) {
    var dates = (e.sources || []).map(function (s) { return s.retrieval_date; }).filter(Boolean).sort();
    return dates[0] || e.date;
  }
  function addedHtml(D) {
    var byDate = {};
    D.entries.forEach(function (e) { if (e.origin === "backfill-epoch") { return; } var d = firstRead(e); byDate[d] = (byDate[d] || 0) + 1; });
    var ds = Object.keys(byDate).sort();
    var shown = ds.slice(-8);
    return bars(shown.map(function (d) { return d.slice(5); }), shown.map(function (d) { return byDate[d]; }),
      "Entries added after the initial build, by the date their source was first read: " + shown.map(function (d) { return byDate[d] + " on " + d; }).join(", ") + ".") +
      '<p class="rn-s">The ' + (shown.length < ds.length ? "latest " + shown.length + " of " + ds.length + " dates" : ds.length + " dates") + ", month and day, " + esc(shown[0].slice(0, 4)) + (shown[0].slice(0, 4) !== shown[shown.length - 1].slice(0, 4) ? " to " + esc(shown[shown.length - 1].slice(0, 4)) : "") + ".</p>";
  }

  function originHtml(origins) {
    return bars(["Epoch AI data", "Nightly", "By hand"], [origins["backfill-epoch"], origins["nightly-pipeline"], origins.manual],
      "Entries by origin: " + origins["backfill-epoch"] + " from Epoch AI data, " + origins["nightly-pipeline"] + " found by nightly detection, " + origins.manual + " recorded by hand.") +
      '<p class="rn-s">Every entry added after the initial build from Epoch AI\'s data was approved by a person.</p>';
  }

  function newestHtml(D) {
    return '<ul class="rn-list rn-ref">' + D.entries.slice(0, 6).map(function (e) {
      return '<li><a href="' + entryHref(e) + '">' + esc(e.model_name) + '</a><span class="t-m">' + esc(e._orgName) + ", " + esc(e.date) + "</span></li>";
    }).join("") + '</ul><p class="rn-s"><a href="' + B + 'explorer.html">Every entry in the explorer</a></p>';
  }

  /* ---------- changes: corrections, retractions, additions ---------- */

  function changesLists(D) {
    var corrEl = $("#changes-corrections");
    if (!corrEl) { return; }
    var all = D.entries;
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
