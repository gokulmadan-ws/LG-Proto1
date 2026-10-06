// src/charts/Tip.jsx
// One accessible tooltip for every chart.
//  - Appears on pointer hover AND on keyboard focus of the mark (same content).
//  - Rendered in a portal with position:fixed, so a Card's overflow:hidden never clips it.
//  - WCAG 1.4.13: dismissible (Esc), hoverable (pointer may move onto it), persistent until dismissed.
//  - It enhances, never gates: the mark's own aria-label carries the same facts, and every chart has a table view.
//  - All strings go through React text nodes (never innerHTML): supplier names are untrusted data.
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { clamp } from './scales.js';

const rectOf = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };

export function useChartTip() {
  const [tip, setTip] = useState(null);           // { rect, px, content, getRect? }
  const timer = useRef(0);
  const keep = useCallback(() => clearTimeout(timer.current), []);
  const hide = useCallback(() => { clearTimeout(timer.current); setTip(null); }, []);
  const hideSoon = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setTip(null), 160); }, []);
  // getRect (optional): re-measures the anchor. A keyboard-focused mark keeps its tooltip while the page scrolls to reveal it
  // (the browser scrolls AFTER the focus event); a pointer tooltip has no anchor to follow and closes on scroll.
  const show = useCallback((rect, content, px, getRect) => { clearTimeout(timer.current); setTip({ rect, content, px, getRect }); }, []);
  const open = !!tip;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') hide(); };
    const onDown = (e) => { if (!(e.target.closest && e.target.closest('[data-kviz-mark],.kviz-tip'))) hide(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    const onScroll = () => setTip((t) => (t && t.getRect ? { ...t, rect: t.getRect() } : null));
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, hide]);

  /** Pointer handlers (hover). Put these on the whole row / mark. */
  const bindPointer = useCallback((content) => ({
    onPointerEnter: (e) => show(rectOf(e.currentTarget), content, e.clientX),
    onPointerMove: (e) => { if (e.pointerType !== 'touch') { const px = e.clientX; setTip((t) => (t ? { ...t, px } : t)); } },
    onPointerLeave: (e) => { if (e.pointerType !== 'touch') hideSoon(); },
  }), [show, hideSoon]);
  /** Focus handlers + the marker attribute. Put these on the FOCUSABLE element (the row's primary link/button).
   *  rowSelector: position the tooltip against the whole row instead of the small link. */
  const bindFocus = useCallback((content, rowSelector) => ({
    'data-kviz-mark': '',
    onFocus: (e) => {
      const el = (rowSelector && e.currentTarget.closest(rowSelector)) || e.currentTarget;
      show(rectOf(el), content, undefined, () => rectOf(el));
    },
    onBlur: hide,
  }), [show, hide]);
  /** Both at once, for a mark that is itself the focusable element (a stacked-bar segment). */
  const bind = useCallback((content) => ({ ...bindPointer(content), ...bindFocus(content) }), [bindPointer, bindFocus]);

  return { tip, bind, bindPointer, bindFocus, show, hide, hideSoon, keep };
}

/** content = { title, sub?, rows?: [{ value, label, color?, glyph?, glyphColor? }], note? } */
export function TipBody({ c }) {
  return (
    <>
      {c.title && <div className="kviz-tip__title">{c.title}</div>}
      {c.sub && <div className="kviz-tip__sub">{c.sub}</div>}
      {c.rows && c.rows.length > 0 && (
        <div className="kviz-tip__rows">
          {c.rows.map((r, i) => (
            <div className="kviz-tip__row" key={i}>
              <span className="kviz-tip__key" style={r.color ? { background: r.color } : undefined} aria-hidden="true" />
              <span className="kviz-tip__val">
                {r.glyph && <i className={'fa-solid fa-' + r.glyph} style={{ color: r.glyphColor, marginRight: 6 }} aria-hidden="true" />}
                {r.value}
              </span>
              <span className="kviz-tip__lab">{r.label}</span>
            </div>
          ))}
        </div>
      )}
      {c.note && <div className="kviz-tip__note">{c.note}</div>}
    </>
  );
}

export function ChartTip({ api }) {
  const { tip, keep, hideSoon } = api;
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!tip || !ref.current) { setPos(null); return; }
    const el = ref.current, w = el.offsetWidth, h = el.offsetHeight;
    const r = tip.rect, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const cx = tip.px == null ? (r.left + r.right) / 2 : clamp(tip.px, r.left, r.right);
    const left = clamp(cx - w / 2, 8, Math.max(8, vw - w - 8));
    let top = r.top - h - 10;
    if (top < 8) top = Math.min(r.bottom + 10, vh - h - 8);   // flip below when there is no room above
    setPos({ left, top });
  }, [tip]);
  if (!tip) return null;
  return createPortal(
    <div ref={ref} className="kviz-tip" role="tooltip"
      style={{ left: pos ? pos.left : 0, top: pos ? pos.top : 0, visibility: pos ? 'visible' : 'hidden' }}
      onPointerEnter={keep} onPointerLeave={hideSoon}>
      <TipBody c={tip.content} />
    </div>,
    document.body,
  );
}
