// Placement maths for Popover, Menu and Tooltip (position: fixed, so no ancestor overflow can clip them).
import { useLayoutEffect, useState } from 'react';

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/**
 * Where to put a box of size (w, h) next to an anchor rectangle.
 * placement: 'bottom-start' | 'bottom-end' | 'bottom-center' | 'top-*' | 'right-start' | 'right-end' | 'right-center' | 'left-*'.
 * Flips to the opposite side when the preferred side has no room, then clamps inside the viewport.
 * @returns {{ left: number, top: number, side: string }}
 */
export function place(rect, w, h, placement = 'bottom-start', offset = 6, margin = 8) {
  const [pref, align = 'start'] = placement.split('-');
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const room = {
    bottom: vh - rect.bottom - offset - margin >= h,
    top: rect.top - offset - margin >= h,
    right: vw - rect.right - offset - margin >= w,
    left: rect.left - offset - margin >= w,
  };
  const side = room[pref] || !room[OPPOSITE[pref]] ? pref : OPPOSITE[pref];
  let left;
  let top;
  if (side === 'bottom' || side === 'top') {
    top = side === 'bottom' ? rect.bottom + offset : rect.top - offset - h;
    left = align === 'end' ? rect.right - w : align === 'center' ? rect.left + (rect.width - w) / 2 : rect.left;
  } else {
    left = side === 'right' ? rect.right + offset : rect.left - offset - w;
    top = align === 'end' ? rect.bottom - h : align === 'center' ? rect.top + (rect.height - h) / 2 : rect.top;
  }
  left = Math.min(Math.max(margin, left), Math.max(margin, vw - w - margin));
  top = Math.min(Math.max(margin, top), Math.max(margin, vh - h - margin));
  return { left: Math.round(left), top: Math.round(top), side };
}

/**
 * Measure the floating element after render and keep it placed while the page scrolls or resizes.
 * Returns null until the first measurement (render the element with visibility: hidden until then).
 */
export function usePlacement(open, anchor, floatRef, placement, offset) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined; }
    const el = anchor && anchor.current !== undefined ? anchor.current : anchor;
    const box = floatRef.current;
    if (!el || !box) return undefined;
    const update = () => {
      const next = place(el.getBoundingClientRect(), box.offsetWidth, box.offsetHeight, placement, offset);
      setPos((p) => (p && p.left === next.left && p.top === next.top && p.side === next.side ? p : next));
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open, anchor, placement, offset]);
  return pos;
}
