---
id: design-tokens
always_apply: false
---
# Design tokens

Loaded when you are touching `design-tokens.json` or a theme file.

## The three tiers

```
component   button-bg-primary  ->  {semantic.action.primary}    used in components
semantic    action.primary     ->  {primitive.brand.600}        used in design
primitive   brand.600          ->  #2563eb                      never used directly
```

A component never reads a primitive. If a component needs a colour that has no
semantic name yet, the missing thing is the semantic name, not permission to
reach one tier down.

## Adding a token

1. Does a semantic token already mean this? Use it. Two names for one meaning is
   how a design system dies.
2. Name it for purpose, not appearance: `feedback.error-text`, not `red-dark`.
   The shape is `{category}.{property}.{variant}-{state}`.
3. Add the light value and the dark value together. A token that exists in only
   one theme will ship broken in the other.
4. DTCG format, always `$type` and `$value`, alias with `{dotted.path}`.

## Changing a token

Change it here, in one place, and let every screen follow. If a screen needs a
different value, that is a new semantic token or a theme override, never a local
hex.

## Dark mode

Primitives do not change between themes. The swap happens at the semantic tier
via `[data-theme="dark"]`. Light surfaces carry dark text and dark surfaces carry
light text, and both have to pass contrast before the change counts as made.

## Type scale

Major Third ratio (1.25):

```
xs=12  sm=14  base=16  lg=18  xl=20  2xl=24  3xl=30  4xl=36  5xl=48  6xl=60  7xl=72
```

1. **One font family for UI** — Inter (or system-ui) for all interface text.
2. **Serif for editorial** — Lora (or Georgia) for blog posts, marketing pages.
3. **Mono for code** — JetBrains Mono for code blocks, data values.
4. **Heading hierarchy** — h1 is used once per page; headings never skip levels.
5. **Line length** — body text: 45–75 characters per line (65ch optimal). Use
   `max-width: 65ch`.
6. **Line height** — headings: tight (1.25). Body: normal (1.5). Caption: normal
   (1.5).
7. **Font weight** — regular (400) for body, medium (500) for labels, semibold
   (600) for headings, bold (700) for page titles only.

These live as composite text styles inside `design-tokens.json`, not as raw
per-element values.

## Spacing

Base unit 4px. Every spacing value is a multiple of it:

```
0  2  4  6  8  10  12  14  16  20  24  28  32  36  40  44  48  56  64  80  96
```

1. **Outer spacing > inner spacing** — container padding > element gaps >
   element padding.
2. **Related items closer** — related elements share tighter spacing than
   unrelated ones.
3. **Consistent rhythm** — establish a vertical rhythm and maintain it
   throughout the page.
4. **Semantic spacing** — use purpose-named tokens (`card.padding`, `stack.lg`)
   over raw values.

The full scale and its semantic aliases live in `design-tokens.json`, alongside
every other tier.

## Motion

1. **Duration** — 100–300ms for UI transitions. Never > 500ms.
2. **Easing** — `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for
   state changes.
3. **Purpose** — every animation guides attention, shows connection, or
   provides feedback.
4. **Reduced motion** — always respect `prefers-reduced-motion`. Replace with
   fade or instant.
5. **Tokenized** — all motion values (duration scale, easing curves, transition
   presets, keyframes) come from `design-tokens.json`. Never hardcode timing or
   easing.

## After any edit

```
python3 "${CLAUDE_PLUGIN_ROOT}/kit/scripts/validate_tokens.py"     design-tokens.json          aliases resolve, JSON parses
python3 "${CLAUDE_PLUGIN_ROOT}/kit/scripts/validate_contrast.py"   design-tokens.json          WCAG on the source, light and dark
node    "${CLAUDE_PLUGIN_ROOT}/kit/scripts/build_tokens.mjs"       --in design-tokens.json --out src/theme.css
python3 "${CLAUDE_PLUGIN_ROOT}/kit/scripts/validate_theme_refs.py" src/theme.css src           every var(--...) resolves
python3 "${CLAUDE_PLUGIN_ROOT}/kit/scripts/lint_hardcodes.py"      src                          nothing bypassed the theme
```

Or run all of them plus the render gates with `/gate`.

Report the real output. A contrast ratio you did not measure is not a number, it
is a guess.
