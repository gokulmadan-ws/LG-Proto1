// STUB (A1). V2 replaces this file.
//
// Contract
//   default export: <Opportunities />          rendered inside <main id="shell-main"> by App.jsx for #/opportunities (?type=overCap|nearCap|renewal|uplift, ?status=, ?flag=<id> opens FlagDrawer)
//   props: none. Filters live in the query string via setQuery(); open the drawer with setQuery({ flag: id })
//   Must render exactly ONE <h1> (use <PageHeader title=... />) inside <div className="page">, and no body background.
//   document.title defaults to "Opportunities | Kontor financial layer" (routes.js); override with usePageTitle() from lib/router.js.
//   Estate and state: useEstate() from ../lib/estate.js. Router: useRoute(), navigate(), setQuery(), hrefFor().
import { StubPage } from '../components/StubPage.jsx';

export default function Opportunities() {
  return <StubPage name="Opportunities" owner="V2" />;
}
