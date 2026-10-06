// Breadcrumb — path trail. Last item is the current page.
export function Breadcrumb({ items = [], className, style, ...rest }) {
  return (
    <nav aria-label="Breadcrumb" className={className} style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
      fontFamily: "var(--font-sans)", fontSize: 13, ...style,
    }} {...rest}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            <a href={it.href || "#"} aria-current={last ? "page" : undefined}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: last ? "var(--fg-1)" : "var(--fg-2)", fontWeight: last ? 500 : 400,
                textDecoration: "none", pointerEvents: last ? "none" : "auto",
              }}>
              {it.icon && <i className={"fa-solid fa-" + it.icon} style={{ fontSize: 12 }} />}
              {it.label}
            </a>
            {!last && <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: "var(--fg-3)" }} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
export default Breadcrumb;
