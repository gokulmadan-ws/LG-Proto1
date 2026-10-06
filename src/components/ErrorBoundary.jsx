import { Component } from 'react';
import { navigate } from '../lib/router.js';

const { Button } = window.Springboard20DesignSystem_019e02;

/**
 * Catches render errors so a thrown error never leaves a blank shell in front of a customer. Copy follows
 * [What] + [Why] + [How] (R71, copy deck 7.9).
 *
 *   <ErrorBoundary level="app">...</ErrorBoundary>                  whole app, renders a full-page panel
 *   <ErrorBoundary resetKey={route.path}>...</ErrorBoundary>        one page; the panel clears when resetKey changes
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[kontor] render error:', error, info && info.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const app = this.props.level === 'app';
    const Wrap = app ? 'main' : 'div';
    return (
      <Wrap className={'page error-panel' + (app ? ' error-panel--app' : '')} {...(app ? { id: 'shell-main', tabIndex: -1 } : {})}>
        <div className="page-header">
          <div className="page-header__main">
            <h1 className="page-header__title ds-h2" tabIndex={-1}>This screen couldn't load.</h1>
            <div className="page-header__desc">
              Something unexpected stopped it from drawing. Reload the page. If it happens again, go to the overview.
            </div>
          </div>
          <div className="page-header__actions">
            <Button type="button" leftIcon="rotate-right" onClick={() => window.location.reload()}>Reload page</Button>
            <Button type="button" variant="outline" leftIcon="house" onClick={() => { navigate('/overview'); this.setState({ error: null }); }}>Go to overview</Button>
          </div>
        </div>
        <details className="error-panel__details">
          <summary>Show technical details</summary>
          <pre>{String((error && (error.stack || error.message)) || error)}</pre>
        </details>
      </Wrap>
    );
  }
}

export default ErrorBoundary;
