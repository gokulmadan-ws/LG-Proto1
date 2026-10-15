// src/charts/RadarStrip.jsx
// (b, compact) Overview version of the radar: three band cells whose widths follow the time scale (25% / 25% / 50%),
// a strip of deadline diamonds underneath, and a "Needs attention now" pill. One glance = "what is coming and how big".
// Each diamond is a button (one per contract, in date order): hover, keyboard focus or a first tap shows a tooltip with the
// contract, supplier, notice date and value; a click or Enter calls onOpen(row) (the Overview opens that renewal in the drawer).
import { useRef } from 'react';
import { AS_OF, monthsBetween, gbp, plural, fmtDate } from './format.js';
import { clamp } from './scales.js';
import { BANDS } from './flags.js';
import { useChartTip, ChartTip } from './Tip.jsx';
import { noticeByText } from '../lib/copy.js';

const ROW_GAP = 44;                 // vertical step between the three diamond rows: every diamond keeps a 44 x 44 px target
const OPEN_NOTE = 'Opens the opportunity in the side drawer.';

/** Overview version of the radar. rows: same shape as RadarLanes (radarRows(estate)).
 *  getHref(bandKey) -> link for each band cell (e.g. '#/renewals'); attentionHref links the "Needs attention now" pill.
 *  caption: small muted line above the bands that says what the values are ("Contract value, a year": decision 7).
 *  format: pass fmtGBPCompact where an acceptance test fixes the string ('£6.9m').
 *  onOpen(row): what a diamond does when clicked or activated with Enter (D9: open that renewal in the drawer). */
export function RadarStrip({ rows, asOf = AS_OF, horizon = 12, getHref, attentionHref, valueSuffix = ' a year', format = gbp, caption, onOpen }) {
  const tip = useChartTip();
  const touch = useRef({});          // { first: id } on the first tap of a diamond, { shown: id } once its tooltip is up; the next tap opens
  const timed = BANDS.filter((b) => !b.attention);
  const stats = timed.map((b) => {
    const mine = rows.filter((r) => r.band === b.key);
    return { ...b, n: mine.length, sum: mine.reduce((a, r) => a + r.value, 0) };
  });
  const attn = rows.filter((r) => r.band === 'passed' || r.band === 'ended');
  const attnSum = attn.reduce((a, r) => a + r.value, 0);
  const X = (months) => clamp(months / horizon, 0, 1) * 100;
  const dots = rows.filter((r) => r.band === 'm3' || r.band === 'm6' || r.band === 'm12')
    .map((r) => ({ ...r, m: monthsBetween(asOf, r.deadline) })).sort((a, z) => a.m - z.m || a.id.localeCompare(z.id));
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
                <span className="kviz-rs__bandval" aria-hidden="true">{format(s.sum)}{valueSuffix.startsWith(' ') ? ' ' : ''}<span>{valueSuffix.trim()}</span></span>
                <span className="kviz-rs__bandn" aria-hidden="true">{plural(s.n, 'contract')}</span>
              </Tag>
            </li>
          );
        })}
      </ul>
      <div className="kviz-rs__track" style={{ height: ROW_GAP * 3 }}>
        <span className="kviz-rl__gl" aria-hidden="true" style={{ left: X(3) + '%', top: 0, bottom: 0 }} />
        <span className="kviz-rl__gl" aria-hidden="true" style={{ left: X(6) + '%', top: 0, bottom: 0 }} />
        {dots.map((r, i) => {
          const band = BANDS.find((b) => b.key === r.band);
          const notice = noticeByText(r.deadline, asOf);
          const value = `${format(r.value)}${valueSuffix} · ends ${fmtDate(r.endDate)}`;
          const content = {
            title: r.title, sub: r.supplier,
            lines: [{ text: notice, tone: r.band === 'm3' ? 'warning' : null }, { text: value }],
            note: onOpen ? OPEN_NOTE : null,
          };
          const label = `${r.title}, ${r.supplier}. ${notice}. ${format(r.value)}${valueSuffix}, ends ${fmtDate(r.endDate)}.${onOpen ? ' ' + OPEN_NOTE : ''}`;
          const binds = tip.bind(content);
          return (
            <button key={r.id} type="button" className="kviz-rs__dia" data-contract={r.id} aria-label={label}
              style={{ left: X(r.m) + '%', top: (i % 3) * ROW_GAP }}
              {...binds}
              onPointerDown={(e) => { touch.current = e.pointerType !== 'touch' ? {} : touch.current.shown === r.id ? {} : { first: r.id }; }}
              onClick={() => {
                if (touch.current.first === r.id) { touch.current = { shown: r.id }; return; }   // first tap: the tooltip stays up
                touch.current = {};
                if (onOpen) { tip.hide(); onOpen(r); }
              }}>
              <span className="kviz-rs__diamark" aria-hidden="true" style={{ background: band.color }} />
            </button>
          );
        })}
      </div>
      <div className="kviz-rs__axis" aria-hidden="true">
        <span style={{ left: 0 }}>Now</span><span style={{ left: '25%' }}>3 months</span><span style={{ left: '50%' }}>6 months</span><span style={{ right: 0 }}>12 months</span>
      </div>
      <ChartTip api={tip} />
    </div>
  );
}
