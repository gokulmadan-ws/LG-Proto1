// V1: Overview (#/overview, also the empty hash). The hero screen: the headline number first, then where it comes from, what is coming up,
// how much spend is linked to a contract, why this matters, and the close.
//
//   default export: <Overview />      rendered inside <main id="shell-main"> by App.jsx, no props.
//   One h1: the headline sentence (HeadlineSentence in the PageHeader title). The figure is focusable and carries the exact value.
//   Links out:   #/opportunities?type=<overCap|nearCap|renewal|uplift> (the four cards), #/renewals, #/spend/no-contract, #/evidence,
//                #/roadmap, #/method?s=indicative, #/opportunities?status=reviewed (only while a flag is excluded after review).
//   Opens:       useUI().openDemoGuide() and useUI().openFeedback().
//
// Numbers and sentences come from useEstate(), the engine output and src/lib/copy.js. The strings the copy deck does not hold live in
// TEXT below, in the deck's voice: the three section titles and one-line descriptions, the sum line label, the close panel support line,
// the evidence link text and the reviewed-flags link.
import { useUI } from '../lib/ui-context.jsx';
import { useEstate } from '../lib/estate.js';
import { navigate } from '../lib/router.js';
import { COPY, excludedNote, sumLine, fmtGBPCompact } from '../lib/copy.js';
import { evidence } from '../data/evidence.js';
import { PageHeader, MethodLink } from '../components/index.js';
import DS from '../ui/ds.js';
import { Panel, Pill } from '../ui/index.js';
import { CoverageMeter, HeadlineBreakdown, HeadlineSentence, RadarStrip, coverageProps, headlineProps, radarRows } from '../charts/index.js';
import './Overview.css';

const { Button } = DS;

const TEXT = {
  breakdownTitle: 'Where the total comes from',
  sumLabel: 'The four cards add up to the headline',
  reviewedLink: 'See reviewed opportunities',
  radarTitle: 'Renewals coming up',
  radarDesc: 'Contracts by the date you must give notice.',
  radarCaption: 'Contract value, a year',
  coverageTitle: 'Spend linked to contracts',
  noContractLabel: 'No contract on the register',
  noContractFoot: (n) => (n === 1 ? '1 supplier' : `${n} suppliers`),
  awaitingLabel: 'Waiting for your match review',
  closeSupport: 'Your estate has more contracts, more suppliers and more renewals nobody is tracking.',
  readSource: (name) => `Read the ${name} source`,
};

/** The three cases the strip shows (`featured` in src/data/evidence.js), in the spec's order. */
const FEATURED = evidence.filter((e) => e.featured);

function EvidenceCase({ item }) {
  return (
    <li className="ov-case">
      <article className="ov-case__body" aria-labelledby={'ov-case-' + item.id}>
        <div className="ov-case__head">
          <h3 id={'ov-case-' + item.id} className="ov-case__name">{item.case}</h3>
          <span className="ov-case__when">{item.when}</span>
        </div>
        <p className="ov-case__what">{item.whatHappened}</p>
        <div className="ov-case__foot">
          <Pill tone="neutral">{item.feature}</Pill>
          <a className="ov-link" href={item.url} target="_blank" rel="noopener noreferrer">
            {TEXT.readSource(item.case)}<span className="ov-link__new"> {COPY.evidenceStrip.newTab}</span>
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          </a>
        </div>
      </article>
    </li>
  );
}

export default function Overview() {
  const { estate } = useEstate();
  const ui = useUI();
  const hp = headlineProps(estate);
  const excluded = excludedNote(estate.totals);
  const cov = coverageProps(estate);

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

      <div className="kx-grid kx-grid--2-1 ov-row">
        <Panel title={TEXT.radarTitle} description={TEXT.radarDesc} id="ov-radar-h" className="ov-radar"
          actions={<Button type="button" variant="outline" size="sm" rightIcon="arrow-right" onClick={() => navigate('#/renewals')}>{COPY.buttons.openRenewalRadar}</Button>}>
          <RadarStrip rows={radarRows(estate)} format={fmtGBPCompact} caption={TEXT.radarCaption}
            getHref={() => '#/renewals'} attentionHref="#/renewals" />
        </Panel>
        <Panel title={TEXT.coverageTitle} description={COPY.dataWindowNote(estate.council)} id="ov-cov-h" className="ov-coverage">
          <CoverageMeter matched={cov.matched} total={cov.total} format={fmtGBPCompact} href="#/spend/no-contract" />
          <dl className="ov-cov">
            <div className="ov-cov__row"><dt>{TEXT.noContractLabel}</dt><dd>{fmtGBPCompact(cov.unmatched)}<span>{TEXT.noContractFoot(cov.suppliers.length)}</span></dd></div>
            {cov.pending > 0 && <div className="ov-cov__row"><dt>{TEXT.awaitingLabel}</dt><dd>{fmtGBPCompact(cov.pending)}<span>{TEXT.noContractFoot(estate.coverage.awaitingReview.length)}</span></dd></div>}
          </dl>
        </Panel>
      </div>

      <Panel title={COPY.evidenceStrip.heading} description={COPY.evidenceStrip.intro} id="ov-ev-h" className="ov-evidence"
        actions={(
          <a className="ov-link ov-link--lg" href="#/evidence">
            {COPY.evidenceStrip.all}<i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </a>
        )}>
        <ul className="ov-cases" aria-label={COPY.evidenceStrip.heading}>
          {FEATURED.map((item) => <EvidenceCase key={item.id} item={item} />)}
        </ul>
      </Panel>

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
