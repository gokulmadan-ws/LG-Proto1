// Theme model: <html data-theme="dark|light">, default DARK, persisted in localStorage['kontor-theme'].
// index.html's inline script sets the attribute before first paint (no flash, works with storage blocked);
// this module keeps it in sync afterwards. Native controls and scrollbars follow the theme through the
// per-theme `color-scheme` in shell.css / app.css, and the <meta name="color-scheme"> is kept in step here.
import { useState, useEffect } from 'react';
import { KEYS, getItem, setItem } from './storage.js';

export const THEME_KEY = KEYS.theme;
export const THEME_EVENT = 'kontor-theme';

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(next) {
  const t = next === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', t);
  setItem(THEME_KEY, t);                                  // false when storage is blocked: the toggle still works for the session
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: t }));
  return t;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

/** [theme, setTheme]. Re-renders on any toggle (also from another tab). Charts that read CSS colours in JS use it as a dependency. */
export function useTheme() {
  const [theme, setLocal] = useState(getTheme);
  useEffect(() => {
    const sync = () => setLocal(getTheme());
    const onStorage = (e) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        document.documentElement.setAttribute('data-theme', e.newValue);
        sync();
      }
    };
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', onStorage);
    sync();
    return () => { window.removeEventListener(THEME_EVENT, sync); window.removeEventListener('storage', onStorage); };
  }, []);
  return [theme, setTheme];
}

/** Stored preference or null (not the live attribute). Mostly for tests and the Settings drawer. */
export function storedTheme() {
  const v = getItem(THEME_KEY, null);
  return v === 'light' || v === 'dark' ? v : null;
}
