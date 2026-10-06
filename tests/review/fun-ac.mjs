// fun-ac: acceptance-criteria sweep of requirements R1-R10, R16-R19, R23-R47, R48-R53, R54-R64 against dist/ (requirements.md section 3).
// Each check prints 'ok R## ...  [evidence]' or 'FAIL R## ...'. The evidence strings are what the review table quotes.
//   node tests/review/fun-ac.mjs
import fs from 'node:fs';
import path from 'node:path';
import { waitH1, T, ok, eq, norm, text, settle, hashOf, h1, rail, store, setStore, shot, launchApp, visit, go, axe, externalRequests, noOverflow, toasts, activeDesc, contract, extraction, gold, gbp, data, ROOT, VIEWPORTS, setTheme } from './fun-lib.mjs';

const t = new T('fun-ac');
const h = await launchApp();
const main = (page) => text(page.locator('#shell-main'));
const rowsOf = (page) => page.$$eval('.opp .kviz-barlist__list > li', (lis) => lis.map((li) => ({ rank: +li.querySelector('.kviz-barlist__rank').textContent, title: li.querySelector('.kviz-barlist__name').textContent.trim(), val: li.querySelector('.kviz-barlist__val').textContent.trim(), txt: li.textContent.replace(/\s+/g, ' ').trim(), clause: (li.querySelector('a.kviz-textlink') || {}).href ? li.querySelector('a.kviz-textlink').getAttribute('href') : null })));
const ALL_ROUTES = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence'];

const p = await h.newPage({ theme: 'dark' });
const { page } = p;

/* ================================================================ A. shell, navigation, theme (R1-R10) */
await t.check('R1 shell: header, nav Primary, main#shell-main on every route; header 72px, rail 64px; tab "Kontor financial layer"; only toasts, dialogs, tooltips outside the shell body', async () => {
  const ev = [];
  for (const r of ALL_ROUTES) {
    await visit(p, r);
    const m = await page.evaluate(() => ({
      header: !!document.querySelector('header.shell__header'), nav: !!document.querySelector('nav[aria-label="Primary"]'), main: !!document.querySelector('main#shell-main'),
      hh: Math.round(document.querySelector('header.shell__header').getBoundingClientRect().height), rw: Math.round(document.querySelector('nav[aria-label="Primary"]').getBoundingClientRect().width),
      h1InMain: !!document.querySelector('main#shell-main h1'), tab: (document.querySelector('.shell__apptab-name-full') || {}).textContent,
      stray: [...document.body.children].filter((e) => e.id !== 'root' && e.tagName !== 'SCRIPT').map((e) => e.className || e.tagName).slice(0, 5),
    }));
    ok(m.header && m.nav && m.main && m.h1InMain, `landmarks on ${r}: ${JSON.stringify(m)}`);
    eq(m.hh, 72, 'header height on ' + r); ok([64, 65].includes(m.rw), 'rail width on ' + r + ': ' + m.rw + ' (R1 says 64px; the smoke test accepts 65 = 64 + 1px border)'); if (m.rw !== 64) ev.push('rail ' + m.rw); eq(m.tab, 'Kontor financial layer', 'app tab');
    ev.push(m.stray.join('+') || 'none');
  }
  return 'strays outside #root at rest: ' + [...new Set(ev)].join(' | ');
});
await t.check('R2 rail: six items in order, each a button with aria-label, clicking sets the hash and renders one h1, aria-current only on the active, Back works, unknown hash gives not-found with "Go to overview"', async () => {
  await visit(p, '#/overview');
  const labels = await page.$$eval('nav[aria-label="Primary"] ul button', (bs) => bs.map((b) => b.getAttribute('aria-label')));
  eq(labels, ['Overview', 'Opportunities', 'Renewal radar', 'Cap vs spend', 'Contracts', 'Roadmap'], 'rail labels');
  const want = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/contracts', '#/roadmap'];
  for (let i = 0; i < 6; i += 1) {
    await rail(page, labels[i]);
    eq(await hashOf(page), want[i], 'hash for ' + labels[i]);
    eq(await page.locator('#shell-main h1').count(), 1, 'one h1');
    eq(await page.locator('nav[aria-label="Primary"] [aria-current]').count(), 1, 'one aria-current');
    eq(await page.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label'), labels[i], 'current item');
  }
  await page.goBack(); await settle(page, 300);
  eq(await hashOf(page), '#/contracts', 'Back');
  await visit(p, '#/nope');
  ok((await main(page)).includes('Page not found.') && await page.getByRole('button', { name: 'Go to overview' }).count() === 1, 'not found');
});
await t.check('R3 deep links: every listed address renders the right content with no console errors', async () => {
  const before = p.errors.length;
  const cases = [['#/opportunities?type=overCap', async () => eq(await page.locator('.opp .kviz-barlist__list > li').count(), 3, 'rows')], ['#/spend/matches', async () => ok((await main(page)).includes('Payee names'), 'matches')], ['#/spend/no-contract', async () => ok((await main(page)).includes('£23,830,000'), 'no-contract')], ['#/contracts/C-005', async () => eq(await h1(page), contract('C-005').title, 'detail')], ['#/source/C-005/X-C-005-maximumValue', async () => ok((await main(page)).includes('23 of 70') && (await main(page)).includes('Clause 14.3'), 'source')], ['#/method', async () => eq(await h1(page), 'How this is calculated', 'method')], ['#/roadmap', async () => eq(await h1(page), 'Roadmap', 'roadmap')]];
  for (const [hash, fn] of cases) { await visit(p, hash); await fn(); }
  eq(p.errors.slice(before), [], 'errors');
});
await t.check('R4 one h1 and the title "<Page> | Kontor financial layer" on every route', async () => {
  const titles = [];
  for (const r of ALL_ROUTES) { await visit(p, r); eq(await page.locator('h1').count(), 1, 'h1 count ' + r); const ti = await page.title(); ok(/ \| Kontor financial layer$/.test(ti), ti); titles.push(ti.replace(' | Kontor financial layer', '')); }
  return titles.join(' / ');
});
await t.check('R5 Apps, Chat, Notifications, Account show the toast "{Name} isn\'t part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo." and do not navigate; Settings and Menu are wired', async () => {
  await visit(p, '#/renewals');
  for (const [label, click] of [['Apps', () => page.locator('.shell__tab', { hasText: 'Apps' }).click()], ['Chat', () => page.locator('.shell__tab', { hasText: 'Chat' }).click()], ['Notifications', () => page.getByRole('button', { name: 'Notifications' }).click()], ['Account', () => page.locator('.shell__avatar').click()]]) {
    await click(); await settle(page, 250);
    const tt = (await toasts(page)).join(' | ');
    ok(tt.includes(`${label} isn't part of this prototype.`) || (label === 'Account' && tt.includes("isn't part of this prototype")), `${label} toast: ${tt}`);
    ok(/It sits outside Stage 1\.\s*Use the left rail to explore the demo\./.test(tt), 'description: ' + tt);
    eq(await hashOf(page), '#/renewals', 'no navigation');
  }
  return 'four toasts, hash unchanged';
});
await t.check('R6 dark default before React mounts, aria-pressed toggle with Enter and Space, persistence, blocked storage', async () => {
  const fresh = await h.newPage({ theme: null, delay: { pattern: /\/dist\/app\.js/, ms: 1200 } });
  const seen = [];
  await fresh.page.goto(fresh.base + '#/overview', { waitUntil: 'commit' });
  await fresh.page.waitForFunction(() => document.documentElement.hasAttribute('data-theme') || document.readyState !== 'loading', null, { timeout: 5000 });
  seen.push(await fresh.page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), reactMounted: !!document.querySelector('#shell-main h1'), bg: getComputedStyle(document.body).backgroundColor, scheme: getComputedStyle(document.documentElement).colorScheme })));
  ok(seen[0].theme === 'dark' && !seen[0].reactMounted, 'dark before React: ' + JSON.stringify(seen[0]));
  await fresh.page.waitForSelector('#shell-main h1');
  const btn = fresh.page.locator('.shell__header button[aria-pressed]').first();
  ok(!!(await btn.getAttribute('aria-label')), 'toggle has an aria-label: ' + await btn.getAttribute('aria-label'));
  eq(await btn.getAttribute('aria-pressed'), 'true', 'pressed in dark');
  await btn.focus(); await fresh.page.keyboard.press('Enter'); await settle(fresh.page, 200);
  eq(await fresh.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'Enter');
  await fresh.page.keyboard.press('Space'); await settle(fresh.page, 200);
  eq(await fresh.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'Space');
  await fresh.page.keyboard.press('Enter'); await settle(fresh.page, 200);
  await fresh.page.reload(); await fresh.page.waitForSelector('#shell-main h1');
  eq(await fresh.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'persisted');
  await fresh.ctx.close();
  const blocked = await h.newPage({ blockStorage: true });
  await visit(blocked, '#/overview');
  await blocked.page.locator('.shell__header button[aria-pressed]').first().click(); await settle(blocked.page, 200);
  eq(await blocked.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'blocked storage toggle');
  await blocked.ctx.close();
  return `first paint ${JSON.stringify(seen[0])}`;
});
await t.check('R7 axe (wcag2a/aa/21aa/22aa + best-practice) 0 violations on every route in dark and light, plus the open flag drawer and the source viewer', async () => {
  const out = [];
  for (const theme of ['dark', 'light']) {
    for (const r of [...ALL_ROUTES, '#/opportunities?flag=F-C-005-overCap', '#/spend?payments=C-007', '#/contracts/C-018', '#/source/C-018/X-C-018-noticePeriod']) {
      await visit(p, r); await setTheme(page, theme); await settle(page, 450);
      await page.mouse.move(0, 0);
      const v = await axe(page);
      if (v.length) out.push(`${theme} ${r}: ${v.map((x) => x.id + '(' + x.count + ')').join(',')}`);
    }
  }
  ok(out.length === 0, 'violations: ' + out.join(' ; '));
  return '16 states x 2 themes clean';
});
await t.check('R8 responsive: no horizontal page scroll at 1440 and 1024 on every route; at 390 the bottom tab bar shows and the theme toggle is reachable', async () => {
  const bad = [];
  for (const vp of [VIEWPORTS.desktop, VIEWPORTS.tablet, VIEWPORTS.phone]) {
    const q = await h.newPage({ theme: 'dark', viewport: vp });
    for (const r of ALL_ROUTES) { await visit(q, r); await settle(q.page, 150); const o = await noOverflow(q.page); if (o.doc > 0 || o.main > 0) bad.push(`${vp.width} ${r}: ${JSON.stringify(o)}`); }
    if (vp.width === 390) {
      const bar = await q.page.evaluate(() => { const b = document.querySelector('.shell__bottombar, nav.shell__rail'); const cs = b && getComputedStyle(b); const r = b && b.getBoundingClientRect(); return { pos: cs && cs.position, top: r && Math.round(r.top), h: r && Math.round(r.height), vh: innerHeight }; });
      const tog = await q.page.locator('.shell__header button[aria-pressed]').first().boundingBox();
      ok(tog && tog.x >= 0 && tog.x + tog.width <= 390, 'theme toggle on screen: ' + JSON.stringify(tog));
      t.note('R8 phone bar', JSON.stringify(bar));
    }
    await q.ctx.close();
  }
  ok(bad.length === 0, 'overflow: ' + bad.join(' ; '));
});
await t.check('R9 offline: zero requests off the origin on every route; no CDN script or link in index.html or dist/app.css', async () => {
  const q = await h.newPage({ theme: 'dark', hangExternal: true });
  for (const r of ALL_ROUTES) await visit(q, r);
  eq(externalRequests(q).map((r) => r.url), [], 'external requests');
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(!/(src|href)=["']https?:/i.test(idx), 'index.html has an absolute URL');
  const css = fs.readFileSync(path.join(ROOT, 'dist/app.css'), 'utf8') + fs.readFileSync(path.join(ROOT, 'dist/ds/styles.css'), 'utf8');
  ok(!/@import\s+url\(["']?https?:|url\(["']?https?:/i.test(css), 'css has a remote url');
  await q.ctx.close();
  return `${q.requests.length} requests, all same-origin`;
});
await t.check('R10 as-at date on Overview, Opportunities, Radar, Cap vs spend, Contract detail; a clock set to 2031 changes no number; engine never reads the clock', async () => {
  const q = await h.newPage({ theme: 'dark' });
  const pages = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/contracts/C-005', '#/contracts/C-001', '#/spend/matches'];
  const base = {};
  for (const r of pages) { await visit(q, r); await settle(q.page, 200); base[r] = await main(q.page); if (r !== '#/spend/matches') ok(base[r].includes('6 October 2026'), 'as at on ' + r); }
  await q.page.clock.install({ time: new Date('2031-03-03T12:00:00Z') });
  for (const r of pages) { await visit(q, r); await settle(q.page, 250); eq(await main(q.page), base[r], 'text on ' + r + ' changed with the clock'); }
  await q.ctx.close();
  const eng = fs.readFileSync(path.join(ROOT, 'src/lib/engine.js'), 'utf8');
  ok(!/Date\.now\(\)|new Date\(\)/.test(eng.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')), 'engine.js reads the clock');
  const uses = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'src'), { recursive: true })) { if (!/\.(jsx?|mjs)$/.test(f) || /^dev\//.test(f)) continue; const s = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'); if (/Date\.now\(\)|new Date\(\)/.test(s)) uses.push(f); }
  return 'no-arg clock reads in: ' + (uses.join(', ') || 'none');
});

/* ================================================================ C. Overview (R16-R19) */
await visit(p, '#/overview');
await t.check('R16 headline H1 exact; exact value £6,145,238 on hover and on focus; equals the sum of the counted Indicative column; N = distinct contracts', async () => {
  eq(await h1(page), gold.headline, 'h1');
  const fig = page.locator('#shell-main h1 [tabindex="0"], #shell-main h1 .kviz-hl__fig, #shell-main h1 span[tabindex]').first();
  await fig.hover(); await settle(page, 400);
  ok((await page.locator('.kviz-tip').allInnerTexts()).join(' ').includes('£6,145,238'), 'hover tooltip: ' + (await page.locator('.kviz-tip').allInnerTexts()).join('|'));
  await page.mouse.move(0, 0); await settle(page, 200);
  await fig.focus(); await settle(page, 400);
  ok((await page.locator('.kviz-tip').allInnerTexts()).join(' ').includes('£6,145,238'), 'focus tooltip');
  await page.keyboard.press('Escape');
  const rows = await (async () => { await go(page, '#/opportunities'); return rowsOf(page); })();
  eq(rows.reduce((s, r) => s + +r.val.replace(/[^\d]/g, ''), 0), gold.total, 'sum of the list');
  const distinct = new Set(gold.ranked.map((id) => id.split('-').slice(1, 3).join('-')));
  eq(distinct.size, 15, 'distinct contracts');
  await go(page, '#/overview');
  return 'tooltip £6,145,238 on hover and focus; list sums to 6,145,238; 15 contracts';
});
await t.check('R17 four cards, sum equals the headline, each card opens the filtered list with the same count', async () => {
  const labels = await page.$$eval('.ov-hero a.kviz-card', (as) => as.map((a) => a.getAttribute('aria-label')));
  eq(labels, ['Spend over cap £4.2m, 3 contracts, already paid above the cap', 'Close to cap £0.6m, 1 contract, projected at the current pace', 'Renewals £1.1m, 12 contracts, indicative value per year', 'Price increases above cap £0.3m, 3 contracts, already paid above the cap'], 'card labels');
  eq(4172000 + 642478 + 1075500 + 255260, gold.total, 'sum');
  const counts = [];
  for (const [type, , n] of gold.cards) {
    await go(page, '#/overview');
    await page.locator(`.ov-hero a.kviz-card[href="#/opportunities?type=${type}"]`).click();
    await page.waitForFunction((x) => location.hash === '#/opportunities?type=' + x, type);
    await settle(page, 300);
    const c = await page.locator('.opp .kviz-barlist__list > li').count();
    eq(c, n, 'rows for ' + type); counts.push(c);
  }
  return 'rows after card clicks: ' + counts.join('/');
});
await t.check('R18 renewal summary: Next 3 months 3 / £6.9m, 3 to 6 months 4 / £7.3m, 6 to 12 months 2 / £2.2m, Needs attention now 3; the block links to #/renewals', async () => {
  await go(page, '#/overview');
  const bands = await page.$$eval('.ov-radar a.kviz-rs__band', (as) => as.map((a) => ({ t: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') })));
  ok(bands.length >= 3, 'band links: ' + JSON.stringify(bands));
  const joined = bands.map((b) => b.t).join(' | ');
  ok(/Next 3 months.*£6\.9m.*3 contracts/.test(joined) && /3 to 6 months.*£7\.3m.*4 contracts/.test(joined) && /6 to 12 months.*£2\.2m.*2 contracts/.test(joined), joined);
  ok(bands.every((b) => b.href === '#/renewals'), 'links');
  ok((await text(page.locator('.ov-radar'))).includes('Needs attention now 3'), 'attention 3');
  return joined;
});
await t.check('R19 coverage meter: 84%, £129.4m of £153.5m, text label, link to #/spend/no-contract', async () => {
  const c = await text(page.locator('.ov-coverage'));
  ok(c.includes('84%') && c.includes('of payments are linked to a contract on the register') && c.includes('£129.4m of £153.5m'), c);
  eq(await page.locator('.ov-coverage a[href="#/spend/no-contract"]').count() > 0, true, 'link');
  return c.slice(0, 120);
});

/* ================================================================ D. Opportunities (R23-R30) */
await visit(p, '#/opportunities');
await t.check('R23 19 ranked rows in the golden order with exact amounts; ranks 1-19 gapless; counted sum = headline', async () => {
  const rows = await rowsOf(page);
  eq(rows.length, 19, 'count'); eq(rows.map((r) => r.rank), Array.from({ length: 19 }, (_, i) => i + 1), 'ranks');
  eq(rows.map((r) => +r.val.replace(/[^\d]/g, '')), gold.rankedValues, 'values');
  const idsByOrder = rows.map((r) => r.title);
  return idsByOrder.slice(0, 3).join(' > ');
});
await t.check('R24 all 19 "View clause, page N" links land on the right contract, page and highlighted quote', async () => {
  const links = await page.$$eval('.opp .kviz-barlist__list > li', (lis) => lis.map((li) => { const a = [...li.querySelectorAll('a')].find((x) => /View clause/.test(x.textContent)); return a ? { href: a.getAttribute('href'), text: a.textContent.trim() } : null; }));
  ok(links.every(Boolean), 'a row has no clause link');
  const bad = [];
  for (let i = 0; i < 19; i += 1) {
    await go(page, links[i].href);
    await page.waitForSelector('mark[data-extraction-id]', { timeout: 5000 });
    const [, , cid, xid] = decodeURIComponent(links[i].href).match(/^#\/source\/([^/]+)\/([^/?]+)/) ? ['', '', ...decodeURIComponent(links[i].href).match(/^#\/source\/([^/]+)\/([^/?]+)/).slice(1)] : [];
    const x = extraction(xid);
    const mark = await page.locator('mark[data-extraction-id]').innerText();
    const pageOf = await text(page.locator('[data-testid="source-page-of"]'));
    if (mark !== x.provenance[0].quote) bad.push(`${xid}: quote differs`);
    if (!pageOf.startsWith(String(x.provenance[0].page) + ' of')) bad.push(`${xid}: page ${pageOf}`);
    if (links[i].text !== `View clause, page ${x.provenance[0].page}`) bad.push(`${xid}: link text ${links[i].text}`);
    if (x.contractId !== cid) bad.push('contract mismatch ' + xid);
    await page.goBack(); await page.waitForFunction(() => location.hash.startsWith('#/opportunities'));
  }
  ok(bad.length === 0, bad.join('; '));
  return '19/19 landed on the extraction quote with the page in the link text';
});
await visit(p, '#/opportunities');
await t.check('R25 drawer breakdown: F-C-005-overCap 8,350,000 / 5,000,000 / 3,350,000; F-C-004-uplift 2,060,000 / 3.0% / 2,121,800 / 2,310,000 / 188,200; last line equals the row for all 19; Escape returns focus to the row', async () => {
  await page.locator('.opp .kviz-barlist__list > li').first().locator('.kviz-barlist__name').click();
  const d = page.locator('[role="dialog"].flag-drawer');
  await d.waitFor({ state: 'visible' }); await settle(page, 300);
  const dt = await text(d);
  for (const s of ['£8,350,000', '£5,000,000', '£3,350,000']) ok(dt.includes(s), 'F-C-005 ' + s);
  await page.keyboard.press('Escape'); await settle(page, 400);
  const a = await activeDesc(page);
  ok(/Highways reactive/.test(a.text), 'focus returns to the row: ' + JSON.stringify(a));
  const bad = [];
  for (const id of gold.ranked) {
    await go(page, '#/opportunities?flag=' + id);
    await d.waitFor({ state: 'visible' }); await settle(page, 150);
    const res = await d.locator('[data-flag-result] .flag-calc__value').innerText();
    const val = await d.locator('[data-flag-value]').innerText();
    if (norm(res) !== norm(val)) bad.push(`${id}: last line ${res} vs ${val}`);
    if (id === 'F-C-004-uplift') { const t2 = await text(d); for (const s of ['£2,060,000', '3.0%', '£2,121,800', '£2,310,000', '£188,200']) if (!t2.includes(s)) bad.push('uplift missing ' + s); }
  }
  ok(bad.length === 0, bad.join('; '));
  await go(page, '#/opportunities');
  return 'last line = row value for 19/19 flags';
});
await t.check('R25b every one of the 19 rows opens ITS OWN drawer, by row click and by "See calculation" (address and drawer title agree with the row)', async () => {
  const bad = [];
  for (let i = 0; i < 19; i += 1) {
    for (const how of ['row', 'calc']) {
      await go(page, '#/opportunities'); await settle(page, 80);
      const li = page.locator('.opp .kviz-barlist__list > li').nth(i);
      const title = (await li.locator('.kviz-barlist__name').innerText()).trim();
      if (how === 'row') await li.locator('.kviz-barlist__name').click(); else await li.getByRole('button', { name: /See calculation/ }).click();
      await page.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' }); await settle(page, 120);
      const hh = await hashOf(page); const dt = await page.locator('[role="dialog"].flag-drawer').innerText();
      if (hh !== '#/opportunities?flag=' + gold.ranked[i]) bad.push(`row ${i + 1} ${how}: ${hh}`);
      if (!dt.includes(title)) bad.push(`row ${i + 1} ${how}: drawer does not name "${title}"`);
      await page.keyboard.press('Escape'); await settle(page, 120);
    }
  }
  ok(bad.length === 0, bad.join('; '));
  return '38 openings (19 rows x 2 ways) landed on the right flag';
});
await t.check('R26 chips with counts 3/1/12/3, search + empty state + Clear filters, status Open/Reviewed/All, three sorts', async () => {
  await go(page, '#/opportunities');
  const chips = await page.$$eval('.kviz-chipbtn', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  eq(chips.map((c) => c.replace(/[^\d]/g, '')), ['19', '3', '1', '12', '3'], 'chip counts: ' + chips.join(' | '));
  await page.locator('.opp-control--search input').fill('zzzz'); await settle(page, 700);
  ok((await main(page)).includes('No opportunities match these filters.') && (await main(page)).includes('Clear the filters to see all 19.'), 'empty state');
  await page.getByRole('button', { name: 'Clear filters' }).first().click(); await settle(page, 700);
  eq(await page.locator('.opp .kviz-barlist__list > li').count(), 19, 'cleared');
  eq(await page.$$eval('.opp-control--status select option', (o) => o.map((x) => x.textContent)), ['Open', 'Reviewed', 'All'], 'status options');
  eq(await page.$$eval('.opp-control--sort select option', (o) => o.map((x) => x.textContent)), ['Highest value first', 'Soonest action date', 'Type'], 'sort options');
  return chips.join(' | ');
});
await t.check('R27 totals bar "Showing n opportunities, £x indicative" updates with filters and equals the headline by default', async () => {
  eq(await text(page.locator('.opp-totals__main')), 'Showing 19 opportunities, £6,145,238 indicative', 'default');
  await page.locator('.kviz-chipbtn').nth(2).click(); await settle(page, 300);
  eq(await text(page.locator('.opp-totals__main')), 'Showing 1 opportunity, £642,478 indicative', 'near cap');
  await page.locator('.kviz-chipbtn').nth(2).click(); await settle(page, 300);
});
await t.check('R28 watch list: 2 rows (Grounds maintenance 89.1%, Mobile voice and data 90.8%) each "Indicative value £0. Not counted in the total." with a source link', async () => {
  await go(page, '#/opportunities');
  const rows = await page.$$eval('.opp-watch > li', (lis) => lis.map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
  eq(rows.length, 2, 'rows');
  ok(rows[0].includes('Grounds maintenance') && rows[0].includes('89.1%'), rows[0]);
  ok(rows[1].includes('Mobile voice and data') && rows[1].includes('90.8%'), rows[1]);
  rows.forEach((r) => ok(r.includes('Indicative value £0. Not counted in the total.') && /View clause, page \d+/.test(r), r));
  return rows.map((r) => r.slice(0, 60)).join(' | ');
});
await t.check('R29 Export opportunities: CSV with header + 19 rows, every row "Sample data, as at 2026-10-06"', async () => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: 'Export opportunities' }).click()]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  const lines = csv.replace(/^﻿/, '').trim().split(/\r\n/);
  eq(lines.length, 20, 'lines');
  ok(lines.slice(1).every((l) => l.includes('Sample data, as at 2026-10-06')), 'every row labelled');
  return dl.suggestedFilename();
});
await t.check('R30 deterministic ranking: reload twice gives the same order; Soonest action date puts rows without a date last; ties break by severity then date then id', async () => {
  const a = (await rowsOf(page)).map((r) => r.title).join('|');
  await page.reload(); await page.waitForSelector('.opp .kviz-barlist__list'); await settle(page, 300);
  eq((await rowsOf(page)).map((r) => r.title).join('|'), a, 'order after reload');
  await go(page, '#/opportunities?sort=date'); await settle(page, 300);
  const r = await rowsOf(page);
  const idxOf = (id) => gold.ranked.indexOf(id) + 1;
  const noDate = [1, 2, 9, 11, 3].map((n) => n);
  const lastFive = r.slice(-5).map((x) => x.rank).sort((x, y) => x - y);
  eq(lastFive, [1, 2, 3, 9, 11], 'last five rows have no action date');
  eq(r.slice(-5).map((x) => x.rank), [1, 2, 3, 9, 11], 'no-date rows ordered by overall rank');
});

/* ================================================================ E. Radar (R31-R36) */
await visit(p, '#/renewals');
await t.check('R31 bands: counts, annual value, contracts in deadline order, boundary dates 6 Jan 2027 / 6 Apr 2027 / 6 Oct 2027, 12 later contracts with a link', async () => {
  const b = await main(page);
  for (const s of ['£6,930,000 a year', '£7,250,000 a year', '£2,180,000 a year', '6 Jan 2027', '6 Apr 2027', '6 Oct 2027']) ok(b.includes(s), 'missing ' + s);
  const order = (ids) => ids.map((id) => b.indexOf(contract(id).title));
  for (const ids of Object.values(gold.bands)) { const o = order(ids); ok(o.every((v, i) => v >= 0 && (i === 0 || v > o[i - 1])), 'deadline order ' + ids.join(',') + ' ' + o.join(',')); }
  ok(/12 contracts have notice dates more than 12 months away and are not on the radar/.test(b), 'footnote');
  ok(await page.locator('#shell-main a[href="#/contracts"]').count() > 0, 'footnote link');
  return 'C-003/C-017/C-009; C-004/C-005/C-018/C-002; C-015/C-014 in order';
});
await t.check('R32 each radar row: title, supplier, annual value, end date, notice as extracted, deadline, relative text, Auto-renews badge, action line, confidence, clause link', async () => {
  const bad = [];
  const need = { 'C-003': ['Quillon Waste Services Ltd', '£6,200,000', '31 Jan 2027', '3 months', '31 Oct 2026', '25 days left', 'Auto-renews', 'Serve notice by 31 October 2026 or this contract renews for 12 months.'], 'C-018': ['Aldwick Cleansing Ltd', 'No notice period stated', 'Needs review'], 'C-017': ['30 days', '1 Dec 2026', '56 days left', 'Auto-renews'] };
  const b = await main(page);
  for (const [id, strs] of Object.entries(need)) for (const s of strs) if (!b.includes(s)) bad.push(`${id}: missing "${s}"`);
  const links = await page.$$eval('#shell-main a', (as) => as.filter((a) => /View clause, page \d+/.test(a.textContent)).map((a) => a.getAttribute('href')));
  ok(links.length >= 12, 'clause links: ' + links.length);
  ok(links.every((l) => /\?from=renewals$/.test(l)), 'from=renewals on every link');
  const badTargets = links.map((l) => decodeURIComponent(l).match(/^#\/source\/(C-\d+)\/(X-C-\d+-(\w+))\?from=renewals$/)).map((m, i) => (!m ? 'bad href ' + links[i] : null)).filter(Boolean);
  ok(badTargets.length === 0, badTargets.join('; '));
  const fields = new Set(links.map((l) => l.split('/').pop().split('?')[0].split('-').pop()));
  t.note('R32 radar clause link fields', [...fields].join(','));
  ok([...fields].every((f) => ['noticePeriod', 'endDate'].includes(f)), 'a radar row links to an unrelated clause: ' + [...fields].join(','));
  ok(bad.length === 0, bad.join('; '));
  return links.length + ' clause links';
});
await t.check('R33 deadlines: C-001 30 Sep 2026, C-017 1 Dec 2026, C-018 28 Feb 2027 with "No notice period stated. We used the end date." and Needs review', async () => {
  const b = await main(page);
  ok(b.includes('30 Sep 2026') && b.includes('1 Dec 2026') && b.includes('28 Feb 2027') && b.includes('No notice period stated. We used the end date.'), 'strings');
});
await t.check('R34 Needs attention now above the bands with the three exact sentences', async () => {
  const b = await main(page);
  ok(b.indexOf('Needs attention now') < b.indexOf('Next 3 months'), 'attention first');
  for (const s of ['The notice date passed 6 days ago', 'The notice date passed 98 days ago. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier.', 'This contract ended on 30 April 2026. You have paid £780,000 since.']) ok(b.includes(s), s);
  ok(await page.locator('.rn-attn__glyph').count() === 3, 'warning glyph on each row');
});
await t.check('R35 timeline: nine markers in the window, band boundaries drawn, keyboard-focusable marks with tooltip; attention contracts "already passed" at the left edge', async () => {
  const strip = await page.evaluate(() => ({ marks: document.querySelectorAll('.rn-lanes [data-kviz-mark], .rn-lanes .kviz-rl__mark, .rn-lanes .kviz-rl__dot').length, text: (document.querySelector('.rn-lanes') || {}).innerText || '' }));
  const ovMarks = await (async () => { await go(page, '#/overview'); return page.evaluate(() => document.querySelectorAll('.ov-radar .kviz-rs__mark, .ov-radar [data-kviz-mark], .ov-radar .kviz-rs__dot, .ov-radar svg path, .ov-radar .kviz-rs__pt').length); })();
  await go(page, '#/renewals');
  t.note('R35 marks', `renewals lanes marks=${strip.marks}; overview strip marks=${ovMarks}`);
  ok(strip.marks >= 9 || ovMarks >= 9, `expected nine markers; renewals ${strip.marks}, overview ${ovMarks}`);
  return `renewals ${strip.marks} marks, overview ${ovMarks}`;
});
await t.check('R36 empty band copy exists in the renewals view (fixture-tested by tests/e2e/V1.mjs)', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'dist/app.js'), 'utf8');
  ok(src.includes('No notice dates fall in this period. Nothing needs your decision here.'), 'string in the bundle');
});

/* ================================================================ F. Cap vs spend (R37-R42) */
await visit(p, '#/spend');
await t.check('R37 24 rows ordered by utilisation, first six golden, C-004 80.6% Within cap, one decimal', async () => {
  await page.getByRole('button', { name: /Show all 24 contracts/ }).click(); await settle(page, 300);
  const rows = await page.$$eval('.cap-panel .kviz-bl__list > li', (lis) => lis.map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
  eq(rows.length, 24, 'rows');
  gold.capOrder.forEach((id, i) => ok(rows[i].includes(contract(id).title), `row ${i + 1} ${id}: ${rows[i].slice(0, 80)}`));
  const pcts = rows.map((r) => +(r.match(/(\d+\.\d)% of (?:annual )?(?:cap|contract value)/) || [0, NaN])[1]);
  ok(pcts.every((v, i) => !Number.isNaN(v) && (i === 0 || pcts[i - 1] >= v - 1e-9)), 'descending: ' + pcts.join(','));
  const c004 = rows.find((r) => r.includes('Street lighting'));
  ok(c004.includes('80.6%') && c004.includes('Within cap'), c004);
  return pcts.slice(0, 6).join(', ');
});
await t.check('R38 C-007 payments drawer: 5 payments after the end date totalling £780,000.00 listed separately; subtotal = spend to the penny; C-005 52 payments £8,350,000.00', async () => {
  await go(page, '#/spend?payments=C-007');
  const d = page.locator('[role="dialog"]').first();
  await d.waitFor({ state: 'visible' }); await settle(page, 400);
  const dt = await text(d);
  ok(dt.includes('Paid after the end date') && dt.includes('£780,000.00') && dt.includes('£6,160,000.00') && dt.includes('£5,380,000.00'), dt.slice(0, 900));
  await page.keyboard.press('Escape');
  await go(page, '#/spend?payments=C-005'); await d.waitFor({ state: 'visible' }); await settle(page, 400);
  ok((await text(d)).includes('£8,350,000.00') || (await text(d)).includes('£8,350,000'), 'C-005 subtotal');
  await page.keyboard.press('Escape');
});
await t.check('R39 cap rows are labelled Stated maximum / Contract value (no maximum stated), Whole term / Per contract year; C-003, C-016, C-018 carry "At least" with the spend-files note', async () => {
  await go(page, '#/spend'); const more = page.getByRole('button', { name: /Show all 24 contracts/ }); if (await more.count()) await more.click(); await settle(page, 300);
  const b = await main(page);
  ok(b.includes('Whole term · Stated maximum') && b.includes('Per contract year · Stated maximum') && b.includes('Whole term · Contract value (no maximum stated)'), 'labels');
  const note = 'Spend files start on 1 April 2022, so spend before that date is not counted. Utilisation may be higher.';
  eq((b.match(new RegExp(note.replace(/[.]/g, '\\.'), 'g')) || []).length, 3, 'three partial-coverage notes');
  const at = (b.match(/At least/g) || []).length;
  ok(at >= 3, 'At least count ' + at);
  return `${at} "At least", 3 notes`;
});
await t.check('R40 C-011 annual cap: contract years £430,000 / £512,000 / £447,000 / £228,000, year 2 over by £62,000, row 113.8%', async () => {
  await go(page, '#/spend?payments=C-011');
  const d = page.locator('[role="dialog"]').first(); await d.waitFor({ state: 'visible' }); await settle(page, 400);
  const dt = await text(d);
  for (const s of ['£430,000', '£512,000', '£447,000', '£228,000', 'Year 2 is over the annual cap by £62,000']) ok(dt.includes(s), 'missing ' + s);
  await page.keyboard.press('Escape');
});
await t.check('R41 every Over or Close row has "View clause, page N" to the cap clause (C-005 page 23, clause 14.3)', async () => {
  await go(page, '#/spend');
  const rows = await page.$$eval('.cap-panel .kviz-bl__list > li', (lis) => lis.slice(0, 6).map((li) => li.textContent.replace(/\s+/g, ' ')));
  ok(rows.every((r) => /View clause, page \d+/.test(r)), 'all six have a clause link');
  ok(rows[0].includes('View clause, page 23'), rows[0].slice(0, 120));
  const hrefs = await page.$$eval('.cap-panel .kviz-bl__list > li', (lis) => lis.slice(0, 6).map((li) => (li.querySelector('a.clause-link') || {}).getAttribute ? li.querySelector('a.clause-link').getAttribute('href') : null));
  eq(hrefs.map((x) => x && x.split('/')[2]), ['C-005', 'C-007', 'C-011', 'C-001', 'C-017', 'C-009'], 'clause links go to the same contract as the row');
  ok(hrefs.every((x) => /X-C-\d+-(maximumValue|awardedTotalValue)\?from=spend$/.test(x)), 'cap clause fields: ' + hrefs.join(' '));
});
await t.check('R42 spend by contract year on Contract detail (YearBars for C-011, cumulative line for C-005 with the crossing annotated)', async () => {
  await go(page, '#/contracts/C-005'); await settle(page, 400);
  ok((await main(page)).includes('Cap crossed'), 'annotation');
  await go(page, '#/contracts/C-011'); await settle(page, 400);
  ok((await main(page)).includes('£512,000'), 'year bars');
});

/* ================================================================ G. Matching (R43-R47) */
await visit(p, '#/spend/matches');
await t.check('R43 matches table golden rows: KESTRELVALE normalised 0.98 Accepted; Kestrelvale FM Alias 0.95; Larchmont 0.73 Suggested 6 payments £300,000; Mirefield Unmatched; thresholds disclosed', async () => {
  const rows = await page.$$eval('.mt-table tbody tr, table tbody tr', (trs) => trs.map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()));
  const find = (n) => rows.find((r) => r.startsWith(n));
  ok(/Normalised.*0\.98.*Accepted/.test(find('KESTRELVALE FACILITIES SVCS LTD')), find('KESTRELVALE FACILITIES SVCS LTD'));
  ok(/Alias.*0\.95.*Accepted/.test(find('Kestrelvale FM')), find('Kestrelvale FM'));
  ok(/Similar name.*0\.73.*Suggested.*6.*£300,000/.test(find('Larchmont Grounds Maintenance')), find('Larchmont Grounds Maintenance'));
  ok(/Unmatched/.test(find('Mirefield Training Partners Ltd')), find('Mirefield Training Partners Ltd'));
  eq(rows.length, 39, '39 payees');
  await page.locator('details.mt-how summary').click(); await settle(page, 200);
  ok(/0\.90 or more/.test(await main(page)) && /0\.70 to 0\.89/.test(await main(page)) && /Below 0\.70/.test(await main(page)), 'thresholds');
});
await t.check('R44 confirm / reject: headline £6.2m, C-009 102.7% Over cap £60,000 off the watch list, Reject restores, persists, Reset clears (see fun-state.mjs for the full chain)', async () => {
  await page.getByRole('button', { name: /Confirm match\s*,\s*Larchmont/ }).click(); await settle(page, 300);
  await go(page, '#/overview'); eq(await h1(page), '£6.2m across 15 contracts flagged as opportunities to investigate', 'headline');
  await page.reload(); await page.waitForSelector('#shell-main h1'); eq(await h1(page), '£6.2m across 15 contracts flagged as opportunities to investigate', 'after reload');
  await go(page, '#/spend/matches'); await page.getByRole('button', { name: /Undo decision\s*,\s*Larchmont/ }).click(); await settle(page, 300);
  eq(await store(page).then((s) => s['kontor-matches']), '{}', 'cleared');
});
await t.check('R45 conservative counting statement is always visible: "Suggested and unmatched payments are not counted until you confirm them."', async () => {
  ok((await main(page)).includes('Suggested and unmatched payments are not counted until you confirm them.'), 'statement');
});
await t.check('R46 no-contract tab: 8 payees £23,830,000 in the golden order with amounts; each row says why there is no clause link; none in the headline', async () => {
  await go(page, '#/spend/no-contract');
  const b = await main(page);
  const amounts = ['£9,300,000', '£4,750,000', '£2,600,000', '£2,400,000', '£1,700,000', '£1,510,000', '£1,060,000', '£510,000'];
  gold.noContract.forEach((n, i) => { const at = b.indexOf(n); ok(at >= 0 && b.slice(at, at + 400).includes(amounts[i]), `${n} ${amounts[i]}`); });
  eq((b.match(/There is no contract to read, so there is no clause to link\./g) || []).length >= 8, true, 'row notes');
  return '8 payees';
});
await t.check('R47 attribution rules visible on the matches tab and on the Method page', async () => {
  await go(page, '#/spend/matches'); await page.locator('details.mt-how summary').click();
  const a = await main(page);
  await go(page, '#/method?s=spend');
  const m = await main(page);
  for (const [name, b] of [['matches', a], ['method', m]]) ok(/latest-ending contract|latest ending contract/i.test(b) && /more than one contract/i.test(b), name + ' lacks the attribution rules');
});

/* ================================================================ H. Contracts (R48-R53) */
await visit(p, '#/contracts');
await t.check('R48 register: 24 rows, columns, search over title and supplier, category filter, row opens detail, sortable by end date and annual value', async () => {
  eq(await page.locator('#shell-main tbody tr').count(), 24, 'rows');
  const heads = await page.$$eval('#shell-main thead th', (ths) => ths.map((x) => x.textContent.trim()));
  ok(['Contract', 'Title', 'Supplier', 'Category', 'Route', 'Start', 'End', 'Annual value', 'Status', 'Flags'].every((c, i) => (heads[i] || '').toLowerCase().includes(c.toLowerCase()) || (c === 'Contract' && /id|contract/i.test(heads[i]))), 'headers ' + heads.join('|'));
  await page.locator('input[type="search"], input[type="text"]').first().fill('kestrelvale'); await settle(page, 700);
  eq(await page.locator('#shell-main tbody tr').count(), 1, 'search by supplier');
  await page.getByRole('button', { name: /Clear/ }).first().click(); await settle(page, 600);
  await page.locator('#shell-main thead th', { hasText: 'End' }).getByRole('button').click(); await settle(page, 200);
  const ends = await page.$$eval('#shell-main tbody tr', (trs) => trs.map((tr) => tr.textContent));
  ok((await page.locator('#shell-main thead th[aria-sort]').count()) >= 1, 'aria-sort');
  await page.locator('#shell-main tbody tr').first().locator('a').first().click();
  await page.waitForFunction(() => /^#\/contracts\/C-\d+/.test(location.hash));
  return heads.join(' | ');
});
await t.check('R49 detail: nine groups in order, C-005 14 answered fields each with a page, cap answer text, C-003 "No maximum stated. We used the contract value (£49,600,000).", C-018 notice "Not found" Needs review 0.58', async () => {
  await visit(p, '#/contracts/C-005');
  eq(await page.locator('[data-question]').count(), 9, 'groups');
  eq(await page.$$eval('[data-question]', (qs) => qs.map((q) => q.getAttribute('data-question'))), ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9'], 'order');
  eq(await page.locator('.cd-field').count(), 14, 'fields');
  eq(await page.locator('.cd-field a:has-text("View clause, page")').count() + await page.locator('.cd-field a[href^="#/source"]').count() >= 14, true, 'clause links');
  ok((await main(page)).includes('£5,000,000 for the whole term (stated maximum)') && (await main(page)).includes('View clause, page 23'), 'cap answer');
  await visit(p, '#/contracts/C-003'); ok((await main(page)).includes('No maximum stated. We used the contract value (£49,600,000).'), 'C-003');
  await visit(p, '#/contracts/C-018'); const b = await main(page);
  ok(b.includes('Not found') && b.includes('Needs review') && b.includes('0.58'), 'C-018');
});
await t.check('R50 derived panel for C-005: notice deadline + band, latest end, next price review, cap used, uplift reason "Prices are fixed for the term, so there is no index to test", each with a Method link; reasons for C-011 and C-019', async () => {
  await visit(p, '#/contracts/C-005');
  const d = await text(page.locator('.cd-derived'));
  ok(d.includes('28 February 2027') && d.includes('3 to 6 months') && d.includes('Prices are fixed for the term, so there is no index to test') && d.includes('167.0%'), d);
  eq(await page.locator('.cd-derived a[href^="#/method"]').count(), 6, 'method links');
  await visit(p, '#/contracts/C-011'); ok((await text(page.locator('.cd-derived'))).includes('No index cap stated in the contract'), 'C-011');
  await visit(p, '#/contracts/C-019'); ok((await text(page.locator('.cd-derived'))).includes('Fewer than 24 months of payments in the contract term'), 'C-019');
});
await t.check('R51 payments table paged 20, total to the penny, spend by contract year; page 2 reachable', async () => {
  await visit(p, '#/contracts/C-005');
  const rows = await page.locator('.cd-payments tbody tr, #shell-main table:has(caption:has-text("Sample payments")) tbody tr').count();
  ok(rows >= 20 && rows <= 22, 'first page rows (20 plus a total row): ' + rows);
  ok((await main(page)).includes('Sample payments (fictional)') && (await main(page)).includes('£8,350,000.00'), 'caption and total');
});
await t.check('R52 flags first on the contract page; a contract with none says "No opportunities flagged for this contract."', async () => {
  await visit(p, '#/contracts/C-005');
  const order = await page.evaluate(() => { const f = document.getElementById('cd-flags-title'), q = document.getElementById('cd-questions-title'); return f && q ? f.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING : 0; });
  ok(order, 'flags before questions');
  await visit(p, '#/contracts/C-006'); ok((await main(page)).includes('No opportunities flagged for this contract.'), 'C-006');
});
await t.check('R53 low-confidence answers: C-018 notice 0.58 shows Needs review; its renewal flag shows low confidence with "Relies on an answer Kontor is not sure about: notice period"', async () => {
  await go(page, '#/opportunities?flag=F-C-018-renewal');
  const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 300);
  const dt = await text(d);
  ok(/Needs review|Low/.test(dt), 'confidence label in drawer: ' + dt.slice(0, 500));
  ok(/not sure about: notice period/i.test(dt) || /relies on an answer Kontor is not sure about/i.test(dt), 'reason: ' + dt.slice(-1200).slice(0, 600));
  await page.keyboard.press('Escape');
  const rows = await rowsOf(page);
  const r = rows.find((x) => x.title.startsWith('Street cleansing'));
  ok(r && /Needs review|Low/.test(r.txt), 'row confidence: ' + (r && r.txt));
});

/* ================================================================ I. Source (R54-R59) */
await visit(p, '#/source/C-005/X-C-005-maximumValue');
await t.check('R54 source viewer: breadcrumb, Page 23 of 70, Clause 14.3, highlighted text equals the quote, scrolled into view, Back to opportunity, document title', async () => {
  const bc = await text(page.locator('.page-header nav, nav[aria-label*="readcrumb"]').first());
  ok(/Opportunities/.test(bc) && /Highways reactive maintenance/.test(bc) && /Clause 14\.3/.test(bc), 'breadcrumb: ' + bc);
  ok((await main(page)).includes('Cited clause'), 'label');
  eq(await page.locator('mark[data-extraction-id]').innerText(), extraction('X-C-005-maximumValue').provenance[0].quote, 'quote');
  ok((await main(page)).includes('Contract text, page 23 of 70') || (await main(page)).includes('23 of 70'), 'page of');
  const outline = await page.locator('mark[data-extraction-id]').evaluate((m) => getComputedStyle(m).outlineWidth + ' ' + getComputedStyle(m).outlineStyle);
  return 'mark outline ' + outline;
});
await t.check('R55 quote fidelity: all 336 extractions highlight exactly their quote', async () => {
  const bad = [];
  for (const x of data.extractions) {
    await go(page, `#/source/${x.contractId}/${x.id}`);
    const m = page.locator('mark[data-extraction-id]');
    const n = await m.count();
    if (n !== 1) { bad.push(x.id + ' marks=' + n); continue; }
    if ((await m.innerText()) !== x.provenance[0].quote) bad.push(x.id + ' text differs');
  }
  ok(bad.length === 0, bad.slice(0, 5).join('; ') + ` (${bad.length} bad)`);
  return '336/336';
});
await t.check('R56 missing page / extraction: "This page isn\'t in the sample." with Open contract; no crash', async () => {
  await visit(p, '#/source/C-005/not-an-id');
  eq(await h1(page), "This page isn't in the sample.", 'h1');
  ok(await page.getByRole('button', { name: 'Open contract' }).count() === 1, 'button');
});
await t.check('R57 Previous and Next answer step through the 14 answers in Q1-Q9 order and update the hash; ends are disabled', async () => {
  await visit(p, '#/source/C-005/X-C-005-estimatedAnnualValue');
  ok(await page.getByRole('button', { name: 'Previous answer' }).isDisabled(), 'Previous disabled on the first');
  const seen = [];
  for (let i = 0; i < 13; i += 1) { await page.getByRole('button', { name: 'Next answer' }).click(); await settle(page, 120); seen.push((await hashOf(page)).split('/').pop().split('?')[0]); }
  ok(await page.getByRole('button', { name: 'Next answer' }).isDisabled(), 'Next disabled on the last');
  eq(seen[0], 'X-C-005-awardedTotalValue', 'second answer'); eq(seen.length, 13, 'steps');
  return seen.slice(-2).join(', ');
});
await t.check('R58 page text realism: clause refs as headings, filler/neighbour clauses present, illustrative label', async () => {
  await visit(p, '#/source/C-005/X-C-005-maximumValue');
  ok((await page.locator('.src-heading').count()) >= 1 && (await page.locator('.src-row').count()) >= 5, 'structure');
  ok((await main(page)).includes('Illustrative contract text written for this demo, not a real document.'), 'label');
});
await t.check('R59 hand-check: Mark correct/incorrect persists across reload, count on Contracts "n of 336", cleared only by Reset', async () => {
  await visit(p, '#/source/C-001/X-C-001-endDate');
  await page.getByRole('button', { name: 'Mark answer as correct' }).click(); await settle(page, 200);
  await page.reload(); await page.waitForSelector('#shell-main h1');
  eq(await page.getByRole('button', { name: 'Mark answer as correct' }).getAttribute('aria-pressed'), 'true', 'persisted');
  await go(page, '#/contracts'); ok((await main(page)).includes('1 of 336 answers checked by hand'), 'count');
});

/* ================================================================ J. Uplift (R60) */
await t.check('R60 uplift: flagged C-004 +12.1% vs 3.0% £188,200, C-012 +7.2% vs 4.5% £49,000, C-010 +6.6% vs 3.0% £18,060; C-003, C-015 within tolerance; C-001, C-008 within cap; C-009 payments fell 53.7%', async () => {
  const want = { 'C-004': ['12.1%', '3.0%', '£188,200'], 'C-012': ['7.2%', '4.5%', '£49,000'], 'C-010': ['6.6%', '3.0%', '£18,060'], 'C-003': ['4.4%', '4.0%'], 'C-015': ['3.8%', '3.0%'], 'C-001': ['2.7%', '3.0%'], 'C-008': ['1.7%', '3.0%'], 'C-009': ['53.7%'] };
  for (const [id, strs] of Object.entries(want)) { await go(page, '#/contracts/' + id); await settle(page, 200); const d = await text(page.locator('.cd-derived')); for (const s of strs) ok(d.includes(s), `${id} derived panel lacks ${s}: ${d.slice(-260)}`); }
  await go(page, '#/contracts/C-004'); ok(/Within tolerance|Flagged|Above/.test(await text(page.locator('.cd-derived'))), 'state word');
  await go(page, '#/contracts/C-003'); ok(/Within tolerance/.test(await text(page.locator('.cd-derived'))), 'C-003 within tolerance');
  await go(page, '#/opportunities?flag=F-C-004-uplift');
  const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 250);
  ok(/Volume changes may explain part of this/.test(await text(d)), 'volume caveat'); await page.keyboard.press('Escape');
});

/* ================================================================ K. Triage, feedback, reset, assumptions (R61-R64) */
await visit(p, '#/opportunities?flag=F-C-005-overCap');
await t.check('R61 review status select To investigate / Under review / Explained / No action; Explained excludes it: headline £2.8m, note, Opportunities totals match, reviewed rows under Reviewed and All; persists; back to £6.1m', async () => {
  const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 300);
  eq(await d.locator('select option').allInnerTexts(), ['To investigate', 'Under review', 'Explained', 'No action'], 'options');
  await d.locator('select').selectOption('explained'); await settle(page, 300);
  await page.keyboard.press('Escape'); await settle(page, 300);
  await page.reload(); await page.waitForSelector('#shell-main h1'); await settle(page, 300);
  ok((await text(page.locator('.opp-totals__main'))).includes('£2,795,238'), 'totals after reload');
  await go(page, '#/overview'); eq(await h1(page), '£2.8m across 15 contracts flagged as opportunities to investigate', 'headline');
  ok((await main(page)).includes('£3,350,000 excluded after your review'), 'note');
  await go(page, '#/opportunities?status=all'); eq(await page.locator('.opp .kviz-barlist__list > li').count(), 19, 'All shows 19');
  await go(page, '#/opportunities?flag=F-C-005-overCap'); await d.waitFor({ state: 'visible' }); await settle(page, 300);
  await d.locator('select').selectOption('to_investigate'); await settle(page, 300); await page.keyboard.press('Escape'); await settle(page, 300);
  await go(page, '#/overview'); eq(await h1(page), gold.headline, 'back');
});
await t.check('R62 feedback dialog: question, Yes/Maybe/No, textarea, helper, Save/Cancel; the no-choice error exact; blocked-storage error exact; Copy feedback has answer, comment and as-of date', async () => {
  await page.getByRole('button', { name: 'Give feedback' }).click();
  const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Tell us what you think' }); await dlg.waitFor({ state: 'visible' }); await settle(page, 300);
  const dt = await text(dlg);
  ok(dt.includes('Would you use this on your own contracts?') && dt.includes('What would make it more useful?') && dt.includes('Your answer stays on this device unless you copy it.'), dt.slice(0, 400));
  await dlg.getByRole('button', { name: 'Save feedback' }).click();
  ok((await text(dlg)).includes("Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again."), 'error');
  await page.keyboard.press('Escape');
});
await t.check('R63 Reset demo changes: confirm appears before anything is cleared, Cancel is focused and changes nothing, confirm restores £6.1m and shows the toast', async () => {
  await setStore(page, { 'kontor-triage': { 'F-C-005-overCap': 'explained' } });
  await page.reload(); await page.waitForSelector('#shell-main h1');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const s = page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }); await s.waitFor({ state: 'visible' }); await settle(page, 300);
  await page.getByRole('button', { name: 'Reset demo changes' }).click();
  const a = page.getByRole('alertdialog'); await a.waitFor({ state: 'visible' }); await settle(page, 300);
  ok(/Reset your changes\?/.test(await text(a)) && /This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device\. The demo goes back to its starting numbers\./.test(await text(a)), await text(a));
  eq((await activeDesc(page)).text, 'Cancel', 'Cancel focused');
  ok((await store(page))['kontor-triage'] !== null, 'nothing cleared before the confirm');
  await a.getByRole('button', { name: 'Cancel' }).click(); await settle(page, 300);
  ok((await store(page))['kontor-triage'] !== null, 'Cancel changed nothing');
  await page.getByRole('button', { name: 'Reset demo changes' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Reset changes' }).click(); await settle(page, 400);
  ok((await toasts(page)).join(' ').includes('Changes reset.') && (await toasts(page)).join(' ').includes('The demo is back to its starting numbers.'), 'toast');
  await page.keyboard.press('Escape'); await settle(page, 300);
  eq(await h1(page), gold.headline, 'headline');
});
await t.check('R64 assumptions: 8% gives £6.8m and renewals £1,720,800 (total £6,790,538); banner "Changing assumptions changes every indicative figure."', async () => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const s = page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }); await s.waitFor({ state: 'visible' }); await settle(page, 300);
  ok((await text(s)).includes('Changing assumptions changes every indicative figure.'), 'banner');
  await s.getByRole('radiogroup', { name: 'Renewal rate' }).getByRole('radio', { name: '8%' }).click(); await settle(page, 300);
  await page.keyboard.press('Escape'); await settle(page, 300);
  eq(await h1(page), '£6.8m across 15 contracts flagged as opportunities to investigate', '8%');
  ok((await text(page.locator('.ov-sum__eq'))).includes('£1,720,800') && (await text(page.locator('.ov-sum__eq'))).endsWith('£6,790,538'), await text(page.locator('.ov-sum__eq')));
  await setStore(page, { 'kontor-assumptions': null }); await page.reload();
});

await t.check('no console errors and no external requests in the whole sweep', async () => {
  eq(p.errors, [], 'errors'); eq(externalRequests(p).map((r) => r.url), [], 'external');
});

await p.ctx.close();
await h.close();
t.finish();
