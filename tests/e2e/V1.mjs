// V1 e2e: Overview (#/overview) and Renewal radar (#/renewals).
//   KONTOR_DIST=.scratch/V1 node tests/e2e/V1.mjs        against the V1 dev build (real Overview, Renewals, Opportunities, Source, Method)
//   node tests/e2e/V1.mjs                                against dist/ (the whole app)
// Covers requirements R10, R14, R16 to R22, R31 to R36, R66, R78 (amended: at 1440x900 and 1366x768 the headline, the caveat and the four cards
// are visible without scrolling; at 1024x768 the headline and the cards), blueprint decisions 7, 8, 10, 12, with the golden numbers of
// requirements 6.6. The empty-band checks build tests/fixtures/v1-radar-empty.jsx into .scratch/V1-empty and run against it.
// Prints 'ok   <name>' / 'FAIL <name>: <why>' / 'skip <name>: <why>'; exits non-zero when anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const text = async (loc) => norm(await loc.innerText());
const settle = (page, ms = 150) => page.waitForTimeout(ms);
const hashOf = (page) => page.evaluate(() => location.hash);

/* ---------------------------------------------------------------- golden data (requirements 6.6 and 1.8) */
const HEADLINE = '£6.1m across 15 contracts flagged as opportunities to investigate';
const CARDS = [
  { type: 'overCap', label: 'Spend over cap £4.2m, 3 contracts, already paid above the cap', value: '£4.2m', count: 3, basis: 'Already paid above the cap' },
  { type: 'nearCap', label: 'Close to cap £0.6m, 1 contract, projected at the current pace', value: '£0.6m', count: 1, basis: 'Projected at the current pace' },
  { type: 'renewal', label: 'Renewals £1.1m, 12 contracts, indicative value per year', value: '£1.1m', count: 12, basis: 'Indicative value per year' },
  { type: 'uplift', label: 'Price increases above cap £0.3m, 3 contracts, already paid above the cap', value: '£0.3m', count: 3, basis: 'Already paid above the cap' },
];
const SUM_LINE = '£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238';
const EVIDENCE = [
  { name: 'Haringey', when: 'January 2025', what: 'External auditor raised a value-for-money risk over weak oversight of renewals and KPI monitoring',
    url: 'https://www.minutes.haringey.gov.uk/documents/s150205/15.2%20Appendix%202%20-%20Procurement%20Section.pdf' },
  { name: 'Guildford', when: '2020–23, reported May 2024', what: 'Spent £18.9m on a contract with a £5.4m maximum; later referred to police as a possible fraud',
    url: 'https://localgovernmentlawyer.co.uk/procurement-and-contracts/402-procurement-news/57355-whistleblowing-allegations-at-council-relating-to-13m-contract-overspend-went-unheard-report-suggests' },
  { name: 'Edinburgh', when: '2022/23 data, audited 2024', what: '£91m went to the top 100 suppliers with no contract on the register; total non-contracted spend was £134m (Scottish council)',
    url: 'https://www.edinburgh.gov.uk/downloads/file/35881/cd2402-non-contracted-spend-and-waivers' },
];
const CLOSE_LINE = "This is one council's contracts and spend. Imagine your full estate.";
const CAVEAT_SHORT = 'Indicative. An opportunity to investigate, not a saving. Test it against the contract before you act.';
const ATTENTION = [
  { id: 'C-001', sentence: 'The notice date passed 6 days ago', value: '£2,400,000', ends: '31 Mar 2027', notice: '6 months', deadline: '30 Sep 2026', auto: false },
  { id: 'C-016', sentence: 'The notice date passed 98 days ago. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier.', value: '£950,000', ends: '31 Dec 2026', notice: '6 months', deadline: '30 Jun 2026', auto: true },
  { id: 'C-007', sentence: 'This contract ended on 30 April 2026. You have paid £780,000 since.', value: '£1,800,000', ends: '30 Apr 2026', notice: '3 months', deadline: null, auto: false },
];
const BANDS = [
  { key: 'm3', title: 'Next 3 months', count: '3 contracts', sum: '£6,930,000 a year', ids: ['C-003', 'C-017', 'C-009'], dates: ['31 Oct 2026', '1 Dec 2026', '31 Dec 2026'], rel: ['25 days left', '56 days left', '86 days left'] },
  { key: 'm6', title: '3 to 6 months', count: '4 contracts', sum: '£7,250,000 a year', ids: ['C-004', 'C-005', 'C-018', 'C-002'], dates: ['31 Jan 2027', '28 Feb 2027', '28 Feb 2027', '31 Mar 2027'], rel: ['117 days left', '145 days left', '145 days left', '176 days left'] },
  { key: 'm12', title: '6 to 12 months', count: '2 contracts', sum: '£2,180,000 a year', ids: ['C-015', 'C-014'], dates: ['30 Apr 2027', '30 Jun 2027'], rel: ['206 days left', '267 days left'] },
];
const ACTION_LINES = {
  'C-003': 'Serve notice by 31 October 2026 or this contract renews for 12 months.',
  'C-004': 'Decide by 31 January 2027 whether to extend. If you do nothing, the contract ends on 31 July 2027.',
  'C-005': 'Plan the re-procurement. The contract ends on 31 May 2027 and the notice date is 28 February 2027.',
  'C-018': 'No notice period is stated in this contract. We used the end date (28 February 2027) as the action date.',
};
const contract = (id) => data.contracts.find((c) => c.id === id);
const extraction = (xid) => data.extractions.find((x) => x.id === xid);
const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');
const noticeX = (id) => extraction(`X-${id}-noticePeriod`);
const noticeText = (id) => { const n = contract(id).notice; return n ? `${n.value} ${n.unit === 'months' ? 'month' : 'day'}${n.value === 1 ? '' : 's'}` : 'Not stated'; };

/* ---------------------------------------------------------------- page helpers */
const ov = {
  h1: '#shell-main h1',
  cards: '.ov-hero a.kviz-card',
  bands: '.ov-radar a.kviz-rs__band',
  evidence: '.ov-evidence .ov-case',
  close: '.ov-close',
};
const primaries = (page) => page.evaluate(() => {
  const probe = document.createElement('i'); probe.style.background = 'var(--accent)'; document.body.appendChild(probe);
  const accent = getComputedStyle(probe).backgroundColor; probe.remove();
  return [...document.querySelectorAll('#shell-main button')].filter((b) => !b.closest('.kviz-stack') && getComputedStyle(b).backgroundColor === accent).map((b) => b.textContent.trim());
});
const noOverflow = (page) => page.evaluate(() => {
  const m = document.getElementById('shell-main');
  return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: m.scrollWidth - m.clientWidth };
});
const dialogOpen = (page) => page.evaluate(() => !![...document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')].find((d) => d.offsetParent !== null || getComputedStyle(d).display !== 'none'));
const density = (page) => page.evaluate(() => {
  const r = (el) => el.getBoundingClientRect();
  const h1 = document.querySelector('#shell-main h1');
  const cav = [...document.querySelectorAll('.page-header__desc p')].find((p) => /Indicative\. An opportunity/.test(p.textContent));
  const cards = [...document.querySelectorAll('.ov-hero a.kviz-card')];
  const sum = document.querySelector('.ov-sum__eq');
  return {
    vh: window.innerHeight, h1Top: r(h1).top, h1: r(h1).bottom, caveat: cav ? r(cav).bottom : null, cards: cards.map((c) => r(c).bottom), cardsTop: cards.map((c) => r(c).top),
    sum: sum ? r(sum).bottom : null, scrollTop: document.getElementById('shell-main').scrollTop,
  };
});
const headingLevels = (page) => page.$$eval('#shell-main h1, #shell-main h2, #shell-main h3, #shell-main h4', (hs) => hs.map((h) => Number(h.tagName[1])));
const copyLint = async (page, label) => {
  const body = await page.locator('#shell-main').innerText();
  ok(!/!/.test(body), `${label}: exclamation mark in the text`);
  ok(!/\p{Extended_Pictographic}/u.test(body.replace(/[↗→←·–—]/gu, '')), `${label}: emoji or pictograph in the text`);
  const buttons = await page.$$eval('#shell-main button', (bs) => bs.filter((b) => !b.closest('.kviz-stack')).map((b) => b.textContent.trim()).filter(Boolean));
  buttons.forEach((b) => ok(/^(Open|Give|See|Show|Hide|View|Read|Clear|Export|Close)\b.+/.test(b), `${label}: button label is not [Verb]+[Object]: "${b}"`));
  const headings = await page.$$eval('#shell-main h1, #shell-main h2, #shell-main h3', (hs) => hs.map((h) => h.textContent.trim()));
  headings.forEach((t) => { if (/^[A-Z][a-z]+( [A-Z][a-z]+)+$/.test(t) && !/Borough Council/.test(t)) throw new Error(`${label}: heading is not sentence case: "${t}"`); });
  return { body, buttons, headings };
};

/* ---------------------------------------------------------------- build the empty-band fixture */
function buildFixture() {
  execFileSync(process.execPath, ['scripts/build.mjs', '--entry', 'tests/fixtures/v1-radar-empty.jsx', '--outdir', '.scratch/V1-empty'], { cwd: ROOT, stdio: 'pipe' });
}

const dist = process.env.KONTOR_DIST || null;
const h = await launch({ dist });
const sourceIsReal = !/STUB/.test(fs.readFileSync(path.join(ROOT, 'src/views/Source.jsx'), 'utf8'));
const oppsIsReal = !/STUB/.test(fs.readFileSync(path.join(ROOT, 'src/views/Opportunities.jsx'), 'utf8'));
const allPages = [];
try {
  const t = await h.newPage({ theme: 'dark' });
  allPages.push(t);
  const page = t.page;
  await visit(t, '#/overview');

  /* ============================================================ OVERVIEW: header, headline (R16, R14, R10, R66, R22) */
  await check('R16 the h1 is the headline sentence, the only h1, and the page title is "Overview | Kontor financial layer"', async () => {
    eq(await page.locator(ov.h1).count(), 1, 'h1 count');
    eq(await text(page.locator(ov.h1)), HEADLINE, 'h1');
    eq(await page.title(), 'Overview | Kontor financial layer', 'title');
    eq(await page.evaluate(() => location.hash), '#/overview', 'address');
  });
  await check('R16 hovering the figure shows the exact value £6,145,238, and so does keyboard focus; Escape hides it and focus stays', async () => {
    const fig = page.locator('.kviz-hero');
    eq(await fig.getAttribute('tabindex'), '0', 'focusable');
    eq(await fig.getAttribute('aria-description'), 'Exact value £6,145,238', 'aria-description');
    await fig.hover();
    await page.locator('.kviz-tip').waitFor({ state: 'visible' });
    ok((await text(page.locator('.kviz-tip'))).includes('£6,145,238'), 'tooltip on hover: ' + await text(page.locator('.kviz-tip')));
    await page.mouse.move(5, 5);
    await settle(page, 400);
    eq(await page.locator('.kviz-tip').count(), 0, 'tooltip gone after the pointer left');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Tab');                                   // from the document start; walk until the figure
    for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('kviz-hero'))); i += 1) await page.keyboard.press('Tab');
    ok(await page.evaluate(() => document.activeElement.classList.contains('kviz-hero')), 'the figure is reachable with Tab');
    await page.locator('.kviz-tip').waitFor({ state: 'visible' });
    ok((await text(page.locator('.kviz-tip'))).includes('£6,145,238'), 'tooltip on focus');
    await page.keyboard.press('Escape');
    await settle(page, 150);
    eq(await page.locator('.kviz-tip').count(), 0, 'Escape hides the tooltip');
    ok(await page.evaluate(() => document.activeElement.classList.contains('kviz-hero')), 'focus stays on the figure');
  });
  await check('R16 R14 R10 under the headline: "Indicative figures. As at 6 October 2026.", the short caveat and a link to How this is calculated', async () => {
    const desc = await text(page.locator('.page-header__desc'));
    ok(desc.startsWith('Indicative figures. As at 6 October 2026.'), 'as-at line: ' + desc);
    ok(desc.includes(CAVEAT_SHORT), 'caveat: ' + desc);
    ok(!/£1\.7m|Sefton|Local Government Association/.test(desc), 'the headline caveat is generic');
    const link = page.locator('.page-header__desc a');
    eq(await link.count(), 1, 'one link in the description');
    eq(await text(link), 'How this is calculated', 'link text');
    eq(await link.getAttribute('href'), '#/method?s=indicative', 'link target');
  });
  await check('R22 the header action is the outline "Open demo guide" (the only header action) and it opens the guide', async () => {
    const btn = page.locator('.page-header__actions button');
    eq(await btn.count(), 1, 'one header action');
    eq(await text(btn), 'Open demo guide', 'label');
    ok(!(await primaries(page)).includes('Open demo guide'), 'it is not a primary button');
    await btn.click();
    await page.waitForFunction(() => !!document.querySelector('dialog[open], [role="dialog"]'), null, { timeout: 4000 });
    ok(await dialogOpen(page), 'a dialog or drawer is open');
    await page.keyboard.press('Escape');
    await settle(page, 400);
    ok(!(await dialogOpen(page)), 'Escape closed it');
    ok(await page.evaluate(() => document.activeElement && /Open demo guide/.test(document.activeElement.textContent)), 'focus returned to the button: ' + await page.evaluate(() => document.activeElement && (document.activeElement.textContent || document.activeElement.tagName).slice(0, 40)));
  });

  /* ============================================================ OVERVIEW: breakdown (R17) */
  await check('R17 four cards with the golden strings, in the order over cap, close to cap, renewals, price increases', async () => {
    const cards = page.locator(ov.cards);
    eq(await cards.count(), 4, 'card count');
    eq(await cards.evaluateAll((as) => as.map((a) => a.getAttribute('aria-label'))), CARDS.map((c) => c.label), 'aria labels');
    for (let i = 0; i < 4; i += 1) {
      const vis = await text(cards.nth(i));
      ok(vis.includes(CARDS[i].value) && vis.includes(`${CARDS[i].count} contract`) && vis.includes(CARDS[i].basis), `card ${i} text: ${vis}`);
    }
  });
  await check('R17 the cards link to #/opportunities?type=... and add up to the headline (4,172,000 + 642,478 + 1,075,500 + 255,260 = 6,145,238)', async () => {
    eq(await page.locator(ov.cards).evaluateAll((as) => as.map((a) => a.getAttribute('href'))), CARDS.map((c) => '#/opportunities?type=' + c.type), 'hrefs');
    eq(await text(page.locator('.ov-sum__eq')), SUM_LINE, 'sum line');
    eq(4172000 + 642478 + 1075500 + 255260, 6145238, 'arithmetic');
    ok((await text(page.locator('.ov-sum'))).startsWith('The four cards add up to the headline'), 'sum label');
    eq(await page.locator('.ov-sum__note').count(), 0, 'no triage note when nothing is excluded');
    ok((await page.locator('.kviz-stack').count()) === 1, 'the stacked bar is there');
  });
  await check('R17 each card opens the filtered list with the same count (3, 1, 12, 3)', async () => {
    if (!oppsIsReal) return skip('card destinations', 'Opportunities is a stub in this build');
    for (const c of CARDS) {
      await go(page, '#/overview');
      await page.locator(`${ov.cards}[href="#/opportunities?type=${c.type}"]`).click();
      await page.waitForSelector('.opp .kviz-barlist__list > li');
      eq(await hashOf(page), '#/opportunities?type=' + c.type, 'address');
      eq(await page.locator('.opp .kviz-barlist__list > li').count(), c.count, 'rows for ' + c.type);
    }
    await go(page, '#/overview');
  });

  /* ============================================================ OVERVIEW: renewal summary (R18) and coverage (R19) */
  await check('R18 the renewal summary reads Next 3 months 3 contracts £6.9m a year, 3 to 6 months 4 £7.3m, 6 to 12 months 2 £2.2m, Needs attention now 3, labelled "Contract value, a year"', async () => {
    const labels = await page.locator(ov.bands).evaluateAll((as) => as.map((a) => a.getAttribute('aria-label')));
    eq(labels, ['Next 3 months: 3 contracts, £6.9m a year', '3 to 6 months: 4 contracts, £7.3m a year', '6 to 12 months: 2 contracts, £2.2m a year'], 'band labels');
    const vis = await page.locator(ov.bands).evaluateAll((as) => as.map((a) => a.innerText.replace(/\s+/g, ' ').trim()));
    eq(vis, ['Next 3 months £6.9m a year 3 contracts', '3 to 6 months £7.3m a year 4 contracts', '6 to 12 months £2.2m a year 2 contracts'], 'visible text');
    eq(await text(page.locator('.ov-radar .kviz-rs__attn')), 'Needs attention now 3', 'attention pill');
    eq(await text(page.locator('.ov-radar .kviz-rs__caption')), 'Contract value, a year', 'caption');
    const hrefs = await page.locator('.ov-radar a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    ok(hrefs.length >= 4 && hrefs.every((x) => x === '#/renewals'), 'every link goes to #/renewals: ' + hrefs);
    ok(!/saving/i.test(await text(page.locator('.ov-radar'))), 'no "saving" in the radar summary');
  });
  await check('R18 "Open renewal radar" opens #/renewals', async () => {
    await page.getByRole('button', { name: 'Open renewal radar' }).click();
    await page.waitForSelector('.rn');
    eq(await hashOf(page), '#/renewals', 'address');
    await go(page, '#/overview');
  });
  await check('R19 coverage: "84% of payments are linked to a contract on the register", £129.4m of £153.5m, a meter, and a link to #/spend/no-contract', async () => {
    const panel = page.locator('.ov-coverage');
    ok((await text(panel.locator('.kviz-meter__label'))).startsWith('84% of payments are linked to a contract on the register'), 'sentence: ' + await text(panel.locator('.kviz-meter__label')));
    ok((await text(panel.locator('.kviz-meter__meta'))).startsWith('£129.4m of £153.5m'), 'amounts: ' + await text(panel.locator('.kviz-meter__meta')));
    const meter = panel.locator('[role="meter"]');
    eq(await meter.getAttribute('aria-valuenow'), '84', 'valuenow');
    eq(await meter.getAttribute('aria-valuetext'), '84%: £129,359,000 of £153,489,000', 'valuetext');
    const link = panel.locator('a', { hasText: 'See spend with no contract' });
    eq(await link.getAttribute('href'), '#/spend/no-contract', 'link');
    const rows = await text(panel.locator('.ov-cov'));
    ok(rows.includes('No contract on the register £23.8m 8 suppliers'), 'no-contract row: ' + rows);
    ok(rows.includes('Waiting for your match review £0.3m 1 supplier'), 'awaiting row: ' + rows);
    ok((await text(panel.locator('.kx-card__desc'))).includes('Sample payments to 30 September 2026'), 'data window');
  });

  /* ============================================================ OVERVIEW: evidence strip (R20), close (R21) */
  await check('R20 evidence strip: heading, the exact intro, three cases with the spec wording', async () => {
    eq(await text(page.locator('.ov-evidence h2')), 'Why this matters', 'heading');
    eq(await text(page.locator('.ov-evidence .kx-card__desc')), 'Public cases summarised from the Kontor scope document. Follow each link to read the source.', 'intro');
    const cases = page.locator(ov.evidence);
    eq(await cases.count(), 3, 'three cases');
    for (let i = 0; i < 3; i += 1) {
      const c = cases.nth(i);
      eq(await text(c.locator('h3')), EVIDENCE[i].name, `case ${i} name`);
      eq(await text(c.locator('.ov-case__when')), EVIDENCE[i].when, `case ${i} when`);
      eq(await text(c.locator('.ov-case__what')), EVIDENCE[i].what, `case ${i} what`);
    }
    ok(!/Exeter|Sefton|Gedling|Sheffield|Windsor|Brighton/.test(await text(page.locator('.ov-evidence'))), 'only the three featured cases are on the Overview');
  });
  await check('R20 each case link opens in a new tab with rel="noopener noreferrer" and the visible words "(opens in a new tab)"; Show all 9 cases goes to #/evidence', async () => {
    const links = page.locator('.ov-evidence .ov-case a');
    eq(await links.count(), 3, 'one link per case');
    for (let i = 0; i < 3; i += 1) {
      const a = links.nth(i);
      eq(await a.getAttribute('href'), EVIDENCE[i].url, `href ${i}`);
      eq(await a.getAttribute('target'), '_blank', `target ${i}`);
      const rel = (await a.getAttribute('rel')) || '';
      ok(/\bnoopener\b/.test(rel) && /\bnoreferrer\b/.test(rel), `rel ${i}: ${rel}`);
      ok((await text(a)).includes('(opens in a new tab)'), `visible new-tab text ${i}: ${await text(a)}`);
    }
    const all = page.locator('.ov-evidence a', { hasText: 'Show all 9 cases' });
    eq(await all.count(), 1, 'show-all link');
    eq(await all.getAttribute('href'), '#/evidence', 'show-all target');
    eq(await all.getAttribute('target'), null, 'show-all stays in this tab');
  });
  await check('R21 close panel: the exact line as a heading, "Give feedback" as the only primary button, "See what comes next" as outline to #/roadmap', async () => {
    eq(await text(page.locator(`${ov.close} h2`)), CLOSE_LINE, 'line');
    eq(await text(page.locator(`${ov.close} button`).nth(0)), 'Give feedback', 'first button');
    eq(await text(page.locator(`${ov.close} button`).nth(1)), 'See what comes next', 'second button');
    eq(await primaries(page), ['Give feedback'], 'primary buttons on the Overview');
    await page.getByRole('button', { name: 'See what comes next' }).click();
    await page.waitForFunction(() => location.hash === '#/roadmap');
    await go(page, '#/overview');
  });
  await check('R21 Give feedback opens the feedback dialog; Escape closes it and returns focus to the button', async () => {
    const btn = page.getByRole('button', { name: 'Give feedback' });
    await btn.click();
    await page.waitForFunction(() => !!document.querySelector('dialog[open], [role="dialog"]'), null, { timeout: 4000 });
    await page.keyboard.press('Escape');
    await settle(page, 400);
    ok(!(await dialogOpen(page)), 'closed');
    ok(await page.evaluate(() => document.activeElement && /Give feedback/.test(document.activeElement.textContent)), 'focus returned to Give feedback');
  });
  await check('R13 R71 Overview text: the word "saving" only in the caveat and the evidence strip; no "!", no emoji, buttons are [Verb]+[Object], sentence case', async () => {
    const { body } = await copyLint(page, 'Overview');
    const s = await page.$$eval('#shell-main *', (els) => els.filter((e) => e.children.length === 0 && /\bsavings?\b/i.test(e.textContent)).map((e) => (e.closest('.page-header__desc') ? 'caveat' : e.closest('.ov-evidence') ? 'evidence' : 'other:' + e.textContent.slice(0, 50))));
    ok(s.every((x) => x === 'caveat' || x === 'evidence'), 'saving outside the allowed places: ' + s.join(' | '));
    ok(!/\bsavings\b/i.test(body), 'plural savings never appears on the Overview');
  });
  await check('heading order is h1, then h2 sections, then h3 (no level skipped)', async () => {
    const lv = await headingLevels(page);
    eq(lv[0], 1, 'first is h1');
    eq(lv.filter((x) => x === 1).length, 1, 'one h1');
    lv.forEach((x, i) => { if (i > 0) ok(x - lv[i - 1] <= 1, 'skipped a level at ' + i + ': ' + lv.join(',')); });
    eq(await page.$$eval('#shell-main h2', (hs) => hs.map((x) => x.textContent.trim())), ['Where the total comes from', 'Renewals coming up', 'Spend linked to contracts', 'Why this matters', CLOSE_LINE], 'h2 sections');
  });

  /* ============================================================ OVERVIEW: keyboard */
  await check('keyboard: Tab reaches every control on the Overview in reading order and each shows a visible focus ring', async () => {
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    await visit(d, '#/overview');
    await d.page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
    const seen = [];
    for (let i = 0; i < 60; i += 1) {
      await d.page.keyboard.press('Tab');
      const info = await d.page.evaluate(() => {
        const el = document.activeElement;
        if (!el || !el.closest('#shell-main')) return null;
        const cs = getComputedStyle(el);
        return { label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, tag: el.tagName };
      });
      if (info) { seen.push(info); if (/See what comes next/.test(info.label)) break; }
    }
    const labels = seen.map((s) => s.label);
    const expectOrder = ['£6.1m', 'How this is calculated', 'Open demo guide', 'Spend over cap £4.2m', 'Close to cap £0.6m', 'Renewals £1.1m', 'Price increases above cap £0.3m',
      'Open renewal radar', 'Needs attention now', 'Next 3 months', '3 to 6 months', '6 to 12 months', 'See spend with no contract', 'Show all 9 cases', 'Read the Haringey source', 'Read the Guildford source', 'Read the Edinburgh source', 'Give feedback', 'See what comes next'];
    let at = 0;
    expectOrder.forEach((want) => { const j = labels.findIndex((l, k) => k >= at && l.startsWith(want)); ok(j >= 0, `"${want}" not reached in order. Saw: ${labels.join(' | ')}`); at = j + 1; });
    const noRing = seen.filter((s) => !s.ring).map((s) => s.label);
    eq(noRing, [], 'controls with no visible focus ring');
  });

  /* ============================================================ OVERVIEW: presenter density (R78 amended, decision 12) */
  for (const [name, vp, withCaveat] of [['1440x900', VIEWPORTS.desktop, true], ['1366x768', VIEWPORTS.laptop, true], ['1024x768', VIEWPORTS.tablet, false]]) {
    await check(`R78 at ${name} the headline ${withCaveat ? ', the caveat ' : ''}and the four cards are visible without scrolling`, async () => {
      const d = await h.newPage({ theme: 'dark', viewport: vp });
      allPages.push(d);
      await visit(d, '#/overview');
      await settle(d.page, 300);
      const m = await density(d.page);
      eq(m.scrollTop, 0, 'not scrolled');
      ok(m.h1Top >= 0 && m.h1 <= m.vh, `headline not fully visible: ${JSON.stringify(m)}`);
      if (withCaveat) ok(m.caveat !== null && m.caveat <= m.vh, `caveat not fully visible: ${JSON.stringify(m)}`);
      ok(m.cards.length === 4 && m.cards.every((b) => b <= m.vh), `cards not fully visible: ${JSON.stringify(m)}`);
      if (name !== '1024x768') ok(m.sum !== null && m.sum <= m.vh, `the sum line is below the fold: ${JSON.stringify(m)}`);
    });
  }

  /* ============================================================ OVERVIEW: the triage loop (R61, headline credibility, decision 7) */
  await check('triage seeded in kontor-triage: F-C-005-overCap Explained gives "£2.8m across 15 contracts", "£3,350,000 excluded after your review." and a sum line without it', async () => {
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    await d.ctx.addInitScript(() => { try { localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'explained' })); } catch (e) { /* ignore */ } });
    await visit(d, '#/overview');
    eq(await text(d.page.locator(ov.h1)), '£2.8m across 15 contracts flagged as opportunities to investigate', 'h1');
    eq(await text(d.page.locator('.ov-sum__excluded')), '£3,350,000 excluded after your review.', 'note');
    eq(await d.page.locator('.ov-sum__note a').getAttribute('href'), '#/opportunities?status=reviewed', 'reviewed link');
    eq(await text(d.page.locator('.ov-sum__eq')), '£822,000 + £642,478 + £1,075,500 + £255,260 = £2,795,238', 'sum line');
    const cards = await d.page.locator(ov.cards).evaluateAll((as) => as.map((a) => a.getAttribute('aria-label')));
    eq(cards[0], 'Spend over cap £0.8m, 2 contracts, already paid above the cap', 'over cap card');
    eq(cards[2], CARDS[2].label, 'renewals unchanged');
    await d.page.locator('.kviz-hero').hover();
    await d.page.locator('.kviz-tip').waitFor({ state: 'visible' });
    ok((await text(d.page.locator('.kviz-tip'))).includes('£2,795,238'), 'tooltip shows the new exact value');
    await d.ctx.close();
  });
  await check('triage seeded: two flags reviewed (Explained, No action) gives £2.0m, "£4,110,000 excluded", sum £2,035,238; Under review keeps the headline at £6.1m', async () => {
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    await d.ctx.addInitScript(() => { try { localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'not_an_issue' })); } catch (e) { /* ignore */ } });
    await visit(d, '#/overview');
    eq(await text(d.page.locator(ov.h1)), '£2.0m across 15 contracts flagged as opportunities to investigate', 'h1');
    eq(await text(d.page.locator('.ov-sum__excluded')), '£4,110,000 excluded after your review.', 'note');
    eq(await text(d.page.locator('.ov-sum__eq')), '£62,000 + £642,478 + £1,075,500 + £255,260 = £2,035,238', 'sum line');
    await d.ctx.close();
    const u = await h.newPage({ theme: 'dark' });
    allPages.push(u);
    await u.ctx.addInitScript(() => { try { localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'under_review' })); } catch (e) { /* ignore */ } });
    await visit(u, '#/overview');
    eq(await text(u.page.locator(ov.h1)), HEADLINE, 'Under review still counts');
    eq(await u.page.locator('.ov-sum__note').count(), 0, 'no note');
    await u.ctx.close();
  });
  await check('triage made on #/opportunities (the flag drawer review select) moves the Overview headline live, with no reload, and back again', async () => {
    if (!oppsIsReal) return skip('triage through the UI', 'Opportunities is a stub in this build');
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    await visit(d, '#/overview');
    eq(await text(d.page.locator(ov.h1)), HEADLINE, 'start');
    await go(d.page, '#/opportunities?flag=F-C-005-overCap');
    const drawer = d.page.locator('[role="dialog"].flag-drawer');
    await drawer.waitFor({ state: 'visible' });
    await settle(d.page, 300);
    await drawer.locator('select').selectOption('explained');
    await settle(d.page, 300);
    await d.page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });
    await d.page.locator('nav[aria-label="Primary"] button[aria-label="Overview"], nav[aria-label="Primary"] [aria-label="Overview"]').first().click();
    await d.page.waitForFunction(() => location.hash === '#/overview');
    await d.page.waitForSelector('.ov');
    eq(await text(d.page.locator(ov.h1)), '£2.8m across 15 contracts flagged as opportunities to investigate', 'headline after the review');
    eq(await text(d.page.locator('.ov-sum__excluded')), '£3,350,000 excluded after your review.', 'excluded note');
    eq(await d.page.evaluate(() => JSON.parse(localStorage.getItem('kontor-triage'))), { 'F-C-005-overCap': 'explained' }, 'stored');
    await go(d.page, '#/opportunities?flag=F-C-005-overCap');
    await drawer.waitFor({ state: 'visible' });
    await settle(d.page, 300);
    await drawer.locator('select').selectOption('to_investigate');
    await settle(d.page, 300);
    await d.page.keyboard.press('Escape');
    await go(d.page, '#/overview');
    eq(await text(d.page.locator(ov.h1)), HEADLINE, 'headline back to £6.1m');
    eq(await d.page.locator('.ov-sum__note').count(), 0, 'note gone');
    await d.ctx.close();
  });
  await check('every flag reviewed: the Overview still renders (£0, no note crash, no console errors)', async () => {
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    const all = ['005-overCap', '007-overCap', '001-nearCap', '003-renewal', '004-uplift', '002-renewal', '001-renewal', '004-renewal', '007-renewal', '014-renewal', '011-overCap', '018-renewal', '005-renewal', '012-uplift', '016-renewal', '015-renewal', '009-renewal', '010-uplift', '017-renewal'];
    await d.ctx.addInitScript((ids) => { try { const t = {}; ids.forEach((s) => { t['F-C-' + s] = 'explained'; }); localStorage.setItem('kontor-triage', JSON.stringify(t)); } catch (e) { /* ignore */ } }, all);
    await visit(d, '#/overview');
    const h1 = await text(d.page.locator(ov.h1));
    ok(/^£0 across 0 contracts flagged as opportunities to investigate$/.test(h1), 'h1: ' + h1);
    ok((await text(d.page.locator('.ov-sum__excluded'))).includes('£6,145,238 excluded after your review.'), 'note');
    eq(await d.page.locator(ov.cards).count(), 4, 'four cards still there');
    eq(await d.page.locator('.ov-radar').count(), 1, 'the rest of the page is intact');
    await d.ctx.close();
  });
  await check('confirming the Larchmont match (kontor-matches) moves the Overview: £6.2m, a new sum line, the awaiting-review row goes and the linked amount grows', async () => {
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    await d.ctx.addInitScript(() => { try { localStorage.setItem('kontor-matches', JSON.stringify({ 'Larchmont Grounds Maintenance': 'confirm' })); } catch (e) { /* ignore */ } });
    await visit(d, '#/overview');
    eq(await text(d.page.locator(ov.h1)), '£6.2m across 15 contracts flagged as opportunities to investigate', 'h1');
    eq(await text(d.page.locator('.ov-sum__eq')), '£4,232,000 + £642,478 + £1,075,500 + £255,260 = £6,205,238', 'sum line');
    const cov = await text(d.page.locator('.ov-coverage'));
    ok(cov.includes('£129.7m of £153.5m') && !cov.includes('Waiting for your match review'), 'coverage: ' + cov);
    await d.ctx.close();
  });
  await check('the assumptions drawer value (kontor-assumptions renewalRate 8%) moves the Overview to £6.8m with renewals £1.7m', async () => {
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    await d.ctx.addInitScript(() => { try { localStorage.setItem('kontor-assumptions', JSON.stringify({ renewalRate: 0.08 })); } catch (e) { /* ignore */ } });
    await visit(d, '#/overview');
    eq(await text(d.page.locator(ov.h1)), '£6.8m across 15 contracts flagged as opportunities to investigate', 'h1');
    eq(await text(d.page.locator('.ov-sum__eq')), '£4,172,000 + £642,478 + £1,720,800 + £255,260 = £6,790,538', 'sum line');
    await d.ctx.close();
  });

  /* ============================================================ RENEWALS (R31 to R36, R66) */
  await go(page, '#/renewals');
  await check('R31 header: one h1 "Renewal radar", as-at line, the subtitle and a How this is calculated link to #/method?s=radar; title "Renewal radar | Kontor financial layer"', async () => {
    eq(await page.locator(ov.h1).count(), 1, 'h1 count');
    eq(await text(page.locator(ov.h1)), 'Renewal radar', 'h1');
    eq(await page.title(), 'Renewal radar | Kontor financial layer', 'title');
    ok((await text(page.locator('.page-header__asat'))).includes('6 October 2026'), 'as at');
    ok((await text(page.locator('.page-header__desc'))).startsWith('Contracts whose notice date falls in the next 3, 6 and 12 months, and the ones where it has already passed.'), 'subtitle');
    eq(await page.locator('.page-header__desc a').getAttribute('href'), '#/method?s=radar', 'method link');
    eq(await page.locator('.page-header__actions').count(), 0, 'no header actions, so no primary button');
    eq(await primaries(page), [], 'no primary button on the page');
  });
  await check('R34 "Needs attention now" comes first (before the three bands) with a warning glyph, a count of 3 and the contracts C-001, C-016, C-007 in that order', async () => {
    const order = await page.$$eval('#shell-main h2', (hs) => hs.map((x) => x.textContent.trim()));
    eq(order.length, 2, 'two h2 sections: ' + order);
    ok(order[0] === 'Needs attention now', 'first h2: ' + order[0]);
    eq(order[1], 'Notice dates in the next 12 months', 'second h2');
    ok(await page.evaluate(() => { const a = document.querySelector('.rn-attn'), b = document.querySelector('.rn-lanes'); return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'attention panel precedes the lanes');
    ok(await page.locator('.rn-attn h2 .fa-triangle-exclamation').count() === 1, 'warning glyph in the heading');
    eq(await text(page.locator('.rn-attn .kx-card__titlerow .ds-badge, .rn-attn .kx-card__titlerow > span').last()), '3', 'count');
    const titles = await page.locator('.rn-attn__title').allTextContents();
    eq(titles, ATTENTION.map((a) => contract(a.id).title), 'titles in order');
    eq(await page.locator('.rn-attn__row .fa-triangle-exclamation').count(), 3, 'a warning glyph on every row (not colour alone)');
  });
  await check('R34 the three sentences are exact: C-001 6 days ago, C-016 98 days ago and renews on 1 January 2027 for 12 months, C-007 ended 30 April 2026 and £780,000 paid since', async () => {
    eq(await page.locator('.rn-attn__msg').allTextContents(), ATTENTION.map((a) => a.sentence), 'sentences');
  });
  await check('R32 each attention row: supplier, annual value, end date, notice period as extracted, deadline with relative text, Auto-renews pill (C-016 only), confidence, View clause, page N', async () => {
    for (let i = 0; i < 3; i += 1) {
      const a = ATTENTION[i], row = page.locator('.rn-attn__row').nth(i);
      const t = await text(row);
      ok(t.includes(contract(a.id).supplierName), `${a.id} supplier`);
      ok(t.includes(a.value + ' a year'), `${a.id} annual value: ${t}`);
      ok(t.includes(a.ends), `${a.id} end date`);
      ok(t.includes('Notice period ' + a.notice), `${a.id} notice period: ${t}`);
      if (a.deadline) ok(t.includes(`Notice deadline ${a.deadline}`), `${a.id} deadline: ${t}`);
      else ok(t.includes('Paid since it ended £780,000') && t.includes('Ended 30 Apr 2026 (159 days ago)'), `${a.id} ended facts: ${t}`);
      eq((await row.locator('.kx-pill', { hasText: 'Auto-renews' }).count()) === 1, a.auto, `${a.id} Auto-renews pill`);
      ok(await row.locator('.conf-pill', { hasText: 'High' }).count() === 1, `${a.id} confidence pill`);
      const x = noticeX(a.id);
      const link = row.locator('a.clause-link');
      eq(await link.getAttribute('href'), `#/source/${a.id}/${x.id}?from=renewals`, `${a.id} clause href`);
      ok((await text(link)).startsWith(`View clause, page ${x.provenance[0].page}`), `${a.id} clause text: ${await text(link)}`);
      eq(await row.locator('a.rn-attn__title').getAttribute('href'), '#/contracts/' + a.id, `${a.id} title link`);
    }
    ok((await text(page.locator('.rn-attn__row').nth(0))).includes('Notice deadline 30 Sep 2026 (6 days ago)'), 'C-001 deadline text');
    ok((await text(page.locator('.rn-attn__row').nth(1))).includes('Notice deadline 30 Jun 2026 (98 days ago)'), 'C-016 deadline text');
  });
  await check('R31 the bands: 3 / 4 / 2 contracts and £6,930,000 / £7,250,000 / £2,180,000 a year in the group headers', async () => {
    const heads = await page.$$eval('.rn-lanes .kviz-rl__ghead', (hs) => hs.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
    eq(heads, BANDS.map((b) => `${b.title} ${b.count} ${b.sum}`), 'group headers');
    eq(await page.locator('.rn-lanes h3').allTextContents(), BANDS.map((b) => b.title), 'group headings are h3');
    eq(BANDS.reduce((a, b) => a + b.ids.length, 0), 9, 'nine contracts on the radar');
  });
  await check('R31 R32 each band lists the golden contracts in deadline order, with the deadline date and the relative text', async () => {
    for (const b of BANDS) {
      const grp = page.locator(`.rn-lanes section[aria-labelledby="kviz-rl-${b.key}"]`);
      eq(await grp.locator('.kviz-rl__name').allTextContents(), b.ids.map((id) => contract(id).title), `${b.key} titles in deadline order`);
      eq(await grp.locator('.kviz-rl__date').allTextContents(), b.dates, `${b.key} deadline dates`);
      eq((await grp.locator('.kviz-rl__rel').allTextContents()).map(norm), b.rel, `${b.key} relative text`);
      eq(await grp.locator('.kviz-rl__name').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), b.ids.map((id) => '#/contracts/' + id), `${b.key} row links`);
    }
    const allNames = await page.locator('.rn-lanes .kviz-rl__name').allTextContents();
    ATTENTION.forEach((a) => ok(!allNames.includes(contract(a.id).title), a.id + ' is in the attention group only'));
  });
  await check('R32 each band row shows annual value, supplier, end date, notice period as extracted, an action line, a confidence pill and "View clause, page N" to the notice clause', async () => {
    for (const b of BANDS) {
      const rows = page.locator(`.rn-lanes section[aria-labelledby="kviz-rl-${b.key}"] .kviz-rl__list > li`);
      for (let i = 0; i < b.ids.length; i += 1) {
        const id = b.ids[i], c = contract(id), r = rows.nth(i), t = await text(r);
        ok(t.includes(c.supplierName), `${id} supplier`);
        ok(t.includes(gbp(c.annualValueGBP)), `${id} annual value ${gbp(c.annualValueGBP)}: ${t}`);
        const endsText = new Date(c.endDate + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('Sept', 'Sep');
        ok(t.includes('Contract ends ' + endsText), `${id} end date ${endsText}: ${t}`);
        if (id !== 'C-018') ok(t.includes('Notice period: ' + noticeText(id)), `${id} notice period "${noticeText(id)}": ${t}`);
        if (ACTION_LINES[id]) ok(t.includes(ACTION_LINES[id]), `${id} action line: ${t}`);
        ok(await r.locator('.conf-pill').count() === 1, `${id} confidence pill`);
        const x = noticeX(id), link = r.locator('a.clause-link');
        eq(await link.getAttribute('href'), `#/source/${id}/${x.id}?from=renewals`, `${id} clause href`);
        ok((await text(link)).startsWith(`View clause, page ${x.provenance[0].page}`), `${id} clause text`);
      }
    }
    const autos = await page.$$eval('.rn-lanes .kviz-rl__list > li', (lis) => lis.filter((li) => /Auto-renews/.test(li.querySelector('.kviz-rl__sub').textContent)).map((li) => li.querySelector('.kviz-rl__name').textContent));
    eq(autos, [contract('C-003').title, contract('C-017').title], 'Auto-renews markers (C-003 and C-017 only on the radar bands)');
    ok(await page.locator('.rn-lanes .kviz-rl__auto').first().evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth) >= 1), 'the Auto-renews marker is drawn as a pill');
  });
  await check('R33 C-018 (no notice period stated): deadline 28 Feb 2027, the note "No notice period stated. We used the end date." and a Needs review pill', async () => {
    const row = page.locator('.rn-lanes .kviz-rl__list > li', { hasText: contract('C-018').title });
    ok((await text(row)).includes('No notice period stated. We used the end date.'), 'note: ' + await text(row));
    eq(norm(await row.locator('.kviz-rl__date').innerText()), '28 Feb 2027', 'deadline');
    eq(await text(row.locator('.conf-pill')), 'Needs review', 'badge');
    ok((await text(row)).includes(ACTION_LINES['C-018']), 'the action line for a missing notice period');
    ok(!/Notice period: \d/.test(await text(row)), 'no invented number');
  });
  await check('R33 deadlines derive exactly: C-001 31 Mar 2027 minus 6 months is 30 Sep 2026; C-017 31 Dec 2026 minus 30 days is 1 Dec 2026', async () => {
    ok((await text(page.locator('.rn-attn__row').nth(0))).includes('Notice deadline 30 Sep 2026'), 'C-001');
    const row = page.locator('.rn-lanes .kviz-rl__list > li', { hasText: contract('C-017').title });
    eq(norm(await row.locator('.kviz-rl__date').innerText()), '1 Dec 2026', 'C-017');
  });
  await check('R31 the band boundaries shown are the computed dates 6 Jan 2027, 6 Apr 2027 and 6 Oct 2027 (axis and sentence)', async () => {
    const ticks = (await page.$$eval('.rn-lanes .kviz-rl__tick', (ts) => ts.map((x) => x.innerText))).map(norm);
    eq(ticks, ['Now 6 Oct 2026', '3 months 6 Jan 2027', '6 months 6 Apr 2027', '12 months 6 Oct 2027'], 'axis ticks');
    eq(await text(page.locator('.rn-lanes .kviz-fig__desc')), 'Next 3 months runs to 6 Jan 2027, 3 to 6 months to 6 Apr 2027, and 6 to 12 months to 6 Oct 2027.', 'sentence');
  });
  await check('R31 footnote: "12 contracts have notice dates more than 12 months away and are not on the radar." with a link to #/contracts', async () => {
    const note = page.locator('.rn-lanes .kviz-fig__note');
    ok((await text(note)).startsWith('12 contracts have notice dates more than 12 months away and are not on the radar.'), 'text: ' + await text(note));
    const link = note.locator('a');
    eq(await link.getAttribute('href'), '#/contracts', 'link');
    eq(await text(link), 'See all contracts', 'link text');
    eq(24 - 9 - 3, 12, 'arithmetic: 24 contracts, 9 on the bands, 3 needing attention');
  });
  await check('legend and table twin: the legend has no "Deadline passed" key; "Show table" lists the nine contracts with annual and total value (sums £16,360,000)', async () => {
    const legend = (await text(page.locator('.rn-lanes .kviz-legend'))).replace(/\s+/g, ' ');
    ok(!/Deadline passed/.test(legend) && /Notice deadline/.test(legend), 'legend: ' + legend);
    await page.getByRole('button', { name: 'Show table' }).click();
    const head = (await page.locator('.rn-lanes .kviz-table thead th').allTextContents()).map(norm);
    eq(head, ['Period', 'Contract', 'Supplier', 'Annual value', 'Total contract value', 'Contract ends', 'Notice period', 'Notice deadline', 'Auto-renews'], 'columns');
    const rows = await page.$$eval('.rn-lanes .kviz-table tbody tr', (trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent.trim())));
    eq(rows.length, 9, 'rows');
    eq(rows.map((r) => r[1]), BANDS.flatMap((b) => b.ids.map((id) => contract(id).title)), 'order');
    eq(rows.reduce((a, r) => a + Number(r[3].replace(/[£,]/g, '')), 0), 16360000, 'annual values sum');
    eq(rows.filter((r) => r[8] === 'Yes').length, 2, 'auto-renewing');
    await page.getByRole('button', { name: 'Show chart' }).click();
    eq(await page.locator('.rn-lanes .kviz-rl').count(), 1, 'chart back');
  });
  await check('R32 clicking View clause goes to the source viewer for the notice clause and remembers Renewal radar', async () => {
    const row = page.locator('.rn-lanes .kviz-rl__list > li', { hasText: contract('C-003').title });
    await row.locator('a.clause-link').click();
    await page.waitForFunction(() => location.hash.startsWith('#/source/'));
    eq(await hashOf(page), '#/source/C-003/X-C-003-noticePeriod?from=renewals', 'address');
    if (sourceIsReal) {
      await page.waitForSelector('mark[data-extraction-id], mark');
      eq(norm(await page.locator('mark').first().innerText()).replace(/^Cited clause\s*/, ''), norm(noticeX('C-003').provenance[0].quote), 'highlighted text equals the quote');
      eq(await page.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label'), 'Renewal radar', 'rail keeps Renewal radar');
    } else skip('source destination', 'Source is a stub in this build');
    await page.goBack();
    await page.waitForSelector('.rn');
    eq(await hashOf(page), '#/renewals', 'Back returns to the radar');
  });
  await check('R66 the footnote link and the row title links work: #/contracts and #/contracts/C-003', async () => {
    await page.locator('.rn-lanes .kviz-fig__note a').click();
    await page.waitForFunction(() => location.hash === '#/contracts');
    await go(page, '#/renewals');
    await page.locator('.rn-lanes .kviz-rl__name', { hasText: contract('C-003').title }).click();
    await page.waitForFunction(() => location.hash === '#/contracts/C-003');
    await go(page, '#/renewals');
  });
  await check('keyboard: Tab reaches the attention rows and every band row link and clause link, Up and Down move between band rows, and every stop shows a focus ring', async () => {
    const d = await h.newPage({ theme: 'dark' });
    allPages.push(d);
    await visit(d, '#/renewals');
    await d.page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
    const seen = [];
    for (let i = 0; i < 70; i += 1) {
      await d.page.keyboard.press('Tab');
      const info = await d.page.evaluate(() => {
        const el = document.activeElement;
        if (!el || !el.closest('#shell-main')) return null;
        const cs = getComputedStyle(el);
        const after = getComputedStyle(el, '::after');
        const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || (after.outlineStyle !== 'none' && parseFloat(after.outlineWidth) >= 2);
        return { label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70), ring, href: el.getAttribute('href') };
      });
      if (info) seen.push(info);
    }
    const hrefs = seen.map((s) => s.href).filter(Boolean);
    ['#/method?s=radar', '#/contracts/C-001', '#/source/C-001/X-C-001-noticePeriod?from=renewals', '#/contracts/C-003', '#/source/C-003/X-C-003-noticePeriod?from=renewals', '#/contracts/C-014', '#/contracts'].forEach((want) => ok(hrefs.includes(want), `Tab did not reach ${want}. Reached: ${hrefs.join(' ')}`));
    eq(seen.filter((s) => !s.ring).map((s) => s.label), [], 'stops with no visible focus ring');
    // Down arrow moves between lane rows
    await d.page.locator('.rn-lanes .kviz-rl__name').first().focus();
    await d.page.keyboard.press('ArrowDown');
    eq(await d.page.evaluate(() => document.activeElement.textContent), contract('C-017').title, 'ArrowDown moves to the next row');
    await d.ctx.close();
  });
  await check('R13 R71 Renewals text: no "saving", no "!", no emoji, buttons are [Verb]+[Object], sentence case headings, heading order', async () => {
    const { body } = await copyLint(page, 'Renewals');
    ok(!/\bsavings?\b/i.test(body), 'the word saving does not appear on the radar');
    const lv = await headingLevels(page);
    eq(lv.filter((x) => x === 1).length, 1, 'one h1');
    lv.forEach((x, i) => { if (i > 0) ok(x - lv[i - 1] <= 1, 'skipped a level at ' + i + ': ' + lv.join(',')); });
  });

  /* ============================================================ RENEWALS: empty states through the fixture (R36) */
  let fixtureBuilt = false;
  try { buildFixture(); fixtureBuilt = true; } catch (e) { console.log('FAIL empty-band fixture build: ' + String(e.stderr || e.message).slice(0, 400)); failed += 1; }
  const EMPTY = 'No notice dates fall in this period. Nothing needs your decision here.';
  if (fixtureBuilt) {
    const f = await h.newPage({ theme: 'dark', dist: '.scratch/V1-empty' });
    allPages.push(f);
    await check('R36 an emptied "3 to 6 months" band shows "No notice dates fall in this period. Nothing needs your decision here.", 0 contracts and £0 a year; the other bands are untouched', async () => {
      await visit(f, '#/renewals?empty=m6');
      const grp = f.page.locator('.rn-lanes section[aria-labelledby="kviz-rl-m6"]');
      eq(await text(grp.locator('.kviz-rl__empty')), EMPTY, 'empty copy');
      eq(norm(await grp.locator('.kviz-rl__ghead').innerText()), '3 to 6 months 0 contracts £0 a year', 'group header');
      eq(await grp.locator('.kviz-rl__list > li').count(), 0, 'no rows');
      eq(await f.page.locator('.rn-lanes section[aria-labelledby="kviz-rl-m3"] .kviz-rl__list > li').count(), 3, 'next 3 months untouched');
      eq(await f.page.locator('.rn-lanes section[aria-labelledby="kviz-rl-m12"] .kviz-rl__list > li').count(), 2, '6 to 12 months untouched');
      eq(await f.page.locator('.rn-lanes .kviz-rl__empty').count(), 1, 'one empty message');
    });
    await check('R36 every band empty: three empty messages, the page still has its h1, attention panel and footnote', async () => {
      await visit(f, '#/renewals?empty=m3,m6,m12');
      eq((await f.page.locator('.rn-lanes .kviz-rl__empty').allTextContents()).map(norm), [EMPTY, EMPTY, EMPTY, 'No contracts reach their notice deadline in the next 12 months.'], 'three band messages, then the chart-wide one');
      eq(await f.page.locator('.rn-attn__row').count(), 3, 'attention rows intact');
      eq(await f.page.locator('.rn-lanes .kviz-fig__note a').count(), 1, 'footnote link intact');
      await f.page.getByRole('button', { name: 'Show table' }).click();
      eq(await f.page.locator('.rn-lanes .kviz-table tbody tr').count(), 0, 'table twin has no rows and no crash');
    });
    await check('nothing needs attention: the panel says so, with a count of 0', async () => {
      await visit(f, '#/renewals?empty=attention');
      eq(await text(f.page.locator('.rn-attn__none')), 'No notice dates have passed and no contract is being paid after it ended.', 'copy');
      eq(await f.page.locator('.rn-attn__row').count(), 0, 'no rows');
    });
    for (const theme of ['dark', 'light']) {
      await check(`axe clean in ${theme}: the emptied band, every band empty, and nothing needing attention`, async () => {
        const d = await h.newPage({ theme, dist: '.scratch/V1-empty' });
        allPages.push(d);
        for (const q of ['?empty=m6', '?empty=m3,m6,m12', '?empty=attention']) {
          await visit(d, '#/renewals' + q);
          eq(await axe(d.page), [], q + ' ' + theme);
        }
        await d.ctx.close();
      });
    }
    eq(f.errors, [], 'fixture console errors');
  }

  /* ============================================================ quality: axe, layout, network */
  for (const theme of ['dark', 'light']) {
    await check(`axe clean in ${theme}: Overview (default, a reviewed flag, with the exact-value tooltip open), Renewals (default, table twin)`, async () => {
      const d = await h.newPage({ theme });
      allPages.push(d);
      await visit(d, '#/overview');
      eq(await axe(d.page), [], 'overview ' + theme);
      await d.page.locator('.kviz-hero').focus();
      await d.page.locator('.kviz-tip').waitFor({ state: 'visible' });
      const v = await axe(d.page);
      const mine = v.filter((x) => !(x.id === 'region' && x.targets.every((tg) => tg.startsWith('.kviz-tip'))));
      eq(mine, [], 'overview with the tooltip open ' + theme);
      if (v.length) skip('chart tooltip landmark', 'axe "region" on the .kviz-tip portal that src/charts/Tip.jsx renders into <body> (A3); it is open only while the figure is hovered or focused');
      await d.page.keyboard.press('Escape');
      await d.ctx.addInitScript(() => { try { localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'explained' })); } catch (e) { /* ignore */ } });
      await visit(d, '#/overview');
      ok(await d.page.locator('.ov-sum__note').count() === 1, 'the note is showing');
      eq(await axe(d.page), [], 'overview with the excluded note ' + theme);
      await visit(d, '#/renewals');
      eq(await axe(d.page), [], 'renewals ' + theme);
      await d.page.getByRole('button', { name: 'Show table' }).click();
      eq(await axe(d.page), [], 'renewals table twin ' + theme);
      await d.page.getByRole('button', { name: 'Show chart' }).click();
      await d.page.locator('.rn-lanes .kviz-rl__name').first().focus();
      await settle(d.page, 300);
      const v2 = await axe(d.page);
      const mine2 = v2.filter((x) => !(x.id === 'region' && x.targets.every((tg) => tg.startsWith('.kviz-tip'))));
      eq(mine2, [], 'renewals with a row tooltip ' + theme);
      await d.ctx.close();
    });
  }
  for (const [name, vp] of [['1440x900', VIEWPORTS.desktop], ['1366x768', VIEWPORTS.laptop], ['1024x768', VIEWPORTS.tablet], ['390x844', VIEWPORTS.phone]]) {
    for (const theme of name === '1440x900' || name === '390x844' ? ['dark', 'light'] : ['dark']) {
      await check(`layout at ${name} (${theme}): no horizontal page scroll on the Overview and the Renewal radar, nothing overlapping`, async () => {
        const d = await h.newPage({ theme, viewport: vp });
        allPages.push(d);
        for (const route of ['#/overview', '#/renewals']) {
          await visit(d, route);
          await settle(d.page, 200);
          const o = await noOverflow(d.page);
          ok(o.doc <= 1 && o.main <= 1, `${route} overflows horizontally: ${JSON.stringify(o)}`);
          // no two sibling cards overlap and no text is wider than its card
          const bad = await d.page.evaluate(() => [...document.querySelectorAll('#shell-main .kx-card, #shell-main .ov-case__body, #shell-main .kviz-card')].filter((el) => el.scrollWidth - el.clientWidth > 1).map((el) => el.className.slice(0, 40)));
          eq(bad, [], `${route} elements wider than their box`);
        }
        await d.ctx.close();
      });
    }
  }
  await check('no console errors and no request left the origin, across every page and state this test opened', async () => {
    allPages.forEach((p) => { if (p.errors.length) throw new Error('console errors: ' + p.errors.slice(0, 3).join(' | ')); });
    const ext = allPages.flatMap((p) => externalRequests(p));
    eq(ext, [], 'external requests');
    if (t.errors.length) throw new Error('console errors on the main page: ' + t.errors.slice(0, 3).join(' | '));
  });
  await check('the storage-blocked run still renders both pages with the golden headline', async () => {
    const d = await h.newPage({ theme: 'dark', blockStorage: true });
    await visit(d, '#/overview');
    eq(await text(d.page.locator(ov.h1)), HEADLINE, 'headline');
    await go(d.page, '#/renewals');
    eq(await d.page.locator('.rn-attn__row').count(), 3, 'attention rows');
    await d.ctx.close();
  });
  await check('both themes: switching theme keeps every golden string (Overview, Renewals)', async () => {
    await go(page, '#/overview');
    await setTheme(page, 'light');
    eq(await text(page.locator(ov.h1)), HEADLINE, 'headline in light');
    eq(await text(page.locator('.ov-sum__eq')), SUM_LINE, 'sum in light');
    await go(page, '#/renewals');
    eq(await page.locator('.rn-attn__msg').allTextContents(), ATTENTION.map((a) => a.sentence), 'attention in light');
    await setTheme(page, 'dark');
  });
} finally {
  await h.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
