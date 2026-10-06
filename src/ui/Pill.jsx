/**
 * Status pill: text plus an optional Font Awesome glyph on a tone surface. Every tone pair passes WCAG AA in both
 * themes (checked by tests/ui-checks.mjs contrast). Status is never colour alone: always pass words, add `icon` for state.
 *
 * Which pill for what:
 *  - Neutral statuses (confidence, match status, review status, "Needs review", "Auto-renews", "Sample"): this Pill.
 *  - Flag types and cap states ("Spend over cap", "Close to cap", "Above contract value (estimate)"): FlagBadge or
 *    CapStatePill from src/charts, so the amber is the same amber on every screen.
 *  - Counts in a heading: the DS Badge, tone="neutral" only (the other Badge tones fail AA).
 *
 * @param {object} props
 * @param {'neutral'|'info'|'success'|'warning'|'danger'} [props.tone='neutral']
 * @param {string} [props.icon] FA solid name without the fa- prefix ("circle-check")
 * @param {boolean} [props.dot] leading 6px dot (use when there is no glyph)
 * @param {boolean} [props.solid] filled, white text (high-contrast swatch colours, still AA)
 * @param {'sm'|'md'} [props.size='md'] 22px or 18px tall
 * @param {React.ReactNode} props.children the words
 */
export function Pill({ tone = 'neutral', icon, dot, solid, size = 'md', className = '', children, ...rest }) {
  const cls = ['kx-pill', 'kx-pill--' + tone, solid && 'kx-pill--solid', size === 'sm' && 'kx-pill--sm', className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && !icon && <span className="kx-pill__dot" aria-hidden="true" />}
      {icon && <i className={'fa-solid fa-' + icon} aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Pill;
