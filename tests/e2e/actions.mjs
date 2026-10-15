// Action tracker e2e (docs/action-tracker/action-tracker-build-spec.md, sections 8 to 10).
//   node tests/e2e/actions.mjs                         against dist/
//   KONTOR_DIST=.scratch/x node tests/e2e/actions.mjs  against another build
// Runs the demo script of section 10 end to end and checks every number in section 9, in both themes, at 1440x900 and 390x844.
// Each run starts from a fresh browser profile (the pre-loaded example actions), and ends with Reset demo data.
// Prints 'ok   <name>' / 'FAIL <name>: <why>'; exits non-zero when anything failed.
import { launch, visit, go, axe, VIEWPORTS } from '../lib/harness.mjs';

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('ok   ' + name); } catch (e) { failed += 1; console.log('FAIL ' + name + ': ' + ((e && e.message) || e)); }
}
const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg); };
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const text = async (loc) => norm(await loc.innerText());
const settle = (page, ms = 200) => page.waitForTimeout(ms);
const hashOf = (page) => page.evaluate(() => location.hash);
const noAxe = async (page, label, { dismissTips = true } = {}) => {
  await page.mouse.move(1, 1);                          // a hover tooltip left open by the last step is not page content
  if (dismissTips && await page.locator('.kviz-tip').count()) await page.keyboard.press('Escape');
  const v = await axe(page);
  ok(v.length === 0, `${label}: ` + v.map((x) => `${x.id} (${x.count}): ${x.targets.join(' | ')}`).join('\n'));
};

/* ---------------------------------------------------------------- golden numbers (build spec section 9) */
const HEADLINE = '£6.1m across 15 contracts flagged as opportunities to investigate';
const HEADLINE_AFTER = '£6.0m across 15 contracts flagged as opportunities to investigate';
const EMAIL = [
  'Subject: C-005 Highways reactive maintenance and minor works: spend is £3,350,000 above the cap',
  '',
  'Hi Dana,',
  '',
  'Our contract review flagged the Highways reactive maintenance and minor works contract (C-005, Fennimore Highways Ltd).',
  '',
  '- Clause 14.3, page 23: "The Council\'s liability to pay the Charges under this Agreement shall not exceed £5,000,000 in aggregate (the Maximum Contract Value) unless increased by a Variation under clause 41."',
  '- Payments to date are £8,350,000. That is £3,350,000 above the cap.',
  '',
  'Can you tell me by 20 October 2026:',
  '1. Was a variation approved that raised the cap?',
  '2. Was extra work added to the scope?',
  '3. Who approved the payments above the cap?',
  '',
  'The clause and the payment list are in Kontor.',
  '',
  'Thanks,',
  '[Your name]',
].join('\n');
const CLOSE_NOTE = 'Credit note for the 2026 price rise above CPI.';

/* ---------------------------------------------------------------- page readers */
const progress = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ov-prog [data-block]')].map((b) => {
  const v = b.querySelector('.ov-prog__value');
  return [b.dataset.block, { value: v.textContent.trim(), exact: v.getAttribute('title'), foot: b.querySelector('.ov-prog__foot').textContent.replace(/\s+/g, ' ').trim() }];
})));
const board = (page) => page.evaluate(() => [...document.querySelectorAll('.acts-col')].map((c) => ({
  stage: c.dataset.stage, count: c.querySelectorAll('.acts-card').length,
  total: c.querySelector('.acts-col__total').dataset.total, head: c.querySelector('.acts-col__total').textContent.trim(),
  cards: [...c.querySelectorAll('.acts-card')].map((x) => x.dataset.card),
})));
const stats = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.acts-stats [data-stat]')].map((s) => [s.dataset.stat, {
  value: s.querySelector('.kx-stat__value').textContent.trim(), exact: s.getAttribute('title'), warn: s.classList.contains('is-warn'),
}])));
const tiles = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.acts-tiles [data-tile]')].map((s) => [s.dataset.tile, {
  value: s.querySelector('.kx-stat__value').textContent.trim(), foot: s.querySelector('.kx-stat__foot').textContent.replace(/\s+/g, ' ').trim(),
}])));
const bars = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.kviz-mb__col')].map((c) => [c.dataset.month, (c.querySelector('.kviz-mb__val') || { textContent: '' }).textContent.trim()])));
const drawer = (page) => page.locator('[role="dialog"].flag-drawer');
const closeDialog = (page) => page.locator('[role="dialog"].act-close');

const dist = process.env.KONTOR_DIST || null;
const h = await launch({ dist });
const allErrors = [];
try {
  // Both themes at 1440 and 390 against the app, then one more pass on the single-file build (dist/kontor-prototype.html).
  const RUNS = [];
  for (const theme of ['dark', 'light']) for (const vpName of ['1440', '390']) RUNS.push({ theme, vpName, standalone: false });
  RUNS.push({ theme: 'dark', vpName: '1440', standalone: true });
  for (const run of RUNS) {
    {
      const { theme, vpName } = run;
      const vp = vpName === '390' ? VIEWPORTS.phone : VIEWPORTS.desktop;
      const phone = vpName === '390';
      const tag = `${theme} ${vpName}${run.standalone ? ' standalone' : ''}`;
      const t = await h.newPage({ theme, viewport: vp, hasTouch: phone });
      if (run.standalone) t.base = `${t.url}/dist/kontor-prototype.html`;
      const page = t.page;
      await visit(t, '#/overview');

      /* ============================================================ fresh load (section 9, first table) */
      await check(`${tag}: Home at the start: headline £6.1m (£6,145,238), Action progress £4.2m / £1.9m / £203,100`, async () => {
        eq(await text(page.locator('#shell-main h1')), HEADLINE, 'h1');
        ok((await text(page.locator('.ov-sum__eq'))).endsWith('= £6,145,238'), 'exact headline');
        const p = await progress(page);
        eq(p['not-started'], { value: '£4.2m', exact: '£4,244,560', foot: '15 flags with no action yet' }, 'not started');
        eq(p.working, { value: '£1.9m', exact: '£1,900,678', foot: '4 actions. 1 due in the next 14 days.' }, 'being worked on');
        eq(p.value.value, '£203,100', 'value secured'); eq(p.value.foot, '3 actions resolved since May. Your figures. See results', 'value foot');
        eq(await page.locator('.ov-prog a', { hasText: 'See results' }).getAttribute('href'), '#/actions/results', 'see results link');
      });
      await check(`${tag}: Home Cap vs spend and Renewals at the start: 3 / 3 / 18, £4,172,000 above the cap, Highways 167.0% first, nine diamonds`, async () => {
        eq(await page.locator('.ov-cap__pills li').evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim())), ['Over cap 3', 'Close to cap 3', 'Within cap 18'], 'pills');
        eq(await text(page.locator('.ov-cap__sum')), '£4,172,000 paid above the cap, across 3 contracts', 'summary');
        eq(await page.locator('.ov-cap .kviz-bl__row').first().evaluate((r) => [r.querySelector('.kviz-bl__name').textContent.trim(), r.querySelector('.kviz-bl__pctfig').textContent.trim()]), ['Highways reactive maintenance and minor works', '167.0%'], 'top row');
        eq(await page.locator('.ov-radar button.kviz-rs__dia').count(), 9, 'diamonds');
      });
      await check(`${tag}: before the tour, a renewal diamond shows which contract it is (Waste collection and recycling, notice by 31 Oct 2026, in 25 days)`, async () => {
        const d = page.locator('.ov-radar button.kviz-rs__dia').first();
        if (phone) await d.focus(); else await d.hover();
        const tip = page.locator('.kviz-tip');
        await tip.waitFor({ state: 'visible' });
        eq(await text(tip.locator('.kviz-tip__title')), 'Waste collection and recycling', 'title');
        eq(await text(tip.locator('.kviz-tip__sub')), 'Quillon Waste Services Ltd', 'supplier');
        eq(await tip.locator('.kviz-tip__line').evaluateAll((ls) => ls.map((l) => l.textContent)), ['Give notice by 31 Oct 2026, in 25 days', '£6.2m a year · ends 31 Jan 2027'], 'lines');
        ok(!/saving/i.test(await text(tip)), 'no "saving"');
        await page.keyboard.press('Escape');
        await page.mouse.move(1, 1);
      });
      await check(`${tag}: axe clean on Home`, async () => { await noAxe(page, 'home'); });

      await go(page, '#/actions');
      await page.waitForSelector('.acts-col');
      await check(`${tag}: Board at the start: To start 0, Checking internally 2 (£1,402,478), With supplier 2 (£498,200), Closed 0; stats £1.9m, 4, 1, £203,100`, async () => {
        const b = await board(page);
        eq(b.map((c) => [c.stage, c.count]), [['to_start', 0], ['checking', 2], ['with_supplier', 2], ['closed', 0]], 'columns');
        eq([b[1].total, b[2].total, b[3].head], ['1402478', '498200', 'Last 30 days'], 'column totals');
        eq(b[1].cards, ['F-C-007-overCap', 'F-C-001-nearCap'], 'soonest due first');
        const s = await stats(page);
        eq([s.working.value, s.working.exact, s.open.value, s.due.value, s.due.warn, s.value.value], ['£1.9m', '£1,900,678', '4', '1', true, '£203,100'], 'stats');
        if (phone) {
          const xs = await page.locator('.acts-col').evaluateAll((cs) => cs.map((c) => Math.round(c.getBoundingClientRect().left)));
          ok(xs.every((x) => x === xs[0]), 'phone: one list grouped by stage, not columns: ' + xs);
        }
      });
      await check(`${tag}: axe clean on the Board`, async () => { await noAxe(page, 'board'); });

      await go(page, '#/actions/results');
      await page.waitForSelector('.acts-tiles');
      await check(`${tag}: Results at the start: Value secured £203,100, cash £117,900 (3), cost £85,200 (2), 5 closed: 3 resolved, 1 explained, 1 no action`, async () => {
        const r = await tiles(page);
        eq(r, {
          value: { value: '£203,100', foot: 'Since May 2026' }, cash: { value: '£117,900', foot: '3 actions' },
          cost: { value: '£85,200', foot: '2 actions' }, closed: { value: '5', foot: '3 resolved · 1 explained · 1 no action' },
        }, 'tiles');
        eq(await page.locator('.acts-table tbody tr').count(), 5, 'five closed actions');
        eq(await page.locator('.acts-table .acts-res__example').count(), 5, 'all five are examples');
        eq(await bars(page), { '2026-04': '', '2026-05': '£43.6k', '2026-06': '£75.5k', '2026-07': '£84k', '2026-08': '', '2026-09': '', '2026-10': '' }, 'bars');
      });
      await check(`${tag}: axe clean on Results`, async () => { await noAxe(page, 'results'); });

      /* ============================================================ the demo script (section 10) */
      await check(`${tag}: 1. Start it: open Highways and set Under review; the toast says it was added to Actions and the headline is still £6.1m`, async () => {
        await go(page, '#/opportunities');
        await page.locator('.opp .kviz-barlist__list > li').first().locator('.kviz-row__link').click();
        await drawer(page).waitFor({ state: 'visible' });
        await settle(page, 260);
        await drawer(page).locator('.flag-foot select').selectOption('under_review');
        const toast = page.locator('.kx-toast', { hasText: 'added to Actions' });
        await toast.waitFor();
        eq(await text(toast.locator('.kx-toast__title')), 'Highways reactive maintenance and minor works: added to Actions.', 'toast title');
        eq(await text(toast.locator('.kx-toast__desc')), 'The headline is still £6.1m. Set an owner to get started.', 'toast description');
        ok((await text(drawer(page).locator('.flag-foot'))).includes('Counted in the headline. Stage: To start.'), 'footer help');
      });
      await check(`${tag}: 2. See the board: "Open in Actions" lands on the Highways card in To start (just added, due 20 Oct, £3,350,000), next to four others`, async () => {
        await page.locator('.kx-toast__action', { hasText: 'Open in Actions' }).click();
        await page.waitForSelector('.acts-col');
        ok((await hashOf(page)).startsWith('#/actions'), 'on the Actions page');
        const card = page.locator('[data-card="F-C-005-overCap"]');
        await card.waitFor();
        eq(await card.evaluate((c) => c.closest('.acts-col').dataset.stage), 'to_start', 'in To start');
        ok(await card.evaluate((c) => c.classList.contains('is-highlight')), 'highlighted');
        const ct = await text(card);
        ok(ct.includes('Just added') && ct.includes('Due 20 Oct') && ct.includes('£3,350,000') && ct.includes('0 of 5') && ct.includes('Next: Check the contract file for a variation or change notice.'), 'card: ' + ct);
        eq(await page.locator('.acts-card').count(), 5, 'five cards on the board');
      });
      await check(`${tag}: 3. Know who to call: the card opens the Action tab; set Dana Okafor as owner; the representatives come from clause 3`, async () => {
        await page.locator('[data-open-card="F-C-005-overCap"]').click();
        await drawer(page).waitFor({ state: 'visible' });
        eq(await hashOf(page), '#/actions?flag=F-C-005-overCap&tab=action', 'drawer on the Action tab');
        eq(await drawer(page).locator('[role="tab"][aria-selected="true"]').innerText(), 'Action', 'Action tab selected');
        await drawer(page).locator('.act-who__owner select').selectOption('P-dana');
        await settle(page);
        eq(await drawer(page).locator('.act-contact .act-contact__name b').allInnerTexts(), ['Dana Okafor', 'Jo Whitfield', 'Tom Ellery', 'Alex Merrow'], 'contacts');
        const reps = await drawer(page).locator('.act-quote summary').allInnerTexts();
        eq(reps.map(norm), ["Authority's Representative · Clause 3.1, page 6", "Supplier's Representative · Clause 3.2, page 6"], 'representative sources');
        await drawer(page).locator('.act-quote summary').first().click();
        ok((await text(drawer(page).locator('.act-quote__text').first())).includes('currently Dana Okafor (dana.okafor@marchbank.example)'), 'the clause quote');
        eq(await drawer(page).locator('.act-step').count(), 5, 'five steps');
        eq(await drawer(page).locator('.act-exit__fact').evaluateAll((fs) => fs.map((f) => [f.querySelector('dt').textContent, f.querySelector('.act-exit__val').textContent, [...(f.querySelector('.clause-link') || { childNodes: [] }).childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()])),   // visible words only (the link also names the fact for screen readers)
          [['End for convenience', "Yes, 3 months' notice", 'Clause 30.1, page 31'], ['Exit fee', 'None', 'Clause 33.2, page 33'], ['Contract ends', '31 May 2027', 'Clause 31.1, page 32']], 'exit terms');
      });
      await check(`${tag}: 4. Make the first move: Copy email puts the exact C-005 email on the clipboard and logs it`, async () => {
        eq(await drawer(page).locator('.act-mail__to select').inputValue(), 'P-dana', 'To: Dana Okafor');
        await drawer(page).getByRole('button', { name: 'Copy email' }).click();
        await drawer(page).locator('.act-mail__msg', { hasText: 'Email copied.' }).waitFor();
        eq(await page.evaluate(() => navigator.clipboard.readText()), EMAIL, 'clipboard');
        const log = await drawer(page).locator('.act-activity__item').allInnerTexts();
        ok(norm(log[0]).endsWith('You copied the email to Dana Okafor.'), 'newest log line: ' + log[0]);
        ok(log.some((l) => norm(l).endsWith('You set the owner to Dana Okafor.')), 'owner logged');
      });
      await check(`${tag}: axe clean on the drawer Action tab`, async () => { await noAxe(page, 'action tab'); });
      await page.keyboard.press('Escape');
      await drawer(page).waitFor({ state: 'detached' });

      await check(`${tag}: 5. Close the loop: Street lighting to Closed (${phone ? 'Move to' : 'drag and drop'}), Resolved with £150,000 cash recovered; Value secured is now £353,100`, async () => {
        await go(page, '#/actions');
        await page.waitForSelector('[data-card="F-C-004-uplift"]');
        if (phone) {
          await page.locator('[data-card="F-C-004-uplift"] .kx-menubtn button').click();
          await page.getByRole('menuitem', { name: 'Closed' }).click();
        } else {
          await page.dragAndDrop('[data-card="F-C-004-uplift"]', '.acts-col[data-stage="closed"]');
        }
        const dlg = closeDialog(page);
        await dlg.waitFor({ state: 'visible' });
        eq(await text(dlg.locator('.kx-dialog__desc')), 'Street lighting and signage maintenance · Price increase above cap · £188,200 flagged', 'subtitle');
        eq(await dlg.locator('input[type="radio"]:checked').inputValue(), 'resolved', 'Resolved preselected');
        await noAxe(page, 'close dialog', { dismissTips: false });
        await dlg.getByRole('button', { name: 'Close action' }).click();
        ok((await dlg.locator('.kx-fieldwrap__error').allInnerTexts()).map(norm).includes('Enter an amount. Add cash recovered, cost avoided or both.'), 'money is required');
        await dlg.locator('.act-close__money input').first().fill('150000');
        await dlg.locator('input[maxlength="140"]').fill(CLOSE_NOTE);
        await dlg.getByRole('button', { name: 'Close action' }).click();
        await dlg.waitFor({ state: 'detached' });
        const toast = page.locator('.kx-toast', { hasText: 'closed as Resolved' });
        await toast.waitFor();
        eq(await text(toast), 'Street lighting and signage maintenance: closed as Resolved. Value secured is now £353,100.', 'toast');
        const card = page.locator('[data-card="F-C-004-uplift"]');
        eq(await card.evaluate((c) => c.closest('.acts-col').dataset.stage), 'closed', 'in Closed');
        ok((await text(card)).includes('£150,000 cash recovered (your figure) against £188,200 flagged. Closed 6 Oct.'), 'closed card: ' + await text(card));
      });
      await check(`${tag}: after the demo, the Board: To start 1 (Highways £3,350,000, due 20 Oct), Checking 2, With supplier 1 (Waste), Closed 1 (Street lighting); £5.1m (£5,062,478) being worked on, 2 due in 14 days`, async () => {
        const b = await board(page);
        eq(b.map((c) => [c.stage, c.count]), [['to_start', 1], ['checking', 2], ['with_supplier', 1], ['closed', 1]], 'columns');
        eq([b[0].cards, b[0].total, b[2].cards, b[3].cards], [['F-C-005-overCap'], '3350000', ['F-C-003-renewal'], ['F-C-004-uplift']], 'cards');
        ok((await text(page.locator('[data-card="F-C-005-overCap"]'))).includes('Due 20 Oct'), 'Highways due 20 Oct');
        const s = await stats(page);
        eq([s.working.value, s.working.exact, s.open.value, s.due.value, s.value.value], ['£5.1m', '£5,062,478', '4', '2', '£353,100'], 'stats');
      });
      await check(`${tag}: 6. Show what came back: Results £353,100, cash £267,900 (4), cost £85,200 (2), 6 closed (4 / 1 / 1), bars May £43.6k, Jun £75.5k, Jul £84k, Oct £150k`, async () => {
        await page.getByRole('link', { name: 'Results', exact: true }).click();
        await page.waitForSelector('.acts-tiles');
        eq(await hashOf(page), '#/actions/results', 'address');
        const r = await tiles(page);
        eq(r, {
          value: { value: '£353,100', foot: 'Since May 2026' }, cash: { value: '£267,900', foot: '4 actions' },
          cost: { value: '£85,200', foot: '2 actions' }, closed: { value: '6', foot: '4 resolved · 1 explained · 1 no action' },
        }, 'tiles');
        eq(await bars(page), { '2026-04': '', '2026-05': '£43.6k', '2026-06': '£75.5k', '2026-07': '£84k', '2026-08': '', '2026-09': '', '2026-10': '£150k' }, 'bars');
        const first = page.locator('.acts-table tbody tr').first();
        ok(await first.evaluate((r) => r.classList.contains('is-latest')), 'the latest closure is highlighted');
        const row = await text(first);
        ok(row.includes('6 Oct 2026') && row.includes('Street lighting and signage maintenance') && row.includes(CLOSE_NOTE) && row.includes('Resolved') && row.includes('£150,000') && row.includes('Priya Raman'), 'latest row: ' + row);
        ok(!row.includes('Example'), 'not an example');
        eq(await text(page.locator('.acts-foot')), 'Your figures. Kontor does not check them.', 'footer');
      });
      await check(`${tag}: after the demo, Home: headline £6.0m (£5,957,038), Action progress Value secured £353,100`, async () => {
        await go(page, '#/overview');
        await page.waitForSelector('.ov-prog');
        eq(await text(page.locator('#shell-main h1')), HEADLINE_AFTER, 'h1');
        ok((await text(page.locator('.ov-sum__eq'))).endsWith('= £5,957,038'), 'exact headline');
        const p = await progress(page);
        eq(p.value.value, '£353,100', 'value secured'); eq(p.value.foot, '4 actions resolved since May. Your figures. See results', 'value foot');
        eq([p.working.value, p.working.exact, p.working.foot], ['£5.1m', '£5,062,478', '4 actions. 2 due in the next 14 days.'], 'being worked on');
      });
      await check(`${tag}: the Opportunities list shows each open action's stage and owner (Highways: To start · DO)`, async () => {
        await go(page, '#/opportunities');
        await page.waitForSelector('.opp .kviz-barlist__list > li');
        eq(await text(page.locator('.opp .kviz-barlist__list > li').first().locator('[data-action-chip]')), 'To start · DO', 'Highways row');
      });
      // the header button on desktop; on a phone it is in the Menu
      const resetDemo = async () => {
        if (phone) {
          await page.locator('.shell__slot--phone-only button[aria-label="Menu"]').click();
          await page.getByRole('menuitem', { name: 'Reset demo data' }).click();
        } else await page.locator('.shell__header').getByRole('button', { name: /Reset demo data/ }).click();
      };
      await check(`${tag}: Reset demo data puts the example actions back: £6.1m, the board at its starting state, Value secured £203,100`, async () => {
        await resetDemo();
        const c = page.getByRole('alertdialog', { name: 'Reset demo data?' });
        await c.waitFor();
        await c.getByRole('button', { name: 'Reset demo data' }).click();
        await page.locator('.kx-toast', { hasText: 'Demo data reset.' }).waitFor();
        await page.waitForSelector('.ov-prog');
        eq(await hashOf(page), '#/overview', 'back on the Overview');
        eq(await text(page.locator('#shell-main h1')), HEADLINE, 'headline');
        eq((await progress(page)).value.value, '£203,100', 'value secured');
        await go(page, '#/actions');
        await page.waitForSelector('.acts-col');
        eq((await board(page)).map((c) => c.count), [0, 2, 2, 0], 'board');
        eq(await page.locator('.acts-card__fresh').count(), 0, 'no "Just added" chip after a reset');
        await resetDemo();
        await page.locator('.kx-toast', { hasText: 'Already at the starting numbers.' }).waitFor();
      });
      allErrors.push(...t.errors);
      await t.ctx.close();
    }
  }
  await check('no console errors and no failed requests across every run', async () => { eq(allErrors, [], 'errors'); });
} finally {
  await h.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall action tracker checks passed');
process.exit(failed ? 1 : 0);
