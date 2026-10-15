// Next steps for an action, by flag type (build spec section 6.3). Renewal variants share the renewal list.
// They turn "Reasons this may not be a saving" into things to do. "Next step" on a board card = the first step not ticked.
//
//   stepsFor(flagOrType)        [{ id, text, hint? }]
//   nextStep(flagOrType, ticked) the first step whose id is not in `ticked` ({ [stepId]: true }), or null when all are done

export const STEPS = {
  overCap: [
    { id: 'oc-variation', text: 'Check the contract file for a variation or change notice.' },
    { id: 'oc-owner', text: 'Ask the contract owner if the extra spend was approved.' },
    { id: 'oc-finance', text: 'Ask finance to confirm the payment total.', hint: 'Payment files can include VAT, credit notes or re-bills.' },
    { id: 'oc-supplier', text: 'If no approval is found, raise it with the supplier.' },
    { id: 'oc-record', text: 'Record the outcome and close the action.' },
  ],
  nearCap: [
    { id: 'nc-tell', text: 'Tell the budget holder the cap will be reached.' },
    { id: 'nc-variation', text: 'Find out if a variation is planned.' },
    { id: 'nc-decide', text: 'Decide: vary the contract, reduce the work or re-procure.' },
    { id: 'nc-record', text: 'Record the decision and close the action.' },
  ],
  renewal: [
    { id: 'rn-notice', text: 'Confirm the notice date and terms in the contract.' },
    { id: 'rn-owner', text: 'Ask the contract owner: extend, renegotiate or re-procure?' },
    { id: 'rn-price', text: 'Check the current price against the market or a framework.' },
    { id: 'rn-supplier', text: 'Ask the supplier for renewal terms before the notice date.' },
    { id: 'rn-record', text: 'Record the decision and close the action.' },
  ],
  uplift: [
    { id: 'up-clause', text: 'Check the indexation clause and the index figure for the year.' },
    { id: 'up-invoices', text: 'Ask finance for the invoices behind the rise.' },
    { id: 'up-supplier', text: 'Ask the supplier to explain the increase.' },
    { id: 'up-credit', text: 'Agree a credit or a price correction.' },
    { id: 'up-record', text: 'Record the outcome and close the action.' },
  ],
};

const typeOf = (flagOrType) => (typeof flagOrType === 'string' ? flagOrType : flagOrType && (flagOrType.type || flagOrType.flagType));

export const stepsFor = (flagOrType) => STEPS[typeOf(flagOrType)] || [];
export const ALL_STEP_IDS = new Set(Object.values(STEPS).flat().map((s) => s.id));

export function nextStep(flagOrType, ticked = {}) {
  return stepsFor(flagOrType).find((s) => !ticked[s.id]) || null;
}
