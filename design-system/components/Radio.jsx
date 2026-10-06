// Radio — single control; compose several with one `name` for a group.
export function Radio({ checked = false, disabled = false, label, name, value, onChange, className, style, ...rest }) {
  return (
    <label className={className} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-1)", userSelect: "none", ...style,
    }} {...rest}>
      <span
        role="radio" aria-checked={checked}
        onClick={() => !disabled && onChange && onChange(value ?? true)}
        style={{
          width: 16, height: 16, borderRadius: "var(--radius-pill)", flexShrink: 0,
          background: "transparent",
          border: "1px solid " + (checked ? "var(--accent)" : "var(--border-strong)"),
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          transition: "border-color .15s ease",
        }}>
        {checked && <span style={{ width: 8, height: 8, borderRadius: "var(--radius-pill)", background: "var(--accent)" }} />}
      </span>
      {label}
    </label>
  );
}
export default Radio;
