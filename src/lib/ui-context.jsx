// UI context: toasts, the five global overlays and a promise-based confirm. Mounted once by App.jsx.
//
//   const ui = useUI();                          // stable functions only, safe to put in effect deps
//   ui.toast({ tone: 'success', title: 'Link copied to your clipboard.', description: 'optional second line' })
//        tone: 'info' | 'success' | 'warning' | 'error' (errors stay until dismissed and use role="alert"); returns an id
//        ui.toast('Plain string') is shorthand for { title }
//   ui.dismissToast(id)  ui.clearToasts()      (the kit's useToast() from src/ui is the same thing: AppFrame bridges it to this state)
//   ui.openAbout(triggerEl?)  ui.openFeedback(triggerEl?)  ui.openSettings(triggerEl?)  ui.openDemoGuide(triggerEl?)
//   ui.openMenu(anchorEl)                        toggles the rail menu popover next to anchorEl
//   ui.closeAbout() closeFeedback() closeSettings() closeDemoGuide() closeMenu() dismissToast(id)
//   const ok = await ui.confirm({ title, description, confirmLabel, destructive })   // true = confirmed
//
//   const s = useUIState();   // { toasts, about, feedback, settings, demoGuide, menu: { open, anchor }, confirmRequest }
//
// Focus return: every opener remembers the element that was focused (or `triggerEl`) and restores focus to it
// when the overlay closes, unless the route changed in between (then the route's h1 keeps focus). Opening an
// overlay from the open menu returns focus to the Menu button, because the menu item itself disappears.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { focusElement } from './a11y.js';
import { parseHash } from './router.js';

const ActionsContext = createContext(null);
const StateContext = createContext(null);

const INITIAL = { about: false, feedback: false, settings: false, demoGuide: false };
const MAX_TOASTS = 3;

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [overlays, setOverlays] = useState(INITIAL);
  const [menu, setMenu] = useState({ open: false, anchor: null });
  const [confirmRequest, setConfirmRequest] = useState(null);

  const idRef = useRef(0);
  const returns = useRef({});             // overlay key -> { el, path }
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const confirmRef = useRef(null);
  confirmRef.current = confirmRequest;

  const remember = useCallback((key, el) => {
    const m = menuRef.current;
    const target = m.open && m.anchor ? m.anchor : (el && el.isConnected ? el : document.activeElement);
    returns.current[key] = { el: target, path: parseHash().path };
  }, []);

  const restore = useCallback((key) => {
    const r = returns.current[key];
    returns.current[key] = null;
    if (!r || !r.el) return;
    setTimeout(() => {
      if (parseHash().path !== r.path) return;           // navigated away: leave focus on the new page heading
      if (r.el.isConnected) focusElement(r.el);
    }, 0);
  }, []);

  const toast = useCallback((arg) => {
    const t = typeof arg === 'string' ? { title: arg } : (arg || {});
    idRef.current += 1;
    const id = idRef.current;
    // `type` and `message` are accepted as aliases of `tone` and `description` (the kit's useToast() takes the same options).
    const item = { id, tone: t.tone || t.type || 'info', title: t.title || '', description: (t.description != null ? t.description : t.message) || '', duration: t.duration, persist: t.persist };
    setToasts((s) => [...s, item].slice(-MAX_TOASTS));
    return id;
  }, []);
  const dismissToast = useCallback((id) => setToasts((s) => s.filter((x) => x.id !== id)), []);
  const clearToasts = useCallback(() => setToasts([]), []);

  const open = useCallback((key) => (el) => {
    remember(key, el && el.nodeType === 1 ? el : null);
    setOverlays((o) => ({ ...o, [key]: true }));
    setMenu((m) => (m.open ? { open: false, anchor: m.anchor } : m));
  }, [remember]);
  const close = useCallback((key) => () => {
    setOverlays((o) => (o[key] ? { ...o, [key]: false } : o));
    restore(key);
  }, [restore]);

  const openMenu = useCallback((anchor) => {
    setMenu((m) => (m.open ? { open: false, anchor: m.anchor } : { open: true, anchor: anchor || null }));
  }, []);
  const closeMenu = useCallback(() => setMenu((m) => (m.open ? { open: false, anchor: m.anchor } : m)), []);

  const confirm = useCallback((opts = {}) => new Promise((resolve) => {
    if (confirmRef.current) confirmRef.current.resolve(false);
    remember('confirm', null);
    setConfirmRequest({ opts, resolve });
  }), [remember]);
  const settleConfirm = useCallback((value) => {
    const req = confirmRef.current;
    if (!req) return;
    setConfirmRequest(null);
    req.resolve(!!value);
    restore('confirm');
  }, [restore]);

  const actions = useMemo(() => ({
    toast, dismissToast, clearToasts,
    openAbout: open('about'), closeAbout: close('about'),
    openFeedback: open('feedback'), closeFeedback: close('feedback'),
    openSettings: open('settings'), closeSettings: close('settings'),
    openDemoGuide: open('demoGuide'), closeDemoGuide: close('demoGuide'),
    openMenu, closeMenu,
    confirm, settleConfirm,
  }), [toast, dismissToast, clearToasts, open, close, openMenu, closeMenu, confirm, settleConfirm]);

  const state = useMemo(() => ({ toasts, ...overlays, menu, confirmRequest }), [toasts, overlays, menu, confirmRequest]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

// Outside a <UIProvider> (an isolated dev entry that mounts only a view) the hooks degrade to no-ops instead of
// throwing, so a view can still be built and looked at. AppFrame always mounts the real provider.
const noop = () => {};
let warned = false;
const warnOnce = () => {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn('[ui] useUI() called outside <UIProvider>: toasts and overlays are no-ops. Mount the view inside <AppFrame>.');
};
const FALLBACK_ACTIONS = {
  toast: (t) => { warnOnce(); // eslint-disable-next-line no-console
    console.info('[ui] toast', t); return 0; },
  dismissToast: noop, clearToasts: noop,
  openAbout: noop, closeAbout: noop, openFeedback: noop, closeFeedback: noop, openSettings: noop, closeSettings: noop,
  openDemoGuide: noop, closeDemoGuide: noop, openMenu: noop, closeMenu: noop,
  confirm: (o = {}) => { warnOnce(); return Promise.resolve(typeof window.confirm === 'function' ? window.confirm(o.title || 'Are you sure?') : false); },
  settleConfirm: noop,
};
const FALLBACK_STATE = { toasts: [], about: false, feedback: false, settings: false, demoGuide: false, menu: { open: false, anchor: null }, confirmRequest: null };

export function useUI() {
  return useContext(ActionsContext) || FALLBACK_ACTIONS;
}

export function useUIState() {
  return useContext(StateContext) || FALLBACK_STATE;
}
