import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Portal } from './Portal.jsx';

const ICON = { info: 'circle-info', success: 'circle-check', warning: 'triangle-exclamation', error: 'circle-exclamation' };
const SHOW_MS = 6000;        // long enough to read; hovering or focusing a toast pauses the timer (WCAG 2.2.1)
const MAX_VISIBLE = 5;

function ToastItem({ t, onDismiss }) {
  const tone = ICON[t.tone] ? t.tone : 'info';
  const error = tone === 'error';
  const sticky = error || t.persist === true || t.duration === 0;
  const [paused, setPaused] = useState(false);
  const left = useRef(t.duration || SHOW_MS);
  const started = useRef(0);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (sticky || paused) return undefined;
    started.current = performance.now();
    const timer = setTimeout(() => dismiss.current(), left.current);
    return () => { clearTimeout(timer); left.current = Math.max(1500, left.current - (performance.now() - started.current)); };
  }, [paused, sticky]);
  return (
    <div className={'kx-toast kx-toast--' + tone} role={error ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <i className={'fa-solid fa-' + ICON[tone] + ' kx-toast__icon'} aria-hidden="true" />
      <div className="kx-toast__text">
        {t.title && <div className="kx-toast__title">{t.title}</div>}
        {t.description && <div className="kx-toast__desc">{t.description}</div>}
      </div>
      <button type="button" className="kx-toast__close" aria-label={'Close notification' + (t.title ? ': ' + (typeof t.title === 'string' ? t.title : '') : '')} onClick={onDismiss}>
        <i className="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The toast stack: bottom right (above the bottom bar on phones), in a region named "Notifications". Two persistent live
 * regions: polite for info, success and warning (role="status" on each toast), assertive for errors (role="alert").
 * Info, success and warning dismiss themselves after 6 seconds (hover or focus pauses the timer); ERRORS STAY until closed.
 *
 * Controlled: pass the list and a dismiss handler. Most code wants <ToastProvider> and useToast() instead.
 *
 * @param {object} props
 * @param {{ id: string|number, tone?: 'info'|'success'|'warning'|'error', title?: React.ReactNode, description?: React.ReactNode, duration?: number, persist?: boolean }[]} props.toasts
 * @param {(id: string|number) => void} props.onDismiss
 * @param {string} [props.label='Notifications']
 */
export function ToastHost({ toasts, onDismiss, label = 'Notifications' }) {
  const calm = toasts.filter((t) => t.tone !== 'error');
  const errs = toasts.filter((t) => t.tone === 'error');
  return (
    <Portal>
      <div className="kx-toasts" role="region" aria-label={label}>
        <div className="kx-toasts__list" aria-live="polite" aria-atomic="false">
          {calm.map((t) => <ToastItem key={t.id} t={t} onDismiss={() => onDismiss(t.id)} />)}
        </div>
        <div className="kx-toasts__list" aria-live="assertive" aria-atomic="false">
          {errs.map((t) => <ToastItem key={t.id} t={t} onDismiss={() => onDismiss(t.id)} />)}
        </div>
      </div>
    </Portal>
  );
}

const ToastCtx = createContext(null);
/** The context behind useToast(). Exported so an app that keeps its own toast state (src/lib/ui-context.jsx) can provide the same hook. */
export const ToastContext = ToastCtx;
const NOOP = Object.assign(() => 0, { dismiss: () => {}, clear: () => {} });

/**
 * Returns toast(options). `toast({ tone, title, description })` shows a toast and returns its id.
 * `toast.dismiss(id)` closes one, `toast.clear()` closes all. Without a ToastProvider it does nothing.
 *
 *   toast({ tone: 'success', title: 'Reset complete.', description: 'The demo is back to its starting numbers.' });
 *   toast({ tone: 'error', title: 'Export failed.', description: 'Your browser blocked the download. Allow downloads for this page and try again.' });
 *
 * Copy: success is specific and says the consequence; errors are [What] + [Why] + [How]. `type` and `message` are accepted as
 * aliases of `tone` and `description`.
 */
export function useToast() {
  return useContext(ToastCtx) || NOOP;
}

/**
 * Mount once near the root: provides useToast() and renders the ToastHost.
 * @param {{ children: React.ReactNode }} props
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);
  const dismiss = useCallback((id) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const push = useCallback((o = {}) => {
    seq.current += 1;
    const id = 'toast-' + seq.current;
    const t = { id, tone: o.tone || o.type || 'info', title: o.title, description: o.description != null ? o.description : o.message, duration: o.duration, persist: o.persist };
    setItems((s) => [...s, t].slice(-MAX_VISIBLE));
    return id;
  }, []);
  const api = useMemo(() => Object.assign(push, { dismiss, clear }), [push, dismiss, clear]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastHost toasts={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export default ToastProvider;
