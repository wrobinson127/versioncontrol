"""Archive snapshot tests (D5): the schema accepts only a Wayback capture of
the exact page a field cites; the archiver looks up before it saves, paces
its saves, retries once, and gives up without raising; the map re-applies
on every rebuild step; CI counts what is still missing."""
import copy
import json
import os

from pipeline import archive, promote, store, validate
from pipeline.tests.test_promote import (RUN_DATE, _candidate, _seed_entries,
                                         _write_candidate)
from pipeline.tests.test_validate import _valid_entry

WB = "https://web.archive.org/web/20260101120000/"


# ------------------------------------------------------------ schema

def _lab_entry():
    e = _valid_entry()
    lab = next(s for s in e["sources"] if s["kind"] != "epoch_csv")
    return e, lab


def test_well_formed_source_snapshot_validates():
    e, lab = _lab_entry()
    lab["archived_url"] = WB + lab["url"]
    assert validate.validate_entry(e) == []


def test_snapshot_normalises_scheme_and_trailing_slash():
    e, lab = _lab_entry()
    url = lab["url"]
    other = ("http://" + url[len("https://"):]) if url.startswith("https://") \
        else url
    other = other.rstrip("/") if url.endswith("/") else other + "/"
    lab["archived_url"] = WB + other
    assert validate.validate_entry(e) == []


def test_snapshot_of_a_different_page_is_rejected():
    e, lab = _lab_entry()
    lab["archived_url"] = WB + "https://example.com/some-other-page"
    errors = validate.validate_entry(e)
    assert any("sources" in x and "archived_url" in x for x in errors)


def test_snapshot_must_be_a_wayback_url_with_14_digit_timestamp():
    for bad in ("https://archive.ph/abc123",
                "https://web.archive.org/web/2026/{u}",
                "http://web.archive.org/web/20260101120000/{u}",
                "https://web.archive.org/web/20260101120000*/{u}",
                None, ""):
        e, lab = _lab_entry()
        lab["archived_url"] = bad.format(u=lab["url"]) if bad else bad
        assert validate.validate_entry(e), bad


def test_provenance_snapshot_must_match_source_url():
    e = _valid_entry()
    prov = e["benchmarks"][0]["provenance"]
    prov["archived_url"] = WB + prov["source_url"]
    assert validate.validate_entry(e) == []
    prov["archived_url"] = WB + "https://example.com/elsewhere"
    assert any("provenance.archived_url" in x for x in validate.validate_entry(e))
    prov["archived_url"] = "https://example.com/" + prov["source_url"]
    assert any("provenance.archived_url" in x for x in validate.validate_entry(e))


def _with_link(e, artifact="system_card", url="https://cdn.example.com/card.pdf"):
    e["disclosure_links"][artifact] = url
    return url


def test_disclosure_snapshot_validates_and_must_match_its_link():
    e = _valid_entry()
    url = _with_link(e)
    e["disclosure_archived"] = {"system_card": WB + url}
    assert validate.validate_entry(e) == []
    e["disclosure_archived"] = {"system_card": WB + "https://cdn.example.com/x.pdf"}
    assert any("disclosure_archived.system_card" in x
               for x in validate.validate_entry(e))


def test_disclosure_snapshot_refused_for_absent_link_or_unknown_artifact():
    e = _valid_entry()
    e["disclosure_links"]["model_card"] = validate.NOT_DISCLOSED
    e["disclosure_archived"] = {"model_card": WB + "https://example.com/card"}
    assert any("not a URL" in x for x in validate.validate_entry(e))
    e = _valid_entry()
    url = _with_link(e)
    e["disclosure_archived"] = {"blog": WB + url}
    assert any("unknown artifact" in x for x in validate.validate_entry(e))
    e["disclosure_archived"] = [WB + url]
    assert any("must be an object" in x for x in validate.validate_entry(e))


# ------------------------------------------------------------ collection / map

def _record():
    e = _valid_entry()
    _with_link(e)
    return [e]


def test_collect_urls_takes_lab_urls_and_skips_epoch():
    e = _record()[0]
    urls = archive.collect_urls([e])
    assert "https://cdn.example.com/card.pdf" in urls
    assert not any(u.startswith("https://epoch.ai/") for u in urls)
    for s in e["sources"]:
        if s["kind"] in archive.LAB_SOURCE_KINDS:
            assert urls[s["url"]] <= s["retrieval_date"]
    for b in e["benchmarks"]:
        p = b["provenance"]
        assert (p["source_url"] in urls) == (p["source_class"] == "LAB_REPORTED")


def test_apply_map_writes_fields_and_drops_stale_disclosure_snapshots():
    entries = _record()
    urls = archive.collect_urls(entries)
    amap = {u: {"archived_url": WB + u, "via": "existing"} for u in urls}
    assert archive.apply_map(entries, amap=amap) == 1
    e = entries[0]
    assert validate.validate_entry(e) == []
    for s in e["sources"]:
        assert ("archived_url" in s) == (s["url"] in urls)
    assert e["disclosure_archived"]["system_card"].endswith("card.pdf")
    assert archive.count_unarchived(entries) == 0
    assert archive.warning_line(entries) == ""
    # Idempotent.
    assert archive.apply_map(entries, amap=amap) == 0
    # The link is withdrawn: its snapshot goes with it, entry stays valid.
    e["disclosure_links"]["system_card"] = validate.NOT_RESEARCHED
    archive.apply_map(entries, amap=amap)
    assert "system_card" not in e.get("disclosure_archived", {})
    assert validate.validate_entry(e) == []
    # With no URL links left, the block itself goes.
    for a in validate.DISCLOSURE_ARTIFACTS:
        e["disclosure_links"][a] = validate.NOT_RESEARCHED
    archive.apply_map(entries, amap=amap)
    assert "disclosure_archived" not in e
    assert validate.validate_entry(e) == []


def test_map_failure_records_apply_nothing():
    entries = _record()
    urls = archive.collect_urls(entries)
    amap = {u: {"archived_url": None, "reason": "save returned HTTP 520"}
            for u in urls}
    assert archive.apply_map(entries, amap=amap) == 0


def test_count_unarchived_and_ci_warning():
    entries = _record()
    n = len(archive.collect_urls(entries))
    assert n >= 2
    assert archive.count_unarchived(entries) == n
    line = archive.warning_line(entries)
    assert line.startswith("::warning")
    assert f"{n} of {n} lab source URLs" in line
    first = sorted(archive.collect_urls(entries))[0]
    archive.apply_map(entries, amap={first: {"archived_url": WB + first}})
    assert archive.count_unarchived(entries) == n - 1


def test_ci_prints_the_archive_warning_without_failing():
    path = os.path.join(os.path.dirname(__file__), "..", "..", ".github",
                        "workflows", "ci.yml")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    start = text.index("- name: Archive snapshot coverage")
    step = text[start:]
    assert "python -m pipeline.archive --report" in step
    # A warning, never a gate.
    assert "continue-on-error: true" in step.split("\n      - ")[0]


# ------------------------------------------------------------ network client

class _Resp:
    def __init__(self, status=200, payload=None, headers=None, url=""):
        self.status_code = status
        self._payload = payload
        self.headers = headers or {}
        self.url = url

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


class _Session:
    """Scripted archive.org. Records every request; refuses any host but
    archive.org so a test can never reach the network by accident."""

    def __init__(self, avail=None, cdx=None, saves=()):
        self.avail = avail
        self.cdx = cdx
        self.saves = list(saves)
        self.calls = []

    def get(self, url, params=None, timeout=None, allow_redirects=True):
        assert url.startswith(("https://archive.org/", "https://web.archive.org/"))
        self.calls.append((url, params))
        if url == archive.AVAILABILITY_API:
            snap = self.avail
            return _Resp(payload={"archived_snapshots":
                                  {"closest": snap} if snap else {}})
        if url == archive.CDX_API:
            return _Resp(payload=self.cdx or [])
        nxt = self.saves.pop(0)
        if isinstance(nxt, Exception):
            raise nxt
        return nxt


class _Clock:
    def __init__(self):
        self.t = 0.0
        self.slept = []

    def __call__(self):
        return self.t

    def sleep(self, s):
        self.slept.append(s)
        self.t += s


def _archiver(session, clock=None):
    clock = clock or _Clock()
    return archive.Archiver(session=session, sleep=clock.sleep, clock=clock,
                            retry_wait=30, lookup_interval=0), clock


URL = "https://openai.com/index/gpt-6/"


def test_existing_snapshot_closest_to_retrieval_date_is_used_without_saving():
    s = _Session(avail={"available": True, "timestamp": "20260716093000",
                        "status": "200",
                        "url": "http://web.archive.org/web/20260716093000/https://openai.com/index/gpt-6"})
    a, _ = _archiver(s)
    rec = a.archive(URL, "2026-07-16")
    assert rec == {"archived_url": "https://web.archive.org/web/20260716093000/" + URL,
                   "via": "existing"}
    assert s.calls[0][1]["timestamp"] == "20260716"
    assert not any("/save/" in c[0] for c in s.calls)


def test_error_page_snapshot_is_not_used():
    s = _Session(avail={"available": True, "timestamp": "20260716093000",
                        "status": "404"},
                 saves=[_Resp(302, headers={"Location": "https://web.archive.org/web/20261019000000/" + URL})])
    a, _ = _archiver(s)
    assert a.archive(URL, "2026-07-16")["via"] == "saved"


def test_cdx_answers_when_availability_misses():
    s = _Session(cdx=[["timestamp", "statuscode"], ["20260801000000", "200"]])
    a, _ = _archiver(s)
    rec = a.archive(URL, "2026-07-16")
    assert rec["via"] == "existing"
    assert rec["archived_url"].startswith("https://web.archive.org/web/20260801000000/")


def test_availability_refusals_trip_to_cdx_only():
    class Limited(_Session):
        def get(self, url, **kw):
            if url == archive.AVAILABILITY_API:
                self.calls.append((url, kw.get("params")))
                return _Resp(429)
            return super().get(url, **kw)
    s = Limited(cdx=[["timestamp", "statuscode"], ["20260801000000", "200"]])
    a, _ = _archiver(s)
    for i in range(archive.AVAILABILITY_TRIP + 2):
        assert a.archive(f"https://a.example/{i}", "2026-07-16")["via"] == "existing"
    avail_calls = sum(1 for c in s.calls if c[0] == archive.AVAILABILITY_API)
    assert a.availability_down
    assert avail_calls == archive.AVAILABILITY_TRIP * a.lookup_tries


def test_save_reads_snapshot_from_redirect_or_content_location():
    for headers in ({"Location": "https://web.archive.org/web/20261019101010/" + URL},
                    {"Content-Location": "/web/20261019101010/" + URL}):
        s = _Session(saves=[_Resp(200 if "Content-Location" in headers else 302,
                                  headers=headers)])
        a, _ = _archiver(s)
        rec = a.archive(URL, "2026-07-16")
        assert rec == {"archived_url": "https://web.archive.org/web/20261019101010/" + URL,
                       "via": "saved"}
        assert any(c[0] == archive.SAVE_ENDPOINT + URL for c in s.calls)


def test_save_retries_once_on_429_then_succeeds():
    s = _Session(saves=[_Resp(429),
                        _Resp(302, headers={"Location": "/web/20261019101010/" + URL})])
    a, clock = _archiver(s)
    assert a.archive(URL)["via"] == "saved"
    assert 30 in clock.slept


def test_save_gives_up_after_one_retry_with_a_reason():
    s = _Session(saves=[_Resp(503), _Resp(520), _Resp(500)])
    a, _ = _archiver(s)
    rec = a.archive(URL)
    assert rec == {"archived_url": None, "reason": "save returned HTTP 520"}
    assert sum(1 for c in s.calls if "/save/" in c[0]) == 2


def test_network_errors_never_raise():
    s = _Session(saves=[ConnectionError("down"), ConnectionError("down")])
    a, _ = _archiver(s)
    rec = a.archive(URL)
    assert rec["archived_url"] is None and "network error" in rec["reason"]


def test_saves_are_paced_at_most_one_per_ten_seconds():
    loc = {"Location": "/web/20261019101010/x"}
    s = _Session(saves=[_Resp(302, headers=loc) for _ in range(3)])
    a, clock = _archiver(s)
    times = []
    orig = s.get

    def timed(url, **kw):
        if "/save/" in url:
            times.append(clock.t)
        return orig(url, **kw)
    s.get = timed
    for u in ("https://a.example/1", "https://a.example/2", "https://a.example/3"):
        a.save(u)
    assert all(b - a_ >= 10 for a_, b in zip(times, times[1:]))


def test_archive_urls_is_incremental():
    s = _Session(avail={"available": True, "timestamp": "20260716093000",
                        "status": "200"})
    a, _ = _archiver(s)
    amap = {"https://done.example/": {"archived_url": WB + "https://done.example/"},
            "https://failed.example/": {"archived_url": None, "reason": "x"}}
    urls = {"https://done.example/": "2026-01-01",
            "https://failed.example/": "2026-01-01",
            "https://new.example/": "2026-01-01"}
    archive.archive_urls(urls, amap, a)
    asked = {c[1]["url"] for c in s.calls}
    assert asked == {"https://new.example/"}
    archive.archive_urls(urls, amap, a, retry_failed=True)
    assert amap["https://failed.example/"]["via"] == "existing"


# ------------------------------------------------------------ promote / rebuild

def test_promote_records_archive_links_for_new_entry(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate())
    s = _Session(avail={"available": True, "timestamp": "20260716093000",
                        "status": "200"})
    a, _ = _archiver(s)
    report = promote.promote(RUN_DATE, root=root, archive_urls=True, archiver=a)
    assert report["problems"] == []
    e = {x["id"]: x for x in store.read_entries(root=root)}["openai--gpt-6"]
    assert validate.validate_entry(e) == []
    assert e["sources"][0]["archived_url"] == \
        "https://web.archive.org/web/20260716093000/https://openai.com/index/gpt-6/"
    assert e["benchmarks"][0]["provenance"]["archived_url"].endswith("/gpt-6/")
    assert e["disclosure_archived"]["system_card"].endswith("gpt-6.pdf")
    amap = archive.load_map(root)
    assert "https://openai.com/index/gpt-6/" in amap
    assert store.check_manifest(root=root) == []


def test_promote_survives_archive_org_being_down(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate())

    class Down:
        def get(self, *a, **k):
            raise ConnectionError("archive.org unreachable")
    a, _ = _archiver(Down())
    report = promote.promote(RUN_DATE, root=root, archive_urls=True, archiver=a)
    assert report["problems"] == []
    assert report["promoted"][0]["entry"] == "openai--gpt-6"
    e = {x["id"]: x for x in store.read_entries(root=root)}["openai--gpt-6"]
    assert "archived_url" not in e["sources"][0]
    reasons = {r["reason"] for r in archive.load_map(root).values()}
    assert reasons and all(r for r in reasons)


def test_promote_makes_no_network_calls_by_default(tmp_path):
    root = str(tmp_path)
    _seed_entries(root)
    _write_candidate(root, _candidate())
    report = promote.promote(RUN_DATE, root=root)
    assert report["archive"] is None
    assert not os.path.exists(os.path.join(root, archive.MAP_PATH))


def test_rebuild_steps_reapply_the_map(tmp_path):
    """backfill replaces the record wholesale; apply_disclosures and
    apply_lab_numbers re-add links and numbers. Each must carry the
    archive snapshot from content/archive_map.json."""
    from pipeline import apply_disclosures, apply_lab_numbers
    root = str(tmp_path)
    seeded = _seed_entries(root)
    eid = seeded[0]["id"]
    card = "https://openai.com/index/gpt-5-5-system-card/"
    lab = "https://openai.com/index/introducing-gpt-5-5/"
    archive.save_map({card: {"archived_url": WB + card, "via": "existing"},
                      lab: {"archived_url": WB + lab, "via": "saved"}}, root)
    os.makedirs(os.path.join(root, "content", "disclosure_links"))
    with open(os.path.join(root, "content", "disclosure_links", "openai.json"),
              "w", encoding="utf-8") as f:
        json.dump({"rows": [{"entry_id": eid, "status": "APPROVED",
                             "system_card": card}]}, f)
    os.makedirs(os.path.join(root, "content", "lab_numbers"))
    with open(os.path.join(root, "content", "lab_numbers", "openai.json"),
              "w", encoding="utf-8") as f:
        json.dump({"rows": [{"entry_id": eid, "status": "APPROVED",
                             "benchmark": "gpqa-diamond", "value": 90.1,
                             "source_url": lab,
                             "retrieval_date": "2026-07-16"}]}, f)
    assert apply_disclosures.apply(root=root, run_date=RUN_DATE)["problems"] == []
    assert apply_lab_numbers.apply(root=root, run_date=RUN_DATE)["problems"] == []
    e = store.read_entries(root=root)[0]
    assert e["disclosure_archived"] == {"system_card": WB + card}
    lab_num = next(b for b in e["benchmarks"]
                   if b["provenance"]["source_class"] == "LAB_REPORTED")
    assert lab_num["provenance"]["archived_url"] == WB + lab
    assert validate.validate_entry(e) == []


def test_backfill_reapplies_the_map_before_writing():
    import inspect
    from pipeline import backfill
    src = inspect.getsource(backfill.main)
    assert src.index("archive.apply_map(") < src.index("store.write_entries(")


def test_cli_apply_and_report(tmp_path, capsys):
    root = str(tmp_path)
    seeded = copy.deepcopy(_seed_entries(root))
    seeded[0]["sources"].append({"kind": "lab_announcement",
                                 "url": "https://openai.com/index/x/",
                                 "retrieval_date": "2026-07-16"})
    store.write_entries(seeded, root=root)
    assert archive.main(["--root", root, "--report"]) == 0
    assert "::warning" in capsys.readouterr().out
    archive.save_map({"https://openai.com/index/x/":
                      {"archived_url": WB + "https://openai.com/index/x/"}}, root)
    assert archive.main(["--root", root, "--apply"]) == 0
    capsys.readouterr()
    assert archive.main(["--root", root, "--report"]) == 0
    assert "::warning" not in capsys.readouterr().out
