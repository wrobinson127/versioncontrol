/* Broadsheet: shared data layer.
   Reads the same published files the live site reads (data/manifest.json,
   data/entries/<year>.json.gz, data/derived/*). Nothing here invents a value:
   every number the pages print is counted from these files at runtime.
   Deltas and refusals are rendered verbatim from derived/deltas.json.gz. */
(function () {
  "use strict";

  var ORG_NAMES = {
    "openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind",
    "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
    "alibaba-qwen": "Alibaba (Qwen)", "moonshot": "Moonshot AI", "zai": "Z.ai (Zhipu)",
    "cohere": "Cohere", "amazon": "Amazon (Nova)"
  };
  /* short labels for chart rows; the story uses the same short forms */
  var ORG_SHORT = {
    "openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google",
    "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
    "alibaba-qwen": "Qwen", "moonshot": "Moonshot", "zai": "Z.ai",
    "cohere": "Cohere", "amazon": "Amazon"
  };
  /* Country of the parent company's headquarters; mirrors site/js/app.js
     ORG_COUNTRY. A filter and context only, never a ranking or a grouping. */
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
  var AVAIL_ORDER = ["open_weights", "public_api", "public_service"];
  var SLOTS = [["system_card", "System card"], ["model_card", "Model card"], ["usage_policy", "Usage policy"], ["paper", "Paper"]];
  var SOURCE_KIND_NAMES = { epoch_csv: "Epoch AI data", lab_link: "lab page", lab_announcement: "lab announcement", paper: "paper" };
  var BENCH_NAMES = { "gpqa-diamond": "GPQA Diamond", "swe-bench-verified": "SWE-Bench Verified" };

  /* deployed layout: concepts/broadsheet/ sits two levels under the site root,
     with data/ beside the site files; local repo layout: site/ next to data/ */
  var BASES = ["../../data/", "../../../data/"];
  var base = null;

  function fetchAt(b, path) {
    return fetch(b + path).then(function (res) {
      if (!res.ok) { throw new Error("HTTP " + res.status + " for " + path); }
      return res;
    });
  }
  function resolveBase() {
    if (base) { return Promise.resolve(base); }
    return fetchAt(BASES[0], "manifest.json").then(function () { base = BASES[0]; return base; })
      .catch(function () { return fetchAt(BASES[1], "manifest.json").then(function () { base = BASES[1]; return base; }); });
  }
  function loadJson(path) {
    return resolveBase().then(function (b) { return fetchAt(b, path); }).then(function (r) { return r.json(); });
  }
  /* gzip via DecompressionStream; if a host already decoded the body the
     magic bytes are absent and the buffer parses as plain JSON */
  function loadGz(path) {
    return resolveBase().then(function (b) { return fetchAt(b, path); })
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (buf) {
        var h = new Uint8Array(buf.slice(0, 2));
        if (h.length === 2 && h[0] === 0x1f && h[1] === 0x8b) {
          return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).json();
        }
        return JSON.parse(new TextDecoder().decode(buf));
      });
  }

  var cache = null;
  function loadAll() {
    if (cache) { return cache; }
    cache = Promise.all([loadJson("manifest.json"), loadGz("derived/views.json.gz"),
      loadGz("derived/deltas.json.gz"), loadJson("derived/site_meta.json")])
      .then(function (r) {
        var manifest = r[0];
        var files = Object.keys(manifest.files || {}).sort();
        return Promise.all(files.map(function (f) { return loadGz(f.replace(/^data\//, "")); }))
          .then(function (arrays) {
            var entries = [];
            arrays.forEach(function (a) { entries = entries.concat(a); });
            entries.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id < b.id ? -1 : 1); });
            return { manifest: manifest, views: r[1], deltas: r[2], meta: r[3], entries: entries, base: base };
          });
      });
    return cache;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtParams(n) {
    var u = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < u.length; i++) {
      if (n >= u[i][0]) { var v = n / u[i][0]; return (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)) + u[i][1]; }
    }
    return String(n);
  }
  function archiveDate(u) {
    var m = /web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/.exec(u || "");
    return m ? m[1] + "-" + m[2] + "-" + m[3] : "date unknown";
  }
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function monthName(ym) { return MONTHS[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4); }
  function dayNum(d) { return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000; }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function median(v) {
    v = v.slice().sort(function (a, b) { return a - b; });
    var n = v.length; if (!n) { return null; }
    return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  }
  /* ISO week key, as the story computes its busiest week */
  function isoWeek(d) {
    var t = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    var wk = Math.ceil(((t - y0) / 86400000 + 1) / 7);
    var mon = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) - (day - 1)));
    return { key: t.getUTCFullYear() + "-W" + (wk < 10 ? "0" : "") + wk, monday: mon.toISOString().slice(0, 10) };
  }

  /* Reasoning settings read from configuration strings on record, by the
     same rules the story generator uses (pipeline/build_story.py): Epoch run
     ids end in the effort level; a lab's configuration is prose, so only an
     explicit effort or thinking level is read. Anything else: not stated. */
  var LVL = "(xhigh|x-high|high|medium|low|max)";
  function labSetting(cfg) {
    var c = (cfg || "").toLowerCase();
    var m = new RegExp("think " + LVL).exec(c) || new RegExp(LVL + " thinking").exec(c) ||
      new RegExp("effort (?:set to |of )?" + LVL).exec(c);
    if (!m) { return { lvl: null, text: "not stated" }; }
    var lvl = m[1].replace("-", "");
    return { lvl: lvl, text: lvl + (m[0].indexOf("think") >= 0 ? " thinking" : " effort") };
  }
  function indSetting(cfg) {
    var m = new RegExp("_" + LVL + "$").exec((cfg || "").toLowerCase());
    if (!m) { return { lvl: null, text: "not stated" }; }
    var lvl = m[1].replace("-", "");
    return { lvl: lvl, text: lvl + " effort" };
  }

  /* lab vs independent pairs: same entry, same benchmark, measured both ways */
  function pairsOf(entries) {
    var out = [];
    entries.forEach(function (e) {
      var by = {};
      (e.benchmarks || []).forEach(function (b) {
        (by[b.benchmark] = by[b.benchmark] || {})[b.provenance.source_class] = b;
      });
      Object.keys(by).forEach(function (k) {
        var d = by[k];
        if (d.LAB_REPORTED && d.INDEPENDENT) {
          out.push({
            entry: e, bench: k, lab: d.LAB_REPORTED, ind: d.INDEPENDENT,
            labSet: labSetting(d.LAB_REPORTED.configuration), indSet: indSetting(d.INDEPENDENT.configuration)
          });
        }
      });
    });
    out.sort(function (a, b) { return a.entry.date < b.entry.date ? -1 : a.entry.date > b.entry.date ? 1 : 0; });
    return out;
  }

  function lastUpdateLine(meta) {
    var txt = "Last successful update: " + esc(meta.last_successful_update) + ".";
    var age = Math.floor((Date.now() - new Date(meta.last_successful_update + "T00:00:00Z").getTime()) / 86400000);
    if (age > 3) {
      txt += " This record is " + age + " days old: no new entries have been approved since " +
        esc(meta.last_successful_update) + ". New releases wait in a review queue until a person approves them.";
    }
    return txt;
  }
  function renderFooter() {
    var el = document.getElementById("foot-update");
    if (!el) { return; }
    loadJson("derived/site_meta.json").then(function (m) { el.innerHTML = lastUpdateLine(m); })
      .catch(function () { el.textContent = "Update record unavailable in this session."; });
  }

  window.BS = {
    ORG_NAMES: ORG_NAMES, ORG_SHORT: ORG_SHORT, ORG_COUNTRY: ORG_COUNTRY, ORIGIN_NAMES: ORIGIN_NAMES,
    AVAIL_NAMES: AVAIL_NAMES, AVAIL_ORDER: AVAIL_ORDER, SLOTS: SLOTS, SOURCE_KIND_NAMES: SOURCE_KIND_NAMES,
    BENCH_NAMES: BENCH_NAMES, loadAll: loadAll, loadJson: loadJson, esc: esc, fmtParams: fmtParams,
    archiveDate: archiveDate, monthName: monthName, dayNum: dayNum, pct: pct, median: median, isoWeek: isoWeek,
    labSetting: labSetting, indSetting: indSetting, pairsOf: pairsOf, renderFooter: renderFooter,
    lastUpdateLine: lastUpdateLine
  };
})();
