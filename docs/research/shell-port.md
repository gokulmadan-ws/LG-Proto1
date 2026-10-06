# App Shell port plan (Springboard 2.0 -> React, dark + light)

Author: shell-port research agent. Status: **built, rendered and verified** in a scratch copy of the app. Nothing under `design-system/`, `src/` or `index.html` was touched.

Everything in section 8 is the exact code that produced the screenshots and test results in section 9. It is copy-pasteable into `src/shell/` unchanged (same directory depth as `.scratch/shell/`, so the `../../assets/blob-texture.png` URL in `shell.css` resolves in both places).

Files you can copy instead of pasting:
- `/tmp/claude-0/-home-user-LG-Proto1/4a2c3345-29a2-559b-b8d9-409e75525fc5/scratchpad/research/work/shell-port/skeleton/{AppShell.jsx,ThemeToggle.jsx,glyphs.jsx,shell.css,main.jsx}` (also live at `/home/user/LG-Proto1/.scratch/shell/`, git-ignored).
- Test tooling: `.../research/work/shell-port/scripts/{shotx.mjs,shotref.mjs,pixdiff.py,functional.mjs,axe-run.mjs,probe-orig.mjs}`.
- Screenshots: `.../research/work/ref-shell-dark*.png` (original), `port-*.png` (port), `diff-parity-*.png` (6x amplified pixel diff).

---

## 0. Decisions in one screen

| Topic | Decision |
|---|---|
| Fidelity | Port is 1:1 with the template in dark. Pixel diff vs the real x-dc render at 1440x900 and 1024x768: **0.07% / 0.12% of pixels differ**; all of it is two deliberate deviations (see section 9.1). Hover states are pixel-identical. |
| Runtime | Do NOT use `support.js`. It is a generic Design Component runtime; for this template it only (a) hoists `<helmet>` children into `<head>`, (b) turns `style-hover="..."` into generated `.scpN:hover{... !important}` classes, (c) wraps everything in `#dc-root > div.sc-host` (height 100%). `{{ }}` and Babel/`x-import` are unused by this template. |
| Theme model | `<html data-theme="dark|light">`, default dark, key `kontor-theme`. All shell colours are `--shell-*` custom properties defined for both themes in `shell.css`. |
| Light look | Page `#F2F3F7`, canvas panel `#FFFFFF`, hairlines `#C1C1CC`, text `#1A1B22`, accent `#0969DA`. W logo stays a **dark disc with white W** (brand mark). Blob texture is **dropped in light** (rendered both ways; the glow reads as a stray lavender stripe on a bright page). |
| Toggle | 32px circular icon button, **first (leftmost) item of the right cluster** so Share/Bell/Settings/Avatar keep their exact template positions. Icon = current mode (`fa-moon` dark / `fa-sun` light), `aria-label="Dark mode"` + `aria-pressed`. |
| Rail | Real navigation: `<nav aria-label="Primary">`, `aria-current="page"`, active = template Home style (tint + accent). All rail buttons are 44x44 (template mixes 44/40) with `--shell-rail-gap: 17px`; icon centres stay within 1px of the template. |
| Tooltips | DS `Tooltip` (`side="right"` on rail, `side="bottom"` in header). Hidden on touch and below 700px by CSS. |
| a11y | axe-core (wcag2a/aa/21aa/22aa + best-practice): **0 violations** in dark and light, desktop and mobile (after the colour fixes in section 5.3). |
| Responsive | >=900px untouched template (incl. 1024x768). 700-899: compact header, icon-only tabs. <700: bottom tab bar with captions, compact header. |

---

## 1. What the x-dc runtime does (support.js, ds-base.js)

Read: `design-system/templates/app-shell/{AppShell.dc.html,support.js,ds-base.js}` and `exports/AppShell-standalone-src.html` (identical markup; only differs by 3 `ext-resource-dependency` metas, relative paths `../components/fig-tokens.css`, `../colors_and_type.css`, `../styles.css`, `../_ds_bundle.js`, and a thumbnail `<template>`).

- **Boot** (`support.js` end of file): `hideRawTemplate()` injects `x-dc{display:none!important}`; `loadReactUmd()` uses `window.React/ReactDOM` if present, else loads React 18.3.1 from unpkg (not reachable here, so the harness preloads `vendor/react*.js`); then `init()` -> `boot()` parses `<x-dc>` innerHTML as a template, replaces the `<x-dc>` node with `<div id="dc-root">`, appends `html,body{height:100%;margin:0}#dc-root,#dc-root>.sc-host{height:100%}`, renders React into it. The root renders `<div class="sc-host" data-sc-name="AppShell">` around the template. Every element also gets a `data-dc-tpl` attribute (editor bridge). **No layout impact** other than the 100% heights.
- **`<helmet>`**: renamed to `<sc-helmet>`; its children are appended once (deduped by key) to `document.head`. In this template that is `<script src="./ds-base.js">` (which appends `<link>`s for `components/fig-tokens.css`, `colors_and_type.css`, `styles.css` and the script `_ds_bundle.js`, with `base='../..'`) and one `<style>` with the page rules `html, body {margin:0; height:100%; background: url("assets/blob-texture.png") center / cover no-repeat fixed, #121417}`, `a {color:var(--link); text-decoration:none}`, `a:hover {color:var(--accent-hover)}`.
- **`style-hover="color:#C1C1CC;"`**: `collectProps` sees `style-*` attributes, `createPseudoSheet` inserts `.scpN:hover{color:rgb(193,193,204) !important}` into a runtime `<style>` and appends the class to the element (cached per `pseudo|css`). Observed classes: `.scp0:hover{color:#C1C1CC}` (Apps, Chat), `.scp1:hover{color:#fff}` (close tab, Files, Search, Menu), `.scp2:hover{background:#1A1B22}` (Share, Notifications, Settings). Our CSS replaces these with plain `:hover` rules, no `!important` needed.
- **`{{ }}`**: not used in this template (no props, no `<script data-dc-script>`).
- **Babel**: only fetched for `<x-import>` of `.jsx` URLs. Not used here. Original renders fine offline with only `vendor/react*.js` preloaded.
- **Content slot**: `<main>` is an empty element with `flex:1 1 auto; min-width:0; background:transparent; overflow:auto`. There is no slot API, you just put content in it.

Quirks of the original that a port must replicate or consciously change:
1. `<body>` has no font-family (Times in the original); the shell root sets `font-family: var(--font-sans)`. Our app sets it on body too.
2. Circle buttons (Share, Bell, Settings) and rail buttons do not set `padding`, so they use the **UA button padding `1px 6px`**. The Share SVG is `width="100%" height="100%"`, which therefore renders as an **18x28 box** (viewBox 15x12.4, centred -> glyph 18x14.9). A global `button{padding:0}` reset would silently blow the glyph up to 30px. Port: `padding:0` plus explicit `.shell__circle > svg{width:18px;height:28px}`.
3. Rail is `flex:0 0 64px` + `border-right:1px` in content-box => **65px wide**. Port sets `box-sizing:content-box` explicitly.
4. Rail active item is 44x44/radius 6, idle ones are 40x40/radius 8 (so the column pitch is 62px then 60px). Idle buttons have no background, so the size difference is invisible except for icon centres.
5. Close-tab button is 24x28 (glyph 12 wide + padding 6), the circles are 32px, idle rail items 40px: all under the DS 44px touch-target rule. Port keeps the visuals and adds invisible 44px hit areas (`::after`, verified with `elementFromPoint`).
6. `100vw x 100vh` root: breaks with a vertical scrollbar and on mobile browser chrome. Port: `width:100%; height:100vh; height:100dvh`.
7. Underline of the active tab is `bottom:-4px` of a 64px tab centred in a 72px header, i.e. flush with the header's bottom edge, touching the panel's 1px top border. Port computes it as `calc((header-h - tab-h) / -2)` so it stays flush when the mobile header is 56/48.
8. Template `a` rules are global and **fail AA in dark** (`--link` #0969DA on #08090B = 3.84:1, hover `--accent-hover` #1158C7 = 3.08:1). Port uses the Figma semantic link tokens (see 5.3).
9. Template glyphs: the W mark, the Apps 2x2 grid and the Share network glyph are **inline SVG in the template itself** (not hand-drawn by us). The DS says "no hand-drawn SVG icons"; these three are DS-supplied, so they are kept verbatim in `glyphs.jsx`. Everything else is Font Awesome. If you want zero inline SVG: `fa-solid fa-table-cells-large` (Apps) and `fa-solid fa-share-nodes` (Share) exist in `vendor/fontawesome`, but they look different from the template.

## 2. Reference renders (original x-dc runtime, dark)

Harness (git-ignored): `/home/user/LG-Proto1/.scratch/orig/{AppShell.dc.html,support.js,ds-base.js,assets/blob-texture.png}` = verbatim copies, with only these edits: 3 lines added before `support.js` (FA css link from `vendor/`, `vendor/react*.js`) and `ds-base.js` base changed to `'../../design-system'`. Run with `node tests/shot.mjs --file .scratch/orig/AppShell.dc.html --out ... --w 1440 --h 900`.

- `work/ref-shell-dark.png` 1440x900
- `work/ref-shell-dark-1024.png` 1024x768 (header and rail look the same as 1440; nothing breaks)
- `work/ref-shell-dark-390.png` 390x844 (original is desktop-only: right cluster is pushed off-screen, tab strip is clipped)
- `work/probe-orig.json` computed geometry (header 72px, logo at 24,15 42x42, Apps 86,4 94x64, Chat 188,4 86x64, app tab 282,4 167x64, close 409,22 24x28, Share 1240,20 32x32 ... Account 1384,20; body wrapper 12,72 1416x828; rail 13,73 65x827; main 78,73 1349x827; Home 23,89 44x44; Files 25,153 40x40; Search 25,213 40x40; Menu 23,840 44x44)
- `work/orig-rendered-dom.html` what the runtime emits

## 3. Complete hard-coded inventory of the template

Fonts: `font-family: var(--font-sans)` = Inter (self-hosted `design-system/fonts`, weights 400/500 used). Page text colour `#fff`.

| # | Element | Property -> value |
|---|---|---|
| 1 | `html, body` | margin 0; height 100%; background `url(blob-texture.png) center / cover no-repeat fixed, #121417` (applied to BOTH html and body, so the alpha-53 glow is painted twice) |
| 2 | `a` / `a:hover` | `var(--link)` (#0969DA) no underline / `var(--accent-hover)` (#1158C7) |
| 3 | root div | flex column; 100vw x 100vh; background transparent; overflow hidden; color #fff; font var(--font-sans) |
| 4 | `header` | flex, align center, space-between; height 72px (flex 0 0 72px); padding 0 24px; transparent; relative; z-index 2 |
| 5 | left cluster | flex, align center, gap 8px |
| 6 | logo | svg 42x42, viewBox 43; margin-right 12px; disc fill #1A1B22; ring stroke #3E3F47 width 1.5; glyph fill #fff |
| 7 | inactive tab (Apps, Chat) | flex, gap 9px; height 64px; padding 0 14px; transparent, no border; colour #76777F; hover #C1C1CC; 15px / 500 Inter; Apps = svg 20x20 (viewBox 16); Chat = `fa-solid fa-comment` 16px |
| 8 | active tab wrapper | relative; flex; height 64px; padding 0 16px 0 12px; inner flex gap 11px |
| 9 | app chip | 24x24; radius 6px; bg #26272E; `fa-solid fa-asterisk` 14px #fff |
| 10 | app name | 14px / 500; #fff; nowrap |
| 11 | close tab | `aria-label="Close tab"`; transparent; colour #8A8B93; hover #fff; padding 6px; `fa-xmark` 16px (renders 24x28) |
| 12 | tab underline | absolute; left 8px; right 8px; bottom -4px; height 2.5px; bg var(--accent); radius 2px |
| 13 | right cluster | flex, align center, gap 16px |
| 14 | circle buttons | 32x32; radius 9999px; border 1px solid #34353D; transparent; colour #fff; hover bg #1A1B22; Share svg 100%x100% viewBox "3.5 4.8 15 12.4" (-> 18x28 box); Bell `fa-bell` 14px; Settings `fa-gear` 14px |
| 15 | avatar | 32x32; radius 9999px; no border; bg #2E9E4B; #fff; 14px / 400; letter-spacing 0.02em; text "JS" |
| 16 | body wrapper | flex 1 1 auto; min-height 0; margin 0 12px 0; border 1px solid #3E3F47 (no bottom); radius 14px 14px 0 0; bg #08090B; overflow hidden |
| 17 | rail | flex 0 0 64px (+1px border = 65); flex column; align center; padding 16px 0; transparent; border-right 1px solid #3E3F47 |
| 18 | rail group | flex column; align center; gap 20px |
| 19 | Home (active) | 44x44; radius 6px; bg rgba(31,111,235,0.14); colour var(--accent) (#1F6FEB); `fa-solid fa-house` 20px |
| 20 | Files, Search (idle) | 40x40; radius 8px; transparent; colour #8A8B93; hover #fff; `fa-regular fa-folder-open`, `fa-solid fa-magnifying-glass`, 20px |
| 21 | Menu | margin-top auto; 44x44; radius 8px; colour #8A8B93; hover #fff; `fa-solid fa-bars` 24px |
| 22 | `main` | flex 1 1 auto; min-width 0; transparent; overflow auto |

Closest Springboard tokens for the off-ramp template hexes: #121417 = `--grey-925` / `--background-surface` (dark); #08090B = `--grey-975` / `--background-sunken`; #3E3F47 = `--grey-700` / `--border-standard-subtle`; #1A1B22 = `--grey-900`; #C1C1CC = `--grey-200`; #28292F = `--grey-800`. Off-ramp (template-specific): #26272E, #34353D, #76777F, #8A8B93, #2E9E4B.

## 4. Theme tokens (prefix `--shell-`)

Dark = template (two AA exceptions marked **). Light = Springboard tokens. Contrast figures are WCAG ratios I computed (and axe confirmed).

| Token | Template (dark) | Dark used | Light | Light source / note |
|---|---|---|---|---|
| `--shell-page-bg` | #121417 | #121417 | #F2F3F7 | `--grey-100`, `--bg-2`, `--background-surface` (light) |
| `--shell-canvas` | #08090B | #08090B | #FFFFFF | `--bg-canvas` (light); DS Card (`--bg-1` #F9FAFB, border #E6E6EB) sits on it cleanly |
| `--shell-line` | #3E3F47 | #3E3F47 | #C1C1CC | `--border-2` (light). 1.6:1 on page, same visual weight as dark (1.76:1). #E6E6EB (`--border-1`) was too faint (1.12:1). |
| `--shell-fg` | #FFFFFF | #FFFFFF | #1A1B22 | `--fg-1` (light) 15.5:1 on page |
| `--shell-tab-idle` ** | #76777F (4.14:1, fails AA) | #7C7D85 (4.51:1) | #5C5D64 (5.9:1) | `--fg-2` (light) |
| `--shell-tab-hover` | #C1C1CC | #C1C1CC | #1A1B22 | |
| `--shell-icon-idle` | #8A8B93 (5.4:1) | #8A8B93 | #5C5D64 (6.5:1 on white) | close x + rail icons |
| `--shell-icon-hover` | #FFFFFF | #FFFFFF | #1A1B22 | |
| `--shell-chip-bg` | #26272E | #26272E | #E6E6EB | `--bg-3` (light) |
| `--shell-chip-fg` | #FFFFFF | #FFFFFF | #1A1B22 | |
| `--shell-circle-border` | #34353D | #34353D | #C1C1CC | `--border-2` |
| `--shell-circle-hover-bg` | #1A1B22 | #1A1B22 | #E6E6EB | `--bg-3` |
| `--shell-logo-disc` | #1A1B22 | #1A1B22 | #1A1B22 | brand mark: white W on near-black disc (DS README). Looks right on the light header, rendered and checked. |
| `--shell-logo-ring` | #3E3F47 | #3E3F47 | #1A1B22 | ring merges with the disc on light |
| `--shell-logo-glyph` | #FFFFFF | #FFFFFF | #FFFFFF | |
| `--shell-rail-active-bg` | rgba(31,111,235,.14) | same | rgba(9,105,218,.10) | accent @ 10%; #0969DA on that tint = 4.51:1 |
| `--shell-rail-active-fg` | var(--accent) #1F6FEB (3.87:1 on tint, fine for a 20px glyph) | same | var(--accent) #0969DA | |
| `--shell-underline` | var(--accent) | same | var(--accent) | |
| `--shell-avatar-bg` ** | #2E9E4B (white = 3.44:1, axe "serious") | #278640 (4.59:1) | #278640 | to revert to the template colour use #2E9E4B (dark only) |
| `--shell-avatar-fg` | #FFFFFF | #FFFFFF | #FFFFFF | |
| `--shell-link` | `--link` #0969DA (3.84:1, fails) | `--text-link-text-default` = blue-200 #76B5FD (9.3:1) | `--text-link-text-default` = blue-600 #0969DA (5.2:1) | Figma semantic token, theme-aware |
| `--shell-link-hover` | `--accent-hover` #1158C7 (3.08:1, fails) | `--text-link-text-hover` blue-300 #58A6FF | blue-700 #1158C7 (6.5:1) | |

Geometry tokens (theme independent, identical to template): `--shell-header-h:72px; --shell-tab-h:64px; --shell-header-px:24px; --shell-rail-w:64px; --shell-gutter:12px; --shell-radius:14px; --shell-rail-gap:17px`.

### 4.1 Blob texture in light mode (rendered both ways)

`assets/blob-texture.png` is a 1321x884 RGBA with alpha <= 53/255: a blue/violet glow in the bottom-left, transparent elsewhere. With `cover + fixed` it is only visible in the page strip outside the canvas panel (the 12px left gutter in the lower half; the header strip is at the top, where there is no glow). In dark it is a nice faint blue edge. In light it appears as an uneven lavender stripe next to the panel border. **Decision: dark keeps it exactly as the template; light uses a flat `--shell-page-bg`** (rule `:root[data-theme="light"], :root[data-theme="light"] body{background:var(--shell-page-bg)}` in `shell.css`; delete that rule to keep the glow in light). Cost: esbuild inlines the PNG as a data URL, so `dist/app.css` grows by ~465 KB (self-contained, works in the standalone export; an absolute `/assets/...` URL would need `external` in `scripts/build.mjs`, not worth it).

### 4.2 Why this light layout (panel white on grey chrome)

Dark: chrome (#121417) is lighter than the inset panel (#08090B). Light inverts that naturally: chrome is the greyer surface, panel is the raised white one. I rendered five variants (white chrome + grey canvas, grey chrome + white canvas with two border strengths, darker chrome, no texture) and the grey-chrome/white-canvas/#C1C1CC-border variant gave the best card contrast and the crispest panel edge. DS Cards (`--bg-1`/`--border-1`) read correctly on it.

## 5. Component API and behaviours

```jsx
<AppShell
  appName="Kontor financial layer"        // label of the active app tab (required)
  appIcon="fa-solid fa-asterisk"          // FA classes for the 24px chip (default asterisk)
  onCloseApp={fn}                         // optional: renders the x on the app tab
  tabs={[{ id, label, icon, onSelect }]}  // inactive tabs left of the app tab. Default: Apps (grid glyph) + Chat (fa-comment)
  railItems={[{ id, label, icon, short }]}// label = aria-label + tooltip; short = 11px caption in the mobile bottom bar
  activeRail="overview"                   // id
  onRailChange={(id) => ...}
  onMenu={fn}                             // bottom "Menu" (fa-bars) button; omit to hide it
  headerRight={<ThemeToggle .../>}        // first item of the right cluster; default = <ThemeToggle/>; null = none
  actions={[{ id, label, icon, onClick, optional }]}  // default Share (template glyph), Notifications, Settings. optional:true => hidden <700px
  user={{ initials: 'JS', name: 'Jordan Smith', onClick }}
  mainLabel="Renewal radar"               // optional aria-label for <main>
>
  {children}                              // goes into <main id="shell-main" tabindex="-1"> (own scroll)
</AppShell>
```
`icon` may be an FA class string (`'fa-solid fa-house'`) or a React node (`<GridGlyph />`). Exports: `AppShell`, `DEFAULT_TABS`, `DEFAULT_ACTIONS`; `ThemeToggle`, `useTheme`, `getTheme`, `setTheme`, `THEME_KEY`; `WMark`, `GridGlyph`, `ShareGlyph`.

### 5.1 Behaviour added on top of the static template (look unchanged)

- **Landmarks**: `<header>` (banner), `<nav aria-label="Workspace">` (tab strip), `<nav aria-label="Primary">` (rail, in a `<ul>`), `<main id="shell-main" tabindex="-1">`. Logo `<svg role="img" aria-label="Whitespace">`.
- **Skip link** (first focusable element): visually hidden until `:focus-visible`, then an accent pill. It does **not** use `href="#shell-main"` navigation: it `preventDefault()`s and calls `main.focus()`, because the app uses **hash routing** (`#/renewals`) and a real fragment jump would clobber the route. Verified: hash is untouched, `document.activeElement.id === 'shell-main'`.
- **Rail = navigation**: active item gets the template Home style (`--shell-rail-active-bg` + `--shell-rail-active-fg`, radius 6) and `aria-current="page"`; every item has `aria-label`; click calls `onRailChange(id)`. Hover colour as template. All items 44x44 so the column does not jump when the active item changes (the template's 44/40 mix would shift icons by 2-4px).
- **Tab order** (verified): Skip link, Apps, Chat, Close app, Theme toggle, Share, Notifications, Settings, Account, rail items in order, Menu, then `main` content.
- **Focus ring** (`:focus-visible` only): `outline:2px solid var(--accent); outline-offset:2px; box-shadow:0 0 0 4px var(--focus-ring)`. The solid accent outline is needed because `--focus-ring` (rgba(31,111,235,.32)) alone is 1.56:1 on white. The halo uses the DS token as requested.
- **Header buttons**: all `type="button"`, `aria-label` set (Share, Notifications, Settings, `Account: <name>`, `Close <appName>`). Hit areas expanded to 44x44 with `::after` (visual sizes unchanged).
- **Tooltips**: DS `Tooltip` around every icon-only trigger (rail `side="right"`, header `side="bottom"`). It shows on mouseenter and focus, hides on leave/blur (verified: after a click + moving the mouse away there is no stuck tooltip). It renders `role="tooltip"` only while shown. It has no Escape handler and no `aria-describedby`; fine because every trigger already has an `aria-label`. CSS hides tooltips under `@media (hover: none), (max-width: 699px)` so they never stick after a tap. The DS Tooltip wrapper is an `inline-flex` span, so it becomes the flex item: that is why `margin-top:auto` sits on `.shell__rail-foot` and the "optional on mobile" hiding sits on a `.shell__slot` wrapper.
- **Motion**: 150ms ease-out colour/background transitions (DS spec), disabled under `prefers-reduced-motion`.
- **Inert items**: Apps and Chat tabs (and Share/Notifications/Settings/Menu unless you pass handlers) are visual only in the prototype. Give them `onSelect`/`onClick` that raise a DS Toast following the voice rules, e.g. `Apps isn't part of this prototype. It sits outside Stage 1. Use the left rail to explore the demo.` Do not leave them silently dead on a demo.
- **Close x**: closing the app tab is not destructive (no confirm needed). Suggested wiring: navigate to Overview and toast "Returned to the overview." If you wire it to anything that discards data, DS rules require a confirm dialog + toast.

### 5.2 Theme toggle (recommended placement and logic)

- Placement: `headerRight` = first child of `.shell__right`. The cluster is right-aligned, so adding it on the left leaves Share (x=1240), Bell (1288), Settings (1336), Account (1384) exactly where the template has them (verified in the 1440 screenshot).
- Control: 32px circle, same `.shell__circle` class as Share/Bell/Settings. Icon shows the **current** mode: `fa-solid fa-moon` (dark) / `fa-solid fa-sun` (light). `aria-label="Dark mode"` (constant) + `aria-pressed={theme==='dark'}`. Do not change the label with state (double announcement); the DS Tooltip says "Switch to light mode" / "Switch to dark mode" for sighted users.
- Logic (`ThemeToggle.jsx`): `setTheme(t)` sets `document.documentElement.setAttribute('data-theme', t)`, writes `localStorage['kontor-theme']` in try/catch, dispatches a `kontor-theme` event. `useTheme()` subscribes (also to the `storage` event for other tabs). `color-scheme` (native scrollbars, form controls) is set from CSS (`:root[data-theme=...]{color-scheme:...}`), so the pre-paint script in `index.html` is all that is needed on load: no flash, default dark when nothing is stored (verified with a fresh profile: attr `dark`, localStorage empty until the first toggle).
- Charts or anything reading CSS colours in JS: call `const [theme] = useTheme()` and re-read tokens when it changes.
- Keyboard: Enter and Space toggle (verified).

### 5.3 Contrast fixes that deviate from the template (all verified with axe)

1. `--shell-avatar-bg` #2E9E4B -> #278640 (white text 3.44:1 -> 4.59:1). Only visible difference vs template: slightly deeper green disc.
2. `--shell-tab-idle` #76777F -> #7C7D85 (4.14:1 -> 4.51:1). Imperceptible.
3. Links: use `--text-link-text-default/hover` (theme-aware) instead of `--link/--accent-hover`; in-text links in `.shell__main` (`p a, li a, dd a, small a`) get an underline (axe `link-in-text-block`: dark link vs white body text is only 2.14:1, so colour alone is not enough).
4. Mobile bottom-bar caption of the active item uses `--shell-fg` (accent on tint is 3.87:1, too low for 11px text). The 20px glyph keeps the accent (3:1 non-text rule is met).
To restore template-exact values, change the two tokens back in the dark block; everything else is independent.

## 6. Responsive behaviour

The template is `100vw x 100vh` desktop-only (see `ref-shell-dark-390.png`: right cluster falls off-screen). I measured that the full header (labels + app name "Kontor financial layer" + toggle) fits down to 900px, so the shell is **unchanged at 1024x768**, a common demo laptop/projector size.

| Viewport | Behaviour |
|---|---|
| >= 900px | Untouched template layout and geometry. |
| 700-899px | Header padding 24 -> 16, panel gutters 12 -> 8. Apps/Chat become icon-only (label kept for screen readers via the visually-hidden pattern, so accessible names survive). App name ellipsises at 22ch. Rail unchanged. |
| < 700px | Header 56px (tab 48px, logo 36px, padding 12). Apps/Chat tabs, Share, Settings (`optional` actions) and the app-tab close x are hidden; **theme toggle, Notifications and Account stay**. Panel gutters 0, side borders removed, rounded top corners kept. Rail turns into a **bottom tab bar** (`flex-direction: column-reverse` on the body): 52px cells, 18px icon + 11px caption (`short || label`), `env(safe-area-inset-bottom)` padding, no Menu button, tooltips off. `100dvh` root so mobile browser chrome does not crop the bar. |

Screenshots: `work/port-tablet-{dark,light}-768.png` (+ `port-tablet-both-768.png`), `port-mobile-{dark,light}-390.png`, `port-product-{dark,light}-1024.png`.

## 7. Wiring into the real app (BUILD agent checklist)

1. Create `src/shell/` and copy `AppShell.jsx`, `ThemeToggle.jsx`, `glyphs.jsx`, `shell.css` from section 8 (or from the skeleton dir). `shell.css` is imported by `AppShell.jsx`.
2. **Remove the `background` from `html, body` in `src/styles/app.css`** (it currently sets `background: var(--bg-canvas)`). `shell.css` owns page background; whichever stylesheet is concatenated last wins, and esbuild orders CSS by import order. Keep the `color`/`font-family` there.
3. `index.html` already has what is needed: `data-theme="dark"`, the pre-paint script, `vendor/fontawesome`, `design-system/styles.css`, `_ds_bundle.js` before `dist/app.js` (the shell destructures `Tooltip` from `window.Springboard20DesignSystem_019e02` at module load).
4. Hash routing helper + mount (this mirrors `main.jsx` in the skeleton):
```jsx
import './styles/app.css';
import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { AppShell } from './shell/AppShell.jsx';

const RAIL = [
  { id: 'overview',      label: 'Overview',      icon: 'fa-solid fa-house' },
  { id: 'opportunities', label: 'Opportunities', icon: 'fa-solid fa-magnifying-glass-dollar', short: 'Savings' },
  { id: 'renewals',      label: 'Renewals',      icon: 'fa-regular fa-calendar-check' },
  { id: 'spend',         label: 'Cap vs spend',  icon: 'fa-solid fa-chart-line', short: 'Spend' },
  { id: 'contracts',     label: 'Contracts',     icon: 'fa-regular fa-folder-open' },
];
function useHashRoute(def) {
  const read = () => location.hash.replace(/^#\/?/, '').split('/')[0] || def;
  const [route, setRoute] = useState(read);
  useEffect(() => { const f = () => setRoute(read()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return [route, (id) => { location.hash = '/' + id; }];
}
function App() {
  const [route, go] = useHashRoute('overview');
  return (
    <AppShell appName="Kontor financial layer" railItems={RAIL} activeRail={route} onRailChange={go}
      onCloseApp={() => go('overview')} onMenu={() => {}} user={{ initials: 'JS', name: 'Jordan Smith' }}>
      {/* page for `route`; give each page its own padding, e.g. padding:32px; max-width:1449px */}
    </AppShell>
  );
}
createRoot(document.getElementById('root')).render(<App />);
```
   All the FA icons above exist in the vendored FA 6.5.2 (verified): `magnifying-glass-dollar, calendar-check (regular), chart-line, folder-open (regular), house, file-contract, scale-balanced, sterling-sign, triangle-exclamation, file-lines`.
5. Set `document.title` per route (the shell has no `<h1>`; each page should render one `<h1>`; axe's `page-has-heading-one` only fires on an empty shell).
6. Pages that must render the template exactly (design review): `#parity` in the skeleton demo renders the template content (Apps, Chat, "App Name", Home/Files/Search, no toggle).
7. Build/screenshot recipe without touching `dist/`: `node scripts/build.mjs --entry src/main.jsx --outdir .scratch/b1` then `node tests/shot.mjs --dist .scratch/b1 --theme light --out ...`.

## 8. Final code (tested)

### 8.1 `src/shell/shell.css`
```css
/* ==========================================================================
   Springboard 2.0 App Shell  -  port of templates/app-shell/AppShell.dc.html
   Dark values are IDENTICAL to the template. Light values are chosen from
   Springboard tokens (colors_and_type.css / fig-tokens.css).
   Theme switch: <html data-theme="dark|light"> (default dark, see index.html).
   ========================================================================== */

/* ---------- Geometry (theme independent; template values) ---------- */
:root {
  --shell-header-h: 72px;
  --shell-tab-h: 64px;
  --shell-header-px: 24px;
  --shell-rail-w: 64px;
  --shell-gutter: 12px;
  --shell-radius: 14px;
  --shell-rail-gap: 17px;      /* template: 20px gap between 44/40px buttons (62/60px pitch); 17px on uniform 44px slots keeps icon centres within 1px */
}

/* ---------- DARK (default) - template values ---------- */
:root,
:root[data-theme="dark"] {
  color-scheme: dark;
  --shell-page-bg: #121417;                 /* body behind header + gutters (cool-grey-925) */
  --shell-canvas: #08090B;                  /* content panel (cool-grey-975) */
  --shell-line: #3E3F47;                    /* panel border + rail divider (cool-grey-700) */
  --shell-fg: #FFFFFF;
  --shell-tab-idle: #7C7D85;                /* template #76777F is 4.14:1 on page (fails AA); +6 levels = 4.51:1, visually identical */
  --shell-tab-hover: #C1C1CC;               /* cool-grey-200 */
  --shell-icon-idle: #8A8B93;               /* close x + rail icons */
  --shell-icon-hover: #FFFFFF;
  --shell-chip-bg: #26272E;                 /* 24px app icon tile */
  --shell-chip-fg: #FFFFFF;
  --shell-circle-border: #34353D;
  --shell-circle-hover-bg: #1A1B22;         /* cool-grey-900 */
  --shell-logo-disc: #1A1B22;
  --shell-logo-ring: #3E3F47;
  --shell-logo-glyph: #FFFFFF;
  --shell-rail-active-bg: rgba(31, 111, 235, 0.14);
  --shell-rail-active-fg: var(--accent);    /* #1F6FEB */
  --shell-underline: var(--accent);
  --shell-avatar-bg: #278640;               /* template #2E9E4B + white text = 3.44:1 (axe: serious). #278640 = 4.59:1 */
  --shell-avatar-fg: #FFFFFF;
  --shell-link: var(--text-link-text-default);        /* blue-200 #76B5FD, 9.3:1 on canvas */
  --shell-link-hover: var(--text-link-text-hover);    /* blue-300 #58A6FF */
}

/* ---------- LIGHT ---------- */
:root[data-theme="light"] {
  color-scheme: light;
  --shell-page-bg: #F2F3F7;                 /* cool-grey-100 = --bg-2 = --background-surface (light) */
  --shell-canvas: #FFFFFF;                  /* --bg-canvas (light) */
  --shell-line: #C1C1CC;                    /* cool-grey-200 = --border-2 (light); ~1.6:1 on page, same visual weight as dark's #3E3F47 (1.76:1). Quieter option: #E6E6EB */
  --shell-fg: #1A1B22;                      /* --fg-1 (light) */
  --shell-tab-idle: #5C5D64;                /* --fg-2 (light), 5.9:1 on page */
  --shell-tab-hover: #1A1B22;
  --shell-icon-idle: #5C5D64;
  --shell-icon-hover: #1A1B22;
  --shell-chip-bg: #E6E6EB;
  --shell-chip-fg: #1A1B22;
  --shell-circle-border: #C1C1CC;           /* --border-2 (light) */
  --shell-circle-hover-bg: #E6E6EB;         /* --bg-3 (light) */
  --shell-logo-disc: #1A1B22;               /* brand mark stays a dark disc with white W */
  --shell-logo-ring: #1A1B22;
  --shell-logo-glyph: #FFFFFF;
  --shell-rail-active-bg: rgba(9, 105, 218, 0.10);
  --shell-rail-active-fg: var(--accent);    /* #0969DA */
  --shell-underline: var(--accent);
  --shell-avatar-bg: #278640;
  --shell-avatar-fg: #FFFFFF;
  --shell-link: var(--text-link-text-default);        /* blue-600 #0969DA */
  --shell-link-hover: var(--text-link-text-hover);    /* blue-700 #1158C7 */
}

/* ---------- Page ---------- */
html, body {
  margin: 0;
  height: 100%;
  background: url("../../assets/blob-texture.png") center / cover no-repeat fixed, var(--shell-page-bg);
}
/* Light: the blob glow reads as a stray lavender tint on a bright page - drop it. Delete this rule to keep it. */
:root[data-theme="light"],
:root[data-theme="light"] body { background: var(--shell-page-bg); }
a { color: var(--shell-link); text-decoration: none; }
a:hover { color: var(--shell-link-hover); }
/* Links inside running text need a non-colour cue (WCAG 1.4.1; axe link-in-text-block) */
.shell__main p a, .shell__main li a, .shell__main dd a, .shell__main small a { text-decoration: underline; text-underline-offset: 2px; }

/* ---------- Shell root ---------- */
.shell {
  display: flex; flex-direction: column;
  width: 100%; height: 100vh; height: 100dvh;
  background: transparent; overflow: hidden;
  font-family: var(--font-sans); color: var(--shell-fg);
}
.shell button { font-family: var(--font-sans); }
.shell ul { list-style: none; margin: 0; padding: 0; }

/* Skip link: visible on keyboard focus only */
.shell a.shell__skip {
  position: absolute; left: 12px; top: 12px; z-index: 100;
  padding: 10px 14px; border-radius: var(--radius-md);
  background: var(--accent); color: var(--accent-fg);
  font-size: 14px; font-weight: 500; text-decoration: none;
  transform: translateY(-200%);
}
.shell a.shell__skip:focus-visible { transform: none; }

/* Focus ring (keyboard only): solid accent outline + DS --focus-ring halo */
.shell button:focus-visible,
.shell a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--focus-ring);
}
.shell__main:focus { outline: none; }

/* ---------- Header ---------- */
.shell__header {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: space-between;
  height: var(--shell-header-h); flex: 0 0 var(--shell-header-h);
  padding: 0 var(--shell-header-px);
  background: transparent;
}
.shell__left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.shell__logo { width: 42px; height: 42px; margin-right: 12px; flex: 0 0 auto; }
.shell__logo-disc  { fill: var(--shell-logo-disc); }
.shell__logo-ring  { stroke: var(--shell-logo-ring); }
.shell__logo-glyph { fill: var(--shell-logo-glyph); }
.shell__tabs { display: flex; align-items: center; gap: 8px; min-width: 0; }

/* inactive tab (Apps, Chat) */
.shell__tab {
  display: flex; align-items: center; gap: 9px;
  height: var(--shell-tab-h); padding: 0 14px;
  background: transparent; border: none; cursor: pointer;
  color: var(--shell-tab-idle);
  font-family: var(--font-sans); font-size: 15px; font-weight: 500;
  transition: color 150ms ease-out;
}
.shell__tab:hover { color: var(--shell-tab-hover); }
.shell__tab > i { font-size: 16px; }
.shell__tab > svg { flex: 0 0 auto; }

/* active app tab */
.shell__apptab {
  position: relative; display: flex; align-items: center; gap: 11px;
  height: var(--shell-tab-h); padding: 0 16px 0 12px; min-width: 0;
}
.shell__apptab-chip {
  width: 24px; height: 24px; border-radius: 6px; flex: 0 0 auto;
  background: var(--shell-chip-bg); color: var(--shell-chip-fg);
  display: flex; align-items: center; justify-content: center;
}
.shell__apptab-chip > i { font-size: 14px; }
.shell__apptab-name {
  font-size: 14px; font-weight: 500; color: var(--shell-fg);
  white-space: nowrap; min-width: 0; overflow: hidden; text-overflow: ellipsis;
}
.shell__apptab-close {
  position: relative; display: flex; align-items: center;
  padding: 6px; background: transparent; border: none; cursor: pointer;
  color: var(--shell-icon-idle);
  transition: color 150ms ease-out;
}
.shell__apptab-close:hover { color: var(--shell-icon-hover); }
.shell__apptab-close > i { font-size: 16px; }
.shell__apptab-close::after { content: ""; position: absolute; inset: -8px -10px; }   /* 44px hit area */
.shell__apptab-rule {
  position: absolute; left: 8px; right: 8px;
  bottom: calc((var(--shell-header-h) - var(--shell-tab-h)) / -2);   /* template: -4px = flush with header bottom */
  height: 2.5px; border-radius: 2px; background: var(--shell-underline);
}

/* right cluster */
.shell__right { display: flex; align-items: center; gap: 16px; flex: 0 0 auto; }
.shell__slot { display: contents; }
.shell__circle {
  position: relative;
  width: 32px; height: 32px; padding: 0; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  border-radius: 9999px; border: 1px solid var(--shell-circle-border);
  background: transparent; color: var(--shell-fg); cursor: pointer;
  transition: background-color 150ms ease-out;
}
.shell__circle:hover { background: var(--shell-circle-hover-bg); }
.shell__circle > i { font-size: 14px; }
.shell__circle > svg { width: 18px; height: 28px; }
.shell__circle::after { content: ""; position: absolute; inset: -6px; border-radius: 9999px; }   /* 44px hit area */
.shell__avatar {
  position: relative;
  width: 32px; height: 32px; padding: 0; flex: 0 0 auto;
  border-radius: 9999px; border: none; cursor: pointer;
  background: var(--shell-avatar-bg); color: var(--shell-avatar-fg);
  font-family: var(--font-sans); font-size: 14px; font-weight: 400; letter-spacing: 0.02em;
}
.shell__avatar::after { content: ""; position: absolute; inset: -6px; border-radius: 9999px; }

/* ---------- Body: rail + content ---------- */
.shell__body {
  display: flex; flex: 1 1 auto; min-height: 0;
  margin: 0 var(--shell-gutter);
  border: 1px solid var(--shell-line); border-bottom: none;
  border-radius: var(--shell-radius) var(--shell-radius) 0 0;
  background: var(--shell-canvas); overflow: hidden;
}
.shell__rail {
  box-sizing: content-box;                  /* template: 64px + 1px divider = 65px */
  flex: 0 0 var(--shell-rail-w);
  display: flex; flex-direction: column; align-items: center;
  padding: 16px 0; background: transparent;
  border-right: 1px solid var(--shell-line);
}
.shell__rail-list { display: flex; flex-direction: column; align-items: center; gap: var(--shell-rail-gap); }
.shell__rail-list > li { display: flex; justify-content: center; }
.shell__rail-item {
  position: relative;
  width: 44px; height: 44px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 8px; background: transparent; cursor: pointer;
  color: var(--shell-icon-idle);
  transition: color 150ms ease-out, background-color 150ms ease-out;
}
.shell__rail-item:hover { color: var(--shell-icon-hover); }
.shell__rail-item > i { font-size: 20px; }
.shell__rail-item.is-active { border-radius: 6px; background: var(--shell-rail-active-bg); color: var(--shell-rail-active-fg); }
.shell__rail-caption { display: none; }
.shell__rail-foot { margin-top: auto; }
.shell__rail-menu {
  width: 44px; height: 44px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 8px; background: transparent; cursor: pointer;
  color: var(--shell-icon-idle);
  transition: color 150ms ease-out;
}
.shell__rail-menu:hover { color: var(--shell-icon-hover); }
.shell__rail-menu > i { font-size: 24px; }

.shell__main {
  flex: 1 1 auto; min-width: 0;
  background: transparent; overflow: auto;
  overscroll-behavior: contain;
}

/* No hover tooltips on touch / small screens (they would stick after a tap) */
@media (hover: none), (max-width: 699px) {
  .shell [role="tooltip"] { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .shell *, .shell *::before, .shell *::after { transition: none !important; }
}

/* ==========================================================================
   Responsive (everything >= 900px, incl. 1024x768, is the untouched template look)
   ========================================================================== */
@media (max-width: 899px) {
  :root { --shell-header-px: 16px; --shell-gutter: 8px; }
  .shell__tab-label {                                   /* icon-only tabs, label stays for screen readers */
    position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
  }
  .shell__tab { padding: 0 12px; }
  .shell__apptab-name { max-width: 22ch; }
}
@media (max-width: 699px) {
  :root { --shell-header-h: 56px; --shell-tab-h: 48px; --shell-header-px: 12px; --shell-gutter: 0px; }
  .shell__logo { width: 36px; height: 36px; margin-right: 4px; }
  .shell__tab, .shell__slot--optional { display: none; }
  .shell__apptab { padding-right: 8px; }
  .shell__right { gap: 12px; }
  .shell__body {
    flex-direction: column-reverse;                      /* rail becomes a bottom bar */
    border-left: none; border-right: none;
  }
  .shell__rail {
    flex: 0 0 auto; flex-direction: row; align-items: stretch; justify-content: center;
    padding: 4px 8px calc(4px + env(safe-area-inset-bottom));
    border-right: none; border-top: 1px solid var(--shell-line);
    background: var(--shell-canvas);
  }
  .shell__rail-list { flex: 1 1 auto; flex-direction: row; justify-content: space-around; gap: 0; }
  .shell__rail-list > li { flex: 1 1 0; min-width: 0; }
  .shell__rail-list .shell__rail-item { flex-direction: column; gap: 4px; width: 100%; height: 52px; }
  .shell__rail-list > li > span { display: flex; width: 100%; }   /* DS Tooltip wrapper fills the cell */
  .shell__rail-item > i { font-size: 18px; }
  .shell__rail-item.is-active .shell__rail-caption { color: var(--shell-fg); }   /* accent on tint is 3.87:1 in dark - too low for 11px text */
  .shell__rail-caption { display: block; max-width: 100%; padding: 0 2px; font-size: 11px; line-height: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shell__rail-foot { display: none; }
}
```

### 8.2 `src/shell/glyphs.jsx`
(The three DS-supplied inline SVGs, verbatim from the template. Do not add more inline SVG icons anywhere else.)
```jsx
// Design-system-provided glyphs, copied VERBATIM from the Springboard App Shell template.
// These three are the only inline SVGs in the shell. Everything else is Font Awesome.

/** Whitespace "W" mark on a 42px disc. Colours come from --shell-logo-* tokens (see shell.css). */
export function WMark({ className = 'shell__logo' }) {
  return (
    <svg className={className} width="42" height="42" viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Whitespace">
      <path className="shell__logo-disc" d="M21.5 0.75C32.9599 0.75 42.25 10.0401 42.25 21.5C42.25 32.9599 32.9599 42.25 21.5 42.25C10.0401 42.25 0.75 32.9599 0.75 21.5C0.75 10.0401 10.0401 0.75 21.5 0.75Z" />
      <path className="shell__logo-ring" d="M21.5 0.75C32.9599 0.75 42.25 10.0401 42.25 21.5C42.25 32.9599 32.9599 42.25 21.5 42.25C10.0401 42.25 0.75 32.9599 0.75 21.5C0.75 10.0401 10.0401 0.75 21.5 0.75Z" strokeWidth="1.5" />
      <path className="shell__logo-glyph" d="M13.1012 17.7963C14.2649 17.7963 15.2023 16.8458 15.2023 15.6658C15.2023 14.4859 14.2649 13.5354 13.1012 13.5354C11.9374 13.5354 11 14.4859 11 15.6658C11 16.8458 11.9374 17.7963 13.1012 17.7963Z" />
      <path className="shell__logo-glyph" d="M18.5318 28.1864L23.4453 16.518C23.8978 15.4036 23.3806 14.1581 22.2816 13.6665C21.1825 13.2076 19.9541 13.732 19.5016 14.8136L14.6204 26.5148C14.1679 27.6292 14.6851 28.8747 15.7518 29.3335C16.8509 29.7924 18.0793 29.268 18.5318 28.1864Z" />
      <path className="shell__logo-glyph" d="M26.9364 28.1864L31.8176 16.518C32.3025 15.4036 31.7853 14.1581 30.6862 13.6665C29.5871 13.2076 28.3588 13.732 27.9062 14.8136L23.0251 26.5148C22.5725 27.6292 23.0897 28.8747 24.1565 29.3335C25.2555 29.7924 26.4839 29.268 26.9364 28.1864Z" />
    </svg>
  );
}

/** "Apps" 2x2 grid glyph (template tab icon). 20px box, inherits currentColor. */
export function GridGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7.1999 3.5999C7.1999 2.9374 6.6624 2.3999 5.9999 2.3999H3.5999C2.9374 2.3999 2.3999 2.9374 2.3999 3.5999V5.9999C2.3999 6.6624 2.9374 7.1999 3.5999 7.1999H5.9999C6.6624 7.1999 7.1999 6.6624 7.1999 5.9999V3.5999ZM7.1999 9.9999C7.1999 9.3374 6.6624 8.7999 5.9999 8.7999H3.5999C2.9374 8.7999 2.3999 9.3374 2.3999 9.9999V12.3999C2.3999 13.0624 2.9374 13.5999 3.5999 13.5999H5.9999C6.6624 13.5999 7.1999 13.0624 7.1999 12.3999V9.9999ZM8.7999 3.5999V5.9999C8.7999 6.6624 9.3374 7.1999 9.9999 7.1999H12.3999C13.0624 7.1999 13.5999 6.6624 13.5999 5.9999V3.5999C13.5999 2.9374 13.0624 2.3999 12.3999 2.3999H9.9999C9.3374 2.3999 8.7999 2.9374 8.7999 3.5999ZM13.5999 9.9999C13.5999 9.3374 13.0624 8.7999 12.3999 8.7999H9.9999C9.3374 8.7999 8.7999 9.3374 8.7999 9.9999V12.3999C8.7999 13.0624 9.3374 13.5999 9.9999 13.5999H12.3999C13.0624 13.5999 13.5999 13.0624 13.5999 12.3999V9.9999Z" fill="currentColor" />
    </svg>
  );
}

/** "Share" network glyph (template header button). Sized by .shell__circle > svg in shell.css. */
export function ShareGlyph() {
  return (
    <svg className="shell__share-glyph" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="3.5 4.8 15 12.4">
      <path d="M10.2998 6.7999C10.2998 7.09959 10.2057 7.37521 10.046 7.60271L10.6848 8.9699C10.8991 8.92396 11.1223 8.8999 11.3498 8.8999C12.1395 8.8999 12.8591 9.19084 13.4126 9.6699L15.2085 8.35303C15.2041 8.30271 15.1998 8.2524 15.1998 8.1999C15.1998 7.42771 15.8276 6.7999 16.5998 6.7999C17.372 6.7999 17.9998 7.42771 17.9998 8.1999C17.9998 8.97209 17.372 9.5999 16.5998 9.5999C16.3985 9.5999 16.2082 9.55834 16.0354 9.48178L14.2416 10.7987C14.4079 11.1815 14.4998 11.6058 14.4998 12.0499C14.4998 12.3912 14.4451 12.7215 14.3445 13.0299L15.9195 13.9749C16.1207 13.8633 16.3526 13.7999 16.5998 13.7999C17.372 13.7999 17.9998 14.4277 17.9998 15.1999C17.9998 15.9721 17.372 16.5999 16.5998 16.5999C15.8276 16.5999 15.1998 15.9721 15.1998 15.1999V15.1758L13.6226 14.2287C13.0495 14.828 12.2423 15.1999 11.3498 15.1999C9.85133 15.1999 8.5957 14.1521 8.27852 12.7499H6.61383C6.37102 13.1677 5.92039 13.4499 5.40195 13.4499C4.62977 13.4499 4.00195 12.8221 4.00195 12.0499C4.00195 11.2777 4.62977 10.6499 5.40195 10.6499C5.92039 10.6499 6.3732 10.9321 6.61383 11.3499H8.27852C8.44258 10.628 8.85383 10.0024 9.4182 9.56271L8.77945 8.19553C8.06195 8.13209 7.49977 7.53271 7.49977 6.7999C7.49977 6.02771 8.12758 5.3999 8.89977 5.3999C9.67195 5.3999 10.2998 6.02771 10.2998 6.7999ZM11.3498 13.0999C11.9295 13.0999 12.3998 12.6296 12.3998 12.0499C12.3998 11.4702 11.9295 10.9999 11.3498 10.9999C10.7701 10.9999 10.2998 11.4702 10.2998 12.0499C10.2998 12.6296 10.7701 13.0999 11.3498 13.0999Z" fill="currentColor" />
    </svg>
  );
}
```

### 8.3 `src/shell/ThemeToggle.jsx`
```jsx
import { useState, useEffect } from 'react';

// Theme model: <html data-theme="dark|light">. index.html's pre-paint script sets it from
// localStorage['kontor-theme'] (default 'dark') before first paint; this module only keeps it in sync.
export const THEME_KEY = 'kontor-theme';

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(next) {
  const t = next === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode: theme just won't persist */ }
  window.dispatchEvent(new CustomEvent('kontor-theme', { detail: t }));
}

/** [theme, setTheme] - re-renders on toggle (also from another tab). Use it in charts that read CSS colours in JS. */
export function useTheme() {
  const [theme, setLocal] = useState(getTheme);
  useEffect(() => {
    const sync = () => setLocal(getTheme());
    const onStorage = (e) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        document.documentElement.setAttribute('data-theme', e.newValue);
        sync();
      }
    };
    window.addEventListener('kontor-theme', sync);
    window.addEventListener('storage', onStorage);
    sync();
    return () => { window.removeEventListener('kontor-theme', sync); window.removeEventListener('storage', onStorage); };
  }, []);
  return [theme, setTheme];
}

/** 32px circular header button. Icon shows the CURRENT mode; aria-pressed = dark mode is on. */
export function ThemeToggle({ Tip }) {
  const [theme] = useTheme();
  const dark = theme === 'dark';
  const btn = (
    <button
      type="button"
      className="shell__circle shell__theme-toggle"
      aria-label="Dark mode"
      aria-pressed={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <i className={dark ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} aria-hidden="true" />
    </button>
  );
  return Tip ? <Tip label={dark ? 'Switch to light mode' : 'Switch to dark mode'} side="bottom">{btn}</Tip> : btn;
}
```

### 8.4 `src/shell/AppShell.jsx`
```jsx
import './shell.css';
import { WMark, GridGlyph, ShareGlyph } from './glyphs.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

const { Tooltip } = window.Springboard20DesignSystem_019e02;

// DS Tooltip wrapper. Visual hint only (every trigger already has an aria-label).
const Tip = ({ label, side, children }) => <Tooltip label={label} side={side}>{children}</Tooltip>;

// `icon` is either a Font Awesome class string ('fa-solid fa-house') or a ready-made node (<GridGlyph />).
const icon = (i) => (typeof i === 'string' ? <i className={i} aria-hidden="true" /> : i);

export const DEFAULT_TABS = [
  { id: 'apps', label: 'Apps', icon: <GridGlyph /> },
  { id: 'chat', label: 'Chat', icon: 'fa-solid fa-comment' },
];
export const DEFAULT_ACTIONS = [
  { id: 'share', label: 'Share', icon: <ShareGlyph />, optional: true },
  { id: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell' },
  { id: 'settings', label: 'Settings', icon: 'fa-solid fa-gear', optional: true },
];

/**
 * Springboard 2.0 "App Shell" ported to React. Layout/colour 1:1 with templates/app-shell/AppShell.dc.html in dark.
 *
 * @param {string}   appName        label of the active (open) app tab
 * @param {string}   [appIcon]      FA classes for the 24px chip, default 'fa-solid fa-asterisk'
 * @param {Function} [onCloseApp]   shows the x on the app tab when provided
 * @param {Array}    [tabs]         inactive tabs left of the app tab: {id,label,icon,onSelect?}. Default Apps + Chat
 * @param {Array}    railItems      {id,label,icon,short?}   (label = aria-label + tooltip, short = mobile caption)
 * @param {string}   activeRail     id of the active rail item
 * @param {Function} onRailChange   (id) => void
 * @param {Function} [onMenu]       bottom rail "Menu" button; omit to hide it
 * @param {Node}     [headerRight]  rendered first in the right cluster. Default = <ThemeToggle/>. Pass null to omit.
 * @param {Array}    [actions]      header circle buttons {id,label,icon,onClick?,optional?}. Default Share/Notifications/Settings
 * @param {{initials:string,name?:string,onClick?:Function}} [user]
 * @param {string}   [mainLabel]    aria-label for <main>
 */
export function AppShell({
  appName,
  appIcon = 'fa-solid fa-asterisk',
  onCloseApp,
  tabs = DEFAULT_TABS,
  railItems = [],
  activeRail,
  onRailChange,
  onMenu,
  headerRight = <ThemeToggle Tip={Tip} />,
  actions = DEFAULT_ACTIONS,
  user = { initials: 'JS' },
  mainLabel,
  children,
}) {
  // Skip link must NOT change location.hash (the app uses hash routing).
  const skip = (e) => { e.preventDefault(); const m = document.getElementById('shell-main'); if (m) m.focus(); };

  return (
    <div className="shell">
      <a className="shell__skip" href="#shell-main" onClick={skip}>Skip to content</a>

      {/* ===== Top header ===== */}
      <header className="shell__header">
        <div className="shell__left">
          <WMark />
          <nav className="shell__tabs" aria-label="Workspace">
            {tabs.map((t) => (
              <button key={t.id} type="button" className="shell__tab" onClick={t.onSelect}>
                {icon(t.icon)}
                <span className="shell__tab-label">{t.label}</span>
              </button>
            ))}
            <div className="shell__apptab">
              <span className="shell__apptab-chip" aria-hidden="true"><i className={appIcon} /></span>
              <span className="shell__apptab-name" aria-current="page">{appName}</span>
              {onCloseApp && (
                <span className="shell__slot shell__slot--optional">
                  <Tip label="Close app" side="bottom">
                    <button type="button" className="shell__apptab-close" aria-label={`Close ${appName}`} onClick={onCloseApp}>
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  </Tip>
                </span>
              )}
              <span className="shell__apptab-rule" aria-hidden="true" />
            </div>
          </nav>
        </div>

        <div className="shell__right">
          {headerRight}
          {actions.map((a) => (
            <span key={a.id} className={'shell__slot' + (a.optional ? ' shell__slot--optional' : '')}>
              <Tip label={a.label} side="bottom">
                <button type="button" className="shell__circle" aria-label={a.label} onClick={a.onClick}>
                  {icon(a.icon)}
                </button>
              </Tip>
            </span>
          ))}
          <button type="button" className="shell__avatar" aria-label={user.name ? `Account: ${user.name}` : 'Account'} onClick={user.onClick}>
            {user.initials}
          </button>
        </div>
      </header>

      {/* ===== Body: rail + content ===== */}
      <div className="shell__body">
        <nav className="shell__rail" aria-label="Primary">
          <ul className="shell__rail-list">
            {railItems.map((it) => {
              const active = it.id === activeRail;
              return (
                <li key={it.id}>
                  <Tip label={it.label} side="right">
                    <button
                      type="button"
                      className={'shell__rail-item' + (active ? ' is-active' : '')}
                      aria-label={it.label}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onRailChange && onRailChange(it.id)}
                    >
                      {icon(it.icon)}
                      <span className="shell__rail-caption" aria-hidden="true">{it.short || it.label}</span>
                    </button>
                  </Tip>
                </li>
              );
            })}
          </ul>
          {onMenu && (
            <div className="shell__rail-foot">
              <Tip label="Menu" side="right">
                <button type="button" className="shell__rail-menu" aria-label="Menu" onClick={onMenu}>
                  <i className="fa-solid fa-bars" aria-hidden="true" />
                </button>
              </Tip>
            </div>
          )}
        </nav>

        <main id="shell-main" className="shell__main" tabIndex={-1} aria-label={mainLabel}>
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 8.5 Demo entry used for the verification (`main.jsx`)
```jsx
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { AppShell } from './AppShell.jsx';

const { Card, Badge, Button } = window.Springboard20DesignSystem_019e02;

const PRODUCT_RAIL = [
  { id: 'overview', label: 'Overview', icon: 'fa-solid fa-house' },
  { id: 'renewals', label: 'Renewals', icon: 'fa-regular fa-calendar-check', short: 'Renewals' },
  { id: 'spend', label: 'Cap vs spend', icon: 'fa-solid fa-chart-line', short: 'Spend' },
  { id: 'opps', label: 'Opportunities', icon: 'fa-solid fa-magnifying-glass-dollar', short: 'Savings' },
  { id: 'contracts', label: 'Contracts', icon: 'fa-regular fa-folder-open' },
];
const PARITY_RAIL = [
  { id: 'home', label: 'Home', icon: 'fa-solid fa-house' },
  { id: 'files', label: 'Files', icon: 'fa-regular fa-folder-open' },
  { id: 'search', label: 'Search', icon: 'fa-solid fa-magnifying-glass' },
];

function Demo() {
  const mode = location.hash.replace('#', '');            // '#parity' = template-identical content
  const parity = mode.startsWith('parity');
  const [active, setActive] = useState(parity ? 'home' : 'overview');
  if (parity) {
    return (
      <AppShell appName="App Name" onCloseApp={() => {}} railItems={PARITY_RAIL} activeRail={active} onRailChange={setActive}
        onMenu={() => {}} headerRight={null} user={{ initials: 'JS' }} />
    );
  }
  return (
    <AppShell appName="Kontor financial layer" onCloseApp={() => {}} railItems={PRODUCT_RAIL} activeRail={active}
      onRailChange={setActive} onMenu={() => {}} user={{ initials: 'JS', name: 'Jordan Smith' }}>
      <div style={{ padding: 32, display: 'grid', gap: 16, maxWidth: 900 }}>
        <h1 className="ds-h2" style={{ margin: 0 }}>{PRODUCT_RAIL.find((r) => r.id === active).label}</h1>
        <p className="ds-body" style={{ margin: 0 }}>Content slot. Text, <a href="#clause">a link to a clause</a>, and surfaces on the canvas.</p>
        <div style={{ display: 'flex', gap: 12 }}><Button>Review contract</Button><Button variant="outline">Export list</Button><Badge>12 flagged</Badge></div>
        <Card title="Card on canvas" description="Uses --bg-1 / --border-1, so it follows the theme.">Body copy inside a card.</Card>
        {Array.from({ length: 12 }).map((_, i) => <Card key={i} title={'Scroll row ' + (i + 1)} description="Checks that main scrolls on its own." />)}
      </div>
    </AppShell>
  );
}
createRoot(document.getElementById('root')).render(<Demo />);
```

## 9. Verification

Build: `node scripts/build.mjs --entry .scratch/shell/main.jsx --outdir .scratch/shell-build` (esbuild OK, app.js 17 KB, app.css 465 KB because of the inlined texture). Screenshots via `tests/shot.mjs --dist .scratch/shell-build` and `work/shell-port/scripts/shotx.mjs`.

### 9.1 Pixel parity (port in `#parity` mode vs the real x-dc render, dark)

| Viewport | Pixels differing (>8/255) | Where |
|---|---|---|
| 1440x900 | 948 (0.073%) | Avatar disc (#278640 vs template #2E9E4B, ~776 px) + Files rail icon 1px higher (172 px) |
| 1024x768 | 948 (0.12%) | same two |
| Hover on Apps, Share, Files, Close, Menu | identical to the original's hover state apart from the same two items (tooltips disabled for the comparison; the port adds DS tooltips on hover, the original has none) |

With template-exact tokens (#2E9E4B avatar, #76777F idle tab) the 1440 diff is **172 px (0.013%)**, i.e. only the Files icon.
Remaining Files-icon offset: rail uses uniform 44px slots, the template stacks 44/40/40 buttons with a 20px gap (icon centres at y=111/173/233). With uniform slots and `--shell-rail-gap` 17px the centres are 111/172/233 (Files 1px high). Alternatives I measured: gap 18px = 207 px differ (Search 2px low), gap 20px = 522 px (Files +2, Search +6). A hack `li:nth-child(2){margin-top:1px}` would make it exact but only for the 3-item template, so it is not recommended.
Diff images (amplified 6x): `work/diff-parity-1440.png`, `work/diff-parity-1024.png`. Side-by-side header crop (2x) looked identical by eye.

### 9.2 Functional checks (`work/shell-port/scripts/functional.mjs`, fresh browser profile, no init script)

1. First visit, empty storage: `data-theme="dark"`, body #121417, canvas #08090B, toggle `aria-pressed=true`, icon moon, localStorage untouched.
2. Click toggle: `light`, body #F2F3F7, canvas #FFFFFF, `aria-pressed=false`, icon sun, `localStorage['kontor-theme']='light'`.
3. Reload: stays light (pre-paint script). Click again: back to dark, persisted.
4. Enter and Space both toggle.
5. Hover rail item: 1 tooltip. Click then move mouse away: 0 tooltips. `aria-current="page"` follows the click.
6. Skip link keeps `location.hash` (`#/renewals`) and focuses `#shell-main`.
7. `main` scrolls itself (`scrollTop` 300) while `documentElement.scrollTop` stays 0.
8. Visual sizes: tabs 94x64 / 86x64 (identical to the original), close 24x28, circles 32x32, rail 44x44, Menu 44x44. Hit areas: `elementFromPoint` 5px outside a circle still hits the button, 8px outside does not (44px target).
9. axe-core 4.10.2 (`wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice`): dark 1440 = 0, light 1440 = 0, dark 390 = 0, light 390 = 0 violations. (`color-contrast` shows as "incomplete" in dark because header text sits on a background image; I checked those pairs by hand, section 4.) The template-content `#parity` page only reports `page-has-heading-one` (empty content).
10. No console errors besides `ERR_TUNNEL_CONNECTION_FAILED` for the DS's own `@import` of Google Fonts and cdnjs Font Awesome inside `colors_and_type.css` (offline sandbox). Harmless: Inter is self-hosted, FA is vendored, Geist is unused by the shell. `tests/shot.mjs` already filters these.

## 10. Traps (read before building)

1. `src/styles/app.css` sets `html, body{background: var(--bg-canvas)}`; remove that background or the shell's page colour depends on CSS order (section 7.2).
2. Do not add a global `button{padding:0}` or `*{box-sizing:border-box}` without checking `.shell__rail` (`content-box` on purpose) and `.shell__circle > svg` (explicit 18x28).
3. Skip link and any in-page anchors must not use real fragment navigation (hash router).
4. DS `Tooltip` shows on focus; it only hides on blur or mouseleave. That is why tooltips are CSS-hidden on touch/small screens. Do not wrap the same trigger in two Tooltips.
5. DS `Tooltip` wrapper is an `inline-flex` span: put `margin-top:auto`, `display:none` etc. on your own wrapper, not on the button.
6. `window.Springboard20DesignSystem_019e02` must exist when `AppShell.jsx` module code runs (it destructures `Tooltip` at top level). `index.html` order is already right.
7. `fa-regular` icons (folder-open, calendar-check) work from `vendor/fontawesome/webfonts/fa-regular-400.*` (present).
8. `localStorage` can throw (private mode): all access is in try/catch; the toggle still works for the session.
9. `dist/app.css` includes the texture as base64. If the size ever matters, swap `url("../../assets/blob-texture.png")` for `url("/assets/blob-texture.png")` and add `external: ['/assets/*']` to `scripts/build.mjs` (tested: esbuild then leaves the URL alone).
10. Springboard rules the shell already respects: sentence case labels, `[Verb]+[Object]` for actions (the shell has no primary buttons), no emoji, icon-only buttons have `aria-label`, 44px hit areas, no gradients, no left-border cards, Font Awesome for all non-brand icons.

## 11. Open points / judgement calls for the lead

- Two template colours were nudged for AA (avatar green, idle tab grey); revert instructions in 5.3. If you want literal template colours in dark, accept 3.44:1 on the avatar initials.
- Texture dropped in light mode (reversible, section 4.1).
- Rail icon positions are within 1px of the template, not exact (section 9.1).
- Share glyph and Apps grid are DS-supplied inline SVGs kept for fidelity; FA substitutes are available if the "no SVG" rule is enforced literally.
- Content `<main>` has no padding by design (template). Pages own their padding.
