// Textarea — multi-line field with focus & error states.
export function Textarea({ error = false, disabled = false, rows = 4, className, style, ...rest }) {
  const [f, setF] = React.useState(false);
  const border = error ? "var(--danger)" : f ? "var(--accent)" : "var(--border-2)";
  const ring = error ? "color-mix(in srgb, var(--danger) 30%, transparent)" : "var(--focus-ring)";
  return (
    <textarea
      className={className} disabled={disabled} rows={rows} aria-invalid={error || undefined}
      onFocus={(e) => { setF(true); rest.onFocus && rest.onFocus(e); }}
      onBlur={(e) => { setF(false); rest.onBlur && rest.onBlur(e); }}
      style={{
        width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 64,
        background: "var(--bg-1)", border: "1px solid " + border, borderRadius: "var(--radius-md)",
        padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.5,
        color: "var(--fg-1)", outline: "none", opacity: disabled ? 0.5 : 1,
        boxShadow: f ? "0 0 0 3px " + ring : "none",
        transition: "border-color .15s ease, box-shadow .15s ease", ...style,
      }}
      {...rest}
    />
  );
}
export default Textarea;
