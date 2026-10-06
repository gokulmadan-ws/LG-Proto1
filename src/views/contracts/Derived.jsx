// The Derived panel (R50, R60, R66): what the engine works out from the answers and the payments, each row with a "How this is calculated" link
// to the matching section of the Method page. Nothing is calculated here: dates, bands, percentages and verdicts come from estate.derived[id],
// the wording from src/lib/copy.js (latestEndText, capUsedText, upliftResultText, noticeDeadlineNote, needsAttentionText, relativeText, bandLabel).
import { bandLabel, capBasisLabel, capSourceLabel, capStateLabel, capUsedText, COPY, latestEndText, needsAttentionText, noticeDeadlineNote, relativeText, upliftResultText } from '../../lib/copy.js';
import { fmtDateLong, fmtGBP, plural } from '../../lib/format.js';
import { AsAt, ConfidencePill, MethodLink } from '../../components/index.js';
import { Panel, Pill } from '../../ui/index.js';
import { CapStatePill, UPLIFT_STATES } from '../../charts/index.js';
import { DETAIL } from './strings.js';

const ATTENTION = new Set(['passed', 'ended']);

function Row({ label, section, id, children }) {
  return (
    <div className="cd-d" data-derived={id}>
      <dt className="cd-d__label">{label}</dt>
      <dd className="cd-d__link"><MethodLink section={section} /></dd>
      {children}
    </div>
  );
}
const Value = ({ children }) => <dd className="cd-d__value">{children}</dd>;
const Sub = ({ children, ...rest }) => <dd className="cd-d__sub" {...rest}>{children}</dd>;

function upliftState(u) {
  if (u.flagged) return UPLIFT_STATES.flag;
  return u.yoy - u.capPct > 0 ? UPLIFT_STATES.tolerance : UPLIFT_STATES.ok;       // the same three states as the Dumbbell chart
}

export function DerivedPanel({ contract: c, estate }) {
  const T = DETAIL.derived;
  const d = estate.derived[c.id];
  const cap = d.cap;
  const up = d.uplift;
  const ext = c.extension || { count: 0, lengthMonths: 0 };
  const noticeX = estate.extractionsById[c.extractionIds.noticePeriod];
  const noticeReview = noticeX && noticeX.confidence < 0.75;
  const attention = needsAttentionText(c, d);
  const suggested = estate.matchList.find((m) => m.status === 'suggested' && m.supplierId === c.supplierId);
  const reviewKnown = d.nextReviewDate;
  const fixed = !c.indexation || c.indexation.indexName === 'None';

  return (
    <Panel as="h2" id="cd-derived-title" title={T.title} padded={false}
      footer={<p className="cd-dfoot">{T.footer} <AsAt /></p>}>
      <dl className="cd-derived">
        <Row id="notice" label={T.noticeDeadline} section="notice">
          <Value>{fmtDateLong(d.deadline)}</Value>
          <Sub>
            {relativeText(d.deadline)}.{d.usedEndDate && <> {noticeDeadlineNote(d)}</>}
            {noticeReview && <> <ConfidencePill score={noticeX.confidence} /></>}
          </Sub>
        </Row>

        <Row id="band" label={T.band} section="radar">
          <Value>
            {ATTENTION.has(d.band)
              ? <Pill tone="warning" icon="triangle-exclamation">{bandLabel(d.band)}</Pill>
              : <Pill icon={d.band === 'later' ? 'calendar' : 'calendar-days'}>{bandLabel(d.band)}</Pill>}
          </Value>
          <Sub>{attention || (d.band === 'later' ? T.bandOff : d.band === 'history' ? '' : T.bandOn)}</Sub>
        </Row>

        <Row id="latest-end" label={T.latestEnd} section="notice">
          <Value>{latestEndText(d)}</Value>
          <Sub>
            {T.latestEndIf}{' '}
            {ext.count > 0
              ? T.latestEndWith(`${plural(ext.count, 'extension')} of ${ext.lengthMonths} months${ext.count > 1 ? ' each' : ''}`)
              : T.latestEndNone}
          </Sub>
        </Row>

        <Row id="next-review" label={T.nextReview} section="ranking">
          <Value>{reviewKnown ? fmtDateLong(d.nextReviewDate) : fixed ? T.none : T.notFound}</Value>
          <Sub>{reviewKnown ? `${relativeText(d.nextReviewDate)}.` : fixed ? T.fixedNote : T.nextReviewMissing}</Sub>
        </Row>

        <Row id="cap-used" label={T.capUsed} section="cap">
          <Value>
            {capUsedText(cap)}{' '}
            {cap.testable && <CapStatePill state={cap.state} label={capStateLabel(cap)} wrap />}
          </Value>
          {cap.testable && (
            <Sub>
              {cap.basis === 'annual'
                ? `Highest contract year: ${fmtGBP(cap.spendAgainstCap)} of ${fmtGBP(cap.capGBP)} a year.`
                : `${fmtGBP(cap.spendAgainstCap)} of ${fmtGBP(cap.capGBP)}.`}{' '}
              {capBasisLabel(cap)}, {capSourceLabel(cap).toLowerCase()}.
              {cap.excessGBP > 0 && <> {fmtGBP(cap.excessGBP)} over. Indicative.</>}
            </Sub>
          )}
          {cap.testable && d.spend.coverage === 'partial' && (
            <Sub><i className="fa-solid fa-circle-info" aria-hidden="true" /> {COPY.partialCoverageNote(d.spend.coverageFrom)}</Sub>
          )}
        </Row>

        <Row id="uplift" label={T.upliftCheck} section="uplift">
          <Value>
            {up.testable
              ? <>{upliftResultText(up).replace(/\. Within tolerance$/, '')}{' '}<span className="kviz-pill" style={{ '--c': upliftState(up).color, color: upliftState(up).text }}><i className={'fa-solid fa-' + upliftState(up).glyph} aria-hidden="true" />{upliftState(up).label}</span></>
              : upliftResultText(up)}
          </Value>
          {up.testable && up.flagged && <Sub>{T.upliftExcess(fmtGBP(up.excessGBP))}</Sub>}
          {suggested && (
            <Sub data-testid="suggested-match">
              {T.suggested(suggested.paymentCount, fmtGBP(suggested.totalGBP))}{' '}
              <a href="#/spend/matches">{T.reviewMatches}</a>
            </Sub>
          )}
        </Row>
      </dl>
    </Panel>
  );
}

export default DerivedPanel;
