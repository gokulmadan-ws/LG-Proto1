// src/charts/hooks.js
import { useState, useLayoutEffect, useRef, useCallback } from 'react';

/** Width of an element in px, updated on resize. Returns [ref, width]. */
export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(Math.round(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Arrow-key navigation between interactive marks inside a list/figure.
 *  Spread onto the container: <ul {...useArrowNav('[data-kviz-mark]')}>.  Tab still works as normal. */
export function useArrowNav(selector = '[data-kviz-mark]') {
  const onKeyDown = useCallback((e) => {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const items = Array.from(e.currentTarget.querySelectorAll(selector));
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
    items[next].focus();
  }, [selector]);
  return { onKeyDown };
}
