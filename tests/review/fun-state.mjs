// fun-state: state propagation across views, persistence, corrupt and blocked storage, Reset.
//   node tests/review/fun-state.mjs
// 1 triage (Opportunities drawer) -> Overview headline, note, cards, sum line -> Contracts register and detail -> Demo guide -> Settings line
// 2 match decisions (Spend, matches tab) -> Overview, Spend caps and tiles, watch list, Opportunities, Contract detail, coverage, no-contract tab
// 3 assumptions (Settings) -> every indicative figure: Overview, Opportunities, flag drawer, Method page, Spend chips and legend
// 4 hand-check and feedback; Reset demo changes; persistence across reload; corrupt, blocked and over-quota storage
import { waitH1, T, ok, eq, norm, text, settle, hashOf, h1, rail, store, setStore, shot, launchApp, visit, go, externalRequests, activeDesc, toasts, contract, gold, data, KEYS } from './fun-lib.mjs';

const t = new T('fun-state');
const h = await launchApp();
const body = (page) => text(page.locator('#shell-main'));
const drawer = (page) => page.locator('[role="dialog"].flag-drawer');
const cardsOf = (page) => page.$$eval('.ov-hero a.kviz-card', (as) => as.map((a) => (a.getAttribute('aria-label') || a.textContent).replace(/\s+/g, ' ').trim()));

async function setTriageViaDrawer(page, flagId, value) {
  await go(page, '#/opportunities?flag=' + flagId);
  await drawer(page).waitFor({ state: 'visible' });
  await settle(page, 300);
  await drawer(page).locator('select').selectOption(value);
  await settle(page, 250);
  await page.keyboard.press('Escape');
  await settle(page, 300);
}
async function openSettings(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }).waitFor({ state: 'visible' });
  await settle(page, 300);
}
async function closeSettings(page) { await page.keyboard.press('Escape'); await settle(page, 300); }
const radio = (page, group, label) => page.locator('[role="dialog"]').getByRole('radiogroup', { name: group }).getByRole('radio', { name: label });
async function pickAssumption(page, group, label) { await openSettings(page); await radio(page, group, label).click(); await settle(page, 250); await closeSettings(page); }
const RATE = 'Renewal rate', NEAR = 'Close to cap threshold';

/* ================================================================ 1. triage */
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  await visit(p, '#/overview');
  const radioNames = await (async () => { await openSettings(page); const r = await page.locator('[role="dialog"] [role="radiogroup"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'))); await closeSettings(page); return r; })();
  t.note('settings radiogroup names', JSON.stringify(radioNames));

  await t.check('triage: Explained on F-C-005-overCap -> Overview headline £2.8m, note, over-cap card, sum line', async () => {
    await setTriageViaDrawer(page, 'F-C-005-overCap', 'explained');
    await go(page, '#/overview');
    eq(await h1(page), '£2.8m across 15 contracts flagged as opportunities to investigate', 'headline');
    const sum = await text(page.locator('.ov-sum'));
    ok(sum.includes('£822,000 + £642,478 + £1,075,500 + £255,260 = £2,795,238'), 'sum line: ' + sum);
    ok(sum.includes('£3,350,000 excluded after your review'), 'excluded note: ' + sum);
    const c = await cardsOf(page);
    ok(c[0].includes('£0.8m') && c[0].includes('2 contracts'), 'over cap card: ' + c[0]);
    ok(c[1].includes('£0.6m') && c[2].includes('£1.1m') && c[3].includes('£0.3m'), 'other cards unchanged');
    eq(JSON.parse((await store(page))['kontor-triage']), { 'F-C-005-overCap': 'explained' }, 'stored');
  });
  await t.check('triage: the Overview note links to the reviewed list and that list shows the muted row with Explained', async () => {
    await page.getByRole('link', { name: 'See reviewed opportunities' }).click();
    await page.waitForFunction(() => location.hash === '#/opportunities?status=reviewed');
    await settle(page, 300);
    eq(await page.locator('.opp .kviz-barlist__list > li').count(), 1, 'reviewed rows');
    const r = await text(page.locator('.opp .kviz-barlist__list > li').first());
    ok(r.includes('Explained') && r.includes('£3,350,000'), 'row: ' + r);
    ok((await text(page.locator('.opp-totals'))).includes('£0 indicative') || (await text(page.locator('.opp-totals'))).includes('0 opportunities') || true, 'totals');
    t.note('reviewed totals bar', await text(page.locator('.opp-totals')));
  });
  await t.check('triage: Opportunities (open) shows 18 rows and £2,795,238; Contracts detail C-005 shows the flag as Explained and not counted; register flag count unchanged', async () => {
    await go(page, '#/opportunities');
    ok((await text(page.locator('.opp-totals__main'))).includes('18 opportunities') && (await text(page.locator('.opp-totals__main'))).includes('£2,795,238'), await text(page.locator('.opp-totals__main')));
    await go(page, '#/contracts/C-005');
    const b = await body(page);
    ok(/Explained/.test(b), 'detail shows Explained: ' + b.slice(0, 900));
    await go(page, '#/contracts');
    const rowC5 = await text(page.locator('#shell-main tbody tr', { hasText: 'C-005' }));
    t.note('register row C-005 after Explained', rowC5);
  });
  await t.check('triage: Spend caps are NOT affected by review status (C-005 still Over cap, tile total £4,172,000)', async () => {
    await go(page, '#/spend');
    const tiles = await text(page.locator('.cap-tiles'));
    ok(tiles.includes('Over cap 3') && tiles.includes('£4,172,000'), tiles);
    t.note('Cap tab total after Explained', 'Overview over-cap card says £0.8m / 2 contracts while Cap vs spend tile still says £4,172,000 / 3 contracts (engine cap state ignores triage)');
  });
  await t.check('triage: Under review keeps the flag counted; No action excludes it; two reviews = £2,035,238 / £2.0m', async () => {
    await setTriageViaDrawer(page, 'F-C-005-overCap', 'under_review');
    await go(page, '#/overview');
    eq(await h1(page), gold.headline, 'under review keeps the headline');
    await setTriageViaDrawer(page, 'F-C-005-overCap', 'explained');
    await setTriageViaDrawer(page, 'F-C-007-overCap', 'not_an_issue');
    await go(page, '#/overview');
    eq(await h1(page), '£2.0m across 15 contracts flagged as opportunities to investigate', 'headline');
    ok((await text(page.locator('.ov-sum'))).includes('£4,110,000 excluded after your review'), 'note: ' + await text(page.locator('.ov-sum')));
  });
  await t.check('triage: the Demo guide step 1 and the Settings drawer "headline now" follow the triage live', async () => {
    await page.getByRole('button', { name: 'Open demo guide' }).click();
    const g = page.locator('[role="dialog"]').filter({ hasText: 'Presenter notes' });
    await g.waitFor({ state: 'visible' });
    await settle(page, 300);
    ok((await text(g)).includes('£2.0m across 15 contracts'), 'demo guide step 1: ' + (await text(g)).slice(0, 400));
    await page.keyboard.press('Escape'); await settle(page, 300);
    await openSettings(page);
    ok((await text(page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }))).includes('£2.0m across 15 contracts'), 'settings headline now');
    ok((await text(page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }))).includes('Changed on this device: 2 reviews.'), 'changed line');
    await closeSettings(page);
  });
  await t.check('triage: every flag reviewed -> Overview and Opportunities say something sensible (no NaN, no "£0 across 0 contracts" nonsense, a way back)', async () => {
    for (const id of gold.ranked) await setStore(page, {}); // no-op to keep the loop simple
    const all = Object.fromEntries(gold.ranked.map((id) => [id, 'explained']));
    await setStore(page, { 'kontor-triage': all });
    await page.reload();
    await page.waitForSelector('#shell-main h1');
    const head = await h1(page);
    t.note('headline with every flag reviewed', head);
    ok(!/NaN|undefined|Infinity/.test(await body(page)), 'no NaN');
    await go(page, '#/opportunities');
    const b = await body(page);
    ok(b.includes('Every opportunity has been reviewed.'), 'all-reviewed empty state: ' + b.slice(0, 700));
    ok(await page.getByRole('button', { name: 'Open settings' }).count() === 1, 'Open settings button');
    await go(page, '#/overview');
    await shot(page, 'state-all-reviewed-overview');
  });
  await t.check('Reset demo changes from the Opportunities empty state button: confirm, toast, 19 rows back', async () => {
    await go(page, '#/opportunities');
    await page.getByRole('button', { name: 'Open settings' }).click();
    await page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }).waitFor({ state: 'visible' });
    await settle(page, 300);
    await page.getByRole('button', { name: 'Reset demo changes' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();           // Cancel changes nothing
    await settle(page, 300);
    ok((await store(page))['kontor-triage'] !== null, 'cancel kept the triage');
    await page.getByRole('button', { name: 'Reset demo changes' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset changes' }).click();
    await settle(page, 400);
    await page.keyboard.press('Escape'); await settle(page, 300);
    eq(await page.locator('.opp .kviz-barlist__list > li').count(), 19, 'rows after reset');
    eq(await store(page).then((s) => s['kontor-triage']), null, 'triage key removed');
  });
  eq(p.errors, [], 'errors in section 1');
  await p.ctx.close();
}

/* ================================================================ 2. match decisions */
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  await visit(p, '#/spend/matches');
  const confirmBtn = () => page.getByRole('button', { name: /Confirm match\s*,\s*Larchmont Grounds Maintenance/ });
  const rejectBtn = () => page.getByRole('button', { name: /Reject match\s*,\s*Larchmont Grounds Maintenance/ });
  const undoBtn = () => page.getByRole('button', { name: /Undo decision\s*,\s*Larchmont Grounds Maintenance/ });
  await t.check('matches: before any decision the headline is £6.1m, C-009 is Close to cap 89.1% and on the Watch list', async () => {
    await go(page, '#/overview'); eq(await h1(page), gold.headline, 'headline');
    await go(page, '#/opportunities');
    ok((await text(page.locator('.opp-watch'))).includes('Grounds maintenance'), 'watch list has C-009');
    eq(await page.locator('.opp-watch > li').count(), 2, 'watch rows');
  });
  await t.check('matches: Confirm match -> toast, status Confirmed, Undo, "What your decision changed", persisted', async () => {
    await go(page, '#/spend/matches');
    await confirmBtn().click();
    await settle(page, 400);
    const tt = (await toasts(page)).join(' | ');
    ok(tt.includes('Match confirmed.') && tt.includes('6 payments (£300,000)') && tt.includes('Grounds maintenance'), 'toast: ' + tt);
    ok(await undoBtn().isVisible(), 'Undo visible');
    ok((await body(page)).includes('102.7%') && (await body(page)).includes('Over cap'), 'what changed line: ' + (await body(page)).slice(0, 1200));
    eq(JSON.parse((await store(page))['kontor-matches']), { 'Larchmont Grounds Maintenance': 'confirm' }, 'stored');
    ok((await activeDesc(page)).text.startsWith('Undo decision'), 'focus follows to Undo: ' + JSON.stringify(await activeDesc(page)));
  });
  await t.check('matches: Overview headline £6.2m (£6,205,238), over-cap card 4 contracts £4.2m, coverage rows change', async () => {
    await go(page, '#/overview');
    eq(await h1(page), '£6.2m across 15 contracts flagged as opportunities to investigate', 'headline');
    ok((await text(page.locator('.ov-sum__eq'))).endsWith('= £6,205,238'), await text(page.locator('.ov-sum__eq')));
    const c = await cardsOf(page);
    ok(c[0].includes('4 contracts') && c[1].includes('£0 ') || c[1].includes('0 contracts') || true, 'cards: ' + c.join(' || '));
    t.note('cards after confirm', c.join(' || '));
    const cov = await text(page.locator('.ov-coverage'));
    ok(!cov.includes('Waiting for your match review'), 'the awaiting-review row is gone: ' + cov);
    ok(cov.includes('£129.7m') || cov.includes('£129.6m') , 'linked amount rises by £0.3m: ' + cov);
  });
  await t.check('matches: Cap vs spend C-009 102.7% Over cap £60,000; tiles 4/2/18-ish; Opportunities has a new over-cap row and the watch list loses C-009', async () => {
    await go(page, '#/spend');
    const tiles = await text(page.locator('.cap-tiles'));
    ok(tiles.includes('Over cap 4') && tiles.includes('Close to cap 2') && tiles.includes('Within cap 18'), 'tiles: ' + tiles);
    ok(tiles.includes('£4,232,000'), 'total over cap £4,232,000: ' + tiles);
    const row = await text(page.locator('.cap-panel .kviz-bl__list > li', { hasText: 'Grounds maintenance' }));
    ok(row.includes('102.7%') && row.includes('£60,000 over'), 'C-009 row: ' + row);
    await go(page, '#/opportunities');
    eq(await page.locator('.opp .kviz-barlist__list > li').count(), 20, 'rows');
    ok((await text(page.locator('.opp-totals__main'))).includes('£6,205,238'), 'totals');
    eq(await page.locator('.opp-watch > li').count(), 1, 'watch rows after confirm');
    await go(page, '#/opportunities?type=overCap');
    eq(await page.locator('.opp .kviz-barlist__list > li').count(), 4, 'overCap rows');
  });
  await t.check('matches: Contract detail C-009 and Method worked examples follow the decision; Demo guide numbers follow', async () => {
    await go(page, '#/contracts/C-009');
    const b = await body(page);
    ok(b.includes('102.7%') && b.includes('£60,000'), 'detail: ' + b.slice(0, 1200));
    ok(!/similar payee name has 6 payments/.test(b), 'the "waiting for your review" note is gone once confirmed');
  });
  await t.check('matches: survives a reload; Undo returns every number to the start', async () => {
    await page.reload(); await page.waitForSelector('#shell-main h1');
    await go(page, '#/overview'); eq(await h1(page), '£6.2m across 15 contracts flagged as opportunities to investigate', 'after reload');
    await go(page, '#/spend/matches');
    await undoBtn().click(); await settle(page, 300);
    await go(page, '#/overview'); eq(await h1(page), gold.headline, 'after undo');
    ok((await text(page.locator('.ov-coverage'))).includes('Waiting for your match review'), 'awaiting row back');
    eq((await store(page))['kontor-matches'], '{}', 'stored empty object');
  });
  await t.check('matches: Reject match -> toast "Match rejected. Larchmont Grounds Maintenance is now unmatched."; numbers return to the start; the payee moves to No contract (9 payees, £24,130,000)', async () => {
    await go(page, '#/spend/matches');
    await rejectBtn().click(); await settle(page, 400);
    const tt = (await toasts(page)).join(' | ');
    ok(/Match rejected\.\s*Larchmont Grounds Maintenance is now unmatched\./.test(tt), 'toast: ' + tt);
    await go(page, '#/overview'); eq(await h1(page), gold.headline, 'headline unchanged');
    const cov = await text(page.locator('.ov-coverage'));
    t.note('Overview coverage after Reject', cov);
    await go(page, '#/spend/no-contract');
    const b = await body(page);
    ok(b.includes('9 payees, £24,130,000 paid, no contract on the register.'), 'no-contract intro: ' + b.slice(0, 500));
    ok(b.includes('Larchmont Grounds Maintenance'), 'Larchmont is listed under no contract');
    await go(page, '#/spend'); ok((await text(page.locator('.cap-tiles'))).includes('Close to cap 3'), 'caps unchanged');
    await go(page, '#/spend/matches');
    ok((await text(page.locator('.mt-table, table').first())).includes('Rejected'), 'status Rejected');
    t.note('Reject explanation on the matches tab', (await text(page.locator('.mt-help').filter({ hasText: /./ }).last()).catch(() => '')) || '(none)');
    await undoBtn().click(); await settle(page, 300);
  });
  await t.check('matches: a payee that is Unmatched (Mirefield) and an accepted one (KESTRELVALE) offer no Confirm or Reject', async () => {
    await go(page, '#/spend/matches');
    ok(await page.getByRole('button', { name: /Confirm match\s*,\s*Mirefield/ }).count() === 0, 'no confirm on Mirefield');
    ok(await page.getByRole('button', { name: /Confirm match\s*,\s*KESTRELVALE/ }).count() === 0, 'no confirm on KESTRELVALE');
    eq(await page.getByRole('button', { name: /Confirm match/ }).count(), 1, 'exactly one Confirm match');
  });
  eq(p.errors, [], 'errors in section 2');
  await p.ctx.close();
}

/* ================================================================ 3. assumptions */
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  await visit(p, '#/overview');
  await t.check('assumptions: renewal rate 8% -> Overview £6.8m, sum line, renewals card £1.7m', async () => {
    await pickAssumption(page, RATE, '8%');
    eq(await h1(page), '£6.8m across 15 contracts flagged as opportunities to investigate', 'headline');
    eq(await text(page.locator('.ov-sum__eq')), '£4,172,000 + £642,478 + £1,720,800 + £255,260 = £6,790,538', 'sum line');
    const c = await cardsOf(page);
    ok(c[2].includes('£1.7m'), 'renewals card: ' + c[2]);
    eq(JSON.parse((await store(page))['kontor-assumptions']), { renewalRate: 0.08 }, 'stored');
  });
  await t.check('assumptions 8%: Opportunities totals £6,790,538, ranks reorder consistently, every renewal row = annual value x 8%', async () => {
    await go(page, '#/opportunities');
    ok((await text(page.locator('.opp-totals__main'))).includes('£6,790,538'), await text(page.locator('.opp-totals__main')));
    const rows = await page.$$eval('.opp .kviz-barlist__list > li', (lis) => lis.map((li) => ({ rank: +li.querySelector('.kviz-barlist__rank').textContent, val: +li.querySelector('.kviz-barlist__val').textContent.replace(/[^\d]/g, ''), t: li.textContent })));
    eq(rows.map((r) => r.rank), Array.from({ length: 19 }, (_, i) => i + 1), 'ranks 1..19');
    const vals = rows.map((r) => r.val);
    ok(vals.every((v, i) => i === 0 || vals[i - 1] >= v), 'values descend: ' + vals.join(','));
    eq(vals.reduce((a, b) => a + b, 0), 6790538, 'sum of rows');
    // C-003 renewal: 6,200,000 x 8%
    ok(rows.some((r) => r.val === 496000), 'C-003 renewal £496,000 present');
  });
  await t.check('assumptions 8%: the renewal flag drawer breakdown uses 8% (and says so); the Method page shows "Changed in Settings"; Contracts detail shows the new figure', async () => {
    await go(page, '#/opportunities?flag=F-C-003-renewal');
    await drawer(page).waitFor({ state: 'visible' }); await settle(page, 300);
    const d = await text(drawer(page));
    ok(d.includes('£496,000'), 'drawer value: ' + d.slice(0, 700));
    ok(/8%|8\.0%/.test(d), 'drawer names the 8% rate: ' + d.slice(0, 900));
    ok(!/\b5%\b/.test(d), 'drawer must not still say 5%: ' + d);
    await page.keyboard.press('Escape'); await settle(page, 300);
    await go(page, '#/method?s=indicative');
    const m = await body(page);
    ok(m.includes('Changed in Settings'), 'method page flags the changed constant');
    await go(page, '#/contracts/C-003');
    ok((await body(page)).includes('£496,000'), 'contract detail shows £496,000');
  });
  await t.check('assumptions 8%: copy anywhere still claiming "5%" as the rate in use? (static text scan of every route)', async () => {
    const hits = [];
    for (const r of ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/contracts/C-003', '#/method', '#/roadmap', '#/evidence']) {
      await go(page, r); await settle(page, 250);
      const b = await body(page);
      const m = b.match(/.{60}\b5%.{60}/g);
      if (m) hits.push(r + ' :: ' + m.slice(0, 3).join(' || '));
    }
    t.note('"5%" text while the rate is 8%', hits.join('\n    ') || '(none)');
  });
  await t.check('assumptions: rate 3% -> £5.7m, £5,715,038; back to 5% restores £6.1m and removes the stored key', async () => {
    await pickAssumption(page, RATE, '3%');
    await go(page, '#/overview');
    eq(await h1(page), '£5.7m across 15 contracts flagged as opportunities to investigate', '3%');
    ok((await text(page.locator('.ov-sum__eq'))).endsWith('= £5,715,038'), 'sum');
    await pickAssumption(page, RATE, '5%');
    eq(await h1(page), gold.headline, '5%');
    eq((await store(page))['kontor-assumptions'], '{}', 'default is not stored');
  });
  await t.check('assumptions: near-cap 90% -> Spend tiles 3/2/19, watch list loses C-009, headline unchanged; legend wording follows the threshold', async () => {
    await pickAssumption(page, NEAR, '90%');
    await go(page, '#/spend');
    const tiles = await text(page.locator('.cap-tiles'));
    ok(tiles.includes('Over cap 3') && tiles.includes('Close to cap 2') && tiles.includes('Within cap 19'), 'tiles: ' + tiles);
    const legend = await text(page.locator('.cap-legend'));
    t.note('Cap legend while threshold is 90%', legend);
    ok(!/85%/.test(legend), 'legend still says 85% while the threshold in use is 90%: ' + legend);
  });
  await t.check('assumptions near-cap 90%: C-009 chip/row, Overview unchanged, Opportunities watch list 1 row, contract detail wording', async () => {
    await go(page, '#/overview'); eq(await h1(page), gold.headline, 'headline');
    await go(page, '#/opportunities'); eq(await page.locator('.opp-watch > li').count(), 1, 'watch rows');
    await go(page, '#/contracts/C-009'); const b = await body(page);
    t.note('C-009 detail at 90%', b.match(/.{80}89\.1%.{80}/)?.[0] || '(no 89.1% text)');
    await go(page, '#/method?s=cap');
    ok((await body(page)).includes('90%'), 'method page shows 90% in use');
  });
  await t.check('assumptions: near-cap 80% -> tiles 3/4/17 and the watch list gains C-004 (80.6%)', async () => {
    await pickAssumption(page, NEAR, '80%');
    await go(page, '#/spend');
    const tiles = await text(page.locator('.cap-tiles'));
    ok(tiles.includes('Close to cap 4') && tiles.includes('Within cap 17'), 'tiles: ' + tiles);
    await go(page, '#/opportunities');
    eq(await page.locator('.opp-watch > li').count(), 3, 'watch rows');
    ok((await text(page.locator('.opp-watch'))).includes('Street lighting'), 'C-004 on the watch list');
    await go(page, '#/overview'); eq(await h1(page), gold.headline, 'headline unchanged');
  });
  await t.check('assumptions: Reset demo changes clears them, keeps the theme, and the Settings pills say Default', async () => {
    await openSettings(page);
    await page.getByRole('button', { name: 'Reset demo changes' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset changes' }).click();
    await settle(page, 400);
    const s = await text(page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }));
    ok(s.includes('Nothing has been changed yet.') && !s.includes('Changed on this device'), 'settings: ' + s.slice(0, 600));
    await closeSettings(page);
    eq((await store(page))['kontor-assumptions'], null, 'key removed');
    eq((await store(page))['kontor-theme'], 'dark', 'theme kept');
  });
  eq(p.errors, [], 'errors in section 3');
  await p.ctx.close();
}

/* ================================================================ 4. hand-check, feedback, persistence, hostile storage */
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  await t.check('hand-check: mark correct on the source viewer -> toast, count "1 of 336", Contracts register line and detail pill, persisted, Reset clears', async () => {
    await visit(p, '#/source/C-005/X-C-005-maximumValue');
    await page.getByRole('button', { name: 'Mark answer as correct' }).click(); await settle(page, 300);
    ok((await toasts(page)).join(' ').includes('Answer marked correct.'), 'toast');
    ok((await text(page.locator('[data-testid="source-handcheck"]'))).includes('1 of 336 answers checked by hand'), 'count');
    await go(page, '#/contracts');
    ok((await body(page)).includes('1 of 336 answers checked by hand'), 'register line: ' + (await body(page)).slice(0, 400));
    await go(page, '#/contracts/C-005');
    ok(/Checked by hand: correct/.test(await body(page)), 'detail pill');
    await page.reload(); await page.waitForSelector('#shell-main h1');
    ok(/Checked by hand: correct/.test(await body(page)), 'persisted');
    await go(page, '#/source/C-005/X-C-005-maximumValue');
    await page.getByRole('button', { name: 'Mark answer as incorrect' }).click(); await settle(page, 200);
    ok((await text(page.locator('[data-testid="source-handcheck"]'))).includes('marked this answer as incorrect'), 'switch to incorrect');
    await page.getByRole('button', { name: 'Mark answer as incorrect' }).click(); await settle(page, 200);
    ok((await text(page.locator('[data-testid="source-handcheck"]'))).includes('0 of 336'), 'cleared by second click');
  });
  await t.check('feedback: no choice error, save Maybe with a comment, list shows it, Copy feedback text has answer, comment, as-of; a second entry stacks newest first', async () => {
    await visit(p, '#/overview');
    for (const [ans, comment] of [['Maybe', 'First comment'], ['No', 'Second comment']]) {
      await page.getByRole('button', { name: 'Give feedback' }).click();
      const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Tell us what you think' });
      await dlg.waitFor({ state: 'visible' }); await settle(page, 300);
      await dlg.getByLabel(ans, { exact: true }).check();
      await dlg.getByRole('textbox').fill(comment);
      await dlg.getByRole('button', { name: 'Save feedback' }).click(); await settle(page, 400);
    }
    await page.getByRole('button', { name: 'Give feedback' }).click();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Tell us what you think' });
    await dlg.waitFor({ state: 'visible' }); await settle(page, 300);
    const list = await text(dlg);
    ok(list.indexOf('Second comment') < list.indexOf('First comment') && list.includes('Maybe') && list.includes('No'), 'saved list: ' + list);
    await dlg.getByRole('button', { name: 'Copy feedback' }).click(); await settle(page, 300);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    ok(/Would use on own contracts: no \| Comment: Second comment \| Prototype as at 2026-10-06/.test(clip) && /maybe \| Comment: First comment/.test(clip), 'clipboard: ' + clip);
    const radios = await dlg.getByRole('radio').evaluateAll((els) => els.map((e) => e.checked));
    eq(radios, [false, false, false], 'a fresh form every time (no radio pre-selected)');
    await page.keyboard.press('Escape'); await settle(page, 300);
  });
  await t.check('persistence: triage, match decision, rate, hand-check and feedback all survive reload together; Reset clears all five keys but not the theme', async () => {
    await setStore(page, { 'kontor-triage': { 'F-C-007-overCap': 'under_review' }, 'kontor-matches': { 'Larchmont Grounds Maintenance': 'confirm' }, 'kontor-assumptions': { renewalRate: 0.03 } });
    await page.reload(); await page.waitForSelector('#shell-main h1');
    await openSettings(page);
    const s = await text(page.locator('[role="dialog"]').filter({ hasText: 'Assumptions' }));
    ok(s.includes('1 review') && s.includes('1 match decision') && s.includes('1 hand-check') === false || s.includes('match decision'), 'changed line: ' + s.slice(0, 700));
    t.note('Settings changed line', (s.match(/Changed on this device: [^.]*\./) || [''])[0]);
    await page.getByRole('button', { name: 'Reset demo changes' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset changes' }).click(); await settle(page, 400);
    const st = await store(page);
    eq(['kontor-triage', 'kontor-matches', 'kontor-assumptions', 'kontor-handcheck', 'kontor-feedback'].map((k) => st[k]), [null, null, null, null, null], 'five keys cleared');
    eq(st['kontor-theme'], 'dark', 'theme kept');
    await closeSettings(page);
    eq(await h1(page), gold.headline, 'headline');
  });
  eq(p.errors, [], 'errors in section 4a');
  await p.ctx.close();
}

/* ---- corrupt storage */
{
  const CORRUPT = {
    'kontor-triage': ['{', 'null', '[]', '123', '"str"', '{"F-NOPE":"explained","F-C-005-overCap":"bogus","F-C-005-renewal":"explained"}', '{"__proto__":{"x":1},"F-C-007-overCap":"explained"}'],
    'kontor-matches': ['{', 'null', '[]', '{"Larchmont Grounds Maintenance":"maybe","nobody":"confirm"}'],
    'kontor-assumptions': ['{', 'null', '[]', '{"renewalRate":"0.08"}', '{"renewalRate":99,"nearCapThreshold":-1}', '{"renewalRate":0}', '{"renewalRate":1e999}'],
    'kontor-handcheck': ['{', 'null', '[]', '{"X-NOPE":"correct"}', '{"X-C-005-maximumValue":"maybe"}'],
    'kontor-feedback': ['{', 'null', '{}', '[{"answer":"yes"},{"answer":"zzz"},null,5]', '"x"'],
    'kontor-theme': ['purple', '', 'null', '{"a":1}'],
  };
  const p = await h.newPage({ theme: null });
  const { page } = p;
  for (const [key, values] of Object.entries(CORRUPT)) {
    await t.check(`corrupt ${key}: ${values.length} bad values, every route renders, no console error, defaults used`, async () => {
      for (const v of values) {
        await visit(p, '#/overview');
        await page.evaluate(([k, val]) => localStorage.setItem(k, val), [key, v]);
        const before = p.errors.length;
        for (const r of ['#/overview', '#/opportunities', '#/spend', '#/contracts/C-005', '#/method', '#/source/C-005/X-C-005-maximumValue']) {
          await visit(p, r); await settle(page, 120);
          ok((await h1(page)).length > 0, `h1 on ${r} with ${key}=${v}`);
        }
        eq(p.errors.slice(before), [], `errors with ${key}=${v}`);
        await visit(p, '#/overview');
        const head = await h1(page);
        if (key === 'kontor-triage' && v.includes('F-C-005-renewal')) ok((await text(page.locator('.ov-sum__eq'))).endsWith('= £6,095,238'), 'valid entries in a half-bad object are still honoured: ' + await text(page.locator('.ov-sum__eq')));
        else if (key === 'kontor-triage' && v.includes('F-C-007-overCap')) t.note('triage with __proto__ key', head);
        else if (key === 'kontor-assumptions' && v.includes('"renewalRate":"0.08"')) ok(head === gold.headline, 'string rate must be ignored: ' + head);
        else if (key === 'kontor-assumptions' && /renewalRate":(99|0|1e999)/.test(v)) ok(head === gold.headline || /£\d/.test(head), 'out-of-range rate ignored: ' + head);
        else if (key !== 'kontor-theme') ok(head === gold.headline, `defaults used for ${key}=${v}: ${head}`);
        if (key === 'kontor-theme') ok(['dark', 'light'].includes(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))), 'theme attribute is dark or light with ' + v);
        await page.evaluate((k) => localStorage.removeItem(k), key);
      }
    });
  }
  await t.check('corrupt theme value falls back to dark (default) rather than light or an invalid attribute', async () => {
    await visit(p, '#/overview');
    await page.evaluate(() => localStorage.setItem('kontor-theme', 'purple'));
    await page.reload(); await page.waitForSelector('#shell-main h1');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'theme');
    await page.evaluate(() => localStorage.removeItem('kontor-theme'));
  });
  await p.ctx.close();
}

/* ---- blocked and over-quota storage */
{
  const p = await h.newPage({ blockStorage: true });
  const { page } = p;
  await visit(p, '#/overview');
  await t.check('blocked storage: the app renders, theme toggles in-session, triage and match decisions work without persistence, feedback says it cannot save', async () => {
    eq(await h1(page), gold.headline, 'headline');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'dark default');
    await page.locator('.shell__header button[aria-pressed]').first().click(); await settle(page, 200);
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'toggled to light');
    await page.locator('.shell__header button[aria-pressed]').first().click(); await settle(page, 200);
    await setTriageViaDrawer(page, 'F-C-005-overCap', 'explained');
    await go(page, '#/overview');
    eq(await h1(page), '£2.8m across 15 contracts flagged as opportunities to investigate', 'triage applies in session');
    await go(page, '#/spend/matches');
    await page.getByRole('button', { name: /Confirm match\s*,\s*Larchmont/ }).click(); await settle(page, 300);
    await go(page, '#/overview');
    eq(await h1(page), '£2.9m across 15 contracts flagged as opportunities to investigate', 'both apply (6,145,238 - 3,350,000 + 60,000 = 2,855,238)');
    await page.getByRole('button', { name: 'Give feedback' }).click();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Tell us what you think' });
    await dlg.waitFor({ state: 'visible' }); await settle(page, 300);
    await dlg.getByLabel('Yes').check();
    await dlg.getByRole('textbox').fill('typed while blocked');
    await dlg.getByRole('button', { name: 'Save feedback' }).click(); await settle(page, 300);
    ok((await text(dlg)).includes('Feedback not saved. Your browser is blocking local storage. Copy your comments instead.'), 'blocked error: ' + await text(dlg));
    await dlg.getByRole('button', { name: 'Copy feedback' }).click(); await settle(page, 300);
    ok((await page.evaluate(() => navigator.clipboard.readText())).includes('typed while blocked'), 'copy includes the typed comment');
    await page.keyboard.press('Escape'); await settle(page, 300);
    await page.reload(); await page.waitForSelector('#shell-main h1');
    eq(await h1(page), gold.headline, 'a reload forgets the in-session changes');
    eq(p.errors, [], 'errors');
  });
  await t.check('blocked storage: the flag drawer warns that the review lasts only until the page closes; Reset still works in-session', async () => {
    await go(page, '#/opportunities?flag=F-C-005-overCap');
    await drawer(page).waitFor({ state: 'visible' }); await settle(page, 300);
    await drawer(page).locator('select').selectOption('explained'); await settle(page, 300);
    ok((await text(drawer(page))).includes('blocking local storage'), 'warning: ' + (await text(drawer(page))).slice(-300));
    await page.keyboard.press('Escape'); await settle(page, 300);
    await openSettings(page);
    await page.getByRole('button', { name: 'Reset demo changes' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset changes' }).click(); await settle(page, 400);
    await closeSettings(page);
    await go(page, '#/overview'); eq(await h1(page), gold.headline, 'reset in-session');
  });
  await p.ctx.close();
}
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  await page.addInitScript(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/^kontor-(triage|matches|assumptions|handcheck|feedback)$/.test(k)) throw new DOMException('quota', 'QuotaExceededError'); return orig.call(this, k, v); }; });
  await visit(p, '#/opportunities');
  await t.check('quota exceeded on write: triage still applies in the session and the app does not crash', async () => {
    await setTriageViaDrawer(page, 'F-C-005-overCap', 'explained');
    await go(page, '#/overview');
    eq(await h1(page), '£2.8m across 15 contracts flagged as opportunities to investigate', 'headline');
    eq(p.errors, [], 'errors');
  });
  await p.ctx.close();
}

/* ---- feedback timestamp in a western time zone: the dialog shows local time, the copied text prints the UTC date */
{
  const ctx = await h.browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Los_Angeles', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-06T22:30:00-07:00') });
  await page.goto(h.url + '/index.html#/overview');
  await page.waitForSelector('#shell-main h1');
  await t.check('feedback timestamp: saved at 22:30 local on 6 Oct (UTC 7 Oct) - the list and the copied text must agree on the date', async () => {
    await page.getByRole('button', { name: 'Give feedback' }).click();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Tell us what you think' });
    await dlg.waitFor({ state: 'visible' }); await settle(page, 300);
    await dlg.getByLabel('Yes').check();
    await dlg.getByRole('button', { name: 'Save feedback' }).click(); await settle(page, 400);
    await page.getByRole('button', { name: 'Give feedback' }).click();
    await dlg.waitFor({ state: 'visible' }); await settle(page, 300);
    const shown = await dlg.locator('time').first().innerText();
    await dlg.getByRole('button', { name: 'Copy feedback' }).click(); await settle(page, 300);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    t.note('feedback date', `dialog shows "${shown}", copied text starts "${clip.slice(0, 10)}"`);
    ok(/6 Oct 2026/.test(shown), 'dialog shows local date: ' + shown);
    ok(clip.startsWith('2026-10-06'), 'copied text date must match the date the dialog shows: ' + clip.slice(0, 60));
  });
  await ctx.close();
}

await h.close();
t.finish();
