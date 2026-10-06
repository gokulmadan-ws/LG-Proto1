// STUB (A1). V7 replaces this file. Copy: docs/blueprint.md section 1 item 8 and R/requirements.md 7.3.
//
// Contract
//   default export: <AboutDialog open onClose />, mounted ONCE by App.jsx, always rendered, returns null while closed.
//   props: open (boolean), onClose () => void. Open it from anywhere with useUI().openAbout(triggerEl?); the banner link does.
//   Must trap focus, close on Esc and on its "Close dialog" button, and call onClose. Focus returns to the trigger
//   (lib/ui-context.jsx restores it after onClose, so the dialog does not have to). Title "About this data". One primary button max.
import { StubOverlay } from './_StubOverlay.jsx';

export default function AboutDialog({ open, onClose }) {
  return <StubOverlay open={open} onClose={onClose} title="About this data" owner="V7" />;
}
