// src/charts/StackedBar.jsx
// Part-to-whole bar. Stacked ONLY because the parts sum to the whole (flag types -> headline; matched/unmatched spend).
// 2px surface gap between segments (never a stroke), 4px radius on the outer ends only, 24-28px thick.
import { gbp, gbpFull, pct, plural } from './format.js';
import { useWidth } from './hooks.js';
import { useChartTip, ChartTip } from './Tip.jsx';
import { Hatch } from './Hatch.jsx';

/** segments: [{ key, label, value, color, on?, glyph?, count?, pattern?: 'hatch', hatchPeriod? }]   (draw order = array order)
 *  focusable=false: the segments become pointer-only (use when the same facts are already focusable elsewhere, e.g. the cards under the headline). */
export function StackedBar({ segments, total, height = 24, ariaLabel, onSelect, format = gbp, unit = 'contract', focusable = true }) {
  const [ref, w] = useWidth();
  const tip = useChartTip();
  const live = segments.filter((s) => s.value > 0);
  const sum = total != null ? total : live.reduce((a, s) => a + s.value, 0);
  const usable = Math.max(0, w - (live.length - 1) * 2);
  return (
    <div className="kviz-stack-wrap">
      <div ref={ref} className="kviz-stack" role={focusable ? 'group' : 'presentation'} aria-label={focusable ? ariaLabel : undefined} aria-hidden={focusable ? undefined : true} style={{ height }}>
        {live.map((s) => {
          const share = s.value / sum;
          const text = format(s.value);
          const fits = !s.pattern && share * usable >= text.length * 7.4 + 22;          // measured fit: never clip a label
          const content = {
            title: s.label,
            rows: [
              { value: format(s.value), label: 'Indicative value', color: s.color, glyph: s.glyph },
              { value: pct(share), label: 'of the total' },
              ...(s.count != null ? [{ value: s.count.toLocaleString('en-GB'), label: s.count === 1 ? unit : unit + 's' }] : []),
            ],
          };
          const aria = `${s.label}: ${gbpFull(s.value)}, ${pct(share)} of the total${s.count != null ? ', ' + plural(s.count, unit) : ''}`;
          const common = {
            type: 'button', className: 'kviz-seg' + (s.pattern === 'hatch' ? ' is-hatch' : ''),
            style: { flexGrow: s.value, background: s.pattern ? undefined : s.color, color: s.on },
            onClick: onSelect ? () => onSelect(s) : undefined,
          };
          const inner = (<>{s.pattern === 'hatch' && <Hatch color={s.color} period={s.hatchPeriod || 8} />}{fits && <span className="kviz-seg__txt">{text}</span>}</>);
          return focusable
            ? <button key={s.key} aria-label={aria} {...common} {...tip.bind(content)}>{inner}</button>
            : <button key={s.key} tabIndex={-1} {...common} {...tip.bindPointer(content)}>{inner}</button>;
        })}
      </div>
      <ChartTip api={tip} />
    </div>
  );
}
