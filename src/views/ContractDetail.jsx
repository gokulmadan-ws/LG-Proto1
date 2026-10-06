// STUB (A1). V6 replaces this file.
//
// Contract
//   default export: <ContractDetail id contractId route />   for #/contracts/<id>
//   props: id and contractId (same string, e.g. 'C-005'), route (the useRoute() object). Unknown id: show a not-found state with ONE <h1>.
//   Render ONE <h1> (the contract title) via <PageHeader> inside <div className="page">, and call usePageTitle(contract.title).
import { StubPage } from '../components/StubPage.jsx';

export default function ContractDetail({ id }) {
  return <StubPage name="Contract detail" owner="V6" note={`id: ${id || 'none'}`} />;
}
