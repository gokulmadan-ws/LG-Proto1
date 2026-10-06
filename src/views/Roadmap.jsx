// V7: Roadmap (#/roadmap). What this prototype does, what comes next, and what needs data we don't have yet.
//
//   default export: <Roadmap />       rendered inside <main id="shell-main"> by App.jsx for #/roadmap, no props.
//   Renders exactly ONE <h1>. Sections (h2): the status table, Stage 1 and Stage 2, Stage 1 data sources, Stage 2 (the joined-up view:
//   the six steps, the formula as plain text, the illustrative table and worked example, why there is money in it), Who would buy it,
//   What has to be true (with the note on why termination terms are extracted now).
//   There is nothing to type into and nothing that calculates: no input, slider, calculator or chart (R67). Every number in the
//   illustrative example is static text from the spec, labelled "Illustrative numbers, made up to show the logic, not real data".
//
// Content comes from src/data/roadmap.js (the spec's own words, checked against docs/spec.md by tests/engine.test.mjs). The strings that file
// does not hold live in TEXT below, in the same voice (listed in docs/handoff/V7.md). The contract source counts come from the estate.
import { roadmap, BADGES, NOT_IN_PROTOTYPE } from '../data/roadmap.js';
import { useEstate } from '../lib/estate.js';
import { COPY } from '../lib/copy.js';
import { useUI } from '../lib/ui-context.jsx';
import { PageHeader } from '../components/index.js';
import DS from '../ui/ds.js';
import { Panel, Pill } from '../ui/index.js';
import { ExtLink, ResponsiveTable } from './Evidence.jsx';
import './Roadmap.css';

const { Button } = DS;

const TEXT = {
  statusTitle: 'What is built and what is not',
  statusDesc: 'Four must-have features and one stretch feature are built. Everything marked Not in this prototype needs data or councils this prototype does not have, and its row says what.',
  statusCaption: 'Roadmap features, their status and what each one needs',
  cols: { feature: 'Feature', status: 'Status', needs: 'What it needs' },
  stagesTitle: 'Stage 1 and Stage 2',
  stagesCaption: 'Stage 1 and Stage 2 compared',
  stagesTopic: 'Topic',
  sourcesDesc: roadmap.dataSourcesIntro,
  sourcesNote: (n, total) => `In this sample ${n === total ? `all ${total}` : `${n} of ${total}`} contracts come from the council contracts register (PDF). None starts on or after 24 February 2025 with a value over £5m, so none would be on Find a Tender.`,
  stepsTitle: 'How the analysis works',
  formulaTitle: 'The net saving formula',
  illustrativeTitle: 'Illustrative example',
  workedTitle: 'Worked example',
  illustrativeCaption: 'Illustrative numbers, made up to show the logic, not real data. Ten councils buy the same service separately.',
  openContract: 'Open contract C-005',
  giveFeedback: COPY.buttons.giveFeedback,
};

/** The glyph for each status. Words always carry the meaning; the glyph is a second cue. */
const STATUS = {
  built: { tone: 'success', icon: 'circle-check' },
  stage2: { tone: 'info', icon: 'layer-group' },
  notYet: { tone: 'neutral', icon: 'hourglass-half' },
};
const SOURCE_ICON = ['file-contract', 'sterling-sign', 'newspaper'];

/**
 * The spec's sentence with each of its link labels turned into a link. Labels are matched inside the text exactly as the spec words
 * them, so what is read is the spec's sentence. Every link opens in a new tab and says so.
 */
function Linked({ text, links = [] }) {
  const hits = [];
  links.forEach((l) => {
    const i = text.indexOf(l.label);
    if (i >= 0 && !hits.some((h) => i < h.end && i + l.label.length > h.start)) hits.push({ start: i, end: i + l.label.length, url: l.url });
  });
  hits.sort((a, b) => a.start - b.start);
  const out = [];
  let at = 0;
  hits.forEach((h, n) => {
    if (h.start > at) out.push(text.slice(at, h.start));
    out.push(<ExtLink key={n} href={h.url}>{text.slice(h.start, h.end)}</ExtLink>);
    at = h.end;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

const noColon = (s) => s.replace(/:$/, '');

export default function Roadmap() {
  const { estate } = useEstate();
  const ui = useUI();
  const contracts = estate.data.contracts;
  const fromRegister = contracts.filter((c) => c.source !== 'find_a_tender').length;
  const s2 = roadmap.stage2;
  const ill = s2.illustrative;

  const statusColumns = [
    {
      key: 'feature', label: TEXT.cols.feature, rowHeader: true, minWidth: 220,
      render: (r) => (
        <span className="rm-feature">
          {r.href ? <a className="rm-link" href={r.href}>{r.feature}</a> : <span className="rm-feature__name">{r.feature}</span>}
          {r.note && <span className="rm-feature__note">{r.note}</span>}
        </span>
      ),
    },
    {
      key: 'status', label: TEXT.cols.status, minWidth: 210,
      render: (r) => (
        <span className="rm-status">
          <Pill tone={STATUS[r.status].tone} icon={STATUS[r.status].icon}>{r.badgeLabel}</Pill>
          {r.notInPrototype && <span className="rm-status__not">{NOT_IN_PROTOTYPE}</span>}
        </span>
      ),
    },
    { key: 'needs', label: TEXT.cols.needs, minWidth: 320, render: (r) => <span className="rm-needs">{r.needs}</span> },
  ];

  const stageColumns = [
    { key: 'topic', label: TEXT.stagesTopic, hideLabel: true, rowHeader: true, minWidth: 150 },
    { key: 's1', label: noColon(roadmap.stages.columns[1]), minWidth: 260, render: (r) => <span className="rm-needs">{r.s1}</span> },
    { key: 's2', label: noColon(roadmap.stages.columns[2]), minWidth: 260, render: (r) => <span className="rm-needs">{r.s2}</span> },
  ];
  const stageRows = roadmap.stages.rows.map(([topic, s1, s2], i) => ({ id: 'st' + i, topic, s1, s2 }));

  const illColumns = ill.columns.map((label, i) => ({
    key: 'c' + i, label, num: false, minWidth: i === 1 ? 220 : i === 4 ? 220 : undefined, rowHeader: i === 0,
    render: (r) => <span className="rm-needs">{r['c' + i]}</span>,
  }));
  const illRows = ill.rows.map((cells, i) => Object.fromEntries([['id', 'il' + i], ...cells.map((c, j) => ['c' + j, c])]));

  return (
    <div className="page rm">
      <PageHeader
        title={roadmap.title}
        description={<p>{roadmap.subtitle}</p>}
        actions={<Button type="button" variant="outline" leftIcon="comments" onClick={(e) => ui.openFeedback(e.currentTarget)}>{TEXT.giveFeedback}</Button>}
      />

      {/* 1. status ------------------------------------------------------------------------------------------------ */}
      <Panel title={TEXT.statusTitle} description={TEXT.statusDesc} padded={false} className="rm-panel rm-status-panel">
        <ResponsiveTable caption={TEXT.statusCaption} columns={statusColumns} rows={roadmap.statusRows} rowKey="id" />
      </Panel>

      {/* 2. Stage 1 and Stage 2 ------------------------------------------------------------------------------------ */}
      <Panel title={TEXT.stagesTitle} description={roadmap.stagesIntro} padded={false} className="rm-panel"
        footer={<p className="rm-closing"><i className="fa-solid fa-arrow-right" aria-hidden="true" />{roadmap.stagesClosing}</p>}>
        <ResponsiveTable caption={TEXT.stagesCaption} columns={stageColumns} rows={stageRows} rowKey="id" />
      </Panel>

      {/* 3. Stage 1 data sources ----------------------------------------------------------------------------------- */}
      <Panel title={roadmap.dataSourcesTitle} description={TEXT.sourcesDesc} className="rm-panel" padded={24}>
        <ul className="rm-sources">
          {roadmap.dataSources.map((s, i) => (
            <li key={s.title} className="rm-source">
              <span className="rm-chip" aria-hidden="true"><i className={'fa-solid fa-' + SOURCE_ICON[i]} /></span>
              <h3 className="rm-h3">{noColon(s.title)}</h3>
              <p><Linked text={s.text} links={s.links} /></p>
            </li>
          ))}
        </ul>
        <p className="rm-note">{TEXT.sourcesNote(fromRegister, contracts.length)}</p>
      </Panel>

      {/* 4. Stage 2: the joined-up view ------------------------------------------------------------------------------ */}
      <Panel title={s2.title} className="rm-panel rm-stage2" padded={24}
        actions={(
          <span className="rm-tags">
            <Pill tone="info" icon="layer-group">{BADGES.stage2}</Pill>
            <span className="rm-status__not">{NOT_IN_PROTOTYPE}</span>
          </span>
        )}>
        <p className="rm-lead">{s2.intro}</p>

        <h3 className="rm-h3">{s2.stepsTitle}</h3>
        <ol className="rm-steps">
          {s2.steps.map((step, i) => (
            <li key={i} className="rm-step"><span className="rm-step__n" aria-hidden="true">{i + 1}</span><span className="rm-step__text">{step}</span></li>
          ))}
        </ol>

        <h3 className="rm-h3">{TEXT.formulaTitle}</h3>
        <p className="rm-formula"><code>{s2.formula.plain}</code></p>

        <div className="rm-illustrative">
          <div className="rm-illustrative__head">
            <h3 className="rm-h3">{TEXT.illustrativeTitle}</h3>
            <p className="rm-illustrative__label"><i className="fa-solid fa-flask" aria-hidden="true" /><strong>{ill.label}</strong></p>
          </div>
          <p className="rm-text">{ill.intro}</p>
          <div className="rm-table"><ResponsiveTable caption={TEXT.illustrativeCaption} columns={illColumns} rows={illRows} rowKey="id" phoneTitle={(r) => `${r.c0} ${r.c0 === '1' ? 'council' : 'councils'}`} /></div>
          <div className="rm-worked">
            <h4 className="rm-h4">{TEXT.workedTitle}</h4>
            <p className="rm-text">{ill.workedExample}</p>
          </div>
        </div>

        <h3 className="rm-h3">{s2.whyTitle}</h3>
        <ul className="rm-why">
          {s2.why.map((w) => (
            <li key={w.title} className="rm-why__item">
              <h4 className="rm-h4">{w.title}</h4>
              <p><Linked text={w.text} links={w.links} /></p>
            </li>
          ))}
        </ul>
      </Panel>

      {/* 5 and 6. who would buy it, what has to be true ------------------------------------------------------------------ */}
      <div className="kx-grid kx-grid--2 rm-pair">
        <Panel title={roadmap.whoTitle} className="rm-panel" padded={24}>
          <ul className="rm-points">
            {roadmap.who.map((w) => (
              <li key={w.title}><strong>{w.title}</strong> <Linked text={w.text} links={w.links} /></li>
            ))}
          </ul>
        </Panel>
        <Panel title={roadmap.trueTitle} className="rm-panel" padded={24}>
          <ul className="rm-points">
            {roadmap.mustBeTrue.map((w) => (
              <li key={w.title}><strong>{w.title}</strong> {w.text}</li>
            ))}
          </ul>
          <p className="rm-note rm-termination">
            {roadmap.terminationNote}{' '}
            <a className="rm-link" href="#/contracts/C-005">{TEXT.openContract}</a>
          </p>
        </Panel>
      </div>
    </div>
  );
}
