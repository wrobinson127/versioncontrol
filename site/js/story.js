/* Version Control : the story (amendment 1, D13/D14, phase P5b)
   Seven beats over the derived views file. The stage is one SVG that
   morphs between beat states; every state is an idempotent function of
   scroll position (applyState pattern, craft notes). The narrative never
   computes from raw entries; it reads data/derived/views.json.gz and
   site_meta.json only. GSAP ScrollTrigger scrubs; it never hijacks
   scroll. Reduced motion gets a complete static rendering: every beat's
   final-state graphic stacked with its full prose. */

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

  /* Short labels for the half-height mobile stage (craft notes: the small
     canvas is redesigned, not shrunk). Label-first identity holds; these
     are abbreviations, not colors. */
  var ORG_SHORT = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "google-deepmind": "Google DM",
    "meta": "Meta",
    "xai": "xAI",
    "mistral": "Mistral",
    "deepseek": "DeepSeek",
    "alibaba-qwen": "Qwen",
    "moonshot": "Moonshot",
    "zai": "Z.ai",
    "cohere": "Cohere",
    "amazon": "Amazon"
  };

  /* Fixed registry order (pipeline/config.py). Never score order. */
  var REGISTRY_ORDER = [
    "openai", "anthropic", "google-deepmind", "meta", "xai", "mistral",
    "deepseek", "alibaba-qwen", "moonshot", "zai", "cohere", "amazon"
  ];

  var ARTIFACTS = ["system_card", "model_card", "usage_policy", "paper"];
  var ARTIFACT_NAMES = {
    "system_card": "system card",
    "model_card": "model card",
    "usage_policy": "usage policy",
    "paper": "paper"
  };

  /* Beat windows in step units. 18 steps: 3+3+3+3+2+2+2. */
  var BEAT_START = [0, 3, 6, 9, 12, 14, 16];
  var NSTEPS = 18;
  /* Step-unit positions at which each beat's state is final (used for the
     reduced-motion static figures and for the fallback rendering). */
  var BEAT_FINAL_P = [2.9, 5.95, 8.95, 11.9, 13.9, 15.9, 17.7];

  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------------- data loading (same pattern as app.js) ---------------- */

  var DATA_BASES = ["./data/", "../data/"];
  var dataBase = null;

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

  /* ---------------- small helpers ---------------- */

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /* ease for in-place motion inside a scrubbed state; still idempotent */
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }

  function parseMs(s) { return Date.parse(s + "T00:00:00Z"); }
  function fmtDay(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function fmtGap(days) {
    return (days === Math.floor(days)) ? String(days) : days.toFixed(1);
  }

  function svgEl(name, attrs, text) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function wrapWords(text, maxChars, maxLines) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + " " + words[i] : words[i];
      if (next.length > maxChars && line) {
        lines.push(line);
        line = words[i];
        if (maxLines && lines.length >= maxLines) { return lines; }
      } else {
        line = next;
      }
    }
    if (line) { lines.push(line); }
    return maxLines ? lines.slice(0, maxLines) : lines;
  }

  /* window visibility: 1 inside [inStart..outEnd], with linear ramps.
     Pure function of p, so every state is reproducible at any scroll
     position. */
  function vis(p, inStart, inLen, outStart, outLen) {
    var a = inLen > 0 ? clamp01((p - inStart) / inLen) : (p >= inStart ? 1 : 0);
    var b = outLen > 0 ? clamp01(1 - (p - outStart) / outLen) : (p < outStart ? 1 : 0);
    return Math.min(a, b);
  }

  /* ---------------- derived data preparation ---------------- */

  function prepare(views, meta) {
    var d = {};
    d.meta = meta;
    d.tiles = views.tiles;

    /* pulse: releases only, from the disclosure matrix rows (the derived
       file carries date, org, model_name per release) */
    d.releases = (views.disclosure_matrix.rows || []).slice().map(function (r) {
      return { date: r.date, ms: parseMs(r.date), org: r.org, name: r.model_name, id: r.entry_id };
    }).sort(function (a, b) { return a.ms - b.ms; });

    d.medianGap = (views.cadence.median_gap || []).map(function (m) {
      return { ms: parseMs(m.date), date: m.date, days: m.days };
    }).sort(function (a, b) { return a.ms - b.ms; });

    /* median gap in the record's first full year: first value at or after
       2023-12-31 (slot ruling in content/narrative_beats.md) */
    d.gapFirstYear = null;
    for (var i = 0; i < d.medianGap.length; i++) {
      if (d.medianGap[i].date >= "2023-12-31") { d.gapFirstYear = d.medianGap[i].days; break; }
    }

    /* trajectory: the pinned GPQA Diamond independent series */
    var series = views.trajectory.series || [];
    d.traj = null;
    for (var s = 0; s < series.length; s++) {
      if (series[s].benchmark === "gpqa-diamond" && series[s].source_class === "INDEPENDENT") {
        d.traj = {
          name: series[s].benchmark_name,
          version: series[s].benchmark_version,
          points: series[s].points.slice().sort(function (a, b) {
            return a.date < b.date ? -1 : 1;
          })
        };
        break;
      }
    }

    /* Beat 4: prefer real era data whenever a benchmark carries more than
       one era; until then the beat animates the rule on SPECIMEN marks
       (the poster's labeled-specimen device). */
    d.treadmill = null;
    var eras = views.trajectory.eras || {};
    for (var bench in eras) {
      if (Object.prototype.hasOwnProperty.call(eras, bench) && eras[bench].length > 1) {
        var eraList = eras[bench].slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
        var bySeries = series.filter(function (sr) {
          return sr.benchmark === bench && sr.source_class === "INDEPENDENT";
        });
        if (bySeries.length) {
          var pts = bySeries[0].points.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          var firstMs = parseMs(pts[0].date);
          var lastMs = parseMs(pts[pts.length - 1].date);
          var span = Math.max(1, lastMs - firstMs);
          var eraOne = [], eraTwo = [];
          var boundary = parseMs(eraList[0].end || eraList[1].start);
          pts.forEach(function (pt) {
            var fx = 0.06 + 0.89 * (parseMs(pt.date) - firstMs) / span;
            (parseMs(pt.date) < boundary ? eraOne : eraTwo).push([fx, pt.value]);
          });
          d.treadmill = {
            specimen: false,
            leftLabel: bySeries[0].benchmark_name + ", era " + eraList[0].version,
            rightLabel: bySeries[0].benchmark_name + ", era " + eraList[1].version,
            boundaryLabel: "era closes",
            eraOne: eraOne,
            eraTwo: eraTwo,
            bx1: 0.06 + 0.89 * clamp01((boundary - firstMs) / span) - 0.012,
            bx2: 0.06 + 0.89 * clamp01((boundary - firstMs) / span) + 0.012
          };
        }
      }
    }
    if (!d.treadmill) {
      d.treadmill = {
        specimen: true,
        leftLabel: "Specimen Benchmark",
        rightLabel: "Specimen Benchmark 2",
        boundaryLabel: "era closes",
        eraOne: [[0.06, 31], [0.095, 38], [0.13, 46], [0.165, 52], [0.20, 58],
                 [0.24, 64], [0.28, 69], [0.315, 74], [0.35, 78], [0.385, 82],
                 [0.415, 85], [0.445, 88], [0.47, 90], [0.495, 91.5], [0.52, 92.5], [0.545, 93]],
        eraTwo: [[0.63, 24], [0.69, 33], [0.75, 40], [0.81, 46], [0.87, 51], [0.93, 55]],
        bx1: 0.575,
        bx2: 0.605
      };
    }

    /* Beat 5: use a real LAB/IND pair for the same entry and benchmark
       whenever the views file contains one; SPECIMEN until then. */
    d.pair = null;
    var byBench = {};
    series.forEach(function (sr) {
      byBench[sr.benchmark] = byBench[sr.benchmark] || {};
      byBench[sr.benchmark][sr.source_class] = sr;
    });
    for (var b in byBench) {
      if (!Object.prototype.hasOwnProperty.call(byBench, b)) { continue; }
      var lab = byBench[b].LAB_REPORTED;
      var ind = byBench[b].INDEPENDENT;
      if (!lab || !ind) { continue; }
      var indById = {};
      ind.points.forEach(function (pt) { indById[pt.entry_id] = pt; });
      var best = null;
      lab.points.forEach(function (pt) {
        if (indById[pt.entry_id] && (!best || pt.date > best.lab.date)) {
          best = { lab: pt, ind: indById[pt.entry_id] };
        }
      });
      if (best) {
        d.pair = {
          specimen: false,
          model: best.lab.model_name,
          bench: lab.benchmark_name,
          labValue: best.lab.value,
          indValue: best.ind.value
        };
        break;
      }
    }
    if (!d.pair) {
      d.pair = {
        specimen: true,
        model: "Specimen Model 3",
        bench: "GPQA Diamond",
        labValue: 64.0,
        indValue: 61.4
      };
    }

    /* disclosure matrix: organization x artifact counts, releases only */
    var agg = {};
    REGISTRY_ORDER.forEach(function (org) {
      agg[org] = {};
      ARTIFACTS.forEach(function (a) { agg[org][a] = { disclosed: 0, total: 0 }; });
    });
    (views.disclosure_matrix.rows || []).forEach(function (r) {
      if (!agg[r.org]) { return; }
      ARTIFACTS.forEach(function (a) {
        agg[r.org][a].total += 1;
        if (r.cells && r.cells[a]) { agg[r.org][a].disclosed += 1; }
      });
    });
    d.matrix = agg;
    d.matrixCounts = views.disclosure_matrix.counts || {};

    /* first entry ghost card (Beat 1): the first release row */
    d.first = d.releases[0];
    return d;
  }

  /* ---------------- per-beat text alternatives (aria) ---------------- */

  function beatSummaries(d) {
    var t = d.tiles;
    var paper = d.matrixCounts.paper || { disclosed: 0, not_disclosed: 0 };
    var paperTotal = paper.disclosed + paper.not_disclosed;
    var lastTraj = d.traj ? d.traj.points[d.traj.points.length - 1] : null;
    var firstTraj = d.traj ? d.traj.points[0] : null;
    return [
      "A timeline on paper ground. The axis origin sits at 2022-11-30, the day OpenAI released ChatGPT. The record's first entry, " +
        d.first.name + " from " + (ORG_NAMES[d.first.org] || d.first.org) + " on " + d.first.date +
        ", is marked on the axis with its entry card ghosted beside it.",
      "The pulse strip now holds " + t.releases_recorded + " release marks across 12 organization rows, " +
        d.releases[0].date + " to " + d.releases[d.releases.length - 1].date +
        ". The median gap counter, computed from these release dates, reads " + fmtGap(t.median_gap_days_this_year) + " days.",
      d.traj ?
        "The trajectory chart shows " + d.traj.points.length + " independent " + d.traj.name +
        " measurements as solid marks, " + firstTraj.date + " to " + lastTraj.date +
        ", from " + firstTraj.value + " to " + lastTraj.value + " on the benchmark's own 0 to 100 scale." :
        "The trajectory chart has no independent series to draw in this session.",
      d.treadmill.specimen ?
        "A specimen chart, watermarked SPECIMEN: marks crowd the top of the scale, a labeled boundary closes the era, and a successor axis begins with its own marks. No mark connects across the boundary." :
        "The trajectory chart shows a closed era with a labeled boundary and its successor era. No mark connects across the boundary.",
      (d.pair.specimen ? "A specimen composition, watermarked SPECIMEN: one" : "One") +
        " model, one benchmark, two numbers. " + d.pair.model + " on " + d.pair.bench +
        ": a hollow lab reported mark at " + d.pair.labValue +
        " and a solid independent mark at " + d.pair.indValue + ", each with its provenance tag.",
      "The disclosure matrix: 12 organizations by four artifact types, releases only. Cells with links on record fill with their counts; cells with none stay hollow. Papers on record: " +
        paper.disclosed + " of " + paperTotal + " releases.",
      "The pulse strip and the registry measures, recomposed as the explorer's landing view: " +
        t.releases_recorded + " releases recorded, " + t.days_since_last_release +
        " days since the last release, a median gap of " + fmtGap(t.median_gap_days_this_year) + " days this year."
    ];
  }

  /* =========================================================
     The stage: one SVG, seven states, one idempotent render(p)
     ========================================================= */

  function createStage(svg, d, compact, beatsFilter) {

    /* which beats this stage instance needs to build (the reduced-motion
       figures build one beat each; the animated stage builds all seven) */
    function needs() {
      if (!beatsFilter) { return true; }
      for (var i = 0; i < arguments.length; i++) {
        if (beatsFilter.indexOf(arguments[i]) !== -1) { return true; }
      }
      return false;
    }

    var W = 720, H = 480, XL = 132, XR = 700, AXIS_Y = 420;
    var T_MIN = Date.UTC(2022, 10, 20), T_MAX = Date.UTC(2026, 6, 20);
    function x(ms) { return XL + (ms - T_MIN) / (T_MAX - T_MIN) * (XR - XL); }
    function yScore(v) { return AXIS_Y - v * 3.4; }

    /* font sizes: the compact stage is redesigned for the half-height
       mobile box (larger type, fewer gridlines, short labels) */
    var F = compact ? {
      year: 19, org: 16, counterVal: 46, counterLab: 16, counterDate: 15,
      gDate: 17, gOrg: 17, gKind: 16, gName: 25, gBody: 16, gFact: 16,
      oDate: 17, oSub: 16, title: 21, legend: 17, grid: 17, lblVal: 19,
      lblName: 16, tag: 13, region: 17, stamp: 15, bnd: 16,
      pName: 26, pBench: 18, pVal: 24, pClass: 17,
      mHead: 15, mOrg: 15, mCount: 16,
      tVal: 27, tLab: 14, miniOrg: 13, miniYear: 14, timeLab: 16
    } : {
      year: 12, org: 10.5, counterVal: 30, counterLab: 10.5, counterDate: 10.5,
      gDate: 12, gOrg: 12, gKind: 11, gName: 20, gBody: 11.5, gFact: 11,
      oDate: 11, oSub: 11, title: 15, legend: 11, grid: 10.5, lblVal: 12,
      lblName: 10.5, tag: 8.5, region: 12, stamp: 12, bnd: 10.5,
      pName: 20, pBench: 12, pVal: 16, pClass: 11,
      mHead: 11, mOrg: 11, mCount: 11,
      tVal: 24, tLab: 10, miniOrg: 9.5, miniYear: 10, timeLab: 11
    };
    var POINT_R = compact ? 6 : 4.5;
    var PAIR_R = compact ? 10 : 7;
    var GRID_VALS = compact ? [0, 50, 100] : [0, 20, 40, 60, 80, 100];
    var orgLabel = function (org) {
      return compact ? (ORG_SHORT[org] || org) : (ORG_NAMES[org] || org);
    };

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }

    function group(cls) {
      var g = svgEl("g", { "class": cls });
      svg.appendChild(g);
      return g;
    }

    /* opacity setter with caching; hides at 0 so hit tests and paint skip */
    function makeVisSetter(node) {
      var last = null;
      return function (v) {
        v = Math.round(v * 100) / 100;
        if (v === last) { return; }
        last = v;
        node.setAttribute("opacity", v);
        if (v === 0) { node.setAttribute("visibility", "hidden"); }
        else { node.removeAttribute("visibility"); }
      };
    }

    /* reveal helper: shows the first n of a list of nodes, touching only
       the delta since the last call (cheap under fast scrub) */
    function makeRevealer(nodes) {
      var shown = -1;
      return function (n) {
        n = clamp(Math.floor(n), 0, nodes.length);
        if (n === shown) { return; }
        if (shown < 0) { shown = 0; }
        var i;
        if (n > shown) {
          for (i = shown; i < n; i++) { nodes[i].removeAttribute("visibility"); }
        } else {
          for (i = n; i < shown; i++) { nodes[i].setAttribute("visibility", "hidden"); }
        }
        shown = n;
      };
    }

    function hideAll(nodes) {
      nodes.forEach(function (nd) { nd.setAttribute("visibility", "hidden"); });
    }

    /* -------- shared frame: time axis (beats 1 to 5) -------- */

    var years = [2023, 2024, 2025, 2026];
    var gAxis = null, setAxis = null, gYears = null, setYears = null;
    var gTimeLab = null, setTimeLab = null, gOrigin = null, setOrigin = null;

    if (needs(0, 1, 2, 3, 4)) {
      gAxis = group("st-axis");
      gAxis.appendChild(svgEl("line", { x1: XL, y1: AXIS_Y, x2: XR, y2: AXIS_Y, "class": "st-axis-line" }));
      setAxis = makeVisSetter(gAxis);

      gYears = group("st-years");
      years.forEach(function (yr) {
        var px = x(Date.UTC(yr, 0, 1));
        gYears.appendChild(svgEl("line", { x1: px, y1: AXIS_Y, x2: px, y2: AXIS_Y + 6, "class": "st-tick" }));
        gYears.appendChild(svgEl("text", { x: px + 4, y: AXIS_Y + 7 + F.year, "class": "st-year", "font-size": F.year }, String(yr)));
      });
      setYears = makeVisSetter(gYears);

      /* generic axis label while specimen content rides the frame: the
         specimen marks carry no real dates, so the year labels retire */
      gTimeLab = group("st-timelab");
      gTimeLab.appendChild(svgEl("text", {
        x: XR, y: AXIS_Y + 7 + F.timeLab, "text-anchor": "end",
        "class": "st-year", "font-size": F.timeLab
      }, "time"));
      setTimeLab = makeVisSetter(gTimeLab);

      /* the record's origin: 2022-11-30 tick and label, on its own row
         below the year labels */
      gOrigin = group("st-origin");
      var ox = x(parseMs("2022-11-30"));
      gOrigin.appendChild(svgEl("line", { x1: ox, y1: AXIS_Y - 8, x2: ox, y2: AXIS_Y + 8, "class": "st-origin-tick" }));
      var originY = AXIS_Y + 10 + F.year + 4 + F.oDate;
      if (compact) {
        gOrigin.appendChild(svgEl("text", { x: XL, y: originY, "class": "st-mono-label", "font-size": F.oDate }, "2022-11-30, ChatGPT released"));
      } else {
        gOrigin.appendChild(svgEl("text", { x: XL, y: originY, "class": "st-mono-label", "font-size": F.oDate }, "2022-11-30"));
        gOrigin.appendChild(svgEl("text", { x: XL, y: originY + F.oSub * 1.35, "class": "st-sub-label", "font-size": F.oSub }, "ChatGPT released. The record begins."));
      }
      setOrigin = makeVisSetter(gOrigin);
    }

    /* -------- beat 1: first mark and the ghosted entry card -------- */

    var gGhost = null, setGhost = null, firstMark = null, setFirstMark = null;
    var fx = x(d.first.ms);
    var metaRow = REGISTRY_ORDER.indexOf(d.first.org);
    var rowBase = function (i) { return 106 + i * 26; };

    if (needs(0, 1)) {
      firstMark = svgEl("rect", { x: fx - 1.75, width: 3.5, y: AXIS_Y - 16, height: 16, "class": "st-mark" });
      var gFirst = group("st-first");
      gFirst.appendChild(firstMark);
      setFirstMark = makeVisSetter(gFirst);
    }

    if (needs(0)) {
      gGhost = group("st-ghost");
      gGhost.appendChild(svgEl("line", { x1: fx, y1: AXIS_Y - 18, x2: fx, y2: 302, "class": "st-leader" }));
      var cardX = 176, cardY = 118, cardW = compact ? 400 : 330, cardH = 184;
      gGhost.appendChild(svgEl("rect", { x: cardX, y: cardY, width: cardW, height: cardH, rx: 6, "class": "st-card" }));
      var pad = 20;
      var headY = cardY + pad + F.gDate;
      gGhost.appendChild(svgEl("text", { x: cardX + pad, y: headY, "class": "st-mono-label", "font-size": F.gDate }, d.first.date));
      gGhost.appendChild(svgEl("text", { x: cardX + pad + F.gDate * 8.2, y: headY, "class": "st-org-strong", "font-size": F.gOrg }, ORG_NAMES[d.first.org] || d.first.org));
      gGhost.appendChild(svgEl("text", { x: cardX + pad + F.gDate * 8.2 + F.gOrg * 4.2, y: headY, "class": "st-sub-label", "font-size": F.gKind }, "release"));
      var nameY = headY + 10 + F.gName;
      gGhost.appendChild(svgEl("text", { x: cardX + pad, y: nameY, "class": "st-slab", "font-size": F.gName }, d.first.name));
      /* Derived from the row itself so the card can never drift from the
         record if the first release ever changes (P5b review flag). */
      var summary = "The record's first entry: " + d.first.name + ", " +
        (ORG_NAMES[d.first.org] || d.first.org) + ", " + d.first.date +
        ". The entry is backfilled from Epoch AI's models dataset.";
      var lines = wrapWords(compact ? summary.split(". ")[0] + "." : summary, compact ? 42 : 52, 3);
      var ly = nameY + 8 + F.gBody;
      lines.forEach(function (ln) {
        gGhost.appendChild(svgEl("text", { x: cardX + pad, y: ly, "class": "st-body", "font-size": F.gBody }, ln));
        ly += F.gBody * 1.45;
      });
      /* Facts the derived views do not carry (availability, parameters)
         render only while the first release is the entry they were
         verified against; a changed record hides them rather than lying. */
      if (d.first.id === "meta--opt-iml-175b") {
        var factY = cardY + cardH - 16;
        gGhost.appendChild(svgEl("text", { x: cardX + pad, y: factY, "class": "st-sub-label", "font-size": F.gFact }, "availability:"));
        gGhost.appendChild(svgEl("text", { x: cardX + pad + F.gFact * 6.6, y: factY, "class": "st-mono-label", "font-size": F.gFact }, "open weights"));
        if (!compact) {
          gGhost.appendChild(svgEl("text", { x: cardX + pad + F.gFact * 14.5, y: factY, "class": "st-sub-label", "font-size": F.gFact }, "parameters:"));
          gGhost.appendChild(svgEl("text", { x: cardX + pad + F.gFact * 20.6, y: factY, "class": "st-mono-label", "font-size": F.gFact }, "175B"));
        }
      }
      setGhost = makeVisSetter(gGhost);
    }

    /* -------- beat 2: the pulse builds -------- */

    var gPulse = null, setPulse = null, pulseReveal = null, pulseMarks = [];
    var gPlayhead = null, setPlayhead = null, playheadLine = null;
    var gCounter = null, setCounter = null, counterVal = null, counterDate = null;

    if (needs(1)) {
      gPulse = group("st-pulse");
      REGISTRY_ORDER.forEach(function (org, i) {
        var yb = rowBase(i);
        gPulse.appendChild(svgEl("line", { x1: XL, y1: yb, x2: XR, y2: yb, "class": "st-rule" }));
        gPulse.appendChild(svgEl("text", { x: XL - 6, y: yb - 3, "text-anchor": "end", "class": "st-org", "font-size": F.org }, orgLabel(org)));
      });
      var rowIndex = {};
      REGISTRY_ORDER.forEach(function (org, i) { rowIndex[org] = i; });
      d.releases.forEach(function (r) {
        var ri = rowIndex[r.org];
        if (ri === undefined) { return; }
        var m = svgEl("rect", {
          x: x(r.ms) - 1.25, width: 2.5, y: rowBase(ri) - 13, height: 13, "class": "st-mark"
        });
        gPulse.appendChild(m);
        pulseMarks.push(m);
      });
      hideAll(pulseMarks);
      pulseReveal = makeRevealer(pulseMarks);
      setPulse = makeVisSetter(gPulse);

      gPlayhead = group("st-playhead");
      playheadLine = svgEl("line", { x1: XL, y1: 84, x2: XL, y2: AXIS_Y + 4, "class": "st-playhead" });
      gPlayhead.appendChild(playheadLine);
      setPlayhead = makeVisSetter(gPlayhead);

      gCounter = group("st-counter");
      var cValY = 22 + F.counterVal * 0.72;
      counterVal = svgEl("text", { x: XR, y: cValY, "text-anchor": "end", "class": "st-counter-val", "font-size": F.counterVal }, "");
      gCounter.appendChild(counterVal);
      gCounter.appendChild(svgEl("text", { x: XR, y: cValY + F.counterLab * 1.5, "text-anchor": "end", "class": "st-sub-label", "font-size": F.counterLab }, "median gap between releases, days"));
      if (!compact) {
        counterDate = svgEl("text", { x: XR, y: cValY + F.counterLab * 1.5 + F.counterDate * 1.4, "text-anchor": "end", "class": "st-mono-faint", "font-size": F.counterDate }, "");
        gCounter.appendChild(counterDate);
      }
      setCounter = makeVisSetter(gCounter);
    }

    /* -------- beats 3 to 4: score frame -------- */

    var gGrid = null, setGrid = null;
    if (needs(2, 3)) {
      gGrid = group("st-grid");
      GRID_VALS.forEach(function (v) {
        if (v !== 0) {
          gGrid.appendChild(svgEl("line", { x1: XL, y1: yScore(v), x2: XR, y2: yScore(v), "class": "st-rule" }));
        }
        gGrid.appendChild(svgEl("text", { x: XL - 8, y: yScore(v) + F.grid * 0.35, "text-anchor": "end", "class": "st-grid-num", "font-size": F.grid }, String(v)));
      });
      setGrid = makeVisSetter(gGrid);
    }

    /* -------- beat 3: the climb -------- */

    var gTitle3 = null, setTitle3 = null;
    var gPoints = null, setPoints = null, pointReveal = null, trajNodes = [];
    var gArrive = null, setArrive = null, arriveVal = null, arriveTagBox = null,
        arriveTagText = null, arriveName = null, lastArriveIdx = -1;

    if (needs(2) && d.traj) {
      gTitle3 = group("st-title3");
      gTitle3.appendChild(svgEl("text", { x: XL, y: 40, "class": "st-title", "font-size": F.title }, d.traj.name + ", independent measurements"));
      setTitle3 = makeVisSetter(gTitle3);

      gPoints = group("st-points");
      d.traj.points.forEach(function (pt) {
        var c = svgEl("circle", { cx: x(parseMs(pt.date)), cy: yScore(pt.value), r: POINT_R, "class": "st-dot-solid" });
        gPoints.appendChild(c);
        trajNodes.push(c);
      });
      hideAll(trajNodes);
      pointReveal = makeRevealer(trajNodes);
      setPoints = makeVisSetter(gPoints);

      /* the newest point's value, provenance tag and model name, read out
         at a fixed slot beside the legend; rendered, never hover-only */
      gArrive = group("st-arrive");
      var aX = XL + 16 + F.legend * 13;
      var aY = 62;
      var tagW = F.tag * 3.4, tagH = F.tag + 6.5;
      arriveVal = svgEl("text", { x: aX, y: aY, "class": "st-mono-strong", "font-size": F.lblVal }, "");
      arriveTagBox = svgEl("rect", { x: aX + F.lblVal * 3.0, y: aY - F.lblVal * 0.35 - tagH / 2, width: tagW, height: tagH, rx: 2, "class": "st-tag-box" });
      arriveTagText = svgEl("text", { x: aX + F.lblVal * 3.0 + tagW / 2, y: aY - F.lblVal * 0.35 + F.tag * 0.36, "class": "st-tag", "font-size": F.tag, "text-anchor": "middle" }, "IND");
      arriveName = svgEl("text", { x: aX + F.lblVal * 3.0 + tagW + 8, y: aY, "class": "st-sub-label", "font-size": F.lblName }, "");
      gArrive.appendChild(arriveVal);
      gArrive.appendChild(arriveTagBox);
      gArrive.appendChild(arriveTagText);
      gArrive.appendChild(arriveName);
      setArrive = makeVisSetter(gArrive);
    }

    /* -------- legend (beats 3 to 5): assembles as mark types land -------- */

    var gKeySolid = null, setKeySolid = null, gKeyHollow = null, setKeyHollow = null;
    if (needs(2, 3, 4)) {
      var keyY = 62;
      gKeySolid = group("st-key");
      gKeySolid.appendChild(svgEl("circle", { cx: XL + 6, cy: keyY - F.legend * 0.32, r: POINT_R, "class": "st-dot-solid" }));
      gKeySolid.appendChild(svgEl("text", { x: XL + 16, y: keyY, "class": "st-body", "font-size": F.legend }, "independent (solid)"));
      setKeySolid = makeVisSetter(gKeySolid);

      gKeyHollow = group("st-key");
      var hx = XL + 16 + F.legend * 13;
      gKeyHollow.appendChild(svgEl("circle", { cx: hx, cy: keyY - F.legend * 0.32, r: POINT_R, "class": "st-dot-hollow" }));
      gKeyHollow.appendChild(svgEl("text", { x: hx + 10, y: keyY, "class": "st-body", "font-size": F.legend }, "lab reported (hollow)"));
      setKeyHollow = makeVisSetter(gKeyHollow);
    }

    /* -------- beat 4: the treadmill -------- */

    var gTread = null, setTread = null, treadOneReveal = null, treadTwoReveal = null;
    var gBoundary = null, setBoundary = null, gSuccessor = null, setSuccessor = null;
    var gStamp4 = null, setStamp4 = null;

    function fxToX(f) { return XL + f * (XR - XL); }

    function specimenStamp(cx, topY) {
      var g = svgEl("g", { "class": "st-stamp" });
      var w = F.stamp * 9.4, h = F.stamp * 2.4;
      g.appendChild(svgEl("rect", { x: cx - w / 2, y: topY, width: w, height: h, rx: 2, "class": "st-stamp-box" }));
      g.appendChild(svgEl("text", { x: cx, y: topY + h / 2 + F.stamp * 0.36, "text-anchor": "middle", "class": "st-stamp-text", "font-size": F.stamp }, "SPECIMEN"));
      return g;
    }

    if (needs(3)) {
      var tm = d.treadmill;
      var regionY = 97;
      gTread = group("st-tread");
      gTread.appendChild(svgEl("text", { x: XL + 4, y: regionY, "class": "st-region", "font-size": F.region }, tm.leftLabel));
      var oneNodes = [];
      tm.eraOne.forEach(function (pv) {
        var c = svgEl("circle", { cx: fxToX(pv[0]), cy: yScore(pv[1]), r: POINT_R, "class": "st-dot-solid" });
        gTread.appendChild(c);
        oneNodes.push(c);
      });
      hideAll(oneNodes);
      treadOneReveal = makeRevealer(oneNodes);
      setTread = makeVisSetter(gTread);

      gBoundary = group("st-boundary");
      gBoundary.appendChild(svgEl("line", { x1: fxToX(tm.bx1), y1: 80, x2: fxToX(tm.bx1), y2: AXIS_Y, "class": "st-era-line" }));
      gBoundary.appendChild(svgEl("line", { x1: fxToX(tm.bx2), y1: 80, x2: fxToX(tm.bx2), y2: AXIS_Y, "class": "st-era-line" }));
      gBoundary.appendChild(svgEl("text", { x: fxToX(tm.bx1) - 6, y: regionY, "text-anchor": "end", "class": "st-mono-faint", "font-size": F.bnd }, tm.boundaryLabel));
      setBoundary = makeVisSetter(gBoundary);

      gSuccessor = group("st-successor");
      gSuccessor.appendChild(svgEl("text", { x: XR - 4, y: regionY, "text-anchor": "end", "class": "st-region", "font-size": F.region }, tm.rightLabel));
      var twoNodes = [];
      tm.eraTwo.forEach(function (pv) {
        var c = svgEl("circle", { cx: fxToX(pv[0]), cy: yScore(pv[1]), r: POINT_R, "class": "st-dot-solid" });
        gSuccessor.appendChild(c);
        twoNodes.push(c);
      });
      hideAll(twoNodes);
      treadTwoReveal = makeRevealer(twoNodes);
      setSuccessor = makeVisSetter(gSuccessor);

      if (tm.specimen) {
        gStamp4 = group("st-stamp-holder");
        gStamp4.appendChild(specimenStamp(XR - F.stamp * 4.7 - 8, 372));
        setStamp4 = makeVisSetter(gStamp4);
      }
    }

    /* -------- beat 5: two numbers -------- */

    var gPair = null, setPair = null, pairHollow = null, pairSolid = null;
    var pairLeft = { val: null, tagBox: null, tagText: null, cls: null };
    var pairRight = { val: null, tagBox: null, tagText: null, cls: null };
    var gPairHead = null, setPairHead = null, gStamp5 = null, setStamp5 = null;
    var PAIR_Y = 258, PAIR_CX = 416, PAIR_LX = 288, PAIR_RX = 544;

    if (needs(4)) {
      gPairHead = group("st-pairhead");
      gPairHead.appendChild(svgEl("text", { x: PAIR_CX, y: 140, "text-anchor": "middle", "class": "st-slab", "font-size": F.pName }, d.pair.model));
      gPairHead.appendChild(svgEl("text", { x: PAIR_CX, y: 140 + F.pBench * 1.9, "text-anchor": "middle", "class": "st-sub-label", "font-size": F.pBench }, d.pair.bench));
      setPairHead = makeVisSetter(gPairHead);

      gPair = group("st-pair");
      pairHollow = svgEl("circle", { cx: PAIR_CX, cy: PAIR_Y, r: PAIR_R, "class": "st-dot-hollow" });
      pairSolid = svgEl("circle", { cx: PAIR_CX, cy: PAIR_Y, r: PAIR_R, "class": "st-dot-solid" });
      gPair.appendChild(pairHollow);
      gPair.appendChild(pairSolid);

      function pairLabel(store, cx, valueText, tagName, className) {
        var g = svgEl("g", {});
        store.g = g;
        store.val = svgEl("text", { x: cx, y: PAIR_Y - PAIR_R - 14, "text-anchor": "middle", "class": "st-mono-strong", "font-size": F.pVal }, valueText);
        var tw = F.tag * 3.4, th = F.tag + 6.5;
        store.tagBox = svgEl("rect", { x: cx - tw / 2, y: PAIR_Y + PAIR_R + 10, width: tw, height: th, rx: 2, "class": "st-tag-box" });
        store.tagText = svgEl("text", { x: cx, y: PAIR_Y + PAIR_R + 10 + th / 2 + F.tag * 0.36, "text-anchor": "middle", "class": "st-tag", "font-size": F.tag }, tagName);
        store.cls = svgEl("text", { x: cx, y: PAIR_Y + PAIR_R + 10 + th + 8 + F.pClass, "text-anchor": "middle", "class": "st-sub-label", "font-size": F.pClass }, className);
        g.appendChild(store.val);
        g.appendChild(store.tagBox);
        g.appendChild(store.tagText);
        g.appendChild(store.cls);
        gPair.appendChild(g);
        return g;
      }
      pairLabel(pairLeft, PAIR_LX, String(d.pair.labValue.toFixed ? d.pair.labValue.toFixed(1) : d.pair.labValue), "LAB", "lab reported");
      pairLabel(pairRight, PAIR_RX, String(d.pair.indValue.toFixed ? d.pair.indValue.toFixed(1) : d.pair.indValue), "IND", "independent");
      pairLeft.setVis = makeVisSetter(pairLeft.g);
      pairRight.setVis = makeVisSetter(pairRight.g);
      setPair = makeVisSetter(gPair);

      if (d.pair.specimen) {
        gStamp5 = group("st-stamp-holder");
        gStamp5.appendChild(specimenStamp(XR - F.stamp * 4.7 - 8, 96));
        setStamp5 = makeVisSetter(gStamp5);
      }
    }

    /* -------- beat 6: the paperwork -------- */

    var gMatrixBase = null, setMatrixBase = null, matrixFillNodes = [], matrixReveal = null;
    if (needs(5)) {
      var ML = compact ? { labelX: 126, colX0: 140, colW: 140, top: 116, rowH: 30, headY: 96, dotR: 6.5 }
                       : { labelX: 176, colX0: 190, colW: 127.5, top: 116, rowH: 26, headY: 96, dotR: 5 };
      gMatrixBase = group("st-matrix");
      ARTIFACTS.forEach(function (a, ci) {
        gMatrixBase.appendChild(svgEl("text", {
          x: ML.colX0 + ci * ML.colW + ML.colW / 2, y: ML.headY, "text-anchor": "middle",
          "class": "st-sub-label", "font-size": F.mHead
        }, ARTIFACT_NAMES[a]));
      });
      var gMatrixFill = svgEl("g", {});
      REGISTRY_ORDER.forEach(function (org, ri) {
        var cy = ML.top + ri * ML.rowH;
        gMatrixBase.appendChild(svgEl("text", {
          x: ML.labelX, y: cy + F.mOrg * 0.35, "text-anchor": "end",
          "class": "st-org", "font-size": F.mOrg
        }, orgLabel(org)));
        ARTIFACTS.forEach(function (a, ci) {
          var c = d.matrix[org][a];
          var cx = ML.colX0 + ci * ML.colW + ML.colW / 2;
          var countText = c.disclosed + "/" + c.total;
          if (c.disclosed > 0) {
            /* the hollow ground of the cell is drawn with the grid; the
               fill and its count land cell by cell */
            gMatrixBase.appendChild(svgEl("circle", { cx: cx - F.mCount * 2.4, cy: cy, r: ML.dotR, "class": "st-cell-hollow" }));
            var g = svgEl("g", {});
            g.appendChild(svgEl("circle", { cx: cx - F.mCount * 2.4, cy: cy, r: ML.dotR, "class": "st-dot-solid" }));
            g.appendChild(svgEl("text", { x: cx - F.mCount * 1.5, y: cy + F.mCount * 0.35, "class": "st-mono-label", "font-size": F.mCount }, countText));
            gMatrixFill.appendChild(g);
            matrixFillNodes.push(g);
          } else {
            /* a 0-count cell never fills: the permanence is the message */
            gMatrixBase.appendChild(svgEl("circle", { cx: cx - F.mCount * 2.4, cy: cy, r: ML.dotR, "class": "st-cell-hollow" }));
            gMatrixBase.appendChild(svgEl("text", { x: cx - F.mCount * 1.5, y: cy + F.mCount * 0.35, "class": "st-mono-faint", "font-size": F.mCount }, countText));
          }
        });
      });
      gMatrixBase.appendChild(gMatrixFill);
      hideAll(matrixFillNodes);
      matrixReveal = makeRevealer(matrixFillNodes);
      setMatrixBase = makeVisSetter(gMatrixBase);
    }

    /* -------- beat 7: the landing -------- */

    var gLanding = null, setLanding = null, miniReveal = null, tileSetters = [];
    if (needs(6)) {
      var LT = compact ? { top: 74, rowH: 15, axisY: 262, tileY: 300, tileH: 76, cols: 2 }
                       : { top: 78, rowH: 16.5, axisY: 288, tileY: 322, tileH: 86, cols: 4 };
      gLanding = group("st-landing");
      var miniBase = function (i) { return LT.top + (i + 1) * LT.rowH - 4; };
      REGISTRY_ORDER.forEach(function (org, i) {
        gLanding.appendChild(svgEl("line", { x1: XL, y1: miniBase(i), x2: XR, y2: miniBase(i), "class": "st-rule" }));
        gLanding.appendChild(svgEl("text", { x: XL - 6, y: miniBase(i) - 2, "text-anchor": "end", "class": "st-org", "font-size": F.miniOrg }, orgLabel(org)));
      });
      years.forEach(function (yr) {
        var px = x(Date.UTC(yr, 0, 1));
        gLanding.appendChild(svgEl("line", { x1: px, y1: LT.axisY - 4, x2: px, y2: LT.axisY + 2, "class": "st-tick" }));
        gLanding.appendChild(svgEl("text", { x: px + 3, y: LT.axisY + 4 + F.miniYear, "class": "st-year", "font-size": F.miniYear }, String(yr)));
      });
      var rowIndex2 = {};
      REGISTRY_ORDER.forEach(function (org, i) { rowIndex2[org] = i; });
      var miniMarks = [];
      d.releases.forEach(function (r) {
        var ri = rowIndex2[r.org];
        if (ri === undefined) { return; }
        var m = svgEl("rect", { x: x(r.ms) - 1, width: 2, y: miniBase(ri) - 8, height: 8, "class": "st-mark" });
        gLanding.appendChild(m);
        miniMarks.push(m);
      });
      hideAll(miniMarks);
      miniReveal = makeRevealer(miniMarks);

      var t = d.tiles;
      var sharePct = Math.round((t.share_with_system_card || 0) * 1000) / 10;
      var tiles = [
        { value: String(t.releases_recorded), label: ["releases", "recorded"] },
        { value: String(t.days_since_last_release), label: ["days since the", "last release"] },
        { value: fmtGap(t.median_gap_days_this_year), label: ["median gap this", "year, in days"] },
        { value: sharePct + "%", label: ["releases with a", "system card link"] }
      ];
      var gap = 14;
      var tw = (XR - XL - gap * (LT.cols - 1)) / LT.cols;
      tiles.forEach(function (tile, i) {
        var col = i % LT.cols, row = Math.floor(i / LT.cols);
        var tx = XL + col * (tw + gap);
        var ty = LT.tileY + row * (LT.tileH + 10);
        var g = svgEl("g", {});
        g.appendChild(svgEl("rect", { x: tx, y: ty, width: tw, height: LT.tileH, rx: 4, "class": "st-card" }));
        g.appendChild(svgEl("text", { x: tx + 14, y: ty + 12 + F.tVal * 0.72, "class": "st-tile-val", "font-size": F.tVal }, tile.value));
        g.appendChild(svgEl("text", { x: tx + 14, y: ty + LT.tileH - 10 - F.tLab * 1.3, "class": "st-sub-label", "font-size": F.tLab }, tile.label[0]));
        g.appendChild(svgEl("text", { x: tx + 14, y: ty + LT.tileH - 10, "class": "st-sub-label", "font-size": F.tLab }, tile.label[1]));
        gLanding.appendChild(g);
        tileSetters.push(makeVisSetter(g));
      });
      setLanding = makeVisSetter(gLanding);
    }

    /* -------- the idempotent state function -------- */

    var lastCounterText = null;

    function render(p) {
      p = clamp(p, 0, NSTEPS);

      /* shared frame */
      if (setAxis) { setAxis(vis(p, 0, 0, 12.0, 0.35)); }
      if (setYears) { setYears(vis(p, 0, 0, 9.0, 0.35)); }
      if (setTimeLab) { setTimeLab(vis(p, 9.0, 0.35, 12.0, 0.3)); }
      if (setOrigin) { setOrigin(vis(p, 0, 0, 6.0, 0.35)); }

      /* beat 1 */
      if (setGhost) { setGhost(0.62 * vis(p, 0, 0, 3.0, 0.4)); }
      if (setFirstMark) {
        /* the first entry's mark is the same datum in beats 1 and 2: it
           moves from the axis to its organization row (object constancy) */
        var mT = smooth(clamp01((p - 3.0) / 0.5));
        var yTop = lerp(AXIS_Y - 16, rowBase(metaRow) - 13, mT);
        firstMark.setAttribute("y", yTop);
        firstMark.setAttribute("height", lerp(16, 13, mT));
        setFirstMark(p < 3.5 ? 1 : 0);
      }

      /* beat 2 */
      if (setPulse) {
        setPulse(vis(p, 3.0, 0.4, 6.0, 0.35));
        var sweepT = smooth(clamp01((p - 3.0) / 2.6));
        var t0 = d.releases[0].ms, t1 = d.releases[d.releases.length - 1].ms;
        var sweepMs = lerp(t0, t1, sweepT);
        /* releases are date-sorted; reveal everything at or before the sweep */
        var n = 0;
        while (n < d.releases.length && d.releases[n].ms <= sweepMs) { n++; }
        pulseReveal(p < 2.99 ? 0 : n);

        setPlayhead(vis(p, 3.05, 0.3, 5.6, 0.3));
        playheadLine.setAttribute("x1", x(sweepMs));
        playheadLine.setAttribute("x2", x(sweepMs));

        setCounter(vis(p, 4.0, 0.3, 6.0, 0.35));
        var gapNow = null;
        for (var gi = d.medianGap.length - 1; gi >= 0; gi--) {
          if (d.medianGap[gi].ms <= sweepMs) { gapNow = d.medianGap[gi]; break; }
        }
        var text = gapNow ? fmtGap(gapNow.days) : "";
        if (text !== lastCounterText) {
          lastCounterText = text;
          counterVal.textContent = text;
        }
        if (counterDate) { counterDate.textContent = "through " + fmtDay(sweepMs); }
      }

      /* beats 3 and 4 frame */
      if (setGrid) { setGrid(vis(p, 6.0, 0.4, 12.0, 0.35)); }

      /* beat 3 */
      if (setPoints) {
        setTitle3(vis(p, 6.0, 0.4, 9.0, 0.3));
        setPoints(vis(p, 6.0, 0, 9.0, 0.3));
        var arriveT = clamp01((p - 6.15) / 2.35);
        var count = p < 6.0 ? 0 : Math.max(p >= 6.15 ? 1 : 0, Math.round(arriveT * d.traj.points.length));
        pointReveal(count);
        setKeySolid(vis(p, 6.15, 0.3, 14.0, 0.35));
        setArrive(vis(p, 6.2, 0.2, 9.0, 0.2));
        if (count > 0 && count - 1 !== lastArriveIdx) {
          lastArriveIdx = count - 1;
          var pt = d.traj.points[lastArriveIdx];
          arriveVal.textContent = String(pt.value);
          arriveName.textContent = pt.model_name + ", " + pt.date;
        }
      } else if (setKeySolid) {
        setKeySolid(vis(p, 6.15, 0.3, 14.0, 0.35));
      }

      /* beat 4 */
      if (setTread) {
        var w4 = vis(p, 9.0, 0.35, 12.0, 0.3);
        setTread(w4);
        treadOneReveal(p < 9.05 ? 0 : Math.round(clamp01((p - 9.1) / 0.85) * d.treadmill.eraOne.length));
        setBoundary(Math.min(w4, vis(p, 10.0, 0.4, 12.0, 0.3)));
        setSuccessor(Math.min(w4, vis(p, 11.0, 0.3, 12.0, 0.3)));
        treadTwoReveal(p < 11.0 ? 0 : Math.round(clamp01((p - 11.05) / 0.8) * d.treadmill.eraTwo.length));
        if (setStamp4) { setStamp4(vis(p, 9.05, 0.25, 12.0, 0.3)); }
      }

      /* beat 5 */
      if (setPair) {
        var w5 = vis(p, 12.0, 0.4, 14.0, 0.3);
        setPairHead(w5);
        setPair(w5);
        var sep = smooth(clamp01((p - 12.4) / 0.8));
        var hx2 = lerp(PAIR_CX, PAIR_LX, sep);
        var sx2 = lerp(PAIR_CX, PAIR_RX, sep);
        pairHollow.setAttribute("cx", hx2);
        pairSolid.setAttribute("cx", sx2);
        var lblW = Math.min(w5, clamp01((sep - 0.55) / 0.4));
        pairLeft.setVis(lblW);
        pairRight.setVis(lblW);
        setKeyHollow(vis(p, 12.45, 0.3, 14.0, 0.35));
        if (setStamp5) { setStamp5(vis(p, 12.05, 0.25, 14.0, 0.3)); }
      } else if (setKeyHollow) {
        setKeyHollow(vis(p, 12.45, 0.3, 14.0, 0.35));
      }

      /* beat 6 */
      if (setMatrixBase) {
        setMatrixBase(vis(p, 14.0, 0.3, 16.0, 0.3));
        matrixReveal(p < 14.1 ? 0 : Math.round(clamp01((p - 14.3) / 1.2) * matrixFillNodes.length));
      }

      /* beat 7 */
      if (setLanding) {
        setLanding(vis(p, 16.0, 0.4, NSTEPS + 1, 0));
        miniReveal(p < 16.05 ? 0 : Math.round(clamp01((p - 16.1) / 0.8) * d.releases.length));
        tileSetters.forEach(function (setTile, i) {
          setTile(vis(p, 16.9 + i * 0.14, 0.25, NSTEPS + 1, 0));
        });
      }
    }

    return { render: render, svg: svg };
  }

  /* =========================================================
     Page wiring
     ========================================================= */

  function beatIndexAt(p) {
    var b = 0;
    for (var i = 0; i < BEAT_START.length; i++) {
      if (p >= BEAT_START[i]) { b = i; }
    }
    return b;
  }

  function init() {
    var scrolly = document.getElementById("scrolly");
    if (!scrolly) { return; }
    var stageFig = document.getElementById("stage");
    var stageSvg = document.getElementById("stage-svg");
    var liveEl = document.getElementById("stage-live");
    var steps = Array.prototype.slice.call(scrolly.querySelectorAll(".step"));
    var beatBlocks = Array.prototype.slice.call(scrolly.querySelectorAll(".beat"));

    var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var hasGsap = !!(window.gsap && window.ScrollTrigger);

    /* step runway: measured innerHeight, never CSS vh (craft notes) */
    var lastW = window.innerWidth, lastH = window.innerHeight;
    function setStepHeights() {
      var compact = window.innerWidth <= 700;
      var h = Math.max(420, Math.round(window.innerHeight * (compact ? 0.78 : 0.85)));
      steps.forEach(function (s) { s.style.minHeight = h + "px"; });
    }

    function isCompact() {
      return (stageFig ? stageFig.clientWidth : window.innerWidth) < 600;
    }

    /* fill the prose slots from the derived files so the prose can never
       go stale against the record */
    function fillSlots(d) {
      var values = {
        org_count: "12",
        releases_recorded: String(d.tiles.releases_recorded),
        first_date: d.releases[0].date,
        last_date: d.releases[d.releases.length - 1].date,
        median_gap_first_year: d.gapFirstYear === null ? "" : fmtGap(d.gapFirstYear),
        median_gap_this_year: fmtGap(d.tiles.median_gap_days_this_year)
      };
      Array.prototype.forEach.call(document.querySelectorAll("[data-slot]"), function (el) {
        var key = el.getAttribute("data-slot");
        if (values[key] !== undefined && values[key] !== "") { el.textContent = values[key]; }
      });
    }

    function renderFooter(meta) {
      var el = document.getElementById("foot-update");
      if (!el || !meta) { return; }
      var txt = "Last successful update: " + meta.last_successful_update + ".";
      var updated = new Date(meta.last_successful_update + "T00:00:00Z");
      var ageDays = Math.floor((Date.now() - updated.getTime()) / 86400000);
      if (ageDays > 3) {
        txt += ' <span class="stale">This record is ' + ageDays +
          " days old; the pipeline has not published an update since " +
          meta.last_successful_update + ".</span>";
      }
      el.innerHTML = txt;
    }

    if (!reduceQuery.matches) { setStepHeights(); }

    Promise.all([
      loadGzJson("derived/views.json.gz"),
      loadJson("derived/site_meta.json")
    ]).then(function (results) {
      var d = prepare(results[0], results[1]);
      var summaries = beatSummaries(d);
      fillSlots(d);
      renderFooter(results[1]);

      var stage = null;
      var compact = isCompact();
      var lastP = 0;
      var lastBeat = -1;

      function buildStage() {
        stage = createStage(stageSvg, d, compact, null);
      }

      function applyState(p) {
        lastP = p;
        if (!stage) { return; }
        stage.render(p);
        var idx = clamp(Math.floor(p), 0, NSTEPS - 1);
        steps.forEach(function (s, i) {
          s.classList.toggle("is-active", i === idx);
        });
        var b = beatIndexAt(p);
        if (b !== lastBeat) {
          lastBeat = b;
          if (liveEl) { liveEl.textContent = summaries[b]; }
        }
      }

      /* ---- static rendering: every beat's final state, stacked ----
         This is the complete reduced-motion design and the fallback when
         the animation library does not load. */
      var staticBuilt = false;
      function buildStatic() {
        if (staticBuilt) { return; }
        staticBuilt = true;
        scrolly.classList.remove("is-live");
        document.body.classList.add("story-static");
        beatBlocks.forEach(function (block, b) {
          var fig = document.createElement("figure");
          fig.className = "beat-fig";
          fig.setAttribute("role", "img");
          fig.setAttribute("aria-label", summaries[b]);
          var s = document.createElementNS(SVG_NS, "svg");
          s.setAttribute("class", "stage-svg");
          s.setAttribute("aria-hidden", "true");
          fig.insertBefore(s, null);
          var cap = document.createElement("figcaption");
          cap.className = "visually-hidden";
          cap.textContent = summaries[b];
          fig.appendChild(cap);
          var headingBlock = block.querySelector(".beat-head");
          block.insertBefore(fig, headingBlock ? headingBlock.nextSibling : block.firstChild);
          var figW = fig.clientWidth;
          var figCompact = figW > 0 ? figW < 600 : window.innerWidth < 600;
          var st = createStage(s, d, figCompact, [b]);
          st.render(BEAT_FINAL_P[b]);
        });
        steps.forEach(function (s) {
          s.style.minHeight = "";
          s.classList.remove("is-active");
        });
      }
      function teardownStatic() {
        if (!staticBuilt) { return; }
        staticBuilt = false;
        scrolly.classList.remove("is-live");
        document.body.classList.remove("story-static");
        Array.prototype.forEach.call(scrolly.querySelectorAll(".beat-fig"), function (f) {
          f.parentNode.removeChild(f);
        });
        setStepHeights();
      }

      /* ---- animated rendering: one scrubbed trigger, CSS sticky pin ---- */
      function buildAnimated() {
        buildStage();

        /* piecewise map from section progress to step units, measured
           from the real step offsets so headings and skip links never
           skew the mapping */
        var anchors = [];
        function measure() {
          var sectionRect = scrolly.getBoundingClientRect();
          var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          var sectionTop = sectionRect.top + scrollTop;
          var sectionH = scrolly.offsetHeight;
          var span = Math.max(1, sectionH - window.innerHeight);
          anchors = steps.map(function (s) {
            var top = s.getBoundingClientRect().top + scrollTop - sectionTop;
            return clamp01((top - window.innerHeight * 0.22) / span);
          });
          for (var i = 1; i < anchors.length; i++) {
            if (anchors[i] <= anchors[i - 1]) { anchors[i] = anchors[i - 1] + 0.0001; }
          }
        }
        function toStepFloat(progress) {
          if (!anchors.length) { return progress * NSTEPS; }
          if (progress <= anchors[0]) { return 0; }
          for (var i = 0; i < anchors.length - 1; i++) {
            if (progress < anchors[i + 1]) {
              return i + (progress - anchors[i]) / (anchors[i + 1] - anchors[i]);
            }
          }
          var lastSpan = Math.max(1 - anchors[anchors.length - 1], 0.0001);
          return (NSTEPS - 1) + clamp01((progress - anchors[anchors.length - 1]) / lastSpan);
        }

        measure();
        scrolly.classList.add("is-live");

        var proxy = { p: 0 };
        var tween = gsap.to(proxy, {
          p: 1,
          ease: "none",
          duration: 1,
          scrollTrigger: {
            trigger: scrolly,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.75,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: function () { measure(); }
          },
          onUpdate: function () { applyState(toStepFloat(proxy.p)); }
        });
        /* land on the true state immediately (refresh or deep link into
           the middle of the story) */
        applyState(toStepFloat(tween.scrollTrigger ? tween.scrollTrigger.progress : 0));
      }

      if (!hasGsap) {
        buildStatic();
        return;
      }

      gsap.registerPlugin(ScrollTrigger);
      var mm = gsap.matchMedia();
      mm.add({
        reduce: "(prefers-reduced-motion: reduce)",
        noPref: "(prefers-reduced-motion: no-preference)"
      }, function (ctx) {
        if (ctx.conditions.reduce) {
          buildStatic();
          return function () { teardownStatic(); };
        }
        buildAnimated();
        return function () { /* triggers revert with the context */ };
      });

      /* real resizes only: browser-chrome height jitter must not rebuild */
      var resizeTimer = null;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          var wChanged = window.innerWidth !== lastW;
          var hChanged = Math.abs(window.innerHeight - lastH) > 120;
          if (!wChanged && !hChanged) { return; }
          lastW = window.innerWidth;
          lastH = window.innerHeight;
          if (reduceQuery.matches || !hasGsap) { return; }
          setStepHeights();
          var nowCompact = isCompact();
          if (nowCompact !== compact) {
            compact = nowCompact;
            buildStage();
          }
          lastBeat = -1;
          if (window.ScrollTrigger) { ScrollTrigger.refresh(); }
          applyState(lastP);
        }, 200);
      });
    }).catch(function (err) {
      var note = document.getElementById("stage-error");
      if (note) {
        note.hidden = false;
        note.textContent = "The story's charts could not be loaded in this session (" +
          (err && err.message ? err.message : "unknown error") +
          "). The prose below is complete without them; the record itself is on the timeline page.";
      }
    });
  }

  init();
})();
