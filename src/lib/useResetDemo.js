// "Reset demo data": one action for the header button and the rail Menu.
// Clears every change made in the demo (reviews, match decisions, hand-checks, feedback, assumptions; the theme stays),
// closes any open panel, returns to the Overview and says what the headline is again. The numbers come from the engine at
// its default settings, never typed, so the toast stays true if the sample data changes.
//   const { reset, changeCount } = useResetDemo();   // reset() is async: it asks first when there is something to lose
import { useCallback } from 'react';
import { useUI } from './ui-context.jsx';
import { useEstate, computeEstate } from './estate.js';
import { navigate } from './router.js';
import { COPY, fmtGBPCompact } from './copy.js';

export function useResetDemo() {
  const ui = useUI();
  const { state, actions } = useEstate();
  const changeCount = Object.keys(state.triage || {}).length + Object.keys(state.decisions || {}).length
    + Object.keys(state.assumptions || {}).length + Object.keys(state.handcheck || {}).length + (state.feedback || []).length;

  const reset = useCallback(async () => {
    const start = computeEstate({});
    const headline = fmtGBPCompact(start.totals.totalGBP);
    const contracts = start.totals.contractCount;
    const goHome = () => {
      ui.closeMenu(); ui.closeSettings(); ui.closeFeedback(); ui.closeAbout(); ui.closeDemoGuide();
      navigate('#/overview');
    };
    if (!changeCount) {
      goHome();
      ui.toast({ tone: 'info', title: 'Already at the starting numbers.', description: `Nothing has changed. The headline is ${headline} across ${contracts} contracts.` });
      return;
    }
    const ok = await ui.confirm({
      title: COPY.resetDialog.title,
      description: COPY.resetDialog.body,
      confirmLabel: COPY.resetDialog.confirm,
      cancelLabel: COPY.resetDialog.cancel,
      destructive: true,
    });
    if (!ok) return;
    actions.resetAll();
    goHome();
    ui.toast({ tone: 'success', title: 'Demo data reset.', description: `The headline is back to ${headline} across ${contracts} contracts. You are on the Overview.` });
  }, [ui, actions, changeCount]);

  return { reset, changeCount };
}
