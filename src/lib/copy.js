// UI copy for the whole prototype: the Springboard-voice copy deck (requirements section 7) plus the blueprint section 1 corrections.
// Voice: sentence case, "you", British English, no exclamation marks, no emoji, [Verb]+[Object] buttons, errors are What + Why + How.
// Pure functions and constants, no React, no clock (relative dates are measured from the fixed as-of date).
//
// Everything a screen says about a flag, a contract answer, a status or a number comes from here, so wording is typed once:
//   reasonFor(flag, contract, derived)      one-sentence reason for a flag (copy deck 7.5)         derived = estate.derived[contract.id]
//   actionLine(contract, derived)           renewal action sentence, all cases (7.6)
//   needsAttentionText(contract, derived)   "Needs attention now" sentence (R34)
//   relativeText(iso)                       '25 days left' | 'Due today' | '6 days ago'
//   answerFor(extraction, contract)         { text, rows?, kind } for the nine questions (7.10); answerText() returns just the string
//   headlineSentence(totals), breakdownCards(totals), sumLine(totals), excludedNote(totals)
//   flagTypeLabel, basisLabel, severityLabel, reviewStatusLabel, matchStatusLabel, matchMethodLabel, capStateLabel, bandLabel, confidenceLabel ...
//   COPY                                    static strings: banner, caveat, about, buttons, empty states, errors, toasts, page titles, demo guide, method leads
import { AS_OF, DEFAULTS, addDays, addMonths, diffDays, fmtGBP, fmtGBPCompact, fmtPct } from './engine.js';
import { fmtDate, fmtDateLong, fmtMonthDay, fmtMonthYear, joinList, plural } from './format.js';

export { fmtDate, fmtDateLong, fmtGBP, fmtGBPCompact, fmtPct };

/* ------------------------------------------------------------------ labels */

const FLAG_TYPE_LABEL = { overCap: 'Spend over cap', nearCap: 'Close to cap', renewal: 'Renewal decision', uplift: 'Price increase above cap' };
/** Plural labels for the filter chips and the breakdown cards. */
export const FLAG_TYPE_CHIP_LABEL = { overCap: 'Spend over cap', nearCap: 'Close to cap', renewal: 'Renewals', uplift: 'Price increases above cap' };
export const FLAG_TYPES = ['overCap', 'nearCap', 'renewal', 'uplift']; // fixed colour and card order
export const ABOVE_ESTIMATE_LABEL = 'Above contract value (estimate)';

/** 'Spend over cap', 'Close to cap', 'Renewal decision', 'Price increase above cap'. Pass the flag itself to get 'Above contract value (estimate)' for a contract-value cap. */
export function flagTypeLabel(typeOrFlag) {
  const type = typeof typeOrFlag === 'string' ? typeOrFlag : typeOrFlag && typeOrFlag.type;
  if (typeof typeOrFlag === 'object' && typeOrFlag && typeOrFlag.type === 'overCap' && typeOrFlag.capState === 'above_estimate') return ABOVE_ESTIMATE_LABEL;
  return FLAG_TYPE_LABEL[type] || String(type || '');
}

const BASIS_LABEL = { one_off: 'Already paid', projected: 'Projected at the current pace', per_year: 'Per year' };
/** 'Already paid' | 'Projected at the current pace' | 'Per year'. Accepts a flag or a basis string. */
export function basisLabel(flagOrBasis) {
  const b = typeof flagOrBasis === 'string' ? flagOrBasis : flagOrBasis && flagOrBasis.basis;
  return BASIS_LABEL[b] || '';
}

export const severityLabel = (s) => ({ high: 'High', medium: 'Medium', low: 'Low' }[s] || '');

export const TRIAGE_OPTIONS = [
  { value: 'to_investigate', label: 'To investigate' },
  { value: 'under_review', label: 'Under review' },
  { value: 'explained', label: 'Explained' },
  { value: 'not_an_issue', label: 'No action' },
];
export const reviewStatusLabel = (s) => (TRIAGE_OPTIONS.find((o) => o.value === s) || { label: '' }).label;

export const matchStatusLabel = (s) => ({ auto_accepted: 'Accepted', suggested: 'Suggested', unmatched: 'Unmatched', confirmed: 'Confirmed by you', rejected: 'Rejected by you' }[s] || '');
export const matchMethodLabel = (m) => ({ exact: 'Exact', normalised: 'Normalised', alias: 'Alias', fuzzy: 'Similar name', manual: 'Confirmed by you' }[m] || '');

export const contractStatusLabel = (s) => ({ live: 'Live', ended: 'Ended' }[s] || '');
export const capSourceLabel = (cap) => (cap && cap.source === 'contract_value' ? 'Contract value (no maximum stated)' : 'Stated maximum');
export const capBasisLabel = (cap) => (cap && cap.basis === 'annual' ? 'Per contract year' : 'Whole term');

/** Cap state label from a derived cap status (estate.derived[id].cap). 'Above contract value (estimate)' replaces 'Over cap' when the cap is an estimate. */
export function capStateLabel(capStatus) {
  const cs = capStatus || {};
  if (!cs.testable) return 'Cannot test';
  const estimate = cs.source === 'contract_value';
  if (cs.capState === 'above_estimate') return ABOVE_ESTIMATE_LABEL;
  if (cs.capState === 'over') return 'Over cap';
  if (cs.capState === 'near') return estimate ? 'Close to contract value (estimate)' : 'Close to cap';
  return 'Within cap';
}

export const BAND_LABEL = { passed: 'Notice date passed', ended: 'Ended, still paying', m3: 'Next 3 months', m6: '3 to 6 months', m12: '6 to 12 months', later: 'Later than 12 months', history: 'Ended' };
export const bandLabel = (b) => BAND_LABEL[b] || '';

/** Confidence band for an extraction score: 0.90 or above 'high', 0.75 to below 0.90 'medium', below 0.75 'review'. */
export function confidenceBand(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 'review';
  return s >= 0.9 ? 'high' : s >= 0.75 ? 'medium' : 'review';
}
/** 'High confidence' | 'Medium confidence' | 'Needs review'. Accepts a score, a band ('high'|'medium'|'review') or a flag confidence ('high'|'medium'|'low'). */
export function confidenceLabel(x, { short = false } = {}) {
  const band = typeof x === 'number' ? confidenceBand(x) : x === 'low' ? 'review' : x;
  if (band === 'high') return short ? 'High' : 'High confidence';
  if (band === 'medium') return short ? 'Medium' : 'Medium confidence';
  return 'Needs review';
}

export const FIELD_LABEL = {
  estimatedAnnualValue: 'estimated annual value', awardedTotalValue: 'total contract value', maximumValue: 'maximum value', startDate: 'start date', endDate: 'end date',
  extensions: 'extension options', noticePeriod: 'notice period', autoRenewal: 'auto-renewal', indexation: 'price review', paymentTerms: 'payment terms', rateCard: 'rate card',
  serviceCredits: 'service credits', terminationForConvenience: 'termination for convenience', exitFees: 'exit fees', supplierMatch: 'supplier match',
};
export const fieldLabel = (key) => FIELD_LABEL[key] || String(key || '');

/** Where the contract text came from (Source chip). */
export function sourceLabel(contractOrSource) {
  const s = typeof contractOrSource === 'string' ? contractOrSource : contractOrSource && contractOrSource.source;
  return s === 'find_a_tender' ? 'Find a Tender notice and contract' : 'Council contracts register, PDF';
}

/* ------------------------------------------------------------------ dates and relative text */

/** '25 days left' | 'Due today' | '6 days ago', measured from the fixed as-of date. */
export function relativeText(iso, asOf = AS_OF) {
  if (!iso) return '';
  const n = diffDays(iso, asOf);
  if (n === 0) return 'Due today';
  return n > 0 ? `${n} ${n === 1 ? 'day' : 'days'} left` : `${-n} ${-n === 1 ? 'day' : 'days'} ago`;
}

const dayWord = (n) => (n === 1 ? 'day' : 'days');

/* ------------------------------------------------------------------ renewal action lines (7.6) */

/**
 * One sentence telling you what to do about a renewal. All cases of copy deck 7.6:
 * auto-renews / extension option / no extension, each with the deadline ahead or passed; notice not stated; ended and still paying.
 * `derived` is estate.derived[contract.id] (band, deadline, usedEndDate, spend).
 */
export function actionLine(contract, derived) {
  const d = derived || {};
  const end = fmtDateLong(contract.endDate);
  const deadline = d.deadline ? fmtDateLong(d.deadline) : '';
  if (d.band === 'ended') {
    const paid = d.spend ? d.spend.afterEndGBP : 0;
    return paid > 0
      ? `This contract ended on ${end}. You have paid ${fmtGBP(paid)} since. Decide whether to re-procure, extend in writing, or stop paying.`
      : `This contract ended on ${end}. You have not paid anything under it since.`;
  }
  if (d.usedEndDate || !contract.notice) return `No notice period is stated in this contract. We used the end date (${end}) as the action date.`;
  const passed = d.band === 'passed';
  const auto = contract.autoRenewal && contract.autoRenewal.enabled;
  const ext = contract.extension && contract.extension.count > 0;
  if (auto) {
    return passed
      ? `The notice date passed on ${deadline}. This contract renews on ${fmtDateLong(addDays(contract.endDate, 1))} for ${contract.autoRenewal.periodMonths} months unless you agree otherwise with the supplier.`
      : `Serve notice by ${deadline} or this contract renews for ${contract.autoRenewal.periodMonths} months.`;
  }
  if (ext) {
    return passed
      ? `The date to give notice of an extension passed on ${deadline}. Agree any extension with the supplier in writing, or plan to re-procure before ${end}.`
      : `Decide by ${deadline} whether to extend. If you do nothing, the contract ends on ${end}.`;
  }
  return passed
    ? `The notice date passed on ${deadline}. The contract ends on ${end}. Plan the re-procurement now.`
    : `Plan the re-procurement. The contract ends on ${end} and the notice date is ${deadline}.`;
}

/** Short note shown beside a notice deadline that fell back to the end date (R33), or null. */
export function noticeDeadlineNote(derived) {
  return derived && derived.usedEndDate ? 'No notice period stated. We used the end date.' : null;
}

/** "Needs attention now" sentence (R34), or null when the contract is not in that group. */
export function needsAttentionText(contract, derived) {
  const d = derived || {};
  if (d.band === 'passed') {
    const n = diffDays(AS_OF, d.deadline);
    const base = `The notice date passed ${n} ${dayWord(n)} ago`;
    if (contract.autoRenewal && contract.autoRenewal.enabled) {
      return `${base}. This contract renews on ${fmtDateLong(addDays(contract.endDate, 1))} for ${contract.autoRenewal.periodMonths} months unless you agree otherwise with the supplier.`;
    }
    return base;
  }
  if (d.band === 'ended' && d.spend && d.spend.afterEndGBP > 0) return `This contract ended on ${fmtDateLong(contract.endDate)}. You have paid ${fmtGBP(d.spend.afterEndGBP)} since.`;
  return null;
}

/* ------------------------------------------------------------------ flag reasons (7.5) */

const COVERAGE_APPEND = (from) => ` Spend files start on ${fmtDateLong(from)}, so the real figure may be higher.`;

function yearsList(years) { return joinList(years.map(String)); }

/** Why the weakest input is weak, for the flag drawer ("confidence + why"). */
export function confidenceReason(flag) {
  const field = flag.confidenceField;
  const score = Number(flag.confidenceScore);
  const label = field === 'supplierMatch' ? 'supplier match' : fieldLabel(field);
  let text;
  if (score < 0.75) text = `Relies on an answer Kontor is not sure about: ${label} (${score.toFixed(2)}). Check the clause first.`;
  else if (score < 0.9) text = `The weakest input is the ${label} at ${score.toFixed(2)}.`;
  else text = 'Every answer and supplier match this relies on is high confidence.';
  if (flag.confidenceSteppedDown) text += ' The cap is the contract value, which is an estimate and not a ceiling, so confidence is one step lower.';
  return text;
}

/**
 * One-sentence reason for a flag, in full pounds. Templates from copy deck 7.5 with the append rules
 * (paid after the end date, partial spend coverage, low confidence). `derived` is estate.derived[contract.id].
 */
export function reasonFor(flag, contract, derived) {
  const d = derived || {};
  const sp = d.spend || {};
  const cs = d.cap || {};
  let text = '';
  if (flag.type === 'renewal') {
    text = actionLine(contract, d);
  } else if (flag.type === 'overCap') {
    if (cs.basis === 'annual') {
      const over = (sp.byYear || []).filter((y) => y.spendGBP > cs.capGBP);
      text = over.length === 1
        ? `In contract year ${over[0].year} you paid ${fmtGBP(over[0].spendGBP)} against an annual cap of ${fmtGBP(cs.capGBP)}, ${fmtGBP(flag.indicativeGBP)} over.`
        : `In contract years ${yearsList(over.map((y) => y.year))} you paid ${fmtGBP(over.reduce((s, y) => s + y.spendGBP, 0))} against an annual cap of ${fmtGBP(cs.capGBP)} a year, ${fmtGBP(flag.indicativeGBP)} over.`;
    } else if (flag.capState === 'above_estimate') {
      text = `You have paid ${fmtGBP(cs.spendAgainstCap)} against a contract value of ${fmtGBP(cs.capGBP)}, which is an estimate and not a stated maximum. That is ${fmtPct(cs.utilisation)} of it, ${fmtGBP(flag.indicativeGBP)} over. An estimate is not a ceiling, so check whether a maximum applies before you act.`;
    } else {
      text = `You have paid ${fmtGBP(cs.spendAgainstCap)} against a cap of ${fmtGBP(cs.capGBP)}. That is ${fmtPct(cs.utilisation)} of the cap, ${fmtGBP(flag.indicativeGBP)} over.`;
    }
    if (sp.afterEndGBP > 0) text += ` ${fmtGBP(sp.afterEndGBP)} of this was paid after the contract ended on ${fmtDateLong(contract.endDate)}.`;
    if (sp.coverage === 'partial') text += COVERAGE_APPEND(sp.coverageFrom);
  } else if (flag.type === 'nearCap') {
    const what = flag.capSource === 'contract_value' ? 'contract value' : 'cap';
    const label = what === 'cap' ? 'the cap' : 'the contract value';
    if (cs.basis === 'annual') {
      text = flag.indicativeGBP > 0
        ? `In your highest contract year you have used ${fmtPct(cs.utilisation)} of the annual cap. At the pace of the current year, spend reaches ${fmtGBP(cs.capGBP + flag.indicativeGBP)} by the end of the year, ${fmtGBP(flag.indicativeGBP)} over the cap.`
        : `In your highest contract year you have used ${fmtPct(cs.utilisation)} of the annual cap. At the pace of the current year, spend stays within the cap.`;
    } else {
      text = flag.indicativeGBP > 0
        ? `You have used ${fmtPct(cs.utilisation)} of ${label}. At the pace of the last 12 months, spend reaches ${fmtGBP(cs.capGBP + flag.indicativeGBP)} by ${fmtDateLong(contract.endDate)}, ${fmtGBP(flag.indicativeGBP)} over ${label}.`
        : `You have used ${fmtPct(cs.utilisation)} of ${label}. At the pace of the last 12 months, spend stays within ${label} until the contract ends on ${fmtDateLong(contract.endDate)}.`;
    }
    if (sp.coverage === 'partial') text += COVERAGE_APPEND(sp.coverageFrom);
  } else if (flag.type === 'uplift') {
    const up = d.uplift || {};
    text = `Payments rose ${fmtPct(up.yoy)} year on year. The contract caps price increases at ${fmtPct(up.capPct)}. That is ${fmtGBP(flag.indicativeGBP)} more than the cap allows if volumes stayed flat. Volume changes may explain part of this.`;
  }
  if (flag.confidence === 'low' && flag.confidenceField) {
    const label = flag.confidenceField === 'supplierMatch' ? 'supplier match' : fieldLabel(flag.confidenceField);
    text += ` This relies on an answer Kontor is not sure about: ${label}. Check the clause first.`;
  }
  return text;
}

/** Row note for a Watch list flag with an indicative value of £0 (R28). */
export const watchNote = () => 'Indicative value £0. Not counted in the total.';

/** Value text for one line of a flag breakdown (flag.breakdown[i]): money in full, percentages to one decimal, plain numbers to two. */
export function breakdownValueText(item) {
  if (item.kind === 'pct') return fmtPct(item.value, 1);
  if (item.kind === 'num') return Number(item.value).toFixed(2);
  return fmtGBP(item.value);
}
/** What a flag's action date is: 'Notice date' (renewal) or 'Next price review' (uplift); null for flags with no action date. */
export function actionByLabel(flag) {
  if (!flag.actionBy) return null;
  return flag.type === 'uplift' ? 'Next price review' : 'Notice date';
}
/** '31 Oct 2026' for the "Action by" column, or '' when the flag has no action date. */
export const actionByText = (flag) => (flag.actionBy ? fmtDate(flag.actionBy) : '');
/** Notice period as extracted, short: '6 months', '30 days', 'Not stated'. */
export function noticeShortText(notice) {
  if (!notice || notice.value == null) return 'Not stated';
  const u = notice.unit === 'months' ? 'month' : 'day';
  return `${notice.value} ${notice.value === 1 ? u : u + 's'}`;
}

/* ------------------------------------------------------------------ headline, cards, totals */

/** H1 of the Overview: '£6.1m across 15 contracts flagged as opportunities to investigate' (singular: 'across 1 contract flagged as an opportunity to investigate'). */
export function headlineSentence(totals) {
  const n = totals.contractCount;
  return `${fmtGBPCompact(totals.totalGBP)} across ${n} ${n === 1 ? 'contract flagged as an opportunity' : 'contracts flagged as opportunities'} to investigate`;
}

const CARD_SUB = { overCap: 'Already paid above the cap.', nearCap: 'Projected at the current pace.', renewal: 'Indicative value per year.', uplift: 'Already paid above the cap.' };
const CARD_ARIA = { overCap: 'already paid above the cap', nearCap: 'projected at the current pace', renewal: 'indicative value per year', uplift: 'already paid above the cap' };

/**
 * The four breakdown cards (R17), always in the order over cap, close to cap, renewals, price increases.
 * [{ type, title, value: '£4.2m', exact: '£4,172,000', exactGBP, count, sub: '3 contracts. Already paid above the cap.', ariaLabel, href }]
 * The values sum exactly to the headline (print sumLine(totals) beneath them).
 */
export function breakdownCards(totals) {
  return FLAG_TYPES.map((type) => {
    const count = totals.countByType ? totals.countByType[type] : 0;
    const gbp = totals.byType[type];
    const contracts = plural(count, 'contract');
    return {
      type, title: FLAG_TYPE_CHIP_LABEL[type], value: fmtGBPCompact(gbp), exact: fmtGBP(gbp), exactGBP: gbp, count,
      sub: `${contracts}. ${CARD_SUB[type]}`,
      ariaLabel: `${FLAG_TYPE_CHIP_LABEL[type]} ${fmtGBPCompact(gbp)}, ${contracts}, ${CARD_ARIA[type]}`,
      href: `#/opportunities?type=${type}`,
    };
  });
}

/** '£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238' (parts with no value are left out). */
export function sumLine(totals) {
  const parts = FLAG_TYPES.filter((t) => totals.byType[t] > 0).map((t) => fmtGBP(totals.byType[t]));
  return `${parts.length ? parts.join(' + ') : fmtGBP(0)} = ${fmtGBP(totals.totalGBP)}`;
}

/** '£3,350,000 excluded after your review.' or null when nothing is excluded. */
export function excludedNote(totals) {
  return totals.excludedGBP > 0 ? `${fmtGBP(totals.excludedGBP)} excluded after your review.` : null;
}

/** 'Next 3 months: 3 contracts, £6.9m a year' from a radar group (estate.radar.groups[key]). */
export function radarSummaryLine(key, group) {
  return `${bandLabel(key)}: ${plural(group.count, 'contract')}, ${fmtGBPCompact(group.annualGBP)} a year`;
}
/** Footnote under the radar. */
export function radarFootnote(count) {
  return `${plural(count, 'contract')} ${count === 1 ? 'has a notice date' : 'have notice dates'} more than 12 months away and ${count === 1 ? 'is' : 'are'} not on the radar.`;
}
/** The headline as a share of all payments, for the Method page sanity line. */
export function headlineShareText(totals, coverage) {
  return `The headline is equivalent to ${fmtPct(totals.totalGBP / coverage.totalGBP, 0)} of the ${fmtGBPCompact(coverage.totalGBP)} in the sample payment files.`;
}
export const coverageLine = (coverage) => `${Math.round(coverage.linkedPct * 100)}% of payments are linked to a contract on the register`;
export const coverageDetail = (coverage) => `${fmtGBPCompact(coverage.linkedGBP)} of ${fmtGBPCompact(coverage.totalGBP)}`;

/** Toast after changing a review status. */
export function triageToast(contract, status, totals) {
  return `${contract.title}: marked ${reviewStatusLabel(status)}. The headline is now ${fmtGBPCompact(totals.totalGBP)}.`;
}
export const matchRejectedToast = (rawName) => `Match rejected. ${rawName} is now unmatched.`;
export function matchConfirmedToast(match, contractTitle) {
  return `Match confirmed. ${plural(match.paymentCount, 'payment')} (${fmtGBP(match.totalGBP)}) now count towards ${contractTitle}.`;
}
/** Row help for a suggested match (first clause only; the date logic is not built). */
export const matchSuggestionHelp = (match) => `Suggested because the names are similar (${match.score.toFixed(2)}).`;
export const handcheckLine = (n, total) => `${n} of ${total} answers checked by hand`;

/* ------------------------------------------------------------------ the nine questions: answers in plain words (7.10) */

const NUM_WORD = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' };
const INDEX_LABEL = { CPI: 'CPI', CPIH: 'CPIH', RPI: 'RPI', Other: 'the index' };
const pctText = (x) => `${Math.round(x * 1000) / 10}%`;
const noticeText = (n) => (n.unit === 'months'
  ? `${n.value} ${n.value === 1 ? "month's" : "months'"} notice before the end of the term`
  : `${n.value} ${n.value === 1 ? "day's" : "days'"} notice`);

/**
 * The answer to one extracted field in plain language (copy deck 7.10).
 * Returns { text, kind } where kind is 'found' | 'not_found'; rateCard also returns rows [{ item, unit, rate: '£19.40' }] for a 3-column table.
 * `contract` supplies the fallback value for a missing maximum.
 */
export function answerFor(extraction, contract) {
  const a = extraction.answer;
  const key = extraction.fieldKey;
  const found = (text, extra = {}) => ({ text, kind: 'found', ...extra });
  const missing = (text) => ({ text, kind: 'not_found' });
  switch (key) {
    case 'estimatedAnnualValue': return a == null ? missing('Not stated. We used total value divided by term.') : found(`${fmtGBP(a)} a year (estimated)`);
    case 'awardedTotalValue': return a == null ? missing('Not stated') : found(`${fmtGBP(a)} over the initial term (estimated)`);
    case 'maximumValue':
      if (!a) return missing(`No maximum stated. We used the contract value (${fmtGBP(contract && contract.cap ? contract.cap.amountGBP : 0)}).`);
      return found(`${fmtGBP(a.amountGBP)} ${a.basis === 'annual' ? 'per contract year' : 'for the whole term'} (stated maximum)`);
    case 'startDate': return a ? found(fmtDateLong(a)) : missing('Not found');
    case 'endDate': return a ? found(`${fmtDateLong(a)} (end of the current term)`) : missing('Not found');
    case 'extensions': {
      if (!a || !a.count) return found('No extension option');
      const who = a.decider === 'council' ? "at the council's option" : a.decider === 'mutual' ? 'by agreement of both parties' : a.decider === 'supplier' ? "at the supplier's option" : '';
      return found(`${NUM_WORD[a.count] || a.count} ${a.count === 1 ? 'extension' : 'extensions'} of ${a.lengthMonths} months${a.count > 1 ? ' each' : ''}${who ? ', ' + who : ''}`);
    }
    case 'noticePeriod': return a ? found(noticeText(a)) : missing('Not found. We used the end date as the action date.');
    case 'autoRenewal': return a && a.enabled ? found(`Renews automatically for ${a.periodMonths} months unless you give notice`) : found('Does not renew automatically');
    case 'indexation': {
      if (!a || a.indexName === 'None') return found('Prices are fixed for the term.');
      const when = a.reviewMonthDay ? ` each ${fmtMonthDay(a.reviewMonthDay)}` : ' each year';
      const head = `Reviewed${when} by ${INDEX_LABEL[a.indexName] || a.indexName}.`;
      return found(a.capPct == null ? `${head} No cap stated.` : `${head} Increases capped at ${fmtPct(a.capPct)}.`);
    }
    case 'paymentTerms': return a == null ? missing('Not found') : found(`${a} days from receipt of a valid invoice`);
    case 'rateCard':
      if (!a || !a.length) return missing('No rate card found');
      return found(a.map((r) => `${r.item} £${r.rateGBP.toFixed(2)} ${r.unit}`).join('; '), { rows: a.map((r) => ({ item: r.item, unit: r.unit, rate: `£${r.rateGBP.toFixed(2)}` })) });
    case 'serviceCredits': return a && a.present ? found(`${pctText(a.perFailurePct)} of the monthly charge for each missed KPI, up to ${pctText(a.monthlyCapPct)} of the monthly charge`) : found('No service credits');
    case 'terminationForConvenience': return a && a.allowed ? found(`You can end this contract early on ${a.noticeMonths} ${a.noticeMonths === 1 ? "month's" : "months'"} notice`) : found('Neither party can end this contract early without cause');
    case 'exitFees': return a && a.present ? found(a.summary) : found('No exit fees stated');
    default: return missing('Not found');
  }
}
export const answerText = (extraction, contract) => answerFor(extraction, contract).text;

/** Derived-panel text for the uplift check: '2.7% against a cap of 3.0%' / 'Cannot test: reason'. */
export function upliftResultText(uplift, opts = DEFAULTS) {
  if (!uplift || !uplift.testable) return `Cannot test: ${uplift && uplift.reason ? uplift.reason : 'no price review clause found'}`;
  if (uplift.flagged) return `Payments rose ${fmtPct(uplift.yoy)} against a cap of ${fmtPct(uplift.capPct)}`;
  if (uplift.yoy < 0) return `Payments fell ${fmtPct(-uplift.yoy)}`;
  const within = uplift.yoy - uplift.capPct <= opts.upliftTolerancePp && uplift.yoy > uplift.capPct;
  return `${fmtPct(uplift.yoy)} against a cap of ${fmtPct(uplift.capPct)}${within ? '. Within tolerance' : ''}`;
}

/** 'Latest end date if every extension is used' text, and the cap utilisation text for the derived panel. */
export const latestEndText = (derived) => fmtDateLong(derived.latestEndDate);
export function capUsedText(capStatus) {
  return capStatus && capStatus.testable ? `${fmtPct(capStatus.utilisation)} of ${capStatus.source === 'contract_value' ? 'the contract value' : 'the cap'}` : 'Cannot test';
}

/* ------------------------------------------------------------------ static deck */

const AS_AT_LONG = fmtDateLong(AS_OF);
const m3 = fmtDateLong(addMonths(AS_OF, 3)), m6 = fmtDateLong(addMonths(AS_OF, 6)), m12 = fmtDateLong(addMonths(AS_OF, 12));
const pct0 = (x) => `${Math.round(x * 100)}%`;
const CLOSE_LINE = "This is one council's contracts and spend. Imagine your full estate."; // blueprint decision 8
const SPOKEN_CLOSE = "This is one council's public data, here simulated. Imagine your full estate.";

export const COPY = {
  appName: 'Kontor financial layer',
  council: 'Marchbank Borough Council',
  asAt: `As at ${AS_AT_LONG}`,
  asAtShort: `Indicative figures. As at ${AS_AT_LONG}.`,

  banner: { lead: 'Sample data.', body: 'Marchbank Borough Council, its suppliers, contracts and payments are fictional. They were written for this demo.', link: 'About this data', badge: 'Sample' },

  // 7.2 with blueprint decision 7: the headline caveat is generic. The 1.7m figure appears only in the evidence list beside its link.
  caveat: {
    long: 'Indicative figures. Each one is an opportunity to investigate, not a saving. In a 2019 Local Government Association case study, potential savings shrank to possibly nil once outliers turned out to have legitimate reasons. Check each flag against its clause before you act.',
    short: 'Indicative. An opportunity to investigate, not a saving. Test it against the contract before you act.',
    tooltip: 'Indicative means a prompt to investigate, calculated by the rules on the How this is calculated page. It is not a confirmed saving.',
    chartTooltip: 'An opportunity to investigate, not a confirmed result',
    link: 'How this is calculated',
  },
  vatNote: 'Figures are net of irrecoverable VAT and compared with ex-VAT contract values.',
  dataWindowNote: (council) => `${council.spendWindowLabel || 'Sample payments to ' + fmtDateLong(council.spendDataTo)}.`,
  partialCoverageNote: (from) => `Spend files start on ${fmtDateLong(from)}, so spend before that date is not counted. Utilisation may be higher.`,
  paymentsCaption: 'Sample payments (fictional)',
  illustrativeLabel: 'Illustrative contract text written for this demo, not a real document.',
  noCoverageText: 'There is no contract to read, so there is no clause to link',

  // 7.3 with the blueprint corrections (no ingestion risk, no Transparency Code column fidelity claim) plus the Stage 1 data sources
  about: {
    title: 'About this data',
    sections: [
      { heading: 'What is real.', body: 'Nothing. Marchbank Borough Council, its suppliers, contracts and payments are fictional. They were written for this demo.' },
      { heading: 'What is realistic.', body: 'The contracts are written the way public contracts are written. The payment rows look like the files councils publish for payments over £500: date, department, supplier, purpose and amount. Every answer shows the clause and page it came from.' },
      { heading: "What this demo doesn't show.", body: 'Kontor reads contracts and extracts commercial terms as part of the wider product. This prototype starts after document ingestion: every answer is shown as already extracted.' },
      { heading: 'Why one council.', body: 'Stage 1 shows what one council can learn from its own contracts and spend. Joining up councils is Stage 2 and is on the roadmap.' },
      { heading: 'Where real data would come from.', body: 'Contracts over £5m on Find a Tender, for procurements started on or after 24 February 2025. Payments from the Transparency Code spend files. Contracts Finder notices for contracts below £5m, where full documents are not published.' },
      { heading: 'Fixed date.', body: `Every figure is calculated as at ${AS_AT_LONG}, whatever today's date is.` },
    ],
    close: 'Close dialog',
  },

  closePanel: {
    heading: CLOSE_LINE,
    body: "You are looking at one council's contracts and spend. Your estate has more contracts, more suppliers and more renewals nobody is tracking.",
    primary: 'Give feedback', secondary: 'See what comes next',
    spoken: SPOKEN_CLOSE,
  },

  evidenceStrip: { heading: 'Why this matters', intro: 'Public cases summarised from the Kontor scope document. Follow each link to read the source.', all: 'Show all 9 cases', checked: 'Every case below was checked against its source on 6 October 2026.', newTab: '(opens in a new tab)' },

  noContract: {
    intro: (n, gbp) => `${plural(n, 'payee')}, ${fmtGBP(gbp)} paid, no contract on the register. That doesn't mean something is wrong. The contract may sit under a framework, fall below the publication threshold, or be missing from the register. There is no contract text to read here, so there is no clause to link and these amounts are not in the headline total.`,
    rowNote: 'No contract to read, so no clause to link.',
  },

  matching: {
    title: 'How matching works',
    body: `We clean each payee name (lower case, punctuation and words such as Ltd removed, short forms such as svcs expanded) and compare it with the supplier on each contract. An exact match, a cleaned match or a trading name taken from the contract is accepted. A similar name gets a score from 0 to 1: ${DEFAULTS.autoAcceptScore.toFixed(2)} or more is accepted, ${DEFAULTS.suggestScore.toFixed(2)} to ${(DEFAULTS.autoAcceptScore - 0.01).toFixed(2)} is suggested for you to confirm, and anything lower is left unmatched. Suggested and unmatched payments are not counted until you confirm them.`,
    notCounted: 'Suggested and unmatched payments are not counted until you confirm them.',
    attribution: "A payment is attributed to the supplier's contract whose dates contain the payment date. A payment after every end date is attributed to the supplier's latest-ending contract and shown separately. A payment that fits more than one contract stays unattributed.",
  },

  empty: {
    opportunitiesNoMatch: { title: 'No opportunities match these filters.', body: (n) => `Clear the filters to see all ${n}.`, button: 'Clear filters' },
    opportunitiesAllReviewed: 'Every opportunity has been reviewed. Reset your changes to see the starting list.',
    radarBand: 'No notice dates fall in this period. Nothing needs your decision here.',
    watch: 'No contracts are close to their cap without a projected breach.',
    matches: 'Every payee is matched or has no contract. There is nothing for you to review.',
    contractsNoMatch: { title: (q) => `No contracts match "${q}". Check the spelling or clear the search.`, button: 'Clear search' },
    sourcePage: { title: "This page isn't in the sample.", body: 'The sample includes only the pages that hold an extracted clause. Open the contract to see its other answers.', button: 'Open contract' },
    notFound: { title: 'Page not found.', body: "That address doesn't match a screen in this prototype. Go to the overview to continue.", button: 'Go to overview' },
  },

  errors: {
    export: 'Export failed. Your browser blocked the download. Allow downloads for this page and try again.',
    feedbackNoAnswer: "Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again.",
    feedbackBlocked: 'Feedback not saved. Your browser is blocking local storage. Copy your comments instead.',
    screen: { title: 'Something went wrong on this screen.', body: 'The screen could not be drawn because of an unexpected error in the prototype. Go to the overview and open the screen again, and if it keeps happening, tell the person running the demo.' },
  },

  toasts: {
    feedbackSaved: 'Feedback saved on this device. Thank you.',
    feedbackCopied: 'Feedback copied to your clipboard.',
    resetDone: 'Changes reset. The demo is back to its starting numbers.',
    inert: (name) => `${name} isn't part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo.`,
    handcheck: { correct: 'Answer marked correct.', incorrect: 'Answer marked incorrect.' },
    linkCopied: 'Link copied to your clipboard.',
    themeToDark: 'Switch to dark mode', themeToLight: 'Switch to light mode',
  },

  resetDialog: { title: 'Reset your changes?', body: 'This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device. The demo goes back to its starting numbers.', cancel: 'Cancel', confirm: 'Reset changes' },

  feedback: {
    title: 'Tell us what you think', question: 'Would you use this on your own contracts?', options: ['Yes', 'Maybe', 'No'],
    comment: 'What would make it more useful?', helper: 'Your answer stays on this device unless you copy it.', save: 'Save feedback', cancel: 'Cancel', copy: 'Copy feedback',
  },

  settings: { assumptionsBanner: 'Changing assumptions changes every indicative figure.', renewalRate: 'Renewal rate', nearCap: 'Close to cap threshold', reset: 'Reset demo changes' },

  buttons: {
    viewOpportunities: 'View opportunities', viewClause: 'View clause', viewClausePage: (n) => `View clause, page ${n}`, openContract: 'Open contract', openDemoGuide: 'Open demo guide',
    openRenewalRadar: 'Open renewal radar', giveFeedback: 'Give feedback', saveFeedback: 'Save feedback', copyFeedback: 'Copy feedback', seeWhatComesNext: 'See what comes next',
    exportOpportunities: 'Export opportunities', confirmMatch: 'Confirm match', rejectMatch: 'Reject match', clearFilters: 'Clear filters', clearSearch: 'Clear search',
    resetDemoChanges: 'Reset demo changes', resetChanges: 'Reset changes', previousAnswer: 'Previous answer', nextAnswer: 'Next answer', markCorrect: 'Mark answer as correct',
    markIncorrect: 'Mark answer as incorrect', backToOpportunity: 'Back to opportunity', showAllCases: 'Show all cases', showAll9Cases: 'Show all 9 cases', closeDialog: 'Close dialog', cancel: 'Cancel',
    seeCalculation: 'See calculation', showAllContracts: 'Show all 24 contracts',
  },

  // 7.9 titles and subtitles. The Overview H1 is the headline sentence (headlineSentence).
  pages: {
    overview: { title: 'Overview', eyebrow: `Overview · Marchbank Borough Council · as at ${AS_AT_LONG}` },
    opportunities: { title: 'Opportunities to investigate', subtitle: 'Ranked by indicative value. Each one links to the clause and page it came from.' },
    renewals: { title: 'Renewal radar', subtitle: 'Contracts whose notice date falls in the next 3, 6 and 12 months, and the ones where it has already passed.' },
    spend: { title: 'Cap vs spend', subtitle: 'What you have paid each supplier since the contract started, against the most the contract says you can pay.' },
    contracts: { title: 'Contracts', subtitle: (n) => `${n} contracts. Open one to see its nine financial answers and where each came from.` },
    contractDetail: { subtitle: (c) => `${c.supplierName} · ${c.serviceCategory} · ${c.procurementRoute}` },
    source: { subtitle: (c, page, pageCount) => `${c.title}, page ${page} of ${pageCount}` },
    method: { title: 'How this is calculated', subtitle: 'Every rule, threshold and assumption behind the numbers. Nothing here is hidden.' },
    roadmap: { title: 'Roadmap', subtitle: "What this prototype does, what comes next, and what needs data we don't have yet." },
    evidence: { title: 'Why this matters', subtitle: 'Public cases summarised from the Kontor scope document. Follow each link to read the source.' },
  },
  questionsGroupLabel: 'New financial questions',
  notFoundAnswer: 'Not found',

  // 7.11 with corrections: the 5% is a prototype assumption. Numbers come from the engine constants, never typed twice.
  method: [
    { id: 'as-of', title: 'As-of date', lead: `Every figure is calculated as at ${AS_AT_LONG}. The prototype never reads today's date.` },
    { id: 'notice', title: 'Notice deadline', lead: "Notice deadline = end of the current term minus the notice period. If the contract doesn't state a notice period, we use the end date and mark the answer for review." },
    { id: 'radar', title: 'Radar bands', lead: `Next 3 months runs to ${m3}, 3 to 6 months to ${m6}, and 6 to 12 months to ${m12}. A contract whose notice date has already passed is shown first, because nobody may be tracking it.` },
    { id: 'spend', title: 'Spend and attribution', lead: "We add up every payment over £500 to the supplier on the contract, from the contract start date. Payments made after the end date are included and shown separately. Payments we can't confidently link to a supplier are left out." },
    { id: 'matching', title: 'Supplier matching', lead: 'We clean each payee name and compare it with the supplier on each contract.' },
    { id: 'cap', title: 'Cap used', lead: `Cap used = spend since the contract started divided by the cap. Over cap is above 100%. Close to cap is ${pct0(DEFAULTS.nearCapThreshold)} to 100%. If a contract states no maximum we use its contract value. If the cap is per year, we test each contract year separately and don't pro-rate the current year. A contract value is an estimate, not a ceiling, so spend above it is labelled Above contract value (estimate) and its confidence is one step lower.` },
    { id: 'uplift', title: 'Price increase check', lead: `We compare payments in the last 12 months with the 12 months before. If the rise is more than ${Math.round(DEFAULTS.upliftTolerancePp * 100)} percentage point above the contract's cap on increases, and the difference is at least ${fmtGBP(DEFAULTS.upliftMinGBP)}, we flag it. Payments can rise for reasons other than price, such as more volume, so this is a prompt to check.` },
    { id: 'indicative', title: 'Indicative value', lead: `${pct0(DEFAULTS.renewalRate)} is a prototype assumption for renewals, set below the 8% the Local Government Association reported for Sheffield in 2012/13. You can change it in Settings.` },
    { id: 'ranking', title: 'Ranking', lead: 'Highest indicative value first. Ties go to the more severe flag, then the earlier action date.' },
    { id: 'confidence', title: 'Confidence', lead: 'Confidence is the lowest of the answers a flag relies on and, for spend flags, the weakest supplier match.' },
    { id: 'data', title: 'Data window and VAT', lead: 'Sample payments to 30 September 2026. Figures are net of irrecoverable VAT and compared with ex-VAT contract values.' },
    { id: 'limits', title: "What this doesn't do", lead: "It doesn't read invoices, check service performance, or compare with other councils. Those are on the roadmap." },
  ],

  // 7.8, with the spoken close from the critic (the spec line is for real public data; on screen the data is a simulation)
  demoSteps: (estate) => demoSteps(estate),
  presenterNotes: (estate) => presenterNotes(estate),
};

/** The four demo steps with live numbers. link.href is a hash; link.action 'feedback' means open the feedback dialog. */
export function demoSteps(estate) {
  const t = estate.totals;
  const flag = estate.flagsById && estate.flagsById['F-C-005-overCap'];
  const cs = flag && estate.derived[flag.contractId].cap;
  const clause = flag && flag.evidenceFields && estate.extractionsById[`X-${flag.contractId}-${flag.evidenceFields[0]}`];
  const page = clause ? clause.provenance[0].page : null;
  const ref = clause ? clause.provenance[0].clauseRef.replace(/^Clause /, 'clause ') : null;
  return [
    { n: 1, title: 'Headline', text: `Start with the number: ${headlineSentence(t)}. Point at the caveat and say why it is there.`, link: { label: 'Open overview', href: '#/overview' } },
    { n: 2, title: 'Renewal radar', text: 'Show what is coming up in the next 3, 6 and 12 months. Then show the two notice dates that have already passed.', link: { label: 'Open renewal radar', href: '#/renewals' } },
    {
      n: 3, title: 'One over-cap contract',
      text: flag && cs && page
        ? `Open the Highways reactive maintenance flag. ${fmtGBPCompact(cs.spendAgainstCap)} has been paid against a ${fmtGBPCompact(cs.capGBP)} maximum. Click View clause and land on ${ref}, page ${page}.`
        : 'Open the top spend over cap flag. Click View clause and land on the clause and page it came from.',
      link: { label: 'Open the highways flag', href: '#/opportunities?flag=F-C-005-overCap' },
    },
    { n: 4, title: 'Close', text: `Close on one line: ${CLOSE_LINE} You can say: "${SPOKEN_CLOSE}"`, link: { label: 'Give feedback', action: 'feedback' } },
  ];
}
export const demoExtras = [
  'Mark the highways flag as Explained and watch the headline drop. That is the caveat in action.',
  'Confirm the Larchmont match on Cap vs spend, matches tab, and watch Grounds maintenance move from close to cap to over cap.',
];

/** Presenter notes for the demo guide drawer. */
export function presenterNotes(estate) {
  const flagged = new Set(estate.flags.filter((f) => f.indicativeGBP > 0).map((f) => f.contractId)).size;
  const total = estate.data.contracts.length;
  return [
    `The sample is dense on purpose: ${flagged} of ${total} contracts (${(flagged / total * 100).toFixed(1)}%) carry a flag so every pattern is visible. A real estate would flag fewer. Say so if you are asked.`,
    `The ${pct0(DEFAULTS.renewalRate)} renewal rate is a prototype assumption until the cost baseline is agreed. You can change it in Settings.`,
    'Ingestion is not shown. Every answer appears already extracted, so do not claim that Kontor takes a batch of public PDFs without help.',
    'If you are challenged on the numbers, point to the caveat. A Local Government Association case study (Sefton, 2019) found that potential savings shrank once outliers were tested. That is why every figure is an opportunity to investigate and why you can mark a flag as explained.',
  ];
}

/** Plain-text feedback for the Copy feedback button. Entries: { at, answer, comment, asOf }. */
export function feedbackText(entries) {
  return entries.map((e) => `${e.at ? e.at.slice(0, 10) : ''} | Would use on own contracts: ${e.answer} | Comment: ${e.comment || 'None'} | Prototype as at ${e.asOf || AS_OF}`).join('\n');
}

export { fmtMonthYear };
