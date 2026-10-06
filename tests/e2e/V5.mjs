// V5 e2e: Cap vs spend (#/spend), Supplier matches (#/spend/matches), No contract on the register (#/spend/no-contract).
//   KONTOR_DIST=.scratch/V5 node tests/e2e/V5.mjs      against the V5 dev build (real Spend, Source and Method; a stand-in Overview that prints the engine's headline)
//   node tests/e2e/V5.mjs                              against dist/ (the whole app)
// Covers requirements R37 to R47, R45, R66, R3 (the three tab deep links), R10 (as at), R13, R71 (copy), R69 (keyboard) and axe in both themes,
// with the golden numbers of requirements 6.6. Prints 'ok   <name>' / 'FAIL <name>: <why>' / 'skip <name>: <why>'; exits non-zero when anything failed.
import { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme } from '../lib/harness.mjs';
import data from '../../src/data/sample.json' with { type: 'json' };

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('ok   ' + name); } catch (e) { failed += 1; console.log('FAIL ' + name + ': ' + ((e && e.message) || e)); }
}
const skip = (name, why) => console.log('skip ' + name + ': ' + why);
const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg); };
const has = (text, part, msg = '') => { if (!String(text).includes(part)) throw new Error(`${msg} expected to contain ${JSON.stringify(part)}, got ${JSON.stringify(String(text).slice(0, 400))}`); };

/* ---------------------------------------------------------------- golden data (requirements 6.6) */
// Cap list order and figures: [contract id, utilisation text, state words, spend text, over-by text or null]
const CAP_GOLDEN = [
  ['C-005', '167.0%', 'Over cap', '£8,350,000', '£3,350,000 over'],
  ['C-007', '114.1%', 'Over cap', '£6,160,000', '£760,000 over'],
  ['C-011', '113.8%', 'Over cap', '£512,000', '£62,000 over'],
  ['C-001', '94.8%', 'Close to cap', '£11,380,000', null],
  ['C-017', '90.8%', 'Close to contract value (estimate)', '£990,000', null],
  ['C-009', '89.1%', 'Close to cap', '£1,960,000', null],
  ['C-004', '80.6%', 'Within cap', '£8,870,000', null],
];
// Every testable cap by utilisation, descending (golden per-contract table)
const UTIL = { 'C-005': 167.0, 'C-007': 114.1, 'C-011': 113.8, 'C-001': 94.8, 'C-017': 90.8, 'C-009': 89.1, 'C-004': 80.6, 'C-018': 76.2, 'C-015': 72.8, 'C-014': 65.5, 'C-002': 65.0, 'C-016': 64.4,
  'C-013': 63.2, 'C-010': 62.9, 'C-023': 62.0, 'C-012': 58.2, 'C-003': 55.4, 'C-021': 50.4, 'C-006': 46.1, 'C-008': 46.0, 'C-020': 44.7, 'C-024': 38.8, 'C-019': 30.7, 'C-022': 30.6 };
const ORDER = Object.keys(UTIL).sort((a, b) => UTIL[b] - UTIL[a]);
const PARTIAL = ['C-003', 'C-016', 'C-018'];
const NO_CONTRACT = [
  ['Dunmoor Agency Staffing Ltd', 9300000, 54], ['Oakhaven Independent Care Placements Ltd', 4750000, 54], ['Harlowe Transport Hire Ltd', 2600000, 54],
  ['Corran Digital Consulting Ltd', 2400000, 54], ['Skerrow Temporary Accommodation Ltd', 1700000, 54], ['Bellmere Building Supplies Ltd', 1510000, 54],
  ['Pennywhistle Print and Mailing Ltd', 1060000, 54], ['Mirefield Training Partners Ltd', 510000, 18],
];
const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');
const gbp2 = (n) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const contractOf = (id) => data.contracts.find((c) => c.id === id);
const titleToId = Object.fromEntries(data.contracts.map((c) => [c.title, c.id]));
const HEADLINE_START = '£6.1m across 15 contracts flagged as opportunities to investigate';
const HEADLINE_CONFIRMED = '£6.2m across 15 contracts flagged as opportunities to investigate';

/* ---------------------------------------------------------------- page helpers */
const settle = (page, ms = 150) => page.waitForTimeout(ms);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const innerNorm = async (loc) => norm(await loc.innerText());
const hashOf = (page) => page.evaluate(() => location.hash);
const calmPointer = async (page) => { await page.mouse.move(2, 2); await settle(page, 120); };   // no chart tooltip while axe runs

const CAP_LI = '.cap-panel .kviz-bl__list > li';
const capRows = (page) => page.$$eval(CAP_LI, (lis) => lis.map((li) => {
  const q = (s) => li.querySelector(s);
  const pay = q('[data-pay-for]');
  const clause = q('a.clause-link');
  return {
    title: q('.kviz-bl__name').textContent.trim(), supplier: q('.kviz-bl__sub').textContent.trim(), meta: (q('.kviz-bl__meta') || { textContent: '' }).textContent.trim(),
    num: q('.kviz-bl__num').innerText.replace(/\s+/g, ' ').trim(), stat: q('.kviz-bl__stat').innerText.replace(/\s+/g, ' ').trim(),
    clauseHref: clause ? clause.getAttribute('href') : null, clauseText: clause ? clause.textContent.replace(/\s+/g, ' ').trim() : '',
    payId: pay ? pay.getAttribute('data-pay-for') : null, note: (q('.cap-note') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim(),
  };
}));
const capIds = async (page) => (await capRows(page)).map((r) => titleToId[r.title]);
const tiles = (page) => page.$$eval('.cap-tile', (ts) => ts.map((t) => ({ label: t.querySelector('.kx-stat__label').textContent.trim(), value: t.querySelector('.kx-stat__value').textContent.trim(), foot: t.querySelector('.kx-stat__foot').textContent.trim() })));
const chips = (page, sel) => page.$$eval(sel, (bs) => bs.map((b) => ({ label: b.childNodes[b.childNodes.length - 2] ? b.textContent.replace(/\s*\d+\s*$/, '').trim() : b.textContent.trim(), count: Number(b.querySelector('.kx-chip__count').textContent), pressed: b.getAttribute('aria-pressed') === 'true' })));
const drawer = (page) => page.locator('[role="dialog"].pay-drawer');
const openPayments = async (page, id) => {
  await page.locator(`[data-pay-for="${id}"]`).first().click();
  await drawer(page).waitFor({ state: 'visible' });
  await settle(page, 320);
};
const closeDrawer = async (page) => { await page.keyboard.press('Escape'); await drawer(page).waitFor({ state: 'detached' }); };
const amountsOnPage = (page, scope) => page.$$eval(`${scope} .kx-table tbody tr td.num`, (tds) => tds.map((t) => t.textContent.trim()));
const cents = (s) => Math.round(Number(s.replace(/[£,]/g, '')) * 100);
const subtotalOf = (page, scope) => page.locator(`${scope} .kx-table tfoot td.num`).first().innerText();
/** Reads every page of the first table in `scope` (clicking Next) and returns the sum in pence plus the row count. */
const sumAllPages = async (page, scope, pagerName) => {
  let total = 0, n = 0;
  for (let guard = 0; guard < 40; guard++) {
    const a = await amountsOnPage(page, scope);
    total += a.reduce((s, x) => s + cents(x), 0); n += a.length;
    const next = page.locator(`${scope} nav[aria-label="${pagerName}"] button[aria-label="Next page"]`);
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click(); await settle(page, 60);
  }
  return { total, n };
};
const toastText = (page) => innerNorm(page.locator('.kx-toasts'));
const matchRow = (page, name) => page.locator('#shell-main .kx-table tbody tr', { has: page.locator('th', { hasText: name }) }).first();
const matchTable = (page) => page.$$eval('#shell-main .kx-table tbody tr', (trs) => trs.map((tr) => {
  const cells = [...tr.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
  return { name: cells[0], supplier: cells[1], method: cells[2], score: cells[3], status: cells[4], payments: cells[5], total: cells[6] };
}));
const headlineOf = async (page) => { await go(page, '#/overview'); return norm(await page.locator('#shell-main h1').innerText()); };
const primaries = (page) => page.$$eval('#shell-main button', (bs) => bs.filter((b) => (b.getAttribute('style') || '').includes('var(--accent)') && b.offsetParent !== null).map((b) => b.textContent.trim()));

/** Rendered text of main plus any open dialog, without the screen-reader-only parts, for the copy lint. */
const lintInfo = (page) => page.evaluate(() => {
  const roots = [document.querySelector('#shell-main'), ...document.querySelectorAll('[role="dialog"]'), document.querySelector('.kx-toasts')].filter(Boolean);
  const strip = (el) => { const c = el.cloneNode(true); c.querySelectorAll('.sr-only,.kx-sr-only,.kviz-sr,script,style').forEach((n) => n.remove()); return c; };
  const text = roots.map((r) => strip(r).textContent).join(' ');
  const labelled = [];
  roots.forEach((r) => {
    strip(r).querySelectorAll('h1,h2,h3,h4,button:not([aria-pressed]):not([role="radio"]),.kx-routetab,summary,th').forEach((n) => {
      if (n.closest('nav[aria-label$="pages"]') || n.closest('.kx-pager') || n.closest('.kviz-row') || n.closest('.kviz-yb') || n.closest('.kviz-stack') || (n.tagName === 'BUTTON' && n.closest('th'))) return;   // chart rows and columns are named by their data
      const t = n.textContent.replace(/\s+/g, ' ').trim();
      if (t) labelled.push({ tag: n.tagName.toLowerCase(), text: t });
    });
  });
  return { text, labelled };
});
const ALLOWED_CAPS = new Set(['Kontor', 'Marchbank', 'Borough', 'Council', 'LLP', 'Ltd', 'ICT']);
const VERBS = new Set(['Show', 'See', 'Confirm', 'Reject', 'Undo', 'Close', 'Clear', 'Open', 'View', 'Review']);
async function lint(page, where) {
  const { text, labelled } = await lintInfo(page);
  ok(!/!/.test(text), `${where}: exclamation mark in ${JSON.stringify(text.match(/.{0,30}!.{0,10}/)?.[0])}`);
  ok(!/\p{Extended_Pictographic}/u.test(text), `${where}: emoji`);
  ok(!/\bsavings?\b/i.test(text), `${where}: the word saving(s)`);
  const buttons = labelled.filter((l) => l.tag === 'button' && !/^\d+$/.test(l.text));
  buttons.forEach((b) => ok(VERBS.has(b.text.split(' ')[0]), `${where}: button "${b.text}" is not [Verb]+[Object]`));
  labelled.filter((l) => l.tag !== 'th').forEach((l) => {
    const bad = l.text.split(' ').slice(1).filter((w) => /^[A-Z][a-z]/.test(w) && !ALLOWED_CAPS.has(w));
    ok(!bad.length, `${where}: "${l.text}" is not sentence case (${bad.join(', ')})`);
  });
}

const h = await launch({ dist: process.env.KONTOR_DIST || null });
let overviewIsReal = false;
try {
  const t = await h.newPage({ theme: 'dark' });
  const page = t.page;
  // Is there an Overview that prints the headline (the real one, or this build's stand-in)? If not, the headline checks are skipped, not failed.
  await visit(t, '#/overview');
  overviewIsReal = /opportunities to investigate/.test(await page.locator('#shell-main h1').innerText());
  if (!overviewIsReal) skip('Overview headline checks', 'this build has no Overview that prints the headline');

  /* ------------------------------------------------------------ R3 deep links, page header, R10, R66 */
  await check('R3 the three tab deep links load: one h1, tab strip with aria-current, tab-specific title, as at line', async () => {
    const cases = [['#/spend', 'Cap vs spend', 'Cap vs spend | Kontor financial layer', 'cap'], ['#/spend/matches', 'Supplier matches', 'Supplier matches | Kontor financial layer', 'matches'],
      ['#/spend/no-contract', 'No contract on the register', 'No contract on the register | Kontor financial layer', 'no-contract']];
    for (const [hash, tabLabel, title] of cases) {
      await visit(t, hash);
      eq(await page.locator('#shell-main h1').count(), 1, hash + ' h1 count');
      eq(norm(await page.locator('#shell-main h1').innerText()), 'Cap vs spend', hash + ' h1');
      eq(await page.title(), title, hash + ' title');
      eq(norm(await page.locator('nav[aria-label="Cap vs spend views"] a[aria-current="page"]').innerText()), tabLabel, hash + ' current tab');
      eq(await page.locator('nav[aria-label="Cap vs spend views"] a').count(), 3, 'three tabs');
      has(await page.locator('.page-header__asat').innerText(), '6 October 2026', hash + ' as at');
      ok(await page.locator('#shell-main .kx-card').count() > 0, hash + ' content');
    }
  });
  await check('R3 the tab links navigate between the three routes (no reload) and keep the rail on Cap vs spend', async () => {
    await visit(t, '#/spend');
    await page.locator('nav[aria-label="Cap vs spend views"] a', { hasText: 'Supplier matches' }).click();
    await page.waitForFunction(() => location.hash === '#/spend/matches');
    await page.locator('nav[aria-label="Cap vs spend views"] a', { hasText: 'No contract on the register' }).click();
    await page.waitForFunction(() => location.hash === '#/spend/no-contract');
    await page.locator('nav[aria-label="Cap vs spend views"] a', { hasText: 'Cap vs spend' }).click();
    await page.waitForFunction(() => location.hash === '#/spend');
    const railCurrent = await page.$$eval('[aria-current="page"]', (els) => els.map((e) => e.getAttribute('aria-label') || e.textContent.trim()));
    ok(railCurrent.some((x) => /Cap vs spend/.test(x)), 'rail item: ' + JSON.stringify(railCurrent));
  });
  await check('R66 a "How this is calculated" link on each tab, to the right Method section', async () => {
    const want = { '#/spend': '#/method?s=cap', '#/spend/matches': '#/method?s=matching', '#/spend/no-contract': '#/method?s=spend' };
    for (const [hash, href] of Object.entries(want)) {
      await visit(t, hash);
      const hrefs = await page.$$eval('#shell-main a.method-link', (as) => as.map((a) => a.getAttribute('href')));
      ok(hrefs.includes(href), `${hash}: expected a link to ${href}, got ${JSON.stringify(hrefs)}`);
    }
    await page.locator('#shell-main a.method-link').first().click();
    await page.waitForFunction(() => location.hash.startsWith('#/method'));
    eq(await hashOf(page), '#/method?s=spend', 'last tab link target');
  });

  /* ------------------------------------------------------------ R37 the cap list */
  await visit(t, '#/spend');
  await check('R37 summary: Over 3, Close 3, Within 18 and the total over cap £4,172,000 (indicative)', async () => {
    const tl = await tiles(page);
    eq(tl.map((x) => [x.label, x.value]), [['Over cap', '3'], ['Close to cap', '3'], ['Within cap', '18'], ['Total over cap', '£4,172,000']], 'tiles');
    has(tl[3].foot, 'Indicative', 'total foot');
    has(tl[1].foot, '85% to 100%', 'close foot');
    has(tl[2].foot, 'Below 85%', 'within foot');
  });
  await check('R37 list: first 12 rows in the golden order, "Show all 24 contracts" reveals all 24 in utilisation order', async () => {
    eq(await capIds(page), ORDER.slice(0, 12), 'first 12');
    const btn = page.getByRole('button', { name: 'Show all 24 contracts' });
    eq(await btn.count(), 1, 'show all button');
    await btn.click(); await settle(page);
    eq(await capIds(page), ORDER, 'all 24');
    await page.getByRole('button', { name: 'Show top 12 contracts' }).click(); await settle(page);
    eq((await capIds(page)).length, 12, 'back to 12');
  });
  await check('R37 golden rows: utilisation to one decimal, state words, spend, over-by', async () => {
    const rows = await capRows(page);
    CAP_GOLDEN.forEach(([id, pct, state, spend, over], i) => {
      const r = rows[i];
      eq(titleToId[r.title], id, `row ${i + 1} contract`);
      has(r.stat, pct, `${id} utilisation`); has(r.stat, state, `${id} state`);
      has(r.num, spend, `${id} spend`);
      if (over) has(r.num, over, `${id} over-by`); else ok(!/ over/.test(r.num), `${id} must not show an over-by: ${r.num}`);
    });
    // C-004 sits at 80.6%: Within cap, not Close (thresholds: above 100% over, 85% to 100% close, below 85% within)
    ok(!/Close/.test(rows[6].stat), 'C-004 is Within cap');
  });
  await check('R37 the status filter chips: counts, filter, a shareable ?state= and an empty-safe clear', async () => {
    const c0 = await chips(page, '.cap-chips .kx-chip');
    eq(c0.map((c) => [c.label, c.count]), [['All contracts', 24], ['Over cap', 3], ['Close to cap', 3], ['Within cap', 18]], 'chips');
    await page.locator('.cap-chips .kx-chip', { hasText: 'Over cap' }).click(); await settle(page);
    eq(await capIds(page), ['C-005', 'C-007', 'C-011'], 'over');
    eq(await hashOf(page), '#/spend?state=over', 'address');
    await page.locator('.cap-chips .kx-chip', { hasText: 'Close to cap' }).click(); await settle(page);
    eq(await capIds(page), ['C-001', 'C-017', 'C-009'], 'close');
    await page.locator('.cap-chips .kx-chip', { hasText: 'Within cap' }).click(); await settle(page);
    eq((await capIds(page)).length, 18, 'within count');
    ok(!(await page.getByRole('button', { name: /Show all/ }).count()), 'no show-all button on a filtered list');
    await page.locator('.cap-chips .kx-chip', { hasText: 'All contracts' }).click(); await settle(page);
    eq((await capIds(page)).length, 12, 'all again');
    await visit(t, '#/spend?state=close');
    eq(await capIds(page), ['C-001', 'C-017', 'C-009'], 'deep link filter');
    const pressed = (await chips(page, '.cap-chips .kx-chip')).filter((c) => c.pressed).map((c) => c.label);
    eq(pressed, ['Close to cap'], 'pressed chip');
  });
  await visit(t, '#/spend');
  await check('R39 labels: Stated maximum / Contract value (no maximum stated), Whole term / Per contract year', async () => {
    await page.getByRole('button', { name: 'Show all 24 contracts' }).click(); await settle(page);
    const rows = await capRows(page);
    rows.forEach((r) => {
      const c = contractOf(titleToId[r.title]);
      const want = (c.cap.basis === 'annual' ? 'Per contract year' : 'Whole term') + ' · ' + (c.cap.source === 'contract_value' ? 'Contract value (no maximum stated)' : 'Stated maximum');
      eq(r.meta, want, c.id + ' basis and source');
    });
    eq(rows.filter((r) => r.meta.startsWith('Per contract year')).map((r) => titleToId[r.title]), ['C-011'], 'only C-011 is annual');
    const c005 = rows.find((r) => titleToId[r.title] === 'C-005'); has(c005.num, 'of £5,000,000 cap');
    const c011 = rows.find((r) => titleToId[r.title] === 'C-011'); has(c011.num, 'of £450,000 annual cap'); has(c011.stat, '113.8% of annual cap');
    const c017 = rows.find((r) => titleToId[r.title] === 'C-017'); has(c017.num, 'of £1,090,000 contract value');
  });
  await check('R39 "At least" for contracts that start before the spend files (C-003, C-016, C-018) with the explanatory note', async () => {
    const rows = await capRows(page);
    const partial = rows.filter((r) => r.note).map((r) => titleToId[r.title]).sort();
    eq(partial, PARTIAL, 'contracts with the note');
    rows.filter((r) => r.note).forEach((r) => {
      eq(r.note, 'Spend files start on 1 April 2022, so spend before that date is not counted. Utilisation may be higher.', 'note text');
      has(r.num, 'At least', 'spend cell');
    });
    rows.filter((r) => !r.note).forEach((r) => ok(!/At least/.test(r.num), r.title + ' must not say At least'));
    eq(await page.locator('.cap-panel .kviz-bl__spend small', { hasText: 'At least' }).count(), 3, 'three At least cells');
  });
  await check('R41 every Over or Close row has "View clause, page N"; Within rows have none; C-005 is page 23, clause 14.3', async () => {
    const rows = await capRows(page);
    for (const r of rows) {
      const id = titleToId[r.title];
      const state = r.stat;
      if (/Over cap|Close to/.test(state)) {
        ok(r.clauseHref && /^View clause, page \d+/.test(r.clauseText), `${id}: missing clause link (${r.clauseText})`);
        const m = /#\/source\/(C-\d+)\/(X-C-\d+-\w+)\?from=spend/.exec(r.clauseHref);
        ok(m && m[1] === id, `${id}: clause href ${r.clauseHref}`);
        const x = data.extractions.find((e) => e.id === m[2]);
        ok(x && x.contractId === id, `${id}: extraction belongs to the contract`);
        eq(Number((/page (\d+)/.exec(r.clauseText) || [])[1]), x.provenance[0].page, `${id}: page in the label is the extraction's page`);
      } else ok(!r.clauseHref, `${id}: Within rows carry no clause link`);
    }
    const c005 = rows.find((r) => titleToId[r.title] === 'C-005');
    has(c005.clauseText, 'View clause, page 23'); eq(c005.clauseHref, '#/source/C-005/X-C-005-maximumValue?from=spend', 'C-005 href');
    const c017 = rows.find((r) => titleToId[r.title] === 'C-017');
    has(c017.clauseHref, 'X-C-017-awardedTotalValue', 'a contract-value cap cites the contract value clause');
  });
  await check('R41 following the C-005 clause link lands on the source viewer: Clause 14.3, page 23 of 70, the quote highlighted', async () => {
    await page.locator(CAP_LI).first().locator('a.clause-link').click();
    await page.waitForFunction(() => location.hash.startsWith('#/source/C-005'));
    await page.waitForSelector('mark[data-extraction-id]', { timeout: 6000 }).catch(() => {});
    const src = await page.evaluate(() => ({ h1: (document.querySelector('#shell-main h1') || {}).textContent, mark: (document.querySelector('mark') || {}).textContent, body: document.querySelector('#shell-main').innerText }));
    eq(norm(src.h1), 'Clause 14.3', 'h1');
    has(src.body, 'Page 23 of 70'); has(norm(src.mark || ''), 'shall not exceed £5,000,000 in aggregate', 'quote');
    has(src.body, 'Back to cap vs spend', 'the way back names the cap screen');
  });

  /* ------------------------------------------------------------ R38 payments drawer */
  await visit(t, '#/spend');
  await check('R38 See payments on C-005: dialog named, columns, 52 payments, subtotal and total £8,350,000.00 to the penny', async () => {
    await openPayments(page, 'C-005');
    const d = drawer(page);
    eq(norm(await d.locator('h2').first().innerText()), 'Payments counted against this contract', 'drawer title');
    has(await d.innerText(), 'Highways reactive maintenance and minor works', 'subtitle');
    const heads = await d.locator('.kx-table thead th').evaluateAll((ths) => ths.map((x) => x.textContent));
    eq(heads.map(norm), ['Date', 'Reference', 'Name as paid', 'Amount'], 'columns');
    const sub = norm(await subtotalOf(page, '[role="dialog"].pay-drawer'));
    eq(sub, '£8,350,000.00', 'subtotal');
    eq(await d.locator('[data-pay-total]').getAttribute('data-pay-total'), '8350000.00', 'total line');
    has(await d.locator('.pay-total').innerText(), '£8,350,000.00');
    const { total, n } = await sumAllPages(page, '[role="dialog"].pay-drawer', 'Payments in the contract term pages');
    eq(n, 52, 'payments across the pages'); eq(total, 835000000, 'rows add up to the subtotal to the penny');
    ok(!(await d.getByText('Paid after the end date').count()), 'C-005 has no payments after its end date');
    has(await d.innerText(), 'Over cap'); has(await d.innerText(), '167.0%'); has(await d.innerText(), '£3,350,000');
    const refs = await d.locator('.kx-table tbody td .kx-mono').allInnerTexts();
    ok(refs.length && refs.every((r) => /^MBC-\d{4}-\d{6}$/.test(r)), 'transaction references: ' + refs.slice(0, 2));
  });
  await check('R38 the drawer: Escape closes it and returns focus to the See payments button; the address carries ?payments=', async () => {
    eq(await hashOf(page), '#/spend?payments=C-005', 'address while open');
    await closeDrawer(page);
    eq(await hashOf(page), '#/spend', 'address after close');
    const f = await page.evaluate(() => ({ pay: document.activeElement && document.activeElement.getAttribute('data-pay-for'), tag: document.activeElement && document.activeElement.tagName }));
    eq(f, { pay: 'C-005', tag: 'BUTTON' }, 'focus returned');
  });
  await check('R38 C-007: "Paid after the end date" listed separately (5 payments, £780,000.00) and in-term plus after-end add up to £6,160,000.00', async () => {
    await openPayments(page, 'C-007');
    const d = drawer(page);
    const after = d.locator('.pay-block', { hasText: 'Paid after the end date' });
    eq(await after.count(), 1, 'after-end block');
    has(await after.locator('.pay-block__h').innerText(), '5 payments');
    eq(norm(await subtotalOf(page, '.pay-block:has(h4:text("Paid after the end date"))')), '£780,000.00', 'after-end subtotal');
    // independent of the engine: the dataset's Pellam payments dated after the contract's end date
    const c = contractOf('C-007');
    const late = data.payments.filter((p) => /pellam/i.test(p.supplierNameRaw) && p.date > c.endDate);
    eq(late.length, 5, 'dataset: five late payments'); eq(Math.round(late.reduce((s, p) => s + p.amountGBP, 0) * 100), 78000000, 'dataset: £780,000');
    const afterRows = await after.locator('.kx-table tbody tr').count();
    eq(afterRows, 5, 'five rows listed');
    const inTerm = d.locator('.pay-block', { hasText: 'Paid in the contract term' });
    const inSub = cents(norm(await inTerm.locator('.kx-table tfoot td.num').first().innerText()));
    eq(inSub + 78000000, 616000000, 'in term plus after the end date');
    eq(await d.locator('[data-pay-total]').getAttribute('data-pay-total'), '6160000.00', 'total');
    has(await d.locator('.pay-total').innerText(), '£6,160,000.00');
    has(norm(await d.locator('.pay-total').innerText()), '£5,380,000.00 in the contract term plus £780,000.00 after the end date.');
    has(await d.innerText(), 'Over cap'); has(await d.innerText(), '114.1%'); has(await d.innerText(), '£760,000');
    await closeDrawer(page);
  });
  await check('R40 C-011 annual cap: YearBars for years 1 to 4 (£430,000, £512,000, £447,000, £228,000), year 2 over by £62,000, 113.8%', async () => {
    await openPayments(page, 'C-011');
    const d = drawer(page);
    const labels = await d.locator('.kviz-yb__hit').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
    eq(labels.length, 4, 'four contract years');
    ['£430,000', '£512,000', '£447,000', '£228,000'].forEach((v, i) => has(labels[i], v, `year ${i + 1}`));
    has(labels[1], '£62,000 over', 'year 2 over by'); has(labels[3], 'year to date', 'year 4 is the running year');
    ok(!/over\./.test(labels[0] + labels[2] + labels[3]), 'only year 2 is over');
    const text = await d.innerText();
    has(text, 'Year 2 is over the annual cap by £62,000.'); has(text, '113.8%'); has(text, 'Annual cap'); has(text, '£450,000');
    has(norm(await d.locator('.kviz-yb__cap').innerText()), 'Annual cap £450,000');
    // the contract-year selector defaults to the worst year, whose subtotal is the figure on the cap list
    eq(norm(await subtotalOf(page, '[role="dialog"].pay-drawer')), '£512,000.00', 'year 2 subtotal equals the cap list figure');
    eq(await d.locator('[data-pay-total]').getAttribute('data-pay-total'), '512000.00');
    await d.getByRole('radio', { name: 'All years' }).click(); await settle(page);
    eq(await d.locator('[data-pay-total]').getAttribute('data-pay-total'), '1617000.00', 'all years total');
    await d.getByRole('radio', { name: /Year 1/ }).click(); await settle(page);
    eq(norm(await subtotalOf(page, '[role="dialog"].pay-drawer')), '£430,000.00', 'year 1');
    await d.getByRole('radio', { name: /Year 4/ }).click(); await settle(page);
    eq(norm(await subtotalOf(page, '[role="dialog"].pay-drawer')), '£228,000.00', 'year 4');
    // the chart's table twin carries the same numbers
    await d.getByRole('button', { name: 'Show table' }).click(); await settle(page);
    const tw = norm(await d.locator('.kviz-table').innerText());
    ['£430,000', '£512,000', '£447,000', '£228,000', '£62,000'].forEach((v) => has(tw, v, 'table twin'));
    await closeDrawer(page);
  });
  await check('R38 the drawer can be opened from an address and every cap row has a See payments action (24 of 24)', async () => {
    await visit(t, '#/spend?payments=C-001');
    await drawer(page).waitFor({ state: 'visible' });
    has(await drawer(page).innerText(), 'Integrated facilities management');
    eq(norm(await subtotalOf(page, '[role="dialog"].pay-drawer')).startsWith('£11,380,000') || /£11,380,000\.00/.test(norm(await drawer(page).innerText())), true, 'C-001 spend to the penny');
    await closeDrawer(page);
    await page.getByRole('button', { name: 'Show all 24 contracts' }).click(); await settle(page);
    eq((await capRows(page)).filter((r) => r.payId).length, 24, 'See payments buttons');
    await visit(t, '#/spend?payments=C-999');
    eq(await drawer(page).count(), 0, 'an unknown contract opens nothing');
  });
  await check('R38 the "Show table" twin carries basis, source, over-by, clause and payments for every contract', async () => {
    await visit(t, '#/spend');
    await page.getByRole('button', { name: 'Show table' }).click(); await settle(page);
    const heads = (await page.locator('.cap-panel .kviz-table thead th').evaluateAll((ths) => ths.map((x) => x.textContent))).map(norm);
    ['Contract', 'Cap basis', 'Cap source', 'Spend to date', 'Over by', 'Clause', 'Payments'].forEach((c) => ok(heads.includes(c), 'column ' + c + ' in ' + heads));
    eq(await page.locator('.cap-panel .kviz-table tbody tr').count(), 24, '24 rows');
    const first = norm(await page.locator('.cap-panel .kviz-table tbody tr').first().innerText());
    has(first, '£3,350,000'); has(first, 'Stated maximum'); has(first, 'Whole term'); has(first, 'View clause, page 23'); has(first, 'See payments');
    await page.locator('.cap-panel .kviz-table tbody tr').first().getByRole('button', { name: /See payments/ }).click();
    await drawer(page).waitFor({ state: 'visible' });
    await closeDrawer(page);
    await page.getByRole('button', { name: 'Show chart' }).click();
  });

  /* ------------------------------------------------------------ R43 supplier matches */
  await visit(t, '#/spend/matches');
  await check('R45 the sentence "Suggested and unmatched payments are not counted until you confirm them." is visible without opening anything', async () => {
    ok(await page.getByText('Suggested and unmatched payments are not counted until you confirm them.', { exact: true }).first().isVisible(), 'visible');
  });
  await check('R43 golden payees: Normalised 0.98 Accepted, Alias 0.95 Accepted, Larchmont Similar name 0.73 Suggested 6 payments £300,000, Mirefield Unmatched', async () => {
    const rows = await matchTable(page);
    eq(rows.length, 39, 'distinct payee names');
    const by = (n) => rows.find((r) => r.name === n);
    const k = by('KESTRELVALE FACILITIES SVCS LTD'); eq([k.supplier, k.method, k.score, k.status], ['Kestrelvale Facilities Services Ltd', 'Normalised', '0.98', 'Accepted'], 'Kestrelvale normalised');
    const a = by('Kestrelvale FM'); eq([a.supplier, a.method, a.score, a.status], ['Kestrelvale Facilities Services Ltd', 'Alias', '0.95', 'Accepted'], 'Kestrelvale alias');
    const l = by('Larchmont Grounds Maintenance'); has(l.supplier, 'Larchmont Grounds Ltd'); eq([l.method, l.score, l.status, l.payments, l.total], ['Similar name', '0.73', 'Suggested', '6', '£300,000'], 'Larchmont');
    const m = by('Mirefield Training Partners Ltd'); eq([m.method, m.score, m.status, m.payments, m.total], ['Similar name', '0.55', 'Unmatched', '18', '£510,000'], 'Mirefield');
    eq(m.supplier, 'No match', 'Mirefield has no supplier');
    // the five non-exact methods in 6.6 plus everything else exact 1.00
    const exact = rows.filter((r) => r.method === 'Exact');
    ok(exact.length >= 20 && exact.every((r) => r.score === '1.00' && r.status === 'Accepted'), 'exact rows score 1.00 and are Accepted');
    const counts = {}; rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    eq(counts, { Suggested: 1, Unmatched: 8, Accepted: 30 }, 'status counts');
    eq(rows[0].name, 'Larchmont Grounds Maintenance', 'what needs your review comes first');
  });
  await check('R43 columns: name as paid, matched supplier, method, score, status, payments, total', async () => {
    const heads = (await page.locator('#shell-main .kx-table thead th').evaluateAll((ths) => ths.map((x) => x.textContent))).map(norm);
    eq(heads.slice(0, 7), ['Name as paid', 'Matched supplier', 'Method', 'Score', 'Status', 'Payments', 'Total'], 'columns');
    eq(await page.locator('#shell-main .kx-table caption').count(), 1, 'table caption');
  });
  await check('R43 "How matching works" disclosure states the thresholds (0.90 accepted, 0.70 to 0.89 suggested, below unmatched) and R47 the attribution rules', async () => {
    const det = page.locator('details.mt-how');
    eq(await det.evaluate((d) => d.open), false, 'collapsed by default');
    await det.locator('summary').click(); await settle(page, 80);
    const text = norm(await det.innerText());
    has(text, 'How matching works');
    has(text, 'We clean each payee name (lower case, punctuation and words such as Ltd removed, short forms such as svcs expanded)');
    has(text, '0.90 or more is accepted, 0.70 to 0.89 is suggested for you to confirm, and anything lower is left unmatched.');
    has(text, '0.90 or more'); has(text, '0.70 to 0.89'); has(text, 'Below 0.70');
    has(text, 'Suggested and unmatched payments are not counted until you confirm them.');
    has(text, "attributed to the supplier's contract whose dates contain the payment date");
    has(text, "attributed to the supplier's latest-ending contract and shown separately");
    has(text, 'more than one contract stays unattributed');
    await det.locator('summary').click();
  });
  await check('R43 the status chips filter the table (Needs your review 1, Accepted 30, Unmatched 8, Decided by you 0) and the address keeps the filter', async () => {
    const c = await chips(page, '.mt-chips .kx-chip');
    eq(c.map((x) => [x.label, x.count]), [['All payees', 39], ['Needs your review', 1], ['Accepted', 30], ['Unmatched', 8], ['Decided by you', 0]], 'chips');
    await page.locator('.mt-chips .kx-chip', { hasText: 'Needs your review' }).click(); await settle(page);
    eq((await matchTable(page)).map((r) => r.name), ['Larchmont Grounds Maintenance'], 'review filter');
    eq(await hashOf(page), '#/spend/matches?status=review', 'address');
    await page.locator('.mt-chips .kx-chip', { hasText: 'Decided by you' }).click(); await settle(page);
    has(await innerNorm(page.locator('.mt-empty')), 'You have not made any decisions yet.');
    await visit(t, '#/spend/matches?status=unmatched');
    eq((await matchTable(page)).length, 8, 'unmatched deep link');
    await visit(t, '#/spend/matches');
  });
  await check('R43 sorting: a column heading sorts the table and sets aria-sort', async () => {
    await page.locator('#shell-main .kx-table thead button', { hasText: 'Total' }).click(); await settle(page);
    let rows = await matchTable(page);
    eq(rows[0].name, 'Quillon Waste Services Ltd', 'largest total first');
    eq(await page.locator('#shell-main .kx-table thead th[aria-sort]').getAttribute('aria-sort'), 'descending');
    await page.locator('#shell-main .kx-table thead button', { hasText: 'Name as paid' }).click(); await settle(page);
    rows = await matchTable(page);
    eq(rows.map((r) => r.name.toLowerCase()), rows.map((r) => r.name.toLowerCase()).slice().sort((a, b) => a.localeCompare(b)), 'alphabetical');
    await page.locator('#shell-main .kx-table thead button', { hasText: 'Status' }).click(); await settle(page);
    eq((await matchTable(page))[0].name, 'Larchmont Grounds Maintenance', 'status sort puts Suggested first');
  });

  /* ------------------------------------------------------------ R44 confirm / reject */
  await check('R44 starting numbers: headline £6.1m across 15 contracts, C-009 89.1% Close to cap', async () => {
    if (!overviewIsReal) return skip('headline', 'Overview is a stub');
    eq(await headlineOf(page), HEADLINE_START, 'headline');
    await go(page, '#/spend');
    const c009 = (await capRows(page)).find((r) => titleToId[r.title] === 'C-009');
    has(c009.stat, '89.1%'); has(c009.stat, 'Close to cap');
  });
  await visit(t, '#/spend/matches');
  await check('R44 Confirm match on Larchmont: toast, status Confirmed, Overview headline £6.2m across 15 contracts, C-009 102.7% Over cap £60,000', async () => {
    eq((await primaries(page)).length, 1, 'one primary button on the matches tab');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Confirm match/ }).click();
    await settle(page, 400);
    eq(await toastText(page), 'Match confirmed. 6 payments (£300,000) now count towards Grounds maintenance.', 'toast');
    const row = (await matchTable(page)).find((r) => r.name === 'Larchmont Grounds Maintenance');
    eq([row.method, row.status], ['Confirmed by you', 'Confirmed'], 'row after confirm'); has(row.supplier, 'You confirmed this match.');
    ok(!(await page.getByRole('button', { name: /Reject match/ }).count()), 'Reject match is gone from the decided row');
    has(await innerNorm(page.locator('.mt-effects')), 'Grounds maintenance now reads 102.7% of its cap: Over cap, £60,000 over.');
    eq(await page.evaluate(() => localStorage.getItem('kontor-matches')), JSON.stringify({ 'Larchmont Grounds Maintenance': 'confirm' }), 'persisted decision');
    if (overviewIsReal) eq(await headlineOf(page), HEADLINE_CONFIRMED, 'headline after confirm'); else skip('headline after confirm', 'Overview is a stub');
    await go(page, '#/spend');
    const rows = await capRows(page);
    const c009 = rows.find((r) => titleToId[r.title] === 'C-009');
    has(c009.stat, '102.7%'); has(c009.stat, 'Over cap'); has(c009.num, '£60,000 over'); has(c009.num, '£2,260,000');
    eq(titleToId[rows[3].title], 'C-009', 'C-009 moves up to fourth, between C-011 and C-001');
    eq((await tiles(page)).map((x) => x.value), ['4', '2', '18', '£4,232,000'], 'summary after confirm');
  });
  await check('R44 C-009 leaves the watch list (Opportunities), when that screen is part of the build', async () => {
    await go(page, '#/opportunities');
    const real = (await page.locator('#shell-main h1').innerText()).includes('Opportunities to investigate');
    if (!real) return skip('watch list', 'Opportunities is not part of this build');
    const watch = norm(await page.locator('#opp-watch-title').locator('xpath=ancestor::section[1]').innerText());
    ok(!/Grounds maintenance/.test(watch), 'C-009 should have left the watch list: ' + watch.slice(0, 200));
    has(watch, 'Mobile voice and data');
  });
  await check('R44 the decision survives a reload (Confirmed, headline £6.2m, 102.7%)', async () => {
    await visit(t, '#/spend/matches');
    const row = (await matchTable(page)).find((r) => r.name === 'Larchmont Grounds Maintenance');
    eq(row.status, 'Confirmed', 'status after reload');
    if (overviewIsReal) { await go(page, '#/overview'); await page.reload(); await page.waitForSelector('#shell-main h1'); eq(norm(await page.locator('#shell-main h1').innerText()), HEADLINE_CONFIRMED, 'headline after reload'); }
    await visit(t, '#/spend');
    has((await capRows(page)).find((r) => titleToId[r.title] === 'C-009').stat, '102.7%');
  });
  await check('R44 Undo decision returns the row to Suggested and the numbers to the start (headline £6.1m, C-009 89.1%)', async () => {
    await visit(t, '#/spend/matches');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Undo decision/ }).click(); await settle(page, 300);
    const row = (await matchTable(page)).find((r) => r.name === 'Larchmont Grounds Maintenance');
    eq(row.status, 'Suggested', 'back to suggested');
    has(await toastText(page), 'Decision undone.');
    eq(await page.evaluate(() => localStorage.getItem('kontor-matches')), '{}', 'decision removed from storage');
    if (overviewIsReal) eq(await headlineOf(page), HEADLINE_START, 'headline');
    await go(page, '#/spend');
    has((await capRows(page)).find((r) => titleToId[r.title] === 'C-009').stat, '89.1%');
  });
  await check('R44 Reject match: toast "Match rejected. Larchmont Grounds Maintenance is now unmatched.", numbers equal the start, persists, no-contract list gains the payee', async () => {
    await visit(t, '#/spend/matches');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Reject match/ }).click(); await settle(page, 400);
    eq(await toastText(page), 'Match rejected. Larchmont Grounds Maintenance is now unmatched.', 'toast');
    const row = (await matchTable(page)).find((r) => r.name === 'Larchmont Grounds Maintenance');
    eq(row.status, 'Rejected', 'row after reject'); has(row.supplier, 'No match'); has(row.supplier, 'You rejected this match. Its payments are not counted.');
    eq(await page.evaluate(() => localStorage.getItem('kontor-matches')), JSON.stringify({ 'Larchmont Grounds Maintenance': 'reject' }), 'persisted');
    if (overviewIsReal) eq(await headlineOf(page), HEADLINE_START, 'headline unchanged');
    await go(page, '#/spend');
    const c009 = (await capRows(page)).find((r) => titleToId[r.title] === 'C-009'); has(c009.stat, '89.1%'); has(c009.stat, 'Close to cap');
    eq((await tiles(page)).map((x) => x.value), ['3', '3', '18', '£4,172,000'], 'summary unchanged');
    await visit(t, '#/spend/no-contract');
    has(await innerNorm(page.locator('.noc-intro')), '9 payees, £24,130,000 paid');
    const names = await page.$$eval('.kviz-barlist__name', (as) => as.map((a) => a.textContent.trim()));
    ok(names.includes('Larchmont Grounds Maintenance'), 'the rejected payee is now listed as having no contract');
    await visit(t, '#/spend/matches');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Undo decision/ }).click(); await settle(page, 300);
    eq((await matchTable(page))[0].status, 'Suggested', 'undo after reject');
    await visit(t, '#/spend/no-contract');
    has(await innerNorm(page.locator('.noc-intro')), '8 payees, £23,830,000 paid');
  });
  await check('R44 keyboard: Tab reaches Confirm match then Reject match, Enter confirms, focus moves to Undo decision', async () => {
    await visit(t, '#/spend/matches');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Confirm match/ }).focus();
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { w: s.outlineWidth, style: s.outlineStyle }; });
    eq(ring, { w: '2px', style: 'solid' }, 'focus ring on the primary button');
    await page.keyboard.press('Tab');
    has(await page.evaluate(() => document.activeElement.textContent), 'Reject match', 'tab order');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter'); await settle(page, 400);
    const f = await page.evaluate(() => document.activeElement.textContent);
    has(f, 'Undo decision', 'focus follows the row'); has(f, 'Larchmont Grounds Maintenance', 'accessible name names the payee');
    await page.keyboard.press('Enter'); await settle(page, 300);
    const g = await page.evaluate(() => document.activeElement.textContent);
    has(g, 'Confirm match', 'focus returns to Confirm after Undo');
  });

  await check('R45 conservative counting: C-009 counts only the accepted name until you confirm Larchmont Grounds Maintenance (then £1,960,000.00 becomes £2,260,000.00)', async () => {
    await visit(t, '#/spend?payments=C-009'); await settle(page, 300);
    let d = drawer(page);
    let names = await d.locator('.kx-table tbody tr td:nth-child(3)').allInnerTexts();
    ok(names.length && names.every((n) => n === 'Larchmont Grounds Ltd'), 'only the accepted name before the decision: ' + [...new Set(names)]);
    eq(await d.locator('[data-pay-total]').getAttribute('data-pay-total'), '1960000.00', 'total before');
    await visit(t, '#/spend/matches');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Confirm match/ }).click(); await settle(page, 300);
    await visit(t, '#/spend?payments=C-009'); await settle(page, 300);
    d = drawer(page);
    eq(await d.locator('[data-pay-total]').getAttribute('data-pay-total'), '2260000.00', 'total after');
    const all = [];
    for (let i = 0; i < 6; i++) {
      all.push(...await d.locator('.kx-table tbody tr td:nth-child(3)').allInnerTexts());
      const next = d.locator('nav[aria-label="Payments in the contract term pages"] button[aria-label="Next page"]');
      if (!(await next.count()) || (await next.isDisabled())) break; await next.click(); await settle(page, 60);
    }
    eq(all.filter((n) => n === 'Larchmont Grounds Maintenance').length, 6, 'the six confirmed payments are listed');
    await closeDrawer(page);
    await visit(t, '#/spend/matches');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Undo decision/ }).click(); await settle(page, 300);
  });
  await check('assumptions and review status: the near-cap threshold moves the counts (80%: 3/4/17, 90%: 3/2/19), a triage decision does not move the total over cap', async () => {
    const set = async (key, v) => { await page.evaluate(([k, x]) => (x === null ? localStorage.removeItem(k) : localStorage.setItem(k, x)), [key, v]); };
    await set('kontor-assumptions', JSON.stringify({ nearCapThreshold: 0.8 }));
    await visit(t, '#/spend');
    eq((await tiles(page)).map((x) => x.value), ['3', '4', '17', '£4,172,000'], '80%'); has((await tiles(page))[1].foot, '80% to 100%');
    await visit(t, '#/spend?state=close');
    eq((await capIds(page)), ['C-001', 'C-017', 'C-009', 'C-004'], 'C-004 joins the close list at 80%');
    await set('kontor-assumptions', JSON.stringify({ nearCapThreshold: 0.9 }));
    await visit(t, '#/spend');
    eq((await tiles(page)).map((x) => x.value), ['3', '2', '19', '£4,172,000'], '90%');
    await set('kontor-assumptions', null);
    await set('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'explained' }));
    await visit(t, '#/spend');
    eq((await tiles(page)).map((x) => x.value), ['3', '3', '18', '£4,172,000'], 'a reviewed flag changes the opportunity total, not the cap facts');
    eq((await capIds(page)).slice(0, 2), ['C-005', 'C-007'], 'C-005 stays on the cap list');
    await set('kontor-triage', null);
  });
  await check('"Above contract value (estimate)": a contract-value cap that is exceeded reads as an estimate, not "Over cap" (adapter, synthetic breach)', async () => {
    const { capItems } = await import('../../src/charts/adapters.js');
    const { capStateLabel } = await import('../../src/lib/copy.js');
    const cs = { contractId: 'C-017', testable: true, basis: 'total_term', source: 'contract_value', capGBP: 1090000, spendAgainstCap: 1200000, utilisation: 1.1009, state: 'over', capState: 'above_estimate', excessGBP: 110000 };
    const est = { capRows: [cs], contractsById: { 'C-017': contractOf('C-017') }, summaries: { 'C-017': { coverage: 'full' } } };
    const [it] = capItems(est);
    eq([it.stateLabel, it.sourceLabel, it.basisLabel], ['Above contract value (estimate)', 'Contract value (no maximum stated)', 'Whole term'], 'adapter labels');
    eq(capStateLabel(cs), 'Above contract value (estimate)', 'copy label');
  });

  /* ------------------------------------------------------------ R46 no contract */
  await visit(t, '#/spend/no-contract');
  await check('R46 eight payees, £23,830,000 in total, Dunmoor Agency Staffing Ltd £9,300,000 first, in the golden order', async () => {
    has(await innerNorm(page.locator('.noc-intro')), '8 payees, £23,830,000 paid, no contract on the register.');
    const rows = await page.$$eval('.kviz-barlist__list > li', (lis) => lis.map((li) => ({ name: li.querySelector('.kviz-barlist__name').textContent.trim(), text: li.innerText.replace(/\s+/g, ' ').trim() })));
    eq(rows.length, 8, 'rows');
    eq(rows.map((r) => r.name), NO_CONTRACT.map((x) => x[0]), 'order');
    NO_CONTRACT.forEach(([name, total, n], i) => { has(rows[i].text, gbp(total), name); has(rows[i].text, `${n} payments with no contract match.`, name); });
    eq(NO_CONTRACT.reduce((s, x) => s + x[1], 0), 23830000, 'golden rows add up');
    const stats = norm(await page.locator('.kviz-cov__stats').innerText());
    has(stats, '£23,830,000'); has(stats, '£129,359,000'); has(stats, '84%'); has(stats, '£300,000'); has(stats, 'Awaiting your review');
  });
  await check('R46 the 7.4 intro, "There is no contract to read, so there is no clause to link" on every row, no clause link anywhere, not in the headline', async () => {
    const intro = await innerNorm(page.locator('.noc-intro'));
    eq(intro, "8 payees, £23,830,000 paid, no contract on the register. That doesn't mean something is wrong. The contract may sit under a framework, fall below the publication threshold, or be missing from the register. There is no contract text to read here, so there is no clause to link and these amounts are not in the headline total.", 'intro');
    const rows = await page.$$eval('.kviz-barlist__list > li', (lis) => lis.map((li) => li.innerText.replace(/\s+/g, ' ')));
    rows.forEach((r, i) => has(r, 'There is no contract to read, so there is no clause to link', 'row ' + (i + 1)));
    eq(await page.locator('#shell-main a.clause-link').count(), 0, 'no clause links');
    eq(await page.locator('#shell-main a[href^="#/source"]').count(), 0, 'no source links');
    if (overviewIsReal) { const hl = await headlineOf(page); has(hl, '£6.1m across 15 contracts'); ok(!/23[.,]8/.test(hl), 'the headline does not include the no-contract spend'); }
  });
  await check('R46 a supplier row opens a payments drawer: all payments under the name, subtotal £9,300,000.00 to the penny', async () => {
    await visit(t, '#/spend/no-contract');
    await page.locator('.kviz-barlist__name', { hasText: 'Dunmoor Agency Staffing Ltd' }).click();
    await drawer(page).waitFor({ state: 'visible' }); await settle(page, 320);
    const d = drawer(page);
    eq(norm(await d.locator('h2').first().innerText()), 'Payments with no contract on the register', 'title');
    has(await d.innerText(), 'Dunmoor Agency Staffing Ltd');
    eq(norm(await subtotalOf(page, '[role="dialog"].pay-drawer')), '£9,300,000.00', 'subtotal');
    const { total, n } = await sumAllPages(page, '[role="dialog"].pay-drawer', 'Payee payments pages');
    eq([n, total], [54, 930000000], 'every payment, to the penny');
    eq(await hashOf(page), '#/spend/no-contract?payee=Dunmoor+Agency+Staffing+Ltd', 'address');
    await closeDrawer(page);
    const f = await page.evaluate(() => document.activeElement.textContent);
    has(f, 'Dunmoor Agency Staffing Ltd', 'focus returned to the supplier row');
  });

  /* ------------------------------------------------------------ copy, one primary per section, R13, R10 */
  await check('R71 copy lint on the three tabs and the open drawers: no "!", no emoji, no "saving", [Verb]+[Object] buttons, sentence case', async () => {
    await visit(t, '#/spend'); await lint(page, 'cap tab');
    await page.getByRole('button', { name: 'Show all 24 contracts' }).click(); await lint(page, 'cap tab, all rows');
    await visit(t, '#/spend?payments=C-011'); await settle(page, 300); await lint(page, 'C-011 drawer');
    await visit(t, '#/spend?payments=C-007'); await settle(page, 300); await lint(page, 'C-007 drawer');
    await visit(t, '#/spend/matches'); await lint(page, 'matches tab');
    await page.locator('details.mt-how summary').click(); await lint(page, 'matches tab, disclosure open');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Confirm match/ }).click(); await settle(page, 400); await lint(page, 'matches tab, after confirm');
    await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Undo decision/ }).click(); await settle(page, 300);
    await visit(t, '#/spend/no-contract'); await lint(page, 'no-contract tab');
    await visit(t, '#/spend/no-contract?payee=Mirefield%20Training%20Partners%20Ltd'); await settle(page, 300); await lint(page, 'payee drawer');
  });
  await check('R72 at most one primary button per page: none on the cap tab and drawers, Confirm match only on the matches tab', async () => {
    await visit(t, '#/spend'); eq(await primaries(page), [], 'cap');
    await visit(t, '#/spend/matches'); eq((await primaries(page)).length, 1, 'matches');
    await visit(t, '#/spend/no-contract'); eq(await primaries(page), [], 'no contract');
  });
  await check('R13 every derived pound is labelled indicative on the cap tab (panel, tiles, drawer) and the word is never "savings"', async () => {
    await visit(t, '#/spend');
    const body = await innerNorm(page.locator('#shell-main'));
    has(body, 'Amounts are indicative.'); has(body, 'Indicative, across 3 contracts'); has(body, 'Over-by amounts and spend are indicative.');
    await visit(t, '#/spend?payments=C-005'); await settle(page, 300);
    has(await drawer(page).innerText(), 'Over by, indicative');
  });

  /* ------------------------------------------------------------ accessibility, both themes */
  const axeStates = [
    ['cap tab', '#/spend'], ['cap tab, filtered', '#/spend?state=over'], ['matches tab', '#/spend/matches'], ['matches tab, filtered', '#/spend/matches?status=yours'], ['no-contract tab', '#/spend/no-contract'],
    ['drawer C-005', '#/spend?payments=C-005'], ['drawer C-007', '#/spend?payments=C-007'], ['drawer C-011', '#/spend?payments=C-011'], ['payee drawer', '#/spend/no-contract?payee=Dunmoor%20Agency%20Staffing%20Ltd'],
  ];
  for (const theme of ['dark', 'light']) {
    await check(`axe ${theme}: ${axeStates.length} states with 0 violations (wcag2a/aa/21aa/22aa + best-practice)`, async () => {
      await setTheme(page, theme);
      const bad = [];
      for (const [name, hash] of axeStates) {
        await visit(t, hash); await setTheme(page, theme); await settle(page, 350); await calmPointer(page);
        const v = await axe(page);
        if (v.length) bad.push(`${name}: ` + v.map((x) => `${x.id} (${x.count}) ${x.targets[0]}`).join('; '));
      }
      ok(!bad.length, bad.join(' || '));
    });
  }
  await check('axe both themes: cap tab table view, disclosure open, a toast on screen, the Year 4 selection and the empty review filter', async () => {
    const bad = [];
    for (const theme of ['dark', 'light']) {
      await visit(t, '#/spend'); await setTheme(page, theme);
      await page.getByRole('button', { name: 'Show table' }).click(); await settle(page); await calmPointer(page);
      let v = await axe(page); if (v.length) bad.push(`${theme} table twin: ` + v.map((x) => `${x.id} ${x.targets[0]}`).join('; '));
      await visit(t, '#/spend/matches'); await setTheme(page, theme);
      await page.locator('details.mt-how summary').click(); await settle(page, 100); await calmPointer(page);
      v = await axe(page); if (v.length) bad.push(`${theme} disclosure: ` + v.map((x) => `${x.id} ${x.targets[0]}`).join('; '));
      await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Confirm match/ }).click(); await settle(page, 500); await calmPointer(page);
      v = await axe(page); if (v.length) bad.push(`${theme} confirmed + toast: ` + v.map((x) => `${x.id} ${x.targets[0]}`).join('; '));
      await page.locator('.mt-chips .kx-chip', { hasText: 'Needs your review' }).click(); await settle(page); await calmPointer(page);
      v = await axe(page); if (v.length) bad.push(`${theme} empty review: ` + v.map((x) => `${x.id} ${x.targets[0]}`).join('; '));
      await visit(t, '#/spend/matches'); await matchRow(page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Undo decision/ }).click(); await settle(page, 300);
      await visit(t, '#/spend?payments=C-011'); await setTheme(page, theme); await settle(page, 300);
      await drawer(page).getByRole('radio', { name: /Year 4/ }).click(); await settle(page); await calmPointer(page);
      v = await axe(page); if (v.length) bad.push(`${theme} year 4: ` + v.map((x) => `${x.id} ${x.targets[0]}`).join('; '));
    }
    ok(!bad.length, bad.join(' || '));
  });
  await setTheme(page, 'dark');

  /* ------------------------------------------------------------ layout */
  await check('layout: no horizontal page scroll on the three tabs at 1440x900, 1366x768, 1024x768 and 390x844, in both themes', async () => {
    const bad = [];
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const tt = await h.newPage({ theme: 'dark', viewport: vp });
      for (const theme of ['dark', 'light']) {
        for (const hash of ['#/spend', '#/spend/matches', '#/spend/no-contract', '#/spend?payments=C-011', '#/spend/no-contract?payee=Dunmoor%20Agency%20Staffing%20Ltd']) {
          await visit(tt, hash); await setTheme(tt.page, theme); await settle(tt.page, 250);
          const m = await tt.page.evaluate(() => {
            const main = document.querySelector('#shell-main');
            const dr = document.querySelector('[role="dialog"].pay-drawer');
            return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: main.scrollWidth - main.clientWidth, drawer: dr ? dr.scrollWidth - dr.clientWidth : 0 };
          });
          if (m.doc > 0 || m.main > 0 || m.drawer > 0) bad.push(`${vpName} ${theme} ${hash}: ${JSON.stringify(m)}`);
        }
      }
      await tt.ctx.close();
    }
    ok(!bad.length, bad.join(' | '));
  });
  await check('layout 390x844: the summary tiles sit two by two, the first golden row is readable, the tab strip scrolls instead of wrapping', async () => {
    const tt = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.phone });
    await visit(tt, '#/spend');
    const w = await tt.page.$$eval('.cap-tile', (ts) => ts.map((x) => Math.round(x.getBoundingClientRect().width)));
    ok(w.length === 4 && w.every((x) => x > 140 && x < 200), 'tiles width ' + w);
    const tabs = await tt.page.$$eval('.spend .kx-routetab', (as) => as.map((a) => Math.round(a.getBoundingClientRect().top)));
    ok(new Set(tabs).size === 1, 'the three tabs share one row: ' + tabs);
    ok(await tt.page.locator(CAP_LI).first().isVisible(), 'first row visible');
    await tt.ctx.close();
  });

  /* ------------------------------------------------------------ resilience and hygiene */
  await check('R76 storage blocked: the three tabs render, Confirm match works for the session', async () => {
    const tt = await h.newPage({ theme: 'dark', blockStorage: true });
    await visit(tt, '#/spend'); eq((await capRows(tt.page)).length, 12, 'cap rows');
    await go(tt.page, '#/spend/matches');
    await matchRow(tt.page, 'Larchmont Grounds Maintenance').getByRole('button', { name: /Confirm match/ }).click(); await settle(tt.page, 300);
    eq((await matchTable(tt.page)).find((r) => r.name === 'Larchmont Grounds Maintenance').status, 'Confirmed', 'confirmed in memory');
    await go(tt.page, '#/spend/no-contract'); eq(await tt.page.locator('.kviz-barlist__list > li').count(), 8, 'no-contract rows');
    eq(tt.errors.filter((e) => !/localStorage|insecure/i.test(e)), [], 'console errors');
    await tt.ctx.close();
  });
  await check('R10 the figures do not move when the browser clock is moved (no new Date() in a derivation)', async () => {
    const tt = await h.newPage({ theme: 'dark' });
    await tt.page.clock.install({ time: new Date('2031-03-01T12:00:00Z') });
    await visit(tt, '#/spend');
    eq((await tiles(tt.page)).map((x) => x.value), ['3', '3', '18', '£4,172,000'], 'tiles');
    eq((await capIds(tt.page)).slice(0, 3), ['C-005', 'C-007', 'C-011'], 'order');
    has(await tt.page.locator('.page-header__asat').innerText(), '6 October 2026');
    await tt.ctx.close();
  });
  await check('no console errors and no request leaves the origin', async () => {
    eq(t.errors, [], 'console errors');
    eq(externalRequests(t).map((r) => r.url), [], 'external requests');
  });
} finally { await h.close(); }

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
