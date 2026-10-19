/* Broadsheet: the record, as a newspaper's data appendix.
   One table of every entry: search, filters, sortable columns, a disclosure
   strip and a lab-cadence sparkline per row, and an expandable entry with
   every source, its archived copy, disclosure state, scores with provenance,
   and predecessor deltas or refusals rendered verbatim from deltas.json.gz.
   The whole view lives in the URL, so any view or entry can be shared. */
(function () {
  "use strict";
  var BS = window.BS, esc = BS.esc;
  var E = [], byId = {}, deltas = {}, meta = null;
  var state = { q: "", lab: "", country: "", type: "", avail: "", from: "", to: "", scored: false, sort: "date", dir: -1, entry: "" };
  var $ = function (id) { return document.getElementById(id); };
  var rowsEl = $("rows");
  var spark = {}, q0 = 0, nq = 1;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function scoreOf(e, bench) {
    var out = { ind: null, lab: null };
    (e.benchmarks || []).forEach(function (b) {
      if (b.benchmark !== bench) { return; }
      if (b.provenance.source_class === "INDEPENDENT") { out.ind = b; } else { out.lab = b; }
    });
    return out;
  }
  function sortVal(e, k) {
    if (k === "date") { return e.date + e.id; }
    if (k === "model") { return e.model_name.toLowerCase(); }
    if (k === "lab") { return BS.ORG_NAMES[e.org] + e.date; }
    if (k === "avail") { return e.availability_class + e.date; }
    var s = scoreOf(e, k === "gpqa" ? "gpqa-diamond" : "swe-bench-verified");
    var v = s.ind ? s.ind.value : s.lab ? s.lab.value : null;
    return v;
  }
  function matches(e) {
    if (state.lab && e.org !== state.lab) { return false; }
    if (state.country && BS.ORG_COUNTRY[e.org] !== state.country) { return false; }
    if (state.type && e.entry_type !== state.type) { return false; }
    if (state.avail && e.availability_class !== state.avail) { return false; }
    if (state.scored && !(e.benchmarks && e.benchmarks.length)) { return false; }
    if (state.from && e.date < state.from) { return false; }
    if (state.to && e.date > state.to) { return false; }
    if (state.q) {
      var hay = (e.model_name + " " + (e.variants || []).join(" ") + " " + e.id).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) { return false; }
    }
    return true;
  }

  /* ---------- URL state ---------- */
  function readUrl() {
    var p = new URLSearchParams(location.search);
    state.q = p.get("q") || "";
    state.lab = BS.ORG_NAMES[p.get("lab")] ? p.get("lab") : "";
    var c = p.get("country") || "";
    state.country = Object.keys(BS.ORG_COUNTRY).some(function (k) { return BS.ORG_COUNTRY[k] === c; }) ? c : "";
    state.type = /^(release|revision)$/.test(p.get("type")) ? p.get("type") : "";
    state.avail = BS.AVAIL_NAMES[p.get("avail")] ? p.get("avail") : "";
    state.from = DATE_RE.test(p.get("from") || "") ? p.get("from") : "";
    state.to = DATE_RE.test(p.get("to") || "") ? p.get("to") : "";
    if (state.from && state.to && state.from > state.to) { var t = state.from; state.from = state.to; state.to = t; }
    state.scored = p.get("scored") === "1";
    var s = p.get("sort") || "date-desc", m = /^(date|model|lab|avail|gpqa|swe)-(asc|desc)$/.exec(s);
    if (m) { state.sort = m[1]; state.dir = m[2] === "asc" ? 1 : -1; }
    state.entry = p.get("entry") || (location.hash ? decodeURIComponent(location.hash.slice(1)) : "");
  }
  function writeUrl() {
    var p = new URLSearchParams();
    ["q", "lab", "country", "type", "avail", "from", "to"].forEach(function (k) { if (state[k]) { p.set(k, state[k]); } });
    if (state.scored) { p.set("scored", "1"); }
    if (!(state.sort === "date" && state.dir === -1)) { p.set("sort", state.sort + "-" + (state.dir > 0 ? "asc" : "desc")); }
    if (state.entry) { p.set("entry", state.entry); }
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }
  function syncControls() {
    $("f-q").value = state.q; $("f-lab").value = state.lab; $("f-country").value = state.country;
    $("f-type").value = state.type; $("f-avail").value = state.avail; $("f-from").value = state.from;
    $("f-to").value = state.to; $("f-scored").checked = state.scored;
    [].forEach.call(document.querySelectorAll("th[aria-sort]"), function (th) {
      var k = th.querySelector("button").getAttribute("data-sort");
      th.setAttribute("aria-sort", k === state.sort ? (state.dir > 0 ? "ascending" : "descending") : "none");
    });
  }

  /* ---------- cell renderers ---------- */
  function discStrip(e) {
    var d = e.disclosure_links || {}, s = '<svg class="dstrip" width="70" height="14" viewBox="0 0 70 14" role="img" aria-label="';
    var lab = [], rects = "";
    BS.SLOTS.forEach(function (sl, i) {
      var v = d[sl[0]], st = v === "NOT_DISCLOSED" ? "nd" : (!v || v === "NOT_RESEARCHED") ? "nr" : "on";
      lab.push(sl[1] + ": " + (st === "on" ? "link on record" : st === "nd" ? "not disclosed" : "not yet researched"));
      var x = i * 17 + 1;
      rects += '<rect x="' + (x + 0.75) + '" y="1.75" width="10.5" height="10.5" ' +
        (st === "on" ? 'fill="#14161b" stroke="#14161b"' : st === "nd" ? 'fill="url(#hatch)" stroke="#14161b"' : 'fill="none" stroke="#8a8d94"') + ' stroke-width="1.5"/>';
    });
    return s + esc(lab.join("; ")) + '">' + rects + "</svg>";
  }
  function scoreCell(e, bench) {
    var s = scoreOf(e, bench), out = [];
    if (s.ind) { out.push('<span class="sc">' + esc(s.ind.value) + '<span class="prov prov-ind" title="Measured by an independent evaluator">IND</span></span>'); }
    if (s.lab) { out.push('<span class="sc">' + esc(s.lab.value) + '<span class="prov" title="Reported by the lab">LAB</span></span>'); }
    return out.length ? out.join("") : '<span class="muted">none on record</span>';
  }
  function qOf(d) { return +d.slice(0, 4) * 4 + Math.floor((+d.slice(5, 7) - 1) / 3); }
  function buildSparks() {
    q0 = qOf(E[0].date); nq = qOf(E[E.length - 1].date) - q0 + 1;
    var counts = {}, max = 1;
    E.forEach(function (e) { var k = e.org; counts[k] = counts[k] || []; var q = qOf(e.date) - q0; counts[k][q] = (counts[k][q] || 0) + 1; max = Math.max(max, counts[k][q]); });
    Object.keys(counts).forEach(function (o) {
      var d = "", w = 120 / nq;
      for (var q = 0; q < nq; q++) {
        var c = counts[o][q] || 0; if (!c) { continue; }
        var h = Math.max(1.5, c / max * 18);
        d += "M" + (q * w + 0.6).toFixed(1) + " 20V" + (20 - h).toFixed(1) + "h" + (w - 1.2).toFixed(1) + "V20z";
      }
      spark[o] = { d: d, w: w };
    });
  }
  function sparkCell(e) {
    var sp = spark[e.org], q = qOf(e.date) - q0;
    return '<svg class="spark" width="120" height="22" viewBox="0 0 120 22" aria-hidden="true"><path d="' + sp.d + '" fill="#9a9da4"/>' +
      '<rect x="' + (q * sp.w).toFixed(1) + '" y="0" width="' + Math.max(2, sp.w).toFixed(1) + '" height="21" fill="#1f44d6"/>' +
      '<line x1="0" x2="120" y1="20.75" y2="20.75" stroke="#14161b" stroke-width="1.5"/></svg>';
  }
  function row(e) {
    var open = state.entry === e.id;
    return '<tr class="r' + (open ? " is-open" : "") + (e.retracted ? " is-retracted" : "") + '" data-id="' + esc(e.id) + '">' +
      '<td class="c-date" data-l="Date"><time datetime="' + esc(e.date) + '">' + esc(e.date) + "</time></td>" +
      '<td class="c-model" data-l="Model"><button type="button" class="open" aria-expanded="' + open + '" aria-controls="d-' + esc(e.id) + '">' +
      '<span class="mname">' + esc(e.model_name) + "</span>" +
      (e.entry_type === "revision" ? '<span class="tag">revision</span>' : "") + (e.retracted ? '<span class="tag">retracted</span>' : "") +
      '<svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></td>' +
      '<td class="c-lab" data-l="Lab">' + esc(BS.ORG_NAMES[e.org]) + "</td>" +
      '<td class="c-av" data-l="Availability"><span class="avd av-' + esc(e.availability_class) + '" aria-hidden="true"></span>' + esc(BS.AVAIL_NAMES[e.availability_class]) + "</td>" +
      '<td class="c-disc" data-l="Disclosure">' + discStrip(e) + "</td>" +
      '<td class="c-num" data-l="GPQA Diamond">' + scoreCell(e, "gpqa-diamond") + "</td>" +
      '<td class="c-num" data-l="SWE-Bench Verified">' + scoreCell(e, "swe-bench-verified") + "</td>" +
      '<td class="c-spark" data-l="Lab\'s cadence">' + sparkCell(e) + "</td></tr>" +
      (open ? detailRow(e) : "");
  }

  /* ---------- the entry ---------- */
  function provTag(cls, url, rd) {
    var short = cls === "LAB_REPORTED" ? "LAB" : "IND";
    var title = (cls === "LAB_REPORTED" ? "LAB: reported by the releasing lab." : "IND: measured by an independent evaluator.") + (rd ? " Retrieved " + rd + "." : "");
    return url ? '<a class="prov' + (short === "IND" ? " prov-ind" : "") + '" href="' + esc(url) + '" title="' + esc(title) + '" rel="external">' + short + "</a>"
      : '<span class="prov' + (short === "IND" ? " prov-ind" : "") + '" title="' + esc(title) + '">' + short + "</span>";
  }
  function detailRow(e) {
    var org = BS.ORG_NAMES[e.org], items = deltas[e.id] || [];
    var h = '<tr class="detail" id="d-' + esc(e.id) + '"><td colspan="8"><div class="det" data-ui>';
    /* column 1: what it is */
    h += '<div class="det-c"><h2 class="det-h">' + esc(e.model_name) + "</h2>";
    h += '<p class="det-sum">' + esc(e.summary) + "</p>";
    if (e.correction_note) { h += '<p class="corr"><b>Correction.</b> ' + esc(e.correction_note) + "</p>"; }
    if (e.retracted && e.retraction_note) { h += '<p class="corr"><b>Retracted.</b> ' + esc(e.retraction_note) + "</p>"; }
    h += '<dl class="facts">';
    h += "<dt>Date</dt><dd>" + esc(e.date) + "</dd>";
    h += "<dt>Lab</dt><dd>" + esc(org) + ", " + esc(BS.ORG_COUNTRY[e.org]) + "</dd>";
    h += "<dt>Type</dt><dd>" + esc(e.entry_type) + "</dd>";
    h += "<dt>Availability</dt><dd>" + esc(BS.AVAIL_NAMES[e.availability_class]) + "</dd>";
    h += "<dt>Parameters</dt><dd>" + (typeof e.parameters === "number" ? esc(BS.fmtParams(e.parameters)) :
      '<span class="nr" title="Epoch AI\'s data has no parameter count for this model. We have not checked whether the lab stated one.">no count on record</span>') + "</dd>";
    if (e.variants && e.variants.length) { h += "<dt>Variants</dt><dd>" + e.variants.map(esc).join(", ") + "</dd>"; }
    if (e.license_note) { h += "<dt>License</dt><dd>" + esc(e.license_note) + "</dd>"; }
    h += "<dt>Origin</dt><dd>" + esc(BS.ORIGIN_NAMES[e.origin] || e.origin) + "</dd>";
    if (e.predecessor) {
      var pe = byId[e.predecessor];
      h += "<dt>Predecessor</dt><dd>" + (pe ? '<a href="?entry=' + encodeURIComponent(pe.id) + '" data-goto="' + esc(pe.id) + '">' + esc(pe.model_name) + "</a> (" + esc(pe.date) + ")" : esc(e.predecessor)) + "</dd>";
    }
    h += "</dl></div>";

    /* column 2: scores with provenance, deltas and refusals */
    h += '<div class="det-c"><h3>Scores</h3>';
    if (e.benchmarks && e.benchmarks.length) {
      h += '<ul class="scores">';
      e.benchmarks.forEach(function (b) {
        var p = b.provenance || {};
        h += '<li><span class="bn">' + esc(p.benchmark_name || b.benchmark) + '</span><span class="bv">' + esc(b.value) + provTag(p.source_class, p.source_url, p.retrieval_date) + "</span>" +
          '<span class="bm">' + (p.source_class === "LAB_REPORTED" ? "Reported by the lab" : "Measured by Epoch AI") + ", version " + esc(p.benchmark_version || "") + ", retrieved " + esc(p.retrieval_date || "") + ".</span>" +
          '<span class="bm">Settings: ' + esc(b.configuration || "not stated") + "</span>";
        items.forEach(function (d) {
          if (d.kind === "delta" && d.benchmark === b.benchmark && ((d.source_class || "") === (p.source_class || ""))) {
            h += '<span class="delta"><b>' + (d.value >= 0 ? "+" : "") + Number(d.value).toFixed(1) + "</b> vs predecessor (" + esc(d.predecessor) + " to " + esc(d.current) + ")" + provTag(d.source_class, d.source_url, null) + "</span>";
          }
        });
        h += "</li>";
      });
      h += "</ul>";
    } else {
      h += '<p class="muted">No benchmark measurements recorded for this entry.</p>';
    }
    items.forEach(function (d) {
      if (d.kind === "REFUSED_COMPARISON") {
        h += '<p class="refused"><b>No comparable measurement against the predecessor.</b> The comparison is refused. Reason on record: ' + esc(d.reason || "not stated") + ".</p>";
      }
    });
    h += "</div>";

    /* column 3: disclosure and sources */
    var dl = e.disclosure_links || {}, da = e.disclosure_archived || {};
    h += '<div class="det-c"><h3>Disclosure</h3><ul class="disc">';
    BS.SLOTS.forEach(function (sl) {
      var v = dl[sl[0]];
      h += "<li><span class=\"dn\">" + esc(sl[1]) + "</span>";
      if (v && v !== "NOT_DISCLOSED" && v !== "NOT_RESEARCHED") {
        h += '<span><a href="' + esc(v) + '" rel="external">link</a>' + (da[sl[0]] ? ', <a href="' + esc(da[sl[0]]) + '" rel="external">archived copy, ' + esc(BS.archiveDate(da[sl[0]])) + "</a>" : "") + "</span>";
      } else if (v === "NOT_DISCLOSED") {
        h += '<span class="nd" title="We checked the lab\'s own sites and found nothing.">not disclosed</span>';
      } else {
        h += '<span class="nr" title="Not yet researched. A gap in our record, not a statement about the lab.">not yet researched</span>';
      }
      h += "</li>";
    });
    h += '</ul><h3>Sources</h3><ul class="srcs">';
    (e.sources || []).forEach(function (s) {
      h += '<li><a href="' + esc(s.url) + '" rel="external">' + esc(BS.SOURCE_KIND_NAMES[s.kind] || s.kind.replace(/_/g, " ")) + "</a>, retrieved " + esc(s.retrieval_date) +
        (s.archived_url ? '. <a href="' + esc(s.archived_url) + '" rel="external">Archived copy, ' + esc(BS.archiveDate(s.archived_url)) + "</a>" : "") + ".</li>";
    });
    h += '</ul><p class="det-act"><button type="button" class="tbtn" data-copy="' + esc(e.id) + '">Copy link to this entry</button></p></div>';
    return h + "</div></td></tr>";
  }

  /* ---------- render ---------- */
  function render() {
    var list = E.filter(matches);
    var k = state.sort, dir = state.dir;
    list.sort(function (a, b) {
      var va = sortVal(a, k), vb = sortVal(b, k);
      if (va == null && vb == null) { return a.date < b.date ? 1 : -1; }
      if (va == null) { return 1; }
      if (vb == null) { return -1; }
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
    $("count").textContent = "Showing " + list.length + " of " + E.length + " entries" + (list.length === E.length ? "." : ", filtered.");
    if (!list.length) {
      rowsEl.innerHTML = '<tr><td colspan="8" class="empty"><b>No entries match these filters.</b> The record covers releases from twelve tracked labs, ' +
        esc(E[0].date) + " to " + esc(E[E.length - 1].date) + '. <button type="button" class="tbtn" data-reset>Clear filters</button></td></tr>';
      return;
    }
    rowsEl.innerHTML = list.map(row).join("");
  }
  function update() { writeUrl(); syncControls(); render(); }

  function reveal(id, scroll) {
    var e = byId[id]; if (!e) { return; }
    if (!matches(e)) { state.q = ""; state.lab = ""; state.country = ""; state.type = ""; state.avail = ""; state.from = ""; state.to = ""; state.scored = false; }
    state.entry = id;
    update();
    if (scroll) {
      var tr = rowsEl.querySelector('tr[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (tr) { tr.scrollIntoView({ block: "start" }); var b = tr.querySelector(".open"); if (b) { b.focus({ preventScroll: true }); } }
    }
  }
  function copy(text, btn) {
    var label = btn.textContent;
    var done = function () { btn.textContent = "Link copied"; setTimeout(function () { btn.textContent = label; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { btn.textContent = "Copy the address bar"; }); }
    else { btn.textContent = "Copy the address bar"; }
  }

  function bind() {
    var labSel = $("f-lab"), cSel = $("f-country");
    Object.keys(BS.ORG_NAMES).sort(function (a, b) { return BS.ORG_NAMES[a].localeCompare(BS.ORG_NAMES[b]); }).forEach(function (k) {
      var o = document.createElement("option"); o.value = k; o.textContent = BS.ORG_NAMES[k]; labSel.appendChild(o);
    });
    Object.keys(BS.ORG_COUNTRY).map(function (k) { return BS.ORG_COUNTRY[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort().forEach(function (c) {
      var o = document.createElement("option"); o.value = c; o.textContent = c; cSel.appendChild(o);
    });
    ["f-from", "f-to"].forEach(function (id) { $(id).min = E[0].date; $(id).max = E[E.length - 1].date; });
    var t = null;
    $("f-q").addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { state.q = $("f-q").value.trim(); state.entry = ""; update(); }, 140); });
    [["f-lab", "lab"], ["f-country", "country"], ["f-type", "type"], ["f-avail", "avail"], ["f-from", "from"], ["f-to", "to"]].forEach(function (p) {
      $(p[0]).addEventListener("change", function () {
        var v = $(p[0]).value; if ((p[1] === "from" || p[1] === "to") && v && !DATE_RE.test(v)) { return; }
        state[p[1]] = v; state.entry = ""; update();
      });
    });
    $("f-scored").addEventListener("change", function () { state.scored = $("f-scored").checked; state.entry = ""; update(); });
    function reset() { state.q = ""; state.lab = ""; state.country = ""; state.type = ""; state.avail = ""; state.from = ""; state.to = ""; state.scored = false; state.entry = ""; update(); }
    $("reset").addEventListener("click", reset);
    $("share").addEventListener("click", function () { copy(location.href, $("share")); });
    document.querySelector(".ledger thead").addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-sort]"); if (!b) { return; }
      var k = b.getAttribute("data-sort");
      if (state.sort === k) { state.dir = -state.dir; } else { state.sort = k; state.dir = (k === "model" || k === "lab" || k === "avail") ? 1 : -1; }
      update();
    });
    rowsEl.addEventListener("click", function (ev) {
      var t2 = ev.target;
      if (t2.closest("[data-reset]")) { reset(); return; }
      var cp = t2.closest("[data-copy]");
      if (cp) { copy(location.origin + location.pathname + "?entry=" + encodeURIComponent(cp.getAttribute("data-copy")), cp); return; }
      var go = t2.closest("[data-goto]");
      if (go) { ev.preventDefault(); reveal(go.getAttribute("data-goto"), true); return; }
      var ob = t2.closest(".open");
      if (ob) {
        var id = ob.closest("tr").getAttribute("data-id");
        state.entry = state.entry === id ? "" : id;
        update();
        var nb = rowsEl.querySelector('tr[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"] .open');
        if (nb) { nb.focus({ preventScroll: true }); }
      }
    });
  }

  BS.renderFooter();
  BS.loadAll().then(function (d) {
    E = d.entries; deltas = d.deltas; meta = d.meta;
    E.forEach(function (e) { byId[e.id] = e; });
    buildSparks();
    $("ledger-dek").innerHTML = '<b class="n">' + E.length + "</b> entries from twelve tracked labs, " + '<b class="n">' + esc(E[0].date) + "</b> to " +
      '<b class="n">' + esc(E[E.length - 1].date) + "</b>. Open any row for its sources, archived copies, disclosure and scores.";
    bind();
    readUrl();
    if (state.entry && byId[state.entry]) { syncControls(); reveal(state.entry, true); }
    else { state.entry = ""; update(); }
  }).catch(function (err) {
    rowsEl.innerHTML = '<tr><td colspan="8" class="empty">The record could not be loaded in this session (' + esc(err && err.message ? err.message : "unknown error") + "). Reloading the page retries.</td></tr>";
    $("count").textContent = "The record did not load.";
  });
})();
