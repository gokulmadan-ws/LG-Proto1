// STUB (A1). V3 replaces this file.
//
// Contract
//   default export: <Source contractId extractionId from route />   for #/source/<contractId>/<extractionId>?from=<railId>
//   props: contractId (string), extractionId (string), from (rail id or null: where the user came from, default 'opportunities'),
//          route (the useRoute() object). Either id may be undefined for a malformed address: show the R7.9 "page isn't in the sample" copy.
//   Must render exactly ONE <h1> (the clause ref) inside <div className="page">. Set the tab title with usePageTitle(clauseRef).
//   Rail: the item named by `from` stays highlighted (routes.js railFor), so "Back to ..." can use hrefFor(from).
import { StubPage } from '../components/StubPage.jsx';

export default function Source({ contractId, extractionId, from }) {
  return (
    <StubPage
      name="Source viewer"
      owner="V3"
      note={`contractId: ${contractId || 'none'}, extractionId: ${extractionId || 'none'}, from: ${from || 'none'}`}
    />
  );
}
