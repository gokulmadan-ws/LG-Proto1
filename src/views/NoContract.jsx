// STUB (A1). V5 replaces this file.
//
// Contract
//   default export: <NoContract />          rendered inside <main id="shell-main"> by App.jsx for #/spend/no-contract (rendered by Spend.jsx)
//   props: none (a section of Spend.jsx)
//   Must render exactly ONE <h1> (use <PageHeader title=... />) inside <div className="page">, and no body background.
//   document.title defaults to "No contract on the register | Kontor financial layer" (routes.js); override with usePageTitle() from lib/router.js.
//   Estate and state: useEstate() from ../lib/estate.js. Router: useRoute(), navigate(), setQuery(), hrefFor().
import { StubPage } from '../components/StubPage.jsx';

export default function NoContract() {
  return <StubPage name="No contract on the register" owner="V5" />;
}
