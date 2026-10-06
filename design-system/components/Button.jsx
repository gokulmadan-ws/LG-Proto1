// Button — Springboard 2.0. Blue primary, dark-first. Token-driven.
export function Button({
  variant = "primary", size = "md",
  leftIcon, rightIcon, loading = false, disabled = false,
  children, className, style, ...rest
}) {
  const [h, setH] = React.useState(false);
  const [a, setA] = React.useState(false);
  const S = {
    sm: { height: 28, padding: "0 10px", fontSize: 12, radius: "var(--radius-md)", gap: 6, icon: 11 },
    md: { height: 36, padding: "0 14px", fontSize: 14, radius: "var(--radius-lg)", gap: 8, icon: 13 },
    lg: { height: 40, padding: "0 18px", fontSize: 14, radius: "var(--radius-lg)", gap: 8, icon: 14 },
  }[size] || {};
  const V = {
    primary:     { bg: "var(--accent)",  hv: "var(--accent-hover)",  ac: "var(--accent-pressed)", fg: "var(--accent-fg)", bd: "transparent" },
    secondary:   { bg: "var(--bg-2)",    hv: "var(--bg-3)",          ac: "var(--bg-3)",           fg: "var(--fg-1)",      bd: "var(--border-2)" },
    outline:     { bg: "transparent",    hv: "var(--bg-2)",          ac: "var(--bg-2)",           fg: "var(--fg-1)",      bd: "var(--border-2)" },
    ghost:       { bg: "transparent",    hv: "var(--bg-2)",          ac: "var(--bg-2)",           fg: "var(--fg-1)",      bd: "transparent" },
    destructive: { bg: "var(--danger)",  hv: "#BF1B2B",              ac: "#A40E26",               fg: "#FFFFFF",          bd: "transparent" },
  }[variant] || {};
  const off = disabled || loading;
  const bg = off ? V.bg : a ? V.ac : h ? V.hv : V.bg;
  return (
    <button
      className={className} disabled={off} aria-busy={loading || undefined}
      onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setA(false); }}
      onMouseDown={() => setA(true)} onMouseUp={() => setA(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: S.gap,
        height: S.height, padding: S.padding, borderRadius: S.radius,
        background: bg, color: V.fg, border: "1px solid " + V.bd,
        fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: S.fontSize, lineHeight: 1,
        cursor: off ? "default" : "pointer", opacity: disabled ? 0.4 : 1, whiteSpace: "nowrap",
        transition: "background .15s ease, opacity .15s ease", outline: "none",
        ...style,
      }}
      {...rest}
    >
      {loading && <i className="fa-solid fa-spinner" style={{ fontSize: S.icon, animation: "ds-spin .8s linear infinite" }} />}
      {!loading && leftIcon && <i className={"fa-solid fa-" + leftIcon} style={{ fontSize: S.icon }} />}
      {children}
      {!loading && rightIcon && <i className={"fa-solid fa-" + rightIcon} style={{ fontSize: S.icon }} />}
    </button>
  );
}
export default Button;
