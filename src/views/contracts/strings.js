// V6 strings that src/lib/copy.js does not hold. They follow the copy deck (sentence case, "you", no exclamation marks, [Verb]+[Object] buttons).
// Everything else on the Contracts screens comes from copy.js (COPY.pages.contracts, COPY.pages.contractDetail, COPY.questionsGroupLabel,
// COPY.empty.contractsNoMatch, COPY.paymentsCaption, COPY.vatNote, COPY.partialCoverageNote, answerFor, upliftResultText, latestEndText, capUsedText,
// noticeDeadlineNote, relativeText, bandLabel, reasonFor, handcheckLine, sourceLabel ...), the engine output and useEstate().
import { fmtDate, fmtDateLong, plural } from '../../lib/format.js';

/* ---------------------------------------------------------------- the register */

export const REGISTER = {
  panelTitle: 'Contract register',
  toolbar: 'Filter contracts',
  search: 'Search contracts',
  searchPlaceholder: 'Contract or supplier',
  category: 'Category',
  allCategories: 'All categories',
  clearFilters: 'Clear filters',
  showing: (n, total) => `Showing ${n} of ${total} contracts`,
  tableCaption: 'Contract register. Select a contract to open its financial answers.',
  columns: { id: 'Contract', title: 'Title', supplier: 'Supplier', category: 'Category', route: 'Route', start: 'Start', end: 'End', value: 'Annual value', status: 'Status', flags: 'Flags' },
  handHint: 'Mark an answer correct or incorrect from its clause page.',
  handBreakdown: (correct, incorrect) => `${correct} correct, ${incorrect} incorrect`,
  sourceKey: 'Source',
  sourceRule: 'Councils publish a copy of any contract over £5m on Find a Tender, for procurements started on or after 24 February 2025. Below £5m, Contracts Finder notices give context but not the full documents.',
  noMatchFilters: { title: 'No contracts match these filters.', body: 'Clear the filters to see all contracts.' },
};

/* ---------------------------------------------------------------- the detail page */

export const DETAIL = {
  crumbRoot: 'Contracts',
  eyebrow: (c) => `Contract ${c.id}`,
  statusKey: 'Status',
  sourceKey: 'Source',
  notFound: {
    title: 'Contract not found.',
    body: (id) => `There is no contract with the id ${id} on the register. Go to the contracts list and choose one.`,
    button: 'Go to contracts',
    eyebrow: 'Contracts',
  },

  flags: {
    title: 'Opportunities to investigate',
    description: 'Indicative figures. Each one is a prompt to check this contract, not a confirmed result.',
    empty: 'No opportunities flagged for this contract.',
    watchTitle: 'Watch list',
    watchIntro: 'Close to the cap, but not projected to reach it before the contract ends.',
    indicative: 'Indicative',
    notCounted: 'Not counted in the total.',
    actBy: (flag, label, date) => `${label} ${date}`,
    list: (title) => `Flags on ${title}`,
  },

  figures: {
    label: 'Key figures',
    annual: 'Estimated annual value',
    annualFoot: 'A year, as stated in the contract',
    cap: 'Cap',
    spend: 'Spend to date',
    spendFoot: (n, latest) => `${plural(n, 'payment')}, latest ${fmtDate(latest)}`,
    atLeast: 'At least',
    partialFoot: (from) => `Spend files start ${fmtDate(from)}`,
    used: 'Cap used',
    usedAnnualFoot: 'Highest contract year',
    termLive: 'Current term ends',
    termEnded: 'Term ended',
    termFoot: (c) => `Started ${fmtDate(c.startDate)}, ${c.termYears} ${c.termYears === 1 ? 'year' : 'years'}`,
  },

  questions: {
    description: 'Nine questions Kontor adds to its contract extraction. Each answer shows how sure Kontor is and the clause it came from.',
    notSure: 'Check the clause before you rely on this answer.',
    contractValueClause: (page) => `View contract value clause, page ${page}`,
    scorePrefix: 'Confidence score',
    rateCardCaption: 'Rate card',
    rateCols: { item: 'Item', unit: 'Unit', rate: 'Rate' },
    checked: { correct: 'Checked by hand: correct', incorrect: 'Checked by hand: incorrect' },
    footer: (checked, total) => `${checked} of ${total} answers on this contract checked by hand. Open a clause to mark an answer correct or incorrect.`,
  },

  derived: {
    title: 'Derived',
    footer: 'Indicative. Worked out from the answers on this page and the sample payments.',
    noticeDeadline: 'Notice deadline',
    band: 'Radar band',
    bandOn: 'On the renewal radar.',
    bandOff: 'More than 12 months away, so not on the renewal radar.',
    latestEnd: 'Latest end date',
    latestEndIf: 'If every extension is used.',
    latestEndNone: 'No extension option, so this is the end of the current term.',
    latestEndWith: (ext) => `End of the current term plus ${ext}.`,
    nextReview: 'Next price review',
    nextReviewMissing: 'No price review clause found.',
    none: 'None',
    notFound: 'Not found',
    fixedNote: 'Prices are fixed for the term.',
    capUsed: 'Cap used',
    upliftCheck: 'Price increase check',
    upliftExcess: (gbp) => `${gbp} more than the cap allows if volumes stayed flat. Indicative.`,
    suggested: (n, gbp) => `A similar payee name has ${plural(n, 'payment')} (${gbp}) waiting for your review.`,
    reviewMatches: 'Open supplier matches',
  },

  spend: {
    title: 'Spend by contract year',
    description: 'What you have paid this supplier, from the sample payment files.',
    cumulativeTitle: 'Cumulative spend against the cap',
    annualTitle: (cap) => `Spend in each contract year against the annual cap of ${cap}`,
    yearsTitle: 'By contract year',
    yearsCaption: 'Spend in each contract year, with the total to date',
    yearCols: { year: 'Year', dates: 'Dates', spend: 'Spend' },
    year: (n) => `Year ${n}`,
    yearToDate: 'Year to date',
    notInFiles: 'Not in the spend files',
    yearsNote: 'The current year is year to date and is not pro-rated.',
    total: 'Total to date',
    estimateCap: (gbp) => `The line is the contract value (${gbp}), an estimate and not a stated maximum.`,
    atLeast: 'At least',
  },

  payments: {
    title: 'Payments',
    description: (council) => `Sample payments (fictional). ${council.spendWindowLabel || 'Sample payments to ' + fmtDateLong(council.spendDataTo)}.`,
    pagerLabel: 'Payments pages',
    columns: { date: 'Date', ref: 'Reference', name: 'Name as paid', supplier: 'Matched supplier', amount: 'Amount' },
    afterEnd: 'After end date',
    total: (n, paged) => `Total paid to date, ${paged ? 'all ' : ''}${plural(n, 'payment')}`,
    totalAfter: (n) => `Of which paid after the end date, ${plural(n, 'payment')}`,
    empty: 'No payments are linked to this contract.',
    emptyHelp: 'The spend files hold no payment to this supplier within the contract dates, or its payee name is not matched yet.',
    note: 'Payments are linked to this contract by supplier name. Suggested and unmatched payee names are not counted until you confirm them.',
  },
};
