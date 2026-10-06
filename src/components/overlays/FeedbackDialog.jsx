// STUB (A1). V7 replaces this file. Copy: R/requirements.md 7.9 "Feedback dialog".
//
// Contract
//   default export: <FeedbackDialog open onClose />, mounted ONCE by App.jsx. props: open (boolean), onClose () => void.
//   Open with useUI().openFeedback(triggerEl?). Saves with addFeedback() from useEstate().actions and confirms with
//   useUI().toast({ tone: 'success', title: 'Feedback saved on this device. Thank you.' }) then calls onClose.
//   Title "Tell us what you think". Trap focus, close on Esc and "Cancel".
import { StubOverlay } from './_StubOverlay.jsx';

export default function FeedbackDialog({ open, onClose }) {
  return <StubOverlay open={open} onClose={onClose} title="Tell us what you think" owner="V7" />;
}
