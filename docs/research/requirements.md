# Kontor financial layer (Stage 1): build-ready requirements and data model

Author: requirements research agent. Source: `docs/spec.md` (transcription of the "Kontor Financial Layer: Prototype Scope" doc, as-of 2026-10-06). Nothing under `design-system/`, `src/` or `index.html` was touched.

How to use this file: sections 0 to 2 tell you WHAT the spec says and what we decided where it is silent. Section 3 is the numbered requirement list (R1 to R78) with binary acceptance criteria for QA. Sections 4 and 5 are the data model and the exact derivations. Section 6 is the sample dataset design with golden numbers (verified by `engine.test.mjs`). Section 7 is the UI copy deck. Sections 8 to 10 cover wow moments, roadmap content and the demo script. Sections 11 and 12 list traps, a QA checklist and the risks.

Contents: 0 Decisions · 1 Spec digest (must-haves, stretch, Stage 2, demo flow, goals, risks, open questions, evidence) · 2 Product rules (routes, rail, persistence) · 3 Requirements R1 to R78 · 4 Data model · 5 Derivations (with code) · 6 Sample data and golden numbers · 7 UI copy deck · 8 Wow moments · 9 Roadmap page content · 10 Demo script · 11 Traps and QA checklist · 12 Risks and gaps.

Verified reference code (run with plain `node`, no dependencies, deterministic) lives in `/tmp/claude-0/-home-user-LG-Proto1/4a2c3345-29a2-559b-b8d9-409e75525fc5/scratchpad/research/work/ref/`:

| File | What it is | Copy to |
|---|---|---|
| `engine.mjs` | Pure functions: dates, notice deadline, radar band, supplier matching, payment attribution, cap status, uplift check, flags, ranking, headline, coverage | `src/lib/engine.js` |
| `seed.mjs` | Fictional council, 24 suppliers, 24 contracts, 1,264 payments, 8 non-contracted suppliers (seeded RNG, aggregates exact) | `scripts/gen-data.mjs` (package.json already has `npm run data`) |
| `provenance.mjs` | 9 questions, 336 extractions with page, clause ref and quote, and the page text for the source viewer | `scripts/gen-data.mjs` |
| `gen-data.mjs` | Writes the whole dataset (`out/sample.json`, 686 KB, byte-identical on every run) from `seed.mjs` + `provenance.mjs`. A ready-made copy is at `ref/out/sample.json` | `scripts/gen-data.mjs` writing `src/data/sample.json` |
| `engine.test.mjs` | Golden test: asserts every number in section 6 (11 test groups, all passing) | `tests/engine.test.mjs` |
| `run.mjs`, `scen.mjs`, `tables.mjs`, `golden.mjs` | Scratch printers used to produce the numbers and tables in this document | not needed |

If you reuse them unchanged, every golden number in section 6 reproduces exactly. If you write your own generator, keep the PATTERNS (section 6.4) and recompute the numbers.

---

## 0. The ten decisions that shape everything

1. **Fictional council, fictional suppliers.** "Marchbank Borough Council (sample)". No real supplier. Real councils appear ONLY in a clearly labelled "Why this matters" evidence strip and the Roadmap, quoted from the spec with their links.
2. **Fixed as-of date `2026-10-06`**, a constant in the engine, labelled in the UI ("As at 6 October 2026"). `Date.now()` is never used in any derivation.
3. **Everything is derived, nothing is hard-coded.** The dataset holds contracts, extractions and payments. Radar bands, cap utilisation, uplift tests, flags, ranking and the headline are computed in the browser by the engine from those inputs, so the "how this is calculated" panels always match the numbers.
4. **Every flag links to clause + page + quoted text** via a source viewer (`#/source/<contractId>/<extractionId>`). A flag without a source link is a bug, not a design choice.
5. **Wording: "opportunities to investigate", never "savings".** The word "savings" appears only inside quoted evidence, the Sefton caveat, and the Stage 2 roadmap formula.
6. **Four must-haves are fully functional**: question set (9 questions), renewal radar, cap vs spend, opportunities list. **Uplift check (stretch) is built** because the data and engine make it cheap and it is the Sheffield story. Everything else is a static, honest Roadmap page.
7. **Conservative joins.** A payment counts against a contract's cap only if the supplier match is accepted (exact, normalised, alias, or fuzzy score at or above 0.90, or a user-confirmed suggestion). Suggested matches (0.70 to 0.89) and unmatched names are shown but excluded until confirmed. This is the Sefton lesson applied to data.
8. **Indicative £ rules are simple, shown, and cautious**: renewal = 5% of annual value per year; over cap = spend above cap; close to cap = projected spend above cap at the last-12-month pace; uplift = payments above what the index cap would allow. Each has a visible breakdown.
9. **A triage control makes the Sefton caveat tangible**: marking a flag "Explained" or "No action" removes it from the headline live (headline drops from £6.1m to £2.8m in the golden data when the Highways over-cap flag is explained).
10. **Hash routing and static files only.** No server, no CDN, works offline. Theme `data-theme="dark|light"` on `<html>`, default dark.

---

## 1. Spec digest

### 1.1 What the product is
Kontor already ingests council contracts and extracts commercial terms with clause-level provenance. The financial layer adds new questions and views on that engine. Stage 1 = one council on its own contracts (this prototype). Stage 2 = many councils joined up (NOT built). The comparison model: what the contract says (Kontor today) vs what was actually paid (prototype adds, from public Transparency Code spend) vs what other councils pay (Stage 2).

### 1.2 The four must-haves (build all four, functionally)

| # | Feature (spec wording) | What it does (spec) | Prototype surface |
|---|---|---|---|
| 1 | Financial question set | About 9 new questions: contract value and cap; start and end dates; extension options; notice period and auto-renewal; price review and indexation cap; payment terms; rate card; service credits; termination rights and exit fees | Contract detail page (9 question groups, each answer with confidence and a clause link) and the Contracts register |
| 2 | Renewal radar | Contracts entering their notice window in the next 3, 6 and 12 months, with value attached. "The Haringey finding as a screen" | `#/renewals` |
| 3 | Cap vs actual spend | Match Transparency Code payments to each contract by supplier; show spend to date against the cap; flag over or close. "The Guildford story". Supplier name matching is "the fiddliest part" | `#/spend` (three tabs) |
| 4 | Savings opportunities list | One ranked list combining renewals due, spend over cap and uplifts due, each with an indicative £, a reason and a clause link. The headline screen. Labelled "opportunities to investigate", not "savings" | `#/opportunities` and the Overview headline |

### 1.3 Stretch, Stage 2 and not-yet

| Item | Spec status | What we do |
|---|---|---|
| Uplift check | Stretch (contract indexation cap vs year-on-year change in payments) | BUILD. Three flagged contracts in the sample. Fully explained, volume caveat shown |
| Cross-council comparison | Stage 2 | Roadmap row only, no function |
| Invoice line-item matching | Not yet (council invoice data is not public) | Roadmap row only |
| Unclaimed service credits | Not yet (needs KPI performance data) | Roadmap row only. Note: the service credit REGIME is extracted (question 8); we do not compute unclaimed credits |
| Aggregation finder and framework fit | Not yet (needs more councils) | Roadmap row only |
| Agency rate benchmarking | Not yet (rate data is not published) | Roadmap row only |
| Stage 2 net saving formula and illustrative table | Stage 2 | Static, labelled "Illustrative numbers, made up to show the logic, not real data". NO calculator, no inputs |

### 1.4 Demo flow (about five minutes) and where it lands
1. **Headline**: "£X across N contracts flagged as opportunities to investigate" (Overview H1).
2. **Renewal radar**: next 3, 6 and 12 months (`#/renewals`).
3. **One over-cap contract**: click the flag, land on the clause and page (`#/opportunities` row, then `#/source/C-005/X-C-005-maximumValue`).
4. **Close**: "This is one council's public data. Imagine your full estate."

### 1.5 Prototype success goals and the UI that proves each

| Spec goal | Proof in the UI |
|---|---|
| 1. Answers correct, checked by hand | Source viewer shows the quoted clause beside each answer; optional "Mark answer as correct / incorrect" hand-check control with a running count (R59) |
| 2. Spend files join to contracts by supplier | Supplier matches tab (method, score, status), coverage meter ("84% of payments are linked to a contract"), per-contract payment list |
| 3. Every flag links to a clause and page | R24 (automated check clicks every row) |
| 4. A council contact reacts | Feedback dialog "Would you use this on your own contracts?" stored locally, copyable (R62) |

### 1.6 Risks and what the prototype does about them
- **Ingestion** (biggest risk: can Kontor batch-ingest public PDFs without a developer?). Out of scope for a front-end prototype. The About-this-data text says plainly that the sample was prepared for the demo and that batch ingestion is being tested separately. Do not imply a live ingestion capability.
- **Savings shrink on testing** (Sefton: £1.7m potential fell to possibly nil; its duplicate-payment software could not catch charges that differed from contract terms). Mitigations: wording, caveat banner, 5% cautious renewal rate, triage control, confidence badges, conservative matching.
- **Public contract pool is small** (Procurement Act 2023: contracts over £5m published for procurements started on or after 24 February 2025). Context for Roadmap and About-this-data only.

### 1.7 Open questions and the working assumption for the prototype

| Open question (spec) | Working assumption (state it in About this data and the Roadmap page) |
|---|---|
| Which council's public data do we build on? | None. Fictional "Marchbank Borough Council" with invented suppliers, structured exactly like a council's contracts and Transparency Code files, so a real council's data can replace `src/data/sample.json` later without UI change. |
| When is the demo and who is it for? | Assume a roughly five-minute live demo by a White Space Lead Solution Engineer to council commercial or contracts contacts, on a laptop or projector at 1440x900 or 1024x768, possibly without reliable internet. So: offline, deterministic, deep-linkable steps, and a "Demo guide" drawer. |
| Can Kontor batch-ingest public PDFs without dev involvement? | Not demonstrated. The prototype starts after ingestion: answers are shown as already extracted. |
| How many new questions before extraction quality drops? | Fixed at 9 (no more). Each answer shows a confidence band; the sample includes 2 low-confidence and 13 medium-confidence answers so the "Needs review" state is visible. |
| Simplest way to join Transparency Code spend to contracts by supplier? | Normalise names (lowercase, `&` to `and`, strip punctuation and legal suffixes, expand `svcs` and similar), then: exact, normalised equal, alias table, then character-bigram Dice similarity. Score at or above 0.90 accepted; 0.70 to 0.89 suggested for human confirmation; below 0.70 unmatched. Attribute an accepted payment to the supplier's contract whose dates contain the payment date; ambiguous ones stay unattributed. A company number would be a better key if the files had it (they usually do not). |

Spec ambiguity resolved: "contracts entering their notice window in the next 3, 6 and 12 months". We read this as: the date by which you must give notice (end date minus notice period) falls within the next 3, 6 or 12 calendar months of the as-of date. Contracts whose date has already passed get their own "Needs attention now" band, because those are the ones nobody tracked.

### 1.8 Evidence cases and the feature each supports (use in the evidence strip)

| Case | Exact summary to show (from the spec table) | Link text target | Supports |
|---|---|---|---|
| Exeter, June 2025 audit | Procurement wasn't consistently monitoring supplier spend against contract value; only 42% of supplier payments were linked to a purchase order | https://committees.exeter.gov.uk/documents/s100161/SMB.07.02d%20Appendix%204%20Procurement%20Action%20Plan.pdf | Cap vs spend, coverage meter |
| Haringey, January 2025 | External auditor raised a value-for-money risk over weak oversight of renewals and KPI monitoring | https://www.minutes.haringey.gov.uk/documents/s150205/15.2%20Appendix%202%20-%20Procurement%20Section.pdf | Renewal radar |
| Guildford, 2020 to 23, reported May 2024 | Spent £18.9m on a contract with a £5.4m maximum; later referred to police as a possible fraud | https://localgovernmentlawyer.co.uk/procurement-and-contracts/402-procurement-news/57355-whistleblowing-allegations-at-council-relating-to-13m-contract-overspend-went-unheard-report-suggests | Cap vs spend |
| Edinburgh, 2022/23 data, audited 2024 | £91m went to the top 100 suppliers with no contract on the register; total non-contracted spend was £134m (Scottish council) | https://www.edinburgh.gov.uk/downloads/file/35881/cd2402-non-contracted-spend-and-waivers | No-contract spend tab |
| Sefton (LGA), 2019 | £1.7m potential savings shrank to possibly nil once outliers turned out to have legitimate reasons | https://www.local.gov.uk/case-studies/testing-savings-around-contract-compliance-and-negotiation | The caveat |
| Sheffield (LGA), 2012/13 | Saved £15.5m across seven contracts, 8% of their annual cost; separately recovered £232,000 from a PFI where excessive indexation had been applied | https://www.local.gov.uk/sites/default/files/documents/L13-795%20Making%20savings%20from%20contract%20management.pdf | Uplift check, 5% renewal rate rationale |

Also available (spec) but optional: Gedling (only 2 of 10 contracts reviewed had KPIs; two high-value framework contracts missing from the register; March 2023), Windsor and Maidenhead (register incomplete, rebuilt by contacting about 85 officers; date not stated), Brighton and Hove (housing repairs overpayments via a subcontractor; date not stated). Use the six above; keep the strip to three visible with "Show all cases".

---

## 2. Product rules that apply to every requirement

**Routes** (hash routing; skip link must not change the hash, see `shell-port.md` 5.1):

| Hash | Page | Rail id |
|---|---|---|
| `#/overview` (default, also empty hash) | Overview and headline | `overview` |
| `#/opportunities` (+ `?type=overCap\|nearCap\|renewal\|uplift`, `?status=...`) | Ranked opportunities list | `opportunities` |
| `#/renewals` | Renewal radar | `renewals` |
| `#/spend`, `#/spend/matches`, `#/spend/no-contract` | Cap vs spend (three tabs) | `spend` |
| `#/contracts` , `#/contracts/<id>` | Register, contract detail | `contracts` |
| `#/source/<contractId>/<extractionId>` | Source viewer (clause and page) | keeps the rail item of the page that linked to it (`opportunities` default) |
| `#/method` | How this is calculated | none (reachable by links) |
| `#/roadmap` | Roadmap (Stage 2 and not yet) | `roadmap` |

**Rail** (in this order, FA icons verified present in the vendored Font Awesome 6.5.2): Overview `fa-solid fa-house`; Opportunities `fa-solid fa-magnifying-glass-dollar` (mobile caption "Flags"); Renewal radar `fa-regular fa-calendar-check` (caption "Renewals"); Cap vs spend `fa-solid fa-chart-line` (caption "Spend"); Contracts `fa-regular fa-folder-open`; Roadmap `fa-solid fa-diagram-project`. Do NOT caption anything "Savings".

**Header**: app tab "Kontor financial layer"; user chip initials `MB`, name "Marchbank commercial team" (no invented person); theme toggle first in the right cluster (see `shell-port.md` 5.2).

**Persistence** (all `localStorage` access wrapped in try/catch; the app must work with storage blocked): `kontor-theme`, `kontor-triage` (flag id to status), `kontor-matches` (raw supplier name to `confirm|reject`), `kontor-feedback`, `kontor-handcheck`, `kontor-assumptions`.

**Priority key**: must = needed for the five-minute demo or a hard user requirement; should = clearly improves the demo or the spec goals; could = nice if time allows.

---

## 3. Requirements

Each requirement lists: source (spec section or user request), behaviour, acceptance criteria (AC) that QA can check in a browser (all binary and observable), and priority. Numbers marked (golden) come from section 6 and hold when the reference seed is used unchanged.

### A. Shell, navigation, theme

**R1 [must] Everything lives inside the Springboard App Shell.** Source: user request ("build it inside the app shell template"). Behaviour: the product renders only inside the ported shell (`src/shell/AppShell.jsx`, built per `shell-port.md`): top header with tab strip, left icon rail, content slot `<main id="shell-main">`.
AC: (1) On every route at 1440x900, `header`, `nav[aria-label="Primary"]` and `main#shell-main` exist and the page content is a descendant of `main#shell-main`. (2) At 1440x900 the header is 72px tall and the rail is 64px wide. (3) The app tab reads "Kontor financial layer". (4) `git diff --stat -- design-system/` is empty. (5) Toasts and dialogs are the only elements rendered outside the shell body.

**R2 [must] Rail is real navigation.** Source: shell requirement. Behaviour: six rail items (section 2), each a button with `aria-label` and a tooltip, the active one with `aria-current="page"`.
AC: (1) Clicking each item sets `location.hash` to `#/overview`, `#/opportunities`, `#/renewals`, `#/spend`, `#/contracts`, `#/roadmap` and renders that page's single `<h1>`. (2) The active item is highlighted and has `aria-current="page"`; no other item has it. (3) Browser Back returns to the previous route. (4) Reloading on any route re-renders the same page. (5) An unknown hash renders the not-found state (copy in 7.9) with a "Go to overview" button.

**R3 [must] Deep links work.** Source: demo flow needs landing on a clause. Behaviour: every route in section 2 is addressable.
AC: Opening each of these in a fresh tab renders the right content with no console errors: `#/opportunities?type=overCap` (shows only Spend over cap rows, 3 in golden), `#/spend/matches`, `#/spend/no-contract`, `#/contracts/C-005`, `#/source/C-005/X-C-005-maximumValue` (shows page 23, clause 14.3), `#/method`, `#/roadmap`.

**R4 [must] One H1 and a document title per route.** AC: Each route has exactly one `<h1>` and `document.title` equals `<Page name> | Kontor financial layer` (Overview page title: `Overview | Kontor financial layer`).

**R5 [should] No dead controls.** Source: shell-port 5.1. Behaviour: Apps, Chat, Share, Notifications, Settings (if not wired to R64), Menu are inert in a prototype, so each shows a toast: "{Name} isn't part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo."
AC: Clicking each shows a DS Toast within 1 second; none does nothing silently; none navigates away.

**R6 [must] Dark and light theme toggle, default dark.** Source: user request.
AC: (1) With empty localStorage, `html[data-theme]` is `dark` before React mounts (check in a fresh Playwright profile at `domcontentloaded`, before `dist/app.js` has run). (2) The header toggle is a button with `aria-pressed` and an `aria-label`; click switches `data-theme` to `light`, click again to `dark`. Enter and Space both toggle. (3) The choice persists across reload (`kontor-theme`). (4) With storage blocked the toggle still works for the session. (5) No white flash on reload in dark. (6) Native controls and scrollbars follow the theme (`color-scheme`).

**R7 [must] Both themes pass WCAG AA on every route.** Source: Springboard rules.
AC: axe-core (wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice) reports 0 violations on each route in section 2 in dark and light at 1440x900, including the open flag drawer and the source viewer. Status is never conveyed by colour alone (each status badge has text, and an icon where the status is critical).

**R8 [should] Responsive.** AC: At 1440x900 and 1024x768 there is no horizontal page scroll; wide tables scroll inside their own container. At 390x844 the shell shows the bottom tab bar, the theme toggle stays reachable and no content is clipped (tables may scroll horizontally inside their container).

**R9 [must] Runs offline from static files.** Source: demo constraint. AC: With the network disabled, `python3 -m http.server` (or `npm run serve`) serves the app and every route works. A Playwright request log across all routes shows zero requests to any origin other than the page's own. No `<script>` or `<link>` points at a CDN.

**R10 [must] Fixed as-of date, shown in the UI.** Source: user brief; spec as-of 2026-10-06. AC: (1) Overview, Opportunities, Renewal radar, Cap vs spend and Contract detail each show "As at 6 October 2026". (2) Setting the browser clock to any other date (Playwright `clock.install`) changes no number or date on any page. (3) `grep -rn "Date.now()\|new Date()" src/` (the no-argument forms) finds no use inside `src/lib/engine.js`; the only allowed uses elsewhere are the timestamp on saved feedback and formatting a supplied date.

### B. Data labelling and trust

**R11 [must] Persistent sample-data banner.** Source: user rule ("sample data clearly labelled"). AC: On every route the banner in 7.1 is visible without scrolling, cannot be dismissed, is not covered by the header, and meets contrast in both themes. The header app tab carries a "Sample" badge.

**R12 [must] Fictional council and suppliers only.** Source: task rule. AC: (1) The council is named "Marchbank Borough Council". (2) No supplier, contract or payment record uses a real council or a supplier named in the spec. (3) The names Exeter, Haringey, Guildford, Edinburgh, Gedling, Windsor and Maidenhead, Brighton and Hove, Sefton, Sheffield, Camden appear only in the evidence strip, the caveat, the Method page rationale and the Roadmap. (4) Source viewer pages carry the label "Illustrative contract text written for this demo, not a real document."; payment tables carry the caption "Sample payments (fictional)".

**R13 [must] Every derived £ is labelled indicative; "savings" is never claimed.** Source: spec risks. AC: (1) Each flag £ figure, the headline and each breakdown card carries the word "indicative" (visible text, column header or tooltip reachable by keyboard). (2) Scanning the rendered text of every route for `/\bsavings?\b/i` finds matches only inside: the evidence strip, the Sefton caveat sentence, the Method page rationale, and the Roadmap. (3) No page title, rail label, button or card heading contains "saving".

**R14 [must] The Sefton caveat is on the headline and the list.** AC: The exact caveat in 7.2 appears on Overview and Opportunities, visible without opening anything, with a link "How this is calculated" to `#/method`.

**R15 [should] "About this data" disclosure.** Behaviour: a link in the banner opens a DS dialog (focus trapped, Esc closes) with the text in 7.3. AC: link exists on every route; dialog opens and closes with keyboard; focus returns to the link.

### C. Overview and headline

**R16 [must] Headline sentence is the Overview H1.** Source: demo step 1. Behaviour: `£{total compact} across {N} contracts flagged as opportunities to investigate`, computed from the counted flags (R23 rules). Singular: `across 1 contract flagged as an opportunity to investigate`.
AC: (golden) H1 text is exactly "£6.1m across 15 contracts flagged as opportunities to investigate"; hovering or focusing the figure shows the exact value "£6,145,238"; the number equals the sum of the "Indicative" column of the counted rows on `#/opportunities`; N equals the number of distinct contracts in those rows. Under the H1 sits the line "Indicative figures. As at 6 October 2026." and the caveat (R14).

**R17 [must] Headline breakdown by basis.** Behaviour: four stat cards under the headline, each linking to the filtered list. The units differ, so each card names its basis. AC: (golden) cards read: "Spend over cap £4.2m, 3 contracts, already paid above the cap"; "Close to cap £0.6m, 1 contract, projected at the current pace"; "Renewals £1.1m, 12 contracts, indicative value per year"; "Price increases above cap £0.3m, 3 contracts, already paid above the cap". Card values sum to the headline (4,172,000 + 642,478 + 1,075,500 + 255,260 = 6,145,238). Each card click opens `#/opportunities?type=...` with the same count.

**R18 [must] Renewal summary on Overview.** AC: (golden) shows "Next 3 months: 3 contracts, £6.9m a year", "3 to 6 months: 4, £7.3m", "6 to 12 months: 2, £2.2m" and "Needs attention now: 3". The block links to `#/renewals`.

**R19 [should] Coverage meter.** Source: spec goal 2, Exeter 42% evidence. Behaviour: a Progress meter "84% of payments are linked to a contract on the register" with the £ figures and a link to `#/spend/no-contract`. AC: (golden) 84.3% shown as "84%", "£129.4m of £153.5m"; text label present (not colour only).

**R20 [should] Evidence strip "Why this matters".** Source: spec Evidence section. AC: shows three cases from 1.8 with their exact summaries, each with a link that opens in a new tab with `rel="noopener noreferrer"` and visible text "(opens in a new tab)"; a "Show all cases" control reveals the rest; the strip states "Public cases summarised from the Kontor scope document. Follow each link to read the source."

**R21 [must] Close step.** Source: demo step 4. AC: Overview ends with a panel containing the exact line "This is one council's public data. Imagine your full estate." plus two buttons: "Give feedback" (primary, the only primary in that section) and "See what comes next" (outline, to `#/roadmap`).

**R22 [could] Demo guide drawer.** Behaviour: button "Open demo guide" on Overview opens a drawer with the four steps (7.8), each with a talking point and a link to its route. AC: four steps listed in order; each link lands on the described screen; Esc closes.

### D. Opportunities list (headline screen)

**R23 [must] Ranked list combining the flag types.** Source: must-have 4. Behaviour: one table of flags of types renewal, overCap, nearCap, uplift with indicative £ greater than 0, ranked by section 5.10. Columns: rank, opportunity (type badge, contract title, supplier), reason (one sentence, 7.5), indicative £ with basis label, action by, confidence, review status, source link.
AC: (golden) 19 rows; order of the first six is F-C-005-overCap £3,350,000, F-C-007-overCap £760,000, F-C-001-nearCap £642,478, F-C-003-renewal £310,000, F-C-004-uplift £188,200, F-C-002-renewal £145,000; ranks are 1 to 19 with no gaps; the list sum of counted rows equals the Overview headline.

**R24 [must] Every row links to the clause and page.** Source: spec goal 3 ("every flag links back to the clause and page"). Behaviour: a "View clause" link per row to `#/source/<contractId>/<extractionId>` using the flag's evidence field (renewal: `noticePeriod`; overCap and nearCap: `maximumValue`, or `awardedTotalValue` when no maximum is stated; uplift: `indexation`).
AC: (1) An automated check clicks "View clause" on all 19 rows: each lands on a source viewer whose contract equals the row's contract, whose page number is shown, and whose highlighted text equals the extraction quote. (2) There is no row without the link. (3) The link text includes the page, for example "View clause, page 23".

**R25 [must] "How this is calculated" per flag.** Behaviour: clicking a row (or "See calculation") opens a drawer: reason, a numbered breakdown with each input and the result line, confidence and why, the evidence link, the triage control, and a link to `#/method`. AC: (1) The last line of the breakdown equals the row's £ exactly. (2) Every input in the breakdown is shown with its unit. (3) For F-C-005-overCap the breakdown reads Spend to date £8,350,000, Cap £5,000,000, Spend above cap £3,350,000. (4) For F-C-004-uplift: earlier 12 months £2,060,000, increase allowed 3.0%, allowed payments £2,121,800, last 12 months £2,310,000, paid above £188,200. (5) Esc closes and returns focus to the row.

**R26 [must] Filters, sort and empty state.** Behaviour: type chips (All, Spend over cap, Close to cap, Renewals, Price increases above cap) with counts; status filter (default "Open", options All, Open, Reviewed); text search over contract title and supplier; sort select (Highest value first, Soonest action date, Type); "Clear filters" button. AC: (golden) type counts are Spend over cap 3, Close to cap 1, Renewals 12, Price increases above cap 3; selecting a chip filters rows and updates the totals bar; a search with no match shows the empty state in 7.9 and "Clear filters" restores all 19.

**R27 [must] Totals bar.** AC: Above the table: "Showing {n} opportunities, £{x} indicative" recomputed live from visible counted rows; with default filters it equals the headline.

**R28 [should] Watch list.** Behaviour: flags whose indicative £ is 0 (close to cap but the term ends before the cap is reached) listed under "Watch list" and not counted. AC: (golden) 2 rows: Grounds maintenance (89.1% of cap) and Mobile voice and data (90.8% of cap), each with "Indicative value £0. Not counted in the total." and a source link.

**R29 [could] Export opportunities.** Behaviour: one primary button "Export opportunities" downloads CSV (columns: rank, type, contract id, contract, supplier, indicative GBP, basis, reason, action by, confidence, status, page, clause, "Sample data" and as-of date). AC: the file has 19 data rows plus header; every row repeats "Sample data, as at 2026-10-06"; failure uses the error copy in 7.9.

**R30 [must] Deterministic ranking.** AC: ties break by severity (high, medium, low), then earlier action date, then flag id ascending; reloading never reorders rows; the sort select "Soonest action date" puts rows with no action date last.

### E. Renewal radar

**R31 [must] Radar bands with counts and value.** Source: must-have 2. Behaviour: three bands on the as-of date: "Next 3 months" (deadline from 6 Oct 2026 to 6 Jan 2027), "3 to 6 months" (to 6 Apr 2027), "6 to 12 months" (to 6 Oct 2027), each with contract count, annual value and total value, plus a "Needs attention now" group. Each contract appears in exactly one band.
AC: (golden) Next 3 months: 3 contracts, £6,930,000 a year (C-003, C-017, C-009 in deadline order: 31 Oct 2026, 1 Dec 2026, 31 Dec 2026). 3 to 6 months: 4 contracts, £7,250,000 (C-004 31 Jan 2027, C-005 and C-018 28 Feb 2027, C-002 31 Mar 2027). 6 to 12 months: 2 contracts, £2,180,000 (C-015 30 Apr 2027, C-014 30 Jun 2027). Needs attention now: Notice date passed 2 contracts £3,350,000 (C-016 30 Jun 2026, C-001 30 Sep 2026); Ended, still paying 1 contract £1,800,000 (C-007). 12 contracts are later than 12 months and are not on the radar (a line says so with a link to `#/contracts`). The band boundaries shown in the UI are the computed dates.

**R32 [must] Contract rows on the radar.** AC: each row shows title, supplier, annual value, end date, notice period as extracted ("6 months"), notice deadline, relative text ("25 days left" or "6 days ago"), an "Auto-renews" badge where applicable, the action line (7.6), a confidence badge, and a "View clause, page N" link to the notice clause. Within a band rows are ordered by deadline ascending.

**R33 [must] Notice deadline is derived exactly.** AC: (golden) C-001 end 31 Mar 2027 minus 6 months shows 30 Sep 2026; C-017 end 31 Dec 2026 minus 30 days shows 1 Dec 2026; C-018 (notice period not stated) shows deadline 28 Feb 2027 with the note "No notice period stated. We used the end date." and a "Needs review" badge.

**R34 [must] "Needs attention now" is prominent.** Behaviour: placed above the three bands with warning treatment (icon plus text, not colour only). AC: C-001 reads "The notice date passed 6 days ago" and C-016 reads "The notice date passed 98 days ago. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier."; C-007 reads "This contract ended on 30 April 2026. You have paid £780,000 since."

**R35 [should] Timeline visual.** Behaviour: horizontal timeline from the as-of date to 12 months later with a marker per notice deadline, labelled by contract id, with the three band boundaries drawn. Built from DOM and CSS (no hand-drawn SVG icons; chart colours from tokens, legible in both themes; if the `dataviz` skill is available to the build agent, follow it for colour and legend rules). AC: 9 markers in the window plus the 3 attention contracts shown at the left edge as "Already passed"; keyboard-focusable markers show a tooltip with title and deadline; non-colour cue (shape or label) for each band.

**R36 [must] Empty band copy.** AC: a band with no contracts shows "No notice dates fall in this period. Nothing needs your decision here." (set `renewals` data to an empty array in a test to check).

### F. Cap vs spend

**R37 [must] Cap vs spend table.** Source: must-have 3. Behaviour: table of all contracts with a testable cap: contract, supplier, cap (with basis and source labels), spend to date, utilisation (percentage text plus a meter), status badge (Over cap, Close to cap, Within cap), amount over cap. Default sort: utilisation descending.
AC: (golden) first rows: C-005 167.0% Over cap £3,350,000; C-007 114.1% Over cap £760,000; C-011 113.8% (annual cap) Over cap £62,000; C-001 94.8% Close to cap; C-017 90.8% Close to cap; C-009 89.1% Close to cap. Thresholds: status is Over cap when utilisation is above 100%, Close to cap from 85% to 100% inclusive, Within cap below 85% (C-004 at 80.6% is Within cap). Percentages shown with one decimal.

**R38 [must] Spend figures are traceable.** AC: Clicking or expanding a spend figure lists the contributing payments (date, transaction reference, name as paid, amount) and a subtotal equal to the figure to the penny; payments made after the contract end date are listed separately as "Paid after the end date" (C-007: 5 payments, £780,000).

**R39 [must] Cap basis, source and coverage are labelled.** AC: (1) A cap row says "Stated maximum" or "Contract value (no maximum stated)". (2) Basis says "Whole term" or "Per contract year". (3) For contracts that started before the spend files begin (C-003, C-016, C-018 in golden) the spend cell says "At least" and a note reads "Spend files start on 1 April 2022, so spend before that date is not counted. Utilisation may be higher."

**R40 [should] Annual caps are tested per contract year.** AC: (golden) C-011 (annual cap £450,000) shows contract years 1 to 4 with £430,000, £512,000, £447,000, £228,000 (year to date, not pro-rated); year 2 is marked over by £62,000; the row's utilisation is the worst year (113.8%).

**R41 [must] Over and close rows link to the clause.** AC: each Over cap or Close to cap row has "View clause, page N" to the cap clause (C-005: page 23, clause 14.3).

**R42 [should] Spend by contract year bars on Contract detail** (see R51).

### G. Supplier matching and no-contract spend

**R43 [must] Supplier matches tab.** Source: spec "supplier name matching is the fiddliest part". Behaviour: table of distinct payee names as written in the spend files: name as paid, matched supplier, method (Exact, Normalised, Alias, Similar name, Confirmed by you), score, status (Accepted, Suggested, Unmatched, Confirmed, Rejected), payment count, total.
AC: (golden) "KESTRELVALE FACILITIES SVCS LTD" is Normalised 0.98 Accepted; "Kestrelvale FM" is Alias 0.95 Accepted; "Larchmont Grounds Maintenance" is Similar name 0.73 Suggested, 6 payments, £300,000; "Mirefield Training Partners Ltd" is Unmatched. A "How matching works" disclosure states the thresholds (7.7).

**R44 [should] Confirm or reject a suggested match.** Behaviour: buttons "Confirm match" and "Reject match" on Suggested rows; the whole app recomputes. AC: (golden) after "Confirm match" on Larchmont Grounds Maintenance the Overview headline becomes "£6.2m across 15 contracts", Grounds maintenance (C-009) shows 102.7% Over cap £60,000 and leaves the watch list, and the row status is Confirmed; "Reject match" returns the numbers to the original; the decision survives a reload; "Reset demo changes" (R63) clears it.

**R45 [must] Conservative counting.** AC: Payments with a Suggested or Unmatched payee are never included in any cap, uplift or coverage-linked figure; the match table states "Suggested and unmatched payments are not counted until you confirm them."

**R46 [must] Spend with no contract on the register.** Source: Edinburgh evidence. Behaviour: tab "No contract on register" listing payees with accepted-or-unmatched spend and no contract, sorted by amount, with total and the caveat in 7.4.
AC: (golden) 8 suppliers totalling £23,830,000: Dunmoor Agency Staffing Ltd £9,300,000; Oakhaven Independent Care Placements Ltd £4,750,000; Harlowe Transport Hire Ltd £2,600,000; Corran Digital Consulting Ltd £2,400,000; Skerrow Temporary Accommodation Ltd £1,700,000; Bellmere Building Supplies Ltd £1,510,000; Pennywhistle Print and Mailing Ltd £1,060,000; Mirefield Training Partners Ltd £510,000. These are NOT in the headline and have no clause link; each row says why ("There is no contract to read, so there is no clause to link").

**R47 [should] Attribution rules are visible.** AC: the Method page and the matches tab state: payments are attributed to the supplier's contract whose dates contain the payment date; payments after the end date are attributed to the supplier's latest-ending contract and shown separately; payments that fit more than one contract stay unattributed.

### H. Contracts and the nine questions

**R48 [must] Contracts register.** AC: (golden) 24 rows; columns id, title, supplier, category, route, start, end, annual value, status (Live or Ended), flag count; search over title and supplier; category filter; row opens `#/contracts/<id>`; sortable by end date and annual value.

**R49 [must] Contract detail shows the nine questions.** Source: must-have 1. Behaviour: the nine question groups (7.10) in order Q1 to Q9, each field showing the answer in plain language, a confidence badge (High at 0.90 or above, Medium from 0.75 to 0.89, Needs review below 0.75), and "View clause, page N". "Not found" is a first-class answer with its own copy.
AC: (golden) C-005 shows 14 answered fields across 9 groups, each with a page; the cap answer reads "£5,000,000 for the whole term (stated maximum)" with "View clause, page 23"; C-003's cap field reads "No maximum stated. We used the contract value (£49,600,000)." with a link to the contract-value clause; C-018's notice period reads "Not found" with a "Needs review" badge (confidence 0.58).

**R50 [must] Derived panel on Contract detail.** AC: shows notice deadline and radar band, latest possible end date with all extensions used, next price review date, cap utilisation, and the uplift check result (a number or "Cannot test: {reason}"), each with a "How this is calculated" link to the matching section of `#/method`. Reasons used in golden: "Prices are fixed for the term, so there is no index to test" (C-005, C-007, C-014, C-017, C-021), "No index cap stated in the contract" (C-011), "Fewer than 24 months of payments in the contract term" (C-019, C-022, C-024). Other reasons the engine can return: "No price review clause found", "No payments in the earlier 12 months".

**R51 [should] Payments and spend by year.** AC: payments table paged 20 per page with date, reference, name as paid, matched supplier, amount; spend by contract year shown as a bar list with text values; totals equal R38.

**R52 [must] Contract detail lists its flags first.** AC: flags for the contract are listed at the top with type, indicative £ and a link to the same drawer as R25; a contract with no flags says "No opportunities flagged for this contract."

**R53 [should] Low-confidence answers are visible.** AC: any answer below 0.75 shows "Needs review"; a flag that relies on it shows confidence "Low" with the reason ("Relies on an answer Kontor is not sure about: notice period").

### I. Provenance and source viewer

**R54 [must] Source viewer.** Source: spec ("every flag links back to the clause and page it came from"). Behaviour: page layout with breadcrumb (Opportunities, contract title, clause), a document panel "Page {n} of {pageCount}" rendering the page blocks with the cited clause highlighted (mark with a visible, non-colour-only cue such as a heavier outline and the label "Cited clause"), and a side panel: question, answer, clause reference, page, quoted text, confidence, document title, and the label "Illustrative contract text written for this demo, not a real document."
AC: (1) For X-C-005-maximumValue the viewer shows "Page 23 of 70", "Clause 14.3", and the highlighted text equals the quote string exactly. (2) The highlighted block is scrolled into view on load. (3) "Back to opportunity" returns to the originating route (use the hash it came from or `#/opportunities`). (4) The panel shows document title "Highways reactive maintenance and minor works: agreement".

**R55 [must] Quote fidelity.** AC: for all 336 extractions, the highlighted block text is character-for-character equal to `provenance[0].quote` (automated test in `tests/`).

**R56 [must] Graceful missing page.** AC: `#/source/C-005/not-an-id` and a valid id whose page is not materialised show the copy in 7.9 and a "Open contract" button; no crash.

**R57 [should] Previous and next answer.** AC: "Previous answer" and "Next answer" buttons step through the contract's extractions in Q1 to Q9 order, updating the hash.

**R58 [should] Page text realism.** AC: the page shows clause references as headings, and non-cited blocks read "[Preceding clauses on this page are not included in the sample.]" style filler so nothing implies a full document.

**R59 [could] Hand-check control.** Source: spec goal 1 ("checked by hand"). Behaviour: on the source viewer, "Mark answer as correct" and "Mark answer as incorrect" toggle a per-answer state saved locally; the Contracts page shows "{n} of 336 answers checked by hand". AC: state persists across reload; counts update; clearing happens only via Reset demo changes.

### J. Uplift check (stretch)

**R60 [should] Uplift check runs and explains itself.** Source: stretch feature; Sheffield evidence. AC: (golden) flagged: C-004 Street lighting (payments +12.1% vs 3.0% cap, £188,200), C-012 Home-to-school transport (+7.2% vs 4.5%, £49,000), C-010 Social care case management software (+6.6% vs 3.0%, £18,060). Not flagged, and the result is visible on the contract page as "Within tolerance" or "Within cap": C-003 (+4.4% vs 4.0% cap, within the 1 percentage point tolerance), C-015 (+3.8% vs 3.0%, within tolerance), C-001 (+2.7% vs 3.0%), C-008 (+1.7% vs 3.0%). C-009 shows "Payments fell 53.7%" until the suggested payee match is confirmed; the derived panel then adds "A similar payee name has 6 payments (£300,000) waiting for your review." (could). Each flag's reason states the volume caveat (7.5).

### K. Triage, feedback, reset, assumptions

**R61 [should] Review status per flag.** Behaviour: select with To investigate (default), Under review, Explained, No action. Explained and No action are excluded from the headline and totals; reviewed flags move out of the default "Open" status filter (they stay visible under "Reviewed" and "All"), and the headline note shows "{£} excluded after your review". Persisted locally.
AC: (golden) set F-C-005-overCap to Explained: headline becomes "£2.8m across 15 contracts" (C-005 still has a renewal flag), note reads "£3,350,000 excluded after your review", Opportunities totals bar matches; set it back and the headline returns to £6.1m.

**R62 [should] Feedback.** Source: goal 4. Behaviour: dialog from "Give feedback" with the question "Would you use this on your own contracts?" (radio: Yes, Maybe, No), a textarea "What would make it more useful?", buttons "Save feedback" (primary) and "Cancel"; saved entries listed in the dialog with time and a "Copy feedback" button producing plain text.
AC: saving with no choice shows the error "Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again."; saving works with storage available; with storage blocked shows "Feedback not saved. Your browser is blocking local storage. Copy your comments instead."; "Copy feedback" copies text containing the answer, comment and as-of date.

**R63 [should] Reset demo changes (destructive, confirmed).** Behaviour: "Reset demo changes" (in the Settings drawer or footer) opens a confirm dialog "Reset your changes?" with "Cancel" (focused) and "Reset changes" (destructive). On confirm: clears triage, match decisions, hand-checks, feedback and assumptions, then shows toast "Changes reset. The demo is back to its starting numbers."
AC: dialog appears before any data is cleared; Cancel changes nothing; confirm restores headline £6.1m and shows the toast.

**R64 [could] Assumptions drawer.** Behaviour: opened by the header Settings gear; lets you pick the renewal rate (3%, 5% default, 8%) and near-cap threshold (80%, 85% default, 90%). AC: changing the rate to 8% changes the Overview headline to "£6.8m" in golden (renewals £1,720,800; total £6,790,538) and every breakdown that uses the rate; a banner in the drawer says "Changing assumptions changes every indicative figure."

### L. Method page

**R65 [must] "How this is calculated" page.** Source: user rule ("everything must be transparent in the UI"). Behaviour: `#/method` has anchored sections: As-of date; Notice deadline; Radar bands (with the computed boundary dates 6 Jan 2027, 6 Apr 2027, 6 Oct 2027); Spend and attribution; Supplier matching thresholds; Cap utilisation (basis, thresholds 85% and 100%); Uplift check; Indicative value per flag type (the 5% rate and rationale); Ranking; Confidence; What this does not do. Copy in 7.11.
AC: every formula in section 5 appears in plain language with a worked example using a golden contract; every threshold shown equals the engine constant; section anchors work (`#/method?s=cap`).

**R66 [must] Links to the method.** AC: "How this is calculated" links exist on Overview, Opportunities, Renewal radar, Cap vs spend, the flag drawer, and the derived panel, each going to the right section.

### M. Roadmap

**R67 [must] Roadmap page shows what is next and what is not built.** Source: spec stretch and not-yet table, Stage 2. Behaviour: (1) a status table with the rows in 1.3 and a status badge each (Built in this prototype, Stage 2, Not yet) and "What it needs" text; (2) a "Stage 2: joined-up view" panel with the six-step analysis and the net saving formula as plain text: "Net saving = (current annual cost − group annual cost) × years remaining − exit cost − switching cost"; (3) the illustrative example table labelled "Illustrative numbers, made up to show the logic, not real data" with the worked example (£2m a year; 8% is £160k a year, £400k over 2.5 years; less £120k exit cost and £30k switching cost gives £250k); (4) "What has to be true" list; (5) the line "Each council that runs Stage 1 ends up with a structured contract estate, which is the raw material Stage 2 needs, with that council's agreement to share it."
AC: all five items present; the table badge for Uplift check reads "Built in this prototype"; the page contains no input, slider, calculator or chart that computes anything; every not-built row carries the visible label "Not in this prototype".

**R68 [must] Termination data is shown as Stage 2 raw material.** Source: spec ("Termination terms extracted from day one"). AC: Contract detail Q9 shows termination for convenience, notice and exit fees for every contract, and the Roadmap says why these are extracted now.

### N. Accessibility, copy and quality

**R69 [must] Keyboard and focus.** AC: all interactive elements are reachable by Tab in a logical order; focus ring visible on every control in both themes (2px accent outline); dialogs and drawers trap focus, close on Esc and return focus to the trigger; the skip link is the first tab stop and moves focus to `main` without changing the hash; tables have a caption or `aria-label` and header cells with `scope`.

**R70 [must] Touch targets and layout.** AC: at `(pointer: coarse)` all buttons, chips, selects and links in toolbars are at least 44x44 CSS px; dense data tables may use 40px rows but their row actions still have a 44px hit area.

**R71 [must] Copy rules (Springboard voice).** AC (automated scan of rendered text on every route plus review): (1) no `!` in UI text; (2) no emoji or pictographic characters; (3) sentence case in headings, buttons, labels (only proper nouns, acronyms and "Kontor", "Springboard" capitalised); (4) buttons are [Verb]+[Object] ("View clause", "Open contract", "Confirm match"), never "OK", "Submit", "Click here", "Learn more"; (5) addresses the user as "you"; (6) errors follow [What] + [Why] + [How]; (7) numbers use `en-GB` grouping and "£".

**R72 [must] Springboard visual rules.** AC: Font Awesome icons only (one allowed custom SVG: the W logo in the shell); no CSS gradients on UI surfaces; no card with a coloured left border; status uses DS Badge or the kit Pill with text; max one primary button per section (page header counts as a section; check each page and dialog).

**R73 [must] Destructive actions confirmed.** AC: the only destructive action is Reset demo changes (R63); it has a confirm dialog and a toast. Reject match is reversible and does not need a dialog but shows a toast "Match rejected. {name} is now unmatched."

**R74 [must] Performance.** AC: first load of the built app on a local static server under 2 seconds on a laptop; route changes under 200 ms; engine computation for the whole estate under 150 ms in a console timing (about 6 ms in Node, so this is a regression guard); total JS plus data under 3 MB uncompressed.

**R75 [must] Data and engine are reproducible and tested.** AC: `npm run data` twice produces byte-identical `src/data/sample.json`; `node tests/engine.test.mjs` passes every golden number in section 6 (headline, ranked flags, bands, coverage, match statuses); the test fails if any rule constant changes silently.

**R76 [must] State is resilient.** AC: with `localStorage` throwing, the app renders every route and all features except persistence work; corrupted stored JSON is ignored (no crash).

**R77 [should] Tokens, not hex.** Source: Springboard rules. AC: colours, spacing, radii and shadows in `src/` come from Springboard custom properties (`var(--...)`); `grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.jsx --include=*.css` returns matches only inside `src/shell/shell.css` (the documented shell values) and the W logo.

**R78 [should] Presenter-friendly density.** AC: at 1440x900 the Overview headline, breakdown cards and radar summary are all visible without scrolling; at 1024x768 the headline and breakdown cards are.

### Requirement coverage check (spec to requirement)

| Spec item | Requirements |
|---|---|
| Question set (9) | R49, R50, R53, R54, R55, R68 |
| Renewal radar | R18, R31 to R36 |
| Cap vs actual spend | R37 to R42, R43 to R47 |
| Opportunities list | R16, R17, R23 to R30 |
| Uplift check (stretch) | R60 |
| Stage 2 / not yet | R67 |
| Demo flow | R16, R31, R24, R54, R21, R22 |
| Provenance on every flag | R24, R54, R55 |
| Goals 1 to 4 | R59, R43, R24, R62 |
| Risks (savings shrink) | R13, R14, R61 |
| Open questions | section 1.7, R15 |
| User hard requirements (Springboard, shell, theme) | R1, R6, R7, R72 |


---

## 4. Data model

TypeScript-ish. Conventions: dates are ISO `YYYY-MM-DD` strings (UTC, no times). Money is a JS number in pounds with at most 2 decimals; round with `Math.round(x*100)/100` after every sum and only round to whole pounds for display and for flag values. Percentages are fractions (`0.03` is 3%). Every id is a stable string. Stored data is INPUT only; everything in 4.8 and 4.9 is computed by the engine and never written to the dataset.

### 4.1 Dataset file shape (`src/data/sample.json`, bundled by esbuild, 686 KB: payments 371 KB, extractions and documents 266 KB)

```ts
interface SampleDataset {
  council: Council;
  suppliers: Supplier[];                 // 24, contract-holding suppliers only
  aliases: Record<string, string>;       // normalised alias -> supplierId (SupplierAlias table)
  questions: Question[];                 // 9
  contracts: Contract[];                 // 24
  extractions: Extraction[];             // 336 (14 fields x 24 contracts)
  documents: Record<string, ContractDocument>; // 24, keyed by documentId
  payments: SpendPayment[];              // 1,264 rows, sorted by date then payee
}
```

### 4.2 Council

```ts
interface Council {
  id: 'marchbank';
  name: 'Marchbank Borough Council';
  shortName: 'Marchbank';
  isFictional: true;                     // drives the sample banner
  type: 'Borough council';
  asOf: '2026-10-06';                    // FIXED. Engine reads this, never the clock
  spendDataFrom: '2022-04-01';           // first month of the spend files
  spendDataTo: '2026-09-30';             // last month of the spend files
  fileLabel: 'Transparency Code payments over £500 (sample)';
}
```

### 4.3 Supplier, alias, match

```ts
interface Supplier { id: string /* 'S-05' */; legalName: string; companyNumber: string /* fictional 8 digits */; isFictional: true }

// Alias table: trading names that appear in contract documents. Key is normaliseName(alias).
// Golden: { 'kestrelvale fm': 'S-01', 'quillon environmental': 'S-03' }
interface SupplierAlias { aliasNormalised: string; supplierId: string; source: 'contract_document' | 'payment_file' | 'manual' }

// One row per DISTINCT payee string in the spend files (computed, not stored).
interface SupplierMatch {
  rawName: string;                       // exactly as in the spend file
  normalised: string;
  supplierId: string | null;
  score: number;                         // 0..1, 2dp
  method: 'exact' | 'normalised' | 'alias' | 'fuzzy' | 'manual';
  status: 'auto_accepted' | 'suggested' | 'unmatched' | 'confirmed' | 'rejected';
  paymentCount: number;
  totalGBP: number;
}
```

Method scores: exact 1.00; normalised-equal 0.98; alias 0.95; fuzzy = Dice similarity on character bigrams of the normalised names, capped at 0.99. Status: any non-fuzzy method is `auto_accepted`; fuzzy is `auto_accepted` at 0.90 or above, `suggested` from 0.70 to 0.8999, `unmatched` below 0.70. `confirm` or `reject` decisions (stored in `kontor-matches`) override to `confirmed` (method becomes `manual`) or `rejected` (supplierId becomes null). Only `auto_accepted` and `confirmed` count.

### 4.4 Questions (the 9 financial questions)

```ts
interface Question {
  id: 'Q1'|'Q2'|'Q3'|'Q4'|'Q5'|'Q6'|'Q7'|'Q8'|'Q9';
  key: string; label: string; help: string;
  fields: FieldKey[];                    // an answer is stored per FIELD (a question can have several)
}
```

| Id | Label (sentence case) | Help text | Fields (FieldKey) | Answer type per field |
|---|---|---|---|---|
| Q1 | Contract value and cap | What is the contract worth, and what is the most the council can pay? | `estimatedAnnualValue`, `awardedTotalValue`, `maximumValue` | money; money; `{amountGBP, basis:'total_term'\|'annual'}` or null |
| Q2 | Start and end dates | When does the current term start and end? | `startDate`, `endDate` | date; date |
| Q3 | Extension options | How many extensions, how long, and who decides? | `extensions` | `{count, lengthMonths, decider:'council'\|'supplier'\|'mutual'\|'none'}` |
| Q4 | Notice period and auto-renewal | How much notice is needed, and does the contract renew by itself? | `noticePeriod`, `autoRenewal` | `{value, unit:'days'\|'months'}` or null; `{enabled, periodMonths}` |
| Q5 | Price review and indexation cap | Which index applies, and what is the cap on increases? | `indexation` | `{indexName:'CPI'\|'CPIH'\|'RPI'\|'Other'\|'None', capPct:number\|null, reviewMonthDay:'MM-DD'\|null}` |
| Q6 | Payment terms | How many days does the council have to pay a valid invoice? | `paymentTerms` | days (integer) |
| Q7 | Rate card | What unit rates and day rates are agreed? | `rateCard` | `Array<{item, unit, rateGBP}>` |
| Q8 | Service credits | Is there a service credit regime, and how does it work? | `serviceCredits` | `{present, perFailurePct?, monthlyCapPct?}` |
| Q9 | Termination rights and exit fees | Can the council leave early, on what notice, and at what cost? | `terminationForConvenience`, `exitFees` | `{allowed, noticeMonths}`; `{present, summary}` |

### 4.5 Extraction and provenance (the edge over spend-analytics tools)

```ts
type FieldKey = 'estimatedAnnualValue'|'awardedTotalValue'|'maximumValue'|'startDate'|'endDate'|'extensions'|'noticePeriod'|'autoRenewal'|'indexation'|'paymentTerms'|'rateCard'|'serviceCredits'|'terminationForConvenience'|'exitFees';

interface Extraction {
  id: string;                            // `X-${contractId}-${fieldKey}`, e.g. 'X-C-005-maximumValue'
  contractId: string;
  questionId: 'Q1'|...|'Q9';
  fieldKey: FieldKey;
  answer: unknown;                       // shape per 4.4; null when status is not found
  answerType: string;
  status: 'found' | 'not_found' | 'needs_review';   // needs_review is used when confidence < 0.75
  confidence: number;                    // 0..1 (High >= 0.90, Medium 0.75 to < 0.90, Needs review < 0.75)
  provenance: Provenance[];              // at least one when status is found
  reviewed: boolean;                     // true after a hand-check (R59), kept in localStorage not in the file
}
interface Provenance {
  documentId: string;                    // 'DOC-C-005'
  page: number;                          // 1-based page in the document
  clauseRef: string;                     // 'Clause 14.3', 'Schedule 4, paragraph 2.1', 'Contract Particulars, item 9'
  quote: string;                         // exact text; shown highlighted; equality-tested (R55)
  bbox?: [number, number, number, number]; // optional normalised [x, y, w, h] if a real PDF image is ever drawn; unused in the prototype
}
interface ContractDocument {
  id: string; contractId: string; title: string;       // 'Highways reactive maintenance and minor works: agreement'
  pageCount: number; isIllustrative: true;
  pages: Record<number, Array<{ clauseRef: string | null; text: string; extractionIds?: string[]; filler?: boolean }>>;
  // only pages that carry an extraction exist; others render the missing-page state (R56)
}
```

Provenance map used by flags (R24): renewal uses `noticePeriod` (also shows `autoRenewal`, `endDate`); overCap and nearCap use `maximumValue` when the contract's `cap.source` is `maximum_stated`, otherwise `awardedTotalValue`; uplift uses `indexation`. Page numbers in the generator: Contract Particulars page 3 (+0 to 4 per contract), extensions 9, payment terms 16, cap clause 19, termination 27, notice 28, exit fees 29, rate card 39, indexation 42, service credits 47 (each plus the same 0 to 4 offset). Golden: C-005 cap clause is page 23 of 70; C-001 notice clause page 28; C-004 indexation page 45.

### 4.6 Contract (resolved view of the answers, plus register fields)

```ts
interface Contract {
  id: string;                            // 'C-005'
  title: string;
  supplierId: string; supplierName: string;
  serviceCategory: string;               // 'Facilities management' | 'Adult social care' | 'Waste and recycling' | 'Highways and street lighting' | 'ICT' | 'Leisure and culture' | 'Housing' | 'Parks and open spaces' | 'Legal and professional' | 'Transport' | 'Catering' | 'Energy' | 'Fleet' | 'Parking and traffic'
  procurementRoute: 'Open procedure'|'Framework call-off'|'Dynamic purchasing system'|'Direct award'|'Light-touch regime'|'Concession'|'Other';
  documentId: string;
  // Q2 dates
  startDate: ISODate; endDate: ISODate;  // endDate = end of the CURRENT term
  termYears: number;                     // derived at build, 1dp
  // Q1 value and cap
  annualValueGBP: number | null;         // estimated annual value
  totalValueGBP: number | null;          // estimated total value over the initial term
  cap: { amountGBP: number; basis: 'total_term'|'annual'; source: 'maximum_stated'|'contract_value' } | null;
  // Q3 extensions
  extension: { count: number; lengthMonths: number; decider: 'council'|'supplier'|'mutual'|'none' };
  // Q4 notice and auto-renewal
  notice: { value: number; unit: 'days'|'months' } | null;       // null = not stated
  autoRenewal: { enabled: boolean; periodMonths: number | null };
  // Q5 price review
  indexation: { indexName: 'CPI'|'CPIH'|'RPI'|'Other'|'None'; capPct: number | null; reviewMonthDay: string | null };
  // Q6
  paymentTermsDays: number | null;
  // Q7
  rateCard: Array<{ item: string; unit: string; rateGBP: number }>;
  // Q8
  serviceCredits: { present: boolean; perFailurePct?: number; monthlyCapPct?: number };
  // Q9
  termination: { forConvenience: boolean; noticeMonths: number; exitFeesSummary: string };
  // provenance and quality
  extractionIds: Record<FieldKey, string>;
  confidence: Record<FieldKey, number>;
}
```

`endDate` is the end of the CURRENT term: if an extension has been exercised, the register carries the extended end date (the sample has no exercised extensions; "Latest end date if every extension is used" is derived as `addMonths(endDate, count x lengthMonths)`).

`cap` rule: if the contract states a maximum value, `cap = {amountGBP: maximum, basis, source:'maximum_stated'}`; otherwise `cap = {amountGBP: totalValueGBP, basis:'total_term', source:'contract_value'}` and the UI says "Contract value (no maximum stated)". Status is derived: `Ended` when `endDate < asOf`, else `Live`.

### 4.7 SpendPayment (Transparency Code payments over £500)

Columns follow the Local Government Transparency Code 2015 "expenditure exceeding £500" requirement as recalled (date; originating department; beneficiary; purpose summary; amount; irrecoverable VAT; unique transaction reference). gov.uk could not be fetched from this sandbox, so verify the exact column list against the Code and against the real file headers when a real council is chosen; real files vary in names and order, so keep a column-mapping step in any future importer.

```ts
interface SpendPayment {
  id: string;                  // transaction reference, 'MBC-2026-001101'
  date: ISODate;               // date the expenditure was incurred
  department: string;          // council department that originated it
  supplierNameRaw: string;     // beneficiary, EXACTLY as written (case, punctuation, abbreviations intact)
  purpose: string;             // summary of the purpose
  expenseType: string;         // expenditure category (commonly published; optional in real files)
  amountGBP: number;           // net amount
  vatIrrecoverableGBP: number; // 0 in the sample
  sourceFile: string;          // 'marchbank-payments-over-500-2026-04.csv'
  poRef?: string;              // optional, many files have it (Exeter evidence: only 42% linked to a PO); not used by the engine
}
```

### 4.8 Derived (computed at load and on every change; never stored)

```ts
type AttributedPayment = { payment: SpendPayment; supplierId: string|null; contractId: string|null;
  period: 'in_term'|'after_end'|'before_start'|'ambiguous'|'unmatched'|'no_contract'; matchScore: number };

interface SpendSummary {
  toDate: number;              // all attributed payments, start date onwards, INCLUDING any after the end date
  t12: number;                 // payments in (asOf-12 months, asOf]
  p12: number;                 // payments in (asOf-24 months, asOf-12 months]
  afterEndGBP: number; afterEndCount: number;
  paymentCount: number;
  byYear: Array<{ year: number; from: ISODate; to: ISODate; spendGBP: number; partial: boolean }>;  // contract years from the start date
  coverage: 'full' | 'partial';   // partial when startDate < council.spendDataFrom
  minMatchScore: number | null; latestPayment: ISODate | null;
}
interface CapStatus { testable: boolean; basis?: 'total_term'|'annual'; capGBP?: number; spendAgainstCap?: number;
  utilisation?: number; state?: 'over'|'near'|'ok'; excessGBP?: number; projectedExcessGBP?: number; yearsRemaining?: number }
interface UpliftCheck { testable: boolean; reason?: string; yoy?: number; capPct?: number; p12?: number; t12?: number; cappedBase?: number; excessGBP?: number; flagged?: boolean }
interface RadarPlacement { band: 'passed'|'ended'|'m3'|'m6'|'m12'|'later'; deadline: ISODate; usedEndDate: boolean }
```

### 4.9 Flag

```ts
interface Flag {
  id: string;                  // `F-${contractId}-${type}`, e.g. 'F-C-005-overCap'
  contractId: string;
  type: 'renewal' | 'overCap' | 'nearCap' | 'uplift';
  variant?: 'upcoming' | 'notice_passed' | 'out_of_contract';     // renewal only
  band?: RadarPlacement['band'];                                    // renewal only
  severity: 'high' | 'medium' | 'low';
  indicativeGBP: number;       // whole pounds, >= 0
  basis: 'per_year' | 'one_off' | 'projected';  // labels: "Per year", "Already paid", "Projected at the current pace"
  actionBy: ISODate | null;    // renewal: notice deadline; uplift: next price review date; others null
  breakdown: Array<{ label: string; value: number; kind?: 'pct'|'num'|'result'; note?: string }>;  // last item is the result and equals indicativeGBP
  confidence: 'high' | 'medium' | 'low';
  evidenceFields: FieldKey[];  // which extractions to link, first one is the primary "View clause" target
  status: 'to_investigate' | 'under_review' | 'explained' | 'not_an_issue';  // from kontor-triage, default to_investigate
}
```

`counted(f) = f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review')`. Headline total and N come only from counted flags. Flags with `indicativeGBP === 0` go to the Watch list.

---

## 5. Derivations (exact; implemented and tested in `ref/engine.mjs`)

### 5.0 Pipeline (wire this once, recompute on every change)

```js
// src/lib/estate.js
import data from '../data/sample.json';
import * as E from './engine.js';          // copy of ref/engine.mjs
export function computeEstate({ decisions = {}, triage = {}, assumptions = {} } = {}) {
  const opts = { ...E.DEFAULTS, ...assumptions };
  const matches = E.buildMatches(data.payments, data.suppliers, data.aliases, decisions, opts);   // Map<rawName, SupplierMatch>
  const attributed = E.attribute(data.payments, matches, data.contracts);                          // AttributedPayment[]
  const res = E.buildFlags({ council: data.council, contracts: data.contracts, matches, attributed }, opts, E.AS_OF, triage);
  return { data, opts, matches, attributed, ...res, coverage: E.coverage(attributed, matches) };
}
// component: const estate = useMemo(() => computeEstate({ decisions, triage, assumptions }), [decisions, triage, assumptions]);
```

`buildFlags` returns `{ flags, ranked, watch, summaries, derived, totals }`: `flags` is every flag, `ranked` is the counted-or-reviewed flags with indicative £ above 0 in rank order, `watch` the £0 flags, `summaries[contractId]` the spend summary, `derived[contractId]` the radar band, notice deadline, spend summary, cap status and uplift check (the engine never mutates contract objects), and `totals` the headline. A full recompute of the whole estate takes about 6 ms in Node (1,264 payments), so recompute on every triage or match change; no memoisation tricks needed.

Constants (show every one on `#/method` and in the Assumptions drawer):

```js
export const DEFAULTS = {
  renewalRate: 0.05,        // indicative value of renegotiating or re-procuring: 5% of annual value
  nearCapThreshold: 0.85,   // utilisation >= 85% (and <= 100%) is "near cap"
  upliftTolerancePp: 0.01,  // payments must exceed the index cap by more than 1 percentage point
  upliftMinGBP: 10000,      // and the excess must be at least GBP 10,000
  autoAcceptScore: 0.90,    // supplier match score >= 0.90 is accepted without review
  suggestScore: 0.70,       // 0.70 to < 0.90 is shown as a suggestion and excluded until confirmed
};
```

### 5.1 As-of date and date arithmetic

`AS_OF = '2026-10-06'`. All date maths is UTC on ISO strings. Month arithmetic clamps to the last day of the target month (so 31 March minus 6 months is 30 September; 29 Feb 2024 plus 12 months is 28 Feb 2025). Windows are half-open on the left: `(from, to]`.

```js
const MS = 86400000;
const toMs = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(toMs(iso) + n * MS);
export const addMonths = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return toIso(+first);
};
export const diffDays = (a, b) => Math.round((toMs(a) - toMs(b)) / MS); // a minus b
export const round2 = (x) => Math.round(x * 100) / 100;
export const round0 = (x) => Math.round(x);
```

Boundaries from the as-of date: `addMonths(AS_OF, 3) = 2027-01-06`, `addMonths(AS_OF, 6) = 2027-04-06`, `addMonths(AS_OF, 12) = 2027-10-06`. Trailing windows: T12 = `(2025-10-06, 2026-10-06]`, P12 = `(2024-10-06, 2025-10-06]`.

### 5.2 Notice deadline

`noticeDeadline = endDate minus noticePeriod` (months by calendar months, days by days). If no notice period is stated, use the end date and set `usedEndDate = true` (the UI says "No notice period stated. We used the end date." and the answer shows Needs review). Radar uses the CURRENT term end date, not the latest end with extensions.

```js
export function noticeDeadline(endDate, notice) {
  // notice = { value:number, unit:'days'|'months' } | null
  if (!endDate) return { date: null, usedEndDate: false };
  if (!notice || notice.value == null) return { date: endDate, usedEndDate: true }; // not stated: fall back to end date
  const date = notice.unit === 'months' ? addMonths(endDate, -notice.value) : addDays(endDate, -notice.value);
  return { date, usedEndDate: false };
}
```

What the notice means, for the action line: auto-renewal enabled = "serve notice to stop it renewing"; auto-renewal off with an extension option = "decide whether to extend"; neither = "plan the re-procurement".

### 5.3 Radar band

```js
export function radarBand(contract, asOf = AS_OF) {
  const { endDate } = contract;
  const dl = noticeDeadline(endDate, contract.notice).date;
  if (diffDays(endDate, asOf) < 0) return { band: 'ended', deadline: dl };
  if (diffDays(dl, asOf) < 0) return { band: 'passed', deadline: dl };
  if (dl <= addMonths(asOf, 3)) return { band: 'm3', deadline: dl };
  if (dl <= addMonths(asOf, 6)) return { band: 'm6', deadline: dl };
  if (dl <= addMonths(asOf, 12)) return { band: 'm12', deadline: dl };
  return { band: 'later', deadline: dl };
}
```

| Band | Rule (deadline = notice deadline) | Label |
|---|---|---|
| `ended` | endDate before asOf | Ended, still paying. Shown on the radar and flagged only when payments exist after the end date (`afterEndGBP > 0`); an ended contract with no later payments is history and appears only in the Contracts register as Ended |
| `passed` | endDate on or after asOf, deadline before asOf | Notice date passed |
| `m3` | asOf <= deadline <= 2027-01-06 | Next 3 months |
| `m6` | 2027-01-06 < deadline <= 2027-04-06 | 3 to 6 months |
| `m12` | 2027-04-06 < deadline <= 2027-10-06 | 6 to 12 months |
| `later` | deadline after 2027-10-06 | not on the radar |

Each contract is in exactly one band. A deadline equal to the as-of date is `m3` ("due today"). Relative text: `N days left` (N > 0), `Due today`, `N days ago` (N > 0 days past). Radar value = annual value (also show total value).

### 5.4 Supplier name matching

```js
const SUFFIXES = ['limited', 'ltd', 'plc', 'llp', 'llc', 'inc', 'co', 'company', 'uk', 'group', 'holdings', 'the'];
const ABBREV = { svcs: 'services', svc: 'services', serv: 'services', maint: 'maintenance', mgmt: 'management', intl: 'international' };
function bigrams(s) { const t = s.replace(/ /g, ''); const out = new Map(); for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); } return out; }
export function normaliseName(raw) {
  let s = raw.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ');
  s = s.split(/\s+/).filter(Boolean).map((t) => ABBREV[t] || t).filter((t) => !SUFFIXES.includes(t));
  return s.join(' ').trim();
}
export function dice(a, b) {
  const A = bigrams(a), B = bigrams(b); let inter = 0, na = 0, nb = 0;
  for (const [g, c] of A) { na += c; if (B.has(g)) inter += Math.min(c, B.get(g)); }
  for (const c of B.values()) nb += c;
  return na + nb === 0 ? 0 : (2 * inter) / (na + nb);
}
export function matchSupplier(rawName, suppliers, aliasTable = {}) {
  const raw = rawName.trim();
  const norm = normaliseName(raw);
  for (const s of suppliers) if (s.legalName.toLowerCase() === raw.toLowerCase()) return { supplierId: s.id, score: 1.0, method: 'exact' };
  for (const s of suppliers) if (normaliseName(s.legalName) === norm) return { supplierId: s.id, score: 0.98, method: 'normalised' };
  if (aliasTable[norm]) return { supplierId: aliasTable[norm], score: 0.95, method: 'alias' };
  let best = { supplierId: null, score: 0, method: 'fuzzy' };
  for (const s of suppliers) { const sc = dice(norm, normaliseName(s.legalName)); if (sc > best.score) best = { supplierId: s.id, score: sc, method: 'fuzzy' }; }
  best.score = Math.min(0.99, Math.round(best.score * 100) / 100);
  return best;
}
export function matchStatus(m, opts = DEFAULTS) {
  if (m.method !== 'fuzzy') return 'auto_accepted';
  if (m.score >= opts.autoAcceptScore) return 'auto_accepted';
  if (m.score >= opts.suggestScore) return 'suggested';
  return 'unmatched';
}
```

Other helpers used by the snippets in this section (`accepted(status)` is true for `auto_accepted` and `confirmed`; `sum(array)` adds and rounds to pence) are in `engine.mjs`.

Worked examples (golden): `KESTRELVALE FACILITIES SVCS LTD` normalises to `kestrelvale facilities services` equal to the contract supplier's, so Normalised 0.98. `Kestrelvale FM` normalises to `kestrelvale fm`, found in the alias table, Alias 0.95. `Larchmont Grounds Maintenance` vs `Larchmont Grounds Ltd` (`larchmont grounds maintenance` vs `larchmont grounds`) Dice 0.73, so Suggested. `Mirefield Training Partners Ltd` best Dice against any supplier is 0.55, so Unmatched. Unrelated names score 0.23 to 0.40.

### 5.5 Payment attribution and spend windows

```js
export function attribute(payments, matches, contracts) {
  const bySupplier = new Map();
  for (const c of contracts) { if (!bySupplier.has(c.supplierId)) bySupplier.set(c.supplierId, []); bySupplier.get(c.supplierId).push(c); }
  const out = []; // { payment, supplierId, contractId, period }
  for (const p of payments) {
    const m = matches.get(p.supplierNameRaw);
    if (!m || !accepted(m.status)) { out.push({ payment: p, supplierId: null, contractId: null, period: 'unmatched', matchScore: m ? m.score : 0 }); continue; }
    const cs = bySupplier.get(m.supplierId) || [];
    const inRange = cs.filter((c) => p.date >= c.startDate && p.date <= c.endDate);
    if (inRange.length === 1) out.push({ payment: p, supplierId: m.supplierId, contractId: inRange[0].id, period: 'in_term', matchScore: m.score });
    else if (inRange.length > 1) out.push({ payment: p, supplierId: m.supplierId, contractId: null, period: 'ambiguous', matchScore: m.score });
    else {
      const after = cs.filter((c) => p.date > c.endDate).sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
      if (after) out.push({ payment: p, supplierId: m.supplierId, contractId: after.id, period: 'after_end', matchScore: m.score });
      else out.push({ payment: p, supplierId: m.supplierId, contractId: null, period: cs.length ? 'before_start' : 'no_contract', matchScore: m.score });
    }
  }
  return out;
}
```

Rules: (1) only `auto_accepted` or `confirmed` payees are attributed; (2) a payment goes to the supplier's contract whose `[startDate, endDate]` contains the payment date; (3) if two or more contracts of the same supplier contain it, it is `ambiguous` and left out (none in golden; keep the rule and show the count if non-zero); (4) a payment after every contract's end goes to the supplier's latest-ending contract as `after_end`; (5) before any contract start it is `before_start` and left out; (6) payees with accepted matches but no contract cannot occur in golden (all contract suppliers have contracts).

```js
export function spendSummary(contract, attributed, council, asOf = AS_OF) {
  const mine = attributed.filter((a) => a.contractId === contract.id);
  const inTerm = mine;                                   // spend since start INCLUDING any paid after the end date
  const afterEnd = mine.filter((a) => a.period === 'after_end'); // reported separately as well
  const toDate = sum(inTerm.map((a) => a.payment.amountGBP));
  const t12From = addMonths(asOf, -12), p12From = addMonths(asOf, -24);
  const inWin = (a, from, to) => a.payment.date > from && a.payment.date <= to;
  const t12 = sum(inTerm.filter((a) => inWin(a, t12From, asOf)).map((a) => a.payment.amountGBP));
  const p12 = sum(inTerm.filter((a) => inWin(a, p12From, t12From)).map((a) => a.payment.amountGBP));
  const byYear = []; // contract years from start
  for (let k = 0; ; k++) {
    const from = addMonths(contract.startDate, 12 * k), toEx = addMonths(contract.startDate, 12 * (k + 1));
    if (from > asOf) break;
    const total = sum(inTerm.filter((a) => a.payment.date >= from && a.payment.date < toEx).map((a) => a.payment.amountGBP));
    byYear.push({ year: k + 1, from, to: addDays(toEx, -1), spendGBP: total, partial: toEx > asOf });
  }
  return {
    toDate, t12, p12, afterEndGBP: sum(afterEnd.map((a) => a.payment.amountGBP)), afterEndCount: afterEnd.length,
    paymentCount: inTerm.length, byYear,
    coverage: contract.startDate < council.spendDataFrom ? 'partial' : 'full',
    minMatchScore: inTerm.length ? Math.min(...inTerm.map((a) => a.matchScore)) : null,
    latestPayment: mine.length ? mine.map((a) => a.payment.date).sort().slice(-1)[0] : null,
  };
}
```

`toDate` deliberately includes `after_end` payments: the question is "how much has been paid since this contract started", and a contract that expired while payments continue is the Haringey and Guildford pattern. The over-cap reason names the after-end amount separately.

### 5.6 Cap utilisation

- **Reference amount**: `cap.amountGBP` (stated maximum if the contract has one, else the contract value).
- **Total-term basis**: utilisation = `toDate / cap`. Excess = `max(0, toDate - cap)`. Projected total at term end = `toDate + t12 * yearsRemaining` where `yearsRemaining = daysBetween(asOf, endDate)/365.25` (0 if ended). Projected excess = `max(0, projectedTotal - cap)`.
- **Annual basis**: split the payments into contract years from the start date. Utilisation = the worst year's spend / cap. Excess = sum over contract years of `max(0, yearSpend - cap)` (the current year is year-to-date and is NOT pro-rated, which is conservative). Projected excess for the current year = `max(0, ytd / fractionOfYearElapsed - cap)`.
- **Thresholds**: `over` when utilisation is above 1.00; `near` when it is 0.85 or above and 1.00 or below; otherwise `ok`.
- **Partial coverage**: when `startDate < council.spendDataFrom`, the figures are lower bounds. Label "At least". Do not suppress the flag (an over-cap lower bound is still over).

```js
export function capStatus(contract, sp, opts = DEFAULTS, asOf = AS_OF) {
  const cap = contract.cap; // { amountGBP, basis:'total_term'|'annual', source:'maximum_stated'|'contract_value' }
  if (!cap || !cap.amountGBP) return { testable: false };
  if (cap.basis === 'annual' && !sp.byYear.length) return { testable: false };
  const yearsRemaining = Math.max(0, diffDays(contract.endDate, asOf) / 365.25);
  let utilisation, excess, projectedExcess, spendAgainstCap;
  if (cap.basis === 'total_term') {
    spendAgainstCap = sp.toDate;
    utilisation = spendAgainstCap / cap.amountGBP;
    excess = Math.max(0, spendAgainstCap - cap.amountGBP);
    const projectedTotal = sp.toDate + sp.t12 * yearsRemaining;
    projectedExcess = Math.max(0, projectedTotal - cap.amountGBP);
  } else { // annual: compare each contract year with the cap (current year to date is NOT pro-rated)
    const worst = sp.byYear.reduce((m, y) => (y.spendGBP > m.spendGBP ? y : m), { spendGBP: 0 });
    spendAgainstCap = worst.spendGBP;
    utilisation = worst.spendGBP / cap.amountGBP;
    excess = round2(sp.byYear.reduce((s, y) => s + Math.max(0, y.spendGBP - cap.amountGBP), 0));
    const cur = sp.byYear[sp.byYear.length - 1];
    const elapsed = Math.max(0.05, Math.min(1, diffDays(asOf, cur.from) / 365.25));
    projectedExcess = Math.max(0, cur.spendGBP / elapsed - cap.amountGBP);
  }
  const state = utilisation > 1 ? 'over' : utilisation >= opts.nearCapThreshold ? 'near' : 'ok';
  return { testable: true, basis: cap.basis, capGBP: cap.amountGBP, spendAgainstCap: round2(spendAgainstCap), utilisation, state, excessGBP: round2(excess), projectedExcessGBP: round2(projectedExcess), yearsRemaining };
}
```

### 5.7 Uplift check

Eligible when the contract has an index with a stated cap, at least 24 months of the term lies before the as-of date (`startDate <= asOf - 24 months`) and P12 payments are above 0. `yoy = t12 / p12 - 1`. Capped base = `p12 * (1 + capPct)`. Excess = `t12 - cappedBase`. Flag when `yoy - capPct > 0.01` (more than 1 percentage point over) AND `excess >= £10,000`. Payment change is only a proxy for price change (volume can explain it, which is exactly the Sefton lesson), so the reason always says so.

```js
export function upliftCheck(contract, sp, opts = DEFAULTS, asOf = AS_OF) {
  const ix = contract.indexation;
  if (!ix) return { testable: false, reason: 'No price review clause found' };
  if (ix.indexName === 'None') return { testable: false, reason: 'Prices are fixed for the term, so there is no index to test' };
  if (ix.capPct == null) return { testable: false, reason: 'No index cap stated in the contract' };
  if (contract.startDate > addMonths(asOf, -24)) return { testable: false, reason: 'Fewer than 24 months of payments in the contract term' };
  if (!(sp.p12 > 0)) return { testable: false, reason: 'No payments in the earlier 12 months' };
  const yoy = sp.t12 / sp.p12 - 1;
  const cappedBase = sp.p12 * (1 + ix.capPct);
  const excess = round2(sp.t12 - cappedBase);
  const flagged = yoy - ix.capPct > opts.upliftTolerancePp && excess >= opts.upliftMinGBP;
  return { testable: true, yoy, capPct: ix.capPct, p12: sp.p12, t12: sp.t12, cappedBase: round2(cappedBase), excessGBP: Math.max(0, excess), flagged };
}
```

### 5.8 Indicative £ per flag type

| Type | Basis | Indicative £ | Inputs shown in the breakdown | Why this rule |
|---|---|---|---|---|
| `renewal` (upcoming, notice_passed) | per year | `round(annualBase * 0.05)` | Annual value (and where it came from), indicative rate 5%, result | Sheffield (LGA, 2012/13) saved 8% of annual cost across seven contracts; Sefton (LGA, 2019) shows potential can shrink on testing, so we take 5%, below Sheffield's 8%. It is the value of using the decision point to renegotiate or re-procure for one year. |
| `renewal` (out_of_contract) | per year | `round(annualBase * 0.05)` | same | The contract has ended; same logic applied to the annual value |
| `overCap` | already paid | `round(excess)` | Spend to date (or the over-cap years), cap, spend above cap | Money paid above the contractual maximum. Hard to argue with, still needs testing (variations, approved extensions) |
| `nearCap` | projected | `round(projectedExcess)` | Spend to date, last 12 months of payments, years left in term, projected spend at end of term, cap, projected spend above cap | At the current pace you will exceed the cap before the term ends. If the projection is 0 the flag goes to the Watch list |
| `uplift` | already paid | `round(max(0, t12 - p12*(1+cap)))` | Payments earlier 12 months, increase allowed by cap, payments allowed under cap, payments last 12 months, paid above the capped increase | Matches the spec: payment change minus the indexation cap, times the base |

Annual base (renewal): the stated estimated annual value; else total value divided by term years; else T12 payments (label the source in the breakdown).

```js
export function annualBase(contract, sp) {
  if (contract.annualValueGBP) return { gbp: contract.annualValueGBP, source: 'Estimated annual value stated in the contract' };
  if (contract.totalValueGBP && contract.termYears) return { gbp: round2(contract.totalValueGBP / contract.termYears), source: 'Total contract value divided by term in years' };
  return { gbp: sp.t12, source: 'Payments in the last 12 months' };
}
```

### 5.9 Severity, confidence, action-by

- Severity: overCap high; nearCap medium; uplift high when excess is at least £100,000 else medium; renewal high when `notice_passed`, `out_of_contract` or band `m3`, medium for `m6`, low for `m12`.
- Confidence: the lowest of the relied-on extraction confidences (renewal: `noticePeriod`, `endDate`, `autoRenewal`; cap flags: the cap field plus `startDate` and `endDate`; uplift: `indexation`) and, for spend-based flags, the lowest supplier match score among the contract's payments. Map: 0.90 or above High, 0.75 to 0.8999 Medium, below 0.75 Low. Golden: only F-C-018-renewal is Low.
- Action by: renewal = notice deadline (null for out_of_contract); uplift = next price review date (the next occurrence of `reviewMonthDay` on or after the as-of date); cap flags = null.

```js
export function nextReviewDate(monthDay, asOf = AS_OF) {
  if (!monthDay) return null;
  const y = Number(asOf.slice(0, 4));
  const d = `${y}-${monthDay}`;
  return d >= asOf ? d : `${y + 1}-${monthDay}`;
}
```

### 5.10 Ranking, headline and triage

Sort key: `indicativeGBP` descending; then severity (high before medium before low); then `actionBy` ascending (null last); then flag id ascending. Headline total = sum of `indicativeGBP` over counted flags; N = distinct `contractId` over counted flags; the breakdown cards group counted flags by type. Triage `explained` and `not_an_issue` remove a flag from counted; the headline note shows the excluded sum.

```js
export function buildFlags(estate, opts = DEFAULTS, asOf = AS_OF, triage = {}) {
  const { council, contracts, matches, attributed } = estate;
  const flags = [];
  const summaries = {};
  const derived = {}; // per contract: { band, deadline, spend, cap, uplift }  (never mutate the contract objects)
  for (const c of contracts) {
    const sp = summaries[c.id] = spendSummary(c, attributed, council, asOf);
    const band = radarBand(c, asOf);
    const base = annualBase(c, sp);
    const lowestMatch = sp.minMatchScore;
    const matchConf = lowestMatch == null ? 1 : lowestMatch;
    const cf = (keys, withMatch) => { const x = Math.min(...keys.map((k) => (c.confidence && c.confidence[k] != null ? c.confidence[k] : 1)), withMatch ? matchConf : 1); return x >= 0.9 ? 'high' : x >= 0.75 ? 'medium' : 'low'; };
    const capKeys = c.cap.source === 'maximum_stated' ? ['maximumValue'] : ['awardedTotalValue'];

    // 1. renewal
    if (band.band !== 'later' && !(band.band === 'ended' && sp.afterEndGBP === 0)) { // an ended contract with no later payments is history, not a renewal
      let variant, severity, indicative, breakdown;
      if (band.band === 'ended') {
        variant = 'out_of_contract'; severity = 'high';
        indicative = round0(base.gbp * opts.renewalRate);
        breakdown = [{ label: 'Annual value', value: base.gbp, note: base.source }, { label: 'Indicative rate', value: opts.renewalRate, kind: 'pct' }, { label: 'Indicative value (per year)', value: indicative, kind: 'result' }];
      } else {
        variant = band.band === 'passed' ? 'notice_passed' : 'upcoming';
        severity = band.band === 'passed' || band.band === 'm3' ? 'high' : band.band === 'm6' ? 'medium' : 'low';
        indicative = round0(base.gbp * opts.renewalRate);
        breakdown = [{ label: 'Annual value', value: base.gbp, note: base.source }, { label: 'Indicative rate', value: opts.renewalRate, kind: 'pct' }, { label: 'Indicative value (per year)', value: indicative, kind: 'result' }];
      }
      flags.push({ id: `F-${c.id}-renewal`, contractId: c.id, type: 'renewal', variant, band: band.band, severity, indicativeGBP: indicative, basis: 'per_year', actionBy: variant === 'out_of_contract' ? null : band.deadline, breakdown, confidence: cf(['noticePeriod', 'endDate', 'autoRenewal'], variant === 'out_of_contract'), evidenceFields: ['noticePeriod', 'autoRenewal', 'endDate'] });
    }

    // 2. cap vs spend
    const cs = capStatus(c, sp, opts, asOf);
    if (cs.testable && cs.state === 'over') {
      flags.push({ id: `F-${c.id}-overCap`, contractId: c.id, type: 'overCap', severity: 'high', indicativeGBP: round0(cs.excessGBP), basis: 'one_off', actionBy: null,
        breakdown: cs.basis === 'annual'
          ? (() => { const over = sp.byYear.filter((y) => y.spendGBP > c.cap.amountGBP); return [{ label: 'Spend in the contract years over the cap', value: round2(over.reduce((s, y) => s + y.spendGBP, 0)) }, { label: `Cap for those years (${over.length} x annual cap)`, value: c.cap.amountGBP * over.length }, { label: 'Spend above cap', value: round0(cs.excessGBP), kind: 'result' }]; })()
          : [{ label: 'Spend to date', value: cs.spendAgainstCap }, { label: 'Cap', value: cs.capGBP }, { label: 'Spend above cap', value: round0(cs.excessGBP), kind: 'result' }],
        confidence: cf([...capKeys, 'startDate', 'endDate'], true), evidenceFields: capKeys });
    } else if (cs.testable && cs.state === 'near') {
      flags.push({ id: `F-${c.id}-nearCap`, contractId: c.id, type: 'nearCap', severity: 'medium', indicativeGBP: round0(cs.projectedExcessGBP), basis: 'projected', actionBy: null,
        breakdown: [{ label: 'Spend to date', value: sp.toDate }, { label: 'Last 12 months of payments', value: sp.t12 }, { label: 'Years left in term', value: round2(cs.yearsRemaining), kind: 'num' }, { label: 'Projected spend at end of term', value: round0(sp.toDate + sp.t12 * cs.yearsRemaining) }, { label: 'Cap', value: cs.capGBP }, { label: 'Projected spend above cap', value: round0(cs.projectedExcessGBP), kind: 'result' }],
        confidence: cf([...capKeys, 'startDate', 'endDate'], true), evidenceFields: capKeys });
    }

    // 3. uplift
    const up = upliftCheck(c, sp, opts, asOf);
    derived[c.id] = { band: band.band, deadline: band.deadline, spend: sp, cap: cs, uplift: up };
    if (up.testable && up.flagged) {
      flags.push({ id: `F-${c.id}-uplift`, contractId: c.id, type: 'uplift', severity: up.excessGBP >= 100000 ? 'high' : 'medium', indicativeGBP: round0(up.excessGBP), basis: 'one_off', actionBy: nextReviewDate(c.indexation.reviewMonthDay, asOf),
        breakdown: [{ label: 'Payments, earlier 12 months', value: up.p12 }, { label: 'Increase allowed by cap', value: up.capPct, kind: 'pct' }, { label: 'Payments allowed under cap', value: up.cappedBase }, { label: 'Payments, last 12 months', value: up.t12 }, { label: 'Paid above the capped increase', value: round0(up.excessGBP), kind: 'result' }],
        confidence: cf(['indexation'], true), evidenceFields: ['indexation'] });
    }
  }
  // triage and ranking
  for (const f of flags) f.status = triage[f.id] || 'to_investigate';
  const counted = (f) => f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review');
  const ranked = flags.filter((f) => f.indicativeGBP > 0).sort((a, b) => b.indicativeGBP - a.indicativeGBP || sevRank[b.severity] - sevRank[a.severity] || String(a.actionBy || '9999').localeCompare(String(b.actionBy || '9999')) || a.id.localeCompare(b.id));
  const watch = flags.filter((f) => f.indicativeGBP === 0);
  const totals = { totalGBP: 0, contractIds: new Set(), byType: { overCap: 0, nearCap: 0, renewal: 0, uplift: 0 } };
  for (const f of ranked.filter(counted)) { totals.totalGBP += f.indicativeGBP; totals.contractIds.add(f.contractId); totals.byType[f.type] += f.indicativeGBP; }
  return { flags, ranked, watch, summaries, derived, totals: { totalGBP: totals.totalGBP, contractCount: totals.contractIds.size, byType: totals.byType } };
}
```

### 5.11 Coverage and no-contract spend

`linked = sum of attributed payments with a contractId` (in term or after the end date); `total = all payments in the files`; `linkedPct = linked / total` (golden 84.28%, shown "84%"). No-contract spend = payments whose payee is unmatched or accepted-without-contract, grouped by payee name, sorted by amount (golden 8 payees, £23,830,000). Suggested payees (golden: Larchmont Grounds Maintenance, £300,000) are shown in the matches tab as "awaiting review" and in neither bucket.

```js
export function coverage(attributed, matches) {
  const total = sum(attributed.map((a) => a.payment.amountGBP));
  const linked = sum(attributed.filter((a) => a.contractId).map((a) => a.payment.amountGBP)); // in term or after the end date
  const noContract = new Map(), awaiting = new Map();
  for (const a of attributed.filter((x) => !x.contractId)) {
    const m = matches.get(a.payment.supplierNameRaw);
    const bucket = m && m.status === 'suggested' ? awaiting : noContract;
    const key = a.payment.supplierNameRaw;
    bucket.set(key, round2((bucket.get(key) || 0) + a.payment.amountGBP));
  }
  const list = (mp) => [...mp.entries()].map(([name, totalGBP]) => ({ name, totalGBP })).sort((x, y) => y.totalGBP - x.totalGBP);
  return { totalGBP: total, linkedGBP: linked, linkedPct: linked / total, noContract: list(noContract), awaitingReview: list(awaiting) };
}
```

### 5.12 Number and date formatting helpers

```js
export const fmtGBP = (x) => '£' + Math.round(x).toLocaleString('en-GB');
export const fmtGBPCompact = (x) => { // integer rounding on purpose: (8350000/1e6).toFixed(1) gives "8.3" in JS, humans expect 8.4
  const a = Math.abs(x);
  if (a >= 1e5) return '£' + (Math.round(x / 1e5) / 10).toFixed(1) + 'm';
  if (a >= 1e4) return '£' + Math.round(x / 1e3) + 'k';
  return fmtGBP(x);
};
export const fmtPct = (x, dp = 1) => (x * 100).toFixed(dp) + '%';
```

Dates: long "6 October 2026" in prose, short "6 Oct 2026" in tables. Relative: see 5.3. Percentages one decimal (`94.8%`); the coverage meter label rounds to a whole percent.


---

## 6. Sample dataset design and golden numbers

### 6.1 Rules for the sample

- The council, every supplier, every contract, every clause and every payment is INVENTED. Names were chosen to sound plausible and not to match any known company, but this has not been checked against Companies House (offline), so keep the banner, and if a real-looking name is later found to clash, rename it in `seed.mjs` and re-run the golden test.
- It is a dense sample on purpose: it contains every pattern the spec describes, so about two thirds of contracts carry a flag. Real estates would flag fewer. If challenged in a demo, say so; the banner already says it is sample data.
- Contract text is illustrative, written by templates in `provenance.mjs`; it is labelled as such on every source page.
- Spend files cover 1 April 2022 to 30 September 2026 (monthly CSV names `marchbank-payments-over-500-YYYY-MM.csv`), 1,264 payments over £500, dates between the 8th and 28th of a month (so no payment sits on a window boundary), amounts within a window exactly sum to the planned figure.

### 6.2 People and parties

Council: Marchbank Borough Council (sample). Persona in the header: "Marchbank commercial team" (initials MB).

Contract-holding suppliers (S-01 to S-24): Kestrelvale Facilities Services Ltd; Wrenfield Care Partners Ltd; Quillon Waste Services Ltd; Ordwell Lighting and Signs Ltd; Fennimore Highways Ltd; Brindlemere Leisure Trust; Pellam Digital Ltd; Ashmere Property Services Ltd; Larchmont Grounds Ltd; Hexmoor Software Ltd; Westerfield Legal LLP; Tarnbrook Passenger Transport Ltd; Dunmore Catering Services Ltd; Stonemere Energy Supply Ltd; Rookhope Fleet Solutions Ltd; Veridene Parking Services Ltd; Zennor Telecom Ltd; Aldwick Cleansing Ltd; Ivelet Library Systems Ltd; Norland Cleaning Services Ltd; Ashdene Risk Partners Ltd; Pennard Community Care CIC; Eastmoor Telecare Ltd; Halvorsen Contact Solutions Ltd.

Payees with NO contract on the register (8): Dunmoor Agency Staffing Ltd; Oakhaven Independent Care Placements Ltd; Harlowe Transport Hire Ltd; Corran Digital Consulting Ltd; Skerrow Temporary Accommodation Ltd; Bellmere Building Supplies Ltd; Pennywhistle Print and Mailing Ltd; Mirefield Training Partners Ltd.

### 6.3 The 24 contracts (register view)

| Id | Title | Supplier | Category | Route | Start | End | Notice (auto-renew) | Ext | Annual value | Cap (basis, source) | Index (cap) | Pay days |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C-001 | Integrated facilities management | Kestrelvale Facilities Services Ltd | Facilities management | Open procedure | 1 Apr 2022 | 31 Mar 2027 | 6 months | 2x12m council | £2,400,000 | £12,000,000 whole term, stated | CPI 3.0% | 30 |
| C-002 | Domiciliary care call-off | Wrenfield Care Partners Ltd | Adult social care | Framework call-off | 1 Apr 2023 | 31 Mar 2028 | 12 months | 1x24m mutual | £2,900,000 | £16,000,000 whole term, stated | CPI 4.0% | 28 |
| C-003 | Waste collection and recycling | Quillon Waste Services Ltd | Waste and recycling | Open procedure | 1 Feb 2019 | 31 Jan 2027 | 3 months (auto 12m) | none | £6,200,000 | £49,600,000 whole term, contract value | CPI 4.0% | 30 |
| C-004 | Street lighting and signage maintenance | Ordwell Lighting and Signs Ltd | Highways and street lighting | Open procedure | 1 Aug 2022 | 31 Jul 2027 | 6 months | 1x12m council | £2,200,000 | £11,000,000 whole term, stated | CPI 3.0% | 30 |
| C-005 | Highways reactive maintenance and minor works | Fennimore Highways Ltd | Highways and street lighting | Open procedure | 1 Jun 2022 | 31 May 2027 | 3 months | none | £1,000,000 | £5,000,000 whole term, stated | fixed | 30 |
| C-006 | Leisure centres management | Brindlemere Leisure Trust | Leisure and culture | Concession | 1 Apr 2022 | 31 Mar 2032 | 12 months | 1x60m mutual | £1,100,000 | £11,000,000 whole term, contract value | RPI 3.5% | 30 |
| C-007 | ICT managed service and end-user support | Pellam Digital Ltd | ICT | Framework call-off | 1 May 2023 | 30 Apr 2026 | 3 months | 2x12m council | £1,800,000 | £5,400,000 whole term, stated | fixed | 30 |
| C-008 | Housing repairs and voids | Ashmere Property Services Ltd | Housing | Open procedure | 1 Apr 2024 | 31 Mar 2029 | 6 months | 2x12m mutual | £4,000,000 | £22,000,000 whole term, stated | CPI 3.0% | 30 |
| C-009 | Grounds maintenance | Larchmont Grounds Ltd | Parks and open spaces | Open procedure | 1 Apr 2022 | 31 Mar 2027 | 3 months | 1x12m council | £420,000 | £2,200,000 whole term, stated | CPI 3.0% | 30 |
| C-010 | Social care case management software | Hexmoor Software Ltd | ICT | Framework call-off | 1 Jan 2024 | 31 Dec 2028 | 6 months (auto 12m) | 2x12m council | £480,000 | £2,400,000 whole term, contract value | CPI 3.0% | 30 |
| C-011 | Legal services panel | Westerfield Legal LLP | Legal and professional | Direct award | 1 Apr 2023 | 31 Mar 2028 | 3 months | none | £420,000 | £450,000 per year, stated | CPI no cap | 30 |
| C-012 | Home-to-school transport | Tarnbrook Passenger Transport Ltd | Transport | Dynamic purchasing system | 1 Sep 2022 | 31 Aug 2029 | 6 months | none | £1,700,000 | £12,500,000 whole term, stated | RPI 4.5% | 30 |
| C-013 | School meals catering | Dunmore Catering Services Ltd | Catering | Open procedure | 1 Sep 2023 | 31 Aug 2028 | 3 months | 1x12m council | £1,300,000 | £6,500,000 whole term, contract value | CPI 3.0% | 30 |
| C-014 | Electricity and gas supply | Stonemere Energy Supply Ltd | Energy | Framework call-off | 1 Oct 2024 | 30 Sep 2027 | 3 months | 1x12m council | £1,400,000 | £4,200,000 whole term, contract value | fixed | 14 |
| C-015 | Fleet vehicle lease and maintenance | Rookhope Fleet Solutions Ltd | Fleet | Open procedure | 1 Nov 2022 | 31 Oct 2027 | 6 months | 1x12m council | £780,000 | £4,300,000 whole term, stated | CPI 3.0% | 30 |
| C-016 | Parking enforcement services | Veridene Parking Services Ltd | Parking and traffic | Open procedure | 1 Jan 2020 | 31 Dec 2026 | 6 months (auto 12m) | none | £950,000 | £6,650,000 whole term, contract value | CPI 3.0% | 30 |
| C-017 | Mobile voice and data | Zennor Telecom Ltd | ICT | Framework call-off | 1 Jul 2023 | 31 Dec 2026 | 30 days (auto 12m) | none | £310,000 | £1,090,000 whole term, contract value | fixed | 30 |
| C-018 | Street cleansing | Aldwick Cleansing Ltd | Waste and recycling | Open procedure | 1 Mar 2021 | 28 Feb 2027 | not stated | none | £1,150,000 | £6,900,000 whole term, contract value | RPI 3.5% | 30 |
| C-019 | Library management system | Ivelet Library Systems Ltd | ICT | Framework call-off | 1 Apr 2025 | 31 Mar 2030 | 6 months | 1x24m council | £180,000 | £900,000 whole term, contract value | CPI 3.0% | 30 |
| C-020 | Civic buildings cleaning | Norland Cleaning Services Ltd | Facilities management | Open procedure | 1 Jun 2024 | 31 May 2029 | 6 months | 1x24m council | £620,000 | £3,100,000 whole term, contract value | CPI 3.0% | 30 |
| C-021 | Insurance brokerage | Ashdene Risk Partners Ltd | Legal and professional | Open procedure | 1 Apr 2023 | 31 Mar 2030 | 6 months | none | £340,000 | £2,380,000 whole term, contract value | fixed | 30 |
| C-022 | Adult day services | Pennard Community Care CIC | Adult social care | Light-touch regime | 1 Jan 2025 | 31 Dec 2029 | 6 months | 1x24m council | £1,600,000 | £8,800,000 whole term, stated | CPI 3.0% | 28 |
| C-023 | Telecare and community alarm service | Eastmoor Telecare Ltd | Adult social care | Open procedure | 1 Nov 2023 | 31 Oct 2028 | 6 months | 1x12m council | £740,000 | £3,700,000 whole term, contract value | CPI 3.0% | 30 |
| C-024 | Contact centre telephony | Halvorsen Contact Solutions Ltd | ICT | Framework call-off | 1 Feb 2025 | 31 Jan 2029 | 6 months | 1x12m council | £520,000 | £2,080,000 whole term, contract value | CPI 3.0% | 30 |


Not shown in the table (all generated, see `seed.mjs` and `provenance.mjs`): service credits present on 15 contracts (2% of monthly charges per missed KPI, capped at 10% of the monthly charge), termination for convenience on 22 (notice 1 to 6 months), exit fee text on 6 (for example C-003 "Unamortised vehicle costs, up to £1.2m", C-015 "Early termination charge equal to 50% of remaining lease rentals"), rate card 3 rows per contract from category templates, payment terms 14 to 30 days. Extraction confidence: all 0.93 to 0.98 except 13 Medium answers (rate cards on every third contract, service credits on every fifth) and C-018's notice period (0.58, status needs_review) and auto-renewal (0.70).

### 6.4 Patterns, the stories they tell, and the contract that carries each

| Pattern (spec evidence) | Where it appears | Why it works as a demo moment |
|---|---|---|
| Spend far above a contract's maximum (Guildford: £18.9m against a £5.4m maximum) | **C-005 Highways reactive maintenance and minor works**: £8,350,000 paid against a £5,000,000 stated maximum (167.0%), clause 14.3 on page 23. Excess £3,350,000 | The click-through: flag, then clause and page, then the quote "shall not exceed £5,000,000". Deliberately NOT the Guildford figures |
| Renewals nobody tracked (Haringey) | **C-001 Integrated facilities management** (largest FM contract, £2.4m a year): notice date 30 Sep 2026 passed 6 days before the as-of date. **C-016 Parking enforcement**: auto-renews 1 Jan 2027, notice date passed 98 days ago. **C-007 ICT managed service**: ended 30 Apr 2026 and £780,000 paid since | "The window closed last week" is the radar's instant "we didn't know that" moment |
| Spend with no contract on the register (Edinburgh) | 8 payees, £23.83m, led by Dunmoor Agency Staffing Ltd £9.3m (agency staff) and Oakhaven Independent Care Placements £4.75m | Shows contract register gaps with no clause to link, which is itself the argument for building the register from documents |
| Linking payments to purchase orders / contracts (Exeter 42%) | Coverage meter: 84% of £153.5m linked to a contract | A number that rises as the register is completed |
| Excess indexation (Sheffield recovered £232,000) | **C-004 Street lighting and signage**: payments +12.1% against a 3.0% CPI cap, £188,200 above the capped increase. Also C-012 (+7.2% vs 4.5%, £49,000) and C-010 (+6.6% vs 3.0%, £18,060) | The stretch feature. Near-misses (C-003, C-015) show it does not flag everything |
| Savings shrink on testing (Sefton) | Triage control: mark C-005 over-cap "Explained" and the headline falls from £6.1m to £2.8m live | The honest-framing moment that builds trust with a council contact |
| Fiddly supplier names | `KESTRELVALE FACILITIES SVCS LTD` (normalised), `Kestrelvale FM` (alias), and the suggestion `Larchmont Grounds Maintenance` (0.73). Confirming it flips C-009 Grounds maintenance from Close to cap (projected £0) to Over cap by £60,000 and moves the headline from £6.1m to £6.2m | The joining problem made visible and interactive |
| Close to cap | C-001 94.8% with projected overshoot £642,478; C-017 90.8% and C-009 89.1% on the Watch list with £0 | Shows the projection is not hysteria: near cap with no projected breach is not counted |
| Annual cap | C-011 Legal services panel: £450,000 per contract year, year 2 £512,000, over by £62,000 | Shows cap basis matters |
| Partial spend coverage | C-003, C-016, C-018 started before the files begin: "At least" labels | Honesty about data limits |
| Low-confidence extraction | C-018 Street cleansing notice period not stated (0.58) | Shows the review state and the "used end date" fallback |
| Cannot test | C-011 (no index cap), five fixed-price contracts, three contracts under 24 months | Shows the engine refuses to guess |

### 6.5 Spend generation rules (if you write your own generator)

Windows: early = `[max(start, 2022-04-01), 2024-10-06]`, p12 = `[2024-10-07, 2025-10-06]`, t12 = `[2025-10-07, min(end, 2026-09-30)]`. Each contract has a plan `{early, p12, t12}` in pounds; a window's payments sum exactly to its plan figure (last payment absorbs rounding). Cadence monthly (day 8 to 28), quarterly (months Jan, Apr, Jul, Oct, day 15) or annual (January, day 15). Amount weights 0.94 to 1.06 around the mean. Payee name variants: C-001 (3 forms), C-003 (3), C-005 and C-012 (2 each), plus the late variant for C-009 (`Larchmont Grounds Maintenance`, 2026-04-07 to 2026-09-30, £300,000 in six payments, replacing the original name from April 2026). C-007 has an extra window `2026-05-01` to `2026-09-30` for the £780,000 paid after the end date. C-011 uses contract-year windows. Seed `20261006`.

### 6.6 Golden results (AS_OF 2026-10-06, default constants)

**Headline**: £6,145,238 across 15 contracts, shown "£6.1m across 15 contracts flagged as opportunities to investigate". By type: spend over cap £4,172,000 (3 flags); close to cap £642,478 (1); renewals £1,075,500 (12); price increases above cap £255,260 (3). 19 ranked flags, 2 Watch list flags (C-009 and C-017, both £0).

**Ranked list**

| Rank | Flag id | Type | Contract | Indicative £ | Basis | Severity | Confidence | Action by |
|---|---|---|---|---|---|---|---|---|
| 1 | F-C-005-overCap | overCap | Highways reactive maintenance and minor works | £3,350,000 | one_off | high | high | none |
| 2 | F-C-007-overCap | overCap | ICT managed service and end-user support | £760,000 | one_off | high | high | none |
| 3 | F-C-001-nearCap | nearCap | Integrated facilities management | £642,478 | projected | medium | high | none |
| 4 | F-C-003-renewal | renewal (upcoming) | Waste collection and recycling | £310,000 | per_year | high | high | 31 Oct 2026 |
| 5 | F-C-004-uplift | uplift | Street lighting and signage maintenance | £188,200 | one_off | high | high | 1 Aug 2027 |
| 6 | F-C-002-renewal | renewal (upcoming) | Domiciliary care call-off | £145,000 | per_year | medium | high | 31 Mar 2027 |
| 7 | F-C-001-renewal | renewal (notice_passed) | Integrated facilities management | £120,000 | per_year | high | high | 30 Sep 2026 |
| 8 | F-C-004-renewal | renewal (upcoming) | Street lighting and signage maintenance | £110,000 | per_year | medium | high | 31 Jan 2027 |
| 9 | F-C-007-renewal | renewal (out_of_contract) | ICT managed service and end-user support | £90,000 | per_year | high | high | none |
| 10 | F-C-014-renewal | renewal (upcoming) | Electricity and gas supply | £70,000 | per_year | low | high | 30 Jun 2027 |
| 11 | F-C-011-overCap | overCap | Legal services panel | £62,000 | one_off | high | high | none |
| 12 | F-C-018-renewal | renewal (upcoming) | Street cleansing | £57,500 | per_year | medium | low | 28 Feb 2027 |
| 13 | F-C-005-renewal | renewal (upcoming) | Highways reactive maintenance and minor works | £50,000 | per_year | medium | high | 28 Feb 2027 |
| 14 | F-C-012-uplift | uplift | Home-to-school transport | £49,000 | one_off | medium | high | 1 Sep 2027 |
| 15 | F-C-016-renewal | renewal (notice_passed) | Parking enforcement services | £47,500 | per_year | high | high | 30 Jun 2026 |
| 16 | F-C-015-renewal | renewal (upcoming) | Fleet vehicle lease and maintenance | £39,000 | per_year | low | high | 30 Apr 2027 |
| 17 | F-C-009-renewal | renewal (upcoming) | Grounds maintenance | £21,000 | per_year | high | high | 31 Dec 2026 |
| 18 | F-C-010-uplift | uplift | Social care case management software | £18,060 | one_off | medium | high | 1 Jan 2027 |
| 19 | F-C-017-renewal | renewal (upcoming) | Mobile voice and data | £15,500 | per_year | high | high | 1 Dec 2026 |


**Per contract (radar band, spend, cap, uplift)**

| Id | Band | Notice deadline | Spend to date | Cap utilisation | Cap state | T12 vs P12 | Uplift result | Flags (indicative £) |
|---|---|---|---|---|---|---|---|---|
| C-001 | Notice date passed | 30 Sep 2026 | £11,380,000 | 94.8% | near | £2,620,000 vs £2,550,000 | 2.7% vs cap 3.0% | renewal £120,000; nearCap £642,478 |
| C-002 | 3 to 6 months | 31 Mar 2027 | £10,400,000 | 65.0% | ok | £3,050,000 vs £2,950,000 | 3.4% vs cap 4.0% | renewal £145,000 |
| C-003 | Next 3 months | 31 Oct 2026 | £27,470,000 (at least) | 55.4% | ok | £6,420,000 vs £6,150,000 | 4.4% vs cap 4.0% | renewal £310,000 |
| C-004 | 3 to 6 months | 31 Jan 2027 | £8,870,000 | 80.6% | ok | £2,310,000 vs £2,060,000 | 12.1% vs cap 3.0% FLAGGED | renewal £110,000; uplift £188,200 |
| C-005 | 3 to 6 months | 28 Feb 2027 | £8,350,000 | 167.0% | over | £2,350,000 vs £2,100,000 | Prices are fixed for the term, so there is no index to test | renewal £50,000; overCap £3,350,000 |
| C-006 | Later than 12 months | 31 Mar 2031 | £5,070,000 | 46.1% | ok | £1,150,000 vs £1,120,000 | 2.7% vs cap 3.5% | none |
| C-007 | Ended, still paying | 30 Jan 2026 | £6,160,000 | 114.1% | over | £1,830,000 vs £1,780,000 | Prices are fixed for the term, so there is no index to test | renewal £90,000; overCap £760,000 |
| C-008 | Later than 12 months | 30 Sep 2028 | £10,120,000 | 46.0% | ok | £4,120,000 vs £4,050,000 | 1.7% vs cap 3.0% | none |
| C-009 | Next 3 months | 31 Dec 2026 | £1,960,000 | 89.1% | near | £250,000 vs £540,000 | -53.7% vs cap 3.0% | renewal £21,000; nearCap £0 |
| C-010 | Later than 12 months | 30 Jun 2028 | £1,509,000 | 62.9% | ok | £531,000 vs £498,000 | 6.6% vs cap 3.0% FLAGGED | uplift £18,060 |
| C-011 | Later than 12 months | 31 Dec 2027 | £1,617,000 | 113.8% | over | £452,199 vs £475,944 | No index cap stated in the contract | overCap £62,000 |
| C-012 | Later than 12 months | 28 Feb 2029 | £7,280,000 | 58.2% | ok | £1,930,000 vs £1,800,000 | 7.2% vs cap 4.5% FLAGGED | uplift £49,000 |
| C-013 | Later than 12 months | 31 May 2028 | £4,110,000 | 63.2% | ok | £1,360,000 vs £1,330,000 | 2.3% vs cap 3.0% | none |
| C-014 | 6 to 12 months | 30 Jun 2027 | £2,750,000 | 65.5% | ok | £1,300,000 vs £1,450,000 | Prices are fixed for the term, so there is no index to test | renewal £70,000 |
| C-015 | 6 to 12 months | 30 Apr 2027 | £3,130,000 | 72.8% | ok | £830,000 vs £800,000 | 3.8% vs cap 3.0% | renewal £39,000 |
| C-016 | Notice date passed | 30 Jun 2026 | £4,280,000 (at least) | 64.4% | ok | £970,000 vs £960,000 | 1.0% vs cap 3.0% | renewal £47,500 |
| C-017 | Next 3 months | 1 Dec 2026 | £990,000 | 90.8% | near | £320,000 vs £310,000 | Prices are fixed for the term, so there is no index to test | renewal £15,500; nearCap £0 |
| C-018 | 3 to 6 months | 28 Feb 2027 | £5,260,000 (at least) | 76.2% | ok | £1,190,000 vs £1,170,000 | 1.7% vs cap 3.5% | renewal £57,500 |
| C-019 | Later than 12 months | 30 Sep 2029 | £276,000 | 30.7% | ok | £181,000 vs £95,000 | Fewer than 24 months of payments in the contract term | none |
| C-020 | Later than 12 months | 30 Nov 2028 | £1,386,000 | 44.7% | ok | £640,000 vs £626,000 | 2.2% vs cap 3.0% | none |
| C-021 | Later than 12 months | 30 Sep 2029 | £1,200,000 | 50.4% | ok | £340,000 vs £340,000 | Prices are fixed for the term, so there is no index to test | none |
| C-022 | Later than 12 months | 30 Jun 2029 | £2,690,000 | 30.6% | ok | £1,640,000 vs £1,050,000 | Fewer than 24 months of payments in the contract term | none |
| C-023 | Later than 12 months | 30 Apr 2028 | £2,295,000 | 62.0% | ok | £760,000 vs £745,000 | 2.0% vs cap 3.0% | none |
| C-024 | Later than 12 months | 31 Jul 2028 | £806,000 | 38.8% | ok | £526,000 vs £280,000 | Fewer than 24 months of payments in the contract term | none |


**Radar summary**

| Group | Contracts | Annual value | Total value | Notice deadlines |
|---|---|---|---|---|
| Needs attention now: Notice date passed | 2 (C-016, C-001) | £3,350,000 | £18,650,000 | 30 Jun 2026, 30 Sep 2026 |
| Needs attention now: Ended, still paying | 1 (C-007) | £1,800,000 | £5,400,000 | ended 30 Apr 2026 |
| Next 3 months (to 6 Jan 2027) | 3 (C-003, C-017, C-009) | £6,930,000 | £52,790,000 | 31 Oct 2026, 1 Dec 2026, 31 Dec 2026 |
| 3 to 6 months (to 6 Apr 2027) | 4 (C-004, C-005, C-018, C-002) | £7,250,000 | £37,400,000 | 31 Jan, 28 Feb, 28 Feb, 31 Mar 2027 |
| 6 to 12 months (to 6 Oct 2027) | 2 (C-015, C-014) | £2,180,000 | £8,100,000 | 30 Apr 2027, 30 Jun 2027 |
| Later than 12 months (not on the radar) | 12 | £13,000,000 | £74,060,000 | latest 31 Mar 2031 (C-006) |

**Supplier matches that are not exact (everything else is Exact 1.00)**

| Payee name as paid | Matched supplier | Method | Score | Status | Payments | Total |
|---|---|---|---|---|---|---|
| Dunmoor Agency Staffing Ltd | none | fuzzy | 0.33 | unmatched | 54 | £9,300,000 |
| Oakhaven Independent Care Placements Ltd | none | fuzzy | 0.26 | unmatched | 54 | £4,750,000 |
| KESTRELVALE FACILITIES SVCS LTD | Kestrelvale Facilities Services Ltd | normalised | 0.98 | auto_accepted | 19 | £3,962,403 |
| QUILLON WASTE SERVICES LIMITED | Quillon Waste Services Ltd | normalised | 0.98 | auto_accepted | 7 | £3,511,140 |
| Harlowe Transport Hire Ltd | none | fuzzy | 0.40 | unmatched | 54 | £2,600,000 |
| Corran Digital Consulting Ltd | none | fuzzy | 0.36 | unmatched | 54 | £2,400,000 |
| TARNBROOK PASSENGER TRANSPORT | Tarnbrook Passenger Transport Ltd | normalised | 0.98 | auto_accepted | 12 | £1,791,553 |
| Skerrow Temporary Accommodation Ltd | none | fuzzy | 0.23 | unmatched | 54 | £1,700,000 |
| Quillon Environmental | Quillon Waste Services Ltd | alias | 0.95 | auto_accepted | 3 | £1,568,815 |
| Bellmere Building Supplies Ltd | none | fuzzy | 0.33 | unmatched | 54 | £1,510,000 |
| FENNIMORE HIGHWAYS LIMITED | Fennimore Highways Ltd | normalised | 0.98 | auto_accepted | 8 | £1,431,738 |
| Kestrelvale FM | Kestrelvale Facilities Services Ltd | alias | 0.95 | auto_accepted | 6 | £1,263,304 |
| Pennywhistle Print and Mailing Ltd | none | fuzzy | 0.25 | unmatched | 54 | £1,060,000 |
| Mirefield Training Partners Ltd | none | fuzzy | 0.55 | unmatched | 18 | £510,000 |
| Larchmont Grounds Maintenance | Larchmont Grounds Ltd | fuzzy | 0.73 | suggested | 6 | £300,000 |


**Coverage**: total payments in the files £153,489,000; linked to a contract £129,359,000 (84.28%, shown "84%"); no contract on the register £23,830,000 (8 payees); awaiting match review £300,000 (1 payee).

**Payees with no contract on the register**

| Payee | Total paid in the files |
|---|---|
| Dunmoor Agency Staffing Ltd | £9,300,000 |
| Oakhaven Independent Care Placements Ltd | £4,750,000 |
| Harlowe Transport Hire Ltd | £2,600,000 |
| Corran Digital Consulting Ltd | £2,400,000 |
| Skerrow Temporary Accommodation Ltd | £1,700,000 |
| Bellmere Building Supplies Ltd | £1,510,000 |
| Pennywhistle Print and Mailing Ltd | £1,060,000 |
| Mirefield Training Partners Ltd | £510,000 |
| **Total (8 payees)** | **£23,830,000** |


**Scenario results (use these for the demo script and for tests)**

| Action | Headline | Contracts | What else moves |
|---|---|---|---|
| Start | £6,145,238 (£6.1m) | 15 | |
| Confirm match "Larchmont Grounds Maintenance" | £6,205,238 (£6.2m) | 15 | C-009 becomes Over cap £60,000 (102.7%), leaves the Watch list |
| Reject that match | £6,145,238 | 15 | nothing |
| Mark F-C-005-overCap "Explained" | £2,795,238 (£2.8m) | 15 | C-005 keeps its renewal flag |
| Mark F-C-005-overCap "Explained" and F-C-007-overCap "No action" | £2,035,238 (£2.0m) | 15 | |
| Renewal rate 8% | £6,790,538 (£6.8m) | 15 | renewals £1,720,800 |
| Renewal rate 3% | £5,715,038 (£5.7m) | 15 | |
| Near-cap threshold 80% or 90% | £6,145,238 | 15 | Watch list gains C-004 (80.6%) at 80%, loses C-009 at 90% |

### 6.7 Test file (`tests/engine.test.mjs`) must assert

Headline total 6,145,238 and N 15; ranked ids in the order above with their values; each contract's radar band and deadline; coverage 153,489,000 / 129,359,000; the five non-exact match methods and the Larchmont 0.73 Suggested; the scenario table; `addMonths('2027-03-31', -6) === '2026-09-30'`; `addMonths('2024-02-29', 12) === '2025-02-28'`; determinism (two `buildSample()` runs are deep-equal); quote fidelity for all 336 extractions (page block text equals quote).


---

## 7. UI copy deck (Springboard voice)

Voice rules applied: sentence case; you and your; no exclamation marks; no emoji; buttons are [Verb]+[Object]; errors are [What]+[Why]+[How]; British English; numbers `en-GB`. Compact money (headline, cards, radar totals) uses the engine's `fmtGBPCompact` (integer rounding, so £8,350,000 shows `£8.4m`); everywhere a figure is audited (tables, drawers, breakdowns) show the full amount `£8,350,000`.

### 7.1 Sample-data banner (every route, not dismissable)

> **Sample data.** Marchbank Borough Council, its suppliers, contracts and payments are fictional. They were written for this demo. [About this data]

Header app-tab badge: `Sample`.

### 7.2 The caveat (Overview and Opportunities)

Long form (default):
> Indicative figures. Each one is an opportunity to investigate, not a saving. In 2019 a Local Government Association case study found that £1.7m of one council's potential savings shrank to possibly nil once the outliers were tested, because many had legitimate reasons. Check each flag against its clause before you act. [How this is calculated]

Short form (flag drawer, export footer, tooltips on the headline):
> Indicative. An opportunity to investigate, not a saving. Test it against the contract before you act.

Tooltip on any "Indicative" column header: "Indicative means a prompt to investigate, calculated by the rules on the How this is calculated page. It is not a confirmed saving."

### 7.3 About this data (dialog)

Title: `About this data`

> **What is real.** Nothing. Marchbank Borough Council, its suppliers, contracts and payments are fictional. They were written for this demo.
>
> **What is realistic.** The contracts are written the way public contracts are written. The payment rows follow the columns councils publish under the Local Government Transparency Code for payments over £500. Every answer shows the clause and page it came from.
>
> **What this demo doesn't show.** Kontor reads contracts and extracts commercial terms as part of the wider product. This prototype starts after that step. Whether Kontor can take a batch of public PDFs without a developer is still being tested, so you won't see ingestion here.
>
> **Why one council.** Stage 1 shows what one council can learn from its own contracts and spend. Joining up councils is Stage 2 and is on the roadmap.
>
> **Fixed date.** Every figure is calculated as at 6 October 2026, whatever today's date is.

Button: `Close dialog` (a single-action dialog still follows [Verb]+[Object]).

### 7.4 Spend with no contract on the register (tab intro)

> **{N} payees, {£} paid, no contract on the register.** That doesn't mean something is wrong. The contract may sit under a framework, fall below the publication threshold, or be missing from the register. There is no contract text to read here, so there is no clause to link and these amounts are not in the headline total.

Row note: `No contract to read, so no clause to link.`

### 7.5 Overview, flag types, reasons

Headline (H1), exact pattern: `{compact £} across {N} contracts flagged as opportunities to investigate` (N is 1: `across 1 contract flagged as an opportunity to investigate`).
Under the headline: `Indicative figures. As at 6 October 2026.`
After triage: `{£} excluded after your review.`

Breakdown cards (title / big number / subline):
- Spend over cap / `£4.2m` / `3 contracts. Already paid above the cap.`
- Close to cap / `£0.6m` / `1 contract. Projected at the current pace.`
- Renewals / `£1.1m` / `12 contracts. Indicative value per year.`
- Price increases above cap / `£0.3m` / `3 contracts. Already paid above the cap.`

Type labels: `Spend over cap`, `Close to cap`, `Renewal decision`, `Price increase above cap`. Basis labels: `Already paid`, `Projected at the current pace`, `Per year`. Severity: `High`, `Medium`, `Low` (with an icon). Review status: `To investigate`, `Under review`, `Explained`, `No action`. Confidence: `High confidence`, `Medium confidence`, `Needs review`. Match status: `Accepted`, `Suggested`, `Unmatched`, `Confirmed by you`, `Rejected by you`. Cap status: `Over cap`, `Close to cap`, `Within cap`, `Cannot test`. Contract status: `Live`, `Ended`.

Reason templates (one sentence per flag; fill from the engine, format money in full):

| Flag | Reason |
|---|---|
| overCap, whole-term cap | `You have paid {spend} against a cap of {cap}. That is {pct} of the cap, {excess} over.` |
| overCap, annual cap | `In contract year {n} you paid {spend} against an annual cap of {cap}, {excess} over.` |
| overCap, after the end date | append: ` {afterEnd} of this was paid after the contract ended on {endDate}.` |
| nearCap | `You have used {pct} of the cap. At the pace of the last 12 months, spend reaches {projected} by {endDate}, {excess} over the cap.` |
| uplift | `Payments rose {yoy} year on year. The contract caps price increases at {cap}. That is {excess} more than the cap allows if volumes stayed flat. Volume changes may explain part of this.` |
| renewal | the action line in 7.6 |
| partial coverage | append: ` Spend files start on 1 April 2022, so the real figure may be higher.` |
| low confidence | append: ` This relies on an answer Kontor is not sure about: {field label}. Check the clause first.` |

### 7.6 Renewal action lines (choose by case)

| Case | Line |
|---|---|
| Auto-renews, deadline ahead | `Serve notice by {deadline} or this contract renews for {periodMonths} months.` |
| Auto-renews, deadline passed | `The notice date passed on {deadline}. This contract renews on {endDate+1 day} for {periodMonths} months unless you agree otherwise with the supplier.` |
| Extension option, deadline ahead | `Decide by {deadline} whether to extend. If you do nothing, the contract ends on {endDate}.` |
| Extension option, deadline passed | `The date to give notice of an extension passed on {deadline}. Agree any extension with the supplier in writing, or plan to re-procure before {endDate}.` |
| No extension, deadline ahead | `Plan the re-procurement. The contract ends on {endDate} and the notice date is {deadline}.` |
| No extension, deadline passed | `The notice date passed on {deadline}. The contract ends on {endDate}. Plan the re-procurement now.` |
| Notice not stated | `No notice period is stated in this contract. We used the end date ({endDate}) as the action date.` |
| Ended, payments continue | `This contract ended on {endDate}. You have paid {afterEnd} since. Decide whether to re-procure, extend in writing, or stop paying.` |
| Relative text | `{N} days left`, `Due today`, `The notice date passed {N} days ago` |

### 7.7 Matching copy

Disclosure "How matching works": `We clean each payee name (lower case, punctuation and words such as Ltd removed, short forms such as svcs expanded) and compare it with the supplier on each contract. An exact match, a cleaned match or a trading name taken from the contract is accepted. A similar name gets a score from 0 to 1: 0.90 or more is accepted, 0.70 to 0.89 is suggested for you to confirm, and anything lower is left unmatched. Suggested and unmatched payments are not counted until you confirm them.`
Row help for a suggestion: `Suggested because the names are similar ({score}) and the first payment under this name came {n} days after the last payment under {matched supplier}.` (build only the first clause if the date logic is not built).
Toasts: `Match confirmed. {n} payments ({£}) now count towards {contract title}.` / `Match rejected. {name} is now unmatched.`

### 7.8 Demo guide (drawer, four steps)

1. **Headline.** `Start with the number: £6.1m across 15 contracts flagged as opportunities to investigate. Point at the caveat and say why it is there.` Link: Open overview.
2. **Renewal radar.** `Show what is coming up in the next 3, 6 and 12 months. Then show the two notice dates that have already passed.` Link: Open renewal radar.
3. **One over-cap contract.** `Open the Highways reactive maintenance flag. £8.4m has been paid against a £5.0m maximum. Click View clause and land on clause 14.3, page 23.` Link: Open the highways flag.
4. **Close.** `This is one council's public data. Imagine your full estate.` Link: Give feedback.

Optional extras (strip below the steps): `Mark the highways flag as Explained and watch the headline drop. That is the caveat in action.` and `Confirm the Larchmont match on Cap vs spend, matches tab, and watch Grounds maintenance move from close to cap to over cap.`

### 7.9 Empty states, errors, toasts, dialogs

| Where | Copy |
|---|---|
| Opportunities, no filter match | Title `No opportunities match these filters.` Body `Clear the filters to see all {N}.` Button `Clear filters` |
| Opportunities, all reviewed | `Every opportunity has been reviewed. Reset your changes to see the starting list.` |
| Radar band empty | `No notice dates fall in this period. Nothing needs your decision here.` |
| Watch list empty | `No contracts are close to their cap without a projected breach.` |
| Matches tab, nothing to review | `Every payee is matched or has no contract. There is nothing for you to review.` |
| Contracts, search no match | `No contracts match "{query}". Check the spelling or clear the search.` Button `Clear search` |
| Source viewer, page not in sample | Title `This page isn't in the sample.` Body `The sample includes only the pages that hold an extracted clause. Open the contract to see its other answers.` Button `Open contract` |
| Route not found | Title `Page not found.` Body `That address doesn't match a screen in this prototype. Go to the overview to continue.` Button `Go to overview` |
| Export failed | `Export failed. Your browser blocked the download. Allow downloads for this page and try again.` |
| Feedback, nothing chosen | `Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again.` |
| Feedback, storage blocked | `Feedback not saved. Your browser is blocking local storage. Copy your comments instead.` Button `Copy feedback` |
| Feedback saved | toast `Feedback saved on this device. Thank you.` (no exclamation mark) |
| Feedback copied | toast `Feedback copied to your clipboard.` |
| Reset dialog | Title `Reset your changes?` Body `This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device. The demo goes back to its starting numbers.` Buttons `Cancel` (focused), `Reset changes` (destructive) |
| Reset done | toast `Changes reset. The demo is back to its starting numbers.` |
| Inert shell controls | `{Name} isn't part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo.` |
| Triage toast | `{Contract title}: marked {status}. The headline is now {compact £}.` |
| Hand-check toast | `Answer marked correct.` / `Answer marked incorrect.` |
| Theme toggle tooltip | `Switch to light mode` / `Switch to dark mode` |

Button vocabulary (use exactly): `View opportunities`, `View clause`, `View clause, page {n}`, `Open contract`, `Open demo guide`, `Open renewal radar`, `Give feedback`, `Save feedback`, `Copy feedback`, `See what comes next`, `Export opportunities`, `Confirm match`, `Reject match`, `Clear filters`, `Clear search`, `Reset demo changes`, `Reset changes`, `Previous answer`, `Next answer`, `Mark answer as correct`, `Mark answer as incorrect`, `Back to opportunity`, `Show all cases`, `Close dialog`, `Cancel`.

Screen titles and subtitles:

| Page | H1 | Subtitle |
|---|---|---|
| Overview | the headline sentence | eyebrow `Overview · Marchbank Borough Council · as at 6 October 2026` |
| Opportunities | `Opportunities to investigate` | `Ranked by indicative value. Each one links to the clause and page it came from.` |
| Renewal radar | `Renewal radar` | `Contracts whose notice date falls in the next 3, 6 and 12 months, and the ones where it has already passed.` |
| Cap vs spend | `Cap vs spend` | `What you have paid each supplier since the contract started, against the most the contract says you can pay.` |
| Contracts | `Contracts` | `24 contracts. Open one to see its nine financial answers and where each came from.` |
| Contract detail | contract title | `{Supplier} · {category} · {route}` |
| Source viewer | `{clauseRef}` | `{Contract title}, page {n} of {pageCount}` |
| Method | `How this is calculated` | `Every rule, threshold and assumption behind the numbers. Nothing here is hidden.` |
| Roadmap | `Roadmap` | `What this prototype does, what comes next, and what needs data we don't have yet.` |

Close panel: heading `This is one council's public data. Imagine your full estate.` (exact line, no extra words in the heading). Body: `You are looking at one council's contracts and spend. Your estate has more contracts, more suppliers and more renewals nobody is tracking.` Buttons: `Give feedback` (primary), `See what comes next` (outline).

Feedback dialog: title `Tell us what you think`; field `Would you use this on your own contracts?` (radio: `Yes`, `Maybe`, `No`); textarea label `What would make it more useful?`; helper `Your answer stays on this device unless you copy it.`; buttons `Save feedback` (primary), `Cancel`.

Evidence strip heading `Why this matters`; intro `Public cases summarised from the Kontor scope document. Follow each link to read the source.`; case lines are the exact summaries in 1.8, each prefixed by council, date and a feature chip (`Cap vs spend`, `Renewal radar`, `No-contract spend`, `Uplift check`, `The caveat`).

### 7.10 How each answer is worded on Contract detail

| Field | Found | Not found or special |
|---|---|---|
| estimatedAnnualValue | `£2,400,000 a year (estimated)` | `Not stated. We used total value divided by term.` |
| awardedTotalValue | `£12,000,000 over the initial term (estimated)` | `Not stated` |
| maximumValue | `£12,000,000 for the whole term (stated maximum)` or `£450,000 per contract year (stated maximum)` | `No maximum stated. We used the contract value ({£}).` |
| startDate, endDate | `1 April 2022`, `31 March 2027 (end of the current term)` | `Not found` |
| extensions | `Two extensions of 12 months each, at the council's option` / `One extension of 24 months, by agreement of both parties` | `No extension option` |
| noticePeriod | `6 months' notice before the end of the term` / `30 days' notice` | `Not found. We used the end date as the action date.` |
| autoRenewal | `Renews automatically for 12 months unless you give notice` | `Does not renew automatically` |
| indexation | `Reviewed each 1 April by CPI. Increases capped at 3.0%.` | `Reviewed each 1 April by CPI. No cap stated.` / `Prices are fixed for the term.` |
| paymentTerms | `30 days from receipt of a valid invoice` | `Not found` |
| rateCard | a 3-column table: item, unit, rate | `No rate card found` |
| serviceCredits | `2% of the monthly charge for each missed KPI, up to 10% of the monthly charge` | `No service credits` |
| terminationForConvenience | `You can end this contract early on 6 months' notice` | `Neither party can end this contract early without cause` |
| exitFees | the summary text, for example `Unamortised mobilisation costs, reducing monthly over the Initial Term` | `No exit fees stated` |

Derived rows beneath the nine questions: `Notice deadline`, `Latest end date if every extension is used` (end date plus count times length), `Next price review`, `Cap used`, `Price increase check`.

### 7.11 Method page copy (section headings and the sentence to start each with)

- **As-of date.** `Every figure is calculated as at 6 October 2026. The prototype never reads today's date.`
- **Notice deadline.** `Notice deadline = end of the current term minus the notice period. If the contract doesn't state a notice period, we use the end date and mark the answer for review.`
- **Radar bands.** `Next 3 months runs to 6 January 2027, 3 to 6 months to 6 April 2027, and 6 to 12 months to 6 October 2027. A contract whose notice date has already passed is shown first, because nobody may be tracking it.`
- **Spend and attribution.** `We add up every payment over £500 to the supplier on the contract, from the contract start date. Payments made after the end date are included and shown separately. Payments we can't confidently link to a supplier are left out.`
- **Supplier matching.** text of 7.7.
- **Cap used.** `Cap used = spend since the contract started divided by the cap. Over cap is above 100%. Close to cap is 85% to 100%. If a contract states no maximum we use its contract value. If the cap is per year, we test each contract year separately and don't pro-rate the current year.`
- **Price increase check.** `We compare payments in the last 12 months with the 12 months before. If the rise is more than 1 percentage point above the contract's cap on increases, and the difference is at least £10,000, we flag it. Payments can rise for reasons other than price, such as more volume, so this is a prompt to check.`
- **Indicative value.** table of the five rules in 5.8 with the sentence `We use 5% for renewals. The Local Government Association reported that Sheffield saved 8% of annual cost across seven contracts in 2012/13. We take a lower rate because a 2019 case study at Sefton found potential savings can shrink to nothing once tested.`
- **Ranking.** `Highest indicative value first. Ties go to the more severe flag, then the earlier action date.`
- **Confidence.** `Confidence is the lowest of the answers a flag relies on and, for spend flags, the weakest supplier match.`
- **What this doesn't do.** `It doesn't read invoices, check service performance, or compare with other councils. Those are on the roadmap.`

Every number on the page is rendered from the same constants the engine uses (import `DEFAULTS`), never typed twice.

---

## 8. Wow moments for a pre-sales demo (faithful to the spec, fictional data)

| # | Moment | Spec basis | Where and how it appears in the sample | Talk track |
|---|---|---|---|---|
| 1 | A single number that is clearly framed | Demo step 1; risk "savings shrink" | `£6.1m across 15 contracts flagged as opportunities to investigate` with the caveat visible | "Not a savings claim. A list of places to look." |
| 2 | The window that closed last week | Haringey (weak oversight of renewals) | Radar "Needs attention now": the £2.4m a year FM contract whose notice date was 30 Sep 2026, the parking contract that renews itself on 1 Jan 2027, the ICT contract that ended in April with £780,000 paid since | "These three were nobody's job to watch." |
| 3 | Spend above a contract's maximum, one click to the clause | Guildford; demo step 3 | C-005 Highways £8.4m paid against a £5.0m maximum; click View clause, land on clause 14.3 on page 23 with the quote highlighted | "Every flag shows the words it came from." |
| 4 | Spend with no contract at all | Edinburgh | `No contract on register` tab: 8 payees, £23.8m, agency staffing alone £9.3m; 84% of spend is linked to a contract | "This is what a register built from documents closes." |
| 5 | The honest drop | Sefton | Mark the highways flag Explained; headline falls from £6.1m to £2.8m live | "This is why we say opportunity, and why you can mark things reviewed." |
| 6 | Supplier names that don't match | Spec: "fiddliest part" | Matches tab: normalised and alias matches accepted, one suggestion; confirm it and Grounds maintenance flips to over cap | "Joining spend to contracts is the hard part, so you stay in control." |
| 7 | Indexation creep | Sheffield | Street lighting payments +12.1% against a 3.0% CPI cap, £188,200; near-misses are not flagged | "It tests the contract terms, not just the payments." |
| 8 | Every figure explains itself | Transparency rule | Click any £: breakdown with inputs, formula, evidence link; Method page | "No black box." |
| 9 | Light and dark | User requirement | Header toggle, default dark | Optional flourish for projector rooms |
| 10 | The close | Demo step 4 | Overview bottom panel and the demo guide: `This is one council's public data. Imagine your full estate.` | Stop talking, then ask for feedback |

Do NOT add: cross-council comparison, rate benchmarking, invoice matching, unclaimed credits, or any "savings potential" total that is not an opportunity to investigate.

---

## 9. Roadmap page: exact content

1. **Status table** (columns Feature, Status badge, What it needs). Status badge text is exactly one of `Built in this prototype`, `Stage 2`, `Not yet`; every `Stage 2` and `Not yet` row also shows the label `Not in this prototype`.

| Feature | Status | What it needs |
|---|---|---|
| Financial question set | Built in this prototype | Kontor's existing extraction, plus 9 new questions |
| Renewal radar | Built in this prototype | Contract dates and notice terms |
| Cap vs spend | Built in this prototype | Transparency Code payments over £500, joined to contracts by supplier |
| Opportunities list | Built in this prototype | The three above |
| Uplift check | Built in this prototype (stretch) | Contract indexation cap vs year-on-year change in payments to that supplier |
| Cross-council comparison | Stage 2 | Same supplier or service across 3 to 4 councils side by side (value, term, rates) |
| Invoice line-item matching | Not yet | Council invoice data, which isn't public |
| Unclaimed service credits | Not yet | KPI performance data |
| Aggregation finder and framework fit | Not yet | More councils than the prototype will hold |
| Agency rate benchmarking | Not yet | Rate data that isn't published |

2. **Stage 1 and Stage 2** two-column comparison from the spec table (who uses it; question it answers; data; core features; status).
3. **Stage 2: the joined-up view.** Intro `Once Kontor reads contracts across many councils, it can show where councils buying the same thing separately should move onto one framework or buying group, and whether the saving survives the cost of getting out of their current contracts.` Six numbered steps: Ingest contracts from many councils; Extract service category, supplier, rates and unit prices, annual value, end date, extension options, notice period, break clauses, termination-for-convenience rights, exit fees and volume commitments; Group like-for-like contracts across councils; Benchmark each contract against the best rate in the group or an existing framework price; Work out each council's net saving two ways (move now and pay the exit cost, or move at natural expiry with no exit cost); Recommend an action (join an existing framework, form a buying group, or renegotiate at renewal using the group rate).
4. **Formula** as plain text in a monospace block: `Net saving = (current annual cost − group annual cost) × years remaining − exit cost − switching cost`.
5. **Illustrative example** under the label `Illustrative numbers, made up to show the logic, not real data.`: ten councils buy the same service separately, about £20m a year combined.

| Councils | Contract position | Saving vs group rate | Exit cost | Recommendation |
|---|---|---|---|---|
| 4 | Expiring within 12 months | 10% | None | Join the group at renewal |
| 3 | 2 to 3 years left, break clause available | 8% | £120k each | Move now if net saving is positive |
| 2 | 4+ years left, no break clause | 12% | Can't exit without breach | Renegotiate citing the group rate |
| 1 | Already on a framework | — | — | Benchmark only |

Worked example line: `For one of the three mid-term councils on £2m a year: an 8% saving is £160k a year, or £400k over 2.5 remaining years. Take off £120k exit cost and £30k switching cost, and the net saving is £250k, so moving now beats waiting.`
6. **Why there's money in it** (three bullets, with sources): spend concentrates in a few suppliers (in 2011/12 councils spent over 90% of third-party payments with no more than 20% of their suppliers, and one of the top 25 suppliers worked with 317 councils; the data is old, the pattern is why pooling works); sharing contract data exposes price gaps (Camden led negotiations for London councils to secure standard prices for an ICT package after a data-sharing exercise; the pan-London ICT work reported £2.45m indicative savings in its first year); councils already pool buying with poor data (London's IBAA rate cap for temporary accommodation and the new Regional Care Cooperatives for children's placements both depend on councils knowing what each other pays). Links per the spec.
7. **What has to be true** (four bullets): Access beyond published contracts; A legal check on every move (termination rights, framework access rules under the Procurement Act, TUPE where staff transfer); Outputs framed as opportunities; Termination terms extracted from day one.
8. Closing line: `Each council that runs Stage 1 ends up with a structured contract estate, which is the raw material Stage 2 needs, with that council's agreement to share it.`

No inputs, sliders or calculators anywhere on this page.

---

## 10. Demo script with expected on-screen numbers (about 5 minutes, dark theme)

| Time | Action | Expect |
|---|---|---|
| 0:00 | Open `#/overview` | Banner, headline `£6.1m across 15 contracts flagged as opportunities to investigate`, four cards `£4.2m / £0.6m / £1.1m / £0.3m`, caveat visible |
| 1:00 | Rail to Renewal radar | Needs attention now: 3. Next 3 months: 3 contracts £6.9m a year; 3 to 6 months: 4, £7.3m; 6 to 12 months: 2, £2.2m. The FM contract reads "The notice date passed 6 days ago" |
| 2:15 | Rail to Opportunities; click the first row, then `View clause, page 23` | Row 1 is Highways £3,350,000. Source viewer shows Clause 14.3, page 23 of 70, quote "shall not exceed £5,000,000 in aggregate" highlighted |
| 3:30 | Back; open Cap vs spend | C-005 167.0% Over cap; coverage 84%; open `No contract on register`: 8 payees £23.8m |
| 4:15 | Optional: mark the highways flag Explained | Headline drops to £2.8m. Reset via the confirm dialog afterwards |
| 4:30 | Overview, close panel | `This is one council's public data. Imagine your full estate.` Click `Give feedback` |
| any | Toggle to light and back | Both themes legible, default dark on reload |

---

## 11. Traps, edge cases and the QA checklist

Traps (each has bitten similar builds):
1. `toFixed(1)` rounds `8.35` down (floating point). Use the engine's integer-rounding `fmtGBPCompact`.
2. Month maths: use clamping `addMonths`. `31 Mar minus 6 months` is `30 Sep`, not `1 Oct`.
3. Payment boundaries: windows are `(from, to]`. Generator dates avoid the 6th of the month.
4. After-end payments count towards spend to date (C-007) and are shown separately; they are not "unmatched".
5. A payee in the alias table is accepted at 0.95 and shown as Alias; do not show it as Similar name.
6. Sums: round to pence after every sum; display whole pounds; flag values are whole pounds.
7. `localStorage` can throw; wrap every access. Corrupt JSON must not crash.
8. Hash routing plus the shell skip link: the link must not navigate (see shell-port).
9. Never print "savings" as a claim (R13); lint it in a test.
10. Light-mode colours for badges and meters must be checked with axe, not by eye (see ds-cheatsheet section 5).
11. Do not derive anything from `new Date()`; the only clock use is a timestamp on saved feedback.
12. `Mirefield Training Partners Ltd` scores 0.55 against Wrenfield Care Partners Ltd: it must stay Unmatched, not Suggested.

QA checklist (pass/fail, run in both themes):
- [ ] Every R-number with an AC has been checked; golden numbers in section 6 match on screen.
- [ ] axe 0 violations on all routes, dark and light.
- [ ] Zero external network requests (request log).
- [ ] 19 of 19 rows on Opportunities open the right clause and page; quote text equality for 336 extractions.
- [ ] Banner, as-of label and "indicative" wording present on every route.
- [ ] Copy scan: no `!`, no emoji, no banned button labels, no "savings" outside allowed contexts.
- [ ] Keyboard-only run through the whole demo script succeeds.
- [ ] Storage-blocked run: app works, no crash.
- [ ] 1440x900 and 1024x768: no horizontal page scroll.

---

## 12. Risks and gaps that could bite the build

1. **Spec says "real published contracts, checked by hand"; the prototype uses fictional data.** Deliberate (task rule), but it means goal 1 (answers correct on real contracts) is NOT proven by this build. Say so in the About this data text (done) and in the demo.
2. **Sample density.** Two thirds of contracts carry a flag, so the sample over-represents problems. Mitigated by the banner and the near-miss cases; be ready to say it is engineered.
3. **Mixed units in the headline.** Renewals are per year, over cap is already paid, close to cap is projected. The breakdown cards separate them; do not merge them into a single unlabelled total anywhere else.
4. **The 5% renewal rate is an assumption**, not a spec number. It is sourced to Sheffield's 8% and cautioned by Sefton, shown everywhere and adjustable (R64). Marcus owns the cost baseline and savings metrics; get his rate before a real customer demo.
5. **Transparency Code columns are from memory** (gov.uk was unreachable). Confirm against the Code and a real council's files before claiming column fidelity.
6. **Payment change is a proxy for price change** in the uplift check; legitimate volume changes will look like uplift. The copy says so; keep it.
7. **The notice-window reading** (deadline = end minus notice) is an interpretation of "entering their notice window". If the product owner means something else, only `radarBand` changes.
8. **Fictional names unchecked against Companies House.** Low risk, nonzero.
9. **Evidence strip uses real councils** quoted from the spec. Keep summaries verbatim and attributed; do not add claims. The links cannot be verified offline.
10. **File size.** `sample.json` is about 686 KB (payments 371 KB, extractions and documents 266 KB). Fine for a static prototype; do not triple it.
11. **Ingestion is not demonstrated** and the build must not imply it is. The spec's biggest risk remains open.
12. **Dense tables at 44px.** The DS says 44px targets; a 24-row table at 44px fits at 1440x900 only with scrolling inside the container. Use 40px rows with 44px hit areas for row actions (R70).

