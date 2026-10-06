// The whole product frame: providers, the Springboard App Shell with its real handlers, the sample-data banner,
// toasts and the confirm dialog. App.jsx renders the routed page inside it; a view agent's dev entry renders just
// its own view inside the very same frame:
//
//   import { AppFrame } from '../shell/AppFrame.jsx';
//   import Opportunities from '../views/Opportunities.jsx';
//   createRoot(document.getElementById('root')).render(
//     <AppFrame rail="opportunities" title="Opportunities"><Opportunities /></AppFrame>);
//   (import '../shell/shell.css', ui/kit.css, charts/charts.css, styles/app.css and your own css before it, in that order)
//
// Props
//   route     the useRoute() object when the caller already has it (App.jsx); read from the hash when omitted
//   rail      id of the rail item to highlight (null = none)
//   title     default document.title page name (`<title> | Kontor financial layer`); omit to leave the base title
//   overlays  node mounted next to the shell, inside the providers: <Overlays /> from components/Overlays.jsx in the
//             real app. Left out by default, so a dev entry is not affected by other agents' unfinished overlays.
import { EstateProvider } from '../lib/estate.js';
import { UIProvider, useUI } from '../lib/ui-context.jsx';
import { useRoute, useRouteEffects, navigate } from '../lib/router.js';
import { AppShell, DEFAULT_TABS, DEFAULT_ACTIONS } from './AppShell.jsx';
import { RAIL } from './rail.js';
import { SampleBanner } from '../components/SampleBanner.jsx';
import { ToastHost, ToastBridge } from '../components/ToastHost.jsx';
import { ConfirmHost } from '../components/ConfirmHost.jsx';

export const APP_NAME = 'Kontor financial layer';
const USER = { initials: 'MB', name: 'Marchbank commercial team' };

/** Copies text to the clipboard. Falls back to a hidden textarea where the async API is unavailable (file://, older browsers). */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

function Frame({ route: routeProp, rail, title, overlays, children }) {
  const own = useRoute();
  const route = routeProp || own;
  const ui = useUI();
  useRouteEffects(route, title);

  // R5: controls that sit outside Stage 1 say so instead of doing nothing.
  const inert = (name) => () => ui.toast({
    tone: 'info',
    title: `${name} isn't part of this prototype.`,
    description: 'It sits outside Stage 1. Use the left rail to explore the demo.',
  });

  const share = async () => {
    const ok = await copyText(window.location.href);
    ui.toast(ok
      ? { tone: 'success', title: 'Link copied to your clipboard.', description: 'It opens this screen with the same filters.' }
      : { tone: 'error', title: 'Link not copied.', description: 'Your browser blocked clipboard access. Copy the address from the address bar instead.' });
  };

  const tabs = DEFAULT_TABS.map((t) => ({ ...t, onSelect: inert(t.label) }));
  const actions = DEFAULT_ACTIONS.map((a) => ({
    ...a,
    optional: a.id === 'notifications' ? true : a.optional,       // phones: the header makes room for the Menu button instead
    onClick: a.id === 'share' ? share : a.id === 'settings' ? (e) => ui.openSettings(e.currentTarget) : inert(a.label),
  }));

  return (
    <>
      <AppShell
        appName={APP_NAME}
        appShortName="Kontor"
        appBadge="Sample"
        banner={<SampleBanner />}
        tabs={tabs}
        actions={actions}
        user={{ ...USER, onClick: inert('Account') }}
        railItems={RAIL}
        activeRail={rail || null}
        onRailChange={(id) => navigate('/' + id)}
        onCloseApp={() => { navigate('/overview'); ui.toast({ tone: 'info', title: 'Returned to the overview.' }); }}
        onMenu={(el) => ui.openMenu(el)}
      >
        {children}
      </AppShell>
      {overlays}
      <ConfirmHost />
      <ToastHost />
    </>
  );
}

export function AppFrame(props) {
  return (
    <EstateProvider>
      <UIProvider>
        <ToastBridge>
          <Frame {...props} />
        </ToastBridge>
      </UIProvider>
    </EstateProvider>
  );
}

export default AppFrame;
