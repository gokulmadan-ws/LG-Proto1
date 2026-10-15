# Build spec: Action tracker and Home tab changes

Status: **agreed, ready to build** (decisions D1 to D9 all signed off on 15 Oct 2026).
Visual reference: `docs/action-tracker/action-tracker-spec.html` (open it in a browser). It has mockups of every screen in this spec. Where this file and the mockups differ, **this file wins**.

Audience: a coding agent working in this repository. Read this whole file before you start. Then read `README.md`, `src/lib/estate.js` (header comment), `src/components/FlagDrawer.jsx` and `src/views/Overview.jsx`.

---

## 1. Why

The prototype (Kontor financial layer, Stage 1, fictional Marchbank Borough Council) finds opportunities to investigate (£6.1m across 15 contracts) and links each to its clause. It stops there. In the 12 Oct 2026 weekly sync, the team asked for a way to **act** on each opportunity and to **show what came back**. The Home tab also needs a simpler layout.

Two pieces of work, in this order:

- **Part A: Home tab changes.** Small and independent. Do it first.
- **Part B: Action tracker.** A new Actions page (Board and Results tabs), an Action tab in the opportunity drawer, a close dialog, a new "Resolved" status, a progress strip on Home, and pre-loaded example data.

---

## 2. Ground rules (do not break these)

1. **Static front end only.** No server, no network calls, no AI calls, no email sending. Works offline.
2. **Springboard 2.0 only.** Use the existing kit (`src/ui/`, `src/charts/`, `DS` from `src/ui/ds.js`) and tokens. Never edit `design-system/`. No hex colours or gradients in `src/ui` or `src/charts` (a test checks this).
3. **Copy voice** (tests enforce most of this, see `tests/engine.test.mjs` "copy lint" and `tests/ui-checks.mjs`):
   - Sentence case. "You", not "the user". No exclamation marks. No emoji.
   - Never use the word **"saving"** or **"savings"** in new copy. The allowed places are fixed (caveat, method, evidence, roadmap, reasons). The money-back measure is called **"Value secured"** (D7).
   - Banned button labels: "Click here", "Learn more", "Submit". Buttons are verb + object ("Close action", "Copy email").
   - New copy strings live in `src/lib/copy.js` (or a new `src/lib/actions-copy.js` that the copy lint also walks; add it to the lint).
4. **No clock in derivations.** The as-of date is fixed at **2026-10-06** (`AS_OF` in `src/lib/engine.js`). Every "due in N days", "last 30 days" and every new `closedAt` uses `AS_OF`. The only real-clock use allowed is the `at` timestamp on activity log entries and notes (as `addFeedback` does today).
5. **Do not change the extraction set.** `data.extractions` stays at 336 and the question set stays at 9 (tests hardcode both). New contract facts (representatives) go in a separate data file (section 6.2).
6. **Accessibility is mandatory.** Keyboard access for everything, visible focus, WCAG AA contrast, 44 x 44 px touch targets, `aria-label` on icon-only buttons. Destructive actions confirm first (Springboard MOD rule). The smoke tests run axe in both themes; keep them green.
7. **Headline at the start of the demo stays £6.1m** (£6,145,238 across 15 contracts). All pre-loaded open actions are "Under review" (still counted). All pre-loaded closed history is on contracts with **no flag today**.
8. `dist/` is committed. After changes, run `npm run build` and `npm run standalone` and commit the output.
9. Never use pronouns for the fictional people in copy. Use names and roles only.

---

## 3. Decisions (all agreed)

| ID | Decision |
|---|---|
| D1 | Choosing **"Under review"** in the drawer starts an action (puts a card on the board). A "Start action" button on the Action tab does the same thing. |
| D2 | Board columns: **To start · Checking internally · With supplier · Closed**. |
| D3 | New review status **"Resolved"**, with money fields. Extended into a **Results** tab. |
| D4 | Emails are **fixed templates** filled with contract facts. No AI. |
| D5 | Board starts with **4 open example cards** (ICT, Facilities, Waste, Street lighting). Highways is left for the live demo. |
| D6 | **Exit terms** shown on the Action tab, as facts with clause links. No options maths. |
| D7 | The money measure is **"Value secured" = "Cash recovered" + "Cost avoided"**. |
| D8 | Results starts with **5 closed actions of example history** (May to Sep 2026) on unflagged contracts. |
| D9 | Clicking a **renewal diamond** on Home opens that renewal in the opportunity drawer. |

---

## 4. Part A: Home tab changes

File: `src/views/Overview.jsx`, `src/views/Overview.css`, `src/charts/RadarStrip.jsx`.

### A1. Remove "Why this matters"

- Delete the evidence strip panel (`COPY.evidenceStrip`, `EvidenceCase`, `FEATURED`) from the Overview.
- Keep the Evidence page (`#/evidence`) and its Menu item (`MenuPopover.jsx`, "Why this matters"). Do not delete `src/data/evidence.js` or the copy the Evidence page uses.
- Update the file header comment and the "Links out" list.

### A2. Replace "Spend linked to contracts" with a "Cap vs spend" panel

- Remove the `CoverageMeter` panel from the Overview. The coverage figures (84% linked, no contract, waiting for review) stay on the Cap vs spend page, "No contract on the register" tab. Do not delete `CoverageMeter`.
- New panel, title **"Cap vs spend"** (same as the rail label), description "What you have paid against the most each contract allows.", action button "Open cap vs spend" (outline, small, right arrow) to `#/spend`.
- Contents, top to bottom:
  1. Three count pills: "Over cap 3", "Close to cap 3", "Within cap 18" (from `estate.capRows` states `over` / `near` / `ok`; reuse `CapStatePill` or the existing pill styles).
  2. Summary line: **£4,172,000** "paid above the cap, across 3 contracts" (sum of `excessGBP` for over-cap rows; compute it, never type it).
  3. A compact `BulletList` (`src/charts/BulletList.jsx`) with `limit={5}`, from the same items the Cap vs spend page builds. Expected rows, in order: Highways reactive maintenance and minor works 167.0%, ICT managed service and end-user support 114.1%, Legal services panel 113.8%, Integrated facilities management 94.8%, Mobile voice and data 90.8%. Each row opens that contract's cap-related flag in the drawer (`setQuery({ flag })`) if it has one, otherwise `#/spend`. If `BulletList` is too wide for a half panel, add a `compact` prop (hide the numbers column, keep the % figure); do not fork the component.
  4. A text link: "See all 24 contracts" to `#/spend`.

### A3. Two equal panels, Cap vs spend first

- The row that holds the two panels changes from `kx-grid--2-1` to two equal columns. Order: **Cap vs spend (left), Renewals coming up (right)**.
- Stack to one column below 1100 px wide (same breakpoint `kx-grid--2-1` uses today), Cap vs spend first. Add a modifier class in `src/ui/kit.css` (for example `kx-grid--halves`) rather than changing `kx-grid--2`.
- The Renewals panel keeps its content. At half width the three band values must not overflow: let "a year" wrap under the figure if needed, and check at 1280 px and 1440 px.

### A4. Tooltips on the renewal diamonds

In `RadarStrip.jsx` the diamonds are `aria-hidden` spans today. Change them to:

- Focusable buttons (one per contract), in date order, with a roving tabindex or plain tab order, and an `aria-label` that holds the full tooltip text.
- On hover, keyboard focus or tap: show a tooltip using the existing `useChartTip` / `ChartTip` from `src/charts/Tip.jsx`. Content:
  - Contract title (bold)
  - Supplier name
  - "Give notice by 31 Oct 2026, in 25 days" (use the existing `relativeText` / date helpers in `src/lib/copy.js`; amber text in the m3 band)
  - "£6.2m a year · ends 31 Jan 2027"
  - Small muted line: "Opens the opportunity in the side drawer."
- On click or Enter: open the drawer for that renewal flag, `setQuery({ flag: row.flagId })` (`radarRows` already carries `flagId`) (D9).
- Two contracts share 28 Feb 2027 (C-005 and C-018). Each keeps its own diamond (they are already offset vertically) and its own tooltip.
- The tooltip must never say "saving" (a UI test checks `.kviz-tip`).

### A5. Final Home order (after Part B too)

1. Page header: headline sentence, as-at line, caveat, "Open demo guide".
2. Headline breakdown panel (the four type cards and the sum line). No change.
3. **Action progress strip** (Part B, section 8.5).
4. Row: **Cap vs spend** | **Renewals coming up**.
5. Close panel ("This is one council's contracts and spend...", "Give feedback", "See what comes next"). No change.

---

## 5. Part B: Action tracker, overview

```
Opportunity drawer: Review status = "Under review"
        │  creates (or reopens) an action, stage "To start"
        ▼
Actions page, Board tab:  To start → Checking internally → With supplier → Closed
        │  card opens the drawer on its Action tab: owner, due, steps, contacts, email, exit terms, activity
        ▼
Close dialog: Resolved (cash recovered, cost avoided) | Explained | No action
        │
        ▼
Actions page, Results tab: Value secured, by month, list of closed actions.   Home: progress strip.
```

---

## 6. Part B: data

### 6.1 Staff list: `src/data/people.js` (new, static, fictional)

Export `PEOPLE` (array) and `peopleById`. Email domain is `marchbank.example` (the reserved `.example` domain).

| id | name | role | initials |
|---|---|---|---|
| P-dana | Dana Okafor | Highways Contract Manager | DO |
| P-jo | Jo Whitfield | Head of Highways and Transport | JW |
| P-sam | Sam Adeyemi | Environment Contract Manager | SA |
| P-rae | Rae Lindqvist | Head of Environment | RL |
| P-lena | Lena Fairbairn | ICT Service Manager | LF |
| P-chris | Chris Odukoya | Facilities Manager | CO |
| P-morgan | Morgan Hale | Head of Corporate Services | MH |
| P-ash | Ash Patel | Commissioning Manager | AP |
| P-kim | Kim Osei | Head of People Services | KO |
| P-priya | Priya Raman | Category Manager, Procurement | PR |
| P-tom | Tom Ellery | Finance Business Partner | TE |

Email: `firstname.lastname@marchbank.example`, lower case.

Role mapping by `contract.serviceCategory` (export `ownerFor(contract)`, `budgetHolderFor(contract)`, plus constants `PROCUREMENT_LEAD = 'P-priya'`, `FINANCE = 'P-tom'`):

| serviceCategory | Contract owner | Budget holder |
|---|---|---|
| Highways and street lighting, Parking and traffic, Transport | P-dana | P-jo |
| Waste and recycling, Parks and open spaces | P-sam | P-rae |
| ICT | P-lena | P-morgan |
| Facilities management, Energy, Fleet | P-chris | P-morgan |
| Legal and professional | P-priya | P-morgan |
| Adult social care, Catering, Leisure and culture, Housing | P-ash | P-kim |

Check every category in `sample.json` is covered; fall back to P-priya / P-morgan.

### 6.2 Contract representatives: `src/data/representatives.js` (new)

Contracts name both sides' representatives. In a real build Kontor would extract them. Here they are static, with a clause, page and quote so the UI can show where they come from. **They are not added to `data.extractions`** (ground rule 5).

For each of the 24 contracts export:

```js
{
  contractId: 'C-005',
  authority: { personId: 'P-dana', clauseRef: 'Clause 3.1', page: 6,
               quote: "The Authority's Representative is the Highways Contract Manager, currently Dana Okafor (dana.okafor@marchbank.example)." },
  supplier:  { name: 'Alex Merrow', role: 'Contract Director', email: 'alex.merrow@fennimore.example', clauseRef: 'Clause 3.2', page: 6,
               quote: "The Supplier's Representative is Alex Merrow, Contract Director (alex.merrow@fennimore.example)." },
}
```

- `authority.personId` = `ownerFor(contract)`.
- Supplier names: take supplier `S-01` to `S-24` in order and give each the matching name from this pool. Role is "Contract Director" for all.
  `Robin Achterberg, Jordan Pike, Casey Thorne, Sam Kellaway, Alex Merrow, Jamie Otieno, Taylor Brennan, Morgan Ellwood, Charlie Nakamura, Drew Halloran, Rowan Fitzgerald, Avery Lindgren, Quinn Bellamy, Reese Mbeki, Emerson Vale, Hayden Rook, Logan Petrakis, Parker Quill, Riley Ashdown, Sasha Kowal, Toby Lennard, Frankie Adair, Blair Henshaw, Jesse Calloway`
  Check that `S-05` is Fennimore Highways Ltd and gets **Alex Merrow**. If the order differs, fix the pool order so that C-005's supplier gets Alex Merrow.
- Supplier email domain: first word of the supplier legal name, lower case, `.example` (`fennimore.example`).
- Clause refs: always Clause 3.1 and Clause 3.2, page 6. The source viewer has no page 6, so **do not link these to the source viewer**. Show the quote inline (section 8.2).

### 6.3 Step lists: `src/data/action-steps.js` (new)

Export `stepsFor(flag)` returning `[{ id, text, hint? }]` by flag type (renewal variants share the renewal list).

**overCap**
1. `oc-variation`: Check the contract file for a variation or change notice.
2. `oc-owner`: Ask the contract owner if the extra spend was approved.
3. `oc-finance`: Ask finance to confirm the payment total. *Hint:* Payment files can include VAT, credit notes or re-bills.
4. `oc-supplier`: If no approval is found, raise it with the supplier.
5. `oc-record`: Record the outcome and close the action.

**nearCap**
1. `nc-tell`: Tell the budget holder the cap will be reached.
2. `nc-variation`: Find out if a variation is planned.
3. `nc-decide`: Decide: vary the contract, reduce the work or re-procure.
4. `nc-record`: Record the decision and close the action.

**renewal**
1. `rn-notice`: Confirm the notice date and terms in the contract.
2. `rn-owner`: Ask the contract owner: extend, renegotiate or re-procure?
3. `rn-price`: Check the current price against the market or a framework.
4. `rn-supplier`: Ask the supplier for renewal terms before the notice date.
5. `rn-record`: Record the decision and close the action.

**uplift**
1. `up-clause`: Check the indexation clause and the index figure for the year.
2. `up-invoices`: Ask finance for the invoices behind the rise.
3. `up-supplier`: Ask the supplier to explain the increase.
4. `up-credit`: Agree a credit or a price correction.
5. `up-record`: Record the outcome and close the action.

"Next step" on a card = the first step not ticked.

### 6.4 Who to contact: `contactsFor(flag, contract)`

Returns an ordered list of `{ kind, person | supplierRep, why, source }`. `source` is either `{ clauseRef, page, quote }` (from representatives) or `'Staff list'`.

| Flag type | Order | "why" line |
|---|---|---|
| overCap | Contract owner, Budget holder, Finance, Supplier rep | Contract owner: "Knows if a variation was agreed." · Budget holder: "Signs off spend in this service." · Finance: "Can confirm what was paid and when." · Supplier: "Supplier's named contact. Use after the internal check." |
| nearCap | Budget holder, Contract owner, Procurement lead, Supplier rep | Budget holder: "Owns the budget this contract will exceed." · Contract owner: "Knows what work is still to come." · Procurement: "Can advise on a variation or a new procurement." · Supplier: "Can forecast the spend still to come." |
| renewal | Contract owner, Procurement lead, Budget holder, Supplier rep | Contract owner: "Decides whether to extend, renegotiate or re-procure." · Procurement: "Can compare the price with frameworks." · Budget holder: "Signs off the renewal." · Supplier: "Can offer renewal terms." |
| uplift | Finance, Contract owner, Supplier rep | Finance: "Holds the invoices behind the rise." · Contract owner: "Knows if the increase was agreed." · Supplier: "Must explain the increase and any credit." |

Contract owner and supplier rep come from `representatives.js` (show their clause). Budget holder, procurement lead and finance come from the staff list (source "Staff list").

### 6.5 Email templates: `src/data/email-templates.js` (new)

Export `emailFor(flag, contract, derived, recipient, due)` returning `{ to: { name, email }, subject, body }`. Fill from engine numbers and from the flag's evidence (`evidenceFor(flag)` gives `clauseRef`, `page`, `quote`). Money with `fmtGBP` (to the pound). Dates as "20 October 2026". Sign-off is literally `[Your name]`. Recipients offered in the "To" select = the contacts list for that flag. Internal people get the "internal" template; the supplier rep gets the "supplier" template.

**overCap, internal** (C-005 to Dana Okafor must render exactly like this):

```
Subject: C-005 Highways reactive maintenance and minor works: spend is £3,350,000 above the cap

Hi Dana,

Our contract review flagged the Highways reactive maintenance and minor works contract (C-005, Fennimore Highways Ltd).

- Clause 14.3, page 23: "The Council's liability to pay the Charges under this Agreement shall not exceed £5,000,000 in aggregate (the Maximum Contract Value) unless increased by a Variation under clause 41."
- Payments to date are £8,350,000. That is £3,350,000 above the cap.

Can you tell me by 20 October 2026:
1. Was a variation approved that raised the cap?
2. Was extra work added to the scope?
3. Who approved the payments above the cap?

The clause and the payment list are in Kontor.

Thanks,
[Your name]
```

For an annual cap (`cap.basis === 'annual'`), say "Payments in the contract years that went over are {spend}" using the breakdown numbers the drawer already shows. For `capState === 'above_estimate'`, say "contract value" instead of "cap" throughout.

**overCap, supplier**

```
Subject: {id} {title}: payments above the contract maximum

Dear {first name},

We are reviewing the {title} contract ({id}).

{clauseRef} sets a maximum of {cap}. Our records show payments of {spend}, which is {excess} above that maximum.

Please send us by {due}:
1. Any variation or change notice that you believe raised the maximum.
2. A statement of the invoices paid under this contract.

Kind regards,
[Your name]
Marchbank Borough Council
```

**nearCap, internal**

```
Subject: {id} {title}: spend will pass the cap

Hi {first name},

The {title} contract ({id}, {supplier}) has used {pct} of its {cap} cap. At the pace of the last 12 months, spend will pass the cap by about {projected excess}.

- {clauseRef}, page {page}: "{quote}"

Can we agree by {due} what to do:
1. Vary the contract to raise the cap.
2. Reduce or re-scope the work.
3. Start a new procurement.

Thanks,
[Your name]
```

**nearCap, supplier**

```
Subject: {id} {title}: forecast of remaining spend

Dear {first name},

The {title} contract ({id}) has used {pct} of its {cap} maximum. Please send us by {due} a forecast of the spend still to come under this contract, by month.

Kind regards,
[Your name]
Marchbank Borough Council
```

**renewal, internal** (`{situation}` by variant: upcoming "needs a notice decision by {deadline}"; notice_passed "passed its notice date on {deadline}, so it may renew on the current terms"; out_of_contract "ended on {endDate}, but {afterEnd} has been paid since")

```
Subject: {id} {title}: renewal decision needed

Hi {first name},

The {title} contract ({id}, {supplier}) {situation}.

- {clauseRef}, page {page}: "{quote}"
- Annual value: {annual}.

Can we decide by {due} whether to:
1. Extend, and ask for better terms.
2. Let it end and re-procure.
3. Renegotiate now.

Thanks,
[Your name]
```

**renewal, supplier**

```
Subject: {id} {title}: renewal terms

Dear {first name},

The {title} contract ({id}) ends on {endDate}. Before we decide on renewal, please send us by {due}:
1. Your proposed rates for any extension.
2. Any improvements you can offer on price or service.

Kind regards,
[Your name]
Marchbank Borough Council
```

**uplift, internal**

```
Subject: {id} {title}: price rise above the index cap

Hi {first name},

The {title} contract ({id}, {supplier}) limits yearly price rises to {index cap}. Payments in the last 12 months suggest a rise above that limit, about {excess} more than the contract allows.

- {clauseRef}, page {page}: "{quote}"

Can you send me the invoices behind the rise by {due}?

Thanks,
[Your name]
```

**uplift, supplier**

```
Subject: {id} {title}: price increase above the contract cap

Dear {first name},

{clauseRef} of the {title} contract ({id}) limits yearly price increases to {index cap}. Our payments show an increase above that limit, about {excess}.

Please explain the increase by {due}, and confirm how you will credit any amount above the cap.

Kind regards,
[Your name]
Marchbank Borough Council
```

Add every template's fixed text to the copy lint.

### 6.6 Pre-loaded actions: `src/data/actions-seed.js` (new)

`SEED_ACTIONS` (an object keyed by flag id) and `SEED_TRIAGE` (`{ [flagId]: 'under_review' }` for the 4 open ones). Log timestamps are fixed ISO strings before 6 Oct 2026.

**Open (D5).** All `under_review`.

| flagId | Contract | Stage | Owner | Due | Steps ticked | Log (oldest first) |
|---|---|---|---|---|---|---|
| F-C-007-overCap | ICT managed service and end-user support | checking | P-priya | 2026-10-16 | oc-variation, oc-owner | started 28 Sep; owner set; 2 steps ticked |
| F-C-001-nearCap | Integrated facilities management | checking | P-tom | 2026-10-30 | nc-tell | started 1 Oct; owner set; 1 step ticked |
| F-C-003-renewal | Waste collection and recycling | with_supplier | P-sam | 2026-10-31 | rn-notice, rn-owner, rn-price | started 15 Sep; moved to With supplier 2 Oct |
| F-C-004-uplift | Street lighting and signage maintenance | with_supplier | P-priya | 2026-10-23 | up-clause, up-invoices, up-supplier | started 22 Sep; note "Supplier has offered a credit note." |

**Closed history (D8).** `example: true`. Contracts with no flag today. Flag ids are synthetic (`H-...`) and are **not** in `estate.flagsById`, so each record carries its own `contractId`, `flagType` and `flaggedGBP`.

| id | Contract | flagType | flaggedGBP | Outcome | Cash recovered | Cost avoided | closedAt | Owner | What happened |
|---|---|---|---|---|---|---|---|---|---|
| H-C-024-uplift | Contact centre telephony | uplift | 47,300 | resolved | 12,400 | 31,200 | 2026-05-22 | P-tom | Rise cut back to CPI, refund paid. |
| H-C-006-nearCap | Leisure centres management | nearCap | 230,000 | explained | | | 2026-06-09 | P-jo | A 2024 variation raised the cap. |
| H-C-020-uplift | Civic buildings cleaning | uplift | 64,000 | resolved | 21,500 | 54,000 | 2026-06-19 | P-sam | Overcharge refunded, rate corrected. |
| H-C-008-overCap | Housing repairs and voids | overCap | 112,000 | resolved | 84,000 | | 2026-07-14 | P-priya | Duplicate invoices credited. |
| H-C-013-overCap | School meals catering | overCap | 58,000 | no_action | | | 2026-09-03 | P-tom | Extra holiday club meals, approved and grant funded. |

Check first that none of C-024, C-006, C-020, C-008, C-013 has a flag in `estate.flags`. If one does, swap it for another unflagged contract (C-019, C-021, C-022, C-023 are candidates) and keep the totals the same.

---

## 7. Part B: state and rules

### 7.1 New review status "Resolved"

- `src/lib/estate.js`: `TRIAGE_STATUSES` adds `'resolved'`; `sanitiseTriage` accepts it.
- `src/lib/copy.js`: `TRIAGE_OPTIONS` order: To investigate, Under review, **Resolved**, Explained, No action.
- `src/lib/engine.js` `isCounted` / `isExcluded`, `src/charts/adapters.js` `counted`, `src/charts/flags.js` review status map (`resolved: { label: 'Resolved', glyph: 'circle-check', reviewed: true }`), `src/views/contracts/Flags.jsx` `REVIEWED`, and the `reviewed` test in `FlagDrawer.jsx`: treat `resolved` like `explained` (reviewed, **not counted** in the headline, counted in `excludedGBP`).
- Grep for `'explained'` and `not_an_issue` across `src/` and handle every place.

### 7.2 Action store

Add a new state slice `actions` to the estate provider, persisted under a new key `KEYS.actions = 'kontor-actions'` in `src/lib/storage.js`. Put the pure logic in a new `src/lib/actions.js` so it can be unit tested without React.

```js
// actions[flagId]
{
  flagId, contractId, flagType, flaggedGBP,          // flaggedGBP: indicative value when the action started
  stage: 'to_start' | 'checking' | 'with_supplier' | 'closed',
  owner: personId | null,
  due: 'YYYY-MM-DD',
  steps: { [stepId]: true },
  notes: [{ at, text }],                             // newest first in the UI
  log: [{ at, text }],                               // plain sentences, newest first in the UI
  outcome: null | 'resolved' | 'explained' | 'no_action',
  cashRecoveredGBP: number | null,
  costAvoidedGBP: number | null,
  closeNote: string | null,
  closedAt: 'YYYY-MM-DD' | null,                     // always AS_OF for new closures
  archived: boolean,                                 // true when the flag goes back to To investigate
  example: boolean,                                  // pre-loaded (shows an "Example" tag in Results)
}
```

Sanitise on read like the other slices (unknown stages, negative or non-finite money, unknown flag ids that are not `H-` history: drop).

**First load and reset.** When `kontor-actions` is absent, initial state = `SEED_ACTIONS`, and `SEED_TRIAGE` is merged into `triage` for any seeded flag that has no stored triage. `resetAll()` restores both seeds. `useResetDemo().changeCount` must compare against the seeded state, so a fresh load still says "Already at the starting numbers."

### 7.3 Sync rules (one status per opportunity; board and drawer always agree)

| Event | Result |
|---|---|
| Drawer status → Under review | If no action: create `{ stage: 'to_start', due, owner: null }`. If archived: unarchive, keep everything. Log "You set the review status to Under review." |
| `due` on create | `flag.actionBy` if it is on or after AS_OF, else AS_OF + 14 days (2026-10-20). |
| Drawer status → To investigate | `archived: true`. Card leaves the board. Data kept. |
| Drawer status → Resolved / Explained / No action | Open the **close dialog** with that outcome preselected. Confirm: close the action (below). Cancel: status stays as it was. If no action exists yet, create one first, then close it. |
| Board: card moved to Closed | Open the close dialog. Confirm: close. Cancel: card stays. |
| Close (confirm) | `stage: 'closed'`, outcome, money, note, `closedAt: AS_OF`; triage → `resolved` / `explained` / `not_an_issue`. Log "You closed this as Resolved: £150,000 cash recovered." |
| Board: closed card moved back to an open stage | triage → `under_review`, `outcome: null`, `closedAt: null`, money kept but not counted. Log it. |
| Board: card moved between open stages | Stage changes. Log "You moved this to Checking internally." |
| Owner, due, step tick, note, Copy email, Mark as sent | Update and log ("You copied the email to Dana Okafor.", "You marked the email to Dana Okafor as sent."). |

### 7.4 Derived numbers (pure functions in `src/lib/actions.js`)

- **Being worked on** = sum of `flag.indicativeGBP` for non-archived actions in open stages whose flag is `under_review`.
- **Not started** = headline total − being worked on. "N flags with no action yet" = counted flags with status `to_investigate`.
- **Due in the next 14 days** = open actions with `due` ≤ AS_OF + 14 days (includes overdue).
- **Value secured** = sum over `outcome === 'resolved'` of `cashRecoveredGBP + costAvoidedGBP`. Split into cash recovered and cost avoided, with action counts (an action counts in a split if its figure is > 0).
- **Closed column** shows actions with `closedAt` in the 30 days up to AS_OF. Older ones are only in Results.
- **By month closed**: group resolved actions by `closedAt` month, April to October 2026 (show months from the first closure month or April, whichever is earlier, up to AS_OF month).

---

## 8. Part B: screens

### 8.1 Opportunity drawer (`src/components/FlagDrawer.jsx`)

- Add tabs under the title: **Details** (all of today's content, unchanged) and **Action**. URL: `?flag=<id>&tab=action` opens on the Action tab; default Details. Use the kit `RouteTabs` or `Tabs`; keyboard accessible.
- Footer: the Review status select stays. Help text when an action exists: "Counted in the headline. Stage: Checking internally." When status changes to Under review, the toast says: title "{contract title}: added to Actions." description "The headline is still £6.1m. Set an owner to get started." (headline computed), with an action button "Open in Actions" that goes to `#/actions` and highlights the card.
- Closing statuses go through the close dialog (section 7.3).

### 8.2 Action tab (inside the drawer)

If there is no action (status To investigate): empty state "Nobody is working on this yet." and a primary button "Start action" (sets Under review).

Otherwise, top to bottom:

1. **Who and when**: three fields in a row (stack on phones): Stage (select, the four stages), Owner (select from `PEOPLE`, with initials avatar; "Not set" allowed), Due (date input, shows "20 Oct 2026").
2. **Next steps**: checklist from `stepsFor(flag)`. Header shows "2 of 5 done". Ticked steps are struck through and muted. Hints show under the step in small muted text.
3. **Who to contact**: rows from `contactsFor`. Each: initials avatar, name, role, "why" line, and on the right the source: for representatives "Authority's Representative · Clause 3.1, page 6" (or Supplier's) with a disclosure that shows the quote; for staff "Staff list". Header note "Sample names".
4. **Draft email**: "To" select (contacts list, defaults to the first one), Subject line, Body (read-only, pre-wrapped). Buttons: primary **"Copy email"** (copies "Subject: ...\n\n" + body; use `navigator.clipboard.writeText` inside the click handler; on failure select the text and say "Your browser blocked copying. The email text is selected, so press Ctrl+C or Cmd+C.") and secondary **"Mark as sent"**. Both add a log line. Header note "Check before you send". The app never sends anything.
5. **Exit terms** (D6): three facts from the contract and its extractions, each with a `ClauseLink` to the existing extraction: "End for convenience" (`terminationForConvenience`: "Yes, 3 months' notice" or "No"), "Exit fee" (`exitFees` summary), "Contract ends" (end date, linked to the `noticePeriod` or `endDate` extraction). Header note "From the contract".
6. **Activity**: "Add a note" input (Enter or an "Add note" button), then the log, newest first, each line "6 Oct, 10:12 · You ticked ...". Notes show in the same list with a note icon.

Checks for C-005: steps 5, contacts Dana Okafor / Jo Whitfield / Tom Ellery / Alex Merrow, email exactly as section 6.5, exit terms "Yes, 3 months' notice" (Clause 30.1, page 31), "None" (Clause 33.2, page 33), "31 May 2027".

### 8.3 Close dialog

Kit `Dialog`. Title "Close this action". Subtitle "{contract} · {flag type} · {flagged £} flagged".

- Outcome: radio group Resolved / Explained / No action (preselected from the trigger).
- If Resolved: two money inputs side by side, "Cash recovered" (help "One-off money back, like a refund or credit note") and "Cost avoided" (help "Future spend that will not happen, like a lower rate"). Whole pounds, at least one must be > 0. Error: "Enter an amount. Add cash recovered, cost avoided or both."
- "What happened" text input, required for all outcomes (max 140 characters). Error: "Add one line on what happened."
- Muted hint: "Your figures. Kontor shows them as you enter them and does not check them."
- Buttons: "Cancel" (secondary), **"Close action"** (primary). Success toast: "{contract}: closed as Resolved. Value secured is now £353,100." (computed).

### 8.4 Actions page (`#/actions`, `#/actions/results`)

- New view `src/views/Actions.jsx` (+ `Actions.css`), route in `src/routes.js`: `actions: { title: 'Actions', rail: 'actions', maxSeg: 1, valid: seg empty or 'results' }`.
- Rail (`src/shell/rail.js`): add `{ id: 'actions', label: 'Actions', icon: 'fa-solid fa-list-check', short: 'Actions' }` **after Opportunities**. Seven items. Check the phone bottom bar at 375 px and 390 px: all captions visible, no overflow. If it does not fit, shorten captions, do not drop items.
- Page header: eyebrow council name, title "Actions", description "Opportunities your team is working on. As at 6 October 2026." Tabs: **Board** | **Results** (route-driven).

**Board tab**

- Stat row: Being worked on (£), Open actions (count), Due in the next 14 days (count, amber when > 0), Value secured to date (£, links to Results).
- Filters: Owner select (Everyone, then each person who owns at least one action), flag type chips (same chips as Opportunities). Filters live in the query string like the Opportunities page.
- Four columns. Header: stage name, count, £ total (Closed shows "Last 30 days" instead of a total). Cards sorted by due date, soonest first.
- Card: flag type pill; "Just added" chip for actions created in this browser session; title; supplier; indicative £ (to the pound); due chip ("Due 16 Oct", amber within 14 days, red and "Overdue" when past AS_OF; renewals say "Notice by 31 Oct"); owner avatar (dashed "?" when not set); progress bar "2 of 5"; "Next: {first unticked step}." Closed cards: outcome pill and "£150,000 cash recovered (your figure) against £188,200 flagged. Closed 6 Oct."
- Clicking a card opens the drawer on the Action tab (`setQuery({ flag, tab: 'action' })`).
- Moving cards: (1) drag and drop between columns (HTML5 drag events are enough), and (2) a **"Move to"** menu button on every card for keyboard and touch users. Moving to Closed opens the close dialog.
- Empty column: dashed box "Drag a card here, or use Move to on a card."
- Phone (< 760 px): no columns; one list grouped by stage with stage headers. "Move to" still works.

**Results tab**

- Tiles: **Value secured** (large, "Since May 2026" = month of the earliest closure), Cash recovered (green swatch, "N actions"), Cost avoided (accent swatch, "N actions"), Actions closed ("4 resolved · 1 explained · 1 no action").
- Chart "Value secured, by month closed": stacked bars per month, cash recovered (green) under cost avoided (accent), value label on top of each bar, y axis in £k. Reuse `StackedBar` or `YearBars` from `src/charts/` if one fits; otherwise build it in `src/charts/` from tokens. Must have an accessible table or `aria-label` with the values.
- Table of closed actions, newest first: Closed (date), Contract (bold title, then "{flag type} · {what happened}" muted, plus an "Example" tag for `example: true`), Outcome pill, Cash recovered, Cost avoided ("None" when empty), Owner. The latest closure row is highlighted.
- Footer note: "Your figures. Kontor does not check them."

### 8.5 Home: Action progress strip

Panel titled "Action progress", description "From the Actions board.", button "Open Actions". Three blocks with a coloured left border:

- **Not started**: £ (compact), "15 flags with no action yet".
- **Being worked on** (accent): £ (compact), "4 actions. 1 due in the next 14 days."
- **Value secured** (green): £ (to the pound), "3 actions resolved since May. Your figures." + link "See results" to `#/actions/results`.

### 8.6 Other screens

- **Opportunities list**: rows with an open action show the stage and the owner's initials next to the existing badges ("Checking internally · PR"). Keep the existing Open / Reviewed / All filter. `resolved` counts as Reviewed.
- **Contract detail**: add a "Representatives" block with both named representatives (name, role, email, clause and quote).
- **Roadmap** (`src/data/roadmap.js`): add two status rows, after "Opportunities list": `{ id: 'action-tracker', feature: 'Action tracker', status: 'built', needs: 'Named contacts from the contract and a staff list', href: '#/actions' }` and, with the "Not yet" rows, `{ id: 'suggested-steps', feature: 'Suggested next steps', status: 'notYet', notInPrototype: true, needs: 'A history of closed actions to learn from' }`. Do not change any string marked verbatim.
- **Guide** (`src/views/guide-content.js`): keep the four-step tour (`demoSteps`) **unchanged** (tests pin it). Add the Actions page to "Screens at a glance" and add "Try these" items: start an action on Highways; copy the draft email; drag Street lighting to Closed as Resolved with £150,000; open Results. Add glossary entries: Action, Value secured, Cash recovered, Cost avoided.
- **README.md**: add a section "Show the action tracker in 90 seconds" (section 10), update the rail list, the "Things worth trying live" line and "What it does not do".

---

## 9. Numbers to verify (acceptance)

Fresh load (or after Reset demo data):

| Where | Expected |
|---|---|
| Home headline | £6.1m across 15 contracts (£6,145,238) |
| Home, Action progress | Not started £4.2m (£4,244,560), 15 flags · Being worked on £1.9m (£1,900,678), 4 actions, 1 due in 14 days · Value secured £203,100, 3 resolved since May |
| Home, Cap vs spend | Over cap 3, Close to cap 3, Within cap 18; £4,172,000 above the cap; top row Highways 167% |
| Home, Renewals | 9 diamonds; tooltip on the first: Waste collection and recycling, Quillon Waste Services Ltd, notice by 31 Oct 2026, in 25 days, £6.2m a year, ends 31 Jan 2027 |
| Board | To start 0 · Checking internally 2 (£1,402,478) · With supplier 2 (£498,200) · Closed 0 |
| Results | Value secured £203,100 · Cash recovered £117,900 (3) · Cost avoided £85,200 (2) · 5 closed: 3 resolved, 1 explained, 1 no action |

After the demo script (section 10):

| Where | Expected |
|---|---|
| Home headline | £6.0m (£5,957,038) across 15 contracts |
| Board | To start 1 (Highways £3,350,000, due 20 Oct) · Checking 2 · With supplier 1 (Waste) · Closed 1 (Street lighting) · Being worked on £5.1m (£5,062,478) · Due in 14 days 2 |
| Results | Value secured £353,100 · Cash recovered £267,900 (4) · Cost avoided £85,200 (2) · 6 closed: 4 resolved, 1 explained, 1 no action. Bars: May £43.6k, Jun £75.5k, Jul £84k, Oct £150k |
| Home, Action progress | Value secured £353,100 |

---

## 10. Demo script (README and Guide "Try these")

Before the tour, on Home: hover a renewal diamond to show which contract it is.

1. **Start it.** Open Highways (£3.35m over cap). Set "Under review". Say: "Now someone owns it."
2. **See the board.** Click "Open in Actions". The card is in To start, next to four others already in progress.
3. **Know who to call.** Open the card. Set Dana Okafor as owner. Show the representatives, from clause 3 of the contract.
4. **Make the first move.** Copy the draft email. Say: "Ten seconds, and the contract facts are already in it." Mention that templates could be swapped for AI drafts later.
5. **Close the loop.** Drag Street lighting to Closed. Choose Resolved and enter £150,000 cash recovered, "Credit note for the 2026 price rise above CPI."
6. **Show what came back.** Open Results. Value secured goes from £203,100 to £353,100.

---

## 11. Out of scope

- Sending email or calendar invites. Copy only.
- Logins, teams, permissions, a shared board. Each browser has its own state (localStorage), like the rest of the prototype.
- Reminders or notifications.
- AI recommendations or AI-written emails (Roadmap row only).
- Options analysis (exit cost against overspend maths).
- Checking Value secured figures.
- New pages in the source viewer for the representatives clause.

---

## 12. Build order and checks

Work in small commits, one per step. Run the fast checks after each.

1. **Setup**: `npm install`. Run `npm test` and `npm run test:ui` once to see the baseline (`npm run test:e2e` is slower; run it at the end of each part).
2. **Part A** (section 4). Update the Overview e2e (`tests/e2e/V1.mjs` covers the Overview) for the removed panels, the new panel order and the diamond tooltip. Build, test, commit.
3. **Data** (section 6) + **Resolved status** (7.1). Engine/unit tests: seed totals, representatives for all 24 contracts, C-005 email text exact, steps per type.
4. **Action store and rules** (7.2 to 7.4) in `src/lib/actions.js` with unit tests for every row of the sync table and every number in section 9. Reset and `changeCount`.
5. **Drawer**: tabs, Action tab, close dialog (8.1 to 8.3).
6. **Actions page** (8.4), rail, route.
7. **Home strip, Opportunities, Contract detail, Roadmap, Guide, README** (8.5, 8.6).
8. **Tests**: add `tests/e2e/actions.mjs` that runs the demo script in section 10 and checks every number in section 9, in both themes, at 1440 px and 390 px. Fix every existing test that the seeds or the new rail item change (initial statuses, rail count, reset behaviour). Never skip or weaken a test to get green; change an expectation only when this spec changes the behaviour, and say so in the commit message.
9. `npm run build`, `npm run standalone`, `npm run test:all`. Commit `dist/`.
10. Screenshot Home, Board, Results and the Action tab (dark and light) with `tests/shot.mjs` or Playwright, and check them against the mockups in `action-tracker-spec.html`.

Definition of done: `npm run test:all` green; every number in section 9 checked by a test; the demo script works end to end in the built `dist/` and in `dist/kontor-prototype.html`; no "saving" in new copy; axe clean in both themes.
