# Springboard 2.0 — Whitespace Design System

Springboard 2.0 is Whitespace's internal design system — a comprehensive UI library built on top of **shadcn/ui** primitives, refined for **MOD / defence applications**. It is a reference for AI development tools (Claude, Cursor, Copilot) to build standardized, accessible product surfaces. The library spans atomic primitives (Button, Input, Badge) up through complex composites (Data Table, Calendar, Multi-Select, Side Navigation), plus Charts, Templates, Shells and a Playground.

Design tone: **professional, direct, authoritative, instructional** — for a user base of low-to-medium technical familiarity. Dark-first.

## Sources

- **Figma file:** "Springboard 2.0 [17-06].fig" — 84 pages, ~88k nodes, 243 component families, 3,114 design tokens. Version 1.0 (Feb 2026). Mounted as a virtual filesystem during construction.
- **Foundation:** [shadcn/ui](https://ui.shadcn.com) — token names, naming conventions and component anatomy follow shadcn; MOD customizations layer on top.
- **Type:** Inter (primary), Geist + Geist Mono (secondary).

## Index

- `README.md` — this file (context, content rules, visual foundations, iconography).
- `SKILL.md` — Agent Skills entry point for invoking this system.
- `styles.css` — **global entry point** (read by the compiler). Imports the token dump + curated foundation.
- `colors_and_type.css` — curated, **dark-first** semantic API (`--bg-1`, `--fg-1`, `--accent`, type recipes, fonts, motion keyframes).
- `components/fig-tokens.css` — complete token dump generated from the Figma Variables (raw ramps `cool-grey`/`blue`/… + the Figma semantic layer `--background-surface`/`--action-primary-default`/… + shadcn / your-brand / breakpoint modes). Source of truth, verbatim.
- `components/` — **19 registered components** (`<Name>.jsx` + `<Name>.d.ts`): Button, Badge, Input, Textarea, Card, Avatar, Checkbox, Radio, Switch, Select, Alert, Tooltip, Tabs, Accordion, Breadcrumb, Progress, Spinner, Skeleton, Toast. Token-driven, theme-aware, blue-primary.
- `assets/` — logos, social icons, brand imagery.
- `fonts/` — webfonts (Inter optical cuts).
- `preview/` — token / type / component specimen cards for the Design System tab.
- `ui_kits/springboard/` — hand-built reference dashboard + `ui.jsx` primitives.

## Behavioural rules (MOD)

These are mandatory constraints from the file's AI-instructions page, and take precedence over inference:

- **Destructive actions** (delete, revoke, archive) MUST go through a confirmation Dialog, then a Toast outcome. Never execute without confirmation.
- **Button hierarchy:** max ONE primary button per screen section. Cancel is always secondary. Destructive is always the destructive variant.
- **Button labels:** `[Verb] + [Object]` — "Submit Mission Report", not "Submit" / "OK".
- **Error messages:** `[What] + [Why] + [How]` — "Upload failed. File exceeds 10MB limit. Compress and retry."
- **Success messages:** specific + consequence — "Personnel record PR-8472 updated. Changes sync in 5 minutes."
- **Icon-only buttons** MUST have an `aria-label`.
- **Accessibility is mandatory:** keyboard access, visible focus, WCAG AA contrast (4.5:1 text / 3:1 UI), 44×44px minimum touch targets.

## Components

The 19 components in `components/` are token-driven React function components, exported on the compiled bundle:

```js
// in a page that loads _ds_bundle.js (and the global CSS via styles.css)
const { Button, Input, Alert } = window.Springboard20DesignSystem_019e02;
```

They read their colours from the curated CSS variables, so they follow the active theme (dark by default; add `[data-theme="light"]`). The **primary button is brand blue** (`#1F6FEB` dark / `#0969DA` light) — note this differs from the file's raw shadcn button, which is dark slate; we standardised on blue per the brand accent. See `components/showcase-*.html` for live examples.

## Content fundamentals

Whitespace UI copy is **direct, lowercase-friendly, and quietly confident**. Examples lifted from the file:

- Sentence case for everything except product names ("Login to your account", "Forgot password?", "Enter your email below to login to your account").
- Helper text speaks to the user as **you** — never "the user".
- No exclamation marks. No emoji in product chrome (emoji only appear inside user-generated message bubbles where they belong).
- Buttons are imperative verbs: "Login", "Continue", "Add to cart", "Sign in with Google" — never "Click here".
- Empty states and captions are short and concrete: "Used for low-emphasis supporting information such as helper text, metadata, hints, or secondary descriptions."
- Section descriptions in the system itself read like docs, not marketing: "The Typography Guide is a collection of text styles for building consistent components and layouts."

Tone: utilitarian, slightly dry, never cute. Think GitHub / Linear, not Mailchimp.

## Visual foundations

**Color.** Dark-first. The neutral ramp is **cool-grey**: canvas `#0E0F12` (cool-grey-950), stepping to surfaces `#121417` → `#1A1B22` → `#28292F` → `#3E3F47`, with a deepest `#08090B` (975) for sunken wells. Text inverts: `#FFFFFF` primary, `#ADAFB7` secondary, `#74757E` tertiary. Brand accent is blue — `#1F6FEB` in dark mode, `#0969DA` in light — hover and press now **darken** (`#1158C7` → `#0D419D`). Semantic set: destructive red `#DA3633`, success green `#3EA251`, warning amber `#CB8F09`, plus purple `#8A38F5`. The Figma file also ships a full **named semantic layer** (`--background-surface`, `--text-standard-text-default`, `--action-primary-default`, `--border-standard-default` …) in `components/fig-tokens.css`. Note: the file's variable **default mode is light** (dark is the `.dark` override); this kit ships dark-first via `colors_and_type.css`.

**Type.** Inter across the board, with two optical sizes — the **18pt cut** for body / UI / labels and **Inter Display** (28pt cut) for headings 24px and up. Geist as a secondary face for some surfaces, Geist Mono for code/keyboard. Weights live at 300 / 400 / 500 / 600 / 700 / 800. Display sizes scale up to 112px (cover thumbnails). Body is 14/20 by default, captions 12/16, micro 10. Tight headings use `line-height: 100%`; body relaxes to 1.4–1.5.

**Spacing.** A 4px base grid. Padding tokens cluster at 4 / 8 / 12 / 16 / 24 / 32 / 48 / 56. Gaps inside button groups and forms favour 8–12px.

**Backgrounds.** Mostly flat solid surfaces. The Cover/Thumbnail page uses a single full-bleed gradient PNG (`3df8cdf133f8.png`) plus a subtle 15%-opacity vector pattern band. No noise overlays in product chrome. No hand-drawn illustrations.

**Corner radii.** 2 (chips, micro), 6 (inputs, default cards), 8 (buttons), 9999 (pills, avatars, the W logo dot).

**Borders.** 1px hairlines in `#28292F` (dark) / `#E1E3E5` (light). Inputs get a 1px stroke that lifts to brand blue on focus + a 3px focus ring at ~20% blue alpha.

**Shadows.** Two systems coexist:
- *Elevation:* layered low-alpha shadows — `0 1px 2px rgba(0,0,0,.05)`, `0 4px 8px rgba(46,51,56,.08)`, `0 10px 24px rgba(46,51,56,.10)`. Used on cards, popovers, dropdowns.
- *Inner ring:* `inset 0 0 0 1px rgba(225,227,229,...)` — the shadcn-style hairline used on raised buttons and tonal surfaces.

**Cards.** Surface `#1A1B22` (dark) / `#FFFFFF` (light), 6–8px radius, 1px hairline border, optional elevation shadow. Padding 16–24.

**Hover / press.** Hover lightens the surface one step (e.g. `#1F6FEB` → `#4185EE`) or drops opacity to 0.9. Press darkens one step + shrinks to `scale(0.98)` on primary actions. Disabled drops to 40% opacity.

**Animation.** Sparing. Standard 150ms ease-out for hover, 200ms ease-in-out for opens, no bounces, no spring physics. Skeletons use a slow 1.5s shimmer.

**Transparency / blur.** Used on overlays only — modal scrims at `rgba(0,0,0,0.5)`, command palettes pick up a `backdrop-filter: blur(8px)`. Avoid translucent surfaces in normal layouts.

**Imagery.** Cool, slightly muted, no warm grain. Brand thumbnail uses a deep gradient artwork. UI screenshots show real product chrome in dark mode.

**Layout rules.** Side nav fixed left, header fixed top, content scrolls. Container DS sets a 1449px max content width inside foundation pages. Mobile breakpoints documented in `Foundations-Tokens-WIP/Breakpoints`.

## Iconography

The system relies on the **Font Awesome** library — the Figma file has a dedicated `/Font-awesome-icons` page with hundreds of glyphs at default + filled variants, used at 16/20/24px. Common icons referenced across components: `chevron-down`, `chevron-right`, `circle-info`, `trending-up`, `square-dashed`. Stroke weight is regular (≈1.5px), corners are rounded.

For this kit we link Font Awesome via the official CDN (`6.5.x`) — see `colors_and_type.css` and component examples. If you need a Lucide-style replacement, prefer Lucide's "default" stroke (1.5–2px) at the same sizes.

**Brand logos.** The "W" mark lives in `assets/logos/w-mark.svg` — white W on a near-black `#1A1B22` 40px disc (`border-radius: 9999px`). Negative variants sit on white. Social icons (Apple, GitHub, Google, Figma, Discord, Slack-style …) are provided as both color-original and color-negative versions; copy from `assets/social/` as needed.

**Emoji & unicode.** Not used in chrome. Unicode arrows / bullets / chevrons are replaced by Font Awesome glyphs. Emoji is acceptable inside user content (chat bubbles, reactions) only.

## Notes

- Font files are linked via Google Fonts (`Inter`, `Geist`, `Geist Mono`) — if you want self-hosted .woff2 files, drop them in `fonts/` and update `colors_and_type.css`.

> **Update:** Inter is now self-hosted from `fonts/` (full optical-size set, 18pt + 24pt + 28pt cuts; we map 18pt → `Inter`, 28pt → `Inter Display`). Geist + Geist Mono still come from Google Fonts.
- The full Figma semantic-token layer is now materialized verbatim into `components/fig-tokens.css` (light = `:root`, dark = `.dark`). For quick work prefer the curated dark-first roles in `colors_and_type.css` (`--bg-1`, `--fg-1`, `--accent`), which map cleanly onto shadcn's `--background` / `--foreground` / `--primary`.
