---
id: design-handoff
always_apply: false
---
# Design handoff

Loaded when a design is ready to hand off to implementation, or when closing out
a component.

## Handoff checklist

Before marking a design ready for development:

1. All values mapped to design tokens (zero hardcoded values).
2. All 8 states documented per interactive element.
3. Edge cases addressed (long text, empty, overflow, single item, many items).
4. Responsive behavior spec'd at each breakpoint.
5. Animation spec'd (property, duration, easing, reduced-motion fallback).
6. Accessibility annotations (ARIA roles, keyboard model, focus management).

## Definition of done

A component is done when:

- **Functional** — all variants, states, and edge cases work.
- **Visual** — pixel-accurate, all values are tokens, responsive, dark mode.
- **Accessible** — keyboard, screen reader, contrast, target size.
- **Code quality** — TypeScript, no `any`, `forwardRef`, `cva`.
- **Tested** — unit, visual regression, automated a11y, manual screen reader.

Full workflow: `${CLAUDE_PLUGIN_ROOT}/kit/workflows/design-to-code.md`.
