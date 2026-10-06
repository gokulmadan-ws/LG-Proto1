// V6: contract detail (#/contracts/<id>). Must-have 1 made visible: the nine financial questions, each answer in plain words with its confidence and
// the clause and page it came from, next to what the engine derives from them, the spend against the cap and the payments behind it.
//
//   default export: <ContractDetail id contractId route />      id and contractId are the same string ('C-005'); a lower-case id is accepted.
//   Query string: ?flag=<flagId> opens the flag drawer (mounted once for every route; the flag rows here call setQuery({ flag })).
//   Unknown id: a not-found state with ONE <h1> ("Contract not found.") and a "Go to contracts" button.
//
// Order on the page: header, flags first, key figures, then two columns (New financial questions | Derived), spend by contract year, payments.
// The sub-components live in ./contracts/. Numbers and sentences come from useEstate(), the engine output and src/lib/copy.js; strings the copy deck
// does not hold are in ./contracts/strings.js (listed in docs/handoff/V6.md).
import { useEstate } from '../lib/estate.js';
import { navigate, usePageTitle } from '../lib/router.js';
import { COPY, capBasisLabel, capSourceLabel, capStateLabel, contractStatusLabel, sourceLabel } from '../lib/copy.js';
import { fmtDate, fmtGBP, fmtPct } from '../lib/format.js';
import { PageHeader } from '../components/index.js';
import DS from '../ui/ds.js';
import { Pill, StatTile } from '../ui/index.js';
import { CapStatePill } from '../charts/index.js';
import { FlagsSection } from './contracts/Flags.jsx';
import { QuestionsPanel } from './contracts/Questions.jsx';
import { DerivedPanel } from './contracts/Derived.jsx';
import { SpendSection } from './contracts/SpendSection.jsx';
import { PaymentsSection } from './contracts/Payments.jsx';
import { DETAIL } from './contracts/strings.js';
import './ContractDetail.css';

const { Breadcrumb, Button } = DS;

function UnknownContract({ id }) {
  const N = DETAIL.notFound;
  return (
    <div className="page cd">
      <PageHeader
        eyebrow={N.eyebrow}
        title={N.title}
        description={<p>{N.body(id)}</p>}
        actions={<Button type="button" leftIcon="folder-open" onClick={() => navigate('#/contracts')}>{N.button}</Button>}
      />
    </div>
  );
}

/** The key figures strip: five tiles, every value straight from the contract or the engine. */
function KeyFigures({ contract: c, estate }) {
  const F = DETAIL.figures;
  const d = estate.derived[c.id];
  const cap = d.cap;
  const sp = d.spend;
  const partial = sp.coverage === 'partial';
  const annualCap = cap.testable && cap.basis === 'annual';
  return (
    <section className="cd-figs" aria-labelledby="cd-figs-title">
      <h2 id="cd-figs-title" className="sr-only">{F.label}</h2>
      <div className="cd-figs__grid">
        <StatTile label={F.annual} value={fmtGBP(c.annualValueGBP)} icon="sterling-sign" foot={F.annualFoot} data-fig="annual" />
        <StatTile
          label={F.cap} value={c.cap ? fmtGBP(c.cap.amountGBP) : 'None'} icon="scale-balanced" data-fig="cap"
          foot={c.cap ? `${capBasisLabel(c.cap)} · ${capSourceLabel(c.cap)}` : undefined}
        />
        <StatTile
          label={partial ? `${F.spend}, ${F.atLeast.toLowerCase()}` : F.spend} value={fmtGBP(sp.toDate)} icon="receipt" data-fig="spend"
          foot={partial ? F.partialFoot(sp.coverageFrom) : F.spendFoot(sp.paymentCount, sp.latestPayment)}
        />
        <StatTile
          label={annualCap ? `${F.used}, ${F.usedAnnualFoot.toLowerCase()}` : F.used} value={cap.testable ? fmtPct(cap.utilisation) : 'Cannot test'} icon="percent" data-fig="used"
          foot={cap.testable ? <CapStatePill state={cap.state} label={capStateLabel(cap)} wrap /> : undefined}
        />
        <StatTile
          label={d.status === 'ended' ? F.termEnded : F.termLive} value={fmtDate(c.endDate)} icon="calendar-days" data-fig="term"
          foot={F.termFoot(c)}
        />
      </div>
    </section>
  );
}

export default function ContractDetail({ id }) {
  const { estate, state } = useEstate();
  const raw = String(id || '');
  const c = estate.contractsById[raw] || estate.contractsById[raw.toUpperCase()];
  usePageTitle(c ? c.title : 'Contract not found');
  if (!c) return <UnknownContract id={raw} />;

  const d = estate.derived[c.id];
  return (
    <div className="page cd" data-contract-id={c.id}>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: DETAIL.crumbRoot, href: '#/contracts' }, { label: c.id, href: `#/contracts/${encodeURIComponent(c.id)}` }]} />}
        eyebrow={DETAIL.eyebrow(c)}
        title={c.title}
        asAt
        description={(
          <>
            <p>{COPY.pages.contractDetail.subtitle(c)}</p>
            <p className="cd-chips">
              <span className="sr-only">{DETAIL.statusKey}: </span>
              {d.status === 'live'
                ? <Pill tone="success" icon="circle-play">{contractStatusLabel(d.status)}</Pill>
                : <Pill icon="circle-stop">{contractStatusLabel(d.status)}</Pill>}
              <Pill icon={c.source === 'find_a_tender' ? 'landmark' : 'file-pdf'} data-testid="source-chip">{DETAIL.sourceKey}: {sourceLabel(c)}</Pill>
            </p>
          </>
        )}
      />

      <FlagsSection contract={c} estate={estate} />
      <KeyFigures contract={c} estate={estate} />

      <div className="cd-cols">
        <QuestionsPanel contract={c} estate={estate} handcheck={state.handcheck} />
        <div className="cd-aside">
          <DerivedPanel contract={c} estate={estate} />
        </div>
      </div>

      <SpendSection contract={c} estate={estate} />
      <PaymentsSection key={c.id} contract={c} estate={estate} />
    </div>
  );
}
