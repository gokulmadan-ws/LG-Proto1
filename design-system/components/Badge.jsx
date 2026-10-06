// Badge — status pills & tags. Soft / solid / outline tones.
export function Badge({
  tone = "neutral", variant = "soft", size = "md",
  dot = false, leftIcon, onRemove, children, className, style, ...rest
}) {
  const TONES = {
    neutral: "var(--fg-2)", blue: "var(--accent)", green: "var(--success)",
    amber: "var(--warning)", red: "var(--danger)", purple: "var(--purple-600)",
  };
  const c = TONES[tone] || TONES.neutral;
  const S = {
    sm: { fontSize: 11, padding: "1px 7px", height: 18, gap: 4 },
    md: { fontSize: 12, padding: "2px 9px", height: 22, gap: 5 },
    lg: { fontSize: 13, padding: "3px 11px", height: 26, gap: 6 },
  }[size] || {};
  const skin = {
    soft:    { background: "color-mix(in srgb, " + c + " 16%, transparent)", color: c, border: "1px solid transparent" },
    solid:   { background: c, color: tone === "neutral" ? "var(--bg-canvas)" : "#FFFFFF", border: "1px solid transparent" },
    outline: { background: "transparent", color: c, border: "1px solid color-mix(in srgb, " + c + " 45%, transparent)" },
  }[variant] || {};
  return (
    <span className={className} style={{
      display: "inline-flex", alignItems: "center", gap: S.gap,
      height: S.height, padding: S.padding, borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: S.fontSize, lineHeight: 1,
      whiteSpace: "nowrap", boxSizing: "border-box", ...skin, ...style,
    }} {...rest}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "var(--radius-pill)", background: "currentColor" }} />}
      {leftIcon && <i className={"fa-solid fa-" + leftIcon} style={{ fontSize: S.fontSize - 1 }} />}
      {children}
      {onRemove && (
        <button onClick={onRemove} aria-label="Remove" style={{
          border: "none", background: "transparent", color: "currentColor", cursor: "pointer",
          padding: 0, marginLeft: 1, display: "inline-flex", opacity: 0.7, fontSize: S.fontSize - 2,
        }}><i className="fa-solid fa-xmark" /></button>
      )}
    </span>
  );
}
export default Badge;
