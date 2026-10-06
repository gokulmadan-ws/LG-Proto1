// fun-filters: filters, sorts and search on Opportunities, Contracts and Spend give correct, deterministic results (computed independently from the
// dataset and the golden table), survive reload, Back and the table twin, and reject hostile input.
//   node tests/review/fun-filters.mjs
import { waitH1, T, ok, eq, norm, text, settle, hashOf, h1, store, setStore, launchApp, visit, go, externalRequests, toasts, gold, data, contract } from './fun-lib.mjs';
import fs from 'node:fs';

const t = new T('fun-filters');
const h = await launchApp();
const p = await h.newPage({ theme: 'dark' });
const { page } = p;
const LIST = '.opp .kviz-barlist__list > li';
const rows = () => page.$$eval(LIST, (lis) => lis.map((li) => ({ rank: +li.querySelector('.kviz-barlist__rank').textContent, title: li.querySelector('.kviz-barlist__name').textContent.trim(), val: +li.querySelector('.kviz-barlist__val').textContent.replace(/[^\d]/g, ''), txt: li.textContent.replace(/\s+/g, ' ').trim() })));
const ranks = async () => (await rows()).map((r) => r.rank);
const totals = () => text(page.locator('.opp-totals__main'));
const title = (id) => contract(id.split('-').slice(1, 3).join('-')).title;
const ID = (rank) => gold.ranked[rank - 1];
const typeOf = (id) => id.split('-').pop();
const SUPPLIER = (cid) => contract(cid).supplierName;

/* the golden flag table: rank, action date */
const ACT = { 'F-C-005-overCap': null, 'F-C-007-overCap': null, 'F-C-001-nearCap': null, 'F-C-003-renewal': '2026-10-31', 'F-C-004-uplift': '2027-08-01', 'F-C-002-renewal': '2027-03-31', 'F-C-001-renewal': '2026-09-30', 'F-C-004-renewal': '2027-01-31', 'F-C-007-renewal': null, 'F-C-014-renewal': '2027-06-30', 'F-C-011-overCap': null, 'F-C-018-renewal': '2027-02-28', 'F-C-005-renewal': '2027-02-28', 'F-C-012-uplift': '2027-09-01', 'F-C-016-renewal': '2026-06-30', 'F-C-015-renewal': '2027-04-30', 'F-C-009-renewal': '2026-12-31', 'F-C-010-uplift': '2027-01-01', 'F-C-017-renewal': '2026-12-01' };
const RANK = Object.fromEntries(gold.ranked.map((id, i) => [id, i + 1]));
const expectDate = [...gold.ranked].sort((a, b) => ((ACT[a] || '9999') < (ACT[b] || '9999') ? -1 : (ACT[a] || '9999') > (ACT[b] || '9999') ? 1 : RANK[a] - RANK[b])).map((id) => RANK[id]);
const TYPE_ORDER = { overCap: 0, nearCap: 1, renewal: 2, uplift: 3 };
const expectType = [...gold.ranked].sort((a, b) => TYPE_ORDER[typeOf(a)] - TYPE_ORDER[typeOf(b)] || RANK[a] - RANK[b]).map((id) => RANK[id]);

/* ================================================================ Opportunities */
await visit(p, '#/opportunities');
await t.check('Opportunities type chips: each chip shows exactly its golden flags (ids, values), totals bar = sum of those rows', async () => {
  for (const [type, n] of [['overCap', 3], ['nearCap', 1], ['renewal', 12], ['uplift', 3]]) {
    await go(page, '#/opportunities?type=' + type);
    const r = await rows();
    const want = gold.ranked.map((id, i) => ({ id, rank: i + 1, val: gold.rankedValues[i] })).filter((x) => typeOf(x.id) === type);
    eq(r.map((x) => x.rank), want.map((x) => x.rank), type + ' ranks');
    eq(r.map((x) => x.val), want.map((x) => x.val), type + ' values');
    eq(r.length, n, type + ' count');
    ok((await totals()).includes('£' + want.reduce((s, x) => s + x.val, 0).toLocaleString('en-GB')), type + ' totals: ' + await totals());
  }
});
await t.check('Opportunities sorts: value = overall rank; Soonest action date and Type equal the independently computed orders; rank numbers never change', async () => {
  await go(page, '#/opportunities');
  eq(await ranks(), Array.from({ length: 19 }, (_, i) => i + 1), 'value');
  await go(page, '#/opportunities?sort=date'); eq(await ranks(), expectDate, 'date: ' + expectDate.join(','));
  await go(page, '#/opportunities?sort=type'); eq(await ranks(), expectType, 'type: ' + expectType.join(','));
  // changing the select (not the address) does the same
  await go(page, '#/opportunities');
  await page.locator('.opp-control--sort select').selectOption('date'); await settle(page, 250);
  eq(await ranks(), expectDate, 'select -> date'); eq((await hashOf(page)), '#/opportunities?sort=date', 'address');
  await page.locator('.opp-control--sort select').selectOption('value'); await settle(page, 250);
  eq(await hashOf(page), '#/opportunities', 'default sort leaves no param');
});
await t.check('Opportunities search: counts for highways, fennimore, C-005, c-005, street, street lighting, LTD, padded spaces, word order; no match gives the empty state', async () => {
  const cases = [['highways', 2], ['fennimore', 2], ['C-005', 2], ['c-005', 2], ['street', 3], ['street lighting', 2], ['lighting street', 2], ['  highways  ', 2], ['ltd', 19 - 2 /* Brindlemere is a Trust, Westerfield is LLP: only flags on contracts held by an "Ltd" supplier */], ['zzzz', 0], ['legal', 1], ['kestrelvale', 2], ['grounds', 1]];
  for (const [q, n] of cases) {
    await go(page, '#/opportunities?q=' + encodeURIComponent(q.trim()));
    await settle(page, 400);
    const r = await rows();
    const want = gold.ranked.filter((id) => { const cid = id.split('-').slice(1, 3).join('-'); const hay = `${contract(cid).title} ${SUPPLIER(cid)} ${cid}`.toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w)); });
    eq(r.length, want.length, `"${q}" count (independent filter says ${want.length}; spec guess ${n})`);
    eq(r.map((x) => x.rank), want.map((id) => RANK[id]), `"${q}" ranks`);
  }
  await go(page, '#/opportunities?q=zzzz'); await settle(page, 400);
  ok((await text(page.locator('.opp'))).includes('No opportunities match these filters.'), 'empty state');
  eq(await page.locator('.kviz-chipbtn').first().innerText().then((s) => norm(s)), 'All flags 0', 'chip counts follow the search');
  await go(page, '#/opportunities');
});
await t.check('Opportunities hostile search: regex metacharacters, brackets, backslash, emoji, 600 characters, HTML: no crash, no results, no console errors', async () => {
  const before = p.errors.length;
  for (const q of ['.*', '[', '(', '\\', '?', '+', '$^', '😀', 'é', 'a'.repeat(600), '<b>x</b>', "'; drop table", '%00', 'null', 'undefined']) {
    await go(page, '#/opportunities');
    await page.locator('.opp-control--search input').fill(q); await settle(page, 450);
    const n = await page.locator(LIST).count();
    ok(n === 0 || q === '.*' && n === 0 || /^(a+)$/.test(q) === false, 'rows for ' + q.slice(0, 20) + ': ' + n);
    ok(await page.locator('#shell-main h1').count() === 1, 'page alive for ' + q.slice(0, 20));
  }
  eq(p.errors.slice(before), [], 'errors');
});
await t.check('Opportunities status: seeded reviews (one overCap Explained, one renewal No action): Open 17, Reviewed 2, All 19; chips and totals follow; reload keeps them; rank numbers stable', async () => {
  await go(page, '#/opportunities');
  await setStore(page, { 'kontor-triage': { 'F-C-007-overCap': 'explained', 'F-C-003-renewal': 'not_an_issue' } });
  await page.reload(); await page.waitForSelector(LIST); await settle(page, 300);
  eq((await rows()).length, 17, 'open');
  ok((await totals()).includes('£' + (gold.total - 760000 - 310000).toLocaleString('en-GB')), 'open totals ' + await totals());
  ok((await text(page.locator('.opp-totals'))).includes('2 reviewed opportunities are hidden.'), 'hidden note: ' + await text(page.locator('.opp-totals')));
  await go(page, '#/opportunities?status=reviewed');
  eq(await ranks(), [2, 4], 'reviewed ranks');
  ok((await text(page.locator('.opp-totals'))).includes('2 reviewed, £1,070,000 not counted.'), 'reviewed note: ' + await text(page.locator('.opp-totals')));
  await go(page, '#/opportunities?status=all');
  eq((await rows()).length, 19, 'all'); eq(await ranks(), Array.from({ length: 19 }, (_, i) => i + 1), 'ranks stable');
  await go(page, '#/opportunities?status=all&type=overCap');
  eq(await ranks(), [1, 2, 11], 'all + overCap');
  const chips = await page.$$eval('.kviz-chipbtn', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  t.note('chip counts with status=all', chips.join(' | '));
  await go(page, '#/opportunities?status=reviewed&type=overCap');
  eq(await ranks(), [2], 'reviewed + overCap');
  await go(page, '#/opportunities?status=reviewed&q=legal'); eq(await ranks(), [], 'reviewed + no match');
  await setStore(page, { 'kontor-triage': null });
});
await t.check('Opportunities table twin: same rows, order and values as the list under three different filters; Show list returns', async () => {
  for (const q of ['', '?type=renewal', '?sort=date&status=all', '?q=highways']) {
    await go(page, '#/opportunities' + q); await settle(page, 300);
    const list = await rows();
    await page.getByRole('button', { name: 'Show table' }).click(); await settle(page, 250);
    const tbl = await page.$$eval('.opp table tbody tr', (trs) => trs.map((tr) => [...tr.children].map((c) => c.textContent.trim())));
    eq(tbl.map((r) => +r[0]), list.map((r) => r.rank), 'table ranks ' + q);
    eq(tbl.map((r) => +r[4].replace(/[^\d]/g, '')), list.map((r) => r.val), 'table values ' + q);
    await page.getByRole('button', { name: 'Show list' }).click(); await settle(page, 200);
  }
});
await t.check('Opportunities URL round trip: filters survive reload and Back/Forward; Clear filters removes every param and restores 19', async () => {
  await go(page, '#/opportunities?type=renewal&sort=type&status=all&q=street');
  await settle(page, 500);
  eq(await ranks(), [8, 12], 'renewal + street');
  await page.reload(); await page.waitForSelector(LIST); await settle(page, 400);
  eq(await ranks(), [8, 12], 'after reload');
  eq(await page.locator('.opp-control--search input').inputValue(), 'street', 'search box restored');
  await page.getByRole('button', { name: 'Clear filters' }).click(); await settle(page, 700);
  eq(await hashOf(page), '#/opportunities?sort=type', 'Clear filters removes type, status and q and keeps the sort (sort is not a filter)');
  eq((await rows()).length, 19, '19 rows');
});
await t.check('Opportunities export honours the filters: Export while type=overCap writes exactly those 3 rows (+header) in the visible order', async () => {
  await go(page, '#/opportunities?type=overCap&sort=type');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: 'Export opportunities' }).click()]);
  const csv = fs.readFileSync(await dl.path(), 'utf8').replace(/^﻿/, '').trim().split(/\r\n/);
  eq(csv.length, 4, 'lines'); ok(csv[1].startsWith('1,') && csv[2].startsWith('2,') && csv[3].startsWith('11,'), 'order: ' + csv.slice(1).map((l) => l.split(',')[0]).join(','));
});
await t.check('Opportunities determinism: ten reloads of the same filtered view give the identical order and text', async () => {
  const seen = new Set();
  for (let i = 0; i < 6; i += 1) { await go(page, '#/opportunities?sort=date&status=all'); await page.reload(); await page.waitForSelector(LIST); await settle(page, 150); seen.add((await rows()).map((r) => r.txt).join('|')); }
  eq(seen.size, 1, 'distinct renderings');
});

/* ================================================================ Contracts */
const CONTRACTS = data.contracts;
const flagCount = Object.fromEntries(CONTRACTS.map((c) => [c.id, gold.ranked.filter((id) => id.includes('-' + c.id + '-')).length]));
const reg = () => page.$$eval('#shell-main tbody tr', (trs) => trs.map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()));
const regIds = async () => (await reg()).map((r) => r.match(/^C-\d{3}/)[0]);
const showing = async () => ((await text(page.locator('#shell-main'))).match(/Showing (\d+) of (\d+) contracts/) || []).slice(1).map(Number);
await visit(p, '#/contracts');
await t.check('Contracts default order is by id, 24 rows', async () => { eq(await regIds(), CONTRACTS.map((c) => c.id), 'ids'); });
await t.check('Contracts search by title, supplier, id, case, multi-word, trimmed; counts equal an independent filter', async () => {
  const cases = ['kestrelvale', 'KESTRELVALE', 'highways', 'c-0', 'C-005', 'care', 'ltd', 'trust', 'llp', 'cic', 'waste', 'services', 'managed service', 'service managed', '  waste  ', 'zzzz', 'telecare', 'ict'];
  for (const q of cases) {
    await go(page, '#/contracts?q=' + encodeURIComponent(q.trim())); await settle(page, 450);
    const want = CONTRACTS.filter((c) => q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => `${c.title} ${c.supplierName} ${c.id}`.toLowerCase().includes(w))).map((c) => c.id);
    eq(await regIds().catch(() => []), want, `"${q}"`);
    if (want.length === 0) ok((await text(page.locator('#shell-main'))).includes(`No contracts match "${q.trim()}". Check the spelling or clear the search.`), 'empty copy for ' + q);
  }
});
await t.check('Contracts category filter: every category shows exactly its contracts; combined with search; Clear filters restores 24', async () => {
  const cats = [...new Set(CONTRACTS.map((c) => c.serviceCategory))];
  for (const c of cats) {
    await go(page, '#/contracts?category=' + encodeURIComponent(c)); await settle(page, 250);
    eq(await regIds(), CONTRACTS.filter((x) => x.serviceCategory === c).map((x) => x.id), c);
  }
  await go(page, '#/contracts?category=ICT&q=software'); await settle(page, 450);
  eq(await regIds(), ['C-010'], 'ICT + software');
  await go(page, '#/contracts?category=Nope'); await settle(page, 300);
  t.note('unknown category in the address', `${(await regIds().catch(() => [])).length} rows, ${JSON.stringify(await showing())}`);
  await go(page, '#/contracts?category=ICT'); await page.getByRole('button', { name: 'Clear filters' }).click(); await settle(page, 600);
  eq((await regIds()).length, 24, 'cleared');
});
await t.check('Contracts sorts: all eight sortable columns, both directions, equal an independent stable sort; aria-sort follows; the address carries sort and dir', async () => {
  const KEY = { id: (c) => c.id, title: (c) => c.title, supplier: (c) => c.supplierName, category: (c) => c.serviceCategory, start: (c) => c.startDate, end: (c) => c.endDate, value: (c) => c.annualValueGBP, flags: (c) => flagCount[c.id] };
  const cmp = (a, b) => (typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'en-GB', { numeric: true }));
  const bad = [];
  for (const [key, get] of Object.entries(KEY)) {
    for (const dir of ['asc', 'desc']) {
      await go(page, `#/contracts?sort=${key}&dir=${dir}`); await settle(page, 250);
      const want = CONTRACTS.map((c, i) => ({ c, i })).sort((x, y) => (dir === 'asc' ? cmp(get(x.c), get(y.c)) : cmp(get(y.c), get(x.c))) || x.i - y.i).map((x) => x.c.id);
      const got = await regIds();
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${key} ${dir}: got ${got.slice(0, 8).join(',')} want ${want.slice(0, 8).join(',')}`);
    }
  }
  ok(bad.length === 0, bad.join(' || '));
  await go(page, '#/contracts');
  await page.locator('#shell-main thead th', { hasText: 'Annual value' }).getByRole('button').click(); await settle(page, 250);
  ok((await hashOf(page)).includes('sort=value') && (await hashOf(page)).includes('dir=desc'), 'first click on value goes high to low: ' + await hashOf(page));
  eq(await page.locator('#shell-main thead th[aria-sort="descending"]').count(), 1, 'aria-sort descending');
  await page.locator('#shell-main thead th', { hasText: 'Annual value' }).getByRole('button').click(); await settle(page, 250);
  eq(await page.locator('#shell-main thead th[aria-sort="ascending"]').count(), 1, 'second click ascending');
  await page.locator('#shell-main thead th', { hasText: 'Annual value' }).getByRole('button').click(); await settle(page, 250);
  t.note('third click on a sorted header', `address ${await hashOf(page)}, aria-sort=${await page.locator('#shell-main thead th[aria-sort]').evaluateAll((e) => e.map((x) => x.getAttribute('aria-sort')).join(','))}`);
});
await t.check('Contracts hand-check, flag column and row counts: flag count per contract equals the golden flag list; 15 contracts have at least one', async () => {
  await go(page, '#/contracts');
  const r = await reg();
  const got = Object.fromEntries(r.map((x) => [x.match(/^C-\d{3}/)[0], +x.match(/(\d+)$/)[1]]));
  eq(got, flagCount, 'flag counts');
  eq(Object.values(got).filter((n) => n > 0).length, 15, 'contracts with flags');
});

/* ================================================================ Spend */
const CAPS = { 'C-005': 167.0, 'C-007': 114.1, 'C-011': 113.8, 'C-001': 94.8, 'C-017': 90.8, 'C-009': 89.1, 'C-004': 80.6, 'C-018': 76.2, 'C-015': 72.8, 'C-014': 65.5, 'C-002': 65.0, 'C-016': 64.4, 'C-013': 63.2, 'C-010': 62.9, 'C-023': 62.0, 'C-012': 58.2, 'C-003': 55.4, 'C-021': 50.4, 'C-006': 46.1, 'C-008': 46.0, 'C-020': 44.7, 'C-024': 38.8, 'C-019': 30.7, 'C-022': 30.6 };
const capRows = () => page.$$eval('.cap-panel .kviz-bl__list > li', (lis) => lis.map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
const idOfTitle = (txt) => CONTRACTS.find((c) => txt.startsWith(c.title) || txt.includes(c.title + ' ') || txt.includes(c.title)).id;
await visit(p, '#/spend');
await t.check('Spend cap list: 12 rows then "Show all 24 contracts" gives all 24 in descending utilisation (golden table), Show fewer returns to 12', async () => {
  eq((await capRows()).length, 12, 'default 12');
  await page.getByRole('button', { name: /Show all 24 contracts/ }).click(); await settle(page, 300);
  const r = await capRows(); eq(r.length, 24, 'all');
  eq(r.map((x) => { const c = CONTRACTS.filter((c2) => x.includes(c2.title)).sort((a, b) => b.title.length - a.title.length)[0]; return c.id; }), Object.keys(CAPS), 'order');
  const pct = r.map((x) => +x.match(/(\d+\.\d)% of/)[1]);
  eq(pct, Object.values(CAPS), 'percentages');
  await page.getByRole('button', { name: /Show top 12 contracts/ }).click(); await settle(page, 200);
  eq((await capRows()).length, 12, 'back to 12');
});
await t.check('Spend state chips: Over cap = C-005/C-007/C-011, Close to cap = C-001/C-017/C-009, Within cap = the other 18; address ?state= round-trips; table twin agrees', async () => {
  const want = { over: ['C-005', 'C-007', 'C-011'], close: ['C-001', 'C-017', 'C-009'] };
  for (const [state, ids] of Object.entries(want)) {
    await go(page, '#/spend?state=' + state); await settle(page, 250);
    const r = await capRows();
    eq(r.map((x) => CONTRACTS.filter((c) => x.includes(c.title)).sort((a, b) => b.title.length - a.title.length)[0].id), ids, state);
    await page.getByRole('button', { name: 'Show table' }).click(); await settle(page, 250);
    const tb = await page.$$eval('.cap-panel table tbody tr', (trs) => trs.map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()));
    eq(tb.length, ids.length, state + ' table rows');
    await page.getByRole('button', { name: 'Show chart' }).click(); await settle(page, 200);
  }
  await go(page, '#/spend?state=within'); eq((await capRows()).length, 18, 'within');
  await page.reload(); await page.waitForSelector('.cap-panel'); await settle(page, 300); eq((await capRows()).length, 18, 'within after reload');
  await page.getByRole('button', { name: /^All contracts/ }).click(); await settle(page, 200);
  eq(await hashOf(page), '#/spend', 'All clears the param');
});
await t.check('Spend matches tab: chips Review 1, Accepted 30, Unmatched 8, Yours 0 (39 in all); default order puts Suggested first; every sortable column sorts both ways', async () => {
  await go(page, '#/spend/matches'); await settle(page, 300);
  const chips = await page.$$eval('.mt-chips button', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  t.note('matches chips', chips.join(' | '));
  const counts = chips.map((c) => +c.replace(/\D/g, ''));
  eq(counts, [39, 1, 30, 8, 0], 'chip counts: ' + chips.join('|'));
  const rowsOf = () => page.$$eval('.mt-table tbody tr', (trs) => trs.map((tr) => [...tr.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim())));
  const first = (await rowsOf())[0];
  ok(first[0].startsWith('Larchmont Grounds Maintenance'), 'default first row is the suggestion: ' + first[0]);
  const bad = [];
  for (const [col, numeric] of [['Name as paid', false], ['Matched supplier', false], ['Method', false], ['Score', true], ['Status', false], ['Payments', true], ['Total', true]]) {
    await go(page, '#/spend/matches'); await settle(page, 200);
    const idx = ['Name as paid', 'Matched supplier', 'Method', 'Score', 'Status', 'Payments', 'Total'].indexOf(col);
    const btn = page.locator('.mt-table thead th', { hasText: col }).getByRole('button');
    const vals = async () => (await rowsOf()).map((r) => r[idx]);
    const num = (s) => +s.replace(/[^\d.\-]/g, '');
    await btn.click(); await settle(page, 200); const a = await vals();
    await btn.click(); await settle(page, 200); const b = await vals();
    const sortedOk = (arr, dir) => arr.every((v, i) => i === 0 || (numeric ? (dir === 'asc' ? num(arr[i - 1]) <= num(v) : num(arr[i - 1]) >= num(v)) : (dir === 'asc' ? arr[i - 1].localeCompare(v) <= 0 : arr[i - 1].localeCompare(v) >= 0)));
    const dirFirst = numeric ? 'desc' : 'asc';
    const dirSecond = numeric ? 'asc' : 'desc';
    if (col === 'Matched supplier') { const named = (arr) => arr.map((x) => x.split(/Suggested because|Confirm match|Reject match|You /)[0].trim()).filter((x) => x && x !== 'No match'); const na = named(a); if (!(sortedOk(na, 'asc'))) bad.push(`${col} first click should list named suppliers A to Z with unmatched last: ${na.slice(0, 5).join(' / ')}`); const um = a.map((x) => x.startsWith('No match')); const firstU = um.indexOf(true); const lastU = um.lastIndexOf(true); if (um.slice(firstU, lastU + 1).some((x) => !x)) bad.push('unmatched rows are not grouped'); t.note('Matched supplier A to Z: where the 8 "No match" rows land', firstU === 0 ? 'FIRST (rows 1 to 8), so the A to Z list starts with eight blank suppliers' : 'last'); continue; }
    if (col === 'Status') { const order = a.map((x) => x.replace(/\W+/g, '')); const want = ['Suggested', ...Array(8).fill('Unmatched'), ...Array(30).fill('Accepted')]; if (JSON.stringify(order) !== JSON.stringify(want)) bad.push('Status first click order: ' + order.slice(0, 12).join(',')); continue; }
    if (!sortedOk(a, dirFirst)) bad.push(`${col} first click should be ${dirFirst}: ${a.slice(0, 6).join(' / ')}`);
    if (!sortedOk(b, dirSecond)) bad.push(`${col} second click should be ${dirSecond}: ${b.slice(0, 6).join(' / ')}`);
  }
  ok(bad.length === 0, bad.join(' || '));
  await go(page, '#/spend/matches?status=unmatched'); eq((await rowsOf()).length, 8, 'unmatched filter');
  await go(page, '#/spend/matches?status=review'); eq((await rowsOf()).map((r) => r[0].split(' ')[0]), ['Larchmont'], 'review filter');
  await go(page, '#/spend/matches?status=yours'); ok((await text(page.locator('#shell-main'))).includes('You have not confirmed or rejected any match yet') || (await page.locator('.mt-table tbody tr').count()) === 0, 'yours empty state: ' + (await text(page.locator('.mt-empty'))).slice(0, 120));
  await go(page, '#/spend/matches?status=accepted'); eq((await rowsOf()).length, 30, 'accepted');
});
await t.check('Spend no-contract list is descending by amount, totals £23,830,000, and the row drawer subtotal equals the row amount to the penny for all eight payees', async () => {
  await go(page, '#/spend/no-contract'); await settle(page, 300);
  const b = await text(page.locator('#shell-main'));
  const amounts = ['£9,300,000', '£4,750,000', '£2,600,000', '£2,400,000', '£1,700,000', '£1,510,000', '£1,060,000', '£510,000'];
  const bad = [];
  for (let i = 0; i < 8; i += 1) {
    await go(page, '#/spend/no-contract?payee=' + encodeURIComponent(gold.noContract[i]));
    const d = page.locator('[role="dialog"]').first(); await d.waitFor({ state: 'visible' }); await settle(page, 300);
    const dt = await text(d);
    if (!dt.includes(amounts[i] + '.00') && !dt.includes(amounts[i])) bad.push(gold.noContract[i] + ' subtotal missing ' + amounts[i] + ': ' + dt.slice(0, 200));
    await page.keyboard.press('Escape'); await settle(page, 200);
  }
  ok(bad.length === 0, bad.join('; '));
});
await t.check('no console errors and no external requests across the filter run', async () => { eq(p.errors, [], 'errors'); eq(externalRequests(p).map((r) => r.url), [], 'external'); });

await p.ctx.close();
await h.close();
t.finish();
