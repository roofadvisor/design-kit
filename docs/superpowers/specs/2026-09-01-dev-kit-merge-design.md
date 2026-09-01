# dev-kit — merging design-kit and f4d-kit

**Date:** 2026-09-01
**Status:** approved design, not yet implemented
**Supersedes:** `design-kit@roofadvisor` 1.0.0, `f4d-kit@f4d` 1.23.8

## Problem

Two Claude Code plugins carry one workflow between them. `f4d-kit` owns the
development lifecycle — interview-driven scaffolding, composable rules modules,
enforcement hooks, audit agents. `design-kit` owns the UI half — tokens,
component specs, WCAG gates, taste critique. A project needing both installs two
plugins from two GitHub accounts, and neither knows the other exists.

The design half in particular never reaches the places that enforce anything: it
lives in skills that fire on invocation, so nothing carries design doctrine into
`CLAUDE.md`, the audit, or CI.

## Decisions

| # | Decision | Rejected alternative |
|---|---|---|
| 1 | One plugin, `dev-kit` 2.0.0, at `roofadvisor/dev-kit`, marketplace `roofadvisor` | Keeping `f4d-kit` as the id (no namespace churn); one marketplace with two installable plugins |
| 2 | design-kit decomposes into six bundles selected by interview | Straight merge with no pruning; thin bridge that leaves internals alone |
| 3 | design doctrine becomes rules modules in the existing registry | New first-class "capability bundle" machinery |
| 4 | `frontend.md` retires, superseded by three design modules | Keeping it as a thin always-available layer |
| 5 | Concise-output language ships as an `always_apply` rules module | Global `~/.claude/CLAUDE.md`; a Claude Code output style |

Renaming to `dev-kit` was chosen with its cost understood: every skill namespace
changes (`f4d-kit:project-init` → `dev-kit:project-init`), any project doc
referencing the old prefixes breaks, and both old ids need uninstall/reinstall.
There is no in-place upgrade across a plugin rename.

## Assumption on record

The request named "the brand-kit repo" as the growth target. No repo by that
name exists in either the `roofadvisor` or `f4d` org — checked 2026-09-01. This
design reads it as `roofadvisor/design-kit`, the repo holding the `brandkit`
skill. If a different repo was meant, decisions 1 and 5 change.

## Verified starting conditions

Measured, not assumed:

- **Zero name collisions** across all 39 skills, 4 commands, and 5 agents. The
  merge forces no rename.
- Always-on cost: design-kit ~2,785 tok, f4d-kit ~2,370 tok. Naive merge
  ~5,155 tok added to every session. Target after pruning: ~4,050.
- f4d-kit already runs the mechanism this design needs: 22 composable rules
  modules with `id`/`always_apply` frontmatter, a rule registry, per-project
  `.claude/rules/manifest.json`, and `render_instructions.py` propagating
  selections into `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules`.
- `project-init` Round 3 is titled *Conditional modules* and already contains the
  row `Frontend != none → frontend`. That row is the seam.
- design-kit's own `kit/templates/product-design/.claude/rules/` already contains
  `tokens.md`, `accessibility.md`, `components.md` — it independently invented
  the same rules-module pattern. Those three map 1:1 into `templates/rules/`.

## Architecture

### Bundles

Six units, each Q&A-selected in Round 3. ✅ = operates with no other bundle present.

| Bundle | Skills | Standalone |
|---|---|---|
| `design.tokens` | brandkit, design-tokens, token-build, migrate-design-system, figma-integration | ✅ |
| `design.verify` | a11y-audit, design-qa, performance, design-review, gate, critique, design-critic | ✅ |
| `design.content` | ux-writing | ✅ |
| `design.direction` | apply-aesthetic | needs `tokens` |
| `design.build` | design-code, design-component, image-to-code, prototype, redesign | needs `tokens` |
| `design.govern` | governance | needs `verify` |

### Rules modules

`frontend.md` retires. Four design modules replace it, seeded from design-kit's
own product-design template plus the doctrine salvaged in review 4, and backed
by real gates rather than prose:

- `design-tokens.md` — token tiers, no hardcoded values, theme resolution,
  the Major Third type scale and 4px spacing rules, and motion values
- `design-a11y.md` — WCAG 2.2 AA, the eight states, keyboard and RTL
- `design-components.md` — anatomy, variants, states, error and empty states,
  and the 8 code-output rules
- `design-handoff.md` — handoff checklist and the component Definition of Done;
  `ship-it` step 3 is taught to walk it alongside `DEFINITION.md`

Plus `response-format.md` (`always_apply: true`) carrying the concise-output
language, propagated by `render_instructions.py` like any other module.

One existing module changes: `core.md` gains the output-completeness rule
("a partial output is a broken output"), promoted from design-only to
framework-wide with its own registry ID.

Each gets rows in `templates/rules/REGISTRY.md` naming what enforces it today.
A design rule with no gate behind it is recorded as unenforced, not omitted.

### Agent selection

`design-critic` is selected exactly when any design bundle is decided. This
reuses the documented pattern — *"agents follow the same logic, one level up,
never asked about directly"* — that already pairs `schema-reviewer` with
`database` and `contract-drift-checker` with `contracts`. No new interview
question.

### State

`.claude/.framework-state.json` gains an additive `bundles: []`. Files written
before this change lack the key and must still load; C1 already requires
`upgrade.py` to load state without crashing.

### Hook constraint (A18)

`${CLAUDE_PLUGIN_ROOT}` does not resolve inside a project's own
`.claude/settings.json` — a hook command built from it there is silently
skipped, never run. Design gates therefore cannot be wired per-project. They are
declared once in the plugin's global `hooks/hooks.json` and self-gate on
`.claude/.framework-state.json`, exactly like the existing six hooks.

## The four functional duplicates

Same job, different lineage. Each is reviewed individually before any code moves.

| Pair | Overlap | Opening recommendation |
|---|---|---|
| `/ship` ↔ `ship-it` | Both gate, bump version, write changelog | `ship-it` absorbs the design gate step, fired only when a design bundle is present |
| `/scaffold-project` ↔ `project-init` | Both write `CLAUDE.md`, `.claude/rules/`, `.claude/commands/`, `.claude/settings.json`, `.mcp.json` | Template dissolves into `project-init`; its three rules files become the modules above |
| `/gate` ↔ verify command + `done-check.sh` | Overlapping enforcement of "is it done" | `/gate` registers as a verify target rather than a parallel path |
| `governance` ↔ `promote-rule` + `decision-record` | Adjacent, not clearly duplicate | Likely keep separate — governance covers SemVer for tokens/components, which the rule ladder does not |

## Pruning

- 7 aesthetic skills (clean, modern, friendly, premium, refined, spacious,
  enterprise) retire. Each is ~1.26KB of near-identical wrapper around a ~1.5KB
  `DESIGN.md`. The seven `DESIGN.md` files become entries in
  `kit/taste/aesthetic-systems.md`, the 28KB catalog `apply-aesthetic` already
  resolves directions from. No capability lost; −7 always-on descriptions.

## Migration

1. `roofadvisor/design-kit` → `roofadvisor/dev-kit` (GitHub redirects preserve
   the registered marketplace source).
2. f4d-kit content moves in; `f4d/f4d-dev-env-configurator` stays public, stops
   being the growth target, README points at the new home.
3. Repos carrying `frontend` in `manifest.json` migrate to the three design
   modules via `framework-upgrade`.
4. Repos scaffolded by the old `/scaffold-project` are detected by
   `project-audit` and folded into the standard layout.
5. `roof-club` and any other repo referencing `f4d-kit:*` or `design-kit:*` in
   its `CLAUDE.md` needs those prefixes updated.

## Audit additions

`project-audit` gains design findings:

- Declared bundles whose gates are not wired
- `design/` rules present with no verify target
- Playwright unresolvable — an environment finding, not a user error

## Non-goals

- Re-homing the 149-entry brand design-system library. It stays in Claude Design.
- Extending `render_registry.py` with new schema concepts. Bundles are recorded
  in framework state, not in the rules manifest.
- Any in-place upgrade path across the plugin rename. Uninstall/reinstall is
  accepted.

## Risks

| Risk | Mitigation |
|---|---|
| Namespace rename breaks project docs silently | `project-audit` check for stale `f4d-kit:` / `design-kit:` prefixes |
| Merged always-on cost still high (~4,050 tok) | Measured after each pruning step with `claude plugin details` |
| Design gates depend on Playwright, absent by default | Resolver fix written and verified 2026-09-01, **uncommitted**; audit reports unresolvable as a finding |
| Bundle dependencies (`build` needs `tokens`) selected inconsistently | Round 3 enforces the dependency, same as `blockchain` pulling `keysafety` |

## Open

- Whether `governance` merges with the rule ladder or stays separate — decided
  during the one-by-one duplicate review.
- Whether `f4d/f4d-dev-env-configurator` is archived or left as a redirect.

---

## Duplicate review resolutions

### 1. `/scaffold-project` ↔ `project-init` — resolved 2026-09-01

**`/scaffold-project` retires.** It is a strict subset of `project-init` once
three assets are carried across. `project-init` absorbs it as a conditional
branch fired by design-bundle selection.

Carried across:

| Asset | Destination |
|---|---|
| `tokens.md`, `accessibility.md`, `components.md` | `templates/rules/design-{tokens,a11y,components}.md` + frontmatter |
| `design-tokens.json` at project root | Step 3 sub-step, when `design.tokens` selected |
| `src/components/<Name>/<Name>.states.html` | scaffolded with one worked example, when `design.build` selected |
| `public/images/`, `reference/` | same sub-step |
| `npm i -D playwright` | Step 9 verify script |
| `.mcp.json` (Figma/Notion/Drive) | Round 2 integration surface |
| `CLAUDE.local.md` + gitignore entry | **framework-wide** — every scaffold, design or not |
| Brand ramp + `validate_contrast.py` | design branch of Step 3 |

Deleted outright:

- Step 3's `npx ux-ui-agent-skills add …` — the copy-the-engine-into-every-project
  model is obsolete when `${CLAUDE_PLUGIN_ROOT}/kit/` ships with the plugin.
- The `npx ux-ui-agent-skills new` fast path — an upstream CLI dependency the
  merged plugin does not need.

Migration detail: the three rules files invoke scripts project-relative
(`python3 scripts/validate_tokens.py`) because the engine used to be copied in.
Every path rewrites to `${CLAUDE_PLUGIN_ROOT}/kit/scripts/`. `accessibility.md`
references ten gate scripts by name.

Decisions taken: `CLAUDE.local.md` is adopted framework-wide, not design-only.
The harness convention is both scaffolded (one worked example) and stated in
`design-components.md` — a fresh design project whose gates pass over zero
harnesses is green with nothing proven.

### 2. `/ship` ↔ `ship-it` — resolved 2026-09-01

**`/ship` retires.** `ship-it` is the more complete lifecycle — audit agents
selected by diff type, Definition of Done walk, rollback path, PR, Work DB sync,
post-deploy health check. `/ship` has none of it.

Absorbed into `ship-it`:

- **Design gate triple** (`accuracy_report.mjs`, `verify_responsive.mjs examples`,
  `check_no_emoji.py`) — no extra work; review 1 folds the design gates into the
  project verify command, which `ship-it` step 1 already runs.
- **"List the commits since the last tag"** — step 6 said to write a CHANGELOG
  entry without saying where the material comes from.
- **Bump level proposed, then confirmed.** `ship-it` reads the diff, states the
  semver level and its reasoning, waits for a yes. Keeps `/ship`'s "it is their
  call" without giving up the analysis.

Dropped: the `kit/examples/apple-home` gitignore reminder — repo-specific
housekeeping, not framework behaviour.

**Safety posture — the one genuine conflict, resolved in `/ship`'s favour.**
`/ship` refused destructive acts without explicit confirmation; `ship-it` step 5
handed over `git add -A`, `git commit`, `git push -u origin`, and `gh pr create`
as an unattended block, and step 6 tagged. The merged `ship-it` verifies, drafts
the PR body and changelog, then **stops and asks** before push, PR creation, or
tag. Everything before that point still runs unattended.

`git add -A` is replaced with explicit paths regardless of posture — it sweeps
untracked files, exactly how a generated `kit/dist/tokens.css` gets committed.

### 3. `/gate` ↔ verify command + `done-check.sh` — resolved 2026-09-01

**Not a duplicate — different layers.** `/gate` is a checklist the model runs;
`verify-record.sh` + `done-check.sh` is harness enforcement that mechanically
blocks a "done" claim. `/gate` survives as the design verify entry point. Two
integration breaks were found by test and must be fixed as part of the merge.

**Break 1 — `/gate` does not count as a verify run.** `verify-record.sh` matches
`*verify*|*pytest*|*vitest*|*forge test*|*npm test*|*pnpm test*`. Measured:

```
node .../kit/scripts/accuracy_report.mjs    NO MATCH — .last-verify never written
node .../kit/scripts/verify_states.mjs      RECORDS
npm run verify                              RECORDS
```

`accuracy_report.mjs` matches nothing. Its child gates would, but they are
spawned via `execSync`, so `PostToolUse:Bash` never sees them. A design session
runs `/gate`, passes 35/35, and `done-check.sh` still blocks with "No verify run
recorded this session" — a gate firing wrongly, which this framework's own docs
say is how gates get disabled.

*Fix (both paths):* fold the design gate into the project verify command, **and**
extend `verify-record.sh` to match `accuracy_report` and `gate`. Neither alone
covers both the generic verify path and someone invoking `/gate` by name.

**Break 2 — design token sources are invisible to `done-check.sh`.** Its filter
is `grep -Ev '\.(md|txt|json|ya?ml|lock)$'`. Measured:

```
design-tokens.json        EXCLUDED — done claim passes unchecked
kit/tokens/color.json     EXCLUDED — done claim passes unchecked
src/theme.css             SEEN
src/components/…/Button.tsx   SEEN
```

`design-tokens.json` is a design project's source of truth, not config.

*Fix:* keep the extension filter — correct for `package.json`, tsconfig,
lockfiles — and add an explicit include-list exception for design token sources
(`design-tokens.json`, `kit/tokens/*.json`).

### 4. `governance` ↔ `promote-rule` + `decision-record` — resolved 2026-09-01

**Not a duplicate. `governance` stays.** Three skills over three different
objects: `governance` versions **design-system artifacts** (product → candidate
→ core), `promote-rule` moves **rules** up an enforcement ladder (PROSE → LINT →
TEST → GATE → HOOK), `decision-record` captures **architectural choices**. They
share only the abstract shape of tiered promotion.

Two forced fixes:

- `governance` step 5 hand-edits `CLAUDE.md`. Merged, `CLAUDE.md` is generated by
  `render_instructions.py` and policed by `check_instruction_honesty.py` (C-10).
  Governance instead updates module frontmatter and re-runs the renderer.
- **SemVer authority:** `ship-it` owns the bump and the changelog — one release
  path for the repo. `governance` keeps the design-specific classification table
  defining what counts as breaking for a token or component.

#### The two-ruleset discovery

design-kit carries two overlapping rule sets that have already drifted:
`kit/rules/` (7 files, engine doctrine read by 6 skills) and
`kit/templates/product-design/.claude/rules/` (3 files, project doctrine).
`components.md` differs by 2.2KB; `accessibility.md` is *larger* in the template.

**Resolution: `templates/rules/` is canonical.** The three overlapping
`kit/rules/` files are deleted and their skill references re-pointed.

The other four were fragments of upstream's `CLAUDE.md` — each opens "Split out
of `CLAUDE.md` so it loads only when the work calls for it." Three had **zero**
inbound references. Of their 10.4KB, ~4.5KB is routing (indexes into
`workflows/*`, `taste/*`, `frameworks/adapters/*`) — obsolete, because skill
descriptions are the router now. The remaining ~5.9KB is homeless doctrine:

| Source | Substance | Destination |
|---|---|---|
| `typography-and-spacing.md` | Major Third scale + 7 type rules; 4px base + 4 spacing rules | merge → `templates/rules/design-tokens.md` |
| `brand-and-operations.md` § Motion | 100–300ms, ease-out entrances, reduced-motion, never hardcode timing | merge → `templates/rules/design-tokens.md` (motion values are tokens) |
| `frameworks.md` § Output Rules | the 8 code-output rules | → `templates/rules/design-components.md`, all 8 intact |
| `frameworks.md` § Output Rules → completeness | "a partial output is a broken output; deliver all N" | **also promoted** → `templates/rules/core.md`, framework-wide |
| `review-and-research.md` § Handoff | handoff checklist + component Definition of Done | → `templates/rules/design-handoff.md`, and **`ship-it` step 3 taught to walk it** alongside `DEFINITION.md` |
| `review-and-research.md` § rubric | 6-dimension weighted scoring + severity ladder | → `kit/workflows/design-review.md` |
| `review-and-research.md` § fidelity | fidelity ladder + research methods | → `kit/workflows/prototyping.md` |
| `brand-and-operations.md` § Voice | good/avoid copy pairs, error formula | delete — `kit/content/voice-tone.md` holds the full version |
| all four, routing sections | indexes into workflows/taste/frameworks | delete |

**Refinement on the completeness rule.** It is promoted to `core.md` *and* stays
in `design-components.md`'s list of 8 so that set reads whole. To avoid two
statements of one rule drifting — the exact failure the registry exists to
prevent — `core.md` owns the prose and the registry ID; the
`design-components.md` entry cites that ID rather than restating it.
