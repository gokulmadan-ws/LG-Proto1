// STUB (A1). V7 replaces this file. Spec: docs/blueprint.md section 5 "Overlays".
//
// Contract
//   default export: <SettingsDrawer open onClose />, mounted ONCE by App.jsx. props: open (boolean), onClose () => void.
//   Opened by the header gear (useUI().openSettings(triggerEl?)). Contents: Assumptions (renewal rate, near-cap threshold,
//   via useEstate().actions.setAssumption), Theme switch (useTheme() from lib/theme.js), Reset demo changes
//   (await useUI().confirm({ title: 'Reset your changes?', description, confirmLabel: 'Reset changes', destructive: true }),
//   then actions.resetAll() and a toast). Trap focus, Esc closes.
import { StubOverlay } from './_StubOverlay.jsx';

export default function SettingsDrawer({ open, onClose }) {
  return <StubOverlay open={open} onClose={onClose} title="Settings" variant="drawer" owner="V7" />;
}
