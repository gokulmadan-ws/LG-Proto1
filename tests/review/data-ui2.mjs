// Data review part 2: Cap vs spend (24 rows, 24 payments drawers), Supplier matches (39 rows), No contract on the register,
// Contracts register (24 rows) and Contract detail (24 pages, every payment) against the independent engine.
//   node tests/review/data-ui2.mjs
import { T, E, DATA, launch, visit, go, seed, money, moneys, norm, contractById, D, DL, eqMoney, pageErrors } from './data-lib.mjs';

const t0 = new T('data-ui2');
const gbp = E.gbp;
const gbp2 = (x) => '£' + x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATE_LABEL = (c, st) => { const est = c.cap.source === 'contract_value'; return st === 'over' ? (est ? 'Above contract value (estimate)' : 'Over cap') : st === 'near' ? (est ? 'Close to contract value (estimate)' : 'Close to cap') : 'Within cap'; };
const dataPaymentsOf = (e, id) => e.attributed.filter((a) => a.contractId === id);

/** Read every row of every `.kx-table-wrap` table inside `root`, clicking through each pager. */
async function readPaged(page, root) {
  const nTables = await page.locator(`${root} .kx-table-wrap`).count();
  const out = [];
  for (let i = 0; i < nTables; i++) {
    const read = () => page.evaluate(([root, i]) => {
      const wrap = document.querySelectorAll(`${root} .kx-table-wrap`)[i]; const pager = wrap.nextElementSibling && /pager/.test(wrap.nextElementSibling.className) ? wrap.nextElementSibling : null;
      const cap = wrap.querySelector('caption'); const tf = wrap.querySelector('tfoot'); const sum = pager && pager.querySelector('.kx-pager__sum');
      const next = pager && pager.querySelector('button[aria-label="Next page"]');
      return { caption: cap ? cap.textContent.replace(/\s+/g, ' ').trim() : '', rows: [...wrap.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.textContent.replace(/\s+/g, ' ').trim())), tfoot: tf ? tf.textContent.replace(/\s+/g, ' ').trim() : '', pagerSum: sum ? sum.textContent.replace(/\s+/g, ' ').trim() : null, hasPager: !!pager, hasNext: !!next && !next.disabled };
    }, [root, i]);
    let cur = await read();
    const sib = () => page.locator(`${root} .kx-table-wrap`).nth(i).locator('xpath=following-sibling::*[1]');
    if (cur.hasPager) { const first = sib().locator('button[aria-label="Page 1"]'); if (await first.count()) { await first.click(); await page.waitForTimeout(30); cur = await read(); } }
    const rows = [...cur.rows];
    for (let guard = 0; guard < 80 && cur.hasNext; guard++) { await sib().locator('button[aria-label="Next page"]').click(); await page.waitForTimeout(25); cur = await read(); rows.push(...cur.rows); }
    out.push({ caption: cur.caption, rows, tfoot: cur.tfoot, pagerSum: cur.pagerSum });
  }
  return out;
}

async function verifySpend(t, e, tag) {
  await go(t.page, '#/spend');
  await t.page.waitForSelector('.kviz-bl__row');
  if (await t.page.locator('.cap-more').count()) { await t.page.click('.cap-more'); await t.page.waitForTimeout(120); }
  const s = await t.page.evaluate(() => {
    const tx = (x) => (x ? x.textContent.replace(/\s+/g, ' ').trim() : null);
    const tiles = [...document.querySelectorAll('.cap-tile')].map((x) => x.innerText.replace(/\s+/g, ' ').trim());
    const rows = [...document.querySelectorAll('.kviz-bl__row')].map((r) => ({ href: r.querySelector('.kviz-bl__name').getAttribute('href'), name: tx(r.querySelector('.kviz-bl__name')), supplier: tx(r.querySelector('.kviz-bl__sub')), meta: tx(r.querySelector('.kviz-bl__meta')), spend: tx(r.querySelector('.kviz-bl__spend')), of: tx(r.querySelector('.kviz-bl__of')), over: tx(r.querySelector('.kviz-bl__over-by')), status: tx(r.querySelector('.kviz-pill')), pct: tx(r.querySelector('.kviz-bl__pct')), clause: tx(r.querySelector('.clause-link')), text: r.innerText.replace(/\s+/g, ' ') }));
    return { tiles, rows, text: document.querySelector('#shell-main').innerText };
  });
  const testable = DATA.contracts.filter((c) => e.derived[c.id].cap.testable);
  const order = testable.map((c) => c.id).sort((a, b) => e.derived[b].cap.utilisation - e.derived[a].cap.utilisation || a.localeCompare(b));
  t0.eq(`${tag} spend row count`, s.rows.length, testable.length);
  const states = testable.map((c) => e.derived[c.id].cap.state);
  const n = (k) => states.filter((x) => x === k).length;
  t0.check(`${tag} spend tiles`, () => {
    const [over, close, within, total] = s.tiles; const bad = [];
    if (!new RegExp(`Over cap\\s*${n('over')}(?!\\d)`).test(over)) bad.push('over ' + over);
    if (!new RegExp(`Close to cap\\s*${n('near')}(?!\\d)`).test(close)) bad.push('close ' + close);
    if (!new RegExp(`Within cap\\s*${n('ok')}(?!\\d)`).test(within)) bad.push('within ' + within);
    const overSum = testable.filter((c) => e.derived[c.id].cap.state === 'over').reduce((x, c) => x + Math.round(e.derived[c.id].cap.excessGBP), 0);
    if (money(total) !== overSum) bad.push(`total over ${total} vs ${overSum}`);
    if (!total.includes(`across ${n('over')} contract`)) bad.push('across n ' + total);
    if (bad.length) throw new Error(bad.join('; '));
  });
  const ids = s.rows.map((r) => r.href.split('/').pop());
  t0.check(`${tag} spend order is utilisation descending`, () => { for (let i = 1; i < ids.length; i++) if (e.derived[ids[i - 1]].cap.utilisation < e.derived[ids[i]].cap.utilisation - 1e-12) throw new Error(`row ${i} ${ids[i - 1]} before ${ids[i]}`); });
  t0.eq(`${tag} spend rows are the testable contracts`, [...ids].sort(), testable.map((c) => c.id).sort());
  for (const r of s.rows) {
    const id = r.href.split('/').pop(); const c = contractById[id]; const d = e.derived[id]; const cap = d.cap;
    t0.check(`${tag} spend row ${id}`, () => {
      const bad = []; const annual = cap.basis === 'annual'; const est = c.cap.source === 'contract_value';
      if (r.name !== c.title) bad.push('name'); if (r.supplier !== c.supplierName) bad.push('supplier');
      const metaExp = `${annual ? 'Per contract year' : 'Whole term'} · ${est ? 'Contract value (no maximum stated)' : 'Stated maximum'}`;
      if (r.meta !== metaExp) bad.push(`meta ${r.meta} vs ${metaExp}`);
      if (money(r.spend) !== Math.round(cap.spendAgainstCap) && !eqMoney(money(r.spend), cap.spendAgainstCap)) bad.push(`spend ${r.spend} vs ${cap.spendAgainstCap}`);
      const partial = d.spend.coverage === 'partial'; if (partial !== /^At least/.test(r.spend)) bad.push(`at-least ${r.spend} partial=${partial}`);
      if (money(r.of) !== cap.capGBP) bad.push(`of ${r.of} vs ${cap.capGBP}`);
      if (!r.of.includes(annual ? 'annual cap' : est ? 'contract value' : 'cap')) bad.push(`of label ${r.of}`);
      const pct = (cap.utilisation * 100).toFixed(1) + '%'; if (!r.pct.startsWith(pct)) bad.push(`pct ${r.pct} vs ${pct}`);
      if (r.status !== STATE_LABEL(c, cap.state)) bad.push(`status ${r.status} vs ${STATE_LABEL(c, cap.state)}`);
      if (cap.excessGBP > 0) { if (!r.over || money(r.over) !== Math.round(cap.excessGBP)) bad.push(`over-by ${r.over} vs ${cap.excessGBP}`); } else if (r.over) bad.push('unexpected over-by ' + r.over);
      if (cap.state !== 'ok') { const key = c.cap.source === 'maximum_stated' ? 'maximumValue' : 'awardedTotalValue'; const x = DATA.extractions.find((z) => z.id === `X-${id}-${key}`); if (!r.clause || !r.clause.startsWith(`View clause, page ${x.provenance[0].page}`)) bad.push(`clause ${r.clause} vs page ${x.provenance[0].page}`); }
      if (partial && !r.text.includes('Spend files start on 1 April 2022')) bad.push('partial note missing');
      if (bad.length) throw new Error(bad.join('; '));
    });
  }
  return s;
}

async function verifyPayments(t, e, tag, idsOnly = null) {
  await go(t.page, '#/spend');
  await t.page.waitForSelector('.kviz-bl__row');
  if (await t.page.locator('.cap-more').count()) { await t.page.click('.cap-more'); await t.page.waitForTimeout(100); }
  const ids = await t.page.$$eval('.cap-pay', (b) => b.map((x) => x.getAttribute('data-pay-for')));
  for (const id of ids) {
    if (idsOnly && !idsOnly.includes(id)) continue;
    await t.page.locator(`.cap-pay[data-pay-for="${id}"]`).click();
    await t.page.waitForSelector('[role="dialog"]'); await t.page.waitForTimeout(220);
    const c = contractById[id]; const d = e.derived[id]; const mine = dataPaymentsOf(e, id);
    const inTerm = mine.filter((a) => a.period === 'in_term'); const after = mine.filter((a) => a.period === 'after_end');
    const head = await t.page.evaluate(() => document.querySelector('[role="dialog"]').innerText);
    let tables;
    if (d.cap.basis === 'annual') {
      // choose "All years" in the segmented control when present
      const all = t.page.locator('[role="dialog"] [role="radio"]:has-text("All years"), [role="dialog"] button:has-text("All years")');
      if (await all.count()) { await all.first().click(); await t.page.waitForTimeout(150); }
    }
    tables = await readPaged(t.page, '[role="dialog"]');
    t0.check(`${tag} payments drawer ${id}`, () => {
      const bad = []; const rows = tables.flatMap((x) => x.rows.map((r) => ({ cap: x.caption, r })));
      const refs = (list) => list.map((a) => `${a.payment.id}|${gbp2(a.payment.amountGBP)}`).sort();
      const shown = (pred) => rows.filter((x) => pred(x.cap)).map((x) => `${x.r[1]}|${x.r[x.r.length - 1]}`).sort();
      if (d.cap.basis === 'annual') {
        if (JSON.stringify(shown(() => true)) !== JSON.stringify(refs(mine))) bad.push(`annual payments set differs (${shown(() => true).length} vs ${mine.length})`);
      } else {
        if (JSON.stringify(shown((c2) => /^Paid in the contract term/.test(c2))) !== JSON.stringify(refs(inTerm))) bad.push(`in-term set differs (${shown((c2) => /^Paid in the contract term/.test(c2)).length} vs ${inTerm.length})`);
        if (JSON.stringify(shown((c2) => /^Paid after the end date/.test(c2))) !== JSON.stringify(refs(after))) bad.push(`after-end set differs (${shown((c2) => /^Paid after the end date/.test(c2)).length} vs ${after.length})`);
        for (const tb of tables) {
          const sub = tb.tfoot.match(/£([\d,]+\.\d\d)/); const listed = tb.rows.reduce((s, r) => s + Number(r[r.length - 1].replace(/[£,]/g, '')), 0);
          if (!sub || !eqMoney(Number(sub[1].replace(/,/g, '')), E.DATA && Math.round(listed * 100) / 100)) bad.push(`subtotal ${tb.tfoot} vs listed ${listed}`);
        }
        const inSub = E.DATA && Math.round(inTerm.reduce((s, a) => s + a.payment.amountGBP, 0) * 100) / 100; const afSub = Math.round(after.reduce((s, a) => s + a.payment.amountGBP, 0) * 100) / 100;
        const t1 = tables.find((x) => /^Paid in the contract term/.test(x.caption)); const t2 = tables.find((x) => /^Paid after the end date/.test(x.caption));
        if (t1 && !t1.tfoot.includes(gbp2(inSub))) bad.push(`in-term subtotal ${t1.tfoot} vs ${gbp2(inSub)}`);
        if (after.length && (!t2 || !t2.tfoot.includes(gbp2(afSub)))) bad.push(`after-end subtotal ${t2 && t2.tfoot} vs ${gbp2(afSub)}`);
        if (!after.length && t2) bad.push('unexpected after-end table');
        if (!head.includes(gbp2(d.spend.toDate)) && !head.includes(gbp(d.spend.toDate))) bad.push(`total ${d.spend.toDate} absent`);
        if (after.length && !new RegExp(`Total paid to date[\\s\\S]*${gbp2(d.spend.toDate).replace(/[.]/g, '\\.')}`).test(head)) bad.push('total line to the penny');
        if (after.length && !head.includes(`${after.length} payments`)) bad.push('after-end count');
      }
      if (!head.includes(`${E.pct1(d.cap.utilisation)}`)) bad.push(`share ${E.pct1(d.cap.utilisation)} absent`);
      if (d.cap.excessGBP > 0 && !head.includes(gbp(Math.round(d.cap.excessGBP)))) bad.push('over-by absent');
      if (bad.length) throw new Error(bad.join('; '));
    });
    await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(260);
  }
}

async function verifyMatches(t, e, tag) {
  await go(t.page, '#/spend/matches');
  await t.page.waitForSelector('table tbody tr');
  const rows = await t.page.evaluate(() => [...document.querySelectorAll('#shell-main table tbody tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim())));
  const txt = await t.page.evaluate(() => document.querySelector('#shell-main').innerText);
  const list = [...e.matches.values()];
  t0.eq(`${tag} matches row count`, rows.length, list.length);
  const MET = { exact: 'Exact', normalised: 'Normalised', alias: 'Alias', fuzzy: 'Similar name', manual: 'Confirmed by you' };
  const STAT = { auto_accepted: 'Accepted', suggested: 'Suggested', unmatched: 'Unmatched', confirmed: 'Confirmed', rejected: 'Rejected' };
  for (const m of list) {
    const r = rows.find((x) => x[0].startsWith(m.rawName));
    t0.check(`${tag} match row ${m.rawName}`, () => {
      if (!r) throw new Error('missing');
      const bad = []; const flat = r.join(' | ');
      const sup = m.supplierId ? DATA.suppliers.find((s) => s.id === m.supplierId).legalName : null;
      const shownSup = m.status === 'unmatched' || m.status === 'rejected' ? null : sup;
      if (shownSup && !r[1].includes(shownSup)) bad.push(`supplier ${r[1]} vs ${shownSup}`);
      if (!shownSup && !/No match/.test(r[1])) bad.push(`expected no match, got ${r[1]}`);
      if (!r[2].includes(MET[m.method])) bad.push(`method ${r[2]} vs ${MET[m.method]}`);
      if (!r[3].startsWith(m.score.toFixed(2))) bad.push(`score ${r[3]} vs ${m.score.toFixed(2)}`);
      if (!r[4].includes(STAT[m.status])) bad.push(`status ${r[4]} vs ${STAT[m.status]}`);
      if (Number(r[5]) !== m.paymentCount) bad.push(`count ${r[5]} vs ${m.paymentCount}`);
      if (money(r[6]) !== Math.round(m.totalGBP)) bad.push(`total ${r[6]} vs ${m.totalGBP}`);
      if (bad.length) throw new Error(bad.join('; ') + ' :: ' + flat);
    });
  }
  const cnt = (s) => list.filter((m) => s.includes(m.status)).length;
  t0.check(`${tag} matches chip counts`, () => {
    const exp = [['All payees', list.length], ['Needs your review', cnt(['suggested'])], ['Accepted', cnt(['auto_accepted'])], ['Unmatched', cnt(['unmatched'])], ['Decided by you', cnt(['confirmed', 'rejected'])]];
    for (const [lab, n] of exp) { const mm = txt.match(new RegExp(lab + '\\n(\\d+)')); if (!mm || Number(mm[1]) !== n) throw new Error(`${lab} ${mm && mm[1]} vs ${n}`); }
    if (!txt.includes(`${list.length} distinct names`)) throw new Error('distinct names');
  });
  t0.check(`${tag} matches grand total equals all payments`, () => { const sum = list.reduce((s, m) => s + m.totalGBP, 0); if (Math.round(sum) !== Math.round(E.DATA.payments.reduce((s, p) => s + p.amountGBP, 0))) throw new Error('sum'); });
}

async function verifyNoContract(t, e, tag) {
  await go(t.page, '#/spend/no-contract');
  await t.page.waitForSelector('#shell-main table tbody tr, .kviz-cb__row, #shell-main li');
  const txt = await t.page.evaluate(() => document.querySelector('#shell-main').innerText);
  const nc = e.coverage.noContract; const tot = nc.reduce((s, x) => s + x.totalGBP, 0);
  t0.check(`${tag} no-contract intro numbers`, () => { if (!txt.includes(`${nc.length} payees, ${gbp(tot)} paid`)) throw new Error('intro: ' + txt.slice(0, 400)); });
  nc.forEach((x, i) => t0.check(`${tag} no-contract ${i + 1} ${x.name}`, () => {
    const re = new RegExp(`${i + 1}\\n${x.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n[^\\n]*\\n(£[\\d,]+)\\n([\\d.]+)%`); const m = txt.match(re);
    if (!m) throw new Error('row not found'); if (money(m[1]) !== Math.round(x.totalGBP)) throw new Error(`amount ${m[1]} vs ${x.totalGBP}`);
    const share = (x.totalGBP / tot * 100).toFixed(1); if (m[2] !== share) throw new Error(`share ${m[2]} vs ${share}`);
    const n = DATA.payments.filter((p) => p.supplierNameRaw === x.name).length; if (!txt.includes(`${n} payments with no contract match`) && n !== 1) throw new Error('payment count ' + n);
  }));
  t0.check(`${tag} no-contract coverage bar`, () => {
    const cv = e.coverage;
    const rowText = (lab) => (txt.match(new RegExp(lab + '\\n(£[\\d,]+)\\s*([\\d.]+)%')) || []);
    const a = rowText('Matched to a contract'); const b = rowText('No contract on the register'); const c2 = rowText('Awaiting your review');
    if (money(a[1]) !== cv.linkedGBP) throw new Error('matched ' + a[0]); if (money(b[1]) !== Math.round(tot)) throw new Error('nocontract ' + b[0]);
    const aw = cv.awaiting.reduce((s, x) => s + x.totalGBP, 0); if (aw > 0 && money(c2[1]) !== aw) throw new Error('awaiting ' + c2[0]);
  });
  const aw = e.coverage.awaiting.reduce((s, x) => s + x.totalGBP, 0);
  if (aw > 0) t0.check(`${tag} no-contract awaiting note`, () => { if (!txt.includes(`${gbp(aw)} is awaiting your review`)) throw new Error('note'); });
}

async function verifyRegister(t, e, tag) {
  await go(t.page, '#/contracts');
  await t.page.waitForSelector('table tbody tr');
  const rows = await t.page.evaluate(() => [...document.querySelectorAll('#shell-main table tbody tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim())));
  t0.eq(`${tag} register rows`, rows.length, DATA.contracts.length);
  const nflags = (id) => e.flags.filter((f) => f.contractId === id && f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review')).length;
  for (const c of DATA.contracts) {
    const r = rows.find((x) => x[0].startsWith(c.id));
    t0.check(`${tag} register ${c.id}`, () => {
      if (!r) throw new Error('missing'); const bad = []; const f = r.join(' | ');
      if (!f.includes(c.title)) bad.push('title'); if (!f.includes(c.supplierName)) bad.push('supplier'); if (!f.includes(D(c.startDate))) bad.push('start'); if (!f.includes(D(c.endDate))) bad.push('end');
      if (!f.includes(gbp(c.annualValueGBP))) bad.push('annual'); const ended = c.endDate < E.AS_OF; if (!f.includes(ended ? 'Ended' : 'Live')) bad.push('status');
      const last = Number(r[r.length - 1]); if (last !== nflags(c.id)) bad.push(`flags ${last} vs ${nflags(c.id)}`);
      if (bad.length) throw new Error(bad.join('; ') + ' :: ' + f);
    });
  }
}

const monthDay = (md) => { const [m, d] = md.split('-').map(Number); return { m, d }; };
async function verifyDetail(t, e, tag, only = null) {
  for (const c of DATA.contracts) {
    if (only && !only.includes(c.id)) continue;
    await go(t.page, `#/contracts/${c.id}`);
    await t.page.waitForSelector('.cd-figs__grid');
    await t.page.waitForTimeout(80);
    const d = e.derived[c.id]; const sp = d.spend; const mine = dataPaymentsOf(e, c.id);
    const pg = await t.page.evaluate(() => {
      const tx = (x) => (x ? x.textContent.replace(/\s+/g, ' ').trim() : null);
      const m = document.querySelector('#shell-main');
      return { text: m.innerText, h1: tx(m.querySelector('h1')), flags: [...m.querySelectorAll('.cd-flag')].map((f) => ({ text: f.innerText.replace(/\s+/g, ' ').trim(), gbp: tx(f.querySelector('.cd-flag__gbp')) })),
        fig: [...m.querySelectorAll('.cd-figs__grid > *')].map((f) => f.innerText.replace(/\s+/g, ' ').trim()),
        derived: Object.fromEntries([...m.querySelectorAll('.cd-d')].map((x) => [tx(x.querySelector('.cd-d__label')), x.innerText.replace(/\s+/g, ' ').trim()])),
        fields: [...m.querySelectorAll('.cd-field')].map((f) => ({ label: tx(f.querySelector('.cd-field__label')), answer: tx(f.querySelector('.cd-field__answer')), conf: tx(f.querySelector('.cd-field__conf')), clause: tx(f.querySelector('.cd-field__clause')), href: (f.querySelector('a') || {}).getAttribute && f.querySelector('a') ? f.querySelector('a').getAttribute('href') : null })) };
    });
    t0.check(`${tag} detail ${c.id} header, figures, derived`, () => {
      const bad = []; const T = pg.text;
      if (pg.h1 !== c.title) bad.push('h1 ' + pg.h1);
      if (!T.includes(`${c.supplierName} · ${c.serviceCategory} · ${c.procurementRoute}`)) bad.push('subtitle');
      const ended = c.endDate < E.AS_OF; if (!new RegExp(`Status:\\s*${ended ? 'Ended' : 'Live'}`).test(T)) bad.push('status');
      const fig = pg.fig.join(' | ');
      if (!fig.includes(gbp(c.annualValueGBP))) bad.push('annual value'); if (!fig.includes(gbp(c.cap.amountGBP))) bad.push('cap');
      const spendShown = d.cap.basis === 'annual' ? null : sp.toDate;
      if (spendShown !== null && !fig.includes(gbp(spendShown))) bad.push(`spend ${spendShown} not in ${fig}`);
      if (sp.coverage !== 'partial') { if (!fig.includes(`${sp.paymentCount} payments`)) bad.push('payment count'); if (sp.latestPayment && !fig.includes(D(sp.latestPayment))) bad.push(`latest payment ${sp.latestPayment}`); }
      if (!fig.includes(E.pct1(d.cap.utilisation))) bad.push(`utilisation ${E.pct1(d.cap.utilisation)}`);
      if (!fig.includes(D(c.endDate))) bad.push('end date'); if (!fig.includes(`Started ${D(c.startDate)}`)) bad.push('started');
      if (!fig.includes(`${c.termYears} years`)) bad.push(`term ${c.termYears} years: ${fig}`);
      if ((sp.coverage === 'partial') !== /at least/i.test(fig)) bad.push('at least label');
      const dv = pg.derived;
      const nd = dv['Notice deadline'] || ''; if (!nd.includes(DL(d.deadline))) bad.push(`notice deadline ${DL(d.deadline)} in ${nd}`);
      const days = E.diffDays(d.deadline, E.AS_OF); const rel = days > 0 ? `${days} days left` : days === 0 ? 'Due today' : `${-days} days ago`; if (!nd.includes(rel)) bad.push(`relative ${rel} in ${nd}`);
      if (d.usedEndDate && !nd.includes('No notice period stated')) bad.push('used-end-date note');
      const BAND = { passed: 'Notice date passed', ended: 'Ended, still paying', m3: 'Next 3 months', m6: '3 to 6 months', m12: '6 to 12 months', later: 'Later than 12 months' };
      if (!(dv['Radar band'] || '').includes(BAND[d.band])) bad.push(`band ${dv['Radar band']} vs ${BAND[d.band]}`);
      const latest = E.addMonths(c.endDate, c.extension.count * c.extension.lengthMonths); if (!(dv['Latest end date'] || '').includes(DL(latest))) bad.push(`latest end ${DL(latest)} in ${dv['Latest end date']}`);
      const nr = c.indexation.reviewMonthDay ? E.nextReviewDate(c.indexation.reviewMonthDay) : null;
      if (nr) { const dd = E.diffDays(nr, E.AS_OF); if (!(dv['Next price review'] || '').includes(DL(nr)) || !(dv['Next price review'] || '').includes(`${dd} days left`)) bad.push(`next review ${DL(nr)} / ${dd} in ${dv['Next price review']}`); } else if (!/None/.test(dv['Next price review'] || '')) bad.push('next review none');
      const cu = dv['Cap used'] || ''; if (!cu.includes(E.pct1(d.cap.utilisation))) bad.push('cap used pct'); if (!cu.includes(gbp(d.cap.spendAgainstCap)) || !cu.includes(gbp(d.cap.capGBP))) bad.push(`cap used amounts in ${cu}`);
      if (d.cap.excessGBP > 0 && !cu.includes(gbp(Math.round(d.cap.excessGBP)))) bad.push('cap used over-by');
      const up = d.uplift; const pc = dv['Price increase check'] || '';
      if (!up.testable) { if (!pc.includes('Cannot test') || !pc.includes(up.reason)) bad.push(`uplift reason ${up.reason} in ${pc}`); }
      else { const yoyTxt = up.yoy < 0 ? `Payments fell ${(-up.yoy * 100).toFixed(1)}%` : `${(up.yoy * 100).toFixed(1)}% against a cap of ${(up.capPct * 100).toFixed(1)}%`; if (!pc.includes(yoyTxt)) bad.push(`uplift ${yoyTxt} in ${pc}`); if (up.flagged && !/flagged|above|over/i.test(pc) && !pc.includes(gbp(Math.round(up.excessGBP)))) bad.push('flagged uplift not stated: ' + pc); }
      const myFlags = e.flags.filter((f) => f.contractId === c.id && f.indicativeGBP > 0);
      const watchHere = e.flags.filter((f) => f.contractId === c.id && f.indicativeGBP === 0).length;
      if (pg.flags.length !== myFlags.length + watchHere && pg.flags.length !== myFlags.filter((f) => f.status === 'to_investigate' || f.status === 'under_review').length + watchHere) bad.push(`flag count ${pg.flags.length} vs ${myFlags.length}+${watchHere} watch`);
      for (const f of myFlags) { const hit = pg.flags.find((x) => x.gbp && money(x.gbp) === f.indicativeGBP); if (!hit && (f.status === 'to_investigate' || f.status === 'under_review')) bad.push(`flag ${f.id} £${f.indicativeGBP} not listed`); }
      if (bad.length) throw new Error(bad.join('; '));
    });
    t0.check(`${tag} detail ${c.id} nine questions`, () => {
      const bad = []; const byLabel = (re) => pg.fields.find((x) => re.test(x.label));
      const F = (k) => DATA.extractions.find((x) => x.id === `X-${c.id}-${k}`);
      if (pg.fields.length !== 14) bad.push(`fields ${pg.fields.length}`);
      for (const x of pg.fields) { const m = x.conf && x.conf.match(/Confidence score\s*([\d.]+)/); if (!m) bad.push(`no score for ${x.label}`); }
      const cfd = (k) => F(k).confidence; const band = (v) => (v >= 0.9 ? 'High' : v >= 0.75 ? 'Medium' : 'Needs review');
      const keys = ['estimatedAnnualValue', 'awardedTotalValue', 'maximumValue', 'startDate', 'endDate', 'extensions', 'noticePeriod', 'autoRenewal', 'indexation', 'paymentTerms', 'rateCard', 'serviceCredits', 'terminationForConvenience', 'exitFees'];
      keys.forEach((k, i) => { const x = pg.fields[i]; if (!x) return; if (!x.conf.startsWith(band(cfd(k))) || !x.conf.includes(String(cfd(k).toFixed(2)))) bad.push(`${k} conf ${x.conf} vs ${band(cfd(k))} ${cfd(k)}`);
        const pgNo = F(k).provenance[0] && F(k).provenance[0].page; if (pgNo && x.clause && !x.clause.includes(`page ${pgNo}`)) bad.push(`${k} clause ${x.clause} vs page ${pgNo}`); const hrefId = k === 'maximumValue' && c.cap.source === 'contract_value' ? F('awardedTotalValue').id : F(k).id; if (x.href && !x.href.includes(hrefId)) bad.push(`${k} href ${x.href}`); });
      const a = (i) => (pg.fields[i] ? pg.fields[i].answer : '');
      if (!a(0).includes(gbp(c.annualValueGBP))) bad.push('annual answer ' + a(0)); if (!a(1).includes(gbp(c.totalValueGBP))) bad.push('total answer ' + a(1));
      if (c.cap.source === 'maximum_stated') { if (!a(2).includes(gbp(c.cap.amountGBP)) || !a(2).includes(c.cap.basis === 'annual' ? 'per contract year' : 'whole term')) bad.push('max answer ' + a(2)); }
      else if (!a(2).includes('No maximum stated') || !a(2).includes(gbp(c.totalValueGBP))) bad.push('no-max answer ' + a(2));
      if (!a(3).includes(DL(c.startDate))) bad.push('start answer ' + a(3)); if (!a(4).includes(DL(c.endDate))) bad.push('end answer ' + a(4));
      const ex = c.extension; const words = { 1: 'One', 2: 'Two', 3: 'Three' };
      if (ex.count === 0) { if (!/No extension/.test(a(5))) bad.push('ext none ' + a(5)); } else { if (!a(5).includes(`${words[ex.count]} extension`) || !a(5).includes(`${ex.lengthMonths} months`)) bad.push(`ext ${a(5)} vs ${ex.count}x${ex.lengthMonths}`); }
      if (c.notice) { const nn = c.notice.unit === 'months' ? `${c.notice.value} months'` : `${c.notice.value} days'`; if (!a(6).includes(nn)) bad.push(`notice ${a(6)} vs ${nn}`); } else if (!/Not found/.test(a(6))) bad.push('notice not found ' + a(6));
      if (c.autoRenewal.enabled) { if (!a(7).includes(`${c.autoRenewal.periodMonths} months`)) bad.push('auto ' + a(7)); } else if (!/Does not renew/.test(a(7))) bad.push('auto off ' + a(7));
      const ix = c.indexation;
      if (ix.indexName === 'None') { if (!/fixed/i.test(a(8))) bad.push('fixed ' + a(8)); } else { if (!a(8).includes(ix.indexName)) bad.push('index name ' + a(8)); if (ix.capPct == null ? !/No cap/i.test(a(8)) : !a(8).includes(`${(ix.capPct * 100).toFixed(1)}%`)) bad.push(`index cap ${a(8)} vs ${ix.capPct}`); }
      if (!a(9).includes(`${c.paymentTermsDays} days`)) bad.push('pay terms ' + a(9));
      for (const r of c.rateCard) if (!a(10).includes(r.item) || !a(10).includes(gbp2(r.rateGBP))) bad.push('rate ' + r.item + ' ' + a(10).slice(0, 80));
      if (c.serviceCredits.present) { if (c.serviceCredits.perFailurePct != null && !a(11).includes(`${c.serviceCredits.perFailurePct}%`)) bad.push('credits per ' + a(11)); if (c.serviceCredits.monthlyCapPct != null && !a(11).includes(`${c.serviceCredits.monthlyCapPct}%`)) bad.push('credits cap ' + a(11)); } else if (!/No service credits/.test(a(11))) bad.push('credits none ' + a(11));
      if (c.termination.forConvenience) { if (!a(12).includes(`${c.termination.noticeMonths} months'`) && !a(12).includes(`${c.termination.noticeMonths} month'`)) bad.push('termination ' + a(12)); } else if (!/Neither party/.test(a(12))) bad.push('no termination ' + a(12));
      if (c.termination.exitFeesSummary && c.termination.exitFeesSummary !== 'None') { if (!a(13).includes(c.termination.exitFeesSummary)) bad.push('exit ' + a(13)); } else if (!/No exit fees/.test(a(13))) bad.push('no exit ' + a(13));
      if (bad.length) throw new Error(bad.join('; '));
    });
    // spend by contract year table + payments table
    const tabs = await readPaged(t.page, '#shell-main');
    const yearTable = await t.page.evaluate(() => { const tb = [...document.querySelectorAll('#shell-main table')].find((x) => /contract year/i.test((x.querySelector('caption') || {}).textContent || '')); return tb ? [...tb.querySelectorAll('tbody tr, tfoot tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((x) => x.textContent.replace(/\s+/g, ' ').trim())) : null; });
    t0.check(`${tag} detail ${c.id} spend by contract year`, () => {
      const bad = []; if (!yearTable) throw new Error('no table');
      const yrs = sp.byYear; const body = yearTable.slice(0, yrs.length);
      if (yearTable.length !== yrs.length + 1) bad.push(`rows ${yearTable.length} vs ${yrs.length + 1}`);
      yrs.forEach((y, i) => { const r = (body[i] || []).join(' | '); const ends = y.to; const wholly = ends < DATA.council.spendDataFrom; const from = y.from < DATA.council.spendDataFrom && !wholly;
        if (!r.includes(D(y.from)) || !r.includes(D(y.to))) bad.push(`year ${y.year} dates ${r}`);
        if (wholly) { if (!/Not in the spend files/.test(r)) bad.push(`year ${y.year} should say not in files: ${r}`); }
        else { if (!r.includes(gbp2(y.spendGBP))) bad.push(`year ${y.year} spend ${gbp2(y.spendGBP)} in ${r}`); if (from && !/At least/.test(r)) bad.push(`year ${y.year} at least`); if (y.partial && !/Year to date/i.test(r)) bad.push(`year ${y.year} ytd label`); } });
      const tot = (yearTable[yearTable.length - 1] || []).join(' | '); if (!tot.includes(gbp2(sp.toDate))) bad.push(`total ${tot} vs ${gbp2(sp.toDate)}`);
      const sum = Math.round(yrs.reduce((s, y) => s + y.spendGBP, 0) * 100) / 100; if (!eqMoney(sum, sp.toDate)) bad.push(`years sum ${sum} vs toDate ${sp.toDate}`);
      if (bad.length) throw new Error(bad.join('; '));
    });
    const payTab = tabs.find((x) => /Sample payments/.test(x.caption));
    t0.check(`${tag} detail ${c.id} payments table is the payment set`, () => {
      const bad = []; if (!payTab) throw new Error('no payments table');
      const shown = payTab.rows.map((r) => `${r[1]}|${r[4]}`).sort(); const exp = mine.map((a) => `${a.payment.id}|${gbp2(a.payment.amountGBP)}`).sort();
      if (JSON.stringify(shown) !== JSON.stringify(exp)) bad.push(`set differs ${shown.length} vs ${exp.length}`);
      if (!payTab.tfoot.includes(gbp2(sp.toDate))) bad.push(`tfoot ${payTab.tfoot} vs ${gbp2(sp.toDate)}`); if (!new RegExp(`\\b${mine.length} payments`).test(payTab.tfoot)) bad.push('count in tfoot ' + payTab.tfoot);
      const listed = Math.round(payTab.rows.reduce((s, r) => s + Number(r[4].replace(/[£,]/g, '')), 0) * 100) / 100; if (!eqMoney(listed, sp.toDate)) bad.push(`listed sum ${listed}`);
      const srt = payTab.rows.map((r) => r[0]); if (bad.length) throw new Error(bad.join('; '));
    });
  }
}

async function main() {
  const h = await launch();
  const t = await h.newPage({ theme: 'dark' });
  try {
    const sc = process.env.SCEN || 'default';
    const scen = {
      default: {},
      confirm: { decisions: { 'Larchmont Grounds Maintenance': 'confirm' } },
      explain: { triage: { 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'not_an_issue' } },
      near80: { assumptions: { nearCapThreshold: 0.8 } },
      near90: { assumptions: { nearCapThreshold: 0.9 } },
    }[sc];
    const e = E.compute({ decisions: scen.decisions || {}, triage: scen.triage || {}, assumptions: scen.assumptions || {} });
    await seed(t, scen);
    const tag = `[${sc}]`;
    await verifySpend(t, e, tag);
    await verifyMatches(t, e, tag);
    await verifyNoContract(t, e, tag);
    await verifyRegister(t, e, tag);
    if (sc === 'default' || sc === 'confirm') { await verifyPayments(t, e, tag); await verifyDetail(t, e, tag); }
    else await verifyDetail(t, e, tag, ['C-009', 'C-005', 'C-004', 'C-017']);
    t0.check('no console/page errors', () => { const er = pageErrors(t); if (er.length) throw new Error(er.slice(0, 5).join(' | ')); });
  } finally { await h.close(); }
  t0.finish();
}
main().catch((e) => { console.error(e); process.exit(2); });
