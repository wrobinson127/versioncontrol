"""Parameter counts reported by others.

Epoch AI records some parameter counts from reports by others, and its
"Parameters notes" column says so. pipeline/backfill.py labels those counts
third_party, keeps the number and Epoch's note in the entry, and every
parameter finding leaves them out. These tests hold the classifier to the
named cases (the notes are quoted from Epoch AI's 2026-08-24 capture), the
validator to the field's rules, and the published record and story to the
exclusion.
"""
import gzip
import json
import pathlib
import re

import pytest

from pipeline import backfill, site_files, validate
from pipeline.tests.test_validate import _valid_entry

ROOT = pathlib.Path(__file__).resolve().parents[2]

THIRD_PARTY = {
    "GPT-4 1.8T, SemiAnalysis": "Rumored to be 1.8T parameter MoE with 280B activated on the forward pass, per "
                                "https://www.semianalysis.com/p/gpt-4-architecture-infrastructure.",
    "GPT-3.5 20B, CodeFusion": "20B parameters according to Table 1 in Microsoft's CODEFUSION paper: "
                               "https://arxiv.org/pdf/2310.17680.pdf",
    "Grok 4 3T, rumored": "Rumored to be 2.4T params (https://x.com/kalomaze/status/1942996555088134592)",
    "Titan 200B, Import AI": "200B dense model https://importai.substack.com/p/import-ai-365-wmd-benchmark-amazon",
    "Grok 4.20, post on X": "\"This is just our V8 small foundation model, so 500B params\" from Elon Musk on X "
                            "(https://x.com/elonmusk/status/2023840935285760142?s=20)  Likely sparse",
    "Grok 4.3 Beta, post on X": "\"Supplemental training has been added to 4.3. Grok 4.4 will be twice the size (1T)\" "
                                "from Elon (https://x.com/elonmusk/status/2045590599206875216?s=20) implies 500B parameters",
    "Grok 4.5, CEO post on X": "SpaceXAI CEO Elon Musk stated on X that Grok 4.5 would have 1.5 trillion parameters, "
                               "presumably  meaning total parameters  https://x.com/elonmusk/status/2071184354756477041?s=20",
    "PaLM 2, leak": "Further details of model size and architecture are withheld from external publication. "
                    "However, the parameter count was leaked to CNBC",
    "an estimate": "Other sources estimate 1.76T with 220B per forward pass",
    "reportedly": "The model reportedly has 300B parameters",
    "speculative": "Speculative figure from a forum thread",
    "a tweet": "52B since at least March 2023: https://twitter.com/percyliang/status/1638236921754443776",
}

LAB = {
    "the lab's paper": "\"a sparse mixture-of-experts trained with 41B active and 675B total parameters.\"",
    "the lab's HF card": "Based on HF page: https://huggingface.co/zai-org/GLM-5.1",
    "the lab's blog": "\"Llama 4 Maverick models have 17B active parameters and 400B total parameters.\"  "
                      "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
    "a model card table": "Model card, table 1: https://github.com/facebookresearch/llama/blob/main/MODEL_CARD.md",
    "according to the lab's HF page": "According to huggingface.co/CohereLabs/aya-vision-32b.",
    "no note": "",
}


@pytest.mark.parametrize("case", sorted(THIRD_PARTY))
def test_reports_by_others_are_third_party(case):
    assert backfill.parameters_basis(THIRD_PARTY[case]) == "third_party", case


@pytest.mark.parametrize("case", sorted(LAB))
def test_the_labs_own_counts_are_lab(case):
    assert backfill.parameters_basis(LAB[case]) == "lab", case


def test_fields_keep_the_number_and_epochs_note():
    row = {"Parameters": "1.8e12", "Parameters notes": THIRD_PARTY["GPT-4 1.8T, SemiAnalysis"]}
    f = backfill._params_fields(row)
    assert f["parameters"] == 1.8e12
    assert f["parameters_basis"] == "third_party"
    assert "semianalysis" in f["parameters_note"]
    assert backfill._params_fields({"Parameters": "", "Parameters notes": "x"}) == {
        "parameters": "NOT_DISCLOSED", "parameters_basis": "NOT_DISCLOSED"}


def test_validator_holds_the_basis_to_the_count():
    e = _valid_entry()
    e["parameters"], e["parameters_basis"] = 7e9, "lab"
    assert validate.validate_entry(e) == []
    e["parameters_basis"] = "rumour"
    assert any("parameters_basis" in x for x in validate.validate_entry(e))
    e["parameters_basis"] = "third_party"
    assert any("parameters_note" in x for x in validate.validate_entry(e))
    e["parameters_note"] = "Rumored."
    assert validate.validate_entry(e) == []
    e["parameters"] = "NOT_DISCLOSED"
    assert any("parameters_basis" in x for x in validate.validate_entry(e))
    e1 = _valid_entry()
    assert e1["parameters"] == "NOT_DISCLOSED"
    e1["parameters_basis"] = "lab"
    assert any("parameters_basis" in x for x in validate.validate_entry(e1))
    e2 = _valid_entry()
    e2["parameters_note"] = "stray"
    assert any("parameters_note" in x for x in validate.validate_entry(e2))
    e3 = _valid_entry()
    del e3["parameters_basis"]
    assert any("parameters_basis" in x for x in validate.validate_entry(e3))


def _record():
    manifest = json.loads((ROOT / "data" / "manifest.json").read_text(encoding="utf-8"))
    out = {}
    for f in manifest["files"]:
        for e in json.loads(gzip.decompress((ROOT / f).read_bytes())):
            out[e["id"]] = e
    return out


def test_the_named_counts_are_marked_in_the_record():
    rec = _record()
    for eid in ("openai--gpt-4", "openai--gpt-3.5-turbo", "xai--grok-4", "amazon--amazon-titan",
                "xai--grok-4.20", "xai--grok-4.3-beta", "xai--grok-4.5"):
        assert rec[eid]["parameters_basis"] == "third_party", eid
        assert isinstance(rec[eid]["parameters"], float), eid


def test_story_parameter_shares_leave_out_reports_by_others():
    rec = _record()
    story = (ROOT / "site" / "story.html").read_text(encoding="utf-8")
    m = re.search(r"In (\d{4}), (\d+) of (\d+) releases had a parameter count on record", story)
    assert m, "the story states its parameter share"
    y, k, n = m.group(1), int(m.group(2)), int(m.group(3))
    rel = [e for e in rec.values() if e["entry_type"] == "release" and e["date"][:4] == y]
    assert n == len(rel)
    assert k == sum(1 for e in rel if e["parameters_basis"] == "lab")
    assert k < sum(1 for e in rel if isinstance(e["parameters"], float)), \
        "the record has third-party counts that year, so leaving them out must lower the count"


def test_csv_carries_the_basis():
    assert "parameters_basis" in site_files.RELEASE_COLUMNS
