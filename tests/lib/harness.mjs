// Shared browser harness for the smoke test and later QA scripts.
//   const h = await launch();                                 // static server on a random port + Chromium
//   const t = await h.newPage({ theme: 'dark' });             // fresh context; theme: 'dark' | 'light' | null (null = fresh profile, nothing stored)
//   await visit(t, '#/renewals');                             // full page load, waits for the single h1
//   await go(t.page, '#/spend');                              // in-app navigation (hashchange, no reload)
//   const violations = await axe(t.page);                     // axe-core, wcag2a/aa/21aa/22aa + best-practice
//   await setTheme(t.page, 'light');                          // same effect as the toggle, without clicking
//   t.requests, t.errors                                      // request log and console/page errors
//   await h.close();
//
// newPage options: theme, viewport {width,height}, blockStorage (localStorage throws), hangExternal (Google Fonts,
// cdnjs and friends never answer, like a venue network that accepts the connection and goes quiet), permissions,
// delay { pattern: RegExp, ms } (hold matching responses back), dist (serve this build directory for this page only).
// launch options: dist (serve another build directory as /dist/app.*, e.g. '.scratch/A1'), root.
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../scripts/static-server.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const THEME_KEY = 'kontor-theme';
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'];
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 1024, height: 768 },
  phone: { width: 390, height: 844 },
};
const EXTERNAL_HOSTS = /^https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net)\//;

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

export async function launch({ dist = null, root = ROOT } = {}) {
  const { server, url } = await startServer(root);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  const contexts = [];

  async function newPage({
    theme = 'dark', viewport = VIEWPORTS.desktop, blockStorage = false, hangExternal = false,
    permissions = ['clipboard-read', 'clipboard-write'], delay = null, deviceScaleFactor = 1, hasTouch = false,
    dist: pageDist = dist,
  } = {}) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor, hasTouch, permissions, serviceWorkers: 'block' });
    contexts.push(ctx);
    if (blockStorage) {
      await ctx.addInitScript(() => {
        const boom = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
        try { Object.defineProperty(window, 'localStorage', { configurable: true, get: boom }); } catch (e) { /* ignore */ }
        try { Object.defineProperty(window, 'sessionStorage', { configurable: true, get: boom }); } catch (e) { /* ignore */ }
      });
    } else if (theme) {
      // Only seeds the preference when nothing is stored, so a toggle made during the test survives reloads.
      await ctx.addInitScript(([k, t]) => { try { if (localStorage.getItem(k) === null) localStorage.setItem(k, t); } catch (e) { /* ignore */ } }, [THEME_KEY, theme]);
    }
    if (hangExternal) await ctx.route(EXTERNAL_HOSTS, () => { /* never answered */ });
    if (pageDist) {
      await ctx.route(/\/dist\/app\.(js|css|js\.map|css\.map)(\?.*)?$/, async (route) => {
        const name = new URL(route.request().url()).pathname.split('/').pop();
        try {
          if (delay && delay.pattern.test(route.request().url())) await new Promise((r) => setTimeout(r, delay.ms));
          await route.fulfill({ body: await readFile(path.resolve(root, pageDist, name)), contentType: name.endsWith('.css') ? 'text/css' : name.endsWith('.map') ? 'application/json' : 'text/javascript' });
        } catch (e) { await route.abort(); }
      });
    } else if (delay) {
      await ctx.route(delay.pattern, async (route) => { await new Promise((r) => setTimeout(r, delay.ms)); await route.continue(); });
    }
    const page = await ctx.newPage();
    const t = { page, ctx, url, requests: [], errors: [], base: `${url}/index.html` };
    page.on('request', (r) => t.requests.push({ url: r.url(), type: r.resourceType() }));
    page.on('pageerror', (e) => t.errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') t.errors.push('console.error: ' + m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) t.errors.push(`http ${r.status()}: ${r.url()}`); });
    // ERR_ABORTED = the page navigated away while a font was still downloading (visit() loads pages back to back): not a failure.
    page.on('requestfailed', (r) => { const e = (r.failure() && r.failure().errorText) || ''; if (!/ERR_ABORTED/.test(e)) t.errors.push(`requestfailed: ${r.url()} ${e}`); });
    return t;
  }

  async function close() {
    for (const c of contexts) await c.close().catch(() => {});
    await browser.close().catch(() => {});
    server.close();
  }
  return { browser, server, url, newPage, close };
}

/** Full page load of index.html#hash (fresh React mount). Waits for the single h1 inside main. */
export async function visit(t, hash = '', { waitUntil = 'load', ready = '#shell-main h1' } = {}) {
  await t.page.goto('about:blank');
  await t.page.goto(`${t.base}${hash}`, { waitUntil });
  if (ready) await t.page.waitForSelector(ready, { timeout: 8000 });
  await t.page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});      // let lazy font downloads finish before the next navigation
  return t;
}

/** In-app navigation: change the hash on the loaded page (no reload) and wait for the route to render. */
export async function go(page, hash) {
  await page.evaluate((h) => { window.location.hash = h; }, hash.startsWith('#') ? hash : '#' + hash);
  await page.waitForFunction(() => document.querySelectorAll('#shell-main h1').length >= 1, null, { timeout: 8000 });
  await page.waitForTimeout(60);
}

/** Switch theme the way the app does (attribute, meta, storage, event) without clicking the toggle. */
export async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    const m = document.querySelector('meta[name="color-scheme"]');
    if (m) m.setAttribute('content', t);
    try { localStorage.setItem('kontor-theme', t); } catch (e) { /* ignore */ }
    window.dispatchEvent(new CustomEvent('kontor-theme', { detail: t }));
  }, theme);
  await page.waitForTimeout(80);
}

export const theme = setTheme;

/** Runs axe-core with the WCAG 2.2 AA + best-practice tag set. Returns [{ id, impact, help, count, targets }]. */
export async function axe(page, { tags = AXE_TAGS, include = null } = {}) {
  const loaded = await page.evaluate(() => typeof window.axe !== 'undefined');
  if (!loaded) await page.addScriptTag({ path: AXE_PATH });
  // Let enter animations finish first (kit Dialog and Drawer fade and slide in): axe would otherwise measure
  // contrast through a half-transparent surface and report a false failure.
  await page.evaluate(() => Promise.allSettled(document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished)));
  const res = await page.evaluate(async ({ tags, include }) => {
    const ctx = include ? { include: [[include]] } : document;
    const out = await window.axe.run(ctx, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return out.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help, count: v.nodes.length,
      targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 3).join(' | ').slice(0, 220)),
    }));
  }, { tags, include });
  return res;
}

export const origin = (u) => { try { return new URL(u).origin; } catch (e) { return u; } };

/** Requests that left the page's own origin (data: and blob: URIs are fine, they never touch the network). */
export function externalRequests(t) {
  const own = origin(t.url);
  return t.requests.filter((r) => !/^(data|blob|about):/.test(r.url) && origin(r.url) !== own);
}

export async function firstContentfulPaint(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const read = () => { const e = performance.getEntriesByName('first-contentful-paint')[0]; return e ? e.startTime : null; };
    const v = read();
    if (v !== null) return resolve(v);
    const po = new PerformanceObserver(() => { const x = read(); if (x !== null) { po.disconnect(); resolve(x); } });
    po.observe({ type: 'paint', buffered: true });
    setTimeout(() => resolve(read()), 4000);
  }));
}
