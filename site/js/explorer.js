/* The explorer: the full record as a grid. A sticky header with a
   filter in every column, a sticky first column, windowed rows, and an
   inspector with every source, its archived copy and each score's settings.
   The whole view lives in the address: filters, sort and the open entry. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc, $ = CR.$, $$ = CR.$$;
  var D = null;
  var RH = 40;
  var rows = [];           /* entries after filters and sort */
  var openId = null;
  var focusI = 0;

  var F = { q: "", model: "", lab: [], year: "", type: "", avail: "", country: "", gpqa: "", swe: "", sc: "", mc: "", up: "", pa: "", params: "", origin: "", from: "", to: "" };
  var SORT = { k: "date", dir: -1 };

  var DISC_KEY = { sc: "system_card", mc: "model_card", up: "usage_policy", pa: "paper" };
  var SCORE_OPTS = [["", "Any"], ["any", "Has a score"], ["INDEPENDENT", "IND score"], ["LAB_REPORTED", "LAB score"], ["none", "No score"]];
  /* where a change against the predecessor would appear but the scores do
     not match, one line says why no change is shown */
  var NO_CHANGE = "No change shown: the predecessor's score is from a different source or test version.";
  var DISC_OPTS = [["", "Any"], ["disclosed", "Link on record"], ["not_disclosed", "Not disclosed (we checked)"], ["not_researched", "Not yet checked"]];

  function opts(list) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join(""); }

  var COLS = null;
  function defineCols() {
    var years = []; for (var y = +D.meta.first_date.slice(0, 4); y <= +D.asOf.slice(0, 4); y++) { years.push([String(y), String(y)]); }
    var countries = []; CR.ORG_ORDER.forEach(function (o) { if (countries.indexOf(CR.ORG_COUNTRY[o]) < 0) { countries.push(CR.ORG_COUNTRY[o]); } });
    COLS = [
      { k: "model", label: "Model", w: 268, sort: function (e) { return e.model_name.toLowerCase(); }, f: { type: "text", key: "model", ph: "Filter names", aria: "Filter by model name" } },
      { k: "lab", label: "Lab", w: 156, sort: function (e) { return e._orgName.toLowerCase(); }, f: { type: "select", key: "lab", aria: "Filter by lab", o: [["", "All labs"]].concat(CR.ORG_ORDER.map(function (o) { return [o, CR.ORG_NAMES[o]]; })) } },
      { k: "date", label: "Date", w: 112, num: true, sort: function (e) { return e.date; }, f: { type: "select", key: "year", aria: "Filter by year", o: [["", "All years"]].concat(years) } },
      { k: "type", label: "Type", w: 104, sort: function (e) { return e.entry_type; }, f: { type: "select", key: "type", aria: "Filter by entry type. A revision is an update to a model already on record.", title: CR.REVISION_GLOSS, o: [["", "All"], ["release", "Release"], ["revision", "Revision (an update to a model already on record)"]] } },
      { k: "avail", label: "Availability", w: 136, sort: function (e) { return e.availability_class; }, f: { type: "select", key: "avail", aria: "Filter by availability", o: [["", "All"], ["open_weights", "Open weights"], ["public_api", "Public API"], ["public_service", "Public service"]] } },
      { k: "country", label: "Country", w: 132, sort: function (e) { return e._country; }, f: { type: "select", key: "country", aria: "Filter by the country of the lab's parent company", o: [["", "All"]].concat(countries.map(function (c) { return [c, c]; })) } },
      { k: "gpqa", label: "GPQA Diamond", w: 216, num: true, sort: function (e) { return scoreSort(e, "gpqa-diamond"); }, f: { type: "select", key: "gpqa", aria: "Filter by GPQA Diamond score", o: SCORE_OPTS } },
      { k: "swe", label: "SWE-Bench Verified", w: 216, num: true, sort: function (e) { return scoreSort(e, "swe-bench-verified"); }, f: { type: "select", key: "swe", aria: "Filter by SWE-Bench Verified score", o: SCORE_OPTS } },
      { k: "sc", label: "System card", w: 152, disc: "system_card", sort: function (e) { return discSort(e, "system_card"); }, f: { type: "select", key: "sc", aria: "Filter by system card", o: DISC_OPTS } },
      { k: "mc", label: "Model card", w: 152, disc: "model_card", sort: function (e) { return discSort(e, "model_card"); }, f: { type: "select", key: "mc", aria: "Filter by model card", o: DISC_OPTS } },
      { k: "up", label: "Usage policy", w: 152, disc: "usage_policy", sort: function (e) { return discSort(e, "usage_policy"); }, f: { type: "select", key: "up", aria: "Filter by usage policy", o: DISC_OPTS } },
      { k: "pa", label: "Paper", w: 152, disc: "paper", sort: function (e) { return discSort(e, "paper"); }, f: { type: "select", key: "pa", aria: "Filter by paper", o: DISC_OPTS } },
      { k: "params", label: "Parameters", w: 120, num: true, sort: function (e) { return typeof e.parameters === "number" ? e.parameters : -1; }, f: { type: "select", key: "params", aria: "Filter by parameter count", o: [["", "Any"], ["count", "Count on record"], ["none", "No count on record"]] } },
      { k: "origin", label: "Origin", w: 176, sort: function (e) { return e.origin; }, f: { type: "select", key: "origin", aria: "Filter by how the entry reached the record", o: [["", "Any"], ["backfill-epoch", "From Epoch AI data"], ["nightly-pipeline", "Nightly detection"], ["manual", "Recorded by hand"]] } }
    ];
  }
  function scoreSort(e, b) { var s = e._score[b]; if (!s) { return -1; } return (s.INDEPENDENT || s.LAB_REPORTED).value; }
  function discSort(e, slot) { return { disclosed: 2, not_disclosed: 1, not_researched: 0 }[e._disc[slot]]; }

  /* ---------- state in the address ---------- */

  /* A count Epoch AI records from a report by others (a rumour, a leak, a
     post on X) shows as reported by others, with Epoch's note on hover. */
  function paramsHTML(e) {
    var n = '<span class="num">' + CR.fmtParams(e.parameters) + "</span>";
    if (e.parameters_basis !== "third_party") { return n; }
    return '<span class="p-other" title="' + CR.esc("Epoch AI's note: " + (e.parameters_note || "")) + '">' + n + ", reported by others</span>";
  }
  var KEYS = ["q", "model", "year", "type", "avail", "country", "gpqa", "swe", "sc", "mc", "up", "pa", "params", "origin", "from", "to"];
  function readUrl() {
    var p = new URLSearchParams(location.search);
    KEYS.forEach(function (k) { F[k] = p.get(k) || ""; });
    if (F.from && !CR.validDate(F.from)) { F.from = ""; }
    if (F.to && !CR.validDate(F.to)) { F.to = ""; }
    F.lab = (p.get("lab") || p.get("labs") || "").split(",").filter(function (o) { return CR.ORG_NAMES[o]; });
    var s = p.get("sort");
    if (s) { var m = /^(-?)([a-z]+)$/.exec(s); if (m && COLS.some(function (c) { return c.k === m[2]; })) { SORT.k = m[2]; SORT.dir = m[1] ? -1 : 1; } }
    var id = p.get("id") || p.get("entry");
    openId = id && D.byId[id] ? id : null;
    missingId = id && !openId ? id : null;
    if (F.from && F.to && F.from > F.to) { var t = F.from; F.from = F.to; F.to = t; }
    if (!openId && location.hash && D.byId[decodeURIComponent(location.hash.slice(1))]) { openId = decodeURIComponent(location.hash.slice(1)); }
  }
  function urlFor(withId) {
    var p = new URLSearchParams();
    KEYS.forEach(function (k) { if (F[k]) { p.set(k, F[k]); } });
    if (F.lab.length) { p.set("lab", F.lab.join(",")); }
    if (!(SORT.k === "date" && SORT.dir === -1)) { p.set("sort", (SORT.dir < 0 ? "-" : "") + SORT.k); }
    if (withId && openId) { p.set("id", openId); }
    /* an open Compare sheet keeps its place in the address */
    var cv = CR.compareParam ? CR.compareParam() : null;
    if (cv) { p.set("compare", cv); }
    var q = p.toString();
    return location.pathname + (q ? "?" + q : "");
  }
  /* ?id= naming no entry: say so in the inspector, with a way out */
  var missingId = null;
  function showMissing() {
    var ins = $("#inspector");
    ins.innerHTML = '<div class="ins-miss"><h2 id="ins-h" tabindex="-1">No entry with that id</h2>' +
      '<p class="t-m">The record has no entry called <code>' + esc(missingId) + "</code>.</p>" +
      '<p><a href="' + esc(urlFor(false)) + '">Clear it and show the entries</a></p></div>';
    ins.hidden = false;
    $("#ex-layout").classList.add("has-ins");
    document.body.classList.add("ins-open");
  }
  function swapDates() {
    if (F.from && F.to && F.from > F.to) { var t = F.from; F.from = F.to; F.to = t; $("#x-from").value = F.from; $("#x-to").value = F.to; CR.toast("The start date was after the end date, so the two are swapped.", 4000); }
  }
  function writeUrl(push) {
    var u = urlFor(true);
    if (push) { history.pushState({ id: openId }, "", u); } else { history.replaceState({ id: openId }, "", u); }
  }
  function nFilters() {
    var n = KEYS.filter(function (k) { return F[k]; }).length + (F.lab.length ? 1 : 0);
    return n;
  }

  /* ---------- filtering and sorting ---------- */

  function matches(e) {
    if (F.q && e._hay.indexOf(F.q.toLowerCase()) < 0) { return false; }
    if (F.model && (e.model_name + " " + (e.variants || []).join(" ")).toLowerCase().indexOf(F.model.toLowerCase()) < 0) { return false; }
    if (F.lab.length && F.lab.indexOf(e.org) < 0) { return false; }
    if (F.year && e._year !== F.year) { return false; }
    if (F.type && e.entry_type !== F.type) { return false; }
    if (F.avail && e.availability_class !== F.avail) { return false; }
    if (F.country && e._country !== F.country) { return false; }
    if (F.from && e.date < F.from) { return false; }
    if (F.to && e.date > F.to) { return false; }
    var sb = { gpqa: "gpqa-diamond", swe: "swe-bench-verified" };
    for (var k in sb) {
      if (!F[k]) { continue; }
      var s = e._score[sb[k]];
      if (F[k] === "any" && !s) { return false; }
      if (F[k] === "none" && s) { return false; }
      if ((F[k] === "INDEPENDENT" || F[k] === "LAB_REPORTED") && !(s && s[F[k]])) { return false; }
    }
    for (var d in DISC_KEY) { if (F[d] && e._disc[DISC_KEY[d]] !== F[d]) { return false; } }
    if (F.params === "count" && typeof e.parameters !== "number") { return false; }
    if (F.params === "none" && typeof e.parameters === "number") { return false; }
    if (F.origin && e.origin !== F.origin) { return false; }
    return true;
  }
  function compute() {
    var col = COLS.filter(function (c) { return c.k === SORT.k; })[0] || COLS[2];
    rows = D.entries.filter(matches);
    rows.sort(function (a, b) {
      var x = col.sort(a), y = col.sort(b);
      if (x < y) { return -SORT.dir; } if (x > y) { return SORT.dir; }
      return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? -1 : 1);
    });
  }

  /* ---------- cells ---------- */

  function provChip(cls, v) {
    var k = cls === "LAB_REPORTED" ? "lab" : "ind";
    return '<span class="sv sv-' + k + '" title="' + esc(CR.PROV_TITLES[cls]) + '"><span class="num">' + v + "</span>" + CR.provGlyph(cls, 9) + '<span class="sv-t">' + (k === "lab" ? "LAB" : "IND") + "</span></span>";
  }
  function scoreCell(e, b) {
    var s = e._score[b];
    var out = "";
    if (s) {
      if (s.INDEPENDENT) { out += provChip("INDEPENDENT", s.INDEPENDENT.value); }
      if (s.LAB_REPORTED) { out += provChip("LAB_REPORTED", s.LAB_REPORTED.value); }
      e._deltas.forEach(function (d) {
        if (d.kind === "delta" && d.benchmark === b) {
          out += '<span class="dl num" title="Change against the predecessor, ' + (d.source_class === "LAB_REPORTED" ? "lab-reported" : "independent") + ' scores on the same benchmark version">' + (d.value >= 0 ? "+" : "−") + Math.abs(d.value).toFixed(1) + "</span>";
        }
      });
    }
    return out || '<span class="na" aria-label="no score">-</span>';
  }
  function discCell(e, slot) {
    var st = e._disc[slot];
    return '<span class="dc dc-' + st + '" title="' + esc(CR.DISC_TITLES[st]) + '">' + CR.discGlyph(st, 10) + "<span>" + CR.DISC_WORDS[st] + "</span></span>";
  }
  function cell(c, e) {
    switch (c.k) {
      case "lab": return esc(e._orgName);
      case "date": return '<span class="num">' + e.date + "</span>";
      case "type": return e.entry_type === "revision" ? '<span class="tag" title="' + esc(CR.REVISION_GLOSS) + '">revision</span>' : '<span class="t-m">release</span>';
      case "avail": return esc(CR.AVAIL_NAMES[e.availability_class] || e.availability_class);
      case "country": return esc(e._country);
      case "gpqa": return scoreCell(e, "gpqa-diamond");
      case "swe": return scoreCell(e, "swe-bench-verified");
      case "params": return typeof e.parameters === "number" ? paramsHTML(e) : '<span class="nc" title="Epoch AI\'s data has no parameter count for this model. We have not checked whether the lab stated one.">no count</span>';
      case "origin": return '<span class="t-m">' + esc({ "backfill-epoch": "Epoch AI data", "nightly-pipeline": "nightly detection", "manual": "by hand" }[e.origin] || e.origin) + "</span>";
      default: return c.disc ? discCell(e, c.disc) : "";
    }
  }

  /* ---------- grid ---------- */

  var gridW = 0;
  var LOW = { type: 1, avail: 1, country: 1, swe: 1, mc: 1, up: 1, pa: 1, params: 1, origin: 1 };
  /* a fade at the right edge while more columns sit beyond it */
  function edgeCue() {
    var sc = $("#grid-scroll"), g = sc && sc.parentNode;
    if (g) { g.classList.toggle("more-right", sc.scrollWidth - sc.scrollLeft - sc.clientWidth > 4); }
  }
  function buildHead() {
    var t = $("#grid");
    /* while the inspector is open the low-priority columns fold away, so the
       columns that stay keep their full width and no value is cut */
    var cg = "<colgroup>" + COLS.map(function (c) { return '<col' + (LOW[c.k] ? ' class="lo"' : "") + ' style="width:' + c.w + 'px">'; }).join("") + "</colgroup>";
    gridW = COLS.reduce(function (a, c) { return a + c.w; }, 0);
    t.style.width = gridW + "px";
    t.style.setProperty("--gw-ins", COLS.reduce(function (a, c) { return a + (LOW[c.k] ? 0 : c.w); }, 0) + "px");
    var h1 = '<tr class="hrow">' + COLS.map(function (c, i) {
      return '<th scope="col" class="' + (i === 0 ? "stick " : "") + (c.num ? "n" : "") + '" aria-sort="none" data-k="' + c.k + '"><button type="button" class="sortb" data-k="' + c.k + '">' + esc(c.label) + '<span class="sg" aria-hidden="true"></span></button></th>';
    }).join("") + "</tr>";
    var h2 = '<tr class="frow">' + COLS.map(function (c, i) { return '<td class="' + (i === 0 ? "stick" : "") + '" data-slot="' + c.f.key + '"></td>'; }).join("") + "</tr>";
    t.innerHTML = cg + "<thead>" + h1 + h2 + '</thead><tbody id="grid-body"></tbody>';
  }

  /* One control per column, built once; on a phone the same controls move
     into the filters sheet, so the state never forks. */
  var CTRL = {};
  function buildControls() {
    COLS.forEach(function (c) {
      var wrap = document.createElement("label");
      wrap.className = "fctl";
      var lab = '<span class="fctl-l">' + esc(c.label) + "</span>";
      if (c.f.type === "text") {
        wrap.innerHTML = lab + '<input type="text" data-f="' + c.f.key + '" placeholder="' + esc(c.f.ph) + '" aria-label="' + esc(c.f.aria) + '" autocomplete="off" spellcheck="false">';
      } else {
        wrap.innerHTML = lab + '<select data-f="' + c.f.key + '" aria-label="' + esc(c.f.aria) + '"' + (c.f.title ? ' title="' + esc(c.f.title) + '"' : "") + ">" + opts(c.f.o) + "</select>";
      }
      CTRL[c.f.key] = wrap;
    });
    var t = null;
    Object.keys(CTRL).forEach(function (k) {
      var el = CTRL[k].querySelector("input, select");
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", function () {
        var v = el.value;
        clearTimeout(t);
        t = setTimeout(function () {
          if (k === "lab") { F.lab = v === "__multi" ? F.lab : (v ? [v] : []); } else { F[k] = v; }
          update(true);
        }, el.tagName === "INPUT" ? 140 : 0);
      });
    });
  }
  function placeControls() {
    var mobile = window.innerWidth <= 720;
    COLS.forEach(function (c) {
      var host = mobile ? $("#fsheet-body") : $('#grid .frow td[data-slot="' + c.f.key + '"]');
      if (host && CTRL[c.f.key].parentNode !== host) { host.appendChild(CTRL[c.f.key]); }
    });
  }
  function syncControls() {
    Object.keys(CTRL).forEach(function (k) {
      var el = CTRL[k].querySelector("input, select");
      if (k === "lab") {
        var multi = el.querySelector('option[value="__multi"]');
        if (F.lab.length > 1) {
          if (!multi) { multi = document.createElement("option"); multi.value = "__multi"; el.insertBefore(multi, el.children[1]); }
          multi.textContent = F.lab.length + " labs";
          el.value = "__multi";
        } else { if (multi) { multi.remove(); } el.value = F.lab[0] || ""; }
      } else if (document.activeElement !== el) { el.value = F[k]; }
      CTRL[k].classList.toggle("on", k === "lab" ? F.lab.length > 0 : !!F[k]);
    });
    if (document.activeElement !== $("#x-q")) { $("#x-q").value = F.q; }
    $("#x-from").value = F.from; $("#x-to").value = F.to;
    $$("#grid .hrow th").forEach(function (th) {
      var k = th.getAttribute("data-k");
      th.setAttribute("aria-sort", k === SORT.k ? (SORT.dir > 0 ? "ascending" : "descending") : "none");
      /* the sort buttons are one tab stop; the arrow keys move between them */
      $(".sortb", th).tabIndex = k === SORT.k ? 0 : -1;
    });
  }

  var range = [0, 0];
  function renderRows(force) {
    var sc = $("#grid-scroll");
    var headH = $("#grid thead").offsetHeight;
    var a = Math.max(0, Math.floor((sc.scrollTop - headH) / RH) - 8);
    var b = Math.min(rows.length, a + Math.ceil(sc.clientHeight / RH) + 18);
    if (!force && a === range[0] && b === range[1]) { return; }
    range = [a, b];
    var h = '<tr class="spacer" aria-hidden="true"><td colspan="' + COLS.length + '" style="height:' + a * RH + 'px"></td></tr>';
    for (var i = a; i < b; i++) {
      var e = rows[i];
      h += '<tr aria-rowindex="' + (i + 3) + '" data-i="' + i + '"' + (e.id === openId ? ' class="is-sel" aria-selected="true"' : "") + ">";
      COLS.forEach(function (c, j) {
        if (j === 0) {
          h += '<th scope="row" class="stick"><button type="button" class="rbtn" data-i="' + i + '" tabindex="' + (i === focusI ? 0 : -1) + '">' + esc(e.model_name) + "</button>" +
            (e.variants && e.variants.length ? '<span class="rv-n" title="Variants: ' + esc(e.variants.join(", ")) + '">+' + e.variants.length + "</span>" : "") +
            (e._retracted ? ' <span class="tag-retracted">retracted</span>' : "") + "</th>";
        } else {
          h += '<td class="' + (c.num ? "n" : "") + '">' + cell(c, e) + "</td>";
        }
      });
      h += "</tr>";
    }
    h += '<tr class="spacer" aria-hidden="true"><td colspan="' + COLS.length + '" style="height:' + (rows.length - b) * RH + 'px"></td></tr>';
    if (!rows.length) {
      h = '<tr><td colspan="' + COLS.length + '" class="g-empty"><div><p><b>No entries match this view.</b> The record covers the twelve tracked labs from ' + D.meta.first_date + " to " + D.meta.last_date + '.</p><button type="button" class="btn btn-sm" data-clear>Clear filters</button></div></td></tr>';
    }
    $("#grid-body").innerHTML = h;
  }

  function renderList() {
    var ml = $("#mlist");
    if (!rows.length) {
      ml.innerHTML = '<li class="g-empty"><p><b>No entries match this view.</b></p><button type="button" class="btn btn-sm" data-clear>Clear filters</button></li>';
      return;
    }
    var legend = '<li class="m-legend" aria-hidden="true"><span>Squares: system card, model card, usage policy, paper.</span>' +
      ["disclosed", "not_disclosed"].concat(rows.some(function (e) { return CR.DISC_SLOTS.some(function (sl) { return e._disc[sl[0]] === "not_researched"; }); }) ? ["not_researched"] : []).map(function (s) { return '<span class="lg-item">' + CR.discGlyph(s, 9) + " " + CR.DISC_WORDS[s] + "</span>"; }).join("") + "</li>";
    ml.innerHTML = legend + rows.map(function (e, i) {
      var s = e._score["gpqa-diamond"] || e._score["swe-bench-verified"];
      var sb = e._score["gpqa-diamond"] ? "GPQA" : "SWE";
      var sc = s ? '<span class="m-sc">' + sb + " " + (s.INDEPENDENT ? provChip("INDEPENDENT", s.INDEPENDENT.value) : "") + (s.LAB_REPORTED ? provChip("LAB_REPORTED", s.LAB_REPORTED.value) : "") + "</span>" : "";
      return '<li><button type="button" class="mrow' + (e.id === openId ? " is-sel" : "") + '" data-i="' + i + '">' +
        '<span class="m-name">' + esc(e.model_name) + (e._retracted ? ' <span class="tag-retracted">retracted</span>' : "") + "</span>" +
        '<span class="m-date num">' + e.date + "</span>" +
        '<span class="m-meta">' + esc(e._orgName) + ", " + esc(CR.AVAIL_NAMES[e.availability_class]) +
          (e.entry_type === "revision" && D.byId[e.predecessor] ? '<span class="m-rev" title="' + esc(CR.REVISION_GLOSS) + '">revision of ' + esc(D.byId[e.predecessor].model_name) + "</span>" : "") + "</span>" +
        '<span class="m-disc" aria-label="System card, model card, usage policy, paper: ' + CR.DISC_SLOTS.map(function (sl) { return CR.DISC_WORDS[e._disc[sl[0]]]; }).join(", ") + '">' + CR.DISC_SLOTS.map(function (sl) { return CR.discGlyph(e._disc[sl[0]], 9); }).join("") + "</span>" +
        sc + "</button></li>";
    }).join("");
  }

  function update(resetScroll) {
    compute();
    syncControls();
    var n = rows.length, nf = nFilters();
    $("#ex-count").innerHTML = 'Showing <b class="num">' + n + "</b> of " + D.entries.length + " entries";
    $("#x-clear").hidden = !nf;
    $("#x-filters-btn").textContent = nf ? "Filters (" + nf + ")" : "Filters";
    $("#fs-apply").textContent = "Show " + CR.plural(n, "entry", "entries");
    $("#grid").setAttribute("aria-rowcount", n + 2);
    if (resetScroll) { $("#grid-scroll").scrollTop = 0; focusI = 0; }
    focusI = Math.min(focusI, Math.max(0, n - 1));
    if (window.innerWidth <= 720) { renderList(); } else { renderRows(true); }
    writeUrl(false);
  }

  /* ---------- keyboard in the grid ---------- */

  function focusRow(i) {
    if (!rows.length) { return; }
    focusI = Math.max(0, Math.min(rows.length - 1, i));
    var sc = $("#grid-scroll"), headH = $("#grid thead").offsetHeight;
    var top = headH + focusI * RH, bottom = top + RH;
    if (top - headH < sc.scrollTop) { sc.scrollTop = top - headH; }
    else if (bottom > sc.scrollTop + sc.clientHeight) { sc.scrollTop = bottom - sc.clientHeight; }
    renderRows(true);
    var b = $('#grid-body .rbtn[data-i="' + focusI + '"]');
    if (b) { b.focus({ preventScroll: true }); }
  }
  function wireGrid() {
    var sc = $("#grid-scroll"), raf = 0;
    sc.addEventListener("scroll", function () { edgeCue(); if (!raf) { raf = requestAnimationFrame(function () { raf = 0; renderRows(false); }); } }, { passive: true });
    if (window.ResizeObserver) { var ro = new ResizeObserver(edgeCue); ro.observe(sc); ro.observe($("#grid")); }
    $("#grid").addEventListener("click", function (ev) {
      var s = ev.target.closest(".sortb");
      if (s) {
        var k = s.getAttribute("data-k");
        if (SORT.k === k) { SORT.dir = -SORT.dir; } else { SORT.k = k; SORT.dir = (k === "date" || COLS.filter(function (c) { return c.k === k; })[0].num) ? -1 : 1; }
        update(true);
        var nb = $('#grid .sortb[data-k="' + k + '"]'); if (nb) { nb.focus(); }
        return;
      }
      if (ev.target.closest("[data-clear]")) { clearAll(); return; }
      var tr = ev.target.closest("tbody tr[data-i]");
      if (tr && !ev.target.closest("a")) { var i = +tr.getAttribute("data-i"); focusI = i; openEntry(rows[i].id); }
    });
    $("#grid").addEventListener("keydown", function (ev) {
      var sb = ev.target.closest(".sortb");
      if (sb && (ev.key === "ArrowRight" || ev.key === "ArrowLeft" || ev.key === "Home" || ev.key === "End")) {
        var all = $$("#grid .sortb"), at = all.indexOf(sb);
        var to = ev.key === "Home" ? 0 : ev.key === "End" ? all.length - 1 : Math.max(0, Math.min(all.length - 1, at + (ev.key === "ArrowRight" ? 1 : -1)));
        ev.preventDefault();
        all.forEach(function (x, i) { x.tabIndex = i === to ? 0 : -1; });
        all[to].focus();
        all[to].scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
      var b = ev.target.closest(".rbtn"); if (!b) { return; }
      var i = +b.getAttribute("data-i"), page = Math.max(1, Math.floor($("#grid-scroll").clientHeight / RH) - 2);
      var map = { ArrowDown: i + 1, j: i + 1, ArrowUp: i - 1, k: i - 1, PageDown: i + page, PageUp: i - page, Home: 0, End: rows.length - 1 };
      if (ev.key in map) {
        ev.preventDefault(); ev.stopPropagation();
        focusRow(map[ev.key]);
        if (openId && (ev.key === "j" || ev.key === "k")) { openEntry(rows[focusI].id, true); }
      }
    });
    $("#mlist").addEventListener("click", function (ev) {
      if (ev.target.closest("[data-clear]")) { clearAll(); return; }
      var b = ev.target.closest(".mrow"); if (b) { focusI = +b.getAttribute("data-i"); openEntry(rows[focusI].id); }
    });
  }

  /* ---------- inspector ---------- */

  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (err) { return u; } }
  function archLink(u) {
    return u ? '<a href="' + esc(u) + '" rel="external noopener" target="_blank" class="arch">archived copy, <span class="num">' + CR.archiveDate(u) + "</span></a>" : '<span class="t-m">no archived copy yet</span>';
  }
  function inspectorHtml(e) {
    var pred = e.predecessor && D.byId[e.predecessor] ? D.byId[e.predecessor] : null;
    var outside = !matches(e);
    var h = '<div class="ins-head">' +
      '<button type="button" class="btn btn-sm ins-back" data-close-ins>Back to the list</button>' +
      '<div class="ins-nav"><button type="button" class="btn btn-sm" data-step="-1" aria-label="Previous entry in the list"' + (rowIndex(e.id) <= 0 ? " disabled" : "") + '>Previous <kbd>k</kbd></button><button type="button" class="btn btn-sm" data-step="1" aria-label="Next entry in the list"' + (rowIndex(e.id) < 0 || rowIndex(e.id) >= rows.length - 1 ? " disabled" : "") + '>Next <kbd>j</kbd></button>' +
      '<button type="button" class="btn btn-sm btn-icon ins-x" data-close-ins aria-label="Close the inspector (Escape)">×</button></div></div>';
    h += '<div class="ins-body">';
    if (outside) { h += '<p class="ins-out">This entry is outside the current filters. <button type="button" class="link-btn" data-clear>Clear filters</button></p>'; }
    h += '<p class="ins-kicker">' + esc(e._orgName) + ", " + '<span class="num">' + e.date + "</span>" + (e.entry_type === "revision" ? "," + CR.revisionOf(e, D) : "") + "</p>";
    h += '<h2 id="ins-h" tabindex="-1">' + esc(e.model_name) + "</h2>";
    if (e._retracted) { h += '<p class="ins-retracted"><b>Retracted.</b> ' + esc(e.retraction_note || "This entry should not have been on the record.") + "</p>"; }
    if (e.variants && e.variants.length) { h += '<p class="ins-var">Variants: ' + e.variants.map(esc).join(", ") + "</p>"; }
    h += '<div class="ins-acts"><button type="button" class="btn btn-sm" data-copy-entry>Copy link to this entry</button></div>';
    h += '<p class="ins-sum">' + esc(e.summary) + "</p>";
    if (e.correction_note) { h += '<p class="ins-corr"><b>Correction.</b> ' + esc(e.correction_note) + "</p>"; }

    h += '<dl class="ins-facts">' +
      "<div><dt>Availability</dt><dd>" + esc(CR.AVAIL_NAMES[e.availability_class] || e.availability_class) + "</dd></div>" +
      "<div><dt>Parameters</dt><dd>" + (typeof e.parameters === "number" ? paramsHTML(e) : '<span class="nc">no count on record</span>') + "</dd></div>" +
      "<div><dt>Country</dt><dd>" + esc(e._country) + "</dd></div>" +
      "<div><dt>Origin</dt><dd>" + esc(CR.ORIGIN_NAMES[e.origin] || e.origin) + "</dd></div>" +
      "<div><dt>Predecessor</dt><dd>" + (pred ? '<button type="button" class="link-btn" data-open="' + esc(pred.id) + '">' + esc(pred.model_name) + "</button>" : '<span class="t-m">none on record</span>') + "</dd></div>" +
      (e.license_note ? "<div><dt>License</dt><dd>" + esc(e.license_note) + "</dd></div>" : "") + "</dl>";

    /* scores */
    h += '<h3 class="ins-h3">Scores</h3>';
    var benches = Object.keys(e._score);
    if (!benches.length) { h += '<p class="t-m">No benchmark measurements recorded for this entry.</p>'; }
    benches.forEach(function (b) {
      h += '<div class="ins-bench"><p class="ib-name">' + esc(CR.BENCH[b] || b) + "</p>";
      ["INDEPENDENT", "LAB_REPORTED"].forEach(function (cls) {
        var s = e._score[b][cls]; if (!s) { return; }
        var p = s.provenance || {};
        h += '<div class="ib-row"><span class="ib-v num">' + s.value + "</span>" + CR.provTag(cls, p.source_url, p.retrieval_date) +
          '<span class="ib-src">' + (cls === "INDEPENDENT" ? "Epoch AI" : "the lab") + ", retrieved <span class=\"num\">" + esc(p.retrieval_date) + "</span>. Version: " + esc(p.benchmark_version || "") + ".</span>" +
          '<p class="ib-cfg"><span>' + (cls === "INDEPENDENT" ? "Model tested" : "Settings") + '</span> ' + (s.configuration ? esc(s.configuration) : "not stated") + "</p></div>";
      });
      e._deltas.forEach(function (d) {
        if (d.kind !== "delta" || d.benchmark !== b) { return; }
        h += '<p class="ib-delta"><span class="num">' + (d.value >= 0 ? "+" : "−") + Math.abs(d.value).toFixed(1) + "</span> against the predecessor" + (pred ? ", " + esc(pred.model_name) : "") +
          ' (<span class="num">' + d.predecessor + "</span> to <span class=\"num\">" + d.current + "</span>), " + (d.source_class === "INDEPENDENT" ? "both independent" : "both lab-reported") + ". " + CR.provTag(d.source_class, d.source_url, null) + "</p>";
      });
      h += "</div>";
    });
    e._deltas.forEach(function (d) {
      if (d.kind === "REFUSED_COMPARISON") { h += '<p class="ib-refused">' + esc(NO_CHANGE) + "</p>"; }
    });

    /* disclosure */
    h += '<h3 class="ins-h3">Disclosure</h3><dl class="ins-disc">';
    CR.DISC_SLOTS.forEach(function (sl) {
      var v = (e.disclosure_links || {})[sl[0]], st = e._disc[sl[0]];
      h += "<div><dt>" + sl[1] + "</dt><dd>" + CR.discMark(st);
      if (st === "disclosed") {
        h += '<span class="ins-links"><a href="' + esc(v) + '" rel="external noopener" target="_blank">' + esc(host(v)) + "</a>" + archLink((e.disclosure_archived || {})[sl[0]]) + "</span>";
      }
      h += "</dd></div>";
    });
    h += "</dl>";

    /* sources */
    h += '<h3 class="ins-h3">Sources</h3><ul class="ins-src">';
    (e.sources || []).forEach(function (s) {
      h += '<li><a href="' + esc(s.url) + '" rel="external noopener" target="_blank">' + esc(CR.SOURCE_KIND_NAMES[s.kind] || s.kind.replace(/_/g, " ")) + '</a> <span class="t-m">' + esc(host(s.url)) +
        '</span><span class="src-meta">Retrieved <span class="num">' + esc(s.retrieval_date) + "</span>. " + (s.archived_url ? archLink(s.archived_url) : (s.kind === "epoch_csv" ? '<span class="t-m">a dataset; no archived copy</span>' : '<span class="t-m">no archived copy yet</span>')) + "</span></li>";
    });
    h += "</ul>";
    h += '<p class="ins-foot">Entry id <code class="num">' + esc(e.id) + '</code>. See something wrong? <a href="https://github.com/wrobinson127/versioncontrol/issues/new">Report an error</a>.</p>';
    return h + "</div>";
  }
  function rowIndex(id) { for (var i = 0; i < rows.length; i++) { if (rows[i].id === id) { return i; } } return -1; }
  function openEntry(id, keepFocus) {
    var e = D.byId[id]; if (!e) { return; }
    var wasOpen = !!openId;
    openId = id;
    var ins = $("#inspector");
    ins.innerHTML = inspectorHtml(e);
    ins.hidden = false;
    document.body.classList.add("ins-open");
    $("#ex-layout").classList.add("has-ins");
    var ri = rowIndex(id); if (ri >= 0) { focusI = ri; }
    writeUrl(!wasOpen && window.innerWidth <= 720);
    document.title = e.model_name + ", " + e._orgName + ", Version Control explorer";
    if (window.innerWidth <= 720) { renderList(); } else { renderRows(true); }
    if (!keepFocus) { var hh = $("#ins-h"); if (hh) { hh.focus({ preventScroll: true }); } }
    ins.scrollTop = 0;
    edgeCue();
  }
  function closeEntry(fromPop) {
    if (!openId) { return; }
    var id = openId;
    openId = null;
    $("#inspector").hidden = true;
    $("#ex-layout").classList.remove("has-ins");
    document.body.classList.remove("ins-open");
    document.title = "Version Control explorer";
    if (!fromPop) { writeUrl(false); }
    if (window.innerWidth <= 720) {
      renderList();
      var mb = $$(".mrow").filter(function (b) { return rows[+b.getAttribute("data-i")].id === id; })[0];
      if (mb) { mb.focus(); }
    } else {
      renderRows(true);
      var ri = rowIndex(id); if (ri >= 0) { focusRow(ri); }
    }
    edgeCue();
  }
  function wireInspector() {
    var ins = $("#inspector");
    ins.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-close-ins]")) { if (window.innerWidth <= 720 && history.state && history.state.id) { history.back(); } else { closeEntry(); } return; }
      var st = ev.target.closest("[data-step]");
      if (st) { var i = rowIndex(openId) + (+st.getAttribute("data-step")); if (rows[i]) { openEntry(rows[i].id, true); } return; }
      var o = ev.target.closest("[data-open]"); if (o) { openEntry(o.getAttribute("data-open")); return; }
      if (ev.target.closest("[data-copy-entry]")) { CR.copyText(location.origin + location.pathname + "?id=" + encodeURIComponent(openId), "Link to this entry copied"); return; }
      if (ev.target.closest("[data-clear]")) { clearAll(); openEntry(openId); }
    });
    window.addEventListener("popstate", function () {
      var id = new URLSearchParams(location.search).get("id");
      if (id && D.byId[id]) { openEntry(id); } else { closeEntry(true); }
    });
  }

  /* ---------- toolbar, sheet, boot ---------- */

  function clearAll() {
    KEYS.forEach(function (k) { F[k] = ""; }); F.lab = [];
    update(true);
  }
  function wireToolbar() {
    var t = null;
    $("#x-q").addEventListener("input", function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { F.q = v.trim(); update(true); }, 140); });
    $("#x-q").addEventListener("keydown", function (ev) { if (ev.key === "Escape" && this.value) { ev.stopPropagation(); this.value = ""; F.q = ""; update(true); } if (ev.key === "ArrowDown" || ev.key === "Enter") { ev.preventDefault(); if (window.innerWidth > 720) { focusRow(0); } } });
    $("#x-from").addEventListener("change", function () { F.from = CR.validDate(this.value) ? this.value : ""; swapDates(); update(true); });
    $("#x-to").addEventListener("change", function () { F.to = CR.validDate(this.value) ? this.value : ""; swapDates(); update(true); });
    $("#x-clear").addEventListener("click", clearAll);
    $("#x-copy").addEventListener("click", function () { CR.copyText(location.href, "Link to this view copied"); });
    CR.wireDialog($("#fsheet"));
    $("#x-filters-btn").addEventListener("click", function () { CR.openDialog($("#fsheet"), "select, input"); });
    $("#fs-apply").addEventListener("click", function () { $("#fsheet").close(); });
    $("#fs-clear").addEventListener("click", clearAll);
    var lastMobile = window.innerWidth <= 720, rt = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var m = window.innerWidth <= 720;
        placeControls();
        if (m !== lastMobile) { lastMobile = m; update(false); } else if (!m) { renderRows(true); }
      }, 100);
    });
  }

  CR.initShell();
  CR.shortcut("f", "Focus the search box", function () { $("#x-q").focus(); $("#x-q").select(); }, "Explorer");
  CR.shortcut("j", "Next entry (opens it when the inspector is open)", function () { if (openId) { var i = rowIndex(openId) + 1; if (rows[i]) { openEntry(rows[i].id, true); } } else { focusRow(focusI); } }, "Explorer");
  CR.shortcut("k", "Previous entry", function () { if (openId) { var i = rowIndex(openId) - 1; if (rows[i]) { openEntry(rows[i].id, true); } } else { focusRow(focusI); } }, "Explorer");
  CR.shortcut("Escape", "Close the inspector", function () { if (openId) { closeEntry(); } }, "Explorer");
  CR.shortcut("l", "Copy a link to the open entry", function () { if (openId) { CR.copyText(location.origin + location.pathname + "?id=" + encodeURIComponent(openId), "Link to this entry copied"); } }, "Explorer");
  CR.shortcut("↓", "In the grid: move between rows (Page Down, Home and End work too)", null, "Explorer");

  CR.load().then(function (data) {
    D = data;
    defineCols();
    readUrl();
    CR.addRecordToPalette(D, function (o) { KEYS.forEach(function (k) { F[k] = ""; }); F.lab = [o]; update(true); }, function (e) { openEntry(e.id); });
    CR.paletteSource(function () {
      return [{ group: "Actions", rank: 30, title: "Clear filters", meta: nFilters() ? CR.plural(nFilters(), "filter") + " set" : "No filter is set", run: clearAll },
        { group: "Actions", rank: 31, title: "Show entries with an independent score", meta: "Any benchmark", run: function () { F.gpqa = "INDEPENDENT"; update(true); } },
        { group: "Actions", rank: 32, title: "Show releases with a system card on record", run: function () { F.type = "release"; F.sc = "disclosed"; update(true); } }];
    });
    buildHead();
    buildControls();
    placeControls();
    wireGrid(); wireInspector(); wireToolbar();
    $("#ex-sub").textContent = D.meta.releases + " releases and " + D.meta.revisions + " revisions (updates to a model already on record) from twelve tracked labs, " + D.meta.first_date + " to " + D.meta.last_date + ". Select a row for its sources.";
    update(false);
    edgeCue();
    document.documentElement.classList.add("ready");
    if (missingId) { showMissing(); }
    if (openId) { var id = openId; openId = null; openEntry(id); var ri = rowIndex(id); if (ri >= 0 && window.innerWidth > 720) { var sc = $("#grid-scroll"); sc.scrollTop = Math.max(0, ri * RH - sc.clientHeight / 3); renderRows(true); } }
  }).catch(function (err) {
    console.error(err);
    $("#grid-scroll").innerHTML = '<div class="load-error"><p>The record could not be loaded in this session (' + esc(err && err.message ? err.message : "unknown error") + ").</p><p>The dataset itself is unaffected; it is versioned with the site. Reloading the page retries the fetch.</p></div>";
  });
})();
