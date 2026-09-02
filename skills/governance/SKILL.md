---
name: governance
description: Govern how the design system evolves — SemVer for ${CLAUDE_PLUGIN_ROOT}/kit/tokens/components, the contribution workflow, deprecation policy, and change communication. Use when the user wants to add/promote/deprecate a component or token, decide a version bump, set up a contribution process, or keep the system from fragmenting.
invocation: user
adapted: "Roof Club 2026-08-31 - vendored from plugin87/ux-ui-agent-skills; kit paths rewritten to ${CLAUDE_PLUGIN_ROOT}/kit/ (see ${CLAUDE_PLUGIN_ROOT}/kit/PROVENANCE.md)"
---

# Skill: Governance

Keep the system consistent as it grows. Apply versioning, contribution, and deprecation rules.

## Steps
1. Read `${CLAUDE_PLUGIN_ROOT}/kit/workflows/governance.md` (SemVer table, contribution workflow, deprecation policy, change comms).
2. Classify the change: **major** (breaking — renamed/removed token or prop, changed anatomy/default), **minor** (additive — new token/component/variant/optional prop), **patch** (fix — contrast/bug/doc/value tweak in tolerance).
3. For a **new** component/token: confirm it serves a real, repeated need (≥ 2 places) before promoting product → candidate → core. Design it to the full quality bar (`${CLAUDE_PLUGIN_ROOT}/templates/rules/design-components.md` → Component quality bar).
4. For a **deprecation**: mark with reason + replacement + removal version; keep working ≥ 1 minor cycle; provide a migration map (`${CLAUDE_PLUGIN_ROOT}/kit/design-systems/crosswalk.md` style); remove only in a major.
5. Add the spec to the right file under `${CLAUDE_PLUGIN_ROOT}/kit/components/`
   (or the token file under `kit/tokens/`) — `design-component` and
   `design-code` read that file directly, so there is no separate
   per-component registry to wire it into. Only if this change *also*
   changed the doctrine itself — a rules module under `templates/rules/*.md`,
   e.g. the Component quality bar's own requirements, not one component's
   spec — update that module's frontmatter and registry row, then regenerate
   the instruction surfaces:
   `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/render_instructions.py" --rules-dir .claude/rules --write`.
   Never hand-edit `CLAUDE.md` — it is generated, and `check_instruction_honesty.py`
   (C-10) will flag a hand-edit as drift. Add the changelog entry via `ship-it`,
   which owns the bump.

## Verification (definition of done)
- Change has a SemVer level **and** a changelog entry.
- Removals have a deprecation window, a replacement, and a migration table.
- New spec meets the 8-state + a11y + token-mapping bar, and any instruction-surface
  change went through the frontmatter + renderer — never a hand-edit to `CLAUDE.md`.
- `python3 ${CLAUDE_PLUGIN_ROOT}/kit/scripts/validate_tokens.py` passes; contrast re-checked if colors changed.
