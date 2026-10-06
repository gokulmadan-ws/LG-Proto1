// Foundation integration probe (built by tests/foundation.mjs, never shipped). Renders the core of the Overview from the
// REAL estate through the REAL charts and composites, inside the REAL shell, router, banner and overlays:
//   headline sentence as the page h1, the four basis cards with the bar, the exact sum line, and the triage note.
// The two buttons at the bottom drive estate actions so the test can prove the loop estate -> charts -> shell updates live.
// src/dev/INT.jsx imports this file, so `node scripts/build.mjs --entry src/dev/INT.jsx --outdir .scratch/INT` also works.
import '../../src/shell/shell.css';
import '../../src/ui/kit.css';
import '../../src/charts/charts.css';
import '../../src/styles/app.css';
import { createRoot } from 'react-dom/client';
import { AppFrame } from '../../src/shell/AppFrame.jsx';
import { Overlays } from '../../src/components/Overlays.jsx';
import { PageHeader } from '../../src/components/PageHeader.jsx';
import { MethodLink } from '../../src/components/MethodLink.jsx';
import { useState } from 'react';
import { Panel, Drawer, useToast } from '../../src/ui/index.js';
import { HeadlineSentence, HeadlineBreakdown, headlineProps } from '../../src/charts/index.js';
import { useEstate } from '../../src/lib/estate.js';
import { COPY, sumLine, excludedNote } from '../../src/lib/copy.js';
import { fmtGBPCompact } from '../../src/lib/format.js';
import { hrefFor, useRoute } from '../../src/lib/router.js';
import { resolveRoute } from '../../src/routes.js';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.jsx';

const { Button } = window.Springboard20DesignSystem_019e02;

function OverviewProbe() {
  const { estate, actions } = useEstate();
  const toast = useToast();                      // the kit hook: AppFrame bridges it to the same stack as useUI().toast
  const [drawer, setDrawer] = useState(false);
  const hp = headlineProps(estate);
  const excluded = excludedNote(estate.totals);
  return (
    <div className="page">
      <PageHeader
        eyebrow={estate.council.name}
        title={<HeadlineSentence total={hp.total} contractCount={hp.contractCount} format={fmtGBPCompact} />}
        description={<>
          <p>Indicative figures. As at 6 October 2026.</p>
          <p>{COPY.caveat.short} <MethodLink section="indicative" /></p>
        </>}
        actions={<Button variant="outline" leftIcon="circle-play" onClick={() => {}}>Open demo guide</Button>}
      />
      <Panel padded={24}>
        <HeadlineBreakdown {...hp} format={fmtGBPCompact}
          getHref={(t) => hrefFor('opportunities', { query: { type: t } })}
          footer={<p className="kviz-note" id="sum-line">{sumLine(estate.totals)}{excluded ? ' ' + excluded : ''}</p>} />
      </Panel>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="outline" id="probe-exclude" onClick={() => actions.setTriage('F-C-005-overCap', 'not_an_issue')}>Mark the over-cap flag as not an issue</Button>
        <Button variant="outline" id="probe-reset" onClick={() => actions.resetAll()}>Reset changes</Button>
        <Button variant="outline" id="probe-toast" onClick={() => toast({ tone: 'success', title: 'Kit toast shown.', description: 'It uses the one toast stack.' })}>Show a toast</Button>
        <Button variant="outline" id="probe-drawer" onClick={() => setDrawer(true)}>Open a drawer</Button>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Kit drawer in the real shell" subtitle="Integration probe">
        <p>The drawer sits above the shell and the banner, and focus returns to the button that opened it.</p>
      </Drawer>
    </div>
  );
}

// The real routed app (same as src/App.jsx) with ONE difference: #/overview renders the probe instead of the Overview stub,
// so card links, the rail highlight, titles and focus handling run through the real router.
function Routed() {
  const route = useRoute();
  const { title, rail, Component } = resolveRoute(route);
  const Page = route.name === 'overview' ? OverviewProbe : Component;
  return (
    <AppFrame route={route} rail={rail} title={title} overlays={<Overlays />}>
      <ErrorBoundary resetKey={route.path}><Page route={route} /></ErrorBoundary>
    </AppFrame>
  );
}

createRoot(document.getElementById('root')).render(<Routed />);
