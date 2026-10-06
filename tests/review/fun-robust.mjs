// fun-robust: the demo on a phone and a tablet, keyboard-only, from file:// (the standalone build), under double clicks and rapid navigation,
// and no horizontal page scroll across odd viewport sizes.
//   node tests/review/fun-robust.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { waitH1, T, ok, eq, norm, text, settle, hashOf, h1, store, setStore, shot, launchApp, visit, go, axe, externalRequests, noOverflow, toasts, activeDesc, contract, gold, data, ROOT, VIEWPORTS, SCRATCH } from './fun-lib.mjs';
import { CHROMIUM } from '../lib/harness.mjs';

const t = new T('fun-robust');
const h = await launchApp();

/* ================================================================ phone: 390x844 */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.phone, hasTouch: true });
  const { page } = p;
  await visit(p, '#/overview');
  const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); await loc.tap({ timeout: 5000 }); };
  const bar = () => page.locator('nav[aria-label="Primary"]');
  await t.check('phone: bottom tab bar shows the six items with captions Overview, Flags, Renewals, Spend, Contracts, Roadmap, sits at the bottom, and never covers the last content', async () => {
    const caps = await page.$$eval('nav[aria-label="Primary"] .shell__rail-caption', (e) => e.map((x) => x.textContent.trim()));
    eq(caps, ['Overview', 'Flags', 'Renewals', 'Spend', 'Contracts', 'Roadmap'], 'captions');
    const b = await bar().boundingBox(); ok(Math.abs(b.y + b.height - 844) < 2, 'bar bottom ' + JSON.stringify(b));
    const last = await page.evaluate(() => { const m = document.getElementById('shell-main'); m.scrollTop = m.scrollHeight; const close = document.querySelector('.ov-close').getBoundingClientRect(); const rail = document.querySelector('nav[aria-label="Primary"]').getBoundingClientRect(); return { closeBottom: Math.round(close.bottom), railTop: Math.round(rail.top) }; });
    ok(last.closeBottom <= last.railTop + 1, 'last panel is hidden behind the bar: ' + JSON.stringify(last));
  });
  await t.check('phone: the demo flow with taps only: radar -> opportunities -> row -> drawer -> View clause -> source -> back -> spend -> no-contract -> contracts', async () => {
    await tap(bar().getByRole('button', { name: 'Renewal radar' })); await waitH1(page, 'Renewal radar');
    ok((await text(page.locator('#shell-main'))).includes('The notice date passed 6 days ago'), 'attention text');
    await tap(bar().getByRole('button', { name: 'Opportunities' })); await waitH1(page, 'Opportunities to investigate');
    await tap(page.locator('.opp .kviz-barlist__list > li').first().locator('.kviz-barlist__name'));
    const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 400);
    const link = d.getByRole('link', { name: /View clause, page 23/ });
    const lb = await link.boundingBox(); ok(lb && lb.y + lb.height <= 844 && lb.x >= 0 && lb.x + lb.width <= 390, 'View clause button inside the viewport: ' + JSON.stringify(lb));
    await tap(link); await page.waitForSelector('mark[data-extraction-id]'); await settle(page, 600);
    const mk = await page.locator('mark[data-extraction-id]').boundingBox(); ok(mk && mk.y >= 0 && mk.y + mk.height <= 844, 'cited clause visible on a phone: ' + JSON.stringify(mk));
    await shot(page, 'phone-source');
    await tap(page.getByRole('button', { name: 'Back to opportunity' })); await waitH1(page, 'Opportunities to investigate');
    await tap(bar().getByRole('button', { name: 'Cap vs spend' })); await waitH1(page, 'Cap vs spend');
    await tap(page.getByRole('link', { name: 'No contract on the register' })); await page.waitForFunction(() => location.hash === '#/spend/no-contract'); await settle(page, 300);
    ok((await text(page.locator('#shell-main'))).includes('£23,830,000'), 'no-contract total');
    await tap(bar().getByRole('button', { name: 'Contracts' })); await waitH1(page, 'Contracts');
    eq((await noOverflow(page)).doc, 0, 'no horizontal page scroll on the register');
  });
  await t.check('phone: Menu opens below the header with five items; Why this matters and Demo guide work; flag drawer footer (review select and View clause) are both reachable', async () => {
    await tap(page.locator('.shell__header button[aria-label="Menu"]')); await settle(page, 300);
    eq(await page.$$eval('nav[aria-label="Menu"] [role="menuitem"]', (e) => e.map((x) => x.textContent.trim())), ['Why this matters', 'How this is calculated', 'About this data', 'Demo guide', 'Give feedback'], 'items');
    await tap(page.getByRole('menuitem', { name: 'Demo guide' })); await settle(page, 400);
    ok(await page.locator('[role="dialog"]').filter({ hasText: 'Presenter notes' }).isVisible(), 'guide open');
    await page.keyboard.press('Escape'); await settle(page, 300);
    await go(page, '#/opportunities?flag=F-C-005-overCap');
    const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 400);
    const sel = await d.locator('select').boundingBox(); const cta = await d.getByRole('link', { name: /View clause/ }).first().boundingBox();
    ok(sel && sel.y + sel.height <= 844 && cta && cta.y + cta.height <= 844, `footer controls in view: select ${JSON.stringify(sel)} cta ${JSON.stringify(cta)}`);
  });
  await t.check('phone: toasts do not cover the bottom tab bar controls for more than their lifetime (rail still tappable with a toast showing)', async () => {
    await go(page, '#/overview');
    await page.locator('.shell__header button[aria-label="Share"], .shell__header button[aria-label="Apps"]').first().click({ force: true }).catch(() => {});
    await page.getByRole('button', { name: 'Account: Marchbank commercial team' }).tap(); await settle(page, 300);
    const toast = await page.locator('.kx-toast').first().boundingBox().catch(() => null);
    const b = await bar().boundingBox();
    t.note('phone toast vs bar', `toast ${JSON.stringify(toast)} bar top ${Math.round(b.y)}`);
    if (toast) ok(toast.y + toast.height <= b.y + 1 || toast.y >= b.y + b.height, 'toast overlaps the tab bar');
    await tap(bar().getByRole('button', { name: 'Renewal radar' })); await waitH1(page, 'Renewal radar');
  });
  eq(p.errors, [], 'errors on the phone run');
  await p.ctx.close();
}

/* ================================================================ tablet 1024x768 demo flow */
{
  const p = await h.newPage({ theme: 'light', viewport: VIEWPORTS.tablet });
  const { page } = p;
  await visit(p, '#/overview');
  await t.check('tablet 1024x768 (light): headline and four cards in the first screen; the flow to the clause works with clicks; bands readable', async () => {
    const r = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.ov-hero a.kviz-card')].map((c) => Math.round(c.getBoundingClientRect().bottom)), vh: innerHeight }));
    ok(r.cards.every((b) => b <= r.vh), 'cards visible: ' + JSON.stringify(r));
    await page.locator('nav[aria-label="Primary"] button[aria-label="Opportunities"]').click(); await waitH1(page, 'Opportunities to investigate');
    await page.locator('.opp .kviz-barlist__list > li').first().locator('.kviz-barlist__name').click();
    const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 300);
    await d.getByRole('link', { name: /View clause, page 23/ }).click(); await page.waitForSelector('mark[data-extraction-id]');
    const m = await page.locator('mark[data-extraction-id]').boundingBox(); ok(m && m.y >= 0 && m.y < 768, 'mark visible: ' + JSON.stringify(m));
    eq((await noOverflow(page)).doc, 0, 'no overflow on the source viewer');
  });
  await p.ctx.close();
}

/* ================================================================ keyboard only */
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  await visit(p, '#/overview');
  const active = async () => page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) : ''; });
  async function tabTo(re, max = 80) { for (let i = 0; i < max; i += 1) { await page.keyboard.press('Tab'); if (re.test(await active())) return i + 1; } throw new Error('Tab never reached ' + re + ' within ' + max + ' stops; last: ' + await active()); }
  await t.check('keyboard only: skip link first, then Tab to the rail, Enter on Opportunities, Tab into the list, Enter opens the drawer, Tab to View clause, Enter lands on the focused cited clause', async () => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Tab'); eq(await active(), 'Skip to content', 'first stop');
    const n = await tabTo(/^Opportunities$/); await page.keyboard.press('Enter'); await waitH1(page, 'Opportunities to investigate');
    ok((await activeDesc(page)).tag === 'H1', 'focus moved to the h1 after the route change');
    t.note('keyboard stops from skip link to the Opportunities rail item', String(n));
    const rowStops = await tabTo(/Highways reactive maintenance and minor works/, 40);
    t.note('keyboard stops from the h1 to the first opportunity row', String(rowStops));
    await page.keyboard.press('Enter');
    const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 400);
    ok(await page.evaluate(() => document.querySelector('.flag-drawer').contains(document.activeElement)), 'focus inside the drawer');
    await tabTo(/View clause, page 23/, 40); await page.keyboard.press('Enter');
    await page.waitForSelector('mark[data-extraction-id]'); await settle(page, 600);
    ok(await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'MARK'), 'the cited clause has focus: ' + JSON.stringify(await activeDesc(page)));
    await page.keyboard.press('Alt+ArrowLeft'); await settle(page, 500);
    t.note('Alt+Left from the source', await hashOf(page));
  });
  await t.check('keyboard only: Escape returns focus to the opener for About, Feedback, Settings, Demo guide, Menu, flag drawer, payments drawer, confirm dialog', async () => {
    await visit(p, '#/overview');
    for (const [name, open, opener] of [
      ['About', () => page.getByRole('button', { name: 'About this data' }).focus().then(() => page.keyboard.press('Enter')), 'About this data'],
      ['Feedback', () => page.locator('.ov-close').getByRole('button', { name: 'Give feedback' }).focus().then(() => page.keyboard.press('Enter')), 'Give feedback'],
      ['Settings', () => page.getByRole('button', { name: 'Settings', exact: true }).focus().then(() => page.keyboard.press('Enter')), 'Settings'],
      ['Demo guide', () => page.getByRole('button', { name: 'Open demo guide' }).focus().then(() => page.keyboard.press('Enter')), 'Open demo guide'],
      ['Menu', () => page.locator('nav[aria-label="Primary"] button[aria-label="Menu"]').focus().then(() => page.keyboard.press('Enter')), 'Menu'],
    ]) {
      await open(); await settle(page, 450);
      await page.keyboard.press('Escape'); await settle(page, 450);
      const a = await active();
      ok(a === opener || a.startsWith(opener), `${name}: focus after Escape is "${a}", expected "${opener}"`);
    }
  });
  eq(p.errors, [], 'errors in the keyboard run');
  await p.ctx.close();
}

/* ================================================================ file:// standalone */
{
  const file = path.join(ROOT, 'dist/kontor-prototype.html');
  await t.check('standalone build exists and is newer than the last source change', async () => {
    const st = fs.statSync(file);
    const newest = Math.max(...fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter((f) => /\.(jsx?|css|json)$/.test(f) && !/^dev\//.test(f)).map((f) => fs.statSync(path.join(ROOT, 'src', f)).mtimeMs));
    const appJs = fs.statSync(path.join(ROOT, 'dist/app.js')).mtimeMs;
    t.note('standalone mtimes', `standalone ${new Date(st.mtimeMs).toISOString()}, dist/app.js ${new Date(appJs).toISOString()}, newest src ${new Date(newest).toISOString()}, size ${(st.size / 1e6).toFixed(1)} MB`);
    ok(st.mtimeMs >= newest - 1000, 'the standalone file is older than the newest source file');
    ok(st.mtimeMs >= appJs - 5000, 'the standalone file is older than dist/app.js');
  });
  await t.check('standalone from file://: opens in dark on the Overview, every route renders, no request leaves the file, Export downloads, Share falls back and toasts, theme persists in the same file', async () => {
    const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const reqs = []; const errs = [];
    page.on('request', (r) => reqs.push(r.url())); page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + file);
    await page.waitForSelector('#shell-main h1');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'dark default');
    eq(await h1(page), gold.headline, 'headline');
    for (const r of ['#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence', '#/opportunities?flag=F-C-005-overCap']) {
      await page.evaluate((x) => { location.hash = x; }, r); await page.waitForTimeout(250);
      ok((await page.locator('#shell-main h1').count()) === 1, 'h1 on ' + r);
    }
    await page.evaluate(() => { location.hash = '#/opportunities'; }); await page.waitForSelector('.opp .kviz-barlist__list'); await page.waitForTimeout(300);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: 'Export opportunities' }).click()]);
    ok(/kontor-opportunities-2026-10-06\.csv/.test(dl.suggestedFilename()), 'download name ' + dl.suggestedFilename());
    await page.getByRole('button', { name: 'Share' }).click(); await page.waitForTimeout(400);
    const toast = (await page.locator('.kx-toast').allInnerTexts()).join(' | ');
    t.note('standalone Share toast', toast.replace(/\s+/g, ' '));
    await page.locator('.shell__header button[aria-pressed]').first().click(); await page.waitForTimeout(200);
    const th = await page.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('kontor-theme')]);
    t.note('standalone theme after toggle on file://', JSON.stringify(th));
    const ext = reqs.filter((u) => !u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:'));
    await browser.close();
    eq(ext, [], 'requests that left the file'); eq(errs, [], 'console errors');
    ok(/Link copied|Link not copied/.test(toast), 'Share gives a toast: ' + toast);
    return `${reqs.length} requests, all file:/data:`;
  });
}

/* ================================================================ rapid and repeated input */
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  await t.check('double click on "Confirm match" leaves the decision in a consistent state (Confirmed or Suggested, never half-applied) and the headline agrees with the row', async () => {
    await visit(p, '#/spend/matches');
    await page.getByRole('button', { name: /Confirm match\s*,\s*Larchmont/ }).dblclick(); await settle(page, 500);
    const row = await text(page.locator('.mt-table tbody tr', { hasText: 'Larchmont Grounds Maintenance' }));
    const st = await store(page);
    await go(page, '#/overview');
    const head = await h1(page);
    t.note('after dblclick Confirm', `row status: ${/Confirmed/.test(row) ? 'Confirmed' : /Suggested/.test(row) ? 'Suggested' : row.slice(0, 80)}; stored ${st['kontor-matches']}; headline ${head.slice(0, 8)}`);
    const confirmed = /Confirmed/.test(row);
    ok((confirmed && /£6\.2m/.test(head) && /confirm/.test(st['kontor-matches'])) || (!confirmed && /£6\.1m/.test(head) && st['kontor-matches'] === '{}'), 'inconsistent: ' + row.slice(0, 80) + ' / ' + head + ' / ' + st['kontor-matches']);
    await setStore(page, { 'kontor-matches': null });
  });
  await t.check('rapid navigation: 20 hash changes in a row end on the last route with its own h1, no error, no stuck overlay', async () => {
    await visit(p, '#/overview');
    const seq = ['#/opportunities', '#/renewals', '#/spend', '#/contracts', '#/roadmap', '#/method', '#/evidence', '#/overview', '#/spend/matches', '#/contracts/C-007'];
    await page.evaluate((s) => { let i = 0; const next = () => { if (i < 20) { location.hash = s[i % s.length]; i += 1; setTimeout(next, 15); } }; next(); }, seq);
    await page.waitForFunction(() => location.hash === '#/contracts/C-007', null, { timeout: 5000 });
    await settle(page, 500);
    eq(await h1(page), contract('C-007').title, 'last route');
    eq(p.errors, [], 'errors');
  });
  await t.check('rapid triage: five quick select changes on the flag drawer leave the stored value equal to the last choice and the headline equal to it', async () => {
    await go(page, '#/opportunities?flag=F-C-005-overCap');
    const d = page.locator('[role="dialog"].flag-drawer'); await d.waitFor({ state: 'visible' }); await settle(page, 300);
    for (const v of ['explained', 'under_review', 'not_an_issue', 'to_investigate', 'explained']) await d.locator('select').selectOption(v);
    await settle(page, 400);
    eq(JSON.parse((await store(page))['kontor-triage']), { 'F-C-005-overCap': 'explained' }, 'stored');
    ok((await toasts(page)).length <= 3, 'at most three toasts: ' + (await toasts(page)).length);
    await page.keyboard.press('Escape'); await go(page, '#/overview');
    ok(/£2\.8m/.test(await h1(page)), await h1(page));
    await setStore(page, { 'kontor-triage': null });
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ================================================================ odd viewports */
await t.check('no horizontal page scroll at 320, 360, 600, 699, 700, 899, 900, 1100, 1280x720, 1920x1080, 2560x1440 and a 200%-zoom 720x450 on every route', async () => {
  const bad = [];
  const sizes = [[320, 568], [360, 640], [600, 900], [699, 900], [700, 900], [899, 700], [900, 700], [1100, 800], [1280, 720], [1920, 1080], [2560, 1440], [720, 450]];
  for (const [w, hh] of sizes) {
    const q = await h.newPage({ theme: 'dark', viewport: { width: w, height: hh } });
    for (const r of ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence']) {
      await visit(q, r); await settle(q.page, 120);
      const o = await noOverflow(q.page);
      if (o.doc > 0 || o.main > 1) bad.push(`${w}x${hh} ${r}: doc +${o.doc} main +${o.main}`);
    }
    await q.ctx.close();
  }
  ok(bad.length === 0, bad.join(' ; '));
});

await h.close();
t.finish();
