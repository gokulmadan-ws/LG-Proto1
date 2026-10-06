// V3: "How this is calculated" (#/method, ?s=<section> scrolls to and focuses that section heading).
//
//   default export: <Method />   (props: none; the section comes from the address)
//   Renders exactly ONE <h1> inside <div className="page">. Twelve sections, ids exactly as MethodLink expects (COPY.method):
//   as-of, notice, radar, spend, matching, cap, uplift, indicative, ranking, confidence, data, limits.
//   The id sits on the section heading (an <h2 tabIndex=-1>), so `#/method?s=cap` lands on and focuses it.
//
// Nothing here is typed twice. Constants come from the engine's DEFAULTS (and the value in force from estate.opts), boundary dates from
// estate.radar, worked examples from the live estate (golden contracts C-001, C-002, C-003, C-004, C-005, C-007, C-011, C-017, C-018),
// sentences from src/lib/copy.js. Strings copy.js lacks live in METHOD_COPY below (listed in docs/handoff/V3.md). No calculators.
import { useEffect, useRef, useState } from 'react';
import { useEstate, ASSUMPTION_OPTIONS } from '../lib/estate.js';
import { DEFAULTS, addMonths } from '../lib/engine.js';
import { evidenceForField } from '../lib/evidenceFor.js';
import {
  COPY, basisLabel, flagTypeLabel, severityLabel, capStateLabel, noticeShortText, noticeDeadlineNote, upliftResultText, confidenceReason, confidenceLabel,
  matchStatusLabel, matchMethodLabel, radarFootnote, sumLine, excludedNote, coverageLine, coverageDetail, breakdownValueText, bandLabel,
  watchNote, reasonFor, actionLine, fmtDate, fmtDateLong, fmtGBP, fmtGBPCompact, fmtPct,
} from '../lib/copy.js';
import { plural, joinList } from '../lib/format.js';
import { useRoute, hrefFor } from '../lib/router.js';
import { scrollBehavior } from '../lib/a11y.js';
import { useUI } from '../lib/ui-context.jsx';
import { evidence as EVIDENCE, OPENS_IN_NEW_TAB } from '../data/evidence.js';
import { PageHeader, ClauseLink, ConfidencePill } from '../components/index.js';
import { Button, DataTable } from '../ui/index.js';
import './Method.css';

const SECTIONS = COPY.method;                       // [{ id, title, lead }] in page order
const IDS = SECTIONS.map((s) => s.id);

/** Strings copy.js does not have (copy deck 7.11 wording, extended). */
const METHOD_COPY = {
  intro: 'The constants on this page are read from the engine that calculates your figures, so what you read here is what runs.',
  toc: 'On this page',
  example: 'Worked example',
  indicativeCalc: 'Indicative calculation',
  constants: 'Constants',
  constantsCols: { name: 'Setting', default: 'Default', inUse: 'In use now', what: 'What it does' },
  changed: 'Changed in Settings',
  sameAsDefault: 'Default',
  openSettings: 'Open settings',
  openRadar: 'Open renewal radar',
  openMatches: 'Open supplier matches',
  openNoContract: 'See spend with no contract',
  openRoadmap: 'Open roadmap',
  openEvidence: 'Read the cases on the evidence page',
  contractsWord: 'Contract',
};

const CONSTANTS = {
  renewalRate: { label: 'Renewal rate', show: (v) => fmtPct(v, 0), what: "The share of a contract's annual value used as the indicative value of a renewal decision. A prototype assumption." },
  nearCapThreshold: { label: 'Close to cap threshold', show: (v) => fmtPct(v, 0), what: 'Spend from this share of the cap up to the cap itself is close to cap.' },
  upliftTolerancePp: { label: 'Price increase tolerance', show: (v) => plural(Math.round(v * 100), 'percentage point'), what: "How far payments may rise above the contract's cap on increases before the rise is flagged." },
  upliftMinGBP: { label: 'Smallest amount flagged', show: (v) => fmtGBP(v), what: 'The amount paid above the capped increase must also be at least this much.' },
  autoAcceptScore: { label: 'Accept automatically from', show: (v) => v.toFixed(2), what: 'A supplier match with this score or more is accepted without a review.' },
  suggestScore: { label: 'Suggest from', show: (v) => v.toFixed(2), what: 'A match from this score up to the automatic threshold is suggested for you to confirm. Anything lower is left unmatched.' },
};

/** Scroll the content area (not the document: scrollIntoView would also nudge the shell) so `el` sits near the top. */
function scrollMainTo(el, behavior) {
  const main = document.getElementById('shell-main');
  if (!main) { el.scrollIntoView({ block: 'start', behavior }); return; }
  const delta = el.getBoundingClientRect().top - main.getBoundingClientRect().top - 16;
  main.scrollTo({ top: main.scrollTop + delta, behavior });
}

/* ---------------------------------------------------------------------------------------------------- small pieces */

function Table({ caption, columns, rows }) {
  return <DataTable caption={caption} columns={columns} rows={rows} rowKey="id" />;
}

function ContractLink({ id, children }) {
  return <a className="mth-link mth-mono" href={hrefFor('contracts', { seg: [id] })}>{children || id}</a>;
}
function IdList({ ids }) {
  if (!ids.length) return <span className="mth-muted">None</span>;
  return <span className="mth-ids">{ids.map((id, i) => <span key={id}><ContractLink id={id} />{i < ids.length - 1 ? ', ' : ''}</span>)}</span>;
}

/** A section: the heading carries the id (so ?s=<id> scrolls to and focuses it), then the lead sentence from copy.js. */
function Section({ id, lead, children }) {
  const s = SECTIONS.find((x) => x.id === id);
  return (
    <section className="mth-section" aria-labelledby={id}>
      <h2 id={id} className="mth-h2" tabIndex={-1}>{s.title}</h2>
      <p className="mth-lead">{lead || s.lead}</p>
      {children}
    </section>
  );
}

function Example({ title, children }) {
  return (
    <div className="mth-example">
      <h3 className="mth-example__title"><span className="ds-caption-caps">{METHOD_COPY.example}</span>{title}</h3>
      {children}
    </div>
  );
}

/** Calculation lines: label, value, and the last (result) line emphasised. */
function Lines({ items, caption }) {
  return (
    <div className="mth-lines-wrap">
      <p className="ds-caption-caps mth-lines__cap">{METHOD_COPY.indicativeCalc}</p>
      <dl className="mth-lines" aria-label={caption}>
        {items.map((it, i) => (
          <div key={i} className={it.result ? 'is-result' : undefined}><dt>{it.label}</dt><dd className="tnum">{it.value}</dd></div>
        ))}
      </dl>
    </div>
  );
}
const linesOfFlag = (flag) => flag.breakdown.map((b) => ({ label: b.label, value: breakdownValueText(b), result: b.kind === 'result' }));

function ClauseFor({ contractId, field, context }) {
  const t = evidenceForField(contractId, field);
  return t ? <ClauseLink contractId={t.contractId} extractionId={t.extractionId} page={t.page} from="method" context={context} /> : null;
}

/** Constants table: every value is read from DEFAULTS (default) and estate.opts (in force). data-* hooks let tests compare them. */
function ConstantsTable({ keys, opts, caption }) {
  const rows = keys.map((k) => ({ id: k, key: k }));
  const columns = [
    { key: 'name', label: METHOD_COPY.constantsCols.name, rowHeader: true, minWidth: 170, render: (r) => CONSTANTS[r.key].label },
    { key: 'default', label: METHOD_COPY.constantsCols.default, nowrap: true, render: (r) => <span data-const={r.key} data-kind="default" data-raw={String(DEFAULTS[r.key])}>{CONSTANTS[r.key].show(DEFAULTS[r.key])}</span> },
    {
      key: 'inUse', label: METHOD_COPY.constantsCols.inUse, nowrap: true,
      render: (r) => (
        <span>
          <span data-const={r.key} data-kind="inuse" data-raw={String(opts[r.key])}>{CONSTANTS[r.key].show(opts[r.key])}</span>
          {opts[r.key] !== DEFAULTS[r.key] && <span className="mth-changed">{METHOD_COPY.changed}</span>}
        </span>
      ),
    },
    { key: 'what', label: METHOD_COPY.constantsCols.what, minWidth: 260, muted: true, render: (r) => CONSTANTS[r.key].what },
  ];
  return <Table caption={caption || METHOD_COPY.constants} columns={columns} rows={rows} />;
}

/* ---------------------------------------------------------------------------------------------------- the page */

export default function Method() {
  const { estate } = useEstate();
  const ui = useUI();
  const route = useRoute();
  const wanted = route.query.get('s');
  const [active, setActive] = useState(IDS[0]);
  const [tocOpen, setTocOpen] = useState(false);         // phones only: the section list folds away behind a button
  const first = useRef(true);

  // ?s=<section>: scroll to the heading and focus it. The router moves focus to the h1 a frame after a route change, so the
  // heading takes focus two frames later. The first landing is instant, a click inside the page glides (reduced motion: instant).
  useEffect(() => {
    if (!wanted || !IDS.includes(wanted)) { first.current = false; return undefined; }
    const el = document.getElementById(wanted);
    if (!el) return undefined;
    const behavior = first.current ? 'auto' : scrollBehavior();
    first.current = false;
    scrollMainTo(el, behavior);
    setActive(wanted);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => el.focus({ preventScroll: true })); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [wanted]);

  // Which section is being read: the last heading above a line a little below the top of the scrolling area.
  useEffect(() => {
    const main = document.getElementById('shell-main');
    if (!main) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const box = main.getBoundingClientRect();
      const line = box.top + 140;
      const atEnd = main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
      let current = IDS[0];
      for (const id of IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        // at the very end of the page the last headings cannot reach the line, so the last visible one counts
        if (top <= line || (atEnd && top < box.bottom - 48)) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => { main.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const onTocClick = (e, id) => {
    if (wanted === id) { e.preventDefault(); const el = document.getElementById(id); if (el) { scrollMainTo(el, scrollBehavior()); el.focus({ preventScroll: true }); } }
  };

  const { opts, radar, coverage, totals, data } = estate;
  const asOf = estate.asOf;
  const council = data.council;
  const flag = (id) => estate.flagsById[id];
  const contract = (id) => estate.contractsById[id];
  const derived = (id) => estate.derived[id];

  /* ---- notice: three contracts that show the rule and its two fallbacks ---- */
  const noticeIds = ['C-001', 'C-017', 'C-018'].filter((id) => contract(id));
  const noticeRows = noticeIds.map((id) => {
    const c = contract(id), d = derived(id);
    return { id, c, d };
  });

  /* ---- radar bands ---- */
  const b = radar.boundaries;
  const bandRows = [
    { id: 'passed', rule: `Before ${fmtDate(asOf)}, and the term has not ended` },
    { id: 'ended', rule: `The term ended before ${fmtDate(asOf)} and you have paid since` },
    { id: 'm3', rule: `${fmtDate(asOf)} to ${fmtDate(b.m3)}` },
    { id: 'm6', rule: `After ${fmtDate(b.m3)} to ${fmtDate(b.m6)}` },
    { id: 'm12', rule: `After ${fmtDate(b.m6)} to ${fmtDate(b.m12)}` },
    { id: 'later', rule: `After ${fmtDate(b.m12)}` },
  ].map((r) => ({ ...r, group: radar.groups[r.id] }));

  /* ---- matching examples (live; the outcome follows any decision you make) ---- */
  const supplierName = (id) => (id ? (data.suppliers.find((s) => s.id === id) || {}).legalName || id : 'No match');
  const matchNames = ['KESTRELVALE FACILITIES SVCS LTD', 'Kestrelvale FM', 'Larchmont Grounds Maintenance', 'Mirefield Training Partners Ltd'];
  const matchRows = matchNames.map((n) => estate.matches.get(n)).filter(Boolean).map((m) => ({ id: m.rawName, m }));
  const scoreOf = (method) => { const m = estate.matchList.find((x) => x.method === method); return m ? m.score.toFixed(2) : null; };

  /* ---- uplift: reasons the check cannot run ---- */
  const cannot = {};
  for (const c of data.contracts) { const u = derived(c.id).uplift; if (!u.testable) (cannot[u.reason] ||= []).push(c.id); }
  const cannotRows = Object.entries(cannot).map(([reason, ids]) => ({ id: reason, reason, ids }));

  /* ---- ranking: the first five today ---- */
  const topFlags = estate.ranked.slice(0, 5);

  /* ---- examples that rely on a flag: skipped quietly if the dataset ever changes ---- */
  const capFlag = flag('F-C-005-overCap'), nearFlag = flag('F-C-001-nearCap'), upFlag = flag('F-C-004-uplift'), renFlag = flag('F-C-002-renewal'), lowFlag = flag('F-C-018-renewal');
  const c011 = contract('C-011'), d011 = c011 && derived('C-011'), f011 = flag('F-C-011-overCap');
  const c007 = contract('C-007'), d007 = c007 && derived('C-007');
  const c003 = contract('C-003'), d003 = c003 && derived('C-003');
  const sheffield = EVIDENCE.find((e) => e.id === 'sheffield'), sefton = EVIDENCE.find((e) => e.id === 'sefton');
  const aboveEstimateLabel = capStateLabel({ testable: true, capState: 'above_estimate', source: 'contract_value' });
  const overLabel = capStateLabel({ testable: true, capState: 'over', source: 'maximum_stated' });
  const nearLabel = capStateLabel({ testable: true, capState: 'near', source: 'maximum_stated' });
  const withinLabel = capStateLabel({ testable: true, capState: 'ok', source: 'maximum_stated' });
  const where = about('Where real data would come from.');
  function about(heading) { const s = COPY.about.sections.find((x) => x.heading === heading); return s ? s.body : ''; }

  return (
    <div className="page mth-page">
      <PageHeader
        title={COPY.pages.method.title}
        asAt
        description={<><p>{COPY.pages.method.subtitle}</p><p>{METHOD_COPY.intro}</p></>}
      />

      <div className="mth-layout">
        <nav className="mth-toc" aria-label={METHOD_COPY.toc} data-open={tocOpen ? 'true' : 'false'}>
          <p className="ds-caption-caps mth-toc__title">{METHOD_COPY.toc}</p>
          <button type="button" className="mth-toc__toggle" aria-expanded={tocOpen} aria-controls="mth-toc-list" onClick={() => setTocOpen((o) => !o)}>
            {METHOD_COPY.toc}<i className={'fa-solid fa-chevron-' + (tocOpen ? 'up' : 'down')} aria-hidden="true" />
          </button>
          <ul id="mth-toc-list">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={hrefFor('method', { query: { s: s.id } })} aria-current={active === s.id ? 'location' : undefined} onClick={(e) => { onTocClick(e, s.id); setTocOpen(false); }}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mth-content">
          {/* 1. as-of */}
          <Section id="as-of">
            <p>The as-of date is a constant in the engine, not the clock on your computer. Change your clock and no number on any screen moves. Phrases such as 25 days left and 6 days ago are counted from this date.</p>
            <p>Dates are calculated in calendar months. When the target month is shorter, the last day of that month is used, so {fmtDateLong('2027-03-31')} minus 6 months is {fmtDateLong(addMonths('2027-03-31', -6))}, not the day after.</p>
            <Table caption="Payment windows measured from the as-of date" columns={[
              { key: 'w', label: 'Window', rowHeader: true, render: (r) => r.w },
              { key: 'after', label: 'Starts after', nowrap: true, render: (r) => fmtDate(r.after) },
              { key: 'to', label: 'Ends on', nowrap: true, render: (r) => fmtDate(r.to) },
              { key: 'used', label: 'Used for', muted: true, minWidth: 220, render: (r) => r.used },
            ]} rows={[
              { id: 'last', w: 'Last 12 months', after: addMonths(asOf, -12), to: asOf, used: 'Projecting spend to the end of a term, and the price increase check.' },
              { id: 'earlier', w: 'Earlier 12 months', after: addMonths(asOf, -24), to: addMonths(asOf, -12), used: 'The base the price increase check compares with.' },
            ]} />
          </Section>

          {/* 2. notice */}
          <Section id="notice">
            <p>The deadline is counted back from the end of the current term, not from the end date if every extension is used. Months are counted as calendar months and days as days.</p>
            <p>What the deadline means for you depends on the contract:</p>
            <ul className="kx-prose mth-list">
              <li>The contract renews automatically: serve notice by the deadline to stop it renewing.</li>
              <li>The contract has an extension option and does not renew by itself: decide by the deadline whether to extend.</li>
              <li>Neither applies: plan the re-procurement before the contract ends.</li>
            </ul>
            <Example title="Three notice deadlines">
              <Table caption="Worked examples of the notice deadline" columns={[
                { key: 'c', label: 'Contract', rowHeader: true, minWidth: 190, render: (r) => <><ContractLink id={r.c.id} /><span className="mth-sub">{r.c.title}</span></> },
                { key: 'end', label: 'Term ends', nowrap: true, render: (r) => fmtDate(r.c.endDate) },
                { key: 'np', label: 'Notice period', nowrap: true, render: (r) => noticeShortText(r.c.notice) },
                { key: 'dl', label: 'Notice deadline', minWidth: 150, render: (r) => <><strong className="tnum">{fmtDate(r.d.deadline)}</strong>{noticeDeadlineNote(r.d) && <span className="mth-sub">{noticeDeadlineNote(r.d)}</span>}</> },
                { key: 'cl', label: 'Clause', nowrap: true, render: (r) => <ClauseFor contractId={r.c.id} field="noticePeriod" context={r.c.title} /> },
              ]} rows={noticeRows} />
            </Example>
          </Section>

          {/* 3. radar */}
          <Section id="radar">
            <p>Each contract sits in exactly one band. A notice deadline that falls on the as-of date is due today and sits in the first band. A contract that ended with nothing paid since is history: it appears in the Contracts register and not on the radar.</p>
            <Table caption="Radar bands, their boundary dates and the contracts in each today" columns={[
              { key: 'band', label: 'Band', rowHeader: true, nowrap: true, render: (r) => bandLabel(r.id) },
              { key: 'rule', label: 'Notice deadline', minWidth: 200, render: (r) => r.rule },
              { key: 'n', label: 'Contracts', num: true, render: (r) => r.group.count },
              { key: 'ids', label: 'Which', minWidth: 200, render: (r) => (r.group.count > 6 ? <span className="mth-muted">{plural(r.group.count, 'contract')}, not on the radar</span> : <IdList ids={r.group.items.map((i) => i.contractId)} />) },
              { key: 'v', label: 'Contract value, a year', num: true, nowrap: true, render: (r) => fmtGBPCompact(r.group.annualGBP) },
            ]} rows={bandRows} />
            <p className="mth-note">{radarFootnote(radar.groups.later.count)} <a className="mth-nowrap" href={hrefFor('renewals')}>{METHOD_COPY.openRadar}</a>.</p>
          </Section>

          {/* 4. spend */}
          <Section id="spend">
            <p>The payment files list every payment over £500, the way councils publish them. This sample has {plural(council.spendFileCount, 'monthly file')} and {plural(data.payments.length, 'payment')}, from {fmtDateLong(council.spendDataFrom)} to {fmtDateLong(council.spendDataTo)}.</p>
            <p>{COPY.matching.attribution}</p>
            <p>{COPY.partialCoverageNote(council.spendDataFrom)} A figure that starts before the files do is labelled At least.</p>
            {c007 && d007 && (
              <Example title={`${c007.id} paid after its end date`}>
                <p>{c007.title} ended on {fmtDateLong(c007.endDate)}. {plural(d007.spend.afterEndCount, 'payment')} totalling {fmtGBP(d007.spend.afterEndGBP)} were made after that date. They are included in its spend to date of {fmtGBP(d007.spend.toDate)} and listed separately, so a contract that has expired but is still being paid stands out. <ContractLink id={c007.id}>Open {c007.id}</ContractLink></p>
              </Example>
            )}
            <p>{coverageLine(coverage)} ({coverageDetail(coverage)}). The rest is {fmtGBP(coverage.noContractGBP)} paid to {plural(coverage.noContract.length, 'payee')} with no contract on the register, and {fmtGBP(coverage.awaitingReviewGBP)} waiting for you to review a suggested match. <a href={hrefFor('spend', { seg: ['no-contract'] })}>{METHOD_COPY.openNoContract}</a>.</p>
          </Section>

          {/* 5. matching */}
          <Section id="matching" lead={COPY.matching.body}>
            <p>An exact match scores {scoreOf('exact') || '1.00'}, a match after cleaning scores {scoreOf('normalised') || '0.98'} and a trading name taken from a contract scores {scoreOf('alias') || '0.95'}. A similar name is scored by how many letter pairs the cleaned names share, from 0 to 1.</p>
            <ConstantsTable caption="Supplier matching thresholds" keys={['autoAcceptScore', 'suggestScore']} opts={opts} />
            <Example title="Four payee names">
              <Table caption="Worked examples of supplier matching" columns={[
                { key: 'name', label: 'Payee name as paid', rowHeader: true, minWidth: 190, render: (r) => r.m.rawName },
                { key: 'sup', label: 'Matched supplier', minWidth: 170, render: (r) => supplierName(r.m.supplierId) },
                { key: 'method', label: 'Method', nowrap: true, render: (r) => matchMethodLabel(r.m.method) },
                { key: 'score', label: 'Score', num: true, render: (r) => r.m.score.toFixed(2) },
                { key: 'status', label: 'Outcome', nowrap: true, render: (r) => matchStatusLabel(r.m.status) },
              ]} rows={matchRows} />
            </Example>
            <p>{COPY.matching.notCounted} <a href={hrefFor('spend', { seg: ['matches'] })}>{METHOD_COPY.openMatches}</a>.</p>
          </Section>

          {/* 6. cap */}
          <Section id="cap">
            <ConstantsTable caption="Close to cap threshold" keys={['nearCapThreshold']} opts={opts} />
            <Table caption="Cap states and the rule for each" columns={[
              { key: 'state', label: 'State', rowHeader: true, nowrap: true, render: (r) => r.state },
              { key: 'rule', label: 'Spend as a share of the cap', minWidth: 220, render: (r) => r.rule },
              { key: 'est', label: 'When the cap is a contract value', minWidth: 220, muted: true, render: (r) => r.est },
            ]} rows={[
              { id: 'over', state: overLabel, rule: `Above ${fmtPct(1, 0)}`, est: aboveEstimateLabel },
              { id: 'near', state: nearLabel, rule: `From ${fmtPct(opts.nearCapThreshold, 0)} to ${fmtPct(1, 0)}`, est: capStateLabel({ testable: true, capState: 'near', source: 'contract_value' }) },
              { id: 'ok', state: withinLabel, rule: `Below ${fmtPct(opts.nearCapThreshold, 0)}`, est: withinLabel },
            ]} />
            <p>A contract that is close to its cap gets a projection: spend to date, plus the last 12 months of payments multiplied by the years left in the term. If that is above the cap, the excess is the indicative value. If it is not, the flag is worth £0 and goes on the watch list. {watchNote()}</p>
            {capFlag && (
              <Example title="C-005 over its stated maximum">
                <Lines caption="Cap calculation for C-005" items={[
                  ...capFlag.breakdown.slice(0, 2).map((x) => ({ label: x.label, value: breakdownValueText(x) })),
                  { label: 'Share of the cap used', value: fmtPct(derived('C-005').cap.utilisation) },
                  ...capFlag.breakdown.slice(2).map((x) => ({ label: x.label, value: breakdownValueText(x), result: true })),
                ]} />
                <p>{reasonFor(capFlag, contract('C-005'), derived('C-005'))} <ClauseFor contractId="C-005" field="maximumValue" context={contract('C-005').title} /></p>
              </Example>
            )}
            {c011 && f011 && (
              <Example title="C-011 against an annual cap">
                <Table caption="Spend by contract year for C-011 against its annual cap" columns={[
                  { key: 'y', label: 'Contract year', rowHeader: true, nowrap: true, render: (r) => `Year ${r.year}${r.partial ? ' (year to date)' : ''}` },
                  { key: 'dates', label: 'Dates', nowrap: true, render: (r) => `${fmtDate(r.from)} to ${fmtDate(r.to)}` },
                  { key: 's', label: 'Spend', num: true, render: (r) => fmtGBP(r.spendGBP) },
                  { key: 'st', label: `Against the ${fmtGBP(d011.cap.capGBP)} annual cap`, nowrap: true, render: (r) => (r.spendGBP > d011.cap.capGBP ? overLabel : withinLabel) },
                ]} rows={d011.spend.byYear.map((y) => ({ ...y, id: String(y.year) }))} />
                <p>{reasonFor(f011, c011, d011)} The row on the cap screen shows the worst year, {fmtPct(d011.cap.utilisation)} of the cap. <ClauseFor contractId="C-011" field="maximumValue" context={c011.title} /></p>
              </Example>
            )}
            {nearFlag && (
              <Example title="C-001 close to its cap">
                <Lines caption="Projection for C-001" items={linesOfFlag(nearFlag)} />
                <p>{reasonFor(nearFlag, contract('C-001'), derived('C-001'))} <ClauseFor contractId="C-001" field="maximumValue" context={contract('C-001').title} /></p>
              </Example>
            )}
            {c003 && d003 && (
              <p className="mth-note">{c003.id} started on {fmtDate(c003.startDate)}, before the spend files begin, so its spend of {fmtGBP(d003.spend.toDate)} is labelled At least and its share of the {d003.cap.source === 'contract_value' ? 'contract value' : 'cap'}, {fmtPct(d003.cap.utilisation)}, may be higher.</p>
            )}
          </Section>

          {/* 7. uplift */}
          <Section id="uplift">
            <p>The check runs only when it can be fair: the contract must name an index and cap the increase, and the term must have run long enough to compare two full years of payments. When it cannot run, the contract page says why.</p>
            <ConstantsTable caption="Price increase check thresholds" keys={['upliftTolerancePp', 'upliftMinGBP']} opts={opts} />
            <Table caption="Why the price increase check cannot run on some contracts" columns={[
              { key: 'reason', label: 'Cannot test because', rowHeader: true, minWidth: 280, render: (r) => r.reason },
              { key: 'n', label: 'Contracts', num: true, render: (r) => r.ids.length },
              { key: 'ids', label: 'Which', minWidth: 180, render: (r) => <IdList ids={r.ids} /> },
            ]} rows={cannotRows} />
            {upFlag && (
              <Example title="C-004 street lighting">
                <Lines caption="Price increase check for C-004" items={linesOfFlag(upFlag)} />
                <p>{upliftResultText(derived('C-004').uplift)}. {reasonFor(upFlag, contract('C-004'), derived('C-004'))} <ClauseFor contractId="C-004" field="indexation" context={contract('C-004').title} /></p>
              </Example>
            )}
            {derived('C-003') && derived('C-003').uplift.testable && (
              <p className="mth-note">A near miss: C-003 shows {upliftResultText(derived('C-003').uplift).toLowerCase()}. It is not flagged, because the check only flags a rise beyond the tolerance and the smallest amount.</p>
            )}
          </Section>

          {/* 8. indicative */}
          <Section id="indicative">
            <p>Every figure in this prototype is indicative: a prompt to investigate, not a confirmed result. Each flag type has one rule, and the rule is shown in that flag's calculation.</p>
            <Table caption="The indicative value rule for each flag type" columns={[
              { key: 'type', label: 'Flag', rowHeader: true, minWidth: 150, render: (r) => r.type },
              { key: 'basis', label: 'Basis', minWidth: 120, render: (r) => r.basis },
              { key: 'rule', label: 'Indicative value', minWidth: 300, render: (r) => r.rule },
            ]} rows={[
              { id: 'renewal', type: flagTypeLabel('renewal'), basis: basisLabel('per_year'), rule: `Annual value multiplied by the renewal rate, ${fmtPct(opts.renewalRate, 0)} today. The annual value is the one the contract states, else the total value divided by the term in years, else the last 12 months of payments. It applies to a notice date that is coming up or has passed, and to an ended contract that you are still paying.` },
              { id: 'overCap', type: flagTypeLabel('overCap'), basis: basisLabel('one_off'), rule: 'Spend above the cap. For a cap per contract year, the spend above the cap in each year that went over, added together.' },
              { id: 'nearCap', type: flagTypeLabel('nearCap'), basis: basisLabel('projected'), rule: 'Projected spend at the end of the term minus the cap, and never below £0.' },
              { id: 'uplift', type: flagTypeLabel('uplift'), basis: basisLabel('one_off'), rule: "Payments in the last 12 months, minus the earlier 12 months' payments with the contract's allowed increase added." },
            ]} />
            <ConstantsTable caption="Renewal rate" keys={['renewalRate']} opts={opts} />
            <div className="mth-actions">
              <Button type="button" variant="outline" leftIcon="sliders" onClick={(e) => ui.openSettings(e.currentTarget)}>{METHOD_COPY.openSettings}</Button>
              <span className="mth-muted">Settings offers {joinList(ASSUMPTION_OPTIONS.renewalRate.map((v) => fmtPct(v, 0)))} for the renewal rate.</span>
            </div>
            <h3 className="mth-h3">Why {fmtPct(DEFAULTS.renewalRate, 0)}</h3>
            <p>{fmtPct(DEFAULTS.renewalRate, 0)} is a prototype assumption. It is not a figure from the Kontor scope. It sits below the 8% of annual cost that the Local Government Association reported for Sheffield across seven contracts in 2012/13, because a 2019 case study at Sefton found that potential savings can shrink to nothing once the outliers are tested. Agree a rate with whoever owns the cost baseline before you use these figures with a council.</p>
            <p>
              {sheffield && <a href={sheffield.url} target="_blank" rel="noopener noreferrer">Sheffield, LGA {OPENS_IN_NEW_TAB}</a>}
              {sheffield && sefton && ' · '}
              {sefton && <a href={sefton.url} target="_blank" rel="noopener noreferrer">Sefton, LGA {OPENS_IN_NEW_TAB}</a>}
              {' · '}<a href={hrefFor('evidence')}>{METHOD_COPY.openEvidence}</a>
            </p>
            {renFlag && (
              <Example title="C-002 renewal decision">
                <Lines caption="Renewal calculation for C-002" items={linesOfFlag(renFlag)} />
                <p>{actionLine(contract('C-002'), derived('C-002'))} <ClauseFor contractId="C-002" field="noticePeriod" context={contract('C-002').title} /></p>
              </Example>
            )}
            <h3 className="mth-h3">How the headline is put together</h3>
            <p>The headline adds four indicative amounts on different bases: money already paid, spend projected at the current pace, and a value per year. The cards keep them apart and the sum line shows the addition, so the total is never a single unlabelled figure.</p>
            <p className="mth-sum tnum" data-testid="method-sum-line">{sumLine(totals)}</p>
            <p>The headline is about {fmtPct(totals.totalGBP / coverage.totalGBP, 0)} of the {fmtGBPCompact(coverage.totalGBP)} in the payment files. Read that as a check on scale, not as a share of spend that can be recovered. {excludedNote(totals) ? `${excludedNote(totals)} ` : ''}Marking a flag Explained or No action takes it out of the headline.</p>
          </Section>

          {/* 9. ranking */}
          <Section id="ranking">
            <Table caption="How severity is set for each flag type" columns={[
              { key: 'type', label: 'Flag', rowHeader: true, minWidth: 150, render: (r) => r.type },
              { key: 'sev', label: 'Severity', minWidth: 300, render: (r) => r.sev },
            ]} rows={[
              { id: 'overCap', type: flagTypeLabel('overCap'), sev: `${severityLabel('high')}. When the cap is a contract value, which is an estimate, ${severityLabel('medium').toLowerCase()}.` },
              { id: 'nearCap', type: flagTypeLabel('nearCap'), sev: severityLabel('medium') },
              { id: 'uplift', type: flagTypeLabel('uplift'), sev: `${severityLabel('high')} when the amount paid above the cap is ${fmtGBP(100000)} or more, otherwise ${severityLabel('medium').toLowerCase()}.` },
              { id: 'renewal', type: flagTypeLabel('renewal'), sev: `${severityLabel('high')} when the notice date has passed, the contract has ended or the notice date is in the next 3 months. ${severityLabel('medium')} for 3 to 6 months. ${severityLabel('low')} for 6 to 12 months.` },
            ]} />
            <p>The action date is the notice deadline for a renewal decision and the next price review for a price increase. The next price review is the next occurrence of the contract's review date on or after the as-of date. Flags with no action date come last among equals.</p>
            <Example title="The first five flags today">
              <Table caption="The first five ranked flags" columns={[
                { key: 'rank', label: 'Rank', num: true, render: (r, i) => i + 1 },
                { key: 'type', label: 'Flag', rowHeader: true, nowrap: true, render: (r) => flagTypeLabel(r.f) },
                { key: 'c', label: 'Contract', minWidth: 220, render: (r) => <a className="mth-link" href={hrefFor('opportunities', { query: { flag: r.f.id } })}>{contract(r.f.contractId).title}</a> },
                { key: 'v', label: 'Indicative value', num: true, nowrap: true, render: (r) => fmtGBP(r.f.indicativeGBP) },
                { key: 'sev', label: 'Severity', nowrap: true, render: (r) => severityLabel(r.f.severity) },
              ]} rows={topFlags.map((f) => ({ id: f.id, f }))} />
            </Example>
          </Section>

          {/* 10. confidence */}
          <Section id="confidence">
            <Table caption="Confidence bands" columns={[
              { key: 'band', label: 'Confidence', rowHeader: true, nowrap: true, render: (r) => <ConfidencePill band={r.band} /> },
              { key: 'label', label: 'Shown as', nowrap: true, render: (r) => confidenceLabel(r.band) },
              { key: 'score', label: 'Score', render: (r) => r.score },
            ]} rows={[
              { id: 'high', band: 'high', score: '0.90 or above' },
              { id: 'medium', band: 'medium', score: '0.75 to below 0.90' },
              { id: 'review', band: 'review', score: 'Below 0.75' },
            ]} />
            <p>A renewal decision relies on the notice period, the end date and the auto-renewal answer. A cap flag relies on the cap answer and the start and end dates. A price increase relies on the price review answer. Flags built on spend also rely on the weakest supplier match among the contract's payments. When the cap is a contract value, confidence is one step lower again.</p>
            {lowFlag && (
              <Example title="C-018 notice period">
                <p>{confidenceReason(lowFlag)} <ClauseFor contractId="C-018" field="noticePeriod" context={contract('C-018').title} /></p>
              </Example>
            )}
            <p className="mth-note">A hand-check on the source page is saved on this device and does not change a confidence score.</p>
          </Section>

          {/* 11. data */}
          <Section id="data">
            <Table caption="What the sample contains" columns={[
              { key: 'k', label: 'What', rowHeader: true, nowrap: true, render: (r) => r.k },
              { key: 'v', label: 'In this sample', minWidth: 260, render: (r) => r.v },
            ]} rows={[
              { id: 'council', k: 'Council', v: `${council.name}, fictional` },
              { id: 'contracts', k: 'Contracts', v: `${data.contracts.length}, with ${data.extractions.length} extracted answers across the nine questions` },
              { id: 'payments', k: 'Payments', v: `${plural(data.payments.length, 'payment')} in ${plural(council.spendFileCount, 'monthly file')}, ${fmtGBP(coverage.totalGBP)} in total` },
              { id: 'window', k: 'Payment window', v: `${fmtDateLong(council.spendDataFrom)} to ${fmtDateLong(council.spendDataTo)}` },
              { id: 'asof', k: 'Fixed date', v: `Every figure is calculated as at ${fmtDateLong(asOf)}` },
            ]} />
            <p>{where}</p>
            <p className="mth-note">Everything on this page is calculated in your browser from the sample files. Nothing is sent anywhere.</p>
          </Section>

          {/* 12. limits */}
          <Section id="limits">
            <ul className="kx-prose mth-list">
              <li><strong>It does not ingest documents.</strong> {about("What this demo doesn't show.")}</li>
              <li><strong>It does not compare councils.</strong> Joining up councils is Stage 2. <a href={hrefFor('roadmap')}>{METHOD_COPY.openRoadmap}</a>.</li>
              <li><strong>It does not know why a payment was made.</strong> A variation, an approved extension or a change in volume can explain spend above a cap or a rise in payments. Each flag is a prompt to check the clause, not a finding.</li>
              <li><strong>It does not match payments to purchase orders or invoices.</strong> It joins payments to contracts by supplier name only.</li>
              <li><strong>It uses fictional data.</strong> The council, suppliers, contracts and payments were written for this demo.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
