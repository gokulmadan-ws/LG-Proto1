// STUB (A1). V5 replaces this file (and may add Matches.jsx / NoContract.jsx, stubs exist).
//
// Contract
//   default export: <Spend tab route />   for #/spend (tab 'cap'), #/spend/matches (tab 'matches'), #/spend/no-contract (tab 'no-contract')
//   props: tab ('cap' | 'matches' | 'no-contract'), route (the useRoute() object). routes.js sends any other sub-path to NotFound.
//   The three tabs are real routes: link between them with hrefFor('spend', { seg: ['matches'] }). Render ONE <h1> via <PageHeader>
//   inside <div className="page">; the tab strip goes in PageHeader's `tabs` slot.
import { StubPage } from '../components/StubPage.jsx';
import Matches from './Matches.jsx';
import NoContract from './NoContract.jsx';

export default function Spend({ tab = 'cap' }) {
  if (tab === 'matches') return <Matches />;
  if (tab === 'no-contract') return <NoContract />;
  return <StubPage name="Cap vs spend" owner="V5" />;
}
