// Host for useUI().confirm(): the kit ConfirmDialog (src/ui/Dialog.jsx) driven by the promise in UIProvider.
// Cancel is focused first (safe default for destructive actions); Esc, the x and a scrim click cancel.
// Mounted once by AppFrame.
import { ConfirmDialog } from '../ui/Dialog.jsx';
import { useUI, useUIState } from '../lib/ui-context.jsx';

export function ConfirmHost() {
  const { confirmRequest } = useUIState();
  const { settleConfirm } = useUI();
  if (!confirmRequest) return null;
  const { title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive } = confirmRequest.opts;
  return (
    <ConfirmDialog
      open
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      destructive={destructive}
      onClose={() => settleConfirm(false)}
      onConfirm={() => settleConfirm(true)}
    />
  );
}

export default ConfirmHost;
