import { PageHeader } from './PageHeader.jsx';
import { useRoute } from '../lib/router.js';

const { Card } = window.Springboard20DesignSystem_019e02;

/**
 * Placeholder body for a view that its owner has not built yet. A1 stubs render this; the owner replaces the whole file.
 * Real views do NOT use it. It renders the single <h1>, the route and the owner so the app always compiles and the
 * smoke test can check the shell on every route.
 */
export function StubPage({ name, owner, note, description }) {
  const route = useRoute();
  return (
    <div className="page">
      <PageHeader title={name} description={description || 'Placeholder. This screen has not been built yet.'} />
      <Card title="Placeholder" description={`Built by ${owner}. Replaces this card when it lands.`}>
        <p className="ds-body" style={{ margin: 0 }}>
          Route: <code className="ds-mono">#{route.path}{route.query.toString() ? '?' + route.query.toString() : ''}</code>
        </p>
        {note && <p className="ds-body-sm" style={{ margin: '8px 0 0' }}>{note}</p>}
      </Card>
    </div>
  );
}

export default StubPage;
