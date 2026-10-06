# Completeness critique: Kontor financial layer research (five deliverables)

Author: completeness-critic agent. Scope: read the spec transcription and all five research files, cross-checked them against each other and against the repo, then built a throwaway integration probe (shell port + kit + chart library + reference engine + sample.json, together, in Chromium, both themes, with axe-core) to see what actually breaks when the pieces meet. Nothing under `design-system/`, `src/`, `index.html` or `package.json` was touched (`git status` clean after every build). Everything I created is under `research/work/critic/`.

Research folder: `/tmp/claude-0/-home-user-LG-Proto1/4a2c3345-29a2-559b-b8d9-409e75525fc5/scratchpad/research/`
Probe: `.../research/work/critic/` (`probe/src/entry.jsx` is the composed app, `run.mjs` and `probe3..7.mjs` are the checks, `shots/` has screenshots, `probe/out-*` are the builds).

---

## 0. Verdict in one screen

The five documents are individually strong and the golden maths is solid (I re-ran `engine.test.mjs`: all 11 groups pass). The build will not stumble on the engine. It will stumble on **seams between the documents**. In priority order:

| # | Severity | Problem | Evidence |
|---|---|---|---|
| 1 | Demo-killer | The pristine Springboard CSS `@import`s Google Fonts and cdnjs Font Awesome. With those two requests hanging (captive portal, flaky venue wifi) the page shows nothing: no first paint and no `load` for 8+ seconds. Requirement R9 ("zero requests to any origin other than the page's own") cannot pass with the pristine file. None of the five documents calls this blocking; two call it "harmless". | probe4, probe5, probe7 (section 3.1) |
| 2 | Contradiction | Two parallel datasets and two parallel engines: Marchbank (24 contracts, £6.1m, engine in `work/ref/`) versus Brindleford (31 contracts, £3.1m, different £ model, different matcher, different thresholds, different page map, in `work/domain/`). Only the first is wired to charts and tests. | section 2.1 |
| 3 | Contradiction | Two parallel App Shell implementations (`shell-port.md` and `kit-ui.jsx`), two Pill systems, two meters, two stat tiles, two table systems, two segmented controls, three focus-ring rules, three max content widths. No document says which wins. | section 2.2 |
| 4 | Visible defect | Putting `shell.css` and the chart library together underlines every card and every list row link in the product (shell rule `.shell__main li a`), and breaks the body background depending on CSS import order. | probe2, screenshots |
| 5 | Visible defect | Headline cards `£4.2m + £0.6m + £1.1m + £0.3m` add up to **£6.2m** under a **£6.1m** headline. Every council contact who adds four numbers will see it. | probe screenshot |
| 6 | a11y | Requirement R7 (axe 0 violations, `best-practice` tag included) fails on 2 of 6 routes as built: chart library uses hard-coded `<h4>` (heading-order) and the sample banner link fails `link-in-text-block`. | probe run.mjs, fix verified in probe3 |
| 7 | Keyboard bug | Kit `DataTable` clickable rows swallow Enter on any link or button inside the row, so pressing Enter on "View clause, page 23" opens the drawer instead of the clause (mouse click is fine). | probe8 (section 3.6) |
| 8 | Unspecced centrepiece | Demo step 3 ("land on the clause and page") depends on the Source viewer, which has requirements and data but **no visual spec, no component, no snippet in any document**, and the data behind it is one sentence per page flanked by two bracketed filler lines. Contract detail (nine questions), Contracts register, Matches table, Method and Roadmap pages are in the same position. | section 4.2 |
| 9 | Integrity | Two sentences in the specified UI copy are untrue or inappropriate for a pre-sales screen: R21 close line "This is one council's public data" (the data is fictional and the banner says so), and the About dialog's "Whether Kontor can take a batch of public PDFs without a developer is still being tested" (an internal risk from the spec). | section 2.5 |
| 10 | Spec coverage | Evidence section (the section the user's link anchors to) is only partly carried: 6 of 9 cases, no "When" column, no "checked on 6 October 2026" note, and Edinburgh is re-labelled away from the spec's feature. "Who would buy it" and the Stage 1 data-sources section are not carried at all. | section 4.1 |

Good news worth saying out loud: the shell, kit and chart library **do compile together** (esbuild 100 ms, `app.js` 832 KB, `app.css` 975 KB, zero page errors), the Overview headline H1 and all four basis-card strings match the golden strings exactly, and axe reports no colour-contrast violation anywhere in either theme (3 of 6 probe routes are fully clean in both themes; the other three fail on one rule each, all fixable in a line or two). The fixes below are small.

---

## 1. What I verified myself (so you know what to trust)

| Check | Result |
|---|---|
| `node work/ref/engine.test.mjs` | All 11 groups pass (date maths, headline, ranked order, radar bands, cap states, uplift, matching, coverage, scenarios, quote fidelity for every extraction, every flag has a source target). |
| `sample.json` shape | 24 contracts, 1,264 payments, 336 extractions, 24 documents. C-005 doc has `pageCount` 70 and cited pages 7, 13, 20, 23, 31, 32, 33, 43, 46, 51. Clause 14.3 on page 23. Matches R54. |
| Engine purity | `engine.mjs` has no imports and no clock use. Safe to bundle. |
| Probe build (shell port + kit.css + kit-ui + chart library + engine + sample.json) | Builds in ~100 ms. `app.js` 832 KB, `app.css` 975 KB (see 3.4). No page errors on any route. |
| Overview H1 and cards in the shell | H1 `£6.1m across 15 contracts flagged as opportunities to investigate`. Card aria-labels exactly `Spend over cap £4.2m, 3 contracts, already paid above the cap` etc. Radar strip `Next 3 months: 3 contracts, £6.9m a year`. |
| Overview fold fit | 1440x900: radar and coverage cards end at y=876 of 900. 1920x1080 fine. **1366x768 and 1280x720: radar/coverage are below the fold; headline and cards (y=528) are visible.** 1024x768: headline card bottom at 703, radar below. Probe used the short caveat; the long caveat of copy deck 7.2 adds roughly 60 to 80 px, so at 1440x900 the radar strip will cross the fold in the real build. |
| axe-core 4.10.2 (`wcag2a/aa/21aa/22aa/best-practice`) on 6 probe routes x 2 themes | Clean in both themes: opps, cap, table. Overview is clean in light only. Failures: `link-in-text-block` (overview, dark only), `heading-order` (radar and coverage, both themes). No colour-contrast violations on any route in either theme. |
| Heading fix | Changing two `<h4>` to `<h3>` clears both `heading-order` failures (probe3). |
| DS CSS offline fix | A derived copy of `colors_and_type.css` with the two `@import url(https...)` lines removed: 0 external requests, load 319 ms, first paint 200 ms **even with the two hosts hanging**; Inter and Inter Display still load from `design-system/fonts` (probe7). |
| Not verified by anyone (and not by me) | Safari and Firefox; a real screen reader; touch devices; any export (CSV, standalone); Dialog, Drawer, ConfirmDialog, Toast, CommandPalette inside the real shell (only their own harness); web facts (WebFetch and WebSearch are blocked or non-specific from this sandbox; I tried the Sefton page and the Transparency Code field list, no usable result). |

---

## 2. Contradictions between the documents

### 2.1 Two datasets, two engines (requirements vs domain brief)

| Topic | requirements.md + `work/ref/` | domain-brief.md + `work/domain/` |
|---|---|---|
| Council | Marchbank Borough Council | Brindleford Borough Council |
| Contracts | 24 (C-001..C-024) | 31 (BRN-001..BRN-031), 16 clean |
| Spend files | 1 Apr 2022 to 30 Sep 2026, 1,264 rows | 1 Apr 2021 to 31 Aug 2026 (latest month a council could really have published by 6 Oct), ~7,960 rows |
| Headline | £6.1m across 15 contracts (£6,145,238) | £3.1m across 15 contracts (range £1.9m to £4.7m), £3.9m with no-contract suppliers |
| Over-cap value | 100% of spend above cap, counted in the headline | 10% of spend above cap (5 to 15%), then x confidence (1.0, 0.7, 0.4), contract total capped at 12% of run-rate |
| Renewal value | 5% of annual value, flat | 3, 4, 6, 8% by renewal type, haircut by confidence |
| Cap semantics | `cap.source` = `maximum_stated` or `contract_value`; both can produce "Over cap" | `capType` = `maximum` / `estimated` / `fixed`; only `maximum` gives a hard over-cap flag, `estimated` gives "above estimate" at medium confidence |
| Matcher | bigram Dice, 0.90 / 0.70, alias table, no guards | weighted token Dice + bigram + Jaro-Winkler, brand-token guard, group-token guard, margin 0.06, 0.90 / 0.72, RELATED state, redacted-payee exclusion, 38/38 tests, 0 wrong auto-matches on 7,962 rows |
| Page map | Particulars p3, extensions p9, payment p16, cap p19, termination p27, notice p28, exit p29, rate card p39, index p42, credits p47 (+0..4 offset) | Particulars p4-8, notice p20, cap p25, index p27, payment p29, termination p46-52, rate card p81, credits p77 (90-page doc) |
| Supplier names | Wrenfield **Care Partners**, Pellam **Digital**, Quillon **Waste Services** | Wrenfield **Building Services**, Pellam **Recruitment Group**, Quillon **Digital Services** |
| Contract provenance `source` (Find a Tender vs register PDF) | not in the model | 5 of 31 `find-a-tender`, 26 `register-pdf`, shown as a Source chip |
| Guildford link | spec URL (`/procurement-and-contracts/402-procurement-news/57355-...`) | different URL (`/governance/396-governance-news/57353-...`) |

**Recommendation (settle now):** Marchbank + `work/ref/` is canonical. It is the only one wired to the charts, the only one with provenance records and page text, and its golden tests pass. Do not mix names from the two sets (three surnames collide with different industries). Import from the domain brief only these ideas, none of which changes a golden number:

1. **Cap semantics.** When `cap.source === 'contract_value'` the state label must not say "Over cap". Say "Above contract value (estimate)" and drop confidence one step. In the golden data no flag is on a contract-value cap, so the golden numbers do not move (check: over-cap flags are C-005, C-007, C-011, all `maximum_stated`; near-cap C-001 and C-009 are `maximum_stated`; C-017 is contract-value but is on the £0 watch list). A council contractor will know that "estimated value" is not a ceiling; the Sefton lesson applies to our own cap logic.
2. **VAT.** State "figures are net of irrecoverable VAT and compared with ex-VAT contract values" on the Method page and the Cap tab. The requirements doc never says this (the only VAT mention is a model field set to 0). The domain brief calls VAT the biggest false-positive risk.
3. **"Reasons this may not be a saving"** per flag type (domain 5.6) as a short static list inside the flag drawer. It is the Sefton caveat made concrete, costs a lookup table, and is the strongest thing in the domain brief for this audience.
4. **Source chip** per contract ("Council contracts register, PDF" or "Find a Tender notice and contract") so Stage 1's three data sources (spec: Find a Tender over £5m, Transparency Code spend, Contracts Finder context) are visible. Add `source` to the contract model and mark 4 or 5 of the post-24-Feb-2025 contracts (C-019 1 Apr 2025, C-022 1 Jan 2025 is before the date, C-024 1 Feb 2025 is before; only C-019 qualifies, so either re-date one or say "register PDF" for all and explain the £5m publication rule in the About dialog).
5. **Richer clause text** for the demo contract (C-005) only: lift domain 3.3 Clause B ("Maximum Contract Value ... unless the Council has agreed an increase in writing") and the 80% alert clause, plus the "estimated vs maximum" pair on two pages. Keep the page numbers from `provenance.mjs`.
6. **Realism of the data window.** Transparency files appear about 30 days after month end, so on 6 Oct a September 2026 file would not exist. Cheapest honest fix without re-seeding: label spend as "Sample payments to 30 September 2026" and never say "published". Do not move `spendDataTo` unless you will re-run the golden test.

### 2.2 Two App Shells, three UI vocabularies

| Item | shell-port.md (pixel-diffed against the real x-dc render, axe-clean) | kit-ui.jsx / kit.css in ds-cheatsheet.md |
|---|---|---|
| Shell implementation | `AppShell.jsx` + `shell.css`, tokens `--shell-*` | `AppShell` in `kit-ui.jsx`, `.kx-app*` classes, tokens `--kx-*` |
| API | `railItems, activeRail, onRailChange, headerRight, actions, user, onCloseApp, onMenu` | `rail, railActive, onRail, theme, onTheme` |
| Theme toggle semantics | `aria-label="Dark mode"` constant, `aria-pressed` = dark | label flips with state, `aria-pressed` = not dark (double announcement) |
| Rail pitch | 44px items, gap 17px | 44px items, gap 12px |
| Idle nav colour (dark) | `#7C7D85` (4.51:1) | `--grey-400` `#95959F` (6.2:1) |
| App-tab close, Share, Apps glyph, avatar | close x kept; verbatim DS Share and Apps SVGs; avatar `#278640` | close x dropped; FA `share-nodes` / `table-cells-large`; DS `Avatar` |
| Skip link, landmarks, 44px hit areas, mobile bottom bar | yes | no |
| Rail example | 5 items, caption `short: 'Savings'`, initials `JS`, label `Renewals` | 4 items |
| Max content width | 1449px (also DS README) | 1280px (`.kx-page`), charts 1360px |

Other duplicated vocabularies a build agent will meet:

| Need | Kit | Chart library | Decision |
|---|---|---|---|
| Status pill | `Pill` (`--tone-*-surface-*`, brown-ish amber) | `FlagBadge` / `.kviz-pill` (`--viz-warning*`, true amber) | One look. Use `FlagBadge`/`kviz-pill` for flag types and cap states everywhere, tables included; use kit `Pill` only for neutral statuses (match status, confidence, review status). Otherwise "Close to cap" is amber on one screen and brown on the next (visible in probe screenshots `cap-light.png` vs `table-dark.png`). |
| Cap meter | `CapMeter` | `BulletList` lane | Use `BulletList`. Delete `CapMeter` use. |
| Stat tile | `StatTile` | `HeadlineTile` cards | `HeadlineTile` for the four basis cards; `StatTile` only for small KPIs. |
| Table | `DataTable` | `DataTable` in `ChartFigure` (table twin) | Kit one for application tables, chart one stays as the "Show table" twin. |
| Segmented | `Segmented` | `.kviz-seg` | Kit one. |
| Focus ring | `outline: 2px solid var(--accent) !important` | `outline: 2px solid var(--viz-focus) !important` (`--blue-300` in dark) | Keep exactly one global rule (use `--accent`), delete the other. |
| Warning text | `--kx-warning-text` `#D9A125` / `#905F01` | `--viz-warning-text` `#DFB452` / `#7A4D02` | Use the `--viz-*` ones for anything next to a chart mark, `--kx-*` elsewhere; document in one table. |

**Recommendation:** `shell-port.md` skeleton is canonical (it is the one proved against the template). From `kit-ui.jsx` take everything **except** `AppShell`, `WMark`, `ThemeToggle`, `useTheme`. From `kit.css` delete section 3 (the `.kx-app/.kx-header/.kx-rail/...` shell) and in section 2 delete the `html, body`/`body` background rule and the `a` rules (shell.css owns them). Keep `kit.css` sections 0, 1 (tokens), 4 to 17. Pick one page width, 1360px.

### 2.3 Badge vs Pill (requirements vs cheat sheet vs charts)

R72 allows "DS Badge or the kit Pill" and many requirement lines say "badge" (Needs review, Auto-renews, confidence, review status, Roadmap status). ds-cheatsheet and dataviz show **5 of 6 DS Badge tones fail AA in at least one theme** (blue, red, purple, green, amber soft variants 2.3 to 4.2:1). R7 demands axe 0. **Settle:** DS `Badge` is allowed only for neutral counts. Reword the requirement list: every "badge" becomes "pill".

### 2.4 Numbers that disagree on the same screen

| Where | Value A | Value B | Fix |
|---|---|---|---|
| Overview, headline vs four cards | headline `£6.1m` | cards `£4.2m + £0.6m + £1.1m + £0.3m = £6.2m` (integer-rounded compact formatter; exact values sum to £6,145,238) | Show exact values under each compact figure and a one-line sum: `£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238`. Alternatively print cards in £k. Do not re-round to fit; the headline tooltip already carries the exact value. R17's AC string "£4.2m" can stay if the exact line is added. |
| Overview radar strip vs Renewals card | `£6.9m a year` (annual **contract** value of 3 contracts) | `£1.1m ... indicative value per year` (5% of annual value, 12 contracts) | Both are "a year". Relabel the strip "contract value, a year" and the card "indicative opportunity, a year". Visible side by side in the Overview screenshot. |
| Coverage: chart vs tab | `CoverageBlock` computes unmatched as `total - matched` = **£24.1m (16%)**, includes £0.3m awaiting review; ranked shares sum to **98.7%**; shows top 7 + "1 other supplier" | R46, R10 demo script: **8 payees, £23,830,000, £23.8m**, all eight listed individually with a "why" note each | Compute unmatched from the supplier list (£23.83m), show a third stat/segment "Awaiting your review £0.3m", set `topN` to `suppliers.length` (8). |
| Opportunities list amounts | R23 AC: `£3,350,000`, `£760,000`, `£642,478` | `OpportunityList` prints `£3.4m`, `£760k`, `£642k` and has **no `format` prop** | Add `format` passthrough (one line, `BarList` already has it) and pass `gbpFull`. Copy deck 7 itself says "everywhere a figure is audited (tables, drawers, breakdowns) show the full amount". |
| Compact formats | engine `fmtGBPCompact(642478)` = `£0.6m` | chart `gbp(642478)` = `£642k` | Cards use `fmtGBPCompact`; lists use full; never `gbp` for anything with an AC string. |
| Transparency Code 7th field | requirements 4.7: "unique transaction reference" | domain 1.1: "merchant category" | Unverified both ways (gov.uk blocked). Soften UI copy (2.5). |
| Radar band definition | engine: calendar months via `addMonths` (6 Jan, 6 Apr, 6 Oct 2027) | domain: day buckets 92, 183, 366 days | Engine wins; only matters if the two datasets are mixed. |

### 2.5 UI copy that is wrong for this prototype or this audience

1. **R21 close panel and demo step 4:** "This is one council's public data. Imagine your full estate." The data is fictional; the banner (R11) and About dialog (7.3, "What is real. Nothing.") say so. The spec line is for the real-data prototype. **Settle:** on screen use "This is one council's contracts and spend. Imagine your full estate."; keep the spec sentence in the demo guide as a spoken line ("say: this is one council's public data, here simulated").
2. **About dialog 7.3:** "Whether Kontor can take a batch of public PDFs without a developer is still being tested, so you won't see ingestion here." That is the spec's internal top risk, shown to a council contact. **Settle:** on screen "This prototype starts after document ingestion: every answer is shown as already extracted." Put the open ingestion question in a README for the presenter.
3. **About dialog 7.3:** "The payment rows follow the columns councils publish under the Local Government Transparency Code." The column list is "as recalled" (requirements 4.7) and the two documents disagree on it. **Settle:** "The payment rows look like the files councils publish for payments over £500: date, department, supplier, purpose and amount."
4. **Caveat 7.2** states "In 2019 a Local Government Association case study found that £1.7m of one council's potential savings shrank to possibly nil". The spec says the figure was checked on 6 Oct 2026, but the domain agent saw £0.5m in one search summary and could not reconcile. It is also on the headline screen in front of council contacts. **Settle:** headline caveat generic ("An LGA case study found that potential savings can shrink to nothing once outliers are tested"); the £1.7m figure only in the evidence list next to its link, quoted as the scope document quotes it.
5. **Method rationale 7.11** "We use 5% ... We take a lower rate because a 2019 case study at Sefton ..." presents a prototype assumption as a methodology. **Settle:** "5% is a prototype assumption, set below the 8% Sheffield reported (LGA, 2012/13). Change it in Settings." Needs sign-off by Marcus (owns baseline) before any real customer demo, as the requirements doc already says.
6. **R13 lint vs chart strings:** `BarList.jsx` tooltip says "not a confirmed saving"; the probe's headline caveat default says "not confirmed savings". The R13 scan allows "saving" only in the evidence strip, caveat, Method and Roadmap. Rephrase the tooltip ("An opportunity to investigate, not a confirmed result") or extend the allow-list.

### 2.6 Smaller mismatches

- `shell-port.md` section 7 sample rail: `short: 'Savings'`, 5 items, `JS / Jordan Smith`. Requirements 2: six items, caption "Flags", never "Savings", persona `MB`, "Marchbank commercial team". Use the requirements.
- `shell-port.md` router sample: `location.hash.replace(/^#\/?/, '').split('/')[0]`. This breaks on `#/opportunities?type=overCap` (returns `opportunities?type=overCap`) and on `#/source/...` (no rail match). Replace with the router in 4.4.
- ds-cheatsheet 7.3 recommends a "Segmented" for band toggles; dataviz recommends lanes. Not a conflict, but the radar page should not also add a segmented band filter.
- R42 has no acceptance criteria (it is a pointer to R51). Fine, but say so.
- R77's grep (`#[0-9a-fA-F]{3,8}\b` returns only shell.css and the logo) also matches hex inside comments of `kit.css` (~20 lines) and three real `#fff` in `.kx-pill--solid`, `.kx-box`, `.kx-track::after`. Strip comments, swap `#fff` for `var(--white)`.
- R9 AC vs index.html: see section 3.1.

---

## 3. Defects found by the integration probe (with fixes)

### 3.1 DS CSS blocks first paint offline (and R9 is unachievable as written)

`design-system/colors_and_type.css` lines 8 and 9:
```
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css');
```
Measured: both are requested on every load (probe4). With both routed to "never answer" (a venue network that accepts the connection and goes quiet), `load` and first-contentful-paint do not occur for 8+ seconds, i.e. a blank screen (probe5). The cdnjs one also loads Font Awesome a second time (the repo already vendors 6.5.2).

Fix without touching `design-system/` (verified, probe7: 0 external requests, load 319 ms with hanging hosts):

```js
// scripts/ds-offline.mjs  (run first in `npm run build`)
import fs from 'node:fs';
fs.mkdirSync('dist/ds', { recursive: true });
const css = fs.readFileSync('design-system/colors_and_type.css', 'utf8')
  .replace(/^@import url\(['"]https?:[^)]*\);?[ \t]*$/gm, '')          // the two remote imports
  .replace(/url\('fonts\//g, "url('../../design-system/fonts/");         // keep local Inter
fs.writeFileSync('dist/ds/colors_and_type.css', css);
fs.writeFileSync('dist/ds/styles.css',
  "@import '../../design-system/components/fig-tokens.css';\n@import './colors_and_type.css';\n" +
  "/* Geist Mono, self-hosted: npm i -D @fontsource/geist-mono, copy the woff2 to assets/fonts */\n" +
  "@font-face{font-family:'Geist Mono';font-weight:400;src:url('../../assets/fonts/geist-mono-latin-400-normal.woff2') format('woff2');}\n");
```
Then `index.html` links `dist/ds/styles.css` instead of `design-system/styles.css`. Change R9's AC to "no request to a non-same-origin host" and add a Playwright check that logs requests, with Google Fonts and cdnjs routed to hang. Add `<link rel="icon" href="data:,">` (otherwise a favicon 404 on every load).

### 3.2 `shell.css` link rule underlines everything the chart library renders

`shell.css`: `.shell__main p a, .shell__main li a, .shell__main dd a, .shell__main small a { text-decoration: underline }`. Chart rows, the four basis cards, radar band cells and the ranked lists are all `ul > li > a`, so every line of text on those cards is underlined (probe2 shows the matching rule; screenshot `shots/overview-shellfirst-dark-1440.png`). The same rule does **not** cover a link inside a `div`, so the sample banner link fails `link-in-text-block` (serious).

Fix:
```css
/* replace the shell.css rule with: */
.shell__main :is(p, dd, small, .kx-prose li) a:not([class]) { text-decoration: underline; text-underline-offset: 2px; }
.kx-banner a { text-decoration: underline; text-underline-offset: 2px; }   /* banner is a div, or make it a <p> */
```
(`.kviz-textlink` already carries its own underline; the cards are classed links so `:not([class])` leaves them alone.)

### 3.3 CSS order decides the page background

kit.css `body { background: var(--kx-shell-bg) }` versus shell.css `html, body { background: url(texture) ..., var(--shell-page-bg) }`. Probe: kit first then shell: texture on both `html` and `body` (as in the template). Shell first then kit: `body` background-image `none`, texture only on `html`. Also `src/styles/app.css` sets `html, body { background: var(--bg-canvas) }` (shell-port notes this). **Fix:** delete both body backgrounds from kit.css and app.css; shell.css is the single owner; import order shell, kit, charts.

### 3.4 Texture inlined twice: `app.css` is 975 KB

Both kit.css (`--kx-shell-texture`) and shell.css reference `blob-texture.png`; esbuild's `dataurl` loader inlines each reference (about 465 KB each). Removing the kit.css reference brings CSS to about 510 KB. Better: `external: ['/assets/*']` for the png as shell-port tested, or ship `assets/blob-texture.png` and reference `../assets/blob-texture.png` from `dist/`. R74's 3 MB budget still passes either way (JS 832 KB with data and charts).

### 3.5 `heading-order` in the chart library

`RadarLanes.jsx` line 53/58 and `BarList.jsx` line 175 (`CoverageBlock`) hard-code `<h4>`; with `<h1>` page title and `<h2>` figure title that skips h3. Change both to `<h3>` (class-based styling, no visual change; axe clean after, probe3). `ChartFigure` `as` default is `h3`, so pages must pass `as="h2"` under an `<h1>`, which every snippet already does.

### 3.6 Kit `DataTable` eats Enter on controls inside a clickable row

`<tr tabIndex=0 onKeyDown={Enter/Space -> preventDefault(); onRowClick}>` has no `e.target === e.currentTarget` guard. Probe 8 (counters kept outside React state): focus an inner link and press Enter gives `{row: 1, link: 0}` and the drawer opens, i.e. the row handler ran and `preventDefault()` cancelled the link's activation; a mouse click on the same link gives `{row: 0, link: 1}` and no drawer, so the bug is keyboard-only (which is what makes it easy to miss). R24/R25/R61 need links, a status `<select>` and buttons inside rows. Fix:
```jsx
onKeyDown={onRowClick ? (e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(r); } } : undefined}
onClick={onRowClick ? (e) => { if (e.target.closest('a,button,input,select,textarea,label')) return; onRowClick(r); } : undefined}
```
Note the chart library avoids this with its stretched-link pattern; use that pattern (one primary action per row, extras above it) for the Opportunities list and keep `DataTable` clickable rows for Contracts and Matches only. Also make `.kx-table-wrap` keyboard-scrollable (`tabIndex=0`, `role="region"`, `aria-label`) when it can scroll, or axe `scrollable-region-focusable` will fire on narrow widths for tables whose rows are not interactive.

### 3.7 Chart library vs the acceptance criteria it is meant to satisfy

| Requirement | Library behaviour | Needed |
|---|---|---|
| R23 columns (rank, type, title, supplier, **reason**, £ with basis, **action by**, confidence, **review status**, source) | `OpportunityList` shows reason as one truncated line (6 of 19 rows truncated at 1440, probe 6), reason is the placeholder `defaultReason` (not copy deck 7.5), no review-status column | wrap the reason to two lines (remove the single-line ellipsis on the sub line), supply `reasonFor` from a real `copy.js`, add a status pill slot to the trail |
| R26 status filter "Open / Reviewed / All" | adapter `opportunityItems` does `result.ranked.filter(counted)`, so reviewed flags can never appear | pass all ranked flags with `status`; render reviewed rows muted with a pill |
| R25 drawer must survive triage | A flag marked Explained leaves the default "Open" list, so a drawer driven from list items would vanish | drive the drawer from `estate.flags.find(f => f.id === openId)`, not from the filtered list |
| R37 columns incl. **amount over cap**, basis and source labels | `BulletList` shows spend, cap, % and a pill; "over by" only in the tooltip/aria; basis in `extra` | put "£3,350,000 over" in the numbers column or status block; the "Show table" twin must carry cap basis, source, over-by |
| R38 spend traceable: click spend, see contributing payments, subtotal to the penny, "paid after the end date" separately | no component anywhere | expand-row or drawer listing `attributed.filter(a => a.contractId === id)`; engine already has the data |
| R46 eight rows each with "no contract to read" note | `CoverageBlock` top 7 + "other" | `topN = suppliers.length`, add the note in `sub` |
| R16 H1 hover shows exact value | done (`HeadlineTile`) | none |
| R35 / R32 radar row: notice period as extracted, end date, confidence, clause link, action line | lane shows deadline diamond, end tick, relative text; the rest must arrive through the `extra` slot | `extraFor` must render action line (7.6), "6 months' notice", confidence pill, "View clause, page N"; rows get tall, check 24 rows |
| Opportunities filter chips | CSS lives in `harness.css` (`hx-chipbtn`), not in `charts.css`; unstyled in the probe (screenshot `opps-dark.png`) | port `.hx-chipbtn/.hx-filters/.hx-count` into `charts.css` as `.kviz-chipbtn...` |
| Cap list contract titles | single-line ellipsis cuts "Highways reactive maintenance and mi…" and "ICT managed service and end-user sup…" (probe screenshot `cap-light.png`) | allow two lines for the name |

### 3.8 AppShell lacks hooks that requirements need

R11: "header app tab carries a Sample badge" - `AppShell` takes only a string `appName`. Add `appBadge` (render a neutral Pill after `.shell__apptab-name`). R5: Apps, Chat, Share, Notifications, Settings, Menu need `onClick`/`onSelect` handlers that toast; the skeleton's defaults are inert. Recommended wiring that makes the Settings gear real: it opens a "Demo settings" drawer containing Assumptions (R64), Reset demo changes (R63, confirm dialog then toast), About this data, Demo guide. That resolves the orphan that R63 says "in the Settings drawer or footer" while R64 (the drawer) is only "could". Optional: Share copies the deep link ("Link copied to your clipboard").

---

## 4. What is missing

### 4.1 Spec items nobody (fully) covered

| Spec item | Status in the research | What to add |
|---|---|---|
| **Evidence** (the section the user's link anchors to): 9 cases, a **When** column, "Every case below was checked against its source on 6 October 2026", a "Kontor feature it supports" column | requirements 1.8 keeps 6 cases, drops Gedling, Windsor and Maidenhead, Brighton and Hove ("Show all cases" is ambiguous: all 6 or all 9); no "When" column or checked-on note; Edinburgh re-labelled "No-contract spend" where the spec says "Contract register built from documents"; Gedling would have supported the Financial question set, which then has no evidence | Make Evidence a real section: all 9 cases in a table (Case, When, What happened, Feature it supports) with the spec's wording and links, the checked-on note, `rel="noopener noreferrer"` and "(opens in a new tab)". Either route `#/evidence` (add to Roadmap page as a tab to keep the rail at 6) or the Overview strip with "Show all 9 cases". The user pointed at this section on purpose. |
| **Who would buy it** (Central government: Cabinet Office post-award data and spend analytics tool; Regional bodies: Regional Care Cooperatives, London Councils, consortia; Merging councils under LGR) | zero mentions in all five documents | Add to Roadmap page content (section 9 of requirements) as item 6b with the LGA link. |
| **Stage 1 data sources** (Find a Tender over £5m for procurements on/after 24 Feb 2025, Transparency Code spend, Contracts Finder below £5m) | only in the domain brief; requirements 1.6 says "context for Roadmap and About-this-data only" but 7.3 and section 9 contain none of it | One short paragraph in About this data and a Source chip (2.1 item 4). |
| Spec "about 9 questions **added to Kontor's existing set**" | UI shows nine questions as if they were the whole product | Optional: label the group "New financial questions" so the pre-sales story "new questions on an existing engine" is visible. |
| Open questions (5 checkboxes) | turned into working assumptions in 1.7 | Fine. Keep out of the customer UI (see 2.5). |

### 4.2 Screens with requirements but no design, component or snippet

No document contains a layout, component or code for: **Source viewer** (R54-R59, the demo's climax), **Contract detail** (nine questions, derived panel, payments table, spend by year, flags first; R49-R53, R51), **Contracts register** (R48), **Supplier matches tab** (R43-R45), **Method page** (R65), **Roadmap page** (R67), **Overview composition** (banner + H1 + caveat + cards + radar + coverage + evidence + close + demo guide; only the headline row and two cards were built, in a harness with no banner), **Assumptions drawer**, **Feedback dialog**, **Demo guide drawer**, **About dialog**, **triage select**, **hand-check control**. The kit has the primitives (Dialog, Drawer, DataTable, EmptyState, Segmented, Pill); the composition is unwritten. Budget the build accordingly.

**Source viewer content is thin.** `provenance.mjs` emits, per cited page, exactly three blocks: `[Preceding clauses on this page are not included in the sample.]`, the clause (one sentence), `[Following clauses ...]`. On the screen the demo lands on, that reads as a stub next to a real PDF page. Upgrade `provenance.mjs` (the quote-equality test keeps working because only the cited block is compared): for every cited page render a heading plus 4 to 6 neighbouring illustrative clauses (e.g. 14.1, 14.2, **14.3 cited**, 14.4, 14.5) from a small template bank, a running header ("Marchbank Borough Council | Agreement | Page 23 of 70"), and a page footer. Do it at least for C-005 (the demo contract) and C-001, C-004. Spec and mechanics for the viewer:

- Layout: two panes inside the shell. Left (about 62%) "document" page on a paper-like `--bg-canvas` card, 720px max, Geist Mono for clause refs; right (about 38%) side panel: question, answer, clause ref, page, quote (blockquote, not a card with a coloured left border), confidence pill, document title, label "Illustrative contract text written for this demo, not a real document."
- Highlight: `mark` with `outline: 2px solid var(--accent)`, `background: color-mix(in srgb, var(--accent) 14%, transparent)` and a small label "Cited clause" (non-colour cue). `scrollIntoView({block:'center'})` on mount, `tabindex=-1` and focus the mark.
- Buttons: "Back to opportunity" (outline), "Previous answer", "Next answer", "Mark answer as correct" (outline) and "Mark answer as incorrect" (outline); no primary on this page except none needed. Breadcrumb with hash hrefs.

### 4.3 Code the requirements assume exists but no file contains

1. **`src/lib/copy.js`**: `reasonFor(flag, contract, derived)` (7.5 templates with the append rules for after-end, partial coverage, low confidence), `actionLine(contract, derived)` (all nine renewal cases of 7.6), `relativeText`, triage toast text, "Needs attention now" sentences (R34). The engine returns `breakdown`, `evidenceFields` and numbers only (grep shows no reason or action strings). The chart `defaultReason` is a placeholder in different words from 7.5.
2. **`evidenceFor(flag)`**: map `flag.evidenceFields[0]` to `contract.extractionIds[field]` to the `extractions` record to `provenance[0].page/clauseRef`, for `clauseFor` in `opportunityItems` (the harness fakes it by hashing the contract id and links `#/source/<contractId>` without the extraction id).
3. **Router** (nobody wrote one): see 4.4.
4. **`scripts/gen-data.mjs`**: `package.json` scripts `data` and `standalone` point at `scripts/gen-data.mjs` and `scripts/make-standalone.mjs`, neither exists (only `build.mjs`, `static-server.mjs`, `vendor.mjs`). The requirements table maps three source files (`seed.mjs`, `provenance.mjs`, `gen-data.mjs`) onto a single target; copy all three to `scripts/lib/` and change the default output to `src/data/sample.json`.
5. **Static content modules**: `src/data/evidence.js` (9 cases), `roadmap.js`, copy for About, Method.
6. **Tests**: only `tests/shot.mjs` exists. R75 wants `tests/engine.test.mjs`; add an `npm test` that also runs axe on all routes in both themes, a copy lint (R71, R13) and the request log (R9). The dataviz 80-assertion script is bound to absolute paths in the research folder (its own note).
7. **Error boundary** around the app with an [What][Why][How] message, so a thrown engine error does not leave a blank shell in front of a customer.

### 4.4 Router, state and focus behaviour (unspecified, affects R2, R3, R4, R54, R25)

Minimal router that satisfies R2/R3 and the "Back to opportunity" rule:
```js
export function parseHash(h = location.hash) {
  const [p, q = ''] = h.replace(/^#\/?/, '').split('?');
  const seg = p.split('/').filter(Boolean).map(decodeURIComponent);
  return { seg, name: seg[0] || 'overview', query: new URLSearchParams(q) };
}
// rail highlight: source viewer keeps the rail item of the page that linked to it
export const railFor = (r) => (r.name === 'source' ? (r.query.get('from') || 'opportunities') : r.name === 'method' ? null : r.name);
// links to the viewer: `#/source/C-005/X-C-005-maximumValue?from=opportunities`  (survives reload, unlike in-memory state)
```
On every route change: reset `document.getElementById('shell-main').scrollTo(0, 0)` (the `main` element is the scroll container and is reused, so a new page otherwise opens part-way down), set `document.title`, and move focus to the page `<h1>` (give it `tabIndex={-1}`). `#/method?s=cap` needs a `scrollIntoView` on the section id after render.

### 4.5 Data model fields consumers need that the model lacks

| Needed by | Field or function | Where |
|---|---|---|
| Source chip, spec data sources | `contract.source: 'find_a_tender' \| 'register_pdf'` | model + seed |
| R5/R23 reason and action text | `reason`, `actionLine` (computed, in `copy.js`) | not stored |
| R28 Watch list wording | `flag.watchNote` | `copy.js` |
| R38 | `paymentsFor(contractId)` helper (trivial filter of `attributed`) | `estate.js` |
| Cap labelling (2.1 item 1) | `cap.source` already exists; add `capState: 'over' \| 'above_estimate' \| 'near' \| 'ok'` and lower confidence one step for `contract_value` | engine |
| Evidence page | static `evidence[]` (case, when, what, feature, url) | `src/data/evidence.js` |
| Contracts register R48 | `status` (Live/Ended) and `flagCount` derived in the page, not the engine | page |
| R59 hand-check | `kontor-handcheck` keyed by extraction id (exists) | persistence |

---

## 5. Hand-wavy or unverified statements

1. **"Everything is verified"** claims are per-harness. Verified in isolation: shell (axe 0, pixel parity), kit (its own gallery), charts (80 assertions in a harness with no shell, no banner, no `shell.css`). Not verified together until my probe: that is where findings 4, 5, 6, 7 appeared.
2. **R78 (presenter density)** is stated as met ("content ends at about y=810", dataviz 7.3) in a harness with no shell, no banner, no eyebrow and the short caveat. In the probe with shell and banner the radar row ends at 876 of 900; with the long caveat it overflows. At 1366x768, a very common projector and laptop size, only the headline and cards fit. **Amend R78:** "At 1440x900 and 1366x768 the headline, caveat and four cards are visible without scrolling; the radar summary may sit below."
3. **Transparency Code columns** are recollection (requirements 4.7) and the domain brief lists a different seventh field. Treated correctly as an uncertainty in both, but the About dialog copy states fidelity (2.5).
4. **Domain brief facts** are honestly tagged [S]/[K]/[U], but none was opened; WebFetch is blocked here too (I tried the Sefton page: egress blocked) and WebSearch returned only generic parish-council pages for the Code's field list. Use the domain brief for flavour and clause language, not for anything said aloud. Particular items to keep out of the UI: thresholds £207,720 / £5,193,000 / £663,540, the notice-type list UK1 to UK17, "551 fields", CPI 3.1% for August 2026, NJC 3.3%.
5. **Sefton figure** (£1.7m versus £0.5m) is a known open discrepancy and is currently printed in the headline caveat (2.5 item 4).
6. **The 5% renewal rate** is a prototype assumption with an invented rationale (flagged by the requirements doc as Marcus's call). Fine for a demo if labelled as an assumption.
7. **"Dense sample" caveat.** About 62% of contracts carry a flag. A council contact may read the sample as "your estate is a mess". Mentioned in the requirements risks; make the presenter note explicit in the demo guide.
8. **Headline mixes exposure and opportunity** (£4.2m is already paid above a stated cap, 100% counted; £1.1m is 5% of annual value). Requirements risk 3 says keep the cards separated; the headline itself still adds them. Sanity check that supports keeping the model: £6.1m is 4.0% of the £153.5m in the payment files; the domain brief's own disbelief threshold is about 5% of third-party spend. Say so on the Method page ("equivalent to 4% of the £153.5m in the payment files").
9. **Browser support.** Charts need container queries and `color-mix()` (Chrome 111, Safari 16.2, Firefox 113); shell uses `100dvh`. No fallback, untested in Safari and Firefox. If the Lead SE presents from Safari or an older managed Chrome, test first.
10. **Light theme** is a judgement call (no official light shell). Reasonable (white panel on `#F2F3F7`, `#C1C1CC` line). Record it in the README so a design reviewer knows it is deliberate; consider shipping shell-port's `#parity` route (template-exact content) as a hidden review route to answer "is this the Springboard App Shell?" Deviations from the template to disclose: avatar `#278640` not `#2E9E4B`, idle tab `#7C7D85` not `#76777F`, uniform 44px rail slots (Files icon 1px high), rail and tab hit areas enlarged, texture dropped in light, logo ring dark in light.
11. **Scope.** 78 requirements (53 must, 21 should, 4 could) plus 9 undesigned screens. A realistic "demo-critical" subset is in section 7.

---

## 6. Requirements doc: precision notes

- R1 AC (2) "header is 72px tall and the rail is 64px wide": the rail is 65px (64 + 1px border, content-box). Say "64px plus a 1px border".
- R6 AC (1) "before React mounts" is satisfied by the pre-paint script already in `index.html`; also keep `<meta name="color-scheme">` (it follows the OS, not the toggle, which is why the CSS `color-scheme` per theme in shell.css matters).
- R7 AC: add `link-in-text-block` and `heading-order` as explicit checks, they are the two that failed.
- R9 AC: see 3.1.
- R10 AC (3) uses a grep for `new Date()`; chart `format.js` uses `new Date(arg)` only, which the grep (no-arg form) ignores. Fine.
- R11 AC "cannot be dismissed, is not covered by the header": fine; note `shell__main` is the scroll container so a banner at the top of the page scrolls away. If it must be "visible without scrolling" at all times, make it sticky inside `main` or place it above `<main>` in the shell body (small `AppShell` change, `banner` prop).
- R16/R17: see 2.4 (cards rounding).
- R20 "Show all cases": define it as all 9.
- R21: see 2.5.
- R23/R26/R37/R38/R46: see 3.7.
- R31 "contract count, annual value and total value" per band: `RadarLanes` shows count and annual value only. Either drop "total value" from the AC or add it to the band header.
- R35 says "if the `dataviz` skill is available to the build agent, follow it": the recipe already did; point at `RadarLanes`/`RadarStrip` instead.
- R42 has no AC.
- R70 "dense data tables may use 40px rows": kit `.kx-table td` is 44px, `--dense` is 32px; chart rows are 52 to 56px. The 24-row cap list is about 1,900px tall (dataviz risk 6): keep `limit={12}` plus "Show all 24 contracts" on the Cap page, but R37 says "table of all contracts": either change R37 to "top 12, then all" or default to all 24 with sticky header.
- R77: see 2.6.
- R78: amend (section 5, item 2).

---

## 7. The five riskiest build decisions and how to settle each

### D1. Which dataset and engine is canonical (and what to take from the other)
Risk: a build agent that opens both folders will blend Marchbank and Brindleford, or rebuild the engine from the domain brief's different £ model, and every golden number, chart prop and AC string stops matching.
Settle: Marchbank + `work/ref/{engine,seed,provenance,gen-data}.mjs` + `out/sample.json` are canonical, copy unchanged. Retire `work/domain/` as reference-only. Apply only the six imports in 2.1 (cap semantics label, VAT note, "reasons this may not be a saving", Source chip, richer C-005 clause text, data-window wording). After each change rerun `node tests/engine.test.mjs`; items 1 to 3 do not change any golden number.

### D2. What the headline £ claims, and how the caveat is worded
Risk: the figure is the first thing a council contact reads and it is attackable three ways: it does not add (6.2 vs 6.1), it mixes already-paid exposure with per-year opportunity, and the caveat leans on a Sefton number the team has not reconciled.
Settle: keep the engine's rules (4% of payment spend is credible). Fix the display (exact figures under the cards plus a sum line), relabel the radar annual values as contract value, make the headline caveat generic (2.5 item 4), add "Of this, £4.2m is spend already paid above a stated cap" as the first sentence under the cards, and add a Method line: "5% is a prototype assumption". Get Scott and Marcus to confirm the 5% and the 100% counting of over-cap excess before any real customer demo (both documents already say so).

### D3. One shell and one CSS owner, offline-safe
Risk: two shells, three focus rules, a 975 KB stylesheet, link underlines everywhere, white screen on a flaky network, and R9 failing.
Settle: `shell-port` skeleton is the shell; kit is a library of non-shell components; one global stylesheet order `dist/ds/styles.css` (derived, offline), `shell.css`, `kit.css` (trimmed), `charts.css`, `app.css` (no body background). Apply the patch list in 3.1 to 3.8. Add `appBadge`, `banner` and handler props to the shell. Add a build guard: `grep -c "https\?://" dist/*.css` must be 0 and a Playwright request log with hanging externals must show first paint under 1 s.

### D4. Design the Source viewer and Contract detail before anything else
Risk: the demo's third step (and the product's differentiator, "clause-level provenance is the edge") has no design, thin data and the weakest page in the whole dataset. A flat one-sentence page after a polished headline will deflate the demo.
Settle: build these two pages second (right after plumbing and Overview). Enrich `provenance.mjs` for C-005, C-001 and C-004 (4 to 6 neighbouring clauses, running header and footer, "estimated value" on the Particulars page versus "maximum" on the clause page as the domain brief's rule of thumb), then implement the viewer to the spec in 4.2. Contract detail: nine question groups as a definition list with the confidence pill and "View clause, page N" per field; derived panel; flags first (R52); payments table with the kit pager; `YearBars` for annual caps and `CumulativeLine` for total-term caps (the "Guildford moment" with the cap crossing annotated, already built and tested in the library).

### D5. How much of the chart library to use as shipped versus bend to the ACs
Risk: building list screens from the library's shapes leaves R23, R26, R37, R38, R46 failing their own ACs (compact amounts, truncated reasons, reviewed rows dropped, no over-by column, no spend traceability, 7+1 supplier rows), while rebuilding them as plain tables throws away the best visual work in the research.
Settle: use the library for the visual layer and make five small, listed edits (3.7): `format` prop on `OpportunityList`, wrapped reasons, adapter keeps reviewed flags with `status`, over-by figure and basis on `BulletList` rows plus a spend drill-down (drawer of payments with subtotal), `CoverageBlock` unmatched from the supplier list and `topN = all`. Everything auditable (amounts, reasons, review state) comes from props produced by `copy.js` and the engine, never typed twice. Everything hand-rolled stays in the kit.

---

## 8. Suggested build order (so a late finish still demos)

1. **Plumbing**: `scripts/ds-offline.mjs`, `index.html` links, shell skeleton + patches, theme (done in the skeleton), toast host, router (4.4), `estate.js` (`computeEstate` from requirements 5.0), error boundary, `copy.js`.
2. **Overview** (banner, H1, caveat, four cards with sum line, radar strip, coverage meter, evidence strip, close panel). Check at 1440x900 and 1366x768.
3. **Opportunities + flag drawer + Source viewer** (demo step 3), with the C-005 text upgrade. Keyboard run-through of "row, View clause, back".
4. **Renewal radar** page (`RadarLanes` with `extraFor`).
5. **Cap vs spend** (BulletList, annual `YearBars`, drill-down), **matches** tab (confirm and reject), **no-contract** tab.
6. **Contract detail** and **Contracts register**.
7. **Method, Roadmap (with Evidence and Who would buy it), About, Settings drawer (assumptions, reset), Feedback, Demo guide.**
8. **QA**: `npm test` = golden engine test + axe on every route in both themes + copy lint (`!`, emoji, "OK", "saving" outside allow-list) + request log. Fix list in section 3 is the likely axe set.

Cut line if time runs out (all are "should" or "could" in the requirements): R22 demo guide, R29 export, R35 extra timeline (the lanes already are one), R57 previous/next, R59 hand-check, R64 assumptions drawer, R51 payments paging, Contract register category filter.

---

## 9. Copy-paste patch index

| Patch | Where | Section |
|---|---|---|
| Strip remote `@import`s into `dist/ds/` | new `scripts/ds-offline.mjs`, `index.html` | 3.1 |
| Scope link underline | `shell.css` | 3.2 |
| Remove body background and texture duplicate | `kit.css`, `app.css` | 3.3, 3.4 |
| `h4` to `h3` | `RadarLanes.jsx` 53/58, `BarList.jsx` 175 | 3.5 |
| DataTable key and click guards, scroll region focusable | `kit-ui.jsx` | 3.6 |
| `OpportunityList` `format`, wrapped reason, reviewed rows, status slot, chip CSS | `BarList.jsx`, `adapters.js`, `charts.css` | 3.7 |
| `CoverageBlock` total and topN | `BarList.jsx`, `adapters.js` | 3.7 |
| `appBadge`, `banner`, handlers | `AppShell.jsx` | 3.8 |
| `copy.js`, `evidenceFor`, router | new files | 4.3, 4.4 |
| `source`, `capState` | engine and seed | 4.5, 2.1 |
| Copy changes (R21 line, About dialog, caveat, 5% wording, tooltip) | copy deck 7.2, 7.3, 7.11, `BarList.jsx` | 2.5 |
| Rail: six items, caption "Flags", initials MB | shell wiring | 2.6 |
| `package.json`: `data`, `standalone`, `test` targets exist | scripts | 4.3 |

Probe artefacts for reproduction: build with `cd /home/user/LG-Proto1 && node scripts/build.mjs --entry <research>/work/critic/probe/src/entry.jsx --outdir <research>/work/critic/probe/out-shellfirst` after `cp probe/src/order-shellfirst.js probe/src/order.js`; run `node work/critic/run.mjs` (axe, collisions, fold fit, Enter bug, coverage text, truncation), `probe2.mjs` (underline rule), `probe3.mjs` (h4 fix), `probe4/5/7.mjs` (external requests, hang, derived CSS), `probe6.mjs` (resolutions), `probe8.mjs` (DataTable Enter bug).
