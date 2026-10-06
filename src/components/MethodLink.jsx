import { hrefFor } from '../lib/router.js';

/**
 * Link to a section of the Method page: <MethodLink section="cap">How this is calculated</MethodLink>
 * -> #/method?s=cap. Children default to "How this is calculated". Omit `section` for the top of the page.
 */
export function MethodLink({ section, children = 'How this is calculated', className = '', ...rest }) {
  return (
    <a className={('method-link ' + className).trim()} href={hrefFor('method', { query: section ? { s: section } : {} })} {...rest}>
      {children}
    </a>
  );
}

export default MethodLink;
