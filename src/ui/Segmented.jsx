import { useRef } from 'react';

/**
 * Segmented control for switching a VIEW or a FILTER on the page (not for content tabs, not for navigation).
 * role="radiogroup" with a roving tab stop: Tab enters on the selected option, Arrow keys move and select, Home and
 * End jump. Controlled only.
 *
 * @param {object} props
 * @param {{ value: string, label: React.ReactNode, icon?: string, count?: number, disabled?: boolean }[]} props.options
 * @param {string} props.value selected option value
 * @param {(value: string) => void} props.onChange
 * @param {string} props.label accessible name of the group (required: "Show", "Status")
 * @param {'md'|'lg'} [props.size='md'] 32px or 36px tall (44px hit area either way)
 */
export function Segmented({ options, value, onChange, label, size = 'md', className = '' }) {
  const refs = useRef([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const onKey = (e) => {
    const k = e.key;
    let n = null;
    const pos = enabled.indexOf(idx);
    if (k === 'ArrowRight' || k === 'ArrowDown') n = enabled[(pos + 1) % enabled.length];
    else if (k === 'ArrowLeft' || k === 'ArrowUp') n = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (k === 'Home') n = enabled[0];
    else if (k === 'End') n = enabled[enabled.length - 1];
    if (n == null) return;
    e.preventDefault();
    onChange(options[n].value);
    if (refs.current[n]) refs.current[n].focus();
  };
  return (
    <div className={('kx-seg ' + (size === 'lg' ? 'kx-seg--lg ' : '') + className).trim()} role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o, i) => (
        <button key={o.value} type="button" ref={(el) => { refs.current[i] = el; }} role="radio" aria-checked={o.value === value}
          disabled={o.disabled} tabIndex={o.value === value || (!options.some((x) => x.value === value) && i === 0) ? 0 : -1}
          onClick={() => onChange(o.value)}>
          {o.icon && <i className={'fa-solid fa-' + o.icon} aria-hidden="true" />}
          {o.label}
          {o.count != null && <span className="kx-seg__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export default Segmented;
