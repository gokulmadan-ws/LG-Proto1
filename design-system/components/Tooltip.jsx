// Tooltip — hover/focus label. Wraps a single trigger child.
export function Tooltip({ label, side = "top", children, style }) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top:    { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 },
    bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6 },
    left:   { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 6 },
    right:  { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 6 },
  }[side];
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && <span role="tooltip" style={{
        position: "absolute", zIndex: 50, whiteSpace: "nowrap", pointerEvents: "none",
        background: "var(--bg-2)", color: "var(--fg-1)", border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-md)", padding: "5px 9px", boxShadow: "var(--shadow-2)",
        fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.3, ...pos,
      }}>{label}</span>}
    </span>
  );
}
export default Tooltip;
