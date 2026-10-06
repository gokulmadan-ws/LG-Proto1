// The nine financial questions (must-have 1): Q1 to Q9 in order, every answer in plain words (copy deck 7.10 via answerFor), how sure Kontor is
// (ConfidencePill: High from 0.90, Medium from 0.75, Needs review below), and "View clause, page N" into the source viewer (from="contracts").
// "Not found" is a first-class answer: it is shown as an answer, with its own glyph, the fallback the engine used and the clause it looked at.
import { answerFor, confidenceBand, fieldLabel, COPY } from '../../lib/copy.js';
import { evidenceForField } from '../../lib/evidenceFor.js';
import { ClauseLink, ConfidencePill } from '../../components/index.js';
import { Panel, Pill } from '../../ui/index.js';
import { DETAIL } from './strings.js';

const sentence = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Where "View clause" goes for one answer. A missing maximum points at the contract value clause the engine fell back to (A2 handoff). */
function clauseFor(contract, x, answer) {
  if (x.fieldKey === 'maximumValue' && answer.kind === 'not_found') {
    const t = evidenceForField(contract.id, 'awardedTotalValue');
    if (t) return { extractionId: t.extractionId, page: t.page, label: DETAIL.questions.contractValueClause(t.page) };
  }
  const p = x.provenance && x.provenance[0];
  return p ? { extractionId: x.id, page: p.page, label: null } : null;
}

function RateCard({ rows }) {
  const T = DETAIL.questions;
  return (
    <table className="cd-rates">
      <caption className="sr-only">{T.rateCardCaption}</caption>
      <thead><tr><th scope="col">{T.rateCols.item}</th><th scope="col">{T.rateCols.unit}</th><th scope="col" className="num">{T.rateCols.rate}</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.item}><td>{r.item}</td><td>{r.unit}</td><td className="num">{r.rate}</td></tr>)}</tbody>
    </table>
  );
}

function Field({ contract, x, checked }) {
  const T = DETAIL.questions;
  const a = answerFor(x, contract);
  const band = confidenceBand(x.confidence);
  const clause = clauseFor(contract, x, a);
  const missing = a.kind === 'not_found';
  return (
    <div className={'cd-field' + (missing ? ' is-missing' : '') + (band === 'review' ? ' is-review' : '')} data-field={x.fieldKey} data-extraction-id={x.id}>
      <dt className="cd-field__label">{sentence(fieldLabel(x.fieldKey))}</dt>
      <dd className="cd-field__answer">
        {a.rows ? <RateCard rows={a.rows} /> : (
          <span className="cd-answer" data-testid="answer">
            {missing && <i className="fa-solid fa-circle-question cd-answer__icon" aria-hidden="true" />}
            <span>{a.text}</span>
          </span>
        )}
        {band === 'review' && <span className="cd-field__warn"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {T.notSure}</span>}
        {checked && <span className="cd-field__checked"><Pill icon={checked === 'correct' ? 'user-check' : 'user-xmark'}>{T.checked[checked]}</Pill></span>}
      </dd>
      <dd className="cd-field__conf">
        <ConfidencePill score={x.confidence} />
        <span className="cd-score"><span className="sr-only">{T.scorePrefix} </span>{x.confidence.toFixed(2)}</span>
      </dd>
      <dd className="cd-field__clause">
        {clause && <ClauseLink contractId={contract.id} extractionId={clause.extractionId} page={clause.page} from="contracts" context={sentence(fieldLabel(x.fieldKey))}>{clause.label || COPY.buttons.viewClausePage(clause.page)}</ClauseLink>}
      </dd>
    </div>
  );
}

export function QuestionsPanel({ contract, estate, handcheck }) {
  const T = DETAIL.questions;
  const answered = estate.extractionsByContract[contract.id] || [];
  const checkedCount = answered.filter((x) => handcheck && handcheck[x.id]).length;
  return (
    <Panel as="h2" id="cd-questions-title" title={COPY.questionsGroupLabel} description={T.description} padded={false} footer={<p className="cd-qfoot" data-testid="contract-handcheck">{T.footer(checkedCount, answered.length)}</p>}>
      <ol className="cd-qs">
        {estate.data.questions.map((q) => {
          const xs = q.fields.map((f) => estate.extractionsById[contract.extractionIds[f]]).filter(Boolean);
          return (
            <li key={q.id} className="cd-q" data-question={q.id}>
              <section aria-labelledby={`cd-${q.id}`}>
                <header className="cd-q__head">
                  <span className="cd-q__num" aria-hidden="true">{q.id}</span>
                  <div>
                    <h3 id={`cd-${q.id}`} className="cd-q__title"><span className="sr-only">{q.id}: </span>{q.label}</h3>
                    <p className="cd-q__help">{q.help}</p>
                  </div>
                </header>
                <dl className="cd-fields">
                  {xs.map((x) => <Field key={x.id} contract={contract} x={x} checked={handcheck && handcheck[x.id]} />)}
                </dl>
              </section>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

export default QuestionsPanel;
