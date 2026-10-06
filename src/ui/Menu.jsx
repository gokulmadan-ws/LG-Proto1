import { useEffect, useRef, useState } from 'react';
import { Button } from './ds.js';
import { Popover } from './Popover.jsx';
import { focusIn } from './layers.js';

const elOf = (anchor) => (anchor && anchor.current !== undefined ? anchor.current : anchor);

/**
 * Action menu (role="menu") on a Popover. Arrow keys move between items (Up and Down wrap, Home and End jump, a letter
 * jumps to the next item that starts with it), Enter or Space activates, Escape closes and returns focus to the anchor,
 * Tab closes. Choosing an item closes the menu first, puts focus back on the anchor, THEN calls onSelect, so a dialog
 * opened by the item returns focus to the button that opened the menu.
 *
 * items: array of
 *   { id, label, icon?, hint?, danger?, disabled?, onSelect?: () => void, href?: string, external?: boolean }   an item
 *   { separator: true }                                                                                    a divider
 *   { heading: 'Table' }                                                                                   a small caps label
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {HTMLElement | {current: HTMLElement|null} | null} props.anchor the button that opened it
 * @param {(reason: 'escape'|'outside'|'select'|'tab') => void} props.onClose
 * @param {Array} props.items
 * @param {string} props.label accessible name of the menu
 * @param {string} [props.placement='bottom-start']
 * @param {(item) => void} [props.onSelect] called for every item after its own onSelect (handy for one handler)
 */
export function Menu({ open, anchor, onClose, items, label, placement = 'bottom-start', onSelect, className = '' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) { setReady(false); return undefined; }
    const t = requestAnimationFrame(() => setReady(true));   // one frame: the Popover measures and places itself first
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open || !ready || !ref.current) return;
    const first = ref.current.querySelector('[role="menuitem"]:not([aria-disabled="true"])');
    if (first) first.focus({ preventScroll: true });
  }, [open, ready]);

  const move = (to) => {
    const list = Array.from(ref.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])'));
    if (!list.length) return;
    const i = list.indexOf(document.activeElement);
    const n = to === 'first' ? 0 : to === 'last' ? list.length - 1 : (i + to + list.length) % list.length;
    list[n].focus({ preventScroll: true });
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home') { e.preventDefault(); move('first'); }
    else if (e.key === 'End') { e.preventDefault(); move('last'); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      focusIn(elOf(anchor));
      onClose && onClose('tab');
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const list = Array.from(ref.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])'));
      const i = list.indexOf(document.activeElement);
      const k = e.key.toLowerCase();
      const order = list.slice(i + 1).concat(list.slice(0, i + 1));
      const hit = order.find((el) => (el.getAttribute('data-label') || '').toLowerCase().startsWith(k));
      if (hit) { e.preventDefault(); hit.focus({ preventScroll: true }); }
    }
  };

  const choose = (item, e) => {
    if (item.disabled) { e.preventDefault(); return; }
    focusIn(elOf(anchor));
    onClose && onClose('select');
    if (item.onSelect) item.onSelect(item);
    if (onSelect) onSelect(item);
  };

  return (
    <Popover open={open} anchor={anchor} onClose={onClose} placement={placement} className={('kx-menu ' + className).trim()} role="menu" label={label}
      innerRef={ref} onKeyDown={onKeyDown}>
        {items.map((it, i) => {
          if (it.separator) return <div key={'s' + i} className="kx-menu__sep" role="separator" />;
          if (it.heading) return <div key={'h' + i} className="kx-menu__label" role="presentation">{it.heading}</div>;
          const common = {
            role: 'menuitem', tabIndex: -1, 'data-label': it.label, 'aria-disabled': it.disabled ? 'true' : undefined,
            className: 'kx-menu__item' + (it.danger ? ' kx-menu__item--danger' : ''),
            onClick: (e) => choose(it, e),
          };
          const inner = (
            <>
              {it.icon && <i className={'fa-solid fa-' + it.icon} aria-hidden="true" />}
              <span className="kx-menu__text">{it.label}</span>
              {it.external && <i className="fa-solid fa-arrow-up-right-from-square kx-menu__ext" aria-hidden="true" />}
              {it.hint && <span className="kx-kbd">{it.hint}</span>}
            </>
          );
          return it.href
            ? <a key={it.id || i} href={it.href} {...(it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...common}>{inner}</a>
            : <button key={it.id || i} type="button" {...common}>{inner}</button>;
        })}
    </Popover>
  );
}

/**
 * A button that opens a Menu. Convenience wrapper: owns the open state, sets aria-haspopup and aria-expanded, and
 * ArrowDown on the button opens the menu.
 *
 * @param {object} props
 * @param {string} props.label accessible name of the menu (and of the button when it has no visible text)
 * @param {Array} props.items see Menu
 * @param {React.ReactNode} [props.children] visible button text; omit for an icon-only button
 * @param {string} [props.icon='ellipsis'] FA solid name
 * @param {'primary'|'secondary'|'outline'|'ghost'} [props.variant='outline']
 * @param {'sm'|'md'|'lg'} [props.size='sm']
 * @param {string} [props.placement='bottom-end']
 */
export function MenuButton({ label, items, children, icon = 'ellipsis', variant = 'outline', size = 'sm', placement = 'bottom-end', onSelect, ...rest }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const iconOnly = !children;
  return (
    <>
      <span ref={ref} className="kx-menubtn">
        <Button type="button" variant={variant} size={size} leftIcon={icon} aria-haspopup="menu" aria-expanded={open}
          aria-label={iconOnly ? label : undefined} className="kx-hit" style={iconOnly ? { width: size === 'sm' ? 32 : 36, padding: 0 } : undefined}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); } }} {...rest}>{children}</Button>
      </span>
      <Menu open={open} anchor={ref} onClose={() => setOpen(false)} items={items} label={label} placement={placement} onSelect={onSelect} />
    </>
  );
}

export default Menu;
