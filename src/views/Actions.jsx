// Actions (#/actions Board, #/actions/results Results). Build spec 8.4: the opportunities your team is working on, and what came back.
//
//   default export: <Actions route />   route.seg[0]: absent (Board) or 'results' (routes.js sends any other sub-path to NotFound)
//   One h1 "Actions" on both tabs; the tab strip is RouteTabs (real links); document.title names the tab.
//   The tab bodies live in src/views/actions/ (Board.jsx, Results.jsx). Numbers come from src/lib/actions.js, words from src/lib/actions-copy.js.
import { useEstate } from '../lib/estate.js';
import { hrefFor, usePageTitle } from '../lib/router.js';
import { ACT } from '../lib/actions-copy.js';
import { PageHeader } from '../components/index.js';
import { RouteTabs } from '../ui/index.js';
import Board from './actions/Board.jsx';
import Results from './actions/Results.jsx';
import './Actions.css';

export default function Actions({ route }) {
  const { estate } = useEstate();
  const tab = route.seg[0] === 'results' ? 'results' : 'board';
  usePageTitle(tab === 'results' ? `${ACT.page.title}: ${ACT.page.results}` : ACT.page.title);
  return (
    <div className="page acts">
      <PageHeader
        eyebrow={estate.council.name}
        title={ACT.page.title}
        description={<p>{ACT.page.description}</p>}
        tabs={<RouteTabs label={ACT.page.tabsLabel} current={tab}
          items={[{ id: 'board', label: ACT.page.board, href: hrefFor('actions') }, { id: 'results', label: ACT.page.results, href: hrefFor('actions', { seg: ['results'] }) }]} />}
      />
      {tab === 'results' ? <Results /> : <Board route={route} />}
    </div>
  );
}
