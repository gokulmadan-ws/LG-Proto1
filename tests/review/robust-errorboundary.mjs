// robust-errorboundary: break the bundled dataset on purpose and look at what a customer would see.
// The sample data is compiled into dist/app.js (esbuild json loader). This script copies dist/app.js and dist/app.css to
// .scratch/robust/eb-<variant>/, rewrites the `var sample_default = {...};` literal with one defect, and serves that build
// for one page through the harness (`dist` option). Nothing under dist/ is touched.
// A variant passes when the screen is never blank: either the app still renders, or the error panel shows the What + Why + How copy,
// with a way out ("Reload page", "Go to overview"). Raw "NaN", "undefined" and "null" in the visible text fail too.
//   node tests/review/robust-errorboundary.mjs
import fs from 'node:fs';
import path from 'node:path';
import { T, ok, ROOT, SCRATCH, launchApp, snapshot, settle, VIEWPORTS } from './robust-lib.mjs';

const t = new T('robust-errorboundary');
const js = fs.readFileSync(path.join(ROOT, 'dist/app.js'), 'utf8');
const start = js.indexOf('  var sample_default = ');
const end = js.indexOf('\n', start);
ok(start > 0 && end > start, 'could not find the sample_default literal in dist/app.js');
const literal = js.slice(start, end).replace(/^\s*var sample_default = /, '').replace(/;\s*$/, '');
const orig = new Function('return ' + literal)();

const variants = {
  clean: () => {},
  nopayments: (d) => { delete d.payments; },
  nonotice: (d) => { d.contracts[4].notice = null; },
  noprov: (d) => { delete d.extractions.find((e) => e.id === 'X-C-005-maximumValue').provenance; },
  nodocs: (d) => { delete d.documents; },
  badamount: (d) => { d.payments[10].amountGBP = 'abc'; d.payments[11].amountGBP = null; },
  emptycontracts: (d) => { d.contracts = []; },
};
const routes = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence'];

const h = await launchApp();
const report = {};
for (const [name, mutate] of Object.entries(variants)) {
  const d = JSON.parse(JSON.stringify(orig));
  mutate(d);
  const dir = path.join(SCRATCH, 'eb-' + name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'app.js'), js.slice(0, start) + '  var sample_default = ' + JSON.stringify(d) + ';' + js.slice(end));
  fs.copyFileSync(path.join(ROOT, 'dist/app.css'), path.join(dir, 'app.css'));
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop, dist: path.relative(ROOT, dir) });
  p.page.on('dialog', (x) => x.dismiss().catch(() => {}));
  report[name] = {};
  for (const r of routes) {
    p.errors.length = 0;
    await p.page.goto('about:blank');
    await p.page.goto(`${p.base}${r}`, { waitUntil: 'load' });
    await p.page.waitForSelector('#shell-main h1, .error-panel h1', { timeout: 5000 }).catch(() => {});
    await settle(p.page, 250);
    const s = await snapshot(p.page);
    const rootEmpty = await p.page.evaluate(() => (document.getElementById('root') || {}).childElementCount === 0);
    const bodyText = await p.page.evaluate(() => document.body.innerText);
    const bad = (bodyText.match(/\b(NaN|undefined|\[object Object\])\b|£NaN|£undefined/g) || []).slice(0, 3);
    const panel = await p.page.evaluate(() => {
      const e = document.querySelector('.error-panel');
      return e ? { h1: (e.querySelector('h1') || {}).textContent, desc: ((e.querySelector('.page-header__desc') || {}).textContent || '').trim(), buttons: [...e.querySelectorAll('button')].map((b) => b.textContent.trim()), shell: !!document.querySelector('.shell__header'), nav: !!document.querySelector('nav[aria-label="Primary"]') } : null;
    });
    report[name][r] = { h1: s.h1.join('|'), errorPanel: s.errorPanel, shell: s.hasShell, rootEmpty, bad, panel, pageErrors: p.errors.filter((e) => /pageerror/.test(e)).length, firstError: (p.errors[0] || '').slice(0, 140) };
    await t.check(`${name} ${r}: never blank, a way out when it fails, no raw NaN/undefined`, async () => {
      ok(!rootEmpty && (s.hasShell || s.errorPanel), 'BLANK screen: #root has no children (' + (p.errors[0] || 'no error captured').slice(0, 120) + ')');
      if (s.errorPanel) {
        ok(panel && /couldn.t load/i.test(panel.h1 || ''), 'error panel heading: ' + JSON.stringify(panel));
        ok(panel.buttons.some((b) => /reload/i.test(b)) && panel.buttons.some((b) => /overview/i.test(b)), 'panel buttons: ' + panel.buttons.join(','));
      }
      ok(bad.length === 0, 'raw tokens on screen: ' + bad.join(','));
      return s.errorPanel ? 'error panel, shell kept: ' + panel.shell : s.h1.join('|');
    });
  }
  await p.ctx.close();
}
fs.writeFileSync(path.join(SCRATCH, 'errorboundary-report.json'), JSON.stringify(report, null, 1));
await h.close();
t.finish();
