// Verifier library (used by data-ui.mjs and data-drive.mjs): scrape the rendered DOM route by route and assert equality with an independent recomputation
// (tests/review/data-engine.mjs, written from requirements section 5, no import of src/lib/engine.js).
//   node tests/review/data-ui.mjs [--only overview,opps,drawers,renewals,spend,matches,nocontract,contracts,detail]
// Runs the default state first, then every scenario from requirements 6.6, each time re-reading every figure.
import { T, E, DATA, launch, visit, go, seed, scrapeOverview, scrapeOpps, scrapeDrawer, money, moneys, pctOf, norm, FLAG_LABEL, contractById, D, DL, eqMoney, pageErrors } from './data-lib.mjs';

export const t0 = new T(process.env.DATA_T || 'data-ui');
const BASIS = { per_year: 'Per year', one_off: 'Already paid', projected: 'Projected at the current pace' };
const CONF = { high: 'High confidence', medium: 'Medium confidence', low: 'Needs review' };
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const extractionFor = (f) => {
  const c = contractById[f.contractId];
  const key = f.type === 'renewal' ? 'noticePeriod' : f.type === 'uplift' ? 'indexation' : (c.cap.source === 'maximum_stated' ? 'maximumValue' : 'awardedTotalValue');
  return DATA.extractions.find((x) => x.id === `X-${f.contractId}-${key}`);
};

/** The numbers each ranked row's reason sentence must contain, from the independent engine. */
function reasonExpect(f, e) {
  const c = contractById[f.contractId]; const d = e.derived[f.contractId]; const sp = d.spend;
  if (f.type === 'overCap' && d.cap.basis === 'total_term') {
    const m = [d.cap.spendAgainstCap, d.cap.capGBP, Math.round(d.cap.excessGBP)]; if (sp.afterEndGBP > 0) m.push(sp.afterEndGBP);
    return { money: m, pct: [Number((d.cap.utilisation * 100).toFixed(1))] };
  }
  if (f.type === 'overCap') { const y = sp.byYear.find((y) => y.spendGBP > c.cap.amountGBP); return { money: [y.spendGBP, c.cap.amountGBP, Math.round(y.spendGBP - c.cap.amountGBP)], pct: [], year: y.year }; }
  if (f.type === 'nearCap') return { money: [E.DATA && Math.round(sp.toDate + sp.t12 * d.cap.yearsRemaining), Math.round(f.indicativeGBP)], pct: [Number((d.cap.utilisation * 100).toFixed(1))] };
  if (f.type === 'uplift') return { money: [Math.round(d.uplift.excessGBP)], pct: [Number((d.uplift.yoy * 100).toFixed(1)), Number((d.uplift.capPct * 100).toFixed(1))] };
  return { money: [], pct: [] };
}

function expectedSteps(f, e) {
  const c = contractById[f.contractId]; const b = f.breakdown;
  if (f.type === 'renewal') return [{ k: 'money', v: b[0] }, { k: 'pct', v: Number((b[1] * 100).toFixed(1)) }, { k: 'money', v: b[2] }];
  if (f.type === 'overCap') return b.map((v) => ({ k: 'money', v }));
  if (f.type === 'nearCap') return [{ k: 'money', v: b[0] }, { k: 'money', v: b[1] }, { k: 'num', v: b[2] }, { k: 'money', v: b[3] }, { k: 'money', v: b[4] }, { k: 'money', v: b[5] }];
  if (f.type === 'uplift') return [{ k: 'money', v: b[0] }, { k: 'pct', v: Number((b[1] * 100).toFixed(1)) }, { k: 'money', v: b[2] }, { k: 'money', v: b[3] }, { k: 'money', v: b[4] }];
  return [];
}
function parseStep(txt) {
  const mm = [...txt.matchAll(/£\s?([\d,]+(?:\.\d+)?)/g)];
  if (mm.length) return { k: 'money', v: Number(mm[mm.length - 1][1].replace(/,/g, '')) };
  const pm = txt.match(/(-?\d+(?:\.\d+)?)%/); if (pm) return { k: 'pct', v: Number(pm[1]) };
  const nm = [...txt.matchAll(/(\d+(?:\.\d+)?)\s*$/g)]; return { k: 'num', v: nm.length ? Number(nm[0][1]) : NaN };
}

export async function verifyOverview(t, e, tag) {
  const o = await scrapeOverview(t.page);
  const tot = e.totals;
  t0.eq(`${tag} overview h1`, o.h1, `${E.compact(tot.totalGBP)} across ${plural(tot.contractCount, 'contract', 'contracts')} flagged as ${tot.contractCount === 1 ? 'an opportunity' : 'opportunities'} to investigate`);
  t0.eq(`${tag} overview exact value`, o.exact, `Exact value ${E.gbp(tot.totalGBP)}`);
  const order = ['overCap', 'nearCap', 'renewal', 'uplift'];
  order.forEach((k, i) => {
    t0.eq(`${tag} card ${k} value`, o.cards[i] && o.cards[i].value, E.compact(tot.byType[k]));
    t0.eq(`${tag} card ${k} count`, o.cards[i] && o.cards[i].meta, plural(tot.countByType[k], 'contract', 'contracts'));
  });
  t0.eq(`${tag} sum line (zero terms are omitted by the build)`, o.sum, `${['overCap', 'nearCap', 'renewal', 'uplift'].filter((k) => tot.byType[k] > 0).map((k) => E.gbp(tot.byType[k])).join(' + ')} = ${E.gbp(tot.totalGBP)}`);
  t0.check(`${tag} stacked bar segments equal exact type totals`, () => {
    const got = o.segs.map((s) => s.grow).sort((a, b) => a - b); const want = order.map((k) => tot.byType[k]).filter((v) => v > 0).sort((a, b) => a - b);
    if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`segments ${got} vs ${want}`);
  });
  t0.check(`${tag} excluded note`, () => {
    const m = o.text.match(/£([\d,]+) excluded after your review/);
    if (tot.excludedGBP > 0) { if (!m || Number(m[1].replace(/,/g, '')) !== tot.excludedGBP) throw new Error(`note ${m && m[0]} vs ${tot.excludedGBP}`); } else if (m) throw new Error('unexpected excluded note ' + m[0]);
  });
  // radar strip + coverage in the text block
  const g = e.groups;
  t0.check(`${tag} radar summary text`, () => {
    for (const [lab, k] of [['Next 3 months', 'm3'], ['3 to 6 months', 'm6'], ['6 to 12 months', 'm12']]) {
      const re = new RegExp(lab + '\\n(£[\\d.,]+[mk]?) a year\\n(\\d+) contracts?');
      const m = o.text.match(re); if (!m) throw new Error('no ' + lab);
      if (m[1] !== E.compact(g[k].annualGBP) || Number(m[2]) !== g[k].count) throw new Error(`${lab} ${m[1]} ${m[2]} vs ${E.compact(g[k].annualGBP)} ${g[k].count}`);
    }
    const a = o.text.match(/Needs attention now\n(\d+)/); const attn = g.passed.count + g.ended.count;
    if (!a || Number(a[1]) !== attn) throw new Error(`attention ${a && a[1]} vs ${attn}`);
  });
  t0.check(`${tag} coverage text`, () => {
    const cv = e.coverage;
    const pct = o.text.match(/(\d+)%\nof payments are linked/); if (!pct || Number(pct[1]) !== Math.round(cv.linkedPct * 100)) throw new Error('pct ' + (pct && pct[1]));
    const m = o.text.match(/(£[\d.]+m) of (£[\d.]+m)/); if (!m || m[1] !== E.compact(cv.linkedGBP) || m[2] !== E.compact(cv.totalGBP)) throw new Error('of ' + (m && m[0]));
    const nc = o.text.match(/No contract on the register\n(£[\d.]+[mk]?)\n(\d+) suppliers?/); if (!nc || nc[1] !== E.compact(E.DATA && cv.noContract.reduce((s, x) => s + x.totalGBP, 0)) || Number(nc[2]) !== cv.noContract.length) throw new Error('nc ' + (nc && nc[0]));
    const aw = o.text.match(/Waiting for your match review\n(£[\d.]+[mk]?)\n(\d+) suppliers?/);
    const awSum = cv.awaiting.reduce((s, x) => s + x.totalGBP, 0);
    if (cv.awaiting.length) { if (!aw || aw[1] !== E.compact(awSum) || Number(aw[2]) !== cv.awaiting.length) throw new Error('aw ' + (aw && aw[0])); }
  });
}

export async function verifyOpps(t, e, tag) {
  const o = await scrapeOpps(t.page, '#/opportunities?status=all');
  t0.eq(`${tag} opps row count`, o.rows.length, e.ranked.length);
  e.ranked.forEach((f, i) => {
    const r = o.rows[i]; if (!r) { t0.check(`${tag} opps row ${i + 1} exists`, () => { throw new Error('missing'); }); return; }
    const c = contractById[f.contractId]; const n = `${tag} row ${i + 1} ${f.id}`;
    t0.check(n, () => {
      const bad = [];
      if (r.rank !== String(i + 1)) bad.push(`rank ${r.rank}`);
      const label = f.type === 'overCap' && contractById[f.contractId].cap.source === 'contract_value' ? 'Above contract value (estimate)' : FLAG_LABEL[f.type];
      if (r.type !== label) bad.push(`type ${r.type} vs ${label}`);
      if (r.title !== c.title) bad.push(`title ${r.title}`);
      if (r.supplier !== c.supplierName) bad.push(`supplier ${r.supplier}`);
      if (money(r.value) !== f.indicativeGBP) bad.push(`value ${r.value} vs ${f.indicativeGBP}`);
      if (r.basis !== BASIS[f.basis]) bad.push(`basis ${r.basis}`);
      if (!r.trail.startsWith(CONF[f.confidence])) bad.push(`conf ${r.trail} vs ${CONF[f.confidence]}`);
      const x = extractionFor(f); const pg = x.provenance[0].page;
      if (r.clauseText !== `View clause, page ${pg}`) bad.push(`clause ${r.clauseText} vs page ${pg}`);
      if (!r.clauseHref.startsWith(`#/source/${f.contractId}/${x.id}`)) bad.push(`href ${r.clauseHref}`);
      if (f.actionBy && f.type === 'renewal' && !r.trail.includes('Act by ' + D(f.actionBy))) bad.push(`act-by ${r.trail} vs ${D(f.actionBy)}`);
      if (f.actionBy && f.type === 'uplift' && !r.trail.includes('Next review ' + D(f.actionBy))) bad.push(`next-review ${r.trail} vs ${D(f.actionBy)}`);
      const rx = reasonExpect(f, e); const got = moneys(r.sub).map((m) => m.v);
      for (const m of rx.money) if (!got.includes(m)) bad.push(`reason lacks £${m} (has ${got})`);
      const pcts = [...r.sub.matchAll(/(-?\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
      for (const p of rx.pct) if (!pcts.includes(p)) bad.push(`reason lacks ${p}% (has ${pcts})`);
      if (f.type === 'overCap' && rx.year && !r.sub.includes(`contract year ${rx.year}`)) bad.push('reason year');
      if (bad.length) throw new Error(bad.join('; '));
    });
  });
  const counted = e.ranked.filter((f) => f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review'));
  // default (Open) view totals bar
  const open = await scrapeOpps(t.page, '#/opportunities');
  const m = open.text.match(/Showing (\d+) opportunit(?:y|ies), £([\d,]+) indicative/);
  t0.check(`${tag} opps totals bar (Open)`, () => { if (!m || Number(m[1]) !== counted.length || Number(m[2].replace(/,/g, '')) !== e.totals.totalGBP) throw new Error(`${m && m[0]} vs ${counted.length} / ${e.totals.totalGBP}`); });
  t0.check(`${tag} opps basis subtotal line`, () => {
    const b = open.text.match(/£([\d,]+) already paid(?: · £([\d,]+) projected at the current pace)?(?: · £([\d,]+) per year)?/);
    const paid = counted.filter((f) => f.basis === 'one_off').reduce((s, f) => s + f.indicativeGBP, 0);
    const proj = counted.filter((f) => f.basis === 'projected').reduce((s, f) => s + f.indicativeGBP, 0);
    const py = counted.filter((f) => f.basis === 'per_year').reduce((s, f) => s + f.indicativeGBP, 0);
    const line = (open.text.match(/Showing[^\n]*\n+([^\n]*)/) || [])[1] || '';
    const nums = [...line.matchAll(/£([\d,]+) (already paid|projected at the current pace|per year)/g)].map((x) => [x[2], Number(x[1].replace(/,/g, ''))]);
    const exp = [['already paid', paid], ['projected at the current pace', proj], ['per year', py]].filter(([, v]) => v > 0);
    if (JSON.stringify(nums) !== JSON.stringify(exp)) throw new Error(`${JSON.stringify(nums)} vs ${JSON.stringify(exp)} (${line})`);
  });
  // chip counts
  t0.check(`${tag} opps chip counts`, () => {
    const cnt = (type) => counted.filter((f) => f.type === type).length;
    const rows = [['All flags', counted.length], ['Spend over cap', cnt('overCap')], ['Close to cap', cnt('nearCap')], ['Renewals', cnt('renewal')], ['Price increases above cap', cnt('uplift')]];
    for (const [lab, n] of rows) { const mm = open.text.match(new RegExp(lab + '\\n(\\d+)')); if (!mm) throw new Error('no chip ' + lab); if (Number(mm[1]) !== n) throw new Error(`${lab} chip ${mm[1]} vs ${n}`); }
  });
  // watch list
  t0.check(`${tag} watch list`, () => {
    const w = e.watch; const sect = open.text.split('Watch list')[1] || '';
    const n = sect.match(/^\s*\n?(\d+)/); if (w.length && (!n || Number(n[1]) !== w.length)) throw new Error('watch count ' + (n && n[1]) + ' vs ' + w.length);
    for (const f of w) {
      const c = contractById[f.contractId]; const d = e.derived[f.contractId];
      if (!sect.includes(c.title)) throw new Error('watch lacks ' + c.title);
      const pc = (d.cap.utilisation * 100).toFixed(1) + '%';
      if (!sect.includes(pc)) throw new Error(`watch lacks ${pc} for ${c.id}`);
    }
  });
}

export async function verifyDrawers(t, e, tag) {
  for (const f of [...e.ranked, ...e.watch]) {
    const d = await scrapeDrawer(t.page, f.id);
    t0.check(`${tag} drawer ${f.id}`, () => {
      const bad = [];
      const steps = d.lis.filter((l) => /^\d+ /.test(l)); const exp = expectedSteps(f, e);
      if (steps.length !== exp.length) bad.push(`steps ${steps.length} vs ${exp.length}: ${steps.join(' | ')}`);
      else exp.forEach((x, i) => { const p = parseStep(steps[i].replace(/^\d+ /, '')); if (x.k === 'num') { if (Math.abs(p.v - x.v) > 0.0051) bad.push(`step ${i + 1} ${steps[i]} vs ${x.v}`); } else if (p.v !== x.v) bad.push(`step ${i + 1} "${steps[i]}" vs ${x.v}`); });
      const lastStep = steps[steps.length - 1]; if (f.indicativeGBP > 0 && money(lastStep) !== f.indicativeGBP) bad.push(`last step ${lastStep} vs row ${f.indicativeGBP}`);
      const hv = d.text.match(/INDICATIVE VALUE\s*\n\s*(£[\d,]+)/i); if (f.indicativeGBP > 0 && (!hv || money(hv[1]) !== f.indicativeGBP)) bad.push(`drawer headline ${hv && hv[1]} vs ${f.indicativeGBP}`);
      const x = extractionFor(f); const pg = x.provenance[0].page;
      const doc = DATA.documents[contractById[f.contractId].documentId];
      if (!d.text.includes(`Page ${pg} of ${doc.pageCount}`)) bad.push(`page ${pg} of ${doc.pageCount} missing`);
      if (!d.text.includes(x.provenance[0].clauseRef)) bad.push(`clauseRef ${x.provenance[0].clauseRef} missing`);
      if (!norm(d.text).includes(norm(x.provenance[0].quote))) bad.push('quote not in drawer');
      if (bad.length) throw new Error(bad.join('; '));
    });
  }
}

export async function verifyRenewals(t, e, tag) {
  await go(t.page, '#/renewals');
  await t.page.waitForSelector('.kviz-rl__row, .rn-attn__row');
  const r = await t.page.evaluate(() => {
    const tx = (x) => (x ? x.textContent.replace(/\s+/g, ' ').trim() : null);
    const attn = [...document.querySelectorAll('.rn-attn__row')].map((row) => ({ href: row.querySelector('.rn-attn__title').getAttribute('href'), title: tx(row.querySelector('.rn-attn__title')), value: tx(row.querySelector('.rn-attn__value strong')), msg: tx(row.querySelector('.rn-attn__msg')), facts: Object.fromEntries([...row.querySelectorAll('.rn-fact')].map((f) => [tx(f.querySelector('dt')), tx(f.querySelector('dd'))])), clause: tx(row.querySelector('.clause-link')) }));
    const groups = [...document.querySelectorAll('.kviz-rl__group')].map((g) => ({ title: tx(g.querySelector('.kviz-rl__gtitle')), span: tx(g.querySelector('.kviz-rl__span')), count: tx(g.querySelector('.kviz-rl__gcount')), sum: tx(g.querySelector('.kviz-rl__gsum')), rows: [...g.querySelectorAll('.kviz-rl__row')].map((row) => ({ title: tx(row.querySelector('.kviz-rl__name')), href: (row.querySelector('a[href^="#/contracts"]') || {}).href || null, text: row.innerText.replace(/\s+/g, ' ').trim(), date: tx(row.querySelector('.kviz-rl__date')), rel: tx(row.querySelector('.kviz-rl__rel')), val: tx(row.querySelector('.kviz-rl__num')), clause: tx(row.querySelector('.clause-link')) })) }));
    return { attn, groups, text: document.querySelector('#shell-main').innerText };
  });
  const g = e.groups;
  const attnExp = [...g.passed.items, ...g.ended.items]; // C-016, C-001 (deadline order) then C-007
  t0.eq(`${tag} renewals attention ids (C-001, C-016, C-007 per spec order)`, r.attn.map((a) => a.href.split('/').pop()), ['C-001', 'C-016', 'C-007']);
  for (const a of r.attn) {
    const id = a.href.split('/').pop(); const c = contractById[id]; const d = e.derived[id];
    t0.check(`${tag} attention ${id}`, () => {
      const bad = []; if (a.title !== c.title) bad.push('title');
      if (money(a.value) !== c.annualValueGBP) bad.push(`value ${a.value}`);
      if (d.band === 'ended') {
        if (!a.msg.includes(`£${d.spend.afterEndGBP.toLocaleString('en-GB')}`)) bad.push(`after-end ${a.msg} vs ${d.spend.afterEndGBP}`);
        if (a.facts['Paid since it ended'] !== E.gbp(d.spend.afterEndGBP)) bad.push('paid since ' + a.facts['Paid since it ended']);
        if (!a.facts['Ended'] || !a.facts['Ended'].startsWith(D(c.endDate))) bad.push('ended ' + a.facts['Ended']);
      } else {
        const days = E.diffDays(E.AS_OF, d.deadline); if (!a.msg.includes(`${days} days ago`)) bad.push(`msg ${a.msg} vs ${days} days ago`);
        if (!a.facts['Notice deadline'].startsWith(D(d.deadline))) bad.push('deadline ' + a.facts['Notice deadline']);
        if (!a.facts['Notice deadline'].includes(`${days} days ago`)) bad.push('rel ' + a.facts['Notice deadline']);
        if (a.facts['Contract ends'] !== D(c.endDate)) bad.push('ends ' + a.facts['Contract ends']);
      }
      const x = DATA.extractions.find((z) => z.id === `X-${id}-noticePeriod`); if (!a.clause.includes(`page ${x.provenance[0].page}`)) bad.push('clause page ' + a.clause);
      if (bad.length) throw new Error(bad.join('; '));
    });
  }
  const gm = { 'Next 3 months': 'm3', '3 to 6 months': 'm6', '6 to 12 months': 'm12' };
  for (const grp of r.groups) {
    const key = gm[grp.title]; if (!key) { t0.check(`${tag} renewals group title ${grp.title}`, () => { throw new Error('unexpected group'); }); continue; }
    t0.check(`${tag} renewals group ${key}`, () => {
      const bad = []; const G = g[key];
      if (Number(grp.count.match(/\d+/)[0]) !== G.count) bad.push(`count ${grp.count}`);
      if (money(grp.sum) !== G.annualGBP) bad.push(`sum ${grp.sum} vs ${G.annualGBP}`);
      if (grp.rows.length !== G.items.length) bad.push(`rows ${grp.rows.length} vs ${G.items.length}`);
      G.items.forEach((it, i) => {
        const row = grp.rows[i]; if (!row) return; const c = contractById[it.id];
        if (!row.href || !row.href.endsWith('/' + it.id)) bad.push(`row ${i} id ${row.href} vs ${it.id}`);
        if (row.date !== D(it.deadline)) bad.push(`${it.id} deadline ${row.date} vs ${D(it.deadline)}`);
        const days = E.diffDays(it.deadline, E.AS_OF); const relExp = days > 0 ? `${days} days left` : days === 0 ? 'Due today' : `${-days} days ago`;
        if (row.rel !== relExp) bad.push(`${it.id} rel ${row.rel} vs ${relExp}`);
        if (money(row.val) !== c.annualValueGBP) bad.push(`${it.id} val ${row.val}`);
        if (!row.text.includes('Contract ends ' + D(c.endDate))) bad.push(`${it.id} ends`);
        const nt = c.notice ? (c.notice.unit === 'months' ? `${c.notice.value} months` : `${c.notice.value} days`) : null;
        if (nt && !row.text.includes('Notice period: ' + nt)) bad.push(`${it.id} notice ${nt}`);
        if (!nt && !row.text.includes('No notice period stated')) bad.push(`${it.id} no-notice copy`);
        if ((c.autoRenewal.enabled) !== row.text.includes('Auto-renews')) bad.push(`${it.id} auto-renew badge`);
      });
      if (bad.length) throw new Error(bad.join('; '));
    });
  }
  t0.check(`${tag} renewals boundaries and footnote`, () => {
    const b = e.boundaries; const txt = r.text;
    for (const iso of [b.m3, b.m6, b.m12]) if (!txt.includes(D(iso))) throw new Error('boundary ' + iso);
    const f = txt.match(/(\d+) contracts have notice dates more than 12 months away/); if (!f || Number(f[1]) !== g.later.count) throw new Error('footnote ' + (f && f[0]) + ' vs ' + g.later.count);
  });
}

