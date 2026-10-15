// Who to contact about an opportunity (build spec section 6.4), in order, with one line on why.
// The contract owner and the supplier's representative come from clause 3 of the contract (representatives.js); the budget holder,
// the procurement lead and finance come from the sample staff list (people.js).
//
//   contactsFor(flag, contract) -> [{ id, kind, label, internal, person?, supplierRep?, name, role, email, initials, why, source }]
//     kind      'owner' | 'budget' | 'procurement' | 'finance' | 'supplier'
//     label     'Contract owner' | 'Budget holder' | 'Procurement lead' | 'Finance' | "Supplier's representative"
//     internal  true for council staff (internal email template), false for the supplier (supplier template)
//     source    { side: 'authority' | 'supplier', label, clauseRef, page, quote } for a representative, or the string 'Staff list'
//   A person who would appear twice (the procurement lead who also owns a legal contract) is listed once, in the first place.
import { FINANCE, PROCUREMENT_LEAD, budgetHolderFor, peopleById } from './people.js';
import { representativesFor } from './representatives.js';

export const STAFF_LIST = 'Staff list';
export const KIND_LABEL = { owner: 'Contract owner', budget: 'Budget holder', procurement: 'Procurement lead', finance: 'Finance', supplier: "Supplier's representative" };
export const SOURCE_LABEL = { authority: "Authority's Representative", supplier: "Supplier's Representative" };

/** Order and "why" line per flag type. */
export const CONTACT_PLAN = {
  overCap: [
    ['owner', 'Knows if a variation was agreed.'],
    ['budget', 'Signs off spend in this service.'],
    ['finance', 'Can confirm what was paid and when.'],
    ['supplier', "Supplier's named contact. Use after the internal check."],
  ],
  nearCap: [
    ['budget', 'Owns the budget this contract will exceed.'],
    ['owner', 'Knows what work is still to come.'],
    ['procurement', 'Can advise on a variation or a new procurement.'],
    ['supplier', 'Can forecast the spend still to come.'],
  ],
  renewal: [
    ['owner', 'Decides whether to extend, renegotiate or re-procure.'],
    ['procurement', 'Can compare the price with frameworks.'],
    ['budget', 'Signs off the renewal.'],
    ['supplier', 'Can offer renewal terms.'],
  ],
  uplift: [
    ['finance', 'Holds the invoices behind the rise.'],
    ['owner', 'Knows if the increase was agreed.'],
    ['supplier', 'Must explain the increase and any credit.'],
  ],
};

const initialsOf = (name) => String(name).split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function contactsFor(flag, contract) {
  const type = flag && (flag.type || flag.flagType);
  const plan = CONTACT_PLAN[type] || [];
  const reps = representativesFor(contract && contract.id);
  const seen = new Set();
  const out = [];
  for (const [kind, why] of plan) {
    if (kind === 'supplier') {
      if (!reps) continue;
      const r = reps.supplier;
      out.push({
        id: 'supplier', kind, label: KIND_LABEL[kind], internal: false, supplierRep: r, name: r.name, role: r.role, email: r.email, initials: initialsOf(r.name), why,
        source: { side: 'supplier', label: SOURCE_LABEL.supplier, clauseRef: r.clauseRef, page: r.page, quote: r.quote },
      });
      continue;
    }
    const personId = kind === 'owner' ? (reps ? reps.authority.personId : null)
      : kind === 'budget' ? budgetHolderFor(contract) : kind === 'procurement' ? PROCUREMENT_LEAD : FINANCE;
    const person = peopleById[personId];
    if (!person || seen.has(person.id)) continue;
    seen.add(person.id);
    const source = kind === 'owner' && reps
      ? { side: 'authority', label: SOURCE_LABEL.authority, clauseRef: reps.authority.clauseRef, page: reps.authority.page, quote: reps.authority.quote }
      : STAFF_LIST;
    out.push({ id: person.id, kind, label: KIND_LABEL[kind], internal: true, person, name: person.name, role: person.role, email: person.email, initials: person.initials, why, source });
  }
  return out;
}
