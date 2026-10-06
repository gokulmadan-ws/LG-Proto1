# Review "fun": functional QA lead

Reviewer id `fun`. Scope: the Kontor financial layer prototype (Stage 1) as built in `dist/`, driven in Chromium 1194 through the repo harness (`tests/lib/harness.mjs`). Nothing under `src/`, `scripts/`, `design-system/`, `index.html`, `package.json` or `dist/` was edited. No git commands were run. Browsers were run one at a time.

## 1. Verdict

The product is functionally strong: every golden number, all 336 clause quotes, all 19 flags, every state propagation I tried (triage, match decisions, assumptions, hand-check, feedback, reset, persistence, corrupt and blocked storage, time zone and locale) and every one of 771 clickable controls behaved correctly. The five-minute demo script runs end to end in dark and light with the expected numbers at each step.

One thing is demo-breaking: **the offline standalone file `dist/kontor-prototype.html` is stale and shows "Placeholder. This screen has not been built yet." on every route** (F01). Everything else is major or minor: a stranded modal after browser Back (F02), a horizontal page scroll in the Cap vs spend table view (F03), and a set of polish and consistency defects.

## 2. What was run and the results

| Run | Result |
|---|---|
| `npm test` | engine 36 of 36 groups, 14,987 checks; smoke 114 passed, 0 failed; foundation 34 passed, 0 failed; exit 0 |
| `node tests/run-e2e.mjs` | 6 of 6 files passed. ok / FAIL / skip: V1 58/0/2, V2 50/0/1, V3 30/0/0, V5 47/0/0, V6 57/0/0, V7 67/0/0 = 309 ok, 0 FAIL, 3 skip |
| The 3 skips | all the same thing: axe `region` on the `.kviz-tip` tooltip portal while a row or the headline figure is hovered or focused. I reproduced it (K1 below): it is real, on Overview, Opportunities, Renewals and Cap vs spend |
| `tests/review/fun-demo.mjs` | 41 passed, 0 failed (full script, dark and light, plus fresh profile default dark) |
| `tests/review/fun-links.mjs` | 87 passed, 1 failed (F02 stranded modal) |
| `tests/review/fun-state.mjs` | 37 passed, 2 failed (F04 legend wording, F10 feedback date) |
| `tests/review/fun-filters.mjs` | 19 passed, 0 failed |
| `tests/review/fun-ac.mjs` | 58 passed, 0 failed (R1-R10, R16-R19, R23-R47, R48-R53, R54-R64) |
| `tests/review/fun-crawl.mjs` | 771 controls clicked each in a fresh browser context: 742 ok, 20 external links ok, 9 disabled (pager Previous), 0 problems, 200 unique internal addresses followed, 0 console errors, 0 off-origin requests |
| `tests/review/fun-known.mjs` | 5 passed, 12 failed. A failure means the builders' reported defect is still present (see section 5) |
| `tests/review/fun-robust.mjs` | 11 passed, 2 failed (F01 stale standalone, two checks) |
| `tests/review/fun-env.mjs` | 8 passed, 2 failed (F26 two tabs, F11 "indicative" on cards). Same text on 19 screens under 6 time zone and locale combinations |
| `tests/review/fun-invariants.mjs` | 2 passed, 1 failed (F24 `£0 = £0` edge); 189 combinations of rate x threshold x match decision x triage hold every invariant |
| `tests/review/fun-perf.mjs` | 8 passed: first h1 334 ms (4x CPU throttle 766 ms), slowest route 104 ms (4x 233 ms), recompute 22 ms (4x 83 ms), JS 1.62 MB |

New scripts (all plain node against `dist/`, exit non-zero on failure): `tests/review/fun-lib.mjs` (helpers), `fun-demo.mjs`, `fun-links.mjs`, `fun-state.mjs`, `fun-filters.mjs`, `fun-ac.mjs`, `fun-crawl.mjs`, `fun-known.mjs`, `fun-robust.mjs`, `fun-env.mjs`, `fun-invariants.mjs`, `fun-perf.mjs`. Scratch output (screenshots, logs, JSON) is in `.scratch/fun/`.

### 2.1 Demo script (requirements section 10), dark and light, real clicks

| Step | Expected | Observed |
|---|---|---|
| 0:00 Overview | banner, `£6.1m across 15 contracts flagged as opportunities to investigate`, cards `£4.2m / £0.6m / £1.1m / £0.3m`, sum line, caveat, all above the fold at 1440x900 | pass, both themes; radar strip 3 / £6.9m, 4 / £7.3m, 2 / £2.2m, attention 3; coverage 84%, £129.4m of £153.5m |
| 1:00 Renewal radar via rail | attention 3, FM "notice date passed 6 days ago", bands £6,930,000 / £7,250,000 / £2,180,000 a year, boundaries 6 Jan 2027, 6 Apr 2027, 6 Oct 2027 | pass; focus lands on the h1 |
| 2:15 Opportunities, row 1, View clause | Highways £3,350,000, drawer breakdown, clause 14.3 page 23 of 70, quote highlighted and focused | pass; mark text equals the quote exactly; rail keeps Opportunities |
| 3:30 Back, Cap vs spend, No contract | C-005 167.0% Over cap, 8 payees £23,830,000 | pass. Note: browser Back reopens the flag drawer (see F27) |
| 4:15 Explained then Reset | £2.8m, "£3,350,000 excluded after your review", confirm dialog with Cancel focused, toast, back to £6.1m | pass |
| 4:30 close panel, Give feedback | close line, dialog, save, toast | pass. The close line reads "This is one council's contracts and spend. Imagine your full estate." (blueprint decision 8), not the spec's "public data" wording |
| any: theme toggle, fresh profile | dark default, persists | pass |

## 3. Acceptance criteria sweep (fun-ac.mjs, all pass)

Evidence is what the script printed or asserted. "partial" marks a criterion where I passed the main behaviour but a clause of the AC is not met.

| R | Result | Evidence |
|---|---|---|
| R1 | pass (rail 65px) | header, Primary nav, main on 12 routes; header 72px; rail measures 65px (64 + 1px border, the smoke test codifies 65); only `.kx-toasts` and noscript outside `#root` at rest |
| R2 | pass | six items in order, hashes, one h1, one `aria-current`, Back, not-found with "Go to overview" |
| R3 | pass | 7 listed deep links, 0 console errors |
| R4 | pass | one h1 and `<Page> | Kontor financial layer` on 12 routes (titles: Overview, Opportunities, Renewal radar, Cap vs spend, Supplier matches, No contract on the register, Contracts, contract title, Clause 14.3, How this is calculated, Roadmap, Why this matters) |
| R5 | pass | Apps, Chat, Notifications, Account toasts with the exact copy, no navigation |
| R6 | pass | `data-theme=dark` before React mounts (app.js delayed 1200 ms), Enter and Space toggle, `aria-pressed`, persists, works with blocked storage |
| R7 | pass | axe 0 violations on 16 states x 2 themes (with the pointer away; with a tooltip open see K1) |
| R8 | pass | no page overflow at 1440, 1024, 390 on 12 routes in default state; see F03 for the Cap vs spend table view |
| R9 | pass | 191 requests, all same origin; no remote URL in index.html or css |
| R10 | pass | as-at on all five pages; clock set to 2031 changes no text on 7 routes; no clock read in engine (comments only) |
| R16 | pass | h1 exact; tooltip `£6,145,238` on hover and focus; list sums to 6,145,238; 15 contracts |
| R17 | pass | card labels exact; card clicks give 3 / 1 / 12 / 3 rows |
| R18 | pass | `£6.9m a year, 3 contracts` etc.; all bands link to `#/renewals`; attention 3 |
| R19 | pass | 84%, `£129.4m of £153.5m`, link to no-contract |
| R23 | pass | 19 rows, golden values and order, ranks 1-19 |
| R24 | pass | 19 of 19 links land on the right contract, page and exact quote; link text carries the page |
| R25 | pass | breakdowns for F-C-005-overCap and F-C-004-uplift; last line equals the row for all 19 flags; Escape returns focus to the row; all 38 openings (row click and See calculation) open their own flag |
| R26 | pass | chips 19/3/1/12/3, empty state copy, Clear filters, status and sort options |
| R27 | pass | `Showing 19 opportunities, £6,145,238 indicative`, `Showing 1 opportunity, £642,478 indicative` |
| R28 | pass | 2 rows (89.1%, 90.8%) with "Indicative value £0. Not counted in the total." and a clause link |
| R29 | pass | CSV header + 19 rows, every row "Sample data, as at 2026-10-06" |
| R30 | pass | identical order after reload; no-date rows last in rank order (1, 2, 3, 9, 11) |
| R31 | pass | bands, deadline order, boundary dates, 12 later contracts with a link to `#/contracts` |
| R32 | pass | all row facts, 12 clause links all `noticePeriod`, `?from=renewals` |
| R33 | pass | 30 Sep 2026, 1 Dec 2026, 28 Feb 2027 with the end-date note |
| R34 | pass | attention first, three exact sentences, glyph on each row |
| R35 | partial | 9 markers in the 12-month lanes and band boundaries; the three attention contracts are not drawn at the left edge as "Already passed" (F25) |
| R36 | pass (indirect) | copy is in the bundle; the fixture test is `tests/e2e/V1.mjs` |
| R37 | pass | 24 rows descending 167.0, 114.1, 113.8, 94.8, 90.8, 89.1, C-004 80.6% Within cap |
| R38 | pass | C-007: 5 payments after end, £780,000.00; subtotals to the penny |
| R39 | pass | cap and basis labels; "At least" and the spend-files note on C-003, C-016, C-018 |
| R40 | pass | C-011 years £430,000 / £512,000 / £447,000 / £228,000, year 2 over by £62,000 |
| R41 | pass | six clause links, same contract as the row, `maximumValue` or `awardedTotalValue`, `?from=spend` |
| R42 | pass | cumulative line with "Cap crossed" (C-005), YearBars (C-011) |
| R43 | pass | KESTRELVALE normalised 0.98, Kestrelvale FM alias 0.95, Larchmont 0.73 Suggested 6 / £300,000, Mirefield Unmatched; 39 payees; thresholds disclosed |
| R44 | pass | Confirm gives £6.2m (£6,205,238), C-009 102.7% Over cap £60,000, watch list 1 row, persists; Reject and Undo restore (fun-state) |
| R45 | pass | statement always visible |
| R46 | pass | 8 payees, £23,830,000, golden order and amounts, row notes |
| R47 | pass | attribution rules on matches tab and Method page |
| R48 | pass | 24 rows, 10 columns, search, category filter, row opens detail, sort by end date and annual value |
| R49 | pass | Q1-Q9, 14 answers with pages on C-005, exact cap answers for C-005, C-003, C-018 |
| R50 | pass | derived panel, 6 Method links, reasons for C-005, C-011, C-019 |
| R51 | pass | paging 20, "Sample payments (fictional)", `£8,350,000.00` |
| R52 | pass | flags before questions; C-006 "No opportunities flagged for this contract." |
| R53 | pass | C-018 notice 0.58 Needs review; flag drawer shows the low-confidence reason |
| R54 | pass | breadcrumb, Cited clause, 23 of 70, 2px outline, exact quote |
| R55 | pass | 336 of 336 extractions: one mark, text equals the quote |
| R56 | pass | "This page isn't in the sample." with Open contract |
| R57 | pass | Previous/Next step Q1-Q9, ends disabled |
| R58 | pass | headings, neighbouring clauses, illustrative label |
| R59 | pass | persists, `1 of 336 answers checked by hand`, toggles off on second click |
| R60 | pass | all eight golden contracts incl. C-009 "fell 53.7%"; volume caveat in the drawer |
| R61 | pass | select options; £2.8m; note; totals; persists; restored |
| R62 | pass | exact no-choice and blocked-storage errors; copy text has answer, comment, as-of (date issue F10) |
| R63 | pass | confirm before clear, Cancel focused and harmless, toast, headline restored |
| R64 | pass | 8% gives £6.8m, renewals £1,720,800, total £6,790,538, banner text |

Also passing beyond the list: R13 `savings` appears only in the caveat, evidence, Method, Roadmap and "Reasons this may not be a saving" (36 occurrences on 7 screens; no page title, rail label or button contains it); R71 no `!`, no emoji, no placeholder text, no banned button label on 25 screens; R74 performance (section 2).

## 4. State propagation, persistence, robustness (all verified)

- **Triage:** Explained on F-C-005-overCap gives `£2.8m` on Overview, sum line `£822,000 + £642,478 + £1,075,500 + £255,260 = £2,795,238`, note `£3,350,000 excluded after your review`, Opportunities 18 rows `£2,795,238`, Contracts detail shows the flag Explained and not counted, Demo guide step 1 and Settings "headline now" follow live. Two reviews give £2.0m. Every flag reviewed gives `£0 across 0 contracts` and the all-reviewed empty state (F24).
- **Matches:** Confirm gives £6.2m, 4 over-cap contracts, tiles 4/2/18, total over cap £4,232,000, coverage awaiting row disappears, Opportunities 20 rows, watch list 1 row, Contract detail C-009 102.7%. Reject returns every number and moves the payee into no-contract (9 payees, £24,130,000). Double click leaves a consistent state.
- **Assumptions:** 8% gives £6.8m, ranks reorder consistently (values descend, sum £6,790,538), the drawer shows £496,000 and names 8%, Method shows "Changed in Settings". 3% gives £5.7m. Near-cap 90% gives tiles 3/2/19 and watch list 1; 80% gives 3/4/17 and C-004 joins the watch list. Reset clears all five keys and keeps the theme.
- **Corrupt storage:** 33 bad values over six keys (invalid JSON, null, arrays, wrong types, out-of-range numbers, `__proto__`, unknown ids): every route renders, no console error, valid entries in a half-bad object still honoured. **Blocked storage and quota-exceeded writes:** app works in-session, flag drawer warns, feedback gives the exact blocked error and Copy works, reload forgets.
- **Environment:** identical text on 19 screens in America/Los_Angeles, Pacific/Auckland, Europe/London, Asia/Kolkata and locales en-GB, en-US, de-DE, fr-FR. Standalone page also checked (F01).
- **Filters, sorts, search (computed independently from the dataset):** Opportunities type chips, three sorts (value, date, type equal the independently computed orders), 13 search cases plus 15 hostile inputs, status Open/Reviewed/All with seeded reviews, table twin equals list under four filters, export honours filters, 6 reloads identical. Contracts: 18 searches, 14 categories, all 8 sort keys both directions equal an independent stable sort, flag counts equal the golden list. Spend: 24 rows descending with the golden percentages, state chips, matches chips 39/1/30/8/0, every sortable column, no-contract drawer subtotals for all 8 payees.

## 5. Builders' known issues: verdict

| Reported | Verdict | Evidence / severity |
|---|---|---|
| Tooltip portal axe `region` | real, still present | axe `region` (`.kviz-tip__title`) with a tooltip open on `#/opportunities`, `#/spend`, `#/renewals`, `#/overview`. minor (F07) |
| `.kx-table-wrap` needs `position: relative` | real, and worse than reported | Cap vs spend "Show table": document +138px at 1024, +686px at 390; the whole shell swipes sideways. Only Method has a local workaround. major (F03) |
| th surface paints tbody th in light | real but faint | Method page `tbody th` rgb(249,250,251) vs transparent `td`; Spend and Contracts hide it with local overrides. nit (F19) |
| `.kx-field input:indeterminate + .kx-box` | latent | kit rule still unrestricted; unselected feedback radios render correctly in dark and light thanks to the V7 override. nit (F19) |
| from=method highlights Opportunities | real | `from=method` and `from=evidence` both give Opportunities. minor (F09) |
| Evidence route title vs page title | not a user-visible issue | document title, h1 and Menu label all read "Why this matters"; only `routes.js` says "Evidence". not filed |
| Dead css `.stub-overlay*`, `.menu-popover*` | real | `.stub-overlay`, `__body`, `__actions`, `--drawer` still in `dist/app.css`. nit (F21) |
| Opportunities at 1366x768, double focus ring | real | list starts at y=586, rows 98-99px: 1 row fully visible; keyboard-focused row shows a row ring plus a second ring round the title. minor (F18) |
| CoverageBlock focusable 4px segment | mitigated | no focusable segment now (V5 workaround), axe `target-size` clean. nit, not filed separately |
| CumulativeLine end labels collide (C-007) | C-007 fixed by a taller chart, but real on three other pages | overlap measured on C-004 (`85% of cap` / `81% of cap`), C-009 (`85%` / `89%`), C-017 (`85%` / `91%`); legend "Close to cap zone" clipped on C-009. minor (F05) |
| Method literals | real | `fmtGBP(100000)` typed in `Method.jsx:462` and `engine.js:294`; bands 0.90 / 0.75 typed in `Method.jsx:484-486`, `engine.js:219`, `copy.js:76`. nit (F22) |
| Settings gear hidden under 700px | real | at 390 the gear is hidden and the Menu has no Settings item; only the Method page has "Open settings". minor (F17) |
| Copied feedback prints UTC date | real | time zone America/Los_Angeles, saved 22:30 local on 6 Oct: list "6 Oct 2026, 22:30", copied text "2026-10-07". minor (F10) |
| Source viewer answer panel taller than window | real but harmless | at 1366x768 panel 717px in a 658px content area; hand-check buttons start at y=618 of 768, still in view. nit, not filed |
| smoke 'shell landmarks' counts every header; dark-before-React timing | real | selector `body > #root header, header.shell__header` unchanged; the dark test delays app.js 1500 ms. minor (F16) |
| Reject match moves Larchmont to no-contract | engine consistent, wording not | 9 payees `£24,130,000`, Overview "£24.1m, 9 suppliers"; the row says "Its payments are not counted". minor (F13) |
| Overview tooltip overlaps the header band | real | tooltip box y 47-146, x 49-332 covers the Apps and Chat tabs and the start of the sample banner on the R16 hover. minor (F06) |
| Chromium only | confirmed, not testable here | no other engine available in the sandbox |

## 6. Findings

Severity: blocker, major, minor, nit. Owner area in brackets. Most important first.

### F01 blocker [build-docs] The standalone offline build is stale and contains only placeholders
`dist/kontor-prototype.html` (5.8 MB, 19:16) predates `dist/app.js` (21:04) and the newest source (20:58). Opened from `file://` every route reads "Overview Placeholder. This screen has not been built yet. Built by V1. Replaces this card when it lands." (same for V2, V5, V6). Probe strings from the real views ("Where the total comes from", "Renewals coming up", "Ranked opportunities", "Needs attention now", "Presenter notes", "Cited clause") occur in `dist/app.js` but 0 times in the standalone file. This is the artefact meant for a venue without network. Fix: `npm run build && npm run standalone` as the last release step, and add a freshness check to `npm test` (standalone newer than `dist/app.js`, contains "Where the total comes from"). Test: `fun-robust.mjs` (two failing checks).

### F02 major [shared] Browser Back or Forward with a modal open strands the modal and breaks Escape
Open About, Feedback, Settings or the Demo guide, then press browser Back. The route changes underneath, the modal stays over the Overview, focus moves to the page h1 behind it, Escape does nothing and Tab walks the page behind the modal. Cause: `src/lib/router.js` focuses the h1 on every path change, and `src/ui/layers.js` `onKeyDown` ignores a modal whose node does not contain focus (`mine`). Fix: skip the h1 focus (or close non-address overlays) when a modal layer is open, and let a modal own Escape and Tab unless focus is in a native dialog. Test: `fun-links.mjs` "browser Back while a dialog is open".

### F03 major [shared] Cap vs spend "Show table" widens the whole document (+138px at 1024, +686px at 390)
The sr-only `ClauseLink` context text inside `.kx-table-wrap` is `position: absolute` and `.kx-table-wrap` is `position: static`, so it escapes the scroll clip. Measured on `#/spend` after "Show table": `documentElement.scrollWidth` 1162 vs 1024, `scrollX` reaches 138 with a wheel and the shell shifts to `left: -138px`; at 390 it is 686px. Screenshots `.scratch/fun/known-k2-scrolled-1024.png`. The table twin is the accessible alternative to the chart, so it matters. Fix: `.kx-table-wrap { position: relative }` in `src/ui/kit.css` (one line, helps every table). Test: `fun-known.mjs` K2a.

### F04 minor [shared] Cap legend says "85% or more" whatever the threshold in Settings
`BULLET_LEGEND` in `src/charts/BulletList.jsx:169` is a literal. With the threshold at 90% (or 80%) the legend still reads "Close to cap (85% or more)" while the tiles, chips and rows use the new threshold. Test: `fun-state.mjs` near-cap 90%.

### F05 minor [shared] Cumulative line labels overlap on C-004, C-009 and C-017
"85% of cap" prints over the end label ("81%", "89%", "91% of cap") because the end label avoids only the cap label; the legend entry "Close to cap zone" is clipped at the right edge on C-009. Screenshot `.scratch/fun/known-k9-C-009.png`. These are two of the demo's watch-list contracts. Fix in `src/charts/CumulativeLine.jsx` (also avoid the 85% label). Test: `fun-known.mjs` K9.

### F06 minor [shared] The exact-value tooltip on the headline covers the shell header and banner
The R16 hover moment (`£6,145,238`) places the tooltip at y 47-146, x 49-332, over the Apps and Chat tabs and the first words of the sample banner ("Sample data. Marchbank Borough"). Screenshot `.scratch/fun/known-k16-tooltip.png`. Place the tooltip below the figure when there is no room above (`src/charts/Tip.jsx`).

### F07 minor [shared] Chart tooltip portal fails axe `region`
Reproduced on four routes (the three e2e skips). Render the portal inside `<main>` or give it a landmark.

### F08 minor [build-docs] No README, and the foundation status doc is stale
There is no `README.md` at the repo root (how to run, rebuild, run the demo, regenerate the standalone). `docs/foundation-status.md` still says "Every view, the five overlays and the FlagDrawer are stubs", which is what produced F01's confusion. Add a README with the demo script and the release steps; mark the foundation doc historical.

### F09 minor [shared] `from=method` and `from=evidence` highlight Opportunities in the rail
`src/routes.js` falls back to Opportunities for any `from` not in the rail. A clause opened from the Method page highlights the wrong rail item (Method and Evidence highlight nothing).

### F10 minor [shared] "Copy feedback" prints the UTC date, the dialog shows local time
Saved at 22:30 on 6 Oct in America/Los_Angeles: the list shows "6 Oct 2026, 22:30", the copied text starts `2026-10-07`. `feedbackText` in `src/lib/copy.js:581` slices the ISO string. Format the date from the same local value.

### F11 minor [overview-renewals] Three of the four cards do not say "indicative"
R13 AC 1 asks each breakdown card to carry the word. Spend over cap, Close to cap and Price increases above cap say only "Already paid above the cap" or "Projected at the current pace"; there is no tooltip on keyboard focus. Only Renewals says "Indicative value per year". The page line "Indicative figures." sits above the cards. Test: `fun-env.mjs`.

### F12 minor [spend] Cap vs spend ignores review status without saying so
After Explained on F-C-005-overCap the Overview card reads `£0.8m, 2 contracts` while the Cap vs spend tile still reads `Total over cap £4,172,000, across 3 contracts`. A finance officer will compare them. Label the tile "before your reviews" (or show the reviewed share).

### F13 minor [spend] Reject match: the explanation contradicts the totals
The row says "You rejected this match. Its payments are not counted." but the £300,000 now counts as spend with no contract (No-contract tab "9 payees, £24,130,000", Overview "No contract on the register £24.1m, 9 suppliers"), and the toast says only "is now unmatched". Say that a rejected payee joins the no-contract spend.

### F14 minor [spend] Unmatched payees are labelled Method "Similar name"
On the matches tab the eight Unmatched rows (Dunmoor 0.33, Oakhaven 0.26 ...) show Method "Similar name" next to "No match". No similar name was found. Use "None" or "No match".

### F15 nit [spend] "Matched supplier" A to Z starts with the eight "No match" rows
The `~` sentinel sorts before letters under `localeCompare`; the intent was last. `src/views/spend/MatchesTab.jsx`.

### F16 minor [build-docs] Smoke test fragility
`tests/smoke.mjs` "shell landmarks" counts every `<header>` under `#root` (selector `body > #root header, header.shell__header`), so any view using `ChartFigure` fails and V1 had to work around it with `LanesFigure`. "fresh profile is dark BEFORE React mounts" delays app.js by 1500 ms and races under CPU load (V1 saw it fail once). Use `header.shell__header` and a deterministic check.

### F17 minor [roadmap-evidence-overlays] Settings cannot be opened on a phone except from the Method page
Under 700px the header gear is hidden and the Menu popover has five items without Settings. Add "Settings" to the Menu (phone) or keep the gear.

### F18 minor [opportunities-drawer] Only one opportunity row fits at 1366x768
The list starts at y=586 (header, caveat paragraph, toolbar, totals bar); rows are 98-99px, so one row is fully visible. The keyboard-focused row shows two rings (row and title text) and its tooltip covers the toolbar. Tighten the caveat and toolbar, or collapse the long caveat after first view.

### F19 nit [shared] Kit CSS rules that over-reach
`.kx-table th` surface also paints `tbody th` (Method page, light: rgb(249,250,251) vs transparent td); `.kx-field input:indeterminate + .kx-box` matches empty radio groups (V7 overrides it locally). Restrict both in `src/ui/kit.css`.

### F20 nit [contracts] Contract search does not match category
`#/contracts?q=ict` finds 1 of the 5 ICT contracts (C-007 only, because only its title says "ICT"). Spec R48 says title and supplier, so this is by design, but "ICT" is a likely council query. Add category to the haystack.

### F21 nit [shared] Dead css still shipped
`.stub-overlay*` and `.menu-popover*` in `src/styles/app.css` appear in `dist/app.css`.

### F22 nit [source-method] Method and engine type the same literals twice
`£100,000` severity cut-off (`Method.jsx:462`, `engine.js:294`) and the 0.90 / 0.75 bands (`Method.jsx:484-486`, `engine.js:219`, `copy.js:76`) are not exported from one place; no test guards them.

### F23 minor [opportunities-drawer] Watch list ignores every filter
Verified: `?q=legal` shows 1 row and 2 watch rows, `?type=overCap` shows 3 rows and 2 watch rows, `?q=zzzz` shows "No opportunities match these filters." with the same 2 watch rows beneath. Either filter the Watch list or label it as unfiltered.

### F24 nit [overview-renewals] Everything reviewed gives `£0 across 0 contracts`
Headline `£0 across 0 contracts flagged as opportunities to investigate`, an empty stacked bar, sum line `£0 = £0`, and the note `£6,145,238 excluded after your review`. Show a purpose-written all-reviewed state instead. Test: `fun-invariants.mjs`.

### F25 minor [overview-renewals] R35: attention contracts are not on the timeline
The 12-month lanes show 9 notice-deadline markers with band boundaries, but C-001, C-016 and C-007 are not drawn at the left edge as "Already passed" (AC).

### F26 nit [shared] Two tabs: last write wins and tab B is never refreshed
Tab A explains F-C-005-overCap; tab B (opened earlier) explains F-C-007-overCap; storage ends as `{"F-C-007-overCap":"explained"}` and A's review is lost. A `storage` listener or a read-merge-write would fix it.

### F27 nit [source-method] Back from the clause reopens the drawer, "Back to opportunity" adds a history entry
Browser Back from the source viewer returns to `#/opportunities?flag=F-C-005-overCap` with the drawer open over the rail, so the script step "Back; open Cap vs spend" needs an extra Escape. The "Back to opportunity" button pushes `#/opportunities` (no drawer), so the two Backs differ and browser Back after it returns to the clause. Prefer `history.back()` when the previous entry is the origin.

### F28 nit [spend] Coverage shares add to 100.2%
No-contract tab: 84% + 0.2% + 16% shown for £129,359,000, £300,000, £23,830,000. Round the largest remainder or show one decimal.

## 7. Not tested

Firefox and Safari (not available). A real screen reader. Touch-only devices beyond Playwright tap emulation. Network failure of the evidence links (opened with the network aborted: a new tab opens and the app stays put).
