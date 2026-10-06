// src/charts/CumulativeLine.jsx
// (c, detail) One contract: cumulative spend over time against a horizontal cap line, with the
// cap-crossing point annotated ("the Guildford moment").
//  - SVG for geometry, HTML overlay for the annotation + the keyboard/pointer hit layer
//  - line is blue while under the cap and red once over it (colour is redundant: the cap line, the zones,
//    the marker, the callout words and the end label all say it too)
//  - Keyboard: Tab to the plot, Left/Right move month by month, Home/End jump, Esc dismisses the tooltip.
import { useMemo, useRef, useState } from 'react';
import { toDate, fmtDate, fmtMonthYear, addMonths, monthsBetween, gbp, gbpFull, gbpTick, pct } from './format.js';
import { linear, niceTicks, nearestIndex, clamp } from './scales.js';
import { CLOSE_AT } from './flags.js';
import { useWidth } from './hooks.js';
import { useChartTip, ChartTip } from './Tip.jsx';

const M_WIDE = { t: 22, r: 104, b: 36, l: 58 };
const M_NARROW = { t: 22, r: 76, b: 36, l: 52 };   // phone widths: tighter margins, compact annotation

/** series: [{ date: 'YYYY-MM-DD', cum: number (cumulative spend at that date), pay?: number (paid in the period) }] ascending */
export function CumulativeLine(props) {
  if (!props.series || props.series.length === 0) return <p className="kviz-note">No payments are linked to this contract yet.</p>;
  return <CumulativeLinePlot {...props} />;
}

function CumulativeLinePlot({ series, cap, closeAt = CLOSE_AT, height = 360, subject = 'this contract' }) {
  const [wrapRef, W] = useWidth();
  const hitRef = useRef(null);
  const tip = useChartTip();
  const [idx, setIdx] = useState(null);
  const compact = W > 0 && W < 560;
  const M = compact ? M_NARROW : M_WIDE;
  const iw = Math.max(80, W - M.l - M.r), ih = height - M.t - M.b;

  const g = useMemo(() => {
    const pts = series.map((p) => ({ ...p, t: toDate(p.date).getTime() }));
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const maxV = Math.max(...pts.map((p) => p.cum));
    const yt = niceTicks(Math.max(cap * 1.12, maxV * 1.06), 4);
    const yMax = yt[yt.length - 1];
    const x = linear([t0, t1], [0, iw]);
    const y = linear([0, yMax], [ih, 0]);
    const xs = pts.map((p) => x(p.t));
    const ci = pts.findIndex((p) => p.cum > cap);
    let cross = null;
    if (ci >= 0) {
      const a = ci > 0 ? pts[ci - 1] : { t: pts[0].t, cum: 0 };
      const f = (cap - a.cum) / (pts[ci].cum - a.cum);
      const tc = a.t + f * (pts[ci].t - a.t);
      cross = { t: tc, x: x(tc), y: y(cap), ci };
    }
    const all = pts.map((p) => [x(p.t), y(p.cum)]);
    const below = cross ? all.slice(0, cross.ci).concat([[cross.x, cross.y]]) : all;
    const above = cross ? [[cross.x, cross.y]].concat(all.slice(cross.ci)) : null;
    const line = (a) => a.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const area = (a) => line(a) + `L${a[a.length - 1][0].toFixed(1)} ${ih}L${a[0][0].toFixed(1)} ${ih}Z`;
    // x ticks on month starts, spaced >= 92px apart
    const span = Math.max(1, monthsBetween(t0, t1));
    const per = [1, 2, 3, 6, 12].find((n) => iw / (span / n) >= 92) || 12;
    const xt = [];
    let d = new Date(Date.UTC(new Date(t0).getUTCFullYear(), new Date(t0).getUTCMonth(), 1));
    while (d.getTime() <= t1) {
      if (d.getTime() >= t0 && d.getUTCMonth() % per === 0) xt.push(d.getTime());
      d = addMonths(d, 1);
    }
    return { pts, x, y, xs, yt, yMax, cross, below, above, line, area, xt };
  }, [series, cap, iw, ih]);

  const last = g.pts.length - 1;
  const over = (v) => v > cap;
  const content = (i) => {
    const p = g.pts[i];
    const isOver = over(p.cum);
    return {
      title: fmtDate(p.date),
      rows: [
        { value: gbp(p.cum), label: 'Cumulative spend', color: isOver ? 'var(--viz-danger)' : 'var(--viz-accent)' },
        { value: pct(p.cum / cap), label: 'of cap', glyph: isOver ? 'triangle-exclamation' : p.cum / cap >= closeAt ? 'circle-exclamation' : 'circle-check',
          glyphColor: isOver ? 'var(--viz-danger-text)' : p.cum / cap >= closeAt ? 'var(--viz-warning-text)' : 'var(--viz-ink-2)' },
        { value: gbp(Math.abs(cap - p.cum)), label: isOver ? 'Over the cap' : 'Headroom left' },
        ...(p.pay != null ? [{ value: gbp(p.pay), label: 'Paid in the period' }] : []),
      ],
    };
  };
  const aria = (i) => { const p = g.pts[i]; return `${fmtMonthYear(p.date)}: ${gbpFull(p.cum)} cumulative spend, ${pct(p.cum / cap)} of the ${gbpFull(cap)} cap`; };
  const select = (i) => {
    setIdx(i);
    const rectAt = () => {
      const r = hitRef.current.getBoundingClientRect();
      const px = r.left + g.xs[i], py = r.top + g.y(g.pts[i].cum);
      return { left: px - 1, right: px + 1, top: py - 7, bottom: py + 7 };
    };
    tip.show(rectAt(), content(i), undefined, rectAt);
  };
  const onKey = (e) => {
    const i = idx == null ? last : idx;
    const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: last, PageDown: i + 3, PageUp: i - 3 };
    if (e.key in map) { e.preventDefault(); select(clamp(map[e.key], 0, last)); }
    else if (e.key === 'Escape') { tip.hide(); }
  };
  const summary = g.cross
    ? `Cumulative spend on ${subject} crossed the ${gbpFull(cap)} cap on ${fmtDate(g.cross.t)} and reached ${gbpFull(g.pts[last].cum)} (${pct(g.pts[last].cum / cap)} of the cap) by ${fmtDate(g.pts[last].date)}.`
    : `Cumulative spend on ${subject} is ${gbpFull(g.pts[last].cum)}, ${pct(g.pts[last].cum / cap)} of the ${gbpFull(cap)} cap, at ${fmtDate(g.pts[last].date)}.`;

  const endY = g.y(g.pts[last].cum);
  const capY = g.y(cap), closeY = g.y(cap * closeAt);
  // keep the end label clear of the "Cap" and "85%" labels in the right margin
  const avoid = compact ? [capY - 6] : [capY - 6, closeY + 14];
  let endLabelY = endY;
  avoid.forEach((a) => { if (Math.abs(endLabelY - a) < 22) endLabelY = a + (endLabelY >= a ? 22 : -22); });
  const callRight = g.cross && g.cross.x < 190;

  return (
    <div ref={wrapRef} className="kviz-line" style={{ height }}>
      {W > 0 && (
        <>
          <svg className="kviz-svg" width={W} height={height} aria-hidden="true" focusable="false">
            <g transform={`translate(${M.l},${M.t})`}>
              <rect className="kviz-z kviz-z--over" x="0" y="0" width={iw} height={Math.max(0, capY)} />
              <rect className="kviz-z kviz-z--close" x="0" y={capY} width={iw} height={Math.max(0, closeY - capY)} />
              {g.yt.slice(1).map((t) => <line key={t} className="kviz-grid" x1="0" x2={iw} y1={g.y(t)} y2={g.y(t)} />)}
              {g.yt.map((t) => <text key={'l' + t} className="kviz-tl" x="-10" y={g.y(t)} textAnchor="end" dominantBaseline="middle">{gbpTick(t)}</text>)}
              <line className="kviz-axis" x1="0" x2={iw} y1={ih} y2={ih} />
              {g.xt.map((t) => (
                <g key={t} transform={`translate(${g.x(t)},${ih})`}>
                  <line className="kviz-axis" y1="0" y2="5" />
                  <text className="kviz-tl" y="22" textAnchor="middle">{fmtMonthYear(new Date(t))}</text>
                </g>
              ))}
              <line className="kviz-closeline" x1="0" x2={iw} y1={closeY} y2={closeY} />
              <line className="kviz-capline" x1="0" x2={iw} y1={capY} y2={capY} />
              <text className="kviz-capl" x={iw + 10} y={capY - 6}>Cap {gbp(cap)}</text>
              {!compact && <text className="kviz-tl" x={iw + 10} y={closeY + 14}>{Math.round(closeAt * 100)}% of cap</text>}

              <path className="kviz-area kviz-area--ok" d={g.area(g.below)} />
              {g.above && <path className="kviz-area kviz-area--over" d={g.area(g.above)} />}
              <path className="kviz-path kviz-path--ok" d={g.line(g.below)} />
              {g.above && <path className="kviz-path kviz-path--over" d={g.line(g.above)} />}

              {g.cross && <line className="kviz-drop" x1={g.cross.x} x2={g.cross.x} y1={g.cross.y} y2={ih} />}
              {g.cross && <circle className="kviz-pt kviz-pt--over" cx={g.cross.x} cy={g.cross.y} r="6" />}

              <circle className={'kviz-pt ' + (over(g.pts[last].cum) ? 'kviz-pt--over' : 'kviz-pt--ok')} cx={g.xs[last]} cy={endY} r="5" />
              <text className="kviz-endl" x={g.xs[last] + 12} y={endLabelY - 2}>{gbp(g.pts[last].cum)}</text>
              <text className="kviz-tl" x={g.xs[last] + 12} y={endLabelY + 14}>{pct(g.pts[last].cum / cap)}{compact ? '' : ' of cap'}</text>

              {idx != null && (
                <g>
                  <line className="kviz-cross" x1={g.xs[idx]} x2={g.xs[idx]} y1="0" y2={ih} />
                  <circle className={'kviz-pt ' + (over(g.pts[idx].cum) ? 'kviz-pt--over' : 'kviz-pt--ok')} cx={g.xs[idx]} cy={g.y(g.pts[idx].cum)} r="5" />
                </g>
              )}
            </g>
          </svg>

          {g.cross && (
            <div className={'kviz-callout' + (callRight || compact ? ' is-right' : '')}
              style={compact ? { left: M.l + 8, top: M.t + 8, transform: 'none' }
                : { left: M.l + g.cross.x + (callRight ? 14 : -14), top: M.t + g.cross.y - 16 }}>
              <span className="kviz-callout__t"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Cap crossed</span>
              <span className="kviz-callout__s">{fmtDate(g.cross.t)} · {gbp(cap)}</span>
            </div>
          )}

          <div ref={hitRef} className="kviz-line__hit" data-kviz-mark="" tabIndex={0} role="slider"
            aria-label={`Cumulative spend over time. ${summary} Use the left and right arrow keys to move between points.`}
            aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={last}
            aria-valuenow={idx == null ? last : idx} aria-valuetext={aria(idx == null ? last : idx)}
            style={{ left: M.l, top: M.t, width: iw, height: ih }}
            onPointerMove={(e) => {
              const r = hitRef.current.getBoundingClientRect();
              const i = nearestIndex(g.xs, e.clientX - r.left);
              if (i !== idx) select(i);
            }}
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') { tip.hideSoon(); setIdx(null); } }}
            onFocus={() => { if (idx == null) select(last); }}
            onBlur={() => { tip.hide(); setIdx(null); }}
            onKeyDown={onKey} />
        </>
      )}
      <ChartTip api={tip} />
    </div>
  );
}

export function cumulativeTable(series, cap) {
  return {
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'pay', label: 'Paid in period', align: 'right' },
      { key: 'cum', label: 'Cumulative spend', align: 'right' },
      { key: 'pct', label: 'Share of cap', align: 'right' },
    ],
    rows: series.map((p, i) => ({ id: i, date: fmtDate(p.date), pay: p.pay != null ? gbpFull(p.pay) : '', cum: gbpFull(p.cum), pct: pct(p.cum / cap) })),
  };
}

export const LINE_LEGEND = (cap) => [
  { key: 'ok', label: 'Cumulative spend, within the cap', shape: 'line', color: 'var(--viz-accent)' },
  { key: 'over', label: 'Cumulative spend, over the cap', shape: 'line', color: 'var(--viz-danger)' },
  { key: 'cap', label: `Contract cap (${gbp(cap)})`, shape: 'line', color: 'var(--viz-ink)' },
  { key: 'close', label: 'Close to cap zone', shape: 'bar', color: 'var(--viz-warning)' },
];
