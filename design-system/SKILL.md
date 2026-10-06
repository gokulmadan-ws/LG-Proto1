---
name: springboard-design
description: Use this skill to generate well-branded, accessible interfaces and assets for Whitespace Springboard 2.0 — a dark-first, shadcn-based design system for MOD / defence applications. Contains design guidelines, tokens, type, fonts, assets, and a registered component library.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **Tokens & type** — `styles.css` is the global entry point. `colors_and_type.css` holds the curated dark-first API (`--bg-1`, `--accent`, type recipes); `components/fig-tokens.css` is the full Figma token dump. Import; never re-declare colours or fonts inline.
- **Components** — 19 registered components in `components/` (Button, Badge, Input, Textarea, Card, Avatar, Checkbox, Radio, Switch, Select, Alert, Tooltip, Tabs, Accordion, Breadcrumb, Progress, Spinner, Skeleton, Toast). Reach via `const { Button } = window.Springboard20DesignSystem_019e02` after loading `_ds_bundle.js`. Primary button is brand blue.
- **Logo** — `assets/logos/w-mark.svg` (white W on `#1A1B22` disc, `border-radius: 9999px`).
- **OAuth logos** — `assets/social/{google,github,apple,discord}.svg`.
- **Icons** — Font Awesome 6 (linked from CDN by `colors_and_type.css`). Solid style, 16/20/24px.
- **Fonts** — Inter primary (self-hosted optical cuts), Geist secondary, Geist Mono for code.
- **Theme** — Dark by default (`#0E0F12` canvas). Set `data-theme="light"` on the root for light mode.

## Behaviour (MOD — mandatory)

Destructive actions need a confirmation dialog. Max one primary button per section. Button labels are `[Verb] + [Object]`; errors are `[What] + [Why] + [How]`. Icon-only buttons need `aria-label`. WCAG AA contrast; 44px touch targets.

## Voice & content

Sentence case. Address the user as "you". No emoji in chrome. No exclamation marks. Buttons are imperative verbs ("Continue", "Login", "Add to cart"). Helper text is short, concrete, and never marketing-y.

## Don'ts

- Don't introduce gradients beyond the cover treatment.
- Don't use rounded-corner-with-colored-left-border cards — not in the system.
- Don't draw your own SVG icons. Use Font Awesome via the CDN already linked.
- Don't re-pick blue / red / green hexes — use `--accent`, `--danger`, `--success`.
