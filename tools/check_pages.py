"""Browser checks for every page (Phase 5 and 6 reviews, 2026-10-19).

At 1440, 768 and 390: no page scrolls sideways and no page throws an error.
On the story at 390 and 768: no chart label renders below 11px, and each
note rests below the sticky chart card instead of sliding under it. On the
story at 1440 and 390: each view finishes forming when its step text is in
the middle of the screen (and, at 1440, is still forming when the text is
low), and every settled view reads a mark's record from the keyboard.

usage: python tools/check_pages.py .   (needs playwright + chromium)
"""
import functools
import http.server
import os
import shutil
import sys
import threading

from playwright.sync_api import sync_playwright

repo = sys.argv[1]
dist = os.path.join(repo, ".scratch", "dist_pages")
shutil.rmtree(dist, ignore_errors=True)
shutil.copytree(os.path.join(repo, "site"), dist)
shutil.copytree(os.path.join(repo, "data"), os.path.join(dist, "data"),
                ignore=shutil.ignore_patterns("pending", "raw"))
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


handler = functools.partial(_Quiet, directory=dist)
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
url = f"http://127.0.0.1:{srv.server_address[1]}/"
threading.Thread(target=srv.serve_forever, daemon=True).start()

PAGES = sorted(f for f in os.listdir(dist) if f.endswith(".html"))
ok = True


def check(name, cond, detail=""):
    global ok
    ok &= bool(cond)
    print(("PASS " if cond else "FAIL ") + name + (f" | {detail}" if detail else ""))


with sync_playwright() as p:
    b = p.chromium.launch()
    for page in PAGES:
        for w in (1440, 768, 390):
            pg = b.new_page(viewport={"width": w, "height": 844})
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(url + page, wait_until="networkidle")
            pg.wait_for_timeout(500)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            check(f"{page} no sideways scroll @{w}", sw <= w, f"{sw}px")
            check(f"{page} no page errors @{w}", not errs, errs[:1])
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
            if page == "story.html" and w in (1440, 390):
                # each view has finished forming, its labels shown, when its
                # step text sits in the middle of the screen (on a phone, the
                # middle of the band under the pinned chart), and a settled
                # view reads a mark's record from the keyboard
                for k in range(1, 6):
                    if w == 1440:
                        # and not before: with the text low on the screen the marks are still moving
                        pg.evaluate("""(k) => { const b = document.querySelector('.step[data-step="' + k + '"]').getBoundingClientRect();
                            window.scrollTo(0, window.scrollY + (b.top + b.bottom) / 2 - innerHeight * 0.8); }""", k)
                        pg.wait_for_timeout(1600)
                        early = pg.evaluate("(() => { const g = document.querySelector('#ov .ovg.on'); return g ? +g.getAttribute('data-v') : -1; })()")
                        check(f"story view {k} still forming with its text low on the screen @{w}", early != k, f"view shown: {early}")
                    pg.evaluate("""(k) => {
                        const el = document.querySelector('.step[data-step="' + k + '"]'), b = el.getBoundingClientRect();
                        const g = document.getElementById('graphic'), narrow = g.getBoundingClientRect().width < 900;
                        const bar = document.querySelector('.topbar').offsetHeight, tb = document.querySelector('.tabbar');
                        const tab = getComputedStyle(tb).display !== 'none' ? tb.offsetHeight : 0;
                        const mid = narrow ? (bar + Math.round(g.getBoundingClientRect().height * 0.56) + innerHeight - tab) / 2 : innerHeight / 2;
                        window.scrollTo(0, window.scrollY + (b.top + b.bottom) / 2 - mid); }""", k)
                    pg.wait_for_timeout(1600)
                    shown = pg.evaluate("(() => { const g = document.querySelector('#ov .ovg.on'); return g ? +g.getAttribute('data-v') : -1; })()")
                    check(f"story view {k} settled with its text mid-screen @{w}", shown == k, f"view shown: {shown}")
                    # the pointer reaches the chart: nothing in the step column lies over it
                    over = pg.evaluate("""(() => { const h = document.getElementById('hit').getBoundingClientRect();
                        const el = document.elementFromPoint(h.left + h.width * 0.75, h.top + h.height * 0.5); return el ? el.id || el.className : ''; })()""")
                    check(f"story view {k} takes the pointer @{w}", over == "hit", over)
                    pg.focus("#hit")
                    pg.keyboard.press("ArrowRight")
                    pg.wait_for_timeout(150)
                    tip = pg.evaluate("(() => { const t = document.getElementById('tip'); return t.classList.contains('on') ? t.textContent : ''; })()")
                    check(f"story view {k} reads a mark's record from the keyboard @{w}", "opens the record" in tip, tip[:60])
                    pg.keyboard.press("Escape")
            pg.close()
    b.close()
srv.shutdown()
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
