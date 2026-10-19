/* Version Control, concept C "Control Room": shared core.
   Data loading, record constants, formatting, the theme, the command
   palette, the shortcut sheet, the tooltip and the shell. Every number the
   console shows is computed here or in the page scripts from the published
   files at runtime; nothing is typed in. */

(function () {
  "use strict";

  /* ---------- record constants (mirror site/js/app.js) ---------- */

  var ORG_ORDER = ["openai", "anthropic", "google-deepmind", "meta", "xai", "mistral",
    "deepseek", "alibaba-qwen", "moonshot", "zai", "cohere", "amazon"];

  var ORG_NAMES = {
    "openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind",
    "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
    "alibaba-qwen": "Alibaba (Qwen)", "moonshot": "Moonshot AI", "zai": "Z.ai (Zhipu)",
    "cohere": "Cohere", "amazon": "Amazon (Nova)"
  };

  /* Country of the parent company's headquarters. Context for a filter only:
     never a ranking, never a grouping. */
  var ORG_COUNTRY = {
    "openai": "United States", "anthropic": "United States", "google-deepmind": "United States",
    "meta": "United States", "xai": "United States", "mistral": "France", "deepseek": "China",
    "alibaba-qwen": "China", "moonshot": "China", "zai": "China", "cohere": "Canada",
    "amazon": "United States"
  };

  var ORIGIN_NAMES = {
    "backfill-epoch": "from Epoch AI data",
    "nightly-pipeline": "found by nightly detection, approved by hand",
    "manual": "recorded by hand"
  };

  var AVAIL_NAMES = { "open_weights": "open weights", "public_api": "public API", "public_service": "public service" };

  var SOURCE_KIND_NAMES = { epoch_csv: "Epoch AI data", lab_link: "lab page", lab_announcement: "lab announcement", paper: "paper" };

  var DISC_SLOTS = [["system_card", "System card"], ["model_card", "Model card"], ["usage_policy", "Usage policy"], ["paper", "Paper"]];

  var BENCH = { "gpqa-diamond": "GPQA Diamond", "swe-bench-verified": "SWE-Bench Verified" };

  var DISC_WORDS = {
    disclosed: "link on record",
    not_disclosed: "not disclosed",
    not_researched: "not yet researched"
  };
  var DISC_TITLES = {
    disclosed: "A link is on record: the document exists. We do not grade what it says.",
    not_disclosed: "Not disclosed: we checked the lab's own sites and found nothing. Absence is the recorded signal, not a zero.",
    not_researched: "Not yet researched: a gap in our record, not a statement about the lab."
  };
  var PROV_TITLES = {
    LAB_REPORTED: "LAB: reported by the releasing lab.",
    INDEPENDENT: "IND: measured by an independent evaluator (Epoch AI)."
  };

  /* ---------- small utilities ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var DAY = 86400000;
  function dayNum(d) { return Math.round(Date.parse(d + "T00:00:00Z") / DAY); }
  function dateOf(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function validDate(s) {
    if (!s || !DATE_RE.test(s)) { return false; }
    var d = new Date(s + "T00:00:00Z");
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }

  /* The story's median: the middle value, or the mean of the two middle
     values; whole numbers print without a decimal. */
  function median(v) {
    v = v.slice().sort(function (a, b) { return a - b; });
    var n = v.length;
    if (!n) { return null; }
    var m = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
    return Math.round(m * 10) / 10;
  }
  function fmtNum(n) { return n == null ? "" : (Math.round(n * 10) / 10).toString(); }
  function pct(a, b) { return b ? Math.round(100 * a / b) : null; }
  function fmtParams(n) {
    var units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i][0]) {
        var v = n / units[i][0];
        return (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)) + units[i][1];
      }
    }
    return String(n);
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  var NUMWORDS = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve" };
  function nword(n) { return NUMWORDS[n] || String(n); }

  function discState(v) {
    if (v === "NOT_DISCLOSED") { return "not_disclosed"; }
    if (!v || v === "NOT_RESEARCHED") { return "not_researched"; }
    return "disclosed";
  }
  function archiveDate(u) {
    var m = /web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/.exec(u || "");
    return m ? m[1] + "-" + m[2] + "-" + m[3] : "date unknown";
  }

  /* ---------- glyphs (one source for marks and legends) ---------- */

  /* Disclosure: a filled square is a link on record, an empty square is a
     researched absence, a short dash is a gap in our own record. */
  function discGlyph(state, size) {
    var s = size || 10, h = s / 2;
    var inner;
    if (state === "disclosed") {
      inner = '<rect x="0.5" y="0.5" width="' + (s - 1) + '" height="' + (s - 1) + '" rx="1" class="g-dy"/>';
    } else if (state === "not_disclosed") {
      inner = '<rect x="1" y="1" width="' + (s - 2) + '" height="' + (s - 2) + '" rx="1" class="g-dn"/>';
    } else {
      inner = '<line x1="' + (s * 0.22) + '" y1="' + h + '" x2="' + (s * 0.78) + '" y2="' + h + '" class="g-dr"/>';
    }
    return '<svg class="dg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + " " + s + '" aria-hidden="true">' + inner + "</svg>";
  }
  /* Scores: a filled circle is independent, an open diamond is lab-reported. */
  function provGlyph(cls, size) {
    var s = size || 10, c = s / 2;
    if (cls === "INDEPENDENT") {
      return '<svg class="pg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + " " + s + '" aria-hidden="true"><circle cx="' + c + '" cy="' + c + '" r="' + (c - 1) + '" class="g-ind"/></svg>';
    }
    var r = c - 1.2;
    return '<svg class="pg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + " " + s + '" aria-hidden="true"><path d="M' + c + " " + (c - r) + " L" + (c + r) + " " + c + " L" + c + " " + (c + r) + " L" + (c - r) + " " + c + 'Z" class="g-lab"/></svg>';
  }
  function provTag(cls, url, retrieval) {
    var short = cls === "LAB_REPORTED" ? "LAB" : "IND";
    var title = (PROV_TITLES[cls] || cls) + (retrieval ? " Retrieved " + retrieval + "." : "") + (url ? " Follow the tag for the source." : "");
    var k = cls === "LAB_REPORTED" ? "lab" : "ind";
    var inner = provGlyph(cls, 9) + "<span>" + short + "</span>";
    if (url) {
      return '<a class="prov prov-' + k + '" href="' + esc(url) + '" title="' + esc(title) + '" rel="external noopener" target="_blank">' + inner + '<span class="sr"> (' + (k === "lab" ? "lab-reported" : "independent") + ", source)</span></a>";
    }
    return '<span class="prov prov-' + k + '" title="' + esc(title) + '">' + inner + "</span>";
  }
  function discMark(state, withWord) {
    return '<span class="dmark dm-' + state + '" title="' + esc(DISC_TITLES[state]) + '">' + discGlyph(state, 10) +
      (withWord === false ? '<span class="sr">' + DISC_WORDS[state] + "</span>" : "<span>" + DISC_WORDS[state] + "</span>") + "</span>";
  }

  /* ---------- data ---------- */

  var BASES = ["../../data/", "../../../data/", "./data/"];
  var base = null, baseP = null, manifestP = null;
  function fetchAt(b, p) {
    return fetch(b + p).then(function (r) { if (!r.ok) { throw new Error("HTTP " + r.status + " for " + p); } return r; });
  }
  function resolveBase() {
    if (baseP) { return baseP; }
    var i = 0;
    function next() {
      if (i >= BASES.length) { return Promise.reject(new Error("the data folder was not found")); }
      var b = BASES[i++];
      return fetchAt(b, "manifest.json").then(function (r) { base = b; manifestP = r.json(); return b; }, next);
    }
    baseP = next();
    return baseP;
  }
  function loadJson(p) { return resolveBase().then(function (b) { return fetchAt(b, p); }).then(function (r) { return r.json(); }); }
  function loadGz(p) {
    return resolveBase().then(function (b) { return fetchAt(b, p); }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      var head = new Uint8Array(buf.slice(0, 2));
      if (head.length === 2 && head[0] === 0x1f && head[1] === 0x8b && typeof DecompressionStream !== "undefined") {
        return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).json();
      }
      return JSON.parse(new TextDecoder().decode(buf));
    });
  }

  var loaded = null;
  function load() {
    if (loaded) { return loaded; }
    loaded = Promise.all([resolveBase().then(function () { return manifestP; }), loadGz("derived/views.json.gz"), loadGz("derived/deltas.json.gz"), loadJson("derived/site_meta.json")])
      .then(function (r) {
        var manifest = r[0];
        var files = Object.keys(manifest.files || {}).sort();
        return Promise.all(files.map(function (f) { return loadGz(f.replace(/^data\//, "")); })).then(function (arrs) {
          var entries = [];
          arrs.forEach(function (a) { entries = entries.concat(a); });
          return enrich({ entries: entries, views: r[1], deltas: r[2], meta: r[3], manifest: manifest });
        });
      });
    return loaded;
  }

  function enrich(D) {
    var byId = {};
    D.entries.sort(function (a, b) { return a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.id < b.id ? -1 : 1); });
    D.entries.forEach(function (e) {
      byId[e.id] = e;
      e._day = dayNum(e.date);
      e._year = e.date.slice(0, 4);
      e._orgName = ORG_NAMES[e.org] || e.org;
      e._country = ORG_COUNTRY[e.org] || "";
      e._rel = e.entry_type === "release";
      e._disc = {};
      DISC_SLOTS.forEach(function (s) { e._disc[s[0]] = discState((e.disclosure_links || {})[s[0]]); });
      e._score = {};
      (e.benchmarks || []).forEach(function (b) {
        var p = b.provenance || {};
        (e._score[b.benchmark] = e._score[b.benchmark] || {})[p.source_class] = b;
      });
      e._deltas = D.deltas[e.id] || [];
      e._hay = (e.model_name + " " + (e.variants || []).join(" ") + " " + e.id + " " + e._orgName).toLowerCase();
    });
    D.byId = byId;
    D.releases = D.entries.filter(function (e) { return e._rel; });
    D.asOf = D.views.tiles.as_of;
    D.asOfDay = dayNum(D.asOf);
    D.startDay = dayNum(D.meta.first_date);

    /* the record and the derived matrix must agree: any drift is a bug */
    var dm = D.views.disclosure_matrix;
    console.assert(dm.rows.length === D.releases.length, "matrix rows match releases");
    var sc = { disclosed: 0, not_disclosed: 0, not_researched: 0 };
    D.releases.forEach(function (e) { sc[e._disc.system_card]++; });
    console.assert(sc.disclosed === dm.counts.system_card.disclosed && sc.not_disclosed === dm.counts.system_card.not_disclosed,
      "system card counts match the derived matrix");
    console.assert(D.entries.length === D.meta.entry_count, "entry count matches site_meta");
    return D;
  }

  /* ---------- shared computations ---------- */

  /* Shares divide by researched releases only. */
  function discCounts(list, slot) {
    var c = { disclosed: 0, not_disclosed: 0, not_researched: 0 };
    list.forEach(function (e) { if (e._rel) { c[e._disc[slot]]++; } });
    c.researched = c.disclosed + c.not_disclosed;
    c.share = c.researched ? c.disclosed / c.researched : null;
    return c;
  }
  /* pooled gaps: consecutive releases in date order, same-day = 0 */
  function pooledGaps(list) {
    var d = list.filter(function (e) { return e._rel; }).map(function (e) { return e._day; }).sort(function (a, b) { return a - b; });
    var g = [];
    for (var i = 1; i < d.length; i++) { g.push(d[i] - d[i - 1]); }
    return g;
  }
  /* a lab's own gaps count same-day releases once (the story's rule) */
  function labGaps(list) {
    var seen = {}, d = [];
    list.forEach(function (e) { if (e._rel && !seen[e._day]) { seen[e._day] = 1; d.push(e._day); } });
    d.sort(function (a, b) { return a - b; });
    var g = [];
    for (var i = 1; i < d.length; i++) { g.push({ day: d[i], gap: d[i] - d[i - 1] }); }
    return g;
  }
  /* "At first" is the median of a lab's first third of gaps on record;
     "lately" is the median of its last third. */
  function firstLately(list) {
    var g = labGaps(list).map(function (x) { return x.gap; });
    if (g.length < 3) { return null; }
    var k = Math.max(1, Math.floor(g.length / 3));
    return { first: median(g.slice(0, k)), lately: median(g.slice(-k)), n: g.length };
  }
  /* the lab's score and Epoch's score on the same entry and benchmark */
  function pairs(D) {
    var out = [];
    D.entries.forEach(function (e) {
      Object.keys(e._score).forEach(function (b) {
        var s = e._score[b];
        if (s.LAB_REPORTED && s.INDEPENDENT) {
          out.push({ e: e, bench: b, lab: s.LAB_REPORTED, ind: s.INDEPENDENT });
        }
      });
    });
    return out.sort(function (a, b) { return a.e.date < b.e.date ? -1 : 1; });
  }
  /* the reasoning setting each side ran at, read from the configuration on
     record (the story's rule); anything else is "not stated" */
  var LVL = "(xhigh|x-high|high|medium|low|max)";
  function labSetting(cfg) {
    var c = (cfg || "").toLowerCase();
    var m = new RegExp("think " + LVL).exec(c) || new RegExp(LVL + " thinking").exec(c) || new RegExp("effort (?:set to |of )?" + LVL).exec(c);
    if (!m) { return { lvl: null, words: "not stated" }; }
    var lvl = m[1].replace("-", "");
    return { lvl: lvl, words: lvl + (m[0].indexOf("think") >= 0 ? " thinking" : " effort") };
  }
  function indSetting(cfg) {
    var m = new RegExp("_" + LVL + "$").exec((cfg || "").toLowerCase());
    if (!m) { return { lvl: null, words: "not stated" }; }
    var lvl = m[1].replace("-", "");
    return { lvl: lvl, words: lvl + " effort" };
  }

  /* ---------- theme ---------- */

  function getTheme() { return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("cr-theme", t); } catch (err) { /* storage blocked: the choice lasts this page view */ }
    $$("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", t === "light" ? "true" : "false");
      var l = b.querySelector(".tt-word"); if (l) { l.textContent = t === "light" ? "Light" : "Dark"; }
    });
    document.dispatchEvent(new CustomEvent("cr:theme", { detail: t }));
  }
  function toggleTheme() { setTheme(getTheme() === "light" ? "dark" : "light"); }

  /* ---------- tooltip ---------- */

  var tipEl = null;
  function tip(html, x, y) {
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; tipEl.setAttribute("role", "status"); document.body.appendChild(tipEl); }
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = x + 14, top = y + 14;
    if (left + w > vw - 8) { left = Math.max(8, x - w - 14); }
    if (top + h > vh - 8) { top = Math.max(8, y - h - 14); }
    tipEl.style.transform = "translate(" + Math.round(left) + "px," + Math.round(top) + "px)";
  }
  function untip() { if (tipEl) { tipEl.hidden = true; } }

  var toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 1800);
  }
  function copyText(text, msg) {
    var ok = function () { toast(msg || "Link copied"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { toast("Copy blocked. The address bar holds the link."); });
    } else { toast("Copy blocked. The address bar holds the link."); }
  }

  /* ---------- shortcuts ---------- */

  var shortcuts = [];
  var pendingG = false, gTimer = null;
  function shortcut(keys, label, fn, group) { shortcuts.push({ keys: keys, label: label, fn: fn, group: group || "Everywhere" }); }
  function typing(t) {
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }
  function onKey(ev) {
    var k = ev.key;
    if ((ev.metaKey || ev.ctrlKey) && (k === "k" || k === "K")) { ev.preventDefault(); openPalette(); return; }
    if (ev.metaKey || ev.ctrlKey || ev.altKey) { return; }
    if (typing(ev.target)) { return; }
    if (document.querySelector("dialog[open]")) { return; }
    if (pendingG) {
      pendingG = false; clearTimeout(gTimer);
      for (var j = 0; j < shortcuts.length; j++) {
        if (shortcuts[j].keys === "g " + k && shortcuts[j].fn) { ev.preventDefault(); shortcuts[j].fn(ev); return; }
      }
      return;
    }
    if (k === "g") { pendingG = true; gTimer = setTimeout(function () { pendingG = false; }, 900); return; }
    for (var i = 0; i < shortcuts.length; i++) {
      if (shortcuts[i].keys === k && shortcuts[i].fn) { ev.preventDefault(); shortcuts[i].fn(ev); return; }
    }
  }

  /* ---------- dialogs ---------- */

  function openDialog(d, focusSel) {
    if (!d) { return; }
    untip();
    d._return = document.activeElement;
    if (typeof d.showModal === "function") { d.showModal(); } else { d.setAttribute("open", ""); }
    var f = focusSel ? d.querySelector(focusSel) : null;
    if (f) { f.focus(); }
  }
  function closeDialog(d) {
    if (!d || !d.open) { return; }
    d.close();
  }
  function wireDialog(d) {
    if (!d || d._wired) { return; }
    d._wired = true;
    d.addEventListener("close", function () { if (d._return && d._return.focus) { d._return.focus(); } });
    d.addEventListener("click", function (ev) { if (ev.target === d) { d.close(); } });
    $$("[data-close]", d).forEach(function (b) { b.addEventListener("click", function () { d.close(); }); });
  }

  /* ---------- command palette ---------- */

  var paletteItems = [];
  var palSel = 0, palList = [];
  function paletteSource(fn) { paletteItems.push(fn); }

  function score(q, text) {
    if (!q) { return 1; }
    var t = text.toLowerCase();
    var i = t.indexOf(q);
    if (i === 0) { return 100 - t.length * 0.01; }
    if (i > 0) { return (/[\s\-(.]/.test(t.charAt(i - 1)) ? 80 : 60) - i * 0.1; }
    /* subsequence */
    var qi = 0, gaps = 0, last = -1;
    for (var k = 0; k < t.length && qi < q.length; k++) {
      if (t.charAt(k) === q.charAt(qi)) { if (last >= 0) { gaps += k - last - 1; } last = k; qi++; }
    }
    return qi === q.length ? Math.max(1, 40 - gaps) : 0;
  }

  function renderPalette() {
    var d = $("#palette");
    var q = $("#pal-q").value.trim().toLowerCase();
    var all = [];
    paletteItems.forEach(function (fn) { all = all.concat(fn()); });
    var scored = all.map(function (it) {
      return { it: it, s: Math.max(score(q, it.title), it.alt ? score(q, it.alt) * 0.9 : 0) };
    }).filter(function (x) { return x.s > 0; });
    if (q) { scored.sort(function (a, b) { return b.s - a.s || a.it.rank - b.it.rank; }); }
    var groups = {}, order = ["Views", "Actions", "Labs", "Models"];
    scored.forEach(function (x) { (groups[x.it.group] = groups[x.it.group] || []).push(x.it); });
    if (!q && groups.Models) { groups.Models = groups.Models.slice(0, 8); }
    palList = [];
    var html = "";
    order.forEach(function (g) {
      var items = (groups[g] || []).slice(0, q ? (g === "Models" ? 30 : 8) : 12);
      if (!items.length) { return; }
      html += '<li class="pal-g" role="presentation">' + g + "</li>";
      items.forEach(function (it) {
        var i = palList.length; palList.push(it);
        html += '<li role="option" id="pal-o' + i + '" class="pal-o" data-i="' + i + '" aria-selected="false">' +
          '<span class="pal-t">' + esc(it.title) + "</span>" + (it.meta ? '<span class="pal-m">' + esc(it.meta) + "</span>" : "") +
          (it.hint ? '<kbd class="pal-k">' + esc(it.hint) + "</kbd>" : "") + "</li>";
      });
    });
    if (!palList.length) {
      html = '<li class="pal-empty" role="presentation">Nothing matches “' + esc(q) + '”. The record holds the twelve tracked labs; try a model name or a lab.</li>';
    }
    $("#pal-list", d).innerHTML = html;
    $("#pal-count", d).textContent = palList.length ? plural(palList.length, "result") : "No results";
    palSel = 0; markPal();
  }
  function markPal() {
    var opts = $$(".pal-o", $("#palette"));
    opts.forEach(function (o, i) { o.setAttribute("aria-selected", i === palSel ? "true" : "false"); });
    var cur = opts[palSel];
    var inp = $("#pal-q");
    if (cur) { inp.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
    else { inp.removeAttribute("aria-activedescendant"); }
  }
  function runPal(i) {
    var it = palList[i];
    if (!it) { return; }
    closeDialog($("#palette"));
    setTimeout(function () { it.run(); }, 0);
  }
  function openPalette(prefill) {
    var d = $("#palette");
    if (!d) { return; }
    var q = $("#pal-q");
    q.value = prefill || "";
    renderPalette();
    openDialog(d, "#pal-q");
  }
  function wirePalette() {
    var d = $("#palette");
    if (!d) { return; }
    wireDialog(d);
    var q = $("#pal-q");
    q.addEventListener("input", renderPalette);
    q.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); palSel = Math.min(palList.length - 1, palSel + 1); markPal(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); palSel = Math.max(0, palSel - 1); markPal(); }
      else if (ev.key === "Enter") { ev.preventDefault(); runPal(palSel); }
      else if (ev.key === "Home" && ev.ctrlKey) { palSel = 0; markPal(); }
    });
    $("#pal-list", d).addEventListener("click", function (ev) {
      var o = ev.target.closest(".pal-o"); if (o) { runPal(+o.getAttribute("data-i")); }
    });
    $("#pal-list", d).addEventListener("mousemove", function (ev) {
      var o = ev.target.closest(".pal-o"); if (o && +o.getAttribute("data-i") !== palSel) { palSel = +o.getAttribute("data-i"); markPal(); }
    });
  }

  /* ---------- help sheet ---------- */

  function renderHelp() {
    var d = $("#help");
    if (!d) { return; }
    var groups = {};
    var rows = [{ keys: "Ctrl K", label: "Open the command palette (Cmd K on a Mac)", group: "Everywhere" }].concat(shortcuts);
    rows.forEach(function (s) { (groups[s.group] = groups[s.group] || []).push(s); });
    var html = "";
    Object.keys(groups).forEach(function (g) {
      html += "<h3>" + esc(g) + "</h3><dl>";
      groups[g].forEach(function (s) {
        html += "<div><dt>" + s.keys.split(" ").map(function (k) { return "<kbd>" + esc(k === "Escape" ? "Esc" : k) + "</kbd>"; }).join(s.keys.indexOf("g ") === 0 ? " then " : " ") + "</dt><dd>" + esc(s.label) + "</dd></div>";
      });
      html += "</dl>";
    });
    $("#help-body", d).innerHTML = html;
  }
  function openHelp() { renderHelp(); openDialog($("#help"), "[data-close]"); }

  /* ---------- shell ---------- */

  function here() { return location.pathname.split("/").pop() || "index.html"; }

  function initShell() {
    document.addEventListener("keydown", onKey);
    wirePalette();
    wireDialog($("#help"));
    $$("[data-theme-toggle]").forEach(function (b) { b.addEventListener("click", toggleTheme); });
    setTheme(getTheme());
    $$("[data-open-palette]").forEach(function (b) { b.addEventListener("click", function () { openPalette(); }); });
    $$("[data-open-help]").forEach(function (b) { b.addEventListener("click", openHelp); });

    /* the platform's own modifier in the search hint */
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    $$(".kmod").forEach(function (k) { k.textContent = mac ? "⌘" : "Ctrl"; });

    shortcut("/", "Search models, labs and views", function () { openPalette(); });
    shortcut("?", "Show these shortcuts", openHelp);
    shortcut("t", "Switch between dark and light", toggleTheme);
    shortcut("g o", "Go to the overview", function () { location.href = "index.html"; }, "Go to");
    shortcut("g e", "Go to the explorer", function () { location.href = "explorer.html"; }, "Go to");
    shortcut("g m", "Go to the methodology", function () { location.href = "page.html"; }, "Go to");

    paletteSource(function () {
      var p = here();
      var v = [
        { title: "Overview", meta: "The console: cadence, labs, scores, disclosure", hint: "g o", run: function () { location.href = "index.html"; } },
        { title: "Explorer", meta: "Every entry, searchable and filterable", hint: "g e", run: function () { location.href = "explorer.html"; } },
        { title: "Methodology", meta: "The four rules every number follows", hint: "g m", run: function () { location.href = "page.html"; } },
        { title: "Data downloads", meta: "CSV and gzipped JSON, CC BY 4.0", run: function () { location.href = "../../data.html"; } },
        { title: "The story", meta: "The record told in order, with a text version", run: function () { location.href = "../../story.html"; } }
      ];
      v.forEach(function (x, i) { x.group = "Views"; x.rank = i; if ((p === "index.html" && x.title === "Overview") || (p === x.title.toLowerCase() + ".html")) { x.meta = "You are here. " + x.meta; } });
      var a = [
        { title: "Switch theme", meta: "Dark and light, remembered on this device", hint: "t", run: toggleTheme },
        { title: "Keyboard shortcuts", meta: "Every key the console answers to", hint: "?", run: openHelp },
        { title: "Copy a link to this view", meta: "Filters and selection travel in the address", run: function () { copyText(location.href); } }
      ];
      a.forEach(function (x, i) { x.group = "Actions"; x.rank = 10 + i; });
      return v.concat(a);
    });

    renderFooterStamp();
  }

  function renderFooterStamp() {
    var el = $("#foot-update");
    if (!el) { return; }
    load().then(function (D) {
      var m = D.meta;
      var age = Math.floor((Date.now() - Date.parse(m.last_successful_update + "T00:00:00Z")) / DAY);
      var t = "Last successful update: " + m.last_successful_update + ".";
      if (age > 3) { t += " This record is " + age + " days old: no new entries have been approved since " + m.last_successful_update + ". New releases wait in a review queue until a person approves them."; }
      el.textContent = t;
    }).catch(function () { el.textContent = "Update record unavailable in this session."; });
  }

  /* ---------- shared palette sources that need the record ---------- */

  function addRecordToPalette(D, onLab, onModel) {
    paletteSource(function () {
      return ORG_ORDER.map(function (o, i) {
        var n = D.entries.filter(function (e) { return e.org === o; }).length;
        return { group: "Labs", rank: 100 + i, title: ORG_NAMES[o], alt: o, meta: ORG_COUNTRY[o] + ", " + plural(n, "entry", "entries"), run: function () { onLab(o); } };
      });
    });
    paletteSource(function () {
      return D.entries.map(function (e, i) {
        return { group: "Models", rank: 1000 + i, title: e.model_name, alt: (e.variants || []).join(" ") + " " + e._orgName, meta: e._orgName + ", " + e.date + (e.entry_type === "revision" ? ", revision" : ""), run: function () { onModel(e); } };
      });
    });
  }

  window.CR = {
    ORG_ORDER: ORG_ORDER, ORG_NAMES: ORG_NAMES, ORG_COUNTRY: ORG_COUNTRY, ORIGIN_NAMES: ORIGIN_NAMES,
    AVAIL_NAMES: AVAIL_NAMES, SOURCE_KIND_NAMES: SOURCE_KIND_NAMES, DISC_SLOTS: DISC_SLOTS, BENCH: BENCH,
    DISC_WORDS: DISC_WORDS, DISC_TITLES: DISC_TITLES, PROV_TITLES: PROV_TITLES,
    esc: esc, $: $, $$: $$, dayNum: dayNum, dateOf: dateOf, validDate: validDate, median: median, fmtNum: fmtNum,
    pct: pct, fmtParams: fmtParams, plural: plural, nword: nword, archiveDate: archiveDate,
    discGlyph: discGlyph, provGlyph: provGlyph, provTag: provTag, discMark: discMark,
    load: load, discCounts: discCounts, pooledGaps: pooledGaps, labGaps: labGaps, firstLately: firstLately,
    pairs: pairs, labSetting: labSetting, indSetting: indSetting,
    getTheme: getTheme, setTheme: setTheme, toggleTheme: toggleTheme,
    tip: tip, untip: untip, toast: toast, copyText: copyText,
    shortcut: shortcut, openPalette: openPalette, paletteSource: paletteSource, addRecordToPalette: addRecordToPalette,
    openDialog: openDialog, closeDialog: closeDialog, wireDialog: wireDialog, openHelp: openHelp,
    reducedMotion: function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; },
    initShell: initShell
  };
})();
