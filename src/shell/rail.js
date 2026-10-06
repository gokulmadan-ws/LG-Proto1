// The six rail items, in order (requirements section 2). Kept apart from routes.js so a dev entry can import the
// rail without pulling in every view.
//   label = aria-label and tooltip; short = caption in the phone bottom bar (never "Savings").
export const RAIL = [
  { id: 'overview', label: 'Overview', icon: 'fa-solid fa-house' },
  { id: 'opportunities', label: 'Opportunities', icon: 'fa-solid fa-magnifying-glass-dollar', short: 'Flags' },
  { id: 'renewals', label: 'Renewal radar', icon: 'fa-regular fa-calendar-check', short: 'Renewals' },
  { id: 'spend', label: 'Cap vs spend', icon: 'fa-solid fa-chart-line', short: 'Spend' },
  { id: 'contracts', label: 'Contracts', icon: 'fa-regular fa-folder-open' },
  { id: 'roadmap', label: 'Roadmap', icon: 'fa-solid fa-diagram-project' },
];
export const RAIL_IDS = new Set(RAIL.map((r) => r.id));
