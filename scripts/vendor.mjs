// Copies browser-ready copies of third-party libs into vendor/ so the prototype
// works offline and from any static host (no CDN needed).
import { cpSync, mkdirSync, copyFileSync } from 'node:fs';
mkdirSync('vendor/fontawesome', { recursive: true });
copyFileSync('node_modules/react/umd/react.production.min.js', 'vendor/react.production.min.js');
copyFileSync('node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/react-dom.production.min.js');
cpSync('node_modules/@fortawesome/fontawesome-free/css/all.min.css', 'vendor/fontawesome/css/all.min.css', { recursive: true });
cpSync('node_modules/@fortawesome/fontawesome-free/webfonts', 'vendor/fontawesome/webfonts', { recursive: true });
console.log('vendor/ refreshed');
