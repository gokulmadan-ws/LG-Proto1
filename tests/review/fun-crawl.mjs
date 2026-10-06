// fun-crawl: every <a>, <button>, menu item, summary, select and text input on every route and overlay is clicked in a FRESH page.
// A control must have a visible effect (route change, overlay, toast, state, focus, download, popup) with no console error, no request off the
// origin and no navigation to an unknown route. External links are checked for target and rel and opened as popups with the network aborted.
//   node tests/review/fun-crawl.mjs            all states (about 10 minutes)
//   node tests/review/fun-crawl.mjs spend      only the states whose label contains "spend"
import fs from 'node:fs';
import path from 'node:path';
import { T, ok, eq, text, settle, launchApp, visit, go, externalRequests, SCRATCH } from './fun-lib.mjs';

const only = process.argv.slice(2);
const t = new T('fun-crawl');
const h = await launchApp();

/* The states to crawl: label, address, optional open() that opens an overlay, scope (css selector the controls live in). */
const gear = (page) => page.getByRole('button', { name: 'Settings', exact: true }).click();
const STATES = [
  { label: 'overview', hash: '#/overview' },
  { label: 'opportunities', hash: '#/opportunities' },
  { label: 'opportunities-reviewed-seeded', hash: '#/opportunities?status=all', seed: { 'kontor-triage': { 'F-C-005-overCap': 'explained' } } },
  { label: 'renewals', hash: '#/renewals' },
  { label: 'spend', hash: '#/spend' },
  { label: 'spend-matches', hash: '#/spend/matches' },
  { label: 'spend-no-contract', hash: '#/spend/no-contract' },
  { label: 'contracts', hash: '#/contracts' },
  ...['C-001', 'C-003', 'C-005', 'C-007', 'C-009', 'C-011', 'C-018'].map((id) => ({ label: 'contract-' + id, hash: '#/contracts/' + id })),
  { label: 'source-C-005', hash: '#/source/C-005/X-C-005-maximumValue?from=opportunities' },
  { label: 'source-C-003-notfound-cap', hash: '#/source/C-003/X-C-003-maximumValue?from=contracts' },
  { label: 'source-missing', hash: '#/source/C-005/not-an-id' },
  { label: 'method', hash: '#/method' },
  { label: 'roadmap', hash: '#/roadmap' },
  { label: 'evidence', hash: '#/evidence' },
  { label: 'notfound', hash: '#/nope' },
  { label: 'overlay-flag-drawer', hash: '#/opportunities?flag=F-C-005-overCap', scope: '[role="dialog"].flag-drawer' },
  { label: 'overlay-flag-drawer-renewal', hash: '#/renewals?flag=F-C-018-renewal', scope: '[role="dialog"].flag-drawer' },
  { label: 'overlay-payments-drawer', hash: '#/spend?payments=C-005', scope: '[role="dialog"]' },
  { label: 'overlay-payments-drawer-annual', hash: '#/spend?payments=C-011', scope: '[role="dialog"]' },
  { label: 'overlay-payee-drawer', hash: '#/spend/no-contract?payee=Dunmoor%20Agency%20Staffing%20Ltd', scope: '[role="dialog"]' },
  { label: 'overlay-about', hash: '#/overview', open: (p) => p.getByRole('button', { name: 'About this data' }).click(), scope: '[role="dialog"]' },
  { label: 'overlay-feedback', hash: '#/overview', open: (p) => p.getByRole('button', { name: 'Give feedback' }).click(), scope: '[role="dialog"]' },
  { label: 'overlay-feedback-saved', hash: '#/overview', seed: { 'kontor-feedback': [{ at: '2026-10-06T10:00:00.000Z', answer: 'maybe', comment: 'x', asOf: '2026-10-06' }] }, open: (p) => p.getByRole('button', { name: 'Give feedback' }).click(), scope: '[role="dialog"]' },
  { label: 'overlay-settings', hash: '#/overview', open: gear, scope: '[role="dialog"]' },
  { label: 'overlay-demo-guide', hash: '#/overview', open: (p) => p.getByRole('button', { name: 'Open demo guide' }).click(), scope: '[role="dialog"]' },
  { label: 'overlay-menu', hash: '#/overview', open: (p) => p.locator('nav[aria-label="Primary"] button[aria-label="Menu"]').click(), scope: 'nav[aria-label="Menu"]' },
  { label: 'shell-overview', hash: '#/overview', scope: 'body > *', shell: true },
  { label: 'shell-contract', hash: '#/contracts/C-005', scope: 'body > *', shell: true },
];

const ENUM = `(scope, shell) => {
  const SEL = 'a[href], button, [role="button"], [role="menuitem"], summary, select, input:not([type="hidden"]), textarea';
  const roots = scope ? [...document.querySelectorAll(scope)] : [document.getElementById('shell-main')];
  const out = [];
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[inert]') && !(cs.clip && cs.clip !== 'auto' && r.width <= 1); };
  for (const root of roots) for (const el of root.querySelectorAll(SEL)) {
    if (!shell && el.closest('header.shell__header, nav.shell__rail, .sample-banner, .shell__skip, .shell__bottombar, .kx-toasts')) continue;
    if (shell && !el.closest('header.shell__header, nav.shell__rail, .sample-banner, .shell__skip, .shell__bottombar')) continue;
    if (!visible(el) && !(shell && el.classList.contains('shell__skip'))) continue;
    const det = el.closest('details');
    if (det && !det.open && !(el.tagName === 'SUMMARY' && el.parentElement === det)) continue;      // content of a closed disclosure is not user-reachable
    if (el.tagName === 'A' && el.getAttribute('aria-current') === 'page') continue;                  // the current-page breadcrumb item is not a control
    out.push(el);
  }
  return [...new Set(out)];
}`;
const describe = (el) => ({
  tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', href: el.getAttribute('href') || '', target: el.getAttribute('target') || '', rel: el.getAttribute('rel') || '',
  name: (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 70),
  disabled: el.disabled || el.getAttribute('aria-disabled') === 'true', role: el.getAttribute('role') || '',
});
const FP = () => {
  const q = (s) => [...document.querySelectorAll(s)];
  const main = document.getElementById('shell-main');
  const store = {}; try { for (const k of Object.keys(localStorage)) store[k] = localStorage.getItem(k); } catch (e) { /* ignore */ }
  const a = document.activeElement;
  return JSON.stringify({
    hash: location.hash, main: main ? main.innerText : '', overlays: q('[role=dialog],[role=alertdialog],[role=menu],.kx-toast,[role=status]').map((e) => e.innerText), store,
    theme: document.documentElement.getAttribute('data-theme'), active: a ? [a.tagName, a.getAttribute('aria-label'), (a.textContent || '').slice(0, 30), a.id].join('|') : '',
    checks: q('input').map((i) => (i.checked ? '1' : '0') + (i.value || '')).join(','),
    states: q('[aria-pressed],[aria-expanded],[aria-checked],[aria-selected],details').map((e) => (e.getAttribute('aria-pressed') || '') + (e.getAttribute('aria-expanded') || '') + (e.getAttribute('aria-checked') || '') + (e.getAttribute('aria-selected') || '') + (e.open ? 'o' : '')).join(','),
    scroll: main ? main.scrollTop : 0, docScroll: window.scrollY,
  });
};

const results = [];
const origin = new URL(h.url).origin;

const INIT = `window.__enum = ${ENUM}; window.__describe = ${describe.toString()}; window.__clip = null; try { const o = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (s) => { window.__clip = s; return o(s); }; } catch (e) {}`;

/** A brand-new browser context for every control: nothing carries over (storage, focus, scroll, overlays). */
async function fresh(st) {
  const p = await h.newPage({ theme: 'dark' });
  const { page, ctx } = p;
  await ctx.route((u) => u.origin !== origin && !/^(data|blob|about)/.test(u.protocol), (route) => route.abort());
  p.popups = []; p.downloads = 0;
  ctx.on('page', (np) => p.popups.push(np));
  page.on('download', () => { p.downloads += 1; });
  await ctx.addInitScript({ content: INIT });
  if (st.seed) await ctx.addInitScript((seed) => { try { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v)); } } catch (e) {} }, st.seed);
  await visit(p, st.hash);
  await settle(page, 200);
  if (st.open) { await st.open(page); await page.waitForTimeout(450); }
  return p;
}

for (const st of STATES) {
  if (only.length && !only.some((o) => st.label.includes(o))) continue;
  let p = await fresh(st);
  const shellFlag = !!st.shell;
  const list = await p.page.evaluate(({ scope, shell }) => window.__enum(scope, shell).map((el) => window.__describe(el)), { scope: st.scope || null, shell: shellFlag });
  await p.ctx.close();
  const counts = { ok: 0, self: 0, ext: 0, disabled: 0, bad: 0 };
  for (let i = 0; i < list.length; i += 1) {
    const d = list[i];
    const rec = { state: st.label, i, ...d };
    if (d.disabled) { rec.verdict = 'disabled'; counts.disabled += 1; results.push(rec); continue; }
    const external = /^https?:/i.test(d.href);
    p = await fresh(st);
    const { page } = p;
    const errBefore = p.errors.length; const reqBefore = p.requests.length;
    const handle = await page.evaluateHandle(({ scope, shell, i }) => window.__enum(scope, shell)[i], { scope: st.scope || null, shell: shellFlag, i });
    const el = handle.asElement();
    if (!el) { rec.verdict = 'gone'; results.push(rec); await p.ctx.close(); continue; }
    const same = await el.evaluate((e, mine) => (e.getAttribute('aria-label') || e.innerText || e.value || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 70) === mine, d.name);
    if (!same) { rec.verdict = 'unstable-order'; results.push(rec); await p.ctx.close(); continue; }
    const before = await page.evaluate(FP);
    const hashBefore = await page.evaluate(() => location.hash);
    p.downloads = 0; p.popups.length = 0;
    try {
      if (d.tag === 'select') {
        const opts = await el.evaluate((s) => [...s.options].map((o) => o.value));
        const cur = await el.evaluate((s) => s.value);
        await el.selectOption(opts.find((v) => v !== cur), { timeout: 4000 });
      } else if (d.tag === 'input' && !/^(checkbox|radio|button|submit)$/.test(d.type)) {
        await el.fill('zz', { timeout: 4000 });
      } else if (d.tag === 'textarea') {
        await el.fill('zz', { timeout: 4000 });
      } else if (d.href === '#shell-main') {
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
        await page.keyboard.press('Tab');
        if (!(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('shell__skip')))) throw new Error('the skip link is not the first Tab stop');
        await page.keyboard.press('Enter');
      } else if (d.tag === 'input' && /^(checkbox|radio)$/.test(d.type)) {
        const lab = await el.evaluateHandle((e) => e.closest('label') || e.nextElementSibling || e.parentElement);
        await lab.asElement().click({ timeout: 4000 });          // a real person clicks the visible label or switch, not the visually hidden input
      } else {
        await el.click({ timeout: 4000 });
      }
    } catch (e) {
      rec.verdict = 'unclickable'; rec.why = String(e.message).split('\n')[0].slice(0, 160); counts.bad += 1; results.push(rec); await p.ctx.close(); continue;
    }
    await page.waitForTimeout(external ? 700 : 380);
    const after = await page.evaluate(FP).catch(() => '');
    const hashAfter = await page.evaluate(() => location.hash).catch(() => '');
    const clip = await page.evaluate(() => window.__clip).catch(() => null);
    const changed = before !== after || p.downloads > 0 || p.popups.length > 0 || !!clip;
    const newErrors = p.errors.slice(errBefore).filter((e) => !/net::ERR_FAILED|ERR_BLOCKED|aborted/i.test(e));
    const newExt = externalRequests(p).filter((r) => p.requests.indexOf(r) >= reqBefore).map((r) => r.url);
    const verdicts = [];
    if (external) {
      if (d.target !== '_blank') verdicts.push('external link without target=_blank');
      if (!/noopener/.test(d.rel) || !/noreferrer/.test(d.rel)) verdicts.push('external link without rel=noopener noreferrer');
      if (!p.popups.length) verdicts.push('external link did not open a new tab');
      for (const np of p.popups) { rec.popup = np.url(); await np.close().catch(() => {}); }
      if (hashAfter !== hashBefore) verdicts.push('external link navigated the app');
      rec.verdict = verdicts.length ? 'bad' : 'ext';
    } else {
      if (!changed) {
        const target = d.href.startsWith('#') ? d.href : '';
        if (target && (target === hashBefore || target === '#' + hashBefore.replace(/^#/, ''))) rec.verdict = 'self';
        else verdicts.push('no visible effect');
      }
      if (hashAfter !== hashBefore) {
        const heading = await page.locator('#shell-main h1').first().innerText().catch(() => '');
        if (/Page not found/.test(heading) && !/^#\/nope/.test(hashBefore)) verdicts.push('navigated to Page not found: ' + hashAfter);
        if (!/^#\/source/.test(hashBefore) && /This page isn't in the sample|Contract not found/.test(heading)) verdicts.push('navigated to an empty state: ' + hashAfter + ' ' + heading);
        rec.to = hashAfter;
      }
      if (!rec.verdict) rec.verdict = verdicts.length ? 'bad' : 'ok';
    }
    if (newErrors.length) { verdicts.push('console errors: ' + newErrors.join(' | ').slice(0, 200)); rec.verdict = 'bad'; }
    if (newExt.length) { verdicts.push('external requests: ' + newExt.join(' ').slice(0, 200)); rec.verdict = 'bad'; }
    if (verdicts.length) rec.why = verdicts.join('; ');
    counts[rec.verdict === 'bad' ? 'bad' : rec.verdict === 'self' ? 'self' : rec.verdict === 'ext' ? 'ext' : 'ok'] += 1;
    results.push(rec);
    await p.ctx.close();
  }
  console.log(`state ${st.label}: ${list.length} controls  ok=${counts.ok} self=${counts.self} ext=${counts.ext} disabled=${counts.disabled} bad=${counts.bad}`);
}

fs.writeFileSync(path.join(SCRATCH, 'crawl.json'), JSON.stringify(results, null, 1));
const bad = results.filter((r) => ['bad', 'unclickable', 'gone', 'unstable-order'].includes(r.verdict));
const dead = bad.filter((r) => /no visible effect/.test(r.why || ''));
console.log(`\ncrawl: ${results.length} controls, ${results.filter((r) => r.verdict === 'ok').length} ok, ${results.filter((r) => r.verdict === 'self').length} self-links, ${results.filter((r) => r.verdict === 'ext').length} external ok, ${results.filter((r) => r.verdict === 'disabled').length} disabled, ${bad.length} problems`);
for (const b of bad) console.log(`PROBLEM [${b.state}] <${b.tag}${b.type ? ' ' + b.type : ''}> "${b.name}" ${b.href} -> ${b.verdict}: ${b.why || ''}`);
await t.check(`every crawled control has a visible effect, no console errors, no off-origin requests, no unknown routes (${results.length} controls)`, async () => { ok(bad.length === 0, bad.length + ' problem controls (see PROBLEM lines)'); });
const hrefs = new Set(results.filter((r) => r.href.startsWith('#/')).map((r) => r.href));
console.log('unique internal hrefs followed: ' + hrefs.size);
await h.close();
t.finish();
