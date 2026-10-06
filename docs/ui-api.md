# UI kit and chart library: API for the view agents

Owner: A3. Source: `src/ui/*` (kit), `src/charts/*` (charts). This document replaces reading the source. Every prop below exists; anything not listed is not supported. Live examples of every component, fed by the real engine: `tests/fixtures/ui-gallery.jsx` (build and screenshot commands in section 4).

## 0. Read this first

**Imports**

```jsx
import { Panel, Pill, DataTable, Dialog, Drawer, ConfirmDialog, Menu, Tooltip, Segmented, RouteTabs, Field, Check, useToast } from '../ui/index.js';
import { ChartFigure, Legend, BulletList, OpportunityList, RadarLanes, headlineProps, capItems, gbpFull } from '../charts/index.js';
```

Components are named exports of the barrels `src/ui/index.js` and `src/charts/index.js`. Neither barrel imports CSS: `src/main.jsx` loads `shell/shell.css`, `ui/kit.css`, `charts/charts.css`, `styles/app.css` in that order. A dev entry must import the four itself.

**Springboard components** (`Button`, `Input`, `Select`, `Textarea`, `Alert`, `Breadcrumb`, `Badge`, `Card`, `Accordion`, `Progress`, `Skeleton`, `Spinner`, `Tabs`, `Avatar`) are the DS globals: `const { Input, Select } = window.Springboard20DesignSystem_019e02;`. The kit re-exports `Button` and `Badge` for convenience. DS rules that bite:

- `Button` has no default `type`: pass `type="button"` inside a form. Icon-only: no children, `aria-label`, `style={{ width: 32, padding: 0 }}`. One primary per section. Destructive only inside a `ConfirmDialog`.
- Never pass `onFocus`, `onBlur`, `onMouseEnter` or `onMouseLeave` to DS `Input`, `Textarea`, `Select` or `Button` (it silently disables the focus ring or hover colour). Wrap in a div if you need them.
- DS `Select.onChange` receives the native event (`e.target.value`). DS `Tabs` and `Checkbox`, `Radio`, `Switch` are controlled-only and the last three are not keyboard accessible: use `RouteTabs`, `Segmented`, `Check`, `RadioField`, `SwitchField`.
- DS `Badge` is for **neutral counts only** (`tone="neutral"`). The other tones fail AA. Use `Pill` or the chart pills.
- DS `Tooltip` is clipped by every `Card`: use the kit `Tooltip`.
- DS `Card` clips children and its title is a div: use `Panel` when you need a heading and header actions.

**Which component for what**

| Need | Use |
|---|---|
| Neutral status (confidence, match status, review status, "Needs review", "Auto-renews", "Sample") | kit `Pill` (or `ConfidencePill` from `src/components`) |
| Flag type ("Spend over cap", "Close to cap", "Renewal decision", "Price increase above cap") | `FlagBadge` |
| Cap state ("Over cap", "Above contract value (estimate)", "Close to cap", "Within cap") | `CapStatePill` (chart pill, true amber) |
| Review (triage) status pill | `ReviewBadge` |
| Count next to a heading | DS `Badge tone="neutral"`, or `Panel count={n}` |
| Card with a heading and actions | `Panel` |
| Table of rows with sorting or a row click | `DataTable` (kit) |
| Ranked list with several links per row (opportunities, cap, radar) | chart rows (`OpportunityList`, `BulletList`, `RadarLanes`): the stretched-link pattern |
| Switch view or filter on a page | `Segmented` (or `Chip` for multi filters) |
| Tabs that are separate routes | `RouteTabs` |
| Modal, side panel, destructive confirm | `Dialog`, `Drawer`, `ConfirmDialog` |
| Action menu, rail Menu popover | `Menu` (or `MenuButton`) |
| Tooltip | `Tooltip` (kit). Never put essential information in one |
| Toast | `useToast()` (or A1's `useUI().toast`) |
| Checkbox, radio, switch, labelled input | `Check`, `RadioField` / `RadioGroup`, `SwitchField`, `Field` |
| Pager, payments drill-down | `Pager`, `PaymentsTable` |

**Conventions the kit assumes**

- Sentence case, "you", no emoji, no exclamation marks, buttons are [Verb]+[Object]. Icons are Font Awesome solid names **without** the `fa-` prefix (`icon="circle-check"`).
- Colours are tokens only. Never write a hex value. Status colour is never the only cue: every pill has words, usually a glyph too.
- One global focus rule lives in `styles/app.css` (2px accent outline, offset 2px; `!important` only for elements with an inline `outline: none`, such as the DS Button). Do not add your own `:focus-visible` outline to a control; if you need the ring inset (inside an `overflow: auto` box) set `outline-offset: -2px` only. A class rule of yours that says `outline: none` or `all: unset` removes the ring: restore it.
- shell.css colours every `<a>` on hover. A link class you write needs its own `:hover` colour (`.my-link:hover { color: ... }`) or it turns blue.
- Heading levels: page title h1, section h2. `Panel` titles are h2 by default (`as="h3"` inside a section), `ChartFigure` titles are h3 by default (**pass `as="h2"`** when it is the first heading under the h1), `EmptyState` titles are h3 by default (`as`), Dialog and Drawer titles are h2. axe `heading-order` fails if you skip a level.
- Nothing here reads the clock. The as-of date is `2026-10-06` (`AS_OF`).

---

## 1. UI kit (`src/ui`)

### 1.1 Layout helpers (CSS classes in `kit.css`)

| Class | Use |
|---|---|
| `.kx-card`, `.kx-card__head`, `.kx-card__body`, `.kx-card__foot` | card shell (what `Panel` renders): white in light, `--bg-1` in dark, hairline border, radius 8, `overflow: hidden` |
| `.kx-grid` + `.kx-grid--2`, `--3`, `--4`, `--2-1` | 16px grid. `--4` is 2 columns under 1100px and 1 under 640px; `--2-1` is one column under 1100px |
| `.kx-eyebrow`, `.kx-caption`, `.kx-section-title` (16/600), `.kx-card-title` (14/600), `.kx-kpi` (28/600 Inter Display), `.kx-num` (tabular figures) | type recipes. Page title is `.ds-h2`, section title `.ds-h4`, table header `.ds-caption-caps` |
| `.kx-mono` | Geist Mono 12px, `--fg-2`: clause refs, ids, transaction refs |
| `.kx-sr-only` | visually hidden text (`.sr-only` from app.css is the same) |
| `.kx-hit` | adds a 44px hit area around a small control (`::after`, inset -8px) |
| `--kx-card-bg`, `--kx-card-border`, `--kx-pop-bg`, `--kx-pop-border`, `--kx-row-hover`, `--kx-scrim`, `--kx-shadow-pop`, `--kx-control-border` | surface tokens |
| `--kx-info-text`, `--kx-success-text`, `--kx-warning-text`, `--kx-danger-text` | AA-safe **text** colours for status words (`--accent`, `--danger`, `--success`, `--warning` fail 4.5:1 as text) |

### 1.2 `Panel`

Card with header row (title, count, actions), body and optional footer.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | node | | omit for a bare padded card |
| `description` | node | | muted line under the title |
| `count` | number or string | | neutral DS Badge after the title |
| `actions` | node | | right side of the header. At most one primary Button |
| `footer` | node | | footer strip |
| `padded` | `true`, `false` or number | `true` | `false` removes body padding (tables); a number sets px (`padded={24}` around a `ChartFigure`) |
| `as` | `'h2'`, `'h3'`, `'h4'` | `'h2'` | heading element |
| `id` | string | | id of the heading; the section gets `aria-labelledby` |

```jsx
<Panel title="Contracts" count={24} as="h2" padded={false} actions={<Button variant="outline" size="sm" leftIcon="download">Export contracts</Button>}>
  <DataTable ... />
</Panel>
<Panel padded={24}><ChartFigure as="h2" title="Cap vs spend">...</ChartFigure></Panel>   {/* the chart pattern */}
```

### 1.3 `Pill`

Text plus optional glyph on a tone surface. All tone pairs pass AA in both themes (lowest 7.35:1 soft, 4.58:1 solid; `node tests/ui-checks.mjs contrast`).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `'neutral' 'info' 'success' 'warning' 'danger'` | `'neutral'` | |
| `icon` | FA name | | `circle-check`, `triangle-exclamation`, ... |
| `dot` | boolean | | 6px dot when there is no glyph |
| `solid` | boolean | | filled, white text |
| `size` | `'sm'` `'md'` | `'md'` | 18px or 22px tall |
| `children` | node | | the words (never empty) |

```jsx
<Pill tone="neutral" icon="circle-check">High confidence</Pill>
<Pill tone="neutral" dot>Auto-renews</Pill>
<Pill tone="info" icon="circle-info">Suggested</Pill>
```
Gotcha: tones `warning` and `danger` here are the DS tone surfaces (brown-ish amber in dark). For flag types and cap states use `FlagBadge` / `CapStatePill` so the amber matches the charts.

### 1.4 `Chip`, `Tag`, `Kbd`

- `Chip({ pressed, onClick, icon, count, children })`: filter toggle button, `aria-pressed`, 32px with a 44px hit area.
- `Tag({ onRemove, removeLabel, children })`: static tag; with `onRemove` it renders an x button whose accessible name is `removeLabel` ("Remove filter: waste"). Always pass `removeLabel`.
- `Kbd({ children })`: `<Kbd>Esc</Kbd>`.

```jsx
<Chip pressed={type === 'overCap'} onClick={() => setType('overCap')} icon="triangle-exclamation" count={3}>Spend over cap</Chip>
```
For the Opportunities type filter use `FlagFilterChips` (charts) so glyphs and labels match the flag types.

### 1.5 `StatTile`

Small KPI. Static `<div>`; with `onClick` a toggle `<button aria-pressed>`; with `href` a link.

| Prop | Notes |
|---|---|
| `label` | what it is |
| `value` | the figure (tabular figures, Inter Display) |
| `icon` | FA name in a 28px chip |
| `foot` | supporting line or pills |
| `onClick`, `pressed` | drill-down button |
| `href` | link tile |

The four Overview basis cards are `HeadlineTile`, not four StatTiles.

### 1.6 `EmptyState`

`EmptyState({ icon = 'inbox', title, children, action, as = 'h3' })`. Say what is empty, why, what to do. One `action` Button (outline).
```jsx
<EmptyState icon="file-circle-question" title="No opportunities match these filters." as="h2" action={<Button variant="outline" onClick={clear}>Clear filters</Button>}>Clear the filters to see all 19.</EmptyState>
```

### 1.7 `Segmented`

`role="radiogroup"` with a roving tab stop; Arrow, Home, End move and select; controlled.

| Prop | Type | Notes |
|---|---|---|
| `options` | `{ value, label, icon?, count?, disabled? }[]` | |
| `value` | string | selected value |
| `onChange` | `(value) => void` | |
| `label` | string | accessible name of the group. **Required** |
| `size` | `'md'` `'lg'` | 32 or 36px tall |

```jsx
<Segmented label="Show flags" value={status} onChange={setStatus} options={[{ value: 'open', label: 'Open', count: 17 }, { value: 'reviewed', label: 'Reviewed', count: 2 }, { value: 'all', label: 'All', count: 19 }]} />
```

### 1.8 `RouteTabs`

Tabs that are routes: a `<nav>` of real links, current one `aria-current="page"`, underline style like the DS Tabs.

| Prop | Notes |
|---|---|
| `label` | accessible name of the nav |
| `items` | `{ id, label, href, icon?, count? }[]` (`href` is a hash route: `'#/spend/matches'`) |
| `current` | `id` of the current item |

```jsx
<PageHeader title="Cap vs spend" tabs={<RouteTabs label="Cap vs spend views" current="matches" items={[
  { id: 'cap', label: 'Cap vs spend', href: '#/spend' }, { id: 'matches', label: 'Supplier matches', href: '#/spend/matches', count: 9 },
  { id: 'none', label: 'No contract on the register', href: '#/spend/no-contract' }]} />} />
```

### 1.9 `DataTable`

Application table: sticky header (inside a wrapper with `maxHeight`), 44px rows (`dense` 32px, desktop only), right-aligned tabular numbers, sortable headers, clickable rows, footer rows. The scroll wrapper becomes a keyboard-focusable named region **only when it actually scrolls**.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `columns` | `{ key, label, num?, render?(row, i), sortable?, muted?, nowrap?, rowHeader?, width?, minWidth?, hideLabel? }[]` | | `num` right-aligns; `rowHeader` makes the cells `<th scope="row">`; `hideLabel` keeps the header text for screen readers only; give text columns a `minWidth` (px, e.g. 200) so they are not squeezed to a few characters when the table scrolls sideways on a phone |
| `rows` | object[] | | |
| `rowKey` | string or `(row) => string` | `'id'` | |
| `caption` | node | | accessible name of the table. **Required** |
| `dense` | boolean | | |
| `sort`, `onSort` | `{ key, dir: 'asc'\|'desc' }`, `(key) => void` | | sorting is yours: the table only shows `aria-sort` and calls `onSort` for `sortable` columns |
| `onRowClick` | `(row, event) => void` | | makes rows focusable; Enter or Space on the **row itself** and a click on a non-control part of the row call it |
| `selectedKey` | string | | `aria-selected` row |
| `rowAriaLabel` | `(row) => string` | | accessible name of a clickable row ("Open C-005, Highways reactive maintenance") |
| `maxHeight` | px number | | body scrolls under a sticky header |
| `footer` | `{ key?, label?, values: { [colKey]: node } }[]` | | subtotal rows. `label` spans the columns before the first column named in `values` |
| `empty` | node | | shown in a full-width row when `rows` is empty |

```jsx
<DataTable caption="Payments for C-005" columns={[
  { key: 'date', label: 'Date', nowrap: true, render: (r) => fmtDate(r.date) },
  { key: 'amount', label: 'Amount', num: true, render: (r) => fmtGBPPence(r.amount) }]} rows={rows}
  footer={[{ label: 'Subtotal, 52 payments', values: { amount: '£8,350,000.00' } }]} />
```
Gotchas: links, buttons, selects and inputs inside a clickable row keep their own behaviour (Enter on an inner link does **not** reach `onRowClick`, a click on it neither). Use clickable rows for Contracts and Supplier matches only. For lists with several actions per row use the chart row pattern. Do not nest interactive elements inside an interactive element yourself.

### 1.10 `Pager`

`Pager({ page, pageSize, total, onPage, unit = 'row', units, label = 'Pagination', alwaysShow = false })`. 1-based pages. Renders "Showing 21 to 40 of 1,264 payments", Previous, page numbers (windowed), Next. Returns `null` when everything fits on one page. Make `label` unique if two pagers are on screen (axe `landmark-unique`).

### 1.11 `PaymentsTable`

The payments drill-down (R38): contributing payments with a subtotal to the penny, "Paid after the end date" in its own table with its own subtotal, and the total.

| Prop | Default | Notes |
|---|---|---|
| `payments` | | `paymentsFor(estate, contractId)` from `src/lib/estate.js` (`{ inTerm, afterEnd, totalGBP, inTermGBP, afterEndGBP }`) |
| `pageSize` | `20` | `0` shows all in a scroll area (use with `maxHeight`) |
| `maxHeight` | | px, only with `pageSize={0}` |
| `contractLabel` | `'this contract'` | used in captions |
| `pagerLabel` | `'Payments pages'` | unique pager name |

```jsx
<Drawer open={open} onClose={close} size="lg" title="Payments counted against this contract" subtitle={contract.title}>
  <PaymentsTable payments={paymentsFor(estate, contract.id)} pageSize={10} contractLabel={contract.title} />
</Drawer>
```
The total equals `estate.derived[id].spend.toDate` to the penny. For annual caps put `YearBars` above it.

### 1.12 `Dialog` and `ConfirmDialog`

Portal to `document.body`, `role="dialog"` (alertdialog for Confirm) `aria-modal`, title is an h2 and names the dialog. Focus moves in (first focusable, or `[data-autofocus]`), Tab is trapped, Escape and a scrim click close, focus returns to the element that opened it (or `<main>` if that is gone). Dialogs stack: Escape closes only the top one.

`Dialog` props: `open`, `onClose(reason: 'escape'|'scrim'|'close')`, `title`, `description` (muted paragraph, also the accessible description), `children`, `footer`, `size` (`'sm'` 420, `'md'` 480, `'wide'` 720), `dismissOnScrim` (true), `blur`, `role`, `closeLabel` ('Close dialog'), `className`. Footer: Cancel as `variant="outline"` plus **at most one** filled button.

`ConfirmDialog` props: `open`, `onClose` (cancel: button, x, Escape, scrim), `onConfirm`, `title` (a question), `description` (or children), `confirmLabel` (default 'Confirm': pass [Verb]+[Object]), `cancelLabel`, `destructive`. **Cancel takes focus first**; `destructive` makes the confirm button the DS destructive variant.

```jsx
<ConfirmDialog open={open} destructive title="Reset your changes?" confirmLabel="Reset changes" onClose={() => setOpen(false)}
  onConfirm={() => { setOpen(false); resetAll(); toast({ tone: 'success', title: 'Changes reset.', description: 'The demo is back to its starting numbers.' }); }}
  description="This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device." />
```
Destructive pattern: ConfirmDialog, then a success toast. A1's `useUI().confirm()` (native dialog) is the promise version of the same thing; both are fine.

### 1.13 `Drawer`

Right-hand modal drawer, 200ms slide-in, same focus trap, Escape, scrim click and focus return as `Dialog`.

Props: `open`, `onClose(reason)`, `title` (h2), `subtitle`, `children` (scrolls), `footer` (sticky), `size` (`'md'` 520px, `'lg'` 720px; full width under 560px), `closeLabel` ('Close panel'), `className`. Open one from a button; do not render it conditionally on data that can vanish (drive it from `estate.flagsById[id]`, not from the filtered list). It sits above the shell, below dialogs and toasts.

### 1.14 `Popover`, `Menu`, `MenuButton`

`Popover({ open, anchor, onClose(reason: 'escape'|'outside'), placement = 'bottom-start', offset = 6, role, label, restoreFocus = true, innerRef, className, style, children })`: portal, `position: fixed`, flips and clamps to the viewport, repositions on scroll and resize. `anchor` is an element or a ref. Closes on Escape (focus back to the anchor) and a press outside it and the anchor. Placements: `bottom|top|right|left` + `-start|-end|-center`.

`Menu({ open, anchor, onClose(reason: 'escape'|'outside'|'select'|'tab'), items, label, placement, onSelect })`: `role="menu"`. Items:

```
{ id, label, icon?, hint?, danger?, disabled?, onSelect?: () => void, href?: string, external?: boolean }   an item (button, or link when href)
{ separator: true }
{ heading: 'Table' }
```
Keys: first item focused on open, Up and Down wrap, Home and End, a letter jumps to the next item starting with it, Enter and Space activate, Tab and Escape close. Choosing an item closes the menu, returns focus to the anchor, then calls `item.onSelect` (so a dialog opened by an item returns focus to the menu button).

The rail Menu (A1 passes the button element: `onMenu(el)`):
```jsx
<Menu open={!!anchorEl} anchor={anchorEl} onClose={closeMenu} label="Kontor menu" placement="right-end" items={[
  { id: 'why', label: 'Why this matters', icon: 'lightbulb', href: '#/evidence' },
  { id: 'how', label: 'How this is calculated', icon: 'book-open', href: '#/method' },
  { id: 'about', label: 'About this data', icon: 'circle-info', onSelect: openAbout }, ...]} />
```
`MenuButton({ label, items, children?, icon = 'ellipsis', variant = 'outline', size = 'sm', placement = 'bottom-end', onSelect })`: button plus menu in one; owns open state; no `children` = icon-only (then `label` is its accessible name); ArrowDown opens it. `aria-haspopup` and `aria-expanded` are set.

### 1.15 `Tooltip`

`Tooltip({ label, children, side = 'top', delay = 120, disabled, className, style })`: ONE trigger child. Portal, never clipped, flips, wraps at 280px. Shows on hover (after `delay`) and on **keyboard** focus (not mouse-click focus), hides on Escape (focus stays), hoverable (the pointer may move onto it), `aria-describedby` is set on the trigger while visible. It does not close when the page scrolls to reveal a focused trigger.
```jsx
<Tooltip label="Opens the clause the flag came from"><Button variant="outline" size="sm" leftIcon="file-lines">View clause</Button></Tooltip>
```
Never the only place for information. Icon-only triggers still need `aria-label`.

### 1.16 Form controls

All are native inputs with the DS look: Tab reaches them, the label text is clickable, rows are 44px tall.

| Component | Props |
|---|---|
| `Check` | `checked`, `onChange(checked: boolean)`, `label`, `description?`, `indeterminate?`, `disabled?`, `hideLabel?` (screen-reader-only label for table rows), `name?` |
| `RadioField` | `checked`, `onChange(value)`, `value`, `name`, `label`, `description?`, `disabled?` |
| `RadioGroup` | `legend`, `options: { value, label, description?, disabled? }[]`, `value`, `onChange(value)`, `name?`, `inline?`, `hideLegend?`: a fieldset with a legend; one tab stop, arrow keys |
| `SwitchField` | `checked`, `onChange(checked)`, `label`, `description?`, `disabled?`: `role="switch"`, visible OFF state in light |
| `Field` | `label`, `help?`, `error?`, `required?`, `optional?`, `hideLabel?`, `id?`, `children` |

`Field` wires label `for`, `aria-describedby` and `aria-invalid`. Children is an element (it receives `id`, `aria-describedby`, `aria-invalid` and `error` for DS controls) or a function `(p) => <Select {...p} />`. Errors are [What] + [Why] + [How].
```jsx
<Field label="Search suppliers" help="Search by supplier name or contract number."><Input leftIcon="magnifying-glass" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
<Field label="Status">{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)} options={['Open', 'Reviewed', 'All']} />}</Field>
<RadioGroup legend="Renewal rate" name="rate" value={rate} onChange={setRate} options={[{ value: '0.05', label: '5%', description: 'Prototype assumption' }]} />
```

### 1.17 Toasts

**In the app you do not mount anything:** `AppFrame` (src/shell/AppFrame.jsx) renders the stack and bridges `useToast()` to `useUI().toast`, so both are one stack (do not add a `ToastProvider`: it would create a second one). `<ToastProvider>` (mount once, near the root) is for a standalone page and provides `useToast()` and renders the stack: bottom right, above the phone bottom bar, region "Notifications" with a polite live region (role `status`) and an assertive one (role `alert`, errors). Info, success and warning dismiss after 6 seconds (hover or focus pauses the timer). **Errors stay until closed.**

```jsx
const toast = useToast();
toast({ tone: 'success', title: 'Link copied.', description: 'Paste it to share this page.' });   // returns an id
toast({ tone: 'error', title: 'Export failed.', description: 'Your browser blocked the download. Allow downloads for this page and try again.' });
toast.dismiss(id);  toast.clear();
```
Options: `tone` (`'info' 'success' 'warning' 'error'`), `title`, `description`, `duration` ms, `persist`. `type` and `message` are accepted as aliases of `tone` and `description`. Success copy says what happened and the consequence; errors are [What] + [Why] + [How]. `ToastHost({ toasts, onDismiss })` is the controlled variant (A1's `useUI().toast` has the same option names, so A1 can mount `ToastProvider` or `ToastHost`).

### 1.18 Low-level (rarely needed)

`Portal`, `useOverlay(open, onClose, ref)` (focus trap, Escape, scroll lock, focus return for your own overlay), `addLayer`, `focusables`, `focusIn`, `lockScroll`, `restoreFocus` (layer manager: Escape only closes the top layer), `place`, `usePlacement` (placement maths). z-index: drawer 101, dialog 110, popover 120, tooltip 130, toasts 200, chart tooltip 1000.

---

## 2. Charts (`src/charts`)

Wrap every chart in `<Panel padded={24}><ChartFigure as="h2" ...>...</ChartFigure></Panel>`: the chart surface colour (`--viz-surface`) follows the Panel. Feed charts through the **adapters** from `useEstate().estate`: the charts never compute a business rule (bands, states, flags and pounds come from the engine). Every chart row has ONE primary link (stretched over the row; `getHref(row)` makes it an `<a>`, otherwise `onOpen(row, event)` is called from a `<button>`); extra links go in the `extra` slot and sit above it. Tooltips appear on hover and keyboard focus, Esc hides them, and every value is also in the row's accessible name and the "Show table" twin. Up, Down, Home, End move between rows.

### 2.1 Choosing `format` (this matters: golden strings)

| Where | Pass | Result |
|---|---|---|
| Overview cards and bar (`HeadlineTile`), `CoverageMeter`, `RadarStrip` | `format={fmtGBPCompact}` (from `src/lib/format.js` or the charts barrel) | `£6.1m`, `£0.6m`, `£6.9m`, `£129.4m` (the acceptance strings) |
| `RadarLanes` | nothing (default `gbp`) | `£2.4m`, `£950k`; band totals `£6.9m a year` are identical |
| `OpportunityList` | nothing (default `gbpFull`) | `£3,350,000` exact, as in the flag drawer; `fmtGBPCompact` for the Overview strip |
| `BulletList` on the cap screen | `format={gbpFull}` | `£8,350,000`, `£3,350,000 over` (R37) |
| `CoverageBlock` | `format={gbpFull}` | `£23,830,000` |
| `YearBars`, `CumulativeLine` | nothing | `£430k`, `£8.4m` |

`gbp` is compact with `£k` precision between £10k and £1m (`£642k`); `fmtGBPCompact` is the engine's rule (`£0.6m`). Exact figures in tables and aria: `gbpFull`.

### 2.2 Formatters, scales and constants

`format.js`: `AS_OF`, `toDate`, `iso`, `fmtDate` ('6 Oct 2026'), `fmtDateLong`, `fmtMonthYear`, `fmtDayMonth`, `addMonths`, `monthsBetween`, `daysBetween`, `relativeFrom(asOf, v)` ('25 days left', 'Due today', '6 days ago'), `gbp`, `gbpFull`, `fmtGBPCompact`, `gbpTick`, `pct(ratio, dp = 0)` (`pct(0.948, 1)` = '94.8%'), `pts`, `pctTick`, `plural(n, one, many)`. In views prefer `src/lib/format.js` for text; use these only inside chart wrappers.

`flags.js`: `FLAGS` (per type: `key label short glyph color text on basis`), `FLAG_ORDER` (stack order: overCap, uplift, nearCap, renewal), `FLAG_CARD_ORDER` (cards and chips: overCap, nearCap, renewal, uplift), `BASIS_LABEL`, `STATES` (within, close, over), `UPLIFT_STATES`, `stateFor`, `CLOSE_AT` (0.85), `BANDS`, `CONFIDENCE` (`high medium low` with `label glyph words`), `REVIEW` (`to_investigate under_review explained not_an_issue` with `label glyph reviewed`). Colour follows the **entity**, never its rank: filtering or re-sorting never changes a flag's colour.

Flag type keys: `overCap`, `nearCap`, `renewal`, `uplift`. Basis keys: `one_off`, `projected`, `per_year`. Confidence: `high`, `medium`, `low`. Review status: `to_investigate`, `under_review`, `explained`, `not_an_issue`.

### 2.3 Adapters (`adapters.js`): estate in, props out

All take `estate` (`useEstate().estate`). Wording comes from `src/lib/copy.js`.

| Adapter | Returns | Notes |
|---|---|---|
| `headlineProps(estate)` | `{ total, contractCount, byType: { overCap: { value, count }, ... } }` | engine totals, triage exclusions already applied. `<HeadlineTile {...headlineProps(estate)} format={fmtGBPCompact} />` |
| `radarRows(estate, extraFor?)` | rows for `RadarLanes` and `RadarStrip` | straight from `estate.radar.groups` (passed, ended, m3, m6, m12). Row: `{ id (contract id), title, supplier, band, deadline, endDate, value (annual contract value), autoRenew, usedEndDate, afterEndGBP, flagId, extra }`. `extraFor(row, contract, radarItem)` becomes `row.extra`. Prefer the `extraFor` prop of `RadarLanes` |
| `capItems(estate, { extraFor? })` | `BulletList` items, one per testable cap | `{ id, title, supplier, cap, spend, state, excess, partial, basis, source, stateLabel, basisLabel, sourceLabel, extra }`. `stateLabel` is "Above contract value (estimate)" for an estimate cap. `extraFor(item, contract)` -> node for the row's extra slot |
| `upliftRows(estate, { extraFor? })` | `Dumbbell` rows | `{ id, title, supplier, cap, actual, flagged, excessGBP, extra }` |
| `opportunityItems(estate, { reasonFor?, clauseFor?, extraFor?, statusLabels? })` | `OpportunityList` items for **all** ranked flags (open and reviewed) in the engine's rank order | `reasonFor` defaults to the copy-deck sentence. `clauseFor(flag) -> { label, href } \| null`. `statusLabels: 'changed'` (default: pill only when status is not "To investigate") or `'all'` |
| `opportunityCounts(items)` | `{ all, overCap, nearCap, renewal, uplift }` | for `FlagFilterChips`. Count the items you pass (the filtered set you want counted) |
| `cumulativeSeries(estate, contractId)` | `[{ date, pay, cum }]` month-end points | starts at 0 on the later of the contract start and `council.spendDataFrom`; last `cum` = `derived[id].spend.toDate` |
| `yearBarsProps(estate, contractId)` | `{ cap, years }` | annual-cap contracts: `<YearBars {...yearBarsProps(estate, id)} />` |
| `coverageProps(estate, { noteFor? })` | `{ total, matched, unmatched, pending, suppliers }` | `unmatched` = `coverage.noContractGBP` (£23,830,000), `pending` = payments awaiting match review (£300,000). `noteFor(supplier) -> string` is the second line per supplier |
| `counted(flag)` | boolean | the engine's counted rule |

`clauseFor` is usually:
```jsx
import { evidenceFor, sourceHref } from '../lib/evidenceFor.js';
const clauseFor = (flag) => { const t = evidenceFor(flag); return t ? { label: 'View clause, page ' + t.page, href: sourceHref(t, 'opportunities') } : null; };
```

### 2.4 `ChartFigure`, `Legend`, `ChartTable`

`ChartFigure({ title, description, legend, table, footnote, actions, as = 'h3', className, children })`: a `<figure>` with a heading, optional legend, a "Show table" toggle (`aria-pressed`) when `table` is given, and a footnote. While the table shows the chart is unmounted. `table = { columns: [{ key, label, align?: 'right', render? }], rows: [{ id, ... }] }`. Ready-made twins: `capTable(items)` (cap basis, source, over-by), `cumulativeTable(series, cap)`. For other charts build `{ columns, rows }` from the same items you pass to the chart.

`Legend({ items, label, className })`: `items: [{ key, label, shape: 'bar'|'hatch'|'line'|'dot'|'diamond'|'tick'|'band'|'glyph', color, glyph? }]`. Ready-made: `RADAR_LEGEND`, `BULLET_LEGEND`, `DUMBBELL_LEGEND`, `LINE_LEGEND(cap)`. A legend is required whenever there are two or more encodings.

`ChartTable` is the table twin renderer (not the application table: that is `DataTable` in `src/ui`).

### 2.5 `HeadlineTile`, `HeadlineSentence`, `HeadlineBreakdown`, `StackedBar`, `CoverageMeter`

`HeadlineTile({ total, contractCount, byType, format = gbp, note, caveat, getHref, onSelect, footer, as = 'h1' })`: the hero sentence (`£6.1m across 15 contracts flagged as opportunities to investigate`, the figure carries an exact-value tooltip and `aria-describedby`), `note` and `caveat` lines under it, the 100% bar by flag type (fixed order over cap, price increase, close to cap, renewal), and the four cards (over cap, close to cap, renewals, price increases; each `aria-label` is the golden sentence). `getHref(type) -> '#/opportunities?type=overCap'` makes cards links, `onSelect(type)` makes them buttons. `footer` renders under the cards (the exact sum line `sumLine(totals)`, the triage note `excludedNote(totals)`).
```jsx
<Panel padded={24}><HeadlineTile {...headlineProps(estate)} format={fmtGBPCompact} note="Indicative figures. As at 6 October 2026." caveat={COPY.caveat.short}
  getHref={(t) => hrefFor('opportunities', { query: { type: t } })} footer={<p className="kviz-note">{sumLine(estate.totals)}</p>} /></Panel>
```

**When the PageHeader owns the h1** (the Overview brief: the title is the headline sentence) use the two halves instead of `HeadlineTile`:

- `HeadlineSentence({ total, contractCount, format })`: the sentence **without a heading element** (a `span`): focusable figure with the exact-value tooltip and `aria-describedby`, then "across 15 contracts flagged as opportunities to investigate". Pass it as `PageHeader`'s `title`. The figure is 56px (`.kviz-hero`); override that class in the view's css if the title should be smaller.
- `HeadlineBreakdown({ total, byType, format, getHref, onSelect, footer })`: the bar and the four cards.
```jsx
<PageHeader eyebrow="Marchbank Borough Council" title={<HeadlineSentence total={hp.total} contractCount={hp.contractCount} format={fmtGBPCompact} />} description={...} />
<HeadlineBreakdown {...hp} format={fmtGBPCompact} getHref={(t) => '#/opportunities?type=' + t} footer={<p className="kviz-note">{sumLine(estate.totals)}</p>} />
```
where `const hp = headlineProps(estate)`.

`StackedBar({ segments, total, height = 24, ariaLabel, onSelect, format = gbp, unit = 'contract', focusable = true })`: part-to-whole bar; segments `{ key, label, value, color, on?, glyph?, count?, pattern?: 'hatch', hatchPeriod? }`. Only for parts that sum to the whole.

`CoverageMeter({ matched, total, format = gbp, href, linkLabel = 'See spend with no contract', onOpen })`: "84% of payments are linked to a contract on the register" with a `role="meter"` bar. Pass `format={fmtGBPCompact}` and `href="#/spend/no-contract"`.

### 2.6 `RadarStrip` (Overview) and `RadarLanes` (Renewal radar)

`RadarStrip({ rows, asOf, horizon = 12, getHref(bandKey), attentionHref, valueSuffix = ' a year', format = gbp, caption })`: "Needs attention now N" pill, three band cells with values and counts, a diamond per deadline, a four-label axis. `caption="Contract value, a year"` (decision 7). Band cells are links when `getHref` is given.

`RadarLanes({ rows, asOf, horizon = 12, getHref, onOpen, extraFor, valueLabel = 'Annual value', valueSuffix = ' a year', format = gbp, valueMax, headingAs = 'h3' })`. Groups: Needs attention now (Notice date passed, Ended still paying; only when not empty), Next 3 months, 3 to 6 months, 6 to 12 months (always shown; an empty band says "No notice dates fall in this period. Nothing needs your decision here."). Each row: title link, supplier, Auto-renews marker, lane (time left to act, diamond at the notice deadline, notice period band, tick at contract end), deadline and relative text, annual value with a shared-scale bar.

`extraFor(row) -> node` renders full width under each row. Put the action line, the notice period as extracted, a `ConfidencePill` and a `ClauseLink` there:
```jsx
const extraFor = (row) => {
  const c = estate.contractsById[row.id], d = estate.derived[row.id], ev = evidenceForField(c.id, 'noticePeriod');
  return (<><span>{needsAttentionText(c, d) || actionLine(c, d)}</span><span>Notice period: {noticeShortText(c.notice)}</span>
    <ConfidencePill score={c.confidence.noticePeriod} />{ev && <ClauseLink contractId={c.id} extractionId={ev.extractionId} page={ev.page} from="renewals" context={c.title} />}</>);
};
<Panel padded={24}><ChartFigure as="h2" title="Renewal radar" legend={<Legend items={RADAR_LEGEND} />} footnote={radarFootnote(12)}>
  <RadarLanes rows={radarRows(estate)} extraFor={extraFor} getHref={(r) => hrefFor('contracts', { seg: [r.id] })} /></ChartFigure></Panel>
```
Links and buttons inside the extra slot are clickable; the text passes the click to the row. The group headings are h3.

### 2.7 `BulletList` (cap vs spend), `CapStatePill`, `YearBars`, `CumulativeLine`

`BulletList({ items, axisMax = 1.25, closeAt = 0.85, getHref, onOpen, limit, format = gbp })`: ranked bullet rows on one axis (% of each contract's cap): track to the cap, amber zone from 85%, cap tick, fill coloured by state, hatched overflow beyond the cap, chevron when clipped at the axis end. Sorted by share of cap then spend. Name wraps to two lines. Numbers column: spend ("At least" when the spend files start after the contract), `of £5,000,000 cap` (or `annual cap`, `contract value`), and `£3,350,000 over` when over. Under the supplier: `Whole term · Stated maximum` (basis and source). Status: pill with the state words (wraps) and `167.0% of cap`. Items: see `capItems`. `limit` shows the top N ("Show all 24 contracts" is your button).

```jsx
const items = capItems(estate, { extraFor: (it, c) => it.state === 'ok' ? null : <ClauseLink contractId={c.id} extractionId={ev(c).extractionId} page={ev(c).page} from="spend" context={c.title} /> });
<ChartFigure as="h2" title="Cap vs spend" legend={<Legend items={BULLET_LEGEND} />} table={capTable(items)} footnote="Spend figures are net of irrecoverable VAT.">
  <BulletList items={items} format={gbpFull} limit={showAll ? undefined : 12} getHref={(r) => '#/contracts/' + r.id} />
</ChartFigure>
```
`capSummary(items)` returns `{ over, close, within }` for the header line. The spend figure drilling into payments is yours: put a button in `extra`, or open the drawer from `onOpen`. Cap rows whose cap is the contract value read "Above contract value (estimate)" / "Close to contract value (estimate)" with confidence one step lower (from the engine, no work for you).

`CapStatePill({ state: 'ok'|'near'|'over', label?, wrap? })`: the state pill for tables elsewhere (pass `label={capStateLabel(cap)}`).

`YearBars({ years, cap, height = 220, closeAt, format })`: columns per contract year against an annual cap line; over-cap years hatched above the line; the running year outlined and labelled "Year to date". `years: [{ year, from, to, spend, partial? }]`. Use `yearBarsProps(estate, id)`.

`CumulativeLine({ series, cap, closeAt, height = 360, subject = 'this contract' })`: cumulative spend against the cap line with the crossing annotated ("Cap crossed, 8 Apr 2025"). The plot is `role="slider"`: Left and Right move one point, PageUp and PageDown three, Home and End the ends, Esc hides the tooltip. Use `cumulativeSeries(estate, id)` and wrap with `table={cumulativeTable(series, cap)}`.

### 2.8 `Dumbbell` (price increase check)

`Dumbbell({ rows, tolerance = 0.01, axisMin = -0.05, axisMax = 0.3, getHref, onOpen })`: tick = index cap, dot = change in payments, three states (Above cap, Within tolerance, Within cap), sorted by the gap. Rows from `upliftRows(estate)`. Contracts where the check could not run are not rows: list them in a table with `estate.derived[id].uplift.reason` ("Cannot test: reason").

### 2.9 `OpportunityList`, `FlagFilterChips`, pills

`OpportunityList({ items, filter = null, getHref, onOpen, limit, format = gbpFull, max })`.

- Items: `opportunityItems(estate, { clauseFor })`. Item fields: `id, rank, type, typeLabel, title, supplier, reason, value, basis, confidence, actionBy, status, statusLabel, statusPill, clauseLabel, clauseHref, extra, href`.
- It **never re-sorts or filters by status**: pass the items in rank order, already filtered by your Open / Reviewed / All status filter and search. `filter` (a flag type key) and `limit` are the only filters it applies. `rank` is the item's overall rank (`item.rank`); drop `rank` from your items to number by position.
- Columns: rank, type pill (glyph + words), contract title (the one primary link), supplier and the full reason clamped to two lines (full text in the tooltip, the accessible name and your flag drawer), clause link, indicative value as an exact figure with a bar and the basis, confidence pill, "Act by 31 Oct 2026" (or "Next review ..." for price increases), review status pill.
- Reviewed flags (status `explained` or `not_an_issue`) are drawn muted: grey type pill (glyph and words stay), faded bar, quieter name. Status pill: built from `statusLabel` (`statusPill` replaces it with your node). `extra` goes after the clause link.
- Bar length uses one scale from 0 to the largest value in `items` (not the filtered subset), so filtering never rescales or recolours bars.
- Tooltip note: "An opportunity to investigate, not a confirmed result".
- Layout: five columns above 1000px of container width, a type-pill-above-title layout down to 760px, a stacked card layout below.

```jsx
const all = opportunityItems(estate, { clauseFor });
const shown = all.filter(byStatus).filter(bySearch);
<ChartFigure as="h2" title="Opportunities to investigate" table={oppTable(shown)}>
  <FlagFilterChips counts={opportunityCounts(all)} value={type} onChange={setType} />
  <OpportunityList items={shown} filter={type} getHref={(r) => hrefFor('opportunities', { query: { flag: r.id } })} />
</ChartFigure>
```
Opening the flag drawer: `getHref` to `#/opportunities?flag=<id>` (or `onOpen(row) => setQuery({ flag: row.id })`); drive the drawer from `estate.flagsById[id]`.

`FlagFilterChips({ counts, value = null, onChange(typeKey | null), label = 'Filter by flag type', allLabel = 'All flags' })`: one row of toggle buttons: All flags, Spend over cap, Close to cap, Renewals, Price increases above cap, each with its count.

Pills for tables elsewhere: `FlagBadge({ type, label?, muted? })`, `ConfidenceBadge({ level: 'high'|'medium'|'low' })` ("High confidence", "Medium confidence", "Needs review"), `ReviewBadge({ status, label? })`, `FlagChip({ type })` (32px glyph chip, decorative), `ConfidenceDots({ level })` (decorative). For score-based confidence on extractions use A1's `ConfidencePill`.

### 2.10 `CoverageBlock` (no contract on the register)

`CoverageBlock({ matched, total, unmatched, pending = 0, suppliers, topN, getHref, onOpen, unit = 'payment', format = gbp, heading, headingAs = 'h3' })`: stat blocks (matched, awaiting review when `pending` > 0, no contract) with percentages of the total, one 100% bar (blue matched, grey awaiting review, hatched amber no contract), then **every** supplier with no contract ranked: name (primary link, `getHref(row)` to its payments), `54 payments with no contract match.` plus your note, amber bar with the exact amount, share of the unmatched total. `topN` defaults to all; a smaller `topN` collapses the rest into "N other suppliers".
```jsx
<CoverageBlock {...coverageProps(estate, { noteFor: () => COPY.noContract.rowNote })} format={gbpFull} getHref={(r) => '#/spend/no-contract?supplier=' + encodeURIComponent(r.label)} />
```
Row note on screen: "No contract to read, so no clause to link." (copy deck).

### 2.11 Low-level chart pieces

`BarList({ rows, max, ariaLabel, getHref, onOpen, format, head, leadWidth, trailWidth, valueWidth })` is the engine under `OpportunityList` and `CoverageBlock` (row `{ id, rank?, label, sub?, subLines?, extra?, value, color, laneSub?, lead?, trail?, trailSub?, content, aria, href?, group?, muted? }`). `Hatch({ color, period, tint })` is the SVG hatch pattern (put it in a `position: relative` box). `useChartTip()`, `ChartTip`, `TipBody` are the tooltip plumbing (content `{ title, sub?, rows?: [{ value, label, color?, glyph?, glyphColor? }], note? }`; bind with `tip.bindPointer(content)` on the row and `tip.bindFocus(content, '[data-kviz-row]')` on its primary link). Never put the word "saving" in a chart string.

---

## 3. CSS tokens used by charts

`--viz-*` are defined in `charts.css` from Springboard tokens (no hex). Marks: `--viz-accent` (renewal, within cap, matched), `--viz-danger` (over cap), `--viz-warning` (close to cap, no contract), `--viz-purple` (price increase), ramp `--viz-b1` to `--viz-b3` (renewal bands). Text that sits beside a mark: `--viz-accent-text`, `--viz-danger-text`, `--viz-warning-text`, `--viz-purple-text` (AA on the surface and on a 12% tint). Furniture: `--viz-ink`, `--viz-ink-2` (never `--fg-3`: it fails AA), `--viz-grid`, `--viz-axis`, `--viz-track`, `--viz-surface` (= `--kx-card-bg`). Pills use `.kviz-pill` with `style={{ '--c': mark, color: text }}`.

## 4. Behaviour checks and how to run them

- Gallery fixture: `tests/fixtures/ui-gallery.jsx` (every component, real engine data, inside the app shell). `node scripts/build.mjs --entry tests/fixtures/ui-gallery.jsx --outdir .scratch/ui-checks`, then `node tests/shot.mjs --dist .scratch/ui-checks --hash '#/ui' --theme dark --w 1440 --h 2000 --out .scratch/ui-checks/ui.png` (`#/ui` kit, `#/charts` charts, `#/all` both). Use a tall `--h` to see a whole page: the shell scrolls inside `#shell-main`.
- `node tests/ui-checks.mjs [a11y|keys|contrast|focus|css] [--no-build]`: builds the fixture and runs 92 assertions, exit 1 on failure. `a11y`: axe (wcag2a/aa/21aa/22aa + best-practice) in both themes at 1440 and 390 with dialog, confirm, drawer and toasts open (0 violations). `keys`: dialog, confirm, drawer, nested overlays, menu, segmented, table row guards, tooltip, toasts, native fields, chart tooltips, golden strings. `contrast`: computed WCAG contrast of every text element and pill in both themes (lowest 4.58:1). `focus`: 15 controls draw a 2px ring on keyboard focus. `css`: no hex, gradient, emoji, exclamation mark or "saving".
