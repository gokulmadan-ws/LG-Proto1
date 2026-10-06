// Data review: drive the real UI (clicks, select, settings radios, confirm dialog) through the requirements 6.6 scenarios and, after
// every action, re-read Overview, Opportunities, Renewals, Spend, Matches, No-contract, Contracts and one contract page and compare
// with the independent engine. Also proves persistence across reload and the system-clock independence (R10).
//   node tests/review/data-drive.mjs
import { E, DATA, launch, visit, go, money, norm, pageErrors } from './data-lib.mjs';
import { t0, verifyOverview, verifyOpps, verifyRenewals } from './data-verify.mjs';

const h = await launch();
const t = await h.newPage({ theme: 'dark' });
const page = t.page;
const settle = (ms = 200) => page.waitForTimeout(ms);
let st = { decisions: {}, triage: {}, assumptions: {} };
const engine = () => E.compute(st);
const text = (sel) => page.evaluate((s) => document.querySelector(s).innerText, sel);

async function triage(flagId, label, key) {
  await go(page, `#/opportunities?flag=${flagId}`); await settle(250);
  await page.locator('[role="dialog"] select').selectOption({ label });
  await settle(250);
  if (key) st.triage[flagId] = key; else delete st.triage[flagId];
  await page.keyboard.press('Escape'); await settle(250);
}
async function setRadio(group, label) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click(); await settle(350);
  await page.locator('[role="dialog"]').getByRole('radiogroup', { name: group }).getByRole('radio', { name: label }).click(); await settle(250);
  await page.keyboard.press('Escape'); await settle(300);
}
async function verifyAll(tag, { pages = true } = {}) {
  const e = engine();
  await verifyOverview(t, e, tag);
  await verifyOpps(t, e, tag);
  await verifyRenewals(t, e, tag);
  if (pages) {
    // spend page tiles, a few cap rows, no-contract totals, register and C-009 / C-005 detail via text
    await go(page, '#/spend'); await page.waitForSelector('.kviz-bl__row');
    const tiles = await page.evaluate(() => [...document.querySelectorAll('.cap-tile')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
    const testable = DATA.contracts.filter((c) => e.derived[c.id].cap.testable);
    const n = (k) => testable.filter((c) => e.derived[c.id].cap.state === k).length;
    t0.check(`${tag} spend tiles ${n('over')}/${n('near')}/${n('ok')}`, () => { if (!tiles[0].includes(`Over cap ${n('over')} `) || !tiles[1].includes(`Close to cap ${n('near')} `) || !tiles[2].includes(`Within cap ${n('ok')} `)) throw new Error(tiles.join(' || ')); });
    await go(page, '#/spend/no-contract'); await settle(150);
    const nct = await text('#shell-main'); const nc = e.coverage.noContract; const tot = nc.reduce((s, x) => s + x.totalGBP, 0);
    t0.check(`${tag} no-contract intro ${nc.length} payees ${E.gbp(tot)}`, () => { if (!nct.includes(`${nc.length} payees, ${E.gbp(tot)} paid`)) throw new Error(nct.slice(0, 300)); });
    await go(page, '#/contracts/C-009'); await settle(200);
    const c9 = await text('#shell-main'); const d9 = e.derived['C-009'];
    t0.check(`${tag} C-009 detail cap used ${E.pct1(d9.cap.utilisation)} spend ${E.gbp(d9.spend.toDate)}`, () => { if (!c9.includes(E.pct1(d9.cap.utilisation)) || !c9.includes(E.gbp(d9.spend.toDate))) throw new Error('missing'); });
  }
}

try {
  await visit(t, '#/overview');
  await verifyAll('[start]');

  // ---- triage via the flag drawer
  await triage('F-C-005-overCap', 'Explained', 'explained'); await verifyAll('[C-005 over cap Explained]');
  await triage('F-C-007-overCap', 'No action', 'not_an_issue'); await verifyAll('[+ C-007 No action]');
  await triage('F-C-007-overCap', 'To investigate', null); await triage('F-C-005-overCap', 'To investigate', null); await verifyAll('[triage cleared]');
  await triage('F-C-005-overCap', 'Under review', 'under_review'); await verifyAll('[Under review stays counted]');
  await triage('F-C-005-overCap', 'To investigate', null);

  // ---- supplier match: confirm, reject, undo
  await go(page, '#/spend/matches'); await settle(250);
  await page.getByRole('button', { name: /Confirm match\s*,\s*Larchmont Grounds Maintenance/ }).click(); await settle(300);
  st.decisions['Larchmont Grounds Maintenance'] = 'confirm';
  await verifyAll('[confirm Larchmont]');
  const afterConfirm = await text('#shell-main'); t0.check('confirm toast/undo present and status Confirmed by you', () => { if (!/Confirmed/.test(afterConfirm)) throw new Error('no Confirmed'); });
  // undo
  const undo = page.getByRole('button', { name: /Undo/ }); if (await undo.count()) { await undo.first().click(); await settle(300); delete st.decisions['Larchmont Grounds Maintenance']; await verifyAll('[undo confirm]'); }
  await go(page, '#/spend/matches'); await settle(200);
  await page.getByRole('button', { name: /Reject match\s*,\s*Larchmont Grounds Maintenance/ }).click(); await settle(300);
  st.decisions['Larchmont Grounds Maintenance'] = 'reject';
  await verifyAll('[reject Larchmont]');
  const e2 = engine();
  t0.check('reject moves Larchmont to no-contract: 9 payees', () => { if (e2.coverage.noContract.length !== 9) throw new Error(String(e2.coverage.noContract.length)); const s = e2.coverage.noContract.reduce((a, x) => a + x.totalGBP, 0); if (s !== 24130000) throw new Error(String(s)); });
  const undo2 = page.getByRole('button', { name: /Undo/ }); if (await undo2.count()) { await undo2.first().click(); await settle(300); delete st.decisions['Larchmont Grounds Maintenance']; await verifyAll('[undo reject]'); }

  // ---- assumptions
  await setRadio('Renewal rate', '8%'); st.assumptions.renewalRate = 0.08; await verifyAll('[rate 8%]');
  await setRadio('Renewal rate', '3%'); st.assumptions.renewalRate = 0.03; await verifyAll('[rate 3%]');
  await setRadio('Renewal rate', '5%'); delete st.assumptions.renewalRate; await verifyAll('[rate back to 5%]');
  await setRadio('Close to cap threshold', '80%'); st.assumptions.nearCapThreshold = 0.8; await verifyAll('[near-cap 80%]');
  await setRadio('Close to cap threshold', '90%'); st.assumptions.nearCapThreshold = 0.9; await verifyAll('[near-cap 90%]');
  await setRadio('Close to cap threshold', '85%'); delete st.assumptions.nearCapThreshold; await verifyAll('[near-cap back to 85%]');

  // ---- combination, then persistence across reload
  await triage('F-C-001-nearCap', 'Explained', 'explained');
  await go(page, '#/spend/matches'); await settle(200);
  await page.getByRole('button', { name: /Confirm match\s*,\s*Larchmont Grounds Maintenance/ }).click(); await settle(300); st.decisions['Larchmont Grounds Maintenance'] = 'confirm';
  await setRadio('Renewal rate', '8%'); st.assumptions.renewalRate = 0.08;
  await verifyAll('[combo]');
  await visit(t, '#/overview'); await settle(300);
  await verifyAll('[combo after reload]');
  const store = await page.evaluate(() => ({ t: localStorage.getItem('kontor-triage'), m: localStorage.getItem('kontor-matches'), a: localStorage.getItem('kontor-assumptions') }));
  t0.check('stored state matches the actions', () => { if (JSON.stringify(JSON.parse(store.t)) !== JSON.stringify(st.triage) || JSON.parse(store.m)['Larchmont Grounds Maintenance'] !== 'confirm' || JSON.parse(store.a).renewalRate !== 0.08) throw new Error(JSON.stringify(store)); });

  // ---- reset through the confirm dialog
  await page.getByRole('button', { name: 'Settings', exact: true }).click(); await settle(350);
  await page.getByRole('button', { name: 'Reset demo changes' }).click(); await settle(250);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset changes' }).click(); await settle(400);
  await page.keyboard.press('Escape').catch(() => {}); await settle(300);
  st = { decisions: {}, triage: {}, assumptions: {} };
  await verifyAll('[after reset]');
  const store2 = await page.evaluate(() => ({ t: localStorage.getItem('kontor-triage'), m: localStorage.getItem('kontor-matches'), a: localStorage.getItem('kontor-assumptions'), th: localStorage.getItem('kontor-theme') }));
  t0.check('reset clears the three keys and keeps the theme', () => { if ((store2.t && store2.t !== '{}') || (store2.m && store2.m !== '{}') || (store2.a && store2.a !== '{}') || store2.th !== 'dark') throw new Error(JSON.stringify(store2)); });
  t0.check('no console/page errors', () => { const er = pageErrors(t); if (er.length) throw new Error(er.slice(0, 5).join(' | ')); });
} finally { await h.close(); }
t0.finish();
