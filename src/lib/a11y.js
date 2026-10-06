// Small accessibility and focus helpers shared by the shell, the router and the overlays.
import { hasModalLayer } from '../ui/layers.js';
import { useEffect, useRef } from 'react';

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Focusable descendants of `root` that are actually rendered (not display:none or hidden). */
export function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => !el.closest('[hidden], [inert]') && el.getClientRects().length > 0);
}

/** Focus `el` if it is still in the document. Returns true when it took focus. */
export function focusElement(el, { preventScroll = false } = {}) {
  if (!el || !el.isConnected || typeof el.focus !== 'function') return false;
  el.focus({ preventScroll });
  return document.activeElement === el;
}

/** Move focus to the content area without touching location.hash (the skip link and route changes use this). */
export function focusMain() {
  return focusElement(document.getElementById('shell-main'), { preventScroll: true });
}

/** Focus the page <h1> inside main (tabIndex -1 is added when missing). Returns true when focus moved. */
export function focusPageHeading() {
  if (hasModalLayer()) return true;   // an open dialog or drawer owns focus (browser Back must not strand it behind the page)
  const main = document.getElementById('shell-main');
  const h1 = main && main.querySelector('h1');
  if (!h1) return false;
  if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
  return focusElement(h1, { preventScroll: true });
}

/** The scroll container is <main id="shell-main">, not the window. */
export function scrollMainToTop() {
  const main = document.getElementById('shell-main');
  if (main) main.scrollTop = 0;
  window.scrollTo(0, 0);
}

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

/** 'auto' under prefers-reduced-motion, else 'smooth'. Use for scrollIntoView({ behavior }). */
export function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Remembers the focused element when `open` becomes true and returns focus to it when `open` becomes false
 * (or on unmount). For overlays that do not already restore focus. If the remembered element has been removed
 * from the document, `fallback` (an element or a function returning one) is used.
 */
export function useReturnFocus(open, fallback) {
  const prev = useRef(null);
  const restore = () => {
    const el = prev.current;
    prev.current = null;
    if (!el) return;
    if (el.isConnected) focusElement(el);
    else if (fallback) focusElement(typeof fallback === 'function' ? fallback() : fallback);
  };
  useEffect(() => {
    if (open) { prev.current = document.activeElement; return undefined; }
    const t = setTimeout(restore, 0);          // after the overlay has left the DOM
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => restore, []);
}

/** Calls `handler` when Escape is pressed while `active`. */
export function useEscapeKey(handler, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') ref.current(e); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}

let uidCounter = 0;
/** Stable-per-call unique id for aria-labelledby and friends outside React components. Inside components prefer React.useId. */
export function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}

/** 'Cap vs spend' -> 'cap-vs-spend'. For heading ids and anchors. */
export function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
