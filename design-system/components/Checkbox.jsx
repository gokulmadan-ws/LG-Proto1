// Checkbox — controlled, supports indeterminate + label.
export function Checkbox({
  checked = false, indeterminate = false, disabled = false,
  label, onChange, className, style, ...rest
}) {
  const on = checked || indeterminate;
  return (
    <label className={className} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-1)", userSelect: "none", ...style,
    }} {...rest}>
      <span
        role="checkbox" aria-checked={indeterminate ? "mixed" : checked}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 16, height: 16, borderRadius: "var(--radius-sm)", flexShrink: 0,
          background: on ? "var(--accent)" : "transparent",
          border: "1px solid " + (on ? "var(--accent)" : "var(--border-strong)"),
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "#FFFFFF", fontSize: 9, transition: "background .15s ease, border-color .15s ease",
        }}>
        {indeterminate ? <i className="fa-solid fa-minus" /> : checked ? <i className="fa-solid fa-check" /> : null}
      </span>
      {label}
    </label>
  );
}
export default Checkbox;
