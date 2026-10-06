// src/charts/ChartFigure.jsx
// Chart container: title + description, optional legend, "Show table" twin, footnote.
// The table view is the WCAG-clean equivalent of the chart (every number reachable without hover).
import { useState, useId } from 'react';
import { Hatch } from './Hatch.jsx';

/** One legend entry per series / state / marker.  shape: bar | hatch | line | dot | diamond | tick | glyph */
export function Legend({ items, label = 'Legend', className = '' }) {
  return (
    <ul className={'kviz-legend ' + className} aria-label={label}>
      {items.map((it) => (
        <li key={it.key || it.label} className="kviz-legend__item">
          {it.shape === 'glyph'
            ? <i className={'fa-solid fa-' + it.glyph} style={{ color: it.color }} aria-hidden="true" />
            : <span className={'kviz-key kviz-key--' + (it.shape || 'bar')} style={{ '--c': it.color }} aria-hidden="true">
                {it.shape === 'hatch' && <Hatch color={it.color} period={5} />}
              </span>}
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** The table twin of a chart (not the application table: that is DataTable in src/ui). columns: [{ key, label, align?: 'right', render?: (row) => node }]  rows: [{...}] */
export function ChartTable({ columns, rows, caption }) {
  return (
    <div className="kviz-tablewrap" tabIndex={0} role="region" aria-label={caption + ' (table)'}>
      <table className="kviz-table">
        <caption className="kviz-sr">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.align === 'right' ? 'is-num' : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id != null ? r.id : i}>
              {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'is-num' : undefined}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartFigure({ title, description, legend, table, footnote, actions, as: H = 'h3', children, className = '' }) {
  const uid = useId();
  const [view, setView] = useState('chart');
  return (
    <figure className={'kviz-fig ' + className} aria-labelledby={uid + '-t'}>
      <header className="kviz-fig__head">
        <div>
          <H id={uid + '-t'} className="kviz-fig__title">{title}</H>
          {description && <p className="kviz-fig__desc">{description}</p>}
        </div>
        <div className="kviz-fig__actions">
          {actions}
          {table && (
            <button type="button" className="kviz-btn" aria-pressed={view === 'table'}
              onClick={() => setView(view === 'table' ? 'chart' : 'table')}>
              <i className={'fa-solid fa-' + (view === 'table' ? 'chart-simple' : 'table')} aria-hidden="true" />
              {view === 'table' ? 'Show chart' : 'Show table'}
            </button>
          )}
        </div>
      </header>
      {view === 'chart' && legend}
      <div className="kviz-fig__body">
        {view === 'chart' ? children : <ChartTable {...table} caption={typeof title === 'string' ? title : 'Chart data'} />}
      </div>
      {footnote && <figcaption className="kviz-fig__note">{footnote}</figcaption>}
    </figure>
  );
}
