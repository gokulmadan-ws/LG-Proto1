import { useId, useRef } from 'react';
import { Button } from './ds.js';
import { Portal } from './Portal.jsx';
import { useOverlay } from './useOverlay.js';

/**
 * Modal dialog. Portal into document.body, role="dialog" aria-modal, focus trap, Escape and scrim click close it,
 * focus returns to the trigger. The title is an h2 and names the dialog.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(reason: 'escape'|'scrim'|'close') => void} props.onClose called for Escape, a scrim click and the close button
 * @param {React.ReactNode} props.title short sentence-case title
 * @param {React.ReactNode} [props.description] muted paragraph above the body (also the accessible description)
 * @param {React.ReactNode} props.children body
 * @param {React.ReactNode} [props.footer] buttons, right aligned: Cancel as variant="outline" plus at most ONE filled button
 * @param {'sm'|'md'|'wide'} [props.size='md'] 400, 480 or 720px wide
 * @param {boolean} [props.dismissOnScrim=true] a click outside the dialog closes it
 * @param {boolean} [props.blur=false] stronger blur on the scrim
 * @param {'dialog'|'alertdialog'} [props.role='dialog']
 * @param {string} [props.closeLabel='Close dialog'] accessible name of the x button
 * @param {string} [props.className]
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissOnScrim = true, blur = false, role = 'dialog', closeLabel = 'Close dialog', className = '' }) {
  const ref = useRef(null);
  const uid = useId();
  useOverlay(open, onClose, ref);
  if (!open) return null;
  const close = (reason) => onClose && onClose(reason);
  return (
    <Portal>
      <div className={'kx-scrim' + (blur ? ' kx-scrim--blur' : '')} onMouseDown={(e) => { if (dismissOnScrim && e.target === e.currentTarget) close('scrim'); }}>
        <div ref={ref} role={role} aria-modal="true" aria-labelledby={uid + '-t'} aria-describedby={description ? uid + '-d' : undefined} tabIndex={-1}
          className={`kx-dialog kx-dialog--${size} ${className}`.trim()}>
          <div className="kx-dialog__head">
            <h2 className="kx-dialog__title" id={uid + '-t'}>{title}</h2>
            <Button type="button" variant="ghost" size="sm" className="kx-hit" aria-label={closeLabel} leftIcon="xmark" onClick={() => close('close')} style={{ width: 28, padding: 0 }} />
          </div>
          <div className="kx-dialog__body">
            {description && <p className="kx-dialog__desc" id={uid + '-d'}>{description}</p>}
            {children}
          </div>
          {footer && <div className="kx-dialog__foot">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

/**
 * Confirmation dialog (role="alertdialog"). Cancel takes focus first, so Enter never confirms by accident.
 * Destructive actions (delete, reset) use `destructive`: the confirm button becomes the DS destructive variant.
 * The pattern for destructive work is: ConfirmDialog, then a success toast.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose cancel (Cancel button, x button, Escape, scrim click)
 * @param {() => void} props.onConfirm
 * @param {React.ReactNode} props.title a question: "Reset your changes?"
 * @param {React.ReactNode} [props.description] what happens and what it affects (or pass children)
 * @param {string} [props.confirmLabel='Confirm'] [Verb]+[Object]: "Reset changes"
 * @param {string} [props.cancelLabel='Cancel']
 * @param {boolean} [props.destructive=false]
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false }) {
  const ref = useRef(null);
  const uid = useId();
  useOverlay(open, onClose, ref);
  if (!open) return null;
  return (
    <Portal>
      <div className="kx-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose('scrim'); }}>
        <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={uid + '-t'} aria-describedby={uid + '-d'} tabIndex={-1} className="kx-dialog kx-dialog--sm">
          <div className="kx-dialog__head">
            <h2 className="kx-dialog__title" id={uid + '-t'}>{title}</h2>
          </div>
          <div className="kx-dialog__body" id={uid + '-d'}>{description || children}{description ? children : null}</div>
          <div className="kx-dialog__foot">
            <Button type="button" variant="outline" data-autofocus onClick={() => onClose && onClose('close')}>{cancelLabel}</Button>
            <Button type="button" variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default Dialog;
