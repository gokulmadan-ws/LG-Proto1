// The Action tab of the opportunity drawer (build spec 8.2). Rendered by FlagDrawer under the "Action" tab (?flag=<id>&tab=action).
//
//   <ActionPanel flag contract derived action from onStart onRequestClose />
//     action          the flag's action (useEstate().state.actions[flag.id]) when it is on the board, else null
//     onStart()       "Start action" (the same as choosing Under review, D1)
//     onRequestClose(outcome)   choosing Closed as the stage: the drawer opens the close dialog
//
// No action: "Nobody is working on this yet." and a "Start action" button. Otherwise, top to bottom: Who and when (stage, owner, due),
// Next steps (checklist), Who to contact (both representatives from clause 3, three roles from the staff list), Draft email (a fixed
// template you copy; the app never sends anything), Exit terms (three facts with their clause links, D6) and Activity (notes and the log).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useEstate } from '../lib/estate.js';
import { ACT, STAGE_LABEL, whenText } from '../lib/actions-copy.js';
import { STAGES, activityOf, stepProgress } from '../lib/actions.js';
import { fmtDate } from '../lib/format.js';
import { PEOPLE, peopleById } from '../data/people.js';
import { stepsFor } from '../data/action-steps.js';
import { contactsFor } from '../data/contacts.js';
import { emailFor, emailText } from '../data/email-templates.js';
import DS from '../ui/ds.js';
import { Check, EmptyState, Field } from '../ui/index.js';
import { ClauseLink } from './ClauseLink.jsx';
import { OutcomePill, PersonAvatar } from './ActionBits.jsx';
import { useActionCommands } from './useActionCommands.js';
import './ActionPanel.css';

const { Button, Input, Select } = DS;

function Section({ n, title, note, children, id }) {
  return (
    <section className="act-sec" aria-labelledby={id}>
      <div className="act-sec__head">
        <h3 className="act-sec__title" id={id}><span className="act-sec__n" aria-hidden="true">{n}</span>{title}</h3>
        {note && <span className="act-sec__note">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** The three exit facts (D6), each with the extraction it came from. */
function exitTerms(estate, contract) {
  const x = (field) => estate.extractionsById[`X-${contract.id}-${field}`] || null;
  const target = (ex) => (ex && ex.status !== 'not_found' && ex.provenance && ex.provenance[0] ? { id: ex.id, page: ex.provenance[0].page, clauseRef: ex.provenance[0].clauseRef } : null);
  const tfc = x('terminationForConvenience');
  const fee = x('exitFees');
  const notice = x('noticePeriod');
  const end = x('endDate');
  const tfcA = tfc && tfc.answer;
  const feeA = fee && fee.answer;
  return [
    { key: 'convenience', label: ACT.exit.convenience, value: !tfc || tfc.status === 'not_found' ? ACT.exit.notFound : tfcA && tfcA.allowed ? ACT.exit.yes(tfcA.noticeMonths) : ACT.exit.no, src: target(tfc) },
    { key: 'fee', label: ACT.exit.fee, value: !fee || fee.status === 'not_found' ? ACT.exit.notFound : feeA && feeA.present ? feeA.summary : ACT.exit.none, src: target(fee) },
    { key: 'ends', label: ACT.exit.ends, value: fmtDate(contract.endDate), src: target(notice) || target(end) },
  ];
}

export default function ActionPanel({ flag, contract, derived, action, from, onStart, onRequestClose }) {
  const { estate, actions } = useEstate();
  const cmd = useActionCommands();
  const uid = useId().replace(/:/g, '');
  const contacts = useMemo(() => contactsFor(flag, contract), [flag, contract]);
  const [toId, setToId] = useState(contacts[0] ? contacts[0].id : '');
  const [msg, setMsg] = useState('');
  const [noteText, setNoteText] = useState('');
  const mailRef = useRef(null);

  useEffect(() => { setToId(contacts[0] ? contacts[0].id : ''); setMsg(''); setNoteText(''); }, [flag.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!action) {
    return (
      <div className="act-panel act-panel--empty">
        <EmptyState as="h3" icon="list-check" title={ACT.empty.title}
          action={<Button type="button" leftIcon="play" onClick={onStart}>{ACT.empty.button}</Button>}>
          {ACT.empty.body}
        </EmptyState>
      </div>
    );
  }

  const owner = action.owner ? peopleById[action.owner] : null;
  const prog = stepProgress(action);
  const recipient = contacts.find((c) => c.id === toId) || contacts[0];
  const mail = recipient ? emailFor(flag, contract, derived, recipient, action.due) : null;
  const facts = exitTerms(estate, contract);
  const activity = activityOf(action);
  const closed = action.stage === 'closed';

  const onStage = (stage) => {
    if (stage === action.stage) return;
    if (stage === 'closed') onRequestClose('resolved');
    else cmd.move(flag, stage);
  };

  const copy = async () => {
    const text = emailText(mail);
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; }
    } catch (e) { ok = false; }
    if (ok) {
      actions.logActionEmail(flag, 'copied', recipient.name);
      setMsg(ACT.email.copied(recipient.name));
      return;
    }
    // Blocked: select the subject and body so Ctrl+C or Cmd+C copies them.
    const node = mailRef.current;
    if (node && window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setMsg(ACT.email.blocked);
  };
  const markSent = () => { actions.logActionEmail(flag, 'sent', recipient.name); setMsg(ACT.email.markedSent(recipient.name)); };
  const addNote = (e) => { e.preventDefault(); if (!noteText.trim()) return; actions.addActionNote(flag, noteText); setNoteText(''); };

  return (
    <div className="act-panel">
      {closed && (
        <div className="act-closed" role="status">
          <OutcomePill outcome={action.outcome} />
          <p className="act-closed__line">
            {action.outcome === 'resolved' && <span>{ACT.closedSummary.resolved(action.cashRecoveredGBP || 0, action.costAvoidedGBP || 0)} </span>}
            {action.closeNote && <span>{action.closeNote} </span>}
            <span>{ACT.closedSummary.on(action.closedAt)}</span>
          </p>
          <p className="act-closed__help">{ACT.closedSummary.reopen}</p>
        </div>
      )}

      <Section n={1} title={ACT.who.title} id={`${uid}-who`}>
        <div className="act-who">
          <Field label={ACT.who.stage} className="act-who__stage">
            {(p) => <Select {...p} value={action.stage} options={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))} onChange={(e) => onStage(e.target.value)} />}
          </Field>
          <Field label={ACT.who.owner} className="act-who__owner">
            {(p) => (
              <span className="act-who__ownerctl">
                <PersonAvatar person={owner} />
                <Select {...p} value={action.owner || ''} onChange={(e) => actions.setActionOwner(flag, e.target.value || null)}
                  options={[{ value: '', label: ACT.who.notSet }, ...PEOPLE.map((x) => ({ value: x.id, label: x.name }))]} />
              </span>
            )}
          </Field>
          <Field label={ACT.who.due} className="act-who__due" help={ACT.who.dueHelp(action.due)}>
            {(p) => <Input {...p} type="date" value={action.due} onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) actions.setActionDue(flag, e.target.value); }} />}
          </Field>
        </div>
      </Section>

      <Section n={2} title={ACT.steps.title} note={ACT.steps.done(prog.done, prog.total)} id={`${uid}-steps`}>
        <ul className="act-steps">
          {stepsFor(action.flagType).map((s) => (
            <li key={s.id} className={'act-step' + (action.steps[s.id] ? ' is-done' : '')}>
              <Check checked={!!action.steps[s.id]} onChange={() => actions.toggleActionStep(flag, s.id)} label={s.text} description={s.hint} data-step={s.id} />
            </li>
          ))}
        </ul>
      </Section>

      <Section n={3} title={ACT.contacts.title} note={ACT.contacts.note} id={`${uid}-contacts`}>
        <ul className="act-contacts">
          {contacts.map((c) => (
            <li key={c.id + c.kind} className="act-contact" data-kind={c.kind}>
              <PersonAvatar person={{ initials: c.initials }} size={32} />
              <div className="act-contact__main">
                <p className="act-contact__name"><b>{c.name}</b> <span>· {c.internal ? c.role : ACT.contacts.supplierRole(c.role, contract.supplierName)}</span></p>
                <p className="act-contact__why">{ACT.contacts.why(c.label, c.why)}</p>
              </div>
              <div className="act-contact__src">
                {typeof c.source === 'string'
                  ? <span className="act-contact__staff">{ACT.contacts.staff}</span>
                  : (
                    <details className="act-quote">
                      <summary>{ACT.contacts.source(c.source.label, c.source.clauseRef, c.source.page)}</summary>
                      <blockquote className="act-quote__text" aria-label={ACT.contacts.quoteLabel}>{c.source.quote}</blockquote>
                    </details>
                  )}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {mail && (
        <Section n={4} title={ACT.email.title} note={ACT.email.note} id={`${uid}-email`}>
          <div className="act-mail">
            <div className="act-mail__to">
              <Field label={ACT.email.to}>
                {(p) => <Select {...p} value={recipient.id} onChange={(e) => { setToId(e.target.value); setMsg(''); }}
                  options={contacts.map((c) => ({ value: c.id, label: ACT.email.toOption(c.name, c.email) }))} />}
              </Field>
            </div>
            <div className="act-mail__text" ref={mailRef}>
              <p className="act-mail__subject"><span className="act-mail__label">{ACT.email.subject}</span> <span data-mail-subject>{mail.subject}</span></p>
              <div className="act-mail__body" role="textbox" aria-readonly="true" aria-multiline="true" aria-label={ACT.email.body} tabIndex={0} data-mail-body>{mail.body}</div>
            </div>
            <div className="act-mail__foot">
              <div className="act-mail__btns">
                <Button type="button" leftIcon="copy" onClick={copy}>{ACT.email.copy}</Button>
                <Button type="button" variant="outline" leftIcon="paper-plane" onClick={markSent}>{ACT.email.sent}</Button>
              </div>
              <p className="act-mail__hint">{ACT.email.hint}</p>
            </div>
            <p className="act-mail__msg" role="status" aria-live="polite">{msg}</p>
          </div>
        </Section>
      )}

      <Section n={5} title={ACT.exit.title} note={ACT.exit.note} id={`${uid}-exit`}>
        <dl className="act-exit">
          {facts.map((f) => (
            <div key={f.key} className="act-exit__fact">
              <dt>{f.label}</dt>
              <dd>
                <span className="act-exit__val">{f.value}</span>
                {f.src && <ClauseLink contractId={contract.id} extractionId={f.src.id} page={f.src.page} from={from} context={f.label}>{ACT.exit.clause(f.src.clauseRef, f.src.page)}</ClauseLink>}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section n={6} title={ACT.activity.title} id={`${uid}-activity`}>
        <form className="act-note" onSubmit={addNote}>
          <Field label={ACT.activity.noteLabel} hideLabel>
            {(p) => <Input {...p} type="text" maxLength={500} autoComplete="off" placeholder={ACT.activity.noteLabel} value={noteText} onChange={(e) => setNoteText(e.target.value)} />}
          </Field>
          <Button type="submit" variant="outline">{ACT.activity.addNote}</Button>
        </form>
        {activity.length === 0
          ? <p className="act-activity__empty">{ACT.activity.empty}</p>
          : (
            <ol className="act-activity">
              {activity.map((l) => (
                <li key={l.kind + l.i} className={'act-activity__item' + (l.kind === 'note' ? ' is-note' : '')}>
                  <i className={l.kind === 'note' ? 'fa-regular fa-note-sticky' : 'fa-regular fa-circle'} aria-hidden="true" />
                  <span className="act-activity__when">{whenText(l.at)}</span>
                  <span className="act-activity__text">
                    {l.kind === 'note' ? <><span className="sr-only">{ACT.activity.noteTag}: </span>{l.text}</> : l.text.startsWith('You ') ? <><b>You</b>{l.text.slice(3)}</> : l.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
      </Section>
    </div>
  );
}
