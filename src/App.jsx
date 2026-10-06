import { useRoute } from './lib/router.js';
import { resolveRoute } from './routes.js';
import { AppFrame } from './shell/AppFrame.jsx';
import { Overlays } from './components/Overlays.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

function Routed() {
  const route = useRoute();
  const { title, rail, Component } = resolveRoute(route);
  return (
    <AppFrame route={route} rail={rail} title={title} overlays={<Overlays />}>
      {/* One boundary per page: a thrown error leaves the shell usable and clears when the address changes. */}
      <ErrorBoundary resetKey={route.path}>
        <Component route={route} />
      </ErrorBoundary>
    </AppFrame>
  );
}

export function App() {
  return (
    <ErrorBoundary level="app">
      <Routed />
    </ErrorBoundary>
  );
}

export default App;
