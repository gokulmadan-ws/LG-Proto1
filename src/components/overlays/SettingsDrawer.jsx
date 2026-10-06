// V7: Settings. The kit Drawer opened by the header gear (desktop; the gear is hidden under 700px).
//
// Contract
//   default export: <SettingsDrawer open onClose />, mounted ONCE by App.jsx, always rendered, returns null while closed.
//   props: open (boolean), onClose () => void. Open with useUI().openSettings(triggerEl?).
//
//   Assumptions: the renewal rate (3%, 5% default, 8%) and the close to cap threshold (80%, 85% default, 90%), under the banner
//   "Changing assumptions changes every indicative figure." A choice applies at once (useEstate().actions.setAssumption, persisted), so the
//   Overview headline moves while you watch: at 8% the headline is £6.8m. The drawer prints the headline as it now stands.
//   Appearance: a "Dark mode" switch bound to the same state as the header toggle (lib/theme.js, key kontor-theme).
//   Reset demo changes: opens the kit confirm dialog (destructive, Cancel focused). Confirm clears reviews, match decisions, hand-checks,
//   feedback and assumptions (actions.resetAll, the theme stays), then toasts "Changes reset. The demo is back to its starting numbers."
//   Cancel changes nothing.
//
// The confirm is useUI().confirm(): the kit ConfirmDialog drawn by ConfirmHost, stacked above this drawer; Escape closes only the top layer.
// Wording is COPY.settings and COPY.resetDialog and COPY.toasts in src/lib/copy.js. The labels the deck lacks are in TEXT (docs/handoff/V7.md).
import { useEstate, ASSUMPTION_OPTIONS } from '../../lib/estate.js';
import { DEFAULTS } from '../../lib/engine.js';
import { useUI } from '../../lib/ui-context.jsx';
import { useTheme } from '../../lib/theme.js';
import { COPY, fmtPct, headlineSentence } from '../../lib/copy.js';
import { plural } from '../../lib/format.js';
import DS from '../../ui/ds.js';
import { Drawer, Pill, Segmented, SwitchField } from '../../ui/index.js';
import './overlays.css';

const { Button } = DS;

const TEXT = {
  title: 'Settings',
  subtitle: 'Assumptions, appearance and the demo reset',
  assumptions: 'Assumptions',
  renewalHelp: "The share of a contract's annual value used as the indicative value of a renewal decision.",
  nearCapHelp: 'Spend from this share of the cap up to the cap itself counts as close to cap.',
  notes: {
    renewalRate: { 0.05: '5% is a prototype assumption.', 0.08: 'The Local Government Association reported 8% for Sheffield in 2012/13.', 0.03: 'More cautious than the default of 5%.' },
    nearCapThreshold: { 0.8: 'More contracts count as close to cap than at the default of 85%.', 0.9: 'Fewer contracts count as close to cap than at the default of 85%.' },
  },
  isDefault: 'Default',
  isChanged: 'Changed',
  headlineNow: 'Indicative headline now',
  appearance: 'Appearance',
  darkMode: 'Dark mode',
  darkHelp: 'Same setting as the toggle in the header. Dark is the default.',
  reset: 'Reset',
  resetHelp: 'Clears your reviews, match decisions, hand-checks, feedback and assumptions on this device. The theme stays.',
  nothing: 'Nothing has been changed yet.',
  changed: (n) => `Changed on this device: ${n.join(', ')}.`,
  close: 'Close settings',
};

const pct = (v) => fmtPct(v, 0);

export default function SettingsDrawer({ open, onClose }) {
  const { estate, state, actions } = useEstate();
  const ui = useUI();
  const [theme, setTheme] = useTheme();
  const close = () => { if (onClose) onClose(); };

  const options = (key) => ASSUMPTION_OPTIONS[key].map((v) => ({ value: String(v), label: pct(v) }));
  const choose = (key) => (value) => actions.setAssumption(key, Number(value));
  // One short paragraph under each control: what the setting does, and (when it is not the default) how the choice differs from it.
  const helpFor = (key, v) => [key === 'renewalRate' ? TEXT.renewalHelp : TEXT.nearCapHelp, (TEXT.notes[key] && TEXT.notes[key][v]) || ''].filter(Boolean).join(' ');
  const isDefault = (key) => Math.abs(estate.opts[key] - DEFAULTS[key]) < 1e-9;

  const resetAll = async () => {
    const ok = await ui.confirm({
      title: COPY.resetDialog.title,
      description: COPY.resetDialog.body,
      confirmLabel: COPY.resetDialog.confirm,
      cancelLabel: COPY.resetDialog.cancel,
      destructive: true,
    });
    if (!ok) return;
    actions.resetAll();
    const [what, ...rest] = COPY.toasts.resetDone.split(/(?<=\.)\s+/);        // 'Changes reset.' and what it means
    ui.toast({ tone: 'success', title: what, description: rest.join(' ') });
  };

  // What there is to reset, counted from the saved state (so the line is true after a reload too).
  const counts = [
    [Object.keys(state.triage).length, 'review'],
    [Object.keys(state.decisions).length, 'match decision'],
    [Object.keys(state.handcheck).length, 'hand-check'],
    [state.feedback.length, 'feedback entry', 'feedback entries'],
    [Object.keys(state.assumptions).length, 'assumption'],
  ].filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));

  return (
    <Drawer
      open={open}
      onClose={close}
      title={TEXT.title}
      subtitle={TEXT.subtitle}
      size="md"
      className="ovl-settings"
      footer={<Button type="button" variant="primary" onClick={close}>{TEXT.close}</Button>}
    >
      <section className="ovl-section" aria-labelledby="ovl-set-assump">
        <h3 className="ovl-h3" id="ovl-set-assump">{TEXT.assumptions}</h3>
        <p className="ovl-banner" role="note"><i className="fa-solid fa-circle-info" aria-hidden="true" /><span>{COPY.settings.assumptionsBanner}</span></p>

        {[['renewalRate', COPY.settings.renewalRate], ['nearCapThreshold', COPY.settings.nearCap]].map(([key, label]) => (
          <div className="ovl-group" key={key}>
            <div className="ovl-group__head">
              <p className="ovl-label" aria-hidden="true">{label}</p>
              {isDefault(key) ? <Pill tone="neutral" size="sm">{TEXT.isDefault}</Pill> : <Pill tone="info" size="sm" icon="pen">{TEXT.isChanged}</Pill>}
            </div>
            <Segmented label={label} size="lg" value={String(estate.opts[key])} onChange={choose(key)} options={options(key)} />
            <p className="ovl-help">{helpFor(key, estate.opts[key])}</p>
          </div>
        ))}

        <p className="ovl-now" role="status">
          <span className="ovl-now__label">{TEXT.headlineNow}</span>
          <span className="ovl-now__value">{headlineSentence(estate.totals)}</span>
        </p>
      </section>

      <section className="ovl-section" aria-labelledby="ovl-set-look">
        <h3 className="ovl-h3" id="ovl-set-look">{TEXT.appearance}</h3>
        <SwitchField checked={theme === 'dark'} onChange={(on) => setTheme(on ? 'dark' : 'light')} label={TEXT.darkMode} description={TEXT.darkHelp} />
      </section>

      <section className="ovl-section" aria-labelledby="ovl-set-reset">
        <h3 className="ovl-h3" id="ovl-set-reset">{TEXT.reset}</h3>
        <p className="ovl-text">{TEXT.resetHelp}</p>
        <p className="ovl-help ovl-changed">{counts.length ? TEXT.changed(counts) : TEXT.nothing}</p>
        <div>
          <Button type="button" variant="outline" leftIcon="rotate-left" onClick={resetAll}>{COPY.settings.reset}</Button>
        </div>
      </section>
    </Drawer>
  );
}
