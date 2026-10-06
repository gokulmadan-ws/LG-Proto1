// UI kit and chart library checks (owner A3). Plain node, exits 1 on any failure.
//   node tests/ui-checks.mjs                 build the gallery fixture, then run everything
//   node tests/ui-checks.mjs a11y            only axe     (also: keys, contrast, focus, css)
//   node tests/ui-checks.mjs --no-build      reuse .scratch/ui-checks from the last build
//
// a11y      axe (wcag2a/aa/21aa/22aa + best-practice) on tests/fixtures/ui-gallery.jsx, both themes, 1440 and 390 wide, with the
//           dialog, confirm, drawer and toasts open
// keys      keyboard and behaviour assertions: dialog, confirm, drawer, nested overlays, menu, segmented, table row guards, tooltip,
//           toasts, native fields, chart tooltips
// contrast  computed WCAG contrast of every visible text element in both themes (lowest ratio is printed)
// focus     every control draws a visible focus ring after keyboard focus, both themes
// css       no hex colours, gradients, emoji or exclamation marks in src/ui and src/charts
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { launch, visit, axe, ROOT } from './lib/harness.mjs';

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const want = (n) => !only.length || only.includes(n);
const OUT = '.scratch/ui-checks';
if (!args.includes('--no-build')) {
  const r = spawnSync('node', ['scripts/build.mjs', '--entry', 'tests/fixtures/ui-gallery.jsx', '--outdir', OUT], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
}

let failed = 0;
let passed = 0;
const ok = (name, cond, extra = '') => { if (cond) passed += 1; else failed += 1; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
const h = await launch({ dist: OUT });

/* ------------------------------------------------------------------------------------------------ css */
if (want('css')) {
  console.log('\n== css');
  const files = [...fs.readdirSync(path.join(ROOT, 'src/ui')).map((f) => 'src/ui/' + f), ...fs.readdirSync(path.join(ROOT, 'src/charts')).map((f) => 'src/charts/' + f)];
  let bad = [];
  for (const f of files) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (/#[0-9a-fA-F]{3,8}\b/.test(t.replace(/href="#[^"]*"/g, ''))) bad.push(f + ': hex colour');
    if (/gradient/i.test(t)) bad.push(f + ': gradient');
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)) bad.push(f + ': emoji');
    if (/['"`>][^'"`<>\n]*[a-z]![ '"`<]/.test(t)) bad.push(f + ': exclamation mark in text');
    if (/\bsaving/i.test(t.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')) && !/not a (confirmed )?saving/.test(t)) bad.push(f + ': the word saving');
  }
  ok('no hex, gradient, emoji, exclamation mark or "saving" in src/ui and src/charts', bad.length === 0, bad.join('; '));
}

/* ------------------------------------------------------------------------------------------------ a11y */
if (want('a11y')) {
  console.log('\n== a11y');
  for (const theme of ['dark', 'light']) {
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const t = await h.newPage({ theme, viewport: vp });
      await visit(t, '#/all');
      await t.page.waitForTimeout(500);
      const v = await axe(t.page);
      ok(`${theme} ${vp.width}: page, 0 axe violations`, v.length === 0, v.map((x) => x.id + ' ' + x.targets[0]).join(' | '));
      if (vp.width === 1440) {
        for (const [name, id] of [['dialog', '#open-dialog'], ['confirm', '#open-confirm'], ['drawer', '#open-drawer']]) {
          await t.page.click(id);
          await t.page.waitForTimeout(350);
          const vv = await axe(t.page);
          ok(`${theme} 1440: ${name} open, 0 axe violations`, vv.length === 0, vv.map((x) => x.id + ' ' + x.targets[0]).join(' | '));
          await t.page.keyboard.press('Escape');
          await t.page.waitForTimeout(250);
        }
        for (const label of ['Info toast', 'Success toast', 'Error toast']) await t.page.getByRole('button', { name: label }).click();
        await t.page.waitForTimeout(300);
        const vt = await axe(t.page);
        ok(`${theme} 1440: toasts open, 0 axe violations`, vt.length === 0, vt.map((x) => x.id + ' ' + x.targets[0]).join(' | '));
      }
      ok(`${theme} ${vp.width}: no console errors`, t.errors.length === 0, t.errors.join(' | '));
    }
  }
}

/* ------------------------------------------------------------------------------------------------ keys */
if (want('keys')) {
  console.log('\n== keys');
  const t = await h.newPage({ theme: 'dark', viewport: { width: 1440, height: 900 } });
  const p = t.page;
  await visit(t, '#/ui');
  await p.waitForTimeout(400);
  const active = () => p.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.getAttribute('aria-label') || a.textContent.trim().slice(0, 40) || a.tagName) : null; });
  const inside = (sel) => p.evaluate((s) => !!document.activeElement.closest(s), sel);
  const toastText = () => p.evaluate(() => Array.from(document.querySelectorAll('.kx-toast')).map((e) => e.textContent));
  const clearToasts = () => p.evaluate(() => document.querySelectorAll('.kx-toast__close').forEach((b) => b.click()));
  const count = (sel) => p.locator(sel).count();

  // Dialog
  await p.focus('#open-dialog'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok('dialog: role dialog, aria-modal, labelled', await p.evaluate(() => { const d = document.querySelector('.kx-dialog'); return d && d.getAttribute('role') === 'dialog' && d.getAttribute('aria-modal') === 'true' && !!d.getAttribute('aria-labelledby'); }));
  ok('dialog: focus moves inside', await inside('.kx-dialog'), await active());
  let stays = true;
  for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); if (!(await inside('.kx-dialog'))) stays = false; }
  ok('dialog: Tab x12 stays inside (focus trap)', stays);
  await p.keyboard.press('Shift+Tab');
  ok('dialog: Shift+Tab stays inside', await inside('.kx-dialog'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok('dialog: Escape closes, focus returns to the trigger', (await count('.kx-dialog')) === 0 && (await active()) === 'open-dialog', await active());
  await p.click('#open-dialog'); await p.waitForTimeout(250);
  await p.mouse.click(5, 5); await p.waitForTimeout(200);
  ok('dialog: scrim click closes', (await count('.kx-dialog')) === 0);

  // ConfirmDialog
  await p.click('#open-confirm'); await p.waitForTimeout(300);
  ok('confirm: role alertdialog, Cancel focused first', await p.evaluate(() => document.querySelector('.kx-dialog').getAttribute('role') === 'alertdialog') && (await active()) === 'Cancel', await active());
  ok('confirm: destructive confirm button is filled', await p.evaluate(() => { const b = Array.from(document.querySelectorAll('.kx-dialog__foot button')).find((x) => x.textContent === 'Reset changes'); return !!b && getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)'; }));
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok('confirm: Enter on Cancel closes without confirming', (await count('.kx-dialog')) === 0 && !(await toastText()).some((x) => x.includes('Changes reset')));
  await p.click('#open-confirm'); await p.waitForTimeout(250);
  await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  ok('confirm: confirming closes it and shows the toast', (await count('.kx-dialog')) === 0 && (await toastText()).some((x) => x.includes('Changes reset')));
  await clearToasts();

  // Drawer
  await p.focus('#open-drawer'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.kx-drawer')).animationDuration);
  ok('drawer: 200ms slide', dur === '0.2s', dur);
  ok('drawer: focus moves inside', await inside('.kx-drawer'), await active());
  stays = true;
  for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); if (!(await inside('.kx-drawer'))) stays = false; }
  ok('drawer: Tab x25 stays inside', stays);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok('drawer: Escape closes, focus returns to the trigger', (await count('.kx-drawer')) === 0 && (await active()) === 'open-drawer', await active());

  // Nested: confirm over the drawer
  await p.focus('#open-drawer'); await p.keyboard.press('Enter'); await p.waitForTimeout(350);
  await p.focus('#drawer-confirm'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok('nested: confirm opens above the drawer with Cancel focused', (await count('.kx-dialog[role=alertdialog]')) === 1 && (await active()) === 'Cancel', await active());
  const zs = await p.evaluate(() => ({ d: +getComputedStyle(document.querySelector('.kx-drawer')).zIndex, s: +getComputedStyle(document.querySelector('.kx-scrim')).zIndex }));
  ok('nested: dialog scrim is above the drawer', zs.s > zs.d, JSON.stringify(zs));
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok('nested: first Escape closes only the confirm, focus back in the drawer', (await count('.kx-dialog')) === 0 && (await count('.kx-drawer')) === 1 && (await active()) === 'drawer-confirm', await active());
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok('nested: second Escape closes the drawer, focus on its trigger', (await count('.kx-drawer')) === 0 && (await active()) === 'open-drawer', await active());

  // Rail menu (anchor = element handed over by the shell)
  await p.getByRole('button', { name: 'Menu', exact: true }).first().click(); await p.waitForTimeout(300);
  const rm = await p.evaluate(() => { const m = document.querySelector('[role="menu"][aria-label="Kontor menu"]'); if (!m) return null; const r = m.getBoundingClientRect(); return { l: r.left, b: r.bottom, h: innerHeight }; });
  ok('rail menu: opens beside the rail, inside the viewport', !!rm && rm.l >= 0 && rm.b <= rm.h, JSON.stringify(rm));
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok('rail menu: Escape returns focus to the Menu button', await p.evaluate(() => (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').includes('Menu')), await active());

  // Menu (MenuButton)
  const mb = p.getByRole('button', { name: 'More actions' });
  await mb.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  ok('menu: opens as role=menu with the first item focused', (await count('[role="menu"]')) === 1 && (await active()).startsWith('Download CSV'), await active());
  await p.keyboard.press('ArrowDown'); ok('menu: ArrowDown moves to the next item', (await active()).startsWith('Edit filters'), await active());
  await p.keyboard.press('ArrowDown'); ok('menu: ArrowDown skips the separator', (await active()).startsWith('Reset'), await active());
  await p.keyboard.press('ArrowDown'); ok('menu: ArrowDown wraps to the first item', (await active()).startsWith('Download CSV'), await active());
  await p.keyboard.press('ArrowUp'); ok('menu: ArrowUp wraps to the last item', (await active()).startsWith('Reset'), await active());
  await p.keyboard.press('Home'); ok('menu: Home', (await active()).startsWith('Download CSV'));
  await p.keyboard.press('End'); ok('menu: End', (await active()).startsWith('Reset'));
  await p.keyboard.press('e'); ok('menu: a letter jumps to the next matching item', (await active()).startsWith('Edit filters'), await active());
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok('menu: Escape closes it and returns focus to the button', (await count('[role="menu"]')) === 0 && (await active()) === 'More actions', await active());
  await mb.click(); await p.waitForTimeout(200);
  await p.mouse.click(700, 60); await p.waitForTimeout(200);
  ok('menu: a press outside closes it', (await count('[role="menu"]')) === 0);
  await mb.focus(); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(250);
  ok('menu: ArrowDown on the button opens it', (await count('[role="menu"]')) === 1);
  await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  ok('menu: Enter selects, closes, focus on the button, onSelect ran', (await count('[role="menu"]')) === 0 && (await active()) === 'More actions' && (await toastText()).some((x) => x.includes('Download started')));
  await mb.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(250); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  ok('menu: Tab closes it', (await count('[role="menu"]')) === 0);
  await clearToasts();
  await p.click('#gal-menu'); await p.waitForTimeout(250);
  const mr = await p.evaluate(() => { const r = document.querySelector('[role="menu"]').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
  ok('menu: portal, inside the viewport, not clipped by the panel', mr.l >= 0 && mr.t >= 0 && mr.r <= mr.w && mr.b <= mr.h, JSON.stringify(mr));
  await p.keyboard.press('Escape');

  // Segmented
  const seg = p.getByRole('radiogroup', { name: 'Show flags' });
  const radios = seg.getByRole('radio');
  ok('segmented: one tab stop (roving tabindex)', await seg.evaluate((g) => g.querySelectorAll('[tabindex="0"]').length === 1));
  await radios.nth(0).focus(); await p.keyboard.press('ArrowRight');
  ok('segmented: ArrowRight selects and focuses the next', (await radios.nth(1).getAttribute('aria-checked')) === 'true' && (await active()).startsWith('Reviewed'), await active());
  await p.keyboard.press('End'); ok('segmented: End', (await radios.nth(2).getAttribute('aria-checked')) === 'true');
  await p.keyboard.press('ArrowRight'); ok('segmented: ArrowRight wraps to the first', (await radios.nth(0).getAttribute('aria-checked')) === 'true');
  await p.keyboard.press('ArrowLeft'); ok('segmented: ArrowLeft wraps to the last', (await radios.nth(2).getAttribute('aria-checked')) === 'true');

  // DataTable
  const tbl = p.locator('.kx-table').first();
  const rowsLoc = tbl.locator('tbody tr');
  await rowsLoc.nth(1).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  ok('table: Enter on the focused row opens it', (await toastText()).some((x) => x.includes('Row opened: C-017')), (await toastText()).join('|'));
  await clearToasts();
  const link = rowsLoc.nth(2).locator('a');
  await link.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  let tt = await toastText();
  ok('table: Enter on a link inside a row follows the link, not the row', tt.some((x) => x.includes('Link followed')) && !tt.some((x) => x.includes('Row opened')), tt.join('|'));
  await clearToasts();
  await link.click(); await p.waitForTimeout(150);
  tt = await toastText();
  ok('table: a click on a link inside a row does not open the row', tt.some((x) => x.includes('Link followed')) && !tt.some((x) => x.includes('Row opened')), tt.join('|'));
  await clearToasts();
  await rowsLoc.nth(3).locator('td').nth(2).click(); await p.waitForTimeout(150);
  ok('table: a click on a cell opens the row', (await toastText()).some((x) => x.includes('Row opened: C-003')));
  await clearToasts();
  await tbl.getByRole('button', { name: 'Annual value' }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  ok('table: a sortable header sets aria-sort', (await tbl.locator('th[aria-sort]').getAttribute('aria-sort')) === 'ascending');

  // Tooltip
  const trig = p.getByRole('button', { name: 'Hover or focus me' });
  await p.focus('#gal-menu'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  ok('tooltip: shows on keyboard focus', (await count('[role="tooltip"].kx-tip')) === 1, await active());
  ok('tooltip: the trigger is described by it (aria-describedby)', await p.evaluate(() => { const tp = document.querySelector('[role="tooltip"].kx-tip'); const a = document.activeElement; return !!tp && !!a.getAttribute('aria-describedby') && a.getAttribute('aria-describedby').split(' ').includes(tp.id); }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok('tooltip: Escape hides it and focus stays', (await count('[role="tooltip"].kx-tip')) === 0 && (await active()).startsWith('Hover or focus me'), await active());
  await p.mouse.move(5, 400); await trig.hover(); await p.waitForTimeout(400);
  ok('tooltip: shows on hover', (await count('[role="tooltip"].kx-tip')) === 1);
  const tr = await p.evaluate(() => { const r = document.querySelector('.kx-tip').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
  ok('tooltip: portal, inside the viewport, not clipped by the panel', tr.l >= 0 && tr.t >= 0 && tr.r <= tr.w && tr.b <= tr.h, JSON.stringify(tr));
  const tb = await p.locator('.kx-tip').boundingBox(); await p.mouse.move(tb.x + 5, tb.y + 5); await p.waitForTimeout(300);
  ok('tooltip: hoverable (the pointer can move onto it)', (await count('.kx-tip')) === 1);
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  ok('tooltip: hides when the pointer leaves', (await count('.kx-tip')) === 0);

  // Toasts
  await clearToasts();
  await p.getByRole('button', { name: 'Success toast' }).click(); await p.getByRole('button', { name: 'Error toast' }).click(); await p.waitForTimeout(300);
  ok('toast: success is role=status in a polite region, error is role=alert in an assertive one', await p.evaluate(() => { const s = document.querySelector('.kx-toast--success'); const e = document.querySelector('.kx-toast--error'); return s.getAttribute('role') === 'status' && s.parentElement.getAttribute('aria-live') === 'polite' && e.getAttribute('role') === 'alert' && e.parentElement.getAttribute('aria-live') === 'assertive'; }));
  await p.waitForTimeout(6500);
  ok('toast: success dismisses itself after about 6 seconds, the error stays', (await count('.kx-toast--success')) === 0 && (await count('.kx-toast--error')) === 1);
  await p.locator('.kx-toast--error .kx-toast__close').click(); await p.waitForTimeout(100);
  ok('toast: the error closes with its button', (await count('.kx-toast--error')) === 0);

  // Native fields
  const sw = p.getByRole('switch', { name: /Include indicative figures/ });
  await sw.focus(); await p.keyboard.press('Space');
  ok('switch: Space toggles it', (await sw.isChecked()) === false);
  await p.getByText('Show reviewed flags').click();
  ok('check: clicking the label text toggles it', (await p.getByRole('checkbox', { name: /Show reviewed flags/ }).isChecked()) === false);
  await p.getByRole('radio', { name: /^5%/ }).focus(); await p.keyboard.press('ArrowDown');
  ok('radio group: arrow keys move the selection', await p.getByRole('radio', { name: /^8%/ }).isChecked());
  const rowH = await p.getByRole('checkbox', { name: /Unchecked/ }).evaluate((i) => i.closest('label').getBoundingClientRect().height);
  ok('check: the row is at least 44px tall', rowH >= 44, String(rowH));
  ok('field: label for, aria-describedby and aria-invalid are wired', await p.evaluate(() => { const ta = Array.from(document.querySelectorAll('textarea')).find((x) => x.getAttribute('aria-invalid') === 'true'); return !!ta && !!document.getElementById(ta.getAttribute('aria-describedby').split(' ')[0]) && !!document.querySelector('label[for="' + ta.id + '"]'); }));

  // Chart tooltips and row navigation
  await p.mouse.move(5, 5); await visit(t, '#/charts'); await p.waitForTimeout(800);
  await p.locator('.kviz-bl__name').first().focus(); await p.waitForTimeout(250);
  ok('chart: focusing a row shows its tooltip', (await count('.kviz-tip')) === 1);
  ok('chart: the tooltip never says "saving"', !(await p.locator('.kviz-tip').first().textContent()).toLowerCase().includes('saving'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok('chart: Escape hides the tooltip', (await count('.kviz-tip')) === 0);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100);
  ok('chart: ArrowDown moves to the next row', (await p.evaluate(() => document.activeElement.getAttribute('aria-label') || '')).startsWith('ICT'));
  ok('chart: no nested interactive elements inside a row', await p.evaluate(() => !document.querySelector('.kviz-row a a, .kviz-row button button, .kviz-row a button, .kviz-row button a')));
  ok('chart: golden headline strings', await p.evaluate(() => { const t = document.querySelector('.kviz-headline h2, .kviz-headline h1').textContent.replace(/\s+/g, ' '); return t.includes('£6.1m across 15 contracts flagged as opportunities to investigate'); }));
  ok('chart: golden card labels', await p.evaluate(() => { const l = Array.from(document.querySelectorAll('.kviz-card')).map((e) => e.getAttribute('aria-label')); return ['Spend over cap £4.2m, 3 contracts, already paid above the cap', 'Close to cap £0.6m, 1 contract, projected at the current pace', 'Renewals £1.1m, 12 contracts, indicative value per year', 'Price increases above cap £0.3m, 3 contracts, already paid above the cap'].every((x) => l.includes(x)); }));
  ok('chart: radar strip and cap list golden numbers', await p.evaluate(() => { const b = Array.from(document.querySelectorAll('.kviz-rs__band')).map((e) => e.getAttribute('aria-label')); const cap = document.querySelector('.kviz-bl__name').getAttribute('aria-label'); return b[0] === 'Next 3 months: 3 contracts, £6.9m a year' && b[1] === '3 to 6 months: 4 contracts, £7.3m a year' && b[2] === '6 to 12 months: 2 contracts, £2.2m a year' && cap.includes('£8,350,000 spent against a cap of £5,000,000: 167.0%') && cap.includes('£3,350,000 over'); }));
  ok('chart: opportunity list shows all 19 ranked flags with reviewed rows muted', await p.evaluate(() => document.querySelectorAll('.kviz-barlist__row').length >= 19 && document.querySelectorAll('.kviz-row.is-muted').length === 2));
  ok('chart: coverage block lists all 8 suppliers and £23,830,000', await p.evaluate(() => { const c = document.querySelector('.kviz-cov'); return c.querySelectorAll('.kviz-barlist__row').length === 8 && c.textContent.includes('£23,830,000'); }));
  ok('chart: group headings are h3 (heading order valid under h1 > h2)', await p.evaluate(() => !document.querySelector('.kviz-rl h4, .kviz-cov h4') && document.querySelectorAll('.kviz-rl h3').length >= 4 && !!document.querySelector('.kviz-cov h3')));
  ok('chart: no console errors', t.errors.length === 0, t.errors.join(' | '));
}

/* ------------------------------------------------------------------------------------------------ contrast */
if (want('contrast')) {
  console.log('\n== contrast');
  for (const theme of ['dark', 'light']) {
    const t = await h.newPage({ theme, viewport: { width: 1440, height: 3600 } });
    await visit(t, '#/all'); await t.page.waitForTimeout(600);
    const r = await t.page.evaluate(() => {
      const parse = (s) => {
        let m = s.match(/^rgba?\(([^)]+)\)$/);
        if (m) { const a = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [a[0], a[1], a[2], a[3] == null ? 1 : a[3]]; }
        m = s.match(/^color\(srgb ([^)]+)\)$/);
        if (m) { const a = m[1].split(/[ /]+/).filter(Boolean).map(Number); return [a[0] * 255, a[1] * 255, a[2] * 255, a[3] == null ? 1 : a[3]]; }
        return [0, 0, 0, 0];
      };
      const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); return a === 0 ? [0, 0, 0, 0] : [0, 1, 2].map((i) => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat([a]); };
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const canvas = dark ? [8, 9, 11, 1] : [255, 255, 255, 1];
      const bgOf = (el) => {
        const layers = [];
        for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] === 1) break; }
        let acc = canvas;
        for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
        return acc;
      };
      const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
      const rows = [];
      const w = document.createTreeWalker(document.querySelector('#shell-main'), NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (w.nextNode()) {
        const n = w.currentNode;
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (seen.has(el)) continue;
        seen.add(el);
        const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
        if (cs.visibility === 'hidden' || cs.display === 'none' || !rc.width || !rc.height || el.closest('.kx-sr-only,.sr-only,.kviz-sr') || el.closest(':disabled,.kx-field--disabled')) continue;
        let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
        const bg = bgOf(el);
        const fg0 = parse(cs.color);
        const fg = over([fg0[0], fg0[1], fg0[2], fg0[3] * op], bg);
        const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight, 10) >= 700;
        rows.push({ text: n.textContent.trim().slice(0, 40), cr: ratio(fg, bg), need: size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5, pill: !!el.closest('.kx-pill,.kviz-pill') });
      }
      const pills = rows.filter((x) => x.pill).map((x) => x.cr);
      return { n: rows.length, fails: rows.filter((x) => x.cr < x.need).slice(0, 8), min: Math.min(...rows.map((x) => x.cr)), pillMin: Math.min(...pills), pills: pills.length };
    });
    ok(`${theme}: ${r.n} text elements, all at AA (lowest ${r.min.toFixed(2)}:1); ${r.pills} pill labels, lowest ${r.pillMin.toFixed(2)}:1`, r.fails.length === 0 && r.pillMin >= 4.5, JSON.stringify(r.fails));
  }
}

/* ------------------------------------------------------------------------------------------------ focus */
if (want('focus')) {
  console.log('\n== focus');
  for (const theme of ['dark', 'light']) {
    const t = await h.newPage({ theme, viewport: { width: 1440, height: 900 } });
    await visit(t, '#/all'); await t.page.waitForTimeout(400);
    await t.page.keyboard.press('Tab');
    const targets = [
      ['segmented', '[role=radio][aria-checked=true]'], ['chip', '.kx-chip'], ['checkbox', '.kx-field input[type=checkbox]', '+'], ['switch', '[role=switch]', '+'], ['route tab', '.kx-routetab'],
      ['table row', '.kx-table tbody tr'], ['sort header', '.kx-table th .sort'], ['tag remove', '.kx-tag__x'], ['menu button', '.kx-menubtn button'], ['pager', '.kx-pager button[aria-current=page]'],
      ['DS button', '#open-dialog'], ['filter chip', '.kviz-chipbtn'], ['headline figure', '.kviz-hero'], ['chart row link', '.kviz-bl__name', '::after'], ['opportunity row link', '.kviz-barlist__name', '::after'],
    ];
    const bad = [];
    for (const [n, sel, mode] of targets) {
      const el = t.page.locator(sel).first();
      if (!(await el.count())) { bad.push(n + ' missing'); continue; }
      await el.focus({ timeout: 4000 });
      const o = await el.evaluate((e, m) => { const target = m === '+' ? e.nextElementSibling : e; const cs = getComputedStyle(target, m === '::after' ? '::after' : null); return { s: cs.outlineStyle, w: parseFloat(cs.outlineWidth) }; }, mode);
      if (o.s === 'none' || o.w < 2) bad.push(n);
    }
    ok(`${theme}: ${targets.length} controls draw a 2px focus ring on keyboard focus`, bad.length === 0, bad.join(', '));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
await h.close();
process.exit(failed ? 1 : 0);
