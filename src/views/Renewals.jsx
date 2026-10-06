// V1: Renewal radar (#/renewals). Which contracts have a notice date coming up, and which have already slipped.
//
//   default export: <Renewals />      rendered inside <main id="shell-main"> by App.jsx, no props.
//   named export:   <RenewalRadar estate={...} />   the same page drawn from any estate object (the empty-band fixture passes one with a band emptied)
//   Layout: PageHeader (+ MethodLink), the "Needs attention now" group first (warning glyph and the R34 sentence per contract),
//           then RadarLanes for Next 3 months, 3 to 6 months and 6 to 12 months with the computed boundary dates, then the footnote
//           that links to #/contracts for the contracts whose notice date is more than 12 months away.
//   Links out:   #/contracts/<id> (the row title), #/source/<id>/<extraction>?from=renewals (View clause, page N), #/contracts (footnote),
//                #/method?s=radar.
//
// Numbers and sentences come from the engine output (estate.radar, estate.derived) and src/lib/copy.js (needsAttentionText, actionLine,
// noticeShortText, noticeDeadlineNote, relativeText, radarFootnote). The strings the copy deck does not hold live in TEXT below, in
// the deck's voice: the two panel titles, the attention description, the boundary sentence and the small labels.
import { useId, useState } from 'react';
import { useEstate, evidenceForField } from '../lib/estate.js';
import { hrefFor } from '../lib/router.js';
import {
  COPY, actionLine, bandLabel, fmtDate, fmtGBP, needsAttentionText, noticeDeadlineNote, noticeShortText, radarFootnote, relativeText,
} from '../lib/copy.js';
import { PageHeader, MethodLink, ClauseLink, ConfidencePill } from '../components/index.js';
import { Panel, Pill } from '../ui/index.js';
import { ChartTable, Legend, RADAR_LEGEND, RadarLanes, gbpFull, radarRows } from '../charts/index.js';
import './Renewals.css';

const TEXT = {
  attentionTitle: 'Needs attention now',
  attentionDesc: 'The notice date has passed, or the contract has ended and you are still paying.',
  attentionNone: 'No notice dates have passed and no contract is being paid after it ended.',
  lanesTitle: 'Notice dates in the next 12 months',
  bands: (b) => `Next 3 months runs to ${fmtDate(b.m3)}, 3 to 6 months to ${fmtDate(b.m6)}, and 6 to 12 months to ${fmtDate(b.m12)}.`,
  annualValue: 'Annual value',
  aYear: 'a year',
  endsOn: (ended) => (ended ? 'Ended' : 'Contract ends'),
  noticePeriod: 'Notice period',
  noticeDeadline: 'Notice deadline',
  paidSince: 'Paid since it ended',
  confidence: 'Confidence',
  autoRenews: 'Auto-renews',
  allContracts: 'See all contracts',
  legendLabel: 'Radar legend',
  showTable: 'Show table',
  showChart: 'Show chart',
};

const TIMED = ['m3', 'm6', 'm12'];
const isAuto = (c) => !!(c.autoRenewal && c.autoRenewal.enabled);

/* ------------------------------------------------------------------ needs attention now */

function Fact({ label, children }) {
  return <div className="rn-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}

function AttentionRow({ item, estate }) {
  const c = estate.contractsById[item.contractId];
  const d = estate.derived[c.id];
  const ev = evidenceForField(c.id, 'noticePeriod');
  const ended = item.band === 'ended';
  return (
    <li className="rn-attn__row">
      <span className="rn-attn__glyph" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></span>
      <div className="rn-attn__who">
        <a className="rn-attn__title" href={hrefFor('contracts', { seg: [c.id] })}>{c.title}</a>
        <p className="rn-attn__supplier">
          <span>{c.supplierName}</span>
          {isAuto(c) && <Pill tone="neutral" icon="rotate" size="sm">{TEXT.autoRenews}</Pill>}
        </p>
      </div>
      <p className="rn-attn__value"><strong>{fmtGBP(item.annualValueGBP)}</strong><span>{TEXT.aYear}</span></p>
      <div className="rn-attn__what">
        <p className="rn-attn__msg">{needsAttentionText(c, d)}</p>
        <dl className="rn-facts">
          <Fact label={TEXT.endsOn(ended)}>{fmtDate(item.endDate)}{ended && <span className="rn-fact__rel"> ({relativeText(item.endDate)})</span>}</Fact>
          <Fact label={TEXT.noticePeriod}>{noticeShortText(c.notice)}</Fact>
          {ended
            ? <Fact label={TEXT.paidSince}>{fmtGBP(item.afterEndGBP)}</Fact>
            : <Fact label={TEXT.noticeDeadline}>{fmtDate(item.deadline)}<span className="rn-fact__rel"> ({relativeText(item.deadline)})</span></Fact>}
        </dl>
        <p className="rn-attn__links">
          <span className="rn-conf"><span className="rn-conf__label">{TEXT.confidence}</span><ConfidencePill score={c.confidence.noticePeriod} /></span>
          {ev && <ClauseLink contractId={c.id} extractionId={ev.extractionId} page={ev.page} from="renewals" context={c.title} />}
        </p>
      </div>
    </li>
  );
}

function Attention({ estate }) {
  const items = estate.radar.attention;
  return (
    <Panel title={<><i className="fa-solid fa-triangle-exclamation rn-attn__head-glyph" aria-hidden="true" />{TEXT.attentionTitle}</>} count={items.length} description={TEXT.attentionDesc} id="rn-attn-h" className="rn-attn">
      {items.length === 0
        ? <p className="rn-attn__none">{TEXT.attentionNone}</p>
        : <ul className="rn-attn__list" aria-labelledby="rn-attn-h">{items.map((it) => <AttentionRow key={it.contractId} item={it} estate={estate} />)}</ul>}
    </Panel>
  );
}

/* ------------------------------------------------------------------ the three bands */

function lanesExtra(estate) {
  return function extraFor(row) {
    const c = estate.contractsById[row.id];
    const d = estate.derived[row.id];
    const ev = evidenceForField(c.id, 'noticePeriod');
    const note = noticeDeadlineNote(d);
    return (
      <span className="rn-extra">
        <span className="rn-extra__action">{actionLine(c, d)}</span>
        <span className="rn-extra__meta">
          <span>{TEXT.endsOn(false)} {fmtDate(c.endDate)}</span>
          <span>{note || `${TEXT.noticePeriod}: ${noticeShortText(c.notice)}`}</span>
          <span className="rn-conf"><span className="rn-conf__label">{TEXT.confidence}</span><ConfidencePill score={c.confidence.noticePeriod} /></span>
          {ev && <ClauseLink contractId={c.id} extractionId={ev.extractionId} page={ev.page} from="renewals" context={c.title} />}
        </span>
      </span>
    );
  };
}

function twin(rows, estate) {
  const items = [];
  TIMED.forEach((band) => (estate.radar.groups[band] ? estate.radar.groups[band].items : []).forEach((it) => items.push({ ...it, band })));
  return {
    columns: [
      { key: 'period', label: 'Period' },
      { key: 'title', label: 'Contract' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'annual', label: TEXT.annualValue, align: 'right' },
      { key: 'total', label: 'Total contract value', align: 'right' },
      { key: 'ends', label: 'Contract ends' },
      { key: 'notice', label: TEXT.noticePeriod },
      { key: 'deadline', label: TEXT.noticeDeadline },
      { key: 'auto', label: TEXT.autoRenews },
    ],
    rows: items.map((it) => {
      const c = estate.contractsById[it.contractId];
      return {
        id: it.contractId, period: bandLabel(it.band), title: c.title, supplier: c.supplierName, annual: gbpFull(it.annualValueGBP), total: gbpFull(it.totalValueGBP),
        ends: fmtDate(it.endDate), notice: noticeShortText(c.notice), deadline: `${fmtDate(it.deadline)}, ${relativeText(it.deadline)}`, auto: isAuto(c) ? 'Yes' : 'No',
      };
    }),
  };
}

/**
 * The same figure as src/charts ChartFigure (title, description, legend, "Show table" twin, footnote, same classes and markup) with the head
 * in a div instead of a <header>. A <header> inside <main> is not a banner landmark, but tests/smoke.mjs counts every header under #root
 * and expects exactly the shell's one (see docs/handoff/V1.md). The twin is the charts ChartTable, so the table is identical.
 */
function LanesFigure({ title, description, legend, table, footnote, children }) {
  const uid = useId();
  const [view, setView] = useState('chart');
  return (
    <figure className="kviz-fig" aria-labelledby={uid + '-t'}>
      <div className="kviz-fig__head">
        <div>
          <h2 id={uid + '-t'} className="kviz-fig__title">{title}</h2>
          <p className="kviz-fig__desc">{description}</p>
        </div>
        <div className="kviz-fig__actions">
          <button type="button" className="kviz-btn" aria-pressed={view === 'table'} onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
            <i className={'fa-solid fa-' + (view === 'table' ? 'chart-simple' : 'table')} aria-hidden="true" />
            {view === 'table' ? TEXT.showChart : TEXT.showTable}
          </button>
        </div>
      </div>
      {view === 'chart' && legend}
      <div className="kviz-fig__body">{view === 'chart' ? children : <ChartTable {...table} caption={title} />}</div>
      <figcaption className="kviz-fig__note">{footnote}</figcaption>
    </figure>
  );
}

function Lanes({ estate }) {
  const rows = radarRows(estate).filter((r) => TIMED.includes(r.band));
  const later = estate.radar.groups.later ? estate.radar.groups.later.count : 0;
  const legend = RADAR_LEGEND.filter((l) => l.key !== 'late');
  return (
    <Panel padded={24} className="rn-lanes">
      <LanesFigure title={TEXT.lanesTitle} description={TEXT.bands(estate.radar.boundaries)}
        legend={<Legend items={legend} label={TEXT.legendLabel} />} table={twin(rows, estate)}
        footnote={<>{radarFootnote(later)} <a className="rn-link" href="#/contracts">{TEXT.allContracts}</a></>}>
        <RadarLanes rows={rows} format={gbpFull} valueLabel={TEXT.annualValue} extraFor={lanesExtra(estate)}
          getHref={(r) => hrefFor('contracts', { seg: [r.id] })} />
      </LanesFigure>
    </Panel>
  );
}

/* ------------------------------------------------------------------ the page */

export function RenewalRadar({ estate }) {
  return (
    <div className="page rn">
      <PageHeader
        eyebrow={COPY.council}
        title={COPY.pages.renewals.title}
        asAt
        description={<p>{COPY.pages.renewals.subtitle} <MethodLink section="radar" /></p>}
      />
      <Attention estate={estate} />
      <Lanes estate={estate} />
    </div>
  );
}

export default function Renewals() {
  const { estate } = useEstate();
  return <RenewalRadar estate={estate} />;
}
