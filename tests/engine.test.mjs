// Kontor financial layer: data, engine, copy and estate tests. Plain node, no dependencies, exits non-zero on any failure.
//   node tests/engine.test.mjs [path/to/sample.json]
// Groups 1 to 11 are the original golden groups (R/requirements.md section 6), kept as they were. Later groups cover capState and estimate semantics,
// contract.source, determinism, page richness, evidence targets, copy golden strings and lint, the estate pipeline, persistence and the static data modules.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assertStrict from 'node:assert/strict';

process.removeAllListeners('warning'); // src/*.js are ES modules in a package without "type": "module"; silence Node's detection notice

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const samplePath = process.argv[2] || path.join(root, 'src/data/sample.json');
let checks = 0;
const assert = new Proxy(assertStrict, { get(t, k) { const v = t[k]; return typeof v === 'function' ? (...a) => { checks++; return v.apply(t, a); } : v; } });
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);

const E = await imp('src/lib/engine.js');
const Estate = await imp('src/lib/estate.js');
const Copy = await imp('src/lib/copy.js');
const Fmt = await imp('src/lib/format.js');
const Ev = await imp('src/lib/evidenceFor.js');
const { evidence, CHECKED_ON } = await imp('src/data/evidence.js');
const { roadmap } = await imp('src/data/roadmap.js');
const Reasons = await imp('src/data/reasons.js');
const Seed = await imp('scripts/lib/seed.mjs');
const Prov = await imp('scripts/lib/provenance.mjs');

const D = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const run = (decisions = {}, triage = {}, opts = {}) => {
  const o = { ...E.DEFAULTS, ...opts };
  const matches = E.buildMatches(D.payments, D.suppliers, D.aliases, decisions, o);
  const attributed = E.attribute(D.payments, matches, D.contracts);
  const res = E.buildFlags({ council: D.council, contracts: D.contracts, matches, attributed }, o, E.AS_OF, triage);
  return { matches, attributed, ...res, cov: E.coverage(attributed, matches) };
};
let groups = 0, failed = 0;
const t = (name, fn) => { groups++; const before = checks; try { fn(); console.log('ok  ', name, `(${checks - before} checks)`); } catch (e) { failed++; console.error('FAIL', name, '\n', e.message, '\n', String(e.stack).split('\n').filter((l) => l.includes('engine.test.mjs')).slice(0, 2).join('\n')); } };
const base = run();
const est = Estate.computeEstate();
const C = (id) => D.contracts.find((c) => c.id === id);
const X = (id) => D.extractions.find((x) => x.id === id);

/* ------------------------------------------------------------------------------------------------ 1 to 11: the original golden groups */
t('date maths', () => { assert.equal(E.addMonths('2027-03-31', -6), '2026-09-30'); assert.equal(E.addMonths('2024-02-29', 12), '2025-02-28'); assert.equal(E.addMonths(E.AS_OF, 3), '2027-01-06'); assert.equal(E.addMonths(E.AS_OF, 6), '2027-04-06'); assert.equal(E.addMonths(E.AS_OF, 12), '2027-10-06'); assert.equal(E.noticeDeadline('2026-12-31', { value: 30, unit: 'days' }).date, '2026-12-01'); });
t('headline', () => { assert.equal(base.totals.totalGBP, 6145238); assert.equal(base.totals.contractCount, 15); assert.deepEqual(base.totals.byType, { overCap: 4172000, nearCap: 642478, renewal: 1075500, uplift: 255260 }); assert.equal(E.fmtGBPCompact(base.totals.totalGBP), '£6.1m'); assert.equal(E.fmtGBPCompact(8350000), '£8.4m'); });
t('ranked order and values', () => {
  const want = [['F-C-005-overCap', 3350000], ['F-C-007-overCap', 760000], ['F-C-001-nearCap', 642478], ['F-C-003-renewal', 310000], ['F-C-004-uplift', 188200], ['F-C-002-renewal', 145000], ['F-C-001-renewal', 120000], ['F-C-004-renewal', 110000], ['F-C-007-renewal', 90000], ['F-C-014-renewal', 70000], ['F-C-011-overCap', 62000], ['F-C-018-renewal', 57500], ['F-C-005-renewal', 50000], ['F-C-012-uplift', 49000], ['F-C-016-renewal', 47500], ['F-C-015-renewal', 39000], ['F-C-009-renewal', 21000], ['F-C-010-uplift', 18060], ['F-C-017-renewal', 15500]];
  assert.deepEqual(base.ranked.map((f) => [f.id, f.indicativeGBP]), want);
  assert.deepEqual(base.watch.map((f) => f.id).sort(), ['F-C-009-nearCap', 'F-C-017-nearCap']);
});
t('radar bands', () => {
  const band = Object.fromEntries(D.contracts.map((c) => [c.id, E.radarBand(c).band]));
  const by = (b) => Object.keys(band).filter((k) => band[k] === b).sort();
  assert.deepEqual(by('passed'), ['C-001', 'C-016']); assert.deepEqual(by('ended'), ['C-007']);
  assert.deepEqual(by('m3'), ['C-003', 'C-009', 'C-017']); assert.deepEqual(by('m6'), ['C-002', 'C-004', 'C-005', 'C-018']); assert.deepEqual(by('m12'), ['C-014', 'C-015']); assert.equal(by('later').length, 12);
  assert.equal(E.radarBand(D.contracts.find((c) => c.id === 'C-001')).deadline, '2026-09-30');
});
t('cap states', () => {
  const d = base.derived; assert.equal(d['C-005'].cap.state, 'over'); assert.equal(d['C-005'].spend.toDate, 8350000); assert.equal((d['C-005'].cap.utilisation * 100).toFixed(1), '167.0');
  assert.equal(d['C-001'].cap.state, 'near'); assert.equal(d['C-004'].cap.state, 'ok'); assert.equal(d['C-007'].spend.afterEndGBP, 780000); assert.equal(d['C-011'].cap.excessGBP, 62000);
});
t('uplift', () => {
  const f = (id) => base.derived[id].uplift; assert.equal(f('C-004').flagged, true); assert.equal(f('C-003').flagged, false); assert.equal(f('C-015').flagged, false); assert.equal(f('C-011').testable, false); assert.equal(f('C-019').reason, 'Fewer than 24 months of payments in the contract term');
});
t('matching', () => {
  const m = (n) => base.matches.get(n);
  assert.equal(m('KESTRELVALE FACILITIES SVCS LTD').method, 'normalised'); assert.equal(m('Kestrelvale FM').method, 'alias'); assert.equal(m('Larchmont Grounds Maintenance').status, 'suggested'); assert.equal(m('Larchmont Grounds Maintenance').score, 0.73); assert.equal(m('Mirefield Training Partners Ltd').status, 'unmatched');
});
t('coverage', () => { assert.equal(base.cov.totalGBP, 153489000); assert.equal(base.cov.linkedGBP, 129359000); assert.equal(base.cov.noContract.length, 8); assert.equal(Math.round(base.cov.noContract.reduce((a, x) => a + x.totalGBP, 0)), 23830000); assert.equal(base.cov.awaitingReview[0].totalGBP, 300000); });
t('scenarios', () => {
  assert.equal(run({ 'Larchmont Grounds Maintenance': 'confirm' }).totals.totalGBP, 6205238);
  assert.equal(run({ 'Larchmont Grounds Maintenance': 'reject' }).totals.totalGBP, 6145238);
  assert.equal(run({}, { 'F-C-005-overCap': 'explained' }).totals.totalGBP, 2795238);
  assert.equal(run({}, { 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'not_an_issue' }).totals.totalGBP, 2035238);
  assert.equal(run({}, {}, { renewalRate: 0.08 }).totals.totalGBP, 6790538); assert.equal(run({}, {}, { renewalRate: 0.03 }).totals.totalGBP, 5715038);
});
t('quote fidelity for every extraction', () => {
  for (const x of D.extractions) { const p = x.provenance[0]; const page = D.documents[p.documentId].pages[p.page]; assert.ok(page.some((b) => b.text === p.quote && (b.extractionIds || []).includes(x.id)), x.id); }
  assert.equal(D.extractions.length, 336);
});
t('every flag has a source link target', () => {
  for (const f of base.ranked) { const id = `X-${f.contractId}-${f.evidenceFields[0]}`; const x = D.extractions.find((e) => e.id === id); assert.ok(x && x.provenance[0].page > 0, f.id); }
});

/* ------------------------------------------------------------------------------------------------ 12 onwards */
t('golden numbers are unchanged by the settled engine changes (flag-for-flag against the reference scenarios)', () => {
  // Only F-C-017-nearCap (a contract-value cap on the GBP 0 watch list) may differ from the reference engine: labels and confidence, never a number.
  const keep = (f) => ({ id: f.id, type: f.type, severity: f.severity, indicativeGBP: f.indicativeGBP, basis: f.basis, actionBy: f.actionBy, status: f.status, variant: f.variant, band: f.band });
  assert.deepEqual(base.ranked.map(keep).map((f) => f.indicativeGBP), [3350000, 760000, 642478, 310000, 188200, 145000, 120000, 110000, 90000, 70000, 62000, 57500, 50000, 49000, 47500, 39000, 21000, 18060, 15500]);
  assert.deepEqual(base.ranked.map((f) => f.confidence), ['high', 'high', 'high', 'high', 'high', 'high', 'high', 'high', 'high', 'high', 'high', 'low', 'high', 'high', 'high', 'high', 'high', 'high', 'high']); // only F-C-018-renewal is Low
  assert.deepEqual(base.ranked.map((f) => f.severity), ['high', 'high', 'medium', 'high', 'high', 'medium', 'high', 'medium', 'high', 'low', 'high', 'medium', 'medium', 'medium', 'high', 'low', 'high', 'medium', 'high']);
  assert.deepEqual(base.ranked.map((f) => f.actionBy), [null, null, null, '2026-10-31', '2027-08-01', '2027-03-31', '2026-09-30', '2027-01-31', null, '2027-06-30', null, '2027-02-28', '2027-02-28', '2027-09-01', '2026-06-30', '2027-04-30', '2026-12-31', '2027-01-01', '2026-12-01']);
});

t('golden per-contract table (requirements 6.6): spend to date, utilisation, T12 and P12, partial coverage', () => {
  // id: [spend to date, utilisation %, T12, P12]
  const want = {
    'C-001': [11380000, 94.8, 2620000, 2550000], 'C-002': [10400000, 65.0, 3050000, 2950000], 'C-003': [27470000, 55.4, 6420000, 6150000], 'C-004': [8870000, 80.6, 2310000, 2060000], 'C-005': [8350000, 167.0, 2350000, 2100000], 'C-006': [5070000, 46.1, 1150000, 1120000],
    'C-007': [6160000, 114.1, 1830000, 1780000], 'C-008': [10120000, 46.0, 4120000, 4050000], 'C-009': [1960000, 89.1, 250000, 540000], 'C-010': [1509000, 62.9, 531000, 498000], 'C-011': [1617000, 113.8, 452199, 475944], 'C-012': [7280000, 58.2, 1930000, 1800000],
    'C-013': [4110000, 63.2, 1360000, 1330000], 'C-014': [2750000, 65.5, 1300000, 1450000], 'C-015': [3130000, 72.8, 830000, 800000], 'C-016': [4280000, 64.4, 970000, 960000], 'C-017': [990000, 90.8, 320000, 310000], 'C-018': [5260000, 76.2, 1190000, 1170000],
    'C-019': [276000, 30.7, 181000, 95000], 'C-020': [1386000, 44.7, 640000, 626000], 'C-021': [1200000, 50.4, 340000, 340000], 'C-022': [2690000, 30.6, 1640000, 1050000], 'C-023': [2295000, 62.0, 760000, 745000], 'C-024': [806000, 38.8, 526000, 280000],
  };
  for (const [id, [toDate, util, t12, p12]] of Object.entries(want)) { const d = base.derived[id]; assert.equal(d.spend.toDate, toDate, id + ' spend'); assert.equal((d.cap.utilisation * 100).toFixed(1), util.toFixed(1), id + ' utilisation'); assert.equal(Math.round(d.spend.t12), t12, id + ' t12'); assert.equal(Math.round(d.spend.p12), p12, id + ' p12'); }
  assert.deepEqual(D.contracts.filter((c) => base.derived[c.id].spend.coverage === 'partial').map((c) => c.id), ['C-003', 'C-016', 'C-018']);
  assert.deepEqual(base.derived['C-011'].spend.byYear.map((y) => y.spendGBP), [430000, 512000, 447000, 228000]);
  // the supplier match table (everything not listed is an Exact 1.00 match)
  const m = (n) => base.matches.get(n); const row = (n) => [m(n).method, m(n).score, m(n).status, m(n).paymentCount, Math.round(m(n).totalGBP)]; // the table prints whole pounds
  assert.deepEqual(row('Dunmoor Agency Staffing Ltd'), ['fuzzy', 0.33, 'unmatched', 54, 9300000]); assert.deepEqual(row('Oakhaven Independent Care Placements Ltd'), ['fuzzy', 0.26, 'unmatched', 54, 4750000]); assert.deepEqual(row('KESTRELVALE FACILITIES SVCS LTD'), ['normalised', 0.98, 'auto_accepted', 19, 3962403]);
  assert.deepEqual(row('QUILLON WASTE SERVICES LIMITED'), ['normalised', 0.98, 'auto_accepted', 7, 3511140]); assert.deepEqual(row('Quillon Environmental'), ['alias', 0.95, 'auto_accepted', 3, 1568815]); assert.deepEqual(row('Kestrelvale FM'), ['alias', 0.95, 'auto_accepted', 6, 1263304]);
  assert.deepEqual(row('Larchmont Grounds Maintenance'), ['fuzzy', 0.73, 'suggested', 6, 300000]); assert.deepEqual(row('Mirefield Training Partners Ltd'), ['fuzzy', 0.55, 'unmatched', 18, 510000]); assert.deepEqual(row('FENNIMORE HIGHWAYS LIMITED'), ['normalised', 0.98, 'auto_accepted', 8, 1431738]);
  assert.equal([...base.matches.values()].filter((x) => x.method === 'exact').every((x) => x.score === 1 && x.status === 'auto_accepted'), true);
  assert.deepEqual(base.cov.noContract.map((x) => [x.name, x.totalGBP]), [['Dunmoor Agency Staffing Ltd', 9300000], ['Oakhaven Independent Care Placements Ltd', 4750000], ['Harlowe Transport Hire Ltd', 2600000], ['Corran Digital Consulting Ltd', 2400000], ['Skerrow Temporary Accommodation Ltd', 1700000], ['Bellmere Building Supplies Ltd', 1510000], ['Pennywhistle Print and Mailing Ltd', 1060000], ['Mirefield Training Partners Ltd', 510000]]);
});

t('capState and estimate semantics (decision 9)', () => {
  const d = base.derived;
  assert.equal(d['C-005'].cap.capState, 'over'); assert.equal(d['C-007'].cap.capState, 'over'); assert.equal(d['C-011'].cap.capState, 'over');
  assert.equal(d['C-001'].cap.capState, 'near'); assert.equal(d['C-004'].cap.capState, 'ok'); assert.equal(d['C-017'].cap.capState, 'near');
  assert.equal(d['C-017'].cap.source, 'contract_value'); assert.equal(d['C-005'].cap.source, 'maximum_stated');
  assert.equal(base.ranked.find((f) => f.id === 'F-C-005-overCap').capState, 'over');
  // watch-list flag on a contract-value cap: same number (0), one step lower confidence
  const w = base.watch.find((f) => f.id === 'F-C-017-nearCap'); assert.equal(w.confidence, 'medium'); assert.equal(w.confidenceSteppedDown, true); assert.equal(w.capSource, 'contract_value');
  // the same spend on a contract-value cap versus a stated maximum: identical £, estimate wording, one step lower confidence, medium severity
  const synth = (source) => {
    const contracts = D.contracts.map((c) => (c.id === 'C-016' ? { ...c, cap: { amountGBP: 4000000, basis: 'total_term', source } } : c));
    const o = E.DEFAULTS; const matches = E.buildMatches(D.payments, D.suppliers, D.aliases, {}, o); const attributed = E.attribute(D.payments, matches, contracts);
    return E.buildFlags({ council: D.council, contracts, matches, attributed }, o, E.AS_OF, {});
  };
  const est16 = synth('contract_value'), max16 = synth('maximum_stated');
  const fe = est16.flags.find((f) => f.id === 'F-C-016-overCap'), fm = max16.flags.find((f) => f.id === 'F-C-016-overCap');
  assert.equal(fe.indicativeGBP, 280000); assert.equal(fm.indicativeGBP, 280000); assert.equal(est16.totals.totalGBP, max16.totals.totalGBP);
  assert.equal(est16.derived['C-016'].cap.state, 'over'); assert.equal(est16.derived['C-016'].cap.capState, 'above_estimate'); assert.equal(max16.derived['C-016'].cap.capState, 'over');
  assert.equal(fe.capState, 'above_estimate'); assert.equal(fm.capState, 'over'); assert.equal(fm.confidence, 'high'); assert.equal(fe.confidence, 'medium'); assert.equal(fe.severity, 'medium'); assert.equal(fm.severity, 'high');
  assert.equal(Copy.flagTypeLabel(fe), 'Above contract value (estimate)'); assert.equal(Copy.flagTypeLabel(fm), 'Spend over cap'); assert.equal(Copy.flagTypeLabel('overCap'), 'Spend over cap');
  assert.equal(Copy.capStateLabel(est16.derived['C-016'].cap), 'Above contract value (estimate)'); assert.equal(Copy.capStateLabel(max16.derived['C-016'].cap), 'Over cap');
  assert.equal(Copy.capStateLabel(base.derived['C-017'].cap), 'Close to contract value (estimate)'); assert.equal(Copy.capStateLabel(base.derived['C-001'].cap), 'Close to cap'); assert.equal(Copy.capStateLabel(base.derived['C-004'].cap), 'Within cap');
  assert.equal(Copy.capStateLabel({ testable: false }), 'Cannot test');
  assert.equal(fe.breakdown[1].label, 'Contract value (an estimate, not a stated maximum)'); assert.equal(fe.breakdown.at(-1).value, fe.indicativeGBP);
  assert.match(Copy.reasonFor(fe, C('C-016'), est16.derived['C-016']), /contract value of £4,000,000, which is an estimate and not a stated maximum/);
  assert.equal(Reasons.reasonKey(fe), 'aboveEstimate'); assert.equal(Reasons.reasonKey(fm), 'overCap');
  // low confidence drops to low, never below
  const low = { ...C('C-016') };
  assert.equal(Copy.confidenceReason({ confidenceScore: 0.97, confidenceField: 'endDate', confidenceSteppedDown: true, confidence: 'medium' }).includes('one step lower'), true);
});

t('contract.source (decision 9)', () => {
  for (const c of D.contracts) {
    assert.ok(['find_a_tender', 'register_pdf'].includes(c.source), c.id);
    assert.equal(c.source, c.startDate >= Seed.FTS_FROM && c.totalValueGBP > Seed.FTS_MIN_TOTAL ? 'find_a_tender' : 'register_pdf', c.id);
  }
  assert.equal(Seed.FTS_FROM, '2025-02-24'); assert.equal(Seed.FTS_MIN_TOTAL, 5000000);
  assert.equal(D.contracts.filter((c) => c.source === 'find_a_tender').length, 0); // none truly qualifies, so all are register PDFs
  assert.equal(Copy.sourceLabel(C('C-005')), 'Council contracts register, PDF'); assert.equal(Copy.sourceLabel('find_a_tender'), 'Find a Tender notice and contract');
});

t('data facts: VAT basis and data window', () => {
  const c = D.council;
  assert.equal(c.spendVatBasis, 'net_of_irrecoverable_vat'); assert.equal(c.contractValueVatBasis, 'excluding_vat'); assert.equal(c.spendWindowLabel, 'Sample payments to 30 September 2026');
  assert.equal(c.spendFileCount, new Set(D.payments.map((p) => p.sourceFile)).size); assert.equal(c.spendFileCount, 54);
  assert.ok(D.payments.every((p) => p.date >= c.spendDataFrom && p.date <= c.spendDataTo)); assert.ok(D.payments.every((p) => p.vatIrrecoverableGBP === 0));
  assert.equal(Copy.COPY.dataWindowNote(c), 'Sample payments to 30 September 2026.'); assert.equal(Copy.COPY.vatNote, 'Figures are net of irrecoverable VAT and compared with ex-VAT contract values.');
});

t('engine extras: totals, derived fields, radar groups, coverage sums', () => {
  assert.deepEqual(base.totals.countByType, { overCap: 3, nearCap: 1, renewal: 12, uplift: 3 }); assert.equal(base.totals.excludedGBP, 0); assert.equal(base.totals.excludedCount, 0);
  const ex = run({}, { 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'not_an_issue', 'F-C-003-renewal': 'under_review' });
  assert.equal(ex.totals.excludedGBP, 4110000); assert.equal(ex.totals.excludedCount, 2); assert.equal(ex.totals.countByType.overCap, 1); assert.equal(ex.totals.countByType.renewal, 12); // under review still counts
  assert.equal(ex.totals.totalGBP + ex.totals.excludedGBP, base.totals.totalGBP);
  const dv = base.derived;
  assert.equal(dv['C-001'].latestEndDate, '2029-03-31'); assert.equal(dv['C-005'].latestEndDate, '2027-05-31'); assert.equal(dv['C-004'].nextReviewDate, '2027-08-01'); assert.equal(dv['C-005'].nextReviewDate, null);
  assert.equal(dv['C-007'].status, 'ended'); assert.equal(dv['C-005'].status, 'live'); assert.equal(dv['C-018'].usedEndDate, true); assert.equal(dv['C-001'].usedEndDate, false);
  assert.deepEqual(dv['C-005'].flagIds, ['F-C-005-renewal', 'F-C-005-overCap']); assert.equal(Object.values(dv).reduce((s, d) => s + d.flagIds.length, 0), base.flags.length);
  assert.equal(dv['C-005'].spend.coverageFrom, '2022-04-01');
  const rd = E.buildRadar(D.contracts, base.derived, base.flags);
  assert.deepEqual(rd.boundaries, { m3: '2027-01-06', m6: '2027-04-06', m12: '2027-10-06' });
  const g = rd.groups; const row = (k) => [g[k].count, g[k].annualGBP, g[k].totalGBP, g[k].items.map((i) => i.contractId).join(' ')];
  assert.deepEqual(row('passed'), [2, 3350000, 18650000, 'C-016 C-001']); assert.deepEqual(row('ended'), [1, 1800000, 5400000, 'C-007']);
  assert.deepEqual(row('m3'), [3, 6930000, 52790000, 'C-003 C-017 C-009']); assert.deepEqual(row('m6'), [4, 7250000, 37400000, 'C-004 C-005 C-018 C-002']); assert.deepEqual(row('m12'), [2, 2180000, 8100000, 'C-015 C-014']);
  assert.deepEqual([g.later.count, g.later.annualGBP, g.later.totalGBP], [12, 13000000, 74060000]); assert.equal(g.history.count, 0);
  assert.equal(Object.values(g).reduce((s, x) => s + x.count, 0), 24); // every contract in exactly one group
  assert.deepEqual(rd.attention.map((i) => i.contractId), ['C-001', 'C-016', 'C-007']);
  assert.equal(g.m6.items.find((i) => i.contractId === 'C-018').usedEndDate, true); assert.equal(g.passed.items[0].flagId, 'F-C-016-renewal');
  assert.equal(base.cov.noContractGBP, 23830000); assert.equal(base.cov.awaitingReviewGBP, 300000);
});

t('engine and copy never read the clock', () => {
  const src = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\/\/.*$/gm, '');
  for (const p of ['src/lib/engine.js', 'src/lib/copy.js', 'src/lib/format.js', 'src/lib/evidenceFor.js', 'src/data/evidence.js', 'src/data/roadmap.js', 'src/data/reasons.js']) {
    const s = src(p); assert.ok(!/Date\.now\s*\(/.test(s), p + ' Date.now'); assert.ok(!/new Date\s*\(\s*\)/.test(s), p + ' new Date()'); assert.ok(!/Math\.random|performance\.now/.test(s), p + ' random');
  }
  const s = src('src/lib/estate.js');
  assert.equal((s.match(/new Date\s*\(\s*\)/g) || []).length, 1); assert.ok(!/Date\.now\s*\(/.test(s)); // the single allowed use: the timestamp on a saved feedback entry
  assert.equal(E.AS_OF, '2026-10-06'); assert.equal(D.council.asOf, '2026-10-06');
});

t('determinism: the generator is byte-identical on every run and the committed data is current', () => {
  const dir = path.join(root, '.scratch', 'engine-test'); fs.mkdirSync(dir, { recursive: true });
  const gen = (name) => { const out = path.join(dir, name); execFileSync(process.execPath, [path.join(root, 'scripts/gen-data.mjs'), out], { cwd: root, stdio: 'pipe' }); return fs.readFileSync(out); };
  const a = gen('a.json'), b = gen('b.json');
  assert.ok(a.equals(b)); assert.ok(a.equals(fs.readFileSync(path.join(root, 'src/data/sample.json'))), 'src/data/sample.json is stale: run npm run data');
  const s1 = Seed.buildSample(), s2 = Seed.buildSample(); assert.deepEqual(s1, s2);
  const p1 = Prov.buildProvenance(s1.contracts), p2 = Prov.buildProvenance(s2.contracts); assert.deepEqual(p1, p2);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.ok(fs.statSync(path.join(root, 'src/data/sample.json')).size < 1200000, 'sample.json should stay under 1.2 MB');
});

t('dataset shape', () => {
  assert.equal(D.contracts.length, 24); assert.equal(D.payments.length, 1264); assert.equal(D.extractions.length, 336); assert.equal(Object.keys(D.documents).length, 24); assert.equal(D.suppliers.length, 24); assert.equal(D.questions.length, 9);
  assert.equal(D.council.name, 'Marchbank Borough Council'); assert.equal(D.council.isFictional, true);
  assert.deepEqual(D.questions.flatMap((q) => q.fields).length, 14);
  for (const c of D.contracts) { assert.equal(Object.keys(c.extractionIds).length, 14, c.id); assert.ok(D.documents[c.documentId], c.id); assert.ok(c.confidence.noticePeriod != null); }
  assert.equal(C('C-005').documentId, 'DOC-C-005'); assert.equal(D.documents['DOC-C-005'].pageCount, 70);
  assert.deepEqual(Object.keys(D.documents['DOC-C-005'].pages).map(Number), [7, 13, 20, 23, 31, 32, 33, 43, 46, 51]);
  const x = X('X-C-005-maximumValue'); assert.equal(x.provenance[0].page, 23); assert.equal(x.provenance[0].clauseRef, 'Clause 14.3'); assert.match(x.provenance[0].quote, /shall not exceed £5,000,000 in aggregate/);
  assert.equal(X('X-C-001-noticePeriod').provenance[0].page, 28); assert.equal(X('X-C-004-indexation').provenance[0].page, 45);
  assert.equal(X('X-C-018-noticePeriod').confidence, 0.58); assert.equal(X('X-C-018-noticePeriod').status, 'needs_review');
  assert.equal(D.extractions.filter((e) => e.confidence < 0.75).length, 2); assert.equal(D.extractions.filter((e) => e.confidence >= 0.75 && e.confidence < 0.9).length, 13 + 0); // 13 medium answers (the reference count)
});

t('page richness: every cited page of every contract is a contract page', () => {
  const RICH = ['C-005', 'C-001', 'C-004'];
  let pages = 0;
  for (const doc of Object.values(D.documents)) {
    const rich = RICH.includes(doc.contractId);
    const cited = new Set(D.extractions.filter((x) => x.contractId === doc.contractId).map((x) => x.provenance[0].page));
    assert.deepEqual(Object.keys(doc.pages).map(Number).sort((a, b) => a - b), [...cited].sort((a, b) => a - b), doc.id); // exactly the cited pages
    for (const [n, blocks] of Object.entries(doc.pages)) {
      pages++;
      assert.ok(Number(n) < doc.pageCount, `${doc.id} p${n}`);
      assert.deepEqual(blocks[0], { kind: 'header', text: `Marchbank Borough Council | ${doc.title} | Page ${n} of ${doc.pageCount}` });
      assert.equal(blocks[1].kind, 'heading'); assert.ok(blocks[1].text.length > 3);
      assert.equal(blocks.at(-1).kind, 'footer'); assert.equal(blocks.at(-1).text, `Execution version | Contract ref ${doc.contractId} | ${C(doc.contractId).supplierName}`);
      assert.equal(blocks.filter((b) => b.kind === 'header').length, 1); assert.equal(blocks.filter((b) => b.kind === 'heading').length, 1); assert.equal(blocks.filter((b) => b.kind === 'footer').length, 1);
      const body = blocks.slice(2, -1); assert.ok(body.every((b) => b.kind === 'clause' || b.kind === 'item'), `${doc.id} p${n} body kinds`);
      const neighbours = body.filter((b) => !b.extractionIds), citedBlocks = body.filter((b) => b.extractionIds);
      assert.ok(neighbours.length >= 4 && neighbours.length <= 6, `${doc.id} p${n} has ${neighbours.length} neighbours`);
      if (rich) assert.equal(neighbours.length, 6, `${doc.id} p${n} richest`);
      assert.ok(citedBlocks.length >= 1);
      assert.ok(body.every((b) => typeof b.num === 'string' && b.num.length && b.text && !b.text.startsWith('[')), `${doc.id} p${n} num/text/filler`);
      for (const b of citedBlocks) for (const id of b.extractionIds) { const x = X(id); assert.equal(b.text, x.provenance[0].quote); assert.equal(b.clauseRef, x.provenance[0].clauseRef); assert.equal(x.provenance[0].page, Number(n)); }
      assert.ok(body.length >= 5);
      assert.equal(new Set(body.map((b) => b.num)).size, body.length, `${doc.id} p${n} duplicate clause numbers`); assert.equal(new Set(body.map((b) => b.text)).size, body.length, `${doc.id} p${n} duplicate text`); assert.equal(new Set(body.filter((b) => b.title).map((b) => b.title)).size, body.filter((b) => b.title).length, `${doc.id} p${n} duplicate titles`);
    }
    // each extraction is cited by exactly one block
    for (const x of D.extractions.filter((e) => e.contractId === doc.contractId)) assert.equal(Object.values(doc.pages).flat().filter((b) => (b.extractionIds || []).includes(x.id)).length, 1, x.id);
  }
  assert.equal(pages, D.contracts.reduce((n, c) => n + (c.cap.source === 'maximum_stated' ? 10 : 9), 0)); assert.equal(pages, 227); // the cap clause has its own page only when a maximum is stated
  // numeric consistency between the clause text and the contract fields
  for (const c of D.contracts) {
    const all = Object.values(D.documents[c.documentId].pages).flat();
    const find = (re) => all.find((b) => !b.extractionIds && re.test(b.text));
    if (c.cap.source === 'maximum_stated') {
      const alert = find(/eighty per cent/); assert.ok(alert, c.id + ' 80% alert'); assert.ok(alert.text.includes('£' + (c.cap.amountGBP * 0.8).toLocaleString('en-GB')), c.id + ' 80% amount');
      assert.ok(find(/Maximum Contract Value: see clause 14\.3|Annual Cap: see clause 14\.3/), c.id + ' particulars cross-reference');
    } else { assert.ok(find(/budgeting purposes only/), c.id + ' budgeting note'); assert.equal(X(`X-${c.id}-maximumValue`).provenance[0].clauseRef, 'Contract Particulars, item 10'); }
    if (c.notice) { const last = find(/last date on which the Council may give notice/); assert.ok(last, c.id + ' last notice date'); assert.ok(last.text.includes(Fmt.fmtDateLong(base.derived[c.id].deadline)), `${c.id} notice date ${last.text}`); }
    if (c.extension.count > 0) assert.ok(find(/cannot run beyond/).text.includes(Fmt.fmtDateLong(base.derived[c.id].latestEndDate)), c.id + ' latest end');
    assert.ok(find(/Contracting Authority: Marchbank Borough Council\./) && find(new RegExp('Supplier: ' + c.supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))), c.id + ' particulars');
  }
  // the demo contract (C-005): the budgeting estimate on the Particulars page versus the binding maximum on page 23, with the 80% alert
  const doc = D.documents['DOC-C-005'];
  assert.ok(doc.pages[7].some((b) => /budgeting purposes only and do not oblige the Council to purchase any minimum volume/.test(b.text)));
  assert.ok(doc.pages[7].some((b) => b.text === 'Estimated total value over the Initial Term: £5,000,000 (excluding VAT).'));
  const p23 = doc.pages[23]; const nums = p23.filter((b) => b.kind === 'clause').map((b) => b.num);
  assert.deepEqual(nums, ['14.1', '14.2', '14.3', '14.4', '14.5', '14.6', '14.7']); assert.equal(p23[1].text, 'Charges and Maximum Contract Value'); assert.equal(p23[1].num, '14');
  assert.equal(p23.find((b) => b.num === '14.3').title, 'Maximum Contract Value'); assert.deepEqual(p23.find((b) => b.num === '14.3').extractionIds, ['X-C-005-maximumValue']);
  assert.match(p23.find((b) => b.num === '14.4').text, /eighty per cent \(80%\) of the Maximum Contract Value, being £4,000,000\./);
  assert.match(p23.find((b) => b.num === '14.5').text, /unless a Variation has been agreed in writing under clause 41/);
  // notice and auto-renewal share one block
  assert.deepEqual(D.documents['DOC-C-016'].pages[Object.keys(D.documents['DOC-C-016'].pages).map(Number).find((p) => D.documents['DOC-C-016'].pages[p].some((b) => b.num === '31.1'))].find((b) => b.num === '31.1').extractionIds, ['X-C-016-noticePeriod', 'X-C-016-autoRenewal']);
});

t('every ranked, watch and scenario flag has a working evidenceFor target', () => {
  const scenarios = [base, run({ 'Larchmont Grounds Maintenance': 'confirm' }), run({}, {}, { nearCapThreshold: 0.8 }), run({}, {}, { nearCapThreshold: 0.9 })];
  let n = 0;
  for (const r of scenarios) for (const f of [...r.flags]) {
    const tgt = Ev.evidenceFor(f); assert.ok(tgt, f.id); n++;
    assert.equal(tgt.contractId, f.contractId); assert.equal(tgt.extractionId, `X-${f.contractId}-${f.evidenceFields[0]}`); assert.ok(tgt.page > 0 && tgt.clauseRef && tgt.quote);
    const blocks = D.documents[`DOC-${f.contractId}`].pages[tgt.page]; assert.ok(blocks, f.id + ' page exists');
    assert.ok(blocks.some((b) => b.text === tgt.quote && b.extractionIds.includes(tgt.extractionId)), f.id + ' quote on page');
    assert.equal(Ev.sourceHref(tgt, 'opportunities'), `#/source/${f.contractId}/${tgt.extractionId}?from=opportunities`);
    for (const a of Ev.evidenceAll(f)) assert.ok(D.documents[`DOC-${f.contractId}`].pages[a.page]);
  }
  assert.ok(n >= 84);
  assert.equal(Ev.evidenceFor(base.ranked[0]).page, 23); assert.equal(Ev.evidenceFor(base.ranked[0]).clauseRef, 'Clause 14.3'); assert.equal(Ev.evidenceFor(base.ranked[0]).extractionId, 'X-C-005-maximumValue');
  assert.equal(Ev.evidenceFor(base.flags.find((f) => f.id === 'F-C-017-nearCap')).extractionId, 'X-C-017-awardedTotalValue'); // no maximum stated: the contract value clause
  assert.equal(Ev.evidenceFor(base.flags.find((f) => f.id === 'F-C-001-renewal')).page, 28); assert.equal(Ev.evidenceFor(base.flags.find((f) => f.id === 'F-C-004-uplift')).page, 45);
  assert.equal(Ev.evidenceAll(base.flags.find((f) => f.id === 'F-C-001-renewal')).length, 2); // notice clause (shared with auto-renewal) and the end date
  assert.equal(Ev.evidenceFor(null), null); assert.equal(Ev.evidenceForField('C-005', 'nope'), null);
});

/* ---- copy: golden strings */
t('copy golden strings: headline, R17 cards, sum line, triage note', () => {
  assert.equal(Copy.headlineSentence(base.totals), '£6.1m across 15 contracts flagged as opportunities to investigate');
  assert.equal(Copy.headlineSentence({ totalGBP: 760000, contractCount: 1 }), '£0.8m across 1 contract flagged as an opportunity to investigate'); assert.equal(Copy.headlineSentence({ totalGBP: 62000, contractCount: 1 }), '£62k across 1 contract flagged as an opportunity to investigate');
  const cards = Copy.breakdownCards(base.totals);
  assert.deepEqual(cards.map((c) => c.ariaLabel), ['Spend over cap £4.2m, 3 contracts, already paid above the cap', 'Close to cap £0.6m, 1 contract, projected at the current pace', 'Renewals £1.1m, 12 contracts, indicative value per year', 'Price increases above cap £0.3m, 3 contracts, already paid above the cap']);
  assert.deepEqual(cards.map((c) => [c.title, c.value, c.sub]), [['Spend over cap', '£4.2m', '3 contracts. Already paid above the cap.'], ['Close to cap', '£0.6m', '1 contract. Projected at the current pace.'], ['Renewals', '£1.1m', '12 contracts. Indicative value per year.'], ['Price increases above cap', '£0.3m', '3 contracts. Already paid above the cap.']]);
  assert.deepEqual(cards.map((c) => c.href), ['#/opportunities?type=overCap', '#/opportunities?type=nearCap', '#/opportunities?type=renewal', '#/opportunities?type=uplift']);
  assert.equal(cards.reduce((s, c) => s + c.exactGBP, 0), base.totals.totalGBP);
  assert.equal(Copy.sumLine(base.totals), '£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238');
  const ex = run({}, { 'F-C-005-overCap': 'explained' });
  assert.equal(Copy.headlineSentence(ex.totals), '£2.8m across 15 contracts flagged as opportunities to investigate'); assert.equal(Copy.excludedNote(ex.totals), '£3,350,000 excluded after your review.'); assert.equal(Copy.excludedNote(base.totals), null);
  assert.equal(Copy.sumLine(ex.totals), '£822,000 + £642,478 + £1,075,500 + £255,260 = £2,795,238'.replace('£822,000', '£822,000'));
  assert.equal(Copy.triageToast(C('C-005'), 'explained', ex.totals), 'Highways reactive maintenance and minor works: marked Explained. The headline is now £2.8m.');
  assert.equal(Copy.radarSummaryLine('m3', Estate.computeEstate().radar.groups.m3), 'Next 3 months: 3 contracts, £6.9m a year'); assert.equal(Copy.radarSummaryLine('m6', est.radar.groups.m6), '3 to 6 months: 4 contracts, £7.3m a year'); assert.equal(Copy.radarSummaryLine('m12', est.radar.groups.m12), '6 to 12 months: 2 contracts, £2.2m a year');
  assert.equal(Copy.radarFootnote(12), '12 contracts have notice dates more than 12 months away and are not on the radar.'); assert.equal(Copy.coverageLine(est.coverage), '84% of payments are linked to a contract on the register'); assert.equal(Copy.coverageDetail(est.coverage), '£129.4m of £153.5m');
  assert.equal(Copy.headlineShareText(est.totals, est.coverage), 'The headline is equivalent to 4% of the £153.5m in the sample payment files.');
});

t('copy helpers for list rows and drawers', () => {
  const f = (id) => base.flags.find((x) => x.id === id);
  assert.deepEqual(f('F-C-005-overCap').breakdown.map((b) => [b.label, Copy.breakdownValueText(b)]), [['Spend to date', '£8,350,000'], ['Cap', '£5,000,000'], ['Spend above cap', '£3,350,000']]); // R25 (3)
  assert.deepEqual(f('F-C-004-uplift').breakdown.map((b) => [b.label, Copy.breakdownValueText(b)]), [['Payments, earlier 12 months', '£2,060,000'], ['Increase allowed by cap', '3.0%'], ['Payments allowed under cap', '£2,121,800'], ['Payments, last 12 months', '£2,310,000'], ['Paid above the capped increase', '£188,200']]); // R25 (4)
  assert.deepEqual(f('F-C-001-nearCap').breakdown.map((b) => Copy.breakdownValueText(b)), ['£11,380,000', '£2,620,000', '0.48', '£12,642,478', '£12,000,000', '£642,478']);
  for (const fl of base.flags) assert.equal(Copy.breakdownValueText(fl.breakdown.at(-1)), Fmt.fmtGBP(fl.indicativeGBP), fl.id); // the last line of every breakdown equals the row amount
  assert.equal(Copy.actionByText(f('F-C-003-renewal')), '31 Oct 2026'); assert.equal(Copy.actionByLabel(f('F-C-003-renewal')), 'Notice date'); assert.equal(Copy.actionByLabel(f('F-C-004-uplift')), 'Next price review'); assert.equal(Copy.actionByText(f('F-C-005-overCap')), ''); assert.equal(Copy.actionByLabel(f('F-C-005-overCap')), null);
  assert.deepEqual([C('C-001').notice, C('C-017').notice, C('C-018').notice, { value: 1, unit: 'months' }].map(Copy.noticeShortText), ['6 months', '30 days', 'Not stated', '1 month']);
});

t('copy golden strings: R33 notice deadlines, relative text, R34 attention sentences', () => {
  const dl = (id) => base.derived[id].deadline;
  assert.equal(dl('C-001'), '2026-09-30'); assert.equal(Fmt.fmtDate(dl('C-001')), '30 Sep 2026'); assert.equal(dl('C-017'), '2026-12-01'); assert.equal(dl('C-018'), '2027-02-28');
  assert.equal(Copy.noticeDeadlineNote(base.derived['C-018']), 'No notice period stated. We used the end date.'); assert.equal(Copy.noticeDeadlineNote(base.derived['C-001']), null);
  assert.equal(Copy.relativeText('2026-10-31'), '25 days left'); assert.equal(Copy.relativeText('2026-09-30'), '6 days ago'); assert.equal(Copy.relativeText('2026-10-06'), 'Due today'); assert.equal(Copy.relativeText('2026-10-07'), '1 day left'); assert.equal(Copy.relativeText('2026-10-05'), '1 day ago'); assert.equal(Copy.relativeText('2026-06-30'), '98 days ago');
  assert.equal(Copy.needsAttentionText(C('C-001'), base.derived['C-001']), 'The notice date passed 6 days ago');
  assert.equal(Copy.needsAttentionText(C('C-016'), base.derived['C-016']), 'The notice date passed 98 days ago. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier.');
  assert.equal(Copy.needsAttentionText(C('C-007'), base.derived['C-007']), 'This contract ended on 30 April 2026. You have paid £780,000 since.');
  assert.equal(Copy.needsAttentionText(C('C-003'), base.derived['C-003']), null);
});

t('copy golden strings: the renewal action lines (7.6), every case', () => {
  const al = (id, d) => Copy.actionLine(C(id), d || base.derived[id]);
  assert.equal(al('C-003'), 'Serve notice by 31 October 2026 or this contract renews for 12 months.'); // auto-renews, deadline ahead
  assert.equal(al('C-016'), 'The notice date passed on 30 June 2026. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier.'); // auto-renews, passed
  assert.equal(al('C-002'), 'Decide by 31 March 2027 whether to extend. If you do nothing, the contract ends on 31 March 2028.'); // extension option, ahead
  assert.equal(al('C-001'), 'The date to give notice of an extension passed on 30 September 2026. Agree any extension with the supplier in writing, or plan to re-procure before 31 March 2027.'); // extension option, passed
  assert.equal(al('C-005'), 'Plan the re-procurement. The contract ends on 31 May 2027 and the notice date is 28 February 2027.'); // no extension, ahead
  assert.equal(al('C-005', { ...base.derived['C-005'], band: 'passed', deadline: '2027-02-28' }), 'The notice date passed on 28 February 2027. The contract ends on 31 May 2027. Plan the re-procurement now.'); // no extension, passed
  assert.equal(al('C-018'), 'No notice period is stated in this contract. We used the end date (28 February 2027) as the action date.'); // notice not stated
  assert.equal(al('C-007'), 'This contract ended on 30 April 2026. You have paid £780,000 since. Decide whether to re-procure, extend in writing, or stop paying.'); // ended, payments continue
  assert.equal(al('C-007', { ...base.derived['C-007'], spend: { ...base.derived['C-007'].spend, afterEndGBP: 0 } }), 'This contract ended on 30 April 2026. You have not paid anything under it since.');
  assert.equal(Copy.relativeText(base.derived['C-003'].deadline), '25 days left'); // the ninth row of 7.6: relative text
});

t('copy golden strings: reasons for flags (7.5 templates and append rules)', () => {
  const why = (id) => { const f = base.flags.find((x) => x.id === id); return Copy.reasonFor(f, C(f.contractId), base.derived[f.contractId]); };
  assert.equal(why('F-C-005-overCap'), 'You have paid £8,350,000 against a cap of £5,000,000. That is 167.0% of the cap, £3,350,000 over.');
  assert.equal(why('F-C-007-overCap'), 'You have paid £6,160,000 against a cap of £5,400,000. That is 114.1% of the cap, £760,000 over. £780,000 of this was paid after the contract ended on 30 April 2026.');
  assert.equal(why('F-C-011-overCap'), 'In contract year 2 you paid £512,000 against an annual cap of £450,000, £62,000 over.');
  assert.equal(why('F-C-001-nearCap'), 'You have used 94.8% of the cap. At the pace of the last 12 months, spend reaches £12,642,478 by 31 March 2027, £642,478 over the cap.');
  assert.equal(why('F-C-004-uplift'), 'Payments rose 12.1% year on year. The contract caps price increases at 3.0%. That is £188,200 more than the cap allows if volumes stayed flat. Volume changes may explain part of this.');
  assert.equal(why('F-C-018-renewal'), 'No notice period is stated in this contract. We used the end date (28 February 2027) as the action date. This relies on an answer Kontor is not sure about: notice period. Check the clause first.');
  assert.equal(why('F-C-009-nearCap'), 'You have used 89.1% of the cap. At the pace of the last 12 months, spend stays within the cap until the contract ends on 31 March 2027.');
  assert.equal(why('F-C-003-renewal'), Copy.actionLine(C('C-003'), base.derived['C-003']));
  // partial coverage appends the data-window sentence (C-003, C-016 and C-018 start before the spend files)
  const part = { type: 'overCap', capState: 'over', indicativeGBP: 100, confidence: 'high' };
  assert.ok(Copy.reasonFor(part, C('C-003'), { spend: { coverage: 'partial', coverageFrom: '2022-04-01', afterEndGBP: 0 }, cap: { basis: 'total_term', spendAgainstCap: 1000, capGBP: 900, utilisation: 1.11 } }).endsWith(' Spend files start on 1 April 2022, so the real figure may be higher.'));
  assert.equal(Copy.COPY.partialCoverageNote('2022-04-01'), 'Spend files start on 1 April 2022, so spend before that date is not counted. Utilisation may be higher.');
  assert.equal(Copy.watchNote(), 'Indicative value £0. Not counted in the total.');
  const confirmed = run({ 'Larchmont Grounds Maintenance': 'confirm' }); const f9 = confirmed.flags.find((f) => f.id === 'F-C-009-overCap');
  assert.equal(f9.indicativeGBP, 60000); assert.equal(Copy.reasonFor(f9, C('C-009'), confirmed.derived['C-009']), 'You have paid £2,260,000 against a cap of £2,200,000. That is 102.7% of the cap, £60,000 over.');
  assert.equal(f9.confidence, 'high'); assert.equal(f9.confidenceField, 'maximumValue'); // a match you confirmed counts as certain, so the flag does not say Needs review about it
  assert.equal(confirmed.matches.get('Larchmont Grounds Maintenance').score, 0.73); // the similarity score is still shown on the matches tab
  // multiple annual years over the cap
  const multi = { type: 'overCap', capState: 'over', indicativeGBP: 100000, confidence: 'high' };
  assert.equal(Copy.reasonFor(multi, C('C-011'), { spend: { byYear: [{ year: 1, spendGBP: 430000 }, { year: 2, spendGBP: 500000 }, { year: 3, spendGBP: 550000 }], afterEndGBP: 0 }, cap: { basis: 'annual', capGBP: 450000 } }), 'In contract years 2 and 3 you paid £1,050,000 against an annual cap of £450,000 a year, £100,000 over.');
  assert.equal(Copy.confidenceReason(base.flags.find((f) => f.id === 'F-C-018-renewal')), 'Relies on an answer Kontor is not sure about: notice period (0.58). Check the clause first.');
  assert.equal(Copy.confidenceReason(base.ranked[0]), 'Every answer and supplier match this relies on is high confidence.');
});

t('copy golden strings: R49 answers in plain language (7.10) and labels', () => {
  const a = (id) => Copy.answerFor(X(id), C(id.split('-').slice(1, 3).join('-')));
  const T = (id) => a(id).text;
  assert.equal(T('X-C-005-maximumValue'), '£5,000,000 for the whole term (stated maximum)'); assert.equal(T('X-C-011-maximumValue'), '£450,000 per contract year (stated maximum)');
  assert.equal(T('X-C-003-maximumValue'), 'No maximum stated. We used the contract value (£49,600,000).'); assert.equal(a('X-C-003-maximumValue').kind, 'not_found');
  assert.equal(T('X-C-018-noticePeriod'), 'Not found. We used the end date as the action date.'); assert.equal(X('X-C-018-noticePeriod').confidence, 0.58); assert.equal(Copy.confidenceBand(0.58), 'review'); assert.equal(Copy.confidenceLabel(0.58), 'Needs review');
  assert.equal(T('X-C-001-estimatedAnnualValue'), '£2,400,000 a year (estimated)'); assert.equal(T('X-C-001-awardedTotalValue'), '£12,000,000 over the initial term (estimated)');
  assert.equal(T('X-C-001-startDate'), '1 April 2022'); assert.equal(T('X-C-001-endDate'), '31 March 2027 (end of the current term)');
  assert.equal(T('X-C-001-extensions'), "Two extensions of 12 months each, at the council's option"); assert.equal(T('X-C-002-extensions'), 'One extension of 24 months, by agreement of both parties'); assert.equal(T('X-C-005-extensions'), 'No extension option'); assert.equal(T('X-C-009-extensions'), "One extension of 12 months, at the council's option");
  assert.equal(T('X-C-001-noticePeriod'), "6 months' notice before the end of the term"); assert.equal(T('X-C-017-noticePeriod'), "30 days' notice");
  assert.equal(T('X-C-003-autoRenewal'), 'Renews automatically for 12 months unless you give notice'); assert.equal(T('X-C-001-autoRenewal'), 'Does not renew automatically');
  assert.equal(T('X-C-001-indexation'), 'Reviewed each 1 April by CPI. Increases capped at 3.0%.'); assert.equal(T('X-C-011-indexation'), 'Reviewed each 1 April by CPI. No cap stated.'); assert.equal(T('X-C-005-indexation'), 'Prices are fixed for the term.'); assert.equal(T('X-C-012-indexation'), 'Reviewed each 1 September by RPI. Increases capped at 4.5%.');
  assert.equal(T('X-C-001-paymentTerms'), '30 days from receipt of a valid invoice'); assert.equal(T('X-C-014-paymentTerms'), '14 days from receipt of a valid invoice');
  assert.equal(T('X-C-001-serviceCredits'), '2% of the monthly charge for each missed KPI, up to 10% of the monthly charge'); assert.equal(T('X-C-005-serviceCredits'), 'No service credits');
  assert.equal(T('X-C-001-terminationForConvenience'), "You can end this contract early on 6 months' notice"); assert.equal(T('X-C-006-terminationForConvenience'), 'Neither party can end this contract early without cause');
  assert.equal(T('X-C-001-exitFees'), 'Unamortised mobilisation costs, reducing monthly over the Initial Term'); assert.equal(T('X-C-002-exitFees'), 'No exit fees stated');
  const rc = a('X-C-001-rateCard'); assert.equal(rc.rows.length, 3); assert.deepEqual(rc.rows[0], { item: 'Operative', unit: 'per hour', rate: '£19.40' }); assert.match(rc.text, /^Operative £19\.40 per hour; /);
  // C-005: 14 answered fields across 9 question groups, each with a page
  const c5 = est.extractionsByContract['C-005']; assert.equal(c5.length, 14); assert.equal(new Set(c5.map((x) => x.questionId)).size, 9); assert.ok(c5.every((x) => x.status === 'found' && x.provenance[0].page > 0)); assert.deepEqual(c5.map((x) => x.questionId), ['Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q3', 'Q4', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q9']);
  assert.equal(Copy.upliftResultText(base.derived['C-004'].uplift), 'Payments rose 12.1% against a cap of 3.0%'); assert.equal(Copy.upliftResultText(base.derived['C-001'].uplift), '2.7% against a cap of 3.0%'); assert.equal(Copy.upliftResultText(base.derived['C-003'].uplift), '4.4% against a cap of 4.0%. Within tolerance');
  assert.equal(Copy.upliftResultText(base.derived['C-009'].uplift), 'Payments fell 53.7%'); assert.equal(Copy.upliftResultText(base.derived['C-005'].uplift), 'Cannot test: Prices are fixed for the term, so there is no index to test'); assert.equal(Copy.upliftResultText(base.derived['C-011'].uplift), 'Cannot test: No index cap stated in the contract'); assert.equal(Copy.upliftResultText(base.derived['C-019'].uplift), 'Cannot test: Fewer than 24 months of payments in the contract term');
  assert.deepEqual(['high', 'medium', 'review', 'review'].map((b) => Copy.confidenceLabel(b)), ['High confidence', 'Medium confidence', 'Needs review', 'Needs review']); assert.equal(Copy.confidenceLabel('low'), 'Needs review');
  assert.deepEqual([0.9, 0.8999, 0.75, 0.7499].map(Copy.confidenceBand), ['high', 'medium', 'medium', 'review']);
  assert.deepEqual(['overCap', 'nearCap', 'renewal', 'uplift'].map(Copy.flagTypeLabel), ['Spend over cap', 'Close to cap', 'Renewal decision', 'Price increase above cap']);
  assert.deepEqual(['one_off', 'projected', 'per_year'].map((b) => Copy.basisLabel(b)), ['Already paid', 'Projected at the current pace', 'Per year']); assert.equal(Copy.basisLabel(base.ranked[0]), 'Already paid');
  assert.deepEqual(['to_investigate', 'under_review', 'explained', 'not_an_issue'].map(Copy.reviewStatusLabel), ['To investigate', 'Under review', 'Explained', 'No action']);
  assert.deepEqual(['auto_accepted', 'suggested', 'unmatched', 'confirmed', 'rejected'].map(Copy.matchStatusLabel), ['Accepted', 'Suggested', 'Unmatched', 'Confirmed by you', 'Rejected by you']);
  assert.deepEqual(['exact', 'normalised', 'alias', 'fuzzy', 'manual'].map(Copy.matchMethodLabel), ['Exact', 'Normalised', 'Alias', 'Similar name', 'Confirmed by you']);
  assert.deepEqual(['m3', 'm6', 'm12', 'passed', 'ended', 'later'].map(Copy.bandLabel), ['Next 3 months', '3 to 6 months', '6 to 12 months', 'Notice date passed', 'Ended, still paying', 'Later than 12 months']);
  assert.deepEqual([C('C-005').cap, C('C-003').cap].map(Copy.capSourceLabel), ['Stated maximum', 'Contract value (no maximum stated)']); assert.deepEqual([C('C-005').cap, C('C-011').cap].map(Copy.capBasisLabel), ['Whole term', 'Per contract year']);
  assert.equal(Fmt.fmtDate('2026-10-06'), '6 Oct 2026'); assert.equal(Fmt.fmtDateLong('2026-10-06'), '6 October 2026'); assert.equal(Fmt.fmtDate(null), ''); assert.equal(Fmt.fmtGBPPence(63012.4), '£63,012.40'); assert.equal(Fmt.fmtPct(0.948), '94.8%'); assert.equal(Fmt.fmtGBP(3350000), '£3,350,000');
  assert.equal(Copy.COPY.closePanel.heading, "This is one council's contracts and spend. Imagine your full estate."); assert.equal(Copy.COPY.about.sections[2].body.includes('starts after document ingestion: every answer is shown as already extracted.'), true);
  assert.ok(!JSON.stringify(Copy.COPY.about).includes('without a developer') && !/columns councils publish|follow the columns/.test(JSON.stringify(Copy.COPY.about))); assert.equal(Copy.COPY.about.sections[1].body.includes('look like the files councils publish for payments over £500: date, department, supplier, purpose and amount'), true);
  assert.ok(!/1\.7m/.test(JSON.stringify(Copy.COPY.caveat))); assert.equal(Copy.COPY.caveat.chartTooltip, 'An opportunity to investigate, not a confirmed result');
  assert.equal(Copy.COPY.method.find((m) => m.id === 'indicative').lead.startsWith('5% is a prototype assumption'), true); assert.equal(Copy.COPY.method.find((m) => m.id === 'radar').lead, 'Next 3 months runs to 6 January 2027, 3 to 6 months to 6 April 2027, and 6 to 12 months to 6 October 2027. A contract whose notice date has already passed is shown first, because nobody may be tracking it.');
  assert.equal(Copy.COPY.matching.body.includes('0.90 or more is accepted, 0.70 to 0.89 is suggested'), true);
  const steps = Copy.demoSteps(est); assert.equal(steps.length, 4); assert.equal(steps[0].text, 'Start with the number: £6.1m across 15 contracts flagged as opportunities to investigate. Point at the caveat and say why it is there.');
  assert.equal(steps[2].text, 'Open the Highways reactive maintenance flag. £8.4m has been paid against a £5.0m maximum. Click View clause and land on clause 14.3, page 23.'); assert.equal(steps[3].link.action, 'feedback'); assert.equal(Copy.presenterNotes(est).length, 4); assert.match(Copy.presenterNotes(est)[0], /15 of 24 contracts \(62\.5%\)/);
});

/* ---- copy lint */
t('copy lint: no "!", no emoji, "saving" only where allowed, no banned button labels', () => {
  const strings = []; // [path, text]
  const walk = (v, p) => { if (typeof v === 'string') strings.push([p, v]); else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`); };
  const COPY = Copy.COPY;
  // function-valued entries are called with representative arguments
  const fnSamples = { 'COPY.dataWindowNote': [D.council], 'COPY.partialCoverageNote': ['2022-04-01'], 'COPY.noContract.intro': [8, 23830000], 'COPY.empty.opportunitiesNoMatch.body': [19], 'COPY.empty.contractsNoMatch.title': ['zzz'], 'COPY.toasts.inert': ['Chat'], 'COPY.buttons.viewClausePage': [23], 'COPY.pages.contracts.subtitle': [24], 'COPY.pages.contractDetail.subtitle': [C('C-005')], 'COPY.pages.source.subtitle': [C('C-005'), 23, 70] };
  const walkFn = (o, p) => { for (const [k, v] of Object.entries(o)) { const pp = `${p}.${k}`; if (typeof v === 'function') { if (fnSamples[pp]) walk(v(...fnSamples[pp]), pp); else if (!['COPY.demoSteps', 'COPY.presenterNotes'].includes(pp)) throw new Error('lint: no sample arguments for ' + pp); } else if (v && typeof v === 'object' && !Array.isArray(v)) walkFn(v, pp); else walk(v, pp); } };
  walkFn(COPY, 'COPY');
  walk(Copy.demoSteps(est), 'COPY.demoSteps'); walk(Copy.demoExtras, 'COPY.demoExtras'); walk(Copy.presenterNotes(est), 'COPY.presenterNotes');
  walk(roadmap, 'roadmap'); walk(evidence, 'evidence'); walk(Reasons.reasons, 'reasons'); walk([Reasons.REASONS_HEADING, Reasons.REASONS_INTRO], 'reasons.heading');
  // generated copy over the whole estate in several scenarios
  const scen = [run(), run({ 'Larchmont Grounds Maintenance': 'confirm' }), run({}, {}, { nearCapThreshold: 0.8 })];
  for (const r of scen) {
    for (const f of r.flags) { const c = C(f.contractId); walk(Copy.reasonFor(f, c, r.derived[c.id]), 'gen.reason'); walk(Copy.flagTypeLabel(f), 'gen.type'); walk(Copy.basisLabel(f), 'gen.basis'); walk(Copy.confidenceReason(f), 'gen.confidence'); }
    for (const c of D.contracts) { walk(Copy.actionLine(c, r.derived[c.id]), 'gen.action'); const n = Copy.needsAttentionText(c, r.derived[c.id]); if (n) walk(n, 'gen.attention'); walk(Copy.capStateLabel(r.derived[c.id].cap), 'gen.cap'); walk(Copy.upliftResultText(r.derived[c.id].uplift), 'gen.uplift'); walk(Copy.relativeText(r.derived[c.id].deadline), 'gen.rel'); }
    walk(Copy.headlineSentence(r.totals), 'gen.headline'); walk(Copy.sumLine(r.totals), 'gen.sum'); walk(Copy.breakdownCards(r.totals), 'gen.cards');
  }
  for (const x of D.extractions) walk(Copy.answerFor(x, C(x.contractId)).text, 'gen.answer');
  const allowSaving = (p) => /^(COPY\.caveat|COPY\.method|COPY\.evidenceStrip|COPY\.presenterNotes|roadmap|evidence|reasons)/.test(p);
  const emoji = /\p{Extended_Pictographic}/u;
  let n = 0;
  for (const [p, s] of strings) {
    n++;
    assert.ok(!s.includes('!'), `"!" in ${p}: ${s}`); assert.ok(!emoji.test(s), `emoji in ${p}: ${s}`);
    if (!allowSaving(p)) assert.ok(!/\bsavings?\b/i.test(s), `"saving" in ${p}: ${s}`);
    assert.ok(!/ {2,}|^\s|\s$| ,| \./.test(s) || p.startsWith('roadmap.stages.columns'), `spacing in ${p}: "${s}"`);
    assert.ok(!/\b(Click here|Learn more|Submit)\b/.test(s), `banned label in ${p}`);
  }
  assert.ok(n > 1500, `only ${n} strings linted`);
  console.log(`     ${n} strings linted`);
  for (const [k, v] of Object.entries(COPY.buttons)) { const s = typeof v === 'function' ? v(23) : v; assert.ok(!['OK', 'Submit', 'Click here', 'Learn more'].includes(s), k); assert.ok(/^[A-Z]/.test(s)); }
  assert.equal(Reasons.REASONS_HEADING, 'Reasons this may not be a saving');
});

/* ---- estate */
t('estate pipeline: computeEstate matches the engine, lookups and payment traceability', () => {
  assert.equal(est.totals.totalGBP, 6145238); assert.equal(est.totals.contractCount, 15); assert.equal(est.ranked.length, 19); assert.equal(est.watch.length, 2); assert.equal(est.asOf, '2026-10-06');
  assert.equal(JSON.stringify(est.flags), JSON.stringify(base.flags)); assert.equal(JSON.stringify(est.totals), JSON.stringify(base.totals));
  assert.equal(Object.keys(est.contractsById).length, 24); assert.equal(Object.keys(est.extractionsById).length, 336); assert.equal(Object.keys(est.flagsById).length, base.flags.length); assert.equal(est.flagsById['F-C-005-overCap'].indicativeGBP, 3350000);
  assert.ok(est.matchList.every((m, i, a) => i === 0 || a[i - 1].totalGBP >= m.totalGBP)); assert.equal(est.matchList[0].rawName, 'Quillon Waste Services Ltd'); assert.equal(est.matchList.length, est.matches.size); assert.ok(est.matchList.some((m) => m.rawName === 'Dunmoor Agency Staffing Ltd' && m.status === 'unmatched' && m.totalGBP === 9300000)); assert.equal(est.matchList.find((m) => m.status === 'suggested').rawName, 'Larchmont Grounds Maintenance');
  assert.equal(est.coverage.linkedGBP, 129359000);
  assert.equal(est.capRows.length, 24); assert.deepEqual(est.capRows.slice(0, 6).map((r) => [r.contractId, (r.utilisation * 100).toFixed(1), r.capState]), [['C-005', '167.0', 'over'], ['C-007', '114.1', 'over'], ['C-011', '113.8', 'over'], ['C-001', '94.8', 'near'], ['C-017', '90.8', 'near'], ['C-009', '89.1', 'near']]); // R37 first rows
  // R38: the payments behind a spend figure reconcile to the penny, with payments after the end date listed separately
  const p7 = Estate.paymentsFor(est, 'C-007'); assert.equal(p7.afterEnd.length, 5); assert.equal(p7.afterEndGBP, 780000); assert.equal(p7.totalGBP, est.summaries['C-007'].toDate); assert.equal(p7.all.length, p7.inTerm.length + p7.afterEnd.length);
  const p5 = Estate.paymentsFor(est, 'C-005'); assert.equal(p5.totalGBP, 8350000); assert.equal(p5.afterEnd.length, 0); assert.equal(p5.totalGBP, est.derived['C-005'].spend.toDate);
  for (const c of D.contracts) assert.equal(Estate.paymentsFor(est, c.id).totalGBP, est.summaries[c.id].toDate, c.id);
  assert.equal(Estate.paymentsFor(est, 'C-nope').totalGBP, 0);
  // scenarios through the same entry point the provider uses
  assert.equal(Estate.computeEstate({ decisions: { 'Larchmont Grounds Maintenance': 'confirm' } }).totals.totalGBP, 6205238); assert.equal(Estate.computeEstate({ triage: { 'F-C-005-overCap': 'explained' } }).totals.totalGBP, 2795238); assert.equal(Estate.computeEstate({ assumptions: { renewalRate: 0.08 } }).totals.totalGBP, 6790538);
  assert.equal(Estate.computeEstate({ assumptions: { nearCapThreshold: 0.8 } }).watch.some((f) => f.id === 'F-C-004-nearCap'), true); assert.equal(Estate.computeEstate({ assumptions: { nearCapThreshold: 0.9 } }).watch.some((f) => f.id === 'F-C-009-nearCap'), false);
  const confirmed = Estate.computeEstate({ decisions: { 'Larchmont Grounds Maintenance': 'confirm' } }); assert.equal(confirmed.derived['C-009'].cap.capState, 'over'); assert.equal(confirmed.matches.get('Larchmont Grounds Maintenance').status, 'confirmed'); assert.equal(confirmed.watch.some((f) => f.contractId === 'C-009'), false);
  assert.equal(Estate.computeEstate({ decisions: { 'Larchmont Grounds Maintenance': 'reject' } }).matches.get('Larchmont Grounds Maintenance').status, 'rejected');
  assert.deepEqual(Estate.computeEstate().totals, Estate.computeEstate().totals); // pure
  assert.deepEqual(Estate.computeEstate({}).ranked.map((f) => f.id), Estate.computeEstate().ranked.map((f) => f.id));
  assert.equal(Estate.handcheckSummary({ handcheck: { 'X-C-005-maximumValue': 'correct', 'X-C-001-endDate': 'incorrect', 'X-nope': 'correct' } }).checked, 2); assert.equal(Estate.handcheckSummary({ handcheck: {} }).total, 336); assert.equal(Copy.handcheckLine(2, 336), '2 of 336 answers checked by hand');
  assert.deepEqual(Estate.ASSUMPTION_OPTIONS, { renewalRate: [0.03, 0.05, 0.08], nearCapThreshold: [0.8, 0.85, 0.9] });
});

t('persistence is resilient: blocked storage, corrupt JSON and wrong shapes never throw', () => {
  const K = { triage: 'kontor-triage', matches: 'kontor-matches', assumptions: 'kontor-assumptions', handcheck: 'kontor-handcheck', feedback: 'kontor-feedback' };
  const empty = { triage: {}, decisions: {}, assumptions: {}, handcheck: {}, feedback: [] };
  assert.deepEqual(Estate.EMPTY_STATE, empty);
  assert.deepEqual(Estate.readPersisted({ getJSON() { throw new Error('SecurityError: localStorage is blocked'); } }), empty); // storage throws
  assert.deepEqual(Estate.readPersisted({ getJSON: (k, f) => f }), empty); // nothing stored
  assert.deepEqual(Estate.readPersisted(), empty); // default io in plain node (no window): falls back, never throws
  const wrong = { [K.triage]: ['x'], [K.matches]: 'corrupt', [K.assumptions]: 7, [K.handcheck]: null, [K.feedback]: { a: 1 } };
  assert.deepEqual(Estate.readPersisted({ getJSON: (k, f) => (k in wrong ? wrong[k] : f) }), empty); // wrong shapes
  const junk = { [K.triage]: { 'F-C-005-overCap': 'explained', 'F-X': 'bogus', 'F-C-001-renewal': 'to_investigate', 'F-C-003-renewal': 'under_review' }, [K.matches]: { 'Larchmont Grounds Maintenance': 'confirm', a: 'maybe' }, [K.assumptions]: { renewalRate: 0.08, nearCapThreshold: 'x', other: 1, renewalRate2: 3 }, [K.handcheck]: { 'X-C-005-maximumValue': 'correct', 'X-nope': 'correct', 'X-C-001-endDate': 'maybe' }, [K.feedback]: [{ at: '2026-10-06T10:00:00.000Z', answer: 'yes', comment: 'Useful' }, { answer: 'bogus' }, 'x'] };
  const got = Estate.readPersisted({ getJSON: (k, f) => (k in junk ? junk[k] : f) });
  assert.deepEqual(got.triage, { 'F-C-005-overCap': 'explained', 'F-C-003-renewal': 'under_review' }); assert.deepEqual(got.decisions, { 'Larchmont Grounds Maintenance': 'confirm' }); assert.deepEqual(got.assumptions, { renewalRate: 0.08 }); assert.deepEqual(got.handcheck, { 'X-C-005-maximumValue': 'correct' });
  assert.deepEqual(got.feedback, [{ at: '2026-10-06T10:00:00.000Z', answer: 'yes', comment: 'Useful', asOf: '2026-10-06' }]);
  assert.equal(Estate.sanitiseFeedback(Array.from({ length: 80 }, () => ({ answer: 'no' }))).length, 50);
  assert.equal(Estate.sanitiseAssumptions({ renewalRate: 9 }).renewalRate, undefined); assert.equal(Estate.sanitiseAssumptions({ nearCapThreshold: 0.2 }).nearCapThreshold, undefined); assert.equal(Estate.sanitiseAssumptions({ renewalRate: NaN }).renewalRate, undefined);
  // a hostile stored state still produces a valid estate
  const e = Estate.computeEstate({ decisions: got.decisions, triage: got.triage, assumptions: got.assumptions }); assert.ok(e.totals.totalGBP > 0);
  assert.equal(typeof Estate.EstateProvider, 'function'); assert.equal(typeof Estate.useEstate, 'function');
});

/* ---- static data modules */
t('evidence.js: all nine cases verbatim from the spec', () => {
  const spec = fs.readFileSync(path.join(root, 'docs/spec.md'), 'utf8');
  const rows = spec.slice(spec.indexOf('| Case | When |')).split('\n').slice(2, 11).map((r) => r.split('|').slice(1, -1).map((x) => x.trim()));
  assert.equal(rows.length, 9); assert.equal(evidence.length, 9);
  rows.forEach(([c, when, what, feature], i) => {
    const m = /^\[(.+)\]\((.+)\)$/.exec(c); const e = evidence[i];
    assert.equal(e.case, m[1]); assert.equal(e.url, m[2]); assert.equal(e.when, when); assert.equal(e.whatHappened, what); assert.equal(e.feature, feature); assert.equal(e.checkedOn, '2026-10-06');
    assert.ok(/^https:\/\//.test(e.url)); assert.ok(e.featureLinks.length >= 1 && e.featureLinks.every((l) => l.href.startsWith('#/')));
  });
  assert.equal(CHECKED_ON, '2026-10-06'); assert.deepEqual(evidence.filter((e) => e.featured).map((e) => e.case), ['Haringey', 'Guildford', 'Edinburgh']); assert.equal(new Set(evidence.map((e) => e.id)).size, 9);
  assert.ok(!evidence.some((e) => /Kontor|Marchbank/.test(e.whatHappened)));
});

t('roadmap.js: spec wording is verbatim and the status table is complete', () => {
  const spec = fs.readFileSync(path.join(root, 'docs/spec.md'), 'utf8').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '');
  const inSpec = (s) => assert.ok(spec.includes(s), 'not in spec: ' + s);
  roadmap.stage2.steps.forEach(inSpec); roadmap.stage2.illustrative.rows.flat().forEach((c) => inSpec(c)); inSpec(roadmap.stage2.illustrative.workedExample); inSpec(roadmap.stage2.illustrative.intro); inSpec(roadmap.stage2.intro); inSpec(roadmap.stagesClosing); inSpec(roadmap.stagesIntro); inSpec(roadmap.notYetIntro);
  for (const w of roadmap.stage2.why) inSpec(`${w.title} ${w.text}`.replace(/\(LGA\/Audit Commission\)/, '(LGA/Audit Commission)'));
  for (const w of roadmap.who) inSpec(`${w.title} ${w.text}`); for (const w of roadmap.mustBeTrue) inSpec(`${w.title} ${w.text}`); for (const w of roadmap.dataSources) inSpec(`${w.title} ${w.text}`.replace('Contracts: under', 'Contracts: under'));
  for (const r of roadmap.stages.rows) r.forEach(inSpec); for (const m of roadmap.mustHaves) { inSpec(m.does); inSpec(m.why); }
  roadmap.statusRows.slice(4).forEach((r) => { inSpec(r.feature); inSpec(r.needs); });
  assert.equal(roadmap.statusRows.length, 10); assert.deepEqual(roadmap.statusRows.map((r) => r.badgeLabel), ['Built in this prototype', 'Built in this prototype', 'Built in this prototype', 'Built in this prototype', 'Built in this prototype', 'Stage 2', 'Not yet', 'Not yet', 'Not yet', 'Not yet']);
  assert.ok(roadmap.statusRows.filter((r) => r.status !== 'built').every((r) => r.notInPrototype === true)); assert.ok(roadmap.statusRows.filter((r) => r.status === 'built').every((r) => !r.notInPrototype));
  assert.equal(roadmap.statusRows.find((r) => r.id === 'uplift-check').badgeLabel, 'Built in this prototype');
  assert.equal(roadmap.stage2.formula.plain, 'Net saving = (current annual cost − group annual cost) × years remaining − exit cost − switching cost'); assert.equal(roadmap.stage2.illustrative.label, 'Illustrative numbers, made up to show the logic, not real data');
  assert.equal(roadmap.stage2.steps.length, 6); assert.equal(roadmap.who.length, 3); assert.equal(roadmap.mustBeTrue.length, 4); assert.equal(roadmap.dataSources.length, 3); assert.equal(roadmap.stage2.why.length, 3); assert.equal(roadmap.mustHaves.length, 4);
  assert.ok(roadmap.dataSources[0].text.includes('24 February 2025')); assert.ok(roadmap.dataSources[0].links[0].url.startsWith('https://gov.wales/'));
  assert.ok(roadmap.dataSources.concat(roadmap.who, roadmap.stage2.why).every((x) => x.links.every((l) => /^https:\/\//.test(l.url))));
});

t('reasons.js: Sefton-style caution, no unverified numbers, a list for every flag type', () => {
  const keys = ['overCap', 'aboveEstimate', 'nearCap', 'uplift', 'renewal', 'noticePassed', 'outOfContract', 'noContract'];
  assert.deepEqual(Object.keys(Reasons.reasons), keys);
  for (const k of keys) { const list = Reasons.reasons[k]; assert.ok(list.length >= 3 && list.length <= 6, k); assert.equal(new Set(list.map((r) => r.id)).size, list.length); for (const r of list) { assert.ok(r.text.endsWith('.'), r.text); assert.ok(!/\d/.test(r.text.replace(/\blast 12 months\b|\b12-month\b/, '')), `number in ${k}/${r.id}`); assert.ok(!/UK1\d|%|£/.test(r.text)); } }
  for (const f of base.flags) { const r = Reasons.reasonsFor(f); assert.equal(r.heading, 'Reasons this may not be a saving'); assert.ok(r.items.length >= 3, f.id); }
  assert.equal(Reasons.reasonKey(base.flags.find((f) => f.id === 'F-C-007-renewal')), 'outOfContract'); assert.equal(Reasons.reasonKey(base.flags.find((f) => f.id === 'F-C-001-renewal')), 'noticePassed'); assert.equal(Reasons.reasonKey(base.flags.find((f) => f.id === 'F-C-003-renewal')), 'renewal');
  assert.equal(Reasons.reasonKey(base.flags.find((f) => f.id === 'F-C-004-uplift')), 'uplift'); assert.equal(Reasons.reasonKey('noContract'), 'noContract'); assert.equal(Reasons.reasonsFor('noContract').items.length, 3);
});

t('R12: real councils appear only where allowed (evidence, method rationale, roadmap, presenter notes), never in the sample data', () => {
  const real = /\b(Exeter|Haringey|Guildford|Edinburgh|Gedling|Windsor|Maidenhead|Brighton|Hove|Sefton|Sheffield|Camden|Enfield)\b/;
  assert.ok(!real.test(JSON.stringify(D)), 'sample.json mentions a real council');
  assert.ok(D.suppliers.every((x) => x.isFictional === true)); assert.equal(new Set(D.suppliers.map((x) => x.legalName)).size, 24);
  const strings = []; const walk = (v, p) => { if (typeof v === 'string') strings.push([p, v]); else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (typeof x !== 'function') walk(x, `${p}.${k}`); };
  walk(Copy.COPY, 'COPY'); walk(Reasons.reasons, 'reasons'); walk(Copy.demoSteps(est), 'COPY.demoSteps'); walk(Copy.presenterNotes(est), 'COPY.presenterNotes');
  for (const [p, str] of strings) if (!/^(COPY\.method|COPY\.presenterNotes)/.test(p)) assert.ok(!real.test(str), `real council in ${p}: ${str}`);
  assert.ok(Copy.COPY.method.some((m) => /Sheffield/.test(m.lead))); assert.ok(Copy.presenterNotes(est).some((n) => /Sefton/.test(n)));
});

t('performance guard: the whole estate recomputes in well under 150 ms', () => {
  const t0 = performance.now(); for (let i = 0; i < 10; i++) Estate.computeEstate({ triage: { 'F-C-005-overCap': i % 2 ? 'explained' : 'under_review' } });
  const avg = (performance.now() - t0) / 10; assert.ok(avg < 150, `recompute took ${avg.toFixed(1)} ms`);
  console.log(`     recompute average ${avg.toFixed(1)} ms over 10 runs`);
});

console.log(`\n${groups - failed} of ${groups} groups passed, ${checks} checks`);
if (failed) { console.error(`${failed} group(s) FAILED`); process.exit(1); }
