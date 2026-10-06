// Layer manager shared by Dialog, Drawer, Popover, Menu and Tooltip.
//
// One document-level keydown listener serves every open layer, so:
//  - Escape only ever closes the TOP layer (a menu inside a drawer closes before the drawer does);
//  - Tab is trapped inside the top modal layer;
//  - a native <dialog> or another library opened on top is left alone (a modal layer only reacts while focus is
//    inside it, or nowhere).
//
// No React in here: components call addLayer() from an effect and call the returned function on cleanup.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  'textarea:not([disabled])', 'summary', '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(',');

const visible = (el) => !el.closest('[inert]') && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
  && getComputedStyle(el).visibility !== 'hidden';

/** Focusable, visible descendants in DOM order. */
export function focusables(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(visible);
}

const layers = [];
let installed = false;

function onKeyDown(e) {
  const top = layers[layers.length - 1];
  if (!top) return;
  const active = document.activeElement;
  const inside = !!top.node && top.node.contains(active);
  // A modal layer ignores keys while focus is in something else (a native <dialog>, a browser popup): it is not its turn.
  const mine = !top.modal || inside || !active || active === document.body;
  if (!mine) return;
  if (e.key === 'Escape' && !e.defaultPrevented) {
    e.preventDefault();
    e.stopPropagation();
    if (top.onEscape) top.onEscape(e);
    return;
  }
  if (e.key === 'Tab' && top.modal && top.node) {
    const list = focusables(top.node);
    if (!list.length) { e.preventDefault(); top.node.focus(); return; }
    const first = list[0];
    const last = list[list.length - 1];
    if (!inside || active === top.node) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault(); first.focus();
    }
  }
}

/**
 * Register an open layer. Returns the function that removes it.
 * @param {{ node?: HTMLElement, modal?: boolean, onEscape?: (e: KeyboardEvent) => void }} layer
 */
export function addLayer(layer) {
  layers.push(layer);
  if (!installed) { document.addEventListener('keydown', onKeyDown, true); installed = true; }
  return () => {
    const i = layers.indexOf(layer);
    if (i >= 0) layers.splice(i, 1);
    if (!layers.length && installed) { document.removeEventListener('keydown', onKeyDown, true); installed = false; }
  };
}

/** True while a modal layer (dialog or drawer) is open. */
export const hasModalLayer = () => layers.some((l) => l.modal);

let locks = 0;
let saved = '';
/** Stop the document from scrolling behind a modal. Returns the unlock function. Counted, so nested modals are safe. */
export function lockScroll() {
  const el = document.documentElement;
  if (locks === 0) { saved = el.style.overflow; el.style.overflow = 'hidden'; }
  locks += 1;
  return () => {
    locks = Math.max(0, locks - 1);
    if (locks === 0) el.style.overflow = saved;
  };
}

/** Put focus back where it was when an overlay opened; fall back to <main> when that element is gone. */
export function restoreFocus(trigger) {
  const ok = trigger && trigger !== document.body && typeof trigger.focus === 'function' && document.contains(trigger);
  if (ok) { trigger.focus({ preventScroll: true }); return; }
  const main = document.querySelector('main');
  if (main) { if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
}

/** Focus an element, or the first focusable element inside it (an anchor wrapper span, for instance). */
export function focusIn(el) {
  if (!el) return;
  const direct = el.matches && el.matches('a[href],button,input,select,textarea,summary,[tabindex]');
  const target = direct ? el : el.querySelector && el.querySelector('a[href],button,input,select,textarea,summary,[tabindex]');
  if (target && target.focus) target.focus({ preventScroll: true });
}
