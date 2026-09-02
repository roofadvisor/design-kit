---
name: apply-aesthetic
description: Apply a visual direction — an archetype (high-end agency, editorial minimal, brutalist, soft-SaaS, dark-tech) or one of 138 named design systems (apple, linear-app, stripe, vercel, notion, material, shadcn, spotify, tesla…) — by resolving it into the token system. Use when the user wants a specific look/vibe/brand feel, or asks to make a design feel premium/expensive/non-generic.
invocation: model
adapted: "Roof Club 2026-08-31 - vendored from plugin87/ux-ui-agent-skills; kit paths rewritten to ${CLAUDE_PLUGIN_ROOT}/kit/ (see ${CLAUDE_PLUGIN_ROOT}/PROVENANCE.md)"
---

# Skill: Apply Aesthetic

Choose and apply a design direction without breaking accessibility.

## Steps
1. **Brief Inference first (mandatory)** — before any tokens, name it: industry/domain, audience & tone, the one mood adjective the result must earn, motion depth, and the layout-family sequence (`${CLAUDE_PLUGIN_ROOT}/kit/taste/design-taste.md` → Brief Inference + Variance Mandate). Generating before deciding = slop.
2. Pick a direction in `${CLAUDE_PLUGIN_ROOT}/kit/taste/aesthetic-systems.md`:
   - An **archetype** (recipe mapped to our tokens), or
   - A **named library system** — all 138 are listed in `aesthetic-systems.md`'s Library Catalog, each with a one-line characterisation. Seven (`clean`, `friendly`, `modern`, `premium`, `refined`, `spacious`, `enterprise`) additionally carry a full inline spec in that file's Inlined Aesthetic Specs section. The other 131 carry a one-line characterisation plus a link to their full `DESIGN.md` upstream at `plugin87/ux-ui-agent-skills` (pinned to `2ffb677`, the revision `PROVENANCE.md` records). Those files are deliberately not bundled — the library is 1.7 MB — so resolve from the catalog line when that is enough, and fetch the link when you need the full spec. Browse with `python3 ${CLAUDE_PLUGIN_ROOT}/kit/scripts/design_systems.py list` (or `search <term>` / `show <name>`) — it reads the catalog and tells you, per system, whether the spec is inline or upstream.
3. Apply the **Library Contract** (in `aesthetic-systems.md`): re-point `semantic.*` tokens to the chosen system's color roles; map typography/spacing/radius/shadow/motion to `${CLAUDE_PLUGIN_ROOT}/kit/tokens/*.json`.
4. **Verify contrast** of every mapped color pair (`${CLAUDE_PLUGIN_ROOT}/kit/scripts/contrast.py` / `a11y-audit`). A brand value that fails must be adjusted — taste never overrides POUR.
5. Add motion per `${CLAUDE_PLUGIN_ROOT}/kit/taste/motion-choreography.md`; run the pre-flight aesthetic check in `design-taste.md`.

## Output
Updated/overridden semantic tokens + notes on type/space/motion, then render via `design-code`. Confirm the result passes both the aesthetic check and accessibility.
