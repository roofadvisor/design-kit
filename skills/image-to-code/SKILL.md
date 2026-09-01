---
name: image-to-code
description: Turn a reference image, screenshot, or mockup into token-driven, accessible code — infer the design system from the reference (palette, type scale, spacing, radius, layout archetype), map it to the 3-tier tokens, rebuild it, then verify with the kit's gates. Use when the user provides a design/screenshot and wants matching UI code.
invocation: user
adapted: "Roof Club 2026-08-31 - vendored from plugin87/ux-ui-agent-skills; kit paths rewritten to ${CLAUDE_PLUGIN_ROOT}/kit/ (see ${CLAUDE_PLUGIN_ROOT}/kit/PROVENANCE.md)"
---

# Skill: Image to Code

Reconstruct a design from a visual reference as a real design system, not a one-off copy. Match the *system* (color/type/spacing language), never lift copyrighted imagery or brand assets.

## Steps
1. **Read the reference like a designer.** Infer and write down:
   - **Palette** — 1 dominant surface family, text colors, 1 primary action + at most 1 accent (sample the hues; don't guess random hex).
   - **Type** — family feel (geometric/grotesk/serif), the scale jumps, display vs. body contrast, weights.
   - **Spacing & density** — base unit, section rhythm, card padding; airy vs. compact.
   - **Radius & depth** — radius language (sharp/soft/pill), shadow vs. hairline separation.
   - **Layout archetype + sequence** — full-bleed hero / asymmetric split / bento / editorial stack (`${CLAUDE_PLUGIN_ROOT}/kit/taste/design-taste.md` → Variance Mandate).
2. **Anchor to a known system** if it's close — browse `${CLAUDE_PLUGIN_ROOT}/kit/taste/aesthetic-systems.md` / `python3 ${CLAUDE_PLUGIN_ROOT}/kit/scripts/design_systems.py search <term>` and adopt that recipe to stabilize decisions.
3. **Build the token theme** from the inferred values → 3-tier DTCG (`design-tokens` skill); generate a single `theme.css`. Verify every color pair with `${CLAUDE_PLUGIN_ROOT}/kit/scripts/contrast.py` / `${CLAUDE_PLUGIN_ROOT}/kit/scripts/validate_contrast.py` (light + dark) — a sampled brand color that fails AA gets adjusted; taste never overrides POUR.
4. **Rebuild layout + components** token-driven via `${CLAUDE_PLUGIN_ROOT}/kit/frameworks/adapter-protocol.md` + `${CLAUDE_PLUGIN_ROOT}/kit/components/*`: one shared primitive layer, all 8 states, a11y wired, no emoji (lucide), single theme. Apply taste (`design-taste.md`) so it doesn't regress to generic.
5. **Verify against the reference** — render and screenshot it, compare side-by-side to the reference; run `node ${CLAUDE_PLUGIN_ROOT}/kit/scripts/measure_render.mjs <rebuilt.html>` (and `--dark`) and `node ${CLAUDE_PLUGIN_ROOT}/kit/scripts/taste_audit.mjs <rebuilt.html>` — always pass the rebuilt file explicitly; both need Playwright (`npm i -D playwright && npx playwright install chromium`; not a repo dependency) — plus `python3 ${CLAUDE_PLUGIN_ROOT}/kit/scripts/lint_hardcodes.py <src>`, and the repo's `npm run verify` for type/tests/build.

## Verification (definition of done)
- The kit's design gates pass on the rebuilt UI — `validate_tokens.py`, `validate_contrast.py`, `lint_hardcodes.py <src>`, `check_no_emoji.py`, and (with Playwright installed) `measure_render.mjs` light+dark. This repo's `npm run verify` covers type/tests/build only and runs **none** of these; invoke them directly from `${CLAUDE_PLUGIN_ROOT}/kit/scripts/`.
- The rebuilt UI uses ONE inferred token theme — no per-section palettes.
- A screenshot of the result visibly matches the reference's design language.

> Honest limit: this matches the design **system**, not a pixel-perfect copy. Do not reproduce the reference's photographs, logos, or copyrighted copy — substitute your own or generic placeholders.
