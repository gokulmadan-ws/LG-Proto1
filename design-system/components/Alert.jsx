// Alert — inline banner. info / success / warning / error.
export function Alert({ type = "info", title, dismissible = false, onDismiss, children, className, style, ...rest }) {
  const [show, setShow] = React.useState(true);
  const MAP = {
    info:    { c: "var(--accent)",  icon: "circle-info" },
    success: { c: "var(--success)", icon: "circle-check" },
    warning: { c: "var(--warning)", icon: "triangle-exclamation" },
    error:   { c: "var(--danger)",  icon: "circle-exclamation" },
  }[type] || {};
  if (!show) return null;
  return (
    <div role="alert" className={className} style={{
      display: "flex", gap: 12, padding: "12px 14px", borderRadius: "var(--radius-lg)",
      background: "color-mix(in srgb, " + MAP.c + " 12%, var(--bg-1))",
      border: "1px solid color-mix(in srgb, " + MAP.c + " 35%, transparent)",
      fontFamily: "var(--font-sans)", ...style,
    }} {...rest}>
      <i className={"fa-solid fa-" + MAP.icon} style={{ color: MAP.c, fontSize: 15, marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 600, fontSize: 14, color: "var(--fg-1)", marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-2)" }}>{children}</div>}
      </div>
      {dismissible && <button onClick={() => { setShow(false); onDismiss && onDismiss(); }} aria-label="Dismiss" style={{
        border: "none", background: "transparent", color: "var(--fg-3)", cursor: "pointer", padding: 0, fontSize: 14, flexShrink: 0,
      }}><i className="fa-solid fa-xmark" /></button>}
    </div>
  );
}
export default Alert;
