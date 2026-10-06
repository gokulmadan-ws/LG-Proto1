import './shell.css';
import { WMark, GridGlyph, ShareGlyph } from './glyphs.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

const { Tooltip } = window.Springboard20DesignSystem_019e02;

// DS Tooltip wrapper. Visual hint only (every trigger already has an aria-label).
const Tip = ({ label, side, children }) => <Tooltip label={label} side={side}>{children}</Tooltip>;

// `icon` is either a Font Awesome class string ('fa-solid fa-house') or a ready-made node (<GridGlyph />).
const icon = (i) => (typeof i === 'string' ? <i className={i} aria-hidden="true" /> : i);

export const DEFAULT_TABS = [
  { id: 'apps', label: 'Apps', icon: <GridGlyph /> },
  { id: 'chat', label: 'Chat', icon: 'fa-solid fa-comment' },
];
export const DEFAULT_ACTIONS = [
  { id: 'share', label: 'Share', icon: <ShareGlyph />, optional: true },
  { id: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell' },
  { id: 'settings', label: 'Settings', icon: 'fa-solid fa-gear', optional: true },
];

/**
 * Springboard 2.0 "App Shell" ported to React. Layout and colour 1:1 with templates/app-shell/AppShell.dc.html in dark;
 * light values are chosen from Springboard tokens (see shell.css).
 *
 * @param {string}   appName        label of the active (open) app tab
 * @param {string}   [appIcon]      FA classes for the 24px chip, default 'fa-solid fa-asterisk'
 * @param {string}   [appShortName] shown instead of appName below 700px (the full name stays for screen readers)
 * @param {string|Node} [appBadge]  small neutral pill after the app name (the prototype passes 'Sample')
 * @param {Function} [onCloseApp]   shows the x on the app tab when provided
 * @param {Array}    [tabs]         tabs left of the app tab: {id,label,icon,onSelect?,href?,active?}. Default Apps + Chat.
 *                                  `href` renders the tab as a link (the Guide); `active` gives it the app tab's look (aria-current, accent underline)
 * @param {boolean}  [appActive]    false while another tab (the Guide) is active: the app tab loses its underline and becomes a link to `appHref`
 * @param {string}   [appHref]      where the inactive app tab goes
 * @param {Array}    railItems      {id,label,icon,short?}   (label = aria-label + tooltip, short = mobile caption)
 * @param {string}   activeRail     id of the active rail item (null/undefined = none, e.g. Method, Evidence)
 * @param {Function} [onRailChange] (id) => void
 * @param {Function} [onMenu]       "Menu" button; called with the button element so a popover can anchor to it. Bottom of the rail on
 *                                  desktop, in the header on phones (the bottom bar has no room). Omit to hide both
 * @param {Node}     [headerRight]  rendered first in the right cluster. Default = <ThemeToggle/>. Pass null to omit.
 * @param {Array}    [actions]      header circle buttons {id,label,icon,onClick?,optional?}. Default Share/Notifications/Settings
 * @param {{initials:string,name?:string,onClick?:Function}} [user]
 * @param {Node}     [banner]       always-visible strip above <main>, inside the canvas (the sample-data banner)
 * @param {string}   [mainLabel]    aria-label for <main>
 */
export function AppShell({
  appName,
  appIcon = 'fa-solid fa-asterisk',
  appShortName,
  appBadge,
  onCloseApp,
  appActive = true,
  appHref,
  tabs = DEFAULT_TABS,
  railItems = [],
  activeRail,
  onRailChange,
  onMenu,
  headerRight = <ThemeToggle Tip={Tip} />,
  actions = DEFAULT_ACTIONS,
  user = { initials: 'JS' },
  banner,
  mainLabel,
  children,
}) {
  // Skip link must NOT change location.hash (the app uses hash routing).
  const skip = (e) => { e.preventDefault(); const m = document.getElementById('shell-main'); if (m) m.focus(); };
  const nameInner = appShortName ? (
    <>
      <span className="shell__apptab-name-full">{appName}</span>
      <span className="shell__apptab-name-short" aria-hidden="true">{appShortName}</span>
    </>
  ) : appName;

  return (
    <div className="shell">
      <a className="shell__skip" href="#shell-main" onClick={skip}>Skip to content</a>

      {/* ===== Top header ===== */}
      <header className="shell__header">
        <div className="shell__left">
          <WMark />
          <nav className="shell__tabs" aria-label="Workspace">
            {tabs.map((t) => {
              const body = (
                <>
                  {icon(t.icon)}
                  <span className="shell__tab-label">{t.label}</span>
                  {t.active && <span className="shell__apptab-rule" aria-hidden="true" />}
                </>
              );
              const cls = 'shell__tab' + (t.active ? ' is-active' : '');
              return t.href
                ? <a key={t.id} className={cls} href={t.href} aria-current={t.active ? 'page' : undefined}>{body}</a>
                : <button key={t.id} type="button" className={cls} onClick={t.onSelect}>{body}</button>;
            })}
            <div className={'shell__apptab' + (appActive ? '' : ' is-inactive')}>
              <span className="shell__apptab-chip" aria-hidden="true"><i className={appIcon} /></span>
              {appActive || !appHref
                ? <span className="shell__apptab-name" aria-current={appActive ? 'page' : undefined}>{nameInner}</span>
                : <a className="shell__apptab-name shell__apptab-link" href={appHref}>{nameInner}</a>}
              {appBadge && <span className="shell__badge">{appBadge}</span>}
              {onCloseApp && (
                <span className="shell__slot shell__slot--optional">
                  <Tip label="Close app" side="bottom">
                    <button type="button" className="shell__apptab-close" aria-label={`Close ${appName}`} onClick={onCloseApp}>
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  </Tip>
                </span>
              )}
              {appActive && <span className="shell__apptab-rule" aria-hidden="true" />}
            </div>
          </nav>
        </div>

        <div className="shell__right">
          {headerRight}
          {actions.map((a) => (
            <span key={a.id} className={'shell__slot' + (a.optional ? ' shell__slot--optional' : '')}>
              <Tip label={a.label} side="bottom">
                <button type="button" className="shell__circle" aria-label={a.label} onClick={a.onClick}>
                  {icon(a.icon)}
                </button>
              </Tip>
            </span>
          ))}
          {onMenu && (
            <span className="shell__slot shell__slot--phone-only">
              <Tip label="Menu" side="bottom">
                <button type="button" className="shell__circle" aria-label="Menu" aria-haspopup="menu" onClick={(e) => onMenu(e.currentTarget)}>
                  <i className="fa-solid fa-bars" aria-hidden="true" />
                </button>
              </Tip>
            </span>
          )}
          <button type="button" className="shell__avatar" aria-label={user.name ? `Account: ${user.name}` : 'Account'} onClick={user.onClick}>
            {user.initials}
          </button>
        </div>
      </header>

      {/* ===== Body: rail + (banner, content) ===== */}
      <div className="shell__body">
        <nav className="shell__rail" aria-label="Primary">
          <ul className="shell__rail-list">
            {railItems.map((it) => {
              const active = it.id === activeRail;
              return (
                <li key={it.id}>
                  <Tip label={it.label} side="right">
                    <button
                      type="button"
                      className={'shell__rail-item' + (active ? ' is-active' : '')}
                      aria-label={it.label}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onRailChange && onRailChange(it.id)}
                    >
                      {icon(it.icon)}
                      <span className="shell__rail-caption" aria-hidden="true">{it.short || it.label}</span>
                    </button>
                  </Tip>
                </li>
              );
            })}
          </ul>
          {onMenu && (
            <div className="shell__rail-foot">
              <Tip label="Menu" side="right">
                <button type="button" className="shell__rail-menu" aria-label="Menu" aria-haspopup="menu" onClick={(e) => onMenu(e.currentTarget)}>
                  <i className="fa-solid fa-bars" aria-hidden="true" />
                </button>
              </Tip>
            </div>
          )}
        </nav>

        <div className="shell__content">
          {banner}
          <main id="shell-main" className="shell__main" tabIndex={-1} aria-label={mainLabel}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
