// Runs every tests/e2e/*.mjs (or the ones named on the command line) as its own process and summarises.
//   node tests/run-e2e.mjs                 all files against dist/
//   node tests/run-e2e.mjs opportunities   only tests/e2e/opportunities.mjs
//   KONTOR_DIST=.scratch/V2 node tests/run-e2e.mjs opportunities     against another build directory
// Convention for e2e files: `const h = await launch({ dist: process.env.KONTOR_DIST || null })` (tests/lib/harness.mjs),
// print 'ok   <name>' / 'FAIL <name>: <why>' lines, exit non-zero if anything failed.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'e2e');
const wanted = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && (!wanted.length || wanted.some((w) => f.startsWith(w)))).sort();
let failed = 0;
for (const f of files) {
  console.log(`\n=== ${f}`);
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { failed += 1; console.log(`=== ${f} FAILED (exit ${r.status})`); }
}
console.log(`\n${files.length - failed} of ${files.length} e2e files passed`);
process.exit(failed ? 1 : 0);
