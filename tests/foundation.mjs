// Foundation integration check: proves estate -> charts -> composites -> shell -> router works end to end, using the probe
// fixture tests/fixtures/int-probe.jsx (headline h1, four cards, sum line) inside the real AppFrame, in both themes.
//   node tests/foundation.mjs            builds the fixture into .scratch/int-probe, then checks it
//   node tests/foundation.mjs --no-build
import { execFileSync } from 'node:child_process';
import { launch, visit, axe, setTheme, ROOT } from './lib/harness.mjs';

const argv = process.argv.slice(2);
const DIST = '.scratch/int-probe';
if (!argv.includes('--no-build')) {
  execFileSync('node', ['scripts/build.mjs', '--entry', 'tests/fixtures/int-probe.jsx', '--outdir', DIST], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
}

const results = [];
async function check(name, fn) {
  try { const d = await fn(); results.push({ name, ok: true }); console.log(`  ok    ${name}${d ? '  (' + d + ')' : ''}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`  FAIL  ${name}\n        ${String(e.message).split('\n').join('\n        ')}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const eq = (a, b, w) => assert(JSON.stringify(a) === JSON.stringify(b), `${w}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const GOLDEN = {
  h1: '£6.1m across 15 contracts flagged as opportunities to investigate',
  cards: [
    'Spend over cap £4.2m, 3 contracts, already paid above the cap',
    'Close to cap £0.6m, 1 contract, projected at the current pace',
    'Renewals £1.1m, 12 contracts, indicative value per year',
    'Price increases above cap £0.3m, 3 contracts, already paid above the cap',
  ],
  sum: '£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238',
};

const SNIP = '.scratch/int-snippets';
if (!argv.includes('--no-build')) {
  execFileSync('node', ['scripts/build.mjs', '--entry', 'tests/fixtures/int-snippets.jsx', '--outdir', SNIP], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
}

const h = await launch({ dist: DIST });
try {
  console.log('\nFoundation probe: estate -> charts -> shell (headline, four cards, sum line)');
  for (const [w, hgt] of [[1440, 900], [1366, 768], [1024, 768]]) {
    for (const theme of ['dark', 'light']) {
      const t = await h.newPage({ theme, viewport: { width: w, height: hgt }, hangExternal: true });
      await visit(t, '#/overview');
      await check(`${w}x${hgt} ${theme}: golden strings (h1, four cards, sum line)`, async () => {
        const r = await t.page.evaluate(() => ({
          h1: document.querySelector('#shell-main h1').innerText.replace(/\s+/g, ' ').trim(),
          h1Count: document.querySelectorAll('#shell-main h1').length,
          cards: [...document.querySelectorAll('.kviz-cards a.kviz-card')].map((a) => a.getAttribute('aria-label')),
          hrefs: [...document.querySelectorAll('.kviz-cards a.kviz-card')].map((a) => a.getAttribute('href')),
          sum: document.querySelector('#sum-line').innerText.trim(),
          title: document.title,
          theme: document.documentElement.getAttribute('data-theme'),
        }));
        eq(r.h1, GOLDEN.h1, 'h1'); eq(r.h1Count, 1, 'h1 count'); eq(r.cards, GOLDEN.cards, 'card aria-labels'); eq(r.sum, GOLDEN.sum, 'sum line');
        eq(r.hrefs, ['#/opportunities?type=overCap', '#/opportunities?type=nearCap', '#/opportunities?type=renewal', '#/opportunities?type=uplift'], 'card links');
        eq(r.title, 'Overview | Kontor financial layer', 'document.title'); eq(r.theme, theme, 'theme');
      });
      await check(`${w}x${hgt} ${theme}: banner, h1 and the four cards are visible without scrolling`, async () => {
        const r = await t.page.evaluate(() => {
          const bottom = (s) => document.querySelector(s).getBoundingClientRect().bottom;
          return { banner: bottom('.sample-banner'), cards: bottom('.kviz-cards'), vh: window.innerHeight, docScroll: document.documentElement.scrollWidth > window.innerWidth, mainScroll: document.querySelector('#shell-main').scrollWidth > document.querySelector('#shell-main').clientWidth };
        });
        assert(r.cards <= r.vh, `cards end at ${Math.round(r.cards)}px, viewport ${r.vh}px`);
        assert(!r.docScroll && !r.mainScroll, 'horizontal scroll');
        return `cards end y=${Math.round(r.cards)}`;
      });
      await check(`${w}x${hgt} ${theme}: axe clean`, async () => {
        const v = await axe(t.page);
        assert(v.length === 0, v.map((x) => `${x.id} (${x.count}): ${x.targets.join(' | ')}`).join('\n'));
      });
      await check(`${w}x${hgt} ${theme}: no console errors, no request leaves the origin`, async () => {
        eq(t.errors, [], 'console errors');
        const ext = t.requests.filter((r) => !/^(data|blob|about):/.test(r.url) && new URL(r.url).origin !== new URL(t.url).origin);
        eq(ext.map((r) => r.url), [], 'external requests');
      });
      await t.ctx.close();
    }
  }

  console.log('\nFoundation probe: behaviour');
  {
    const t = await h.newPage({ theme: 'dark' });
    await visit(t, '#/overview');
    await check('the figure shows the exact value on keyboard focus (R16: £6,145,238)', async () => {
      await t.page.focus('.kviz-hero');
      await t.page.waitForSelector('.kviz-tip', { timeout: 3000 }).catch(() => {});
      const txt = await t.page.evaluate(() => document.body.innerText);
      assert(txt.includes('£6,145,238'), 'exact value not shown on focus');
      await t.page.keyboard.press('Escape');
    });
    await check('card links navigate through the real router and the rail follows the route', async () => {
      await t.page.click('a.kviz-card[href="#/opportunities?type=overCap"]');
      await t.page.waitForFunction(() => location.hash === '#/opportunities?type=overCap');
      // The hash changes before React has rendered the new page, so wait for the rail instead of reading it at once.
      await t.page.waitForFunction(() => { const el = document.querySelector('nav[aria-label="Primary"] [aria-current]'); return !!el && el.getAttribute('aria-label') === 'Opportunities'; });
      await t.page.goBack();
      await t.page.waitForFunction(() => location.hash === '#/overview');
    });
    await check('a triage action recomputes the estate: headline, cards, bar and sum line move together; reset restores', async () => {
      await t.page.click('#probe-exclude');
      await t.page.waitForFunction(() => document.querySelector('#shell-main h1').innerText.includes('£2.8m'));
      const r = await t.page.evaluate(() => ({ h1: document.querySelector('#shell-main h1').innerText.replace(/\s+/g, ' ').trim(), sum: document.querySelector('#sum-line').innerText.trim(), stored: localStorage.getItem('kontor-triage') }));
      eq(r.h1, '£2.8m across 15 contracts flagged as opportunities to investigate', 'headline after review');
      assert(r.sum.endsWith('= £2,795,238 £3,350,000 excluded after your review.'), `sum line: ${r.sum}`);
      assert(r.stored && r.stored.includes('F-C-005-overCap'), 'triage persisted');
      await t.page.reload(); await t.page.waitForSelector('#shell-main h1');
      assert((await t.page.evaluate(() => document.querySelector('#shell-main h1').innerText)).includes('£2.8m'), 'survives reload');
      await t.page.click('#probe-reset');
      await t.page.waitForFunction(() => document.querySelector('#shell-main h1').innerText.includes('£6.1m'));
      eq(await t.page.evaluate(() => localStorage.getItem('kontor-theme')), 'dark', 'reset keeps the theme');
    });
    await check('theme toggle re-themes the whole page (chart tokens too) and keeps the numbers', async () => {
      const bgDark = await t.page.evaluate(() => getComputedStyle(document.querySelector('.kviz-card')).borderTopColor);
      await t.page.click('button[aria-label*="theme" i], button[aria-pressed][aria-label]');
      await t.page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
      await t.page.waitForTimeout(120);
      const r = await t.page.evaluate(() => ({ border: getComputedStyle(document.querySelector('.kviz-card')).borderTopColor, h1: document.querySelector('#shell-main h1').innerText.replace(/\s+/g, ' ').trim() }));
      assert(r.border !== bgDark, 'chart tokens did not change with the theme');
      eq(r.h1, GOLDEN.h1, 'headline after toggle');
    });
    await check('kit useToast() and useUI().toast share one stack (AppFrame bridges them)', async () => {
      await t.page.click('#probe-toast');
      await t.page.waitForSelector('.kx-toasts [role="status"]:has-text("Kit toast shown.")');
      await t.page.click('button.shell__tab:has-text("Chat")');
      await t.page.waitForSelector('.kx-toasts [role="status"]:has-text("isn\'t part of this prototype")');
      eq(await t.page.locator('.kx-toasts').count(), 1, 'one toast region');
      eq(await t.page.locator('.kx-toasts [role="status"]').count(), 2, 'both toasts in the same stack');
      for (let i = 0; i < 2; i++) await t.page.click('.kx-toasts button.kx-toast__close >> nth=0');
    });
    await check('kit Drawer opens above the shell, traps focus, Esc closes it and focus returns to the opener', async () => {
      await t.page.click('#probe-drawer');
      await t.page.waitForSelector('[role="dialog"]');
      const r = await t.page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]').getBoundingClientRect();
        const top = document.elementFromPoint(d.left + 20, 20);
        return { onTop: !!top.closest('[role="dialog"], .kx-scrim'), insideDialog: document.activeElement.closest('[role="dialog"]') !== null };
      });
      assert(r.insideDialog && r.onTop, 'focus moved into the drawer and the drawer is above the shell');
      const v = await axe(t.page);
      assert(v.length === 0, 'axe with the drawer open: ' + v.map((x) => `${x.id}: ${x.targets.join(' | ')}`).join('\n'));
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('[role="dialog"]', { state: 'detached' });
      await t.page.waitForTimeout(60);
      eq(await t.page.evaluate(() => document.activeElement.id), 'probe-drawer', 'focus after Esc');
    });
    await t.ctx.close();
  }

  console.log('\nSnippets of docs/foundation-status.md, running in the real shell (tests/fixtures/int-snippets.jsx)');
  for (const theme of ['dark', 'light']) {
    const t = await h.newPage({ theme, dist: SNIP });
    await visit(t, '#/overview');
    await check(`${theme}: OpportunityList (19 ranked flags), RadarLanes, BulletList render from the estate; one h1, three h2; axe clean`, async () => {
      const r = await t.page.evaluate(() => ({
        h1: [...document.querySelectorAll('#shell-main h1')].map((x) => x.innerText),
        h2: [...document.querySelectorAll('#shell-main h2')].map((x) => x.innerText),
        opp: document.querySelectorAll('.kviz-bars [data-kviz-row], [aria-label*="Opportunities"] [data-kviz-row]').length,
        links: [...document.querySelectorAll('#shell-main .kviz-row__link, #shell-main [data-kviz-row]')].length,
      }));
      eq(r.h1, ['Foundation snippets'], 'h1'); eq(r.h2, ['Opportunities to investigate', 'Renewal radar', 'Cap vs spend'], 'h2');
      assert(r.links >= 19 + 12 + 9, `chart rows found: ${r.links}`);
      const v = await axe(t.page);
      assert(v.length === 0, v.map((x) => `${x.id} (${x.count}): ${x.targets.join(' | ')}`).join('\n'));
      eq(t.errors, [], 'console errors');
    });
    await check(`${theme}: a chart row opens the drawer through ?flag=, Esc closes it and removes the param, focus returns`, async () => {
      await t.page.click('[data-kviz-row] >> nth=0');
      await t.page.waitForSelector('[role="dialog"] #snip-reason');
      eq(await t.page.evaluate(() => location.hash), '#/overview?flag=F-C-005-overCap', 'hash');
      assert((await t.page.textContent('#snip-reason')).includes('£8,350,000'), 'drawer text from the estate');
      assert((await axe(t.page)).length === 0, 'axe with the drawer open');
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('[role="dialog"]', { state: 'detached' });
      eq(await t.page.evaluate(() => location.hash), '#/overview', 'param removed');
      await t.page.waitForTimeout(60);
      assert(await t.page.evaluate(() => !!document.activeElement.closest('[data-kviz-row]') || document.activeElement.hasAttribute('data-kviz-row')), 'focus returned to the row');
    });
    await t.ctx.close();
  }
} finally {
  await h.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) { failed.forEach((f) => console.log('  - ' + f.name)); process.exit(1); }
