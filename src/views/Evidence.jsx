// V7: Evidence (#/evidence), "Why this matters". All nine cases from the Kontor scope document, in the spec's wording, as one accessible table.
//
//   default export: <Evidence />       rendered inside <main id="shell-main"> by App.jsx for #/evidence, no props.
//   Reached from the rail Menu ("Why this matters") and the Overview strip ("Show all 9 cases").
//   Renders exactly ONE <h1>. Columns: Case (the spec's link, new tab, rel="noopener noreferrer", visible "(opens in a new tab)"),
//   When, What happened, Kontor feature it supports (links to the feature page in this prototype). Then the Sefton caution.
//
// Nothing is typed twice: the nine cases and their links come from src/data/evidence.js (compared with docs/spec.md by tests/engine.test.mjs),
// the checked-on line and the caution from there and from src/lib/copy.js. The few strings those do not hold live in TEXT below (listed in
// docs/handoff/V7.md). Real councils appear here because blueprint decision 2 allows them on the Evidence page, quoted from the spec.
//
// Also exports <ExtLink> (an external link that always says it opens in a new tab) and <ResponsiveTable>, which the Roadmap uses too:
// the kit DataTable from 700px up, and below that a list of the same rows (the first column as the title, every other column as a
// label and value), because a four-column table of sentences does not fit a phone and scrolling sideways through prose is poor reading.
import { evidence, CHECKED_NOTE, OPENS_IN_NEW_TAB } from '../data/evidence.js';
import { COPY } from '../lib/copy.js';
import { usePageTitle } from '../lib/router.js';
import { PageHeader, MethodLink } from '../components/index.js';
import { useSyncExternalStore } from 'react';
import { Panel, Pill, DataTable } from '../ui/index.js';
import './Evidence.css';

const PHONE = '(max-width: 699px)';
const subscribe = (cb) => { const m = window.matchMedia(PHONE); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
/** True below 700px wide (the width the shell switches to its phone layout). */
export function useIsPhone() { return useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false); }

/**
 * A table on desktop, a list of cards on a phone. Same `columns` as DataTable (key, label, render, rowHeader, hideLabel, minWidth),
 * same rows. `phoneTitle(row)` replaces the first column as the title of a card (used when the first column is only a number).
 */
export function ResponsiveTable({ caption, columns, rows, rowKey = 'id', phoneTitle }) {
  const phone = useIsPhone();
  if (!phone) return <DataTable caption={caption} columns={columns} rows={rows} rowKey={rowKey} />;
  const [head, ...rest] = columns;
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key]);
  return (
    <ul className="rt-list" aria-label={caption}>
      {rows.map((r) => (
        <li key={r[rowKey]} className="rt-item">
          <div className="rt-item__title">{phoneTitle ? phoneTitle(r) : cell(head, r)}</div>
          <dl className="rt-item__fields">
            {(phoneTitle ? columns.slice(1) : rest).map((c) => (
              <div key={c.key} className="rt-field"><dt>{c.label}</dt><dd>{cell(c, r)}</dd></div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

const TEXT = {
  eyebrow: 'Evidence',
  // The spec's own opening sentence of the Evidence section.
  framing: 'Councils routinely lose money because nobody has a full picture of their own contracts.',
  whenNote: 'The When column shows how current each one is.',
  tableTitle: 'Nine public cases',
  caption: 'Nine public cases: the council, when it happened, what happened, and the Kontor feature it supports',
  cols: { case: 'Case', when: 'When', what: 'What happened', feature: 'Kontor feature it supports' },
  cautionBadge: 'Caution',
  cautionTitle: 'Read every case with the Sefton caution',
  cautionLead: 'Sefton shows headline savings can shrink once tested.',                    // the spec, "What has to be true"
  cautionWhy: 'That is why every figure in this prototype is indicative and is called an opportunity to investigate, not a saving. Check each flag against its clause before you act.',
  // The id of the Sefton case in src/data/evidence.js: the one the caution is about.
  cautionCase: 'sefton',
};

// A2 links the caveat feature to the whole Method page; the section that explains the wording is "Indicative value".
const HREF_FIX = { '#/method': '#/method?s=indicative' };
const featureHref = (href) => HREF_FIX[href] || href;

/** External link: opens in a new tab, rel="noopener noreferrer", and says so in visible words (the words are part of the link's name). */
export function ExtLink({ href, children, stacked = false, className = '' }) {
  return (
    <a className={('ev-ext' + (stacked ? ' ev-ext--stacked' : '') + ' ' + className).trim()} href={href} target="_blank" rel="noopener noreferrer">
      <span className="ev-ext__label">{children}</span>{' '}
      <span className="ev-ext__hint">{OPENS_IN_NEW_TAB}</span>
    </a>
  );
}

/**
 * The spec's "Kontor feature it supports" text, word for word, with the parts that name a feature turned into links to that
 * feature's page. A link label is matched inside the text ignoring case, so "Cap vs actual spend, clause checks" stays as the spec
 * wrote it and "clause checks" is the link.
 */
function FeatureCell({ item }) {
  const text = item.feature;
  const lower = text.toLowerCase();
  const hits = [];
  (item.featureLinks || []).forEach((l) => {
    const i = lower.indexOf(String(l.label).toLowerCase());
    if (i >= 0 && !hits.some((h) => i < h.end && i + l.label.length > h.start)) hits.push({ start: i, end: i + l.label.length, href: featureHref(l.href) });
  });
  hits.sort((a, b) => a.start - b.start);
  const out = [];
  let at = 0;
  hits.forEach((h, n) => {
    if (h.start > at) out.push(text.slice(at, h.start));
    out.push(
      <a key={n} className="ev-link" href={h.href} aria-label={`${text.slice(h.start, h.end)}, for the ${item.case} case`}>{text.slice(h.start, h.end)}</a>,
    );
    at = h.end;
  });
  if (at < text.length) out.push(text.slice(at));
  return <span className="ev-feature">{out}</span>;
}

export default function Evidence() {
  usePageTitle(COPY.pages.evidence.title);

  const columns = [
    {
      key: 'case', label: TEXT.cols.case, rowHeader: true, minWidth: 190,
      render: (e) => (
        <span className="ev-case">
          <ExtLink href={e.url} stacked>{e.case}</ExtLink>
          {e.id === TEXT.cautionCase && <Pill tone="neutral" icon="triangle-exclamation" size="sm">{TEXT.cautionBadge}</Pill>}
        </span>
      ),
    },
    { key: 'when', label: TEXT.cols.when, minWidth: 150, render: (e) => <span className="ev-when">{e.when}</span> },
    { key: 'whatHappened', label: TEXT.cols.what, minWidth: 340, render: (e) => <span className="ev-what">{e.whatHappened}</span> },
    { key: 'feature', label: TEXT.cols.feature, minWidth: 220, render: (e) => <FeatureCell item={e} /> },
  ];

  return (
    <div className="page ev">
      <PageHeader
        eyebrow={TEXT.eyebrow}
        title={COPY.pages.evidence.title}
        description={(
          <>
            <p>{TEXT.framing}</p>
            <p>{CHECKED_NOTE} {TEXT.whenNote}</p>
          </>
        )}
      />

      <Panel title={TEXT.tableTitle} count={evidence.length} description={COPY.evidenceStrip.intro} padded={false} className="ev-table">
        <ResponsiveTable caption={TEXT.caption} columns={columns} rows={evidence} rowKey="id" />
      </Panel>

      <section className="ev-caution" aria-labelledby="ev-caution-h">
        <i className="fa-solid fa-triangle-exclamation ev-caution__icon" aria-hidden="true" />
        <div className="ev-caution__body">
          <h2 id="ev-caution-h" className="ev-caution__title">{TEXT.cautionTitle}</h2>
          <p>{TEXT.cautionLead} {TEXT.cautionWhy}</p>
          <p><MethodLink section="indicative" /></p>
        </div>
      </section>
    </div>
  );
}
