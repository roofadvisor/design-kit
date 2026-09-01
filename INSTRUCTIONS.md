# design-kit — Instructions

The complete map of what this plugin installs, what each piece runs and reads, and where
every item came from. A rendered version of this page lives as a Claude artifact —
**[Design Kit Field Guide](https://claude.ai/code/artifact/f81cb2e4-ce34-4c5b-9998-b908e4716857)** —
which Claude sessions on this account can read directly via the Artifact tool
(`action: "read"` with that URL).

**One system, not a salad:** everything behavioral is plugin87's ux-ui-agent-skills —
one author, one architecture, internally cross-referenced — plus seven self-contained
aesthetic skills. Every skill declares its steps, files, and exact commands; there is no
hidden behavior.

## The flow

Gates prove correctness; the critic judges taste — in that order, never one instead of
the other.

| Stage | Use |
|---|---|
| 1 · Foundation | `brandkit` · `design-tokens` · `migrate-design-system` |
| 2 · Direction | `apply-aesthetic` · the 7 aesthetics · `ux-writing` |
| 3 · Build | `design-component` · `design-code` · `image-to-code` · `prototype` · `redesign` |
| 4 · Verify | `/gate` · `design-qa` · `a11y-audit` · `performance` · `token-build` |
| 5 · Judge & govern | `/critique` · `design-review` · `governance` · `figma-integration` · `/ship` |

> **Playwright prerequisite:** scripts that render (measure_render, verify_states,
> axe_audit, focus-trap/keyboard/RTL/responsive checks) need
> `npm i -D playwright && npx playwright install chromium`. Without it they refuse or
> report SKIPPED — a skipped gate is never a passed gate.

## Workflow skills (17) — [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills)

| Skill | Job | Runs / reads | Source |
|---|---|---|---|
| a11y-audit | WCAG 2.2 audit, criterion-referenced | `kit/accessibility/*` · measure_render, verify_states, contrast.py | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/a11y-audit) |
| apply-aesthetic | Resolve a look into the tokens | `kit/taste/aesthetic-systems.md` (named brands live in Claude Design) | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/apply-aesthetic) |
| brandkit | Brand token system from a brief | writes DTCG tokens · accuracy_report | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/brandkit) |
| design-code | Production code, any framework | `kit/frameworks/adapters/*` · verify_states, accuracy_report | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/design-code) |
| design-component | Component spec to the house bar | `kit/components/*` · states harness (verify_states, axe_audit, measure_render, verify_focustrap) | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/design-component) |
| design-qa | Stand up / run QA gates, wire CI | `kit/workflows/design-qa.md` · validate_tokens, validate_contrast, lint_hardcodes, measure_render | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/design-qa) |
| design-review | 6-dimension heuristic critique | `kit/taste/design-taste.md` — analysis only | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/design-review) |
| design-tokens | Generate / audit DTCG 3-tier tokens | `kit/tokens/*` · validate_tokens, validate_contrast | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/design-tokens) |
| figma-integration | Tokens ↔ Figma Variables | `kit/workflows/figma-integration.md` · Figma MCP when connected | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/figma-integration) |
| governance | SemVer, deprecation, contributions | `kit/workflows/governance.md` | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/governance) |
| image-to-code | Screenshot → token-driven code | measure_render, lint_hardcodes, taste_audit | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/image-to-code) |
| migrate-design-system | Bridge M3 / HIG / Fluent / shadcn… | `kit/design-systems/crosswalk.md` + `interop-protocol.md` | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/migrate-design-system) |
| performance | Core Web Vitals | `kit/workflows/performance.md` | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/performance) |
| prototype | Fidelity ladder + validation plan | `kit/workflows/prototyping.md` | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/prototype) |
| redesign | Upgrade existing UI surgically | `kit/workflows/redesign-audit.md` · slop_tells | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/redesign) |
| token-build | Tokens → platform artifacts | build_tokens.mjs · `kit/workflows/token-build.md` | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/token-build) |
| ux-writing | UI copy and voice | `kit/content/voice-tone.md` | [↗](https://github.com/plugin87/ux-ui-agent-skills/tree/main/.claude/skills/ux-writing) |

## Aesthetic skills (7) — [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) (content by typeui.sh)

Self-contained styling notes: each applies its look to the UI work at hand and reads only
its own `DESIGN.md`. Missions rewritten from upstream's guideline-authoring template.
Curated from 68 — the remaining 61 are in Claude Design as "(aesthetic)" systems.
(`professional` was dropped: its upstream folder is an electronics-shop demo config.)

[clean](https://github.com/bergside/awesome-design-skills/tree/main/skills/clean) ·
[modern](https://github.com/bergside/awesome-design-skills/tree/main/skills/modern) ·
[friendly](https://github.com/bergside/awesome-design-skills/tree/main/skills/friendly) ·
[premium](https://github.com/bergside/awesome-design-skills/tree/main/skills/premium) ·
[refined](https://github.com/bergside/awesome-design-skills/tree/main/skills/refined) ·
[spacious](https://github.com/bergside/awesome-design-skills/tree/main/skills/spacious) ·
[enterprise](https://github.com/bergside/awesome-design-skills/tree/main/skills/enterprise)

## Commands (4) + agent (1)

| Item | What it does | Source |
|---|---|---|
| `/gate` | accuracy_report.mjs — every objective gate, all-or-nothing | [↗](https://github.com/plugin87/ux-ui-agent-skills/blob/main/.claude/commands/gate.md) |
| `/critique` | Renders the work, dispatches design-critic to argue rejection — after gates, never instead | [↗](https://github.com/plugin87/ux-ui-agent-skills/blob/main/.claude/commands/critique.md) |
| `/ship` | Full gate + responsive + no-emoji, then drafts the release checklist (verifies and drafts only) | [↗](https://github.com/plugin87/ux-ui-agent-skills/blob/main/.claude/commands/ship.md) |
| `/scaffold-project` | New project skeleton from `kit/templates/product-design/` (bundled) | [↗](https://github.com/plugin87/ux-ui-agent-skills/blob/main/.claude/commands/scaffold-project.md) |
| design-critic (agent) | Adversarial senior critic — taste verdicts the gates cannot give | [↗](https://github.com/plugin87/ux-ui-agent-skills/blob/main/.claude/agents/design-critic.md) |

## Not in the plugin

The 149-entry brand design-system library (1.7 MB). Brand systems (Stripe, Airbnb,
Apple, …) live in **Claude Design** (158 on the account picker; brand source:
[kwakseongjae/oh-my-design](https://github.com/kwakseongjae/oh-my-design)) and in the raw
kit archive at `~/Downloads/RoofClub-Design-Kit 2/`.

## Divergence, audit, license

`kit/` carries ~40 fixes over upstream `2ffb677`, produced under 13 adversarial review
rounds ([roof-club PR #91](https://github.com/roofadvisor/roof-club/pull/91), private) —
full-system token build, honestly-failing render gates, group-opacity compositing,
consumed-name closure. Details: [PROVENANCE.md](PROVENANCE.md) · [LICENSE](LICENSE).
