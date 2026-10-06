# Handoff INT: foundation integration

Read `docs/foundation-status.md`: it is the hand-over to the view agents (what is ready, copy-paste snippets for the six most-used things, contract changes, rulings on every open item from A1, A2 and A3, known gaps).

## What I did

1. Built the real entry strictly (`npm run build`), audited the css: order `shell, kit, charts, app`; one `html, body` background rule (`shell.css`); texture referenced once as a file; `dist/app.css` 78 KB; no `http(s)` in any built css; `dist/ds/` present; `design-system/` untouched.
2. Replaced A1's local stand-ins with the real A3 pieces: `ConfidencePill` uses the kit `Pill`, `ToastHost` renders the kit toast, `ConfirmHost` renders the kit `ConfirmDialog`. Added `ToastBridge` (in `components/ToastHost.jsx`, mounted by `AppFrame`) so the kit's `useToast()` and `useUI().toast` are one stack. Removed the now dead `.toast-host`, `.confirm-dialog`, `.conf-pill` css.
3. Updated the smoke selectors and the harness (`axe()` waits for enter animations) and fixed the shell-gallery fixture's css imports. `npm test` is green.
4. Wrote the integration probe (`tests/fixtures/int-probe.jsx`, `src/dev/INT.jsx`) and `tests/foundation.mjs`; fixed the seams it found (see below). Wrote `tests/fixtures/int-snippets.jsx`, which compiles and runs the snippets of the status document.
5. Standalone: `npm run standalone`, opened from `file://` with every http(s) request aborted: dark by default, toggles to light, persists, all routes render, 1 request.

## Seams found and fixed

- The headline h1 text included a hidden "Exact value £6,145,238" span: now `aria-description` (`src/charts/Headline.jsx`).
- A `padded={24}` Panel cost a phone 48px of width: capped to 16px under 700px (`src/ui/Panel.jsx`, `src/ui/kit.css`).
- `MethodLink` split across two lines in the page header: `white-space: nowrap` (`src/styles/app.css`).
- The kit `useToast()` was a silent no-op inside the app (no provider): `ToastBridge`.
- A native `<dialog>` stub drawer covers kit overlays (browser top layer): noted for V2 and V7, who replace the stubs.

## Files changed outside the integrator's own files

`src/components/{ConfidencePill,ToastHost,ConfirmHost}.jsx`, `src/shell/AppFrame.jsx`, `src/lib/ui-context.jsx` (toast aliases, `clearToasts`), `src/styles/app.css`, `src/ui/{Panel.jsx,Toast.jsx,index.js,kit.css}`, `src/charts/Headline.jsx`, `tests/smoke.mjs`, `tests/lib/harness.mjs`, `tests/fixtures/shell-gallery.jsx`, `package.json` (scripts), `docs/ui-api.md` (toast note).

## How to test

```
npm test                 # engine (36 groups), smoke (114), foundation (34)   about 1 minute
npm run test:ui          # A3's 92 checks, about 2 minutes
npm run test:all
node tests/smoke.mjs --standalone --dist dist --only standalone     # after npm run build && npm run standalone
```
