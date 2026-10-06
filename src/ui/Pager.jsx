import { Button } from './ds.js';

const fmt = (n) => Math.round(n).toLocaleString('en-GB');

/** Page numbers with gaps: [1, '…', 4, 5, 6, '…', 12]. */
function windowed(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, pages - 1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => { if (i && n - list[i - 1] > 1) out.push('…'); out.push(n); });
  return out;
}

/**
 * Pagination strip for a table: "Showing 21 to 40 of 1,264 payments", Previous, page numbers, Next.
 * Pages are 1-based. Hides itself when everything fits on one page unless `alwaysShow`.
 *
 * @param {object} props
 * @param {number} props.page current page, 1-based
 * @param {number} props.pageSize rows per page
 * @param {number} props.total total rows
 * @param {(page: number) => void} props.onPage
 * @param {string} [props.unit='row'] singular noun for the summary ("payment" gives "1,264 payments")
 * @param {string} [props.units] plural noun when it is not unit + "s"
 * @param {string} [props.label='Pagination'] accessible name of the nav
 * @param {boolean} [props.alwaysShow=false]
 */
export function Pager({ page, pageSize, total, onPage, unit = 'row', units, label = 'Pagination', alwaysShow = false }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1 && !alwaysShow) return null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const noun = total === 1 ? unit : (units || unit + 's');
  const btn = { variant: 'ghost', size: 'sm', style: { minWidth: 32, padding: '0 8px' }, type: 'button', className: 'kx-hit' };
  return (
    <nav className="kx-pager" aria-label={label}>
      <span className="kx-pager__sum" aria-live="polite">Showing {fmt(from)} to {fmt(to)} of {fmt(total)} {noun}</span>
      <div className="spacer">
        <Button {...btn} aria-label="Previous page" leftIcon="chevron-left" disabled={page <= 1} onClick={() => onPage(page - 1)} style={{ width: 32, padding: 0 }} />
        {windowed(page, pages).map((n, i) => (n === '…'
          ? <span key={'g' + i} className="kx-pager__gap" aria-hidden="true">…</span>
          : <Button key={n} {...btn} variant={n === page ? 'outline' : 'ghost'} aria-label={'Page ' + n} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</Button>))}
        <Button {...btn} aria-label="Next page" leftIcon="chevron-right" disabled={page >= pages} onClick={() => onPage(page + 1)} style={{ width: 32, padding: 0 }} />
      </div>
    </nav>
  );
}

export default Pager;
