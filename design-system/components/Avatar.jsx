// Avatar — image or initials, with optional status dot.
export function Avatar({
  src, initials, size = 32, shape = "circle", status, className, style, ...rest
}) {
  const radius = shape === "circle" ? "var(--radius-pill)" : "var(--radius-md)";
  const dotColors = { online: "var(--success)", away: "var(--warning)", busy: "var(--danger)", offline: "var(--fg-3)" };
  return (
    <span className={className} style={{ position: "relative", display: "inline-flex", flexShrink: 0, ...style }} {...rest}>
      <span style={{
        width: size, height: size, borderRadius: radius, overflow: "hidden",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-3)", color: "var(--fg-1)",
        fontFamily: "var(--font-sans)", fontWeight: 600,
        fontSize: size <= 24 ? 10 : size <= 36 ? 12 : Math.round(size * 0.38),
      }}>
        {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (initials || "")}
      </span>
      {status && <span style={{
        position: "absolute", right: -1, bottom: -1,
        width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28),
        borderRadius: "var(--radius-pill)", background: dotColors[status],
        border: "2px solid var(--bg-1)",
      }} />}
    </span>
  );
}
export default Avatar;
