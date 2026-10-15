import { useRef } from 'react';

/**
 * Content tabs on ONE page or panel (role="tablist"): the opportunity drawer's Details | Action. Looks like RouteTabs (underline),
 * behaves like the ARIA tabs pattern: Tab enters on the selected tab, Arrow Left and Right move and select, Home and End jump.
 * Controlled. Pair each tab with a panel: <div role="tabpanel" id={panelId(id)} aria-labelledby={tabId(id)}>.
 * For page-level navigation where each tab is its own address use RouteTabs.
 *
 * @param {object} props
 * @param {string} props.label accessible name of the tablist
 * @param {{ id: string, label: React.ReactNode, icon?: string, count?: number }[]} props.items
 * @param {string} props.value id of the selected tab
 * @param {(id: string) => void} props.onChange
 * @param {string} props.idPrefix unique prefix for the tab and panel ids
 */
export function Tabs({ label, items, value, onChange, idPrefix, className = '' }) {
  const refs = useRef([]);
  const idx = Math.max(0, items.findIndex((it) => it.id === value));
  const onKey = (e) => {
    let n = null;
    if (e.key === 'ArrowRight') n = (idx + 1) % items.length;
    else if (e.key === 'ArrowLeft') n = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    if (n == null) return;
    e.preventDefault();
    onChange(items[n].id);
    if (refs.current[n]) refs.current[n].focus();
  };
  return (
    <div className={('kx-routetabs kx-tabs ' + className).trim()}>
      <ul role="tablist" aria-label={label} onKeyDown={onKey}>
        {items.map((it, i) => {
          const on = i === idx;
          return (
            <li key={it.id} role="presentation">
              <button type="button" role="tab" ref={(el) => { refs.current[i] = el; }} id={tabId(idPrefix, it.id)} aria-controls={panelId(idPrefix, it.id)}
                aria-selected={on} tabIndex={on ? 0 : -1} className={'kx-routetab' + (on ? ' is-current' : '')} onClick={() => onChange(it.id)}>
                {it.icon && <i className={'fa-solid fa-' + it.icon} aria-hidden="true" />}
                {it.label}
                {it.count != null && <span className="kx-routetab__count">{it.count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const tabId = (prefix, id) => `${prefix}-tab-${id}`;
export const panelId = (prefix, id) => `${prefix}-panel-${id}`;

export default Tabs;
