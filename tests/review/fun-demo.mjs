// fun-demo: the five-minute demo script (requirements section 10) driven only with real clicks, in dark AND light, with the expected
// on-screen numbers at every step.   node tests/review/fun-demo.mjs        (against dist/; KONTOR_DIST=<dir> to try another build)
// Steps: 0:00 Overview -> 1:00 Renewal radar -> 2:15 Opportunities, first row, View clause -> 3:30 Back, Cap vs spend, No contract
//        -> 4:15 Explained then Reset -> 4:30 close panel, Give feedback -> toggle light and back, default dark on a fresh profile.
import { waitH1, T, ok, eq, norm, text, settle, hashOf, h1, gold, gbp, rail, store, shot, launchApp, visit, go, axe, externalRequests, noOverflow, toasts, activeDesc, contract, extraction } from './fun-lib.mjs';

const t = new T('fun-demo');
const h = await launchApp();
const QUOTE = extraction('X-C-005-maximumValue').provenance[0].quote;

async function runScript(theme) {
  const tag = `[${theme}] `;
  const p = await h.newPage({ theme });
  const { page } = p;
  await visit(p, '');                                                // the empty hash opens the Overview
  const themeAttr = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));

  /* ---------------- 0:00 Overview */
  await t.check(tag + '0:00 empty hash opens the Overview; theme attribute; banner visible; title', async () => {
    eq(await themeAttr(), theme, 'data-theme');
    eq(await page.title(), 'Overview | Kontor financial layer', 'title');
    const b = page.locator('.sample-banner');
    ok(await b.isVisible(), 'banner visible');
    const box = await b.boundingBox();
    ok(box.y >= 0 && box.y + box.height <= 900, 'banner inside the viewport without scrolling: ' + JSON.stringify(box));
    ok((await b.innerText()).includes('Sample data. Marchbank Borough Council'), 'banner text');
  });
  await t.check(tag + '0:00 headline H1, as-at line, caveat with method link, all visible without scrolling at 1440x900', async () => {
    eq(await h1(page), gold.headline, 'h1');
    const body = await text(page.locator('#shell-main'));
    ok(body.includes('Indicative figures. As at 6 October 2026.'), 'as-at line');
    ok(body.includes('Indicative. An opportunity to investigate, not a saving.'), 'caveat');
    const ml = page.locator('#shell-main .page-header a[href^="#/method"]').first();
    ok(await ml.isVisible(), 'method link visible');
    const r = await page.evaluate(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); return { h1: q('#shell-main h1').bottom, sum: q('.ov-sum__eq').bottom, vh: innerHeight }; });
    ok(r.sum < r.vh, 'sum line fully above the fold: ' + JSON.stringify(r));
  });
  await t.check(tag + '0:00 four cards £4.2m / £0.6m / £1.1m / £0.3m with counts, each links to its filtered list; sum line exact', async () => {
    const cards = await page.$$eval('.ov-hero a.kviz-card', (as) => as.map((a) => ({ href: a.getAttribute('href'), text: (a.getAttribute('aria-label') || a.textContent).replace(/\s+/g, ' ').trim() })));
    eq(cards.length, 4, 'card count');
    gold.cards.forEach(([type, val, n], i) => {
      ok(cards[i].href === '#/opportunities?type=' + type, 'card href ' + cards[i].href);
      ok(cards[i].text.includes(val), `card ${type} value ${val}: ${cards[i].text}`);
      ok(new RegExp(`\\b${n} contracts?\\b`).test(cards[i].text), `card ${type} count ${n}: ${cards[i].text}`);
    });
    eq(await text(page.locator('.ov-sum__eq')), gold.sum, 'sum line');
  });
  await t.check(tag + '0:00 radar summary on Overview: 3 / £6.9m, 4 / £7.3m, 2 / £2.2m, needs attention 3; coverage 84%', async () => {
    const radar = await text(page.locator('.ov-radar'));
    ok(/Next 3 months\D*3 contracts\D*£6\.9m a year/.test(radar) || (radar.includes('Next 3 months') && radar.includes('£6.9m')), 'next 3 months: ' + radar);
    ok(radar.includes('£7.3m') && radar.includes('£2.2m'), 'other bands: ' + radar);
    ok(/Needs attention now\D*3|3\D*Needs attention now/i.test(radar), 'needs attention 3: ' + radar);
    const cov = await text(page.locator('.ov-coverage'));
    ok(cov.includes('84%') && cov.includes('£129.4m') && cov.includes('£153.5m'), 'coverage: ' + cov);
  });
  await shot(page, `demo-${theme}-0-overview`);

  /* ---------------- 1:00 Renewal radar via the rail */
  await t.check(tag + '1:00 rail to Renewal radar: hash, h1, aria-current, focus on the h1', async () => {
    await rail(page, 'Renewal radar');
    eq(await hashOf(page), '#/renewals', 'hash');
    eq(await h1(page), 'Renewal radar', 'h1');
    eq(await page.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label'), 'Renewal radar', 'rail current');
    await settle(page, 200);
    eq((await activeDesc(page)).tag, 'H1', 'focus is on the page heading');
  });
  await t.check(tag + '1:00 Needs attention now: 3, FM contract reads "The notice date passed 6 days ago"', async () => {
    const body = await text(page.locator('#shell-main'));
    ok(/Needs attention now/.test(body), 'heading');
    ok(body.includes('The notice date passed 6 days ago'), 'C-001 sentence');
    ok(body.includes('The notice date passed 98 days ago. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier.'), 'C-016 sentence');
    ok(body.includes('This contract ended on 30 April 2026. You have paid £780,000 since.'), 'C-007 sentence');
  });
  await t.check(tag + '1:00 bands: Next 3 months 3 / £6,930,000 a year, 3 to 6 months 4 / £7,250,000, 6 to 12 months 2 / £2,180,000, boundaries 6 Jan 2027, 6 Apr 2027, 6 Oct 2027', async () => {
    const body = await text(page.locator('#shell-main'));
    for (const s of ['£6,930,000 a year', '£7,250,000 a year', '£2,180,000 a year', '6 Jan 2027', '6 Apr 2027', '6 Oct 2027', '31 Oct 2026', '1 Dec 2026', '31 Dec 2026']) ok(body.includes(s), 'missing ' + s);
    ok(/12 contracts have notice dates more than 12 months away and are not on the radar/.test(body), 'footnote');
    ok(await page.locator('#shell-main a[href="#/contracts"]').count() > 0, 'footnote links to the contracts');
  });
  await shot(page, `demo-${theme}-1-renewals`);

  /* ---------------- 2:15 Opportunities, first row, View clause */
  await t.check(tag + '2:15 rail to Opportunities: row 1 is Highways £3,350,000, totals £6,145,238, 19 rows', async () => {
    await rail(page, 'Opportunities');
    eq(await hashOf(page), '#/opportunities', 'hash');
    eq(await h1(page), 'Opportunities to investigate', 'h1');
    const rows = await page.$$eval('.opp .kviz-barlist__list > li', (lis) => lis.map((li) => li.querySelector('.kviz-barlist__val').textContent.trim()));
    eq(rows.length, 19, 'rows');
    eq(rows.slice(0, 6), gold.rankedFirstSix, 'first six values');
    ok((await text(page.locator('.opp-totals__main'))).includes('19 opportunities') && (await text(page.locator('.opp-totals__main'))).includes('£6,145,238'), 'totals bar');
    const first = await text(page.locator('.opp .kviz-barlist__list > li').first());
    ok(first.includes('Highways reactive maintenance and minor works') && first.includes('£3,350,000'), 'row 1: ' + first);
  });
  await t.check(tag + '2:15 click row 1: the flag drawer opens on ?flag=F-C-005-overCap with the breakdown 8,350,000 / 5,000,000 / 3,350,000', async () => {
    await page.locator('.opp .kviz-barlist__list > li').first().locator('.kviz-row__link, .kviz-barlist__name').first().click();
    await page.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' });
    await settle(page, 300);
    eq(await hashOf(page), '#/opportunities?flag=F-C-005-overCap', 'hash');
    const d = await text(page.locator('[role="dialog"].flag-drawer'));
    for (const s of ['£8,350,000', '£5,000,000', '£3,350,000', 'View clause, page 23', 'Reasons this may not be a saving']) ok(d.includes(s), 'drawer missing ' + s);
  });
  await shot(page, `demo-${theme}-2-drawer`);
  await t.check(tag + '2:15 View clause, page 23 lands on the source viewer: Clause 14.3, page 23 of 70, exact quote highlighted and focused', async () => {
    await page.locator('[role="dialog"].flag-drawer').getByRole('link', { name: /View clause, page 23/ }).click();
    await page.waitForSelector('mark[data-extraction-id]');
    await settle(page, 400);
    eq(await hashOf(page), '#/source/C-005/X-C-005-maximumValue?from=opportunities', 'hash');
    eq(await h1(page), 'Clause 14.3', 'h1');
    eq(await page.title(), 'Clause 14.3 | Kontor financial layer', 'title');
    const mark = page.locator('mark[data-extraction-id]');
    eq(await mark.count(), 1, 'one mark');
    eq(await mark.innerText(), QUOTE, 'mark text equals the quote');
    ok((await text(page.locator('[data-testid="source-page-of"]'))) === '23 of 70', 'page of');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'MARK'), 'the mark has focus');
    const inView = await mark.evaluate((m) => { const r = m.getBoundingClientRect(); const main = document.getElementById('shell-main').getBoundingClientRect(); return r.top >= main.top && r.bottom <= main.bottom; });
    ok(inView, 'the cited clause is inside the visible area');
    ok((await text(page.locator('#shell-main'))).includes('Illustrative contract text written for this demo, not a real document.'), 'illustrative label');
    eq(await page.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label'), 'Opportunities', 'rail keeps Opportunities');
    ok((await text(page.locator('[data-testid="source-document"]'))) === 'Highways reactive maintenance and minor works: agreement', 'document title');
  });
  await shot(page, `demo-${theme}-3-source`);

  /* ---------------- 3:30 Back, Cap vs spend, No contract */
  await t.check(tag + '3:30 browser Back returns to Opportunities (drawer reopens on its flag) and Forward returns to the clause', async () => {
    await page.goBack();
    await page.waitForFunction(() => location.hash.startsWith('#/opportunities'), null, { timeout: 5000 });
    await settle(page, 400);
    eq(await hashOf(page), '#/opportunities?flag=F-C-005-overCap', 'hash after Back');
    ok(await page.locator('[role="dialog"].flag-drawer').isVisible(), 'drawer visible again');
    await page.goForward();
    await page.waitForSelector('mark[data-extraction-id]');
    eq(await hashOf(page), '#/source/C-005/X-C-005-maximumValue?from=opportunities', 'hash after Forward');
    await page.goBack();
    await page.waitForSelector('[role="dialog"].flag-drawer');
    await page.keyboard.press('Escape');
    await settle(page, 300);
    eq(await hashOf(page), '#/opportunities', 'Escape closes the drawer and removes the param');
  });
  await t.check(tag + '3:30 Source "Back to opportunity" button goes to the Opportunities list', async () => {
    await page.goto(p.base + '#/source/C-005/X-C-005-maximumValue?from=opportunities');
    await page.waitForSelector('mark[data-extraction-id]');
    await page.getByRole('button', { name: 'Back to opportunity' }).click();
    await page.waitForFunction(() => location.hash === '#/opportunities');
    await page.waitForFunction(() => document.querySelector('#shell-main h1') && document.querySelector('#shell-main h1').textContent === 'Opportunities to investigate', null, { timeout: 5000 });
    eq(await h1(page), 'Opportunities to investigate', 'h1');
  });
  await t.check(tag + '3:30 rail to Cap vs spend: C-005 167.0% Over cap £3,350,000 first; six golden rows in order; tabs', async () => {
    await rail(page, 'Cap vs spend');
    eq(await hashOf(page), '#/spend', 'hash');
    eq(await h1(page), 'Cap vs spend', 'h1');
    const rows = await page.$$eval('.cap-panel .kviz-bl__list > li', (lis) => lis.slice(0, 6).map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
    ok(/Highways reactive maintenance/.test(rows[0]) && rows[0].includes('167.0%') && rows[0].includes('Over cap') && rows[0].includes('£3,350,000 over'), 'row 1: ' + rows[0]);
    ['C-007', 'C-011', 'C-001', 'C-017', 'C-009'].forEach((id, i) => ok(rows[i + 1].includes(contract(id).title), `row ${i + 2} should be ${id}: ${rows[i + 1]}`));
    const tiles = await text(page.locator('.cap-tiles'));
    ok(tiles.includes('Over cap 3') && tiles.includes('Close to cap 3') && tiles.includes('Within cap 18') && tiles.includes('£4,172,000'), 'tiles: ' + tiles);
  });
  await shot(page, `demo-${theme}-4-spend`);
  await t.check(tag + '3:30 "No contract on the register" tab: 8 payees £23,830,000, Dunmoor £9,300,000 first, no clause links', async () => {
    await page.getByRole('link', { name: 'No contract on the register' }).click();
    await page.waitForFunction(() => location.hash === '#/spend/no-contract');
    await settle(page, 200);
    const body = await text(page.locator('#shell-main'));
    ok(body.includes('8 payees, £23,830,000 paid, no contract on the register.'), 'intro');
    ok(body.includes('84%') && body.includes('£129,359,000'), 'coverage block');
    const names = await page.$$eval('.noc-list li, .kviz-cov li, [data-payee]', (els) => els.map((e) => e.textContent));
    const order = gold.noContract.map((n) => body.indexOf(n));
    ok(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), 'payees in golden order: ' + JSON.stringify(order));
    ok(!/View clause/.test(body), 'no clause link on this tab');
  });
  await shot(page, `demo-${theme}-5-noc`);

  /* ---------------- 4:15 optional: Explained and reset */
  await t.check(tag + '4:15 mark the highways flag Explained: headline £2.8m, "£3,350,000 excluded after your review", toast; Opportunities totals agree', async () => {
    await go(page, '#/opportunities?flag=F-C-005-overCap');
    await page.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' });
    await settle(page, 300);
    await page.locator('[role="dialog"].flag-drawer select').selectOption('explained');
    await settle(page, 300);
    const tt = (await toasts(page)).join(' | ');
    ok(/marked Explained/.test(tt) && tt.includes('£2.8m'), 'toast: ' + tt);
    await page.keyboard.press('Escape');
    await settle(page, 300);
    ok((await text(page.locator('.opp-totals'))).includes('£2,795,238'), 'totals bar: ' + await text(page.locator('.opp-totals')));
    await rail(page, 'Overview');
    eq(await h1(page), '£2.8m across 15 contracts flagged as opportunities to investigate', 'headline');
    ok((await text(page.locator('.ov-sum'))).includes('£3,350,000 excluded after your review'), 'excluded note: ' + await text(page.locator('.ov-sum')));
    const cards = await page.$$eval('.ov-hero a.kviz-card', (as) => as.map((a) => a.textContent.replace(/\s+/g, ' ').trim()));
    ok(cards[0].includes('£0.8m') && cards[0].includes('2 contracts'), 'over cap card after review: ' + cards[0]);
  });
  await shot(page, `demo-${theme}-6-explained`);
  await t.check(tag + '4:15 reset via Settings, confirm dialog (Cancel focused), toast, headline back to £6.1m', async () => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('[role="dialog"]').filter({ hasText: 'Settings' }).first().waitFor({ state: 'visible' });
    await settle(page, 300);
    await page.getByRole('button', { name: 'Reset demo changes' }).click();
    const alert = page.getByRole('alertdialog');
    await alert.waitFor({ state: 'visible' });
    await settle(page, 300);
    ok((await activeDesc(page)).text === 'Cancel', 'Cancel is focused: ' + JSON.stringify(await activeDesc(page)));
    // nothing is cleared before the confirm
    ok((await store(page))['kontor-triage'] !== null, 'triage still stored while the dialog is open');
    await alert.getByRole('button', { name: 'Reset changes' }).click();
    await settle(page, 400);
    ok((await toasts(page)).some((x) => x.includes('Changes reset.') && x.includes('starting numbers')), 'reset toast: ' + (await toasts(page)).join(' | '));
    eq((await store(page))['kontor-triage'], null, 'triage cleared');
    eq((await store(page))['kontor-theme'], theme, 'theme kept');
    await page.keyboard.press('Escape');                              // close the Settings drawer
    await settle(page, 300);
    eq(await h1(page), gold.headline, 'headline restored');
  });

  /* ---------------- 4:30 close panel */
  await t.check(tag + '4:30 close panel: exact close line and Give feedback opens the dialog; save with Yes toasts and closes', async () => {
    const close = page.locator('.ov-close');
    await close.scrollIntoViewIfNeeded();
    ok((await text(close)).includes("This is one council's contracts and spend. Imagine your full estate."), 'close line: ' + await text(close));
    await close.getByRole('button', { name: 'Give feedback' }).click();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Tell us what you think' });
    await dlg.waitFor({ state: 'visible' });
    await settle(page, 300);
    await dlg.getByRole('button', { name: 'Save feedback' }).click();                     // nothing chosen yet
    ok((await text(dlg)).includes("Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again."), 'no-choice error');
    await dlg.getByLabel('Yes').check();
    await dlg.getByRole('textbox').fill('Would use it on our estate.');
    await dlg.getByRole('button', { name: 'Save feedback' }).click();
    await settle(page, 400);
    ok((await toasts(page)).some((x) => x.includes('Feedback saved on this device. Thank you.')), 'toast: ' + (await toasts(page)).join(' | '));
    ok(!(await page.locator('[role="dialog"]').filter({ hasText: 'Tell us what you think' }).isVisible().catch(() => false)), 'dialog closed');
    ok((await store(page))['kontor-feedback'].includes('Would use it'), 'feedback stored');
  });
  await t.check(tag + '4:30 "See what comes next" goes to the Roadmap', async () => {
    await go(page, '#/overview');
    await page.locator('.ov-close').getByRole('button', { name: 'See what comes next' }).click();
    await page.waitForFunction(() => location.hash === '#/roadmap');
    await waitH1(page, 'Roadmap');
    eq(await h1(page), 'Roadmap', 'h1');
  });

  /* ---------------- theme toggle and persistence */
  await t.check(tag + 'any: header toggle switches theme, persists across reload, toggles back', async () => {
    const other = theme === 'dark' ? 'light' : 'dark';
    await page.locator('.shell__header button[aria-pressed]').first().click();
    await settle(page, 200);
    eq(await themeAttr(), other, 'after click');
    eq((await store(page))['kontor-theme'], other, 'stored');
    await page.reload();
    await page.waitForSelector('#shell-main h1');
    eq(await themeAttr(), other, 'after reload');
    await shot(page, `demo-${theme}-7-toggled-${other}`);
    await page.locator('.shell__header button[aria-pressed]').first().click();
    await settle(page, 200);
    eq(await themeAttr(), theme, 'toggled back');
  });
  await t.check(tag + 'no console errors, no requests off origin during the whole script', async () => {
    eq(p.errors, [], 'console/page errors');
    eq(externalRequests(p).map((r) => r.url), [], 'external requests');
  });
  await p.ctx.close();
}

await runScript('dark');
await runScript('light');

/* ---------------- default dark on a fresh profile */
await t.check('fresh profile (nothing stored) opens in dark, on the Overview, and reload keeps it', async () => {
  const p = await h.newPage({ theme: null });
  await visit(p, '');
  eq(await p.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'first load');
  ok((await store(p.page))['kontor-theme'] === null || (await store(p.page))['kontor-theme'] === 'dark', 'nothing forced into storage');
  await p.page.reload();
  await p.page.waitForSelector('#shell-main h1');
  eq(await p.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'after reload');
  eq(p.errors, [], 'errors');
  await p.ctx.close();
});

await h.close();
t.finish();
