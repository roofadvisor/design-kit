#!/usr/bin/env node
/**
 * REAL-render WCAG gate. Opens HTML in headless Chrome, disables transitions,
 * and measures the contrast of every visible text element against its true
 * (alpha-composited) background. This is ground truth — not hand-typed numbers.
 *
 * Usage:
 *   node scripts/measure_render.mjs examples/apple-demo/index.html
 *   node scripts/measure_render.mjs --dark examples/sample-app/preview.html
 *   node scripts/measure_render.mjs            # defaults to examples/ *.html
 *
 * Requires Playwright (`npm i -D playwright` + a Chrome/Chromium). If it isn't
 * installed the script SKIPS (exit 0) so it never blocks users who don't have it.
 * Exit 1 only when a real rendered text pair is below WCAG 2.2 AA.
 */
import { readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { loadPlaywright } from './_playwright.mjs';

let chromium;
try { ({ chromium } = await loadPlaywright()); }
catch {
  // A missing browser must not read as a pass. Without DS_REQUIRE_BROWSER the gate
  // stays skippable for local convenience; CI and accuracy_report set it to 1, so a
  // machine that cannot render fails loudly instead of reporting green on nothing.
  const required = process.env.DS_REQUIRE_BROWSER === "1";
  console.log(`measure_render: playwright not installed — ${required ? "REQUIRED, FAILING" : "SKIPPED"}`);
  process.exit(required ? 1 : 0);
}

const argv = process.argv.slice(2);
const dark = argv.includes('--dark');
let files = argv.filter(a => !a.startsWith('--'));
if (files.length === 0) {
  const root = resolve('examples');
  const walk = d => readdirSync(d).flatMap(n => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : (p.endsWith('.html') ? [p] : []);
  });
  try { files = walk(root); } catch { files = []; }
}
if (files.length === 0) { console.log('measure_render: no HTML files to check.'); process.exit(0); }

function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function L([r, g, b]) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
function ratio(a, b) { const l1 = L(a), l2 = L(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }

let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); }
catch {
  try { browser = await chromium.launch(); }
  catch (e) {
    // DS_REQUIRE_BROWSER means the caller (accuracy_report) counts this gate — a silent
    // skip would read as a pass, so it must fail instead.
    if (process.env.DS_REQUIRE_BROWSER) {
      console.error('measure_render: no browser available — FAIL (DS_REQUIRE_BROWSER set)');
      process.exit(1);
    }
    console.log('measure_render: no browser available — SKIPPED'); process.exit(0);
  }
}

let totalFail = 0;
for (const f of files) {
  const page = await browser.newPage();
  await page.goto('file://' + resolve(f));
  await page.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

  const items = await page.evaluate(() => {
    const toRGBA = s => { const m = s && s.match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2], m[3] !== undefined ? +m[3] : 1] : null; };
    // CSS opacity is GROUP compositing: at each opacity boundary the group's flattened
    // pixel blends toward what lies BEHIND the group — the group's own backdrop must not
    // be applied again under the text. Model each pixel as premultiplied accumulator P
    // plus a weight w for whatever composites behind from here outward:
    //   bg layer (c, a):   P += w·a·c;  w ×= (1−a)
    //   opacity boundary:  P ×= op;     w = op·w + (1−op)
    // Returns null when an ancestor's opacity is 0 — the text is invisible, not low-contrast.
    function effPair(el, col) {
      const mk = (rgb, a) => ({ P: rgb.map(c => c * a), w: 1 - a });
      const layer = (acc, rgb, a) => { acc.P = acc.P.map((c, i) => c + acc.w * a * rgb[i]); acc.w *= (1 - a); };
      const boundary = (acc, op) => { acc.P = acc.P.map(c => c * op); acc.w = op * acc.w + (1 - op); };
      // invisibility beats unmeasurability: an opacity:0 ancestor anywhere hides the text,
      // even when a background-image sits lower in the chain
      for (let n = el; n; n = n.parentElement) if (+getComputedStyle(n).opacity === 0) return null;
      const fg = mk([col[0], col[1], col[2]], col[3] === undefined ? 1 : col[3]);
      const bg = mk([0, 0, 0], 0);
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        // a background-image/gradient paints ABOVE the node's background-color; if the
        // accumulated backdrop is still translucent here, the image shows through under
        // the text and computed-style math cannot know its pixels
        if (cs.backgroundImage && cs.backgroundImage !== 'none' && bg.w > 0) return { unmeasurable: true };
        const c = toRGBA(cs.backgroundColor);
        if (c && c[3] > 0) { layer(fg, [c[0], c[1], c[2]], c[3]); layer(bg, [c[0], c[1], c[2]], c[3]); }
        const op = +cs.opacity;
        if (op < 1) { boundary(fg, op); boundary(bg, op); }
      }
      return { fg: fg.P.map((c, i) => c + fg.w * 255), bg: bg.P.map((c, i) => c + bg.w * 255) };
    }
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'USE'].includes(el.tagName)) continue;
      const direct = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length);
      if (!direct) continue;
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue; // not visible
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const col = toRGBA(cs.color); if (!col) continue;
      const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
      const pair = effPair(el, col);
      if (!pair) continue; // an ancestor's opacity:0 hides the text entirely
      out.push({ tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
        text: el.textContent.trim().slice(0, 24), color: pair.fg || null, bg: pair.bg || null,
        unmeasurable: !!pair.unmeasurable, px, bold });
    }
    return out;
  });
  await page.close();

  const fails = [];
  for (const it of items) {
    // text over a background-image/gradient: the true pixels are unknowable from
    // computed styles — fail it for manual verification rather than pass it blind
    if (it.unmeasurable) { fails.push({ ...it, r: null, need: null }); continue; }
    const need = (it.px >= 24 || (it.px >= 18.66 && it.bold)) ? 3.0 : 4.5;
    const r = ratio(it.color, it.bg);
    if (r < need) fails.push({ ...it, r, need });
  }
  const mode = dark ? ' [dark]' : '';
  if (fails.length) {
    totalFail += fails.length;
    console.log(`\nFAIL ${f}${mode} — ${fails.length} text pair(s) below WCAG AA or unmeasurable:`);
    for (const x of fails) console.log(x.r === null
      ? `  x <${x.tag}> "${x.text}" over a background-image — contrast unmeasurable from computed styles; verify manually`
      : `  x <${x.tag}> "${x.text}" ${x.r.toFixed(2)}:1 (need ${x.need})  [rgb(${x.color.map(Math.round)}) on rgb(${x.bg.map(Math.round)})]`);
  } else {
    console.log(`OK   ${f}${mode} — all ${items.length} text element(s) meet WCAG AA`);
  }
}
await browser.close();
if (totalFail) { console.log(`\n${totalFail} real-rendered contrast failure(s).`); process.exit(1); }
console.log('\nOK: every rendered text element meets WCAG 2.2 AA.');
process.exit(0);
