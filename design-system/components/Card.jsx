// Card — elevated surface with optional title / description / footer.
export function Card({
  title, description, footer, padding = 16, elevated = false,
  children, className, style, ...rest
}) {
  return (
    <div className={className} style={{
      background: "var(--bg-1)", border: "1px solid var(--border-1)",
      borderRadius: "var(--radius-lg)", boxShadow: elevated ? "var(--shadow-2)" : "none",
      overflow: "hidden", ...style,
    }} {...rest}>
      <div style={{ padding }}>
        {title && <div style={{
          font: "600 16px/1.3 var(--font-sans)", color: "var(--fg-1)", marginBottom: description ? 4 : 0,
        }}>{title}</div>}
        {description && <div style={{
          font: "400 14px/1.45 var(--font-sans)", color: "var(--fg-2)",
        }}>{description}</div>}
        {children && <div style={{ marginTop: title || description ? 12 : 0 }}>{children}</div>}
      </div>
      {footer && <div style={{
        padding: "12px " + padding + "px", borderTop: "1px solid var(--border-1)",
        background: "var(--bg-canvas)", display: "flex", gap: 8, justifyContent: "flex-end",
      }}>{footer}</div>}
    </div>
  );
}
export default Card;
