// Neutral status pill with a glyph (status is never colour alone): High, Medium or Needs review.
// Built on the kit Pill (src/ui/Pill.jsx), which is the single source of truth for neutral status pills.
// The `conf-pill` class is a stable hook for tests and views; it carries no styles of its own.
import { Pill } from '../ui/Pill.jsx';

const BANDS = {
  high: { label: 'High', icon: 'circle-check' },
  medium: { label: 'Medium', icon: 'circle-half-stroke' },
  review: { label: 'Needs review', icon: 'triangle-exclamation' },
};

/** Same thresholds as the engine: score >= 0.9 high, >= 0.75 medium, else needs review. */
export function confidenceBandOf(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 'review';
  return s >= 0.9 ? 'high' : s >= 0.75 ? 'medium' : 'review';
}

/**
 * <ConfidencePill score={0.93} />                  High
 * <ConfidencePill band="medium" />                 Medium   (band: 'high' | 'medium' | 'review' | 'low')
 * <ConfidencePill score={0.6} reason="Scanned page, text read by OCR" />
 *   `reason` becomes the title (tooltip and accessible description); print it visibly where the screen needs it.
 * The rendered text is exactly "High", "Medium" or "Needs review": the column header or label around it says "Confidence".
 */
export function ConfidencePill({ score, band, reason, className = '' }) {
  const key = band ? (band === 'low' ? 'review' : band) : confidenceBandOf(score);
  const b = BANDS[key] || BANDS.review;
  return (
    <Pill tone="neutral" icon={b.icon} className={('conf-pill ' + className).trim()} title={reason || undefined}>
      {b.label}
    </Pill>
  );
}

export default ConfidencePill;
