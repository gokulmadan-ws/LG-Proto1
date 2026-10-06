// fun-known: reproduces (or fails to reproduce) each issue the builders reported, with measurements. A check FAILS when the defect is still present.
//   node tests/review/fun-known.mjs
import fs from 'node:fs';
import path from 'node:path';
import { waitH1, T, ok, eq, norm, text, settle, hashOf, h1, store, setStore, shot, launchApp, visit, go, axe, externalRequests, noOverflow, activeDesc, contract, gold, data, ROOT, VIEWPORTS, setTheme, SCRATCH } from './fun-lib.mjs';

const t = new T('fun-known');
const h = await launchApp();
let p = await h.newPage({ theme: 'dark' });
let { page } = p;

await t.check('K1 chart tooltip portal: axe "region" while a row is hovered (Opportunities, Cap vs spend, Renewals, Overview headline)', async () => {
  const hits = [];
  for (const [route, sel] of [['#/opportunities', '.opp .kviz-barlist__list > li .kviz-barlist__name'], ['#/spend', '.cap-panel .kviz-bl__name'], ['#/renewals', '.rn-lanes .kviz-rl__row a, .rn-lanes [data-kviz-row] a'], ['#/overview', '#shell-main h1 [tabindex="0"]']]) {
    await visit(p, route); await settle(page, 300);
    await page.locator(sel).first().hover(); await settle(page, 500);
    const tip = await page.locator('.kviz-tip').count();
    const v = await axe(page);
    if (v.some((x) => x.id === 'region')) hits.push(`${route} (tooltips open: ${tip}): ${v.filter((x) => x.id === 'region').map((x) => x.targets[0]).join(' ; ').slice(0, 160)}`);
  }
  ok(hits.length === 0, 'axe region while a tooltip is open: ' + hits.join(' || '));
});
await t.check('K1b tooltip is also keyboard-reachable: Tab to a row shows the tooltip and Escape hides it', async () => {
  await visit(p, '#/opportunities'); await settle(page, 300);
  await page.locator('.opp .kviz-barlist__list > li .kviz-barlist__name').first().focus(); await settle(page, 400);
  ok(await page.locator('.kviz-tip').count() > 0, 'tooltip on focus');
  await page.keyboard.press('Escape'); await settle(page, 300);
  ok(await page.locator('.kviz-tip').count() === 0, 'Escape hides it');
});

await t.check('K2a kx-table-wrap has no position:relative (sr-only text inside a scrolling table can widen the document): measure overflow on every page with a data table, at 1024, 1366 and 390', async () => {
  const bad = [];
  for (const vp of [VIEWPORTS.tablet, VIEWPORTS.laptop, VIEWPORTS.phone]) {
    const q = await h.newPage({ theme: 'dark', viewport: vp });
    for (const [route, pre] of [['#/opportunities', async (pg) => { await pg.getByRole('button', { name: 'Show table' }).click(); }], ['#/spend', async (pg) => { await pg.getByRole('button', { name: 'Show table' }).click(); }], ['#/spend/matches', null], ['#/contracts', null], ['#/contracts/C-005', null], ['#/contracts/C-007', null], ['#/method', null], ['#/renewals', async (pg) => { await pg.getByRole('button', { name: 'Show table' }).click(); }], ['#/roadmap', null], ['#/evidence', null], ['#/spend?payments=C-005', null], ['#/spend/no-contract', null]]) {
      await visit(q, route); if (pre) await pre(q.page); await settle(q.page, 400);
      const o = await q.page.evaluate(() => { const m = document.getElementById('shell-main'); const wraps = [...document.querySelectorAll('.kx-table-wrap')].map((w) => getComputedStyle(w).position); return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: m.scrollWidth - m.clientWidth, wrapsStatic: wraps.filter((x) => x === 'static').length, wraps: wraps.length }; });
      if (o.doc > 0 || o.main > 0) bad.push(`${vp.width} ${route}: doc +${o.doc}, main +${o.main}`);
      if (vp.width === 1024 && o.wraps) t.note('kx-table-wrap position', `${route}: ${o.wrapsStatic} of ${o.wraps} wrappers are position:static`);
    }
    await q.ctx.close();
  }
  ok(bad.length === 0, 'horizontal overflow: ' + bad.join(' ; '));
});
await t.check('K2b light mode: tbody row-header cells (th scope=row) are painted grey like the header row', async () => {
  const q = await h.newPage({ theme: 'light' });
  const bad = [];
  for (const route of ['#/spend/matches', '#/contracts', '#/contracts/C-005', '#/method', '#/roadmap']) {
    await visit(q, route); await settle(q.page, 300);
    const r = await q.page.evaluate(() => { const th = document.querySelector('tbody th'); if (!th) return null; const td = document.querySelector('tbody td'); return { th: getComputedStyle(th).backgroundColor, td: td ? getComputedStyle(td).backgroundColor : null, thead: getComputedStyle(document.querySelector('thead th')).backgroundColor, panel: getComputedStyle(th.closest('.kx-card, .kx-panel, section, article') || document.body).backgroundColor }; });
    if (r && r.th !== 'rgba(0, 0, 0, 0)' && r.th !== r.td) bad.push(`${route}: tbody th ${r.th} vs td ${r.td}`);
  }
  await q.ctx.close();
  ok(bad.length === 0, bad.join(' ; '));
});
await t.check('K2c feedback radios: no unselected radio is painted as checked (indeterminate selector), in dark and light', async () => {
  const bad = [];
  for (const theme of ['dark', 'light']) {
    const q = await h.newPage({ theme });
    await visit(q, '#/overview');
    await q.page.getByRole('button', { name: 'Give feedback' }).click(); await settle(q.page, 400);
    const r = await q.page.evaluate(() => [...document.querySelectorAll('.ovl-feedback input[type="radio"]')].map((i) => { const box = i.nextElementSibling; const cs = getComputedStyle(box); return { checked: i.checked, indeterminate: i.matches(':indeterminate'), bg: cs.backgroundColor, border: cs.borderColor }; }));
    const accent = await q.page.evaluate(() => { const e = document.createElement('i'); e.style.background = 'var(--accent)'; document.body.appendChild(e); const c = getComputedStyle(e).backgroundColor; e.remove(); return c; });
    r.forEach((x, i) => { if (!x.checked && x.bg === accent) bad.push(`${theme} radio ${i} unselected but accent-filled`); });
    t.note('K2c ' + theme, JSON.stringify(r.map((x) => [x.indeterminate, x.bg])));
    await q.ctx.close();
  }
  ok(bad.length === 0, bad.join(' ; '));
});
await t.check('K2d the kit rule itself: ".kx-field input:indeterminate + .kx-box" in dist/app.css is not restricted to checkboxes', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'dist/app.css'), 'utf8');
  const m = css.match(/[^{}]*:indeterminate[^{]*\{[^}]*\}/g) || [];
  t.note('K2d css', m.join(' || ').replace(/\s+/g, ' ').slice(0, 400));
  ok(m.every((r) => /type=["']?checkbox/.test(r) || /ovl-feedback/.test(r) === false && /checkbox/.test(r)), 'indeterminate rule matches radios too: ' + m[0]);
});

await t.check('K4 routes: from=method and from=evidence highlight Opportunities in the rail; method and evidence highlight nothing', async () => {
  const out = [];
  for (const from of ['method', 'evidence', 'roadmap', 'overview', 'renewals', 'spend', 'contracts', 'bogus']) {
    await visit(p, `#/source/C-005/X-C-005-maximumValue?from=${from}`);
    out.push(`${from}->${await page.locator('nav[aria-label="Primary"] [aria-current="page"]').first().getAttribute('aria-label').catch(() => 'none')}`);
  }
  t.note('K4 rail by from=', out.join(', '));
  const method = out.find((x) => x.startsWith('method->')); const ev = out.find((x) => x.startsWith('evidence->'));
  ok(/none$/.test(method) && /none$/.test(ev), `from=method and from=evidence should highlight nothing (or their own item): ${method}, ${ev}`);
});
await t.check('K5 Evidence route title vs page title', async () => {
  await visit(p, '#/evidence');
  const info = { title: await page.title(), h1: await h1(page), menu: 'Why this matters' };
  t.note('K5', JSON.stringify(info));
  ok(/^Why this matters/.test(info.title) && info.h1 === 'Why this matters', 'document title, h1 and menu label agree: ' + JSON.stringify(info));
});

await t.check('K6 dead css: .stub-overlay* and .menu-popover* are still in the built css', async () => {
  const css = fs.readFileSync(path.join(ROOT, 'dist/app.css'), 'utf8');
  ok(!/\.stub-overlay|\.menu-popover/.test(css), 'dead selectors present in dist/app.css: ' + (css.match(/\.(stub-overlay|menu-popover)[\w-]*/g) || []).slice(0, 6).join(', '));
});

await t.check('K7 Opportunities at 1366x768: rows fully visible without scrolling; row height; double focus ring on a keyboard-focused row (dark)', async () => {
  const q = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.laptop });
  await visit(q, '#/opportunities'); await settle(q.page, 400);
  const m = await q.page.evaluate(() => { const main = document.getElementById('shell-main').getBoundingClientRect(); const rs = [...document.querySelectorAll('.opp .kviz-barlist__list > li')].map((li) => li.getBoundingClientRect()); return { mainBottom: Math.round(main.bottom), rows: rs.slice(0, 5).map((r) => [Math.round(r.top), Math.round(r.height)]), fully: rs.filter((r) => r.top >= 0 && r.bottom <= main.bottom).length }; });
  t.note('K7 rows at 1366x768', JSON.stringify(m));
  await q.page.keyboard.press('Tab');
  for (let i = 0; i < 30; i += 1) { await q.page.keyboard.press('Tab'); const a = await q.page.evaluate(() => document.activeElement && document.activeElement.classList.contains('kviz-barlist__name')); if (a) break; }
  await settle(q.page, 300);
  await q.page.screenshot({ path: path.join(SCRATCH, 'known-k7-focus-row.png') });
  const ring = await q.page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); const row = a.closest('.kviz-row'); const af = getComputedStyle(row, '::after'); return { el: a.className, outline: cs.outlineStyle + ' ' + cs.outlineWidth, boxShadow: cs.boxShadow, rowAfterOutline: af.outlineStyle + ' ' + af.outlineWidth + ' ' + af.boxShadow }; });
  t.note('K7 focus ring', JSON.stringify(ring));
  await q.ctx.close();
  ok(m.fully >= 2, `only ${m.fully} row(s) fully visible at 1366x768 (first row top ${m.rows[0] && m.rows[0][0]}, each ${m.rows[0] && m.rows[0][1]}px tall)`);
});
await t.check('K8 CoverageBlock: the "awaiting review" segment is a focusable 4px target (no-contract tab); axe target-size', async () => {
  await visit(p, '#/spend/no-contract'); await settle(page, 400);
  const segs = await page.evaluate(() => [...document.querySelectorAll('#shell-main [tabindex="0"], #shell-main .kviz-sb__seg')].map((e) => ({ tag: e.tagName, cls: e.className.toString().slice(0, 40), w: Math.round(e.getBoundingClientRect().width * 10) / 10, h: Math.round(e.getBoundingClientRect().height), tab: e.getAttribute('tabindex'), hidden: !!e.closest('[aria-hidden="true"]') })));
  t.note('K8 segments', JSON.stringify(segs.slice(0, 8)));
  const v = await axe(page);
  ok(!v.some((x) => /target-size/.test(x.id)), 'axe target-size: ' + v.map((x) => x.id).join(','));
  ok(!segs.some((s) => s.tab === '0' && !s.hidden && s.w < 24), 'focusable segment narrower than 24px: ' + JSON.stringify(segs.filter((s) => s.w < 24)));
});
await t.check('K9 CumulativeLine end labels collide: text boxes overlap in the SVG on any whole-term-cap contract page', async () => {
  const bad = [];
  for (const c of data.contracts) {
    await go(page, '#/contracts/' + c.id); await settle(page, 350);
    const o = await page.evaluate(() => {
      const svg = document.querySelector('.cd-spend svg, #shell-main figure svg'); if (!svg) return null;
      const ts = [...svg.querySelectorAll('text')].map((x) => ({ t: x.textContent.trim(), r: x.getBoundingClientRect() })).filter((x) => x.t && x.r.width > 0);
      const hits = [];
      for (let i = 0; i < ts.length; i += 1) for (let j = i + 1; j < ts.length; j += 1) { const a = ts[i].r, b = ts[j].r; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits.push(ts[i].t + ' / ' + ts[j].t); }
      return { n: ts.length, hits };
    });
    if (o && o.hits.length) bad.push(`${c.id}: ${o.hits.join('; ')}`);
  }
  ok(bad.length === 0, bad.join(' || '));
});
await t.check('K10 phone: Settings gear and Notifications are hidden under 700px; is Settings reachable at all?', async () => {
  const q = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.phone });
  await visit(q, '#/overview'); await settle(q.page, 300);
  const gear = await q.page.getByRole('button', { name: 'Settings', exact: true }).isVisible().catch(() => false);
  await q.page.locator('.shell__header button[aria-label="Menu"]').click(); await settle(q.page, 300);
  const items = await q.page.$$eval('nav[aria-label="Menu"] [role="menuitem"]', (e) => e.map((x) => x.textContent.trim()));
  await q.page.keyboard.press('Escape');
  await go(q.page, '#/method'); const viaMethod = await q.page.getByRole('button', { name: /Open settings/ }).isVisible().catch(() => false);
  t.note('K10', `gear visible=${gear}; menu items=${items.join(' | ')}; Open settings on Method page=${viaMethod}`);
  await q.ctx.close();
  ok(gear || items.includes('Settings'), 'no Settings entry point on the phone chrome (gear hidden, Menu has no Settings item); only the Method page has an "Open settings" button');
});
await t.check('K13 Source viewer at 1366x768: answer panel height vs the visible area, hand-check buttons reachable', async () => {
  const q = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.laptop });
  await visit(q, '#/source/C-005/X-C-005-maximumValue'); await settle(q.page, 600);
  const m = await q.page.evaluate(() => { const main = document.getElementById('shell-main').getBoundingClientRect(); const pn = document.querySelector('.src-panel').getBoundingClientRect(); const hc = [...document.querySelectorAll('button')].find((b) => /Mark answer as correct/.test(b.textContent)).getBoundingClientRect(); return { mainH: Math.round(main.height), panelH: Math.round(pn.height), panelTop: Math.round(pn.top), handCheckTop: Math.round(hc.top), vh: innerHeight }; });
  t.note('K13', JSON.stringify(m));
  await q.page.screenshot({ path: path.join(SCRATCH, 'known-k13-source-1366.png') });
  await q.ctx.close();
  ok(m.panelH <= m.mainH, `panel ${m.panelH}px tall in a ${m.mainH}px content area; the hand-check buttons start at y=${m.handCheckTop} of ${m.vh}`);
});
await t.check('K15 Reject match reads sensibly: after Reject the matches row explains the consequence, and the no-contract tab says why Larchmont is there', async () => {
  await visit(p, '#/spend/matches');
  await page.getByRole('button', { name: /Reject match\s*,\s*Larchmont/ }).click(); await settle(page, 400);
  const row = await text(page.locator('.mt-table tbody tr', { hasText: 'Larchmont Grounds Maintenance' }));
  await go(page, '#/spend/no-contract'); await settle(page, 300);
  const noc = await text(page.locator('#shell-main'));
  await go(page, '#/overview'); const cov = await text(page.locator('.ov-coverage'));
  t.note('K15 matches row', row); t.note('K15 no-contract', noc.slice(0, 520)); t.note('K15 overview coverage', cov);
  await setStore(page, { 'kontor-matches': null });
  ok(/no contract|not a match|rejected/i.test(row) && /Larchmont Grounds Maintenance/.test(noc), 'row: ' + row);
});
await t.check('K16 Overview exact-value tooltip: where it lands relative to the shell header band', async () => {
  await visit(p, '#/overview'); await settle(page, 300);
  await page.locator('#shell-main h1 [tabindex="0"]').first().hover(); await settle(page, 500);
  const m = await page.evaluate(() => { const tip = document.querySelector('.kviz-tip'); const hd = document.querySelector('header.shell__header').getBoundingClientRect(); const banner = document.querySelector('.sample-banner').getBoundingClientRect(); const r = tip && tip.getBoundingClientRect(); return tip ? { tip: [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)], header: [Math.round(hd.top), Math.round(hd.bottom)], banner: [Math.round(banner.top), Math.round(banner.bottom)], text: tip.textContent } : null; });
  t.note('K16', JSON.stringify(m));
  await shot(page, 'known-k16-tooltip');
  ok(m && m.tip[0] >= m.banner[1], 'tooltip must stay below the banner: ' + JSON.stringify(m));
});
await t.check('K14 smoke test "shell landmarks" counts every header and "fresh profile is dark BEFORE React mounts" delays app.js by 1500 ms (read from tests/smoke.mjs)', async () => {
  const s = fs.readFileSync(path.join(ROOT, 'tests/smoke.mjs'), 'utf8');
  const a = s.match(/shell landmarks[\s\S]{0,700}/);
  t.note('K14 landmarks test', (a ? a[0] : '(not found)').replace(/\s+/g, ' ').slice(0, 420));
  const b = s.match(/BEFORE React mounts[\s\S]{0,600}/);
  t.note('K14 dark-before-React test', (b ? b[0] : '(not found)').replace(/\s+/g, ' ').slice(0, 420));
  ok(/header\.shell__header/.test(s) && !/body > #root header/.test(s), 'landmarks selector still counts every <header> under #root');
});

await p.ctx.close();
await h.close();
t.finish();
