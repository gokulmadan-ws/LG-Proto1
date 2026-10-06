import { PageHeader } from './PageHeader.jsx';
import { navigate } from '../lib/router.js';

const { Button } = window.Springboard20DesignSystem_019e02;

/** Unknown route (copy deck 7.9). Renders its own single <h1>. */
export function NotFound() {
  return (
    <div className="page">
      <PageHeader
        title="Page not found."
        description="That address doesn't match a screen in this prototype. Go to the overview to continue."
        actions={<Button type="button" leftIcon="house" onClick={() => navigate('/overview')}>Go to overview</Button>}
      />
    </div>
  );
}

export default NotFound;
