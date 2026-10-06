// V7 e2e: Roadmap (#/roadmap), Evidence (#/evidence) and the five overlays (About, Feedback, Settings, Demo guide, Menu) plus the header handlers.
//   KONTOR_DIST=.scratch/V7 node tests/e2e/V7.mjs        against the V7 dev build (real Overview, Renewals, Opportunities, Method, Roadmap, Evidence)
//   node tests/e2e/V7.mjs                                against dist/ (the whole app)
// Covers requirements R5 (header handlers), R15, R20 (the Evidence page), R21 (feedback), R22, R62, R63, R64, R67, R68, R73 and blueprint
// decisions 8, 10, 11. Spec wording is read from docs/spec.md itself (the source of truth), not from src/data, so the data modules are checked too.
// Prints 'ok   <name>' / 'FAIL <name>: <why>' / 'skip <name>: <why>'; exits non-zero when anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme } from '../lib/harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('ok   ' + name); } catch (e) { failed += 1; console.log('FAIL ' + name + ': ' + ((e && e.message) || e)); }
}
const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg); };
const norm = (s) => String(s).replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const text = async (loc) => norm(await loc.innerText());
const settle = (page, ms = 200) => page.waitForTimeout(ms);
const NEWTAB = ' (opens in a new tab)';
const noHint = (s) => norm(s).split(NEWTAB).join('');

/* ---------------------------------------------------------------- the spec, parsed (docs/spec.md is the source of truth) */
const specLines = fs.readFileSync(path.join(ROOT, 'docs/spec.md'), 'utf8').split('\n');
function section(heading) {
  const i = specLines.findIndex((l) => l.startsWith(heading));
  if (i < 0) throw new Error('spec heading not found: ' + heading);
  const level = heading.match(/^#+/)[0].length;
  const out = [];
  for (let j = i + 1; j < specLines.length; j += 1) { const m = specLines[j].match(/^(#+) /); if (m && m[1].length <= level) break; out.push(specLines[j]); }
  return out;
}
const md = (s) => norm(s.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
const tableRows = (lines) => lines.filter((l) => l.startsWith('|')).slice(2).map(cells);
const bullets = (lines) => lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));

const EVIDENCE = tableRows(section('## Evidence')).map(([c, when, what, feature]) => {
  const m = c.match(/^\[(.+?)\]\((.+?)\)$/);
  return { name: m[1], url: m[2], when, what, feature };
});
const STRETCH = tableRows(section('## Stage 1: stretch and not-yet features'));
const STAGES = tableRows(section('## Two stages'));
const SOURCES = bullets(section('## Stage 1: data sources')).map((b) => md(b));
const STEPS = section('### How the analysis works').filter((l) => /^\d+\. /.test(l)).map((l) => md(l.replace(/^\d+\. /, '')));
const ILLUSTRATIVE = tableRows(section('### Illustrative example'));
const WORKED = md(section('### Illustrative example').find((l) => l.startsWith('For one of the three mid-term councils')));
const WHY = bullets(section("### Why there's money in it")).map(md);
const WHO = bullets(section('### Who would buy it')).map(md);
const TRUE = bullets(section('### What has to be true')).map(md);
const CLOSING = 'Each council that runs Stage 1 ends up with a structured contract estate, which is the raw material Stage 2 needs, with that council\'s agreement to share it.';
const FORMULA = 'Net saving = (current annual cost − group annual cost) × years remaining − exit cost − switching cost';
const CHECKED = 'Every case below was checked against its source on 6 October 2026.';
const ILLUSTRATIVE_LABEL = 'Illustrative numbers, made up to show the logic, not real data';
const BUILT = 'Built in this prototype';
const NOT_IN = 'Not in this prototype';
const HEADLINE = '£6.1m across 15 contracts flagged as opportunities to investigate';
const FEEDBACK_NO_ANSWER = "Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again.";
const FEEDBACK_BLOCKED = 'Feedback not saved. Your browser is blocking local storage. Copy your comments instead.';
const RESET_TOAST = 'Changes reset. The demo is back to its starting numbers.';
const ASSUMPTIONS_BANNER = 'Changing assumptions changes every indicative figure.';
const inert = (name) => `${name} isn't part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo.`;

/* ---------------------------------------------------------------- page helpers */
const dialog = (page, name) => page.getByRole('dialog', { name });
const toasts = (page) => page.locator('.kx-toast');
const toastText = async (page) => norm((await toasts(page).allInnerTexts()).join(' | '));
const activeInfo = (page) => page.evaluate(() => {
  const a = document.activeElement;
  if (!a) return null;
  return { tag: a.tagName, label: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), cls: a.className && a.className.baseVal === undefined ? a.className : '', role: a.getAttribute('role'), inDialog: !!a.closest('[role="dialog"], [role="alertdialog"]'), inMenu: !!a.closest('[role="menu"]') };
});
const stored = (page, key) => page.evaluate((k) => { try { return localStorage.getItem(k); } catch (e) { return 'ERR'; } }, key);
const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText());
const hashOf = (page) => page.evaluate(() => location.hash);
const noOverflow = (page) => page.evaluate(() => {
  const m = document.getElementById('shell-main');
  return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: m.scrollWidth - m.clientWidth };
});
const h1Text = (page) => text(page.locator('#shell-main h1'));
// After a hash change the old page's h1 can still be on screen for a frame: wait for the new one.
const h1Is = (page, expected) => page.waitForFunction((t) => ((document.querySelector('#shell-main h1') || {}).textContent || '').replace(/\s+/g, ' ').trim() === t, expected, { timeout: 5000 });
const primaries = (page, scope) => page.evaluate((sel) => {
  const probe = document.createElement('i'); probe.style.background = 'var(--accent)'; document.body.appendChild(probe);
  const accent = getComputedStyle(probe).backgroundColor; probe.remove();
  const root = document.querySelector(sel) || document;
  return [...root.querySelectorAll('button')].filter((b) => getComputedStyle(b).backgroundColor === accent).map((b) => b.textContent.trim());
}, scope);
const EMOJI = /\p{Extended_Pictographic}/u;
const VERB_OBJECT = /^(Open|Give|See|Show|Hide|View|Read|Clear|Export|Close|Save|Copy|Cancel|Reset|Confirm|Reject|Mark|Back|Previous|Next)\b/;
const PROPER = new Set(['Kontor', 'Stage', 'Marchbank', 'Borough', 'Council', 'Sefton', 'Springboard']);
const sentenceCase = (t) => {
  const words = t.replace(/[:.,?]/g, '').split(/\s+/).slice(1);
  const bad = words.filter((w) => /^[A-Z][a-z]/.test(w) && !PROPER.has(w));
  if (bad.length) throw new Error(`heading is not sentence case: "${t}" (${bad.join(', ')})`);
};
async function lint(page, root, label, { allowSaving = false } = {}) {
  const body = await page.locator(root).first().innerText();
  ok(!/!/.test(body), `${label}: exclamation mark in the text`);
  ok(!EMOJI.test(body.replace(/[↗→←·–—×−]/gu, '')), `${label}: emoji or pictograph in the text`);
  if (!allowSaving) ok(!/\bsavings?\b/i.test(body), `${label}: the word saving(s) is not allowed here`);
  const buttons = await page.$$eval(`${root} button`, (bs) => bs.map((b) => (b.getAttribute('aria-label') || b.textContent).trim()).filter(Boolean));
  buttons.forEach((b) => ok(VERB_OBJECT.test(b) || /^(Yes|Maybe|No|\d+%)$/.test(b), `${label}: button label is not [Verb]+[Object]: "${b}"`));
  const heads = await page.$$eval(`${root} h1, ${root} h2, ${root} h3, ${root} h4`, (hs) => hs.map((h) => h.textContent.trim()));
  heads.forEach(sentenceCase);
  return { body, buttons, heads };
}
const rowTexts = (page, sel) => page.$$eval(sel, (rs) => rs.map((r) => [...r.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim())));

const dist = process.env.KONTOR_DIST || null;
const h = await launch({ dist });
const pages = [];
const fresh = async (opts = {}) => { const t = await h.newPage({ theme: 'dark', ...opts }); pages.push(t); return t; };
try {
  /* ============================================================ ROADMAP (R67, R68) */
  const rt = await fresh();
  await visit(rt, '#/roadmap');
  const rp = rt.page;

  await check('R67 the Roadmap has one h1 "Roadmap", the title "Roadmap | Kontor financial layer", the rail item "Roadmap" is current', async () => {
    eq(await rp.locator('#shell-main h1').count(), 1, 'h1 count');
    eq(await h1Text(rp), 'Roadmap', 'h1');
    eq(await rp.title(), 'Roadmap | Kontor financial layer', 'title');
    eq(await rp.locator('.shell__rail [aria-current="page"]').getAttribute('aria-label'), 'Roadmap', 'rail');
    ok((await text(rp.locator('.page-header__desc'))).includes("What this prototype does, what comes next, and what needs data we don't have yet."), 'subtitle');
  });

  await check('R67 the status table lists the ten features with the spec\'s "What it needs" text and one status each (Uplift check reads "Built in this prototype")', async () => {
    const rows = await rowTexts(rp, '#shell-main .rm-status-panel tbody tr');
    eq(rows.length, 10, 'rows');
    const want = [
      ['Financial question set', BUILT, "Kontor's existing extraction, plus 9 new questions"],
      ['Renewal radar', BUILT, 'Contract dates and notice terms'],
      ['Cap vs spend', BUILT, 'Transparency Code payments over £500, joined to contracts by supplier'],
      ['Opportunities list', BUILT, 'The three above'],
      ['Uplift check', BUILT, STRETCH.find((r) => r[0] === 'Uplift check')[2]],
    ];
    STRETCH.filter((r) => r[0] !== 'Uplift check').forEach((r) => want.push([r[0], r[1] === 'Stage 2' ? 'Stage 2' : 'Not yet', r[2]]));
    want.forEach((w, i) => {
      ok(rows[i][0].startsWith(w[0]), `row ${i + 1} feature: "${rows[i][0]}" vs "${w[0]}"`);
      ok(rows[i][1].startsWith(w[1]), `row ${i + 1} status: "${rows[i][1]}" vs "${w[1]}"`);
      eq(rows[i][2], norm(w[2]), `row ${i + 1} needs`);
    });
    ok(rows[4][0].includes('Stretch feature'), 'Uplift check is labelled as a stretch feature');
  });

  await check('R67 every Stage 2 and Not yet row carries the visible label "Not in this prototype"; the five built rows do not and link to their screen', async () => {
    const rows = await rowTexts(rp, '#shell-main .rm-status-panel tbody tr');
    rows.forEach((r, i) => eq(r[1].includes(NOT_IN), i >= 5, `row ${i + 1} label`));
    const links = await rp.$$eval('#shell-main .rm-status-panel tbody th a', (as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    eq(links.length, 5, 'links on built rows');
    eq(links.map((l) => l[1]), ['#/contracts', '#/renewals', '#/spend', '#/opportunities', '#/opportunities?type=uplift'], 'link targets');
  });

  await check('R67 the status table is an accessible table: caption, column headers with scope, row headers', async () => {
    const t = rp.locator('#shell-main .rm-status-panel table');
    ok((await t.locator('caption').count()) === 1 || !!(await t.getAttribute('aria-label')), 'caption or aria-label');
    eq((await t.locator('thead th[scope="col"]').evaluateAll((ths) => ths.map((x) => x.textContent))).map(norm), ['Feature', 'Status', 'What it needs'], 'headers');
    eq(await t.locator('tbody th[scope="row"]').count(), 10, 'row headers');
  });

  await check('R67 Stage 1 and Stage 2 compared: the spec\'s five rows, and the closing line about the structured contract estate', async () => {
    const rows = await rowTexts(rp, '#shell-main table:has(th:has-text("Stage 1")) tbody tr');
    eq(rows.length, STAGES.length, 'rows');
    STAGES.forEach((r, i) => eq(rows[i], r.map(norm), 'row ' + (i + 1)));
    const body = await text(rp.locator('#shell-main'));
    ok(body.includes(CLOSING), 'closing line missing');
    ok(body.includes("Stage 1 proves value inside one council; Stage 2 turns many councils' contracts into buying power."), 'stages intro');
  });

  await check('R67 Stage 1 data sources: Find a Tender over £5m from 24 February 2025, Transparency Code spend files, Contracts Finder below £5m (spec wording, linked source)', async () => {
    const panel = rp.locator('#shell-main section:has(h2:has-text("Stage 1 data sources"))');
    eq(await panel.count(), 1, 'panel');
    const items = await panel.locator('.rm-source').evaluateAll((els) => els.map((e) => [e.querySelector('h3').textContent.trim(), e.querySelector('p').textContent.replace(/\s+/g, ' ').trim()]));
    eq(items.length, 3, 'three sources');
    SOURCES.forEach((s, i) => {
      const [lead, ...rest] = s.split(/:\s(.*)/s);
      eq(items[i][0], lead, 'source title ' + (i + 1));
      eq(noHint(items[i][1]), norm(rest[0]), 'source text ' + (i + 1));
    });
    const t = await text(panel);
    ['Find a Tender', 'on or after 24 February 2025', 'Transparency Code spend files', 'Contracts Finder notices for contracts below £5m'].forEach((s) => ok(t.includes(s), 'missing: ' + s));
    const link = panel.locator('a[href^="https://gov.wales/"]');
    eq(await link.count(), 1, 'the Procurement Act guidance link');
    eq(await link.getAttribute('target'), '_blank', 'target');
    ok(/noopener/.test(await link.getAttribute('rel')) && /noreferrer/.test(await link.getAttribute('rel')), 'rel');
    ok((await text(link)).endsWith('(opens in a new tab)'), 'visible new-tab text');
    ok(/all 24 contracts come from the council contracts register \(PDF\)/.test(t), 'sample source note: ' + t.slice(-300));
  });

  await check('R67 Stage 2: the intro, the six steps in order, the formula as plain text in a monospace block', async () => {
    const panel = rp.locator('#shell-main section:has(h2:has-text("Stage 2: the joined-up view"))');
    eq(await panel.count(), 1, 'panel');
    ok((await text(panel)).includes("Once Kontor reads contracts across many councils, it can show where councils buying the same thing separately should move onto one framework or buying group, and whether the saving survives the cost of getting out of their current contracts."), 'intro');
    eq((await panel.locator('.rm-step__text').allInnerTexts()).map(norm), STEPS, 'six steps');
    eq(await panel.locator('.rm-formula code').innerText().then(norm), FORMULA, 'formula');
    eq(await panel.locator('.rm-formula code').evaluate((e) => getComputedStyle(e).fontFamily.toLowerCase().includes('mono')), true, 'monospace');
    ok((await text(panel)).includes('Stage 2') && (await text(panel)).includes(NOT_IN), 'the panel says it is Stage 2 and not in this prototype');
  });

  await check('R67 the illustrative example is labelled "Illustrative numbers, made up to show the logic, not real data" and carries the £2m worked example (£160k, £400k, £120k, £30k, £250k)', async () => {
    const box = rp.locator('#shell-main .rm-illustrative');
    eq(await box.count(), 1, 'box');
    ok((await text(box.locator('.rm-illustrative__label'))).startsWith(ILLUSTRATIVE_LABEL), 'label: ' + await text(box.locator('.rm-illustrative__label')));
    ok(((await box.locator('table caption').innerText()).trim()).startsWith(ILLUSTRATIVE_LABEL), 'the table caption carries the label too');
    ok((await text(box)).includes('Ten councils buy the same service separately, about £20m a year combined.'), 'intro');
    const rows = await rowTexts(rp, '#shell-main .rm-illustrative tbody tr');
    eq(rows, ILLUSTRATIVE.map((r) => r.map(norm)), 'illustrative table rows');
    eq((await box.locator('thead th').evaluateAll((ths) => ths.map((x) => x.textContent))).map(norm), ['Councils', 'Contract position', 'Saving vs group rate', 'Exit cost', 'Recommendation'], 'table headers');
    const worked = await text(box.locator('.rm-worked'));
    ok(worked.includes(WORKED), 'worked example sentence');
    ['£2m a year', '8% saving is £160k a year', '£400k over 2.5 remaining years', '£120k exit cost', '£30k switching cost', 'net saving is £250k'].forEach((s) => ok(worked.includes(s), 'worked example misses ' + s));
  });

  await check('R67 why there is money in it, who would buy it, what has to be true: the spec\'s bullets, in order, with their source links', async () => {
    const main = rp.locator('#shell-main');
    const why = (await main.locator('.rm-why__item').allInnerTexts()).map((t) => noHint(t.replace(/\s+/g, ' ')));
    eq(why.length, 3, 'why');
    WHY.forEach((w, i) => eq(why[i].replace(/^(.+?\.) /, '$1 '), w, 'why ' + (i + 1)));
    const who = (await main.locator('section:has(h2:has-text("Who would buy it")) li').allInnerTexts()).map((t) => noHint(t));
    eq(who, WHO, 'who would buy it');
    const must = (await main.locator('section:has(h2:has-text("What has to be true")) .rm-points li').allInnerTexts()).map((t) => noHint(t));
    eq(must, TRUE, 'what has to be true');
    const links = await main.locator('a[target="_blank"]').evaluateAll((as) => as.map((a) => [a.textContent.replace(/\s+/g, ' ').trim(), a.getAttribute('href'), a.getAttribute('rel')]));
    const specUrls = [...section("### Why there's money in it"), ...section('### Who would buy it'), ...section('## Stage 1: data sources')].join('\n').match(/\]\((https:[^)]+)\)/g).map((m) => m.slice(2, -1));
    eq(links.map((l) => l[1]).sort(), [...specUrls].sort(), 'the external links are the spec\'s links');
    links.forEach((l) => { ok(/noopener/.test(l[2]) && /noreferrer/.test(l[2]), 'rel on ' + l[1]); ok(l[0].endsWith('(opens in a new tab)'), 'visible new-tab text on ' + l[1]); ok(/^https:\/\//.test(l[1]), 'https ' + l[1]); });
  });

  await check('R68 the Roadmap says why termination terms are extracted now, and links to a contract where they show', async () => {
    const note = rp.locator('#shell-main .rm-termination');
    const t = await text(note);
    ok(t.includes('termination rights and exit fees for every contract'), t);
    ok(t.includes('raw material for Stage 2'), t);
    eq(await note.locator('a').getAttribute('href'), '#/contracts/C-005', 'link');
  });

  await check('R67 no input, select, textarea, slider, calculator, canvas or chart anywhere on the Roadmap; the only control is the outline "Give feedback" button', async () => {
    const n = await rp.evaluate(() => document.querySelectorAll('#shell-main input, #shell-main select, #shell-main textarea, #shell-main [role="slider"], #shell-main [contenteditable], #shell-main canvas, #shell-main svg, #shell-main [class*="kviz"], #shell-main form, #shell-main output, #shell-main meter, #shell-main progress').length);
    eq(n, 0, 'interactive or chart elements');
    const buttons = await rp.$$eval('#shell-main button', (bs) => bs.map((b) => b.textContent.trim()));
    eq(buttons, ['Give feedback'], 'buttons');
    eq(await primaries(rp, '#shell-main'), [], 'primary buttons (the page has none)');
  });

  await check('R13 copy lint on the Roadmap: no exclamation mark, no emoji, buttons are [Verb]+[Object], headings in sentence case', async () => {
    const r = await lint(rp, '#shell-main', 'roadmap', { allowSaving: true });
    ok(r.heads.length >= 12, 'headings: ' + r.heads.length);
    eq(r.heads.filter((x) => x === 'Roadmap').length, 1, 'one Roadmap heading');
  });

  await check('R67 heading order on the Roadmap has no skipped level (h1, h2, h3, h4)', async () => {
    const levels = await rp.$$eval('#shell-main h1, #shell-main h2, #shell-main h3, #shell-main h4', (hs) => hs.map((x) => Number(x.tagName[1])));
    eq(levels[0], 1, 'starts at h1');
    for (let i = 1; i < levels.length; i += 1) ok(levels[i] - levels[i - 1] <= 1, `heading level jumps from h${levels[i - 1]} to h${levels[i]} at position ${i}`);
  });

  /* ============================================================ EVIDENCE (R20, blueprint decision 10) */
  const et = await fresh();
  await visit(et, '#/evidence');
  const ep = et.page;

  await check('R20 Evidence: one h1 "Why this matters", the checked-on line, the framing sentence, no rail item highlighted', async () => {
    eq(await ep.locator('#shell-main h1').count(), 1, 'h1 count');
    eq(await h1Text(ep), 'Why this matters', 'h1');
    ok((await ep.title()).endsWith(' | Kontor financial layer'), 'title suffix');
    const head = await text(ep.locator('.page-header'));
    ok(head.includes(CHECKED), 'checked line: ' + head);
    ok(head.includes('Councils routinely lose money because nobody has a full picture of their own contracts.'), 'framing sentence');
    eq(await ep.locator('.shell__rail [aria-current="page"]').count(), 0, 'no rail item highlighted');
  });

  await check('R20 all nine cases are in one accessible table: Case, When, What happened, Kontor feature it supports; the cells are the spec\'s words', async () => {
    const t = ep.locator('#shell-main .ev-table table');
    eq(await t.count(), 1, 'one table');
    ok(!!(await t.locator('caption').count()) || !!(await t.getAttribute('aria-label')), 'caption');
    eq((await t.locator('thead th[scope="col"]').evaluateAll((ths) => ths.map((x) => x.textContent))).map(norm), ['Case', 'When', 'What happened', 'Kontor feature it supports'], 'headers');
    const rows = await rowTexts(ep, '#shell-main .ev-table tbody tr');
    eq(rows.length, 9, 'nine rows');
    eq(EVIDENCE.length, 9, 'the spec has nine cases');
    EVIDENCE.forEach((e, i) => {
      ok(noHint(rows[i][0]).startsWith(norm(e.name)), `case ${i + 1}: "${rows[i][0]}" vs "${e.name}"`);
      eq(rows[i][1], norm(e.when), `When ${e.name}`);
      eq(rows[i][2], norm(e.what), `What happened ${e.name}`);
      eq(rows[i][3], norm(e.feature), `Feature ${e.name}`);
    });
    eq(await t.locator('tbody th[scope="row"]').count(), 9, 'row headers');
  });

  await check('R20 each Case links to its source: the spec\'s URL, a new tab, rel="noopener noreferrer", and the visible words "(opens in a new tab)"', async () => {
    const links = await ep.$$eval('#shell-main .ev-table tbody th a', (as) => as.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), text: a.innerText.replace(/\s+/g, ' ').trim() })));
    eq(links.length, 9, 'nine links');
    EVIDENCE.forEach((e, i) => {
      eq(links[i].href, e.url, 'href ' + e.name);
      eq(links[i].target, '_blank', 'target ' + e.name);
      ok(/noopener/.test(links[i].rel) && /noreferrer/.test(links[i].rel), 'rel ' + e.name + ': ' + links[i].rel);
      eq(links[i].text, norm(e.name) + NEWTAB, 'visible text ' + e.name);
    });
    // The words are visible, not screen-reader-only.
    eq(await ep.locator('#shell-main .ev-table tbody th a .ev-ext__hint').first().evaluate((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 8 && getComputedStyle(e).visibility === 'visible' && getComputedStyle(e).clip !== 'rect(0px, 0px, 0px, 0px)'; }), true, 'hint is visible');
  });

  await check('R20 the feature column links to the matching feature page in this prototype, and every link has a distinct accessible name per case', async () => {
    const rows = await ep.$$eval('#shell-main .ev-table tbody tr', (rs) => rs.map((r) => [...r.querySelectorAll('td:last-child a')].map((a) => [a.textContent.trim(), a.getAttribute('href'), a.getAttribute('aria-label')])));
    const want = {
      Exeter: [['Cap vs actual spend', '#/spend']],
      Haringey: [['Renewal radar', '#/renewals']],
      Guildford: [['Cap vs actual spend', '#/spend']],
      Edinburgh: [['Contract register built from documents', '#/spend/no-contract']],
      Gedling: [['Financial question set', '#/contracts']],
      'Windsor & Maidenhead': [['Contract register built from documents', '#/contracts']],
      'Brighton & Hove': [['Cap vs actual spend', '#/spend'], ['clause checks', '#/opportunities?type=overCap']],
      'Sefton (LGA)': [['Caveat: frame as opportunities', '#/method?s=indicative'], ['reading terms, not just payments', '#/contracts']],
      'Sheffield (LGA)': [['Savings opportunities list', '#/opportunities'], ['uplift check', '#/opportunities?type=uplift']],
    };
    EVIDENCE.forEach((e, i) => {
      eq(rows[i].map((l) => [l[0], l[1]]), want[e.name], 'feature links ' + e.name);
      rows[i].forEach((l) => ok(l[2] && l[2].startsWith(l[0]) && l[2].includes(e.name.split(' ')[0]), `aria-label starts with the visible text and names the case: "${l[2]}"`));
    });
  });

  await check('R20 a feature link lands on its screen (Renewal radar, Cap vs spend)', async () => {
    await ep.locator('#shell-main .ev-table tbody tr:nth-child(2) td:last-child a').click();
    await ep.waitForFunction(() => location.hash === '#/renewals');
    await h1Is(ep, 'Renewal radar');
    eq(await h1Text(ep), 'Renewal radar', 'h1');
    await go(ep, '#/evidence');
  });

  await check('R20 the Overview strip\'s "Show all 9 cases" link lands on this page (blueprint decision 10)', async () => {
    await go(ep, '#/overview');
    const link = ep.getByRole('link', { name: /Show all 9 cases/ });
    eq(await link.getAttribute('href'), '#/evidence', 'href');
    await link.click();
    await ep.waitForFunction(() => location.hash === '#/evidence');
    await h1Is(ep, 'Why this matters');
    eq(await h1Text(ep), 'Why this matters', 'h1');
  });

  await check('R20 the Sefton caution is on the page: a marker on the Sefton row, and a section that explains why every figure is an opportunity to investigate', async () => {
    const rowText = await text(ep.locator('#shell-main .ev-table tbody tr:nth-child(8)'));
    ok(rowText.includes('Sefton (LGA)') && rowText.includes('Caution'), rowText);
    const c = ep.locator('#shell-main .ev-caution');
    eq(await c.count(), 1, 'caution section');
    const t = await text(c);
    ok(t.includes('Sefton'), 'names Sefton: ' + t);
    ok(t.includes('opportunity to investigate, not a saving'), t);
    ok(t.includes('Sefton shows headline savings can shrink once tested.'), 'the spec sentence: ' + t);
    ok(t.includes('Check each flag against its clause before you act.'), t);
    eq(await c.locator('a').getAttribute('href'), '#/method?s=indicative', 'link to the method');
  });

  await check('R20 Evidence passes the copy lint (saving appears only in the quoted cases and the caution), has no skipped heading level', async () => {
    const r = await lint(ep, '#shell-main', 'evidence', { allowSaving: true });
    const levels = await ep.$$eval('#shell-main h1, #shell-main h2, #shell-main h3', (hs) => hs.map((x) => Number(x.tagName[1])));
    for (let i = 1; i < levels.length; i += 1) ok(levels[i] - levels[i - 1] <= 1, 'heading order');
    ok(r.body.includes('(Scottish council)'), 'Edinburgh wording kept');
  });

  /* ============================================================ ABOUT (R15) */
  const at = await fresh();
  await visit(at, '#/roadmap');
  const ap = at.page;
  await check('R15 the "About this data" link is in the banner on every route; keyboard Enter opens the dialog, Tab stays inside it, Esc closes it, focus returns to the link', async () => {
    const link = ap.locator('.sample-banner__link');
    eq(await text(link), 'About this data', 'link text');
    await link.focus();
    await ap.keyboard.press('Enter');
    const d = dialog(ap, 'About this data');
    await d.waitFor();
    eq(await d.getAttribute('aria-modal'), 'true', 'aria-modal');
    ok((await activeInfo(ap)).inDialog, 'focus moved into the dialog: ' + JSON.stringify(await activeInfo(ap)));
    for (let i = 0; i < 9; i += 1) { await ap.keyboard.press('Tab'); ok((await activeInfo(ap)).inDialog, `Tab ${i + 1} left the dialog: ` + JSON.stringify(await activeInfo(ap))); }
    for (let i = 0; i < 4; i += 1) { await ap.keyboard.press('Shift+Tab'); ok((await activeInfo(ap)).inDialog, `Shift+Tab ${i + 1} left the dialog`); }
    await ap.keyboard.press('Escape');
    await settle(ap);
    eq(await dialog(ap, 'About this data').count(), 0, 'closed');
    eq((await activeInfo(ap)).cls.includes('sample-banner__link'), true, 'focus returned to the banner link: ' + JSON.stringify(await activeInfo(ap)));
  });
  await check('R15 the dialog carries the copy deck text (blueprint corrections): what is real, what is realistic, ingestion, one council, where real data would come from, fixed date', async () => {
    await ap.locator('.sample-banner__link').click();
    const d = dialog(ap, 'About this data');
    await d.waitFor();
    const t = await text(d);
    ['What is real. Nothing. Marchbank Borough Council, its suppliers, contracts and payments are fictional. They were written for this demo.',
      'The payment rows look like the files councils publish for payments over £500: date, department, supplier, purpose and amount.',
      'This prototype starts after document ingestion: every answer is shown as already extracted.',
      'Why one council. Stage 1 shows what one council can learn from its own contracts and spend. Joining up councils is Stage 2 and is on the roadmap.',
      'Contracts over £5m on Find a Tender, for procurements started on or after 24 February 2025.',
      'Every figure is calculated as at 6 October 2026, whatever today\'s date is.'].forEach((s) => ok(t.includes(s), 'missing: ' + s));
    ok(!/still being tested|without a developer|Transparency Code column/i.test(t), 'the ingestion risk and the column claim must not be on screen');
    eq(await d.locator('h2').innerText().then(norm), 'About this data', 'title is the dialog heading');
    eq(await primaries(ap, '[role="dialog"]'), ['Close dialog'], 'one filled button');
    await lint(ap, '[role="dialog"]', 'about');
    await d.locator('.kx-dialog__foot').getByRole('button', { name: 'Close dialog' }).click();
    await settle(ap);
    eq(await dialog(ap, 'About this data').count(), 0, 'closed by the button');
    eq((await activeInfo(ap)).cls.includes('sample-banner__link'), true, 'focus returned to the link after the button');
  });
  await check('R15 a click on the scrim closes the dialog; the two links in it go to the Method page and the Roadmap and close it', async () => {
    await ap.locator('.sample-banner__link').click();
    await dialog(ap, 'About this data').waitFor();
    await ap.mouse.click(8, 450);
    await settle(ap);
    eq(await dialog(ap, 'About this data').count(), 0, 'scrim click');
    await ap.locator('.sample-banner__link').click();
    await dialog(ap, 'About this data').waitFor();
    await dialog(ap, 'About this data').getByRole('link', { name: 'How this is calculated' }).click();
    await ap.waitForFunction(() => location.hash === '#/method');
    await settle(ap);
    eq(await dialog(ap, 'About this data').count(), 0, 'closed on navigation');
    await h1Is(ap, 'How this is calculated');
    eq(await h1Text(ap), 'How this is calculated', 'h1 of the method page');
    await go(ap, '#/roadmap');
  });
  await check('R15 the banner link and the dialog work on every route (Overview, Opportunities, Renewals, Spend, Contracts, a contract, Method, Roadmap, Evidence)', async () => {
    for (const hash of ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/contracts', '#/contracts/C-005', '#/method', '#/roadmap', '#/evidence']) {
      await go(ap, hash);
      await ap.locator('.sample-banner__link').click();
      await dialog(ap, 'About this data').waitFor({ timeout: 3000 });
      await ap.keyboard.press('Escape');
      await settle(ap, 120);
      eq(await dialog(ap, 'About this data').count(), 0, 'closed on ' + hash);
    }
  });

  /* ============================================================ MENU (blueprint decision 11) */
  const mt = await fresh();
  await visit(mt, '#/overview');
  const mp = mt.page;
  const menuBtn = mp.locator('.shell__rail-menu');
  const items = () => mp.locator('nav[aria-label="Menu"] [role="menuitem"]');
  const openMenuByKey = async () => { await menuBtn.focus(); await mp.keyboard.press('Enter'); await mp.locator('nav[aria-label="Menu"] [role="menu"]').waitFor(); await settle(mp, 120); };
  await check('Menu: the Menu button opens a popover inside <nav aria-label="Menu"> with the five items in order; the first item has focus', async () => {
    await openMenuByKey();
    eq(await mp.locator('nav[aria-label="Menu"]').count(), 1, 'nav landmark');
    eq(await mp.locator('nav[aria-label="Menu"] [role="menu"]').count(), 1, 'role=menu');
    eq((await items().allInnerTexts()).map(norm), ['Why this matters', 'How this is calculated', 'About this data', 'Demo guide', 'Give feedback'], 'items');
    eq((await activeInfo(mp)).label, 'Why this matters', 'first item focused');
    eq(await menuBtn.getAttribute('aria-haspopup'), 'menu', 'aria-haspopup');
    const hrefs = await items().evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    eq(hrefs, ['#/evidence', '#/method', null, null, null], 'links');
  });
  await check('Menu: ArrowDown and ArrowUp move and wrap, Home and End jump, a letter jumps to the next item that starts with it', async () => {
    await mp.keyboard.press('ArrowDown'); eq((await activeInfo(mp)).label, 'How this is calculated', 'down');
    await mp.keyboard.press('End'); eq((await activeInfo(mp)).label, 'Give feedback', 'end');
    await mp.keyboard.press('ArrowDown'); eq((await activeInfo(mp)).label, 'Why this matters', 'wrap down');
    await mp.keyboard.press('ArrowUp'); eq((await activeInfo(mp)).label, 'Give feedback', 'wrap up');
    await mp.keyboard.press('Home'); eq((await activeInfo(mp)).label, 'Why this matters', 'home');
    await mp.keyboard.press('d'); eq((await activeInfo(mp)).label, 'Demo guide', 'letter d');
    await mp.keyboard.press('a'); eq((await activeInfo(mp)).label, 'About this data', 'letter a');
  });
  await check('Menu: Escape closes it and returns focus to the rail Menu button; Tab closes it and keeps focus on the button', async () => {
    await mp.keyboard.press('Escape'); await settle(mp);
    eq(await mp.locator('nav[aria-label="Menu"]').count(), 0, 'closed by Escape');
    ok((await activeInfo(mp)).cls.includes('shell__rail-menu'), 'focus on the Menu button: ' + JSON.stringify(await activeInfo(mp)));
    await openMenuByKey();
    await mp.keyboard.press('Tab'); await settle(mp);
    eq(await mp.locator('nav[aria-label="Menu"]').count(), 0, 'closed by Tab');
    ok((await activeInfo(mp)).cls.includes('shell__rail-menu'), 'focus on the Menu button after Tab');
  });
  await check('Menu: a press outside closes it; a press on the Menu button toggles it closed without flicker', async () => {
    await menuBtn.click(); await mp.locator('nav[aria-label="Menu"]').waitFor();
    await mp.mouse.click(700, 120); await settle(mp);
    eq(await mp.locator('nav[aria-label="Menu"]').count(), 0, 'outside press');
    await menuBtn.click(); await mp.locator('nav[aria-label="Menu"]').waitFor();
    await menuBtn.click(); await settle(mp, 400);
    eq(await mp.locator('nav[aria-label="Menu"]').count(), 0, 'toggled closed and stayed closed');
  });
  await check('Menu: "Why this matters" goes to #/evidence, "How this is calculated" to #/method', async () => {
    await openMenuByKey();
    await mp.keyboard.press('Enter');
    await mp.waitForFunction(() => location.hash === '#/evidence');
    await settle(mp, 300);
    await h1Is(mp, 'Why this matters');
    eq(await h1Text(mp), 'Why this matters', 'evidence h1');
    eq(await mp.locator('nav[aria-label="Menu"]').count(), 0, 'menu closed');
    await menuBtn.click(); await mp.getByRole('menuitem', { name: 'How this is calculated' }).click();
    await mp.waitForFunction(() => location.hash === '#/method');
    await go(mp, '#/overview');
  });
  await check('Menu: About this data, Demo guide and Give feedback open from the menu, and when they close focus returns to the Menu button', async () => {
    for (const [item, dlg] of [['About this data', 'About this data'], ['Demo guide', 'Demo guide'], ['Give feedback', 'Tell us what you think']]) {
      await openMenuByKey();
      await mp.getByRole('menuitem', { name: item }).click();
      await dialog(mp, dlg).waitFor();
      eq(await mp.locator('nav[aria-label="Menu"]').count(), 0, 'menu closed behind ' + dlg);
      await mp.keyboard.press('Escape'); await settle(mp, 300);
      eq(await dialog(mp, dlg).count(), 0, dlg + ' closed');
      ok((await activeInfo(mp)).cls.includes('shell__rail-menu'), `${dlg}: focus returned to the Menu button: ` + JSON.stringify(await activeInfo(mp)));
    }
  });
  await check('Menu: Enter on "About this data" opens the dialog (keyboard only)', async () => {
    await openMenuByKey();
    await mp.keyboard.press('ArrowDown'); await mp.keyboard.press('ArrowDown'); await mp.keyboard.press('Enter');
    await dialog(mp, 'About this data').waitFor();
    await mp.keyboard.press('Escape'); await settle(mp, 300);
    ok((await activeInfo(mp)).cls.includes('shell__rail-menu'), 'focus back on the Menu button');
  });
  await check('Menu: Menu, About, Demo guide and Give feedback copy lint; the menu has no emoji or exclamation mark and the words are sentence case', async () => {
    await openMenuByKey();
    const t = await mp.locator('nav[aria-label="Menu"]').innerText();
    ok(!/!/.test(t) && !EMOJI.test(t), t);
    t.split('\n').filter(Boolean).forEach(sentenceCase);
    await mp.keyboard.press('Escape');
  });

  /* ============================================================ FEEDBACK (R21, R62) */
  const ft = await fresh();
  await visit(ft, '#/overview');
  const fp = ft.page;
  const feedbackBtn = fp.locator('#shell-main button', { hasText: 'Give feedback' });
  await check('R21 Give feedback opens "Tell us what you think" with the question, three radios, a comment box, Cancel and Save feedback (the one filled button); keyboard only', async () => {
    await feedbackBtn.focus();
    await fp.keyboard.press('Enter');
    const d = dialog(fp, 'Tell us what you think');
    await d.waitFor();
    eq(await d.getByRole('radiogroup', { name: 'Would you use this on your own contracts?' }).count(), 1, 'radiogroup');
    eq(await d.getByRole('radio').evaluateAll((rs) => rs.map((r) => r.value)), ['yes', 'maybe', 'no'], 'radios');
    eq((await d.locator('label.kx-field').allInnerTexts()).map(norm), ['Yes', 'Maybe', 'No'], 'radio labels');
    eq(await d.getByLabel('What would make it more useful?').count(), 1, 'comment box');
    ok((await text(d)).includes('Your answer stays on this device unless you copy it.'), 'helper');
    eq(await d.getByRole('radio').evaluateAll((rs) => rs.filter((r) => r.checked).length), 0, 'nothing preselected');
    eq(await d.locator('.kx-dialog__foot button').allInnerTexts().then((a) => a.map(norm)), ['Cancel', 'Save feedback'], 'footer buttons');
    eq(await primaries(fp, '[role="dialog"]'), ['Save feedback'], 'one filled button');
    eq((await activeInfo(fp)).tag, 'INPUT', 'initial focus is on the first radio');
    for (let i = 0; i < 8; i += 1) { await fp.keyboard.press('Tab'); ok((await activeInfo(fp)).inDialog, 'Tab stayed inside, step ' + (i + 1)); }
  });
  await check('R62 unselected radios look empty (the kit paints an unselected radio group as checked; V7 overrides it)', async () => {
    const boxes = await fp.locator('[role="dialog"] .kx-box--radio').evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return [cs.backgroundColor, cs.borderColor]; }));
    boxes.forEach((b) => ok(b[0] === 'rgba(0, 0, 0, 0)' && b[1] !== 'rgb(31, 111, 235)', 'an unselected radio is filled: ' + JSON.stringify(b)));
  });
  await check('R62 Save with no choice shows the exact error, keeps the dialog open and the comment, moves focus to the first option, and saves nothing', async () => {
    const d = dialog(fp, 'Tell us what you think');
    await d.getByLabel('What would make it more useful?').fill('A comment to keep');
    await d.getByRole('button', { name: 'Save feedback' }).click();
    await settle(fp);
    const alert = d.locator('[role="alert"]');
    eq(await text(alert.locator('p')), FEEDBACK_NO_ANSWER, 'error text');
    eq(await d.count(), 1, 'dialog still open');
    eq(await d.getByLabel('What would make it more useful?').inputValue(), 'A comment to keep', 'comment kept');
    eq(await fp.evaluate(() => document.activeElement.value), 'yes', 'focus on the first radio');
    eq(await stored(fp, 'kontor-feedback'), null, 'nothing stored');
    eq(await d.getByRole('radiogroup').getAttribute('aria-invalid'), 'true', 'aria-invalid');
    await d.getByRole('radio', { name: 'Maybe' }).check();
    eq(await d.locator('[role="alert"]').count(), 0, 'the error clears when you choose');
  });
  await check('R62 Save with a choice stores the entry, shows the toast "Feedback saved on this device. Thank you." and closes the dialog with focus back on the button', async () => {
    const d = dialog(fp, 'Tell us what you think');
    await d.getByRole('button', { name: 'Save feedback' }).click();
    await settle(fp, 300);
    eq(await dialog(fp, 'Tell us what you think').count(), 0, 'closed');
    ok((await toastText(fp)).includes('Feedback saved on this device. Thank you.'), await toastText(fp));
    const entries = JSON.parse(await stored(fp, 'kontor-feedback'));
    eq(entries.length, 1, 'one entry');
    eq([entries[0].answer, entries[0].comment, entries[0].asOf], ['maybe', 'A comment to keep', '2026-10-06'], 'entry');
    ok(!Number.isNaN(Date.parse(entries[0].at)), 'timestamp');
    ok((await activeInfo(fp)).label === 'Give feedback' && !(await activeInfo(fp)).inDialog, 'focus returned to Give feedback: ' + JSON.stringify(await activeInfo(fp)));
  });
  await check('R62 reopening lists the saved entry with its answer, comment and time; "Copy feedback" copies text with the answer, the comment and the as-of date', async () => {
    await feedbackBtn.click();
    const d = dialog(fp, 'Tell us what you think');
    await d.waitFor();
    const saved = d.locator('.ovl-saved');
    eq(await saved.count(), 1, 'saved list');
    const t = await text(saved);
    ok(t.includes('Saved on this device') && t.includes('Maybe') && t.includes('A comment to keep'), t);
    ok(await saved.locator('time[datetime]').count() === 1, 'time element');
    await d.getByRole('button', { name: 'Copy feedback' }).click();
    await settle(fp, 300);
    const clip = await clipboard(fp);
    ok(/maybe/i.test(clip) && clip.includes('A comment to keep') && clip.includes('2026-10-06'), 'clipboard: ' + clip);
    ok((await toastText(fp)).includes('Feedback copied to your clipboard.'), await toastText(fp));
    eq((await d.locator('input[type="radio"]:checked').count()), 0, 'the form starts empty');
  });
  await check('R62 Cancel closes without saving, Escape closes and returns focus, and a second saved entry is listed first', async () => {
    const d = dialog(fp, 'Tell us what you think');
    await d.getByLabel('What would make it more useful?').fill('Not saved');
    await d.getByRole('button', { name: 'Cancel' }).click(); await settle(fp, 250);
    eq(JSON.parse(await stored(fp, 'kontor-feedback')).length, 1, 'still one entry');
    ok((await activeInfo(fp)).label === 'Give feedback', 'focus back after Cancel');
    await feedbackBtn.focus(); await fp.keyboard.press('Enter'); await d.waitFor();
    await fp.keyboard.press('Escape'); await settle(fp, 250);
    eq(await d.count(), 0, 'Escape closed it');
    ok((await activeInfo(fp)).label === 'Give feedback', 'focus back after Escape');
    await feedbackBtn.click(); await d.waitFor();
    await d.getByRole('radio', { name: 'Yes' }).check();
    await d.getByLabel('What would make it more useful?').fill('Second one');
    await d.getByRole('button', { name: 'Save feedback' }).click(); await settle(fp, 300);
    await feedbackBtn.click(); await d.waitFor();
    const lis = await d.locator('.ovl-saved__item').allInnerTexts();
    eq(lis.length, 2, 'two entries');
    ok(/Second one/.test(lis[0]) && /A comment to keep/.test(lis[1]), 'newest first: ' + lis.join(' | '));
    await fp.keyboard.press('Escape');
  });
  await check('R62 with storage blocked, Save shows "Feedback not saved. Your browser is blocking local storage. Copy your comments instead." and Copy feedback copies what you typed', async () => {
    const bt = await fresh({ blockStorage: true });
    await visit(bt, '#/overview');
    const bp = bt.page;
    await bp.locator('.shell__rail-menu').click();
    await bp.getByRole('menuitem', { name: 'Give feedback' }).click();
    const d = dialog(bp, 'Tell us what you think');
    await d.waitFor();
    await d.getByRole('radio', { name: 'No' }).check();
    await d.getByLabel('What would make it more useful?').fill('Blocked comment');
    await d.getByRole('button', { name: 'Save feedback' }).click();
    await settle(bp);
    eq(await text(d.locator('[role="alert"] p')), FEEDBACK_BLOCKED, 'error text');
    eq(await d.count(), 1, 'dialog open');
    await d.getByRole('button', { name: 'Copy feedback' }).click();
    await settle(bp, 300);
    const clip = await clipboard(bp);
    ok(/no/i.test(clip) && clip.includes('Blocked comment') && clip.includes('2026-10-06'), 'clipboard: ' + clip);
    eq(await d.locator('.ovl-saved').count(), 0, 'nothing listed as saved');
    eq(await primaries(bp, '[role="dialog"]'), ['Save feedback'], 'still one filled button');
    const v = await axe(bp);
    eq(v.map((x) => x.id), [], 'axe with the error showing: ' + JSON.stringify(v));
  });

  /* ============================================================ SETTINGS (R64, R63, R73) */
  const st = await fresh();
  await visit(st, '#/overview');
  const sp = st.page;
  const gear = sp.locator('button[aria-label="Settings"]');
  const drawer = () => dialog(sp, 'Settings');
  const radio = (group, name) => drawer().getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true });
  const sumLine = () => text(sp.locator('.ov-sum__eq'));
  await check('R64 the gear opens the Settings drawer: banner, renewal rate 3, 5 (default, selected) and 8 per cent, close to cap 80, 85 (default, selected) and 90 per cent', async () => {
    await gear.focus(); await sp.keyboard.press('Enter');
    await drawer().waitFor();
    ok((await text(drawer())).includes(ASSUMPTIONS_BANNER), 'banner');
    eq(await drawer().getByRole('radiogroup', { name: 'Renewal rate' }).getByRole('radio').allInnerTexts().then((a) => a.map(norm)), ['3%', '5%', '8%'], 'renewal options');
    eq(await drawer().getByRole('radiogroup', { name: 'Close to cap threshold' }).getByRole('radio').allInnerTexts().then((a) => a.map(norm)), ['80%', '85%', '90%'], 'near-cap options');
    eq(await radio('Renewal rate', '5%').getAttribute('aria-checked'), 'true', 'default rate');
    eq(await radio('Close to cap threshold', '85%').getAttribute('aria-checked'), 'true', 'default threshold');
    ok((await text(drawer())).includes('5% is a prototype assumption.'), 'the 5% is called a prototype assumption');
    eq(await text(drawer().locator('.ovl-now__value')), HEADLINE, 'the headline as it stands');
    eq(await drawer().locator('.kx-drawer__foot button').allInnerTexts().then((a) => a.map(norm)), ['Close settings'], 'footer');
  });
  await check('R64 choosing 8% moves the headline in the drawer to £6.8m and, once closed, the Overview headline, the renewals card (£1,720,800) and the sum line (£6,790,538)', async () => {
    await radio('Renewal rate', '8%').click();
    await settle(sp, 250);
    eq(await text(drawer().locator('.ovl-now__value')), '£6.8m across 15 contracts flagged as opportunities to investigate', 'drawer headline');
    ok((await text(drawer())).includes('Changed'), 'the group says it changed');
    eq(JSON.parse(await stored(sp, 'kontor-assumptions')), { renewalRate: 0.08 }, 'stored');
    await drawer().getByRole('button', { name: 'Close settings' }).click(); await settle(sp, 300);
    eq(await h1Text(sp), '£6.8m across 15 contracts flagged as opportunities to investigate', 'Overview h1');
    eq(await sumLine(), '£4,172,000 + £642,478 + £1,720,800 + £255,260 = £6,790,538', 'sum line');
    ok(((await sp.locator('.ov-hero a.kviz-card').nth(2).getAttribute('aria-label')) || '').includes('£1.7m, 12 contracts'), 'renewals card');
    ok((await activeInfo(sp)).label === 'Settings', 'focus returned to the gear: ' + JSON.stringify(await activeInfo(sp)));
  });
  await check('R64 the assumption survives a reload and shows in the drawer; 3% gives £5.7m (£5,715,038); back to 5% restores £6.1m and removes the stored key', async () => {
    await visit(st, '#/overview');
    eq(await h1Text(sp), '£6.8m across 15 contracts flagged as opportunities to investigate', 'after reload');
    await gear.click(); await drawer().waitFor();
    eq(await radio('Renewal rate', '8%').getAttribute('aria-checked'), 'true', '8% selected after reload');
    await radio('Renewal rate', '3%').click(); await settle(sp, 200);
    eq(await text(drawer().locator('.ovl-now__value')), '£5.7m across 15 contracts flagged as opportunities to investigate', '3% headline');
    ok((await sumLine()).endsWith('= £5,715,038'), await sumLine());
    await radio('Renewal rate', '5%').click(); await settle(sp, 200);
    eq(await text(drawer().locator('.ovl-now__value')), HEADLINE, '5% headline');
    eq(await stored(sp, 'kontor-assumptions'), '{}', 'the default is stored as no assumption');
    ok((await sumLine()).endsWith('= £6,145,238'), await sumLine());
  });
  await check('R64 the close to cap threshold (80% and 90%) is applied: the headline stays £6.1m, the choice is stored, and keyboard arrows change it', async () => {
    await radio('Close to cap threshold', '80%').click(); await settle(sp, 200);
    eq(JSON.parse(await stored(sp, 'kontor-assumptions')), { nearCapThreshold: 0.8 }, 'stored 80');
    eq(await text(drawer().locator('.ovl-now__value')), HEADLINE, 'headline at 80%');
    await radio('Close to cap threshold', '80%').focus();
    await sp.keyboard.press('ArrowRight'); await sp.keyboard.press('ArrowRight'); await settle(sp, 200);
    eq(await radio('Close to cap threshold', '90%').getAttribute('aria-checked'), 'true', 'ArrowRight twice selects 90%');
    eq(JSON.parse(await stored(sp, 'kontor-assumptions')), { nearCapThreshold: 0.9 }, 'stored 90');
    await radio('Close to cap threshold', '85%').click(); await settle(sp, 150);
    eq(await stored(sp, 'kontor-assumptions'), '{}', 'default again');
  });
  await check('R64 keyboard: ArrowRight on the renewal rate selects 8% (headline £6.8m) and ArrowLeft twice goes to 3%; Escape closes the drawer and returns focus to the gear', async () => {
    await radio('Renewal rate', '5%').focus();
    await sp.keyboard.press('ArrowRight'); await settle(sp, 200);
    ok((await text(drawer().locator('.ovl-now__value'))).startsWith('£6.8m'), 'ArrowRight -> 8%');
    await sp.keyboard.press('ArrowLeft'); await sp.keyboard.press('ArrowLeft'); await settle(sp, 200);
    ok((await text(drawer().locator('.ovl-now__value'))).startsWith('£5.7m'), 'ArrowLeft twice -> 3%');
    await radio('Renewal rate', '5%').click();
    await sp.keyboard.press('Escape'); await settle(sp, 300);
    eq(await drawer().count(), 0, 'closed');
    ok((await activeInfo(sp)).label === 'Settings', 'focus returned to the gear');
  });
  await check('Settings: the theme switch ("Dark mode") is on in dark; turning it off sets light and the header toggle follows (aria-pressed false); the header toggle and the switch stay in step both ways', async () => {
    const toggle = sp.locator('.shell__theme-toggle');
    await gear.click(); await drawer().waitFor();
    const sw = drawer().getByRole('switch', { name: 'Dark mode' });
    eq(await sw.isChecked(), true, 'on in dark');
    await drawer().locator('label:has(input[role="switch"]) .kx-track').click(); await settle(sp, 150);
    eq(await sp.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'light');
    eq(await toggle.getAttribute('aria-pressed'), 'false', 'header toggle');
    eq(await stored(sp, 'kontor-theme'), 'light', 'stored');
    await setTheme(sp, 'dark');                                         // the same path the header toggle takes (attribute, storage, event)
    eq(await sw.isChecked(), true, 'the switch follows a change made elsewhere');
    await sw.press('Space'); await settle(sp, 150);
    eq(await sp.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'keyboard Space turns dark off');
    await sw.press('Space'); await settle(sp, 150);
    eq(await sp.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'and back on');
    await sp.keyboard.press('Escape'); await settle(sp, 300);
    await toggle.click(); await settle(sp, 150);                        // header toggle: dark -> light
    await gear.click(); await drawer().waitFor();
    eq(await drawer().getByRole('switch', { name: 'Dark mode' }).isChecked(), false, 'switch reads the header toggle');
    await sp.keyboard.press('Escape'); await settle(sp, 300);
    await toggle.click(); await settle(sp, 150);
    eq(await toggle.getAttribute('aria-pressed'), 'true', 'back to dark');
  });

  /* ---- reset (R63, R73) */
  const rs = await fresh();
  await visit(rs, '#/overview');
  const rsp = rs.page;
  const radio2 = (page, group, name) => dialog(page, 'Settings').getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true }).getAttribute('aria-checked');
  await check('R63 Reset demo changes: the confirm dialog opens first with Cancel focused; Cancel (and Escape) change nothing; the line in the drawer says what has been changed', async () => {
    await rsp.evaluate(() => {
      localStorage.setItem('kontor-triage', JSON.stringify({ 'F-C-005-overCap': 'explained' }));
      localStorage.setItem('kontor-assumptions', JSON.stringify({ renewalRate: 0.08 }));
      localStorage.setItem('kontor-feedback', JSON.stringify([{ at: '2026-10-06T10:00:00.000Z', answer: 'yes', comment: 'Seeded', asOf: '2026-10-06' }]));
    });
    await visit(rs, '#/overview');
    const changed = await h1Text(rsp);
    ok(changed !== HEADLINE, 'the seeded changes move the headline: ' + changed);
    await rsp.locator('button[aria-label="Settings"]').click();
    const dr = dialog(rsp, 'Settings');
    await dr.waitFor();
    const line = await text(dr.locator('.ovl-changed'));
    ok(line.startsWith('Changed on this device:') && line.includes('1 review') && line.includes('1 feedback entry') && line.includes('1 assumption'), line);
    await dr.getByRole('button', { name: 'Reset demo changes' }).click();
    const c = rsp.getByRole('alertdialog', { name: 'Reset your changes?' });
    await c.waitFor();
    ok((await text(c)).includes('This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device.'), 'description');
    eq((await activeInfo(rsp)).label, 'Cancel', 'Cancel is focused first');
    eq((await c.locator('button').allInnerTexts()).map(norm), ['Cancel', 'Reset changes'], 'buttons');
    await c.getByRole('button', { name: 'Cancel' }).click(); await settle(rsp, 250);
    eq(await c.count(), 0, 'closed by Cancel');
    ok(!!(await stored(rsp, 'kontor-triage')) && !!(await stored(rsp, 'kontor-assumptions')) && !!(await stored(rsp, 'kontor-feedback')), 'Cancel changed nothing in storage');
    eq(await h1Text(rsp), changed, 'headline unchanged');
    eq((await activeInfo(rsp)).label, 'Reset demo changes', 'focus back on the Reset button');
    eq(await toasts(rsp).count(), 0, 'no toast after Cancel');
    await dr.getByRole('button', { name: 'Reset demo changes' }).click(); await c.waitFor();
    await rsp.keyboard.press('Escape'); await settle(rsp, 250);
    eq(await c.count(), 0, 'Escape closed only the confirm');
    eq(await dr.count(), 1, 'the drawer is still open');
    ok(!!(await stored(rsp, 'kontor-triage')), 'Escape changed nothing');
  });
  await check('R63 confirming "Reset changes" clears reviews, assumptions and feedback (the theme stays), restores £6.1m and shows "Changes reset. The demo is back to its starting numbers."', async () => {
    const dr = dialog(rsp, 'Settings');
    await dr.getByRole('button', { name: 'Reset demo changes' }).click();
    const c = rsp.getByRole('alertdialog', { name: 'Reset your changes?' });
    await c.waitFor();
    eq(await c.getByRole('button', { name: 'Reset changes' }).evaluate((b) => getComputedStyle(b).backgroundColor !== getComputedStyle(document.body).backgroundColor), true, 'a filled destructive button');
    await c.getByRole('button', { name: 'Reset changes' }).click(); await settle(rsp, 350);
    eq(await c.count(), 0, 'closed');
    ok((await toastText(rsp)).includes(RESET_TOAST), 'toast: ' + await toastText(rsp));
    eq(await toasts(rsp).first().evaluate((e) => e.className.includes('kx-toast--success')), true, 'success tone');
    for (const k of ['kontor-triage', 'kontor-assumptions', 'kontor-feedback', 'kontor-matches', 'kontor-handcheck']) { const v = await stored(rsp, k); ok(v === null, `${k} is cleared: ${v}`); }
    eq(await stored(rsp, 'kontor-theme'), 'dark', 'the theme is kept');
    eq(await h1Text(rsp), HEADLINE, 'headline restored');
    eq(await text(dr.locator('.ovl-changed')), 'Nothing has been changed yet.', 'the line says so');
    eq((await activeInfo(rsp)).label, 'Reset demo changes', 'focus stays in the drawer');
    eq(await radio2(rsp, 'Renewal rate', '5%'), 'true', '5% selected again');
  });
  await check('R73 the reset is the only destructive action: the Reset button is outline, the destructive variant appears only inside the confirm dialog', async () => {
    const dr = dialog(rsp, 'Settings');
    eq(await primaries(rsp, '[role="dialog"]'), ['Close settings'], 'filled buttons in the drawer');
    const bg = await dr.getByRole('button', { name: 'Reset demo changes' }).evaluate((b) => getComputedStyle(b).backgroundColor);
    ok(bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent', 'the Reset trigger is outline: ' + bg);
  });
  await check('Settings: copy lint (no exclamation mark, no emoji, no "saving"), sentence-case headings, buttons are [Verb]+[Object]', async () => {
    await lint(rsp, '[role="dialog"]', 'settings');
    await rsp.keyboard.press('Escape');
  });

  /* ============================================================ DEMO GUIDE (R22) */
  const gt = await fresh();
  await visit(gt, '#/overview');
  const gp = gt.page;
  const guideBtn = gp.getByRole('button', { name: 'Open demo guide' });
  await check('R22 Open demo guide opens the drawer with four steps in order, each with its talking point (live numbers) and its link', async () => {
    await guideBtn.focus(); await gp.keyboard.press('Enter');
    const d = dialog(gp, 'Demo guide');
    await d.waitFor();
    const steps = await d.locator('.ovl-step').evaluateAll((els) => els.map((e) => ({ title: e.querySelector('h4').textContent.trim(), text: e.querySelector('p').textContent.replace(/\s+/g, ' ').trim(), link: e.querySelector('a, button').textContent.trim(), href: e.querySelector('a') ? e.querySelector('a').getAttribute('href') : null })));
    eq(steps.map((s) => s.title), ['Headline', 'Renewal radar', 'One over-cap contract', 'Close'], 'titles');
    ok(steps[0].text.startsWith('Start with the number: £6.1m across 15 contracts flagged as opportunities to investigate. Point at the caveat and say why it is there.'), steps[0].text);
    eq(steps[1].text, 'Show what is coming up in the next 3, 6 and 12 months. Then show the two notice dates that have already passed.', 'step 2');
    ok(steps[2].text.includes('Open the Highways reactive maintenance flag. £8.4m has been paid against a £5.0m maximum. Click View clause and land on clause 14.3, page 23.'), steps[2].text);
    ok(steps[3].text.includes("This is one council's contracts and spend. Imagine your full estate."), steps[3].text);
    eq(steps.map((s) => s.link), ['Open overview', 'Open renewal radar', 'Open the highways flag', 'Give feedback'], 'link labels');
    eq(steps.map((s) => s.href), ['#/overview', '#/renewals', '#/opportunities?flag=F-C-005-overCap', null], 'link targets');
    eq(await d.locator('.ovl-steps').evaluate((o) => o.tagName), 'OL', 'an ordered list');
  });
  await check('R22 "Also try" gives the two optional moves; "Presenter notes" has the notes: fictional by design, about 62% flagged by design, 5% is a prototype assumption, ingestion not shown, the Sefton lesson', async () => {
    const d = dialog(gp, 'Demo guide');
    const extras = await text(d.locator('section[aria-labelledby="ovl-dg-extras"]'));
    ok(extras.includes('Mark the highways flag as Explained and watch the headline drop. That is the caveat in action.'), extras);
    ok(extras.includes('Confirm the Larchmont match on Cap vs spend, matches tab, and watch Grounds maintenance move from close to cap to over cap.'), extras);
    const n = d.locator('section[aria-labelledby="ovl-dg-notes"]');
    eq(await text(n.locator('h3')), 'Presenter notes', 'heading');
    const t = await text(n);
    ok(/The data is fictional by design/.test(t), 'fictional by design');
    ok(/15 of 24 contracts \(62\.5%\) carry a flag/.test(t) && /dense on purpose/.test(t), 'about 62% by design: ' + t);
    ok(/5% renewal rate is a prototype assumption/.test(t), '5% assumption');
    ok(/Ingestion is not shown/.test(t), 'ingestion');
    ok(/Sefton, 2019/.test(t) && /potential savings shrank once outliers were tested/.test(t), 'Sefton');
    eq(await n.locator('li').count(), 5, 'five notes');
  });
  await check('R22 following a step link closes the drawer and lands on the described screen (Renewal radar: the h1 takes focus)', async () => {
    const d = dialog(gp, 'Demo guide');
    await d.getByRole('link', { name: 'Open renewal radar' }).click();
    await gp.waitForFunction(() => location.hash === '#/renewals');
    await settle(gp, 400);
    eq(await dialog(gp, 'Demo guide').count(), 0, 'drawer closed');
    await h1Is(gp, 'Renewal radar');
    eq(await h1Text(gp), 'Renewal radar', 'h1');
    eq((await activeInfo(gp)).tag, 'H1', 'focus on the page heading');
  });
  await check('R22 "Open the highways flag" lands on #/opportunities with the Highways flag drawer open (£3,350,000); "Open overview" keeps focus on the opener', async () => {
    await go(gp, '#/overview');
    await guideBtn.click();
    const d = dialog(gp, 'Demo guide');
    await d.waitFor();
    await d.getByRole('link', { name: 'Open the highways flag' }).click();
    await gp.waitForFunction(() => location.hash === '#/opportunities?flag=F-C-005-overCap');
    await settle(gp, 500);
    eq(await dialog(gp, 'Demo guide').count(), 0, 'guide closed');
    const flag = gp.locator('[role="dialog"]');
    eq(await flag.count(), 1, 'one dialog open: the flag drawer');
    ok((await text(flag)).includes('£3,350,000'), 'flag drawer text: ' + (await text(flag)).slice(0, 200));
    ok((await activeInfo(gp)).inDialog, 'focus is inside the flag drawer: ' + JSON.stringify(await activeInfo(gp)));
    await gp.keyboard.press('Escape'); await settle(gp, 300);
    await go(gp, '#/overview');
    await guideBtn.click(); await d.waitFor();
    await d.getByRole('link', { name: 'Open overview' }).click(); await settle(gp, 300);
    eq(await d.count(), 0, 'closed');
    ok((await activeInfo(gp)).label === 'Open demo guide', 'same route: focus returns to the opener: ' + JSON.stringify(await activeInfo(gp)));
  });
  await check('R22 step 4 "Give feedback" opens the feedback dialog on top of the guide; Escape closes only the feedback, a second Escape closes the guide and focus returns to "Open demo guide"', async () => {
    await guideBtn.click();
    const d = dialog(gp, 'Demo guide');
    await d.waitFor();
    await d.getByRole('button', { name: 'Give feedback' }).click();
    const f = dialog(gp, 'Tell us what you think');
    await f.waitFor();
    eq(await d.count(), 1, 'the guide stays under it');
    await gp.keyboard.press('Escape'); await settle(gp, 250);
    eq(await f.count(), 0, 'feedback closed');
    eq(await d.count(), 1, 'guide still open');
    eq((await activeInfo(gp)).label, 'Give feedback', 'focus back on the step button');
    await gp.keyboard.press('Escape'); await settle(gp, 300);
    eq(await d.count(), 0, 'guide closed');
    eq((await activeInfo(gp)).label, 'Open demo guide', 'focus back on the opener');
  });
  await check('R22 Demo guide copy lint: no exclamation mark, no emoji, buttons [Verb]+[Object], "saving" only in the presenter notes', async () => {
    await guideBtn.click();
    const d = dialog(gp, 'Demo guide');
    await d.waitFor();
    await lint(gp, '[role="dialog"]', 'guide', { allowSaving: true });
    const outside = await d.evaluate((el) => { const c = el.cloneNode(true); c.querySelector('[aria-labelledby="ovl-dg-notes"]').remove(); return c.innerText; });
    ok(!/\bsavings?\b/i.test(outside), 'the word saving outside the presenter notes');
    await gp.keyboard.press('Escape');
  });

  /* ============================================================ HEADER HANDLERS (R5) */
  const hd = await fresh();
  await visit(hd, '#/roadmap');
  const hp = hd.page;
  await check('R5 Apps, Chat, Notifications and Account each show the toast "<Name> isn\'t part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo." and do not navigate', async () => {
    const before = await hashOf(hp);
    const buttons = [['Apps', hp.locator('.shell__tab', { hasText: 'Apps' })], ['Chat', hp.locator('.shell__tab', { hasText: 'Chat' })],
      ['Notifications', hp.locator('button[aria-label="Notifications"]')], ['Account', hp.locator('.shell__avatar')]];
    for (const [name, btn] of buttons) {
      await btn.click();
      await hp.locator('.kx-toast').first().waitFor({ timeout: 1000 });
      const t = await toastText(hp);
      ok(t.includes(inert(name)), `${name}: ${t}`);
      eq(await hashOf(hp), before, name + ' did not navigate');
      await hp.locator('.kx-toast__close').first().click().catch(() => {});
      await hp.evaluate(() => document.querySelectorAll('.kx-toast__close').forEach((b) => b.click()));
      await settle(hp, 120);
    }
  });
  await check('R5 Share copies the current address and says so; the toast has no exclamation mark', async () => {
    await hp.locator('button[aria-label="Share"]').click();
    await hp.locator('.kx-toast').first().waitFor({ timeout: 1000 });
    const t = await toastText(hp);
    ok(t.includes('Link copied to your clipboard.'), t);
    eq(await clipboard(hp), await hp.evaluate(() => location.href), 'the clipboard holds the address of this screen');
    ok(/#\/roadmap$/.test(await clipboard(hp)), 'it is the roadmap address');
    ok(!/!/.test(t), 'no exclamation mark');
  });
  await check('R5 the close-tab button returns to the Overview with a toast; Settings opens the drawer (R64) and Menu opens the menu; none is a dead control', async () => {
    await hp.locator('.shell__apptab-close').click();
    await hp.waitForFunction(() => location.hash === '#/overview');
    ok((await toastText(hp)).includes('Returned to the overview.'), await toastText(hp));
    await hp.locator('button[aria-label="Settings"]').click();
    await dialog(hp, 'Settings').waitFor();
    await hp.keyboard.press('Escape'); await settle(hp, 250);
    await hp.locator('.shell__rail-menu').click();
    await hp.locator('nav[aria-label="Menu"]').waitFor();
    await hp.keyboard.press('Escape');
  });

  /* ============================================================ keyboard, themes, viewports */
  await check('Keyboard: on the Roadmap and the Evidence page, Tab reaches every link in reading order and each stop shows a 2px ring', async () => {
    for (const hash of ['#/roadmap', '#/evidence']) {
      const t = await fresh();
      await visit(t, hash);
      await t.page.evaluate(() => document.querySelector('#shell-main h1').focus());
      const stops = [];
      for (let i = 0; i < 60; i += 1) {
        await t.page.keyboard.press('Tab');
        const s = await t.page.evaluate(() => {
          const el = document.activeElement;
          if (!el || !el.closest('#shell-main')) return null;
          const cs = getComputedStyle(el);
          return { label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, y: Math.round(el.getBoundingClientRect().top + document.getElementById('shell-main').scrollTop) };
        });
        if (!s) break;
        stops.push(s);
      }
      ok(stops.length >= (hash === '#/roadmap' ? 13 : 20), `${hash}: only ${stops.length} stops`);
      stops.forEach((s) => ok(s.ring, `${hash}: no visible ring on "${s.label}"`));
      if (hash === '#/evidence') {                                      // one column: the order down the page is the order of the stops (the Roadmap has side-by-side cards)
        const ys = stops.map((s) => s.y);
        for (let i = 1; i < ys.length; i += 1) ok(ys[i] >= ys[i - 1] - 4, `${hash}: tab order jumps back at "${stops[i].label}"`);
      }
    }
  });

  await check('axe (wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice): 0 violations on the Roadmap and Evidence in dark and light', async () => {
    for (const hash of ['#/roadmap', '#/evidence']) {
      const t = await fresh();
      await visit(t, hash);
      for (const theme of ['dark', 'light']) {
        await setTheme(t.page, theme);
        const v = await axe(t.page);
        eq(v.map((x) => x.id + ' ' + x.targets.join(';')), [], `${hash} ${theme}`);
      }
    }
  });

  await check('axe: 0 violations in dark and light with each overlay open: Menu, About, Feedback (with its error), Settings, Settings with the confirm dialog, Demo guide', async () => {
    const t = await fresh();
    const p = t.page;
    const opens = {
      Menu: async () => { await p.locator('.shell__rail-menu').click(); await p.locator('nav[aria-label="Menu"]').waitFor(); },
      About: async () => { await p.locator('.sample-banner__link').click(); await dialog(p, 'About this data').waitFor(); },
      Feedback: async () => { await p.locator('.shell__rail-menu').click(); await p.getByRole('menuitem', { name: 'Give feedback' }).click(); await dialog(p, 'Tell us what you think').waitFor(); },
      'Feedback error': async () => { await opens.Feedback(); await p.getByRole('button', { name: 'Save feedback' }).click(); await p.locator('[role="alert"]').waitFor(); },
      'Feedback saved list': async () => { await p.evaluate(() => localStorage.setItem('kontor-feedback', JSON.stringify(['yes', 'maybe', 'no', 'yes', 'maybe', 'no'].map((answer, i) => ({ at: `2026-10-06T10:0${i}:00.000Z`, answer, comment: 'Seeded comment number ' + i + ', long enough to wrap onto a second line in the saved list of the dialog.', asOf: '2026-10-06' }))))); await visit(t, '#/overview'); await opens.Feedback(); },
      Settings: async () => { await p.locator('button[aria-label="Settings"]').click(); await dialog(p, 'Settings').waitFor(); },
      'Settings changed': async () => { await p.evaluate(() => localStorage.setItem('kontor-assumptions', JSON.stringify({ renewalRate: 0.08, nearCapThreshold: 0.9 }))); await visit(t, '#/overview'); await opens.Settings(); },
      'Settings confirm': async () => { await opens.Settings(); await p.getByRole('button', { name: 'Reset demo changes' }).click(); await p.getByRole('alertdialog').waitFor(); },
      'Demo guide': async () => { await p.getByRole('button', { name: 'Open demo guide' }).click(); await dialog(p, 'Demo guide').waitFor(); },
    };
    for (const [name, open] of Object.entries(opens)) {
      await visit(t, '#/overview');
      if (name === 'Feedback saved list' || name === 'Settings changed') await p.evaluate(() => localStorage.clear());
      await open();
      for (const theme of ['dark', 'light']) {
        await setTheme(p, theme);
        const v = await axe(p);
        eq(v.map((x) => x.id + ' ' + x.targets.join(';')), [], `${name} ${theme}`);
      }
      await p.evaluate(() => localStorage.removeItem('kontor-feedback'));
    }
  });

  await check('Layout: no horizontal page scroll on the Roadmap and Evidence at 1440x900, 1366x768, 1024x768 and 390x844 (a wide table scrolls inside its own region)', async () => {
    for (const hash of ['#/roadmap', '#/evidence']) {
      for (const [name, vp] of Object.entries(VIEWPORTS)) {
        const t = await fresh({ viewport: vp });
        await visit(t, hash);
        const o = await noOverflow(t.page);
        ok(o.doc <= 0 && o.main <= 0, `${hash} ${name}: ${JSON.stringify(o)}`);
        const regions = await t.page.$$eval('#shell-main .kx-table-wrap', (ws) => ws.map((w) => ({ scrolls: w.scrollWidth > w.clientWidth + 1, focusable: w.getAttribute('tabindex') === '0', named: !!w.getAttribute('aria-label'), role: w.getAttribute('role') })));
        regions.filter((r) => r.scrolls).forEach((r) => ok(r.focusable && r.named && r.role === 'region', `${hash} ${name}: a table that scrolls must be a focusable named region: ${JSON.stringify(r)}`));
      }
    }
  });

  await check('Phone: at 390x844 the header Menu button opens the menu below it, inside the screen, and the Roadmap and Evidence stay usable', async () => {
    const t = await fresh({ viewport: VIEWPORTS.phone });
    await visit(t, '#/roadmap');
    const btn = t.page.locator('.shell__slot--phone-only button[aria-label="Menu"]');
    await btn.click();
    await t.page.locator('nav[aria-label="Menu"]').waitFor();
    await settle(t.page, 200);
    const box = await t.page.locator('nav[aria-label="Menu"]').boundingBox();
    ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844, 'inside the screen: ' + JSON.stringify(box));
    const bb = await btn.boundingBox();
    ok(box.y >= bb.y + bb.height - 4, 'below the button');
    eq(await t.page.locator('nav[aria-label="Menu"] [role="menuitem"]').count(), 5, 'items');
    await t.page.keyboard.press('Escape');
    ok((await axe(t.page)).length === 0, 'axe on the phone');
  });

  await check('Phone: at 390x844 the Evidence and Roadmap tables become lists of cards with the same words and links (nine cases, ten features, four illustrative rows), and nothing scrolls sideways', async () => {
    const t = await fresh({ viewport: VIEWPORTS.phone });
    await visit(t, '#/evidence');
    const p = t.page;
    eq(await p.locator('#shell-main table').count(), 0, 'no table on a phone');
    const items = await p.locator('#shell-main .rt-item').evaluateAll((els) => els.map((e) => ({ name: e.querySelector('.rt-item__title').textContent.replace(/\s+/g, ' ').trim(), fields: [...e.querySelectorAll('.rt-field')].map((f) => [f.querySelector('dt').textContent.trim(), f.querySelector('dd').textContent.replace(/\s+/g, ' ').trim()]) })));
    eq(items.length, 9, 'nine cards');
    EVIDENCE.forEach((e, i) => {
      ok(noHint(items[i].name).startsWith(norm(e.name)), 'case ' + e.name);
      eq(items[i].fields.map((f) => f[0]), ['When', 'What happened', 'Kontor feature it supports'], 'labels ' + e.name);
      eq(items[i].fields.map((f) => f[1]), [norm(e.when), norm(e.what), norm(e.feature)], 'values ' + e.name);
    });
    eq(await p.locator('#shell-main .rt-item .ev-ext[target="_blank"][rel*="noopener"][rel*="noreferrer"]').count(), 9, 'nine external links');
    eq((await noOverflow(p)).main, 0, 'no sideways scroll');
    await go(p, '#/roadmap');
    eq(await p.locator('#shell-main table').count(), 0, 'no table on the roadmap either');
    eq(await p.locator('#shell-main .rm-status-panel .rt-item').count(), 10, 'ten features');
    eq(await p.locator('#shell-main .rm-illustrative .rt-item').count(), 4, 'four illustrative rows');
    const txt = await text(p.locator('#shell-main .rm-illustrative'));
    ILLUSTRATIVE.forEach((r) => r.slice(1).forEach((c) => ok(txt.includes(norm(c)), 'illustrative cell ' + c)));
    ok((await text(p.locator('#shell-main .rm-status-panel'))).includes(NOT_IN), 'the label is on the phone too');
    eq((await noOverflow(p)).main, 0, 'roadmap: no sideways scroll');
    ok((await axe(p)).length === 0, 'axe on the phone roadmap');
  });

  await check('Light theme: the overlays are legible: Settings, Feedback and About screenshots exist at light and the text contrast passes axe (see the axe check)', async () => {
    const t = await fresh({ theme: 'light' });
    await visit(t, '#/roadmap');
    eq(await t.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'light');
    await t.page.locator('.sample-banner__link').click();
    await dialog(t.page, 'About this data').waitFor();
    const bg = await dialog(t.page, 'About this data').evaluate((e) => getComputedStyle(e).backgroundColor);
    ok(/^rgb\(2[0-9]{2}, 2[0-9]{2}, 2[0-9]{2}\)$/.test(bg), 'a light surface: ' + bg);
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
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
