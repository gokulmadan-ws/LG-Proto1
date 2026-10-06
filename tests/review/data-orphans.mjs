// Data review: "orphan number" scan. Every GBP figure rendered on a dynamic route (text, aria-label, aria-description, title)
// must be derivable from the dataset or from the independent engine. Also scans every route and state for 'undefined', 'NaN',
// '[object', 'Infinity', negative money, '£-', and double spaces before punctuation.
//   node tests/review/data-orphans.mjs [--state default|confirm|explain|rate8]
import { T, E, DATA, launch, visit, go, seed, money, norm, pageErrors } from './data-lib.mjs';

const t0 = new T('data-orphans');
const state = (() => { const i = process.argv.indexOf('--state'); return i === -1 ? 'default' : process.argv[i + 1]; })();
const STATES = {
  default: {},
  confirm: { decisions: { 'Larchmont Grounds Maintenance': 'confirm' } },
  explain: { triage: { 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'not_an_issue' } },
  rate8: { assumptions: { renewalRate: 0.08, nearCapThreshold: 0.9 } },
};
const st = STATES[state];
const e = E.compute({ decisions: st.decisions || {}, triage: st.triage || {}, assumptions: st.assumptions || {} });
const r2 = (x) => Math.round(x * 100) / 100;

/* ---- the set of numbers the UI is allowed to print ---- */
const K = new Set();
const add = (v) => { if (typeof v === 'number' && Number.isFinite(v)) { K.add(r2(v)); K.add(Math.round(v)); } };
const compactSet = new Set();
const addC = (v) => { if (typeof v === 'number' && Number.isFinite(v)) compactSet.add(E.compact(v)); };
for (const c of DATA.contracts) {
  [c.annualValueGBP, c.totalValueGBP, c.cap.amountGBP, c.cap.amountGBP * 0.8].forEach(add);
  c.rateCard.forEach((r) => add(r.rateGBP));
  const sp = e.derived[c.id].spend; const cap = e.derived[c.id].cap; const up = e.derived[c.id].uplift;
  [cap.capGBP - cap.spendAgainstCap, sp.toDate, sp.t12, sp.p12, sp.afterEndGBP, cap.spendAgainstCap, cap.capGBP, cap.excessGBP, cap.projectedExcessGBP, up.excessGBP, up.cappedBase, up.p12, up.t12].forEach(add);
  if (cap.testable) { add(sp.toDate + sp.t12 * cap.yearsRemaining); add(Math.round(sp.toDate + sp.t12 * cap.yearsRemaining)); }
  sp.byYear.forEach((y) => add(y.spendGBP));
  // in-term vs after-end subtotals and cumulative month ends
  const mine = e.attributed.filter((a) => a.contractId === c.id).map((a) => a.payment).sort((a, b) => a.date.localeCompare(b.date));
  add(mine.filter((p) => p.date <= c.endDate).reduce((s, p) => s + p.amountGBP, 0));
  let cum = 0; const byMonth = new Map(); mine.forEach((p) => { byMonth.set(p.date.slice(0, 7), (byMonth.get(p.date.slice(0, 7)) || 0) + p.amountGBP); });
  [...byMonth.keys()].sort().forEach((k) => { cum += byMonth.get(k); add(byMonth.get(k)); add(cum); });
  for (const x of c.rateCard) add(x.rateGBP);
  if (c.termination.exitFeesSummary) for (const m of c.termination.exitFeesSummary.matchAll(/£([\d.,]+)(m|k)?/g)) add(Number(m[1].replace(/,/g, '')) * (m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : 1));
}
DATA.payments.forEach((p) => add(p.amountGBP));
for (const f of [...e.flags]) { add(f.indicativeGBP); (f.breakdown || []).forEach((b) => add(typeof b === 'number' ? b : b.value)); }
const T_ = e.totals; [T_.totalGBP, T_.excludedGBP, ...Object.values(T_.byType)].forEach(add);
const cv = e.coverage; [cv.totalGBP, cv.linkedGBP, cv.noContract.reduce((s, x) => s + x.totalGBP, 0), cv.awaiting.reduce((s, x) => s + x.totalGBP, 0)].forEach(add);
cv.noContract.concat(cv.awaiting).forEach((x) => add(x.totalGBP));
for (const m of e.matches.values()) add(m.totalGBP);
for (const g of Object.values(e.groups)) { add(g.annualGBP); add(g.totalGBP); }
const over = e.ranked.filter((f) => f.type === 'overCap').reduce((s, f) => s + f.indicativeGBP, 0); add(over);
const countedFlags = e.ranked.filter((f) => f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review'));
for (const b of ['one_off', 'projected', 'per_year']) add(countedFlags.filter((f) => f.basis === b).reduce((s, f) => s + f.indicativeGBP, 0));
const reviewed = e.ranked.filter((f) => !countedFlags.includes(f)); add(reviewed.reduce((s, f) => s + f.indicativeGBP, 0));
// document text numbers and quotes
for (const d of Object.values(DATA.documents)) for (const pg of Object.values(d.pages)) for (const b of pg) for (const m of (b.text || '').matchAll(/£([\d,]+(?:\.\d+)?)(m|k)?/g)) add(Number(m[1].replace(/,/g, '')) * (m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : 1));
for (const x of DATA.extractions) for (const p of x.provenance || []) for (const m of p.quote.matchAll(/£([\d,]+(?:\.\d+)?)(m|k)?/g)) add(Number(m[1].replace(/,/g, '')) * (m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : 1));
// every value above also may appear compacted
[...K].forEach(addC);
// spec figures that legitimately appear in static copy (evidence, caveat, method rationale)
const STATIC = [1700000, 18900000, 5400000, 91000000, 134000000, 232000, 500, 10000, 100000, 5000000];
STATIC.forEach(add);

const TOKEN = /£\s?([\d,]+(?:\.\d+)?)((?:m|k|bn)\b)?/g;
function tokensIn(text) { return [...text.matchAll(TOKEN)].map((m) => ({ raw: m[0], v: Number(m[1].replace(/,/g, '')), unit: (m[2] || '').trim() })); }
const known = (tok) => {
  if (tok.unit === 'm' || tok.unit === 'k') { const v = tok.v * (tok.unit === 'm' ? 1e6 : 1e3); return compactSet.has(E.compact(v)) || compactSet.has(`£${tok.v}${tok.unit}`) || K.has(Math.round(v)) || [...K].some((x) => E.compact(x) === `£${tok.v}${tok.unit}` || E.compact(x) === `£${tok.v.toFixed(1)}${tok.unit}`); }
  return K.has(r2(tok.v)) || K.has(Math.round(tok.v));
};

async function pageDump(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#shell-main').cloneNode(true); root.querySelectorAll('svg text, .kviz-bl__tickl, .kviz-rl__tick').forEach((x) => x.remove()); document.body.appendChild(root); root.style.cssText = 'position:absolute;left:-9999px;top:0;width:1200px'; const parts = [root.innerText]; root.remove();
    document.querySelectorAll('[role="dialog"]').forEach((d) => parts.push(d.innerText));
    document.querySelectorAll('#shell-main [aria-label], #shell-main [aria-description], #shell-main [title], #shell-main [data-tip], [role="dialog"] [aria-label]').forEach((el) => { for (const a of ['aria-label', 'aria-description', 'title', 'data-tip']) { const v = el.getAttribute(a); if (v) parts.push(v); } });
    return parts.join('\n');
  });
}
const BAD = [/undefined/i, /\bNaN\b/, /\[object/, /Infinity/, /£\s?-/, /-£/, /\bnull\b/, /\bTODO\b/i, /\$\{/, /\{\{/, /Invalid Date/i];
const seenOrphans = new Map();
async function scanRoute(page, hash, label = hash) {
  await go(page, hash); await page.waitForTimeout(200);
  const txt = await pageDump(page);
  for (const re of BAD) { const m = txt.match(re); if (m) t0.check(`${label} forbidden text ${re}`, () => { const i = txt.indexOf(m[0]); throw new Error('found "' + txt.slice(Math.max(0, i - 40), i + 40).replace(/\n/g, ' | ') + '"'); }); }
  const orphans = tokensIn(txt).filter((tk) => !known(tk));
  for (const o of orphans) { const k = o.raw; if (!seenOrphans.has(k)) seenOrphans.set(k, []); seenOrphans.get(k).push(label); }
  t0.check(`${label} money figures all derivable`, () => { if (orphans.length) throw new Error('orphan: ' + [...new Set(orphans.map((o) => o.raw))].slice(0, 8).join(', ')); });
  return txt;
}

async function main() {
  const h = await launch();
  const t = await h.newPage({ theme: 'dark' });
  try {
    await seed(t, st);
    const routes = ['#/overview', '#/opportunities?status=all', '#/renewals', '#/spend', '#/spend/matches', '#/spend/no-contract', '#/contracts', '#/method'];
    for (const r of routes) await scanRoute(t.page, r);
    await go(t.page, '#/spend'); if (await t.page.locator('.cap-more').count()) await t.page.click('.cap-more');
    for (const f of [...e.ranked, ...e.watch]) await scanRoute(t.page, `#/opportunities?flag=${f.id}`, `drawer ${f.id}`);
    for (const c of DATA.contracts) await scanRoute(t.page, `#/contracts/${c.id}`);
    // source pages: 336 extractions
    for (const x of DATA.extractions) await scanRoute(t.page, `#/source/${x.contractId}/${x.id}`, `source ${x.id}`);
    for (const r of ['#/roadmap', '#/evidence']) { await go(t.page, r); const txt = await pageDump(t.page); for (const re of BAD) if (re.test(txt)) t0.check(`${r} forbidden text ${re}`, () => { throw new Error('found'); }); }
    t0.check('no console/page errors', () => { const er = pageErrors(t); if (er.length) throw new Error(er.slice(0, 5).join(' | ')); });
  } finally { await h.close(); }
  if (seenOrphans.size) { console.log('\nOrphan tokens (token -> routes):'); for (const [k, v] of seenOrphans) console.log('  ', k, '->', [...new Set(v)].slice(0, 6).join(', ')); }
  t0.finish();
}
main().catch((err) => { console.error(err); process.exit(2); });
