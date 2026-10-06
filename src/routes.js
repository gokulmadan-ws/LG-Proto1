// Route table and rail. One place that says which page renders for which address.
//
//   ROUTES[name] = { title, rail, component }
//     title      default document.title is `<title> | Kontor financial layer`; a view can override it with usePageTitle()
//     rail       rail item id to highlight: a string, null (highlight nothing) or (route) => string | null
//     component  rendered by App.jsx with the useRoute() object as `route`, plus the convenience props noted below
//   resolveRoute(route) -> { title, rail, Component, known } always (unknown address -> NotFound, known = false)
//   RAIL: the six rail items (blueprint section 1 item 11 / requirements section 2)
import Overview from './views/Overview.jsx';
import Opportunities from './views/Opportunities.jsx';
import Renewals from './views/Renewals.jsx';
import Spend from './views/Spend.jsx';
import Contracts from './views/Contracts.jsx';
import ContractDetail from './views/ContractDetail.jsx';
import Source from './views/Source.jsx';
import Method from './views/Method.jsx';
import Roadmap from './views/Roadmap.jsx';
import Evidence from './views/Evidence.jsx';
import Guide from './views/Guide.jsx';
import { NotFound } from './components/NotFound.jsx';
import { RAIL, RAIL_IDS } from './shell/rail.js';

export { RAIL };
const SPEND_TABS = new Set(['matches', 'no-contract']);

// Wrapper components keep the route-to-props mapping here, so views stay free of address parsing.
function ContractsRoute({ route }) {
  const id = route.seg[0];
  return id ? <ContractDetail id={id} contractId={id} route={route} /> : <Contracts route={route} />;
}
function SourceRoute({ route }) {
  return <Source contractId={route.seg[0]} extractionId={route.seg[1]} from={route.query.get('from') || null} route={route} />;
}
function SpendRoute({ route }) {
  return <Spend tab={route.seg[0] || 'cap'} route={route} />;
}

// maxSeg: how many path segments after the name the route accepts; more means "not found" (so #/overview/x or #/spend/bogus
// show the not-found page instead of a real page under a wrong address). valid(route): extra check on the segments.
export const ROUTES = {
  overview: { title: 'Overview', rail: 'overview', component: Overview, maxSeg: 0 },
  opportunities: { title: 'Opportunities', rail: 'opportunities', component: Opportunities, maxSeg: 0 },
  renewals: { title: 'Renewal radar', rail: 'renewals', component: Renewals, maxSeg: 0 },
  spend: { title: 'Cap vs spend', rail: 'spend', component: SpendRoute, maxSeg: 1, valid: (r) => r.seg.length === 0 || SPEND_TABS.has(r.seg[0]) },
  contracts: { title: 'Contracts', rail: 'contracts', component: ContractsRoute, maxSeg: 1 },
  // The source viewer keeps the rail item of the page that linked to it (?from=), default Opportunities.
  source: {
    title: 'Source viewer',
    rail: (route) => { const f = route.query.get('from'); return RAIL_IDS.has(f) ? f : 'opportunities'; },
    component: SourceRoute,
    maxSeg: 2,
  },
  method: { title: 'How this is calculated', rail: null, component: Method, maxSeg: 0 },
  roadmap: { title: 'Roadmap', rail: 'roadmap', component: Roadmap, maxSeg: 0 },
  evidence: { title: 'Evidence', rail: null, component: Evidence, maxSeg: 0 },
  // The Guide is a header tab, not a rail item: the rail highlights nothing and AppFrame marks the Guide tab active (?s=<section> deep links).
  guide: { title: 'Guide', rail: null, component: Guide, maxSeg: 0 },
};

const NOT_FOUND = { title: 'Page not found', rail: null, component: NotFound };

export function resolveRoute(route) {
  let def = Object.prototype.hasOwnProperty.call(ROUTES, route.name) ? ROUTES[route.name] : NOT_FOUND;
  if (def !== NOT_FOUND && (route.seg.length > def.maxSeg || (def.valid && !def.valid(route)))) def = NOT_FOUND;
  const rail = typeof def.rail === 'function' ? def.rail(route) : def.rail;
  return { title: def.title, rail: rail || null, Component: def.component, known: def !== NOT_FOUND };
}
