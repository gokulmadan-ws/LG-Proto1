// V5. The Supplier matches tab body (#/spend/matches). Spend.jsx renders it under the shared page header (one h1, the tab strip),
// so this file only re-exports the section: do not mount it on its own, there is no h1 here.
export { default } from './spend/MatchesTab.jsx';
