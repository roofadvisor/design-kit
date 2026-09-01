# Provenance

Assembled 2026-08-31 as a Claude Code plugin.

## Sources

- **plugin87/ux-ui-agent-skills** @ `2ffb677` (<https://github.com/plugin87/ux-ui-agent-skills>) —
  the 17 workflow skills, 4 commands, design-critic agent, and everything under `kit/`.
  **License:** MIT, declared in the upstream `package.json` (author plugin87); the repo
  ships no LICENSE file — the manifest declaration is the grant relied on.
- **bergside/awesome-design-skills** (MIT, LICENSE file present; content by typeui.sh) —
  the 7 aesthetic skills. Their `SKILL.md` missions are rewritten from upstream's
  guideline-authoring template to *apply the aesthetic to the UI work at hand*; each
  folder's `DESIGN.md` is verbatim upstream.

## Divergence from upstream

The `kit/` scripts and tokens carry **~40 fixes** produced under adversarial review
(roofadvisor/roof-club PR #91, 13 rounds), including:

- `build_tokens.mjs`: directory mode emits the FULL system (was colors-only) — type,
  space, radius, shadow, motion, sizing, opacity, blur, z, chart + layout scales;
  DTCG serialization by declared type (fontFamily stacks, shadow layers, transitions,
  cubicBezier); semantic names the components actually consume.
- `measure_render.mjs` / `verify_states.mjs` / `axe_audit.mjs`: gates FAIL honestly —
  no silent pass when the browser, axe-core, or a measurable backdrop is missing;
  premultiplied group-opacity compositing; foreground alpha; background-image
  backdrops reported unmeasurable instead of scored blind.
- `accuracy_report.mjs`: runs from any CWD; strict alias validation; validates the
  generated theme against the golden components' consumed variables.
- `tokens/`: consumed-but-undefined names added as aliases with dark tiers
  (duration.normal, easing.emphasized, the feedback trio, surface.brand/inverse, …).

Known deferred items (pixel-sampling gradients, native-toggle measurement,
group-compositing parity in verify_states) were tracked in roof-club issue #92.

**Excluded on purpose:** the 149-entry `design-systems/library/` (brand systems live in
Claude Design and the raw kit archive); upstream's `professional` aesthetic (its
DESIGN.md is an electronics-shop demo config, not a generic professional system);
upstream's CLAUDE.md persona, bin/, evals/, tests/, templates/, CI, and `.mcp.json`.

## Audit (2026-08-31, pre-adoption)

No install hooks; upstream CLI is a zero-dependency file copier; scripts are local
verification tools (Playwright headless); exec calls only run the kit's own scripts on
local files; the single external URL is an axe-core CDN fallback in `axe_audit.mjs`.
