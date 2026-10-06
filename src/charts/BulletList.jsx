// src/charts/BulletList.jsx
// (c) CAP VS ACTUAL SPEND: ranked small-multiple bullet bars on ONE shared axis (% of each contract's cap).
//  track 0-100% = the cap; amber zone 85-100% = "close"; tick at 100% = the cap;
//  fill = spend to date, coloured by state (blue / amber / red); overflow beyond 100% = 45-degree hatch, never colour alone.
//  Bars beyond axisMax are clipped with a chevron and the true figure stays in the numbers column.
//  The numbers column carries spend, the cap and the over-by amount; the name block carries the cap basis and source.
import { useMemo } from 'react';
import { gbp, gbpFull, pct, plural } from './format.js';
import { STATES, CLOSE_AT, stateFor } from './flags.js';
import { useChartTip, ChartTip } from './Tip.jsx';
import { useArrowNav } from './hooks.js';
import { Hatch } from './Hatch.jsx';

const BASIS = { total_term: 'Whole term', annual: 'Per contract year' };
const SOURCE = { maximum_stated: 'Stated maximum', contract_value: 'Contract value (estimate)' };

/** Pill for a cap state: glyph + words, state colour. `state` is the engine's 'ok' | 'near' | 'over' (capState 'above_estimate' counts as over).
 *  `label` overrides the words (use capStateLabel(cap) from src/lib/copy.js: "Above contract value (estimate)"). */
export function CapStatePill({ state, label, wrap = false }) {
  const s = stateFor(1, CLOSE_AT, state);
  return (
    <span className={'kviz-pill' + (wrap ? ' kviz-pill--wrap' : '')} style={{ '--c': s.tint || s.color, color: s.text }}>
      <i className={'fa-solid fa-' + s.glyph} aria-hidden="true" />{label || s.label}
    </span>
  );
}

/**
 * Ranked bullet list.
 *
 * item: { id, title, supplier, cap, spend, state?: 'ok'|'near'|'over' (engine), partial?: boolean ("At least"),
 *   basis?: 'total_term'|'annual', source?: 'maximum_stated'|'contract_value', excess?: number (engine excessGBP: over-by),
 *   stateLabel?: string (replaces "Over cap": "Above contract value (estimate)"), basisLabel?, sourceLabel?, extra?: node, href? }
 * Pass the engine's cap status: cap = capGBP, spend = spendAgainstCap (the worst contract year when the cap is annual); capItems(estate) does it.
 *
 * format: gbp (compact) by default. The cap screen passes gbpFull so the over-by reads "£3,350,000 over" (requirement R37).
 * limit: show the top N rows (the list is sorted by share of cap, then spend).   extra: node under the name (ClauseLink, notes).
 * getHref(row) -> link on the title, or onOpen(row, event) from a button.   Titles wrap to two lines.
 */
export function BulletList({ items, axisMax = 1.25, closeAt = CLOSE_AT, getHref, onOpen, limit, format = gbp }) {
  const tip = useChartTip();
  const nav = useArrowNav();
  const rows = useMemo(() => {
    const all = items.map((it) => { const ratio = it.spend / it.cap; return { ...it, ratio, st: stateFor(ratio, closeAt, it.state) }; })
      .sort((a, b) => b.ratio - a.ratio || b.spend - a.spend);
    return limit ? all.slice(0, limit) : all;
  }, [items, limit, closeAt]);
  const P = (ratio) => (Math.min(ratio, axisMax) / axisMax) * 100;      // percent across the lane
  const ticks = [{ r: 0, t: '0%' }, { r: 0.5, t: '50%' }, { r: closeAt, t: Math.round(closeAt * 100) + '%' }, { r: 1, t: 'Cap' }, { r: axisMax, t: Math.round(axisMax * 100) + '%' }];

  return (
    <div className="kviz-bl" {...nav}>
      <div className="kviz-bl__grid kviz-bl__axis" aria-hidden="true">
        <span className="kviz-colhead">Contract</span>
        <span className="kviz-bl__lane kviz-bl__lane--axis">
          {ticks.map((t) => (
            <span key={t.t + t.r} className={'kviz-bl__tickl' + (t.r === 0 ? ' is-first' : t.r === axisMax ? ' is-last' : '')} style={{ left: P(t.r) + '%' }}>{t.t}</span>
          ))}
        </span>
        <span className="kviz-colhead kviz-bl__num">Spend to date</span>
        <span className="kviz-colhead kviz-bl__stat">Status</span>
      </div>
      <ul className="kviz-bl__list" aria-label="Contracts ranked by share of cap used">
        {rows.map((r) => {
          const s = r.st;
          const href = getHref ? getHref(r) : undefined;
          const Tag = href ? 'a' : 'button';
          const over = r.ratio > 1;
          const gap = r.spend - r.cap;
          const overBy = over ? (r.excess != null && r.excess > 0 ? r.excess : gap) : 0;
          const atLeast = r.partial ? 'At least ' : '';
          const estimate = r.source === 'contract_value';
          const capWord = r.basis === 'annual' ? 'annual cap' : estimate ? 'contract value' : 'cap';
          const stateLabel = r.stateLabel || s.label;
          const meta = [r.basisLabel || BASIS[r.basis], r.sourceLabel || SOURCE[r.source]].filter(Boolean).join(' · ');
          const aria = `${r.title}, ${r.supplier}. ${atLeast}${gbpFull(r.spend)} spent against a ${capWord} of ${gbpFull(r.cap)}: ${pct(r.ratio, 1)}. ${stateLabel}.`
            + (over ? ` ${gbpFull(overBy)} over.` : ` ${gbpFull(-gap)} of headroom.`) + (meta ? ` ${meta}.` : '');
          const content = {
            title: r.title, sub: r.supplier + (meta ? ' · ' + meta : ''),
            rows: [
              { value: atLeast + format(r.spend), label: 'Spend to date', color: s.color },
              { value: format(r.cap), label: capWord === 'cap' ? 'Contract cap' : capWord === 'annual cap' ? 'Annual cap' : 'Contract value' },
              { value: pct(r.ratio, 1), label: 'of ' + capWord + ' used', glyph: s.glyph, glyphColor: s.key === 'within' ? 'var(--viz-ink-2)' : s.text },
              { value: format(over ? overBy : Math.abs(gap)), label: over ? 'Over' : 'Headroom left' },
            ],
            note: r.partial ? 'Spend files start after this contract began, so this is a lower bound.' : 'Select to open the contract and its cap clause.',
          };
          return (
            <li key={r.id}>
              <div className="kviz-row kviz-bl__row kviz-bl__grid" data-kviz-row {...tip.bindPointer(content)}>
                <span className="kviz-bl__who">
                  <Tag className="kviz-row__link kviz-bl__name" aria-label={aria}
                    {...(href ? { href } : { type: 'button' })}
                    onClick={onOpen ? (ev) => { if (!href) onOpen(r, ev); } : undefined}
                    {...tip.bindFocus(content, '[data-kviz-row]')}>{r.title}</Tag>
                  <span className="kviz-bl__sub" aria-hidden="true">{r.supplier}</span>
                  {meta && <span className="kviz-bl__meta" aria-hidden="true">{meta}</span>}
                  {r.extra && <span className="kviz-row__extra">{r.extra}</span>}
                </span>
                <span className="kviz-bl__lane" aria-hidden="true">
                  <span className="kviz-bl__track" style={{ width: P(1) + '%' }}>
                    <span className="kviz-bl__zone" style={{ left: closeAt * 100 + '%' }} />
                  </span>
                  <span className={'kviz-bl__fill' + (over ? ' has-over' : '')} style={{ width: P(Math.min(r.ratio, 1)) + '%', background: s.color }} />
                  {over && (
                    <span className="kviz-bl__over" style={{ left: P(1) + '%', width: (P(r.ratio) - P(1)) + '%' }}>
                      <Hatch color="var(--viz-danger)" period={6} />
                    </span>
                  )}
                  <span className="kviz-bl__mark kviz-bl__mark--close" style={{ left: P(closeAt) + '%' }} />
                  <span className="kviz-bl__mark kviz-bl__mark--cap" style={{ left: P(1) + '%' }} />
                  {r.ratio > axisMax && <i className="fa-solid fa-angles-right kviz-bl__clip" />}
                </span>
                <span className="kviz-bl__num" aria-hidden="true">
                  <span className="kviz-bl__spend">{atLeast && <small>At least </small>}{format(r.spend)}</span>
                  <span className="kviz-bl__of">of {format(r.cap)} {capWord}</span>
                  {over && <span className="kviz-bl__over-by">{format(overBy)} over</span>}
                </span>
                <span className="kviz-bl__stat" aria-hidden="true">
                  <CapStatePill state={r.state || s.key} label={stateLabel} wrap />
                  <span className="kviz-bl__pct">{pct(r.ratio, 1)} of {capWord}</span>
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

/** Summary counts for a header line: '3 over the cap, 3 close to it, 12 within it' */
export function capSummary(items, closeAt = CLOSE_AT) {
  const c = { over: 0, close: 0, within: 0 };
  items.forEach((it) => { c[stateFor(it.spend / it.cap, closeAt, it.state).key] += 1; });
  return c;
}

/**
 * The "Show table" twin for <ChartFigure table={capTable(items)}>: every number in the chart plus the cap basis, the cap
 * source and the over-by amount, which are the columns requirement R37 asks for. Same sort order as BulletList.
 */
export function capTable(items, { closeAt = CLOSE_AT, format = gbpFull } = {}) {
  const rows = items.map((it) => ({ ...it, ratio: it.spend / it.cap })).sort((a, b) => b.ratio - a.ratio || b.spend - a.spend).map((r) => {
    const st = stateFor(r.ratio, closeAt, r.state);
    const over = r.ratio > 1;
    return {
      id: r.id, title: r.title, supplier: r.supplier,
      basis: r.basisLabel || BASIS[r.basis] || '', source: r.sourceLabel || SOURCE[r.source] || '',
      spend: (r.partial ? 'At least ' : '') + format(r.spend), cap: format(r.cap), share: pct(r.ratio, 1),
      over: over ? format(r.excess != null && r.excess > 0 ? r.excess : r.spend - r.cap) : 'None', state: r.stateLabel || st.label,
    };
  });
  return {
    columns: [
      { key: 'title', label: 'Contract' }, { key: 'supplier', label: 'Supplier' },
      { key: 'basis', label: 'Cap basis' }, { key: 'source', label: 'Cap source' },
      { key: 'spend', label: 'Spend to date', align: 'right' }, { key: 'cap', label: 'Cap', align: 'right' },
      { key: 'share', label: 'Share of cap', align: 'right' }, { key: 'over', label: 'Over by', align: 'right' },
      { key: 'state', label: 'Status' },
    ],
    rows,
  };
}

export const BULLET_LEGEND = [
  { key: 'within', label: 'Within cap', shape: 'bar', color: STATES.within.color },
  { key: 'close', label: 'Close to cap (85% or more)', shape: 'bar', color: STATES.close.color },
  { key: 'over', label: 'Over cap', shape: 'bar', color: STATES.over.color },
  { key: 'hatch', label: 'Spend beyond the cap', shape: 'hatch', color: STATES.over.color },
  { key: 'tick', label: 'Cap', shape: 'tick', color: 'var(--viz-ink)' },
];
export { plural };
