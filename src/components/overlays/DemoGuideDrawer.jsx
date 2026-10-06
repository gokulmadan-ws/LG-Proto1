// V7: Demo guide. The kit Drawer with the four-step, five-minute demo and the notes for the person presenting it.
//
// Contract
//   default export: <DemoGuideDrawer open onClose />, mounted ONCE by App.jsx. props: open (boolean), onClose () => void.
//   Open with useUI().openDemoGuide(triggerEl?) (Overview "Open demo guide", rail Menu).
//
//   Four steps, each a talking point (live numbers, from COPY.demoSteps(estate)) and a link to the screen it describes: Open overview,
//   Open renewal radar, Open the highways flag (#/opportunities?flag=F-C-005-overCap, which opens the flag drawer), and Give feedback
//   (opens the feedback dialog on top of this drawer, so closing it brings you back here). Following a route link closes the drawer.
//   Then "Also try" (two optional moves) and "Presenter notes": the data is fictional by design, about 62% of contracts carry a flag by
//   design, the 5% renewal rate is a prototype assumption, ingestion is not shown, and the Sefton lesson (COPY.presenterNotes, with one more
//   note in front of them, in this file: the data is fictional by design).
//
// Wording: COPY.demoSteps, COPY.presenterNotes and demoExtras in src/lib/copy.js. Headings and labels the deck lacks are in TEXT (docs/handoff/V7.md).
import { useEstate } from '../../lib/estate.js';
import { useUI } from '../../lib/ui-context.jsx';
import { COPY, demoExtras } from '../../lib/copy.js';
import DS from '../../ui/ds.js';
import { Drawer } from '../../ui/index.js';
import './overlays.css';

const { Button } = DS;

const TEXT = {
  title: 'Demo guide',
  subtitle: 'Four steps, about five minutes, in dark mode',
  steps: 'The four steps',
  extras: 'Also try',
  notes: 'Presenter notes',
  notesHelp: 'For the person running the demo.',
  // The deck's presenter notes (COPY.presenterNotes) do not say the data is fictional; this does, first, because it frames every other note.
  fictionalNote: 'The data is fictional by design. Marchbank Borough Council, its suppliers, contracts and payments were written for this demo, and the banner on every screen says so.',
  close: 'Close demo guide',
};

export default function DemoGuideDrawer({ open, onClose }) {
  const { estate } = useEstate();
  const ui = useUI();
  const close = () => { if (onClose) onClose(); };
  const steps = COPY.demoSteps(estate);
  const notes = [TEXT.fictionalNote, ...COPY.presenterNotes(estate)];

  return (
    <Drawer
      open={open}
      onClose={close}
      title={TEXT.title}
      subtitle={TEXT.subtitle}
      size="md"
      className="ovl-guide"
      footer={(
        <>
          <a className="ovl-link ovl-link--go" href="#/guide" onClick={close} style={{ marginRight: 'auto', alignSelf: 'center' }}>Open the full guide<i className="fa-solid fa-arrow-right" aria-hidden="true" /></a>
          <Button type="button" variant="outline" onClick={close}>{TEXT.close}</Button>
        </>
      )}
    >
      <section aria-labelledby="ovl-dg-steps">
        <h3 className="ovl-h3 ovl-sr" id="ovl-dg-steps">{TEXT.steps}</h3>
        <ol className="ovl-steps">
          {steps.map((s) => (
            <li key={s.n} className="ovl-step">
              <span className="ovl-step__n" aria-hidden="true">{s.n}</span>
              <div className="ovl-step__body">
                <h4 className="ovl-h4">{s.title}</h4>
                <p className="ovl-text">{s.text}</p>
                {s.link.href ? (
                  <a className="ovl-link ovl-link--go" href={s.link.href} onClick={close}>{s.link.label}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></a>
                ) : (
                  <button type="button" className="ovl-link ovl-link--go" onClick={(e) => ui.openFeedback(e.currentTarget)}>{s.link.label}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ovl-section" aria-labelledby="ovl-dg-extras">
        <h3 className="ovl-h3" id="ovl-dg-extras">{TEXT.extras}</h3>
        <ul className="ovl-bullets">
          {demoExtras.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>

      <section className="ovl-section ovl-notes" aria-labelledby="ovl-dg-notes">
        <div className="ovl-notes__head">
          <h3 className="ovl-h3" id="ovl-dg-notes"><i className="fa-solid fa-clipboard-list" aria-hidden="true" />{TEXT.notes}</h3>
          <p className="ovl-help">{TEXT.notesHelp}</p>
        </div>
        <ul className="ovl-bullets">
          {notes.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
    </Drawer>
  );
}
