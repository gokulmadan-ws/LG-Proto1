// STUB (A1). V1 replaces this file.
//
// Contract
//   default export: <Overview />          rendered inside <main id="shell-main"> by App.jsx for #/overview (also the empty hash)
//   props: none (route object is also passed as `route`)
//   Must render exactly ONE <h1> (use <PageHeader title=... />) inside <div className="page">, and no body background.
//   document.title defaults to "Overview | Kontor financial layer" (routes.js); override with usePageTitle() from lib/router.js.
//   Estate and state: useEstate() from ../lib/estate.js. Router: useRoute(), navigate(), setQuery(), hrefFor().
import { StubPage } from '../components/StubPage.jsx';

export default function Overview() {
  return <StubPage name="Overview" owner="V1" />;
}
