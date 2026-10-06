// Shared helpers for the "spec" (spec fidelity and copy) review scripts. Plain node against dist/ through tests/lib/harness.mjs.
//   import { T, capture, STATES, ... } from './spec-lib.mjs';
// Every script prints 'ok   <name>' / 'FAIL <name>: <why>' / 'note ...' and exits non-zero when anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, setTheme, VIEWPORTS } from '../lib/harness.mjs';
import data from '../../src/data/sample.json' with { type: 'json' };

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCRATCH = path.join(ROOT, '.scratch', 'spec');
fs.mkdirSync(SCRATCH, { recursive: true });
export { launch, visit, go, setTheme, VIEWPORTS, data };

export class T {
  constructor(name) { this.name = name; this.failed = 0; this.passed = 0; this.results = []; }
  async check(name, fn) {
    try { const ev = await fn(); this.passed += 1; this.results.push({ name, ok: true, ev: typeof ev === 'string' ? ev : undefined }); console.log('ok   ' + name + (typeof ev === 'string' ? '  [' + ev + ']' : '')); }
    catch (e) { this.failed += 1; const why = (e && e.message) || String(e); this.results.push({ name, ok: false, why }); console.log('FAIL ' + name + ': ' + why); }
  }
  note(name, why) { this.results.push({ name, note: why }); console.log('note ' + name + ': ' + why); }
  finish() {
    console.log(`\n${this.name}: ${this.passed} passed, ${this.failed} failed`);
    try { fs.writeFileSync(path.join(SCRATCH, this.name + '.json'), JSON.stringify(this.results, null, 1)); } catch (e) { /* ignore */ }
    process.exitCode = this.failed ? 1 : 0;
  }
}
export const ok = (v, msg) => { if (!v) throw new Error(msg); };
export const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
export const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ the spec, parsed from docs/spec.md */
export const SPEC = fs.readFileSync(path.join(ROOT, 'docs', 'spec.md'), 'utf8');
export function specTable(heading) {
  // Returns the rows of the first markdown table after "## heading" as arrays of raw cell strings.
  const i = SPEC.indexOf(heading);
  if (i < 0) throw new Error('spec heading not found: ' + heading);
  const lines = SPEC.slice(i).split('\n');
  const rows = [];
  let started = false;
  for (const l of lines.slice(1)) {
    if (l.startsWith('|')) { started = true; rows.push(l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())); }
    else if (started) break;
  }
  return rows.filter((r, k) => k !== 1);   // drop the |---| separator
}
export const mdLink = (cell) => { const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(cell); return m ? { text: m[1], url: m[2] } : { text: cell, url: null }; };
export const stripMd = (s) => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').replace(/\*\*/g, '');

/* ------------------------------------------------------------------ states */
const gear = (p) => p.getByRole('button', { name: 'Settings', exact: true }).click();
const menuBtn = (p) => p.locator('nav[aria-label="Primary"] button[aria-label="Menu"]').click();
const contractIds = data.contracts.map((c) => c.id);
const flagIds = [];   // filled lazily from the app (needs the engine); see flagIdsFromApp

/** Static states: { id, hash, open?(page), seed? }. Seed values are written to localStorage before load. */
export const ROUTE_STATES = [
  { id: 'overview', hash: '#/overview' },
  { id: 'opportunities', hash: '#/opportunities' },
  { id: 'opportunities-all', hash: '#/opportunities?status=all' },
  { id: 'opportunities-empty-search', hash: '#/opportunities?q=zzzzzz' },
  { id: 'opportunities-type-overCap', hash: '#/opportunities?type=overCap' },
  { id: 'opportunities-type-nearCap', hash: '#/opportunities?type=nearCap' },
  { id: 'opportunities-type-renewal', hash: '#/opportunities?type=renewal' },
  { id: 'opportunities-type-uplift', hash: '#/opportunities?type=uplift' },
  { id: 'opportunities-all-reviewed', hash: '#/opportunities', seed: { 'kontor-triage': Object.fromEntries(['F-C-005-overCap', 'F-C-007-overCap', 'F-C-001-nearCap', 'F-C-003-renewal', 'F-C-004-uplift', 'F-C-002-renewal', 'F-C-001-renewal', 'F-C-004-renewal', 'F-C-007-renewal', 'F-C-014-renewal', 'F-C-011-overCap', 'F-C-018-renewal', 'F-C-005-renewal', 'F-C-012-uplift', 'F-C-016-renewal', 'F-C-015-renewal', 'F-C-009-renewal', 'F-C-010-uplift', 'F-C-017-renewal'].map((k) => [k, 'explained'])) } },
  { id: 'renewals', hash: '#/renewals' },
  { id: 'spend', hash: '#/spend' },
  { id: 'spend-matches', hash: '#/spend/matches' },
  { id: 'spend-no-contract', hash: '#/spend/no-contract' },
  { id: 'contracts', hash: '#/contracts' },
  { id: 'contracts-empty-search', hash: '#/contracts?q=zzzzzz' },
  ...contractIds.map((id) => ({ id: 'contract-' + id, hash: '#/contracts/' + id })),
  { id: 'source-C-005', hash: '#/source/C-005/X-C-005-maximumValue?from=opportunities' },
  { id: 'source-missing', hash: '#/source/C-005/not-an-id' },
  { id: 'method', hash: '#/method' },
  { id: 'roadmap', hash: '#/roadmap' },
  { id: 'evidence', hash: '#/evidence' },
  { id: 'notfound', hash: '#/nope' },
  { id: 'contract-notfound', hash: '#/contracts/C-999' },
];
export const OVERLAY_STATES = [
  { id: 'overlay-about', hash: '#/overview', open: (p) => p.getByRole('button', { name: 'About this data' }).click(), scope: '[role="dialog"]' },
  { id: 'overlay-feedback', hash: '#/overview', open: (p) => p.getByRole('button', { name: 'Give feedback' }).first().click(), scope: '[role="dialog"]' },
  { id: 'overlay-feedback-error', hash: '#/overview', open: async (p) => { await p.getByRole('button', { name: 'Give feedback' }).first().click(); await p.waitForSelector('[role="dialog"]'); await p.getByRole('button', { name: 'Save feedback' }).click(); await p.waitForTimeout(200); }, scope: '[role="dialog"]' },
  { id: 'overlay-feedback-blocked', hash: '#/overview', blockStorage: true, open: async (p) => { await p.getByRole('button', { name: 'Give feedback' }).first().click(); await p.waitForSelector('[role="dialog"]'); await p.locator('[role="dialog"] label', { hasText: 'Yes' }).first().click(); await p.getByRole('button', { name: 'Save feedback' }).click(); await p.waitForTimeout(300); }, scope: '[role="dialog"]' },
  { id: 'overlay-feedback-saved-list', hash: '#/overview', seed: { 'kontor-feedback': [{ at: '2026-10-06T10:00:00.000Z', answer: 'maybe', comment: 'Test comment', asOf: '2026-10-06' }] }, open: (p) => p.getByRole('button', { name: 'Give feedback' }).first().click(), scope: '[role="dialog"]' },
  { id: 'overlay-settings', hash: '#/overview', open: gear, scope: '[role="dialog"]' },
  { id: 'overlay-settings-changed', hash: '#/overview', seed: { 'kontor-assumptions': { renewalRate: 0.08 }, 'kontor-triage': { 'F-C-005-overCap': 'explained' } }, open: gear, scope: '[role="dialog"]' },
  { id: 'overlay-settings-confirm', hash: '#/overview', open: async (p) => { await gear(p); await p.waitForSelector('[role="dialog"]'); await p.getByRole('button', { name: 'Reset demo changes' }).click(); await p.waitForTimeout(250); }, scope: '[role="alertdialog"], [role="dialog"]' },
  { id: 'overlay-demo-guide', hash: '#/overview', open: (p) => p.getByRole('button', { name: 'Open demo guide' }).click(), scope: '[role="dialog"]' },
  { id: 'overlay-menu', hash: '#/overview', open: menuBtn, scope: 'nav[aria-label="Menu"]' },
  { id: 'overlay-payments-C-005', hash: '#/spend?payments=C-005', scope: '[role="dialog"]' },
  { id: 'overlay-payments-C-011', hash: '#/spend?payments=C-011', scope: '[role="dialog"]' },
  { id: 'overlay-payments-C-007', hash: '#/spend?payments=C-007', scope: '[role="dialog"]' },
  { id: 'overlay-payments-C-003', hash: '#/spend?payments=C-003', scope: '[role="dialog"]' },
  { id: 'overlay-payee-dunmoor', hash: '#/spend/no-contract?payee=Dunmoor%20Agency%20Staffing%20Ltd', scope: '[role="dialog"]' },
];

/** In-page capture of everything a user can read or hear on the current screen. */
export const CAPTURE_FN = (scopeSel) => {
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const shown = (el) => { if (!el.getClientRects().length) return false; let e = el; while (e && e.nodeType === 1) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; e = e.parentElement; } return true; };
  const roots = scopeSel ? [...document.querySelectorAll(scopeSel)] : [document.body];
  const inRoots = (el) => roots.some((r) => r.contains(el));
  const body = scopeSel ? roots.map((r) => r.innerText).join('\n') : document.body.innerText;
  const q = (s) => [...document.querySelectorAll(s)].filter(inRoots);
  const out = {};
  out.title = document.title;
  out.theme = document.documentElement.getAttribute('data-theme');
  out.text = body;
  out.raw = roots.map((r) => { const c = r.cloneNode(true); c.querySelectorAll('script,style,noscript').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }).join('\n');
  const tcase = (el) => { let e = el; while (e && e.nodeType === 1) { const tt = getComputedStyle(e).textTransform; if (tt && tt !== 'none') return tt; e = e.parentElement; } return 'none'; };
  out.headings = q('h1,h2,h3,h4,h5,h6,[role="heading"]').filter(shown).map((h) => ({ tag: h.tagName.toLowerCase(), text: norm(h.innerText), raw: norm(h.textContent), tt: tcase(h) }));
  const CTL = 'button, a[href], [role="button"], [role="menuitem"], [role="tab"], summary, input[type="submit"], input[type="button"]';
  out.controls = q(CTL).filter(shown).map((el) => ({
    tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', href: el.getAttribute('href') || '', cls: String(el.className || '').slice(0, 60),
    text: norm(el.innerText || el.value || ''), raw: norm(el.textContent || el.value || ''), tt: tcase(el), label: el.getAttribute('aria-label') || '', title: el.getAttribute('title') || '',
    inHeader: !!el.closest('header, nav.shell__rail, .shell__bottombar'),
  }));
  out.attrs = q('[aria-label],[title],[aria-description],[aria-roledescription],[placeholder],[alt],[aria-describedby]').filter(shown).map((el) => ({
    tag: el.tagName.toLowerCase(), label: el.getAttribute('aria-label') || '', title: el.getAttribute('title') || '', desc: el.getAttribute('aria-description') || '',
    placeholder: el.getAttribute('placeholder') || '', alt: el.getAttribute('alt') || '',
  }));
  out.svgText = q('svg text, svg title, svg desc').map((n) => norm(n.textContent)).filter(Boolean);
  const banner = document.querySelector('.sample-banner');
  if (banner) { const r = banner.getBoundingClientRect(); out.banner = { text: norm(banner.innerText), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), visible: shown(banner) && r.bottom > 0 && r.top < innerHeight }; }
  out.h1Count = document.querySelectorAll('#shell-main h1').length;
  out.inputs = q('input, select, textarea').filter(shown).map((el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', label: el.getAttribute('aria-label') || '' }));
  out.sampleBadge = norm((document.querySelector('header') || {}).innerText || '');
  return out;
};

export async function seedStore(page, seed) {
  await page.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, seed);
}

/** Visit a state (full load), optionally seed storage first (set then reload), open an overlay and capture. */
export async function captureState(h, st, theme, viewport = VIEWPORTS.desktop) {
  const t = await h.newPage({ theme, viewport, blockStorage: !!st.blockStorage });
  try {
    await visit(t, st.hash);
    if (st.seed) { await seedStore(t.page, st.seed); await visit(t, st.hash); }
    if (st.open) { await st.open(t.page); await t.page.waitForTimeout(450); }
    await t.page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished))).catch(() => {});
    const cap = await t.page.evaluate(CAPTURE_FN, st.scope || null);
    return { id: st.id, hash: st.hash, theme, viewport: viewport.width + 'x' + viewport.height, errors: t.errors.slice(), ...cap };
  } finally { await t.ctx.close().catch(() => {}); }
}

export const CAPTURE_FILE = path.join(SCRATCH, 'capture.json');
