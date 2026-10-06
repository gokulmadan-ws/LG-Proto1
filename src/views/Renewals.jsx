// STUB (A1). V1 replaces this file.
//
// Contract
//   default export: <Renewals />          rendered inside <main id="shell-main"> by App.jsx for #/renewals
//   props: none
//   Must render exactly ONE <h1> (use <PageHeader title=... />) inside <div className="page">, and no body background.
//   document.title defaults to "Renewal radar | Kontor financial layer" (routes.js); override with usePageTitle() from lib/router.js.
//   Estate and state: useEstate() from ../lib/estate.js. Router: useRoute(), navigate(), setQuery(), hrefFor().
import { StubPage } from '../components/StubPage.jsx';

export default function Renewals() {
  return <StubPage name="Renewal radar" owner="V1" />;
}
