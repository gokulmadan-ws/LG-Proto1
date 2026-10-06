// Switch — toggle. Brand blue when on.
export function Switch({ checked = false, disabled = false, size = "md", label, onChange, className, style, ...rest }) {
  const S = { sm: { w: 28, h: 16, k: 12 }, md: { w: 36, h: 20, k: 16 } }[size] || {};
  return (
    <label className={className} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-1)", userSelect: "none", ...style,
    }} {...rest}>
      <span
        role="switch" aria-checked={checked}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: S.w, height: S.h, borderRadius: "var(--radius-pill)", flexShrink: 0, position: "relative",
          background: checked ? "var(--accent)" : "var(--bg-3)", transition: "background .15s ease",
        }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? S.w - S.k - 2 : 2,
          width: S.k, height: S.k, borderRadius: "var(--radius-pill)", background: "#FFFFFF",
          transition: "left .15s ease", boxShadow: "var(--shadow-1)",
        }} />
      </span>
      {label}
    </label>
  );
}
export default Switch;
