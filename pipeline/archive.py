"""Archive snapshots for the record's lab URLs (decision D5).

Lab posts get edited or taken down; a number that traces to a page that no
longer says it traces to nothing. Every lab-originated URL on the record
(lab sources, LAB_REPORTED provenance, disclosure links) gets a Wayback
Machine snapshot, recorded beside the original:

- `sources[].archived_url` and `benchmarks[].provenance.archived_url`
- entry-level `disclosure_archived: {artifact: url}`

The validator accepts these only as
`https://web.archive.org/web/<14-digit timestamp>/<original>` where the
original is the URL the field archives.

`content/archive_map.json` is the cache and the authority: url ->
{"archived_url": ..., "via": "existing"|"saved", ...} or
{"archived_url": null, "reason": ...}. Reruns skip URLs already in the map,
and every rebuild step that writes entries (backfill, apply_disclosures,
apply_lab_numbers) re-applies the map with `apply_map`, which makes no
network calls.

Network calls go only to archive.org:

1. the availability API, for the snapshot closest to the retrieval date;
2. failing that, Save Page Now (a plain GET of /save/<url>), at most one
   save every SAVE_INTERVAL seconds, retried once on 429/5xx.

    python -m pipeline.archive [--root .] [--limit N] [--retry-failed]
    python -m pipeline.archive --apply      # re-apply the map, no network
    python -m pipeline.archive --report     # CI: count unarchived URLs
"""
import argparse
import datetime
import json
import os
import re
import sys
import time

from . import store, validate

MAP_PATH = os.path.join("content", "archive_map.json")
LAB_SOURCE_KINDS = ("lab_announcement", "lab_link", "paper")
AVAILABILITY_API = "https://archive.org/wayback/available"
CDX_API = "https://web.archive.org/cdx/search/cdx"
SAVE_ENDPOINT = "https://web.archive.org/save/"
SAVE_INTERVAL = 10.0
AVAILABILITY_TRIP = 3
USER_AGENT = ("versioncontrol-archiver/1.0 "
              "(+https://github.com/; registry of AI model releases)")

# Data sources, not lab statements; their content is captured separately.
_SKIP_PREFIXES = ("https://epoch.ai/data/all_ai_models.csv",
                  "https://epoch.ai/benchmarks")

_SNAPSHOT_PATH_RE = re.compile(r"/web/(\d{14})/")

# The rule the validator enforces; one implementation.
check_archived_url = validate.check_archived_url


def snapshot_url(timestamp: str, original: str) -> str:
    return f"https://web.archive.org/web/{timestamp}/{original}"


# ---------------------------------------------------------------- collection

def _skipped(url: str) -> bool:
    return any(url.startswith(p) for p in _SKIP_PREFIXES)


def collect_urls(entries: list) -> dict:
    """url -> earliest retrieval date (YYYY-MM-DD) for every lab-originated
    URL on the record. Disclosure links carry no retrieval date of their
    own; they take the entry's latest source retrieval date."""
    found = {}

    def add(url, date):
        if not isinstance(url, str) or not url.startswith("http") or _skipped(url):
            return
        if url not in found or (date and date < found[url]):
            found[url] = date

    for e in entries:
        dates = [s.get("retrieval_date") for s in e.get("sources", [])
                 if s.get("retrieval_date")]
        entry_date = max(dates) if dates else None
        for s in e.get("sources", []):
            if s.get("kind") in LAB_SOURCE_KINDS:
                add(s.get("url"), s.get("retrieval_date"))
        for b in e.get("benchmarks", []):
            p = b.get("provenance") or {}
            if p.get("source_class") == "LAB_REPORTED":
                add(p.get("source_url"), p.get("retrieval_date"))
        for v in (e.get("disclosure_links") or {}).values():
            add(v, entry_date)
    return found


# ---------------------------------------------------------------- map I/O

def load_map(root: str = ".") -> dict:
    path = os.path.join(root, MAP_PATH)
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_map(amap: dict, root: str = ".") -> None:
    path = os.path.join(root, MAP_PATH)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(amap, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def lookup(amap: dict, url: str):
    rec = amap.get(url)
    if isinstance(rec, dict):
        a = rec.get("archived_url")
        if a and not check_archived_url(a, url):
            return a
    return None


# ---------------------------------------------------------------- applying

def apply_to_entry(entry: dict, amap: dict) -> bool:
    """Write archive links from the map into one entry. Returns True when
    the entry changed. A map hit sets the field; a stale disclosure
    snapshot (its link changed or became NOT_DISCLOSED) is dropped so the
    entry stays valid."""
    before = json.dumps(entry, sort_keys=True)
    for s in entry.get("sources", []):
        a = lookup(amap, s.get("url"))
        if a:
            s["archived_url"] = a
    for b in entry.get("benchmarks", []):
        p = b.get("provenance")
        if isinstance(p, dict):
            a = lookup(amap, p.get("source_url"))
            if a:
                p["archived_url"] = a
    links = entry.get("disclosure_links") or {}
    current = dict(entry.get("disclosure_archived") or {})
    disc = {}
    for artifact, link in links.items():
        a = lookup(amap, link)
        if a:
            disc[artifact] = a
        elif artifact in current and not check_archived_url(current[artifact], link):
            disc[artifact] = current[artifact]
    if disc:
        entry["disclosure_archived"] = dict(sorted(disc.items()))
    else:
        entry.pop("disclosure_archived", None)
    return json.dumps(entry, sort_keys=True) != before


def apply_map(entries: list, root: str = ".", amap: dict = None) -> int:
    """Apply content/archive_map.json to entries in place; no network.
    Returns how many entries changed."""
    if amap is None:
        amap = load_map(root)
    return sum(1 for e in entries if apply_to_entry(e, amap))


# ---------------------------------------------------------------- reporting

def unarchived_urls(entries: list) -> list:
    """Distinct lab-originated URLs on the record with no archive link in
    the entries themselves (what a reader of the record would see)."""
    have = set()
    for e in entries:
        for s in e.get("sources", []):
            if s.get("archived_url"):
                have.add(s.get("url"))
        for b in e.get("benchmarks", []):
            p = b.get("provenance") or {}
            if p.get("archived_url"):
                have.add(p.get("source_url"))
        links = e.get("disclosure_links") or {}
        for artifact in (e.get("disclosure_archived") or {}):
            have.add(links.get(artifact))
    return sorted(u for u in collect_urls(entries) if u not in have)


def count_unarchived(entries: list) -> int:
    return len(unarchived_urls(entries))


def warning_line(entries: list) -> str:
    """The GitHub Actions annotation CI prints, or "" when nothing is
    missing. A warning, never an error: archive.org availability is not
    the record's to guarantee."""
    n = count_unarchived(entries)
    total = len(collect_urls(entries))
    if not n:
        return ""
    return (f"::warning title=Archive snapshots::{n} of {total} lab source "
            f"URLs have no archive.org snapshot (run python -m pipeline.archive)")


# ---------------------------------------------------------------- network

class Archiver:
    """archive.org client. `session` is a requests-like object (tests pass
    a fake); `sleep` and `clock` are injectable for the same reason."""

    def __init__(self, session=None, sleep=time.sleep, clock=time.monotonic,
                 save_interval: float = SAVE_INTERVAL, timeout: float = 120.0,
                 retry_wait: float = 30.0, lookup_tries: int = 3, lookup_interval: float = 1.5,
                 log=None):
        if session is None:
            import requests
            session = requests.Session()
            session.headers["User-Agent"] = USER_AGENT
        self.session = session
        self.sleep = sleep
        self.clock = clock
        self.save_interval = save_interval
        self.timeout = timeout
        self.retry_wait = retry_wait
        self.lookup_tries = lookup_tries
        self.log = log or (lambda msg: None)
        self._last_save = None
        self._last_lookup = None
        self.lookup_interval = lookup_interval
        self.availability_down = False
        self._availability_refusals = 0

    def _lookup_get(self, endpoint, params):
        """GET for the read-only lookup APIs, retried with backoff on 429
        and 5xx (the availability API rate-limits bursts)."""
        resp = None
        for attempt in range(self.lookup_tries):
            if self._last_lookup is not None:
                wait = self.lookup_interval - (self.clock() - self._last_lookup)
                if wait > 0:
                    self.sleep(wait)
            self._last_lookup = self.clock()
            resp = self._get(endpoint, params=params, timeout=60)
            if resp is not None and resp.status_code != 429 \
                    and resp.status_code < 500:
                return resp
            if attempt + 1 < self.lookup_tries:
                self.sleep(self.retry_wait * (attempt + 1))
        return resp

    def available(self, url: str, date: str = None):
        """Closest existing snapshot as an archived_url, or None.

        The availability API rate-limits by client, sometimes for hours
        (2026-10-19: every request answered 429 while the CDX index served
        normally). After AVAILABILITY_TRIP consecutive refusals the
        archiver stops asking it for the rest of the run and goes straight
        to the CDX lookup, rather than spending minutes in backoff per URL."""
        if self.availability_down:
            return None
        params = {"url": url}
        if date:
            params["timestamp"] = date.replace("-", "")
        resp = self._lookup_get(AVAILABILITY_API, params)
        if resp is None or resp.status_code == 429 or resp.status_code >= 500:
            self._availability_refusals += 1
            if self._availability_refusals >= AVAILABILITY_TRIP:
                self.availability_down = True
                self.log("availability API refusing requests; using CDX only "
                         "for the rest of this run")
            return None
        self._availability_refusals = 0
        if resp.status_code != 200:
            return None
        try:
            closest = (resp.json().get("archived_snapshots") or {}).get("closest")
        except ValueError:
            return None
        if not closest or not closest.get("available"):
            return None
        status = str(closest.get("status", ""))
        if status and status[0] not in "23":
            return None
        ts = str(closest.get("timestamp", ""))
        if not re.fullmatch(r"\d{14}", ts):
            return None
        # Built from our own URL, not the snapshot's: Wayback resolves
        # http/https and slash variants to the same capture, and the
        # validator holds the original to the field it archives.
        return snapshot_url(ts, url)

    def cdx_closest(self, url: str, date: str = None):
        """Second lookup through the CDX index, which answers when the
        availability API rate-limits or misses a capture it holds. Saving
        a page the archive already has costs a minute of SPN time."""
        params = {"url": url, "output": "json", "limit": "1",
                  "filter": "statuscode:[23]..", "fl": "timestamp,statuscode"}
        if date:
            params["closest"] = date.replace("-", "")
            params["sort"] = "closest"
        else:
            params["limit"] = "-1"
        resp = self._lookup_get(CDX_API, params)
        if resp is None or resp.status_code != 200:
            return None
        try:
            rows = resp.json()
        except ValueError:
            return None
        for row in rows[1:] if rows else []:
            ts = str(row[0]) if row else ""
            if re.fullmatch(r"\d{14}", ts):
                return snapshot_url(ts, url)
        return None

    def save(self, url: str):
        """Request a Save Page Now capture. Returns (archived_url, None) or
        (None, reason)."""
        reason = None
        for attempt in (1, 2):
            self._throttle()
            resp = self._get(SAVE_ENDPOINT + url, timeout=self.timeout,
                             allow_redirects=False)
            if resp is None:
                reason = "save request failed (network error or timeout)"
            elif resp.status_code == 429 or resp.status_code >= 500:
                reason = f"save returned HTTP {resp.status_code}"
            else:
                ts = self._timestamp_from(resp)
                if ts:
                    return snapshot_url(ts, url), None
                if resp.status_code >= 400:
                    return None, f"save returned HTTP {resp.status_code}"
                reason = f"save returned HTTP {resp.status_code} with no snapshot location"
                break
            if attempt == 1:
                self.sleep(self.retry_wait)
        return None, reason

    def archive(self, url: str, date: str = None) -> dict:
        try:
            a = self.available(url, date)
            if a:
                return {"archived_url": a, "via": "existing"}
            a = self.cdx_closest(url, date)
            if a:
                return {"archived_url": a, "via": "existing", "found_by": "cdx"}
            a, reason = self.save(url)
            if not a:
                # A capture the save response did not report can still have
                # landed; look once more before giving up.
                today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
                a = self.available(url, today)
                if a:
                    return {"archived_url": a, "via": "saved"}
                return {"archived_url": None, "reason": reason}
            return {"archived_url": a, "via": "saved"}
        except Exception as e:  # best-effort: never raise to the caller
            return {"archived_url": None,
                    "reason": f"archiver error: {type(e).__name__}"}

    # -- internals

    def _get(self, url, **kw):
        try:
            return self.session.get(url, **kw)
        except Exception as e:
            self.log(f"GET {url} failed: {type(e).__name__}: {e}")
            return None

    def _throttle(self):
        if self._last_save is not None:
            wait = self.save_interval - (self.clock() - self._last_save)
            if wait > 0:
                self.sleep(wait)
        self._last_save = self.clock()

    @staticmethod
    def _timestamp_from(resp):
        headers = getattr(resp, "headers", {}) or {}
        for h in ("Location", "Content-Location", "location", "content-location"):
            v = headers.get(h)
            if v:
                m = _SNAPSHOT_PATH_RE.search(v)
                if m:
                    return m.group(1)
        m = _SNAPSHOT_PATH_RE.search(getattr(resp, "url", "") or "")
        if m:
            return m.group(1)
        return None


def archive_urls(urls: dict, amap: dict, archiver: Archiver,
                 retry_failed: bool = False, limit: int = None,
                 on_result=None) -> dict:
    """Look up or save every url in `urls` (url -> retrieval date) not
    already settled in `amap`. Mutates and returns amap. `on_result` is
    called after each URL so the caller can persist progress."""
    todo = []
    for url in sorted(urls):
        rec = amap.get(url)
        if isinstance(rec, dict):
            if rec.get("archived_url"):
                continue
            if not retry_failed:
                continue
        todo.append(url)
    if limit is not None:
        todo = todo[:limit]
    for i, url in enumerate(todo, 1):
        rec = archiver.archive(url, urls[url])
        rec["checked"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        amap[url] = rec
        if on_result:
            on_result(i, len(todo), url, rec)
    return amap


def archive_entries(new_entries: list, root: str = ".", archiver: Archiver = None) -> dict:
    """Best-effort lookup/save for a few new entries (promote). Never
    raises. Records results in the map and applies them to the entries.
    Returns a small report."""
    try:
        amap = load_map(root)
        urls = collect_urls(new_entries)
        archiver = archiver or Archiver()
        archive_urls(urls, amap, archiver,
                     on_result=lambda *_: save_map(amap, root))
        save_map(amap, root)
        apply_map(new_entries, amap=amap)
        got = sum(1 for u in urls if lookup(amap, u))
        return {"urls": len(urls), "archived": got}
    except Exception as e:
        return {"urls": 0, "archived": 0,
                "error": f"{type(e).__name__}: {e}"}


# ---------------------------------------------------------------- CLI

def _write_back(root: str, amap: dict) -> int:
    entries = store.read_entries(root=root)
    changed = apply_map(entries, amap=amap)
    bad = [(e["id"], err) for e in entries for err in validate.validate_entry(e)]
    if bad:
        for eid, err in bad[:20]:
            print(f"INVALID: {eid}: {err}")
        raise SystemExit(f"{len(bad)} validation problems; nothing written")
    if changed:
        store.write_entries(entries, root=root)
    return changed


def summarize(amap: dict, urls: dict) -> dict:
    from collections import Counter
    via, reasons = Counter(), Counter()
    for u in urls:
        rec = amap.get(u)
        if not isinstance(rec, dict):
            via["not attempted"] += 1
        elif rec.get("archived_url"):
            via[rec.get("via", "existing")] += 1
        else:
            via["failed"] += 1
            reasons[rec.get("reason") or "unknown"] += 1
    return {"urls": len(urls), "by_outcome": dict(via),
            "failure_reasons": dict(reasons.most_common())}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".")
    ap.add_argument("--apply", action="store_true",
                    help="re-apply content/archive_map.json to the entries; no network")
    ap.add_argument("--report", action="store_true",
                    help="print the CI warning for unarchived lab URLs; exits 0")
    ap.add_argument("--map-only", action="store_true",
                    help="fill content/archive_map.json but leave the entries untouched")
    ap.add_argument("--retry-failed", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--run-date", default=None,
                    help="rebuild derived views with this date after writing")
    args = ap.parse_args(argv)

    if args.report:
        entries = store.read_entries(root=args.root)
        line = warning_line(entries)
        print(line or f"All {len(collect_urls(entries))} lab source URLs have "
                      "an archive snapshot.")
        return 0

    amap = load_map(args.root)
    if not args.apply:
        entries = store.read_entries(root=args.root)
        urls = collect_urls(entries)
        archiver = Archiver(log=lambda m: print(m, flush=True))

        def progress(i, n, url, rec):
            save_map(amap, args.root)
            state = rec.get("via") or f"FAILED ({rec.get('reason')})"
            print(f"[{i}/{n}] {state}: {url}", flush=True)

        archive_urls(urls, amap, archiver, retry_failed=args.retry_failed,
                     limit=args.limit, on_result=progress)
        save_map(amap, args.root)
        print(json.dumps(summarize(amap, urls), indent=2))
        if args.map_only:
            return 0

    changed = _write_back(args.root, amap)
    print(f"{changed} entries updated with archive links")
    if changed and args.run_date:
        from . import derive
        derive.build(root=args.root, run_date=args.run_date)
    return 0


if __name__ == "__main__":
    sys.exit(main())
