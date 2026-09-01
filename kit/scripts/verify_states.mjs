#!/usr/bin/env node
/**
 * STATE-AWARE WCAG gate. For every interactive element, measures the real
 * computed text/background contrast in DEFAULT, HOVER, and FOCUS states — so a
 * button that turns the wrong color on hover (e.g. a secondary that picks up the
 * primary fill via CSS specificity) is caught, not just the resting state.
 *
 * Usage: node scripts/verify_states.mjs <file.html> [--dark]
 * Exit 1 if any state of any element drops below WCAG AA.
 */
import { resolve } from 'node:path';
import { loadPlaywright } from './_playwright.mjs';
let chromium;
try { ({ chromium } = await loadPlaywright()); }
catch {
  // A missing browser must not read as a pass. Without DS_REQUIRE_BROWSER the gate
  // stays skippable for local convenience; CI and accuracy_report set it to 1, so a
  // machine that cannot render fails loudly instead of reporting green on nothing.
  const required = process.env.DS_REQUIRE_BROWSER === "1";
  console.log(`verify_states: playwright not installed — ${required ? "REQUIRED, FAILING" : "SKIPPED"}`);
  process.exit(required ? 1 : 0);
}

const argv = process.argv.slice(2);
const dark = argv.includes('--dark');
const file = argv.find(a => !a.startsWith('--'));
if (!file) { console.log('usage: node scripts/verify_states.mjs <file.html> [--dark]'); process.exit(0); }

function lin(c) { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }
function L([r, g, b]) { return .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b); }
function ratio(a, b) { const l1 = L(a), l2 = L(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + .05) / (lo + .05); }
const parse = s => { const m = s && s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
const alphaOf = s => { const m = s && s.match(/[\d.]+/g); return m && m[3] !== undefined ? +m[3] : 1; };

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await page.goto('file://' + resolve(file), { waitUntil: 'networkidle' }).catch(() => {});
await page.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

const read = el => {
  const transparent = c => { const a = c.match(/[\d.]+/g); return !c || c === 'rgba(0, 0, 0, 0)' || (a && a.length === 4 && parseFloat(a[3]) === 0); };
  // a gradient/image anywhere before the first opaque color means the true backdrop
  // pixels are unknowable from computed styles
  const eff = n => {
    while (n) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return { img: true };
      if (!transparent(s.backgroundColor)) return { c: s.backgroundColor };
      n = n.parentElement;
    }
    return { c: getComputedStyle(document.body).backgroundColor };
  };
  const cs = getComputedStyle(el);
  // skip non-text form controls (checkbox/radio/switch render natively via accent-color,
  // not CSS text color) and invisible elements — measuring their color/bg is meaningless.
  const isToggle = el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type);
  // WCAG 1.4.3 / 1.4.11 exempt disabled (inactive) controls from contrast.
  const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
  // an opacity:0 ANCESTOR hides the control without changing its own computed opacity
  let hiddenByAncestor = false;
  for (let n = el.parentElement; n; n = n.parentElement) if (+getComputedStyle(n).opacity === 0) { hiddenByAncestor = true; break; }
  const skip = isToggle || el.getAttribute('role') === 'switch' || +cs.opacity === 0 || hiddenByAncestor || isDisabled;
  let own = null, bgImage = false;
  if (cs.backgroundImage && cs.backgroundImage !== 'none') bgImage = true;
  else if (!transparent(cs.backgroundColor)) own = cs.backgroundColor;
  else { const e = eff(el.parentElement); if (e.img) bgImage = true; else own = e.c; }
  // graphical / icon-only control: no DIRECT text node (only an <svg> or nothing) →
  // WCAG 1.4.11 non-text contrast applies (3:1), not the 4.5 text rule.
  // Text inputs/selects/textareas render their VALUE as text without any text child
  // node — they always take the text threshold.
  const isTextControl = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !isToggle;
  const graphical = !isTextControl && ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  // cumulative CSS opacity (element x ancestors) attenuates the rendered text too
  let effOp = +cs.opacity || 1;
  for (let n = el.parentElement; n; n = n.parentElement) effOp *= (+getComputedStyle(n).opacity || 1);
  return { skip, graphical, bgImage, effOp, color: cs.color, bg: own, label: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 18), px: parseFloat(cs.fontSize), bold: (parseInt(cs.fontWeight, 10) || 400) >= 700 };
};

const handles = await page.$$('button, a[href], input, select, textarea, [role="button"], [role="switch"]');
const fails = [];
let checked = 0;
for (const h of handles) {
  for (const state of ['default', 'hover', 'focus']) {
    try {
      if (state === 'hover') await h.hover({ timeout: 1000, force: true });
      if (state === 'focus') await h.evaluate(el => el.focus && el.focus());
      const r = await h.evaluate(read);
      await page.mouse.move(0, 0);
      if (state === 'focus') await h.evaluate(el => el.blur && el.blur());
      if (r.skip) break;  // non-text control (checkbox/radio/switch) or invisible — not a text-contrast target
      if (r.bgImage) { checked++; fails.push(`${state.padEnd(7)} "${r.label}" over a background-image — contrast unmeasurable from computed styles; verify manually`); continue; }
      let fg = parse(r.color); const bg = parse(r.bg);
      if (!fg || !bg) continue;
      // translucent text composites over its backdrop before it reaches the eye —
      // both the color's own alpha and the cumulative CSS opacity attenuate it
      const a = alphaOf(r.color) * (r.effOp === undefined ? 1 : r.effOp);
      if (a < 1) fg = fg.map((c, i) => c * a + bg[i] * (1 - a));
      checked++;
      const need = r.graphical ? 3.0 : ((r.px >= 24 || (r.px >= 18.66 && r.bold)) ? 3.0 : 4.5);
      const cr = ratio(fg, bg);
      if (cr < need) fails.push(`${state.padEnd(7)} "${r.label}" ${cr.toFixed(2)}:1 (need ${need})  [rgb(${fg}) on rgb(${bg})]`);
    } catch { /* element not hoverable/visible — skip */ }
  }
}
await browser.close();

const mode = dark ? ' [dark]' : '';
console.log(`Checked ${checked} element-state(s) in ${file}${mode}`);
if (fails.length) {
  console.log(`\nFAIL — ${fails.length} state(s) below WCAG AA:`);
  for (const f of fails) console.log('  x ' + f);
  process.exit(1);
}
console.log('OK: every interactive element passes WCAG AA in default, hover, and focus.');
process.exit(0);
