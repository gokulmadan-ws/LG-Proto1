// Supplier matches (#/spend/matches): every distinct payee name in the spend files, how it was matched, and what you have decided.
//   Query: ?status=review|accepted|unmatched|yours   filter chip (shareable)
// Conservative counting (R45): a Suggested or Unmatched payee never counts towards a cap, a flag or the headline until you confirm it.
// Confirm and Reject call actions.setDecision, which recomputes the whole estate and persists in localStorage (kontor-matches).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEstate, computeEstate } from '../../lib/estate.js';
import { useRoute, setQuery, hrefFor } from '../../lib/router.js';
import { useUI } from '../../lib/ui-context.jsx';
import { COPY, capStateLabel, matchConfirmedToast, matchMethodLabel, matchRejectedToast, matchSuggestionHelp } from '../../lib/copy.js';
import { fmtGBP, joinList, plural } from '../../lib/format.js';
import { DataTable, EmptyState, Chip, Panel, Pill } from '../../ui/index.js';
import DS from '../../ui/ds.js';
import { MATCH } from './strings.js';

const { Button } = DS;
const STATUS_VALUES = ['review', 'accepted', 'unmatched', 'yours'];
const GROUP_OF = { suggested: 'review', auto_accepted: 'accepted', unmatched: 'unmatched', confirmed: 'yours', rejected: 'yours' };
// Default order: what needs you first (Suggested), then your own decisions, then Unmatched, then Accepted. Ties: largest total first.
const PRIORITY = { suggested: 0, confirmed: 1, rejected: 2, unmatched: 3, auto_accepted: 4 };
const PILL = {
  auto_accepted: { tone: 'neutral', icon: 'circle-check' },
  suggested: { tone: 'info', icon: 'circle-question' },
  unmatched: { tone: 'neutral', icon: 'link-slash' },
  confirmed: { tone: 'success', icon: 'circle-check' },
  rejected: { tone: 'neutral', icon: 'ban' },
};

/** "Match confirmed. 6 payments (£300,000) now count towards Grounds maintenance." split into the toast's title and description. */
const splitToast = (text) => { const i = text.indexOf('. '); return i === -1 ? { title: text } : { title: text.slice(0, i + 1), description: text.slice(i + 2) }; };

const compare = (key, dir) => (a, b) => {
  const va = a.sortValue[key], vb = b.sortValue[key];
  const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
  return (dir === 'desc' ? -c : c) || b.totalGBP - a.totalGBP || a.rawName.localeCompare(b.rawName);
};

export default function MatchesTab() {
  const { estate, state, actions } = useEstate();
  const ui = useUI();
  const { query } = useRoute();
  const [sort, setSort] = useState({ key: 'status', dir: 'asc' });
  const focusAfter = useRef(null);   // payee name whose row button should take focus once the decision has re-rendered the table
  const statusParam = query.get('status');
  const status = STATUS_VALUES.includes(statusParam) ? statusParam : null;
  const supplierName = (id) => { const s = estate.data.suppliers.find((x) => x.id === id); return s ? s.legalName : null; };

  const all = useMemo(() => estate.matchList.map((m) => {
    const supplier = m.supplierId ? supplierName(m.supplierId) : null;
    return {
      ...m, id: m.rawName, supplier, group: GROUP_OF[m.status],
      sortValue: { name: m.rawName.toLowerCase(), supplier: supplier || '~', method: matchMethodLabel(m.method), score: m.score, status: PRIORITY[m.status], payments: m.paymentCount, total: m.totalGBP },
    };
  }), [estate]);                                         // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => { const c = { all: all.length, review: 0, accepted: 0, unmatched: 0, yours: 0 }; all.forEach((r) => { c[r.group] += 1; }); return c; }, [all]);
  const rows = useMemo(() => (status ? all.filter((r) => r.group === status) : all).slice().sort(compare(sort.key, sort.dir)), [all, status, sort]);
  const firstSuggested = rows.findIndex((r) => r.status === 'suggested');

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'total' || key === 'payments' || key === 'score' ? 'desc' : 'asc' }));

  // The button you pressed is replaced by another one (Confirm becomes Undo, and back), so focus follows the row. If the row left the filtered list, focus the active chip.
  useEffect(() => {
    const name = focusAfter.current;
    if (!name) return;
    focusAfter.current = null;
    const rowBtn = Array.from(document.querySelectorAll('[data-match-focus]')).find((el) => el.getAttribute('data-match-focus') === name);
    const target = rowBtn || document.querySelector('.mt-chips [aria-pressed="true"]');
    if (target) target.focus();
  }, [estate]);

  const confirmMatch = (m) => {
    focusAfter.current = m.rawName;
    const next = computeEstate({ decisions: { ...state.decisions, [m.rawName]: 'confirm' }, triage: state.triage, assumptions: state.assumptions });
    const ids = [...new Set(next.attributed.filter((a) => a.payment.supplierNameRaw === m.rawName && a.contractId).map((a) => a.contractId))];
    actions.setDecision(m.rawName, 'confirm');
    if (ids.length) ui.toast({ tone: 'success', ...splitToast(matchConfirmedToast(m, joinList(ids.map((id) => next.contractsById[id].title)))) });
    else ui.toast({ tone: 'success', ...MATCH.confirmNoContract(m.rawName, plural(m.paymentCount, 'payment'), fmtGBP(m.totalGBP), supplierName(m.supplierId) || 'the supplier') });
  };
  const rejectMatch = (m) => {
    focusAfter.current = m.rawName;
    actions.setDecision(m.rawName, 'reject');
    ui.toast({ tone: 'info', ...splitToast(matchRejectedToast(m.rawName)) });
  };
  const undoDecision = (m) => {
    focusAfter.current = m.rawName;
    actions.setDecision(m.rawName, null);
    ui.toast({ tone: 'info', ...MATCH.undone(m.rawName) });
  };

  // What your confirmed matches changed, derived from the live estate so it survives a reload.
  const effects = useMemo(() => all.filter((r) => r.status === 'confirmed').flatMap((r) => {
    const ids = [...new Set(estate.attributed.filter((a) => a.payment.supplierNameRaw === r.rawName && a.contractId).map((a) => a.contractId))];
    return ids.map((cid) => ({ key: r.rawName + cid, name: r.rawName, cid, contract: estate.contractsById[cid], cap: estate.derived[cid].cap }));
  }), [all, estate]);

  // The decision sits in the Matched supplier cell, under the suggestion it is about, so it is on screen without sideways scrolling at any width.
  const decision = (r) => {
    if (r.status === 'suggested') {
      const first = rows.indexOf(r) === firstSuggested;
      return (
        <span className="mt-actions">
          <Button variant={first ? undefined : 'outline'} size="sm" className="kx-hit" leftIcon="check" data-match-focus={r.rawName} onClick={() => confirmMatch(r)}>{MATCH.confirm}<span className="sr-only">, {r.rawName}</span></Button>
          <Button variant="outline" size="sm" className="kx-hit" leftIcon="xmark" onClick={() => rejectMatch(r)}>{MATCH.reject}<span className="sr-only">, {r.rawName}</span></Button>
        </span>
      );
    }
    if (r.status === 'confirmed' || r.status === 'rejected') {
      return <span className="mt-actions"><Button variant="ghost" size="sm" className="kx-hit" leftIcon="rotate-left" data-match-focus={r.rawName} onClick={() => undoDecision(r)}>{MATCH.undo}<span className="sr-only">, {r.rawName}</span></Button></span>;
    }
    return null;
  };
  const cols = [
    { key: 'name', label: MATCH.cols.name, sortable: true, rowHeader: true, minWidth: 170, render: (r) => <span className="mt-name">{r.rawName}</span> },
    { key: 'supplier', label: MATCH.cols.supplier, sortable: true, minWidth: 250, render: (r) => (
      <span className="mt-supplier">
        <span className={r.supplier ? undefined : 'mt-none'}>{r.status === 'suggested' ? r.supplier : r.supplier || MATCH.noMatch}</span>
        {r.status === 'suggested' && <span className="mt-help">{matchSuggestionHelp(r)}</span>}
        {r.status === 'confirmed' && <span className="mt-help">{MATCH.helpConfirmed}</span>}
        {r.status === 'rejected' && <span className="mt-help">{MATCH.helpRejected}</span>}
        {decision(r)}
      </span>
    ) },
    { key: 'method', label: MATCH.cols.method, sortable: true, nowrap: true, render: (r) => matchMethodLabel(r.method) },
    { key: 'score', label: MATCH.cols.score, sortable: true, num: true, render: (r) => r.score.toFixed(2) },
    { key: 'status', label: MATCH.cols.status, sortable: true, nowrap: true, render: (r) => <Pill tone={PILL[r.status].tone} icon={PILL[r.status].icon}>{MATCH.status[r.status]}</Pill> },
    { key: 'payments', label: MATCH.cols.payments, sortable: true, num: true, render: (r) => r.paymentCount.toLocaleString('en-GB') },
    { key: 'total', label: MATCH.cols.total, sortable: true, num: true, nowrap: true, render: (r) => fmtGBP(r.totalGBP) },
  ];

  const empty = (() => {
    if (status === 'review') return <EmptyState as="h3" icon="circle-check" title={COPY.empty.matches.split('. ')[0] + '.'} action={<Button variant="outline" onClick={() => setQuery({ status: null })}>{MATCH.showAllPayees}</Button>}>{COPY.empty.matches.split('. ').slice(1).join('. ')}</EmptyState>;
    if (status === 'yours') return <EmptyState as="h3" icon="hand-pointer" title={MATCH.emptyYours.title} action={<Button variant="outline" onClick={() => setQuery({ status: null })}>{MATCH.showAllPayees}</Button>}>{MATCH.emptyYours.body}</EmptyState>;
    return <EmptyState as="h3" icon="filter-circle-xmark" title={MATCH.emptyFilter.title} action={<Button variant="outline" onClick={() => setQuery({ status: null })}>{MATCH.showAllPayees}</Button>}>{MATCH.emptyFilter.body}</EmptyState>;
  })();

  const chip = (key, label) => <Chip key={key} pressed={(status || 'all') === key} count={counts[key]} onClick={() => setQuery({ status: key === 'all' ? null : key })}>{label}</Chip>;
  const { accept, suggest } = { accept: estate.opts.autoAcceptScore, suggest: estate.opts.suggestScore };

  return (
    <>
      <Panel as="h2" title={MATCH.panelTitle} description={MATCH.panelDescription(all.length)} padded={false}>
        <div className="mt-intro">
          <p className="mt-rule"><i className="fa-solid fa-circle-info" aria-hidden="true" /> <strong>{COPY.matching.notCounted}</strong></p>
          <details className="mt-how">
            <summary><i className="fa-solid fa-chevron-right mt-how__chev" aria-hidden="true" /><span>{MATCH.disclosureTitle}</span></summary>
            <div className="mt-how__body">
              <p>{COPY.matching.body}</p>
              <h3 className="mt-how__h">{MATCH.thresholdsTitle}</h3>
              <ul className="mt-thresholds">
                {MATCH.thresholds(accept, suggest).map((t) => <li key={t.id}><span className="mt-thresholds__range">{t.range}</span><span>{t.text}</span></li>)}
              </ul>
              <h3 className="mt-how__h">{MATCH.attributionTitle}</h3>
              <p>{COPY.matching.attribution}</p>
              <p><a className="method-link" href={hrefFor('method', { query: { s: 'matching' } })}>{COPY.caveat.link}</a></p>
            </div>
          </details>
          <div className="mt-chips" role="group" aria-label={MATCH.filterLabel}>
            {chip('all', MATCH.chips.all)}{chip('review', MATCH.chips.review)}{chip('accepted', MATCH.chips.accepted)}{chip('unmatched', MATCH.chips.unmatched)}{chip('yours', MATCH.chips.yours)}
          </div>
          {effects.length > 0 && (
            <div className="mt-effects" role="status">
              <h3 className="mt-effects__h">{MATCH.effectHeading}</h3>
              <ul>
                {effects.map((e) => (
                  <li key={e.key}><i className="fa-solid fa-circle-check" aria-hidden="true" /> {MATCH.effectConfirmed(e.contract.title, e.cap.utilisation, capStateLabel(e.cap), e.cap.excessGBP)}{' '}
                    <a className="mt-link" href={hrefFor('spend', { query: { state: e.cap.state === 'over' ? 'over' : e.cap.state === 'near' ? 'close' : 'within' } })}>{MATCH.effectLink}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {rows.length === 0 ? <div className="mt-empty">{empty}</div> : (
          <DataTable className="mt-table" caption="Payee names, how they were matched and your decisions" columns={cols} rows={rows} rowKey="id" sort={sort} onSort={onSort} />
        )}
        <p className="mt-foot">{MATCH.sortHelp}</p>
      </Panel>
    </>
  );
}
