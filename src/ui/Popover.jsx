import { useCallback, useEffect, useRef } from 'react';
import { Portal } from './Portal.jsx';
import { addLayer, focusIn } from './layers.js';
import { usePlacement } from './position.js';

const elOf = (anchor) => (anchor && anchor.current !== undefined ? anchor.current : anchor);

/**
 * Floating panel anchored to an element. Portal + position: fixed, so it is never clipped by a card or a scroll area.
 * Closes on Escape (focus returns to the anchor), on a pointer press outside it and the anchor, and when the
 * anchor leaves the DOM. Repositions on scroll and resize and flips when there is no room.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {HTMLElement | {current: HTMLElement|null} | null} props.anchor element (or ref) the panel hangs off
 * @param {(reason: 'escape'|'outside') => void} props.onClose
 * @param {'bottom-start'|'bottom-end'|'bottom-center'|'top-start'|'top-end'|'top-center'|'right-start'|'right-end'|'right-center'|'left-start'|'left-end'|'left-center'} [props.placement='bottom-start']
 * @param {number} [props.offset=6] gap to the anchor in px
 * @param {string} [props.role] e.g. 'dialog' for a free-form popover (Menu sets 'menu')
 * @param {string} [props.label] aria-label
 * @param {boolean} [props.restoreFocus=true] return focus to the anchor after Escape
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 * @param {{current: HTMLElement|null}} [props.innerRef] receives the panel element
 * @param {React.ReactNode} props.children
 */
export function Popover({ open, anchor, onClose, placement = 'bottom-start', offset = 6, role, label, restoreFocus = true, className = '', style, children, innerRef, ...rest }) {
  const ref = useRef(null);
  const setRef = useCallback((el) => { ref.current = el; if (innerRef) innerRef.current = el; }, [innerRef]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pos = usePlacement(open, anchor, ref, placement, offset);

  useEffect(() => {
    if (!open) return undefined;
    const remove = addLayer({
      node: ref.current, modal: false,
      onEscape: () => {
        if (restoreFocus) focusIn(elOf(anchor));
        if (closeRef.current) closeRef.current('escape');
      },
    });
    const onDown = (e) => {
      const a = elOf(anchor);
      if (ref.current && ref.current.contains(e.target)) return;
      if (a && a.contains(e.target)) return;      // the anchor's own click handler toggles
      if (closeRef.current) closeRef.current('outside');
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => { remove(); document.removeEventListener('pointerdown', onDown, true); };
  }, [open, anchor, restoreFocus]);

  if (!open) return null;
  return (
    <Portal>
      <div ref={setRef} role={role} aria-label={label} className={('kx-pop ' + className).trim()} data-side={pos ? pos.side : undefined}
        style={{ left: pos ? pos.left : 0, top: pos ? pos.top : 0, visibility: pos ? 'visible' : 'hidden', ...style }} {...rest}>
        {children}
      </div>
    </Portal>
  );
}

export default Popover;
