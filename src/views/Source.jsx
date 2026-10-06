// V3: Source viewer (#/source/<contractId>/<extractionId>?from=<railId>), the climax of the demo: land on the clause and page.
//
//   default export: <Source contractId extractionId from route />   (routes.js passes the first three from the address)
//   Renders exactly ONE <h1> (the clause reference) inside <div className="page"> and sets the tab title with usePageTitle(clauseRef).
//
// Layout (blueprint section 5): breadcrumb, then two panes. Left: a paper-like contract page built from the page blocks in
// estate.data.documents[contract.documentId].pages[page] (schema in docs/handoff/A2.md). Only the block whose extractionIds
// includes the current extraction is highlighted (2px accent outline, light accent tint, visible label "Cited clause"). On mount
// that block is scrolled to the centre of the view and the <mark> takes focus. Right: the answer in plain words, where it comes
// from (clause, page, document, quote), the hand-check, stepping through the nine questions, and the way back.
// The page has no primary button. A missing extraction or page shows the copy deck 7.9 state and an "Open contract" button.
//
// Words come from src/lib/copy.js (answerFor, COPY, handcheckLine). The few strings copy.js lacks live in SOURCE_COPY below.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEstate, handcheckSummary } from '../lib/estate.js';
import { COPY, answerFor, fieldLabel, handcheckLine } from '../lib/copy.js';
import { hrefFor, navigate, usePageTitle } from '../lib/router.js';
import { useUI } from '../lib/ui-context.jsx';
import { PageHeader, ConfidencePill, ClauseLink } from '../components/index.js';
import { evidenceForField } from '../lib/evidenceFor.js';
import { Button, Pill } from '../ui/index.js';
import './Source.css';

const { Breadcrumb } = window.Springboard20DesignSystem_019e02;

/** Strings this view needs that copy.js does not have (copy deck wording; listed in docs/handoff/V3.md). */
const SOURCE_COPY = {
  eyebrow: 'Source viewer',
  citedLabel: 'Cited clause',
  pageHeading: (page, count) => `Contract text, page ${page} of ${count}`,
  questionOf: (n, total) => `Question ${n} of ${total}`,
  answerCaption: (field) => `Answer: ${field}`,
  confidenceScore: (score) => `${score.toFixed(2)} confidence`,
  notFound: 'Not found',
  valueClause: (page) => `View contract value clause, page ${page}`,
  whereFrom: 'Where it comes from',
  clause: 'Clause', page: 'Page', document: 'Document', quote: 'Quote from the contract',
  pageOf: (page, count) => `${page} of ${count}`,
  checkHeading: 'Check this answer',
  checkHelp: 'Compare the answer with the highlighted clause. Your check stays on this device.',
  marked: { correct: 'You marked this answer as correct. Select the button again to clear it.', incorrect: 'You marked this answer as incorrect. Select the button again to clear it.' },
  unmarked: 'Not checked by hand yet.',
  cleared: 'Hand-check cleared.',
  stepHeading: 'Answers for this contract',
  stepCount: (i, n) => `Answer ${i} of ${n}`,
  openContracts: 'Open contracts',
  stepperLabel: 'Answers for this contract',
  toolbarLabel: 'Move around this contract',
};

/** Where a reader may have come from (the ?from= rail id): breadcrumb label, address, and the label of the way back. */
const ORIGINS = {
  opportunities: { crumb: 'Opportunities', back: 'Back to opportunity', href: '#/opportunities' },
  overview: { crumb: 'Overview', back: 'Back to overview', href: '#/overview' },
  renewals: { crumb: 'Renewal radar', back: 'Back to renewal radar', href: '#/renewals' },
  spend: { crumb: 'Cap vs spend', back: 'Back to cap vs spend', href: '#/spend' },
  contracts: { crumb: 'Contracts', back: 'Back to contract', href: '#/contracts', backTo: (c) => `#/contracts/${encodeURIComponent(c.id)}` },
  roadmap: { crumb: 'Roadmap', back: 'Back to roadmap', href: '#/roadmap' },
  method: { crumb: 'How this is calculated', back: 'Back to method page', href: '#/method' },
  evidence: { crumb: 'Why this matters', back: 'Back to evidence', href: '#/evidence' },
};
const backHrefOf = (origin, contract) => (origin.backTo && contract ? origin.backTo(contract) : origin.href);

/** Centre `el` in the content area. Scrolls the main scroller only: scrollIntoView would also nudge the shell. */
function centreInMain(el) {
  const main = document.getElementById('shell-main');
  if (!main) { el.scrollIntoView({ block: 'center', behavior: 'auto' }); return; }
  const m = main.getBoundingClientRect(), r = el.getBoundingClientRect();
  const bar = document.querySelector('.src-toolbar');
  const covered = bar && getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0;      // the pinned toolbar hides the top of the content area
  main.scrollTo({ top: main.scrollTop + (r.top + r.height / 2) - (m.top + covered + (m.height - covered) / 2), behavior: 'auto' });
}

const sentence = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** One block of the contract page. The cited block carries the mark; every other block is plain text. */
function PageBlock({ block, extractionId, markRef, labelId }) {
  if (block.kind === 'header') return <div className="src-run src-run--head">{block.text}</div>;
  if (block.kind === 'footer') return <div className="src-run src-run--foot">{block.text}</div>;
  if (block.kind === 'heading') {
    const lead = block.num ? (/^Schedule/.test(block.num) ? `${block.num}: ` : `${block.num}. `) : '';
    return <h3 className="src-heading">{lead}{block.text}</h3>;
  }
  const cited = !!(block.extractionIds && block.extractionIds.includes(extractionId));
  return (
    <div className={'src-row' + (block.kind === 'item' ? ' src-row--item' : '') + (cited ? ' src-row--cited' : '')}>
      <span className="src-num">{block.num}</span>
      <div className="src-body">
        {block.title && <p className="src-title">{block.title}</p>}
        {cited ? (
          <div className="src-cite">
            <span id={labelId} className="src-cite__label"><i className="fa-solid fa-bookmark" aria-hidden="true" />{SOURCE_COPY.citedLabel}</span>
            <mark ref={markRef} tabIndex={-1} aria-describedby={labelId} className="src-mark" data-extraction-id={extractionId}>{block.text}</mark>
          </div>
        ) : <p className="src-text">{block.text}</p>}
      </div>
    </div>
  );
}

/** Missing extraction, wrong contract, or a page that is not in the sample (copy deck 7.9). Never crashes. */
function Missing({ contract, from }) {
  const t = COPY.empty.sourcePage;
  const origin = ORIGINS[from] || ORIGINS.opportunities;
  const known = !!contract;
  return (
    <div className="page src-page">
      <PageHeader
        eyebrow={SOURCE_COPY.eyebrow}
        breadcrumb={known ? <Breadcrumb items={[{ label: origin.crumb, href: origin.href }, { label: contract.title, href: `#/contracts/${encodeURIComponent(contract.id)}` }, { label: t.title, href: window.location.hash || '#/opportunities' }]} /> : undefined}
        title={t.title}
        description={<p>{t.body}</p>}
        actions={<Button type="button" leftIcon="folder-open" onClick={() => navigate(known ? `#/contracts/${encodeURIComponent(contract.id)}` : '#/contracts')}>{known ? t.button : SOURCE_COPY.openContracts}</Button>}
      />
    </div>
  );
}

export default function Source({ contractId, extractionId, from }) {
  const { estate, state, actions } = useEstate();
  const ui = useUI();
  const contract = contractId ? estate.contractsById[contractId] : null;
  const extraction = extractionId ? estate.extractionsById[extractionId] : null;
  const doc = contract ? estate.data.documents[contract.documentId] : null;
  const prov = extraction && contract && extraction.contractId === contract.id && extraction.provenance ? extraction.provenance[0] : null;
  const blocks = prov && doc ? doc.pages[prov.page] : null;
  const found = !!(blocks && blocks.some((b) => b.extractionIds && b.extractionIds.includes(extraction.id)));

  usePageTitle(found ? prov.clauseRef : undefined);

  const markRef = useRef(null);
  const extractionKey = found ? extraction.id : null;

  // Land on the clause: centre the cited block, then focus the mark. The router moves focus to the h1 one frame after a
  // route change, so the mark takes focus two frames later and wins. Re-centre once when the fonts arrive (they move the text)
  // unless the reader has already scrolled.
  useEffect(() => {
    if (!extractionKey) return undefined;
    const main = document.getElementById('shell-main') || document;
    let moved = false;
    let alive = true;
    let r2 = 0;
    const centre = () => { const m = markRef.current; if (m) centreInMain(m); };
    const onMove = () => { moved = true; };
    ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach((ev) => main.addEventListener(ev, onMove, { passive: true }));
    centre();
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => { const m = markRef.current; if (alive && m) m.focus({ preventScroll: true }); });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive && !moved) centre(); });
    return () => {
      alive = false;
      cancelAnimationFrame(r1); cancelAnimationFrame(r2);
      ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach((ev) => main.removeEventListener(ev, onMove));
    };
  }, [extractionKey]);

  // The panel sticks while you read the page, but only when the whole panel fits in the window, so no control is ever out of reach.
  const panelRef = useRef(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    const panel = panelRef.current;
    const main = document.getElementById('shell-main');
    if (!panel || !main) return undefined;
    const check = () => setSticky(window.innerWidth >= 1100 && panel.offsetHeight + 88 <= main.clientHeight);
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(check);
    ro.observe(panel); ro.observe(main);
    return () => ro.disconnect();
  }, [extractionKey]);

  const list = contract ? (estate.extractionsByContract[contract.id] || []) : [];
  const index = found ? list.findIndex((x) => x.id === extraction.id) : -1;
  const question = found ? estate.data.questions.find((q) => q.id === extraction.questionId) : null;
  const answer = useMemo(() => (found ? answerFor(extraction, contract) : null), [found, extraction, contract]);

  if (!found) return <Missing contract={contract} from={from} />;

  const origin = ORIGINS[from] || ORIGINS.opportunities;
  const backHref = backHrefOf(origin, contract);
  const hand = state.handcheck[extraction.id] || null;
  const summary = handcheckSummary(state);
  const pageCount = doc.pageCount;
  const labelId = `src-cited-${extraction.id}`;
  const stepTo = (target) => navigate(hrefFor('source', { seg: [contract.id, target.id], query: from ? { from } : {} }), { replace: true });
  const prev = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;
  const fieldName = sentence(fieldLabel(extraction.fieldKey));
  const notFoundAnswer = answer.kind === 'not_found';
  // No maximum stated: the answer fell back to the contract value, so point at the clause that states it.
  const valueClause = notFoundAnswer && extraction.fieldKey === 'maximumValue' ? evidenceForField(contract.id, 'awardedTotalValue') : null;

  const mark = (value) => {
    const nextValue = hand === value ? null : value;
    actions.setHandcheck(extraction.id, nextValue);
    if (nextValue) ui.toast({ tone: nextValue === 'correct' ? 'success' : 'info', title: COPY.toasts.handcheck[nextValue] });
    else ui.toast({ tone: 'info', title: SOURCE_COPY.cleared });
  };

  return (
    <div className="page src-page">
      <PageHeader
        eyebrow={SOURCE_COPY.eyebrow}
        breadcrumb={<Breadcrumb items={[
          { label: origin.crumb, href: origin.href },
          { label: contract.title, href: `#/contracts/${encodeURIComponent(contract.id)}` },
          { label: prov.clauseRef, href: window.location.hash || '#/opportunities' },
        ]} />}
        title={prov.clauseRef}
        description={<p>{COPY.pages.source.subtitle(contract, prov.page, pageCount)}</p>}
      />

      <div className="src-toolbar" role="group" aria-label={SOURCE_COPY.toolbarLabel}>
        <div className="src-toolbar__group">
          <Button type="button" variant="outline" leftIcon="arrow-left" onClick={() => navigate(backHref)}>{origin.back}</Button>
          <Button type="button" variant="outline" leftIcon="folder-open" onClick={() => navigate(`#/contracts/${encodeURIComponent(contract.id)}`)}>{COPY.buttons.openContract}</Button>
        </div>
        <div className="src-toolbar__group src-stepper" role="group" aria-label={SOURCE_COPY.stepperLabel}>
          <Button type="button" variant="outline" leftIcon="arrow-left" disabled={!prev} onClick={() => prev && stepTo(prev)}>{COPY.buttons.previousAnswer}</Button>
          <span className="src-stepper__count" aria-live="polite">{SOURCE_COPY.stepCount(index + 1, list.length)}</span>
          <Button type="button" variant="outline" rightIcon="arrow-right" disabled={!next} onClick={() => next && stepTo(next)}>{COPY.buttons.nextAnswer}</Button>
        </div>
      </div>

      <div className="src-layout">
        <section className="src-stage" aria-labelledby="src-page-h">
          <h2 id="src-page-h" className="sr-only">{SOURCE_COPY.pageHeading(prov.page, pageCount)}</h2>
          <article className="src-paper" aria-labelledby="src-page-h" data-testid="source-page">
            {blocks.map((b, i) => <PageBlock key={i} block={b} extractionId={extraction.id} markRef={markRef} labelId={labelId} />)}
          </article>
        </section>

        <section ref={panelRef} className={'src-panel' + (sticky ? ' src-panel--sticky' : '')} aria-labelledby="src-q-h">
          <div className="src-panel__block">
            <p className="ds-caption-caps src-eyebrow">{SOURCE_COPY.questionOf(Number(question.id.replace(/\D/g, '')), estate.data.questions.length)}</p>
            <h2 id="src-q-h" className="src-question">{question.label}</h2>
            <p className="src-help">{question.help}</p>
          </div>

          <div className="src-panel__block src-answer">
            <h3 className="ds-caption-caps src-eyebrow">{SOURCE_COPY.answerCaption(fieldName)}</h3>
            <p className={'src-answer__text' + (answer.rows ? ' sr-only' : '')} data-testid="source-answer">{answer.text}</p>
            {answer.rows && (
              <table className="src-rates">
                <caption className="sr-only">Rate card</caption>
                <thead><tr><th scope="col">Item</th><th scope="col">Unit</th><th scope="col" className="num">Rate</th></tr></thead>
                <tbody>{answer.rows.map((r) => <tr key={r.item}><th scope="row">{r.item}</th><td>{r.unit}</td><td className="num">{r.rate}</td></tr>)}</tbody>
              </table>
            )}
            <div className="src-answer__meta">
              <ConfidencePill score={extraction.confidence} />
              <span className="src-score">{SOURCE_COPY.confidenceScore(extraction.confidence)}</span>
              {notFoundAnswer && <Pill tone="neutral" icon="circle-question">{SOURCE_COPY.notFound}</Pill>}
            </div>
            {valueClause && <p className="src-valueclause"><ClauseLink contractId={valueClause.contractId} extractionId={valueClause.extractionId} page={valueClause.page} from={from || undefined}>{SOURCE_COPY.valueClause(valueClause.page)}</ClauseLink></p>}
          </div>

          <div className="src-panel__block">
            <h3 className="ds-caption-caps src-eyebrow">{SOURCE_COPY.whereFrom}</h3>
            <dl className="src-facts">
              <div><dt>{SOURCE_COPY.clause}</dt><dd className="src-mono" data-testid="source-clause">{prov.clauseRef}</dd></div>
              <div><dt>{SOURCE_COPY.page}</dt><dd data-testid="source-page-of">{SOURCE_COPY.pageOf(prov.page, pageCount)}</dd></div>
              <div><dt>{SOURCE_COPY.document}</dt><dd data-testid="source-document">{doc.title}</dd></div>
            </dl>
            <figure className="src-quote">
              <figcaption className="src-quote__cap">{SOURCE_COPY.quote}</figcaption>
              <blockquote data-testid="source-quote">{prov.quote}</blockquote>
            </figure>
            <p className="src-illustrative"><i className="fa-solid fa-circle-info" aria-hidden="true" />{COPY.illustrativeLabel}</p>
          </div>

          <div className="src-panel__block">
            <h3 className="ds-caption-caps src-eyebrow">{SOURCE_COPY.checkHeading}</h3>
            <div className="src-actions">
              <Button type="button" variant="outline" leftIcon={hand === 'correct' ? 'circle-check' : 'check'} aria-pressed={hand === 'correct'}
                style={hand === 'correct' ? { borderColor: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } : undefined} onClick={() => mark('correct')}>{COPY.buttons.markCorrect}</Button>
              <Button type="button" variant="outline" leftIcon={hand === 'incorrect' ? 'circle-xmark' : 'xmark'} aria-pressed={hand === 'incorrect'}
                style={hand === 'incorrect' ? { borderColor: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } : undefined} onClick={() => mark('incorrect')}>{COPY.buttons.markIncorrect}</Button>
            </div>
            <p className="src-status" data-testid="source-handcheck">{hand ? SOURCE_COPY.marked[hand] : SOURCE_COPY.unmarked} {handcheckLine(summary.checked, summary.total)}.</p>
          </div>

        </section>
      </div>
    </div>
  );
}
