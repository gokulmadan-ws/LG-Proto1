// src/charts/YearBars.jsx
// (c, annual cap variant) Spend per CONTRACT YEAR against a per-year cap (requirements R40 / R42).
// Columns <= 32px wide. A year over the cap: solid red up to the cap line, 45-degree hatch above it, "Over by" label.
// The running year is outlined and labelled "Year to date" (never pro-rated).
import { useId } from 'react';
import { gbp, gbpFull, pct, fmtDate } from './format.js';
import { stateFor, CLOSE_AT } from './flags.js';
import { Hatch } from './Hatch.jsx';
import { useChartTip, ChartTip } from './Tip.jsx';
import { useArrowNav } from './hooks.js';

/** years: [{ year: 1, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', spend, partial? }] cap: annual cap in GBP */
export function YearBars({ years, cap, height = 220, closeAt = CLOSE_AT, format = gbp }) {
  const tip = useChartTip();
  const nav = useArrowNav();
  const uid = useId();
  const max = Math.max(cap * 1.2, ...years.map((y) => y.spend * 1.08));
  const H = (v) => (v / max) * 100;
  return (
    <div className="kviz-yb" {...nav}>
      <div className="kviz-yb__plot" style={{ height, '--n': years.length }}>
        <div className="kviz-yb__cap" style={{ bottom: H(cap) + '%' }}><span>Annual cap {format(cap)}</span></div>
        <ul className="kviz-yb__cols" aria-label="Spend in each contract year">
          {years.map((y) => {
            const ratio = y.spend / cap, st = stateFor(ratio, closeAt), over = Math.max(0, y.spend - cap);
            const content = {
              title: `Year ${y.year}${y.partial ? ' (year to date)' : ''}`, sub: `${fmtDate(y.from)} to ${fmtDate(y.to)}`,
              rows: [
                { value: format(y.spend), label: 'Spend in the year', color: st.color },
                { value: pct(ratio, 1), label: 'of the annual cap', glyph: st.glyph, glyphColor: st.key === 'within' ? 'var(--viz-ink-2)' : st.text },
                ...(over > 0 ? [{ value: format(over), label: 'Over the cap' }] : []),
              ],
            };
            const aria = `Year ${y.year}${y.partial ? ', year to date' : ''}, ${fmtDate(y.from)} to ${fmtDate(y.to)}: ${gbpFull(y.spend)}, ${pct(ratio, 1)} of the annual cap. ${st.label}.${over > 0 ? ' ' + gbpFull(over) + ' over.' : ''}`;
            return (
              <li key={y.year} className="kviz-yb__col">
                <button type="button" className="kviz-yb__hit" aria-label={aria} {...tip.bind(content)} id={uid + y.year}>
                  <span className="kviz-yb__val" style={{ bottom: `calc(${H(y.spend)}% + 4px)` }}>{format(y.spend)}</span>
                  <span className={'kviz-yb__bar' + (y.partial ? ' is-partial' : '')} style={{ height: H(Math.min(y.spend, cap)) + '%', background: y.partial ? 'transparent' : st.color, '--c': st.color }} />
                  {over > 0 && <span className="kviz-yb__over" style={{ bottom: H(cap) + '%', height: H(over) + '%' }}><Hatch color="var(--viz-danger)" period={6} /></span>}
                </button>
                <span className="kviz-yb__lab">Year {y.year}{y.partial && <small>Year to date</small>}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <ChartTip api={tip} />
    </div>
  );
}
