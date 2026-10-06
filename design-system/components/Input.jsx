// Input — text field with optional leading icon, error & disabled states.
export function Input({
  size = "md", leftIcon, error = false, disabled = false,
  className, style, ...rest
}) {
  const [f, setF] = React.useState(false);
  const S = {
    sm: { height: 32, fontSize: 13, padLeft: leftIcon ? 30 : 10, padRight: 10 },
    md: { height: 36, fontSize: 14, padLeft: leftIcon ? 34 : 12, padRight: 12 },
    lg: { height: 40, fontSize: 14, padLeft: leftIcon ? 38 : 14, padRight: 14 },
  }[size] || {};
  const border = error ? "var(--danger)" : f ? "var(--accent)" : "var(--border-2)";
  const ring = error ? "color-mix(in srgb, var(--danger) 30%, transparent)" : "var(--focus-ring)";
  return (
    <div className={className} style={{ position: "relative", display: "inline-flex", width: "100%", ...style }}>
      {leftIcon && <i className={"fa-solid fa-" + leftIcon} style={{
        position: "absolute", left: size === "lg" ? 14 : 12, top: "50%", transform: "translateY(-50%)",
        color: "var(--fg-3)", fontSize: S.fontSize - 1, pointerEvents: "none",
      }} />}
      <input
        disabled={disabled} aria-invalid={error || undefined}
        onFocus={(e) => { setF(true); rest.onFocus && rest.onFocus(e); }}
        onBlur={(e) => { setF(false); rest.onBlur && rest.onBlur(e); }}
        style={{
          width: "100%", height: S.height, boxSizing: "border-box",
          background: "var(--bg-1)", border: "1px solid " + border, borderRadius: "var(--radius-md)",
          padding: "0 " + S.padRight + "px 0 " + S.padLeft + "px",
          fontFamily: "var(--font-sans)", fontSize: S.fontSize, color: "var(--fg-1)",
          outline: "none", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "text",
          boxShadow: f ? "0 0 0 3px " + ring : "none",
          transition: "border-color .15s ease, box-shadow .15s ease",
        }}
        {...rest}
      />
    </div>
  );
}
export default Input;
