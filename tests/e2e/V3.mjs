// V3 end-to-end: the Source viewer (R54 to R59, R12 label, R47) and the Method page (R65, R66, R10, R47).
//   KONTOR_DIST=.scratch/V3 node tests/e2e/V3.mjs        against the isolated V3 build
//   node tests/e2e/V3.mjs                                 against dist/ (the real app)
// Prints 'ok   <name>' / 'FAIL <name>: <why>' and exits non-zero on any failure.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, setTheme, axe, externalRequests, VIEWPORTS } from '../lib/harness.mjs';
import { DEFAULTS } from '../../src/lib/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const data = JSON.parse(readFileSync(path.join(ROOT, 'src/data/sample.json'), 'utf8'));
const DIST = process.env.KONTOR_DIST || null;

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed += 1; console.log(`FAIL ${name}: ${e && e.message ? e.message : e}`); }
}
const must = (cond, why) => { if (!cond) throw new Error(why); };
const eq = (a, b, what) => must(a === b, `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const sourceHash = (x, from) => `#/source/${x.contractId}/${x.id}${from ? `?from=${from}` : ''}`;
const byId = Object.fromEntries(data.extractions.map((x) => [x.id, x]));
const MAX = byId['X-C-005-maximumValue'];

/** Wait until the Source page for this extraction has rendered its cited block. */
async function waitSource(page, id) {
  await page.waitForFunction((i) => !!document.querySelector(`mark[data-extraction-id="${i}"]`), id, { timeout: 8000 });
  await page.waitForTimeout(120);
}
const inMain = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s), main = document.getElementById('shell-main');
  if (!el || !main) return { ok: false, why: 'missing' };
  const r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
  return { ok: r.top >= m.top - 1 && r.bottom <= m.bottom + 1, top: r.top, bottom: r.bottom, mTop: m.top, mBottom: m.bottom };
}, sel);

const h = await launch({ dist: DIST });
try {
  /* ============================================================ Source viewer: the demo target */
  const t = await h.newPage({ theme: 'dark' });
  await visit(t, sourceHash(MAX, 'opportunities'));
  await waitSource(t.page, MAX.id);

  await check('R54 X-C-005-maximumValue shows Page 23 of 70, Clause 14.3 and the document title', async () => {
    const text = await t.page.evaluate(() => document.getElementById('shell-main').innerText);
    must(text.includes('Page 23 of 70'), 'no "Page 23 of 70"');
    must(text.includes('Clause 14.3'), 'no "Clause 14.3"');
    must(text.includes('Highways reactive maintenance and minor works: agreement'), 'no document title');
    eq(await t.page.locator('#shell-main h1').count(), 1, 'h1 count');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Clause 14.3', 'h1');
    eq(await t.page.locator('[data-testid="source-page-of"]').innerText(), '23 of 70', 'panel page');
    eq(await t.page.locator('[data-testid="source-document"]').innerText(), 'Highways reactive maintenance and minor works: agreement', 'panel document title');
  });

  await check('R54 highlighted text equals the quote, the answer is in plain words, the illustrative label is shown', async () => {
    eq(await t.page.locator('mark').innerText(), MAX.provenance[0].quote, 'mark text');
    eq(await t.page.locator('[data-testid="source-quote"]').innerText(), MAX.provenance[0].quote, 'blockquote text');
    eq(await t.page.locator('[data-testid="source-answer"]').innerText(), '£5,000,000 for the whole term (stated maximum)', 'answer');
    const text = await t.page.evaluate(() => document.getElementById('shell-main').innerText);
    must(text.includes('Illustrative contract text written for this demo, not a real document.'), 'no illustrative label (R12)');
    must(text.includes('Cited clause'), 'no visible "Cited clause" label');
  });

  await check('R54 only the cited block is highlighted, with a 2px accent outline and a tint', async () => {
    eq(await t.page.locator('.src-paper mark').count(), 1, 'mark count');
    const st = await t.page.evaluate(() => { const m = document.querySelector('mark'); const c = getComputedStyle(m); return { w: c.outlineWidth, s: c.outlineStyle, bg: c.backgroundColor }; });
    eq(st.w, '2px', 'outline width'); eq(st.s, 'solid', 'outline style');
    must(st.bg && st.bg !== 'rgba(0, 0, 0, 0)', 'no tint');
    // no coloured left border on the quote
    const bq = await t.page.evaluate(() => { const c = getComputedStyle(document.querySelector('blockquote')); return [c.borderLeftWidth, c.borderTopWidth]; });
    eq(bq[0], bq[1], 'blockquote has a uniform border (no left-border accent)');
  });

  await check('R54 the cited block is scrolled into view and the mark has focus (full load)', async () => {
    const v = await inMain(t.page, 'mark');
    must(v.ok, `mark not within the content area: ${JSON.stringify(v)}`);
    const focused = await t.page.evaluate(() => document.activeElement && document.activeElement.tagName === 'MARK');
    must(focused, 'mark does not have focus');
  });

  await check('R54 title and rail: tab title is the clause, rail keeps Opportunities (and the origin when ?from= says so)', async () => {
    eq(await t.page.title(), 'Clause 14.3 | Kontor financial layer', 'document.title');
    const rail = () => t.page.evaluate(() => { const e = document.querySelector('nav[aria-label="Primary"] [aria-current="page"]'); return e ? e.getAttribute('aria-label') : null; });
    eq(await rail(), 'Opportunities', 'rail item');
    await go(t.page, sourceHash(MAX, 'renewals')); await waitSource(t.page, MAX.id);
    eq(await rail(), 'Renewal radar', 'rail item for from=renewals');
    await go(t.page, sourceHash(MAX, 'opportunities')); await waitSource(t.page, MAX.id);
  });

  await check('R54 the page has no primary button (every button on it is an outline button)', async () => {
    const filled = await t.page.$$eval('#shell-main button', (bs) => bs.filter((b) => { const c = getComputedStyle(b).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'; }).map((b) => b.textContent.trim()));
    eq(filled.join(','), '', 'buttons with a filled background');
  });

  await check('R54 at 1440x900 the answer panel stays in view while you read the page (sticky), with every control reachable', async () => {
    await t.page.evaluate(() => { document.getElementById('shell-main').scrollTop = 0; });
    await t.page.waitForTimeout(150);
    for (const y of [0, 250, 600]) {
      await t.page.evaluate((top) => { document.getElementById('shell-main').scrollTop = top; }, y);
      await t.page.waitForTimeout(120);
      const r = await t.page.evaluate(() => { const p = document.querySelector('.src-panel').getBoundingClientRect(), b = [...document.querySelectorAll('.src-panel button')].pop().getBoundingClientRect(), m = document.getElementById('shell-main').getBoundingClientRect(); return { top: p.top - m.top, bottom: b.bottom, mBottom: m.bottom }; });
      if (y >= 250) must(r.top <= 90 && r.top >= 0 && r.bottom <= r.mBottom, `panel not pinned at scroll ${y}: ${JSON.stringify(r)}`);
    }
    await t.page.evaluate(() => { document.getElementById('shell-main').scrollTop = 0; });
  });

  await check('R54 landing by in-app navigation also centres and focuses the mark (after the router moves focus to the h1)', async () => {
    await go(t.page, '#/method');
    await go(t.page, sourceHash(byId['X-C-001-noticePeriod'], 'renewals'));
    await waitSource(t.page, 'X-C-001-noticePeriod');
    await t.page.waitForTimeout(300);
    const v = await inMain(t.page, 'mark');
    must(v.ok, `mark not within the content area: ${JSON.stringify(v)}`);
    must(await t.page.evaluate(() => document.activeElement && document.activeElement.tagName === 'MARK'), 'mark does not have focus after in-app navigation');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Clause 31.1', 'h1');
    must(/page 28 of /.test(await t.page.locator('#shell-main').innerText()), 'C-001 notice clause is on page 28');
  });

  await check('R54 Back to opportunity returns to the originating route (opportunities, renewals)', async () => {
    await go(t.page, sourceHash(MAX, 'opportunities')); await waitSource(t.page, MAX.id);
    await t.page.getByRole('button', { name: 'Back to opportunity' }).click();
    await t.page.waitForFunction(() => location.hash === '#/opportunities');
    await go(t.page, sourceHash(MAX, 'renewals')); await waitSource(t.page, MAX.id);
    await t.page.getByRole('button', { name: 'Back to renewal radar' }).click();
    await t.page.waitForFunction(() => location.hash === '#/renewals');
    await go(t.page, sourceHash(MAX)); await waitSource(t.page, MAX.id);          // no ?from=: defaults to opportunities
    await t.page.getByRole('button', { name: 'Back to opportunity' }).click();
    await t.page.waitForFunction(() => location.hash === '#/opportunities');
  });

  await check('R54 Open contract goes to the contract', async () => {
    await go(t.page, sourceHash(MAX, 'opportunities')); await waitSource(t.page, MAX.id);
    await t.page.getByRole('button', { name: 'Open contract' }).click();
    await t.page.waitForFunction(() => location.hash === '#/contracts/C-005');
  });

  await check('R54 breadcrumb has hash hrefs: Opportunities / contract title / clause', async () => {
    await go(t.page, sourceHash(MAX, 'opportunities')); await waitSource(t.page, MAX.id);
    const crumbs = await t.page.$$eval('nav[aria-label="Breadcrumb"] a', (as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    eq(crumbs.length, 3, 'crumb count');
    eq(crumbs[0][0], 'Opportunities', 'crumb 1'); eq(crumbs[0][1], '#/opportunities', 'crumb 1 href');
    eq(crumbs[1][0], 'Highways reactive maintenance and minor works', 'crumb 2'); eq(crumbs[1][1], '#/contracts/C-005', 'crumb 2 href');
    eq(crumbs[2][0], 'Clause 14.3', 'crumb 3');
    must(crumbs.every((c) => c[1].startsWith('#/')), 'every crumb has a hash href');
  });

  await check('R57 Previous answer and Next answer step through the contract answers in Q1 to Q9 order and update the hash', async () => {
    const order = [];
    for (const q of data.questions) for (const f of q.fields) order.push(`X-C-005-${f}`);
    eq(order.length, 14, 'fields');
    const start = order.indexOf('X-C-005-maximumValue');
    await go(t.page, sourceHash(MAX, 'spend')); await waitSource(t.page, MAX.id);
    eq(await t.page.locator('.src-stepper__count').innerText(), `Answer ${start + 1} of ${order.length}`, 'counter');
    await t.page.getByRole('button', { name: 'Next answer' }).click();
    await t.page.waitForFunction((id) => location.hash.startsWith(`#/source/C-005/${id}`), order[start + 1]);
    must((await t.page.evaluate(() => location.hash)).endsWith('?from=spend'), 'from is kept when stepping');
    await waitSource(t.page, order[start + 1]);
    await t.page.getByRole('button', { name: 'Previous answer' }).click();
    await t.page.waitForFunction((id) => location.hash.startsWith(`#/source/C-005/${id}`), order[start]);
    await t.page.getByRole('button', { name: 'Previous answer' }).click();
    await t.page.waitForFunction((id) => location.hash.startsWith(`#/source/C-005/${id}`), order[start - 1]);
    await t.page.getByRole('button', { name: 'Previous answer' }).click();
    await t.page.waitForFunction((id) => location.hash.startsWith(`#/source/C-005/${id}`), order[0]);
    await waitSource(t.page, order[0]);
    must(await t.page.getByRole('button', { name: 'Previous answer' }).isDisabled(), 'Previous is disabled on the first answer');
    await go(t.page, `#/source/C-005/${order[order.length - 1]}`); await waitSource(t.page, order[order.length - 1]);
    must(await t.page.getByRole('button', { name: 'Next answer' }).isDisabled(), 'Next is disabled on the last answer');
  });

  await check('R59 hand-check persists across a reload, switches, clears, and the count updates', async () => {
    const t2 = await h.newPage({ theme: 'dark' });
    await visit(t2, sourceHash(MAX, 'opportunities')); await waitSource(t2.page, MAX.id);
    const correct = t2.page.getByRole('button', { name: 'Mark answer as correct' });
    const incorrect = t2.page.getByRole('button', { name: 'Mark answer as incorrect' });
    eq(await correct.getAttribute('aria-pressed'), 'false', 'correct unpressed at start');
    await correct.click();
    eq(await correct.getAttribute('aria-pressed'), 'true', 'correct pressed');
    await t2.page.waitForSelector('.kx-toast', { timeout: 3000 });
    must((await t2.page.locator('.kx-toast').first().innerText()).includes('Answer marked correct.'), 'toast text');
    must((await t2.page.locator('[data-testid="source-handcheck"]').innerText()).includes('1 of 336 answers checked by hand'), 'count after marking');
    const stored = await t2.page.evaluate(() => localStorage.getItem('kontor-handcheck'));
    eq(JSON.parse(stored)[MAX.id], 'correct', 'kontor-handcheck');
    await visit(t2, sourceHash(MAX, 'opportunities')); await waitSource(t2.page, MAX.id);
    eq(await t2.page.getByRole('button', { name: 'Mark answer as correct' }).getAttribute('aria-pressed'), 'true', 'pressed after reload');
    await t2.page.getByRole('button', { name: 'Mark answer as incorrect' }).click();
    eq(JSON.parse(await t2.page.evaluate(() => localStorage.getItem('kontor-handcheck')))[MAX.id], 'incorrect', 'switched to incorrect');
    eq(await t2.page.getByRole('button', { name: 'Mark answer as correct' }).getAttribute('aria-pressed'), 'false', 'correct released');
    await t2.page.getByRole('button', { name: 'Mark answer as incorrect' }).click();
    eq(await t2.page.evaluate(() => localStorage.getItem('kontor-handcheck')), '{}', 'cleared');
    must((await t2.page.locator('[data-testid="source-handcheck"]').innerText()).includes('0 of 336 answers checked by hand'), 'count after clearing');
    must(t2.errors.length === 0, 'console errors: ' + t2.errors.join(' | '));
    await t2.ctx.close();
  });

  await check('R59 hand-check survives blocked storage for the session (no crash)', async () => {
    const t3 = await h.newPage({ blockStorage: true });
    await visit(t3, sourceHash(MAX, 'opportunities')); await waitSource(t3.page, MAX.id);
    await t3.page.getByRole('button', { name: 'Mark answer as correct' }).click();
    eq(await t3.page.getByRole('button', { name: 'Mark answer as correct' }).getAttribute('aria-pressed'), 'true', 'pressed with storage blocked');
    must(t3.errors.filter((e) => !/localStorage|insecure/i.test(e)).length === 0, 'console errors: ' + t3.errors.join(' | '));
    await t3.ctx.close();
  });

  await check('R56 missing extraction, wrong contract, unknown contract: the 7.9 copy and an Open contract button, no crash', async () => {
    const t4 = await h.newPage({ theme: 'dark' });
    await visit(t4, '#/source/C-005/not-an-id');
    eq((await t4.page.locator('#shell-main h1').innerText()).trim(), "This page isn't in the sample.", 'h1');
    const txt = await t4.page.locator('#shell-main').innerText();
    must(txt.includes('The sample includes only the pages that hold an extracted clause. Open the contract to see its other answers.'), 'body copy');
    eq(await t4.page.locator('mark').count(), 0, 'no mark');
    await t4.page.getByRole('button', { name: 'Open contract' }).click();
    await t4.page.waitForFunction(() => location.hash === '#/contracts/C-005');
    await visit(t4, '#/source/C-001/X-C-005-maximumValue');                        // extraction of another contract
    eq((await t4.page.locator('#shell-main h1').innerText()).trim(), "This page isn't in the sample.", 'mismatch h1');
    await visit(t4, '#/source/ZZZ-999/X-ZZZ-999-endDate');
    eq((await t4.page.locator('#shell-main h1').innerText()).trim(), "This page isn't in the sample.", 'unknown contract h1');
    await t4.page.getByRole('button', { name: 'Open contracts' }).click();
    await t4.page.waitForFunction(() => location.hash === '#/contracts');
    await visit(t4, '#/source');
    eq((await t4.page.locator('#shell-main h1').innerText()).trim(), "This page isn't in the sample.", 'no ids h1');
    must(t4.errors.length === 0, 'console errors: ' + t4.errors.join(' | '));
    await t4.ctx.close();
  });

  await check('R55 for ALL 336 extractions the highlighted block text equals the quote exactly (one mark, right clause, right page)', async () => {
    const t5 = await h.newPage({ theme: 'dark' });
    await visit(t5, sourceHash(data.extractions[0], 'contracts'));
    await waitSource(t5.page, data.extractions[0].id);
    const items = data.extractions.map((x) => ({ id: x.id, cid: x.contractId, quote: x.provenance[0].quote, ref: x.provenance[0].clauseRef, page: x.provenance[0].page, count: data.documents[x.provenance[0].documentId].pageCount }));
    const bad = await t5.page.evaluate(async (list) => {
      const out = [];
      const wait = (id) => new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => {
          const m = document.querySelector(`mark[data-extraction-id="${id}"]`);
          if (m && document.activeElement === m) return resolve(true);
          if (performance.now() - t0 > 3000) return resolve(!!m);
          requestAnimationFrame(tick);
        };
        tick();
      });
      for (const it of list) {
        location.hash = `#/source/${it.cid}/${it.id}?from=contracts`;
        await wait(it.id);
        const marks = document.querySelectorAll('.src-paper mark');
        const m = marks[0];
        const h1 = document.querySelector('#shell-main h1');
        const pageOf = document.querySelector('[data-testid="source-page-of"]');
        const why = [];
        if (marks.length !== 1) why.push(`marks=${marks.length}`);
        else if (m.textContent !== it.quote) why.push('text differs');
        if (!h1 || h1.textContent.trim() !== it.ref) why.push(`h1=${h1 && h1.textContent}`);
        if (!pageOf || pageOf.textContent.trim() !== `${it.page} of ${it.count}`) why.push(`page=${pageOf && pageOf.textContent}`);
        if (document.querySelector('[data-testid="source-quote"]').textContent !== it.quote) why.push('blockquote differs');
        if (why.length) out.push(`${it.id}: ${why.join(', ')}`);
      }
      return out;
    }, items);
    eq(items.length, 336, 'extractions checked');
    must(bad.length === 0, `${bad.length} failures, first: ${bad.slice(0, 3).join(' | ')}`);
    must(t5.errors.length === 0, 'console errors: ' + t5.errors.join(' | '));
    await t5.ctx.close();
  });

  await check('R54 keyboard: the mark has focus on arrival, Tab moves to the answer controls in order, focus is visible', async () => {
    const t6 = await h.newPage({ theme: 'dark' });
    await visit(t6, sourceHash(MAX, 'opportunities')); await waitSource(t6.page, MAX.id); await t6.page.waitForTimeout(200);
    must(await t6.page.evaluate(() => document.activeElement.tagName === 'MARK'), 'mark focused');
    const name = () => t6.page.evaluate(() => { const e = document.activeElement; return (e.getAttribute('aria-label') || e.textContent || '').trim(); });
    // after the cited clause the next stops are the hand-check buttons (the page text has no tab stops)
    const after = [];
    for (let i = 0; i < 2; i += 1) { await t6.page.keyboard.press('Tab'); after.push(await name()); }
    eq(after.join(' | '), 'Mark answer as correct | Mark answer as incorrect', 'tab order after the mark');
    // before it: the toolbar, in reading order, ending on Next answer
    await t6.page.getByRole('button', { name: 'Back to opportunity' }).focus();
    const bar = [await name()];
    for (let i = 0; i < 3; i += 1) { await t6.page.keyboard.press('Tab'); bar.push(await name()); }
    eq(bar.join(' | '), 'Back to opportunity | Open contract | Previous answer | Next answer', 'toolbar tab order');
    const ring = await t6.page.evaluate(() => { const c = getComputedStyle(document.activeElement); return [c.outlineStyle, c.outlineWidth]; });
    must(ring[0] !== 'none' && ring[1] !== '0px', `no visible focus ring on a button: ${ring}`);
    // Enter on a focused answer button works from the keyboard
    await t6.page.keyboard.press('Enter');
    await t6.page.waitForFunction(() => location.hash.includes('X-C-005-startDate'));
    await t6.ctx.close();
  });

  /* ============================================================ Method page */
  const IDS = ['as-of', 'notice', 'radar', 'spend', 'matching', 'cap', 'uplift', 'indicative', 'ranking', 'confidence', 'data', 'limits'];
  const m = await h.newPage({ theme: 'dark' });
  await visit(m, '#/method');

  await check('R65 one h1, the twelve sections exist with ids exactly as MethodLink uses them, in order', async () => {
    eq(await m.page.locator('#shell-main h1').count(), 1, 'h1 count');
    eq((await m.page.locator('#shell-main h1').innerText()).trim(), 'How this is calculated', 'h1 text');
    const found = await m.page.evaluate((ids) => ids.map((id) => { const el = document.getElementById(id); return el ? el.tagName : null; }), IDS);
    must(found.every((x) => x === 'H2'), `section heading ids: ${JSON.stringify(found)}`);
    const order = await m.page.evaluate((ids) => ids.map((id) => document.getElementById(id).getBoundingClientRect().top + document.getElementById('shell-main').scrollTop), IDS);
    must(order.every((v, i) => i === 0 || v > order[i - 1]), 'sections out of order');
    eq(await m.page.locator('nav[aria-label="On this page"] a').count(), 12, 'section list links');
  });

  await check('R65 #/method?s=<id> scrolls to and focuses that section heading, for all 12 ids (route change and in-page)', async () => {
    for (const id of IDS) {
      await go(m.page, `#/method?s=${id}`);
      await m.page.waitForFunction((i) => document.activeElement && document.activeElement.id === i, id, { timeout: 4000 }).catch(() => { throw new Error(`${id}: heading not focused (active: ${m.page.url()})`); });
      await m.page.waitForFunction((i) => { const el = document.getElementById(i), main = document.getElementById('shell-main'); const r = el.getBoundingClientRect(), mr = main.getBoundingClientRect(); return r.top >= mr.top - 1 && r.top < mr.bottom - 40; }, id, { timeout: 4000 }).catch(() => { throw new Error(`${id}: heading not in view`); });
    }
    // arriving from another route and from a full load
    await go(m.page, sourceHash(MAX, 'method'));
    await go(m.page, '#/method?s=cap');
    await m.page.waitForFunction(() => document.activeElement && document.activeElement.id === 'cap', null, { timeout: 4000 });
    await visit(m, '#/method?s=uplift');
    await m.page.waitForFunction(() => document.activeElement && document.activeElement.id === 'uplift', null, { timeout: 4000 });
    const r = await inMain(m.page, '#uplift');
    must(r.ok, `uplift not in view after full load: ${JSON.stringify(r)}`);
  });

  await check('R65 the section list links scroll and focus, and mark the section being read', async () => {
    await visit(m, '#/method');
    await m.page.locator('nav[aria-label="On this page"] a', { hasText: 'Ranking' }).click();
    await m.page.waitForFunction(() => document.activeElement && document.activeElement.id === 'ranking', null, { timeout: 4000 });
    await m.page.waitForTimeout(700);
    eq(await m.page.locator('nav[aria-label="On this page"] a[aria-current="location"]').innerText(), 'Ranking', 'current section');
    eq(await m.page.evaluate(() => location.hash), '#/method?s=ranking', 'hash');
  });

  await check('R65 keyboard: Enter on a section link scrolls to and focuses the heading, with a visible focus ring on the link', async () => {
    await visit(m, '#/method');
    await m.page.locator('nav[aria-label="On this page"] a', { hasText: 'Cap used' }).focus();
    const ring = await m.page.evaluate(() => { const c = getComputedStyle(document.activeElement); return [c.outlineStyle, c.outlineWidth]; });
    must(ring[0] !== 'none' && ring[1] !== '0px', `no focus ring on the section link: ${ring}`);
    await m.page.keyboard.press('Enter');
    await m.page.waitForFunction(() => document.activeElement && document.activeElement.id === 'cap', null, { timeout: 4000 });
    eq(await m.page.evaluate(() => getComputedStyle(document.querySelector('.mth-toc')).position), 'sticky', 'section list is sticky');
    await m.page.evaluate(() => { document.getElementById('shell-main').scrollTop = 2500; });
    await m.page.waitForTimeout(150);
    const top = await m.page.evaluate(() => document.querySelector('.mth-toc').getBoundingClientRect().top - document.getElementById('shell-main').getBoundingClientRect().top);
    must(top < 40 && top >= 0, `section list not pinned while scrolling: ${top}`);
  });

  await check('R65 every constant shown equals the engine DEFAULTS (default and in-use columns)', async () => {
    await visit(m, '#/method');
    const show = { renewalRate: (v) => `${Math.round(v * 100)}%`, nearCapThreshold: (v) => `${Math.round(v * 100)}%`, upliftTolerancePp: (v) => `${Math.round(v * 100)} percentage point${Math.round(v * 100) === 1 ? '' : 's'}`, upliftMinGBP: (v) => '£' + v.toLocaleString('en-GB'), autoAcceptScore: (v) => v.toFixed(2), suggestScore: (v) => v.toFixed(2) };
    eq(Object.keys(DEFAULTS).sort().join(','), Object.keys(show).sort().join(','), 'DEFAULTS keys covered');
    for (const [k, v] of Object.entries(DEFAULTS)) {
      const cells = await m.page.$$eval(`[data-const="${k}"]`, (els) => els.map((e) => ({ kind: e.dataset.kind, raw: e.dataset.raw, text: e.textContent.trim() })));
      must(cells.some((c) => c.kind === 'default') && cells.some((c) => c.kind === 'inuse'), `${k}: no default and in-use cell`);
      for (const c of cells) { eq(c.raw, String(v), `${k} ${c.kind} raw`); eq(c.text, show[k](v), `${k} ${c.kind} text`); }
    }
  });

  await check('R65 boundaries, golden worked examples and the stated notes are on the page', async () => {
    const txt = await m.page.evaluate(() => document.getElementById('shell-main').innerText.replace(/\s+/g, ' '));
    for (const s of ['6 January 2027', '6 April 2027', '6 October 2027']) must(txt.includes(s), `missing boundary ${s}`);
    // C-001 notice deadline row
    const row = await m.page.locator('tr', { hasText: 'C-001' }).first().innerText();
    must(/31 Mar 2027/.test(row) && /6 months/.test(row) && /30 Sep 2026/.test(row), `C-001 notice row: ${row}`);
    must(/28 Feb 2027/.test(await m.page.locator('tr', { hasText: 'C-018' }).first().innerText()), 'C-018 deadline');
    must(txt.includes('C-005 over its stated maximum'), 'C-005 example heading');
    const lines = await m.page.locator('dl[aria-label="Cap calculation for C-005"]').innerText();
    for (const s of ['£8,350,000', '£5,000,000', '167.0%', '£3,350,000']) must(lines.includes(s), `C-005 lines miss ${s}: ${lines}`);
    must(txt.includes('£642,478'), 'C-001 projection');
    must(txt.includes('£188,200') && txt.includes('£2,121,800'), 'C-004 uplift example');
    must(txt.includes('£145,000'), 'C-002 renewal example');
    must(txt.includes('Figures are net of irrecoverable VAT and compared with ex-VAT contract values.'), 'VAT note');
    must(txt.includes('Sample payments to 30 September 2026'), 'data-window note');
    must(/5% is a prototype assumption/.test(txt), '"5% is a prototype assumption"');
    must(/Sheffield/.test(txt) && /Sefton/.test(txt), 'Sheffield and Sefton rationale');
    must(/about 4% of the £153\.5m in the payment files/.test(txt), 'stated equivalence');
    must(txt.includes('£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238'), 'sum line');
    must(/does not ingest documents/i.test(txt) && /does not compare councils/i.test(txt), 'what it does not do');
    must(/Larchmont Grounds Maintenance/.test(txt) && /0\.73/.test(txt) && /Suggested/.test(txt), 'matching example');
    must(/84% of payments are linked to a contract on the register/.test(txt), 'coverage sentence');
    eq(await m.page.locator('#shell-main input, #shell-main [role="slider"], #shell-main canvas').count(), 0, 'no calculators or inputs');
  });

  await check('R66 the section list and links in the page lead to real addresses', async () => {
    const hrefs = await m.page.$$eval('nav[aria-label="On this page"] a', (as) => as.map((a) => a.getAttribute('href')));
    eq(hrefs.join(','), IDS.map((i) => `#/method?s=${i}`).join(','), 'section hrefs');
    const clause = await m.page.$$eval('#shell-main a[href^="#/source/"]', (as) => as.map((a) => a.getAttribute('href')));
    must(clause.length >= 5 && clause.every((x) => x.endsWith('?from=method') && /^#\/source\/C-\d{3}\/X-C-\d{3}-\w+\?from=method$/.test(x)), `clause links: ${clause}`);
    // a clause link from the method page lands on the clause and Back returns to the method page
    await m.page.locator('#shell-main a[href^="#/source/C-005/"]').first().click();
    await m.page.waitForFunction(() => location.hash.startsWith('#/source/C-005/'));
    await m.page.getByRole('button', { name: 'Back to method page' }).click();
    await m.page.waitForFunction(() => location.hash === '#/method');
  });

  await check('R10 no number on Source or Method depends on the clock (clock moved, same text)', async () => {
    const t7 = await h.newPage({ theme: 'dark' });
    await visit(t7, '#/method');
    const a = await t7.page.evaluate(() => document.getElementById('shell-main').innerText);
    await t7.page.addInitScript(() => { const fixed = new Date('2031-03-03T10:00:00Z').getTime(); const D = Date; globalThis.Date = class extends D { constructor(...args) { if (args.length === 0) super(fixed); else super(...args); } static now() { return fixed; } }; });
    await visit(t7, '#/method');
    const b = await t7.page.evaluate(() => document.getElementById('shell-main').innerText);
    eq(b, a, 'Method text with a different clock');
    await t7.ctx.close();
  });

  /* ============================================================ copy lint, a11y, layout, network */
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
  async function lint(name, page) {
    const txt = await page.evaluate(() => document.getElementById('shell-main').innerText);
    must(!txt.includes('!'), `${name}: exclamation mark in text`);
    must(!EMOJI.test(txt), `${name}: emoji in text`);
    const btns = await page.$$eval('#shell-main button', (bs) => bs.map((b) => b.textContent.trim()).filter(Boolean));
    for (const b of btns) must(!/^(ok|submit|click here|learn more)$/i.test(b), `${name}: button label "${b}"`);
    for (const b of btns) must(b === b.charAt(0).toUpperCase() + b.slice(1) && !/\b[A-Z][a-z]+ [A-Z][a-z]+/.test(b.replace(/^Back to /, '').replace(/^Mark answer as /, '')), `${name}: button not sentence case "${b}"`);
    return txt;
  }
  await check('R71 copy lint on Source and Method: no "!", no emoji, sentence-case [Verb]+[Object] buttons', async () => {
    const t8 = await h.newPage({ theme: 'dark' });
    await visit(t8, sourceHash(MAX, 'opportunities')); await waitSource(t8.page, MAX.id);
    const s1 = await lint('source', t8.page);
    must(!/\bsavings?\b/i.test(s1), 'source: the word saving');
    for (const id of ['X-C-018-noticePeriod', 'X-C-003-maximumValue', 'X-C-005-rateCard']) { await go(t8.page, sourceHash(byId[id])); await waitSource(t8.page, id); await lint('source ' + id, t8.page); }
    await go(t8.page, '#/method');
    await lint('method', t8.page);
    await t8.ctx.close();
  });

  await check('R13 no Source or Method figure drops the "indicative" wording: every derived pound on Method sits in an indicative context', async () => {
    const txt = await m.page.evaluate(() => document.getElementById('shell-main').innerText);
    must(/indicative/i.test(txt), 'no "indicative" on the Method page');
    must(/not a confirmed result|not a finding|prompt to investigate/i.test(txt), 'no investigate framing');
  });

  await check('R7 axe clean (wcag2a/aa/21aa/22aa + best-practice) in both themes: Source (5 answers), Method, with a toast open', async () => {
    const t9 = await h.newPage({ theme: 'dark' });
    const targets = [sourceHash(MAX, 'opportunities'), sourceHash(byId['X-C-005-startDate'], 'renewals'), sourceHash(byId['X-C-018-noticePeriod']), sourceHash(byId['X-C-005-rateCard']), sourceHash(byId['X-C-003-maximumValue']), '#/method', '#/source/C-005/not-an-id'];
    for (const theme of ['dark', 'light']) {
      for (const hash of targets) {
        await visit(t9, hash);
        await setTheme(t9.page, theme);
        if (hash.startsWith('#/source/C-') && hash.includes('X-')) await waitSource(t9.page, hash.split('/')[3].split('?')[0]);
        const v = await axe(t9.page);
        must(v.length === 0, `${theme} ${hash}: ${JSON.stringify(v)}`);
      }
      // a toast on screen (hand-check) in this theme
      await visit(t9, sourceHash(MAX, 'opportunities')); await setTheme(t9.page, theme); await waitSource(t9.page, MAX.id);
      await t9.page.getByRole('button', { name: 'Mark answer as correct' }).click();
      await t9.page.waitForSelector('.kx-toast', { timeout: 3000 });
      const v = await axe(t9.page);
      must(v.length === 0, `${theme} with toast: ${JSON.stringify(v)}`);
      await t9.page.getByRole('button', { name: 'Mark answer as correct' }).click();      // clear for the next theme
    }
    await t9.ctx.close();
  });

  await check('R8 layout: no horizontal page scroll at 1440x900, 1366x768, 1024x768 and 390x844; axe clean at 390 in both themes', async () => {
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      const tv = await h.newPage({ theme: 'dark', viewport: vp });
      for (const hash of [sourceHash(MAX, 'opportunities'), '#/method', '#/method?s=matching']) {
        await visit(tv, hash);
        const ov = await tv.page.evaluate(() => { const d = document.documentElement; const main = document.getElementById('shell-main'); return { doc: d.scrollWidth - d.clientWidth, main: main.scrollWidth - main.clientWidth }; });
        must(ov.doc <= 0 && ov.main <= 0, `${name} ${hash}: horizontal scroll ${JSON.stringify(ov)}`);
        if (name === 'phone') { for (const theme of ['dark', 'light']) { await setTheme(tv.page, theme); const v = await axe(tv.page); must(v.length === 0, `phone ${theme} ${hash}: ${JSON.stringify(v)}`); } }
      }
      await tv.ctx.close();
    }
  });

  await check('R9 no request leaves the origin and no console errors across both views', async () => {
    const ext = [...externalRequests(t), ...externalRequests(m)];
    must(ext.length === 0, `external requests: ${ext.map((r) => r.url).join(', ')}`);
    must(t.errors.length === 0, 't console errors: ' + t.errors.join(' | '));
    must(m.errors.length === 0, 'm console errors: ' + m.errors.join(' | '));
  });
} finally {
  await h.close();
}
if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nall V3 checks passed');
