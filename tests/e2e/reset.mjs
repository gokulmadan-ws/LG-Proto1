// End-to-end: "Reset demo data" (header button and rail Menu item) puts the demo back to its starting numbers.
//   KONTOR_DIST=.scratch/x node tests/e2e/reset.mjs        against another build
//   node tests/e2e/reset.mjs                                against dist/
import { launch, visit, go, setTheme, axe, externalRequests, VIEWPORTS } from '../lib/harness.mjs';

const DIST = process.env.KONTOR_DIST || null;
let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed += 1; console.log(`FAIL ${name}: ${e && e.message ? e.message : e}`); }
}
const must = (cond, why) => { if (!cond) throw new Error(why); };
const eq = (a, b, what) => must(a === b, `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const START = '£6.1m across 15 contracts flagged as opportunities to investigate';
const CHANGED = '£2.8m across 15 contracts flagged as opportunities to investigate';
const h1 = (page) => page.evaluate(() => document.querySelector('#shell-main h1').innerText.replace(/\s+/g, ' ').trim());
const waitH1 = (page, text) => page.waitForFunction((t) => { const e = document.querySelector('#shell-main h1'); return !!e && e.innerText.replace(/\s+/g, ' ').trim() === t; }, text, { timeout: 8000 });
const toast = (page) => page.locator('.kx-toast').allInnerTexts().then((a) => a.join(' | ').replace(/\s+/g, ' '));
const header = (page) => page.getByRole('button', { name: /^Reset demo data/ }).first();
/** Make a change the way a presenter would: review the top over-cap flag as "Explained". */
async function changeSomething(t) {
  await t.page.evaluate(() => localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'not_an_issue' })));
  await t.page.reload();
  await t.page.waitForSelector('#shell-main h1');
}

const h = await launch({ dist: DIST });
try {
  const t = await h.newPage({ theme: 'dark' });
  await visit(t, '#/overview');

  await check('the header has a "Reset demo data" button, visible on desktop, before the theme toggle', async () => {
    const b = t.page.locator('.shell__reset');
    eq(await b.count(), 1, 'buttons');
    eq(await b.isVisible(), true, 'visible');
    eq((await b.innerText()).trim(), 'Reset demo data', 'label');
    const order = await t.page.evaluate(() => { const r = document.querySelector('.shell__right'); const els = [...r.querySelectorAll('button')]; return [els[0].className.includes('shell__reset'), els[1].getAttribute('aria-label')]; });
    eq(order[0], true, 'first in the right cluster');
    must(/theme|mode/i.test(order[1] || ''), 'theme toggle follows: ' + order[1]);
  });

  await check('with nothing changed it says so, takes you to the Overview and asks nothing', async () => {
    await go(t.page, '#/spend/matches');
    await header(t.page).click();
    await waitH1(t.page, START);
    eq(await t.page.evaluate(() => location.hash), '#/overview', 'route');
    eq(await t.page.getByRole('alertdialog').count(), 0, 'no dialog');
    must((await toast(t.page)).includes('Already at the starting numbers.'), 'toast: ' + await toast(t.page));
  });

  await check('after a change the headline moves, and Reset asks first (Cancel is focused; Escape changes nothing)', async () => {
    await changeSomething(t);
    await waitH1(t.page, CHANGED);
    await go(t.page, '#/spend/matches');
    await header(t.page).click();
    const dlg = t.page.getByRole('alertdialog');
    await dlg.waitFor();
    must((await dlg.innerText()).includes('Reset demo data?'), 'title');
    eq(await t.page.evaluate(() => document.activeElement.innerText.trim()), 'Cancel', 'Cancel focused first');
    await t.page.keyboard.press('Escape');
    await dlg.waitFor({ state: 'detached' });
    eq(await t.page.evaluate(() => location.hash), '#/spend/matches', 'stayed where it was');
    must((await t.page.evaluate(() => localStorage.getItem('kontor-triage'))).includes('F-C-005-overCap'), 'change kept');
  });

  await check('confirming clears every change, returns to the Overview with £6.1m and says so; the theme stays', async () => {
    await setTheme(t.page, 'light');
    await header(t.page).click();
    await t.page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
    await waitH1(t.page, START);
    eq(await t.page.evaluate(() => location.hash), '#/overview', 'route');
    const left = await t.page.evaluate(() => ['kontor-triage', 'kontor-matches', 'kontor-assumptions', 'kontor-handcheck', 'kontor-feedback'].map((k) => localStorage.getItem(k)));
    must(left.every((x) => x === null || x === '{}' || x === '[]'), 'storage cleared: ' + JSON.stringify(left));
    eq(await t.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'theme kept');
    const tt = await toast(t.page);
    must(tt.includes('Demo data reset.') && tt.includes('£6.1m across 15 contracts'), 'toast: ' + tt);
    await setTheme(t.page, 'dark');
  });

  await check('it also clears a supplier match, a changed assumption and an open flag drawer, and works from the Guide', async () => {
    await t.page.evaluate(() => {
      localStorage.setItem('kontor-matches', JSON.stringify({ 'Larchmont Grounds Maintenance': 'confirm' }));
      localStorage.setItem('kontor-assumptions', JSON.stringify({ renewalRate: 0.08 }));
    });
    await go(t.page, '#/guide');
    await t.page.reload();
    await t.page.waitForSelector('#shell-main h1');
    await go(t.page, '#/overview?flag=F-C-005-overCap');
    await t.page.locator('.kx-drawer, [role="dialog"]').first().waitFor();
    await t.page.keyboard.press('Escape');
    await header(t.page).click();
    await t.page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
    await waitH1(t.page, START);
    eq(await t.page.evaluate(() => location.hash), '#/overview', 'route without the flag parameter');
  });

  await check('the rail Menu has "Reset demo data" as its last item and it works', async () => {
    await changeSomething(t);
    await t.page.click('.shell__rail-foot button[aria-label="Menu"]');
    const items = (await t.page.locator('[role="menu"] [role="menuitem"]').allInnerTexts()).map((s) => s.trim());
    eq(items[items.length - 1], 'Reset demo data', 'last item');
    await t.page.locator('[role="menuitem"]', { hasText: 'Reset demo data' }).click();
    await t.page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
    await waitH1(t.page, START);
  });

  await check('a dot shows on the header button when there is something to reset', async () => {
    await changeSomething(t);
    eq(await t.page.locator('.shell__reset.has-changes').count(), 1, 'dot when changed');
    must(/change/.test(await header(t.page).getAttribute('aria-label')), 'aria-label mentions the change');
    await header(t.page).click();
    await t.page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
    await waitH1(t.page, START);
    eq(await t.page.locator('.shell__reset.has-changes').count(), 0, 'no dot once reset');
  });

  await check('on a phone the header button is hidden and the Menu item resets', async () => {
    const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.phone });
    await visit(p, '#/overview');
    eq(await p.page.locator('.shell__reset').isVisible(), false, 'hidden on phones');
    await p.page.evaluate(() => localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'not_an_issue' })));
    await p.page.reload(); await p.page.waitForSelector('#shell-main h1');
    await p.page.click('header button[aria-label="Menu"]');
    await p.page.locator('[role="menuitem"]', { hasText: 'Reset demo data' }).click();
    await p.page.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
    await waitH1(p.page, START);
    await p.ctx.close();
  });

  await check('axe is clean with the button in the header and with the confirm dialog open, in both themes', async () => {
    for (const theme of ['dark', 'light']) {
      await setTheme(t.page, theme);
      await changeSomething(t);
      let v = await axe(t.page);
      must(v.length === 0, `${theme} header: ${JSON.stringify(v.map((x) => x.id))}`);
      await header(t.page).click();
      await t.page.getByRole('alertdialog').waitFor();
      await t.page.waitForTimeout(350);
      v = await axe(t.page);
      must(v.length === 0, `${theme} dialog: ${JSON.stringify(v.map((x) => x.id))}`);
      await t.page.keyboard.press('Escape');
      await t.page.getByRole('alertdialog').waitFor({ state: 'detached' });
      await t.page.evaluate(() => localStorage.removeItem('kontor-triage'));
      await t.page.reload(); await t.page.waitForSelector('#shell-main h1');
    }
  });

  await check('no console errors and no request leaves the origin', async () => {
    must(t.errors.length === 0, 'console errors: ' + t.errors.join(' | '));
    must(externalRequests(t).length === 0, 'external requests');
  });
} finally {
  await h.close();
}
if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nall reset checks passed');
