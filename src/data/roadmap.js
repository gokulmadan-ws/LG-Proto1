// Roadmap page content (requirements section 9) with the spec's own words wherever the spec has them.
// Source of truth: docs/spec.md. tests/engine.test.mjs checks the strings marked "verbatim" against that file, so do not reword them.
// The word "saving" is allowed on the Roadmap page and in the caveat only (R13). There are no inputs, sliders or calculators here by design.
//
// Usage in a view:  import { roadmap } from '../data/roadmap.js';
//   roadmap.statusRows.map(...)   Feature | status badge (badgeLabel) | What it needs; rows with notInPrototype show the label "Not in this prototype"
//   roadmap.stage2.steps          six numbered steps
//   roadmap.stage2.formula        monospace block (formula.plain)
//   roadmap.stage2.illustrative   label + table + workedExample, all static
// Link objects are { label, url }; render text first, then the links ("Source: ...") with rel="noopener noreferrer" and "(opens in a new tab)".

export const BADGES = { built: 'Built in this prototype', stage2: 'Stage 2', notYet: 'Not yet' };
export const NOT_IN_PROTOTYPE = 'Not in this prototype';

export const roadmap = {
  title: 'Roadmap',
  subtitle: "What this prototype does, what comes next, and what needs data we don't have yet.",

  // 1. Status table (requirements section 9, rows from the spec's "Stage 1: stretch and not-yet features" table plus the four must-haves)
  statusRows: [
    { id: 'question-set', feature: 'Financial question set', status: 'built', badgeLabel: BADGES.built, needs: "Kontor's existing extraction, plus 9 new questions", href: '#/contracts' },
    { id: 'renewal-radar', feature: 'Renewal radar', status: 'built', badgeLabel: BADGES.built, needs: 'Contract dates and notice terms', href: '#/renewals' },
    { id: 'cap-vs-spend', feature: 'Cap vs spend', status: 'built', badgeLabel: BADGES.built, needs: 'Transparency Code payments over £500, joined to contracts by supplier', href: '#/spend' },
    { id: 'opportunities', feature: 'Opportunities list', status: 'built', badgeLabel: BADGES.built, needs: 'The three above', href: '#/opportunities' },
    // verbatim from the spec table from here on
    { id: 'uplift-check', feature: 'Uplift check', status: 'built', badgeLabel: BADGES.built, note: 'Stretch feature', needs: 'Contract indexation cap vs year-on-year change in payments to that supplier', href: '#/opportunities?type=uplift' },
    { id: 'cross-council', feature: 'Cross-council comparison', status: 'stage2', badgeLabel: BADGES.stage2, notInPrototype: true, needs: 'Same supplier or service across 3–4 councils side by side (value, term, rates)' },
    { id: 'invoice-matching', feature: 'Invoice line-item matching', status: 'notYet', badgeLabel: BADGES.notYet, notInPrototype: true, needs: "Council invoice data, which isn't public" },
    { id: 'service-credits', feature: 'Unclaimed service credits', status: 'notYet', badgeLabel: BADGES.notYet, notInPrototype: true, needs: 'KPI performance data' },
    { id: 'aggregation', feature: 'Aggregation finder and framework fit', status: 'notYet', badgeLabel: BADGES.notYet, notInPrototype: true, needs: "More councils than the prototype will hold" },
    { id: 'agency-rates', feature: 'Agency rate benchmarking', status: 'notYet', badgeLabel: BADGES.notYet, notInPrototype: true, needs: "Rate data that isn't published" },
  ],
  notYetIntro: "One stretch feature goes in if time allows. Cross-council work belongs to Stage 2, and the rest stays on the roadmap because it needs data a prototype won't have.", // verbatim

  // 2. Stage 1 and Stage 2 side by side (verbatim, spec "Two stages")
  stagesIntro: "Stage 1 proves value inside one council; Stage 2 turns many councils' contracts into buying power.", // verbatim
  stages: {
    columns: ['', 'Stage 1: single council', 'Stage 2: joined-up view'],
    rows: [
      ['Who uses it', "One council's commercial or contracts team", 'A group of councils, a regional body, or central government'],
      ['Question it answers', 'Where are we losing money on our own contracts?', 'Where would councils save by buying together, after exit costs?'],
      ['Data', "That council's contracts and spend", 'Contracts from many councils, plus framework prices'],
      ['Core features', 'Financial question set, renewal radar, cap vs spend, savings opportunities list', 'Like-for-like grouping, cross-council rate benchmarking, net saving after exit costs, framework or buying-group recommendation'],
      ['Status', 'Prototype now', 'Next, built on Stage 1 extraction'],
    ],
  },
  stagesClosing: "Each council that runs Stage 1 ends up with a structured contract estate, which is the raw material Stage 2 needs, with that council's agreement to share it.", // verbatim

  // 3. Stage 2: the joined-up view
  stage2: {
    title: 'Stage 2: the joined-up view across councils',
    intro: "Once Kontor reads contracts across many councils, it can show where councils buying the same thing separately should move onto one framework or buying group, and whether the saving survives the cost of getting out of their current contracts.", // verbatim
    stepsTitle: 'How the analysis works',
    steps: [ // verbatim
      'Ingest contracts from many councils.',
      'Extract for each one: service category, supplier, rates and unit prices, annual value, end date, extension options, notice period, break clauses, termination-for-convenience rights, exit fees and volume commitments.',
      'Group like-for-like contracts across councils.',
      'Benchmark each contract against the best rate in the group or an existing framework price.',
      "Work out each council's net saving two ways: move now and pay the exit cost, or move at natural expiry with no exit cost.",
      'Recommend an action: join an existing framework, form a buying group, or renegotiate at renewal using the group rate.',
    ],
    formula: {
      title: 'Net saving',
      plain: 'Net saving = (current annual cost − group annual cost) × years remaining − exit cost − switching cost',
    },
    illustrative: {
      label: 'Illustrative numbers, made up to show the logic, not real data', // blueprint wording
      intro: 'Ten councils buy the same service separately, about £20m a year combined.', // verbatim
      columns: ['Councils', 'Contract position', 'Saving vs group rate', 'Exit cost', 'Recommendation'],
      rows: [ // verbatim
        ['4', 'Expiring within 12 months', '10%', 'None', 'Join the group at renewal'],
        ['3', '2–3 years left, break clause available', '8%', '£120k each', 'Move now if net saving is positive'],
        ['2', '4+ years left, no break clause', '12%', "Can't exit without breach", 'Renegotiate citing the group rate'],
        ['1', 'Already on a framework', '—', '—', 'Benchmark only'],
      ],
      workedExample: 'For one of the three mid-term councils on £2m a year: an 8% saving is £160k a year, or £400k over 2.5 remaining years. Take off £120k exit cost and £30k switching cost, and the net saving is £250k, so moving now beats waiting.', // verbatim
    },
    whyTitle: "Why there's money in it",
    why: [ // verbatim (links removed from the text and listed in `links`)
      {
        title: 'Spend is concentrated in a few suppliers.',
        text: 'In 2011/12, councils spent over 90% of third-party payments with no more than 20% of their suppliers, and one of the top 25 suppliers worked with 317 councils (LGA/Audit Commission). The data is old, but the pattern is why pooling works.',
        links: [{ label: 'LGA/Audit Commission', url: 'https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf' }],
      },
      {
        title: 'Sharing contract data exposes price gaps.',
        text: 'Camden led negotiations for London councils to secure standard prices for an ICT package after a data-sharing exercise showed councils paying different prices; the pan-London ICT work reported £2.45m indicative savings in its first year (same report).',
        links: [{ label: 'same report', url: 'https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf' }],
      },
      {
        title: 'Councils already pool buying, with poor data.',
        text: "London's IBAA rate cap for temporary accommodation and the new Regional Care Cooperatives for children's placements both depend on councils knowing what each other pays.",
        links: [
          { label: 'IBAA rate cap', url: 'https://governance.enfield.gov.uk/documents/s101096/Temporary%20Accommodation%20Programme%20Report.pdf' },
          { label: 'Regional Care Cooperatives', url: 'https://www.gov.uk/government/publications/regional-care-co-operatives-pathfinder-areas/regional-care-cooperatives-policy-statement' },
        ],
      },
    ],
  },

  // 4. Who would buy it (verbatim, spec "Who would buy it")
  whoTitle: 'Who would buy it',
  who: [
    {
      title: 'Central government:',
      text: 'the Cabinet Office plans to add post-award data and a spend analytics tool to its procurement transparency platform (LGA).',
      links: [{ label: 'LGA', url: 'https://www2.local.gov.uk/publications/strategic-supplier-relationship-management-programme-annual-review-202223' }],
    },
    { title: 'Regional bodies:', text: 'Regional Care Cooperatives, London Councils, and regional procurement consortia.', links: [] },
    { title: 'Merging councils:', text: 'groups of councils combining contract estates under LGR, once it restarts.', links: [] },
  ],

  // 5. What has to be true (verbatim, spec "What has to be true")
  trueTitle: 'What has to be true',
  mustBeTrue: [
    { title: 'Access beyond published contracts.', text: 'Public £5m+ contracts are a small pool, so a national partner or a group of councils has to share their estates.' },
    { title: 'A legal check on every move.', text: 'Termination rights, framework access rules under the Procurement Act, and TUPE where staff transfer all need confirming per contract.' },
    { title: 'Outputs framed as opportunities.', text: 'Sefton shows headline savings can shrink once tested.' },
    { title: 'Termination terms extracted from day one.', text: "Adding termination rights and exit fees to the prototype's question set now means the national view needs no rework later." },
  ],
  terminationNote: "That is why Contract detail shows termination rights and exit fees for every contract in this prototype: they are the raw material for Stage 2.",

  // 6. Stage 1 data sources (verbatim bullets, spec "Stage 1: data sources")
  dataSourcesTitle: 'Stage 1 data sources',
  dataSourcesIntro: "The prototype runs entirely on sample data for one fictional council, so there's no redaction or client-data problem. A real council would use its own contracts and spend.",
  dataSources: [
    {
      title: 'Contracts:',
      text: 'under the Procurement Act 2023, councils must publish a copy of any contract over £5m on the central digital platform (Find a Tender), plus KPI performance notices. This only applies to procurements started on or after 24 February 2025, so the pool of published contracts is still small.',
      links: [{ label: 'publish a copy of any contract over £5m', url: 'https://gov.wales/sites/default/files/publications/2024-10/procurement-act-2023-guidance-contract-details-notices.pdf' }],
    },
    { title: 'Spend:', text: "each borough's Transparency Code spend files (payments over £500).", links: [] },
    { title: 'Context:', text: "Contracts Finder notices for contracts below £5m, where full documents aren't published.", links: [] },
  ],

  // 7. The four must-have features (verbatim, spec "Stage 1: must-have features"); `builtAs` says where each lives in this app
  mustHavesTitle: 'Stage 1: must-have features',
  mustHaves: [
    { n: 1, feature: 'Financial question set', does: "Adds about 9 questions to Kontor's existing set: contract value and cap, start and end dates, extension options, notice period and auto-renewal, price review and indexation cap, payment terms, rate card, service credits, termination rights and exit fees", why: 'Everything else is built on these answers; clause-level provenance is the edge over spend-analytics tools', builtAs: 'Contracts', href: '#/contracts' },
    { n: 2, feature: 'Renewal radar', does: 'Shows contracts entering their notice window in the next 3, 6 and 12 months, with value attached', why: 'Simple, visual, and an instant "we didn\'t know that" moment; the Haringey finding as a screen', builtAs: 'Renewal radar', href: '#/renewals' },
    { n: 3, feature: 'Cap vs actual spend', does: 'Matches Transparency Code payments to each contract by supplier and shows spend to date against the cap, flagging anything over or close', why: 'The Guildford story; supplier name matching is the fiddliest part, so start it early', builtAs: 'Cap vs spend', href: '#/spend' },
    { n: 4, feature: 'Savings opportunities list', does: 'One ranked list combining renewals due, spend over cap and uplifts due, each with an indicative £, a reason and a link to the clause', why: 'The headline screen; labelled "opportunities to investigate", not "savings"', builtAs: 'Opportunities', href: '#/opportunities' },
  ],
};

export default roadmap;
