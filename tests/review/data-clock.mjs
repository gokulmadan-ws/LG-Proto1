// Data review: R10. The prototype must not read the clock. Load every route (all 24 contract pages, 21 flag drawers, sampled source
// pages) under three different system clocks and time zones and compare the full rendered text with a baseline run.
//   node tests/review/data-clock.mjs
import { T, E, DATA, launch } from './data-lib.mjs';
import { VIEWPORTS } from '../lib/harness.mjs';

const t0 = new T('data-clock');
const e = E.compute();
const routes = ['#/overview', '#/opportunities', '#/opportunities?status=all', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/method', '#/roadmap', '#/evidence',
  ...DATA.contracts.map((c) => `#/contracts/${c.id}`), ...[...e.ranked, ...e.watch].map((f) => `#/opportunities?flag=${f.id}`),
  '#/source/C-005/X-C-005-maximumValue', '#/source/C-001/X-C-001-noticePeriod', '#/source/C-018/X-C-018-noticePeriod'];
const CLOCKS = [
  { name: 'baseline (real clock)', clock: null, tz: 'UTC', locale: 'en-GB' },
  { name: '31 Dec 2031 23:59 Pacific/Kiritimati +14', clock: '2031-12-31T23:59:00', tz: 'Pacific/Kiritimati', locale: 'en-US' },
  { name: '29 Feb 2024 00:01 Pacific/Pago_Pago -11', clock: '2024-02-29T00:01:00', tz: 'Pacific/Pago_Pago', locale: 'de-DE' },
  { name: '5 Oct 2026 23:59 America/Los_Angeles', clock: '2026-10-05T23:59:00', tz: 'America/Los_Angeles', locale: 'en-GB' },
];
const h = await launch();
const texts = [];
try {
  for (const c of CLOCKS) {
    const ctx = await h.browser.newContext({ viewport: VIEWPORTS.desktop, timezoneId: c.tz, locale: c.locale, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { localStorage.setItem('kontor-theme', 'dark'); } catch (er) { /* ignore */ } });
    const page = await ctx.newPage();
    if (c.clock) await page.clock.install({ time: new Date(c.clock) });
    const errors = []; page.on('pageerror', (er) => errors.push(er.message));
    await page.goto(h.url + '/index.html#/overview', { waitUntil: 'load' }); await page.waitForSelector('#shell-main h1');
    const out = {};
    for (const r of routes) {
      await page.evaluate((x) => { location.hash = x; }, r);
      await page.waitForFunction(() => document.querySelectorAll('#shell-main h1').length >= 1);
      await page.waitForTimeout(r.includes('flag=') ? 260 : 90);
      out[r] = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return document.querySelector('#shell-main').innerText + (d ? '\n#DIALOG#\n' + d.innerText : '') + '\n#TITLE#' + document.title; });
    }
    texts.push({ c, out, errors });
    await ctx.close();
  }
} finally { await h.close(); }
const base = texts[0].out;
for (const { c, out, errors } of texts.slice(1)) {
  let diffs = 0;
  for (const r of routes) {
    t0.check(`[${c.name}] ${r} identical to baseline`, () => {
      if (out[r] !== base[r]) { diffs++; const a = out[r].split('\n'), b = base[r].split('\n'); const i = a.findIndex((x, k) => x !== b[k]); throw new Error(`line ${i}: "${a[i]}" vs baseline "${b[i]}"`); }
    });
  }
  t0.check(`[${c.name}] no page errors`, () => { if (errors.length) throw new Error(errors.join(' | ')); });
}
// the baseline itself must read 6 October 2026
t0.check('baseline overview says As at 6 October 2026', () => { if (!base['#/overview'].includes('As at 6 October 2026')) throw new Error('no as-at'); });
t0.finish();
