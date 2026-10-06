// Theme state lives in src/lib/theme.js (data-theme on <html>, key kontor-theme, default dark). Re-exported so the
// shell and old imports keep one place to look.
import { useTheme, getTheme, setTheme, toggleTheme, THEME_KEY } from '../lib/theme.js';

export { useTheme, getTheme, setTheme, toggleTheme, THEME_KEY };

/**
 * 32px circular header button. The icon shows the CURRENT mode (moon in dark, sun in light) and aria-pressed says
 * whether dark mode is on. The accessible name is constant ("Dark mode") so a screen reader does not announce a
 * changed label and a changed state; the DS tooltip tells sighted users what the click does.
 * Real <button>: Enter and Space both toggle.
 */
export function ThemeToggle({ Tip }) {
  const [theme] = useTheme();
  const dark = theme === 'dark';
  const btn = (
    <button
      type="button"
      className="shell__circle shell__theme-toggle"
      aria-label="Dark mode"
      aria-pressed={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <i className={dark ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} aria-hidden="true" />
    </button>
  );
  return Tip ? <Tip label={dark ? 'Switch to light mode' : 'Switch to dark mode'} side="bottom">{btn}</Tip> : btn;
}
