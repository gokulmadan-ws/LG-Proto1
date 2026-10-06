import { createPortal } from 'react-dom';

/**
 * Render children into document.body, outside every overflow:hidden card and the app shell.
 * Theme variables still apply because they live on <html data-theme>.
 */
export function Portal({ children, container }) {
  return createPortal(children, container || document.body);
}

export default Portal;
