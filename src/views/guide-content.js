// G1: the words on the Guide page that src/lib/copy.js does not hold. Numbers are never typed here: every figure is passed in from
// guide-facts.js (which reads the estate) or comes from copy.js. Voice: sentence case, "you", short sentences, no exclamation marks.
// Strings that are already in copy.js (the caveat, the sample-data note, the close line, the demo wording, the matching rule, the notice and
// confidence rules) are imported by Guide.jsx, so the Guide, the Demo guide and the Method page cannot drift apart.
import { hrefFor } from '../lib/router.js';

/** Sections, in page order. The id sits on the section heading (?s=<id> scrolls to and focuses it). */
export const SECTIONS = [
  { id: 'start', title: 'Start here', icon: 'circle-play', lead: "This is Stage 1 of the Kontor financial layer. It reads one council's contracts and spend and flags opportunities to investigate." },
  { id: 'tour', title: 'The five-minute tour', icon: 'route', lead: 'Four steps for a live demo, from the headline number down to one clause. Each step says what to do, what to say and the number you should see.' },
  { id: 'screens', title: 'Screens at a glance', icon: 'table-cells-large', lead: 'Each screen answers one question, so you can open the one you need.' },
  { id: 'try', title: 'Try these', icon: 'hand-pointer', lead: 'Things to do with your own hands. Each one changes what you see, and you can undo all of them.' },
  { id: 'numbers', title: 'How to read the numbers', icon: 'calculator', lead: 'Every figure is a prompt to look, not a result. This is what the words and the colours mean.' },
  { id: 'real', title: 'What is real and what is not', icon: 'circle-half-stroke', lead: 'The sums are real. The council and its documents are made up. Some things are not built yet.' },
  { id: 'glossary', title: 'Words you will see', icon: 'book', lead: 'Plain-language meanings for the contract and procurement terms used in the prototype.' },
  { id: 'keys', title: 'Keyboard and links', icon: 'keyboard', lead: 'You can use the whole prototype without a mouse, and you can share any view as a link.' },
  { id: 'faq', title: 'Questions people ask', icon: 'circle-question', lead: 'Straight answers to the questions that come up most.' },
];
export const SECTION_IDS = SECTIONS.map((s) => s.id);
export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

export const TEXT = {
  eyebrow: 'Stage 1 prototype',
  pageIntro: 'How to use this prototype and how to read what it shows. Read it in order, or jump to a section.',
  toc: 'On this page',
  jump: 'Jump to a section',
  openStep: 'Open step',
  seeNow: 'You should see',
  say: 'Say',
  doThis: 'Do',
  where: 'Where',
  startingNote: (value) => `Starting value ${value}`,
  aboutThisData: 'About this data',
};

/* ------------------------------------------------------------------------------------------------------------ start */
export const START = {
  stepsTitle: 'Three steps to begin',
  primary: 'Open the overview',
  tourLink: 'See the five-minute tour',
  glance: {
    contracts: { label: 'Contracts', foot: 'on the register', icon: 'folder-open' },
    payments: { label: 'Payments', foot: 'over £500, in the sample files', icon: 'sterling-sign' },
    answers: { label: 'Answers', foot: 'each with its clause and page', icon: 'list-check' },
    flagged: { label: 'Contracts flagged', foot: 'as opportunities to investigate', icon: 'flag' },
  },
  steps: {
    headline: (headline) => ({ title: 'Read the headline', body: `Open the overview. The number at the top is the total of every opportunity to investigate. It reads ${headline}.` }),
    clause: (page) => ({ title: 'Follow one flag to its clause', body: `Open Opportunities and select the top row. Then choose View clause${page ? `, page ${page}` : ''}. You land on the contract text with the clause highlighted.` }),
    change: { title: 'Change something', body: 'Mark a flag as Explained, or confirm a supplier match, and watch the numbers move. Reset your changes in Settings whenever you like.' },
  },
};

/* ------------------------------------------------------------------------------------------------------------- tour */
export const TOUR = {
  note: {
    title: 'The numbers below are live',
    body: 'They move if you change a review status, confirm a supplier match or change an assumption. If your demo shows different numbers from these, someone has made a change. Reset your changes in Settings to get the starting numbers back.',
  },
  pillStart: 'Showing the starting numbers',
  pillChanged: 'Showing your changes',
  steps: {
    headline: {
      title: 'The headline',
      do: 'Open the overview. Point at the caveat under the headline.',
      say: 'This is a list of places to look. Every figure is an opportunity to investigate, not a confirmed result.',
      link: 'Open step 1, the headline',
    },
    radar: {
      title: 'The renewal radar',
      do: 'Open the renewal radar. Show the next 3, 6 and 12 months, then the notice dates that have already passed.',
      say: "These were nobody's job to watch.",
      needs: (n) => `${n} ${n === 1 ? 'contract needs' : 'contracts need'} attention now`,
    },
    cap: {
      title: 'One contract over its cap',
      do: 'Open the top spend over cap flag. Then choose View clause.',
      say: 'Every flag shows the words it came from.',
      paid: (spent, cap) => `${spent} paid against a ${cap} maximum`,
      clause: (ref, page, count) => `${ref}, page ${page}${count ? ` of ${count}` : ''}`,
    },
    close: {
      title: 'The close',
      do: 'Go to the last panel on the overview. Stop talking, then ask for feedback.',
      say: null,                       // COPY.closePanel.spoken
    },
  },
};

/* ----------------------------------------------------------------------------------------------------------- screens */
/** One card per screen. `icon` is a full Font Awesome class; `links` are [{ label, href }]. */
export function screens(f) {
  const clause = f.top.clause;
  const sourceHref = clause ? hrefFor('source', { seg: [clause.contractId, clause.extractionId], query: { from: 'opportunities' } }) : hrefFor('contracts');
  return [
    {
      id: 'overview', title: 'Overview', icon: 'fa-solid fa-house',
      answers: 'How big is the total, and where does it come from?',
      who: 'A head of procurement or commercial lead who wants the whole picture at a glance.',
      links: [{ label: 'Open overview', href: hrefFor('overview') }],
    },
    {
      id: 'opportunities', title: 'Opportunities', icon: 'fa-solid fa-magnifying-glass-dollar',
      answers: 'What should we look at first?',
      who: 'The commercial or contracts team deciding where to start.',
      links: [{ label: 'Open opportunities', href: hrefFor('opportunities') }],
    },
    {
      id: 'renewals', title: 'Renewal radar', icon: 'fa-regular fa-calendar-check',
      answers: 'Which contracts need a decision, and by when?',
      who: 'Contract managers and procurement leads who must act before a notice date.',
      links: [{ label: 'Open renewal radar', href: hrefFor('renewals') }],
    },
    {
      id: 'spend', title: 'Cap vs spend', icon: 'fa-solid fa-chart-line',
      answers: 'Have we paid more than a contract allows?',
      who: 'Finance partners and contract managers checking spend against the contract.',
      tabs: 'Three tabs',
      links: [
        { label: 'Cap vs spend', href: hrefFor('spend') },
        { label: 'Supplier matches', href: hrefFor('spend', { seg: ['matches'] }) },
        { label: 'No contract on the register', href: hrefFor('spend', { seg: ['no-contract'] }) },
      ],
    },
    {
      id: 'contracts', title: 'Contracts', icon: 'fa-regular fa-folder-open',
      answers: 'What does this one contract say, and where does each answer come from?',
      who: 'Contract managers and internal audit looking up a single contract.',
      links: [
        { label: 'Open contracts', href: hrefFor('contracts') },
        ...(f.top.contract ? [{ label: `Open contract ${f.top.contract.id}`, href: hrefFor('contracts', { seg: [f.top.contract.id] }) }] : []),
      ],
    },
    {
      id: 'source', title: 'Source viewer', icon: 'fa-regular fa-file-lines',
      answers: 'What are the exact words in the contract?',
      who: 'Anyone who needs to check an answer against the document. It opens from any View clause link.',
      links: [{ label: clause ? `Open ${clause.clauseRef.replace(/^Clause/, 'clause')}, page ${clause.page}` : 'Open contracts', href: sourceHref }],
    },
    {
      id: 'method', title: 'How this is calculated', icon: 'fa-solid fa-calculator',
      answers: 'What rule produced this number?',
      who: 'Finance and audit staff who need to trust the figures.',
      links: [{ label: 'Read how this is calculated', href: hrefFor('method') }],
    },
    {
      id: 'roadmap', title: 'Roadmap', icon: 'fa-solid fa-diagram-project',
      answers: 'What is built, and what comes next?',
      who: 'Anyone deciding what to ask for after Stage 1.',
      links: [{ label: 'Open roadmap', href: hrefFor('roadmap') }],
    },
    {
      id: 'evidence', title: 'Why this matters', icon: 'fa-solid fa-scale-balanced',
      answers: 'Where have councils lost money for want of a view like this?',
      who: 'Anyone who asks why a council would want this.',
      links: [{ label: 'Read why this matters', href: hrefFor('evidence') }],
    },
  ];
}

/* -------------------------------------------------------------------------------------------------------------- try */
export const TRY = {
  theme: {
    title: 'Switch between dark and light',
    body: 'Use the moon and sun button at the top right of the header. The prototype opens in dark mode, and your choice is remembered on this device.',
    see: 'The page changes at once. The charts redraw in the new colours.',
    now: (theme) => `It is in ${theme} mode now.`,
  },
  explain: {
    title: 'Mark a flag as Explained',
    body: 'Open the top spend over cap flag. In the panel, set Review status to Explained.',
    bodyDone: 'You have marked this flag as Explained. Open it and set Review status back to To investigate to undo it.',
    link: 'Open the top spend over cap flag',
    fall: (from, to, note) => `The headline falls from ${from} to ${to}.${note ? ` The overview then shows ${note}` : ''} That is the caveat in action.`,
    rise: (from, to) => `The headline moves from ${from} to ${to}.`,
  },
  match: {
    title: 'Confirm a suggested supplier match',
    body: (payee) => `Open the supplier matches. Find ${payee} and choose Confirm match.`,
    bodyDone: 'You have confirmed this match. Open the supplier matches and choose Undo decision to go back.',
    bodyRejected: 'You rejected this match. Open the supplier matches, choose Undo decision, then choose Confirm match.',
    link: 'Open supplier matches',
    moves: (title, a, b, headA, headB) => `${title} moves from ${a} to ${b}. The headline moves from ${headA} to ${headB}.`,
  },
  rate: {
    title: 'Change the renewal rate',
    body: (target, now, def) => `Open Settings and choose ${target} for the renewal rate. It is ${now} now. The default, ${def}, is a prototype assumption.`,
    button: 'Open settings',
    moves: (cardA, cardB, headA, headB) => `The renewals card moves from ${cardA} to ${cardB}, and the headline from ${headA} to ${headB}.`,
  },
  handcheck: {
    title: 'Check an answer by hand',
    body: 'Open the clause. On the right, choose Mark answer as correct or Mark answer as incorrect.',
    now: (line) => `${line} now. The count shows at the top of the contracts register.`,
  },
  share: {
    title: 'Share a link',
    body: 'Open the filtered list, then use the Share button at the top right of the header. It copies the address of the screen you are on, with its filters and any open panel. On a phone, copy the address from your browser instead.',
    link: 'Open spend over cap',
    see: 'A message says the link is copied. Paste it into a new tab to open the same view.',
  },
  reset: {
    title: 'Reset your changes',
    body: 'This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device. The theme stays. You can also do it in Settings, with Reset demo changes.',
    nothing: 'Nothing has been changed yet.',
    changed: (parts) => `Changed on this device: ${parts.join(', ')}.`,
    see: (head) => `A confirm dialog asks first. After you confirm, the headline is back to ${head}.`,
  },
};

/* --------------------------------------------------------------------------------------------------------- numbers */
export const NUMBERS = {
  notSavings: {
    title: 'Read every figure as a prompt to check',
    see: 'The cases behind this caution are on the evidence page.',
  },
  indicative: {
    title: 'What indicative means',
    extra: 'Every pound figure the prototype works out is indicative. The figures that are not worked out, such as a payment or a contract value, are exact and come straight from the data.',
  },
  bases: {
    title: 'The four kinds of figure',
    intro: 'The headline is the sum of four kinds of figure. Each has its own basis, so read the basis before you read the number.',
    overCap: 'You have paid more than the contract says you can. The amount is the part above the cap, and it is already paid.',
    nearCap: 'Spend is close to the cap. We project it forward at the pace of the last 12 months. The amount is the part of that projection that would land above the cap.',
    renewal: (rate) => `A contract is coming up for a decision. The amount is ${rate} of its annual value, a year. ${rate} is a prototype assumption, and you can change it in Settings.`,
    uplift: "Payments rose by more than the contract's cap on price increases allows. The amount is the extra you paid above the capped rise. A change in volume can explain part of it.",
    addsUp: 'The four cards add up to the headline',
    once: 'Each flag sits in exactly one card, so nothing is counted twice. A flag you mark as Explained or No action leaves its card and the headline together.',
  },
  confidence: {
    title: 'Confidence',
    high: 'The answer is clear in the clause.',
    medium: 'The answer is probably right. Check the clause before you rely on it.',
    review: 'Kontor is not sure about an answer or a supplier match that the flag relies on. Read the clause first.',
    live: (n, total) => `In this sample, ${n} of ${total} flags need review.`,
  },
  notice: {
    title: 'Notice window',
    body: 'The notice window is the time before a contract ends when you must tell the supplier what you want. The notice deadline is the last day to do it.',
    miss: 'If the deadline passes on a contract that renews automatically, it renews unless you agree otherwise with the supplier.',
    radar: 'The renewal radar groups contracts by this deadline: the next 3 months, 3 to 6 months and 6 to 12 months. Needs attention now lists the deadlines that have already passed.',
  },
  cap: {
    title: 'Over cap and close to cap',
    over: (pct) => `Spend is above ${pct} of the cap.`,
    near: (from, to) => `Spend is from ${from} of the cap up to ${to}.`,
    within: (from) => `Spend is below ${from} of the cap.`,
    estimate: 'Above contract value (estimate)',
    estimateBody: 'Some contracts state no maximum, so we use the contract value. That is an estimate, not a ceiling, so confidence is one step lower.',
    live: (over, near, within) => `In this sample: ${over} over cap, ${near} close to cap and ${within} within cap.`,
  },
};

/* ------------------------------------------------------------------------------------------------------------ real */
export const REAL = {
  groups: [
    { id: 'real', title: 'Real', icon: 'circle-check' },
    { id: 'made', title: 'Made up for the demo', icon: 'pen' },
    { id: 'not', title: 'Not built yet', icon: 'hourglass-half' },
  ],
  real: {
    calc: 'The calculations. Every figure is worked out in your browser from the sample data, by the rules on the method page.',
    cases: (n) => `The evidence. ${n} public cases from councils and the Local Government Association are summarised on the evidence page, each with a link to its source.`,
    sources: 'The sources the design is built around. Find a Tender, the Transparency Code spend files and Contracts Finder are all public.',
  },
  made: {
    payments: 'The payment rows look like the files councils publish for payments over £500: date, department, supplier, purpose and amount. They are not copies of any real file.',
    date: (long) => `The date. Every figure is calculated as at ${long}, whatever today's date is.`,
  },
  not: {
    stage2: (list) => `Stage 2 and the not-yet items: ${list}.`,
    ingestion: 'Reading documents. This prototype starts after document ingestion, so every answer is shown as already extracted.',
    ownData: 'Your own data. You cannot load it from the screen.',
  },
};

/* -------------------------------------------------------------------------------------------------------- glossary */
export const GLOSSARY = [
  ['Auto-renewal', 'The contract renews by itself for a set period unless you give notice in time.'],
  ['Buying group', 'Councils that buy the same thing together to get a better price. Forming one is a Stage 2 idea on the roadmap.'],
  ['Contract cap or maximum value', 'The most the contract says you can pay the supplier. Some contracts state a maximum. Others give only a contract value, which is an estimate and not a ceiling.'],
  ['Contracts Finder', 'The public service for contract notices. In this project it is the source for contracts below £5m, where full documents are not published.'],
  ['Exit fee', 'A charge the supplier can make if the contract ends early.'],
  ['Extension option', "A right to carry on beyond the first term, for example two extensions of 12 months. Some are the council's choice. Others need both sides to agree."],
  ['Find a Tender', 'The central platform where councils must publish a copy of any contract over £5m, for procurements started on or after 24 February 2025.'],
  ['Framework', 'An agreement a buying body sets up with suppliers, so councils can buy from it without a new tender each time.'],
  ['Indexation', 'A rule that lets prices rise each year with an index such as CPI. Many contracts cap the rise.'],
  ['Notice period', 'How much warning you must give the supplier before the end of the term if you want to end, extend or stop a renewal.'],
  ['Service credits', 'Money the supplier gives back when it misses agreed service levels.'],
  ['Termination for convenience', 'A right to end the contract early without giving a reason, usually on notice.'],
  ['Transparency Code spend file', 'A list of payments over £500 that a council publishes under the Local Government Transparency Code.'],
  ['Uplift', "A price increase. A price increase above cap means payments rose by more than the contract's cap on increases allows."],
];

/* ------------------------------------------------------------------------------------------------------------ keys */
export const KEYS = {
  moving: {
    title: 'Moving around',
    rows: [
      { keys: ['Tab'], text: 'moves to the next control, and Shift with Tab moves back. The order is the skip link, the header, the left rail, the sample-data link, then the page.' },
      { keys: ['Enter'], text: 'on the Skip to content link jumps to the page without changing the address.' },
      { keys: ['Esc'], text: 'closes the top panel, dialog, menu or tooltip, and puts focus back on the button that opened it.' },
      { keys: ['Up', 'Down', 'Home', 'End'], text: 'move through menu items and through chart rows. In a menu, a letter jumps to the next item that starts with it.' },
      { keys: ['Left', 'Right'], text: 'move between the options of a segmented control, such as the settings choices. A select opens with the arrow keys, then Enter.' },
      { keys: ['Enter', 'Space'], text: 'activate a button. Enter follows a link.' },
    ],
  },
  addresses: {
    title: 'Addresses you can share',
    intro: 'Filters, tabs and open panels are written into the address, so a copied link opens the same view. Replace the words in angle brackets with a real id.',
  },
  back: {
    title: 'What Back does',
    body: 'Back takes you to the last screen you opened. Moving to another screen adds a step. Changing a filter, searching, or opening a flag panel from a list does not, so one press of Back leaves the screen. A link that opens a flag panel from another screen does add a step, and Back then closes the panel and returns you to where you were.',
  },
};
/** The shareable patterns. `example` is a real address (checked by the e2e), `ids` fill the angle brackets. */
export function addresses(f) {
  const cid = f.top.contract ? f.top.contract.id : 'C-005';
  const fid = f.top.flag ? f.top.flag.id : 'F-C-005-overCap';
  const clause = f.top.clause;
  return [
    { pattern: '#/opportunities?type=<type>', what: 'Opportunities for one type: overCap, nearCap, renewal or uplift.', example: hrefFor('opportunities', { query: { type: 'overCap' } }) },
    { pattern: '#/opportunities?status=<status>', what: 'Opportunities that are open, reviewed or all.', example: hrefFor('opportunities', { query: { status: 'reviewed' } }) },
    { pattern: '#/<screen>?flag=<flag id>', what: 'The flag panel, on any screen.', example: hrefFor('opportunities', { query: { flag: fid } }) },
    { pattern: '#/spend?state=<state>', what: 'Cap vs spend for contracts over, close to or within the cap.', example: hrefFor('spend', { query: { state: 'over' } }) },
    { pattern: '#/spend?payments=<contract id>', what: "The payments behind a contract's spend figure.", example: hrefFor('spend', { query: { payments: cid } }) },
    { pattern: '#/spend/matches?status=review', what: 'Supplier matches waiting for your review.', example: hrefFor('spend', { seg: ['matches'], query: { status: 'review' } }) },
    { pattern: '#/contracts/<contract id>', what: 'One contract and its answers.', example: hrefFor('contracts', { seg: [cid] }) },
    { pattern: '#/source/<contract id>/<answer id>', what: 'A clause in the source viewer.', example: clause ? hrefFor('source', { seg: [clause.contractId, clause.extractionId], query: { from: 'opportunities' } }) : hrefFor('contracts') },
    { pattern: '#/method?s=<section>', what: 'A section of How this is calculated.', example: hrefFor('method', { query: { s: 'cap' } }) },
    { pattern: '#/guide?s=<section>', what: 'A section of this guide.', example: hrefFor('guide', { query: { s: 'tour' } }) },
  ];
}
