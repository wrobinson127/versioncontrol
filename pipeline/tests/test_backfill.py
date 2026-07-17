"""Backfill tests (P2): D3 inclusion, variant clustering, duplicate-listing
merge, hub-slug normalization, and revision-aware number attachment.

Synthetic rows mirror real Epoch CSV shapes observed at Phase 0."""
from pipeline import backfill, lint_voice, validate


def _row(model, org="OpenAI", date="2025-08-07", access="API access",
         domain="Language", link="", params=""):
    return {
        "Model": model, "Organization": org, "Publication date": date,
        "Model accessibility": access, "Domain": domain, "Link": link,
        "Parameters": params, "Accessibility notes": "",
    }


# ---------------------------------------------------------------- D3 filter

def test_d3_refuses_each_exclusion_class():
    rows = [
        _row("SomeModel", org="NVIDIA"),                          # non-registry
        _row("OldModel", date="2022-11-29"),                      # pre-window
        _row("HiddenModel", access="Unreleased"),                 # not usable
        _row("VisionModel", domain="Vision,Image generation"),    # non-language
        _row("GPT-5"),                                            # kept
    ]
    kept, refusals = backfill.d3_filter(rows)
    assert [r["Model"] for r in kept] == ["GPT-5"]
    assert refusals == {"non_registry_org": 1, "outside_window": 1,
                        "not_publicly_usable": 1, "non_language_domain": 1}


def test_d3_window_boundary_inclusive():
    kept, _ = backfill.d3_filter([_row("ChatGPT", date="2022-11-30")])
    assert len(kept) == 1


# ------------------------------------------------------------- clustering

def test_size_ladder_clusters_to_one_event():
    link = "https://ai.meta.com/llama2"
    rows, _ = backfill.d3_filter([
        _row("Llama 2-70B", org="Meta AI", date="2023-07-18",
             access="Open weights (restricted use)", link=link, params="70000000000"),
        _row("Llama 2-13B", org="Meta AI", date="2023-07-18",
             access="Open weights (restricted use)", link=link, params="13000000000"),
        _row("Llama 2-7B", org="Meta AI", date="2023-07-18",
             access="Open weights (restricted use)", link=link, params="7000000000"),
    ])
    clusters = backfill.cluster_variants(rows)
    assert len(clusters) == 1
    flagship = backfill.pick_flagship(clusters[0])
    assert flagship["Model"] == "Llama 2-70B"


def test_duplicate_listing_merges_keeping_earliest_date():
    # Observed with GLM-5: an announcement-dated row and a paper-dated row.
    rows, _ = backfill.d3_filter([
        _row("GLM-5", org="Z.ai (Zhipu AI)", date="2026-02-11",
             access="Open weights (unrestricted)", link="https://z.ai/blog/glm-5"),
        _row("GLM-5", org="Z.ai (Zhipu AI)", date="2026-02-17",
             access="Open weights (unrestricted)", link="https://arxiv.org/pdf/2602.15763"),
    ])
    clusters = backfill.cluster_variants(rows)
    assert len(clusters) == 1
    entries, _, problems = backfill.build_entries([
        {"Model": "GLM-5", "Organization": "Z.ai (Zhipu AI)",
         "Publication date": "2026-02-11", "Model accessibility": "Open weights (unrestricted)",
         "Domain": "Language", "Link": "https://z.ai/blog/glm-5", "Parameters": "",
         "Accessibility notes": ""},
        {"Model": "GLM-5", "Organization": "Z.ai (Zhipu AI)",
         "Publication date": "2026-02-17", "Model accessibility": "Open weights (unrestricted)",
         "Domain": "Language", "Link": "https://arxiv.org/pdf/2602.15763", "Parameters": "",
         "Accessibility notes": ""},
    ], [], "2026-07-16")
    assert problems == []
    assert len(entries) == 1
    assert entries[0]["date"] == "2026-02-11"
    urls = [s["url"] for s in entries[0]["sources"]]
    assert "https://z.ai/blog/glm-5" in urls
    assert "https://arxiv.org/pdf/2602.15763" in urls


def test_same_name_far_apart_stays_distinct():
    rows, _ = backfill.d3_filter([
        _row("Command R", org="Cohere", date="2024-03-11",
             link="https://cohere.com/blog/command-r"),
        _row("Command R", org="Cohere", date="2024-08-30",
             link="https://cohere.com/blog/command-r-refresh"),
    ])
    clusters = backfill.cluster_variants(rows)
    assert len(clusters) == 2


def test_plus_names_get_distinct_ids():
    assert validate.make_entry_id("cohere", "Command R") == "cohere--command-r"
    assert validate.make_entry_id("cohere", "Command R+") == "cohere--command-r-plus"


# ------------------------------------------------- hub slug normalization

def test_normalize_hub_slug_cases():
    cases = {
        "gpt-5-2025-08-07": ("gpt-5", "full"),
        "claude-opus-4-20250514": ("claude-opus-4", "full"),
        "DeepSeek-V3-0324": ("deepseek-v3", "short"),
        "mistral-large-2402": ("mistral-large", "short"),
        "llama-2-70b-chat-hf": ("llama-2-70b", None),
        "open-mixtral-8x7b": ("mixtral-8x7b", None),
        "DeepSeek-V3": ("deepseek-v3", None),
        "mistral-7b-instruct-v0.3": ("mistral-7b", None),
        "openai/gpt-oss-120b": ("gpt-oss-120b", None),
        "grok-3-beta": ("grok-3", None),
        "gemini-1.5-pro-001": ("gemini-1.5-pro", None),
        "qwen3.7-max_max": ("qwen3.7-max", None),  # _config split, -max kept
        "kimi-k2-thinking-turbo": ("kimi-k2-thinking-turbo", None),  # never stripped
    }
    for slug, (want_core, want_stamp) in cases.items():
        core, stamp = backfill.normalize_hub_slug(slug)
        assert core == want_core, f"{slug}: core {core!r} != {want_core!r}"
        got = None if stamp is None else stamp["kind"]
        assert got == want_stamp, f"{slug}: stamp {got!r} != {want_stamp!r}"


# ------------------------------------------------- revision-aware attach

def _mini_entries():
    common = dict(entry_type="release", org="openai",
                  availability_class="public_api", parameters="NOT_DISCLOSED",
                  summary="x", benchmarks=None, predecessor=None,
                  license_note=None, origin="backfill-epoch", retracted=False)
    e1 = {**common, "id": "openai--gpt-4o", "model_name": "GPT-4o",
          "date": "2024-05-13", "benchmarks": [],
          "disclosure_links": {}, "sources": []}
    e2 = {**common, "id": "openai--gpt-4o-nov-2024",
          "model_name": "GPT-4o (Nov 2024)", "entry_type": "revision",
          "date": "2024-11-20", "benchmarks": [],
          "disclosure_links": {}, "sources": []}
    return [e1, e2]


def _hub_row(slug, value=50.0, started_at="2026-07-01T00:00:00.000Z"):
    return {"org": "openai", "slug": slug, "benchmark": "gpqa-diamond",
            "benchmark_name": "GPQA Diamond", "benchmark_version": "diamond",
            "value": value, "started_at": started_at,
            "retrieval_date": "2026-07-16"}


def test_dated_snapshot_routes_to_revision_entry():
    entries = _mini_entries()
    backfill.attach_hub_numbers(entries, [
        _hub_row("gpt-4o-2024-05-13", 48.9),
        _hub_row("gpt-4o-2024-11-20", 47.9),
    ])
    assert entries[0]["benchmarks"][0]["value"] == 48.9
    assert entries[0]["benchmarks"][0]["configuration"] == "gpt-4o-2024-05-13"
    assert entries[1]["benchmarks"][0]["value"] == 47.9


def test_undated_slug_attaches_to_original_release():
    entries = _mini_entries()
    backfill.attach_hub_numbers(entries, [_hub_row("gpt-4o", 48.0)])
    assert entries[0]["benchmarks"] and not entries[1]["benchmarks"]


def test_variant_slug_never_lands_on_flagship():
    entries = _mini_entries()
    backfill.attach_hub_numbers(entries, [_hub_row("gpt-4o-mini-2024-07-18", 37.7)])
    assert entries[0]["benchmarks"] == [] and entries[1]["benchmarks"] == []


def test_far_stamp_attaches_nowhere():
    entries = _mini_entries()
    backfill.attach_hub_numbers(entries, [_hub_row("gpt-4o-2026-01-01", 60.0)])
    assert entries[0]["benchmarks"] == [] and entries[1]["benchmarks"] == []


def test_attached_number_carries_full_independent_provenance():
    entries = _mini_entries()
    backfill.attach_hub_numbers(entries, [_hub_row("gpt-4o", 48.0)])
    prov = entries[0]["benchmarks"][0]["provenance"]
    assert prov["source_class"] == "INDEPENDENT"
    for field in validate.PROVENANCE_FIELDS:
        assert prov.get(field), f"missing {field}"


def test_identical_slugs_resolve_to_most_recent_run():
    entries = _mini_entries()
    backfill.attach_hub_numbers(entries, [
        _hub_row("gpt-4o", 40.0, started_at="2026-01-01T00:00:00.000Z"),
        _hub_row("gpt-4o", 42.0, started_at="2026-06-01T00:00:00.000Z"),
    ])
    assert entries[0]["benchmarks"][0]["value"] == 42.0


# ------------------------------------- launch-vs-revision reclassification

def _epoch_row(model, date, link=""):
    return {"Model": model, "Organization": "OpenAI",
            "Publication date": date, "Model accessibility": "API access",
            "Domain": "Language", "Link": link, "Parameters": "",
            "Accessibility notes": ""}


def test_first_parenthetical_occurrence_is_a_release_named_base():
    # Epoch names the GPT-4 LAUNCH "GPT-4 (Mar 2023)"; the first occurrence
    # of a base name is the launch, not a silent snapshot (P2 review R2).
    entries, _, problems = backfill.build_entries([
        _epoch_row("GPT-4 (Mar 2023)", "2023-03-15", "https://arxiv.org/abs/2303.08774"),
        _epoch_row("GPT-4 (Jun 2023)", "2023-06-13", "https://arxiv.org/abs/2303.08774v3"),
    ], [], "2026-07-16")
    assert problems == []
    by_id = {e["id"]: e for e in entries}
    assert "openai--gpt-4" in by_id, sorted(by_id)
    launch = by_id["openai--gpt-4"]
    assert launch["entry_type"] == "release"
    assert launch["model_name"] == "GPT-4"
    assert launch["epoch_row_name"] == "GPT-4 (Mar 2023)"
    rev = by_id["openai--gpt-4-jun-2023"]
    assert rev["entry_type"] == "revision"
    assert rev["predecessor"] == "openai--gpt-4"


def test_revision_summary_never_denies_a_link_it_carries():
    # P2 review R1: revision prose must match the entry's own sources.
    entries, _, problems = backfill.build_entries([
        _epoch_row("GPT-4o", "2024-05-13", "https://openai.com/index/hello-gpt-4o/"),
        _epoch_row("GPT-4o (Nov 2024)", "2024-11-20",
                   "https://help.openai.com/en/articles/9624314-model-release-notes"),
        _epoch_row("GPT-4o (Jan 2025)", "2025-01-29", ""),
    ], [], "2026-07-16")
    assert problems == []
    by_id = {e["id"]: e for e in entries}
    with_link = by_id["openai--gpt-4o-nov-2024"]
    assert "documents it at the linked source" in with_link["summary"]
    without_link = by_id["openai--gpt-4o-jan-2025"]
    assert "no lab announcement link is recorded" in without_link["summary"]


# ---------------------------------------------------------------- summaries

def test_summaries_pass_voice_lint_for_every_shape():
    shapes = [
        ("release", "open_weights", "Open weights (unrestricted)", True),
        ("release", "open_weights", "Open weights (restricted use)", False),
        ("release", "open_weights", "Open weights (non-commercial)", False),
        ("release", "public_api", "API access", True),
        ("release", "public_service", "Hosted access (no API)", False),
        ("revision", "public_api", "API access", False),
    ]
    for entry_type, availability, access_raw, has_ind in shapes:
        text = backfill.build_summary("OpenAI", "GPT-5 (Mar 2026)", entry_type,
                                      availability, access_raw, has_ind)
        assert lint_voice.lint_text(text) == [], text
