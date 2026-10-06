// src/charts/Dumbbell.jsx
// (e) UPLIFT CHECK: indexation cap vs actual year-on-year change in payments, per supplier.
//  tick = the cap (same "limit tick" language as the bullet chart), dot = actual change, connector = the gap.
//  Three states, each with glyph + words + colour: above the cap (flagged), above the cap but inside the 1-point tolerance, within the cap.
//  The axis handles negative changes (payments fell).
import { useMemo } from 'react';
import { pct, pts, pctTick, gbp, gbpFull } from './format.js';
import { niceStep } from './scales.js';
import { UPLIFT_STATES } from './flags.js';
import { useChartTip, ChartTip } from './Tip.jsx';
import { useArrowNav } from './hooks.js';

/** row: { id, title, supplier, cap (0.03 = 3%), actual (0.121 = +12.1%), flagged?: boolean (engine), excessGBP?: number, extra?: node, href? }
 *  If `flagged` is missing the component applies the engine rule: actual - cap > tolerance (default 1 point). */
export function Dumbbell({ rows, tolerance = 0.01, axisMin = -0.05, axisMax = 0.3, getHref, onOpen }) {
  const tip = useChartTip();
  const nav = useArrowNav();
  const data = useMemo(() => rows.map((r) => {
    const excess = r.actual - r.cap;
    const flagged = r.flagged != null ? r.flagged : excess > tolerance;
    const state = flagged ? UPLIFT_STATES.flag : excess > 0 ? UPLIFT_STATES.tolerance : UPLIFT_STATES.ok;
    return { ...r, excess, state };
  }).sort((a, b) => b.excess - a.excess), [rows, tolerance]);

  // The axis is clipped to [axisMin, axisMax] so one outlier (payments fell 54%) cannot flatten the 0-12% region where the decisions are.
  const vals = data.flatMap((r) => [r.cap, r.actual]);
  const hiRaw = Math.min(axisMax, Math.max(0.04, ...vals)), loRaw = Math.max(axisMin, Math.min(0, ...vals));
  const step = niceStep((hiRaw - loRaw) / 6, [1, 2, 5, 10]);
  const hi = Math.ceil(hiRaw / step - 1e-9) * step, lo = Math.floor(loRaw / step + 1e-9) * step;
  const ticks = []; for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(+t.toFixed(10));
  const clip = (v) => Math.min(hi, Math.max(lo, v));
  const P = (v) => ((clip(v) - lo) / (hi - lo)) * 100;

  return (
    <div className="kviz-db" {...nav}>
      <div className="kviz-db__grid kviz-db__axis" aria-hidden="true">
        <span className="kviz-colhead">Contract</span>
        <span className="kviz-db__lane kviz-db__lane--axis">
          {ticks.map((t, i) => (
            <span key={t} className={'kviz-bl__tickl' + (i === 0 ? ' is-first' : i === ticks.length - 1 ? ' is-last' : '')} style={{ left: P(t) + '%' }}>{pctTick(t)}</span>
          ))}
        </span>
        <span className="kviz-colhead kviz-db__nums">Cap and actual</span>
        <span className="kviz-colhead kviz-db__stat">Against the cap</span>
      </div>
      <ul className="kviz-db__list" aria-label="Contracts ranked by price increase above their indexation cap">
        {data.map((r) => {
          const s = r.state;
          const href = getHref ? getHref(r) : undefined;
          const Tag = href ? 'a' : 'button';
          const lo2 = Math.min(r.cap, r.actual), hi2 = Math.max(r.cap, r.actual);
          const verdict = s.key === 'flag' ? `${pts(r.excess)} above the cap${r.excessGBP ? `, about ${gbpFull(r.excessGBP)} paid above the capped increase` : ''}`
            : s.key === 'tolerance' ? `${pts(r.excess)} above the cap, inside the one point tolerance` : 'Within the cap';
          const aria = `${r.title}, ${r.supplier}. Index cap ${pct(r.cap, 1)}, payments changed by ${pct(r.actual, 1)}. ${verdict}.`;
          const content = {
            title: r.title, sub: r.supplier,
            rows: [
              { value: pct(r.actual, 1), label: 'Change in payments', color: s.color },
              { value: pct(r.cap, 1), label: 'Index cap', color: 'var(--viz-ink)' },
              { value: s.key === 'ok' ? 'Within cap' : pts(r.excess), label: s.label, glyph: s.glyph, glyphColor: s.text },
              ...(s.key === 'flag' && r.excessGBP ? [{ value: gbp(r.excessGBP), label: 'Paid above the capped increase' }] : []),
            ],
            note: 'Payments also move with volume and scope. Check the invoices before you act.',
          };
          return (
            <li key={r.id}>
              <div className="kviz-row kviz-db__row kviz-db__grid" data-kviz-row {...tip.bindPointer(content)}>
                <span className="kviz-bl__who">
                  <Tag className="kviz-row__link kviz-bl__name" aria-label={aria}
                    {...(href ? { href } : { type: 'button' })}
                    onClick={onOpen ? (ev) => { if (!href) onOpen(r, ev); } : undefined}
                    {...tip.bindFocus(content, '[data-kviz-row]')}>{r.title}</Tag>
                  <span className="kviz-bl__sub" aria-hidden="true">{r.supplier}</span>
                  {r.extra && <span className="kviz-row__extra">{r.extra}</span>}
                </span>
                <span className="kviz-db__lane" aria-hidden="true">
                  {ticks.map((t) => <span key={t} className={'kviz-db__gl' + (t === 0 ? ' is-zero' : '')} style={{ left: P(t) + '%' }} />)}
                  <span className="kviz-db__link" style={{ left: P(lo2) + '%', width: (P(hi2) - P(lo2)) + '%', background: s.key === 'ok' ? 'var(--viz-ink-2)' : s.color, opacity: s.key === 'ok' ? 0.5 : 1 }} />
                  <span className="kviz-db__cap" style={{ left: P(r.cap) + '%' }} />
                  <span className="kviz-db__dot" style={{ left: P(r.actual) + '%', background: s.color }} />
                  {r.actual < lo && <i className="fa-solid fa-angles-left kviz-db__clip" style={{ left: -17 }} />}
                  {r.actual > hi && <i className="fa-solid fa-angles-right kviz-db__clip" style={{ right: -17 }} />}
                </span>
                <span className="kviz-db__nums" aria-hidden="true">
                  <span className="kviz-bl__spend">{pct(r.actual, 1)}</span>
                  <span className="kviz-bl__of">cap {pct(r.cap, 1)}</span>
                </span>
                <span className="kviz-db__stat" aria-hidden="true">
                  <span className="kviz-pill" style={{ '--c': s.tint || s.color, color: s.text }}><i className={'fa-solid fa-' + s.glyph} />{s.label}</span>
                  <span className="kviz-bl__pct">{s.key === 'ok' ? 'No action needed' : pts(r.excess) + ' over the cap'}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <ChartTip api={tip} />
    </div>
  );
}

export const DUMBBELL_LEGEND = [
  { key: 'flag', label: 'Change in payments, above the cap', shape: 'dot', color: 'var(--viz-danger)' },
  { key: 'tol', label: 'Above the cap, inside the 1 point tolerance', shape: 'dot', color: 'var(--viz-warning)' },
  { key: 'ok', label: 'Within the cap', shape: 'dot', color: 'var(--viz-accent)' },
  { key: 'cap', label: 'Index cap', shape: 'tick', color: 'var(--viz-ink)' },
];
