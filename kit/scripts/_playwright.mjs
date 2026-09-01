/**
 * Resolve Playwright for the render gates.
 *
 * These scripts run from wherever the plugin is installed
 * (`~/.claude/plugins/cache/<marketplace>/design-kit/<version>/kit/scripts/`), and a bare
 * `import('playwright')` resolves node_modules by walking up from THAT directory — never
 * from the project the gate is being run against. So the documented remedy,
 * `npm i -D playwright` in your own repo, was invisible to every gate: the scripts
 * reported "playwright not installed" on a machine that had just installed it.
 *
 * Try the plugin's own resolution first, then the directory the gate was invoked from.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

/**
 * Resolving the package file directly bypasses its `exports` map, so Playwright's
 * CommonJS build arrives as `{ default: module.exports }` with no named `chromium`.
 * Unwrap that, and throw when neither shape carries a browser so callers land in their
 * existing "not installed" branch instead of a confusing "no browser available".
 */
function normalize(mod) {
  const pw = mod?.chromium ? mod : mod?.default;
  if (!pw?.chromium) throw new Error('playwright resolved but exposes no chromium');
  return pw;
}

export async function loadPlaywright() {
  // 1. Alongside the plugin — `npm i playwright` inside CLAUDE_PLUGIN_ROOT, or a hoisted copy.
  try { return normalize(await import('playwright')); } catch {}

  // 2. The project being gated — `npm i -D playwright` in the user's repo. createRequire
  //    anchors on <dir>/package.json (which need not exist) and walks up from there, so a
  //    playwright in that directory or any ancestor resolves. accuracy_report runs each
  //    child gate with cwd pinned to the kit root to keep harness paths stable, so the
  //    directory the user actually invoked from arrives separately as DS_INVOKE_CWD.
  const anchors = [...new Set([process.cwd(), process.env.DS_INVOKE_CWD].filter(Boolean))];
  let lastErr;
  for (const dir of anchors) {
    try {
      const req = createRequire(join(dir, 'package.json'));
      return normalize(await import(pathToFileURL(req.resolve('playwright')).href));
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error('playwright not resolvable');
}
