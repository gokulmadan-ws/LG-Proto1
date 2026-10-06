import { AsAt } from './AsAt.jsx';

/**
 * The single page header every route renders. It owns the ONE <h1> of the page (tabIndex -1 so the router can
 * move focus to it after a route change).
 *
 *   <div className="page">
 *     <PageHeader
 *       eyebrow="Marchbank Borough Council"        small caps line above the title (optional)
 *       breadcrumb={<Breadcrumb items={...} />}    node above the eyebrow (optional; DS Breadcrumb needs hash hrefs)
 *       title="Renewal radar"                      string or node (the Overview passes the headline sentence)
 *       description={<>Contracts whose notice date ... <MethodLink section="radar" /></>}
 *       actions={<Button>Export opportunities</Button>}   AT MOST ONE primary Button here (one primary per section)
 *       tabs={<nav aria-label="Cap vs spend views">...</nav>}  full-width row under the header (optional)
 *       asAt                                       true -> "As at 6 October 2026"; or an ISO date string
 *     />
 *     ...sections, 24px apart...
 *   </div>
 */
export function PageHeader({ eyebrow, breadcrumb, title, description, actions, tabs, asAt, headingId, className = '' }) {
  return (
    <div className={('page-header ' + className).trim()}>
      {breadcrumb && <div className="page-header__breadcrumb">{breadcrumb}</div>}
      <div className="page-header__main">
        {eyebrow && <p className="page-header__eyebrow ds-caption-caps">{eyebrow}</p>}
        <h1 id={headingId} className="page-header__title ds-h2" tabIndex={-1}>{title}</h1>
        {asAt && <AsAt as="p" className="page-header__asat" {...(typeof asAt === 'string' ? { iso: asAt } : {})} />}
        {description && <div className="page-header__desc">{description}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
      {tabs && <div className="page-header__tabs">{tabs}</div>}
    </div>
  );
}

export default PageHeader;
