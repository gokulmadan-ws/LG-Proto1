// V7: the rail Menu. A kit Popover anchored to the Menu button, holding a menu of seven items.
//
// Contract
//   default export: <MenuPopover open anchor onClose />, mounted ONCE by App.jsx, returns null while closed.
//   props: open (boolean), anchor (the "Menu" button element, or null), onClose () => void. The anchor is the rail Menu button
//   (bottom left, on desktop) or the header Menu button (top right, on phones): the menu opens beside the first and below the second.
//   Items, in this order: Why this matters (-> #/evidence), How this is calculated (-> #/method), About this data
//   (useUI().openAbout()), Demo guide (openDemoGuide()), Give feedback (openFeedback()). role="menu" / role="menuitem".
//   Keys: ArrowDown and ArrowUp move (and wrap), Home and End jump, a letter jumps to the next item starting with it, Enter and Space choose,
//   Escape closes and returns focus to `anchor`, Tab closes. A press outside closes it, a press on the anchor itself does not (the opener
//   toggles, so closing and reopening in one click cannot flicker). Choosing an item puts focus back on `anchor` first, so a dialog opened
//   by an item returns focus to the Menu button when it closes.
//   Landmark: the menu sits inside <nav aria-label="Menu"> (an honest landmark: it lists pages and help). Without it axe `region` fails,
//   because the popover is portalled to <body>, outside every landmark. The kit Menu cannot add a landmark, so this file uses the kit
//   Popover (placement, outside press, Escape, layer order) and the kit's menu classes (kx-menu), with the same key handling as the kit Menu.
import { useEffect, useRef, useState } from 'react';
import { Popover, focusIn } from '../../ui/index.js';
import { useResetDemo } from '../../lib/useResetDemo.js';
import { useUI } from '../../lib/ui-context.jsx';
import './overlays.css';

const ITEM = '[role="menuitem"]';

/** Beside the rail button when it sits low on the screen (desktop), below it when it sits high (the phone header). */
function placementFor(anchor) {
  try {
    const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    if (r && r.top < window.innerHeight / 2) return 'bottom-end';
  } catch (e) { /* fall through */ }
  return 'right-end';
}

export default function MenuPopover({ open, anchor, onClose }) {
  const ui = useUI();
  const { reset } = useResetDemo();
  const list = useRef(null);
  const [ready, setReady] = useState(false);

  const items = [
    { id: 'why', label: 'Why this matters', icon: 'scale-balanced', href: '#/evidence' },
    { id: 'how', label: 'How this is calculated', icon: 'calculator', href: '#/method' },
    { id: 'about', label: 'About this data', icon: 'circle-info', onSelect: () => ui.openAbout() },
    { id: 'guide', label: 'Guide', icon: 'book-open', href: '#/guide' },   // G1: also the way to the Guide on phones, where the header tabs collapse
    { id: 'demo', label: 'Demo guide', icon: 'compass', onSelect: () => ui.openDemoGuide() },
    { id: 'feedback', label: 'Give feedback', icon: 'message', onSelect: () => ui.openFeedback() },
    { id: 'reset', label: 'Reset demo data', icon: 'rotate-left', onSelect: () => reset() },   // also the way to reset on phones, where the header button is hidden
  ];

  // The popover measures and places itself on its first frame; focus the first item after that (a hidden element cannot take focus).
  useEffect(() => {
    if (!open) { setReady(false); return undefined; }
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);
  useEffect(() => {
    if (!open || !ready || !list.current) return;
    const first = list.current.querySelector(ITEM);
    if (first) first.focus({ preventScroll: true });
  }, [open, ready]);

  const entries = () => Array.from(list.current ? list.current.querySelectorAll(ITEM) : []);
  const move = (to) => {
    const els = entries();
    if (!els.length) return;
    const i = els.indexOf(document.activeElement);
    const n = to === 'first' ? 0 : to === 'last' ? els.length - 1 : (i + to + els.length) % els.length;
    els[n].focus({ preventScroll: true });
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home') { e.preventDefault(); move('first'); }
    else if (e.key === 'End') { e.preventDefault(); move('last'); }
    else if (e.key === 'Tab') { e.preventDefault(); focusIn(anchor); onClose(); }
    else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const els = entries();
      const i = els.indexOf(document.activeElement);
      const k = e.key.toLowerCase();
      const hit = els.slice(i + 1).concat(els.slice(0, i + 1)).find((el) => (el.getAttribute('data-label') || '').toLowerCase().startsWith(k));
      if (hit) { e.preventDefault(); hit.focus({ preventScroll: true }); }
    }
  };
  const choose = (item) => {
    focusIn(anchor);            // the item is about to disappear: focus goes back to the Menu button, so a dialog opened next returns there
    onClose();
    if (item.onSelect) item.onSelect();
  };

  return (
    <Popover open={open} anchor={anchor} onClose={onClose} placement={open ? placementFor(anchor) : 'right-end'} className="ovl-pop">
      <nav aria-label="Menu" className="kx-menu ovl-menu">
        <div ref={list} role="menu" aria-label="Pages and help" onKeyDown={onKeyDown}>
          {items.map((it) => {
            const common = { role: 'menuitem', tabIndex: -1, 'data-label': it.label, className: 'kx-menu__item', onClick: () => choose(it) };
            const inner = (<><i className={'fa-solid fa-' + it.icon} aria-hidden="true" /><span className="kx-menu__text">{it.label}</span></>);
            return it.href
              ? <a key={it.id} href={it.href} {...common}>{inner}</a>
              : <button key={it.id} type="button" {...common}>{inner}</button>;
          })}
        </div>
      </nav>
    </Popover>
  );
}
