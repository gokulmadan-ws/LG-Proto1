// The close dialog (build spec 8.3). Opens when a card goes to Closed on the board (drag or "Move to") or when you choose Resolved,
// Explained or No action in the drawer's review status. Cancel changes nothing.
//
//   <CloseActionDialog open flag contract action initialOutcome onCancel onConfirm />
//     flag      engine flag (estate.flagsById[id])      action   its action, or null when closing creates it
//     initialOutcome 'resolved' | 'explained' | 'no_action'
//     onConfirm({ outcome, cashRecoveredGBP, costAvoidedGBP, closeNote })   only called with valid input
//
// Resolved asks for the money, split two ways (D7): cash recovered and cost avoided, whole pounds, at least one above 0. Every outcome
// asks for one line on what happened (140 characters at most). The figures are the user's own: the dialog says so and checks nothing else.
import { useEffect, useId, useState } from 'react';
import DS from '../ui/ds.js';
import { Dialog, Field, RadioField } from '../ui/index.js';
import { flagTypeLabel } from '../lib/copy.js';
import { ACT } from '../lib/actions-copy.js';
import { OUTCOMES, OUTCOME_LABEL, CLOSE_NOTE_MAX } from '../lib/actions.js';
import { parseWholePounds } from './ActionBits.jsx';

const { Button, Input } = DS;
const T = ACT.dialog;

export function CloseActionDialog({ open, flag, contract, action, initialOutcome = 'resolved', onCancel, onConfirm }) {
  const uid = useId();
  const [outcome, setOutcome] = useState(initialOutcome);
  const [cash, setCash] = useState('');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  // Every opening starts clean, with the outcome the trigger chose.
  useEffect(() => {
    if (!open) return;
    setOutcome(OUTCOMES.includes(initialOutcome) ? initialOutcome : 'resolved');
    setCash(''); setCost(''); setNote(''); setErrors({});
  }, [open, initialOutcome]);

  if (!open || !flag || !contract) return null;
  const flagged = action ? action.flaggedGBP : flag.indicativeGBP;

  const submit = (e) => {
    if (e) e.preventDefault();
    const err = {};
    let c = null; let a = null;
    if (outcome === 'resolved') {
      c = parseWholePounds(cash); a = parseWholePounds(cost);
      if (Number.isNaN(c)) err.cash = T.wholePounds;
      if (Number.isNaN(a)) err.cost = T.wholePounds;
      if (!err.cash && !err.cost && !((c || 0) > 0 || (a || 0) > 0)) err.money = T.moneyError;
    }
    if (!note.trim()) err.note = T.whatError;
    setErrors(err);
    if (Object.keys(err).length) {
      const first = err.cash || err.money ? `${uid}-cash` : err.cost ? `${uid}-cost` : `${uid}-note`;
      setTimeout(() => { const el = document.getElementById(first); if (el) el.focus(); }, 0);
      return;
    }
    onConfirm({ outcome, cashRecoveredGBP: outcome === 'resolved' && c > 0 ? c : null, costAvoidedGBP: outcome === 'resolved' && a > 0 ? a : null, closeNote: note.trim() });
  };

  return (
    <Dialog open onClose={() => onCancel && onCancel()} title={T.title} description={T.subtitle(contract.title, flagTypeLabel(flag), flagged)} className="act-close"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={() => onCancel && onCancel()}>{T.cancel}</Button>
          <Button type="submit" form={`${uid}-form`}>{T.confirm}</Button>
        </>
      )}>
      <form id={`${uid}-form`} className="act-close__form" onSubmit={submit} noValidate>
        <fieldset className="kx-radiogroup is-inline act-close__outcomes">
          <legend className="kx-radiogroup__legend">{T.outcome}</legend>
          <div className="kx-radiogroup__opts">
            {OUTCOMES.map((o) => (
              <RadioField key={o} name={`${uid}-outcome`} value={o} checked={outcome === o} label={OUTCOME_LABEL[o]}
                onChange={(v) => { setOutcome(v); setErrors({}); }} {...(outcome === o ? { 'data-autofocus': '' } : {})} />
            ))}
          </div>
        </fieldset>

        {outcome === 'resolved' && (
          <div className="act-close__money">
            <Field label={T.cash} help={T.cashHelp} error={err(errors.cash || errors.money)} id={`${uid}-cash`}>
              {(p) => <Input {...p} type="text" inputMode="numeric" autoComplete="off" leftIcon="sterling-sign" value={cash} onChange={(e) => setCash(e.target.value)} />}
            </Field>
            <Field label={T.cost} help={T.costHelp} error={err(errors.cost)} id={`${uid}-cost`}>
              {(p) => <Input {...p} type="text" inputMode="numeric" autoComplete="off" leftIcon="sterling-sign" value={cost} onChange={(e) => setCost(e.target.value)} />}
            </Field>
          </div>
        )}

        <Field label={T.what} error={err(errors.note)} id={`${uid}-note`}>
          {(p) => <Input {...p} type="text" maxLength={CLOSE_NOTE_MAX} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <p className="act-close__hint">{T.hint}</p>
      </form>
    </Dialog>
  );
}

const err = (x) => x || undefined;

export default CloseActionDialog;
