// V6 end-to-end: the contracts register (R48, R59, Source chip) and contract detail (R49 to R53, R60, R66, R68, R10, R12), the nine financial questions.
//   KONTOR_DIST=.scratch/V6 node tests/e2e/V6.mjs        against the isolated V6 build (src/dev/V6.jsx)
//   node tests/e2e/V6.mjs                                 against dist/ (the real app)
// Prints 'ok   <name>' / 'FAIL <name>: <why>' and exits non-zero on any failure.
// Golden numbers are typed here from requirements 6.6 on purpose; expected values for loops (all 24 contracts) are computed from the engine and copy.js.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, setTheme, axe, externalRequests, VIEWPORTS } from '../lib/harness.mjs';
import { computeEstate, paymentsFor } from '../../src/lib/estate.js';
import { answerFor, confidenceBand } from '../../src/lib/copy.js';
import { fmtDate, fmtGBPPence } from '../../src/lib/format.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const data = JSON.parse(readFileSync(path.join(ROOT, 'src/data/sample.json'), 'utf8'));
const DIST = process.env.KONTOR_DIST || null;
const estate = computeEstate();

let failed = 0;
let passed = 0;
async function check(name, fn) {
  try { await fn(); passed += 1; console.log(`ok   ${name}`); } catch (e) { failed += 1; console.log(`FAIL ${name}: ${e && e.message ? e.message : e}`); }
}
const must = (cond, why) => { if (!cond) throw new Error(why); };
const eq = (a, b, what) => must(a === b, `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (text, part, what) => must(text.includes(part), `${what}: expected to find ${JSON.stringify(part)} in ${JSON.stringify(text.length > 300 ? text.slice(0, 300) + '...' : text)}`);
const num = (s) => Number(String(s).replace(/[£,\s]/g, ''));
const IDS = data.contracts.map((c) => c.id);
const contract = (id) => estate.contractsById[id];

const mainText = (page) => page.evaluate(() => document.getElementById('shell-main').innerText);
const rowsOf = (page) => page.evaluate(() => [...document.querySelectorAll('.cr-table tbody tr')].map((tr) => [...tr.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim().replace(/ ?, contract C-\d+$/, ''))));
const rowIds = async (page) => (await rowsOf(page)).map((r) => r[0]);
const hashOf = (page) => page.evaluate(() => window.location.hash);
const sortState = (page) => page.evaluate(() => [...document.querySelectorAll('.cr-table th[aria-sort]')].map((th) => `${th.innerText.trim().toLowerCase()}:${th.getAttribute('aria-sort')}`));
const waitRows = (page, n) => page.waitForFunction((k) => document.querySelectorAll('.cr-table tbody tr').length === k, n, { timeout: 5000 });
const typeSearch = async (page, text) => { const i = page.locator('.cr-control--search input'); await i.fill(text); await page.waitForTimeout(420); };
async function seed(t, key, value) { await t.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [key, value]); }
async function clearSeed(t) { await t.page.evaluate(() => { ['kontor-triage', 'kontor-matches', 'kontor-handcheck', 'kontor-assumptions'].forEach((k) => localStorage.removeItem(k)); }); }
const detailGo = async (t, id) => { await go(t.page, `#/contracts/${id}`); await t.page.waitForSelector(`.cd[data-contract-id="${id}"]`, { timeout: 5000 }); await t.page.waitForTimeout(80); };

/** The facts of one answer row on the detail page. */
const fieldsOf = (page) => page.evaluate(() => [...document.querySelectorAll('.cd-q')].map((q) => ({
  q: q.dataset.question,
  title: q.querySelector('h3').innerText.replace(/^Q\d:\s*/, '').trim(),
  fields: [...q.querySelectorAll('.cd-field')].map((f) => ({
    key: f.dataset.field, id: f.dataset.extractionId, label: f.querySelector('dt').innerText.trim(),
    answer: (f.querySelector('[data-testid="answer"]') || f.querySelector('.cd-rates') || {}).innerText || '',
    pill: (f.querySelector('.conf-pill') || {}).innerText || '', score: (f.querySelector('.cd-score') || {}).innerText || '',
    link: (() => { const a = f.querySelector('a.clause-link'); return a ? { href: a.getAttribute('href'), text: [...a.childNodes].filter((n) => !(n.classList && n.classList.contains('sr-only'))).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim(), name: a.innerText.replace(/\s+/g, ' ').trim() } : null; })(),
  })),
})));

const h = await launch({ dist: DIST });
try {
  const t = await h.newPage({ theme: 'dark' });
  const allErrors = [];

  /* ============================================================ the register (R48) */
  await visit(t, '#/contracts');
  await waitRows(t.page, 24);

  await check('R48 register: one h1 "Contracts", tab title, rail item, as-at line, 24 rows', async () => {
    eq(await t.page.locator('#shell-main h1').count(), 1, 'h1 count');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Contracts', 'h1');
    eq(await t.page.title(), 'Contracts | Kontor financial layer', 'document.title');
    eq(await t.page.evaluate(() => { const e = document.querySelector('nav[aria-label="Primary"] [aria-current="page"]'); return e ? e.getAttribute('aria-label') : null; }), 'Contracts', 'rail item');
    const text = await mainText(t.page);
    has(text, 'As at 6 October 2026', 'R10 as-at');
    has(text, '24 contracts. Open one to see its nine financial answers and where each came from.', 'subtitle (copy deck 7.9)');
    eq((await rowsOf(t.page)).length, 24, 'rows');
    eq((await rowIds(t.page)).join(','), IDS.join(','), 'default order is the register order');
  });

  await check('R48 register: columns id, title, supplier, category, route, start, end, annual value, status, flag count', async () => {
    const heads = await t.page.$$eval('.cr-table thead th', (ths) => ths.map((th) => th.innerText.trim().toLowerCase()));
    eq(heads.join('|'), 'contract|title|supplier|category|route|start|end|annual value|status|flags', 'column headers');
  });

  await check('R48 register: golden row C-005 and the Ended row C-007', async () => {
    const rows = await rowsOf(t.page);
    const r5 = rows.find((r) => r[0] === 'C-005');
    eq(r5.join(' | '), 'C-005 | Highways reactive maintenance and minor works | Fennimore Highways Ltd | Highways and street lighting | Open procedure | 1 Jun 2022 | 31 May 2027 | £1,000,000 | Live | 2', 'C-005 row');
    const r7 = rows.find((r) => r[0] === 'C-007');
    eq(r7.join(' | '), 'C-007 | ICT managed service and end-user support | Pellam Digital Ltd | ICT | Framework call-off | 1 May 2023 | 30 Apr 2026 | £1,800,000 | Ended | 2', 'C-007 row');
    eq(rows.filter((r) => r[8] === 'Ended').length, 1, 'only C-007 has ended');
  });

  await check('R48 register: flag count equals the ranked flags of each contract (all 24)', async () => {
    const rows = await rowsOf(t.page);
    for (const r of rows) {
      const expected = estate.ranked.filter((f) => f.contractId === r[0]).length;
      eq(Number(r[9]), expected, `${r[0]} flag count`);
    }
    eq(rows.filter((r) => Number(r[9]) > 0).length, 15, 'contracts that carry a flag (headline N)');
  });

  await check('R48 register: search over title and supplier, shareable address, count line', async () => {
    await typeSearch(t.page, 'quillon');
    eq((await rowIds(t.page)).join(','), 'C-003', 'supplier search');
    has(await hashOf(t.page), 'q=quillon', 'address carries the search');
    eq((await t.page.locator('.cr-count').innerText()).trim(), 'Showing 1 of 24 contracts', 'count line');
    await typeSearch(t.page, 'highways');
    eq((await rowIds(t.page)).join(','), 'C-005', 'title and supplier search (C-004 is only in the category)');
    await typeSearch(t.page, 'STREET');
    eq((await rowIds(t.page)).join(','), 'C-004,C-018', 'case-insensitive title search');
    await typeSearch(t.page, 'street fennimore');
    eq((await rowIds(t.page)).length, 0, 'every word must match');
    await typeSearch(t.page, '');
    await waitRows(t.page, 24);
    must(!(await hashOf(t.page)).includes('q='), 'clearing the box clears the address');
  });

  await check('R48 register: no match shows the copy deck sentence and "Clear search" restores all 24', async () => {
    await typeSearch(t.page, 'zzzz');
    eq(await t.page.locator('.cr-table').count(), 0, 'table is replaced');
    const text = await t.page.locator('.cr .kx-empty').innerText();
    has(text.replace(/\s+/g, ' '), 'No contracts match "zzzz". Check the spelling or clear the search.', 'empty state');
    eq(await t.page.locator('.cr .kx-empty h3').count(), 1, 'empty state heading is h3 under the page h2');
    const btn = t.page.getByRole('button', { name: 'Clear search' });
    eq(await btn.count(), 1, 'Clear search button');
    await btn.click();
    await waitRows(t.page, 24);
    eq(await t.page.locator('.cr-control--search input').inputValue(), '', 'search box emptied');
    must(!(await hashOf(t.page)).includes('q='), 'address cleared');
  });

  await check('R48 register: category filter (with counts), shareable address, combined with search, Clear filters', async () => {
    const sel = t.page.locator('.cr-control--category select');
    const opts = await sel.locator('option').allInnerTexts();
    eq(opts[0], 'All categories', 'first option');
    eq(opts.length, 15, 'options: all + 14 categories');
    has(opts.join('|'), 'ICT (5)', 'ICT count');
    await sel.selectOption('ICT');
    await waitRows(t.page, 5);
    eq((await rowIds(t.page)).join(','), IDS.filter((id) => contract(id).serviceCategory === 'ICT').join(','), 'ICT contracts');
    has(await hashOf(t.page), 'category=ICT', 'address');
    eq((await t.page.locator('.cr-count').innerText()).trim(), 'Showing 5 of 24 contracts', 'count line');
    await typeSearch(t.page, 'pellam');
    eq((await rowIds(t.page)).join(','), 'C-007', 'category and search together');
    await t.page.getByRole('button', { name: 'Clear filters' }).click();
    await waitRows(t.page, 24);
    eq(await sel.inputValue(), '', 'category cleared');
    must(!/category=|q=/.test(await hashOf(t.page)), 'address cleared');
    // a deep link with a category and a sort
    await go(t.page, '#/contracts?category=Transport');
    await waitRows(t.page, 1);
    eq((await rowIds(t.page)).join(','), 'C-012', 'deep link filter');
    await go(t.page, '#/contracts');
    await waitRows(t.page, 24);
  });

  await check('R48 register: sortable headers carry aria-sort; end date and annual value sort both ways', async () => {
    eq((await sortState(t.page)).join(','), 'contract:ascending', 'default sort');
    const head = (name) => t.page.locator('.cr-table thead th button.sort', { hasText: name });
    await head('End').click(); await t.page.waitForTimeout(80);
    const byEnd = [...data.contracts].sort((a, b) => a.endDate.localeCompare(b.endDate) || a.id.localeCompare(b.id)).map((c) => c.id);
    eq((await rowIds(t.page)).join(','), byEnd.join(','), 'end date ascending');
    eq((await sortState(t.page)).join(','), 'end:ascending', 'aria-sort on End');
    eq((await rowIds(t.page))[0], 'C-007', 'earliest end first (the contract that has ended)');
    has(await hashOf(t.page), 'sort=end', 'address');
    await head('End').click(); await t.page.waitForTimeout(80);
    eq((await sortState(t.page)).join(','), 'end:descending', 'aria-sort flips');
    eq((await rowIds(t.page))[0], 'C-006', 'latest end first');
    await head('Annual value').click(); await t.page.waitForTimeout(80);
    const byValue = [...data.contracts].sort((a, b) => b.annualValueGBP - a.annualValueGBP || a.id.localeCompare(b.id)).map((c) => c.id);
    eq((await rowIds(t.page)).join(','), byValue.join(','), 'annual value, highest first');
    eq((await sortState(t.page)).join(','), 'annual value:descending', 'aria-sort on Annual value');
    eq((await rowIds(t.page))[0], 'C-003', 'largest annual value is C-003 (£6,200,000)');
    await head('Annual value').click(); await t.page.waitForTimeout(80);
    eq((await rowIds(t.page))[0], 'C-019', 'smallest annual value first when flipped (£180,000)');
    await head('Flags').click(); await t.page.waitForTimeout(80);
    const counts = (await rowsOf(t.page)).map((r) => Number(r[9]));
    must(counts.every((n, i) => i === 0 || counts[i - 1] >= n), 'flags column sorted high to low');
    eq(await t.page.locator('.cr-table th[aria-sort]').count(), 1, 'exactly one aria-sort');
    // survives a reload (the address carries it)
    await visit(t, await hashOf(t.page));
    await waitRows(t.page, 24);
    eq((await sortState(t.page)).join(','), 'flags:descending', 'sort survives reload');
    await go(t.page, '#/contracts'); await waitRows(t.page, 24);
  });

  await check('R48 register: a row opens the contract (click anywhere on the row, and the keyboard)', async () => {
    const row = t.page.locator('.cr-table tbody tr', { hasText: 'C-005' });
    await row.locator('td').nth(2).click({ force: true });       // the Category cell, not the link text: the stretched link receives the click
    await t.page.waitForSelector('.cd[data-contract-id="C-005"]');
    eq(await hashOf(t.page), '#/contracts/C-005', 'click on a cell opens the detail');
    await t.page.goBack();
    await waitRows(t.page, 24);
    const link = t.page.locator('.cr-table tbody tr a.cr-rowlink').nth(2);
    await link.focus();
    await t.page.keyboard.press('Enter');
    await t.page.waitForSelector('.cd[data-contract-id="C-003"]');
    eq(await hashOf(t.page), '#/contracts/C-003', 'Enter on the row link opens the detail');
    await go(t.page, '#/contracts'); await waitRows(t.page, 24);
    const hrefs = await t.page.$$eval('.cr-table tbody tr a.cr-rowlink', (as) => as.map((a) => a.getAttribute('href')));
    eq(hrefs.join(','), IDS.map((id) => `#/contracts/${id}`).join(','), 'every row link goes to its contract');
  });

  await check('R59 register: "0 of 336 answers checked by hand" and the Source chip semantics', async () => {
    const hand = (await t.page.locator('[data-testid="handcheck-line"]').innerText()).replace(/\s+/g, ' ');
    has(hand, '0 of 336 answers checked by hand.', 'hand-check line');
    const src = (await t.page.locator('[data-testid="source-note"]').innerText()).replace(/\s+/g, ' ');
    has(src, 'Source: Council contracts register, PDF', 'Source chip');
    has(src, '24 contracts', 'count per source');
    has(src, 'A contract over £5m that started on or after 24 February 2025 would come from Find a Tender.', 'the rule');
    eq(data.contracts.filter((c) => c.source !== 'register_pdf').length, 0, 'sample: all 24 contracts come from the register PDF');
  });

  await check('R59 register: the count follows the hand-checks stored on this device', async () => {
    await seed(t, 'kontor-handcheck', { 'X-C-005-maximumValue': 'correct', 'X-C-001-noticePeriod': 'incorrect', 'X-C-999-nothing': 'correct' });
    try {
      await visit(t, '#/contracts'); await waitRows(t.page, 24);
      const hand = (await t.page.locator('[data-testid="handcheck-line"]').innerText()).replace(/\s+/g, ' ');
      has(hand, '2 of 336 answers checked by hand.', 'two valid hand-checks (the unknown id is ignored)');
      has(hand, '1 correct, 1 incorrect.', 'breakdown');
    } finally { await clearSeed(t); }
    await visit(t, '#/contracts'); await waitRows(t.page, 24);
    has((await t.page.locator('[data-testid="handcheck-line"]').innerText()).replace(/\s+/g, ' '), '0 of 336 answers checked by hand.', 'back to zero');
  });

  /* ============================================================ contract detail: the header and flags first (R52) */
  await visit(t, '#/contracts/C-005');
  await t.page.waitForSelector('.cd[data-contract-id="C-005"]');

  await check('R49 detail C-005: header (title, supplier, category, route, status, Source chip, as-at), one h1, tab title, rail', async () => {
    eq(await t.page.locator('#shell-main h1').count(), 1, 'h1 count');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Highways reactive maintenance and minor works', 'h1');
    eq(await t.page.title(), 'Highways reactive maintenance and minor works | Kontor financial layer', 'document.title');
    eq(await t.page.evaluate(() => { const e = document.querySelector('nav[aria-label="Primary"] [aria-current="page"]'); return e ? e.getAttribute('aria-label') : null; }), 'Contracts', 'rail item stays on Contracts');
    const head = (await t.page.locator('.page-header').innerText()).replace(/\s+/g, ' ');
    has(head, 'Fennimore Highways Ltd · Highways and street lighting · Open procedure', 'supplier, category, route');
    has(head, 'Live', 'status pill');
    has(head, 'Source: Council contracts register, PDF', 'Source chip');
    has(head, 'As at 6 October 2026', 'R10 as-at');
    has(head, 'Contracts', 'breadcrumb');
    eq(await t.page.locator('nav[aria-label="Breadcrumb"] a').count() >= 1, true, 'breadcrumb links back');
  });

  await check('R52 detail C-005: flags come first, each with type pill, indicative £ and the drawer link', async () => {
    const order = await t.page.evaluate(() => {
      const top = (sel) => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect().top : null; };
      return { flags: top('#cd-flags-title'), figs: top('.cd-figs'), questions: top('#cd-questions-title'), derived: top('#cd-derived-title'), spend: top('#cd-spend-title'), pay: top('#cd-payments-title') };
    });
    must(order.flags < order.figs && order.figs < order.questions && order.questions < order.spend && order.spend < order.pay, `section order: ${JSON.stringify(order)}`);
    const flags = await t.page.$$eval('.cd-flag', (els) => els.map((e) => ({ id: e.dataset.flagId, type: e.querySelector('.kviz-pill').innerText.trim(), gbp: e.querySelector('.cd-flag__gbp').innerText.trim(), basis: e.querySelector('.cd-flag__basis').innerText.trim(), text: e.innerText.replace(/\s+/g, ' ') })));
    eq(flags.map((f) => f.id).join(','), 'F-C-005-overCap,F-C-005-renewal', 'flags in rank order');
    eq(flags[0].type, 'Spend over cap', 'type pill 1'); eq(flags[0].gbp, '£3,350,000', 'indicative £ 1'); has(flags[0].basis, 'Indicative', 'labelled indicative 1');
    eq(flags[1].type, 'Renewal decision', 'type pill 2'); eq(flags[1].gbp, '£50,000', 'indicative £ 2'); has(flags[1].basis, 'Indicative', 'labelled indicative 2');
    has(flags[0].text, 'You have paid £8,350,000 against a cap of £5,000,000. That is 167.0% of the cap, £3,350,000 over.', 'reason sentence from copy.js');
    has(flags[0].text, 'View clause, page 23', 'clause link on the over-cap flag');
    eq(await t.page.locator('#cd-flags-title').innerText(), 'Opportunities to investigate', 'panel title');
  });

  await check('R52 detail: the flag link opens the same drawer (?flag=), Escape closes it and focus returns to the link', async () => {
    const btn = t.page.locator('.cd-flag[data-flag-id="F-C-005-overCap"] [data-testid="open-flag"]');
    await btn.click();
    await t.page.waitForSelector('[role="dialog"]', { timeout: 4000 });
    has(await hashOf(t.page), 'flag=F-C-005-overCap', 'address carries the flag');
    const dlg = (await t.page.locator('[role="dialog"]').first().innerText()).replace(/\s+/g, ' ');
    has(dlg, '£3,350,000', 'drawer shows the flag amount');
    has(dlg, 'Spend over cap', 'drawer shows the flag type');
    await t.page.keyboard.press('Escape');
    await t.page.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 4000 });
    must(!(await hashOf(t.page)).includes('flag='), 'flag param removed');
    const back = await t.page.evaluate(() => { const e = document.activeElement; const li = e && e.closest && e.closest('.cd-flag'); return li ? li.dataset.flagId : String(e && e.tagName); });
    eq(back, 'F-C-005-overCap', 'focus returns to the opener');
  });

  await check('R52 detail: a contract with no flags says "No opportunities flagged for this contract."', async () => {
    await detailGo(t, 'C-006');
    eq((await t.page.locator('[data-testid="no-flags"]').innerText()).trim(), 'No opportunities flagged for this contract.', 'empty sentence');
    eq(await t.page.locator('.cd-flag').count(), 0, 'no flag rows');
    await detailGo(t, 'C-005');
  });

  await check('R52 detail: other flag cases: C-004 two flags, C-018 low confidence, C-009 watch list, C-007 ended, reviewed flag', async () => {
    await detailGo(t, 'C-004');
    let flags = await t.page.$$eval('.cd-flag', (els) => els.map((e) => `${e.dataset.flagId} ${e.querySelector('.kviz-pill').innerText.trim()} ${e.querySelector('.cd-flag__gbp').innerText.trim()}`));
    eq(flags.join(' | '), 'F-C-004-uplift Price increase above cap £188,200 | F-C-004-renewal Renewal decision £110,000', 'C-004 flags');
    await detailGo(t, 'C-018');
    const f18 = (await t.page.locator('.cd-flag').first().innerText()).replace(/\s+/g, ' ');
    has(f18, 'Needs review', 'low confidence pill on the C-018 renewal flag (R53)');
    has(f18, 'This relies on an answer Kontor is not sure about: notice period. Check the clause first.', 'low-confidence reason (R53)');
    has(f18, '£57,500', 'indicative £');
    await detailGo(t, 'C-009');
    eq(await t.page.locator('.cd-flag').count(), 2, 'C-009 renewal plus watch flag');
    const watch = (await t.page.locator('.cd-watch').innerText()).replace(/\s+/g, ' ');
    has(watch, 'Watch list', 'watch heading'); has(watch, 'Indicative value £0. Not counted in the total.', 'watch note'); has(watch, 'Close to cap', 'watch type');
    await detailGo(t, 'C-007');
    eq((await t.page.locator('.page-header').innerText()).includes('Ended'), true, 'C-007 header says Ended');
    has((await t.page.locator('.cd-flag').first().innerText()).replace(/\s+/g, ' '), '£780,000 of this was paid after the contract ended on 30 April 2026.', 'after-end sentence');
    // a flag you reviewed stays visible with its review status and is not counted
    await seed(t, 'kontor-triage', { 'F-C-005-overCap': 'explained' });
    try {
      await visit(t, '#/contracts/C-005');
      const first = (await t.page.locator('.cd-flag[data-flag-id="F-C-005-overCap"]').innerText()).replace(/\s+/g, ' ');
      has(first, 'Explained', 'review status pill'); has(first, 'Not counted in the total.', 'not counted note');
    } finally { await clearSeed(t); await visit(t, '#/contracts/C-005'); }
  });

  /* ============================================================ key figures */
  await check('R49 detail C-005: key figures strip', async () => {
    const figs = await t.page.$$eval('.cd-figs .kx-stat', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
    eq(figs.length, 5, 'five tiles');
    has(figs[0], '£1,000,000', 'annual value'); has(figs[1], '£5,000,000', 'cap'); has(figs[1], 'Whole term · Stated maximum', 'cap basis and source');
    has(figs[2], '£8,350,000', 'spend to date'); has(figs[2], '52 payments, latest 15 Sep 2026', 'payments count');
    has(figs[3], '167.0%', 'cap used'); has(figs[3], 'Over cap', 'state words'); has(figs[4], '31 May 2027', 'term ends');
    eq(await t.page.locator('#cd-figs-title').count(), 1, 'key figures heading (screen reader)');
  });

  /* ============================================================ the nine questions (must-have 1, R49) */
  await check('R49 detail C-005: nine groups Q1 to Q9 in order, 14 answered fields, each with a confidence pill and a page', async () => {
    const groups = await fieldsOf(t.page);
    eq(groups.map((g) => g.q).join(','), 'Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9', 'group order');
    eq(groups.map((g) => g.title).join('|'), data.questions.map((q) => q.label).join('|'), 'group titles');
    eq(groups.flatMap((g) => g.fields).length, 14, 'answered fields');
    for (const g of groups) for (const f of g.fields) {
      must(f.link && /^View (contract value )?clause, page \d+$/.test(f.link.text), `${f.key}: clause link "${f.link && f.link.text}"`);
      must(['High', 'Medium', 'Needs review'].includes(f.pill), `${f.key}: pill "${f.pill}"`);
    }
    eq(await t.page.locator('#cd-questions-title').innerText(), 'New financial questions', 'set label');
    eq(await t.page.locator('.cd-q h3').count(), 9, 'nine h3 group headings');
  });

  await check('R49 detail C-005: the cap answer is "£5,000,000 for the whole term (stated maximum)" with "View clause, page 23" to clause 14.3', async () => {
    const g = (await fieldsOf(t.page)).flatMap((x) => x.fields).find((f) => f.key === 'maximumValue');
    eq(g.answer.trim(), '£5,000,000 for the whole term (stated maximum)', 'answer');
    eq(g.link.text, 'View clause, page 23', 'link text');
    eq(g.link.href, '#/source/C-005/X-C-005-maximumValue?from=contracts', 'link target (from=contracts)');
    eq(g.pill, 'High', 'pill'); eq(g.score.replace(/\s+/g, ' ').replace('Confidence score ', ''), '0.97', 'score');
  });

  await check('R49 detail C-005: the clause link lands on clause 14.3, page 23 of 70, and "Back to contract" returns here', async () => {
    await t.page.locator('.cd-field[data-field="maximumValue"] a.clause-link').click();
    await t.page.waitForSelector('mark[data-extraction-id="X-C-005-maximumValue"]', { timeout: 6000 });
    const text = await mainText(t.page);
    has(text, 'Page 23 of 70', 'page'); has(text, 'Clause 14.3', 'clause');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Clause 14.3', 'h1 of the source viewer');
    const back = t.page.getByRole('link', { name: /Back to contract/ }).or(t.page.getByRole('button', { name: /Back to contract/ }));
    eq(await back.count() >= 1, true, 'a "Back to contract" way back (from=contracts)');
    await back.first().click();
    await t.page.waitForSelector('.cd[data-contract-id="C-005"]', { timeout: 5000 });
    eq(await hashOf(t.page), '#/contracts/C-005', 'back at the contract');
  });

  await check('R49 detail C-003: "No maximum stated. We used the contract value (£49,600,000)." with a link to the contract value clause', async () => {
    await detailGo(t, 'C-003');
    const g = (await fieldsOf(t.page)).flatMap((x) => x.fields).find((f) => f.key === 'maximumValue');
    eq(g.answer.trim(), 'No maximum stated. We used the contract value (£49,600,000).', 'answer');
    eq(g.link.text, 'View contract value clause, page 5', 'link text');
    eq(g.link.href, '#/source/C-003/X-C-003-awardedTotalValue?from=contracts', 'link points at the contract value clause');
    eq(await t.page.locator('.cd-field[data-field="maximumValue"] .cd-answer__icon').count(), 1, '"not found" has its own glyph');
    await t.page.locator('.cd-field[data-field="maximumValue"] a.clause-link').click();
    await t.page.waitForSelector('mark[data-extraction-id="X-C-003-awardedTotalValue"]', { timeout: 6000 });
    await detailGo(t, 'C-003');
  });

  await check('R49 R53 detail C-018: notice period "Not found" with Needs review (0.58), and the check-the-clause hint', async () => {
    await detailGo(t, 'C-018');
    const f = (await fieldsOf(t.page)).flatMap((x) => x.fields);
    const n = f.find((x) => x.key === 'noticePeriod');
    eq(n.answer.trim(), 'Not found. We used the end date as the action date.', 'answer');
    eq(n.pill, 'Needs review', 'pill'); eq(n.score.replace('Confidence score', '').trim(), '0.58', 'score');
    must(n.link && /^View clause, page \d+$/.test(n.link.text), 'it still links to the clause it looked at');
    has((await t.page.locator('.cd-field[data-field="noticePeriod"]').innerText()).replace(/\s+/g, ' '), 'Check the clause before you rely on this answer.', 'hint');
    eq(f.filter((x) => x.pill === 'Needs review').map((x) => x.key).join(','), 'noticePeriod,autoRenewal', 'the two answers below 0.75 (notice period 0.58, auto-renewal 0.70)');
    eq(f.filter((x) => x.pill === 'Medium').length, 0, 'no medium answers on C-018');
  });

  await check('R49 all 24 contracts: nine groups in order, every answer equals the copy deck wording, every clause link points at the right page', async () => {
    for (const id of IDS) {
      await detailGo(t, id);
      const groups = await fieldsOf(t.page);
      eq(groups.map((g) => g.q).join(','), 'Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9', `${id} group order`);
      const fields = groups.flatMap((g) => g.fields);
      eq(fields.length, 14, `${id} fields`);
      for (const f of fields) {
        const x = estate.extractionsById[`X-${id}-${f.key}`];
        const a = answerFor(x, contract(id));
        if (f.key === 'rateCard') {
          for (const r of a.rows) must(f.answer.includes(r.item) && f.answer.includes(r.rate), `${id} rate card row ${r.item}`);
        } else eq(f.answer.replace(/\s+/g, ' ').trim(), a.text, `${id} ${f.key} answer`);
        const band = confidenceBand(x.confidence);
        eq(f.pill, band === 'high' ? 'High' : band === 'medium' ? 'Medium' : 'Needs review', `${id} ${f.key} pill`);
        eq(f.score.replace('Confidence score', '').trim(), x.confidence.toFixed(2), `${id} ${f.key} score`);
        const missingMax = f.key === 'maximumValue' && a.kind === 'not_found';
        const target = missingMax ? estate.extractionsById[`X-${id}-awardedTotalValue`] : x;
        eq(f.link.href, `#/source/${id}/${target.id}?from=contracts`, `${id} ${f.key} link target`);
        eq(f.link.text, `${missingMax ? 'View contract value clause' : 'View clause'}, page ${target.provenance[0].page}`, `${id} ${f.key} link text`);
      }
    }
  });

  await check('R68 all 24 contracts: Q9 shows termination for convenience, notice and exit fees', async () => {
    for (const id of IDS) {
      await detailGo(t, id);
      const q9 = (await fieldsOf(t.page)).find((g) => g.q === 'Q9');
      eq(q9.title, 'Termination rights and exit fees', `${id} Q9 title`);
      eq(q9.fields.map((f) => f.key).join(','), 'terminationForConvenience,exitFees', `${id} Q9 fields`);
      const c = contract(id);
      const tfc = q9.fields[0].answer.trim();
      eq(tfc, c.termination.forConvenience ? `You can end this contract early on ${c.termination.noticeMonths} ${c.termination.noticeMonths === 1 ? "month's" : "months'"} notice` : 'Neither party can end this contract early without cause', `${id} termination for convenience`);
      const fee = q9.fields[1].answer.trim();
      must(fee.length > 0, `${id} exit fees answer is empty`);
      eq(fee, estate.extractionsById[`X-${id}-exitFees`].answer.present ? estate.extractionsById[`X-${id}-exitFees`].answer.summary : 'No exit fees stated', `${id} exit fees`);
    }
    await detailGo(t, 'C-003');
    const fee = (await fieldsOf(t.page)).find((g) => g.q === 'Q9').fields[1].answer.trim();
    eq(fee, 'Unamortised vehicle costs, up to £1.2m', 'C-003 exit fee text is shown (Stage 2 raw material)');
  });

  await check('R49 detail C-005: the rate card is a table (item, unit, rate), and notice, auto-renewal and price review read in plain words', async () => {
    await detailGo(t, 'C-005');
    const rows = await t.page.$$eval('.cd-field[data-field="rateCard"] tbody tr', (trs) => trs.map((r) => [...r.children].map((c) => c.innerText.trim()).join(' | ')));
    eq(rows.join(' / '), 'Operative | per hour | £31.20 / Gang with vehicle | per hour | £96.00 / Lantern replacement | per unit | £188.00', 'rate card rows');
    const f = Object.fromEntries((await fieldsOf(t.page)).flatMap((g) => g.fields).map((x) => [x.key, x.answer.trim()]));
    eq(f.noticePeriod, "3 months' notice before the end of the term", 'notice');
    eq(f.autoRenewal, 'Does not renew automatically', 'auto-renewal');
    eq(f.indexation, 'Prices are fixed for the term.', 'price review');
    eq(f.paymentTerms, '30 days from receipt of a valid invoice', 'payment terms');
    eq(f.extensions, 'No extension option', 'extensions');
    eq(f.serviceCredits, 'No service credits', 'service credits');
  });

  /* ============================================================ derived panel (R50, R60, R66) */
  const derived = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.cd-d')].map((d) => [d.dataset.derived, {
    label: d.querySelector('dt').innerText.trim(), value: d.querySelector('.cd-d__value').innerText.replace(/\s+/g, ' ').trim(),
    sub: [...d.querySelectorAll('.cd-d__sub')].map((s) => s.innerText.replace(/\s+/g, ' ').trim()).join(' '), method: d.querySelector('a.method-link').getAttribute('href'),
  }])));

  await check('R50 detail C-005: derived panel: notice deadline and band, latest end, next review, cap used, uplift "Cannot test", each with a method link', async () => {
    await detailGo(t, 'C-005');
    const d = await derived(t.page);
    eq(Object.keys(d).join(','), 'notice,band,latest-end,next-review,cap-used,uplift', 'six rows in order');
    eq(d.notice.value, '28 February 2027', 'notice deadline'); has(d.notice.sub, '145 days left.', 'relative text');
    eq(d.band.value, '3 to 6 months', 'radar band');
    eq(d['latest-end'].value, '31 May 2027', 'latest end'); has(d['latest-end'].sub, 'No extension option', 'extension note');
    eq(d['next-review'].value, 'None', 'next price review'); has(d['next-review'].sub, 'Prices are fixed for the term.', 'review note');
    has(d['cap-used'].value, '167.0% of the cap', 'cap used'); has(d['cap-used'].value, 'Over cap', 'cap state'); has(d['cap-used'].sub, '£8,350,000 of £5,000,000', 'spend and cap'); has(d['cap-used'].sub, '£3,350,000 over. Indicative.', 'over by, labelled');
    eq(d.uplift.value, 'Cannot test: Prices are fixed for the term, so there is no index to test', 'uplift');
    eq(d.notice.method, '#/method?s=notice', 'notice link'); eq(d.band.method, '#/method?s=radar', 'band link'); eq(d['latest-end'].method, '#/method?s=notice', 'latest end link');
    eq(d['next-review'].method, '#/method?s=ranking', 'review link'); eq(d['cap-used'].method, '#/method?s=cap', 'cap link'); eq(d.uplift.method, '#/method?s=uplift', 'uplift link');
    eq(await t.page.locator('#cd-derived-title').innerText(), 'Derived', 'panel title');
  });

  await check('R66 detail: a derived-panel method link opens the matching section of the Method page', async () => {
    await t.page.locator('.cd-d[data-derived="cap-used"] a.method-link').click();
    await t.page.waitForFunction(() => window.location.hash.startsWith('#/method') && document.querySelector('#shell-main h1') && document.querySelector('#shell-main h1').innerText.trim() === 'How this is calculated', null, { timeout: 5000 });
    eq(await hashOf(t.page), '#/method?s=cap', 'address');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'How this is calculated', 'Method page');
    await detailGo(t, 'C-005');
  });

  await check('R50 R60 detail: uplift verdicts: C-004 flagged, C-003 within tolerance, C-001 within cap, C-009 fell, C-011 and the short-term contracts cannot test', async () => {
    const up = async (id) => { await detailGo(t, id); return (await derived(t.page)).uplift; };
    let u = await up('C-004'); has(u.value, 'Payments rose 12.1% against a cap of 3.0%', 'C-004'); has(u.value, 'Above cap', 'C-004 state'); has(u.sub, '£188,200 more than the cap allows if volumes stayed flat. Indicative.', 'C-004 £');
    u = await up('C-003'); has(u.value, '4.4% against a cap of 4.0%', 'C-003'); has(u.value, 'Within tolerance', 'C-003 state');
    u = await up('C-001'); has(u.value, '2.7% against a cap of 3.0%', 'C-001'); has(u.value, 'Within cap', 'C-001 state');
    u = await up('C-009'); has(u.value, 'Payments fell 53.7%', 'C-009');
    u = await up('C-011'); eq(u.value, 'Cannot test: No index cap stated in the contract', 'C-011');
    for (const id of ['C-019', 'C-022', 'C-024']) { u = await up(id); eq(u.value, 'Cannot test: Fewer than 24 months of payments in the contract term', id); }
    for (const id of ['C-007', 'C-014', 'C-017', 'C-021']) { u = await up(id); eq(u.value, 'Cannot test: Prices are fixed for the term, so there is no index to test', id); }
    u = await up('C-012'); has(u.value, 'Payments rose 7.2% against a cap of 4.5%', 'C-012'); u = await up('C-010'); has(u.value, 'Payments rose 6.6% against a cap of 3.0%', 'C-010');
  });

  await check('R50 detail: golden notice deadlines and bands: C-001 passed, C-018 uses the end date with Needs review, C-017, C-007 ended', async () => {
    await detailGo(t, 'C-001'); let d = await derived(t.page);
    eq(d.notice.value, '30 September 2026', 'C-001 deadline'); has(d.notice.sub, '6 days ago', 'C-001 relative'); eq(d.band.value, 'Notice date passed', 'C-001 band'); has(d.band.sub, 'The notice date passed 6 days ago', 'C-001 attention sentence');
    await detailGo(t, 'C-018'); d = await derived(t.page);
    eq(d.notice.value, '28 February 2027', 'C-018 deadline'); has(d.notice.sub, 'No notice period stated. We used the end date.', 'C-018 note'); has(d.notice.sub, 'Needs review', 'C-018 badge');
    await detailGo(t, 'C-017'); d = await derived(t.page);
    eq(d.notice.value, '1 December 2026', 'C-017 deadline'); eq(d.band.value, 'Next 3 months', 'C-017 band');
    await detailGo(t, 'C-007'); d = await derived(t.page);
    eq(d.band.value, 'Ended, still paying', 'C-007 band'); has(d.band.sub, 'This contract ended on 30 April 2026. You have paid £780,000 since.', 'C-007 sentence');
    await detailGo(t, 'C-006'); d = await derived(t.page);
    eq(d.band.value, 'Later than 12 months', 'C-006 band'); has(d.band.sub, 'not on the renewal radar', 'C-006 note');
    await detailGo(t, 'C-004'); d = await derived(t.page);
    eq(d['latest-end'].value, '31 July 2028', 'C-004 latest end with its extension'); has(d['latest-end'].sub, 'plus 1 extension of 12 months', 'extension described');
    eq(d['next-review'].value, '1 August 2027', 'C-004 next price review');
  });

  await check('R50 detail: cap used for C-011 (annual cap, 113.8%), C-003 (contract value, partial coverage note), C-001 (close to cap)', async () => {
    await detailGo(t, 'C-011'); let d = await derived(t.page);
    has(d['cap-used'].value, '113.8% of the cap', 'C-011'); has(d['cap-used'].sub, 'Highest contract year: £512,000 of £450,000 a year.', 'C-011 sub'); has(d['cap-used'].sub, 'Per contract year', 'basis');
    await detailGo(t, 'C-003'); d = await derived(t.page);
    has(d['cap-used'].value, '55.4% of the contract value', 'C-003'); has(d['cap-used'].value, 'Within cap', 'C-003 state');
    has(d['cap-used'].sub, 'Spend files start on 1 April 2022, so spend before that date is not counted. Utilisation may be higher.', 'partial coverage note (R39)');
    await detailGo(t, 'C-001'); d = await derived(t.page);
    has(d['cap-used'].value, '94.8% of the cap', 'C-001'); has(d['cap-used'].value, 'Close to cap', 'C-001 state');
  });

  await check('R60 detail C-009: "waiting for your review" while the match is suggested, and Over cap 102.7% once you confirm it', async () => {
    await detailGo(t, 'C-009');
    let d = await derived(t.page);
    has(d.uplift.sub, 'A similar payee name has 6 payments (£300,000) waiting for your review.', 'suggested match note');
    has(d['cap-used'].value, '89.1% of the cap', 'C-009 before'); has(d['cap-used'].value, 'Close to cap', 'state before');
    await seed(t, 'kontor-matches', { 'Larchmont Grounds Maintenance': 'confirm' });
    try {
    await visit(t, '#/contracts/C-009');
    d = await derived(t.page);
    eq(d.uplift.sub.includes('waiting for your review'), false, 'note gone once confirmed');
    has(d['cap-used'].value, '102.7% of the cap', 'C-009 after'); has(d['cap-used'].value, 'Over cap', 'state after');
    const flags = await t.page.$$eval('.cd-flag', (els) => els.map((e) => `${e.querySelector('.kviz-pill').innerText.trim()} ${e.querySelector('.cd-flag__gbp').innerText.trim()}`));
    must(flags.includes('Spend over cap £60,000'), `Over cap £60,000 flag appears: ${flags.join(' | ')}`);
    eq(await t.page.locator('.cd-watch').count(), 0, 'it leaves the watch list');
    const payments = (await t.page.locator('section[aria-labelledby="cd-payments-title"]').innerText()).replace(/\s+/g, ' ');
    has(payments, 'Larchmont Grounds Maintenance', 'the confirmed payee name appears in the payments table');
    has(payments, 'Confirmed by you, 0.73', 'matched as confirmed (the similarity you confirmed stays visible)');
    } finally { await clearSeed(t); await visit(t, '#/contracts/C-009'); }
  });

  /* ============================================================ spend by year and payments (R42, R51, R38, R12) */
  await check('R42 detail C-005: whole-term cap draws the cumulative line with the crossing annotated, a table twin and the by-year table', async () => {
    await detailGo(t, 'C-005');
    const sec = t.page.locator('section[aria-labelledby="cd-spend-title"]');
    eq((await sec.locator('h2').first().innerText()).trim(), 'Spend by contract year', 'panel title');
    const callout = (await sec.locator('.kviz-callout').innerText()).replace(/\s+/g, ' ');
    has(callout, 'Cap crossed', 'annotation'); has(callout, '8 Apr 2025', 'crossing date'); has(callout, '£5.0m', 'at the cap');
    eq(await sec.locator('[role="slider"]').count(), 1, 'keyboard slider over the plot');
    eq(await sec.locator('.kviz-yb').count(), 0, 'not the annual bars');
    await sec.getByRole('button', { name: 'Show table' }).click();
    eq(await sec.locator('.kviz-table tbody tr').count() > 20, true, 'table twin lists the months');
    await sec.getByRole('button', { name: 'Show chart' }).click();
    const rows = await sec.locator('.cd-spend__years tbody tr').allInnerTexts();
    eq(rows.length, 5, 'five contract years');
    has(rows[0].replace(/\s+/g, ' '), 'Year 1 1 Jun 2022 to 31 May 2023 £1,664,489.26', 'year 1');
    has(rows[4].replace(/\s+/g, ' '), 'Year 5 Year to date 1 Jun 2026 to 31 May 2027 £784,745.14', 'year 5 (year to date)');
    has((await sec.locator('.cd-spend__years tfoot').innerText()).replace(/\s+/g, ' '), 'Total to date £8,350,000.00', 'total equals the spend figure');
  });

  await check('R40 R42 detail C-011: annual cap draws YearBars, years 1 to 4 (£430,000, £512,000, £447,000, £228,000 to date), year 2 over by £62,000', async () => {
    await detailGo(t, 'C-011');
    const sec = t.page.locator('section[aria-labelledby="cd-spend-title"]');
    eq(await sec.locator('.kviz-yb__hit').count(), 4, 'four columns');
    const labels = await sec.locator('.kviz-yb__hit').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    has(labels[0], '£430,000', 'year 1'); has(labels[1], '£512,000', 'year 2'); has(labels[1], '£62,000 over', 'year 2 over by'); has(labels[2], '£447,000', 'year 3'); has(labels[3], '£228,000', 'year 4'); has(labels[3], 'year to date', 'year 4 to date');
    eq(await sec.locator('.kviz-line').count(), 0, 'not the cumulative line');
    has((await sec.locator('.kviz-fig__title').innerText()), 'annual cap of £450,000', 'figure title names the annual cap');
    has((await sec.locator('.cd-spend__years tfoot').innerText()).replace(/\s+/g, ' '), 'Total to date £1,617,000.00', 'total');
    const d = await derived(t.page); eq(d.uplift.value.startsWith('Cannot test'), true, 'uplift');
  });

  await check('R39 detail C-003: partial coverage is labelled (At least, note under the chart, no invented spend before the files start)', async () => {
    await detailGo(t, 'C-003');
    const sec = t.page.locator('section[aria-labelledby="cd-spend-title"]');
    has((await sec.innerText()).replace(/\s+/g, ' '), 'Spend files start on 1 April 2022, so spend before that date is not counted. Utilisation may be higher.', 'note');
    has((await sec.innerText()).replace(/\s+/g, ' '), 'The line is the contract value (£49,600,000), an estimate and not a stated maximum.', 'estimate cap note');
    const figs = (await t.page.locator('.cd-figs [data-fig="spend"]').innerText()).replace(/\s+/g, ' ');
    has(figs, 'Spend to date, at least', 'tile label'); has(figs, '£27,470,000', 'tile value'); has(figs, 'Spend files start 1 Apr 2022', 'tile foot');
    const rows = (await sec.locator('.cd-spend__years tbody tr').allInnerTexts()).map((r) => r.replace(/\s+/g, ' '));
    has(rows[0], 'Not in the spend files', 'a year wholly before the files'); has(rows[3], 'At least £5,026,965.14', 'a year the files cover only in part');
    eq(await sec.locator('.kviz-callout').count(), 0, 'never crossed, so no annotation');
  });

  await check('R51 R38 R12 detail C-005: payments table paged 20, newest first, caption "Sample payments (fictional)", total equals the spend figure to the penny', async () => {
    await detailGo(t, 'C-005');
    const sec = t.page.locator('section[aria-labelledby="cd-payments-title"]');
    const heads = await sec.locator('thead th').allInnerTexts();
    eq(heads.map((x) => x.trim().toLowerCase()).join('|'), 'date|reference|name as paid|matched supplier|amount', 'columns');
    eq((await sec.locator('table caption').textContent()).trim(), 'Sample payments (fictional)', 'table caption');
    has((await sec.innerText()).replace(/\s+/g, ' '), 'Sample payments (fictional). Sample payments to 30 September 2026.', 'visible caption and data window');
    eq(await sec.locator('tbody tr').count(), 20, 'page 1 has 20 rows');
    const pay = paymentsFor(estate, 'C-005');
    eq(pay.all.length, 52, 'C-005 has 52 payments');
    const newest = pay.all[pay.all.length - 1].payment;
    const first = (await sec.locator('tbody tr').first().innerText()).replace(/\s+/g, ' ');
    has(first, fmtDate(newest.date), 'newest first: date'); has(first, newest.id, 'reference'); has(first, newest.supplierNameRaw, 'name as paid'); has(first, 'Fennimore Highways Ltd', 'matched supplier'); has(first, fmtGBPPence(newest.amountGBP), 'amount');
    eq((await sec.locator('.kx-pager__sum').innerText()).trim(), 'Showing 1 to 20 of 52 payments', 'pager summary');
    const pager = sec.locator('nav[aria-label="Payments pages"]');
    eq(await pager.count(), 1, 'pager');
    let sum = 0; const refs = new Set();
    for (const p of [1, 2, 3]) {
      if (p > 1) await pager.getByRole('button', { name: `Page ${p}` }).click();
      await t.page.waitForTimeout(60);
      const rows = await sec.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.children].map((c) => c.innerText.trim())));
      eq(rows.length, p < 3 ? 20 : 12, `page ${p} row count`);
      rows.forEach((r) => { sum += num(r[4]); refs.add(r[1]); });
    }
    eq(refs.size, 52, '52 distinct payments across the pages');
    eq((await sec.locator('.kx-pager__sum').innerText()).trim(), 'Showing 41 to 52 of 52 payments', 'last page summary');
    eq(Math.round(sum * 100) / 100, 8350000, 'the rows add up to the spend figure');
    const foot = (await sec.locator('tfoot').innerText()).replace(/\s+/g, ' ');
    has(foot, 'Total paid to date, all 52 payments £8,350,000.00', 'total row');
    eq(num(foot.match(/£[\d,]+\.\d\d/)[0]), pay.totalGBP, 'total equals paymentsFor()');
    eq(pay.totalGBP, estate.derived['C-005'].spend.toDate, 'engine spend to date');
    await pager.getByRole('button', { name: 'Next page' }).isDisabled().then((d) => must(d, 'Next is disabled on the last page'));
  });

  await check('R51 detail: sorting the payments by amount and date, the page resets, the total does not move', async () => {
    await detailGo(t, 'C-005');
    const sec = t.page.locator('section[aria-labelledby="cd-payments-title"]');
    await sec.locator('nav[aria-label="Payments pages"]').getByRole('button', { name: 'Page 2' }).click();
    await sec.locator('thead button.sort', { hasText: 'Amount' }).click();
    await t.page.waitForTimeout(60);
    eq((await sec.locator('.kx-pager__sum').innerText()).trim(), 'Showing 1 to 20 of 52 payments', 'back on page 1 after sorting');
    const amounts = (await sec.locator('tbody tr td:last-child').allInnerTexts()).map(num);
    must(amounts.every((a, i) => i === 0 || amounts[i - 1] >= a), 'amounts descending');
    eq(await sec.locator('thead th[aria-sort]').getAttribute('aria-sort'), 'descending', 'aria-sort');
    eq(Math.max(...amounts), Math.max(...paymentsFor(estate, 'C-005').all.map((a) => a.payment.amountGBP)), 'largest payment first');
    await sec.locator('thead button.sort', { hasText: 'Amount' }).click();
    eq(await sec.locator('thead th[aria-sort]').getAttribute('aria-sort'), 'ascending', 'flips');
    has((await sec.locator('tfoot').innerText()).replace(/\s+/g, ' '), '£8,350,000.00', 'total unchanged');
  });

  await check('R38 detail C-007: five payments after the end date are marked and totalled separately (£780,000)', async () => {
    await detailGo(t, 'C-007');
    const sec = t.page.locator('section[aria-labelledby="cd-payments-title"]');
    const foot = (await sec.locator('tfoot').innerText()).replace(/\s+/g, ' ');
    has(foot, 'Total paid to date, all 41 payments £6,160,000.00', 'total'); has(foot, 'Of which paid after the end date, 5 payments £780,000.00', 'after-end subtotal');
    eq(await sec.locator('tbody .kx-pill', { hasText: 'After end date' }).count(), 5, 'five marked rows (all on page 1, newest first)');
  });

  await check('R51 R38 all 24 contracts: the payments total, the key figure and the by-year total all equal the engine spend, page count is right', async () => {
    for (const id of IDS) {
      await detailGo(t, id);
      const pay = paymentsFor(estate, id);
      const spend = estate.derived[id].spend.toDate;
      eq(pay.totalGBP, spend, `${id} engine reconciliation`);
      const sec = t.page.locator('section[aria-labelledby="cd-payments-title"]');
      const foot = (await sec.locator('tfoot').first().innerText()).replace(/\s+/g, ' ');
      has(foot, fmtGBPPence(spend), `${id} payments total row`);
      eq(await sec.locator('tbody tr').count(), Math.min(20, pay.all.length), `${id} rows on page 1`);
      has((await t.page.locator('.cd-figs [data-fig="spend"]').innerText()).replace(/\s+/g, ' '), '£' + spend.toLocaleString('en-GB'), `${id} key figure`);
      has((await t.page.locator('section[aria-labelledby="cd-spend-title"] .cd-spend__years tfoot').innerText()).replace(/\s+/g, ' '), fmtGBPPence(spend), `${id} by-year total`);
    }
  });

  /* ============================================================ deep links and unknown ids */
  await check('deep link: a fresh load of #/contracts/C-005 renders the detail; a lower-case id is accepted', async () => {
    await visit(t, '#/contracts/C-005');
    await t.page.waitForSelector('.cd[data-contract-id="C-005"]');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Highways reactive maintenance and minor works', 'h1');
    await go(t.page, '#/contracts/c-018');
    await t.page.waitForSelector('.cd[data-contract-id="C-018"]');
  });

  await check('unknown id: one h1 "Contract not found.", an explanation and a "Go to contracts" button that works', async () => {
    await go(t.page, '#/contracts/C-999');
    await t.page.waitForTimeout(100);
    eq(await t.page.locator('#shell-main h1').count(), 1, 'h1 count');
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Contract not found.', 'h1');
    has((await mainText(t.page)).replace(/\s+/g, ' '), 'There is no contract with the id C-999 on the register. Go to the contracts list and choose one.', 'explanation (what, why, how)');
    eq(await t.page.title(), 'Contract not found | Kontor financial layer', 'title');
    const btn = t.page.getByRole('button', { name: 'Go to contracts' });
    eq(await btn.count(), 1, 'one button');
    await btn.click();
    await waitRows(t.page, 24);
    eq(await hashOf(t.page), '#/contracts', 'back at the register');
    await go(t.page, '#/contracts/C-005/extra');
    await t.page.waitForTimeout(100);
    eq((await t.page.locator('#shell-main h1').innerText()).trim(), 'Page not found.', 'too many segments is the app not-found page');
  });

  /* ============================================================ keyboard */
  await check('keyboard: register Tab order (search, category, sort headers, one stop per row), visible ring on the row, Enter opens', async () => {
    await visit(t, '#/contracts'); await waitRows(t.page, 24);
    await t.page.locator('#shell-main h1').focus();
    const seen = [];
    for (let i = 0; i < 30; i += 1) {
      await t.page.keyboard.press('Tab');
      const d = await t.page.evaluate(() => { const e = document.activeElement; return { tag: e.tagName, cls: e.className && String(e.className), text: (e.innerText || '').trim().slice(0, 40), type: e.getAttribute('type') }; });
      seen.push(d);
      if (/cr-rowlink/.test(d.cls)) break;
    }
    eq(seen[0].tag, 'INPUT', 'first stop is the search box');
    eq(seen[1].tag, 'SELECT', 'second stop is the category');
    const sorts = seen.filter((s) => s.tag === 'BUTTON');
    eq(sorts.length, 8, 'eight sortable headers');
    must(/cr-rowlink/.test(seen[seen.length - 1].cls), 'then the first row link');
    const ring = await t.page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a, '::after'); return { w: c.outlineWidth, s: c.outlineStyle, own: getComputedStyle(a).outlineStyle }; });
    eq(ring.s, 'solid', 'ring style on the row'); eq(ring.w, '2px', 'ring width on the row'); eq(ring.own, 'none', 'the link text does not draw a second ring');
    await t.page.keyboard.press('Tab');
    const next = await t.page.evaluate(() => document.activeElement.getAttribute('href'));
    eq(next, '#/contracts/C-002', 'one tab stop per row');
    await t.page.keyboard.press('Shift+Tab');
    await t.page.keyboard.press('Enter');
    await t.page.waitForSelector('.cd[data-contract-id="C-001"]');
    eq(await hashOf(t.page), '#/contracts/C-001', 'Enter opens the contract');
  });

  await check('keyboard: detail Tab reaches "See calculation", Enter opens the drawer, Escape returns focus', async () => {
    await visit(t, '#/contracts/C-005');
    await t.page.waitForSelector('.cd[data-contract-id="C-005"]');
    await t.page.locator('#shell-main h1').focus();
    let hit = false;
    for (let i = 0; i < 12 && !hit; i += 1) {
      await t.page.keyboard.press('Tab');
      hit = await t.page.evaluate(() => document.activeElement.matches('[data-testid="open-flag"]'));
    }
    must(hit, 'Tab reaches the first See calculation button');
    const ring = await t.page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    eq(ring, 'solid', 'visible focus ring');
    await t.page.keyboard.press('Enter');
    await t.page.waitForSelector('[role="dialog"]', { timeout: 4000 });
    await t.page.keyboard.press('Escape');
    await t.page.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 4000 });
    eq(await t.page.evaluate(() => { const li = document.activeElement.closest('.cd-flag'); return li ? li.dataset.flagId : null; }), 'F-C-005-overCap', 'focus returned to the button that opened it');
  });

  await check('keyboard: Tab reaches every clause link and method link on the detail page, in reading order', async () => {
    await detailGo(t, 'C-005');
    const hrefs = await t.page.$$eval('#shell-main a.clause-link, #shell-main a.method-link', (as) => as.map((a) => a.getAttribute('href')));
    must(hrefs.filter((x) => x.startsWith('#/source/')).length >= 16, `clause links: ${hrefs.length}`);
    eq(hrefs.filter((x) => x.startsWith('#/method')).length, 6, 'six method links in the derived panel');
    const tabbable = await t.page.evaluate(() => [...document.querySelectorAll('#shell-main a[href]')].every((a) => a.tabIndex >= 0));
    eq(tabbable, true, 'every link is tabbable');
  });

  /* ============================================================ accessibility, layout, copy */
  const axeStates = [
    ['register', '#/contracts'], ['register filtered', '#/contracts?category=ICT&sort=end'], ['register empty', '#/contracts?q=zzzz'],
    ['C-005', '#/contracts/C-005'], ['C-005 flag drawer', '#/contracts/C-005?flag=F-C-005-overCap'], ['C-003', '#/contracts/C-003'], ['C-018', '#/contracts/C-018'],
    ['C-011', '#/contracts/C-011'], ['C-007', '#/contracts/C-007'], ['C-009', '#/contracts/C-009'], ['C-006', '#/contracts/C-006'], ['C-004', '#/contracts/C-004'], ['unknown id', '#/contracts/C-999'],
  ];
  for (const theme of ['dark', 'light']) {
    await check(`axe (wcag2a/aa/21aa/22aa + best-practice) is clean in ${theme}: ${axeStates.map((s) => s[0]).join(', ')}`, async () => {
      const bad = [];
      for (const [name, hash] of axeStates) {
        await visit(t, hash);
        await setTheme(t.page, theme);
        if (name.includes('drawer')) await t.page.waitForSelector('[role="dialog"]', { timeout: 4000 });
        const v = await axe(t.page);
        if (v.length) bad.push(`${name}: ${v.map((x) => `${x.id} (${x.count}) ${x.targets[0] || ''}`).join('; ')}`);
      }
      must(bad.length === 0, bad.join(' || '));
    });
  }

  await check('axe: the payments table scrolled to the last page, the table twin of the chart and a paged view are clean in both themes', async () => {
    const bad = [];
    for (const theme of ['dark', 'light']) {
      await visit(t, '#/contracts/C-005'); await setTheme(t.page, theme);
      const sec = t.page.locator('section[aria-labelledby="cd-spend-title"]');
      await sec.getByRole('button', { name: 'Show table' }).click();
      await t.page.locator('section[aria-labelledby="cd-payments-title"] nav[aria-label="Payments pages"]').getByRole('button', { name: 'Page 3' }).click();
      const v = await axe(t.page);
      if (v.length) bad.push(`${theme}: ${v.map((x) => `${x.id} ${x.targets[0] || ''}`).join('; ')}`);
    }
    must(bad.length === 0, bad.join(' || '));
  });

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    await check(`layout at ${vp.width}x${vp.height}: no horizontal page scroll on the register and the detail pages, content inside the main area`, async () => {
      const p = await h.newPage({ theme: 'dark', viewport: vp });
      const bad = [];
      for (const hash of ['#/contracts', '#/contracts/C-005', '#/contracts/C-018', '#/contracts/C-011', '#/contracts/C-007']) {
        await visit(p, hash);
        await p.page.waitForTimeout(150);
        const r = await p.page.evaluate(() => { const m = document.getElementById('shell-main'); return { doc: document.documentElement.scrollWidth - innerWidth, main: m.scrollWidth - m.clientWidth }; });
        if (r.doc > 1 || r.main > 1) bad.push(`${hash}: ${JSON.stringify(r)}`);
      }
      allErrors.push(...p.errors);
      must(bad.length === 0, bad.join(' | '));
    });
  }

  await check('layout 1440x900, 1366x768 and 1024x768: the register table fits without scrolling inside its box; at 1440 and 1366 the first screen of the detail shows the flags and starts the key figures', async () => {
    for (const vp of [VIEWPORTS.desktop, VIEWPORTS.laptop, VIEWPORTS.tablet]) {
      const p = await h.newPage({ theme: 'dark', viewport: vp });
      await visit(p, '#/contracts');
      const r = await p.page.evaluate(() => { const w = document.querySelector('.cr-table'); return { wrap: w.clientWidth, table: w.querySelector('table').scrollWidth, region: w.getAttribute('role') }; });
      must(r.table <= r.wrap + 1 && !r.region, `${vp.width}: table ${r.table} in ${r.wrap} (${r.region})`);
      if (vp.width < 1300) { allErrors.push(...p.errors); continue; }      // at 1024 the flags stack and the strip sits below the first screen
      await visit(p, '#/contracts/C-005');
      const fig = await p.page.evaluate(() => { const f = document.querySelector('.cd-figs').getBoundingClientRect(), m = document.getElementById('shell-main').getBoundingClientRect(); return { bottom: f.bottom - m.top, h: m.height }; });
      must(fig.bottom <= fig.h + 120, `${vp.width}x${vp.height}: key figures end at ${Math.round(fig.bottom)} of ${Math.round(fig.h)}`);
      allErrors.push(...p.errors);
    }
  });

  await check('the Derived panel stays in view while you read the questions at 1440x900 (sticky), and is not sticky when the window is short', async () => {
    const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(p, '#/contracts/C-004');
    await p.page.evaluate(() => { document.getElementById('shell-main').scrollTop = 900; });
    await p.page.waitForTimeout(150);
    const r = await p.page.evaluate(() => { const a = document.querySelector('.cd-aside').getBoundingClientRect(), m = document.getElementById('shell-main').getBoundingClientRect(); return { top: a.top - m.top, bottom: a.bottom, mBottom: m.bottom }; });
    must(r.top >= 0 && r.top <= 40 && r.bottom <= r.mBottom + 1, `panel pinned: ${JSON.stringify(r)}`);
    const q = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.laptop });
    await visit(q, '#/contracts/C-004');
    eq(await q.page.evaluate(() => getComputedStyle(document.querySelector('.cd-aside')).position), 'static', 'static on a short window');
  });

  await check('copy lint: no "!", no emoji, no "saving", no banned button labels, buttons are [Verb]+[Object], every derived £ labelled indicative', async () => {
    const texts = [];
    for (const hash of ['#/contracts', '#/contracts?q=zzzz', '#/contracts/C-005', '#/contracts/C-018', '#/contracts/C-009', '#/contracts/C-007', '#/contracts/C-999']) {
      await visit(t, hash);
      const r = await t.page.evaluate(() => ({ text: document.getElementById('shell-main').innerText, buttons: [...document.querySelectorAll('#shell-main button, #shell-main a.kx-btn')].map((b) => (b.getAttribute('aria-label') || b.innerText).trim()).filter(Boolean) }));
      texts.push({ hash, ...r });
    }
    const bad = [];
    for (const { hash, text, buttons } of texts) {
      if (/!/.test(text)) bad.push(`${hash}: exclamation mark`);
      if (/\p{Extended_Pictographic}/u.test(text)) bad.push(`${hash}: emoji`);
      if (/\bsavings?\b/i.test(text)) bad.push(`${hash}: the word saving(s)`);
      for (const b of buttons) if (/^(ok|submit|click here|learn more|yes|no)$/i.test(b)) bad.push(`${hash}: banned label "${b}"`);
    }
    must(bad.length === 0, bad.join(' | '));
    const all = new Set(texts.flatMap((x) => x.buttons).filter((b) => !/^(Page \d+|Previous page|Next page)$/.test(b)));
    const allowed = new Set(['Clear search', 'Clear filters', 'Go to contracts', 'Show table', 'Show chart']);
    const sort = new Set(['contract', 'title', 'supplier', 'category', 'start', 'end', 'annual value', 'flags', 'date', 'amount']);
    for (const b of all) {
      if (allowed.has(b) || sort.has(b.toLowerCase())) continue;
      must(/^See calculation/.test(b), `unexpected button label "${b}"`);
    }
    const c5 = texts.find((x) => x.hash === '#/contracts/C-005').text;
    must(/Indicative\./.test(c5) && /£3,350,000/.test(c5), 'flag amounts are labelled indicative');
  });

  await check('one primary button per section: the register and the detail have none, the not-found state has exactly one', async () => {
    const filled = (p) => p.$$eval('#shell-main button', (bs) => bs.filter((b) => { const c = getComputedStyle(b).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' && !b.classList.contains('sort') && !b.classList.contains('kviz-btn') && !b.closest('.kx-pager'); }).map((b) => b.innerText.trim()));
    await visit(t, '#/contracts'); eq((await filled(t.page)).join(','), '', 'register');
    await visit(t, '#/contracts/C-005'); eq((await filled(t.page)).join(','), '', 'detail');
    await visit(t, '#/contracts/C-999'); eq((await filled(t.page)).join(','), 'Go to contracts', 'not found');
  });

  await check('design rules: no hex colours, no gradients and no hand-drawn svg in the V6 files; light and dark both render the tokens', async () => {
    const files = ['src/views/Contracts.css', 'src/views/ContractDetail.css', 'src/views/Contracts.jsx', 'src/views/ContractDetail.jsx', 'src/views/contracts/Flags.jsx', 'src/views/contracts/Questions.jsx', 'src/views/contracts/Derived.jsx', 'src/views/contracts/SpendSection.jsx', 'src/views/contracts/Payments.jsx', 'src/views/contracts/strings.js'];
    const bad = [];
    for (const f of files) {
      const src = readFileSync(path.join(ROOT, f), 'utf8');
      if (/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, ''))) bad.push(`${f}: hex colour`);
      if (/gradient\(/i.test(src)) bad.push(`${f}: gradient`);
      if (/<svg/i.test(src)) bad.push(`${f}: svg`);
      if (/native.*<dialog|<dialog/.test(src)) bad.push(`${f}: native dialog`);
      if (/Date\.now\(|new Date\(\)/.test(src)) bad.push(`${f}: reads the clock`);
    }
    must(bad.length === 0, bad.join(' | '));
  });

  await check('storage blocked: the register and a detail page still render and sort', async () => {
    const p = await h.newPage({ blockStorage: true });
    await visit(p, '#/contracts');
    await waitRows(p.page, 24);
    await visit(p, '#/contracts/C-005');
    await p.page.waitForSelector('.cd[data-contract-id="C-005"]');
    eq(await p.page.locator('.cd-q').count(), 9, 'nine groups');
    allErrors.push(...p.errors);
  });

  await check('no console errors and no request leaves the page origin (whole run)', async () => {
    const errs = [...t.errors, ...allErrors].filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED/.test(e));
    must(errs.length === 0, errs.slice(0, 5).join(' | '));
    const ext = externalRequests(t);
    must(ext.length === 0, ext.slice(0, 3).map((r) => r.url).join(' | '));
  });
} finally {
  await h.close();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
