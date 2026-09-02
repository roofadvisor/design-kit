#!/usr/bin/env python3
"""
O-05 — structured logs; never log payloads, PII, or credentials.

Flags log/print call sites whose argument text names payload-or-secret-shaped
identifiers (request/response bodies, headers, passwords, tokens, auth
material). A log line that emits a payload is a slow-motion credential leak
and an unbounded PII sink — and it looks perfectly reasonable in review.

Deliberately conservative: identifier names in the call, not data flow.
Escape hatch: `log-ok: <reason>` on the line or the line above (reason
required — "logs the redacted summary" is a fine reason).

Exclusions: tests, fixtures, kit/scripts/ (see LOCAL_CLI_DIR below). Exit 1 on
any violation.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import SKIP_DIRS, repo_root  # noqa: E402

# Additive (A21): fixture/test-data dirs are not source under O-05's remit —
# extend the shared skip set rather than hand-copy it.
SKIP = SKIP_DIRS | {"fixtures", "__fixtures__", "testdata"}

# kit/scripts/ is the design half's own CLI: lint/validate tools (lint_hardcodes,
# validate_theme_refs, validate_contrast, validate_tokens, ...) whose print()
# calls ARE their user-facing output — reporting hardcoded colours, theme/token
# definitions, contrast pairs. O-05 governs application logging that could leak
# a real payload or credential; a linter announcing "hardcoded token" is a
# design value, not one. This is a path exclusion, not a SKIP_DIRS name: adding
# the bare name "scripts" to SKIP_DIRS would also prune the top-level scripts/
# directory, which legitimately handles NOTION_TOKEN/GITHUB_TOKEN and Bearer
# auth headers (scripts/notion_sync.py) and must stay in O-05's scope.
LOCAL_CLI_DIR = os.path.join("kit", "scripts")
EXT = (".py", ".ts", ".tsx", ".js", ".jsx")
TESTY = re.compile(r"(^|[._-])test|spec\.|^tests?$")
CALL = re.compile(
    r"(?:console\.(?:log|info|warn|error|debug)|logger?\.\w+|logging\.\w+|print)\s*\(",
)
ARG_WINDOW = 300  # chars after the opening paren, newline-crossing — a
                  # formatter that puts req.body on the next line must not hide it
SENSITIVE = re.compile(
    r"\b(?:payload|req\.body|request\.body|res\.body|response\.body|password|passwd|secret|token|authorization|api_key|apikey|private_key|headers|cookie|ssn|credit_card)\b",
    re.I,
)
OK = re.compile(r"log-ok:\s*(\S.*)?")


def main():
    base = repo_root()
    findings, bare, scanned = [], [], 0
    for dirpath, dirnames, filenames in os.walk(base):
        rel_dir = os.path.relpath(dirpath, base)
        if rel_dir == LOCAL_CLI_DIR or rel_dir.startswith(LOCAL_CLI_DIR + os.sep):
            dirnames[:] = []  # local CLI tool output — see LOCAL_CLI_DIR above
            continue
        dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".") and not TESTY.search(d)]
        for name in filenames:
            if not name.endswith(EXT) or TESTY.search(name):
                continue
            path = os.path.join(dirpath, name)
            if os.path.abspath(path) == os.path.abspath(__file__):
                continue
            rel = os.path.relpath(path, base)
            scanned += 1
            content = open(path, encoding="utf-8", errors="replace").read()
            lines = content.splitlines()
            for m in CALL.finditer(content):
                window = content[m.end():m.end() + ARG_WINDOW]
                window = window.split("\n\n", 1)[0]  # stop at a blank line
                if not SENSITIVE.search(window):
                    continue
                i = content.count("\n", 0, m.start())
                line = lines[i] if i < len(lines) else ""
                ann = OK.search(line) or (OK.search(lines[i - 1]) if i else None)
                if ann:
                    if not (ann.group(1) or "").strip():
                        bare.append(f"{rel}:{i + 1}")
                    continue
                findings.append(f"{rel}:{i + 1}  {line.strip()[:100]}")

    if not scanned:
        print("check_log_hygiene: NOTE — no source files in scope; O-05 not applicable.")
        return 0
    fail = False
    if findings:
        fail = True
        print(f"O-05 VIOLATIONS — payload/credential-shaped identifiers in log calls ({len(findings)}):")
        for f in findings:
            print(f"  {f}")
        print("Log ids and counts, not bodies. Redact, summarize, or annotate `log-ok: <reason>`.")
    if bare:
        fail = True
        print(f"O-05: log-ok annotation WITHOUT a reason ({len(bare)}): " + ", ".join(bare))
    if not fail:
        print(f"check_log_hygiene: OK — {scanned} file(s) clean (O-05).")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
