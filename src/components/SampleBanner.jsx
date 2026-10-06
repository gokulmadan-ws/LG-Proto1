import { useUI } from '../lib/ui-context.jsx';

/**
 * Sample-data banner (R11, copy 7.1). Rendered once by App.jsx into the shell `banner` slot, above <main>,
 * so it is visible on every route without scrolling. Not dismissable. "About this data" opens the About dialog
 * and focus returns to the link when the dialog closes.
 */
export function SampleBanner() {
  const { openAbout } = useUI();
  return (
    <section className="sample-banner" aria-label="Sample data notice">
      <i className="fa-solid fa-circle-info sample-banner__icon" aria-hidden="true" />
      <p className="sample-banner__text">
        <strong>Sample data.</strong> Marchbank Borough Council, its suppliers, contracts and payments are fictional.
        They were written for this demo.{' '}
        <button type="button" className="sample-banner__link" onClick={(e) => openAbout(e.currentTarget)}>About this data</button>
      </p>
    </section>
  );
}

export default SampleBanner;
