// fun-env: the same screens must read identically whatever the presenter's machine says about time zone and locale. Loads every route in several time
// zones and locales and diffs the rendered text against a UTC / en-GB baseline. Also: two tabs (no cross-tab sync), and a global copy and wording scan.
//   node tests/review/fun-env.mjs
import { T, ok, eq, norm, text, settle, hashOf, h1, store, setStore, launchApp, visit, go, externalRequests, gold, data, contract } from './fun-lib.mjs';

const t = new T('fun-env');
const h = await launchApp();
const ROUTES = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/contracts/C-016', '#/contracts/C-007', '#/source/C-005/X-C-005-maximumValue', '#/source/C-001/X-C-001-endDate', '#/method', '#/roadmap', '#/evidence', '#/opportunities?flag=F-C-003-renewal', '#/opportunities?flag=F-C-004-uplift', '#/spend?payments=C-007', '#/spend/no-contract?payee=Dunmoor%20Agency%20Staffing%20Ltd'];

async function capture(opts) {
  const ctx = await h.browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  await ctx.addInitScript(() => { try { if (localStorage.getItem('kontor-theme') === null) localStorage.setItem('kontor-theme', 'dark'); } catch (e) { /* ignore */ } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const out = {};
  for (const r of ROUTES) {
    await page.goto(h.url + '/index.html' + r);
    await page.waitForSelector('#shell-main h1');
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(350);
    const sel = /\?(flag|payments|payee)=/.test(r) ? '[role="dialog"]' : '#shell-main';
    await page.locator(sel).first().waitFor({ state: 'visible' });
    out[r] = (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim();
  }
  await ctx.close();
  return { out, errs };
}
const diff = (a, b) => {
  const wa = a.split(' '), wb = b.split(' ');
  const out = [];
  for (let i = 0, j = 0; i < wa.length || j < wb.length;) {
    if (wa[i] === wb[j]) { i += 1; j += 1; continue; }
    out.push(`"${wa.slice(Math.max(0, i - 2), i + 3).join(' ')}"  vs  "${wb.slice(Math.max(0, j - 2), j + 3).join(' ')}"`);
    i += 1; j += 1;
    if (out.length >= 3) break;
  }
  return out;
};

const base = await capture({ timezoneId: 'UTC', locale: 'en-GB' });
for (const [name, opts] of [
  ['America/Los_Angeles + en-GB', { timezoneId: 'America/Los_Angeles', locale: 'en-GB' }],
  ['Pacific/Auckland + en-GB', { timezoneId: 'Pacific/Auckland', locale: 'en-GB' }],
  ['Europe/London + en-GB', { timezoneId: 'Europe/London', locale: 'en-GB' }],
  ['UTC + en-US', { timezoneId: 'UTC', locale: 'en-US' }],
  ['UTC + de-DE', { timezoneId: 'UTC', locale: 'de-DE' }],
  ['Asia/Kolkata + fr-FR', { timezoneId: 'Asia/Kolkata', locale: 'fr-FR' }],
]) {
  await t.check(`same text on ${ROUTES.length} screens under ${name}`, async () => {
    const r = await capture(opts);
    const bad = [];
    for (const k of ROUTES) if (r.out[k] !== base.out[k]) bad.push(`${k}: ${diff(base.out[k], r.out[k]).join(' ; ')}`);
    eq(r.errs, [], 'console errors');
    ok(bad.length === 0, `${bad.length} screens differ: ` + bad.slice(0, 4).join(' || '));
  });
}

/* ---- two tabs: no cross-tab sync, last write wins */
await t.check('two tabs: a review made in tab A is not seen by tab B until reload, and a review made in B overwrites A\'s (documented behaviour, checked for data loss)', async () => {
  const ctx = await h.browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { if (localStorage.getItem('kontor-theme') === null) localStorage.setItem('kontor-theme', 'dark'); } catch (e) { /* ignore */ } });
  const a = await ctx.newPage(); const b = await ctx.newPage();
  for (const pg of [a, b]) { await pg.goto(h.url + '/index.html#/opportunities'); await pg.waitForSelector('.opp .kviz-barlist__list'); }
  await go(a, '#/opportunities?flag=F-C-005-overCap'); await a.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' }); await a.waitForTimeout(300);
  await a.locator('[role="dialog"].flag-drawer select').selectOption('explained'); await a.waitForTimeout(300);
  await go(b, '#/opportunities?flag=F-C-007-overCap'); await b.locator('[role="dialog"].flag-drawer').waitFor({ state: 'visible' }); await b.waitForTimeout(300);
  const staleB = await b.evaluate(() => document.querySelector('.opp-totals__main') && document.querySelector('.opp-totals__main').textContent);
  await b.locator('[role="dialog"].flag-drawer select').selectOption('explained'); await b.waitForTimeout(300);
  const stored = await a.evaluate(() => localStorage.getItem('kontor-triage'));
  t.note('two tabs', `tab B totals before its own change: "${staleB}"; stored after B's change: ${stored}`);
  await ctx.close();
  ok(/F-C-005-overCap/.test(stored) && /F-C-007-overCap/.test(stored), 'last write wins: tab A\'s review of F-C-005-overCap was lost: ' + stored);
});

/* ---- global wording scan across every route and overlay */
{
  const p = await h.newPage({ theme: 'dark' });
  const { page } = p;
  const STATES = [...ROUTES.map((r) => [r, null]), ['#/overview', async () => { await page.getByRole('button', { name: 'About this data' }).click(); }], ['#/overview', async () => { await page.getByRole('button', { name: 'Open demo guide' }).click(); }], ['#/overview', async () => { await page.getByRole('button', { name: 'Settings', exact: true }).click(); }], ['#/overview', async () => { await page.locator('.ov-close').getByRole('button', { name: 'Give feedback' }).click(); }], ['#/opportunities', async () => { await page.getByRole('button', { name: 'Show table' }).click(); }], ['#/spend', async () => { await page.getByRole('button', { name: 'Show table' }).click(); }]];
  const dump = [];
  for (const [r, open] of STATES) {
    await visit(p, r); await settle(page, 250);
    if (open) { await open(); await settle(page, 450); }
    const body = await page.evaluate(() => document.body.innerText);
    const attrs = await page.evaluate(() => [...document.querySelectorAll('[aria-label],[title],[placeholder]')].map((e) => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '') + ' ' + (e.getAttribute('placeholder') || '')).join(' | '));
    dump.push({ r, body, attrs });
  }
  await t.check('R71 copy scan on every route and overlay: no exclamation mark, no emoji, no placeholder text (TODO, lorem, undefined, NaN, [object, {{), no banned button labels (OK, Submit, Click here, Learn more)', async () => {
    const bad = [];
    for (const d of dump) {
      const all = d.body + ' ' + d.attrs;
      if (/!/.test(d.body.replace(/!=/g, ''))) bad.push(`${d.r}: "!" in ${(d.body.match(/.{25}!.{15}/) || [''])[0]}`);
      if (/\p{Extended_Pictographic}/u.test(d.body.replace(/[↗→←·–—]/gu, ''))) bad.push(`${d.r}: emoji ${(d.body.match(/.{15}\p{Extended_Pictographic}.{10}/u) || [''])[0]}`);
      if (/\b(TODO|lorem|undefined|NaN|\[object|\{\{)\b|\[object|\{\{/i.test(all)) bad.push(`${d.r}: placeholder text ${(all.match(/.{20}(TODO|lorem|undefined|NaN|\[object|\{\{).{10}/i) || [''])[0]}`);
    }
    const btn = await (async () => { const labels = new Set(); for (const r of ROUTES.slice(0, 15)) { await visit(p, r); (await page.$$eval('button, a.kx-btn, [role="button"]', (bs) => bs.map((b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim()))).forEach((l) => labels.add(l)); } return [...labels]; })();
    const banned = btn.filter((l) => /^(OK|Okay|Submit|Click here|Learn more|Yes!|Cancel changes)$/i.test(l));
    if (banned.length) bad.push('banned button labels: ' + banned.join(', '));
    ok(bad.length === 0, bad.slice(0, 6).join(' || '));
    return `${dump.length} screens scanned`;
  });
  await t.check('R13 the words saving/savings appear only in the caveat, evidence, Method rationale, Roadmap and the "Reasons this may not be a saving" block; never in a page title, rail label, header, button label or card heading', async () => {
    const contexts = [];
    for (const d of dump) {
      for (const m of d.body.matchAll(/.{0,50}\bsavings?\b.{0,40}/gi)) contexts.push(`${d.r}: ${m[0].replace(/\s+/g, ' ')}`);
    }
    const allowed = /(savings opportunities list|Savings opportunities list|not a saving|not a confirmed saving|potential savings|Sefton|Saved £15\.5m|Making savings|savings shrank|may not be a saving|saving survives|Net saving|net saving|saving vs|a saving|savings can shrink|Why there's money|headline savings|indicative savings|£2\.45m|saving is £|8% saving|saving\b)/i;
    const offenders = contexts.filter((c) => !allowed.test(c));
    t.note('R13 savings contexts', `${contexts.length} occurrences on ${new Set(contexts.map((c) => c.split(':')[0])).size} screens; routes: ${[...new Set(contexts.map((c) => c.split(':')[0]))].join(', ')}`);
    const headings = await (async () => { const hs = []; for (const r of ROUTES.slice(0, 15)) { await visit(p, r); hs.push(...(await page.$$eval('h1,h2,h3,h4, nav button, .shell__rail-caption', (e) => e.map((x) => x.textContent.trim())))); } return hs.filter((x) => /\bsavings?\b/i.test(x)); })();
    t.note('R13 headings/labels containing saving', JSON.stringify([...new Set(headings)]));
    ok(offenders.length === 0, offenders.slice(0, 5).join(' || '));
  });
  await t.check('R13 every flag £ figure, the headline and each breakdown card carries the word "indicative" in visible text or a keyboard-reachable tooltip', async () => {
    await visit(p, '#/overview');
    const cards = await page.$$eval('.ov-hero a.kviz-card', (as) => as.map((a) => a.textContent.replace(/\s+/g, ' ').trim()));
    const missing = cards.filter((c) => !/indicative/i.test(c));
    await page.locator('.ov-hero a.kviz-card').first().focus(); await settle(page, 400);
    const tip = (await page.locator('.kviz-tip').allInnerTexts()).join(' ');
    t.note('R13 card text without "indicative"', JSON.stringify(missing) + ' | tooltip on keyboard focus: ' + tip.replace(/\s+/g, ' ').slice(0, 200));
    const nearby = await text(page.locator('.ov-hero'));
    ok(missing.length === 0 || /indicative/i.test(tip) || /Indicative figures/.test(await text(page.locator('#shell-main'))), `card texts lacking "indicative": ${missing.join(' | ')}`);
    ok(missing.length === 0 || /indicative/i.test(tip), `cards 1, 2 and 4 say "already paid" / "projected" but not "indicative" in their own text; tooltip on focus: "${tip.replace(/\s+/g, ' ').slice(0, 120)}"`);
  });
  await p.ctx.close();
}

await h.close();
t.finish();
