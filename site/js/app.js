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

  /* Country of the parent company's headquarters; mirrors pipeline/config.py
     REGISTRY[...]["country"] (a test holds the two together). Context for a
     filter only: never a ranking, never a grouping in the story. */
  var ORG_COUNTRY = {
    "openai": "United States",
    "anthropic": "United States",
    "google-deepmind": "United States",
    "meta": "United States",
    "xai": "United States",
    "mistral": "France",
    "deepseek": "China",
    "alibaba-qwen": "China",
    "moonshot": "China",
    "zai": "China",
    "cohere": "Canada",
    "amazon": "United States"
  };

  /* how an entry first reached the record (methodology: "Who decides") */
  var ORIGIN_NAMES = {
    "backfill-epoch": "from Epoch AI data",
    "nightly-pipeline": "found by nightly detection, approved by hand",
    "manual": "recorded by hand"
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

  /* We have not looked yet. Rendered as plain words, apart from
     the not-disclosed mark: a gap in the record is not a claim about the lab. */
  function nrMark() {
    return '<span class="nr" title="Not yet researched. This is a gap in our record, not a statement about the lab.">not yet researched</span>';
  }

  /* Parameters are a third state. The count comes from Epoch AI's data and
     nobody has checked the lab's pages for it, so a blank is "no count on
     record", never the not-disclosed mark (that mark means we looked). */
  function noCountMark() {
    return '<span class="nr" title="Epoch AI\'s data has no parameter count for this model. We have not checked whether the lab stated one.">no count on record</span>';
  }

  var SOURCE_KIND_NAMES = {
    epoch_csv: "Epoch AI data",
    lab_link: "lab page",
    lab_announcement: "lab announcement",
    paper: "paper"
  };

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
          provTag(d.source_class, d.source_url || null, null) + "</span>";
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
    if (ORIGIN_NAMES[e.origin]) {
      html += '<span class="entry-origin">' + esc(ORIGIN_NAMES[e.origin]) + "</span>";
    }
    /* "release" is the default and appears on nearly every card, so it is dropped
       as noise; only the exceptions (revisions) carry a tag. */
    if (e.entry_type === "revision") {
      html += '<span class="entry-kind is-revision">revision</span>';
    }
    if (e.retracted) {
      html += '<span class="entry-retracted">retracted or corrected</span>';
    }
    html += "</div>";

    html += '<h3 class="entry-name"><a href="#' + esc(e.id) + '">' + esc(e.model_name) + "</a></h3>";
    html += '<button type="button" class="entry-copylink" data-id="' + esc(e.id) +
      '" aria-label="Copy a link to ' + esc(e.model_name) + '">Copy link</button>';

    if (e.variants && e.variants.length) {
      html += '<p class="entry-variants">Variants: ' + e.variants.map(esc).join(", ") + "</p>";
    }

    html += '<p class="entry-summary">' + esc(e.summary) + "</p>";

    if (e.correction_note) {
      /* corrections render as an outlined annotation layer (rule 8) */
      html += '<p class="entry-correction">' + esc(e.correction_note) + "</p>";
    }

    html += '<div class="entry-facts">';
    html += '<span class="fact">availability: <b>' + esc(AVAIL_NAMES[e.availability_class] || e.availability_class) + "</b></span>";
    if (e.parameters === "NOT_DISCLOSED") {
      html += '<span class="fact">parameters: ' + noCountMark() + "</span>";
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
      if (v && v !== "NOT_DISCLOSED" && v !== "NOT_RESEARCHED") {
        html += '<a href="' + esc(v) + '" rel="external">link</a>';
      } else if (v === "NOT_DISCLOSED") {
        html += ndMark();
      } else {
        html += nrMark();
      }
      html += "</div>";
    }
    html += "</div>";

    var foot = [];
    if (e.license_note) { foot.push(esc(e.license_note)); }
    if (e.sources && e.sources.length) {
      var srcLinks = e.sources.map(function (src) {
        return '<a href="' + esc(src.url) + '" rel="external">' + esc(SOURCE_KIND_NAMES[src.kind] || src.kind.replace(/_/g, " ")) +
          "</a> (retrieved " + esc(src.retrieval_date) +
          (src.archived_url ? ', <a href="' + esc(src.archived_url) + '" rel="external">archived copy</a>' : "") + ")";
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
        " days old: no new entries have been approved since " +
        esc(meta.last_successful_update) +
        ". New releases wait in a review queue until a person approves them.</span>";
    }
    el.innerHTML = txt;
  }

  /* ---- timeline page ---- */

  function initTimeline() {
    var timeline = document.getElementById("timeline");
    if (!timeline) { return; }

    var state = { org: "all", country: "all", q: "", type: "all", measured: false, from: null, to: null };
    var entries = [];
    var deltas = {};
    var meta = null;
    var rangeSync = null; /* set by the explorer so app-side changes reach the brush */

    function deltaItemsFor(id) { return deltas[id] || []; }

    function matches(e) {
      if (state.org !== "all" && e.org !== state.org) { return false; }
      if (state.country !== "all" && ORG_COUNTRY[e.org] !== state.country) { return false; }
      if (state.q) {
        var hay = (e.model_name + " " + (e.variants || []).join(" ") + " " + e.id).toLowerCase();
        if (hay.indexOf(state.q) < 0) { return false; }
      }
      if (state.type !== "all" && e.entry_type !== state.type) { return false; }
      if (state.measured && !(e.benchmarks && e.benchmarks.length)) { return false; }
      if (state.from && e.date < state.from) { return false; }
      if (state.to && e.date > state.to) { return false; }
      return true;
    }

    function filterDescription() {
      var parts = [];
      if (state.org !== "all") { parts.push("organization " + (ORG_NAMES[state.org] || state.org)); }
      if (state.country !== "all") { parts.push("organizations based in " + state.country); }
      if (state.q) { parts.push("names containing “" + state.q + "”"); }
      if (state.type !== "all") { parts.push("entry type “" + state.type + "”"); }
      if (state.measured) { parts.push("entries with benchmark measurements"); }
      if (state.from || state.to) {
        parts.push("date range " + (state.from || "the start of the record") +
          " to " + (state.to || "the end of the record"));
      }
      return parts.join(", ");
    }

    /* ---- permalink: ?from=YYYY-MM-DD&to=YYYY-MM-DD (amendment D13) ---- */

    var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    function validDate(s) {
      if (!s || !DATE_RE.test(s)) { return false; }
      var d = new Date(s + "T00:00:00Z");
      return !isNaN(d) && d.toISOString().slice(0, 10) === s;
    }

    function readRangeFromUrl() {
      var params = new URLSearchParams(location.search);
      var from = params.get("from");
      var to = params.get("to");
      state.from = validDate(from) ? from : null;
      state.to = validDate(to) ? to : null;
      if (state.from && state.to && state.from > state.to) {
        var t = state.from; state.from = state.to; state.to = t;
      }
    }

    function writeRangeToUrl() {
      var params = new URLSearchParams(location.search);
      if (state.from) { params.set("from", state.from); } else { params.delete("from"); }
      if (state.to) { params.set("to", state.to); } else { params.delete("to"); }
      var q = params.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    }

    /* ---- explorer-driven filter note: an outlined annotation layer ---- */

    function setFilterNote(text) {
      var note = document.getElementById("filter-note");
      if (!note) { return; }
      if (!text) { note.hidden = true; note.innerHTML = ""; return; }
      note.innerHTML = '<span class="filter-note-text">' + esc(text) + "</span> " +
        '<button type="button" class="ledger-btn" id="filter-note-clear">Clear this filter</button>';
      note.hidden = false;
      var btn = document.getElementById("filter-note-clear");
      if (btn) {
        btn.addEventListener("click", function () {
          state.org = "all"; state.type = "all";
          var orgSel = document.getElementById("f-org");
          var typeSel = document.getElementById("f-type");
          if (orgSel) { orgSel.value = "all"; }
          if (typeSel) { typeSel.value = "all"; }
          setFilterNote(null);
          render();
        });
      }
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
        orgSel.addEventListener("change", function () { state.org = orgSel.value; setFilterNote(null); render(); });
      }
      if (typeSel) {
        typeSel.addEventListener("change", function () { state.type = typeSel.value; setFilterNote(null); render(); });
      }
      var countrySel = document.getElementById("f-country");
      if (countrySel) {
        countrySel.addEventListener("change", function () { state.country = countrySel.value; setFilterNote(null); render(); });
      }
      var qInput = document.getElementById("f-q");
      if (qInput) {
        var qTimer = null;
        qInput.addEventListener("input", function () {
          clearTimeout(qTimer);
          qTimer = setTimeout(function () { state.q = qInput.value.trim().toLowerCase(); render(); }, 150);
        });
      }
      /* copy-link on each card: delegated, since cards re-render on filter */
      document.addEventListener("click", function (event) {
        var btn = event.target.closest ? event.target.closest(".entry-copylink") : null;
        if (!btn) { return; }
        var url = location.origin + location.pathname + "#" + btn.getAttribute("data-id");
        var done = function () { btn.textContent = "Link copied"; setTimeout(function () { btn.textContent = "Copy link"; }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, function () { location.hash = btn.getAttribute("data-id"); });
        } else {
          location.hash = btn.getAttribute("data-id");
        }
      });
      if (measChk) {
        measChk.addEventListener("change", function () { state.measured = measChk.checked; render(); });
      }
    }

    /* ---- deep-link restore: async sections above the timeline shift the
       anchor after the browser's own fragment scroll, so the app re-scrolls
       once layout settles, unless the reader has already scrolled ---- */

    var userScrolled = false;
    ["wheel", "touchstart", "keydown"].forEach(function (evt) {
      window.addEventListener(evt, function () { userScrolled = true; }, { once: true, passive: true });
    });

    /* Cards above the target use content-visibility estimates until they
       render, so a single scroll lands short or long. Scroll instantly and
       re-settle until the card's position is stable. */
    function scrollToCard(el) {
      var last = null;
      var tries = 0;
      function step() {
        el.scrollIntoView({ behavior: "instant", block: "start" });
        var top = el.getBoundingClientRect().top;
        if (last !== null && Math.abs(top - last) < 2) { return; }
        last = top;
        tries += 1;
        if (tries < 12) { requestAnimationFrame(step); }
      }
      step();
    }

    function restoreHash() {
      if (userScrolled || !location.hash) { return; }
      var id = decodeURIComponent(location.hash.slice(1));
      var el = document.getElementById(id);
      if (el && el.classList.contains("entry")) { scrollToCard(el); return; }
      /* a shared link to a card the current filters hide: relax them */
      if (!el) { revealEntry(id); }
    }

    /* In-page anchor jumps to entry cards need the same settling, because
       the native jump lands on content-visibility size estimates. */
    window.addEventListener("hashchange", function () {
      if (!location.hash) { return; }
      var el = document.getElementById(location.hash.slice(1));
      if (el && el.classList.contains("entry")) { scrollToCard(el); }
    });

    /* ---- the explorer API: brush, matrix and trajectory drive this one path ---- */

    function applyRange(from, to) {
      state.from = from || null;
      state.to = to || null;
      writeRangeToUrl();
      render();
    }

    function revealEntry(id) {
      var entry = null;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].id === id) { entry = entries[i]; break; }
      }
      if (!entry) { return; }
      if (!document.getElementById(id)) {
        /* the target card is filtered out; relax exactly the filters that hide it */
        var orgSel = document.getElementById("f-org");
        var typeSel = document.getElementById("f-type");
        var measChk = document.getElementById("f-meas");
        if (state.org !== "all" && state.org !== entry.org) {
          state.org = "all"; if (orgSel) { orgSel.value = "all"; }
        }
        if (state.country !== "all" && state.country !== ORG_COUNTRY[entry.org]) {
          state.country = "all";
          var cSel = document.getElementById("f-country"); if (cSel) { cSel.value = "all"; }
        }
        if (state.q) {
          state.q = "";
          var qIn = document.getElementById("f-q"); if (qIn) { qIn.value = ""; }
        }
        if (state.type !== "all" && state.type !== entry.entry_type) {
          state.type = "all"; if (typeSel) { typeSel.value = "all"; }
        }
        if (state.measured && !(entry.benchmarks && entry.benchmarks.length)) {
          state.measured = false; if (measChk) { measChk.checked = false; }
        }
        if ((state.from && entry.date < state.from) || (state.to && entry.date > state.to)) {
          state.from = null; state.to = null;
          writeRangeToUrl();
          if (rangeSync) { rangeSync(null, null); }
        }
        setFilterNote(null);
        render();
      }
      var el = document.getElementById(id);
      if (!el) { return; }
      if (location.hash !== "#" + id) { location.hash = id; }
      scrollToCard(el);
    }

    function filterOrgReleases(org, note) {
      var orgSel = document.getElementById("f-org");
      var typeSel = document.getElementById("f-type");
      state.org = org;
      state.type = "release";
      if (orgSel) { orgSel.value = org; }
      if (typeSel) { typeSel.value = "release"; }
      setFilterNote(note);
      render();
      var controls = document.querySelector(".controls");
      if (controls) { controls.scrollIntoView({ block: "start" }); }
    }

    function startExplorer() {
      if (!window.VCExplorer) { return; }
      window.VCExplorer.init({
        entries: entries,
        meta: meta,
        orgNames: ORG_NAMES,
        loadGzJson: loadGzJson,
        getRange: function () { return { from: state.from, to: state.to }; },
        applyRange: applyRange,
        revealEntry: revealEntry,
        filterOrgReleases: filterOrgReleases,
        registerRangeSync: function (fn) { rangeSync = fn; },
        layoutSettled: restoreHash
      });
    }

    /* the most-recent release on record: a callout above the pulse. entries are
       sorted newest-first, so entries[0] is it. Shows model, date and org; days-
       since lives in the measures tile, so it is not repeated here. */
    function renderLatest(e) {
      if (!e) { return; }
      var card = document.getElementById("latest-release");
      var nameEl = document.getElementById("latest-name");
      var metaEl = document.getElementById("latest-meta");
      if (!card || !nameEl || !metaEl) { return; }
      nameEl.textContent = e.model_name;
      metaEl.textContent = e.date + " · " + (ORG_NAMES[e.org] || e.org) +
        (e.entry_type === "revision" ? " · revision" : "");
      card.setAttribute("href", "#" + e.id);
      card.hidden = false;
      card.addEventListener("click", function (ev) { ev.preventDefault(); revealEntry(e.id); });
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
          '<span class="num">' + esc(meta.last_date) + "</span>. Maintained by " +
          '<a href="https://walker-robinson.com">Walker Robinson</a>.';
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
      renderLatest(entries[0]);
      bindControls();
      readRangeFromUrl();
      render();
      restoreHash();
      startExplorer();
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

  /* ---- changes page: corrections, retractions, additions, all read from
     the published entry files so the list cannot drift from the record ---- */

  function initChanges() {
    var corrEl = document.getElementById("changes-corrections");
    if (!corrEl) { return; }
    var retrEl = document.getElementById("changes-retractions");
    var addEl = document.getElementById("changes-added");
    function link(e) {
      return '<a href="./index.html#' + esc(e.id) + '">' + esc(e.model_name) + "</a> (" +
        esc(ORG_NAMES[e.org] || e.org) + ", " + esc(e.date) + ")";
    }
    function firstRead(e) {
      var dates = (e.sources || []).map(function (s) { return s.retrieval_date; }).filter(Boolean).sort();
      return dates[0] || e.date;
    }
    loadJson("manifest.json").then(function (manifest) {
      var files = Object.keys(manifest.files || {}).sort();
      return Promise.all(files.map(function (f) { return loadGzJson(f.replace(/^data\//, "")); }));
    }).then(function (arrays) {
      var all = [];
      arrays.forEach(function (a) { all = all.concat(a); });

      var corrected = all.filter(function (e) { return e.correction_note; });
      corrEl.innerHTML = corrected.length ? "<ul>" + corrected.map(function (e) {
        return "<li>" + link(e) + ". " + esc(e.correction_note) + "</li>";
      }).join("") + "</ul>" : "<p>No corrections on record.</p>";

      var retracted = all.filter(function (e) { return e.retracted; });
      retrEl.innerHTML = retracted.length ? "<ul>" + retracted.map(function (e) {
        return "<li>" + link(e) + ". " + esc(e.retraction_note || "") + "</li>";
      }).join("") + "</ul>" : "<p>No entry has been retracted.</p>";

      var backfill = all.filter(function (e) { return e.origin === "backfill-epoch"; });
      var byDate = {};
      all.forEach(function (e) {
        if (e.origin === "backfill-epoch") { return; }
        var d = firstRead(e);
        (byDate[d] = byDate[d] || []).push(e);
      });
      var html = "<ul>";
      if (backfill.length) {
        html += "<li><b>Initial build</b>: " + backfill.length +
          " entries from Epoch AI's dataset, read " + esc(firstRead(backfill[0])) + ".</li>";
      }
      Object.keys(byDate).sort().reverse().forEach(function (d) {
        var list = byDate[d].sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        html += "<li><b>" + esc(d) + "</b>: " + list.map(link).join("; ") + ".</li>";
      });
      addEl.innerHTML = html + "</ul>";
    }).catch(function () {
      [corrEl, retrEl, addEl].forEach(function (el) {
        el.innerHTML = "<p>The dataset could not be loaded in this session.</p>";
      });
    });
  }

  initTimeline();
  initFooterOnly();
  initChanges();
})();
