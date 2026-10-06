// The nine evidence cases from the Kontor scope document ("Evidence" section), word for word, with their source links.
// Source of truth: docs/spec.md. tests/engine.test.mjs compares every field below with that table, so do not edit the wording here.
// Real councils appear ONLY here, in the Roadmap and in the caveat (blueprint decision 2). Never add a claim the spec does not make.
//
// Fields: id, case (as written in the spec), when, whatHappened, feature (the spec's "Kontor feature it supports", verbatim), url,
//   checkedOn (ISO), featured (true for the three the Overview strip shows), featureLinks (extra: where each feature lives in this app).
//   Overview strip:  evidence.filter((e) => e.featured)   ->  Haringey, Guildford, Edinburgh, then "Show all 9 cases" -> #/evidence
//   All cases:       evidence   (spec order)
export const CHECKED_ON = '2026-10-06';
export const CHECKED_NOTE = 'Every case below was checked against its source on 6 October 2026.';
export const OPENS_IN_NEW_TAB = '(opens in a new tab)';

export const evidence = [
  {
    id: "exeter",
    case: "Exeter",
    when: "June 2025 audit",
    whatHappened: "Procurement wasn't consistently monitoring supplier spend against contract value; only 42% of supplier payments were linked to a purchase order",
    feature: "Cap vs actual spend",
    url: "https://committees.exeter.gov.uk/documents/s100161/SMB.07.02d%20Appendix%204%20Procurement%20Action%20Plan.pdf",
    checkedOn: CHECKED_ON,
    featured: false,
    featureLinks: [{"label":"Cap vs actual spend","href":"#/spend"}],
  },
  {
    id: "haringey",
    case: "Haringey",
    when: "January 2025",
    whatHappened: "External auditor raised a value-for-money risk over weak oversight of renewals and KPI monitoring",
    feature: "Renewal radar",
    url: "https://www.minutes.haringey.gov.uk/documents/s150205/15.2%20Appendix%202%20-%20Procurement%20Section.pdf",
    checkedOn: CHECKED_ON,
    featured: true,
    featureLinks: [{"label":"Renewal radar","href":"#/renewals"}],
  },
  {
    id: "guildford",
    case: "Guildford",
    when: "2020–23, reported May 2024",
    whatHappened: "Spent £18.9m on a contract with a £5.4m maximum; later referred to police as a possible fraud",
    feature: "Cap vs actual spend",
    url: "https://localgovernmentlawyer.co.uk/procurement-and-contracts/402-procurement-news/57355-whistleblowing-allegations-at-council-relating-to-13m-contract-overspend-went-unheard-report-suggests",
    checkedOn: CHECKED_ON,
    featured: true,
    featureLinks: [{"label":"Cap vs actual spend","href":"#/spend"}],
  },
  {
    id: "edinburgh",
    case: "Edinburgh",
    when: "2022/23 data, audited 2024",
    whatHappened: "£91m went to the top 100 suppliers with no contract on the register; total non-contracted spend was £134m (Scottish council)",
    feature: "Contract register built from documents",
    url: "https://www.edinburgh.gov.uk/downloads/file/35881/cd2402-non-contracted-spend-and-waivers",
    checkedOn: CHECKED_ON,
    featured: true,
    featureLinks: [{"label":"Contract register built from documents","href":"#/spend/no-contract"}],
  },
  {
    id: "gedling",
    case: "Gedling",
    when: "March 2023 audit",
    whatHappened: "Only 2 of 10 contracts reviewed had KPIs; two high-value framework contracts missing from the register",
    feature: "Financial question set",
    url: "https://democracy.gedling.gov.uk/documents/s34010/GBC%20Contract%20Management%20and%20Procurement%20-Final%20-%20020323%20002.docx.pdf",
    checkedOn: CHECKED_ON,
    featured: false,
    featureLinks: [{"label":"Financial question set","href":"#/contracts"}],
  },
  {
    id: "windsor-maidenhead",
    case: "Windsor & Maidenhead",
    when: "Date not stated",
    whatHappened: "Register was incomplete and inaccurate; rebuilt by contacting about 85 officers",
    feature: "Contract register built from documents",
    url: "https://rbwm.moderngov.co.uk/mgAi.aspx?ID=27980",
    checkedOn: CHECKED_ON,
    featured: false,
    featureLinks: [{"label":"Contract register built from documents","href":"#/contracts"}],
  },
  {
    id: "brighton-hove",
    case: "Brighton & Hove",
    when: "Date not stated",
    whatHappened: "Internal audit found housing repairs overpayments via a subcontractor; contractor working with council to refund",
    feature: "Cap vs actual spend, clause checks",
    url: "https://democracy.brighton-hove.gov.uk/mgAi.aspx?ID=49681",
    checkedOn: CHECKED_ON,
    featured: false,
    featureLinks: [{"label":"Cap vs actual spend","href":"#/spend"},{"label":"Clause checks","href":"#/opportunities?type=overCap"}],
  },
  {
    id: "sefton",
    case: "Sefton (LGA)",
    when: "2019",
    whatHappened: "£1.7m potential savings shrank to possibly nil once outliers turned out to have legitimate reasons; its duplicate-payment software couldn't catch charges that differed from contract terms",
    feature: "Caveat: frame as opportunities; supports reading terms, not just payments",
    url: "https://www.local.gov.uk/case-studies/testing-savings-around-contract-compliance-and-negotiation",
    checkedOn: CHECKED_ON,
    featured: false,
    featureLinks: [{"label":"Caveat: frame as opportunities","href":"#/method"},{"label":"Reading terms, not just payments","href":"#/contracts"}],
  },
  {
    id: "sheffield",
    case: "Sheffield (LGA)",
    when: "2012/13",
    whatHappened: "Saved £15.5m across seven contracts, 8% of their annual cost; separately recovered £232,000 from a PFI where excessive indexation had been applied",
    feature: "Savings opportunities list, uplift check",
    url: "https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf",
    checkedOn: CHECKED_ON,
    featured: false,
    featureLinks: [{"label":"Savings opportunities list","href":"#/opportunities"},{"label":"Uplift check","href":"#/opportunities?type=uplift"}],
  },
];

export const evidenceById = Object.fromEntries(evidence.map((e) => [e.id, e]));
