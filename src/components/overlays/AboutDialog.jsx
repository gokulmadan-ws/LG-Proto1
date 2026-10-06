// V7: "About this data". The kit Dialog (never a native <dialog>), opened by the banner link and the rail Menu.
//
// Contract
//   default export: <AboutDialog open onClose />, mounted ONCE by App.jsx (components/Overlays.jsx), always rendered, returns null while closed.
//   props: open (boolean), onClose () => void. Open it from anywhere with useUI().openAbout(triggerEl?); the banner link does.
//   The kit Dialog traps focus, closes on Esc, on a scrim click, on the x and on "Close dialog", and lib/ui-context.jsx puts focus back on
//   the opener. Title "About this data". "Close dialog" is the one filled button.
//
// Copy is COPY.about in src/lib/copy.js (requirements 7.3 with the blueprint corrections: no ingestion risk, no Transparency Code
// column claim, the Stage 1 data sources). The two links at the end are this file's own words (listed in docs/handoff/V7.md).
import { COPY } from '../../lib/copy.js';
import DS from '../../ui/ds.js';
import { Dialog } from '../../ui/index.js';
import './overlays.css';

const { Button } = DS;

const TEXT = {
  moreLabel: 'More on this',
  method: 'How this is calculated',
  roadmap: 'See what comes next',
};

export default function AboutDialog({ open, onClose }) {
  const close = () => { if (onClose) onClose(); };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={COPY.about.title}
      size="wide"
      className="ovl-about"
      footer={<Button type="button" variant="primary" onClick={close}>{COPY.about.close}</Button>}
    >
      <dl className="ovl-about__list">
        {COPY.about.sections.map((s) => (
          <div key={s.heading} className="ovl-about__item">
            <dt>{s.heading}</dt>
            <dd>{s.body}</dd>
          </div>
        ))}
      </dl>
      <p className="ovl-about__more">
        <span className="ovl-about__morelabel">{TEXT.moreLabel}</span>
        <a className="ovl-link" href="#/method" onClick={close}>{TEXT.method}</a>
        <a className="ovl-link" href="#/roadmap" onClick={close}>{TEXT.roadmap}</a>
      </p>
    </Dialog>
  );
}
