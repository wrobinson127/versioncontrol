/* Version Control : explorer (amendment 1, D13-D17)
   Pulse strip, registry measures, measured trajectory, disclosure record.
   Everything here renders the derived views file verbatim and drives the
   existing timeline filter path in app.js. Marks share the ink palette;
   organization identity is label-first (DESIGN.md rule 7). The trajectory
   renders marks only: no line ever connects points, so no line can cross
   benchmark versions or provenance classes (amendment D15). */

(function () {
  "use strict";

  /* Fixed registry order (pipeline/config.py). Never score order. */
  var REGISTRY_ORDER = [
    "openai", "anthropic", "google-deepmind", "meta", "xai", "mistral",
    "deepseek", "alibaba-qwen", "moonshot", "zai", "cohere", "amazon"
  ];

  var ARTIFACT_NAMES = {
    "system_card": "system card",
    "model_card": "model card",
    "usage_policy": "usage policy",
    "paper": "paper"
  };

  var CLASS_NAMES = {
    "INDEPENDENT": "independent",
    "LAB_REPORTED": "lab reported"
  };

  /* Fixed legend order for provenance classes (amendment D15). */
  var CLASS_ORDER = ["INDEPENDENT", "LAB_REPORTED"];

  var parseDate = null; /* bound after d3 loads */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(d) {
    /* UTC date -> YYYY-MM-DD without locale drift */
    return d.toISOString().slice(0, 10);
  }

  function chartsUnavailable(message) {
    ["pulse-strip", "traj-chart"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.innerHTML = '<p class="chart-unavailable">' + esc(message) + "</p>";
      }
    });
  }

  /* ---- shared tooltip: one absolutely positioned annotation card ---- */

  function makeTip(container) {
    var tip = document.createElement("div");
    tip.className = "mark-tip";
    tip.hidden = true;
    container.appendChild(tip);
    return {
      show: function (html, x, y) {
        tip.innerHTML = html;
        tip.hidden = false;
        var maxX = container.clientWidth - tip.offsetWidth - 4;
        tip.style.left = Math.max(0, Math.min(x + 10, maxX)) + "px";
        tip.style.top = Math.max(0, y - tip.offsetHeight - 10) + "px";
      },
      hide: function () { tip.hidden = true; }
    };
  }

  /* =================== pulse strip (D13) =================== */

  function initPulse(api, entries, meta, views) {
    var holder = document.getElementById("pulse-strip");
    if (!holder || !window.d3) { return; }

    var d3 = window.d3;
    var byId = {};
    entries.forEach(function (e) { byId[e.id] = e; });
    var monthly = (views && views.cadence && views.cadence.monthly) || [];

    /* the pulse legend: one concise line; counts and dates live in the measures
       tiles and on the chart itself, so they are not repeated in prose here. */
    var summaryEl = document.getElementById("pulse-summary");
    if (summaryEl) {
      summaryEl.textContent = "One mark per entry, one row per lab. Filled marks are releases, faint marks revisions. Drag to filter the timeline below.";
    }

    var domainStart = parseDate(meta.first_date);
    var domainEnd = parseDate(meta.last_date);
    /* pad the axis ten days each side so edge marks are not sliced */
    var pad = 10 * 86400000;
    var x0 = new Date(domainStart.getTime() - pad);
    var x1 = new Date(domainEnd.getTime() + pad);

    var fromInput = document.getElementById("range-from");
    var toInput = document.getElementById("range-to");
    var clearBtn = document.getElementById("range-clear");
    if (fromInput) { fromInput.min = meta.first_date; fromInput.max = meta.last_date; }
    if (toInput) { toInput.min = meta.first_date; toInput.max = meta.last_date; }

    var scroller = document.createElement("div");
    scroller.className = "pulse-scroll";
    holder.appendChild(scroller);
    var tip = makeTip(holder);

    var histH = monthly.length ? 62 : 0;
    var x, brush, brushG, rowH = 15, labelW = 128,
      margin = { top: 4, right: 10, bottom: 22 },
      innerH = REGISTRY_ORDER.length * rowH,
      height = margin.top + innerH + margin.bottom + histH;

    var suppressBrushEvents = false;
    var brushing = false;
    var markIndex = []; /* {px, rowTop, entry} for proximity hit tests */

    /* Marks are pointer-transparent so the whole strip brushes; hover and
       click resolve against the nearest mark instead. */
    function hitTest(px, py) {
      var best = null, bestDx = 5;
      for (var i = 0; i < markIndex.length; i++) {
        var m = markIndex[i];
        if (py < m.rowTop || py > m.rowTop + rowH) { continue; }
        var dx = Math.abs(px - m.px);
        if (dx < bestDx) { bestDx = dx; best = m; }
      }
      return best;
    }

    function draw() {
      scroller.innerHTML = "";
      var width = Math.max(holder.clientWidth, 560);

      var svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("aria-hidden", "true")
        .attr("class", "pulse-svg");

      x = d3.scaleUtc().domain([x0, x1]).range([labelW, width - margin.right]);

      /* ledger ruling: one faint rule per organization row */
      var rows = svg.append("g");
      REGISTRY_ORDER.forEach(function (org, i) {
        var y = margin.top + i * rowH;
        rows.append("line")
          .attr("class", "pulse-rule")
          .attr("x1", labelW).attr("x2", width - margin.right)
          .attr("y1", y + rowH - 3).attr("y2", y + rowH - 3);
        rows.append("text")
          .attr("class", "pulse-label")
          .attr("x", labelW - 8)
          .attr("y", y + rowH - 5)
          .attr("text-anchor", "end")
          .text(api.orgNames[org] || org);
      });

      /* year ticks along the base */
      var axis = svg.append("g").attr("class", "pulse-axis");
      d3.utcYear.range(x0, x1).forEach(function (t) {
        var px = x(t);
        axis.append("line")
          .attr("x1", px).attr("x2", px)
          .attr("y1", margin.top + innerH - 1)
          .attr("y2", margin.top + innerH + 5);
        axis.append("text")
          .attr("x", px + 4)
          .attr("y", margin.top + innerH + 16)
          .text(t.getUTCFullYear());
      });

      /* releases per month on the same time scale: the cadence itself,
         as raw counts, beneath the strip. Bars are data marks. */
      if (histH) {
        var bars = svg.append("g").attr("class", "pulse-bars");
        var histTop = margin.top + innerH + 26;
        var histBase = histTop + histH - 26;
        var maxCount = d3.max(monthly, function (m) { return m.releases; }) || 1;
        var yBar = d3.scaleLinear().domain([0, maxCount]).range([0, histH - 34]);
        bars.append("text")
          .attr("class", "pulse-bar-label")
          .attr("x", labelW - 8).attr("y", histBase - 1)
          .attr("text-anchor", "end")
          .text("releases per month");
        bars.append("text")
          .attr("class", "pulse-bar-max")
          .attr("x", labelW - 8).attr("y", histBase - yBar(maxCount) + 3)
          .attr("text-anchor", "end")
          .text(maxCount);
        bars.append("line")
          .attr("class", "pulse-rule")
          .attr("x1", labelW).attr("x2", width - margin.right)
          .attr("y1", histBase).attr("y2", histBase);
        monthly.forEach(function (m) {
          if (!m.releases) { return; }
          var t0m = parseDate(m.month + "-01");
          var next = new Date(Date.UTC(t0m.getUTCFullYear(),
                                       t0m.getUTCMonth() + 1, 1));
          var bx = x(t0m);
          var bw = Math.max(2, x(next) - bx - 1.5);
          bars.append("rect")
            .attr("class", "pulse-bar")
            .attr("x", bx).attr("width", bw)
            .attr("y", histBase - yBar(m.releases))
            .attr("height", yBar(m.releases));
        });
      }

      /* the brush overlay owns every gesture on the strip: a drag selects
         a range, a plain click on a mark opens its entry card, a plain
         click on empty strip clears the range */
      var gestureStart = null;
      brush = d3.brushX()
        .extent([[labelW, margin.top], [width - margin.right, margin.top + innerH]])
        .on("start", function (event) {
          if (!suppressBrushEvents && event.sourceEvent) {
            brushing = true;
            tip.hide();
            gestureStart = d3.pointer(event.sourceEvent, svg.node());
          }
        })
        .on("brush", function (event) {
          if (suppressBrushEvents || !event.sourceEvent) { return; }
          var sel = event.selection;
          if (sel) { setInputs(fmtDate(x.invert(sel[0])), fmtDate(x.invert(sel[1]))); }
        })
        .on("end", function (event) {
          if (suppressBrushEvents || !event.sourceEvent) { return; }
          brushing = false;
          var pt = d3.pointer(event.sourceEvent, svg.node());
          var moved = !gestureStart ||
            Math.abs(pt[0] - gestureStart[0]) > 3 || Math.abs(pt[1] - gestureStart[1]) > 3;
          gestureStart = null;
          var sel = event.selection;
          if (!moved) {
            /* a plain click, wherever it lands on the strip: on a mark it
               opens the entry and keeps the active range; on empty strip
               it clears the range */
            var hit = hitTest(pt[0], pt[1]);
            if (hit) {
              restoreBrush();
              api.revealEntry(hit.entry.id);
              return;
            }
            if (!sel) {
              setInputs("", "");
              api.applyRange(null, null);
            }
            return;
          }
          if (!sel) {
            setInputs("", "");
            api.applyRange(null, null);
            return;
          }
          var from = fmtDate(x.invert(sel[0]));
          var to = fmtDate(x.invert(sel[1]));
          setInputs(from, to);
          api.applyRange(from, to);
        });

      brushG = svg.append("g").attr("class", "pulse-brush").call(brush);

      var marks = svg.append("g").attr("class", "pulse-marks");
      var rowIndex = {};
      REGISTRY_ORDER.forEach(function (org, i) { rowIndex[org] = i; });

      markIndex = [];
      entries.forEach(function (e) {
        var ri = rowIndex[e.org];
        if (ri === undefined) { return; }
        var isRev = e.entry_type === "revision";
        var mx = x(parseDate(e.date));
        var rowTop = margin.top + ri * rowH;
        var yBase = rowTop + rowH - 3;
        var h = isRev ? 6 : 9;
        var w = isRev ? 1.5 : 2.5;
        marks.append("rect")
          .attr("class", "pulse-mark" + (isRev ? " is-revision" : ""))
          .attr("x", mx - w / 2).attr("y", yBase - h)
          .attr("width", w).attr("height", h);
        markIndex.push({ px: mx, rowTop: rowTop, entry: e });
      });

      /* proximity hover: tooltip and cursor from the nearest mark */
      svg.on("mousemove", function (event) {
        if (brushing) { return; }
        var pt = d3.pointer(event, svg.node());
        var hit = hitTest(pt[0], pt[1]);
        brushG.select(".overlay").attr("cursor", hit ? "pointer" : "crosshair");
        if (!hit) { tip.hide(); return; }
        var hp = d3.pointer(event, holder);
        var e = hit.entry;
        tip.show(
          '<span class="tip-name">' + esc(e.model_name) + "</span>" +
          '<span class="tip-date">' + esc(e.date) + "</span>" +
          '<span class="tip-org">' + esc(api.orgNames[e.org] || e.org) +
          ", " + esc(e.entry_type) + "</span>",
          hp[0], hp[1]);
      }).on("mouseleave", tip.hide);

      scroller.appendChild(svg.node());
      restoreBrush();
    }

    function setInputs(from, to) {
      if (fromInput) { fromInput.value = from; }
      if (toInput) { toInput.value = to; }
    }

    function moveBrushTo(from, to) {
      if (!brushG) { return; }
      suppressBrushEvents = true;
      var moved = false;
      if (from && to) {
        /* clamp to the brushable extent; a range wholly outside the
           record shows no selection while the inputs keep the dates */
        var a = Math.max(x(parseDate(from)), x.range()[0]);
        var b = Math.min(x(parseDate(to)), x.range()[1]);
        if (b - a >= 1) {
          brushG.call(brush.move, [a, b]);
          moved = true;
        }
      }
      if (!moved) { brushG.call(brush.move, null); }
      suppressBrushEvents = false;
    }

    function restoreBrush() {
      var r = api.getRange();
      setInputs(r.from || "", r.to || "");
      moveBrushTo(r.from, r.to);
    }

    /* keyboard access: the paired date inputs are the brush equivalent */
    function onInputChange() {
      var from = fromInput && fromInput.value ? fromInput.value : null;
      var to = toInput && toInput.value ? toInput.value : null;
      if (from && to && from > to) { var t = from; from = to; to = t; setInputs(from, to); }
      moveBrushTo(from && to ? from : null, from && to ? to : null);
      api.applyRange(from, to);
    }
    if (fromInput) { fromInput.addEventListener("change", onInputChange); }
    if (toInput) { toInput.addEventListener("change", onInputChange); }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        setInputs("", "");
        moveBrushTo(null, null);
        api.applyRange(null, null);
      });
    }

    /* app-side range changes (revealEntry relaxing a range) reach the brush */
    api.registerRangeSync(function (from, to) {
      setInputs(from || "", to || "");
      moveBrushTo(from, to);
    });

    draw();

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 150);
    });
  }

  /* =================== registry measures (D14) =================== */

  function initTiles(views) {
    var row = document.getElementById("tile-row");
    var foot = document.getElementById("tiles-foot");
    if (!row || !views || !views.tiles) { return; }
    var t = views.tiles;

    var sharePct = Math.round((t.share_with_system_card || 0) * 1000) / 10;

    /* while system card links sit in the registrar's review queue, a 0%
       headline would misstate the labs' record (DESIGN rule 2); the
       papers measure is the honest tile until approvals land */
    var pendingCards = (t.system_card_links_pending || 0) > 0 &&
      !(t.share_with_system_card > 0);
    var fourth = pendingCards
      ? { value: String(t.papers_on_record), label: "releases with a paper link" }
      : { value: sharePct + "%",
          label: "of " + (t.system_card_researched || 0) +
            " researched releases carry a system card link" };

    /* "Oct 15": an ISO date is too wide for the tile's display size */
    function shortDate(iso) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
      if (!m) { return ""; }
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                    "Sep", "Oct", "Nov", "Dec"];
      return months[+m[2] - 1] + " " + (+m[3]);
    }

    var tiles = [
      { value: String(t.releases_recorded),
        label: "releases recorded, of " + (t.entries_recorded || t.releases_recorded) + " entries" },
      { value: shortDate(t.last_release_date),
        label: "date of the newest release on record (" +
          String(t.last_release_date || "").slice(0, 4) +
          "). Record checked " + t.as_of + "." },
      { value: String(t.median_gap_days_this_year), label: "median gap between releases this year, in days" },
      fourth
    ];

    row.innerHTML = tiles.map(function (tile) {
      return '<div class="tile">' +
        '<span class="tile-value">' + esc(tile.value) + "</span>" +
        '<span class="tile-label">' + esc(tile.label) + "</span></div>";
    }).join("");

    if (foot) {
      foot.textContent = "Figures as of " + t.as_of + "." +
        (pendingCards ? " System card, model card, and usage policy links are awaiting review and not yet on record." : "");
    }
  }

  /* =================== measured trajectory (D15) =================== */

  function initTrajectory(api, views) {
    var holder = document.getElementById("traj-chart");
    var captionEl = document.getElementById("traj-caption");
    var altEl = document.getElementById("traj-alt");
    if (!holder || !views || !views.trajectory || !window.d3) { return; }

    var d3 = window.d3;
    var series = views.trajectory.series || [];
    var eras = views.trajectory.eras || {};

    var state = {
      benchmark: "gpqa-diamond",
      classes: { "INDEPENDENT": true, "LAB_REPORTED": true }
    };

    var tip = makeTip(holder);
    var chartMount = document.createElement("div");
    chartMount.className = "traj-mount";
    holder.appendChild(chartMount);

    function visibleSeries() {
      /* fixed order: benchmark series in file order, classes in CLASS_ORDER */
      var out = [];
      CLASS_ORDER.forEach(function (cls) {
        if (!state.classes[cls]) { return; }
        series.forEach(function (s) {
          if (s.benchmark === state.benchmark && s.source_class === cls) { out.push(s); }
        });
      });
      return out;
    }

    function benchMeta() {
      for (var i = 0; i < series.length; i++) {
        if (series[i].benchmark === state.benchmark) {
          return { name: series[i].benchmark_name, version: series[i].benchmark_version };
        }
      }
      return { name: state.benchmark, version: "" };
    }

    function updateCaption() {
      var bm = benchMeta();
      var eraList = eras[state.benchmark] || [];
      var eraText = eraList.map(function (er) {
        return "era " + er.version + " from " + er.start + (er.end ? " to " + er.end : " onward");
      }).join("; ");
      if (captionEl) {
        captionEl.textContent = bm.name + ", benchmark version " + bm.version +
          ", scored on the benchmark's own 0 to 100 scale" +
          (eraText ? "; " + eraText : "") +
          ". Marks only; no line connects points across versions or provenance classes.";
      }
    }

    function updateAlt() {
      var vis = visibleSeries();
      if (!altEl) { return; }
      if (!vis.length) {
        var anyChecked = CLASS_ORDER.some(function (c) { return state.classes[c]; });
        altEl.textContent = anyChecked ?
          "No measurements in the selected provenance classes for this benchmark; the chart shows no points." :
          "No provenance class is selected; the chart shows no points.";
        return;
      }
      altEl.textContent = vis.map(function (s) {
        var vals = s.points.map(function (p) { return p.value; });
        var dates = s.points.map(function (p) { return p.date; });
        return s.benchmark_name + " version " + s.benchmark_version + ", " +
          (CLASS_NAMES[s.source_class] || s.source_class) + ": " +
          s.points.length + " points from " + d3.min(dates) + " to " + d3.max(dates) +
          ", values " + d3.min(vals) + " to " + d3.max(vals) + ".";
      }).join(" ");
    }

    function updateSource() {
      /* the source and retrieval line, at point of use */
      var srcEl = document.getElementById("traj-source");
      if (!srcEl) { return; }
      var vis = visibleSeries();
      if (!vis.length) { srcEl.textContent = ""; return; }
      var parts = [];
      vis.forEach(function (s) {
        var dates = s.points.map(function (p) { return p.retrieval_date; }).filter(Boolean);
        var latest = dates.sort()[dates.length - 1];
        if (s.source_class === "INDEPENDENT") {
          parts.push("independent measurements: Epoch AI Benchmarking Hub" +
            (latest ? ", retrieved " + latest : ""));
        } else {
          parts.push("lab reported numbers: the releasing labs' own publications" +
            (latest ? ", retrieved " + latest : ""));
        }
      });
      srcEl.textContent = "Sources: " + parts.join("; ") + ".";
    }

    function draw() {
      chartMount.innerHTML = "";
      var width = Math.max(holder.clientWidth, 300);
      var height = 300;
      var margin = { top: 16, right: 14, bottom: 28, left: 40 };

      var allBench = series.filter(function (s) { return s.benchmark === state.benchmark; });
      var allDates = [];
      allBench.forEach(function (s) {
        s.points.forEach(function (p) { allDates.push(parseDate(p.date)); });
      });
      var visNow = visibleSeries();
      if (!allDates.length || !visNow.length) {
        /* an empty selection states itself in the chart area; a silently
           blank chart reads as broken */
        var msg = !allDates.length ?
          "No measurements on record for this benchmark." :
          "No measurements of the selected kinds for this benchmark. Older entries have independent scores only. Lab scores are added as new releases come in.";
        chartMount.innerHTML = '<p class="chart-empty-note">' + esc(msg) + "</p>";
        updateCaption();
        updateAlt();
        updateSource();
        return;
      }
      var monthPad = 40 * 86400000;
      var x = d3.scaleUtc()
        .domain([new Date(d3.min(allDates).getTime() - monthPad),
                 new Date(d3.max(allDates).getTime() + monthPad)])
        .range([margin.left, width - margin.right]);
      var y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

      var svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("class", "traj-svg")
        .attr("role", "group")
        .attr("aria-label", "Benchmark points over time; each point links to its entry card");

      /* score rules: faint horizontal ledger lines */
      var grid = svg.append("g").attr("class", "traj-grid");
      [0, 20, 40, 60, 80, 100].forEach(function (v) {
        grid.append("line")
          .attr("x1", margin.left).attr("x2", width - margin.right)
          .attr("y1", y(v)).attr("y2", y(v));
        grid.append("text")
          .attr("x", margin.left - 6).attr("y", y(v) + 3)
          .attr("text-anchor", "end")
          .text(v);
      });
      /* the unit, stated on the axis itself */
      svg.append("text")
        .attr("class", "traj-unit")
        .attr("x", margin.left).attr("y", y(100) - 5)
        .text("score, on the benchmark's own scale");

      /* time axis: year ticks */
      var axis = svg.append("g").attr("class", "traj-axis");
      d3.utcYear.range(x.domain()[0], x.domain()[1]).forEach(function (t) {
        var px = x(t);
        axis.append("line")
          .attr("x1", px).attr("x2", px)
          .attr("y1", height - margin.bottom).attr("y2", height - margin.bottom + 5);
        axis.append("text")
          .attr("x", px + 4).attr("y", height - margin.bottom + 17)
          .text(t.getUTCFullYear());
      });

      /* era bands: outlined annotation layers, drawn only when a benchmark
         carries more than one era (generic; today each has exactly one,
         and the era label rides in the caption instead) */
      var eraList = eras[state.benchmark] || [];
      if (eraList.length > 1) {
        var bands = svg.append("g").attr("class", "traj-eras");
        eraList.forEach(function (er) {
          var sx = x(parseDate(er.start));
          var ex = er.end ? x(parseDate(er.end)) : (width - margin.right);
          bands.append("line")
            .attr("x1", sx).attr("x2", sx)
            .attr("y1", margin.top).attr("y2", height - margin.bottom);
          if (er.end) {
            bands.append("line")
              .attr("x1", ex).attr("x2", ex)
              .attr("y1", margin.top).attr("y2", height - margin.bottom);
          }
          bands.append("text")
            .attr("x", Math.min(sx + 6, width - margin.right - 40))
            .attr("y", margin.top + 10)
            .text("era " + er.version);
        });
      }

      /* marks only: solid = INDEPENDENT, hollow = LAB_REPORTED (D15).
         Each point is a real link to its entry card, keyboard focusable. */
      var marksG = svg.append("g").attr("class", "traj-points");
      /* the chronologically newest visible measurement wears an outlined
         annotation ring: orientation, never emphasis of value */
      var newest = null;
      visNow.forEach(function (s) {
        s.points.forEach(function (p) {
          if (!newest || p.date > newest.date) { newest = p; }
        });
      });
      if (newest) {
        marksG.append("circle")
          .attr("class", "traj-latest-ring")
          .attr("cx", x(parseDate(newest.date)))
          .attr("cy", y(newest.value))
          .attr("r", 7.5);
      }
      visNow.forEach(function (s) {
        var solid = s.source_class === "INDEPENDENT";
        s.points.forEach(function (p) {
          var a = marksG.append("a")
            .attr("class", "traj-point")
            .attr("href", "#" + p.entry_id)
            .attr("aria-label", p.model_name + ", " + s.benchmark_name +
              " " + p.value + ", " + p.date + ", " +
              (api.orgNames[p.org] || p.org) + ", " +
              (CLASS_NAMES[s.source_class] || s.source_class) + ". Opens the entry card.");
          a.append("circle")
            .attr("class", "focus-ring")
            .attr("cx", x(parseDate(p.date))).attr("cy", y(p.value)).attr("r", 8);
          a.append("circle")
            .attr("class", solid ? "dot dot-solid" : "dot dot-hollow")
            .attr("cx", x(parseDate(p.date))).attr("cy", y(p.value)).attr("r", 4);
          a.on("click", function (event) {
            event.preventDefault();
            tip.hide();
            api.revealEntry(p.entry_id);
          }).on("mouseenter", function (event) {
            var pt = d3.pointer(event, holder);
            tip.show(
              '<span class="tip-name">' + esc(p.model_name) + "</span>" +
              '<span class="tip-val">' + esc(p.value) + " on " + esc(s.benchmark_name) +
              ' <span class="tip-class">' + esc(CLASS_NAMES[s.source_class] || s.source_class) + "</span></span>" +
              '<span class="tip-date">' + esc(p.date) + "</span>" +
              '<span class="tip-org">' + esc(api.orgNames[p.org] || p.org) + "</span>" +
              (p.configuration ? '<span class="tip-config">configuration: ' + esc(p.configuration) + "</span>" : "") +
              (p.retrieval_date ? '<span class="tip-config">retrieved ' + esc(p.retrieval_date) + "</span>" : ""),
              pt[0], pt[1]);
          }).on("mouseleave", tip.hide);
        });
      });

      chartMount.appendChild(svg.node());
      updateCaption();
      updateAlt();
      updateSource();
    }

    /* controls */
    var radios = document.querySelectorAll('input[name="traj-bench"]');
    radios.forEach(function (r) {
      r.addEventListener("change", function () {
        if (r.checked) { state.benchmark = r.value; draw(); }
      });
    });
    var provInd = document.getElementById("prov-independent");
    var provLab = document.getElementById("prov-lab");
    if (provInd) {
      provInd.addEventListener("change", function () {
        state.classes.INDEPENDENT = provInd.checked; draw();
      });
    }
    if (provLab) {
      provLab.addEventListener("change", function () {
        state.classes.LAB_REPORTED = provLab.checked; draw();
      });
    }

    draw();

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 150);
    });
  }

  /* =================== disclosure record (D16) =================== */

  function initMatrix(api, views) {
    var grid = document.getElementById("matrix-grid");
    var tableHolder = document.getElementById("matrix-table-holder");
    if (!grid || !views || !views.disclosure_matrix) { return; }

    var dm = views.disclosure_matrix;
    var artifacts = dm.artifacts || [];
    var status = dm.artifact_status || {};

    /* a column with zero links on record but researched rows awaiting
       approval is the registrar's own pending state; it renders as
       'under review', never as a wall of zeros (DESIGN rule 2) */
    function isPendingCol(a) {
      var st = status[a];
      return !!(st && st.links_on_record === 0 && st.pending_review > 0);
    }

    /* aggregate the per-release rows into organization x artifact counts */
    var agg = {};
    REGISTRY_ORDER.forEach(function (org) {
      agg[org] = {};
      artifacts.forEach(function (a) { agg[org][a] = { disclosed: 0, total: 0, not_researched: 0 }; });
    });
    (dm.rows || []).forEach(function (r) {
      if (!agg[r.org]) { return; }
      artifacts.forEach(function (a) {
        /* Three states per cell. "not_researched" is the registrar's own gap
           and is excluded from every share: the denominator is releases the
           registrar looked at, never all releases. A lab's silence nobody has
           checked for is not a lab's silence. */
        var state = r.cells ? r.cells[a] : "not_researched";
        if (state === "not_researched") { agg[r.org][a].not_researched += 1; return; }
        agg[r.org][a].total += 1;
        if (state === "disclosed") { agg[r.org][a].disclosed += 1; }
      });
    });

    /* the glyph legend, where a legend belongs (not inside data cells) */
    var legendEl = document.getElementById("matrix-legend");
    if (legendEl) {
      legendEl.innerHTML =
        '<span><svg width="9" height="8" viewBox="0 0 9 8" aria-hidden="true"><circle cx="4" cy="4" r="3" class="dm-dot-filled"/></svg> links on record</span>' +
        '<span><svg width="9" height="8" viewBox="0 0 9 8" aria-hidden="true"><circle cx="4" cy="4" r="3" class="dm-dot-hollow"/></svg> none on record</span>' +
        (artifacts.some(isPendingCol) ?
          "<span><em>under review</em>: researched links awaiting review; no counts shown</span>" : "") +
        (artifacts.some(function (a) {
          var st = status[a];
          return !!(st && st.links_on_record > 0 && st.pending_review > 0);
        }) ? "<span><em>more under review</em>: counts shown are links on record; further researched links await approval</span>" : "");
    }

    /* a mixed column (some links on record, more researched rows in the
       queue) states its own incompleteness so a true 0-count cell cannot
       be misread as the lab's final record */
    function isMixedCol(a) {
      var st = status[a];
      return !!(st && st.links_on_record > 0 && st.pending_review > 0);
    }

    var html = '<div class="dm-corner" aria-hidden="true"></div>';
    artifacts.forEach(function (a) {
      var head = "";
      if (isPendingCol(a)) { head = "under review"; }
      else if (isMixedCol(a)) { head = "more under review"; }
      html += '<div class="dm-colhead" aria-hidden="true">' + esc(ARTIFACT_NAMES[a] || a) +
        (head ? '<span class="dm-head-status">' + head + "</span>" : "") + "</div>";
    });
    REGISTRY_ORDER.forEach(function (org) {
      html += '<div class="dm-rowhead" aria-hidden="true">' + esc(api.orgNames[org] || org) + "</div>";
      artifacts.forEach(function (a) {
        var c = agg[org][a];
        if (isPendingCol(a)) {
          var pLabel = "Under review: " + (api.orgNames[org] || org) + ", " +
            (ARTIFACT_NAMES[a] || a) +
            " links are researched and awaiting review; no count is on record. " +
            "Filters the timeline to this organization's releases.";
          html += '<button type="button" class="dm-cell is-pending" data-org="' + esc(org) +
            '" data-artifact="' + esc(a) + '" aria-label="' + esc(pLabel) + '">' +
            '<span class="dm-pending-word">under review</span></button>';
          return;
        }
        // The visible text (e.g. "9/37") must appear inside the accessible
        // name (WCAG 2.5.3 label-in-name). The single glyph encodes the
        // cell's state: filled = links on record, hollow = none.
        var label = c.disclosed + "/" + c.total + ": " +
          (api.orgNames[org] || org) + ", " + (ARTIFACT_NAMES[a] || a) + ", " +
          c.disclosed + " of " + c.total +
          " researched releases with a link on record" +
          (c.not_researched ? ", " + c.not_researched + " not yet researched" : "") +
          ". Filters the timeline to this organization's releases.";
        var glyph = c.disclosed > 0
          ? '<circle cx="4" cy="4" r="3" class="dm-dot-filled"/>'
          : '<circle cx="4" cy="4" r="3" class="dm-dot-hollow"/>';
        html += '<button type="button" class="dm-cell" data-org="' + esc(org) +
          '" data-artifact="' + esc(a) + '" aria-label="' + esc(label) + '">' +
          '<svg class="dm-dots" width="9" height="8" viewBox="0 0 9 8" aria-hidden="true">' +
          glyph + "</svg>" +
          '<span class="dm-count">' + c.disclosed + "/" + c.total + "</span></button>";
      });
    });
    grid.innerHTML = html;
    grid.style.setProperty("--dm-cols", String(artifacts.length));

    /* the disclosure record's time dimension: paper links by year (the
       only artifact fully on record today), raw counts, no smoothing */
    var yearsEl = document.getElementById("matrix-years");
    if (yearsEl) {
      var byYear = {};
      (dm.rows || []).forEach(function (r) {
        var yKey = r.date.slice(0, 4);
        var b = byYear[yKey] = byYear[yKey] || { with_paper: 0, total: 0 };
        var ps = r.cells ? r.cells.paper : "not_researched";
        if (ps === "not_researched") { return; }
        b.total += 1;
        if (ps === "disclosed") { b.with_paper += 1; }
      });
      var segs = Object.keys(byYear).sort().map(function (yKey) {
        return yKey + " " + byYear[yKey].with_paper + " of " + byYear[yKey].total + " researched";
      });
      yearsEl.textContent = segs.length ?
        "Releases with a paper link, by year: " + segs.join(", ") + "." : "";
    }

    grid.addEventListener("click", function (event) {
      var cell = event.target.closest ? event.target.closest(".dm-cell") : null;
      if (!cell) { return; }
      var org = cell.getAttribute("data-org");
      var artifact = cell.getAttribute("data-artifact");
      var c = agg[org][artifact];
      api.filterOrgReleases(org,
        "Timeline filtered to " + (api.orgNames[org] || org) + " releases from the disclosure record. " +
        "Selected artifact: " + (ARTIFACT_NAMES[artifact] || artifact) + ", " +
        (isPendingCol(artifact) ?
          "links awaiting review, not yet on record." :
          c.disclosed + " of " + c.total + " researched releases with a link on record."));
    });

    /* text alternative: a real table with the same counts. The clipping
       class sits on the wrapper div; table boxes do not honor overflow. */
    if (tableHolder) {
      tableHolder.className = "visually-hidden";
      var pendingNote = artifacts.some(function (a) {
        var st = status[a];
        return !!(st && st.pending_review > 0);
      }) ? " Some researched links await review and are not yet counted." : "";
      var t = '<table><caption>Disclosure links on record by organization and artifact, releases only. Each value is the count of releases with a link on record, out of the releases we have checked for that item.' +
        esc(pendingNote) + '</caption><thead><tr><th scope="col">Organization</th>';
      artifacts.forEach(function (a) {
        t += '<th scope="col">' + esc(ARTIFACT_NAMES[a] || a) + "</th>";
      });
      t += "</tr></thead><tbody>";
      REGISTRY_ORDER.forEach(function (org) {
        t += '<tr><th scope="row">' + esc(api.orgNames[org] || org) + "</th>";
        artifacts.forEach(function (a) {
          var c = agg[org][a];
          t += "<td>" + (isPendingCol(a) ? "under review" :
            c.disclosed + " of " + c.total) + "</td>";
        });
        t += "</tr>";
      });
      t += "</tbody></table>";
      tableHolder.innerHTML = t;
    }
  }

  /* =================== boot =================== */

  window.VCExplorer = {
    init: function (api) {
      api.loadGzJson("derived/views.json.gz").then(function (views) {
        initTiles(views);
        if (!window.d3) {
          chartsUnavailable("The explorer charts could not be loaded in this session; the timeline below is unaffected.");
          initMatrix(api, views);
          return;
        }
        parseDate = function (s) { return new Date(s + "T00:00:00Z"); };
        initPulse(api, api.entries.slice().reverse(), api.meta, views);
        initTrajectory(api, views);
        initMatrix(api, views);
        if (api.layoutSettled) { api.layoutSettled(); }
      }).catch(function () {
        chartsUnavailable("The derived views file could not be loaded in this session; the timeline below is unaffected.");
        var row = document.getElementById("tile-row");
        if (row) {
          row.innerHTML = '<p class="tiles-loading">Registry measures could not be loaded in this session.</p>';
        }
      });
    }
  };
})();
