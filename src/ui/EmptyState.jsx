/**
 * Empty, no-results and "nothing to do here" panel: glyph, title, one sentence of help and at most one action.
 * Copy pattern: say what is empty, why, and what to do next. ("No contracts match these filters. Change a filter
 * or clear them to see more.")
 *
 * @param {object} props
 * @param {string} [props.icon='inbox'] FA solid name
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.children] the help sentence
 * @param {React.ReactNode} [props.action] one Button (outline unless it is the section's primary)
 * @param {'h2'|'h3'|'h4'|'p'} [props.as='h3'] heading level; choose the one that follows the previous heading on the page
 */
export function EmptyState({ icon = 'inbox', title, children, action, as: H = 'h3', className = '' }) {
  return (
    <div className={('kx-empty ' + className).trim()}>
      <span className="kx-empty__icon" aria-hidden="true"><i className={'fa-solid fa-' + icon} /></span>
      <H className="kx-empty__title">{title}</H>
      {children && <p className="kx-empty__text">{children}</p>}
      {action}
    </div>
  );
}

export default EmptyState;
