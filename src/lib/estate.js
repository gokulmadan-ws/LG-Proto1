// The estate: sample data + engine + the user's local decisions, in one provider.
//
//   <EstateProvider>...</EstateProvider>          mounted once by A1 in App.jsx
//   const { estate, state, actions, storage } = useEstate();
//   computeEstate({ decisions, triage, assumptions })   pure; the provider calls it, tests call it
//
// estate (superset of blueprint section 3; recomputed on every triage, match decision or assumption change, about 6 ms):
//   data              the whole dataset (council, suppliers, aliases, questions, contracts, extractions, documents, payments)
//   opts              engine constants in force: { ...DEFAULTS, ...assumptions }
//   asOf              '2026-10-06' (fixed, never the clock)           council   data.council
//   matches           Map<rawName, SupplierMatch>                      matchList  the same as an array, largest total first
//   attributed        AttributedPayment[]  { payment, supplierId, contractId, period, matchScore }
//   flags             every Flag (including the GBP 0 watch flags)     ranked     counted-or-reviewed flags with GBP > 0, in rank order
//   watch             flags with indicative GBP 0 (Watch list)         flagsById  { 'F-C-005-overCap': Flag }
//   derived[cid]      { band, deadline, usedEndDate, status: 'live'|'ended', latestEndDate, nextReviewDate, spend, cap, uplift, flagIds }
//   summaries[cid]    spend summary (same object as derived[cid].spend)
//   totals            { totalGBP, contractCount, byType, countByType, excludedGBP, excludedCount }   headline numbers (counted flags only)
//   coverage          { totalGBP, linkedGBP, linkedPct, noContract[], noContractGBP, awaitingReview[], awaitingReviewGBP }
//   radar             { boundaries: { m3, m6, m12 }, groups: { passed, ended, m3, m6, m12, later, history }, attention[] }  each group { key, count, annualGBP, totalGBP, items[] }
//   capRows           every contract with a testable cap, highest utilisation first (R37 default sort): [{ contractId, ...derived[contractId].cap }]
//   contractsById, extractionsById, extractionsByContract[cid] (Q1 to Q9 field order), paymentsByContract[cid] (AttributedPayment[] in date order)
//
// state (persisted in localStorage keys kontor-triage, kontor-matches, kontor-assumptions, kontor-handcheck, kontor-feedback):
//   triage       { [flagId]: 'under_review' | 'explained' | 'not_an_issue' }      absent = 'to_investigate'
//   decisions    { [rawPayeeName]: 'confirm' | 'reject' }
//   assumptions  { renewalRate?: number, nearCapThreshold?: number }              absent = engine default
//   handcheck    { [extractionId]: 'correct' | 'incorrect' }
//   feedback     [{ at: ISO timestamp, answer: 'yes'|'maybe'|'no', comment, asOf }]
//
// actions: setTriage(flagId, status|null) · setDecision(rawName, 'confirm'|'reject'|null) · setAssumption(key, value|null)
//          setHandcheck(extractionId, 'correct'|'incorrect'|null) · addFeedback(entry) -> { ok, reason? } · resetAll()
//   addFeedback returns { ok: true } or { ok: false, reason: 'no_answer' | 'storage_blocked' } (nothing is kept when it is not saved).
// storage: { blocked }  true once any write could not reach localStorage (private window, blocked site data). Everything still works for the session.
//
// ---------------------------------------------------------------------------------------------------------------------------------
// Dataset and the contract document PAGE SCHEMA (what the Source viewer renders). data.documents[contract.documentId]:
//   { id: 'DOC-C-005', contractId, title: 'Highways reactive maintenance and minor works: agreement', pageCount: 70, isIllustrative: true,
//     pages: { [pageNumber]: Block[] } }          only pages that hold an extracted answer exist; any other page is the "not in the sample" state
// A page is an ordered array of blocks:
//   { kind: 'header',  text }   running header, exactly 'Marchbank Borough Council | <document title> | Page 23 of 70'
//   { kind: 'heading', num?, text }   '14' + 'Charges and Maximum Contract Value'  ->  "14. Charges and ..."   |   'Schedule 3' + 'Schedule of rates'  ->  "Schedule 3: ..."   |   no num: 'Contract Particulars'
//   { kind: 'clause', num, title?, text, clauseRef?, extractionIds? }   numbered clause, schedule paragraph or table ('14.3', '2.1', 'Table 1'); title is the bold lead-in ('Maximum Contract Value')
//   { kind: 'item',   num, text, clauseRef?, extractionIds? }           one row of the Contract Particulars table ('4' + 'Commencement Date: 1 June 2022.')
//   { kind: 'footer',  text }   'Execution version | Contract ref C-005 | Fennimore Highways Ltd'
// A block is CITED when it has extractionIds. Its text is EXACTLY the quote of every extraction it lists and clauseRef is the citation string
// ('Clause 14.3'), so the highlight is `block.extractionIds?.includes(extractionId)`. noticePeriod and autoRenewal share one block (Clause 31.1).
// Every cited page has 1 header, 1 heading, 4 to 6 non-cited neighbouring clauses (6 on C-005, C-001 and C-004), the cited block(s) and 1 footer.
// Extraction: { id: 'X-C-005-maximumValue', contractId, questionId: 'Q1', fieldKey, answer, answerType, status: 'found'|'not_found'|'needs_review', confidence,
//               provenance: [{ documentId, page, clauseRef, quote }] }. Contract: see docs/handoff/A2.md (adds `source`, `documentId`, `extractionIds`, `confidence`).
//
// Time: this module never reads the clock for a derivation. The only clock use is the timestamp on a saved feedback entry.
import { createContext, createElement, useContext, useMemo, useRef, useState } from 'react';
import data from '../data/sample.json' with { type: 'json' };
import * as E from './engine.js';
import { KEYS, getJSON, setJSON, clearKontorKeys, storageAvailable } from './storage.js';

export { evidenceFor, evidenceAll, evidenceForField, sourceHref } from './evidenceFor.js'; // flag -> source viewer target, also importable from here

export { data };
export const AS_OF = E.AS_OF;
export const DEFAULTS = E.DEFAULTS;

export const TRIAGE_STATUSES = ['to_investigate', 'under_review', 'explained', 'not_an_issue'];
/** The values the Settings drawer offers (V7). Any number in range is accepted if you set one in code. */
export const ASSUMPTION_OPTIONS = { renewalRate: [0.03, 0.05, 0.08], nearCapThreshold: [0.8, 0.85, 0.9] };
const ASSUMPTION_RANGE = { renewalRate: [0.001, 0.5], nearCapThreshold: [0.5, 0.99] };
const ANSWERS = ['yes', 'maybe', 'no'];
const MAX_FEEDBACK = 50;

/* ---------------------------------------------------------------- static lookups (the dataset never changes at runtime) */

const contractsById = Object.fromEntries(data.contracts.map((c) => [c.id, c]));
const extractionsById = Object.fromEntries(data.extractions.map((x) => [x.id, x]));
const fieldOrder = [];
for (const q of data.questions) for (const f of q.fields) fieldOrder.push(f);
const extractionsByContract = {};
for (const c of data.contracts) extractionsByContract[c.id] = fieldOrder.map((f) => extractionsById[c.extractionIds[f]]).filter(Boolean);

/* ---------------------------------------------------------------- the pure computation */

/**
 * Recompute the whole estate. Pure: same input, same output; no clock, no storage.
 * @param {{decisions?: object, triage?: object, assumptions?: object}} input
 */
export function computeEstate({ decisions = {}, triage = {}, assumptions = {} } = {}) {
  const opts = { ...E.DEFAULTS, ...assumptions };
  const matches = E.buildMatches(data.payments, data.suppliers, data.aliases, decisions, opts);
  const attributed = E.attribute(data.payments, matches, data.contracts);
  const res = E.buildFlags({ council: data.council, contracts: data.contracts, matches, attributed }, opts, E.AS_OF, triage);
  const flagsById = {};
  for (const f of res.flags) flagsById[f.id] = f;
  const paymentsByContract = {};
  for (const a of attributed) { if (a.contractId) (paymentsByContract[a.contractId] ||= []).push(a); }
  return {
    data, opts, asOf: E.AS_OF, council: data.council,
    matches, matchList: [...matches.values()].sort((a, b) => b.totalGBP - a.totalGBP || a.rawName.localeCompare(b.rawName)),
    attributed, ...res, flagsById,
    coverage: E.coverage(attributed, matches),
    radar: E.buildRadar(data.contracts, res.derived, res.flags, E.AS_OF),
    capRows: data.contracts.filter((c) => res.derived[c.id].cap.testable).map((c) => ({ contractId: c.id, ...res.derived[c.id].cap })).sort((a, b) => b.utilisation - a.utilisation || a.contractId.localeCompare(b.contractId)),
    contractsById, extractionsById, extractionsByContract, paymentsByContract,
  };
}

/**
 * The payments behind a contract's spend figure (R38), split so the subtotal reconciles to the penny.
 * { all, inTerm, afterEnd, totalGBP, afterEndGBP, inTermGBP }  (all = inTerm + afterEnd, in date order)
 */
export function paymentsFor(estate, contractId) {
  const all = estate.paymentsByContract[contractId] || [];
  const afterEnd = all.filter((a) => a.period === 'after_end');
  const inTerm = all.filter((a) => a.period !== 'after_end');
  const sum = (list) => Math.round(list.reduce((s, a) => s + a.payment.amountGBP, 0) * 100) / 100;
  return { all, inTerm, afterEnd, totalGBP: sum(all), inTermGBP: sum(inTerm), afterEndGBP: sum(afterEnd) };
}

/** { checked, total, correct, incorrect } for "{n} of 336 answers checked by hand". */
export function handcheckSummary(state) {
  const ids = Object.keys(state.handcheck || {}).filter((id) => extractionsById[id]);
  return { checked: ids.length, total: data.extractions.length, correct: ids.filter((id) => state.handcheck[id] === 'correct').length, incorrect: ids.filter((id) => state.handcheck[id] === 'incorrect').length };
}

/* ---------------------------------------------------------------- persistence (never throws; corrupt JSON is ignored) */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const EMPTY_STATE = Object.freeze({ triage: {}, decisions: {}, assumptions: {}, handcheck: {}, feedback: [] });

export function sanitiseTriage(v) {
  const out = {};
  if (isObj(v)) for (const [k, s] of Object.entries(v)) if (TRIAGE_STATUSES.includes(s) && s !== 'to_investigate') out[k] = s;
  return out;
}
export function sanitiseDecisions(v) {
  const out = {};
  if (isObj(v)) for (const [k, s] of Object.entries(v)) if (s === 'confirm' || s === 'reject') out[k] = s;
  return out;
}
export function sanitiseAssumptions(v) {
  const out = {};
  if (isObj(v)) for (const [k, n] of Object.entries(v)) { const r = ASSUMPTION_RANGE[k]; if (r && typeof n === 'number' && Number.isFinite(n) && n >= r[0] && n <= r[1]) out[k] = n; }
  return out;
}
export function sanitiseHandcheck(v) {
  const out = {};
  if (isObj(v)) for (const [k, s] of Object.entries(v)) if ((s === 'correct' || s === 'incorrect') && extractionsById[k]) out[k] = s;
  return out;
}
export function sanitiseFeedback(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((e) => isObj(e) && ANSWERS.includes(e.answer)).slice(-MAX_FEEDBACK).map((e) => ({ at: typeof e.at === 'string' ? e.at : '', answer: e.answer, comment: typeof e.comment === 'string' ? e.comment : '', asOf: typeof e.asOf === 'string' ? e.asOf : E.AS_OF }));
}

/** Read every persisted key. `io.getJSON(key, fallback)` defaults to A1's safe storage; tests inject a throwing or corrupt one. */
export function readPersisted(io = { getJSON }) {
  const get = (key, fallback) => { try { const v = io.getJSON(key, fallback); return v === undefined ? fallback : v; } catch (e) { return fallback; } };
  return {
    triage: sanitiseTriage(get(KEYS.triage, {})),
    decisions: sanitiseDecisions(get(KEYS.matches, {})),
    assumptions: sanitiseAssumptions(get(KEYS.assumptions, {})),
    handcheck: sanitiseHandcheck(get(KEYS.handcheck, {})),
    feedback: sanitiseFeedback(get(KEYS.feedback, [])),
  };
}

/* ---------------------------------------------------------------- provider and hook */

const EstateContext = createContext(null);

/**
 * Wrap the app once. Props: `initial` (optional partial state, for dev entries and tests; skips reading storage), children.
 * Every write goes through A1's storage helper, which falls back to memory when localStorage throws.
 */
export function EstateProvider({ children, initial }) {
  const [state, setState] = useState(() => (initial ? { ...EMPTY_STATE, ...initial } : readPersisted()));
  const [blocked, setBlocked] = useState(() => { try { return !storageAvailable(); } catch (e) { return true; } });
  const ref = useRef(state);
  ref.current = state;

  const actions = useMemo(() => {
    const commit = (key, storageKey, value) => {
      const next = { ...ref.current, [key]: value };
      ref.current = next;
      setState(next);
      let ok = true;
      try { ok = setJSON(storageKey, value); } catch (e) { ok = false; }
      if (!ok) setBlocked(true);
      return ok;
    };
    return {
      setTriage(flagId, status) {
        const next = { ...ref.current.triage };
        if (!status || status === 'to_investigate' || !TRIAGE_STATUSES.includes(status)) delete next[flagId]; else next[flagId] = status;
        commit('triage', KEYS.triage, next);
      },
      setDecision(rawName, decision) {
        const next = { ...ref.current.decisions };
        if (decision === 'confirm' || decision === 'reject') next[rawName] = decision; else delete next[rawName];
        commit('decisions', KEYS.matches, next);
      },
      setAssumption(key, value) {
        const next = { ...ref.current.assumptions };
        const range = ASSUMPTION_RANGE[key];
        if (!range) return;
        if (value === null || value === undefined || value === E.DEFAULTS[key]) delete next[key];
        else if (typeof value === 'number' && value >= range[0] && value <= range[1]) next[key] = value;
        else return;
        commit('assumptions', KEYS.assumptions, next);
      },
      setHandcheck(extractionId, value) {
        const next = { ...ref.current.handcheck };
        if ((value === 'correct' || value === 'incorrect') && extractionsById[extractionId]) next[extractionId] = value; else delete next[extractionId];
        commit('handcheck', KEYS.handcheck, next);
      },
      addFeedback(entry) {
        const answer = entry && typeof entry.answer === 'string' ? entry.answer.toLowerCase() : '';
        if (!ANSWERS.includes(answer)) return { ok: false, reason: 'no_answer' };
        // The one place the clock is read: the timestamp on a saved comment. Nothing derived from it.
        const at = entry.at || new Date().toISOString();
        const list = [...ref.current.feedback, { at, answer, comment: String(entry.comment || '').slice(0, 2000), asOf: E.AS_OF }].slice(-MAX_FEEDBACK);
        let ok = false;
        try { ok = setJSON(KEYS.feedback, list); } catch (e) { ok = false; }
        if (!ok) { setBlocked(true); return { ok: false, reason: 'storage_blocked' }; }
        const next = { ...ref.current, feedback: list };
        ref.current = next;
        setState(next);
        return { ok: true };
      },
      resetAll() {
        try { clearKontorKeys(); } catch (e) { /* storage blocked: the in-memory state below is still reset */ }
        ref.current = { ...EMPTY_STATE };
        setState(ref.current);
      },
    };
  }, []);

  const estate = useMemo(() => computeEstate({ decisions: state.decisions, triage: state.triage, assumptions: state.assumptions }), [state.decisions, state.triage, state.assumptions]);
  const value = useMemo(() => ({ estate, state, actions, storage: { blocked } }), [estate, state, actions, blocked]);
  return createElement(EstateContext.Provider, { value }, children);
}

/** { estate, state, actions, storage } . Throws a clear error when used outside <EstateProvider>. */
export function useEstate() {
  const v = useContext(EstateContext);
  if (!v) throw new Error('useEstate() must be used inside <EstateProvider>. Mount the provider once, above the router, in App.jsx.');
  return v;
}

export default useEstate;
