/* Version Control: the shared core, loaded on every page.
   Data loading, record constants, formatting, the theme, the command
   palette, the shortcut sheet, Compare, the tooltip and the shell. Every
   number the site shows is computed here or in the page scripts from the
   published files at runtime; nothing is typed in. */

(function () {
  "use strict";

  /* ---------- record constants (tests hold these to pipeline/config.py) ---------- */

  var ORG_ORDER = ["openai", "anthropic", "google-deepmind", "meta", "xai", "mistral",
    "deepseek", "alibaba-qwen", "moonshot", "zai", "cohere", "amazon"];

  var ORG_NAMES = {
    "openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind",
    "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
    "alibaba-qwen": "Alibaba (Qwen)", "moonshot": "Moonshot AI", "zai": "Z.ai (Zhipu)",
    "cohere": "Cohere", "amazon": "Amazon"
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
    not_disclosed: "not disclosed (we checked)",
    not_researched: "not yet checked"
  };
  var DISC_TITLES = {
    disclosed: "The document exists. We do not grade what it says.",
    not_disclosed: "We checked the lab's own sites and found nothing.",
    not_researched: "We have not looked yet."
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
  /* A revision is read in place: the tag names the model it updates, and
     its title carries the one-line gloss. */
  var REVISION_GLOSS = "Revision: an update to a model already on record.";
  function revisionOf(e, D) {
    var p = D && D.byId[e.predecessor];
    return ' <span class="tag tag-rev" title="' + esc(REVISION_GLOSS) + '">revision of ' + esc(p ? p.model_name : "an earlier entry") + "</span>";
  }
  function discMark(state, withWord) {
    return '<span class="dmark dm-' + state + '" title="' + esc(DISC_TITLES[state]) + '">' + discGlyph(state, 10) +
      (withWord === false ? '<span class="sr">' + DISC_WORDS[state] + "</span>" : "<span>" + DISC_WORDS[state] + "</span>") + "</span>";
  }

  /* ---------- data ---------- */

  /* deployed: data/ beside the pages; repository layout: site/ next to data/ */
  var BASES = ["./data/", "../data/", "/data/"];
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
      e._retracted = e.retracted === true;
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
  /* pooled gaps: consecutive releases in date order, same-day = 0. A gap
     counts only between two releases in the same calendar year. */
  function pooledGaps(list) {
    var d = list.filter(function (e) { return e._rel; }).sort(function (a, b) { return a._day - b._day; });
    var g = [];
    for (var i = 1; i < d.length; i++) { if (d[i]._year === d[i - 1]._year) { g.push(d[i]._day - d[i - 1]._day); } }
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

  /* With no saved choice the site follows the system light or dark setting;
     a choice made with the toggle is saved and wins. */
  function getTheme() { return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function savedTheme() {
    try { var t = localStorage.getItem("vc-theme"); return t === "light" || t === "dark" ? t : null; } catch (err) { return null; }
  }
  function setTheme(t, keep) {
    document.documentElement.setAttribute("data-theme", t);
    if (keep !== false) {
      try { localStorage.setItem("vc-theme", t); } catch (err) { /* storage blocked: the choice lasts this page view */ }
    }
    $$("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", t === "light" ? "true" : "false");
      var l = b.querySelector(".tt-word"); if (l) { l.textContent = t === "light" ? "Light" : "Dark"; }
    });
    document.dispatchEvent(new CustomEvent("vc:theme", { detail: t }));
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

  /* The sections, in navigation order. One list feeds the palette, the
     go-to shortcuts and the "you are here" marks. */
  var SECTIONS = [
    { file: "index.html", title: "Overview", meta: "The overview: cadence, labs, scores, disclosure", key: "o" },
    { file: "story.html", title: "Story", meta: "The record in five views, with a text version", key: "s" },
    { file: "explorer.html", title: "Explorer", meta: "Every entry, searchable and filterable", key: "e" },
    { file: "methodology.html", title: "Methodology", meta: "The rules every number follows", key: "m" },
    { file: "data.html", title: "Data", meta: "CSV and gzipped JSON, CC BY 4.0", key: "d" },
    { file: "about.html", title: "About", meta: "What this is, and who keeps it", key: "a" },
    { file: "changes.html", title: "Changes and corrections", meta: "Every correction, retraction and addition", key: "c" }
  ];

  function here() { return location.pathname.split("/").pop() || "index.html"; }

  /* The dialogs need script to work, so script adds them: one copy of their
     markup for every page instead of one per page. */
  var DIALOGS =
    '<dialog class="sheet palette" id="palette" aria-label="Command palette">' +
      '<div class="pal-head"><label for="pal-q" class="sr">Search models, labs, views and actions</label>' +
      '<input id="pal-q" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Jump to a model, a lab or a view">' +
      '<button type="button" class="btn btn-sm" data-close>Esc</button></div>' +
      '<ul id="pal-list" class="pal-list" role="listbox" aria-label="Results"></ul>' +
      '<p class="pal-foot"><span id="pal-count"></span><span><kbd>↑</kbd><kbd>↓</kbd> to move, <kbd>Enter</kbd> to open</span></p>' +
    "</dialog>" +
    '<dialog class="sheet help" id="help" aria-labelledby="help-h">' +
      '<div class="sheet-head"><h2 id="help-h">Keyboard shortcuts</h2><button type="button" class="btn btn-sm" data-close>Close</button></div>' +
      '<div id="help-body" class="help-body"></div>' +
    "</dialog>" +
    '<dialog class="sheet compare" id="compare" aria-labelledby="cmp-h">' +
      '<div class="sheet-head"><h2 id="cmp-h">Compare two labs</h2>' +
        '<div class="cmp-pick"><label class="sel"><span class="sr">First lab</span><select id="cmp-a" aria-label="First lab"></select></label>' +
        '<button type="button" class="btn btn-sm" id="cmp-swap" aria-label="Swap the two labs">Swap</button>' +
        '<label class="sel"><span class="sr">Second lab</span><select id="cmp-b" aria-label="Second lab"></select></label></div>' +
        '<button type="button" class="btn btn-sm" data-close>Close</button></div>' +
      '<p class="cmp-note">Two records side by side, on the same scales.</p>' +
      '<div class="cmp-body" id="cmp-body"></div>' +
    "</dialog>";

  function initShell() {
    if (!$("#palette")) { document.body.insertAdjacentHTML("beforeend", DIALOGS); }
    document.addEventListener("keydown", onKey);
    wirePalette();
    wireDialog($("#help"));
    wireCompare();
    $$("[data-theme-toggle]").forEach(function (b) { b.addEventListener("click", toggleTheme); });
    setTheme(getTheme(), false);
    var sys = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)");
    if (sys && sys.addEventListener) {
      sys.addEventListener("change", function (ev) { if (!savedTheme()) { setTheme(ev.matches ? "light" : "dark", false); } });
    }
    $$("[data-open-palette]").forEach(function (b) { b.addEventListener("click", function () { openPalette(); }); });
    $$("[data-open-help]").forEach(function (b) { b.addEventListener("click", openHelp); });
    $$("[data-open-compare]").forEach(function (b) { b.addEventListener("click", function (ev) { ev.preventDefault(); openCompare(); }); });

    /* the platform's own modifier in the search hint */
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    $$(".kmod").forEach(function (k) { k.textContent = mac ? "⌘" : "Ctrl"; });

    shortcut("/", "Search models, labs and views", function () { openPalette(); });
    shortcut("?", "Show these shortcuts", openHelp);
    shortcut("t", "Switch between dark and light", toggleTheme);
    shortcut("c", "Compare two labs", function () { openCompare(); });
    var GO = { o: "the overview", s: "the story", e: "the explorer", m: "the methodology", d: "the data downloads" };
    SECTIONS.slice(0, 5).forEach(function (s) {
      shortcut("g " + s.key, "Go to " + GO[s.key], function () { location.href = s.file; }, "Go to");
    });

    paletteSource(function () {
      var p = here();
      var v = SECTIONS.map(function (s, i) {
        return { group: "Views", rank: i, title: s.title, meta: (p === s.file ? "You are here. " : "") + s.meta, hint: i < 5 ? "g " + s.key : "", run: function () { location.href = s.file; } };
      });
      var a = [
        { title: "Compare two labs", meta: "Side by side on the same scales", hint: "c", run: function () { openCompare(); } },
        { title: "Switch theme", meta: "Dark and light, remembered on this device", hint: "t", run: toggleTheme },
        { title: "Keyboard shortcuts", meta: "Every key the site answers to", hint: "?", run: openHelp },
        { title: "Copy a link to this view", meta: "Filters and selection travel in the address", run: function () { copyText(location.href); } }
      ];
      a.forEach(function (x, i) { x.group = "Actions"; x.rank = 10 + i; });
      return v.concat(a);
    });

    renderFooterStamp();
    var cp = (new URLSearchParams(location.search).get("compare") || "").split(",");
    if (cp.length === 2 && ORG_NAMES[cp[0]] && ORG_NAMES[cp[1]] && cp[0] !== cp[1]) { openCompare(cp[0], cp[1]); }
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
    onLab = onLab || function (o) { location.href = "explorer.html?lab=" + o; };
    onModel = onModel || function (e) { location.href = "explorer.html?id=" + encodeURIComponent(e.id); };
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

  /* ---------- compare: two labs on shared scales, from any page ---------- */

  var cmp = { a: "openai", b: "anthropic" };
  function svgOpen(w, h, cls, label) {
    return '<svg class="' + (cls || "") + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '"' +
      (label ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + ">";
  }
  function compareParam() { var d = $("#compare"); return d && d.open ? cmp.a + "," + cmp.b : null; }
  function writeCompareUrl() {
    var p = new URLSearchParams(location.search), v = compareParam();
    if (v) { p.set("compare", v); } else { p.delete("compare"); }
    var q = p.toString();
    history.replaceState(history.state, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }
  function openCompare(a, b) {
    var d = $("#compare");
    if (!d) { return; }
    if (!a && !b && typeof window.CR.compareDefault === "function") { var dft = window.CR.compareDefault() || []; a = dft[0]; b = dft[1]; }
    if (a) { cmp.a = a; } if (b) { cmp.b = b; }
    if (cmp.a === cmp.b) { cmp.b = ORG_ORDER.filter(function (o) { return o !== cmp.a; })[0]; }
    $("#cmp-a").value = cmp.a; $("#cmp-b").value = cmp.b;
    if (!d.open) { openDialog(d, "#cmp-a"); }
    renderCompare();
    writeCompareUrl();
  }
  function wireCompare() {
    var d = $("#compare");
    if (!d || d._cmpWired) { return; }
    d._cmpWired = true;
    var opts = ORG_ORDER.map(function (o) { return '<option value="' + o + '">' + esc(ORG_NAMES[o]) + "</option>"; }).join("");
    $("#cmp-a").innerHTML = opts; $("#cmp-b").innerHTML = opts;
    wireDialog(d);
    function pick(which, other) {
      return function () {
        cmp[which] = this.value;
        if (cmp.a === cmp.b) { cmp[other] = ORG_ORDER.filter(function (o) { return o !== cmp[which]; })[0]; $("#cmp-" + other).value = cmp[other]; }
        renderCompare(); writeCompareUrl();
      };
    }
    $("#cmp-a").addEventListener("change", pick("a", "b"));
    $("#cmp-b").addEventListener("change", pick("b", "a"));
    $("#cmp-swap").addEventListener("click", function () { var t = cmp.a; cmp.a = cmp.b; cmp.b = t; $("#cmp-a").value = cmp.a; $("#cmp-b").value = cmp.b; renderCompare(); writeCompareUrl(); });
    d.addEventListener("close", function () { setTimeout(writeCompareUrl, 0); });
    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (d.open) { renderCompare(); } }, 150); });
  }
  function renderCompare() {
    var body = $("#cmp-body");
    if (!body.firstChild) { body.innerHTML = '<p class="t-m">Loading the record.</p>'; }
    load().then(function (D) {
      var labs = [cmp.a, cmp.b];
      var y = D.asOf.slice(0, 4);
      var years = ["2022", "2023", "2024", "2025", "2026"].filter(function (yy) { return yy <= y; });
      var W = Math.max(130, Math.floor((body.clientWidth || 900) / 2) - (body.clientWidth < 600 ? 14 : 40));
      var data = labs.map(function (o) {
        var all = D.entries.filter(function (e) { return e.org === o; });
        var rel = all.filter(function (e) { return e._rel; });
        var per = years.map(function (yy) { return rel.filter(function (e) { return e._year === yy; }).length; });
        var ind = [], lab = [];
        all.forEach(function (e) { var sc = e._score["gpqa-diamond"]; if (sc && sc.INDEPENDENT) { ind.push({ e: e, v: sc.INDEPENDENT.value }); } if (sc && sc.LAB_REPORTED) { lab.push({ e: e, v: sc.LAB_REPORTED.value }); } });
        ind.sort(function (a, b) { return a.e._day - b.e._day; });
        return { o: o, all: all, rel: rel, per: per, fl: firstLately(rel), gaps: labGaps(rel), ind: ind, lab: lab };
      });
      var perMax = Math.max.apply(null, data.map(function (d) { return Math.max.apply(null, d.per); })) || 1;
      var gapCap = 120, x0 = D.startDay, x1 = D.asOfDay;
      var cols = data.map(function (d) {
        var h = '<section class="cmp-col" aria-label="' + esc(ORG_NAMES[d.o]) + '"><h3>' + esc(ORG_NAMES[d.o]) + '</h3><p class="cmp-sub">' + esc(ORG_COUNTRY[d.o]) + ". " +
          plural(d.rel.length, "release") + (d.all.length - d.rel.length ? " and " + plural(d.all.length - d.rel.length, "revision") : "") + " on record" +
          (d.rel.length ? ", first " + d.rel[d.rel.length - 1].date + ", newest " + d.rel[0].date : "") + ".</p>";
        var bw = W / years.length, ch = 70;
        var s = svgOpen(W, ch + 18, "cmp-bars", ORG_NAMES[d.o] + ": releases per year. " + years.map(function (yy, i) { return yy + " " + d.per[i]; }).join(", ") + ".");
        years.forEach(function (yy, i) {
          var v = d.per[i], bh = v ? Math.max(2, (ch - 14) * v / perMax) : 0;
          if (v) { s += '<rect x="' + (i * bw + 4).toFixed(1) + '" y="' + (ch - bh).toFixed(1) + '" width="' + Math.max(2, bw - 8).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" class="c-on"/>'; }
          s += '<text x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (ch - bh - 4).toFixed(1) + '" text-anchor="middle" class="cmp-v">' + v + "</text>";
          s += '<text x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (ch + 14) + '" text-anchor="middle" class="ax-t">' + (W < 260 ? "'" + yy.slice(2) : yy) + "</text>";
        });
        s += '<line x1="0" x2="' + W + '" y1="' + (ch + 0.5) + '" y2="' + (ch + 0.5) + '" class="ax-base"/></svg>';
        h += "<h4>Releases per year</h4>" + s;
        h += "<h4>Days between releases</h4>";
        if (d.fl) {
          h += '<p class="cmp-big"><span class="num">' + d.fl.first + '</span> <span class="unit">days at first</span> <span class="num">' + d.fl.lately + '</span> <span class="unit">days lately</span></p>';
        } else { h += '<p class="cmp-big"><span class="num dash">-</span> <span class="unit">fewer than four releases on record</span></p>'; }
        var gh = 64;
        var gx = function (dd) { return 34 + (W - 38) * (dd - x0) / (x1 - x0); }, gy = function (v) { return 6 + (gh - 12) * (1 - Math.min(v, gapCap) / gapCap); };
        var g = svgOpen(W, gh + 16, "cmp-gaps", ORG_NAMES[d.o] + ": days between one release and the next, over time.");
        [0, 60, 120].forEach(function (v) { g += '<line x1="34" x2="' + W + '" y1="' + gy(v).toFixed(1) + '" y2="' + gy(v).toFixed(1) + '" class="ax-grid"/><text x="28" y="' + (gy(v) + 4).toFixed(1) + '" text-anchor="end" class="ax-t">' + v + (v === 120 ? "+" : "") + "</text>"; });
        d.gaps.forEach(function (p) {
          g += p.gap > gapCap ? '<path d="M' + gx(p.day).toFixed(1) + " " + (gy(gapCap) + 4).toFixed(1) + "l-3 4h6Z" + '" class="cmp-over"><title>' + p.gap + " days, above the scale</title></path>"
            : '<circle cx="' + gx(p.day).toFixed(1) + '" cy="' + gy(p.gap).toFixed(1) + '" r="2.4" class="cmp-gap"><title>' + p.gap + " days, to " + dateOf(p.day) + "</title></circle>";
        });
        for (var yy2 = 2023; yy2 <= +y; yy2++) { g += '<text x="' + gx(dayNum(yy2 + "-01-01")).toFixed(1) + '" y="' + (gh + 14) + '" class="ax-t">' + (W < 260 ? "'" + String(yy2).slice(2) : yy2) + "</text>"; }
        h += g + "</svg>";
        h += '<h4>Disclosure, checked releases only</h4><dl class="cmp-disc">';
        DISC_SLOTS.forEach(function (sl) {
          var c = discCounts(d.rel, sl[0]);
          var strip = d.rel.slice().reverse().map(function (e) { return discGlyph(e._disc[sl[0]], 7); }).join("");
          h += "<div><dt>" + sl[1] + "</dt><dd>" + (c.researched ? '<b class="num">' + Math.round(100 * c.share) + "%</b> " + c.disclosed + " of " + c.researched : '<span class="nr-w">none checked</span>') +
            (c.not_researched ? ' <span class="t-m">' + c.not_researched + ' not yet checked</span>' : "") + '<span class="cmp-strip" aria-hidden="true">' + strip + "</span></dd></div>";
        });
        h += "</dl><h4>Independent GPQA Diamond</h4>";
        var sh = 92;
        var sx = function (dd) { return 26 + (W - 30) * (dd - x0) / (x1 - x0); }, sy = function (v) { return 6 + (sh - 14) * (1 - v / 100); };
        var t = svgOpen(W, sh, "cmp-sc", ORG_NAMES[d.o] + ": " + (d.ind.length ? d.ind.length + " independent GPQA Diamond scores, first " + d.ind[0].v + ", latest " + d.ind[d.ind.length - 1].v : "no independent GPQA Diamond score") + ".");
        [0, 50, 100].forEach(function (v) { t += '<line x1="26" x2="' + W + '" y1="' + sy(v).toFixed(1) + '" y2="' + sy(v).toFixed(1) + '" class="ax-grid"/><text x="20" y="' + (sy(v) + 4).toFixed(1) + '" text-anchor="end" class="ax-t">' + v + "</text>"; });
        if (d.ind.length) { t += '<path d="' + d.ind.map(function (p, i) { return (i ? "L" : "M") + sx(p.e._day).toFixed(1) + " " + sy(p.v).toFixed(1); }).join("") + '" class="s-line"/>'; }
        d.ind.forEach(function (p) { t += '<circle cx="' + sx(p.e._day).toFixed(1) + '" cy="' + sy(p.v).toFixed(1) + '" r="3" class="s-ind"><title>' + esc(p.e.model_name) + ": " + p.v + " IND</title></circle>"; });
        d.lab.forEach(function (p) { var cx = sx(p.e._day), cy = sy(p.v); t += '<path d="M' + cx.toFixed(1) + " " + (cy - 4).toFixed(1) + "l4 4l-4 4l-4 -4Z" + '" class="s-lab"><title>' + esc(p.e.model_name) + ": " + p.v + " LAB</title></path>"; });
        h += t + "</svg>" + (d.ind.length ? '<p class="t-m">First on record: ' + d.ind[0].v + " (" + esc(d.ind[0].e.model_name) + "). Latest: " + d.ind[d.ind.length - 1].v + " (" + esc(d.ind[d.ind.length - 1].e.model_name) + ").</p>" : '<p class="t-m">No independent score on record.</p>');
        var ow = d.rel.filter(function (e) { return e.availability_class === "open_weights"; }).length;
        h += '<h4>Open weights</h4><p class="cmp-big"><span class="num">' + ow + '</span> <span class="unit">of ' + d.rel.length + " releases</span></p>";
        return h + '<p class="cmp-more"><a href="explorer.html?lab=' + d.o + '">Every ' + esc(ORG_NAMES[d.o]) + " entry in the explorer</a></p></section>";
      });
      body.innerHTML = '<div class="cmp-cols">' + cols.join("") + "</div>";
    }).catch(function () { body.innerHTML = '<p class="t-m">The record could not be loaded in this session.</p>'; });
  }

  window.CR = {
    ORG_ORDER: ORG_ORDER, ORG_NAMES: ORG_NAMES, ORG_COUNTRY: ORG_COUNTRY, ORIGIN_NAMES: ORIGIN_NAMES,
    AVAIL_NAMES: AVAIL_NAMES, SOURCE_KIND_NAMES: SOURCE_KIND_NAMES, DISC_SLOTS: DISC_SLOTS, BENCH: BENCH,
    DISC_WORDS: DISC_WORDS, DISC_TITLES: DISC_TITLES, PROV_TITLES: PROV_TITLES, SECTIONS: SECTIONS,
    esc: esc, $: $, $$: $$, dayNum: dayNum, dateOf: dateOf, validDate: validDate, median: median, fmtNum: fmtNum,
    pct: pct, fmtParams: fmtParams, plural: plural, nword: nword, archiveDate: archiveDate, svgOpen: svgOpen,
    discGlyph: discGlyph, provGlyph: provGlyph, provTag: provTag, discMark: discMark,
    REVISION_GLOSS: REVISION_GLOSS, revisionOf: revisionOf,
    load: load, discCounts: discCounts, pooledGaps: pooledGaps, labGaps: labGaps, firstLately: firstLately,
    pairs: pairs, labSetting: labSetting, indSetting: indSetting,
    getTheme: getTheme, setTheme: setTheme, toggleTheme: toggleTheme,
    tip: tip, untip: untip, toast: toast, copyText: copyText,
    shortcut: shortcut, openPalette: openPalette, paletteSource: paletteSource, addRecordToPalette: addRecordToPalette,
    openDialog: openDialog, closeDialog: closeDialog, wireDialog: wireDialog, openHelp: openHelp,
    openCompare: openCompare, compareParam: compareParam,
    reducedMotion: function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; },
    initShell: initShell
  };
})();
