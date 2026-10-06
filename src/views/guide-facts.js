// G1: every number and every "what you should see" on the Guide page, computed from the estate. Nothing here is typed twice.
//
//   guideFacts(estate, state) -> facts   pure; the Guide calls it inside useMemo.
//
// "What if" figures (the headline after you mark a flag as Explained, after you confirm a match, after you change the renewal rate)
// are the engine's own answer: computeEstate() with the one change applied on top of YOUR current reviews, decisions and assumptions,
// so the sentence on the page matches what the screen will show when you do it. `start` is the estate with no changes at all.
//
// Ids that name things in the sample (the payee name Larchmont Grounds Maintenance) live here as constants: they are facts about the
// dataset, and every lookup is guarded so the page degrades to a shorter sentence if the dataset ever changes.
import { computeEstate, handcheckSummary } from '../lib/estate.js';
import { evidenceFor } from '../lib/evidenceFor.js';
import { confidenceBand } from '../lib/copy.js';
import { plural } from '../lib/format.js';

export const PAYEE = 'Larchmont Grounds Maintenance';   // the one suggested match in the sample (Cap vs spend, Supplier matches)
export const RATE_TARGET = 0.08;                          // the Settings choice the Guide asks you to try
export const RATE_FALLBACK = 0.03;                        // used when you are already on RATE_TARGET

const without = (obj, key) => { const o = { ...obj }; delete o[key]; return o; };

/** '1 review, 2 match decisions, ...' parts for "Changed on this device" (same counting as the Settings drawer). */
export function changeCounts(state) {
  return [
    [Object.keys(state.triage || {}).length, 'review'],
    [Object.keys(state.decisions || {}).length, 'match decision'],
    [Object.keys(state.handcheck || {}).length, 'hand-check'],
    [(state.feedback || []).length, 'feedback entry', 'feedback entries'],
    [Object.keys(state.assumptions || {}).length, 'assumption'],
  ].filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));
}

export function guideFacts(estate, state) {
  const base = { decisions: state.decisions || {}, triage: state.triage || {}, assumptions: state.assumptions || {} };
  const what = (patch) => computeEstate({ ...base, ...patch });
  const start = computeEstate();
  const opts = estate.opts;

  // ---- the numbers that move the estate away from the starting point (Pill and notes)
  const moved = Object.keys(base.triage).length + Object.keys(base.decisions).length + Object.keys(base.assumptions).length > 0;

  // ---- tour step 3 and the Try rows 2 and 5: the top spend over cap flag, its cap, its clause
  const topFlag = estate.ranked.find((f) => f.type === 'overCap') || null;
  const topContract = topFlag ? estate.contractsById[topFlag.contractId] : null;
  const topCap = topFlag ? estate.derived[topFlag.contractId].cap : null;
  const topClause = topFlag ? evidenceFor(topFlag) : null;
  const topDoc = topContract ? estate.data.documents[topContract.documentId] : null;

  // ---- Try row 2: mark that flag as Explained (or, if you already have, clear it)
  let explain = null;
  if (topFlag) {
    const status = base.triage[topFlag.id] || 'to_investigate';
    const explained = status === 'explained';
    const other = explained ? what({ triage: without(base.triage, topFlag.id) }) : what({ triage: { ...base.triage, [topFlag.id]: 'explained' } });
    explain = { status, explained, now: estate.totals, other: other.totals };
  }

  // ---- Try row 3 and FAQ 3: confirm the suggested supplier match
  let match = null;
  const m = estate.matches.get(PAYEE);
  if (m && m.supplierId) {
    const decision = base.decisions[PAYEE] || null;
    const confirmed = decision === 'confirm';
    const contracts = estate.data.contracts.filter((c) => c.supplierId === m.supplierId);
    const alt = confirmed ? what({ decisions: without(base.decisions, PAYEE) }) : what({ decisions: { ...base.decisions, [PAYEE]: 'confirm' } });
    const after = confirmed ? estate : alt;
    const before = confirmed ? alt : estate;
    // the contract the payments land on: the one whose cap use moves most
    const cid = contracts.map((c) => c.id).sort((a, b) => (after.derived[b].cap.utilisation - before.derived[b].cap.utilisation) - (after.derived[a].cap.utilisation - before.derived[a].cap.utilisation))[0];
    if (cid) {
      match = {
        payee: PAYEE, decision, confirmed, status: m.status, paymentCount: m.paymentCount, totalGBP: m.totalGBP, score: m.score,
        contract: estate.contractsById[cid],
        before: { cap: before.derived[cid].cap, totals: before.totals },
        after: { cap: after.derived[cid].cap, totals: after.totals },
      };
    }
  }

  // ---- Try row 4: change the renewal rate
  const rateTarget = Math.abs(opts.renewalRate - RATE_TARGET) < 1e-9 ? RATE_FALLBACK : RATE_TARGET;
  const rateAfter = what({ assumptions: { ...base.assumptions, renewalRate: rateTarget } });
  const rate = { now: opts.renewalRate, target: rateTarget, nowTotals: estate.totals, afterTotals: rateAfter.totals };

  // ---- cap states and the answers that need review
  const capStates = { over: 0, near: 0, ok: 0 };
  for (const r of estate.capRows) { if (r.capState === 'over' || r.capState === 'above_estimate') capStates.over += 1; else if (r.capState === 'near') capStates.near += 1; else capStates.ok += 1; }
  const partialCaps = estate.capRows.filter((r) => estate.summaries[r.contractId] && estate.summaries[r.contractId].coverage === 'partial').length;
  const answersToReview = estate.data.extractions.filter((x) => confidenceBand(x.confidence) === 'review').length;
  const flagsToReview = estate.ranked.filter((f) => f.confidence === 'low').length;

  return {
    start: { totals: start.totals },
    moved,
    changes: changeCounts(state),
    handcheck: handcheckSummary(state),
    top: { flag: topFlag, contract: topContract, cap: topCap, clause: topClause, doc: topDoc },
    explain, match, rate,
    capStates, partialCaps, answersToReview, flagsToReview,
    counts: {
      contracts: estate.data.contracts.length,
      payments: estate.data.payments.length,
      answers: estate.data.extractions.length,
      flaggedContracts: estate.totals.contractCount,
      ranked: estate.ranked.length,
    },
  };
}
