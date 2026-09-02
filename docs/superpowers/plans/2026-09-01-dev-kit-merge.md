# dev-kit Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `design-kit@roofadvisor` 1.0.0 and `f4d-kit@f4d` 1.23.8 into a single `dev-kit` 2.0.0 plugin in the roofadvisor account, with design doctrine entering f4d-kit's rules/interview/enforcement machinery rather than sitting beside it.

**Architecture:** f4d-kit's tree is the base — it owns the interview, rules registry, hooks, and scripts. design-kit's `kit/` becomes a plugin-root asset directory referenced by `${CLAUDE_PLUGIN_ROOT}`. Design doctrine lands as four new rules modules plus one change to `core.md`. The design gate hangs off the existing `scripts/verify.sh` entry point, which already exists specifically to satisfy `done-check.sh`.

**Tech Stack:** Claude Code plugin manifests, Markdown skills/rules with YAML frontmatter, Bash hooks, Python 3 validators (`render_registry.py`, `render_instructions.py`, `check_instruction_honesty.py`), Node ESM gate scripts, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-01-dev-kit-merge-design.md`

## Global Constraints

- Plugin id is `dev-kit`, version `2.0.0`, marketplace `roofadvisor`. Every skill namespace becomes `dev-kit:*`.
- `${CLAUDE_PLUGIN_ROOT}` does **not** resolve inside a project's `.claude/settings.json` (A18). Hooks are declared only in the plugin's own `hooks/hooks.json` and self-gate via `hook_opted_in()`.
- Every hook must fail closed: a guard that cannot evaluate its input exits 2, never 0 (G-03).
- Rules modules carry frontmatter `id:` and `always_apply:`. `REGISTRY.md` is never copied into a project.
- Registry status vocabulary is fixed: `HOOK` / `TEST` / `GATE` / `AGENT` / `LINT` /
  `PROSE` / `JUDGMENT`. A rule with no enforcement is recorded, never omitted.
  `PROSE` and `JUDGMENT` are not interchangeable: `PROSE` means "written down only,
  **will eventually be ignored**" — a debt state someone should later mechanise.
  `JUDGMENT` means "correctly prose, mechanising it would produce false positives" —
  a finished state. Filing a judgment call as `PROSE` invites a future contributor
  to automate something that should not be automated.
- After any registry or module change, `bash tests/render_registry_test.sh` must pass.
  Note: bare `python3 scripts/render_registry.py --validate` does NOT work in this repo —
  it renders a *project's* `.claude/rules/manifest.json` against the plugin's registry, and
  the plugin repo holds no project manifest, so it errors with
  `--plugin not given and CLAUDE_PLUGIN_ROOT unset`. The test harness supplies fixture
  manifests and is the correct check here.
- No emoji in any shipped instruction surface (`check_no_emoji.py`).
- Design gates need Playwright resolvable from the invoking directory. A skipped gate is never a passed gate.

---

## File Structure

**Base tree (from f4d-kit, unchanged unless noted):**
- `hooks/` — 8 scripts + `hooks.json`. Modified: `verify-record.sh`, `done-check.sh`.
- `scripts/` — Python validators + `verify.sh`. Modified: `verify.sh`.
- `templates/rules/` — 22 modules + `REGISTRY.md`. Deleted: `frontend.md`. Added: 5 modules. Modified: `core.md`.
- `templates/process/`, `templates/github/`, `templates/scaffold/`, `templates/org/`, `templates/notion/`, `templates/tests/` — unchanged.
- `skills/` — 15 f4d skills. Modified: `project-init`, `ship-it`, `project-audit`, `framework-upgrade`, `governance` (incoming).
- `agents/` — 4 f4d agents + `design-critic` incoming.
- `tests/` — 10 harnesses. Modified: `hooks_test.sh`.

**Incoming from design-kit:**
- `kit/` — tokens, components, taste, workflows, frameworks, accessibility, content, design-systems, examples, scripts. Deleted: `kit/rules/` (7 files), `kit/templates/product-design/`.
- `skills/` — 17 design skills (24 minus 7 aesthetics).
- `commands/` — `gate.md`, `critique.md` only (`ship.md`, `scaffold-project.md` retire).

**Net component count:** 32 skills, 2 commands, 5 agents, 4 hook events.

---

### Task 1: Establish the merged tree and manifest

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Create: `kit/` (copied from design-kit), `commands/gate.md`, `commands/critique.md`, `agents/design-critic.md`
- Create: `skills/<17 design skills>/`
- Test: `claude plugin validate .`

**Interfaces:**
- Consumes: nothing — this is the base.
- Produces: a tree where `${CLAUDE_PLUGIN_ROOT}` resolves to the repo root, `kit/` sits at that root, and every design skill's existing `${CLAUDE_PLUGIN_ROOT}/kit/...` path resolves unchanged.

- [ ] **Step 1: Rename the GitHub repo and update the local remote**

```bash
gh repo rename dev-kit --repo roofadvisor/design-kit
git remote set-url origin https://github.com/roofadvisor/dev-kit.git
git remote -v
```

Expected: both lines show `roofadvisor/dev-kit.git`. GitHub preserves a redirect from the old name.

- [ ] **Step 2: Copy the f4d-kit tree in, excluding its manifest and git metadata**

```bash
F4D=/Users/ian-ra/code-projects/f4d/f4d-dev-env-configurator
rsync -a --exclude '.git' --exclude '.claude-plugin' --exclude 'docs/superpowers' \
  "$F4D"/{hooks,scripts,templates,tests,agents,skills,docs} .
ls hooks/ scripts/ templates/rules/ | head -20
```

Expected: `hooks/hooks.json` present, `scripts/verify.sh` present, `templates/rules/REGISTRY.md` present.

- [ ] **Step 3: Write the merged plugin manifest**

```json
{
  "name": "dev-kit",
  "version": "2.0.0",
  "description": "Development and design framework: interview-driven scaffolding, composable rules modules, safety hooks, audit agents, DTCG design tokens, component specs, and WCAG verification gates.",
  "author": {
    "name": "RoofAdvisor"
  }
}
```

- [ ] **Step 4: Write the marketplace manifest**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "roofadvisor",
  "description": "RoofAdvisor's Claude Code plugins.",
  "owner": {
    "name": "RoofAdvisor"
  },
  "plugins": [
    {
      "name": "dev-kit",
      "source": "./",
      "description": "Development and design framework: lifecycle process, interview-driven scaffolding, composable rules modules, safety hooks, audit agents, design tokens, and WCAG verification gates.",
      "category": "workflow"
    }
  ]
}
```

- [ ] **Step 5: Verify the manifest and component inventory**

```bash
claude plugin validate .
```

Expected: `Validation passed` with no errors. Warnings about description are acceptable.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin hooks scripts templates tests agents skills docs kit commands
git commit -m "feat: merge f4d-kit tree into dev-kit 2.0.0"
```

---

### Task 2: Retire the 7 aesthetic skills into the catalog

**Files:**
- Modify: `kit/taste/aesthetic-systems.md`
- Delete: `skills/{clean,modern,friendly,premium,refined,spacious,enterprise}/`
- Test: `python3 kit/scripts/check_no_emoji.py`

**Interfaces:**
- Consumes: Task 1's tree.
- Produces: `apply-aesthetic` resolves all seven directions from the catalog; seven fewer always-on skill descriptions.

- [ ] **Step 1: Record the baseline always-on cost**

```bash
claude plugin details dev-kit | grep -A2 "Projected token cost"
```

Write the number down. It is the before-figure for Step 5.

- [ ] **Step 2: Append each aesthetic's DESIGN.md as a catalog entry**

For each of the seven, append its `DESIGN.md` body under a new `### <name>` heading in the archetype section of `kit/taste/aesthetic-systems.md`, preserving the Library Contract format the file already uses for its other archetypes.

```bash
for a in clean modern friendly premium refined spacious enterprise; do
  { printf '\n### %s\n\n' "$a"; sed '1{/^---$/,/^---$/d}' "skills/$a/DESIGN.md"; } \
    >> kit/taste/aesthetic-systems.md
done
grep -c '^### ' kit/taste/aesthetic-systems.md
```

Expected: the count increases by exactly 7.

- [ ] **Step 3: Delete the seven skill wrappers**

```bash
git rm -r skills/clean skills/modern skills/friendly skills/premium \
          skills/refined skills/spacious skills/enterprise
```

- [ ] **Step 4: Verify no skill or command still references them**

```bash
grep -rnE 'design-kit:(clean|modern|friendly|premium|refined|spacious|enterprise)|skills/(clean|modern|friendly|premium|refined|spacious|enterprise)' skills/ commands/ agents/ kit/ || echo "NO DANGLING REFERENCES"
```

Expected: `NO DANGLING REFERENCES`.

- [ ] **Step 5: Confirm the cost dropped and the catalog is clean**

```bash
claude plugin details dev-kit | grep -A2 "Projected token cost"
python3 kit/scripts/check_no_emoji.py
```

Expected: always-on lower than Step 1; `check_no_emoji.py` exits 0.

- [ ] **Step 6: Commit**

```bash
git add kit/taste/aesthetic-systems.md skills
git commit -m "refactor: fold 7 aesthetic skills into the aesthetic-systems catalog"
```

---

### Task 3: Create the four design rules modules

**Files:**
- Create: `templates/rules/design-tokens.md`, `design-a11y.md`, `design-components.md`, `design-handoff.md`
- Delete: `templates/rules/frontend.md`
- Test: `bash tests/render_registry_test.sh`

**Interfaces:**
- Consumes: Task 1's tree.
- Produces: module ids `design-tokens`, `design-a11y`, `design-components`, `design-handoff` — referenced by Task 4's registry rows, Task 6's interview, and Task 9's `ship-it` change.

- [ ] **Step 1: Write `design-tokens.md` from the template source plus salvaged doctrine**

Seed from `kit/templates/product-design/.claude/rules/tokens.md`. Add the Major Third scale and 7 type rules, and the 4px base and 4 spacing rules, from `kit/rules/typography-and-spacing.md`. Add the motion rules from `kit/rules/brand-and-operations.md` § Motion Design. Frontmatter:

```markdown
---
id: design-tokens
always_apply: false
---
# Design tokens
```

Every script path rewrites from project-relative to plugin-relative — `python3 scripts/validate_tokens.py` becomes `python3 "${CLAUDE_PLUGIN_ROOT}/kit/scripts/validate_tokens.py"`.

- [ ] **Step 2: Write `design-a11y.md`**

Seed verbatim from `kit/templates/product-design/.claude/rules/accessibility.md` (2,053b — the larger of the two versions; `kit/rules/accessibility.md` at 1,456b is superseded). Frontmatter `id: design-a11y`, `always_apply: false`. Rewrite all ten gate-script paths to `${CLAUDE_PLUGIN_ROOT}/kit/scripts/`.

- [ ] **Step 3: Write `design-components.md`**

Seed from `kit/templates/product-design/.claude/rules/components.md`. Append the 8 Output Rules from `kit/rules/frameworks.md`. The completeness rule cites the core registry ID rather than restating the prose:

```markdown
8. **Output completeness** — see rule `C-15` in the registry. A partial output is
   a broken output; the rule is stated once, in `core.md`, and applies to every
   project whether or not it has a UI.
```

- [ ] **Step 4: Write `design-handoff.md`**

Seed from `kit/rules/review-and-research.md` § Design-to-Code Handoff — the 6-item handoff checklist and the component Definition of Done. Frontmatter `id: design-handoff`, `always_apply: false`.

- [ ] **Step 5: Promote the output-completeness rule to `core.md`**

`design-components.md` (Step 3) cites `C-15`. Create it here, before anything
validates, so the citation resolves. Append the rule to `templates/rules/core.md`
and its row under `## Core` in `templates/rules/REGISTRY.md`:

```markdown
- A partial output is a broken output. Deliver whole files, never placeholders
  such as `// ... rest unchanged`. If asked for N items, deliver all N. Split at
  clean boundaries only when length forces it, and continue to completion.
```

```markdown
| C-15 | A partial output is a broken output — no placeholders, deliver all N | LINT | **PROSE** | open |
```

Status is `PROSE` because nothing enforces it yet. Recording it honestly is the point; claiming `LINT` with no linter would be worse than omitting it.

- [ ] **Step 6: Delete the superseded module**

```bash
git rm templates/rules/frontend.md
grep -rn "frontend" templates/rules/REGISTRY.md skills/project-init/SKILL.md | head
```

Expected: hits are the rows and interview line Task 4 and Task 6 update. Note them.

- [ ] **Step 7: Verify every module parses and no path is stale**

```bash
bash tests/render_registry_test.sh
grep -rn 'python3 scripts/\|node scripts/' templates/rules/design-*.md || echo "ALL PATHS PLUGIN-RELATIVE"
```

Expected: validator exits 0; `ALL PATHS PLUGIN-RELATIVE`.

- [ ] **Step 8: Commit**

```bash
git add templates/rules
git commit -m "feat: design rules modules replace frontend.md; C-15 to core"
```

---

### Task 4: Register the design rules

**Files:**
- Modify: `templates/rules/REGISTRY.md`, `templates/rules/core.md`
- Test: `bash tests/render_registry_test.sh`

**Interfaces:**
- Consumes: Task 3's four module ids and its `C-15` row.
- Produces: a `## Design` section whose `D-*` IDs `project-init` writes into `manifest.json` and `project-audit` checks.

- [ ] **Step 0: Restore `.github/`, omitted by Task 1's rsync**

Added 2026-09-01 (ruling R-09). Task 1's rsync list enumerated visible
directories and missed both dotfile directories. `.claude/` was caught during
Task 1; `.github/` was not. Three tracked files are absent, so the merged plugin
currently has **no CI at all**:

```bash
F4D=/Users/ian-ra/code-projects/f4d/f4d-dev-env-configurator
rsync -a "$F4D/.github" .
git add .github && ls .github/workflows/
```

Expected: `dependabot.yml`, `workflows/gates.yml`, `workflows/main-verify.yml`.

This is not cosmetic. `bash tests/conformance_test.sh` currently reports
`pass=48 fail=1` here against `pass=49 fail=0` upstream, failing on
*"gates.yml has no pinned 'pip install pyyaml==X.Y.Z'"* — it is asserting against
the repo's own `.github/workflows/gates.yml`, which does not exist. Tasks 6 and 11
both gate on this suite, so fix it here or they inherit a confusing failure that
has nothing to do with their work.

Verify: `bash tests/conformance_test.sh` returns `pass=49 fail=0`.

- [ ] **Step 1: Add the `## Design` section**

```markdown
## Design

| ID | Rule | Should | Today | Status |
|---|---|---|---|---|
| DS-01 | No hardcoded colour, size, or timing — every value is a token | GATE | PROSE | lint_hardcodes wired into an automatic gate |
| DS-02 | A component never reads a primitive token | GATE | PROSE | open |
| DS-03 | Every token has a light and a dark value | GATE | PROSE | a per-token light/dark completeness check, wired into an automatic gate |
| DS-04 | Text meets WCAG 2.2 AA in both themes, measured not assumed | GATE | PROSE | verify_states/validate_contrast wired into an automatic gate |
| DS-05 | Every interactive component ships all eight states | GATE | PROSE | an eight-state completeness check, wired into an automatic gate |
| DS-06 | Every interactive component has a rendered state harness | GATE | PROSE | open |
| DS-07 | Destructive actions wear the danger token everywhere | GATE | PROSE | lint_intent wired into an automatic gate |
| DS-08 | Motion respects prefers-reduced-motion with no content loss | GATE | PROSE | verify_reduced_motion wired into an automatic gate |
| DS-09 | A design change has a SemVer level and a changelog entry | PROSE | PROSE | open |
```

Every row is `PROSE` on purpose. Task 4 audited each claimed gate and found that
nothing automatic runs the design scripts yet — they are reachable only through
the manual `/gate` command. Two of the originally-claimed gates were also the
wrong script for the rule: `validate_contrast.py` does not check per-token
light/dark completeness, and `verify_states.mjs` does not check eight-state
completeness. Task 8 Step 6a re-audits and promotes what its wiring genuinely
enforces. A registry row claiming a gate that does not run is the one defect this
file exists to prevent.

- [ ] **Step 2: Run the registry test**

```bash
bash tests/render_registry_test.sh
```

Expected: test suite passes; validator exits 0.

- [ ] **Step 3: Commit**

```bash
git add templates/rules/REGISTRY.md
git commit -m "feat: register design rules DS-01..DS-09"
```

---

### Task 5: Add the concise-output rules module

**Files:**
- Create: `templates/rules/response-format.md`
- Test: `bash tests/render_instructions_test.sh`

**Interfaces:**
- Consumes: Task 1's tree.
- Produces: module id `response-format`, `always_apply: true` — rendered into every scaffolded `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules`.

- [ ] **Step 1: Write the module**

```markdown
---
id: response-format
always_apply: true
---
# Response format

- Lead with the answer or the number. No preamble, no restating the question.
- Bullets over paragraphs. One idea per bullet, one line where it fits.
- Tables when comparing more than two things across more than two dimensions.
- Evidence inline: `file:line`, exact output, exit code. Never "it should work".
- Commands in their own fenced bash block, one command per block.
- Cut narrating what you are about to do, summarizing what you just did, and
  listing options you are not recommending.
- Uncertainty gets one clause and what would settle it, not a paragraph.
- Long answers lead with the conclusion, detail underneath. Never bury the result.
```

- [ ] **Step 2: Add its registry row under `## Operations`**

```markdown
| O-09 | Technical answers are led by the result, bulleted, and evidence-backed | PROSE | **PROSE** | done |
```

- [ ] **Step 3: Prove it renders into all three instruction surfaces**

```bash
tmp=$(mktemp -d) && mkdir -p "$tmp/.claude/rules"
cp templates/rules/response-format.md templates/rules/core.md "$tmp/.claude/rules/"
python3 scripts/render_instructions.py --rules-dir "$tmp/.claude/rules" --root "$tmp" --write
grep -l "Response format" "$tmp"/CLAUDE.md "$tmp"/AGENTS.md "$tmp"/.cursor/rules/*.mdc
```

Expected: all three paths listed.

- [ ] **Step 4: Run the renderer test suite**

```bash
bash tests/render_instructions_test.sh
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add templates/rules/response-format.md templates/rules/REGISTRY.md
git commit -m "feat: response-format rules module, always applied"
```

---

### Task 6: Wire design bundles into the interview

**Files:**
- Modify: `skills/project-init/SKILL.md` (Round 3 table, Step 3 write order, Step 7 state)
- Modify: `skills/project-init/references/module-catalog.md`
- Test: `bash tests/conformance_test.sh`

**Interfaces:**
- Consumes: Task 3's module ids, Task 4's `DS-*` registry IDs.
- Produces: `.claude/.framework-state.json` key `bundles: []` read by Task 10's audit; `decided_modules` entries `design-tokens`/`design-a11y`/`design-components`/`design-handoff` consumed by the agent-selection rule.

- [ ] **Step 1: Replace the `frontend` row in Round 3**

```markdown
| Frontend != none | **Does this project have a UI surface? If so, which design capabilities does it need — tokens, verification, content, direction, build, governance?** | `design-tokens` · `design-a11y` · `design-components` · `design-handoff` |
```

Record the selected bundle names in `.claude/.init-state.json` alongside the other Round 3 answers.

- [ ] **Step 2: State the bundle dependency rule directly under the table**

```markdown
**Bundle dependencies.** `design.direction` and `design.build` require
`design.tokens`; `design.govern` requires `design.verify`. Pull the dependency in
automatically and say so, the same way `blockchain` pulls in `keysafety`. Never
scaffold a dependent bundle without its base — the gates it relies on would have
nothing to read.
```

- [ ] **Step 3: Extend the agent-selection paragraph**

```markdown
`design-critic` is selected exactly when any design bundle is among the modules
just decided — the same one-level-up pairing as `schema-reviewer` with
`database`. No separate interview question.
```

- [ ] **Step 4: Add the design sub-step to Step 3's write order, after item 7**

```markdown
7a. **Design artifacts** — only when a design bundle was selected:
   - `design-tokens.json` at the project root, seeded from
     `${CLAUDE_PLUGIN_ROOT}/kit/tokens/`. Replace the `primitive.brand` ramp with
     the project's brand; keep the semantic and component tiers. Prove it:
     `python3 "${CLAUDE_PLUGIN_ROOT}/kit/scripts/validate_contrast.py" design-tokens.json`
   - `src/components/`, `public/images/`, `reference/` with `.gitkeep` files
   - One worked example component with its harness —
     `src/components/Button/{Button.tsx,Button.states.html,index.ts}` — copied
     from `${CLAUDE_PLUGIN_ROOT}/kit/examples/golden/`. A design project whose
     gates pass over zero harnesses is green with nothing proven.
   - `npm i -D playwright && npx playwright install chromium`, so the render
     gates resolve a browser rather than reporting SKIPPED.
```

- [ ] **Step 5: Add the Figma connection to Round 2**

Round 2 already asks the integration surface. Add design tooling to it:

```markdown
| Design bundle selected | **Do you need Figma, Notion, or Drive reachable from this project?** | `.mcp.json` entries |
```

Write `.mcp.json` in Step 3's write order with the selected servers and **no
secrets** — env vars only (`FIGMA_API_KEY` and friends), set in the user's own
shell. Remind them to do so in the interview's closing report.

- [ ] **Step 6: Add `CLAUDE.local.md` to the write order, framework-wide, as item 1a**

```markdown
1a. `CLAUDE.local.md` — personal preferences, gitignored. Write the file with a
   one-line header comment and add it to `.gitignore`. Every project gets one,
   design or not.
```

- [ ] **Step 7: Record bundles in framework state**

The initial object becomes:

```json
{"version": null, "files": {}, "bundles": [], "companions": {}}
```

Note in the step that files written before this change lack `bundles`; `upgrade.py` must treat a missing key as `[]` and never crash (C1).

- [ ] **Step 8: Verify the interview still conforms**

```bash
bash tests/conformance_test.sh
bash tests/render_registry_test.sh
```

Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add skills/project-init
git commit -m "feat: design bundles selected in project-init Round 3"
```

---

### Task 7: Retire `/scaffold-project`

**Files:**
- Delete: `commands/scaffold-project.md`, `kit/templates/product-design/`
- Modify: `kit/scripts/validate_template.py`
- Test: `python3 kit/scripts/validate_template.py`

**Interfaces:**
- Consumes: Task 6's design sub-step, which is where this command's behaviour now lives.
- Produces: nothing new — this task only removes.

- [ ] **Step 1: Confirm every asset is accounted for before deleting**

```bash
ls kit/templates/product-design/.claude/rules/
diff <(sed '1,/^---$/d' templates/rules/design-a11y.md) \
     <(tail -n +1 kit/templates/product-design/.claude/rules/accessibility.md) | head
```

Expected: the three rules files have counterparts under `templates/rules/design-*.md` from Task 3. Any content in the diff that is not a path rewrite is a gap — fix Task 3's module before continuing.

- [ ] **Step 1a: Relocate the assets that must outlive the template**

Added 2026-09-01 (ruling R-22). Task 6 wired `.mcp.json` into the interview:
`skills/project-init/SKILL.md:250` seeds it from
`${CLAUDE_PLUGIN_ROOT}/kit/templates/product-design/.mcp.json` — inside the very
directory Step 2 deletes. Deleting first would leave the interview pointing at a
file that no longer exists.

Move it to the framework's own scaffold-template home, matching that directory's
naming convention (`CLAUDE.md.tmpl`, `env.example.tmpl`, `gitignore.tmpl`, …):

```bash
git mv kit/templates/product-design/.mcp.json templates/scaffold/mcp.json.tmpl
```

Then repoint `skills/project-init/SKILL.md:250` at the new path, and confirm no
other live reference into `product-design/` survives Step 2. The full reference
list at the time of writing:

| Site | Disposition |
|---|---|
| `skills/project-init/SKILL.md:250` | repoint to `templates/scaffold/mcp.json.tmpl` |
| `commands/scaffold-project.md:5,44` | deleted by Step 2 along with the command |
| `kit/scripts/validate_template.py:2,28` | retargeted by Step 3 |
| `kit/scripts/build_tokens.mjs:19` | a comment describing the template shape — update the wording, it is not a path dependency |

- [ ] **Step 2: Delete the command and its template**

```bash
git rm commands/scaffold-project.md
git rm -r kit/templates/product-design
```

- [ ] **Step 3: Retarget or retire the template validator**

`validate_template.py` validated the now-deleted template, so retarget it at the
scaffold assets `project-init` writes instead. Its check becomes: every `.tsx`
under `kit/examples/golden/` has a `.states.html` harness beside it. That is the
invariant Task 6 Step 4 depends on — it copies that example into every design
project, and a component without a harness is invisible to every render gate.

- [ ] **Step 4: Verify nothing references the deleted paths**

```bash
grep -rn "product-design\|scaffold-project" skills/ commands/ agents/ kit/ templates/ || echo "NO DANGLING REFERENCES"
```

Expected: `NO DANGLING REFERENCES`.

- [ ] **Step 5: Commit**

```bash
git add -u && git add kit/scripts
git commit -m "refactor: retire /scaffold-project into project-init"
```

---

### Task 8: Fix the two enforcement breaks

**Files:**
- Modify: `hooks/verify-record.sh:10-13`, `hooks/done-check.sh:18-22`, `scripts/verify.sh`
- Test: `bash tests/hooks_test.sh`

**Interfaces:**
- Consumes: Task 3's `design-tokens` module (names the token source paths).
- Produces: `.claude/.last-verify` written by design gate runs; `done-check.sh` seeing token sources.

- [ ] **Step 1: Write the failing hook tests first**

Add to `tests/hooks_test.sh`, using the existing `check` and `mkstate` helpers:

```bash
# /gate must count as a verify run — accuracy_report.mjs matches none of the
# old patterns, and its child gates run via execSync where PostToolUse cannot
# see them. Without this the design gate passes and done-check still blocks.
gatetmp=$(mktemp -d); ( cd "$gatetmp" && git init -q ); mkstate "$gatetmp"
check "verify-record records accuracy_report" 0 verify-record.sh \
  '{"tool_input":{"command":"node kit/scripts/accuracy_report.mjs"}}' "$gatetmp"
[ -f "$gatetmp/.claude/.last-verify" ] \
  && { echo "PASS  accuracy_report wrote .last-verify"; pass=$((pass+1)); } \
  || { echo "FAIL  accuracy_report did not write .last-verify"; fail=$((fail+1)); }

# design-tokens.json is a design project's source of truth, not config. The
# .json exclusion is right for package.json and wrong for tokens.
toktmp=$(mktemp -d); ( cd "$toktmp" && git init -q && echo '{}' > design-tokens.json && git add -A ); mkstate "$toktmp"
check "done-check sees design-tokens.json" 2 done-check.sh '{}' "$toktmp"
```

- [ ] **Step 2: Run them and watch them fail**

```bash
bash tests/hooks_test.sh 2>&1 | grep -E "accuracy_report|design-tokens"
```

Expected: both FAIL. The first because `.last-verify` is absent; the second because `done-check.sh` exits 0 where 2 was expected.

- [ ] **Step 3: Extend the verify-record pattern**

In `hooks/verify-record.sh`:

```bash
case "$cmd" in
  *verify*|*"pytest"*|*"vitest"*|*"forge test"*|*"npm test"*|*"pnpm test"*) ;;
  *accuracy_report*|*"/gate"*) ;;
  *) exit 0 ;;
esac
```

- [ ] **Step 4: Add the token include-list to done-check**

In `hooks/done-check.sh`, replace the single filter chain with a filter that re-admits token sources:

```bash
changed=$(git -C "$root" status --porcelain 2>/dev/null \
  | sed 's/^...//' \
  | grep -Ev '^(docs|\.github|\.claude)/' \
  | grep -E '(^|/)design-tokens\.json$|(^|/)kit/tokens/.*\.json$|[^.]*$|\.(ts|tsx|js|jsx|mjs|py|sh|css|html|rb|go|rs|sql)$' \
  | head -20)
```

The token paths are matched explicitly before the extension filter, so `package.json` and lockfiles stay excluded while `design-tokens.json` and `kit/tokens/*.json` are seen.

- [ ] **Step 5: Hang the design gate off `verify.sh`**

Append to `scripts/verify.sh`, guarded so non-design repos skip cleanly:

```bash
# Design gate — only when the project carries design rules. verify.sh is named
# to match verify-record.sh's pattern, so running it is what makes done-check
# satisfiable; the design gate belongs inside it for the same reason.
if [ -f "$ROOT/.claude/rules/design-tokens.md" ]; then
  echo "== design gate =="
  node "${CLAUDE_PLUGIN_ROOT:-$ROOT}/kit/scripts/accuracy_report.mjs" || exit 1
fi
```

- [ ] **Step 6: Run the hook tests to green**

```bash
bash tests/hooks_test.sh
```

Expected: all cases PASS, including the two added in Step 1.

- [ ] **Step 6a: Promote the design registry rows the wiring now enforces**

Added 2026-09-01 (ruling R-12). Task 4 recorded every `DS-*` row as `PROSE`,
honestly, because at that point nothing automatic ran the design gates — they
were reachable only through the manual `/gate` command. Steps 5 and 3 of this
task change that: the design gate now runs inside `scripts/verify.sh`, and
`verify-record.sh` records it.

Re-audit each `DS-*` row against what is now wired, and promote only the rows a
script genuinely enforces end to end. Candidates, each to be checked rather than
assumed: `DS-01` (`lint_hardcodes`), `DS-04` (`verify_states`), `DS-07`
(`lint_intent`), `DS-08` (`verify_reduced_motion`). Leave `DS-03` and `DS-05` at
`PROSE` — Task 4 established that no per-token light/dark completeness check and
no eight-state completeness check exist; the named scripts check adjacent things.
Promoting a row whose check does not exist is the exact failure the registry is
built to prevent.

Verify: `bash tests/render_registry_test.sh` still passes.

- [ ] **Step 7: Commit**

```bash
git add hooks/verify-record.sh hooks/done-check.sh scripts/verify.sh tests/hooks_test.sh
git commit -m "fix: /gate counts as a verify run; done-check sees token sources"
```

---

### Task 9: Retire `/ship` into `ship-it`

**Files:**
- Modify: `skills/ship-it/SKILL.md` (steps 3, 5, 6)
- Delete: `commands/ship.md`
- Test: manual walkthrough on a dirty branch

**Interfaces:**
- Consumes: Task 3's `design-handoff` module, Task 8's `verify.sh` design gate.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Teach step 3 to walk the design handoff DoD**

```markdown
## 3. Definition of Done

Walk `${CLAUDE_PLUGIN_ROOT}/templates/process/DEFINITION.md`. If the project
carries `.claude/rules/design-handoff.md`, walk its Definition of Done too.
Report each unmet item explicitly — never silently pass one.
```

- [ ] **Step 2: Replace step 5 with the confirm-first posture**

```markdown
## 5. PR

Draft first, then stop. Stage explicit paths — never `git add -A`, which sweeps
untracked and generated files.

```bash
git add <explicit paths>
git commit -m "<type>(<scope>): <summary>"
```

Fill the PR body from `templates/process/PR.template.md` and show it. Then ask
before doing anything outward-facing:

```bash
git push -u origin <branch>
gh pr create --title "<type>(<scope>): <summary>" --body-file <drafted body>
```

Push and PR creation are hard to walk back. Run them only on an explicit yes.
```

- [ ] **Step 3: Replace step 6 with propose-then-confirm bumping**

```markdown
## 6. Release, if this is one

- List the commits since the last tag, so the changelog describes what actually
  changed: `git log --oneline "$(git describe --tags --abbrev=0)"..HEAD`
- Read the diff and **propose** the semver level with your reasoning. A breaking
  API or payload change is major — argue it rather than assume it. Wait for a yes.
- Add a `CHANGELOG.md` entry written for a consumer, not a committer.
- Tag after merge, never before, and only on explicit confirmation.
```

- [ ] **Step 4: Delete the retired command and check for dangling references**

```bash
git rm commands/ship.md
grep -rn "design-kit:ship\|commands/ship" skills/ kit/ templates/ || echo "NO DANGLING REFERENCES"
```

Expected: `NO DANGLING REFERENCES`.

- [ ] **Step 5: Commit**

```bash
git add skills/ship-it commands
git commit -m "refactor: retire /ship into ship-it with confirm-first posture"
```

---

### Task 10: Collapse the two rule sets and re-point the skills

**Files:**
- Delete: `kit/rules/` (all 7 files)
- Modify: `skills/{design-code,design-tokens,design-component,redesign,governance,brandkit}/SKILL.md`
- Modify: `kit/workflows/{design-review,prototyping}.md`, `kit/workflows/governance.md`
- Test: `grep` sweep + `claude plugin validate .`

**Interfaces:**
- Consumes: Task 3's four modules.
- Produces: one canonical source per design subject.

- [ ] **Step 1: Salvage the doctrine that has no home yet**

- `kit/rules/review-and-research.md` § Design Review & Audit — the 6-dimension weighted table and severity ladder — append to `kit/workflows/design-review.md`.
- `kit/rules/review-and-research.md` § Prototyping & Research — the fidelity ladder and research methods — append to `kit/workflows/prototyping.md`.

Everything else in the seven files is either superseded by Task 3's modules or is routing into `workflows/`, `taste/`, and `frameworks/adapters/` that skill descriptions now handle.

- [ ] **Step 2: Delete the directory**

```bash
git rm -r kit/rules
```

- [ ] **Step 3: Re-point the six skills**

```bash
grep -rn "kit/rules/" skills/ kit/
```

Expected before fixing: 6 hits — 4 for `tokens-and-color.md`, 3 for `components.md`, 1 for `typography-and-spacing.md` across `design-code`, `design-tokens`, `design-component`, `redesign`, `governance`, `brandkit`, and `kit/workflows/governance.md`. Rewrite each to the corresponding `${CLAUDE_PLUGIN_ROOT}/templates/rules/design-*.md`.

- [ ] **Step 4: Stop `governance` hand-editing CLAUDE.md**

Replace its step 5 with:

```markdown
5. Update the module's frontmatter and registry row, then regenerate the
   instruction surfaces: `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/render_instructions.py" --rules-dir .claude/rules --write`.
   Never hand-edit `CLAUDE.md` — it is generated, and `check_instruction_honesty.py`
   (C-10) will flag a hand-edit as drift. Add the changelog entry via `ship-it`,
   which owns the bump.
```

- [ ] **Step 5: Verify no dangling references and the plugin still validates**

```bash
grep -rn "kit/rules/" . --include='*.md' --include='*.py' --include='*.mjs' || echo "NO DANGLING REFERENCES"
claude plugin validate .
```

Expected: `NO DANGLING REFERENCES`; validation passes.

- [ ] **Step 6: Commit**

```bash
git add -u && git add kit/workflows
git commit -m "refactor: templates/rules is canonical; delete kit/rules"
```

---

### Task 11: Teach the audit and upgrade paths about design

**Files:**
- Modify: `skills/project-audit/SKILL.md`, `skills/framework-upgrade/SKILL.md`
- Modify: `scripts/upgrade.py` (missing-`bundles` tolerance)
- Test: `bash tests/conformance_test.sh`

**Interfaces:**
- Consumes: Task 6's `bundles` state key, Task 4's `D-*` IDs.
- Produces: the migration path every existing repo needs.

- [ ] **Step 1: Make `upgrade.py` tolerate state files without `bundles`**

Files written before Task 6 have no `bundles` key. Treat a missing key as `[]` and never raise — C1 requires `upgrade.py` to load any state file without crashing.

- [ ] **Step 2: Add the design findings to `project-audit`**

```markdown
- **Design bundles declared but unwired.** `.claude/.framework-state.json` lists
  a bundle whose rules module is absent from `.claude/rules/`, or whose gate is
  missing from the verify command. A declared capability nothing runs is a
  finding, not a pass.
- **Playwright unresolvable.** Run
  `node "${CLAUDE_PLUGIN_ROOT}/kit/scripts/measure_render.mjs" --help`. A
  "playwright not installed" line means every render gate in this repo is
  reporting SKIPPED. Report it as an environment finding — a skipped gate is
  never a passed gate.
- **Stale plugin namespaces.** Grep `CLAUDE.md`, `AGENTS.md`, and
  `.claude/rules/` for `f4d-kit:` and `design-kit:`. Both retired at dev-kit
  2.0.0; a stale prefix names a skill that no longer resolves.
```

- [ ] **Step 3: Add the migration to `framework-upgrade`**

```markdown
**`frontend` → design modules (2.0.0).** A manifest listing `frontend` predates
the split. Ask which design capabilities the project actually has, then replace
that entry with the matching `design-*` ids and copy the modules in. Do not map
`frontend` to all four silently — it was six bullets, and the four modules
assert far more than it did.
```

- [ ] **Step 4: Verify**

```bash
bash tests/conformance_test.sh
python3 -c "import json,sys; sys.path.insert(0,'scripts'); import upgrade; print('upgrade.py imports clean')"
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add skills/project-audit skills/framework-upgrade scripts/upgrade.py
git commit -m "feat: audit and upgrade paths understand design bundles"
```

---

### Task 12: Full verification and release

**Files:**
- Modify: `README.md`, `CHANGELOG.md`
- Test: `bash scripts/verify.sh`, clean-room install

**Interfaces:**
- Consumes: every prior task.
- Produces: an installable `dev-kit@roofadvisor` 2.0.0.

- [ ] **Step 1: Run the kit's own verify**

```bash
bash scripts/verify.sh
```

Expected: **every gate clean**, and exactly one known failure — `hooks_test.sh`'s
`GREEN: expected a subdir/pkg/deep telemetry line` case. Confirm that is the only
one; any other failure is fixed in its owning task, never suppressed here.

That single case is inherited, not ours: it fails identically in the upstream
`f4d-dev-env-configurator` checkout (verified 2026-09-02), and it is an artifact of
macOS `mktemp -d` returning a path under `/var/folders/...` where `/var` is a symlink
to `/private/var`, so the test's relative-path computation produces
`f3='var/folders/…'` instead of the expected `deep`. It is a test-environment bug, not
a product defect.

Record it in the release notes rather than pretending `verify.sh` is green. A command
that cannot pass on the maintainer's own platform is the exact thing this framework's
registry calls a gate that fires wrongly — but fixing an upstream test is not this
merge's job, and silently accepting a red verify is worse than naming it.

- [ ] **Step 2: Clean-room install from the renamed repo**

Install from the **local tree**, not from GitHub. The branch carrying this work
is unpushed, and `claude plugin marketplace add roofadvisor/dev-kit` clones the
remote's default branch — which still holds design-kit 1.0.0. Installing from
GitHub here would verify the wrong tree and report a confident pass on code that
is not this code (ruling R-10).

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
claude plugin marketplace add "$PWD"
claude plugin install dev-kit@roofadvisor
claude plugin list
claude plugin details dev-kit | grep -A2 "Projected token cost"
```

Verifying the *published* install path additionally requires pushing this branch
and making it the default. That is an outward-facing change to what everyone
installs, so it is the user's call and explicitly out of scope for this task —
report it as the remaining step rather than doing it.

Expected: `Status: ✔ enabled`; 32 skills, 2 commands, 5 agents; always-on materially below the ~5,155 naive-merge figure.

- [ ] **Step 3: Prove the design gate runs end to end from a project**

```bash
proj=$(mktemp -d) && cd "$proj" && npm i -D playwright && npx playwright install chromium
node "$CLAUDE_CONFIG_DIR/plugins/cache/roofadvisor/dev-kit/2.0.0/kit/scripts/accuracy_report.mjs"
```

Expected: a real `N/N` line with render checks executed — never "playwright not installed".

- [ ] **Step 4: Update README and CHANGELOG**

README replaces the old install block with:

```bash
claude plugin marketplace add roofadvisor/dev-kit
```

```bash
claude plugin install dev-kit@roofadvisor
```

and documents the six bundles and what each pulls in.

CHANGELOG gets a 2.0.0 entry written for a consumer, stating the three things
that break them:

```markdown
## 2.0.0

- `design-kit@roofadvisor` and `f4d-kit@f4d` are merged into `dev-kit@roofadvisor`.
  Both old plugins must be uninstalled and `dev-kit` installed fresh — a plugin
  rename has no in-place upgrade path.
- Every skill namespace changed: `f4d-kit:project-init` and `design-kit:gate` are
  now `dev-kit:project-init` and `dev-kit:gate`. Update any `CLAUDE.md` that
  names them; `/project-audit` reports stale prefixes.
- `/scaffold-project` and `/ship` are removed. Their behaviour lives in
  `project-init` and `ship-it`, selected by the design bundles in Round 3.
```

- [ ] **Step 4a: Rewrite `INSTRUCTIONS.md` — the plugin's field map**

Added 2026-09-01 (ruling R-06) after Task 2's implementer found it uncovered.
It is the map of every skill, command, and gate, and the merge invalidated
nearly all of it: it still lists the 7 retired aesthetics, names **zero** of the
15 development skills, and describes 4 commands where 2 remain.

Regenerate its tables against the final tree — 32 skills, 2 commands, 5 agents,
4 hook events, the six design bundles, and the rules modules. Keep the existing
per-row shape (what each piece runs, what it reads, its upstream source link);
that structure is the file's value and it survives the merge intact.

Also remove the dead Claude artifact link from **both** `INSTRUCTIONS.md` and
`README.md`. It points at a private artifact, so now that this repo is public it
is a 404 for every visitor. Removing the link is in scope here; republishing or
replacing the artifact is not — that is an outward-facing publish and belongs to
the user.

- [ ] **Step 5: Point the old repo at the new home**

Update `f4d/f4d-dev-env-configurator`'s README to name `roofadvisor/dev-kit` as the home and mark its marketplace entry deprecated.

- [ ] **Step 6: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: dev-kit 2.0.0 release notes and install instructions"
```

---

## Deferred

- **`roof-club` namespace migration.** Its `CLAUDE.md` references `f4d-kit:*`. Task 11 gives `project-audit` the check that finds it; the fix belongs in that repo, not this one.
- **Archiving `f4d/f4d-dev-env-configurator`.** Left as a redirect. Archiving is reversible and can wait for the first clean release.
- **DS-02 and DS-06 enforcement.** Both registered as `PROSE`. Promoting them is `promote-rule`'s job once there is a gate to promote them to.

---

### Task 13: Identity sweep — f4d-kit to dev-kit

Added 2026-09-01 after Task 1's review found the plugin still self-identifies as
`f4d-kit` in live user-facing output. **Runs after Task 11 and before Task 12**, so
that tasks 2-11 cannot reintroduce strings this sweep has already cleaned.

**Files:**
- Modify: every shipped file containing `f4d-kit` — 26 across `hooks/`, `skills/`,
  `templates/`, `scripts/`, `tests/`
- Modify: `START_HERE.md`
- Test: `bash tests/hooks_test.sh`, `bash scripts/verify.sh`

**Interfaces:**
- Consumes: the merged tree from every prior task.
- Produces: a plugin whose runtime output names itself correctly. Task 12's
  clean-room install verifies the result.

- [ ] **Step 1: Fix the user-facing runtime strings first**

`hooks/guard.sh`'s `deny()` prints `BLOCKED by f4d-kit [$1]: $2` — every guard
denial a user sees names the wrong plugin. `hooks/hooks.json`'s `description`
says `f4d-kit enforcement hooks (A18)`. Change both to `dev-kit`.

`tests/hooks_test.sh` asserts on the literal string `BLOCKED by f4d-kit [C-02]`.
Update the assertion in the same commit — a test asserting the old identity is
what would silently permit a regression back to it.

- [ ] **Step 2: Sweep the remaining occurrences**

```bash
grep -rl "f4d-kit" hooks/ skills/ templates/ scripts/ tests/ commands/ agents/ *.md
```

Review each hit before changing it. Three kinds appear and only the first two
get rewritten:

- **Plugin identity** — the plugin naming itself. Rewrite to `dev-kit`.
- **Skill namespaces** — `f4d-kit:project-init` and similar. Rewrite to `dev-kit:`.
- **Historical record** — `CHANGELOG.md` entries, `docs/decisions/*`,
  `docs/acceptance/*`, and BACKLOG items describing what f4d-kit did at the time.
  **Leave these alone.** Rewriting history to claim dev-kit made decisions it did
  not is a worse defect than a stale name.

- [ ] **Step 3: Correct `START_HERE.md`**

It states "This repo is **f4d-kit**", tells the reader to expect the remote
`github.com/f4d/f4d-dev-env-configurator`, gives `claude plugin install f4d-kit@f4d`,
and lists per-test expectations of `pass=57 fail=0` that match neither the current
suite nor several test files that now exist. Update the identity, the remote
(`github.com/roofadvisor/dev-kit`), the install command
(`claude plugin install dev-kit@roofadvisor`), and either correct the counts
against a real run or remove them — a stale expected count trains readers to
ignore a failing suite.

- [ ] **Step 2a: `render_instructions.py` markers — rename with care**

Added 2026-09-01 (ruling R-15). Three `f4d-kit` strings in
`scripts/render_instructions.py` are NOT ordinary identity strings:

```python
BEGIN = "<!-- BEGIN f4d-kit:rules (generated by scripts/render_instructions.py — do not edit inside) -->"
END = "<!-- END f4d-kit:rules -->"
DEFAULT_TARGETS = ["CLAUDE.md", "AGENTS.md", ".cursor/rules/f4d-kit.mdc"]
```

The BEGIN/END pair is how the renderer finds the block it owns in an existing
`CLAUDE.md`. Every repo the framework has already scaffolded carries
`<!-- BEGIN f4d-kit:rules -->` in its committed instruction files. Rename the
marker and the renderer stops recognising those blocks: instead of replacing the
old one it **appends a second**, leaving two rule indexes in every previously
scaffolded repo — silent duplication that no test in this repo would catch,
because this repo's own files get regenerated in the same pass.

Take one of these two routes and say which in the report:

- **Leave the markers alone.** They are an internal sentinel, not user-facing
  output. Rename only `DEFAULT_TARGETS`' `.cursor/rules/f4d-kit.mdc`, and even
  that strands the old file in scaffolded repos unless `framework-upgrade`
  removes it.
- **Rename them and teach `framework-upgrade` to migrate.** It must rewrite the
  old marker pair to the new one before the first render, in every adopted repo.

Do not rename them in a bare sweep. Verify whichever route you take by running
the renderer twice against a scratch repo seeded with an old-marker `CLAUDE.md`
and confirming exactly one block exists afterwards.

- [ ] **Step 2b: Regenerate the repo's own stale instruction files**

Added 2026-09-01 from Task 6 (ruling R-19). `CLAUDE.md:20` and `AGENTS.md:20` in
this repo still list `frontend` as a rules module. Task 3 deleted
`templates/rules/frontend.md`; these files are **generated** by
`render_instructions.py` and nobody re-ran it, so they now advertise a module
that does not exist.

Regenerate them — but only after resolving Step 2a's marker decision, and in that
same commit. The two interact: the renderer locates its block by the BEGIN/END
marker, so regenerating with a changed marker is exactly the case that appends a
second block instead of replacing the first.

Also fix the prose reference at `skills/org-profile/SKILL.md:78`, which offers
"storage, money, blockchain, or frontend modules" — `frontend` is now four design
modules and should read that way.

Verify: no `frontend` remains as a live module reference —
`grep -rn '\bfrontend\b' CLAUDE.md AGENTS.md skills/ templates/rules/` returns
only historical mentions, and exactly one generated block exists in each file.

- [ ] **Step 3a: Close the inlined-aesthetic loose threads**

Added 2026-09-01 from Task 2's review (two Minor findings, folded here rather
than into Task 2's loop). Task 2 moved seven aesthetics *inline* into
`kit/taste/aesthetic-systems.md`, but two places still describe them as living
in a directory this plugin excludes:

- `skills/apply-aesthetic/SKILL.md:16` says named-library specs live in
  `${CLAUDE_PLUGIN_ROOT}/kit/design-systems/library/<name>/DESIGN.md`. Add the
  caveat that seven are inline in the catalog itself. Low risk in practice — the
  inline specs load into context first — but as written, a model that tries the
  directory first meets a dead end.
- `kit/taste/aesthetic-systems.md:176` says "138 named design systems in
  `design-systems/library/`". Seven of the 138 are now inline. Correct the count
  or the location so the sentence is true.

- [ ] **Step 3c: Widen the options-cut exception**

Added 2026-09-01 from Task 5's re-review (non-blocking). `response-format.md`
reads "listing options you are not recommending — unless asked to compare them".
The scenario that motivated the fix was a user asking *"what are my options"* —
a request to **list**, not to compare. A reader applying the words literally
could fail to fire the exception on the exact phrasing that prompted it. Widen
the verb so a plain request to see the options is covered too. One line.

- [ ] **Step 3b: Two registry corrections from Task 4's review**

Added 2026-09-01 (both Minor, both errors in the plan's own table rather than in
Task 4's execution).

- `DS-02` and `DS-06` read `open` in the Promote-when column while their six
  siblings name the specific missing check. Both are in the same "no script exists
  at all" bucket as `DS-03` and `DS-05` — confirmed by grep across `kit/scripts/`
  and `scripts/`. Name their gaps the way the siblings do.
- `DS-09`'s `Should be` column reads `PROSE`, the only row in 88 where that
  appears. It should be `JUDGMENT`: deciding a SemVer level and writing a
  changelog entry is a judgment call, and mechanising it would produce false
  positives. Every comparable rule in the file (`C-07`, `S-06`, `S-08`, `S-09`,
  `K-04`) uses `JUDGMENT`. `PROSE` files it as debt someone will later try to
  automate, wrongly.

Verify: `bash tests/render_registry_test.sh` still passes.

- [ ] **Step 4: Verify nothing that should have changed was missed**

```bash
grep -rn "f4d-kit" hooks/ skills/ templates/ scripts/ tests/ commands/ agents/
```

Every remaining hit must be historical record per Step 2. List them in the report
with one line each saying why it stays.

- [ ] **Step 3d: Add the missing `${CLAUDE_PLUGIN_ROOT}/` prefixes**

Added 2026-09-02 from Task 9's review (Minor, pre-existing, repo-wide). Three
skills reference plugin-owned template files by bare relative path, which only
resolves when the working directory happens to be the plugin root:

- `skills/ship-it/SKILL.md:48` — `templates/process/PR.template.md`
- `skills/write-spec/SKILL.md:15`
- `skills/retro/SKILL.md:53`

Two lines above the `ship-it` one, `templates/process/DEFINITION.md` **is**
correctly prefixed, so the file contradicts itself. Prefix all three with
`${CLAUDE_PLUGIN_ROOT}/`. Then grep for the same pattern across every skill —
these three were found incidentally, so treat them as a sample rather than the
whole set:

```bash
grep -rn '`templates/' skills/ | grep -v 'CLAUDE_PLUGIN_ROOT'
```

Every hit is a path that breaks in a scaffolded project. Task 11's review
found one more of the same shape: `skills/project-audit/SKILL.md:121` cites
`skills/project-init/references/module-catalog.md` unprefixed — the only
cross-skill reference-doc path in the plugin without one, while every script
path in the same bullet list has it. Include reference docs, not just scripts.

- [ ] **Step 4a: Stop `check_log_hygiene` firing on design tokens**

Added 2026-09-02 (ruling R-27). `bash scripts/verify.sh` currently reports
`VERIFY FAILED` on two gates. One is Step 2b's stale instruction files. The other
is a word collision the merge created:

```
O-05 VIOLATIONS — payload/credential-shaped identifiers in log calls (16):
  kit/scripts/lint_hardcodes.py:125  print(f"{f}:{n}: hardcoded {kind} '{val}' — use a token")
  kit/scripts/validate_theme_refs.py:70  print(f"Theme defines {len(defined)} tokens.")
```

`check_log_hygiene.py` looks for credential-shaped identifiers near log calls.
The design half talks about **design tokens** constantly, and its linters print
their own findings to stdout. All 16 hits are a CLI tool describing colour and
spacing values — no credential is involved in any of them.

Sixteen false positives on one half of the merged plugin is the failure this
framework names explicitly: a gate that fires wrongly gets disabled, and a
disabled gate protects nothing.

Fix it so the gate keeps protecting real logging while ignoring design-token
prose. Options, in preference order — argue your choice:

1. Scope the scan to exclude `kit/scripts/`, whose `print` calls are a CLI
   tool's user-facing output, not application logging. Narrow and honest.
2. Teach the checker that `token` adjacent to design vocabulary (`hardcoded`,
   `theme`, `contrast`, `spacing`) is not credential-shaped. More precise,
   more surface to get wrong.

Do **not** silence it by deleting the rule or blanket-disabling the gate.
O-05 protects real logging elsewhere in the plugin.

Verify: `bash scripts/verify.sh` exits 0, and `check_log_hygiene` still reports
findings when pointed at a genuine credential-shaped log line — prove that with
a scratch fixture rather than assuming it.

- [ ] **Step 5: Prove the suites still pass**

```bash
bash tests/hooks_test.sh
```

Expected: `pass=88 fail=1` or better — the one failure is a pre-existing macOS
`/var/folders` telemetry-path test. Any *new* failure means the sweep changed
behaviour, not just names.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "refactor: plugin identifies as dev-kit, not f4d-kit"
```
