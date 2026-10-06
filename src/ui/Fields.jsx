import { cloneElement, isValidElement, useEffect, useId, useRef } from 'react';

/**
 * Checkbox on a native <input type="checkbox">: reachable with Tab, Space toggles, the label text is clickable and the
 * whole row is a 44px target. Replaces the DS Checkbox, which is a span (no keyboard, 18px hit area).
 * Controlled. For "select all" pass `indeterminate` when some rows are selected.
 *
 * @param {object} props
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange receives the new boolean
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} [props.description] muted help under the label (linked with aria-describedby)
 * @param {boolean} [props.indeterminate]
 * @param {boolean} [props.disabled]
 * @param {string} [props.name]
 * @param {boolean} [props.hideLabel] keep the label for screen readers only (table row checkboxes: say what the row is)
 */
export function Check({ checked, indeterminate, onChange, label, description, disabled, hideLabel, className = '', ...rest }) {
  const ref = useRef(null);
  const did = useId();
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <div className={('kx-fieldrow ' + className).trim()}>
      <label className={'kx-field' + (disabled ? ' kx-field--disabled' : '')}>
        <input ref={ref} type="checkbox" checked={!!checked} disabled={disabled} aria-describedby={description ? did : undefined}
          onChange={(e) => onChange && onChange(e.target.checked)} {...rest} />
        <span className="kx-box" aria-hidden="true">{indeterminate ? <i className="fa-solid fa-minus" /> : checked ? <i className="fa-solid fa-check" /> : null}</span>
        {hideLabel ? <span className="kx-sr-only">{label}</span> : label}
      </label>
      {description && <p className="kx-field__desc" id={did}>{description}</p>}
    </div>
  );
}

/**
 * One radio on a native <input type="radio">. Radios with the same `name` form a group: one Tab stop, Arrow keys
 * move and select. Wrap them in RadioGroup (a fieldset with a legend) so the group has a name.
 *
 * @param {object} props
 * @param {boolean} props.checked
 * @param {(value: string) => void} props.onChange receives `value`
 * @param {string} props.value
 * @param {string} props.name shared by the group
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} [props.description]
 * @param {boolean} [props.disabled]
 */
export function RadioField({ checked, onChange, label, description, disabled, name, value, className = '', ...rest }) {
  const did = useId();
  return (
    <div className={('kx-fieldrow ' + className).trim()}>
      <label className={'kx-field' + (disabled ? ' kx-field--disabled' : '')}>
        <input type="radio" name={name} value={value} checked={!!checked} disabled={disabled} aria-describedby={description ? did : undefined}
          onChange={() => onChange && onChange(value)} {...rest} />
        <span className="kx-box kx-box--radio" aria-hidden="true" />
        {label}
      </label>
      {description && <p className="kx-field__desc" id={did}>{description}</p>}
    </div>
  );
}

/**
 * Switch on a native checkbox with role="switch". The OFF track uses the AA control border colour, so it stays visible
 * in light mode (the DS Switch OFF state is 1.2:1 there). Use it for settings that apply immediately.
 *
 * @param {object} props
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} [props.description]
 * @param {boolean} [props.disabled]
 */
export function SwitchField({ checked, onChange, label, description, disabled, className = '', ...rest }) {
  const did = useId();
  return (
    <div className={('kx-fieldrow ' + className).trim()}>
      <label className={'kx-field' + (disabled ? ' kx-field--disabled' : '')}>
        <input type="checkbox" role="switch" checked={!!checked} disabled={disabled} aria-describedby={description ? did : undefined}
          onChange={(e) => onChange && onChange(e.target.checked)} {...rest} />
        <span className="kx-track" aria-hidden="true" />
        {label}
      </label>
      {description && <p className="kx-field__desc" id={did}>{description}</p>}
    </div>
  );
}

/**
 * A named group of RadioFields (fieldset + legend).
 *
 * @param {object} props
 * @param {React.ReactNode} props.legend the question ("Renewal rate")
 * @param {{ value: string, label: React.ReactNode, description?: React.ReactNode, disabled?: boolean }[]} props.options
 * @param {string} props.value selected value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.name] defaults to a generated id
 * @param {boolean} [props.inline=false] lay the options out in a row
 * @param {boolean} [props.hideLegend=false] legend for screen readers only (when a heading already says it)
 */
export function RadioGroup({ legend, options, value, onChange, name, inline = false, hideLegend = false, className = '' }) {
  const uid = useId();
  return (
    <fieldset className={('kx-radiogroup ' + (inline ? 'is-inline ' : '') + className).trim()}>
      <legend className={hideLegend ? 'kx-sr-only' : 'kx-radiogroup__legend'}>{legend}</legend>
      <div className="kx-radiogroup__opts">
        {options.map((o) => <RadioField key={o.value} name={name || uid} value={o.value} checked={value === o.value} onChange={onChange} label={o.label} description={o.description} disabled={o.disabled} />)}
      </div>
    </fieldset>
  );
}

/**
 * Label, help text and error message around ONE control (DS Input, Select, Textarea or a native element).
 * Wires `id`, aria-describedby and aria-invalid for you. Errors follow [What] + [Why] + [How]:
 * "Search failed. The supplier list did not load. Refresh the page and try again."
 *
 * Children is either an element (it receives id, aria-describedby, aria-invalid and `error` for DS controls) or a
 * function receiving that object: {(p) => <Input {...p} value={q} onChange={...} />}
 *
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} [props.help] muted help under the control
 * @param {React.ReactNode} [props.error] error text; also sets the control's invalid state
 * @param {boolean} [props.required] adds "(required)" after the label
 * @param {boolean} [props.optional] adds "(optional)" after the label
 * @param {boolean} [props.hideLabel] label for screen readers only
 * @param {string} [props.id] control id; generated when omitted
 */
export function Field({ label, help, error, required, optional, hideLabel, id, children, className = '' }) {
  const uid = useId();
  const fid = id || uid + '-f';
  const hid = uid + '-h';
  const eid = uid + '-e';
  const props = {
    id: fid,
    'aria-describedby': [help ? hid : null, error ? eid : null].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : undefined,
  };
  let control;
  if (typeof children === 'function') control = children({ ...props, error: !!error });
  else if (isValidElement(children)) control = cloneElement(children, typeof children.type === 'string' ? props : { ...props, error: !!error });
  else control = children;
  return (
    <div className={('kx-fieldwrap ' + className).trim()}>
      <label htmlFor={fid} className={hideLabel ? 'kx-sr-only' : 'ds-label kx-fieldwrap__label'}>
        {label}
        {required && <span className="kx-fieldwrap__req"> (required)</span>}
        {optional && <span className="kx-fieldwrap__req"> (optional)</span>}
      </label>
      {control}
      {help && <p className="kx-fieldwrap__help" id={hid}>{help}</p>}
      {error && <p className="kx-fieldwrap__error" id={eid}><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
    </div>
  );
}

export default Check;
