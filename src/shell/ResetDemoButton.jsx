// The header button that puts the demo back to its starting numbers. A labelled pill on wide screens, an icon on narrower ones,
// and the rail Menu item covers phones. A small dot shows when there is something to reset.
import { useResetDemo } from '../lib/useResetDemo.js';

export function ResetDemoButton() {
  const { reset, changeCount } = useResetDemo();
  const label = 'Reset demo data';
  return (
    <span className="shell__slot shell__slot--optional">
      <button
        type="button"
        className={'shell__reset' + (changeCount ? ' has-changes' : '')}
        aria-label={changeCount ? `${label}. You have ${changeCount} ${changeCount === 1 ? 'change' : 'changes'}.` : label}
        title={label}
        onClick={reset}
      >
        <i className="fa-solid fa-rotate-left" aria-hidden="true" />
        <span className="shell__reset-label">{label}</span>
      </button>
    </span>
  );
}
