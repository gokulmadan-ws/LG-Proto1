// Shared helpers for the "data" review scripts (data integrity and number correctness).
// Plain node against dist/ through tests/lib/harness.mjs. Every script prints 'ok   name' / 'FAIL name: why' / 'note ...'
// and exits non-zero when anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, VIEWPORTS } from '../lib/harness.mjs';
import * as E from './data-engine.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCRATCH = path.join(ROOT, '.scratch', 'data');
fs.mkdirSync(SCRATCH, { recursive: true });
export { launch, visit, go, VIEWPORTS, E };
export const DATA = E.DATA;

export class T {
  constructor(name) { this.name = name; this.failed = 0; this.passed = 0; this.results = []; }
  check(name, fn) {
    try { const ev = fn(); this.passed += 1; this.results.push({ name, ok: true }); if (process.env.VERBOSE) console.log('ok   ' + name + (typeof ev === 'string' ? '  [' + ev + ']' : '')); }
    catch (e) { this.failed += 1; const why = (e && e.message) || String(e); this.results.push({ name, ok: false, why }); console.log('FAIL ' + name + ': ' + why); }
  }
  async acheck(name, fn) {
    try { const ev = await fn(); this.passed += 1; this.results.push({ name, ok: true }); if (process.env.VERBOSE) console.log('ok   ' + name + (typeof ev === 'string' ? '  [' + ev + ']' : '')); }
    catch (e) { this.failed += 1; const why = (e && e.message) || String(e); this.results.push({ name, ok: false, why }); console.log('FAIL ' + name + ': ' + why); }
  }
  eq(name, got, want) { this.check(name, () => { if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`); }); }
  note(name, why) { this.results.push({ name, note: why }); console.log('note ' + name + ': ' + why); }
  finish() {
    console.log(`\n${this.name}: ${this.passed} passed, ${this.failed} failed`);
    try { fs.writeFileSync(path.join(SCRATCH, this.name + '.json'), JSON.stringify(this.results, null, 1)); } catch (e) { /* ignore */ }
    process.exitCode = this.failed ? 1 : 0;
  }
}

export const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
/** '£3,350,000' -> 3350000, '£1,664,489.26' -> 1664489.26, 'At least £5,260,000' -> 5260000 (first money token). */
export const money = (s) => { const m = String(s).match(/£\s?([\d,]+(?:\.\d+)?)/); return m ? Number(m[1].replace(/,/g, '')) : NaN; };
export const moneys = (s) => [...String(s).matchAll(/£\s?([\d,]+(?:\.\d+)?)(m|k)?/g)].map((m) => ({ v: Number(m[1].replace(/,/g, '')), unit: m[2] || '' }));
export const pctOf = (s) => { const m = String(s).match(/(-?\d+(?:\.\d+)?)%/); return m ? Number(m[1]) : NaN; };
export const FLAG_LABEL = { overCap: 'Spend over cap', nearCap: 'Close to cap', renewal: 'Renewal decision', uplift: 'Price increase above cap' };
export const contractById = Object.fromEntries(DATA.contracts.map((c) => [c.id, c]));
export const D = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`; };
export const DL = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`; };
export const eqMoney = (a, b) => Math.abs(a - b) < 0.005;

/* state seeding: write the three decision keys and reload so the app starts in that state */
export async function seed(t, { triage, decisions, assumptions } = {}, hash = '#/overview') {
  await t.page.goto('about:blank');
  await t.page.goto(t.base + '#/overview', { waitUntil: 'load' });
  await t.page.waitForSelector('#shell-main h1');
  await t.page.evaluate(({ triage, decisions, assumptions }) => {
    const set = (k, v) => { if (v && Object.keys(v).length) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); };
    set('kontor-triage', triage); set('kontor-matches', decisions); set('kontor-assumptions', assumptions);
  }, { triage, decisions, assumptions });
  await visit(t, hash);
  await t.page.waitForTimeout(200);
}

/* ------------------------------------------------------------------ scrapers (read the DOM only) */
export async function scrapeOverview(page) {
  await go(page, '#/overview');
  await page.waitForSelector('.kviz-cards');
  return page.evaluate(() => {
    const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
    const main = document.querySelector('#shell-main');
    const hero = main.querySelector('.kviz-hero');
    const cards = [...main.querySelectorAll('.kviz-cards > li > a')].map((a) => ({
      label: t(a.querySelector('.kviz-card__label')), value: t(a.querySelector('.kviz-card__value')), meta: t(a.querySelector('.kviz-card__meta')),
      basis: t(a.querySelector('.kviz-card__basis')), href: a.getAttribute('href'), aria: a.getAttribute('aria-label'),
    }));
    const segs = [...main.querySelectorAll('.kviz-stack .kviz-seg')].map((s) => ({ grow: Number(s.style.flexGrow), txt: t(s) }));
    return { h1: t(main.querySelector('h1')), hero: t(hero), exact: hero && hero.getAttribute('aria-description'), cards, segs, sum: t(main.querySelector('.ov-sum__eq')), text: main.innerText };
  });
}

export async function scrapeOpps(page, hash = '#/opportunities?status=all') {
  await go(page, hash);
  await page.waitForSelector('.kviz-barlist__row, .kx-empty, [class*=empty]', { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => {
    const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
    const main = document.querySelector('#shell-main');
    const rows = [...main.querySelectorAll('.kviz-barlist__row')].map((r) => ({
      rank: t(r.querySelector('.kviz-barlist__rank')), type: t(r.querySelector('.kviz-barlist__lead')), title: t(r.querySelector('.kviz-barlist__name')),
      supplier: t(r.querySelector('.kviz-barlist__supplier')), sub: t(r.querySelector('.kviz-barlist__sub')), value: t(r.querySelector('.kviz-barlist__val')),
      basis: t(r.querySelector('.kviz-barlist__lanesub')), trail: t(r.querySelector('.kviz-barlist__trail')), aria: r.querySelector('.kviz-barlist__name') && r.querySelector('.kviz-barlist__name').getAttribute('aria-label'),
      clauseHref: r.querySelector('a.kviz-textlink') && r.querySelector('a.kviz-textlink').getAttribute('href'), clauseText: t(r.querySelector('a.kviz-textlink')), text: r.innerText,
    }));
    return { rows, text: main.innerText };
  });
}

/** Flag drawer scrape. Open with the address (?flag=) so no click is needed. */
export async function scrapeDrawer(page, flagId, base = '#/opportunities') {
  await go(page, `${base}?flag=${flagId}`);
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
    return { text: d.innerText, html: d.innerHTML.length, lis: [...d.querySelectorAll('ol li, li')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()), title: t(d.querySelector('h2')) };
  });
}

export const pageErrors = (t) => t.errors.filter((e) => !/ERR_TUNNEL|fonts\.g|cdnjs/.test(e));
