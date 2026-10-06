// Accessibility review checks (reviewer "a11y"). Plain node, runs against dist/ via tests/lib/harness.mjs:
//   node tests/review/a11y-checks.mjs
// Exits non-zero when any check fails. Two kinds of line:
//   Dxx  defect checks: each encodes a defect measured in the review (docs/review/a11y.md). FAIL = defect still present.
//   Gxx  regression guards: behaviour that is correct today and must stay correct. FAIL = something broke.
import { createRequire } from 'node:module';
import { launch, visit, axe, setTheme, VIEWPORTS, THEME_KEY } from '../lib/harness.mjs';
const require = createRequire(import.meta.url);
const { PNG } = require('playwright-core/lib/utilsBundle');

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

const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const rgbOf = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

const h = await launch();

/** A phone/tablet context with a coarse pointer (hasTouch + isMobile), seeded theme. */
async function coarsePage(viewport, theme = 'dark') {
  const ctx = await h.browser.newContext({ viewport, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.addInitScript(([k, t]) => { try { if (localStorage.getItem(k) === null) localStorage.setItem(k, t); } catch (e) { /* ignore */ } }, [THEME_KEY, theme]);
  const page = await ctx.newPage();
  return { page, ctx, base: `${h.url}/index.html`, errors: [], requests: [] };
}
async function axNodes(t) {
  const cdp = await t.ctx.newCDPSession(t.page); await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree'); await cdp.detach();
  return nodes.filter((n) => !n.ignored).map((n) => ({ role: n.role && n.role.value, name: (n.name && n.name.value) || '' }));
}
const activeLabel = (page) => page.evaluate(() => { const e = document.activeElement; return e ? (e.getAttribute('aria-label') || e.innerText || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 50) : 'none'; });

try {
  // ------------------------------------------------------------------ defects
  await check('D01', 'Settings stays reachable below 700px (683px = 200% zoom of a 1366px laptop)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 683, height: 384 } });
    await visit(t, '#/overview');
    const gear = await t.page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /^Settings/.test(b.getAttribute('aria-label') || '') && b.getClientRects().length > 0).length);
    await t.page.locator('button[aria-label="Menu"]:visible').first().click(); await t.page.waitForTimeout(400);
    const inMenu = await t.page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].some((e) => /settings/i.test(e.textContent)));
    await t.ctx.close();
    return { ok: gear > 0 || inMenu, detail: `visible Settings buttons ${gear}, Settings item in Menu ${inMenu}` };
  });

  await check('D02', 'rail Menu stays reachable at 720x450 (200% zoom of 1440x900) and focusing it does not scroll the shell body', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: { width: 720, height: 450 } });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    const before = await t.page.evaluate(() => { const r = document.querySelector('.shell__rail-menu').getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight }; });
    await t.page.locator('.shell__rail-menu').focus(); await t.page.waitForTimeout(200);
    const after = await t.page.evaluate(() => ({ bodyScroll: document.querySelector('.shell__body').scrollTop }));
    await t.ctx.close();
    return { ok: before.bottom <= before.vh && after.bodyScroll === 0, detail: `menu bottom ${before.bottom} of ${before.vh}px, .shell__body scrollTop after focus ${after.bodyScroll}` };
  });

  for (const [W, H] of [[1024, 768], [390, 844], [320, 568]]) {
    await check('D03', `Cap vs spend "Show table" does not widen the document at ${W}x${H}`, async () => {
      const t = await h.newPage({ theme: 'dark', viewport: { width: W, height: H } });
      await visit(t, '#/spend'); await t.page.waitForTimeout(300);
      await t.page.getByRole('button', { name: /Show table/ }).first().click(); await t.page.waitForTimeout(300);
      const extra = await t.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await t.ctx.close();
      return { ok: extra <= 0, detail: `document is ${extra}px wider than the window` };
    });
  }

  await check('D04', 'in-list text links and buttons have at least 24px of hit area at a fine pointer (WCAG 2.5.8; Springboard 24px minimum)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    const hit = (loc) => loc.evaluate((el) => {
      const sel = 'a[href],button,input,select,textarea,summary,[role=button]';
      const r = el.getBoundingClientRect(); let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
      for (let y = Math.max(0, Math.floor(r.top - 14)); y <= Math.min(innerHeight - 1, Math.ceil(r.bottom + 14)); y++) for (let x = Math.max(0, Math.floor(r.left - 14)); x <= Math.min(innerWidth - 1, Math.ceil(r.right + 14)); x++) {
        const top = document.elementFromPoint(x, y); if (top && (top === el || el.contains(top) || (top.closest && top.closest(sel) === el))) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
      }
      return { w: maxx - minx + 1, h: maxy - miny + 1 };
    });
    const probes = [];
    await visit(t, '#/opportunities'); await t.page.waitForTimeout(400);
    probes.push(['View clause, page N (Opportunities)', await hit(t.page.locator('a.kviz-textlink').first())]);
    probes.push(['See calculation (Opportunities)', await hit(t.page.locator('button.opp-calc').first())]);
    await visit(t, '#/spend'); await t.page.waitForTimeout(400);
    probes.push(['See payments (Cap vs spend)', await hit(t.page.locator('button.cap-link').first())]);
    await visit(t, '#/contracts'); await t.page.waitForTimeout(400);
    probes.push(['sort button (Contracts)', await hit(t.page.locator('th button.sort').first())]);
    await visit(t, '#/contracts/C-005'); await t.page.waitForTimeout(400);
    probes.push(['breadcrumb link (Contract detail)', await hit(t.page.locator('nav[aria-label="Breadcrumb"] a').first())]);
    await t.ctx.close();
    const small = probes.filter(([, s]) => s.h < 24 || s.w < 24);
    return { ok: small.length === 0, detail: probes.map(([n, s]) => `${n} ${s.w}x${s.h}`).join('; ') };
  });

  await check('D05', 'accessible names contain no Font Awesome private-use glyphs (icon <i> not aria-hidden)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    const bad = new Set();
    for (const hash of ['#/overview', '#/opportunities', '#/spend/matches']) {
      await visit(t, hash); await t.page.waitForTimeout(300);
      for (const n of await axNodes(t)) if (/[-]/.test(n.name)) bad.add(`${n.role}:${n.name.replace(/[-]/g, '<icon>').trim().slice(0, 36)}`);
    }
    await t.ctx.close();
    return { ok: bad.size === 0, detail: `${bad.size} names, e.g. ${[...bad].slice(0, 4).join(' | ')}` };
  });

  await check('D06', 'at (pointer: coarse) every button in a dialog or drawer is at least 44px tall (R70)', async () => {
    const t = await coarsePage(VIEWPORTS.tablet);
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    const coarse = await t.page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    await t.page.getByRole('button', { name: 'Give feedback' }).click(); await t.page.waitForSelector('[role=dialog]'); await t.page.waitForTimeout(500);
    const small = await t.page.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].map((b) => { const r = b.getBoundingClientRect(); return { n: (b.getAttribute('aria-label') || b.innerText).trim().slice(0, 20), h: Math.round(r.height) }; }).filter((b) => b.h < 44));
    await t.ctx.close();
    return { ok: coarse && small.length === 0, detail: `coarse ${coarse}; under 44px: ${small.map((b) => b.n + ' ' + b.h).join(', ') || 'none'}` };
  });

  await check('D07', 'shell tooltips can be dismissed with Escape and stay while the pointer is on them (WCAG 1.4.13)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop }); const p = t.page;
    await visit(t, '#/overview'); await p.waitForTimeout(400);
    const visibleTips = () => p.evaluate(() => [...document.querySelectorAll('[role=tooltip]')].filter((e) => getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none').length);
    await p.locator('button[aria-label="Settings"]').focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(400);
    const shown = await visibleTips(); await p.keyboard.press('Escape'); await p.waitForTimeout(250); const afterEsc = await visibleTips();
    await p.mouse.move(700, 500); await p.keyboard.press('Tab'); await p.waitForTimeout(200);
    await p.locator('.shell__rail-item[aria-label="Roadmap"]').hover(); await p.waitForTimeout(500);
    const rect = await p.evaluate(() => { const e = [...document.querySelectorAll('[role=tooltip]')].find((x) => /Roadmap/.test(x.textContent)); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    let hoverable = false;
    if (rect) { await p.mouse.move(rect[0], rect[1], { steps: 8 }); await p.waitForTimeout(500); hoverable = await p.evaluate(() => [...document.querySelectorAll('[role=tooltip]')].some((x) => /Roadmap/.test(x.textContent))); }
    await t.ctx.close();
    return { ok: shown > 0 && afterEsc === 0 && hoverable, detail: `shown on focus ${shown}, still visible after Esc ${afterEsc}, still visible with pointer on it ${hoverable}` };
  });

  await check('D08', 'axe "region": the chart tooltip portal is inside a landmark while a row or the headline is hovered', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/overview'); await t.page.locator('.kviz-hero').hover(); await t.page.waitForTimeout(500);
    const v = await axe(t.page); await t.ctx.close();
    const region = v.find((x) => x.id === 'region');
    return { ok: !region, detail: region ? `region x${region.count} (${region.targets[0].split(' ::')[0]})` : 'clean' };
  });

  await check('D09', 'visible labels are contained in accessible names on a phone (WCAG 2.5.3): bottom bar captions and the avatar', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.phone });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    const bad = await t.page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.shell__rail-item').forEach((b) => { const cap = (b.querySelector('.shell__rail-caption') || {}).textContent; const name = b.getAttribute('aria-label') || ''; if (cap && !name.toLowerCase().includes(cap.trim().toLowerCase())) out.push(`"${cap.trim()}" vs "${name}"`); });
      const av = document.querySelector('.shell__avatar'); if (av && !(av.getAttribute('aria-label') || '').toLowerCase().includes(av.textContent.trim().toLowerCase())) out.push(`"${av.textContent.trim()}" vs "${av.getAttribute('aria-label')}"`);
      return out;
    });
    await t.ctx.close();
    return { ok: bad.length === 0, detail: bad.join('; ') || 'ok' };
  });

  await check('D10', 'the Menu buttons expose aria-expanded (they carry aria-haspopup="menu")', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    const m = t.page.locator('.shell__rail-menu');
    const closed = await m.getAttribute('aria-expanded'); await m.focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(400);
    const open = await m.getAttribute('aria-expanded'); await t.ctx.close();
    return { ok: closed === 'false' && open === 'true', detail: `closed ${closed}, open ${open}` };
  });

  await check('D11', 'forced-colors: the current route tab differs from the others without relying on colour or background', async () => {
    const ctx = await h.browser.newContext({ viewport: VIEWPORTS.desktop, forcedColors: 'active', colorScheme: 'dark', serviceWorkers: 'block' });
    const page = await ctx.newPage(); await visit({ page, base: `${h.url}/index.html` }, '#/spend'); await page.waitForTimeout(400);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.kx-routetab')].map((e) => { const c = getComputedStyle(e); return [c.borderBottomColor, c.borderBottomWidth, c.textDecorationLine, c.fontWeight, c.outlineStyle, c.boxShadow === 'none' ? '' : 'shadow'].join('|'); }));
    await ctx.close();
    const distinct = new Set(tabs).size;
    return { ok: distinct > 1, detail: `${tabs.length} tabs, ${distinct} distinct computed looks (${tabs[0]})` };
  });

  await check('D12', 'light theme: search glyph and select chevron in the toolbar reach 3:1 against the field', async () => {
    const t = await h.newPage({ theme: 'light', viewport: VIEWPORTS.desktop });
    await visit(t, '#/opportunities'); await t.page.waitForTimeout(400);
    const r = await t.page.evaluate(() => [...document.querySelectorAll('i.fa-magnifying-glass,i.fa-chevron-down')].map((i) => {
      const ctl = (i.parentElement && i.parentElement.querySelector('input,select')) || i; let bg = 'rgb(255, 255, 255)';
      for (let e = ctl; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; } }
      return { icon: getComputedStyle(i).color, bg };
    }));
    await t.ctx.close();
    const worst = Math.min(...r.map((x) => ratio(rgbOf(x.icon), rgbOf(x.bg))));
    return { ok: r.length > 0 && worst >= 3, detail: `${r.length} icons, lowest ${worst.toFixed(2)}:1` };
  });

  await check('D13', 'Opportunities: links with the same text point to the same place, or carry a unique accessible name', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/opportunities'); await t.page.waitForTimeout(400);
    const dup = await t.page.evaluate(() => { const m = {}; document.querySelectorAll('a.kviz-textlink').forEach((a) => { const n = a.textContent.replace(/\s+/g, ' ').trim(); (m[n] = m[n] || new Set()).add(a.getAttribute('href')); }); return Object.entries(m).filter(([, s]) => s.size > 1).map(([n, s]) => `${n} x${s.size}`); });
    await t.ctx.close();
    return { ok: dup.length === 0, detail: dup.join('; ') || 'unique' };
  });

  await check('D22', 'Contract detail: "How this is calculated" links to different sections have different accessible names', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/contracts/C-005'); await t.page.waitForTimeout(400);
    const dup = await t.page.evaluate(() => { const m = {}; document.querySelectorAll('a.method-link').forEach((a) => { const n = a.textContent.replace(/\s+/g, ' ').trim(); (m[n] = m[n] || new Set()).add(a.getAttribute('href')); }); return Object.entries(m).filter(([, s]) => s.size > 1).map(([n, s]) => `${n} x${s.size}`); });
    await t.ctx.close();
    return { ok: dup.length === 0, detail: dup.join('; ') || 'unique' };
  });

  await check('D14', 'Overview: the focusable headline figure has a role or a name (it is a generic with tabindex today)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/overview');
    const a = await t.page.locator('.kviz-hero').evaluate((e) => ({ role: e.getAttribute('role'), label: e.getAttribute('aria-label'), by: e.getAttribute('aria-labelledby') }));
    await t.ctx.close();
    return { ok: !!(a.role || a.label || a.by), detail: JSON.stringify(a) };
  });

  await check('D15', 'Supplier matches and No contract tabs have an h1 that says where you are (titles differ, h1 does not)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    const seen = [];
    for (const hash of ['#/spend', '#/spend/matches', '#/spend/no-contract']) { await visit(t, hash); seen.push((await t.page.locator('#shell-main h1').innerText()).trim()); }
    await t.ctx.close();
    return { ok: new Set(seen).size === 3, detail: seen.join(' | ') };
  });

  await check('D16', 'a toast close button is reachable within 8 Tab presses of its trigger', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    await t.page.getByRole('button', { name: 'Apps' }).focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(300);
    let n = -1; for (let i = 1; i <= 60; i++) { await t.page.keyboard.press('Tab'); if (await t.page.evaluate(() => !!document.activeElement.closest('.kx-toast'))) { n = i; break; } }
    await t.ctx.close();
    return { ok: n > 0 && n <= 8, detail: n > 0 ? `reached after ${n} Tab presses` : 'not reached in 60 Tab presses' };
  });

  await check('D17', 'Cap vs spend filter chips: pressed and unpressed differ by more than hue (luminance ratio of the border at least 1.5)', async () => {
    const out = [];
    for (const theme of ['dark', 'light']) {
      const t = await h.newPage({ theme, viewport: VIEWPORTS.desktop });
      await visit(t, '#/spend'); await t.page.waitForTimeout(400);
      const c = await t.page.evaluate(() => { const chips = [...document.querySelectorAll('.kx-chip')]; const on = chips.find((x) => x.getAttribute('aria-pressed') === 'true'), off = chips.find((x) => x.getAttribute('aria-pressed') === 'false'); return { on: getComputedStyle(on).borderTopColor, off: getComputedStyle(off).borderTopColor }; });
      out.push(`${theme} ${ratio(rgbOf(c.on), rgbOf(c.off)).toFixed(2)}`);
      await t.ctx.close();
    }
    return { ok: out.every((s) => +s.split(' ')[1] >= 1.5), detail: out.join(', ') };
  });

  await check('D18', 'Overview stacked bar: every segment is identified by words or a glyph, not by colour alone', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/overview'); await t.page.waitForTimeout(400);
    const r = await t.page.evaluate(() => { const segs = [...document.querySelectorAll('.kviz-stack .kviz-seg')]; const named = segs.filter((s) => /[A-Za-z]{4,}/.test(s.textContent) || s.querySelector('i')); return { n: segs.length, named: named.length, legend: !!document.querySelector('.kviz-headline .kviz-legend, .kviz-stack-wrap .kviz-legend') }; });
    await t.ctx.close();
    return { ok: r.legend || r.named === r.n, detail: `${r.named} of ${r.n} segments carry words or a glyph, legend ${r.legend}` };
  });

  await check('D19', 'keyboard focus on a stretched row link draws one ring (the shell 4px halo is also removed)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/spend'); await t.page.waitForTimeout(500);
    await t.page.locator('a.kviz-bl__name').first().focus(); await t.page.keyboard.press('Shift+Tab'); await t.page.keyboard.press('Tab'); await t.page.waitForTimeout(300);
    const s = await t.page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); const af = getComputedStyle(a, '::after'); return { shadow: c.boxShadow, outline: c.outlineStyle, afterOutline: af.outlineStyle }; });
    await t.ctx.close();
    return { ok: s.shadow === 'none', detail: `link box-shadow ${s.shadow.slice(0, 40)}, link outline ${s.outline}, ::after outline ${s.afterOutline}` };
  });

  await check('D20', 'phone: the bottom tab bar comes after main in DOM order (it is drawn last, but is tabbed first)', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.phone });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    const r = await t.page.evaluate(() => { const rail = document.querySelector('.shell__rail'), main = document.getElementById('shell-main'); return { railTop: Math.round(rail.getBoundingClientRect().top), mainTop: Math.round(main.getBoundingClientRect().top), railFirstInDom: !!(main.compareDocumentPosition(rail) & Node.DOCUMENT_POSITION_PRECEDING) }; });
    await t.ctx.close();
    return { ok: !(r.railTop > r.mainTop && r.railFirstInDom), detail: `rail y ${r.railTop}, main y ${r.mainTop}, rail precedes main in DOM ${r.railFirstInDom}` };
  });

  await check('D21', 'Contract detail cumulative chart: x-axis month labels do not overlap at 390px', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.phone });
    await visit(t, '#/contracts/C-005'); await t.page.waitForTimeout(500);
    const hits = await t.page.evaluate(() => {
      const els = [...document.querySelectorAll('.kviz-line text.kviz-tl')].filter((e) => /\d{4}/.test(e.textContent));
      const b = els.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, l: r.left, r: r.right }; }); const out = [];
      for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) if (b[i].l < b[j].r - 1 && b[i].r > b[j].l + 1) out.push(b[i].t + ' x ' + b[j].t);
      return out;
    });
    await t.ctx.close();
    return { ok: hits.length === 0, detail: hits.join('; ') || 'no overlap' };
  });

  // ------------------------------------------------------------------ regression guards
  await check('G01', 'axe (wcag2a/aa/21aa/22aa + best-practice): 0 violations on every route in both themes at 1440x900 (tooltips closed)', async () => {
    const routes = ['#/overview', '#/opportunities', '#/opportunities?flag=F-C-005-overCap', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue?from=opportunities', '#/method', '#/roadmap', '#/evidence', '#/nope'];
    const bad = [];
    for (const theme of ['dark', 'light']) {
      const t = await h.newPage({ theme, viewport: VIEWPORTS.desktop });
      for (const r of routes) { await visit(t, r, { ready: '#shell-main' }); await t.page.mouse.move(2, 2); await t.page.waitForTimeout(300); const v = await axe(t.page); if (v.length) bad.push(`${theme} ${r}: ${v.map((x) => x.id + 'x' + x.count).join(',')}`); }
      await t.ctx.close();
    }
    return { ok: bad.length === 0, detail: bad.slice(0, 4).join(' | ') || `${routes.length * 2} pages clean` };
  });

  await check('G02', 'skip link is the first Tab stop and moves focus to main without changing the hash', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/renewals'); await t.page.waitForTimeout(300);
    await t.page.keyboard.press('Tab'); const first = await activeLabel(t.page);
    await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(100);
    const r = await t.page.evaluate(() => ({ id: document.activeElement.id, hash: location.hash }));
    await t.ctx.close();
    return { ok: /Skip to content/.test(first) && r.id === 'shell-main' && r.hash === '#/renewals', detail: `first ${first}, then ${r.id}, hash ${r.hash}` };
  });

  await check('G03', 'a route change by keyboard moves focus to the page h1 and sets the document title', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    await visit(t, '#/overview'); await t.page.waitForTimeout(300);
    await t.page.locator('.shell__rail-item[aria-label="Renewal radar"]').focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(400);
    const r = await t.page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim(), title: document.title }));
    await t.ctx.close();
    return { ok: r.tag === 'H1' && r.title.startsWith('Renewal radar'), detail: `${r.tag} "${r.text}", title "${r.title}"` };
  });

  await check('G04', 'overlays: focus lands inside, Tab stays inside, Escape closes only the top layer and focus returns to the opener', async () => {
    const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop }); const p = t.page; const bad = [];
    const trap = async (label) => { for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => !!document.activeElement.closest('[role=dialog],[role=alertdialog]')))) { bad.push(label + ' escapes on Tab'); return; } } };
    await visit(t, '#/opportunities'); await p.waitForTimeout(400);
    const row = p.locator('.kviz-row__link').first(); await row.focus(); const rowName = await activeLabel(p); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    await trap('flag drawer'); await p.keyboard.press('Escape'); await p.waitForTimeout(350); if ((await activeLabel(p)) !== rowName) bad.push('flag drawer focus return');
    await visit(t, '#/overview'); await p.waitForTimeout(300);
    await p.locator('.sample-banner__link').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500); await trap('about'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); if (!/About this data/.test(await activeLabel(p))) bad.push('about focus return');
    await p.getByRole('button', { name: 'Settings' }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500); await trap('settings');
    await p.getByRole('button', { name: /Reset demo changes/ }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    if (!/Cancel/.test(await activeLabel(p))) bad.push('confirm does not focus Cancel');
    await p.keyboard.press('Escape'); await p.waitForTimeout(350); const drawerStill = await p.evaluate(() => !!document.querySelector('[role=dialog]')); if (!drawerStill) bad.push('Escape closed both layers');
    await p.keyboard.press('Escape'); await p.waitForTimeout(350); if (!/Settings/.test(await activeLabel(p))) bad.push('settings focus return');
    await t.ctx.close();
    return { ok: bad.length === 0, detail: bad.join('; ') || 'flag drawer, About, Settings + confirm all behave' };
  });

  await check('G05', 'every Tab stop on the Overview shows a focus indicator (pixel change focused vs blurred), dark and light', async () => {
    const out = [];
    for (const theme of ['dark', 'light']) {
      const t = await h.newPage({ theme, viewport: VIEWPORTS.desktop }); const p = t.page;
      await visit(t, '#/overview'); await p.waitForTimeout(500); await p.mouse.move(VIEWPORTS.desktop.width - 2, VIEWPORTS.desktop.height - 2);
      let stops = 0, noInd = [];
      await p.keyboard.press('Tab');
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(50);
        const cur = await p.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? (e.getAttribute('aria-label') || e.innerText || e.tagName).slice(0, 30) : null; });
        if (!cur || (i > 2 && /Skip to content/.test(cur))) break;
        const a = PNG.sync.read(await p.screenshot({ type: 'png' }));
        await p.evaluate(() => { window.__e = document.activeElement; document.activeElement.blur(); }); await p.waitForTimeout(30);
        const b = PNG.sync.read(await p.screenshot({ type: 'png' }));
        let n = 0; for (let k = 0; k < a.data.length; k += 4) if (Math.abs(a.data[k] - b.data[k]) + Math.abs(a.data[k + 1] - b.data[k + 1]) + Math.abs(a.data[k + 2] - b.data[k + 2]) > 24) n++;
        stops++; if (n < 12) noInd.push(cur);
        await p.evaluate(() => window.__e.focus({ preventScroll: true })); await p.keyboard.press('Tab');
      }
      out.push(`${theme}: ${stops} stops, ${noInd.length} without indicator${noInd.length ? ' (' + noInd.slice(0, 3).join(', ') + ')' : ''}`);
      await t.ctx.close();
    }
    return { ok: out.every((s) => / 0 without/.test(s)) && out.every((s) => +s.match(/(\d+) stops/)[1] > 30), detail: out.join('; ') };
  });

  await check('G06', 'prefers-reduced-motion: no animation is running with a drawer open', async () => {
    const ctx = await h.browser.newContext({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, [THEME_KEY, 'dark']);
    const page = await ctx.newPage(); await visit({ page, base: `${h.url}/index.html` }, '#/opportunities?flag=F-C-005-overCap'); await page.waitForTimeout(80);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.effect.getComputedTiming().duration > 20).length);
    await ctx.close();
    return { ok: running === 0, detail: `${running} animations over 20ms` };
  });

  await check('G07', 'reflow (WCAG 1.4.10): no horizontal page scroll at 320x568 and 320x256 on every route', async () => {
    const routes = ['#/overview', '#/opportunities', '#/opportunities?flag=F-C-005-overCap', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue?from=opportunities', '#/method', '#/roadmap', '#/evidence'];
    const bad = [];
    for (const vp of [{ width: 320, height: 568 }, { width: 320, height: 256 }]) {
      const t = await h.newPage({ theme: 'dark', viewport: vp });
      for (const r of routes) { await visit(t, r); await t.page.waitForTimeout(250); const x = await t.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth + Math.max(0, document.getElementById('shell-main').scrollWidth - document.getElementById('shell-main').clientWidth)); if (x > 0) bad.push(`${vp.width}x${vp.height} ${r} +${x}px`); }
      await t.ctx.close();
    }
    return { ok: bad.length === 0, detail: bad.slice(0, 4).join(' | ') || `${routes.length * 2} pages fit` };
  });

  await check('G08', 'every route has lang, one h1 and a "<Page> | Kontor financial layer" title', async () => {
    const routes = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue', '#/method', '#/roadmap', '#/evidence', '#/nope'];
    const bad = []; const t = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
    for (const r of routes) { await visit(t, r); const x = await t.page.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelectorAll('h1').length, title: document.title })); if (!x.lang || x.h1 !== 1 || !/ \| Kontor financial layer$/.test(x.title)) bad.push(`${r} ${JSON.stringify(x)}`); }
    await t.ctx.close();
    return { ok: bad.length === 0, detail: bad[0] || `${routes.length} routes ok` };
  });
} finally {
  await h.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} pass; ${failed.length} fail (${failed.map((f) => f.id).join(', ') || 'none'})`);
process.exit(failed.length ? 1 : 0);
