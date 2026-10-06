// robust-hostile: weird and hostile addresses and query strings, each loaded as a fresh page (full load) in dark.
// A page passes when it renders the shell, a single h1, no error panel (the error boundary is a last resort, not a not-found page),
// no page error, no horizontal page scroll, and never an uncaught exception. Prototype-key lookups (constructor, __proto__, toString)
// are the classic way a plain-object lookup table turns a typo into a crash.
//   node tests/review/robust-hostile.mjs
import { T, ok, launchApp, visit, snapshot, overflowX, settle, VIEWPORTS } from './robust-lib.mjs';

const t = new T('robust-hostile');
const h = await launchApp();
const long = 'a'.repeat(100000);
const addresses = [
  // contracts
  '#/contracts/C-999', '#/contracts/c-005', '#/contracts/C-005/', '#/contracts/../x', '#/contracts/C-005/extra',
  '#/contracts/C-005%2Fx', '#/contracts/%E0%A4%A', '#/contracts/%00', '#/contracts/%3Cscript%3Ealert(1)%3C%2Fscript%3E',
  '#/contracts/constructor', '#/contracts/__proto__', '#/contracts/toString', '#/contracts/hasOwnProperty',
  '#/contracts?q=' + encodeURIComponent('<img src=x onerror=alert(1)>'), '#/contracts?q=' + long, '#/contracts?q=%F0%9F%A6%80%E2%80%AEdesrever', '#/contracts?q=%',
  '#/contracts?sort=constructor', '#/contracts?sort=__proto__&dir=toString', '#/contracts?category=__proto__', '#/contracts?category=constructor', '#/contracts?page=-1', '#/contracts?page=99999', '#/contracts?page=abc',
  '#/contracts/C-005?page=-5', '#/contracts/C-005?page=999999', '#/contracts/C-005?page=NaN',
  // source viewer
  '#/source/C-005/nope', '#/source/C-999/x', '#/source/C-005', '#/source', '#/source/constructor/constructor', '#/source/__proto__/__proto__', '#/source/C-005/toString',
  '#/source/C-005/X-C-005-maximumValue?from=<script>', '#/source/C-005/X-C-005-maximumValue?from=__proto__', '#/source/C-005/X-C-005-maximumValue?from=constructor',
  '#/source/C-005/X-C-005-maximumValue?from=method', '#/source/C-005/X-C-005-maximumValue?from=' + long.slice(0, 5000),
  '#/source/C-005/X-C-004-maximumValue', '#/source/C-005/X-C-005-maximumValue/extra',
  // spend
  '#/spend/foo', '#/spend/matches/extra', '#/spend/', '#/spend/MATCHES', '#/spend/no-contract?q=zzz', '#/spend?payments=constructor', '#/spend?contract=C-999', '#/spend?contract=__proto__',
  // opportunities and the flag drawer
  '#/opportunities?flag=nonexistent', '#/opportunities?flag=constructor', '#/opportunities?flag=__proto__', '#/opportunities?flag=toString', '#/opportunities?flag=hasOwnProperty',
  '#/opportunities?flag=F-C-005-overCap&flag=F-C-001-nearCap', '#/opportunities?flag=', '#/opportunities?flag=%', '#/opportunities?flag=%00',
  '#/opportunities?type=<script>', '#/opportunities?type=constructor', '#/opportunities?type=__proto__', '#/opportunities?status=__proto__', '#/opportunities?status=constructor',
  '#/opportunities?sort=toString', '#/opportunities?sort=__proto__', '#/opportunities?q=' + long, '#/opportunities?q=%F0%9F%A6%80', '#/opportunities?q=<b>x</b>&type=overCap&status=all&sort=date',
  '#/opportunities?q=%E2%80%AE', '#/overview?flag=F-C-005-overCap', '#/renewals?flag=F-C-005-overCap', '#/contracts/C-005?flag=nonexistent', '#/method?flag=constructor',
  // method
  '#/method?s=constructor', '#/method?s=__proto__', '#/method?s=<img src=x onerror=alert(1)>', '#/method?s=nope', '#/method?s=cap&s=notice', '#/method/extra',
  // routes
  '#/OVERVIEW', '#/overview/x', '#//overview', '#/%20', '#/../../etc/passwd', '#!/overview', '#/constructor', '#/__proto__', '#/toString', '#/hasOwnProperty', '#/valueOf',
  '#/spend?payments=C-999', '#/spend?payments=C-006', '#/spend?payments=C-005', '#/spend?payments=', '#/spend/no-contract?payee=constructor', '#/spend/no-contract?payee=nonexistent', '#/spend/no-contract?payee=__proto__',
  '#/spend/matches?payee=constructor', '#/spend?state=constructor', '#/spend?state=__proto__', '#/spend/matches?state=__proto__', '#/spend/matches?q=%3Cb%3E&sort=constructor', '#/spend?sort=__proto__&dir=__proto__',
  '#/roadmap/x', '#/evidence?x=1', '#/ui', '#/charts', '#/all', '#', '#/', '', '#/?', '#/?flag=F-C-005-overCap', '#?flag=F-C-005-overCap', '#/%E0%A4%A', '#/' + 'a'.repeat(5000),
];

const only = process.argv.find((a) => a.startsWith('--only='));
const list = only ? addresses.filter((a) => a.includes(only.slice(7))) : addresses;
const rows = [];
for (const addr of list) {
  const p = await h.newPage({ theme: 'dark', viewport: VIEWPORTS.desktop });
  const label = addr.length > 90 ? addr.slice(0, 80) + `...(${addr.length})` : addr;
  let snap = null, ov = null, failure = null;
  const dialogs = [];
  p.page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  try {
    await p.page.goto('about:blank');
    await p.page.goto(`${p.base}${addr}`, { waitUntil: 'load' });
    await p.page.waitForSelector('#shell-main h1, .error-panel h1', { timeout: 6000 }).catch(() => {});
    await settle(p.page, 350);
    snap = await snapshot(p.page);
    ov = await overflowX(p.page);
  } catch (e) { failure = e.message; }
  const row = { addr: label, h1: snap && snap.h1.join(' | '), title: snap && snap.title, chars: snap && snap.mainChars, errorPanel: snap && snap.errorPanel, shell: snap && snap.hasShell, dialogs: snap && snap.dialogs.join(','), overflow: ov && ov.doc, errors: p.errors.filter((e) => !/Failed to load resource.*(font|ds)/.test(e)).map((e) => e.slice(0, 160)), alerts: dialogs, failure };
  rows.push(row);
  await t.check(`address ${label}`, async () => {
    ok(!failure, 'navigation failed: ' + failure);
    ok(snap.hasShell, 'shell missing (blank screen?)');
    ok(snap.h1.length === 1, `expected one h1, found ${snap.h1.length}: ${JSON.stringify(snap.h1)}`);
    ok(snap.mainChars > 20, 'main is empty');
    ok(!snap.errorPanel, `error boundary shown for a plain address: ${snap.h1.join('|')} / ${row.errors[0] || ''}`);
    ok(p.errors.filter((e) => /pageerror/.test(e)).length === 0, 'page error: ' + p.errors.join(' || ').slice(0, 300));
    ok(ov.doc <= 0, 'document scrolls horizontally by ' + ov.doc + 'px');
    ok(dialogs.length === 0, 'script ran: ' + dialogs.join(','));
    return `${snap.h1[0]} (${snap.dialogs.join(',') || 'no dialog'})`;
  });
  await p.ctx.close();
}
import fs from 'node:fs';
import { SCRATCH } from './robust-lib.mjs';
import path from 'node:path';
fs.writeFileSync(path.join(SCRATCH, 'hostile-rows.json'), JSON.stringify(rows, null, 1));
await h.close();
t.finish();
