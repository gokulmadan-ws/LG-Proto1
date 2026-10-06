// The toast stack, mounted once by AppFrame. State lives in UIProvider (useUI().toast); the look and behaviour are the
// kit's controlled ToastHost (src/ui/Toast.jsx): bottom right, a polite and an assertive live region, errors stay until
// closed, hover and focus pause the timer.
//
// ToastBridge makes the kit's useToast() (import { useToast } from '../ui/index.js') work inside the app: it provides the same
// hook backed by UIProvider, so useToast() and useUI().toast are one stack, not two. Without it useToast() is a silent no-op.
import { useMemo } from 'react';
import { ToastHost as KitToastHost, ToastContext } from '../ui/Toast.jsx';
import { useUI, useUIState } from '../lib/ui-context.jsx';

export function ToastHost() {
  const { toasts } = useUIState();
  const { dismissToast } = useUI();
  return <KitToastHost toasts={toasts} onDismiss={dismissToast} />;
}

export function ToastBridge({ children }) {
  const ui = useUI();
  const api = useMemo(() => Object.assign((o) => ui.toast(o), { dismiss: ui.dismissToast, clear: ui.clearToasts }), [ui]);
  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export default ToastHost;
