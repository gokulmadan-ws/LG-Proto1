import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Portal } from './Portal.jsx';
import { addLayer } from './layers.js';
import { usePlacement } from './position.js';

/**
 * Tooltip for a single trigger. Replaces the Springboard Tooltip, which is clipped by any overflow:hidden ancestor
 * (every Card) and cannot wrap. This one is a portal with position: fixed, flips when there is no room, wraps long
 * text (max 280px), shows on pointer hover and on KEYBOARD focus, hides on Escape (WCAG 1.4.13: dismissible,
 * hoverable, persistent) and is wired to the trigger with aria-describedby while visible.
 *
 * Tooltips add detail; they never carry essential information (touch has no hover). Icon-only buttons still need aria-label.
 *
 * @param {object} props
 * @param {React.ReactNode} props.label tooltip content (text or a small fragment, no interactive elements)
 * @param {React.ReactElement} props.children ONE trigger element (button, link, span with tabIndex)
 * @param {'top'|'bottom'|'left'|'right'} [props.side='top']
 * @param {number} [props.delay=120] ms before it shows on hover (focus shows it immediately)
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className] class of the wrapper span
 * @param {React.CSSProperties} [props.style] style of the wrapper span
 */
export function Tooltip({ label, children, side = 'top', delay = 120, disabled = false, className = '', style }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const tip = useRef(null);
  const timer = useRef(0);
  const viaFocus = useRef(false);
  const uid = useId();
  const pos = usePlacement(open, wrap, tip, side + '-center', 8);

  const show = useCallback(() => { clearTimeout(timer.current); setOpen(true); }, []);
  const hide = useCallback(() => { clearTimeout(timer.current); setOpen(false); }, []);
  const hideSoon = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 120); }, []);
  const showSoon = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), delay); }, [delay]);

  useEffect(() => {
    if (!open) return undefined;
    const remove = addLayer({ modal: false, onEscape: hide });
    const onScroll = () => { if (!viaFocus.current) hide(); };    // a keyboard-focused trigger keeps its tooltip while the page scrolls to reveal it
    window.addEventListener('scroll', onScroll, true);
    return () => { remove(); window.removeEventListener('scroll', onScroll, true); };
  }, [open, hide]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const visible = open && !disabled && label != null && label !== '';
  let trigger = children;
  if (isValidElement(children)) {
    const prev = children.props['aria-describedby'];
    trigger = cloneElement(children, { 'aria-describedby': [prev, visible ? uid : null].filter(Boolean).join(' ') || undefined });
  }

  return (
    <>
      <span ref={wrap} className={('kx-tipwrap ' + className).trim()} style={style}
        onMouseEnter={() => { viaFocus.current = false; showSoon(); }} onMouseLeave={hideSoon}
        onFocus={(e) => { let kb = true; try { kb = e.target.matches(':focus-visible'); } catch (err) { /* old browser: treat as keyboard */ } if (kb) { viaFocus.current = true; show(); } }}
        onBlur={hide}>
        {trigger}
      </span>
      {visible && (
        <Portal>
          <div ref={tip} id={uid} role="tooltip" className="kx-tip" data-side={pos ? pos.side : side}
            style={{ left: pos ? pos.left : 0, top: pos ? pos.top : 0, visibility: pos ? 'visible' : 'hidden' }}
            onMouseEnter={show} onMouseLeave={hideSoon}>
            {label}
          </div>
        </Portal>
      )}
    </>
  );
}

export default Tooltip;
