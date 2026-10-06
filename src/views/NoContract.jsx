// V5. The No contract on the register tab body (#/spend/no-contract). Spend.jsx renders it under the shared page header (one h1, the tab strip),
// so this file only re-exports the section: do not mount it on its own, there is no h1 here.
export { default } from './spend/NoContractTab.jsx';
