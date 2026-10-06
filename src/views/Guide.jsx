// G1: the Guide (#/guide). A place that teaches a first-time visitor, or the person presenting, how to use and read the prototype.
//
//   default export: <Guide />   (props: none; the section comes from the address)
//   Exactly ONE <h1> (PageHeader) inside <div className="page">. Nine sections, ids exactly:
//     start, tour, screens, try, numbers, real, glossary, keys, faq
//   The id sits on the section heading (<h2 id tabIndex=-1>), so `#/guide?s=tour` scrolls to and focuses it (same pattern as Method.jsx).
//   A sticky contents list on wide screens, an inline list on tablets and a select on phones.
//
// Facts rule: no number is typed here. Counts, pounds, dates and "what you should see" come from useEstate() through guide-facts.js
// (which also asks the engine "what if" questions, so the sentence matches the screen after you do the thing) or from src/lib/copy.js.
// Wording that copy.js lacks is in guide-content.js (listed in docs/handoff/G1.md). One primary button on the page: Open the overview.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEstate } from '../lib/estate.js';
import { useRoute, hrefFor, navigate } from '../lib/router.js';
import { scrollBehavior } from '../lib/a11y.js';
import { useUI } from '../lib/ui-context.jsx';
import { useTheme } from '../lib/theme.js';
import { DEFAULTS } from '../lib/engine.js';
import {
  COPY, headlineSentence, sumLine, excludedNote, breakdownCards, radarSummaryLine, headlineShareText, handcheckLine, capStateLabel,
  fmtGBP, fmtGBPCompact, fmtPct, fmtDateLong,
} from '../lib/copy.js';
import { plural, joinList, fmtNumber } from '../lib/format.js';
import { roadmap } from '../data/roadmap.js';
import { evidence } from '../data/evidence.js';
import { PageHeader, ClauseLink, MethodLink, ConfidencePill } from '../components/index.js';
import { Panel, Pill, StatTile, Kbd } from '../ui/index.js';
import DS from '../ui/ds.js';
import { FlagBadge, CapStatePill } from '../charts/index.js';
import { guideFacts, PAYEE } from './guide-facts.js';
import {
  SECTIONS, SECTION_IDS, SECTION_BY_ID, TEXT, START, TOUR, TRY, NUMBERS, REAL, GLOSSARY, KEYS, screens, addresses,
} from './guide-content.js';
import './Guide.css';

const { Button, Select } = DS;

/** Scroll the content area (not the document) so `el` sits near the top. Same as the Method page. */
function scrollMainTo(el, behavior) {
  const main = document.getElementById('shell-main');
  if (!main) { el.scrollIntoView({ block: 'start', behavior }); return; }
  const delta = el.getBoundingClientRect().top - main.getBoundingClientRect().top - 16;
  main.scrollTo({ top: main.scrollTop + delta, behavior });
}

/* ---------------------------------------------------------------------------------------------------- small pieces */

/** Link with an arrow. `sr` is extra words for screen readers after the visible label. */
function GoLink({ href, children, sr, ...rest }) {
  return (
    <a className="gd-link gd-link--go" href={href} {...rest}>
      {children}{sr && <span className="sr-only"> {sr}</span>}<i className="fa-solid fa-arrow-right" aria-hidden="true" />
    </a>
  );
}

/** Link drawn like an outline button (it navigates, so it is a real link). */
function LinkButton({ href, icon = 'arrow-right', children, sr }) {
  return (
    <a className="gd-btn" href={href}>{children}{sr && <span className="sr-only"> {sr}</span>}<i className={'fa-solid fa-' + icon} aria-hidden="true" /></a>
  );
}

/** Info or warning note: icon, words, flat surface. Never colour alone, no coloured edge. */
function Callout({ tone = 'info', title, children }) {
  const icon = tone === 'warning' ? 'triangle-exclamation' : 'circle-info';
  return (
    <div className={'gd-callout gd-callout--' + tone} role="note">
      <i className={'fa-solid fa-' + icon} aria-hidden="true" />
      <div className="gd-callout__body">
        {title && <p className="gd-callout__title">{title}</p>}
        <div className="gd-callout__text">{children}</div>
      </div>
    </div>
  );
}

/** "You should see" box. `lines` is [main, ...supporting]. */
function Expect({ label = TEXT.seeNow, lines, note, inline = false }) {
  return (
    <div className={'gd-expect' + (inline ? ' gd-expect--inline' : '')}>
      <p className="gd-expect__label">{label}</p>
      {lines.map((l, i) => <p key={i} className={i === 0 ? 'gd-expect__main' : 'gd-expect__more'}>{l}</p>)}
      {note && <p className="gd-expect__note">{note}</p>}
    </div>
  );
}

/** A section: the heading carries the id (so ?s=<id> scrolls to and focuses it), then the lead sentence. */
function Section({ id, lead, children }) {
  const s = SECTION_BY_ID[id];
  return (
    <section className="gd-section" aria-labelledby={id}>
      <div className="gd-head">
        <span className="gd-head__icon" aria-hidden="true"><i className={'fa-solid fa-' + s.icon} /></span>
        <div className="gd-head__text">
          <h2 id={id} className="gd-h2" tabIndex={-1}>{s.title}</h2>
          <p className="gd-lead">{lead || s.lead}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------------- contents list */

function Toc({ active, wanted }) {
  const onLink = (e, id) => {
    // the address already says this section: the browser would not scroll, so scroll and focus by hand
    if (wanted === id) { e.preventDefault(); const el = document.getElementById(id); if (el) { scrollMainTo(el, scrollBehavior()); el.focus({ preventScroll: true }); } }
  };
  return (
    <nav className="gd-toc" aria-label={TEXT.toc}>
      <p className="ds-caption-caps gd-toc__title">{TEXT.toc}</p>
      <ul className="gd-toc__list">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={hrefFor('guide', { query: { s: s.id } })} aria-current={active === s.id ? 'location' : undefined} onClick={(e) => onLink(e, s.id)}>
              <i className={'fa-solid fa-' + s.icon} aria-hidden="true" />{s.title}
            </a>
          </li>
        ))}
      </ul>
      <div className="gd-toc__select">
        <Select aria-label={TEXT.jump} value={active} options={SECTIONS.map((s) => ({ value: s.id, label: s.title }))} onChange={(e) => navigate(hrefFor('guide', { query: { s: e.target.value } }))} />
      </div>
    </nav>
  );
}

/* --------------------------------------------------------------------------------------------------------- 1. start */

function StartSection({ estate, f, ui }) {
  const t = estate.totals;
  const clausePage = f.top.clause ? f.top.clause.page : null;
  const steps = [START.steps.headline(headlineSentence(t)), START.steps.clause(clausePage), START.steps.change];
  const glance = [
    ['contracts', fmtNumber(f.counts.contracts)], ['payments', fmtNumber(f.counts.payments)],
    ['answers', fmtNumber(f.counts.answers)], ['flagged', fmtNumber(f.counts.flaggedContracts)],
  ];
  return (
    <Section id="start">
      <Callout title={START.sample.title}>
        <p>{START.sample.body} <button type="button" className="gd-link" onClick={(e) => ui.openAbout(e.currentTarget)}>{TEXT.aboutThisData}</button></p>
      </Callout>

      <div className="gd-glance-grid" role="list" aria-label="The sample at a glance">
        {glance.map(([k, v]) => (
          <div role="listitem" key={k} className="gd-glance"><StatTile label={START.glance[k].label} value={v} icon={START.glance[k].icon} foot={START.glance[k].foot} /></div>
        ))}
      </div>

      <div>
        <h3 className="gd-h3">{START.stepsTitle}</h3>
        <ol className="gd-begin">
          {steps.map((s, i) => (
            <li key={s.title} className="gd-begin__item">
              <span className="gd-begin__num" aria-hidden="true">{i + 1}</span>
              <div>
                <h4 className="gd-begin__title">{s.title}</h4>
                <p className="gd-begin__body">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="gd-actions">
        <Button type="button" variant="primary" size="lg" rightIcon="arrow-right" onClick={() => navigate(hrefFor('overview'))}>{START.primary}</Button>
        <a className="gd-link gd-link--go" href={hrefFor('guide', { query: { s: 'tour' } })}>{START.tourLink}<i className="fa-solid fa-arrow-down" aria-hidden="true" /></a>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------------------------------------------- 2. tour */

function TourSection({ estate, f }) {
  const t = estate.totals;
  const { flag, contract, cap, clause, doc } = f.top;
  const attention = estate.radar.attention.length;
  const startHead = f.start.totals.totalGBP !== t.totalGBP ? TEXT.startingNote(fmtGBPCompact(f.start.totals.totalGBP)) : null;

  const steps = [
    {
      key: 'headline', ...TOUR.steps.headline, where: hrefFor('overview'),
      lines: [headlineSentence(t), sumLine(t)], note: startHead,
      links: [{ href: hrefFor('overview') }],
    },
    {
      key: 'radar', ...TOUR.steps.radar, where: hrefFor('renewals'),
      lines: [TOUR.steps.radar.needs(attention), radarSummaryLine('m3', estate.radar.groups.m3)],
      links: [{ href: hrefFor('renewals') }],
    },
    {
      key: 'cap', ...TOUR.steps.cap, where: flag ? hrefFor('opportunities', { query: { flag: flag.id } }) : hrefFor('opportunities'),
      lines: cap && clause ? [TOUR.steps.cap.paid(fmtGBPCompact(cap.spendAgainstCap), fmtGBPCompact(cap.capGBP)), TOUR.steps.cap.clause(clause.clauseRef, clause.page, doc && doc.pageCount)] : ['Open the top flag to see its clause and page.'],
      links: [{ href: flag ? hrefFor('opportunities', { query: { flag: flag.id } }) : hrefFor('opportunities') }],
      clause: clause && contract ? { contractId: clause.contractId, extractionId: clause.extractionId, page: clause.page, context: contract.title } : null,
    },
    {
      key: 'close', ...TOUR.steps.close, say: COPY.closePanel.spoken, where: hrefFor('overview'),
      lines: [COPY.closePanel.heading],
      links: [{ href: hrefFor('overview') }],
    },
  ];

  return (
    <Section id="tour">
      <Callout title={TOUR.note.title}>
        <p>{TOUR.note.body}</p>
        <p className="gd-callout__pill">{f.moved ? <Pill tone="info" icon="pen">{TOUR.pillChanged}</Pill> : <Pill tone="neutral" icon="circle-check">{TOUR.pillStart}</Pill>}</p>
      </Callout>
      <ol className="gd-steps">
        {steps.map((s, i) => (
          <li key={s.key} className="gd-step">
            <div className="gd-step__top">
              <span className="gd-step__num" aria-hidden="true">{i + 1}</span>
              <div className="gd-step__titles">
                <h3 className="gd-step__title">{s.title}</h3>
                <p className="gd-step__where"><span className="sr-only">{TEXT.where}: </span><code className="gd-code">{s.where}</code></p>
              </div>
            </div>
            <dl className="gd-step__facts">
              <div><dt>{TEXT.doThis}</dt><dd>{s.do}</dd></div>
              <div><dt>{TEXT.say}</dt><dd><q>{s.say}</q></dd></div>
            </dl>
            <Expect lines={s.lines} note={s.note} />
            <div className="gd-step__links">
              {s.links.map((l) => <GoLink key={l.href} href={l.href} sr={`${i + 1}, ${s.title.toLowerCase()}`}>{TEXT.openStep}</GoLink>)}
              {s.clause && <ClauseLink {...s.clause} from="opportunities" />}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ------------------------------------------------------------------------------------------------------- 3. screens */

function ScreensSection({ f }) {
  const cards = screens(f);
  return (
    <Section id="screens">
      <ul className="gd-screens">
        {cards.map((c) => (
          <li key={c.id} className="gd-screen">
            <div className="gd-screen__head">
              <span className="gd-screen__icon" aria-hidden="true"><i className={c.icon} /></span>
              <h3 className="gd-screen__title">{c.title}</h3>
            </div>
            <dl className="gd-screen__facts">
              <div><dt>Answers</dt><dd>{c.answers}</dd></div>
              <div><dt>Who uses it</dt><dd>{c.who}</dd></div>
            </dl>
            <ul className="gd-screen__links">
              {c.links.map((l) => <li key={l.href}><GoLink href={l.href}>{l.label}</GoLink></li>)}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---------------------------------------------------------------------------------------------------------- 4. try */

function TrySection({ estate, f, ui, actions }) {
  const [theme, setTheme] = useTheme();
  const { flag, clause } = f.top;
  const gbp = fmtGBPCompact;
  const rows = [];

  rows.push({
    key: 'theme', icon: 'circle-half-stroke', ...TRY.theme,
    see: [TRY.theme.see, TRY.theme.now(theme)],
    action: (
      <Button type="button" variant="outline" leftIcon={theme === 'dark' ? 'sun' : 'moon'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? COPY.toasts.themeToLight : COPY.toasts.themeToDark}
      </Button>
    ),
  });

  if (f.explain && flag) {
    const e = f.explain;
    rows.push({
      key: 'explain', icon: 'circle-check', title: TRY.explain.title, body: e.explained ? TRY.explain.bodyDone : TRY.explain.body,
      see: [e.explained ? TRY.explain.rise(gbp(e.now.totalGBP), gbp(e.other.totalGBP)) : TRY.explain.fall(gbp(e.now.totalGBP), gbp(e.other.totalGBP), excludedNote(e.other))],
      action: <LinkButton href={hrefFor('opportunities', { query: { flag: flag.id } })}>{TRY.explain.link}</LinkButton>,
    });
  }

  if (f.match) {
    const m = f.match;
    rows.push({
      key: 'match', icon: 'link', title: TRY.match.title,
      body: m.confirmed ? TRY.match.bodyDone : m.decision === 'reject' ? TRY.match.bodyRejected : TRY.match.body(m.payee),
      see: [TRY.match.moves(
        m.contract.title,
        `${fmtPct(m.before.cap.utilisation)} of its cap (${capStateLabel(m.before.cap)})`,
        `${fmtPct(m.after.cap.utilisation)} (${capStateLabel(m.after.cap)})`,
        gbp(m.before.totals.totalGBP), gbp(m.after.totals.totalGBP),
      )],
      action: <LinkButton href={hrefFor('spend', { seg: ['matches'], query: { status: 'review' } })}>{TRY.match.link}</LinkButton>,
    });
  }

  const r = f.rate;
  rows.push({
    key: 'rate', icon: 'sliders', title: TRY.rate.title, body: TRY.rate.body(fmtPct(r.target, 0), fmtPct(r.now, 0), fmtPct(DEFAULTS.renewalRate, 0)),
    see: [TRY.rate.moves(gbp(r.nowTotals.byType.renewal), gbp(r.afterTotals.byType.renewal), gbp(r.nowTotals.totalGBP), gbp(r.afterTotals.totalGBP))],
    action: <Button type="button" variant="outline" leftIcon="gear" onClick={(e) => ui.openSettings(e.currentTarget)}>{TRY.rate.button}</Button>,
  });

  if (clause) {
    rows.push({
      key: 'handcheck', icon: 'clipboard-check', ...TRY.handcheck,
      see: [TRY.handcheck.now(handcheckLine(f.handcheck.checked, f.handcheck.total))],
      action: <LinkButton icon="file-lines" href={hrefFor('source', { seg: [clause.contractId, clause.extractionId], query: { from: 'opportunities' } })}>{`Open ${clause.clauseRef.replace(/^Clause/, 'clause')}, page ${clause.page}`}</LinkButton>,
    });
  }

  rows.push({
    key: 'share', icon: 'share-nodes', ...TRY.share, see: [TRY.share.see],
    action: <LinkButton href={hrefFor('opportunities', { query: { type: 'overCap' } })}>{TRY.share.link}</LinkButton>,
  });

  const resetAll = async (e) => {
    if (!f.changes.length) { ui.toast({ tone: 'info', title: 'Nothing to reset.', description: 'You have not changed anything yet.' }); return; }
    const ok = await ui.confirm({ title: COPY.resetDialog.title, description: COPY.resetDialog.body, confirmLabel: COPY.resetDialog.confirm, cancelLabel: COPY.resetDialog.cancel, destructive: true });
    if (!ok) return;
    actions.resetAll();
    const [what, ...rest] = COPY.toasts.resetDone.split(/(?<=\.)\s+/);
    ui.toast({ tone: 'success', title: what, description: rest.join(' ') });
  };
  rows.push({
    key: 'reset', icon: 'rotate-left', title: TRY.reset.title, body: TRY.reset.body,
    see: [TRY.reset.see(gbp(f.start.totals.totalGBP))],
    status: f.changes.length ? TRY.reset.changed(f.changes) : TRY.reset.nothing,
    action: <Button type="button" variant="outline" leftIcon="rotate-left" onClick={resetAll}>{COPY.settings.reset}</Button>,
  });

  return (
    <Section id="try">
      <div className="kx-card gd-try-card">
        <ul className="gd-try-list">
          {rows.map((row) => (
            <li key={row.key} className="gd-try" data-try={row.key}>
              <span className="gd-try__icon" aria-hidden="true"><i className={'fa-solid fa-' + row.icon} /></span>
              <div className="gd-try__main">
                <h3 className="gd-try__title">{row.title}</h3>
                <p className="gd-try__body">{row.body}</p>
                {row.status && <p className="gd-try__status">{row.status}</p>}
                <Expect inline lines={row.see} />
              </div>
              <div className="gd-try__action">{row.action}</div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------------------------------------------- 5. numbers */

function NumbersSection({ estate, f }) {
  const t = estate.totals;
  const cards = breakdownCards(t);
  const rate = fmtPct(estate.opts.renewalRate, 0);
  const near = fmtPct(estate.opts.nearCapThreshold, 0);
  const explain = { overCap: NUMBERS.bases.overCap, nearCap: NUMBERS.bases.nearCap, renewal: NUMBERS.bases.renewal(rate), uplift: NUMBERS.bases.uplift };
  const confidenceLead = COPY.method.find((m) => m.id === 'confidence').lead;
  const noticeLead = COPY.method.find((m) => m.id === 'notice').lead;
  const excluded = excludedNote(t);
  return (
    <Section id="numbers">
      <Callout tone="warning" title={NUMBERS.notSavings.title}>
        <p>{COPY.caveat.long}</p>
        <p className="gd-callout__links"><MethodLink section="indicative" /> <a className="gd-link" href={hrefFor('evidence')}>Read the cases on the evidence page</a></p>
      </Callout>

      <Callout title={NUMBERS.indicative.title}>
        <p>{COPY.caveat.tooltip}</p>
        <p>{NUMBERS.indicative.extra}</p>
      </Callout>

      <Panel as="h3" title={NUMBERS.bases.title} description={NUMBERS.bases.intro} padded={20}
        footer={(
          <div className="gd-sum">
            <p className="gd-sum__label">{NUMBERS.bases.addsUp}</p>
            <p className="gd-sum__line tnum">{sumLine(t)}</p>
            <p className="gd-sum__note">{NUMBERS.bases.once}{excluded ? ` ${excluded}` : ''}</p>
          </div>
        )}>
        <ul className="gd-bases">
          {cards.map((c) => (
            <li key={c.type} className="gd-basis" data-basis={c.type}>
              <h4 className="gd-basis__title"><FlagBadge type={c.type} label={c.title} /></h4>
              <p className="gd-basis__value tnum">{c.value}</p>
              <p className="gd-basis__sub">{c.sub}</p>
              <p className="gd-basis__text">{explain[c.type]}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="gd-pair">
        <Panel as="h3" title={NUMBERS.confidence.title} padded={20}>
          <ul className="gd-rows">
            <li><ConfidencePill band="high" /><span>{NUMBERS.confidence.high}</span></li>
            <li><ConfidencePill band="medium" /><span>{NUMBERS.confidence.medium}</span></li>
            <li><ConfidencePill band="review" /><span>{NUMBERS.confidence.review}</span></li>
          </ul>
          <p className="gd-small">{confidenceLead}</p>
          <p className="gd-small gd-small--strong">{NUMBERS.confidence.live(f.flagsToReview, f.counts.ranked)} <MethodLink section="confidence" /></p>
        </Panel>

        <Panel as="h3" title={NUMBERS.notice.title} padded={20}>
          <p className="gd-text">{NUMBERS.notice.body}</p>
          <p className="gd-text">{noticeLead}</p>
          <p className="gd-text">{NUMBERS.notice.miss}</p>
          <p className="gd-text">{NUMBERS.notice.radar}</p>
          <p className="gd-small gd-links"><MethodLink section="notice" /><a className="gd-link" href={hrefFor('renewals')}>Open renewal radar</a></p>
        </Panel>
      </div>

      <Panel as="h3" title={NUMBERS.cap.title} padded={20}>
        <ul className="gd-rows gd-rows--cap">
          <li><CapStatePill state="over" /><span>{NUMBERS.cap.over(fmtPct(1, 0))}</span></li>
          <li><CapStatePill state="near" /><span>{NUMBERS.cap.near(near, fmtPct(1, 0))}</span></li>
          <li><CapStatePill state="ok" /><span>{NUMBERS.cap.within(near)}</span></li>
          <li><Pill tone="warning" icon="triangle-exclamation">{NUMBERS.cap.estimate}</Pill><span>{NUMBERS.cap.estimateBody}</span></li>
        </ul>
        <p className="gd-small gd-small--strong">{NUMBERS.cap.live(f.capStates.over, f.capStates.near, f.capStates.ok)} <MethodLink section="cap" /></p>
      </Panel>
    </Section>
  );
}

/* ---------------------------------------------------------------------------------------------------------- 6. real */

function RealSection({ estate }) {
  const notBuilt = roadmap.statusRows.filter((r) => r.notInPrototype).map((r) => r.feature.charAt(0).toLowerCase() + r.feature.slice(1));
  const lists = {
    real: [
      <>{REAL.real.calc} <MethodLink /></>,
      <>{REAL.real.cases(evidence.length)} <a className="gd-link" href={hrefFor('evidence')}>Read why this matters</a></>,
      REAL.real.sources,
    ],
    made: [
      COPY.banner.body,
      COPY.illustrativeLabel,
      REAL.made.payments,
      REAL.made.date(fmtDateLong(estate.asOf)),
    ],
    not: [
      <>{REAL.not.stage2(joinList(notBuilt))} <a className="gd-link" href={hrefFor('roadmap')}>Open roadmap</a></>,
      REAL.not.ingestion,
      REAL.not.ownData,
    ],
  };
  return (
    <Section id="real">
      <ul className="gd-real">
        {REAL.groups.map((g) => (
          <li key={g.id} className={'gd-real__col gd-real__col--' + g.id}>
            <h3 className="gd-real__title"><i className={'fa-solid fa-' + g.icon} aria-hidden="true" />{g.title}</h3>
            <ul className="gd-bullets">
              {lists[g.id].map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ----------------------------------------------------------------------------------------------------- 7. glossary */

function GlossarySection() {
  return (
    <Section id="glossary">
      <dl className="gd-glossary">
        {GLOSSARY.map(([term, def]) => (
          <div key={term} className="gd-term"><dt>{term}</dt><dd>{def}</dd></div>
        ))}
      </dl>
    </Section>
  );
}

/* --------------------------------------------------------------------------------------------------------- 8. keys */

function KeysSection({ f }) {
  const list = addresses(f);
  return (
    <Section id="keys">
      <Panel as="h3" title={KEYS.moving.title} padded={20}>
        <dl className="gd-keys">
          {KEYS.moving.rows.map((r) => (
            <div key={r.keys.join('-') + r.text.slice(0, 12)} className="gd-keys__row">
              <dt>{r.keys.map((k, i) => <span key={k + i}>{i > 0 && <span className="gd-keys__sep">, </span>}<Kbd>{k}</Kbd></span>)}</dt>
              <dd>{r.text}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel as="h3" title={KEYS.addresses.title} description={KEYS.addresses.intro} padded={20}>
        <ul className="gd-addr">
          {list.map((a) => (
            <li key={a.pattern} className="gd-addr__item">
              <code className="gd-code gd-code--block">{a.pattern}</code>
              <p className="gd-addr__what">{a.what}</p>
              <a className="gd-link gd-link--go" href={a.example}>Open example<span className="sr-only">: {a.pattern}</span><i className="fa-solid fa-arrow-right" aria-hidden="true" /></a>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel as="h3" title={KEYS.back.title} padded={20}>
        <p className="gd-text">{KEYS.back.body}</p>
      </Panel>
    </Section>
  );
}

/* ---------------------------------------------------------------------------------------------------------- 9. faq */

function FaqSection({ estate, f, ui }) {
  const t = estate.totals;
  const cov = estate.coverage;
  const council = estate.council;
  const head = fmtGBPCompact(t.totalGBP);
  const m = f.match;
  const roadmapNames = roadmap.statusRows.filter((r) => r.notInPrototype).map((r) => r.feature.charAt(0).toLowerCase() + r.feature.slice(1));
  const gbp = fmtGBPCompact;

  const items = [
    {
      q: `Why is the headline ${head} and not a bigger number?`,
      a: (
        <>
          <p>The headline adds up only what a rule flags: money already paid above a cap, the part of close-to-cap spend that is projected to land above it, {fmtPct(estate.opts.renewalRate, 0)} of each renewal's annual value, and price increases above a cap. It does not add up contract values or total spend. {headlineShareText(t, cov)}</p>
          <p>It also leaves out {fmtGBP(cov.noContractGBP)} paid to {plural(cov.noContract.length, 'payee')} with no contract on the register, because there is no clause to test it against. Payments with a suggested supplier match are left out until you confirm them. <MethodLink section="indicative" /></p>
        </>
      ),
    },
    {
      q: 'Why do some contracts show "At least"?',
      a: (
        <>
          <p>{COPY.partialCoverageNote(council.spendDataFrom)} In this sample, {plural(f.partialCaps, 'contract')} started before then, so {f.partialCaps === 1 ? 'its figure shows' : 'their figures show'} At least: the real spend may be higher.</p>
          <p><a className="gd-link" href={hrefFor('spend')}>Open cap vs spend</a></p>
        </>
      ),
    },
    {
      q: 'Why does confirming a match change the headline?',
      a: (
        <>
          <p>A payment counts against a contract only when its payee name is matched to the contract's supplier. A similar name gets a score from 0 to 1. {DEFAULTS.autoAcceptScore.toFixed(2)} or more is accepted, {DEFAULTS.suggestScore.toFixed(2)} to {(DEFAULTS.autoAcceptScore - 0.01).toFixed(2)} is suggested for you to confirm, and anything lower is left unmatched. {COPY.matching.notCounted}</p>
          {m && (
            <p>
              In this sample, {plural(m.paymentCount, 'payment')} ({fmtGBP(m.totalGBP)}) paid to {m.payee} {m.confirmed ? 'are counted because you confirmed the match' : 'are suggested and not counted yet'}.
              {' '}{m.confirmed ? `They count towards ${m.contract.title}, which is at ${fmtPct(m.after.cap.utilisation)} of its cap (${capStateLabel(m.after.cap)}).` : `Confirm the match and they count towards ${m.contract.title}. It moves from ${fmtPct(m.before.cap.utilisation)} to ${fmtPct(m.after.cap.utilisation)} of its cap (${capStateLabel(m.after.cap)}), which adds an over cap amount, so the headline moves from ${gbp(m.before.totals.totalGBP)} to ${gbp(m.after.totals.totalGBP)}.`}
            </p>
          )}
          <p><a className="gd-link" href={hrefFor('spend', { seg: ['matches'], query: { status: 'review' } })}>Open supplier matches</a> <MethodLink section="matching" /></p>
        </>
      ),
    },
    {
      q: 'Can I use my own data?',
      a: (
        <>
          <p>Not today. There is no upload and no import in this prototype.</p>
          <p>The prototype reads one JSON file that is built into the page. It holds {plural(f.counts.contracts, 'contract')}, {plural(f.counts.answers, 'extracted answer')} with their clause and page, and {plural(f.counts.payments, 'payment')}, in the same shape as a council's contracts and spend. Every screen and every calculation runs on whatever is in that file, in your browser.</p>
          <p>Using a council's own data would mean replacing that file and rebuilding the prototype. That has not been tried with real data. The prototype does not read documents or spend files. Whether Kontor can take a batch of public PDFs without a developer is still being tested.</p>
          <p><button type="button" className="gd-link" onClick={(e) => ui.openAbout(e.currentTarget)}>{TEXT.aboutThisData}</button> <a className="gd-link" href={hrefFor('roadmap')}>Open roadmap</a></p>
        </>
      ),
    },
    {
      q: 'What does "Needs review" mean?',
      a: (
        <>
          <p>Kontor is not sure about an answer that a flag relies on, or about a supplier match. Read the clause before you rely on the figure. {COPY.method.find((x) => x.id === 'confidence').lead}</p>
          <p>In this sample, {plural(f.flagsToReview, 'flag')} of {fmtNumber(f.counts.ranked)} {f.flagsToReview === 1 ? 'needs' : 'need'} review, and {plural(f.answersToReview, 'answer')} of {fmtNumber(f.counts.answers)} {f.answersToReview === 1 ? 'is' : 'are'} marked Needs review. <MethodLink section="confidence" /></p>
        </>
      ),
    },
    {
      q: 'What is not covered yet?',
      a: (
        <>
          <p>Stage 2 and the not-yet items are not built: {joinList(roadmapNames)}. Reading contracts is not shown either. This prototype starts after document ingestion, so every answer appears already extracted.</p>
          <p><a className="gd-link" href={hrefFor('roadmap')}>Open roadmap</a></p>
        </>
      ),
    },
  ];

  return (
    <Section id="faq">
      <div className="gd-faq">
        {items.map((it) => (
          <details key={it.q} className="gd-q">
            <summary><span>{it.q}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" /></summary>
            <div className="gd-q__a">{it.a}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------------------------------------------- the page */

export default function Guide() {
  const { estate, state, actions } = useEstate();
  const ui = useUI();
  const route = useRoute();
  const wanted = route.query.get('s');
  const [active, setActive] = useState(SECTION_IDS[0]);
  const f = useMemo(() => guideFacts(estate, state), [estate, state]);
  const first = useRef(true);

  // ?s=<section>: scroll to the heading and focus it. The router moves focus to the h1 a frame after a route change, so the heading
  // takes focus two frames later. The first landing is instant, a click inside the page glides (reduced motion: instant).
  useEffect(() => {
    if (!wanted || !SECTION_IDS.includes(wanted)) { first.current = false; return undefined; }
    const el = document.getElementById(wanted);
    if (!el) return undefined;
    const behavior = first.current ? 'auto' : scrollBehavior();
    first.current = false;
    scrollMainTo(el, behavior);
    setActive(wanted);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => el.focus({ preventScroll: true })); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [wanted]);

  // Which section is being read: the last heading above a line a little below the top of the scrolling area.
  useEffect(() => {
    const main = document.getElementById('shell-main');
    if (!main) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const box = main.getBoundingClientRect();
      const line = box.top + 140;
      const atEnd = main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
      let current = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= line || (atEnd && top < box.bottom - 48)) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => { main.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="page gd-page">
      <PageHeader eyebrow={TEXT.eyebrow} title="Guide" asAt description={<p>{TEXT.pageIntro}</p>} />
      <div className="gd-layout">
        <Toc active={active} wanted={wanted} />
        <div className="gd-content">
          <StartSection estate={estate} f={f} ui={ui} />
          <TourSection estate={estate} f={f} />
          <ScreensSection f={f} />
          <TrySection estate={estate} f={f} ui={ui} actions={actions} />
          <NumbersSection estate={estate} f={f} />
          <RealSection estate={estate} />
          <GlossarySection />
          <KeysSection f={f} />
          <FaqSection estate={estate} f={f} ui={ui} />
        </div>
      </div>
    </div>
  );
}
