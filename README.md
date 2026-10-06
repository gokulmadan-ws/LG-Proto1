# Kontor financial layer: Stage 1 prototype

A working, demo-grade prototype of the **Kontor financial layer** for one council. It reads contracts and public spend, then flags **opportunities to investigate**: contracts about to renew, spend over a contract cap, and price rises above an index cap. Every flag links to the clause and page it came from.

- Built in the **Springboard 2.0** design system, inside the **Springboard App Shell**.
- **Dark and light mode.** Dark is the default. The toggle is in the header.
- **Sample data only.** Marchbank Borough Council, its suppliers, contracts and payments are fictional. Contract text is illustrative.
- A static front end. No server, no CDN, no sign-in. It works offline.

**Live preview:** https://gokulmadan-ws.github.io/LG-Proto1/ (GitHub Pages, from this branch, root folder)
**How it was built:** `run-report.html` (open it in a browser, or add `/run-report.html` to the live link)

## Show it in five minutes

Open the **Guide** tab in the header. It has the tour, things to try, how to read the numbers and a glossary. The short version:

1. **Overview.** "£6.1m across 15 contracts flagged as opportunities to investigate."
2. **Renewal radar.** What needs a decision in the next 3, 6 and 12 months, and what has already slipped.
3. **Opportunities.** Click the top row, then "View clause, page 23". You land on clause 14.3 of the Highways contract: the £5,000,000 cap that £8,350,000 has been paid against.
4. **Close.** "This is one council's contracts and spend. Imagine your full estate."

Things worth trying live: mark a flag "Explained" and watch the headline fall to £2.8m; confirm the suggested supplier match for Larchmont Grounds Maintenance on **Cap vs spend → Supplier matches**; change the renewal rate in **Settings**.

## Run it

```
npm install          # only needed to rebuild
npm run serve        # http://localhost:4173  (any static server works)
```

Or open `dist/kontor-prototype.html`: one file, fully offline.

| Command | What it does |
|---|---|
| `npm run build` | Bundles `src/` into `dist/app.js` and `dist/app.css` (esbuild) and the offline Springboard CSS into `dist/ds/` |
| `npm run standalone` | Writes the single-file build `dist/kontor-prototype.html` |
| `npm run data` | Regenerates `src/data/sample.json` (deterministic, byte-identical every run) |
| `npm test` | Engine golden tests, smoke tests (every route, both themes, accessibility) and the shell probe |
| `npm run test:e2e` | One end-to-end file per area of the app |

`dist/` is committed, so the site works without a build step.

## How it is put together

- `src/lib/engine.js` is a pure rules engine. Radar bands, cap use, price-rise tests, flags, ranking and the headline are all **computed in the browser** from contracts, extractions and payments, so every "how this is calculated" panel matches what is on screen. The as-of date is fixed at **6 October 2026** and nothing reads the clock.
- `src/data/sample.json` holds 24 contracts, 336 extracted answers (each with page, clause and quote) and 1,264 payments.
- `src/views/` has one file per screen. `src/ui/` and `src/charts/` are the kit and chart library, built only from Springboard tokens.
- `design-system/` is the Springboard 2.0 copy and is never edited. The shell is a React port of the App Shell template with theme tokens added.
- Decisions, file ownership and the research behind them: `docs/blueprint.md`, `docs/research/`.

## What it does not do

- It does not ingest documents. It starts after extraction, so every answer is shown as already extracted.
- Indicative pounds are prototype assumptions (for example 5% of annual value for a renewal). They are labelled as such on screen and on the Method page.
- Stage 2 (cross-council comparison) and the "not yet" items are shown on the Roadmap, not built.
- Tested in Chromium only.
