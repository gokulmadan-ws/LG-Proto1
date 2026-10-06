// robust-overlays: overlays under stress. Resize across breakpoints with a drawer open, shrink to a phone while the opener is hidden,
// stacked overlays, double-click on a destructive confirm, rapid theme toggling, rapid route changes, key-mashing, 200% and 400% zoom.
//   node tests/review/robust-overlays.mjs
import { T, ok, eq, launchApp, settle, overflowX, snapshot, VIEWPORTS } from './robust-lib.mjs';

const t = new T('robust-overlays');
const h = await launchApp();
const activeInfo = (page) => page.evaluate(() => {
  const a = document.activeElement; if (!a) return { tag: 'none' };
  const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
  return { tag: a.tagName, label: a.getAttribute('aria-label') || (a.textContent || '').trim().slice(0, 40), inDialog: !!a.closest('[role="dialog"],[role="alertdialog"]'), visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none', body: a === document.body, inMain: !!a.closest('main') };
});
const dialogs = (page) => page.evaluate(() => [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map((d) => { const r = d.getBoundingClientRect(); return { name: d.getAttribute('aria-label') || (d.querySelector('h2') || {}).textContent, x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(r.bottom) }; }));

/* ---------------------------------------------------------------- A. flag drawer across breakpoints */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const { page } = p;
  await page.goto(`${p.base}#/opportunities?flag=F-C-005-overCap`); await page.waitForFunction(() => !!document.querySelector('[role="dialog"]')); await settle(page, 500);
  for (const [w, hh] of [[1024, 768], [761, 700], [699, 800], [560, 800], [390, 844], [320, 568], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: hh }); await settle(page, 350);
    await t.check(`flag drawer stays inside the window and usable at ${w}x${hh} after a live resize`, async () => {
      const d = await dialogs(page); eq(d.length, 1, 'dialog count');
      ok(d[0].x >= -1 && d[0].right <= w + 1, `drawer spans ${d[0].x}..${d[0].right} of ${w}`);
      ok(d[0].top >= -1 && d[0].bottom <= hh + 1, `drawer vertical ${d[0].top}..${d[0].bottom} of ${hh}`);
      const ov = await overflowX(page); ok(ov.doc <= 0, 'document scrolls horizontally by ' + ov.doc);
      const a = await activeInfo(page); ok(a.inDialog, 'focus left the drawer: ' + JSON.stringify(a));
      const lock = await page.evaluate(() => getComputedStyle(document.documentElement).overflow); eq(lock, 'hidden', 'scroll lock');
      return `${d[0].w}px wide`;
    });
  }
  await page.keyboard.press('Escape'); await settle(page, 300);
  await t.check('after the resize round trip Escape closes the drawer, unlocks scrolling and puts focus back on a visible control', async () => {
    eq((await dialogs(page)).length, 0, 'dialogs left');
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'visible', 'scroll lock released');
    const a = await activeInfo(page); ok(a.visible && !a.body, 'focus: ' + JSON.stringify(a));
    return JSON.stringify(a);
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ---------------------------------------------------------------- B. Settings open, window shrinks to a phone (the gear is hidden there), Escape */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const { page } = p;
  await page.goto(`${p.base}#/overview`); await page.waitForSelector('#shell-main h1'); await settle(page, 400);
  await page.locator('.shell__header button[aria-label="Settings"]').click(); await page.waitForFunction(() => !!document.querySelector('[role="dialog"]')); await settle(page, 400);
  await page.setViewportSize({ width: 600, height: 800 }); await settle(page, 400);
  const gear = await page.evaluate(() => { const b = document.querySelector('.shell__header button[aria-label="Settings"]'); const r = b.getBoundingClientRect(); let e = b, hidden = false; while (e) { if (getComputedStyle(e).display === 'none') hidden = true; e = e.parentElement; } return { w: Math.round(r.width), h: Math.round(r.height), hidden }; });
  await page.keyboard.press('Escape'); await settle(page, 300);
  await t.check('Settings opened on desktop, window shrunk under 700px (opener now hidden), Escape: focus lands somewhere real, not on <body>', async () => {
    const a = await activeInfo(page);
    ok(a.visible && !a.body, `gear hidden=${gear.hidden} (${gear.w}x${gear.h}); focus after Escape: ${JSON.stringify(a)}`);
    return JSON.stringify({ gear, a });
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ---------------------------------------------------------------- C. rail Menu popover across the phone breakpoint */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const { page } = p;
  await page.goto(`${p.base}#/overview`); await page.waitForSelector('#shell-main h1'); await settle(page, 400);
  await page.locator('nav[aria-label="Primary"] button[aria-label="Menu"]').click(); await page.waitForSelector('nav[aria-label="Menu"] [role="menuitem"]'); await settle(page, 300);
  await page.setViewportSize({ width: 390, height: 844 }); await settle(page, 500);
  await t.check('rail Menu open on desktop, window shrinks to a phone: the popover is still on screen (or closed), never orphaned off screen', async () => {
    const r = await page.evaluate(() => { const n = document.querySelector('nav[aria-label="Menu"]'); if (!n) return null; const m = n.querySelector('[role="menu"]'); const b = (m || n).getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; });
    if (r) ok(r.x >= 0 && r.right <= 390 && r.y >= 0 && r.bottom <= 844, 'popover rect ' + JSON.stringify(r)); else return 'closed on resize';
    return JSON.stringify(r);
  });
  await page.keyboard.press('Escape'); await settle(page, 300);
  await t.check('Escape closes the popover and focus is on a visible Menu button', async () => {
    eq(await page.locator('nav[aria-label="Menu"] [role="menuitem"]').count(), 0, 'menu items left');
    const a = await activeInfo(page); ok(a.visible && !a.body, JSON.stringify(a));
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ---------------------------------------------------------------- D. stacked overlays */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const { page } = p;
  await page.goto(`${p.base}#/overview`); await page.waitForSelector('#shell-main h1'); await settle(page, 400);
  await page.locator('nav[aria-label="Primary"] button[aria-label="Menu"]').click();
  await page.getByRole('menuitem', { name: 'Demo guide' }).click(); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1); await settle(page, 400);
  await page.getByRole('button', { name: 'Give feedback' }).last().click(); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 2); await settle(page, 400);
  await t.check('stacked: Demo guide + Feedback: Escape closes only the top layer, second Escape the next, focus returns down the stack', async () => {
    eq((await dialogs(page)).length, 2, 'two layers');
    await page.keyboard.press('Escape'); await settle(page, 300);
    eq((await dialogs(page)).length, 1, 'after first Escape');
    const mid = await activeInfo(page); ok(mid.inDialog, 'focus not back inside the guide: ' + JSON.stringify(mid));
    await page.keyboard.press('Escape'); await settle(page, 300);
    eq((await dialogs(page)).length, 0, 'after second Escape');
    const end = await activeInfo(page); ok(end.visible && !end.body, 'final focus ' + JSON.stringify(end));
    return JSON.stringify({ mid: mid.label, end: end.label });
  });
  // Settings -> Reset -> confirm stacked; Tab must not leave the top layer
  await page.locator('.shell__header button[aria-label="Settings"]').click(); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1); await settle(page, 400);
  await page.getByRole('button', { name: /Reset demo changes/ }).click(); await page.waitForFunction(() => !!document.querySelector('[role="alertdialog"]')); await settle(page, 300);
  await t.check('stacked: Settings + Reset confirm: Tab x12 and Shift+Tab x12 never leave the confirm dialog', async () => {
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); const a = await activeInfo(page); ok(a.inDialog, `Tab ${i + 1} escaped the confirm: ` + JSON.stringify(a)); }
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Shift+Tab'); const a = await activeInfo(page); ok(a.inDialog, `Shift+Tab ${i + 1} escaped: ` + JSON.stringify(a)); }
  });
  await page.keyboard.press('Escape'); await settle(page, 300);
  await page.keyboard.press('Escape'); await settle(page, 300);
  eq((await dialogs(page)).length, 0, 'dialogs left');
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ---------------------------------------------------------------- E. double-click on a destructive confirm */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const { page } = p;
  await page.goto(`${p.base}#/opportunities?flag=F-C-005-overCap`); await page.waitForFunction(() => !!document.querySelector('[role="dialog"]')); await settle(page, 400);
  await page.locator('[role="dialog"] select').selectOption('explained'); await settle(page, 300);
  await page.keyboard.press('Escape'); await settle(page, 300);
  await page.locator('.shell__header button[aria-label="Settings"]').click(); await page.waitForFunction(() => !!document.querySelector('[role="dialog"]')); await settle(page, 400);
  await page.getByRole('button', { name: /Reset demo changes/ }).click(); await page.waitForFunction(() => !!document.querySelector('[role="alertdialog"]')); await settle(page, 300);
  await page.getByRole('button', { name: /^Reset changes$/ }).dblclick({ delay: 20 }).catch(() => {}); await settle(page, 600);
  await t.check('double-click on "Reset changes": reset runs once (one toast), both dialogs close, review cleared, no error', async () => {
    const toasts = await page.evaluate(() => [...document.querySelectorAll('.kx-toast')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')));
    const resets = toasts.filter((x) => /Changes reset/.test(x));
    eq(resets.length, 1, 'reset toasts: ' + JSON.stringify(toasts));
    eq((await dialogs(page)).length, 0, 'dialogs left open');
    eq(await page.evaluate(() => localStorage.getItem('kontor-triage')), null, 'triage key');
    await page.goto(`${p.base}#/overview`);
    await page.waitForFunction(() => /across \d+ contracts/.test((document.querySelector('#shell-main h1') || {}).textContent || ''), null, { timeout: 5000 }); await settle(page, 300);
    ok(/£6\.1m across 15 contracts/.test(await page.locator('#shell-main h1').innerText()), 'headline not back to £6.1m');
    return JSON.stringify(toasts);
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ---------------------------------------------------------------- F. rapid theme toggling */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const { page } = p;
  await page.goto(`${p.base}#/overview`); await page.waitForSelector('#shell-main h1'); await settle(page, 600);
  const consistent = () => page.evaluate(() => {
    const th = document.documentElement.dataset.theme;
    const btn = document.querySelector('.shell__header button[aria-pressed]');
    const headline = getComputedStyle(document.querySelector('#shell-main h1')).color;
    const lum = (c) => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    return { th, meta: document.querySelector('meta[name="color-scheme"]').content, stored: localStorage.getItem('kontor-theme'), pressed: btn.getAttribute('aria-pressed'), label: btn.getAttribute('aria-label'), h1Light: lum(headline) > 0.5, canvas: getComputedStyle(document.querySelector('.shell__main')).backgroundColor };
  });
  for (const n of [1, 2, 7, 40, 41]) {
    await page.evaluate(async (count) => { const b = () => document.querySelector('.shell__header button[aria-pressed]'); for (let i = 0; i < count; i++) b().click(); }, n);
    await settle(page, 500);
    await t.check(`${n} synchronous toggle clicks: attribute, meta, storage, aria-pressed and text colour all agree`, async () => {
      const s = await consistent();
      ok(s.th === s.meta && s.th === s.stored, 'theme/meta/storage disagree ' + JSON.stringify(s));
      ok((s.th === 'dark') === s.h1Light, 'headline colour does not match theme ' + JSON.stringify(s));
      return JSON.stringify({ th: s.th, pressed: s.pressed, label: s.label });
    });
  }
  // keyboard mashing
  await page.locator('.shell__header button[aria-pressed]').focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press(i % 2 ? 'Enter' : 'Space');
  await settle(page, 500);
  await t.check('25 Enter/Space presses on the toggle leave a consistent state and focus stays on the toggle', async () => {
    const s = await consistent(); ok(s.th === s.meta && s.th === s.stored, JSON.stringify(s));
    const a = await activeInfo(page); ok(/mode/i.test(a.label), 'focus moved: ' + JSON.stringify(a));
  });
  // toggle while navigating
  await t.check('theme toggled 10 times while hopping across 10 routes: every route is readable in the final theme (no stale colours)', async () => {
    const routes = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/contracts', '#/contracts/C-005', '#/method', '#/roadmap', '#/evidence'];
    for (let i = 0; i < 10; i++) { await page.evaluate((r) => { location.hash = r; document.querySelector('.shell__header button[aria-pressed]').click(); }, routes[i]); await page.waitForTimeout(30); }
    await settle(page, 700);
    const s = await consistent(); ok((s.th === 'dark') === s.h1Light, 'h1 colour vs theme ' + JSON.stringify(s));
    const bad = await page.evaluate(() => { const th = document.documentElement.dataset.theme; const lum = (c) => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; }; const out = []; document.querySelectorAll('#shell-main p, #shell-main h2, #shell-main td, #shell-main li').forEach((e) => { if (!e.textContent.trim() || e.offsetParent === null) return; const l = lum(getComputedStyle(e).color); if (th === 'light' && l > 0.85) out.push(e.tagName + ':' + e.textContent.trim().slice(0, 30)); if (th === 'dark' && l < 0.15) out.push(e.tagName + ':' + e.textContent.trim().slice(0, 30)); }); return out.slice(0, 5); });
    ok(bad.length === 0, `stale colours in ${s.th}: ${bad.join(' | ')}`);
    return s.th;
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ---------------------------------------------------------------- G. rapid route changes and overlay key-mashing */
{
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const { page } = p;
  await page.goto(`${p.base}#/overview`); await page.waitForSelector('#shell-main h1'); await settle(page, 500);
  const routes = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/contracts/C-011', '#/source/C-005/X-C-005-maximumValue', '#/method?s=cap', '#/roadmap', '#/evidence', '#/opportunities?flag=F-C-005-overCap', '#/opportunities?flag=F-C-001-nearCap', '#/renewals?flag=F-C-003-renewal', '#/nonsense'];
  await t.check('120 hash changes with no waiting (all routes and flag drawers): the app ends on the last route, one h1, at most one dialog, no page error', async () => {
    const seq = []; for (let i = 0; i < 120; i++) seq.push(routes[(i * 7) % routes.length]);
    seq.push('#/renewals');
    await page.evaluate(async (s) => { for (const r of s) { location.hash = r; await new Promise((res) => setTimeout(res, Math.random() * 12)); } }, seq);
    await settle(page, 900);
    const snap = await snapshot(page);
    eq(snap.hash, '#/renewals', 'final hash'); eq(snap.h1.length, 1, 'h1 count ' + JSON.stringify(snap.h1)); ok(/Renewal radar/.test(snap.h1[0]), 'h1 ' + snap.h1[0]);
    ok(snap.dialogs.length === 0, 'dialogs left: ' + snap.dialogs.join(','));
    ok(!snap.errorPanel, 'error panel');
    const a = await activeInfo(page); ok(a.inMain || a.body === false, 'focus ' + JSON.stringify(a));
    return `final focus ${JSON.stringify(a)}`;
  });
  await t.check('open/close overlays 40 times with synthetic clicks and Escape and no waiting: nothing sticks, scroll lock released, no error', async () => {
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 40; i++) {
        const btn = document.querySelector('.shell__header button[aria-label="Settings"]');
        btn.click(); await sleep(10);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await sleep(10);
      }
    });
    await settle(page, 800);
    const snap = await snapshot(page); ok(snap.dialogs.length === 0, 'stuck dialogs: ' + snap.dialogs.join(','));
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'visible', 'scroll lock stuck');
    ok(await page.evaluate(() => !document.querySelector('.kx-drawer-scrim')), 'orphan scrim');
  });
  eq(p.errors, [], 'errors');
  await p.ctx.close();
}

/* ---------------------------------------------------------------- H. 200% and 400% zoom (reflow) across every route */
{
  const routes = ['#/overview', '#/opportunities', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/contracts/C-005', '#/source/C-005/X-C-005-maximumValue?from=opportunities', '#/method', '#/roadmap', '#/evidence', '#/opportunities?flag=F-C-005-overCap'];
  for (const [label, vp] of [['200% (1440 window -> 720x450)', { width: 720, height: 450 }], ['400% (1280 window -> 320x256)', { width: 320, height: 256 }]]) {
    const p = await h.newPage({ theme: 'dark', viewport: vp });
    const { page } = p;
    const bad = [];
    for (const r of routes) {
      await page.goto('about:blank'); await page.goto(`${p.base}${r}`, { waitUntil: 'load' });
      await page.waitForSelector('#shell-main h1'); await settle(page, 350);
      const ov = await overflowX(page);
      const vis = await page.evaluate(() => { const h1 = document.querySelector('#shell-main h1').getBoundingClientRect(); const rail = document.querySelector('nav[aria-label="Primary"]').getBoundingClientRect(); const mainBox = document.getElementById('shell-main').getBoundingClientRect(); return { h1w: Math.round(h1.width), h1x: Math.round(h1.x), h1right: Math.round(h1.right), railH: Math.round(rail.height), railW: Math.round(rail.width), mainH: Math.round(mainBox.height), vh: innerHeight, vw: innerWidth }; });
      if (ov.doc > 0 || ov.main > 0 || vis.h1right > vis.vw + 1) bad.push(`${r}: doc +${ov.doc} main +${ov.main} h1 right ${vis.h1right}/${vis.vw}`);
      if (vis.mainH < 120 && vp.height >= 256) bad.push(`${r}: main region only ${vis.mainH}px tall of ${vis.vh}`);
    }
    await t.check(`reflow at ${label}: no horizontal page scroll, h1 inside the window, main region usable, on ${routes.length} routes`, async () => { ok(bad.length === 0, bad.slice(0, 6).join(' || ') + (bad.length > 6 ? ` ...(+${bad.length - 6})` : '')); });
    await p.ctx.close();
  }
}
await h.close();
t.finish();
