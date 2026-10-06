// Visual-design review checks (reviewer "vis"). Plain node, runs against dist/ via tests/lib/harness.mjs:
//   node tests/review/vis-visual-checks.mjs
// Exits non-zero when any check fails. Every check encodes a defect measured in the review (docs/review/vis.md), so a
// failing line means the defect is still present; a passing line means it was fixed.
import { launch, visit } from '../lib/harness.mjs';

const results = [];
async function check(id, name, fn) {
  try {
    const r = await fn();
    const ok = r === true || (r && r.ok === true);
    results.push({ id, name, ok, detail: r && r.detail ? r.detail : '' });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${name}${r && r.detail ? ' :: ' + r.detail : ''}`);
  } catch (e) {
    results.push({ id, name, ok: false, detail: String(e.message).split('\n')[0] });
    console.log(`FAIL ${id} ${name} :: threw ${String(e.message).split('\n')[0]}`);
  }
}

const h = await launch();
try {
  // V01 Rail Menu stays reachable on a short desktop window (200% zoom of 1440x900 = 720x450 CSS px).
  await check('V01', 'rail Menu button is inside the visible shell at 720x450', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 720, height: 450 } });
    await visit(t, '#/overview'); await t.page.waitForTimeout(400);
    const r = await t.page.evaluate(() => {
      const m = document.querySelector('.shell__rail-menu'); if (!m) return { bottom: 0, vh: innerHeight, scrollable: false };
      const b = m.getBoundingClientRect(); const rail = document.querySelector('.shell__rail');
      const oy = getComputedStyle(rail).overflowY;
      return { bottom: Math.round(b.bottom), vh: innerHeight, scrollable: /auto|scroll/.test(oy) && rail.scrollHeight > rail.clientHeight };
    });
    await t.ctx.close();
    return { ok: r.bottom <= r.vh || r.scrollable, detail: `menu bottom ${r.bottom} of ${r.vh}px, rail scrollable ${r.scrollable}` };
  });

  // V02 The chart table twin must not widen the whole document (sr-only text escaping .kviz-tablewrap).
  for (const [W, H] of [[1024, 768], [390, 844]]) {
    await check('V02', `Cap vs spend "Show table" does not widen the document at ${W}x${H}`, async () => {
      const t = await h.newPage({ theme: 'dark', viewport: { width: W, height: H } });
      await visit(t, '#/spend'); await t.page.waitForTimeout(300);
      await t.page.getByRole('button', { name: /Show table/ }).first().click(); await t.page.waitForTimeout(300);
      const extra = await t.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await t.ctx.close();
      return { ok: extra <= 0, detail: `document is ${extra}px wider than the window` };
    });
  }

  // V03 The exact-value tooltip on the headline figure must stay inside the content area (not over header, banner or rail).
  await check('V03', 'headline exact-value tooltip does not cover the sample banner or rail at 1440x900', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 1440, height: 900 } });
    await visit(t, '#/overview'); await t.page.mouse.move(2, 2);
    await t.page.locator('.kviz-hero').hover(); await t.page.waitForTimeout(500);
    const r = await t.page.evaluate(() => {
      const tip = document.querySelector('.kviz-tip').getBoundingClientRect();
      const ban = document.querySelector('.sample-banner').getBoundingClientRect();
      const rail = document.querySelector('.shell__rail').getBoundingClientRect();
      const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return { banner: hit(tip, ban), rail: hit(tip, rail), tipTop: Math.round(tip.top), bannerTop: Math.round(ban.top) };
    });
    await t.ctx.close();
    return { ok: !r.banner && !r.rail, detail: `tooltip top ${r.tipTop}, banner top ${r.bannerTop}, overlaps banner ${r.banner}, overlaps rail ${r.rail}` };
  });

  // V04 Phone banner: on a touch device the About link must not make the banner much taller than its text.
  await check('V04', 'sample banner on a 390px touch phone is at most 72px tall', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 390, height: 844 }, hasTouch: true });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    const hgt = await t.page.evaluate(() => Math.round(document.querySelector('.sample-banner').getBoundingClientRect().height));
    await t.ctx.close();
    return { ok: hgt <= 72, detail: `banner is ${hgt}px tall` };
  });

  // V05 Phone radar rows: the supplier name must stay readable next to the Auto-renews pill.
  await check('V05', 'radar row supplier name keeps at least 80px beside the Auto-renews pill at 390px', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 390, height: 844 } });
    await visit(t, '#/renewals'); await t.page.waitForTimeout(500);
    const widths = await t.page.evaluate(() => {
      const out = [];
      for (const row of document.querySelectorAll('.kviz-rl__row')) {
        if (!row.querySelector('.kviz-rl__auto')) continue;
        const leaf = [...row.querySelectorAll('*')].find((e) => e.children.length === 0 && /Ltd|LLP|Trust|Services|Telecom/.test(e.textContent) && !e.closest('.kviz-rl__auto'));
        if (leaf) out.push(Math.round(leaf.getBoundingClientRect().width));
      }
      return out;
    });
    await t.ctx.close();
    return { ok: widths.length > 0 && widths.every((w) => w >= 80), detail: `supplier text widths beside the pill: ${JSON.stringify(widths)}` };
  });

  // V06 Evidence table at 1024: the fourth column (the feature each case supports) must not be hidden behind a sideways scroll.
  await check('V06', 'Evidence table fits its panel at 1024x768', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 1024, height: 768 } });
    await visit(t, '#/evidence'); await t.page.waitForTimeout(400);
    const r = await t.page.evaluate(() => { const w = document.querySelector('#shell-main .kx-table-wrap'); return w ? { sw: w.scrollWidth, cw: w.clientWidth } : null; });
    await t.ctx.close();
    return { ok: !!r && r.sw <= r.cw + 1, detail: r ? `table ${r.sw}px in a ${r.cw}px region` : 'no table found' };
  });

  // V07 Page headers: every primary page shows the same eyebrow so titles do not jump when moving between pages.
  await check('V07', 'Method and Roadmap h1 sit at the same offset as the other primary pages (1440x900)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 1440, height: 900 } });
    const tops = {};
    for (const r of ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/contracts', '#/method', '#/roadmap']) {
      await visit(t, r); await t.page.waitForTimeout(250);
      tops[r] = await t.page.evaluate(() => Math.round(document.querySelector('#shell-main h1').getBoundingClientRect().top - document.querySelector('#shell-main').getBoundingClientRect().top));
    }
    await t.ctx.close();
    const vals = Object.values(tops);
    return { ok: Math.max(...vals) - Math.min(...vals) <= 2, detail: JSON.stringify(tops) };
  });

  // V08 The theme toggle glyph must not read as a second settings cog in light mode.
  await check('V08', 'light-mode theme toggle icon differs from the Settings gear', async () => {
    const t = await h.newPage({ theme: 'light', viewport: { width: 1440, height: 900 } });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    const r = await t.page.evaluate(() => {
      const icon = (sel) => { const i = document.querySelector(sel + ' i, ' + sel + ' svg'); return i ? (i.getAttribute('class') || 'svg') : '?'; };
      return { toggle: icon('.shell__theme-toggle'), gear: icon('button[aria-label="Settings"]') };
    });
    await t.ctx.close();
    return { ok: !/sun/.test(r.toggle), detail: `toggle "${r.toggle}", settings "${r.gear}" (fa-sun at 14px reads as a cog beside the gear)` };
  });

  // V09 Opportunities: at 1366x768 at least two ranked rows should be fully visible (presenter density).
  await check('V09', 'Opportunities shows two full rows at 1366x768', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 1366, height: 768 } });
    await visit(t, '#/opportunities'); await t.page.waitForTimeout(500);
    const full = await t.page.evaluate(() => { const bottom = document.querySelector('#shell-main').getBoundingClientRect().bottom; return [...document.querySelectorAll('.kviz-bl__row, .kviz-row')].filter((e) => e.getBoundingClientRect().bottom <= bottom + 1 && e.getBoundingClientRect().top >= 0).length; });
    await t.ctx.close();
    return { ok: full >= 2, detail: `${full} fully visible row(s)` };
  });

  // V10 Settings drawer: the destructive Reset button is reachable without scrolling at 1366x768.
  await check('V10', 'Settings drawer shows Reset demo changes without scrolling at 1366x768', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 1366, height: 768 } });
    await visit(t, '#/overview'); await t.page.locator('button[aria-label="Settings"]').click(); await t.page.waitForTimeout(600);
    const r = await t.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Reset demo changes/.test(x.textContent)); const q = b.getBoundingClientRect(); return { bottom: Math.round(q.bottom), vh: innerHeight }; });
    await t.ctx.close();
    return { ok: r.bottom <= r.vh, detail: `Reset button bottom ${r.bottom} of ${r.vh}px` };
  });
} finally {
  await h.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
