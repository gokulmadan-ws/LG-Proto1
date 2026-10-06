// V5: Cap vs spend (#/spend, #/spend/matches, #/spend/no-contract). One page, one h1, three real routes shown as tabs.
//
//   default export: <Spend tab route />   tab: 'cap' | 'matches' | 'no-contract' (routes.js sends any other sub-path to NotFound)
//   The tab strip is RouteTabs (real links). The h1 stays "Cap vs spend" on every tab; document.title names the tab.
//   Query strings: cap tab ?state=over|close|within and ?payments=<contractId> · matches tab ?status=review|accepted|unmatched|yours · no-contract tab ?payee=<name>
//   The tab bodies live in src/views/spend/ (CapTab, MatchesTab, NoContractTab, PaymentsDrawer, PaymentList, strings.js).
import { useEstate } from '../lib/estate.js';
import { hrefFor, usePageTitle } from '../lib/router.js';
import { COPY } from '../lib/copy.js';
import { PageHeader, MethodLink } from '../components/index.js';
import { RouteTabs } from '../ui/index.js';
import CapTab from './spend/CapTab.jsx';
import MatchesTab from './spend/MatchesTab.jsx';
import NoContractTab from './spend/NoContractTab.jsx';
import { DESCRIPTIONS, TABS, TABS_LABEL } from './spend/strings.js';
import './Spend.css';

const METHOD_SECTION = { cap: 'cap', matches: 'matching', 'no-contract': 'spend' };

export default function Spend({ tab = 'cap' }) {
  const { estate } = useEstate();
  const current = TABS.find((t) => t.id === tab) || TABS[0];
  usePageTitle(current.title);
  const lead = current.id === 'cap' ? COPY.pages.spend.subtitle : current.id === 'matches' ? DESCRIPTIONS.matches : DESCRIPTIONS.noContract;

  return (
    <div className="page spend">
      <PageHeader
        eyebrow={estate.council.name}
        title={COPY.pages.spend.title}
        asAt
        description={(
          <>
            <p>{lead} <MethodLink section={METHOD_SECTION[current.id]} /></p>
          </>
        )}
        tabs={<RouteTabs label={TABS_LABEL} current={current.id} items={TABS.map((t) => ({ id: t.id, label: t.label, href: hrefFor('spend', { seg: t.seg }) }))} />}
      />
      {current.id === 'matches' ? <MatchesTab /> : current.id === 'no-contract' ? <NoContractTab /> : <CapTab />}
    </div>
  );
}
