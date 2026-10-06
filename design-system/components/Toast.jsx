// Toast — notification surface. type drives the accent + icon.
export function Toast({ type = "info", title, onClose, children, className, style, ...rest }) {
  const MAP = {
    info:    { c: "var(--accent)",  icon: "circle-info" },
    success: { c: "var(--success)", icon: "circle-check" },
    warning: { c: "var(--warning)", icon: "triangle-exclamation" },
    error:   { c: "var(--danger)",  icon: "circle-exclamation" },
  }[type] || {};
  return (
    <div role="status" className={className} style={{
      display: "flex", gap: 12, alignItems: "flex-start", width: 360, maxWidth: "100%",
      padding: "13px 14px", borderRadius: "var(--radius-lg)",
      background: "var(--bg-2)", border: "1px solid var(--border-2)", boxShadow: "var(--shadow-3)",
      fontFamily: "var(--font-sans)", ...style,
    }} {...rest}>
      <i className={"fa-solid fa-" + MAP.icon} style={{ color: MAP.c, fontSize: 16, marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 600, fontSize: 14, color: "var(--fg-1)", marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--fg-2)" }}>{children}</div>}
      </div>
      {onClose && <button onClick={onClose} aria-label="Close" style={{
        border: "none", background: "transparent", color: "var(--fg-3)", cursor: "pointer", padding: 0, fontSize: 14, flexShrink: 0,
      }}><i className="fa-solid fa-xmark" /></button>}
    </div>
  );
}
export default Toast;
