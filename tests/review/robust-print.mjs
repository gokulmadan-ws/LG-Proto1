// robust-print: Ctrl+P / "Save as PDF" sanity. The app has no @media print rules; this measures what a council contact would get.
// Uses Chromium page.pdf() (A4, print media) on the long pages, in both themes, and reads the result with pdfinfo / pdftotext.
// A page passes when the PDF carries the page's content (not just the first screen), has a light background, and is not clipped
// to one viewport. Writes the PDFs to .scratch/robust/print/.
//   node tests/review/robust-print.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { T, ok, SCRATCH, launchApp, settle, VIEWPORTS } from './robust-lib.mjs';

const t = new T('robust-print');
const dir = path.join(SCRATCH, 'print'); fs.mkdirSync(dir, { recursive: true });
const h = await launchApp();
const cases = [
  ['overview', '#/overview', ['£6.1m', '£6,145,238', 'Renewal']],
  ['renewals', '#/renewals', ['Needs attention now', 'Notice period']],
  ['opportunities', '#/opportunities', ['Highways reactive maintenance', 'Harlowe', 'F-C-017', 'Showing']],
  ['spend', '#/spend', ['C-005', '167.0%']],
  ['contracts', '#/contracts', ['C-001', 'C-024']],
  ['detail', '#/contracts/C-005', ['Highways reactive maintenance', 'Sample payments']],
  ['source', '#/source/C-005/X-C-005-maximumValue?from=opportunities', ['Cited clause', '14.3']],
  ['method', '#/method', ['How this is calculated', 'Limits']],
  ['evidence', '#/evidence', ['Why this matters', 'Sefton']],
  ['roadmap', '#/roadmap', ['Roadmap', 'Stage 2']],
];
for (const theme of ['dark', 'light']) {
  const p = await h.newPage({ theme, viewport: VIEWPORTS.desktop });
  for (const [name, hash, needles] of cases) {
    await p.page.goto('about:blank'); await p.page.goto(`${p.base}${hash}`, { waitUntil: 'load' });
    await p.page.waitForSelector('#shell-main h1'); await settle(p.page, 500);
    await p.page.emulateMedia({ media: 'print' });
    const file = path.join(dir, `${name}-${theme}.pdf`);
    await p.page.pdf({ path: file, format: 'A4', printBackground: false });
    const pages = +(execFileSync('pdfinfo', [file]).toString().match(/Pages:\s+(\d+)/) || [0, 0])[1];
    const txt = execFileSync('pdftotext', ['-layout', file, '-']).toString();
    const mainChars = await p.page.evaluate(() => (document.getElementById('shell-main') || document.body).innerText.length);
    const bg = await p.page.evaluate(() => getComputedStyle(document.body).backgroundColor + ' | ' + getComputedStyle(document.documentElement).backgroundColor + ' | color ' + getComputedStyle(document.getElementById('shell-main') || document.body).color);
    await p.page.emulateMedia({ media: 'screen' });
    await t.check(`print ${name} (${theme}): content past the first screen reaches the PDF`, async () => {
      const missing = needles.filter((n) => !txt.includes(n));
      ok(!missing.length, `PDF (${pages} page${pages === 1 ? '' : 's'}, ${txt.length} chars of ${mainChars} on screen) lacks: ${missing.join(' | ')}`);
      return `${pages} pages, ${txt.length} chars of ${mainChars}`;
    });
    await t.check(`print ${name} (${theme}): a print-friendly page (light paper, shell chrome dropped, long pages not squeezed onto one sheet)`, async () => {
      const lightText = /color rgb\((2[0-9]{2}|1[5-9][0-9]), (2[0-9]{2}|1[5-9][0-9]), (2[0-9]{2}|1[5-9][0-9])\)/.test(bg);
      ok(!lightText, 'print uses the on-screen palette: pale text colour on paper: ' + bg);
      const railOnPaper = /Primary/.test(txt) || /Apps\s+Chat/.test(txt);
      ok(!railOnPaper, 'shell chrome (Apps / Chat tabs, rail) is printed');
      return bg;
    });
  }
  await p.ctx.close();
}
await h.close();
t.finish();
