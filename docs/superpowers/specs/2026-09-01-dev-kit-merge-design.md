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

`frontend.md` retires. Three modules replace it, seeded from design-kit's own
product-design template and backed by real gates rather than prose:

- `design-tokens.md` — token tiers, no hardcoded values, theme resolution
- `design-a11y.md` — WCAG 2.2 AA, the eight states, keyboard and RTL
- `design-components.md` — anatomy, variants, states, error and empty states

Plus `response-format.md` (`always_apply: true`) carrying the concise-output
language, propagated by `render_instructions.py` like any other module.

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
