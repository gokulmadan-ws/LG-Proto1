// UI copy for the action tracker (build spec sections 8.1 to 8.6): the drawer's Action tab, the close dialog, the Actions page (Board and
// Results), the Home strip and the small additions to other screens. Same voice as src/lib/copy.js: sentence case, "you", no exclamation
// marks, no emoji, [Verb]+[Object] buttons. The money-back measure is "Value secured" (D7). The copy lint in tests/engine.test.mjs walks
// every string here, and calls every function with sample arguments.
import { AS_OF } from './engine.js';
import { fmtDate, fmtDateLong, fmtGBP, inDaysText } from './copy.js';
import { plural } from './format.js';
import { STAGE_LABEL, OUTCOME_LABEL } from './actions.js';

export { STAGE_LABEL, OUTCOME_LABEL };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-05' -> 'May 2026' / 'May'. */
export const monthLong = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
export const monthShort = (ym) => MONTHS_SHORT[Number(ym.slice(5, 7)) - 1];
/** '6 Oct' (day and short month). */
export const dayMonth = (iso) => fmtDate(iso).replace(/ \d{4}$/, '');

/** A log line's time, in UK time so every viewer sees the same: '6 Oct, 10:12'. */
export function whenText(at) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day} ${p.month === 'Sept' ? 'Sep' : p.month}, ${p.hour}:${p.minute}`;
}

/** 'Due 16 Oct' | 'Overdue, due 2 Oct' | 'Notice by 31 Oct' (renewals). */
export function dueChipText(due, flagType, state) {
  if (!due) return '';
  if (state === 'overdue') return `Overdue, due ${dayMonth(due)}`;
  return flagType === 'renewal' ? `Notice by ${dayMonth(due)}` : `Due ${dayMonth(due)}`;
}

export const ACT = {
  /* ---------------------------------------------------------------- drawer */
  tabs: { label: 'Opportunity views', details: 'Details', action: 'Action' },
  footer: {
    stage: (stage) => `Counted in the headline. Stage: ${STAGE_LABEL[stage]}.`,
    closed: (outcome) => `Closed as ${OUTCOME_LABEL[outcome]}.`,
  },
  empty: {
    title: 'Nobody is working on this yet.',
    body: 'Start an action to give it an owner, a due date and next steps. It puts a card on the Actions board and keeps the headline as it is.',
    button: 'Start action',
  },
  /** '£150,000 cash recovered' | '£12,400 cash recovered and £31,200 cost avoided' | '' */
  valueText: (cash, cost) => [cash > 0 ? `${fmtGBP(cash)} cash recovered` : null, cost > 0 ? `${fmtGBP(cost)} cost avoided` : null].filter(Boolean).join(' and '),
  closedSummary: {
    resolved: (cash, cost) => [cash > 0 ? `${fmtGBP(cash)} cash recovered` : null, cost > 0 ? `${fmtGBP(cost)} cost avoided` : null].filter(Boolean).join(' and ') + ' (your figures).',
    on: (closedAt) => `Closed on ${fmtDateLong(closedAt)}.`,
    reopen: 'To reopen it, choose an open stage below.',
  },
  who: {
    title: 'Who and when', stage: 'Stage', owner: 'Owner', due: 'Due', notSet: 'Not set',
    dueHelp: (iso) => `${fmtDate(iso)}, ${inDaysText(iso, AS_OF)}`,
  },
  steps: { title: 'Next steps', done: (d, t) => `${d} of ${t} done` },
  contacts: {
    title: 'Who to contact', note: 'Sample names', staff: 'Staff list',
    source: (label, clauseRef, page) => `${label} · ${clauseRef}, page ${page}`,
    showClause: 'Show the clause', quoteLabel: 'From the contract',
    why: (kindLabel, why) => `${kindLabel}. ${why}`,
    supplierRole: (role, supplier) => `${role}, ${supplier}`,
  },
  email: {
    title: 'Draft email', note: 'Check before you send', to: 'To', subject: 'Subject', body: 'Email body',
    toOption: (name, email) => `${name} · ${email}`,
    copy: 'Copy email', sent: 'Mark as sent', hint: 'Copy and Mark as sent add a line to the activity log. Kontor never sends email.',
    copied: (name) => `Email copied. Paste it into your email app and send it to ${name}.`,
    blocked: 'Your browser blocked copying. The email text is selected, so press Ctrl+C or Cmd+C.',
    markedSent: (name) => `Marked as sent to ${name}.`,
  },
  exit: {
    title: 'Exit terms', note: 'From the contract', convenience: 'End for convenience', fee: 'Exit fee', ends: 'Contract ends',
    yes: (months) => `Yes, ${months} ${months === 1 ? "month's" : "months'"} notice`, no: 'No', none: 'None', notFound: 'Not found',
    clause: (clauseRef, page) => `${clauseRef}, page ${page}`,
  },
  activity: { title: 'Activity', noteLabel: 'Add a note', addNote: 'Add note', empty: 'Nothing has happened on this action yet.', noteTag: 'Note' },
  toast: {
    added: (title) => `${title}: added to Actions.`,
    addedDesc: (headline, changed, hasOwner) => `The headline is ${changed ? 'now' : 'still'} ${headline}.${hasOwner ? '' : ' Set an owner to get started.'}`,
    open: 'Open in Actions',
    archived: (title) => `${title}: marked To investigate.`,
    archivedDesc: (headline) => `The card has left the Actions board. Its notes and log are kept. The headline is now ${headline}.`,
    closed: (title, outcome) => `${title}: closed as ${OUTCOME_LABEL[outcome]}.`,
    valueNow: (gbp) => `Value secured is now ${fmtGBP(gbp)}.`,
    headlineNow: (headline) => `The headline is now ${headline}.`,
    moved: (title, stage) => `${title}: moved to ${STAGE_LABEL[stage]}.`,
    reopened: (title, stage) => `${title}: reopened in ${STAGE_LABEL[stage]}.`,
  },

  /* ---------------------------------------------------------------- close dialog */
  dialog: {
    title: 'Close this action',
    subtitle: (contract, type, flagged) => `${contract} · ${type} · ${fmtGBP(flagged)} flagged`,
    outcome: 'Outcome',
    cash: 'Cash recovered', cashHelp: 'One-off money back, like a refund or credit note',
    cost: 'Cost avoided', costHelp: 'Future spend that will not happen, like a lower rate',
    moneyError: 'Enter an amount. Add cash recovered, cost avoided or both.',
    wholePounds: 'Enter whole pounds, for example 150,000.',
    what: 'What happened', whatError: 'Add one line on what happened.',
    hint: 'Your figures. Kontor shows them as you enter them and does not check them.',
    cancel: 'Cancel', confirm: 'Close action',
  },

  /* ---------------------------------------------------------------- Actions page */
  page: {
    title: 'Actions',
    description: `Opportunities your team is working on. As at ${fmtDateLong(AS_OF)}.`,
    tabsLabel: 'Actions views', board: 'Board', results: 'Results',
  },
  board: {
    stats: { working: 'Being worked on', open: 'Open actions', due: 'Due in the next 14 days', value: 'Value secured to date' },
    statsLabel: 'Action totals',
    workingFoot: 'Indicative value, still in the headline', openFoot: 'To start, checking or with the supplier', dueFoot: 'Overdue ones included', valueFoot: 'See results',
    filters: 'Filter the board', owner: 'Owner', everyone: 'Everyone', allTypes: 'All types', typeLabel: 'Flag type',
    last30: 'Last 30 days',
    empty: 'Drag a card here, or use Move to on a card.',
    columnLabel: (label, n) => `${label}, ${plural(n, 'action')}`,
    justAdded: 'Just added', unassigned: 'No owner yet',
    progress: (d, t) => `${d} of ${t}`, progressLabel: (d, t) => `${d} of ${t} steps done`,
    next: 'Next:', allDone: 'Every step is done. Close the action when you are ready.',
    closedLine: (value, flagged, closedAt) => `${value} (your figure) against ${flagged} flagged. Closed ${dayMonth(closedAt)}.`,
    closedPlain: (flagged, closedAt) => `${flagged} flagged. Closed ${dayMonth(closedAt)}.`,
    moveTo: 'Move to', moveLabel: (title) => `Move ${title} to another stage`,
    open: (title) => `Open the action for ${title}`,
    dragHelp: 'Drag cards between columns, or use Move to.',
    noMatch: 'No actions match these filters.', clear: 'Clear filters',
  },
  results: {
    tiles: { value: 'Value secured', cash: 'Cash recovered', cost: 'Cost avoided', closed: 'Actions closed' },
    since: (ym) => `Since ${monthLong(ym)}`,
    count: (n) => plural(n, 'action'),
    split: (r, e, n) => `${r} resolved · ${e} explained · ${n} no action`,
    chartTitle: 'Value secured, by month closed', chartLabel: 'Value secured by the month each action closed',
    tableTitle: 'Closed actions', tableCaption: 'Closed actions, newest first',
    cols: { closed: 'Closed', contract: 'Contract', outcome: 'Outcome', cash: 'Cash recovered', cost: 'Cost avoided', owner: 'Owner' },
    none: 'None', example: 'Example', latest: 'Latest',
    footer: 'Your figures. Kontor does not check them.',
    empty: 'No actions have been closed yet. Close one on the board to see it here.',
    barLabel: (month, cash, cost) => `${month}: ${fmtGBP(cash + cost)} value secured, ${fmtGBP(cash)} cash recovered and ${fmtGBP(cost)} cost avoided`,
  },

  /* ---------------------------------------------------------------- Home strip */
  home: {
    title: 'Action progress', description: 'From the Actions board.', open: 'Open Actions',
    notStarted: 'Not started', working: 'Being worked on', value: 'Value secured',
    notStartedFoot: (n) => `${plural(n, 'flag')} with no action yet`,
    workingFoot: (n, due) => `${plural(n, 'action')}. ${due} due in the next 14 days.`,
    valueFoot: (n, ym) => `${plural(n, 'action')} resolved since ${MONTHS[Number(ym.slice(5, 7)) - 1]}. Your figures.`,
    valueFootNone: 'Nothing resolved yet. Your figures.',
    seeResults: 'See results',
  },

  /* ---------------------------------------------------------------- other screens */
  rowStage: (stage, initials) => (initials ? `${STAGE_LABEL[stage]} · ${initials}` : STAGE_LABEL[stage]),
  rowStageLabel: (stage, name) => (name ? `Action: ${STAGE_LABEL[stage]}, owner ${name}` : `Action: ${STAGE_LABEL[stage]}, no owner yet`),
  reps: {
    title: 'Representatives', description: 'Named in clause 3 of the contract. Sample names.',
    authority: "Authority's Representative", supplier: "Supplier's Representative",
    clause: (clauseRef, page) => `${clauseRef}, page ${page}`,
  },
};
