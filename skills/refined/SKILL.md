---
name: refined
description: Carefully curated, modern minimal style with elegant serif typography and understated, sophisticated palettes.
license: MIT
metadata:
  author: typeui.sh
  adapted: "Roof Club 2026-08-31 — mission rewritten from guideline-authoring to UI application (PR #91 review)"
---

# Refined — aesthetic application skill

## Mission
Apply the Refined aesthetic to the UI work at hand — building or modifying screens,
components, prototypes, or artifacts in this repo. The deliverable is the UI change
itself, never a design-guideline document; write guidance only if explicitly asked.

## Source of truth
Read `DESIGN.md` in this folder for the aesthetic's definition (brand voice, tokens,
typography, spacing). Derive every color, type, and spacing decision from it; where it
is silent, extend in its spirit rather than inventing a new direction.

## Rules
- Prefer semantic tokens over raw values; keep interaction states explicit.
- WCAG 2.2 AA: keyboard-first interactions, visible focus states; when aesthetics and
  accessibility conflict, accessibility wins.
- Preserve visual hierarchy and a consistent spacing rhythm.
- Match the surrounding code's conventions — the aesthetic changes the look, not the
  architecture.
