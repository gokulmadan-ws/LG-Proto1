// "As at 6 October 2026". The as-of date is fixed for the whole prototype (R10): never derive it from the clock.
export const AS_AT_ISO = '2026-10-06';

/** '2026-10-06' -> '6 October 2026'. Always formats the supplied ISO date in UTC, never "today". */
export function formatLongDate(iso = AS_AT_ISO) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * <AsAt />                      As at 6 October 2026
 * <AsAt iso={estate.asOf} />    same, from the estate
 * <AsAt as="p" prefix="Data to" iso="2026-09-30" />
 */
export function AsAt({ iso = AS_AT_ISO, prefix = 'As at', as: Tag = 'span', className = '' }) {
  return (
    <Tag className={('as-at ' + className).trim()}>
      {prefix} <time dateTime={String(iso).slice(0, 10)}>{formatLongDate(iso)}</time>
    </Tag>
  );
}

export default AsAt;
