// Actions page, Results tab (#/actions/results). Build spec 8.4 and D7, D8: what your team has closed and what it brought back.
// Value secured = cash recovered + cost avoided, from Resolved actions only. The figures are the ones typed into the close dialog:
// the page labels them as yours and checks nothing. Pre-loaded history carries an "Example" tag.
import { useEstate } from '../../lib/estate.js';
import { setQuery } from '../../lib/router.js';
import { ACT, monthLong, monthShort } from '../../lib/actions-copy.js';
import { byMonth, resultsOf } from '../../lib/actions.js';
import { flagTypeLabel, fmtDate, fmtGBP } from '../../lib/copy.js';
import { peopleById } from '../../data/people.js';
import { DataTable, Panel, StatTile, Tag } from '../../ui/index.js';
import { Legend, MonthBars } from '../../charts/index.js';
import { OutcomePill } from '../../components/ActionBits.jsx';

const R = ACT.results;
const SERIES = [
  { key: 'cash', label: R.tiles.cash, color: 'var(--viz-success)' },
  { key: 'cost', label: R.tiles.cost, color: 'var(--viz-accent)' },
];
const swatch = (color) => <span className="acts-swatch" style={{ background: color }} aria-hidden="true" />;

export default function Results() {
  const { estate, state } = useEstate();
  const res = resultsOf(state.actions || {});
  const months = byMonth(state.actions || {}).map((m) => ({
    key: m.month, label: monthShort(m.month), name: monthLong(m.month),
    values: { cash: m.cashGBP, cost: m.costGBP }, aria: R.barLabel(monthLong(m.month), m.cashGBP, m.costGBP),
  }));
  const titleOf = (a) => (estate.contractsById[a.contractId] || {}).title || a.contractId;
  const money = (v) => (v > 0 ? fmtGBP(v) : R.none);

  const columns = [
    { key: 'closed', label: R.cols.closed, nowrap: true, render: (a) => fmtDate(a.closedAt) },
    {
      key: 'contract', label: R.cols.contract, rowHeader: true, minWidth: 240,
      render: (a) => (
        <span className="acts-res__contract">
          <span className="acts-res__title">
            {a.example || !estate.flagsById[a.flagId]
              ? <b>{titleOf(a)}</b>
              : <button type="button" className="kviz-textlink acts-res__open" onClick={() => setQuery({ flag: a.flagId, tab: 'action' })}><b>{titleOf(a)}</b></button>}
            {a.example && <Tag className="acts-res__example">{R.example}</Tag>}
            {a.flagId === res.latestId && <span className="sr-only">. {R.latest}</span>}
          </span>
          <span className="acts-res__what">{flagTypeLabel(a.flagType)}{a.closeNote ? ` · ${a.closeNote}` : ''}</span>
        </span>
      ),
    },
    { key: 'outcome', label: R.cols.outcome, render: (a) => <OutcomePill outcome={a.outcome} size="sm" /> },
    { key: 'cash', label: R.cols.cash, num: true, nowrap: true, render: (a) => (a.outcome === 'resolved' ? money(a.cashRecoveredGBP) : R.none) },
    { key: 'cost', label: R.cols.cost, num: true, nowrap: true, render: (a) => (a.outcome === 'resolved' ? money(a.costAvoidedGBP) : R.none) },
    { key: 'owner', label: R.cols.owner, nowrap: true, render: (a) => (a.owner && peopleById[a.owner] ? peopleById[a.owner].name : ACT.who.notSet) },
  ];

  return (
    <div className="acts-results">
      <section className="acts-tiles" aria-label={R.tiles.value}>
        <StatTile className="acts-tile acts-tile--value" label={R.tiles.value} value={fmtGBP(res.valueSecuredGBP)} foot={res.sinceMonth ? R.since(res.sinceMonth) : R.empty} data-tile="value" />
        <StatTile className="acts-tile" label={<>{swatch(SERIES[0].color)}{R.tiles.cash}</>} value={fmtGBP(res.cashGBP)} foot={R.count(res.cashCount)} data-tile="cash" />
        <StatTile className="acts-tile" label={<>{swatch(SERIES[1].color)}{R.tiles.cost}</>} value={fmtGBP(res.costGBP)} foot={R.count(res.costCount)} data-tile="cost" />
        <StatTile className="acts-tile" label={R.tiles.closed} value={res.closed.length} foot={R.split(res.resolvedCount, res.explainedCount, res.noActionCount)} data-tile="closed" />
      </section>

      <Panel title={R.chartTitle} id="acts-chart-h" className="acts-chart" actions={<Legend items={SERIES.map((s) => ({ key: s.key, label: s.label, color: s.color, shape: 'bar' }))} label={R.chartTitle} className="acts-legend" />}>
        <MonthBars months={months} series={SERIES} label={R.chartLabel} />
      </Panel>

      <Panel title={R.tableTitle} id="acts-table-h" className="acts-table" padded={false} footer={<p className="acts-foot">{R.footer}</p>}>
        <DataTable columns={columns} rows={res.closed} rowKey="flagId" caption={R.tableCaption} empty={R.empty}
          rowClassName={(a) => (a.flagId === res.latestId ? 'is-latest' : '')} />
      </Panel>
    </div>
  );
}
