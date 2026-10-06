// robust-coverage: unused CSS and JS bytes after crawling every route and overlay in both themes (Chromium coverage).
// Reports per file: bytes used / total. It is a measure, not a pass/fail on percentages: the check fails only when a stylesheet
// is shipped and almost nothing of it is ever used (below 15%), which is dead weight on a venue network.
//   node tests/review/robust-coverage.mjs
import fs from 'node:fs';
import path from 'node:path';
import { T, ok, SCRATCH, launchApp, settle, VIEWPORTS } from './robust-lib.mjs';

const t = new T('robust-coverage');
const h = await launchApp();
const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
const { page } = p;
await page.coverage.startCSSCoverage();
await page.coverage.startJSCoverage({ resetOnNavigation: false });
const routes = ['#/overview', '#/opportunities', '#/opportunities?flag=F-C-005-overCap', '#/opportunities?flag=F-C-001-nearCap', '#/opportunities?flag=F-C-004-uplift', '#/opportunities?flag=F-C-003-renewal', '#/renewals', '#/spend', '#/spend?payments=C-005', '#/spend?payments=C-011', '#/spend/matches', '#/spend/no-contract', '#/spend/no-contract?payee=Dunmoor%20Agency%20Staffing%20Ltd', '#/contracts', '#/contracts/C-005', '#/contracts/C-011', '#/contracts/C-007', '#/contracts/C-006', '#/source/C-005/X-C-005-maximumValue?from=opportunities', '#/source/C-005/nope', '#/method', '#/roadmap', '#/evidence', '#/nonsense'];
for (const theme of ['dark', 'light']) {
  await page.goto(`${p.base}#/overview`); await page.waitForSelector('#shell-main h1');
  await page.evaluate((t2) => { document.documentElement.setAttribute('data-theme', t2); window.dispatchEvent(new CustomEvent('kontor-theme', { detail: t2 })); }, theme);
  for (const r of routes) { await page.evaluate((x) => { location.hash = x; }, r); await settle(page, 260); if (/spend$|C-005$/.test(r)) await page.mouse.move(400, 400); }
  // overlays and states
  for (const ov of ['About this data', 'Settings', 'Menu']) {
    await page.evaluate(() => { location.hash = '#/overview'; }); await settle(page, 250);
    const target = ov === 'About this data' ? page.getByRole('button', { name: ov }).or(page.getByRole('link', { name: ov })).first() : page.locator(`.shell__header button[aria-label="${ov}"], nav[aria-label="Primary"] button[aria-label="${ov}"]`).first();
    await target.click().catch(() => {}); await settle(page, 450); await page.keyboard.press('Escape'); await settle(page, 200);
  }
  await page.evaluate(() => { location.hash = '#/overview'; }); await settle(page, 200);
  for (const w of [{ width: 1024, height: 768 }, { width: 390, height: 844 }, VIEWPORTS.desktop]) { await page.setViewportSize(w); for (const r of ['#/overview', '#/opportunities', '#/contracts', '#/spend']) { await page.evaluate((x) => { location.hash = x; }, r); await settle(page, 250); } }
}
const css = await page.coverage.stopCSSCoverage();
const js = await page.coverage.stopJSCoverage();
const rep = {};
const own = (u) => u.replace(/^https?:\/\/[^/]+\//, '');
for (const e of css) { const used = e.ranges.reduce((s, r) => s + (r.end - r.start), 0); rep['css ' + own(e.url)] = { used, total: e.text.length, pct: +(100 * used / e.text.length).toFixed(1) }; }
for (const e of js) { if (!e.url.startsWith('http')) continue; const used = e.ranges.reduce((s, r) => s + (r.end - r.start), 0); const total = e.source ? e.source.length : 0; rep['js ' + own(e.url)] = { used, total, pct: +(100 * used / total).toFixed(1) }; }
fs.writeFileSync(path.join(SCRATCH, 'coverage-report.json'), JSON.stringify(rep, null, 1));
for (const [k, v] of Object.entries(rep)) t.note(k, `${v.used} of ${v.total} bytes used (${v.pct}%)`);
for (const [k, v] of Object.entries(rep).filter(([k]) => k.startsWith('css '))) {
  await t.check(`${k} is worth shipping (more than 15% of it is used on any route or overlay)`, async () => { ok(v.pct > 15, `${v.pct}% of ${v.total} bytes used`); return `${v.pct}%`; });
}
await h.close();
t.finish();
