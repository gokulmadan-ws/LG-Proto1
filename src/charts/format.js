// src/charts/format.js
// Formatting + date helpers shared by every chart. Pure functions, no React.
// Dates are handled as UTC midnight so the as-of date never drifts with the viewer's timezone.

export const AS_OF = '2026-10-06';            // fixed demo as-of date; never Date.now()
export const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MINUS = '−';                         // proper minus sign for negatives

/* ---------------------------------------------------------------- dates */
export const toDate = (v) =>
  v instanceof Date ? v : new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00Z' : v);
export const iso = (d) => toDate(d).toISOString().slice(0, 10);

/** '6 Oct 2026' (fixed month names: Intl en-GB prints "Sept", the spec wants "Sep") */
export const fmtDate = (v) => { const d = toDate(v); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
/** '6 October 2026' for prose */
export const fmtDateLong = (v) => { const d = toDate(v); return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
/** 'Oct 2026' */
export const fmtMonthYear = (v) => { const d = toDate(v); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
/** '6 Oct' */
export const fmtDayMonth = (v) => { const d = toDate(v); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

/** Add whole months, clamping the day (31 Mar - 6 months = 30 Sep, not 1 Oct). Returns a Date. */
export function addMonths(v, n) {
  const d = toDate(v);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}

/** Fractional calendar months from a to b (negative if b is before a).
 *  Exact at whole-month anchors: monthsBetween('2026-10-06','2027-01-06') === 3. Used only for x positions. */
export function monthsBetween(a, b) {
  const A = toDate(a), B = toDate(b);
  let whole = (B.getUTCFullYear() - A.getUTCFullYear()) * 12 + (B.getUTCMonth() - A.getUTCMonth());
  let anchor = addMonths(A, whole);
  if (B < anchor) { whole -= 1; anchor = addMonths(A, whole); }
  const next = addMonths(A, whole + 1);
  return whole + (B - anchor) / (next - anchor);
}
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);

/** Radar wording: '25 days left' / 'Due today' / '6 days ago' (matches the requirements doc, section 5.3) */
export function relativeFrom(asOf, v) {
  const d = daysBetween(asOf, v);
  if (d === 0) return 'Due today';
  const n = Math.abs(d);
  return d > 0 ? `${n.toLocaleString('en-GB')} day${n === 1 ? '' : 's'} left` : `${n.toLocaleString('en-GB')} day${n === 1 ? '' : 's'} ago`;
}

/* ---------------------------------------------------------------- money */
const GBP0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

/** Tables / exact figures / aria-labels: £18,900,000 (same as the engine's fmtGBP) */
export const gbpFull = (n) => (n < 0 ? MINUS : '') + GBP0.format(Math.abs(n));

/** Compact: £1.2m, £18.9m, £340k, £9,500. One decimal from £1m, whole £k from £10k, full figure below.
 *  Agrees with the engine's fmtGBPCompact from £1m up and below £100k; between £100k and £1m it keeps
 *  the £k precision (£642k, not £0.6m). Where an acceptance test fixes the string (Overview cards), pass format={fmtGBPCompact}. */
export function gbp(n, { sign = false } = {}) {
  const a = Math.abs(n);
  let s;
  if (a >= 999500) s = '£' + (Math.round(a / 1e5) / 10).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'm';   // integer rounding: 8.35m -> £8.4m (toFixed gives 8.3)
  else if (a >= 10000) { const k = Math.round(a / 1000); s = k >= 1000 ? '£1.0m' : '£' + k + 'k'; }
  else s = '£' + Math.round(a).toLocaleString('en-GB');
  return (n < 0 ? MINUS : sign && n > 0 ? '+' : '') + s;
}

/** The engine's own compact formatter (golden strings such as '£0.6m'). Re-exported here so charts can take it as `format`. */
export const fmtGBPCompact = (x) => {
  const a = Math.abs(x);
  if (a >= 1e5) return '£' + (Math.round(x / 1e5) / 10).toFixed(1) + 'm';
  if (a >= 1e4) return '£' + Math.round(x / 1e3) + 'k';
  return gbpFull(x);
};

/** Axis ticks: £0, £2m, £2.5m, £500k (no trailing .0). */
export function gbpTick(n) {
  const a = Math.abs(n);
  if (a === 0) return '£0';
  if (a >= 1e6) return '£' + +(a / 1e6).toFixed(1) + 'm';
  if (a >= 1e3) return '£' + +(a / 1e3).toFixed(0) + 'k';
  return '£' + a;
}

/** Ratio to percent: pct(0.853) -> '85%'; pct(0.948, 1) -> '94.8%'. */
export const pct = (r, dp = 0) => (r < 0 ? MINUS : '') + Math.abs(r * 100).toFixed(dp) + '%';
/** Percentage-point difference: '+4.2 pts' */
export const pts = (r, dp = 1) => (r < 0 ? MINUS : '+') + Math.abs(r * 100).toFixed(dp) + ' pts';
/** '1 contract', '12 contracts', '1,203 payments' */
export const plural = (n, one, many = one + 's') => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
/** Axis tick for a ratio: 0.025 -> '2.5%', 0.04 -> '4%', -0.5 -> '-50%' */
export const pctTick = (r) => (r < 0 ? MINUS : '') + +(Math.abs(r) * 100).toFixed(1) + '%';
