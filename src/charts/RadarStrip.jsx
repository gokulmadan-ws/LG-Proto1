// src/charts/RadarStrip.jsx
// (b, compact) Overview version of the radar: three band cells whose widths follow the time scale (25% / 25% / 50%),
// a strip of deadline diamonds underneath, and a "Needs attention now" pill. One glance = "what is coming and how big".
import { AS_OF, monthsBetween, gbp, plural } from './format.js';
import { clamp } from './scales.js';
import { BANDS } from './flags.js';

/** Overview version of the radar. rows: same shape as RadarLanes (radarRows(estate)).
 *  getHref(bandKey) -> link for each band cell (e.g. '#/renewals'); attentionHref links the "Needs attention now" pill.
 *  caption: small muted line above the bands that says what the values are ("Contract value, a year": decision 7).
 *  format: pass fmtGBPCompact where an acceptance test fixes the string ('£6.9m'). */
export function RadarStrip({ rows, asOf = AS_OF, horizon = 12, getHref, attentionHref, valueSuffix = ' a year', format = gbp, caption }) {
  const timed = BANDS.filter((b) => !b.attention);
  const stats = timed.map((b) => {
    const mine = rows.filter((r) => r.band === b.key);
    return { ...b, n: mine.length, sum: mine.reduce((a, r) => a + r.value, 0) };
  });
  const attn = rows.filter((r) => r.band === 'passed' || r.band === 'ended');
  const attnSum = attn.reduce((a, r) => a + r.value, 0);
  const X = (months) => clamp(months / horizon, 0, 1) * 100;
  const dots = rows.filter((r) => r.band === 'm3' || r.band === 'm6' || r.band === 'm12')
    .map((r) => ({ ...r, m: monthsBetween(asOf, r.deadline) })).sort((a, z) => a.m - z.m);
  const AttnTag = attentionHref ? 'a' : 'span';
  return (
    <div className="kviz-rs">
      <div className="kviz-rs__top">
        <AttnTag className="kviz-rs__attn" {...(attentionHref ? { href: attentionHref } : {})}
          aria-label={`Needs attention now: ${plural(attn.length, 'contract')}, ${format(attnSum)}${valueSuffix}`}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          Needs attention now <b>{attn.length}</b>
        </AttnTag>
        {caption && <span className="kviz-rs__caption">{caption}</span>}
      </div>
      <ul className="kviz-rs__bands">
        {stats.map((s) => {
          const href = getHref ? getHref(s.key) : undefined;
          const Tag = href ? 'a' : 'div';
          return (
            <li key={s.key} style={{ flexBasis: (s.to - s.from) / horizon * 100 + '%' }}>
              <Tag className="kviz-rs__band" {...(href ? { href } : {})} aria-label={`${s.label}: ${plural(s.n, 'contract')}, ${format(s.sum)}${valueSuffix}`}>
                <span className="kviz-rs__bandhead" aria-hidden="true"><span className="kviz-rl__swatch" style={{ background: s.color }} />{s.label}</span>
                <span className="kviz-rs__bandval" aria-hidden="true">{format(s.sum)}<span>{valueSuffix}</span></span>
                <span className="kviz-rs__bandn" aria-hidden="true">{plural(s.n, 'contract')}</span>
              </Tag>
            </li>
          );
        })}
      </ul>
      <div className="kviz-rs__track" aria-hidden="true">
        <span className="kviz-rl__gl" style={{ left: X(3) + '%', top: 0, bottom: 0 }} />
        <span className="kviz-rl__gl" style={{ left: X(6) + '%', top: 0, bottom: 0 }} />
        {dots.map((r, i) => (
          <span key={r.id} className="kviz-rs__dia" style={{ left: X(r.m) + '%', top: 8 + (i % 3) * 14, background: BANDS.find((b) => b.key === r.band).color }} />
        ))}
      </div>
      <div className="kviz-rs__axis" aria-hidden="true">
        <span style={{ left: 0 }}>Now</span><span style={{ left: '25%' }}>3 months</span><span style={{ left: '50%' }}>6 months</span><span style={{ right: 0 }}>12 months</span>
      </div>
    </div>
  );
}
