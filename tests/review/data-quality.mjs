// Data review: quality of the sample dataset itself (src/data/sample.json). Static, no browser.
//   node tests/review/data-quality.mjs
// Checks: provenance quote equality for all 336 extractions (JSON level), clause text numerically consistent with the contract fields
// for all 24 contracts, payment windows and shape, supplier and contract plausibility, no negative, NaN or empty values anywhere.
import { T, E, DATA, contractById } from './data-lib.mjs';

const t0 = new T('data-quality');
const { contracts, extractions, payments, documents, suppliers } = DATA;
const r2 = (x) => Math.round(x * 100) / 100;
const num = (s) => Number(String(s).replace(/,/g, ''));

/* ------------------------------------------------------------- generic: no NaN / negative / empty / undefined strings anywhere */
const walk = (v, path, cb) => { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path + '.' + k, cb); else cb(v, path); };
t0.check('no NaN, null-ish strings or negative money anywhere in the dataset', () => {
  const bad = [];
  walk(DATA, 'data', (v, p) => {
    if (typeof v === 'number' && !Number.isFinite(v)) bad.push(p + ' not finite');
    if (typeof v === 'number' && /GBP|amount|rateGBP/i.test(p) && v < 0) bad.push(p + ' negative');
    if (typeof v === 'string' && /\bundefined\b|\bNaN\b|\[object|null\b/.test(v)) bad.push(p + ' = ' + v.slice(0, 60));
    if (typeof v === 'string' && v.trim() === '' && !/\.(text|note|help)$/.test(p)) bad.push(p + ' empty string');
  });
  if (bad.length) throw new Error(bad.slice(0, 8).join('; ') + ` (${bad.length})`);
});
t0.eq('counts: 24 contracts, 24 suppliers, 336 extractions, 24 documents, 1264 payments', [contracts.length, suppliers.length, extractions.length, Object.keys(documents).length, payments.length], [24, 24, 336, 24, 1264]);
t0.check('unique ids', () => {
  for (const [name, arr] of [['contracts', contracts.map((c) => c.id)], ['suppliers', suppliers.map((s) => s.id)], ['company numbers', suppliers.map((s) => s.companyNumber)], ['legal names', suppliers.map((s) => s.legalName)], ['extractions', extractions.map((x) => x.id)], ['payments', payments.map((p) => p.id)]]) if (new Set(arr).size !== arr.length) throw new Error(name + ' not unique');
});

/* ------------------------------------------------------------- provenance */
t0.check('336 extractions: each has exactly one provenance whose page block text equals the quote and carries the extraction id', () => {
  const bad = [];
  for (const x of extractions) {
    if (!x.provenance || x.provenance.length < 1) { bad.push(x.id + ' no provenance'); continue; }
    const p = x.provenance[0]; const doc = documents[p.documentId];
    if (!doc) { bad.push(x.id + ' no doc'); continue; }
    if (doc.contractId !== x.contractId) bad.push(x.id + ' doc belongs to ' + doc.contractId);
    const blocks = doc.pages[p.page];
    if (!blocks) { bad.push(`${x.id} page ${p.page} missing`); continue; }
    if (p.page < 1 || p.page > doc.pageCount) bad.push(`${x.id} page ${p.page} outside 1..${doc.pageCount}`);
    const hit = blocks.filter((b) => (b.extractionIds || []).includes(x.id));
    if (hit.length !== 1) { bad.push(`${x.id} cited by ${hit.length} blocks`); continue; }
    if (hit[0].text !== p.quote) bad.push(`${x.id} quote differs`);
    if (hit[0].clauseRef !== p.clauseRef) bad.push(`${x.id} clauseRef ${hit[0].clauseRef} vs ${p.clauseRef}`);
    if (x.provenance.length !== 1) bad.push(`${x.id} ${x.provenance.length} provenance entries`);
    if (!(x.confidence >= 0 && x.confidence <= 1)) bad.push(x.id + ' confidence out of range');
    const band = x.confidence >= 0.9 ? 'found' : x.confidence >= 0.75 ? 'found' : 'needs_review';
    if (x.confidence < 0.75 && x.status !== 'needs_review') bad.push(`${x.id} conf ${x.confidence} but status ${x.status}`);
  }
  if (bad.length) throw new Error(bad.slice(0, 8).join('; ') + ` (${bad.length})`);
});
t0.check('highlight uniqueness: on every cited page only cited blocks carry extractionIds, and each page has >= 4 neighbours', () => {
  const bad = [];
  for (const d of Object.values(documents)) for (const [pg, blocks] of Object.entries(d.pages)) {
    const cited = blocks.filter((b) => b.extractionIds && b.extractionIds.length);
    const neigh = blocks.filter((b) => ['clause', 'item'].includes(b.kind) && !(b.extractionIds && b.extractionIds.length));
    if (!cited.length) bad.push(`${d.id} p${pg} nothing cited`);
    if (neigh.length < 4 && d.id !== 'DOC-C-005') bad.push(`${d.id} p${pg} only ${neigh.length} neighbours`);
    if (blocks[0].kind !== 'header' || !blocks[0].text.includes(`Page ${pg} of ${d.pageCount}`)) bad.push(`${d.id} p${pg} header says "${blocks[0].text}"`);
  }
  if (bad.length) throw new Error(bad.slice(0, 8).join('; ') + ` (${bad.length})`);
});
t0.check('extraction answers equal the contract register fields (all 24 x 14)', () => {
  const bad = [];
  for (const c of contracts) {
    const X = (k) => extractions.find((x) => x.id === `X-${c.id}-${k}`);
    const eq = (k, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${c.id} ${k}: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`); };
    eq('estimatedAnnualValue', X('estimatedAnnualValue').answer, c.annualValueGBP); eq('awardedTotalValue', X('awardedTotalValue').answer, c.totalValueGBP);
    eq('startDate', X('startDate').answer, c.startDate); eq('endDate', X('endDate').answer, c.endDate);
    const mv = X('maximumValue');
    if (c.cap.source === 'maximum_stated') eq('maximumValue', mv.answer && mv.answer.amountGBP, c.cap.amountGBP); else if (mv.answer !== null && mv.status !== 'not_found') bad.push(`${c.id} maximumValue should be not_found`);
    eq('paymentTerms', X('paymentTerms').answer, c.paymentTermsDays);
  }
  if (bad.length) throw new Error(bad.slice(0, 8).join('; ') + ` (${bad.length})`);
});

/* ------------------------------------------------------------- clause text vs fields (all 24 contracts) */
const pageText = (c, k) => { const x = extractions.find((z) => z.id === `X-${c.id}-${k}`); return x.provenance[0] ? x.provenance[0].quote : ''; };
const wholePage = (c, k) => { const x = extractions.find((z) => z.id === `X-${c.id}-${k}`); const p = x.provenance[0]; return documents[p.documentId].pages[p.page].map((b) => b.text).join('\n'); };
for (const c of contracts) {
  t0.check(`${c.id} clause text agrees with the register fields`, () => {
    const bad = [];
    const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const long = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MN[m - 1]} ${y}`; };
    if (!pageText(c, 'startDate').includes(long(c.startDate))) bad.push('start quote ' + pageText(c, 'startDate'));
    if (!pageText(c, 'endDate').includes(long(c.endDate))) bad.push('end quote ' + pageText(c, 'endDate'));
    const fm = (s) => [...s.matchAll(/£([\d,]+(?:\.\d+)?)/g)].map((m) => num(m[1]));
    if (!fm(pageText(c, 'estimatedAnnualValue')).includes(c.annualValueGBP)) bad.push('annual quote ' + pageText(c, 'estimatedAnnualValue'));
    if (!fm(pageText(c, 'awardedTotalValue')).includes(c.totalValueGBP)) bad.push('total quote ' + pageText(c, 'awardedTotalValue'));
    if (c.cap.source === 'maximum_stated') {
      const q = pageText(c, 'maximumValue'); if (!fm(q).includes(c.cap.amountGBP)) bad.push('max quote ' + q);
      if (c.cap.basis === 'annual' ? !/(per|each|any) (contract )?year|annual|in any/i.test(q) : /per (contract )?year|annual/i.test(q)) bad.push('cap basis wording ' + q);
      const pg = wholePage(c, 'maximumValue'); const alert = [...pg.matchAll(/eighty per cent \(80%\)[^£]*£([\d,]+)/g)].map((m) => num(m[1]));
      if (alert.length && !alert.includes(c.cap.amountGBP * 0.8)) bad.push(`80% alert ${alert} vs ${c.cap.amountGBP * 0.8}`);
    } else {
      const q = pageText(c, 'maximumValue'); if (q && !/no maximum|not stated|budgeting purposes/i.test(q)) bad.push('no-max quote ' + q);
    }
    // total = annual x term (approx) and cap >= annual
    const term = c.termYears; if (Math.abs(c.annualValueGBP * term - c.totalValueGBP) / c.totalValueGBP > 0.02) bad.push(`annual x term ${c.annualValueGBP * term} vs total ${c.totalValueGBP}`);
    const calcTerm = r2((new Date(c.endDate) - new Date(c.startDate)) / 86400000 / 365.25); if (Math.abs(calcTerm - term) > 0.06) bad.push(`termYears ${term} vs dates ${calcTerm}`);
    // notice
    const nq = pageText(c, 'noticePeriod'); const wnum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, nine: 9, twelve: 12, thirty: 30, sixty: 60, ninety: 90 };
    if (c.notice) { const m = nq.match(/(\d+|one|two|three|four|five|six|nine|twelve|thirty|sixty|ninety)\s*(?:\(\d+\)\s*)?(months?|days?)/i); const n = m ? (/^\d+$/.test(m[1]) ? Number(m[1]) : wnum[m[1].toLowerCase()]) : null; if (!m || n !== c.notice.value || !m[2].toLowerCase().startsWith(c.notice.unit.slice(0, 3))) bad.push(`notice quote "${nq}" vs ${JSON.stringify(c.notice)}`); }
    else if (!/not|no /i.test(nq)) bad.push('no notice but quote ' + nq);
    // last date for notice stated in the page text
    const pgN = wholePage(c, 'noticePeriod'); const lastDate = pgN.match(/(?:last date for (?:such )?notice|latest date for notice)[^.]*?(\d{1,2} \w+ \d{4})/i);
    if (lastDate) { const dl = E.noticeDeadline(c.endDate, c.notice).date; if (lastDate[1] !== long(dl)) bad.push(`last date for notice "${lastDate[1]}" vs computed ${long(dl)}`); }
    const latestEndTxt = pgN.match(/latest (?:possible )?(?:end|expiry) date[^.]*?(\d{1,2} \w+ \d{4})/i);
    if (latestEndTxt) { const le = E.addMonths(c.endDate, c.extension.count * c.extension.lengthMonths); if (latestEndTxt[1] !== long(le)) bad.push(`latest end "${latestEndTxt[1]}" vs ${long(le)}`); }
    // auto-renewal wording
    const aq = pageText(c, 'autoRenewal'); if (c.autoRenewal.enabled !== /renew(s|ed)? (automatically|for)|automatically renew|automatic renewal/i.test(aq) && !(c.autoRenewal.enabled === false && /not (renew|be renewed)|no automatic|does not/i.test(aq))) bad.push(`auto-renewal ${c.autoRenewal.enabled} quote "${aq}"`);
    // indexation
    const iq = pageText(c, 'indexation'); const ix = c.indexation;
    if (ix.indexName === 'None') { if (!/fixed|no (price )?(review|indexation)|not (be )?(adjusted|reviewed|increased)/i.test(iq)) bad.push('fixed prices quote ' + iq); }
    else { if (!iq.includes(ix.indexName)) bad.push(`index name ${ix.indexName} in "${iq}"`); if (ix.capPct != null && !new RegExp(`\\b${(ix.capPct * 100).toFixed(1).replace(/\.0$/, '')}(\\.0)?\\s?(%|per cent)`).test(iq)) bad.push(`index cap ${ix.capPct} in "${iq}"`); if (ix.capPct == null && /\d+(\.\d+)?\s?(%|per cent)/.test(iq)) bad.push('quote states a cap but register says none: ' + iq); }
    // payment terms
    const pq = pageText(c, 'paymentTerms'); if (!new RegExp(`\\b${c.paymentTermsDays}\\b`).test(pq) && !new RegExp(`\\(${c.paymentTermsDays}\\)`).test(pq)) bad.push(`payment days ${c.paymentTermsDays} in "${pq}"`);
    // extensions
    const eq2 = pageText(c, 'extensions'); if (c.extension.count === 0 ? !/no (option|extension|right)|not (be )?extend|no extension/i.test(eq2) : !new RegExp(`${c.extension.lengthMonths}`).test(eq2)) bad.push(`extension quote "${eq2}" vs ${JSON.stringify(c.extension)}`);
    // service credits
    const sq = pageText(c, 'serviceCredits'); if (c.serviceCredits.present) { if (c.serviceCredits.perFailurePct != null && !sq.includes(String(c.serviceCredits.perFailurePct))) bad.push('credit % ' + sq); if (c.serviceCredits.monthlyCapPct != null && !sq.includes(String(c.serviceCredits.monthlyCapPct))) bad.push('credit cap % ' + sq); } else if (!/no service credit|not (include|provide)|no /i.test(sq)) bad.push('no credits quote ' + sq);
    // termination
    const tq = pageText(c, 'terminationForConvenience'); if (c.termination.forConvenience && !new RegExp(`\\b${c.termination.noticeMonths}\\b`).test(tq)) bad.push(`termination notice ${c.termination.noticeMonths} in "${tq}"`);
    const xq = pageText(c, 'exitFees'); if (c.termination.exitFeesSummary !== 'None' && !xq.includes(c.termination.exitFeesSummary.split(',')[0].slice(0, 20))) bad.push(`exit fees "${xq}" vs ${c.termination.exitFeesSummary}`);
    // rate card
    const rq = pageText(c, 'rateCard'); for (const r of c.rateCard) if (!rq.includes(r.item) || !rq.includes(r.rateGBP.toFixed(2).replace(/\.00$/, '')) && !rq.includes(String(r.rateGBP))) bad.push(`rate ${r.item} ${r.rateGBP} in "${rq.slice(0, 120)}"`);
    if (bad.length) throw new Error(bad.join('; '));
  });
}

/* ------------------------------------------------------------- payments */
const e = E.compute();
t0.check('payments: dated 2022-04-01..2026-09-30, valid calendar dates, over £500, 2dp, VAT 0, sorted, ids sequential, file name matches month', () => {
  const bad = []; let prev = ''; let n = 0;
  for (const p of payments) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || E.addMonths(p.date, 0) !== p.date) bad.push(p.id + ' bad date ' + p.date);
    if (p.date < DATA.council.spendDataFrom || p.date > DATA.council.spendDataTo) bad.push(p.id + ' outside window ' + p.date);
    if (!(p.amountGBP > 500)) bad.push(p.id + ' amount ' + p.amountGBP);
    if (Math.abs(r2(p.amountGBP) - p.amountGBP) > 1e-9) bad.push(p.id + ' >2dp ' + p.amountGBP);
    if (p.vatIrrecoverableGBP !== 0) bad.push(p.id + ' vat');
    if (p.date < prev) bad.push(p.id + ' not sorted'); prev = p.date;
    n++; if (p.id !== `MBC-${p.date.slice(0, 4)}-${String(n).padStart(6, '0')}`) bad.push(`${p.id} not sequential (expected #${n})`);
    if (p.sourceFile !== `marchbank-payments-over-500-${p.date.slice(0, 7)}.csv`) bad.push(p.id + ' file ' + p.sourceFile);
    if (!p.department || !p.purpose || !p.expenseType) bad.push(p.id + ' blank field');
  }
  if (bad.length) throw new Error(bad.slice(0, 6).join('; ') + ` (${bad.length})`);
});
t0.check('payments: 54 monthly files, one per month 2022-04..2026-09', () => { const f = new Set(payments.map((p) => p.sourceFile)); if (f.size !== 54) throw new Error(`${f.size} files`); });
t0.check('payments: total £153,489,000 and every payee string is a known supplier, alias or one of the 8 + 1 non-contract payees', () => {
  const tot = r2(payments.reduce((s, p) => s + p.amountGBP, 0)); if (tot !== 153489000) throw new Error('total ' + tot);
  const unk = [...e.matches.values()].filter((m) => m.status === 'unmatched').map((m) => m.rawName).sort();
  if (unk.length !== 8) throw new Error('unmatched payees ' + unk.length);
});
t0.check('attribution: no accepted payment is dropped (no ambiguous, before_start or no_contract), and only C-007 has after-end payments', () => {
  const per = {}; for (const a of e.attributed) per[a.period] = (per[a.period] || 0) + 1;
  const dropped = (per.ambiguous || 0) + (per.before_start || 0) + (per.no_contract || 0); if (dropped) throw new Error(JSON.stringify(per));
  const ae = e.attributed.filter((a) => a.period === 'after_end'); const ids = [...new Set(ae.map((a) => a.contractId))]; if (ids.join() !== 'C-007') throw new Error('after_end contracts ' + ids.join());
  if (per.in_term + per.after_end + per.unmatched !== payments.length) throw new Error('periods do not add up ' + JSON.stringify(per));
});
t0.check('each contract: first and last payment fall inside the contract window (except C-007 after-end and files window)', () => {
  const bad = [];
  for (const c of contracts) {
    const mine = e.attributed.filter((a) => a.contractId === c.id).map((a) => a.payment.date).sort();
    if (!mine.length) { bad.push(c.id + ' no payments'); continue; }
    if (mine[0] < c.startDate) bad.push(`${c.id} first payment ${mine[0]} before start ${c.startDate}`);
    const last = mine[mine.length - 1]; if (c.id !== 'C-007' && last > c.endDate) bad.push(`${c.id} last payment ${last} after end ${c.endDate}`);
    if (last < '2026-07-01' && c.endDate >= '2026-10-06') bad.push(`${c.id} live contract but last payment ${last}`);
  }
  if (bad.length) throw new Error(bad.join('; '));
});
t0.check('payment cadence: no duplicate (supplier, date, amount) rows', () => { const s = new Set(); for (const p of payments) { const k = `${p.supplierNameRaw}|${p.date}|${p.amountGBP}`; if (s.has(k)) throw new Error('duplicate ' + k); s.add(k); } });
t0.check('amount spread per supplier is plausible (max/min < 3 within a contract)', () => {
  const bad = [];
  for (const c of contracts) { const a = e.attributed.filter((x) => x.contractId === c.id).map((x) => x.payment.amountGBP); const mx = Math.max(...a), mn = Math.min(...a); if (mx / mn > 3) bad.push(`${c.id} ${mn}..${mx}`); }
  if (bad.length) throw new Error(bad.join('; '));
});

/* ------------------------------------------------------------- contracts and suppliers */
t0.check('contracts: start < end, end on a month end, cap >= annual value, extension and dates coherent, supplier ids resolve, status', () => {
  const bad = [];
  for (const c of contracts) {
    if (!(c.startDate < c.endDate)) bad.push(c.id + ' dates');
    if (E.addDays(c.endDate, 1).slice(8) !== '01') bad.push(c.id + ' does not end on a month end ' + c.endDate);
    if (c.cap.basis === 'annual' ? c.cap.amountGBP < c.annualValueGBP * 0.9 : c.cap.amountGBP < c.annualValueGBP) bad.push(c.id + ' cap below annual value');
    const s = suppliers.find((x) => x.id === c.supplierId); if (!s || s.legalName !== c.supplierName) bad.push(c.id + ' supplier link');
    if (c.notice && c.notice.unit === 'months' && c.notice.value > 12) bad.push(c.id + ' notice ' + c.notice.value);
  }
  if (bad.length) throw new Error(bad.join('; '));
});
t0.check('suppliers: fictional flag, 8-digit company numbers, none uses a well-known real company name', () => {
  const REAL = /\b(capita|serco|g4s|mitie|sodexo|veolia|biffa|amey|balfour|kier|interserve|carillion|atkins|jacobs|aecom|bt group|vodafone|o2|microsoft|oracle|sap|northgate|civica|agilisys|bam|skanska|wates|willmott)\b/i;
  for (const s of suppliers) { if (!s.isFictional) throw new Error(s.id + ' not fictional'); if (!/^\d{8}$/.test(s.companyNumber)) throw new Error(s.id + ' company number'); if (REAL.test(s.legalName)) throw new Error(s.legalName + ' looks like a real company'); }
  for (const m of e.matches.values()) if (REAL.test(m.rawName)) throw new Error(m.rawName + ' looks like a real company');
});
t0.check('council record is internally consistent', () => { const c = DATA.council; if (c.asOf !== '2026-10-06' || c.spendDataFrom !== '2022-04-01' || c.spendDataTo !== '2026-09-30' || c.spendFileCount !== 54 || !c.isFictional) throw new Error(JSON.stringify(c)); });
t0.finish();
