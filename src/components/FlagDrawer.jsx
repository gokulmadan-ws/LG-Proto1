// STUB (A1). V2 replaces this file. Spec: docs/blueprint.md section 5 "Opportunities".
//
// Contract
//   default export: <FlagDrawer />, mounted ONCE by App.jsx on EVERY route, no props.
//   It reads `?flag=<flagId>` from the current hash (useRoute().query). Any page opens it with setQuery({ flag: id });
//   closing removes the param with setQuery({ flag: null }) (replace, so Back is not polluted). Drive it from
//   estate.flagsById[id], NOT from a filtered list (a triaged flag must not make the open drawer vanish).
//   Contents: reason, numbered breakdown whose last line equals the row amount, confidence + why, evidence ClauseLink,
//   "Reasons this may not be a saving", triage select, MethodLink. Trap focus, Esc closes, focus returns to the row.
//   Query-only route changes do not scroll or refocus the page (lib/router.js), so opening it never jumps the list.
import { useRoute, setQuery } from '../lib/router.js';
import { StubOverlay } from './overlays/_StubOverlay.jsx';

export default function FlagDrawer() {
  const route = useRoute();
  const id = route.query.get('flag');
  return (
    <StubOverlay
      open={!!id}
      onClose={() => setQuery({ flag: null })}
      title="Opportunity"
      variant="drawer"
      owner="V2"
      note={id ? `Flag: ${id}` : ''}
    />
  );
}
