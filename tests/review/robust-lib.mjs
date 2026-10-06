// Shared helpers for the "robust" review scripts (robustness, performance, build hygiene).
// Plain node against dist/ through tests/lib/harness.mjs. Every script prints 'ok   <name>' / 'FAIL <name>: <why>' /
// 'note <name>: <text>' and exits non-zero when any check failed.
//   KONTOR_DIST=<dir> serves another build directory as /dist/app.* (default: dist/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme } from '../lib/harness.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCRATCH = path.join(ROOT, '.scratch', 'robust');
fs.mkdirSync(SCRATCH, { recursive: true });
export { launch, visit, go, axe, externalRequests, VIEWPORTS, setTheme };

export class T {
  constructor(name) { this.name = name; this.failed = 0; this.passed = 0; this.results = []; }
  async check(name, fn) {
    try {
      const ev = await fn();
      this.passed += 1;
      this.results.push({ name, ok: true, ev: typeof ev === 'string' ? ev : undefined });
      console.log('ok   ' + name + (typeof ev === 'string' ? '  [' + ev + ']' : ''));
    } catch (e) {
      this.failed += 1;
      const why = (e && e.message) || String(e);
      this.results.push({ name, ok: false, why });
      console.log('FAIL ' + name + ': ' + why);
    }
  }
  note(name, text) { this.results.push({ name, note: text }); console.log('note ' + name + ': ' + text); }
  finish() {
    console.log(`\n${this.name}: ${this.passed} passed, ${this.failed} failed`);
    try { fs.writeFileSync(path.join(SCRATCH, this.name + '.json'), JSON.stringify(this.results, null, 1)); } catch (e) { /* ignore */ }
    process.exitCode = this.failed ? 1 : 0;
  }
}
export const ok = (v, msg) => { if (!v) throw new Error(msg); };
export const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
export const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
export const settle = (page, ms = 150) => page.waitForTimeout(ms);
export const launchApp = () => launch({ dist: process.env.KONTOR_DIST || null });

/** Horizontal overflow of the document and of the shell main. */
export const overflowX = (page) => page.evaluate(() => ({
  doc: document.documentElement.scrollWidth - window.innerWidth,
  body: document.body.scrollWidth - window.innerWidth,
  main: (() => { const m = document.getElementById('shell-main'); return m ? m.scrollWidth - m.clientWidth : null; })(),
}));

/** What is on screen right now: for blank-screen and crash detection. */
export const snapshot = (page) => page.evaluate(() => {
  const main = document.getElementById('shell-main');
  const h1s = [...document.querySelectorAll('#shell-main h1, main h1')].map((e) => e.textContent.trim());
  const txt = (main ? main.innerText : document.body.innerText) || '';
  return {
    title: document.title,
    h1: h1s,
    mainChars: txt.trim().length,
    hasShell: !!document.querySelector('.shell__header'),
    errorPanel: !!document.querySelector('.error-panel'),
    notFound: /couldn.t find|not found/i.test(txt.slice(0, 400)),
    dialogs: [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map((d) => (d.getAttribute('aria-label') || (d.querySelector('h2') || {}).textContent || '').trim()),
    hash: location.hash,
    text: txt.trim().replace(/\s+/g, ' ').slice(0, 200),
  };
});
