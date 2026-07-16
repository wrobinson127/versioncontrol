/* Version Control : client
   The site renders the committed dataset and the derived deltas file.
   It never computes a delta itself; delta chips and refusals come
   exclusively from data/derived/deltas.json.gz. */

(function () {
  "use strict";

  var ORG_NAMES = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "google-deepmind": "Google DeepMind",
    "meta": "Meta",
    "xai": "xAI",
    "mistral": "Mistral",
    "deepseek": "DeepSeek",
    "alibaba-qwen": "Alibaba (Qwen)",
    "moonshot": "Moonshot AI",
    "zai": "Z.ai (Zhipu)",
    "cohere": "Cohere",
    "amazon": "Amazon (Nova)"
  };

  var AVAIL_NAMES = {
    "open_weights": "open weights",
    "public_api": "public API",
    "public_service": "public service"
  };

  var PROV_TITLES = {
    "LAB_REPORTED": "LAB: reported by the releasing lab. Follow the tag for the source.",
    "INDEPENDENT": "IND: measured by an independent evaluator. Follow the tag for the source."
  };

  var DISCLOSURE_SLOTS = [
    ["system_card", "system card"],
    ["model_card", "model card"],
    ["usage_policy", "usage policy"],
    ["paper", "paper"]
  ];

  /* The loader tries the deployed layout first (site files at root,
     data/ alongside), then the local repo layout (site/ next to data/). */
  var DATA_BASES = ["./data/", "../data/"];
  var dataBase = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fetchAt(base, path) {
    return fetch(base + path).then(function (res) {
      if (!res.ok) { throw new Error("HTTP " + res.status + " for " + base + path); }
      return res;
    });
  }

  function resolveBase() {
    if (dataBase) { return Promise.resolve(dataBase); }
    return fetchAt(DATA_BASES[0], "manifest.json").then(function () {
      dataBase = DATA_BASES[0];
      return dataBase;
    }).catch(function () {
      return fetchAt(DATA_BASES[1], "manifest.json").then(function () {
        dataBase = DATA_BASES[1];
        return dataBase;
      });
    });
  }

  function loadJson(path) {
    return resolveBase().then(function (base) {
      return fetchAt(base, path);
    }).then(function (res) { return res.json(); });
  }

  /* Gzipped files: decompress with DecompressionStream. If a proxy or
     host already transparently decoded the body, the gzip magic bytes
     are absent and the buffer parses as plain JSON. */
  function loadGzJson(path) {
    return resolveBase().then(function (base) {
      return fetchAt(base, path);
    }).then(function (res) {
      return res.arrayBuffer();
    }).then(function (buf) {
      var head = new Uint8Array(buf.slice(0, 2));
      if (head.length === 2 && head[0] === 0x1f && head[1] === 0x8b) {
        var stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new Response(stream).json();
      }
      return JSON.parse(new TextDecoder().decode(buf));
    });
  }

  function fmtParams(n) {
    var units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i][0]) {
        var v = n / units[i][0];
        var s = v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
        return s + units[i][1];
      }
    }
    return String(n);
  }

  function provTag(sourceClass, sourceUrl, retrievalDate) {
    var short = sourceClass === "LAB_REPORTED" ? "LAB" : "IND";
    var title = PROV_TITLES[sourceClass] || sourceClass;
    if (retrievalDate) { title += " Retrieved " + retrievalDate + "."; }
    if (sourceUrl) {
      return '<a class="prov" href="' + esc(sourceUrl) + '" title="' + esc(title) + '" rel="external">' + short + "</a>";
    }
    return '<span class="prov" title="' + esc(title) + '">' + short + "</span>";
  }

  function ndMark() {
    return '<span class="nd" title="The lab has not disclosed this. Absence is the recorded signal, not a zero.">not disclosed</span>';
  }

  function benchRow(b, deltaItems) {
    var p = b.provenance || {};
    var label = p.benchmark_name || b.benchmark;
    var html = '<div class="bench-row">';
    html += '<span class="bench-label">' + esc(label) + "</span>";
    html += '<span class="measure"><span class="val">' + esc(b.value) + "</span>" +
      provTag(p.source_class, p.source_url, p.retrieval_date) + "</span>";

    /* delta chips and refusals: rendered verbatim from the derived file */
    for (var i = 0; i < deltaItems.length; i++) {
      var d = deltaItems[i];
      if (d.kind === "delta" && d.benchmark === b.benchmark) {
        var sign = d.value >= 0 ? "+" : "";
        html += '<span class="delta"><span class="dval">' + sign + esc(Number(d.value).toFixed(1)) +
          '</span><span class="dctx">vs predecessor</span>' +
          provTag(d.source_class, null, null) + "</span>";
      }
    }
    if (b.configuration) {
      html += '<span class="bench-config">configuration: ' + esc(b.configuration) + "</span>";
    }
    html += "</div>";
    return html;
  }

  function entryCard(e, deltaItems) {
    var org = ORG_NAMES[e.org] || e.org;
    var html = '<article class="entry' + (e.retracted ? " is-retracted" : "") +
      '" id="' + esc(e.id) + '" aria-label="' + esc(e.model_name) + ", " + esc(org) + '">';

    html += '<div class="entry-head">';
    html += '<time class="entry-date" datetime="' + esc(e.date) + '">' + esc(e.date) + "</time>";
    html += '<span class="entry-org">' + esc(org) + "</span>";
    html += '<span class="entry-kind' + (e.entry_type === "revision" ? " is-revision" : "") + '">' +
      esc(e.entry_type) + "</span>";
    if (e.retracted) {
      html += '<span class="entry-retracted">retracted or corrected</span>';
    }
    html += "</div>";

    html += '<h3 class="entry-name"><a href="#' + esc(e.id) + '">' + esc(e.model_name) + "</a></h3>";

    if (e.variants && e.variants.length) {
      html += '<p class="entry-variants">Variants: ' + e.variants.map(esc).join(", ") + "</p>";
    }

    html += '<p class="entry-summary">' + esc(e.summary) + "</p>";

    html += '<div class="entry-facts">';
    html += '<span class="fact">availability: <b>' + esc(AVAIL_NAMES[e.availability_class] || e.availability_class) + "</b></span>";
    if (e.parameters === "NOT_DISCLOSED") {
      html += '<span class="fact">parameters: ' + ndMark() + "</span>";
    } else if (typeof e.parameters === "number") {
      html += '<span class="fact">parameters: <b>' + fmtParams(e.parameters) + "</b></span>";
    }
    html += "</div>";

    html += '<div class="bench">';
    if (e.benchmarks && e.benchmarks.length) {
      for (var i = 0; i < e.benchmarks.length; i++) {
        html += benchRow(e.benchmarks[i], deltaItems);
      }
    } else {
      /* Absence of measurement is not a disclosure signal; it renders
         as plain words, visually apart from the NOT_DISCLOSED mark. */
      html += '<p class="bench-none">No benchmark measurements recorded for this entry.</p>';
    }
    /* a refusal recorded without a matching on-card benchmark still renders, in words */
    for (var r = 0; r < deltaItems.length; r++) {
      var item = deltaItems[r];
      if (item.kind === "REFUSED_COMPARISON") {
        html += '<div class="bench-row"><span class="refused" title="' + esc(item.reason || "") +
          '">no comparable measurement against the predecessor</span></div>';
      }
    }
    html += "</div>";

    html += '<div class="disclosure">';
    for (var s = 0; s < DISCLOSURE_SLOTS.length; s++) {
      var key = DISCLOSURE_SLOTS[s][0];
      var labelTxt = DISCLOSURE_SLOTS[s][1];
      var v = (e.disclosure_links || {})[key];
      html += '<div class="disc"><span class="disc-label">' + labelTxt + "</span>";
      if (v && v !== "NOT_DISCLOSED") {
        html += '<a href="' + esc(v) + '" rel="external">link</a>';
      } else {
        html += ndMark();
      }
      html += "</div>";
    }
    html += "</div>";

    var foot = [];
    if (e.license_note) { foot.push(esc(e.license_note)); }
    if (e.sources && e.sources.length) {
      var srcLinks = e.sources.map(function (src) {
        return '<a href="' + esc(src.url) + '" rel="external">' + esc(src.kind.replace(/_/g, " ")) +
          "</a> (retrieved " + esc(src.retrieval_date) + ")";
      });
      foot.push("Sources: " + srcLinks.join(", "));
    }
    if (foot.length) {
      html += '<div class="entry-foot">' + foot.join(" ") + "</div>";
    }

    html += "</article>";
    return html;
  }

  /* ---- footer: last successful update, with plain staleness ---- */

  function renderFooter(meta) {
    var el = document.getElementById("foot-update");
    if (!el || !meta) { return; }
    var txt = "Last successful update: " + meta.last_successful_update + ".";
    var updated = new Date(meta.last_successful_update + "T00:00:00Z");
    var ageDays = Math.floor((Date.now() - updated.getTime()) / 86400000);
    if (ageDays > 3) {
      txt += ' <span class="stale">This record is ' + ageDays +
        " days old; the pipeline has not published an update since " +
        esc(meta.last_successful_update) + ".</span>";
    }
    el.innerHTML = txt;
  }

  /* ---- timeline page ---- */

  function initTimeline() {
    var timeline = document.getElementById("timeline");
    if (!timeline) { return; }

    var state = { org: "all", type: "all", measured: false };
    var entries = [];
    var deltas = {};
    var meta = null;

    function deltaItemsFor(id) { return deltas[id] || []; }

    function matches(e) {
      if (state.org !== "all" && e.org !== state.org) { return false; }
      if (state.type !== "all" && e.entry_type !== state.type) { return false; }
      if (state.measured && !(e.benchmarks && e.benchmarks.length)) { return false; }
      return true;
    }

    function filterDescription() {
      var parts = [];
      if (state.org !== "all") { parts.push("organization " + (ORG_NAMES[state.org] || state.org)); }
      if (state.type !== "all") { parts.push("entry type “" + state.type + "”"); }
      if (state.measured) { parts.push("entries with benchmark measurements"); }
      return parts.join(", ");
    }

    function render() {
      var shown = entries.filter(matches);
      var countEl = document.getElementById("count");
      if (countEl) {
        countEl.textContent = "showing " + shown.length + " of " + entries.length + " entries";
      }

      if (!shown.length) {
        timeline.innerHTML =
          '<div class="empty-state"><h3>No entries match this view</h3>' +
          "<p>The active filter (" + esc(filterDescription()) + ") matches nothing in the record. " +
          "The registry covers releases from the 12 tracked organizations, from " +
          esc(meta ? meta.first_date : "2022") + " to " + esc(meta ? meta.last_date : "today") + ".</p>" +
          '<p><a href="./methodology.html">How to read this registry</a>, including what the scope covers and how it can grow.</p></div>';
        renderYearRuler([]);
        return;
      }

      var html = "";
      var currentYear = null;
      var years = [];
      var perYear = {};
      shown.forEach(function (e) {
        var y = e.date.slice(0, 4);
        perYear[y] = (perYear[y] || 0) + 1;
      });
      for (var i = 0; i < shown.length; i++) {
        var e = shown[i];
        var y = e.date.slice(0, 4);
        if (y !== currentYear) {
          currentYear = y;
          years.push(y);
          html += '<div class="year-marker" id="y' + y + '"><h2>' + y + "</h2>" +
            '<span class="year-count">' + perYear[y] + (perYear[y] === 1 ? " entry" : " entries") + "</span></div>";
        }
        html += entryCard(e, deltaItemsFor(e.id));
      }
      timeline.innerHTML = html;
      renderYearRuler(years);
    }

    function renderYearRuler(years) {
      var ruler = document.getElementById("year-ruler");
      if (!ruler) { return; }
      ruler.innerHTML = years.map(function (y) {
        return '<a href="#y' + y + '">' + y + "</a>";
      }).join("");
    }

    function bindControls() {
      var orgSel = document.getElementById("f-org");
      var typeSel = document.getElementById("f-type");
      var measChk = document.getElementById("f-meas");
      if (orgSel) {
        Object.keys(ORG_NAMES).sort(function (a, b) {
          return ORG_NAMES[a].localeCompare(ORG_NAMES[b]);
        }).forEach(function (key) {
          var opt = document.createElement("option");
          opt.value = key;
          opt.textContent = ORG_NAMES[key];
          orgSel.appendChild(opt);
        });
        orgSel.addEventListener("change", function () { state.org = orgSel.value; render(); });
      }
      if (typeSel) {
        typeSel.addEventListener("change", function () { state.type = typeSel.value; render(); });
      }
      if (measChk) {
        measChk.addEventListener("change", function () { state.measured = measChk.checked; render(); });
      }
    }

    Promise.all([
      loadJson("manifest.json"),
      loadGzJson("derived/deltas.json.gz"),
      loadJson("derived/site_meta.json")
    ]).then(function (results) {
      var manifest = results[0];
      deltas = results[1];
      meta = results[2];
      renderFooter(meta);

      var scope = document.getElementById("registry-scope");
      if (scope && meta) {
        scope.innerHTML = "A public registry of AI model releases from 12 tracked organizations. " +
          '<span class="num">' + meta.entry_count + "</span> entries, " +
          '<span class="num">' + esc(meta.first_date) + "</span> to " +
          '<span class="num">' + esc(meta.last_date) + "</span>.";
      }

      var files = Object.keys(manifest.files || {}).sort();
      return Promise.all(files.map(function (f) {
        return loadGzJson(f.replace(/^data\//, ""));
      }));
    }).then(function (yearArrays) {
      entries = [];
      yearArrays.forEach(function (arr) { entries = entries.concat(arr); });
      entries.sort(function (a, b) {
        if (a.date !== b.date) { return a.date < b.date ? 1 : -1; }
        return a.id < b.id ? -1 : 1;
      });
      bindControls();
      render();
    }).catch(function (err) {
      timeline.innerHTML = '<div class="load-error"><p>The registry record could not be loaded in this session (' +
        esc(err && err.message ? err.message : "unknown error") +
        ').</p><p>The dataset itself is unaffected; it is versioned with the site. Reloading the page retries the fetch.</p></div>';
    });
  }

  /* ---- prose pages: footer only ---- */

  function initFooterOnly() {
    if (document.getElementById("timeline")) { return; }
    if (!document.getElementById("foot-update")) { return; }
    loadJson("derived/site_meta.json").then(renderFooter).catch(function () {
      var el = document.getElementById("foot-update");
      if (el) { el.textContent = "Update record unavailable in this session."; }
    });
  }

  initTimeline();
  initFooterOnly();
})();
