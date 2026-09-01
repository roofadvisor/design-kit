# Rules Module Catalog

Each module is a single file copied into `.claude/rules/`. Include only what the interview justified. Every unnecessary module is context Claude burns on every relevant turn.

| Module | Always? | Trigger | Adds |
|---|---|---|---|
| `core` | YES | — | Git discipline, commit format, verify-before-commit, no-secrets |
| `api` | YES if any HTTP surface | Q3/Q5 | Error envelope, validation at the boundary, status codes, versioning, pagination |
| `database` | YES if DB | Q4 | Migration policy, naming, indexes, no raw SQL in handlers, N+1 |
| `python` | if Python | Q2 | uv, ruff, strict mypy, no bare except, Decimal over float |
| `typescript` | if TS/JS | Q2 | strict tsconfig, no `any`, no default exports, zod at boundaries |
| `data-integration` | if multi-source | Q5/R3 | Adapter interface, recorded fixtures, never test against live vendors, retry/backoff, rate limits, canonical-record reconciliation |
| `webhooks` | if inbound callbacks | Q6 | HMAC before parse, constant-time compare, 200-fast + async, event_id dedupe, replay window |
| `contracts` | if multi-repo | Q7 | Spec-first, generated types only, version pinning, drift gate |
| `storage` | ask | R3 | Bucket layout, key naming, presigned URLs, content-type, size limits, lifecycle, no PII in keys |
| `determinism` | ask | R3 | JCS canonicalization, golden fixtures, forbidden fields in hashed payloads, versioned hash paths |
| `money` | ask | R3 | Decimal only, splits sum exactly, idempotency keys, property tests, never trust client price |
| `blockchain` | ask | R3 | Foundry, gas snapshots, CEI ordering, fork testing, no broadcast from agent |
| `keysafety` | auto with blockchain | R3 | Hard blocks on keys, mnemonics, mainnet RPC |
| `design-tokens` | ask | R3 | Token tiers, no hardcoded values, theme resolution, type scale, spacing, motion |
| `design-a11y` | ask | R3 | WCAG 2.2 AA, the eight states, keyboard, RTL |
| `design-components` | ask | R3 | Anatomy, variants, states, error/empty states, the 8 code-output rules |
| `design-handoff` | ask | R3 | Handoff checklist, component Definition of Done |
| `livesystem` | ask | Q8 | Prod is read-only to agents, migration notes required, no schema change without plan |
| `dataprotection` | ask | R3 | PII inventory, no PII in logs/keys/URLs, retention, redaction in fixtures |
| `guards` | **always** | — | Red-then-green, guard hygiene, where a rule belongs |
| `silent-degradation` | **always** | — | No degrade-to-default, catch→[] trap, guess lists, hardcode boundary, raw ids |
| `capability-parity` | if UI + API must agree | Q3+Q5 | Consumer enumeration, UI-as-proof, row-vs-call failure, preview/execute parity |
| `statelessness` | if >1 instance, ever | Q5 | No module-level state, no in-process locks/schedulers/limiters, nothing on local disk, migrations not at boot, two-instance local stack, cross-instance tests |
| `observability` | recommend if any of the above | — | Structured logs, correlation IDs, no payload logging, health endpoints |

## Sizing guidance

- **Typical API + DB + integrations project:** core, guards, silent-degradation, api, database, python *or* typescript, data-integration, observability. Eight files, ~300 lines total.
- **`guards` and `silent-degradation` are not optional.** They are the two modules that address the failure class which survives review — output that looks plausible while being wrong. Every project gets them.
- **Add storage only when asked for.** Most projects touch files; few need a storage *policy*. The policy is worth it when files are user-supplied, large, or served publicly.
- **`determinism` without `storage` is almost never right.** `storage` without `determinism` is common and fine.
- **`statelessness` is decided by deployment, not by preference.** If the project will ever run two instances, it is required — and the local stack changes with it. Retrofitting statelessness after the first production incident is far more expensive than starting with a two-instance compose file.
- If a project needs more than ten modules, it is probably two projects.

## Design modules

Four modules replace the retired `frontend` module, but the Round 3 row asks
about six design capabilities in one question — tokens, verification,
content, direction, build, governance. One rule explains all six: a
capability adds a project rules module only when it has project-level rules
of its own to hold; otherwise its skill reads its doctrine straight from
`${CLAUDE_PLUGIN_ROOT}/kit/` when invoked, the same way every skill already
does for anything that isn't project-specific.

| Capability (bundle) | Module(s) it adds | Notes |
|---|---|---|
| `design.tokens` | `design-tokens` | Token tiers, theme resolution, type scale, spacing, motion |
| `design.verify` | `design-a11y` | WCAG 2.2 AA, the eight states, keyboard, RTL — this *is* the verification layer |
| `design.content` | — | UX-writing doctrine lives in `${CLAUDE_PLUGIN_ROOT}/kit/content/voice-tone.md`, read directly by the `ux-writing` skill |
| `design.direction` | — | Resolves through the token system (`apply-aesthetic`); needs `design.tokens` and adds nothing beyond it |
| `design.build` | `design-components`, `design-handoff` | Anatomy/variants/states/the 8 code-output rules, plus the handoff checklist and component Definition of Done that close the build lane out — `design-handoff.md` points at `kit/workflows/design-to-code.md`, the same design-to-code workflow `design.build`'s own skills (`design-code`, `design-component`, `image-to-code`, `prototype`, `redesign`) run. Needs `design.tokens` |
| `design.govern` | — | SemVer, deprecation policy, and the contribution workflow for the shared design-system package live in `${CLAUDE_PLUGIN_ROOT}/kit/workflows/governance.md`, read directly by the `governance` skill — disjoint from `design-handoff.md`'s per-component checklist, so `design.build`'s modules aren't reused here. Needs `design.verify` |

The dependency rule (Round 3 table, directly underneath it) still fires even
when the capability that *has* the dependency adds no module of its own —
selecting only `design.direction` still pulls in `design.tokens`, which does
add the `design-tokens` module, even though "direction" itself never appears
in `.claude/rules/` under its own name. `design.govern`'s dependency on
`design.verify` earns its keep the same way, despite `design.govern` also
adding no module: `governance.md`'s own Definition of Done requires new work
to meet "the 8-state + a11y + token-mapping bar" and have contrast
"re-checked if colors changed" — checks that exist only once `design-a11y` is
held. Selecting governance without verify would leave the `governance` skill
grading against a bar nothing in the project can measure.

## Agent Catalog

Agents are not modules and are never asked about directly — selection rides on
an answer already given. `verify-runner` is unconditional; each of the other
four is selected exactly when the concern it audits is present — a single
rules module for the first three, any one of the four design modules for
`design-critic`. This is not a new rule: `templates/process/ENFORCEMENT.md`'s
honest-audit table already pairs the first three modules with the agent that
(advisory-)enforces each — this table just makes that pairing a selection
decision instead of an observation, and `design-critic` follows the identical
shape one level up from all four design modules at once.

| Agent | Always? | Selected when | Audits |
|---|---|---|---|
| `verify-runner` | **YES** | — | The verify command itself — every stack, every PR |
| `schema-reviewer` | if `database` selected | `database` module held (Q4) | Migrations and schema changes |
| `integration-auditor` | if `data-integration` selected | `data-integration` module held (Q5/R3) | External-source adapters: retry, timeout, rate-limit, fixtures |
| `contract-drift-checker` | if `contracts` selected | `contracts` module held (Q7) | This repo's handlers/webhooks against the pinned contract spec |
| `design-critic` | if any `design-*` module selected | any of `design-tokens` / `design-a11y` / `design-components` / `design-handoff` held (R3) | Renders the work and argues for rejection — taste and craft the automated gates can't score |

**Rule:** an agent's job doesn't exist without the concern behind it — a
`schema-reviewer` in a project with no `database` module has nothing to review
and would just be advisory noise on every PR. Reuse `decided_modules`; do not
ask a second question to re-derive what a first question already answered.

At Step 3.7, write exactly: `verify-runner`, plus `schema-reviewer` /
`integration-auditor` / `contract-drift-checker` for each of `database` /
`data-integration` / `contracts` present in `decided_modules`, plus
`design-critic` when any of `design-tokens` / `design-a11y` /
`design-components` / `design-handoff` is present. `/project-audit` checks the
same pairing against `.claude/rules/*.md` already on disk (A20) — see
`scripts/check_agents.py`.
