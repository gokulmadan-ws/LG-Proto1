// Flags first (R52): every opportunity the engine raised on this contract, each with its type pill, the indicative pound figure, why, and the
// links that open the flag drawer (setQuery({ flag: id }), the drawer is mounted once for every route) and the clause it came from.
// Counted flags come from estate.ranked (reviewed ones included, shown as reviewed); GBP 0 flags come from estate.watch.
import { setQuery } from '../../lib/router.js';
import { evidenceFor } from '../../lib/evidenceFor.js';
import { COPY, actionByLabel, actionByText, basisLabel, flagTypeLabel, fmtGBP, reasonFor, reviewStatusLabel, watchNote } from '../../lib/copy.js';
import { ClauseLink } from '../../components/index.js';
import { Panel } from '../../ui/index.js';
import { ConfidenceBadge, FlagBadge, ReviewBadge } from '../../charts/index.js';
import { DETAIL } from './strings.js';

const REVIEWED = new Set(['explained', 'not_an_issue']);

function FlagRow({ flag, contract, estate, watch = false }) {
  const d = estate.derived[contract.id];
  const t = evidenceFor(flag);
  const reviewed = REVIEWED.has(flag.status);
  const typeLabel = flagTypeLabel(flag);
  const date = actionByText(flag);
  return (
    <li className={'cd-flag' + (reviewed ? ' is-reviewed' : '')} data-flag-id={flag.id}>
      <div className="cd-flag__type"><FlagBadge type={flag.type} label={typeLabel} muted={reviewed} /></div>
      <div className="cd-flag__body">
        <p className="cd-flag__reason">{reasonFor(flag, contract, d)}</p>
        <div className="cd-flag__meta">
          <ConfidenceBadge level={flag.confidence} />
          {flag.status && flag.status !== 'to_investigate' && <ReviewBadge status={flag.status} label={reviewStatusLabel(flag.status)} />}
          {date && <span className="cd-flag__date">{DETAIL.flags.actBy(flag, actionByLabel(flag), date)}</span>}
          <button type="button" className="kviz-textlink cd-flag__link" onClick={() => setQuery({ flag: flag.id })} data-testid="open-flag">
            <i className="fa-solid fa-calculator" aria-hidden="true" /> {COPY.buttons.seeCalculation}<span className="sr-only">, {typeLabel}</span>
          </button>
          {t && <ClauseLink contractId={t.contractId} extractionId={t.extractionId} page={t.page} from="contracts" context={typeLabel} />}
        </div>
      </div>
      <div className="cd-flag__value">
        <strong className="cd-flag__gbp">{fmtGBP(flag.indicativeGBP)}</strong>
        <span className="cd-flag__basis">{watch ? watchNote() : `${DETAIL.flags.indicative}. ${basisLabel(flag)}`}</span>
        {reviewed && !watch && <span className="cd-flag__basis">{DETAIL.flags.notCounted}</span>}
      </div>
    </li>
  );
}

export function FlagsSection({ contract, estate }) {
  const ranked = estate.ranked.filter((f) => f.contractId === contract.id);
  const watch = estate.watch.filter((f) => f.contractId === contract.id);
  return (
    <Panel as="h2" id="cd-flags-title" title={DETAIL.flags.title} count={ranked.length} description={DETAIL.flags.description} padded={false}>
      {ranked.length === 0 && (
        <p className="cd-empty" data-testid="no-flags"><i className="fa-regular fa-circle-check" aria-hidden="true" /> {DETAIL.flags.empty}</p>
      )}
      {ranked.length > 0 && (
        <ul className="cd-flags" aria-label={DETAIL.flags.list(contract.title)}>
          {ranked.map((f) => <FlagRow key={f.id} flag={f} contract={contract} estate={estate} />)}
        </ul>
      )}
      {watch.length > 0 && (
        <div className="cd-watch">
          <h3 className="cd-watch__title">{DETAIL.flags.watchTitle}</h3>
          <p className="cd-watch__intro">{DETAIL.flags.watchIntro}</p>
          <ul className="cd-flags" aria-label={`${DETAIL.flags.watchTitle}, ${contract.title}`}>
            {watch.map((f) => <FlagRow key={f.id} flag={f} contract={contract} estate={estate} watch />)}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export default FlagsSection;
