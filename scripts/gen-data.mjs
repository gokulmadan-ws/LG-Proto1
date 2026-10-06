// Usage: node scripts/gen-data.mjs [outfile]   (default src/data/sample.json). Deterministic: two runs are byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSample } from './lib/seed.mjs';
import { buildProvenance, QUESTIONS } from './lib/provenance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'src/data/sample.json'));
const s = buildSample();
const { extractions, documents } = buildProvenance(s.contracts);
for (const c of s.contracts) delete c._src; // generator-only field
const dataset = { council: s.council, suppliers: s.suppliers, aliases: s.aliases, questions: QUESTIONS, contracts: s.contracts, extractions, documents, payments: s.payments };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(dataset));
console.log('wrote', path.relative(process.cwd(), out) || out, fs.statSync(out).size, 'bytes');
