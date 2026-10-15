// Pre-loaded actions (build spec section 6.6, decisions D5 and D8). What the board and Results show on a fresh load and after
// "Reset demo data".
//
//   SEED_ACTIONS   { [flagId]: Action }   4 open actions (all "Under review", so the £6.1m headline does not move) and
//                                         5 closed actions of example history, May to September 2026
//   SEED_TRIAGE    { [flagId]: 'under_review' }  the review status of the 4 open ones
//
// The open actions sit on real flags. The history sits on contracts with NO flag today: its ids are synthetic ('H-...'), are not in
// estate.flagsById, and each record carries its own contractId, flagType and flaggedGBP. Every timestamp is a fixed string before the
// as-of date (6 October 2026): nothing here reads the clock. The Action shape is documented in src/lib/actions.js.

const base = (flagId, contractId, flagType, flaggedGBP) => ({
  flagId, contractId, flagType, flaggedGBP,
  stage: 'to_start', owner: null, due: null, steps: {}, notes: [], log: [],
  outcome: null, cashRecoveredGBP: null, costAvoidedGBP: null, closeNote: null, closedAt: null,
  archived: false, example: false,
});
const ticked = (...ids) => Object.fromEntries(ids.map((id) => [id, true]));
const at = (day, time) => `2026-${day}T${time}:00.000Z`;

/* ---------------------------------------------------------------- open (D5): ICT, Facilities, Waste, Street lighting */
const OPEN = [
  {
    ...base('F-C-007-overCap', 'C-007', 'overCap', 760000),
    stage: 'checking', owner: 'P-priya', due: '2026-10-16', steps: ticked('oc-variation', 'oc-owner'),
    log: [
      { at: at('09-28', '09:12'), text: 'You set the review status to Under review.' },
      { at: at('09-28', '09:14'), text: 'You set the owner to Priya Raman.' },
      { at: at('09-29', '11:02'), text: 'You ticked "Check the contract file for a variation or change notice."' },
      { at: at('10-01', '15:40'), text: 'You ticked "Ask the contract owner if the extra spend was approved."' },
    ],
  },
  {
    ...base('F-C-001-nearCap', 'C-001', 'nearCap', 642478),
    stage: 'checking', owner: 'P-tom', due: '2026-10-30', steps: ticked('nc-tell'),
    log: [
      { at: at('10-01', '10:05'), text: 'You set the review status to Under review.' },
      { at: at('10-01', '10:07'), text: 'You set the owner to Tom Ellery.' },
      { at: at('10-02', '14:30'), text: 'You ticked "Tell the budget holder the cap will be reached."' },
    ],
  },
  {
    ...base('F-C-003-renewal', 'C-003', 'renewal', 310000),
    stage: 'with_supplier', owner: 'P-sam', due: '2026-10-31', steps: ticked('rn-notice', 'rn-owner', 'rn-price'),
    log: [
      { at: at('09-15', '09:30'), text: 'You set the review status to Under review.' },
      { at: at('10-02', '16:20'), text: 'You moved this to With supplier.' },
    ],
  },
  {
    ...base('F-C-004-uplift', 'C-004', 'uplift', 188200),
    stage: 'with_supplier', owner: 'P-priya', due: '2026-10-23', steps: ticked('up-clause', 'up-invoices', 'up-supplier'),
    notes: [{ at: at('10-05', '12:15'), text: 'Supplier has offered a credit note.' }],
    log: [
      { at: at('09-22', '08:50'), text: 'You set the review status to Under review.' },
    ],
  },
];

/* ---------------------------------------------------------------- closed history (D8), on contracts with no flag today */
const closed = (id, contractId, flagType, flaggedGBP, outcome, cash, cost, closedAt, owner, note, startedAt) => {
  const steps = { overCap: ['oc-variation', 'oc-owner', 'oc-finance', 'oc-supplier', 'oc-record'], nearCap: ['nc-tell', 'nc-variation', 'nc-decide', 'nc-record'], uplift: ['up-clause', 'up-invoices', 'up-supplier', 'up-credit', 'up-record'] }[flagType];
  return {
    ...base(id, contractId, flagType, flaggedGBP),
    stage: 'closed', owner, due: closedAt, steps: ticked(...steps),
    outcome, cashRecoveredGBP: cash, costAvoidedGBP: cost, closeNote: note, closedAt, example: true,
    log: [
      { at: `${startedAt}T09:00:00.000Z`, text: 'You set the review status to Under review.' },
      { at: `${closedAt}T16:00:00.000Z`, text: 'You closed this action.' },
    ],
  };
};
const HISTORY = [
  closed('H-C-024-uplift', 'C-024', 'uplift', 47300, 'resolved', 12400, 31200, '2026-05-22', 'P-tom', 'Rise cut back to CPI, refund paid.', '2026-04-20'),
  closed('H-C-006-nearCap', 'C-006', 'nearCap', 230000, 'explained', null, null, '2026-06-09', 'P-jo', 'A 2024 variation raised the cap.', '2026-05-18'),
  closed('H-C-020-uplift', 'C-020', 'uplift', 64000, 'resolved', 21500, 54000, '2026-06-19', 'P-sam', 'Overcharge refunded, rate corrected.', '2026-05-26'),
  closed('H-C-008-overCap', 'C-008', 'overCap', 112000, 'resolved', 84000, null, '2026-07-14', 'P-priya', 'Duplicate invoices credited.', '2026-06-15'),
  closed('H-C-013-overCap', 'C-013', 'overCap', 58000, 'no_action', null, null, '2026-09-03', 'P-tom', 'Extra holiday club meals, approved and grant funded.', '2026-08-10'),
];

export const SEED_ACTIONS = Object.freeze(Object.fromEntries([...OPEN, ...HISTORY].map((a) => [a.flagId, a])));
export const SEED_TRIAGE = Object.freeze(Object.fromEntries(OPEN.map((a) => [a.flagId, 'under_review'])));
