/* Observatory: shared data layer.
   Loads the same committed files the live site reads, derives one record per
   entry for drawing, and computes every finding sentence from the data at
   runtime. Nothing here types a number in: counts, shares, dates and gaps are
   all read from data/ when the page loads. The finding logic mirrors
   pipeline/build_story.py so the two cannot tell different stories. */
(function () {
  "use strict";

  /* Display names and countries mirror site/js/app.js (ORG_NAMES, ORG_COUNTRY). */
  var ORG_NAMES = {
    "openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind",
    "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
    "alibaba-qwen": "Alibaba (Qwen)", "moonshot": "Moonshot AI", "zai": "Z.ai (Zhipu)",
    "cohere": "Cohere", "amazon": "Amazon (Nova)"
  };
  var SHORT_NAMES = {
    "openai": "OpenAI", "anthropic": "Anthropic", "google-deepmind": "Google DeepMind",
    "meta": "Meta", "xai": "xAI", "mistral": "Mistral", "deepseek": "DeepSeek",
    "alibaba-qwen": "Qwen", "moonshot": "Moonshot AI", "zai": "Z.ai",
    "cohere": "Cohere", "amazon": "Amazon"
  };
  var ORG_COUNTRY = {
    "openai": "United States", "anthropic": "United States", "google-deepmind": "United States",
    "meta": "United States", "xai": "United States", "mistral": "France", "deepseek": "China",
    "alibaba-qwen": "China", "moonshot": "China", "zai": "China", "cohere": "Canada",
    "amazon": "United States"
  };
  /* lane order: the registry order used by the story */
  var ORGS = ["openai", "anthropic", "google-deepmind", "meta", "xai", "mistral",
    "deepseek", "alibaba-qwen", "moonshot", "zai", "cohere", "amazon"];

  var SLOTS = [["system_card", "system card"], ["model_card", "model card"],
    ["usage_policy", "usage policy"], ["paper", "paper"]];

  var AVAIL_NAMES = { open_weights: "open weights", public_api: "public API", public_service: "public service" };
  var ORIGIN_NAMES = {
    "backfill-epoch": "from Epoch AI data",
    "nightly-pipeline": "found by nightly detection, approved by hand",
    "manual": "recorded by hand"
  };
  var SOURCE_KIND_NAMES = { epoch_csv: "Epoch AI data", lab_link: "lab page", lab_announcement: "lab announcement", paper: "paper" };
  var BENCH_LABEL = { "gpqa-diamond": "GPQA Diamond", "swe-bench-verified": "SWE-Bench Verified" };
  var NUMWORDS = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven",
    8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
    15: "fifteen", 16: "sixteen" };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];

  function nword(n) { return NUMWORDS[n] || String(n); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dayNum(iso) { return Math.round(Date.parse(iso + "T00:00:00Z") / 86400000); }
  function isoOf(day) { return new Date(day * 86400000).toISOString().slice(0, 10); }
  function median(v) {
    v = v.slice().sort(function (a, b) { return a - b; });
    var n = v.length; if (!n) { return null; }
    return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  }
  function fmtNum(m) {
    if (m == null) { return null; }
    return Number.isInteger(m) ? String(m) : String(Math.round(m * 10) / 10);
  }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function joinAnd(names) {
    if (names.length <= 1) { return names.join(""); }
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }
  function moved(a, b) { return b > a ? "rose" : (b < a ? "fell" : "held"); }
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
  function archiveDate(u) {
    var m = /web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/.exec(u || "");
    return m ? m[1] + "-" + m[2] + "-" + m[3] : "date unknown";
  }

  /* ---- loading: deployed layout first (concepts/<slug>/ beside data/ two
     levels up), then the repo layout (site/concepts/<slug>/, data/ three up) */
  var BASES = ["../../data/", "../../../data/"];
  var base = null;
  function fetchAt(b, p) {
    return fetch(b + p).then(function (r) {
      if (!r.ok) { throw new Error("HTTP " + r.status + " for " + p); }
      return r;
    });
  }
  function resolveBase() {
    if (base) { return Promise.resolve(base); }
    return fetchAt(BASES[0], "manifest.json").then(function () { base = BASES[0]; return base; })
      .catch(function () { return fetchAt(BASES[1], "manifest.json").then(function () { base = BASES[1]; return base; }); });
  }
  function loadJson(p) { return resolveBase().then(function (b) { return fetchAt(b, p); }).then(function (r) { return r.json(); }); }
  function loadGzJson(p) {
    return resolveBase().then(function (b) { return fetchAt(b, p); }).then(function (r) { return r.arrayBuffer(); })
      .then(function (buf) {
        var head = new Uint8Array(buf.slice(0, 2));
        if (head.length === 2 && head[0] === 0x1f && head[1] === 0x8b) {
          return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).json();
        }
        return JSON.parse(new TextDecoder().decode(buf));
      });
  }

  function discState(v) {
    if (v === "NOT_DISCLOSED") { return "nd"; }
    if (v === "NOT_RESEARCHED" || v == null) { return "nr"; }
    return "on";
  }

  /* one drawable record per entry */
  function deriveEntry(e, t0) {
    var ind = {}, lab = {};
    (e.benchmarks || []).forEach(function (b) {
      var p = b.provenance || {};
      if (p.source_class === "INDEPENDENT") { ind[b.benchmark] = b; }
      else if (p.source_class === "LAB_REPORTED") { lab[b.benchmark] = b; }
    });
    var disc = {};
    SLOTS.forEach(function (s) { disc[s[0]] = discState((e.disclosure_links || {})[s[0]]); });
    return {
      e: e, id: e.id, name: e.model_name, org: e.org, lane: ORGS.indexOf(e.org),
      date: e.date, day: dayNum(e.date) - t0, year: e.date.slice(0, 4),
      release: e.entry_type !== "revision",
      ind: ind, lab: lab,
      hasInd: Object.keys(ind).length > 0, hasLab: Object.keys(lab).length > 0,
      scored: (e.benchmarks || []).length > 0,
      disc: disc,
      country: ORG_COUNTRY[e.org] || ""
    };
  }

  function load() {
    return Promise.all([
      loadJson("manifest.json"), loadJson("derived/site_meta.json"),
      loadGzJson("derived/views.json.gz"), loadGzJson("derived/deltas.json.gz")
    ]).then(function (r) {
      var manifest = r[0], meta = r[1], views = r[2], deltas = r[3];
      var files = Object.keys(manifest.files || {}).sort();
      return Promise.all(files.map(function (f) { return loadGzJson(f.replace(/^data\//, "")); }))
        .then(function (arrs) {
          var entries = [];
          arrs.forEach(function (a) { entries = entries.concat(a); });
          entries.sort(function (a, b) { return a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.id < b.id ? -1 : 1); });
          var t0 = dayNum(meta.first_date);
          var asOf = (views.tiles && views.tiles.as_of) || meta.last_successful_update;
          var recs = entries.map(function (e) { return deriveEntry(e, t0); });
          var byId = {};
          recs.forEach(function (r) { byId[r.id] = r; });
          return {
            meta: meta, views: views, deltas: deltas, recs: recs, byId: byId,
            t0: t0, span: dayNum(asOf) - t0, asOf: asOf,
            findings: computeFindings(entries, views, deltas, asOf)
          };
        });
    });
  }

  /* ---- settings parsing, as in build_story.py ---- */
  var LVL = "(xhigh|x-high|high|medium|low|max)";
  function labSetting(cfg) {
    var c = (cfg || "").toLowerCase();
    var m = new RegExp("think " + LVL).exec(c) || new RegExp(LVL + " thinking").exec(c) ||
      new RegExp("effort (?:set to |of )?" + LVL).exec(c);
    if (!m) { return [null, "not stated"]; }
    var lvl = m[1].replace("-", "");
    return [lvl, lvl + " " + (m[0].indexOf("think") >= 0 ? "thinking" : "effort")];
  }
  function indSetting(cfg) {
    var m = new RegExp("_" + LVL + "$").exec((cfg || "").toLowerCase());
    if (!m) { return [null, "not stated"]; }
    var lvl = m[1].replace("-", "");
    return [lvl, lvl + " effort"];
  }

  /* ---- findings: every sentence built from the record ---- */
  function computeFindings(entries, V, D, AS_OF) {
    var orgSet = {}; ORGS.forEach(function (o) { orgSet[o] = 1; });
    var rel = V.disclosure_matrix.rows.filter(function (r) { return orgSet[r.org]; })
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    var series = {};
    V.trajectory.series.forEach(function (s) { series[s.benchmark + "|" + s.source_class] = s; });
    var gpqa = (series["gpqa-diamond|INDEPENDENT"] || { points: [] }).points.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var swe = (series["swe-bench-verified|INDEPENDENT"] || { points: [] }).points.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var scoreBy = {}; gpqa.forEach(function (p) { scoreBy[p.entry_id] = p.value; });
    var paramBy = {}, availBy = {}, entryBy = {};
    entries.forEach(function (e) {
      paramBy[e.id] = !(e.parameters == null || e.parameters === "NOT_DISCLOSED" || e.parameters === "");
      availBy[e.id] = e.availability_class; entryBy[e.id] = e;
    });
    var yearly = {}; V.cadence.yearly.forEach(function (y) { yearly[y.year] = y.releases; });

    /* the full years after the record's first partial year */
    var allYears = Object.keys(yearly).sort();
    var slots = allYears.slice(1);
    var D0 = slots[0], D1 = slots[slots.length - 1];
    var curY = AS_OF.slice(0, 4);

    /* pulse: labs per year, first appearances, median gap, busiest week */
    var labsBy = {}, firstY = {}, dates = [];
    rel.forEach(function (r) {
      var y = r.date.slice(0, 4);
      (labsBy[y] = labsBy[y] || {})[r.org] = 1;
      if (!firstY[r.org]) { firstY[r.org] = y; }
      dates.push(r.date);
    });
    dates.sort();
    var gapsBy = {};
    for (var i = 1; i < dates.length; i++) {
      (gapsBy[dates[i].slice(0, 4)] = gapsBy[dates[i].slice(0, 4)] || []).push(dayNum(dates[i]) - dayNum(dates[i - 1]));
    }
    function busiestWeek(y) {
      var wk = {};
      dates.forEach(function (d) {
        if (d.slice(0, 4) !== y) { return; }
        var dt = new Date(d + "T00:00:00Z");
        var day = (dt.getUTCDay() + 6) % 7;
        var th = new Date(dt.getTime() + (3 - day) * 86400000);
        var w = 1 + Math.floor((th.getTime() - Date.UTC(th.getUTCFullYear(), 0, 1)) / 86400000 / 7);
        var key = th.getUTCFullYear() + "-" + w;
        wk[key] = (wk[key] || 0) + 1;
      });
      var m = 0; Object.keys(wk).forEach(function (k) { m = Math.max(m, wk[k]); });
      return m;
    }
    var nLabs = ORGS.length;
    function listNames(orgs) { return joinAnd(ORGS.filter(function (o) { return orgs.indexOf(o) >= 0; }).map(function (o) { return SHORT_NAMES[o]; })); }
    var pulse = slots.map(function (y) {
      var n = Object.keys(labsBy[y] || {}).length;
      var s = n === nLabs ? "All " + nword(nLabs) + " tracked labs released at least one model." :
        n + " of the " + nword(nLabs) + " tracked labs released at least one model.";
      var fresh = Object.keys(firstY).filter(function (o) { return firstY[o] === y; });
      if (fresh.length && y > slots[0]) { s += " First on record this year: " + listNames(fresh) + "."; }
      var mg = median(gapsBy[y] || []);
      if (mg != null) { s += " Median time between one release and the next: " + fmtNum(mg) + " days."; }
      var bw = busiestWeek(y);
      if (bw > 1) { s += " The busiest week brought " + bw + " releases."; }
      var head = y + ": " + yearly[y] + (y === curY ? " releases so far" : " releases");
      if (y === slots[0]) { s = "The first full year after ChatGPT. " + s; }
      if (y === curY) {
        var prevY = String(+curY - 1);
        var cut = AS_OF.slice(5) !== "02-29" ? prevY + AS_OF.slice(4) : prevY + "-02-28";
        var curN = dates.filter(function (d) { return d.slice(0, 4) === curY && d <= AS_OF; }).length;
        var prevN = dates.filter(function (d) { return d.slice(0, 4) === prevY && d <= cut; }).length;
        s = "A partial year: " + curN + " releases by " + AS_OF + ". By the same date in " + prevY + " there were " + prevN + ". " + s;
      }
      return { year: y, releases: yearly[y], head: head, body: s, median: mg, busiest: bw };
    });

    /* the wait between releases, four labs (the story's case order) */
    var CASE = ["openai", "anthropic", "google-deepmind", "alibaba-qwen"];
    var byOrgDates = {};
    rel.forEach(function (r) { (byOrgDates[r.org] = byOrgDates[r.org] || {})[r.date] = 1; });
    var waits = CASE.map(function (o) {
      var ds = Object.keys(byOrgDates[o] || {}).sort();
      var g = [];
      for (var k = 1; k < ds.length; k++) { g.push(dayNum(ds[k]) - dayNum(ds[k - 1])); }
      var n = g.length, third = Math.max(1, Math.floor(n / 3));
      var a = median(g.slice(0, third)), b = median(g.slice(n - third));
      return { org: o, name: SHORT_NAMES[o], early: a, late: b,
        body: "About " + fmtNum(a) + " days between releases at first, about " + fmtNum(b) + " lately." };
    });

    /* independent scores by year, and the cumulative top */
    var trajYr = {};
    rel.forEach(function (r) { if (scoreBy[r.entry_id] != null) { (trajYr[r.date.slice(0, 4)] = trajYr[r.date.slice(0, 4)] || []).push(scoreBy[r.entry_id]); } });
    function tmax(y) { return trajYr[y] ? Math.round(Math.max.apply(null, trajYr[y])) : 0; }
    function tn(y) { return (trajYr[y] || []).length; }
    var climb = slots.map(function (y, idx) {
      var body = idx === 0 ? "The first " + tn(y) + " independent scores on record; the highest is " + tmax(y) + " on GPQA Diamond." :
        (y === curY ? tn(y) + " scored so far; the highest is " + tmax(y) + "." : tn(y) + " scored this year; the highest is " + tmax(y) + ".");
      return { year: y, n: tn(y), max: tmax(y), body: body };
    });
    var capRun = 0, capVals = [];
    slots.forEach(function (y) {
      var ys = rel.filter(function (r) { return r.date.slice(0, 4) <= y && scoreBy[r.entry_id] != null; }).map(function (r) { return scoreBy[r.entry_id]; });
      if (ys.length) { capRun = Math.max.apply(null, ys); }
      capVals.push(Math.round(capRun));
    });
    var sweLo = swe.length ? Math.round(swe[0].value) : null;
    var sweHi = swe.length ? Math.round(Math.max.apply(null, swe.map(function (p) { return p.value; }))) : null;
    var sweBody = swe.length ? "On a second benchmark, SWE-Bench Verified (fixing real GitHub issues), the top score rose from " +
      sweLo + " to " + sweHi + " over the same years. Epoch measured these too." : "";

    /* disclosure shares: researched releases only */
    var byN = {}, papRes = {}, pap = {}, par = {}, scRes = {}, sc = {};
    rel.forEach(function (r) {
      var y = r.date.slice(0, 4);
      byN[y] = (byN[y] || 0) + 1;
      if (r.cells.paper !== "not_researched") { papRes[y] = (papRes[y] || 0) + 1; }
      if (r.cells.paper === "disclosed") { pap[y] = (pap[y] || 0) + 1; }
      if (paramBy[r.entry_id]) { par[y] = (par[y] || 0) + 1; }
      if (r.cells.system_card !== "not_researched") { scRes[y] = (scRes[y] || 0) + 1; }
      if (r.cells.system_card === "disclosed") { sc[y] = (sc[y] || 0) + 1; }
    });
    function g(o, y) { return o[y] || 0; }
    function skew(art) {
      var ys = rel.filter(function (r) { return r.date.slice(0, 4) === D1; }).map(function (r) { return r.date; }).sort();
      if (!ys.length) { return null; }
      var lm = +ys[ys.length - 1].slice(5, 7), cm = Math.max(1, lm - 1);
      var cut = D1 + "-" + (cm < 10 ? "0" : "") + cm + "-01";
      var res = rel.filter(function (r) { return r.date.slice(0, 4) === D1 && r.cells[art] !== "not_researched"; }).map(function (r) { return r.date; });
      if (!res.length) { return null; }
      var k = res.filter(function (d) { return d >= cut; }).length, m = ys.filter(function (d) { return d >= cut; }).length;
      return k / res.length > m / ys.length ? { k: k, n: res.length, m: m, N: ys.length, mon: MONTHS[cm - 1] } : null;
    }
    function skewSentence(sk, what) {
      return " In " + D1 + ", " + sk.k + " of the " + sk.n + " checked releases are from " + sk.mon + " or later, a period that holds " +
        sk.m + " of the year's " + sk.N + " releases. The checked releases lean toward the newest ones, so " + what +
        " may move as earlier " + D1 + " releases are checked.";
    }
    var skP = skew("paper"), skS = skew("system_card");
    var paper = {
      y0: D0, y1: D1, a0: g(pap, D0), n0: g(papRes, D0), a1: g(pap, D1), n1: g(papRes, D1),
      p0: pct(g(pap, D0), g(papRes, D0)), p1: pct(g(pap, D1), g(papRes, D1))
    };
    paper.dir = moved(paper.p0, paper.p1);
    paper.head = { fell: "Fewer arrive with a paper", rose: "More arrive with a paper" }[paper.dir] || "Releases with a paper";
    paper.body = "In " + D0 + ", " + paper.a0 + " of " + paper.n0 + " researched releases had a paper on record (" + paper.p0 + "%). In " +
      D1 + " so far, " + paper.a1 + " of " + paper.n1 + " (" + paper.p1 + "%). Papers can come out weeks after a release, so recent years may rise." +
      (skP ? skewSentence(skP, "the share") : "");
    var syscard = {
      y0: D0, y1: D1, a0: g(sc, D0), n0: g(scRes, D0), a1: g(sc, D1), n1: g(scRes, D1),
      p0: pct(g(sc, D0), g(scRes, D0)), p1: pct(g(sc, D1), g(scRes, D1))
    };
    syscard.dir = moved(syscard.p0, syscard.p1);
    syscard.body = "The share of researched releases with a system card " + syscard.dir + " from " + syscard.p0 + "% in " + D0 + " (" +
      syscard.a0 + " of " + syscard.n0 + ") to " + syscard.p1 + "% in " + D1 + " (" + syscard.a1 + " of " + syscard.n1 + ")." +
      (skS ? skewSentence(skS, "the share") : "");
    var params = { a0: g(par, D0), n0: g(byN, D0), a1: g(par, D1), n1: g(byN, D1) };
    params.p0 = pct(params.a0, params.n0); params.p1 = pct(params.a1, params.n1);
    params.body = "In " + D0 + ", " + params.a0 + " of " + params.n0 + " releases had a parameter count in Epoch AI's data (" + params.p0 +
      "%). In " + D1 + " so far, " + params.a1 + " of " + params.n1 + " (" + params.p1 + "%). Epoch often adds counts for recent models late, and we have not checked the blanks against the labs' own pages.";
    var counts = V.disclosure_matrix.counts, status = V.disclosure_matrix.artifact_status;
    var up = counts.usage_policy;
    var usage = { on: up.disclosed, researched: up.disclosed + up.not_disclosed,
      body: up.disclosed + " of the " + (up.disclosed + up.not_disclosed) + " releases we researched for a usage policy have one on record. " +
        up.not_researched + " releases are not yet researched for it." };

    /* lab-reported beside independent: same entry, same benchmark, both classes */
    var pairsMap = {}, pairKeys = [];
    entries.forEach(function (e) {
      var bb = {};
      (e.benchmarks || []).forEach(function (b) { (bb[b.benchmark] = bb[b.benchmark] || {})[b.provenance.source_class] = b; });
      Object.keys(bb).forEach(function (bench) {
        var d = bb[bench];
        if (d.LAB_REPORTED && d.INDEPENDENT) {
          var key = e.id + "|" + bench;
          if (!pairsMap[key]) { pairKeys.push(key); }
          var ls = labSetting(d.LAB_REPORTED.configuration), is = indSetting(d.INDEPENDENT.configuration);
          pairsMap[key] = { id: e.id, model: e.model_name, org: e.org, date: e.date, bench: bench, benchLabel: BENCH_LABEL[bench] || bench,
            lab: d.LAB_REPORTED.value, ind: d.INDEPENDENT.value,
            labcfg: d.LAB_REPORTED.configuration || "", indcfg: d.INDEPENDENT.configuration || "",
            labUrl: d.LAB_REPORTED.provenance.source_url, indUrl: d.INDEPENDENT.provenance.source_url,
            labLvl: ls[0], labSet: ls[1], indLvl: is[0], indSet: is[1],
            gap: Math.round((d.LAB_REPORTED.value - d.INDEPENDENT.value) * 10) / 10 };
        }
      });
    });
    var pairs = pairKeys.map(function (k) { return pairsMap[k]; }).sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    var near = pairs.filter(function (p) { return Math.abs(p.gap) <= 1; }).length;
    var setDiff = pairs.filter(function (p) { return p.labLvl && p.indLvl && p.labLvl !== p.indLvl; });
    var pairModels = {}; pairs.forEach(function (p) { pairModels[p.model] = 1; });
    var nPairModels = Object.keys(pairModels).length;
    var pairsBody = nPairModels + " releases were graded twice on the same benchmark: once by the releasing lab, once by Epoch. " +
      near + " of the " + pairs.length + " pairs sit within a single point, and the gaps run both ways. " +
      (setDiff.length ? "In " + nword(setDiff.length) + " of the " + nword(pairs.length) + " pairs (" + joinAnd(setDiff.map(function (p) { return p.model; })) +
        ") the lab and Epoch ran different reasoning settings, so those gaps include a settings difference. " : "") +
      "With so few pairs this is not a test of whether labs overstate. The record keeps both numbers and never averages them.";

    /* refused predecessor comparisons, read verbatim from the derived file */
    var refused = [];
    Object.keys(D).forEach(function (id) {
      (D[id] || []).forEach(function (it) {
        if (it.kind === "REFUSED_COMPARISON") {
          var e = entryBy[id];
          refused.push({ id: id, model: e ? e.model_name : id, org: e ? e.org : "", date: e ? e.date : "", reason: it.reason || "" });
        }
      });
    });
    refused.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var deltaCount = 0;
    Object.keys(D).forEach(function (id) { (D[id] || []).forEach(function (it) { if (it.kind === "delta") { deltaCount++; } }); });

    return {
      D0: D0, D1: D1, curY: curY, slots: slots, nLabs: nLabs, yearly: yearly,
      pulse: pulse, waits: waits, climb: climb, capVals: capVals, sweLo: sweLo, sweHi: sweHi, sweBody: sweBody,
      paper: paper, syscard: syscard, params: params, usage: usage,
      pendingPaper: (status.paper && status.paper.pending_review) || 0,
      pairs: pairs, near: near, setDiff: setDiff, nPairModels: nPairModels, pairsBody: pairsBody,
      refused: refused, deltaCount: deltaCount,
      gpqa: gpqa, swe: swe
    };
  }

  window.VCO = {
    ORG_NAMES: ORG_NAMES, SHORT_NAMES: SHORT_NAMES, ORG_COUNTRY: ORG_COUNTRY, ORGS: ORGS, SLOTS: SLOTS,
    AVAIL_NAMES: AVAIL_NAMES, ORIGIN_NAMES: ORIGIN_NAMES, SOURCE_KIND_NAMES: SOURCE_KIND_NAMES, BENCH_LABEL: BENCH_LABEL,
    esc: esc, nword: nword, cap: cap, dayNum: dayNum, isoOf: isoOf, fmtParams: fmtParams, archiveDate: archiveDate,
    fmtNum: fmtNum, joinAnd: joinAnd, load: load, loadJson: loadJson, computeFindings: computeFindings,
    reducedMotion: function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  };
})();
