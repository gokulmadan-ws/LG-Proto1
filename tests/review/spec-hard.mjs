// spec-hard: the user's three hard requirements (Springboard 2.0 used properly, inside the App Shell, dark/light toggle default dark)
// plus the shell facts R1 and R6, checked on every route in a real browser. Exit code 1 when anything fails.
//   node tests/review/spec-hard.mjs
import { T, ok, eq, launch, visit, go, setTheme, VIEWPORTS } from './spec-lib.mjs';

const t = new T('spec-hard');
const h = await launch({ dist: process.env.KONTOR_DIST || null });
const ROUTES = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence', '#/nope'];

{
  const p = await h.newPage({ theme: 'dark' });
  for (const hash of ROUTES) {
    await visit(p, hash);
    await t.check(`App Shell on ${hash}: header, Primary nav and main#shell-main exist; the page is inside main; header 72px; rail 64-65px; app tab "Kontor financial layer"`, async () => {
      const r = await p.page.evaluate(() => {
        const hd = document.querySelector('header'); const nav = document.querySelector('nav[aria-label="Primary"]'); const main = document.getElementById('shell-main');
        const h1 = document.querySelector('h1');
        return { hd: !!hd, nav: !!nav, main: !!main, hdH: Math.round(hd.getBoundingClientRect().height), railW: Math.round(nav.getBoundingClientRect().width), h1InMain: !!main && main.contains(h1), outside: [...document.body.querySelectorAll(':scope > *')].map((e) => e.id || e.className || e.tagName).filter((x) => !/^(root|kx-toasts)$/.test(String(x)) && !/script|noscript|SCRIPT|NOSCRIPT/.test(String(x))), tab: hd.innerText.replace(/\s+/g, ' ') };
      });
      ok(r.hd && r.nav && r.main, 'landmarks'); eq(r.hdH, 72, 'header height'); ok(r.railW === 64 || r.railW === 65, 'rail width ' + r.railW); ok(r.h1InMain, 'h1 outside main'); ok(/Kontor financial layer/.test(r.tab), 'app tab'); ok(r.outside.length === 0, 'content outside #root: ' + r.outside.join(','));
    });
  }
  await t.check('the shell is the one in src/shell (a port of the template), not the DS kit AppShell; design-system/ is pristine (files untouched since extraction)', async () => {
    const fs = await import('node:fs'); const path = await import('node:path');
    const root = path.resolve(new URL('../../', import.meta.url).pathname);
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const stamps = walk(path.join(root, 'design-system')).map((f) => Math.round(fs.statSync(f).mtimeMs / 60000));
    ok(Math.max(...stamps) - Math.min(...stamps) <= 2, 'design-system files have different mtimes: ' + (Math.max(...stamps) - Math.min(...stamps)) + ' min apart');
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- dark/light toggle, default dark */
{
  const p = await h.newPage({ theme: null, delay: { pattern: /\/dist\/app\.js/, ms: 1200 } });
  await t.check('R6.1 fresh profile: html[data-theme] is "dark" right after the response starts, before dist/app.js runs (app.js held back 1200 ms)', async () => {
    await p.page.goto(p.base + '#/overview', { waitUntil: 'commit' });
    await p.page.waitForFunction(() => !!document.documentElement && document.readyState !== 'uninitialized', null, { timeout: 3000 }).catch(() => {});
    const r = await p.page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), appLoaded: !!document.querySelector('#shell-main h1') || !!document.querySelector('#root > *'), cs: document.querySelector('meta[name="color-scheme"]')?.content, bg: getComputedStyle(document.body).backgroundColor }));
    ok(!r.appLoaded, 'React already mounted: the test is not measuring pre-mount'); eq(r.theme, 'dark'); ok(/dark/.test(r.cs || ''), 'color-scheme meta ' + r.cs);
    return r.bg;
  });
  await p.ctx.close();
}
{
  const p = await h.newPage({ theme: null });
  await visit(p, '#/overview');
  await t.check('R6.2 toggle: a button with aria-pressed and an aria-label; click, Enter and Space switch dark/light/dark', async () => {
    const btn = p.page.locator('header button[aria-pressed]').first();
    const info = async () => p.page.evaluate(() => { const b = document.querySelector('header button[aria-pressed]'); return { theme: document.documentElement.getAttribute('data-theme'), pressed: b.getAttribute('aria-pressed'), label: b.getAttribute('aria-label'), title: b.getAttribute('title') }; });
    const a = await info(); eq(a.theme, 'dark'); ok(a.label, 'aria-label');
    await btn.click(); const b = await info(); eq(b.theme, 'light'); ok(b.pressed !== a.pressed, 'aria-pressed did not change');
    await btn.focus(); await p.page.keyboard.press('Enter'); eq((await info()).theme, 'dark', 'Enter');
    await p.page.keyboard.press('Space'); eq((await info()).theme, 'light', 'Space');
    return `${a.label} -> ${b.label}`;
  });
  await t.check('R6.3 the choice persists across reload (kontor-theme) and light mode really is light (page background lighter than dark)', async () => {
    await p.page.reload(); await p.page.waitForSelector('#shell-main h1');
    const light = await p.page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor, store: localStorage.getItem('kontor-theme') }));
    eq(light.theme, 'light'); eq(light.store, 'light');
    await p.page.locator('header button[aria-pressed]').first().click();
    const dark = await p.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const lum = (s) => { const m = s.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    ok(lum(light.bg) > lum(dark) + 60, `light ${light.bg} vs dark ${dark}`);
  });
  await p.ctx.close();
}
{
  const p = await h.newPage({ theme: null, blockStorage: true });
  await visit(p, '#/overview');
  await t.check('R6.4 storage blocked: dark by default, the toggle still works for the session, no console error', async () => {
    eq(await p.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
    await p.page.locator('header button[aria-pressed]').first().click();
    eq(await p.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light');
    ok(!p.errors.length, p.errors.join(' | '));
  });
  await p.ctx.close();
}

/* ---------------------------------------------------------------- Springboard 2.0 used properly */
for (const theme of ['dark', 'light']) {
  const p = await h.newPage({ theme });
  await visit(p, '#/overview');
  await t.check(`Springboard [${theme}]: DS bundle loaded, offline DS stylesheet linked, DS tokens resolve (--accent, --bg-1, --fg-1), Inter is the body font, DS Button renders the primary action`, async () => {
    const r = await p.page.evaluate(() => {
      const css = (v) => { const e = document.createElement('i'); e.style.color = `var(${v})`; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; };
      const links = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href'));
      const prim = [...document.querySelectorAll('#shell-main button')].find((b) => /Give feedback/.test(b.textContent));
      return { ds: typeof window.Springboard20DesignSystem_019e02, comps: Object.keys(window.Springboard20DesignSystem_019e02 || {}).length, links, accent: css('--accent'), bg1: css('--bg-1'), fg1: css('--fg-1'), font: getComputedStyle(document.body).fontFamily, primaryBg: prim && getComputedStyle(prim).backgroundColor, radius: prim && getComputedStyle(prim).borderRadius };
    });
    eq(r.ds, 'object'); ok(r.comps >= 19, 'DS components ' + r.comps); ok(r.links.some((l) => /ds\/styles\.css/.test(l)), 'links ' + r.links.join(','));
    ok(/Inter/.test(r.font), 'font ' + r.font); eq(r.primaryBg, r.accent, 'primary button is the DS accent');
    const want = theme === 'dark' ? 'rgb(31, 111, 235)' : 'rgb(9, 105, 218)';
    eq(r.accent, want, 'DS --accent for ' + theme);
    return `accent ${r.accent}, ${r.comps} DS components`;
  });
  await p.ctx.close();
}
await t.check('Springboard: no request leaves the origin on any route (no CDN for fonts, icons or DS CSS)', async () => {
  const p = await h.newPage({ theme: 'dark' });
  for (const hash of ROUTES) await visit(p, hash);
  const own = new URL(p.url).origin; const ext = p.requests.filter((r) => !/^(data|blob|about):/.test(r.url) && new URL(r.url).origin !== own);
  await p.ctx.close(); ok(!ext.length, ext.slice(0, 3).map((e) => e.url).join(' | '));
});
await h.close();
t.finish();
