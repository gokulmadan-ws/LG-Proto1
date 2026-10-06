/**
 * Tabs for ROUTE-based navigation (each tab is its own page): a nav of real links, the current one marked with
 * aria-current="page". Styled like the Springboard Tabs (underline). Use this for "Cap vs spend | Supplier matches |
 * No contract on the register". For switching content on one page use Segmented; the DS Tabs component is
 * controlled-only and has no arrow-key support.
 *
 * @param {object} props
 * @param {string} props.label accessible name of the nav ("Cap vs spend views")
 * @param {{ id: string, label: React.ReactNode, href: string, icon?: string, count?: number }[]} props.items
 * @param {string} props.current id of the current item
 */
export function RouteTabs({ label, items, current, className = '' }) {
  return (
    <nav className={('kx-routetabs ' + className).trim()} aria-label={label}>
      <ul>
        {items.map((it) => {
          const on = it.id === current;
          return (
            <li key={it.id}>
              <a className={'kx-routetab' + (on ? ' is-current' : '')} href={it.href} aria-current={on ? 'page' : undefined}>
                {it.icon && <i className={'fa-solid fa-' + it.icon} aria-hidden="true" />}
                {it.label}
                {it.count != null && <span className="kx-routetab__count">{it.count}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default RouteTabs;
