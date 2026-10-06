// Smoke test for the shell, router, theme, offline behaviour and accessibility, plus the shared UI pieces (toast, confirm, error boundary). `npm test` runs it after the engine test.
//   node tests/smoke.mjs                  builds src/main.jsx into .scratch/smoke (never touches dist/), then tests it
//   node tests/smoke.mjs --dist dist      test an existing build (default build step is skipped)
//   node tests/smoke.mjs --dist .scratch/A1
//   node tests/smoke.mjs --standalone     also test dist/kontor-prototype.html from file:// (npm run standalone first)
//   node tests/smoke.mjs --only theme,axe run only the named groups: routes theme offline keyboard shell router ui axe layout standalone
//
// Views are tested generically (one h1, title suffix, no overflow, axe), so the same file keeps working while the
// stub views are replaced by the real ones.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { launch, visit, go, setTheme, axe, externalRequests, firstContentfulPaint, VIEWPORTS, ROOT } from './lib/harness.mjs';

const argv = process.argv.slice(2);
const flag = (k, d = null) => { const i = argv.indexOf('--' + k); return i === -1 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const only = flag('only') ? String(flag('only')).split(',') : null;
const want = (g) => !only || only.includes(g);

// ---------------------------------------------------------------------------------------------- mini runner
const results = [];
const group = (name) => console.log(`\n${name}`);
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`  ok    ${name}${detail ? '  (' + detail + ')' : ''}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    console.log(`  FAIL  ${name}\n        ${String(e.message).split('\n').join('\n        ')}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const eq = (a, b, what) => assert(JSON.stringify(a) === JSON.stringify(b), `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

// ---------------------------------------------------------------------------------------------- routes under test
// title: exact document.title page name (null = only the suffix is checked, the view may set its own title).
// rail: aria-label of the highlighted rail item, or null for none.
const SUFFIX = ' | Kontor financial layer';
const ROUTES = [
  { hash: '', title: 'Overview', rail: 'Overview' },
  { hash: '#/overview', title: 'Overview', rail: 'Overview' },
  { hash: '#/opportunities', title: 'Opportunities', rail: 'Opportunities' },
  { hash: '#/opportunities?type=overCap', title: 'Opportunities', rail: 'Opportunities' },
  { hash: '#/renewals', title: 'Renewal radar', rail: 'Renewal radar' },
  { hash: '#/spend', title: 'Cap vs spend', rail: 'Cap vs spend' },
  { hash: '#/spend/matches', title: null, rail: 'Cap vs spend' },
  { hash: '#/spend/no-contract', title: null, rail: 'Cap vs spend' },
  { hash: '#/contracts', title: 'Contracts', rail: 'Contracts' },
  { hash: '#/contracts/C-005', title: null, rail: 'Contracts' },
  { hash: '#/source/C-005/X-C-005-maximumValue', title: null, rail: 'Opportunities' },
  { hash: '#/source/C-005/X-C-005-maximumValue?from=renewals', title: null, rail: 'Renewal radar' },
  { hash: '#/method', title: 'How this is calculated', rail: null },
  { hash: '#/method?s=cap', title: null, rail: null },
  { hash: '#/roadmap', title: 'Roadmap', rail: 'Roadmap' },
  { hash: '#/evidence', title: null, rail: null },
  { hash: '#/guide', title: 'Guide', rail: null },
  { hash: '#/no-such-page', title: 'Page not found', rail: null },
  { hash: '#/spend/bogus', title: 'Page not found', rail: null },
];

// ---------------------------------------------------------------------------------------------- build
let dist = flag('dist');
if (!dist) {
  dist = '.scratch/smoke';
  console.log('Building src/main.jsx into .scratch/smoke ...');
  execFileSync('node', ['scripts/build.mjs', '--entry', 'src/main.jsx', '--outdir', dist], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
}
if (dist === 'dist') dist = null;           // the real dist/ is served as is
if (!existsSync(path.join(ROOT, 'dist', 'ds', 'styles.css'))) throw new Error('dist/ds/styles.css missing: run node scripts/ds-offline.mjs (build.mjs does it)');

const h = await launch({ dist });
const text = (page, sel) => page.locator(sel).first().innerText();
const rail = (page) => page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Primary"] [aria-current="page"]')].map((b) => b.getAttribute('aria-label')));

try {
  // ======================================================================== routes
  if (want('routes')) {
    group('Routes: one h1, document.title, rail highlight (fresh load, 1440x900, dark)');
    const t = await h.newPage({ theme: 'dark', hangExternal: true });
    for (const r of ROUTES) {
      await check(`${r.hash || '(empty hash)'}`, async () => {
        await visit(t, r.hash);
        const info = await t.page.evaluate(() => ({
          h1: document.querySelectorAll('h1').length,
          h1InMain: document.querySelectorAll('#shell-main h1').length,
          h1Text: (document.querySelector('h1') || {}).textContent || '',
          title: document.title,
        }));
        eq(info.h1, 1, 'h1 count');
        eq(info.h1InMain, 1, 'h1 inside main');
        assert(info.h1Text.trim().length > 0, 'h1 is empty');
        assert(info.title.endsWith(SUFFIX), `title "${info.title}" does not end with "${SUFFIX}"`);
        if (r.title) eq(info.title, r.title + SUFFIX, 'document.title');
        eq(await rail(t.page), r.rail ? [r.rail] : [], 'rail aria-current');
        return info.title;
      });
    }
    await check('Springboard bundle: components registered, only its own demo kit failed to mount (expected, #root does not exist yet)', async () => {
      await visit(t, '#/overview');
      const r = await t.page.evaluate(() => {
        const ds = window.Springboard20DesignSystem_019e02 || {};
        return { have: ['Button', 'Card', 'Tooltip', 'Toast', 'Tabs', 'Breadcrumb', 'Input', 'Select'].filter((k) => typeof ds[k] !== 'function'), failed: (ds.__errors || []).map((e) => e.path).filter((p) => !p.startsWith('ui_kits/')), firstChild: (document.getElementById('root').firstElementChild || {}).className };
      });
      eq(r.have, [], 'missing DS components'); eq(r.failed, [], 'DS components that failed to load'); eq(r.firstChild, 'shell', '#root first child (the DS demo app must not render)');
    });
    await t.ctx.close();
  }

  // ======================================================================== theme
  if (want('theme')) {
    group('Theme: default dark, toggle, persistence, blocked storage');
    await check('fresh profile is dark BEFORE React mounts', async () => {
      const t = await h.newPage({ theme: null, delay: { pattern: /\/dist\/app\.js(\?.*)?$/, ms: 1500 } });
      await t.page.goto(`${t.base}#/overview`, { waitUntil: 'commit' });
      await t.page.waitForFunction(() => document.documentElement.hasAttribute('data-theme'), null, { timeout: 4000 });
      const early = await t.page.evaluate(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        meta: document.querySelector('meta[name="color-scheme"]').getAttribute('content'),
        mounted: document.getElementById('root') ? document.getElementById('root').childElementCount : -1,
        stored: (() => { try { return localStorage.getItem('kontor-theme'); } catch (e) { return 'blocked'; } })(),
      }));
      eq(early.theme, 'dark', 'data-theme before mount');
      eq(early.meta, 'dark', 'meta color-scheme before mount');
      // -1 = #root not parsed yet (the page was caught very early), 0 = parsed but empty. Both mean React has not mounted.
      eq(early.mounted <= 0, true, 'React not mounted yet');
      eq(early.stored, null, 'nothing stored on a fresh profile');
      await t.page.waitForSelector('#shell-main h1', { timeout: 8000 });
      await t.ctx.close();
      return 'attribute set while #root is empty';
    });

    const t = await h.newPage({ theme: null });
    await visit(t, '#/overview');
    const state = () => t.page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      pressed: document.querySelector('.shell__theme-toggle').getAttribute('aria-pressed'),
      icon: document.querySelector('.shell__theme-toggle i').className,
      scheme: getComputedStyle(document.documentElement).colorScheme,
      pageBg: getComputedStyle(document.body).backgroundColor,
      canvas: getComputedStyle(document.querySelector('.shell__body')).backgroundColor,
      stored: (() => { try { return localStorage.getItem('kontor-theme'); } catch (e) { return 'blocked'; } })(),
    }));
    await check('default state: dark, aria-pressed true, moon icon, color-scheme dark', async () => {
      const s = await state();
      eq(s.theme, 'dark', 'theme'); eq(s.pressed, 'true', 'aria-pressed'); assert(/fa-moon/.test(s.icon), 'moon icon'); eq(s.scheme, 'dark', 'color-scheme');
      eq(s.canvas, 'rgb(8, 9, 11)', 'canvas'); eq(s.stored, null, 'localStorage untouched until the first toggle');
    });
    await check('toggle has an accessible name and is a button', async () => {
      const tag = await t.page.evaluate(() => { const b = document.querySelector('.shell__theme-toggle'); return [b.tagName, b.getAttribute('aria-label')]; });
      eq(tag, ['BUTTON', 'Dark mode'], 'toggle');
    });
    await check('click switches to light (attribute, aria-pressed, sun icon, canvas, color-scheme, storage)', async () => {
      await t.page.click('.shell__theme-toggle');
      const s = await state();
      eq(s.theme, 'light', 'theme'); eq(s.pressed, 'false', 'aria-pressed'); assert(/fa-sun/.test(s.icon), 'sun icon'); eq(s.scheme, 'light', 'color-scheme');
      eq(s.canvas, 'rgb(255, 255, 255)', 'canvas'); eq(s.pageBg, 'rgb(242, 243, 247)', 'page background'); eq(s.stored, 'light', 'stored');
    });
    await check('persists across reload', async () => {
      await t.page.reload();
      await t.page.waitForSelector('#shell-main h1');
      eq((await state()).theme, 'light', 'theme after reload');
    });
    await check('Enter toggles back to dark', async () => {
      await t.page.focus('.shell__theme-toggle');
      await t.page.keyboard.press('Enter');
      eq((await state()).theme, 'dark', 'theme');
    });
    await check('Space toggles to light again', async () => {
      await t.page.focus('.shell__theme-toggle');
      await t.page.keyboard.press('Space');
      eq((await state()).theme, 'light', 'theme');
    });
    await check('no console errors while toggling', async () => { eq(t.errors, [], 'errors'); });
    await t.ctx.close();

    const b = await h.newPage({ blockStorage: true });
    await check('storage blocked: app renders, defaults to dark, toggle works for the session', async () => {
      await visit(b, '#/overview');
      eq(await b.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'default theme');
      await b.page.click('.shell__theme-toggle');
      eq(await b.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'after click');
      await go(b.page, '#/renewals');
      eq(await b.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'after navigation');
      await b.page.click('.shell__theme-toggle');
      eq(await b.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'toggled back');
      eq(b.errors, [], 'console errors with storage blocked');
    });
    await b.ctx.close();
  }

  // ======================================================================== offline and performance
  if (want('offline')) {
    group('Offline: no external requests, first paint, no console errors');
    const t = await h.newPage({ theme: 'dark', hangExternal: true });
    await check('every route loads with Google Fonts and cdnjs hanging, zero requests leave the origin', async () => {
      for (const r of ROUTES) await visit(t, r.hash);
      const ext = externalRequests(t);
      eq(ext.map((r) => r.url), [], 'external requests');
      return `${t.requests.length} requests, all same-origin or data:`;
    });
    await check('no <script> or <link> points at another origin', async () => {
      const refs = await t.page.evaluate(() => [...document.querySelectorAll('script[src], link[href]')].map((e) => e.src || e.href).filter((u) => u && !u.startsWith(location.origin) && !u.startsWith('data:')));
      eq(refs, [], 'cross-origin references');
    });
    await check('no console errors, failed requests or HTTP errors on any route', async () => { eq(t.errors, [], 'errors'); });
    await t.ctx.close();

    await check('first contentful paint under 1 s with hanging external hosts', async () => {
      const samples = [];
      for (let i = 0; i < 3; i++) {
        const p = await h.newPage({ theme: 'dark', hangExternal: true });
        await visit(p, '#/overview');
        samples.push(Math.round(await firstContentfulPaint(p.page)));
        await p.ctx.close();
        if (samples[samples.length - 1] < 1000) break;
      }
      assert(Math.min(...samples) < 1000, `first contentful paint ${samples.join(', ')} ms (needs < 1000)`);
      return `${samples.join(', ')} ms`;
    });
  }

  // ======================================================================== keyboard and landmarks
  if (want('keyboard')) {
    group('Skip link, focus ring, landmarks');
    const t = await h.newPage({ theme: 'dark' });
    await visit(t, '#/renewals');
    await check('skip link is the first tab stop, visible on focus, keeps the hash, moves focus to main', async () => {
      await t.page.keyboard.press('Tab');
      const first = await t.page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { cls: a.className, text: a.textContent, top: r.top, left: r.left }; });
      assert(/shell__skip/.test(first.cls), `first tab stop is "${first.text}"`);
      assert(first.top >= 0 && first.left >= 0, 'skip link is off screen while focused');
      await t.page.keyboard.press('Enter');
      const after = await t.page.evaluate(() => ({ hash: location.hash, active: document.activeElement.id }));
      eq(after, { hash: '#/renewals', active: 'shell-main' }, 'after Enter');
    });
    await check('shell landmarks: banner header, Workspace nav, Primary nav, one main#shell-main, content inside main', async () => {
      const l = await t.page.evaluate(() => ({
        header: document.querySelectorAll('body > #root header, header.shell__header').length,
        navs: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')),
        mains: document.querySelectorAll('main').length,
        mainId: (document.querySelector('main') || {}).id,
        h1InMain: !!document.querySelector('main h1'),
        railItems: document.querySelectorAll('nav[aria-label="Primary"] li').length,
        headerH: Math.round(document.querySelector('.shell__header').getBoundingClientRect().height),
        railW: Math.round(document.querySelector('.shell__rail').getBoundingClientRect().width),
      }));
      eq(l.header, 1, 'header count'); eq(l.navs, ['Workspace', 'Primary'], 'navs'); eq(l.mains, 1, 'main count'); eq(l.mainId, 'shell-main', 'main id');
      assert(l.h1InMain, 'h1 not inside main'); eq(l.railItems, 6, 'rail items'); eq(l.headerH, 72, 'header height'); eq(l.railW, 65, 'rail width (64 + 1px border)');
    });
    await check('sample banner sits above main, inside the canvas, visible without scrolling on every route', async () => {
      for (const r of ROUTES) {
        await go(t.page, r.hash || '#/overview');
        const b = await t.page.evaluate(() => {
          const bn = document.querySelector('.sample-banner'); const m = document.querySelector('main'); const hd = document.querySelector('.shell__header');
          const br = bn.getBoundingClientRect(); const mr = m.getBoundingClientRect(); const hr = hd.getBoundingClientRect();
          return { text: bn.textContent, below: br.top >= hr.bottom - 1, above: br.bottom <= mr.top + 1, visible: br.height > 20 && br.top < innerHeight, inMain: m.contains(bn), link: !!bn.querySelector('button, a') };
        });
        assert(b.below && b.above && b.visible && !b.inMain && b.link, `${r.hash}: banner ${JSON.stringify(b)}`);
        assert(b.text.includes('Sample data.') && b.text.includes('fictional') && b.text.includes('About this data'), 'banner copy');
      }
    });
    await check('header app tab carries a "Sample" badge and reads "Kontor financial layer"', async () => {
      const s = await t.page.evaluate(() => ({ name: document.querySelector('.shell__apptab-name').innerText, badge: document.querySelector('.shell__badge').innerText }));
      eq(s, { name: 'Kontor financial layer', badge: 'Sample' }, 'app tab');
    });
    await check('keyboard focus ring: 2px accent outline on a rail item and on a DS Button', async () => {
      await visit(t, '#/no-such-page');
      const ring = async (pick) => {
        for (let i = 0; i < 40; i++) {
          await t.page.keyboard.press('Tab');
          const r = await t.page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { label: a.getAttribute('aria-label') || a.textContent.trim(), w: cs.outlineWidth, s: cs.outlineStyle, c: cs.outlineColor }; });
          if (pick(r)) return r;
        }
        throw new Error('control never received focus');
      };
      const accent = await t.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
      const toRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
      const rail = await ring((r) => r.label === 'Opportunities');
      const btn = await ring((r) => r.label.includes('Go to overview'));
      for (const r of [rail, btn]) { eq([r.w, r.s], ['2px', 'solid'], `outline on ${r.label}`); eq(r.c, toRgb(accent), `outline colour on ${r.label}`); }
      return 'accent ' + accent;
    });
    await check('focus ring is also visible in light', async () => {
      await setTheme(t.page, 'light');
      await t.page.evaluate(() => document.querySelector('nav[aria-label="Primary"] button').focus());
      await t.page.keyboard.press('Tab');
      const r = await t.page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return [cs.outlineWidth, cs.outlineStyle]; });
      eq(r, ['2px', 'solid'], 'outline');
    });
    await t.ctx.close();
  }

  // ======================================================================== shell behaviour: header actions, overlays
  if (want('shell')) {
    group('Shell: header actions, menu, overlays, focus return (1440x900, dark)');
    const t = await h.newPage({ theme: 'dark' });
    await visit(t, '#/overview');
    const toastText = () => t.page.locator('.kx-toasts [role="status"], .kx-toasts [role="alert"]').allInnerTexts();
    for (const [label, sel] of [['Apps', 'button.shell__tab:has-text("Apps")'], ['Chat', 'button.shell__tab:has-text("Chat")'], ['Notifications', 'button[aria-label="Notifications"]'], ['Account', 'button[aria-label^="Account"]']]) {
      await check(`${label} shows the R5 toast and does not navigate`, async () => {
        const before = await t.page.evaluate(() => location.hash);
        await t.page.click(sel);
        await t.page.waitForSelector('.kx-toasts [role="status"]', { timeout: 2000 });
        const msg = (await toastText()).join(' ');
        assert(msg.includes(`${label} isn't part of this prototype.`) && msg.includes('It sits outside Stage 1. Use the left rail to explore the demo.'), `toast text: ${msg}`);
        eq(await t.page.evaluate(() => location.hash), before, 'hash');
        await t.page.click('.kx-toasts button.kx-toast__close');
      });
    }
    await check('Share copies the current link and toasts', async () => {
      await go(t.page, '#/opportunities?type=overCap');
      await t.page.click('button[aria-label="Share"]');
      await t.page.waitForSelector('.kx-toasts [role="status"]');
      const clip = await t.page.evaluate(() => navigator.clipboard.readText());
      assert(clip.endsWith('#/opportunities?type=overCap'), `clipboard: ${clip}`);
      assert((await toastText()).join(' ').includes('Link copied to your clipboard.'), 'toast');
      await t.page.click('.kx-toasts button.kx-toast__close');
    });
    await check('close tab returns to the overview with a toast', async () => {
      await go(t.page, '#/roadmap');
      await t.page.click('button[aria-label^="Close Kontor"]');
      await t.page.waitForFunction(() => location.hash === '#/overview');
      assert((await toastText()).join(' ').includes('Returned to the overview.'), 'toast');
      await t.page.click('.kx-toasts button.kx-toast__close');
    });
    await check('toasts auto-dismiss (info, about 7 s) and have a 32px close target', async () => {
      await t.page.click('button.shell__tab:has-text("Chat")');
      const box = await t.page.locator('.kx-toasts button.kx-toast__close').boundingBox();
      assert(box.width >= 32 && box.height >= 32, `close target ${box.width}x${box.height}`);
      await t.page.waitForSelector('.kx-toasts [role="status"]', { state: 'detached', timeout: 10000 });
    });

    await check('Settings gear opens the settings overlay; Esc closes it and focus returns to the gear', async () => {
      await t.page.click('button[aria-label="Settings"]');
      await t.page.waitForSelector('dialog[open], [role="dialog"]');
      const name = await t.page.evaluate(() => { const d = document.querySelector('dialog[open], [role="dialog"]'); const id = d.getAttribute('aria-labelledby'); return (id && document.getElementById(id) ? document.getElementById(id).textContent : d.getAttribute('aria-label')) || ''; });
      assert(/settings/i.test(name), `overlay name "${name}"`);
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('dialog[open], [role="dialog"]', { state: 'detached' });
      await t.page.waitForTimeout(50);
      eq(await t.page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Settings', 'focus after close');
    });
    await check('"About this data" opens the dialog; Esc closes it and focus returns to the link', async () => {
      await t.page.click('.sample-banner__link');
      await t.page.waitForSelector('dialog[open], [role="dialog"]');
      assert(/about this data/i.test(await t.page.locator('dialog[open] h2, [role="dialog"] h2, [role="dialog"] h1').first().innerText()), 'dialog title');
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('dialog[open], [role="dialog"]', { state: 'detached' });
      await t.page.waitForTimeout(50);
      eq(await t.page.evaluate(() => document.activeElement.className), 'sample-banner__link', 'focus after close');
    });
    await check('rail Menu opens six items in order (Guide added by G1); selecting one navigates; Esc returns focus to the Menu button', async () => {
      await t.page.click('.shell__rail-foot button[aria-label="Menu"]');
      await t.page.waitForSelector('[role="menu"]');
      const items = await t.page.locator('[role="menu"] [role="menuitem"]').allInnerTexts();
      eq(items.map((s) => s.trim()), ['Why this matters', 'How this is calculated', 'About this data', 'Guide', 'Demo guide', 'Give feedback'], 'menu items');
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('[role="menu"]', { state: 'detached' });
      await t.page.waitForTimeout(50);
      eq(await t.page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Menu', 'focus after Esc');
      await t.page.click('.shell__rail-foot button[aria-label="Menu"]');
      await t.page.click('[role="menuitem"]:has-text("Why this matters")');
      await t.page.waitForFunction(() => location.hash === '#/evidence');
      await t.page.waitForSelector('[role="menu"]', { state: 'detached' });
    });
    await check('opening About from the Menu returns focus to the Menu button on close', async () => {
      await t.page.click('.shell__rail-foot button[aria-label="Menu"]');
      await t.page.click('[role="menuitem"]:has-text("About this data")');
      await t.page.waitForSelector('dialog[open], [role="dialog"]');
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('dialog[open], [role="dialog"]', { state: 'detached' });
      await t.page.waitForTimeout(80);
      eq(await t.page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Menu', 'focus after close');
    });
    await check('rail items navigate and set aria-current; Back returns', async () => {
      await go(t.page, '#/overview');
      await t.page.click('nav[aria-label="Primary"] button[aria-label="Renewal radar"]');
      await t.page.waitForFunction(() => location.hash === '#/renewals');
      await t.page.waitForFunction(() => (document.querySelector('nav[aria-label="Primary"] [aria-current="page"]') || {}).ariaLabel === 'Renewal radar', null, { timeout: 3000 });
      eq(await rail(t.page), ['Renewal radar'], 'aria-current');
      await t.page.goBack();
      await t.page.waitForFunction(() => location.hash === '#/overview');
      await t.page.waitForFunction(() => (document.querySelector('nav[aria-label="Primary"] [aria-current="page"]') || {}).ariaLabel === 'Overview', null, { timeout: 3000 });
      eq(await rail(t.page), ['Overview'], 'aria-current after Back');
    });
    await check('prefers-reduced-motion switches transitions off', async () => {
      const dur = () => t.page.evaluate(() => { const cs = getComputedStyle(document.querySelector('.shell__rail-item')); return [cs.transitionDuration, getComputedStyle(document.querySelector('.shell__theme-toggle')).transitionDuration]; });
      const normal = await dur();
      assert(normal.some((d) => parseFloat(d) >= 0.1), `expected a 150ms transition, got ${normal}`);
      await t.page.emulateMedia({ reducedMotion: 'reduce' });
      const reduced = await dur();
      await t.page.emulateMedia({ reducedMotion: 'no-preference' });
      assert(reduced.every((d) => parseFloat(d) <= 0.001), `transitions still run: ${reduced}`);
    });
    await check('no console errors', async () => { eq(t.errors, [], 'errors'); });
    await t.ctx.close();
  }

  // ======================================================================== router behaviour
  if (want('router')) {
    group('Router: scroll reset, h1 focus (not on first load), query-only changes, deep links');
    const t = await h.newPage({ theme: 'dark' });
    await visit(t, '#/overview');
    const addTall = () => t.page.evaluate(() => { const m = document.getElementById('shell-main'); let s = document.getElementById('tall'); if (!s) { s = document.createElement('div'); s.id = 'tall'; s.style.height = '3000px'; m.appendChild(s); } m.scrollTop = 400; return m.scrollTop; });
    await check('first load does not steal focus (activeElement is body)', async () => {
      eq(await t.page.evaluate(() => document.activeElement.tagName), 'BODY', 'activeElement');
    });
    await check('route change resets main scroll to 0 and focuses the new h1', async () => {
      assert((await addTall()) > 0, 'could not scroll main');
      await t.page.click('nav[aria-label="Primary"] button[aria-label="Contracts"]');
      await t.page.waitForFunction(() => location.hash === '#/contracts');
      await t.page.waitForFunction(() => document.activeElement && document.activeElement.tagName === 'H1', null, { timeout: 2000 }).catch(() => {});
      const s = await t.page.evaluate(() => ({ top: document.getElementById('shell-main').scrollTop, tag: document.activeElement.tagName, inMain: !!document.activeElement.closest('main') }));
      eq(s, { top: 0, tag: 'H1', inMain: true }, 'after route change');
    });
    await check('query-only change keeps scroll and focus (filters and drawers must not jump)', async () => {
      await addTall();
      await t.page.focus('nav[aria-label="Primary"] button[aria-label="Roadmap"]');
      await t.page.evaluate(() => { location.hash = '#/contracts?q=waste'; });
      await t.page.waitForTimeout(150);
      const s = await t.page.evaluate(() => ({ top: document.getElementById('shell-main').scrollTop, label: document.activeElement.getAttribute('aria-label') }));
      assert(s.top > 0, `scroll was reset (${s.top})`); eq(s.label, 'Roadmap', 'focus stayed');
    });
    await check('skip link target and focus h1 are quiet (no outline) on programmatic focus', async () => {
      const o = await t.page.evaluate(() => { const h = document.querySelector('main h1'); h.focus(); return getComputedStyle(h).outlineStyle; });
      eq(o, 'none', 'h1 outline');
    });
    await check('?flag= opens an overlay on any route and closing removes the param without adding history', async () => {
      await go(t.page, '#/renewals');
      const len = await t.page.evaluate(() => history.length);
      await t.page.evaluate(() => { location.replace('#/renewals?flag=F-C-005-overCap'); });
      await t.page.waitForSelector('dialog[open], [role="dialog"]', { timeout: 3000 });
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('dialog[open], [role="dialog"]', { state: 'detached' });
      eq(await t.page.evaluate(() => location.hash), '#/renewals', 'hash after close');
      eq(await t.page.evaluate(() => history.length), len, 'history length');
    });
    await check('unknown route renders Page not found with a working "Go to overview" button', async () => {
      await go(t.page, '#/definitely/not/here');
      eq(await text(t.page, 'main h1'), 'Page not found.', 'h1');
      await t.page.click('main button:has-text("Go to overview")');
      await t.page.waitForFunction(() => location.hash === '#/overview');
    });
    await check('reload keeps the route (deep link)', async () => {
      await go(t.page, '#/contracts/C-005');
      await t.page.reload();
      await t.page.waitForSelector('#shell-main h1');
      eq(await t.page.evaluate(() => location.hash), '#/contracts/C-005', 'hash');
    });
    await t.ctx.close();
  }

  // ======================================================================== ui fixture
  if (want('ui')) {
    group('UI pieces in the AppFrame (tests/fixtures/shell-gallery.jsx): composites, toast, confirm, error boundary');
    const gdist = '.scratch/ui-gallery';
    execFileSync('node', ['scripts/build.mjs', '--entry', 'tests/fixtures/shell-gallery.jsx', '--outdir', gdist], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    for (const theme of ['dark', 'light']) {
      const t = await h.newPage({ theme, dist: gdist });
      await visit(t, '');
      await check(`${theme}: composites, DS inputs and tabs pass axe`, async () => {
        const v = await axe(t.page);
        assert(v.length === 0, v.map((x) => `${x.id} (${x.count}): ${x.targets.join(' | ')}`).join('\n'));
      });
      await check(`${theme}: PageHeader renders one h1, "As at 6 October 2026", breadcrumb, tabs and at most one primary action`, async () => {
        const r = await t.page.evaluate(() => ({ h1: document.querySelectorAll('h1').length, asAt: (document.querySelector('.page-header__asat') || {}).innerText, tabs: document.querySelectorAll('.page-header__tabs [role="tab"]').length, crumbs: !!document.querySelector('.page-header__breadcrumb nav') }));
        eq(r, { h1: 1, asAt: 'As at 6 October 2026', tabs: 2, crumbs: true }, 'page header');
      });
      await check(`${theme}: ClauseLink and MethodLink hrefs, ConfidencePill labels`, async () => {
        const r = await t.page.evaluate(() => ({
          clause: [document.querySelector('.clause-link').getAttribute('href'), [...document.querySelector('.clause-link').childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(), (document.querySelector('.clause-link .sr-only') || {}).textContent],
          method: [...document.querySelectorAll('.method-link')].map((a) => [a.getAttribute('href'), a.innerText.trim()]),
          pills: [...document.querySelectorAll('.conf-pill')].map((p) => p.innerText.trim()),
          underline: getComputedStyle(document.querySelector('.clause-link')).textDecorationLine,
        }));
        eq(r.clause, ['#/source/C-005/X-C-005-maximumValue?from=opportunities', 'View clause, page 23', ', Highways reactive maintenance'], 'ClauseLink (href, visible text, screen-reader context)');
        eq(r.method, [['#/method?s=cap', 'How this is calculated'], ['#/method?s=renewals', 'How this is calculated']], 'MethodLink');
        eq(r.pills, ['High', 'Medium', 'Needs review'], 'ConfidencePill');
        eq(r.underline, 'underline', 'links are underlined');
      });
      await t.ctx.close();
    }

    const t = await h.newPage({ theme: 'dark', dist: gdist });
    await visit(t, '');
    const toasts = () => t.page.locator('.kx-toast').count();
    await check('usePageTitle overrides the default document.title set by AppFrame', async () => {
      eq(await t.page.title(), 'Gallery override | Kontor financial layer', 'document.title');
    });
    await check('toasts: tones, max three visible, errors use role=alert and stay', async () => {
      for (const id of ['t-info', 't-success', 't-warning', 't-error']) await t.page.click('#' + id);
      eq(await toasts(), 3, 'visible toasts (the oldest is dropped)');
      eq(await t.page.locator('.kx-toasts [role="alert"]').count(), 1, 'error toast role');
      await t.page.click('.kx-toasts button.kx-toast__close >> nth=0');
      eq(await toasts(), 2, 'after closing one');
    });
    await check('keyboard focus is visible on DS Input, Select, Tabs and Button (2px accent outline); dark focus halo is blue, not grey', async () => {
      const accent = await t.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
      const n = parseInt(accent.slice(1), 16); const rgb = `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
      for (const sel of ['input[aria-label="Search suppliers"]', 'select[aria-label="Status"]', '[role="tab"]', '#confirm-btn']) {
        await t.page.focus(sel);
        await t.page.keyboard.press('Shift+Tab');
        await t.page.keyboard.press('Tab');
        await t.page.waitForTimeout(300);                       // the DS Input animates its halo for 150 ms
        const r = await t.page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { tag: a.tagName, w: cs.outlineWidth, s: cs.outlineStyle, c: cs.outlineColor, shadow: cs.boxShadow }; });
        eq([r.w, r.s, r.c], ['2px', 'solid', rgb], `outline on ${sel}`);
        if (sel.startsWith('input')) { const m = r.shadow.match(/(?:rgba?\(|color\(srgb )([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/); assert(m && +m[3] > 2 * +m[1] && +m[3] > +m[2], `dark halo should be accent blue, got ${r.shadow}`); }
      }
    });
    await check('confirm: opens modal with Cancel first, traps Tab, Esc cancels, focus returns to the trigger', async () => {
      await t.page.click('#confirm-btn');
      await t.page.waitForSelector('[role="alertdialog"]');
      eq(await t.page.evaluate(() => document.activeElement.textContent), 'Cancel', 'first focus');
      // Kit ConfirmDialog traps Tab: focus cycles inside the alertdialog and must never land on a page control behind it.
      const seen = new Set();
      for (let i = 0; i < 6; i++) { await t.page.keyboard.press('Tab'); seen.add(await t.page.evaluate(() => (document.activeElement.closest('[role="alertdialog"]') ? 'in' : document.activeElement === document.body ? 'browser' : 'PAGE'))); }
      assert(!seen.has('PAGE') && seen.has('in'), `Tab reached ${[...seen].join(', ')}`);
      assert((await axe(t.page)).length === 0, 'axe with the confirm dialog open');
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('[role="alertdialog"]', { state: 'detached' });
      await t.page.waitForSelector('text=Nothing changed.');
      await t.page.waitForTimeout(60);
      eq(await t.page.evaluate(() => document.activeElement.id), 'confirm-btn', 'focus after Esc');
    });
    await check('confirm: the destructive button resolves true and returns focus', async () => {
      await t.page.click('#confirm-btn');
      await t.page.click('[role="alertdialog"] button:has-text("Reset changes")');
      await t.page.waitForSelector('text=Changes reset.');
      await t.page.waitForTimeout(60);
      eq(await t.page.evaluate(() => document.activeElement.id), 'confirm-btn', 'focus after confirm');
    });
    await check('error boundary: a thrown render error shows What + Why + How with working actions, shell stays usable', async () => {
      t.errors.length = 0;
      await t.page.click('#bomb-btn');
      await t.page.waitForSelector('.error-panel__details');
      const r = await t.page.evaluate(() => ({ h1: [...document.querySelectorAll('main h1')].map((h) => h.textContent), buttons: [...document.querySelectorAll('.page-header__actions button')].map((b) => b.textContent.trim()).slice(-2), railStill: document.querySelectorAll('nav[aria-label="Primary"] li').length }));
      assert(r.h1.includes("This screen couldn't load."), `h1 ${JSON.stringify(r.h1)}`);
      eq(r.buttons, ['Reload page', 'Go to overview'], 'actions'); eq(r.railStill, 6, 'rail still rendered');
      assert((await axe(t.page)).length === 0, 'axe with the error panel');
    });
    await check('overlays mounted by AppFrame: About opens from the banner and closes with Esc', async () => {
      await t.page.click('.sample-banner__link');
      await t.page.waitForSelector('dialog[open], [role="dialog"]');
      await t.page.keyboard.press('Escape');
      await t.page.waitForSelector('dialog[open], [role="dialog"]', { state: 'detached' });
    });
    await t.ctx.close();
  }

  // ======================================================================== axe
  if (want('axe')) {
    group('axe-core: wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice, every route, both themes (1440x900)');
    for (const theme of ['dark', 'light']) {
      const t = await h.newPage({ theme });
      await visit(t, '#/overview');
      for (const r of ROUTES.filter((x) => x.hash !== '')) {
        await check(`${theme}  ${r.hash}`, async () => {
          await go(t.page, r.hash);
          const v = await axe(t.page);
          assert(v.length === 0, v.map((x) => `${x.id} (${x.impact}, ${x.count}): ${x.help}\n      ${x.targets.join('\n      ')}`).join('\n'));
        });
      }
      await check(`${theme}  overlays open: About dialog, Settings drawer, Menu popover, toast`, async () => {
        await go(t.page, '#/overview');
        const run = async (name) => { const v = await axe(t.page); assert(v.length === 0, `${name}: ` + v.map((x) => `${x.id} (${x.count}): ${x.targets.join(' | ')}`).join('\n')); };
        await t.page.click('.sample-banner__link'); await t.page.waitForSelector('dialog[open], [role="dialog"]'); await run('About'); await t.page.keyboard.press('Escape');
        await t.page.waitForSelector('dialog[open], [role="dialog"]', { state: 'detached' });
        await t.page.click('button[aria-label="Settings"]'); await t.page.waitForSelector('dialog[open], [role="dialog"]'); await run('Settings'); await t.page.keyboard.press('Escape');
        await t.page.waitForSelector('dialog[open], [role="dialog"]', { state: 'detached' });
        await t.page.click('.shell__rail-foot button[aria-label="Menu"]'); await t.page.waitForSelector('[role="menu"]'); await run('Menu'); await t.page.keyboard.press('Escape');
        await t.page.click('button.shell__tab:has-text("Apps")'); await t.page.waitForSelector('.kx-toasts [role="status"]'); await run('Toast');
      });
      await t.ctx.close();
    }
    await check('axe also clean at 390x844 (bottom bar) in both themes on the overview', async () => {
      for (const theme of ['dark', 'light']) {
        const t = await h.newPage({ theme, viewport: VIEWPORTS.phone });
        await visit(t, '#/overview');
        const v = await axe(t.page);
        await t.ctx.close();
        assert(v.length === 0, `${theme}: ` + v.map((x) => `${x.id}: ${x.targets.join(' | ')}`).join('\n'));
      }
    });
  }

  // ======================================================================== layout
  if (want('layout')) {
    group('Layout: no horizontal page scroll on every route at 1440x900, 1024x768, 390x844');
    for (const [name, vp] of [['1440x900', VIEWPORTS.desktop], ['1024x768', VIEWPORTS.tablet], ['390x844', VIEWPORTS.phone]]) {
      const t = await h.newPage({ theme: 'dark', viewport: vp });
      await visit(t, '#/overview');
      await check(`${name}: ${ROUTES.length} routes, document and main do not scroll sideways`, async () => {
        const bad = [];
        for (const r of ROUTES) {
          await go(t.page, r.hash || '#/overview');
          const o = await t.page.evaluate(() => {
            const d = document.documentElement; const m = document.getElementById('shell-main');
            return { doc: d.scrollWidth - d.clientWidth, main: m.scrollWidth - m.clientWidth, vh: document.body.scrollHeight - innerHeight };
          });
          if (o.doc > 0 || o.main > 0) bad.push(`${r.hash}: document +${o.doc}px, main +${o.main}px`);
        }
        assert(bad.length === 0, bad.join('\n'));
      });
      if (name === '390x844') {
        await check('390x844: bottom tab bar with six captions, theme toggle and Menu reachable, no 1px overflow in header', async () => {
          const s = await t.page.evaluate(() => {
            const bar = document.querySelector('.shell__rail').getBoundingClientRect();
            const toggle = document.querySelector('.shell__theme-toggle').getBoundingClientRect();
            const menu = [...document.querySelectorAll('button[aria-label="Menu"]')].find((b) => b.getClientRects().length);
            return {
              barAtBottom: Math.round(bar.bottom) === innerHeight, wide: Math.round(bar.width) === innerWidth,
              captions: [...document.querySelectorAll('.shell__rail-caption')].map((e) => e.textContent),
              toggleVisible: toggle.right <= innerWidth && toggle.width > 0, menuVisible: !!menu && menu.getBoundingClientRect().right <= innerWidth,
              header: document.querySelector('.shell__header').scrollWidth - document.querySelector('.shell__header').clientWidth,
            };
          });
          eq(s.captions, ['Overview', 'Flags', 'Renewals', 'Spend', 'Contracts', 'Roadmap'], 'captions');
          assert(s.barAtBottom && s.wide && s.toggleVisible && s.menuVisible && s.header <= 0, JSON.stringify(s));
        });
      }
      await t.ctx.close();
    }
    await check('1366x768: banner, h1 and first content are visible without scrolling', async () => {
      const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.laptop });
      await visit(t, '#/overview');
      const r = await t.page.evaluate(() => { const b = document.querySelector('.sample-banner').getBoundingClientRect(); const h1 = document.querySelector('main h1').getBoundingClientRect(); return { banner: Math.round(b.bottom), h1: Math.round(h1.bottom) }; });
      await t.ctx.close();
      assert(r.h1 < 768, JSON.stringify(r));
      return `banner ends y=${r.banner}, h1 ends y=${r.h1}`;
    });
  }

  // ======================================================================== standalone
  if (want('standalone') && flag('standalone')) {
    group('Standalone: dist/kontor-prototype.html from file://');
    const file = path.join(ROOT, 'dist', 'kontor-prototype.html');
    await check('exists and is under 12 MB', async () => {
      const { statSync } = await import('node:fs');
      const mb = statSync(file).size / 1048576;
      assert(mb < 12, `${mb.toFixed(1)} MB`);
      return `${mb.toFixed(2)} MB`;
    });
    for (const theme of ['dark', 'light']) {
      await check(`file:// ${theme}: renders, zero requests except the file and data: URIs, fonts load, no errors`, async () => {
        const t = await h.newPage({ theme });
        await t.page.goto('file://' + file + '#/overview');
        await t.page.waitForSelector('#shell-main h1');
        for (const hash of ['#/renewals', '#/contracts', '#/method']) await go(t.page, hash);
        const bad = t.requests.filter((r) => !/^(data|blob|about):/.test(r.url) && r.url !== 'file://' + file && !r.url.startsWith('file://' + file + '#'));
        eq(bad.map((r) => r.url), [], 'requests');
        const fonts = await t.page.evaluate(async () => { await document.fonts.ready; return ['Inter', 'Inter Display', 'Geist Mono', 'Font Awesome 6 Free'].map((f) => [f, [...document.fonts].some((x) => x.family.replace(/["']/g, '') === f && x.status === 'loaded')]); });
        const missing = fonts.filter(([f, ok]) => !ok && f !== 'Geist Mono').map(([f]) => f);
        eq(missing, [], 'fonts not loaded from data URIs');
        eq(t.errors, [], 'errors');
        const v = await axe(t.page);
        assert(v.length === 0, v.map((x) => x.id).join(','));
        await t.ctx.close();
        return `${t.requests.length} requests`;
      });
    }
  }
} finally {
  await h.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) {
  console.log('\nFailures:');
  failed.forEach((f) => console.log(`  - ${f.name}`));
  process.exit(1);
}
