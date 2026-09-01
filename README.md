# design-kit

A Claude Code plugin that carries the UX/UI design toolkit — selectively installable
into any repo or chat, zero footprint anywhere it isn't enabled.

## What's inside

| Piece | Count | What it does |
|---|---|---|
| Workflow skills | 17 | design-qa, apply-aesthetic, a11y-audit, design-tokens, design-code, design-component, design-review, image-to-code, prototype, redesign, brandkit, token-build, migrate-design-system, figma-integration, governance, performance, ux-writing |
| Aesthetic skills | 7 | clean · modern · friendly · premium · refined · spacious · enterprise — apply the aesthetic to the UI work at hand (each carries its own DESIGN.md) |
| Commands | 4 | `/critique` (adversarial design review), `/gate` (run the objective gates), `/ship`, `/scaffold-project` |
| Agent | 1 | `design-critic` — renders the work and argues for rejection |
| `kit/` | — | DTCG tokens (14 files), 42 component specs, taste doctrine, WCAG 2.2 checklists, framework adapters, workflows, ~30 local verification scripts |

**Deliberately excluded:** the 149-entry brand design-system library (1.7 MB). Brand
systems live in Claude Design (claude.ai/design) and in the raw kit archive — the
plugin stays small. `kit/design-systems/` keeps only the crosswalk + interop protocol.

## Install

```bash
claude
```

then, in any project where you want it:

```
/plugin marketplace add roofadvisor/design-kit
/plugin install design-kit@roofadvisor
```

Uninstall or disable per project the same way — nothing persists where it isn't enabled.

## Full map

**[INSTRUCTIONS.md](INSTRUCTIONS.md)** — every skill, command, and gate: what it runs,
what it reads, and its upstream source link. The same map is published as the
**[Design Kit Field Guide](https://claude.ai/code/artifact/f81cb2e4-ce34-4c5b-9998-b908e4716857)**
artifact, which Claude sessions on this account can read via the Artifact tool.

## Notes

- Verification scripts that render (measure_render, verify_states, axe_audit, …) need
  Playwright: `npm i -D playwright && npx playwright install chromium`. Without it they
  fail or report SKIPPED honestly — a skipped gate is never a passed gate.
- Paths inside skills/commands use `${CLAUDE_PLUGIN_ROOT}` — the plugin's install root.
- Provenance, upstream audit, and license status: [PROVENANCE.md](PROVENANCE.md).
