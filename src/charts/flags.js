// src/charts/flags.js
// The one place that maps an ENTITY to its colour + glyph + words.
// Colour follows the entity (a flag type, a cap state, a radar band), never its rank or row number.

/** Flag types. Keys match the engine's Flag.type. Every use pairs the colour with the glyph AND the words.
 *  FLAG_ORDER is FIXED and is the stack order: over cap | price increase | close to cap | renewal.
 *  It puts red next to purple, purple next to amber and amber next to blue: every adjacent pair is >= 28 dE under
 *  protanopia and deuteranopia. Blue and purple collapse under deuteranopia (dE 1.6) so they must never touch. */
export const FLAGS = {
  overCap: { key: 'overCap', label: 'Spend over cap', short: 'Over cap', glyph: 'triangle-exclamation',
    color: 'var(--viz-danger)', text: 'var(--viz-danger-text)', on: 'var(--viz-on-danger)', basis: 'Already paid above the cap' },
  uplift: { key: 'uplift', label: 'Price increases above cap', short: 'Price increase', glyph: 'arrow-trend-up',
    color: 'var(--viz-purple)', text: 'var(--viz-purple-text)', on: 'var(--viz-on-purple)', basis: 'Already paid above the cap' },
  nearCap: { key: 'nearCap', label: 'Close to cap', short: 'Close to cap', glyph: 'circle-exclamation',
    color: 'var(--viz-warning)', text: 'var(--viz-warning-text)', on: 'var(--viz-on-warning)', basis: 'Projected at the current pace' },
  renewal: { key: 'renewal', label: 'Renewals', short: 'Renewal', glyph: 'calendar-days',
    color: 'var(--viz-accent)', text: 'var(--viz-accent-text)', on: 'var(--viz-on-accent)', basis: 'Indicative value per year' },
};
export const FLAG_ORDER = ['overCap', 'uplift', 'nearCap', 'renewal'];
/** Reading order of the four basis cards and of the filter chips (requirements R17). Colours still follow FLAGS, never position. */
export const FLAG_CARD_ORDER = ['overCap', 'nearCap', 'renewal', 'uplift'];

/** Flag.basis -> words */
export const BASIS_LABEL = { per_year: 'Per year', one_off: 'Already paid', projected: 'Projected at the current pace' };

/** Cap-vs-spend states. The engine says 'ok' | 'near' | 'over'; thresholds: near >= 85% of cap, over > 100%. */
export const CLOSE_AT = 0.85;
export const STATES = {
  within: { key: 'within', label: 'Within cap', glyph: 'circle-check', color: 'var(--viz-accent)', text: 'var(--viz-ink-2)', tint: 'var(--viz-ink-2)' },
  close:  { key: 'close',  label: 'Close to cap', glyph: 'circle-exclamation', color: 'var(--viz-warning)', text: 'var(--viz-warning-text)' },
  over:   { key: 'over',   label: 'Over cap', glyph: 'triangle-exclamation', color: 'var(--viz-danger)', text: 'var(--viz-danger-text)' },
};
const FROM_ENGINE = { ok: 'within', near: 'close', over: 'over', above_estimate: 'over', within: 'within', close: 'close' };
export const stateFor = (ratio, closeAt = CLOSE_AT, engineState) =>
  STATES[engineState ? FROM_ENGINE[engineState] : ratio > 1 ? 'over' : ratio >= closeAt ? 'close' : 'within'];

/** Uplift states: engine flags when yoy - cap > 1 percentage point AND the excess is >= GBP 10,000. */
export const UPLIFT_STATES = {
  flag: { key: 'flag', label: 'Above cap', glyph: 'triangle-exclamation', color: 'var(--viz-danger)', text: 'var(--viz-danger-text)' },
  tolerance: { key: 'tolerance', label: 'Within tolerance', glyph: 'circle-exclamation', color: 'var(--viz-warning)', text: 'var(--viz-warning-text)' },
  ok: { key: 'ok', label: 'Within cap', glyph: 'circle-check', color: 'var(--viz-accent)', text: 'var(--viz-ink-2)', tint: 'var(--viz-ink-2)' },
};

/** Renewal radar bands. Keys match the engine's RadarPlacement.band. The three time bands are an ORDINAL ramp
 *  (one blue hue, most urgent = most salient). The two "attention" bands wear the danger colour + a glyph + words. */
export const BANDS = [
  { key: 'passed', label: 'Notice date passed', attention: true, glyph: 'triangle-exclamation', color: 'var(--viz-danger)', text: 'var(--viz-danger-text)' },
  { key: 'ended', label: 'Ended, still paying', attention: true, glyph: 'calendar-xmark', color: 'var(--viz-danger)', text: 'var(--viz-danger-text)' },
  { key: 'm3', label: 'Next 3 months', from: 0, to: 3, color: 'var(--viz-b1)' },
  { key: 'm6', label: '3 to 6 months', from: 3, to: 6, color: 'var(--viz-b2)' },
  { key: 'm12', label: '6 to 12 months', from: 6, to: 12, color: 'var(--viz-b3)' },
];

export const CONFIDENCE = {
  high:   { label: 'High', dots: 3, glyph: 'circle-check', words: 'High confidence' },
  medium: { label: 'Medium', dots: 2, glyph: 'circle-half-stroke', words: 'Medium confidence' },
  low:    { label: 'Needs review', dots: 1, glyph: 'triangle-exclamation', words: 'Needs review' },
};

/** Review (triage) status of a flag, as stored by the app: absent = 'to_investigate'. Reviewed = leaves the open list. */
export const REVIEW = {
  to_investigate: { label: 'To investigate', glyph: 'circle', reviewed: false },
  under_review:   { label: 'Under review', glyph: 'magnifying-glass', reviewed: false },
  explained:      { label: 'Explained', glyph: 'circle-check', reviewed: true },
  not_an_issue:   { label: 'No action', glyph: 'ban', reviewed: true },
};
