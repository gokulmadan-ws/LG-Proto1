// Staff list for the action tracker (build spec section 6.1). Static and fictional: Marchbank Borough Council does not exist.
// Email addresses use the reserved .example domain, so nothing here can reach a real inbox.
//
//   PEOPLE                 [{ id, name, role, initials, email }]  in the order the Owner select offers them
//   peopleById             { 'P-dana': person }
//   ownerFor(contract)     person id of the contract owner (the Authority's Representative), by contract.serviceCategory
//   budgetHolderFor(c)     person id of the budget holder for that service
//   PROCUREMENT_LEAD, FINANCE   the two people every service shares
//   firstName(name)        'Dana Okafor' -> 'Dana' (email greetings)

export const EMAIL_DOMAIN = 'marchbank.example';

const RAW = [
  ['P-dana', 'Dana Okafor', 'Highways Contract Manager', 'DO'],
  ['P-jo', 'Jo Whitfield', 'Head of Highways and Transport', 'JW'],
  ['P-sam', 'Sam Adeyemi', 'Environment Contract Manager', 'SA'],
  ['P-rae', 'Rae Lindqvist', 'Head of Environment', 'RL'],
  ['P-lena', 'Lena Fairbairn', 'ICT Service Manager', 'LF'],
  ['P-chris', 'Chris Odukoya', 'Facilities Manager', 'CO'],
  ['P-morgan', 'Morgan Hale', 'Head of Corporate Services', 'MH'],
  ['P-ash', 'Ash Patel', 'Commissioning Manager', 'AP'],
  ['P-kim', 'Kim Osei', 'Head of People Services', 'KO'],
  ['P-priya', 'Priya Raman', 'Category Manager, Procurement', 'PR'],
  ['P-tom', 'Tom Ellery', 'Finance Business Partner', 'TE'],
];

export const PEOPLE = RAW.map(([id, name, role, initials]) => ({
  id, name, role, initials, email: `${name.toLowerCase().replace(/\s+/g, '.')}@${EMAIL_DOMAIN}`,
}));
export const peopleById = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

export const PROCUREMENT_LEAD = 'P-priya';
export const FINANCE = 'P-tom';
const FALLBACK = { owner: PROCUREMENT_LEAD, budget: 'P-morgan' };

/** Contract owner and budget holder by service category (every category in sample.json is listed; anything else falls back). */
const BY_CATEGORY = {
  'Highways and street lighting': { owner: 'P-dana', budget: 'P-jo' },
  'Parking and traffic': { owner: 'P-dana', budget: 'P-jo' },
  Transport: { owner: 'P-dana', budget: 'P-jo' },
  'Waste and recycling': { owner: 'P-sam', budget: 'P-rae' },
  'Parks and open spaces': { owner: 'P-sam', budget: 'P-rae' },
  ICT: { owner: 'P-lena', budget: 'P-morgan' },
  'Facilities management': { owner: 'P-chris', budget: 'P-morgan' },
  Energy: { owner: 'P-chris', budget: 'P-morgan' },
  Fleet: { owner: 'P-chris', budget: 'P-morgan' },
  'Legal and professional': { owner: 'P-priya', budget: 'P-morgan' },
  'Adult social care': { owner: 'P-ash', budget: 'P-kim' },
  Catering: { owner: 'P-ash', budget: 'P-kim' },
  'Leisure and culture': { owner: 'P-ash', budget: 'P-kim' },
  Housing: { owner: 'P-ash', budget: 'P-kim' },
};
export const SERVICE_CATEGORIES = Object.keys(BY_CATEGORY);

const rolesFor = (contract) => BY_CATEGORY[contract && contract.serviceCategory] || FALLBACK;
export const ownerFor = (contract) => rolesFor(contract).owner;
export const budgetHolderFor = (contract) => rolesFor(contract).budget;

export const firstName = (name) => String(name || '').split(/\s+/)[0];
