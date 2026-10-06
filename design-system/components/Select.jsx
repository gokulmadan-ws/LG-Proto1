// Select — styled native select with a chevron. Pass options or children.
export function Select({ options, size = "md", error = false, disabled = false, className, style, children, ...rest }) {
  const [f, setF] = React.useState(false);
  const S = { sm: { height: 32, fontSize: 13 }, md: { height: 36, fontSize: 14 }, lg: { height: 40, fontSize: 14 } }[size] || {};
  const border = error ? "var(--danger)" : f ? "var(--accent)" : "var(--border-2)";
  return (
    <div className={className} style={{ position: "relative", display: "inline-flex", width: "100%", ...style }}>
      <select
        disabled={disabled}
        onFocus={(e) => { setF(true); rest.onFocus && rest.onFocus(e); }}
        onBlur={(e) => { setF(false); rest.onBlur && rest.onBlur(e); }}
        style={{
          width: "100%", height: S.height, boxSizing: "border-box", appearance: "none",
          background: "var(--bg-1)", border: "1px solid " + border, borderRadius: "var(--radius-md)",
          padding: "0 32px 0 12px", fontFamily: "var(--font-sans)", fontSize: S.fontSize, color: "var(--fg-1)",
          outline: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
          boxShadow: f ? "0 0 0 3px var(--focus-ring)" : "none",
          transition: "border-color .15s ease, box-shadow .15s ease",
        }}
        {...rest}
      >
        {options ? options.map((o, i) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return <option key={i} value={opt.value}>{opt.label}</option>;
        }) : children}
      </select>
      <i className="fa-solid fa-chevron-down" style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        color: "var(--fg-3)", fontSize: 11, pointerEvents: "none",
      }} />
    </div>
  );
}
export default Select;
