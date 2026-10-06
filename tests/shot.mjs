// Screenshot helper. Usage:
//   node tests/shot.mjs --out tests/screenshots/home-dark.png [--theme dark|light] [--w 1440] [--h 900]
//        [--hash '#/renewals'] [--full] [--click 'selector'] [--wait 400] [--file dist-standalone.html]
// Serves the repo root on a random port and drives the pre-installed Chromium via playwright-core.
import { chromium } from 'playwright-core';
import { startServer } from '../scripts/static-server.mjs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i === -1 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]); };
const out = arg('out', 'tests/screenshots/shot.png');
const theme = arg('theme', 'dark');
const w = +arg('w', 1440), h = +arg('h', 900);
const hash = arg('hash', '');
const click = arg('click', null);
const wait = +arg('wait', 500);
const full = process.argv.includes('--full');
const file = arg('file', 'index.html');
const dist = arg('dist', null); // serve /dist/app.* from another build dir (e.g. .scratch/my-build)
const root = process.cwd();
mkdirSync(path.dirname(out), { recursive: true });
const { server, url } = await startServer(root);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
await ctx.addInitScript((t) => { try { localStorage.setItem('kontor-theme', t); } catch {} }, theme);
const page = await ctx.newPage();
if (dist && dist !== true) {
  const { readFile } = await import('node:fs/promises');
  await page.route(/\/dist\/app\.(js|css|js\.map|css\.map)$/, async (route) => {
    const name = route.request().url().split('/').pop();
    try { await route.fulfill({ body: await readFile(path.join(root, dist, name)), contentType: name.endsWith('.css') ? 'text/css' : 'text/javascript' }); }
    catch { await route.abort(); }
  });
}
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
// ERR_TUNNEL_CONNECTION_FAILED = the Springboard CSS @imports Google Fonts / cdnjs, which this sandbox blocks (vendored copies are used instead). Expected, ignore.
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED/.test(m.text())) errors.push('console.error: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ': ' + r.url()); });
page.on('requestfailed', (r) => { const u = r.url(); if (!/fonts\.googleapis|cdnjs|gstatic/.test(u)) errors.push('requestfailed: ' + u); });
await page.goto(`${url}/${file}${hash}`, { waitUntil: 'load' });
await page.waitForTimeout(wait);
if (click) { await page.click(click); await page.waitForTimeout(wait); }
await page.screenshot({ path: out, fullPage: full });
console.log('saved', out, errors.length ? '\nERRORS:\n' + errors.join('\n') : '(no console errors)');
await browser.close(); server.close();
