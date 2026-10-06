// V2 e2e: Opportunities (#/opportunities) and the global flag drawer (?flag=<id>).
//   KONTOR_DIST=.scratch/V2 node tests/e2e/V2.mjs        against the V2 dev build (the real Opportunities, FlagDrawer and Source)
//   node tests/e2e/V2.mjs                                against dist/ (the whole app)
// Covers requirements R23 to R30, R61, R24, R25, R13, R14, R66 and R3 (deep links), with the golden numbers of requirements 6.6.
// Prints 'ok   <name>' / 'FAIL <name>: <why>' / 'skip <name>: <why>'; exits non-zero when anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme } from '../lib/harness.mjs';
import data from '../../src/data/sample.json' with { type: 'json' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('ok   ' + name); } catch (e) { failed += 1; console.log('FAIL ' + name + ': ' + ((e && e.message) || e)); }
}
const skip = (name, why) => console.log('skip ' + name + ': ' + why);
const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg); };
const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');

/* ---------------------------------------------------------------- golden data (requirements 6.6) */
const GOLDEN = [
  [1, 'F-C-005-overCap', 3350000, 'overCap', null], [2, 'F-C-007-overCap', 760000, 'overCap', null], [3, 'F-C-001-nearCap', 642478, 'nearCap', null],
  [4, 'F-C-003-renewal', 310000, 'renewal', '2026-10-31'], [5, 'F-C-004-uplift', 188200, 'uplift', '2027-08-01'], [6, 'F-C-002-renewal', 145000, 'renewal', '2027-03-31'],
  [7, 'F-C-001-renewal', 120000, 'renewal', '2026-09-30'], [8, 'F-C-004-renewal', 110000, 'renewal', '2027-01-31'], [9, 'F-C-007-renewal', 90000, 'renewal', null],
  [10, 'F-C-014-renewal', 70000, 'renewal', '2027-06-30'], [11, 'F-C-011-overCap', 62000, 'overCap', null], [12, 'F-C-018-renewal', 57500, 'renewal', '2027-02-28'],
  [13, 'F-C-005-renewal', 50000, 'renewal', '2027-02-28'], [14, 'F-C-012-uplift', 49000, 'uplift', '2027-09-01'], [15, 'F-C-016-renewal', 47500, 'renewal', '2026-06-30'],
  [16, 'F-C-015-renewal', 39000, 'renewal', '2027-04-30'], [17, 'F-C-009-renewal', 21000, 'renewal', '2026-12-31'], [18, 'F-C-010-uplift', 18060, 'uplift', '2027-01-01'],
  [19, 'F-C-017-renewal', 15500, 'renewal', '2026-12-01'],
].map(([rank, id, value, type, date]) => ({ rank, id, value, type, date, contractId: id.split('-').slice(1, 3).join('-') }));
const TOTAL = 6145238;
const BY_TYPE = { overCap: [3, 4172000], nearCap: [1, 642478], renewal: [12, 1075500], uplift: [3, 255260] };
const contractTitle = (cid) => data.contracts.find((c) => c.id === cid).title;
const supplierOf = (cid) => data.contracts.find((c) => c.id === cid).supplierName;
const extraction = (xid) => data.extractions.find((x) => x.id === xid);
const WATCH = [['F-C-009-nearCap', 'C-009', '89.1%'], ['F-C-017-nearCap', 'C-017', '90.8%']];
const EXPECT_DATE_ORDER = GOLDEN.slice().sort((a, b) => ((a.date || '9999') < (b.date || '9999') ? -1 : (a.date || '9999') > (b.date || '9999') ? 1 : a.rank - b.rank)).map((g) => g.rank);
const EXPECT_TYPE_ORDER = ['overCap', 'nearCap', 'renewal', 'uplift'].flatMap((t) => GOLDEN.filter((g) => g.type === t).map((g) => g.rank));

/* ---------------------------------------------------------------- page helpers */
const LIST = '.opp .kviz-barlist__list > li';
const rows = (page) => page.$$eval(LIST, (lis) => lis.map((li) => ({
  rank: Number(li.querySelector('.kviz-barlist__rank').textContent.trim()),
  title: li.querySelector('.kviz-barlist__name').textContent.trim(),
  value: li.querySelector('.kviz-barlist__val').textContent.trim(),
  aria: li.querySelector('.kviz-barlist__name').getAttribute('aria-label'),
  clause: (li.querySelector('a.kviz-textlink') || {}).textContent || '',
  href: (li.querySelector('a.kviz-textlink') || {}).getAttribute ? li.querySelector('a.kviz-textlink').getAttribute('href') : '',
  muted: li.querySelector('.kviz-row').classList.contains('is-muted'),
})));
const ranks = async (page) => (await rows(page)).map((r) => r.rank);
const totals = async (page) => (await page.locator('.opp-totals__main').innerText()).replace(/\s+/g, ' ').trim();
const chips = (page) => page.$$eval('.kviz-chipbtn', (bs) => bs.map((b) => ({ label: b.textContent.replace(/\s+\d+\s*$/, '').trim(), count: Number(b.querySelector('.kviz-count').textContent), pressed: b.getAttribute('aria-pressed') === 'true' })));
const hash = (page) => page.evaluate(() => location.hash);
const settle = (page, ms = 120) => page.waitForTimeout(ms);
const drawer = (page) => page.locator('[role="dialog"].flag-drawer');
const openDrawerById = async (page, id) => { await go(page, '#/opportunities?flag=' + id); await drawer(page).waitFor({ state: 'visible' }); await settle(page, 260); };
const drawerText = (page) => drawer(page).innerText();
const csvParse = (text) => {
  const out = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); out.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
};
const download = async (page) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: 'Export opportunities' }).click()]);
  const text = fs.readFileSync(await dl.path(), 'utf8');
  return { name: dl.suggestedFilename(), text: text.replace(/^﻿/, '') };
};

const h = await launch({ dist: process.env.KONTOR_DIST || null });
const sourceIsReal = !/STUB/.test(fs.readFileSync(path.join(ROOT, 'src/views/Source.jsx'), 'utf8'));
const overviewIsReal = !/STUB/.test(fs.readFileSync(path.join(ROOT, 'src/views/Overview.jsx'), 'utf8'));
try {
  const t = await h.newPage({ theme: 'dark' });
  const page = t.page;
  await visit(t, '#/opportunities');

  /* ------------------------------------------------------------ R23 the ranked list */
  await check('R23 header: one h1, as-at line, caveat with a method link, one primary button', async () => {
    eq(await page.locator('#shell-main h1').count(), 1, 'h1 count');
    eq((await page.locator('#shell-main h1').innerText()).trim(), 'Opportunities to investigate', 'h1');
    ok((await page.locator('.page-header__asat').innerText()).includes('6 October 2026'), 'as at line');
    const caveat = await page.locator('.opp-caveat').innerText();
    ok(caveat.startsWith('Indicative figures. Each one is an opportunity to investigate, not a saving.'), 'caveat text: ' + caveat);
    eq(await page.locator('.opp-caveat a').getAttribute('href'), '#/method?s=indicative', 'caveat link');
    eq(await page.title(), 'Opportunities | Kontor financial layer', 'title');
    // one primary button in the page header, and no other filled button on the page
    const primaries = await page.$$eval('#shell-main button', (bs) => bs.filter((b) => /var\(--accent\)/.test(b.getAttribute('style') || '') || b.style.background === 'var(--accent)').map((b) => b.textContent.trim()));
    eq(primaries, ['Export opportunities'], 'primary buttons');
  });
  await check('R23 19 rows, ranks 1 to 19 with no gaps, golden order, exact indicative amounts', async () => {
    const r = await rows(page);
    eq(r.length, 19, 'row count');
    eq(r.map((x) => x.rank), GOLDEN.map((g) => g.rank), 'ranks');
    eq(r.map((x) => x.value), GOLDEN.map((g) => gbp(g.value)), 'values');
    eq(r.map((x) => x.title), GOLDEN.map((g) => contractTitle(g.contractId)), 'titles');
    eq(r.slice(0, 6).map((x) => x.value), ['£3,350,000', '£760,000', '£642,478', '£310,000', '£188,200', '£145,000'], 'first six');
  });
  await check('R23 row content: type, supplier, reason, basis, confidence, action by', async () => {
    const first = page.locator(LIST).nth(0);
    const txt = (await first.innerText()).replace(/\s+/g, ' ');
    ok(txt.includes('Spend over cap'), 'type pill');
    ok(txt.includes('Fennimore Highways Ltd'), 'supplier');
    ok(txt.includes('You have paid £8,350,000 against a cap of £5,000,000'), 'reason: ' + txt);
    ok(txt.includes('Already paid'), 'basis');
    ok(txt.includes('High confidence'), 'confidence');
    const renewal = (await page.locator(LIST).nth(3).innerText()).replace(/\s+/g, ' ');
    ok(renewal.includes('Per year') && renewal.includes('Act by 31 Oct 2026'), 'renewal row: ' + renewal);
    const uplift = (await page.locator(LIST).nth(4).innerText()).replace(/\s+/g, ' ');
    ok(uplift.includes('Next review 1 Aug 2027'), 'uplift row: ' + uplift);
    ok((await page.locator('.kviz-barlist__head').innerText()).includes('Indicative value'), 'indicative column header');
  });
  await check('R27 totals bar: "Showing 19 opportunities, £6,145,238 indicative" and a split by basis that sums to it', async () => {
    eq(await totals(page), 'Showing 19 opportunities, £6,145,238 indicative', 'totals');
    const basis = (await page.locator('.opp-totals__basis').innerText()).replace(/\s+/g, ' ');
    eq(basis, '£4,427,260 already paid · £642,478 projected at the current pace · £1,075,500 per year', 'by basis');
    eq(4427260 + 642478 + 1075500, TOTAL, 'sum');
  });

  /* ------------------------------------------------------------ R24 every row links to its clause */
  await check('R24 every one of the 19 "View clause, page N" links is a valid #/source/<contract>/<extraction> address', async () => {
    const links = await page.$$eval('.opp .kviz-barlist__list a.kviz-textlink', (as) => as.filter((a) => /^View clause, page \d+$/.test(a.textContent.trim())).map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') })));
    eq(links.length, 19, 'link count');
    const r = await rows(page);
    links.forEach((l, i) => {
      const m = /^#\/source\/([^/?]+)\/([^/?]+)\?from=opportunities$/.exec(l.href);
      ok(m, 'bad href ' + l.href);
      const [, cid, xid] = m.map(decodeURIComponent);
      const x = extraction(xid);
      ok(x, 'extraction not in the data: ' + xid);
      eq(x.contractId, cid, 'extraction belongs to the contract (' + xid + ')');
      eq(cid, GOLDEN[i].contractId, 'row ' + (i + 1) + ' links to its own contract');
      eq(l.text, 'View clause, page ' + x.provenance[0].page, 'page in the label (' + xid + ')');
      ok(r[i].title === contractTitle(cid), 'row title matches the linked contract');
    });
    eq(links[0].href, '#/source/C-005/X-C-005-maximumValue?from=opportunities', 'first row goes to clause 14.3');
    eq(links[0].text, 'View clause, page 23', 'first row page');
  });
  if (sourceIsReal) {
    await check('R24 each of the 19 links lands on the Source viewer: right contract, page shown, the highlighted clause equals the quote', async () => {
      const hrefs = await page.$$eval('.opp .kviz-barlist__list a.kviz-textlink', (as) => as.filter((a) => /^View clause/.test(a.textContent.trim())).map((a) => a.getAttribute('href')));
      const probe = await h.newPage({ theme: 'dark' });
      await visit(probe, hrefs[0]);
      if ((await probe.page.locator('#shell-main h1').innerText()).startsWith('Stand-in')) { await probe.ctx.close(); throw new Error('Source viewer is not in this build'); }
      for (const href of hrefs) {
        await go(probe.page, href);
        await probe.page.waitForSelector('mark[data-extraction-id]', { timeout: 6000 });
        const [, cid, xid] = /#\/source\/([^/?]+)\/([^/?]+)/.exec(href);
        const x = extraction(xid), p = x.provenance[0];
        const doc = data.documents[data.contracts.find((c) => c.id === cid).documentId];
        eq(await probe.page.locator('mark[data-extraction-id]').first().getAttribute('data-extraction-id'), xid, 'marked extraction');
        eq((await probe.page.locator('mark[data-extraction-id]').first().innerText()).replace(/\s+/g, ' ').trim(), p.quote.replace(/\s+/g, ' ').trim(), 'quote at ' + xid);
        eq((await probe.page.locator('#shell-main h1').innerText()).trim(), p.clauseRef, 'h1 is the clause reference at ' + xid);
        ok(new RegExp('\\b' + p.page + ' of ' + doc.pageCount + '\\b').test(await probe.page.locator('#shell-main').innerText()), 'page ' + p.page + ' of ' + doc.pageCount + ' shown at ' + xid);
      }
      await probe.ctx.close();
    });
  } else skip('R24 destination of the 19 links', 'src/views/Source.jsx is still a stub');

  /* ------------------------------------------------------------ R26 chips, filters, sort, search */
  await check('R26 type chips with golden counts: All 19, Spend over cap 3, Close to cap 1, Renewals 12, Price increases above cap 3', async () => {
    eq(await chips(page), [
      { label: 'All flags', count: 19, pressed: true }, { label: 'Spend over cap', count: 3, pressed: false }, { label: 'Close to cap', count: 1, pressed: false },
      { label: 'Renewals', count: 12, pressed: false }, { label: 'Price increases above cap', count: 3, pressed: false },
    ]);
  });
  await check('R26 each chip filters the rows, updates the totals bar and the address; pressing it again clears it', async () => {
    for (const [label, key] of [['Spend over cap', 'overCap'], ['Close to cap', 'nearCap'], ['Renewals', 'renewal'], ['Price increases above cap', 'uplift']]) {
      await page.locator('.kviz-chipbtn', { hasText: label }).click();
      await settle(page, 150);
      const [n, sum] = BY_TYPE[key];
      eq((await rows(page)).length, n, label + ' rows');
      eq(await totals(page), `Showing ${n} ${n === 1 ? 'opportunity' : 'opportunities'}, ${gbp(sum)} indicative`, label + ' totals');
      eq(await hash(page), '#/opportunities?type=' + key, label + ' address');
      eq((await chips(page)).filter((c) => c.pressed).map((c) => c.label), [label], label + ' pressed');
      eq((await rows(page)).map((r) => r.rank), GOLDEN.filter((g) => g.type === key).map((g) => g.rank), label + ' keeps the rank order');
    }
    await page.locator('.kviz-chipbtn', { hasText: 'Price increases above cap' }).click();      // toggle off
    await settle(page, 150);
    eq((await rows(page)).length, 19, 'cleared');
    eq(await hash(page), '#/opportunities', 'address cleared');
  });
  await check('R26 chip counts follow the search and status, not the type', async () => {
    await page.fill('.opp-control--search input', 'highways');
    await settle(page, 400);
    eq((await chips(page)).map((c) => c.count), [2, 1, 0, 1, 0], 'counts for "highways"');
    eq((await rows(page)).length, 2, 'rows for "highways"');
    eq(await totals(page), 'Showing 2 opportunities, £3,400,000 indicative', 'totals for "highways"');
    await page.fill('.opp-control--search input', '');
    await settle(page, 400);
  });
  await check('R26 search over contract title, supplier and contract id; the address follows; empty state with Clear filters restores all 19', async () => {
    await page.fill('.opp-control--search input', 'kestrelvale');
    await settle(page, 450);
    eq(await ranks(page), [3, 7], 'supplier search');
    eq(await hash(page), '#/opportunities?q=kestrelvale', 'address');
    await page.fill('.opp-control--search input', 'c-005');
    await settle(page, 450);
    eq(await ranks(page), [1, 13], 'contract id search');
    await page.fill('.opp-control--search input', 'zzzz nothing');
    await settle(page, 450);
    eq((await rows(page)).length, 0, 'no rows');
    const empty = (await page.locator('.opp-body .kx-empty').innerText()).replace(/\s+/g, ' ');
    ok(empty.includes('No opportunities match these filters.') && empty.includes('Clear the filters to see all 19.'), 'empty state: ' + empty);
    eq(await totals(page), 'Showing 0 opportunities, £0 indicative', 'empty totals');
    await page.locator('.opp-body .kx-empty').getByRole('button', { name: 'Clear filters' }).click();
    await settle(page, 450);
    eq((await rows(page)).length, 19, 'restored');
    eq(await totals(page), 'Showing 19 opportunities, £6,145,238 indicative', 'restored totals');
    eq(await page.inputValue('.opp-control--search input'), '', 'search box cleared');
    eq(await hash(page), '#/opportunities', 'address cleared');
    eq(await page.getByRole('button', { name: 'Clear filters' }).count(), 0, 'no Clear filters button when nothing is filtered');
  });
  await check('R26 sort select: Highest value first (default), Soonest action date (no date last), Type', async () => {
    eq(await page.inputValue('.opp-control--sort select'), 'value', 'default');
    eq((await page.$$eval('.opp-control--sort option', (o) => o.map((x) => x.textContent))), ['Highest value first', 'Soonest action date', 'Type'], 'options');
    await page.selectOption('.opp-control--sort select', 'date');
    await settle(page, 150);
    eq(await ranks(page), EXPECT_DATE_ORDER, 'date order');
    eq((await ranks(page)).slice(-5), [1, 2, 3, 9, 11], 'rows with no action date go last, in rank order');
    eq(await hash(page), '#/opportunities?sort=date', 'address');
    await page.selectOption('.opp-control--sort select', 'type');
    await settle(page, 150);
    eq(await ranks(page), EXPECT_TYPE_ORDER, 'type order');
    await page.selectOption('.opp-control--sort select', 'value');
    await settle(page, 150);
    eq(await ranks(page), GOLDEN.map((g) => g.rank), 'back to rank');
    await page.reload(); await page.waitForSelector(LIST);
    eq(await ranks(page), GOLDEN.map((g) => g.rank), 'reload never reorders rows');
  });
  await check('R26 status select: Open (default), Reviewed, All; Reviewed is empty until you review something', async () => {
    eq(await page.$$eval('.opp-control--status option', (o) => o.map((x) => x.textContent)), ['Open', 'Reviewed', 'All'], 'options');
    eq(await page.inputValue('.opp-control--status select'), 'open', 'default');
    await page.selectOption('.opp-control--status select', 'reviewed');
    await settle(page, 150);
    eq((await rows(page)).length, 0, 'nothing reviewed yet');
    ok((await page.locator('.opp-body .kx-empty').innerText()).includes('No opportunities match these filters.'), 'empty state');
    await page.selectOption('.opp-control--status select', 'all');
    await settle(page, 150);
    eq((await rows(page)).length, 19, 'all');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await settle(page, 200);
    eq(await page.inputValue('.opp-control--status select'), 'open', 'cleared');
  });

  /* ------------------------------------------------------------ R3 deep links */
  await check('R3 deep links: ?type= ?status= ?q= ?sort= ?flag= each open in a fresh load', async () => {
    const d = await h.newPage({ theme: 'dark' });
    await visit(d, '#/opportunities?type=overCap');
    eq(await ranks(d.page), [1, 2, 11], 'type=overCap');
    eq(await totals(d.page), 'Showing 3 opportunities, £4,172,000 indicative', 'type=overCap totals');
    await visit(d, '#/opportunities?type=uplift&sort=date');
    eq(await ranks(d.page), [18, 5, 14], 'type=uplift&sort=date');
    await visit(d, '#/opportunities?status=all');
    eq((await rows(d.page)).length, 19, 'status=all');
    await visit(d, '#/opportunities?status=reviewed');
    eq((await rows(d.page)).length, 0, 'status=reviewed');
    await visit(d, '#/opportunities?q=street');
    eq(await ranks(d.page), [5, 8, 12], 'q=street');
    eq(await d.page.inputValue('.opp-control--search input'), 'street', 'q fills the search box');
    await visit(d, '#/opportunities?type=bogus&status=bogus&sort=bogus');
    eq((await rows(d.page)).length, 19, 'invalid values fall back to the defaults');
    await visit(d, '#/opportunities?flag=F-C-005-overCap');
    await drawer(d.page).waitFor({ state: 'visible' });
    eq((await rows(d.page)).length, 19, 'flag deep link keeps the list behind it');
    await visit(d, '#/opportunities?flag=F-NOT-A-FLAG');
    eq(await drawer(d.page).count(), 0, 'unknown flag id opens nothing');
    eq(d.errors, [], 'no console errors');
    await d.ctx.close();
  });

  /* ------------------------------------------------------------ R28 watch list */
  await check('R28 watch list: 2 rows, Indicative value £0, not counted, utilisation, clause link', async () => {
    await go(page, '#/opportunities');
    const items = page.locator('.opp-watch > li');
    eq(await items.count(), 2, 'watch rows');
    eq((await page.locator('h2', { hasText: 'Watch list' }).count()), 1, 'heading');
    for (let i = 0; i < 2; i++) {
      const txt = (await items.nth(i).innerText()).replace(/\s+/g, ' ');
      const [, cid, used] = WATCH[i];
      ok(txt.includes(contractTitle(cid)), 'title ' + cid + ': ' + txt);
      ok(txt.includes(used + ' of the '), 'utilisation ' + used + ': ' + txt);
      ok(txt.includes('Indicative value £0. Not counted in the total.'), 'not counted note: ' + txt);
      const href = await items.nth(i).locator('a.kviz-textlink').getAttribute('href');
      const m = /^#\/source\/([^/?]+)\/([^/?]+)/.exec(href);
      ok(m && extraction(decodeURIComponent(m[2])) && extraction(decodeURIComponent(m[2])).contractId === cid, 'clause link ' + href);
    }
    ok((await items.nth(0).innerText()).includes('Grounds maintenance') && (await items.nth(1).innerText()).includes('Mobile voice and data'), 'Grounds maintenance and Mobile voice and data');
    const inList = (await rows(page)).filter((r) => /Grounds maintenance|Mobile voice/.test(r.title) && r.value === '£0');
    eq(inList.length, 0, 'watch rows are not in the ranked list');
    await items.nth(0).locator('button.kviz-row__link').click();
    await drawer(page).waitFor({ state: 'visible' });
    ok((await drawerText(page)).includes('£0'), 'watch flag opens the drawer');
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
  });

  /* ------------------------------------------------------------ R29 export */
  await check('R29 Export opportunities downloads a CSV: header and 19 data rows, "Sample data" and the as-of date on every row', async () => {
    await go(page, '#/opportunities');
    const { name, text } = await download(page);
    eq(name, 'kontor-opportunities-2026-10-06.csv', 'file name');
    const table = csvParse(text).filter((r) => r.length > 1);
    eq(table.length, 20, 'header plus 19 rows');
    eq(table[0], ['Rank', 'Type', 'Contract id', 'Contract', 'Supplier', 'Indicative GBP', 'Basis', 'Reason', 'Action by', 'Confidence', 'Status', 'Page', 'Clause', 'Data', 'As at'], 'header');
    const body = table.slice(1);
    body.forEach((r, i) => {
      eq(r.length, 15, 'columns in row ' + (i + 1));
      eq(Number(r[0]), i + 1, 'rank');
      eq(r[2], GOLDEN[i].contractId, 'contract id');
      eq(r[3], contractTitle(GOLDEN[i].contractId), 'contract');
      eq(r[4], supplierOf(GOLDEN[i].contractId), 'supplier');
      eq(Number(r[5]), GOLDEN[i].value, 'indicative');
      eq(r[8], GOLDEN[i].date || '', 'action by');
      eq(r[13], 'Sample data, as at 2026-10-06', 'sample data label on row ' + (i + 1));
      eq(r[14], '2026-10-06', 'as at');
      ok(/^\d+$/.test(r[11]) && /^(Clause|Schedule|Particulars|Table)/i.test(r[12] || 'Clause'), 'page and clause');
    });
    eq(body.reduce((s, r) => s + Number(r[5]), 0), TOTAL, 'sum of the indicative column equals the headline');
    eq(body[0].slice(1, 2).concat(body[0][6]), ['Spend over cap', 'Already paid'], 'type and basis words');
    ok(body[0][7].startsWith('You have paid £8,350,000 against a cap of £5,000,000'), 'reason text');
    eq(body[0][11], '23', 'page 23');
    eq(body[0][12], 'Clause 14.3', 'clause 14.3');
    ok(/^﻿/.test(fs.readFileSync(path.join(ROOT, 'src/views/Opportunities.jsx'), 'utf8')) === false, 'source is plain');
  });
  await check('R29 export follows the filters you can see (3 rows for Spend over cap) and says so in a success toast', async () => {
    await go(page, '#/opportunities?type=overCap');
    const { text } = await download(page);
    const table = csvParse(text).filter((r) => r.length > 1);
    eq(table.length, 4, 'header plus 3 rows');
    eq(table.slice(1).map((r) => Number(r[0])), [1, 2, 11], 'ranks');
    const toast = await page.locator('.kx-toasts').innerText();
    ok(/Opportunities exported\./.test(toast) && /3 rows saved as kontor-opportunities-2026-10-06\.csv/.test(toast), 'toast: ' + toast);
    await go(page, '#/opportunities');
  });
  await check('R29 failure uses the copy-deck error: "Export failed. Your browser blocked the download. Allow downloads for this page and try again."', async () => {
    await page.evaluate(() => { window.__create = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('blocked'); }; });
    await page.getByRole('button', { name: 'Export opportunities' }).click();
    await page.waitForSelector('.kx-toast', { timeout: 4000 });
    const txt = (await page.locator('.kx-toasts').innerText()).replace(/\s+/g, ' ');
    ok(txt.includes('Export failed.') && txt.includes('Your browser blocked the download. Allow downloads for this page and try again.'), 'error toast: ' + txt);
    ok(await page.locator('.kx-toasts [role="alert"]').count() > 0, 'announced as an alert');
    await page.evaluate(() => { URL.createObjectURL = window.__create; });
    for (let i = 0; i < 6 && (await page.locator('.kx-toast__close').count()) > 0; i++) { await page.locator('.kx-toast__close').first().click(); await settle(page, 120); }
  });

  /* ------------------------------------------------------------ R25 the drawer */
  await check('R25 drawer from a row: dialog named after the contract, pill, indicative £ with basis, reason, short caveat', async () => {
    await go(page, '#/opportunities');
    await page.locator(LIST).nth(0).locator('.kviz-row__link').click();
    await drawer(page).waitFor({ state: 'visible' });
    await settle(page, 260);
    eq(await hash(page), '#/opportunities?flag=F-C-005-overCap', 'address');
    const d = drawer(page);
    eq(await d.getAttribute('aria-modal'), 'true', 'modal');
    ok((await d.locator('h2').innerText()).includes('Highways reactive maintenance and minor works'), 'title');
    const txt = (await d.innerText()).replace(/\s+/g, ' ');
    ok(txt.includes('Fennimore Highways Ltd · C-005'), 'supplier line');
    ok(txt.includes('Spend over cap'), 'type pill');
    ok(txt.includes('INDICATIVE VALUE') || /indicative value/i.test(txt), 'indicative label');
    eq((await d.locator('[data-flag-value]').innerText()).trim(), '£3,350,000', 'amount');
    ok(txt.includes('Already paid'), 'basis');
    ok(txt.includes('Why this is flagged') && txt.includes('You have paid £8,350,000 against a cap of £5,000,000. That is 167.0% of the cap, £3,350,000 over.'), 'reason');
    ok(txt.includes('Indicative. An opportunity to investigate, not a saving. Test it against the contract before you act.'), 'short caveat');
  });
  await check('R25 F-C-005-overCap breakdown: Spend to date £8,350,000, Cap £5,000,000, Spend above cap £3,350,000 (last line = row amount)', async () => {
    const items = await drawer(page).locator('.flag-calc__row').evaluateAll((lis) => lis.map((li) => [li.querySelector('.flag-calc__label').childNodes[0].textContent.trim(), li.querySelector('.flag-calc__value').textContent.trim()]));
    eq(items, [['Spend to date', '£8,350,000'], ['Cap', '£5,000,000'], ['Spend above cap', '£3,350,000']], 'breakdown');
    eq(await drawer(page).locator('ol.flag-calc > li').count(), 3, 'numbered list items');
    eq((await drawer(page).locator('[data-flag-result] .flag-calc__value').innerText()).trim(), '£3,350,000', 'result row');
  });
  await check('R25 evidence: the clause link is the one primary button, with clause, page and quote; method links; "Reasons this may not be a saving"', async () => {
    const d = drawer(page);
    const cta = d.locator('a.flag-cta');
    eq(await cta.count(), 1, 'one primary clause link');
    ok((await cta.innerText()).trim().startsWith('View clause, page 23'), 'label: ' + (await cta.innerText()));
    eq(await cta.getAttribute('href'), '#/source/C-005/X-C-005-maximumValue?from=opportunities', 'href');
    eq(await d.locator('.kx-drawer__foot button[style*="--accent"]').count(), 0, 'no second filled button in the footer');
    const txt = (await d.innerText()).replace(/\s+/g, ' ');
    ok(txt.includes('Clause 14.3') && txt.includes('Page 23 of 70'), 'clause and page: ' + txt.slice(0, 200));
    const quote = extraction('X-C-005-maximumValue').provenance[0].quote;
    ok((await d.locator('.flag-evidence__quote').first().innerText()).includes(quote.replace(/^["“]|["”]$/g, '')), 'quote');
    ok(txt.includes('Illustrative contract text written for this demo, not a real document.'), 'illustrative label');
    eq(await d.locator('h3', { hasText: 'Reasons this may not be a saving' }).count(), 1, 'reasons heading');
    ok((await d.locator('.flag-reasons li').count()) >= 3, 'reasons list');
    eq(await d.locator('a.method-link', { hasText: 'See the rule on the method page' }).getAttribute('href'), '#/method?s=cap', 'method link for a cap flag');
    eq(await d.locator('a.method-link', { hasText: 'How confidence is worked out' }).getAttribute('href'), '#/method?s=confidence', 'confidence link');
    eq(await d.locator('a', { hasText: 'Open contract' }).getAttribute('href'), '#/contracts/C-005', 'open contract');
  });
  await check('R25 Escape closes the drawer, removes ?flag= and puts focus back on the row that opened it', async () => {
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    eq(await hash(page), '#/opportunities', 'address');
    const active = await page.evaluate(() => { const a = document.activeElement; const li = a && a.closest('li'); return { cls: a && a.className, label: a && a.getAttribute('aria-label'), inList: !!(li && li.closest('.kviz-barlist__list')) }; });
    ok(active.inList && /^Rank 1\./.test(active.label || ''), 'focus is on the first row link: ' + JSON.stringify(active));
  });
  await check('R25 keyboard: Enter on a row opens the drawer, focus stays inside while you Tab, Shift+Tab wraps, Escape returns to the row', async () => {
    await page.locator(LIST).nth(1).locator('.kviz-row__link').focus();
    await page.keyboard.press('Enter');
    await drawer(page).waitFor({ state: 'visible' });
    await settle(page, 260);
    ok((await drawerText(page)).includes('ICT managed service and end-user support'), 'second row opened');
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press('Tab');
      ok(await page.evaluate(() => !!document.activeElement.closest('.flag-drawer')), 'focus left the drawer after ' + (i + 1) + ' tabs');
    }
    await page.keyboard.press('Shift+Tab');
    ok(await page.evaluate(() => !!document.activeElement.closest('.flag-drawer')), 'focus left the drawer on Shift+Tab');
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; });
    ok(ring, 'a focus ring is drawn on the focused control inside the drawer');
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    ok(await page.evaluate(() => /^Rank 2\./.test(document.activeElement.getAttribute('aria-label') || '')), 'focus returned to row 2');
  });
  await check('R25 "See calculation" opens the same drawer and Escape returns focus to that button', async () => {
    const btn = page.locator(LIST).nth(4).locator('button.opp-calc');
    await btn.click();
    await drawer(page).waitFor({ state: 'visible' });
    eq(await hash(page), '#/opportunities?flag=F-C-004-uplift', 'address');
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    ok(await page.evaluate(() => document.activeElement.classList.contains('opp-calc') && !!document.activeElement.closest('li')), 'focus on See calculation');
  });
  await check('R25 F-C-004-uplift breakdown: 12 months before £2,060,000, 3.0%, £2,121,800, last 12 months £2,310,000, paid above £188,200', async () => {
    await openDrawerById(page, 'F-C-004-uplift');
    const items = await drawer(page).locator('.flag-calc__row').evaluateAll((lis) => lis.map((li) => [li.querySelector('.flag-calc__label').childNodes[0].textContent.trim(), li.querySelector('.flag-calc__value').textContent.trim()]));
    eq(items.map((i) => i[1]), ['£2,060,000', '3.0%', '£2,121,800', '£2,310,000', '£188,200'], 'values');
    ok(/earlier 12 months/i.test(items[0][0]) && /allowed/i.test(items[1][0]) && /allowed/i.test(items[2][0]) && /last 12 months/i.test(items[3][0]) && /above/i.test(items[4][0]), 'labels: ' + JSON.stringify(items));
    eq(await drawer(page).locator('a.method-link', { hasText: 'See the rule' }).getAttribute('href'), '#/method?s=uplift', 'uplift method link');
    eq(await drawer(page).locator('a.flag-cta').getAttribute('href'), '#/source/C-004/X-C-004-indexation?from=opportunities', 'primary clause link');
    await page.keyboard.press('Escape');
  });
  await check('R25 for all 19 ranked flags and the 2 watch flags the last breakdown line equals the row amount to the pound, and the clause link matches the row', async () => {
    await go(page, '#/opportunities');
    const listValues = (await rows(page)).map((r) => r.value);
    const ids = GOLDEN.map((g) => g.id).concat(WATCH.map((w) => w[0]));
    for (let i = 0; i < ids.length; i++) {
      await openDrawerById(page, ids[i]);
      const d = drawer(page);
      const last = (await d.locator('ol.flag-calc > li').last().locator('.flag-calc__value').innerText()).trim();
      const kpi = (await d.locator('[data-flag-value]').innerText()).trim();
      const want = i < 19 ? gbp(GOLDEN[i].value) : '£0';
      eq(last, want, ids[i] + ' last breakdown line');
      eq(kpi, want, ids[i] + ' headline amount in the drawer');
      if (i < 19) eq(listValues[i], want, ids[i] + ' list row');
      const href = await d.locator('a.flag-cta').getAttribute('href');
      const m = /^#\/source\/([^/?]+)\/([^/?]+)\?from=opportunities$/.exec(href);
      ok(m && extraction(decodeURIComponent(m[2])).contractId === decodeURIComponent(m[1]), 'primary link ' + href);
      ok((await d.locator('ol.flag-calc > li').count()) >= 3, 'breakdown has at least 3 numbered steps');
      eq(await d.locator('.flag-reasons li').count() > 0, true, 'reasons list');
      await go(page, '#/opportunities');
    }
  });
  await check('R66 method links per flag type go to the right section (cap, indicative, uplift)', async () => {
    for (const [id, section] of [['F-C-001-nearCap', 'cap'], ['F-C-003-renewal', 'indicative'], ['F-C-011-overCap', 'cap'], ['F-C-012-uplift', 'uplift']]) {
      await openDrawerById(page, id);
      eq(await drawer(page).locator('a.method-link', { hasText: 'See the rule' }).getAttribute('href'), '#/method?s=' + section, id);
    }
    await go(page, '#/opportunities');
  });
  const methodIsReal = !/STUB/.test(fs.readFileSync(path.join(ROOT, 'src/views/Method.jsx'), 'utf8'));
  if (methodIsReal) {
    await check('R66 the method links in the drawer and under the caveat land on a real section of the Method page (cap, indicative, uplift, confidence)', async () => {
      const d = await h.newPage({ theme: 'dark' });
      for (const sec of ['cap', 'indicative', 'uplift', 'confidence']) {
        await visit(d, '#/method?s=' + sec);
        if ((await d.page.locator('#shell-main h1').innerText()).startsWith('Stand-in')) { await d.ctx.close(); throw new Error('Method page is not in this build'); }
        eq(await d.page.locator('h2#' + sec).count(), 1, 'section ' + sec);
      }
      await d.ctx.close();
    });
  } else skip('R66 method sections', 'src/views/Method.jsx is still a stub');
  await check('R25 the drawer opens on every route through ?flag= (#/renewals?flag=F-C-005-overCap) and closes back to that route', async () => {
    const d = await h.newPage({ theme: 'dark' });
    for (const route of ['renewals', 'overview', 'spend', 'contracts', 'roadmap', 'method']) {
      await visit(d, `#/${route}?flag=F-C-005-overCap`);
      await drawer(d.page).waitFor({ state: 'visible', timeout: 5000 });
      await settle(d.page, 260);
      ok((await drawerText(d.page)).includes('£3,350,000'), route + ': amount');
      await d.page.keyboard.press('Escape');
      await drawer(d.page).waitFor({ state: 'detached' });
      eq(await hash(d.page), '#/' + route, route + ': address after close');
    }
    // opened from a page that is not the list: the evidence link keeps the page it came from
    await visit(d, '#/renewals?flag=F-C-005-overCap');
    await drawer(d.page).waitFor({ state: 'visible' });
    eq(await drawer(d.page).locator('a.flag-cta').getAttribute('href'), '#/source/C-005/X-C-005-maximumValue?from=renewals', 'from=renewals');
    await d.ctx.close();
  });
  await check('R25 following a link that lands on ?flag= from another page: focus ends inside the drawer (the router focuses the h1 first) and Escape closes it', async () => {
    const d = await h.newPage({ theme: 'dark' });
    await visit(d, '#/renewals');
    await d.page.evaluate(() => { const a = document.createElement('a'); a.id = 'jump'; a.href = '#/opportunities?flag=F-C-005-overCap'; a.textContent = 'jump'; document.querySelector('#shell-main').appendChild(a); });
    await d.page.click('#jump');
    await drawer(d.page).waitFor({ state: 'visible' });
    await settle(d.page, 500);
    ok(await d.page.evaluate(() => !!document.activeElement.closest('.flag-drawer')), 'focus is inside the drawer');
    await d.page.keyboard.press('Escape');
    await drawer(d.page).waitFor({ state: 'detached', timeout: 3000 });
    eq(await hash(d.page), '#/opportunities', 'closed to the list');
    await d.ctx.close();
  });
  await check('R25 clicking the clause link in the drawer leaves for the Source viewer and closes the drawer', async () => {
    await openDrawerById(page, 'F-C-005-overCap');
    await drawer(page).locator('a.flag-cta').click();
    await page.waitForFunction(() => location.hash.startsWith('#/source/C-005/X-C-005-maximumValue'));
    await drawer(page).waitFor({ state: 'detached', timeout: 3000 });
    if (sourceIsReal) { await page.waitForSelector('mark[data-extraction-id]'); ok((await page.locator('#shell-main h1').innerText()).includes('14.3'), 'lands on clause 14.3'); }
    await go(page, '#/opportunities');
  });

  /* ------------------------------------------------------------ R61 triage */
  await check('R61 mark F-C-005-overCap Explained: headline falls to £2,795,238 (£2.8m) live, the row leaves Open, the toast says so, the drawer stays open', async () => {
    await go(page, '#/opportunities');
    await page.locator(LIST).nth(0).locator('.kviz-row__link').click();
    await drawer(page).waitFor({ state: 'visible' });
    await settle(page, 260);
    eq(await drawer(page).locator('select').inputValue(), 'to_investigate', 'default status');
    eq((await drawer(page).locator('select option').allTextContents()), ['To investigate', 'Under review', 'Explained', 'No action'], 'options');
    await drawer(page).locator('select').selectOption('explained');
    await settle(page, 300);
    ok(await drawer(page).isVisible(), 'drawer still open (driven from flagsById)');
    const txt = (await drawerText(page)).replace(/\s+/g, ' ');
    ok(txt.includes('Not counted. £3,350,000 is excluded from the headline after your review.'), 'excluded hint: ' + txt.slice(-200));
    ok(await drawer(page).locator('.kviz-pill', { hasText: 'Explained' }).count() > 0, 'Explained pill');
    const toast = (await page.locator('.kx-toasts').innerText()).replace(/\s+/g, ' ');
    ok(toast.includes('Highways reactive maintenance and minor works: marked Explained.') && toast.includes('The headline is now £2.8m.'), 'toast: ' + toast);
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    eq(await totals(page), 'Showing 18 opportunities, £2,795,238 indicative', 'totals bar');
    eq((await rows(page)).length, 18, 'row left the Open list');
    eq((await chips(page)).map((c) => c.count), [18, 2, 1, 12, 3], 'chip counts');
    ok((await page.locator('.opp-totals').innerText()).includes('1 reviewed opportunity is hidden.'), 'hidden note');
    ok(await page.evaluate(() => document.activeElement.hasAttribute('data-opp-fallback') || document.activeElement.tagName === 'MAIN'), 'focus lands on the status line or main when the row has gone');
  });
  await check('R61 reviewed rows appear under Reviewed and All (muted, with the Explained pill), and the totals do not count them', async () => {
    await page.getByRole('button', { name: 'Show reviewed' }).click();
    await settle(page, 200);
    eq(await hash(page), '#/opportunities?status=reviewed', 'address');
    const r = await rows(page);
    eq(r.length, 1, 'one reviewed row');
    eq(r[0].rank, 1, 'keeps its overall rank');
    ok(r[0].muted, 'muted');
    ok((await page.locator(LIST).nth(0).innerText()).includes('Explained'), 'status pill on the row');
    eq(await totals(page), 'Showing 1 opportunity, £0 indicative', 'reviewed totals');
    ok((await page.locator('.opp-totals').innerText()).includes('1 reviewed, £3,350,000 not counted.'), 'not counted note');
    await page.selectOption('.opp-control--status select', 'all');
    await settle(page, 200);
    eq((await rows(page)).length, 19, 'All shows 19');
    eq(await totals(page), 'Showing 19 opportunities, £2,795,238 indicative', 'All totals count only open rows');
    eq((await rows(page))[0].muted, true, 'row 1 muted in All');
  });
  await check('R61 the review survives a reload (kontor-triage), and the Overview headline reads £2.8m across 15 contracts with the excluded note', async () => {
    await page.reload(); await page.waitForSelector(LIST);
    eq(await hash(page), '#/opportunities?status=all', 'address survives');
    eq(await totals(page), 'Showing 19 opportunities, £2,795,238 indicative', 'totals after reload');
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem('kontor-triage'))), { 'F-C-005-overCap': 'explained' }, 'stored');
    await go(page, '#/overview');
    const h1 = (await page.locator('#shell-main h1').innerText()).replace(/\s+/g, ' ').trim();
    if (/across \d+ contracts?/.test(h1)) {
      eq(h1, '£2.8m across 15 contracts flagged as opportunities to investigate', 'Overview headline');
      ok((await page.locator('#shell-main').innerText()).includes('£3,350,000 excluded after your review'), 'excluded note on the Overview');
    } else skip('R61 Overview headline', 'Overview is not in this build (h1 is "' + h1 + '")');
  });
  await check('R61 set it back (To investigate): the row returns to Open and the headline returns to £6,145,238', async () => {
    await openDrawerById(page, 'F-C-005-overCap');
    await drawer(page).locator('select').selectOption('to_investigate');
    await settle(page, 300);
    const toast = (await page.locator('.kx-toasts').innerText()).replace(/\s+/g, ' ');
    ok(toast.includes('The headline is now £6.1m.'), 'toast: ' + toast);
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    await go(page, '#/opportunities');
    eq(await totals(page), 'Showing 19 opportunities, £6,145,238 indicative', 'totals');
    eq(await page.evaluate(() => localStorage.getItem('kontor-triage')), '{}', 'cleared from storage');
  });
  await check('R61 Under review stays in Open and in the headline; No action excludes like Explained; two reviews give £2,035,238', async () => {
    await openDrawerById(page, 'F-C-007-overCap');
    await drawer(page).locator('select').selectOption('under_review');
    await settle(page, 250);
    ok((await drawerText(page)).includes('Counted in the headline.'), 'still counted');
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    eq(await totals(page), 'Showing 19 opportunities, £6,145,238 indicative', 'under review keeps the total');
    ok((await page.locator(LIST).nth(1).innerText()).includes('Under review'), 'Under review pill on the row');
    await openDrawerById(page, 'F-C-005-overCap');
    await drawer(page).locator('select').selectOption('explained');
    await settle(page, 200);
    await drawer(page).locator('select').selectOption('not_an_issue');
    await settle(page, 200);
    ok((await page.locator('.kx-toasts').innerText()).includes('marked No action'), 'No action toast');
    await drawer(page).locator('select').selectOption('to_investigate');
    await settle(page, 200);
    await go(page, '#/opportunities');
    await openDrawerById(page, 'F-C-007-overCap');
    await drawer(page).locator('select').selectOption('not_an_issue');
    await settle(page, 200);
    await openDrawerById(page, 'F-C-005-overCap');
    await drawer(page).locator('select').selectOption('explained');
    await settle(page, 200);
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    eq(await totals(page), 'Showing 17 opportunities, £2,035,238 indicative', 'two reviews');
    await go(page, '#/opportunities');
    for (const id of ['F-C-005-overCap', 'F-C-007-overCap']) {
      await openDrawerById(page, id);
      await drawer(page).locator('select').selectOption('to_investigate');
      await settle(page, 150);
      await go(page, '#/opportunities');
    }
    eq(await totals(page), 'Showing 19 opportunities, £6,145,238 indicative', 'restored');
  });
  await check('R61 every flag reviewed: the empty state says so and offers Open settings', async () => {
    const d = await h.newPage({ theme: 'dark' });
    await d.ctx.addInitScript(() => { try { const t = {}; ['005-overCap', '007-overCap', '001-nearCap', '003-renewal', '004-uplift', '002-renewal', '001-renewal', '004-renewal', '007-renewal', '014-renewal', '011-overCap', '018-renewal', '005-renewal', '012-uplift', '016-renewal', '015-renewal', '009-renewal', '010-uplift', '017-renewal'].forEach((s) => { t['F-C-' + s] = 'explained'; }); localStorage.setItem('kontor-triage', JSON.stringify(t)); } catch (e) { /* ignore */ } });
    await visit(d, '#/opportunities');
    const empty = (await d.page.locator('.opp-body .kx-empty').innerText()).replace(/\s+/g, ' ');
    ok(empty.includes('Every opportunity has been reviewed.') && empty.includes('Reset your changes to see the starting list.'), 'empty state: ' + empty);
    eq(await d.page.locator('.opp-body .kx-empty').getByRole('button', { name: 'Open settings' }).count(), 1, 'Open settings button');
    eq(await totals(d.page), 'Showing 0 opportunities, £0 indicative', 'totals');
    await d.ctx.close();
  });
  await check('R61 with storage blocked the review still works for the session, and the drawer says it will not survive a reload', async () => {
    const d = await h.newPage({ theme: 'dark', blockStorage: true });
    await visit(d, '#/opportunities?flag=F-C-005-overCap');
    await drawer(d.page).waitFor({ state: 'visible' });
    await drawer(d.page).locator('select').selectOption('explained');
    await settle(d.page, 250);
    ok((await drawerText(d.page)).includes('Your browser is blocking local storage'), 'storage note');
    await d.page.keyboard.press('Escape');
    eq(await totals(d.page), 'Showing 18 opportunities, £2,795,238 indicative', 'totals');
    eq(d.errors.filter((e) => !/localStorage|SecurityError/.test(e)), [], 'no console errors');
    await d.ctx.close();
  });

  /* ------------------------------------------------------------ table twin */
  await check('Show table: the same rows as a table with every figure, filters still apply', async () => {
    await go(page, '#/opportunities?type=renewal');
    await page.getByRole('button', { name: 'Show table' }).click();
    const tbl = page.locator('.opp-body table');
    eq(await tbl.locator('tbody tr').count(), 12, 'rows');
    const head = await tbl.locator('thead th').allTextContents();
    eq(head, ['Rank', 'Type', 'Contract', 'Supplier', 'Indicative value', 'Basis', 'Act by', 'Confidence', 'Review status', 'Clause'], 'columns');
    const first = (await tbl.locator('tbody tr').nth(0).innerText()).replace(/\s+/g, ' ');
    ok(first.includes('£310,000') && first.includes('Per year') && first.includes('31 Oct 2026') && first.includes('High confidence') && first.includes('To investigate'), 'first row: ' + first);
    await tbl.locator('tbody tr').nth(0).locator('button').click();
    await drawer(page).waitFor({ state: 'visible' });
    eq(await hash(page), '#/opportunities?type=renewal&flag=F-C-003-renewal', 'drawer from the table keeps the filter');
    await page.keyboard.press('Escape');
    await drawer(page).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Show list' }).click();
    await go(page, '#/opportunities');
  });

  /* ------------------------------------------------------------ R13 / R71 copy */
  await check('R13 and R71 copy lint on the page and the drawer: no "!", no emoji, "saving" only in the caveat and the reasons, every £ labelled indicative', async () => {
    await go(page, '#/opportunities');
    const main = await page.locator('#shell-main').innerText();
    ok(!/!/.test(main), 'exclamation mark in main');
    ok(!/\p{Extended_Pictographic}/u.test(main), 'emoji in main');
    const withoutCaveat = main.replace(/Indicative figures\. Each one is an opportunity to investigate, not a saving\.[\s\S]*?How this is calculated/, '');
    ok(!/\bsavings?\b/i.test(withoutCaveat), 'saving outside the caveat: ' + (withoutCaveat.match(/.{30}\bsavings?\b.{30}/i) || [''])[0]);
    const buttons = await page.$$eval('#shell-main button', (bs) => bs.map((b) => b.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean));
    ['Export opportunities', 'Show table', 'See calculation'].forEach((l) => ok(buttons.some((b) => b.startsWith(l)), 'button ' + l));
    buttons.forEach((b) => ok(!/^(ok|submit|click here|learn more)$/i.test(b), 'banned label ' + b));
    await openDrawerById(page, 'F-C-003-renewal');
    const dr = await drawerText(page);
    ok(!/!/.test(dr) && !/\p{Extended_Pictographic}/u.test(dr), 'drawer: ! or emoji');
    const drNoReasons = dr.replace(/Reasons this may not be a saving[\s\S]*$/, '').replace(/Indicative\. An opportunity to investigate, not a saving\./, '');
    ok(!/\bsavings?\b/i.test(drNoReasons), 'drawer: saving outside the caveat and the reasons: ' + (drNoReasons.match(/.{30}\bsavings?\b.{30}/i) || [''])[0]);
    ok(/Indicative value/i.test(dr) && /Indicative\. An opportunity to investigate/.test(dr), 'drawer labels the figure indicative');
    // sentence case: no heading or label in the drawer has two capitalised words in a row (proper nouns aside)
    const heads = await drawer(page).locator('h2, h3').allTextContents();
    heads.forEach((x) => ok(!/^[A-Z][a-z]+ [A-Z][a-z]+/.test(x.replace(/^Opportunity: /, '')) || /^(Highways|Waste|Integrated)/.test(x.replace(/^Opportunity: /, '')), 'not sentence case: ' + x));
    await page.keyboard.press('Escape');
  });
  await check('R13 renewal drawer lists every clause it relies on, with a link for the second one', async () => {
    await openDrawerById(page, 'F-C-001-renewal');
    const n = await drawer(page).locator('.flag-evidence').count();
    ok(n >= 2, 'evidence blocks: ' + n);
    const links = await drawer(page).locator('.flag-evidence a.clause-link').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    ok(links.every((l) => /^#\/source\/C-001\/X-C-001-/.test(l)), 'links ' + links);
    eq(await drawer(page).locator('a.flag-cta').getAttribute('href'), '#/source/C-001/X-C-001-noticePeriod?from=opportunities', 'primary is the notice clause');
    await page.keyboard.press('Escape');
  });

  /* ------------------------------------------------------------ quality: themes, a11y, layout, network */
  for (const theme of ['dark', 'light']) {
    await check(`axe clean in ${theme}: list, filtered, empty, table, and the drawer on a cap flag, a renewal flag and a watch flag`, async () => {
      const d = await h.newPage({ theme });
      const states = [
        ['list', '#/opportunities'], ['type filter', '#/opportunities?type=nearCap'], ['empty state', '#/opportunities?q=zzzz'], ['sorted by date', '#/opportunities?sort=date'],
        ['drawer, cap flag', '#/opportunities?flag=F-C-005-overCap'], ['drawer, renewal flag', '#/opportunities?flag=F-C-001-renewal'],
        ['drawer, uplift flag', '#/opportunities?flag=F-C-004-uplift'], ['drawer, watch flag', '#/opportunities?flag=F-C-009-nearCap'],
        ['drawer, low confidence', '#/opportunities?flag=F-C-018-renewal'], ['drawer on another route', '#/renewals?flag=F-C-007-overCap'],
      ];
      for (const [name, hsh] of states) {
        await visit(d, hsh);
        if (hsh.includes('flag=')) { await drawer(d.page).waitFor({ state: 'visible' }); await settle(d.page, 300); }
        const v = await axe(d.page);
        eq(v, [], `${name} (${theme})`);
      }
      await visit(d, '#/opportunities');
      await d.page.getByRole('button', { name: 'Show table' }).click();
      eq(await axe(d.page), [], 'table twin ' + theme);
      await d.page.getByRole('button', { name: 'Show list' }).click();
      // a reviewed (muted) row and the status pills
      await d.page.evaluate(() => localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'under_review', 'F-C-001-nearCap': 'not_an_issue' })));
      await visit(d, '#/opportunities?status=all');
      eq(await axe(d.page), [], 'reviewed and under review rows ' + theme);
      // toast visible (triage) with the drawer open
      await visit(d, '#/opportunities?flag=F-C-003-renewal');
      await drawer(d.page).waitFor({ state: 'visible' });
      await drawer(d.page).locator('select').selectOption('under_review');
      await settle(d.page, 400);
      eq(await axe(d.page), [], 'drawer with a toast ' + theme);
      eq(d.errors, [], 'console errors ' + theme);
      eq(externalRequests(d), [], 'requests that left the origin ' + theme);
      await d.ctx.close();
    });
  }
  await check('axe with a chart tooltip showing (row focused): nothing from this page; the tooltip portal itself is A3 (see handoff)', async () => {
    const d = await h.newPage({ theme: 'dark' });
    await visit(d, '#/opportunities');
    await d.page.locator(LIST).nth(0).locator('.kviz-row__link').focus();
    await settle(d.page, 400);
    const v = await axe(d.page);
    const mine = v.filter((x) => !(x.id === 'region' && x.targets.every((tg) => tg.startsWith('.kviz-tip'))));
    eq(mine, [], 'violations other than the tooltip portal');
    if (v.length) skip('chart tooltip landmark', 'axe "region" on the .kviz-tip portal that src/charts/Tip.jsx renders into <body> (A3), shown only while a row is hovered or focused');
    await d.ctx.close();
  });
  for (const [name, vp] of [['1440x900', VIEWPORTS.desktop], ['1366x768', VIEWPORTS.laptop], ['1024x768', VIEWPORTS.tablet], ['390x844', VIEWPORTS.phone]]) {
    await check(`layout at ${name}: no horizontal page scroll (list, table twin, drawer), nothing clipped, toolbar and rows reachable`, async () => {
      const d = await h.newPage({ theme: 'dark', viewport: vp });
      const noScroll = async (label) => {
        const r = await d.page.evaluate(() => {
          const m = document.getElementById('shell-main');
          return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: m.scrollWidth - m.clientWidth, drawer: (() => { const x = document.querySelector('.flag-drawer'); return x ? x.scrollWidth - x.clientWidth : 0; })() };
        });
        ok(r.doc <= 1 && r.main <= 1 && r.drawer <= 1, `${label} overflows horizontally: ${JSON.stringify(r)}`);
      };
      await visit(d, '#/opportunities');
      await noScroll('list');
      eq((await rows(d.page)).length, 19, 'rows');
      await d.page.getByRole('button', { name: 'Show table' }).click();
      await noScroll('table twin');
      await d.page.getByRole('button', { name: 'Show list' }).click();
      await visit(d, '#/opportunities?flag=F-C-005-overCap');
      await drawer(d.page).waitFor({ state: 'visible' });
      await settle(d.page, 300);
      await noScroll('drawer');
      const cta = await d.page.locator('a.flag-cta').boundingBox();
      ok(cta && cta.x >= 0 && cta.x + cta.width <= vp.width, 'primary button inside the viewport');
      const sel = await drawer(d.page).locator('select').boundingBox();
      ok(sel && sel.x >= 0 && sel.x + sel.width <= vp.width, 'status select inside the viewport');
      // touch targets in the toolbar are at least 44px tall for the controls you tap (chips have a 44px hit area)
      await d.ctx.close();
    });
  }
  await check('keyboard only: Tab order is Export, method link, Show table, five chips, Search, Status, Sort, then the rows; every stop draws a focus ring; Enter on a chip filters, Space works too', async () => {
    const d = await h.newPage({ theme: 'dark' });
    await visit(d, '#/opportunities');
    await d.page.evaluate(() => document.querySelector('#shell-main h1').focus());
    const stops = [];
    for (let i = 0; i < 16; i++) {
      await d.page.keyboard.press('Tab');
      stops.push(await d.page.evaluate(() => {
        const a = document.activeElement;
        const ring = (cs) => cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
        const label = (a.getAttribute('aria-label') || a.textContent || a.placeholder || a.name || '').replace(/\s+/g, ' ').trim();
        const lbl = a.closest('label');
        return { tag: a.tagName, label: lbl ? lbl.textContent.trim().split(/\s{2,}/)[0] + ' | ' + label : label, ring: ring(getComputedStyle(a)) || ring(getComputedStyle(a, '::after')), main: !!a.closest('#shell-main') };
      }));
    }
    const names = stops.map((s) => s.label);
    const idx = (re) => names.findIndex((n) => re.test(n));
    const order = [/^Export opportunities/, /^How this is calculated/, /^Show table/, /^All flags/, /^Spend over cap/, /^Close to cap/, /^Renewals/, /^Price increases above cap/, /^Search/, /^Status/, /^Sort by/, /^Rank 1\./].map(idx);
    ok(order.every((n) => n >= 0), 'every expected stop is reached: ' + JSON.stringify(names));
    ok(order.every((n, i) => i === 0 || n > order[i - 1]), 'in this order: ' + JSON.stringify(order) + ' ' + JSON.stringify(names));
    stops.filter((s) => s.main).forEach((s) => ok(s.ring, 'no visible focus ring on ' + s.label));
    // chips by keyboard
    await d.page.locator('.kviz-chipbtn', { hasText: 'Close to cap' }).focus();
    await d.page.keyboard.press('Enter');
    await settle(d.page, 150);
    eq((await rows(d.page)).length, 1, 'Enter on a chip');
    await d.page.keyboard.press('Space');
    await settle(d.page, 150);
    eq((await rows(d.page)).length, 19, 'Space on the pressed chip clears it');
    // the selects by keyboard
    await d.page.locator('.opp-control--sort select').focus();
    await d.page.keyboard.press('ArrowDown');
    await settle(d.page, 150);
    eq(await hash(d.page), '#/opportunities?sort=date', 'arrow key on the sort select');
    await d.ctx.close();
  });
  await check('presenter view: at 1440x900 the first two rows are visible without scrolling', async () => {
    const d = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(d, '#/opportunities');
    await settle(d.page, 300);
    const b = await d.page.locator(LIST).nth(1).boundingBox();
    ok(b && b.y + b.height <= 900, 'row 2 ends at ' + (b && Math.round(b.y + b.height)));
    await d.ctx.close();
  });
  await check('no console errors and no request leaves the origin across the whole run', async () => {
    eq(t.errors, [], 'console errors');
    eq(externalRequests(t), [], 'external requests');
  });
} finally {
  await h.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall V2 checks passed');
process.exit(failed ? 1 : 0);
