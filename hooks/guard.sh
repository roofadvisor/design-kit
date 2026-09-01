#!/usr/bin/env bash
# f4d-kit PreToolUse guard. Exit 2 = hard block, stderr returned to Claude.
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_parse.sh"
hook_opted_in || exit 0

input=$(cat)
cmd=$(hook_field "$input" "command")
[ -z "$cmd" ] && cmd=$(hook_field "$input" "file_path")
[ -z "$cmd" ] && cmd=$(hook_field "$input" "path")

# A guard that cannot read its input must not pretend to pass. This hook is
# wired with a matcher (Write|Edit|Bash), so every payload it sees MUST yield a
# command or path — key-present-but-nothing-extracted is a parse failure, not
# a pass ({"tool_input":{}} and truncated payloads land here).
if [ -z "$cmd" ] && [ -n "$input" ]; then
  log_deny "G-03" "no extractable field from tool input"
  echo "BLOCKED: guard.sh could not extract a command or path from the tool input." >&2
  echo "Install jq or python3, or fix the hook/matcher. Refusing to allow unverified." >&2
  exit 2
fi
[ -z "$cmd" ] && exit 0

# deny <rule-id> <message>. If a deny ever needs the id UNREGISTERED, that is
# a registry-honesty gap: give the rule a row (IDs are permanent, A9) before
# shipping the deny — the fire report flags UNREGISTERED loudly for a reason.
deny() { log_deny "$1" "$cmd"; echo "BLOCKED by f4d-kit [$1]: $2" >&2; exit 2; }

shopt -s nocasematch

# nocasematch (below) turns every bare-substring pattern into an English-word
# pattern too. The rules that follow are therefore matched against the command
# with the documented-safe .env variants removed: the C-01 message tells you to
# use .env.example, so firing C-01 on .env.example contradicts the guard's own
# instruction. Removal, not a separate allow-arm — `case` stops at the first
# match, so an allow-arm for .env.example would skip every rule after it and
# `cat .env.example && git push --force` would sail through.
scrubbed=${cmd//.env.example/}
scrubbed=${scrubbed//.env.sample/}
scrubbed=${scrubbed//.env.template/}

# C-03 is checked here rather than in the case below because it needs two
# conditions, not one substring. A bare `TRUNCATE` match denies the English word
# "truncated" — that is not hypothetical, it denied this repo's own commit
# message and then denied the `grep truncate hooks/guard.sh` that went looking
# for the cause. So: either an unambiguous two-word SQL form, or a bare verb in
# a command that is demonstrably talking to a database.
sql_hit=""
case "$scrubbed" in
  *"DROP DATABASE"*|*"DROP SCHEMA"*|*"TRUNCATE TABLE"*|*"TRUNCATE ONLY"*) sql_hit=1 ;;
esac
if [ -z "$sql_hit" ]; then
  case "$scrubbed" in
    *psql*|*mysql*|*mariadb*|*sqlite3*|*psycopg*|*dbshell*|*".sql"*)
      case "$scrubbed" in
        *TRUNCATE*|*"DROP TABLE"*|*"DROP DATABASE"*|*"DROP SCHEMA"*) sql_hit=1 ;;
      esac ;;
  esac
fi
[ -n "$sql_hit" ] && deny "C-03" "destructive database operation. Use a migration, or scripts/dev-reset.sh locally."

case "$scrubbed" in
  *".env"*|*"id_rsa"*|*".pem"*|*"credentials.json"*)
      deny "C-01" "secret material is off-limits. Use .env.example and describe the variable instead." ;;
  *"keystore"*|*"mnemonic"*|*"seed phrase"*|*".key"*)
      deny "C-01" "key material is off-limits." ;;
  *"PRIVATE_KEY"*|*"SECRET_KEY"*|*"_TOKEN="*|*"API_KEY="*)
      deny "C-01" "never interpolate a credential into a command. Reference the env var by name." ;;
  # The flag itself, terminal or followed by whitespace — not every flag that
  # merely starts with it (`--broadcast-mode=off` broadcasts nothing).
  *"--broadcast"|*"--broadcast"[[:space:]]*)
      deny "KS-01" "no transaction broadcasting from an agent session. Use anvil or a fork." ;;
  # An endpoint or a network selection, not the word. `cat docs/mainnet.md` and
  # a commit message about the mainnet launch are not RPC calls.
  *"infura.io"*|*"alchemy.com"*|*"polygon-rpc.com"*|*"://"*"mainnet"*)
      deny "KS-02" "no mainnet RPC in an agent session. Use a local or forked chain." ;;
  *"--network mainnet"*|*"--network=mainnet"*|*"--chain mainnet"*|*"--chain=mainnet"*)
      deny "KS-02" "no mainnet RPC in an agent session. Use a local or forked chain." ;;
  *"--rpc-url"*"mainnet"*|*"--fork-url"*"mainnet"*)
      deny "KS-02" "no mainnet RPC in an agent session. Use a local or forked chain." ;;
  # Root and home themselves — terminal, or with a following argument or glob.
  # `rm -rf /` as a bare substring also denies `rm -rf /tmp/scratch`, which is
  # exactly where a session is told to put its scratch work.
  *"rm -rf /"|*"rm -rf ~"|*"rm -rf ~/"|*"rm -rf /"[[:space:]]*|*"rm -rf ~"[[:space:]]*|*"rm -rf /*"*|*"rm -rf ~/*"*|*":(){"*)
      deny "C-09" "destructive command." ;;
  *"git push --force"*|*"push -f "*|*"push -f")
      deny "C-02" "force-push is human-only." ;;
esac
exit 0
