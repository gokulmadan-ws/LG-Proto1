// The action tracker's user-facing commands, shared by the drawer (review status, Action tab) and the Actions board, so the same change
// always says the same thing. Each command runs one transition from src/lib/actions.js through the estate provider and toasts what it
// did. The numbers in a toast (the headline, Value secured) are worked out from the same pure functions before the change is saved.
//
//   const cmd = useActionCommands();
//   cmd.start(flag)                      Under review / "Start action": "{contract}: added to Actions." + "Open in Actions"
//   cmd.archive(flag)                    To investigate: the card leaves the board
//   cmd.close(flag, { outcome, cashRecoveredGBP, costAvoidedGBP, closeNote })   "closed as Resolved. Value secured is now £353,100."
//   cmd.move(flag, stage)                between open stages (silent, it is logged), or a closed card back to an open stage (toast)
//   openInActions(flagId)                #/actions with that card highlighted
import { useEstate, computeEstate } from '../lib/estate.js';
import { useUI } from '../lib/ui-context.jsx';
import { navigate } from '../lib/router.js';
import { fmtGBPCompact, triageToast } from '../lib/copy.js';
import { ACT } from '../lib/actions-copy.js';
import * as A from '../lib/actions.js';

export const openInActions = (flagId) => navigate('#/actions?card=' + encodeURIComponent(flagId));

export function useActionCommands() {
  const { estate, state, actions } = useEstate();
  const ui = useUI();
  const cur = { triage: state.triage, actions: state.actions || {} };
  const totalsAfter = (triage) => computeEstate({ decisions: state.decisions, assumptions: state.assumptions, triage }).totals;
  const titleOf = (flag) => (estate.contractsById[flag.contractId] || {}).title || flag.contractId;

  return {
    start(flag) {
      const out = A.startAction(cur, flag, '');
      const after = totalsAfter(out.triage);
      actions.startAction(flag);
      ui.toast({
        tone: 'success', title: ACT.toast.added(titleOf(flag)),
        description: ACT.toast.addedDesc(fmtGBPCompact(after.totalGBP), after.totalGBP !== estate.totals.totalGBP, !!out.actions[flag.id].owner),
        action: { label: ACT.toast.open, onClick: () => openInActions(flag.id) },
      });
    },
    archive(flag) {
      const had = A.activeAction(cur.actions, flag.id);
      const out = A.setStatus(cur, flag, 'to_investigate', '');
      const after = totalsAfter(out.triage);
      actions.setStatus(flag, 'to_investigate');
      if (had) ui.toast({ tone: 'success', title: ACT.toast.archived(titleOf(flag)), description: ACT.toast.archivedDesc(fmtGBPCompact(after.totalGBP)) });
      else {
        const [title, ...rest] = triageToast(estate.contractsById[flag.contractId], 'to_investigate', after).split(/(?<=\.)\s+/);
        ui.toast({ tone: 'success', title, description: rest.join(' ') });
      }
    },
    close(flag, input) {
      const out = A.closeAction(cur, flag, input, '');
      if (out === cur) return;
      const after = totalsAfter(out.triage);
      actions.closeAction(flag, input);
      const description = input.outcome === 'resolved'
        ? ACT.toast.valueNow(A.resultsOf(out.actions).valueSecuredGBP)
        : ACT.toast.headlineNow(fmtGBPCompact(after.totalGBP));
      ui.toast({ tone: 'success', title: ACT.toast.closed(titleOf(flag), input.outcome), description });
    },
    move(flag, stage) {
      const a = cur.actions[flag.id];
      if (!a || a.stage === stage) return;
      const wasClosed = a.stage === 'closed';
      actions.moveAction(flag, stage);
      if (wasClosed) {
        const out = A.moveAction(cur, flag, stage, '');
        ui.toast({ tone: 'success', title: ACT.toast.reopened(titleOf(flag), stage), description: ACT.toast.headlineNow(fmtGBPCompact(totalsAfter(out.triage).totalGBP)) });
      }
    },
  };
}

export default useActionCommands;
