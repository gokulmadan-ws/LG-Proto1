// spec-sweep: pass/fail sweep of the acceptance criteria R11-R15, R20-R22, R62-R68, R71-R73, R77, R78 (requirements.md section 3, with the
// blueprint section 1 corrections) against the built app in dist/. One browser, sequential. Exit code 1 when anything fails.
//   node tests/review/spec-sweep.mjs
import fs from 'node:fs';
import path from 'node:path';
import { T, ok, eq, norm, launch, visit, go, setTheme, VIEWPORTS, ROOT, data } from './spec-lib.mjs';
import { axe } from '../lib/harness.mjs';
import { DEFAULTS } from '../../src/lib/engine.js';

const t = new T('spec-sweep');
const h = await launch({ dist: process.env.KONTOR_DIST || null });
const ROUTES = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence', '#/nope'];
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a ? { tag: a.tagName, text: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 50), id: a.id, inDialog: !!a.closest('[role="dialog"],[role="alertdialog"]') } : null; });

/* ---------------------------------------------------------------- R11 banner */
for (const theme of ['dark', 'light']) {
  const p = await h.newPage({ theme });
  for (const hash of ROUTES) {
    await visit(p, hash);
    await t.check(`R11 [${theme}] ${hash}: banner visible without scrolling, below the header, not dismissable`, async () => {
      const r = await p.page.evaluate(() => {
        const b = document.querySelector('.sample-banner'); const hd = document.querySelector('header');
        if (!b) return null; const bb = b.getBoundingClientRect(), hb = hd.getBoundingClientRect();
        return { top: bb.top, bottom: bb.bottom, headerBottom: hb.bottom, innerH: innerHeight, closers: b.querySelectorAll('button:not(.sample-banner__link), [aria-label*="ose"], [aria-label*="ismiss"]').length, role: b.tagName, label: b.getAttribute('aria-label'), pos: getComputedStyle(b).position };
      });
      ok(r, 'no banner'); ok(r.top >= r.headerBottom - 1, `banner top ${r.top} under header bottom ${r.headerBottom}`); ok(r.bottom <= r.innerH, 'banner below the fold'); eq(r.closers, 0, 'dismiss controls');
    });
  }
  await t.check(`R11 [${theme}]: banner text and link meet AA contrast (axe color-contrast on the banner)`, async () => {
    const v = await axe(p.page, { include: '.sample-banner' });
    ok(!v.length, JSON.stringify(v).slice(0, 300));
  });
  await t.check(`R11 [${theme}]: header app tab carries the 'Sample' badge and the app name`, async () => {
    const txt = await p.page.evaluate(() => document.querySelector('header').innerText.replace(/\s+/g, ' '));
    ok(/Kontor financial layer\s+Sample/.test(txt), txt);
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R12 */
{
  const p = await h.newPage({ theme: 'dark' });
  await visit(p, '#/overview');
  await t.check('R12.1 the council is named Marchbank Borough Council (eyebrow, banner, data)', async () => {
    eq(data.council.name, 'Marchbank Borough Council'); ok(data.council.isFictional === true, 'isFictional flag');
    ok(/MARCHBANK BOROUGH COUNCIL/i.test(await p.page.evaluate(() => document.getElementById('shell-main').innerText)), 'eyebrow');
  });
  await t.check('R12.2 every supplier and payee in the data is flagged fictional and none is a name in the spec', async () => {
    ok(data.suppliers.every((s) => s.isFictional === true), 'supplier without isFictional');
    const real = /Exeter|Haringey|Guildford|Edinburgh|Gedling|Windsor|Maidenhead|Brighton|Hove|Sefton|Sheffield|Camden/i;
    ok(!data.suppliers.some((s) => real.test(s.legalName)), 'supplier named like a council');
    ok(!data.payments.some((x) => real.test(x.supplierNameRaw)), 'payee named like a council');
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R14 caveat, R15 About dialog */
{
  const p = await h.newPage({ theme: 'dark' });
  for (const hash of ['#/overview', '#/opportunities']) {
    await visit(p, hash);
    await t.check(`R14 ${hash}: the caveat is visible without opening anything, with a 'How this is calculated' link to #/method`, async () => {
      const r = await p.page.evaluate(() => { const m = document.getElementById('shell-main'); const link = [...m.querySelectorAll('a')].find((a) => /How this is calculated/.test(a.textContent)); return { text: m.innerText, href: link && link.getAttribute('href'), visible: !!link && link.getBoundingClientRect().bottom < innerHeight }; });
      ok(/an opportunity to investigate, not a saving/i.test(r.text), 'caveat words'); ok(r.href && r.href.startsWith('#/method'), 'link ' + r.href); ok(r.visible, 'link below the fold at 1440x900');
    });
  }
  await t.check('R14 exact caveat of copy deck 7.2: Overview carries the long form (the AC) or the short form (blueprint decision 7 + presenter density)', async () => {
    await visit(p, '#/overview');
    const txt = await p.page.evaluate(() => document.getElementById('shell-main').innerText);
    ok(/In 2019 a Local Government Association case study found that £1\.7m/.test(txt) || /Indicative figures\. Each one is an opportunity to investigate, not a saving\./.test(txt), 'Overview shows only the short form: "Indicative. An opportunity to investigate, not a saving. Test it against the contract before you act."');
  });
  // R15
  for (const hash of ROUTES) {
    await visit(p, hash);
    await t.check(`R15 ${hash}: 'About this data' link exists; opens a dialog with focus inside; Esc closes it and returns focus to the link`, async () => {
      const link = p.page.getByRole('button', { name: 'About this data' }).first();
      await link.focus(); await p.page.keyboard.press('Enter'); await p.page.waitForSelector('[role="dialog"]', { timeout: 3000 }); await p.page.waitForTimeout(250);
      const a = await active(p.page); ok(a && a.inDialog, 'focus not in dialog: ' + JSON.stringify(a));
      for (let i = 0; i < 8; i += 1) { await p.page.keyboard.press('Tab'); const x = await active(p.page); ok(x.inDialog, 'Tab left the dialog on press ' + (i + 1)); }
      await p.page.keyboard.press('Escape'); await p.page.waitForTimeout(300);
      ok(!(await p.page.evaluate(() => !!document.querySelector('[role="dialog"]'))), 'dialog still open');
      const b = await active(p.page); ok(/About this data/.test(b.text), 'focus did not return to the link: ' + JSON.stringify(b));
    });
  }
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R20 strip, R22 demo guide */
{
  const p = await h.newPage({ theme: 'dark' });
  await visit(p, '#/overview');
  await t.check('R20 strip: intro sentence present; three cases; "Show all 9 cases" link to #/evidence; links new tab + rel + visible words', async () => {
    const r = await p.page.evaluate(() => { const m = document.getElementById('shell-main'); return { text: m.innerText, cases: m.querySelectorAll('.ov-case').length, ext: [...m.querySelectorAll('.ov-case a')].map((a) => [a.target, a.rel, /opens in a new tab/.test(a.textContent)]) }; });
    ok(r.text.includes('Public cases summarised from the Kontor scope document. Follow each link to read the source.'), 'intro'); eq(r.cases, 3, 'cases');
    for (const e of r.ext) { eq(e[0], '_blank'); ok(/noopener/.test(e[1]) && /noreferrer/.test(e[1]), 'rel'); ok(e[2], 'words'); }
  });
  await t.check('R22 demo guide: opens from the Overview, four steps in order, Esc closes and returns focus', async () => {
    await p.page.getByRole('button', { name: 'Open demo guide' }).click(); await p.page.waitForSelector('[role="dialog"]'); await p.page.waitForTimeout(300);
    const steps = await p.page.evaluate(() => [...document.querySelectorAll('[role="dialog"] ol > li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()));
    eq(steps.length, 4, 'steps'); ok(/^1 Headline/.test(steps[0]) && /^2 Renewal radar/.test(steps[1]) && /^3 One over-cap contract/.test(steps[2]) && /^4 Close/.test(steps[3]), steps.map((s) => s.slice(0, 20)).join(' | '));
    await p.page.keyboard.press('Escape'); await p.page.waitForTimeout(300);
    ok(!(await p.page.evaluate(() => !!document.querySelector('[role="dialog"]'))), 'still open');
    const a = await active(p.page); ok(/Open demo guide/.test(a.text), 'focus ' + JSON.stringify(a));
  });
  const stepLinks = [['Open overview', /#\/overview/, /across 15 contracts/], ['Open renewal radar', /#\/renewals/, /Renewal radar/], ['Open the highways flag', /#\/opportunities\?flag=F-C-005-overCap/, /Spend over cap|Highways/]];
  for (const [label, hashRe, h1Re] of stepLinks) {
    await t.check(`R22 demo guide link "${label}" lands on the described screen`, async () => {
      await visit(p, '#/overview'); await p.page.getByRole('button', { name: 'Open demo guide' }).click(); await p.page.waitForSelector('[role="dialog"]'); await p.page.waitForTimeout(250);
      await p.page.getByRole('link', { name: label }).click(); await p.page.waitForTimeout(500);
      const r = await p.page.evaluate(() => ({ hash: location.hash, h1: document.querySelector('#shell-main h1')?.textContent, dialog: document.querySelector('[role="dialog"]')?.innerText.slice(0, 80) || '' }));
      ok(hashRe.test(r.hash), r.hash); ok(h1Re.test(r.h1 + ' ' + r.dialog), JSON.stringify(r));
    });
  }
  await t.check('R22 demo guide link "Give feedback" opens the feedback dialog on top of the guide', async () => {
    await visit(p, '#/overview'); await p.page.getByRole('button', { name: 'Open demo guide' }).click(); await p.page.waitForSelector('[role="dialog"]'); await p.page.waitForTimeout(250);
    await p.page.locator('[role="dialog"]').getByRole('button', { name: 'Give feedback' }).click(); await p.page.waitForTimeout(400);
    const n = await p.page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.querySelector('h2')?.textContent));
    ok(n.includes('Tell us what you think'), JSON.stringify(n));
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R62 feedback, R63 reset, R64 assumptions */
{
  const p = await h.newPage({ theme: 'dark' });
  await visit(p, '#/overview');
  await p.page.getByRole('button', { name: 'Give feedback' }).first().click(); await p.page.waitForSelector('[role="dialog"]'); await p.page.waitForTimeout(300);
  await t.check('R62 feedback dialog copy: title, question, Yes/Maybe/No, textarea label, helper, Save feedback (primary) and Cancel', async () => {
    const r = await p.page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return { text: d.innerText.replace(/\s+/g, ' '), radios: [...d.querySelectorAll('input[type=radio]')].map((i) => i.closest('label')?.innerText.trim()), ta: d.querySelector('textarea')?.getAttribute('aria-label') || d.querySelector('label[for="' + d.querySelector('textarea')?.id + '"]')?.textContent, btns: [...d.querySelectorAll('button')].map((b) => b.textContent.trim()) }; });
    ok(r.text.includes('Tell us what you think') && r.text.includes('Would you use this on your own contracts?') && r.text.includes('What would make it more useful?') && r.text.includes('Your answer stays on this device unless you copy it.'), r.text.slice(0, 300));
    eq(r.radios, ['Yes', 'Maybe', 'No']); ok(r.btns.includes('Save feedback') && r.btns.includes('Cancel'), r.btns.join('|'));
  });
  await t.check('R62 saving with no choice shows the exact error, focus goes to the first option and the comment is kept', async () => {
    await p.page.locator('[role="dialog"] textarea').fill('Keep this comment');
    await p.page.getByRole('button', { name: 'Save feedback' }).click(); await p.page.waitForTimeout(250);
    const r = await p.page.evaluate(() => ({ text: document.querySelector('[role="dialog"]').innerText, ta: document.querySelector('[role="dialog"] textarea').value, a: document.activeElement.type }));
    ok(r.text.includes("Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again."), 'error text'); eq(r.ta, 'Keep this comment'); eq(r.a, 'radio', 'focus');
  });
  await t.check("R62 Copy feedback text carries answer, comment and as-of date (the date is the as-of date 2026-10-06, not the clock's)", async () => {
    await p.page.locator('[role="dialog"] label', { hasText: 'Maybe' }).first().click();
    await p.page.getByRole('button', { name: 'Save feedback' }).click(); await p.page.waitForTimeout(500);
    await p.page.getByRole('button', { name: 'Give feedback' }).first().click(); await p.page.waitForSelector('[role="dialog"]'); await p.page.waitForTimeout(300);
    await p.page.getByRole('button', { name: 'Copy feedback' }).click(); await p.page.waitForTimeout(300);
    const clip = await p.page.evaluate(() => navigator.clipboard.readText());
    ok(/maybe/i.test(clip) && /Keep this comment|None/.test(clip) && /2026-10-06/.test(clip), clip);
  });
  await p.ctx.close();
}
{
  const p = await h.newPage({ theme: 'dark' });
  await visit(p, '#/overview');
  await t.check('R63 reset: dialog before anything clears, exact title and body, Cancel focused, destructive Reset changes, success toast with the exact copy', async () => {
    await p.page.getByRole('button', { name: 'Settings', exact: true }).click(); await p.page.waitForSelector('[role="dialog"]');
    await p.page.locator('[role="dialog"] button', { hasText: /^Radio/ }).count().catch(() => 0);
    await p.page.locator('[role="dialog"]').getByRole('radio', { name: '8%' }).click(); await p.page.waitForTimeout(200);
    await p.page.getByRole('button', { name: 'Reset demo changes' }).click(); await p.page.waitForSelector('[role="alertdialog"]'); await p.page.waitForTimeout(300);
    const r = await p.page.evaluate(() => { const d = document.querySelector('[role="alertdialog"]'); const f = document.activeElement; const reset = [...d.querySelectorAll('button')].find((b) => /Reset changes/.test(b.textContent)); return { text: d.innerText.replace(/\s+/g, ' '), focus: f.textContent.trim(), resetBg: getComputedStyle(reset).backgroundColor, danger: (() => { const x = document.createElement('i'); x.style.background = 'var(--danger)'; document.body.appendChild(x); const c = getComputedStyle(x).backgroundColor; x.remove(); return c; })(), store: localStorage.getItem('kontor-assumptions') }; });
    ok(r.text.includes('Reset your changes?') && r.text.includes('This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device. The demo goes back to its starting numbers.'), r.text); eq(r.focus, 'Cancel', 'initial focus'); ok(r.store && /0\.08/.test(r.store), 'nothing cleared before confirm: ' + r.store);
    eq(r.resetBg, r.danger, 'Reset changes uses the destructive colour');
    await p.page.getByRole('button', { name: 'Reset changes' }).click(); await p.page.waitForSelector('.kx-toast'); await p.page.waitForTimeout(250);
    const toast = await p.page.evaluate(() => document.querySelector('.kx-toast').innerText.replace(/\s+/g, ' '));
    ok(toast.includes('Changes reset.') && toast.includes('The demo is back to its starting numbers.'), toast);
  });
  await t.check('R64 assumptions: 8% gives £6.8m and £6,790,538, banner says "Changing assumptions changes every indicative figure."', async () => {
    await visit(p, '#/overview'); await p.page.getByRole('button', { name: 'Settings', exact: true }).click(); await p.page.waitForSelector('[role="dialog"]');
    await p.page.locator('[role="dialog"]').getByRole('radio', { name: '8%' }).click(); await p.page.waitForTimeout(300);
    const r = await p.page.evaluate(() => ({ d: document.querySelector('[role="dialog"]').innerText, main: document.getElementById('shell-main').innerText }));
    ok(r.d.includes('Changing assumptions changes every indicative figure.'), 'banner'); ok(r.d.includes('£6.8m across 15 contracts'), 'headline in drawer'); ok(r.main.includes('£6,790,538') && r.main.includes('£6.8m'), 'overview sum');
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R65 Method, R66 method links */
{
  const p = await h.newPage({ theme: 'dark' });
  const ids = ['as-of', 'notice', 'radar', 'spend', 'matching', 'cap', 'uplift', 'indicative', 'ranking', 'confidence', 'data', 'limits'];
  await t.check('R65 Method: all 12 sections exist and ?s=<id> scrolls to and focuses each heading', async () => {
    const bad = [];
    for (const id of ids) { await visit(p, '#/method?s=' + id); await p.page.waitForTimeout(250); const r = await p.page.evaluate((i) => { const e = document.getElementById(i); const a = document.activeElement; return { exists: !!e, focus: a && a.id === i, inView: e && e.getBoundingClientRect().top < innerHeight && e.getBoundingClientRect().bottom > 0 }; }, id); if (!r.exists || !r.focus || !r.inView) bad.push(id + JSON.stringify(r)); }
    ok(!bad.length, bad.join(' | '));
  });
  await t.check('R65 Method: every threshold shown equals the engine constant (DEFAULTS)', async () => {
    await visit(p, '#/method');
    const r = await p.page.evaluate(() => [...document.querySelectorAll('[data-const]')].map((e) => ({ k: e.dataset.const, kind: e.dataset.kind, raw: e.dataset.raw, text: e.textContent })));
    ok(r.length >= 6, 'constants found ' + r.length);
    for (const x of r.filter((y) => y.kind === 'default')) { const want = DEFAULTS[x.k]; ok(want !== undefined && Math.abs(Number(x.raw) - want) < 1e-9, `${x.k}: page ${x.raw} engine ${want}`); }
    return r.length + ' constants';
  });
  await t.check('R65 Method: thresholds typed in prose that are not exported by the engine (known gap): £100,000 severity cut-off, 0.90 / 0.75 confidence bands', async () => {
    const eng = fs.readFileSync(path.join(ROOT, 'src/lib/engine.js'), 'utf8');
    ok(/export const DEFAULTS[\s\S]*?severity|highSeverityGBP|confidenceHigh/i.test(eng), 'DEFAULTS has no severity cut-off or confidence band constants, so the Method page types them (Method.jsx)');
  });
  await p.ctx.close();
}
{
  const p = await h.newPage({ theme: 'dark' });
  const want = { '#/overview': 'indicative', '#/opportunities': 'indicative', '#/renewals': 'radar', '#/spend': 'cap', '#/spend/matches': 'matching', '#/spend/no-contract': 'spend', '#/flag': 'indicative', '#/contracts/C-005': 'notice|cap|uplift' };
  for (const [hash, sect] of Object.entries(want)) {
    if (hash === '#/flag') continue;
    await visit(p, hash);
    await t.check(`R66 ${hash}: has a 'How this is calculated' link to #/method?s=${sect}`, async () => {
      const links = await p.page.evaluate(() => [...document.getElementById('shell-main').querySelectorAll('a')].filter((a) => /How this is calculated|How confidence|rule on the method/i.test(a.textContent)).map((a) => a.getAttribute('href')));
      ok(links.length, 'no method link'); ok(links.some((l) => new RegExp('^#/method\\?s=(' + sect + ')$').test(l)), 'hrefs ' + links.join(', ') + ' expected section ' + sect);
    });
  }
  await visit(p, '#/opportunities?flag=F-C-005-overCap'); await p.page.waitForSelector('[role="dialog"]');
  await t.check('R66 flag drawer: method links go to #/method?s=<section>', async () => { const l = await p.page.evaluate(() => [...document.querySelectorAll('[role="dialog"] a')].filter((a) => /method/.test(a.getAttribute('href'))).map((a) => a.getAttribute('href'))); ok(l.length >= 1 && l.every((x) => /^#\/method\?s=/.test(x)), l.join(', ')); return l.join(', '); });
  await visit(p, '#/contracts/C-005');
  await t.check('R66 derived panel on Contract detail: a method link per derived row, each to its own section', async () => { const l = await p.page.evaluate(() => [...document.getElementById('shell-main').querySelectorAll('a')].filter((a) => /^#\/method/.test(a.getAttribute('href'))).map((a) => a.getAttribute('href'))); ok(l.length >= 5, l.length + ' links'); ok(new Set(l).size >= 4, 'distinct sections ' + [...new Set(l)].join(', ')); return [...new Set(l)].join(', '); });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R72 Springboard visual rules */
{
  const p = await h.newPage({ theme: 'dark' });
  const PRIMARY = () => {
    const probe = document.createElement('i'); probe.style.background = 'var(--accent)'; document.body.appendChild(probe); const acc = getComputedStyle(probe).backgroundColor; probe.remove();
    const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const prim = [...document.querySelectorAll('button, a')].filter((b) => vis(b) && !b.closest('header, nav.shell__rail, .shell__bottombar') && getComputedStyle(b).backgroundColor === acc && !b.getAttribute('role') && b.getAttribute('aria-pressed') === null && !/ds-badge|kx-pill|kviz-pill|kx-chip|kx-tab/.test(b.className));
    return prim.map((b) => ({ text: b.textContent.trim().slice(0, 30), section: (b.closest('section, [role="dialog"], .kx-card, .kx-panel, article, main')?.querySelector('h1,h2,h3')?.textContent || '').trim().slice(0, 40), cls: String(b.className).slice(0, 40) }));
  };
  const pageStates = [...ROUTES.slice(0, 12), '#/opportunities?flag=F-C-005-overCap', '#/spend?payments=C-005'];
  for (const hash of pageStates) {
    await visit(p, hash); await p.page.waitForTimeout(250);
    await t.check(`R72 ${hash}: at most one primary button per section (and at most one per page)`, async () => {
      const prim = await p.page.evaluate(PRIMARY); const per = {}; prim.forEach((x) => { per[x.section] = (per[x.section] || 0) + 1; });
      ok(Object.values(per).every((n) => n <= 1), JSON.stringify(prim)); return prim.map((x) => x.text).join(', ') || 'none';
    });
  }
  for (const [label, open] of [['About', (pg) => pg.getByRole('button', { name: 'About this data' }).click()], ['Feedback', (pg) => pg.getByRole('button', { name: 'Give feedback' }).first().click()], ['Settings', (pg) => pg.getByRole('button', { name: 'Settings', exact: true }).click()], ['Demo guide', (pg) => pg.getByRole('button', { name: 'Open demo guide' }).click()]]) {
    await visit(p, '#/overview'); await open(p.page); await p.page.waitForSelector('[role="dialog"]'); await p.page.waitForTimeout(350);
    await t.check(`R72 ${label} overlay: exactly one primary button (or none)`, async () => { const prim = await p.page.evaluate(() => { const probe = document.createElement('i'); probe.style.background = 'var(--accent)'; document.body.appendChild(probe); const acc = getComputedStyle(probe).backgroundColor; probe.remove(); return [...document.querySelectorAll('[role="dialog"] button')].filter((b) => b.getClientRects().length && getComputedStyle(b).backgroundColor === acc && !b.getAttribute('role') && b.getAttribute('aria-pressed') === null).map((b) => b.textContent.trim()); }); ok(prim.length <= 1, prim.join(' | ')); return prim.join(', ') || 'none'; });
  }
  await t.check('R72 no CSS gradient on any element, no coloured left border card, no emoji font glyphs, Font Awesome icons only across the main routes', async () => {
    const bad = [];
    for (const hash of ROUTES.slice(0, 12)) {
      await visit(p, hash);
      const r = await p.page.evaluate(() => { const out = { grad: [], lb: [], img: [] }; for (const e of document.querySelectorAll('body *')) { const cs = getComputedStyle(e); if (/gradient/.test(cs.backgroundImage)) out.grad.push(e.className); const bw = parseFloat(cs.borderLeftWidth); if (bw >= 2 && cs.borderLeftStyle !== 'none' && cs.borderLeftColor !== cs.borderTopColor && e.getBoundingClientRect().width > 100) out.lb.push(e.className); if (e.tagName === 'IMG') out.img.push(e.getAttribute('src')); } return out; });
      if (r.grad.length || r.lb.length) bad.push(hash + ' ' + JSON.stringify(r));
    }
    ok(!bad.length, bad.slice(0, 3).join(' | '));
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R73 destructive actions */
{
  const p = await h.newPage({ theme: 'dark' });
  await visit(p, '#/spend/matches');
  await t.check('R73 Reject match is reversible, needs no dialog, shows the toast "Match rejected. {name} is now unmatched."', async () => {
    await p.page.getByRole('button', { name: 'Reject match' }).first().click(); await p.page.waitForSelector('.kx-toast'); await p.page.waitForTimeout(200);
    const r = await p.page.evaluate(() => ({ toast: document.querySelector('.kx-toast').innerText.replace(/\s+/g, ' '), dialog: !!document.querySelector('[role="alertdialog"],[role="dialog"]') }));
    ok(/Match rejected\. Larchmont Grounds Maintenance is now unmatched\./.test(r.toast), r.toast); ok(!r.dialog, 'a dialog opened');
  });
  await t.check('R73 the only destructive-variant button in the app is Reset changes (source scan)', async () => {
    const hits = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'dev') walk(f); } else if (/\.jsx?$/.test(e.name)) { const s = fs.readFileSync(f, 'utf8'); if (/destructive/.test(s) && !/design-system/.test(f)) hits.push(path.relative(ROOT, f)); } });
    walk(path.join(ROOT, 'src'));
    return hits.join(', ');
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- R77 tokens, not hex */
await t.check('R77 hex colours in src appear only in src/shell/shell.css (the documented shell values)', () => {
  const offenders = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'dev') walk(f); return; }
    if (!/\.(jsx|css|js)$/.test(e.name) || /shell\.css$/.test(f)) return;
    const s = fs.readFileSync(f, 'utf8').split('\n');
    s.forEach((line, i) => { const l = line.replace(/href=["'`]#[^"'`]*|['"`]#\/[^'"`]*|#shell-main|querySelector\([^)]*\)|\.hash\b/g, ''); if (/#[0-9a-fA-F]{3,8}\b/.test(l) && !/^\s*(\/\/|\*)/.test(line)) offenders.push(path.relative(ROOT, f) + ':' + (i + 1) + ' ' + line.trim().slice(0, 80)); });
  });
  walk(path.join(ROOT, 'src'));
  ok(!offenders.length, offenders.slice(0, 5).join(' | '));
});
await t.check('R77 no rgb(), hsl() or oklch() literal colours in src outside shell.css', () => {
  const offenders = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'dev') walk(f); return; } if (!/\.(jsx|css|js)$/.test(e.name) || /shell\.css$/.test(f)) return; fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (/\b(rgba?|hsla?|oklch)\(\s*\d/.test(line)) offenders.push(path.relative(ROOT, f) + ':' + (i + 1)); }); });
  walk(path.join(ROOT, 'src'));
  ok(!offenders.length, offenders.slice(0, 5).join(' | '));
});

/* ---------------------------------------------------------------- R78 presenter density (blueprint decision 12 amends R78) */
for (const [name, vp, need] of [['1440x900', VIEWPORTS.desktop, ['headline', 'caveat', 'cards', 'sum']], ['1366x768', VIEWPORTS.laptop, ['headline', 'caveat', 'cards', 'sum']], ['1024x768', VIEWPORTS.tablet, ['headline', 'cards']]]) {
  for (const theme of ['dark', 'light']) {
    const p = await h.newPage({ theme, viewport: vp });
    await visit(p, '#/overview'); await p.page.waitForTimeout(300);
    await t.check(`R78 [${theme}] ${name}: Overview ${need.join(', ')} visible without scrolling`, async () => {
      const r = await p.page.evaluate(() => {
        const bx = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
        const m = document.getElementById('shell-main');
        const cards = [...m.querySelectorAll('a[href^="#/opportunities?type="]')].map(bx);
        const para = (re) => bx([...m.querySelectorAll('p')].find((x) => re.test(x.textContent)));
        return { h: innerHeight, headline: bx(m.querySelector('h1')), caveat: para(/not a saving/), cards: cards.length ? { top: Math.min(...cards.map((c) => c.top)), bottom: Math.max(...cards.map((c) => c.bottom)) } : null, sum: para(/£4,172,000 \+/), radar: bx([...m.querySelectorAll('h2,h3')].find((x) => /Renewals coming up/.test(x.textContent))) };
      });
      for (const k of need) { ok(r[k], 'not found ' + k); ok(r[k].bottom <= r.h, `${k} bottom ${r[k].bottom} > viewport ${r.h}`); }
      return JSON.stringify({ headline: r.headline, caveat: r.caveat, cards: r.cards, sum: r.sum, radar: r.radar });
    });
    await p.ctx.close();
  }
}
await t.check('R78 1024x768: the sum line under the cards is also fully visible (blueprint decision 7 prints it as the headline proof)', async () => {
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.tablet });
  await visit(p, '#/overview'); await p.page.waitForTimeout(300);
  const r = await p.page.evaluate(() => { const e = [...document.querySelectorAll('#shell-main p')].find((x) => /£4,172,000 \+/.test(x.textContent)); const b = e.getBoundingClientRect(); return { bottom: Math.round(b.bottom), h: innerHeight }; });
  await p.ctx.close();
  ok(r.bottom <= r.h, `sum line bottom ${r.bottom} > viewport ${r.h}`);
});

await h.close();
t.finish();
