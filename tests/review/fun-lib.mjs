// Shared helpers for the "fun" (functional QA) review scripts. Runs with plain node against dist/ through tests/lib/harness.mjs.
//   import { T, launchApp, gold, ... } from './fun-lib.mjs';
// Every script prints 'ok   <name>' / 'FAIL <name>: <why>' / 'note <name>: <why>' and exits non-zero when anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme } from '../lib/harness.mjs';
import data from '../../src/data/sample.json' with { type: 'json' };

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCRATCH = path.join(ROOT, '.scratch', 'fun');
fs.mkdirSync(SCRATCH, { recursive: true });
export { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme, data };

/* ---------------------------------------------------------------- tiny test runner */
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
export const text = async (loc) => norm(await loc.innerText());
export const settle = (page, ms = 150) => page.waitForTimeout(ms);
export const hashOf = (page) => page.evaluate(() => location.hash);
export const h1 = async (page) => norm(await page.locator('#shell-main h1').first().innerText());
export const waitH1 = (page, expected, timeout = 6000) => page.waitForFunction((e) => { const el = document.querySelector('#shell-main h1'); return !!el && (e instanceof Object ? new RegExp(e.re).test(el.textContent) : el.textContent.trim() === e); }, expected, { timeout });
export const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');

/* ---------------------------------------------------------------- golden numbers (requirements 6.6) */
export const gold = {
  headline: '£6.1m across 15 contracts flagged as opportunities to investigate',
  total: 6145238,
  sum: '£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238',
  cards: [['overCap', '£4.2m', 3], ['nearCap', '£0.6m', 1], ['renewal', '£1.1m', 12], ['uplift', '£0.3m', 3]],
  rankedFirstSix: ['£3,350,000', '£760,000', '£642,478', '£310,000', '£188,200', '£145,000'],
  ranked: ['F-C-005-overCap', 'F-C-007-overCap', 'F-C-001-nearCap', 'F-C-003-renewal', 'F-C-004-uplift', 'F-C-002-renewal', 'F-C-001-renewal', 'F-C-004-renewal', 'F-C-007-renewal', 'F-C-014-renewal', 'F-C-011-overCap', 'F-C-018-renewal', 'F-C-005-renewal', 'F-C-012-uplift', 'F-C-016-renewal', 'F-C-015-renewal', 'F-C-009-renewal', 'F-C-010-uplift', 'F-C-017-renewal'],
  rankedValues: [3350000, 760000, 642478, 310000, 188200, 145000, 120000, 110000, 90000, 70000, 62000, 57500, 50000, 49000, 47500, 39000, 21000, 18060, 15500],
  bands: { m3: ['C-003', 'C-017', 'C-009'], m6: ['C-004', 'C-005', 'C-018', 'C-002'], m12: ['C-015', 'C-014'] },
  noContract: ['Dunmoor Agency Staffing Ltd', 'Oakhaven Independent Care Placements Ltd', 'Harlowe Transport Hire Ltd', 'Corran Digital Consulting Ltd', 'Skerrow Temporary Accommodation Ltd', 'Bellmere Building Supplies Ltd', 'Pennywhistle Print and Mailing Ltd', 'Mirefield Training Partners Ltd'],
  noContractTotal: 23830000,
  capOrder: ['C-005', 'C-007', 'C-011', 'C-001', 'C-017', 'C-009'],
};
export const contract = (id) => data.contracts.find((c) => c.id === id);
export const extraction = (id) => data.extractions.find((x) => x.id === id);
export const KEYS = ['kontor-theme', 'kontor-triage', 'kontor-matches', 'kontor-assumptions', 'kontor-handcheck', 'kontor-feedback'];

/* ---------------------------------------------------------------- app helpers */
export async function launchApp() {
  const h = await launch({ dist: process.env.KONTOR_DIST || null });
  return h;
}
/** Click a rail item by label (a real click on nav[aria-label=Primary]). */
export async function rail(page, label) {
  await page.locator(`nav[aria-label="Primary"] button[aria-label="${label}"]`).click();
  await page.waitForFunction(() => document.querySelectorAll('#shell-main h1').length >= 1, null, { timeout: 8000 });
  await page.waitForTimeout(120);
}
export const store = (page) => page.evaluate((keys) => Object.fromEntries(keys.map((k) => { try { return [k, localStorage.getItem(k)]; } catch (e) { return [k, 'ERR']; } })), KEYS);
export const setStore = (page, obj) => page.evaluate((o) => { for (const [k, v] of Object.entries(o)) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } }, obj);
/** The Overview headline as printed, read through a fresh in-app navigation. */
export async function overviewHeadline(page) {
  await go(page, '#/overview');
  await page.waitForSelector('#shell-main h1');
  return h1(page);
}
export const dialogOpen = (page) => page.evaluate(() => !![...document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')].find((d) => getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().width > 0));
export const activeDesc = (page) => page.evaluate(() => { const a = document.activeElement; if (!a) return null; return { tag: a.tagName, id: a.id, text: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 60), cls: a.className && a.className.toString().slice(0, 60) }; });
export const noOverflow = (page) => page.evaluate(() => {
  const m = document.getElementById('shell-main');
  return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: m ? m.scrollWidth - m.clientWidth : null };
});
export const toasts = (page) => page.$$eval('.kx-toast', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
export async function shot(page, name) { try { await page.screenshot({ path: path.join(SCRATCH, name + '.png') }); } catch (e) { /* ignore */ } }
