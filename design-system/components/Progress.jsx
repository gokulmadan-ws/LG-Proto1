// Progress — determinate bar (0–100) or indeterminate.
export function Progress({ value = 0, indeterminate = false, size = "md", tone = "blue", className, style, ...rest }) {
  const h = { sm: 4, md: 6, lg: 8 }[size] || 6;
  const c = { blue: "var(--accent)", green: "var(--success)", amber: "var(--warning)", red: "var(--danger)" }[tone] || "var(--accent)";
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={indeterminate ? undefined : pct} aria-valuemin={0} aria-valuemax={100}
      className={className} style={{
        width: "100%", height: h, background: "var(--bg-3)", borderRadius: "var(--radius-pill)", overflow: "hidden", ...style,
      }} {...rest}>
      <div style={{
        height: "100%", borderRadius: "var(--radius-pill)", background: c,
        width: indeterminate ? "40%" : pct + "%",
        animation: indeterminate ? "ds-indeterminate 1.2s ease-in-out infinite" : "none",
        transition: indeterminate ? "none" : "width .3s ease",
      }} />
    </div>
  );
}
export default Progress;
