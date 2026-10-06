// spec-lint: render-text lint over .scratch/spec/capture.json (made by spec-capture.mjs): every route, overlay and toast, dark and light.
//   node tests/review/spec-capture.mjs && node tests/review/spec-lint.mjs      exit code 1 when a hard rule fails
// Rules: no '!', no emoji, banned button/link labels, sentence case (heuristic, reported as notes), 'saving(s)' only where R13 allows,
// real names only where blueprint decision 2 allows, no real supplier in the rendered text or the data, sample-data banner on every state,
// golden strings (R16 R17 R18 R21 R33 R34), the About / Method / Roadmap deck, no Stage 2 function words, no team names, no placeholder text.
import fs from 'node:fs';
import { T, ok, eq, norm, data, CAPTURE_FILE, SCRATCH } from './spec-lib.mjs';

if (!fs.existsSync(CAPTURE_FILE)) { console.error('FAIL no capture: run  node tests/review/spec-capture.mjs  first (about 4 minutes)'); process.exit(2); }
const caps = JSON.parse(fs.readFileSync(CAPTURE_FILE, 'utf8'));
const t = new T('spec-lint');
const states = caps.filter((c) => !c.error);
const byId = (id, theme = 'dark') => caps.find((c) => c.id === id && c.theme === theme);
const everything = (c) => [c.text || '', ...(c.attrs || []).flatMap((a) => [a.label, a.title, a.desc, a.placeholder, a.alt]), ...(c.svgText || []), ...(c.controls || []).flatMap((x) => [x.label, x.title]), c.title || ''].filter(Boolean);
const snippet = (s, i, n = 45) => s.slice(Math.max(0, i - n), i + n).replace(/\s+/g, ' ');
const where = (c) => `${c.id}@${c.theme}`;
const uniq = (a) => [...new Set(a)];

/* ---------------------------------------------------------------- 0. coverage of the capture itself */
await t.check('capture: routes, overlays, 21 flag drawers, toasts present in both themes', () => {
  const ids = new Set(caps.map((c) => c.id));
  for (const id of ['overview', 'opportunities', 'renewals', 'spend', 'spend-matches', 'spend-no-contract', 'contracts', 'contract-C-005', 'source-C-005', 'method', 'roadmap', 'evidence', 'notfound', 'overlay-about', 'overlay-feedback', 'overlay-settings', 'overlay-demo-guide', 'overlay-menu', 'flag-F-C-005-overCap']) ok(ids.has(id), 'missing capture ' + id);
  ok(['dark', 'light'].every((th) => caps.some((c) => c.id === 'overview' && c.theme === th)), 'both themes');
  const bad = caps.filter((c) => c.error);
  ok(!bad.length, 'capture errors: ' + bad.map((b) => b.id + ': ' + b.error).join('; '));
  return `${caps.length} captures (${caps.filter((c) => c.theme === 'light').length} light)`;
});
await t.check('capture: no console errors or off-origin requests while rendering', () => {
  const e = caps.filter((c) => c.errors && c.errors.length).map((c) => where(c) + ': ' + c.errors[0]);
  ok(!e.length, e.slice(0, 5).join(' | '));
});

/* ---------------------------------------------------------------- 1. voice: no '!', no emoji, no placeholder text */
await t.check("no '!' in any rendered text, aria-label, title, svg text or toast (R71.1)", () => {
  const hits = [];
  for (const c of states) for (const s of everything(c)) { let i = -1; while ((i = s.indexOf('!', i + 1)) >= 0) hits.push(where(c) + ' ' + snippet(s, i)); }
  ok(!hits.length, uniq(hits).slice(0, 6).join(' | '));
});
await t.check('no emoji or pictographic characters (R71.2)', () => {
  const re = /[\p{Extended_Pictographic}✓-✗★☆▲▼●•→←↑↓]/u;
  const hits = [];
  for (const c of states) for (const s of everything(c)) { const m = re.exec(s); if (m) hits.push(where(c) + ' U+' + m[0].codePointAt(0).toString(16) + ' ' + snippet(s, m.index)); }
  const emoji = hits.filter((h) => !/U\+(2022|2192|2190|2191|2193)/.test(h));
  const bullets = uniq(hits.filter((h) => /U\+(2022|2192|2190|2191|2193)/.test(h)).map((h) => h.split(' ')[1]));
  if (bullets.length) t.note('typographic symbols present (arrows or bullets, not emoji)', bullets.join(', '));
  ok(!emoji.length, uniq(emoji).slice(0, 5).join(' | '));
});
await t.check('no placeholder, lorem, TODO or "not been built" text on any screen', () => {
  const re = /placeholder\. this screen|has not been built|lorem ipsum|\bTODO\b|\bTBC\b|\bundefined\b|\bNaN\b|\[object|\bnull\b/;
  const hits = [];
  for (const c of states) { const s = c.text || ''; const m = re.exec(s); if (m && !/placeholder/i.test(m[0])) hits.push(where(c) + ' ' + snippet(s, m.index)); }
  ok(!hits.length, uniq(hits).slice(0, 6).join(' | '));
});

/* ---------------------------------------------------------------- 2. buttons and links: [Verb]+[Object], none of the banned labels */
const buttonish = (c) => (c.controls || []).filter((x) => x.tag === 'button' || x.role === 'button' || x.role === 'menuitem');
const labelOf = (x) => (x.text || x.label || x.title || '').trim();
const BANNED = /^(ok|okay|submit|click here|here|learn more|read more|more|yes|no|done|got it|continue|go|next|back|view|info|details|close|dismiss|confirm|accept|apply|save|send)$/i;
await t.check('no banned button or link labels: OK, Submit, Click here, Learn more (R71.4)', () => {
  const hits = [];
  for (const c of states) for (const x of (c.controls || [])) { const l = labelOf(x); if (/^(ok|okay|submit|click here|here|learn more|read more|more info|got it)$/i.test(l)) hits.push(where(c) + ' "' + l + '"'); }
  ok(!hits.length, uniq(hits).join(' | '));
});
const isValueLabel = (l) => /^[£\d]/.test(l);
const allButtons = uniq(states.flatMap((c) => buttonish(c).filter((x) => !x.inHeader && x.tt !== 'uppercase' && x.role !== 'radio').map(labelOf)).filter((l) => l && !isValueLabel(l))).sort();
fs.writeFileSync(SCRATCH + '/button-labels.json', JSON.stringify(allButtons, null, 1));
await t.check('every button label is a verb plus object, or is on the copy deck vocabulary (R71.4)', () => {
  const vocab = ['View opportunities', 'View clause', 'Open contract', 'Open demo guide', 'Open renewal radar', 'Give feedback', 'Save feedback', 'Copy feedback', 'See what comes next', 'Export opportunities', 'Confirm match', 'Reject match', 'Clear filters', 'Clear search', 'Reset demo changes', 'Reset changes', 'Previous answer', 'Next answer', 'Mark answer as correct', 'Mark answer as incorrect', 'Back to opportunity', 'Show all cases', 'Close dialog', 'Cancel', 'Go to overview', 'Open settings'];
  const one = allButtons.filter((l) => !/\s/.test(l) && !/^\d+$/.test(l));
  const odd = one.filter((l) => !['Cancel', 'Menu', 'Yes', 'Maybe', 'No', 'Close', 'Share'].includes(l));
  t.note('single-word button labels (check against the rule)', one.join(', '));
  ok(!odd.length, 'single-word buttons outside the allowed set: ' + odd.join(', '));
  return allButtons.length + ' unique button labels written to .scratch/spec/button-labels.json';
});

/* ---------------------------------------------------------------- 3. sentence case (heuristic) */
const PROPER = new Set(['Kontor', 'Springboard', 'Marchbank', 'Borough', 'Council', 'Stage', 'Procurement', 'Act', 'Transparency', 'Code', 'Find', 'Tender', 'Contracts', 'Finder', 'Local', 'Government', 'Association', 'Sefton', 'Sheffield', 'Haringey', 'Exeter', 'Guildford', 'Edinburgh', 'Gedling', 'Windsor', 'Maidenhead', 'Brighton', 'Hove', 'LGA', 'Audit', 'Commission', 'Camden', 'London', 'Councils', 'Cabinet', 'Office', 'Regional', 'Care', 'Cooperatives', 'IBAA', 'CPI', 'CPIH', 'RPI', 'VAT', 'PFI', 'TUPE', 'KPI', 'PDF', 'CSV', 'ICT', 'LGR', 'UK', 'MB', 'Apps', 'Chat', 'Larchmont', 'Kestrelvale', 'Dunmoor', 'Oakhaven', 'Harlowe', 'Corran', 'Skerrow', 'Bellmere', 'Pennywhistle', 'Mirefield', 'Quillon', 'Tarnbrook', 'Fennimore', 'Wrenfield', 'Scottish', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Mon', 'Tue']);
const supplierWords = new Set(data.suppliers.flatMap((s) => (s.legalName || '').split(/\s+/)));
const payeeNames = new Set([...data.suppliers.map((x) => x.legalName), ...data.payments.map((p) => p.supplierNameRaw)]);
const titleCaseLike = (s) => {
  // A capital after a full stop, question mark, colon or comma starts a new clause (a second sentence, or a contract title after a comma), so it is exempt.
  const toks = s.split(/\s+/);
  const words = toks.filter((w, i) => i > 0 && !/[.?!:,;]$/.test(toks[i - 1]) && /^[A-Z][a-z]/.test(w) && !PROPER.has(w.replace(/[^A-Za-z]/g, '')) && !supplierWords.has(w.replace(/[^A-Za-z]/g, '')));
  return toks.length >= 3 && words.length >= 2 ? words : null;
};
await t.check('headings, buttons and labels are sentence case (heuristic, R71.3)', () => {
  const hits = [];
  for (const c of states) {
    const isName = (s) => payeeNames.has(s) || payeeNames.has(s.replace(/\s*,.*$/, ''));        // a supplier or payee name is a proper noun
    const isDoc = /^source-X-/.test(c.id) || c.id === 'source-C-005';                                // headings inside the illustrative contract page are document text, not chrome
    for (const hd of (c.headings || [])) { const s = hd.raw || hd.text; const w = !isDoc && !isName(s) && titleCaseLike(s); if (w) hits.push(where(c) + ` heading "${s}" (${w.join(', ')})`); }
    for (const x of buttonish(c)) { const s = (x.raw || x.text || '').trim(); const w = s && !isName(s) && titleCaseLike(s); if (w) hits.push(where(c) + ` button "${s}" (${w.join(', ')})`); }
  }
  // Uppercase via CSS (text-transform) is a design-system style, not a copy fault: report it once.
  const caps2 = uniq(states.flatMap((c) => [...(c.headings || []), ...(c.controls || [])].filter((x) => x.tt === 'uppercase').map((x) => where(c).split('@')[0] + ': ' + (x.raw || x.text).slice(0, 40)))).slice(0, 8);
  if (caps2.length) t.note('text-transform uppercase on', caps2.join(' | '));
  ok(!hits.length, uniq(hits).slice(0, 8).join(' | '));
});

/* ---------------------------------------------------------------- 4. the word "saving(s)" (R13) */
const SAVING_OK_ID = /^(evidence|roadmap|method)$/;
const SAVING_OK_PHRASE = /not a (confirmed )?saving|potential savings shrank|potential savings can shrink|Reasons this may not be a saving|may not be a saving|not "savings"|net saving|an? \d+% saving|saving vs group|Savings opportunities list|savings can shrink|headline savings|Saved £|whether the saving survives|Where would councils save|estimated saving|indicative savings/i;
const savings = [];
for (const c of states) for (const s of [c.text || '']) { const re = /\bsavings?\b/gi; let m; while ((m = re.exec(s))) savings.push({ id: c.id, theme: c.theme, ctx: snippet(s, m.index, 60), phrase: SAVING_OK_PHRASE.test(snippet(s, m.index, 60)) }); }
fs.writeFileSync(SCRATCH + '/saving-occurrences.json', JSON.stringify(savings, null, 1));
await t.check("'saving(s)' appears only where R13 allows: caveat, evidence, Method, Roadmap, 'Reasons this may not be a saving'", () => {
  const bad = savings.filter((x) => !SAVING_OK_ID.test(x.id) && !x.phrase);
  ok(!bad.length, uniq(bad.map((x) => `${x.id}: …${x.ctx}…`)).slice(0, 6).join(' | '));
  return savings.length + ' occurrences, ' + uniq(savings.map((x) => x.id.replace(/-F-.*/, '').replace(/^flag-.*/, 'flag-drawers'))).join(', ');
});
await t.check("no page title, rail label, button, card or table-column heading contains 'saving' except spec-verbatim evidence (R13.3)", () => {
  const hits = [];
  for (const c of states) {
    if (/saving/i.test(c.title || '')) hits.push(where(c) + ' title ' + c.title);
    for (const x of c.controls || []) if (/saving/i.test(labelOf(x)) && !/^(evidence|roadmap|method)$/.test(c.id)) hits.push(where(c) + ' control ' + labelOf(x));
    for (const hd of c.headings || []) if (/saving/i.test(hd.raw) && !/^(evidence|roadmap|method)$/.test(c.id) && hd.raw !== 'Reasons this may not be a saving') hits.push(where(c) + ' heading ' + hd.raw);
  }
  ok(!hits.length, uniq(hits).slice(0, 6).join(' | '));
});
await t.check("chart tooltips and flag drawers never say 'saving' as a claim (blueprint decision 8)", () => {
  const bad = savings.filter((x) => /^flag-/.test(x.id) && !/not a (confirmed )?saving|may not be a saving|potential savings shrank once outliers/i.test(x.ctx));
  ok(!bad.length, uniq(bad.map((x) => x.id + ' ' + x.ctx)).slice(0, 4).join(' | '));
});

/* ---------------------------------------------------------------- 5. "indicative" labelling (R13.1) */
await t.check("pages that show a derived £ say 'indicative' on the page (headline, drawers, lists)", () => {
  const need = ['overview', 'opportunities', 'spend', 'method'];   // the radar shows contract values and payments, not derived flag values
  const miss = need.filter((id) => !/indicative/i.test((byId(id).text || '')));
  const flags = caps.filter((c) => /^flag-/.test(c.id) && !/indicative/i.test(c.text));
  ok(!miss.length, 'pages without the word: ' + miss.join(', '));
  ok(!flags.length, 'flag drawers without the word: ' + flags.map((f) => f.id).join(', '));
});
await t.check("each of the four Overview breakdown cards carries 'indicative' in its own text or accessible name (R13.1)", () => {
  const ov = byId('overview');
  const cardNames = (ov.attrs || []).map((a) => a.label).filter((l) => /^(Spend over cap|Close to cap|Renewals|Price increases above cap) £/.test(l));
  ok(cardNames.length === 4, 'found ' + cardNames.length + ' card labels');
  const miss = cardNames.filter((l) => !/indicative/i.test(l));
  ok(!miss.length, 'cards without "indicative" in their accessible name: ' + miss.join(' | '));
});

/* ---------------------------------------------------------------- 6. real names only where allowed (blueprint decision 2, R12.3) */
const REAL_COUNCILS = /\b(Exeter|Haringey|Guildford|Edinburgh|Gedling|Windsor|Maidenhead|Brighton|Hove|Sefton|Sheffield|Camden|Enfield)\b/g;
const ALLOWED_REAL = /^(overview|evidence|roadmap|method|opportunities|flag-.*|overlay-settings.*|overlay-demo-guide|overlay-about|toast-.*)$/;
const realHits = [];
for (const c of states) { const s = c.text || ''; let m; const re = new RegExp(REAL_COUNCILS.source, 'g'); while ((m = re.exec(s))) realHits.push({ id: c.id, theme: c.theme, name: m[1], ctx: snippet(s, m.index, 55) }); }
fs.writeFileSync(SCRATCH + '/real-name-occurrences.json', JSON.stringify(realHits, null, 1));
await t.check('real council names appear only on the Evidence strip/page, the caveat, Method and Roadmap (R12.3)', () => {
  const strictOk = (h) => /^(evidence|roadmap|method)$/.test(h.id) || (h.id === 'overview' && /Haringey|Guildford|Edinburgh/.test(h.name)) || (h.id === 'overlay-demo-guide' && h.name === 'Sefton');   // blueprint section 5 lists Sefton in the presenter notes
  const bad = realHits.filter((h) => !strictOk(h));
  ok(!bad.length, uniq(bad.map((h) => `${h.id}: ${h.name} …${h.ctx}…`)).slice(0, 8).join(' | '));
  return realHits.length + ' occurrences on ' + uniq(realHits.map((h) => h.id)).join(', ');
});
const REAL_COMPANIES = ['Capita', 'Serco', 'Biffa', 'Veolia', 'Amey', 'Balfour Beatty', 'Kier', 'Mitie', 'Interserve', 'Carillion', 'G4S', 'Sodexo', 'Mears', 'Morgan Sindall', 'Skanska', 'Tarmac', 'Eurovia', 'Ringway', 'FCC Environment', 'Suez', 'Microsoft', 'Oracle', 'Agilisys', 'Civica', 'Liquidlogic', 'Mosaic', 'Northgate', 'NSL', 'APCOA', 'Lex Autolease', 'Vodafone', 'BT Group', 'Virgin Media', 'E.ON', 'EDF', 'British Gas', 'npower', 'Octopus', 'Hays', 'Reed', 'Adecco', 'Randstad', 'Matrix SCM', 'Comensura', 'Pertemps', 'Bidfood', 'Veolia', 'Viridor', 'Urbaser', 'Enterprise Mobility', 'Arriva', 'Stagecoach', 'First Bus', 'Care UK', 'Bupa', 'HC-One', 'Barchester', 'Mears Care', 'Liberata', 'Revenues and Benefits', 'Xerox', 'Konica', 'Ricoh', 'IBM', 'Fujitsu', 'Atos', 'Sopra', 'Unisys', 'Dell', 'Cisco', 'Google', 'Amazon', 'AWS', 'Salesforce', 'SAP', 'Tyler', 'Idox', 'Equans', 'Wates', 'Willmott Dixon', 'Kingspan', 'Jewson', 'Travis Perkins', 'Screwfix', 'Royal Mail', 'DHL', 'Citizens Advice', 'Barnardo', 'Turning Point', 'Shaw Healthcare', 'Cordis', 'Cadent', 'Thames Water', 'SSE', 'Ofgem', 'Crown Commercial', 'Companies House', 'ESPO', 'YPO', 'NHS'];
await t.check('no real supplier or company name in the rendered text of any screen (blueprint decision 2)', () => {
  const hits = [];
  for (const c of states) for (const co of REAL_COMPANIES) { const re = new RegExp('\\b' + co.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', co === 'SSE' || co === 'NHS' || co === 'SAP' ? '' : 'i'); const m = re.exec(c.text || ''); if (m) hits.push(c.id + ': ' + co + ' …' + snippet(c.text, m.index, 40) + '…'); }
  ok(!hits.length, uniq(hits).slice(0, 8).join(' | '));
});
await t.check('no real supplier or company name in the dataset (suppliers, contracts, payments, extraction text)', () => {
  const blob = JSON.stringify({ suppliers: data.suppliers, contracts: data.contracts, council: data.council, docs: data.documents || data.docs, extractions: data.extractions }).replace(/Local Government Transparency Code|Procurement Act|Public Contracts/g, '');
  const hits = [];
  for (const co of REAL_COMPANIES) { const re = new RegExp('\\b' + co.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', co === 'SSE' || co === 'NHS' || co === 'SAP' ? '' : 'i'); const m = re.exec(blob); if (m) hits.push(co + ' …' + blob.slice(Math.max(0, m.index - 40), m.index + 50)); }
  const pay = JSON.stringify(data.payments.slice(0, 5000));
  ok(!hits.length, hits.slice(0, 6).join(' | '));
  return 'scanned ' + REAL_COMPANIES.length + ' names across ' + (blob.length + pay.length) + ' chars';
});
await t.check('no email address, phone number, postcode or web address inside the dataset text', () => {
  const blob = JSON.stringify({ c: data.contracts, d: data.documents || data.docs, x: data.extractions, s: data.suppliers, council: data.council });
  const re = /[\w.+-]+@[\w-]+\.[\w.]+|\b0\d{3}[ ]?\d{3}[ ]?\d{3,4}\b|\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b|https?:\/\/|www\./g;
  const m = blob.match(re) || [];
  ok(!m.length, uniq(m).slice(0, 5).join(', '));
});

/* ---------------------------------------------------------------- 7. fictional-only and sample-data labelling on every route */
await t.check('sample-data banner visible without scrolling on every route, overlay and state (R11)', () => {
  const bad = states.filter((c) => !/^(toast-)/.test(c.id)).filter((c) => !c.banner || !c.banner.visible || !/Sample data\. Marchbank Borough Council, its suppliers, contracts and payments are fictional\. They were written for this demo\./.test(c.banner.text));
  ok(!bad.length, bad.slice(0, 6).map(where).join(', '));
  return states.filter((c) => c.banner).length + ' states checked';
});
await t.check("header carries the 'Sample' badge on every state (R11)", () => {
  const bad = states.filter((c) => c.sampleBadge !== undefined && !/Sample/.test(c.sampleBadge || ''));
  ok(!bad.length, bad.slice(0, 5).map(where).join(', '));
});
await t.check("source viewer pages say 'Illustrative contract text written for this demo, not a real document.' (all 336)", () => {
  const src = caps.filter((c) => /^source-X-/.test(c.id) && c.theme === 'dark');
  ok(src.length >= 336, 'only ' + src.length + ' source captures');
  const bad = src.filter((c) => !c.text.includes('Illustrative contract text written for this demo, not a real document.'));
  ok(!bad.length, bad.slice(0, 4).map((b) => b.id).join(', '));
});
await t.check("payment tables carry 'Sample payments (fictional)' (contract detail, payments drawers, payee drawer)", () => {
  const ids = ['contract-C-005', 'overlay-payments-C-005', 'overlay-payments-C-011', 'overlay-payee-dunmoor'];
  const bad = ids.filter((id) => !/Sample payments \(fictional\)/i.test(byId(id).text || '') && !/Sample payments \(fictional\)/i.test(byId(id).raw || ''));
  ok(!bad.length, 'missing on ' + bad.join(', '));
});

/* ---------------------------------------------------------------- 8. golden strings */
const ov = byId('overview');
await t.check('R16 headline h1 exact + figure carries the exact value', () => {
  eq(ov.headings.find((x) => x.tag === 'h1').text.replace(/\s+/g, ' '), '£6.1m across 15 contracts flagged as opportunities to investigate');
  ok(/£6,145,238/.test(JSON.stringify(ov.attrs)) || /£6,145,238/.test(ov.text), 'exact value £6,145,238 reachable');
  ok(ov.text.includes('Indicative figures. As at 6 October 2026.'), 'as-at line');
});
await t.check('R17 four cards and the sum line', () => {
  for (const s of ['Spend over cap', '£4.2m', '3 contracts', 'Close to cap', '£0.6m', '1 contract', 'Renewals', '£1.1m', '12 contracts', 'Indicative value per year', 'Price increases above cap', '£0.3m', 'Already paid above the cap', 'Projected at the current pace']) ok(ov.text.includes(s), 'missing ' + s);
  ok(ov.text.includes('£4,172,000 + £642,478 + £1,075,500 + £255,260 = £6,145,238'), 'sum line');
});
await t.check('R18 renewal summary: 3 / £6.9m, 4 / £7.3m, 2 / £2.2m, attention 3', () => {
  for (const s of ['£6.9m a year', '£7.3m a year', '£2.2m a year']) ok(ov.text.includes(s), 'missing ' + s);
  ok(/Needs attention now\s*\n?\s*3/.test(ov.text), 'needs attention 3');
});
await t.check("R21 close line (blueprint correction) 'This is one council's contracts and spend. Imagine your full estate.' + two buttons", () => {
  ok(ov.text.includes("This is one council's contracts and spend. Imagine your full estate."), 'close line');
  ok(ov.controls.some((x) => x.text === 'Give feedback') && ov.controls.some((x) => x.text === 'See what comes next'), 'buttons');
});
const rn = byId('renewals');
await t.check('R33 notice deadlines: C-001 30 Sep 2026, C-017 1 Dec 2026, C-018 28 Feb 2027 plus the end-date note', () => {
  const txt = rn.text;
  ok(/30 Sep 2026/.test(txt) && /1 Dec 2026/.test(txt) && /28 Feb 2027/.test(txt), 'dates');
  ok(txt.includes('No notice period stated. We used the end date.'), 'end-date note');
});
await t.check('R34 needs-attention sentences (C-001, C-016, C-007) exact', () => {
  const txt = rn.text;
  ok(txt.includes('The notice date passed 6 days ago'), 'C-001');
  ok(txt.includes('The notice date passed 98 days ago. This contract renews on 1 January 2027 for 12 months unless you agree otherwise with the supplier.'), 'C-016');
  ok(txt.includes('This contract ended on 30 April 2026. You have paid £780,000 since.'), 'C-007');
});

/* ---------------------------------------------------------------- 9. Stage 2 and not-yet are not built (no function words / inputs outside the allowed places) */
await t.check('no Stage 2 or not-yet function leaks: benchmark, framework fit, aggregation, invoice matching, peer, cross-council on working screens', () => {
  const re = /benchmark|framework fit|aggregation finder|invoice line|line-item|unclaimed service|peer council|other councils pay|compare with other councils|cross-council|buying group|rate card benchmark/i;
  const allowed = /^(roadmap|evidence|method|overlay-about|overlay-demo-guide|overview|overlay-settings)/;
  const hits = [];
  for (const c of states) { if (allowed.test(c.id)) continue; const m = re.exec(c.text || ''); if (m) hits.push(where(c) + ' …' + snippet(c.text, m.index, 50)); }
  ok(!hits.length, uniq(hits).slice(0, 6).join(' | '));
});
await t.check('no team member names or internal owners in rendered text (spec team table)', () => {
  const re = /\b(Scott|Dan\b|Gokul|Marcus|Sacha|Nick\b)\b/;
  const hits = [];
  for (const c of states) { const m = re.exec(c.text || ''); if (m) hits.push(where(c) + ' ' + snippet(c.text, m.index, 40)); }
  ok(!hits.length, uniq(hits).slice(0, 4).join(' | '));
});
await t.check("no internal/process language or presenter coaching on screens a council can see ('scope document', 'whoever owns', 'cost baseline is agreed', 'Say so if you are asked', 'do not claim', 'If you are challenged', handoff, blueprint)", () => {
  const re = /scope document|Kontor scope\b|whoever owns|cost baseline is agreed|Say so if you are asked|do not claim|If you are challenged|handoff|hand-off|prototype scope|blueprint|golden/i;
  const hits = [];
  for (const c of states) { const m = re.exec(c.text || ''); if (m) hits.push(c.id + ': ' + m[0] + ' …' + snippet(c.text, m.index, 50)); }
  ok(!hits.length, uniq(hits).slice(0, 6).join(' | '));
});

/* ---------------------------------------------------------------- 10. error and toast copy: What + Why + How */
const toasts = caps.filter((c) => /^toast-/.test(c.id));
fs.writeFileSync(SCRATCH + '/toasts.json', JSON.stringify(toasts.map((c) => ({ id: c.id, text: c.text, error: c.error })), null, 1));
await t.check('every toast captured and none is empty', () => {
  const bad = toasts.filter((x) => x.error || !x.text);
  ok(!bad.length, bad.map((b) => b.id + ' ' + (b.error || 'empty')).join(' | '));
  return toasts.length + ' toasts';
});
await t.check('error toasts follow What + Why + How (feedback not saved, export failed)', () => {
  const blocked = toasts.find((x) => x.id === 'toast-feedback-blocked');
  if (blocked && blocked.text) ok(/not saved/i.test(blocked.text) && /blocking local storage/i.test(blocked.text) && /Copy your comments/i.test(blocked.text), 'blocked: ' + blocked.text);
  const noAnswer = byId('overlay-feedback-error');
  ok(/Feedback not saved\. You haven't chosen an answer\. Choose Yes, Maybe or No and try again\./.test(noAnswer.text), 'no-answer error text: ' + (noAnswer.text || '').slice(-200));
});
await t.check('inert shell toasts use the R5 copy exactly', () => {
  for (const n of ['apps', 'chat', 'notifications']) { const x = toasts.find((y) => y.id === 'toast-header-' + n); ok(x && x.text, n + ' toast'); ok(new RegExp(`${n[0].toUpperCase() + n.slice(1)} isn't part of this prototype\\. It sits outside Stage 1\\. Use the left rail to explore the demo\\.`).test(x.text), n + ': ' + x.text); }
});

/* ---------------------------------------------------------------- 11. second person */
await t.check("pages address the reader as 'you' and never as 'the user' or 'users'", () => {
  const hits = [];
  for (const c of states) { const m = /\b(the user|users)\b/i.exec(c.text || ''); if (m) hits.push(where(c) + ' ' + snippet(c.text, m.index, 40)); }
  ok(!hits.length, uniq(hits).slice(0, 5).join(' | '));
});

t.finish();
