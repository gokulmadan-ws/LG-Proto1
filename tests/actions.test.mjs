// Action tracker: data and rules tests (build spec docs/action-tracker/action-tracker-build-spec.md, sections 6, 7 and 9).
// Plain node, no dependencies, exits non-zero on any failure. Same style as tests/engine.test.mjs.
//   node tests/actions.test.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assertStrict from 'node:assert/strict';

process.removeAllListeners('warning');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let checks = 0;
const assert = new Proxy(assertStrict, { get(t, k) { const v = t[k]; return typeof v === 'function' ? (...a) => { checks++; return v.apply(t, a); } : v; } });
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);

const Estate = await imp('src/lib/estate.js');
const Copy = await imp('src/lib/copy.js');
const People = await imp('src/data/people.js');
const Reps = await imp('src/data/representatives.js');
const Steps = await imp('src/data/action-steps.js');
const Contacts = await imp('src/data/contacts.js');
const Email = await imp('src/data/email-templates.js');
const Seed = await imp('src/data/actions-seed.js');
const A = await imp('src/lib/actions.js');

let groups = 0, failed = 0;
const t = (name, fn) => { groups++; const before = checks; try { fn(); console.log('ok  ', name, `(${checks - before} checks)`); } catch (e) { failed++; console.error('FAIL', name, '\n', e.message, '\n', String(e.stack).split('\n').filter((l) => l.includes('actions.test.mjs')).slice(0, 2).join('\n')); } };

const est = Estate.computeEstate();
const D = Estate.data;
const C = (id) => est.contractsById[id];

/* ------------------------------------------------------------------------------------------------ section 6: data */
t('6.1 staff list: 11 people, .example emails, every service category mapped, fallbacks', () => {
  assert.equal(People.PEOPLE.length, 11);
  assert.deepEqual(People.PEOPLE.map((p) => p.id), ['P-dana', 'P-jo', 'P-sam', 'P-rae', 'P-lena', 'P-chris', 'P-morgan', 'P-ash', 'P-kim', 'P-priya', 'P-tom']);
  assert.deepEqual(People.peopleById['P-dana'], { id: 'P-dana', name: 'Dana Okafor', role: 'Highways Contract Manager', initials: 'DO', email: 'dana.okafor@marchbank.example' });
  assert.equal(People.peopleById['P-priya'].role, 'Category Manager, Procurement'); assert.equal(People.peopleById['P-tom'].email, 'tom.ellery@marchbank.example');
  for (const p of People.PEOPLE) { assert.match(p.email, /^[a-z]+\.[a-z]+@marchbank\.example$/); assert.equal(p.initials, p.name.split(' ').map((w) => w[0]).join('')); }
  assert.equal(People.PROCUREMENT_LEAD, 'P-priya'); assert.equal(People.FINANCE, 'P-tom');
  const cats = new Set(D.contracts.map((c) => c.serviceCategory));
  for (const cat of cats) assert.ok(People.SERVICE_CATEGORIES.includes(cat), 'category not mapped: ' + cat);
  assert.equal(People.ownerFor(C('C-005')), 'P-dana'); assert.equal(People.budgetHolderFor(C('C-005')), 'P-jo');
  assert.equal(People.ownerFor(C('C-003')), 'P-sam'); assert.equal(People.budgetHolderFor(C('C-003')), 'P-rae');
  assert.equal(People.ownerFor(C('C-007')), 'P-lena'); assert.equal(People.ownerFor(C('C-001')), 'P-chris'); assert.equal(People.ownerFor(C('C-011')), 'P-priya'); assert.equal(People.ownerFor(C('C-002')), 'P-ash');
  assert.equal(People.ownerFor({ serviceCategory: 'Something new' }), 'P-priya'); assert.equal(People.budgetHolderFor({ serviceCategory: 'Something new' }), 'P-morgan');
});

t('6.2 representatives: all 24 contracts, both sides, clause 3.1 and 3.2 on page 6, C-005 is Dana Okafor and Alex Merrow', () => {
  assert.equal(Reps.REPRESENTATIVES.length, 24);
  assert.deepEqual(Reps.REPRESENTATIVES.map((r) => r.contractId), D.contracts.map((c) => c.id));
  assert.equal(D.suppliers.find((s) => s.id === 'S-05').legalName, 'Fennimore Highways Ltd');
  const r5 = Reps.representativesFor('C-005');
  assert.deepEqual(r5.authority, { personId: 'P-dana', clauseRef: 'Clause 3.1', page: 6, quote: "The Authority's Representative is the Highways Contract Manager, currently Dana Okafor (dana.okafor@marchbank.example)." });
  assert.deepEqual(r5.supplier, { name: 'Alex Merrow', role: 'Contract Director', email: 'alex.merrow@fennimore.example', clauseRef: 'Clause 3.2', page: 6, quote: "The Supplier's Representative is Alex Merrow, Contract Director (alex.merrow@fennimore.example)." });
  const names = new Set();
  for (const r of Reps.REPRESENTATIVES) {
    const c = C(r.contractId);
    assert.equal(r.authority.personId, People.ownerFor(c)); assert.equal(r.authority.clauseRef, 'Clause 3.1'); assert.equal(r.supplier.clauseRef, 'Clause 3.2');
    assert.equal(r.authority.page, 6); assert.equal(r.supplier.page, 6); assert.equal(r.supplier.role, 'Contract Director');
    const i = Number(c.supplierId.slice(2)) - 1;
    assert.equal(r.supplier.name, Reps.SUPPLIER_REP_NAMES[i], c.id);
    const first = D.suppliers.find((s) => s.id === c.supplierId).legalName.split(' ')[0].toLowerCase();
    assert.equal(r.supplier.email, `${r.supplier.name.toLowerCase().replace(' ', '.')}@${first}.example`);
    assert.ok(r.authority.quote.includes(People.peopleById[r.authority.personId].email) && r.supplier.quote.includes(r.supplier.email));
    names.add(r.supplier.name);
  }
  assert.equal(names.size, 24, 'one name per supplier');
  assert.equal(Reps.representativesFor('C-nope'), null);
  assert.equal(D.extractions.length, 336, 'representatives are not extractions'); assert.equal(D.questions.length, 9);
});

t('6.3 steps: 5 / 4 / 5 / 5 by type, ids and texts, renewal variants share the list, next step is the first unticked', () => {
  assert.deepEqual(Steps.stepsFor('overCap').map((s) => s.id), ['oc-variation', 'oc-owner', 'oc-finance', 'oc-supplier', 'oc-record']);
  assert.deepEqual(Steps.stepsFor('nearCap').map((s) => s.id), ['nc-tell', 'nc-variation', 'nc-decide', 'nc-record']);
  assert.deepEqual(Steps.stepsFor('renewal').map((s) => s.id), ['rn-notice', 'rn-owner', 'rn-price', 'rn-supplier', 'rn-record']);
  assert.deepEqual(Steps.stepsFor('uplift').map((s) => s.id), ['up-clause', 'up-invoices', 'up-supplier', 'up-credit', 'up-record']);
  assert.equal(Steps.stepsFor('overCap')[2].hint, 'Payment files can include VAT, credit notes or re-bills.');
  assert.equal(Steps.stepsFor('overCap')[0].text, 'Check the contract file for a variation or change notice.');
  for (const id of ['F-C-001-renewal', 'F-C-007-renewal', 'F-C-003-renewal']) assert.equal(Steps.stepsFor(est.flagsById[id]), Steps.STEPS.renewal, id);
  assert.equal(Steps.stepsFor(est.flagsById['F-C-005-overCap']).length, 5);
  assert.equal(Steps.nextStep('overCap', { 'oc-variation': true, 'oc-owner': true }).text, 'Ask finance to confirm the payment total.');
  assert.equal(Steps.nextStep('nearCap', { 'nc-tell': true }).text, 'Find out if a variation is planned.');
  assert.equal(Steps.nextStep('renewal', { 'rn-notice': true, 'rn-owner': true, 'rn-price': true }).text, 'Ask the supplier for renewal terms before the notice date.');
  assert.equal(Steps.nextStep('uplift', Object.fromEntries(Steps.STEPS.uplift.map((s) => [s.id, true]))), null);
});

t('6.4 who to contact: order, "why" lines and sources for each flag type; C-005 is Dana Okafor, Jo Whitfield, Tom Ellery, Alex Merrow', () => {
  const list = (id) => Contacts.contactsFor(est.flagsById[id], C(est.flagsById[id].contractId));
  const c5 = list('F-C-005-overCap');
  assert.deepEqual(c5.map((x) => [x.name, x.kind, x.why]), [
    ['Dana Okafor', 'owner', 'Knows if a variation was agreed.'], ['Jo Whitfield', 'budget', 'Signs off spend in this service.'],
    ['Tom Ellery', 'finance', 'Can confirm what was paid and when.'], ['Alex Merrow', 'supplier', "Supplier's named contact. Use after the internal check."]]);
  assert.deepEqual(c5[0].source, { side: 'authority', label: "Authority's Representative", clauseRef: 'Clause 3.1', page: 6, quote: Reps.representativesFor('C-005').authority.quote });
  assert.equal(c5[1].source, 'Staff list'); assert.equal(c5[2].source, 'Staff list'); assert.equal(c5[3].source.clauseRef, 'Clause 3.2'); assert.equal(c5[3].internal, false); assert.ok(c5.slice(0, 3).every((x) => x.internal));
  assert.deepEqual(list('F-C-001-nearCap').map((x) => [x.kind, x.why]), [['budget', 'Owns the budget this contract will exceed.'], ['owner', 'Knows what work is still to come.'], ['procurement', 'Can advise on a variation or a new procurement.'], ['supplier', 'Can forecast the spend still to come.']]);
  assert.deepEqual(list('F-C-003-renewal').map((x) => [x.name, x.why]), [['Sam Adeyemi', 'Decides whether to extend, renegotiate or re-procure.'], ['Priya Raman', 'Can compare the price with frameworks.'], ['Rae Lindqvist', 'Signs off the renewal.'], ['Casey Thorne', 'Can offer renewal terms.']]);
  assert.deepEqual(list('F-C-004-uplift').map((x) => [x.name, x.why]), [['Tom Ellery', 'Holds the invoices behind the rise.'], ['Dana Okafor', 'Knows if the increase was agreed.'], ['Sam Kellaway', 'Must explain the increase and any credit.']]);
  for (const f of est.flags) { const l = Contacts.contactsFor(f, C(f.contractId)); assert.ok(l.length >= 3, f.id); assert.equal(new Set(l.map((x) => x.id)).size, l.length, 'no one twice: ' + f.id); assert.equal(l[l.length - 1].kind, 'supplier'); }
});

t('6.5 emails: C-005 to Dana Okafor renders exactly as the spec; supplier template; every flag and contact renders', () => {
  const f = est.flagsById['F-C-005-overCap'];
  const cs = Contacts.contactsFor(f, C('C-005'));
  const mail = Email.emailFor(f, C('C-005'), est.derived['C-005'], cs[0], '2026-10-20');
  assert.deepEqual(mail.to, { name: 'Dana Okafor', email: 'dana.okafor@marchbank.example' });
  assert.equal(Email.emailText(mail), [
    'Subject: C-005 Highways reactive maintenance and minor works: spend is £3,350,000 above the cap',
    '',
    'Hi Dana,',
    '',
    'Our contract review flagged the Highways reactive maintenance and minor works contract (C-005, Fennimore Highways Ltd).',
    '',
    '- Clause 14.3, page 23: "The Council\'s liability to pay the Charges under this Agreement shall not exceed £5,000,000 in aggregate (the Maximum Contract Value) unless increased by a Variation under clause 41."',
    '- Payments to date are £8,350,000. That is £3,350,000 above the cap.',
    '',
    'Can you tell me by 20 October 2026:',
    '1. Was a variation approved that raised the cap?',
    '2. Was extra work added to the scope?',
    '3. Who approved the payments above the cap?',
    '',
    'The clause and the payment list are in Kontor.',
    '',
    'Thanks,',
    '[Your name]',
  ].join('\n'));
  const sup = Email.emailFor(f, C('C-005'), est.derived['C-005'], cs[3], '2026-10-20');
  assert.equal(sup.subject, 'C-005 Highways reactive maintenance and minor works: payments above the contract maximum');
  assert.ok(sup.body.startsWith('Dear Alex,\n\nWe are reviewing the Highways reactive maintenance and minor works contract (C-005).\n\nClause 14.3 sets a maximum of £5,000,000. Our records show payments of £8,350,000, which is £3,350,000 above that maximum.'));
  assert.ok(sup.body.endsWith('Kind regards,\n[Your name]\nMarchbank Borough Council'));
  const annual = Email.emailFor(est.flagsById['F-C-011-overCap'], C('C-011'), est.derived['C-011'], { name: 'Priya Raman', email: 'x', internal: true }, '2026-10-20');
  assert.ok(annual.body.includes('- Payments in the contract years that went over are £512,000. That is £62,000 above the cap.'), annual.body);
  const ren = Email.emailFor(est.flagsById['F-C-003-renewal'], C('C-003'), est.derived['C-003'], { name: 'Sam Adeyemi', internal: true }, '2026-10-31');
  assert.ok(ren.body.includes('The Waste collection and recycling contract (C-003, Quillon Waste Services Ltd) needs a notice decision by 31 October 2026.'));
  assert.ok(ren.body.includes('- Annual value: £6,200,000.'));
  const ooc = Email.emailFor(est.flagsById['F-C-007-renewal'], C('C-007'), est.derived['C-007'], { name: 'Lena Fairbairn', internal: true }, '2026-10-20');
  assert.ok(ooc.body.includes('ended on 30 April 2026, but £780,000 has been paid since.'));
  const np = Email.emailFor(est.flagsById['F-C-001-renewal'], C('C-001'), est.derived['C-001'], { name: 'Chris Odukoya', internal: true }, '2026-10-20');
  assert.ok(np.body.includes('passed its notice date on 30 September 2026, so it may renew on the current terms.'));
  const up = Email.emailFor(est.flagsById['F-C-004-uplift'], C('C-004'), est.derived['C-004'], { name: 'Tom Ellery', internal: true }, '2026-10-23');
  assert.ok(up.body.includes('limits yearly price rises to 3.0%. Payments in the last 12 months suggest a rise above that limit, about £188,200 more than the contract allows.'));
  const nc = Email.emailFor(est.flagsById['F-C-001-nearCap'], C('C-001'), est.derived['C-001'], { name: 'Morgan Hale', internal: true }, '2026-10-30');
  assert.ok(nc.body.includes('has used 94.8% of its £12,000,000 cap. At the pace of the last 12 months, spend will pass the cap by about £642,478.'));
  for (const fl of est.flags) {
    for (const who of Contacts.contactsFor(fl, C(fl.contractId))) {
      const m = Email.emailFor(fl, C(fl.contractId), est.derived[fl.contractId], who, '2026-10-20');
      assert.ok(m.subject.startsWith(`${fl.contractId} `), fl.id); assert.ok(m.body.includes('[Your name]'));
      assert.ok(m.body.startsWith(who.internal ? `Hi ${who.name.split(' ')[0]},` : `Dear ${who.name.split(' ')[0]},`));
      assert.ok(!/undefined|NaN|null/.test(m.subject + m.body), `${fl.id} to ${who.name}: ${m.body}`);
    }
  }
});

t('6.6 seeds: 4 open (all Under review) on real flags, 5 closed examples on unflagged contracts, totals as section 9', () => {
  const open = Object.values(Seed.SEED_ACTIONS).filter((a) => a.stage !== 'closed');
  const closed = Object.values(Seed.SEED_ACTIONS).filter((a) => a.stage === 'closed');
  assert.deepEqual(open.map((a) => [a.flagId, a.stage, a.owner, a.due]), [
    ['F-C-007-overCap', 'checking', 'P-priya', '2026-10-16'], ['F-C-001-nearCap', 'checking', 'P-tom', '2026-10-30'],
    ['F-C-003-renewal', 'with_supplier', 'P-sam', '2026-10-31'], ['F-C-004-uplift', 'with_supplier', 'P-priya', '2026-10-23']]);
  assert.deepEqual(Seed.SEED_TRIAGE, Object.fromEntries(open.map((a) => [a.flagId, 'under_review'])));
  for (const a of open) {
    const f = est.flagsById[a.flagId];
    assert.ok(f, a.flagId); assert.equal(a.flaggedGBP, f.indicativeGBP); assert.equal(a.contractId, f.contractId); assert.equal(a.flagType, f.type); assert.equal(a.example, false);
    assert.ok(a.log.length >= 1 && a.log.every((l) => l.at < '2026-10-06'));
  }
  assert.deepEqual(Object.keys(open[0].steps), ['oc-variation', 'oc-owner']); assert.deepEqual(Object.keys(open[1].steps), ['nc-tell']);
  assert.deepEqual(open[3].notes.map((n) => n.text), ['Supplier has offered a credit note.']);
  const flagged = new Set(est.flags.map((f) => f.contractId));
  assert.deepEqual(closed.map((a) => [a.flagId, a.outcome, a.cashRecoveredGBP, a.costAvoidedGBP, a.closedAt, a.owner]), [
    ['H-C-024-uplift', 'resolved', 12400, 31200, '2026-05-22', 'P-tom'], ['H-C-006-nearCap', 'explained', null, null, '2026-06-09', 'P-jo'],
    ['H-C-020-uplift', 'resolved', 21500, 54000, '2026-06-19', 'P-sam'], ['H-C-008-overCap', 'resolved', 84000, null, '2026-07-14', 'P-priya'],
    ['H-C-013-overCap', 'no_action', null, null, '2026-09-03', 'P-tom']]);
  for (const a of closed) { assert.ok(!flagged.has(a.contractId), a.contractId + ' has a flag today'); assert.ok(!est.flagsById[a.flagId]); assert.equal(a.example, true); assert.ok(a.closeNote); }
  const beingWorked = open.reduce((s, a) => s + est.flagsById[a.flagId].indicativeGBP, 0);
  assert.equal(beingWorked, 1900678); assert.equal(est.totals.totalGBP - beingWorked, 4244560);
  const resolved = closed.filter((a) => a.outcome === 'resolved');
  assert.equal(resolved.reduce((s, a) => s + (a.cashRecoveredGBP || 0) + (a.costAvoidedGBP || 0), 0), 203100);
  assert.equal(resolved.reduce((s, a) => s + (a.cashRecoveredGBP || 0), 0), 117900); assert.equal(resolved.reduce((s, a) => s + (a.costAvoidedGBP || 0), 0), 85200);
  // the seeded statuses leave the headline where it was
  assert.equal(Estate.computeEstate({ triage: Seed.SEED_TRIAGE }).totals.totalGBP, 6145238);
});

/* ------------------------------------------------------------------------------------------------ 7.1 the Resolved status */
t('7.1 "Resolved" is a review status: reviewed, not counted in the headline, counted in excludedGBP', () => {
  assert.deepEqual(Estate.TRIAGE_STATUSES, ['to_investigate', 'under_review', 'resolved', 'explained', 'not_an_issue']);
  assert.deepEqual(Copy.TRIAGE_OPTIONS.map((o) => o.label), ['To investigate', 'Under review', 'Resolved', 'Explained', 'No action']);
  assert.equal(Copy.reviewStatusLabel('resolved'), 'Resolved');
  assert.deepEqual(Estate.sanitiseTriage({ 'F-C-004-uplift': 'resolved', x: 'nope' }), { 'F-C-004-uplift': 'resolved' });
  const r = Estate.computeEstate({ triage: { 'F-C-004-uplift': 'resolved' } });
  assert.equal(r.totals.totalGBP, 5957038); assert.equal(r.totals.excludedGBP, 188200); assert.equal(r.totals.excludedCount, 1);
  assert.equal(Copy.headlineSentence(r.totals), '£6.0m across 15 contracts flagged as opportunities to investigate');
});


/* ------------------------------------------------------------------------------------------------ 7.2 to 7.4: the store and its rules */
const AT = '2026-10-15T10:12:00.000Z';                                    // a log timestamp (the only clock use; any string works here)
const start = () => ({ triage: A.seedTriage(), actions: A.seedActions() });
const estOf = (st) => Estate.computeEstate({ triage: st.triage });
const F = (st, id) => estOf(st).flagsById[id];
const lastLog = (a) => a.log[a.log.length - 1].text;

t('7.2 first load and reset: the seeds, a stored triage wins, sanitise drops bad records, initialState() is the reset target', () => {
  const s0 = Estate.initialState();
  assert.deepEqual(s0.triage, Seed.SEED_TRIAGE); assert.deepEqual(s0.actions, JSON.parse(JSON.stringify(Seed.SEED_ACTIONS)));
  assert.notEqual(s0.actions['F-C-007-overCap'], Seed.SEED_ACTIONS['F-C-007-overCap'], 'a copy, never the seed object');
  assert.deepEqual(A.withSeedTriage({ 'F-C-007-overCap': 'explained', 'F-C-005-overCap': 'under_review' }), { ...Seed.SEED_TRIAGE, 'F-C-007-overCap': 'explained', 'F-C-005-overCap': 'under_review' });
  const got = Estate.readPersisted({ getJSON: (k, f) => (k === 'kontor-triage' ? { 'F-C-001-nearCap': 'explained' } : f) });
  assert.equal(got.triage['F-C-001-nearCap'], 'explained', 'stored status wins over the seed'); assert.equal(got.triage['F-C-007-overCap'], 'under_review');
  assert.deepEqual(Estate.sanitiseActions(Seed.SEED_ACTIONS), JSON.parse(JSON.stringify(Seed.SEED_ACTIONS)), 'the seeds survive a round trip');
  const bad = {
    'F-C-005-overCap': { ...Seed.SEED_ACTIONS['F-C-007-overCap'], stage: 'somewhere' },
    'F-C-999-overCap': { ...Seed.SEED_ACTIONS['F-C-007-overCap'] },
    'X-C-005-overCap': { ...Seed.SEED_ACTIONS['F-C-007-overCap'] },
    'F-C-007-overCap': { ...Seed.SEED_ACTIONS['F-C-007-overCap'], cashRecoveredGBP: -5, costAvoidedGBP: Infinity, owner: 'P-nobody', steps: { 'oc-owner': true, 'nc-tell': true, 'oc-variation': 'yes' } },
    'H-C-024-uplift': { ...Seed.SEED_ACTIONS['H-C-024-uplift'], cashRecoveredGBP: NaN },
    'F-C-004-uplift': { ...Seed.SEED_ACTIONS['F-C-004-uplift'], stage: 'closed', outcome: null },
  };
  const clean = Estate.sanitiseActions(bad);
  assert.deepEqual(Object.keys(clean).sort(), ['F-C-007-overCap', 'H-C-024-uplift']);
  assert.equal(clean['F-C-007-overCap'].cashRecoveredGBP, null); assert.equal(clean['F-C-007-overCap'].costAvoidedGBP, null); assert.equal(clean['F-C-007-overCap'].owner, null);
  assert.deepEqual(clean['F-C-007-overCap'].steps, { 'oc-owner': true }); assert.equal(clean['H-C-024-uplift'].cashRecoveredGBP, null);
  assert.deepEqual(Estate.sanitiseActions('nope'), {}); assert.deepEqual(Estate.sanitiseActions(null), {});
});

t('7.2 changeCount compares with the starting state: a fresh load counts 0, starting an action counts the review and the action', () => {
  assert.equal(A.changeCount(Estate.initialState()), 0);
  assert.equal(A.changeCount({ ...Estate.initialState(), triage: {}, actions: {} }), 13, '4 reviews and 9 actions removed');
  const s1 = A.startAction(start(), F(start(), 'F-C-005-overCap'), AT);
  assert.equal(A.changeCount({ ...Estate.initialState(), ...s1 }), 2);
  assert.deepEqual(A.changeParts({ ...Estate.initialState(), ...s1, decisions: { x: 'confirm' } }).filter(([n]) => n).map(([n, w]) => `${n} ${w}`), ['1 review', '1 action', '1 match decision']);
});

t('7.3 drawer -> Under review: creates To start with the due date rule and no owner; an archived one comes back as it was', () => {
  const s0 = start();
  const s1 = A.setStatus(s0, F(s0, 'F-C-005-overCap'), 'under_review', AT);
  const a = s1.actions['F-C-005-overCap'];
  assert.equal(s1.triage['F-C-005-overCap'], 'under_review'); assert.equal(a.stage, 'to_start'); assert.equal(a.owner, null); assert.equal(a.due, '2026-10-20');
  assert.equal(a.flaggedGBP, 3350000); assert.equal(a.contractId, 'C-005'); assert.equal(a.flagType, 'overCap'); assert.deepEqual(a.log, [{ at: AT, text: 'You set the review status to Under review.' }]);
  assert.equal(s0.actions['F-C-005-overCap'], undefined, 'the input is never changed');
  // due on create: the action-by date when it is on or after AS_OF, else AS_OF + 14 days
  assert.equal(A.newAction(F(s0, 'F-C-005-renewal')).due, '2027-02-28'); assert.equal(A.newAction(F(s0, 'F-C-001-renewal')).due, '2026-10-20');
  assert.equal(A.newAction(F(s0, 'F-C-003-renewal')).due, '2026-10-31'); assert.equal(A.newAction(F(s0, 'F-C-007-renewal')).due, '2026-10-20');
  // archive, then start again: everything kept
  const s2 = A.setOwner(s1, F(s1, 'F-C-005-overCap'), 'P-dana', AT);
  const s3 = A.setStatus(s2, F(s2, 'F-C-005-overCap'), 'to_investigate', AT);
  assert.equal(s3.actions['F-C-005-overCap'].archived, true); assert.equal(s3.triage['F-C-005-overCap'], undefined);
  assert.equal(A.boardColumns(estOf(s3), s3.actions)[0].count, 0, 'the card leaves the board');
  const s4 = A.startAction(s3, F(s3, 'F-C-005-overCap'), AT);
  const b = s4.actions['F-C-005-overCap'];
  assert.equal(b.archived, false); assert.equal(b.owner, 'P-dana'); assert.equal(b.stage, 'to_start'); assert.equal(b.log.length, 4); assert.equal(lastLog(b), 'You set the review status to Under review.');
});

t('7.3 drawer -> To investigate archives (data kept); Resolved / Explained / No action close it, creating it first if needed', () => {
  const s0 = start();
  const s1 = A.setStatus(s0, F(s0, 'F-C-007-overCap'), 'to_investigate', AT);
  const a = s1.actions['F-C-007-overCap'];
  assert.equal(a.archived, true); assert.equal(a.stage, 'checking'); assert.equal(a.owner, 'P-priya'); assert.deepEqual(Object.keys(a.steps), ['oc-variation', 'oc-owner']);
  assert.equal(s1.triage['F-C-007-overCap'], undefined); assert.equal(lastLog(a), 'You set the review status to To investigate.');
  // explained with no action yet: created, then closed
  const s2 = A.setStatus(s0, F(s0, 'F-C-002-renewal'), 'explained', AT);
  const b = s2.actions['F-C-002-renewal'];
  assert.equal(b.stage, 'closed'); assert.equal(b.outcome, 'explained'); assert.equal(b.closedAt, '2026-10-06'); assert.equal(s2.triage['F-C-002-renewal'], 'explained');
  assert.equal(lastLog(b), 'You closed this as Explained.');
  const s3 = A.closeAction(s0, F(s0, 'F-C-007-overCap'), { outcome: 'no_action', closeNote: 'Approved in writing.' }, AT);
  assert.equal(s3.triage['F-C-007-overCap'], 'not_an_issue'); assert.equal(s3.actions['F-C-007-overCap'].closeNote, 'Approved in writing.'); assert.equal(lastLog(s3.actions['F-C-007-overCap']), 'You closed this as No action.');
  // a resolved flag set back to To investigate stops counting
  const s4 = A.closeAction(s0, F(s0, 'F-C-004-uplift'), { outcome: 'resolved', cashRecoveredGBP: 150000, closeNote: 'Credit note.' }, AT);
  const s5 = A.setStatus(s4, F(s4, 'F-C-004-uplift'), 'to_investigate', AT);
  assert.equal(A.resultsOf(s5.actions).valueSecuredGBP, 203100); assert.equal(s5.actions['F-C-004-uplift'].cashRecoveredGBP, 150000, 'figures kept');
});

t('7.3 close (board to Closed or the dialog): closed, outcome, figures, note, closedAt AS_OF, review status, log line', () => {
  const s0 = start();
  const s1 = A.closeAction(s0, F(s0, 'F-C-004-uplift'), { outcome: 'resolved', cashRecoveredGBP: 150000, costAvoidedGBP: null, closeNote: 'Credit note for the 2026 price rise above CPI.' }, AT);
  const a = s1.actions['F-C-004-uplift'];
  assert.deepEqual([a.stage, a.outcome, a.cashRecoveredGBP, a.costAvoidedGBP, a.closeNote, a.closedAt], ['closed', 'resolved', 150000, null, 'Credit note for the 2026 price rise above CPI.', '2026-10-06']);
  assert.equal(s1.triage['F-C-004-uplift'], 'resolved'); assert.equal(lastLog(a), 'You closed this as Resolved: £150,000 cash recovered.');
  assert.equal(A.closeLogText('resolved', 150000, 20000), 'You closed this as Resolved: £150,000 cash recovered and £20,000 cost avoided.');
  assert.equal(A.closeLogText('resolved', 0, 20000), 'You closed this as Resolved: £20,000 cost avoided.');
  assert.equal(A.closeLogText('explained'), 'You closed this as Explained.'); assert.equal(A.closeLogText('no_action'), 'You closed this as No action.');
  assert.equal(A.closeAction(s0, F(s0, 'F-C-004-uplift'), { outcome: 'bogus' }, AT), s0, 'an unknown outcome changes nothing');
  assert.equal(estOf(s1).totals.totalGBP, 5957038);
});

t('7.3 board moves: between open stages logs the move; a closed card moved back is Under review again, figures kept but not counted', () => {
  const s0 = start();
  const s1 = A.moveAction(s0, F(s0, 'F-C-007-overCap'), 'with_supplier', AT);
  assert.equal(s1.actions['F-C-007-overCap'].stage, 'with_supplier'); assert.equal(lastLog(s1.actions['F-C-007-overCap']), 'You moved this to With supplier.');
  assert.equal(A.moveAction(s1, F(s1, 'F-C-007-overCap'), 'with_supplier', AT), s1, 'same stage: nothing changes');
  assert.equal(A.moveAction(s1, F(s1, 'F-C-007-overCap'), 'closed', AT), s1, 'Closed goes through closeAction');
  const s2 = A.moveAction(s0, F(s0, 'F-C-001-nearCap'), 'to_start', AT);
  assert.equal(lastLog(s2.actions['F-C-001-nearCap']), 'You moved this to To start.');
  const s3 = A.closeAction(s0, F(s0, 'F-C-004-uplift'), { outcome: 'resolved', cashRecoveredGBP: 150000, closeNote: 'Credit note.' }, AT);
  const s4 = A.moveAction(s3, F(s3, 'F-C-004-uplift'), 'checking', AT);
  const a = s4.actions['F-C-004-uplift'];
  assert.deepEqual([a.stage, a.outcome, a.closedAt, a.cashRecoveredGBP, s4.triage['F-C-004-uplift']], ['checking', null, null, 150000, 'under_review']);
  assert.equal(lastLog(a), 'You reopened this and moved it to Checking internally.');
  assert.equal(A.resultsOf(s4.actions).valueSecuredGBP, 203100, 'not counted once reopened'); assert.equal(estOf(s4).totals.totalGBP, 6145238);
});

t('7.3 owner, due, steps, notes, copy email and mark as sent update and log', () => {
  const s0 = A.startAction(start(), F(start(), 'F-C-005-overCap'), AT);
  const f = F(s0, 'F-C-005-overCap');
  const s1 = A.setOwner(s0, f, 'P-dana', AT); assert.equal(s1.actions[f.id].owner, 'P-dana'); assert.equal(lastLog(s1.actions[f.id]), 'You set the owner to Dana Okafor.');
  const s2 = A.setOwner(s1, f, null, AT); assert.equal(lastLog(s2.actions[f.id]), 'You cleared the owner.'); assert.equal(A.setOwner(s2, f, null, AT), s2);
  const s3 = A.setDue(s1, f, '2026-10-27', AT); assert.equal(s3.actions[f.id].due, '2026-10-27'); assert.equal(lastLog(s3.actions[f.id]), 'You set the due date to 27 Oct 2026.');
  assert.equal(A.setDue(s1, f, 'soon', AT), s1, 'a bad date changes nothing');
  const s4 = A.toggleStep(s1, f, 'oc-variation', AT); assert.deepEqual(s4.actions[f.id].steps, { 'oc-variation': true });
  assert.equal(lastLog(s4.actions[f.id]), 'You ticked "Check the contract file for a variation or change notice."');
  const s5 = A.toggleStep(s4, f, 'oc-variation', AT); assert.deepEqual(s5.actions[f.id].steps, {}); assert.equal(lastLog(s5.actions[f.id]), 'You unticked "Check the contract file for a variation or change notice."');
  assert.equal(A.toggleStep(s4, f, 'nc-tell', AT), s4, 'a step of another type changes nothing');
  const s6 = A.addNote(s1, f, '  Called Dana.  ', AT); assert.deepEqual(s6.actions[f.id].notes, [{ at: AT, text: 'Called Dana.' }]); assert.equal(A.addNote(s6, f, '   ', AT), s6);
  const s7 = A.logEmail(s1, f, 'copied', 'Dana Okafor', AT); assert.equal(lastLog(s7.actions[f.id]), 'You copied the email to Dana Okafor.');
  const s8 = A.logEmail(s7, f, 'sent', 'Dana Okafor', AT); assert.equal(lastLog(s8.actions[f.id]), 'You marked the email to Dana Okafor as sent.');
  const act = A.activityOf(A.addNote(s8, f, 'Later note.', '2026-10-15T11:00:00.000Z').actions[f.id]);
  assert.equal(act[0].kind, 'note'); assert.equal(act[0].text, 'Later note.'); assert.equal(act[1].text, 'You marked the email to Dana Okafor as sent.');
  assert.deepEqual(A.stepProgress(s4.actions[f.id]), { done: 1, total: 5, next: Steps.STEPS.overCap[1] });
  assert.deepEqual(['2026-10-05', '2026-10-06', '2026-10-20', '2026-10-21'].map(A.dueState), ['overdue', 'soon', 'soon', 'later']);
});

/* ------------------------------------------------------------------------------------------------ section 9: every number */
t('9 fresh load: headline, Action progress, board and Results', () => {
  const s0 = start(); const e = estOf(s0);
  assert.equal(e.totals.totalGBP, 6145238); assert.equal(e.totals.contractCount, 15);
  const tot = A.actionTotals(e, s0.actions);
  assert.deepEqual(tot, { headlineGBP: 6145238, beingWorkedGBP: 1900678, notStartedGBP: 4244560, noActionCount: 15, openCount: 4, dueSoonCount: 1, valueSecuredGBP: 203100, resolvedCount: 3, sinceMonth: '2026-05' });
  assert.equal(Copy.fmtGBPCompact(tot.notStartedGBP), '£4.2m'); assert.equal(Copy.fmtGBPCompact(tot.beingWorkedGBP), '£1.9m');
  const cols = A.boardColumns(e, s0.actions);
  assert.deepEqual(cols.map((c) => [c.label, c.count]), [['To start', 0], ['Checking internally', 2], ['With supplier', 2], ['Closed', 0]]);
  assert.equal(cols[1].totalGBP, 1402478); assert.equal(cols[2].totalGBP, 498200);
  assert.deepEqual(cols[1].cards.map((c) => c.action.flagId), ['F-C-007-overCap', 'F-C-001-nearCap'], 'soonest due first');
  assert.deepEqual(cols[2].cards.map((c) => c.action.flagId), ['F-C-004-uplift', 'F-C-003-renewal']);
  const r = A.resultsOf(s0.actions);
  assert.deepEqual([r.valueSecuredGBP, r.cashGBP, r.cashCount, r.costGBP, r.costCount, r.closed.length, r.resolvedCount, r.explainedCount, r.noActionCount], [203100, 117900, 3, 85200, 2, 5, 3, 1, 1]);
  assert.deepEqual(r.closed.map((a) => a.flagId), ['H-C-013-overCap', 'H-C-008-overCap', 'H-C-020-uplift', 'H-C-006-nearCap', 'H-C-024-uplift'], 'newest first');
  assert.deepEqual(A.byMonth(s0.actions).map((m) => [m.month, m.cashGBP, m.costGBP]), [['2026-04', 0, 0], ['2026-05', 12400, 31200], ['2026-06', 21500, 54000], ['2026-07', 84000, 0], ['2026-08', 0, 0], ['2026-09', 0, 0], ['2026-10', 0, 0]]);
  assert.deepEqual(A.ownersOnBoard(e, s0.actions).map((p) => p.id), ['P-sam', 'P-priya', 'P-tom']);
  assert.deepEqual(A.boardColumns(e, s0.actions, { owner: 'P-priya' }).map((c) => c.count), [0, 1, 1, 0]);
  assert.deepEqual(A.boardColumns(e, s0.actions, { type: 'renewal' }).map((c) => c.count), [0, 0, 1, 0]);
});

t('9 after the demo script (section 10): every number', () => {
  let s = start();
  const step = (fn, id, ...args) => { s = fn(s, F(s, id), ...args, AT); };
  step(A.setStatus, 'F-C-005-overCap', 'under_review');        // 1. start it
  step(A.setOwner, 'F-C-005-overCap', 'P-dana');               // 3. know who to call
  step(A.logEmail, 'F-C-005-overCap', 'copied', 'Dana Okafor'); // 4. make the first move
  step(A.closeAction, 'F-C-004-uplift', { outcome: 'resolved', cashRecoveredGBP: 150000, costAvoidedGBP: null, closeNote: 'Credit note for the 2026 price rise above CPI.' }); // 5. close the loop
  const e = estOf(s);
  assert.equal(e.totals.totalGBP, 5957038); assert.equal(Copy.headlineSentence(e.totals), '£6.0m across 15 contracts flagged as opportunities to investigate');
  const cols = A.boardColumns(e, s.actions);
  assert.deepEqual(cols.map((c) => c.count), [1, 2, 1, 1]);
  assert.equal(cols[0].cards[0].action.flagId, 'F-C-005-overCap'); assert.equal(cols[0].totalGBP, 3350000); assert.equal(cols[0].cards[0].action.due, '2026-10-20');
  assert.equal(cols[2].cards[0].action.flagId, 'F-C-003-renewal'); assert.equal(cols[3].cards[0].action.flagId, 'F-C-004-uplift');
  const tot = A.actionTotals(e, s.actions);
  assert.equal(tot.beingWorkedGBP, 5062478); assert.equal(Copy.fmtGBPCompact(tot.beingWorkedGBP), '£5.1m'); assert.equal(tot.dueSoonCount, 2); assert.equal(tot.valueSecuredGBP, 353100);
  const r = A.resultsOf(s.actions);
  assert.deepEqual([r.valueSecuredGBP, r.cashGBP, r.cashCount, r.costGBP, r.costCount, r.closed.length, r.resolvedCount, r.explainedCount, r.noActionCount], [353100, 267900, 4, 85200, 2, 6, 4, 1, 1]);
  assert.equal(r.latestId, 'F-C-004-uplift');
  const bars = Object.fromEntries(A.byMonth(s.actions).map((m) => [m.month, m.totalGBP]));
  assert.deepEqual([bars['2026-05'], bars['2026-06'], bars['2026-07'], bars['2026-10']], [43600, 75500, 84000, 150000]);
  assert.equal(A.changeCount({ ...Estate.initialState(), ...s }), 4, '2 reviews and 2 actions');
});

console.log(`\n${groups - failed} of ${groups} groups passed, ${checks} checks`);
if (failed) { console.error(`${failed} group(s) FAILED`); process.exit(1); }
