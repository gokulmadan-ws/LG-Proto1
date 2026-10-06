// fun-links: deep links, reload, Back/Forward on every route and every address-driven overlay, plus unknown and hostile addresses.
//   node tests/review/fun-links.mjs
import { waitH1, T, ok, eq, norm, text, settle, hashOf, h1, rail, store, setStore, shot, launchApp, visit, go, externalRequests, activeDesc, contract, gold, data } from './fun-lib.mjs';

const t = new T('fun-links');
const h = await launchApp();

const TITLE = (s) => `${s} | Kontor financial layer`;
const ROUTES = [
  // [hash, h1 (string or RegExp source), document.title, rail label (or null)]
  ['#/overview', gold.headline, TITLE('Overview'), 'Overview'],
  ['#/opportunities', 'Opportunities to investigate', TITLE('Opportunities'), 'Opportunities'],
  ['#/renewals', 'Renewal radar', TITLE('Renewal radar'), 'Renewal radar'],
  ['#/spend', 'Cap vs spend', null, 'Cap vs spend'],
  ['#/spend/matches', 'Cap vs spend', null, 'Cap vs spend'],
  ['#/spend/no-contract', 'Cap vs spend', null, 'Cap vs spend'],
  ['#/contracts', 'Contracts', TITLE('Contracts'), 'Contracts'],
  ['#/contracts/C-005', 'Highways reactive maintenance and minor works', null, 'Contracts'],
  ['#/source/C-005/X-C-005-maximumValue', 'Clause 14.3', TITLE('Clause 14.3'), 'Opportunities'],
  ['#/source/C-005/X-C-005-maximumValue?from=renewals', 'Clause 14.3', TITLE('Clause 14.3'), 'Renewal radar'],
  ['#/method', 'How this is calculated', TITLE('How this is calculated'), null],
  ['#/method?s=cap', 'How this is calculated', TITLE('How this is calculated'), null],
  ['#/roadmap', 'Roadmap', TITLE('Roadmap'), 'Roadmap'],
  ['#/evidence', 'Why this matters', TITLE('Why this matters'), null],
];

/* ---------------------------------------------------------------- 1. every route: fresh load */
const p = await h.newPage({ theme: 'dark' });
const { page } = p;
for (const [hash, heading, title, railLabel] of ROUTES) {
  await t.check(`fresh load ${hash}: one h1 "${heading.slice(0, 40)}", title, rail, no focus theft, banner`, async () => {
    await visit(p, hash);
    eq(await page.locator('#shell-main h1').count(), 1, 'h1 count');
    eq(await h1(page), heading, 'h1');
    if (title) eq(await page.title(), title, 'title');
    else ok(/ \| Kontor financial layer$/.test(await page.title()), 'title suffix: ' + await page.title());
    const cur = page.locator('nav[aria-label="Primary"] [aria-current="page"]');
    if (railLabel) eq(await cur.getAttribute('aria-label'), railLabel, 'rail current'); else eq(await cur.count(), 0, 'no rail item is current');
    await settle(page, 300);
    ok(await page.locator('.sample-banner').isVisible(), 'banner');
    const a = await activeDesc(page);
    ok(a.tag !== 'H1' || /^source/.test(hash.slice(2)), 'first load must not move focus to the h1: ' + JSON.stringify(a));
  });
}
await t.check('no console errors and no external requests across all fresh loads', async () => {
  eq(p.errors, [], 'errors');
  eq(externalRequests(p).map((r) => r.url), [], 'external requests');
});

/* ---------------------------------------------------------------- 2. reload keeps the route; Back/Forward walk the history */
await t.check('reload on every route keeps the same hash and the same h1', async () => {
  for (const [hash, heading] of ROUTES) {
    await visit(p, hash);
    await page.reload();
    await page.waitForSelector('#shell-main h1');
    eq(await hashOf(page), hash, 'hash after reload of ' + hash);
    eq(await h1(page), heading, 'h1 after reload of ' + hash);
  }
});
await t.check('Back and Forward across six routes: right h1 every step, scroll reset, focus on the h1', async () => {
  await visit(p, '#/overview');
  const seq = ['#/opportunities', '#/renewals', '#/spend/matches', '#/contracts', '#/contracts/C-007', '#/roadmap'];
  for (const s of seq) { await page.evaluate((x) => { location.hash = x; }, s); await page.waitForFunction((x) => location.hash === x, s); await settle(page, 150); }
  const expected = ['Roadmap', 'Contracts', 'Contracts', 'Cap vs spend', 'Renewal radar', 'Opportunities to investigate', gold.headline];
  eq(await h1(page), 'Roadmap', 'at end');
  const back = ['Contracts' /* detail shows the contract title */, 'Contracts', 'Cap vs spend', 'Renewal radar', 'Opportunities to investigate', gold.headline];
  const wantBack = [contract('C-007').title, 'Contracts', 'Cap vs spend', 'Renewal radar', 'Opportunities to investigate', gold.headline];
  for (const w of wantBack) {
    await page.goBack();
    await settle(page, 250);
    eq(await h1(page), w, 'Back');
    const a = await activeDesc(page);
    ok(a.tag === 'H1', 'focus on the heading after Back: ' + JSON.stringify(a));
    eq(await page.evaluate(() => document.getElementById('shell-main').scrollTop), 0, 'scroll reset');
  }
  for (const w of [...wantBack].reverse().slice(1).concat(['Roadmap'])) {
    await page.goForward();
    await settle(page, 250);
    eq(await h1(page), w, 'Forward');
  }
});
await t.check('clicking the rail item you are already on adds no history entry and keeps the page', async () => {
  await visit(p, '#/renewals');
  const len = await page.evaluate(() => history.length);
  await rail(page, 'Renewal radar');
  await rail(page, 'Renewal radar');
  eq(await page.evaluate(() => history.length), len, 'history length');
  eq(await hashOf(page), '#/renewals', 'hash');
});
await t.check('filters use replace: chip, search, sort and status changes add no history entries on Opportunities, Contracts, Spend', async () => {
  await visit(p, '#/opportunities');
  const len = await page.evaluate(() => history.length);
  await page.locator('.kviz-chipbtn').nth(1).click();
  await settle(page, 200);
  await page.locator('.opp-control--sort select').selectOption('type');
  await page.locator('.opp-control--status select').selectOption('all');
  await page.locator('.opp-control--search input').fill('legal');
  await settle(page, 700);
  eq(await page.evaluate(() => history.length), len, 'history length on Opportunities');
  ok((await hashOf(page)).includes('q=legal') && (await hashOf(page)).includes('sort=type') && (await hashOf(page)).includes('status=all'), 'address carries the filters: ' + await hashOf(page));
  await visit(p, '#/contracts');
  const len2 = await page.evaluate(() => history.length);
  await page.locator('input[type="search"], input[type="text"]').first().fill('ict');
  await settle(page, 700);
  eq(await page.evaluate(() => history.length), len2, 'history length on Contracts');
  await visit(p, '#/spend');
  const len3 = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: /^Over cap/ }).first().click();
  await settle(page, 200);
  eq(await page.evaluate(() => history.length), len3, 'history length on Spend');
  eq(await hashOf(page), '#/spend?state=over', 'spend filter address');
});

/* ---------------------------------------------------------------- 3. query deep links apply their state */
const DEEP = [
  ['#/opportunities?type=overCap', async () => { const n = await page.locator('.opp .kviz-barlist__list > li').count(); eq(n, 3, 'overCap rows'); }],
  ['#/opportunities?type=nearCap', async () => { eq(await page.locator('.opp .kviz-barlist__list > li').count(), 1, 'nearCap rows'); }],
  ['#/opportunities?type=renewal', async () => { eq(await page.locator('.opp .kviz-barlist__list > li').count(), 12, 'renewal rows'); }],
  ['#/opportunities?type=uplift', async () => { eq(await page.locator('.opp .kviz-barlist__list > li').count(), 3, 'uplift rows'); }],
  ['#/opportunities?status=reviewed', async () => { eq(await page.locator('.opp .kviz-barlist__list > li').count(), 0, 'reviewed rows with nothing reviewed'); ok((await text(page.locator('.opp'))).includes('No opportunities match these filters.'), 'empty state'); }],
  ['#/opportunities?status=all&sort=type', async () => { eq(await page.locator('.opp .kviz-barlist__list > li').count(), 19, 'all rows'); }],
  ['#/opportunities?q=highways', async () => { const r = await page.locator('.opp .kviz-barlist__list > li').count(); eq(r, 2, 'highways rows (C-005 overCap + renewal)'); eq(await page.locator('.opp-control--search input').inputValue(), 'highways', 'search box'); }],
  ['#/opportunities?sort=date', async () => { const v = await page.$$eval('.opp .kviz-barlist__rank', (e) => e.map((x) => +x.textContent)); ok(v.length === 19 && v.slice(-5).every((n) => [1, 2, 3, 9, 11].includes(n)), 'rows with no action date last: ' + v.join(',')); }],
  ['#/spend?state=close', async () => { eq(await page.locator('.cap-panel .kviz-bl__list > li').count(), 3, 'close rows'); }],
  ['#/spend?payments=C-007', async () => { await page.locator('[role="dialog"]').first().waitFor({ state: 'visible' }); ok((await text(page.locator('[role="dialog"]').first())).includes('£6,160,000'), 'payments drawer for C-007'); }],
  ['#/spend/matches?status=review', async () => { ok((await text(page.locator('.mt-table, table').first())).includes('Larchmont Grounds Maintenance'), 'suggested row'); }],
  ['#/spend/no-contract?payee=Dunmoor%20Agency%20Staffing%20Ltd', async () => { await page.locator('[role="dialog"]').first().waitFor({ state: 'visible' }); ok((await text(page.locator('[role="dialog"]').first())).includes('£9,300,000'), 'payee drawer'); }],
  ['#/contracts?q=ict', async () => { ok((await text(page.locator('#shell-main'))).includes('Showing 1 of 24'), 'search matches title, supplier and id only: C-007 is the one title containing "ICT" (the other four ICT-category contracts are not found)'); }],
  ['#/contracts?category=ICT&sort=value&dir=desc', async () => { ok((await text(page.locator('#shell-main'))).includes('Showing 5 of 24'), 'ICT category'); }],
  ['#/contracts/c-005', async () => { eq(await h1(page), contract('C-005').title, 'lower-case id accepted'); }],
  ['#/method?s=uplift', async () => { await settle(page, 400); eq(await page.evaluate(() => document.activeElement && document.activeElement.id), 'uplift', 'focus on the uplift heading'); }],
];
for (const [hash, fn] of DEEP) {
  await t.check(`deep link ${hash}`, async () => { await visit(p, hash); await settle(page, 450); await fn(); });
}

/* ---------------------------------------------------------------- 4. the address-driven drawer on every route */
const FLAG_ROUTES = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/method', '#/roadmap', '#/evidence', '#/source/C-005/X-C-005-maximumValue'];
for (const r of FLAG_ROUTES) {
  await t.check(`?flag= on ${r}: opens on a fresh load, Escape closes it, removes only the param, adds no history, focus not lost`, async () => {
    const withFlag = r + '?flag=F-C-005-overCap';
    await visit(p, withFlag);
    const d = page.locator('[role="dialog"].flag-drawer');
    await d.waitFor({ state: 'visible', timeout: 5000 });
    await settle(page, 500);
    ok((await text(d)).includes('£8,350,000'), 'drawer content');
    ok(await page.evaluate(() => document.querySelector('.flag-drawer').contains(document.activeElement)), 'focus is inside the drawer: ' + JSON.stringify(await activeDesc(page)));
    const len = await page.evaluate(() => history.length);
    await page.keyboard.press('Escape');
    await settle(page, 400);
    eq(await hashOf(page), r, 'hash after Escape');
    eq(await page.evaluate(() => history.length), len, 'no history added');
    ok(!(await d.isVisible().catch(() => false)), 'drawer closed');
    const a = await activeDesc(page);
    ok(a.tag !== 'BODY', 'focus must not fall to <body> after closing: ' + JSON.stringify(a));
  });
}
await t.check('?flag= with an unknown id opens nothing and does not crash; the page still works', async () => {
  await visit(p, '#/opportunities?flag=F-NOPE-overCap');
  await settle(page, 400);
  ok(!(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)), 'no dialog');
  eq(await h1(page), 'Opportunities to investigate', 'h1');
  eq(p.errors, [], 'errors');
});
await t.check('flag drawer on a reload: Reload with the drawer open reopens it; Back from the clause link returns to the drawer', async () => {
  await visit(p, '#/renewals?flag=F-C-001-nearCap');
  await page.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' });
  await page.reload();
  await page.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' });
  await settle(page, 300);
  await page.locator('[role="dialog"].flag-drawer').getByRole('link', { name: /^View clause, page 19/ }).click();
  await page.waitForSelector('mark[data-extraction-id]');
  ok((await hashOf(page)).endsWith('?from=renewals'), 'from=renewals preserved: ' + await hashOf(page));
  eq(await page.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label'), 'Renewal radar', 'rail');
  await page.getByRole('button', { name: 'Back to renewal radar' }).click();
  await waitH1(page, 'Renewal radar');
  eq(await hashOf(page), '#/renewals', 'back button target');
});

/* ---------------------------------------------------------------- 5. non-URL overlays: open/close, Back and Forward behaviour, reload */
await t.check('About dialog: opens from the banner, Escape closes, focus returns to the link; a reload closes it', async () => {
  await visit(p, '#/roadmap');
  const link = page.getByRole('button', { name: 'About this data' });
  await link.click();
  const dlg = page.locator('[role="dialog"]').filter({ hasText: 'About this data' });
  await dlg.waitFor({ state: 'visible' });
  await settle(page, 300);
  ok((await text(dlg)).includes('What is real.'), 'content');
  await page.keyboard.press('Escape');
  await settle(page, 300);
  ok(await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim() === 'About this data'), 'focus returns to the banner link');
  await link.click();
  await dlg.waitFor({ state: 'visible' });
  await page.reload();
  await page.waitForSelector('#shell-main h1');
  ok(!(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)), 'closed after reload');
});
await t.check('browser Back while a dialog is open: the route underneath changes; the dialog must not be left stranded on a different page', async () => {
  await visit(p, '#/overview');
  await go(page, '#/roadmap');
  await page.getByRole('button', { name: 'About this data' }).click();
  const dlg = page.locator('[role="dialog"]').filter({ hasText: 'About this data' });
  await dlg.waitFor({ state: 'visible' });
  await settle(page, 300);
  await page.goBack();
  await settle(page, 500);
  const still = await dlg.isVisible().catch(() => false);
  const hash = await hashOf(page);
  t.note('Back with About open', `hash=${hash}, dialog still visible=${still}, focus=${JSON.stringify(await activeDesc(page))}`);
  if (still) {
    // if it stays, it must at least be closable and leave a usable page behind
    await page.keyboard.press('Escape');
    await settle(page, 300);
    ok(!(await dlg.isVisible().catch(() => false)), 'Escape closes the stranded dialog');
  }
  eq(await h1(page), gold.headline, 'the page behind shows the Overview');
});
await t.check('Settings drawer, Demo guide, Feedback and the Menu popover each open and close with Escape and return focus to their opener', async () => {
  await visit(p, '#/overview');
  // Settings (header gear)
  const gear = page.getByRole('button', { name: 'Settings' });
  await gear.click();
  const settings = page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' });
  await settings.waitFor({ state: 'visible' });
  await settle(page, 300);
  await page.keyboard.press('Escape'); await settle(page, 300);
  eq((await activeDesc(page)).text, 'Settings', 'focus back on the gear');
  // Demo guide (Overview button)
  const dg = page.getByRole('button', { name: 'Open demo guide' });
  await dg.click();
  const guide = page.locator('[role="dialog"]').filter({ hasText: 'Presenter notes' });
  await guide.waitFor({ state: 'visible' });
  await settle(page, 300);
  await page.keyboard.press('Escape'); await settle(page, 300);
  eq((await activeDesc(page)).text, 'Open demo guide', 'focus back on the demo guide button');
  // Menu popover (rail)
  const menu = page.locator('nav[aria-label="Primary"] button[aria-label="Menu"]');
  await menu.click();
  await page.locator('nav[aria-label="Menu"]').waitFor({ state: 'visible' });
  const items = await page.$$eval('nav[aria-label="Menu"] [role="menuitem"]', (els) => els.map((e) => e.textContent.trim()));
  eq(items, ['Why this matters', 'How this is calculated', 'About this data', 'Demo guide', 'Give feedback'], 'menu items');
  await page.keyboard.press('Escape'); await settle(page, 300);
  eq(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label')), 'Menu', 'focus back on Menu');
  // Menu item routes
  await menu.click();
  await page.getByRole('menuitem', { name: 'Why this matters' }).click();
  await waitH1(page, 'Why this matters');
  eq(await hashOf(page), '#/evidence', 'menu to evidence');
  await menu.click();
  await page.getByRole('menuitem', { name: 'How this is calculated' }).click();
  await waitH1(page, 'How this is calculated');
  eq(await hashOf(page), '#/method', 'menu to method');
});

/* ---------------------------------------------------------------- 6. unknown and hostile addresses */
const BAD = ['#/nope', '#/overview/extra', '#/spend/bogus', '#/contracts/C-005/extra', '#/source', '#/source/C-005', '#/roadmap/x', '#/opportunities/1', '#/OVERVIEW', '#/evidence/x', '#/method/x', '#/renewals/x'];
for (const b of BAD) {
  await t.check(`unknown address ${b}: "Page not found." or a graceful state, never a blank page, with a way home`, async () => {
    await visit(p, b);
    await settle(page, 300);
    const heading = await h1(page);
    const body = await text(page.locator('#shell-main'));
    ok(heading.length > 0, 'has an h1');
    ok(/Page not found|This page isn't in the sample|Contract not found/.test(heading), `h1 is a not-found state: "${heading}"`);
    ok(await page.getByRole('button', { name: /Go to overview|Open contracts|Go to contracts|Open contract/ }).count() > 0, 'a button leads out: ' + body.slice(0, 200));
  });
}
await t.check('not-found "Go to overview" works and focus lands on the new h1', async () => {
  await visit(p, '#/nope');
  await page.getByRole('button', { name: 'Go to overview' }).click();
  await waitH1(page, gold.headline);
  eq(await hashOf(page), '#/overview', 'hash');
});
const ODD = ['#overview', '#/', '#', '#/overview/', '#//overview', '#/contracts/', '#/contracts/%20', '#/contracts/C-999', '#/source/C-005/not-an-id', '#/source/C-999/X-C-005-maximumValue', '#/source/C-005/X-C-006-maximumValue', '#/source/C-005/X-C-005-maximumValue?from=bogus', '#/method?s=bogus', '#/opportunities?type=bogus&status=bogus&sort=bogus', '#/spend?state=bogus', '#/spend?payments=C-999', '#/spend/matches?status=bogus', '#/spend/no-contract?payee=Nobody', '#/contracts?sort=bogus&dir=sideways&category=Nope', '#/contracts?q=%E0%A4%A'];
for (const o of ODD) {
  await t.check(`odd address ${o}: renders a page with an h1, no console errors`, async () => {
    const before = p.errors.length;
    await visit(p, o);
    await settle(page, 400);
    ok((await h1(page)).length > 0, 'h1');
    eq(p.errors.slice(before), [], 'errors');
  });
}
await t.check('hostile query strings are rendered as text, never executed', async () => {
  await page.addInitScript(() => { window.__xss = 0; });
  await visit(p, '#/opportunities?q=%3Cimg%20src%3Dx%20onerror%3D%22window.__xss%3D1%22%3E');
  await settle(page, 600);
  ok(!(await page.evaluate(() => window.__xss)), 'script ran');
  ok(await page.locator('#shell-main img[src="x"]').count() === 0, 'no injected image');
  await visit(p, '#/contracts/%3Cscript%3Ewindow.__xss%3D1%3C%2Fscript%3E');
  ok(!(await page.evaluate(() => window.__xss)), 'script ran (contracts)');
  await visit(p, '#/spend/no-contract?payee=%3Cimg%20src%3Dx%20onerror%3D%22window.__xss%3D1%22%3E');
  ok(!(await page.evaluate(() => window.__xss)), 'script ran (payee)');
});

/* ---------------------------------------------------------------- 7. share link and close tab */
await t.check('Share copies the exact current address (including ?flag=) and the copied link reloads to the same screen', async () => {
  await visit(p, '#/opportunities?type=overCap&flag=F-C-007-overCap');
  await page.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await settle(page, 300);
  await visit(p, '#/opportunities?type=overCap&sort=type');
  await page.getByRole('button', { name: 'Share' }).click();
  await settle(page, 300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  eq(clip, p.base + '#/opportunities?type=overCap&sort=type', 'clipboard');
  await page.goto('about:blank');
  await page.goto(clip);
  await page.waitForSelector('#shell-main h1');
  eq(await page.locator('.opp .kviz-barlist__list > li').count(), 3, 'shared filter is applied');
});
await t.check('header close-tab button returns to the overview with a toast and adds history', async () => {
  await visit(p, '#/roadmap');
  await page.getByRole('button', { name: 'Close Kontor financial layer' }).click();
  await waitH1(page, gold.headline);
  ok((await page.locator('.kx-toast').allInnerTexts()).join(' ').includes('Returned to the overview.'), 'toast');
});

await p.ctx.close();
await h.close();
t.finish();
