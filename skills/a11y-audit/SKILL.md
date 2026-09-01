---
name: a11y-audit
description: Audit a UI or design against WCAG 2.2 AA/AAA and ARIA patterns, returning criterion-referenced findings with severity and specific fixes. Use when the user wants an accessibility check, contrast verification, keyboard/screen-reader review, or wants to confirm a component meets POUR.
invocation: model
adapted: "Roof Club 2026-08-31 - vendored from plugin87/ux-ui-agent-skills; kit paths rewritten to ${CLAUDE_PLUGIN_ROOT}/kit/ (see ${CLAUDE_PLUGIN_ROOT}/kit/PROVENANCE.md)"
---

# Skill: Accessibility Audit

Evaluate against WCAG 2.2 and the project's ARIA patterns.

## Steps
1. Read `${CLAUDE_PLUGIN_ROOT}/kit/accessibility/wcag-checklist.md` (POUR-organized, P0/P1/P2) and `${CLAUDE_PLUGIN_ROOT}/kit/accessibility/aria-patterns.md`.
2. Check the mandatory P0 set per component: keyboard navigable, focus visible (≥3:1), screen-reader name/role/state, contrast (4.5:1 text / 3:1 UI), target size ≥24×24, no color-only signaling.
3. Verify WCAG 2.2 additions: Focus Not Obscured (2.4.11), Target Size (2.5.8), Accessible Authentication (3.3.8).
4. **Contrast — measure, don't eyeball.** For rendered HTML, RUN the real-render gates and report their actual output — they need Playwright, which is NOT a repo dependency (`npm i -D playwright && npx playwright install chromium` first; if it's absent the gates print SKIPPED — report that, fall back to `contrast.py` on the token pairs, and never count a skipped gate as passed): `node ${CLAUDE_PLUGIN_ROOT}/kit/scripts/measure_render.mjs <file> [--dark]` (every text element) AND `node ${CLAUDE_PLUGIN_ROOT}/kit/scripts/verify_states.mjs <file> [--dark]` (every interactive element in default/hover/focus — catches hover-state failures). For loose color pairs, `python3 ${CLAUDE_PLUGIN_ROOT}/kit/scripts/contrast.py "<fg>" "<bg>"`. Never state a ratio you did not measure.
5. Check reduced-motion handling (`${CLAUDE_PLUGIN_ROOT}/kit/taste/motion-choreography.md`).

## Output
A findings table: WCAG criterion (e.g. 1.4.3) · severity (P0/P1/P2) · what fails · specific fix. Confirm passes explicitly. Accessibility may never be traded for aesthetics.
