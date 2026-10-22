/* The home page: the count of releases, one bar per month since the first
   entry, and three findings. Every figure is counted from the published
   record when the page loads; nothing is typed in. */

(function () {
  "use strict";
  var CR = window.CR, $ = CR.$, esc = CR.esc;
  CR.initShell();

  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function monthName(k) { return MON[+k.slice(5, 7) - 1] + " " + k.slice(0, 4); }
  function dayName(d) { return +d.slice(8, 10) + " " + monthName(d.slice(0, 7)); }
  function nextMonth(k) {
    var y = +k.slice(0, 4), m = +k.slice(5, 7) + 1;
    if (m > 12) { m = 1; y++; }
    return y + "-" + (m < 10 ? "0" : "") + m;
  }
  /* a month, or the days of the current month on record so far */
  function monthLabel(k, partialTo) { return partialTo ? "1 to " + dayName(partialTo) : monthName(k); }
  function lastDayOf(k) { return new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate(); }

  function setTake(id, value, words, title) {
    var li = $("#" + id);
    if (value === null) { li.classList.add("gone"); return; }
    li.querySelector(".hm-tn").innerHTML = value;
    if (words) { li.querySelector(".hm-tw").textContent = words; }
    if (title) { li.title = title; }
  }

  CR.load().then(function (D) {
    var rel = D.releases;
    console.assert(rel.length === D.views.tiles.releases_recorded, "release count matches the derived tile");
    $("#hm-n").textContent = rel.length.toLocaleString("en-GB");

    /* ---------- months ---------- */
    var count = {};
    rel.forEach(function (e) { var k = e.date.slice(0, 7); count[k] = (count[k] || 0) + 1; });
    var nowK = D.asOf.slice(0, 7), months = [];
    for (var k = D.meta.first_date.slice(0, 7); k <= nowK; k = nextMonth(k)) { months.push({ k: k, n: count[k] || 0 }); }
    var partial = +D.asOf.slice(8, 10) < lastDayOf(nowK);
    var max = Math.max.apply(null, months.map(function (m) { return m.n; })) || 1;

    var oldest = rel[rel.length - 1], newest = rel[0];
    $("#hm-first").innerHTML = "<b>" + esc(oldest.model_name) + "</b>, <i>" + dayName(oldest.date) + "</i>";
    $("#hm-last").innerHTML = "<b>" + esc(newest.model_name) + "</b>, <i>" + dayName(newest.date) + "</i>";
    var newestK = newest.date.slice(0, 7);

    var bars = $("#hm-bars");
    bars.innerHTML = months.map(function (m, i) {
      var cls = "hm-m" + (partial && m.k === nowK ? " part" : "") + (m.k === newestK ? " now" : "");
      return '<div class="' + cls + '" data-i="' + i + '" style="--i:' + i + ";--h:" + (m.n / max).toFixed(4) + '"><span class="hm-b"></span></div>';
    }).join("");
    if (!CR.reducedMotion()) { bars.classList.add("draw"); }

    var years = "";
    months.forEach(function (m, i) {
      if (m.k.slice(5) === "01") { years += '<span style="left:' + (100 * (i + 0.5) / months.length).toFixed(3) + '%;transform:translateX(-50%)">' + m.k.slice(0, 4) + "</span>"; }
    });
    $("#hm-years").innerHTML = years;

    /* a table for screen readers: every month and its count */
    $("#hm-cap").innerHTML = "Releases per month, " + monthName(months[0].k) + " to " + monthName(nowK) + "." +
      '<table><thead><tr><th scope="col">Month</th><th scope="col">Releases</th></tr></thead><tbody>' +
      months.map(function (m) { return "<tr><td>" + monthLabel(m.k, partial && m.k === nowK ? D.asOf : null) + "</td><td>" + m.n + "</td></tr>"; }).join("") +
      "</tbody></table>";

    /* ---------- reading a month: hover, tap or arrow keys ---------- */
    var fig = $("#hm-pulse"), plot = $("#hm-plot"), read = $("#hm-read"), cols = bars.children, cur = -1;
    function show(i) {
      if (cur >= 0 && cols[cur]) { cols[cur].classList.remove("on"); }
      cur = i;
      if (i < 0) { fig.classList.remove("reading"); read.textContent = ""; return; }
      var m = months[i];
      cols[i].classList.add("on");
      read.innerHTML = esc(monthLabel(m.k, partial && m.k === nowK ? D.asOf : null)) + ":" +
        "<b>" + m.n + "</b> " + (m.n === 1 ? "release" : "releases");
      fig.classList.add("reading");
      var w = plot.clientWidth, rw = read.offsetWidth, x = w * (i + 0.5) / months.length;
      read.style.left = Math.max(0, Math.min(w - rw, x - rw / 2)) + "px";
    }
    function colAt(ev) {
      var r = plot.getBoundingClientRect();
      var i = Math.floor((ev.clientX - r.left) / r.width * months.length);
      return Math.max(0, Math.min(months.length - 1, i));
    }
    plot.addEventListener("pointermove", function (ev) { if (ev.pointerType === "mouse") { show(colAt(ev)); } });
    plot.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") { show(-1); } });
    plot.addEventListener("pointerdown", function (ev) { if (ev.pointerType !== "mouse") { show(colAt(ev)); } });
    document.addEventListener("pointerdown", function (ev) { if (ev.pointerType !== "mouse" && !plot.contains(ev.target)) { show(-1); } });
    plot.addEventListener("keydown", function (ev) {
      var n = months.length, i = cur;
      if (ev.key === "ArrowRight") { i = cur < 0 ? n - 1 : Math.min(n - 1, cur + 1); }
      else if (ev.key === "ArrowLeft") { i = cur < 0 ? n - 1 : Math.max(0, cur - 1); }
      else if (ev.key === "Home") { i = 0; }
      else if (ev.key === "End") { i = n - 1; }
      else if (ev.key === "Escape") { i = -1; }
      else { return; }
      ev.preventDefault();
      show(i);
    });
    plot.addEventListener("blur", function () { show(-1); });

    /* ---------- three findings ---------- */
    /* the monthly pace over the last twelve complete months against 2023 */
    var recent = 0, recentN = 0, y23 = 0, y23N = 0;
    months.forEach(function (m, i) {
      if (m.k.slice(0, 4) === "2023") { y23 += m.n; y23N++; }
      var back = months.length - 1 - i;
      if (back >= 1 && back <= 12) { recent += m.n; recentN++; }
    });
    var lastFull = months[months.length - 2], firstFull = months[months.length - 13];
    if (y23N === 12 && recentN === 12 && y23 && firstFull.k > "2023-12") {
      setTake("t-pace", CR.fmtNum(recent / y23) + "×", null,
        monthName(firstFull.k) + " to " + monthName(lastFull.k) + ": " + recent + " releases. 2023: " + y23 + " releases.");
    } else { setTake("t-pace", null); }

    /* shares divide by checked releases only */
    var sc = CR.discCounts(rel, "system_card");
    console.assert(Math.abs(sc.share - D.views.tiles.share_with_system_card) < 0.005, "system card share matches the derived tile");
    if (sc.researched) {
      setTake("t-card", Math.round(100 * sc.share) + "%", "of the " + sc.researched + " releases we checked came with a system card",
        sc.disclosed + " of " + sc.researched + " checked releases.");
    } else { setTake("t-card", null); }

    /* the lab's score and Epoch's score on the same entry and benchmark */
    var P = CR.pairs(D), above = P.filter(function (p) { return p.lab.value > p.ind.value; }).length;
    if (P.length) {
      setTake("t-pair", above + '<span class="hm-of"> of </span>' + P.length, "times a lab's own score sat above the independent result on the same test",
        P.map(function (p) { return p.e.model_name + ", " + CR.BENCH[p.bench] + ": lab " + p.lab.value + ", independent " + p.ind.value; }).join(". ") + ".");
    } else { setTake("t-pair", null); }
  }).catch(function (err) {
    $("#hm-n").textContent = "";
    $("#hm-plot").innerHTML = '<div class="load-error"><p>The record could not be loaded in this session (' + esc(err && err.message ? err.message : "unknown error") + "). Reloading the page retries.</p></div>";
    $("#hm-plot").removeAttribute("tabindex");
    document.querySelector(".hm-takes").hidden = true;
  });
})();
