import { hrefFor } from '../lib/router.js';

/**
 * Link to the source viewer for one extracted answer: text "View clause, page N".
 *   <ClauseLink contractId="C-005" extractionId="X-C-005-maximumValue" page={23} from="opportunities" />
 *   -> <a href="#/source/C-005/X-C-005-maximumValue?from=opportunities">View clause, page 23</a>
 * `from` is the rail id of the page the user came from (keeps that rail item highlighted, drives "Back to ...").
 * `context` adds visually hidden text for screen readers when a list repeats the link
 * ("View clause, page 23, Highways reactive maintenance"). Extra props (className, onClick, ...) go to the <a>.
 */
export function ClauseLink({ contractId, extractionId, page, from, context, children, className = '', ...rest }) {
  const seg = [contractId, extractionId].filter(Boolean);
  const href = hrefFor('source', { seg, query: from ? { from } : {} });
  const label = children || (page ? `View clause, page ${page}` : 'View clause');
  return (
    <a className={('clause-link ' + className).trim()} href={href} {...rest}>
      <i className="fa-regular fa-file-lines clause-link__icon" aria-hidden="true" />
      {label}
      {context && <span className="sr-only">, {context}</span>}
    </a>
  );
}

export default ClauseLink;
