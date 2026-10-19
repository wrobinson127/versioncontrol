"""Browser checks for the timeline fixes of 2026-10-19 (audit F1 to F5, F10).
Runs the built site with Playwright at 1440, 768 and 390.
usage: python tools/check_timeline.py .   (needs playwright + chromium)"""
import functools, http.server, os, shutil, sys, threading
from playwright.sync_api import sync_playwright

repo = sys.argv[1]
dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".scratch", "dist_check")
shutil.rmtree(dist, ignore_errors=True)
shutil.copytree(os.path.join(repo, "site"), dist)
shutil.copytree(os.path.join(repo, "data"), os.path.join(dist, "data"),
                ignore=shutil.ignore_patterns("pending", "raw"))
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=dist)
h.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
url = f"http://127.0.0.1:{srv.server_address[1]}/"
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = True
def check(name, cond, detail=""):
    global ok
    ok &= bool(cond)
    print(("PASS " if cond else "FAIL ") + name + (" | " + str(detail) if detail else ""))

with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1440, 768, 390):
        pg = b.new_page(viewport={"width": w, "height": 844})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url, wait_until="networkidle"); pg.wait_for_timeout(600)
        # F1: scroll so controls stick, then hit-test the org select
        pg.evaluate("document.querySelector('#timeline').scrollIntoView()")
        pg.wait_for_timeout(300)
        hit = pg.evaluate("""() => { const r = document.getElementById('f-org').getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
            return el && (el.id || el.tagName); }""")
        check(f"F1 org select reachable @{w}", hit == "f-org", hit)
        # F2: jump to an entry; its name must be below the controls
        pg.evaluate("location.hash = ''; document.querySelector('a.traj-point').dispatchEvent(new MouseEvent('click', {bubbles:true}))")
        pg.wait_for_timeout(900)
        r = pg.evaluate("""() => { const id = decodeURIComponent(location.hash.slice(1)) ||
              document.querySelector('a.traj-point').getAttribute('href').slice(1);
            const e = document.getElementById(id); const c = document.querySelector('.controls').getBoundingClientRect();
            return e ? [e.getBoundingClientRect().top, c.bottom] : null; }""")
        check(f"F2 entry clears the bars @{w}", r and r[0] >= r[1] - 2, r)
        # F5: matrix cells not cropped
        m = pg.evaluate("""() => { const s = document.querySelector('.matrix-scroll'); return s ? [s.scrollWidth, s.clientWidth] : null; }""")
        check(f"F5 matrix fits @{w}", m and m[0] <= m[1] + 1, m)
        # F10: no-JS state is covered elsewhere; here: card visible and filled
        check(f"F10 latest card filled @{w}", pg.evaluate("!!document.querySelector('.latest-name') && document.querySelector('.latest-name').textContent.length > 0"))
        check(f"no page errors @{w}", not errs, errs)
        # overflow
        ov = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
        check(f"no horizontal overflow @{w}", ov[0] <= ov[1], ov)
        pg.close()
    # F3: type a To date after a From date, keystroke by keystroke
    pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.goto(url, wait_until="networkidle"); pg.wait_for_timeout(600)
    pg.fill("#range-from", "2025-01-01") if pg.query_selector("#range-from") else None
    fid = pg.evaluate("(document.querySelector('input[type=date]')||{}).id")
    ids = pg.evaluate("[...document.querySelectorAll('input[type=date]')].map(e=>e.id)")
    pg.fill("#" + ids[0], "2025-01-01")
    pg.dispatch_event("#" + ids[0], "change")
    pg.focus("#" + ids[1])
    pg.keyboard.type("03312025", delay=40)
    pg.keyboard.press("Tab")
    pg.wait_for_timeout(400)
    vals = pg.evaluate(f"[document.getElementById('{ids[0]}').value, document.getElementById('{ids[1]}').value, document.getElementById('count').textContent]")
    check("F3 typed range holds", vals[0] == "2025-01-01" and vals[1] == "2025-03-31" and not vals[2].startswith("showing 0"), vals)
    # F4: tab stops before the org filter
    pg.goto(url, wait_until="networkidle"); pg.wait_for_timeout(600)
    n = 0
    for n in range(1, 400):
        pg.keyboard.press("Tab")
        if pg.evaluate("document.activeElement && document.activeElement.id") == "f-org":
            break
    check("F4 filters within 60 tab stops", n < 60, n)
    pg.goto(url, wait_until="networkidle"); pg.wait_for_timeout(400)
    pg.keyboard.press("Tab"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    pg.keyboard.press("Tab")
    check("F4 skip link lands on the filters", pg.evaluate("document.activeElement && document.activeElement.closest('.controls') !== null"))
    b.close()
srv.shutdown()
print("ALL PASS" if ok else "SOME FAILED")
