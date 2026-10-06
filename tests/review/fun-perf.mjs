// fun-perf: load time, route-change time and recompute time (R74), unthrottled and with the CPU throttled 4x (a weak demo laptop).
//   node tests/review/fun-perf.mjs
import { T, ok, eq, settle, launchApp, visit, go, h1, externalRequests } from './fun-lib.mjs';

const t = new T('fun-perf');
const h = await launchApp();

async function session(rate) {
  const p = await h.newPage({ theme: 'dark' });
  const cdp = await p.ctx.newCDPSession(p.page);
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  return { p, cdp };
}
for (const rate of [1, 4]) {
  const { p } = await session(rate);
  const { page } = p;
  await t.check(`R74 first load (CPU x${rate}): load event and first h1 under 2000 ms (4x: under 4000 ms); total script bytes under 3 MB`, async () => {
    const t0 = Date.now();
    await page.goto(p.base + '#/overview');
    await page.waitForSelector('#shell-main h1');
    const wall = Date.now() - t0;
    const m = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; const res = performance.getEntriesByType('resource'); return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null, js: res.filter((r) => /\.js(\?|$)/.test(r.name)).reduce((s, r) => s + (r.decodedBodySize || 0), 0), css: res.filter((r) => /\.css(\?|$)/.test(r.name)).reduce((s, r) => s + (r.decodedBodySize || 0), 0), reqs: res.length }; });
    t.note(`load x${rate}`, JSON.stringify({ ...m, wallToH1: wall }));
    ok(wall < (rate === 1 ? 2000 : 4000), `time to the Overview h1 ${wall} ms`);
    ok(m.js < 3 * 1024 * 1024, 'script bytes ' + m.js);
    return `h1 at ${wall} ms, FCP ${m.fcp} ms, JS ${(m.js / 1e6).toFixed(2)} MB, ${m.reqs} requests`;
  });
  await t.check(`R74 route changes (CPU x${rate}): every route paints its h1 within 200 ms (4x: 800 ms)`, async () => {
    const worst = [];
    for (const r of ['#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/contracts', '#/contracts/C-005', '#/method', '#/roadmap', '#/evidence', '#/overview', '#/source/C-005/X-C-005-maximumValue', '#/contracts/C-007']) {
      const ms = await page.evaluate((hash) => new Promise((resolve) => {
        const before = document.querySelector('#shell-main').textContent.length + '|' + (document.querySelector('#shell-main h1') || {}).textContent;
        const t0 = performance.now();
        location.hash = hash;
        const tick = () => { const el = document.querySelector('#shell-main h1'); if (el && document.querySelector('#shell-main').textContent.length + '|' + el.textContent !== before) { requestAnimationFrame(() => resolve(Math.round(performance.now() - t0))); } else if (performance.now() - t0 > 5000) resolve(-1); else requestAnimationFrame(tick); };
        tick();
      }), r);
      worst.push([r, ms]);
    }
    t.note(`route change ms x${rate}`, worst.map(([r, ms]) => `${r.replace('#/', '')}:${ms}`).join(' '));
    const max = Math.max(...worst.map((x) => x[1]));
    ok(!worst.some((x) => x[1] < 0), 'a route did not render');
    ok(max < (rate === 1 ? 200 : 800), 'slowest route ' + max + ' ms: ' + worst.filter((x) => x[1] === max)[0][0]);
    return 'slowest ' + max + ' ms';
  });
  await t.check(`R74 recompute (CPU x${rate}): a review or match decision updates the headline within 150 ms (4x: 600 ms)`, async () => {
    await go(page, '#/opportunities?flag=F-C-005-overCap');
    const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 300);
    const ms = await page.evaluate(() => new Promise((resolve) => {
      const sel = document.querySelector('.flag-drawer select');
      const before = document.querySelector('.opp-totals__main').textContent;
      const t0 = performance.now();
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, 'explained'); sel.dispatchEvent(new Event('change', { bubbles: true }));
      const tick = () => { if (document.querySelector('.opp-totals__main').textContent !== before) requestAnimationFrame(() => resolve(Math.round(performance.now() - t0))); else if (performance.now() - t0 > 3000) resolve(-1); else requestAnimationFrame(tick); };
      tick();
    }));
    t.note(`triage recompute x${rate}`, ms + ' ms to the updated totals bar');
    ok(ms > 0 && ms < (rate === 1 ? 150 : 600), 'recompute took ' + ms + ' ms');
    await page.keyboard.press('Escape');
    return ms + ' ms';
  });
  await t.check(`R74 the largest screens stay interactive (CPU x${rate}): Contract detail C-005 (52 payments) and the Method page paint under 600 ms (4x: 2000 ms)`, async () => {
    const out = [];
    for (const r of ['#/contracts/C-005', '#/method', '#/spend/matches']) {
      const ms = await page.evaluate((hash) => new Promise((resolve) => { const t0 = performance.now(); location.hash = hash; const tick = () => { const el = document.querySelector('#shell-main h1'); if (el && location.hash === hash && performance.now() - t0 > 20) { requestAnimationFrame(() => requestAnimationFrame(() => resolve(Math.round(performance.now() - t0)))); } else requestAnimationFrame(tick); }; tick(); }), r);
      out.push(ms);
      await settle(page, 200);
    }
    t.note(`heavy pages x${rate}`, out.join(', '));
    ok(Math.max(...out) < (rate === 1 ? 600 : 2000), 'slowest ' + Math.max(...out));
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}
await h.close();
t.finish();
