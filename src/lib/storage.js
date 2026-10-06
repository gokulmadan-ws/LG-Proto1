// Safe localStorage. Every access is wrapped in try/catch because localStorage can throw (private windows,
// blocked site data, sandboxed iframes, quota). When it is blocked the values live in an in-memory map for the
// session, so features keep working and only persistence across reloads is lost (R76).
//
//   import { getJSON, setJSON, getItem, setItem, removeItem, storageAvailable, KEYS } from './storage.js';
//   const triage = getJSON(KEYS.triage, {});           // corrupt JSON or blocked storage -> the fallback
//   setJSON(KEYS.triage, { 'F-C-005-overCap': 'explained' });   // -> true when it reached localStorage

export const KEYS = {
  theme: 'kontor-theme',
  triage: 'kontor-triage',
  matches: 'kontor-matches',
  assumptions: 'kontor-assumptions',
  handcheck: 'kontor-handcheck',
  feedback: 'kontor-feedback',
};

const memory = new Map();

function ls() {
  try { return window.localStorage || null; } catch (e) { return null; }   // the accessor itself can throw
}

/** True when localStorage can be read and written right now. */
export function storageAvailable() {
  try {
    const s = ls();
    if (!s) return false;
    const k = '__kontor_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return true;
  } catch (e) { return false; }
}

/** Raw string, or `fallback` when missing or unreadable. */
export function getItem(key, fallback = null) {
  try {
    const s = ls();
    if (s) {
      const v = s.getItem(key);
      if (v !== null) return v;
    }
  } catch (e) { /* fall through to memory */ }
  return memory.has(key) ? memory.get(key) : fallback;
}

/** Stores a string. Returns true if it reached localStorage (false = kept in memory for this session only). */
export function setItem(key, value) {
  const str = String(value);
  memory.set(key, str);
  try {
    const s = ls();
    if (!s) return false;
    s.setItem(key, str);
    return true;
  } catch (e) { return false; }
}

export function removeItem(key) {
  memory.delete(key);
  try {
    const s = ls();
    if (!s) return false;
    s.removeItem(key);
    return true;
  } catch (e) { return false; }
}

/** Parsed JSON. Corrupt, missing or blocked -> `fallback`. Never throws. */
export function getJSON(key, fallback = null) {
  const raw = getItem(key, null);
  if (raw === null || raw === '') return fallback;
  try {
    const v = JSON.parse(raw);
    return v === null || v === undefined ? fallback : v;
  } catch (e) { return fallback; }
}

/** Stores JSON. Returns true if it reached localStorage. */
export function setJSON(key, value) {
  try { return setItem(key, JSON.stringify(value)); } catch (e) { return false; }
}

/** Removes every Kontor key (used by Reset demo changes). The theme is kept unless `includeTheme` is true. */
export function clearKontorKeys({ includeTheme = false } = {}) {
  Object.values(KEYS).forEach((k) => { if (includeTheme || k !== KEYS.theme) removeItem(k); });
}
