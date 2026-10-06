// src/charts/BarList.jsx
// Ranked horizontal bars with direct value labels at the bar tip (no axis, no gridlines: the labels carry the values).
//  <BarList>          generic engine
//  <OpportunityList>  (f) ranked opportunities: type pill + indicative GBP bar + basis + confidence + review status + clause link
//  <CoverageBlock>    (d) spend-to-contract coverage: one 100% bar (matched vs no contract) + every unmatched supplier with a note
// Row anatomy everywhere: ONE primary link per row (stretched over the row), extras in the `extra` slot above it.
import { useMemo } from 'react';
import { gbp, gbpFull, pct, plural, fmtDate } from './format.js';
import { FLAGS, FLAG_CARD_ORDER, CONFIDENCE, BASIS_LABEL, REVIEW } from './flags.js';
import { StackedBar } from './StackedBar.jsx';
import { Hatch } from './Hatch.jsx';
import { useChartTip, ChartTip } from './Tip.jsx';
import { useArrowNav } from './hooks.js';

/** 32px glyph chip for a flag type (decorative: pair it with words somewhere in the row). */
export function FlagChip({ type }) {
  const f = FLAGS[type];
  return <span className="kviz-chip" style={{ '--c': f.color, color: f.text }} aria-hidden="true"><i className={'fa-solid fa-' + f.glyph} /></span>;
}

/**
 * Flag-type pill with glyph + words. Use instead of the DS Badge: its tone colours fail AA.
 * `label` replaces the default words (pass flagTypeLabel(flag) from src/lib/copy.js: "Above contract value (estimate)").
 * `muted` draws it neutral grey (a reviewed flag); the glyph and the words stay.
 */
export function FlagBadge({ type, label, muted = false }) {
  const f = FLAGS[type];
  return (
    <span className="kviz-pill" style={muted ? { '--c': 'var(--viz-ink-2)', color: 'var(--viz-ink-2)' } : { '--c': f.color, color: f.text }}>
      <i className={'fa-solid fa-' + f.glyph} aria-hidden="true" />{label || f.short}
    </span>
  );
}

/** Three dots + word (decorative: aria-hidden). Prefer ConfidenceBadge in new code. */
export function ConfidenceDots({ level }) {
  const c = CONFIDENCE[level] || CONFIDENCE.low;
  return (
    <span className="kviz-conf" aria-hidden="true">
      <span className="kviz-conf__dots">{[0, 1, 2].map((i) => <i key={i} className={i < c.dots ? 'is-on' : ''} />)}</span>
      {c.label}
    </span>
  );
}

/** Neutral confidence pill with glyph + words: 'High confidence' | 'Medium confidence' | 'Needs review'. level: 'high' | 'medium' | 'low' (a flag's confidence). */
export function ConfidenceBadge({ level }) {
  const c = CONFIDENCE[level] || CONFIDENCE.low;
  return <span className="kviz-pill kviz-pill--neutral" style={{ '--c': 'var(--viz-ink-2)', color: 'var(--viz-ink-2)' }}><i className={'fa-solid fa-' + c.glyph} aria-hidden="true" />{c.words}</span>;
}

/** Neutral review-status pill: 'Under review' | 'Explained' | 'No action'. label overrides the words. */
export function ReviewBadge({ status, label }) {
  const r = REVIEW[status] || REVIEW.to_investigate;
  return <span className="kviz-pill kviz-pill--neutral" style={{ '--c': 'var(--viz-ink-2)', color: 'var(--viz-ink-2)' }}><i className={'fa-solid fa-' + r.glyph} aria-hidden="true" />{label || r.label}</span>;
}

/**
 * Generic ranked bar list.
 * row: { id, rank?, label, sub?, subLines?, extra?: node, value, color, laneSub?, lead?: node, trail?: node, trailSub?, content, aria, href?, group?, muted? }
 *  The label is the row's primary link (stretched over the whole row); `extra` may hold more links ("View clause, page 23").
 *  group: an aggregate row ("5 other suppliers"): no bar, never sets the scale.   muted: reviewed row (quieter bar and name).
 *  subLines: clamp `sub` to N lines (default 1; 0 = no clamp).
 * leadWidth / trailWidth: column widths in px for the lead and trail slots.   valueWidth: px reserved for the value label at the bar tip.
 */
export function BarList({ rows, max, ariaLabel, getHref, onOpen, format = gbp, head, leadWidth = 36, trailWidth = 132, valueWidth = 80 }) {
  const tip = useChartTip();
  const nav = useArrowNav();
  const m = max || Math.max(1, ...rows.filter((r) => !r.group).map((r) => r.value));   // an aggregate row never sets the scale
  const hasLead = rows.some((r) => r.lead);
  const hasTrail = rows.some((r) => r.trail);
  const cols = ['28px', hasLead && leadWidth + 'px', 'minmax(220px, 1.5fr)', 'minmax(150px, 1fr)', hasTrail && trailWidth + 'px'].filter(Boolean).join(' ');
  return (
    <div className={'kviz-barlist' + (hasLead ? ' has-lead' : '')} {...nav} style={{ '--cols': cols, '--valw': valueWidth + 'px' }}>
      {head}
      <ol className="kviz-barlist__list" aria-label={ariaLabel}>
        {rows.map((r, i) => {
          const href = r.href || (getHref ? getHref(r) : undefined);
          const Tag = href ? 'a' : 'button';
          return (
            <li key={r.id}>
              <div className={'kviz-row kviz-barlist__row' + (r.muted ? ' is-muted' : '')} data-kviz-row {...tip.bindPointer(r.content)}>
                <span className="kviz-barlist__rank" aria-hidden="true">{r.rank != null ? r.rank : i + 1}</span>
                {hasLead && <span className="kviz-barlist__lead" aria-hidden="true">{r.lead}</span>}
                <span className="kviz-barlist__text">
                  <Tag className="kviz-row__link kviz-bl__name kviz-barlist__name" aria-label={r.aria}
                    {...(href ? { href } : { type: 'button' })}
                    onClick={onOpen ? (ev) => { if (!href) onOpen(r, ev); } : undefined}
                    {...tip.bindFocus(r.content, '[data-kviz-row]')}>{r.label}</Tag>
                  {r.sub && <span className="kviz-barlist__sub" style={{ '--lines': r.subLines === 0 ? 'none' : (r.subLines || 1) }} aria-hidden="true">{r.sub}</span>}
                  {r.extra && <span className="kviz-row__extra">{r.extra}</span>}
                </span>
                <span className="kviz-barlist__lane" aria-hidden="true">
                  <span className="kviz-barlist__barrow">
                    {!r.group && <span className="kviz-barlist__bar" style={{ '--r': r.value / m, background: r.color }} />}
                    <span className="kviz-barlist__val">{format(r.value)}</span>
                  </span>
                  {r.laneSub && <span className="kviz-barlist__lanesub">{r.laneSub}</span>}
                </span>
                {hasTrail && <span className="kviz-barlist__trail" aria-hidden="true">{r.trail}{r.trailSub && <span className="kviz-barlist__trailsub">{r.trailSub}</span>}</span>}
              </div>
            </li>
          );
        })}
      </ol>
      <ChartTip api={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
   (f) Opportunities list. Build the items with opportunityItems(estate) from adapters.js.
   item: { id, type: 'overCap'|'nearCap'|'renewal'|'uplift', title (contract), supplier, reason (the copy-deck sentence), value (indicativeGBP),
           basis?: 'per_year'|'one_off'|'projected', confidence: 'high'|'medium'|'low', actionBy?: ISO date, rank?: number,
           typeLabel?: string, status?: 'to_investigate'|'under_review'|'explained'|'not_an_issue', statusLabel?: string (shown as a pill),
           statusPill?: node (replaces the built-in status pill), clauseLabel?: 'View clause, page 23', clauseHref?: string,
           extra?: node (more links and notes after the clause link), href?: string }
   ------------------------------------------------------------------------------------------------ */
/**
 * Ranked opportunities. The list takes ALL ranked flags (open and reviewed) in the order you give it (the engine's rank): it never
 * re-sorts. Reviewed flags (status explained or not_an_issue) are drawn muted, with the words kept.
 *
 * format: exact pounds by default (gbpFull: "£3,350,000"); pass fmtGBPCompact for the Overview strip.
 * filter: a flag type key to show one type only (colours do not change).   limit: show the first N after filtering.
 * Bar lengths use one linear scale from 0 to the largest value in `items` (not the filtered subset), so filtering never rescales them.
 * getHref(row) -> '#/opportunities?flag=F-C-005-overCap' on the title (or onOpen(row, event) from a button).
 * Reasons wrap to two lines; the full text is in the tooltip, the accessible name and the flag drawer.
 */
export function OpportunityList({ items, filter = null, getHref, onOpen, limit, format = gbpFull, max }) {
  const rows = useMemo(() => {
    const list = items.filter((it) => !filter || it.type === filter);
    return (limit ? list.slice(0, limit) : list).map((it, i) => {
      const f = FLAGS[it.type];
      const basis = it.basis ? BASIS_LABEL[it.basis] : f.basis;
      const conf = CONFIDENCE[it.confidence] || CONFIDENCE.low;
      const review = REVIEW[it.status || 'to_investigate'] || REVIEW.to_investigate;
      const muted = review.reviewed;
      const rank = it.rank != null ? it.rank : i + 1;
      const typeLabel = it.typeLabel || f.short;
      const act = it.actionBy ? (it.type === 'uplift' ? 'Next review ' : 'Act by ') + fmtDate(it.actionBy) : null;
      const statusPill = it.statusPill || (it.statusLabel ? <ReviewBadge status={it.status} label={it.statusLabel} /> : null);
      const reason = String(it.reason || '').replace(/\.$/, '');
      return {
        id: it.id, rank, label: it.title, href: it.href, muted,
        sub: <><span className="kviz-barlist__supplier">{it.supplier}</span>{reason && <> · {it.reason}</>}</>, subLines: 2,
        extra: (it.clauseLabel || it.extra) && (
          <>
            {it.clauseLabel && (it.clauseHref
              ? <a className="kviz-textlink" href={it.clauseHref}><i className="fa-solid fa-file-contract" aria-hidden="true" /> {it.clauseLabel}</a>
              : <span className="kviz-barlist__sub2"><i className="fa-solid fa-file-contract" aria-hidden="true" /> {it.clauseLabel}</span>)}
            {it.extra}
          </>
        ),
        value: it.value, color: f.color, laneSub: basis,
        lead: <FlagBadge type={it.type} label={typeLabel} muted={muted} />,
        trail: (
          <>
            <ConfidenceBadge level={it.confidence} />
            {act && <span className="kviz-barlist__trailsub">{act}</span>}
            {statusPill}
          </>
        ),
        aria: `Rank ${rank}. ${it.title}, ${it.supplier}. ${typeLabel}. ${reason}. Indicative ${gbpFull(it.value)}, ${basis.toLowerCase()}. ${conf.words}.${act ? ' ' + act + '.' : ''}${it.statusLabel ? ' Review status: ' + it.statusLabel.toLowerCase() + '.' : ''}`,
        content: {
          title: it.title, sub: `${it.supplier} · ${it.reason}`,
          rows: [
            { value: gbpFull(it.value), label: 'Indicative value', color: f.color, glyph: f.glyph, glyphColor: f.text },
            { value: basis, label: 'Basis' },
            { value: typeLabel, label: 'Flag type' },
            { value: conf.words, label: '' },
            ...(it.statusLabel ? [{ value: it.statusLabel, label: 'Review status' }] : []),
          ],
          note: 'An opportunity to investigate, not a confirmed result',
        },
      };
    });
  }, [items, filter, limit, max]);
  const head = (
    <div className="kviz-barlist__head kviz-colhead" aria-hidden="true">
      <span>#</span><span>Type</span><span>Opportunity</span><span>Indicative value</span><span>Confidence and status</span>
    </div>
  );
  return <BarList rows={rows} head={head} getHref={getHref} onOpen={onOpen} format={format} leadWidth={172} trailWidth={176} valueWidth={96} max={Math.max(1, ...items.map((it) => it.value), max || 0)} ariaLabel="Opportunities ranked by indicative value" />;
}

/**
 * Filter chips for OpportunityList: "All flags 19", "Spend over cap 3", ... One row of toggle buttons (aria-pressed), flag glyph in
 * the text colour. Filtering never repaints survivors: the bars keep their flag colour.
 * counts: { all, overCap, nearCap, renewal, uplift }   value: a flag type key or null for all   onChange(typeKey | null)
 */
export function FlagFilterChips({ counts, value = null, onChange, label = 'Filter by flag type', allLabel = 'All flags' }) {
  return (
    <div className="kviz-filters" role="group" aria-label={label}>
      {[null, ...FLAG_CARD_ORDER].map((k) => (
        <button key={k || 'all'} type="button" className="kviz-chipbtn" aria-pressed={value === k} onClick={() => onChange && onChange(k)}>
          {k && <i className={'fa-solid fa-' + FLAGS[k].glyph} style={{ color: FLAGS[k].text }} aria-hidden="true" />}
          {k ? FLAGS[k].label : allLabel} <span className="kviz-count">{counts && counts[k || 'all'] != null ? counts[k || 'all'] : 0}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
   (d) Coverage: how much third-party spend matches a contract on the register.
   ------------------------------------------------------------------------------------------------ */
/**
 * Spend-to-contract coverage: one 100% bar (matched, awaiting review, no contract) and every supplier with no contract, ranked.
 *
 * matched, total   GBP linked to a contract and all third-party spend.
 * unmatched        GBP with no contract on the register. Pass the engine's noContractGBP (the stat, the bar and the share column use it).
 *                  Defaults to total - matched - pending.
 * pending          GBP of payments whose supplier match awaits your review (a third bar segment); 0 hides it.
 * suppliers        [{ id, name, spend, payments?, note?, href? }] (UNMATCHED only). `note` is the second line under the name
 *                  ("There is no contract to read, so there is no clause to link.").
 * topN             how many to list individually; default all of them (the rest collapse into one "N other suppliers" row).
 * getHref(row)     link to the payments (the supplier name is the row's primary link).   format: gbp by default, gbpFull for exact.
 * heading          the list heading (an h3 by default).
 */
export function CoverageBlock({ matched, total, unmatched, pending = 0, suppliers, topN, getHref, onOpen, unit = 'payment', format = gbp, heading = 'Largest suppliers with no contract on the register', headingAs: H = 'h3' }) {
  const noContract = unmatched != null ? unmatched : total - matched - pending;
  const sorted = useMemo(() => suppliers.slice().sort((a, b) => b.spend - a.spend), [suppliers]);
  const n = topN == null ? sorted.length : topN;
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const rows = top.map((s, i) => ({
    id: s.id, rank: i + 1, label: s.name, href: s.href,
    sub: [s.payments != null ? plural(s.payments, unit) + ' with no contract match.' : null, s.note].filter(Boolean).join(' ') || null, subLines: 0,
    value: s.spend, color: 'var(--viz-warning)',
    trail: <span className="kviz-barlist__share">{pct(s.spend / noContract, 1)}</span>,
    aria: `Rank ${i + 1}. ${s.name}. ${gbpFull(s.spend)} with no contract on the register, ${pct(s.spend / noContract, 1)} of spend with no contract.${s.payments != null ? ' ' + plural(s.payments, unit) + '.' : ''}${s.note ? ' ' + s.note : ''}`,
    content: { title: s.name, rows: [
      { value: gbpFull(s.spend), label: 'Spend with no contract', color: 'var(--viz-warning)', glyph: 'link-slash', glyphColor: 'var(--viz-warning-text)' },
      { value: pct(s.spend / noContract, 1), label: 'of spend with no contract' },
      ...(s.payments != null ? [{ value: s.payments.toLocaleString('en-GB'), label: s.payments === 1 ? unit : unit + 's' }] : []),
    ], note: s.note || 'Select to see the payments.' },
  }));
  if (rest.length) {
    const sum = rest.reduce((a, s) => a + s.spend, 0);
    rows.push({
      id: '__other', rank: '', label: plural(rest.length, 'other supplier'), sub: rest.length > 1 ? 'Each ' + format(rest[0].spend) + ' or less' : null,
      value: sum, color: 'var(--viz-ink-2)', group: true,
      trail: <span className="kviz-barlist__share">{pct(sum / noContract, 1)}</span>,
      aria: `${plural(rest.length, 'other supplier')}: ${gbpFull(sum)} with no contract on the register.`,
      content: { title: plural(rest.length, 'other supplier'), rows: [{ value: gbpFull(sum), label: 'Spend with no contract', color: 'var(--viz-ink-2)' }] },
    });
  }
  const segments = [
    { key: 'matched', label: 'Matched to a contract', value: matched, color: 'var(--viz-accent)', on: 'var(--viz-on-accent)', glyph: 'link' },
    ...(pending > 0 ? [{ key: 'pending', label: 'Awaiting your review', value: pending, color: 'var(--viz-ink-2)', on: 'var(--viz-surface)', glyph: 'hourglass-half' }] : []),
    { key: 'unmatched', label: 'No contract on the register', value: noContract, color: 'var(--viz-warning)', pattern: 'hatch', hatchPeriod: 8, glyph: 'link-slash' },
  ];
  return (
    <div className="kviz-cov">
      <div className="kviz-cov__stats">
        <div>
          <span className="kviz-cov__key"><span className="kviz-key kviz-key--bar" style={{ '--c': 'var(--viz-accent)' }} aria-hidden="true" />Matched to a contract</span>
          <span className="kviz-cov__num">{format(matched)} <span className="kviz-cov__pct">{pct(matched / total)}</span></span>
        </div>
        {pending > 0 && (
          <div>
            <span className="kviz-cov__key"><span className="kviz-key kviz-key--bar" style={{ '--c': 'var(--viz-ink-2)' }} aria-hidden="true" />Awaiting your review</span>
            <span className="kviz-cov__num">{format(pending)} <span className="kviz-cov__pct">{pct(pending / total, 1)}</span></span>
          </div>
        )}
        <div className="is-right">
          <span className="kviz-cov__key"><span className="kviz-key kviz-key--hatch" aria-hidden="true"><Hatch color="var(--viz-warning)" period={5} /></span>No contract on the register</span>
          <span className="kviz-cov__num">{format(noContract)} <span className="kviz-cov__pct">{pct(noContract / total)}</span></span>
        </div>
      </div>
      <StackedBar segments={segments} total={total} height={28} unit="payment" format={format}
        ariaLabel={`Of ${gbpFull(total)} third-party spend, ${gbpFull(matched)} is matched to a contract${pending > 0 ? `, ${gbpFull(pending)} awaits your review` : ''} and ${gbpFull(noContract)} has no contract on the register`} />
      <H className="kviz-cov__h">{heading}</H>
      <BarList rows={rows} getHref={getHref} onOpen={onOpen} format={format} ariaLabel="Suppliers with no contract on the register, ranked by spend" valueWidth={96}
        head={<div className="kviz-barlist__head kviz-colhead" aria-hidden="true"><span>#</span><span>Supplier</span><span>Spend with no contract</span><span>Share of the total</span></div>} />
    </div>
  );
}
