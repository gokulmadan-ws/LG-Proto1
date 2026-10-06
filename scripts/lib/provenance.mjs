// Builds Extraction[] (with provenance) and ContractDocument pages for each sample contract. All text is INVENTED for the demo.
//
// Page schema (documented in src/lib/estate.js and docs/handoff/A2.md). documents[docId].pages[pageNumber] is an ordered array of blocks:
//   { kind: 'header',  text }                      running header: 'Marchbank Borough Council | <document title> | Page N of M'
//   { kind: 'heading', num?, text }                clause or schedule heading ('14' + 'Charges and Maximum Contract Value', 'Schedule 3' + 'Schedule of rates', or just 'Contract Particulars')
//   { kind: 'clause' | 'item', num, title?, text, clauseRef?, extractionIds? }
//        'clause' = numbered clause / paragraph / table; 'item' = row of the Contract Particulars table.
//        A block is CITED when it has extractionIds; its text is EXACTLY the quote of every extraction it lists, clauseRef is the citation string.
//   { kind: 'footer',  text }
// Every cited page has: 1 header, 1 heading, 4 to 6 non-cited neighbouring clauses (6 on the richest contracts), the cited block(s), 1 footer.
import { longDate, SUPPLIERS } from './seed.mjs';

export const QUESTIONS = [
  { id: 'Q1', key: 'value_cap', label: 'Contract value and cap', help: 'What is the contract worth, and what is the most the council can pay?', fields: ['estimatedAnnualValue', 'awardedTotalValue', 'maximumValue'] },
  { id: 'Q2', key: 'dates', label: 'Start and end dates', help: 'When does the current term start and end?', fields: ['startDate', 'endDate'] },
  { id: 'Q3', key: 'extensions', label: 'Extension options', help: 'How many extensions, how long, and who decides?', fields: ['extensions'] },
  { id: 'Q4', key: 'notice', label: 'Notice period and auto-renewal', help: 'How much notice is needed, and does the contract renew by itself?', fields: ['noticePeriod', 'autoRenewal'] },
  { id: 'Q5', key: 'indexation', label: 'Price review and indexation cap', help: 'Which index applies, and what is the cap on increases?', fields: ['indexation'] },
  { id: 'Q6', key: 'payment_terms', label: 'Payment terms', help: 'How many days does the council have to pay a valid invoice?', fields: ['paymentTerms'] },
  { id: 'Q7', key: 'rate_card', label: 'Rate card', help: 'What unit rates and day rates are agreed?', fields: ['rateCard'] },
  { id: 'Q8', key: 'service_credits', label: 'Service credits', help: 'Is there a service credit regime, and how does it work?', fields: ['serviceCredits'] },
  { id: 'Q9', key: 'termination', label: 'Termination rights and exit fees', help: 'Can the council leave early, on what notice, and at what cost?', fields: ['terminationForConvenience', 'exitFees'] },
];
const FIELD_Q = {}; for (const q of QUESTIONS) for (const f of q.fields) FIELD_Q[f] = q.id;

// Page numbers per page kind (plus a per-contract offset of 0 to 4). Golden: C-005 cap clause is page 23 of 70; C-001 notice clause page 28; C-004 indexation page 45.
const PAGE = { particulars: 3, extension: 9, payment: 16, cap: 19, termination: 27, notice: 28, exitFees: 29, rateCard: 39, indexation: 42, credits: 47 };
const PAGE_OF_FIELD = { startDate: 'particulars', endDate: 'particulars', estimatedAnnualValue: 'particulars', awardedTotalValue: 'particulars', maximumValue: 'cap', extensions: 'extension', noticePeriod: 'notice', autoRenewal: 'notice', indexation: 'indexation', paymentTerms: 'payment', rateCard: 'rateCard', serviceCredits: 'credits', terminationForConvenience: 'termination', exitFees: 'exitFees' };

// The three richest contracts: six neighbouring clauses on every page and contract-specific wording (C-005 is the demo contract).
const RICH = new Set(['C-005', 'C-001', 'C-004']);
const FLAVOUR = {
  'C-005': {
    services: "reactive repairs, emergency make-safe works and minor works orders across the Council's adopted highway network",
    charges: 'The Council shall pay the Charges for each Order completed to the specification, priced from the Schedule of Rates in Schedule 3 and certified by the Council\'s Highways Manager.',
    variation: 'A Variation that increases the Maximum Contract Value takes effect only when it has been agreed in writing and signed for the Council by an officer with authority under its Contract Procedure Rules.',
    exitExtra: 'The Supplier shall complete or make safe every open Order before the exit date, and hand its records of inspections and defects to the Council.',
  },
  'C-001': {
    services: "hard and soft facilities services across the Council's operational buildings, including planned and reactive maintenance, security, cleaning and grounds",
    charges: 'The Council shall pay the Charges set out in Schedule 2 for the Services delivered each month, less any Service Credits deducted under Schedule 6.',
    variation: 'A Variation that increases the Maximum Contract Value takes effect only when it has been agreed in writing and signed for the Council by an officer with authority under its Contract Procedure Rules.',
    exitExtra: 'The Supplier shall keep the asset register and planned maintenance schedules up to date until the exit date and hand them to the Council or its replacement supplier.',
  },
  'C-004': {
    services: 'routine and reactive maintenance of street lighting columns, illuminated signs and bollards, and the replacement of lanterns across the Council\'s highway network',
    charges: 'The Council shall pay the Charges set out in Schedule 2 for lighting units maintained and works completed, measured against the inventory of lighting assets held by the Council.',
    variation: 'A Variation that increases the Maximum Contract Value takes effect only when it has been agreed in writing and signed for the Council by an officer with authority under its Contract Procedure Rules.',
    exitExtra: 'The Supplier shall hand over the lighting asset inventory, test certificates and defect logs to the Council in an agreed electronic format.',
  },
};

const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');
const words = { 1: 'one (1)', 3: 'three (3)', 6: 'six (6)', 12: 'twelve (12)' };
const noticeWords = (n) => n.unit === 'days' ? `${n.value} days'` : `${words[n.value] || n.value} months'`;
const INDEX_NAME = { CPI: 'the Consumer Prices Index (CPI)', RPI: 'the Retail Prices Index (RPI)', CPIH: 'CPIH' };
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RATE_CARDS = {
  default: [['Standard rate', 'per hour', 42.0], ['Senior rate', 'per hour', 68.0], ['Out-of-hours call-out', 'per call', 145.0]],
  'Facilities management': [['Operative', 'per hour', 19.4], ['Supervisor', 'per hour', 27.85], ['Out-of-hours call-out', 'per call', 145.0]],
  ICT: [['Service desk analyst', 'per day', 310.0], ['Engineer', 'per day', 480.0], ['Licence', 'per user per month', 14.2]],
  'Waste and recycling': [['Residual collection', 'per tonne', 68.5], ['Dry recycling', 'per tonne', 22.4], ['Bulky waste', 'per item', 17.5]],
  'Highways and street lighting': [['Operative', 'per hour', 31.2], ['Gang with vehicle', 'per hour', 96.0], ['Lantern replacement', 'per unit', 188.0]],
  'Adult social care': [['Standard care visit', 'per hour', 24.6], ['Evening and weekend', 'per hour', 28.9], ['Night sleep-in', 'per night', 118.0]],
};

/* ---- tiny UTC date helpers (the generator does not import the engine; tests compare the two) ---- */
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDaysIso = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return toIso(Date.UTC(y, m - 1, d) + n * 86400000); };
const addMonthsIso = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return toIso(+first);
};

/* ---- page layouts ----
 Each layout(x) returns { heading, body } where body is an ordered list of slots:
   { cite: [fieldKey, ...], num, title?, kind? }   the cited block (text, clauseRef and extraction ids come from the extraction itself, so the quote can never drift)
   { num, title?, text, kind?, opt? }              a neighbouring clause. opt 1 = included on the richest contracts and on odd-numbered ones, opt 2 = richest contracts only.
 Every layout has 4 base neighbours + 1 opt-1 + 1 opt-2, so a page carries 4 or 5 neighbours (6 on the richest contracts). Numbering is contiguous because optional clauses always come last. */
const LAYOUT = {
  particulars(x) {
    const { c, flav } = x; const supplier = SUPPLIERS.find((s) => s.id === c.supplierId);
    const maxStated = c.cap.source === 'maximum_stated';
    const budget = 'The estimated values in items 8 and 9 are provided for budgeting purposes only and do not oblige the Council to purchase any minimum volume of Services.';
    const body = [
      { kind: 'item', num: '1', text: 'Contracting Authority: Marchbank Borough Council.' },
      { kind: 'item', num: '2', text: `Supplier: ${c.supplierName}, company number ${supplier.companyNumber}.` },
      { kind: 'item', num: '3', text: `Services: ${flav ? `${c.title}, being ${flav.services}` : c.title}.` },
      { kind: 'item', num: '4', cite: ['startDate'] },
      { kind: 'item', num: '5', cite: ['endDate'] },
      { kind: 'item', num: '6', text: `Procurement route: ${c.procurementRoute}.` },
      { kind: 'item', num: '7', text: 'Governing law: the law of England and Wales.' },
      { kind: 'item', num: '8', cite: ['estimatedAnnualValue'] },
      { kind: 'item', num: '9', cite: ['awardedTotalValue'] },
    ];
    if (maxStated) body.push({ kind: 'item', num: '10', text: `${c.cap.basis === 'annual' ? 'Annual Cap' : 'Maximum Contract Value'}: see clause 14.3. ${budget}` });
    else { body.push({ kind: 'item', num: '10', cite: ['maximumValue'] }); body.push({ kind: 'item', num: '11', text: budget }); }
    return { heading: { text: 'Contract Particulars' }, body };
  },

  extension(x) {
    const { c } = x; const e = c.extension;
    const body = [{ num: '2.1', title: 'Term', text: 'This Agreement starts on the Commencement Date and continues until the Expiry Date, unless it ends earlier under clause 30 or is extended under this clause 2.' }, { num: '2.2', title: 'Extension', cite: ['extensions'] }];
    if (e.count > 0) {
      body.push({ num: '2.3', title: 'Terms of an extension', text: 'Each Extension Period is on the terms of this Agreement. The Charges for an Extension Period are reviewed only in accordance with Schedule 4.' });
      body.push({ num: '2.4', title: 'Decision', text: e.decider === 'mutual' ? 'An extension takes effect only if both parties have agreed it in writing before the notice date in clause 31.1.' : "The decision to extend is the Council's alone. The Supplier may not refuse an extension that the Council has validly exercised." });
      body.push({ num: '2.5', title: 'Longest possible Term', text: `The Term, including every Extension Period, cannot run beyond ${longDate(x.latestEnd)}.` });
      body.push({ num: '2.6', title: 'Interpretation', text: 'References to the Term include any Extension Period.', opt: 1 });
      body.push({ num: '2.7', title: 'No compensation', text: 'The Supplier is not entitled to compensation if the Council decides not to extend the Term.', opt: 2 });
    } else {
      body.push({ num: '2.3', title: 'Re-procurement', text: 'The Council shall decide before the notice date in clause 31.1 whether to procure a replacement for the Services.' });
      body.push({ num: '2.4', title: 'No implied extension', text: 'Nothing in this Agreement entitles the Supplier to carry out Services, or to be paid for them, after the Expiry Date unless the parties agree a Variation under clause 41.' });
      body.push({ num: '2.5', title: 'Further contracts', text: "Any further contract for the Services shall be awarded in accordance with the Council's Contract Procedure Rules." });
      body.push({ num: '2.6', title: 'Interpretation', text: 'References to the Term are to the period from the Commencement Date to the Expiry Date.', opt: 1 });
      body.push({ num: '2.7', title: 'No compensation', text: 'The Supplier is not entitled to compensation when the Term ends on the Expiry Date.', opt: 2 });
    }
    return { heading: { num: '2', text: 'Term and extension' }, body };
  },

  payment(x) {
    const { c } = x; const freq = { monthly: 'monthly in arrears', quarterly: 'quarterly in arrears', annual: 'annually in advance' }[x.t.freq];
    return { heading: { num: '12', text: 'Invoicing and payment' }, body: [
      { num: '12.1', title: 'Invoices', text: `The Supplier shall invoice the Council ${freq} for Services properly performed.` },
      { num: '12.2', title: 'Valid invoice', text: `A valid invoice shall quote the Council's purchase order number and the contract reference ${c.id}, and shall be addressed to the Council's Accounts Payable team.` },
      { num: '12.3', title: 'VAT', text: 'The Charges are exclusive of VAT. The Council shall pay VAT at the rate in force on receipt of a valid VAT invoice.' },
      { num: '12.4', title: 'Payment', cite: ['paymentTerms'] },
      { num: '12.5', title: 'Late payment', text: 'Interest on late payment accrues under the Late Payment of Commercial Debts (Interest) Act 1998.' },
      { num: '12.6', title: 'Disputed invoices', text: 'If the Council disputes part of an invoice it shall pay the undisputed part and tell the Supplier within ten (10) days why it disputes the rest.', opt: 1 },
      { num: '12.7', title: 'Set-off', text: 'The Council may set off any sum the Supplier owes the Council against a sum due to the Supplier under this Agreement.', opt: 2 },
    ] };
  },

  cap(x) {
    const { c, flav } = x; const annual = c.cap.basis === 'annual'; const term = annual ? 'Annual Cap' : 'Maximum Contract Value';
    const alert = gbp(c.cap.amountGBP * 0.8);
    return { heading: { num: '14', text: annual ? 'Charges and Annual Cap' : 'Charges and Maximum Contract Value' }, body: [
      { num: '14.1', title: 'Charges', text: flav ? flav.charges : 'The Council shall pay the Charges set out in Schedule 2 for Services properly performed in accordance with this Agreement.' },
      { num: '14.2', title: 'VAT', text: 'The Charges are exclusive of VAT and are the only sums payable by the Council for the Services.' },
      { num: '14.3', title: term, cite: ['maximumValue'] },
      { num: '14.4', title: 'Alert at 80%', text: annual
        ? `The Supplier shall notify the Council in writing when cumulative Charges in a Contract Year reach eighty per cent (80%) of the Annual Cap, being ${alert}.`
        : `The Supplier shall notify the Council in writing when cumulative Charges reach eighty per cent (80%) of the Maximum Contract Value, being ${alert}.` },
      { num: '14.5', title: 'Services beyond the limit', text: annual
        ? 'The Supplier shall not be obliged to perform Services that would cause the Annual Cap to be exceeded in a Contract Year unless a Variation has been agreed in writing under clause 41.'
        : 'The Supplier shall not be obliged to perform Services that would cause the Maximum Contract Value to be exceeded unless a Variation has been agreed in writing under clause 41.' },
      { num: '14.6', title: annual ? 'No carry forward' : 'No minimum commitment', text: annual
        ? 'The Annual Cap applies separately to each Contract Year. An unused amount does not carry forward to the next Contract Year.'
        : 'The Council is not obliged to purchase any minimum volume of Services, and the estimated values in the Contract Particulars do not create a minimum commitment.', opt: 1 },
      { num: '14.7', title: 'Approval of a Variation', text: flav ? flav.variation.replace('Maximum Contract Value', term) : `A Variation that increases the ${term} takes effect only when it has been agreed in writing and signed for the Council by an officer with authority under its Contract Procedure Rules.`, opt: 2 },
    ] };
  },

  termination(x) {
    const { c } = x; const conv = c.termination.forConvenience;
    return { heading: { num: '30', text: 'Termination' }, body: [
      { num: '30.1', title: 'Termination for convenience', cite: ['terminationForConvenience'] },
      { num: '30.2', title: 'Termination for breach', text: 'Either party may terminate this Agreement by written notice if the other commits a material breach that is not remedied within thirty (30) days of a notice requiring it to be remedied.' },
      { num: '30.3', title: 'Insolvency', text: 'The Council may terminate this Agreement immediately by written notice if the Supplier becomes insolvent or ceases to carry on business.' },
      { num: '30.4', title: 'Required by law', text: 'The Council may also terminate this Agreement by written notice if it is required to do so by law.' },
      { num: '30.5', title: conv ? 'Sums payable' : 'Routes to early exit', text: conv ? 'Where the Council terminates under clause 30.1, the only sums payable are those set out in clause 33.2.' : 'Because neither party may terminate for convenience, the Council\'s routes to early exit are those in clauses 30.2 to 30.4.' },
      { num: '30.6', title: 'Accrued rights', text: 'Termination does not affect any right that has accrued before the termination date.', opt: 1 },
      { num: '30.7', title: 'Performance during notice', text: 'During any notice period the Supplier shall continue to perform the Services in accordance with this Agreement.', opt: 2 },
    ] };
  },

  notice(x) {
    const { c } = x; const auto = c.autoRenewal.enabled;
    const lastDate = x.noticeDate ? `For the Initial Term, the last date on which the Council may give notice under clause 31.1 is ${longDate(x.noticeDate)}.` : null;
    const body = [{ num: '31.1', title: 'Expiry and renewal', cite: ['noticePeriod', 'autoRenewal'] }];
    if (!c.notice) {
      body.push({ num: '31.2', title: 'No notice to expire', text: 'No separate notice is required from either party for this Agreement to expire on the Expiry Date.' });
      body.push({ num: '31.3', title: 'Extension', text: 'Any extension under clause 2 must be agreed in writing before the Expiry Date.' });
      body.push({ num: '31.4', title: 'Services after expiry', text: 'The Supplier shall not provide Services after the Expiry Date unless the Council has agreed in writing that it should do so.' });
      body.push({ num: '31.5', title: 'Register', text: 'The Council shall record the Expiry Date in its contracts register.' });
    } else {
      body.push({ num: '31.2', title: 'Serving notice', text: 'Notice under clause 31.1 must be in writing and given in accordance with clause 45 (Notices).' });
      body.push(auto
        ? { num: '31.3', title: 'Renewal terms', text: 'Where this Agreement renews under clause 31.1, the renewed term is on the same terms and the Charges are reviewed in accordance with Schedule 4.' }
        : { num: '31.3', title: 'Expiry without notice', text: 'If the Council gives no notice, this Agreement expires on the Expiry Date and the Supplier has no right to payment for Services after that date unless a Variation has been agreed under clause 41.' });
      body.push({ num: '31.4', title: 'Last date for notice', text: lastDate });
      body.push(auto
        ? { num: '31.5', title: 'No reasons needed', text: 'The Council may give notice under clause 31.1 without giving reasons and without liability to pay compensation to the Supplier.' }
        : { num: '31.5', title: 'Withdrawing a notice', text: "The Council may withdraw a notice to extend only with the Supplier's written agreement." });
    }
    body.push(c.notice
      ? { num: '31.6', title: 'Register', text: 'The Council shall record the last date for notice in its contracts register.', opt: 1 }
      : { num: '31.6', title: 'Notices', text: 'Any notice given under this clause 31 must be in writing and given in accordance with clause 45 (Notices).', opt: 1 });
    body.push({ num: '31.7', title: 'Receipt', text: 'A notice is treated as received on the day of delivery by hand, or on the second Working Day after posting.', opt: 2 });
    return { heading: { num: '31', text: 'Expiry, renewal and notice' }, body };
  },

  exitFees(x) {
    const { flav } = x;
    return { heading: { num: '33', text: 'Consequences of termination' }, body: [
      { num: '33.1', title: 'Accrued rights', text: 'Termination or expiry does not affect any right or liability that accrued before the date of termination or expiry.' },
      { num: '33.2', title: 'Payments on termination', cite: ['exitFees'] },
      { num: '33.3', title: 'Exit assistance', text: 'On expiry or termination the Supplier shall give the Council the exit assistance described in Schedule 9 (Exit management).' },
      { num: '33.4', title: 'Return of property', text: "The Supplier shall return all Council data and property within thirty (30) days of the date of termination or expiry." },
      { num: '33.5', title: 'Survival', text: 'Clauses 11 (Confidentiality), 33 and 44 (Governing law) survive termination or expiry.' },
      { num: '33.6', title: 'Staff', text: 'Where staff transfer on exit, the parties shall comply with the provisions in Schedule 10 (Staff transfer).', opt: 1 },
      { num: '33.7', title: 'Handover', text: flav ? flav.exitExtra : 'The Supplier shall continue to provide the Services in accordance with this Agreement until the exit date.', opt: 2 },
    ] };
  },

  rateCard(x) {
    const { c } = x; const fixed = c.indexation.indexName === 'None';
    return { heading: { num: 'Schedule 3', text: 'Schedule of rates' }, body: [
      { num: '1', title: 'Application', text: 'The rates in Table 1 apply to Services ordered during the Initial Term and any Extension Period.' },
      { num: 'Table 1', title: 'Rates', cite: ['rateCard'] },
      { num: '2', title: 'VAT', text: 'All rates are exclusive of VAT.' },
      { num: '3', title: 'Review of rates', text: fixed ? 'The rates are fixed for the Initial Term.' : 'The rates are reviewed once a year in accordance with Schedule 4.' },
      { num: '4', title: 'Additional work', text: 'Work that is not covered by Table 1 shall be priced pro rata from the nearest equivalent rate and agreed in writing before the work starts.' },
      { num: '5', title: 'Travel', text: 'The Council shall not be charged for travel time or mobilisation unless Table 1 says so.', opt: 1 },
      { num: '6', title: 'Out of hours', text: 'An out-of-hours rate applies only to work that the Council has asked the Supplier to carry out outside normal working hours.', opt: 2 },
    ] };
  },

  indexation(x) {
    const { c } = x; const ix = c.indexation; const fixed = ix.indexName === 'None'; const capped = ix.capPct != null;
    const base = [
      { num: '1.1', title: 'Starting Charges', text: 'The Charges at the Commencement Date are set out in Schedule 2.' },
      { num: '1.2', title: 'Changes', text: 'The Charges may be changed only under this Schedule 4 or by a Variation under clause 41.' },
      { num: '2.1', title: 'Annual review', cite: ['indexation'] },
    ];
    if (fixed) base.push(
      { num: '2.2', title: 'Requests to change', text: 'Any request to change the Charges during the Initial Term must follow clause 41 (Variation).' },
      { num: '2.3', title: "No change for the Supplier's costs", text: "Nothing in this Schedule 4 permits an increase because of changes in the Supplier's own costs, including labour, plant, materials and fuel." },
      { num: '2.4', title: 'Agreement in writing', text: 'The Council shall not be required to pay an increase in the Charges that has not been agreed in writing under clause 41.', opt: 1 },
      { num: '2.5', title: 'Inclusive Charges', text: 'The Charges include all costs of delivering the Services, including labour, plant and materials.', opt: 2 });
    else base.push(
      { num: '2.2', title: 'Evidence', text: 'The Supplier shall send the Council the index figures it has used, with its calculation, at least thirty (30) days before the review date.' },
      { num: '2.3', title: 'No retrospective increase', text: 'A change takes effect from the review date only and does not apply retrospectively.' },
      { num: '2.4', title: capped ? 'Cap applies' : 'Council approval', text: capped ? 'If the index figure is higher than the limit in paragraph 2.1, the limit applies.' : "The Council may ask the Supplier to explain any increase before it takes effect.", opt: 1 },
      { num: '2.5', title: 'Late evidence', text: 'If the Supplier does not give the evidence required by paragraph 2.2 by the review date, the Charges stay the same until the next review date.', opt: 2 });
    return { heading: { num: 'Schedule 4', text: 'Price review' }, body: base };
  },

  credits(x) {
    const { c } = x; const present = c.serviceCredits.present;
    return { heading: { num: 'Schedule 6', text: 'Performance and service credits' }, body: [
      { num: '1.1', title: 'Performance standards', text: 'The Supplier shall meet the Key Performance Indicators set out in Annex A to this Schedule.' },
      { num: '2.1', title: 'Reporting', text: 'The Supplier shall give the Council a performance report by the fifth (5th) Working Day of each month.' },
      { num: '2.2', title: 'Audit', text: 'The Council may audit the performance data on reasonable notice.' },
      { num: '3.1', title: 'Service Credits', cite: ['serviceCredits'] },
      { num: '3.2', title: present ? 'Not a penalty' : 'Other remedies', text: present ? 'Service Credits are a price adjustment that reflects the reduced value of the Services. They are not a penalty.' : "The Council's remedies for poor performance are set out in clause 22 (Performance management)." },
      { num: '3.3', title: present ? 'Deduction' : 'Repeated failure', text: present ? 'Service Credits shall be deducted from the next invoice, or paid by the Supplier within thirty (30) days if no further invoice is due.' : 'Repeated failure to meet a Key Performance Indicator is a Performance Failure and shall be dealt with under clause 22.', opt: 1 },
      { num: '3.4', title: present ? 'Overall limit' : 'Escalation', text: present ? 'The limit of 10% of the monthly Charges applies to all Service Credits in a month taken together.' : 'The Council may escalate a Performance Failure to the Supplier\'s senior management under clause 22.', opt: 2 },
    ] };
  },
};

export function buildProvenance(contracts) {
  const extractions = [], documents = {};
  contracts.forEach((c, idx) => {
    const off = idx % 5, t = c._src;
    const docId = `DOC-${c.id}`;
    const rich = RICH.has(c.id);
    const doc = { id: docId, contractId: c.id, title: `${c.title}: agreement`, pageCount: 54 + (idx % 7) * 4, isIllustrative: true, pages: {} };
    documents[docId] = doc; c.documentId = docId; c.extractionIds = {};
    const cited = {}; // fieldKey -> { quote, clauseRef, page, id }
    // maximumValue sits on the cap page (clause 14.3) only when a maximum is stated; otherwise the finding is item 10 of the Particulars
    const pageKeyOf = (f) => (f === 'maximumValue' && c.cap.source !== 'maximum_stated' ? 'particulars' : PAGE_OF_FIELD[f]);
    const add = (fieldKey, clauseRef, quote, answer, answerType, confidence = 0.93 + ((idx * 7 + fieldKey.length) % 6) / 100, status = 'found') => {
      if (fieldKey === 'rateCard' && idx % 3 === 0 && confidence >= 0.9) confidence = 0.84; // a few medium-confidence answers for realism
      if (fieldKey === 'serviceCredits' && idx % 5 === 1 && confidence >= 0.9) confidence = 0.88;
      const id = `X-${c.id}-${fieldKey}`; const page = PAGE[pageKeyOf(fieldKey)] + off;
      extractions.push({ id, contractId: c.id, questionId: FIELD_Q[fieldKey], fieldKey, answer, answerType, status, confidence: Math.round(confidence * 100) / 100, provenance: [{ documentId: docId, page, clauseRef, quote }], reviewed: false });
      cited[fieldKey] = { quote, clauseRef, page, id };
      c.extractionIds[fieldKey] = id; c.confidence[fieldKey] = Math.round(confidence * 100) / 100;
    };
    // Q2
    add('startDate', 'Contract Particulars, item 4', `Commencement Date: ${longDate(c.startDate)}.`, c.startDate, 'date');
    add('endDate', 'Contract Particulars, item 5', `Expiry Date of the Initial Term: ${longDate(c.endDate)}.`, c.endDate, 'date');
    // Q1
    add('estimatedAnnualValue', 'Contract Particulars, item 8', `Estimated annual value of the Services: £${c.annualValueGBP.toLocaleString('en-GB')} (excluding VAT).`, c.annualValueGBP, 'money');
    add('awardedTotalValue', 'Contract Particulars, item 9', `Estimated total value over the Initial Term: £${c.totalValueGBP.toLocaleString('en-GB')} (excluding VAT).`, c.totalValueGBP, 'money');
    if (c.cap.source === 'maximum_stated') {
      const per = c.cap.basis === 'annual' ? 'in any Contract Year (the Annual Cap)' : 'in aggregate (the Maximum Contract Value)';
      add('maximumValue', 'Clause 14.3', `The Council's liability to pay the Charges under this Agreement shall not exceed £${c.cap.amountGBP.toLocaleString('en-GB')} ${per} unless increased by a Variation under clause 41.`, { amountGBP: c.cap.amountGBP, basis: c.cap.basis }, 'money_cap');
    } else {
      // no stated maximum: the finding is a statement on the Particulars page (item 10), not a clause on the cap page
      add('maximumValue', 'Contract Particulars, item 10', 'No maximum contract value is stated. The estimated total value above is the only value limit in the Agreement.', null, 'money_cap', 0.9, 'not_found');
    }
    // Q3
    const e = c.extension;
    add('extensions', 'Clause 2.2',
      e.count === 0 ? 'There is no right to extend the Term beyond the Expiry Date.' :
      e.decider === 'mutual' ? `The parties may agree in writing to extend the Term on ${e.count} occasion${e.count > 1 ? 's' : ''} by up to ${e.lengthMonths} months each time.` :
      `The Council may, by giving the Supplier written notice, extend the Term on ${e.count} occasion${e.count > 1 ? 's' : ''} by up to ${e.lengthMonths} months each time (each an Extension Period).`,
      { count: e.count, lengthMonths: e.lengthMonths, decider: e.decider }, 'extensions');
    // Q4 (noticePeriod and autoRenewal cite the same clause, so they share one block on the page)
    const low = t.lowConf && t.lowConf.noticePeriod;
    const autoQuote = c.autoRenewal.enabled
      ? `Unless the Council gives the Supplier not less than ${c.notice ? noticeWords(c.notice) : 'three (3) months\''} written notice before the end of the Initial Term, this Agreement shall renew automatically for a further period of ${c.autoRenewal.periodMonths} months.`
      : (c.notice ? `The Council shall give the Supplier not less than ${noticeWords(c.notice)} written notice before the end of the Initial Term if it wishes to exercise an extension option or to let this Agreement expire.` : 'This Agreement shall expire on the Expiry Date unless extended in accordance with clause 2.');
    if (c.notice) add('noticePeriod', 'Clause 31.1', autoQuote, c.notice, 'duration');
    else add('noticePeriod', 'Clause 31.1', autoQuote, null, 'duration', low || 0.58, 'needs_review');
    add('autoRenewal', 'Clause 31.1', autoQuote, c.autoRenewal, 'auto_renewal', c.notice ? undefined : 0.7);
    // Q5
    const ix = c.indexation; const rd = ix.reviewMonthDay ? `${parseInt(ix.reviewMonthDay.slice(3), 10)} ${MONTH[parseInt(ix.reviewMonthDay.slice(0, 2), 10) - 1]}` : null;
    add('indexation', 'Schedule 4, paragraph 2.1',
      ix.indexName === 'None' ? 'The Charges are fixed for the Initial Term and are not subject to indexation.' :
      ix.capPct != null ? `The Charges shall be reviewed on ${rd} each year by reference to ${INDEX_NAME[ix.indexName]} for the preceding September, provided that no increase shall exceed ${(ix.capPct * 100).toFixed(1)}% in any Contract Year.` :
      `The Charges shall be reviewed on ${rd} each year by reference to ${INDEX_NAME[ix.indexName]} for the preceding September.`,
      { indexName: ix.indexName, capPct: ix.capPct, reviewMonthDay: ix.reviewMonthDay }, 'indexation');
    // Q6
    add('paymentTerms', 'Clause 12.4', `The Council shall pay each undisputed invoice within ${c.paymentTermsDays} days of receipt.`, c.paymentTermsDays, 'days');
    // Q7
    const rc = RATE_CARDS[c.serviceCategory] || RATE_CARDS.default; c.rateCard = rc.map(([item, unit, rateGBP]) => ({ item, unit, rateGBP }));
    add('rateCard', 'Schedule 3, Table 1', `Schedule of rates: ${rc.map(([i, u, r]) => `${i} ${u} £${r.toFixed(2)}`).join('; ')}.`, c.rateCard, 'rate_card');
    // Q8
    add('serviceCredits', 'Schedule 6, paragraph 3.1', c.serviceCredits.present
      ? 'If the Supplier fails to meet a Key Performance Indicator in a month, the Council may deduct a Service Credit of 2% of the monthly Charges for each failure, up to a maximum of 10% of the monthly Charges.'
      : 'No service credit regime applies under this Agreement.', c.serviceCredits.present ? { present: true, perFailurePct: 0.02, monthlyCapPct: 0.10 } : { present: false }, 'service_credits');
    // Q9
    const tm = c.termination;
    add('terminationForConvenience', 'Clause 30.1', tm.forConvenience ? `The Council may terminate this Agreement for convenience at any time by giving the Supplier not less than ${words[tm.noticeMonths] || tm.noticeMonths} months' written notice.` : 'Neither party may terminate this Agreement for convenience.', { allowed: tm.forConvenience, noticeMonths: tm.noticeMonths }, 'termination');
    add('exitFees', 'Clause 33.2', tm.exitFeesSummary === 'None' ? 'No termination payment is due from the Council except for Charges properly incurred up to the termination date.' : `On early termination the Council shall pay: ${tm.exitFeesSummary}.`, { present: tm.exitFeesSummary !== 'None', summary: tm.exitFeesSummary }, 'exit_fees');

    // ---- render every cited page as a contract page ----
    const x = {
      c, t, idx, rich, flav: FLAVOUR[c.id] || null,
      latestEnd: addMonthsIso(c.endDate, e.count * e.lengthMonths),
      noticeDate: c.notice ? (c.notice.unit === 'months' ? addMonthsIso(c.endDate, -c.notice.value) : addDaysIso(c.endDate, -c.notice.value)) : null,
    };
    const supplierName = c.supplierName;
    for (const pageKey of Object.keys(PAGE)) {
      const effective = Object.keys(cited).filter((f) => pageKeyOf(f) === pageKey);
      if (!effective.length) continue;
      const page = PAGE[pageKey] + off;
      const lay = LAYOUT[pageKey](x);
      const blocks = [{ kind: 'header', text: `Marchbank Borough Council | ${doc.title} | Page ${page} of ${doc.pageCount}` }, { kind: 'heading', ...(lay.heading.num ? { num: lay.heading.num } : {}), text: lay.heading.text }];
      let neighbours = 0; const used = new Set();
      for (const slot of lay.body) {
        if (slot.opt === 1 && !(rich || idx % 2 === 1)) continue;
        if (slot.opt === 2 && !rich) continue;
        if (slot.cite) {
          const first = cited[slot.cite[0]];
          for (const f of slot.cite) { if (cited[f].quote !== first.quote || cited[f].clauseRef !== first.clauseRef || cited[f].page !== page) throw new Error(`${c.id}: ${f} does not share block ${slot.num} on page ${page}`); used.add(f); }
          blocks.push({ kind: slot.kind || 'clause', num: slot.num, ...(slot.title ? { title: slot.title } : {}), text: first.quote, clauseRef: first.clauseRef, extractionIds: slot.cite.map((f) => cited[f].id) });
        } else {
          neighbours++;
          blocks.push({ kind: slot.kind || 'clause', num: slot.num, ...(slot.title ? { title: slot.title } : {}), text: slot.text });
        }
      }
      for (const f of effective) if (!used.has(f)) throw new Error(`${c.id}: ${f} was not placed on page ${page} (${pageKey})`);
      if (neighbours < 4 || neighbours > 6) throw new Error(`${c.id} page ${page}: ${neighbours} neighbouring clauses (want 4 to 6)`);
      blocks.push({ kind: 'footer', text: `Execution version | Contract ref ${c.id} | ${supplierName}` });
      doc.pages[page] = blocks;
    }
  });
  return { extractions, documents };
}
