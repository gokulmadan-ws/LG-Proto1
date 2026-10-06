# Foundation status (read this before building a view)

Written by the foundation integrator (INT) after merging A1 (infra, shell, router, composites), A2 (data, engine, copy, estate) and A3 (UI kit, charts). Everything below was run, not just read: `npm test` is green and `docs/ui-api.md` plus the snippets in section 3 compile and run in the real shell.

## 1. What is ready

| Area | State |
|---|---|
| Build | `npm run build` (strict) compiles `src/main.jsx` to `dist/app.js` 966 KB and `dist/app.css` 78 KB. `npm run standalone` writes `dist/kontor-prototype.html` (5.5 MB, runs from `file://` with 1 request). |
| CSS | Order in `src/main.jsx`: `shell.css`, `ui/kit.css`, `charts/charts.css`, `styles/app.css`, then each view's own css. `shell.css` is the only file that sets the `html, body` background (one rule plus the light override). The blob texture is referenced once, as a file in `assets/`. No `http(s)` URL in any built css. `dist/ds/styles.css` and `dist/ds/colors_and_type.css` are the offline Springboard CSS. `design-system/` has zero diff. |
| Estate | `useEstate()` gives the engine output plus lookups and persisted state. Golden numbers reproduce (headline £6,145,238, 15 contracts, 19 ranked flags). |
| Shell | Springboard App Shell port, dark by default, light on toggle (persisted in `kontor-theme`, survives blocked storage). Sample banner, Sample badge, header handlers (R5 toasts, Share copies the link), rail Menu, bottom tab bar under 700px. |
| Router | Hash routes, scroll reset, h1 focus, titles, `?flag=` overlay, NotFound. |
| UI kit and charts | `src/ui`, `src/charts`, API in `docs/ui-api.md`. |
| Overlays | `ToastHost` and `ConfirmHost` are now the kit's. About, Feedback, Settings, Demo guide, Menu and the FlagDrawer are still A1 stubs for V7 and V2. |
| Views | All twelve view files are still stubs (valid, one h1, axe clean). |

Not in the foundation: any real view, any real overlay, the Source viewer, the Method page.

## 2. Start a view in five minutes

```jsx
// src/dev/<id>.jsx  (src/dev is git-ignored)
import '../shell/shell.css'; import '../ui/kit.css'; import '../charts/charts.css'; import '../styles/app.css';
import './your-view.css';                                   // your own css last
import { createRoot } from 'react-dom/client';
import { AppFrame } from '../shell/AppFrame.jsx';
import { Overlays } from '../components/Overlays.jsx';      // optional: About, Menu, FlagDrawer ... (stubs until V7 and V2 ship)
import Opportunities from '../views/Opportunities.jsx';
createRoot(document.getElementById('root')).render(
  <AppFrame rail="opportunities" title="Opportunities" overlays={<Overlays />}><Opportunities /></AppFrame>);
```
```
node scripts/build.mjs --entry src/dev/<id>.jsx --outdir .scratch/<id>
node tests/shot.mjs --dist .scratch/<id> --hash '#/opportunities' --theme dark --w 1440 --h 900 --out .scratch/<id>/x.png
```
`AppFrame` mounts EstateProvider, UIProvider, the shell, the banner, toasts and the confirm dialog. Use `route.name` aware code only through `useRoute()`.

Reference fixtures that show everything working together: `tests/fixtures/int-probe.jsx` (headline, cards, sum line), `tests/fixtures/int-snippets.jsx` (section 3), `tests/fixtures/ui-gallery.jsx` (every kit and chart component, `#/ui`, `#/charts`, `#/all`).

## 3. The six things you will use most (every snippet below runs in `tests/fixtures/int-snippets.jsx`)

### 3.1 `useEstate`

```jsx
import { useEstate, paymentsFor } from '../lib/estate.js';
const { estate, state, actions } = useEstate();            // throws outside <EstateProvider>; AppFrame always provides it
estate.totals                // { totalGBP, contractCount, byType, countByType, excludedGBP, excludedCount }  counted flags only
estate.ranked                // ALL ranked flags in the engine's order, reviewed ones included (filter by status yourself)
estate.flagsById[id]         // use this for the drawer, never the filtered list
estate.contractsById[cid], estate.derived[cid], estate.extractionsById[xid], estate.capRows, estate.coverage, estate.matchList
estate.radar                 // { boundaries, groups: { passed, ended, m3, m6, m12, later, history }, attention[] }
paymentsFor(estate, cid)     // { all, inTerm, afterEnd, totalGBP, inTermGBP, afterEndGBP }  totalGBP = derived[cid].spend.toDate to the penny
actions.setTriage(flagId, 'under_review' | 'explained' | 'not_an_issue' | null)
actions.setDecision(rawName, 'confirm' | 'reject' | null)
actions.setAssumption('renewalRate' | 'nearCapThreshold', value | null)
actions.setHandcheck(extractionId, 'correct' | 'incorrect' | null)
actions.addFeedback({ answer: 'yes' | 'maybe' | 'no', comment })      // -> { ok: true } | { ok: false, reason }
actions.resetAll()                                         // clears the five kontor-* keys, keeps the theme
```
Wording comes from `src/lib/copy.js` (`reasonFor`, `actionLine`, `needsAttentionText`, `flagTypeLabel`, `sumLine`, `COPY`...), formats from `src/lib/format.js`. Never re-derive a number or a sentence in a view. Full table of what to call for what: `docs/handoff/A2.md`. Source viewer page schema: `docs/handoff/A2.md`.

### 3.2 `useRoute`, `setQuery`, `hrefFor`

```jsx
import { useRoute, setQuery, navigate, hrefFor, usePageTitle } from '../lib/router.js';
const { name, seg, query, path } = useRoute();       // '#/spend/matches?x=1' -> name 'spend', seg ['matches'], query.get('x') '1'
const type = query.get('type');                      // filters live in the query so links, Back and Share work
setQuery({ type: 'overCap' });                       // merge into the current route, replace history; null removes a key
setQuery({ flag: null });                            // close the flag drawer (any route can open it: setQuery({ flag: id }))
navigate('#/contracts/C-005');                       // push; { replace: true } to replace
hrefFor('opportunities', { query: { type: 'overCap' } })        // '#/opportunities?type=overCap'
hrefFor('source', { seg: [contractId, extractionId], query: { from: 'renewals' } })
usePageTitle(contract.title);                        // override the default `<Page> | Kontor financial layer`
```
Query-only changes never scroll or move focus. A path change scrolls `#shell-main` to the top and focuses the page h1. Route component props: `Contracts`/`ContractDetail` `id`, `Source` `contractId extractionId from`, `Spend` `tab` (`cap | matches | no-contract`).

### 3.3 `PageHeader` and the shared composites

```jsx
import { PageHeader, ClauseLink, MethodLink, ConfidencePill } from '../components/index.js';
<div className="page">                                                   {/* 1360px, 24px gaps; 24px side padding on phones */}
  <PageHeader eyebrow="Marchbank Borough Council" title="Renewal radar" asAt
    description={<p>Contracts whose notice date falls in the next 12 months. <MethodLink section="notice" /></p>}
    actions={<Button variant="outline" leftIcon="download">Export renewals</Button>}      {/* at most one primary */}
    tabs={<RouteTabs label="Cap vs spend views" current="cap" items={[...]} />} />
  <ClauseLink contractId="C-005" extractionId="X-C-005-maximumValue" page={23} from="opportunities" context="Highways" />
  <ConfidencePill score={0.93} />                                        {/* High | Medium | Needs review, kit Pill inside */}
</div>
```
The Overview puts the headline in the title: `title={<HeadlineSentence total={hp.total} contractCount={hp.contractCount} format={fmtGBPCompact} />}`. The h1 text is then exactly `£6.1m across 15 contracts flagged as opportunities to investigate` (checked in both themes).

### 3.4 Charts: `OpportunityList`, `RadarLanes`, `BulletList`

Wrap every chart in `<Panel padded={24}><ChartFigure as="h2" ...>`. Feed charts through the adapters, never compute a rule in the view. One primary link per row; extras go in the `extra` slot.

```jsx
import { Panel } from '../ui/index.js';
import { ChartFigure, Legend, OpportunityList, FlagFilterChips, BulletList, RadarLanes, RADAR_LEGEND, BULLET_LEGEND,
  opportunityItems, opportunityCounts, capItems, capTable, radarRows, gbpFull } from '../charts/index.js';
import { evidenceFor, evidenceForField, sourceHref } from '../lib/evidenceFor.js';
import { actionLine, needsAttentionText, noticeShortText, radarFootnote } from '../lib/copy.js';

// Opportunities: ALL ranked flags, filtered by you (status, search), never re-sorted by the chart
const clauseFor = (f) => { const t = evidenceFor(f); return t ? { label: 'View clause, page ' + t.page, href: sourceHref(t, 'opportunities') } : null; };
const all = opportunityItems(estate, { clauseFor });
const shown = all.filter((i) => i.status === 'to_investigate' || i.status === 'under_review');      // the Open filter
<Panel padded={24}><ChartFigure as="h2" title="Opportunities to investigate">
  <FlagFilterChips counts={opportunityCounts(all)} value={type} onChange={(t) => setQuery({ type: t })} />
  <OpportunityList items={shown} filter={type} onOpen={(row) => setQuery({ flag: row.id })} />   {/* or getHref={(r) => '#/opportunities?flag=' + r.id} */}
</ChartFigure></Panel>

// Renewal radar: the extra slot carries the action line, notice period, confidence and the clause link
const extraFor = (row) => {
  const c = estate.contractsById[row.id], d = estate.derived[row.id], ev = evidenceForField(c.id, 'noticePeriod');
  return (<><span>{needsAttentionText(c, d) || actionLine(c, d)}</span><span>Notice period: {noticeShortText(c.notice)}</span>
    <ConfidencePill score={c.confidence.noticePeriod} />{ev && <ClauseLink contractId={c.id} extractionId={ev.extractionId} page={ev.page} from="renewals" context={c.title} />}</>);
};
<Panel padded={24}><ChartFigure as="h2" title="Renewal radar" legend={<Legend items={RADAR_LEGEND} />} footnote={radarFootnote(estate.radar.groups.later.count)}>
  <RadarLanes rows={radarRows(estate)} extraFor={extraFor} getHref={(r) => hrefFor('contracts', { seg: [r.id] })} />
</ChartFigure></Panel>

// Cap vs spend: format gbpFull gives '£8,350,000' and '£3,350,000 over'; the spend-to-payments button goes in extra
const caps = capItems(estate, { extraFor: (it, c) => <Button variant="outline" size="sm" leftIcon="list" onClick={() => openPayments(c.id)}>See payments</Button> });
<Panel padded={24}><ChartFigure as="h2" title="Cap vs spend" legend={<Legend items={BULLET_LEGEND} />} table={capTable(caps)}>
  <BulletList items={caps} format={gbpFull} limit={12} getHref={(r) => hrefFor('contracts', { seg: [r.id] })} />
</ChartFigure></Panel>
```
`format`: Overview cards, bar, coverage meter and radar strip take `fmtGBPCompact` (`£6.1m`); the cap list and coverage block take `gbpFull`; the opportunity list defaults to exact pounds. Table in section 2.1 of `docs/ui-api.md`. `adapters.js` also has `upliftRows`, `coverageProps`, `cumulativeSeries`, `yearBarsProps`.

### 3.5 `Drawer` and `Dialog` (and the flag drawer)

```jsx
import { Drawer, Dialog, ConfirmDialog } from '../ui/index.js';
// A drawer driven by the address (works on any route, survives a triage change because it reads flagsById)
const flag = query.get('flag') ? estate.flagsById[query.get('flag')] : null;
<Drawer open={!!flag} onClose={() => setQuery({ flag: null })} size="lg" title={flag ? flagTypeLabel(flag) : ''} subtitle={contract?.title}
  footer={<Button variant="outline" onClick={() => setQuery({ flag: null })}>Close panel</Button>}>
  {flag && <p>{reasonFor(flag, contract, estate.derived[contract.id])}</p>}
</Drawer>

// Destructive confirm, then a success toast
<ConfirmDialog open={open} destructive title="Reset your changes?" confirmLabel="Reset changes" onClose={() => setOpen(false)}
  description="This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device."
  onConfirm={() => { setOpen(false); actions.resetAll(); toast({ tone: 'success', title: 'Changes reset.', description: 'The demo is back to its starting numbers.' }); }} />
// or the promise version: const ok = await useUI().confirm({ title, description, confirmLabel, destructive: true });
```
Both trap focus, close on Escape and a scrim click, and return focus to the opener (verified in the real shell: Escape on a drawer opened from a chart row puts focus back on that row). They stack: Escape closes only the top layer. Titles are h2, so keep your page below an h1. Dialogs and drawers animate in, not out.

**Do not mix native `<dialog>` with these.** A native modal dialog sits in the browser top layer and covers every kit overlay regardless of z-index. The five overlay stubs and the FlagDrawer stub are native `<dialog>` today; V7 and V2 replace them with `Dialog` and `Drawer`.

### 3.6 `useToast` (and `useUI`)

```jsx
import { useToast } from '../ui/index.js';       // same stack as useUI().toast: AppFrame bridges them
import { useUI } from '../lib/ui-context.jsx';
const toast = useToast();                        // or: const ui = useUI(); ui.toast(...)
toast({ tone: 'success', title: 'Match confirmed.', description: 'The payments now count against C-009.' });   // returns an id
toast({ tone: 'error', title: 'Export failed.', description: 'Your browser blocked the download. Allow downloads for this page and try again.' });
const ui = useUI();  ui.openAbout() ui.openFeedback() ui.openSettings() ui.openDemoGuide() ui.openMenu(anchorEl)  ui.confirm({...})
```
Success copy says what happened and the consequence; errors are What + Why + How and stay until closed. Three toasts show at once, the oldest is dropped.

## 4. What the integration probe showed (guidance for V1)

`tests/fixtures/int-probe.jsx` renders PageHeader (eyebrow, headline sentence as the h1, two description lines, one outline action) and a Panel with `HeadlineBreakdown` and the sum line, in the real shell and router. Screenshots read in dark and light at 1440x900, 1366x768, 1024x768 and 390x844. Measured with the banner visible:

| Viewport | Cards and sum line end at | Visible without scrolling |
|---|---|---|
| 1440x900 | y 525 (sum line about 547) | headline, caveat, four cards, sum line, and the top of the next section |
| 1366x768 | y 525 | headline, caveat, four cards, sum line |
| 1024x768 | y 683 (cards wrap to 2 by 2) | headline, cards and sum line (about y 705) |

So the decision-12 presenter density holds as long as nothing is added between the page header and the cards. Keep the description to the two lines of the probe (as-at line, caveat plus MethodLink). The radar summary sits below the cards. At 390px the Panel keeps its width (see section 6, item 5).

## 5. Rulings on the agents' open items

- A2 judgement calls, all accepted: a confirmed supplier match counts as certain (1.0) for flag confidence; a contract-value cap breach is severity medium and labelled "Above contract value (estimate)"; the radar footnote reads "12 contracts have notice dates more than 12 months away and are not on the radar" (the engine's `later` group is defined by notice date, so the blueprint wording would be wrong). **V1 must still render a link from that footnote to `#/contracts`** (the radar acceptance criterion in `requirements.md`). R34 C-001 has no trailing full stop, as the AC reads.
- Method page (V3): keep the section ids `as-of, notice, radar, spend, matching, cap, uplift, indicative, ranking, confidence, data, limits` (`COPY.method`, `MethodLink section=`). The probe uses `indicative`.
- Source viewer (V3): highlight only the block whose `extractionIds` includes the current extraction. Page schema in `docs/handoff/A2.md`.
- FlagDrawer (V2): drive from `estate.flagsById`; use `isCounted` from `src/lib/engine.js`; the Reviewed filter needs `estate.ranked` (reviewed flags are in it).
- A1 asked A3: `kit.css` must not set body background, `.kx-app*`, the `a` colour or a global focus rule. Checked: it does none of these.
- A2 and A3 asked for `"type": "module"`: present, the Node warning is gone.
- Tests: `npm test` now runs the engine test, the smoke test and the foundation test. `npm run test:ui` (A3's 92 checks, about 2 minutes) and `npm run test:all` run everything.
- V7: the Menu popover root must stay a landmark (`<nav aria-label="Menu">`), otherwise axe `region` fails. V7 does not wire header handlers; `AppFrame` does.

## 6. Changes to contracts versus the blueprint and the three handoffs

1. **One toast stack.** `ToastHost` now renders the kit toast (`.kx-toasts`, `.kx-toast`, close button `.kx-toast__close`). The old `.toast-host` markup is gone. `AppFrame` wraps the app in `ToastBridge` so the kit's `useToast()` and `useUI().toast` are the same stack. `ui.toast` now also accepts `type`, `message`, `persist`; new `ui.clearToasts()`. Without the bridge `useToast()` is a silent no-op, so never mount a `ToastProvider` inside the app.
2. **`ui.confirm()` renders the kit `ConfirmDialog`** (`role="alertdialog"`, Cancel focused first), no longer a native `<dialog class="confirm-dialog">`.
3. **`ConfidencePill` is the kit `Pill`.** `.conf-pill` stays as a hook class with no styles.
4. **`HeadlineSentence` has no hidden child text.** The exact value is an `aria-description` on the focusable figure, so the h1 text is exactly the sentence (it used to read "... investigate Exact value £6,145,238").
5. **`Panel padded={n}` is capped at 16px under 700px wide** (CSS variable `--kx-pad`), so a `padded={24}` chart panel does not eat a phone screen.
6. **`.method-link` never wraps** (like `.clause-link`), so "How this is calculated" does not split across two lines.
7. **Test harness:** `axe()` in `tests/lib/harness.mjs` waits for enter animations to finish (axe measured contrast through a half-faded dialog and reported a false failure). Smoke selectors moved to the kit markup. `shell-gallery.jsx` imports `kit.css` and `charts.css`.
8. **New files:** `tests/foundation.mjs`, `tests/fixtures/int-probe.jsx`, `tests/fixtures/int-snippets.jsx`, `src/dev/INT.jsx` (git-ignored, imports the probe). `package.json` scripts `test`, `test:ui`, `test:all`. Kit exports `ToastContext`.

No golden number, copy string or route changed.

## 7. Known gaps and risks

- Every view, the five overlays and the FlagDrawer are stubs. Replace the whole file, keep the default export. The smoke test checks them generically (one h1, title suffix, rail, no horizontal scroll, axe in both themes), so a new real view can fail it for a real reason: fix that, do not weaken the test.
- Chromium only. Safari and Firefox are untested (`100dvh`, `color-mix`, container queries, native `<dialog>`, `aria-description`).
- Phones (under 700px): the Settings gear and Notifications are hidden to make room for the Menu button, so the Settings drawer is desktop only.
- Light mode is a judgement call: the template has no light variant. It was reviewed screen by screen in the probe and the chart gallery.
- `OpportunityList` clamps reasons to two lines, so the longest copy-deck sentences end in an ellipsis in the row (full text in the tooltip, accessible name and drawer).
- Dialogs and drawers animate in only.
- `dist/` is a build artefact: rebuild with `npm run build && npm run standalone` after the views land and before committing. `dist/kontor-prototype.html` is 5.5 MB; commit or ignore as you prefer.
- `tests/screenshots/` and `src/dev/` are git-ignored.
