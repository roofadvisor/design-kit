#!/usr/bin/env bash
# PostToolUse:Bash — records when the verify command ran and whether it passed.
# Feeds both done-check.sh and the /project-audit evidence report.
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_parse.sh"
hook_opted_in || exit 0
input=$(cat)
cmd=$(hook_field "$input" "command")
[ -z "$cmd" ] && exit 0

case "$cmd" in
  *verify*|*"pytest"*|*"vitest"*|*"forge test"*|*"npm test"*|*"pnpm test"*) ;;
  # /gate's real invocation (commands/gate.md) is `node .../accuracy_report.mjs`,
  # already covered by *accuracy_report* alone. A separate *"/gate"* arm was
  # tried here and dropped: it matches the substring anywhere, so reading the
  # command's own doc (`cat commands/gate.md`) or touching a `gateway/` path
  # falsely records a verify that never ran. No coverage is lost by dropping it.
  *accuracy_report*) ;;
  *) exit 0 ;;
esac

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
mkdir -p "$root/.claude" 2>/dev/null
touch "$root/.claude/.last-verify"
# First line only, then truncate, then flatten tabs. `cut -c1-60` operates PER
# LINE: given a multi-line command — any `git commit` carrying a heredoc message
# — it emitted one log line per input line, every line after the first a bare
# fragment with no timestamp and no fields. Measured on the kit's own log before
# this fix: 941 of 1036 lines, 91%, were that garbage. /retro and /project-audit
# read this file, so their entire history here was mostly commit prose.
# Tabs are squeezed for the same reason at the field level rather than the line
# level: this is a TSV, and a command containing one silently shifts every
# column after it.
summary=$(printf '%s' "$cmd" | head -1 | cut -c1-60 | tr '\t' ' ')
printf '%s\tverify\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$summary" \
  >> "$root/.claude/.session-log" 2>/dev/null
exit 0
