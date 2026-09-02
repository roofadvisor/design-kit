#!/usr/bin/env bash
# Stop hook — refuses a silent "done" on a session that changed code but never
# ran the test suite.
#
# Uses `git status --porcelain`, not `git diff HEAD`. The latter returns nothing
# in a repo with no commits, and misses untracked files entirely — so a brand new
# source file would not count as a change and the hook would pass silently.
# That is the exact failure class this framework exists to catch.
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_parse.sh"
hook_opted_in || exit 0
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# Every added/modified/untracked path, excluding docs and config. Token
# sources are re-admitted explicitly, ahead of the blanket extension
# exclusion below: that exclusion is right for package.json/tsconfig.json/
# lockfiles but was also silently swallowing design-tokens.json and
# kit/tokens/*.json, which are a design project's source of truth, not
# project config.
#
# This is two independent filter passes over the same `git status`, unioned,
# rather than one grep -E include-list. An include-list built from a single
# alternation is tempting but wrong here: a branch meant to mean "no
# extension" (e.g. `[^.]*$`) matches a trailing empty string at the end of
# ANY line — including "package.json" — so it silently admits everything and
# defeats the exclusion entirely. Two separate, narrow passes avoid that trap.
#
# No `head` cap here. `$changed` is not just a display sample — the staleness
# loop below reads every line of it to compute `newest`. A shared cap on the
# two unioned passes starves the second pass whenever the first alone meets
# it: 20+ changed token files fill a `head -20` before a single ordinary
# source file from the second pass is ever read, so a source file modified
# after the verify marker silently never has its mtime examined, and the
# hook reports done on exactly the change it exists to catch. Reproduced by
# hand: 25 changed `kit/tokens/*.json` plus one `.ts` file modified after the
# marker — with a cap, exit 0 (wrong); without one, exit 2. Truncate only the
# human-facing sample below (already scoped to its own `head -5`), never the
# list the mtime loop walks.
changed=$(
  {
    git -C "$root" status --porcelain 2>/dev/null \
      | sed 's/^...//' \
      | grep -Ev '^(docs|\.github|\.claude)/' \
      | grep -E '(^|/)design-tokens\.json$|(^|/)kit/tokens/.*\.json$'
    git -C "$root" status --porcelain 2>/dev/null \
      | sed 's/^...//' \
      | grep -Ev '^(docs|\.github|\.claude)/' \
      | grep -Ev '\.(md|txt|json|ya?ml|lock)$'
  }
)
[ -z "$changed" ] && exit 0

marker="$root/.claude/.last-verify"
if [ ! -f "$marker" ]; then
  {
    echo "No verify run recorded this session, but source files changed:"
    printf '%s\n' "$changed" | head -5 | sed 's/^/  /'
    echo "Run the project verify command before reporting completion."
    echo "A 'done' claim not backed by a passing run is a guess about the diff."
  } >&2
  exit 2
fi

# Modification time, portably. GNU coreutils takes -c %Y; BSD/macOS takes -f %m
# and rejects -c outright ("stat: illegal option -- c").
#
# This mattered: the previous version used the GNU form only, with `|| echo 0`
# as the fallback. On macOS — the platform this kit is developed on — every call
# errored, so `mtime` and `newest` were both 0, `0 -gt 0` was false, and the
# staleness branch below could never fire. The check reported success while
# evaluating nothing. A guard that silently degrades to a pass is the exact
# failure class this repo exists to catch, and it shipped inside the guard.
mtime_of() {
  stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || return 1
}

# Stale if any changed source file is newer than the last verify.
if ! mtime=$(mtime_of "$marker"); then
  # G-03: a guard that cannot evaluate its input must block, not allow.
  echo "done-check: cannot read the mtime of $marker — refusing to certify done." >&2
  echo "Neither 'stat -c %Y' (GNU) nor 'stat -f %m' (BSD) worked on this host." >&2
  exit 2
fi

newest=0
while IFS= read -r f; do
  [ -f "$root/$f" ] || continue
  if ! t=$(mtime_of "$root/$f"); then
    echo "done-check: cannot read the mtime of $f — refusing to certify done." >&2
    exit 2
  fi
  [ "$t" -gt "$newest" ] && newest=$t
done <<< "$changed"

if [ "$newest" -gt "$mtime" ]; then
  echo "Source changed after the last verify run. Re-run verify before claiming done." >&2
  exit 2
fi
exit 0
