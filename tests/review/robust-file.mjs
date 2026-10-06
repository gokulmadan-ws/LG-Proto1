// robust-file: the offline artefact. Opens the standalone build from file:// (no server, network off) and checks that it is
// the CURRENT build, that every route is reachable by hash, that the theme toggle works and persists, that no request leaves
// the machine, that fonts and icons load, and that the demo flow works end to end.
//   node tests/review/robust-file.mjs                       checks dist/kontor-prototype.html
//   STANDALONE=.scratch/robust/standalone-fresh.html node tests/review/robust-file.mjs   checks another file
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { T, ok, eq, ROOT, SCRATCH, settle } from './robust-lib.mjs';
import { CHROMIUM } from '../lib/harness.mjs';

const t = new T('robust-file');
const file = path.resolve(ROOT, process.env.STANDALONE || 'dist/kontor-prototype.html');
const html = fs.readFileSync(file, 'utf8');
const appJs = fs.statSync(path.join(ROOT, 'dist/app.js'));

await t.check('standalone is not older than dist/app.js and dist/app.css', async () => {
  const s = fs.statSync(file);
  const css = fs.statSync(path.join(ROOT, 'dist/app.css'));
  ok(s.mtimeMs >= Math.max(appJs.mtimeMs, css.mtimeMs) - 1000, `standalone ${s.mtime.toISOString()} is older than app.js ${appJs.mtime.toISOString()}`);
  return `${(s.size / 1048576).toFixed(2)} MB`;
});
await t.check('standalone contains the real views (probe strings from every view), and no placeholder text', async () => {
  const probes = ['Where the total comes from', 'Ranked opportunities', 'Needs attention now', 'Presenter notes', 'Cited clause', 'How this is calculated', 'Cap vs spend', 'Show all 9 cases'];
  const missing = probes.filter((p) => !html.includes(p));
  ok(!missing.length, 'missing from the standalone file: ' + missing.join(' | '));
  ok(!html.includes('This screen has not been built yet'), 'contains the A1 placeholder text "This screen has not been built yet"');
  ok(!html.includes('Replaces this card when it lands'), 'contains the A1 placeholder text "Replaces this card when it lands"');
});
await t.check('standalone references no remote URL (src, href, url(), @import, fetch) apart from the XML namespace and the evidence links', async () => {
  const stripped = html.replace(/http:\/\/www\.w3\.org\/[^\s"'<>)]*/g, '');
  const hits = [...stripped.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/g)].map((m) => m[1]).filter((u) => true);
  ok(!/@import\s+url\(\s*['"]?https?:/.test(stripped), '@import of a remote stylesheet');
  ok(!/url\(\s*['"]?https?:/.test(stripped), 'url() of a remote asset');
  ok(!/<link[^>]+href=["']https?:/i.test(stripped) && !/<script[^>]+src=["']https?:/i.test(stripped), 'remote <link> or <script>');
  return `${hits.length} anchor hrefs to http(s) (should be only the evidence and Method source links)`;
});

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
await ctx.setOffline(true);                                       // the venue network is gone
const requests = [], errors = [];
const page = await ctx.newPage();
page.on('request', (r) => requests.push(r.url()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('requestfailed', (r) => { if (!/^data:/.test(r.url())) errors.push('requestfailed: ' + r.url().slice(0, 120)); });
const url = (hash = '') => 'file://' + file + hash;

await t.check('file:// first load: dark by default, h1 present, shell present', async () => {
  const t0 = Date.now();
  await page.goto(url('#/overview'), { waitUntil: 'load' });
  await page.waitForSelector('#shell-main h1', { timeout: 10000 });
  const r = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, h1: document.querySelector('#shell-main h1').textContent.trim(), banner: !!document.querySelector('.sample-banner, [role="region"][aria-label*="Sample" i], [class*="banner"]') }));
  eq(r.theme, 'dark', 'theme');
  ok(/£6\.1m across 15 contracts/.test(r.h1), 'h1 is ' + r.h1);
  return `h1 after ${Date.now() - t0} ms`;
});

const routes = [
  ['#/overview', /£6\.1m across 15 contracts/], ['#/opportunities', /Opportunities to investigate/], ['#/renewals', /Renewal radar/], ['#/spend', /Cap vs spend/], ['#/spend/matches', /Cap vs spend/],
  ['#/spend/no-contract', /Cap vs spend/], ['#/contracts', /^Contracts$/], ['#/contracts/C-005', /Highways reactive maintenance/], ['#/source/C-005/X-C-005-maximumValue?from=opportunities', /Clause 14\.3/],
  ['#/method?s=cap', /How this is calculated/], ['#/roadmap', /Roadmap/], ['#/evidence', /Why this matters/], ['#/opportunities?flag=F-C-005-overCap', /Opportunities to investigate/], ['#/nonsense', /Page not found/],
];
for (const [hash, re] of routes) {
  await t.check(`file:// route ${hash} by hash change`, async () => {
    await page.evaluate((h) => { window.location.hash = h; }, hash);
    await page.waitForFunction(() => document.querySelectorAll('#shell-main h1').length >= 1, null, { timeout: 8000 });
    await settle(page, 200);
    const h1 = await page.evaluate(() => document.querySelector('#shell-main h1').textContent.trim());
    ok(re.test(h1), `h1 "${h1}" does not match ${re}`);
    const main = await page.evaluate(() => document.getElementById('shell-main').innerText);
    ok(!/Placeholder|has not been built yet/.test(main), 'placeholder text on screen');
    const dlg = hash.includes('flag=') ? await page.locator('[role="dialog"]').count() : 0;
    if (hash.includes('flag=')) ok(dlg === 1, 'flag drawer not open');
    return h1.slice(0, 50);
  });
}
await t.check('file:// theme toggle: dark -> light -> reload keeps light -> toggle back', async () => {
  await page.goto(url('#/overview'), { waitUntil: 'load' }); await page.waitForSelector('#shell-main h1');
  const toggle = page.locator('.shell__header button[aria-pressed]').first();
  await toggle.click(); await settle(page, 200);
  eq(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'after click');
  await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#shell-main h1');
  eq(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'after reload (persisted)');
  await page.locator('.shell__header button[aria-pressed]').first().click(); await settle(page, 200);
  eq(await page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'toggled back');
});
await t.check('file:// fonts and icons: Inter, Inter Display, Geist Mono and Font Awesome all load from the file', async () => {
  await page.goto(url('#/contracts/C-005'), { waitUntil: 'load' }); await page.waitForSelector('#shell-main h1');
  await page.evaluate(() => document.fonts.ready); await settle(page, 400);
  const r = await page.evaluate(async () => {
    const faces = [...document.fonts].map((f) => `${f.family.replace(/"/g, '')} ${f.weight} ${f.style}: ${f.status}`);
    const check = (spec) => document.fonts.check(spec);
    return { faces, inter: check('400 16px Inter'), display: check('600 30px "Inter Display"'), mono: check('500 14px "Geist Mono"'), fa: check('900 16px "Font Awesome 6 Free"') };
  });
  const errored = r.faces.filter((f) => /error/.test(f));
  ok(!errored.length, 'fonts in error state: ' + errored.join('; '));
  ok(r.inter && r.display && r.mono && r.fa, 'font check ' + JSON.stringify({ inter: r.inter, display: r.display, mono: r.mono, fa: r.fa }));
  return `${r.faces.filter((f) => /loaded/.test(f)).length} faces loaded, ${r.faces.filter((f) => /unloaded/.test(f)).length} unloaded`;
});
await t.check('file:// demo flow: overview -> renewals -> opportunities row -> View clause -> clause page with the cited quote', async () => {
  await page.goto(url('#/overview'), { waitUntil: 'load' }); await page.waitForSelector('#shell-main h1');
  await page.locator('nav[aria-label="Primary"] button[aria-label="Renewal radar"], nav[aria-label="Primary"] a[aria-label="Renewal radar"]').first().click();
  await page.waitForFunction(() => /Renewal radar/.test((document.querySelector('#shell-main h1') || {}).textContent || ''));
  await page.locator('nav[aria-label="Primary"] button[aria-label="Opportunities"], nav[aria-label="Primary"] a[aria-label="Opportunities"]').first().click();
  await page.waitForFunction(() => /Opportunities/.test((document.querySelector('#shell-main h1') || {}).textContent || ''));
  await page.locator('.opp .kviz-barlist__list > li').first().locator('.kviz-barlist__name').click();
  const d = page.locator('[role="dialog"]'); await d.waitFor({ state: 'visible' }); await settle(page, 400);
  await d.getByRole('link', { name: /View clause, page 23/ }).first().click();
  await page.waitForSelector('mark[data-extraction-id]', { timeout: 8000 });
  const q = await page.evaluate(() => document.querySelector('mark[data-extraction-id]').textContent.trim());
  ok(/£5,000,000 in aggregate/.test(q), 'cited quote: ' + q.slice(0, 120));
});
const ext = requests.filter((u) => !/^(file|data|blob|about):/.test(u));
await t.check('file:// run made no request that leaves the machine (offline)', async () => { eq(ext, [], 'external requests'); return `${requests.length} requests, all file/data`; });
await t.check('file:// run: no console errors or warnings and no failed requests', async () => { eq(errors, [], 'errors'); });
await browser.close();
t.finish();
