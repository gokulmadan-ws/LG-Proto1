// Bundles src/main.jsx -> dist/app.js (+ dist/app.css). React is a browser global (vendor/ UMD),
// the Springboard components come from window.Springboard20DesignSystem_019e02.
//
//   node scripts/build.mjs                                   build dist/
//   node scripts/build.mjs --strict                          also fail if an optional global stylesheet is missing
//   node scripts/build.mjs --entry src/dev/a1.jsx --outdir .scratch/a1     isolated build for parallel agents
//   node scripts/build.mjs --watch
//
// Steps: 1. scripts/ds-offline.mjs (offline copies of the Springboard CSS in dist/ds/)  2. esbuild  3. guard:
// no CSS in dist/ or the outdir may reference a remote host (it would block first paint on a flaky network).
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDsOffline, assertNoRemoteCss } from './ds-offline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const watch = process.argv.includes('--watch');
const strict = process.argv.includes('--strict');
const flag = (k, d) => { const i = process.argv.indexOf('--' + k); return i === -1 ? d : process.argv[i + 1]; };
const outdir = flag('outdir', 'dist');
const entry = flag('entry', 'src/main.jsx');

// React and ReactDOM are browser globals (vendor/*.production.min.js).
const globalsPlugin = {
  name: 'react-globals',
  setup(b) {
    b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'globals' }));
    b.onResolve({ filter: /^react-dom(\/client)?$/ }, (a) => ({ path: a.path, namespace: 'globals' }));
    b.onLoad({ filter: /.*/, namespace: 'globals' }, (a) => ({
      contents: a.path === 'react' ? 'module.exports = window.React;' : 'module.exports = window.ReactDOM;',
      loader: 'js',
    }));
  },
};

// Files under assets/ referenced from CSS (the blob texture) stay files: CSS gets url("../assets/<file>"), resolved
// against dist/app.css, instead of a 465 KB base64 string. scripts/make-standalone.mjs inlines them for file:// use.
const assetsPlugin = {
  name: 'assets-stay-files',
  setup(b) {
    b.onResolve({ filter: /\.(png|jpg|jpeg|webp|woff2?)$/ }, (a) => {
      if (a.kind !== 'url-token') return null;
      const abs = path.resolve(a.resolveDir, a.path);
      const rel = path.relative(path.join(ROOT, 'assets'), abs);
      if (rel.startsWith('..')) return null;
      return { path: '../assets/' + rel.split(path.sep).join('/'), external: true };
    });
  },
};

// Optional global stylesheets (owned by other agents): a missing one is skipped with a warning so an isolated
// build never fails because a teammate has not delivered yet. --strict (npm run build) turns that into an error.
const OPTIONAL_CSS = new Set(['src/ui/kit.css', 'src/charts/charts.css']);
const optionalPlugin = {
  name: 'optional-global-css',
  setup(b) {
    b.onResolve({ filter: /\.css$/ }, (a) => {
      if (a.kind !== 'import-statement') return null;
      const abs = path.resolve(a.resolveDir, a.path);
      const rel = path.relative(ROOT, abs).split(path.sep).join('/');
      if (!OPTIONAL_CSS.has(rel) || fs.existsSync(abs)) return null;
      if (strict) return { errors: [{ text: `Missing required global stylesheet ${rel}` }] };
      return { path: rel, namespace: 'optional-empty', warnings: [{ text: `Optional stylesheet ${rel} does not exist yet: skipped` }] };
    });
    b.onLoad({ filter: /.*/, namespace: 'optional-empty' }, () => ({ contents: '', loader: 'css' }));
  },
};

const options = {
  entryPoints: [entry],
  outdir,
  entryNames: 'app',
  bundle: true,
  format: 'iife',
  target: ['chrome110', 'safari16', 'firefox110'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  inject: ['src/lib/react-shim.js'],
  loader: { '.js': 'jsx', '.png': 'dataurl', '.svg': 'dataurl', '.json': 'json' },
  plugins: [globalsPlugin, assetsPlugin, optionalPlugin],
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

const { droppedFaces } = buildDsOffline();
if (droppedFaces.length) console.log(`ds-offline: ${droppedFaces.length} @font-face rules without a shipped font file left out`);

const guard = () => assertNoRemoteCss([path.join(ROOT, 'dist', 'ds'), path.resolve(ROOT, outdir)]);

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  guard();
  console.log('watching src/ ...');
} else {
  await esbuild.build(options);
  guard();
}
