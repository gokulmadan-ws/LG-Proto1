// Bundles src/main.jsx -> dist/app.js (+ dist/app.css). React is a browser global (vendor/ UMD),
// the Springboard components come from window.Springboard20DesignSystem_019e02.
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
// Optional: --outdir <dir> (default dist) and --entry <file> (default src/main.jsx), so parallel agents can build in isolation.
const flag = (k, d) => { const i = process.argv.indexOf('--' + k); return i === -1 ? d : process.argv[i + 1]; };
const outdir = flag('outdir', 'dist');
const entry = flag('entry', 'src/main.jsx');

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
  loader: { '.js': 'jsx', '.png': 'dataurl', '.svg': 'dataurl' },
  plugins: [globalsPlugin],
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('watching src/ ...');
} else {
  await esbuild.build(options);
}
