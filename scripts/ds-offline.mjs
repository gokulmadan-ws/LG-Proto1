// Derives offline-safe copies of the Springboard 2.0 stylesheets into dist/ds/. design-system/ stays pristine.
//
// Why: design-system/colors_and_type.css starts with two remote @imports (Google Fonts for Geist, cdnjs for
// Font Awesome). On a venue network that accepts the connection and then goes quiet they block first paint for
// 8+ seconds, and the cdnjs one loads Font Awesome a second time (vendor/ already ships 6.5.2).
//
// Output (all same-origin, zero external requests):
//   dist/ds/colors_and_type.css   colors_and_type.css minus the remote @imports, font paths fixed,
//                                 @font-face rules whose TTF is not shipped removed (they would 404 and, worse,
//                                 shadow the nearest shipped weight)
//   dist/ds/styles.css            fig-tokens.css + colors_and_type.css (same order as design-system/styles.css,
//                                 inlined: one request, no @import waterfall) + self-hosted Geist Mono 400/500
//
// Run automatically by scripts/build.mjs. Safe to run on its own: node scripts/ds-offline.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(ROOT, ...p);

/** Several agents build at the same time into the same dist/ds: write to a temp file and rename, so a reader never sees half a file. */
function writeAtomic(file, content) {
  try { if (fs.readFileSync(file, 'utf8') === content) return; } catch (e) { /* not there yet */ }
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

export function buildDsOffline() {
  const outDir = rel('dist', 'ds');
  fs.mkdirSync(outDir, { recursive: true });

  // 1. colors_and_type.css
  let css = fs.readFileSync(rel('design-system', 'colors_and_type.css'), 'utf8');
  css = css.replace(/^[ \t]*@import\s+url\(\s*['"]?https?:[^)]*\)\s*;?[ \t]*\r?$/gm, '');          // the two remote imports
  const droppedFaces = [];
  css = css.replace(/@font-face\s*\{[^}]*\}\s*/g, (face) => {
    const m = face.match(/url\(\s*['"]?(fonts\/[^'")]+)['"]?\s*\)/);
    if (!m) return face;
    if (!fs.existsSync(rel('design-system', m[1]))) { droppedFaces.push(m[1]); return ''; }
    return face;
  });
  css = css.replace(/url\(\s*(['"]?)fonts\//g, "url($1../../design-system/fonts/");                // keep the local Inter files
  if (/https?:\/\//.test(css)) throw new Error('ds-offline: remote URL still present in derived colors_and_type.css');

  // 2. Geist Mono, self-hosted (npm i -D @fontsource/geist-mono; the two woff2 files are committed in assets/fonts)
  fs.mkdirSync(rel('assets', 'fonts'), { recursive: true });
  const mono = [400, 500].map((w) => ({ w, name: `geist-mono-latin-${w}-normal.woff2` }));
  for (const f of mono) {
    const dst = rel('assets', 'fonts', f.name);
    const src = rel('node_modules', '@fontsource', 'geist-mono', 'files', f.name);
    if (!fs.existsSync(dst)) {
      if (!fs.existsSync(src)) throw new Error(`ds-offline: ${f.name} missing. Run: npm i -D @fontsource/geist-mono`);
      fs.copyFileSync(src, dst);
    }
  }
  const monoFaces = mono.map((f) =>
    `@font-face { font-family: 'Geist Mono'; font-style: normal; font-weight: ${f.w}; font-display: swap; src: url('../../assets/fonts/${f.name}') format('woff2'); }`).join('\n');

  const banner = '/* Derived by scripts/ds-offline.mjs from design-system/. Do not edit: regenerate with npm run build. */\n';
  writeAtomic(path.join(outDir, 'colors_and_type.css'), banner + css);
  const tokens = fs.readFileSync(rel('design-system', 'components', 'fig-tokens.css'), 'utf8');
  writeAtomic(path.join(outDir, 'styles.css'),
    banner + '/* 1. fig-tokens.css (verbatim) */\n' + tokens + '\n/* 2. colors_and_type.css (offline) */\n' + css +
    '\n/* 3. Geist Mono, self-hosted */\n' + monoFaces + '\n');
  return { droppedFaces };
}

/**
 * Throws if any CSS file directly inside one of `dirs` references an absolute http(s) URL. Comments and the
 * http://www.w3.org/ XML namespace URIs (inside inline SVG data URIs, never requested) are ignored.
 */
export function assertNoRemoteCss(dirs) {
  const bad = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.css')) continue;
      const text = fs.readFileSync(path.join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/https?:\/\/www\.w3\.org\/[^\s'")%]*/g, '');
      const m = text.match(/https?:\/\/[^\s'")]*/);
      if (m) bad.push(`${path.relative(ROOT, path.join(dir, f))}: ${m[0]}`);
    }
  }
  if (bad.length) throw new Error('CSS must not reference remote hosts:\n  ' + bad.join('\n  '));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { droppedFaces } = buildDsOffline();
  assertNoRemoteCss([rel('dist', 'ds')]);
  console.log(`ds-offline: wrote dist/ds/styles.css + colors_and_type.css (dropped ${droppedFaces.length} @font-face rules with no shipped file)`);
}
