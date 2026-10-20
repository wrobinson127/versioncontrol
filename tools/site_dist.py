"""The site as it deploys, for the browser checks.

build() assembles dist exactly as .github/workflows/pages.yml does: the
site files at the root, data/ beside them without pending/, raw/ or the
LLM ledger, DATA_LICENSE.md, and the sitemap, llms.txt and the two CSV
files written by pipeline.site_files. serve() serves it on a free port.
watch() records what a page reports as broken: uncaught errors, console
errors, requests that fail, and responses of 400 or more.
"""
import functools
import http.server
import os
import shutil
import subprocess
import sys
import threading


def build(repo: str, name: str) -> str:
    dist = os.path.join(repo, ".scratch", name)
    shutil.rmtree(dist, ignore_errors=True)
    shutil.copytree(os.path.join(repo, "site"), dist)
    shutil.copytree(os.path.join(repo, "data"), os.path.join(dist, "data"),
                    ignore=shutil.ignore_patterns("pending", "raw"))
    ledger = os.path.join(dist, "data", "derived", "llm_ledger.json")
    if os.path.exists(ledger):
        os.remove(ledger)
    shutil.copy(os.path.join(repo, "DATA_LICENSE.md"), dist)
    subprocess.run([sys.executable, "-m", "pipeline.site_files", "--out", dist],
                   cwd=repo, check=True, stdout=subprocess.DEVNULL)
    return dist


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(dist: str):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_Quiet, directory=dist))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/"


def watch(pg) -> list:
    """Every way a page can report a fault, collected in one list."""
    errs = []
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.on("console", lambda m: errs.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    # ERR_ABORTED is a request the page itself left behind by navigating
    # (the old-link redirect does this on purpose); every other failure counts
    pg.on("requestfailed", lambda r: errs.append(f"request failed: {r.url} ({r.failure})")
          if "ERR_ABORTED" not in str(r.failure) else None)
    pg.on("response", lambda r: errs.append(f"HTTP {r.status}: {r.url}") if r.status >= 400 else None)
    return errs
