// Spinner — indeterminate loading ring.
export function Spinner({ size = 18, thickness = 2, color = "var(--accent)", className, style, ...rest }) {
  return (
    <span role="status" aria-label="Loading" className={className} style={{
      display: "inline-block", width: size, height: size, borderRadius: "var(--radius-pill)",
      border: thickness + "px solid var(--bg-3)", borderTopColor: color,
      animation: "ds-spin .7s linear infinite", ...style,
    }} {...rest} />
  );
}
export default Spinner;
