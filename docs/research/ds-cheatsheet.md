# Springboard 2.0 cheat sheet for the Kontor prototype (API inventory + light-mode audit)

Audience: the BUILD agent. Everything below was verified in Chromium (Playwright) against the repo copy in `/home/user/LG-Proto1/design-system/`, in both themes. Code in sections 6 and 7 is NOT pseudo-code: it is the exact content of files that were built with `scripts/build.mjs` and screenshotted in dark and light. Copy the files from `research/kit/` (see 7.0) instead of retyping.

Research folder: `/tmp/claude-0/-home-user-LG-Proto1/4a2c3345-29a2-559b-b8d9-409e75525fc5/scratchpad/research/`
- `ds-cheatsheet.md` (this file)
- `kit/kit.css`, `kit/kit-ui.jsx`, `kit/kit.jsx` (verified gap kit + tokenised app shell + gallery that uses all of it)
- `kit/harness.jsx` (renders all 19 DS components in every variant, used for the audit)
- `work/shots/*.png` (dark/light screenshots referenced below), `work/contrast.txt` (338 contrast checks), `work/resolved.json` (every semantic token resolved per theme), `work/audit-report.json` (behavioural test output)

---

## 0. Read this first: the things that will bite

1. **The DS bundle is a browser global**: `const { Button, Badge, Card } = window.Springboard20DesignSystem_019e02;` (no import). `__errors` array on that namespace lists components that failed to load (empty today). The bundle expects `window.React` (classic runtime).
2. **Theme = `data-theme="dark|light"` on `<html>`**. `index.html` already sets it before paint from `localStorage['kontor-theme']`, default dark. Dark is the `:root` default of the curated layer, but the Figma semantic layer (`fig-tokens.css`) has the opposite default (light is `:root`, dark is `:root[data-theme="dark"], .dark`). Always keep the attribute set (it always is, via index.html).
3. **DS BUG: in dark, `--focus-ring` is `rgb(64,64,64)` (grey), not blue.** `fig-tokens.css` defines `--focus-ring` under `:root[data-theme="dark"]` (specificity 0,2,0) which beats `colors_and_type.css` `:root` (0,1,0). Input/Textarea/Select focus halo is therefore a dull grey ring in dark (border still turns blue). Fixed in `kit.css` section 0. Measured: dark `box-shadow: rgb(64,64,64) 0 0 0 3px`; light `rgba(31,111,235,.32) 0 0 0 3px`. This is the ONLY token name that collides in a way that matters (`--focus-ring`; the other 16 collisions are raw ramps where the curated file wins by order).
4. **Add `color-scheme` per theme**: the DS never sets it (`getComputedStyle(html).colorScheme === "normal"`), and `index.html` has `<meta name="color-scheme" content="dark light">` which follows the OS, not the toggle. Native select popups, scrollbars and date pickers will be light on a dark theme without `:root[data-theme=dark]{color-scheme:dark}` (in `kit.css`).
5. **Button has NO visible keyboard focus** (inline `outline:none`, no replacement). Fix needs `outline: ... !important` because the DS sets it inline. In `kit.css` section 2 (verified: DS Button focused via keyboard gets `2px solid rgb(31,111,235)`).
6. **Checkbox, Radio, Switch are not keyboard accessible and their label text is not clickable.** They are `<span role=checkbox|radio|switch>` with `onClick` on the 16px span only, no `tabIndex`. Measured: Tab order skips them entirely; clicking the label text does not call `onChange`; hit area 18x18 px (switch 36x20). Use the native-input replacements `Check`, `RadioField`, `SwitchField` in `kit-ui.jsx` (same look, 44px hit target, verified Space toggles and label click works).
7. **Tabs, Checkbox, Radio, Switch are controlled-only.** `Tabs` without `value` renders first tab active forever; `onChange` fires but nothing changes (verified). Accordion is uncontrolled-only (`defaultOpen` indices). Alert owns its dismiss state.
8. **Passing `onFocus`/`onBlur` to Input, Textarea or Select silently disables their focus ring/border** (the DS wrapper handlers are overridden by the later `{...rest}` spread). Verified: with an `onFocus` prop, border stays `#3E3F47` and ring never appears. Do not pass those two props; wrap in a div with `onFocusCapture` if you need them.
9. **DS Badge fails WCAG AA for 5 of its 6 tones** in at least one theme (soft/outline/solid): e.g. dark red soft 3.67:1, light green soft 2.74:1, light amber soft 2.42:1, solid green/amber with white text 3.2:1/2.8:1 in both themes. Use `Pill` (tone tokens, all >= 7:1) for status; keep Badge for counts and neutral tags only.
10. **`--fg-3` is not a text colour.** 4.19:1 on dark canvas, 3.75 on cards, 2.97 on light canvas. Use `--fg-2` for all small text and for icons that carry meaning. `--accent`/`--danger`/`--link` as TEXT on dark fail too (4.14/4.16/3.69): use `--text-link-text-default`, `--text-destructive-text-default` (see `--kx-*-text` tokens in `kit.css`).
11. **The App Shell template is dark-only with hard-coded hex** (`#08090B`, `#3E3F47`, `#76777F`, `#8A8B93`, `#26272E`, `#34353D`, `#2E9E4B`, `#121417`, `#fff`...). Rendered in light mode it stays 100% dark (screenshot `work/shots/shell-orig-light.png`). It is also a `.dc.html` `<x-dc>` template needing the 69KB `support.js` runtime (`style-hover` attribute, `<helmet>`). Do not use the runtime: use the React port `AppShell` in `kit-ui.jsx` (same DOM, same metrics, tokens instead of hex, hover via CSS).
12. **The DS has no popover layer**: `Tooltip` is `position:absolute` inside a `position:relative` span, with no portal, so it is clipped by any ancestor with `overflow:hidden|auto` (including `Card`, which is `overflow:hidden`). Verified: a 294px tooltip inside a 242px Card is cut off. Do not put tooltips inside Cards or scroll containers near an edge; rail tooltips (side="right") are fine because `.kx-body` is wide.
13. **`Toast` is presentational only** (no provider, no timer, no stack, no portal, role fixed to `status`). `ToastProvider`/`useToast` in `kit-ui.jsx` is verified (auto-dismiss 5s, errors stay, error uses `role=alert`).
14. **`Button` has no default `type`** so it submits forms (`button.type === "submit"`). Pass `type="button"` inside any `<form>`.
15. **`Breadcrumb` renders every item as `<a href="#">` unless you pass `href`**, and `CrumbItem` has no `onClick`. In a hash-routed app a missing href sends you to `#` (route reset). Always pass `href: '#/route'`.
16. **DS `Select.onChange` gets the native event** (`e.target.value`), while `Checkbox/Switch/Tabs` get the value (`boolean`/`string`) and `Radio` gets `value ?? true`.
17. **Skeleton uses a gradient** (DS-internal, fine). Everything else you add must have no gradients. Cover gradient PNG is not shipped (`assets/README.md`).
18. **Fonts**: Inter + Inter Display are self-hosted but only 10 of the declared TTFs exist in `design-system/fonts/` (18pt Light/Regular/Medium/SemiBold/Bold/Italic, 28pt Regular/Medium/SemiBold/Bold). Weights 100/200/800/900 and Inter Display 300/800/900 would 404 if used: use 400/500/600/700 only. **Geist and Geist Mono come from Google Fonts via `@import` in `colors_and_type.css`**; offline they fall back to `ui-monospace`. `font-variant-numeric: tabular-nums` works on both Inter and Inter Display (verified: `1111111111` and `0000000000` render the same width). For offline-proof mono: `npm i -D @fontsource/geist-mono` (5.3.0 reachable on the registry) and add a local `@font-face`. Also: `colors_and_type.css` `@import`s cdnjs Font Awesome; that fails offline silently and the repo already loads `vendor/fontawesome/` (6.5.2 free, all icon names used in this file were checked to exist).
19. **Do not edit `design-system/`.** All fixes live in app CSS loaded AFTER `design-system/styles.css` (the order in `index.html` is already right). Several fixes use `:root[data-theme="dark"]` selectors to match the specificity of the fig-tokens layer.
20. **Sticky table header only works inside a scroll wrapper with a max-height** (`DataTable maxHeight={n}`); it will not stick to the page scroll (verified).

---

## 1. Wiring and layers

```html
<!-- index.html (already correct) -->
<link rel="stylesheet" href="vendor/fontawesome/css/all.min.css">
<link rel="stylesheet" href="design-system/styles.css">   <!-- @import fig-tokens.css, then colors_and_type.css -->
<link rel="stylesheet" href="dist/app.css">                <!-- ours: must come last -->
<script src="vendor/react.production.min.js"></script> ... <script src="design-system/_ds_bundle.js"></script> <script src="dist/app.js"></script>
```

Layer facts (verified):
- `fig-tokens.css` (140KB): raw ramps + Figma semantic layer. Light values in `:root`, dark overrides in `:root[data-theme="dark"], .dark`. 256 theme-aware tokens. Also `:root[data-mode=shadcn|your-brand|medium|large|x-large|mobile]` (ignore).
- `colors_and_type.css` (12KB): curated dark-first API. `:root` = dark. `:root[data-theme="light"], .ds-light` = light overrides (so `.ds-light` scopes a light island inside a dark page). Contains `.ds-*` type classes and keyframes `ds-spin`, `ds-shimmer`, `ds-indeterminate`.
- Components read ONLY the curated tokens (`--bg-1`, `--fg-1`, `--accent`...). Used by components: `--font-sans --fg-1 --accent --radius-pill --danger --bg-2 --radius-md --fg-3 --fg-2 --border-2 --bg-3 --bg-1 --radius-lg --warning --success --border-1 --focus-ring --shadow-2 --radius-sm --border-strong --bg-canvas --shadow-3 --shadow-1 --purple-600 --accent-pressed --accent-hover --accent-fg`.
- Hard-coded colours in component JSX (grep of `#hex` and `rgba(`): `Badge.jsx:18 #FFFFFF` (solid text), `Button.jsx:19 #BF1B2B #A40E26 #FFFFFF` (destructive hover/pressed/text), `Checkbox.jsx:21 #FFFFFF` (tick), `Switch.jsx:19 #FFFFFF` (knob). No `rgba(` anywhere. `color-mix(in srgb, ...)` is used by Alert, Badge, Input (needs Chrome 111+, Safari 16.2+, Firefox 113+: fine for a demo; esbuild leaves it intact).
- The DS shadows (`--shadow-1/2/3`) are identical in both themes and tuned for light (`rgba(46,51,56,.1)`); in dark they are nearly invisible. Use `--kx-shadow-pop` for popovers/modals (in `kit.css`).
- The DS's own advisory lint (`_adherence.oxlintrc.json`, not part of the repo) flags raw hex, raw `NNpx` literals in JS, fonts other than Inter/Inter Display/Geist/Geist Mono, and props not declared in the `.d.ts`. It is `warn` only and contradicts the README (icon-only buttons need `aria-label`), so treat as guidance.

---

## 2. Tokens

### 2.1 Curated layer (the API to use). Resolved in the browser, both themes

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg-canvas` | `#0E0F12` | `#FFFFFF` | page/panel canvas |
| `--bg-1` | `#1A1B22` | `#F9FAFB` | card, input, popover surface, table header band |
| `--bg-2` | `#28292F` | `#F2F3F7` | hover, segmented track, tooltip/toast bg, secondary button |
| `--bg-3` | `#3E3F47` | `#E6E6EB` | pressed, toggle off, skeleton, progress track, avatar |
| `--fg-1` | `#FFFFFF` | `#1A1B22` | primary text |
| `--fg-2` | `#ADAFB7` | `#5C5D64` | secondary text, labels, icons (AA) |
| `--fg-3` | `#74757E` | `#95959F` | tertiary: decorative icons only, NOT text (fails AA) |
| `--fg-disabled` | `#5C5D64` | `#ADAFB7` | disabled text |
| `--border-1` | `#28292F` | `#E6E6EB` | hairline: cards, row dividers |
| `--border-2` | `#3E3F47` | `#C1C1CC` | control border, button outline/secondary, toast/tooltip |
| `--border-strong` | `#5C5D64` | `#ADAFB7` | checkbox/radio border (remapped in kit.css) |
| `--accent` | `#1F6FEB` | `#0969DA` | brand blue: primary button, active, focus border |
| `--accent-hover` | `#1158C7` | `#0D419D` | primary hover |
| `--accent-pressed` | `#0D419D` | `#043384` | primary pressed |
| `--accent-fg` | `#FFFFFF` | `#FFFFFF` | text on accent |
| `--link` | `#0969DA` | `#0969DA` | link (3.7:1 on dark: avoid for text) |
| `--danger` | `#DA3633` | `#CA232A` | destructive bg/border (text: use --kx-danger-text) |
| `--success` | `#3EA251` | `#3EA251` | success (text: use --kx-success-text) |
| `--warning` | `#CB8F09` | `#CB8F09` | warning (text: use --kx-warning-text) |
| `--purple-600` | `#8A38F5` | `#8A38F5` | purple tone |
| `--focus-ring` | `#404040` | `rgba(31,111,235,0.32)` | input focus halo (dark value is a DS bug; fixed in kit.css) |

Raw palette (same in both themes; `colors_and_type.css`): `--grey-975 #08090B, --grey-950 #0E0F12, --grey-925 #121417, --grey-900 #1A1B22, --grey-800 #28292F, --grey-700 #3E3F47, --grey-600 #5C5D64, --grey-500 #74757E, --grey-400 #95959F, --grey-300 #ADAFB7, --grey-200 #C1C1CC, --grey-150 #E6E6EB, --grey-100 #F2F3F7, --grey-50 #F9FAFB, --white #FFF, --black #000`; `--blue-900 #043384, --blue-800 #0D419D, --blue-700 #1158C7, --blue-600 #0969DA, --blue-500 #1F6FEB, --blue-100 #D1E4FE, --blue-50 #EBF3FF`; `--purple-600 #8A38F5, --purple-700 #6144C1`; `--red-700 #BF1B2B, --red-600 #CA232A, --red-500 #DA3633`; `--green-600 #3EA251`; `--amber-600 #CB8F09`.

Scales:
- Radius: `--radius-xs 2px` chips, `--radius-sm 4px` tags/checkbox, `--radius-md 6px` inputs/small buttons, `--radius-lg 8px` buttons/cards/alerts/toasts, `--radius-xl 12px` dialogs, `--radius-pill 9999px`.
- Spacing (4px grid): `--space-1 4, -2 8, -3 12, -4 16, -5 20, -6 24, -8 32, -10 40, -12 48, -14 56`.
- Shadow: `--shadow-1 0 1px 2px rgba(0,0,0,.05)` (buttons/chips), `--shadow-2` (cards/popovers), `--shadow-3` (modals/menus), `--shadow-inner-hairline`.
- Motion: 150ms ease-out hover, 200ms ease-in-out opens, skeleton 1.4s. No bounce. Disabled = opacity .4. Press = darker step.
- Type families: `--font-sans` Inter, `--font-display` Inter Display (24px and up), `--font-secondary` Geist, `--font-mono` Geist Mono.
- Type sizes: `--text-{display-1 112, display-2 60, h1 36, h2 30, h3 24, h4 20, body-md 16, body 14, body-sm 13, caption 12, micro 10, button 14, button-sm 12}-{size,lh,weight}`.

### 2.2 Figma semantic layer (names for surfaces, text, borders, tones). Light and dark values

Use these when you need a token the curated layer lacks (status tints, link text, destructive text). Avoid `--general-*`, `--legacy-*`, `--unofficial-*`, `--decorative-*` (inconsistent: e.g. `--decorative-modal-overlay-default` is `#FFFFFF` in light), and `--depreciated-*` / `--swatch-depreciated-*` except the specific ones used in `kit.css` (they are the only AA-safe status colours in light; their names contain the DS's own misspelling "depreciated").

**Surfaces**

| Token | Dark | Light |
|---|---|---|
| `--background-surface` | `#121417` | `#F2F3F7` |
| `--background-subtle` | `#1A1B22` | `#F9FAFB` |
| `--background-sunken` | `#08090B` | `#E6E6EB` |
| `--background-emphasis` | `#28292F` | `#95959F` |

**Borders**

| Token | Dark | Light |
|---|---|---|
| `--border-standard-default` | `#5C5D64` | `#C1C1CC` |
| `--border-standard-subtle` | `#3E3F47` | `#E6E6EB` |
| `--border-standard-faint` | `#1A1B22` | `#F2F3F7` |
| `--border-standard-hover` | `#74757E` | `#95959F` |
| `--border-standard-pressed` | `#95959F` | `#95959F` |
| `--border-standard-selected` | `#1F6FEB` | `#0969DA` |
| `--border-secondary-default` | `#C1C1CC` | `#C1C1CC` |
| `--border-info-default` | `#1F6FEB` | `#0969DA` |
| `--border-info-subtle` | `rgba(56,139,253,0.5)` | `rgba(88,166,255,0.5)` |
| `--border-success-default` | `#4EB35F` | `#3EA251` |
| `--border-success-subtle` | `rgba(62,162,81,0.5)` | `rgba(97,194,113,0.5)` |
| `--border-warning-default` | `#CB8F09` | `#CB8F09` |
| `--border-warning-subtle` | `rgba(217,161,37,0.5)` | `rgba(217,161,37,0.5)` |
| `--border-error-default` | `#DA3633` | `#CA232A` |
| `--border-error-subtle` | `rgba(255,129,130,0.5)` | `rgba(229,76,71,0.5)` |

**Text**

| Token | Dark | Light |
|---|---|---|
| `--text-standard-text-default` | `#FFFFFF` | `#1A1B22` |
| `--text-standard-text-subtle` | `#ADAFB7` | `#5C5D64` |
| `--text-standard-text-extra-subtle` | `#95959F` | `#95959F` |
| `--text-standard-text-disabled` | `#5C5D64` | `#ADAFB7` |
| `--text-link-text-default` | `#76B5FD` | `#0969DA` |
| `--text-link-text-hover` | `#58A6FF` | `#1158C7` |
| `--text-link-text-pressed` | `#388BFD` | `#043384` |
| `--text-destructive-text-default` | `#F97D79` | `#BF1B2B` |
| `--text-destructive-text-hover` | `#DA3633` | `#A40E26` |

**Icons**

| Token | Dark | Light |
|---|---|---|
| `--icons-standard-default` | `#C1C1CC` | `#5C5D64` |
| `--icons-standard-subtle` | `#95959F` | `#95959F` |
| `--icons-standard-hover` | `#E6E6EB` | `#3E3F47` |
| `--icons-emphasised-default` | `#FFFFFF` | `#1A1B22` |
| `--icons-interactive-default` | `#76B5FD` | `#0969DA` |
| `--icons-destructive-default` | `#E54C47` | `#CF222E` |

**Actions**

| Token | Dark | Light |
|---|---|---|
| `--action-primary-default` | `#1F6FEB` | `#0969DA` |
| `--action-primary-hover` | `#1158C7` | `#0D419D` |
| `--action-primary-pressed` | `#0D419D` | `#043384` |
| `--action-primary-text-default` | `#FFFFFF` | `#F2F3F7` |
| `--action-secondary-default` | `rgba(116,117,126,0.15)` | `rgba(116,117,126,0.1)` |
| `--action-secondary-hover` | `rgba(116,117,126,0.3)` | `rgba(116,117,126,0.2)` |
| `--action-secondary-text-default` | `#C1C1CC` | `#1A1B22` |
| `--action-destructive-default` | `#DA3633` | `#CA232A` |
| `--action-destructive-hover` | `#BF1B2B` | `#A40E26` |
| `--action-tertiary-default` | `#0E0F12` | `#F9FAFB` |
| `--action-tertiary-hover` | `#28292F` | `#F2F3F7` |

**Cards**

| Token | Dark | Light |
|---|---|---|
| `--card-surface-default` | `#28292F` | `#FFFFFF` |
| `--card-surface-hover` | `#3E3F47` | `#F2F3F7` |
| `--card-surface-subtle` | `#1A1B22` | `#F9FAFB` |
| `--card-elevated-surface-default` | `#5C5D64` | `#F2F3F7` |
| `--card-selected-surface-default` | `rgba(56,139,253,0.1)` | `rgba(88,166,255,0.15)` |
| `--card-selected-surface-hover` | `rgba(56,139,253,0.2)` | `rgba(88,166,255,0.4)` |

**Tones (status/tag backgrounds). `surface-*` pairs are AA; `strong-*` fail for success/warning/neutral**

| Token | Dark | Light |
|---|---|---|
| `--tone-info-surface-default` | `#001B4C` | `#EBF3FF` |
| `--tone-info-surface-hover` | `#043384` | `#B6D4FD` |
| `--tone-info-surface-text` | `#D1E4FE` | `#043384` |
| `--tone-info-strong-default` | `#1F6FEB` | `#0969DA` |
| `--tone-info-strong-text` | `#FFFFFF` | `#EBF3FF` |
| `--tone-success-surface-default` | `#01260F` | `#C7EFCF` |
| `--tone-success-surface-hover` | `#1D6A2E` | `#A9E7B5` |
| `--tone-success-surface-text` | `#E5F7E8` | `#01260F` |
| `--tone-success-strong-default` | `#2E9144` | `#2E9144` |
| `--tone-success-strong-text` | `#E5F7E8` | `#E5F7E8` |
| `--tone-warning-surface-default` | `#633C01` | `#F2E0A7` |
| `--tone-warning-surface-hover` | `#B97F01` | `#E5C777` |
| `--tone-warning-surface-text` | `#FDF6E5` | `#633C01` |
| `--tone-warning-strong-default` | `#CB8F09` | `#CB8F09` |
| `--tone-warning-strong-text` | `#FFFFFF` | `#FFFFFF` |
| `--tone-error-surface-default` | `#440005` | `#FFD8D8` |
| `--tone-error-surface-hover` | `#82071E` | `#FFADAC` |
| `--tone-error-surface-text` | `#FFECEC` | `#82071E` |
| `--tone-error-strong-default` | `#DA3633` | `#CF222E` |
| `--tone-error-strong-text` | `#FFFFFF` | `#FFFFFF` |
| `--tone-neutral-surface-default` | `#28292F` | `#E6E6EB` |
| `--tone-neutral-surface-hover` | `#3E3F47` | `#C1C1CC` |
| `--tone-neutral-surface-text` | `#F9FAFB` | `#0E0F12` |
| `--tone-neutral-strong-default` | `#5C5D64` | `#95959F` |
| `--tone-neutral-strong-text` | `#FFFFFF` | `#FFFFFF` |

**Status overlays**

| Token | Dark | Light |
|---|---|---|
| `--status-info-surface-bg-overlay` | `#2A3344` | `#EBF3FF` |
| `--tone-success-surface-overlay` | `#293531` | `#E5F7E8` |
| `--tone-warning-surface-overlay` | `#37322B` | `#FDF6E5` |
| `--tone-error-surface-overlay` | `#3D2D32` | `#FFECEC` |

**Swatches (high/low contrast status colours; "depreciated" is the DS spelling)**

| Token | Dark | Light |
|---|---|---|
| `--swatch-depreciated-success-high-contast-bg` | `#1E7E37` | `#1E7E37` |
| `--swatch-depreciated-success-low-contrast-bg` | `#01260F` | `#C7EFCF` |
| `--swatch-depreciated-success-low-contrast-text` | `#A9E7B5` | `#1C5426` |
| `--swatch-depreciated-yellow-high-contast-bg` | `#905F01` | `#905F01` |
| `--swatch-depreciated-yellow-low-contrast-bg` | `rgba(144,95,1,0.4)` | `rgba(217,161,37,0.4)` |
| `--swatch-depreciated-yellow-low-contrast-text` | `#F2E0A7` | `#633C01` |
| `--swatch-depreciated-error-high-contast-bg` | `#DA3633` | `#CA232A` |
| `--swatch-depreciated-error-low-contrast-text` | `#FFD8D8` | `#82071E` |
| `--swatch-depreciated-info-high-contast-bg` | `#1F6FEB` | `#0969DA` |
| `--swatch-depreciated-info-low-contrast-text` | `#D1E4FE` | `#043384` |
| `--swatch-grey-high-contrast-bg` | `#74757E` | `#74757E` |
| `--swatch-grey-low-contrast-bg` | `#28292F` | `#F2F3F7` |
| `--swatch-purple-low-contrast-bg` | `#2F1C52` | `#DDD1F7` |
| `--swatch-purple-low-contrast-text` | `#EBE2FB` | `#512A97` |
| `--depreciated-status-colours-default-warning` | `#D9A125` | `#CB8F09` |
| `--depreciated-status-colours-default-success` | `#4EB35F` | `#3EA251` |
| `--depreciated-status-colours-default-error` | `#DA3633` | `#CF222E` |
| `--depreciated-status-colours-default-info` | `#1F6FEB` | `#0969DA` |

**Misc (do not trust)**

| Token | Dark | Light |
|---|---|---|
| `--decorative-modal-overlay-default` | `rgba(14,15,18,0.7)` | `#FFFFFF` |
| `--decorative-overlay-default` | `rgba(255,255,255,0.2)` | `#FFFFFF` |
| `--focus-ring-error` | `#6D2E2F` | `#FCA5A5` |


Note the Figma `--card-surface-default` is `#28292F` in dark, but the registered `Card` component uses `--bg-1` (`#1A1B22`). Follow the component, not the token.

---

## 3. Components (19). Props, usage, behaviour, a11y, quirks

All components are function components exported on the namespace. Common conventions: `className` + `style` + `...rest` (rest lands on the root element unless stated), colours from curated tokens, `fontFamily: var(--font-sans)`, icons are Font Awesome SOLID names passed WITHOUT the `fa-` prefix (`leftIcon="plus"`). None use `forwardRef`.

Setup used by every snippet: `const { Button, Badge, Input, Textarea, Select, Checkbox, Radio, Switch, Card, Avatar, Alert, Toast, Tooltip, Tabs, Accordion, Breadcrumb, Progress, Spinner, Skeleton } = window.Springboard20DesignSystem_019e02;`

### 3.1 Button
| Prop | Values | Default |
|---|---|---|
| `variant` | `primary` `secondary` `outline` `ghost` `destructive` | `primary` |
| `size` | `sm` (28px, 12px text, radius-md) `md` (36px, 14px, radius-lg) `lg` (40px) | `md` |
| `leftIcon` / `rightIcon` | FA solid name | none |
| `loading` | bool: spinner replaces leftIcon, button disabled, `aria-busy` | false |
| `disabled` | bool, opacity .4 | false |
| rest | all `<button>` attrs (`onClick`, `type`, `aria-*`, `id`, `data-*`) | |

Colours: primary `--accent` -> `--accent-hover` -> `--accent-pressed`, text `--accent-fg`; secondary `--bg-2` (+border-2) -> `--bg-3`; outline/ghost transparent -> `--bg-2`; destructive `--danger` -> hard-coded `#BF1B2B` -> `#A40E26`, white text. Hover/press are tracked in React state.
```jsx
<Button leftIcon="download" onClick={exportReport}>Export report</Button>
<Button variant="outline" size="sm" leftIcon="ellipsis" aria-label="More actions" style={{ width: 32, padding: 0 }} />  {/* icon-only */}
<Button variant="destructive" onClick={confirm}>Remove contract</Button>
<Button loading>Importing</Button>
<Button style={{ width: '100%' }}>Full width</Button>   {/* no fullWidth prop */}
```
Quirks: no default `type` (submits forms). `outline:none` inline with no replacement (fix in kit.css). Heights 28/36/40 are below the 44px target (kit.css adds `min-height:44px` for `(pointer: coarse)`). Passing `onMouseEnter/Leave/Down/Up` via rest overrides the internal hover handlers (rest spreads last) so hover colour stops. Icon-only has no API: pass no children plus `aria-label` and a fixed `width` with `padding:0`. No `as`/`href`: it is always a `<button>`. `loading` keeps the label text. MOD rule: max one `primary` per section; destructive only inside a confirm dialog.

### 3.2 Badge
| Prop | Values | Default |
|---|---|---|
| `tone` | `neutral` `blue` `green` `amber` `red` `purple` | `neutral` |
| `variant` | `soft` (16% tint) `solid` `outline` | `soft` |
| `size` | `sm` (18px/11px) `md` (22px/12px) `lg` (26px/13px) | `md` |
| `dot` | leading 6px dot in `currentColor` | false |
| `leftIcon` | FA solid name | |
| `onRemove` | `() => void`; renders trailing x button with `aria-label="Remove"` (tag mode) | |

Tone to token: neutral `--fg-2`, blue `--accent`, green `--success`, amber `--warning`, red `--danger`, purple `--purple-600`. So success/warning/danger/info/neutral = green/amber/red/blue/neutral (coverage is complete) BUT see section 5: most combinations fail 4.5:1.
```jsx
<Badge tone="neutral">38</Badge>                         {/* count: fine */}
<Badge tone="neutral" onRemove={() => clear('waste')}>waste</Badge>   {/* removable tag */}
```
Quirks: not interactive, no `as`; remove button label is the generic "Remove" and cannot be changed (use `.kx-tag` with your own contextual `aria-label` when you need a removable filter tag). Solid text is hard-coded `#FFFFFF` (neutral solid uses `--bg-canvas`). Use `Pill` for status.

### 3.3 Input
| Prop | Values | Default |
|---|---|---|
| `size` | `sm` 32 / `md` 36 / `lg` 40 | `md` |
| `leftIcon` | FA solid (decorative, `pointer-events:none`) | |
| `error` | red border + red ring, `aria-invalid` | false |
| `disabled` | opacity .5 | false |
| `className`, `style` | applied to the WRAPPER `div` (`inline-flex; width:100%`) | |
| rest | `<input>` attrs: `type value defaultValue onChange placeholder id name aria-label min max ...` | |

Controlled or uncontrolled (native). Focus: border `--accent` + 3px `--focus-ring`, transition .15s. 
```jsx
<label htmlFor="q" className="ds-label">Supplier</label>
<Input id="q" leftIcon="magnifying-glass" placeholder="Search suppliers" value={q} onChange={(e) => setQ(e.target.value)} />
<Input error aria-describedby="q-err" />  <div id="q-err" className="kx-caption" style={{color:'var(--kx-danger-text)'}}>Search failed. The supplier list did not load. Refresh and try again.</div>
```
Quirks: `onFocus`/`onBlur` in rest REPLACE the internal handlers (focus styling dies; verified). No label/helper/error-message slot: compose yourself (errors must be [What]+[Why]+[How]). No right-side icon/clear button. Placeholder colour is the browser default `#757575` (fails AA on both themes; fixed globally in kit.css). Width: wrap in a sized div or pass `style={{width: 220}}`. Dark focus ring bug (section 0.3). Border `--border-2` is 1.6 to 1.8:1 against its surface (DS-native, fails the 3:1 control-boundary rule; section 5).

### 3.4 Textarea
Props: `error`, `disabled`, `rows` (4), `className`/`style` (applied to the `<textarea>` itself, unlike Input), rest to textarea. `minHeight:64`, `resize:vertical`. Same `onFocus`/`onBlur` override bug. `<Textarea rows={3} placeholder="Add a note" value={v} onChange={(e)=>setV(e.target.value)} />`

### 3.5 Select (native `<select>` with a chevron)
| Prop | Notes |
|---|---|
| `options` | `(string | {value,label})[]`; omit to pass `<option>`/`<optgroup>` children |
| `size` | `sm` 32 / `md` 36 / `lg` 40 |
| `error`, `disabled` | |
| `className`, `style` | wrapper div |
| rest | `<select>` attrs: `value defaultValue onChange name id aria-label` |

```jsx
<Select aria-label="Council" value={council} onChange={(e) => setCouncil(e.target.value)}
  options={[{ value: 'ex', label: 'Exeter' }, 'Haringey']} />
<Select defaultValue=""><option value="" disabled>Choose a supplier</option><option>Biffa</option></Select>   {/* no placeholder prop */}
```
Quirks: `onChange` receives the native event. No placeholder prop. Not searchable, no multi-select (the Figma file has one; it is not registered). Popup follows `color-scheme` (add it, section 0.4). Same onFocus/onBlur override bug. Children are ignored when `options` is given.

### 3.6 Checkbox
Props: `checked` (false), `indeterminate`, `disabled`, `label`, `onChange(checked: boolean)`, `className`, `style`, rest to the `<label>`. **Controlled only**: no `defaultChecked`, no internal state. `aria-checked` is `"mixed"` for indeterminate; clicking an indeterminate box calls `onChange(!checked)`.
```jsx
<Checkbox checked={all} indeterminate={some && !all} onChange={setAll} label="Select all" />
```
Quirks (verified): span not focusable (absent from Tab order); label text click does nothing; hit area 18x18; no `name`/`value`/form participation; unchecked border is `--border-strong` (2.1:1 light, 2.6:1 dark; fixed in kit.css by remapping to `--grey-500`); `aria-label`/`id` land on the label, not on the role=checkbox span. For table row selection use `Check` from `kit-ui.jsx`.

### 3.7 Radio
Props: `checked`, `disabled`, `label`, `name` (accepted but never applied: no `<input>` exists), `value`, `onChange(value ?? true)`, `className`, `style`, rest to label. Group = you render several and set `checked={sel === v}`; no arrow-key navigation, no `radiogroup` role. Same a11y problems as Checkbox. Use `RadioField` from kit-ui or `Segmented`.
```jsx
{['a','b'].map(v => <Radio key={v} name="g" value={v} checked={sel === v} onChange={setSel} label={'Option ' + v} />)}
```

### 3.8 Switch
Props: `checked`, `disabled`, `size` (`sm` 28x16 | `md` 36x20, default), `label`, `onChange(checked: boolean)`, `className`, `style`, rest to label. Controlled only. Quirks: same keyboard/label issues; **in light the OFF state is a white knob on a `#E6E6EB` track on a white page (1.24:1)**, nearly invisible. Use `SwitchField` (off track `--grey-500`, 4.58:1). `<Switch checked={on} onChange={setOn} label="Include indicative figures" />`

### 3.9 Card
Props: `title`, `description`, `footer`, `padding` (16, px number), `elevated` (adds `--shadow-2`), `children`, `className`, `style`, rest to root div.
Look: bg `--bg-1`, border `--border-1`, radius-lg, `overflow:hidden`; body wrapper `padding`; title `600 16px/1.3`; description `400 14px/1.45 --fg-2`; children `margin-top:12`; footer `padding: 12px {padding}px`, top border, bg `--bg-canvas`, `justify-content:flex-end; gap:8`.
```jsx
<Card title="Renewal radar" description="Notice windows in the next 12 months" footer={<><Button variant="outline" size="sm">Cancel</Button><Button size="sm">Save view</Button></>}>...</Card>
<Card padding={0} style={{ background: 'var(--kx-card-bg)' }}>{/* custom header + table */}</Card>
```
Quirks: `title` is a `<div>` not a heading; `title` prop shadows the HTML `title` attribute; clips children (tooltips, menus, focus rings at the edge); no hover/clickable/selected variant (pass `onClick role tabIndex` yourself or use `.kx-stat--button`); in light, `--bg-1` (#F9FAFB) on a white panel is barely distinguishable (border only): the kit maps card bg to `--bg-canvas` in light via `--kx-card-bg`. Using `padding={0}` removes padding for the title block too, so build table cards with `.kx-card` instead.

### 3.10 Avatar
Props: `src`, `initials` (1-2 letters, not auto-uppercased), `size` (number, default 32), `shape` (`circle` | `rounded`), `status` (`online` `away` `busy` `offline`), rest to the root span. Initials font: <=24px -> 10px, <=36 -> 12px, else 38% of size. Status dot gets a 2px `--bg-1` ring (so it looks cut on other surfaces). Image `alt=""` (decorative): add `aria-label` via rest if the avatar names a person. Colours: `--bg-3` fill, `--fg-1` text (AA in both themes). `<Avatar initials="JS" size={32} />`

### 3.11 Alert
Props: `type` (`info` `success` `warning` `error`, default `info`), `title`, `dismissible`, `onDismiss`, children (body), className, style, rest to root. Fixed `role="alert"` (rest can override: pass `role="status"` for non-urgent info). Icons `circle-info / circle-check / triangle-exclamation / circle-exclamation`. Background `color-mix(12% tone, --bg-1)`, border 35% tone. Dismiss state is internal (`show`); re-show only by changing `key`. No action slot (put Buttons in children). Title 14/600 `--fg-1`, body 13/1.5 `--fg-2` (AA in both themes).
```jsx
<Alert type="warning" title="Spend is close to the cap">Waste collection has used 94% of its cap. Check clause 4.2 before you approve more spend.</Alert>
```

### 3.12 Toast
Props: `type`, `title`, `onClose` (renders an x button `aria-label="Close"`), children (body), className, style, rest to root (default `role="status"`; pass `role="alert"` for errors). 360px wide (`maxWidth:100%`), bg `--bg-2`, border `--border-2`, shadow-3. **Meant to be rendered inline by the host; there is no provider, queue, timer, portal or animation.** The DS showcase just renders it statically. Mount pattern (verified) = `ToastProvider` + `useToast()` in `kit-ui.jsx`:
```jsx
const toast = useToast();
toast({ type: 'success', title: 'Contract C-1042 removed', message: 'Its spend lines are now unmatched. You can restore it from the register.' });
toast({ type: 'error', title: 'Import failed', message: 'File exceeds 10MB limit. Compress the file and retry.' });  // stays until closed
```
MOD copy: success = specific + consequence; error = [What]+[Why]+[How]. Destructive action = confirm dialog THEN toast.

### 3.13 Tooltip
Props: `label` (node), `side` (`top` default | `bottom` | `left` | `right`), `children` (one trigger), `style` (wrapper span). That is the entire placement API: centred on the cross axis, 6px gap, `white-space:nowrap` (long labels never wrap), `z-index:50`, `pointer-events:none`. Shows on `mouseenter` and `focus` (bubbled React focus), hides on leave/blur. No delay, no Escape to dismiss, no collision flipping, no portal, no `id`/`aria-describedby` wiring (measured: `describedby: null`). Measured sizes: "Tooltip top" 79x28. Clipped by `overflow:hidden|auto` ancestors (verified in a Card). 
```jsx
<Tooltip label="Renewal radar" side="right"><button className="kx-railbtn" aria-label="Renewal radar">...</button></Tooltip>
```
Do not rely on tooltips for essential info (touch has no hover). Icon-only buttons still need `aria-label`.

### 3.14 Tabs (underline style)
Props: `items: {value: string; label: ReactNode; icon?: string}[]`, `value`, `onChange(value: string)`, className, style, rest to the `role=tablist` div (pass `aria-label`). **Controlled only**; with no `value` the first tab is shown active and clicks never change it (verified). No tab panels, no `aria-controls`, no arrow-key roving (every tab is a Tab stop), no per-tab `disabled`, no overflow scroll (flex row, 37px tall, `gap:4`). Label can contain a Badge for counts.
```jsx
const [tab, setTab] = React.useState('3');
<Tabs aria-label="Notice window" value={tab} onChange={setTab} items={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months', icon: 'clock' }]} />
{tab === '3' && <div role="tabpanel">...</div>}
```
For view toggles that are not content tabs, use `Segmented`.

### 3.15 Accordion
Props: `items: {title: ReactNode; content: ReactNode}[]`, `allowMultiple` (false), `defaultOpen: number[]` (indices, uncontrolled, read once), className, style. Single-open by default (clicking the open one closes it). Panels unmount when closed (child state is lost). Open state is keyed by array index. Header is a `<button aria-expanded>` (no `aria-controls`, panel has no `role=region`). Header bg `--bg-1`, panel has NO background (shows page canvas). Good for the clause list in the drawer (title = "Clause 4.2 Value and cap", content = text + source link).

### 3.16 Breadcrumb
Props: `items: {label: ReactNode; href?: string; icon?: string}[]`, className, style, rest to `<nav aria-label="Breadcrumb">`. Last item is `aria-current="page"` with `pointer-events:none`. All items are `<a href={href || "#"}>`: pass hash hrefs. No per-item `onClick`. Separator is `chevron-right`.
`<Breadcrumb items={[{ label: 'Home', icon: 'house', href: '#/' }, { label: 'Renewals', href: '#/renewals' }, { label: 'C-1042' }]} />`

### 3.17 Progress
Props: `value` (0-100, clamped: **cannot show over 100%**), `indeterminate`, `size` (`sm` 4 | `md` 6 | `lg` 8), `tone` (`blue` `green` `amber` `red`), className, style, rest to the track. `role=progressbar` with `aria-valuenow/min/max` but no accessible name: pass `aria-label`. Track `--bg-3`, pill ends, `transition: width .3s`. For spend vs cap with a cap marker and overrun use `CapMeter`.

### 3.18 Spinner
Props: `size` (18), `thickness` (2), `color` (any CSS colour, default `var(--accent)`), rest. `role="status" aria-label="Loading"` (override via rest). Track `--bg-3`. `<Spinner size={24} color="var(--success)" />`

### 3.19 Skeleton
Props: `variant` (`text` h12 radius-sm | `rect` h40 radius-md | `circle` w=h), `width`, `height` (number or string), rest. `aria-hidden`; shimmer is a `linear-gradient(--bg-2, --bg-3)` animated 1.4s (`ds-shimmer`). Wrap the loading region with `aria-busy="true"` yourself. Faint in light (bg-2/bg-3 on white) but readable.
```jsx
<div aria-busy="true"><Skeleton width="60%" /><Skeleton variant="rect" height={120} /></div>
```

### 3.20 Controlled vs uncontrolled summary
| Component | Value prop | Mode | Callback arg |
|---|---|---|---|
| Input, Textarea | native `value`/`defaultValue` | both | native event |
| Select | native `value`/`defaultValue` | both | native event |
| Checkbox, Switch | `checked` | controlled only | `boolean` |
| Radio | `checked` (per radio) | controlled only | `value ?? true` |
| Tabs | `value` | controlled only | `string` |
| Accordion | `defaultOpen` | uncontrolled only | none |
| Alert | internal `show` | uncontrolled | `onDismiss()` |
| Tooltip | internal hover/focus | uncontrolled | none |

---

## 4. Render audit: dark vs light (all 19, every variant)

Harness: `kit/harness.jsx` (served from `.scratch/`, since removed). Screenshots in `work/shots/`: `{dark,light}-s-button|s-badge|s-forms|s-select|s-feedback|s-nav.png`, tooltips `dark-tt-*.png`, focus `{dark,light}-btn-focus|inp-focus.png`. Console: no JS errors, `__errors` empty; only a favicon 404 and the unreachable Google/cdnjs `@import` (harmless; add `<link rel="icon" href="data:,">` to silence).

| Component | Dark | Light | Notes |
|---|---|---|---|
| Button | OK | OK | All 5 variants x 3 sizes read well; disabled (.4 opacity) readable. No keyboard focus ring (fix). 36px md. |
| Badge | red/blue/purple soft text weak | green/amber soft text weak | See section 5. Neutral tone is fine. |
| Input / Textarea / Select | OK, grey focus ring (bug) | OK | Placeholder default grey. Borders low contrast by DS design. Light fields (`#F9FAFB`) on white are subtle but visible. |
| Checkbox / Radio | OK | OK but unchecked border faint (2.1:1) | Not keyboard accessible. |
| Switch | OK | **OFF state nearly invisible** (white knob on #E6E6EB, 1.24:1) | Replace with `SwitchField`. |
| Avatar | OK | OK | Status dots fine. |
| Card | OK | Low separation from white canvas | Use `--kx-card-bg` mapping. |
| Alert | OK | OK | Tints and text pass AA; icons pass 3:1 except light success (2.74) and warning (2.41). |
| Toast | OK | OK | Light success/warning icons 2.92/2.53:1 on `--bg-2`. |
| Tooltip | OK | OK | Clipped inside Card; no aria wiring. |
| Tabs | OK | OK | Controlled only, 37px. |
| Accordion | OK | OK | Panel body has no bg (canvas). |
| Breadcrumb | OK | OK | `href="#"` default. |
| Progress | OK | OK | Track is faint in light (decorative). |
| Spinner | OK | OK | |
| Skeleton | OK | Very faint but visible | |

App shell original: `shell-orig-dark.png` vs `shell-orig-light.png` (identical dark chrome in both: it does not theme). Tokenised port: `kit-dark.png`, `kit-light.png`, plus states `kit-{dark,light}-{dialog,confirm,drawer,cmd,menu,toast,sticky,fields,fields-focus,railtt}.png`.

Behavioural test results (`audit-report.json`): Tab stops skip every Checkbox/Radio/Switch; `Unchecked` label click logged nothing; box click logged `chk:false`; uncontrolled Tabs `aria-selected` stayed `[true,false]` after clicking tab B while `onChange("y")` fired; Accordion second click moved open panel (single mode); Alert dismiss removed 1 of 4 alerts; `button.type === "submit"`.

---

## 5. Contrast audit and fixes (WCAG AA: 4.5:1 text, 3:1 UI). 338 checks in `work/contrast.txt`

Method: every token resolved in the browser per theme (`work/resolved.json`), alpha composited over its surface, relative luminance per WCAG. Surfaces tested: `--bg-canvas`, `--bg-1`, `--bg-2`, and the shell panel (`#08090B` dark / white light).

### 5.1 Failures in the DS as shipped and the token-only fix

| Pair | Dark | Light | Fix (DS tokens only) |
|---|---|---|---|
| `--fg-3` as text (canvas / bg-1 / bg-2) | 4.19 / 3.75 / 3.17 | 2.97 / 2.84 / 2.68 | Use `--fg-2` (dark 8.75/7.84/6.62, light 6.55/6.27/5.91). Never `--fg-3` or `--text-standard-text-extra-subtle` for text. |
| `--fg-3` as meaningful icon (3:1) | passes on canvas/bg-1 | 2.97 / 2.84 / 2.68 | Icons: `--fg-2`. |
| `--accent` as text | 4.14 / 3.70 / 3.13 | passes (5.19) | `--text-link-text-default` (dark #76B5FD 8.94 / 8.01 / 6.76; light #0969DA) = `--kx-info-text` |
| `--link` (shell template `a` colour) | 3.69 / 3.30 / 2.79 | passes | `--kx-info-text` |
| `--danger` as text | 4.16 / 3.72 / 3.15 | passes | `--text-destructive-text-default` (dark #F97D79 7.52/6.73/5.69; light #BF1B2B 6.16) = `--kx-danger-text` |
| `--success` as text | passes on canvas/bg-1, 4.48 on bg-2 | 3.23 / 3.10 / 2.92 | light: `--swatch-depreciated-success-high-contast-bg` #1E7E37 (5.13 / 4.91 / 4.63); dark: `--border-success-default` #4EB35F (7.24/6.49/5.48) = `--kx-success-text` |
| `--warning` as text | passes | 2.81 / 2.69 / 2.53 | light: `--swatch-depreciated-yellow-high-contast-bg` #905F01 (5.49 / 5.26 / 4.95); dark: `--depreciated-status-colours-default-warning` #D9A125 (8.28) = `--kx-warning-text` |
| `--purple-600` as text | 3.62 / 3.24 / 2.74 | passes | `--swatch-purple-low-contrast-text` |
| Badge soft (text on 16% tint over canvas / bg-1) | blue 3.59/3.16, red 3.67/3.26, purple 3.22/2.85, green 4.25 (bg-1) | green 2.74/2.63, amber 2.42/2.32, blue 4.13/3.97, red 4.28/4.11, purple 4.18/4.01 | `Pill` (tone surface tokens: 8.95 to 14.8 dark, 7.35 to 15.4 light) |
| Badge outline | blue 4.14, red 4.16, purple 3.62 | green 3.23, amber 2.81 | `Pill` |
| Badge solid (white text) | green 3.23, amber 2.81 | green 3.23, amber 2.81 | `Pill solid` uses `--swatch-depreciated-*-high-contast-bg` (white text 4.58 to 5.55 everywhere) |
| `--tone-success-strong-*` text on strong | 3.58 | 3.58 | do not use; same for warning (2.81) and neutral light (2.97) |
| Input/Select/Textarea border `--border-2` vs surface (3:1 UI) | 1.83 / 1.64 / 1.39 | 1.78 / 1.71 / 1.61 | DS-native look; left as is (changing `--border-2` also changes Button outline/secondary, Toast, Tooltip). If you must pass 3:1 for fields, use `--kx-control-border` (`--grey-500`: dark 3.75 on bg-1, light 4.38) via a `.kx-field-input` wrapper class on `input` (inline style prevents overriding border with a plain rule; you would need `!important`). Recommendation: keep DS look, rely on the focus ring and labels. |
| Checkbox/Radio unchecked border `--border-strong` | 2.92 / 2.62 | 2.19 / 2.09 | Remapped globally in kit.css: `--border-strong: var(--grey-500)` (only Checkbox/Radio use it): 3.75 to 4.58. |
| Switch OFF track `--bg-3` vs surface | 1.83 | 1.24 (knob vs track 1.24) | `SwitchField` (`--grey-500` track: 3.75 / 4.58; knob 4.58) |
| Native placeholder `#757575` on `--bg-1` | 3.72 | 4.41 | `::placeholder{color:var(--fg-2)}` in kit.css (7.84 / 6.27) |
| Template shell: nav `#76777F` on `#121417` | 4.14 | n/a | `--kx-nav-fg` (`--grey-400` 6.22; light `--grey-600` 5.91) |
| Template shell: white on avatar `#2E9E4B` | 3.44 | n/a | use DS `Avatar` (`--bg-3` + `--fg-1`) |
| DS ui-kit table header `#74757E` (fg-3) on card | 3.75 | n/a | `--fg-2` (the `.ds-caption-caps` class already does this) |
| Alert/Toast icon colours (UI 3:1) | pass | success 2.74 / warning 2.41 on Alert tint; 2.92 / 2.53 on Toast `--bg-2` | Icons sit next to text so information is not colour-only; accept, or use the optional light override below |
| Toast close icon `--fg-3` on `--bg-2` | 3.17 | 2.68 | accept (decorative, has aria-label) |

Optional light-theme global override (NOT in kit.css; trade-off: amber becomes brown-ish): `:root[data-theme="light"]{ --success: var(--swatch-depreciated-success-high-contast-bg); --warning: var(--swatch-depreciated-yellow-high-contast-bg); --danger: var(--red-700); }` lifts Badge outline/solid, Alert/Toast icons and Progress fills to >= 4.1:1 (Badge soft still only 3.96 to 4.7 because the text sits on a 16% tint of itself). Do not override `--danger` in dark (Button destructive background uses it).

### 5.2 Pairs that PASS in both themes (safe to use)
`--fg-1` on any surface (14.5 to 19.9 dark; 15.5 to 17.2 light), `--fg-2` on canvas/bg-1/bg-2/panel, primary Button (`--accent-fg` on `--accent`: dark 4.63, light 5.19; hover 6.47 / 9.29), destructive Button (white on `--danger`: dark 4.61, light 5.55), Alert text (title `--fg-1`, body `--fg-2` on tinted bg: 5.2 to 15.6), Toast body `--fg-2` on `--bg-2` (6.62 / 5.91), Tooltip (14.5 / 15.5), Tab inactive `--fg-2`, accent focus border vs surfaces (dark 4.14 / 3.70 / 3.13, light 5.19 / 4.97 / 4.68), all `--tone-*-surface-text` on `--tone-*-surface-default` (dark 8.95 to 14.79, light 7.35 to 15.41), kit pairs: table th, muted td, selected row, segmented, stat, kbd, menu (all >= 4.5; list in `work/kitcontrast` output reproduced in 7.9).

---

## 6. App Shell (the template the prototype must live inside)

### 6.1 What the template is
`design-system/templates/app-shell/AppShell.dc.html`: name "App Shell", "Full-screen product shell: top nav with tabs, left icon rail, and a content slot, dark, rounded canvas". It is a Design-Canvas template: `<x-dc>` markup + `support.js` (dc runtime, 1.9k lines) + `ds-base.js` (injects `fig-tokens.css`, `colors_and_type.css`, `styles.css`, `_ds_bundle.js` from `../..`). Attributes like `style-hover="..."` and the `<helmet>` block only work with that runtime. `assets/blob-texture.png` is an RGBA PNG (1321x884) holding a faint blue/purple glow in the bottom-left (alpha 15 to 41); it is painted over `#121417` and is almost entirely hidden behind the content panel.

Layout metrics (keep them): viewport 100vw x 100vh, `overflow:hidden`, text `#fff`.
- Header: height 72, padding `0 24`, transparent. Left cluster gap 8: W logo 42px disc (fill `#1A1B22`, stroke `#3E3F47` 1.5, white W mark, `margin-right:12`), tab buttons "Apps" (grid icon) and "Chat" (`fa-comment`) 64px tall, `0 14` padding, 15px/500, colour `#76777F`, hover `#C1C1CC`; active app tab: 24px icon chip (`#26272E`, radius 6, `fa-asterisk` 14px white), name 14px/500 white, close x (`#8A8B93`, hover white), 2.5px accent underline `left/right 8, bottom -4`, radius 2. Right cluster gap 16: three 32px circle icon buttons (border `#34353D`, white icon 14px, hover bg `#1A1B22`) for Share, Notifications (`fa-bell`), Settings (`fa-gear`), then a 32px green avatar "JS" (`#2E9E4B`).
- Body: flex row, `margin: 0 12px`, border 1px `#3E3F47`, radius `14px 14px 0 0`, bg `#08090B`, no bottom border, `overflow:hidden`.
- Rail: 64px wide, padding `16 0`, right border `#3E3F47`; group gap 20: Home (44px, radius 6, bg `rgba(31,111,235,.14)`, accent icon 20px), Files (`fa-regular fa-folder-open`), Search (`fa-magnifying-glass`) at 40px radius 8 colour `#8A8B93` hover white; bottom: Menu (`fa-bars` 24px, 44px).
- `<main>`: `flex:1; min-width:0; overflow:auto; background:transparent`. This is the content slot. Global: `a{color:var(--link)}`.

### 6.2 Hard-coded values vs tokens (what `kit.css` does)
| Template hex | Where | Token used in the port | Light value |
|---|---|---|---|
| `#121417` | body/shell bg | `--kx-shell-bg: var(--grey-925)` (= Figma `--background-surface` dark) | `--grey-100` `#F2F3F7` (= `--background-surface` light) |
| blob texture | body bg | `--kx-shell-texture: url(../assets/blob-texture.png)` | `none` |
| `#08090B` | content panel | `--kx-panel-bg: var(--grey-975)` (= `--background-sunken` dark) | `--white` |
| `#3E3F47` | panel/rail border | `--kx-panel-border: var(--grey-700)` | `--grey-200` |
| `#76777F` / `#8A8B93` | nav and rail icons | `--kx-nav-fg: var(--grey-400)` | `--grey-600` |
| `#C1C1CC` / `#fff` | hover | `--kx-nav-fg-hover: var(--grey-200)` / `--fg-1` | `--grey-900` |
| `#26272E` | tab icon chip | `--kx-chip-bg: var(--grey-800)` | `--grey-150` |
| `#34353D` | circle buttons border | `--kx-ring-btn-border: var(--grey-700)` | `--grey-200` |
| `#1A1B22` | circle button hover, logo disc | `--kx-ring-btn-hover: var(--grey-900)`, `.kx-logo .disc{fill:var(--bg-1)}` | `--grey-150` / `--bg-1` |
| `rgba(31,111,235,.14)` | rail active | `color-mix(in srgb, var(--accent) 16% , transparent)` | 12% |
| `#2E9E4B` | avatar | DS `Avatar` | |
| `a{color:var(--link)}` | links | `--kx-info-text` | |

Intentional deviations in the port: rail buttons are all 44px with 12px gap (template: 44 active / 40 inactive, gap 20) to meet the 44px target; the app tab has no close x (Kontor is a single app); the Share button is replaced by the theme toggle (re-add `fa-share-nodes` if wanted); the avatar is the DS `Avatar`; hover is CSS (`:hover`) instead of the runtime's `style-hover`.

The three template SVGs (W logo, Apps grid, Share nodes): the logo is the only allowed custom SVG (brand mark; paths copied verbatim into `WMark`). Apps grid is replaced by FA `table-cells-large` and Share by FA `share-nodes` (rule: Font Awesome only).

### 6.3 Where Kontor goes
Put the whole product inside `<AppShell>`: header app tab name = "Kontor financial layer"; rail = Overview, Renewal radar, Cap vs spend, Opportunities (4 to 5 icons; `Tooltip side="right"` works, not clipped); `<main>` = routed pages each wrapped in `.kx-page` (max 1280, padding 24/32, gap 24). Header right cluster: theme toggle first (`ThemeToggle`, sun when dark / moon when light, `aria-pressed`), notifications, settings, avatar. Skip link suggestion: `<a className="kx-sr-only" href="#main">Skip to content</a>` before the shell (`main` has `id="main"`). The shell is desktop-oriented: at 390px the header overflows (measured: header scrollWidth > clientWidth); at 1024px it is fine. For narrow screens hide `.kx-navtab span` and the Apps/Chat tabs under 900px if mobile matters.

Verified screenshots: `kit-dark.png`, `kit-light.png` (shell + gallery), `kit-*-railtt.png` (rail tooltip), `kit-*-btnfocus.png`.

---

## 7. Gap kit: Springboard-native pieces built ONLY from DS tokens

The DS lacks: Table, Dialog/Modal, Drawer, Popover/Menu, Command palette, Chip/Tag, Stat tile, Empty state, Pagination, Segmented control, Chart, kbd, a toast host. All are implemented in the three files below (verified in dark and light, screenshots in section 4 list). Selector prefix `kx-`.

### 7.0 How to use
```
cp research/kit/kit.css      -> src/styles/kit.css        (and `import './kit.css'` is already how esbuild picks up CSS; or append to src/styles/app.css)
cp research/kit/kit-ui.jsx   -> src/ui/kit-ui.jsx         (classic JSX; React is a global)
research/kit/kit.jsx         -> reference usage only (Gallery page + Root: ToastProvider > AppShell > page)
```
In `kit.css` change the texture URL `url("../assets/blob-texture.png")` to the path relative to the file's final location (from `src/styles/` that is `../../assets/blob-texture.png`); esbuild's `.png: dataurl` loader inlines it (adds ~466KB to `dist/app.css`; acceptable, or drop the texture in dark too). `kit.jsx` contains test-only scaffolding you should drop: the `window.__open = {...}` line in `Gallery` and the `maxHeight={96}` on the dense table (it exists to prove the sticky header). `Segmented`, `Pill`, `StatTile`, `EmptyState`, `DataTable`, `Dialog`, `Drawer`, `ConfirmDialog`, `ToastProvider/useToast`, `CommandPalette`, `CapMeter`, `Check/RadioField/SwitchField`, `AppShell`, `ThemeToggle/useTheme` are exported.

### 7.1 Token cheat sheet for building your own pieces (bg / border / text / hover / focus / radius / shadow / spacing)
| Need | Dark | Light | Token |
|---|---|---|---|
| Page canvas | #0E0F12 | #FFFFFF | `--bg-canvas` (shell panel uses `--kx-panel-bg`) |
| Card / popover surface | #1A1B22 | white (mapped) | `--kx-card-bg`, `--kx-pop-bg` (DS: `--bg-1`) |
| Sunken / header band | #1A1B22 | #F9FAFB | `--bg-1` |
| Hover / segmented track / chip | #28292F | #F2F3F7 | `--bg-2` (row hover uses `--kx-row-hover`) |
| Pressed / skeleton / toggle | #3E3F47 | #E6E6EB | `--bg-3` |
| Hairline | #28292F | #E6E6EB | `--border-1` (cards, row dividers) |
| Control/emphasis border | #3E3F47 | #C1C1CC | `--border-2` |
| AA control border | #74757E | #74757E | `--kx-control-border` |
| Text primary / secondary | #FFF / #ADAFB7 | #1A1B22 / #5C5D64 | `--fg-1` / `--fg-2` |
| Accent / accent hover / pressed | #1F6FEB / #1158C7 / #0D419D | #0969DA / #0D419D / #043384 | `--accent`, `--accent-hover`, `--accent-pressed` |
| Focus | 2px `--accent` outline, offset 2 (inputs: border `--accent` + 3px `--focus-ring`) | | |
| Radius | buttons 8 (`--radius-lg`), inputs 6 (`-md`), tags 4 (`-sm`), dialogs 12 (`-xl`), pills (`-pill`) | | |
| Shadow | popovers/modals `--kx-shadow-pop` (DS `--shadow-3` in light) | | |
| Spacing | 4/8/12/16/24/32 -> `--space-1/2/3/4/6/8`; card padding 16-20; page 24/32; grid gap 16-24 | | |
| Scrim | `--kx-scrim` = `rgba(0,0,0,.5)`; blur 2px (modal) or 8px (command palette, `.kx-scrim--blur`) | | |

### 7.2 The files

#### kit.css (all CSS: theme plumbing, tokens, shell, typography recipes, table, pills, segmented, stat, empty, kbd, dialog, drawer, menu, command palette, pager, meter, accessible controls)
```css
/* =====================================================================
   kit.css  -  Springboard-native building blocks (all colours/radii/spacing from DS tokens)
   Drop into src/styles/app.css (after design-system/styles.css). Prefix: kx-
   ===================================================================== */

/* ---------- 0. Theme plumbing ------------------------------------------------ */
:root[data-theme="dark"]  { color-scheme: dark;  }
:root[data-theme="light"] { color-scheme: light; }

/* DS BUG FIX: fig-tokens.css defines --focus-ring as rgb(64,64,64) under :root[data-theme="dark"]
   (specificity 0,2,0) which beats colors_and_type.css (:root, 0,1,0), so inputs get a grey dull ring in dark. */
:root[data-theme="dark"]  { --focus-ring: rgba(31, 111, 235, 0.45); }
:root[data-theme="light"] { --focus-ring: rgba(9, 105, 218, 0.30); }

/* ---------- 1. App-level semantic tokens (both themes, all AA-verified) ----------- */
:root, :root[data-theme="dark"] {
  /* shell */
  --kx-shell-bg:        var(--grey-925);                 /* #121417  (template: #121417)            */
  --kx-shell-texture:   url("../assets/blob-texture.png");
  --kx-panel-bg:        var(--grey-975);                 /* #08090B  (template: #08090B)            */
  --kx-panel-border:    var(--grey-700);                 /* #3E3F47  (template: #3E3F47)            */
  --kx-nav-fg:          var(--grey-400);                 /* #95959F  (template #76777F = 4.2:1 FAIL) */
  --kx-nav-fg-hover:    var(--grey-200);                 /* #C1C1CC                                 */
  --kx-nav-fg-active:   var(--fg-1);
  --kx-chip-bg:         var(--grey-800);                 /* template #26272E                        */
  --kx-ring-btn-border: var(--grey-700);                 /* template #34353D                        */
  --kx-ring-btn-hover:  var(--grey-900);                 /* template #1A1B22                        */
  --kx-rail-active-bg:  color-mix(in srgb, var(--accent) 16%, transparent); /* template rgba(31,111,235,.14) */
  /* surfaces inside the panel */
  --kx-card-bg:         var(--bg-1);                     /* #1A1B22 (= DS Card)                     */
  --kx-card-border:     var(--border-1);                 /* #28292F                                 */
  --kx-pop-bg:          var(--bg-1);
  --kx-pop-border:      var(--border-1);
  --kx-row-hover:       var(--bg-2);
  --kx-scrim:           rgba(0, 0, 0, 0.5);              /* DS README: modal scrim rgba(0,0,0,.5)   */
  /* DS shadow tokens are tuned for light; in dark they vanish -> use these for popovers/modals */
  --kx-shadow-pop:      0 4px 8px rgba(0,0,0,.30), 0 10px 24px rgba(0,0,0,.25);   /* DS menus.html */
  /* AA-safe status TEXT colours (DS --success/--warning/--danger/--accent fail 4.5:1 as text) */
  --kx-info-text:       var(--text-link-text-default);                       /* #76B5FD */
  --kx-success-text:    var(--border-success-default);                       /* #4EB35F */
  --kx-warning-text:    var(--depreciated-status-colours-default-warning);   /* #D9A125 */
  --kx-danger-text:     var(--text-destructive-text-default);                /* #F97D79 */
  /* AA control boundary (DS --border-2 is 1.6:1; --border-strong 2.6:1) */
  --kx-control-border:  var(--grey-500);                 /* #74757E  3.75:1 on #1A1B22               */
  --border-strong:      var(--grey-500);                 /* DS value grey-600 = 2.6:1; only Checkbox/Radio use it -> safe global override */
  --kx-seg-thumb:       var(--bg-3);
}
:root[data-theme="light"] {
  --kx-shell-bg:        var(--grey-100);                 /* #F2F3F7 = --background-surface          */
  --kx-shell-texture:   none;
  --kx-panel-bg:        var(--white);                    /* #FFFFFF                                 */
  --kx-panel-border:    var(--grey-200);                 /* #C1C1CC                                 */
  --kx-nav-fg:          var(--grey-600);                 /* #5C5D64  6.3:1                          */
  --kx-nav-fg-hover:    var(--grey-900);
  --kx-nav-fg-active:   var(--fg-1);
  --kx-chip-bg:         var(--grey-150);
  --kx-ring-btn-border: var(--grey-200);
  --kx-ring-btn-hover:  var(--grey-150);
  --kx-rail-active-bg:  color-mix(in srgb, var(--accent) 12%, transparent);
  --kx-card-bg:         var(--bg-canvas);                /* white card on white panel -> border does the work */
  --kx-card-border:     var(--border-1);
  --kx-pop-bg:          var(--bg-canvas);
  --kx-pop-border:      var(--border-2);
  --kx-row-hover:       var(--bg-1);
  --kx-scrim:           rgba(0, 0, 0, 0.5);
  --kx-shadow-pop:      var(--shadow-3);
  --kx-info-text:       var(--text-link-text-default);                       /* #0969DA */
  --kx-success-text:    var(--swatch-depreciated-success-high-contast-bg);   /* #1E7E37 */
  --kx-warning-text:    var(--swatch-depreciated-yellow-high-contast-bg);    /* #905F01 */
  --kx-danger-text:     var(--text-destructive-text-default);                /* #BF1B2B */
  --kx-control-border:  var(--grey-500);                 /* #74757E  4.4:1 on #F9FAFB               */
  --border-strong:      var(--grey-500);                 /* DS value grey-300 = 2.1:1 on white */
  --kx-seg-thumb:       var(--bg-canvas);
}

/* ---------- 2. Global resets that the DS components rely on -------------------- */
html, body { margin: 0; height: 100%; }
body { background: var(--kx-shell-bg); color: var(--fg-1); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
a { color: var(--kx-info-text); text-decoration: none; }  /* template uses var(--link) = 3.7:1 on dark */
a:hover { text-decoration: underline; }
/* DS Button/Tabs/Accordion set outline:none and give NO focus style -> add one */
button:focus-visible, [role="tab"]:focus-visible, a:focus-visible, summary:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid var(--accent) !important;   /* !important: DS Button has inline style outline:none */
  outline-offset: 2px;
}
/* DS inputs never style placeholder -> browser default #757575 (3.7:1 on dark) */
input::placeholder, textarea::placeholder { color: var(--fg-2); opacity: 1; }
@media (pointer: coarse) { button, [role="tab"], select, input:not([type="checkbox"]):not([type="radio"]) { min-height: 44px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
.kx-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* ---------- 3. App shell (port of templates/app-shell/AppShell.dc.html) ------------ */
.kx-app { display: flex; flex-direction: column; width: 100vw; height: 100vh; overflow: hidden; color: var(--fg-1);
  font-family: var(--font-sans); background: var(--kx-shell-texture) center / cover no-repeat fixed, var(--kx-shell-bg); }
.kx-header { display: flex; align-items: center; justify-content: space-between; height: 72px; flex: 0 0 72px; padding: 0 24px; position: relative; z-index: 2; }
.kx-header__left, .kx-header__right { display: flex; align-items: center; }
.kx-header__left { gap: 8px; } .kx-header__right { gap: 16px; }
.kx-logo { margin-right: 12px; flex: 0 0 auto; color: var(--fg-1); }
.kx-logo .disc { fill: var(--bg-1); stroke: var(--border-2); stroke-width: 1.5; }
.kx-logo .mark { fill: currentColor; }
.kx-navtab { display: flex; align-items: center; gap: 9px; height: 64px; padding: 0 14px; background: transparent; border: 0; cursor: pointer;
  color: var(--kx-nav-fg); font: 500 15px/1 var(--font-sans); border-radius: var(--radius-md); }
.kx-navtab:hover { color: var(--kx-nav-fg-hover); }
.kx-apptab { position: relative; display: flex; align-items: center; height: 64px; padding: 0 16px 0 12px; }
.kx-apptab__inner { display: flex; align-items: center; gap: 11px; }
.kx-apptab__chip { width: 24px; height: 24px; border-radius: var(--radius-md); background: var(--kx-chip-bg); display: flex; align-items: center; justify-content: center; color: var(--fg-1); }
.kx-apptab__name { font: 500 14px/1 var(--font-sans); color: var(--fg-1); white-space: nowrap; }
.kx-apptab__close { background: transparent; border: 0; cursor: pointer; color: var(--kx-nav-fg); padding: 6px; display: flex; }
.kx-apptab__close:hover { color: var(--fg-1); }
.kx-apptab__bar { position: absolute; left: 8px; right: 8px; bottom: -4px; height: 2.5px; background: var(--accent); border-radius: 2px; }
.kx-ringbtn { width: 32px; height: 32px; border-radius: var(--radius-pill); border: 1px solid var(--kx-ring-btn-border); background: transparent;
  color: var(--fg-1); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; font-size: 14px; }
.kx-ringbtn:hover { background: var(--kx-ring-btn-hover); }
@media (pointer: coarse) { .kx-ringbtn { width: 44px; height: 44px; } }
.kx-body { display: flex; flex: 1 1 auto; min-height: 0; margin: 0 12px; border: 1px solid var(--kx-panel-border); border-bottom: 0;
  border-radius: 14px 14px 0 0; background: var(--kx-panel-bg); overflow: hidden; }
.kx-rail { flex: 0 0 64px; display: flex; flex-direction: column; align-items: center; padding: 16px 0; border-right: 1px solid var(--kx-panel-border); }
.kx-rail__group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.kx-railbtn { width: 44px; height: 44px; border-radius: var(--radius-lg); border: 0; background: transparent; color: var(--kx-nav-fg); cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 18px; }
.kx-railbtn:hover { color: var(--kx-nav-fg-active); background: var(--bg-2); }
.kx-railbtn[aria-current="page"] { background: var(--kx-rail-active-bg); color: var(--accent); }
.kx-rail__bottom { margin-top: auto; }
.kx-main { flex: 1 1 auto; min-width: 0; overflow: auto; }
.kx-page { max-width: 1280px; margin: 0 auto; padding: 24px 32px 48px; display: flex; flex-direction: column; gap: 24px; }

/* ---------- 4. Typography recipes -------------------------------------------- */
.kx-page-title  { font: 600 24px/1.25 var(--font-display); letter-spacing: -0.01em; color: var(--fg-1); margin: 0; }   /* = .ds-h3 */
.kx-page-sub    { font: 400 14px/20px var(--font-sans); color: var(--fg-2); margin: 4px 0 0; }                         /* = .ds-body in fg-2 */
.kx-section-title { font: 600 16px/1.3 var(--font-sans); color: var(--fg-1); margin: 0; }                              /* = Card title prop */
.kx-card-title  { font: 600 14px/20px var(--font-sans); color: var(--fg-1); margin: 0; }
.kx-eyebrow     { font: 500 12px/16px var(--font-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--fg-2); }   /* = .ds-caption-caps */
.kx-caption     { font: 400 12px/16px var(--font-sans); color: var(--fg-2); }                                           /* = .ds-caption */
.kx-num         { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.kx-kpi         { font: 600 28px/1.1 var(--font-display); letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--fg-1); }
.kx-kpi--hero   { font-size: 44px; line-height: 1.05; letter-spacing: -0.02em; }
.kx-mono        { font-family: var(--font-mono); font-size: 12px; line-height: 16px; color: var(--fg-2); }               /* clause refs, IDs */

/* ---------- 5. Card shell (use <Card style={{background:'var(--kx-card-bg)'}}> or this class) ---- */
.kx-card { background: var(--kx-card-bg); border: 1px solid var(--kx-card-border); border-radius: var(--radius-lg); overflow: hidden; }
.kx-card__head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--kx-card-border); }
.kx-card__head .spacer { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.kx-card__body { padding: 16px; }
.kx-grid { display: grid; gap: 16px; }
.kx-grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.kx-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.kx-grid--2-1 { grid-template-columns: 2fr 1fr; }
@media (max-width: 1100px) { .kx-grid--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .kx-grid--2-1 { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .kx-grid--4, .kx-grid--3 { grid-template-columns: 1fr; } .kx-page { padding: 16px; } }

/* ---------- 6. Data table ---------------------------------------------------- */
.kx-table-wrap { overflow: auto; max-height: var(--kx-table-max-h, none); }
.kx-table { width: 100%; border-collapse: separate; border-spacing: 0; font: 400 13px/18px var(--font-sans); color: var(--fg-1); }
.kx-table th { position: sticky; top: 0; z-index: 1; background: var(--bg-1); text-align: left; white-space: nowrap;
  padding: 10px 16px; font: 500 12px/16px var(--font-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--fg-2);
  border-bottom: 1px solid var(--border-2); }
.kx-table td { padding: 12px 16px; height: 44px; box-sizing: border-box; border-bottom: 1px solid var(--border-1); vertical-align: middle; }
.kx-table tbody tr:last-child td { border-bottom: 0; }
.kx-table tbody tr:hover td { background: var(--kx-row-hover); }                 /* no zebra */
.kx-table tbody tr[aria-selected="true"] td { background: color-mix(in srgb, var(--accent) 10%, transparent); }
.kx-table tbody tr.is-clickable { cursor: pointer; }
.kx-table tbody tr:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 0; }
.kx-table .num, .kx-table th.num { text-align: right; font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.kx-table td.muted { color: var(--fg-2); }
.kx-table td.nowrap { white-space: nowrap; }
.kx-table th .sort { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; border-radius: var(--radius-sm); }
.kx-table th .sort:hover { color: var(--fg-1); }
.kx-table th .sort:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.kx-table th .sort i { font-size: 10px; opacity: .6; }
.kx-table th[aria-sort="ascending"] .sort, .kx-table th[aria-sort="descending"] .sort { color: var(--fg-1); }
.kx-table th[aria-sort="ascending"] .sort i, .kx-table th[aria-sort="descending"] .sort i { opacity: 1; color: var(--accent); }
.kx-table--dense td { padding: 6px 12px; height: 32px; }     /* desktop only: below 44px touch target */
.kx-table--dense th { padding: 8px 12px; }
.kx-table tfoot td { font-weight: 600; border-top: 1px solid var(--border-2); border-bottom: 0; background: var(--bg-1); }

/* ---------- 7. Status pill / tag / chip --------------------------------------- */
.kx-pill { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 9px; box-sizing: border-box; border-radius: var(--radius-pill); white-space: nowrap;
  font: 500 12px/1 var(--font-sans); border: 1px solid var(--border-standard-subtle);
  background: var(--tone-neutral-surface-default); color: var(--tone-neutral-surface-text); }
.kx-pill i { font-size: 11px; }
.kx-pill .dot { width: 6px; height: 6px; border-radius: var(--radius-pill); background: currentColor; }
.kx-pill--success { background: var(--tone-success-surface-default); color: var(--tone-success-surface-text); border-color: var(--border-success-subtle); }
.kx-pill--warning { background: var(--tone-warning-surface-default); color: var(--tone-warning-surface-text); border-color: var(--border-warning-subtle); }
.kx-pill--danger  { background: var(--tone-error-surface-default);   color: var(--tone-error-surface-text);   border-color: var(--border-error-subtle); }
.kx-pill--info    { background: var(--tone-info-surface-default);    color: var(--tone-info-surface-text);    border-color: var(--border-info-subtle); }
.kx-pill--sm { height: 18px; padding: 0 7px; font-size: 11px; }
/* solid variants (white text on the DS "high-contrast swatch" colours: all >= 4.5:1 in both themes) */
.kx-pill--solid { color: #fff; border-color: transparent; }
.kx-pill--solid.kx-pill--success { background: var(--swatch-depreciated-success-high-contast-bg); }
.kx-pill--solid.kx-pill--warning { background: var(--swatch-depreciated-yellow-high-contast-bg); }
.kx-pill--solid.kx-pill--danger  { background: var(--swatch-depreciated-error-high-contast-bg); }
.kx-pill--solid.kx-pill--info    { background: var(--swatch-depreciated-info-high-contast-bg); }
.kx-pill--solid.kx-pill--neutral { background: var(--swatch-grey-high-contrast-bg); }
.kx-tag { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: var(--radius-sm); background: var(--bg-2); color: var(--fg-1); font: 400 12px/1 var(--font-sans); }
.kx-chip { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: var(--radius-pill); cursor: pointer;
  background: transparent; color: var(--fg-1); border: 1px solid var(--kx-control-border); font: 500 13px/1 var(--font-sans); }
.kx-chip:hover { background: var(--bg-2); }
.kx-chip[aria-pressed="true"] { background: color-mix(in srgb, var(--accent) 14%, transparent); border-color: var(--accent); color: var(--fg-1); }

/* ---------- 8. Segmented control ---------------------------------------------- */
.kx-seg { display: inline-flex; gap: 2px; padding: 2px; background: var(--bg-2); border: 1px solid var(--border-1); border-radius: var(--radius-lg); }
.kx-seg button { height: 32px; min-width: 44px; padding: 0 14px; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--fg-2);
  font: 500 13px/1 var(--font-sans); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background .15s ease, color .15s ease; }
.kx-seg button:hover { color: var(--fg-1); }
.kx-seg button[aria-checked="true"], .kx-seg button[aria-pressed="true"] { background: var(--kx-seg-thumb); color: var(--fg-1); box-shadow: var(--shadow-1), inset 0 0 0 1px var(--border-2); }
.kx-seg--lg button { height: 36px; }

/* ---------- 9. Stat tile ------------------------------------------------------ */
.kx-stat { background: var(--kx-card-bg); border: 1px solid var(--kx-card-border); border-radius: var(--radius-lg); padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.kx-stat__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.kx-stat__label { font: 500 12px/16px var(--font-sans); color: var(--fg-2); }
.kx-stat__icon { width: 28px; height: 28px; border-radius: var(--radius-md); background: var(--bg-2); color: var(--fg-2); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; flex: none; }
.kx-stat__value { font: 600 28px/1.1 var(--font-display); letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--fg-1); }
.kx-stat__foot { display: flex; align-items: center; gap: 6px; font: 400 12px/16px var(--font-sans); color: var(--fg-2); }
.kx-stat--button { cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%; }
.kx-stat--button:hover { background: var(--kx-row-hover); }
.kx-stat--button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.kx-stat[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

/* ---------- 10. Empty state ---------------------------------------------------- */
.kx-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 48px 24px; }
.kx-empty__icon { width: 48px; height: 48px; border-radius: var(--radius-pill); background: var(--bg-2); color: var(--fg-2); display: inline-flex; align-items: center; justify-content: center; font-size: 20px; }
.kx-empty__title { font: 600 16px/1.3 var(--font-sans); color: var(--fg-1); margin: 0; }
.kx-empty__text { font: 400 14px/20px var(--font-sans); color: var(--fg-2); margin: 0; max-width: 44ch; }

/* ---------- 11. kbd hint -------------------------------------------------------- */
.kx-kbd { display: inline-flex; align-items: center; height: 20px; padding: 0 6px; box-sizing: border-box; border-radius: var(--radius-sm); background: var(--bg-2); border: 1px solid var(--border-2);
  font: 500 11px/1 var(--font-mono); color: var(--fg-2); }

/* ---------- 12. Modal dialog + scrim ----------------------------------------- */
.kx-scrim { position: fixed; inset: 0; z-index: 100; background: var(--kx-scrim); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 16px; animation: kx-fade .2s ease-in-out; }
.kx-scrim--blur { backdrop-filter: blur(8px); }               /* DS README: command palettes blur(8px) */
.kx-scrim--top { align-items: flex-start; padding-top: 14vh; }
.kx-dialog { width: min(480px, 100%); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: var(--kx-pop-bg); color: var(--fg-1);
  border: 1px solid var(--kx-pop-border); border-radius: var(--radius-xl); box-shadow: var(--kx-shadow-pop); animation: kx-pop .2s ease-in-out; }
.kx-dialog--wide { width: min(720px, 100%); }
.kx-dialog__head { display: flex; align-items: flex-start; gap: 12px; padding: 20px 24px 0; }
.kx-dialog__title { font: 600 18px/1.3 var(--font-sans); margin: 0; flex: 1; }
.kx-dialog__body { padding: 8px 24px 20px; font: 400 14px/20px var(--font-sans); color: var(--fg-2); overflow: auto; }
.kx-dialog__foot { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--border-1); background: var(--bg-canvas); border-radius: 0 0 var(--radius-xl) var(--radius-xl); }
@keyframes kx-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes kx-pop  { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }

/* ---------- 13. Right-hand drawer --------------------------------------------- */
.kx-drawer-scrim { position: fixed; inset: 0; z-index: 100; background: var(--kx-scrim); animation: kx-fade .2s ease-in-out; }
.kx-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 101; width: min(520px, 100vw); display: flex; flex-direction: column;
  background: var(--kx-pop-bg); border-left: 1px solid var(--kx-pop-border); box-shadow: var(--kx-shadow-pop); animation: kx-slide .2s ease-in-out; }
.kx-drawer__head { display: flex; align-items: flex-start; gap: 12px; padding: 20px 24px 16px; border-bottom: 1px solid var(--border-1); }
.kx-drawer__body { flex: 1; overflow: auto; padding: 20px 24px; }
.kx-drawer__foot { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--border-1); background: var(--bg-canvas); }
@keyframes kx-slide { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }

/* ---------- 14. Popover / menu / command palette ----------------------------- */
.kx-menu { min-width: 220px; padding: 4px; background: var(--kx-pop-bg); border: 1px solid var(--kx-pop-border); border-radius: var(--radius-lg); box-shadow: var(--kx-shadow-pop); }
.kx-menu__label { padding: 8px 10px 4px; font: 500 10px/1 var(--font-sans); text-transform: uppercase; letter-spacing: .06em; color: var(--fg-2); }
.kx-menu__item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; min-height: 32px; box-sizing: border-box; border: 0; background: transparent; border-radius: var(--radius-md);
  font: 400 13px/1 var(--font-sans); color: var(--fg-1); text-align: left; cursor: pointer; }
.kx-menu__item i { width: 14px; color: var(--fg-2); }
.kx-menu__item:hover, .kx-menu__item[aria-selected="true"], .kx-menu__item:focus-visible { background: var(--bg-2); outline: 0; }
.kx-menu__item .kx-kbd { margin-left: auto; }
.kx-menu__item--danger, .kx-menu__item--danger i { color: var(--kx-danger-text); }
.kx-menu__sep { height: 1px; margin: 4px 2px; background: var(--border-1); }
.kx-cmd { width: min(560px, 100%); background: var(--kx-pop-bg); border: 1px solid var(--kx-pop-border); border-radius: var(--radius-xl); box-shadow: var(--kx-shadow-pop); overflow: hidden; }
.kx-cmd__input { display: flex; align-items: center; gap: 10px; padding: 0 16px; height: 52px; border-bottom: 1px solid var(--border-1); }
.kx-cmd__input input { flex: 1; background: transparent; border: 0; outline: 0; color: var(--fg-1); font: 400 15px/1 var(--font-sans); height: 100%; }
.kx-cmd__list { max-height: 320px; overflow: auto; padding: 4px; }

/* ---------- 15. Pagination ------------------------------------------------------ */
.kx-pager { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border-1); font: 400 13px/18px var(--font-sans); color: var(--fg-2); }
.kx-pager .spacer { margin-left: auto; display: flex; gap: 4px; align-items: center; }

/* ---------- 16. Cap-vs-spend meter (Progress has no cap marker) ----------------- */
.kx-meter { position: relative; height: 8px; border-radius: var(--radius-pill); background: var(--bg-3); }
.kx-meter__fill { position: absolute; inset: 0 auto 0 0; border-radius: var(--radius-pill); background: var(--accent); width: var(--w, 0%); }
.kx-meter__fill--warn { background: var(--warning); } .kx-meter__fill--over { background: var(--danger); }
.kx-meter__cap { position: absolute; top: -4px; bottom: -4px; left: var(--cap, 100%); width: 2px; background: var(--fg-1); border-radius: 1px; }

/* ---------- 17. Accessible check / radio / switch (native <input>, DS look) ------------
   DS Checkbox/Radio/Switch are <span role=...> without tabIndex: not keyboard reachable, label-text click does nothing, 16px hit area. */
.kx-field { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; font: 400 14px/20px var(--font-sans); color: var(--fg-1); user-select: none; }
.kx-field input { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; }
.kx-field--disabled { opacity: .5; cursor: not-allowed; }
.kx-box { width: 16px; height: 16px; box-sizing: border-box; flex: none; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong); background: transparent; color: #fff; font-size: 9px; transition: background .15s ease, border-color .15s ease; }
.kx-box--radio { border-radius: var(--radius-pill); }
.kx-field input:checked + .kx-box, .kx-field input:indeterminate + .kx-box { background: var(--accent); border-color: var(--accent); }
.kx-field input:checked + .kx-box--radio { background: transparent; box-shadow: inset 0 0 0 3px var(--bg-1), inset 0 0 0 8px var(--accent); }
.kx-field input:focus-visible + .kx-box, .kx-field input:focus-visible + .kx-track { outline: 2px solid var(--accent); outline-offset: 2px; }
.kx-track { width: 36px; height: 20px; box-sizing: border-box; flex: none; position: relative; border-radius: var(--radius-pill); background: var(--kx-control-border); transition: background .15s ease; }
.kx-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: var(--radius-pill); background: #fff; box-shadow: var(--shadow-1); transition: left .15s ease; }
.kx-field input:checked + .kx-track { background: var(--accent); }
.kx-field input:checked + .kx-track::after { left: 18px; }
```

#### kit-ui.jsx (React components for everything above)
```jsx
// kit-ui.jsx - reusable, DS-native building blocks. Copy into src/ui/*.jsx (classic JSX; React is a global).
const DS = window.Springboard20DesignSystem_019e02;
const { Button, Toast, Avatar, Tooltip } = DS;

/* ---------- Theme (default dark, persisted under the same key index.html reads) ---------- */
export function useTheme() {
  const [theme, setTheme] = React.useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const apply = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('kontor-theme', t); } catch (e) {}
    setTheme(t);
  };
  return [theme, apply];
}
export function ThemeToggle({ theme, onChange }) {
  const dark = theme === 'dark';
  return (
    <button className="kx-ringbtn" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={!dark}
      onClick={() => onChange(dark ? 'light' : 'dark')}>
      <i className={'fa-solid ' + (dark ? 'fa-sun' : 'fa-moon')} aria-hidden="true" />
    </button>
  );
}

/* ---------- App shell: port of templates/app-shell/AppShell.dc.html with tokens instead of hex ---------- */
export function WMark() {   // exact paths from the template; colours come from CSS (.kx-logo)
  return (
    <svg className="kx-logo" width="42" height="42" viewBox="0 0 43 43" fill="none" aria-label="Whitespace" role="img">
      <path className="disc" d="M21.5 0.75C32.9599 0.75 42.25 10.0401 42.25 21.5C42.25 32.9599 32.9599 42.25 21.5 42.25C10.0401 42.25 0.75 32.9599 0.75 21.5C0.75 10.0401 10.0401 0.75 21.5 0.75Z" />
      <path className="mark" d="M13.1012 17.7963C14.2649 17.7963 15.2023 16.8458 15.2023 15.6658C15.2023 14.4859 14.2649 13.5354 13.1012 13.5354C11.9374 13.5354 11 14.4859 11 15.6658C11 16.8458 11.9374 17.7963 13.1012 17.7963Z" />
      <path className="mark" d="M18.5318 28.1864L23.4453 16.518C23.8978 15.4036 23.3806 14.1581 22.2816 13.6665C21.1825 13.2076 19.9541 13.732 19.5016 14.8136L14.6204 26.5148C14.1679 27.6292 14.6851 28.8747 15.7518 29.3335C16.8509 29.7924 18.0793 29.268 18.5318 28.1864Z" />
      <path className="mark" d="M26.9364 28.1864L31.8176 16.518C32.3025 15.4036 31.7853 14.1581 30.6862 13.6665C29.5871 13.2076 28.3588 13.732 27.9062 14.8136L23.0251 26.5148C22.5725 27.6292 23.0897 28.8747 24.1565 29.3335C25.2555 29.7924 26.4839 29.268 26.9364 28.1864Z" />
    </svg>
  );
}
export function AppShell({ appName = 'App name', appIcon = 'asterisk', rail = [], railActive, onRail, theme, onTheme, children }) {
  return (
    <div className="kx-app">
      <header className="kx-header">
        <div className="kx-header__left">
          <WMark />
          <button className="kx-navtab"><i className="fa-solid fa-table-cells-large" aria-hidden="true" /><span>Apps</span></button>
          <button className="kx-navtab"><i className="fa-solid fa-comment" aria-hidden="true" /><span>Chat</span></button>
          <div className="kx-apptab">
            <div className="kx-apptab__inner">
              <span className="kx-apptab__chip"><i className={'fa-solid fa-' + appIcon} aria-hidden="true" style={{ fontSize: 14 }} /></span>
              <span className="kx-apptab__name">{appName}</span>
            </div>
            <span className="kx-apptab__bar" />
          </div>
        </div>
        <div className="kx-header__right">
          <ThemeToggle theme={theme} onChange={onTheme} />
          <button className="kx-ringbtn" aria-label="Notifications"><i className="fa-solid fa-bell" aria-hidden="true" /></button>
          <button className="kx-ringbtn" aria-label="Settings"><i className="fa-solid fa-gear" aria-hidden="true" /></button>
          <Avatar initials="JS" size={32} />
        </div>
      </header>
      <div className="kx-body">
        <nav className="kx-rail" aria-label="Primary">
          <div className="kx-rail__group">
            {rail.map((r) => (
              <Tooltip key={r.id} label={r.label} side="right">
                <button className="kx-railbtn" aria-label={r.label} aria-current={railActive === r.id ? 'page' : undefined} onClick={() => onRail && onRail(r.id)}>
                  <i className={'fa-solid fa-' + r.icon} aria-hidden="true" />
                </button>
              </Tooltip>
            ))}
          </div>
        </nav>
        <main className="kx-main" id="main">{children}</main>
      </div>
    </div>
  );
}

/* ---------- Segmented control (radiogroup with roving tabindex + arrow keys) ---------- */
export function Segmented({ options, value, onChange, label, size }) {
  const refs = React.useRef([]);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const onKey = (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].value); refs.current[n] && refs.current[n].focus();
  };
  return (
    <div className={'kx-seg' + (size === 'lg' ? ' kx-seg--lg' : '')} role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o, i) => (
        <button key={o.value} ref={(el) => (refs.current[i] = el)} role="radio" aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---------- Status pill (AA in both themes; DS Badge is not) ---------- */
export function Pill({ tone = 'neutral', icon, dot, solid, size, children }) {
  return (
    <span className={'kx-pill kx-pill--' + tone + (solid ? ' kx-pill--solid' : '') + (size === 'sm' ? ' kx-pill--sm' : '')}>
      {dot && <span className="dot" aria-hidden="true" />}
      {icon && <i className={'fa-solid fa-' + icon} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ---------- Stat tile (button variant is a drill-down) ---------- */
export function StatTile({ label, value, icon, foot, onClick, pressed }) {
  const inner = (
    <>
      <div className="kx-stat__top"><span className="kx-stat__label">{label}</span>{icon && <span className="kx-stat__icon"><i className={'fa-solid fa-' + icon} aria-hidden="true" /></span>}</div>
      <div className="kx-stat__value">{value}</div>
      {foot && <div className="kx-stat__foot">{foot}</div>}
    </>
  );
  return onClick
    ? <button type="button" className="kx-stat kx-stat--button" onClick={onClick} aria-pressed={pressed}>{inner}</button>
    : <div className="kx-stat">{inner}</div>;
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="kx-empty">
      <span className="kx-empty__icon"><i className={'fa-solid fa-' + icon} aria-hidden="true" /></span>
      <h3 className="kx-empty__title">{title}</h3>
      {children && <p className="kx-empty__text">{children}</p>}
      {action}
    </div>
  );
}

/* ---------- Data table (columns: [{key,label,num,render,sortable}]) ---------- */
export function DataTable({ columns, rows, rowKey = 'id', dense, sort, onSort, onRowClick, selectedKey, caption, maxHeight }) {
  return (
    <div className="kx-table-wrap" style={maxHeight ? { '--kx-table-max-h': maxHeight + 'px' } : undefined}>
      <table className={'kx-table' + (dense ? ' kx-table--dense' : '')}>
        {caption && <caption className="kx-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.num ? 'num' : undefined}
                aria-sort={sort && sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {c.sortable && onSort
                  ? <button className="sort" onClick={() => onSort(c.key)}>{c.label}<i className={'fa-solid ' + (sort && sort.key === c.key ? (sort.dir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort')} aria-hidden="true" /></button>
                  : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[rowKey]} className={onRowClick ? 'is-clickable' : undefined} tabIndex={onRowClick ? 0 : undefined}
              aria-selected={selectedKey === r[rowKey] ? true : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(r); } } : undefined}>
              {columns.map((c) => <td key={c.key} className={(c.num ? 'num ' : '') + (c.muted ? 'muted ' : '') + (c.nowrap ? 'nowrap' : '')}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Dialog + Drawer (shared: focus trap, Esc, scroll lock, restore focus) ---------- */
function useOverlay(open, onClose, ref) {
  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const el = ref.current;
    const focusables = () => el.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = (el.querySelector('[data-autofocus]') || focusables()[0] || el);
    first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey, true); document.body.style.overflow = overflow; prev && prev.focus && prev.focus(); };
  }, [open]);
}
export function Dialog({ open, onClose, title, children, footer, wide, blur }) {
  const ref = React.useRef(null); const id = React.useId();
  useOverlay(open, onClose, ref);
  if (!open) return null;
  return (
    <div className={'kx-scrim' + (blur ? ' kx-scrim--blur' : '')} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'kx-dialog' + (wide ? ' kx-dialog--wide' : '')} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <div className="kx-dialog__head">
          <h2 className="kx-dialog__title" id={id}>{title}</h2>
          <Button variant="ghost" size="sm" aria-label="Close dialog" leftIcon="xmark" onClick={onClose} style={{ width: 28, padding: 0 }} />
        </div>
        <div className="kx-dialog__body">{children}</div>
        {footer && <div className="kx-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  const ref = React.useRef(null); const id = React.useId();
  useOverlay(open, onClose, ref);
  if (!open) return null;
  return (
    <>
      <div className="kx-drawer-scrim" onMouseDown={onClose} />
      <aside className="kx-drawer" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <div className="kx-drawer__head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="kx-section-title" id={id}>{title}</h2>
            {subtitle && <div className="kx-caption" style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" aria-label="Close panel" leftIcon="xmark" onClick={onClose} style={{ width: 28, padding: 0 }} />
        </div>
        <div className="kx-drawer__body">{children}</div>
        {footer && <div className="kx-drawer__foot">{footer}</div>}
      </aside>
    </>
  );
}
/* Destructive confirm (MOD rule: confirm dialog, then toast outcome). Cancel is outline, destructive is the only filled button. */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel }) {
  return (
    <Dialog open={open} onClose={onClose} title={title}
      footer={<><Button variant="outline" onClick={onClose} data-autofocus>Cancel</Button><Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button></>}>
      {children}
    </Dialog>
  );
}

/* ---------- Toast host: DS Toast is presentational only (no portal/queue/timer) ---------- */
const ToastCtx = React.createContext(() => {});
export const useToast = () => React.useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = React.useState([]);
  const dismiss = React.useCallback((id) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const push = React.useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, type: 'info', ...t }]);
    if (t.type !== 'error') setTimeout(() => dismiss(id), t.duration || 5000);   // errors stay until dismissed
    return id;
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'none' }}>
        {items.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast type={t.type} title={t.title} onClose={() => dismiss(t.id)} role={t.type === 'error' ? 'alert' : 'status'}>{t.message}</Toast>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Command palette (Ctrl/Cmd+K) ---------- */
export function CommandPalette({ open, onClose, items, onSelect }) {
  const [q, setQ] = React.useState(''); const [i, setI] = React.useState(0);
  const ref = React.useRef(null);
  useOverlay(open, onClose, ref);
  React.useEffect(() => { if (open) { setQ(''); setI(0); } }, [open]);
  const list = items.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));
  if (!open) return null;
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, list.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
    if (e.key === 'Enter' && list[i]) { onSelect(list[i]); onClose(); }
  };
  return (
    <div className="kx-scrim kx-scrim--blur kx-scrim--top" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kx-cmd" role="dialog" aria-modal="true" aria-label="Command palette" ref={ref} tabIndex={-1}>
        <div className="kx-cmd__input">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{ color: 'var(--fg-2)' }} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={key} placeholder="Search contracts, suppliers and clauses" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="cmd-list" />
          <span className="kx-kbd">Esc</span>
        </div>
        <div className="kx-cmd__list" id="cmd-list" role="listbox">
          {list.length === 0 && <div className="kx-empty" style={{ padding: 24 }}><p className="kx-empty__text">No results for this search. Try a supplier name or a contract number.</p></div>}
          {list.map((x, n) => (
            <button key={x.id} className="kx-menu__item" role="option" aria-selected={n === i} onMouseEnter={() => setI(n)} onClick={() => { onSelect(x); onClose(); }} tabIndex={-1}>
              <i className={'fa-solid fa-' + x.icon} aria-hidden="true" />{x.label}{x.hint && <span className="kx-kbd">{x.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Meter with cap marker ---------- */
export function CapMeter({ spend, cap, label }) {
  const scale = Math.max(spend, cap) * 1.08;
  const pct = (n) => Math.min(100, (n / scale) * 100) + '%';
  const tone = spend > cap ? 'over' : spend > cap * 0.85 ? 'warn' : '';
  return (
    <div className="kx-meter" role="img" aria-label={label || `Spend ${spend} against cap ${cap}`} style={{ '--w': pct(spend), '--cap': pct(cap) }}>
      <div className={'kx-meter__fill' + (tone ? ' kx-meter__fill--' + tone : '')} />
      <div className="kx-meter__cap" />
    </div>
  );
}

/* ---------- Accessible Check / Radio / Switch (native inputs; same look as DS) ---------- */
export function Check({ checked, indeterminate, onChange, label, disabled, ...rest }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className={'kx-field' + (disabled ? ' kx-field--disabled' : '')}>
      <input ref={ref} type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange && onChange(e.target.checked)} {...rest} />
      <span className="kx-box" aria-hidden="true">{indeterminate ? <i className="fa-solid fa-minus" /> : checked ? <i className="fa-solid fa-check" /> : null}</span>
      {label}
    </label>
  );
}
export function RadioField({ checked, onChange, label, disabled, name, value, ...rest }) {
  return (
    <label className={'kx-field' + (disabled ? ' kx-field--disabled' : '')}>
      <input type="radio" name={name} value={value} checked={!!checked} disabled={disabled} onChange={() => onChange && onChange(value)} {...rest} />
      <span className="kx-box kx-box--radio" aria-hidden="true" />
      {label}
    </label>
  );
}
export function SwitchField({ checked, onChange, label, disabled, ...rest }) {
  return (
    <label className={'kx-field' + (disabled ? ' kx-field--disabled' : '')}>
      <input type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={(e) => onChange && onChange(e.target.checked)} {...rest} />
      <span className="kx-track" aria-hidden="true" />
      {label}
    </label>
  );
}
```

#### kit.jsx (usage: a gallery page inside the shell using every piece plus DS components)
```jsx
import './kit.css';
import { Check, RadioField, SwitchField, useTheme, AppShell, Segmented, Pill, StatTile, EmptyState, DataTable, Dialog, Drawer, ConfirmDialog, ToastProvider, useToast, CommandPalette, CapMeter } from './kit-ui.jsx';
const DS = window.Springboard20DesignSystem_019e02;
const { Button, Card, Badge, Tabs, Input, Select, Alert, Progress, Checkbox, Switch, Radio, Breadcrumb, Accordion, Tooltip } = DS;

const rows = [
  { id: 'C-1042', supplier: 'Biffa Municipal Ltd', service: 'Waste collection', cap: 5400000, spend: 18900000, end: '31 Mar 2027', status: 'danger', label: 'Over cap' },
  { id: 'C-2210', supplier: 'Amey Highways', service: 'Highways maintenance', cap: 7200000, spend: 6310000, end: '30 Sep 2026', status: 'warning', label: 'Notice due' },
  { id: 'C-0871', supplier: 'Mears Housing', service: 'Housing repairs', cap: 12400000, spend: 8120000, end: '31 Mar 2028', status: 'success', label: 'Within cap' },
  { id: 'C-3305', supplier: 'Serco Leisure', service: 'Leisure management', cap: 9800000, spend: 7640000, end: '31 Jan 2027', status: 'info', label: 'Review' },
  { id: 'C-1190', supplier: 'Veolia ES', service: 'Street cleansing', cap: 3100000, spend: 1500000, end: '30 Jun 2029', status: 'neutral', label: 'No flag' },
];
const gbp = (n) => '£' + (n / 1e6).toFixed(2) + 'm';

function FieldsDemo() {
  const [a, setA] = React.useState(true); const [b, setB] = React.useState('x'); const [c, setC] = React.useState(false);
  return (<>
    <div style={{ display: 'flex', flexDirection: 'column' }}><Check checked={a} onChange={setA} label="Over cap only" /><Check checked={false} label="Unchecked" /><Check indeterminate label="Mixed" /><Check checked disabled label="Disabled" /></div>
    <div style={{ display: 'flex', flexDirection: 'column' }}><RadioField name="r" value="x" checked={b === 'x'} onChange={setB} label="By supplier" /><RadioField name="r" value="y" checked={b === 'y'} onChange={setB} label="By service" /></div>
    <div style={{ display: 'flex', flexDirection: 'column' }}><SwitchField checked={c} onChange={setC} label="Include indicative figures" /><SwitchField checked label="On" /></div>
  </>);
}
function Gallery({ theme }) {
  const toast = useToast();
  const [seg, setSeg] = React.useState('6');
  const [sort, setSort] = React.useState({ key: 'spend', dir: 'desc' });
  const [dlg, setDlg] = React.useState(false); const [conf, setConf] = React.useState(false); const [drw, setDrw] = React.useState(false); const [cmd, setCmd] = React.useState(false);
  const [menu, setMenu] = React.useState(false); const [sel, setSel] = React.useState('C-1042');
  const [tab, setTab] = React.useState('all');
  const [chip, setChip] = React.useState(true);
  React.useEffect(() => { const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd(true); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  window.__open = { dlg: () => setDlg(true), conf: () => setConf(true), drw: () => setDrw(true), cmd: () => setCmd(true), menu: () => setMenu(true), toast: (t) => toast(t) };
  const sorted = [...rows].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * (a[sort.key] > b[sort.key] ? 1 : -1));
  const cols = [
    { key: 'id', label: 'Contract', sortable: true, nowrap: true, render: (r) => <span className="kx-mono" style={{ color: 'var(--fg-1)' }}>{r.id}</span> },
    { key: 'supplier', label: 'Supplier', sortable: true, render: (r) => <span style={{ fontWeight: 500 }}>{r.supplier}</span> },
    { key: 'service', label: 'Service', muted: true },
    { key: 'cap', label: 'Cap', num: true, sortable: true, render: (r) => gbp(r.cap) },
    { key: 'spend', label: 'Spend to date', num: true, sortable: true, render: (r) => gbp(r.spend) },
    { key: 'meter', label: 'Cap used', render: (r) => <div style={{ width: 120 }}><CapMeter spend={r.spend} cap={r.cap} /></div> },
    { key: 'end', label: 'Ends', muted: true, nowrap: true },
    { key: 'status', label: 'Flag', render: (r) => <Pill tone={r.status} dot>{r.label}</Pill> },
  ];
  return (
    <div className="kx-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Breadcrumb items={[{ label: 'Home', icon: 'house', href: '#/' }, { label: 'Contracts', href: '#/contracts' }, { label: 'Gallery' }]} />
          <h1 className="kx-page-title" style={{ marginTop: 8 }}>Opportunities to investigate</h1>
          <p className="kx-page-sub">Indicative figures from public data. Each flag links to the clause and page it came from.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="outline" leftIcon="magnifying-glass" onClick={() => setCmd(true)}>Search <span className="kx-kbd" style={{ marginLeft: 4 }}>Ctrl K</span></Button>
          <Button leftIcon="download" onClick={() => toast({ type: 'success', title: 'Export started', message: 'Your report downloads in a few seconds.' })}>Export report</Button>
        </div>
      </div>

      <div className="kx-grid kx-grid--4">
        <StatTile label="Opportunities flagged" value="£4.82m" icon="flag" foot={<><Pill tone="warning" size="sm">Indicative</Pill><span>across 14 contracts</span></>} />
        <StatTile label="Over cap" value="3" icon="triangle-exclamation" foot={<span style={{ color: 'var(--kx-danger-text)' }}><i className="fa-solid fa-arrow-trend-up" aria-hidden="true" /> £13.5m above cap</span>} />
        <StatTile label="Notice window, 6 months" value="7" icon="clock" foot="£31.2m contract value" onClick={() => setSeg('6')} pressed={seg === '6'} />
        <StatTile label="Uplifts due" value="5" icon="chart-line" foot={<span style={{ color: 'var(--kx-success-text)' }}>CPI +1.5% capped</span>} />
      </div>

      <div className="kx-grid kx-grid--2-1">
        <div className="kx-card">
          <div className="kx-card__head">
            <h2 className="kx-card-title">Contracts</h2><Badge tone="neutral">{rows.length}</Badge>
            <div className="spacer">
              <Segmented label="Notice window" value={seg} onChange={setSeg} options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '12 months' }]} />
              <div style={{ position: 'relative' }}>
                <Button variant="outline" size="sm" leftIcon="ellipsis" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} style={{ width: 32, padding: 0 }} />
                {menu && (
                  <div className="kx-menu" role="menu" style={{ position: 'absolute', right: 0, top: 36, zIndex: 20 }}>
                    <div className="kx-menu__label">Table</div>
                    <button className="kx-menu__item" role="menuitem" onClick={() => setMenu(false)}><i className="fa-solid fa-file-csv" aria-hidden="true" />Download CSV<span className="kx-kbd">D</span></button>
                    <button className="kx-menu__item" role="menuitem" onClick={() => setMenu(false)}><i className="fa-solid fa-filter" aria-hidden="true" />Edit filters</button>
                    <div className="kx-menu__sep" />
                    <button className="kx-menu__item kx-menu__item--danger" role="menuitem" onClick={() => { setMenu(false); setConf(true); }}><i className="fa-solid fa-trash" aria-hidden="true" />Remove contract</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DataTable columns={cols} rows={sorted} sort={sort} onSort={(k) => setSort((s) => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))} onRowClick={(r) => { setSel(r.id); setDrw(true); }} selectedKey={sel} caption="Contracts ranked by spend" />
          <div className="kx-pager"><span>Showing 1 to 5 of 38 contracts</span><div className="spacer"><Button variant="ghost" size="sm" leftIcon="chevron-left" aria-label="Previous page" disabled style={{ width: 32, padding: 0 }} /><Button variant="outline" size="sm" aria-current="page" style={{ minWidth: 32 }}>1</Button><Button variant="ghost" size="sm" style={{ minWidth: 32 }}>2</Button><Button variant="ghost" size="sm" leftIcon="chevron-right" aria-label="Next page" style={{ width: 32, padding: 0 }} /></div></div>
        </div>

        <div className="kx-card">
          <div className="kx-card__head"><h2 className="kx-card-title">Status pills</h2></div>
          <div className="kx-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill tone="success" dot>Within cap</Pill><Pill tone="warning" icon="clock">Notice due</Pill><Pill tone="danger" icon="triangle-exclamation">Over cap</Pill><Pill tone="info">Review</Pill><Pill tone="neutral">No flag</Pill>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill solid tone="success">Within cap</Pill><Pill solid tone="warning">Notice due</Pill><Pill solid tone="danger">Over cap</Pill><Pill solid tone="info">Review</Pill><Pill solid tone="neutral">No flag</Pill>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="kx-tag">waste <i className="fa-solid fa-xmark" aria-hidden="true" /></span>
              <button className="kx-chip" aria-pressed={chip} onClick={() => setChip(!chip)}>Over cap</button>
              <button className="kx-chip" aria-pressed="false">Due in 6 months</button>
              <span className="kx-kbd">Ctrl</span><span className="kx-kbd">K</span>
            </div>
            <div className="kx-eyebrow">DS Badge for comparison</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Badge tone="green" dot>Within cap</Badge><Badge tone="amber">Notice due</Badge><Badge tone="red">Over cap</Badge><Badge tone="blue">Review</Badge><Badge tone="neutral">No flag</Badge></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="outline" onClick={() => setDlg(true)}>Open dialog</Button>
              <Button variant="outline" onClick={() => setDrw(true)}>Open drawer</Button>
              <Button variant="outline" onClick={() => toast({ type: 'warning', title: 'Close to cap', message: 'Highways maintenance has used 88% of its cap.' })}>Show toast</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="kx-grid kx-grid--2-1">
        <div className="kx-card">
          <div className="kx-card__head"><h2 className="kx-card-title">Dense table with footer</h2></div>
          <DataTable dense maxHeight={96} columns={cols.slice(0, 5)} rows={rows} />
        </div>
        <div className="kx-card"><EmptyState icon="file-circle-question" title="No contracts match these filters" action={<Button variant="outline" onClick={() => toast({ type: 'info', title: 'Filters cleared', message: 'Showing all 38 contracts.' })}>Clear filters</Button>}>Change the notice window or remove a filter to see more contracts.</EmptyState></div>
      </div>

      <div className="kx-card"><div className="kx-card__head"><h2 className="kx-card-title">Accessible controls</h2></div>
        <div className="kx-card__body" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <FieldsDemo />
        </div></div>

      <Dialog open={dlg} onClose={() => setDlg(false)} title="Export opportunities report" footer={<><Button variant="outline" onClick={() => setDlg(false)}>Cancel</Button><Button onClick={() => { setDlg(false); toast({ type: 'success', title: 'Report queued', message: 'You will get a download link in a moment.' }); }}>Export report</Button></>}>
        Your report includes 14 flagged contracts and the clause reference for each flag. Figures are indicative until you check them against the contract.
      </Dialog>
      <ConfirmDialog open={conf} onClose={() => setConf(false)} title="Remove contract C-1042?" confirmLabel="Remove contract" onConfirm={() => { setConf(false); toast({ type: 'success', title: 'Contract C-1042 removed', message: 'Its spend lines are now unmatched. You can restore it from the register.' }); }}>
        This removes the contract and its extracted clauses from your register. Spend lines matched to it become unmatched.
      </ConfirmDialog>
      <Drawer open={drw} onClose={() => setDrw(false)} title="Contract C-1042" subtitle="Biffa Municipal Ltd. Waste collection" footer={<><Button variant="outline" onClick={() => setDrw(false)}>Close panel</Button><Button leftIcon="file-lines">Open source clause</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert type="error" title="Spend is over the contract cap">£18.90m has been paid against a £5.40m cap. Check the clause before you act.</Alert>
          <div><div className="kx-eyebrow">Cap used</div><div style={{ marginTop: 8 }}><CapMeter spend={18900000} cap={5400000} /></div></div>
          <Accordion defaultOpen={[0]} items={[{ title: 'Clause 4.2 Value and cap', content: 'The total contract value shall not exceed £5,400,000 over the term. Page 14.' }, { title: 'Clause 9 Termination', content: 'Either party may terminate on 90 days written notice. Page 22.' }]} />
        </div>
      </Drawer>
      <CommandPalette open={cmd} onClose={() => setCmd(false)} onSelect={(x) => toast({ type: 'info', title: x.label })} items={[
        { id: 1, icon: 'file-contract', label: 'C-1042 Biffa Municipal, waste collection', hint: 'Over cap' }, { id: 2, icon: 'file-contract', label: 'C-2210 Amey Highways' },
        { id: 3, icon: 'clock', label: 'Open renewal radar' }, { id: 4, icon: 'flag', label: 'Open opportunities list' }]} />
    </div>
  );
}
function Root() {
  const [theme, setTheme] = useTheme();
  return (
    <ToastProvider>
      <AppShell appName="Kontor financial layer" rail={[{ id: 'home', icon: 'house', label: 'Overview' }, { id: 'radar', icon: 'clock', label: 'Renewal radar' }, { id: 'cap', icon: 'scale-balanced', label: 'Cap vs spend' }, { id: 'opp', icon: 'flag', label: 'Opportunities' }]} railActive="opp" theme={theme} onTheme={setTheme}>
        <Gallery theme={theme} />
      </AppShell>
    </ToastProvider>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
```

### 7.3 Per-gap summary (what to call, how it behaves)
| Gap | Build with | Notes |
|---|---|---|
| Data table | `DataTable` + `.kx-table` inside `.kx-card` | header 12px/500 caps `--fg-2`, 1px `--border-2` under header, rows `--border-1`, hover `--kx-row-hover`, **no zebra**, numeric columns `num: true` (right aligned, `tabular-nums`), `dense` variant (32px rows, desktop only), sticky header via `maxHeight`, selectable row `aria-selected`, clickable rows are keyboard operable (`tabIndex=0`, Enter/Space), sortable header buttons with `aria-sort`, `caption` prop renders sr-only caption. Rows are 44px (touch rule). |
| Modal | `Dialog` / `ConfirmDialog` | `role=dialog aria-modal aria-labelledby`, focus trap, Esc, outside click, scroll lock, focus restored. Footer: Cancel `outline` + one action (primary or destructive). `data-autofocus` on the safest button. |
| Drawer | `Drawer` | right-hand, 520px, 200ms slide, same overlay hook. Use it for "Evidence: clause and page". |
| Segmented | `Segmented` | `radiogroup` + roving tabindex + arrow keys. Selected thumb `--kx-seg-thumb` with `--shadow-1` and inner hairline. |
| Status pill | `Pill tone=success|warning|danger|info|neutral` (`dot`, `icon`, `solid`, `size="sm"`) | uses `--tone-*-surface-default/text` and `--border-*-subtle`; AA everywhere. |
| Tag / chip | `.kx-tag` (static, removable with an x button you label), `.kx-chip aria-pressed` (filter toggle, 32px; 44px on coarse pointers) | |
| Stat tile | `StatTile` (static) or with `onClick` (button, `aria-pressed`) | label 12/500 `--fg-2`, value `Inter Display 600 28/1.1 tabular-nums`, foot 12px. Hero variant `.kx-kpi--hero` (44px) for the headline "£X across N contracts". |
| Empty state | `EmptyState icon title action` | 48px circle `--bg-2`, title 16/600, text 14 `--fg-2` max 44ch, one secondary/primary action. |
| kbd | `.kx-kbd` | Geist Mono 11/500, `--bg-2` + `--border-2`, text `--fg-2` (DS preview used `--fg-3`, fails AA). |
| Menu/popover | `.kx-menu` + `.kx-menu__item` (`role=menu`/`menuitem`) | DS-preview-accurate: 4px padding, 8px radius, items 13px radius 6, danger `--kx-danger-text`, kbd right. Positioning is yours (absolute under a relative wrapper, as in the gallery); needs outside-click/Esc handling if you use it widely. Do not render inside a `Card` (clipped). |
| Command palette | `CommandPalette` (+ `Ctrl/Cmd K` listener in the gallery) | blur(8px) scrim, `role=combobox`/`listbox`/`option`, arrow keys + Enter. |
| Pagination | `.kx-pager` + DS `Button size="sm"` (`aria-current="page"`, `aria-label` on chevrons) | text "Showing 1 to 25 of 312 contracts". |
| Cap vs spend | `CapMeter spend cap` | `Progress` clamps at 100%, so this adds a 2px cap marker and overrun colour (`--accent` under 85%, `--warning` 85-100%, `--danger` over). Always show the numbers as text and a Pill next to it (colour alone is not enough: meter fill vs `--bg-3` track is 2.3:1 in dark for red). |
| Chart | none in DS | Use inline SVG/CSS with `--accent`, `--success`, `--warning`, `--danger`, `--bg-3` tracks and `--fg-2` labels, `font-variant-numeric: tabular-nums`; no gradients, no third-party chart lib needed for bars/timelines. The renewal radar can be a grouped table + `CapMeter`-style bars. |
| Toast host | `ToastProvider` + `useToast` | bottom-right, `aria-live=polite`, auto-dismiss 5s, errors persist and use `role=alert`. |
| Theme toggle | `useTheme`, `ThemeToggle` | writes `data-theme` + `localStorage['kontor-theme']`. Default dark. |

### 7.4 Verified measurements for the kit
Keyboard: DS Button focus ring 2px accent (dark rgb(31,111,235), light rgb(9,105,218)); native `Check` toggles with label click and Space, hit target 116x44; `SwitchField` toggles with Space; rail tooltip fully inside the body (x 73, w 100); sticky header stays pinned at wrapper top after `scrollTop=40`; Escape closes dialogs, drawer and palette; theme toggle flips `data-theme` and `localStorage` both ways.

### 7.5 Contrast of kit pairs (computed)
Dark: nav 6.22, rail icon 6.71, rail active icon 3.78 (UI), accent underline 3.98 (UI), table th 7.84, muted td 7.84, selected row 15.63/7.14, chip pressed 8.35 (now `--fg-1`), segmented 10.46/6.62, stat danger 6.73, stat success 6.49, kbd 6.62, solid pills 4.58 to 5.49, control border 3.75, switch off track 3.75, info text 8.01.
Light: nav 5.91, rail icon 6.55, rail active icon 4.38, underline 4.68, table th 6.27, selected row 14.90/5.69, segmented 17.16/5.91, stat danger 6.16, stat success 5.13, kbd 5.91, solid pills 4.58 to 5.55, control border 4.38, switch off 4.58, info text 5.19.
Not met by design: meter fill vs `--bg-3` track (dark red 2.27:1): numbers and Pill carry the meaning.

---

## 8. Typography recipes

DS classes (from `colors_and_type.css`): `.ds-display-1` 112/700, `.ds-display-2` 60/700, `.ds-h1` 36/600, `.ds-h2` 30/600, `.ds-h3` 24/600 (all Inter Display, tight tracking), `.ds-h4` 20/600 (Inter), `.ds-body-md` 16/24, `.ds-body` 14/20, `.ds-body-sm` 13/18 (colour `--fg-2`), `.ds-label` 14/20 500, `.ds-caption` 12/16 `--fg-2`, `.ds-caption-caps` 12/16 500 uppercase 0.06em `--fg-2`, `.ds-micro` 10/14 `--fg-3` (fails AA: avoid), `.ds-button` 14/20 500, `.ds-button-sm` 12/16 500, `.ds-mono` Geist Mono 13/18. Weights available locally: Inter 400/500/600/700 (+300 and Italic 400), Inter Display 400/500/600/700. Do not use 100/200/800/900.

| Role | Use | Spec |
|---|---|---|
| Page title | `.kx-page-title` (= `.ds-h3`) | Inter Display 600 24/1.25, -0.01em, `--fg-1`. (DS Dashboard: 24px/600/-0.01em.) |
| Page subtitle | `.kx-page-sub` | Inter 400 14/20 `--fg-2`, margin-top 4 |
| Hero headline ("£X across N contracts") | `.kx-kpi--hero` or `.ds-h1` | Inter Display 600 44/1.05 (or 36/1.15), tabular-nums |
| Section title | `.kx-section-title` (= Card `title` prop) or `.ds-h4` for big sections | Inter 600 16/1.3 (or 20/1.3) |
| Card title (custom card header) | `.kx-card-title` | Inter 600 14/20 (DS ui-kit card headers) |
| Table header | `.ds-caption-caps` (`th` in `.kx-table`) | 12/16 500 uppercase 0.06em `--fg-2` (DS ui-kit used 11px `--fg-3`, fails AA) |
| Table cell | `.kx-table td` | Inter 400 13/18 `--fg-1`; secondary columns `--fg-2`; names 500 |
| Numeric cell | `.num` | right-aligned, `font-variant-numeric: tabular-nums` (verified for Inter and Inter Display) |
| Body | `.ds-body` | 14/20 |
| Caption / helper / meta | `.ds-caption` / `.kx-caption` | 12/16 `--fg-2` |
| Eyebrow / stat label | `.kx-eyebrow` / `.kx-stat__label` | 12/16 500 (caps optional) `--fg-2` |
| KPI number | `.kx-kpi` / `.kx-stat__value` | Inter Display 600 28/1.1, -0.01em, tabular-nums |
| IDs, clause refs, dates in tables | `.kx-mono` / `.ds-mono` | Geist Mono 12-13px `--fg-2` (falls back to ui-monospace offline) |
| Button text | `Button` | 14/500 (12/500 sm) |
| Currency formatting | `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })`, compact `£4.82m` for tiles | |

Voice (product UI): sentence case, address the user as "you", no emoji, no exclamation marks, buttons `[Verb]+[Object]` ("Export report", "Open source clause"), errors `[What]+[Why]+[How]`, success = specific + consequence, frame every figure as an "opportunity to investigate" (spec), never "savings".

---

## 9. How the DS authors compose tables, stat cards and lists (ui_kits reference) and the token mapping

The reference kit (`ui_kits/springboard/*.jsx`, only in the extraction at `scratchpad/ds/springboard-design/`) is dark-only with literal hex. Layout facts worth copying: page padding `24px 32px`, gap 20; stat row = 4 flex cards (gap 16), card padding 16, radius 8, label 12/500, 28px icon chip (`#28292F`, radius 6), value 28/600 -0.01em, delta line 12px with FA `arrow-trend-up/down` and "vs last week" in tertiary; main grid `2fr 1fr` gap 20; table card has a 14px/16px header strip (title 14/600, count Badge, right-aligned 200px search + `sm` outline Button), `th` 11px caps, cells `12px 16px`, row hairline `#1A1B22`, status as dot Badge, mono timestamps, trailing ellipsis icon button; activity list rows 28px avatar + 13px text (names in `#F2F3F7` 500) + 12px time; nav items 13px with 14px icon.
| UI-kit hex | Token |
|---|---|
| `#1A1B22` card/inputs | `--bg-1` (card: `--kx-card-bg`) |
| `#28292F` borders / chips | `--border-1` / `--bg-2` |
| `#3E3F47` strong border | `--border-2` |
| `#fff`, `#F2F3F7` text | `--fg-1` |
| `#ADAFB7` | `--fg-2` |
| `#74757E`, `#5C5D64` | `--fg-3` (decorative only) |
| `#1F6FEB` | `--accent` |
| `#4F95FF` / `#4185EE` link/blue text | `--kx-info-text` |
| `#F85149` red text | `--kx-danger-text` |
| `#2EA043` / `#3EA251` green text | `--kx-success-text` |
| `#CB8F09` / `#D29922` amber text | `--kx-warning-text` |
| `#0E0F12` sidebar | `--bg-canvas` |

Light-mode specimens in the DS previews use `#E1E3E5` hairlines and white menus with `#E1E3E5` borders; our `--kx-pop-border: var(--border-2)` in light matches the intent.

---

## 10. MOD behavioural rules mapped to code

| Rule | Pattern |
|---|---|
| Destructive = confirm dialog then toast | `ConfirmDialog` (Cancel `outline` with `data-autofocus`, `destructive` action) then `toast({ type: 'success', ... })` (verified in gallery: menu item "Remove contract"). |
| Max one primary per section | Page header: one primary (`Export report`); other buttons `outline`/`ghost`. In dialogs: Cancel `outline` + one filled. |
| Button labels `[Verb]+[Object]` | "Export report", "Open source clause", "Clear filters", "Remove contract". Never "OK/Submit". |
| Errors `[What]+[Why]+[How]` | "Import failed. File exceeds 10MB limit. Compress the file and retry." |
| Icon-only buttons need `aria-label` | Rail buttons, close buttons, pager chevrons, theme toggle (all have it in kit). |
| WCAG AA | Use `--fg-2` minimum for text, `Pill` for status, `--kx-*-text` for coloured text (section 5). |
| 44px targets | Table rows 44, checkbox/switch fields 44, `@media (pointer: coarse)` raises buttons/inputs to 44; DS Button md is 36 on desktop (DS-native). Dense table is the one documented exception. |
| Visible focus | Global `:focus-visible` rule in kit.css section 2 (2px `--accent`, `!important` for DS Button). |
| No gradients, no left-border cards, no hand-drawn SVG icons | Kit uses none; only the W logo SVG (verbatim from the template). Skeleton's shimmer gradient is DS-internal. |
| Icons | Font Awesome solid via `<i className="fa-solid fa-NAME" aria-hidden="true" />`. Verified present in `vendor/fontawesome` 6.5.2: house, clock, scale-balanced, flag, file-contract, file-lines, file-invoice, file-invoice-dollar, magnifying-glass, triangle-exclamation, circle-exclamation, circle-check, circle-info, chevron-left/right/up/down, arrow-trend-up/down, arrow-up/down/right, arrow-up-right-from-square, sterling-sign, coins, hand-holding-dollar, money-bill-wave, calendar-days, calendar-xmark, bell, gear, download, filter, sort, sort-up, sort-down, xmark, ellipsis, link, building-columns, handshake, shield-halved, eye, lightbulb, receipt, money-bill-transfer, sun, moon, table-cells-large, share-nodes, comment, asterisk, file-circle-question, inbox, folder-open, bars, plus, minus, check, pen, trash, rotate-right, layer-group, chart-line, chart-column, chart-simple, gauge-high, stopwatch, hourglass-half, bullseye, list-check, table-list, scale-unbalanced, landmark, pound-sign, city, file-pdf, file-csv, code-compare, diagram-project, users, user, circle-user, right-from-bracket, circle-question, book-open, quote-left, highlighter, thumbtack, bookmark, copy, square-check. |

---

## 11. Appendix

### Re-running the audit
```
# kit/harness.jsx -> .scratch/harness.jsx, then (from /home/user/LG-Proto1)
node scripts/build.mjs --entry .scratch/harness.jsx --outdir .scratch/out
# harness.html mirrors index.html but loads out/app.js and reads ?theme=dark|light; screenshots via playwright-core + scripts/static-server.mjs
```
Cleanup done: `/home/user/LG-Proto1/.scratch/` removed after research; nothing under `design-system/`, `src/` or `index.html` was modified.

### Things verified NOT to be problems
- DS bundle loads with zero `__errors`; all 19 components render in both themes.
- `color-mix()` survives esbuild `chrome110` target unchanged.
- Inter/Inter Display tabular numerals work; weights 400/500/600/700 are present.
- Alert/Toast/Tooltip/Accordion/Tabs/Breadcrumb/Progress/Spinner/Avatar/Card colours are AA in both themes for their text.
- DS Button (primary/secondary/outline/ghost/destructive) text contrast passes in both themes.
