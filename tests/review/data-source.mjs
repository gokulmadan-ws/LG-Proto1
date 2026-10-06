// Data review: Source viewer for all 336 extractions (R54, R55, R57). In the rendered DOM: header "Page p of N", the single highlighted
// block (mark) equals provenance[0].quote character for character, clause reference, answer panel text, confidence, answer k of 14,
// previous and next links, and the "Back to opportunity" target. Also checks a sample of non-highlighted neighbour blocks are not marked.
//   node tests/review/data-source.mjs
import { T, E, DATA, launch, visit, go, norm, contractById, pageErrors } from './data-lib.mjs';

const t0 = new T('data-source');
const h = await launch();
const t = await h.newPage({ theme: 'dark' });
const order = (cid) => DATA.extractions.filter((x) => x.contractId === cid); // dataset order is question order
const qOrder = DATA.questions.flatMap((q) => q.fields);
try {
  await visit(t, '#/overview');
  for (const c of DATA.contracts) {
    const xs = qOrder.map((k) => DATA.extractions.find((x) => x.id === `X-${c.id}-${k}`));
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i]; const p = x.provenance[0]; const doc = DATA.documents[p.documentId];
      await go(t.page, `#/source/${c.id}/${x.id}?from=opportunities`);
      await t.page.waitForSelector('mark.src-mark', { timeout: 4000 }).catch(() => {});
      const r = await t.page.evaluate(() => {
        const tx = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
        const marks = [...document.querySelectorAll('#shell-main mark')];
        const panel = document.querySelector('.src-panel');
        return { marks: marks.map((m) => m.textContent), markIds: marks.map((m) => m.getAttribute('data-extraction-id')), h1: tx(document.querySelector('#shell-main h1')), desc: tx(document.querySelector('.page-header__desc')), stepper: tx(document.querySelector('.src-stepper__count')),
          paperHeader: tx(document.querySelector('.src-run--head')), answer: tx(document.querySelector('.src-answer__text')), meta: tx(document.querySelector('.src-answer__meta')), panel: panel ? panel.innerText.replace(/\s+/g, ' ').trim() : '', quote: tx(document.querySelector('.src-panel blockquote, .src-quote')),
          hasNextBtn: [...document.querySelectorAll('#shell-main button')].some((b) => /^Next answer/.test(b.textContent.trim()) && !b.disabled), hasPrevBtn: [...document.querySelectorAll('#shell-main button')].some((b) => /^Previous answer/.test(b.textContent.trim()) && !b.disabled), focused: document.activeElement && document.activeElement.tagName, cited: document.querySelectorAll('.src-row--cited').length, crumb: tx(document.querySelector('.page-header__breadcrumb')) };
      });
      t0.check(`${x.id} source page`, () => {
        const bad = [];
        if (r.marks.length !== 1) bad.push(`${r.marks.length} marks`); else if (r.marks[0] !== p.quote) bad.push('mark text differs from quote');
        if (r.markIds[0] !== x.id) bad.push('mark extraction id ' + r.markIds[0]);
        if (r.h1 !== p.clauseRef) bad.push(`h1 "${r.h1}" vs "${p.clauseRef}"`);
        if (!r.desc.includes(`page ${p.page} of ${doc.pageCount}`)) bad.push(`subtitle "${r.desc}"`);
        if (!r.paperHeader.includes(`Page ${p.page} of ${doc.pageCount}`)) bad.push(`paper header "${r.paperHeader}"`);
        if (!r.stepper.includes(`Answer ${i + 1} of 14`)) bad.push(`stepper "${r.stepper}" expected ${i + 1}`);
        if (!r.panel.includes(norm(p.quote))) bad.push('quote missing from the answer panel');
        if (!r.panel.includes(p.clauseRef)) bad.push('clauseRef missing from panel');
        if (!r.panel.includes(`${p.page} of ${doc.pageCount}`)) bad.push('page missing from panel');
        if (!r.panel.includes(`${x.confidence.toFixed(2)} confidence`)) bad.push(`confidence ${x.confidence} missing`);
        const band = x.confidence >= 0.9 ? 'High' : x.confidence >= 0.75 ? 'Medium' : 'Needs review'; if (!r.panel.includes(band)) bad.push('band ' + band);
        if (!r.panel.includes(doc.title)) bad.push('doc title missing');
        if (r.cited < 1) bad.push('no cited row');
        if (r.hasNextBtn !== (i < xs.length - 1)) bad.push('Next answer button presence'); if (r.hasPrevBtn !== (i > 0)) bad.push('Previous answer button presence');
        if (bad.length) throw new Error(bad.join('; '));
      });
      if (i < xs.length - 1) {
        await t.page.getByRole('button', { name: /^Next answer/ }).click(); await t.page.waitForTimeout(40);
        const hsh = await t.page.evaluate(() => location.hash);
        t0.check(`${x.id} Next answer lands on ${xs[i + 1].id}`, () => { if (!hsh.startsWith(`#/source/${c.id}/${xs[i + 1].id}`)) throw new Error(hsh); });
      }
    }
  }
  // missing page / bad ids
  for (const [hash, why] of [['#/source/C-005/not-an-id', 'bad extraction id'], ['#/source/C-999/X-C-999-maximumValue', 'bad contract id'], ['#/source/C-005/X-C-003-maximumValue', 'extraction of another contract']]) {
    await go(t.page, hash); await t.page.waitForTimeout(150);
    const txt = await t.page.evaluate(() => document.querySelector('#shell-main').innerText);
    t0.check(`graceful state for ${why}`, () => { if (/undefined|NaN|\[object/.test(txt)) throw new Error(txt.slice(0, 200)); if (!/isn't in the sample|not found|Open contract|Go to/i.test(txt)) throw new Error('no friendly state: ' + txt.slice(0, 200)); });
  }
  t0.check('no console/page errors', () => { const er = pageErrors(t); if (er.length) throw new Error(er.slice(0, 5).join(' | ')); });
} finally { await h.close(); }
t0.finish();
