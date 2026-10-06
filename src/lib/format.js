// Number and date formatting for the whole app (en-GB, UTC, never reads the clock).
// Re-exports the engine's money and percent formatters so views import everything from one place.
//
//   fmtDate('2026-10-06')      -> '6 Oct 2026'        (tables)
//   fmtDateLong('2026-10-06')  -> '6 October 2026'    (prose)
//   fmtGBP(3350000)            -> '£3,350,000'        (audited figures: tables, drawers, breakdowns)
//   fmtGBPCompact(6145238)     -> '£6.1m'             (headline, cards; integer rounding, so £8,350,000 is '£8.4m')
//   fmtGBPPence(63012.4)       -> '£63,012.40'        (individual payments)
//   fmtPct(0.948)              -> '94.8%'             (one decimal by default)
//   fmtPctWhole(0.8428)        -> '84%'
// Null or empty dates format to '' so callers decide what to show instead ("Not stated").
import { fmtGBP, fmtGBPCompact, fmtPct } from './engine.js';

export { fmtGBP, fmtGBPCompact, fmtPct };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

/** '2026-10-06' -> '6 Oct 2026'. */
export function fmtDate(iso) { const p = parts(iso); return p ? `${p.d} ${MONTHS_SHORT[p.m - 1]} ${p.y}` : ''; }
/** '2026-10-06' -> '6 October 2026'. */
export function fmtDateLong(iso) { const p = parts(iso); return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : ''; }
/** '2026-10-06' -> 'October 2026'. */
export function fmtMonthYear(iso) { const p = parts(iso); return p ? `${MONTHS[p.m - 1]} ${p.y}` : ''; }
/** '04-01' -> '1 April' (month and day, no year). */
export function fmtMonthDay(md) { const m = /^(\d{2})-(\d{2})$/.exec(md || ''); return m ? `${+m[2]} ${MONTHS[+m[1] - 1]}` : ''; }

/** Money with pence: 63012.4 -> '£63,012.40'. Use for single payments; use fmtGBP everywhere else. */
export function fmtGBPPence(x) { return '£' + Number(x).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
/** 0.8428 -> '84%'. */
export function fmtPctWhole(x) { return Math.round(x * 100) + '%'; }
/** 1264 -> '1,264'. */
export function fmtNumber(n) { return Math.round(n).toLocaleString('en-GB'); }
/** plural(1, 'contract') -> '1 contract'; plural(3, 'contract') -> '3 contracts'; plural(2, 'opportunity', 'opportunities'). */
export function plural(n, one, many) { return `${fmtNumber(n)} ${n === 1 ? one : (many || one + 's')}`; }
/** ['a','b','c'] -> 'a, b and c'. */
export function joinList(items) { const a = items.filter(Boolean); return a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
