// src/charts/RadarLanes.jsx
// (b) RENEWAL RADAR: time-axis lanes grouped by notice-deadline band (needs attention / 0-3 / 3-6 / 6-12 months).
// x = months from the as-of date. Each contract: solid "time to act" bar -> diamond at the notice deadline ->
// tinted "notice period" band -> tick at contract end. Value = number + shared-scale data bar (right column) + band subtotal.
// HTML/CSS with percentage positions (no JS measuring): text stays real text, every row is a stretched link.
import { AS_OF, addMonths, monthsBetween, fmtDate, relativeFrom, gbp, gbpFull, plural } from './format.js';
import { clamp } from './scales.js';
import { BANDS } from './flags.js';
import { useChartTip, ChartTip } from './Tip.jsx';
import { useArrowNav } from './hooks.js';
import { Hatch } from './Hatch.jsx';

/**
 * Renewal radar: time-axis lanes grouped by notice-deadline band.
 *
 * row: { id, title, supplier, band: 'passed'|'ended'|'m3'|'m6'|'m12', deadline, endDate, value, autoRenew?, usedEndDate?, extra?: node, href? }
 *  The band comes from the ENGINE (estate.radar): the component never re-derives it, so the chart can never disagree with the numbers.
 *
 * extraFor(row) -> node: the caller's content for the full-width line under each row. The app renders the action line, the notice
 *  period as extracted, a ConfidencePill and a ClauseLink there. It may hold real links and buttons: they sit above the row's stretched
 *  link. Text in it passes clicks through to the row. `row.extra` (from radarRows(estate, extraFor)) does the same per row.
 * getHref(row) -> '#/contracts/C-001' makes the row title a link; otherwise onOpen(row, event) is called from a button.
 * format: pass fmtGBPCompact where an acceptance test fixes the string.   headingAs: level of the group headings (default h3).
 */
export function RadarLanes({ rows, asOf = AS_OF, horizon = 12, onOpen, getHref, extraFor, valueLabel = 'Annual value', valueSuffix = ' a year', format = gbp, valueMax, headingAs: GH = 'h3' }) {
  const tip = useChartTip();
  const nav = useArrowNav();
  const placed = rows.filter((r) => BANDS.some((b) => b.key === r.band)).map((r) => ({
    ...r, m: monthsBetween(asOf, r.deadline), e: monthsBetween(asOf, r.endDate),
  }));
  const groups = BANDS.map((b) => ({ ...b, rows: placed.filter((r) => r.band === b.key).sort((a, z) => (a.m - z.m) || String(a.id).localeCompare(String(z.id))) }))
    .filter((g) => g.rows.length > 0 || !g.attention);
  const vMax = valueMax || Math.max(1, ...placed.map((r) => r.value));
  const X = (months) => clamp(months / horizon, 0, 1) * 100;       // percent across the lane
  const axis = [0, 3, 6, 12];
  let attnShown = false;

  return (
    <div className="kviz-rl" {...nav}>
      <div className="kviz-rl__grid kviz-rl__axis" aria-hidden="true">
        <span className="kviz-colhead">Contract</span>
        <span className="kviz-rl__lane kviz-rl__lane--axis">
          {axis.map((mo) => (
            <span key={mo} className={'kviz-rl__tick' + (mo === 0 ? ' is-first' : mo === horizon ? ' is-last' : '')} style={{ left: X(mo) + '%' }}>
              <b>{mo === 0 ? 'Now' : `${mo} months`}</b>
              <span>{fmtDate(addMonths(asOf, mo))}</span>
            </span>
          ))}
        </span>
        <span className="kviz-colhead kviz-rl__due">Notice deadline</span>
        <span className="kviz-colhead kviz-rl__val">{valueLabel}</span>
      </div>

      {groups.map((g) => {
        const sum = g.rows.reduce((a, r) => a + r.value, 0);
        const hid = 'kviz-rl-' + g.key;
        const caption = g.attention && !attnShown;
        if (g.attention) attnShown = true;
        return (
          <section key={g.key} className="kviz-rl__group" aria-labelledby={hid}>
            {caption && <p className="kviz-rl__attn">Needs attention now</p>}
            <div className="kviz-rl__grid kviz-rl__ghead">
              <GH id={hid} className="kviz-rl__gtitle">
                {g.glyph
                  ? <i className={'fa-solid fa-' + g.glyph} style={{ color: g.text }} aria-hidden="true" />
                  : <span className="kviz-rl__swatch" style={{ background: g.color }} aria-hidden="true" />}
                {g.label}
              </GH>
              <span className="kviz-rl__lane kviz-rl__lane--head" aria-hidden="true">
                {!g.attention && <span className="kviz-rl__span" style={{ left: X(g.from) + '%', width: (X(g.to) - X(g.from)) + '%', background: g.color }} />}
              </span>
              <span className="kviz-rl__gcount">{plural(g.rows.length, 'contract')}</span>
              <span className="kviz-rl__gsum">{format(sum)}{valueSuffix}</span>
            </div>
            {g.rows.length === 0 && <p className="kviz-rl__empty">No notice dates fall in this period. Nothing needs your decision here.</p>}
            <ul className="kviz-rl__list" aria-label={g.label}>
              {g.rows.map((r) => {
                const passed = r.band === 'passed', ended = r.band === 'ended';
                const from = Math.max(r.m, 0);
                const rel = relativeFrom(asOf, r.deadline);
                const href = getHref ? getHref(r) : undefined;
                const Tag = href ? 'a' : 'button';
                const when = ended ? `Contract ended ${fmtDate(r.endDate)}, still being paid` : `${passed ? 'Notice date passed' : 'Notice deadline'} ${fmtDate(r.deadline)}, ${rel}`;
                const extra = r.extra != null ? r.extra : extraFor ? extraFor(r) : null;
                const aria = `${r.title}, ${r.supplier}. ${when}. ${ended ? '' : `Contract ends ${fmtDate(r.endDate)}. `}${valueLabel} ${gbpFull(r.value)}.${r.autoRenew ? ' Auto-renews.' : ''}${r.usedEndDate ? ' No notice period stated, the end date is used.' : ''}`;
                const content = {
                  title: r.title, sub: r.supplier,
                  rows: [
                    { value: fmtDate(r.deadline), label: `${ended ? 'Contract ended' : passed ? 'Notice date passed' : 'Notice deadline'} (${rel})`, color: g.color, glyph: g.attention ? g.glyph : null, glyphColor: g.text },
                    ...(ended ? [] : [{ value: fmtDate(r.endDate), label: 'Contract ends' }]),
                    { value: r.autoRenew ? 'Yes' : 'No', label: 'Auto-renews' },
                    { value: format(r.value) + valueSuffix, label: valueLabel },
                  ],
                  note: r.usedEndDate ? 'No notice period stated. We used the end date.' : 'Select to open the contract.',
                };
                return (
                  <li key={r.id}>
                    <div className="kviz-row kviz-rl__row kviz-rl__grid" data-kviz-row {...tip.bindPointer(content)}>
                      <span className="kviz-rl__who">
                        <Tag className="kviz-row__link kviz-rl__name" aria-label={aria}
                          {...(href ? { href } : { type: 'button' })}
                          onClick={onOpen ? (ev) => { if (!href) onOpen(r, ev); } : undefined}
                          {...tip.bindFocus(content, '[data-kviz-row]')}>{r.title}</Tag>
                        <span className="kviz-rl__sub" aria-hidden="true">
                          <span className="kviz-rl__subtxt">{r.supplier}</span>
                          {r.autoRenew && <span className="kviz-rl__auto"><i className="fa-solid fa-rotate" /> Auto-renews</span>}
                        </span>
                      </span>
                      <span className="kviz-rl__lane" aria-hidden="true">
                        <span className="kviz-rl__gl" style={{ left: X(3) + '%' }} />
                        <span className="kviz-rl__gl" style={{ left: X(6) + '%' }} />
                        {!g.attention && <span className="kviz-rl__run" style={{ width: X(r.m) + '%', background: g.color }} />}
                        {!ended && (
                          <span className="kviz-rl__band" style={{ left: X(from) + '%', width: Math.max(0, X(r.e) - X(from)) + '%', '--c': g.color }}>
                            {passed && <Hatch color={g.color} period={6} />}
                          </span>
                        )}
                        {!ended && (r.e <= horizon
                          ? <span className="kviz-rl__end" style={{ left: X(r.e) + '%' }} />
                          : <i className="fa-solid fa-chevron-right kviz-rl__more" />)}
                        <span className="kviz-rl__dia" style={{ left: X(from) + '%', background: g.color }} />
                      </span>
                      <span className="kviz-rl__due" aria-hidden="true">
                        <span className="kviz-rl__date">{ended ? 'Ended ' : ''}{fmtDate(ended ? r.endDate : r.deadline)}</span>
                        <span className="kviz-rl__rel" style={g.attention ? { color: 'var(--viz-danger-text)' } : undefined}>
                          {g.attention && <i className={'fa-solid fa-' + g.glyph} />} {relativeFrom(asOf, ended ? r.endDate : r.deadline)}
                        </span>
                      </span>
                      <span className="kviz-rl__val" aria-hidden="true">
                        <span className="kviz-rl__num">{format(r.value)}</span>
                        <span className="kviz-rl__databar"><span style={{ width: (r.value / vMax) * 100 + '%' }} /></span>
                      </span>
                      {extra && <span className="kviz-row__extra kviz-rl__extra">{extra}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {placed.length === 0 && <p className="kviz-rl__empty">No contracts reach their notice deadline in the next {horizon} months.</p>}
      <ChartTip api={tip} />
    </div>
  );
}

/** Legend items for <ChartFigure legend={<Legend items={RADAR_LEGEND} />}> */
export const RADAR_LEGEND = [
  { key: 'run', label: 'Time left to act', shape: 'bar', color: 'var(--viz-b2)' },
  { key: 'dia', label: 'Notice deadline', shape: 'diamond', color: 'var(--viz-b2)' },
  { key: 'band', label: 'Notice period', shape: 'band', color: 'var(--viz-b2)' },
  { key: 'end', label: 'Contract ends', shape: 'tick', color: 'var(--viz-ink)' },
  { key: 'late', label: 'Deadline passed', shape: 'hatch', color: 'var(--viz-danger)' },
];
