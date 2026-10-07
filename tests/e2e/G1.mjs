// G1 e2e: the Guide (#/guide) and its Guide tab in the shell header.
//   KONTOR_DIST=.scratch/G1full node tests/e2e/G1.mjs        against a full-app build (needs the real routes: node scripts/build.mjs --outdir .scratch/G1full)
//   node tests/e2e/G1.mjs                                     against dist/
// Covers: the route (title, one h1, no rail item), the header Guide tab (link, active state with the accent underline, the app tab stepping back,
// navigation, back to the Overview through the rail and through the app tab, Apps and Chat still inert), every section id reachable by ?s= (full load
// and in-app, heading focused and on screen), the contents list at four widths, every number on the page against the engine (starting numbers, and after
// a review, a confirmed match and a new renewal rate), the Try actions (theme, settings, reset with its confirm), every link on the page resolves, the
// Menu and Demo guide links, the phone layout, both themes with axe (also with the Guide tab focused), a keyboard-only run, no sideways scroll at four
// sizes, copy lint, no console errors, no request leaving the origin, storage blocked.
// Prints 'ok   <name>' / 'FAIL <name>: <why>'; exits non-zero when anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme } from '../lib/harness.mjs';
import { computeEstate } from '../../src/lib/estate.js';
import { evidenceFor } from '../../src/lib/evidenceFor.js';
import * as C from '../../src/lib/copy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
let passed = 0;
async function check(name, fn) {
  try { await fn(); passed += 1; console.log('ok   ' + name); } catch (e) { failed += 1; console.log('FAIL ' + name + ': ' + ((e && e.message) || e)); }
}
const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg); };
const norm = (s) => String(s).replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const settle = (page, ms = 200) => page.waitForTimeout(ms);
const text = async (loc) => norm(await loc.innerText());
const has = (hay, needle, msg) => ok(hay.includes(needle), `${msg || 'text'} should include "${needle}"; text was: ${hay.slice(0, 400)}`);
const hashOf = (page) => page.evaluate(() => location.hash);
const sec = (page, id) => text(page.locator(`section[aria-labelledby="${id}"]`));
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a ? { tag: a.tagName, id: a.id || '', label: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80), cls: typeof a.className === 'string' ? a.className : '' } : null; });
const noOverflow = (page) => page.evaluate(() => { const m = document.getElementById('shell-main'); return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: m.scrollWidth - m.clientWidth }; });
const h1Is = (page, expected) => page.waitForFunction((t) => ((document.querySelector('#shell-main h1') || {}).textContent || '').replace(/\s+/g, ' ').trim() === t, expected, { timeout: 6000 });
const toastText = async (page) => norm((await page.locator('.kx-toast').allInnerTexts()).join(' | '));
const dialog = (page, name) => page.getByRole('dialog', { name });

/* ---------------------------------------------------------------- the engine, in Node (independent of the page) */
const SEED = { triage: { 'F-C-005-overCap': 'explained' }, decisions: { 'Larchmont Grounds Maintenance': 'confirm' }, assumptions: { renewalRate: 0.08 } };
const E0 = computeEstate();
const E1 = computeEstate(SEED);
const g = C.fmtGBPCompact;
const top = E0.ranked.find((f) => f.type === 'overCap');
const topCap = E0.derived[top.contractId].cap;
const topClause = evidenceFor(top);
const topDoc = E0.data.documents[E0.contractsById[top.contractId].documentId];

const SECTIONS = [
  ['start', 'Start here'], ['tour', 'The five-minute tour'], ['screens', 'Screens at a glance'], ['try', 'Try these'], ['numbers', 'How to read the numbers'],
  ['real', 'What is real and what is not'], ['glossary', 'Words you will see'], ['keys', 'Keyboard and links'], ['faq', 'Questions people ask'],
];
const EMOJI = /\p{Extended_Pictographic}/u;
const PROPER = new Set(['Kontor', 'Stage', 'Marchbank', 'Borough', 'Council', 'Find', 'Tender', 'Contracts', 'Finder', 'Transparency', 'Code', 'Local', 'Government', 'Needs', 'Explained']);
const sentenceCase = (t) => {
  const bad = t.replace(/"[^"]*"/g, '').replace(/[:.,?]/g, '').split(/\s+/).slice(1).filter((w) => /^[A-Z][a-z]/.test(w) && !PROPER.has(w));
  if (bad.length) throw new Error(`not sentence case: "${t}" (${bad.join(', ')})`);
};
const VERB_OBJECT = /^(Open|Read|See|Switch|Reset|Show|Close|Give)\b/;

const dist = process.env.KONTOR_DIST || null;
const h = await launch({ dist });
const pages = [];
const fresh = async (opts = {}) => { const t = await h.newPage({ theme: 'dark', ...opts }); pages.push(t); return t; };
const seed = async (t, patch) => {                                   // write the persisted state the app reads on load, then reload
  await t.page.evaluate((s) => {
    localStorage.setItem('kontor-triage', JSON.stringify(s.triage));
    localStorage.setItem('kontor-matches', JSON.stringify(s.decisions));
    localStorage.setItem('kontor-assumptions', JSON.stringify(s.assumptions));
  }, patch);
};

try {
  /* ============================================================ the route */
  const t1 = await fresh({ hangExternal: true });
  await visit(t1, '#/guide');
  const p = t1.page;

  await check('route: title "Guide | Kontor financial layer", exactly one h1 "Guide" inside main, no rail item highlighted, Overview is not the title', async () => {
    eq(await p.title(), 'Guide | Kontor financial layer', 'title');
    eq(await p.locator('h1').count(), 1, 'h1 in the whole document');
    eq(await p.locator('#shell-main h1').count(), 1, 'h1 in main');
    eq(await text(p.locator('#shell-main h1')), 'Guide', 'h1 text');
    eq(await p.locator('nav[aria-label="Primary"] [aria-current="page"]').count(), 0, 'rail highlights nothing');
    eq(await p.locator('nav[aria-label="Primary"] li').count(), 6, 'rail still has six items');
    eq(await p.locator('#shell-main h2').count(), SECTIONS.length, 'nine section headings');
  });

  await check('heading order: h1 then h2, h3 and h4 never skip a level; one landmark main; the contents nav is named', async () => {
    const levels = await p.$$eval('#shell-main h1, #shell-main h2, #shell-main h3, #shell-main h4, #shell-main h5', (hs) => hs.map((x) => +x.tagName[1]));
    levels.forEach((l, i) => { if (i > 0) ok(l <= levels[i - 1] + 1, `heading level jumps from h${levels[i - 1]} to h${l} at #${i}`); });
    eq(levels[0], 1, 'first heading is the h1');
    eq(await p.locator('nav[aria-label="On this page"]').count(), 1, 'contents nav');
    eq(await p.locator('main').count(), 1, 'one main');
  });

  /* ============================================================ the header Guide tab */
  await check('header: a Guide tab (link, book icon) sits with Apps and Chat; on the Overview it is idle and the Kontor app tab is the active one', async () => {
    await go(p, '#/overview');
    const tab = p.locator('.shell__tabs a.shell__tab');
    eq(await tab.count(), 1, 'one link tab');
    eq(await text(tab), 'Guide', 'label');
    eq(await tab.getAttribute('href'), '#/guide', 'href');
    ok(await tab.locator('i.fa-book-open').count() === 1, 'fa-book-open icon');
    eq(await tab.getAttribute('aria-current'), null, 'idle: no aria-current');
    eq(await tab.evaluate((e) => e.classList.contains('is-active')), false, 'idle: no active class');
    eq(await p.locator('.shell__tabs .shell__tab').allInnerTexts(), ['Apps', 'Chat', 'Guide'], 'tab order');
    eq(await p.locator('.shell__apptab-name').getAttribute('aria-current'), 'page', 'app tab is current on the Overview');
    eq(await p.locator('.shell__apptab-rule').count(), 1, 'one underline: the app tab');
  });

  await check('header: selecting Guide goes to #/guide; the tab is current with the accent underline, the app tab steps back (a link to the Overview, no underline), the rail highlights nothing', async () => {
    await p.locator('.shell__tabs a.shell__tab').click();
    await p.waitForFunction(() => location.hash === '#/guide');
    await h1Is(p, 'Guide');
    const tab = p.locator('.shell__tabs a.shell__tab');
    eq(await tab.getAttribute('aria-current'), 'page', 'aria-current');
    eq(await p.locator('.shell__tab.is-active .shell__apptab-rule').count(), 1, 'underline inside the Guide tab');
    eq(await p.locator('.shell__apptab-rule').count(), 1, 'only one underline on the page');
    const colours = await p.evaluate(() => {
      const probe = document.createElement('i'); probe.style.background = 'var(--accent)'; document.body.appendChild(probe);
      const accent = getComputedStyle(probe).backgroundColor; probe.remove();
      const rule = document.querySelector('.shell__tab.is-active .shell__apptab-rule');
      const r = rule.getBoundingClientRect(); const tb = document.querySelector('.shell__tab.is-active').getBoundingClientRect();
      return { accent, rule: getComputedStyle(rule).backgroundColor, h: r.height, w: r.width, tab: tb.width, bottom: Math.round(r.bottom) };
    });
    eq(colours.rule, colours.accent, 'underline colour is the accent');
    ok(colours.h >= 2 && colours.w > 40, 'underline is drawn: ' + JSON.stringify(colours));
    eq(await p.locator('.shell__apptab-name').getAttribute('aria-current'), null, 'app tab is not current');
    eq(await p.locator('a.shell__apptab-name').getAttribute('href'), '#/overview', 'app tab links to the overview');
    eq(await p.locator('nav[aria-label="Primary"] [aria-current="page"]').count(), 0, 'rail highlights nothing');
    ok(await p.locator('.sample-banner').isVisible(), 'sample banner still shown');
  });

  await check('header: the rail still works from the Guide: Overview returns to a Kontor screen (rail current, app tab current again, Guide idle)', async () => {
    await p.locator('nav[aria-label="Primary"] button[aria-label="Overview"]').click();
    await p.waitForFunction(() => location.hash === '#/overview');
    await h1Is(p, C.headlineSentence(E0.totals));
    eq(await p.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label'), 'Overview', 'rail');
    eq(await p.locator('.shell__tabs a.shell__tab').getAttribute('aria-current'), null, 'Guide idle');
    eq(await p.locator('.shell__apptab-name').getAttribute('aria-current'), 'page', 'app tab current');
    eq(await p.locator('.shell__tabs .shell__apptab-rule').count(), 1, 'underline is back on the app tab');
    await p.locator('.shell__tabs a.shell__tab').click();
    await p.waitForFunction(() => location.hash === '#/guide');
    await p.locator('nav[aria-label="Primary"] button[aria-label="Renewal radar"]').click();
    await h1Is(p, 'Renewal radar');
    eq(await p.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label'), 'Renewal radar', 'rail from the Guide to Renewal radar');
  });

  await check('header: the idle app tab is a link back to the overview; Apps and Chat still show the "not part of this prototype" message and do not navigate', async () => {
    await go(p, '#/guide');
    await p.locator('a.shell__apptab-name').click();
    await p.waitForFunction(() => location.hash === '#/overview');
    for (const name of ['Apps', 'Chat']) {
      const before = await hashOf(p);
      await p.locator(`button.shell__tab:has-text("${name}")`).click();
      await p.locator('.kx-toast').first().waitFor();
      has(await toastText(p), `${name} isn't part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo.`, 'toast');
      eq(await hashOf(p), before, `${name} does not navigate`);
      eq(await p.locator('.shell__tabs a.shell__tab').getAttribute('aria-current'), null, 'Guide stays idle');
      await p.locator('.kx-toast__close').first().click().catch(() => {});
    }
  });

  /* ============================================================ sections reachable by ?s= */
  await check('?s=<id>: all nine sections scroll into view and the heading takes focus, on a full load', async () => {
    for (const [id, title] of SECTIONS) {
      await visit(t1, `#/guide?s=${id}`);
      await p.waitForFunction((i) => document.activeElement && document.activeElement.id === i, id, { timeout: 4000 }).catch(() => {});
      const a = await active(p);
      eq(a.id, id, `focus on ${id}`);
      eq(a.tag, 'H2', `${id} is an h2`);
      eq(norm(a.label), title, `${id} title`);
      const vis = await p.evaluate((i) => { const m = document.getElementById('shell-main').getBoundingClientRect(); const r = document.getElementById(i).getBoundingClientRect(); return r.top >= m.top - 1 && r.bottom <= m.bottom + 1; }, id);
      ok(vis, `${id} heading is on screen`);
    }
  });

  await check('?s=<id>: in-app navigation (no reload) scrolls and focuses too, and the contents list marks the section', async () => {
    await visit(t1, '#/guide');
    for (const [id, title] of SECTIONS) {
      await go(p, `#/guide?s=${id}`);
      await p.waitForFunction((i) => document.activeElement && document.activeElement.id === i, id, { timeout: 4000 }).catch(() => {});
      eq((await active(p)).id, id, `focus on ${id}`);
      await p.waitForFunction((t) => { const a = document.querySelector('.gd-toc__list a[aria-current="location"]'); return a && a.textContent.replace(/\s+/g, ' ').trim() === t; }, title, { timeout: 4000 }).catch(() => {});
      eq(norm(await p.locator('.gd-toc__list a[aria-current="location"]').innerText()), title, `contents marks ${id}`);
    }
  });

  await check('?s=: an unknown section is ignored (the page opens at the top); the contents links write ?s= and focus the heading; a second click on the same link still scrolls', async () => {
    await visit(t1, '#/guide?s=nope');
    eq(await p.evaluate(() => document.getElementById('shell-main').scrollTop), 0, 'top');
    const links = p.locator('.gd-toc__list a');
    eq(await links.count(), 9, 'nine contents links');
    for (let i = 0; i < 9; i += 1) {
      await links.nth(i).click();
      await p.waitForFunction((id) => document.activeElement && document.activeElement.id === id, SECTIONS[i][0], { timeout: 4000 });
      eq(await hashOf(p), `#/guide?s=${SECTIONS[i][0]}`, 'hash');
    }
    await p.evaluate(() => { document.getElementById('shell-main').scrollTop = 0; });
    await links.nth(8).click();
    await settle(p, 500);
    ok(await p.evaluate(() => document.getElementById('shell-main').scrollTop) > 2000, 'second click scrolled back down');
  });

  await check('contents list while reading: scrolling marks the section being read (aria-current location)', async () => {
    await visit(t1, '#/guide');
    await p.evaluate(() => { const m = document.getElementById('shell-main'); m.scrollTo({ top: document.getElementById('numbers').getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - 40 }); });
    await settle(p, 300);
    eq(norm(await p.locator('.gd-toc__list a[aria-current="location"]').innerText()), 'How to read the numbers', 'numbers marked');
  });

  /* ============================================================ live numbers: starting values */
  await check('start: the two-sentence lead, the sample-data note, four live tiles, three steps and ONE primary button "Open the overview" that goes to the Overview', async () => {
    await visit(t1, '#/guide');
    const s = await sec(p, 'start');
    has(s, "This is Stage 1 of the Kontor financial layer. It reads one council's contracts and spend and flags opportunities to investigate.", 'lead');
    has(s, 'Marchbank Borough Council, its suppliers, contracts and payments are fictional', 'sample note');
    for (const [label, value] of [['Contracts', String(E0.data.contracts.length)], ['Payments', E0.data.payments.length.toLocaleString('en-GB')], ['Answers', String(E0.data.extractions.length)], ['Contracts flagged', String(E0.totals.contractCount)]]) has(s, `${label} ${value}`, 'tile');
    eq(await p.locator('section[aria-labelledby="start"] .gd-begin__item').count(), 3, 'three numbered steps');
    has(s, `It reads ${C.headlineSentence(E0.totals)}.`, 'step 1 headline');
    has(s, `page ${topClause.page}`, 'step 2 page');
    const primary = await p.evaluate(() => {
      const probe = document.createElement('i'); probe.style.background = 'var(--accent)'; document.body.appendChild(probe);
      const accent = getComputedStyle(probe).backgroundColor; probe.remove();
      return [...document.querySelectorAll('#shell-main button')].filter((b) => getComputedStyle(b).backgroundColor === accent).map((b) => b.textContent.trim());
    });
    eq(primary, ['Open the overview'], 'primary buttons on the page');
    await p.getByRole('button', { name: 'Open the overview' }).click();
    await p.waitForFunction(() => location.hash === '#/overview');
    await h1Is(p, C.headlineSentence(E0.totals));
  });

  await check('golden numbers at the defaults: £6.1m across 15 contracts, the sum line, £8.4m against £5.0m, Clause 14.3 page 23 of 70, 3 need attention, £6.1m to £2.8m, £6.2m after the match, £6.8m at 8%', async () => {
    await visit(t1, '#/guide');
    const all = await text(p.locator('#shell-main'));
    for (const lit of [
      '£6.1m across 15 contracts flagged as opportunities to investigate',
      '£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238',
      '£8.4m paid against a £5.0m maximum', 'Clause 14.3, page 23 of 70', '3 contracts need attention now', 'Next 3 months: 3 contracts, £6.9m a year',
      'falls from £6.1m to £2.8m', '£3,350,000 excluded after your review',
      'Grounds maintenance moves from 89.1% of its cap (Close to cap) to 102.7% (Over cap)', 'The headline moves from £6.1m to £6.2m',
      'The renewals card moves from £1.1m to £1.7m, and the headline from £6.1m to £6.8m', '0 of 336 answers checked by hand',
      'the headline is back to £6.1m',
    ]) has(all, lit, 'golden');
  });

  await check('tour: four step cards, each with the route, what to do, what to say, the expected number computed from the engine, and an Open step link; step 3 also has View clause, page 23', async () => {
    const cards = p.locator('section[aria-labelledby="tour"] .gd-step');
    eq(await cards.count(), 4, 'four cards');
    const t = await sec(p, 'tour');
    has(t, C.headlineSentence(E0.totals), 'step 1'); has(t, C.sumLine(E0.totals), 'sum line');
    has(t, `${E0.radar.attention.length} contracts need attention now`, 'step 2 attention'); has(t, C.radarSummaryLine('m3', E0.radar.groups.m3), 'step 2 band');
    has(t, `${g(topCap.spendAgainstCap)} paid against a ${g(topCap.capGBP)} maximum`, 'step 3 numbers'); has(t, `${topClause.clauseRef}, page ${topClause.page} of ${topDoc.pageCount}`, 'step 3 clause');
    has(t, C.COPY.closePanel.heading, 'step 4 close line'); has(t, C.COPY.closePanel.spoken, 'step 4 spoken');
    has(t, 'The numbers below are live', 'live note'); has(t, 'move if you change a review status, confirm a supplier match or change an assumption', 'live note text');
    has(t, 'Showing the starting numbers', 'starting pill');
    const hrefs = await cards.evaluateAll((els) => els.map((e) => [...e.querySelectorAll('a')].map((a) => a.getAttribute('href'))));
    eq(hrefs[0], ['#/overview'], 'step 1 link'); eq(hrefs[1], ['#/renewals'], 'step 2 link');
    eq(hrefs[2], [`#/opportunities?flag=${top.id}`, `#/source/${topClause.contractId}/${topClause.extractionId}?from=opportunities`], 'step 3 links');
    eq(hrefs[3], ['#/overview'], 'step 4 link');
    for (let i = 0; i < 4; i += 1) {
      const where = await cards.nth(i).locator('.gd-code').innerText();
      ok(where.startsWith('#/'), 'route chip ' + where);
      ok((await cards.nth(i).locator('a').first().innerText()).trim().startsWith('Open step'), 'Open step label');
    }
  });

  await check('screens: nine cards, each with an icon, what it answers, who uses it and a link; Cap vs spend lists its three tabs; links point at real screens', async () => {
    const cards = p.locator('section[aria-labelledby="screens"] .gd-screen');
    eq(await cards.count(), 9, 'nine cards');
    eq(await cards.locator('h3').allInnerTexts(), ['Overview', 'Opportunities', 'Renewal radar', 'Cap vs spend', 'Contracts and contract detail', 'Source viewer', 'How this is calculated', 'Roadmap', 'Why this matters'], 'titles');
    eq(await cards.locator('.gd-screen__icon i').count(), 9, 'icons');
    eq(await cards.locator('dt', { hasText: 'Answers' }).count(), 9, 'answers');
    eq(await cards.locator('dt', { hasText: 'Who uses it' }).count(), 9, 'who');
    const cap = await cards.nth(3).locator('a').evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    eq(cap, [['Open cap vs spend', '#/spend'], ['Open supplier matches', '#/spend/matches'], ['See spend with no contract', '#/spend/no-contract']], 'cap vs spend tabs');
    const hrefs = await cards.evaluateAll((els) => els.map((e) => [...e.querySelectorAll('a')].map((a) => a.getAttribute('href'))));
    eq(hrefs[5], [`#/source/${topClause.contractId}/${topClause.extractionId}?from=opportunities`], 'source viewer link');
    has(await text(cards.nth(5)), 'Open clause 14.3, page 23', 'source link label');
  });

  await check('numbers: the four cards equal the engine (value, count, basis) and the sum line equals the headline; confidence, notice window and cap states are explained with live counts', async () => {
    const n = await sec(p, 'numbers');
    for (const c of C.breakdownCards(E0.totals)) { has(n, c.value, 'card value ' + c.title); has(n, c.sub, 'card basis ' + c.title); has(n, c.title, 'card title'); }
    has(n, C.sumLine(E0.totals), 'sum line');
    has(n.toLowerCase(), 'the four cards add up to the headline', 'sum label');
    has(n, C.COPY.caveat.long, 'caveat'); has(n, C.COPY.caveat.tooltip, 'what indicative means');
    has(n, 'Opportunities to investigate, not savings', 'warning callout title');
    for (const w of ['High', 'Medium', 'Needs review', 'Over cap', 'Close to cap', 'Within cap', 'Above contract value (estimate)']) has(n, w, 'pill ' + w);
    has(n, 'In this sample: 3 over cap, 3 close to cap and 18 within cap.', 'cap counts');
    has(n, `Spend is from ${C.fmtPct(E0.opts.nearCapThreshold, 0)} of the cap up to 100%.`, 'near cap threshold');
    has(n, `${E0.ranked.filter((f) => f.confidence === 'low').length} of ${E0.ranked.length} flags need review.`, 'flags to review');
    has(n, 'The notice window is the time before a contract ends when you must tell the supplier what you want.', 'notice window');
    has(n, 'The notice deadline is the last day to do it.', 'notice deadline');
    eq(await p.locator('section[aria-labelledby="numbers"] [data-basis]').count(), 4, 'four basis cards');
    eq(await p.locator('section[aria-labelledby="numbers"] .gd-callout').count(), 2, 'two callouts (warning, info)');
    eq(await p.locator('.gd-callout--warning').count(), 1, 'one warning callout');
  });

  await check('real: three columns (real, made up, not built); fictional council, illustrative text, payment rows without a column-fidelity claim, evidence count, roadmap items; no ingestion promise', async () => {
    const r = await sec(p, 'real');
    for (const t of ['Real', 'Made up for the demo', 'Not built yet']) has(r, t, 'column');
    has(r, 'Marchbank Borough Council, its suppliers, contracts and payments are fictional', 'fictional');
    has(r, 'illustrative text written for this demo, not a real document', 'illustrative');
    has(r, 'look like the files councils publish for payments over £500: date, department, supplier, purpose and amount', 'payments like the published files');
    ok(!/transparency code columns|matches the (transparency|published) (code )?columns|same columns/i.test(r), 'no claim of column fidelity');
    has(r, '9 public cases', 'evidence count');
    has(r, 'This prototype starts after document ingestion', 'ingestion');
    has(r.toLowerCase(), 'cross-council comparison', 'stage 2 item');
    has(r.toLowerCase(), 'aggregation finder and framework fit', 'not yet item');
    ok(!/will (soon )?(support|ingest|read|import)/i.test(r), 'no promise of ingestion');
    const hrefs = await p.locator('section[aria-labelledby="real"] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const x of ['#/method', '#/evidence', '#/roadmap']) ok(hrefs.some((hh) => hh.startsWith(x)), 'link ' + x);
  });

  await check('glossary: a definition list with all fourteen terms, each one or two short sentences', async () => {
    const terms = await p.locator('section[aria-labelledby="glossary"] dl dt').allInnerTexts();
    eq(terms.length, 14, 'term count');
    for (const t of ['contract cap or maximum value', 'notice period', 'auto-renewal', 'extension option', 'indexation', 'uplift', 'service credits', 'termination for convenience', 'exit fee', 'transparency code spend file', 'find a tender', 'contracts finder', 'framework', 'buying group']) {
      ok(terms.some((x) => x.trim().toLowerCase() === t), 'term ' + t);
    }
    const defs = await p.locator('section[aria-labelledby="glossary"] dl dd').allInnerTexts();
    defs.forEach((d) => { const n = d.split(/(?<=\.)\s+/).filter(Boolean).length; ok(n >= 1 && n <= 2, `definition has ${n} sentences: ${d}`); });
  });

  await check('keys: Tab order, skip link, Escape, arrow keys, the shareable address patterns (each example opens a real address) and what Back does', async () => {
    const k = await sec(p, 'keys');
    for (const t of ['Tab', 'Esc', 'Skip to content', 'Up', 'Down', 'Home', 'End', 'Left', 'Right', 'What the back button does', 'Addresses you can share']) has(k, t, 'keys');
    eq(await p.locator('section[aria-labelledby="keys"] kbd').count() >= 10, true, 'kbd elements');
    const patterns = await p.locator('section[aria-labelledby="keys"] .gd-addr .gd-code').allInnerTexts();
    eq(patterns.length, 10, 'ten patterns');
    for (const x of ['#/opportunities?type=<type>', '#/<screen>?flag=<flag id>', '#/spend?payments=<contract id>', '#/spend/matches?status=<status>', '#/source/<contract id>/<answer id>', '#/method?s=<section>', '#/guide?s=<section>']) ok(patterns.includes(x), 'pattern ' + x);
  });

  await check('faq: six questions as details; the headline question names the live headline; each opens with the click and with Enter; the own-data answer is honest', async () => {
    const qs = p.locator('section[aria-labelledby="faq"] details.gd-q');
    eq(await qs.count(), 6, 'six questions');
    const sums = await qs.locator('summary').allInnerTexts();
    eq(sums.map(norm), [`Why is the headline ${g(E0.totals.totalGBP)} and not a bigger number?`, 'Why do some contracts show "At least"?', 'Why does confirming a match change the headline?', 'Can I use my own data?', 'What does "Needs review" mean?', 'What is not covered yet?'], 'questions');
    for (let i = 0; i < 6; i += 1) {
      await qs.nth(i).locator('summary').click();
      ok(await qs.nth(i).evaluate((d) => d.open), 'opened by click ' + i);
      await qs.nth(i).locator('summary').click();
      ok(!(await qs.nth(i).evaluate((d) => d.open)), 'closed by click ' + i);
    }
    await qs.nth(0).locator('summary').focus(); await p.keyboard.press('Enter');
    ok(await qs.nth(0).evaluate((d) => d.open), 'opened by Enter');
    const a1 = await text(qs.nth(0));
    has(a1, C.headlineShareText(E0.totals, E0.coverage), 'headline share'); has(a1, C.fmtGBP(E0.coverage.noContractGBP), 'no-contract spend');
    await qs.nth(1).locator('summary').click(); has(await text(qs.nth(1)), 'Spend files start on 1 April 2022, so spend before that date is not counted. Utilisation may be higher.', 'at least'); has(await text(qs.nth(1)), 'In this sample, 3 contracts started before then', 'at least count');
    await qs.nth(2).locator('summary').click(); has(await text(qs.nth(2)), 'Suggested and unmatched payments are not counted until you confirm them.', 'matching rule'); has(await text(qs.nth(2)), 'from £6.1m to £6.2m', 'confirm moves the headline');
    await qs.nth(3).locator('summary').click();
    const own = await text(qs.nth(3));
    has(own, 'Not today. There is no upload and no import in this prototype.', 'own data'); has(own, `${E0.data.contracts.length} contracts`, 'contracts'); has(own, '336 extracted answers', 'answers'); has(own, '1,264 payments', 'payments');
    has(own, 'That has not been tried with real data.', 'honest'); has(own, 'is still being tested', 'ingestion open');
    ok(!/will (soon )?(support|ingest|read|import|accept)|coming soon|you can upload/i.test(own), 'no promise of ingestion');
    await qs.nth(4).locator('summary').click(); has(await text(qs.nth(4)), `${E0.ranked.filter((f) => f.confidence === 'low').length} flag of ${E0.ranked.length} needs review`, 'needs review count');
    await qs.nth(5).locator('summary').click(); has(await text(qs.nth(5)), 'This prototype starts after document ingestion', 'not covered');
  });

  /* ============================================================ numbers move after changes */
  await check('after a review, a confirmed match and a new renewal rate the page follows the engine: headline, pill, starting value, Try rows, FAQ question, cap counts', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/guide');
    await seed(t, SEED);
    await visit(t, '#/guide');
    const q = t.page;
    const tour = await sec(q, 'tour');
    has(tour, C.headlineSentence(E1.totals), 'headline after changes'); has(tour, C.sumLine(E1.totals), 'sum after changes');
    has(tour, 'Showing your changes', 'pill'); has(tour, `Starting value ${g(E0.totals.totalGBP)}`, 'starting note');
    ok(!tour.includes('Showing the starting numbers'), 'starting pill is gone');
    ok(E1.totals.totalGBP !== E0.totals.totalGBP, 'the seeded changes move the headline');
    const tr = await sec(q, 'try');
    has(tr, 'You have marked this flag as Explained.', 'explain row'); has(tr, `The headline moves from ${g(E1.totals.totalGBP)} to`, 'explain row numbers');
    has(tr, 'You have confirmed this match.', 'match row'); has(tr, 'Changed on this device: 1 review, 1 match decision, 1 assumption.', 'changes line');
    has(tr, 'Open Settings and choose 3% for the renewal rate. It is 8% now.', 'rate row flips to 3%');
    const num = await sec(q, 'numbers');
    for (const c of C.breakdownCards(E1.totals)) has(num, c.value, 'card ' + c.title);
    has(num, C.sumLine(E1.totals), 'sum line');
    has(num, `${C.fmtPct(E1.opts.renewalRate, 0)} of its annual value`, 'renewal rate in the basis text');
    has(num, C.excludedNote(E1.totals), 'excluded note');
    const e1caps = { over: 0, near: 0, ok: 0 };
    for (const r of E1.capRows) { if (r.capState === 'over' || r.capState === 'above_estimate') e1caps.over += 1; else if (r.capState === 'near') e1caps.near += 1; else e1caps.ok += 1; }
    has(num, `In this sample: ${e1caps.over} over cap, ${e1caps.near} close to cap and ${e1caps.ok} within cap.`, 'cap counts follow the match');
    has(await text(q.locator('section[aria-labelledby="faq"] details').first().locator('summary')), `Why is the headline ${g(E1.totals.totalGBP)} and not a bigger number?`, 'FAQ follows');
    eq(await t.errors.length, 0, 'errors: ' + t.errors.join(' | '));
  });

  await check('a change made in the app moves the Guide (no reload): mark the highways flag Explained in its drawer, come back to the Guide, the headline is £2.8m', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, `#/opportunities?flag=${top.id}`);
    await t.page.getByLabel('Review status').selectOption('explained');
    await settle(t.page, 300);
    await t.page.keyboard.press('Escape');
    await go(t.page, '#/guide');
    const tour = await sec(t.page, 'tour');
    has(tour, '£2.8m across 15 contracts flagged as opportunities to investigate', 'headline after the review'); has(tour, 'Showing your changes', 'pill'); has(tour, 'Starting value £6.1m', 'starting note');
  });

  /* ============================================================ the Try actions */
  await check('try: seven hands-on rows, each with an action; no primary button among them', async () => {
    await visit(t1, '#/guide');
    const rows = p.locator('section[aria-labelledby="try"] .gd-try');
    eq(await rows.count(), 7, 'seven rows');
    eq(await rows.locator('h3').allInnerTexts(), ['Switch between dark and light', 'Mark a flag as Explained', 'Confirm a suggested supplier match', 'Change the renewal rate', 'Check an answer by hand', 'Share a link', 'Reset your changes'], 'titles');
    eq(await rows.locator('.gd-expect').count(), 7, 'every row says what you should see');
    const acts = await rows.locator('.gd-try__action').evaluateAll((els) => els.map((e) => [...e.querySelectorAll('a,button')].map((x) => [x.tagName, x.textContent.trim(), x.getAttribute('href')])));
    eq(acts.map((a) => a[0][1]), ['Switch to light mode', 'Open the top spend over cap flag', 'Open supplier matches', 'Open settings', 'Open clause 14.3, page 23', 'Open spend over cap', 'Reset demo data'], 'actions');
    eq(acts[1][0][2], `#/opportunities?flag=${top.id}`, 'explain link'); eq(acts[2][0][2], '#/spend/matches', 'matches link'); eq(acts[5][0][2], '#/opportunities?type=overCap', 'share link');
    has(await sec(p, 'try'), 'Open the top spend over cap flag. In the panel, set Review status to Explained.', 'explain steps');
  });

  await check('try: Switch to light mode flips the theme at once and the label flips; the default is dark', async () => {
    const t = await fresh({ theme: null, hangExternal: true });
    await visit(t, '#/guide');
    eq(await t.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'default dark');
    await t.page.getByRole('button', { name: 'Switch to light mode' }).click();
    eq(await t.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'light');
    await t.page.getByRole('button', { name: 'Switch to dark mode' }).waitFor();
    has(await sec(t.page, 'try'), 'It is in light mode now.', 'state text');
    await t.page.getByRole('button', { name: 'Switch to dark mode' }).click();
    eq(await t.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'back to dark');
  });

  await check('try: Open settings opens the Settings drawer (focus returns to the button on Escape); the Try links open the flag drawer, the matches tab, the clause and the filtered list', async () => {
    await visit(t1, '#/guide?s=try');
    const btn = p.getByRole('button', { name: 'Open settings' });
    await btn.click();
    await dialog(p, 'Settings').waitFor();
    await p.keyboard.press('Escape'); await settle(p, 300);
    eq(await dialog(p, 'Settings').count(), 0, 'closed');
    eq((await active(p)).label, 'Open settings', 'focus back on the opener');
    await p.getByRole('link', { name: 'Open the top spend over cap flag' }).click();
    await p.waitForFunction((id) => location.hash === `#/opportunities?flag=${id}`, top.id);
    await p.locator('[role="dialog"]').first().waitFor();
    has(await text(p.locator('[role="dialog"]').first()), 'Review status', 'the drawer has the control the Guide names');
    await p.keyboard.press('Escape');
    await go(p, '#/guide');
    await p.getByRole('link', { name: 'Open supplier matches' }).first().click();
    await p.waitForFunction(() => location.hash.startsWith('#/spend/matches'));
    has(await text(p.locator('#shell-main')), 'Larchmont Grounds Maintenance', 'the payee the Guide names is on the matches tab');
    await go(p, '#/guide');
    await p.getByRole('link', { name: 'Open clause 14.3, page 23' }).first().click();
    await h1Is(p, 'Clause 14.3');
    await go(p, '#/guide');
    await p.getByRole('link', { name: 'Open spend over cap' }).click();
    await h1Is(p, 'Opportunities to investigate');
    ok((await hashOf(p)).includes('type=overCap'), 'filtered list');
  });

  await check('try: Reset demo data with nothing to reset says so; with changes it asks first (Cancel focused, Escape changes nothing), then clears the changes and toasts', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/guide?s=try');
    const q = t.page;
    await q.locator('#shell-main').getByRole('button', { name: 'Reset demo data' }).click();
    await q.locator('.kx-toast').first().waitFor();
    has(await toastText(q), 'Nothing to reset.', 'nothing to reset');
    await seed(t, SEED);
    await visit(t, '#/guide?s=try');
    await q.locator('#shell-main').getByRole('button', { name: 'Reset demo data' }).click();
    const dlg = q.getByRole('alertdialog');
    await dlg.waitFor();
    has(await text(dlg), 'Reset demo data?', 'title');
    eq((await active(q)).label, 'Cancel', 'Cancel is focused first');
    await q.keyboard.press('Escape'); await settle(q, 300);
    eq(await q.getByRole('alertdialog').count(), 0, 'closed');
    eq(await q.evaluate(() => localStorage.getItem('kontor-triage')), JSON.stringify(SEED.triage), 'Escape changed nothing');
    await q.locator('#shell-main').getByRole('button', { name: 'Reset demo data' }).click();
    await q.getByRole('alertdialog').waitFor();
    await q.getByRole('alertdialog').getByRole('button', { name: 'Reset demo data' }).click();
    await q.locator('.kx-toast', { hasText: 'Demo data reset.' }).waitFor();
    has(await toastText(q), 'The demo is back to its starting numbers.', 'toast');
    const left = await q.evaluate(() => ['kontor-triage', 'kontor-matches', 'kontor-assumptions'].map((k) => localStorage.getItem(k)));
    ok(left.every((x) => x === null || x === '{}' || x === '[]'), 'storage cleared: ' + JSON.stringify(left));
    has(await sec(q, 'tour'), 'Showing the starting numbers', 'pill back');
    has(await sec(q, 'try'), 'Nothing has been changed yet.', 'status line');
  });

  /* ============================================================ every link resolves */
  await check('every link on the page resolves: each #/ address opens a real screen (not "Page not found"), flag links open the drawer, source links land on the clause, no external links', async () => {
    await visit(t1, '#/guide');
    const hrefs = [...new Set(await p.locator('#shell-main a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href'))))];
    ok(hrefs.length >= 30, 'link count ' + hrefs.length);
    ok(hrefs.every((x) => x.startsWith('#/')), 'external links: ' + hrefs.filter((x) => !x.startsWith('#/')).join(', '));
    const bad = [];
    for (const href of hrefs) {
      await go(p, href);
      await settle(p, 120);
      const info = await p.evaluate(() => ({ h1: (document.querySelector('#shell-main h1') || {}).textContent || '', title: document.title, dialogs: document.querySelectorAll('[role="dialog"]').length }));
      if (/^Page not found/.test(info.title) || /Page not found|isn't in the sample|Contract not found/.test(info.h1)) bad.push(`${href} -> ${info.h1} | ${info.title}`);
      if (/flag=/.test(href) && info.dialogs !== 1) bad.push(`${href} did not open the flag drawer`);
      if (info.dialogs) { await p.keyboard.press('Escape'); await settle(p, 150); }
      const m = href.match(/\?s=([a-z-]+)/);
      if (m && /^#\/(method|guide)/.test(href)) { const id = await p.evaluate(() => document.activeElement && document.activeElement.id); if (id !== m[1]) bad.push(`${href} did not focus the section (focus on "${id}")`); }
    }
    eq(bad, [], 'broken links');
  });

  /* ============================================================ Menu and Demo guide */
  await check('Menu: the rail Menu lists Guide (a link to #/guide, with the other five unchanged); choosing it opens the Guide and the h1 takes focus', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/overview');
    const q = t.page;
    await q.locator('.shell__rail-menu').click();
    const items = q.locator('nav[aria-label="Menu"] [role="menuitem"]');
    await items.first().waitFor();
    eq((await items.allInnerTexts()).map(norm), ['Why this matters', 'How this is calculated', 'About this data', 'Guide', 'Demo guide', 'Give feedback'], 'items');
    eq(await items.evaluateAll((els) => els.map((e) => e.getAttribute('href'))), ['#/evidence', '#/method', null, '#/guide', null, null], 'hrefs');
    await q.getByRole('menuitem', { name: 'Guide', exact: true }).click();
    await q.waitForFunction(() => location.hash === '#/guide');
    await h1Is(q, 'Guide');
    await settle(q, 300);
    eq((await active(q)).tag, 'H1', 'focus on the h1');
    eq(await q.locator('.shell__tabs a.shell__tab').getAttribute('aria-current'), 'page', 'Guide tab is current');
  });

  await check('Demo guide: the drawer has "Open the full guide" (a link to #/guide); following it closes the drawer and opens the Guide', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/overview');
    const q = t.page;
    await q.getByRole('button', { name: 'Open demo guide' }).click();
    const d = dialog(q, 'Demo guide');
    await d.waitFor();
    const link = d.getByRole('link', { name: 'Open the full guide' });
    eq(await link.getAttribute('href'), '#/guide', 'href');
    await link.click();
    await q.waitForFunction(() => location.hash === '#/guide');
    await settle(q, 400);
    eq(await dialog(q, 'Demo guide').count(), 0, 'drawer closed');
    await h1Is(q, 'Guide');
  });

  /* ============================================================ phone, tablet, laptop */
  await check('phone 390x844: the header tabs collapse but the Guide stays reachable (Menu, Demo guide), the contents list is a select, no sideways scroll', async () => {
    const t = await fresh({ viewport: VIEWPORTS.phone, hangExternal: true });
    await visit(t, '#/overview');
    const q = t.page;
    eq(await q.locator('.shell__tab').evaluateAll((els) => els.filter((e) => e.getClientRects().length > 0).length), 0, 'header tabs hidden on a phone');
    await q.locator('.shell__slot--phone-only button[aria-label="Menu"]').click();
    await q.getByRole('menuitem', { name: 'Guide', exact: true }).waitFor();
    await q.getByRole('menuitem', { name: 'Guide', exact: true }).click();
    await q.waitForFunction(() => location.hash === '#/guide');
    await h1Is(q, 'Guide');
    eq(await q.locator('.gd-toc__list').isVisible(), false, 'inline list hidden');
    const sel = q.getByLabel('Jump to a section');
    ok(await sel.isVisible(), 'select visible');
    eq(await sel.locator('option').count(), 9, 'nine options');
    await sel.selectOption('faq');
    await q.waitForFunction(() => location.hash === '#/guide?s=faq');
    await q.waitForFunction(() => document.activeElement && document.activeElement.id === 'faq', null, { timeout: 4000 });
    for (const id of ['start', 'tour', 'try', 'numbers', 'keys']) { await go(q, `#/guide?s=${id}`); const o = await noOverflow(q); ok(o.doc <= 0 && o.main <= 0, `${id}: sideways scroll ${JSON.stringify(o)}`); }
    await go(q, '#/overview');
    await q.getByRole('button', { name: 'Open demo guide' }).click();
    await dialog(q, 'Demo guide').waitFor();
    ok(await dialog(q, 'Demo guide').getByRole('link', { name: 'Open the full guide' }).isVisible(), 'Open the full guide on a phone');
  });

  await check('tablet 1024x768: the contents list is an inline list of nine links (no select); laptop 1366x768 and desktop keep the sticky list', async () => {
    for (const [name, vp, inline] of [['1024', VIEWPORTS.tablet, true], ['1366', VIEWPORTS.laptop, false], ['1440', VIEWPORTS.desktop, false]]) {
      const t = await fresh({ viewport: vp, hangExternal: true });
      await visit(t, '#/guide');
      const info = await t.page.evaluate(() => {
        const list = document.querySelector('.gd-toc__list'); const links = [...list.querySelectorAll('a')].filter((a) => a.getClientRects().length);
        return { n: links.length, row: getComputedStyle(list).flexDirection, sticky: getComputedStyle(document.querySelector('.gd-toc')).position, select: document.querySelector('.gd-toc__select').getClientRects().length };
      });
      eq(info.n, 9, name + ' links'); eq(info.select, 0, name + ' select hidden');
      eq(info.row, inline ? 'row' : 'column', name + ' list direction'); eq(info.sticky, inline ? 'static' : 'sticky', name + ' position');
    }
  });

  await check('no horizontal scroll at 1440x900, 1366x768, 1024x768 and 390x844, in dark and light, on every section', async () => {
    for (const theme of ['dark', 'light']) {
      for (const [name, vp] of Object.entries({ desktop: VIEWPORTS.desktop, laptop: VIEWPORTS.laptop, tablet: VIEWPORTS.tablet, phone: VIEWPORTS.phone })) {
        const t = await fresh({ theme, viewport: vp, hangExternal: true });
        await visit(t, '#/guide');
        // open every FAQ answer so the longest text is measured too
        await t.page.$$eval('details.gd-q', (ds) => ds.forEach((d) => { d.open = true; }));
        const o = await noOverflow(t.page);
        ok(o.doc <= 0 && o.main <= 0, `${theme} ${name}: ${JSON.stringify(o)}`);
        const wide = await t.page.evaluate(() => [...document.querySelectorAll('#shell-main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > document.documentElement.clientWidth + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.className || e.tagName));
        eq(wide, [], `${theme} ${name}: elements past the right edge`);
      }
    }
  });

  /* ============================================================ themes, axe, keyboard */
  await check('axe (wcag2a, aa, 21aa, 22aa, best-practice): 0 violations on #/guide in dark and light at desktop, and at phone width, with every FAQ answer open', async () => {
    for (const [vpName, vp] of [['desktop', VIEWPORTS.desktop], ['phone', VIEWPORTS.phone], ['tablet', VIEWPORTS.tablet]]) {
      const t = await fresh({ viewport: vp, hangExternal: true });
      await visit(t, '#/guide');
      await t.page.$$eval('details.gd-q', (ds) => ds.forEach((d) => { d.open = true; }));
      for (const theme of ['dark', 'light']) {
        await setTheme(t.page, theme);
        const v = await axe(t.page);
        eq(v.map((x) => `${x.id}: ${x.targets.join(' | ')}`), [], `${vpName} ${theme}`);
      }
    }
  });

  await check('axe on the shell with the new tab: Overview and Guide in both themes, and with the Guide tab keyboard-focused', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/overview');
    const q = t.page;
    for (const theme of ['dark', 'light']) {
      await visit(t, '#/overview');
      await setTheme(q, theme);
      eq((await axe(q)).map((x) => `${x.id}: ${x.targets.join(' | ')}`), [], 'overview ' + theme);
      await q.keyboard.press('Tab');                                                   // skip link
      let guard = 0;
      while (guard < 12 && (await active(q)).label !== 'Guide') { await q.keyboard.press('Tab'); guard += 1; }
      eq((await active(q)).label, 'Guide', theme + ': the Guide tab is reachable by Tab');
      const ring = await q.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: s.outlineWidth }; });
      eq(ring, { style: 'solid', width: '2px' }, theme + ': visible focus ring on the Guide tab');
      eq((await axe(q)).map((x) => `${x.id}: ${x.targets.join(' | ')}`), [], `${theme}: Guide tab focused`);
      await q.keyboard.press('Enter');
      await q.waitForFunction(() => location.hash === '#/guide');
      await h1Is(q, 'Guide');
      await settle(q, 300);
      eq((await axe(q)).map((x) => `${x.id}: ${x.targets.join(' | ')}`), [], `${theme}: guide route shell`);
    }
  });

  await check('contrast of the active and idle tabs in both themes: the Guide tab text and the inactive app tab text are at least 4.5:1 against the header', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/guide');
    for (const theme of ['dark', 'light']) {
      await setTheme(t.page, theme);
      await settle(t.page, 400);                                                       // the tabs fade colour over 150ms
      const r = await t.page.evaluate(() => {
        const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--shell-page-bg').trim();
        const probe = document.createElement('i'); probe.style.background = bg; document.body.appendChild(probe); const page = getComputedStyle(probe).backgroundColor; probe.remove();
        return { active: ratio(getComputedStyle(document.querySelector('.shell__tab.is-active')).color, page), idle: ratio(getComputedStyle(document.querySelector('a.shell__apptab-name')).color, page), apps: ratio(getComputedStyle(document.querySelector('button.shell__tab')).color, page) };
      });
      ok(r.active >= 4.5 && r.idle >= 4.5 && r.apps >= 4.5, `${theme}: ${JSON.stringify(r)}`);
      ok(r.active > r.idle, `${theme}: the active tab reads stronger than the idle ones`);
    }
  });

  await check('keyboard only: Tab reaches the skip link, Apps, Chat, Guide, the Kontor tab and the rail before the page; Enter on the skip link focuses main; Tab reaches the contents list and the primary button; Enter follows it', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/guide');
    const q = t.page;
    await q.evaluate(() => { document.activeElement && document.activeElement.blur(); });
    const seen = [];
    for (let i = 0; i < 70; i += 1) {
      await q.keyboard.press('Tab');
      const a = await active(q);
      seen.push(a.label);
      if (a.label === 'Open the overview') break;
    }
    const idx = (l) => seen.findIndex((x) => x === l || x.startsWith(l));
    ok(idx('Skip to content') === 0, 'first stop is the skip link: ' + seen.slice(0, 3));
    ok(idx('Apps') > 0 && idx('Chat') > idx('Apps') && idx('Guide') > idx('Chat') && idx('Kontor financial layer') > idx('Guide'), 'tabs in order: ' + seen.slice(0, 8).join(' > '));
    ok(idx('Overview') > idx('Kontor financial layer') && idx('Start here') > idx('Overview'), 'rail before the contents list');
    ok(idx('Open the overview') > idx('Start here'), 'primary button reached after the contents: ' + seen.join(' > '));
    const ring = await q.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: s.outlineWidth }; });
    ok(ring.style !== 'none' && parseFloat(ring.width) >= 2, 'focus ring on the primary button: ' + JSON.stringify(ring));
    await q.keyboard.press('Enter');
    await q.waitForFunction(() => location.hash === '#/overview');
    await visit(t, '#/guide');
    await q.keyboard.press('Tab'); await q.keyboard.press('Enter');
    eq((await active(q)).id, 'shell-main', 'skip link moves focus to main');
    eq(await hashOf(q), '#/guide', 'skip link keeps the address');
    await q.locator('.gd-toc__list a').nth(3).focus();
    await q.keyboard.press('Enter');
    await q.waitForFunction(() => document.activeElement && document.activeElement.id === 'try', null, { timeout: 4000 });
    eq(await hashOf(q), '#/guide?s=try', 'contents link by keyboard');
    await q.getByRole('button', { name: 'Open settings' }).focus();
    await q.keyboard.press('Enter');
    await dialog(q, 'Settings').waitFor();
    await q.keyboard.press('Escape'); await settle(q, 300);
    eq((await active(q)).label, 'Open settings', 'Escape returns focus');
  });

  await check('Share still works from the Guide: it copies the current address and says so', async () => {
    const t = await fresh({ hangExternal: true });
    await visit(t, '#/guide?s=tour');
    await t.page.locator('button[aria-label="Share"]').click();
    await t.page.locator('.kx-toast', { hasText: 'Link copied to your clipboard.' }).waitFor();
    const clip = await t.page.evaluate(() => navigator.clipboard.readText());
    ok(clip.endsWith('#/guide?s=tour'), 'copied ' + clip);
  });

  /* ============================================================ copy lint, source lint, storage, console */
  await check('copy lint: no exclamation mark, no emoji, sentence case headings, [Verb]+[Object] buttons, the word saving only in the numbers section, one h1', async () => {
    await visit(t1, '#/guide');
    const body = await p.locator('#shell-main').innerText();
    ok(!/!/.test(body), 'exclamation mark in the text');
    ok(!EMOJI.test(body.replace(/[↗→←·–—×−“”]/gu, '')), 'emoji or pictograph in the text');
    const heads = await p.$$eval('#shell-main h1, #shell-main h2, #shell-main h3, #shell-main h4, #shell-main summary', (hs) => hs.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    heads.forEach(sentenceCase);
    const buttons = await p.$$eval('#shell-main button, #shell-main a.gd-btn, #shell-main a.gd-link--go', (bs) => bs.map((b) => (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim()).filter(Boolean));
    buttons.forEach((b) => ok(VERB_OBJECT.test(b), `button or action link is not [Verb]+[Object]: "${b}"`));
    const outside = await p.evaluate(() => [...document.querySelectorAll('section.gd-section')].filter((s) => s.getAttribute('aria-labelledby') !== 'numbers').map((s) => s.innerText).join('\n'));
    ok(!/\bsavings?\b/i.test(outside), 'the word saving(s) appears outside the numbers section');
    const body2 = await text(p.locator('#shell-main'));
    ok(!/\b(Click here|click here|Submit|OK)\b/.test(body2), 'vague button wording');
    ok(!/\b(we're|you're|isn't) (a )?(bug|broken)\b/i.test(body2), 'tone');
  });

  await check('source lint: Guide files have no hex colour, gradient, svg, clock call or Math.random', async () => {
    for (const f of ['src/views/Guide.css', 'src/views/Guide.jsx', 'src/views/guide-content.js', 'src/views/guide-facts.js']) {
      const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const code = f.endsWith('.css') ? s.replace(/\/\*[\s\S]*?\*\//g, '') : s;
      if (f.endsWith('.css')) { ok(!/#[0-9a-fA-F]{3,8}\b/.test(code), f + ': hex colour'); ok(!/gradient/i.test(code), f + ': gradient'); ok(!/\b(rgb|rgba|hsl)\(/i.test(code), f + ': raw colour function'); }
      ok(!/<svg|<path/i.test(s), f + ': svg');
      ok(!/Date\.now\(|new Date\(\)|Math\.random/.test(s), f + ': clock or random');
    }
  });

  await check('storage blocked: the Guide still renders with live numbers and no console error', async () => {
    const t = await fresh({ blockStorage: true, hangExternal: true });
    await visit(t, '#/guide?s=tour');
    has(await sec(t.page, 'tour'), C.headlineSentence(E0.totals), 'headline');
    eq(t.errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED/.test(e)), [], 'errors');
  });

  await check('No console errors and no request left the page origin across every page of this run', async () => {
    const errs = pages.flatMap((t) => t.errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED/.test(e)));
    eq(errs, [], 'console and page errors');
    const ext = pages.flatMap((t) => externalRequests(t).map((r) => r.url));
    eq(ext, [], 'external requests');
  });
} finally {
  await h.close();
}
console.log(failed ? `\n${failed} check(s) failed, ${passed} passed` : `\nall ${passed} checks passed`);
process.exit(failed ? 1 : 0);
