// Cap vs spend (#/spend): what you have paid each supplier since the contract started, against the most the contract says you can pay.
//   Query: ?state=over|close|within   filter chip (shareable)        ?payments=<contractId>   opens the payments drawer
// Numbers come from the engine (estate.capRows through capItems), wording from copy.js; the only arithmetic here is adding up engine figures for the
// summary tiles. The BulletList sorts itself (share of cap, then spend), so the golden order C-005, C-007, C-011, C-001, C-017, C-009 holds.
import { useMemo, useState } from 'react';
import { useEstate } from '../../lib/estate.js';
import { useRoute, setQuery, hrefFor } from '../../lib/router.js';
import { COPY } from '../../lib/copy.js';
import { fmtGBP } from '../../lib/format.js';
import { ClauseLink } from '../../components/index.js';
import { Chip, EmptyState, Panel, StatTile } from '../../ui/index.js';
import DS from '../../ui/ds.js';
import { BULLET_LEGEND, BulletList, ChartTable, Legend, capItems, capSummary, capTable, gbpFull } from '../../charts/index.js';
import { ContractPaymentsDrawer, capClauseFor } from './PaymentsDrawer.jsx';
import { CAP } from './strings.js';

const { Button } = DS;
const LIMIT = 12;
const STATE_KEYS = ['over', 'close', 'within'];
const KEY_OF = { ok: 'within', near: 'close', over: 'over', above_estimate: 'over' };

export default function CapTab() {
  const { estate } = useEstate();
  const { query } = useRoute();
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState('chart');
  const closeAt = estate.opts.nearCapThreshold;
  const stateParam = query.get('state');
  const filter = STATE_KEYS.includes(stateParam) ? stateParam : null;
  const payId = query.get('payments');
  const payingId = payId && estate.contractsById[payId] ? payId : null;

  const openPayments = (id) => setQuery({ payments: id });
  const closePayments = () => setQuery({ payments: null });

  const items = useMemo(() => capItems(estate, {
    extraFor: (item, c) => {
      const clause = item.state !== 'ok' ? capClauseFor(estate, c.id) : null;
      return (
        <>
          {item.partial && <span className="cap-note"><i className="fa-solid fa-circle-info" aria-hidden="true" /> {COPY.partialCoverageNote(estate.summaries[c.id].coverageFrom)}</span>}
          <span className="cap-actions">
            {clause && <ClauseLink contractId={clause.contractId} extractionId={clause.extractionId} page={clause.page} from="spend" context={c.title} className="cap-link" />}
            <button type="button" className="kviz-textlink cap-link cap-pay" data-pay-for={c.id} onClick={() => openPayments(c.id)}>
              <i className="fa-solid fa-list" aria-hidden="true" /> {CAP.seePayments}<span className="sr-only">, {c.title}</span>
            </button>
          </span>
        </>
      );
    },
  }), [estate]);                                         // eslint-disable-line react-hooks/exhaustive-deps

  const summary = capSummary(items, closeAt);            // { over, close, within } from the engine's states
  const overRows = estate.capRows.filter((r) => r.state === 'over');
  const totalOver = Math.round(overRows.reduce((s, r) => s + r.excessGBP, 0) * 100) / 100;
  const keyOf = (it) => KEY_OF[it.state] || 'within';
  const filtered = filter ? items.filter((it) => keyOf(it) === filter) : items;
  const limited = !filter && !showAll && filtered.length > LIMIT;

  // The "Show table" twin carries the same actions as the rows, so the table is never a dead end.
  const table = useMemo(() => {
    const base = capTable(filtered);
    const byId = Object.fromEntries(items.map((it) => [it.id, it]));
    return {
      columns: [...base.columns,
        { key: 'clause', label: CAP.tableCols.clause, render: (r) => { const it = byId[r.id]; const cl = it.state !== 'ok' ? capClauseFor(estate, r.id) : null; return cl ? <ClauseLink contractId={cl.contractId} extractionId={cl.extractionId} page={cl.page} from="spend" context={r.title} /> : '-'; } },
        { key: 'payments', label: CAP.tableCols.payments, render: (r) => <button type="button" className="kviz-textlink cap-link" onClick={() => openPayments(r.id)}>{CAP.seePayments}<span className="sr-only">, {r.title}</span></button> }],
      rows: base.rows,
    };
  }, [filtered, items, estate]);                         // eslint-disable-line react-hooks/exhaustive-deps

  const tile = (k, value, foot) => <StatTile className={'cap-tile cap-tile--' + k} label={CAP.tiles[k].label} icon={CAP.tiles[k].icon} value={value} foot={foot} />;
  const chip = (key, count, label) => (
    <Chip key={key} pressed={(filter || 'all') === key} count={count} onClick={() => { setQuery({ state: key === 'all' ? null : key }); setShowAll(false); }}>{label}</Chip>
  );

  return (
    <>
      <section className="cap-tiles kx-grid kx-grid--4" aria-label={CAP.summaryLabel}>
        {tile('over', summary.over, CAP.tiles.over.foot())}
        {tile('close', summary.close, CAP.tiles.close.foot(closeAt))}
        {tile('within', summary.within, CAP.tiles.within.foot(closeAt))}
        {tile('total', fmtGBP(totalOver), CAP.tiles.total.foot(overRows.length))}
      </section>

      <Panel as="h2" className="cap-panel" title={CAP.panelTitle} description={CAP.panelDescription} padded={false}
        actions={(
          <button type="button" className="kviz-btn" aria-pressed={view === 'table'} onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
            <i className={'fa-solid fa-' + (view === 'table' ? 'chart-simple' : 'table')} aria-hidden="true" />{view === 'table' ? CAP.showChart : CAP.showTable}
          </button>
        )}>
        <div className="cap-toolbar">
          <div className="cap-chips" role="group" aria-label={CAP.filterLabel}>
            {chip('all', items.length, CAP.chips.all)}
            {chip('over', summary.over, CAP.chips.over)}
            {chip('close', summary.close, CAP.chips.close)}
            {chip('within', summary.within, CAP.chips.within)}
          </div>
          {view === 'chart' && <Legend items={BULLET_LEGEND} label="Cap legend" className="cap-legend" />}
        </div>
        <div className="cap-body">
          {filtered.length === 0
            ? <EmptyState as="h3" icon="filter-circle-xmark" title={CAP.noRows.title} action={<Button variant="outline" onClick={() => setQuery({ state: null })}>{CAP.clearFilter}</Button>}>{CAP.noRows.body}</EmptyState>
            : view === 'table'
              ? <ChartTable {...table} caption={CAP.panelTitle} />
              : <BulletList items={filtered} format={gbpFull} closeAt={closeAt} limit={limited ? LIMIT : undefined} getHref={(r) => hrefFor('contracts', { seg: [r.id] })} />}
          {!filter && filtered.length > LIMIT && view === 'chart' && (
            <div className="cap-more">
              <Button variant="outline" leftIcon={showAll ? 'chevron-up' : 'chevron-down'} onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
                {showAll ? CAP.showFewer(LIMIT) : CAP.showAll(filtered.length)}
              </Button>
            </div>
          )}
        </div>
        <p className="cap-foot">{CAP.footnote} {COPY.vatNote} {COPY.dataWindowNote(estate.council)}</p>
      </Panel>

      <ContractPaymentsDrawer contractId={payingId} onClose={closePayments} />
    </>
  );
}
