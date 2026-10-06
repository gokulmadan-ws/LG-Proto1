// STUB (A1, functional but plain). V7 replaces this file with the polished popover.
//
// Contract
//   default export: <MenuPopover open anchor onClose />, mounted ONCE by App.jsx, returns null while closed.
//   props: open (boolean), anchor (the "Menu" button element, or null), onClose () => void. The anchor is the rail Menu button
//   (bottom left, on desktop) or the header Menu button (top right, on phones): open beside it or below it accordingly.
//   Items, in this order: Why this matters (-> #/evidence), How this is calculated (-> #/method), About this data
//   (useUI().openAbout()), Demo guide (openDemoGuide()), Give feedback (openFeedback()). role="menu"/"menuitem",
//   arrow keys move, Esc closes and returns focus to `anchor`, a click outside closes it. Pointer events on `anchor`
//   itself must NOT close it (useUI().openMenu toggles; closing and reopening in one click would flicker).
//   Opening About/Demo guide/Feedback while the menu is open returns focus to `anchor` when they close (handled by ui-context).
//   axe "region": a popup outside every landmark fails the rule, so the root is a <nav aria-label="Menu"> (an honest landmark:
//   it lists pages and help). Native <dialog>s are exempt. Keep that wrapper when you restyle.
import { useEffect, useRef, useState } from 'react';
import { useUI } from '../../lib/ui-context.jsx';
import { navigate } from '../../lib/router.js';
import { focusElement } from '../../lib/a11y.js';

export default function MenuPopover({ open, anchor, onClose }) {
  const ui = useUI();
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: 80, bottom: 16 });   // either { left, bottom } (beside the rail) or { right, top } (below the header button)

  useEffect(() => {
    if (!open) return undefined;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      setPos(r.top < window.innerHeight / 2
        ? { right: Math.max(8, Math.round(window.innerWidth - r.right)), top: Math.round(r.bottom + 8) }
        : { left: Math.round(r.right + 8), bottom: Math.round(window.innerHeight - r.bottom) });
    }
    const first = ref.current && ref.current.querySelector('[role="menuitem"]');
    if (first) first.focus();
    const onDown = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (anchor && anchor.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, anchor, onClose]);

  if (!open) return null;

  const items = [
    { label: 'Why this matters', icon: 'fa-solid fa-scale-balanced', go: () => navigate('/evidence') },
    { label: 'How this is calculated', icon: 'fa-solid fa-calculator', go: () => navigate('/method') },
    { label: 'About this data', icon: 'fa-solid fa-circle-info', go: () => ui.openAbout() },
    { label: 'Demo guide', icon: 'fa-solid fa-compass', go: () => ui.openDemoGuide() },
    { label: 'Give feedback', icon: 'fa-solid fa-message', go: () => ui.openFeedback() },
  ];

  const onKeyDown = (e) => {
    const els = Array.from(ref.current.querySelectorAll('[role="menuitem"]'));
    const i = els.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); els[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); focusElement(anchor); }
    else if (e.key === 'Tab') { onClose(); }
  };

  return (
    <nav className="menu-popover" aria-label="Menu" style={pos}>
      <div ref={ref} role="menu" aria-label="Menu" className="menu-popover__list" onKeyDown={onKeyDown}>
        {items.map((it) => (
          <button key={it.label} type="button" role="menuitem" className="menu-popover__item" onClick={() => { it.go(); onClose(); }}>
            <i className={it.icon} aria-hidden="true" />
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
