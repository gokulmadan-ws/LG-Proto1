import { useLayoutEffect, useRef, useState } from 'react';

const INTERACTIVE = 'a[href],button,input,select,textarea,label,summary,[role="button"],[role="menuitem"]';

/** True when the box scrolls (so it must be keyboard reachable). */
function useScrollable(ref, deps) {
  const [can, setCan] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setCan(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, deps);
  return can;
}

/**
 * Application table. Sticky header (inside a scroll wrapper with `maxHeight`), 44px rows (`dense` = 32px, desktop
 * only), right-aligned tabular numbers, sortable headers, optional clickable rows and footer rows.
 *
 * Accessibility: the wrapper becomes a focusable, named scroll region ONLY when it actually scrolls, so keyboard users
 * can scroll it and axe's scrollable-region-focusable stays quiet. `caption` is the table's accessible name.
 *
 * Clickable rows (`onRowClick`) are for Contracts and Supplier matches. The row is focusable and Enter or Space opens
 * it, but ONLY when the row itself has focus: links, buttons and selects inside the row keep their own behaviour, and a
 * click that lands on one of them never reaches onRowClick. For lists with several actions per row use the stretched-link
 * row pattern from src/charts instead.
 *
 * @param {object} props
 * @param {{ key: string, label: React.ReactNode, num?: boolean, render?: (row: object, index: number) => React.ReactNode, sortable?: boolean, muted?: boolean, nowrap?: boolean, rowHeader?: boolean, width?: number|string, minWidth?: number|string, hideLabel?: boolean }[]} props.columns
 *   num right-aligns with tabular figures; rowHeader makes that column's cells <th scope="row">; hideLabel keeps the header text for screen readers only; minWidth stops a text column being squeezed to a few characters when the table scrolls sideways on a phone
 * @param {object[]} props.rows
 * @param {string | ((row: object) => string)} [props.rowKey='id']
 * @param {React.ReactNode} props.caption accessible name of the table (visually hidden)
 * @param {boolean} [props.dense]
 * @param {{ key: string, dir: 'asc'|'desc' }} [props.sort] current sort, shown with aria-sort
 * @param {(key: string) => void} [props.onSort] called when a sortable header is pressed
 * @param {(row: object, event: Event) => void} [props.onRowClick]
 * @param {string} [props.selectedKey] rowKey value of the selected row (aria-selected)
 * @param {(row: object) => string} [props.rowAriaLabel] accessible name for a clickable row ("Open C-005, Highways reactive maintenance")
 * @param {number} [props.maxHeight] px; makes the body scroll under a sticky header
 * @param {{ key?: string, label?: React.ReactNode, values: Record<string, React.ReactNode> }[]} [props.footer]
 *   footer rows (subtotals). `label` spans the columns before the first column named in `values`; `values` maps column key to cell content.
 * @param {React.ReactNode} [props.empty] shown in a full-width row when there are no rows
 * @param {string} [props.className]
 */
export function DataTable({ columns, rows, rowKey = 'id', caption, dense, sort, onSort, onRowClick, selectedKey, rowAriaLabel, maxHeight, footer, empty, className = '' }) {
  const wrap = useRef(null);
  const scrolls = useScrollable(wrap, [rows.length, columns.length, maxHeight, dense]);
  const keyOf = typeof rowKey === 'function' ? rowKey : (r) => r[rowKey];
  const colIndex = Object.fromEntries(columns.map((c, i) => [c.key, i]));
  const open = (r, e) => { if (onRowClick) onRowClick(r, e); };

  return (
    <div ref={wrap} className={('kx-table-wrap ' + className).trim()} style={maxHeight ? { '--kx-table-max-h': maxHeight + 'px' } : undefined}
      {...(scrolls ? { role: 'region', tabIndex: 0, 'aria-label': typeof caption === 'string' ? caption : 'Table' } : {})}>
      <table className={'kx-table' + (dense ? ' kx-table--dense' : '')}>
        {caption && <caption className="kx-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const sorted = sort && sort.key === c.key;
              const label = c.hideLabel ? <span className="kx-sr-only">{c.label}</span> : c.label;
              return (
                <th key={c.key} scope="col" className={c.num ? 'num' : undefined} style={c.width || c.minWidth ? { width: c.width, minWidth: c.minWidth } : undefined}
                  aria-sort={sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable && onSort
                    ? <button type="button" className="sort" onClick={() => onSort(c.key)}>{label}<i className={'fa-solid ' + (sorted ? (sort.dir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort')} aria-hidden="true" /></button>
                    : label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty && <tr><td colSpan={columns.length} className="kx-table__empty">{empty}</td></tr>}
          {rows.map((r, i) => {
            const k = keyOf(r);
            return (
              <tr key={k} className={onRowClick ? 'is-clickable' : undefined} tabIndex={onRowClick ? 0 : undefined}
                aria-selected={selectedKey != null && selectedKey === k ? true : undefined}
                aria-label={onRowClick && rowAriaLabel ? rowAriaLabel(r) : undefined}
                onClick={onRowClick ? (e) => {
                  const hit = e.target.closest ? e.target.closest(INTERACTIVE) : null;
                  if (hit && hit !== e.currentTarget && e.currentTarget.contains(hit)) return;   // a control inside the row handles its own click
                  open(r, e);
                } : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.target !== e.currentTarget) return;                                     // Enter on an inner link or select belongs to it
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(r, e); }
                } : undefined}>
                {columns.map((c) => {
                  const cls = (c.num ? 'num ' : '') + (c.muted ? 'muted ' : '') + (c.nowrap ? 'nowrap' : '');
                  const content = c.render ? c.render(r, i) : r[c.key];
                  return c.rowHeader
                    ? <th key={c.key} scope="row" className={cls.trim() || undefined}>{content}</th>
                    : <td key={c.key} className={cls.trim() || undefined}>{content}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
        {footer && footer.length > 0 && (
          <tfoot>
            {footer.map((f, fi) => {
              const idxs = Object.keys(f.values).map((k) => colIndex[k]).filter((n) => n != null);
              const first = idxs.length ? Math.min(...idxs) : columns.length;
              const cells = [];
              if (first > 0) cells.push(<th key="label" scope="row" colSpan={first}>{f.label}</th>);
              for (let ci = first; ci < columns.length; ci += 1) {
                const c = columns[ci];
                cells.push(<td key={c.key} className={c.num ? 'num' : undefined}>{f.values[c.key]}</td>);
              }
              return <tr key={f.key || fi}>{cells}</tr>;
            })}
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default DataTable;
