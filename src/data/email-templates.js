// Draft emails for an action (build spec section 6.5, decision D4): FIXED templates filled with contract facts. No AI, and the app never
// sends anything: you copy the text and send it yourself. Internal people get the "internal" template, the supplier's representative
// the "supplier" one. Money to the pound, dates in full ("20 October 2026"), the sign-off is literally "[Your name]".
//
//   emailFor(flag, contract, derived, recipient, due) -> { to: { name, email }, subject, body, internal }
//     flag       an engine flag (estate.flagsById[id])          contract   estate.contractsById[flag.contractId]
//     derived    estate.derived[contract.id] (cap, spend)        recipient  a contactsFor() entry ({ name, email, internal })
//     due        'YYYY-MM-DD' (the action's due date)
//   emailText(email) -> 'Subject: ...\n\n' + body   (what "Copy email" puts on the clipboard)
import { AS_OF } from '../lib/engine.js';
import { fmtDateLong, fmtGBP, fmtPct } from '../lib/format.js';
import { evidenceFor } from '../lib/evidenceFor.js';
import { firstName } from './people.js';

export const SIGN_OFF = '[Your name]';
export const COUNCIL_NAME = 'Marchbank Borough Council';
const INTERNAL_CLOSE = ['Thanks,', SIGN_OFF];
const SUPPLIER_CLOSE = ['Kind regards,', SIGN_OFF, COUNCIL_NAME];

const join = (lines) => lines.join('\n');
const cite = (ev) => (ev ? `- ${ev.clauseRef}, page ${ev.page}: "${ev.quote}"` : null);
const indexCapText = (capPct) => fmtPct(capPct, 1);

/* ---------------------------------------------------------------- over cap */
function overCap(flag, c, d, who, due, internal) {
  const ev = evidenceFor(flag);
  const cs = (d && d.cap) || {};
  const annual = cs.basis === 'annual';
  const estimate = flag.capState === 'above_estimate';
  const word = estimate ? 'contract value' : 'cap';
  const excess = fmtGBP(flag.indicativeGBP);
  const spendGBP = annual ? flag.breakdown[0].value : cs.spendAgainstCap;
  const spend = fmtGBP(spendGBP);
  const paidLine = annual ? `- Payments in the contract years that went over are ${spend}. That is ${excess} above the ${word}.` : `- Payments to date are ${spend}. That is ${excess} above the ${word}.`;
  if (internal) {
    return {
      subject: `${c.id} ${c.title}: spend is ${excess} above the ${word}`,
      body: join([
        `Hi ${who},`, '',
        `Our contract review flagged the ${c.title} contract (${c.id}, ${c.supplierName}).`, '',
        ...[cite(ev), paidLine].filter(Boolean), '',
        `Can you tell me by ${due}:`,
        `1. Was a variation approved that raised the ${word}?`,
        '2. Was extra work added to the scope?',
        `3. Who approved the payments above the ${word}?`, '',
        'The clause and the payment list are in Kontor.', '',
        ...INTERNAL_CLOSE,
      ]),
    };
  }
  const max = estimate ? 'contract value' : 'maximum';
  const capText = annual ? `${fmtGBP(cs.capGBP)} in any contract year` : fmtGBP(cs.capGBP);
  return {
    subject: `${c.id} ${c.title}: payments above the contract ${estimate ? 'value' : 'maximum'}`,
    body: join([
      `Dear ${who},`, '',
      `We are reviewing the ${c.title} contract (${c.id}).`, '',
      `${ev ? ev.clauseRef : 'The contract'} sets a ${max} of ${capText}. Our records show payments of ${spend}, which is ${excess} above that ${max}.`, '',
      `Please send us by ${due}:`,
      `1. Any variation or change notice that you believe raised the ${max}.`,
      '2. A statement of the invoices paid under this contract.', '',
      ...SUPPLIER_CLOSE,
    ]),
  };
}

/* ---------------------------------------------------------------- close to cap */
function nearCap(flag, c, d, who, due, internal) {
  const ev = evidenceFor(flag);
  const cs = (d && d.cap) || {};
  const word = flag.capSource === 'contract_value' ? 'contract value' : 'cap';
  const pace = cs.basis === 'annual' ? 'the current year' : 'the last 12 months';
  const pct = fmtPct(cs.utilisation, 1);
  const cap = fmtGBP(cs.capGBP);
  if (internal) {
    const forecast = flag.indicativeGBP > 0
      ? `At the pace of ${pace}, spend will pass the ${word} by about ${fmtGBP(flag.indicativeGBP)}.`
      : `At the pace of ${pace}, spend stays within the ${word}, but only just.`;
    return {
      subject: flag.indicativeGBP > 0 ? `${c.id} ${c.title}: spend will pass the ${word}` : `${c.id} ${c.title}: spend is close to the ${word}`,
      body: join([
        `Hi ${who},`, '',
        `The ${c.title} contract (${c.id}, ${c.supplierName}) has used ${pct} of its ${cap} ${word}. ${forecast}`, '',
        ...[cite(ev)].filter(Boolean), ...(ev ? [''] : []),
        `Can we agree by ${due} what to do:`,
        `1. Vary the contract to raise the ${word}.`,
        '2. Reduce or re-scope the work.',
        '3. Start a new procurement.', '',
        ...INTERNAL_CLOSE,
      ]),
    };
  }
  return {
    subject: `${c.id} ${c.title}: forecast of remaining spend`,
    body: join([
      `Dear ${who},`, '',
      `The ${c.title} contract (${c.id}) has used ${pct} of its ${cap} ${word === 'cap' ? 'maximum' : word}. Please send us by ${due} a forecast of the spend still to come under this contract, by month.`, '',
      ...SUPPLIER_CLOSE,
    ]),
  };
}

/* ---------------------------------------------------------------- renewal */
function renewal(flag, c, d, who, due, internal) {
  const ev = evidenceFor(flag);
  const end = fmtDateLong(c.endDate);
  const ended = c.endDate < AS_OF;
  if (internal) {
    const afterEnd = d && d.spend ? d.spend.afterEndGBP : 0;
    const situation = flag.variant === 'out_of_contract' ? `ended on ${end}, but ${fmtGBP(afterEnd)} has been paid since`
      : flag.variant === 'notice_passed' ? `passed its notice date on ${fmtDateLong(flag.actionBy)}, so it may renew on the current terms`
        : `needs a notice decision by ${fmtDateLong(flag.actionBy)}`;
    const annual = flag.breakdown && flag.breakdown[0] ? flag.breakdown[0].value : c.annualValueGBP;
    return {
      subject: `${c.id} ${c.title}: renewal decision needed`,
      body: join([
        `Hi ${who},`, '',
        `The ${c.title} contract (${c.id}, ${c.supplierName}) ${situation}.`, '',
        ...[cite(ev), `- Annual value: ${fmtGBP(annual)}.`].filter(Boolean), '',
        `Can we decide by ${due} whether to:`,
        '1. Extend, and ask for better terms.',
        '2. Let it end and re-procure.',
        '3. Renegotiate now.', '',
        ...INTERNAL_CLOSE,
      ]),
    };
  }
  return {
    subject: `${c.id} ${c.title}: renewal terms`,
    body: join([
      `Dear ${who},`, '',
      `The ${c.title} contract (${c.id}) ${ended ? 'ended' : 'ends'} on ${end}. Before we decide on renewal, please send us by ${due}:`,
      '1. Your proposed rates for any extension.',
      '2. Any improvements you can offer on price or service.', '',
      ...SUPPLIER_CLOSE,
    ]),
  };
}

/* ---------------------------------------------------------------- price increase above the cap */
function uplift(flag, c, d, who, due, internal) {
  const ev = evidenceFor(flag);
  const up = (d && d.uplift) || {};
  const capPct = indexCapText(up.capPct != null ? up.capPct : c.indexation && c.indexation.capPct);
  const excess = fmtGBP(flag.indicativeGBP);
  if (internal) {
    return {
      subject: `${c.id} ${c.title}: price rise above the index cap`,
      body: join([
        `Hi ${who},`, '',
        `The ${c.title} contract (${c.id}, ${c.supplierName}) limits yearly price rises to ${capPct}. Payments in the last 12 months suggest a rise above that limit, about ${excess} more than the contract allows.`, '',
        ...[cite(ev)].filter(Boolean), ...(ev ? [''] : []),
        `Can you send me the invoices behind the rise by ${due}?`, '',
        ...INTERNAL_CLOSE,
      ]),
    };
  }
  return {
    subject: `${c.id} ${c.title}: price increase above the contract cap`,
    body: join([
      `Dear ${who},`, '',
      `${ev ? ev.clauseRef : 'The price review clause'} of the ${c.title} contract (${c.id}) limits yearly price increases to ${capPct}. Our payments show an increase above that limit, about ${excess}.`, '',
      `Please explain the increase by ${due}, and confirm how you will credit any amount above the cap.`, '',
      ...SUPPLIER_CLOSE,
    ]),
  };
}

const BUILDERS = { overCap, nearCap, renewal, uplift };

export function emailFor(flag, contract, derived, recipient, due) {
  const build = BUILDERS[flag && flag.type];
  if (!build || !contract || !recipient) return null;
  const internal = recipient.internal !== false;
  const out = build(flag, contract, derived, firstName(recipient.name), fmtDateLong(due || AS_OF), internal);
  return { to: { name: recipient.name, email: recipient.email }, internal, ...out };
}

/** The text "Copy email" puts on the clipboard. */
export const emailText = (email) => (email ? `Subject: ${email.subject}\n\n${email.body}` : '');
