// robust-perf: cold load, route change, recompute, long tasks, bytes on the wire and memory growth after 50 open/close cycles.
// Budgets are deliberately generous for a CPU-shared sandbox; the numbers printed are the evidence. Runs dark at 1440x900.
//   node tests/review/robust-perf.mjs            (CPU_THROTTLE=4 to emulate a slower venue laptop)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { T, ok, ROOT, SCRATCH, launchApp, settle, VIEWPORTS } from './robust-lib.mjs';

const t = new T('robust-perf');
const throttle = +(process.env.CPU_THROTTLE || 1);
const h = await launchApp();
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = {};

/* ---------------------------------------------------------------- bundle sizes on disk */
const size = (f) => fs.statSync(path.join(ROOT, f)).size;
const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(ROOT, f)), { level: 6 }).length;
const br = (f) => zlib.brotliCompressSync(fs.readFileSync(path.join(ROOT, f))).length;
for (const f of ['dist/app.js', 'dist/app.css', 'dist/ds/styles.css', 'vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'design-system/_ds_bundle.js', 'vendor/fontawesome/css/all.min.css', 'dist/kontor-prototype.html']) {
  out['size ' + f] = { raw: size(f), gzip: gz(f), brotli: br(f) };
}
t.note('bundle sizes (raw / gzip / brotli, bytes)', JSON.stringify(out, null, 0));
await t.check('dist/app.js is minified (the build ships a 1.3 MB readable bundle plus a 2.2 MB source map next to it)', async () => {
  const js = fs.readFileSync(path.join(ROOT, 'dist/app.js'), 'utf8');
  const lines = js.split('\n').length;
  ok(lines < 2000, `dist/app.js has ${lines} lines and ${(js.length / 1048576).toFixed(2)} MB: not minified (esbuild minify:false)`);
});

/* ---------------------------------------------------------------- cold load */
async function coldLoad(hash) {
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  await p.ctx.addInitScript(() => {
    window.__lt = []; window.__lcp = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* ignore */ }
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* ignore */ }
  });
  const cdp = await p.ctx.newCDPSession(p.page);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const bytes = { total: 0, js: 0, css: 0, font: 0, other: 0, n: 0 };
  p.page.on('response', async (r) => { try { const b = await r.body(); const ty = r.request().resourceType(); bytes.total += b.length; bytes.n += 1; bytes[ty === 'script' ? 'js' : ty === 'stylesheet' ? 'css' : ty === 'font' ? 'font' : 'other'] += b.length; } catch (e) { /* redirects */ } });
  await p.page.goto('about:blank');
  const t0 = Date.now();
  await p.page.goto(`${p.base}${hash}`, { waitUntil: 'load' });
  await p.page.waitForSelector('#shell-main h1', { timeout: 15000 });
  const wallToH1 = Date.now() - t0;
  await p.page.evaluate(() => document.fonts.ready); await settle(p.page, 600);
  const m = await p.page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime;
    const h1 = document.querySelector('#shell-main h1');
    const lt = window.__lt || [];
    return { fcp: Math.round(fcp || 0), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), lcp: Math.round(window.__lcp), longTasks: lt.length, longTaskMs: lt.reduce((s, x) => s + x[1], 0), tbt: lt.reduce((s, x) => s + Math.max(0, x[1] - 50), 0), maxLong: lt.reduce((s, x) => Math.max(s, x[1]), 0), nodes: document.getElementsByTagName('*').length, h1: h1 && h1.textContent.slice(0, 40) };
  });
  await p.ctx.close();
  return { ...m, wallToH1, bytes };
}
for (const hash of ['#/overview', '#/opportunities', '#/contracts/C-005']) {
  const runs = [];
  for (let i = 0; i < 5; i++) runs.push(await coldLoad(hash));
  const med = (k) => median(runs.map((r) => r[k]));
  const summary = { fcp: med('fcp'), lcp: med('lcp'), dcl: med('dcl'), load: med('load'), wallToH1: med('wallToH1'), longTasks: med('longTasks'), longTaskMs: med('longTaskMs'), tbt: med('tbt'), maxLong: med('maxLong'), nodes: runs[0].nodes, bytes: runs[0].bytes };
  out['cold ' + hash] = summary;
  await t.check(`cold load ${hash} x5 (median, CPU x${throttle}): FCP, LCP, long tasks`, async () => {
    ok(summary.fcp < 3000 * throttle, 'FCP ' + summary.fcp + ' ms');
    ok(summary.maxLong < 600 * throttle, 'longest task ' + summary.maxLong + ' ms');
    return JSON.stringify(summary);
  });
}

/* ---------------------------------------------------------------- route change time and recompute */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const cdp = await p.ctx.newCDPSession(p.page);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.page.goto(`${p.base}#/overview`); await p.page.waitForSelector('#shell-main h1'); await settle(p.page, 500);
  const routes = ['#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/contracts/C-011', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence', '#/overview'];
  const times = {};
  for (let round = 0; round < 3; round++) {
    for (const r of routes) {
      const ms = await p.page.evaluate((hash) => new Promise((resolve) => {
        const main = () => document.getElementById('shell-main');
        const sig = () => { const m = main(); return m ? m.innerText.length + ':' + m.innerText.slice(0, 80) : ''; };
        const before = sig(); const t0 = performance.now();
        window.location.hash = hash;
        const tick = () => { if (sig() !== before && document.querySelector('#shell-main h1')) requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0))); else requestAnimationFrame(tick); };
        tick();
        setTimeout(() => resolve(-1), 5000);
      }), r);
      (times[r] ||= []).push(Math.round(ms));
      await settle(p.page, 120);
    }
  }
  const med = Object.fromEntries(Object.entries(times).map(([k, v]) => [k, median(v)]));
  out['route change (median of 3, ms to new h1 + 2 frames)'] = med;
  await t.check(`route change time, all 13 routes x3 (CPU x${throttle})`, async () => {
    const worst = Math.max(...Object.values(med));
    ok(Object.values(times).flat().every((x) => x > 0), 'a route never rendered its h1: ' + JSON.stringify(times));
    ok(worst < 600 * throttle, 'slowest route ' + worst + ' ms');
    return JSON.stringify(med);
  });
  // recompute: change the triage of the first flag in the drawer and time until the Opportunities totals text changes
  await p.page.goto(`${p.base}#/opportunities?flag=F-C-005-overCap`); await p.page.waitForFunction(() => !!document.querySelector('[role="dialog"]')); await settle(p.page, 600);
  const rec = [];
  for (let i = 0; i < 6; i++) {
    const v = await p.page.evaluate((to) => new Promise((resolve) => {
      const sel = document.querySelector('[role="dialog"] select');
      const t0 = performance.now();
      const before = (document.querySelector('.opp-totals, [class*="totals"]') || document.body).textContent;
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; nativeSet.call(sel, to); sel.dispatchEvent(new Event('change', { bubbles: true }));
      const tick = () => { const now = (document.querySelector('.opp-totals, [class*="totals"]') || document.body).textContent; if (now !== before) requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0))); else if (performance.now() - t0 > 3000) resolve(-1); else requestAnimationFrame(tick); };
      tick();
    }), i % 2 === 0 ? 'explained' : 'to_investigate');
    rec.push(Math.round(v)); await settle(p.page, 150);
  }
  out['recompute: flag triage change to updated totals (ms x6)'] = rec;
  await t.check(`engine recompute through the UI (triage change), 6 runs (CPU x${throttle})`, async () => { ok(rec.every((x) => x > 0 && x < 500 * throttle), JSON.stringify(rec)); return JSON.stringify(rec); });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- memory growth over 50 open/close cycles */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const cdp = await p.ctx.newCDPSession(p.page);
  await cdp.send('HeapProfiler.enable');
  const snap = async () => {
    for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    const c = await cdp.send('Memory.getDOMCounters');
    return { heapMB: +(heap.usedSize / 1048576).toFixed(2), nodes: c.nodes, listeners: c.jsEventListeners, documents: c.documents };
  };
  await p.page.goto(`${p.base}#/opportunities`); await p.page.waitForFunction(() => !!document.querySelector('#shell-main h1')); await settle(p.page, 800);
  // Playwright's waitForSelector returns an ElementHandle that pins the node in memory (it looks exactly like a DOM leak): wait with page functions instead.
  const open = () => p.page.waitForFunction(() => !!document.querySelector('[role="dialog"]'));
  const closed = () => p.page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  const cycle = async (kind) => {
    if (kind === 'flag') {
      await p.page.locator('.opp .kviz-barlist__list > li').first().locator('.kviz-barlist__name').click();
      await open(); await p.page.keyboard.press('Escape'); await closed();
    } else if (kind === 'about') {
      await p.page.getByRole('button', { name: 'About this data' }).or(p.page.getByRole('link', { name: 'About this data' })).first().click();
      await open(); await p.page.keyboard.press('Escape'); await closed();
    } else if (kind === 'settings') {
      await p.page.locator('.shell__header button[aria-label="Settings"]').click();
      await open(); await p.page.keyboard.press('Escape'); await closed();
    } else if (kind === 'route') {
      for (const r of ['#/overview', '#/renewals', '#/spend', '#/contracts/C-005', '#/opportunities']) { await p.page.evaluate((x) => { location.hash = x; }, r); await p.page.waitForTimeout(40); }
    }
  };
  for (const kind of ['flag', 'about', 'settings', 'route']) {
    if (kind === 'route') { /* routes change the page under test */ } else { await p.page.goto(`${p.base}#/opportunities`); await p.page.waitForFunction(() => !!document.querySelector('#shell-main h1')); await settle(p.page, 400); }
    for (let i = 0; i < 5; i++) await cycle(kind);                // warm up
    const a = await snap();
    for (let i = 0; i < 50; i++) await cycle(kind);
    await settle(p.page, 500);
    const b = await snap();
    out['memory ' + kind] = { before: a, after: b, deltaHeapMB: +(b.heapMB - a.heapMB).toFixed(2), deltaNodes: b.nodes - a.nodes, deltaListeners: b.listeners - a.listeners };
    await t.check(`50 ${kind} cycles: heap, DOM nodes and listeners do not grow`, async () => {
      ok(b.heapMB - a.heapMB < 3, `heap grew ${(b.heapMB - a.heapMB).toFixed(2)} MB`);
      ok(b.nodes - a.nodes < 200, `DOM nodes grew by ${b.nodes - a.nodes}`);
      ok(b.listeners - a.listeners < 150, `listeners grew by ${b.listeners - a.listeners}`);
      return `heap ${a.heapMB} -> ${b.heapMB} MB, nodes ${a.nodes} -> ${b.nodes}, listeners ${a.listeners} -> ${b.listeners}`;
    });
  }
  await p.ctx.close();
}
fs.writeFileSync(path.join(SCRATCH, 'perf-report.json'), JSON.stringify(out, null, 1));
await h.close();
t.finish();
