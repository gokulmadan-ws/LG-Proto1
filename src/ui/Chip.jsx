/**
 * Filter chip: a toggle button (aria-pressed) with an optional glyph and count. 32px tall with a 44px hit area.
 * Use for filters on a list ("Spend over cap 3"). For choosing between views use Segmented.
 *
 * @param {object} props
 * @param {boolean} props.pressed
 * @param {() => void} props.onClick
 * @param {string} [props.icon] FA solid name
 * @param {number|string} [props.count] shown after the label, muted
 * @param {React.ReactNode} props.children label
 */
export function Chip({ pressed = false, onClick, icon, count, children, className = '', ...rest }) {
  return (
    <button type="button" className={('kx-chip ' + className).trim()} aria-pressed={pressed} onClick={onClick} {...rest}>
      {icon && <i className={'fa-solid fa-' + icon} aria-hidden="true" />}
      {children}
      {count != null && <span className="kx-chip__count">{count}</span>}
    </button>
  );
}

/**
 * Static tag, or a removable tag when `onRemove` is set. The remove button needs a specific accessible name:
 * pass removeLabel ("Remove filter: waste"). The DS Badge cannot do this (its remove button is always "Remove").
 *
 * @param {object} props
 * @param {() => void} [props.onRemove]
 * @param {string} [props.removeLabel]
 * @param {React.ReactNode} props.children
 */
export function Tag({ onRemove, removeLabel, children, className = '' }) {
  return (
    <span className={('kx-tag ' + className).trim()}>
      {children}
      {onRemove && (
        <button type="button" className="kx-tag__x kx-hit" aria-label={removeLabel || 'Remove'} onClick={onRemove}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export default Chip;
