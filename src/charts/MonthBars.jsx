// src/charts/MonthBars.jsx
// Stacked columns by month (the action tracker's "Value secured, by month closed"). Series stack bottom-up in the order given
// (cash recovered under cost avoided), a value label sits on each column with a total, and the y axis reads in £k.
// Every column carries its numbers as text for screen readers (a list, one item per month), and the tooltip repeats them on hover.
import { gbpK, gbpTick } from './format.js';
import { useChartTip, ChartTip } from './Tip.jsx';

/** A "nice" axis top and step (1, 2 or 5 x 10^n) so about three gridlines cover the tallest column. */
function niceScale(max, steps = 3) {
  if (!(max > 0)) return { top: 1, step: 1, ticks: [0] };
  const raw = max / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return { top, step, ticks };
}

/**
 * months: [{ key, label ('May'), name ('May 2026'), values: { [seriesKey]: number }, aria: string }]
 * series: [{ key, label, color }] bottom to top.     format: value label on top of a column (default £k).
 * label: accessible name of the chart.               height: plot height in px.
 */
export function MonthBars({ months, series, format = gbpK, tick = gbpTick, label, height = 180 }) {
  const tip = useChartTip();
  const totals = months.map((m) => series.reduce((s, x) => s + (m.values[x.key] || 0), 0));
  const { top, ticks } = niceScale(Math.max(0, ...totals));
  const pct = (v) => (v / top) * 100;
  return (
    <div className="kviz-mb" role="group" aria-label={label}>
      <div className="kviz-mb__plot" style={{ height }}>
        <div className="kviz-mb__grid" aria-hidden="true">
          {ticks.map((t) => <span key={t} className="kviz-mb__gl" style={{ bottom: pct(t) + '%' }}><span className="kviz-mb__tick">{tick(t)}</span></span>)}
        </div>
        <ul className="kviz-mb__cols">
          {months.map((m, i) => {
            const content = {
              title: m.name,
              rows: [...series].reverse().map((s) => ({ value: format(m.values[s.key] || 0), label: s.label, color: s.color })),
            };
            let acc = 0;
            const topKey = [...series].reverse().find((s) => (m.values[s.key] || 0) > 0);
            return (
              <li key={m.key} className="kviz-mb__col" data-month={m.key} {...tip.bindPointer(content)}>
                <span className="kviz-sr">{m.aria}</span>
                <span className="kviz-mb__stack" aria-hidden="true" style={{ height: pct(totals[i]) + '%' }}>
                  {series.map((s) => {
                    const v = m.values[s.key] || 0;
                    if (!v) return null;
                    const seg = <span key={s.key} className={'kviz-mb__seg' + (topKey && topKey.key === s.key ? ' is-top' : '')} style={{ height: (v / totals[i]) * 100 + '%', background: s.color, bottom: (acc / totals[i]) * 100 + '%' }} />;
                    acc += v;
                    return seg;
                  })}
                  {totals[i] > 0 && <span className="kviz-mb__val" data-total={totals[i]}>{format(totals[i])}</span>}
                </span>
                <span className="kviz-mb__lab" aria-hidden="true">{m.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <ChartTip api={tip} />
    </div>
  );
}

export default MonthBars;
