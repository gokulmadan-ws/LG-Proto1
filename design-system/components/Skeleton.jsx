// Skeleton — shimmering placeholder.
export function Skeleton({ variant = "text", width, height, className, style, ...rest }) {
  const radius = variant === "circle" ? "var(--radius-pill)" : variant === "text" ? "var(--radius-sm)" : "var(--radius-md)";
  const h = height ?? (variant === "text" ? 12 : 40);
  const w = width ?? (variant === "text" ? "100%" : variant === "circle" ? h : "100%");
  return (
    <span className={className} aria-hidden="true" style={{
      display: "block", width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 37%, var(--bg-2) 63%)",
      backgroundSize: "400% 100%", animation: "ds-shimmer 1.4s ease infinite", ...style,
    }} {...rest} />
  );
}
export default Skeleton;
