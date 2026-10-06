// src/charts/adapters.js
// Engine output -> chart props. The charts never compute business rules: bands, states, flags and GBP come from the estate
// (src/lib/estate.js: computeEstate / useEstate().estate). These adapters only reshape it, and take the wording from src/lib/copy.js
// so a label is the same on every screen.
//
//   const { estate } = useEstate();
//   <HeadlineTile {...headlineProps(estate)} format={fmtGBPCompact} />
//   <RadarLanes rows={radarRows(estate, extraFor)} />            <BulletList items={capItems(estate, { extraFor })} />
//   <OpportunityList items={opportunityItems(estate, { clauseFor })} />
//   <CoverageBlock {...coverageProps(estate)} />                 <YearBars {...yearBarsProps(estate, 'C-011')} />
//   <CumulativeLine series={cumulativeSeries(estate, 'C-005')} cap={...} />
import { FLAG_ORDER } from './flags.js';
import { capBasisLabel, capSourceLabel, capStateLabel, flagTypeLabel, reasonFor, reviewStatusLabel } from '../lib/copy.js';

/** A flag counts toward the headline when it has value and is not reviewed away (mirrors the engine's isCounted). */
export const counted = (f) => f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review');

/** estate -> <HeadlineTile {...headlineProps(estate)} />. Uses the engine's totals, so the triage exclusions are already applied. */
export function headlineProps(estate) {
  const t = estate.totals;
  const byType = {};
  FLAG_ORDER.forEach((k) => { byType[k] = { value: (t.byType && t.byType[k]) || 0, count: (t.countByType && t.countByType[k]) || 0 }; });
  return { total: t.totalGBP, contractCount: t.contractCount, byType };
}

/**
 * Contracts on the renewal radar, as RadarLanes / RadarStrip rows, straight from estate.radar (the engine's bands and deadlines).
 * extraFor(row, contract, radarItem) -> node: stored as row.extra (or pass extraFor to <RadarLanes> instead).
 * Row: { id, title, supplier, band, deadline, endDate, value (annual contract value), autoRenew, usedEndDate, afterEndGBP, flagId, extra }
 */
export function radarRows(estate, extraFor) {
  const out = [];
  ['passed', 'ended', 'm3', 'm6', 'm12'].forEach((band) => {
    const g = estate.radar.groups[band];
    (g ? g.items : []).forEach((it) => {
      const c = estate.contractsById[it.contractId];
      const row = {
        id: c.id, title: c.title, supplier: c.supplierName, band, deadline: it.deadline, endDate: it.endDate, value: it.annualValueGBP || 0,
        autoRenew: !!(c.autoRenewal && c.autoRenewal.enabled), usedEndDate: !!it.usedEndDate, afterEndGBP: it.afterEndGBP, flagId: it.flagId,
      };
      if (extraFor) row.extra = extraFor(row, c, it);
      out.push(row);
    });
  });
  return out;
}

/**
 * Contracts with a testable cap, as BulletList items (the list sorts itself by share of cap).
 * Carries the cap basis, source and over-by, and the words from the copy deck ("Above contract value (estimate)" for an estimate).
 * extraFor(item, contract) -> node for the row's extra slot (ClauseLink on Over and Close rows, notes).
 */
export function capItems(estate, { extraFor } = {}) {
  return estate.capRows.map((cs) => {
    const c = estate.contractsById[cs.contractId];
    const item = {
      id: c.id, title: c.title, supplier: c.supplierName, cap: cs.capGBP, spend: cs.spendAgainstCap, state: cs.state, excess: cs.excessGBP,
      partial: estate.summaries[c.id].coverage === 'partial', basis: cs.basis, source: cs.source,
      stateLabel: capStateLabel(cs), basisLabel: capBasisLabel(cs), sourceLabel: capSourceLabel(cs),
    };
    if (extraFor) item.extra = extraFor(item, c);
    return item;
  });
}

/** Contracts whose price-increase check ran, as Dumbbell rows (flagged ones carry the engine's verdict). extraFor(row, contract) -> node. */
export function upliftRows(estate, { extraFor } = {}) {
  return estate.data.contracts.filter((c) => estate.derived[c.id].uplift.testable).map((c) => {
    const u = estate.derived[c.id].uplift;
    const row = { id: c.id, title: c.title, supplier: c.supplierName, cap: u.capPct, actual: u.yoy, flagged: u.flagged, excessGBP: u.excessGBP };
    if (extraFor) row.extra = extraFor(row, c);
    return row;
  });
}

/**
 * ALL ranked flags (open and reviewed) -> OpportunityList items, in the engine's rank order.
 * reasonFor(flag, contract, derived)  default: the copy deck's sentence (src/lib/copy.js reasonFor).
 * clauseFor(flag) -> { label: 'View clause, page 23', href } | null   from evidenceFor(flag) + ClauseLink wording.
 * extraFor(flag, contract) -> node   more links after the clause link.
 * statusLabels: 'changed' (default) puts the review-status pill on rows whose status is not "To investigate"; 'all' puts it on every row.
 * Item: { id, rank (overall), type, typeLabel, title, supplier, reason, value, basis, confidence, actionBy, status, statusLabel, clauseLabel, clauseHref, extra }
 */
export function opportunityItems(estate, { reasonFor: reason = reasonFor, clauseFor, extraFor, statusLabels = 'changed' } = {}) {
  return estate.ranked.map((f, i) => {
    const c = estate.contractsById[f.contractId];
    const cl = clauseFor ? clauseFor(f) : null;
    const status = f.status || 'to_investigate';
    return {
      id: f.id, rank: i + 1, type: f.type, typeLabel: flagTypeLabel(f), title: c.title, supplier: c.supplierName,
      reason: reason(f, c, estate.derived[c.id]), value: f.indicativeGBP, basis: f.basis, confidence: f.confidence, actionBy: f.actionBy,
      status, statusLabel: status !== 'to_investigate' || statusLabels === 'all' ? reviewStatusLabel(status) : null,
      clauseLabel: cl && cl.label, clauseHref: cl && cl.href, extra: extraFor ? extraFor(f, c) : undefined,
    };
  });
}

/** Count of flags per filter chip, over the items you pass: { all, overCap, nearCap, renewal, uplift }. */
export function opportunityCounts(items) {
  const c = { all: items.length, overCap: 0, nearCap: 0, renewal: 0, uplift: 0 };
  items.forEach((it) => { c[it.type] += 1; });
  return c;
}

/**
 * Attributed payments of one contract -> CumulativeLine series (month-end points).
 * The line starts at 0 on the LATER of the contract start and the first day of the spend files (estate.council.spendDataFrom), so a
 * contract that began before the files do not show an invented ramp; label such figures "At least" (R39).
 * The last point equals derived[id].spend.toDate.
 */
export function cumulativeSeries(estate, contractId) {
  const contract = estate.contractsById[contractId];
  const spendFrom = estate.council && estate.council.spendDataFrom;
  const byMonth = new Map();
  (estate.paymentsByContract[contractId] || []).forEach((a) => {
    const k = a.payment.date.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) || 0) + a.payment.amountGBP);
  });
  const first = spendFrom && spendFrom > contract.startDate ? spendFrom : contract.startDate;
  const out = [{ date: first, pay: 0, cum: 0 }];
  let cum = 0;
  [...byMonth.keys()].sort().forEach((k) => {
    const [y, m] = k.split('-').map(Number);
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    cum += byMonth.get(k);
    out.push({ date: end, pay: Math.round(byMonth.get(k)), cum: Math.round(cum) });
  });
  return out;
}

/** Spend per contract year of an annual-cap contract -> <YearBars {...yearBarsProps(estate, id)} />. */
export function yearBarsProps(estate, contractId) {
  const c = estate.contractsById[contractId];
  const s = estate.summaries[contractId];
  return {
    cap: c.cap.amountGBP,
    years: s.byYear.map((y) => ({ year: y.year, from: y.from, to: y.to, spend: y.spendGBP, partial: y.partial })),
  };
}

/**
 * estate.coverage -> <CoverageBlock {...coverageProps(estate, { noteFor })} />.
 * unmatched = the engine's noContractGBP (GBP 23,830,000 on the sample); pending = payments awaiting your match review.
 * noteFor(supplier) -> string: the second line under each supplier ("There is no contract to read, so there is no clause to link.").
 */
export function coverageProps(estate, { noteFor } = {}) {
  const cov = estate.coverage;
  return {
    total: cov.totalGBP, matched: cov.linkedGBP, unmatched: cov.noContractGBP, pending: cov.awaitingReviewGBP || 0,
    suppliers: cov.noContract.map((x) => {
      const m = estate.matches && estate.matches.get(x.name);
      const s = { id: x.name, name: x.name, spend: x.totalGBP, payments: m ? m.paymentCount : undefined };
      if (noteFor) s.note = noteFor(s);
      return s;
    }),
  };
}
