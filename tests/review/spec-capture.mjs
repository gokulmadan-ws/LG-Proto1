// spec-capture: renders every route, overlay and toast in dark and light and stores what a user can read (text, headings, controls,
// attributes, svg text, banner geometry) in .scratch/spec/capture.json for spec-lint.mjs and the other spec-* scripts.
//   node tests/review/spec-capture.mjs            full capture (about 6 minutes, one browser, sequential)
//   node tests/review/spec-capture.mjs quick      routes and overlays only, dark and light (about 2 minutes)
import fs from 'node:fs';
import { T, ok, launch, visit, go, setTheme, VIEWPORTS, ROUTE_STATES, OVERLAY_STATES, captureState, CAPTURE_FN, seedStore, CAPTURE_FILE, data } from './spec-lib.mjs';

const quick = process.argv.includes('quick');
const extraOnly = process.argv.includes('extra');   // recapture only the toasts and the blocked-storage overlay, merge into the existing capture.json
const t0 = Date.now();
const h = await launch({ dist: process.env.KONTOR_DIST || null });
let all = [];
if (extraOnly) all = JSON.parse(fs.readFileSync(CAPTURE_FILE, 'utf8')).filter((c) => !/^toast-/.test(c.id) && c.id !== 'overlay-feedback-blocked');
const T1 = new T('spec-capture');

try {
  /* 1. routes and overlays in both themes (fresh page each) */
  if (extraOnly) {
    for (const theme of ['dark', 'light']) all.push(await captureState(h, OVERLAY_STATES.find((x) => x.id === 'overlay-feedback-blocked'), theme));
  }
  if (!extraOnly) for (const theme of ['dark', 'light']) {
    for (const st of [...ROUTE_STATES, ...OVERLAY_STATES]) {
      // contracts C-002.. in light add little; keep them but the theme loop is cheap enough
      const cap = await captureState(h, st, theme);
      all.push(cap);
    }
    console.log(theme, 'routes and overlays captured', all.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }

  /* 2. every flag drawer (dark), through in-app navigation on one page */
  const t = await h.newPage({ theme: 'dark' });
  if (!extraOnly) await visit(t, '#/opportunities');
  const types = ['overCap', 'nearCap', 'renewal', 'uplift'];
  let nflag = 0;
  if (!extraOnly) for (const c of data.contracts) for (const ty of types) {
    const id = `F-${c.id}-${ty}`;
    await go(t.page, '#/opportunities?flag=' + id);
    await t.page.waitForTimeout(220);
    const open = await t.page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    if (!open) continue;
    nflag += 1;
    await t.page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished))).catch(() => {});
    const cap = await t.page.evaluate(CAPTURE_FN, '[role="dialog"]');
    all.push({ id: 'flag-' + id, hash: '#/opportunities?flag=' + id, theme: 'dark', viewport: '1440x900', errors: [], ...cap });
  }
  console.log('flag drawers', nflag);
  if (!extraOnly) T1.check('flag drawers found (19 ranked + 2 watch)', () => { ok(nflag === 21, 'found ' + nflag); return String(nflag); });
  await t.ctx.close();

  /* 3. every source viewer page (336 extractions, dark) */
  if (!quick && !extraOnly) {
    const t2 = await h.newPage({ theme: 'dark' });
    await visit(t2, '#/source/C-005/X-C-005-maximumValue?from=opportunities');
    let n = 0;
    for (const x of data.extractions) {
      await go(t2.page, `#/source/${x.contractId}/${x.id}?from=contracts`);
      await t2.page.waitForTimeout(40);
      const cap = await t2.page.evaluate(CAPTURE_FN, '#shell-main');
      all.push({ id: 'source-' + x.id, hash: `#/source/${x.contractId}/${x.id}`, theme: 'dark', viewport: '1440x900', errors: [], ...cap });
      n += 1;
    }
    console.log('source pages', n);
    await t2.ctx.close();
  }

  /* 4. toasts: perform the action, read .kx-toast */
  const toast = async (id, hash, act, opts = {}) => {
    const tt = await h.newPage({ theme: 'dark', blockStorage: !!opts.blockStorage });
    try {
      await visit(tt, hash);
      if (opts.seed) { await seedStore(tt.page, opts.seed); await visit(tt, hash); }
      await act(tt.page);
      await tt.page.waitForSelector('.kx-toast', { timeout: 4000 });
      await tt.page.waitForTimeout(200);
      const texts = await tt.page.evaluate(() => [...document.querySelectorAll('.kx-toast')].map((e) => ({ text: e.innerText.replace(/\s+/g, ' ').trim(), cls: e.className })));
      all.push({ id: 'toast-' + id, hash, theme: 'dark', viewport: '1440x900', errors: [], title: '', text: texts.map((x) => x.text).join('\n'), toasts: texts, headings: [], controls: [], attrs: [], svgText: [], inputs: [] });
    } catch (e) { all.push({ id: 'toast-' + id, hash, theme: 'dark', error: String(e.message || e), text: '', toasts: [], headings: [], controls: [], attrs: [], svgText: [], inputs: [] }); }
    finally { await tt.ctx.close().catch(() => {}); }
  };
  const hdr = (name) => (p) => p.locator('header').getByRole('button', { name, exact: true }).first().click();
  for (const name of ['Apps', 'Chat', 'Notifications']) await toast('header-' + name.toLowerCase(), '#/overview', hdr(name));
  await toast('header-share', '#/overview', (p) => p.getByRole('button', { name: /^Share/ }).first().click());
  await toast('header-account', '#/overview', (p) => p.locator('header').getByRole('button', { name: /Marchbank|Account|MB/ }).first().click());
  await toast('header-close-tab', '#/opportunities', (p) => p.locator('header').getByRole('button', { name: /Close/ }).first().click());
  await toast('triage-explained', '#/opportunities?flag=F-C-005-overCap', async (p) => { await p.waitForSelector('[role="dialog"]'); const sel = p.locator('[role="dialog"] select, [role="dialog"] [role="combobox"]').first(); await sel.selectOption({ label: 'Explained' }); });
  await toast('match-confirm', '#/spend/matches', (p) => p.getByRole('button', { name: 'Confirm match' }).first().click());
  await toast('match-reject', '#/spend/matches', (p) => p.getByRole('button', { name: 'Reject match' }).first().click());
  await toast('handcheck-correct', '#/source/C-005/X-C-005-maximumValue', (p) => p.getByRole('button', { name: 'Mark answer as correct' }).click());
  await toast('handcheck-incorrect', '#/source/C-005/X-C-005-maximumValue', (p) => p.getByRole('button', { name: 'Mark answer as incorrect' }).click());
  await toast('feedback-saved', '#/overview', async (p) => { await p.getByRole('button', { name: 'Give feedback' }).first().click(); await p.waitForSelector('[role="dialog"]'); await p.getByLabel('Yes').check({ force: true }).catch(async () => { await p.locator('[role="dialog"] label', { hasText: 'Yes' }).first().click(); }); await p.getByRole('button', { name: 'Save feedback' }).click(); });
  await toast('reset-done', '#/overview', async (p) => { await p.getByRole('button', { name: 'Settings', exact: true }).click(); await p.waitForSelector('[role="dialog"]'); await p.getByRole('button', { name: 'Reset demo changes' }).click(); await p.waitForTimeout(250); await p.getByRole('button', { name: 'Reset changes' }).click(); });
  await toast('export-opportunities', '#/opportunities', async (p) => { await p.getByRole('button', { name: 'Export opportunities' }).click(); });
  console.log('toasts', all.filter((x) => x.id.startsWith('toast-')).map((x) => x.id + (x.error ? ' ERR' : '')).join(', '));

  fs.writeFileSync(CAPTURE_FILE, JSON.stringify(all));
  T1.check('capture written', () => { ok(all.length > 150 || extraOnly, 'only ' + all.length + ' states'); return all.length + ' states, ' + ((Date.now() - t0) / 1000).toFixed(0) + 's'; });
} finally { await h.close(); }
T1.finish();
