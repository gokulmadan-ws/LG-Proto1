// Deterministic sample estate for "Marchbank Borough Council" (FICTIONAL). Every supplier, contract and payment is invented.
// Exports buildSample(). Aggregates (spend by window) hit the plan figures exactly; only dates, amounts within a window and name variants use the seeded RNG.
export const AS_OF = '2026-10-06';
export const SPEND_FROM = '2022-04-01';
export const SPEND_TO = '2026-09-30';
// Find a Tender publishes the contract itself only for procurements started on or after this date AND worth over GBP 5m (Procurement Act 2023).
export const FTS_FROM = '2025-02-24';
export const FTS_MIN_TOTAL = 5000000;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');
const maxD = (a, b) => (a > b ? a : b), minD = (a, b) => (a < b ? a : b);

/* ---- suppliers ---- */
export const SUPPLIERS = [
  ['S-01', 'Kestrelvale Facilities Services Ltd'], ['S-02', 'Wrenfield Care Partners Ltd'], ['S-03', 'Quillon Waste Services Ltd'],
  ['S-04', 'Ordwell Lighting and Signs Ltd'], ['S-05', 'Fennimore Highways Ltd'], ['S-06', 'Brindlemere Leisure Trust'],
  ['S-07', 'Pellam Digital Ltd'], ['S-08', 'Ashmere Property Services Ltd'], ['S-09', 'Larchmont Grounds Ltd'],
  ['S-10', 'Hexmoor Software Ltd'], ['S-11', 'Westerfield Legal LLP'], ['S-12', 'Tarnbrook Passenger Transport Ltd'],
  ['S-13', 'Dunmore Catering Services Ltd'], ['S-14', 'Stonemere Energy Supply Ltd'], ['S-15', 'Rookhope Fleet Solutions Ltd'],
  ['S-16', 'Veridene Parking Services Ltd'], ['S-17', 'Zennor Telecom Ltd'], ['S-18', 'Aldwick Cleansing Ltd'],
  ['S-19', 'Ivelet Library Systems Ltd'], ['S-20', 'Norland Cleaning Services Ltd'], ['S-21', 'Ashdene Risk Partners Ltd'],
  ['S-22', 'Pennard Community Care CIC'], ['S-23', 'Eastmoor Telecare Ltd'], ['S-24', 'Halvorsen Contact Solutions Ltd'],
].map(([id, legalName], i) => ({ id, legalName, companyNumber: String(90010000 + i * 137).padStart(8, '0'), isFictional: true }));

// Alias table: trading names that appear in the contract documents (normalised form -> supplierId)
export const ALIASES = { 'kestrelvale fm': 'S-01', 'quillon environmental': 'S-03' };

// Payment name variants. [name, weight]. Variants chosen by seeded RNG per payment.
const NAME_VARIANTS = {
  'S-01': [['Kestrelvale Facilities Services Ltd', 6], ['KESTRELVALE FACILITIES SVCS LTD', 3], ['Kestrelvale FM', 1]],
  'S-03': [['Quillon Waste Services Ltd', 7], ['QUILLON WASTE SERVICES LIMITED', 2], ['Quillon Environmental', 1]],
  'S-05': [['Fennimore Highways Ltd', 8], ['FENNIMORE HIGHWAYS LIMITED', 2]],
  'S-12': [['Tarnbrook Passenger Transport Ltd', 8], ['TARNBROOK PASSENGER TRANSPORT', 2]],
};

/* ---- contract table ----
 plan = spend by window { early, p12, t12 } in GBP; segs overrides (custom segments); freq = payment cadence */
const C = (o) => o;
export const CONTRACT_TABLE = [
  C({ id: 'C-001', title: 'Integrated facilities management', sup: 'S-01', cat: 'Facilities management', route: 'Open procedure', start: '2022-04-01', end: '2027-03-31', ext: [2, 12, 'council'], notice: [6, 'months'], auto: null, annual: 2400000, total: 12000000, cap: [12000000, 'total_term', 'maximum_stated'], index: ['CPI', 0.03, '04-01'], pay: 30, plan: { early: 6210000, p12: 2550000, t12: 2620000 }, freq: 'monthly', credits: true, term: [true, 6, 'Unamortised mobilisation costs, reducing monthly over the Initial Term'] }),
  C({ id: 'C-002', title: 'Domiciliary care call-off', sup: 'S-02', cat: 'Adult social care', route: 'Framework call-off', start: '2023-04-01', end: '2028-03-31', ext: [1, 24, 'mutual'], notice: [12, 'months'], auto: null, annual: 2900000, total: 14500000, cap: [16000000, 'total_term', 'maximum_stated'], index: ['CPI', 0.04, '04-01'], pay: 28, plan: { early: 4400000, p12: 2950000, t12: 3050000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
  C({ id: 'C-003', title: 'Waste collection and recycling', sup: 'S-03', cat: 'Waste and recycling', route: 'Open procedure', start: '2019-02-01', end: '2027-01-31', ext: [0, 0, 'none'], notice: [3, 'months'], auto: [true, 12], annual: 6200000, total: 49600000, cap: [49600000, 'total_term', 'contract_value'], index: ['CPI', 0.04, '02-01'], pay: 30, plan: { early: 14900000, p12: 6150000, t12: 6420000 }, freq: 'monthly', credits: true, term: [true, 6, 'Unamortised vehicle costs, up to £1.2m'] }),
  C({ id: 'C-004', title: 'Street lighting and signage maintenance', sup: 'S-04', cat: 'Highways and street lighting', route: 'Open procedure', start: '2022-08-01', end: '2027-07-31', ext: [1, 12, 'council'], notice: [6, 'months'], auto: null, annual: 2200000, total: 11000000, cap: [11000000, 'total_term', 'maximum_stated'], index: ['CPI', 0.03, '08-01'], pay: 30, plan: { early: 4500000, p12: 2060000, t12: 2310000 }, freq: 'monthly', credits: true, term: [true, 6, 'None'] }),
  C({ id: 'C-005', title: 'Highways reactive maintenance and minor works', sup: 'S-05', cat: 'Highways and street lighting', route: 'Open procedure', start: '2022-06-01', end: '2027-05-31', ext: [0, 0, 'none'], notice: [3, 'months'], auto: null, annual: 1000000, total: 5000000, cap: [5000000, 'total_term', 'maximum_stated'], index: ['None', null, null], pay: 30, plan: { early: 3900000, p12: 2100000, t12: 2350000 }, freq: 'monthly', credits: false, term: [true, 3, 'None'] }),
  C({ id: 'C-006', title: 'Leisure centres management', sup: 'S-06', cat: 'Leisure and culture', route: 'Concession', start: '2022-04-01', end: '2032-03-31', ext: [1, 60, 'mutual'], notice: [12, 'months'], auto: null, annual: 1100000, total: 11000000, cap: [11000000, 'total_term', 'contract_value'], index: ['RPI', 0.035, '04-01'], pay: 30, plan: { early: 2800000, p12: 1120000, t12: 1150000 }, freq: 'quarterly', credits: false, term: [false, 0, 'Fixed termination sum of £450,000 in years 1 to 5'] }),
  C({ id: 'C-007', title: 'ICT managed service and end-user support', sup: 'S-07', cat: 'ICT', route: 'Framework call-off', start: '2023-05-01', end: '2026-04-30', ext: [2, 12, 'council'], notice: [3, 'months'], auto: null, annual: 1800000, total: 5400000, cap: [5400000, 'total_term', 'maximum_stated'], index: ['None', null, null], pay: 30, segs: [['2023-05-01', '2024-10-06', 2550000], ['2024-10-07', '2025-10-06', 1780000], ['2025-10-07', '2026-04-30', 1050000], ['2026-05-01', '2026-09-30', 780000]], freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
  C({ id: 'C-008', title: 'Housing repairs and voids', sup: 'S-08', cat: 'Housing', route: 'Open procedure', start: '2024-04-01', end: '2029-03-31', ext: [2, 12, 'mutual'], notice: [6, 'months'], auto: null, annual: 4000000, total: 20000000, cap: [22000000, 'total_term', 'maximum_stated'], index: ['CPI', 0.03, '04-01'], pay: 30, plan: { early: 1950000, p12: 4050000, t12: 4120000 }, freq: 'monthly', credits: true, term: [true, 6, 'Unamortised mobilisation costs'] }),
  C({ id: 'C-009', title: 'Grounds maintenance', sup: 'S-09', cat: 'Parks and open spaces', route: 'Open procedure', start: '2022-04-01', end: '2027-03-31', ext: [1, 12, 'council'], notice: [3, 'months'], auto: null, annual: 420000, total: 2100000, cap: [2200000, 'total_term', 'maximum_stated'], index: ['CPI', 0.03, '04-01'], pay: 30, segs: [['2022-04-01', '2024-10-06', 1170000], ['2024-10-07', '2025-10-06', 540000], ['2025-10-07', '2026-04-06', 250000]], freq: 'monthly', credits: false, term: [true, 3, 'None'], lateVariant: ['Larchmont Grounds Maintenance', '2026-04-07', '2026-09-30', 300000] }),
  C({ id: 'C-010', title: 'Social care case management software', sup: 'S-10', cat: 'ICT', route: 'Framework call-off', start: '2024-01-01', end: '2028-12-31', ext: [2, 12, 'council'], notice: [6, 'months'], auto: [true, 12], annual: 480000, total: 2400000, cap: [2400000, 'total_term', 'contract_value'], index: ['CPI', 0.03, '01-01'], pay: 30, plan: { early: 480000, p12: 498000, t12: 531000 }, freq: 'annual', credits: true, term: [true, 6, 'Licence fees for the remainder of the paid year are not refundable'] }),
  C({ id: 'C-011', title: 'Legal services panel', sup: 'S-11', cat: 'Legal and professional', route: 'Direct award', start: '2023-04-01', end: '2028-03-31', ext: [0, 0, 'none'], notice: [3, 'months'], auto: null, annual: 420000, total: 2100000, cap: [450000, 'annual', 'maximum_stated'], index: ['CPI', null, '04-01'], pay: 30, segs: [['2023-04-01', '2024-03-31', 430000], ['2024-04-01', '2025-03-31', 512000], ['2025-04-01', '2026-03-31', 447000], ['2026-04-01', '2026-09-30', 228000]], freq: 'monthly', credits: false, term: [true, 1, 'None'] }),
  C({ id: 'C-012', title: 'Home-to-school transport', sup: 'S-12', cat: 'Transport', route: 'Dynamic purchasing system', start: '2022-09-01', end: '2029-08-31', ext: [0, 0, 'none'], notice: [6, 'months'], auto: null, annual: 1700000, total: 11900000, cap: [12500000, 'total_term', 'maximum_stated'], index: ['RPI', 0.045, '09-01'], pay: 30, plan: { early: 3550000, p12: 1800000, t12: 1930000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
  C({ id: 'C-013', title: 'School meals catering', sup: 'S-13', cat: 'Catering', route: 'Open procedure', start: '2023-09-01', end: '2028-08-31', ext: [1, 12, 'council'], notice: [3, 'months'], auto: null, annual: 1300000, total: 6500000, cap: [6500000, 'total_term', 'contract_value'], index: ['CPI', 0.03, '09-01'], pay: 30, plan: { early: 1420000, p12: 1330000, t12: 1360000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
  C({ id: 'C-014', title: 'Electricity and gas supply', sup: 'S-14', cat: 'Energy', route: 'Framework call-off', start: '2024-10-01', end: '2027-09-30', ext: [1, 12, 'council'], notice: [3, 'months'], auto: null, annual: 1400000, total: 4200000, cap: [4200000, 'total_term', 'contract_value'], index: ['None', null, null], pay: 14, plan: { early: 0, p12: 1450000, t12: 1300000 }, freq: 'monthly', credits: false, term: [false, 0, 'None'] }),
  C({ id: 'C-015', title: 'Fleet vehicle lease and maintenance', sup: 'S-15', cat: 'Fleet', route: 'Open procedure', start: '2022-11-01', end: '2027-10-31', ext: [1, 12, 'council'], notice: [6, 'months'], auto: null, annual: 780000, total: 3900000, cap: [4300000, 'total_term', 'maximum_stated'], index: ['CPI', 0.03, '11-01'], pay: 30, plan: { early: 1500000, p12: 800000, t12: 830000 }, freq: 'monthly', credits: false, term: [true, 6, 'Early termination charge equal to 50% of remaining lease rentals'] }),
  C({ id: 'C-016', title: 'Parking enforcement services', sup: 'S-16', cat: 'Parking and traffic', route: 'Open procedure', start: '2020-01-01', end: '2026-12-31', ext: [0, 0, 'none'], notice: [6, 'months'], auto: [true, 12], annual: 950000, total: 6650000, cap: [6650000, 'total_term', 'contract_value'], index: ['CPI', 0.03, '01-01'], pay: 30, plan: { early: 2350000, p12: 960000, t12: 970000 }, freq: 'monthly', credits: true, term: [true, 6, 'None'] }),
  C({ id: 'C-017', title: 'Mobile voice and data', sup: 'S-17', cat: 'ICT', route: 'Framework call-off', start: '2023-07-01', end: '2026-12-31', ext: [0, 0, 'none'], notice: [30, 'days'], auto: [true, 12], annual: 310000, total: 1090000, cap: [1090000, 'total_term', 'contract_value'], index: ['None', null, null], pay: 30, plan: { early: 360000, p12: 310000, t12: 320000 }, freq: 'monthly', credits: false, term: [true, 1, 'None'] }),
  C({ id: 'C-018', title: 'Street cleansing', sup: 'S-18', cat: 'Waste and recycling', route: 'Open procedure', start: '2021-03-01', end: '2027-02-28', ext: [0, 0, 'none'], notice: null, auto: null, annual: 1150000, total: 6900000, cap: [6900000, 'total_term', 'contract_value'], index: ['RPI', 0.035, '03-01'], pay: 30, plan: { early: 2900000, p12: 1170000, t12: 1190000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'], lowConf: { noticePeriod: 0.58 } }),
  C({ id: 'C-019', title: 'Library management system', sup: 'S-19', cat: 'ICT', route: 'Framework call-off', start: '2025-04-01', end: '2030-03-31', ext: [1, 24, 'council'], notice: [6, 'months'], auto: null, annual: 180000, total: 900000, cap: [900000, 'total_term', 'contract_value'], index: ['CPI', 0.03, '04-01'], pay: 30, plan: { early: 0, p12: 95000, t12: 181000 }, freq: 'quarterly', credits: false, term: [true, 3, 'None'] }),
  C({ id: 'C-020', title: 'Civic buildings cleaning', sup: 'S-20', cat: 'Facilities management', route: 'Open procedure', start: '2024-06-01', end: '2029-05-31', ext: [1, 24, 'council'], notice: [6, 'months'], auto: null, annual: 620000, total: 3100000, cap: [3100000, 'total_term', 'contract_value'], index: ['CPI', 0.03, '06-01'], pay: 30, plan: { early: 120000, p12: 626000, t12: 640000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
  C({ id: 'C-021', title: 'Insurance brokerage', sup: 'S-21', cat: 'Legal and professional', route: 'Open procedure', start: '2023-04-01', end: '2030-03-31', ext: [0, 0, 'none'], notice: [6, 'months'], auto: null, annual: 340000, total: 2380000, cap: [2380000, 'total_term', 'contract_value'], index: ['None', null, null], pay: 30, plan: { early: 520000, p12: 340000, t12: 340000 }, freq: 'quarterly', credits: false, term: [true, 6, 'None'] }),
  C({ id: 'C-022', title: 'Adult day services', sup: 'S-22', cat: 'Adult social care', route: 'Light-touch regime', start: '2025-01-01', end: '2029-12-31', ext: [1, 24, 'council'], notice: [6, 'months'], auto: null, annual: 1600000, total: 8000000, cap: [8800000, 'total_term', 'maximum_stated'], index: ['CPI', 0.03, '01-01'], pay: 28, plan: { early: 0, p12: 1050000, t12: 1640000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
  C({ id: 'C-023', title: 'Telecare and community alarm service', sup: 'S-23', cat: 'Adult social care', route: 'Open procedure', start: '2023-11-01', end: '2028-10-31', ext: [1, 12, 'council'], notice: [6, 'months'], auto: null, annual: 740000, total: 3700000, cap: [3700000, 'total_term', 'contract_value'], index: ['CPI', 0.03, '11-01'], pay: 30, plan: { early: 790000, p12: 745000, t12: 760000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
  C({ id: 'C-024', title: 'Contact centre telephony', sup: 'S-24', cat: 'ICT', route: 'Framework call-off', start: '2025-02-01', end: '2029-01-31', ext: [1, 12, 'council'], notice: [6, 'months'], auto: null, annual: 520000, total: 2080000, cap: [2080000, 'total_term', 'contract_value'], index: ['CPI', 0.03, '02-01'], pay: 30, plan: { early: 0, p12: 280000, t12: 526000 }, freq: 'monthly', credits: true, term: [true, 3, 'None'] }),
];

// Suppliers with spend but NO contract on the register (Edinburgh pattern). [name, early, p12, t12, category, department, freq]
export const NON_CONTRACTED = [
  ['Dunmoor Agency Staffing Ltd', 4600000, 2300000, 2400000, 'Agency staff', 'Adult Social Care', 'monthly'],
  ['Oakhaven Independent Care Placements Ltd', 1900000, 1350000, 1500000, 'Placements', "Children's Services", 'monthly'],
  ['Harlowe Transport Hire Ltd', 1250000, 650000, 700000, 'Transport hire', 'Environment', 'monthly'],
  ['Corran Digital Consulting Ltd', 900000, 700000, 800000, 'Consultancy', 'Corporate Services', 'monthly'],
  ['Bellmere Building Supplies Ltd', 640000, 420000, 450000, 'Materials', 'Housing', 'monthly'],
  ['Pennywhistle Print and Mailing Ltd', 520000, 260000, 280000, 'Printing and postage', 'Corporate Services', 'monthly'],
  ['Skerrow Temporary Accommodation Ltd', 700000, 480000, 520000, 'Temporary accommodation', 'Housing', 'monthly'],
  ['Mirefield Training Partners Ltd', 220000, 140000, 150000, 'Training', 'Corporate Services', 'quarterly'],
];

/* ---- payments ---- */
function genSegment(rng, { from, to, total, freq, names, dept, expType, purpose, contractKey, startIdx }) {
  if (!(total > 0) || from > to) return [];
  const [fy, fm] = from.split('-').map(Number), [ty, tm] = to.split('-').map(Number);
  const dates = [];
  for (let y = fy, m = fm - 1; y < ty || (y === ty && m <= tm - 1); m++) {
    if (m > 11) { m = 0; y++; if (y > ty || (y === ty && m > tm - 1)) break; }
    if (freq === 'quarterly' && m % 3 !== 0) continue;
    if (freq === 'annual' && m !== 0) continue;
    const day = freq === 'monthly' ? 8 + Math.floor(rng() * 21) : 15;
    const d = iso(y, m, day);
    if (d >= from && d <= to) dates.push(d);
  }
  if (!dates.length) dates.push(iso(fy, fm - 1, 15) >= from ? iso(fy, fm - 1, 15) : iso(fy, fm - 1, 20));
  const w = dates.map(() => 0.94 + rng() * 0.12); const ws = w.reduce((a, b) => a + b, 0);
  let amts = w.map((x) => Math.round((total * x / ws) * 100) / 100);
  const diff = Math.round((total - amts.reduce((a, b) => a + b, 0)) * 100) / 100;
  amts[amts.length - 1] = Math.round((amts[amts.length - 1] + diff) * 100) / 100;
  return dates.map((date, i) => {
    let name;
    if (typeof names === 'string') name = names;
    else { const tot = names.reduce((a, n) => a + n[1], 0); let r = rng() * tot; name = names[0][0]; for (const [n, wt] of names) { if ((r -= wt) <= 0) { name = n; break; } } }
    return { date, supplierNameRaw: name, department: dept, expenseType: expType, purpose, amountGBP: amts[i], vatIrrecoverableGBP: 0 };
  });
}

export function buildSample() {
  const rng = mulberry32(20261006);
  const council = { id: 'marchbank', name: 'Marchbank Borough Council', shortName: 'Marchbank', isFictional: true, type: 'Borough council', asOf: AS_OF, spendDataFrom: SPEND_FROM, spendDataTo: SPEND_TO, fileLabel: 'Transparency Code payments over £500 (sample)',
    // data-basis facts the Method and Cap tab copy relies on (words live in src/lib/copy.js)
    spendVatBasis: 'net_of_irrecoverable_vat', contractValueVatBasis: 'excluding_vat', spendFileCount: 54, spendWindowLabel: 'Sample payments to 30 September 2026' };
  const supName = Object.fromEntries(SUPPLIERS.map((s) => [s.id, s.legalName]));
  const payments = [];
  const contracts = [];
  for (const t of CONTRACT_TABLE) {
    const termYears = Math.round(((Date.parse(t.end) - Date.parse(t.start)) / 86400000 / 365.25) * 10) / 10;
    const [capAmt, capBasis, capSource] = t.cap;
    const c = {
      id: t.id, title: t.title, supplierId: t.sup, supplierName: supName[t.sup], serviceCategory: t.cat, procurementRoute: t.route,
      // where the contract text would come from: 'find_a_tender' only if it truly qualifies (starts on or after 24 Feb 2025 and over GBP 5m), else the council's contracts register PDF
      source: t.start >= FTS_FROM && t.total > FTS_MIN_TOTAL ? 'find_a_tender' : 'register_pdf',
      startDate: t.start, endDate: t.end, termYears,
      extension: { count: t.ext[0], lengthMonths: t.ext[1], decider: t.ext[2] },
      notice: t.notice ? { value: t.notice[0], unit: t.notice[1] } : null,
      autoRenewal: t.auto ? { enabled: true, periodMonths: t.auto[1] } : { enabled: false, periodMonths: null },
      annualValueGBP: t.annual, totalValueGBP: t.total,
      cap: { amountGBP: capAmt, basis: capBasis, source: capSource },
      indexation: { indexName: t.index[0], capPct: t.index[1], reviewMonthDay: t.index[2] },
      paymentTermsDays: t.pay, serviceCredits: { present: !!t.credits },
      termination: { forConvenience: t.term[0], noticeMonths: t.term[1], exitFeesSummary: t.term[2] },
      confidence: {}, _src: t,
    };
    contracts.push(c);
    // payments
    const dept = t.cat; const expType = t.cat; const purpose = `${t.title}`;
    const names = NAME_VARIANTS[t.sup] || supName[t.sup];
    const segs = t.segs || [
      [maxD(t.start, SPEND_FROM), minD(t.end, '2024-10-06'), t.plan.early],
      [maxD(t.start, '2024-10-07'), minD(t.end, '2025-10-06'), t.plan.p12],
      [maxD(t.start, '2025-10-07'), minD(t.end, SPEND_TO), t.plan.t12],
    ];
    for (const [from, to, total] of segs) payments.push(...genSegment(rng, { from, to, total, freq: t.freq, names, dept, expType, purpose }));
    if (t.lateVariant) { const [nm, f, to, total] = t.lateVariant; payments.push(...genSegment(rng, { from: f, to, total, freq: 'monthly', names: nm, dept, expType, purpose })); }
  }
  for (const [name, early, p12, t12, cat, dept, freq] of NON_CONTRACTED) {
    const segs = [[SPEND_FROM, '2024-10-06', early], ['2024-10-07', '2025-10-06', p12], ['2025-10-07', SPEND_TO, t12]];
    for (const [from, to, total] of segs) payments.push(...genSegment(rng, { from, to, total, freq, names: name, dept, expType: cat, purpose: cat }));
  }
  payments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.supplierNameRaw.localeCompare(b.supplierNameRaw)));
  payments.forEach((p, i) => { p.id = `MBC-${p.date.slice(0, 4)}-${String(i + 1).padStart(6, '0')}`; p.sourceFile = `marchbank-payments-over-500-${p.date.slice(0, 7)}.csv`; });
  return { council, suppliers: SUPPLIERS, aliases: ALIASES, contracts, payments };
}
