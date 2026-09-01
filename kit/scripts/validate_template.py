#!/usr/bin/env python3
"""Validate that every golden example has a states-pattern reference to shape its harness.

The old standalone design-project scaffold command and its bundled starter
template are retired — scaffolding now happens through `project-init`
(skills/project-init/SKILL.md, Step 3 item 7a), which copies a component out of
`kit/examples/golden/` into every scaffolded design project as the worked
example, then GENERATES its `<Name>.states.html` harness at scaffold time.
Golden ships no `.states.html` of its own to copy — the generated harness
instead follows the grid-of-cells shape demonstrated by a same-named file under
`kit/examples/component-states/` (`Button.tsx` -> `component-states/button.html`,
`Modal.tsx` -> `modal.html`).

This gate proves that reference exists for every golden component, so
project-init is never told to generate a harness with nothing to shape it
after. A golden component missing its states pattern is invisible to every
render gate the moment someone scaffolds with it — the harness would either
not get generated at all or get generated with states invented on the spot
instead of demonstrated.

Usage:
  python3 kit/scripts/validate_template.py
Exit 0 = every golden .tsx has a states pattern; 1 = one or more are missing.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GOLDEN = ROOT / "examples" / "golden"
STATES = ROOT / "examples" / "component-states"


def check_golden_has_states_pattern():
    issues = []
    if not GOLDEN.is_dir():
        return [f"missing {GOLDEN}"]
    if not STATES.is_dir():
        return [f"missing {STATES}"]
    tsx_files = sorted(GOLDEN.glob("*.tsx"))
    if not tsx_files:
        issues.append(f"no .tsx files found under {GOLDEN} — nothing to check")
    for tsx in tsx_files:
        pattern = STATES / f"{tsx.stem.lower()}.html"
        if not pattern.exists():
            issues.append(
                f"{tsx.relative_to(ROOT)} has no matching states pattern at "
                f"{pattern.relative_to(ROOT)} — project-init would generate its "
                f"harness with nothing to shape it after"
            )
    return issues


def main():
    issues = check_golden_has_states_pattern()
    print(f"Checked {GOLDEN.relative_to(ROOT)} against {STATES.relative_to(ROOT)}.")
    if issues:
        print(f"\nFAIL: {len(issues)} problem(s):")
        for i in issues:
            print("  x " + i)
        return 1
    print("OK: every golden component has a states pattern to shape its harness.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
