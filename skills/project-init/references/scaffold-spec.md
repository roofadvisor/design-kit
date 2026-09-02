# Scaffold Spec

Exact layout and content rules. Templates live in `${CLAUDE_PLUGIN_ROOT}/templates/`.

## Init state file

`.claude/.init-state.json` makes `/project-init` resumable. Written after each
completed interview round, updated at plan confirmation and after every scaffold
write, deleted only when Step 4 verification passes. Gitignored (in
`gitignore.tmpl`) — local working state, never shared. This section is the single
source for its shape; do not restate the fields elsewhere.

```json
{
  "mode": "NEW",
  "round": 2,
  "answers": { "company": "F4 Digital", "backend_language": "typescript" },
  "decided_modules": [],
  "preexisting": null,
  "written_files": [],
  "phases": {}
}
```

- `mode` — `NEW` or `RETROFIT`, as confirmed with the user.
- `round` — the last **completed** interview round (0–3). Plan confirmation (Step 2) sets it to `4`.
- `answers` — question-key → answer, accumulated across rounds. Keys are short slugs; the value is the user's settled answer, not the raw reply.
- `decided_modules` — empty until Step 2 approval, then the confirmed module list.
- `preexisting` — **`null` until captured; capture exactly when it is `null`, at entry into Step 3.** `null` means "inventory not taken yet"; `[]` means "taken, and the directory had no planned targets" — the two must never be conflated, because a saved plan writes state (with `null`) before execution, and a resume must never recapture (a file *we* wrote must not be reclassified as pre-existing) while first execution after a saved plan **must** capture (a file created between plan and execution must land in the inventory). This is what lets a resume tell "was here before us" from "our write was interrupted".
- `written_files` — paths whose write **completed**, appended after each write.
- `phases` — non-file steps that completed, e.g. `{"scaffold_commit": true, "baseline_recorded": true, "repo_variable_set": true}`. File writes are not the only resumable work.

Resume rules:

- **Schema check before anything else:** a parseable state file missing fields
  this spec requires (`preexisting`, `phases`) is a legacy or foreign schema —
  treat it exactly like the corrupt case in Step 0: show it, offer
  discard-or-stop. Never default a missing `preexisting` to `[]`; in RETROFIT
  that silently reclassifies every pre-existing target as safe to rewrite.
- Write state after a round completes, never mid-round.
- Skip exactly the files in `written_files`.
- A planned file **not** in `written_files`: if it is in `preexisting`, redo the retrofit-safe operation for it — those operations must be idempotent by construction (append checks for its entries first; `.proposed` files are simply rewritten). If it is not in `preexisting`, rewrite it outright; content is deterministic given `answers`.
- Pre-existing files always stay under the retrofit never-overwrite rules; `written_files` never authorizes replacing one.
- Skip any phase recorded `true` in `phases`. The scaffold commit **must** be recorded — an interrupted run that committed and then resumed would otherwise fail on `nothing to commit`. Idempotent side effects (re-recording the baseline, re-setting a repo variable to the same value) may safely re-run if unrecorded.
- Delete the file only after Step 4 verification passes. Interrupted ≠ failed: both keep the state.

## Target layout (NEW mode)

```
<project>/
├── CLAUDE.md                   # < 80 lines. Loads every turn.
├── README.md                   # human-facing. Different audience, different file.
├── .gitignore
├── .env.example
├── docker-compose.yml
├── scripts/dev-reset.sh
├── .github/workflows/verify.yml
└── .claude/
    ├── settings.json
    ├── rules/                  # selected modules only
    └── agents/                 # selected agents only
```

## .claude/settings.json content (NEW mode)

Exact content — this is the single source for its shape; do not restate it
elsewhere. **Wires only `guard-local.sh`:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Read|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/guard-local.sh"
          }
        ]
      }
    ]
  }
}
```

**Never add entries here for `guard.sh`, `rule-zero.sh`, `done-check.sh`,
`format.sh`, `verify-record.sh`, or `session-context.sh` — not even with an
absolute or `${CLAUDE_PLUGIN_ROOT}`-based path.** A18: `${CLAUDE_PLUGIN_ROOT}`
resolves only inside a *plugin's own* `hooks/hooks.json`, never inside a
project's `.claude/settings.json` — a command built from it there is silently
skipped, not run with an empty value (measured on CLI 2.1.220). Those six hooks
are declared exactly once, globally, in the plugin's `hooks/hooks.json`, and
each gates itself on this project's `.claude/.framework-state.json` (step 7)
before doing anything else. Adding a redundant project-level entry for one of
them does not make it "more wired" — at best it duplicates the plugin's own
global firing (extra subprocess per matched tool call, a second
`.enforcement-log` line per real deny), and if written with the broken
`${CLAUDE_PLUGIN_ROOT}` form, it does nothing at all while looking identical to
the working entries. `guard-local.sh` is the one hook that belongs here: it is
copied *into* the project (step 5), so a relative path is correct and is what
makes it survive the plugin being absent entirely.

## CLAUDE.md assembly

From `${CLAUDE_PLUGIN_ROOT}/templates/scaffold/CLAUDE.md.tmpl`. Fill every `{{TOKEN}}`. Leave no placeholder behind.

- `{{ARCH_MAP}}` — 3–8 lines. What the pieces are and how requests flow. No prose paragraphs.
- `{{RULES_INDEX}}` — one line per selected module: `` - `api.md` — HTTP surface, error envelope, versioning ``
- `{{INTEGRATIONS_TABLE}}` — from interview Q5: `| System | Direction | Metered | Adapter |`
- `{{CANONICAL_RULE}}` — from the reconciliation follow-up. If the user had no answer, write: `NOT YET DECIDED — do not build reconciliation logic until this is defined.`

**Hard limit: 80 lines.** If it exceeds that, move detail into a rules module. The file is a router, not a manual.

## Verify command by stack

| Stack | Verify |
|---|---|
| Python only | `uv run ruff check . && uv run mypy . && uv run pytest` |
| TS only | `pnpm typecheck && pnpm lint && pnpm test` |
| Both | chain them with `&&`, Python first |
| + contracts module | append `&& pnpm contracts:check` |
| + blockchain module | append `&& forge fmt --check && forge test && forge snapshot --check` |
| + any design module (`design-tokens` / `design-a11y` / `design-components` in `decided_modules`) | append `&&` followed by the **design-gate resolver fragment** below, verbatim |

Write it once, identically, in three places: `CLAUDE.md`, the `verify` script, and the CI workflow. If they can drift, they will.

### Design-gate resolver fragment

The fragment below is shown as a code block, not inside the table above, on
purpose: it is long enough, and contains enough literal `|` characters (inside
`||`), that a Markdown table cell would force a choice between two bad
outcomes — leave the pipes unescaped and GitHub's own table renderer silently
truncates the cell at the first one (confirmed against the real
`api.github.com/markdown` GFM endpoint before writing this down), or
backslash-escape them for the renderer's sake and hand every future
`/project-init` run a copy contaminated with literal backslashes it would
paste straight into a real project's shell script. A fenced code block has
neither failure mode: nothing here needs escaping, so the copy any agent
reads is byte-identical to the copy that runs.

```sh
&& { if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then node "${CLAUDE_PLUGIN_ROOT}/kit/scripts/accuracy_report.mjs"; else R="$(node -e 'const fs=require("fs"),p=require("path"),os=require("os");let r="";try{const c=process.env.CLAUDE_CONFIG_DIR||p.join(os.homedir(),".claude");const j=JSON.parse(fs.readFileSync(p.join(c,"plugins","installed_plugins.json"),"utf8"));const nm=Object.keys(j.plugins||{}).find(nm=>nm.startsWith("dev-kit@"));const es=nm?j.plugins[nm]:[];const e=es.find(x=>x.scope==="user")||es[0];if(e&&e.installPath)r=e.installPath}catch(e){}process.stdout.write(r)' 2>/dev/null)"; if [ -n "$R" ] && [ -f "$R/kit/scripts/accuracy_report.mjs" ]; then node "$R/kit/scripts/accuracy_report.mjs"; else echo "design gate: SKIPPED — dev-kit plugin not found (no CLAUDE_PLUGIN_ROOT, and no dev-kit@* entry with a valid kit/ in installed_plugins.json); a skipped gate is not a passed gate"; fi; fi; }
```

One line, no exceptions — it is appended after `&&` into a single shell
command in `CLAUDE.md`'s fenced block, a `package.json`/`Makefile` verify
target, and `templates/scaffold/verify.yml.tmpl`'s `run:` step alike, and a
line break anywhere in the middle would break the `node -e` argument.
(`templates/scaffold/verify.yml.tmpl`'s `Verify` step renders `{{VERIFY}}`
inside a `run: |` block scalar, not a bare `run: {{VERIFY}}` line, precisely
so this fragment's embedded `echo "…: …"` text — which contains a `: ` that
a YAML plain scalar cannot safely carry — survives the substitution; confirmed
both ways with `yaml.safe_load` before making that change.)

**Why this resolves the plugin's location itself, instead of trusting `${CLAUDE_PLUGIN_ROOT}` as a shell variable.** An earlier version of this row read `[ -z "${CLAUDE_PLUGIN_ROOT:-}" ]` as a proxy for "no Claude Code session." It is not one: `${CLAUDE_PLUGIN_ROOT}` is not an environment variable Claude Code exports to subprocesses. It is resolved by **text substitution scoped to the plugin's own `hooks/hooks.json`** (`docs/acceptance/2026-08-12-a18-plugin-declared-hooks.md`; `docs/BACKLOG.md` calls it "plugin-hook-only") — it does not reach a project's `.claude/settings.json`, and it is not set for an ordinary Bash tool call, a `verify` script, or a CI runner. Confirmed empirically: in a plain Claude Code Bash tool call, both `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PROJECT_DIR` are unset. A guard reading it that way is therefore true in the exact case it exists to serve, and the gate never fires — every other working use of this variable anywhere in this plugin is prose an agent reads and retypes, never shell expansion, and this row cannot be the one exception.

The row now resolves the root itself, in order:

1. **`$CLAUDE_PLUGIN_ROOT`, if already set** — genuinely correct exactly where Claude Code performs the substitution above: inside a plugin-declared `hooks/hooks.json` command, or a shell where a human has manually exported it. Trusted without a pre-check: if it is set but wrong, `node` fails loudly (`Cannot find module …`) rather than being silently downgraded to `SKIPPED` — a deliberately-or-accidentally wrong override is a real error, not a routine absence, and should say so.
2. **Otherwise, `~/.claude/plugins/installed_plugins.json`** (or `$CLAUDE_CONFIG_DIR/plugins/installed_plugins.json`, the same override `claude` itself honors). This is Claude Code's own installed-plugin registry, keyed `<plugin>@<marketplace>`; each entry carries `installPath` and `version` — inspected directly against a real install before relying on the shape. The fragment takes the first key starting `dev-kit@`, prefers the entry with `"scope": "user"`, and reads `installPath`. **This is the path that actually matters**: it is what resolves in a plain `bash verify.sh` or `npm run verify`, and therefore in `ship-it` step 1 — none of which are a plugin-declared hook, all of which are real invocations of this exact command, in an ordinary shell with no Claude-specific environment at all.
3. **Neither resolves** — the registry file is absent, unparsable, has no `dev-kit@*` entry, or its recorded `installPath` no longer contains a `kit/scripts/accuracy_report.mjs` (a stale entry from a moved or uninstalled plugin): print `design gate: SKIPPED — …` naming the reason, and exit 0. The line says outright that a skipped gate is not a passed gate; it must not fail the whole verify command over a precondition this project does not control — a project whose plugin was uninstalled should still be able to run its other checks.

**Why this resolution logic is copied into every scaffolded project's verify command, rather than shipped once as a plugin script.** This fragment's entire job is to find the plugin *before* anything is known about where it is. A script that solved that by living at `${CLAUDE_PLUGIN_ROOT}/kit/scripts/some-resolver.mjs` would need `${CLAUDE_PLUGIN_ROOT}` already resolved just to be invoked — exactly the value branch 2 above exists to produce when it isn't. Shipping the resolver does not remove the bootstrap step; it relocates the same "where is the plugin" problem one level down and adds a call site that fails the same way for the same reason. Only the part that runs *after* the root is known — `accuracy_report.mjs` itself — safely delegates to a shipped, centrally-fixable script, in both branches above. The resolution logic stays deliberately small (one `node -e`, no dependency beyond `node`, already assumed by every design-gate invocation in this table) precisely because it is the one part that cannot be centralized: a future fix to it reaches already-scaffolded projects the way any other templated fragment does, through `framework-upgrade`, not through a plugin version bump alone. That cost is real and is accepted with the choice, not hidden by it.

**Why `templates/github/gates.yml` still gets no design job.** `accuracy_report.mjs` (what `/gate` runs) is the *plugin's* own self-check: every one of its checks runs against its own bundled `kit/` tokens and example harnesses — its `KIT_ROOT` constant is hardcoded to its own directory, never to this project's `design-tokens.json` or `src/components/`. A bare GitHub Actions runner satisfies neither resolution branch above — it has no live Claude Code session to set `$CLAUDE_PLUGIN_ROOT`, and no local `~/.claude/plugins/installed_plugins.json` either, since the CLI was never installed there. Both paths correctly land on the same honest `SKIPPED`, which is exactly why an unguarded command would have been worse than useless: byte-identical in `CLAUDE.md`, the `verify` script, and the CI workflow (Step 10 renders `{{VERIFY}}` from the same command Step 9 wrote), yet silently broken in CI on every PR, forever. `templates/github/gates.yml` gets no matching design job for the same reason one level up: making one work for real would mean vendoring `kit/`'s scripts, tokens, and example harnesses, plus a Playwright/Chromium install, into every scaffolded project's CI checkout — reviving the copy-the-engine-into-every-project model duplicate review #1 retired for this merge (see the merge design doc). `skills/project-audit/SKILL.md` § *Design* already treats "Playwright unresolvable" as a reported finding rather than a silent pass; the guarded line above applies that same honesty automatically, on every verify run, instead of waiting for an audit to notice it.

## Toolchain pins

```bash
# Python
uv init --python 3.12
uv add --dev ruff mypy pytest hypothesis

# TypeScript
corepack enable && corepack use pnpm@latest

# Solidity (blockchain module only)
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

Commit `.python-version`, `uv.lock`, `packageManager` in package.json, `pnpm-lock.yaml`, `foundry.toml`.

## Seed data requirements

A seed that only contains happy-path rows is worse than none — it teaches Claude the schema is simpler than it is. Every seed includes:

- A row with nulls in every nullable column
- A unicode name and an apostrophe in a text field
- A soft-deleted row, if soft delete exists
- Two rows from different sources describing the same real entity, if data-integration is enabled
- A record at the boundary of every constraint (max length, zero, negative where allowed)
- If storage: one small file, one at the size limit, one with a unicode filename

## Commit sequence

```bash
git init
git add -A
git commit -m "chore: project scaffold via dev-kit"
```

One commit. Do not split the scaffold across several.

## RETROFIT specifics

- Write `CLAUDE.md.proposed`, never overwrite.
- Detect and adopt: package manager (lockfile present), indent style, existing test runner, existing lint config. The template yields to reality.
- Add `.claude/` even if nothing else changes — that alone is most of the value.
- Do not add docker-compose if the repo already has a working local setup. Document the existing one in CLAUDE.md instead.
