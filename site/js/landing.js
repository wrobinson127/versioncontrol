/* The front door. One real entry, drawn as the release entry card: the
   newest entry on record with at least one benchmark score and a disclosure
   row checked in all four slots. Behind it, the entries that came just
   before; under it, every entry on record by date. Then three findings,
   each counted from the record when the page loads. Nothing is typed in. */

(function () {
  "use strict";
  var CR = window.CR, esc = CR.esc, $ = CR.$;
  CR.initShell();

  var card = $("#card"), stack = $("#stack"), strip = $("#strip"), facts = $("#facts");
  var motion = !CR.reducedMotion() && document.visibilityState !== "hidden";

  function checked(e) {
    return CR.DISC_SLOTS.every(function (s) { return e._disc[s[0]] !== "not_researched"; });
  }
  function pick(D) {
    for (var i = 0; i < D.entries.length; i++) {
      var e = D.entries[i];
      if (!e._retracted && (e.benchmarks || []).length && checked(e)) { return i; }
    }
    return -1;
  }

  function slot(e, s) {
    var st = e._disc[s[0]], g = CR.discGlyph(st, 12);
    if (st === "disclosed") {
      return '<li class="sd sd-y"><a href="' + esc(e.disclosure_links[s[0]]) + '" rel="external noopener" target="_blank" title="' + esc(CR.DISC_TITLES.disclosed) + '">' +
        g + "<span>" + s[1] + '</span><span class="sr"> (link on record)</span></a></li>';
    }
    return '<li class="sd sd-n" title="' + esc(CR.DISC_TITLES.not_disclosed) + '">' + g + "<span>" + s[1] + '</span><span class="sd-w">not disclosed</span></li>';
  }

  function bench(b) {
    var p = b.provenance;
    return '<li><span class="sb-name">' + esc(p.benchmark_name) + '</span><span class="sb-v"><span class="sb-n">' + CR.fmtNum(b.value) + "</span>" +
      CR.provTag(p.source_class, p.source_url, p.retrieval_date) + "</span></li>";
  }

  function renderCard(e) {
    var bs = (e.benchmarks || []).slice().sort(function (a, b) {
      if (a.benchmark !== b.benchmark) { return a.benchmark < b.benchmark ? -1 : 1; }
      return a.provenance.source_class === "LAB_REPORTED" ? -1 : 1;
    });
    card.innerHTML =
      '<p class="sc-date"><time datetime="' + e.date + '">' + e.date + "</time></p>" +
      '<p class="sc-lab">' + esc(e._orgName) + "</p>" +
      '<h2 class="sc-model"><a href="explorer.html?id=' + encodeURIComponent(e.id) + '">' + esc(e.model_name) + "</a></h2>" +
      '<ul class="sc-disc" aria-label="Disclosure">' + CR.DISC_SLOTS.map(function (s) { return slot(e, s); }).join("") + "</ul>" +
      '<ul class="sc-bench" aria-label="Benchmark scores">' + bs.map(bench).join("") + "</ul>";
    card.removeAttribute("aria-busy");
  }

  function renderStack(D, i) {
    var older = D.entries.slice(i + 1, i + 4).reverse();
    stack.innerHTML = older.map(function (e) {
      return '<div class="lp-tab"><span class="lt-d">' + e.date + '</span><span class="lt-m">' + esc(e.model_name) + "</span></div>";
    }).join("");
  }

  function renderStrip(D, e) {
    var x0 = D.startDay, x1 = D.asOfDay, W = 1000, H = 40;
    var x = function (d) { return (W * (d - x0) / (x1 - x0)).toFixed(1); };
    var s = "";
    D.entries.slice().reverse().forEach(function (o) {
      if (o === e) { return; }
      s += o._rel ? '<rect x="' + x(o._day) + '" y="12" width="1.6" height="28" class="st-r"/>' : '<rect x="' + x(o._day) + '" y="26" width="1.6" height="14" class="st-v"/>';
    });
    s += '<rect x="' + (x(e._day) - 1) + '" y="0" width="3.2" height="40" class="st-me"/>';
    var years = "";
    for (var y = +D.meta.first_date.slice(0, 4) + 1; y <= +D.asOf.slice(0, 4); y++) {
      years += '<span style="left:' + (100 * (CR.dayNum(y + "-01-01") - x0) / (x1 - x0)).toFixed(2) + '%">' + y + "</span>";
    }
    strip.innerHTML = '<svg class="st-svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="' +
      esc("Every entry on record by date, " + D.meta.first_date + " to " + D.asOf + ": " + D.entries.length + " entries. The marked line is " + e.model_name + ".") + '">' + s + "</svg>" +
      '<div class="st-years" aria-hidden="true">' + years + '</div><span class="st-pin" aria-hidden="true" style="left:' + (100 * (e._day - x0) / (x1 - x0)).toFixed(2) + '%"></span>';
  }

  function renderFacts(D) {
    var out = [];
    /* releases a month over the last 365 days, against 2023 */
    var n23 = D.releases.filter(function (e) { return e._year === "2023"; }).length;
    var nYear = D.releases.filter(function (e) { return e._day > D.asOfDay - 365 && e._day <= D.asOfDay; }).length;
    if (n23) {
      out.push(['<span class="nw">' + CR.fmtNum(nYear / n23) + "&#215;</span>", "as many new models a month in the past year as in 2023."]);
    }
    /* shares divide by checked releases only */
    var sc = CR.discCounts(D.releases, "system_card");
    if (sc.researched) {
      out.push([Math.round(100 * sc.share) + "%", "of the releases we checked came with a system card."]);
    }
    var P = CR.pairs(D), hi = P.filter(function (p) { return p.lab.value > p.ind.value; }).length;
    if (P.length) {
      out.push(['<span class="nw">' + hi + '<span class="of">of</span>' + P.length + "</span>", "times a lab and an independent evaluator scored the same model, the lab's score was higher."]);
    }
    facts.innerHTML = out.map(function (f) { return '<li><span class="lf-n">' + f[0] + '</span><span class="lf-t">' + f[1] + "</span></li>"; }).join("");
  }

  CR.load().then(function (D) {
    var i = pick(D);
    if (i < 0) { $("#spec").hidden = true; strip.hidden = true; } else {
      var e = D.entries[i];
      renderCard(e);
      renderStack(D, i);
      renderStrip(D, e);
    }
    renderFacts(D);
    if (motion) { document.body.classList.add("lp-assemble"); }
  }).catch(function () {
    card.innerHTML = '<p class="t-m">The record could not be loaded in this session. <a href="explorer.html">The explorer</a> lists every entry.</p>';
    card.removeAttribute("aria-busy");
    strip.hidden = true;
    facts.parentNode.hidden = true;
  });
})();
