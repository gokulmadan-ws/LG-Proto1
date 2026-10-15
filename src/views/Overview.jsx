// V1: Overview (#/overview, also the empty hash). The hero screen: the headline number first, then where it comes from, how the team is
// getting on with it (the Action progress strip), how much has been paid above the caps, what is coming up for renewal, and the close.
//
//   default export: <Overview />      rendered inside <main id="shell-main"> by App.jsx, no props.
//   One h1: the headline sentence (HeadlineSentence in the PageHeader title). The figure is focusable and carries the exact value.
//   Links out:   #/opportunities?type=<overCap|nearCap|renewal|uplift> (the four cards), #/actions and #/actions/results (Action progress),
//                #/spend (Cap vs spend panel), #/renewals,
//                #/roadmap, #/method?s=indicative, #/opportunities?status=reviewed (only while a flag is excluded after review).
//   Opens:       useUI().openDemoGuide() and useUI().openFeedback(); the flag drawer (?flag=) from a cap row or a renewal diamond (D9).
//
// Numbers and sentences come from useEstate(), the engine output and src/lib/copy.js. The strings the copy deck does not hold live in
// TEXT below, in the deck's voice: the section titles and one-line descriptions, the sum line label, the close panel support line
// and the reviewed-flags link.
import { useUI } from '../lib/ui-context.jsx';
import { useEstate } from '../lib/estate.js';
import { navigate, setQuery } from '../lib/router.js';
import { COPY, excludedNote, sumLine, fmtGBP, fmtGBPCompact } from '../lib/copy.js';
import { plural } from '../lib/format.js';
import { PageHeader, MethodLink } from '../components/index.js';
import DS from '../ui/ds.js';
import { Panel } from '../ui/index.js';
import { BulletList, CapStatePill, HeadlineBreakdown, HeadlineSentence, RadarStrip, capItems, headlineProps, radarRows } from '../charts/index.js';
import { ACT } from '../lib/actions-copy.js';
import { actionTotals } from '../lib/actions.js';
import './Overview.css';

const { Button } = DS;

const TEXT = {
  breakdownTitle: 'Where the total comes from',
  sumLabel: 'The four cards add up to the headline',
  countsNote: (contracts, multi, cards) => `${contracts} contracts in all. ${multi} ${multi === 1 ? 'contract carries' : 'contracts carry'} more than one flag, so the card counts add to ${cards}.`,
  reviewedLink: 'See reviewed opportunities',
  radarTitle: 'Renewals coming up',
  radarDesc: 'Contracts by the date you must give notice.',
  radarCaption: 'Contract value, a year',
  capTitle: 'Cap vs spend',
  capDesc: 'What you have paid against the most each contract allows.',
  capOpen: 'Open cap vs spend',
  capCounts: 'Contracts by cap status',
  capPills: { over: (n) => `Over cap ${n}`, near: (n) => `Close to cap ${n}`, ok: (n) => `Within cap ${n}` },
  capAbove: (n) => `paid above the cap, across ${plural(n, 'contract')}`,
  capTipNote: 'Select to open this opportunity in the side drawer.',
  capAll: (n) => `See all ${n} contracts`,
  closeSupport: 'Your estate has more contracts, more suppliers and more renewals nobody is tracking.',
};
const CAP_ROWS = 5;

/** The cap-related flag of a contract (over cap or close to cap, watch flags included), or null. */
function capFlagOf(estate, contractId) {
  const ids = (estate.derived[contractId] && estate.derived[contractId].flagIds) || [];
  const id = ids.find((x) => /-(overCap|nearCap)$/.test(x));
  return id || null;
}

/** Action progress (build spec 8.5): how much of the headline nobody has started, how much is being worked on, and what has come back. */
function ProgressStrip({ estate, actions }) {
  const H = ACT.home;
  const t = actionTotals(estate, actions);
  return (
    <Panel title={H.title} description={H.description} id="ov-prog-h" className="ov-prog"
      actions={<Button type="button" variant="outline" size="sm" rightIcon="arrow-right" onClick={() => navigate('#/actions')}>{H.open}</Button>}>
      <dl className="ov-prog__grid">
        <div className="ov-prog__block is-idle" data-block="not-started">
          <dt>{H.notStarted}</dt>
          <dd><span className="ov-prog__value" title={fmtGBP(t.notStartedGBP)}>{fmtGBPCompact(t.notStartedGBP)}</span><span className="ov-prog__foot">{H.notStartedFoot(t.noActionCount)}</span></dd>
        </div>
        <div className="ov-prog__block is-working" data-block="working">
          <dt>{H.working}</dt>
          <dd><span className="ov-prog__value" title={fmtGBP(t.beingWorkedGBP)}>{fmtGBPCompact(t.beingWorkedGBP)}</span><span className="ov-prog__foot">{H.workingFoot(t.openCount, t.dueSoonCount)}</span></dd>
        </div>
        <div className="ov-prog__block is-value" data-block="value">
          <dt>{H.value}</dt>
          <dd>
            <span className="ov-prog__value">{fmtGBP(t.valueSecuredGBP)}</span>
            <span className="ov-prog__foot">
              {t.resolvedCount > 0 ? H.valueFoot(t.resolvedCount, t.sinceMonth) : H.valueFootNone}{' '}
              <a className="ov-link" href="#/actions/results">{H.seeResults}</a>
            </span>
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

function CapPanel({ estate }) {
  const items = capItems(estate);
  const count = { over: 0, near: 0, ok: 0 };
  estate.capRows.forEach((r) => { count[r.state] += 1; });
  const overRows = estate.capRows.filter((r) => r.state === 'over');
  const above = overRows.reduce((s, r) => s + r.excessGBP, 0);
  return (
    <Panel title={TEXT.capTitle} description={TEXT.capDesc} id="ov-cap-h" className="ov-cap"
      actions={<Button type="button" variant="outline" size="sm" rightIcon="arrow-right" onClick={() => navigate('#/spend')}>{TEXT.capOpen}</Button>}>
      <ul className="ov-cap__pills" aria-label={TEXT.capCounts}>
        {['over', 'near', 'ok'].map((k) => <li key={k}><CapStatePill state={k} label={TEXT.capPills[k](count[k])} /></li>)}
      </ul>
      <p className="ov-cap__sum"><strong>{fmtGBP(above)}</strong> <span>{TEXT.capAbove(overRows.length)}</span></p>
      <BulletList items={items} limit={CAP_ROWS} compact format={fmtGBPCompact} closeAt={estate.opts.nearCapThreshold} tipNote={TEXT.capTipNote}
        getHref={(r) => (capFlagOf(estate, r.id) ? undefined : '#/spend')}
        onOpen={(r) => { const f = capFlagOf(estate, r.id); if (f) setQuery({ flag: f }); }} />
      <p className="ov-cap__all"><a className="ov-link" href="#/spend">{TEXT.capAll(estate.capRows.length)}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></a></p>
    </Panel>
  );
}

export default function Overview() {
  const { estate, state } = useEstate();
  const ui = useUI();
  const hp = headlineProps(estate);
  const excluded = excludedNote(estate.totals);
  const perContract = {};
  estate.ranked.forEach((f) => { if (f.indicativeGBP > 0 && (f.status === 'to_investigate' || f.status === 'under_review')) perContract[f.contractId] = (perContract[f.contractId] || 0) + 1; });
  const multiFlag = Object.values(perContract).filter((n) => n > 1).length;
  const cardCounts = Object.values(estate.totals.countByType || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="page ov">
      <PageHeader
        eyebrow={COPY.council}
        title={<HeadlineSentence total={hp.total} contractCount={hp.contractCount} format={fmtGBPCompact} />}
        description={(
          <>
            <p>{COPY.asAtShort}</p>
            <p>{COPY.caveat.short} <MethodLink section="indicative" /></p>
          </>
        )}
        actions={<Button type="button" variant="outline" leftIcon="circle-play" onClick={() => ui.openDemoGuide()}>{COPY.buttons.openDemoGuide}</Button>}
      />

      <Panel padded={24} className="ov-hero">
        <h2 className="sr-only">{TEXT.breakdownTitle}</h2>
        <HeadlineBreakdown
          {...hp}
          format={fmtGBPCompact}
          getHref={(type) => '#/opportunities?type=' + type}
          footer={(
            <div className="ov-sum">
              <p className="ov-sum__line"><span className="ov-sum__label">{TEXT.sumLabel}</span><span className="ov-sum__eq">{sumLine(estate.totals)}</span></p>
              {multiFlag > 0 && <p className="ov-sum__line ov-sum__counts">{TEXT.countsNote(estate.totals.contractCount, multiFlag, cardCounts)}</p>}
              {excluded && (
                <p className="ov-sum__note" role="status">
                  <i className="fa-solid fa-circle-info" aria-hidden="true" />
                  <span className="ov-sum__excluded">{excluded}</span>
                  <a className="ov-link" href="#/opportunities?status=reviewed">{TEXT.reviewedLink}</a>
                </p>
              )}
            </div>
          )}
        />
      </Panel>

      <ProgressStrip estate={estate} actions={state.actions || {}} />

      <div className="kx-grid kx-grid--halves ov-row">
        <CapPanel estate={estate} />
        <Panel title={TEXT.radarTitle} description={TEXT.radarDesc} id="ov-radar-h" className="ov-radar"
          actions={<Button type="button" variant="outline" size="sm" rightIcon="arrow-right" onClick={() => navigate('#/renewals')}>{COPY.buttons.openRenewalRadar}</Button>}>
          <RadarStrip rows={radarRows(estate)} format={fmtGBPCompact} caption={TEXT.radarCaption}
            getHref={() => '#/renewals'} attentionHref="#/renewals" onOpen={(r) => { if (r.flagId) setQuery({ flag: r.flagId }); }} />
        </Panel>
      </div>

      <section className="kx-card ov-close" aria-labelledby="ov-close-h">
        <div className="ov-close__text">
          <h2 id="ov-close-h" className="ov-close__line">{COPY.closePanel.heading}</h2>
          <p className="ov-close__support">{TEXT.closeSupport}</p>
        </div>
        <div className="ov-close__actions">
          <Button type="button" leftIcon="comment-dots" onClick={() => ui.openFeedback()}>{COPY.closePanel.primary}</Button>
          <Button type="button" variant="outline" rightIcon="arrow-right" onClick={() => navigate('#/roadmap')}>{COPY.closePanel.secondary}</Button>
        </div>
      </section>
    </div>
  );
}
