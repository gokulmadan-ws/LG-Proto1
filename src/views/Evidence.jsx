// STUB (A1). V7 replaces this file.
//
// Contract
//   default export: <Evidence />          rendered inside <main id="shell-main"> by App.jsx for #/evidence (reached from the rail Menu and the Overview evidence strip)
//   props: none
//   Must render exactly ONE <h1> (use <PageHeader title=... />) inside <div className="page">, and no body background.
//   document.title defaults to "Evidence | Kontor financial layer" (routes.js); override with usePageTitle() from lib/router.js.
//   Estate and state: useEstate() from ../lib/estate.js. Router: useRoute(), navigate(), setQuery(), hrefFor().
import { StubPage } from '../components/StubPage.jsx';

export default function Evidence() {
  return <StubPage name="Evidence" owner="V7" />;
}
