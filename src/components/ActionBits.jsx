// Small pieces the action tracker screens share (drawer Action tab, Actions board, Results, Opportunities rows).
//   <PersonAvatar person={p} />            initials in a circle; no person = a dashed "?" (an action with no owner yet)
//   <OutcomePill outcome="resolved" />     Resolved (green, check) | Explained | No action, words always shown
//   parseWholePounds('£150,000') -> 150000 | null (blank) | NaN (not a whole number of pounds)
import { Pill } from '../ui/index.js';
import { OUTCOME_LABEL } from '../lib/actions.js';
import './ActionBits.css';

export function PersonAvatar({ person, size = 24, label, className = '' }) {
  const cls = ['act-av', !person && 'act-av--empty', size >= 32 && 'act-av--lg', className].filter(Boolean).join(' ');
  return (
    <span className={cls} aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      {person ? person.initials : '?'}
    </span>
  );
}

const OUTCOME_PILL = { resolved: { tone: 'success', icon: 'circle-check' }, explained: { tone: 'neutral', icon: 'circle-info' }, no_action: { tone: 'neutral', icon: 'ban' } };
export function OutcomePill({ outcome, size }) {
  const p = OUTCOME_PILL[outcome];
  if (!p) return null;
  return <Pill tone={p.tone} icon={p.icon} size={size} className="act-outcome">{OUTCOME_LABEL[outcome]}</Pill>;
}

/** Whole pounds from what you typed: '£150,000', '150000' or '150 000'. Blank gives null; anything else that is not a whole number gives NaN. */
export function parseWholePounds(text) {
  const t = String(text == null ? '' : text).replace(/[£,\s]/g, '');
  if (!t) return null;
  return /^\d{1,12}$/.test(t) ? Number(t) : NaN;
}
