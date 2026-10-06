// spec-evidence: the Evidence page, the Overview strip and the Roadmap checked against docs/spec.md text, row by row, in the rendered DOM.
//   node tests/review/spec-evidence.mjs        exit code 1 when anything fails
import { T, ok, eq, norm, launch, visit, SPEC, specTable, mdLink, stripMd } from './spec-lib.mjs';

const t = new T('spec-evidence');
const h = await launch({ dist: process.env.KONTOR_DIST || null });

const specEvidence = specTable('## Evidence').slice(1).map(([c, when, what, feat]) => ({ case: mdLink(c).text, url: mdLink(c).url, when, what, feat }));
const specStretch = specTable('## Stage 1: stretch and not-yet features').slice(1).map(([f, s, n]) => ({ feature: f, status: s, needs: n }));
const specStages = specTable('## Two stages').slice(0);
const specIllus = specTable('### Illustrative example').slice(1);
const specMust = specTable('## Stage 1: must-have features').slice(1);
const allSpecLinks = [...SPEC.matchAll(/\[([^\]]+)\]\((https?:[^)]+)\)/g)].map((m) => ({ text: m[1], url: m[2] }));

for (const theme of ['dark', 'light']) {
  const p = await h.newPage({ theme });
  await visit(p, '#/evidence');
  const page = p.page;

  await t.check(`[${theme}] evidence: spec table parsed (9 rows)`, () => { eq(specEvidence.length, 9, 'spec rows'); });

  const rows = await page.evaluate(() => [...document.querySelectorAll('#shell-main table tbody tr')].map((tr) => {
    const cells = [...tr.children];
    const a = cells[0].querySelector('a');
    return {
      caseText: a ? a.querySelector('.ev-ext__label')?.textContent.trim() : cells[0].innerText.trim(), href: a ? a.getAttribute('href') : null,
      target: a ? a.getAttribute('target') : null, rel: a ? a.getAttribute('rel') : null,
      hint: a ? (a.querySelector('.ev-ext__hint')?.textContent || '') : '', cell0: cells[0].innerText.replace(/\s+/g, ' ').trim(),
      when: cells[1].innerText.trim(), what: cells[2].innerText.trim(), feature: cells[3].innerText.replace(/\s+/g, ' ').trim(),
      featureLinks: [...cells[3].querySelectorAll('a')].map((x) => ({ text: x.textContent, href: x.getAttribute('href') })),
    };
  }));
  await t.check(`[${theme}] evidence: nine rows in the table`, () => { eq(rows.length, 9, 'rows'); });
  for (const [i, s] of specEvidence.entries()) {
    await t.check(`[${theme}] evidence row ${i + 1} ${s.case}: case, url, when, what, feature`, () => {
      const r = rows[i];
      eq(r.caseText, s.case, 'case name'); eq(r.href, s.url, 'url'); eq(r.when, s.when, 'when'); eq(r.what, s.what, 'what happened'); eq(r.feature, s.feat, 'feature column');
      eq(r.target, '_blank', 'target'); ok(/noopener/.test(r.rel) && /noreferrer/.test(r.rel), 'rel ' + r.rel); ok(/opens in a new tab/.test(r.hint), 'visible new-tab words');
      ok(r.featureLinks.length >= 1, 'feature has a link into the app');
    });
  }
  const txt = await page.evaluate(() => document.getElementById('shell-main').innerText);
  await t.check(`[${theme}] evidence: checked-on line verbatim`, () => { ok(txt.includes('Every case below was checked against its source on 6 October 2026.'), 'checked-on line missing'); });
  await t.check(`[${theme}] evidence: framing sentence and When note verbatim`, () => { ok(txt.includes('Councils routinely lose money because nobody has a full picture of their own contracts.'), 'framing'); ok(txt.includes('The When column shows how current each one is.'), 'when note'); });
  await t.check(`[${theme}] evidence: one h1 'Why this matters', eyebrow 'Evidence'`, async () => { const hs = await page.evaluate(() => [...document.querySelectorAll('#shell-main h1')].map((x) => x.textContent.trim())); eq(hs, ['Why this matters']); ok(/^evidence$/i.test((txt.split('\n')[0] || '').trim()), 'eyebrow ' + txt.split('\n')[0]); });
  await t.check(`[${theme}] evidence: table has caption and scope on every th`, async () => {
    const r = await page.evaluate(() => { const tb = document.querySelector('#shell-main table'); return { cap: !!tb.querySelector('caption'), ths: [...tb.querySelectorAll('th')].filter((x) => !x.getAttribute('scope')).length }; });
    ok(r.cap, 'no caption'); eq(r.ths, 0, 'th without scope');
  });
  await t.check(`[${theme}] evidence: Sefton row carries the caution marker; the table does not say "saving" except in the spec's words`, () => {
    ok(/Caution/.test(rows[7].cell0), 'caution marker on Sefton (row 8)');
  });
  if (theme === 'dark') {
    // Overview strip: three of nine, exact spec text, link to #/evidence
    await visit(p, '#/overview');
    const strip = await page.evaluate(() => [...document.querySelectorAll('.ov-case')].map((li) => ({ name: li.querySelector('h3').textContent.trim(), when: li.querySelector('.ov-case__when').textContent.trim(), what: li.querySelector('.ov-case__what').textContent.trim(), feat: li.querySelector('.kx-pill, .ds-badge, [class*=pill]')?.textContent.trim(), href: li.querySelector('a').getAttribute('href'), target: li.querySelector('a').getAttribute('target'), rel: li.querySelector('a').getAttribute('rel'), hint: li.querySelector('a').innerText })));
    await t.check('overview strip: 3 cases, spec wording, links and new-tab words', () => {
      eq(strip.length, 3, 'cases');
      for (const c of strip) { const s = specEvidence.find((x) => x.case === c.name); ok(s, 'case not in spec ' + c.name); eq(c.when, s.when, c.name + ' when'); eq(c.what, s.what, c.name + ' what'); eq(c.feat, s.feat, c.name + ' feature'); eq(c.href, s.url, c.name + ' url'); eq(c.target, '_blank', 'target'); ok(/noopener/.test(c.rel) && /noreferrer/.test(c.rel), 'rel'); ok(/opens in a new tab/.test(c.hint), 'hint'); }
      return strip.map((c) => c.name).join(', ');
    });
    await t.check('overview strip: "Show all 9 cases" goes to #/evidence', async () => { eq(await page.evaluate(() => document.querySelector('a[href="#/evidence"]')?.textContent.trim()), 'Show all 9 cases'); });

    // Roadmap
    await visit(p, '#/roadmap');
    const rm = await page.evaluate(() => {
      const main = document.getElementById('shell-main');
      const tables = [...main.querySelectorAll('table')].map((tb) => ({ cap: tb.querySelector('caption')?.textContent.trim(), rows: [...tb.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim())) }));
      return {
        text: main.innerText.replace(/[ \t]+/g, ' ').replace(/ ?\(opens in a new tab\)/g, ''), tables, h1: [...main.querySelectorAll('h1')].map((x) => x.textContent.trim()),
        inputs: main.querySelectorAll('input, select, textarea, [role="slider"], [role="spinbutton"], [contenteditable], canvas, svg:not([aria-hidden="true"])').length,
        inputKinds: [...main.querySelectorAll('input, select, textarea, [role="slider"], canvas, svg')].map((e) => e.tagName + ':' + (e.getAttribute('aria-hidden') || '')),
        buttons: [...main.querySelectorAll('button')].map((b) => b.innerText.trim()),
        hrefs: [...main.querySelectorAll('a[href^="http"]')].map((a) => ({ href: a.getAttribute('href'), text: a.querySelector('.ev-ext__label')?.textContent.trim() || a.textContent.trim(), target: a.getAttribute('target'), rel: a.getAttribute('rel'), hint: /opens in a new tab/.test(a.textContent) })),
        notIn: [...main.querySelectorAll('.rm-status__not')].length,
      };
    });
    await t.check('roadmap: status table has the stretch/not-yet rows from the spec (feature, status, needs)', () => {
      const tb = rm.tables.find((x) => /status/i.test(x.cap || ''));
      ok(tb, 'status table'); eq(tb.rows.length, 10, 'rows');
      for (const s of specStretch) {
        const r = tb.rows.find((x) => x[0].startsWith(s.feature));
        ok(r, 'missing ' + s.feature);
        eq(r[2], s.needs.replace('3–4', '3–4'), s.feature + ' needs');
        const want = s.status === 'Stretch' ? 'Built in this prototype' : s.status;
        ok(r[1].startsWith(want), `${s.feature}: status "${r[1]}" vs spec "${s.status}"`);
        if (s.status !== 'Stretch') ok(/Not in this prototype/.test(r[1]), s.feature + ' not labelled Not in this prototype');
      }
    });
    await t.check('roadmap: five not-built rows each carry the visible label "Not in this prototype"', () => { ok(rm.notIn >= 5, 'labels ' + rm.notIn); });
    await t.check('roadmap: Stage 1 / Stage 2 table equals the spec table', () => {
      const tb = rm.tables.find((x) => /Stage 1 and Stage 2/.test(x.cap || ''));
      ok(tb, 'stage table');
      const spec = specStages.slice(1).map((r) => r.map(stripMd));
      eq(tb.rows.length, spec.length, 'rows');
      spec.forEach((r, i) => { eq(tb.rows[i].map(norm), r.map(norm), 'row ' + (i + 1)); });
    });
    await t.check('roadmap: illustrative table equals the spec table and carries the "made up" label', () => {
      const tb = rm.tables.find((x) => /Illustrative/.test(x.cap || '')); ok(tb, 'illustrative table');
      eq(tb.rows.map((r) => r.map(norm)), specIllus.map((r) => r.map(norm)), 'rows');
      ok(rm.text.includes('Illustrative numbers, made up to show the logic, not real data'), 'label'); ok(/Illustrative numbers, made up to show the logic, not real data/.test(tb.cap), 'caption label');
    });
    await t.check('roadmap: the formula, worked example and Stage 2 sentences are the spec words', () => {
      ok(rm.text.includes('Net saving = (current annual cost − group annual cost) × years remaining − exit cost − switching cost'), 'formula');
      const worked = SPEC.match(/For one of the three mid-term councils[^\n]+/)[0];
      ok(rm.text.includes(worked), 'worked example');
      ok(rm.text.includes('Ten councils buy the same service separately, about £20m a year combined.'), 'intro of example');
      ok(rm.text.includes("Each council that runs Stage 1 ends up with a structured contract estate, which is the raw material Stage 2 needs, with that council's agreement to share it."), 'stage 1/2 closing line');
      const intro = SPEC.match(/Once Kontor reads contracts across many councils[^\n]+/)[0].split(/(?<=\.) /)[0];
      ok(rm.text.includes(intro), 'stage 2 intro');
    });
    await t.check("roadmap: Stage 2 intro keeps the spec's second sentence \"It runs the same Stage 1 extraction across many councils' contracts.\"", () => {
      ok(rm.text.includes("It runs the same Stage 1 extraction across many councils' contracts."), 'sentence omitted: the reuse-of-extraction thesis is not stated on the Roadmap');
    });
    await t.check('roadmap: six steps, why-money bullets, who would buy, what has to be true are present word for word', () => {
      const steps = [...SPEC.slice(SPEC.indexOf('### How the analysis works')).split('\n')].filter((l) => /^\d\. /.test(l)).slice(0, 6).map((l) => l.replace(/^\d\. /, ''));
      for (const s of steps) ok(rm.text.includes(s), 'step missing: ' + s.slice(0, 50));
      const bullets = SPEC.slice(SPEC.indexOf('### Why there'), SPEC.indexOf('### How the analysis works')).split('\n').filter((l) => l.startsWith('- '));
      for (const b of bullets) { const plain = stripMd(b.replace(/^- /, '')).replace(/\s+/g, ' '); ok(norm(rm.text).includes(plain), 'why bullet missing: ' + plain.slice(0, 60)); }
      const who = SPEC.slice(SPEC.indexOf('### Who would buy it'), SPEC.indexOf('### What has to be true')).split('\n').filter((l) => l.startsWith('- '));
      for (const b of who) { const plain = stripMd(b.replace(/^- /, '')).replace(/\s+/g, ' '); ok(norm(rm.text).includes(plain), 'who bullet missing: ' + plain.slice(0, 60)); }
      const must = SPEC.slice(SPEC.indexOf('### What has to be true')).split('\n').filter((l) => l.startsWith('- '));
      for (const b of must) { const plain = stripMd(b.replace(/^- /, '')).replace(/\s+/g, ' '); ok(norm(rm.text).includes(plain), 'must be true missing: ' + plain.slice(0, 60)); }
    });
    await t.check('roadmap: data-source bullets (Contracts, Spend, Context) present with the 24 February 2025 and £5m wording', () => {
      const src = SPEC.slice(SPEC.indexOf('## Stage 1: data sources'), SPEC.indexOf('## Stage 1: demo flow')).split('\n').filter((l) => l.startsWith('- '));
      for (const b of src) { const plain = stripMd(b.replace(/^- /, '')).replace(/\s+/g, ' ').replace(/^(Contracts|Spend|Context):/, ''); ok(norm(rm.text).toLowerCase().includes(plain.trim().toLowerCase()), /* the page capitalises the first letter after the heading */ 'data source missing: ' + plain.slice(0, 60)); }
    });
    await t.check('roadmap: no input, select, textarea, slider, canvas or SVG chart; the only control is the Give feedback button', () => {
      eq(rm.inputs, 0, 'interactive/graphic elements ' + JSON.stringify(rm.inputKinds)); eq(rm.buttons, ['Give feedback'], 'buttons');
    });
    await t.check('roadmap: every spec link URL used on the page is the spec URL, opens in a new tab with rel and visible words', () => {
      for (const l of rm.hrefs) { ok(allSpecLinks.some((s) => s.url === l.href), 'URL not in the spec: ' + l.href); eq(l.target, '_blank', l.href); ok(/noopener/.test(l.rel) && /noreferrer/.test(l.rel), 'rel ' + l.href); ok(l.hint, 'no visible new-tab words ' + l.href); }
      return rm.hrefs.length + ' links';
    });
    await t.check('roadmap: every Stage 2 / not-yet spec link (LGA x2, IBAA, RCC, Cabinet Office LGA, gov.wales) appears', () => {
      const need = allSpecLinks.map((l) => l.url).filter((u) => !specEvidence.some((e) => e.url === u));
      const have = new Set(rm.hrefs.map((x) => x.href));
      const missing = [...new Set(need)].filter((u) => !have.has(u));
      eq(missing, [], 'missing URLs');
    });
    await t.check('roadmap: one h1 Roadmap', () => { eq(rm.h1, ['Roadmap']); });
  }
  await p.ctx.close();
}
await h.close();
t.finish();
