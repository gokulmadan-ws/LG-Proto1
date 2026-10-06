// No contract on the register (#/spend/no-contract): payees in the spend files with no contract to read. Not in the headline, no clause to link.
//   Query: ?payee=<name as paid>   opens the payments drawer for that payee
// Every number is the engine's estate.coverage (accepted-or-unmatched payees with no contract; Suggested payees are shown as "awaiting review").
import { useEffect, useRef } from 'react';
import { useEstate } from '../../lib/estate.js';
import { useRoute, setQuery, hrefFor } from '../../lib/router.js';
import { COPY } from '../../lib/copy.js';
import { fmtGBP } from '../../lib/format.js';
import { Panel } from '../../ui/index.js';
import { CoverageBlock, coverageProps, gbpFull } from '../../charts/index.js';
import { PayeeDrawer } from './PaymentsDrawer.jsx';
import { NOC } from './strings.js';

export default function NoContractTab() {
  const { estate } = useEstate();
  const { query } = useRoute();
  const cov = estate.coverage;
  const payeeParam = query.get('payee');
  const payee = payeeParam && cov.noContract.some((x) => x.name === payeeParam) ? payeeParam : null;
  const props = coverageProps(estate, { noteFor: () => NOC.rowNote });

  // Workaround for CoverageBlock (A3), which leaves the stacked bar's segments focusable: the "awaiting review" segment is 0.2% of the bar, a 4px wide
  // button that fails WCAG 2.5.8 target size. The stat blocks above the bar already say every figure in text, so the bar is made pointer-only
  // (what StackedBar's `focusable={false}` does). Request for A3 in docs/handoff/V5.md: pass `focusable={false}` from CoverageBlock.
  const cov$ = useRef(null);
  useEffect(() => {
    const bar = cov$.current && cov$.current.querySelector('.kviz-stack');
    if (!bar) return;
    bar.removeAttribute('role'); bar.removeAttribute('aria-label'); bar.setAttribute('aria-hidden', 'true');
    bar.querySelectorAll('button').forEach((b) => { b.tabIndex = -1; b.removeAttribute('aria-label'); });
  });

  return (
    <>
      <Panel as="h2" title={NOC.panelTitle} padded={16}>
        <p className="noc-intro">{COPY.noContract.intro(cov.noContract.length, cov.noContractGBP)}</p>
        <div ref={cov$} className="noc-cov">
          <CoverageBlock {...props} format={gbpFull} heading={NOC.headingNoContract} headingAs="h3" onOpen={(row) => setQuery({ payee: row.id })} />
        </div>
        {cov.awaitingReviewGBP > 0 && (
          <p className="noc-pending">
            <i className="fa-solid fa-hourglass-half" aria-hidden="true" /> {NOC.pending(fmtGBP(cov.awaitingReviewGBP))}{' '}
            <a className="mt-link" href={hrefFor('spend', { seg: ['matches'], query: { status: 'review' } })}>{NOC.pendingLink}</a>
          </p>
        )}
        <p className="noc-foot">{NOC.footnote} <a className="method-link" href={hrefFor('method', { query: { s: 'spend' } })}>{COPY.caveat.link}</a></p>
      </Panel>
      <PayeeDrawer payee={payee} onClose={() => setQuery({ payee: null })} />
    </>
  );
}
