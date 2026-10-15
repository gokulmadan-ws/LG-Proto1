// "Just added" on a board card: the actions you created in this browser session (build spec 8.4). Kept in sessionStorage so a reload of
// the same tab keeps the chip; a new tab or Reset demo data clears it. Storage may throw (private window, blocked site data): then the
// list lives in memory for the page's life. Never read for any number.
const KEY = 'kontor-just-added';
let memory = [];

function read() {
  try { const v = JSON.parse(window.sessionStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return memory; }
}
function write(list) {
  memory = list;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* memory only */ }
}

export const isJustAdded = (flagId) => read().includes(flagId);
export function markJustAdded(flagId) { const list = read(); if (!list.includes(flagId)) write([...list, flagId]); }
export function clearJustAdded() { write([]); try { window.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
