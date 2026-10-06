// V6: the contracts register (#/contracts). Every contract on one screen, with the way into its nine financial answers.
//
//   default export: <Contracts />      rendered inside <main id="shell-main"> by routes.js (ContractsRoute), no props needed.
//   Query string (every filter is shareable and survives reload and Back):
//     ?q=<text>                search over contract title, supplier and contract id (debounced into the address)
//     ?category=<name>         one service category, as written in the register ("ICT")
//     ?sort=id|title|supplier|category|start|end|value|flags     default id; ?dir=asc|desc (each key has its own first direction)
//   Rows are links: the contract title is the one real link of the row and its stretched hit area covers the whole row, so a click anywhere opens
//   #/contracts/<id>, the keyboard has one stop per row and "open in a new tab" works. Sortable headers carry aria-sort.
//
// Numbers and sentences come from useEstate() and src/lib/copy.js. This file only filters, sorts and lays the register out. Strings the copy deck
// does not hold live in ./contracts/strings.js.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEstate, handcheckSummary } from '../lib/estate.js';
import { useRoute, setQuery, hrefFor } from '../lib/router.js';
import { COPY, contractStatusLabel, handcheckLine, sourceLabel } from '../lib/copy.js';
import { fmtDate, fmtGBP, plural } from '../lib/format.js';
import { PageHeader } from '../components/index.js';
import DS from '../ui/ds.js';
import { DataTable, EmptyState, Panel, Pill } from '../ui/index.js';
import { REGISTER } from './contracts/strings.js';
import './Contracts.css';

const { Button, Input, Select } = DS;

/** Sort keys: how to read a row, and the direction a first click goes to (numbers high to low, everything else A to Z or oldest first). */
const SORTS = {
  id: { get: (r) => r.c.id, first: 'asc' },
  title: { get: (r) => r.c.title, first: 'asc' },
  supplier: { get: (r) => r.c.supplierName, first: 'asc' },
  category: { get: (r) => r.c.serviceCategory, first: 'asc' },
  start: { get: (r) => r.c.startDate, first: 'asc' },
  end: { get: (r) => r.c.endDate, first: 'asc' },
  value: { get: (r) => r.c.annualValueGBP || 0, first: 'desc' },
  flags: { get: (r) => r.flags, first: 'desc' },
};

const compare = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'en-GB', { numeric: true }));

/** Search: every word you type must appear in the title, the supplier or the contract id. */
function matcher(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return () => true;
  return (r) => { const hay = `${r.c.title} ${r.c.supplierName} ${r.c.id}`.toLowerCase(); return words.every((w) => hay.includes(w)); };
}

export default function Contracts() {
  const { estate, state } = useEstate();
  const { query } = useRoute();

  const categories = useMemo(() => {
    const counts = new Map();
    estate.data.contracts.forEach((c) => counts.set(c.serviceCategory, (counts.get(c.serviceCategory) || 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [estate]);

  // One row per contract: the contract, how many flags it carries (every ranked flag, reviewed ones included) and its status.
  const rows = useMemo(() => {
    const flagCount = {};
    estate.ranked.forEach((f) => { flagCount[f.contractId] = (flagCount[f.contractId] || 0) + 1; });
    return estate.data.contracts.map((c) => ({ id: c.id, c, flags: flagCount[c.id] || 0, status: estate.derived[c.id].status }));
  }, [estate]);

  const categoryParam = query.get('category');
  const category = categories.some(([name]) => name === categoryParam) ? categoryParam : '';
  const sortParam = query.get('sort');
  const sortKey = Object.prototype.hasOwnProperty.call(SORTS, sortParam) ? sortParam : 'id';
  const dirParam = query.get('dir');
  const dir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : SORTS[sortKey].first;
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

  const shown = useMemo(() => {
    const get = SORTS[sortKey].get;
    const sign = dir === 'asc' ? 1 : -1;
    return rows
      .filter(matcher(search))
      .filter((r) => !category || r.c.serviceCategory === category)
      .sort((a, b) => sign * compare(get(a), get(b)) || a.c.id.localeCompare(b.c.id));
  }, [rows, search, category, sortKey, dir]);

  const filtersOn = !!search || !!category;
  const statusRef = useRef(null);
  const clearFilters = () => {
    pushed.current = '';
    setText('');
    setQuery({ q: null, category: null });
    requestAnimationFrame(() => statusRef.current && statusRef.current.focus({ preventScroll: true }));
  };
  const onSort = (key) => {
    if (key === sortKey) setQuery({ sort: key, dir: dir === 'asc' ? 'desc' : 'asc' });
    else setQuery({ sort: key, dir: SORTS[key].first });
  };

  const hand = handcheckSummary(state);
  const sources = useMemo(() => {
    const by = new Map();
    estate.data.contracts.forEach((c) => by.set(c.source, (by.get(c.source) || 0) + 1));
    return [...by.entries()].map(([source, n]) => ({ source, n }));
  }, [estate]);

  const sortHeader = (key) => ({ sortable: true, key });
  const columns = [
    { ...sortHeader('id'), label: REGISTER.columns.id, nowrap: true, width: 72, render: (r) => <span className="cr-id">{r.c.id}</span> },
    {
      ...sortHeader('title'), label: REGISTER.columns.title, rowHeader: true, minWidth: 190,
      render: (r) => <a className="cr-rowlink" href={hrefFor('contracts', { seg: [r.c.id] })}>{r.c.title}<span className="sr-only">, contract {r.c.id}</span></a>,
    },
    { ...sortHeader('supplier'), label: REGISTER.columns.supplier, minWidth: 140, render: (r) => r.c.supplierName },
    { ...sortHeader('category'), label: REGISTER.columns.category, minWidth: 110, render: (r) => r.c.serviceCategory },
    { key: 'route', label: REGISTER.columns.route, minWidth: 104, render: (r) => r.c.procurementRoute },
    { ...sortHeader('start'), label: REGISTER.columns.start, nowrap: true, render: (r) => fmtDate(r.c.startDate) },
    { ...sortHeader('end'), label: REGISTER.columns.end, nowrap: true, render: (r) => fmtDate(r.c.endDate) },
    { ...sortHeader('value'), label: REGISTER.columns.value, num: true, nowrap: true, render: (r) => fmtGBP(r.c.annualValueGBP) },
    {
      key: 'status', label: REGISTER.columns.status, nowrap: true,
      render: (r) => (r.status === 'live'
        ? <Pill tone="success" icon="circle-play">{contractStatusLabel(r.status)}</Pill>
        : <Pill tone="neutral" icon="circle-stop">{contractStatusLabel(r.status)}</Pill>),
    },
    { ...sortHeader('flags'), label: REGISTER.columns.flags, num: true, render: (r) => <span className={r.flags ? 'cr-flags' : 'cr-flags is-zero'}>{r.flags}</span> },
  ];

  const total = rows.length;
  // Copy deck 7.9: `No contracts match "{query}". Check the spelling or clear the search.` is one message; it is split into the title and the help line.
  const deckSentence = COPY.empty.contractsNoMatch.title(search);
  const splitAt = deckSentence.indexOf('". ') + 2;
  const noMatch = search
    ? { title: deckSentence.slice(0, splitAt), body: deckSentence.slice(splitAt + 1) }
    : { title: REGISTER.noMatchFilters.title, body: REGISTER.noMatchFilters.body };

  return (
    <div className="page cr">
      <PageHeader
        eyebrow={estate.council.name}
        title={COPY.pages.contracts.title}
        asAt
        description={(
          <>
            <p>{COPY.pages.contracts.subtitle(total)}</p>
            <p className="cr-hand" data-testid="handcheck-line">
              <i className="fa-solid fa-user-check" aria-hidden="true" />
              <span>
                <strong>{handcheckLine(hand.checked, hand.total)}.</strong>
                {hand.checked > 0 && <> {REGISTER.handBreakdown(hand.correct, hand.incorrect)}.</>}
                {' '}<span className="cr-hand__hint">{REGISTER.handHint}</span>
              </span>
            </p>
          </>
        )}
      />

      <Panel
        as="h2" title={REGISTER.panelTitle} padded={false} id="cr-title"
        footer={(
          <div className="cr-foot" data-testid="source-note">
            <ul className="cr-sources" aria-label={REGISTER.sourceKey}>
              {sources.map(({ source, n }) => (
                <li key={source}>
                  <Pill icon={source === 'find_a_tender' ? 'landmark' : 'file-pdf'}>{REGISTER.sourceKey}: {sourceLabel(source)}</Pill>
                  <span className="cr-sources__n">{plural(n, 'contract')}</span>
                </li>
              ))}
            </ul>
            <p className="cr-foot__rule">{REGISTER.sourceRule}</p>
          </div>
        )}
      >
        <div className="cr-toolbar" role="search" aria-label={REGISTER.toolbar}>
          <label className="cr-control cr-control--search">
            <span className="cr-control__label">{REGISTER.search}</span>
            <Input type="text" inputMode="search" autoComplete="off" leftIcon="magnifying-glass" placeholder={REGISTER.searchPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <label className="cr-control cr-control--category">
            <span className="cr-control__label">{REGISTER.category}</span>
            <Select
              style={{ width: 'var(--cr-w)' }} value={category}
              options={[{ value: '', label: REGISTER.allCategories }, ...categories.map(([name, n]) => ({ value: name, label: `${name} (${n})` }))]}
              onChange={(e) => setQuery({ category: e.target.value || null })}
            />
          </label>
          {filtersOn && <Button variant="outline" leftIcon="filter-circle-xmark" onClick={clearFilters} className="cr-clear">{REGISTER.clearFilters}</Button>}
          <p className="cr-count" ref={statusRef} tabIndex={-1} role="status" aria-live="polite">{REGISTER.showing(shown.length, total)}</p>
        </div>

        {shown.length === 0 ? (
          <EmptyState as="h3" icon="magnifying-glass" title={noMatch.title}
            action={<Button variant="outline" leftIcon="filter-circle-xmark" onClick={clearFilters}>{search && !category ? COPY.empty.contractsNoMatch.button : REGISTER.clearFilters}</Button>}>
            {noMatch.body}
          </EmptyState>
        ) : (
          <DataTable
            className="cr-table" caption={REGISTER.tableCaption} columns={columns} rows={shown} rowKey="id"
            sort={{ key: sortKey, dir }} onSort={onSort}
          />
        )}
      </Panel>
    </div>
  );
}
