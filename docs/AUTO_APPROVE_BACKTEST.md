# Auto-approve backtest

2026-11-09. Ruling 2026-11-09 (Walker): design a rule under which a
candidate could publish without Walker, backtest it on his past decisions,
and do not switch it on. **It is not switched on.** Nothing in the nightly
or in `promote` reads this rule. Until Walker decides, every candidate waits
for his yes on the weekly list (`docs/WEEKLY_REVIEW.md`), and claim-bearing
text never auto-publishes under any version of the rule.

## Result in one paragraph

Two versions were tested on 160 decided candidates, 43 Walker approved and
117 he rejected, each as the nightly first wrote it (before any triage
edit), since that is what an auto-approve rule would see. **AA-1**, the rule
as first written, would have published 7 of his 43 approvals and 2 of his
117 rejections. **AA-2**, AA-1 with its independent-signal clause tightened,
would have published 5 of his 43 approvals and none of his 117 rejections,
and in all 5 it copies name, date and availability exactly as Walker
published them. AA-2 was tightened after AA-1's results were seen, so its
clean score is measured on the same decisions it was adjusted on. It needs a
run on new candidates before it can be trusted (see "Next step").

## The rule

What it may publish: four copied fields (model name, org, release date,
availability class) and the source URLs. Never a summary, benchmark number,
parameter count or disclosure finding: those wait for the weekly list
whether or not the rule fires.

**AA-1.** A candidate publishes without Walker only when all of these hold:

1. A draft exists and was read from the lab's own web page (a domain in
   the org's `lab_domains`; not Hugging Face, not an aggregator), and it
   carries no review note.
2. That page gives the name, the release date, and an availability class in
   the schema's three public classes.
3. At least one independent signal (an Epoch row, a Hugging Face repo or an
   API catalog listing) names the same model, compared by base slug.
4. That signal's date is within `DATE_TOLERANCE_DAYS` (3) of the lab
   page's date.

**AA-2** changes clause 3:

- 3'. The independent signal must be an API catalog listing (OpenRouter) or
  a Hugging Face repo. An Epoch row does not count. For a candidate
  detected only through Epoch, the lab page was found through the Epoch
  row's own link, so
  the two are one chain rather than two confirmations, and Epoch's date is
  usually copied from that same page. Epoch also lists unreleased,
  image-only and cyber-only models, which is where AA-1's two wrong
  publishes came from.
- 3''. Names must match exactly (same slug), not by base slug, so a sized or
  suffixed name ("DiffusionGemma 26B-A4B") is not merged into a shorter one.

Hugging Face is never the lab page in either version, though
`config.is_lab_url` accepts a first-party repo. Of the 31 decided candidates
whose draft was read from a Hugging Face repo, Walker rejected 25:
quantizations, adapters, research repos built on other labs' models, image
and time-series models. A repo under the lab's handle is a weak signal that
a release is in scope.

## Results

Each candidate as the nightly first wrote it:

| | AA-1 | AA-2 |
|---|---|---|
| Walker's approvals published (of 43) | 7 | 5 |
| of those, copied fields identical to the published entry | 5 | 5 |
| Walker's rejections published (of 117) | **2** | **0** |
| Candidates put on the record by the 2026-08-24 Epoch refresh, published (of 25) | 8 | 0 |
| of those, copied fields identical to the record | 5 | 0 |
| This week's queue, published (of 8) | 1 (QVQ-Max) | 0 |

Read as a filter, AA-2 is precise and narrow: it publishes about one in
nine of what Walker approves and none of what he rejects. Its 5 are
frontier releases that reached an API catalog the day the lab announced
them: Claude Haiku 5.5, Claude Sonnet 5.5, Gemini 3.8 Flash, Muse Spark Open
and Grok 4.7.

Tested instead on each candidate's last version (after triage edits), the
counts rise to 10 approvals for AA-1 and 7 for AA-2, with rejections
unchanged at 2 and 0. The difference is three candidates fixed by hand at
the 2026-10-30 triage before approval: Rerank 3.5 had no availability
class; Kimi K3.1 Pro and GPT-6.1 Terra had no date, and Kimi K3.1 Pro's
draft said open_weights where Walker published public_api. The rule held
all three as the nightly wrote them, which is the safe outcome.

## Disagreements

### Rejections the rule would have published (AA-1 only)

| Candidate | Signals | Walker's reason |
|---|---|---|
| openai--gpt-5.4-cyber | OpenAI page + Epoch row | Epoch accessibility: Unreleased. Trusted-access program, not publicly usable. The draft said public_api. |
| openai--gpt-image-1.5 | OpenAI page + Epoch row | Image generation; no language output. Precedent openai--chatgpt-images-2.5. |

Neither clause of the rule can see scope: the candidate does not carry
Epoch's domain or accessibility columns. AA-2 holds both because the only
independent signal was an Epoch row.

### Approvals published with fields that differ from Walker's entry (AA-1)

| Candidate | Rule would publish | Walker published |
|---|---|---|
| google-deepmind--diffusiongemma-a4b | DiffusionGemma (id google-deepmind--diffusiongemma) | DiffusionGemma 26B-A4B (id ...-26b-a4b): a different entry id |
| google-deepmind--gemini-robotics-er-2 | Gemini Robotics ER 2 | Gemini Robotics-ER 2 |

In the Epoch-refresh group, AA-1 would also have published
cohere--command-a-plus as public_api (the record has open_weights),
openai--gpt-5.6-cyber as "GPT-5.6-Cyber", 2026-08-10, public_service (the
record has "GPT-5.6 Cyber", 2026-08-11, public_api), and xai--grok-build-0.1
as "grok-build-0.1" (the record has "Grok Build 0.1").

### Approvals the rule would have held

Every row is a candidate Walker approved. Holding one costs a week's wait,
not a wrong entry.

| Candidate | Signals | AA-1 | AA-2 |
|---|---|---|---|
| alibaba-qwen--qwen3.7-plus | epoch | hold: no draft | hold: no draft |
| alibaba-qwen--qwen3.8-flash | openrouter | hold: draft not from a lab page | same |
| alibaba-qwen--qwen3.8-flash-next | hf_orgs | hold: no draft | same |
| alibaba-qwen--qwen3.8-max-0902 | openrouter | hold: draft not from a lab page | same |
| alibaba-qwen--qwen3.8-omni-flash | openrouter | hold: draft not from a lab page | same |
| anthropic--claude-fable-5.1 | openrouter | hold: draft not from a lab page | same |
| anthropic--claude-opus-5.5 | openrouter | hold: draft not from a lab page | same |
| cohere--embed-5 | lab page | hold: no independent signal | hold: no API catalog or HF signal |
| cohere--north-micro-vision-instruct | hf_orgs | hold: draft not from a lab page | same |
| cohere--rerank-3.5 | epoch | hold: draft gives no availability class | same |
| cohere--rerank-5 | lab page | hold: no independent signal | hold: no API catalog or HF signal |
| cohere--tiny-aya-base-32k | hf_orgs | hold: draft not from a lab page | same |
| deepseek--deepseek-v4-flash-vision-exp | openrouter | hold: draft not from a lab page | same |
| deepseek--deepseek-v4-pro-0813 | hf_orgs, openrouter | hold: draft not from a lab page | same |
| deepseek--deepseek-v4.1-flash | hf_orgs, openrouter | hold: draft not from a lab page | same |
| deepseek--deepseek-v4.1-flash-1017 | hf_orgs, openrouter | hold: draft not from a lab page | same |
| google-deepmind--diffusiongemma-a4b | epoch | publish (wrong id, above) | hold: no API catalog or HF signal |
| google-deepmind--gemini-3-deep-think | epoch | hold: Epoch date disagrees with the lab page | hold: no API catalog or HF signal |
| google-deepmind--gemini-3.5-flash-lite | epoch | hold: draft names three models in one string | hold: no API catalog or HF signal |
| google-deepmind--gemini-4-argon | openrouter | hold: draft not from a lab page | same |
| google-deepmind--gemini-robotics-er-2 | epoch | publish (name differs, above) | hold: no API catalog or HF signal |
| meta--muse-spark-1.3 | openrouter | hold: draft not from a lab page | same |
| meta--muse-wonder | openrouter | hold: draft not from a lab page | same |
| mistral--codestral-25.01 | lab page | hold: no draft | same |
| mistral--codestral-25.08 | lab page | hold: no independent signal | hold: no API catalog or HF signal |
| mistral--leanstral-1.5 | lab page | hold: no draft | same |
| mistral--mistral-large-4 | lab page | hold: no independent signal | hold: no API catalog or HF signal |
| moonshot--kimi-k3.1-pro | epoch, openrouter | hold: draft gives no date | same |
| openai--chatgpt | manual | hold: no independent signal | hold: no API catalog or HF signal |
| openai--gpt-5.6-luna | epoch | hold: no draft | same |
| openai--gpt-5.6-terra | epoch | hold: no draft | same |
| openai--gpt-6-astra | epoch | hold: no draft | same |
| openai--gpt-6-luna | openrouter | hold: draft not from a lab page | same |
| openai--gpt-6-sol | openrouter | hold: draft not from a lab page | same |
| openai--gpt-6.1-sol | epoch, openrouter | hold: catalog date disagrees with the lab page | same |
| openai--gpt-6.1-terra | epoch, openrouter | hold: draft gives no date | same |
| openai--o3-pro | epoch | hold: no draft | same |
| zai--glm-5.3-flash | hf_orgs, openrouter | hold: draft not from a lab page | same |

The largest group (17) is candidates whose nightly draft was read from an
OpenRouter listing or a Hugging Face repo. In all 17, the entry Walker
published cites the lab's own page, found by hand before approval. A
detector that looked for the lab's page when the first signal is a catalog
listing would move most of these into the rule's reach. That is a separate
change, not part of this test.

## Data and method

- **Candidates.** Every `data/pending/<id>.json` ever committed, recovered
  from git history (all refs, `--full-history`) of this repository and the
  pre-cutover development repository archived in the portfolio hub. 193
  distinct candidates. The headline test uses the first committed version
  of each, the nightly's output before any triage edit; the last version,
  the state Walker decided on, is the secondary check.
- **Walker's decisions.** Rejected: the id is in `data/pending/rejected.json`
  (117 records; all 117 have a recovered candidate file). Approved: an
  `"approved": true` flag in any version, or an entry on the record with
  origin `nightly-pipeline` or `manual` that the candidate maps to by entry
  id, candidate id or announcement URL (43). The brief cited 107
  rejections; the file holds 117 as of this run.
- **Set apart.** 25 candidates were removed from the queue on 2026-08-24
  because the Epoch refresh put them on the record ("Reap 26 queued
  candidates"); they are reported separately, since Walker approved the
  refresh, not each candidate. 8 are still pending. Three nightly or manual
  entries have no surviving candidate file (google-deepmind--embeddinggemma-2,
  meta--muse-wonder-full, mistral--mistral-large-4-oct-2026) and are not in
  the test.
- **Field check.** For each candidate the rule would publish, the four
  copied fields were compared with the published entry.
- **Hand edits.** Of the candidates either rule publishes on their last
  version, three were edited by hand at triage (Rerank 3.5, Kimi K3.1 Pro,
  GPT-6.1 Terra; see Results). The rest are identical in their first and
  last versions.

Reproduce (the development repository path is local to Walker's machine):

```
python -m tools.auto_approve_backtest collect cands.json <dev-repo> . --first
python -m tools.auto_approve_backtest run cands.json --variant AA-1
python -m tools.auto_approve_backtest run cands.json --variant AA-2
```

## Next step (Walker's decision)

Recommended: run AA-2 in shadow. Each Monday list gains a column saying
what AA-2 would have done, and Walker still decides every row. After about
eight weeks, compare: if AA-2 published nothing Walker rejected and copied
every field exactly, switching it on for those four fields is a decision
with out-of-sample evidence behind it. Switching it on now would rest on
five in-sample cases.
