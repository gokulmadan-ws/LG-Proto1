// V2: Opportunities (#/opportunities). The headline screen: one ranked list of every flag, with the clause and page behind each.
//
//   default export: <Opportunities />    rendered inside <main id="shell-main"> by App.jsx, no props.
//   Query string (every filter is shareable and survives reload and Back):
//     ?type=overCap|nearCap|renewal|uplift   one flag type (chip)
//     ?status=open|reviewed|all              review status (default open = To investigate and Under review)
//     ?q=<text>                              search over contract title, supplier and contract id (debounced into the address)
//     ?sort=value|date|type                  Highest value first (default, the engine's rank), Soonest action date, Type
//     ?flag=<flagId>                         opens the FlagDrawer (mounted globally, works on every route)
//
// Numbers and sentences come from useEstate(), the engine output and src/lib/copy.js. This file only filters, sorts, sums the visible counted rows
// (R27) and lays them out. Strings that the copy deck does not hold (toolbar labels, sort labels, totals sentence, watch list intro, export toast)
// live in LABELS below, in the deck's voice.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEstate } from '../lib/estate.js';
import { useRoute, setQuery } from '../lib/router.js';
import { useUI } from '../lib/ui-context.jsx';
import { isCounted } from '../lib/engine.js';
import { evidenceFor, sourceHref } from '../lib/evidenceFor.js';
import {
  COPY, actionByText, basisLabel, capUsedText, confidenceLabel, flagTypeLabel, fmtGBP, reasonFor, reviewStatusLabel, watchNote,
} from '../lib/copy.js';
import { PageHeader, MethodLink } from '../components/index.js';
import DS from '../ui/ds.js';
import { Panel, EmptyState } from '../ui/index.js';
import {
  ChartTable, ConfidenceBadge, FlagBadge, FlagFilterChips, OpportunityList, ReviewBadge, opportunityCounts, opportunityItems,
} from '../charts/index.js';
import './Opportunities.css';

const { Button, Input, Select } = DS;

/* ---------------------------------------------------------------- strings the copy deck does not hold */

const LABELS = {
  listTitle: 'Ranked opportunities',
  toolbar: 'Filter opportunities',
  search: 'Search', searchPlaceholder: 'Contract or supplier',
  status: 'Status', sortBy: 'Sort by',
  statusOptions: [{ value: 'open', label: 'Open' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'all', label: 'All' }],
  sortOptions: [{ value: 'value', label: 'Highest value first' }, { value: 'date', label: 'Soonest action date' }, { value: 'type', label: 'Type' }],
  showTable: 'Show table', showList: 'Show list',
  seeCalculation: COPY.buttons.seeCalculation,
  watchTitle: 'Watch list',
  watchIntro: 'Contracts that are close to their cap but not projected to reach it before they end. They have an indicative value of £0 and are not counted in the total.',
  exportDone: (n, file) => ({ title: 'Opportunities exported.', description: `${n} ${n === 1 ? 'row' : 'rows'} saved as ${file}. Every row is labelled as sample data.` }),
  exportNothing: { title: 'Nothing to export.', description: 'No opportunities match these filters. Clear the filters and try again.' },
  showReviewed: 'Show reviewed',
  openSettings: 'Open settings',
};

const STATUS_VALUES = new Set(['open', 'reviewed', 'all']);
const SORT_VALUES = new Set(['value', 'date', 'type']);
const TYPE_VALUES = new Set(['overCap', 'nearCap', 'renewal', 'uplift']);
const TYPE_ORDER = { overCap: 0, nearCap: 1, renewal: 2, uplift: 3 };   // the chip order
const OPEN_STATUSES = new Set(['to_investigate', 'under_review']);
const isOpenStatus = (s) => OPEN_STATUSES.has(s || 'to_investigate');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ---------------------------------------------------------------- pure helpers (also used by the export) */

/** Deterministic sorters. Ties always fall back to the overall rank, which is itself deterministic (value, severity, action date, id). */
const SORTERS = {
  value: (a, b) => a.rank - b.rank,
  date: (a, b) => {
    const da = a.actionBy || '9999-12-31', db = b.actionBy || '9999-12-31';      // rows with no action date go last
    return da < db ? -1 : da > db ? 1 : a.rank - b.rank;
  },
  type: (a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.rank - b.rank,
};

/** Search: every word you type must appear in the contract title, the supplier or the contract id. */
function matcher(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return () => true;
  return (it) => { const hay = `${it.title} ${it.supplier} ${it.contractId}`.toLowerCase(); return words.every((w) => hay.includes(w)); };
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

/** CSV text for the rows you can see (R29): 15 columns, one row per opportunity, labelled as sample data on every row. */
function buildCsv(rows, estate, asOf) {
  const head = ['Rank', 'Type', 'Contract id', 'Contract', 'Supplier', 'Indicative GBP', 'Basis', 'Reason', 'Action by', 'Confidence', 'Status', 'Page', 'Clause', 'Data', 'As at'];
  const lines = [head.map(csvCell).join(',')];
  rows.forEach((r) => {
    const f = r.flag, t = evidenceFor(f);
    lines.push([
      r.rank, flagTypeLabel(f), f.contractId, r.title, r.supplier, f.indicativeGBP, basisLabel(f), r.reason, f.actionBy || '', confidenceLabel(f.confidence),
      reviewStatusLabel(f.status), t ? t.page : '', t ? t.clauseRef : '', `Sample data, as at ${asOf}`, asOf,
    ].map(csvCell).join(','));
  });
  return lines.join('\r\n') + '\r\n';
}

function download(name, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------- the page */

export default function Opportunities() {
  const { estate } = useEstate();
  const ui = useUI();
  const { query } = useRoute();

  const typeParam = query.get('type');
  const type = TYPE_VALUES.has(typeParam) ? typeParam : null;
  const statusParam = query.get('status');
  const status = STATUS_VALUES.has(statusParam) ? statusParam : 'open';
  const sortParam = query.get('sort');
  const sort = SORT_VALUES.has(sortParam) ? sortParam : 'value';
  const qParam = query.get('q') || '';

  // The search box keeps its own text so typing never waits for the address bar; the address follows 250 ms later (so the link you share has it).
  const [text, setText] = useState(qParam);
  const pushed = useRef(qParam.trim());
  useEffect(() => { if (qParam.trim() !== pushed.current) { pushed.current = qParam.trim(); setText(qParam); } }, [qParam]);
  useEffect(() => {
    const t = setTimeout(() => { const v = text.trim(); if (v !== pushed.current) { pushed.current = v; setQuery({ q: v || null }); } }, 250);
    return () => clearTimeout(t);
  }, [text]);
  const search = text.trim();

  const totalsRef = useRef(null);
  const [view, setView] = useState('list');

  // All ranked flags, open and reviewed, in the engine's order. Filtering and sorting are ours; the chart never re-sorts.
  const all = useMemo(() => {
    const clauseFor = (f) => { const t = evidenceFor(f); return t ? { label: COPY.buttons.viewClausePage(t.page), href: sourceHref(t, 'opportunities') } : null; };
    const extraFor = (f, c) => (
      <button type="button" className="kviz-textlink opp-calc" onClick={() => setQuery({ flag: f.id })}>
        <i className="fa-solid fa-calculator" aria-hidden="true" /> {LABELS.seeCalculation}<span className="sr-only">, {c.title}</span>
      </button>
    );
    return opportunityItems(estate, { clauseFor, extraFor }).map((it) => {
      const flag = estate.flagsById[it.id];
      return { ...it, flag, contractId: flag.contractId, actionBy: flag.actionBy || null };
    });
  }, [estate]);

  const bySearch = useMemo(() => all.filter(matcher(search)), [all, search]);
  const statusOk = (it) => (status === 'all' ? true : status === 'open' ? isOpenStatus(it.status) : !isOpenStatus(it.status));
  const counts = useMemo(() => opportunityCounts(bySearch.filter(statusOk)), [bySearch, status]);        // chip counts: search and status applied, type not
  const shown = useMemo(
    () => bySearch.filter(statusOk).filter((it) => !type || it.type === type).sort(SORTERS[sort]),
    [bySearch, status, type, sort],
  );

  // Totals bar (R27): recomputed from the visible rows that count towards the headline.
  const counted = shown.filter((it) => isCounted(it.flag));
  const totalGBP = counted.reduce((s, it) => s + it.value, 0);
  const byBasis = ['one_off', 'projected', 'per_year'].map((b) => ({ basis: b, gbp: counted.filter((it) => it.basis === b).reduce((s, it) => s + it.value, 0) })).filter((x) => x.gbp > 0);
  const reviewedShown = shown.filter((it) => !isOpenStatus(it.status));
  const reviewedGBP = reviewedShown.reduce((s, it) => s + it.value, 0);
  const hiddenReviewed = status === 'open' ? bySearch.filter((it) => (!type || it.type === type) && !isOpenStatus(it.status)).length : 0;

  const openCount = all.filter((it) => isOpenStatus(it.status)).length;
  const filtersOn = !!type || status !== 'open' || !!search;
  const clearFilters = () => {
    pushed.current = '';
    setText('');
    setQuery({ type: null, status: null, q: null });
    requestAnimationFrame(() => totalsRef.current && totalsRef.current.focus({ preventScroll: true }));
  };
  const open = (row) => setQuery({ flag: row.id });

  const exportCsv = () => {
    if (!shown.length) { ui.toast({ tone: 'warning', ...LABELS.exportNothing }); return; }
    const file = `kontor-opportunities-${estate.asOf}.csv`;
    try {
      download(file, buildCsv(shown, estate, estate.asOf));
      ui.toast({ tone: 'success', ...LABELS.exportDone(shown.length, file) });
    } catch (e) {
      const [title, ...rest] = COPY.errors.export.split('. ');
      ui.toast({ tone: 'error', title: title + '.', description: rest.join('. ') });        // What, why, how (copy deck 7.9); errors stay until closed
    }
  };

  const tableData = useMemo(() => ({
    columns: [
      { key: 'rank', label: 'Rank', align: 'right' },
      { key: 'type', label: 'Type' },
      { key: 'title', label: 'Contract', render: (r) => <button type="button" className="kviz-textlink opp-linkbtn" onClick={() => open(r)}>{r.title}</button> },
      { key: 'supplier', label: 'Supplier' },
      { key: 'value', label: 'Indicative value', align: 'right', render: (r) => fmtGBP(r.value) },
      { key: 'basis', label: 'Basis', render: (r) => basisLabel(r.flag) },
      { key: 'act', label: 'Act by', render: (r) => actionByText(r.flag) || 'No date' },
      { key: 'confidence', label: 'Confidence', render: (r) => confidenceLabel(r.confidence) },
      { key: 'status', label: 'Review status', render: (r) => reviewStatusLabel(r.status) },
      { key: 'clause', label: 'Clause', render: (r) => (r.clauseHref ? <a className="kviz-textlink" href={r.clauseHref}>{r.clauseLabel}</a> : '') },
    ],
    rows: shown.map((it) => ({ ...it, type: flagTypeLabel(it.flag) })),
  }), [shown]);

  const empty = shown.length === 0;
  const allReviewed = empty && !filtersOn && openCount === 0;

  return (
    <div className="page opp">
      <PageHeader
        eyebrow={COPY.council}
        title={COPY.pages.opportunities.title}
        asAt
        description={<p>{COPY.pages.opportunities.subtitle}</p>}
        actions={<Button variant="primary" leftIcon="download" onClick={exportCsv}>{COPY.buttons.exportOpportunities}</Button>}
      />
      <p className="opp-caveat">
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        <span>{COPY.caveat.long} <MethodLink section="indicative" /></span>
      </p>

      <Panel
        as="h2" title={LABELS.listTitle} padded={false} id="opp-list-title"
        actions={(
          <button type="button" className="kviz-btn" aria-pressed={view === 'table'} onClick={() => setView(view === 'table' ? 'list' : 'table')}>
            <i className={'fa-solid fa-' + (view === 'table' ? 'list' : 'table')} aria-hidden="true" />
            {view === 'table' ? LABELS.showList : LABELS.showTable}
          </button>
        )}
      >
        <div className="opp-toolbar" role="search" aria-label={LABELS.toolbar}>
          <FlagFilterChips counts={counts} value={type} onChange={(t) => setQuery({ type: t === type ? null : t })} />
          <div className="opp-controls">
            <label className="opp-control opp-control--search">
              <span className="opp-control__label">{LABELS.search}</span>
              <Input type="text" inputMode="search" autoComplete="off" leftIcon="magnifying-glass" placeholder={LABELS.searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <label className="opp-control opp-control--status">
              <span className="opp-control__label">{LABELS.status}</span>
              <Select style={{ width: 'var(--opp-w)' }} value={status} options={LABELS.statusOptions} onChange={(e) => setQuery({ status: e.target.value === 'open' ? null : e.target.value })} />
            </label>
            <label className="opp-control opp-control--sort">
              <span className="opp-control__label">{LABELS.sortBy}</span>
              <Select style={{ width: 'var(--opp-w)' }} value={sort} options={LABELS.sortOptions} onChange={(e) => setQuery({ sort: e.target.value === 'value' ? null : e.target.value })} />
            </label>
            {filtersOn && <Button variant="outline" leftIcon="filter-circle-xmark" onClick={clearFilters} className="opp-clear">{COPY.buttons.clearFilters}</Button>}
          </div>
        </div>

        <div className="opp-totals" ref={totalsRef} tabIndex={-1} role="status" aria-live="polite" data-opp-fallback>
          <p className="opp-totals__main">
            Showing <strong>{plural(shown.length, 'opportunity', 'opportunities')}</strong>, <strong>{fmtGBP(totalGBP)}</strong> indicative
          </p>
          {byBasis.length > 0 && (
            <p className="opp-totals__basis">
              {byBasis.map((x, i) => <span key={x.basis}>{i > 0 && <span className="opp-totals__sep" aria-hidden="true"> · </span>}{fmtGBP(x.gbp)} {basisLabel(x.basis).toLowerCase()}</span>)}
            </p>
          )}
          {reviewedShown.length > 0 && <p className="opp-totals__note">{reviewedShown.length} reviewed, {fmtGBP(reviewedGBP)} not counted.</p>}
          {hiddenReviewed > 0 && (
            <p className="opp-totals__note">
              {plural(hiddenReviewed, 'reviewed opportunity is', 'reviewed opportunities are')} hidden.{' '}
              <button type="button" className="kviz-textlink opp-linkbtn" onClick={() => setQuery({ status: 'reviewed' })}>{LABELS.showReviewed}</button>
            </p>
          )}
        </div>

        <div className="opp-body">
          {empty ? (
            allReviewed
              ? <EmptyState as="h3" icon="circle-check" title={COPY.empty.opportunitiesAllReviewed.split('. ')[0] + '.'} action={<Button variant="outline" leftIcon="gear" onClick={(e) => ui.openSettings(e.currentTarget)}>{LABELS.openSettings}</Button>}>
                {COPY.empty.opportunitiesAllReviewed.split('. ').slice(1).join('. ')}
              </EmptyState>
              : <EmptyState as="h3" icon="magnifying-glass" title={COPY.empty.opportunitiesNoMatch.title}
                action={<Button variant="outline" leftIcon="filter-circle-xmark" onClick={clearFilters}>{COPY.empty.opportunitiesNoMatch.button}</Button>}>
                {COPY.empty.opportunitiesNoMatch.body(openCount)}
              </EmptyState>
          ) : view === 'table'
            ? <ChartTable {...tableData} caption={LABELS.listTitle} />
            : <OpportunityList items={shown} onOpen={open} />}
        </div>
      </Panel>

      <WatchList estate={estate} onOpen={(id) => setQuery({ flag: id })} />
    </div>
  );
}

/* ---------------------------------------------------------------- Watch list (R28) */

function WatchList({ estate, onOpen }) {
  const rows = estate.watch;
  return (
    <Panel as="h2" title={LABELS.watchTitle} count={rows.length} description={LABELS.watchIntro} padded={false} id="opp-watch-title">
      {rows.length === 0 ? (
        <div className="opp-watch__empty"><p>{COPY.empty.watch}</p></div>
      ) : (
        <ul className="opp-watch" aria-labelledby="opp-watch-title">
          {rows.map((f) => {
            const c = estate.contractsById[f.contractId], d = estate.derived[f.contractId], t = evidenceFor(f);
            const reviewed = !isOpenStatus(f.status);
            return (
              <li key={f.id}>
                <div className={'kviz-row opp-watch__row' + (reviewed ? ' is-muted' : '')}>
                  <span className="opp-watch__rank" aria-hidden="true" />
                  <span className="opp-watch__type"><FlagBadge type={f.type} label={flagTypeLabel(f)} muted={reviewed} /></span>
                  <span className="opp-watch__text">
                    <button type="button" className="kviz-row__link opp-watch__name" onClick={() => onOpen(f.id)} data-flag-row={f.id}>{c.title}</button>
                    <span className="opp-watch__sub"><span className="opp-watch__supplier">{c.supplierName}</span> · {reasonFor(f, c, d)}</span>
                    <span className="kviz-row__extra">
                      {t && <a className="kviz-textlink" href={sourceHref(t, 'opportunities')}><i className="fa-solid fa-file-contract" aria-hidden="true" /> {COPY.buttons.viewClausePage(t.page)}</a>}
                      <button type="button" className="kviz-textlink opp-calc" onClick={() => onOpen(f.id)}><i className="fa-solid fa-calculator" aria-hidden="true" /> {LABELS.seeCalculation}<span className="sr-only">, {c.title}</span></button>
                    </span>
                  </span>
                  <span className="opp-watch__used">
                    <strong>{capUsedText(d.cap)}</strong>
                    <span>{watchNote()}</span>
                  </span>
                  <span className="opp-watch__conf">
                    <ConfidenceBadge level={f.confidence} />
                    {reviewed && <ReviewBadge status={f.status} label={reviewStatusLabel(f.status)} />}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
