# Domain brief: UK local-government procurement, for credible sample data

Prototype: Kontor Financial Layer, Stage 1 (single council). Prototype as-of date: **6 October 2026**. Spend files loaded to **31 August 2026** (the latest month a council would have published by 6 Oct, because files appear about 30 days after month end).

Everything here is for the BUILD agent. All names, numbers and identifiers in the sample data are FICTIONAL and must be labelled as sample data in the UI.

---

## 0. Read this first

### 0.1 How this brief is organised

| Section | What the build agent takes from it |
|---|---|
| 1 | Transparency Code spend-file columns, CSV quirks, cadence, PO share, and the traps that cause false "over cap" flags |
| 2 | Procurement Act 2023, Find a Tender, notice types, identifier formats, an OCDS-style JSON record to mimic |
| 3 | Clause language patterns for the 9 financial questions, with clause numbers and page ranges, plus an extraction record shape |
| 4 | 30 contract archetypes and a **31-contract seed portfolio engineered for the demo** (4 over cap, 3 near cap, 10 in notice windows, 3 indexation issues, 6 suppliers with no contract) |
| 5 | How to compute and word the indicative £ (conservative, ranged, haircut for the Sefton caveat), with the resulting headline numbers |
| 6 | Supplier-name matching: 25 messy-name patterns, algorithm, and **tested JavaScript** you can lift |
| 7 | Fictional naming kit: council, 41 supplier entities, 12 service areas, officer roles |
| 8 | Sample spend CSV, sample register row, open uncertainties, sources (the sample OCDS JSON is in 2.6) |

### 0.2 Tested code and data you can copy (all in one folder)

Folder: `/tmp/claude-0/-home-user-LG-Proto1/4a2c3345-29a2-559b-b8d9-409e75525fc5/scratchpad/research/work/domain/`

| File | What it is | Tested how |
|---|---|---|
| `kit.mjs` | Fictional council, 41 supplier entities (31 on the register, 6 spend-only, 4 decoys) with named parents, service areas, officer roles | Used by every other file |
| `portfolio.mjs` | The 31-contract seed register, 6 no-contract suppliers, derived metrics (`derive`), indicative £ model (`opportunities`), `ASSUMPTIONS` | `node portfolio.mjs` prints bucket counts and totals |
| `spendgen.mjs` | Deterministic generator of about 7,950 Transparency Code rows (seeded RNG) that **reconcile to each contract's spend target within 1%**, with messy supplier names, credit notes, redacted payees, a 600-payee long tail | `node spendgen.mjs` prints reconciliation: 0 mismatches |
| `matcher.mjs` | Supplier-name normaliser and matcher with manual-confirm support | `node test_matcher.mjs` (38 of 38 pass) and `node e2e_match.mjs` (see 6.4) |
| `emit_md.mjs` | Prints the tables used in sections 4 and 5 | Reproducibility only |

All are ES modules with `export`; esbuild bundles them fine from `src/main.jsx`. Do the matching and the cap-vs-spend join **at build time or on first load and cache the result** (the end-to-end run took 4.7 s for 1,716 distinct payee strings in Node; too slow to redo on every render).

### 0.3 Source honesty (important)

- **No web page could be opened.** `WebFetch` was refused for every host I tried (gov.uk, local.gov.uk, find-tender.service.gov.uk, legislation.gov.uk, standard.open-contracting.org, open-contracting.org, council sites, ckan.publishing.service.gov.uk). I also did not pursue a proxy-status check that was blocked by the permission classifier.
- What I did use: `WebSearch` result summaries, which quote or paraphrase the underlying pages. Throughout this brief:
  - **[S]** = seen in a WebSearch result summary this session (URL list in 8.4). Not read at source.
  - **[K]** = my own domain knowledge, not checked this session.
  - **[U]** = uncertain, verify before saying it to a council contact.
- The brief therefore does **not** cite any source "I opened". Where the task asked for opened sources (LGA case studies), I give what the search summaries said and flag a **discrepancy on Sefton** (see 5.1).

### 0.4 The ten decisions that matter most

1. **Council:** "Brindleford Borough Council" (fictional unitary borough, about 284,000 people, about £192m third-party spend). Web searches for "Brindleford Borough Council" and two alternates found no real council of that name [S].
2. **As-of and data window:** as-of 2026-10-06; spend files 2021-04 to 2026-08 (65 monthly files); latest published month is August 2026.
3. **Spend CSV schema:** use the Code's 7 mandatory fields plus the common extras (transaction number, supplier ID, PO number, expense type). Vary column names across years to justify a column-mapping step (see 1.2).
4. **Biggest false-positive risk is VAT.** Contract caps are almost always ex-VAT; some councils publish gross. Use the net column (1.6).
5. **Notice dates, not end dates, drive the renewal radar.** The radar shows the date the council must act (serve notice, exercise an option, or trigger a break), with the end date as fallback (3.5, 3.6 and 4.3).
6. **Value over £5m is judged on the whole term including options.** A £1.2m-a-year contract with a 5+2 term is a £8.4m contract and on Find a Tender if procured after 24 Feb 2025 [S/K] (2.4).
7. **Only five of the 31 seed contracts post-date 24 Feb 2025** (so only those have a Find a Tender contract details notice and a published contract copy). The rest come from the council's own contracts register and PDFs. This mirrors the spec's own caveat that the public pool is small.
8. **Headline for the demo:** about **£3.1m across 15 contracts** (range £1.9m to £4.7m), or **£3.9m across 21 items** including the six suppliers with no contract (range £2.4m to £6.4m); about 2.0% of third-party spend. Separately show **£13.2m of spend above contract caps** as exposure, not as savings (section 5).
9. **Name matching policy:** auto-match at 0.90, review queue 0.72 to 0.90, parents and siblings never auto-match, rank the review queue by pounds not by score (section 6).
10. **Never use real firms.** The names in `kit.mjs` are invented; Companies House style numbers use the unissued `9xxxxxxx`, `OC9xxxxx` ranges (assumption [U]: current allocation is below about 17,000,000). Web search found no obvious real match for a sample of the invented names, but that is not a Companies House check; run the list through Companies House search before any external demo.

---

## 1. Local Government Transparency Code 2015: the "spend over £500" file

### 1.1 What the Code requires

| Point | Content | Basis |
|---|---|---|
| Legal basis | Local Government Transparency Code 2015, issued by DCLG (now MHCLG) in February 2015 | [K] |
| Expenditure exceeding £500 | Publish each individual item over £500: individual invoices, grant payments, expense payments, payments for goods and services, grants, grant in aid, rent, credit notes over £500, transactions with other public bodies | [S] (search summary of the Code) |
| Cadence | At least **quarterly**; many councils publish **monthly**, typically about 30 days after month end (Durham: "30 days after the end of each month") | [S] |
| Format | Machine-readable, CSV | [S] |
| Mandatory fields per item | (a) date the expenditure was incurred; (b) local authority department which incurred it; (c) beneficiary; (d) summary of the purpose; (e) amount; (f) VAT that cannot be recovered; (g) merchant category (for example computers, software) | [S] |
| Government Procurement Card transactions | Published on the same basis | [S] |
| Procurement information | Contracts, commissioned activity, purchase orders, framework agreements and any other legally enforceable agreement above **£5,000**, with reference, title, department, description, supplier, sum to be paid, start/end/review dates | [K] |
| Procurement Act interaction | MHCLG published guidance in **January 2025** reconciling the Code with the Procurement Act 2023; authorities may satisfy the contracts part by publishing on the Central Digital Platform (Find a Tender), including contracts £5,000 to £30,000 | [S] |
| LGA guide | "Local transparency guidance: publishing spending and procurement information" (June 2015, updated May 2025) is the practical reference; I could not open it | [S] |
| Thresholds vary locally | Some councils publish above **£250** (for example a North Yorkshire council's "Expenditure Exceeding £250" files) | [S] |
| Exclusions in practice | Non-commercial payments to individuals (data protection), staff and pensions often excluded; social-care payments to individuals redacted or excluded | [S] and [K] |

### 1.2 Columns: what real files look like

The Code does not prescribe column names, so every council differs. The de facto schema descends from the central-government "spend over £25k" template and the 2010-11 local spending data guidance: **Date, Expense Type, Expense Area, Supplier, Transaction Number, Amount** (+ VAT, + description). A Durham-style file lists "Transaction number (unique identifier within the council's financial management system), Expense type, Amount exc VAT, Supplier name" [S].

**Recommended synthetic schema for the prototype (12 columns)** and the aliases a column-mapping step should recognise:

| Canonical field | Example | Aliases seen in the wild [K] |
|---|---|---|
| `body` | Brindleford Borough Council | Body Name, Authority, Local Authority |
| `date` | 26/06/2026 | Payment Date, Date, Invoice Date, Posting Date, Date Paid, Paid Date |
| `transactionNo` | T410129 | Transaction Number, Trans No, Payment Reference, Voucher No, Ref |
| `directorate` | Environment and neighbourhoods | Expense Area, Directorate, Department, Service Area, Division, Cost Centre Group |
| `expenseType` | Waste collection | Expense Type, Subjective, Subjective Description, Category, Merchant Category, Nominal Description |
| `supplierId` | 100037 | Supplier ID, Vendor No, Creditor Number, Supplier Code |
| `supplierName` | FERROWICK ENVIRONMENTAL SERVICES LIMITED | Supplier, Supplier Name, Beneficiary, Vendor, Payee, Creditor Name |
| `po` | PO724192 | Purchase Order, PO Number, Order Ref, Order No |
| `net` | 505,092.01 | Amount, Net Amount, Amount Exc VAT, Value, Payment Amount, Total |
| `vat` | 101,018.40 | VAT, Irrecoverable VAT, VAT Amount, Unrecoverable VAT |
| `description` | Waste collection | Summary of Purpose, Description, Narrative, Purpose |
| (rare) `companyNo` | (blank) | Supplier Company Number, Company Reg No |

**Three header variants to ship across the 65 files** so the mapping step is exercised (same data, different headers; 1 and 2 are the ones to put in the demo):

```
Variant A (FY21/22 to FY23/24, 9 cols):  Date,Expense Type,Expense Area,Supplier,Transaction Number,Amount,VAT
Variant B (FY24/25 on, 12 cols):         Body Name,Payment Date,Transaction Number,Directorate,Expense Type,Supplier ID,Supplier Name,Purchase Order,Net Amount,VAT,Description
Variant C (a bad year, 6 cols):          Paid Date,Service,Subjective Description,Payee,Value,Order No      (note: no VAT, "Value" is GROSS)
```

### 1.3 Typical CSV quirks (inject these; the matcher and parser must survive them)

| # | Quirk | Example | Handling |
|---|---|---|---|
| 1 | Amount with thousands separators, quoted | `"1,234.56"` | strip commas |
| 2 | Currency symbol | `£1,234.56` | strip |
| 3 | Negative as minus | `-1234.56` | credit |
| 4 | Negative as brackets | `(1,234.56)` | credit |
| 5 | Negative with trailing `CR` or trailing minus | `1234.56CR`, `1234.56-` | credit |
| 6 | Amounts with trailing space or NBSP | `1234.56 ` | trim, replace ` ` |
| 7 | Date dd/mm/yyyy (UK) | `26/06/2026` | parse as UK, never US |
| 8 | Date ISO | `2026-06-26` | |
| 9 | Date text month | `26-Jun-26`, `26 JUN 2026` | |
| 10 | Excel serial number | `46199` | convert (1900 system) |
| 11 | Month-only date | `Jun-26` | assign to month, flag low precision |
| 12 | Header title rows above the header | `Payments over £500 - June 2026` on row 1 | find header row by known tokens |
| 13 | UTF-8 BOM and Windows-1252 mojibake | `Â£`, `Ã©` | decode, replace |
| 14 | HTML entities in names | `R&amp;B` | decode |
| 15 | Trailing comma on each row | `...,,` | ignore empty extra column |
| 16 | Subtotal or total rows | `Total,,,,,12345678.90` | drop rows with no supplier and no date |
| 17 | Same invoice paid in two months (re-issued payment) | same amount, same supplier, 30 days apart | de-dup warning, do not silently drop |
| 18 | Credit note followed by re-bill | negative then positive same amount | net to zero for the month |
| 19 | Redacted payees | `REDACTED PERSONAL DATA`, `***`, `Data Protection Exemption` | exclude from matching; count as "redacted £" |
| 20 | Sundry or one-off payees | `SUNDRY CREDITOR`, `ONE-OFF SUPPLIER` | exclude from matching |
| 21 | Payee is an individual (foster carer, direct payment) | `MRS J HARRIS` | exclude or low-weight |
| 22 | Column set changes mid-year | new "PO Number" column appears October | schema detection per file |
| 23 | Gross not net | no VAT column, header "Value" | treat as gross, divide VATable lines by 1.2 (flag) |
| 24 | Supplier ID changes | supplier gets a new vendor number after system migration | join by name when ID unseen |
| 25 | Same supplier, several vendor IDs (one per site or per service) | `100037`, `100038` | cluster by normalised name |
| 26 | Description blank in 50% of rows | | do not rely on it |
| 27 | Directorate names change after a reorganisation | `Place` becomes `Environment and neighbourhoods` | map table |
| 28 | Truncated text at 30 or 40 characters | `FERROWICK ENVIRONMENTAL SERVIC` | see 6.1 |
| 29 | Mixed case / upper case per department | `Ferrowick Environmental Services Ltd` | case-fold |
| 30 | Empty month (file missing on the site) | June 2024 absent | show "no data" gap, do not read as zero |

### 1.4 Cadence and lag (for realism in the UI)

- Latest file in the prototype: **August 2026**, "published 30 September 2026". Show "Spend data to 31 Aug 2026" in the header of cap-vs-spend and mention the lag in a tooltip: payment dates lag invoice dates by about 30 days, so spend-to-date understates liability.
- Mix cadence in the narrative: monthly for the last three years, quarterly (three months in one file) for FY21/22. Quarterly files make "month" resolution unavailable; keep the loader tolerant.
- File naming that real councils use: `Payments over £500 - August 2026.csv`, `Spend_Aug26.csv`, `Q1_2021-22_expenditure.csv` [K].

### 1.5 Purchase-order share

- Exeter's June 2025 procurement audit found only **42%** of supplier payments linked to a purchase order, and only **32%** of payments classified as "Contract Payment" linked to a PO [S]. That analysis looked at 2023/24 and 2024/25 spend against a £213k goods and services threshold and compared it with the contract register.
- Typical range [K]: 40 to 80% of **value** carries a PO in healthy councils; much lower by **count** (care, TA, direct payments, utilities, grants, card payments go without PO).
- Seed data produced by `spendgen.mjs`: **39% of rows (57% of value)** carry a PO; managed-service contracts about 70%; adult social care contracts about 35%; long tail 33%. This is deliberately close to Exeter. Use it for a small "PO coverage" stat tile if desired ("39% of payments carry a purchase order").

### 1.6 Traps that create false "over cap" or "under cap" flags (build these into the UI as "check before you act")

| Trap | Why it matters | Mitigation in the UI |
|---|---|---|
| **VAT basis** | Caps are almost always ex-VAT. A gross file overstates spend by 20% on VATable supplies and would push a 90% contract to 108% | Use `net`. If a file is gross-only, divide VATable lines by 1.2 and mark the figure "estimated, ex-VAT" |
| **Payment date vs invoice date** | Spend lags liability by about a month | Show "spend to 31 Aug 2026"; project to today at run-rate |
| **One supplier, several contracts** | Hartsop holds repairs and could hold planned works; the join is by supplier not contract | Attribute by expense type, cost centre, PO prefix or date; if ambiguous show "attribution uncertain" and lower confidence |
| **Estimated value vs maximum** | "Estimated contract value" is non-binding; exceeding it is not a breach | Store `capType` as `maximum`, `estimated`, `fixed`; only `maximum` generates a hard over-cap flag; estimated generates "above estimate" (medium confidence) |
| **Variations raised the cap** | A change control note or a Contract Change Notice (UK10) may have increased the cap legitimately | Show "no variation found on the register" rather than "unauthorised" |
| **Pass-through spend** | Agency and energy contracts pass costs through; the cap is often on the managed-service fee, not on the pass-through | Show both; flag the cap definition clause |
| **Spend before the contract start** | Prior contract's payments to the same supplier | Count from `commencementDate` |
| **Credit notes and re-bills** | Gross payments overstate | Net by supplier and month |
| **Redacted or aggregated social care** | Care spend is partly hidden | Footnote "excludes redacted payments of £x" |
| **Partial files** | A missing month under-states | Show a "gaps in data" chip |

---


## 2. Procurement Act 2023, Find a Tender and Contracts Finder

### 2.1 Two regimes, one cut-off

| | Old regime | New regime |
|---|---|---|
| Law | Public Contracts Regulations 2015 | **Procurement Act 2023**, in force **24 February 2025** [S] |
| Applies to | Procurements **started before** 24 Feb 2025 (contracts keep running for years) | Procurements **started on or after** 24 Feb 2025 |
| Where notices go | OJEU/"Find a Tender" legacy notices for above-threshold; **Contracts Finder** for contracts above £30k (sub-central) | **Central Digital Platform**, whose public face is **Find a Tender** (FTS) [S] |
| Contract documents | Not published as a rule; Contracts Finder holds an award notice with value, dates and supplier | **Copy of contract (redacted) for contracts over £5m** [S] |
| KPIs | Not published | **At least 3 KPIs set and annual performance notice** for contracts over £5m [S] |
| Data standard | Contracts Finder has an OCDS feed; FTS legacy was TED-like | OCDS, about 551 fields after 143 additions in year one [S] |

Contracts Finder notices from the old regime (the spec's "context for contracts below £5m") carry supplier, value, dates and a description but **no contract documents**, so they populate the register with fewer answers than a PDF.

Consequence for the prototype (matches the spec's own caveat): published contract **documents** exist only for a thin slice. So the seed register carries a `source` per contract: **5 of 31** are `find-a-tender` (procured after 24 Feb 2025), **26 of 31** are `register-pdf` (the council's own published contracts register entry plus a PDF supplied by the council, committee papers or FOI). In the UI, show a small "Source" chip: "Find a Tender notice and contract", or "Council contracts register, PDF".

### 2.2 Thresholds (current at 6 Oct 2026)

From **1 January 2026** (inclusive of VAT) [S]:

| Contract type | Threshold |
|---|---|
| Goods and services, sub-central authority (councils) | **£207,720** (was £214,904) |
| Goods and services, central government | £135,018 (was £139,688) |
| Works | **£5,193,000** (was £5,372,609) |
| Light touch services | £663,540 (unchanged) |
| Notifiable below-threshold contract (councils) | **£30,000 and over** [S] |
| Contract copy and KPI duties | Contracts valued **over £5m** [S] (judge by whole-term value including options; VAT basis [U]) |

Exeter's audit used a £213k goods and services threshold when it compared spend with the register [S]; use £207,720 (2026) for the prototype's "high-value supplier with no contract" rule, rounded to **£200,000 over the last 12 months** in the UI copy, with the Contract Procedure Rules threshold noted as council-specific.

### 2.3 Notice types (UK1 to UK16 verified in part; labels per search summaries)

| Notice | Name | When | Why Kontor cares |
|---|---|---|---|
| UK1 | Pipeline notice | Annually, by authorities spending £100m+ a year; contracts of £2m+ planned in next 18 months | Forward view: Brindleford (spend about £192m) would publish one |
| UK2 | Preliminary market engagement | Before a procurement | Context |
| UK3 | Planned procurement | Optional, early | Context |
| UK4 | Tender notice | Competitive procedure launch | Context |
| UK5 | Transparency notice | Before a direct award | Direct award = risk flag |
| UK6 | Contract award notice | Before entering the contract | Award value, supplier |
| **UK7** | **Contract details notice** | **Within 30 days of signing (120 days for light touch)**; carries the contract, and for over £5m the redacted copy within **90 days** (180 for light touch) [S] | **The main source for contract value, dates, extension options, supplier** |
| UK8 | Contract payment information notice | Payments over £30,000 under a public contract [S] | A government-published payment feed: a possible Stage 2 cross-check |
| UK9 | Contract performance notice | At least annually for contracts over £5m; reports the 3 most material KPIs [S] | Service-credit context |
| UK10 | Contract change notice | **Before** modifying a contract (value, length); attach modified contract if over £5m; cannot be edited, publish a further notice to correct [S] | Explains a legitimate cap increase |
| UK11 | Contract termination notice | Within 30 days of a contract ending (completed, early, expired) [S] | Closes the register entry |
| UK12 | Procurement termination notice | When a procurement is abandoned [S] | |
| UK13 to UK16 | Dynamic market: intention, establishment, modification, cessation [S] | | Framework-like markets |
| (UK17) | The Act has 17 notices in total [S]; I could not confirm what UK17 is | | Do not cite |

[U] A six-monthly **payments compliance notice** (percentage of invoices paid within 30 days) also exists; verify the name and timing before quoting. The Act also implies a **30-day payment term** for undisputed invoices through the public sector chain [K]; pattern B in 3.8 mirrors that.

### 2.4 What an over-£5m contract looks like on Find a Tender

- A UK7 with value **including and excluding VAT**, a contract period such as "5 June 2025 to 31 March 2026" with "possible extension to 31 March 2027" and a free-text extension description [S].
- Redacted PDF of the contract attached (this is what Kontor would ingest: 60 to 120 pages).
- A UK9 each year with KPI results.
- Any change creates a UK10 with the modified contract.

### 2.5 Identifier formats (use these shapes; every value below is FICTIONAL)

| Item | Real-world shape (examples seen in search results [S]) | Fictional value to use |
|---|---|---|
| OCDS process id (`ocid`) | `ocds-h6vhtk-` + 6 hex chars (seen: `03f729` in 2023, `04a732` 2024, `068d4f` April 2026, `06c1bc` 2026) | `ocds-h6vhtk-0f9a31` (range `0f0000` to `0fffff` is not yet issued: real values are around `06xxxx` in 2026 [U]) |
| Find a Tender notice URL number | `NNNNNN-YYYY`, for example `014563-2025`, `012503-2026` | `900112-2026` (six-digit numbers starting `9` are not yet issued [U]) |
| Notice identifier | `YYYY/S 000-NNNNNN`, for example `2025/S 000-041778` | `2026/S 000-900112` |
| Contracts Finder notice id | UUID, for example `45a340d2-b58d-4a86-a0c1-47840128b486` | any random UUID |
| Contracts Finder OCDS prefix | `ocds-b5fd17-<uuid>` [K] | `ocds-b5fd17-3f0c8f1e-...` |
| Public Procurement Organisation Number (PPON) | an organisation identifier on the platform; shape about four groups of alphanumerics [U] | `PBRN-0192-ZQXK` |
| Council contract reference | council-specific | `BRN-0xx` in the seed (internal register id) and `CON/22/0147` as the council's own style |
| Purchase order | `PO` + 6 digits | `PO724192` |
| Transaction number | `T` + 6 digits | `T410129` |

Never link a fictional notice to the real `find-tender.service.gov.uk` host. In the UI, show a muted "Sample record" label and use a neutral demo host such as `demo.kontor.example/notice/900112-2026` (`.example` is reserved).

### 2.6 OCDS fields to mimic

Mapping from the nine financial questions to the OCDS-style field where Find a Tender carries it, and what must come from the PDF:

| Question | OCDS-style field (UK profile approximate [U]) | In the notice? | From the PDF clause |
|---|---|---|---|
| Contract value and cap | `contracts[].value.amount` / `awards[].value`; `tender.value` (estimated) ; max value including options | Yes (estimated or awarded) | **Maximum aggregate** and any "not to exceed" wording |
| Start and end dates | `contracts[].period.startDate`, `.endDate`, `.durationInDays`; `contracts[].period.maxExtentDate` | Yes | Service commencement vs signature date |
| Extension options | `tender.contractPeriod.maxExtentDate`, renewal description | Free text | Exact mechanism, notice, conditions |
| Notice period and auto-renewal | not structured | No | Clause |
| Price review and indexation | not structured | No | Clause and schedule |
| Payment terms | not structured | No | Clause |
| Rate card | not structured | No | Schedule |
| Service credits | KPIs are structured only as a count and text | Partly (UK9) | Schedule |
| Termination and exit | not structured | No | Clause |

Six of the nine questions are not in notices at all; that is the "clause-level provenance is the edge" point.

Sample UK7-style record (FICTIONAL; keys mimic OCDS 1.1.5; extra keys are marked `x_`):

```json
{
  "ocid": "ocds-h6vhtk-0f9a31",
  "id": "900112-2026",
  "date": "2026-07-03T09:15:00Z",
  "tag": ["contract"],
  "initiationType": "tender",
  "language": "en",
  "x_sample": "FICTIONAL RECORD FOR DEMONSTRATION. Not a real notice.",
  "x_noticeType": "UK7",
  "x_noticeTitle": "Contract Details Notice",
  "buyer": { "id": "PBRN-0192-ZQXK", "name": "Brindleford Borough Council" },
  "parties": [
    { "id": "PBRN-0192-ZQXK", "name": "Brindleford Borough Council", "roles": ["buyer"],
      "address": { "locality": "Brindleford", "countryName": "United Kingdom" } },
    { "id": "GB-COH-90661027", "name": "Argent Watch CCTV Solutions Limited", "roles": ["supplier"],
      "identifier": { "scheme": "GB-COH", "id": "90661027" },
      "details": { "scale": "sme" } }
  ],
  "tender": {
    "id": "BRN-RFT-2025-014",
    "title": "Security and CCTV monitoring service",
    "description": "Provision of public-space CCTV monitoring, alarm response and mobile patrol for Brindleford Borough Council.",
    "status": "complete",
    "mainProcurementCategory": "services",
    "procurementMethod": "open",
    "procurementMethodDetails": "Open procedure",
    "classification": { "scheme": "CPV", "id": "79711000", "description": "Alarm-monitoring services" },
    "value": { "amount": 5500000, "currency": "GBP", "x_vatIncluded": false },
    "contractPeriod": { "startDate": "2025-09-01T00:00:00Z", "endDate": "2028-08-31T23:59:59Z", "maxExtentDate": "2030-08-31T23:59:59Z" },
    "x_renewal": { "hasRenewal": true, "description": "One extension of up to two years at the Council's sole discretion on six months' notice." }
  },
  "awards": [{
    "id": "AWD-900112-2026", "date": "2025-07-14T00:00:00Z", "status": "active",
    "suppliers": [{ "id": "GB-COH-90661027", "name": "Argent Watch CCTV Solutions Limited" }],
    "value": { "amount": 3300000, "currency": "GBP" }
  }],
  "contracts": [{
    "id": "CON-900112-2026", "awardID": "AWD-900112-2026",
    "title": "Security and CCTV monitoring service",
    "status": "active", "dateSigned": "2025-08-18T00:00:00Z",
    "period": { "startDate": "2025-09-01T00:00:00Z", "endDate": "2028-08-31T23:59:59Z", "maxExtentDate": "2030-08-31T23:59:59Z" },
    "value": { "amount": 3300000, "currency": "GBP", "x_vatIncluded": false },
    "x_maximumValueIncludingExtensions": { "amount": 5500000, "currency": "GBP" },
    "x_kpis": [
      { "title": "Alarm acknowledgement within 60 seconds", "target": "98%" },
      { "title": "Incident report issued within 4 hours", "target": "95%" },
      { "title": "System availability", "target": "99.5%" }
    ],
    "documents": [
      { "id": "DOC-1", "documentType": "contractSigned", "title": "Contract (redacted)", "format": "application/pdf",
        "url": "https://demo.kontor.example/notice/900112-2026/contract.pdf", "datePublished": "2025-11-10T00:00:00Z",
        "x_pages": 94 }
    ]
  }]
}
```

### 2.7 Council contracts register (Transparency Code, over £5,000) as a second source

Councils that publish a contracts register give a CSV with: reference number, title, department, description, supplier name and details, sum to be paid over the contract or annual amount, irrecoverable VAT, start date, end date, review date, whether the contract was the result of a tender [K]. Seed each of the 26 `register-pdf` contracts with a register row that has **fewer** answers than the PDF (typically no cap, no extension notice) so that "Kontor reads the document" visibly adds information.

Example register row (FICTIONAL):

```
CON/22/0147,ICT managed service,Customer digital and ICT,"Managed service desk, infrastructure and networks","QUILLON DIGITAL SERVICES LIMITED, Company 90733158",3500000 pa,0,01/09/2022,31/08/2027,01/03/2027,Open tender
```

Notice that the register shows **3,500,000 a year at award** while the contract's cap clause (Q1 pattern B in 3.3) caps total spend at £17.5m: the register hides the over-run that the spend file reveals (£20.8m paid).

---


## 3. Contract terms and real-world clause language for the nine financial questions

All clause texts below are **synthetic paraphrases** written for this brief (not copied from any real contract). Use them as the seed text for the sample contract PDFs and as the `quote` field of extraction records.

### 3.1 Where terms sit in a typical council services contract

Typical structures: council bespoke terms drafted by Legal, the CCS Model Services Contract, NEC4 Term Service Contract or Engineering and Construction Contract for highways and housing works, JCT Measured Term Contract for repairs, framework call-off terms with a Call-Off Order Form [K].

Page map for a **90-page** contract (scale proportionally: for 60 pages multiply by 0.67, for 120 pages by 1.33):

| Part | Pages (90-pp doc) | What lives there |
|---|---|---|
| Cover, contents | 1 to 3 | |
| Form of Agreement and **Contract Particulars** (also called Key Provisions, Contract Data, Order Form) | **4 to 8** | Parties, Commencement Date, Initial Term, Extension, estimated Contract Value, notice addresses, sometimes headline payment terms |
| Definitions and interpretation | 9 to 18 | "Maximum Contract Value", "Indexation Date", "Service Credit", "Charges" |
| Core terms: **Term (cl. 2)**, Services (cl. 3 to 5) | 19 to 24 | Term, extension, notice, mobilisation |
| **Charges and payment** (cl. 6 to 8) | **25 to 31** | Cap or value clause (6.x, p. 25 to 26), price adjustment (7.x, p. 27 to 28), invoicing and payment (8.x, p. 29 to 31) |
| Performance, service levels, **service credits** (cl. 9 to 11) | 32 to 36 | |
| Liability, insurance, TUPE, data, audit (cl. 12 to 19) | 37 to 45 | |
| **Termination and exit** (cl. 20 to 23) | **46 to 52** | Break, convenience (22.x, p. 47 to 48), default, exit plan |
| General provisions (cl. 24 to 40): **variation (cl. 28)**, notices (cl. 38), governing law | 53 to 60 | Variation clause p. 55; notices p. 58 |
| Schedule 1 Specification | 61 to 72 | |
| Schedule 2 Service levels and KPIs | 73 to 79 | **Service credit tables** |
| **Schedule 3 Charges**: Part A pricing, Part B rate card, Part C indexation | **80 to 90** | Rate card, unit rates, indexation formula, 80% alert, cap restatement |
| Schedules 4 to 8 (payment mechanism, exit, TUPE, termination sum): only in the longer 120-page version | 91 to 120 | In a 120-page doc: Schedule 5 around p. 100, Schedule 7 Termination Sum around p. 112 |

Rule of thumb for the extractor demo: **cap in the Contract Particulars (p. 4 to 6) is "estimated"; cap in clause 6 or Schedule 3 is "maximum"**. When both exist they often disagree.

Where each question's evidence usually sits, by document length (page numbers scale roughly with length; the 90-page column is what the clause examples below use):

| Question | Where | 60-page doc | 90-page doc | 120-page doc |
|---|---|---|---|---|
| Q1 Value and cap | Contract Particulars; cl. 6; Schedule 3 (restated, 80% alert) | pp. 3 to 5, 17, 54 to 60 | pp. 4 to 8, 25 to 26, 80 to 90 | pp. 5 to 10, 33 to 35, 107 to 120 |
| Q2 Start and end dates | Contract Particulars; cl. 2.1 | pp. 3 to 5, 13 | pp. 4 to 8, 19 | pp. 5 to 10, 25 |
| Q3 Extension options | cl. 2.3; Contract Particulars; Schedule 3 | pp. 3 to 5, 13 to 14, 60 | pp. 4 to 8, 20, 90 | pp. 5 to 10, 27, 120 |
| Q4 Notice and auto-renewal | cl. 2.4; notices clause (cl. 38) | pp. 14, 39 | pp. 20, 58 | pp. 27, 77 |
| Q5 Price review and indexation | cl. 7; Schedule 3 Part C | pp. 18, 57 to 60 | pp. 27 to 28, 86 to 90 | pp. 36 to 37, 115 to 120 |
| Q6 Payment terms | cl. 8 (sometimes Contract Particulars) | pp. 19 to 21 | pp. 29 to 31 | pp. 39 to 41 |
| Q7 Rate card | Schedule 3 Part A or B (sometimes an appendix) | pp. 54 to 58 | pp. 81 to 86 | pp. 108 to 115 |
| Q8 Service credits | cl. 11; Schedule 2 | pp. 23, 49 to 53 | pp. 34, 77 to 79 | pp. 45, 103 to 106 |
| Q9 Termination and exit fees | cl. 20 to 23; termination sum schedule | pp. 31 to 35, 70 | pp. 46 to 52, (112 in 120-page version) | pp. 61 to 69, 112 |

### 3.2 Extraction record (provenance-first)

Every answer, and every flag, carries a record like this (the "link to clause and page" requirement):

```json
{
  "questionId": "value_and_cap",
  "contractId": "BRN-013",
  "answer": "Maximum aggregate £4,800,000 excluding VAT over the Initial Term",
  "normalised": { "capAmount": 4800000, "capType": "maximum", "vat": "excluded", "scope": "initial term", "alertThresholdPct": 80 },
  "clauseRef": "Clause 6.3",
  "page": 25,
  "quote": "The aggregate Charges payable by the Council under this Contract (including any Call-Off Orders and Variations) shall not exceed £4,800,000 (the 'Maximum Contract Value') during the Initial Term unless the Council has agreed an increase in writing in accordance with Clause 28.",
  "alsoSeen": [{ "clauseRef": "Contract Particulars, item 7", "page": 5, "text": "Estimated Contract Value £4,800,000" }],
  "confidence": "high",
  "extractedBy": "kontor-financial-q1@prototype",
  "needsHumanCheck": false
}
```

`confidence` guidance: **high** when the clause is explicit and unambiguous; **medium** when two clauses disagree or a value is "estimated"; **low** when inferred from a schedule table or when the extension was exercised by a side letter.

### 3.3 Q1. Contract value and cap

Fields: `capAmount`, `capType` (`maximum` | `estimated` | `fixed` | `none`), `scope` (initial term | whole term incl. options | per call-off), `vat` (included | excluded), `alertThresholdPct`.

**Clause A (Contract Particulars, item 7, page 5):**
> "Estimated Contract Value: £24,500,000 (excluding VAT) over the Initial Term. This figure is provided for budgeting purposes only and does not oblige the Council to purchase any minimum volume of Services."

(`capType` = `estimated`; "does not oblige" is the tell.)

**Clause B (Clause 6.3, page 25, and Schedule 3 para 9.2, page 89):**
> "6.3 The aggregate Charges payable by the Council under this Contract (including any Call-Off Orders and Variations) shall not exceed £17,500,000 (the 'Maximum Contract Value') during the Initial Term unless the Council has agreed an increase in writing in accordance with Clause 28 (Variation) and its Contract Procedure Rules. The Supplier shall not be obliged to perform Services which would cause the Maximum Contract Value to be exceeded."
>
> "Schedule 3, para 9.2: The Supplier shall notify the Council in writing when cumulative Charges reach eighty per cent (80%) of the Maximum Contract Value."

Variants to expect: "not to exceed", "contract ceiling", "aggregate contract sum", "Contract Sum", "total value shall not exceed", "framework estimated value is not guaranteed", "annual minimum commitment of £x" (guaranteed floor, rare in councils), "estimated annual spend £x" (non-binding).
Pitfalls: **cap vs estimate**; per **call-off** cap vs **framework** total; cap stated **including** extensions in one place and for **initial term** only in another; "excluding VAT" often stated only once.

### 3.4 Q2. Start and end dates

Fields: `signatureDate`, `commencementDate`, `serviceStartDate`, `initialTermMonths`, `initialEndDate`, `currentEndDate`.

**Clause A (Clause 2.1, page 19):**
> "This Contract shall commence on 1 October 2022 (the 'Commencement Date') and, unless terminated earlier in accordance with its terms or extended under Clause 2.3, shall continue for five (5) years (the 'Initial Term')."

**Clause B (Contract Particulars, item 4, page 4):**
> "Date of Agreement: 14 September 2022. Commencement Date: the date of last signature. Service Commencement Date: 1 October 2022, following a mobilisation period of twelve (12) weeks. Expiry Date: the day before the fifth anniversary of the Service Commencement Date."

Pitfalls: **signature date is not the start**; "five years from the Service Commencement Date" means the end date is **computed** (30 September 2027, not 1 October 2027). Check leap years. Mobilisation periods mean spend can start before the Service Commencement Date.

### 3.5 Q3. Extension options

Fields: `optionStructure` (for example "2+1+1"), `maxTermYears`, `whoDecides` (Council sole discretion | mutual | supplier consent), `noticeMonths`, `conditions`, `exercised`.

**Clause A (Clause 2.3, page 20):**
> "The Council may, at its sole discretion, extend the Term by up to two (2) consecutive periods of twelve (12) months each (each an 'Extension Period') by giving the Supplier not less than six (6) months' written notice before the expiry of the Initial Term or the then current Extension Period."

**Clause B (Contract Particulars, item 5 and Schedule 3, para 14, pages 5 and 90):**
> "Extension: 2 + 1 + 1 years (maximum Term eight (8) years). The Council's right to extend is subject to (a) the Supplier having incurred no more than two (2) Priority 1 KPI Failures in the preceding twelve (12) months and (b) the Council's Contract Procedure Rules. Each Extension Period shall be on the terms of this Contract save that the Charges shall be reviewed in accordance with Schedule 3 Part C."

Variants: "up to 3 x 1 year", "at the Council's option", "by mutual agreement" (not an option; a negotiation), "extension subject to Supplier's consent". Pitfalls: **whether extensions are already exercised** (side letters, delegated decision records), conditions precedent, the notice period for **extension** differs from the notice for **termination**.

### 3.6 Q4. Notice period and auto-renewal

Fields: `notice` (to extend, to terminate, to prevent renewal), `autoRenews`, `renewalPeriodMonths`, `noticeServiceRules`.

**Clause A (Clause 2.4, page 20; typical of software, telecoms, licences):**
> "Unless terminated earlier, this Agreement shall automatically renew for successive periods of twelve (12) months (each a 'Renewal Period') unless either party gives the other not less than ninety (90) days' written notice before the end of the then current period that it does not wish to renew."

**Clause B (Clause 38.2, page 58; the service rules that make a deadline real):**
> "Any notice under this Contract shall be in writing and delivered by hand or sent by first class post or recorded delivery to the address set out in the Contract Particulars. Notice sent by email shall not be valid service. A notice sent by post is deemed received on the second Business Day after posting."

Pitfalls: radar deadline = end date minus notice, **moved back** for postal service (allow 3 working days) and for non-business days. The 90-day notice in a 12-month renewal means an annual deadline (the "we didn't know that" moment). Auto-renewal in a councils' own long-form services contract is rare; common in software, licences, telecoms, hosting, leases.

### 3.7 Q5. Price review and indexation

Fields: `index` (CPI | CPIH | RPI | NJC pay award | BCIS | NHPI | none), `basis` (annual rate for a reference month), `cap`, `floor`, `reviewDate`, `firstReview`, `labourSplit`, `automatic` (yes if uplift applies without a request).

**Clause A (Clause 7.1 to 7.3, page 27):**
> "7.1 On each 1 April (each an 'Indexation Date') the Charges (excluding pass-through costs) shall be adjusted by the percentage change in the Consumer Prices Index (CPI), all items annual rate, published by the Office for National Statistics for the preceding September. 7.2 No adjustment shall exceed three per cent (3%) or be less than zero. 7.3 The Supplier shall submit its calculation not less than sixty (60) days before each Indexation Date; any adjustment not so requested shall not take effect before the next Indexation Date."

**Clause B (Schedule 3, Part C, para 5, page 86; labour-heavy contracts):**
> "5.1 The labour element of the Charges (agreed to be seventy per cent (70%)) shall be uplifted on 1 April by the percentage increase in the NJC for Local Government Services pay award applicable to Grade 3 (SCP 6). 5.2 The non-labour element (thirty per cent (30%)) shall be uplifted by CPIH, capped at two and a half per cent (2.5%). 5.3 No uplift shall apply in the first twelve (12) months."

Variants: "CPI capped at 3%", "CPI+1%", "lower of CPI and 3%", "RPI" (older PFI), "NEC4 Option X1 price adjustment factor" (highways, housing), "Schedule of Rates uplifted by BCIS", "Waste Index: 50% labour (AWE), 20% DERV, 30% CPI", "National Living Wage pass-through" (change in law), "fixed for 24 months then CPI". Pitfalls: **the cap applies to the Charges, not to volumes**; **pass-through excluded**; the uplift may be **requested by the Supplier** (clause A) so a payment rise with no request is a flag; **NLW pass-through clauses legitimately breach a CPI cap** (see the facilities management example in 4.4).

Reference values for sample data **[S]** (search summaries): ONS **CPI 3.1%** and **CPIH 3.3%** for the 12 months to **August 2026** (CPI was 2.9% in July 2026); NJC pay award **3.3% from 1 April 2026** (2026/27) and **3.2% from 1 April 2025** (2025/26); **National Living Wage £12.71 from April 2026** (+4.1%); Real Living Wage **£13.45** (outside London) from 2026. Reference-month rates for the 1 April 2026 review (September 2025 CPI) are not verified [U]; use "CPI (September)" and set the allowed uplift to the cap.

### 3.8 Q6. Payment terms

Fields: `paymentDays`, `from` (valid invoice | receipt | month end), `invoiceRequirements` (PO number quoted), `latePaymentInterest`, `disputeMechanism`.

**Clause A (Clause 8.2, page 29):**
> "The Council shall pay each valid and undisputed invoice within thirty (30) days of receipt. An invoice is valid only if it quotes the Council's purchase order number, is addressed to the Contract Manager named in the Contract Particulars, and itemises the Charges by Service. Where part of an invoice is disputed the Council shall pay the undisputed part and notify the Supplier of the dispute within ten (10) Business Days."

**Clause B (Clause 8.6, page 30):**
> "The Supplier shall include in each Sub-contract a term requiring payment of valid and undisputed invoices within thirty (30) days. Interest on late payment shall accrue in accordance with the Late Payment of Commercial Debts (Interest) Act 1998."

Variants: "within 30 days of the date of the invoice", "within 30 days of the end of the month of receipt", "payment by BACS", "payment within 10 days for SMEs (council prompt-payment pledge)", "milestone payments", "quarterly in advance" (software licences). Pitfalls: **days from receipt vs date of invoice**; PO number on the invoice as a validity condition (links to the 39% PO coverage stat in 1.5).

### 3.9 Q7. Rate card

Fields: `rateType` (day rate by grade | hourly | unit per tonne/household/collection | schedule of rates), `rows[]` (label, unit, rate), `fixedUntil`, `expensesIncluded`.

**Clause A (Schedule 3, Part B, Table 2, pages 82 to 84; consultancy and professional services):**
> "Day rates (excluding VAT), inclusive of travel and subsistence within England, fixed for the first 24 months: Partner / Director £1,150; Associate Director £925; Senior Consultant £740; Consultant £560; Analyst £390. A day is 7.5 working hours."

**Clause B (Schedule 3, Part A, Table 1, page 81; waste and street services):**
> "Annual price per property (2022 prices): residual waste collection £38.42; dry recycling collection £21.77; garden waste (per bin, per lift) £1.18; bulky waste (per collection) £16.50; street sweeping (per kilometre of channel) £14.10. Prices change on property count by more than 1.5% in accordance with para 6."

Also for care: "hourly rate weekday £24.20, weekend £28.50, bank holiday £36.30; travel time not paid" (rates by fee decision, not by index).
Pitfalls: rates **quoted per year and index-adjusted since**; "inclusive of expenses" vs extra; rates in an **appendix PDF** rather than the Schedule; blended rates; units in different tables.

### 3.10 Q8. Service credits

Fields: `trigger` (KPI, threshold), `creditRate`, `monthlyCap`, `exclusiveRemedy`, `persistentBreach`, `howApplied` (credit note, deduction from next invoice).

**Clause A (Schedule 2, para 6, pages 77 to 79; typical IT and FM):**
> "6.1 Service Credits shall accrue at 2% of the Monthly Charge for each Priority 1 KPI Failure and 1% of the Monthly Charge for each Priority 2 KPI Failure. 6.2 The total Service Credits in any month shall not exceed ten per cent (10%) of the Monthly Charge. 6.3 Service Credits are a price adjustment and not an exclusive remedy; the Council may also terminate under Clause 22.4 if three (3) Priority 1 KPI Failures occur in any rolling six (6) month period."

**Clause B (Clause 11.4, page 34; typical of waste and street services):**
> "If the Supplier achieves less than 95% on KPI 3 (missed collections per 100,000 collections) in any Month, a deduction of £500 per 0.1% below the Target shall apply, up to a maximum of £25,000 per Month, deducted from the next invoice."

Pitfalls: service credits show up in spend files as **small negative lines** (credit note) or reduced invoices; credits are often **capped as a % of monthly charge** and **not applied in practice** (the spec lists unclaimed service credits as "not yet": needs KPI data).

### 3.11 Q9. Termination rights and exit fees

Fields: `convenience` (yes/no, noticeMonths), `breakDates[]`, `compensation` (none | unamortised investment | fixed sum | schedule), `defaultTermination`, `exitPlan`, `tupe`.

**Clause A (Clause 22.2, page 48, and Schedule 7, page 112 in the 120-page version):**
> "22.2 The Council may terminate this Agreement at any time without cause by giving the Supplier not less than six (6) months' written notice. If the Council terminates under this Clause the Council shall pay the Supplier the Termination Sum set out in Schedule 7 (being the unamortised balance of the Supplier's capital investment on the Agreed Depreciation Schedule) and reasonable, evidenced redundancy costs for employees transferring under TUPE, but shall not be liable for loss of profit."

**Clause B (Clause 22.1, page 47, and Schedule 5, para 3, page 100 in the 120-page version):**
> "22.1 The Council may terminate this Agreement with effect from 31 March 2029 (the 'Break Date') by giving the Supplier not less than eighteen (18) months' written notice. No compensation is payable on termination at the Break Date other than the Termination Sum for that date set out in Schedule 7."

Exit management: "The Supplier shall deliver an Exit Plan within three (3) months of the Commencement Date and shall, in the final eighteen (18) months, provide the TUPE employee liability information and asset register at no charge." Pitfalls: break dates are **fixed calendar dates** (build a deadline from "18 months before 31 March 2029" = 30 September 2027); fee formula in a schedule not in the clause; "termination for convenience" absent in many outsourcing contracts.

### 3.12 Short list of "tells" the extractor demo can highlight

| Tell | Seen in | Consequence |
|---|---|---|
| "for budgeting purposes only" | Contract Particulars | cap is `estimated` |
| "shall not exceed ... unless the Council has agreed in writing" | Clause 6.x | cap is `maximum` |
| "not less than six (6) months' written notice" | Clause 2.x or 22.x | radar deadline |
| "sole discretion" | Extension | Council controls; supplier cannot refuse |
| "automatically renew" | Software, telecoms | deadline every year |
| "shall not be valid service" (email) | Notices | postal deadline |
| "capped at" or "shall not exceed three per cent" | Indexation | uplift check |
| "pass-through" | Charges | exclude from cap check |
| "Service Credits ... not an exclusive remedy" | Schedule 2 | combine with termination right |

---


## 4. Council service categories and a contract portfolio that makes a rich demo

### 4.1 The fictional council in numbers

Brindleford Borough Council: fictional **unitary borough**, about 284,000 residents, retains council housing stock (a housing revenue account), so it has adult social care, children's services, housing repairs, waste, highways and leisure under one roof. Third-party spend about **£192m a year** (my planning figure; plausible for a unitary of this size [K]).

| Spend area | Approx. third-party spend (£m a year) | Share |
|---|---|---|
| Adult social care and health (incl. public health) | 60 | 31% |
| Children's services and education (placements, school transport) | 38 | 20% |
| Housing (repairs, planned works, compliance, temporary accommodation) | 32 | 17% |
| Environment and neighbourhoods (waste, street scene, grounds, CCTV) | 24 | 12% |
| Highways and transport (excluding school transport) | 14 | 7% |
| Corporate (ICT, FM, legal, insurance, energy, finance systems, agency) | 24 | 13% |
| **Total** | **192** | 100% |

Seed portfolio coverage: the 31 register contracts run at **£118.5m a year** (62% of third-party spend); the 6 suppliers with no contract take **£20.5m** in the last 12 months (11%); the rest (about £53m, 27%) is the long tail of small suppliers, grants and redacted payments. Edinburgh's audit found £91m of £134m non-contracted spend went to the top 100 suppliers (spec); the seed's 11% is deliberately milder.

### 4.2 Thirty contract archetypes (annual values are my planning estimates for a council of this size [K]; term and indexation are typical patterns [K])

"> £5m" asks: is the **whole-term value including options** likely to exceed £5m (the Find a Tender contract-copy test, 2.4)?

| # | Archetype | Typical form | Annual £ | Term | Indexation and typical cap | > £5m? | Seed |
|---|---|---|---|---|---|---|---|
| 1 | Waste collection and recycling | Single outsourced contract | 9m to 14m | 8 + 4 + 4 (or 7 + 7) | Waste index (labour/fuel/CPI basket), cap 4 to 5%, annual | Yes | BRN-001 |
| 2 | Street cleansing | Outsourced | 3m to 6m | 5 + 1 + 1, or 7 | NJC pay award on labour, CPI cap 3 to 4% | Yes | BRN-002 |
| 3 | Grounds maintenance and parks | Outsourced | 1.5m to 4m | 5 + 2 | CPI cap 3% | Yes | BRN-003 |
| 4 | Highways maintenance term contract | NEC4 TSC/ECC | 8m to 20m | 7 + 3 | NEC4 X1 price adjustment factor (highways index), no cap | Yes | BRN-004 |
| 5 | Street lighting (PFI-style or LED programme) | Long concession | 2m to 5m | 10 to 25 | CPI (or RPI in older PFI) on unitary charge, cap about 3% | Yes | BRN-005 |
| 6 | Leisure centre management | Management contract, often a trust | net fee 0 to 2m (gross turnover 5 to 10m) | 10 to 15, break at year 7 or 8 | CPI on fee, utilities risk share | Often | BRN-006 |
| 7 | ICT managed service | Outsourced | 3m to 8m | 5 + 2 | CPI cap 3% | Yes | BRN-007 |
| 8 | ERP finance and HR licences and support | Licence and support | 0.5m to 1.5m | 5 + 1 + 1 | CPI cap 3 to 5% | Yes (full term) | BRN-008 |
| 9 | Revenues and benefits outsourcing | Outsourced | 1.5m to 3m | 5 + 2 | CPI cap 3% | Yes | BRN-009 |
| 10 | Agency workforce managed service | Neutral vendor | 8m to 25m pass-through; fee 1 to 3% | 4 + 1 + 1 | Pass-through rates, fee fixed % | Yes | BRN-010 |
| 11 | Housing responsive repairs and voids | Partnering or measured term | 6m to 15m | 5 + 2 + 2 | Schedule of rates uplifted by BCIS or CPI, cap 3 to 4% | Yes | BRN-011 |
| 12 | Housing planned works | Programme contract | 4m to 10m | 4 + 2 | BCIS tender price index | Yes | BRN-012 |
| 13 | Housing compliance testing (gas, electrical, fire, legionella) | Term contract | 1.5m to 4m | 3 + 1 + 1 | CPI cap 3% | Often | BRN-013 |
| 14 | Home care framework call-offs | Spot and call-off | 15m to 30m (many providers) | Framework 5 to 8 | Fee uplift set by the council annually (fair cost of care) | Yes | BRN-014 |
| 15 | Residential and nursing placements | Spot plus block | 30m to 60m (block 2m to 5m) | Block 5 to 10 | Fee uplift by decision; no formal index | Yes | BRN-016 |
| 16 | Children's residential and fostering placements | Spot, individual placement agreements | 15m to 30m | Per placement | None; regional rate caps in some areas | n/a (spend-only) | S33 |
| 17 | Supported living | Block or framework | 6m to 15m | 5 + 2 | CPI or NJC pass-through | Yes | BRN-015 |
| 18 | Temporary accommodation | Nightly paid and leases | 4m to 12m | Nightly; leases 3 to 5 | Rate caps (London IBAA); no index | n/a (spend-only) | S32 |
| 19 | School and SEN transport | Dynamic purchasing system call-offs | 5m to 14m | DPS 4 to 5 | CPI cap 3 to 3.5%, fuel | Yes | BRN-018 |
| 20 | Facilities management (hard and soft) | Outsourced | 3m to 7m | 5 + 2 | CPIH cap 2.5 to 3%, NLW pass-through | Yes | BRN-019 |
| 21 | Building cleaning | Outsourced | 1m to 2.5m | 3 + 2 or 5 | NLW-linked labour uplift | Often | BRN-020 |
| 22 | Security and CCTV monitoring | Outsourced | 0.8m to 1.8m | 3 + 2 | CPI or NLW | Often | BRN-021 |
| 23 | Parking enforcement and PCN processing | Outsourced | 1m to 3m | 5 + 2 | CPI cap 3% | Yes | BRN-022 |
| 24 | Legal services panel | Panel with rate card | 1m to 3m | 4 | Rate card fixed 2 years then CPI | Often | BRN-023 |
| 25 | Energy supply (electricity and gas) | Flexible purchasing framework call-off | 4m to 9m | 2 to 4 | Pass-through of wholesale and non-commodity costs | Yes | BRN-024 |
| 26 | Insurance (property, liability, motor) | Long-term agreement | premiums 2m to 4m | 3 to 5 | Fixed premium then renegotiated | Yes | BRN-025 |
| 27 | Fleet leasing and maintenance | Lease plus service | 1.5m to 4m | 3 to 6 | Lease fixed; maintenance CPI capped | Often | BRN-026 |
| 28 | Telecoms and WAN | Network contract | 0.8m to 2m | 5 (auto-renews) | RPI on call charges only | Often | BRN-027 |
| 29 | Library management system | Software, auto-renewing | 0.1m to 0.3m | 5 + annual auto-renew | CPI cap 5% | No | BRN-028 |
| 30 | Adult social care case management system | Software | 0.6m to 1.2m | 5 + 2 | CPI cap 4% | Yes (full term) | BRN-029 |

Also in the seed: drug and alcohol treatment (public health, BRN-017), design and project management consultancy framework call-off with a day-rate card (BRN-030), planning software (BRN-031), and spend-only suppliers for security guarding, cloud hosting, printing and coach hire (4.6). Others to add if you need to pad the long tail: printing and mailing, school meals, grants to voluntary organisations, pest control, mortuary services, banking and cash collection [K].

### 4.3 How to read the seed portfolio (31 contracts, engineered for the demo)

Source: `portfolio.mjs` (as-of 2026-10-06; spend to 31 Aug 2026). `Key date` is the date the council must act (notice, option, break) or, if none, the contract end. `Bucket` is days from 6 Oct 2026: **3m** up to 92 days, **6m** up to 183, **12m** up to 366, **overdue** key date has passed. `Cap type`: `maximum` (hard), `estimated` (non-binding), `fixed` (fixed-price total). `Run-rate pa` is a design target; the generated spend rows are the truth (within about 15% of run-rate for ramped contracts).



### 4.4 What the seed delivers against the requested distribution

| Requested | Delivered | Contracts |
|---|---|---|
| About 4 clearly **over cap** | **4** | BRN-013 compliance testing **148%** (£7.1m paid vs £4.8m maximum); BRN-010 agency managed service **122%** (£39.0m vs £32.0m); BRN-007 ICT managed service **119%** (£20.8m vs £17.5m); BRN-030 consultancy call-off **112%** (£5.6m vs £5.0m). Exposure **£13.2m** |
| About 3 **near cap** (85 to 100%) | **3** | BRN-003 grounds **97%** (projected to breach in **Oct 2026** at run-rate); BRN-028 library system **92%** (breach Jan 2027, after the auto-renewal deadline of 31 Oct 2026); BRN-022 parking enforcement **88%** (breach about May 2027) |
| About 8 **entering notice windows** in 3/6/12 months | **10** | **3 months** (key date up to 6 Jan 2027): BRN-028 (31 Oct 2026, 25 days), BRN-022 (30 Nov 2026), BRN-010 (31 Dec 2026). **6 months** (to 7 Apr 2027): BRN-002 (31 Jan 2027), BRN-007 (28 Feb 2027), BRN-004 (31 Mar 2027). **12 months** (to 7 Oct 2027): BRN-011 (30 Jun 2027), BRN-003 (31 Jul 2027), BRN-006 (30 Sep 2027 break notice), BRN-013 (30 Sep 2027 end). Plus **1 overdue** (BRN-012, deadline passed 30 Sep 2026, six days ago) and **1 expired but still being paid** (BRN-009, ended 31 Mar 2026, **5 payments totalling about £1.0m since**) |
| About 3 **indexation issues** | **3** | BRN-002 street cleansing (cap 3.0%, payments stepped **+6.2%** from 1 Apr 2026; about £58k excess already paid, £139k a year); BRN-018 school transport (cap 3.5%, **+8.9%** from 1 Sep 2025; £211k excess paid, but two new SEN routes may explain part: **low confidence**); BRN-019 facilities management (CPIH cap 2.5%, **+5.1%** from 1 Apr 2026; £48k excess paid; **NLW pass-through clause 7.4(c) may explain part**: **low confidence**) |
| A handful of **clean** contracts | 16 clean (no flag) | BRN-001, 005, 008, 014, 015, 016, 017, 020, 021, 023, 024, 025, 026, 027, 029, 031. If the build wants a leaner register, drop 016, 021, 025, 026, 027 (26 contracts) |
| **4 to 6** high-value suppliers in spend with no contract | **6** | 4.6 |

Radar value attached (annual run-rate): **3 months £13.2m; 6 months £24.8m; 12 months £14.2m; total inside 12 months £52.2m (27% of third-party spend)**; overdue and expired another £8.6m. A second figure per row, **extension value** = run-rate x maximum extension years (for example BRN-007: £6.0m x 2 = £12.0m), is more persuasive on a renewal radar than the annual figure.

The numbers in the dates and totals follow from `portfolio.mjs` and the generated spend with seed `20261006`; re-running the generator with another seed changes crossing dates (below) by days but not percentages.

### 4.5 Full seed table

(Generated from `portfolio.mjs`; `-` in "Projected breach" means no breach projected before the contract ends; `exceeded` means over cap now.)


| ID | Service | Supplier (id) | Start | End (current) | Key date and rule | Bucket | Cap type | Cap | Spend to 31 Aug 2026 | % of cap | Projected breach | Run-rate pa | Index and cap | Source | Scenario |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BRN-001 | Waste collection and recycling | FERROWICK ENVIRONMENTAL SERVICES (S01) | 2021-04-01 | 2029-03-31 | 2028-03-31 (notice: 12 months before end) | later | estimated | £93.0m | £64.8m | 70% | - | £12.8m | Waste Index (50% labour AWE, 20% DERV, 30% CPI) cap 4.5% | register-pdf | clean |
| BRN-002 | Street cleansing | TALLOWMERE STREET CLEANSING (S02) | 2022-08-01 | 2027-07-31 | 2027-01-31 (notice: 6 months before end) | 6m | estimated | £20.5m | £17.1m | 83% | 2027-05 | £4.6m | NJC pay award on labour element (70%) + CPI on rest (30%) cap 3% | register-pdf | indexation, notice-6m |
| BRN-003 | Grounds maintenance and parks | BRAMBLEWICK GROUNDS (S03) | 2023-02-01 | 2028-01-31 | 2027-07-31 (notice: 6 months before end) | 12m | maximum | £8.8m | £8.5m | 97% | 2026-10 | £2.5m | CPI (September) capped cap 3% | register-pdf | near-cap, notice-12m |
| BRN-004 | Highways maintenance term contract | PENNANT RIDGE HIGHWAYS (S04) | 2021-04-01 | 2028-03-31 | 2027-03-31 (notice: 12 months before end) | 6m | estimated | £98.0m | £69.9m | 71% | - | £14.2m | NEC4 Option X1 price adjustment factor (highways maintenance index) | register-pdf | notice-6m |
| BRN-005 | Street lighting maintenance and LED replacement | GREYWELL HIGHWAYS LIGHTING (S05) | 2021-10-01 | 2031-09-30 | 2031-09-30 (expiry: end date) | later | fixed | £23.5m | £11.0m | 47% | - | £2.3m | CPI on unitary charge, annual cap 3% | register-pdf | clean |
| BRN-006 | Leisure centre management | MERIDEW LEISURE TRUST (S06) | 2021-04-01 | 2031-03-31 | 2027-09-30 (break: 18 months before break date 31 Mar 2029) | 12m | estimated | £9.6m | £5.6m | 58% | - | £980k | Management fee fixed; utilities risk share; CPI on fee cap 3% | register-pdf | notice-12m |
| BRN-007 | ICT managed service | QUILLON DIGITAL SERVICES (S07) | 2022-09-01 | 2027-08-31 | 2027-02-28 (notice: 6 months before end) | 6m | maximum | £17.5m | £20.8m | 119% | exceeded | £6.0m | CPI, Schedule 3 cap 3% | register-pdf | over-cap, notice-6m |
| BRN-008 | ERP finance and HR system | COBALTINE SOFTWARE (S08) | 2023-10-01 | 2028-09-30 | 2028-03-31 (notice: 6 months before end) | later | maximum | £4.9m | £2.8m | 56% | - | £950k | CPI cap 5% | register-pdf | clean |
| BRN-009 | Revenues and benefits outsourcing | DELLACOURT REVENUES & BENEFITS SERVICES (S09) | 2021-04-01 | 2026-03-31 | 2026-03-31 (expiry: contract expired; payments continue) | overdue | maximum | £16.0m | £13.0m | 81% | 2027-12 | £2.5m | CPI cap 3% | register-pdf | expired |
| BRN-010 | Agency workforce managed service | PELLAM RECRUITMENT GROUP (S10) | 2023-04-01 | 2027-03-31 | 2026-12-31 (notice: 3 months before end) | 3m | maximum | £32.0m | £39.0m | 122% | exceeded | £11.4m | Pass-through rates; management fee fixed at 1.9% | register-pdf | over-cap, notice-3m |
| BRN-011 | Housing responsive repairs and voids | HARTSOP PROPERTY SERVICES (S11) | 2023-07-01 | 2028-06-30 | 2027-06-30 (notice: 12 months before end) | 12m | estimated | £37.5m | £24.2m | 65% | - | £8.2m | Schedule of rates uplifted by BCIS-linked index cap 4% | register-pdf | notice-12m |
| BRN-012 | Housing planned works (kitchens, bathrooms, roofs) | CORBEL BUILDING CONTRACTORS (S12) | 2023-04-01 | 2027-03-31 | 2026-09-30 (notice: 6 months before end (deadline passed)) | overdue | estimated | £26.0m | £21.0m | 81% | 2027-07 | £6.1m | BCIS all-in tender price index cap 4% | register-pdf | overdue |
| BRN-013 | Housing compliance testing (gas, electrical, fire, legionella) | WRENFIELD BUILDING SERVICES (S13) | 2023-10-01 | 2027-09-30 | 2027-09-30 (expiry: end date) | 12m | maximum | £4.8m | £7.1m | 148% | exceeded | £2.5m | CPI cap 3% | register-pdf | over-cap, notice-12m |
| BRN-014 | Home care (framework call-off, Lot 2) | WENDLEBURY HOMECARE (S14) | 2023-10-01 | 2028-09-30 | 2028-09-30 (expiry: end date) | later | estimated | £14.0m | £7.9m | 56% | - | £3.0m | Hourly rate uplift per Council fee decision | register-pdf | clean |
| BRN-015 | Supported living (block contract) | THISTLEBANK CARE PARTNERSHIP LLP (S15) | 2023-10-01 | 2028-09-30 | 2028-03-31 (notice: 6 months before end) | later | fixed | £17.0m | £10.1m | 59% | - | £3.5m | CPI cap 3% | register-pdf | clean |
| BRN-016 | Residential and nursing block beds | HOLLOWMERE CARE HOMES (S16) | 2022-10-01 | 2029-09-30 | 2029-09-30 (expiry: end date) | later | fixed | £16.8m | £9.5m | 57% | - | £2.5m | Fixed weekly bed rate; fee uplift per Council decision | register-pdf | clean |
| BRN-017 | Drug and alcohol treatment service | MARROWFIELD RECOVERY SERVICES CIC (S17) | 2025-04-01 | 2030-03-31 | 2029-09-30 (notice: 6 months before end) | later | fixed | £23.0m | £6.5m | 28% | - | £4.6m | Fixed; NJC pay award pass-through agreed annually | find-a-tender | clean |
| BRN-018 | School and SEN transport (DPS call-offs) | SALTWHISTLE PASSENGER TRANSPORT (S18) | 2023-09-01 | 2028-08-31 | 2028-08-31 (expiry: end date) | later | estimated | £19.5m | £12.9m | 66% | - | £4.5m | CPI capped; per-route rates cap 3.5% | register-pdf | indexation |
| BRN-019 | Facilities management (hard and soft) | OSTLEMOOR FACILITIES MANAGEMENT (S19) | 2023-10-01 | 2028-09-30 | 2028-03-31 (notice: 6 months before end) | later | estimated | £21.0m | £12.9m | 61% | - | £4.7m | CPIH cap 2.5% | register-pdf | indexation |
| BRN-020 | Building cleaning | BRIGHTHOLM CLEANING SERVICES (S20) | 2025-04-01 | 2030-03-31 | 2030-03-31 (expiry: end date) | later | estimated | £6.5m | £1.9m | 30% | - | £1.4m | NLW-linked labour uplift cap 4.5% | find-a-tender | clean |
| BRN-021 | Security and CCTV monitoring | ARGENT WATCH CCTV SOLUTIONS (S21) | 2025-09-01 | 2028-08-31 | 2028-02-29 (notice: 6 months before end) | later | estimated | £5.5m | £1.1m | 21% | - | £1.1m | CPI cap 3% | find-a-tender | clean |
| BRN-022 | Parking enforcement and PCN processing | STANNOCK PARKING ENFORCEMENT (S22) | 2022-06-01 | 2027-05-31 | 2026-11-30 (notice: 6 months before end) | 3m | maximum | £8.0m | £7.0m | 88% | 2027-05 | £1.7m | CPI cap 3% | register-pdf | near-cap, notice-3m |
| BRN-023 | Legal services panel | ALDOUS VENN LLP (S23) | 2024-04-01 | 2028-03-31 | 2028-03-31 (expiry: end date) | later | estimated | £5.6m | £3.5m | 63% | - | £1.4m | Hourly rate card fixed for 2 years then CPI cap 3% | register-pdf | clean |
| BRN-024 | Energy supply (electricity and gas) | VOLTA FEN ENERGY SUPPLY (S24) | 2025-10-01 | 2029-09-30 | 2029-09-30 (expiry: end date) | later | estimated | £21.6m | £4.6m | 21% | - | £5.0m | Pass-through of wholesale and non-commodity costs | find-a-tender | clean |
| BRN-025 | Insurance (property, liability, motor) long-term agreement | HALBERD MUNICIPAL INSURANCE COMPANY (S25) | 2025-10-01 | 2030-09-30 | 2030-09-30 (expiry: end date) | later | fixed | £14.5m | £2.7m | 19% | - | £2.9m | Premium fixed for 3 years then renegotiated | find-a-tender | clean |
| BRN-026 | Fleet leasing and maintenance | LANTERNWICK FLEET LEASING (S26) | 2023-01-01 | 2028-12-31 | 2028-12-31 (expiry: end date) | later | estimated | £14.4m | £8.8m | 61% | - | £2.5m | Lease rates fixed per vehicle; maintenance CPI capped cap 3% | register-pdf | clean |
| BRN-027 | Telecoms and WAN | KELMARSH TELECOM (S27) | 2024-04-01 | 2029-03-31 | 2028-12-31 (auto: 90 days before end) | later | fixed | £6.0m | £3.1m | 52% | - | £1.2m | RPI on call charges only cap 3% | register-pdf | clean |
| BRN-028 | Library management system | LECTERN LIBRARY SYSTEMS (S28) | 2022-02-01 | 2027-01-31 | 2026-10-31 (auto: 3 months before renewal) | 3m | maximum | £600k | £552k | 92% | 2027-01 | £125k | CPI cap 5% | register-pdf | near-cap, notice-3m |
| BRN-029 | Adult social care case management system | HOLLIN CASE MANAGEMENT SYSTEMS (S29) | 2023-10-01 | 2028-09-30 | 2028-03-31 (notice: 6 months before end) | later | maximum | £4.1m | £2.3m | 56% | - | £780k | CPI cap 4% | register-pdf | clean |
| BRN-030 | Design and project management consultancy (framework call-off) | HOLLOWAY QUAY CONSULTING (S30) | 2024-01-01 | 2027-12-31 | 2027-12-31 (expiry: end date) | later | maximum | £5.0m | £5.6m | 112% | exceeded | £2.4m | Day rates fixed; annual review by agreement | register-pdf | over-cap |
| BRN-031 | Planning and regulatory services software | BRACKENLOW SYSTEMS (S31) | 2023-10-01 | 2028-09-30 | 2028-03-31 (notice: 6 months before end) | later | maximum | £1.5m | £900k | 60% | - | £310k | CPI cap 3% | register-pdf | clean |


### 4.6 Six high-value suppliers with payments but no contract on the register

Rule that surfaces them: supplier with at least £200,000 paid in the last 12 months and **no match** to any register supplier (name matching in section 6). Order by last-12-month spend. Suppliers sit in the same spend files as the contracted ones, with the same messy-name treatment, so the demo can show that matching **failed to find a contract** (not that the supplier is absent).


| Supplier | Last 12 months | Whole window (Apr 2021 to Aug 2026) | Why it is a finding |
|---|---|---|---|
| GANNET LANE TEMPORARY HOUSING LIMITED (S32) | £5.9m | £24.8m | Nightly-paid temporary accommodation, invoiced in weekly batches, no agreement on the register |
| OLDACRE RESIDENTIAL CHILDCARE LIMITED (S33) | £7.4m | £30.2m | Children's residential placements, individual placement agreements not logged as contracts |
| TESSELMOOR CLOUD LIMITED (S35) | £2.2m | £6.1m | Cloud hosting and licence resale; likely a framework call-off never registered |
| WYNSTOW COACHES LIMITED (S37) | £2.6m | £9.4m | Coach hire for school transport outside the DPS; spend rising every year |
| MARLPIT SECURITY SERVICES LIMITED (S34) | £1.5m | £5.2m | Manned guarding for events and vacant property; above the Contract Procedure Rules threshold |
| CAMLET PRINT & MAILING LIMITED (S36) | £900k | £3.8m | Printing and mailing, no agreement on the register and no named contract owner |


Narrative for the demo: "Six suppliers received £20.5m in the last 12 months and none of them is on your contracts register. For two of them (temporary accommodation and children's placements), a framework or individual agreements probably exist, but not where your commercial team can see them." Compare Edinburgh (£91m to the top 100 suppliers with no contract on the register, spec) and Gedling (two high-value framework contracts missing from the register, spec).

### 4.7 The hero path for the five-minute demo (matches the spec's flow)

1. **Headline:** "£3.1m across 15 contracts flagged as opportunities to investigate" (base case; range £1.9m to £4.7m) + "£13.2m of spend above contract caps" + "£20.5m paid to 6 suppliers with no contract".
2. **Renewal radar:** 3 months (£13.2m, 3 contracts incl. the agency contract that is also over cap), 6 months (£24.8m, 3 contracts incl. highways and ICT), 12 months (£14.2m, 4 contracts); one overdue (planned works, deadline passed six days ago) and one expired still being paid (revenues and benefits).
3. **One over-cap contract: BRN-013 housing compliance testing.** Wrenfield Building Services Limited. Maximum Contract Value **£4.8m** (Clause 6.3, page 25; Contract Particulars item 7, page 5; 80% alert at Schedule 3 para 9.2, page 89). Spend crossed £4.8m in **late November 2025** and reached **£7.1m (148%)** by August 2026, **£2.3m above the cap**. A one-year extension was exercised in June 2026 by delegated decision with **no cap increase and no variation on the register** (extension clause 2.3, page 20). Analyst prompt: "Check whether a Contract Change Notice (UK10) was published." Sefton-style caveat chip: "Variation may exist outside the documents we hold."
4. **Close:** "This is one council's public data. Imagine your full estate."

Alternates if the first click-through is needed elsewhere: BRN-007 ICT (change control raises spend), BRN-010 agency (pass-through volume), BRN-002 (indexation step with the uplift clause on page 27).

### 4.8 Generated spend: how to use it

`spendgen.mjs` produces, with seed `20261006`: **7,962 rows** over 65 months (about 122 a month; the long tail starts spread), **55 credit notes**, **748 rows with messy supplier names** (35% of the 2,138 contract-supplier rows; 8.5 distinct spellings per supplier on average, up to 12), **184 redacted-payee rows** (3% of the 5,824 long-tail rows), PO on **39% of rows and 58% of value**. Spend per supplier reconciles to each contract's target within 1%.

Things to know:
- It deliberately includes **the same supplier under about 8 spellings** (35% of contract-supplier rows are messy); the matcher gets them all (6.4).
- Large contracts invoice **twice a month**; small ones once; care contracts have lower PO coverage.
- Indexation contracts step up at the review month by the "observed" percentage; measured as the 3-month average before vs after the review date, the steps come out at about 6.7% (BRN-002), 5.4% (BRN-019) and 8.3% (BRN-018) against designed values of 6.2%, 5.1% and 8.9%. Use a tolerance of one percentage point.
- Generated rows carry `_sid` (true supplier id) for testing; **do not ship `_sid` to the UI**.
- To use real-looking longer history, extend `DATA_FROM`. To produce CSV: `toCsv(rows, 'uk' | 'iso')`; the three header variants in 1.2 are applied by renaming columns per financial year in the build step.

---


## 5. How to reason about the indicative £ (conservative, ranged, haircut)

### 5.1 What the evidence says (from search summaries; no page was opened)

| Case | Figure | What it supports | Caveat |
|---|---|---|---|
| **Sheffield** (LGA, "Making savings from contract management", 2012/13) | **£15.5m across seven contracts**, "ranging from 2 to 31 per cent of annual contract cost" [S]. The spec adds **8%** overall and **£232,000 recovered** from a PFI where excessive indexation had been applied (spec text; I did not see these two in a summary) | Renegotiation and active management saving a **range**, not a point; indexation recovery is real | 2012/13; contracts chosen for management attention; one benefits tracker records financial and non-financial benefits [S] |
| **Government, 2010 to 11** | Francis Maude claimed contract renegotiation savings equal to **6%** of a full year's spend with suppliers [S] | Order of magnitude for headline | Ministerial claim, not audited [K] |
| **Surrey, Hampshire** | Surrey claimed **£8m in six months** through renegotiation; Hampshire aimed at "in the region of **£10m**" [S] | Councils do claim large numbers | Claims, not outcomes [K] |
| **Sefton** (LGA Productivity Experts Programme) | Existing software "could not identify payments where the amount charged is different to the terms of the contract", so a cost-per-unit comparison was introduced [S]; client officers "felt contract values had already been driven down to their lowest value point" [S]; analysis suggested **6% of contracts** may have potential for cost recovery, but an internal audit of a small sample found payments and variations **fully compliant with clear management trails** [S] | **The caveat**: headline potential shrinks on testing; supports "read the terms, not just the payments" | **Figure discrepancy:** the spec says £1.7m shrank to possibly nil. One search summary mentioned initial potential of **£0.5m**; another referred to "the £1.7 million". I cannot tell which stage each belongs to. **Have a person open the page before anyone quotes a Sefton number to a council contact** |
| **Guildford** | **£18.9m** spent 2020 to 2023 against a **£5.4m** maximum (a three-year testing and inspection contract agreed February 2022; £13.5m over); housing surveyor team vacant, reliance on agency staff; whistleblowing in 2022 to 2023; independent fraud investigation from April 2023; police involved [S] | The over-cap story | Extreme case; **our seed numbers are inspired by it, not copied** (BRN-013 is £7.1m against £4.8m) |
| **Exeter** | **42%** of supplier payments linked to a purchase order; **32%** of "Contract Payment" payments [S] | Why spend-to-contract joins need names, not POs | June 2025 audit |
| **Brighton and Hove, Windsor and Maidenhead, Haringey, Gedling, Edinburgh** | From the spec only; not searched | Supporting narrative | n/a |

### 5.2 Principles (what "conservative" means here)

1. **One year's benefit only.** Never multiply by remaining term in the headline. (An optional secondary column can show "over the extension" for the radar.)
2. **Use the low end of ranges.** The base case sits at or below the lowest published anchors (Sheffield 2% to 31%; government 6%).
3. **Apply to the controllable part.** Pass-through spend (agency, energy) only gets the margin.
4. **Haircut by confidence** (the Sefton lesson): high 1.0, medium 0.7, low 0.4. Confidence is **low** when a legitimate explanation is documented in the contract (NLW pass-through, volume change) or the cap is only an estimate; **medium** for ordinary renewal flags; **high** when the clause is explicit and the spend match is exact.
5. **Never double count.** Per contract, sum the flags but cap the contract's total at **12% of annual run-rate** (18% in the high case).
6. **Keep exposure and opportunity apart.** "£13.2m above cap" is exposure (money paid outside the contract); only 10% of that counts as an opportunity.
7. **Show a range** (low, base, high) and label "indicative, opportunity to investigate". Never "savings".
8. **Every figure links to a clause and page** and lists "reasons this may not be a saving".

### 5.3 Parameters

| Flag | Basis | Low | Base | High | Reasoning |
|---|---|---|---|---|---|
| Renewal: renegotiate at extension or option | % of annual run-rate | 3% | **4%** | 6% | Council holds an option and can walk away; sits between the bottom of Sheffield's range and the 6% government claim |
| Renewal: re-procure at expiry or after expiry | % of annual run-rate | 5% | **8%** | 12% | The brief asked for 5 to 15%; I stop the high case at 12%; 8% echoes the Sheffield overall figure |
| Renewal: auto-renewal notice | % of annual run-rate | 2% | **3%** | 5% | Small software and licence contracts have little negotiating room |
| Renewal: pass-through contract | % of annual pass-through spend | 1.5% | **2.5%** | 4% | Only the controllable margin or rate-card leakage |
| Over cap | % of (spend above cap) | 5% | **10%** | 15% | Recovery or regularisation of out-of-scope or unvaried work; not a forecast. Sheffield's £232k PFI indexation recovery and Brighton and Hove's refund show recoveries do happen |
| Uplift above cap | % of annualised excess uplift not explained | 25% | **50%** | 100% | Volumes and pay-award clauses often explain part |
| No contract | % of last-12-month spend | 2% | **4%** | 8% | Competition or a framework route, typical for spot spend |
| Confidence multiplier | | | high 1.0, medium 0.7, low 0.4 | | Sefton haircut |
| Contract cap on total | % of run-rate | | 12% (18% high) | | Sanity limit |

### 5.4 Code (from `portfolio.mjs`; lift as is)

```js

// ---- constants and date helpers (top of portfolio.mjs) ----
export const AS_OF = '2026-10-06';
export const DATA_TO = '2026-08-31';
export const DATA_FROM = '2021-04-01';

const d = s => new Date(s + 'T00:00:00Z');
const monthsBetween = (a, b) => (d(b).getUTCFullYear() - d(a).getUTCFullYear()) * 12 + (d(b).getUTCMonth() - d(a).getUTCMonth()) + 1; // inclusive months
const addMonths = (iso, m) => { const x = d(iso); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((d(b) - d(a)) / 86400000);

// ---------- derived metrics ----------
export function derive(c) {
  const months = monthsBetween(c.start, DATA_TO);
  const pct = c.spend / c.cap;
  const headroom = c.cap - c.spend;
  const monthly = c.run / 12;
  const projBreach = headroom > 0 ? addMonths(DATA_TO, Math.ceil(headroom / monthly)) : null;
  const daysToKey = daysBetween(AS_OF, c.key.date);
  const bucket = daysToKey < 0 ? 'overdue' : daysToKey <= 92 ? '3m' : daysToKey <= 183 ? '6m' : daysToKey <= 366 ? '12m' : 'later';
  return { months, pct, headroom, projBreach, daysToKey, bucket, avgAnnualSpend: c.spend / (months / 12) };
}

// ---------- indicative GBP (conservative; see section 5 of the brief) ----------
export const ASSUMPTIONS = {
  renegotiateAtExtension: { low: 0.03, base: 0.04, high: 0.06 },   // % of annual run-rate
  reprocureAtExpiry:      { low: 0.05, base: 0.08, high: 0.12 },
  autoRenewNotice:        { low: 0.02, base: 0.03, high: 0.05 },
  passThroughMargin:      { low: 0.015, base: 0.025, high: 0.04 }, // agency, energy: only the controllable margin
  overCapRecoverable:     { low: 0.05, base: 0.10, high: 0.15 },   // % of (spend - cap)
  upliftRecoverable:      { low: 0.25, base: 0.50, high: 1.00 },   // share of excess uplift that is not legitimately explained
  noContract:             { low: 0.02, base: 0.04, high: 0.08 },   // % of last-12m spend via competition / framework
  confidence: { high: 1.0, medium: 0.7, low: 0.4 },                // multiply base by this (Sefton haircut)
  contractCapPctOfRunRate: 0.12,                                   // never show more than 12% of annual run-rate for one contract
};

export function opportunities(c) {
  const dv = derive(c); const A = ASSUMPTIONS; const out = [];
  const isPass = ['BRN-010', 'BRN-024'].includes(c.id);
  if (c.tags.some(t => t.startsWith('notice')) || c.tags.includes('overdue') || c.tags.includes('expired')) {
    const kind = c.tags.includes('expired') ? 'reprocureAtExpiry' : isPass ? 'passThroughMargin' : c.key.type === 'auto' ? 'autoRenewNotice' : c.key.type === 'expiry' ? 'reprocureAtExpiry' : 'renegotiateAtExtension';
    const r = A[kind]; out.push({ type: 'renewal', kind, low: c.run * r.low, base: c.run * r.base, high: c.run * r.high, conf: 'medium' });
  }
  if (c.tags.includes('over-cap')) {
    const ex = c.spend - c.cap; const r = A.overCapRecoverable;
    out.push({ type: 'over-cap', exposure: ex, low: ex * r.low, base: ex * r.base, high: ex * r.high, conf: c.capType === 'maximum' ? 'high' : 'medium' });
  }
  if (c.uplift) {
    const excess = (c.uplift.observed - c.uplift.allowed) / 100 * c.uplift.base; const r = A.upliftRecoverable;
    out.push({ type: 'uplift', excessAnnual: excess, low: excess * r.low, base: excess * r.base, high: excess * r.high, conf: c.uplift.legit || c.uplift.volumeCaveat ? 'low' : 'medium' });
  }
  const cap = c.run * A.contractCapPctOfRunRate;
  const f = A.confidence;
  const adj = o => ({ ...o, baseAdj: o.base * f[o.conf], lowAdj: o.low * f[o.conf], highAdj: o.high * f[o.conf] });
  const items = out.map(adj);
  const total = { low: Math.min(items.reduce((s, o) => s + o.lowAdj, 0), cap), base: Math.min(items.reduce((s, o) => s + o.baseAdj, 0), cap), high: Math.min(items.reduce((s, o) => s + o.highAdj, 0), cap * 1.5) };
  return { items, total, dv };
}

```

### 5.5 Result: the ranked opportunities list the seed produces

Low, base, high (confidence-adjusted, capped at 12% of run-rate per contract). Rank by **base**.


| Rank | Contract | Flag types | Exposure (spend above cap) | Low | Base | High | Confidence |
|---|---|---|---|---|---|---|---|
| 1 | BRN-010 Agency workforce managed service | renewal (passThroughMargin) + over-cap | £7.0m | £470k | £900k | £1.4m | medium/high |
| 2 | BRN-007 ICT managed service | renewal (renegotiateAtExtension) + over-cap | £3.3m | £291k | £498k | £747k | medium/high |
| 3 | BRN-004 Highways maintenance term contract | renewal (renegotiateAtExtension) | - | £298k | £398k | £596k | medium |
| 4 | BRN-013 Housing compliance testing (gas, electrical, fire, legionella) | renewal (reprocureAtExpiry) + over-cap | £2.3m | £203k | £300k | £450k | medium/high |
| 5 | BRN-011 Housing responsive repairs and voids | renewal (renegotiateAtExtension) | - | £172k | £230k | £344k | medium |
| 6 | BRN-002 Street cleansing | renewal (renegotiateAtExtension) + uplift | - | £121k | £177k | £290k | medium |
| 7 | BRN-012 Housing planned works (kitchens, bathrooms, roofs) | renewal (renegotiateAtExtension) | - | £128k | £171k | £256k | medium |
| 8 | BRN-009 Revenues and benefits outsourcing | renewal (reprocureAtExpiry) | - | £88k | £140k | £210k | medium |
| 9 | BRN-003 Grounds maintenance and parks | renewal (renegotiateAtExtension) | - | £53k | £70k | £105k | medium |
| 10 | BRN-030 Design and project management consultancy (framework call-off) | over-cap | £600k | £30k | £60k | £90k | high |
| 11 | BRN-022 Parking enforcement and PCN processing | renewal (renegotiateAtExtension) | - | £36k | £48k | £71k | medium |
| 12 | BRN-018 School and SEN transport (DPS call-offs) | uplift | - | £21k | £42k | £84k | low |
| 13 | BRN-006 Leisure centre management | renewal (renegotiateAtExtension) | - | £21k | £27k | £41k | medium |
| 14 | BRN-019 Facilities management (hard and soft) | uplift | - | £12k | £23k | £46k | low |
| 15 | BRN-028 Library management system | renewal (autoRenewNotice) | - | £2k | £3k | £4k | medium |

- **Contracts only:** low £1.94m, **base £3.09m**, high £4.71m across 15 contracts; exposure (spend above cap) £13.2m.
- **Six suppliers with no contract:** low £0.41m, **base £0.82m**, high £1.64m on £20.5m paid in the last 12 months.
- **Combined:** low £2.35m, **base £3.91m**, high £6.35m, which is 2.0% of £192m third-party spend.


**Headline to display:** "**£3.1m** across **15 contracts** flagged as opportunities to investigate (range £1.9m to £4.7m)". With the six suppliers that have no contract: "**£3.9m** across **21** items (range £2.4m to £6.4m)", which is about **2.0%** of the £192m third-party spend. A headline above about 5% of third-party spend would invite disbelief (Sheffield's 8% was across seven chosen contracts, not a whole estate).

Sanity: the base-case figure per contract runs from 0.5% (facilities management) to 12% (compliance testing, at the per-contract cap) of annual run-rate; the median flagged contract is 2.8%.

### 5.6 Reasons this may not be a saving (show with every flag; Sefton lesson)

| Flag | Show "what could make this nil" |
|---|---|
| Over cap | A variation, change control note or Contract Change Notice (UK10) may have raised the cap; the cap may be an estimate; scope may have been added; pass-through costs may sit outside the cap; the spend file may be gross |
| Uplift above cap | Volumes or routes may have grown; a pay-award or National Living Wage pass-through clause may allow it; the Council may have agreed the uplift; the supplier may have requested it correctly under another clause |
| Renewal | The contract may already be at market rate; the Council's option may be conditional on KPI performance; re-procurement costs time and TUPE risk; Sefton officers felt prices were already at their lowest |
| Expired but paid | A side letter or a delegated decision may extend the contract; payments may be for a different, newer contract |
| No contract | A framework call-off, individual placement agreements or a spot purchase may be recorded elsewhere |

### 5.7 UI copy (voice rules: sentence case, you, no emoji, no exclamation marks; errors say what, why, how)

- Over cap: "You have paid £7.1m against a maximum of £4.8m (148%). Check whether a variation raised the cap before you act." Link text: "View Clause 6.3, page 25".
- Renewal: "Your notice to extend is due by 31 January 2027, in 117 days. You can renegotiate, re-procure or let the contract end. Contracts like this often reprice by 3% to 8% at renewal." Link text: "View Clause 2.3, page 20".
- Uplift: "Payments rose 6.2% from 1 April 2026. Clause 7.2 caps the annual uplift at 3.0%. Check whether volumes or a pay-award clause explain the difference." Link text: "View Clause 7.2, page 27".
- Expired but paid: "This contract ended on 31 March 2026 and you have paid £1.0m since. Check whether an extension was agreed outside the documents we hold."
- No contract: "You paid £7.4m in the last 12 months and we found no contract. A framework call-off or individual agreements may sit outside your register."
- Error example for a data problem (What, why, how): "We could not read June 2024. The file has no amount column. Download the file again from the council site or choose its amount column." Primary action label: "Choose amount column".

---


## 6. Supplier-name matching (spend files to contracts)

### 6.1 Twenty-five messy-name patterns (plus 3 negative controls) and what the matcher does

Examples use the fictional supplier `FERROWICK ENVIRONMENTAL SERVICES LIMITED` (S01) unless stated. "Result" is from `test_matcher.mjs` (38 of 38 expectations pass).

| # | Pattern | Example payee string | Result |
|---|---|---|---|
| 1 | Ltd vs Limited, mixed case | `Ferrowick Environmental Services Ltd` | AUTO 0.99 |
| 2 | Dotted legal form | `FERROWICK ENVIRONMENTAL SERVICES L.T.D.` | AUTO 0.99 |
| 3 | Case and double spaces | `ferrowick  environmental   services ltd` | AUTO 0.99 |
| 4 | `&` vs `and` (S09) | `Dellacourt Revenues and Benefits Services Ltd` | AUTO 0.99 |
| 5 | Abbreviations (ENV, SVCS, MGMT, INTL) | `FERROWICK ENV SERVICES LTD`, `Ferrowick Env. Svcs. Ltd` | AUTO 0.99 |
| 6 | Legal form dropped | `FERROWICK ENVIRONMENTAL SERVICES` | AUTO 0.99 |
| 7 | Generic suffix dropped | `FERROWICK ENVIRONMENTAL` | AUTO 0.93 |
| 8 | Typo: missing letter | `FEROWICK ENVIRONMENTAL SERVICES LTD` | AUTO 0.96 |
| 9 | Typo: transposition | `FERROWCIK ENVIRONMENTAL SERVICES LTD` | AUTO 0.96 |
| 10 | Known trading name (alias in master) | `FERROWICK WASTE & RECYCLING` | AUTO 0.99 |
| 11 | `T/A` suffix | `FERROWICK ENVIRONMENTAL SERVICES LTD T/A FERROWICK WASTE` | AUTO 0.99 |
| 12 | Truncated at 30 characters (ERP field limit), including a stub such as `LIMIT` | `FERROWICK ENVIRONMENTAL SERVIC` | AUTO 0.99 |
| 13 | Stray punctuation | `Ferrowick Environmental Services, Ltd.` | AUTO 0.99 |
| 14 | Hyphen instead of space | `FERROWICK ENVIRONMENTAL-SERVICES LTD` | AUTO 0.99 |
| 15 | `(UK)` marker | `FERROWICK ENVIRONMENTAL SERVICES LTD (UK)` | AUTO 0.99 |
| 16 | Account reference appended | `FERROWICK ENVIRONMENTAL SERVICES LTD ACC 4471` | AUTO 0.99 |
| 17 | Token order swapped | `ENVIRONMENTAL SERVICES FERROWICK LTD` | AUTO 0.95 |
| 18 | HTML entity or mojibake from export | `DELLACOURT REVENUES &amp; BENEFITS SERVICES LTD` | AUTO 0.99 |
| 19 | Shorthand `R&B` (S09) | `DELLACOURT R&B SERVICES LTD` | AUTO 0.99 |
| 20 | Legal form spelled out (CIC, LLP) (S17) | `MARROWFIELD RECOVERY SERVICES COMMUNITY INTEREST COMPANY` | AUTO 0.99 |
| 21 | `PSHIP` for partnership (S15) | `THISTLEBANK CARE PSHIP LLP` | AUTO 0.99 |
| 22 | "Formerly known as" suffix (S04) | `PENNANT RIDGE HWAYS (FORMERLY RIDGEWAY CIVILS) LTD` | AUTO 0.99 |
| 23 | Sole trader trading as the supplier (S11) | `MR J HARRIS T/A HARTSOP PROPERTY SERVICES` | **REVIEW 0.89** (a person, not the company: confirm) |
| 24 | Parent or holding company | `FERROWICK GROUP HOLDINGS PLC`, `QUILLON HOLDINGS PLC` | **REVIEW 0.79 / 0.85** (never auto) |
| 25 | Redacted individual | `REDACTED PERSONAL DATA`, `***` | EXCLUDED |
| N1 | Negative control: sibling subsidiary | `FERROWICK RECYCLING (NORTHERN) LTD` | **RELATED 0.69** (same brand word, different entity; shown in the review queue as "possible group company", never counted as the contract supplier) |
| N2 | Negative control: near-name different firm | `TALLOWFIELD STREET SERVICES LTD` vs `TALLOWMERE STREET CLEANSING LTD` | NONE 0.35 |
| N3 | Known miss: first-letter typo | `LDOUS VENN LLP` for `ALDOUS VENN LLP` | NONE 0.60 (brand token cap); caught by the "top unmatched payees by £" list, not by score |

### 6.2 Algorithm (simple enough for a prototype, defensible in front of a council contact)

1. **Exclude** redacted, sundry and one-off payees (regex on the raw string). Count them as "redacted £".
2. **Join on identifiers first**: Companies House number (if the file has one, rare) or ERP supplier ID previously confirmed. Score 1.0.
3. **Join on confirmed aliases next**: a persisted map `raw payee string (upper case) -> supplier id`, filled by the review queue.
4. **Normalise** both sides: strip diacritics and mojibake, upper-case, split off `T/A`, `FORMERLY`, `C/O`, expand `&`, drop punctuation, collapse legal forms (LIMITED, LTD, PLC, LLP, CIC and so on; TRUST and COMPANY only when last), drop stop words, expand abbreviations, crude plural stem, drop a truncated legal-form stub when the string is 28 or more characters. Keep a separate list of **group tokens** (GROUP, HOLDINGS, UK, INTERNATIONAL).
5. **Score** `0.5 x weighted token-set Dice (fuzzy tokens, IDF weights, generic words down-weighted) + 0.3 x character-bigram Dice + 0.2 x Jaro-Winkler on the squashed string`; identical after normalisation gives 0.99.
6. **Guards:** if the **brand token** (first non-generic word) does not match at Jaro-Winkler 0.88 or higher, cap at 0.60; if group tokens differ or one side has an extra distinguishing word, cap just under the auto threshold; if the spend line's expense type corroborates the supplier's service hints, add 0.05 (borderline only).
7. **Decide:** `AUTO` at 0.90 or higher with at least 0.06 margin over the second candidate; `REVIEW` from 0.72 to 0.90; `RELATED` when the brand word matches and score is 0.50 to 0.72; otherwise `NONE`.
8. **Manual-confirm queue** (the human step the spec's risk list implies): show REVIEW and RELATED items **sorted by pounds paid in the last 12 months, not by score**, with the top 3 candidates, scores and the "why" string. Actions: "Confirm match" (writes alias), "Reject match" (writes a negative alias so it is not offered again). Counts for the header: "1,558 payments matched automatically, 2 need your review, 6,218 not matched, 184 redacted".
9. **Attribute supplier to contract** (matching a supplier is not matching a contract): if the supplier holds one contract, attribute everything after its commencement date; if several, split by expense type or PO prefix, else by date window, and mark the figure "attribution uncertain" (confidence medium or low).

Thresholds were set so the test set has **zero wrong auto-matches**; the cost is that sole traders and parents go to review, which is the right place for them.

### 6.3 Code (tested; `matcher.mjs`)

```js

// Supplier-name matcher for the Kontor Financial Layer prototype.
// Pure JS, no dependencies. Works in browser (classic script: drop the `export`s) and Node.
// Usage: const m = buildMatcher(masterList); m.match("FERROWICK ENV SERVICES LTD", {expenseType:"Waste collection"})

// ---------- 1. normalisation ----------
const LEGAL_FORMS = new Set(['LIMITED','LTD','LIMTED','LIMITD','LTD.','PLC','LLP','LP','CIC','CIO','INC','LLC','CO','COMPANY','CORP','CORPORATION','TRUST','SOCIETY']);
// TRUST, SOCIETY, COMPANY and CO only count as legal forms when they are the LAST token (handled in normalise).
const STOP = new Set(['THE','AND','OF','T','A']);
const GROUP_TOKENS = new Set(['GROUP','HOLDINGS','HOLDING','UK','INTERNATIONAL','EUROPE','GB','BRITAIN','NATIONAL']);
const ABBREV = {
  SVCS:'SERVICE', SERVS:'SERVICE', SERV:'SERVICE', SVC:'SERVICE', SERVICES:'SERVICE',
  MGMT:'MANAGEMENT', MNGT:'MANAGEMENT', MGT:'MANAGEMENT',
  ENV:'ENVIRONMENTAL', ENVIRON:'ENVIRONMENTAL', ENVIRONMENT:'ENVIRONMENTAL',
  INTL:'INTERNATIONAL', INT:'INTERNATIONAL',
  SYS:'SYSTEM', SYSTEMS:'SYSTEM', SOLN:'SOLUTION', SOLNS:'SOLUTION', SOLUTIONS:'SOLUTION',
  PROP:'PROPERTY', PROPS:'PROPERTY', CONST:'CONSTRUCTION', CONSTR:'CONSTRUCTION',
  FM:'FACILITIES MANAGEMENT', HSG:'HOUSING', ENGINEERING:'ENGINEERING', ENG:'ENGINEERING',
  RECYCLING:'RECYCLING', RECYLCING:'RECYCLING', RECYCLNG:'RECYCLING',
  HWAYS:'HIGHWAYS', HWY:'HIGHWAYS', HWYS:'HIGHWAYS', TRANS:'TRANSPORT', INS:'INSURANCE', ST:'STREET',
  PSHIP:'PARTNERSHIP', PARTNERSHP:'PARTNERSHIP', MGMNT:'MANAGEMENT', RES:'RESIDENTIAL', TEMP:'TEMPORARY', TELECOMMUNICATIONS:'TELECOM', TELECOMS:'TELECOM'
};
// words that say what the firm does, not who it is: low weight in similarity
const GENERIC = new Set(['SERVICE','SOLUTION','SYSTEM','MANAGEMENT','ENVIRONMENTAL','WASTE','RECYCLING','CLEANSING','STREET','CLEANING','HIGHWAYS','HIGHWAY','CIVIL','ENGINEERING','CONSTRUCTION','BUILDING','PROPERTY','HOUSING','MAINTENANCE','LEISURE','CARE','HOMECARE','RECRUITMENT','DIGITAL','SOFTWARE','CLOUD','TELECOM','SECURITY','PARKING','ENFORCEMENT','FACILITIES','TRANSPORT','PASSENGER','COACHES','ENERGY','SUPPLY','FLEET','LEASING','LEGAL','SOLICITORS','CONSULTING','CONSULTANCY','PRINT','MAILING','GROUNDS','LIGHTING','TEMPORARY','RESIDENTIAL','CHILDCARE','PARTNERSHIP','COMMUNITIES','ACTIVE','TRADE','CONTRACTORS','CONTRACTOR','COMMUNITY','PUBLIC','SECTOR','WORKFORCE','GROUP']);

export function normalise(raw) {
  let s = String(raw ?? '');
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');               // strip diacritics
  s = s.replace(/&amp;/gi, '&').replace(/Â£|£/g, ' ');                  // mojibake and currency
  s = s.toUpperCase();
  let trading = null;
  const ta = s.match(/\s+(?:T\/A|T\/AS|TA|TRADING AS|T-A)\s+(.+)$/);      // "X LTD T/A Y"
  if (ta) { trading = ta[1]; s = s.slice(0, ta.index); }
  const fm = s.match(/\s*\(?\s*(?:FORMERLY(?: KNOWN AS)?|F\/K\/A|FKA)\s+([^)]*?)\s*(?:\)|$)/);   // "(FORMERLY X LTD)"
  if (fm) { trading = trading || fm[1]; s = s.replace(fm[0], ' '); }
  s = s.replace(/\bC\/O\b.*$/, '');                                       // care-of addresses
  s = s.replace(/COMMUNITY INTEREST COMPANY/g, 'CIC').replace(/LIMITED LIABILITY PARTNERSHIP/g, 'LLP').replace(/PUBLIC LIMITED COMPANY/g, 'PLC');
  s = s.replace(/\bR\s*(?:AND|&)\s*B\b/g, 'REVENUES AND BENEFITS');                // "R&B" in revenues and benefits firms
  s = s.replace(/\b(?:ACC|ACCT|ACCOUNT|A\/C|REF|VENDOR|SUPPLIER|ID|NO)\b\.?\s*[#:]?\s*\d+\s*$/, '').replace(/\s+\d{4,}\s*$/, ''); // trailing account refs
  s = s.replace(/\(\s*(?:THE\s+)?(?:UK|U\.K\.|GB)\s*\)/g, ' UK ');       // "(UK)" becomes a group token
  s = s.replace(/&|\+/g, ' AND ');
  s = s.replace(/[.,'"`´’_\/\\:;!?*#@\[\]{}|~^%$]/g, ' ');                // punctuation to space
  s = s.replace(/[()-]/g, ' ');
  s = s.replace(/\bL\s*T\s*D\b/g, 'LTD').replace(/\bP\s*L\s*C\b/g, 'PLC');// "L.T.D" -> LTD
  let toks = s.split(/\s+/).filter(Boolean);
  const squashed = toks.join('');
  // expand abbreviations, drop stop words
  toks = toks.flatMap(t => (ABBREV[t] ? ABBREV[t].split(' ') : [t])).filter(t => !STOP.has(t));
  // strip legal forms (anywhere except "TRUST"/"SOCIETY"/"COMPANY"/"CO" which only count if last)
  const last = toks.length - 1;
  const legal = [];
  toks = toks.filter((t, i) => {
    if (['TRUST','SOCIETY','COMPANY','CO'].includes(t)) { if (i === last) { legal.push(t); return false; } return true; }
    if (LEGAL_FORMS.has(t)) { legal.push(t); return false; }
    return true;
  });
  // ERP exports often truncate at 30 chars, leaving a stub like "LIMIT" or "L" at the end
  if (String(raw ?? '').trim().length >= 28 && toks.length > 1) { const lt = toks[toks.length - 1]; if (lt.length === 1 || (lt.length >= 2 && ['LIMITED', 'PARTNERSHIP', 'LTD'].some(w => w.startsWith(lt) && w !== lt))) toks.pop(); }
  const groupTokens = toks.filter(t => GROUP_TOKENS.has(t));
  const core = toks.filter(t => !GROUP_TOKENS.has(t));
  // crude plural stemming for long tokens
  const stem = t => (t.length > 5 && t.endsWith('S') && !t.endsWith('SS') ? t.slice(0, -1) : t);
  const coreStem = core.map(stem);
  return { raw, trading, legal, groupTokens, core: coreStem, key: coreStem.join(' '), squashed: coreStem.join('') };
}

// ---------- 2. similarity primitives ----------
export function jaroWinkler(a, b) {
  if (a === b) return 1; if (!a || !b) return 0;
  const md = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const am = new Array(a.length).fill(false), bm = new Array(b.length).fill(false);
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - md); j < Math.min(b.length, i + md + 1); j++) {
      if (!bm[j] && a[i] === b[j]) { am[i] = bm[j] = true; m++; break; }
    }
  }
  if (!m) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < a.length; i++) { if (am[i]) { while (!bm[k]) k++; if (a[i] !== b[k]) t++; k++; } }
  const j = (m / a.length + m / b.length + (m - t / 2) / m) / 3;
  let p = 0; while (p < Math.min(4, a.length, b.length) && a[p] === b[p]) p++;
  return j + p * 0.1 * (1 - j);
}
function bigrams(s) { const o = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); o.set(g, (o.get(g) || 0) + 1); } return o; }
export function dice(a, b) {
  if (!a || !b) return 0; if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b); let inter = 0, na = 0, nb = 0;
  for (const [g, c] of A) { na += c; if (B.has(g)) inter += Math.min(c, B.get(g)); }
  for (const c of B.values()) nb += c;
  return (2 * inter) / (na + nb || 1);
}

// IDF weights so rare "brand" tokens count more than generic words
export function buildIdf(allNames) {
  const df = new Map(); const N = allNames.length || 1;
  for (const n of allNames) for (const t of new Set(normalise(n).core)) df.set(t, (df.get(t) || 0) + 1);
  return t => { const d = df.get(t) || 0; const idf = Math.log((N + 1) / (d + 1)) + 1; return GENERIC.has(t) ? Math.min(idf, 1) * 0.35 : idf; };
}

// weighted token-set similarity with fuzzy token matching (handles typos like FERROWICK/FEROWICK)
export function tokenSetSim(ta, tb, w) {
  if (!ta.length || !tb.length) return 0;
  const used = new Set(); let inter = 0;
  for (const x of ta) {
    let best = 0, bj = -1;
    tb.forEach((y, j) => { if (used.has(j)) return; const s = x === y ? 1 : jaroWinkler(x, y); if (s > best) { best = s; bj = j; } });
    if (best >= 0.88 && bj >= 0) { used.add(bj); inter += ((w(x) + w(tb[bj])) / 2) * best; }
  }
  const wa = ta.reduce((s, t) => s + w(t), 0), wb = tb.reduce((s, t) => s + w(t), 0);
  return (2 * inter) / (wa + wb || 1);                     // weighted Dice, always <= 1
}

// ---------- 3. matcher ----------
export function buildMatcher(master, opts = {}) {
  // master: [{id, name, aliases?:[], serviceHints?:[]}]
  const auto = opts.auto ?? 0.90, review = opts.review ?? 0.72, margin = opts.margin ?? 0.06;
  const aliasMap = new Map(Object.entries(opts.confirmed || {}));          // rawName(UPPER) -> masterId, persisted manual confirmations
  const allNames = master.flatMap(m => [m.name, ...(m.aliases || [])]);
  const w = buildIdf(allNames.concat(opts.corpus || []));
  const prepared = master.map(m => ({ m, forms: [m.name, ...(m.aliases || [])].map(normalise) }));

  function score(a, b, ctx) {
    if (!a.core.length || !b.core.length) return { s: 0, why: 'empty' };
    if (a.squashed === b.squashed) return { s: 0.99, why: 'identical after normalisation' };
    const ts = tokenSetSim(a.core, b.core, w);
    const di = dice(a.squashed, b.squashed);
    const jw = jaroWinkler(a.squashed, b.squashed);
    let s = 0.5 * ts + 0.3 * di + 0.2 * jw;
    // brand token = first non-generic token; if it does not match, cap hard
    const brand = x => x.core.find(t => !GENERIC.has(t)) || x.core[0];
    const bs = jaroWinkler(brand(a), brand(b));
    let why = 'name similarity';
    if (bs < 0.88) { s = Math.min(s, 0.60); why = 'brand token differs'; }
    // group/subsidiary markers present on only one side: never auto-match
    const gA = a.groupTokens.join(' '), gB = b.groupTokens.join(' ');
    if (gA !== gB && s >= auto) { s = auto - 0.02; why = 'group/subsidiary marker differs'; }
    // one side has an extra distinguishing token (e.g. "(NORTHERN)"): review
    const extraA = a.core.filter(t => !b.core.some(u => jaroWinkler(t, u) >= 0.88)).filter(t => !GENERIC.has(t));
    const extraB = b.core.filter(t => !a.core.some(u => jaroWinkler(t, u) >= 0.88)).filter(t => !GENERIC.has(t));
    if ((extraA.length || extraB.length) && bs >= 0.88 && s >= auto) { s = auto - 0.03; why = 'extra distinguishing token: ' + [...extraA, ...extraB].join(','); }
    // corroboration from the spend line (expense type / expense area) nudges borderline cases
    if (ctx && ctx.expenseType && s >= 0.6 && s < auto) {
      const hit = (ctx.hints || []).some(h => String(ctx.expenseType).toUpperCase().includes(h.toUpperCase()));
      if (hit) { s = Math.min(auto - 0.001, s + 0.05); why += ' +expense-type corroboration'; }
    }
    return { s: Math.max(0, Math.min(1, s)), why };
  }

  function match(rawName, ctx = {}) {
    const key = String(rawName).trim().toUpperCase();
    if (/^(REDACTED|\*+|PERSONAL DATA|INDIVIDUAL|SUNDRY|ONE[- ]OFF|CONFIDENTIAL|DATA PROTECTION)/.test(key))
      return { status: 'EXCLUDED', reason: 'redacted or sundry payee', raw: rawName };
    if (ctx.companyNumber) { const hit = master.find(m => m.companyNumber && m.companyNumber === ctx.companyNumber); if (hit) return { status: 'AUTO', id: hit.id, score: 1, reason: 'company number', raw: rawName }; }
    if (ctx.supplierId) { const hit = master.find(m => (m.erpIds || []).includes(ctx.supplierId)); if (hit) return { status: 'AUTO', id: hit.id, score: 1, reason: 'ERP supplier id', raw: rawName }; }
    if (aliasMap.has(key)) return { status: 'CONFIRMED', id: aliasMap.get(key), score: 1, reason: 'previously confirmed by a person', raw: rawName };
    const n = normalise(rawName);
    const cands = [];
    for (const p of prepared) {
      let best = { s: 0, why: '' };
      for (const f of p.forms) { const r = score(n, f, { ...ctx, hints: p.m.serviceHints }); if (r.s > best.s) best = r; }
      // trading-as name is also a candidate form
      if (n.trading) { const r = score(normalise(n.trading), p.forms[0], { ...ctx, hints: p.m.serviceHints }); if (r.s * 0.97 > best.s) best = { s: Math.min(r.s * 0.97, auto - 0.01), why: 'matched on trading-as / formerly name: confirm' }; }
      cands.push({ id: p.m.id, name: p.m.name, score: +best.s.toFixed(3), reason: best.why });
    }
    cands.sort((a, b) => b.score - a.score);
    const [c1, c2] = cands;
    let status = 'NONE';
    if (c1.score >= auto && (!c2 || c1.score - c2.score >= margin)) status = 'AUTO';
    else if (c1.score >= review) status = 'REVIEW';
    else if (c1.score >= 0.5 && jaroWinkler(n.core.find(t => !GENERIC.has(t)) || '', normalise(c1.name).core.find(t => !GENERIC.has(t)) || '') >= 0.95) status = 'RELATED'; // same brand word, different entity: possible group/sibling
    return { status, id: status === 'NONE' ? null : c1.id, score: c1.score, reason: c1.reason, candidates: cands.slice(0, 3), raw: rawName };
  }
  function confirm(rawName, masterId) { aliasMap.set(String(rawName).trim().toUpperCase(), masterId); }
  return { match, confirm, normalise, aliasMap };
}

```

Usage:

```js
import { buildMatcher } from './matcher.mjs';
// master: [{ id, name, aliases?: string[], serviceHints?: string[], companyNumber?: string, erpIds?: string[] }]
const matcher = buildMatcher(master, { corpus: distinctPayeeStrings, confirmed: savedAliasMapObject });
const res = matcher.match('FEROWICK ENV SVCS LTD', { expenseType: 'Waste collection' });
// -> { status: 'AUTO' | 'REVIEW' | 'RELATED' | 'NONE' | 'EXCLUDED' | 'CONFIRMED', id, score, reason, candidates: [top 3] }
matcher.confirm('MR J HARRIS T/A HARTSOP PROPERTY SERVICES', 'S11');   // user clicked "Confirm match"
```

### 6.4 Test results (seed 20261006)

- `node test_matcher.mjs`: **38 of 38 expectations pass** (the table above).
- `node e2e_match.mjs`: all 7,962 generated rows, 1,716 distinct payee strings, matched against the 31 register suppliers: **1,558 AUTO and correct, 0 AUTO and wrong, 0 missed contract-supplier rows, 2 sent to REVIEW, 184 EXCLUDED (redacted), 6,218 NONE (long tail and the six no-contract suppliers, correctly unmatched)**. Elapsed about 4.7 s in Node for 1,716 distinct strings; **precompute, cache and ship the results** rather than matching at render time.
- The two REVIEW rows in this seed are `LADOUS VENN LLP` (transposition at the start of the brand word, 0.899) and `HALBERD MUNICIPAL INSURANCE CO` (truncated, 0.899): both correct candidates one hair under the auto line, which is the intended behaviour. With a different random seed, expect one or two first-letter typos to be missed outright (pattern N3). That is acceptable and is the reason the unmatched list is ranked by pounds.

### 6.5 Known limits (say so, it builds trust)

- No phonetic matching (Soundex or similar); the sample typos are keyboard-style.
- First-letter typos are not caught (brand guard).
- Different legal entities with the same trading brand (siblings) are never merged without a person.
- Foreign suffixes (GmbH, SA, BV) are not in the legal-form list; add if needed.
- Real data would also benefit from Companies House number lookups; the Companies House API is not used in the prototype.

---


## 7. Fictional naming kit

### 7.1 The council

**Brindleford Borough Council** (fictional unitary borough). Short name "Brindleford". Website placeholder `brindleford.example` (`.example` is reserved by RFC 2606, so it cannot collide with a real domain).

- Verification: WebSearch for `"Brindleford Borough Council"` returned only unrelated parish councils (Bridford, Brindle, Bideford) and no council of that name; two alternates also returned nothing: **Calderhurst Borough Council** (results showed Calderdale, which is similar: avoid) and **Wexmere Borough Council** (results showed Wrexham: avoid). Wikipedia's list of English unitary authorities and the ONS lookup results mentioned in the search showed no match [S]. This is not an exhaustive register check.
- Local context for narrative: the sector is in **local government reorganisation** (unitary proposals for many areas in 2026) [S]; the spec's Stage 2 mentions merging councils under LGR. Brindleford can be described as "not part of a current merger proposal" to avoid the question.
- Council tone: "Commercial and Procurement", "Contract Procedure Rules", "Corporate Plan 2024 to 2028". Financial year 1 April to 31 March.

### 7.2 Suppliers (41 entities, all invented)

- **31 on the register** (S01 to S31), **6 paid with no contract** (S32 to S37), **4 decoys** (D01 to D04) for matching tests. Parents named in the last column exist only as text.
- Company numbers are **FICTIONAL**. They use `9xxxxxxx` (8 digits) and `OC9xxxxx` for LLPs, ranges Companies House has not issued [U]. Do not display them next to a link to the real Companies House site.
- A shallow web search for a sample of the invented names found no obvious real company, but that is **not** a Companies House check. Run all 41 through the Companies House search before any public demo.
- Naming approach: invented place-like or surname-like stems (Ferrowick, Tallowmere, Pennant Ridge) plus a plain service descriptor, so audience members will not mistake them for known firms. I avoided common supplier words and stems of well-known real outsourcing firms.


| ID | Canonical legal name (as Companies House would hold it) | Number (FICTIONAL) | Service area | Typical messy variants in spend files | Group / parent |
|---|---|---|---|---|---|
| S01 | FERROWICK ENVIRONMENTAL SERVICES LIMITED | 90412837 | Environment and neighbourhoods | Ferrowick Environmental Services Ltd ; FERROWICK ENV SERVICES LTD ; Ferrowick Waste & Recycling | Ferrowick Group Holdings plc |
| S02 | TALLOWMERE STREET CLEANSING LTD | 90518264 | Environment and neighbourhoods | Tallowmere Street Cleansing Limited ; TALLOWMERE ST CLEANSING ; Tallowmere Cleansing |  |
| S03 | BRAMBLEWICK GROUNDS LIMITED | 90377102 | Environment and neighbourhoods | Bramblewick Grounds Ltd ; Bramblewick Grounds Maintenance Limited |  |
| S04 | PENNANT RIDGE HIGHWAYS LIMITED | 90266540 | Highways and transport | Pennant Ridge Highways Ltd ; PENNANT RIDGE HWAYS LTD ; Pennant Ridge Group (Highways) | Pennant Ridge Group plc |
| S05 | GREYWELL HIGHWAYS LIGHTING LTD | 90644819 | Highways and transport | Greywell Highways Lighting Limited ; Greywell Lighting |  |
| S06 | MERIDEW LEISURE TRUST LIMITED | 90129376 | Culture, leisure and libraries | Meridew Leisure Trust ; MERIDEW LEISURE TRUST LTD ; Meridew Active |  |
| S07 | QUILLON DIGITAL SERVICES LIMITED | 90733158 | Customer, digital and ICT | Quillon Digital Services Ltd ; QUILLON DIGITAL SVCS LTD ; Quillon Digital | Quillon Holdings plc |
| S08 | COBALTINE SOFTWARE LIMITED | 90851623 | Finance and revenues | Cobaltine Software Ltd ; COBALTINE SOFTWARE LTD. ; Cobaltine |  |
| S09 | DELLACOURT REVENUES & BENEFITS SERVICES LIMITED | 90290471 | Finance and revenues | Dellacourt Revenues and Benefits Services Ltd ; DELLACOURT R&B SERVICES LTD ; Dellacourt R and B |  |
| S10 | PELLAM RECRUITMENT GROUP LIMITED | 90185937 | People and organisational development | Pellam Recruitment Group Ltd ; PELLAM RECRUITMENT GROUP LTD T/A PELLAM PUBLIC SECTOR ; Pellam Public Sector | Pellam Holdings Limited |
| S11 | HARTSOP PROPERTY SERVICES LIMITED | 90472085 | Housing and homelessness | Hartsop Property Services Ltd ; HARTSOP PROPERTY SVCS LTD ; Hartsop Housing Maintenance |  |
| S12 | CORBEL BUILDING CONTRACTORS LIMITED | 90568213 | Housing and homelessness | Corbel Building Contractors Ltd ; CORBEL BUILDING CONTRACTORS LTD ; Corbel Construction |  |
| S13 | WRENFIELD BUILDING SERVICES LIMITED | 90391746 | Housing and homelessness | Wrenfield Building Services Ltd ; WRENFIELD BUILDING SERVICES LTD ; Wrenfield Compliance |  |
| S14 | WENDLEBURY HOMECARE LIMITED | 90607352 | Adult social care and health | Wendlebury Homecare Ltd ; WENDLEBURY HOME CARE LTD ; Wendlebury Care at Home |  |
| S15 | THISTLEBANK CARE PARTNERSHIP LLP | OC990214 | Adult social care and health | Thistlebank Care Partnership ; THISTLEBANK CARE PSHIP LLP |  |
| S16 | HOLLOWMERE CARE HOMES LIMITED | 90324968 | Adult social care and health | Hollowmere Care Homes Ltd ; HOLLOWMERE CARE HOMES LTD |  |
| S17 | MARROWFIELD RECOVERY SERVICES CIC | 90713459 | Public health | Marrowfield Recovery Services Community Interest Company ; MARROWFIELD RECOVERY |  |
| S18 | SALTWHISTLE PASSENGER TRANSPORT LIMITED | 90246831 | Children's services and education | Saltwhistle Passenger Transport Ltd ; SALTWHISTLE PASSENGER TRANS LTD ; Saltwhistle Travel |  |
| S19 | OSTLEMOOR FACILITIES MANAGEMENT LIMITED | 90435790 | Corporate services and legal | Ostlemoor Facilities Management Ltd ; OSTLEMOOR FM LTD ; Ostlemoor FM | Ostlemoor Group Limited |
| S20 | BRIGHTHOLM CLEANING SERVICES LIMITED | 90582146 | Corporate services and legal | Brightholm Cleaning Services Ltd ; BRIGHTHOLM CLEANING SVCS LTD ; Brightholm |  |
| S21 | ARGENT WATCH CCTV SOLUTIONS LIMITED | 90661027 | Environment and neighbourhoods | Argent Watch CCTV Solutions Ltd ; ARGENT WATCH CCTV ; Argent Watch |  |
| S22 | STANNOCK PARKING ENFORCEMENT LIMITED | 90318592 | Highways and transport | Stannock Parking Enforcement Ltd ; STANNOCK PARKING ENFORCEMENT LTD ; Stannock CEO Services |  |
| S23 | ALDOUS VENN LLP | OC990517 | Corporate services and legal | Aldous Venn ; ALDOUS VENN LLP ; Aldous Venn Solicitors |  |
| S24 | VOLTA FEN ENERGY SUPPLY LIMITED | 90745381 | Corporate services and legal | Volta Fen Energy Supply Ltd ; VOLTA FEN ENERGY ; Volta Fen Energy | Volta Fen Group plc |
| S25 | HALBERD MUNICIPAL INSURANCE COMPANY LIMITED | 90120664 | Finance and revenues | Halberd Municipal Insurance Co Ltd ; HALBERD MUNICIPAL INS CO LTD ; Halberd Municipal |  |
| S26 | LANTERNWICK FLEET LEASING LIMITED | 90497713 | Environment and neighbourhoods | Lanternwick Fleet Leasing Ltd ; LANTERNWICK FLEET LEASING LTD ; Lanternwick Fleet |  |
| S27 | KELMARSH TELECOM LIMITED | 90602875 | Customer, digital and ICT | Kelmarsh Telecom Ltd ; KELMARSH TELECOM LTD ; Kelmarsh Telecommunications |  |
| S28 | LECTERN LIBRARY SYSTEMS LIMITED | 90376420 | Culture, leisure and libraries | Lectern Library Systems Ltd ; LECTERN LIBRARY SYSTEMS LTD |  |
| S29 | HOLLIN CASE MANAGEMENT SYSTEMS LIMITED | 90819254 | Adult social care and health | Hollin Case Management Systems Ltd ; HOLLIN CASE MGMT SYSTEMS LTD ; Hollin Systems |  |
| S30 | HOLLOWAY QUAY CONSULTING LIMITED | 90254167 | Place, planning and regeneration | Holloway Quay Consulting Ltd ; HOLLOWAY QUAY CONSULTING LTD ; Holloway Quay |  |
| S31 | BRACKENLOW SYSTEMS LIMITED | 90538906 | Place, planning and regeneration | Brackenlow Systems Ltd ; BRACKENLOW SYSTEMS LTD |  |
| S32 | GANNET LANE TEMPORARY HOUSING LIMITED | 90693148 | Housing and homelessness | Gannet Lane Temporary Housing Ltd ; GANNET LANE TEMP HOUSING LTD ; Gannet Lane Lettings |  |
| S33 | OLDACRE RESIDENTIAL CHILDCARE LIMITED | 90412059 | Children's services and education | Oldacre Residential Childcare Ltd ; OLDACRE RES CHILDCARE LTD ; Oldacre Homes | Oldacre Care Group Limited |
| S34 | MARLPIT SECURITY SERVICES LIMITED | 90287334 | Corporate services and legal | Marlpit Security Services Ltd ; MARLPIT SECURITY SVCS LTD ; Marlpit Guarding |  |
| S35 | TESSELMOOR CLOUD LIMITED | 90756821 | Customer, digital and ICT | Tesselmoor Cloud Ltd ; TESSELMOOR CLOUD LTD ; Tesselmoor |  |
| S36 | CAMLET PRINT & MAILING LIMITED | 90139572 | Corporate services and legal | Camlet Print and Mailing Ltd ; CAMLET PRINT & MAILING LTD ; Camlet Print |  |
| S37 | WYNSTOW COACHES LIMITED | 90471830 | Children's services and education | Wynstow Coaches Ltd ; WYNSTOW COACHES LTD T/A WYNSTOW TRAVEL ; Wynstow Travel |  |
| D01 | FERROWICK RECYCLING (NORTHERN) LIMITED | 90412910 | (sibling of S01, separate legal entity) | Ferrowick Recycling Northern Ltd | Ferrowick Group Holdings plc |
| D02 | FERROWICK GROUP HOLDINGS PLC | 90398447 | (parent of S01; does not supply directly) | Ferrowick Group Holdings |  |
| D03 | TALLOWFIELD STREET SERVICES LIMITED | 90583625 | (near-name decoy for S02, unrelated firm) | Tallowfield Street Services Ltd |  |
| D04 | QUILLON HOLDINGS PLC | 90733001 | (parent of S07) | Quillon Holdings |  |


### 7.3 Twelve service areas (directorates)

1. Adult social care and health
2. Children's services and education
3. Environment and neighbourhoods
4. Housing and homelessness
5. Highways and transport
6. Place, planning and regeneration
7. Customer, digital and ICT
8. Finance and revenues
9. Corporate services and legal
10. People and organisational development
11. Public health
12. Culture, leisure and libraries

### 7.4 Officer roles (roles only; no real people; do not invent personal names unless the UI needs avatars, in which case use initials)

| Role | Used for |
|---|---|
| Head of Commercial and Procurement | Owner of the register, demo user |
| Strategic Contracts Manager | Receives renewal radar alerts |
| Category Manager, Place | Waste, highways, grounds, FM |
| Category Manager, People | Care, agency, school transport |
| Contract Manager, Waste and Street Scene | BRN-001, 002, 003 |
| Contract Manager, Housing Repairs | BRN-011, 012, 013 |
| Commissioning Manager, Adult Social Care | BRN-014, 015, 016 |
| Finance Business Partner, Environment | Spend queries |
| Director of Finance (Section 151 Officer) | Sign-off on over-cap |
| Monitoring Officer | Variation and legality questions |
| Head of Internal Audit | Audit trail |
| Procurement Lawyer, Legal Services | Clause checks |
| Service Director, Environment and Neighbourhoods | Escalation |
| Assistant Director, Housing Assets | Escalation (compliance testing) |

Use "Contract owner" on each register row from this list (for example BRN-013 owner: "Assistant Director, Housing Assets").

### 7.5 Conventions to keep sample data visibly fictional but realistic

- Banner or footer chip: "Sample data. Brindleford Borough Council and all suppliers are fictional."
- Register id `BRN-001` to `BRN-031`; council contract ref `CON/22/0147`; PO `PO724192`; transaction `T410129`; fictional ocid `ocds-h6vhtk-0f9a31`; fictional notice `900112-2026`.
- Fictional supplier **websites**: use `.example` only.
- Money in £, thousands separators in tables, `£1.2m` in prose, financial years `2025/26`.
- Dates in UI: `6 October 2026` or `06/10/2026` (UK), never US order.

---


## 8. Appendices

### 8.1 Sample spend CSV (FICTIONAL; Variant B headers; every quirk from 1.3 that matters is present)

```csv
Body Name,Payment Date,Transaction Number,Directorate,Expense Type,Supplier ID,Supplier Name,Purchase Order,Net Amount,VAT,Description
Brindleford Borough Council,03/08/2026,T410133,Environment and neighbourhoods,Waste collection,100037,FERROWICK ENVIRONMENTAL SERVICES LIMITED,PO724192,"506,487.84","101,297.57",Waste collection
Brindleford Borough Council,04/08/2026,T410134,Environment and neighbourhoods,Waste collection,100037,FERROWICK  ENVIRONMENTAL  SERVICES  LIMITED,PO746895,"506,487.84","101,297.57",Waste collection
Brindleford Borough Council,05/08/2026,T410359,Highways and transport,Highways maintenance,100148,Pennant Ridge Highways Ltd,PO741138,"588,051.45","117,610.29",
Brindleford Borough Council,06/08/2026,T410668,Finance and revenues,Revenues and benefits,100333,DELLACOURT REVENUES &amp; BENEFITS SERVICES LTD.,PO729123,"199,752.08","39,950.42",Revenues and benefits
Brindleford Borough Council,10/08/2026,T410945,Housing and homelessness,Compliance testing,100481,WRENFIELD BUILDING SVCS LTD,,"238,462.96","47,692.59",
Brindleford Borough Council,10/08/2026,T410946,Housing and homelessness,Compliance testing,100481,WRENFIELD BUILDING SERVICES LIMITED,,"(4,120.00)","(824.00)",Credit note CN-2291
Brindleford Borough Council,12/08/2026,T410560,"Customer, digital and ICT",ICT managed service,100259,QUILLON DIGITAL SERVICES LIMITED T/A QUILLON DIGITAL,PO733201,"284,974.26","56,994.85",
Brindleford Borough Council,14/08/2026,T410370,People and organisational development,Agency staff,100370,PELLAM RECRUITMENT GROUP LIMIT,PO713087,"537,432.87","107,486.57",
Brindleford Borough Council,17/08/2026,T411697,Housing and homelessness,Temporary accommodation,101184,GANNET  LANE  TEMPORARY  HOUSING  LIMITED,,"172,243.22","34,448.64",
Brindleford Borough Council,17/08/2026,T411862,Children's services and education,Childrens placements,101221,Oldacre Residential Childcare Ltd,,"219,478.82",0.00,
Brindleford Borough Council,19/08/2026,T412128,Corporate services and legal,Printing and postage,101332,CAMLET PRINT & MAILING LTD.,,"79,624.94","15,924.99",
Brindleford Borough Council,24/08/2026,T600931,Adult social care and health,Sundry,,REDACTED PERSONAL DATA,,1850.00,0.00,
Brindleford Borough Council,26/08/2026,T600944,Environment and neighbourhoods,Sundry,300114,KESTRELWOOD SKIP HIRE LIMITED,,612.40,122.48,
```

Notes: the Wrenfield credit note has a bracketed negative amount; Pellam is truncated at 30 characters (`LIMIT`); Ferrowick appears twice a day apart with the same amount (pattern 17 in 1.3: possible re-issued payment, show a de-duplication warning not a silent drop); one `&amp;`; two redacted or tail rows at the bottom.

Variant A header example (older years): `Date,Expense Type,Expense Area,Supplier,Transaction Number,Amount,VAT` with ISO dates `2022-06-14` and plain `1234.56` amounts. Variant C (bad year): `Paid Date,Service,Subjective Description,Payee,Value,Order No` with gross values and no VAT column (see trap 1 in 1.6).

### 8.2 Sample register row (council contracts register, Transparency Code over £5,000; FICTIONAL)

```csv
Reference,Title,Department,Description,Supplier,Annual or total value,Irrecoverable VAT,Start date,End date,Review date,Procurement route
CON/22/0147,ICT managed service,"Customer, digital and ICT","Service desk, infrastructure and networks","QUILLON DIGITAL SERVICES LIMITED (90733158)",3500000 pa,0,01/09/2022,31/08/2027,01/03/2027,Open tender
```

### 8.3 Open uncertainties (verify before they reach a council contact)

| # | Uncertainty | Why it matters |
|---|---|---|
| 1 | Exact paragraph numbers and recommended column list in the Transparency Code and the LGA guide (I could not open them) | The schema in 1.2 is the de facto set, not a quoted list |
| 2 | UK7 exact field names and the OCDS UK profile (extension, renewal, maximum value keys) | Section 2.6 JSON mimics OCDS 1.1.5 with `x_` extras |
| 3 | Whether the £5m test includes VAT and uses whole-term value | Affects which seed contracts "should" have a published copy |
| 4 | Timing of UK8 (payment information) and the payments compliance notice | Mentioned, not relied on |
| 5 | **Sefton figures** (£0.5m vs £1.7m in different summaries) | Do not quote either until the LGA page is read |
| 6 | Sheffield "8%" and "£232,000 PFI" are from the spec; the summaries I saw gave £15.5m and a 2 to 31% range | Quote the range with the spec's figures labelled as "per the LGA report" only after checking |
| 7 | Company number and ocid ranges are "not yet issued" by assumption | Collision risk is tiny but non-zero |
| 8 | NJC 2026/27 3.3%: one result called it the employers' offer, another "agreed" | Use "3.3% from April 2026" only if the demo needs it |
| 9 | CPI reference-month values for 1 April 2026 reviews | Seed uses the cap as the allowed uplift, avoiding the issue |
| 10 | Contracts Finder's current operational status | Describe it as the older regime's home, not as live |
| 11 | Annual value ranges per archetype and the £192m third-party spend | My planning estimates, not sourced |
| 12 | Council-specific Contract Procedure Rules thresholds | Rule in 4.6 uses £200,000 over 12 months |

### 8.4 Sources (seen only as WebSearch result links or summaries; none opened)

- Local Government Transparency Code 2015 (GOV.UK): https://www.gov.uk/government/publications/local-government-transparency-code-2015
- Guidance reconciling the Procurement Act 2023 and the Code: https://www.gov.uk/government/publications/local-government-transparency-code-2015/guidance-for-reconciling-publication-requirements-of-the-procurement-act-2023-and-the-local-government-transparency-code-2015
- LGA, publishing spending and procurement information (updated 2025): https://www.local.gov.uk/sites/default/files/documents/Updated%20guidance%202025%20-%20publishing%20spending%20and%20procurement%20information%20-%20final%20for%20publishing.pdf
- Durham, payments to suppliers over £500 (columns and cadence): https://durham.gov.uk/article/2437/Payments-to-suppliers-over-500
- Exeter, procurement action plan (42% and 32% PO linkage): https://committees.exeter.gov.uk/documents/s100161/SMB.07.02d%20Appendix%204%20Procurement%20Action%20Plan.pdf
- Local Government Lawyer on Guildford (£18.9m vs £5.4m): https://www.localgovernmentlawyer.co.uk/governance/396-governance-news/57353-whistleblowing-allegations-at-council-relating-to-13m-contract-overspend-went-unheard-report-suggests
- LGA case study, Sefton: https://www.local.gov.uk/case-studies/testing-savings-around-contract-compliance-and-negotiation
- LGA report with Sheffield: https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf
- Find a Tender, notice types and sequences: https://www.find-tender.service.gov.uk/Home/NoticeTypes
- Notice type summaries: https://help.oxygen-finance.com/helphub/procurement-act-2023-notice-types and https://www.gca.gov.uk/news/procurement-act-2023-notices-what-they-mean-and-how-to-use-them-procurement-essentials
- UK7 example and ocid example seen in results: https://www.find-tender.service.gov.uk/Notice/029890-2025 and https://www.find-tender.service.gov.uk/procurement/ocds-h6vhtk-0599e4
- Thresholds from 1 January 2026: https://cm.twobirds.com/en/insights/2025/uk/new-uk-public-procurement-thresholds-from-1st-january-2026
- Open Contracting Partnership, one year of UK data (551 fields): https://www.open-contracting.org/2026/03/03/the-uk-procurement-act-one-year-on-what-does-the-data-tell-us/
- ONS, consumer price inflation August 2026: https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/august2026/pdf
- NJC 2026/27 pay award: https://www.devon.gov.uk/schcomms/?p=8837
- Council claims of renegotiation savings: https://www.localgovernmentlawyer.co.uk/procurement-and-contracts/402-procurement-news/27509-council-claims-8m-savings-in-six-months-through-contract-renegotiations and https://localgovernmentlawyer.co.uk/projects-and-regeneration/317-projects-features/7473-contract-renegotiation-saves-whitehall-p800m-in-10-months-claims-maude
