/**
 * Keyboard hint, for example <Kbd>Esc</Kbd> or <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>. Geist Mono 11px.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export function Kbd({ children, className = '' }) {
  return <kbd className={('kx-kbd ' + className).trim()}>{children}</kbd>;
}

export default Kbd;
