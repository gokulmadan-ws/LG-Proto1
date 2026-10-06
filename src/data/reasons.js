// "Reasons this may not be a saving": the Sefton lesson made concrete, one short list per flag type (blueprint decision 1, domain brief 5.6).
// Cautionary on purpose. No numbers, no notice-type codes, nothing that cannot be defended in front of a council contact.
// The heading is the one place outside the caveat, Method, Evidence and Roadmap where the word "saving" is allowed (blueprint section 5).
//
//   import { REASONS_HEADING, reasonsFor } from '../data/reasons.js';
//   const { heading, intro, items } = reasonsFor(flag);          // flag from estate.ranked / estate.flags
//   items: [{ id, text }]   render as a plain list under the heading in the flag drawer
//   reasonsFor('noContract') also works with a key, for the No contract on register tab.
//
// Keys: overCap, aboveEstimate (cap is a contract value, not a stated maximum), nearCap, uplift, renewal, noticePassed, outOfContract, noContract.

export const REASONS_HEADING = 'Reasons this may not be a saving';
export const REASONS_INTRO = 'Check these before you act. Any one of them can reduce an opportunity to nothing.';

export const reasons = {
  overCap: [
    { id: 'variation', text: 'A variation or change control note may have raised the cap. Look for one in the contract file before you treat the spend as unauthorised.' },
    { id: 'scope', text: 'Work may have been added to the scope, with the extra spend approved outside the contract documents you hold.' },
    { id: 'pass-through', text: 'Pass-through costs, such as agency or energy charges, may sit outside the cap. A cap is often set on the managed-service fee only.' },
    { id: 'files', text: 'The payment files may include VAT, credit notes or re-bills that distort the total. This prototype uses figures net of irrecoverable VAT, so check how your own files are built.' },
    { id: 'match', text: 'The supplier name match may be wrong. Open the matches tab to see how each payee was linked to a contract.' },
  ],
  aboveEstimate: [
    { id: 'estimate', text: 'The contract value is an estimate for budgeting. Spending more than an estimate is not a breach unless the contract also states a maximum.' },
    { id: 'maximum', text: 'Check the clause for a maximum, a call-off limit or a framework ceiling that this answer may have missed.' },
    { id: 'scope', text: 'Work may have been added to the scope, with the extra spend approved outside the contract documents you hold.' },
    { id: 'pass-through', text: 'Pass-through costs, such as agency or energy charges, may sit outside the value of the contract.' },
    { id: 'match', text: 'The supplier name match may be wrong. Open the matches tab to see how each payee was linked to a contract.' },
  ],
  nearCap: [
    { id: 'pace', text: 'Spend may not continue at the pace of the last 12 months. Seasonal work, a one-off project or a change in volume would change the projection.' },
    { id: 'ends', text: 'The contract may end, be varied or be re-procured before the cap is reached.' },
    { id: 'variation', text: 'A variation may already have raised the cap.' },
    { id: 'timing', text: 'The projection counts payments, not liabilities. Payments can lag the work they pay for.' },
  ],
  uplift: [
    { id: 'volume', text: 'Volumes or service levels may have grown. A rise in payments is not always a rise in price.' },
    { id: 'pay-award', text: 'A pay award or minimum wage clause may allow an increase above the index cap.' },
    { id: 'agreed', text: 'The council may have agreed the increase, or the supplier may have claimed it under a different clause.' },
    { id: 'timing', text: 'Payment dates lag invoice dates, so one 12-month window can hold a different number of invoices from the one before.' },
  ],
  renewal: [
    { id: 'market', text: 'The contract may already be priced at or near the market rate. A Local Government Association case study found that potential savings shrank once outliers were tested.' },
    { id: 'conditional', text: 'The option to extend may depend on supplier performance. Check the clause before you assume you can choose.' },
    { id: 'reprocure', text: 'Re-procuring takes time and can bring staff transfer obligations under TUPE.' },
    { id: 'assumption', text: 'The indicative value applies a prototype assumption for the renewal rate, which you can change in Settings. Your own cost baseline may be lower or higher.' },
  ],
  noticePassed: [
    { id: 'handled', text: 'A side letter or a delegated decision may already have dealt with the renewal. Check with the contract owner before you assume it renews unchanged.' },
    { id: 'market', text: 'The contract may already be priced at or near the market rate. A Local Government Association case study found that potential savings shrank once outliers were tested.' },
    { id: 'reprocure', text: 'Re-procuring takes time and can bring staff transfer obligations under TUPE.' },
    { id: 'assumption', text: 'The indicative value applies a prototype assumption for the renewal rate, which you can change in Settings. Your own cost baseline may be lower or higher.' },
  ],
  outOfContract: [
    { id: 'side-letter', text: 'A side letter or a delegated decision may extend the contract. Look for one before you treat the payments as unauthorised.' },
    { id: 'newer', text: 'The payments may belong to a different, newer contract with the same supplier that is not on the register.' },
    { id: 'match', text: 'The supplier name match may be wrong. Open the matches tab to see how each payee was linked to a contract.' },
  ],
  noContract: [
    { id: 'elsewhere', text: 'A framework call-off, individual placement agreements or a spot purchase may be recorded somewhere other than your contracts register.' },
    { id: 'threshold', text: 'The spend may fall below the threshold for publishing a contract, so the register holds no document for it.' },
    { id: 'name', text: "The payee name may differ from the supplier's name on a contract that is on the register." },
  ],
};

/** Which list applies to a flag. Accepts a flag object or one of the keys above. */
export function reasonKey(flagOrKey) {
  if (typeof flagOrKey === 'string') return reasons[flagOrKey] ? flagOrKey : 'overCap';
  const f = flagOrKey || {};
  if (f.type === 'overCap') return f.capState === 'above_estimate' ? 'aboveEstimate' : 'overCap';
  if (f.type === 'renewal') return f.variant === 'out_of_contract' ? 'outOfContract' : f.variant === 'notice_passed' ? 'noticePassed' : 'renewal';
  return reasons[f.type] ? f.type : 'overCap';
}

/** { heading, intro, items } for the flag drawer. */
export function reasonsFor(flagOrKey) {
  return { heading: REASONS_HEADING, intro: REASONS_INTRO, items: reasons[reasonKey(flagOrKey)] };
}

export default reasons;
