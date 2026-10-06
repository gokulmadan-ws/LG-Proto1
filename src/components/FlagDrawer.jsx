// V2: the flag drawer. Mounted ONCE by components/Overlays.jsx on every route, no props.
//
//   Opens when the address carries ?flag=<flagId> (any page: setQuery({ flag: id }); #/renewals?flag=F-C-005-overCap works).
//   Closing removes the param (replace, so Back is not polluted). It is driven from estate.flagsById, never from a filtered list,
//   so marking the flag Explained (which removes its row from the Open list) does not make the open drawer vanish.
//
//   Contents, top to bottom: contract and supplier, flag type pill, indicative value with its basis and the short caveat, why it is flagged,
//   the numbered "How this is calculated" breakdown (the last line is the row's amount, to the pound), confidence and why, where it comes
//   from (clause, page, quote), "Reasons this may not be a saving". The sticky footer holds the review status select (persisted, moves the headline
//   live) and the evidence ClauseLink as the one primary button.
//
// The kit Drawer is used, never a native <dialog>: it traps focus, closes on Escape and a scrim click, and returns focus to the row that opened it.
import { useEffect, useRef } from 'react';
import { useEstate, computeEstate } from '../lib/estate.js';
import { useRoute, setQuery, hrefFor } from '../lib/router.js';
import { useUI } from '../lib/ui-context.jsx';
import { evidenceFor, evidenceAll } from '../lib/evidenceFor.js';
import {
  COPY, TRIAGE_OPTIONS, actionByLabel, actionByText, basisLabel, breakdownValueText, confidenceReason, fieldLabel, flagTypeLabel, fmtGBP, reasonFor,
  relativeText, reviewStatusLabel, triageToast, watchNote,
} from '../lib/copy.js';
import { REASONS_HEADING, reasonsFor } from '../data/reasons.js';
import { RAIL_IDS } from '../shell/rail.js';
import { ClauseLink } from './ClauseLink.jsx';
import { MethodLink } from './MethodLink.jsx';
import DS from '../ui/ds.js';
import { Drawer, Field, focusables } from '../ui/index.js';
import { ConfidenceBadge, FlagBadge, ReviewBadge } from '../charts/index.js';
import './FlagDrawer.css';

const { Select } = DS;

/* Wording this drawer owns (the copy deck has no strings for it). Same voice: sentence case, "you", no exclamation marks. */
const TEXT = {
  why: 'Why this is flagged',
  how: 'How this is calculated',
  confidence: 'Confidence',
  source: 'Where it comes from',
  indicative: 'Indicative value',
  review: 'Review status',
  resultNote: 'The indicative value of this opportunity.',
  methodLink: 'See the rule on the method page',
  confidenceLink: 'How confidence is worked out',
  openContract: 'Open contract',
  pageOf: (page, count) => (count ? `Page ${page} of ${count}` : `Page ${page}`),
  counted: 'Counted in the headline.',
  excluded: (gbp) => `Not counted. ${fmtGBP(gbp)} is excluded from the headline after your review.`,
  zeroValue: watchNote(),
  storageBlocked: 'Your browser is blocking local storage, so this review lasts only until you close the page.',
};

/** The rule in one sentence, per flag type (the numbers are in the breakdown). Matches the Method page. */
function ruleFor(flag, derived) {
  if (flag.type === 'renewal') return 'Indicative value = annual value × the indicative rate. It is a prompt to renegotiate or re-procure, not a forecast.';
  if (flag.type === 'uplift') return 'Paid above the capped increase = payments in the last 12 months, minus the earlier 12 months plus the increase the contract allows.';
  if (flag.type === 'nearCap') {
    return derived.cap && derived.cap.basis === 'annual'
      ? 'Projected spend above cap = spend in the current contract year, scaled to the full year, minus the annual cap.'
      : 'Projected spend above cap = spend to date plus the last 12 months of payments for each year left in the term, minus the cap.';
  }
  if (flag.capState === 'above_estimate') return 'Spend above contract value = spend to date minus the contract value. A contract value is an estimate, not a ceiling.';
  return derived.cap && derived.cap.basis === 'annual'
    ? 'Spend above cap = spend in each contract year that went over, minus the annual cap for those years.'
    : 'Spend above cap = spend to date minus the cap.';
}

/** Which Method page section explains this flag. */
const methodSection = (flag) => (flag.type === 'renewal' ? 'indicative' : flag.type === 'uplift' ? 'uplift' : 'cap');

const sentence = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export default function FlagDrawer() {
  const route = useRoute();
  const { estate, state, actions, storage } = useEstate();
  const ui = useUI();
  const id = route.query.get('flag');
  const flag = id ? estate.flagsById[id] || null : null;
  const contract = flag ? estate.contractsById[flag.contractId] : null;
  const derived = flag ? estate.derived[flag.contractId] : null;
  const open = !!(flag && contract && derived);

  // When the drawer closes and the row that opened it has left the list (marked Explained under the Open filter), focus would drop to <main>.
  // Hand it to the page's own status line instead, so the next Tab starts somewhere meaningful.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) { wasOpen.current = true; return undefined; }
    if (!wasOpen.current) return undefined;
    wasOpen.current = false;
    const t = setTimeout(() => {
      const a = document.activeElement;
      if (a && a !== document.body && a.tagName !== 'MAIN') return;
      const fallback = document.querySelector('[data-opp-fallback]');
      if (fallback) fallback.focus({ preventScroll: true });
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  // Following a link that lands on ?flag= from another page (the demo guide does) is a route change, and the router moves focus to the page h1
  // one frame later, behind the open drawer. Take focus back for a few frames so the trap and Escape work from the first keypress.
  useEffect(() => {
    if (!open) return undefined;
    let frames = 0;
    let raf = 0;
    const reclaim = () => {
      const node = document.querySelector('.flag-drawer');
      if (node && !node.contains(document.activeElement)) (node.querySelector('[data-autofocus]') || focusables(node)[0] || node).focus({ preventScroll: true });
      frames += 1;
      if (frames < 8) raf = requestAnimationFrame(reclaim);
    };
    raf = requestAnimationFrame(reclaim);
    return () => cancelAnimationFrame(raf);
  }, [open, id]);

  const close = () => setQuery({ flag: null });

  let body = null;
  let footer = null;
  if (open) {
    const status = flag.status || 'to_investigate';
    const reviewed = status === 'explained' || status === 'not_an_issue';
    const primary = evidenceFor(flag);
    const targets = evidenceAll(flag);
    const doc = estate.data.documents && estate.data.documents[contract.documentId];
    const from = RAIL_IDS.has(route.name) ? route.name : 'opportunities';
    const reasons = reasonsFor(flag);
    const hint = flag.indicativeGBP === 0 ? TEXT.zeroValue : reviewed ? TEXT.excluded(flag.indicativeGBP) : TEXT.counted;

    const onTriage = (value) => {
      const next = { ...state.triage };
      if (value === 'to_investigate') delete next[flag.id]; else next[flag.id] = value;
      // The toast names the headline AFTER the change: compute it from the same pure function the provider uses.
      const totals = computeEstate({ decisions: state.decisions, assumptions: state.assumptions, triage: next }).totals;
      actions.setTriage(flag.id, value === 'to_investigate' ? null : value);
      const [title, ...rest] = triageToast(contract, value, totals).split(/(?<=\.)\s+/);
      ui.toast({ tone: 'success', title, description: rest.join(' ') });
    };

    body = (
      <div className="flag-drawer__content">
        <div className="flag-sum">
          <div className="flag-sum__pills">
            <FlagBadge type={flag.type} label={flagTypeLabel(flag)} muted={reviewed} />
            <ConfidenceBadge level={flag.confidence} />
            {status !== 'to_investigate' && <ReviewBadge status={status} label={reviewStatusLabel(status)} />}
          </div>
          <p className="flag-sum__label kx-eyebrow">{TEXT.indicative}</p>
          <p className="flag-sum__value">
            <span className="kx-kpi" data-flag-value>{fmtGBP(flag.indicativeGBP)}</span>
            <span className="flag-sum__basis">{basisLabel(flag)}</span>
          </p>
          {flag.actionBy && (
            <p className="flag-sum__date">{actionByLabel(flag)} <time dateTime={flag.actionBy}>{actionByText(flag)}</time>, {relativeText(flag.actionBy).toLowerCase()}.</p>
          )}
          <p className="flag-sum__caveat">{COPY.caveat.short}</p>
        </div>

        <div className="flag-block">
          <h3 className="flag-block__h">{TEXT.why}</h3>
          <p className="flag-block__p">{reasonFor(flag, contract, derived)}</p>
        </div>

        <div className="flag-block">
          <h3 className="flag-block__h">{TEXT.how}</h3>
          <p className="flag-block__rule">{ruleFor(flag, derived)}</p>
          <ol className="flag-calc" aria-label={TEXT.how}>
            {flag.breakdown.map((b, i) => (
              <li key={i} className={'flag-calc__row' + (b.kind === 'result' ? ' is-result' : '')} {...(b.kind === 'result' ? { 'data-flag-result': '' } : {})}>
                <span className="flag-calc__n" aria-hidden="true">{i + 1}</span>
                <span className="flag-calc__label">
                  {b.label}
                  {b.note && <span className="flag-calc__note">{b.note}</span>}
                  {b.kind === 'result' && <span className="flag-calc__note">{TEXT.resultNote}</span>}
                </span>
                <span className="flag-calc__value">{breakdownValueText(b)}</span>
              </li>
            ))}
          </ol>
          <p className="flag-block__p"><MethodLink section={methodSection(flag)}>{TEXT.methodLink}</MethodLink></p>
        </div>

        <div className="flag-block">
          <h3 className="flag-block__h">{TEXT.confidence}</h3>
          <p className="flag-block__p"><ConfidenceBadge level={flag.confidence} /></p>
          <p className="flag-block__p">{confidenceReason(flag)} <MethodLink section="confidence">{TEXT.confidenceLink}</MethodLink></p>
        </div>

        <div className="flag-block">
          <h3 className="flag-block__h">{TEXT.source}</h3>
          {targets.map((t, i) => (
            <figure className="flag-evidence" key={t.extractionId}>
              <figcaption className="flag-evidence__ref">
                <span className="kx-mono">{t.clauseRef}</span>
                <span>{TEXT.pageOf(t.page, doc && doc.pageCount)}</span>
                <span>{sentence(fieldLabel(t.fieldKey))}</span>
              </figcaption>
              <blockquote className="flag-evidence__quote">{t.quote}</blockquote>
              {i > 0 && <ClauseLink contractId={t.contractId} extractionId={t.extractionId} page={t.page} from={from} />}
            </figure>
          ))}
          <p className="flag-block__small">{COPY.illustrativeLabel}</p>
          <p className="flag-block__p"><a className="flag-textlink" href={hrefFor('contracts', { seg: [contract.id] })}><i className="fa-regular fa-folder-open" aria-hidden="true" /><span className="flag-textlink__t">{TEXT.openContract}<span className="sr-only">, {contract.title}</span></span></a></p>
        </div>

        <div className="flag-block">
          <h3 className="flag-block__h">{reasons.heading || REASONS_HEADING}</h3>
          <p className="flag-block__p">{reasons.intro}</p>
          <ul className="flag-reasons">
            {reasons.items.map((r) => <li key={r.id}>{r.text}</li>)}
          </ul>
        </div>
      </div>
    );

    footer = (
      <div className="flag-foot">
        <Field label={TEXT.review} className="flag-foot__review" help={storage && storage.blocked ? `${hint} ${TEXT.storageBlocked}` : hint}>
          {(p) => <Select {...p} value={status} options={TRIAGE_OPTIONS} onChange={(e) => onTriage(e.target.value)} />}
        </Field>
        {primary && <ClauseLink className="flag-cta" contractId={primary.contractId} extractionId={primary.extractionId} page={primary.page} from={from} context={contract.title} />}
      </div>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      size="lg"
      className="flag-drawer"
      title={open ? <><span className="sr-only">Opportunity: </span>{contract.title}</> : ''}
      subtitle={open ? `${contract.supplierName} · ${contract.id}` : null}
      footer={footer}
    >
      {body}
    </Drawer>
  );
}
