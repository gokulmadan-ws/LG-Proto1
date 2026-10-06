// Accordion — self-managing. Single open by default; allowMultiple optional.
export function Accordion({ items = [], allowMultiple = false, defaultOpen = [], className, style }) {
  const [open, setOpen] = React.useState(() => new Set(defaultOpen));
  const toggle = (i) => setOpen((prev) => {
    const next = new Set(allowMultiple ? prev : []);
    if (prev.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  return (
    <div className={className} style={{
      border: "1px solid var(--border-1)", borderRadius: "var(--radius-lg)", overflow: "hidden", ...style,
    }}>
      {items.map((it, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} style={{ borderTop: i ? "1px solid var(--border-1)" : "none" }}>
            <button onClick={() => toggle(i)} aria-expanded={isOpen} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "13px 14px", border: "none", background: "var(--bg-1)", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--fg-1)", textAlign: "left",
            }}>
              {it.title}
              <i className="fa-solid fa-chevron-down" style={{
                fontSize: 12, color: "var(--fg-3)", transition: "transform .2s ease",
                transform: isOpen ? "rotate(180deg)" : "none",
              }} />
            </button>
            {isOpen && <div style={{
              padding: "0 14px 14px", fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.5, color: "var(--fg-2)",
            }}>{it.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
export default Accordion;
