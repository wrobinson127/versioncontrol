"""Browser checks for every page, against the site as it deploys.

The site is built exactly as pages.yml builds it (tools/site_dist.py), so
the CSV files, the sitemap and llms.txt are checked too: each returns 200.

At 1440, 768 and 390, on every page: no sideways scroll; no uncaught error,
console error, failed request or 4xx/5xx response; and, at 768, no text
crushed sideways (a visible text block narrower than 120px holding more
than three words).

On the story:
  - at 390 and 768, no chart label renders below 11px;
  - at 1440, 768 and 390, each view finishes forming when its step text is
    in the middle of the screen (on a phone or tablet, the middle of the
    band under the pinned chart; a note taller than that band settles with
    its top just below the chart), and at 1440 a view is still forming
    while its text is low: the chart stands between the previous view and
    this one (a chart that reports no position fails);
  - at 390 and 768, each settled note rests below the sticky chart card
    instead of sliding under it;
  - every settled view reads a mark's record from the keyboard;
  - on a touch phone, the first tap on a mark shows its record without
    leaving the page, a tap elsewhere closes it, and a second tap on the
    same mark opens the entry in the explorer.

The theme: with no saved choice a page follows the system light or dark
setting; a saved choice wins over it.

usage: python tools/check_pages.py .   (needs playwright + chromium)
"""
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import site_dist  # noqa: E402

repo = sys.argv[1]
dist = site_dist.build(repo, "dist_pages")
srv, url = site_dist.serve(dist)

PAGES = sorted(f for f in os.listdir(dist) if f.endswith(".html"))
ok = True


def check(name, cond, detail=""):
    global ok
    ok &= bool(cond)
    print(("PASS " if cond else "FAIL ") + name + (f" | {detail}" if detail else ""))


for path in ("data/releases.csv", "data/scores.csv", "sitemap.xml", "llms.txt", "DATA_LICENSE.md"):
    try:
        status = urllib.request.urlopen(url + path).status
    except Exception as err:  # noqa: BLE001
        status = str(err)
    check(f"{path} returns 200", status == 200, status)

CRUSH = """() => {
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('svg, [hidden], .visually-hidden, .sr, dialog:not([open])')) return;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim();
    if (!own) return;
    const words = own.split(/\\s+/).length;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || !el.getBoundingClientRect().width) return;
    // inline text wraps inside the nearest block that holds it: measure that block
    let box = el;
    while (box.parentElement && getComputedStyle(box).display === 'inline') box = box.parentElement;
    const r = box.getBoundingClientRect();
    if (r.width < 120 && words > 3 && cs.whiteSpace !== 'nowrap') out.push(el.tagName.toLowerCase() + '.' + el.className + ' ' + Math.round(r.width) + 'px: ' + own.slice(0, 40));
  });
  return out; }"""

SHOWN = "(() => { const g = document.querySelector('#ov .ovg.on'); return g ? +g.getAttribute('data-v') : -1; })()"
TO_MID = """(k) => {
    const el = document.querySelector('.step[data-step="' + k + '"]'), b = el.getBoundingClientRect();
    const g = document.getElementById('graphic'), narrow = g.getBoundingClientRect().width < 900;
    const bar = document.querySelector('.topbar').offsetHeight, tb = document.querySelector('.tabbar');
    const tab = getComputedStyle(tb).display !== 'none' ? tb.offsetHeight : 0;
    const card = bar + Math.round(g.getBoundingClientRect().height * 0.56);
    const mid = narrow ? (card + innerHeight - tab) / 2 : innerHeight / 2;
    if (narrow && b.height > innerHeight - tab - card - 24) { window.scrollTo(0, window.scrollY + b.top - (card + 12) + 2); return; }
    window.scrollTo(0, window.scrollY + (b.top + b.bottom) / 2 - mid); }"""
PROGRESS = "(() => { const v = document.getElementById('graphic').getAttribute('data-progress'); return v === null ? -1 : +v; })()"
# the chart card on a phone or tablet: the top bar plus the pinned band
BELOW_CARD = """(k) => {
    const g = document.getElementById('graphic'), card = document.querySelector('.topbar').offsetHeight + Math.round(g.getBoundingClientRect().height * 0.56);
    const s = document.querySelector('.step[data-step="' + k + '"]').getBoundingClientRect();
    return [Math.round(s.top), card]; }"""
FIND_MARK = """() => {
    const hit = document.getElementById('hit'), tip = document.getElementById('tip'), r = hit.getBoundingClientRect();
    for (let y = r.top + 4; y < r.bottom - 4; y += 4) for (let x = r.left + 4; x < r.right - 4; x += 4) {
      hit.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse' }));
      if (tip.classList.contains('on')) { hit.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' })); return [x, y]; }
    }
    return null; }"""
TIP_ON = "document.getElementById('tip').classList.contains('on')"

with sync_playwright() as p:
    b = p.chromium.launch()
    for page in PAGES:
        for w in (1440, 768, 390):
            pg = b.new_page(viewport={"width": w, "height": 844})
            errs = site_dist.watch(pg)
            pg.goto(url + page, wait_until="networkidle")
            pg.wait_for_timeout(500)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            check(f"{page} no sideways scroll @{w}", sw <= w, f"{sw}px")
            if w in (390, 768):
                crushed = pg.evaluate(CRUSH)
                check(f"{page} no text crushed sideways @{w}", not crushed, crushed[:3])
            if page == "story.html" and w in (390, 768):
                smallest = pg.evaluate("""() => {
                    let m = 99;
                    document.querySelectorAll('svg text').forEach(t => {
                      const r = t.getBoundingClientRect();
                      if (!r.width || !t.textContent.trim()) { return; }
                      const fs = parseFloat(getComputedStyle(t).fontSize);
                      const svg = t.ownerSVGElement, vb = svg && svg.viewBox && svg.viewBox.baseVal;
                      const scale = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
                      m = Math.min(m, fs * scale);
                    });
                    return m; }""")
                check(f"story labels >= 11px @{w}", smallest >= 11, f"{smallest:.1f}px")
            if page == "story.html":
                for k in range(1, 6):
                    if w == 1440:
                        pg.evaluate("""(k) => { const b = document.querySelector('.step[data-step="' + k + '"]').getBoundingClientRect();
                            window.scrollTo(0, window.scrollY + (b.top + b.bottom) / 2 - innerHeight * 0.8); }""", k)
                        pg.wait_for_timeout(1600)
                        at = pg.evaluate(PROGRESS)
                        check(f"story view {k} still forming with its text low on the screen @{w}", k - 1 < at < k, f"chart at {at}")
                    pg.evaluate(TO_MID, k)
                    pg.wait_for_timeout(1600)
                    shown = pg.evaluate(SHOWN)
                    check(f"story view {k} settled with its text mid-screen @{w}", shown == k, f"view shown: {shown}")
                    if w in (390, 768):
                        top, card = pg.evaluate(BELOW_CARD, k)
                        check(f"story note {k} rests below the chart card @{w}", top >= card - 1, f"note top {top}, card bottom {card}")
                    over = pg.evaluate("""(() => { const h = document.getElementById('hit').getBoundingClientRect();
                        const el = document.elementFromPoint(h.left + h.width * 0.75, h.top + h.height * 0.5); return el ? el.id || el.className : ''; })()""")
                    if w in (1440, 390):
                        check(f"story view {k} takes the pointer @{w}", over == "hit", over)
                    pg.focus("#hit")
                    pg.keyboard.press("ArrowRight")
                    pg.wait_for_timeout(150)
                    tip = pg.evaluate("(() => { const t = document.getElementById('tip'); return t.classList.contains('on') ? t.textContent : ''; })()")
                    check(f"story view {k} reads a mark's record from the keyboard @{w}", "Open in explorer" in tip, tip[:60])
                    pg.keyboard.press("Escape")
            check(f"{page} no errors or failed requests @{w}", not errs, errs[:2])
            pg.close()

    # touch: the first tap shows the record, a tap elsewhere closes it, a second tap opens it
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    errs = site_dist.watch(pg)
    pg.goto(url + "story.html", wait_until="networkidle")
    pg.wait_for_timeout(800)
    pg.evaluate(TO_MID, 3)
    pg.wait_for_timeout(1800)
    xy = pg.evaluate(FIND_MARK)
    check("story touch: a mark is under the finger in view 3", xy is not None, xy)
    if xy:
        pg.wait_for_timeout(200)
        pg.touchscreen.tap(*xy)
        pg.wait_for_timeout(400)
        first = [pg.evaluate(TIP_ON), pg.url.endswith("story.html")]
        check("story touch: the first tap shows the record and stays on the page", first == [True, True], first)
        link = pg.evaluate("(() => { const a = document.querySelector('#tip .t-open a'); return a ? a.getAttribute('href') : null; })()")
        check("story touch: the record carries an Open in explorer link", bool(link) and link.startswith("explorer.html?id="), link)
        away = pg.evaluate("(() => { const r = document.querySelector('.step.is-active p').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
        pg.touchscreen.tap(*away)
        pg.wait_for_timeout(300)
        check("story touch: a tap elsewhere closes the record", not pg.evaluate(TIP_ON))
        pg.touchscreen.tap(*xy)
        pg.wait_for_timeout(300)
        with pg.expect_navigation(timeout=5000):
            pg.touchscreen.tap(*xy)
        check("story touch: a second tap on the same mark opens it in the explorer", "explorer.html?id=" in pg.url, pg.url)
    check("story touch: no errors or failed requests", not errs, errs[:2])
    ctx.close()

    # theme: the system setting with no saved choice; a saved choice wins
    for scheme in ("light", "dark"):
        ctx = b.new_context(color_scheme=scheme)
        pg = ctx.new_page()
        pg.goto(url + "about.html", wait_until="networkidle")
        got = pg.evaluate("[document.documentElement.getAttribute('data-theme'), localStorage.getItem('vc-theme')]")
        check(f"theme follows a {scheme} system with no saved choice, and saves nothing", got == [scheme, None], got)
        ctx.close()
    ctx = b.new_context(color_scheme="light")
    ctx.add_init_script("try { localStorage.setItem('vc-theme', 'dark'); } catch (e) {}")
    pg = ctx.new_page()
    pg.goto(url + "about.html", wait_until="networkidle")
    got = pg.evaluate("document.documentElement.getAttribute('data-theme')")
    check("a saved dark choice wins over a light system", got == "dark", got)
    ctx.close()
    b.close()
srv.shutdown()
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
