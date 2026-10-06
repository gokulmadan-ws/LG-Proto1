# Review "vis": visual design director lens

Reviewer: vis. Build under review: `/home/user/LG-Proto1/dist` (fresh, `app.js` 21:04). Browser: Chromium only (Playwright, `tests/lib/harness.mjs`).
Scratch (git-ignored): `.scratch/vis/` (scripts, 1,522 screenshots, crops). New reusable test: `tests/review/vis-visual-checks.mjs` (11 checks, currently 0 of 11 pass, exits 1).

## 1. Verdict

The app looks like one product. The dark shell is a faithful port of the template reference (header 72px, rail 64px, active tint, tab underline, blob texture all match `ref-shell-dark.png`), the story screens (Overview, Opportunities, flag drawer, Source viewer, Contract C-005) are well composed, the headline has an unmistakable focal point, numbers are tabular, there are no hex colours outside `shell.css`, no gradients and no coloured left borders, and the light theme is as polished as the dark one (no invisible borders on controls, no washed pills, charts re-tint correctly). 200% and 400% zoom (720x450 and 512x384 CSS px) produce no page-level horizontal scroll on the five story routes.

What a design director would still stop the demo for: (1) the headline exact-value tooltip, the very first hover of the demo, lands on top of the sample-data banner and the rail; (2) at 1366x768 the ranked list shows one row; (3) the rail Menu button (Evidence, Method, About, Demo guide, Feedback) is clipped and unreachable below roughly 480px of window height, which is what 200% zoom on a 1440x900 screen produces; (4) the Evidence table hides its fourth column at 1024px; (5) "Show table" on Cap vs spend lets the whole shell pan sideways on tablet and phone. The rest is polish: heading scale, page-header consistency, a few phone layouts, a light-mode theme-toggle glyph that reads as a second cog.

## 2. What was checked and how

| Check | Method | Result |
|---|---|---|
| Every route and overlay state, dark and light, at 1440x900, 1366x768, 1024x768, 390x844 | `.scratch/vis/capture.mjs`: 43 states per theme per viewport (overview, tooltip, keyboard focus, opportunities and 3 filter states, 4 flag drawers, renewals, spend, 3 payment drawers, matches, no-contract and its drawer, contracts and empty search, 6 contract details, 2 source viewers and the missing-page state, method x2, roadmap, evidence, not found, About, Menu, Feedback, Feedback error, Settings, Settings confirm, Demo guide, toast). First viewport plus scrolled slices plus full-page strip. Every slice was opened and read. | 1,522 PNGs read. Two capture timeouts on phone (About, Share toast) were my selector/CPU load; About re-run and read, Share is hidden under 700px by design. |
| Shell fidelity | Compared `ref-shell-dark.png` / `port-parity-dark.png` with our dark 1440x900 | Match: logo disc, tab strip, underline, circle buttons, rail position and active tint. Additions are the Sample badge, theme toggle, banner. |
| Light-mode polish | Read every light screenshot against its dark twin, sampled pixels for borders and surfaces | Good. Findings vis-06, vis-24, vis-25 only. |
| 200% browser zoom | `.scratch/vis/z200.mjs` at 720x450 and 512x384 CSS px, deviceScaleFactor 2: overview, opportunities, flag drawer, renewals, spend, source, contract | No document overflow (`scrollWidth == clientWidth`) on all 7 at both sizes. Findings vis-01, vis-27. |
| Long text | `.scratch/vis/long.mjs`: 270-character unbroken search string, 600-character feedback comment | No overflow (document 1440 = 1440). Search input scrolls, empty state wraps, saved feedback wraps in the dialog. Pass. |
| Typography | `m1.mjs` font-size inventory per route, `probe3.mjs` heading scale, `orphans.mjs` last-line words and measure | Inter / Inter Display used consistently (Display for figures and titles, Geist Mono for ids and clauses); tabular-nums on 54 rules. Findings vis-10, vis-11, vis-30. |
| Truncation | `m1.mjs` clamp/overflow scan | Only intended clamps; findings vis-08. |
| Overflow regions | `regions.mjs` at 1024 and 1366 | 1366: none. 1024: matches table (994 in 867), roadmap tables (894/867, 974/775), evidence table (1092/867). |
| Spacing rhythm | Page container 1360px, 32px gutter, 24px section gap on every page; CSS audit of off-4px values | Consistent. Off-grid values exist (3px, 7px, 9px, 13px, 18px, 26px) but are all optical, not visible. No finding. |
| Keyboard focus visuals | `kb.mjs` dark and light | 2px accent ring plus halo on every stop reached (cards, row links, chips, contract rows, See payments). Double ring on the opportunity row: vis-07. |
| Phone layouts | 390x844 at DSF 2, all routes both themes | Bottom bar, stacked cards, drawers full width. Findings vis-16 to vis-20. |
| Automated | `node tests/review/vis-visual-checks.mjs` | 0 of 11 pass (all 11 encode defects below). |

## 3. Known issues reported by the builders, verified

| Reported | Verified | Severity |
|---|---|---|
| Chart tooltip portal: axe `region` | Real. axe with the headline tooltip open reports `region` x4. Same portal causes vis-02 (position). | minor (vis-28) |
| `.kx-table-wrap` needs `position: relative` | Real and wider than reported: the chart `ChartTable` wrapper `.kviz-tablewrap` has the same flaw. Cap vs spend "Show table" widens the document by 138px at 1024 and 686px at 390. | major (vis-05) |
| `th` surface paints `tbody` row headers grey in light | Real on the Method page ("Last 12 months" cell is (249,250,251) next to white cells). Spend and Contracts patch it locally. | minor (vis-25) |
| `.kx-field input:indeterminate + .kx-box` paints unselected radios as checked | Still in `kit.css:245`; Feedback overrides locally and renders correctly. | nit (vis-31) |
| `from=method` highlights Opportunities in the rail | Real: `?from=method` gives rail current "Opportunities" while the button says "Back to method page". | minor (vis-26) |
| Evidence route title vs page title | Real in `routes.js`, but invisible: `document.title` is "Why this matters | Kontor financial layer" and the h1 matches. | not reported as a finding |
| Dead css `.stub-overlay*`, `.menu-popover*` | `.stub-overlay` still at `app.css:118-126`; `.menu-popover` already gone. | nit (vis-31) |
| Opportunities list at 1366x768 shows only the first row, rows about 99px | Real: row 1 spans y586-684, row 2 685-783 is cut by the 768 bottom; rows are 98px. At 1440x900 three rows fit. | major (vis-03) |
| Possible double focus ring on a keyboard-focused row (dark) | Real, in dark and light. | minor (vis-07) |
| CoverageBlock segments focusable (4px target) | Not re-measured; `NoContractTab.jsx` hides the bar from assistive tech with a local effect. Not visual. | not reported |
| CumulativeLine end labels can collide (C-007) | Mitigated: C-007 uses a 440px plot, "114% of cap" and "Cap £5.4m" stack without overlap (tight but legible). C-005 clean. | no finding |
| Method page types literals | Not a visual matter. | not reported |
| Settings gear and Notifications hidden under 700px | Real; header on phone shows theme, Menu, avatar only (Share and Notifications also gone). The Menu has no Settings item. | minor (vis-23) |
| Copied feedback prints the UTC date | Not visual; not checked. | not reported |
| Source viewer at 1366x768, answer panel taller than the window | Real in effect: the panel scrolls with the page and the question heading is off-screen on arrival; the answer, clause, page, quote and hand-check are visible together. | minor (vis-21) |
| `tests/smoke.mjs` shell landmarks counts every `<header>` | Still true (`smoke.mjs:239`, selector `body > #root header, header.shell__header`). | nit (vis-31) |
| Reject match moves Larchmont into no-contract (9 payees, £24,130,000) | Reads sensibly: toast "Match rejected. Larchmont Grounds Maintenance is now unmatched.", tab intro becomes "9 payees, £24,130,000", the "Awaiting your review" figure disappears, Matched stays £129,359,000 and the coverage bar still adds up to £153.5m. Overview headline stays £6.1m. | no finding |
| Overview exact-value tooltip overlaps the shell header band | Real and worse: it also covers the sample banner and the home rail icon, identically at 1440, 1366 and 1024 wide. | major (vis-02) |
| Chromium only | Acknowledged, not testable here. | n/a |

## 4. Findings (most important first)

Each has an id, owning area, where, evidence, expected, fix. The structured result carries the same list.

### Major

**vis-01 (shared, major) Rail Menu is clipped and unreachable on short windows (200% zoom of 1440x900).**
Where: `.shell__rail` / `.shell__body` in `src/shell/shell.css`; viewport 720x450 (200% of 1440x900), also 768x432 (200% of 1536x864) and any desktop-width window under about 480px tall.
Evidence: `.shell__rail-menu` rect top 438, bottom 482 in a 450px viewport; rail `scrollHeight` 409 vs `clientHeight` 377; `overflow-y: visible` on the rail and `overflow: hidden` on `.shell__body`, so the hamburger is simply cut off (crop `.scratch/vis/crops/rail-720x450.png`). The Menu holds Why this matters (Evidence), How this is calculated, About this data, Demo guide and Give feedback. 1366x768 at 150% (910x512) still fits (menu bottom 496).
Expected: every control reachable at 200% zoom (WCAG 1.4.4, 1.4.10).
Fix: `.shell__rail { overflow-y: auto; min-height: 0 }` and let `.shell__rail-foot` follow the list when space is short, or switch to the bottom bar when `(max-height: 520px)`.

**vis-02 (shared, major) The headline exact-value tooltip covers the sample banner and the rail.**
Where: `src/charts/Tip.jsx` (`ChartTip`), Overview `#/overview`, 1440x900, 1366x768 and 1024x768.
Evidence: tooltip rect (49,47)-(332,146) at all three sizes; figure at (110,156)-(271,220); banner at y73-110; header ends y72. It sits across the header's lower edge, hides the left 250px of "Sample data. Marchbank Borough Council..." and the home rail icon (crop `.scratch/vis/crops/tip-1440.png`). Cause: placement is above the target with `top = r.top - h - 10`, guarded only by `top < 8`, and `left` clamped to 8, so it ignores the shell.
Expected: the first hover of the demo stays inside the content panel and never covers the data-labelling banner.
Fix: clamp the portal into the `#shell-main` rect (top >= main.top + 8, left >= main.left + 8) and flip below the target when above would intrude; for the hero figure prefer below.

**vis-03 (opportunities-drawer, major) At 1366x768 the headline list shows one row.**
Where: `#/opportunities`, 1366x768 (and 1024x768).
Evidence: row 1 y586-684 (98px), row 2 y685-783 is cut at the 768 bottom. The 476px above the first row is: 3-line header (eyebrow, h1, as-at, subtitle), 2-line caveat, panel title bar, chips row, search/status/sort row, totals bar, table header. Rows are 98px because reasons wrap to two lines plus a link line. At 1440x900 three rows fit.
Expected: at least two ranked rows fully visible on a 1366x768 projector.
Fix: drop the "Ranked by indicative value..." subtitle or merge it with as-at, move the caveat under the totals bar as one line (or collapse to an info icon with the caveat in a popover on the panel title), put search, status and sort on the chips row at >= 1280px, and cap the row at 72px (one-line reason with the full text in the tooltip and drawer).

**vis-04 (roadmap-evidence-overlays, major) The Evidence table hides its fourth column at 1024px.**
Where: `#/evidence`, 1024x768 (also Roadmap tables).
Evidence: `.kx-table-wrap` scrollWidth 1092 in a 867px region; the "Kontor feature it supports" column shows as a sliver ("KO", "Ca", "Ren", "Co") with no scroll cue (`.scratch/vis/shots/1024x768/dark/evidence.s0.png`). At 1440 it fits. Roadmap: status table 894 in 867, Stage 1 vs Stage 2 table 974 in 775.
Expected: the case-to-feature mapping, the point of the page, readable at 1024.
Fix: raise the `ResponsiveTable` card breakpoint from 700px to about 1100px, or narrow the Case and When columns (240px and 200px today) and let What happened wrap.

**vis-05 (shared, major) "Show table" on Cap vs spend lets the whole shell pan sideways.**
Where: `#/spend`, "Show table" twin, 1024x768 and 390x844 (`src/charts/charts.css:113`, `.kviz-tablewrap`; same flaw as the reported `.kx-table-wrap`).
Evidence: `documentElement.scrollWidth - clientWidth` = 138px at 1024 and 686px at 390 (0 for the other twins on Opportunities, Renewals, Contract detail). The offenders are the `.sr-only` spans of the clause and payments links (`position:absolute`, right edge 1161 and 1244) escaping the scroll wrapper. `window.scrollTo(300,0)` shifts header, rail and banner left (`.scratch/vis/crops/spend-twin-scrolled.png`). Violates the "no horizontal page scroll" criterion (R8).
Fix: `.kviz-tablewrap, .kx-table-wrap { position: relative }` (one line, fixes both).

### Minor

**vis-06 (shared, minor) Light mode shows two cog-like icons side by side.** `ThemeToggle` renders `fa-solid fa-sun` at 14px in a 32px circle; the rays fuse into a serrated disc that reads as a gear next to the Settings `fa-gear` (`crops/hdr-light2.png`). Fix: `fa-regular fa-sun` (outlined) or the half-circle glyph, or show the moon in both states with `aria-pressed`.

**vis-07 (shared, minor) Double focus ring on a keyboard-focused opportunity row.** Dark and light (`crops/ring-dark.png`, `ring-light.png`): a rounded 2px ring around the whole row plus a square 2px ring around the title text. Fix: `.kviz-row__link:focus-visible { outline: none }` and keep the row ring.

**vis-08 (opportunities-drawer, minor) The two-line clamp cuts the qualifier in the second demo story.** Row 2 (ICT, C-007) reads "...£780,000 of this was paid after the..." and the point (after the contract ended) is lost; row 5 ends "...if volumes stayed...". Same at 1440 and 1920. Fix: three lines for the first ten rows, or move the qualifier to the basis column ("£780,000 after the end date").

**vis-09 (opportunities-drawer, minor) The demo-critical link is 12px.** "View clause, page 23" is 134x16px at 12px/500 and "See calculation" is 99x16 (`.kviz-textlink`), the one thing the presenter must click on a projector. Fix: 13-14px with 24px minimum hit height via padding.

**vis-10 (opportunities-drawer, minor) The caveat runs 1,250px wide.** Two lines of about 160 characters each at 1440. Overview and Evidence constrain their text to about 72ch. Fix: `max-width: 72ch` (3 lines), which also pairs with the vertical-budget fix in vis-03.

**vis-11 (shared, minor) Section titles have no consistent scale and the common one is too quiet.** Panel titles are 14px/600 Inter (Ranked opportunities, Renewals coming up, Contract register, Derived, Spend against each contract cap), only 1px over the 13px body, so dense screens read flat; Roadmap and Evidence panel titles are 18px/600 Inter Display, Method h2 is 24px/600, sub-sections 16px. Fix: one panel-title recipe (16px/600) in the kit `Panel`, used by all views.

**vis-12 (shared, minor) Page headers are not consistent.** h1 top offset in `#shell-main`: Overview, Opportunities, Renewals, Spend, Contracts 46px (eyebrow "MARCHBANK BOROUGH COUNCIL"); Method and Roadmap 24px (no eyebrow); Contract detail 78px (breadcrumb); Evidence has eyebrow "EVIDENCE". The title jumps 22px moving Contracts to Roadmap. Fix: give Method and Roadmap an eyebrow (council name or "Reference") through `PageHeader`.

**vis-13 (shared, nit) Headline bar order and card order differ.** Bar: red, purple, amber, blue (`FLAG_ORDER`); cards: red, amber, blue, purple (`FLAG_CARD_ORDER`, set by R17). The purple segment is second in the bar and last in the cards; the coloured icon chips make the mapping legible, but the bar is directly above the cards. Fix: thin gaps and a value label on every segment wide enough, or tooltip-linked highlight on card hover.

**vis-14 (overview-renewals, minor) The radar strip is unexplained.** Nine diamonds with only "Now / 3 months / 6 months / 12 months" under them; nothing says each marker is a notice deadline, and the stats row leaves its right 40% empty (stats end x650 of 940). Fix: caption "Each marker is a notice deadline" and fill the width with the four band stats or a shorter panel.

**vis-15 (overview-renewals, minor) Redundant copy under the headline.** "Indicative figures. As at 6 October 2026." then "Indicative. An opportunity to investigate, not a saving. Test it against the contract before you act. How this is calculated": "indicative" three times and "opportunity to investigate" repeated directly under an h1 that already says it. Fix: one line, "As at 6 October 2026. Indicative figures to test against each clause, not savings. How this is calculated."

**vis-16 (overview-renewals, minor) Phone radar: the Auto-renews pill squeezes the supplier name to 7px.** `#/renewals` at 390px, rows C-003 and C-017: supplier text box 7px wide next to the pill (x68-167), overflow hidden, so "Quillon Waste Services Ltd" shows as a clipped "C" (`crops/ph-ren-lane2.png`). Fix: let the pill wrap to its own line in the `.rn .kviz-rl__auto` restyle.

**vis-17 (shared, minor) Phone sample banner is 93px on a touch device with a stranded last line.** 390px, `pointer: coarse`: banner 93px vs 67px with a mouse; the About link's `padding-block: 13px` (`app.css:88`) does grow the line box because a `button` is inline-block, leaving a 38px gap before "this demo. About this data". 11% of the screen, on every route. Fix: use a `::after { inset: -12px }` hit area instead of padding, and shorten the phone copy to two lines.

**vis-18 (spend, minor) Phone tab strip cuts the third tab.** Tabs end at x485 in a 390 viewport: "No contrac" with no fade or arrow. Fix: shorter labels ("Cap vs spend", "Matches", "No contract") so three fit, keep the long forms in `aria-label`.

**vis-19 (spend, minor) Phone matches: Reject match is off-screen.** 390px, the Larchmont row: Confirm match x231-352, Reject match x360-470, region right edge 365, so Reject shows as a 5px sliver; the table is 994px wide in a 340px region. At 1024 Payments and Total are hidden the same way. Fix: stack the two buttons under the suggestion on phones and use a card list below 700px.

**vis-20 (contracts, minor) Phone register shows two columns.** 390px: table 1189px in a 340px region; only id and title are visible and the supplier is cut mid-word ("Ke: Ser"), no cue that there is more. Fix: card list under 700px (title, supplier, end date, annual value, flag count).

**vis-21 (source-method, minor) The viewer opens scrolled past its own title.** On arrival `#shell-main` scrollTop is 259 at 1440x900 and 325 at 1366x768: the breadcrumb, h1 "Clause 14.3" and subtitle "page 23 of 70" are off-screen (h1 y -71 to -35), the paper's running header is cut under the pinned toolbar, and at 1366x768 the panel's question heading is off-screen. The cited clause, quote, "23 of 70" and Cited clause chip are visible, so the moment works; the context line is lost. On phone the answer panel sits above the paper, so the arrival view shows the clause without the answer. Fix: make the paper pane its own scroll container and centre the mark inside it, keeping the page header in view.

**vis-22 (roadmap-evidence-overlays, minor) Settings: the destructive Reset sits below the fold at 1366x768.** Reset demo changes spans y768-804 in a 768px window; the drawer scrolls inside itself. Fix: move Reset to a sticky footer.

**vis-23 (roadmap-evidence-overlays, minor) Settings cannot be opened on a phone.** Gear, Share and Notifications are hidden under 700px and the Menu popover has no Settings item. Fix: add Settings to `MenuPopover` when `max-width: 699px`.

**vis-24 (shared, minor) Light-mode cards are defined only by a 1.2:1 hairline.** `--kx-card-border` light = (230,230,235) on a white card on a white panel; the four Overview cards are links and have no other boundary. Reads fine on a laptop, washes out on a projector. Fix: `--kx-card-bg: var(--bg-1)` (the table-header surface, 249,250,251) and `--border-2` for light cards.

**vis-25 (shared, minor) Table row headers paint grey in light mode.** `.kx-table th` (`kit.css:83`) sets `background: var(--bg-1)` and wins over `tbody th`; on Method the first column ("Last 12 months", "Earlier 12 months") is (249,250,251) next to white cells. Fix: `.kx-table tbody th { background: transparent }` in the kit, then remove the local patches in Spend and Contracts css.

**vis-26 (shared, minor) Source viewer from the Method page highlights Opportunities in the rail.** `#/source/...?from=method`: rail current is Opportunities while the button reads "Back to method page". Fix: in `routes.js`, map `from=method` and `from=evidence` to no highlight.

**vis-27 (opportunities-drawer, minor) At 200% zoom the flag drawer's sticky footer takes most of the window.** 720x450: the scroll area is 257px of 450; 512x384: 143px of 384, because Review status label, select, hint and the primary button are all pinned. Fix: under `max-height: 560px` put the select and button on one row without the label and hint, or unpin the footer.

**vis-28 (shared, minor) Tooltip portal fails axe `region`.** With the headline tooltip open axe reports `region` x4 (portal into `<body>`, outside every landmark). Fix: portal into `#shell-main` or add `role="region"` with a name.

### Nit

**vis-29 (roadmap-evidence-overlays, nit) Demo guide subtitle says "in dark mode" while the app is in light mode.** "Four steps, about five minutes, in dark mode" in the light-theme drawer. Fix: "Four steps, about five minutes. Best shown in dark mode."

**vis-30 (shared, nit) One-word last lines.** Method ("runs.", "date.", "check.", "headline.", "anywhere."), Roadmap ("it."), Evidence ("act."), Opportunities ("paying."). Fix: `text-wrap: pretty` on paragraphs and list text.

**vis-31 (build-docs, nit) Leftovers.** `.stub-overlay*` dead css at `app.css:118-126`; kit `:indeterminate + .kx-box` rule still unscoped (`kit.css:245`, worked around in `overlays.css`); smoke "shell landmarks" still counts every `header` (`tests/smoke.mjs:239`).

## 5. What is good (so nobody undoes it)

- Focal point on the Overview: the 64px Display hero figure carrying the sentence, then the stacked bar, four equal cards, the exact sum line. The sum line at 1366x768 ends at y591 (visible); at 1024x768 it ends y801 (just below the fold, cards visible, as accepted).
- Cap vs spend bullets (value, cap tick, hatch beyond the cap, "At least" note) and the C-011 year bars with the over-cap hatch are clear in both themes and colour is never the only cue.
- Source viewer: paper surface with Geist Mono clause numbers, "Cited clause" chip plus 2px outline plus tint, readable in dark and light.
- Contract C-005 detail: flags first, five key figures, nine question groups with confidence pills, sticky Derived panel, cumulative line with "Cap crossed 8 Apr 2025".
- Light mode status pills (red, amber, blue, green) are all legible; chart colours switch to darker ramps.

## 6. Re-run

```
node tests/review/vis-visual-checks.mjs      # exits 1 until vis-01..vis-10 are fixed
```
Scratch scripts: `.scratch/vis/capture.mjs <WxH> <dark|light> [filter] [--tall]`, `z200.mjs`, `kb.mjs`, `long.mjs`, `tip.mjs`, `m1.mjs`, `orphans.mjs`, `regions.mjs`.
