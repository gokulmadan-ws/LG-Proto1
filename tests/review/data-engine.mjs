// INDEPENDENT recomputation of the Kontor Stage 1 rules for the 'data' review.
// Written from requirements.md sections 4 and 5 only. It deliberately does NOT import src/lib/engine.js.
// Reads only the INPUT fields of src/data/sample.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DATA = JSON.parse(fs.readFileSync(path.resolve(HERE, '../../src/data/sample.json'), 'utf8'));
export const AS_OF = '2026-10-06';

// ---- dates (UTC, ISO strings) ----
const MS = 86400000;
const toMs = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(toMs(iso) + n * MS);
export const addMonths = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  // independent month-end clamp: compute target year/month arithmetically
  const t = (y * 12 + (m - 1)) + n;
  const ty = Math.floor(t / 12), tm = ((t % 12) + 12) % 12; // 0-based month
  const dim = [31, (ty % 4 === 0 && (ty % 100 !== 0 || ty % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][tm];
  return `${String(ty).padStart(4, '0')}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
};
export const diffDays = (a, b) => Math.round((toMs(a) - toMs(b)) / MS);
const r2 = (x) => Math.round(x * 100) / 100;
const r0 = (x) => Math.round(x);
const sum = (a) => r2(a.reduce((s, x) => s + x, 0));

// ---- name matching ----
const SUFFIXES = ['limited', 'ltd', 'plc', 'llp', 'llc', 'inc', 'co', 'company', 'uk', 'group', 'holdings', 'the'];
const ABBREV = { svcs: 'services', svc: 'services', serv: 'services', maint: 'maintenance', mgmt: 'management', intl: 'international' };
function bigrams(s) { const t = s.replace(/ /g, ''); const out = new Map(); for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); } return out; }
export function normaliseName(raw) {
  const s = raw.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ');
  return s.split(/\s+/).filter(Boolean).map((t) => ABBREV[t] || t).filter((t) => !SUFFIXES.includes(t)).join(' ').trim();
}
export function dice(a, b) {
  const A = bigrams(a), B = bigrams(b); let inter = 0, na = 0, nb = 0;
  for (const [g, c] of A) { na += c; if (B.has(g)) inter += Math.min(c, B.get(g)); }
  for (const c of B.values()) nb += c;
  return na + nb === 0 ? 0 : (2 * inter) / (na + nb);
}
function matchSupplier(rawName, suppliers, aliases) {
  const raw = rawName.trim(); const norm = normaliseName(raw);
  for (const s of suppliers) if (s.legalName.toLowerCase() === raw.toLowerCase()) return { supplierId: s.id, score: 1.0, method: 'exact' };
  for (const s of suppliers) if (normaliseName(s.legalName) === norm) return { supplierId: s.id, score: 0.98, method: 'normalised' };
  if (aliases[norm]) return { supplierId: aliases[norm], score: 0.95, method: 'alias' };
  let best = { supplierId: null, score: 0, method: 'fuzzy' };
  for (const s of suppliers) { const sc = dice(norm, normaliseName(s.legalName)); if (sc > best.score) best = { supplierId: s.id, score: sc, method: 'fuzzy' }; }
  best.score = Math.min(0.99, Math.round(best.score * 100) / 100);
  return best;
}
export const DEFAULTS = { renewalRate: 0.05, nearCapThreshold: 0.85, upliftTolerancePp: 0.01, upliftMinGBP: 10000, autoAcceptScore: 0.90, suggestScore: 0.70 };

export function buildMatches(decisions, opts) {
  const names = new Map();
  for (const p of DATA.payments) {
    if (!names.has(p.supplierNameRaw)) names.set(p.supplierNameRaw, { count: 0, total: 0 });
    const n = names.get(p.supplierNameRaw); n.count++; n.total = r2(n.total + p.amountGBP);
  }
  const out = new Map();
  for (const [raw, st] of names) {
    const m = matchSupplier(raw, DATA.suppliers, DATA.aliases);
    let status = m.method !== 'fuzzy' ? 'auto_accepted' : m.score >= opts.autoAcceptScore ? 'auto_accepted' : m.score >= opts.suggestScore ? 'suggested' : 'unmatched';
    let { supplierId, method, score } = m;
    const dec = decisions[raw];
    if (dec === 'confirm') { status = 'confirmed'; method = 'manual'; }
    else if (dec === 'reject') { status = 'rejected'; supplierId = null; }
    out.set(raw, { rawName: raw, supplierId, score, method, status, paymentCount: st.count, totalGBP: st.total });
  }
  return out;
}
const accepted = (s) => s === 'auto_accepted' || s === 'confirmed';
// NOTE: requirements 5.9 uses the raw similarity score (0.73) as the match confidence even after the user confirms it.
// The build deliberately treats a confirmed match as certain (docs/foundation-status.md section 5, ruling on A2). We follow the build here and
// report the deviation separately, so that every other number in the confirm scenario can be compared exactly.

export function attribute(matches) {
  const bySupplier = new Map();
  for (const c of DATA.contracts) { if (!bySupplier.has(c.supplierId)) bySupplier.set(c.supplierId, []); bySupplier.get(c.supplierId).push(c); }
  const out = [];
  for (const p of DATA.payments) {
    const m = matches.get(p.supplierNameRaw);
    if (!m || !accepted(m.status)) { out.push({ payment: p, supplierId: null, contractId: null, period: 'unmatched', matchScore: m ? m.score : 0 }); continue; }
    const cs = bySupplier.get(m.supplierId) || [];
    const inRange = cs.filter((c) => p.date >= c.startDate && p.date <= c.endDate);
    if (inRange.length === 1) out.push({ payment: p, supplierId: m.supplierId, contractId: inRange[0].id, period: 'in_term', matchScore: m.status === 'confirmed' ? 1 : m.score });
    else if (inRange.length > 1) out.push({ payment: p, supplierId: m.supplierId, contractId: null, period: 'ambiguous', matchScore: m.status === 'confirmed' ? 1 : m.score });
    else {
      const after = cs.filter((c) => p.date > c.endDate).sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
      if (after) out.push({ payment: p, supplierId: m.supplierId, contractId: after.id, period: 'after_end', matchScore: m.status === 'confirmed' ? 1 : m.score });
      else out.push({ payment: p, supplierId: m.supplierId, contractId: null, period: cs.length ? 'before_start' : 'no_contract', matchScore: m.status === 'confirmed' ? 1 : m.score });
    }
  }
  return out;
}

function spendSummary(c, attributed) {
  const mine = attributed.filter((a) => a.contractId === c.id);
  const afterEnd = mine.filter((a) => a.period === 'after_end');
  const toDate = sum(mine.map((a) => a.payment.amountGBP));
  const t12From = addMonths(AS_OF, -12), p12From = addMonths(AS_OF, -24);
  const inWin = (a, from, to) => a.payment.date > from && a.payment.date <= to;
  const t12 = sum(mine.filter((a) => inWin(a, t12From, AS_OF)).map((a) => a.payment.amountGBP));
  const p12 = sum(mine.filter((a) => inWin(a, p12From, t12From)).map((a) => a.payment.amountGBP));
  const byYear = [];
  for (let k = 0; ; k++) {
    const from = addMonths(c.startDate, 12 * k), toEx = addMonths(c.startDate, 12 * (k + 1));
    if (from > AS_OF) break;
    byYear.push({ year: k + 1, from, to: addDays(toEx, -1), spendGBP: sum(mine.filter((a) => a.payment.date >= from && a.payment.date < toEx).map((a) => a.payment.amountGBP)), partial: toEx > AS_OF });
  }
  return { toDate, t12, p12, afterEndGBP: sum(afterEnd.map((a) => a.payment.amountGBP)), afterEndCount: afterEnd.length, paymentCount: mine.length, byYear,
    coverage: c.startDate < DATA.council.spendDataFrom ? 'partial' : 'full', minMatchScore: mine.length ? Math.min(...mine.map((a) => a.matchScore)) : null,
    latestPayment: mine.length ? mine.map((a) => a.payment.date).sort().slice(-1)[0] : null };
}
export function noticeDeadline(endDate, notice) {
  if (!notice || notice.value == null) return { date: endDate, usedEndDate: true };
  return { date: notice.unit === 'months' ? addMonths(endDate, -notice.value) : addDays(endDate, -notice.value), usedEndDate: false };
}
function radarBand(c) {
  const dl = noticeDeadline(c.endDate, c.notice).date;
  if (diffDays(c.endDate, AS_OF) < 0) return { band: 'ended', deadline: dl };
  if (diffDays(dl, AS_OF) < 0) return { band: 'passed', deadline: dl };
  if (dl <= addMonths(AS_OF, 3)) return { band: 'm3', deadline: dl };
  if (dl <= addMonths(AS_OF, 6)) return { band: 'm6', deadline: dl };
  if (dl <= addMonths(AS_OF, 12)) return { band: 'm12', deadline: dl };
  return { band: 'later', deadline: dl };
}
function capStatus(c, sp, opts) {
  const cap = c.cap;
  if (!cap || !cap.amountGBP) return { testable: false };
  if (cap.basis === 'annual' && !sp.byYear.length) return { testable: false };
  const yearsRemaining = Math.max(0, diffDays(c.endDate, AS_OF) / 365.25);
  let utilisation, excess, projectedExcess, spendAgainstCap;
  if (cap.basis === 'total_term') {
    spendAgainstCap = sp.toDate; utilisation = spendAgainstCap / cap.amountGBP; excess = Math.max(0, spendAgainstCap - cap.amountGBP);
    projectedExcess = Math.max(0, sp.toDate + sp.t12 * yearsRemaining - cap.amountGBP);
  } else {
    const worst = sp.byYear.reduce((m, y) => (y.spendGBP > m.spendGBP ? y : m), { spendGBP: 0 });
    spendAgainstCap = worst.spendGBP; utilisation = worst.spendGBP / cap.amountGBP;
    excess = r2(sp.byYear.reduce((s, y) => s + Math.max(0, y.spendGBP - cap.amountGBP), 0));
    const cur = sp.byYear[sp.byYear.length - 1];
    const elapsed = Math.max(0.05, Math.min(1, diffDays(AS_OF, cur.from) / 365.25));
    projectedExcess = Math.max(0, cur.spendGBP / elapsed - cap.amountGBP);
  }
  const state = utilisation > 1 ? 'over' : utilisation >= opts.nearCapThreshold ? 'near' : 'ok';
  return { testable: true, basis: cap.basis, capGBP: cap.amountGBP, spendAgainstCap: r2(spendAgainstCap), utilisation, state, excessGBP: r2(excess), projectedExcessGBP: r2(projectedExcess), yearsRemaining };
}
function upliftCheck(c, sp, opts) {
  const ix = c.indexation;
  if (!ix) return { testable: false, reason: 'No price review clause found' };
  if (ix.indexName === 'None') return { testable: false, reason: 'Prices are fixed for the term, so there is no index to test' };
  if (ix.capPct == null) return { testable: false, reason: 'No index cap stated in the contract' };
  if (c.startDate > addMonths(AS_OF, -24)) return { testable: false, reason: 'Fewer than 24 months of payments in the contract term' };
  if (!(sp.p12 > 0)) return { testable: false, reason: 'No payments in the earlier 12 months' };
  const yoy = sp.t12 / sp.p12 - 1, cappedBase = sp.p12 * (1 + ix.capPct), excess = r2(sp.t12 - cappedBase);
  return { testable: true, yoy, capPct: ix.capPct, p12: sp.p12, t12: sp.t12, cappedBase: r2(cappedBase), excessGBP: Math.max(0, excess), flagged: yoy - ix.capPct > opts.upliftTolerancePp && excess >= opts.upliftMinGBP };
}
export function nextReviewDate(md) { if (!md) return null; const y = Number(AS_OF.slice(0, 4)); const d = `${y}-${md}`; return d >= AS_OF ? d : `${y + 1}-${md}`; }
const sevRank = { high: 3, medium: 2, low: 1 };

export function compute({ decisions = {}, triage = {}, assumptions = {} } = {}) {
  const opts = { ...DEFAULTS, ...assumptions };
  const matches = buildMatches(decisions, opts);
  const attributed = attribute(matches);
  const flags = [], summaries = {}, derived = {};
  for (const c of DATA.contracts) {
    const sp = summaries[c.id] = spendSummary(c, attributed);
    const band = radarBand(c);
    const base = c.annualValueGBP ? { gbp: c.annualValueGBP, source: 'a' } : (c.totalValueGBP && c.termYears) ? { gbp: r2(c.totalValueGBP / c.termYears), source: 'b' } : { gbp: sp.t12, source: 'c' };
    const matchConf = sp.minMatchScore == null ? 1 : sp.minMatchScore;
    const cf = (keys, withMatch) => { const x = Math.min(...keys.map((k) => (c.confidence && c.confidence[k] != null ? c.confidence[k] : 1)), withMatch ? matchConf : 1); return x >= 0.9 ? 'high' : x >= 0.75 ? 'medium' : 'low'; };
    const capKeys = c.cap.source === 'maximum_stated' ? ['maximumValue'] : ['awardedTotalValue'];
    if (band.band !== 'later' && !(band.band === 'ended' && sp.afterEndGBP === 0)) {
      const variant = band.band === 'ended' ? 'out_of_contract' : band.band === 'passed' ? 'notice_passed' : 'upcoming';
      const severity = variant === 'out_of_contract' || band.band === 'passed' || band.band === 'm3' ? 'high' : band.band === 'm6' ? 'medium' : 'low';
      const indicative = r0(base.gbp * opts.renewalRate);
      flags.push({ id: `F-${c.id}-renewal`, contractId: c.id, type: 'renewal', variant, band: band.band, severity, indicativeGBP: indicative, basis: 'per_year', actionBy: variant === 'out_of_contract' ? null : band.deadline,
        breakdown: [base.gbp, opts.renewalRate, indicative], confidence: cf(['noticePeriod', 'endDate', 'autoRenewal'], variant === 'out_of_contract') });
    }
    const cs = capStatus(c, sp, opts);
    if (cs.testable && cs.state === 'over') {
      let breakdown;
      if (cs.basis === 'annual') { const over = sp.byYear.filter((y) => y.spendGBP > c.cap.amountGBP); breakdown = [r2(over.reduce((s, y) => s + y.spendGBP, 0)), c.cap.amountGBP * over.length, r0(cs.excessGBP)]; }
      else breakdown = [cs.spendAgainstCap, cs.capGBP, r0(cs.excessGBP)];
      flags.push({ id: `F-${c.id}-overCap`, contractId: c.id, type: 'overCap', severity: 'high', indicativeGBP: r0(cs.excessGBP), basis: 'one_off', actionBy: null, breakdown, confidence: cf([...capKeys, 'startDate', 'endDate'], true) });
    } else if (cs.testable && cs.state === 'near') {
      flags.push({ id: `F-${c.id}-nearCap`, contractId: c.id, type: 'nearCap', severity: 'medium', indicativeGBP: r0(cs.projectedExcessGBP), basis: 'projected', actionBy: null,
        breakdown: [sp.toDate, sp.t12, r2(cs.yearsRemaining), r0(sp.toDate + sp.t12 * cs.yearsRemaining), cs.capGBP, r0(cs.projectedExcessGBP)], confidence: cf([...capKeys, 'startDate', 'endDate'], true) });
    }
    const up = upliftCheck(c, sp, opts);
    derived[c.id] = { band: band.band, deadline: band.deadline, usedEndDate: noticeDeadline(c.endDate, c.notice).usedEndDate, spend: sp, cap: cs, uplift: up };
    if (up.testable && up.flagged) {
      flags.push({ id: `F-${c.id}-uplift`, contractId: c.id, type: 'uplift', severity: up.excessGBP >= 100000 ? 'high' : 'medium', indicativeGBP: r0(up.excessGBP), basis: 'one_off', actionBy: nextReviewDate(c.indexation.reviewMonthDay),
        breakdown: [up.p12, up.capPct, up.cappedBase, up.t12, r0(up.excessGBP)], confidence: cf(['indexation'], true) });
    }
  }
  for (const f of flags) f.status = triage[f.id] || 'to_investigate';
  const counted = (f) => f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review');
  const ranked = flags.filter((f) => f.indicativeGBP > 0).sort((a, b) => b.indicativeGBP - a.indicativeGBP || sevRank[b.severity] - sevRank[a.severity] || String(a.actionBy || '9999').localeCompare(String(b.actionBy || '9999')) || a.id.localeCompare(b.id));
  const watch = flags.filter((f) => f.indicativeGBP === 0);
  const t = { total: 0, ids: new Set(), byType: { overCap: 0, nearCap: 0, renewal: 0, uplift: 0 }, countByType: { overCap: 0, nearCap: 0, renewal: 0, uplift: 0 }, excluded: 0, excludedCount: 0 };
  for (const f of ranked) {
    if (counted(f)) { t.total += f.indicativeGBP; t.ids.add(f.contractId); t.byType[f.type] += f.indicativeGBP; t.countByType[f.type]++; }
    else { t.excluded += f.indicativeGBP; t.excludedCount++; }
  }
  // coverage
  const total = sum(attributed.map((a) => a.payment.amountGBP));
  const linked = sum(attributed.filter((a) => a.contractId).map((a) => a.payment.amountGBP));
  const noContract = new Map(), awaiting = new Map();
  for (const a of attributed.filter((x) => !x.contractId)) {
    const m = matches.get(a.payment.supplierNameRaw);
    const bucket = m && m.status === 'suggested' ? awaiting : noContract;
    bucket.set(a.payment.supplierNameRaw, r2((bucket.get(a.payment.supplierNameRaw) || 0) + a.payment.amountGBP));
  }
  const list = (mp) => [...mp.entries()].map(([name, totalGBP]) => ({ name, totalGBP })).sort((x, y) => y.totalGBP - x.totalGBP);
  const coverage = { totalGBP: total, linkedGBP: linked, linkedPct: linked / total, noContract: list(noContract), awaiting: list(awaiting) };
  // radar groups
  const groups = {};
  for (const k of ['passed', 'ended', 'm3', 'm6', 'm12', 'later']) groups[k] = { count: 0, annualGBP: 0, totalGBP: 0, items: [] };
  for (const c of DATA.contracts) { const g = groups[derived[c.id].band]; g.count++; g.annualGBP += c.annualValueGBP || 0; g.totalGBP += c.totalValueGBP || 0; g.items.push({ id: c.id, deadline: derived[c.id].deadline }); }
  for (const g of Object.values(groups)) g.items.sort((a, b) => a.deadline.localeCompare(b.deadline) || a.id.localeCompare(b.id));
  const boundaries = { m3: addMonths(AS_OF, 3), m6: addMonths(AS_OF, 6), m12: addMonths(AS_OF, 12) };
  return { opts, matches, attributed, flags, ranked, watch, summaries, derived, totals: { totalGBP: t.total, contractCount: t.ids.size, byType: t.byType, countByType: t.countByType, excludedGBP: t.excluded, excludedCount: t.excludedCount }, coverage, groups, boundaries };
}

// ---- formatting (independent) ----
export const gbp = (x) => '£' + Math.round(x).toLocaleString('en-GB');
export const gbp2 = (x) => '£' + x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const compact = (x) => { const a = Math.abs(x); if (a >= 1e5) return '£' + (Math.round(x / 1e5) / 10).toFixed(1) + 'm'; if (a >= 1e4) return '£' + Math.round(x / 1e3) + 'k'; return gbp(x); };
export const pct1 = (x) => (x * 100).toFixed(1) + '%';

// ---- golden numbers (requirements 6.6) ----
export const GOLD = {
  ranked: [['F-C-005-overCap', 3350000], ['F-C-007-overCap', 760000], ['F-C-001-nearCap', 642478], ['F-C-003-renewal', 310000], ['F-C-004-uplift', 188200], ['F-C-002-renewal', 145000], ['F-C-001-renewal', 120000], ['F-C-004-renewal', 110000], ['F-C-007-renewal', 90000], ['F-C-014-renewal', 70000], ['F-C-011-overCap', 62000], ['F-C-018-renewal', 57500], ['F-C-005-renewal', 50000], ['F-C-012-uplift', 49000], ['F-C-016-renewal', 47500], ['F-C-015-renewal', 39000], ['F-C-009-renewal', 21000], ['F-C-010-uplift', 18060], ['F-C-017-renewal', 15500]],
};

