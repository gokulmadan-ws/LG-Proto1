// Tabs — underline style. Controlled via value/onChange.
export function Tabs({ items = [], value, onChange, className, style, ...rest }) {
  const active = value ?? (items[0] && items[0].value);
  return (
    <div role="tablist" className={className} style={{
      display: "flex", gap: 4, borderBottom: "1px solid var(--border-1)", ...style,
    }} {...rest}>
      {items.map((it) => {
        const on = it.value === active;
        return (
          <button key={it.value} role="tab" aria-selected={on}
            onClick={() => onChange && onChange(it.value)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 12px",
              border: "none", background: "transparent", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14,
              color: on ? "var(--fg-1)" : "var(--fg-2)",
              borderBottom: "2px solid " + (on ? "var(--accent)" : "transparent"),
              marginBottom: -1, transition: "color .15s ease",
            }}>
            {it.icon && <i className={"fa-solid fa-" + it.icon} style={{ fontSize: 13 }} />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
export default Tabs;
