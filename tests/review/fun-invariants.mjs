// fun-invariants: property checks on computeEstate over every combination of renewal rate, near-cap threshold, match decisions and a spread of triage
// states (no browser, plain node). The numbers on every screen come from this one function, so an invariant that breaks here breaks everywhere.
//   node tests/review/fun-invariants.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, ok, eq, gold } from './fun-lib.mjs';

process.removeAllListeners('warning');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const Estate = await imp('src/lib/estate.js');
const E = await imp('src/lib/engine.js');
const Copy = await imp('src/lib/copy.js');
const t = new T('fun-invariants');

const RATES = [0.03, 0.05, 0.08];
const NEARS = [0.8, 0.85, 0.9];
const DECISIONS = [{}, { 'Larchmont Grounds Maintenance': 'confirm' }, { 'Larchmont Grounds Maintenance': 'reject' }];
const ALL = gold.ranked;
const TRIAGES = [{}, { 'F-C-005-overCap': 'explained' }, { 'F-C-005-overCap': 'under_review' }, { 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'not_an_issue', 'F-C-001-nearCap': 'explained' },
  Object.fromEntries(ALL.map((id) => [id, 'explained'])), Object.fromEntries(ALL.map((id, i) => [id, i % 2 ? 'under_review' : 'not_an_issue'])), { 'F-C-009-nearCap': 'explained' }];
const round2 = (x) => Math.round(x * 100) / 100;

let combos = 0; const bad = [];
for (const rate of RATES) for (const near of NEARS) for (const decisions of DECISIONS) for (const triage of TRIAGES) {
  combos += 1;
  const tag = `rate ${rate} near ${near} dec ${Object.values(decisions).join('') || '-'} triage ${Object.keys(triage).length}`;
  let e;
  try { e = Estate.computeEstate({ decisions, triage, assumptions: { renewalRate: rate, nearCapThreshold: near } }); } catch (x) { bad.push(`${tag}: threw ${x.message}`); continue; }
  const counted = e.ranked.filter((f) => E.isCounted(f));
  const sum = round2(counted.reduce((s, f) => s + f.indicativeGBP, 0));
  if (sum !== round2(e.totals.totalGBP)) bad.push(`${tag}: totals ${e.totals.totalGBP} != counted sum ${sum}`);
  const contracts = new Set(counted.map((f) => f.contractId)).size;
  if (contracts !== e.totals.contractCount) bad.push(`${tag}: contractCount ${e.totals.contractCount} != ${contracts}`);
  const byType = {}; counted.forEach((f) => { byType[f.type] = round2((byType[f.type] || 0) + f.indicativeGBP); });
  for (const ty of ['overCap', 'nearCap', 'renewal', 'uplift']) if (round2(e.totals.byType[ty] || 0) !== (byType[ty] || 0)) bad.push(`${tag}: byType ${ty} ${e.totals.byType[ty]} != ${byType[ty]}`);
  const typeSum = round2(Object.values(e.totals.byType).reduce((a, b) => a + b, 0));
  if (typeSum !== round2(e.totals.totalGBP)) bad.push(`${tag}: card values ${typeSum} do not add to the headline ${e.totals.totalGBP}`);
  const vals = e.ranked.map((f) => f.indicativeGBP);
  if (!vals.every((v, i) => i === 0 || vals[i - 1] >= v)) bad.push(`${tag}: ranked values not descending`);
  if (new Set(e.ranked.map((f) => f.id)).size !== e.ranked.length) bad.push(`${tag}: duplicate flag ids`);
  if (!e.watch.every((f) => f.indicativeGBP === 0)) bad.push(`${tag}: watch flag with value`);
  for (const f of [...e.ranked, ...e.watch]) {
    const last = f.breakdown && f.breakdown[f.breakdown.length - 1];
    if (!last || last.kind !== 'result' || round2(last.value) !== round2(f.indicativeGBP)) bad.push(`${tag}: ${f.id} breakdown last line ${last && last.value} != ${f.indicativeGBP}`);
    if (f.type !== 'renewal' && !(f.evidenceFields && f.evidenceFields.length)) bad.push(`${tag}: ${f.id} has no evidence field`);
  }
  const cov = e.coverage;
  if (round2(cov.linkedGBP + cov.noContractGBP + cov.awaitingReviewGBP) !== round2(cov.totalGBP)) bad.push(`${tag}: coverage ${cov.linkedGBP}+${cov.noContractGBP}+${cov.awaitingReviewGBP} != ${cov.totalGBP}`);
  const caps = e.capRows.map((r) => r.utilisation);
  if (!caps.every((v, i) => i === 0 || caps[i - 1] >= v)) bad.push(`${tag}: capRows not descending`);
  for (const r of e.capRows) { const want = r.utilisation > 1 ? 'over' : r.utilisation >= near ? 'near' : 'ok'; if (r.state !== want && !(r.state === 'above_estimate')) bad.push(`${tag}: ${r.contractId} util ${r.utilisation.toFixed(4)} state ${r.state} want ${want}`); }
  const g = Copy.headlineSentence(e.totals);
  if (/NaN|undefined|Infinity/.test(g + Copy.sumLine(e.totals) + (Copy.excludedNote(e.totals) || ''))) bad.push(`${tag}: NaN in headline copy: ${g}`);
  if (Object.keys(triage).length === 0 && near === 0.85 && rate === 0.05 && Object.keys(decisions).length === 0 && e.totals.totalGBP !== gold.total) bad.push('golden headline moved');
  // determinism
  const e2 = Estate.computeEstate({ decisions, triage, assumptions: { renewalRate: rate, nearCapThreshold: near } });
  if (JSON.stringify(e2.ranked.map((f) => [f.id, f.indicativeGBP])) !== JSON.stringify(e.ranked.map((f) => [f.id, f.indicativeGBP]))) bad.push(`${tag}: not deterministic`);
}
await t.check(`computeEstate invariants hold over ${combos} combinations (totals = counted sum, cards add to the headline, ranks descending, breakdown last line = value, coverage adds up, cap states follow the threshold, no NaN, deterministic)`, async () => { ok(bad.length === 0, bad.length + ' violations: ' + bad.slice(0, 6).join(' || ')); return combos + ' combinations'; });

await t.check('headline wording at the edges: 0 contracts, 1 contract, singular grammar and the compact formatter at rounding boundaries', async () => {
  eq(Copy.headlineSentence({ totalGBP: 0, contractCount: 0 }), '£0 across 0 contracts flagged as opportunities to investigate', 'zero: ' + Copy.headlineSentence({ totalGBP: 0, contractCount: 0 }));
  eq(Copy.headlineSentence({ totalGBP: 3350000, contractCount: 1 }), '£3.4m across 1 contract flagged as an opportunity to investigate', 'singular');
  const cases = [[999999, '£1.0m'], [950000, '£1.0m'], [949999, '£0.9m'], [8350000, '£8.4m'], [8349999, '£8.3m'], [0, '£0'], [500, '£500'], [1500000, '£1.5m'], [12000000, '£12.0m']];
  const out = cases.map(([n, w]) => [n, Copy.fmtGBPCompact(n), w]);
  const badc = out.filter(([, g, w]) => g !== w);
  ok(badc.length === 0, 'fmtGBPCompact: ' + JSON.stringify(badc));
});
await t.check('triage with every flag reviewed: the sum line and note do not print an empty or "£0 = £0" equation', async () => {
  const e = Estate.computeEstate({ triage: Object.fromEntries(ALL.map((id) => [id, 'explained'])) });
  t.note('sum line with everything reviewed', JSON.stringify(Copy.sumLine(e.totals)) + ' / note ' + JSON.stringify(Copy.excludedNote(e.totals)) + ' / headline ' + Copy.headlineSentence(e.totals));
  ok(Copy.sumLine(e.totals) !== '£0 = £0', 'sum line prints "£0 = £0"');
});

t.finish();
