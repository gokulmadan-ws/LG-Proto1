// Kontor financial layer: engine (pure functions, no DOM, no clock, no imports).
// Everything derives from AS_OF, never from Date.now(). Reference implementation: research/work/ref/engine.mjs.
// Changes on top of the reference (none moves a golden number): capState / above_estimate semantics (blueprint decision 9),
// confidence one step lower for contract-value caps, weakest-field tracking, extra derived fields, extra totals, radar groups.
export const AS_OF = '2026-10-06';

export const DEFAULTS = {
  renewalRate: 0.05,        // indicative value of renegotiating or re-procuring: 5% of annual value
  nearCapThreshold: 0.85,   // utilisation >= 85% (and <= 100%) is "near cap"
  upliftTolerancePp: 0.01,  // payments must exceed the index cap by more than 1 percentage point
  upliftMinGBP: 10000,      // and the excess must be at least GBP 10,000
  autoAcceptScore: 0.90,    // supplier match score >= 0.90 is accepted without review
  suggestScore: 0.70,       // 0.70 to < 0.90 is shown as a suggestion and excluded until confirmed
};

/* ---------- dates (UTC, ISO strings) ---------- */
const MS = 86400000;
const toMs = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(toMs(iso) + n * MS);
export const addMonths = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return toIso(+first);
};
export const diffDays = (a, b) => Math.round((toMs(a) - toMs(b)) / MS); // a minus b
export const round2 = (x) => Math.round(x * 100) / 100;
export const round0 = (x) => Math.round(x);

/* ---------- notice deadline and radar band ---------- */
export function noticeDeadline(endDate, notice) {
  // notice = { value:number, unit:'days'|'months' } | null
  if (!endDate) return { date: null, usedEndDate: false };
  if (!notice || notice.value == null) return { date: endDate, usedEndDate: true }; // not stated: fall back to end date
  const date = notice.unit === 'months' ? addMonths(endDate, -notice.value) : addDays(endDate, -notice.value);
  return { date, usedEndDate: false };
}

export function radarBand(contract, asOf = AS_OF) {
  const { endDate } = contract;
  const dl = noticeDeadline(endDate, contract.notice).date;
  if (diffDays(endDate, asOf) < 0) return { band: 'ended', deadline: dl };
  if (diffDays(dl, asOf) < 0) return { band: 'passed', deadline: dl };
  if (dl <= addMonths(asOf, 3)) return { band: 'm3', deadline: dl };
  if (dl <= addMonths(asOf, 6)) return { band: 'm6', deadline: dl };
  if (dl <= addMonths(asOf, 12)) return { band: 'm12', deadline: dl };
  return { band: 'later', deadline: dl };
}

/* ---------- supplier name matching ---------- */
const SUFFIXES = ['limited', 'ltd', 'plc', 'llp', 'llc', 'inc', 'co', 'company', 'uk', 'group', 'holdings', 'the'];
const ABBREV = { svcs: 'services', svc: 'services', serv: 'services', maint: 'maintenance', mgmt: 'management', intl: 'international' };
export function normaliseName(raw) {
  let s = raw.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ');
  s = s.split(/\s+/).filter(Boolean).map((t) => ABBREV[t] || t).filter((t) => !SUFFIXES.includes(t));
  return s.join(' ').trim();
}
function bigrams(s) { const t = s.replace(/ /g, ''); const out = new Map(); for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); } return out; }
export function dice(a, b) {
  const A = bigrams(a), B = bigrams(b); let inter = 0, na = 0, nb = 0;
  for (const [g, c] of A) { na += c; if (B.has(g)) inter += Math.min(c, B.get(g)); }
  for (const c of B.values()) nb += c;
  return na + nb === 0 ? 0 : (2 * inter) / (na + nb);
}
// Score = Dice on character bigrams of the normalised names, capped at 0.99 so only exact/normalised/alias reach 0.95+.
export function matchSupplier(rawName, suppliers, aliasTable = {}) {
  const raw = rawName.trim();
  const norm = normaliseName(raw);
  for (const s of suppliers) if (s.legalName.toLowerCase() === raw.toLowerCase()) return { supplierId: s.id, score: 1.0, method: 'exact' };
  for (const s of suppliers) if (normaliseName(s.legalName) === norm) return { supplierId: s.id, score: 0.98, method: 'normalised' };
  if (aliasTable[norm]) return { supplierId: aliasTable[norm], score: 0.95, method: 'alias' };
  let best = { supplierId: null, score: 0, method: 'fuzzy' };
  for (const s of suppliers) { const sc = dice(norm, normaliseName(s.legalName)); if (sc > best.score) best = { supplierId: s.id, score: sc, method: 'fuzzy' }; }
  best.score = Math.min(0.99, Math.round(best.score * 100) / 100);
  return best;
}
export function matchStatus(m, opts = DEFAULTS) {
  if (m.method !== 'fuzzy') return 'auto_accepted';
  if (m.score >= opts.autoAcceptScore) return 'auto_accepted';
  if (m.score >= opts.suggestScore) return 'suggested';
  return 'unmatched';
}

/* ---------- build match table from payments ---------- */
export function buildMatches(payments, suppliers, aliasTable, decisions = {}, opts = DEFAULTS) {
  const byRaw = new Map();
  for (const p of payments) {
    const key = p.supplierNameRaw;
    if (!byRaw.has(key)) {
      const m = matchSupplier(key, suppliers, aliasTable);
      byRaw.set(key, { rawName: key, normalised: normaliseName(key), supplierId: m.supplierId, score: m.score, method: m.method, status: matchStatus(m, opts), paymentCount: 0, totalGBP: 0 });
    }
    const r = byRaw.get(key); r.paymentCount++; r.totalGBP = round2(r.totalGBP + p.amountGBP);
  }
  for (const r of byRaw.values()) {
    const d = decisions[r.rawName];
    if (d === 'confirm' && r.supplierId) { r.status = 'confirmed'; r.method = 'manual'; }
    if (d === 'reject') { r.status = 'rejected'; r.supplierId = null; }
    if (r.status === 'unmatched') r.supplierId = null; // below the suggestion threshold: treat as no contract on the register
  }
  return byRaw;
}
const accepted = (st) => st === 'auto_accepted' || st === 'confirmed';

/* ---------- attribute payments to contracts ---------- */
// matchScore feeds flag confidence. A match you confirmed yourself counts as certain (1.0): the name similarity is still shown on the matches tab, but
// a flag should not say "Needs review: supplier match" about a link you just checked.
export function attribute(payments, matches, contracts) {
  const bySupplier = new Map();
  for (const c of contracts) { if (!bySupplier.has(c.supplierId)) bySupplier.set(c.supplierId, []); bySupplier.get(c.supplierId).push(c); }
  const out = []; // { payment, supplierId, contractId, period }
  for (const p of payments) {
    const m = matches.get(p.supplierNameRaw);
    if (!m || !accepted(m.status)) { out.push({ payment: p, supplierId: null, contractId: null, period: 'unmatched', matchScore: m ? m.score : 0 }); continue; }
    const score = m.status === 'confirmed' ? 1 : m.score;
    const cs = bySupplier.get(m.supplierId) || [];
    const inRange = cs.filter((c) => p.date >= c.startDate && p.date <= c.endDate);
    if (inRange.length === 1) out.push({ payment: p, supplierId: m.supplierId, contractId: inRange[0].id, period: 'in_term', matchScore: score });
    else if (inRange.length > 1) out.push({ payment: p, supplierId: m.supplierId, contractId: null, period: 'ambiguous', matchScore: score });
    else {
      const after = cs.filter((c) => p.date > c.endDate).sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
      if (after) out.push({ payment: p, supplierId: m.supplierId, contractId: after.id, period: 'after_end', matchScore: score });
      else out.push({ payment: p, supplierId: m.supplierId, contractId: null, period: cs.length ? 'before_start' : 'no_contract', matchScore: score });
    }
  }
  return out;
}

/* ---------- per-contract spend summary ---------- */
const sum = (a) => round2(a.reduce((x, y) => x + y, 0));
export function spendSummary(contract, attributed, council, asOf = AS_OF) {
  const mine = attributed.filter((a) => a.contractId === contract.id);
  const inTerm = mine;                                   // spend since start INCLUDING any paid after the end date
  const afterEnd = mine.filter((a) => a.period === 'after_end'); // reported separately as well
  const toDate = sum(inTerm.map((a) => a.payment.amountGBP));
  const t12From = addMonths(asOf, -12), p12From = addMonths(asOf, -24);
  const inWin = (a, from, to) => a.payment.date > from && a.payment.date <= to;
  const t12 = sum(inTerm.filter((a) => inWin(a, t12From, asOf)).map((a) => a.payment.amountGBP));
  const p12 = sum(inTerm.filter((a) => inWin(a, p12From, t12From)).map((a) => a.payment.amountGBP));
  const byYear = []; // contract years from start
  for (let k = 0; ; k++) {
    const from = addMonths(contract.startDate, 12 * k), toEx = addMonths(contract.startDate, 12 * (k + 1));
    if (from > asOf) break;
    const total = sum(inTerm.filter((a) => a.payment.date >= from && a.payment.date < toEx).map((a) => a.payment.amountGBP));
    byYear.push({ year: k + 1, from, to: addDays(toEx, -1), spendGBP: total, partial: toEx > asOf });
  }
  return {
    toDate, t12, p12, afterEndGBP: sum(afterEnd.map((a) => a.payment.amountGBP)), afterEndCount: afterEnd.length,
    paymentCount: inTerm.length, byYear,
    coverage: contract.startDate < council.spendDataFrom ? 'partial' : 'full', coverageFrom: council.spendDataFrom,
    minMatchScore: inTerm.length ? Math.min(...inTerm.map((a) => a.matchScore)) : null,
    latestPayment: mine.length ? mine.map((a) => a.payment.date).sort().slice(-1)[0] : null,
  };
}

/* ---------- cap utilisation ---------- */
export function capStatus(contract, sp, opts = DEFAULTS, asOf = AS_OF) {
  const cap = contract.cap; // { amountGBP, basis:'total_term'|'annual', source:'maximum_stated'|'contract_value' }
  if (!cap || !cap.amountGBP) return { testable: false, capState: 'none' };
  if (cap.basis === 'annual' && !sp.byYear.length) return { testable: false };
  const yearsRemaining = Math.max(0, diffDays(contract.endDate, asOf) / 365.25);
  let utilisation, excess, projectedExcess, spendAgainstCap, elapsedFraction = null;
  if (cap.basis === 'total_term') {
    spendAgainstCap = sp.toDate;
    utilisation = spendAgainstCap / cap.amountGBP;
    excess = Math.max(0, spendAgainstCap - cap.amountGBP);
    const projectedTotal = sp.toDate + sp.t12 * yearsRemaining;
    projectedExcess = Math.max(0, projectedTotal - cap.amountGBP);
  } else { // annual: compare each contract year with the cap (current year to date is NOT pro-rated)
    const worst = sp.byYear.reduce((m, y) => (y.spendGBP > m.spendGBP ? y : m), { spendGBP: 0 });
    spendAgainstCap = worst.spendGBP;
    utilisation = worst.spendGBP / cap.amountGBP;
    excess = round2(sp.byYear.reduce((s, y) => s + Math.max(0, y.spendGBP - cap.amountGBP), 0));
    const cur = sp.byYear[sp.byYear.length - 1];
    const elapsed = Math.max(0.05, Math.min(1, diffDays(asOf, cur.from) / 365.25));
    elapsedFraction = elapsed;
    projectedExcess = Math.max(0, cur.spendGBP / elapsed - cap.amountGBP);
  }
  const state = utilisation > 1 ? 'over' : utilisation >= opts.nearCapThreshold ? 'near' : 'ok';
  // capState adds the estimate semantics: an estimated contract value is not a ceiling, so exceeding it is 'above_estimate', never 'over'.
  const capState = state === 'over' && cap.source === 'contract_value' ? 'above_estimate' : state;
  return { testable: true, basis: cap.basis, source: cap.source, capGBP: cap.amountGBP, spendAgainstCap: round2(spendAgainstCap), utilisation, state, capState, excessGBP: round2(excess), projectedExcessGBP: round2(projectedExcess), yearsRemaining, elapsedFraction };
}

/* ---------- uplift check ---------- */
export function upliftCheck(contract, sp, opts = DEFAULTS, asOf = AS_OF) {
  const ix = contract.indexation;
  if (!ix) return { testable: false, reason: 'No price review clause found' };
  if (ix.indexName === 'None') return { testable: false, reason: 'Prices are fixed for the term, so there is no index to test' };
  if (ix.capPct == null) return { testable: false, reason: 'No index cap stated in the contract' };
  if (contract.startDate > addMonths(asOf, -24)) return { testable: false, reason: 'Fewer than 24 months of payments in the contract term' };
  if (!(sp.p12 > 0)) return { testable: false, reason: 'No payments in the earlier 12 months' };
  const yoy = sp.t12 / sp.p12 - 1;
  const cappedBase = sp.p12 * (1 + ix.capPct);
  const excess = round2(sp.t12 - cappedBase);
  const flagged = yoy - ix.capPct > opts.upliftTolerancePp && excess >= opts.upliftMinGBP;
  return { testable: true, yoy, capPct: ix.capPct, p12: sp.p12, t12: sp.t12, cappedBase: round2(cappedBase), excessGBP: Math.max(0, excess), flagged };
}

/* ---------- annual value base for renewal indicative GBP ---------- */
export function annualBase(contract, sp) {
  if (contract.annualValueGBP) return { gbp: contract.annualValueGBP, source: 'Estimated annual value stated in the contract' };
  if (contract.totalValueGBP && contract.termYears) return { gbp: round2(contract.totalValueGBP / contract.termYears), source: 'Total contract value divided by term in years' };
  return { gbp: sp.t12, source: 'Payments in the last 12 months' };
}

/* ---------- next price review date (next occurrence of MM-DD on or after the as-of date) ---------- */
export function nextReviewDate(monthDay, asOf = AS_OF) {
  if (!monthDay) return null;
  const y = Number(asOf.slice(0, 4));
  const d = `${y}-${monthDay}`;
  return d >= asOf ? d : `${y + 1}-${monthDay}`;
}

/* ---------- flags ---------- */
const sevRank = { high: 3, medium: 2, low: 1 };
const confBand = (x) => (x >= 0.9 ? 'high' : x >= 0.75 ? 'medium' : 'low');
const stepDown = (level) => (level === 'high' ? 'medium' : 'low'); // one step lower: high -> medium -> low
export const isCounted = (f) => f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review');
export const isExcluded = (f) => f.indicativeGBP > 0 && (f.status === 'explained' || f.status === 'not_an_issue');

export function buildFlags(estate, opts = DEFAULTS, asOf = AS_OF, triage = {}) {
  const { council, contracts, matches, attributed } = estate;
  const flags = [];
  const summaries = {};
  const derived = {}; // per contract: { band, deadline, spend, cap, uplift, ... }  (never mutate the contract objects)
  for (const c of contracts) {
    const sp = summaries[c.id] = spendSummary(c, attributed, council, asOf);
    const band = radarBand(c, asOf);
    const base = annualBase(c, sp);
    const lowestMatch = sp.minMatchScore;
    const matchConf = lowestMatch == null ? 1 : lowestMatch;
    // Confidence = the lowest of the relied-on extraction confidences (and, for spend flags, the weakest supplier match).
    // confidenceField names the weakest input (an extraction field key, or 'supplierMatch'); null when nothing is below 1.
    const cf = (keys, withMatch, dropOne) => {
      let worst = { score: 1, field: null };
      for (const k of keys) { const v = c.confidence && c.confidence[k] != null ? c.confidence[k] : 1; if (v < worst.score) worst = { score: v, field: k }; }
      if (withMatch && matchConf < worst.score) worst = { score: matchConf, field: 'supplierMatch' };
      const level = confBand(worst.score);
      return { confidence: dropOne ? stepDown(level) : level, confidenceScore: worst.score, confidenceField: worst.field, confidenceSteppedDown: !!dropOne };
    };
    const capKeys = c.cap.source === 'maximum_stated' ? ['maximumValue'] : ['awardedTotalValue'];
    const estimateCap = c.cap.source === 'contract_value'; // an estimate is not a ceiling: label and confidence change, the number does not

    // 1. renewal
    if (band.band !== 'later' && !(band.band === 'ended' && sp.afterEndGBP === 0)) { // an ended contract with no later payments is history, not a renewal
      let variant, severity, indicative, breakdown;
      if (band.band === 'ended') {
        variant = 'out_of_contract'; severity = 'high';
        indicative = round0(base.gbp * opts.renewalRate);
        breakdown = [{ label: 'Annual value', value: base.gbp, note: base.source }, { label: 'Indicative rate', value: opts.renewalRate, kind: 'pct' }, { label: 'Indicative value (per year)', value: indicative, kind: 'result' }];
      } else {
        variant = band.band === 'passed' ? 'notice_passed' : 'upcoming';
        severity = band.band === 'passed' || band.band === 'm3' ? 'high' : band.band === 'm6' ? 'medium' : 'low';
        indicative = round0(base.gbp * opts.renewalRate);
        breakdown = [{ label: 'Annual value', value: base.gbp, note: base.source }, { label: 'Indicative rate', value: opts.renewalRate, kind: 'pct' }, { label: 'Indicative value (per year)', value: indicative, kind: 'result' }];
      }
      flags.push({ id: `F-${c.id}-renewal`, contractId: c.id, type: 'renewal', variant, band: band.band, severity, indicativeGBP: indicative, basis: 'per_year', actionBy: variant === 'out_of_contract' ? null : band.deadline, breakdown, ...cf(['noticePeriod', 'endDate', 'autoRenewal'], variant === 'out_of_contract'), evidenceFields: ['noticePeriod', 'autoRenewal', 'endDate'] });
    }

    // 2. cap vs spend
    const cs = capStatus(c, sp, opts, asOf);
    if (cs.testable && cs.state === 'over') {
      const annualOver = cs.basis === 'annual' ? sp.byYear.filter((y) => y.spendGBP > c.cap.amountGBP) : null;
      flags.push({ id: `F-${c.id}-overCap`, contractId: c.id, type: 'overCap', capState: cs.capState, capSource: c.cap.source, severity: estimateCap ? 'medium' : 'high', indicativeGBP: round0(cs.excessGBP), basis: 'one_off', actionBy: null,
        breakdown: cs.basis === 'annual'
          ? [{ label: 'Spend in the contract years over the cap', value: round2(annualOver.reduce((s, y) => s + y.spendGBP, 0)) }, { label: `Cap for those years (${annualOver.length} x annual cap)`, value: c.cap.amountGBP * annualOver.length }, { label: 'Spend above cap', value: round0(cs.excessGBP), kind: 'result' }]
          : estimateCap
            ? [{ label: 'Spend to date', value: cs.spendAgainstCap }, { label: 'Contract value (an estimate, not a stated maximum)', value: cs.capGBP }, { label: 'Spend above contract value', value: round0(cs.excessGBP), kind: 'result' }]
            : [{ label: 'Spend to date', value: cs.spendAgainstCap }, { label: 'Cap', value: cs.capGBP }, { label: 'Spend above cap', value: round0(cs.excessGBP), kind: 'result' }],
        ...cf([...capKeys, 'startDate', 'endDate'], true, estimateCap), evidenceFields: capKeys });
    } else if (cs.testable && cs.state === 'near') {
      const cur = cs.basis === 'annual' ? sp.byYear[sp.byYear.length - 1] : null;
      flags.push({ id: `F-${c.id}-nearCap`, contractId: c.id, type: 'nearCap', capState: 'near', capSource: c.cap.source, severity: 'medium', indicativeGBP: round0(cs.projectedExcessGBP), basis: 'projected', actionBy: null,
        breakdown: cs.basis === 'annual'
          ? [{ label: 'Spend in the current contract year to date', value: cur.spendGBP }, { label: 'Share of the contract year elapsed', value: round2(cs.elapsedFraction), kind: 'pct' }, { label: 'Projected spend for the full contract year', value: round0(cur.spendGBP / cs.elapsedFraction) }, { label: 'Annual cap', value: cs.capGBP }, { label: 'Projected spend above cap', value: round0(cs.projectedExcessGBP), kind: 'result' }]
          : [{ label: 'Spend to date', value: sp.toDate }, { label: 'Last 12 months of payments', value: sp.t12 }, { label: 'Years left in term', value: round2(cs.yearsRemaining), kind: 'num' }, { label: 'Projected spend at end of term', value: round0(sp.toDate + sp.t12 * cs.yearsRemaining) }, { label: estimateCap ? 'Contract value (an estimate)' : 'Cap', value: cs.capGBP }, { label: estimateCap ? 'Projected spend above contract value' : 'Projected spend above cap', value: round0(cs.projectedExcessGBP), kind: 'result' }],
        ...cf([...capKeys, 'startDate', 'endDate'], true, estimateCap), evidenceFields: capKeys });
    }

    // 3. uplift
    const up = upliftCheck(c, sp, opts, asOf);
    const ix = c.indexation;
    derived[c.id] = {
      band: band.band, deadline: band.deadline, usedEndDate: noticeDeadline(c.endDate, c.notice).usedEndDate,
      status: c.endDate < asOf ? 'ended' : 'live',
      latestEndDate: addMonths(c.endDate, (c.extension ? c.extension.count * c.extension.lengthMonths : 0)), // end date if every extension is used
      nextReviewDate: ix && ix.indexName !== 'None' ? nextReviewDate(ix.reviewMonthDay, asOf) : null,
      spend: sp, cap: cs, uplift: up, flagIds: [],
    };
    if (up.testable && up.flagged) {
      flags.push({ id: `F-${c.id}-uplift`, contractId: c.id, type: 'uplift', severity: up.excessGBP >= 100000 ? 'high' : 'medium', indicativeGBP: round0(up.excessGBP), basis: 'one_off', actionBy: nextReviewDate(c.indexation.reviewMonthDay, asOf),
        breakdown: [{ label: 'Payments, earlier 12 months', value: up.p12 }, { label: 'Increase allowed by cap', value: up.capPct, kind: 'pct' }, { label: 'Payments allowed under cap', value: up.cappedBase }, { label: 'Payments, last 12 months', value: up.t12 }, { label: 'Paid above the capped increase', value: round0(up.excessGBP), kind: 'result' }],
        ...cf(['indexation'], true), evidenceFields: ['indexation'] });
    }
  }
  // triage and ranking
  for (const f of flags) { f.status = triage[f.id] || 'to_investigate'; derived[f.contractId].flagIds.push(f.id); }
  const ranked = flags.filter((f) => f.indicativeGBP > 0).sort((a, b) => b.indicativeGBP - a.indicativeGBP || sevRank[b.severity] - sevRank[a.severity] || String(a.actionBy || '9999').localeCompare(String(b.actionBy || '9999')) || a.id.localeCompare(b.id));
  const watch = flags.filter((f) => f.indicativeGBP === 0);
  const totals = { totalGBP: 0, contractIds: new Set(), byType: { overCap: 0, nearCap: 0, renewal: 0, uplift: 0 }, countByType: { overCap: 0, nearCap: 0, renewal: 0, uplift: 0 }, excludedGBP: 0, excludedCount: 0 };
  for (const f of ranked) {
    if (isCounted(f)) { totals.totalGBP += f.indicativeGBP; totals.contractIds.add(f.contractId); totals.byType[f.type] += f.indicativeGBP; totals.countByType[f.type]++; }
    else if (isExcluded(f)) { totals.excludedGBP += f.indicativeGBP; totals.excludedCount++; }
  }
  return { flags, ranked, watch, summaries, derived, totals: { totalGBP: totals.totalGBP, contractCount: totals.contractIds.size, byType: totals.byType, countByType: totals.countByType, excludedGBP: totals.excludedGBP, excludedCount: totals.excludedCount } };
}

/* ---------- renewal radar groups (R31): every contract is in exactly one group ---------- */
// groups: passed | ended (ended AND still paying) | m3 | m6 | m12 | later | history (ended, nothing paid since: Contracts register only)
// Items inside a group are ordered by notice deadline ascending, then contract id. `attention` is the "Needs attention now" list:
// notice dates passed (most recently passed first), then ended-but-still-paying contracts.
export function buildRadar(contracts, derived, flags, asOf = AS_OF) {
  const boundaries = { m3: addMonths(asOf, 3), m6: addMonths(asOf, 6), m12: addMonths(asOf, 12) };
  const renewalFlag = {};
  for (const f of flags) if (f.type === 'renewal') renewalFlag[f.contractId] = f;
  const groups = { passed: [], ended: [], m3: [], m6: [], m12: [], later: [], history: [] };
  for (const c of contracts) {
    const d = derived[c.id];
    const key = d.band === 'ended' && d.spend.afterEndGBP === 0 ? 'history' : d.band;
    groups[key].push({ contractId: c.id, band: d.band, deadline: d.deadline, usedEndDate: d.usedEndDate, endDate: c.endDate, annualValueGBP: c.annualValueGBP || 0, totalValueGBP: c.totalValueGBP || 0, afterEndGBP: d.spend.afterEndGBP, flagId: renewalFlag[c.id] ? renewalFlag[c.id].id : null });
  }
  const out = {};
  for (const [key, items] of Object.entries(groups)) {
    items.sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : a.contractId.localeCompare(b.contractId)));
    out[key] = { key, count: items.length, annualGBP: sum(items.map((i) => i.annualValueGBP)), totalGBP: sum(items.map((i) => i.totalValueGBP)), items };
  }
  const attention = [...out.passed.items].reverse().concat(out.ended.items);
  return { boundaries, groups: out, attention };
}

/* ---------- coverage and non-contracted spend ---------- */
export function coverage(attributed, matches) {
  const total = sum(attributed.map((a) => a.payment.amountGBP));
  const linked = sum(attributed.filter((a) => a.contractId).map((a) => a.payment.amountGBP)); // in term or after the end date
  const noContract = new Map(), awaiting = new Map();
  for (const a of attributed.filter((x) => !x.contractId)) {
    const m = matches.get(a.payment.supplierNameRaw);
    const bucket = m && m.status === 'suggested' ? awaiting : noContract;
    const key = a.payment.supplierNameRaw;
    bucket.set(key, round2((bucket.get(key) || 0) + a.payment.amountGBP));
  }
  const list = (mp) => [...mp.entries()].map(([name, totalGBP]) => ({ name, totalGBP })).sort((x, y) => y.totalGBP - x.totalGBP);
  const noContractList = list(noContract), awaitingList = list(awaiting);
  return { totalGBP: total, linkedGBP: linked, linkedPct: linked / total, noContract: noContractList, noContractGBP: sum(noContractList.map((x) => x.totalGBP)), awaitingReview: awaitingList, awaitingReviewGBP: sum(awaitingList.map((x) => x.totalGBP)) };
}

/* ---------- formatting ---------- */
export const fmtGBP = (x) => '£' + Math.round(x).toLocaleString('en-GB');
export const fmtGBPCompact = (x) => { // integer rounding on purpose: (8350000/1e6).toFixed(1) gives "8.3" in JS, humans expect 8.4
  const a = Math.abs(x);
  if (a >= 1e5) return '£' + (Math.round(x / 1e5) / 10).toFixed(1) + 'm';
  if (a >= 1e4) return '£' + Math.round(x / 1e3) + 'k';
  return fmtGBP(x);
};
export const fmtPct = (x, dp = 1) => (x * 100).toFixed(dp) + '%';
