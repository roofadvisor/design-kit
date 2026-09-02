#!/usr/bin/env python3
"""Browse the design-system library.

Reads taste/aesthetic-systems.md — the catalog this plugin actually ships —
rather than a design-systems/library/ tree of per-system directories, which it
deliberately does not (the full library is 1.7 MB; see PROVENANCE.md). An
earlier version read that tree and answered every invocation with
"No library at ...", which is honest and useless.

Each catalog entry carries a name, a one-line characterisation, and a pointer to
its full spec: seven are inline in the catalog itself, the other 131 link to
their DESIGN.md upstream at plugin87/ux-ui-agent-skills, pinned.

Usage:
  python3 scripts/design_systems.py list                 # all systems by category
  python3 scripts/design_systems.py search <term>        # name/description match
  python3 scripts/design_systems.py show <name>          # characterisation + where the spec is
  python3 scripts/design_systems.py categories           # category counts
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "taste" / "aesthetic-systems.md"

# - [`name`](target) — description
ENTRY = re.compile(r"^- \[`([^`]+)`\]\(([^)]+)\)\s+—\s+(.*)$")
HEADING = re.compile(r"^#{2,4}\s+(.+?)\s*(?:\(\d+\))?\s*$")


def systems():
    """{name: (category, description, target)} parsed from the catalog."""
    if not CATALOG.is_file():
        return {}
    out, cat = {}, "Uncategorized"
    for line in CATALOG.read_text(errors="ignore").splitlines():
        h = HEADING.match(line)
        if h:
            cat = h.group(1).strip()
            continue
        m = ENTRY.match(line)
        if m:
            name, target, desc = m.group(1), m.group(2), m.group(3).strip()
            out.setdefault(name, (cat, desc, target))
    return out


def where(target):
    """Human-readable location of the full spec."""
    if target.startswith("#"):
        return f"inline in {CATALOG.name}, section {target}"
    return target


def cmd_list(s):
    by_cat = {}
    for name, (cat, desc, _) in s.items():
        by_cat.setdefault(cat, []).append((name, desc))
    for cat in sorted(by_cat):
        print(f"\n{cat} ({len(by_cat[cat])})")
        for name, desc in sorted(by_cat[cat]):
            print(f"  {name:24} {desc[:60]}")


def cmd_search(s, term):
    t = term.lower()
    hits = [(n, d) for n, (c, d, _) in s.items()
            if t in n.lower() or t in d.lower() or t in c.lower()]
    if not hits:
        print(f"No match for {term!r}.")
        return
    for n, d in sorted(hits):
        print(f"  {n:24} {d[:60]}")


def cmd_show(s, name):
    if name not in s:
        print(f"Unknown system {name!r}. Try: search {name}")
        return 1
    cat, desc, target = s[name]
    print(f"{name}  [{cat}]\n{desc}\n\nSpec: {where(target)}")
    print("Apply: resolve into tokens via the Library Contract in "
          f"{CATALOG.name}, then map values per design-systems/interop-protocol.md")
    return 0


def main(argv):
    s = systems()
    if not s:
        # The catalog is shipped, so its absence is a broken install, not the
        # expected "library not bundled" case the old script reported.
        print(f"Catalog not found or unparsable: {CATALOG}")
        return 1
    if not argv or argv[0] == "list":
        cmd_list(s)
    elif argv[0] == "categories":
        from collections import Counter
        c = Counter(cat for cat, _, _ in s.values())
        for cat, n in sorted(c.items()):
            print(f"  {n:3}  {cat}")
        print(f"\nTotal: {len(s)} systems")
    elif argv[0] == "search" and len(argv) > 1:
        cmd_search(s, argv[1])
    elif argv[0] == "show" and len(argv) > 1:
        return cmd_show(s, argv[1])
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
