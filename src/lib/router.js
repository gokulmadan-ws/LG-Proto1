// Hash router. No dependencies, no history API tricks: every address is `#/<name>[/<seg>...][?<query>]`.
//
//   useRoute() -> { name, seg, parts, query, path, hash }
//     '#/opportunities?type=overCap'          -> name 'opportunities', seg [],                    query type=overCap
//     '#/spend/matches'                       -> name 'spend',         seg ['matches']
//     '#/contracts/C-005'                     -> name 'contracts',     seg ['C-005']
//     '#/source/C-005/X-C-005-maximumValue?from=renewals'
//                                              -> name 'source',        seg ['C-005', 'X-C-005-maximumValue']
//     ''  '#'  '#/'                           -> name 'overview'
//   `seg` holds the segments AFTER the name (same shape hrefFor takes); `parts` is [name, ...seg];
//   `path` is '/spend/matches' (no query); `query` is a URLSearchParams.
//   navigate(to, { replace })                 to: '#/spend/matches' | '/spend/matches' | 'spend/matches'
//   setQuery(patch, { replace = true })       merge/remove (null, undefined, '' or false removes) params on the current route
//   hrefFor(name, { seg, query })             -> '#/spend/matches?x=1' (segments are URI-encoded, empty query values skipped)
//   usePageTitle(title)                       a view overrides the default document.title (`<title> | Kontor financial layer`)
//   useRouteEffects(route, defaultTitle)      App.jsx only: title, scroll reset, focus the h1 (not on first load)
//
// Route changes mean the PATH changed (name or segments). Query-only changes (filters, ?flag=, ?s=) never reset
// scroll or move focus, so drawers and filters do not jump the page.
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { focusPageHeading, scrollMainToTop } from './a11y.js';

export const BASE_TITLE = 'Kontor financial layer';
export const DEFAULT_ROUTE = 'overview';

const safeDecode = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };

export function parseHash(hash) {
  const h = hash === undefined ? (typeof window !== 'undefined' ? window.location.hash : '') : hash;
  const raw = String(h || '').replace(/^#/, '');
  const qi = raw.indexOf('?');
  const pathPart = qi === -1 ? raw : raw.slice(0, qi);
  const queryPart = qi === -1 ? '' : raw.slice(qi + 1);
  const parts = pathPart.split('/').filter(Boolean).map(safeDecode);
  const name = parts[0] || DEFAULT_ROUTE;
  const seg = parts.slice(1);
  return { name, seg, parts: [name, ...seg], query: new URLSearchParams(queryPart), path: '/' + [name, ...seg].join('/'), hash: raw };
}

const subscribe = (cb) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return useMemo(() => parseHash(hash), [hash]);
}

function buildQuery(query) {
  const qs = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' || v === false) return;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
    else qs.set(k, String(v));
  });
  return qs.toString();
}

export function hrefFor(name = DEFAULT_ROUTE, { seg = [], query = {} } = {}) {
  const path = [name, ...seg].map((s) => encodeURIComponent(String(s))).join('/');
  const qs = buildQuery(query);
  return '#/' + path + (qs ? '?' + qs : '');
}

function normalise(to) {
  let t = String(to || '').trim();
  t = t.replace(/^#/, '');
  if (!t.startsWith('/')) t = '/' + t;
  return t;
}

export function navigate(to, { replace = false } = {}) {
  const target = normalise(to);
  if ('#' + target === window.location.hash) return;
  if (replace) window.location.replace('#' + target);     // fragment-only replace: fires hashchange, adds no history entry
  else window.location.hash = target;
}

export function setQuery(patch = {}, { replace = true } = {}) {
  const cur = parseHash();
  const q = new URLSearchParams(cur.query);
  Object.entries(patch).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' || v === false) q.delete(k);
    else q.set(k, String(v));
  });
  const next = hrefFor(cur.name, { seg: cur.seg, query: Object.fromEntries(q) });
  navigate(next, { replace });
}

/* ---------- document.title ---------- */
let defaultTitle = { path: null, title: BASE_TITLE };
let override = null;                                          // { path, title } set by usePageTitle

const fullTitle = (t) => (t ? `${t} | ${BASE_TITLE}` : BASE_TITLE);
function applyTitle() {
  const path = defaultTitle.path;
  const t = override && override.path === path ? override.title : defaultTitle.title;
  document.title = fullTitle(t);
}

/** Override the default document title for the current route, e.g. usePageTitle(contract.title). */
export function usePageTitle(title) {
  const { path } = useRoute();
  useEffect(() => {
    if (!title) return undefined;
    override = { path, title };
    if (defaultTitle.path === path) applyTitle();
    return () => { if (override && override.path === path) override = null; };
  }, [path, title]);
}

/**
 * Called once by App.jsx. On every PATH change: sets document.title, resets the scroll of <main>, and (except on
 * first load) moves focus to the page <h1>. Layout effect for scroll so a view's own scrollIntoView (a passive
 * effect, e.g. the Method page opening on ?s=cap) runs after it and wins.
 */
export function useRouteEffects(route, pageTitle) {
  const first = useRef(true);
  const path = route.path;
  useLayoutEffect(() => {
    defaultTitle = { path, title: pageTitle };
    applyTitle();
  }, [path, pageTitle]);
  useLayoutEffect(() => {
    if (!first.current) scrollMainToTop();
  }, [path]);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    let frames = 0;
    let raf;
    // One frame after the commit, never synchronously: several components subscribe to the hash, and focusing in the
    // same tick can hit the previous page's h1, which is then replaced (focus lost). Retries cover views whose h1 renders later.
    const tryFocus = () => {
      raf = requestAnimationFrame(() => {
        if (focusPageHeading() || frames++ > 8) return;
        tryFocus();
      });
    };
    tryFocus();
    return () => cancelAnimationFrame(raf);
  }, [path]);
}
