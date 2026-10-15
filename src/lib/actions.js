// Action tracker: the pure rules (build spec sections 7.2 to 7.4). No React, no storage, no clock: the caller passes `at` (an ISO
// timestamp) for log lines and notes, the only place the real clock is allowed. Everything else is measured from AS_OF.
//
// An action, actions[flagId]:
//   { flagId, contractId, flagType, flaggedGBP,          flaggedGBP: indicative value when the action started
//     stage: 'to_start' | 'checking' | 'with_supplier' | 'closed',
//     owner: personId | null, due: 'YYYY-MM-DD', steps: { [stepId]: true },
//     notes: [{ at, text }], log: [{ at, text }],       stored oldest first; the UI shows them newest first
//     outcome: null | 'resolved' | 'explained' | 'no_action', cashRecoveredGBP, costAvoidedGBP: number | null,
//     closeNote: string | null, closedAt: 'YYYY-MM-DD' | null (always AS_OF for a new closure),
//     archived: boolean (the flag went back to To investigate), example: boolean (pre-loaded history) }
//
// One status per opportunity: the review status (triage) and the board always agree. Every change goes through one of the
// transitions below, each returning the next { triage, actions } (never mutating its input):
//   setStatus(state, flag, status, at)             drawer select: Under review starts (or reopens) an action, To investigate archives it,
//                                                  a closing status closes it with no figures (the UI asks first, through closeAction)
//   startAction(state, flag, at)                   the "Start action" button: the same as setStatus(..., 'under_review')
//   closeAction(state, flag, close, at)            close = { outcome, cashRecoveredGBP, costAvoidedGBP, closeNote }; creates the action first if needed
//   moveAction(state, flag, stage, at)             board: between open stages, or a closed card back to an open stage (reopens it)
//   setOwner / setDue / toggleStep / addNote / logEmail(state, flag, ..., at)
//   `flag` is an engine flag (estate.flagsById[id]); `state` is { triage, actions }.
//
// Derived numbers (section 7.4): actionTotals(estate, actions), boardColumns(estate, actions, filters), resultsOf(actions), byMonth(actions).
import { AS_OF, addDays, fmtGBP } from './engine.js';
import { fmtDate } from './format.js';
import { peopleById } from '../data/people.js';
import { stepsFor, nextStep, STEPS } from '../data/action-steps.js';
import { SEED_ACTIONS, SEED_TRIAGE } from '../data/actions-seed.js';

export const STAGES = ['to_start', 'checking', 'with_supplier', 'closed'];
export const OPEN_STAGES = ['to_start', 'checking', 'with_supplier'];
export const STAGE_LABEL = { to_start: 'To start', checking: 'Checking internally', with_supplier: 'With supplier', closed: 'Closed' };
export const OUTCOMES = ['resolved', 'explained', 'no_action'];
export const OUTCOME_LABEL = { resolved: 'Resolved', explained: 'Explained', no_action: 'No action' };
/** Outcome -> review status, and back. */
export const OUTCOME_TRIAGE = { resolved: 'resolved', explained: 'explained', no_action: 'not_an_issue' };
export const TRIAGE_OUTCOME = { resolved: 'resolved', explained: 'explained', not_an_issue: 'no_action' };
export const CLOSING_STATUSES = new Set(Object.keys(TRIAGE_OUTCOME));
const STATUS_LABEL = { to_investigate: 'To investigate', under_review: 'Under review', resolved: 'Resolved', explained: 'Explained', not_an_issue: 'No action' };

export const DUE_DAYS = 14;              // a new action without a future action-by date is due 14 days after AS_OF
export const SOON_DAYS = 14;             // "Due in the next 14 days" (overdue included)
export const RECENT_DAYS = 30;           // the Closed column shows the last 30 days; older closures live in Results
export const CLOSE_NOTE_MAX = 140;
const MAX_LINES = 200;                   // log and notes kept per action

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const money = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
const clone = (v) => JSON.parse(JSON.stringify(v));
const personName = (id) => (peopleById[id] ? peopleById[id].name : '');

/* ---------------------------------------------------------------- seeds, first load and reset */

/** A fresh copy of the pre-loaded actions (never hand out the frozen seed objects). */
export const seedActions = () => clone(SEED_ACTIONS);
export const seedTriage = () => ({ ...SEED_TRIAGE });
/** First load: SEED_TRIAGE fills in any seeded flag that has no stored review status of its own. */
export const withSeedTriage = (storedTriage) => ({ ...SEED_TRIAGE, ...(storedTriage || {}) });

/* ---------------------------------------------------------------- sanitise on read */

const FLAG_ID = /^(F|H)-(C-\d{3})-(overCap|nearCap|renewal|uplift)$/;

/**
 * Keep only well-formed actions. Unknown stages, unknown outcomes and ids that are neither a flag id ('F-C-005-overCap') nor
 * example history ('H-C-024-uplift') on a known contract are dropped; negative or non-finite money becomes null.
 * contractIds: a Set of the contracts in the dataset.
 */
export function sanitiseActions(v, contractIds) {
  const out = {};
  if (!isObj(v)) return out;
  for (const [id, a] of Object.entries(v)) {
    const m = FLAG_ID.exec(id);
    if (!m || !isObj(a) || (contractIds && !contractIds.has(m[2]))) continue;
    if (!STAGES.includes(a.stage)) continue;
    const outcome = OUTCOMES.includes(a.outcome) ? a.outcome : null;
    if (a.stage === 'closed' && !outcome) continue;
    const valid = new Set(STEPS[m[3]].map((s) => s.id));
    const lines = (list) => (Array.isArray(list) ? list.filter((l) => isObj(l) && typeof l.text === 'string' && l.text).slice(-MAX_LINES).map((l) => ({ at: typeof l.at === 'string' ? l.at : '', text: l.text.slice(0, 500) })) : []);
    out[id] = {
      flagId: id, contractId: m[2], flagType: m[3], flaggedGBP: money(a.flaggedGBP) || 0,
      stage: a.stage, owner: peopleById[a.owner] ? a.owner : null, due: isDate(a.due) ? a.due : addDays(AS_OF, DUE_DAYS),
      steps: Object.fromEntries(Object.entries(isObj(a.steps) ? a.steps : {}).filter(([k, x]) => x === true && valid.has(k))),
      notes: lines(a.notes), log: lines(a.log),
      outcome, cashRecoveredGBP: money(a.cashRecoveredGBP), costAvoidedGBP: money(a.costAvoidedGBP),
      closeNote: typeof a.closeNote === 'string' && a.closeNote ? a.closeNote.slice(0, CLOSE_NOTE_MAX) : null,
      closedAt: a.stage === 'closed' && isDate(a.closedAt) ? a.closedAt : a.stage === 'closed' ? AS_OF : null,
      archived: a.archived === true, example: a.example === true,
    };
  }
  return out;
}

/* ---------------------------------------------------------------- transitions */

/** Due date of a new action: the flag's action-by date when it is on or after AS_OF, else AS_OF + 14 days. */
export const defaultDue = (flag) => (flag && isDate(flag.actionBy) && flag.actionBy >= AS_OF ? flag.actionBy : addDays(AS_OF, DUE_DAYS));

export function newAction(flag) {
  return {
    flagId: flag.id, contractId: flag.contractId, flagType: flag.type, flaggedGBP: Math.round(flag.indicativeGBP || 0),
    stage: 'to_start', owner: null, due: defaultDue(flag), steps: {}, notes: [], log: [],
    outcome: null, cashRecoveredGBP: null, costAvoidedGBP: null, closeNote: null, closedAt: null, archived: false, example: false,
  };
}

const log = (a, at, text) => ({ ...a, log: [...a.log, { at, text }].slice(-MAX_LINES) });
const put = (state, a, triage) => ({ triage: triage || state.triage, actions: { ...state.actions, [a.flagId]: a } });
const withStatus = (triage, flagId, status) => {
  const next = { ...triage };
  if (!status || status === 'to_investigate') delete next[flagId]; else next[flagId] = status;
  return next;
};
/** An open copy of a closed action: outcome and date cleared, the figures kept but no longer counted. */
const reopened = (a, stage) => ({ ...a, stage, outcome: null, closedAt: null, archived: false });

/** "You closed this as Resolved: £150,000 cash recovered." */
export function closeLogText(outcome, cash, cost) {
  const head = `You closed this as ${OUTCOME_LABEL[outcome]}`;
  if (outcome !== 'resolved') return head + '.';
  const parts = [cash > 0 ? `${fmtGBP(cash)} cash recovered` : null, cost > 0 ? `${fmtGBP(cost)} cost avoided` : null].filter(Boolean);
  return parts.length ? `${head}: ${parts.join(' and ')}.` : head + '.';
}

/**
 * The review status select (and anything else that sets a flag's status).
 * under_review   no action: create one in To start; archived: bring it back as it was; closed: reopen it in To start.
 * to_investigate archive it (the card leaves the board, the data stays); a closed one is reopened first so nothing stays counted.
 * resolved | explained | not_an_issue   close it with that outcome and no figures (the drawer asks for them first, then calls closeAction).
 */
export function setStatus(state, flag, status, at) {
  const cur = state.actions[flag.id];
  if (CLOSING_STATUSES.has(status)) return closeAction(state, flag, { outcome: TRIAGE_OUTCOME[status] }, at);
  if (status === 'under_review') {
    let a;
    if (!cur) a = newAction(flag);
    else if (cur.stage === 'closed') a = reopened(cur, 'to_start');
    else a = { ...cur, archived: false };
    a = log(a, at, `You set the review status to ${STATUS_LABEL.under_review}.`);
    return put(state, a, withStatus(state.triage, flag.id, 'under_review'));
  }
  // to_investigate (or a cleared status)
  const triage = withStatus(state.triage, flag.id, null);
  if (!cur) return { triage, actions: state.actions };
  let a = cur.stage === 'closed' ? reopened(cur, 'to_start') : cur;
  a = log({ ...a, archived: true }, at, `You set the review status to ${STATUS_LABEL.to_investigate}.`);
  return put(state, a, triage);
}

export const startAction = (state, flag, at) => setStatus(state, flag, 'under_review', at);

/** Close with an outcome and (for Resolved) your figures. Creates the action first when there is none. closedAt is always AS_OF. */
export function closeAction(state, flag, { outcome, cashRecoveredGBP = null, costAvoidedGBP = null, closeNote = null } = {}, at) {
  if (!OUTCOMES.includes(outcome)) return state;
  const base = state.actions[flag.id] ? { ...state.actions[flag.id], archived: false } : newAction(flag);
  const cash = outcome === 'resolved' ? money(cashRecoveredGBP) : base.cashRecoveredGBP;
  const cost = outcome === 'resolved' ? money(costAvoidedGBP) : base.costAvoidedGBP;
  const note = typeof closeNote === 'string' && closeNote.trim() ? closeNote.trim().slice(0, CLOSE_NOTE_MAX) : base.closeNote;
  let a = { ...base, stage: 'closed', outcome, cashRecoveredGBP: cash, costAvoidedGBP: cost, closeNote: note, closedAt: AS_OF };
  a = log(a, at, closeLogText(outcome, cash, cost));
  return put(state, a, withStatus(state.triage, flag.id, OUTCOME_TRIAGE[outcome]));
}

/** Board move. To Closed is closeAction (the UI asks first). A closed card moved to an open stage is reopened: Under review again. */
export function moveAction(state, flag, stage, at) {
  const cur = state.actions[flag.id];
  if (!cur || !OPEN_STAGES.includes(stage)) return state;
  if (cur.stage === 'closed') {
    const a = log(reopened(cur, stage), at, `You reopened this and moved it to ${STAGE_LABEL[stage]}.`);
    return put(state, a, withStatus(state.triage, flag.id, 'under_review'));
  }
  if (cur.stage === stage) return state;
  return put(state, log({ ...cur, stage }, at, `You moved this to ${STAGE_LABEL[stage]}.`));
}

export function setOwner(state, flag, personId, at) {
  const cur = state.actions[flag.id];
  const owner = peopleById[personId] ? personId : null;
  if (!cur || cur.owner === owner) return state;
  return put(state, log({ ...cur, owner }, at, owner ? `You set the owner to ${personName(owner)}.` : 'You cleared the owner.'));
}

export function setDue(state, flag, due, at) {
  const cur = state.actions[flag.id];
  if (!cur || !isDate(due) || cur.due === due) return state;
  return put(state, log({ ...cur, due }, at, `You set the due date to ${fmtDate(due)}.`));
}

export function toggleStep(state, flag, stepId, at) {
  const cur = state.actions[flag.id];
  const step = stepsFor(cur ? cur.flagType : flag).find((s) => s.id === stepId);
  if (!cur || !step) return state;
  const steps = { ...cur.steps };
  const on = !steps[stepId];
  if (on) steps[stepId] = true; else delete steps[stepId];
  return put(state, log({ ...cur, steps }, at, `You ${on ? 'ticked' : 'unticked'} "${step.text}"`));
}

export function addNote(state, flag, text, at) {
  const cur = state.actions[flag.id];
  const t = String(text || '').trim().slice(0, 500);
  if (!cur || !t) return state;
  return put(state, { ...cur, notes: [...cur.notes, { at, text: t }].slice(-MAX_LINES) });
}

/** kind 'copied' | 'sent': "You copied the email to Dana Okafor." / "You marked the email to Dana Okafor as sent." */
export function logEmail(state, flag, kind, recipientName, at) {
  const cur = state.actions[flag.id];
  if (!cur || !recipientName) return state;
  const text = kind === 'sent' ? `You marked the email to ${recipientName} as sent.` : `You copied the email to ${recipientName}.`;
  return put(state, log(cur, at, text));
}

/* ---------------------------------------------------------------- reading an action */

export const isOpen = (a) => !!a && !a.archived && OPEN_STAGES.includes(a.stage);
export const isClosed = (a) => !!a && !a.archived && a.stage === 'closed';
/** The action of a flag that is on the board (open or closed, not archived), or null. */
export const activeAction = (actions, flagId) => { const a = actions && actions[flagId]; return a && !a.archived ? a : null; };
export const stepProgress = (a) => { const all = stepsFor(a.flagType); return { done: all.filter((s) => a.steps[s.id]).length, total: all.length, next: nextStep(a.flagType, a.steps) }; };
export const valueOf = (a) => (a.outcome === 'resolved' ? (a.cashRecoveredGBP || 0) + (a.costAvoidedGBP || 0) : 0);
/** Activity, newest first: log lines and notes in one list. */
export function activityOf(a) {
  return [...a.log.map((l, i) => ({ ...l, kind: 'log', i })), ...a.notes.map((n, i) => ({ ...n, kind: 'note', i: 1000 + i }))]
    .sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : y.i - x.i));
}
/** Due chip state: 'overdue' (before AS_OF), 'soon' (within 14 days), or 'later'. */
export function dueState(due) {
  if (!isDate(due)) return 'later';
  if (due < AS_OF) return 'overdue';
  return due <= addDays(AS_OF, SOON_DAYS) ? 'soon' : 'later';
}

/* ---------------------------------------------------------------- derived numbers (section 7.4) */

const flagValue = (estate, a) => { const f = estate.flagsById[a.flagId]; return f ? f.indicativeGBP : a.flaggedGBP; };
/** An open action counts as "being worked on" only while its flag is in the estate and Under review. */
const working = (estate, a) => isOpen(a) && estate.flagsById[a.flagId] && estate.flagsById[a.flagId].status === 'under_review';

/**
 * Home strip and Board stat row.
 * { headlineGBP, beingWorkedGBP, notStartedGBP, noActionCount, openCount, dueSoonCount, valueSecuredGBP, resolvedCount, sinceMonth }
 */
export function actionTotals(estate, actions) {
  const list = Object.values(actions || {});
  const open = list.filter((a) => working(estate, a));
  const beingWorkedGBP = open.reduce((s, a) => s + flagValue(estate, a), 0);
  const soon = addDays(AS_OF, SOON_DAYS);
  const res = resultsOf(actions);
  return {
    headlineGBP: estate.totals.totalGBP,
    beingWorkedGBP,
    notStartedGBP: estate.totals.totalGBP - beingWorkedGBP,
    noActionCount: estate.ranked.filter((f) => f.indicativeGBP > 0 && f.status === 'to_investigate').length,
    openCount: open.length,
    dueSoonCount: open.filter((a) => a.due <= soon).length,
    valueSecuredGBP: res.valueSecuredGBP, resolvedCount: res.resolvedCount, sinceMonth: res.sinceMonth,
  };
}

/**
 * Results tab. Closed actions newest first, with the Value secured split.
 * { closed[], valueSecuredGBP, cashGBP, cashCount, costGBP, costCount, resolvedCount, explainedCount, noActionCount, sinceMonth, latestId }
 */
export function resultsOf(actions) {
  const closed = Object.values(actions || {}).filter(isClosed)
    .sort((a, b) => (a.closedAt < b.closedAt ? 1 : a.closedAt > b.closedAt ? -1 : a.flagId.localeCompare(b.flagId)));
  const resolved = closed.filter((a) => a.outcome === 'resolved');
  const cashGBP = resolved.reduce((s, a) => s + (a.cashRecoveredGBP || 0), 0);
  const costGBP = resolved.reduce((s, a) => s + (a.costAvoidedGBP || 0), 0);
  const first = closed.length ? closed[closed.length - 1].closedAt : null;
  return {
    closed, valueSecuredGBP: cashGBP + costGBP, cashGBP, costGBP,
    cashCount: resolved.filter((a) => a.cashRecoveredGBP > 0).length, costCount: resolved.filter((a) => a.costAvoidedGBP > 0).length,
    resolvedCount: resolved.length, explainedCount: closed.filter((a) => a.outcome === 'explained').length, noActionCount: closed.filter((a) => a.outcome === 'no_action').length,
    sinceMonth: first ? first.slice(0, 7) : null, latestId: closed.length ? closed[0].flagId : null,
  };
}

/** Value secured by month closed: [{ month: 'YYYY-MM', cashGBP, costGBP, totalGBP }] from April 2026 (or the first closure, if earlier) to the AS_OF month. */
export function byMonth(actions) {
  const res = resultsOf(actions).closed.filter((a) => a.outcome === 'resolved');
  const asOfMonth = AS_OF.slice(0, 7);
  const first = res.length ? res[res.length - 1].closedAt.slice(0, 7) : asOfMonth;
  let m = first < '2026-04' ? first : '2026-04';
  const out = [];
  while (m <= asOfMonth) {
    const mine = res.filter((a) => a.closedAt.slice(0, 7) === m);
    const cashGBP = mine.reduce((s, a) => s + (a.cashRecoveredGBP || 0), 0);
    const costGBP = mine.reduce((s, a) => s + (a.costAvoidedGBP || 0), 0);
    out.push({ month: m, cashGBP, costGBP, totalGBP: cashGBP + costGBP, count: mine.length });
    const [y, mo] = m.split('-').map(Number);
    m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
  }
  return out;
}

/**
 * The board: four columns of cards, each card sorted by due date (soonest first).
 * filters: { owner?: personId, type?: flagType }. The Closed column holds closures in the last 30 days up to AS_OF.
 * -> [{ stage, label, cards: [{ action, flag, value }], count, totalGBP }]
 */
export function boardColumns(estate, actions, { owner = null, type = null } = {}) {
  const recent = addDays(AS_OF, -RECENT_DAYS);
  const cards = Object.values(actions || {}).filter((a) => !a.archived && estate.flagsById[a.flagId])
    .filter((a) => (!owner || a.owner === owner) && (!type || a.flagType === type))
    .filter((a) => a.stage !== 'closed' || (a.closedAt >= recent && a.closedAt <= AS_OF))
    .map((a) => ({ action: a, flag: estate.flagsById[a.flagId], value: a.stage === 'closed' ? a.flaggedGBP : flagValue(estate, a) }));
  const sortKey = (c) => (c.action.stage === 'closed' ? c.action.closedAt : c.action.due);
  return STAGES.map((stage) => {
    const mine = cards.filter((c) => c.action.stage === stage)
      .sort((x, y) => (stage === 'closed' ? (sortKey(x) < sortKey(y) ? 1 : sortKey(x) > sortKey(y) ? -1 : 0) : (sortKey(x) < sortKey(y) ? -1 : sortKey(x) > sortKey(y) ? 1 : 0)) || x.action.flagId.localeCompare(y.action.flagId));
    return { stage, label: STAGE_LABEL[stage], cards: mine, count: mine.length, totalGBP: mine.reduce((s, c) => s + c.value, 0) };
  });
}

/** People who own at least one action on the board (for the Owner filter), in staff-list order. */
export function ownersOnBoard(estate, actions) {
  const ids = new Set(Object.values(actions || {}).filter((a) => !a.archived && a.owner && estate.flagsById[a.flagId]).map((a) => a.owner));
  return Object.keys(peopleById).filter((id) => ids.has(id)).map((id) => peopleById[id]);
}

/* ---------------------------------------------------------------- what has changed since the demo started */

const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Review statuses that differ from the starting (seeded) ones. */
export function triageChanges(triage) {
  const keys = new Set([...Object.keys(triage || {}), ...Object.keys(SEED_TRIAGE)]);
  return [...keys].filter((k) => (triage || {})[k] !== SEED_TRIAGE[k]).length;
}
/** Actions that differ from the pre-loaded ones (added, changed or removed). */
export function actionChanges(actions) {
  const keys = new Set([...Object.keys(actions || {}), ...Object.keys(SEED_ACTIONS)]);
  return [...keys].filter((k) => !sameJSON((actions || {})[k], SEED_ACTIONS[k])).length;
}
/** [count, singular, plural?] for every kind of change, in the order the Settings drawer and the Guide print them. */
export function changeParts(state) {
  return [
    [triageChanges(state.triage), 'review'],
    [actionChanges(state.actions), 'action'],
    [Object.keys(state.decisions || {}).length, 'match decision'],
    [Object.keys(state.handcheck || {}).length, 'hand-check'],
    [(state.feedback || []).length, 'feedback entry', 'feedback entries'],
    [Object.keys(state.assumptions || {}).length, 'assumption'],
  ];
}
export const changeCount = (state) => changeParts(state).reduce((s, [n]) => s + n, 0);
