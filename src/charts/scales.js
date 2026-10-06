// src/charts/scales.js
// Tiny scale helpers (no d3). Everything returns plain numbers.

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** linear([d0,d1],[r0,r1]) -> f(v); f.invert(y) */
export function linear([d0, d1], [r0, r1]) {
  const k = (r1 - r0) / (d1 - d0 || 1);
  const f = (v) => r0 + (v - d0) * k;
  f.invert = (y) => d0 + (y - r0) / k;
  return f;
}

/** Round up to a "nice" number (1, 2, 2.5, 5 x 10^n). */
export function niceStep(rough, steps = [1, 2, 2.5, 5, 10]) {
  const p = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / p;
  return (steps.find((s) => f <= s) || 10) * p;
}
/** [0, step, 2*step ... >= max] with ~count ticks. Pass steps=[1,2,5,10] to avoid 2.5 steps (percent axes). */
export function niceTicks(max, count = 5, steps) {
  const step = niceStep(max / count, steps);
  const out = [];
  for (let v = 0; v < max + step * 0.999; v += step) out.push(+v.toFixed(10));
  return out;
}

/** Index of the point whose x is closest to px (points sorted ascending). */
export function nearestIndex(xs, px) {
  let lo = 0, hi = xs.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] < px) lo = mid; else hi = mid; }
  return Math.abs(xs[lo] - px) <= Math.abs(xs[hi] - px) ? lo : hi;
}
