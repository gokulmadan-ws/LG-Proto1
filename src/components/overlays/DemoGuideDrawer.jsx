// STUB (A1). V7 replaces this file. Copy: R/requirements.md 7.8 plus the "Presenter notes" section in docs/blueprint.md section 5.
//
// Contract
//   default export: <DemoGuideDrawer open onClose />, mounted ONCE by App.jsx. props: open (boolean), onClose () => void.
//   Open with useUI().openDemoGuide(triggerEl?) (Overview "Open demo guide", Menu). Four steps with links (use hrefFor and
//   call onClose when a link navigates). Trap focus, Esc closes.
import { StubOverlay } from './_StubOverlay.jsx';

export default function DemoGuideDrawer({ open, onClose }) {
  return <StubOverlay open={open} onClose={onClose} title="Demo guide" variant="drawer" owner="V7" />;
}
