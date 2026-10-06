// UI kit and chart library gallery: every src/ui and src/charts component fed by the real engine (src/lib/estate.js).
// Fixture for tests/ui-checks.mjs, and the place to look at a component. Owner A3.
//   node scripts/build.mjs --entry tests/fixtures/ui-gallery.jsx --outdir .scratch/ui-checks
//   node tests/shot.mjs --dist .scratch/ui-checks --hash '#/ui' --theme dark --w 1440 --h 2000 --out .scratch/ui-checks/ui.png     (#/ui kit, #/charts charts, #/all both)
import '../../src/shell/shell.css';
import '../../src/ui/kit.css';
import '../../src/charts/charts.css';
import '../../src/styles/app.css';
import { createRoot } from 'react-dom/client';
import { useMemo, useRef, useState } from 'react';
import { AppShell } from '../../src/shell/AppShell.jsx';
import { RAIL } from '../../src/shell/rail.js';
import { ClauseLink } from '../../src/components/ClauseLink.jsx';
import { ConfidencePill } from '../../src/components/ConfidencePill.jsx';
import { computeEstate, paymentsFor } from '../../src/lib/estate.js';
import { evidenceFor, evidenceForField, sourceHref } from '../../src/lib/evidenceFor.js';
import { actionLine, noticeShortText, needsAttentionText, reasonFor, COPY, sumLine, breakdownCards, excludedNote } from '../../src/lib/copy.js';
import { fmtGBP, fmtGBPCompact, fmtDate } from '../../src/lib/format.js';
import {
  Button, Badge, Dialog, ConfirmDialog, Drawer, Menu, MenuButton, Tooltip, Segmented, Pill, StatTile, EmptyState, Kbd, Chip, Tag, Panel, DataTable,
  Pager, PaymentsTable, Check, RadioField, RadioGroup, SwitchField, Field, RouteTabs, ToastProvider, useToast,
} from '../../src/ui/index.js';
import {
  ChartFigure, Legend, HeadlineTile, HeadlineSentence, HeadlineBreakdown, CoverageMeter, RadarStrip, RadarLanes, RADAR_LEGEND, BulletList, capSummary, capTable, BULLET_LEGEND, YearBars,
  CumulativeLine, cumulativeTable, LINE_LEGEND, Dumbbell, DUMBBELL_LEGEND, OpportunityList, FlagFilterChips, CoverageBlock, FlagBadge, CapStatePill,
  ConfidenceBadge, ReviewBadge, FLAG_CARD_ORDER, FLAGS, headlineProps, radarRows, capItems, upliftRows, opportunityItems, opportunityCounts, cumulativeSeries,
  yearBarsProps, coverageProps, gbpFull, pct,
} from '../../src/charts/index.js';

const { Input, Select, Textarea } = window.Springboard20DesignSystem_019e02;

const estate = computeEstate();
// A second estate with two flags reviewed, so the list shows a muted row and the status pills.
const reviewed = computeEstate({ triage: { 'F-C-011-overCap': 'explained', 'F-C-014-renewal': 'under_review', 'F-C-015-renewal': 'not_an_issue' } });

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="g-section">
      <h2 id={id} className="ds-h4">{title}</h2>
      {children}
    </section>
  );
}

const clauseFor = (flag) => {
  const t = evidenceFor(flag);
  return t ? { label: 'View clause, page ' + t.page, href: sourceHref(t, 'opportunities') } : null;
};

/* ------------------------------------------------------------------------------------------------- UI */
function PillsAndTags() {
  const [chip, setChip] = useState(true);
  const [tags, setTags] = useState(['Waste', 'Highways']);
  return (
    <Panel title="Pills, tags, chips" as="h3">
      <div className="g-stack">
        <div className="g-row">
          <Pill tone="neutral" icon="circle-check">High confidence</Pill>
          <Pill tone="info" icon="circle-info">Suggested</Pill>
          <Pill tone="success" icon="circle-check">Confirmed by you</Pill>
          <Pill tone="warning" icon="triangle-exclamation">Needs review</Pill>
          <Pill tone="danger" icon="circle-exclamation">Rejected by you</Pill>
          <Pill tone="neutral" dot>Auto-renews</Pill>
          <Pill tone="neutral" size="sm">Sample</Pill>
        </div>
        <div className="g-row">
          <Pill solid tone="neutral">Neutral</Pill><Pill solid tone="info">Info</Pill><Pill solid tone="success">Success</Pill><Pill solid tone="warning">Warning</Pill><Pill solid tone="danger">Danger</Pill>
        </div>
        <div className="g-row" aria-label="Flag types" role="group">
          {FLAG_CARD_ORDER.map((k) => <FlagBadge key={k} type={k} />)}
          <FlagBadge type="overCap" label="Above contract value (estimate)" />
          <FlagBadge type="uplift" muted />
        </div>
        <div className="g-row" role="group" aria-label="Cap states and confidence">
          <CapStatePill state="ok" /><CapStatePill state="near" /><CapStatePill state="over" /><CapStatePill state="over" label="Above contract value (estimate)" />
          <ConfidenceBadge level="high" /><ConfidenceBadge level="medium" /><ConfidenceBadge level="low" />
          <ReviewBadge status="under_review" /><ReviewBadge status="explained" /><ReviewBadge status="not_an_issue" />
        </div>
        <div className="g-row">
          <Chip pressed={chip} onClick={() => setChip(!chip)} icon="triangle-exclamation" count={3}>Spend over cap</Chip>
          <Chip pressed={false} onClick={() => {}} count={12}>Renewals</Chip>
          {tags.map((t) => <Tag key={t} onRemove={() => setTags(tags.filter((x) => x !== t))} removeLabel={'Remove filter: ' + t}>{t}</Tag>)}
          <Kbd>Esc</Kbd><Kbd>Ctrl</Kbd><Kbd>K</Kbd>
          <Badge tone="neutral">24</Badge>
        </div>
      </div>
    </Panel>
  );
}

function StatsAndEmpty() {
  const [on, setOn] = useState(false);
  return (
    <div className="kx-grid kx-grid--4">
      <StatTile label="Contracts on the register" value="24" icon="file-contract" foot="336 answers extracted" />
      <StatTile label="Opportunities to investigate" value={fmtGBPCompact(estate.totals.totalGBP)} icon="flag" foot={<><Pill tone="neutral" size="sm">Indicative</Pill><span>across 15 contracts</span></>} />
      <StatTile label="Renewal decisions" value="12" icon="calendar-days" foot="Show only these" onClick={() => setOn(!on)} pressed={on} />
      <StatTile label="Open the register" value="24" icon="folder-open" foot="Go to contracts" href="#/contracts" />
      <Panel className="g-span4" padded={false}>
        <EmptyState icon="file-circle-question" title="No contracts match these filters" as="h3" action={<Button variant="outline">Clear filters</Button>}>Change the category or the search words, or clear the filters to see all 24 contracts.</EmptyState>
      </Panel>
    </div>
  );
}

function Controls() {
  const [seg, setSeg] = useState('open');
  const [a, setA] = useState(true);
  const [rate, setRate] = useState('0.05');
  const [sw, setSw] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(3);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef(null);
  const toast = useToast();
  return (
    <Panel title="Controls" as="h3">
      <div className="g-stack">
        <div className="g-row">
          <Segmented label="Show flags" value={seg} onChange={setSeg} options={[{ value: 'open', label: 'Open', count: 17 }, { value: 'reviewed', label: 'Reviewed', count: 2 }, { value: 'all', label: 'All', count: 19 }]} />
          <Segmented label="Notice window" size="lg" value="6" onChange={() => {}} options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months', icon: 'clock' }, { value: '12', label: '12 months' }]} />
          <MenuButton label="More actions" items={[
            { heading: 'Table' }, { id: 'csv', label: 'Download CSV', icon: 'file-csv', hint: 'D', onSelect: () => toast({ tone: 'success', title: 'Download started.', description: 'Your file is in your downloads folder.' }) },
            { id: 'filter', label: 'Edit filters', icon: 'filter' }, { separator: true },
            { id: 'reset', label: 'Reset demo changes', icon: 'rotate-right', danger: true },
          ]} />
          <span ref={menuBtn} style={{ display: 'inline-flex' }}>
            <Button id="gal-menu" variant="outline" leftIcon="bars" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>Menu</Button>
          </span>
          <Menu open={menuOpen} anchor={menuBtn} onClose={() => setMenuOpen(false)} label="Kontor menu" placement="bottom-start" items={[
            { id: 'ev', label: 'Why this matters', icon: 'lightbulb', href: '#/evidence' }, { id: 'me', label: 'How this is calculated', icon: 'book-open', href: '#/method' },
            { id: 'ab', label: 'About this data', icon: 'circle-info' }, { id: 'dg', label: 'Demo guide', icon: 'list-check' }, { id: 'fb', label: 'Give feedback', icon: 'comment' },
          ]} />
          <Tooltip label="Opens the clause the flag came from. Select it to read the page."><Button variant="outline" size="sm" leftIcon="file-lines">Hover or focus me</Button></Tooltip>
          <Tooltip label="Close to the right edge, so this tooltip flips and stays on screen" side="left"><Button variant="ghost" size="sm" aria-label="Info" leftIcon="circle-info" style={{ width: 32, padding: 0 }} /></Tooltip>
        </div>
        <div className="kx-grid kx-grid--3">
          <div>
            <Check checked={a} onChange={setA} label="Show reviewed flags" description="Reviewed flags are muted and not counted." />
            <Check checked={false} onChange={() => {}} label="Unchecked" /><Check indeterminate onChange={() => {}} label="Some selected" /><Check checked disabled label="Disabled" />
          </div>
          <div>
            <RadioGroup legend="Renewal rate" name="rate" value={rate} onChange={setRate} options={[{ value: '0.03', label: '3%' }, { value: '0.05', label: '5%', description: 'Prototype assumption' }, { value: '0.08', label: '8%' }]} />
          </div>
          <div>
            <SwitchField checked={sw} onChange={setSw} label="Include indicative figures" description="Applies at once." />
            <SwitchField checked={false} onChange={() => {}} label="Off state" /><SwitchField checked disabled label="Disabled on" />
          </div>
        </div>
        <div className="kx-grid kx-grid--3">
          <Field label="Search suppliers" help="Search by supplier name or contract number."><Input leftIcon="magnifying-glass" placeholder="Search suppliers" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
          <Field label="Status" required>{(p) => <Select {...p} options={['Open', 'Reviewed', 'All']} defaultValue="Open" />}</Field>
          <Field label="Note" error="Note not saved. It is longer than 500 characters. Shorten it and save again."><Textarea rows={2} defaultValue="Too long" /></Field>
        </div>
        <Pager page={page} pageSize={20} total={1264} onPage={setPage} unit="payment" label="Pager demo pages" />
      </div>
    </Panel>
  );
}

function Tables() {
  const [sort, setSort] = useState({ key: 'end', dir: 'asc' });
  const [selected, setSelected] = useState(null);
  const toast = useToast();
  const rows = useMemo(() => {
    const list = estate.data.contracts.map((c) => ({ id: c.id, title: c.title, supplier: c.supplierName, end: c.endDate, value: c.annualValueGBP, state: estate.derived[c.id].cap }));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : -1) * dir).slice(0, 8);
  }, [sort]);
  const columns = [
    { key: 'id', label: 'Contract', nowrap: true, sortable: true, render: (r) => <span className="kx-mono" style={{ color: 'var(--fg-1)' }}>{r.id}</span> },
    { key: 'title', label: 'Title', rowHeader: true, minWidth: 220, render: (r) => <a href={'#/contracts/' + r.id} onClick={(e) => { e.preventDefault(); toast({ tone: 'info', title: 'Link followed', description: r.id + ' opened from inside the row. The row handler did not run.' }); }}>{r.title}</a> },
    { key: 'supplier', label: 'Supplier', muted: true, minWidth: 180 },
    { key: 'end', label: 'Ends', nowrap: true, sortable: true, muted: true, render: (r) => fmtDate(r.end) },
    { key: 'value', label: 'Annual value', num: true, sortable: true, render: (r) => fmtGBP(r.value) },
    { key: 'state', label: 'Cap', render: (r) => <CapStatePill state={r.state.state} label={r.state.capState === 'near' ? 'Close to cap' : undefined} /> },
  ];
  return (
    <>
      <RouteTabs label="Cap vs spend views" current="cap" items={[{ id: 'cap', label: 'Cap vs spend', href: '#/spend' }, { id: 'matches', label: 'Supplier matches', href: '#/spend/matches', count: 9 }, { id: 'none', label: 'No contract on the register', href: '#/spend/no-contract' }]} />
      <Panel title="Contracts" count={24} as="h3" padded={false} actions={<Button variant="outline" size="sm" leftIcon="download">Export contracts</Button>}>
        <DataTable caption="Contracts by end date" columns={columns} rows={rows} sort={sort} onSort={(k) => setSort((s) => ({ key: k, dir: s.key === k && s.dir === 'asc' ? 'desc' : 'asc' }))}
          onRowClick={(r) => { setSelected(r.id); toast({ tone: 'info', title: 'Row opened: ' + r.id }); }} selectedKey={selected} rowAriaLabel={(r) => 'Open ' + r.id + ', ' + r.title}
          footer={[{ key: 'tot', label: 'Total of these 8 contracts', values: { value: fmtGBP(rows.reduce((s, r) => s + r.value, 0)) } }]} />
      </Panel>
    </>
  );
}

function Overlays() {
  const [dlg, setDlg] = useState(false);
  const [conf, setConf] = useState(false);
  const [drw, setDrw] = useState(false);
  const toast = useToast();
  const pay = paymentsFor(estate, 'C-007');
  return (
    <Panel title="Dialog, confirm, drawer and toasts" as="h3">
      <div className="g-row">
        <Button variant="outline" id="open-dialog" onClick={() => setDlg(true)}>Open dialog</Button>
        <Button variant="outline" id="open-confirm" onClick={() => setConf(true)}>Reset demo changes</Button>
        <Button variant="outline" id="open-drawer" onClick={() => setDrw(true)}>Open payments drawer</Button>
        <Button variant="outline" onClick={() => toast({ tone: 'info', title: 'Apps are not part of this prototype.', description: 'Use the rail on the left to explore the demo.' })}>Info toast</Button>
        <Button variant="outline" onClick={() => toast({ tone: 'success', title: 'Link copied.', description: 'Paste it to share this page.' })}>Success toast</Button>
        <Button variant="outline" onClick={() => toast({ tone: 'warning', title: 'Match rejected.', description: 'Larchmont Grounds Maintenance is now unmatched.' })}>Warning toast</Button>
        <Button variant="outline" onClick={() => toast({ tone: 'error', title: 'Export failed.', description: 'Your browser blocked the download. Allow downloads for this page and try again.' })}>Error toast</Button>
      </div>
      <Dialog open={dlg} onClose={() => setDlg(false)} title="Give feedback" description="Tell us whether this would help your team. Your answer stays on this device."
        footer={<><Button variant="outline" onClick={() => setDlg(false)}>Cancel</Button><Button onClick={() => { setDlg(false); toast({ tone: 'success', title: 'Feedback saved on this device.' }); }}>Send feedback</Button></>}>
        <RadioGroup legend="Would this help your team?" name="fb" value="yes" onChange={() => {}} options={[{ value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }, { value: 'no', label: 'No' }]} />
        <Field label="Comment" optional><Textarea rows={3} /></Field>
      </Dialog>
      <ConfirmDialog open={conf} onClose={() => setConf(false)} destructive title="Reset your changes?" confirmLabel="Reset changes"
        onConfirm={() => { setConf(false); toast({ tone: 'success', title: 'Changes reset.', description: 'The demo is back to its starting numbers.' }); }}
        description="This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device. The demo goes back to its starting numbers." />
      <Drawer open={drw} onClose={() => setDrw(false)} size="lg" title="Payments counted against this contract" subtitle="Cleansing and street scene services. Paid to Ardent Street Services Ltd"
        footer={<><Button variant="outline" onClick={() => setDrw(false)}>Close panel</Button><Button variant="outline" id="drawer-confirm" onClick={() => setConf(true)}>Reset demo changes</Button></>}>
        <PaymentsTable payments={pay} pageSize={10} contractLabel={estate.contractsById['C-007'].title} />
      </Drawer>
    </Panel>
  );
}

/* ------------------------------------------------------------------------------------------------- Charts */
const tableForOpps = (items) => ({
  columns: [{ key: 'rank', label: '#' }, { key: 'title', label: 'Contract' }, { key: 'supplier', label: 'Supplier' }, { key: 'type', label: 'Flag type' }, { key: 'value', label: 'Indicative value', align: 'right' }, { key: 'status', label: 'Review status' }],
  rows: items.map((o) => ({ id: o.id, rank: o.rank, title: o.title, supplier: o.supplier, type: o.typeLabel, value: gbpFull(o.value), status: o.statusLabel || 'To investigate' })),
});

function HeadlineSection() {
  const hp = headlineProps(estate);
  return (
    <Panel padded={24} as="h2">
      <HeadlineTile {...hp} format={fmtGBPCompact} as="h2" note="Indicative figures. As at 6 October 2026." caveat={COPY.caveat && COPY.caveat.short} getHref={(t) => '#/opportunities?type=' + t}
        footer={<p className="kviz-note">{sumLine(estate.totals)}</p>} />
    </Panel>
  );
}

function HeadlinePieces() {
  const hp = headlineProps(estate);
  return (
    <Panel padded={24}>
      <h2 className="kx-section-title" style={{ marginBottom: 12 }}>
        <HeadlineSentence total={hp.total} contractCount={hp.contractCount} format={fmtGBPCompact} />
      </h2>
      <HeadlineBreakdown total={hp.total} byType={hp.byType} format={fmtGBPCompact} getHref={(t) => '#/opportunities?type=' + t} />
    </Panel>
  );
}

function OverviewRow() {
  const rows = radarRows(estate);
  return (
    <div className="kx-grid kx-grid--2-1">
      <Panel padded={24}>
        <h2 className="kx-section-title" style={{ marginBottom: 12 }}>Renewal radar</h2>
        <RadarStrip rows={rows} format={fmtGBPCompact} caption="Contract value, a year" getHref={() => '#/renewals'} attentionHref="#/renewals" />
      </Panel>
      <Panel padded={24}>
        <h2 className="kx-section-title" style={{ marginBottom: 12 }}>Spend with a contract</h2>
        <CoverageMeter matched={estate.coverage.linkedGBP} total={estate.coverage.totalGBP} format={fmtGBPCompact} href="#/spend/no-contract" />
      </Panel>
    </div>
  );
}

function RadarSection() {
  const extraFor = (row) => {
    const c = estate.contractsById[row.id];
    const d = estate.derived[row.id];
    const ev = evidenceForField(c.id, 'noticePeriod');
    return (
      <>
        <span className="g-action">{needsAttentionText(c, d) || actionLine(c, d)}</span>
        <span>Notice period: {noticeShortText(c.notice)}</span>
        <ConfidencePill score={c.confidence.noticePeriod} />
        {ev && <ClauseLink contractId={c.id} extractionId={ev.extractionId} page={ev.page} from="renewals" context={c.title} />}
      </>
    );
  };
  return (
    <Panel padded={24}>
      <ChartFigure as="h2" title="Renewal radar" description="Each contract is a bar of time left to act, a diamond at the notice deadline and a tick at the contract end." legend={<Legend items={RADAR_LEGEND} />}
        footnote="12 contracts have notice dates more than 12 months away and are not on the radar.">
        <RadarLanes rows={radarRows(estate)} extraFor={extraFor} getHref={(r) => '#/contracts/' + r.id} />
      </ChartFigure>
    </Panel>
  );
}

function CapSection() {
  const [all, setAll] = useState(false);
  const items = capItems(estate, {
    extraFor: (it, c) => {
      if (it.state === 'ok') return null;
      const ev = evidenceForField(c.id, it.source === 'contract_value' ? 'awardedTotalValue' : 'maximumValue');
      return ev ? <ClauseLink contractId={c.id} extractionId={ev.extractionId} page={ev.page} from="spend" context={c.title} /> : null;
    },
  });
  const sum = capSummary(items);
  return (
    <Panel padded={24}>
      <ChartFigure as="h2" title="Cap vs spend" description={`${sum.over} over the cap, ${sum.close} close to it and ${sum.within} within it.`} legend={<Legend items={BULLET_LEGEND} />} table={capTable(items)}
        footnote="Spend figures are net of irrecoverable VAT. Contract values exclude VAT.">
        <BulletList items={items} format={gbpFull} limit={all ? undefined : 12} getHref={(r) => '#/contracts/' + r.id} />
        <div style={{ marginTop: 12 }}><Button variant="outline" onClick={() => setAll(!all)}>{all ? 'Show fewer contracts' : `Show all ${items.length} contracts`}</Button></div>
      </ChartFigure>
    </Panel>
  );
}

function DetailCharts() {
  const c5 = estate.contractsById['C-005'];
  const series = cumulativeSeries(estate, 'C-005');
  const yb = yearBarsProps(estate, 'C-011');
  const up = upliftRows(estate);
  return (
    <>
      <div className="kx-grid kx-grid--2">
        <Panel padded={24}>
          <ChartFigure as="h2" title="Cumulative spend against the cap" description={c5.title} legend={<Legend items={LINE_LEGEND(c5.cap.amountGBP)} />} table={cumulativeTable(series, c5.cap.amountGBP)}>
            <CumulativeLine series={series} cap={c5.cap.amountGBP} subject={c5.title} />
          </ChartFigure>
        </Panel>
        <Panel padded={24}>
          <ChartFigure as="h2" title="Spend by contract year" description={estate.contractsById['C-011'].title}>
            <YearBars {...yb} />
          </ChartFigure>
        </Panel>
      </div>
      <Panel padded={24}>
        <ChartFigure as="h2" title="Price increases against the index cap" legend={<Legend items={DUMBBELL_LEGEND} />}>
          <Dumbbell rows={up} getHref={(r) => '#/contracts/' + r.id} />
        </ChartFigure>
      </Panel>
    </>
  );
}

function OpportunitiesSection() {
  const [type, setType] = useState(null);
  const items = opportunityItems(reviewed, { clauseFor });
  return (
    <Panel padded={24}>
      <ChartFigure as="h2" title="Opportunities to investigate" description="Ranked by indicative value. Each one links to the clause and page it came from." table={tableForOpps(items)}
        footnote="Figures are indicative. Check the clause and your payments before you act.">
        <FlagFilterChips counts={opportunityCounts(items)} value={type} onChange={setType} />
        <OpportunityList items={items} filter={type} getHref={(r) => '#/opportunities?flag=' + r.id} format={gbpFull} />
      </ChartFigure>
    </Panel>
  );
}

function CoverageSection() {
  const cp = coverageProps(estate, { noteFor: () => COPY.noContract && COPY.noContract.rowNote || 'There is no contract to read, so there is no clause to link.' });
  return (
    <Panel padded={24}>
      <ChartFigure as="h2" title="Spend with no contract on the register" description="Matching is by supplier name. A supplier shown here may have a contract under a different name.">
        <CoverageBlock {...cp} format={gbpFull} getHref={(r) => '#/spend/no-contract?supplier=' + encodeURIComponent(r.label)} />
      </ChartFigure>
    </Panel>
  );
}

function Gallery() {
  const mode = (location.hash || '').replace('#/', '') || 'all';
  const only = (k) => mode === 'all' || mode === k;
  return (
    <div className="page">
      <header>
        <p className="ds-caption-caps" style={{ margin: 0 }}>A3 gallery</p>
        <h1 className="ds-h2" style={{ margin: '4px 0 0' }}>UI kit and chart library</h1>
        <p className="ds-body" style={{ margin: '6px 0 0', color: 'var(--fg-2)' }}>Every component, fed by the real engine data for Marchbank Borough Council. As at 6 October 2026.</p>
      </header>
      {only('ui') && (
        <Section id="g-ui" title="UI kit">
          <PillsAndTags /><StatsAndEmpty /><Controls /><Tables /><Overlays />
        </Section>
      )}
      {only('charts') && (
        <Section id="g-charts" title="Chart library">
          <HeadlineSection /><HeadlinePieces /><OverviewRow /><RadarSection /><CapSection /><DetailCharts /><OpportunitiesSection /><CoverageSection />
        </Section>
      )}
    </div>
  );
}

function App() {
  const [railMenu, setRailMenu] = useState(null);
  return (
    <ToastProvider>
      <AppShell appName="Kontor financial layer" appShortName="Kontor" appBadge="Sample" railItems={RAIL} activeRail="spend" onRailChange={() => {}} onMenu={(el) => setRailMenu(el)} user={{ initials: 'MB', name: 'Marchbank commercial team' }}>
        <Gallery />
      </AppShell>
      <Menu open={!!railMenu} anchor={railMenu} onClose={() => setRailMenu(null)} label="Kontor menu" placement="right-end" items={[
        { id: 'ev', label: 'Why this matters', icon: 'lightbulb', href: '#/evidence' }, { id: 'me', label: 'How this is calculated', icon: 'book-open', href: '#/method' },
        { id: 'ab', label: 'About this data', icon: 'circle-info' }, { id: 'dg', label: 'Demo guide', icon: 'list-check' }, { id: 'fb', label: 'Give feedback', icon: 'comment' },
      ]} />
    </ToastProvider>
  );
}

const style = document.createElement('style');
style.textContent = `.g-section { display: flex; flex-direction: column; gap: 16px; } .g-stack { display: flex; flex-direction: column; gap: 16px; } .g-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.g-span4 { grid-column: 1 / -1; } .g-action { color: var(--fg-1); }`;
document.head.appendChild(style);
createRoot(document.getElementById('root')).render(<App />);
