/**
 * Small KPI tile: label, one figure, optional glyph chip and foot line. For the four headline cards on the Overview
 * use HeadlineTile from src/charts instead (it carries flag colour, glyph and basis).
 *
 * Static by default. Pass `onClick` for a drill-down BUTTON (aria-pressed when `pressed` is set) or `href` for a LINK.
 *
 * @param {object} props
 * @param {React.ReactNode} props.label what the number is ("Contracts on the register")
 * @param {React.ReactNode} props.value the figure; use fmtGBPCompact / fmtGBP, tabular figures are applied
 * @param {string} [props.icon] FA solid name shown in a 28px chip top right
 * @param {React.ReactNode} [props.foot] supporting line ("indicative value per year")
 * @param {() => void} [props.onClick] makes the tile a button
 * @param {boolean} [props.pressed] aria-pressed state for a toggle tile
 * @param {string} [props.href] makes the tile a link
 */
export function StatTile({ label, value, icon, foot, onClick, pressed, href, className = '', ...rest }) {
  const inner = (
    <>
      <span className="kx-stat__top"><span className="kx-stat__label">{label}</span>{icon && <span className="kx-stat__icon"><i className={'fa-solid fa-' + icon} aria-hidden="true" /></span>}</span>
      <span className="kx-stat__value">{value}</span>
      {foot && <span className="kx-stat__foot">{foot}</span>}
    </>
  );
  if (href) return <a className={('kx-stat kx-stat--link ' + className).trim()} href={href} {...rest}>{inner}</a>;
  if (onClick) return <button type="button" className={('kx-stat kx-stat--button ' + className).trim()} onClick={onClick} aria-pressed={pressed} {...rest}>{inner}</button>;
  return <div className={('kx-stat ' + className).trim()} {...rest}>{inner}</div>;
}

export default StatTile;
