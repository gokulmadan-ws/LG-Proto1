// Placeholder modal used by the overlay stubs (A1). V7 and V2 delete this file once every overlay is real.
// Native <dialog> + showModal(): focus trap, Esc to close, inert background, ::backdrop. Closing returns focus
// through lib/ui-context.jsx. `variant="drawer"` docks it to the right edge.
import { useEffect, useRef } from 'react';

const { Button } = window.Springboard20DesignSystem_019e02;

export function StubOverlay({ open, onClose, title, variant = 'dialog', owner, note, children }) {
  if (!open) return null;
  return <StubDialog onClose={onClose} title={title} variant={variant} owner={owner} note={note}>{children}</StubDialog>;
}

function StubDialog({ onClose, title, variant, owner, note, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    const prev = document.activeElement;
    if (d && !d.open) d.showModal();
    // Removing a modal <dialog> from the DOM does not restore focus (only dialog.close() does), so do it here.
    return () => { setTimeout(() => { if (prev && prev !== document.body && prev.isConnected) prev.focus(); }, 0); };
  }, []);
  return (
    <dialog
      ref={ref}
      className={'stub-overlay stub-overlay--' + variant}
      aria-labelledby="stub-overlay-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="stub-overlay__body">
        <h2 id="stub-overlay-title" className="ds-h4" style={{ margin: 0 }}>{title}</h2>
        <p className="ds-body" style={{ margin: 0 }}>Placeholder. Built by {owner}.{note ? ' ' + note : ''}</p>
        {children}
        <div className="stub-overlay__actions">
          <Button type="button" variant="outline" onClick={onClose}>Close {variant === 'drawer' ? 'drawer' : 'dialog'}</Button>
        </div>
      </div>
    </dialog>
  );
}

export default StubOverlay;
