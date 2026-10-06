import { useId, useRef } from 'react';
import { Button } from './ds.js';
import { Portal } from './Portal.jsx';
import { useOverlay } from './useOverlay.js';

/**
 * Right-hand drawer (modal). 200ms slide in, focus trap, Escape and scrim click close it, focus returns to the
 * element that opened it. Use it for the flag drawer, the settings drawer and the payments list.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(reason: 'escape'|'scrim'|'close') => void} props.onClose
 * @param {React.ReactNode} props.title h2 in the header, names the drawer
 * @param {React.ReactNode} [props.subtitle] muted line under the title (contract and supplier, for example)
 * @param {React.ReactNode} props.children body (scrolls)
 * @param {React.ReactNode} [props.footer] sticky footer with the buttons (one primary at most)
 * @param {'md'|'lg'} [props.size='md'] 520px or 720px wide (always full width below 560px)
 * @param {string} [props.closeLabel='Close panel']
 * @param {string} [props.className]
 */
export function Drawer({ open, onClose, title, subtitle, children, footer, size = 'md', closeLabel = 'Close panel', className = '' }) {
  const ref = useRef(null);
  const uid = useId();
  useOverlay(open, onClose, ref);
  if (!open) return null;
  const close = (reason) => onClose && onClose(reason);
  return (
    <Portal>
      <div className="kx-drawer-scrim" onMouseDown={() => close('scrim')} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={uid + '-t'} tabIndex={-1} className={`kx-drawer kx-drawer--${size} ${className}`.trim()}>
        <div className="kx-drawer__head">
          <div className="kx-drawer__titles">
            <h2 className="kx-section-title" id={uid + '-t'}>{title}</h2>
            {subtitle && <div className="kx-caption kx-drawer__sub">{subtitle}</div>}
          </div>
          <Button type="button" variant="ghost" size="sm" className="kx-hit" aria-label={closeLabel} leftIcon="xmark" onClick={() => close('close')} style={{ width: 28, padding: 0 }} />
        </div>
        <div className="kx-drawer__body">{children}</div>
        {footer && <div className="kx-drawer__foot">{footer}</div>}
      </div>
    </Portal>
  );
}

export default Drawer;
