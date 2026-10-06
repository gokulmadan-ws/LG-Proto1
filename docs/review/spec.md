# Review "spec": spec fidelity and copy

Reviewer id `spec`. Build under review: `/home/user/LG-Proto1/dist` (`app.js` 21:04, newer than every file in `src/`, `design-system/`, `vendor/`, `scripts/`). Browser: Chromium 1194 through `tests/lib/harness.mjs`, one at a time. Nothing under `src/`, `scripts/`, `design-system/`, `index.html`, `package.json` or `dist/` was edited. No git commands were run. Scratch (git-ignored): `.scratch/spec/`.

New reusable scripts, all plain node against `dist/`, all exit non-zero on failure: `tests/review/spec-lib.mjs` (helpers, spec parser, state list), `spec-capture.mjs` (renders every route, overlay, flag drawer, source page and toast in dark and light into `.scratch/spec/capture.json`; `extra` mode refreshes only toasts), `spec-lint.mjs` (render-text lint over the capture), `spec-evidence.mjs` (Evidence page, Overview strip and Roadmap against the text of `docs/spec.md`), `spec-sweep.mjs` (R11-R15, R20-R22, R62-R68, R72, R73, R77, R78), `spec-hard.mjs` (the three hard requirements and R1/R6).

## 1. Verdict

On fidelity the prototype is unusually good. The nine Evidence rows match the spec character for character (case name, link, When, What happened, feature column) in both themes. The Stage 2 section, the stretch and not-yet table, the Stage 1 and Stage 2 table, the illustrative example and the data-source bullets are the spec's own words, every one of the 13 spec URLs is linked and no other external URL is, and nothing on the Roadmap can be typed into or calculates. No `!`, no emoji, no banned button label, no real supplier or council name outside the allowed places (Evidence, Overview strip, Method, Roadmap, caveat, plus two exceptions below), and the sample-data banner is visible without scrolling in all 479 captured states. The three hard requirements pass: Springboard tokens and components resolve in both themes, the app sits inside the shell on every route, and a fresh profile is dark before React mounts.

What a sceptical product owner or finance officer would still catch: (1) the offline standalone file is stale and shows placeholders (blocker, already reported by `fun`, re-verified); (2) the Overview breakdown cards say "3, 1, 12 and 3 contracts" which adds to 19 while the headline says 15 contracts, with no note that four contracts carry two flags; (3) the caveat and the Method page say potential savings "can shrink to nothing" where the spec says Sefton's £1.7m "shrank to possibly nil"; (4) the Roadmap says "A real Stage 1 runs entirely on public data", which is not what the spec says (the spec says the prototype does; Stage 1 is a council's own contracts); (5) a handful of internal-process sentences ("Kontor scope document", "whoever owns the cost baseline", presenter coaching in a drawer the Overview offers as its first action) reach a council audience. The rest is small: the payments drawers lack the "Sample payments (fictional)" caption, three of four Overview cards never say "indicative", Sheffield is named in the Settings drawer, one lower-case sentence on the Method page, and naming drift between the spec's "Uplift check" and the screens' "Price increase above cap".

Documented deviations from the spec that need the owner's sign-off rather than a fix: the on-screen close line says "contracts and spend" where the spec's demo step 4 says "public data"; the Overview carries the short caveat, not the long form of copy deck 7.2.

## 2. What was checked and how

| Check | Method | Result |
|---|---|---|
| Traceability of every spec item | Read `docs/spec.md` line by line; located each item by route and element in the rendered capture; compared wording | Section 3 (matrix): 44 rows covering 59 spec items. 30 rows faithful, 8 faithful with a documented adaptation, 2 deliberately omitted (team, open questions), 4 gaps (findings) |
| Evidence page against the spec table | `spec-evidence.mjs` parses the markdown table in `docs/spec.md` and compares the rendered table cells, link `href`, `target`, `rel`, visible "(opens in a new tab)", the checked-on line, the framing and When sentences, in dark and light | 9 of 9 rows exact in both themes (section 4) |
| Overview strip | Same script | 3 cases (Haringey, Guildford, Edinburgh) exact; "Show all 9 cases" goes to `#/evidence` |
| Roadmap against the spec | Same script: status table rows, Stage 1/Stage 2 table, illustrative table, worked example, formula, six steps, three "why" bullets, who would buy, what has to be true, data sources, links; no input, select, textarea, slider, canvas, svg | 45 passed, 1 failed (the spec sentence "It runs the same Stage 1 extraction across many councils' contracts." is missing, finding spec-13) |
| Stage 2 and not-yet are not built | Roadmap DOM scan (0 interactive or graphic elements, one "Give feedback" button), word scan of every other screen for benchmark, framework fit, aggregation, invoice line, unclaimed service credits, peer, cross-council, buying group | Pass. Five rows carry the visible label "Not in this prototype" |
| Hard requirements | `spec-hard.mjs`: header, Primary nav, `main#shell-main` on 13 routes, header 72px, rail 64 to 65px, app tab; fresh-profile theme with `app.js` held back 1200 ms; toggle by click, Enter, Space; persistence; blocked storage; DS bundle, `--accent` in both themes, Inter, DS Button; zero off-origin requests | 21 of 21 pass |
| Render-text lint | `spec-capture.mjs` then `spec-lint.mjs`: 493 captures (routes, overlays, 21 flag drawers, 336 source pages, 14 toasts; dark and light for routes and overlays) | 30 passed, 4 failed (section 7) |
| Golden strings | R16, R17, R18, R21 (blueprint correction), R33, R34 asserted on the rendered text | All pass |
| About, Method, Roadmap against deck | Read `src/lib/copy.js`, `src/data/roadmap.js`, rendered text of the dialog and both pages against requirements 7.3, 7.11, 9 and blueprint section 1 | Section 9 |
| Real-world claims | Listed every statement of fact about law, data sources or other bodies in rendered text and in `src/`; compared with the spec | Section 10 |
| R-sweep | `spec-sweep.mjs` plus lint | Section 11 |
| Real company names | 100 names scanned in rendered text and in the dataset; web search of a sample of the invented supplier names | No hit. A Companies House check was not possible offline and remains open (requirements risk 8) |

## 3. Traceability matrix: every item of `docs/spec.md`

Verdict key: F faithful, A faithful with a documented adaptation, O deliberately omitted (internal planning content), G gap (finding id).

### Purpose

| # | Spec item | Where the prototype shows it | Verdict |
|---|---|---|---|
| P1 | Adds a financial layer on top of Kontor: reads council contracts, pulls out commercial terms, flags where money is lost | App tab "Kontor financial layer", Overview headline, Opportunities, About dialog "What this demo doesn't show" | F |
| P2 | Kontor already built the hard half (ingestion, clause-level extraction with provenance); this is new questions and views | About ("Kontor reads contracts and extracts commercial terms as part of the wider product. This prototype starts after document ingestion"), Source viewer. The "clause-level provenance is the edge over spend-analytics tools" line (must-have 1) is not on screen | A |
| P3 | Two stages: Stage 1 one council now, Stage 2 joined-up | Roadmap panel "Stage 1 and Stage 2", About "Why one council" | F |
| P4 | Finding savings compares three things: what the contract says, what was paid, what others pay; Kontor does the first, the prototype the second, Stage 2 the third | Not stated anywhere on screen. The Roadmap table's "Data" row is the nearest | G spec-12 |

### Two stages

| # | Spec item | Where | Verdict |
|---|---|---|---|
| T1 | "Stage 1 proves value inside one council; Stage 2 turns many councils' contracts into buying power." | Roadmap, "Stage 1 and Stage 2" panel description | F verbatim |
| T2 | Five-row table (who uses it, question, data, core features, status) | Roadmap table, 5 of 5 rows verbatim (script check) | F |
| T3 | "Each council that runs Stage 1 ends up with a structured contract estate ... with that council's agreement to share it." | Roadmap, footer of the same panel | F verbatim |

### Prototype goal

| # | Spec item | Where | Verdict |
|---|---|---|---|
| G0 | Prove Stage 1 works on real public data | Prototype is fictional by design: banner on every state, About "What is real. Nothing." Goal 1 is therefore not provable by this build | A (documented, requirements risk 1) |
| G1 | Answers correct on a sample of real contracts, checked by hand | Source viewer "Mark answer as correct / incorrect", Contracts "0 of 336 answers checked by hand", clause quote beside every answer (336 of 336 quotes verified by `fun`) | A (mechanism present, data fictional) |
| G2 | Spend files join to contracts by supplier | Spend > Supplier matches (39 payees, method, score, status), Overview coverage 84%, Method "Supplier matching" | F |
| G3 | Opportunities list flags each link to a clause and page | `#/opportunities`, 19 of 19 rows "View clause, page N" (verified by `fun`), flag drawer, source viewer | F |
| G4 | A council contact sees it and says whether they would use it | Feedback dialog "Would you use this on your own contracts?" (Yes, Maybe, No, comment, copyable), Overview close panel | F |

### Team

| # | Spec item | Where | Verdict |
|---|---|---|---|
| TM | Six people and roles | Nowhere. No team name appears in any rendered text (lint) | O correct |

### Evidence (section heading, framing sentence, nine rows)

| # | Spec item | Where | Verdict |
|---|---|---|---|
| E0 | "Councils routinely lose money because nobody has a full picture of their own contracts." plus "Every case below was checked against its source on 6 October 2026, and the When column shows how current each one is." | `#/evidence` header, three sentences verbatim | F |
| E1-E9 | Exeter, Haringey, Guildford, Edinburgh, Gedling, Windsor & Maidenhead, Brighton & Hove, Sefton (LGA), Sheffield (LGA): case, link, When, What happened, feature | `#/evidence` table, all 9 rows exact; Overview strip shows 3 (Haringey, Guildford, Edinburgh) | F (section 4) |

### Must-have features

| # | Spec item | Where | Verdict |
|---|---|---|---|
| M0 | "Four features make the demo work ... every flag links back to the clause and page it came from." | Not shown as a sentence; the four features are the app | A |
| M1 | Financial question set (about 9 questions: value and cap, dates, extensions, notice and auto-renewal, price review and indexation cap, payment terms, rate card, service credits, termination rights and exit fees) | Contract detail "New financial questions", Q1 to Q9 with exactly those nine groups, answer, confidence, clause link; Contracts register; Source viewer | F |
| M2 | Renewal radar: contracts entering their notice window in the next 3, 6 and 12 months, value attached; "the Haringey finding as a screen" | `#/renewals`, three bands with computed boundary dates, annual value, "Needs attention now" group; Overview strip and radar summary; Haringey case on Overview and Evidence | F |
| M3 | Cap vs actual spend: match Transparency Code payments to each contract by supplier, spend to date against the cap, flag over or close; the Guildford story; name matching is the fiddliest part | `#/spend` (three tabs), payments drawer, cumulative line with the cap crossing on Contract detail, Matches tab; named "Cap vs spend" (spec: "Cap vs actual spend") | F |
| M4 | Savings opportunities list: one ranked list combining renewals due, spend over cap, uplifts due; each with an indicative £, a reason, a link to the clause; labelled "opportunities to investigate", not "savings" | `#/opportunities` (19 rows; plus close-to-cap flags), H1 "Opportunities to investigate", rail label "Opportunities"; no page title, rail label, button or card heading contains "saving" | F (renamed on purpose, R13) |
| M5 | The spec's "What it does" and "Why it matters" columns for the four | Not rendered. `roadmap.mustHaves` exists in `src/data/roadmap.js` but nothing imports it. The Roadmap status table carries a research-written "What it needs" for these four rows instead | G spec-13 |

### Stretch and not-yet

| # | Spec item | Where | Verdict |
|---|---|---|---|
| S0 | Intro "One stretch feature goes in if time allows ..." | Rephrased in the panel description ("Four must-have features and one stretch feature are built ...") | A |
| S1 | Uplift check: stretch | Built: flags `?type=uplift`, Derived panel, Method "Price increase check". Roadmap row "Built in this prototype" plus "Stretch feature". Screens call it "Price increase above cap" (spec-14) | F, naming drift |
| S2 | Cross-council comparison: Stage 2 | Roadmap row "Stage 2" plus "Not in this prototype"; "What it needs" verbatim | F |
| S3-S6 | Invoice line-item matching, unclaimed service credits, aggregation finder and framework fit, agency rate benchmarking: Not yet | Roadmap rows "Not yet" plus "Not in this prototype"; "What it needs" verbatim. Service-credit regime is extracted (Q8) but no unclaimed-credit figure exists | F |

### Data sources

| # | Spec item | Where | Verdict |
|---|---|---|---|
| D0 | "The prototype runs entirely on public data for one council, so there's no redaction or client-data problem." | Roadmap intro rewritten as "A real Stage 1 runs entirely on public data for one council ..." | G spec-04 |
| D1 | Contracts: Procurement Act 2023, copy of any contract over £5m on Find a Tender plus KPI notices, procurements started on or after 24 February 2025, so the pool is small (with the gov.wales link) | Roadmap bullet verbatim with the link; About "Where real data would come from"; Method "Data window and VAT" | F |
| D2 | Spend: each borough's Transparency Code files (payments over £500) | Roadmap, About, Method "Spend and attribution" | F |
| D3 | Context: Contracts Finder notices below £5m, full documents not published | Roadmap, About, Method | F |

### Demo flow

| # | Spec item | Where | Verdict |
|---|---|---|---|
| F1 | Headline "£X across N contracts flagged as opportunities to investigate" | Overview H1 `£6.1m across 15 contracts flagged as opportunities to investigate`, exact value `£6,145,238` on focus; Demo guide step 1 | F |
| F2 | Renewal radar: next 3, 6 and 12 months | `#/renewals`; Demo guide step 2 | F |
| F3 | One over-cap contract: click through from the flag and land on the clause and page | Opportunities row 1, flag drawer, "View clause, page 23", Source viewer clause 14.3 page 23 of 70, cited clause highlighted and focused; Demo guide step 3 links straight to the flag | F |
| F4 | Close: "This is one council's public data. Imagine your full estate." | On screen: "This is one council's contracts and spend. Imagine your full estate." (blueprint decision 8). Demo guide step 4 offers both lines | A (spec-11, needs sign-off) |

### Risks and open questions

| # | Spec item | Where | Verdict |
|---|---|---|---|
| R1 | Biggest risk is ingestion | About: "starts after document ingestion"; Demo guide note "Ingestion is not shown ... do not claim that Kontor takes a batch of public PDFs without help"; Method "What this doesn't do" | A |
| R2 | Savings shrink on testing; every figure framed as an opportunity | Caveat on Overview (short) and Opportunities (long), flag drawer, "Reasons this may not be a saving", triage control, 5% prototype assumption, Evidence caution | A (wording overstates, spec-03) |
| Q1-Q5 | Five open questions | Not listed on screen. Each is answered by behaviour: fictional council (About), five-minute demo (Demo guide), ingestion not shown, nine questions fixed (Contracts subtitle), supplier join by name with disclosed thresholds (Method) | O correct |

### Stage 2

| # | Spec item | Where | Verdict |
|---|---|---|---|
| X0 | Intro paragraph (two sentences) | Roadmap "Stage 2" panel: first sentence only; "It runs the same Stage 1 extraction across many councils' contracts." is missing | G spec-13 |
| X1 | Why there's money in it: three bullets with LGA/Audit Commission, "same report", IBAA and Regional Care Cooperatives links | Roadmap, verbatim, links present | F |
| X2 | How the analysis works: six steps | Roadmap, verbatim | F |
| X3 | Net saving formula (LaTeX) | Roadmap, monospace plain text exactly as R67 asks | F |
| X4 | Illustrative example: ten councils, about £20m a year, four-row table | Roadmap, verbatim, labelled "Illustrative numbers, made up to show the logic, not real data" in the heading and the caption | F |
| X5 | Worked example (8% of £2m = £160k, £400k over 2.5 years, less £120k and £30k = £250k) | Roadmap "Worked example", verbatim; arithmetic checked | F |
| X6 | Who would buy it: Central government (LGA link), Regional bodies, Merging councils (LGR) | Roadmap panel, verbatim | F |
| X7 | What has to be true: four bullets | Roadmap panel, verbatim; note on why termination terms are extracted now (R68) | F |

## 4. Evidence page verification (programmatic, `spec-evidence.mjs`)

| # | Case | Case text, link, When, What happened, feature column | New tab, `rel`, visible words | Dark | Light |
|---|---|---|---|---|---|
| 1 | Exeter | exact | yes | pass | pass |
| 2 | Haringey | exact | yes | pass | pass |
| 3 | Guildford | exact | yes | pass | pass |
| 4 | Edinburgh | exact | yes | pass | pass |
| 5 | Gedling | exact | yes | pass | pass |
| 6 | Windsor & Maidenhead | exact | yes | pass | pass |
| 7 | Brighton & Hove | exact | yes | pass | pass |
| 8 | Sefton (LGA) | exact, "Caution" marker | yes | pass | pass |
| 9 | Sheffield (LGA) | exact | yes | pass | pass |

Also exact: nine rows, the checked-on line, the framing sentence, the When note, one `h1` "Why this matters" with eyebrow "Evidence", a table `caption` and `scope` on every header. All 13 spec URLs are linked somewhere in the app and no other external URL is.

## 5. Hard requirements

| Requirement | Result | Evidence |
|---|---|---|
| Springboard 2.0 used properly | Pass | `window.Springboard20DesignSystem_019e02` loaded (20 components); `dist/ds/styles.css` linked; `--accent` is `rgb(31, 111, 235)` dark and `rgb(9, 105, 218)` light, as the DS README says; body font Inter; primary buttons use the DS accent; DS Button, Input, Select, Textarea, Breadcrumb, Badge (counts only) and Tooltip are used, and the kit replaces Card, Tabs, Checkbox, Radio, Switch for documented accessibility reasons (`docs/ui-api.md`); no hex, `rgb()`, `hsl()`, gradient or coloured left border outside `shell.css`; SVG only in the two shell glyphs and two chart files; `design-system/` files all share one timestamp (untouched); no request leaves the origin on 13 routes. Nit: middle-dot separators (spec-19) |
| Inside the App Shell | Pass | header, `nav[aria-label="Primary"]`, `main#shell-main` on 13 routes, header 72px, rail 64 to 65px, app tab "Kontor financial layer", page `h1` inside `main`, nothing in `body` outside `#root` and the toast host. The shell is a port in `src/shell`, not the DS `AppShell.dc.html` template (blueprint decision 3) |
| Dark/light toggle, default dark | Pass | with empty storage `data-theme` is `dark` right after the response starts while `app.js` is held back 1200 ms (the static `<html data-theme="dark">` plus a head script); button with `aria-pressed` and constant label "Dark mode"; click, Enter and Space toggle; persists across reload; works with storage blocked; light background is lighter than dark |

## 6. Stage 2 and not-yet are not functions

Roadmap `main` contains 0 `input`, `select`, `textarea`, `[role=slider]`, `canvas` or `svg`; the only button is "Give feedback". The Stage 2 panel carries "Stage 2" and "Not in this prototype". The formula is `<code>` text. On every other screen there is no occurrence of benchmark, framework fit, aggregation finder, invoice line, unclaimed service credit, peer council, cross-council or buying group (lint). Mentions that exist are labelled limits: Method "What this doesn't do" ("It doesn't read invoices, check service performance, or compare with other councils. Those are on the roadmap."), About "Joining up councils is Stage 2". The rate card (Q7) and service-credit regime (Q8) are extracted answers only; nothing is compared.

## 7. Render-text lint (30 of 34 checks pass; failures are findings)

| Rule | Result |
|---|---|
| No `!` in rendered text, aria-label, title, svg text or toast (R71.1) | pass, 493 captures |
| No emoji or pictographic characters (R71.2) | pass |
| No placeholder, lorem, TODO, `undefined`, `NaN`, `[object` | pass |
| Sentence case in headings and buttons (R71.3) | pass after exempting proper nouns, supplier names and the illustrative contract text. Eyebrows, table headers and "On this page" are upper-cased by CSS only (`text-transform`, the DS caption style); the source text is sentence case |
| No OK, Submit, Click here, Learn more; every button is verb plus object or deck vocabulary (R71.4) | pass; 110 unique labels, only single word is "Cancel" (`.scratch/spec/button-labels.json`) |
| "you", never "the user" (R71.5) | pass. One "Click View clause ..." in a presenter note |
| Errors are What + Why + How (R71.6) | pass: feedback no answer, storage blocked, export failed, feedback not copied, link not copied. The error boundary's Why is vague ("an unexpected error") |
| `en-GB` numbers and £ (R71.7) | pass except "1090 days left" and "1637 days left" (spec-18) |
| British spelling | pass (no -ize, color, center, behavior found) |
| "saving(s)" only where R13 allows | pass: 123 occurrences, all in caveat, Evidence, Method, Roadmap, the Sefton sentence in renewal drawers, "Reasons this may not be a saving", Demo guide presenter note |
| No page title, rail label, button or card heading with "saving" | pass |
| Every derived £ labelled indicative | page level pass (Overview, Opportunities, Spend, Method, every flag drawer, Settings). Card level **fail**: 3 of 4 Overview cards (spec-06) |
| Real council names only where allowed | **fail** once: Settings drawer names Sheffield (spec-07). Demo guide names Sefton, which blueprint section 5 allows |
| No real company in rendered text or data | pass (100 names; dataset scanned incl. extraction text) |
| No email, phone, postcode or URL in the dataset | pass |
| Banner visible without scrolling on every state | pass, 479 states, both themes |
| Source viewer label on all 336 pages | pass |
| "Sample payments (fictional)" on payment tables | **fail** on Spend payments drawers and the payee drawer (spec-05) |
| Golden strings R16, R17, R18, R21, R33, R34 | pass |
| No Stage 2 function words; no team names | pass |
| No internal or process language | **fail** (spec-08, spec-09) |
| Inert header toasts use the R5 copy | pass |

## 8. Golden strings (rendered text)

R16 `£6.1m across 15 contracts flagged as opportunities to investigate`, exact value `£6,145,238` on the focusable figure, "Indicative figures. As at 6 October 2026." R17 four cards (`£4.2m`, `£0.6m`, `£1.1m`, `£0.3m`; sublines as specified) and `£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238`. R18 `£6.9m a year`, `£7.3m a year`, `£2.2m a year`, attention 3. R21 "This is one council's contracts and spend. Imagine your full estate." with "Give feedback" and "See what comes next". R33 30 Sep 2026, 1 Dec 2026, 28 Feb 2027 plus "No notice period stated. We used the end date." R34 "The notice date passed 6 days ago", "The notice date passed 98 days ago. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier.", "This contract ended on 30 April 2026. You have paid £780,000 since." All present and exact.

## 9. About, Method and Roadmap copy against the deck

About (requirements 7.3 plus blueprint decision 8): title, "What is real. Nothing ...", "Why one council", "Fixed date" and the button are verbatim; "What is realistic" and "What this demo doesn't show" carry the blueprint corrections exactly ("look like the files councils publish for payments over £500: date, department, supplier, purpose and amount", "starts after document ingestion: every answer is shown as already extracted"); one added section "Where real data would come from" restates the spec's three sources correctly.

Method (7.11): all 12 section ids and leads match the deck; the Indicative value lead is the blueprint's "5% is a prototype assumption"; every constant shown equals `DEFAULTS` (12 constants compared). Defects: ". within tolerance" lower-case, a repeated sentence in the C-004 example, "shrink to nothing", "whoever owns the cost baseline" (spec-03, spec-08, spec-10).

Roadmap (section 9): status table, Stage 1 and 2 table, six steps, formula block, illustrative table and label, worked example, why-money bullets, who would buy, what has to be true, closing line: all present. Differences: second sentence of the Stage 2 intro missing, the data-source intro reworded (spec-04, spec-13).

## 10. Claims about the real world

| Claim in the UI | Where | Spec support | Verdict |
|---|---|---|---|
| Contracts over £5m on Find a Tender, procurements started on or after 24 February 2025; KPI notices | Roadmap, About, Method | Stage 1 data sources, verbatim | Supported |
| Spend files list payments over £500; Contracts Finder for below £5m | Roadmap, About, Method | verbatim | Supported |
| "Camden led negotiations ... £2.45m", "317 councils", Cabinet Office plans, IBAA, Regional Care Cooperatives, LGR | Roadmap | verbatim | Supported |
| Nine Evidence cases and the checked-on date | Evidence, Overview | verbatim | Supported |
| Sheffield saved 8% of annual cost across seven contracts in 2012/13 | Method | Evidence table | Supported. Settings drawer shortens it to "reported 8% for Sheffield", losing "of annual cost across seven contracts" (spec-07) |
| Potential savings "can shrink to nothing" once outliers are tested | Opportunities caveat, Method | Spec: "£1.7m potential savings shrank to possibly nil" | Overstated (spec-03) |
| "A real Stage 1 runs entirely on public data for one council" | Roadmap | Spec says the prototype does; Stage 1 data is "That council's contracts and spend" | Not supported (spec-04) |
| "A contract over £5m that started on or after 24 February 2025 would come from Find a Tender. The rest come from the council contracts register." | Contracts footer | Spec condition is on procurements started, not contract start; "the rest" is not in the spec | Imprecise (spec-04) |
| "Spending more than an estimate is not a breach unless the contract also states a maximum"; "A cap is often set on the managed-service fee only" | Flag drawer | Not in spec | Domain and legal assertions stated flatly (spec-15) |
| Re-procuring can bring TUPE obligations | Flag drawer | Spec names TUPE | Supported |
| Payment rows "look like the files councils publish ...: date, department, supplier, purpose and amount" | About | Not in spec; blueprint decision 8 allows it | Unverified, plausible (nit) |
| "None starts on or after 24 February 2025 with a value over £5m, so none would be on Find a Tender" | Roadmap | Derived from the dataset; checked against all 24 start dates and values | Correct |

Observation for the spec owner, not a prototype fault: the only source the spec gives for the Procurement Act publication duty is a Welsh Government guidance PDF (gov.wales), for what the prototype presents as an English borough.

## 11. Acceptance sweep R11-R15, R20-R22, R62-R68, R71-R73, R77, R78

| R | Result | Evidence |
|---|---|---|
| R11 | pass | 13 routes x 2 themes: banner below the header, bottom within the viewport, no dismiss control; axe `color-contrast` on the banner clean in both themes; header "Sample" badge |
| R12 | partial | 1 pass; 2 pass (every supplier `isFictional`); 3 pass apart from Sheffield in Settings (spec-07), Sefton in the Demo guide is blueprint-allowed; 4 source label on 336 of 336 pages, payment caption missing on the Spend drawers (spec-05) |
| R13 | partial | 2 and 3 pass (section 7); 1 fails for 3 of 4 Overview cards (spec-06) |
| R14 | partial | Caveat visible with "How this is calculated" to `#/method?s=indicative` on both screens. Overview shows the short form only, the AC asks for the 7.2 text; deliberate for density (foundation-status section 4). Opportunities shows the generic long form (blueprint decision 7) |
| R15 | pass | 13 routes: link focused, Enter opens, Tab stays inside for 8 presses, Esc closes, focus returns to the link |
| R20 | pass | intro sentence, three cases, new-tab with `rel` and visible words; "Show all 9 cases" is a link to `#/evidence` (blueprint decision 10) rather than a reveal |
| R21 | pass | with the blueprint correction. The spec's own line differs (spec-11) |
| R22 | pass | four steps in order; "Open overview", "Open renewal radar", "Open the highways flag" land on the right screen; "Give feedback" opens the dialog above the guide; Esc closes and focus returns to the button |
| R62 | pass | exact title, question, radios, label, helper, buttons; exact no-choice error with focus on the first radio and comment kept; Copy feedback contains answer, comment, as-of date. Known: copy prints the UTC date of the stored timestamp (`copy.js` `feedbackText`, `e.at.slice(0, 10)`) |
| R63 | pass | dialog before anything clears, exact body, Cancel focused, "Reset changes" in the DS destructive colour, assumption still stored until confirm, exact success toast |
| R64 | pass | 8% gives `£6.8m` and `£6,790,538`; banner text exact |
| R65 | pass | 12 ids scroll to and focus their heading by `?s=`; 12 constants equal `DEFAULTS`. Gap: severity cut-off £100,000 and bands 0.90 / 0.75 are typed in prose (known) |
| R66 | pass | Overview and Opportunities `s=indicative`, Renewals `s=radar`, Spend `s=cap`, Matches `s=matching`, No contract `s=spend`, flag drawer `cap` and `confidence`, Derived panel five distinct sections |
| R67 | pass with omissions | all five items, no input or calculator, "Not in this prototype" on every not-built row; see spec-13 |
| R68 | pass | Q9 termination for convenience and exit fees on 24 of 24 contracts; Roadmap note with link to C-005 |
| R71 | pass | see section 7 (days-left grouping nit) |
| R72 | pass | at most one filled button per section on 14 states and 4 overlays; no gradient or coloured left border on 12 routes; FA icons only |
| R73 | pass | only Reset changes is destructive (source scan: `ConfirmHost`, `SettingsDrawer`, `ui-context`, generic `Dialog`); Reject match gives the exact toast and no dialog |
| R77 | pass | hex only in `shell.css`; no `rgb()`, `hsl()` or `oklch()` outside it |
| R78 | partial | 1440x900 and 1366x768: headline (156 to 220), caveat (258 to 278), four cards (371 to 517) and sum line (548 to 566) visible; radar heading at 630 to 650. 1024x768: headline and cards visible (cards end 727), sum line straddles the fold (758 to 776, spec-17) |

## 12. Builders' known issues, verdict in this lens

| Reported | Verdict |
|---|---|
| Evidence route title "Evidence" versus page title "Why this matters" | Real in `routes.js`, not user-visible (document title, h1, Menu all say "Why this matters"). Spec's word is the eyebrow. No finding |
| Reject match moves Larchmont to no-contract (9 payees, £24,130,000) | Engine consistent: Matches shows "You rejected this match. Its payments are not counted. Undo decision"; No-contract intro and Overview move to 9 payees and `£24.1m`; coverage stays 84% and sums to 100%. The row note "no contract to read, so there is no clause to link" is slightly wrong for a payee that resembles an existing contract (nit, spec-20) |
| Copied feedback prints the UTC date | Confirmed by code; see R62 |
| Method page types literals | Confirmed (R65); nit |
| from=method highlights Opportunities | Not re-measured (other lens) |
| Dead css, kit, tests | Not in this lens |
| Stale standalone file (not on the builders' list, found by `fun`) | Re-verified: spec-01 |

## 13. Findings

Most important first. The structured result carries the same list.

**spec-01 blocker (build-docs). The offline standalone file is stale and shows placeholders on every route.**
`dist/kontor-prototype.html` is dated 19:16; `dist/app.js` and `dist/app.css` 21:04. The standalone contains the string "This screen has not been built yet" once and "Where the total comes from", "Cited clause" and "Presenter notes" zero times (all three occur once in `app.js`). The brief says the demo may run without a network. Fix: `npm run build && npm run standalone` as the last release step, and a freshness assertion in `npm test`. Same defect as `fun` F01.

**spec-02 major (overview-renewals). Card counts add to 19, the headline says 15 contracts, and nothing explains it.**
`#/overview`: cards read "3 contracts", "1 contract", "12 contracts", "3 contracts" (sum 19); the H1 and `Method` say 15 contracts. Four contracts carry two flags (C-001, C-004, C-005, C-007). The sum line proves the £ addition but not the count, and the blueprint made the £ proof the credibility device (decision 7). A finance officer who adds the cards finds a mismatch on the first screen. Fix: one line under the sum line, for example "15 contracts in all. Four carry two flags, so the card counts add to 19."

**spec-03 minor (shared). The caveat and the Method rationale say potential savings "can shrink to nothing"; the spec says Sefton's £1.7m "shrank to possibly nil".**
`src/lib/copy.js:410` (`caveat.long`, shown on `#/opportunities`) and `src/views/Method.jsx:435`. The spec's finding is one case that fell to possibly nil, not a general rule. "because many had legitimate reasons" is also a stronger reading of "once outliers turned out to have legitimate reasons". Fix: "In one 2019 case study, £1.7m of potential savings shrank to possibly nil once outliers were tested, because they had legitimate reasons."

**spec-04 minor (roadmap-evidence-overlays). The Roadmap says "A real Stage 1 runs entirely on public data for one council"; the spec does not, and the Contracts footer misstates the Find a Tender condition.**
`src/data/roadmap.js` `dataSourcesIntro`. Spec: "The prototype runs entirely on public data for one council". The spec's Stage 1 is a tool a council uses on its own contracts (table: "That council's contracts and spend"), so a council reader is told their own non-public contracts are out of scope. Also `src/views/contracts/strings.js:23` (shown at the foot of `#/contracts`): "A contract over £5m that started on or after 24 February 2025 would come from Find a Tender. The rest come from the council contracts register." The spec's condition is on procurements started on or after that date, not the contract start, and "the rest" is not in the spec. Fix: restore "The prototype runs entirely on sample data ... a real council would use its own contracts and spend"; reword the footer to the spec's words.

**spec-05 minor (spend). The Spend payments drawers and the payee drawer have no "Sample payments (fictional)" caption (R12.4).**
`#/spend?payments=C-005`, `?payments=C-011`, `?payments=C-007`, `?payments=C-003`, `#/spend/no-contract?payee=...`: the string is absent from the captured text; it is present on Contract detail (`COPY.paymentsCaption`, used only in `src/views/contracts/Payments.jsx`). The drawer's scrim also cuts the banner at "...are fictional. They" so the only fictional label visible in the drawer is gone. Screenshot: `.scratch/spec/payments-drawer.png`. Fix: use `COPY.paymentsCaption` in `src/ui/PaymentsTable.jsx` or the drawer header.

**spec-06 minor (overview-renewals). Three of four Overview breakdown cards never say "indicative" (R13.1).**
Accessible names: "Spend over cap £4.2m, 3 contracts, already paid above the cap", "Close to cap £0.6m, 1 contract, projected at the current pace", "Price increases above cap £0.3m, 3 contracts, already paid above the cap". Only Renewals carries "indicative value per year". The adjacent "Indicative figures." line covers it visually; the AC asks for the word on each card (`CARD_ARIA` and `CARD_SUB` in `src/lib/copy.js`). Fix: "Indicative." in each subline or a visible panel heading "Where the indicative total comes from".

**spec-07 minor (roadmap-evidence-overlays). Sheffield is named in the Settings drawer, outside R12.3 and blueprint decision 2, and the sentence loses its meaning.**
`src/components/overlays/SettingsDrawer.jsx:36`: "The Local Government Association reported 8% for Sheffield in 2012/13." appears beside the 8% renewal-rate option. The spec's figure is savings of 8% of annual cost across seven contracts, not a renewal rate; without that context it reads as a benchmark for the setting. Fix: delete the note or say "A prototype option, not a benchmark."

**spec-08 minor (source-method). Internal-process sentences reach the audience: "Kontor scope document" and "whoever owns the cost baseline".**
`#/overview` and `#/evidence` intro: "Public cases summarised from the Kontor scope document. Follow each link to read the source." (council contacts cannot read that document). `#/method` Why 5%: "Agree a rate with whoever owns the cost baseline before you use these figures with a council." and "It is not a figure from the Kontor scope." These are addressed to the Kontor team, on the screen the council is shown. Fix: "Public cases. Follow each link to read the source."; move the cost-baseline sentence to the Demo guide presenter notes.

**spec-09 minor (roadmap-evidence-overlays). Presenter coaching sits in a drawer the Overview offers as its first action.**
The Overview header's only action is "Open demo guide". The drawer's Presenter notes read: "A real estate would flag fewer. Say so if you are asked.", "The 5% renewal rate is a prototype assumption until the cost baseline is agreed.", "Ingestion is not shown ... so do not claim that Kontor takes a batch of public PDFs without help." and "If you are challenged on the numbers, point to the caveat." Honest, but shown to the audience if the presenter clicks the visible button. Fix: move the notes behind `?presenter=1` or a collapsed "For the presenter" disclosure that is closed by default, and keep the button off the page header.

**spec-10 minor (source-method). Method copy bugs.**
`src/views/Method.jsx:412` lower-cases the whole result: "A near miss: C-003 shows 4.4% against a cap of 4.0%. within tolerance." The C-004 worked example prints "Payments rose 12.1% against a cap of 3.0%. Payments rose 12.1% year on year. The contract caps price increases at 3.0%. ..." (the same fact twice). Fix: build the near-miss sentence without `toLowerCase()`; drop the first sentence of the example.

**spec-11 minor (overview-renewals). The on-screen close line differs from spec demo step 4, and the Demo guide offers two different closes.**
Spec: "This is one council's public data. Imagine your full estate." Screen (blueprint decision 8): "This is one council's contracts and spend. Imagine your full estate." Demo guide step 4: "Close on one line: This is one council's contracts and spend. ... You can say: 'This is one council's public data, here simulated. ...'". The change is defensible (the data is fictional), but it alters the owner's script and the guide gives the presenter two lines. Needs sign-off from the spec owner; then one line in both places. Same family: R14 asks for the long caveat of copy deck 7.2 on the Overview and the Overview shows only the short form (deliberate, foundation-status section 4, so the headline fits above the fold); the Overview therefore never mentions the case study that motivates the caveat.

**spec-12 minor (source-method). The spec's organising idea, "what the contract says, what was paid, what others pay", is nowhere on screen.**
Searches of all rendered text for "what other councils pay", "what the contract says", "three things" return nothing. It explains what Stage 1 does and why Stage 2 exists. Fix: two sentences at the top of Method or the Roadmap lead: "Kontor reads what the contract says. This prototype adds what was paid. What other councils pay is Stage 2."

**spec-13 minor (roadmap-evidence-overlays). Roadmap leaves out spec content, and leaves dead data behind.**
(a) The second sentence of the Stage 2 intro, "It runs the same Stage 1 extraction across many councils' contracts.", is missing (test: `spec-evidence.mjs`). (b) The spec's "Stage 1: must-have features" table (What it does, Why it matters) is not rendered; `roadmap.mustHaves`, `mustHavesTitle` and `notYetIntro` in `src/data/roadmap.js` are imported by nothing. (c) The status table gives the four built features a "What it needs" that the spec does not contain ("Kontor's existing extraction, plus 9 new questions", "The three above"). (d) The same feature is "Opportunities list" in the status table and "savings opportunities list" in the Stage 1 column (verbatim spec, allowed by R13). Fix: add sentence (a); render or delete (b); mark (c) as the prototype's own wording.

**spec-14 minor (shared). The spec's "Uplift check" is called something else on every working screen, and the label asserts a price increase the data cannot show.**
"uplift" appears only on Roadmap (1) and Evidence (1). The Roadmap "Uplift check" link goes to `#/opportunities?type=uplift`, a list headed "Price increases above cap"; Method calls it "Price increase check". The evidence is a rise in payments ("Volume changes may explain part of this", Method: "Payments can rise for reasons other than price"), so "Price increase above cap" claims more than the engine knows. Fix: "Payment rise above cap" (flag type, card, chip) and say "Uplift check" once on Method.

**spec-15 minor (opportunities-drawer). Domain and legal assertions the spec does not make are stated as fact in the flag drawer.**
`src/data/reasons.js`: "Spending more than an estimate is not a breach unless the contract also states a maximum." and "A cap is often set on the managed-service fee only." Fix: hedge ("may not be a breach if...") or delete; the drawer already tells the reader to check the clause.

**spec-16 minor (build-docs). No README, no copy of the research, and a stale status document.**
Repo root has no `README.md`; `docs/research/` (promised in `docs/blueprint.md` line 3) does not exist, yet code comments and docs cite `requirements.md` R-numbers and "section 7"; `docs/foundation-status.md` still says "All twelve view files are still stubs". A new engineer or the presenter has no run instructions (`npm run serve`, the standalone file, the demo script) outside `package.json`. Fix: README with run, test, demo script and numbers; copy `requirements.md` into `docs/research/`; mark `foundation-status.md` as historical.

**spec-17 nit (overview-renewals). At 1024x768 the sum line is cut by the fold.**
Overview: h1 now wraps (156 to 252) and the caveat wraps (290 to 330), so cards end at 727 and the sum line sits at 758 to 776 in a 768px window. `foundation-status.md` measured about 705. Cards and headline are fully visible, so R78 passes. Test: `spec-sweep.mjs` "sum line ... fully visible".

**spec-18 nit (shared). Day counts are ungrouped and awkward.**
Contract detail Derived panel: "1090 days left." (C-019, C-021) and "1637 days left." (C-006). R71.7 asks for `en-GB` grouping. `relativeText` in `src/lib/copy.js`. Fix: group digits, or say "about 3 years" beyond 365 days.

**spec-19 nit (shared). Middle dots as separators, against the DS rule.**
The DS README: "Unicode arrows / bullets / chevrons are replaced by Font Awesome glyphs." `·` appears 23 times on Opportunities, 12 on Spend and on Overview, Method and the payments drawers. Fix: a small separator element or a comma.

**spec-20 nit (spend). Rejected Larchmont row says there is no contract to read.**
`#/spend/no-contract` after "Reject match": "6 payments with no contract match. There is no contract to read, so there is no clause to link." A similar-name contract (C-009) exists and you rejected it. Fix: "You rejected the match to Larchmont Grounds Ltd."

**spec-21 nit (roadmap-evidence-overlays). Same link text, two destinations on the Evidence page.**
"Contract register built from documents" goes to `#/spend/no-contract` for Edinburgh and `#/contracts` for Windsor & Maidenhead; only the `aria-label` tells them apart.

**spec-22 nit (spend). Percentages on the No-contract summary add to 100.2%.**
Matched 84%, awaiting review 0.2%, no contract 16% (84.28, 0.20, 15.53). Fix: one decimal place or largest-remainder rounding.

**spec-23 nit (overview-renewals). Adjacent inline spans with no whitespace.**
Overview sum line: `innerText` and copy-paste give "...add up to the headline£4,172,000 + ..."; Method worked-example headings give "Worked exampleThree notice deadlines" in `textContent`. The effect on assistive technology was not measured. Fix: a space or `display: block`.

**spec-24 nit (shared). The About dialog describes the columns of real Transparency Code files.**
"The payment rows look like the files councils publish for payments over £500: date, department, supplier, purpose and amount." The spec says only "payments over £500". Blueprint decision 8 chose this wording; I could not verify the column list offline. Soften to "payments over £500".

## 14. Test run summary

| Script | Result |
|---|---|
| `spec-hard.mjs` | 21 passed, 0 failed |
| `spec-evidence.mjs` | 45 passed, 1 failed (spec-13a) |
| `spec-lint.mjs` (needs `spec-capture.mjs` first) | 30 passed, 4 failed (spec-06 cards, spec-07 Sheffield, spec-05 payments caption, spec-08 and spec-09 internal language) |
| `spec-sweep.mjs` | 99 passed, 2 failed (R14 Overview short caveat, spec-11; sum line at 1024x768, spec-17) |
| `spec-capture.mjs` | 493 captures, no console error, no off-origin request |

Each failing check encodes one defect above and will pass when the defect is fixed.
