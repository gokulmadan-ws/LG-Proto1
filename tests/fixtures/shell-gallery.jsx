// Test fixture (built by tests/smoke.mjs group "ui", never shipped): the shared composites, toasts, confirm dialog and
// error boundary inside the real AppFrame, the way a view agent's dev entry mounts a view.
import '../../src/shell/shell.css';
import '../../src/ui/kit.css';
import '../../src/charts/charts.css';
import '../../src/styles/app.css';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { AppFrame } from '../../src/shell/AppFrame.jsx';
import { Overlays } from '../../src/components/Overlays.jsx';
import { PageHeader, ClauseLink, MethodLink, ConfidencePill, AsAt } from '../../src/components/index.js';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.jsx';
import { useUI } from '../../src/lib/ui-context.jsx';
import { usePageTitle } from '../../src/lib/router.js';

const { Button, Tabs, Breadcrumb, Card, Input, Select } = window.Springboard20DesignSystem_019e02;

function Bomb() { throw new Error('Boom from the gallery'); }

function Gallery() {
  const ui = useUI();
  usePageTitle('Gallery override');
  const [tab, setTab] = useState('cap');
  const [bomb, setBomb] = useState(false);
  return (
    <div className="page">
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Opportunities', href: '#/opportunities' }, { label: 'C-005', href: '#/contracts/C-005' }, { label: 'Clause 14.3' }]} />}
        eyebrow="Marchbank Borough Council"
        title="Cap vs spend"
        asAt
        description={<p>What you have paid each supplier since the contract started. An <a href="#/method">unclassed link</a> in prose is underlined. <MethodLink section="cap" /></p>}
        actions={<><Button variant="outline" leftIcon="download">Export opportunities</Button><Button leftIcon="plus">Give feedback</Button></>}
        tabs={<Tabs aria-label="Cap vs spend views" value={tab} onChange={setTab} items={[{ value: 'cap', label: 'Cap vs spend' }, { value: 'matches', label: 'Supplier matches' }]} />}
      />
      <Card title="Shared composites" description="ClauseLink, MethodLink, ConfidencePill, AsAt">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <ClauseLink contractId="C-005" extractionId="X-C-005-maximumValue" page={23} from="opportunities" context="Highways reactive maintenance" />
          <MethodLink section="renewals" />
          <ConfidencePill score={0.95} />
          <ConfidencePill score={0.8} />
          <ConfidencePill score={0.5} reason="Scanned page read by OCR" />
          <AsAt />
        </div>
      </Card>
      <Card title="Toasts, confirm, errors" description="Each button drives the real UI context">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" id="t-info" onClick={() => ui.toast({ tone: 'info', title: 'Apps isn\'t part of this prototype.', description: 'It sits outside Stage 1. Use the left rail to explore the demo.' })}>Info toast</Button>
          <Button variant="outline" id="t-success" onClick={() => ui.toast({ tone: 'success', title: 'Feedback saved on this device. Thank you.' })}>Success toast</Button>
          <Button variant="outline" id="t-warning" onClick={() => ui.toast({ tone: 'warning', title: 'Match rejected.', description: 'Marchbank Skips Ltd is now unmatched.' })}>Warning toast</Button>
          <Button variant="outline" id="t-error" onClick={() => ui.toast({ tone: 'error', title: 'Export failed.', description: 'Your browser blocked the download. Allow downloads for this page and try again.' })}>Error toast</Button>
          <Button variant="outline" id="confirm-btn" onClick={async () => {
            const ok = await ui.confirm({ title: 'Reset your changes?', description: 'This clears your reviews, match decisions, hand-checks, feedback and assumptions on this device. The demo goes back to its starting numbers.', confirmLabel: 'Reset changes', destructive: true });
            ui.toast({ tone: ok ? 'success' : 'info', title: ok ? 'Changes reset.' : 'Nothing changed.' });
          }}>Reset demo changes</Button>
          <Button variant="outline" id="bomb-btn" onClick={() => setBomb(true)}>Throw an error</Button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, maxWidth: 520 }}>
          <Input aria-label="Search suppliers" placeholder="Search suppliers" leftIcon="magnifying-glass" />
          <Select aria-label="Status" options={['Open', 'Reviewed', 'All']} />
        </div>
      </Card>
      <ErrorBoundary resetKey={bomb ? 1 : 0}>{bomb ? <Bomb /> : <p className="ds-body">The error boundary wraps this paragraph.</p>}</ErrorBoundary>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<AppFrame rail="spend" title="Gallery" overlays={<Overlays />}><Gallery /></AppFrame>);
