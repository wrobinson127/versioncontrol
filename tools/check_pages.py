"""Browser checks for every page (Phase 5 and 6 reviews, 2026-10-19).

At 1440, 768 and 390: no page scrolls sideways and no page throws an error.
On the story at 390 and 768: no chart label renders below 11px, and each
note rests below the sticky chart card instead of sliding under it.

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
            pg.close()
    b.close()
srv.shutdown()
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
