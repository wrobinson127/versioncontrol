"""Browser checks for the explorer (replaces check_timeline.py, whose timeline
cards and element ids the explorer replaced). The same five properties, held
against the new page at 1440, 768 and 390:

  F1  the filters are reachable: the lab filter is the top element where it
      is drawn (desktop: the column filter row; phone: the filters sheet);
  F2  a link to an entry hidden by the current filters still reveals it, and
      an old timeline link (index.html#<entry-id>) opens the same entry;
  F3  a date range typed keystroke by keystroke holds, in the inputs and in
      the address;
  F4  the keyboard path to the filters is short, and the skip link lands
      before them;
  F5  the record fits at 390: no sideways scroll, and every list row and the
      entry sheet sit inside the viewport.

usage: python tools/check_explorer.py .   (needs playwright + chromium)
"""
import functools
import http.server
import os
import shutil
import sys
import threading

from playwright.sync_api import sync_playwright

repo = sys.argv[1]
dist = os.path.join(repo, ".scratch", "dist_explorer")
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
ok = True
HIDDEN = "openai--gpt-5.5"


def check(name, cond, detail=""):
    global ok
    ok &= bool(cond)
    print(("PASS " if cond else "FAIL ") + name + (" | " + str(detail) if detail else ""))


def ready(pg):
    pg.wait_for_function("document.documentElement.classList.contains('ready')", timeout=15000)
    pg.wait_for_timeout(250)


with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1440, 768, 390):
        pg = b.new_page(viewport={"width": w, "height": 844})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url + "explorer.html", wait_until="networkidle"); ready(pg)
        phone = w <= 720

        # F1: the lab filter is the element on top where it is drawn
        if phone:
            pg.click("#x-filters-btn"); pg.wait_for_timeout(250)
        hit = pg.evaluate("""() => { const el = document.querySelector('select[data-f="lab"]');
            const r = el.getBoundingClientRect(); if (!r.width) return 'not drawn';
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return top === el ? 'lab select' : (top ? top.tagName + '.' + top.className : 'nothing'); }""")
        check(f"F1 lab filter reachable @{w}", hit == "lab select", hit)
        pg.select_option('select[data-f="lab"]', "anthropic"); pg.wait_for_timeout(300)
        n = pg.evaluate("document.querySelector('#ex-count b').textContent")
        check(f"F1 lab filter applies @{w}", n.isdigit() and 0 < int(n) < 366, n)
        if phone:
            pg.click("#fs-apply"); pg.wait_for_timeout(200)

        # F2: an entry the filters hide still opens from a link, and says so
        pg.goto(url + f"explorer.html?lab=anthropic&id={HIDDEN}", wait_until="networkidle"); ready(pg)
        r = pg.evaluate("""() => { const h = document.getElementById('ins-h'); const ins = document.getElementById('inspector');
            if (!h || ins.hidden) return null; const b = h.getBoundingClientRect();
            return [h.textContent, b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth,
                    !!document.querySelector('.ins-out')]; }""")
        check(f"F2 hidden entry opens and is in view @{w}", r and r[0] == "GPT-5.5" and r[1], r)
        check(f"F2 the inspector says it is outside the filters @{w}", r and r[2], r)
        pg.goto(url + f"index.html#{HIDDEN}", wait_until="networkidle"); ready(pg)
        r = pg.evaluate("[location.pathname.split('/').pop(), new URLSearchParams(location.search).get('id'), (document.getElementById('ins-h') || {}).textContent]")
        check(f"F2 old timeline link opens the entry @{w}", r == ["explorer.html", HIDDEN, "GPT-5.5"], r)

        # F5: fits at every width, rows and sheet inside the viewport
        pg.goto(url + "explorer.html", wait_until="networkidle"); ready(pg)
        sw = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
        check(f"F5 no sideways scroll @{w}", sw[0] <= sw[1], sw)
        if phone:
            rows = pg.evaluate("""() => { const rs = [...document.querySelectorAll('.mrow')].slice(0, 40);
                return [rs.length, rs.every(r => { const b = r.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; })]; }""")
            check(f"F5 list rows inside the viewport @{w}", rows[0] > 0 and rows[1], rows)
            pg.click(".mrow"); pg.wait_for_timeout(300)
            sheet = pg.evaluate("""() => { const b = document.getElementById('inspector').getBoundingClientRect();
                return [Math.round(b.left), Math.round(b.right), innerWidth, document.documentElement.scrollWidth]; }""")
            check(f"F5 entry sheet fills the width, no overflow @{w}", sheet[0] == 0 and sheet[1] == sheet[2] and sheet[3] <= sheet[2], sheet)
            pg.go_back(); pg.wait_for_timeout(300)
            check(f"F5 Back closes the sheet @{w}", pg.evaluate("document.getElementById('inspector').hidden"))
        else:
            fits = pg.evaluate("""() => { const s = document.getElementById('grid-scroll').getBoundingClientRect();
                return s.left >= 0 && s.right <= innerWidth; }""")
            check(f"F5 grid inside the viewport @{w}", fits)
        check(f"no page errors @{w}", not errs, errs[:2])
        pg.close()

    # F3: a range typed keystroke by keystroke holds (desktop inputs; on a phone the sheet holds them)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(url + "explorer.html", wait_until="networkidle"); ready(pg)
    pg.focus("#x-from"); pg.keyboard.type("01012025", delay=40); pg.keyboard.press("Tab")
    pg.focus("#x-to"); pg.keyboard.type("03312025", delay=40); pg.keyboard.press("Tab")
    pg.wait_for_timeout(400)
    vals = pg.evaluate("[document.getElementById('x-from').value, document.getElementById('x-to').value, document.querySelector('#ex-count b').textContent, location.search]")
    check("F3 typed range holds", vals[0] == "2025-01-01" and vals[1] == "2025-03-31" and int(vals[2]) > 0
          and "from=2025-01-01" in vals[3] and "to=2025-03-31" in vals[3], vals)
    pg.reload(wait_until="networkidle"); ready(pg)
    vals2 = pg.evaluate("[document.getElementById('x-from').value, document.getElementById('x-to').value]")
    check("F3 typed range survives a reload", vals2 == ["2025-01-01", "2025-03-31"], vals2)

    # F4: tab stops before the search and the column filters
    pg.goto(url + "explorer.html", wait_until="networkidle"); ready(pg)
    # Counted in controls reached, not key presses: a native date input takes
    # one press per date part (day, month, year, picker) but is one control.
    pg.evaluate("window.__seen = []; document.addEventListener('focusin', e => { if (!window.__seen.includes(e.target)) window.__seen.push(e.target); })")
    stops = {}
    for _ in range(1, 80):
        pg.keyboard.press("Tab")
        n, a = pg.evaluate("(() => { const e = document.activeElement; return [window.__seen.length, e.id || (e.getAttribute('data-f') ? 'f:' + e.getAttribute('data-f') : e.tagName)]; })()")
        stops.setdefault(a, n)
        if "f:lab" in stops:
            break
    check("F4 search within 15 tab stops", stops.get("x-q", 99) <= 15, stops.get("x-q"))
    check("F4 lab filter within 20 tab stops", stops.get("f:lab", 99) <= 20, stops.get("f:lab"))
    pg.goto(url + "explorer.html", wait_until="networkidle"); ready(pg)
    pg.keyboard.press("Tab"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    pg.keyboard.press("Tab")
    check("F4 skip link lands before the filters",
          pg.evaluate("document.activeElement && !!document.activeElement.closest('.ex-toolbar')"),
          pg.evaluate("document.activeElement && document.activeElement.id"))
    b.close()
srv.shutdown()
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
