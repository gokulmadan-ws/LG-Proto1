// V5 strings that src/lib/copy.js does not hold. They follow the copy deck (sentence case, "you", no exclamation marks, [Verb]+[Object] buttons).
// Everything else on the Cap vs spend screens comes from copy.js (COPY.pages.spend, COPY.matching, COPY.noContract, COPY.noCoverageText,
// COPY.partialCoverageNote, COPY.vatNote, capStateLabel, matchMethodLabel, matchConfirmedToast, matchRejectedToast ...) or the engine.
import { fmtGBP, fmtPct } from '../../lib/format.js';

export const TABS = [
  { id: 'cap', label: 'Cap vs spend', title: 'Cap vs spend', seg: [] },
  { id: 'matches', label: 'Supplier matches', title: 'Supplier matches', seg: ['matches'] },
  { id: 'no-contract', label: 'No contract on the register', title: 'No contract on the register', seg: ['no-contract'] },
];
export const TABS_LABEL = 'Cap vs spend views';

export const DESCRIPTIONS = {
  matches: 'How each payee name in the spend files is linked to a supplier on your contract register. Check the suggestions, then confirm or reject them.',
  noContract: 'Payees in the spend files that have no contract on the register, ranked by what you have paid them.',
};

/* ---------------------------------------------------------------- cap tab */

export const CAP = {
  panelTitle: 'Spend against each contract cap',
  panelDescription: 'Ranked by the share of the cap used. Amounts are indicative.',
  tiles: {
    over: { label: 'Over cap', icon: 'triangle-exclamation', foot: () => 'Spend is above the cap' },
    close: { label: 'Close to cap', icon: 'gauge-high', foot: (thr) => `${Math.round(thr * 100)}% to 100% of the cap` },
    within: { label: 'Within cap', icon: 'circle-check', foot: (thr) => `Below ${Math.round(thr * 100)}% of the cap` },
    total: { label: 'Total over cap', icon: 'sterling-sign', foot: (n) => `Indicative, across ${n} ${n === 1 ? 'contract' : 'contracts'}` },
  },
  summaryLabel: 'Cap summary',
  filterLabel: 'Filter by cap status',
  chips: { all: 'All contracts', over: 'Over cap', close: 'Close to cap', within: 'Within cap' },
  showAll: (n) => `Show all ${n} contracts`,
  showFewer: (n) => `Show top ${n} contracts`,
  seePayments: 'See payments',
  showTable: 'Show table',
  showChart: 'Show chart',
  clearFilter: 'Show all contracts',
  noRows: { title: 'No contracts match this filter.', body: 'Choose another status to see more contracts.' },
  footnote: 'Over-by amounts and spend are indicative. Spend is matched to each contract by supplier name.',
  tableCols: { clause: 'Clause', payments: 'Payments' },
};

/* ---------------------------------------------------------------- payments drawer */

export const PAY = {
  title: 'Payments counted against this contract',
  figures: { spend: 'Spend to date', cap: 'Cap', share: 'Share of cap', over: 'Over by', worst: 'Highest contract year', paymentsCount: (n) => `${n} ${n === 1 ? 'payment' : 'payments'}` },
  indicative: 'Indicative',
  yearsTitle: 'Spend by contract year',
  yearsNote: 'This contract has an annual cap, so each contract year is tested on its own. The current year is year to date and is not pro-rated.',
  yearOver: (year, gbp) => `Year ${year} is over the annual cap by ${gbp}.`,
  yearsAllWithin: 'No contract year is over the annual cap.',
  yearHighest: (year, gbp) => `The figure on the cap list is the highest year: year ${year}, ${gbp}.`,
  yearSelector: 'Show payments for',
  yearOption: (n, partial) => `Year ${n}${partial ? ' (to date)' : ''}`,
  allYears: 'All years',
  paymentsTitle: 'Payments',
  inTerm: 'Paid in the contract term',
  afterEnd: 'Paid after the end date',
  afterEndNote: 'These payments are dated after the contract ended. They count towards spend to date and are listed here so the total reconciles.',
  total: 'Total paid to date',
  totalYear: (year) => `Total paid in year ${year}`,
  totalRange: 'Total paid, all years',
  split: (inTerm, after) => `${inTerm} in the contract term plus ${after} after the end date.`,
  totalNote: 'Equal to the spend to date for this contract, to the penny.',
  yearTotalNote: 'Equal to the figure on the cap list, to the penny.',
  subtotal: (n, all) => (all ? `Subtotal, all ${n} payments` : `Subtotal, ${n} ${n === 1 ? 'payment' : 'payments'}`),
  none: 'No payments are linked to this contract.',
  noneForYear: 'No payments fall in this contract year.',
  openContract: 'Open contract',
  closePanel: 'Close panel',
  payeeTitle: 'Payments with no contract on the register',
  payeeNoteTotal: 'Total paid under this name',
  payeeNote: 'There is no contract to read, so there is no clause to link.',
  cols: { date: 'Date', ref: 'Reference', name: 'Name as paid', amount: 'Amount', year: 'Year' },
};

/* ---------------------------------------------------------------- matches tab */

export const MATCH = {
  panelTitle: 'Payee names in the spend files',
  panelDescription: (n) => `${n} distinct names as written in the payment files.`,
  notCounted: 'Suggested and unmatched payments are not counted until you confirm them.',
  disclosureTitle: 'How matching works',
  thresholdsTitle: 'Thresholds',
  thresholds: (accept, suggest) => [
    { id: 'accept', range: `${accept.toFixed(2)} or more`, text: 'Accepted without review.' },
    { id: 'suggest', range: `${suggest.toFixed(2)} to ${(accept - 0.01).toFixed(2)}`, text: 'Suggested for you to confirm. Not counted until you do.' },
    { id: 'unmatched', range: `Below ${suggest.toFixed(2)}`, text: 'Left unmatched. Not counted.' },
  ],
  attributionTitle: 'Which contract a payment counts towards',
  filterLabel: 'Filter by match status',
  chips: { all: 'All payees', review: 'Needs your review', accepted: 'Accepted', unmatched: 'Unmatched', yours: 'Decided by you' },
  cols: { name: 'Name as paid', supplier: 'Matched supplier', method: 'Method', score: 'Score', status: 'Status', payments: 'Payments', total: 'Total' },
  status: { auto_accepted: 'Accepted', suggested: 'Suggested', unmatched: 'Unmatched', confirmed: 'Confirmed', rejected: 'Rejected' },
  noMatch: 'No match',
  helpConfirmed: 'You confirmed this match. Its payments now count.',
  helpRejected: 'You rejected this match. Its payments are not counted.',
  confirm: 'Confirm match',
  reject: 'Reject match',
  undo: 'Undo decision',
  undone: (name) => ({ title: 'Decision undone.', description: `${name} is back to suggested. It is not counted until you confirm it.` }),
  effectConfirmed: (title, utilisation, label, over) => `${title} now reads ${fmtPct(utilisation, 1)} of its cap: ${label}${over > 0 ? `, ${fmtGBP(over)} over` : ''}.`,
  effectLink: 'See it on Cap vs spend',
  effectHeading: 'What your decision changed',
  confirmNoContract: (name, n, gbp, supplier) => ({ title: 'Match confirmed.', description: `${n} (${gbp}) are now matched to ${supplier}, which has no contract on the register.` }),
  sortHelp: 'Sorted so the names that need your review come first. Choose a column heading to sort by it.',
  emptyYours: { title: 'You have not made any decisions yet.', body: 'Confirm or reject a suggested match and it appears here.' },
  emptyFilter: { title: 'No payees match this filter.', body: 'Choose another status to see more payees.' },
  showAllPayees: 'Show all payees',
};

/* ---------------------------------------------------------------- no contract tab */

export const NOC = {
  panelTitle: 'Spend with no contract on the register',
  rowNote: 'There is no contract to read, so there is no clause to link.',
  footnote: 'Matching is by supplier name. A supplier shown here may have a contract under a different name.',
  pending: (gbp) => `${gbp} is awaiting your review on the Supplier matches tab and is not in this list.`,
  pendingLink: 'Review suggested matches',
  headingNoContract: 'Largest suppliers with no contract on the register',
};
