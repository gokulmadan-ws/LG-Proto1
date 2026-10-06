# Build blueprint: Kontor financial layer prototype (Stage 1)

This is the coordination document for the build. Every build agent reads it first. It settles the decisions the research left open.
Research (reference only, in the session scratchpad, copied to `docs/research/` at the end):
`R = /tmp/claude-0/-home-user-LG-Proto1/4a2c3345-29a2-559b-b8d9-409e75525fc5/scratchpad/research`
- `R/requirements.md` requirements R1 to R78, data model, derivations, golden numbers, **copy deck (section 7)**, roadmap content (section 9), demo script (10)
- `R/ds-cheatsheet.md` Springboard component API, quirks, contrast audit, token cheat sheet, gap kit
- `R/shell-port.md` shell port plan (tested skeleton in `R/work/shell-port/skeleton/`)
- `R/dataviz-recipe.md` chart library spec (tested library in `R/work/charts/`)
- `R/critic.md` integration critique: **read sections 2, 3, 4 before touching anything**
- `R/domain-brief.md` UK procurement background (reference only; its Brindleford dataset is NOT used)
- Reference code: `R/work/ref/` (engine.mjs, seed.mjs, provenance.mjs, gen-data.mjs, engine.test.mjs, out/sample.json), `R/kit/` (kit.css, kit-ui.jsx), `R/work/charts/`, `R/work/shell-port/skeleton/`
- Original spec transcription: `docs/spec.md`

## 0. Goal

A working, demo-grade prototype of **Kontor financial layer, Stage 1 (one council)**, for a Lead Solution Engineer to show council contacts in about five minutes: headline number, renewal radar, one over-cap contract, click through to the clause and page, close.
Hard requirements from the user: (1) Springboard 2.0 design system, (2) built inside the Springboard App Shell, (3) dark/light toggle, **default dark**.
Everything is a static front-end: no server, no CDN, works offline. Hash routing.

## 1. Settled decisions (override anything in the research that disagrees)

1. **Dataset and engine are canonical from `R/work/ref/`** (Marchbank Borough Council, 24 contracts, 1,264 payments, 336 extractions). Golden numbers in `R/requirements.md` section 6 must keep reproducing. Do not use the Brindleford material. Allowed imports from the domain brief: cap label for estimated value, VAT note, "Reasons this may not be a saving" per flag type, a Source chip, richer clause text, data-window wording.
2. **Fictional council and suppliers.** Real councils appear only in the Evidence page/strip, the caveat, the Method rationale and the Roadmap, quoted from `docs/spec.md` with their links. Never invent facts about real bodies.
3. **One shell**: the port in `R/work/shell-port/skeleton/` (pixel-checked against the real template). The kit's AppShell is not used. Light mode: white canvas panel on `#F2F3F7`, `#C1C1CC` lines, texture dropped, W mark stays a dark disc.
4. **One CSS owner per concern.** Global CSS order in `src/main.jsx`: `shell.css`, `ui/kit.css`, `charts/charts.css`, `styles/app.css`, then each view's own css. `shell.css` alone owns `html/body` background. No other file sets a body background. Link underline rule scoped as in `R/critic.md` 3.2.
5. **Offline-safe design-system CSS.** `scripts/ds-offline.mjs` writes `dist/ds/styles.css` + `dist/ds/colors_and_type.css` (derived from the pristine design-system CSS with the two remote `@import`s removed and the font paths fixed). `index.html` links `dist/ds/styles.css`. `design-system/` stays pristine (never edited). Font Awesome comes from `vendor/`. Geist Mono self-hosted via `@fontsource/geist-mono`.
6. **Pills, not Badges.** DS `Badge` is only for neutral counts (5 of 6 tones fail AA). Flag types and cap states use the chart library's `FlagBadge`/`.kviz-pill`; neutral statuses (confidence, match status, review status, "Needs review", "Auto-renews") use the kit `Pill`.
7. **Headline credibility.** Card values are exact-summed and a sum line is printed under the cards: `£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238`. Radar strip values are labelled "contract value, a year"; the renewals card is "indicative value per year". The headline caveat is generic (no Sefton figure); the £1.7m figure appears only in the evidence list beside its link, as the scope doc quotes it. "5% is a prototype assumption" wording on the Method page.
8. **Copy corrections** (apply on top of `R/requirements.md` section 7): close line on screen is "This is one council's contracts and spend. Imagine your full estate." About dialog does not mention the ingestion risk; it says "This prototype starts after document ingestion: every answer is shown as already extracted." The About dialog says payment rows "look like the files councils publish for payments over £500: date, department, supplier, purpose and amount" (no Transparency Code column fidelity claim). Chart tooltips never say "saving" ("An opportunity to investigate, not a confirmed result").
9. **Cap semantics**: when `cap.source === 'contract_value'` the state label is "Above contract value (estimate)" not "Over cap", confidence drops one step. Golden numbers must not move. Add `capState` to the engine output. Add `contract.source` (`find_a_tender` | `register_pdf`) to seed/model; mark any contract that truly qualifies (starts on or after 24 Feb 2025 and over £5m), else all `register_pdf`.
10. **Evidence is a real page** (`#/evidence`): all 9 cases from the spec with When, What happened, Feature it supports, spec links, and the line "Every case below was checked against its source on 6 October 2026." The Overview shows three with "Show all 9 cases" linking there. Reached also from the rail bottom Menu.
11. **Rail** has six items (R2 order). The bottom Menu button opens a menu: Why this matters (Evidence), How this is calculated, About this data, Demo guide, Give feedback. The header gear opens the Settings drawer. Apps, Chat, Notifications, close-tab show the R5 toast; Share copies the current link and toasts.
12. **Presenter density** (amended R78): at 1440x900 and 1366x768 the Overview headline, caveat and four cards are visible without scrolling; the radar summary may sit below. At 1024x768 the headline and cards are visible.
13. **Round-trip safety.** Never use `Date.now()`/`new Date()` (no-arg) in derivations. `localStorage` always in try/catch.

## 2. Repo layout and file ownership

Agents ONLY edit files they own. Need a change in someone else's file? Work around locally and write the request in `docs/handoff/<your-agent>.md`; the integrator applies it. **No git commands** (the integrator commits).

```
index.html                      A1
package.json                    A1 (scripts: build, watch, standalone, serve, data, test)
assets/                         A1 (blob-texture.png, fonts/geist-mono*.woff2)
design-system/                  PRISTINE, nobody edits
dist/                           build output (committed by integrator)
scripts/
  ds-offline.mjs, build.mjs, make-standalone.mjs        A1
  gen-data.mjs, lib/seed.mjs, lib/provenance.mjs        A2
src/
  main.jsx, App.jsx, routes.js, styles/app.css          A1
  shell/ (AppShell.jsx, ThemeToggle.jsx, glyphs.jsx, shell.css)   A1
  lib/router.js, storage.js, theme.js, a11y.js          A1
  lib/engine.js, estate.js, copy.js, format.js, evidenceFor.js    A2
  data/sample.json, evidence.js, roadmap.js, reasons.js (per-flag "reasons this may not be a saving")   A2
  ui/ (kit.css + Dialog, Drawer, DataTable, Segmented, Pill, Menu, StatTile, EmptyState, Kbd, fields, Toast, Pager, Popover, Tabs wrapper)   A3
  charts/ (library, patched per R/critic.md 3.5, 3.7)             A3
  components/ shared composites: PageHeader, SampleBanner, ClauseLink, MethodLink, AsAt, ConfidencePill, NotFound, ErrorBoundary    A1
  components/FlagDrawer.jsx                                       V2
  components/overlays/{AboutDialog,FeedbackDialog,SettingsDrawer,DemoGuideDrawer,MenuPopover}.jsx    V7
  views/ Overview.jsx + Renewals.jsx (+css) V1 · Opportunities.jsx V2 · Source.jsx + Method.jsx V3 · Spend.jsx (+Matches, NoContract) V5 · Contracts.jsx + ContractDetail.jsx V6 · Roadmap.jsx + Evidence.jsx V7
  dev/                          per-agent scratch entries (git-ignored)
tests/
  engine.test.mjs (+ golden) A2 · lib/harness.mjs, smoke.mjs A1 · more by QA later
docs/ blueprint.md, spec.md, handoff/*.md
```
A1 creates a **stub file for every file listed under V1, V2, V3, V5, V6, V7** (valid default export, renders a placeholder card with the page name) so the app always compiles. The owner replaces the stub.

## 3. Shared interfaces (exact; implement and consume as written)

### Router (`src/lib/router.js`, A1)
```js
useRoute() -> { name, seg: string[], query: URLSearchParams, path: string }   // '#/opportunities?type=overCap' -> name 'opportunities'
navigate(to, { replace = false } = {})      // to: '#/spend/matches' or '/spend/matches'
setQuery(patch, { replace = true } = {})    // merge/remove (null) params on current route, e.g. setQuery({ flag: id })
hrefFor(name, { seg = [], query = {} } = {}) -> '#/...'
```
Routes (R section 2): `overview` (default) · `opportunities` · `renewals` · `spend` (`/matches`, `/no-contract`) · `contracts` (`/<id>`) · `source` (`/<contractId>/<extractionId>?from=`) · `method` (`?s=<section>`) · `roadmap` · `evidence`. On each route change: reset `#shell-main` scroll to 0, set `document.title` = `<Page> | Kontor financial layer`, focus the page `<h1>` (tabIndex -1) except on first load. Unknown route -> `NotFound`. Rail highlight: `source` keeps the rail item of `from` (default `opportunities`); `method` and `evidence` highlight nothing.

### Estate and state (`src/lib/estate.js`, A2)
```js
useEstate() -> { estate, state, actions }
 estate = { data, opts, matches, attributed, flags, ranked, watch, summaries, derived, totals, coverage, contractsById, extractionsById, flagsById, asOf }   // output of computeEstate (R/requirements.md 5.0) plus lookups
 state  = { triage, decisions, assumptions, handcheck, feedback }     // persisted in localStorage keys kontor-triage, kontor-matches, kontor-assumptions, kontor-handcheck, kontor-feedback
 actions = { setTriage(flagId, status|null), setDecision(rawName, 'confirm'|'reject'|null), setAssumption(key, value), setHandcheck(extractionId, 'correct'|'incorrect'|null), addFeedback(entry), resetAll() }
computeEstate({decisions, triage, assumptions})  // pure, also used by tests
evidenceFor(flag) -> { contractId, extractionId, page, clauseRef, quote }   // flag -> source viewer target (src/lib/evidenceFor.js)
```
Provider: `<EstateProvider>` (A2) wraps the app (A1 mounts it). Corrupt/blocked storage never crashes.

### Copy and format (`src/lib/copy.js`, `src/lib/format.js`, A2)
`reasonFor(flag, contract, derived)`, `actionLine(contract, derived)` (all nine cases, R 7.6), `relativeText(iso)`, `confidenceBand(score) -> 'high'|'medium'|'review'`, `flagTypeLabel(type)`, `basisLabel(flag)`, `needsAttentionText(contract, derived)` (R34 sentences), `fmtDate(iso)` ('6 Oct 2026'), `fmtDateLong(iso)` ('6 October 2026'), re-export `fmtGBP`, `fmtGBPCompact`, `fmtPct`. Copy must match `R/requirements.md` section 7 plus the corrections in section 1 above.

### UI context (`src/lib/ui-context.jsx`, A1)
```js
useUI() -> { toast({ tone: 'info'|'success'|'warning'|'error', title, description }), openAbout(), openFeedback(), openSettings(), openMenu(anchorEl), openDemoGuide(), confirm({ title, description, confirmLabel, destructive }) -> Promise<boolean> }
```
A1 mounts, once, in `App.jsx`: the toast host, `<AboutDialog/>`, `<FeedbackDialog/>`, `<SettingsDrawer/>`, `<DemoGuideDrawer/>`, `<MenuPopover/>`, and `<FlagDrawer/>` (which reads `?flag=<id>` from the current hash; any page opens it with `setQuery({ flag: id })`, closing removes the param; works on every route). Overlays are owned by V7 (FlagDrawer by V2) but mounted by A1 from stubs.

### Shared composites (`src/components/`, A1)
- `<PageHeader eyebrow? breadcrumb? title description? actions? tabs? asAt? />` renders the single `<h1 tabIndex={-1}>`, `As at 6 October 2026` (when `asAt`), and at most one primary button in `actions`.
- `<SampleBanner/>` rendered by the shell `banner` slot (above `<main>`, always visible, not dismissable, copy R 7.1, "About this data" link opens the dialog).
- `<ClauseLink contractId extractionId page from? />` -> text "View clause, page N", href `#/source/<contractId>/<extractionId>?from=<from>`.
- `<MethodLink section>How this is calculated</MethodLink>` -> `#/method?s=<section>`.
- `<ConfidencePill score reason? />` (High / Medium / Needs review) built on the kit `Pill`.
- `<NotFound/>`, `<ErrorBoundary/>` (copy R 7.9, What+Why+How).

### Shell additions (A1)
`AppShell` gets props `banner` (node above main), `appBadge` ("Sample" neutral pill after the app name), and handlers for Apps/Chat/Share/Notifications/Settings/close/Menu. Skip link, 44px hit areas, bottom tab bar below 700px, `aria-pressed` theme toggle (`kontor-theme`, default dark) as in the port.

## 4. Design language (all views)

- Page container: `max-width: 1360px; margin: 0 auto; padding: 24px 32px 48px` (24px side padding below 700px). Sections separated by 24px; cards use DS `Card` or `.kx-card` (kit) with 16 to 24px padding, hairline border, radius 6 to 8.
- Type: page title `.ds-h2` (30px) Inter Display 600; section title `.ds-h4`; table header `.ds-caption-caps`; numbers `font-variant-numeric: tabular-nums`; KPI figures Inter Display 600. Mono (Geist Mono) for clause refs, ids, transaction refs.
- Status colour is never the only cue: pill text + Font Awesome glyph. Flag colours/order fixed per dataviz recipe (over cap, price increase, close to cap, renewal).
- One primary button per section; labels are [Verb]+[Object]; sentence case; no `!`; no emoji; "you".
- No gradients, no coloured left-border cards, no hand-drawn icons (the W logo and the two shell glyphs are the only custom SVG), colours only from Springboard variables (`var(--...)`). Chart SVG patterns allowed.
- Dark is the default and the hero; light must be equally polished (check every screen in both).
- Row pattern for lists: ONE stretched primary link/button per row, extras in an `extra` slot (no nested interactive elements).
- Dense tables 40px rows with 44px hit areas for row actions; wide tables scroll inside `role="region" tabIndex=0 aria-label` wrapper.
- Charts: use `src/charts` components via adapters; never recompute business rules in the UI; pass `format` where an AC fixes the exact string.

## 5. Screen briefs (layouts for the screens the research left undesigned)

**Overview `#/overview` (V1).** PageHeader (eyebrow "Marchbank Borough Council", title = headline sentence as H1 with the figure carrying the exact-value tooltip, description "Indicative figures. As at 6 October 2026." + short caveat + MethodLink; action: outline "Open demo guide"). StackedBar breakdown. Four `HeadlineTile` cards + sum line. Row: radar summary (`RadarStrip` + the four band counts, labelled "contract value, a year") and coverage meter ("84% of payments are linked to a contract on the register", link to `#/spend/no-contract`). Evidence strip (3 cases + "Show all 9 cases" -> `#/evidence`). Close panel (the close line, primary "Give feedback", outline "See what comes next"). Triage note when flags are excluded ("£3,350,000 excluded after your review").
**Opportunities `#/opportunities` (V2).** Toolbar (type chips with counts, status select, search, sort, Clear filters), totals bar, ranked `OpportunityList` (rank, type pill, contract + supplier, two-line reason, exact indicative £ with basis, action by, confidence pill, review status pill, "View clause, page N"), Watch list section, Export opportunities (the one primary). Row click or "See calculation" opens `FlagDrawer`: reason, numbered breakdown whose last line equals the row £, confidence + why, evidence `ClauseLink` (primary), "Reasons this may not be a saving" list, triage select, MethodLink.
**Source viewer `#/source/<contractId>/<extractionId>` (V3).** Breadcrumb (Opportunities / contract / clause). Two panes: left about 62% a paper-like document page (max 720px, running header "Marchbank Borough Council | <doc title> | Page 23 of 70", clause headings in Geist Mono, 4 to 6 neighbouring clauses, footer), the cited clause in a `mark` with 2px accent outline + 14% accent tint + visible label "Cited clause", scrolled into view and focused. Right about 38%: question, answer in plain words, clause ref, page, quote as blockquote (no coloured-border card), confidence pill, document title, label "Illustrative contract text written for this demo, not a real document.", hand-check buttons (outline), Previous/Next answer, "Back to opportunity" (outline) and "Open contract" (outline). Missing page/extraction -> R 7.9 copy.
**Renewal radar `#/renewals` (V1).** "Needs attention now" group on top (warning glyph + text; C-001, C-016, C-007 sentences), then `RadarLanes` for Next 3 months / 3 to 6 / 6 to 12 with computed boundary dates, each row: title, supplier, annual value, end date, notice period as extracted, deadline, relative text, Auto-renews pill, action line, confidence pill, ClauseLink. Footnote: "12 contracts end later than 12 months and are not on the radar" -> contracts. Empty-band copy.
**Cap vs spend `#/spend` (V5).** Tabs: Cap vs spend | Supplier matches | No contract on register (own routes). Cap tab: summary counts (Over / Close / Within), chips, `BulletList` limit 12 + "Show all 24 contracts", row shows over-by, basis, source, At-least note; spend figure opens a payments drawer (contributing payments, subtotal to the penny, "Paid after the end date" separate; annual caps with `YearBars`); ClauseLink per Over/Close row. Matches tab: table + Confirm match / Reject match (toast on reject) + "How matching works". No-contract tab: `CoverageBlock` (eight rows, £23,830,000, "There is no contract to read, so there is no clause to link").
**Contracts `#/contracts` + `#/contracts/<id>` (V6).** Register: search, category filter, sortable end date / annual value, rows to detail, "n of 336 answers checked by hand". Detail: header (title, supplier, category, route, status, Source chip), flags first, key figures strip, left column "Financial questions" nine groups (answer in plain language, `ConfidencePill`, ClauseLink; "Not found" is a real answer; label "New financial questions" for the set), right column "Derived" panel (notice deadline + band, latest possible end, next price review, cap utilisation, uplift result or "Cannot test: reason", each with MethodLink), spend by contract year (`YearBars` for annual caps, `CumulativeLine` for whole-term caps, the Guildford moment with the crossing annotated), payments table paged 20.
**Method `#/method` (V3).** Sticky section list + sections (R 7.11), every constant shown, worked examples from golden contracts, "5% is a prototype assumption", VAT note ("figures are net of irrecoverable VAT and compared with ex-VAT contract values"), data-window note ("Sample payments to 30 September 2026").
**Roadmap `#/roadmap` + Evidence `#/evidence` (V7).** Roadmap per R67 and R section 9, plus "Who would buy it" and "Stage 1 data sources" (Find a Tender over £5m for procurements started on or after 24 February 2025, Transparency Code spend files, Contracts Finder below £5m) from the spec. Stage 2 formula and illustrative table are static, labelled "Illustrative numbers, made up to show the logic, not real data". No calculators. Evidence page: all 9 cases table, feature column links to the feature page.
**Overlays (all V7).** MenuPopover: the five items. DemoGuideDrawer: four steps with talking points + links; includes a "Presenter notes" section (62% of contracts carry a flag by design; 5% rate is a prototype assumption; ingestion not shown; Sefton). SettingsDrawer: Assumptions (renewal rate 3/5/8%, near-cap 80/85/90%, banner "Changing assumptions changes every indicative figure."), Theme switch, Reset demo changes (ConfirmDialog, destructive variant, toast). FeedbackDialog, AboutDialog. V7 also wires the header-action toasts (Apps, Chat, Notifications, close tab; Share copies the link) through the handlers A1 exposes in `App.jsx`.

## 6. Definition of done for every agent

1. Builds with its own entry: `node scripts/build.mjs --entry src/dev/<you>.jsx --outdir .scratch/<you>` (a dev entry that mounts providers + shell + only your view, so others' in-progress files cannot break you). Screenshot with `node tests/shot.mjs --dist .scratch/<you> --hash '#/...' --theme dark|light --w 1440 --h 900 --out .scratch/<you>/x.png`, then **Read the PNG and look**.
2. Every screen checked at 1440x900 dark and light, 1366x768 dark, 1024x768 dark, and 390x844 (no horizontal page scroll). Iterate until a demanding design reviewer would accept it.
3. axe-core clean (wcag2a/aa/21aa/22aa + best-practice) in both themes on your routes including open drawers/dialogs. Keyboard: Tab order sensible, focus visible, Esc closes overlays and returns focus.
4. Copy lint on your screens: no `!`, no emoji, sentence case, [Verb]+[Object] buttons, "you", the word "saving(s)" only where allowed (R13), every derived £ labelled indicative.
5. No hex colours or raw px colours in your CSS (use `var(--...)`), no gradients, no custom SVG icons.
6. No console errors; no requests outside the page origin.
7. Hand-check the numbers on screen against the golden values in `R/requirements.md` section 6.6.
8. Write `docs/handoff/<you>.md`: what you built, files, anything you need from another owner, known gaps. Keep it short.
