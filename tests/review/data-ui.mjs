// Data review: scrape the rendered DOM route by route and assert equality with an independent recomputation
// (tests/review/data-engine.mjs, written from requirements section 5, no import of src/lib/engine.js).
//   node tests/review/data-ui.mjs [--only overview,opps,drawers,renewals]     (SCEN='confirm Larchmont,rate 8%' limits scenarios)
// Runs the default state first, then every scenario from requirements 6.6, each time re-reading every figure.
import { E, launch, seed, pageErrors } from './data-lib.mjs';
import { t0, verifyOverview, verifyOpps, verifyDrawers, verifyRenewals } from './data-verify.mjs';
const only = (() => { const i = process.argv.indexOf('--only'); return i === -1 ? null : process.argv[i + 1].split(','); })();
const want = (k) => !only || only.includes(k);
async function main() {
  const h = await launch();
  const t = await h.newPage({ theme: 'dark' });
  try {
    const scenarios = [
      { name: 'default', st: {} },
      { name: 'confirm Larchmont', st: { decisions: { 'Larchmont Grounds Maintenance': 'confirm' } } },
      { name: 'reject Larchmont', st: { decisions: { 'Larchmont Grounds Maintenance': 'reject' } } },
      { name: 'explain C-005 overCap', st: { triage: { 'F-C-005-overCap': 'explained' } } },
      { name: 'explain C-005 + no action C-007', st: { triage: { 'F-C-005-overCap': 'explained', 'F-C-007-overCap': 'not_an_issue' } } },
      { name: 'under review keeps counted', st: { triage: { 'F-C-005-overCap': 'under_review' } } },
      { name: 'rate 8%', st: { assumptions: { renewalRate: 0.08 } } },
      { name: 'rate 3%', st: { assumptions: { renewalRate: 0.03 } } },
      { name: 'nearCap 80%', st: { assumptions: { nearCapThreshold: 0.80 } } },
      { name: 'nearCap 90%', st: { assumptions: { nearCapThreshold: 0.90 } } },
      { name: 'combo confirm+8%+90%+explain', st: { decisions: { 'Larchmont Grounds Maintenance': 'confirm' }, assumptions: { renewalRate: 0.08, nearCapThreshold: 0.90 }, triage: { 'F-C-001-nearCap': 'explained' } } },
    ];
    const only2 = process.env.SCEN ? process.env.SCEN.split(',') : null;
    for (const sc of scenarios) {
      if (only2 && !only2.includes(sc.name)) continue;
      const e = E.compute({ decisions: sc.st.decisions || {}, triage: sc.st.triage || {}, assumptions: sc.st.assumptions || {} });
      await seed(t, sc.st);
      const tag = `[${sc.name}]`;
      console.log('--', sc.name, 'headline', e.totals.totalGBP, 'N', e.totals.contractCount);
      if (want('overview')) await verifyOverview(t, e, tag);
      if (want('opps')) await verifyOpps(t, e, tag);
      if (want('renewals')) await verifyRenewals(t, e, tag);
      if (want('drawers') && (sc.name === 'default' || sc.name === 'combo confirm+8%+90%+explain' || sc.name === 'rate 8%')) await verifyDrawers(t, e, tag);
    }
    t0.check('no console/page errors', () => { const er = pageErrors(t); if (er.length) throw new Error(er.slice(0, 5).join(' | ')); });
  } finally { await h.close(); }
  t0.finish();
}
main().catch((e) => { console.error(e); process.exit(2); });
