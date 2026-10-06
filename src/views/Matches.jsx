// STUB (A1). V5 replaces this file.
//
// Contract
//   default export: <Matches />          rendered inside <main id="shell-main"> by App.jsx for #/spend/matches (rendered by Spend.jsx)
//   props: none (a section of Spend.jsx; the Spend route renders it, it must not render its own <h1> if Spend.jsx already does)
//   Must render exactly ONE <h1> (use <PageHeader title=... />) inside <div className="page">, and no body background.
//   document.title defaults to "Supplier matches | Kontor financial layer" (routes.js); override with usePageTitle() from lib/router.js.
//   Estate and state: useEstate() from ../lib/estate.js. Router: useRoute(), navigate(), setQuery(), hrefFor().
import { StubPage } from '../components/StubPage.jsx';

export default function Matches() {
  return <StubPage name="Supplier matches" owner="V5" />;
}
