// STUB (A1). V3 replaces this file.
//
// Contract
//   default export: <Method />          rendered inside <main id="shell-main"> by App.jsx for #/method (?s=<section> scrolls to that section)
//   props: none. Read the section with useRoute().query.get('s') and scrollIntoView({ behavior: scrollBehavior() }) after render (a11y.js)
//   Must render exactly ONE <h1> (use <PageHeader title=... />) inside <div className="page">, and no body background.
//   document.title defaults to "How this is calculated | Kontor financial layer" (routes.js); override with usePageTitle() from lib/router.js.
//   Estate and state: useEstate() from ../lib/estate.js. Router: useRoute(), navigate(), setQuery(), hrefFor().
import { StubPage } from '../components/StubPage.jsx';

export default function Method() {
  return <StubPage name="How this is calculated" owner="V3" />;
}
