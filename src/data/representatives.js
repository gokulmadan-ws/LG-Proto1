// Contract representatives (build spec section 6.2). Every contract names both sides' representatives in clause 3. In a real build
// Kontor would extract them; here they are static, with a clause, page and quote so the screens can show where they come from.
// They are NOT part of data.extractions (that set stays at 336 answers) and the source viewer has no page 6, so the quote is shown
// inline, never linked.
//
//   REPRESENTATIVES                       [{ contractId, authority: { personId, clauseRef, page, quote }, supplier: { name, role, email, clauseRef, page, quote } }]
//   representativesFor(contractId)        one entry, or null
//   SUPPLIER_REP_NAMES                    the name pool, in supplier order S-01 to S-24 (S-05 Fennimore Highways Ltd gets Alex Merrow)
import data from './sample.json' with { type: 'json' };
import { ownerFor, peopleById } from './people.js';

export const SUPPLIER_REP_NAMES = [
  'Robin Achterberg', 'Jordan Pike', 'Casey Thorne', 'Sam Kellaway', 'Alex Merrow', 'Jamie Otieno', 'Taylor Brennan', 'Morgan Ellwood',
  'Charlie Nakamura', 'Drew Halloran', 'Rowan Fitzgerald', 'Avery Lindgren', 'Quinn Bellamy', 'Reese Mbeki', 'Emerson Vale', 'Hayden Rook',
  'Logan Petrakis', 'Parker Quill', 'Riley Ashdown', 'Sasha Kowal', 'Toby Lennard', 'Frankie Adair', 'Blair Henshaw', 'Jesse Calloway',
];
export const REP_ROLE = 'Contract Director';
const CLAUSE = { authority: 'Clause 3.1', supplier: 'Clause 3.2' };
const PAGE = 6;

const supplierIds = data.suppliers.map((s) => s.id).sort();
const repBySupplier = Object.fromEntries(supplierIds.map((id, i) => [id, SUPPLIER_REP_NAMES[i]]));
const supplierById = Object.fromEntries(data.suppliers.map((s) => [s.id, s]));
const domainOf = (legalName) => `${String(legalName).split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '')}.example`;
const emailOf = (name, domain) => `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`;

export const REPRESENTATIVES = data.contracts.map((c) => {
  const person = peopleById[ownerFor(c)];
  const supplier = supplierById[c.supplierId] || { legalName: c.supplierName };
  const name = repBySupplier[c.supplierId];
  const email = emailOf(name, domainOf(supplier.legalName));
  return {
    contractId: c.id,
    authority: {
      personId: person.id, clauseRef: CLAUSE.authority, page: PAGE,
      quote: `The Authority's Representative is the ${person.role}, currently ${person.name} (${person.email}).`,
    },
    supplier: {
      name, role: REP_ROLE, email, clauseRef: CLAUSE.supplier, page: PAGE,
      quote: `The Supplier's Representative is ${name}, ${REP_ROLE} (${email}).`,
    },
  };
});

const byContract = Object.fromEntries(REPRESENTATIVES.map((r) => [r.contractId, r]));
export const representativesFor = (contractId) => byContract[contractId] || null;
