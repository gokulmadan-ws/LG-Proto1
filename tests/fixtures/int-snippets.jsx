// The copy-paste snippets of docs/foundation-status.md, compiled and run in the real shell (built by tests/foundation.mjs).
// If you change a snippet in that document, change it here too: this file is what proves it runs.
import '../../src/shell/shell.css';
import '../../src/ui/kit.css';
import '../../src/charts/charts.css';
import '../../src/styles/app.css';
import { createRoot } from 'react-dom/client';
import { AppFrame } from '../../src/shell/AppFrame.jsx';
import { PageHeader, ClauseLink, ConfidencePill, MethodLink } from '../../src/components/index.js';
import { Panel, Drawer, ConfirmDialog, useToast, Pill } from '../../src/ui/index.js';
import {
  ChartFigure, Legend, OpportunityList, FlagFilterChips, BulletList, RadarLanes, RADAR_LEGEND, BULLET_LEGEND,
  opportunityItems, opportunityCounts, capItems, capTable, radarRows, gbpFull,
} from '../../src/charts/index.js';
import { useEstate } from '../../src/lib/estate.js';
import { evidenceFor, evidenceForField, sourceHref } from '../../src/lib/evidenceFor.js';
import { actionLine, needsAttentionText, noticeShortText, reasonFor, flagTypeLabel, radarFootnote } from '../../src/lib/copy.js';
import { useRoute, setQuery, hrefFor } from '../../src/lib/router.js';
import { useState } from 'react';

const { Button } = window.Springboard20DesignSystem_019e02;

function Snippets() {
  const { estate, actions } = useEstate();
  const { query } = useRoute();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --- Opportunities: all ranked flags, filtered by YOU (status, search, type), never re-sorted by the chart
  const clauseFor = (f) => { const t = evidenceFor(f); return t ? { label: 'View clause, page ' + t.page, href: sourceHref(t, 'opportunities') } : null; };
  const all = opportunityItems(estate, { clauseFor });
  const type = query.get('type');                       // 'overCap' | 'nearCap' | 'renewal' | 'uplift' | null
  const shown = all.filter((i) => i.status === 'to_investigate' || i.status === 'under_review');   // the Open filter

  // --- Flag drawer: driven by ?flag=<id> and estate.flagsById, never by the filtered list
  const flagId = query.get('flag');
  const flag = flagId ? estate.flagsById[flagId] : null;
  const contract = flag ? estate.contractsById[flag.contractId] : null;

  // --- Radar: the extra slot carries the action line, notice period, confidence and the clause link
  const radarExtra = (row) => {
    const c = estate.contractsById[row.id], d = estate.derived[row.id], ev = evidenceForField(c.id, 'noticePeriod');
    return (<>
      <span>{needsAttentionText(c, d) || actionLine(c, d)}</span>
      <span>Notice period: {noticeShortText(c.notice)}</span>
      <ConfidencePill score={c.confidence.noticePeriod} />
      {ev && <ClauseLink contractId={c.id} extractionId={ev.extractionId} page={ev.page} from="renewals" context={c.title} />}
    </>);
  };

  // --- Cap vs spend: the spend-to-payments button goes in the extra slot
  const caps = capItems(estate, { extraFor: (it, c) => <Button variant="outline" size="sm" leftIcon="list" onClick={() => toast({ tone: 'info', title: 'Payments for ' + c.title })}>See payments</Button> });

  return (
    <div className="page">
      <PageHeader eyebrow="Integration" title="Foundation snippets" asAt
        description={<p>Every snippet in docs/foundation-status.md, running. <MethodLink section="indicative" /></p>}
        actions={<Button variant="outline" id="snip-reset" onClick={() => setConfirmOpen(true)}>Reset changes</Button>} />

      <Panel padded={24}>
        <ChartFigure as="h2" title="Opportunities to investigate" description="OpportunityList with FlagFilterChips and a drawer opened by ?flag=">
          <FlagFilterChips counts={opportunityCounts(all)} value={type} onChange={(t) => setQuery({ type: t })} />
          <OpportunityList items={shown} filter={type} onOpen={(row) => setQuery({ flag: row.id })} />
        </ChartFigure>
      </Panel>

      <Panel padded={24}>
        <ChartFigure as="h2" title="Renewal radar" legend={<Legend items={RADAR_LEGEND} />} footnote={radarFootnote(estate.radar.groups.later.count)}>
          <RadarLanes rows={radarRows(estate)} extraFor={radarExtra} getHref={(r) => hrefFor('contracts', { seg: [r.id] })} />
        </ChartFigure>
      </Panel>

      <Panel padded={24}>
        <ChartFigure as="h2" title="Cap vs spend" legend={<Legend items={BULLET_LEGEND} />} table={capTable(caps)}>
          <BulletList items={caps} format={gbpFull} limit={12} getHref={(r) => hrefFor('contracts', { seg: [r.id] })} />
        </ChartFigure>
      </Panel>

      <Drawer open={!!flag} onClose={() => setQuery({ flag: null })} size="lg"
        title={flag ? flagTypeLabel(flag) : ''} subtitle={contract ? contract.title : ''}
        footer={<Button variant="outline" onClick={() => setQuery({ flag: null })}>Close panel</Button>}>
        {flag && contract && (
          <div style={{ display: 'grid', gap: 12 }}>
            <p id="snip-reason">{reasonFor(flag, contract, estate.derived[contract.id])}</p>
            <Pill tone="neutral" icon="circle-info">{flag.id}</Pill>
            <div>
              <label htmlFor="snip-triage">Review status</label>{' '}
              <select id="snip-triage" value={(estate.state && estate.state.triage) || ''} onChange={(e) => actions.setTriage(flag.id, e.target.value || null)}>
                <option value="">To investigate</option><option value="explained">Explained</option><option value="not_an_issue">Not an issue</option>
              </select>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={confirmOpen} destructive title="Reset your changes?" confirmLabel="Reset changes"
        description="This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device."
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); actions.resetAll(); toast({ tone: 'success', title: 'Changes reset.', description: 'The demo is back to its starting numbers.' }); }} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <AppFrame rail="overview" title="Overview"><Snippets /></AppFrame>);
