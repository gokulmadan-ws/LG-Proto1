// Flag -> source viewer target. Every flag links to the clause and page it came from (spec goal 3, R24).
//
//   evidenceFor(flag)            -> { contractId, extractionId, page, clauseRef, quote, fieldKey, status, confidence } | null
//        the PRIMARY target: flag.evidenceFields[0] (renewal: noticePeriod; overCap and nearCap: maximumValue, or awardedTotalValue when no maximum is stated; uplift: indexation)
//   evidenceAll(flag)            -> same shape for every field the flag relies on (renewal also has autoRenewal and endDate), in order
//   evidenceForField(contractId, fieldKey) -> same shape for any extracted field, e.g. the "contract value" link beside a "No maximum stated" answer
//   sourceHref(target, from)     -> '#/source/C-005/X-C-005-maximumValue?from=opportunities'   (A1's <ClauseLink> builds the same address)
// Usage:  const t = evidenceFor(flag);  <ClauseLink contractId={t.contractId} extractionId={t.extractionId} page={t.page} from="opportunities" />
import data from '../data/sample.json' with { type: 'json' };

const EXTRACTIONS = new Map(data.extractions.map((x) => [x.id, x]));

function targetOf(x) {
  if (!x) return null;
  const p = x.provenance && x.provenance[0];
  if (!p) return null;
  return { contractId: x.contractId, extractionId: x.id, page: p.page, clauseRef: p.clauseRef, quote: p.quote, fieldKey: x.fieldKey, status: x.status, confidence: x.confidence };
}

export function evidenceForField(contractId, fieldKey) {
  return targetOf(EXTRACTIONS.get(`X-${contractId}-${fieldKey}`));
}

export function evidenceFor(flag) {
  if (!flag || !flag.evidenceFields || !flag.evidenceFields.length) return null;
  return evidenceForField(flag.contractId, flag.evidenceFields[0]);
}

export function evidenceAll(flag) {
  if (!flag || !flag.evidenceFields) return [];
  const seen = new Set();
  const out = [];
  for (const f of flag.evidenceFields) {
    const t = evidenceForField(flag.contractId, f);
    // noticePeriod and autoRenewal cite the same clause: list that clause once
    if (t && !seen.has(`${t.page}|${t.clauseRef}`)) { seen.add(`${t.page}|${t.clauseRef}`); out.push(t); }
  }
  return out;
}

export function sourceHref(target, from) {
  if (!target) return '#/contracts';
  return `#/source/${encodeURIComponent(target.contractId)}/${encodeURIComponent(target.extractionId)}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
}

export default evidenceFor;
