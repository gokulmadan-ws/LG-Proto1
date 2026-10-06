// src/charts/Headline.jsx
// (a) HEADLINE: the hero sentence (a real <h1>) + a 100% bar by flag type + four basis cards (+ CoverageMeter for the Overview).
import { useId } from 'react';
import { gbp, gbpFull, pct, plural } from './format.js';
import { FLAGS, FLAG_ORDER, FLAG_CARD_ORDER } from './flags.js';
import { StackedBar } from './StackedBar.jsx';
import { Hatch } from './Hatch.jsx';
import { useChartTip, ChartTip } from './Tip.jsx';

const CARD_ORDER = FLAG_CARD_ORDER;       // reading order of the cards (requirements R17)

/**
 * The hero sentence WITHOUT a heading element: "£6.1m across 15 contracts flagged as opportunities to investigate".
 * The figure is focusable and carries the exact-value tooltip (acceptance criterion R16: hover or focus shows £6,145,238) and an
 * `aria-description` carrying the exact value (not a hidden child: that would add "Exact value £6,145,238" to the text of the h1,
 * which must read exactly the sentence). Put it inside your own h1: <PageHeader title={<HeadlineSentence total={...} contractCount={...} format={fmtGBPCompact} />} />.
 * format: pass fmtGBPCompact.   Size: the figure is 56px (44px under 560px wide); override `.kviz-hero` in your own css if the page title is smaller.
 */
export function HeadlineSentence({ total, contractCount, format = gbp }) {
  const tip = useChartTip();
  const exact = { title: 'Exact value', rows: [{ value: gbpFull(total), label: 'Indicative total' }], note: 'Rounded to one decimal place in the headline.' };
  return (
    <span className="kviz-headline__line">
      <span className="kviz-hero" tabIndex={0} aria-description={'Exact value ' + gbpFull(total)} {...tip.bind(exact)}>{format(total)}</span>
      {' '}
      <span className="kviz-headline__lede">
        across <strong>{plural(contractCount, 'contract')}</strong> flagged as {contractCount === 1 ? 'an opportunity' : 'opportunities'} to investigate
      </span>
      <ChartTip api={tip} />
    </span>
  );
}

/**
 * The 100% bar by flag type and the four basis cards, without the sentence (use under a PageHeader that carries a HeadlineSentence).
 * byType: { overCap: { value, count }, uplift: {...}, nearCap: {...}, renewal: {...} }   (counted flags only; headlineProps(estate) builds it)
 * getHref(type) -> '#/opportunities?type=overCap' makes the cards links; onSelect(type) makes them buttons.   footer: node under the cards.
 */
export function HeadlineBreakdown({ total, byType, format = gbp, getHref, onSelect, footer }) {
  const segments = FLAG_ORDER.filter((k) => byType[k] && byType[k].value > 0).map((k) => ({
    key: k, label: FLAGS[k].label, glyph: FLAGS[k].glyph, color: FLAGS[k].color, on: FLAGS[k].on,
    value: byType[k].value, count: byType[k].count,
  }));
  return (
    <div className="kviz-headline">
      <StackedBar segments={segments} total={total} height={24} focusable={false} format={format}
        ariaLabel={`Breakdown of ${gbpFull(total)} by flag type`} />
      <ul className="kviz-cards" aria-label="Breakdown by flag type">
        {CARD_ORDER.map((k) => {
          const f = FLAGS[k], b = byType[k] || { value: 0, count: 0 };
          const href = getHref ? getHref(k) : undefined;
          const Tag = href ? 'a' : onSelect ? 'button' : 'div';
          const label = `${f.label} ${format(b.value)}, ${plural(b.count, 'contract')}, ${f.basis.charAt(0).toLowerCase() + f.basis.slice(1)}`;
          return (
            <li key={k}>
              <Tag className={'kviz-card' + (Tag === 'div' ? '' : ' is-action')} aria-label={label}
                {...(href ? { href } : onSelect ? { type: 'button', onClick: () => onSelect(k) } : {})}>
                <span className="kviz-card__head" aria-hidden="true">
                  <span className="kviz-chip" style={{ '--c': f.color, color: f.text }}><i className={'fa-solid fa-' + f.glyph} /></span>
                  <span className="kviz-card__label">{f.label}</span>
                </span>
                <span className="kviz-card__value" aria-hidden="true">{format(b.value)}</span>
                <span className="kviz-card__meta" aria-hidden="true">{plural(b.count, 'contract')}</span>
                <span className="kviz-card__basis" aria-hidden="true">{f.basis}</span>
              </Tag>
            </li>
          );
        })}
      </ul>
      {footer}
    </div>
  );
}

/**
 * Headline: the hero sentence (a real h1 by default) + note + caveat + HeadlineBreakdown. Use this when the chart owns the h1; when the
 * PageHeader owns it, use HeadlineSentence in the title and HeadlineBreakdown below.
 * format: pass fmtGBPCompact (acceptance test R17: '£6.1m', '£4.2m').   note / caveat: the two small lines under the sentence.
 * footer: node under the cards (the exact sum line, the triage note).   as: heading element of the sentence.
 */
export function HeadlineTile({ total, contractCount, byType, format = gbp, note, caveat, getHref, onSelect, footer, as: H = 'h1' }) {
  const uid = useId();
  return (
    <section className="kviz-headline" aria-labelledby={uid + '-h'}>
      <H id={uid + '-h'} className="kviz-headline__title"><HeadlineSentence total={total} contractCount={contractCount} format={format} /></H>
      {note && <p className="kviz-note">{note}</p>}
      {caveat && <p className="kviz-note">{caveat}</p>}
      <HeadlineBreakdown total={total} byType={byType} format={format} getHref={getHref} onSelect={onSelect} footer={footer} />
    </section>
  );
}

/** (d, compact) Coverage meter for the Overview: ONE ratio, so a meter, not a pie.
 *  Solid blue = linked to a contract; hatched amber = not linked. Words carry the number, colour is secondary. */
export function CoverageMeter({ matched, total, format = gbp, href, linkLabel = 'See spend with no contract', onOpen }) {
  const ratio = total > 0 ? matched / total : 0;
  const Tag = href ? 'a' : 'button';
  return (
    <div className="kviz-meter">
      <p className="kviz-meter__label"><strong>{pct(ratio)}</strong> of payments are linked to a contract on the register</p>
      <div className="kviz-meter__track" role="meter" aria-label="Payments linked to a contract on the register"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}
        aria-valuetext={`${pct(ratio)}: ${gbpFull(matched)} of ${gbpFull(total)}`}>
        <span className="kviz-meter__fill" style={{ flexGrow: matched }} />
        <span className="kviz-meter__rest" style={{ flexGrow: Math.max(0, total - matched) }}><Hatch color="var(--viz-warning)" period={6} /></span>
      </div>
      <p className="kviz-meter__meta">
        {format(matched)} of {format(total)}
        <span className="kviz-dot-sep" aria-hidden="true">·</span>
        <Tag className="kviz-textlink" {...(href ? { href } : { type: 'button', onClick: onOpen })}>{linkLabel}</Tag>
      </p>
    </div>
  );
}
