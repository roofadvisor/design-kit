# Handoff — domain-governance gaps found by a live audit

**Date:** 2026-08-17 · **From:** an AR+AP (RoofAdvisor) session · **For:** the f4d-kit plugin-dev session

**This is evidence, not a design.** It records what a real repo turned out to need that the kit
has no slot for, with the file paths to go read. Every design decision below is deliberately left
open. Nothing here has been agreed, and nothing has been built.

## Provenance

A full `/project-audit` ran against `roofadvisor/AR-AP` @ `bb4ac30` on 2026-08-16, in
FRAMEWORK-absent mode. Report committed there at `docs/f4d-audit-2026-08-16.md` (branch
`docs/f4d-adoption-audit`, unpushed at time of writing). Baseline was green: 476 tests passing.

AR+AP is worth treating as a **worked example** rather than an outlier. It is a Python
accounting/reconciliation pipeline that independently grew a mature governance layer over ~3
months without the kit — a 341-line domain rulebook, fourteen stop-and-ask gates, three ownership
registries, eight runbooks, a 25-document plan tier. It is what a domain-heavy repo builds when
the framework does not offer these, which makes it a decent specification-by-example.

## Version note — check this first

- Installed plugin cache: **1.22.2**
- This repo: **1.23.8** (`CHANGELOG.md`), on branch `fix/a23-lock-sessionstart-event-mapping`

The audit ran against the installed 1.22.2. Anything below should be re-checked against 1.23.8
before it is trusted as a gap.

## Rule 0 status

`docs/BACKLOG.md` was grepped for: rulebook, domain rule, ownership registry, operations doc,
runbook, plan tier, end-user doc, handoff, session note, collaboration. **Zero hits.** None of
this is queued, so it is new territory rather than a duplicate of standing work.

One related artifact exists and is **stale**: a plan titled *"Collaboration discipline +
instruction-file sync — f4d-kit v1.11.0"* proposing `CB-01`–`CB-05`, `render_instructions.py`,
`check_instruction_honesty.py`, `check_claim.py`. It targets 1.11.0 and asserts A4 (resumable
interview) is open backlog marked DO FIRST — but `docs/BACKLOG.md:74` records
`A4 — ✅ built 1.11.0, acceptance proven 2026-08-11`. Its premise correction is out of date and
building on it as written would redo settled work. `templates/rules/collaboration.md` is still
absent, so the CB rule content itself never landed and may still be worth harvesting.

## Finding 1 — there is no enforcement level meaning "a human must decide"

**This is the headline.** The registry vocabulary in use today:

```
GATE 53 · TEST 36 · PROSE 31 · HOOK 21 · JUDGMENT 17 · LINT 4
```

Nothing expresses *stop and get a human decision before proceeding*. AR+AP built that concept
itself, in `docs/superpowers/reference/drift-control.md` — fourteen gates covering: PreCap/PostCap
column layout, DOP/commission/margin/capping formulas, source-packet folder rules, adding
dependencies, adding a module when an aligned one exists, committing or moving raw files,
interpreting unclear historical report columns, treating a historical report value as financially
correct without source evidence, using AI/LLM output as accounting truth, Google Drive routing,
Render deployment config, Postgres schema ownership, tolerance/product-family changes after review.

Under the current vocabulary every one of those is `PROSE` — which by the kit's own doctrine makes
them memos.

Worth noting for the design session: unlike most `JUDGMENT` rules this one looks **mechanisable**.
A gate could fail when a diff touches declared-sensitive paths without a linked decision record.
Whether that is the right shape is open; that it is not obviously unmechanisable is the point.

## Finding 2 — the documentation taxonomy is thinner than a domain repo needs

The kit ships `ADR.template.md`, `SPEC.template.md`, and six process docs (CADENCE, DEFINITION,
ENFORCEMENT, LIFECYCLE, PR.template, TEST_STRATEGY). AR+AP needed six tiers with no kit slot:

| Tier | AR+AP exemplar | Size | What it holds |
|---|---|---|---|
| Domain rulebook | `docs/superpowers/reference/system-rules.md` | 341 lines | business/accounting rules, plain language, source of truth over code |
| Stop-and-ask gates | `docs/superpowers/reference/drift-control.md` | — | when development halts for a human decision (see Finding 1) |
| Ownership registries | `docs/superpowers/architecture/{codebase-matrix,function-registry,endpoint-matrix}.md` | 32 / 170 / 42 | which file, function, endpoint owns what, with a same-change update rule |
| Operations runbooks | `docs/operations/*.md` | 8 docs | weekly close, capping validation, Render environment, reviewer decision policy, source-packet checklist |
| Plan tier | `docs/superpowers/plans/*.md` | 25 docs | task-by-task implementation between spec and code |
| Product + end-user docs | `docs/superpowers/reference/product-spec.md`, `…user-manual.md` | 146 / 275 | standing product behavior; end-user documentation |

The kit has a *rules* registry (`manifest.json`); it has no *ownership* registry. It pairs specs
with ADRs; it has no plan tier. It has no operations-doc convention at all.

### One artifact worth stealing outright

`system-rules.md` mandates a six-part shape for every rule, in its own Rule Change Process:

> the rule statement · the business reason · the source or workflow it applies to · the confidence
> effect · whether a human reviewer may override it · the evidence required for a 100% confidence
> result

That is a better rule template than prose, it was arrived at independently, and it is in
production use. If a domain-rulebook tier ships, this is a candidate for its template.

## Finding 3 — nothing governs the seams between people

Raised by the repo owner, not by the audit: distributed-team conventions, handoff notes, and
session-turn notes have no home in the kit. The stale v1.11.0 plan above covers part of this
(claim-before-branch, one concern per branch, one linked item per PR, push cadence, shared-branch
rules). Handoff and session-turn notes are not covered by it at all.

## The constraint the owner attached

All of the above should be **selectable through the audit and interview**, for both new and
retrofit repos — not shipped to every project. The reason is the kit's own context budget: the
`/project-audit` skill already warns about the ~400-line rules budget, and six unconditional doc
tiers plus a new rule module would spend a lot of it on repos that need none of it.

This is the requirement most likely to shape the design, and it is why "just add six templates"
is probably the wrong answer.

## Open questions — deliberately unanswered

1. Is the human-decision concept a new **enforcement level** in the registry vocabulary, a new
   **rule module**, or a per-rule attribute on existing levels?
2. If it is mechanised as a gate, what declares the sensitive paths — the rules manifest, a
   per-repo config, or the rulebook itself?
3. Do the six doc tiers become templates, audit checks, interview questions, or all three?
4. Does a domain rulebook belong in `.claude/rules/` (loaded every turn, costs budget) or in
   `docs/` (cheap, but then it is not loaded and the AR+AP failure mode repeats)?
5. Is the plan tier the kit's business at all, or is it superpowers' — and if superpowers',
   does the kit declare it as a companion instead of building it?
6. What is the selection unit in the interview — per tier, or a small number of named profiles
   (e.g. "domain/regulated" vs "service")?
7. Does the stale CB-01–CB-05 content get harvested as-is, or re-derived at 1.23.8?

## Traps — what not to conclude from this

- **Do not take AR+AP's documents wholesale.** They are one repo's answer, shaped by accounting
  work. The audit's own recommendation to that repo was the reverse of adoption: keep its local
  governance, adopt only the kit's enforcement layer and `docs/` locations.
- **Do not treat the six tiers as six features.** Five of the six are one gap — taxonomy depth.
- **Do not build on the pasted v1.11.0 plan without re-verifying it.** Its stated premise is
  already false in one checkable place.
- **AR+AP is not blocked on any of this.** Its adoption path is independent and already written up
  in its own audit report. Nothing here needs to ship for that repo to proceed.

## To verify any claim here

```bash
# the audit report and its evidence
cd /Users/ian-ra/code-projects/RoofAdvisor/AR-AP && git show docs/f4d-adoption-audit:docs/f4d-audit-2026-08-16.md

# the exemplars
sed -n '1,40p' docs/superpowers/reference/system-rules.md      # rulebook + the six-part rule shape
sed -n '1,30p' docs/superpowers/reference/drift-control.md     # the fourteen stop-and-ask gates

# the enforcement-level counts quoted in Finding 1
cd /Users/ian-ra/code-projects/f4d/f4d-dev-env-configurator
grep -ohE "\b(HOOK|GATE|TEST|LINT|PROSE|JUDGMENT)\b" templates/rules/REGISTRY.md | sort | uniq -c | sort -rn
```
