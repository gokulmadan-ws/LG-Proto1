// npm run standalone  ->  dist/kontor-prototype.html
//
// ONE self-contained HTML file that works from file:// (double-click, email attachment, USB stick) with zero external
// requests: index.html with every stylesheet and script inlined, and every font and the texture as base64 data URIs.
//   Fonts embedded: Inter 400/500/600/700, Inter Display 500/600/700, Geist Mono 400/500, Font Awesome solid + regular (woff2).
//   Left out on purpose: italics, light weights, Font Awesome brands and v4 shims (nothing in the prototype uses them).
//
//   node scripts/make-standalone.mjs                  builds dist/ first (strict), then writes dist/kontor-prototype.html
//   node scripts/make-standalone.mjs --no-build       reuse the existing dist/ (dist/app.js, dist/app.css, dist/ds/)
//   node scripts/make-standalone.mjs --out some.html  other output path;  --no-minify keeps the app code readable
// The size must stay under 12 MB (the script fails otherwise). Test it with: node tests/smoke.mjs --standalone
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i === -1 ? d : argv[i + 1]; };
const has = (k) => argv.includes('--' + k);
const OUT = path.resolve(ROOT, flag('out', 'dist/kontor-prototype.html'));
const MINIFY = !has('no-minify');
const LIMIT_MB = 12;

if (!has('no-build')) execFileSync('node', ['scripts/build.mjs', '--strict'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
for (const f of ['dist/app.js', 'dist/app.css', 'dist/ds/styles.css']) if (!fs.existsSync(f)) throw new Error(`${f} is missing: run npm run build`);

// Font files that ship inside the single file (basename match).
const KEEP_FONTS = new Set([
  'Inter_18pt-Regular.ttf', 'Inter_18pt-Medium.ttf', 'Inter_18pt-SemiBold.ttf', 'Inter_18pt-Bold.ttf',
  'Inter_28pt-Medium.ttf', 'Inter_28pt-SemiBold.ttf', 'Inter_28pt-Bold.ttf',
  'geist-mono-latin-400-normal.woff2', 'geist-mono-latin-500-normal.woff2',
  'fa-solid-900.woff2', 'fa-regular-400.woff2',
]);
const MIME = { '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const b64 = (file) => `data:${MIME[path.extname(file)] || 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
const unq = (s) => s.trim().replace(/^['"]|['"]$/g, '');

/** Inline url() references of one stylesheet (cssFile = where it is served from, so relative paths resolve). */
function inlineCss(css, cssFile) {
  const dir = path.dirname(cssFile);
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // 1. @font-face: keep wanted files only, one data-URI source each (woff2 preferred)
  css = css.replace(/@font-face\s*\{[^}]*\}/g, (face) => {
    const entries = [...face.matchAll(/url\(([^)]+)\)\s*(?:format\(([^)]+)\))?/g)].map((m) => ({ url: unq(m[1]), fmt: m[2] ? unq(m[2]) : null }))
      .filter((e) => !e.url.startsWith('data:') && KEEP_FONTS.has(path.basename(e.url.split(/[?#]/)[0])));
    if (!entries.length) return '';
    const pick = entries.find((e) => e.url.includes('.woff2')) || entries[0];
    const file = path.resolve(dir, pick.url.split(/[?#]/)[0]);
    const fmt = pick.fmt || (file.endsWith('.woff2') ? 'woff2' : 'truetype');
    return face.replace(/src\s*:[^;}]*;?/, `src: url(${b64(file)}) format("${fmt}");`);
  });
  // 2. every other url(): images (the blob texture), never http(s)
  css = css.replace(/url\(([^)]+)\)/g, (m, raw) => {
    const u = unq(raw);
    if (u.startsWith('data:') || u.startsWith('#')) return m;
    if (/^https?:/.test(u)) throw new Error(`remote URL in ${path.relative(ROOT, cssFile)}: ${u}`);
    const file = path.resolve(dir, u.split(/[?#]/)[0]);
    if (!fs.existsSync(file)) throw new Error(`${path.relative(ROOT, cssFile)} references ${u} which does not exist`);
    return `url(${b64(file)})`;
  });
  return MINIFY ? esbuild.transformSync(css, { loader: 'css', minify: true }).code : css;
}

function inlineJs(file) {
  let js = fs.readFileSync(file, 'utf8').replace(/\n?\/\/# sourceMappingURL=.*$/gm, '');
  if (MINIFY && !/\.min\.js$/.test(file)) js = esbuild.transformSync(js, { loader: 'js', minify: true, target: 'chrome110' }).code;
  return js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

let html = fs.readFileSync('index.html', 'utf8');
let styles = 0, scripts = 0;
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  if (/^https?:/.test(href)) throw new Error('index.html links a remote stylesheet: ' + href);
  styles += 1;
  return `<style data-src="${href}">${inlineCss(fs.readFileSync(href, 'utf8'), path.resolve(href))}</style>`;
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  if (/^https?:/.test(src)) throw new Error('index.html loads a remote script: ' + src);
  scripts += 1;
  return `<script data-src="${src}">${inlineJs(path.resolve(src))}</script>`;
});
html = html.replace(/<!--[\s\S]*?-->/g, '');          // build notes in index.html are not needed in the artefact

if (/(?:src|href)=["']https?:/i.test(html)) throw new Error('standalone still references a remote URL');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const mb = fs.statSync(OUT).size / 1048576;
console.log(`standalone: ${path.relative(ROOT, OUT)}  ${mb.toFixed(2)} MB  (${styles} stylesheets, ${scripts} scripts inlined, minify ${MINIFY ? 'on' : 'off'})`);
if (mb >= LIMIT_MB) { console.error(`Too large: ${mb.toFixed(2)} MB (limit ${LIMIT_MB} MB)`); process.exit(1); }
