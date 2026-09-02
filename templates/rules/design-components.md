---
id: design-components
always_apply: false
---
# Design components

Loaded when you are creating or changing something in `src/components/`.

## Atomic design

Build from small to large — **Atoms → Molecules → Organisms → Templates →
Pages**:

- Atoms are indivisible (Button, Input, Icon).
- Molecules combine atoms for a task (Form Field = Label + Input + Error).
- Organisms are complex sections (Header, Data Table, Modal).
- Templates define page-level layout (Dashboard, Auth, Settings).

Before drafting a new spec, check whether the piece you need already has one:
`${CLAUDE_PLUGIN_ROOT}/kit/components/atoms.md`, `molecules.md`,
`organisms.md`, `templates.md`, plus the domain files (`navigation.md`,
`feedback.md`, `forms-advanced.md`, `overlays.md`, `data-display.md`,
`icon-system.md`). Match the existing spec format rather than starting fresh.

## Component quality bar

Every component spec needs all six, not just the ones that are easy:

1. **Anatomy diagram** — visual structure breakdown.
2. **Variants** — every visual variant (primary, secondary, ghost, etc.), as
   a table.
3. **Sizes** — sm, md, lg with exact dimensions, as a table.
4. **States** — all 8 applicable states (see "The eight states" below).
5. **Token mapping** — every value traced to a design token.
6. **Accessibility** — ARIA pattern, keyboard model, screen-reader behavior.

## Structure

One component per folder, named in PascalCase, exporting a single named component:

```
src/components/Button/
  Button.tsx          the component
  Button.states.html  a harness that renders every variant x state
  index.ts            re-export
```

The harness is not optional. It is the only way the gates can see hover, focus,
disabled, loading, and error, and the only way you can look at them.

## Naming

- Component: PascalCase (`DataTable`, not `Datatable` or `data-table`).
- Props: named for what they mean, not how they look. `variant="danger"`, not
  `variant="red"`. `isLoading`, not `spinner`.
- Variants: `primary` | `secondary` | `danger` | `ghost`. One action role, one
  variant, everywhere in the product.

## The eight states

Every interactive component ships all eight. A component that only looks right at
rest is not done.

| State | Requirement |
|---|---|
| Default | base tokens |
| Hover | `-hover` token, never a raw colour |
| Focus | visible ring, 3:1 against both neighbours, never `outline: none` alone |
| Active | `-active` token |
| Disabled | `disabled` or `aria-disabled`, no pointer events, still readable |
| Loading | spinner plus `aria-busy`, width does not jump |
| Error | error border plus a message that says how to fix it |
| Selected | `aria-selected` or `aria-current` plus a non-colour cue |

## Non-negotiable while writing one

1. No raw values. No hex, no px, no ms, no font stack. Everything is
   `var(--...)` resolved from `design-tokens.json`.
2. Token by intent. Destructive actions wear the danger token in every place they
   appear, including the confirm dialog. A blue Delete is a bug.
3. No emoji. Icons are lucide, inline SVG, `currentColor`, sized by token.
4. Composition over props. When a component needs a seventh boolean, it is two
   components.
5. Mobile first. It has to survive 280px wide before it earns a desktop layout.
6. Content is hostile. Long unbroken strings, empty lists, one item, forty items,
   a missing image, a number with nine digits. Handle them or the layout breaks
   in production instead of in review.
7. Progressive disclosure. Show only what's needed at each step: primary
   actions stay visible, secondary actions are one interaction away (a menu,
   an expand), and advanced options sit behind an explicit "Advanced" toggle
   rather than surfacing by default.

## Composition, before anything is styled

No gate can see any of this, and every one of them came out of a real review.

1. **One thing leads.** Four equal cards give the eye nowhere to land. Make the lead
   item bigger, heavier, or give it its own row.
2. **Display type is at least 2.5x the body size.** 24px over 16px is bold body text.
3. **An empty state owns its viewport** - a small block under the header with a void
   below reads as a page that failed to load.
4. **A page ends on purpose:** a footer, a summary, something that closes it.
5. **A long list needs one differentiator** (recency, status, a badge) or forty rows
   read as one row repeated.
6. **Feedback may not outrun the truth.** A success toast over an unchanged list is a
   lie the user catches immediately.
7. **A sideways-scrolling region needs a visible cue** - an edge fade or a scrollbar.
   An `aria-label` serves screen readers only.
8. **Loading is not disabled.** Keep the control at full strength, swap the label for
   a spinner. Dimming reads as "you cannot do this".
9. **Scaffolding does not ship.** Preview toggles and debug rows go behind a query
   parameter, not into the screen.

## Narrow-width defences

A layout that fits at 280px on your machine can overflow on someone else's, because
font metrics differ per platform. Prove it with `--scale=1.25` and know the causes:

1. An `<input>` keeps an intrinsic ~20-character width that sizes its grid column.
   Fix: `inline-size:100%; min-inline-size:0`.
2. A grid or flex item keeps `min-width:auto` and widens its own track. Fix:
   `min-inline-size:0`, or `grid-template-columns:minmax(0,1fr)`.
3. One unbreakable token (an email, a URL, an API key) sets min-content width. Fix:
   `overflow-wrap:anywhere` — `break-word` alone does not shrink min-content.
4. A `white-space:nowrap` tooltip or pill has no upper bound. Fix: `max-inline-size`.

And the one that hides from screenshots: an absolutely positioned `.sr-only` span
with no positioned ancestor resolves against the initial containing block, so inside
a horizontal scroller it lands outside the viewport and inflates the document's
scroll width. Give it a positioned ancestor.

## Before you call it done

```
node "${CLAUDE_PLUGIN_ROOT}/kit/scripts/verify_states.mjs"     src/components/Button/Button.states.html
node "${CLAUDE_PLUGIN_ROOT}/kit/scripts/verify_states.mjs"     src/components/Button/Button.states.html --dark
node "${CLAUDE_PLUGIN_ROOT}/kit/scripts/axe_audit.mjs"         src/components/Button/Button.states.html
node "${CLAUDE_PLUGIN_ROOT}/kit/scripts/verify_responsive.mjs" src/components/Button/Button.states.html
```

Then screenshot the harness and click every control. The gates prove contrast and
roles. They do not prove that the checkbox actually toggles.

## Output rules

When generating code for any framework:

1. **Use design tokens** — Never hardcode colors, sizes, or spacing. Always
   reference token values.
2. **Include accessibility** — Every interactive element gets ARIA attributes or
   a11y modifiers.
3. **Handle all states** — Default, hover, focus, disabled, loading, error.
4. **Support dark mode** — Use semantic color tokens that auto-switch.
5. **Responsive** — Mobile-first, breakpoint-aware.
6. **Copy-paste ready** — Code should work with minimal adaptation.
7. **Any framework** — Use `${CLAUDE_PLUGIN_ROOT}/kit/frameworks/adapter-protocol.md`
   for targets without a dedicated file; generate an adapter on demand.
8. **Output completeness** — see rule `C-15` in the registry. A partial output is
   a broken output; the rule is stated once, in `core.md`, and applies to every
   project whether or not it has a UI.
