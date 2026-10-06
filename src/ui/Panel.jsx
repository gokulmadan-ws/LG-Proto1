import { Badge } from './ds.js';

/**
 * Card with a header row (title, optional count, right-aligned actions), a body and an optional footer.
 * Use instead of the DS Card when you need a heading element and actions in the header (the DS Card title is a div
 * and the card clips its children). In light mode the card is white with a hairline border.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title] section title, rendered as `as` (default h2)
 * @param {React.ReactNode} [props.description] muted line under the title
 * @param {number|string} [props.count] neutral count Badge after the title
 * @param {React.ReactNode} [props.actions] right side of the header: at most one primary Button, the rest outline or ghost
 * @param {React.ReactNode} [props.footer] footer strip
 * @param {boolean|number} [props.padded=true] false removes the body padding (tables, lists that bring their own); a number sets it in px (capped at 16px under 700px wide so phones keep their width)
 * @param {'h2'|'h3'|'h4'} [props.as='h2']
 * @param {string} [props.id] id of the heading (for aria-labelledby)
 */
export function Panel({ title, description, count, actions, footer, padded = true, as: H = 'h2', id, className = '', children, ...rest }) {
  const pad = padded === false ? 0 : typeof padded === 'number' ? padded : null;
  return (
    <section className={('kx-card ' + className).trim()} aria-labelledby={title && id ? id : undefined} {...rest}>
      {(title || actions) && (
        <div className="kx-card__head">
          <div className="kx-card__titles">
            <div className="kx-card__titlerow">
              {title && <H id={id} className="kx-card-title">{title}</H>}
              {count != null && <Badge tone="neutral">{count}</Badge>}
            </div>
            {description && <p className="kx-card__desc">{description}</p>}
          </div>
          {actions && <div className="spacer">{actions}</div>}
        </div>
      )}
      <div className={pad != null ? 'kx-card__body kx-card__body--pad' : 'kx-card__body'} style={pad != null ? { '--kx-pad': pad + 'px' } : undefined}>{children}</div>
      {footer && <div className="kx-card__foot">{footer}</div>}
    </section>
  );
}

export default Panel;
