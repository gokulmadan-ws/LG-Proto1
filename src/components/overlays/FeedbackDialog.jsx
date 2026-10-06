// V7: "Tell us what you think". The kit Dialog with the one question the prototype exists to ask.
//
// Contract
//   default export: <FeedbackDialog open onClose />, mounted ONCE by App.jsx, always rendered, returns null while closed.
//   props: open (boolean), onClose () => void. Open with useUI().openFeedback(triggerEl?) (Overview close panel, Roadmap, Menu, Demo guide).
//
//   The question "Would you use this on your own contracts?" (Yes, Maybe, No), a comment box "What would make it more useful?", and the
//   buttons Cancel and Save feedback (the one filled button). Save goes through useEstate().actions.addFeedback():
//     saved          -> toast "Feedback saved on this device. Thank you." and the dialog closes. The entry is listed the next time it opens.
//     no choice      -> inline error (R62): "Feedback not saved. You haven't chosen an answer. Choose Yes, Maybe or No and try again."
//                       focus moves to the first option, the dialog stays open and the comment is kept.
//     storage blocked-> inline error: "Feedback not saved. Your browser is blocking local storage. Copy your comments instead."
//                       and "Copy feedback" copies the comment you just typed (answer, comment, as-of date) so nothing is lost.
//   Saved entries on this device are listed with their date and time, with "Copy feedback" for all of them (plain text).
//   The form starts empty every time the dialog opens.
//
// Wording is COPY.feedback, COPY.errors and COPY.toasts in src/lib/copy.js. The few labels the deck lacks are in TEXT (docs/handoff/V7.md).
import { useEffect, useRef, useState } from 'react';
import { useEstate } from '../../lib/estate.js';
import { useUI } from '../../lib/ui-context.jsx';
import { COPY, feedbackText } from '../../lib/copy.js';
import { AS_OF } from '../../lib/engine.js';
import DS from '../../ui/ds.js';
import { Dialog, Field, Pill, RadioField } from '../../ui/index.js';
import './overlays.css';

const { Button, Textarea } = DS;

const TEXT = {
  savedTitle: 'Saved on this device',
  none: 'No comment',
  copyFailed: { title: 'Feedback not copied.', description: 'Your browser blocked clipboard access. Select the saved comments on this screen and copy them by hand.' },
  answers: { yes: 'Yes', maybe: 'Maybe', no: 'No' },
  answerIcons: { yes: 'thumbs-up', maybe: 'circle-question', no: 'thumbs-down' },
  at: (iso) => {
    const d = new Date(iso);                                         // formats a stored timestamp; nothing is derived from the clock
    if (!iso || Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
};
const OPTIONS = COPY.feedback.options.map((label) => ({ value: label.toLowerCase(), label }));

/** Copies text to the clipboard; falls back to a hidden textarea where the async API is unavailable (file://, older browsers). */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

export default function FeedbackDialog({ open, onClose }) {
  const { state, actions } = useEstate();
  const ui = useUI();
  const [answer, setAnswer] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);                  // null | 'no_answer' | 'storage_blocked'
  const group = useRef(null);
  const saved = state.feedback;

  // A fresh form every time the dialog opens.
  useEffect(() => { if (open) { setAnswer(''); setComment(''); setError(null); } }, [open]);

  const close = () => { if (onClose) onClose(); };

  const save = () => {
    const res = actions.addFeedback({ answer, comment: comment.trim() });
    if (res.ok) {
      ui.toast({ tone: 'success', title: COPY.toasts.feedbackSaved });
      close();
      return;
    }
    setError(res.reason === 'storage_blocked' ? 'storage_blocked' : 'no_answer');
    if (res.reason !== 'storage_blocked' && group.current) { const first = group.current.querySelector('input[type="radio"]'); if (first) first.focus(); }
  };

  const copy = async () => {
    // What is copied: every saved entry, and, when saving failed, the comment you just typed.
    const entries = saved.slice();
    if (error === 'storage_blocked' && answer) entries.push({ at: new Date().toISOString(), answer, comment: comment.trim(), asOf: AS_OF });
    const ok = await copyText(feedbackText(entries));
    ui.toast(ok ? { tone: 'success', title: COPY.toasts.feedbackCopied } : { tone: 'error', ...TEXT.copyFailed });
  };

  const showCopy = saved.length > 0 || error === 'storage_blocked';
  const errorText = error === 'no_answer' ? COPY.errors.feedbackNoAnswer : error === 'storage_blocked' ? COPY.errors.feedbackBlocked : null;

  return (
    <Dialog
      open={open}
      onClose={close}
      title={COPY.feedback.title}
      size="md"
      className="ovl-feedback"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={close}>{COPY.feedback.cancel}</Button>
          <Button type="button" variant="primary" onClick={save}>{COPY.feedback.save}</Button>
        </>
      )}
    >
      <form className="ovl-feedback__form" onSubmit={(e) => e.preventDefault()} noValidate>
        <fieldset ref={group} className="kx-radiogroup ovl-feedback__q" role="radiogroup" aria-invalid={error === 'no_answer' ? true : undefined}
          aria-describedby={error === 'no_answer' ? 'ovl-fb-error' : undefined}>
          <legend className="kx-radiogroup__legend">{COPY.feedback.question}</legend>
          <div className="kx-radiogroup__opts ovl-feedback__opts">
            {OPTIONS.map((o, i) => (
              <RadioField key={o.value} name="ovl-feedback-answer" value={o.value} label={o.label} checked={answer === o.value}
                onChange={(v) => { setAnswer(v); if (error === 'no_answer') setError(null); }}
                {...(i === 0 ? { 'data-autofocus': '' } : {})} />
            ))}
          </div>
        </fieldset>

        <Field label={COPY.feedback.comment} optional help={COPY.feedback.helper}>
          <Textarea rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>

        {errorText && (
          <div className="ovl-alert" id="ovl-fb-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <div className="ovl-alert__body">
              <p>{errorText}</p>
              {error === 'storage_blocked' && (
                <Button type="button" variant="outline" size="sm" leftIcon="copy" onClick={copy}>{COPY.feedback.copy}</Button>
              )}
            </div>
          </div>
        )}
      </form>

      {saved.length > 0 && (
        <section className="ovl-saved" aria-labelledby="ovl-saved-h">
          <div className="ovl-saved__head">
            <h3 id="ovl-saved-h" className="ovl-h3">{TEXT.savedTitle}</h3>
            {showCopy && error !== 'storage_blocked' && (
              <Button type="button" variant="outline" size="sm" leftIcon="copy" onClick={copy}>{COPY.feedback.copy}</Button>
            )}
          </div>
          <ul className="ovl-saved__list">
            {saved.slice().reverse().map((e, i) => (
              <li key={(e.at || '') + i} className="ovl-saved__item">
                <span className="ovl-saved__meta">
                  <Pill tone="neutral" icon={TEXT.answerIcons[e.answer]} size="sm">{TEXT.answers[e.answer]}</Pill>
                  <time dateTime={e.at || undefined}>{TEXT.at(e.at)}</time>
                </span>
                <span className={'ovl-saved__comment' + (e.comment ? '' : ' ovl-saved__comment--none')}>{e.comment || TEXT.none}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Dialog>
  );
}
