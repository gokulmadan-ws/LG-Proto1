# Kontor Financial Layer — Prototype Scope  (a.k.a. "Kontor Financial Layer — Inception")

Source: Claude Doc shared by the user (owner: Scott, Product lead). As-of date in doc: 2026-10-06.
This file is a faithful transcription of the doc for builders. The user's link anchored the "Evidence" section.

## Purpose
The prototype adds a financial layer on top of Kontor: it reads council contracts, pulls out the commercial terms, and flags where money is being lost. Kontor has already built the hard half (ingestion and clause-level extraction with provenance), so this is new questions and new views on an existing engine, not a cold build.

The product works in two stages. Stage 1 is a tool one council uses on its own contracts to find savings, and it's what the prototype builds now. Stage 2 joins contracts up across councils to find framework and buying-group savings, reusing the same extraction.

Finding savings means comparing three things: what the contract says, what was actually paid, and what other councils pay. Kontor does the first today. The prototype adds the second using public spend data, and Stage 2 adds the third.

## Two stages
Stage 1 proves value inside one council; Stage 2 turns many councils' contracts into buying power.

|  | Stage 1: single council | Stage 2: joined-up view |
|---|---|---|
| Who uses it | One council's commercial or contracts team | A group of councils, a regional body, or central government |
| Question it answers | Where are we losing money on our own contracts? | Where would councils save by buying together, after exit costs? |
| Data | That council's contracts and spend | Contracts from many councils, plus framework prices |
| Core features | Financial question set, renewal radar, cap vs spend, savings opportunities list | Like-for-like grouping, cross-council rate benchmarking, net saving after exit costs, framework or buying-group recommendation |
| Status | Prototype now | Next, built on Stage 1 extraction |

Each council that runs Stage 1 ends up with a structured contract estate, which is the raw material Stage 2 needs, with that council's agreement to share it.

## Prototype goal
The rapid prototype has to prove Stage 1 works on real public data. It succeeds if:
1. Kontor answers the financial questions correctly on a sample of real published contracts, checked by hand.
2. The council's spend files join to its contracts by supplier.
3. The savings opportunities list surfaces flags that each link to a clause and page.
4. A council contact sees it and tells us whether they'd use it.

## Team
| Person | Role on this work |
|---|---|
| Scott | Product lead; owns this doc |
| Dan, Gokul | Engineering: ingestion, extraction, spend matching |
| Marcus | Cost baseline and savings metrics |
| Sacha | Council contacts and feedback |
| Nick | Public data sets research |

## Evidence  (the section the user's link anchors to)
Councils routinely lose money because nobody has a full picture of their own contracts. Every case below was checked against its source on 6 October 2026, and the When column shows how current each one is.

| Case | When | What happened | Kontor feature it supports |
|---|---|---|---|
| [Exeter](https://committees.exeter.gov.uk/documents/s100161/SMB.07.02d%20Appendix%204%20Procurement%20Action%20Plan.pdf) | June 2025 audit | Procurement wasn't consistently monitoring supplier spend against contract value; only 42% of supplier payments were linked to a purchase order | Cap vs actual spend |
| [Haringey](https://www.minutes.haringey.gov.uk/documents/s150205/15.2%20Appendix%202%20-%20Procurement%20Section.pdf) | January 2025 | External auditor raised a value-for-money risk over weak oversight of renewals and KPI monitoring | Renewal radar |
| [Guildford](https://localgovernmentlawyer.co.uk/procurement-and-contracts/402-procurement-news/57355-whistleblowing-allegations-at-council-relating-to-13m-contract-overspend-went-unheard-report-suggests) | 2020–23, reported May 2024 | Spent £18.9m on a contract with a £5.4m maximum; later referred to police as a possible fraud | Cap vs actual spend |
| [Edinburgh](https://www.edinburgh.gov.uk/downloads/file/35881/cd2402-non-contracted-spend-and-waivers) | 2022/23 data, audited 2024 | £91m went to the top 100 suppliers with no contract on the register; total non-contracted spend was £134m (Scottish council) | Contract register built from documents |
| [Gedling](https://democracy.gedling.gov.uk/documents/s34010/GBC%20Contract%20Management%20and%20Procurement%20-Final%20-%20020323%20002.docx.pdf) | March 2023 audit | Only 2 of 10 contracts reviewed had KPIs; two high-value framework contracts missing from the register | Financial question set |
| [Windsor & Maidenhead](https://rbwm.moderngov.co.uk/mgAi.aspx?ID=27980) | Date not stated | Register was incomplete and inaccurate; rebuilt by contacting about 85 officers | Contract register built from documents |
| [Brighton & Hove](https://democracy.brighton-hove.gov.uk/mgAi.aspx?ID=49681) | Date not stated | Internal audit found housing repairs overpayments via a subcontractor; contractor working with council to refund | Cap vs actual spend, clause checks |
| [Sefton (LGA)](https://www.local.gov.uk/case-studies/testing-savings-around-contract-compliance-and-negotiation) | 2019 | £1.7m potential savings shrank to possibly nil once outliers turned out to have legitimate reasons; its duplicate-payment software couldn't catch charges that differed from contract terms | Caveat: frame as opportunities; supports reading terms, not just payments |
| [Sheffield (LGA)](https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf) | 2012/13 | Saved £15.5m across seven contracts, 8% of their annual cost; separately recovered £232,000 from a PFI where excessive indexation had been applied | Savings opportunities list, uplift check |

## Stage 1: must-have features
Four features make the demo work. Each one is backed by public data, and every flag links back to the clause and page it came from.

| # | Feature | What it does | Why it matters |
|---|---|---|---|
| 1 | Financial question set | Adds about 9 questions to Kontor's existing set: contract value and cap, start and end dates, extension options, notice period and auto-renewal, price review and indexation cap, payment terms, rate card, service credits, termination rights and exit fees | Everything else is built on these answers; clause-level provenance is the edge over spend-analytics tools |
| 2 | Renewal radar | Shows contracts entering their notice window in the next 3, 6 and 12 months, with value attached | Simple, visual, and an instant "we didn't know that" moment; the Haringey finding as a screen |
| 3 | Cap vs actual spend | Matches Transparency Code payments to each contract by supplier and shows spend to date against the cap, flagging anything over or close | The Guildford story; supplier name matching is the fiddliest part, so start it early |
| 4 | Savings opportunities list | One ranked list combining renewals due, spend over cap and uplifts due, each with an indicative £, a reason and a link to the clause | The headline screen; labelled "opportunities to investigate", not "savings" |

## Stage 1: stretch and not-yet features
One stretch feature goes in if time allows. Cross-council work belongs to Stage 2, and the rest stays on the roadmap because it needs data a prototype won't have.

| Feature | Status | What it needs |
|---|---|---|
| Uplift check | Stretch | Contract indexation cap vs year-on-year change in payments to that supplier |
| Cross-council comparison | Stage 2 | Same supplier or service across 3–4 councils side by side (value, term, rates) |
| Invoice line-item matching | Not yet | Council invoice data, which isn't public |
| Unclaimed service credits | Not yet | KPI performance data |
| Aggregation finder and framework fit | Not yet | More councils than the prototype will hold |
| Agency rate benchmarking | Not yet | Rate data that isn't published |

## Stage 1: data sources
The prototype runs entirely on public data for one council, so there's no redaction or client-data problem.
- **Contracts:** under the Procurement Act 2023, councils must [publish a copy of any contract over £5m](https://gov.wales/sites/default/files/publications/2024-10/procurement-act-2023-guidance-contract-details-notices.pdf) on the central digital platform (Find a Tender), plus KPI performance notices. This only applies to procurements started on or after 24 February 2025, so the pool of published contracts is still small.
- **Spend:** each borough's Transparency Code spend files (payments over £500).
- **Context:** Contracts Finder notices for contracts below £5m, where full documents aren't published.

## Stage 1: demo flow
The demo runs about five minutes and moves from the headline number down to a single clause.
1. **Headline:** £X across N contracts flagged as opportunities to investigate.
2. **Renewal radar:** what's coming up in the next 3, 6 and 12 months.
3. **One over-cap contract:** click through from the flag and land on the clause and page.
4. **Close:** "This is one council's public data. Imagine your full estate."

## Stage 1: risks and open questions
The biggest risk is ingestion: if Kontor can't take a batch of public PDFs without a developer doing it by hand, that has to be fixed first.
- **Savings shrink on testing.** Sefton's £1.7m potential fell to possibly nil once checked, so every figure is framed as an opportunity, not a saving.

Open questions:
- [ ] Which council's public data do we build the prototype on?
- [ ] When is the demo, and who is it for?
- [ ] Can Kontor batch-ingest public PDFs without dev involvement?
- [ ] How many new questions can be added before extraction quality drops?
- [ ] What's the simplest way to join Transparency Code spend to contracts by supplier?

## Stage 2: the joined-up view across councils
Once Kontor reads contracts across many councils, it can show where councils buying the same thing separately should move onto one framework or buying group, and whether the saving survives the cost of getting out of their current contracts. It runs the same Stage 1 extraction across many councils' contracts.

### Why there's money in it
- **Spend is concentrated in a few suppliers.** In 2011/12, councils spent over 90% of third-party payments with no more than 20% of their suppliers, and one of the top 25 suppliers worked with 317 councils ([LGA/Audit Commission](https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf)). The data is old, but the pattern is why pooling works.
- **Sharing contract data exposes price gaps.** Camden led negotiations for London councils to secure standard prices for an ICT package after a data-sharing exercise showed councils paying different prices; the pan-London ICT work reported £2.45m indicative savings in its first year ([same report](https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf)).
- **Councils already pool buying, with poor data.** London's [IBAA rate cap](https://governance.enfield.gov.uk/documents/s101096/Temporary%20Accommodation%20Programme%20Report.pdf) for temporary accommodation and the new [Regional Care Cooperatives](https://www.gov.uk/government/publications/regional-care-co-operatives-pathfinder-areas/regional-care-cooperatives-policy-statement) for children's placements both depend on councils knowing what each other pays.

### How the analysis works
1. Ingest contracts from many councils.
2. Extract for each one: service category, supplier, rates and unit prices, annual value, end date, extension options, notice period, break clauses, termination-for-convenience rights, exit fees and volume commitments.
3. Group like-for-like contracts across councils.
4. Benchmark each contract against the best rate in the group or an existing framework price.
5. Work out each council's net saving two ways: move now and pay the exit cost, or move at natural expiry with no exit cost.
6. Recommend an action: join an existing framework, form a buying group, or renegotiate at renewal using the group rate.

```latex
\text{Net saving} = (\text{current annual cost} - \text{group annual cost}) \times \text{years remaining} - \text{exit cost} - \text{switching cost}
```

### Illustrative example
These numbers are made up to show the logic, not real data. Ten councils buy the same service separately, about £20m a year combined.

| Councils | Contract position | Saving vs group rate | Exit cost | Recommendation |
|---|---|---|---|---|
| 4 | Expiring within 12 months | 10% | None | Join the group at renewal |
| 3 | 2–3 years left, break clause available | 8% | £120k each | Move now if net saving is positive |
| 2 | 4+ years left, no break clause | 12% | Can't exit without breach | Renegotiate citing the group rate |
| 1 | Already on a framework | — | — | Benchmark only |

For one of the three mid-term councils on £2m a year: an 8% saving is £160k a year, or £400k over 2.5 remaining years. Take off £120k exit cost and £30k switching cost, and the net saving is £250k, so moving now beats waiting.

### Who would buy it
- **Central government:** the Cabinet Office plans to add post-award data and a spend analytics tool to its procurement transparency platform ([LGA](https://www2.local.gov.uk/publications/strategic-supplier-relationship-management-programme-annual-review-202223)).
- **Regional bodies:** Regional Care Cooperatives, London Councils, and regional procurement consortia.
- **Merging councils:** groups of councils combining contract estates under LGR, once it restarts.

### What has to be true
- **Access beyond published contracts.** Public £5m+ contracts are a small pool, so a national partner or a group of councils has to share their estates.
- **A legal check on every move.** Termination rights, framework access rules under the Procurement Act, and TUPE where staff transfer all need confirming per contract.
- **Outputs framed as opportunities.** Sefton shows headline savings can shrink once tested.
- **Termination terms extracted from day one.** Adding termination rights and exit fees to the prototype's question set now means the national view needs no rework later.
