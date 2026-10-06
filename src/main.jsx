// Entry point. Global CSS order is fixed by the blueprint (one owner per concern; later wins):
//   1. shell/shell.css    page background, shell geometry and tokens (alone owns html/body background)
//   2. ui/kit.css         kit components (A3)
//   3. charts/charts.css  chart library (A3)
//   4. styles/app.css     global fixes + shared composites (A1)
//   then each view's own CSS, imported by the view itself.
// scripts/build.mjs skips ui/kit.css and charts/charts.css with a warning while they do not exist yet (--strict fails).
import './shell/shell.css';
import './ui/kit.css';
import './charts/charts.css';
import './styles/app.css';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
