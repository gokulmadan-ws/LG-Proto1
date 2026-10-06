import { useEffect, useRef } from 'react';
import { addLayer, focusables, lockScroll, restoreFocus } from './layers.js';

/**
 * Behaviour shared by Dialog, ConfirmDialog and Drawer.
 * While `open`: focus moves in (to [data-autofocus], else the first focusable, else the container), Tab is trapped,
 * Escape calls onClose('escape'), the document stops scrolling, and on close focus returns to the element that
 * had it when the overlay opened.
 * @param {boolean} open
 * @param {(reason: string) => void} onClose
 * @param {{ current: HTMLElement | null }} ref the overlay container (tabIndex -1, role dialog)
 */
export function useOverlay(open, onClose, ref) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const trigger = document.activeElement;
    const remove = addLayer({ node, modal: true, onEscape: () => { if (closeRef.current) closeRef.current('escape'); } });
    const unlock = lockScroll();
    const target = node.querySelector('[data-autofocus]') || focusables(node)[0] || node;
    target.focus({ preventScroll: true });
    return () => { remove(); unlock(); restoreFocus(trigger); };
  }, [open]);
}

export default useOverlay;
