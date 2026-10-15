// Actions page, Board tab (#/actions). Build spec 8.4.
//   Query: ?owner=<personId>  ?type=overCap|nearCap|renewal|uplift   (filters, shareable like the Opportunities page)
//          ?card=<flagId>     highlight that card once (the "Open in Actions" toast button)
// Four columns: To start, Checking internally, With supplier, Closed (the last 30 days). Cards sort by due date, soonest first.
// A card opens the drawer on its Action tab. Cards move by drag and drop between columns, or with the "Move to" menu on every card
// (keyboard and touch). Moving to Closed opens the close dialog. Under 760px the columns become one list grouped by stage.
import { useEffect, useMemo, useState } from 'react';
import { useEstate } from '../../lib/estate.js';
import { setQuery } from '../../lib/router.js';
import { ACT, STAGE_LABEL, dueChipText } from '../../lib/actions-copy.js';
import { STAGES, actionTotals, boardColumns, dueState, ownersOnBoard, stepProgress } from '../../lib/actions.js';
import { FLAG_TYPES, flagTypeLabel, fmtGBP, fmtGBPCompact } from '../../lib/copy.js';
import { isJustAdded } from '../../lib/just-added.js';
import { peopleById } from '../../data/people.js';
import DS from '../../ui/ds.js';
import { MenuButton, StatTile } from '../../ui/index.js';
import { FlagBadge, FlagFilterChips, gbp } from '../../charts/index.js';
import { OutcomePill, PersonAvatar } from '../../components/ActionBits.jsx';
import { CloseActionDialog } from '../../components/CloseActionDialog.jsx';
import { useActionCommands } from '../../components/useActionCommands.js';

const { Button, Select } = DS;
const B = ACT.board;

function closedValueText(a) {
  const parts = [a.cashRecoveredGBP > 0 ? `${fmtGBP(a.cashRecoveredGBP)} cash recovered` : null, a.costAvoidedGBP > 0 ? `${fmtGBP(a.costAvoidedGBP)} cost avoided` : null].filter(Boolean);
  return parts.join(' and ');
}

function Card({ card, contract, highlight, onOpen, onMove, dragging, setDragging }) {
  const a = card.action;
  const f = card.flag;
  const owner = a.owner ? peopleById[a.owner] : null;
  const closed = a.stage === 'closed';
  const prog = stepProgress(a);
  const due = dueState(a.due);
  const fresh = !closed && isJustAdded(a.flagId);
  const items = STAGES.filter((s) => s !== a.stage).map((s) => ({ id: s, label: STAGE_LABEL[s], onSelect: () => onMove(f, s) }));
  const value = closedValueText(a);
  return (
    <li className={'acts-card' + (highlight ? ' is-highlight' : '') + (fresh ? ' is-fresh' : '') + (dragging === a.flagId ? ' is-dragging' : '')}
      data-card={a.flagId} draggable="true"
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', a.flagId); setDragging(a.flagId); }}
      onDragEnd={() => setDragging(null)}>
      <div className="acts-card__top">
        <span className="acts-card__pills">
          <FlagBadge type={f.type} label={flagTypeLabel(f)} />
          {fresh && <span className="acts-card__fresh">{B.justAdded}</span>}
        </span>
        {!closed && <span className={'acts-due is-' + due}>{dueChipText(a.due, a.flagType, due)}</span>}
      </div>
      <h3 className="acts-card__title">
        <button type="button" className="acts-card__open" onClick={() => onOpen(a.flagId)} data-open-card={a.flagId}>
          {contract.title}<span className="sr-only">. {B.open(contract.title)}</span>
        </button>
      </h3>
      <p className="acts-card__supplier">{contract.supplierName}</p>
      {!closed && <p className="acts-card__value">{fmtGBP(card.value)}</p>}
      {!closed && (
        <div className="acts-card__prog">
          <PersonAvatar person={owner} label={owner ? `${ACT.who.owner}: ${owner.name}` : B.unassigned} />
          <span className="acts-prog" aria-hidden="true"><span style={{ width: (prog.total ? (prog.done / prog.total) * 100 : 0) + '%' }} /></span>
          <span className="acts-card__count" aria-label={B.progressLabel(prog.done, prog.total)}>{B.progress(prog.done, prog.total)}</span>
        </div>
      )}
      {!closed && <p className="acts-card__next">{prog.next ? <><b>{B.next}</b> {prog.next.text}</> : B.allDone}</p>}
      {closed && (
        <>
          <div className="acts-card__prog">
            <OutcomePill outcome={a.outcome} />
            <PersonAvatar person={owner} label={owner ? `${ACT.who.owner}: ${owner.name}` : B.unassigned} />
          </div>
          <p className="acts-card__next">{value ? B.closedLine(value, 'value', fmtGBP(a.flaggedGBP), a.closedAt) : B.closedPlain(fmtGBP(a.flaggedGBP), a.closedAt)}</p>
        </>
      )}
      <div className="acts-card__foot">
        <MenuButton label={B.moveLabel(contract.title)} items={items} icon="arrow-right-arrow-left" variant="ghost" size="sm" placement="bottom-start">
          {B.moveTo}<span className="sr-only">: {contract.title}</span>
        </MenuButton>
      </div>
    </li>
  );
}

export default function Board({ route }) {
  const { estate, state } = useEstate();
  const cmd = useActionCommands();
  const actions = state.actions || {};
  const owners = ownersOnBoard(estate, actions);
  const ownerParam = route.query.get('owner');
  const owner = owners.some((p) => p.id === ownerParam) ? ownerParam : null;
  const typeParam = route.query.get('type');
  const type = FLAG_TYPES.includes(typeParam) ? typeParam : null;
  const cardParam = route.query.get('card');
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);
  const [closing, setClosing] = useState(null);      // flagId waiting for the close dialog
  const [highlight, setHighlight] = useState(null);
  const [refocus, setRefocus] = useState(null);      // a moved card re-renders in its new column: put focus back on its Move to button

  const totals = actionTotals(estate, actions);
  const cols = boardColumns(estate, actions, { owner, type });
  const byOwner = boardColumns(estate, actions, { owner });
  const counts = useMemo(() => {
    const c = { all: 0, overCap: 0, nearCap: 0, renewal: 0, uplift: 0 };
    byOwner.forEach((col) => col.cards.forEach((x) => { c.all += 1; c[x.action.flagType] += 1; }));
    return c;
  }, [byOwner]);

  // "Open in Actions": scroll to the card, focus it and highlight it for a few seconds, then drop the parameter.
  useEffect(() => {
    if (!cardParam) return undefined;
    setHighlight(cardParam);
    const t1 = setTimeout(() => {
      const el = document.querySelector(`[data-card="${CSS.escape(cardParam)}"]`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
        const b = el.querySelector('.acts-card__open');
        if (b) b.focus({ preventScroll: true });
      }
    }, 80);
    const t2 = setTimeout(() => { setHighlight(null); setQuery({ card: null }); }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [cardParam]);

  useEffect(() => {
    if (!refocus) return undefined;
    const t = setTimeout(() => {
      const b = document.querySelector(`[data-card="${CSS.escape(refocus)}"] .kx-menubtn button`);
      if (b) b.focus({ preventScroll: false });
      setRefocus(null);
    }, 30);
    return () => clearTimeout(t);
  }, [refocus]);

  const open = (flagId) => setQuery({ flag: flagId, tab: 'action' });
  const move = (flag, stage) => {
    if (stage === 'closed') { setClosing(flag.id); return; }
    cmd.move(flag, stage);
    setRefocus(flag.id);
  };
  const drop = (stage) => (e) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/plain') || dragging;
    setDragging(null);
    const f = id && estate.flagsById[id];
    if (!f || !actions[id] || actions[id].stage === stage) return;
    move(f, stage);
  };
  const closingFlag = closing ? estate.flagsById[closing] : null;
  const filtered = !!(owner || type);

  return (
    <div className="acts-board-tab">
      <section className="acts-stats kx-grid kx-grid--4" aria-label={B.statsLabel}>
        <StatTile label={B.stats.working} value={fmtGBPCompact(totals.beingWorkedGBP)} foot={B.workingFoot} data-stat="working" title={fmtGBP(totals.beingWorkedGBP)} />
        <StatTile label={B.stats.open} value={totals.openCount} foot={B.openFoot} data-stat="open" />
        <StatTile label={B.stats.due} value={totals.dueSoonCount} foot={B.dueFoot} data-stat="due" className={totals.dueSoonCount > 0 ? 'is-warn' : ''} />
        <StatTile label={B.stats.value} value={fmtGBP(totals.valueSecuredGBP)} foot={<span className="acts-stat__link">{B.valueFoot}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>} href="#/actions/results" data-stat="value" />
      </section>

      <div className="acts-filters" role="group" aria-label={B.filters}>
        <label className="acts-filter">
          <span className="acts-filter__label">{B.owner}</span>
          <Select value={owner || ''} onChange={(e) => setQuery({ owner: e.target.value || null })}
            options={[{ value: '', label: B.everyone }, ...owners.map((p) => ({ value: p.id, label: p.name }))]} />
        </label>
        <FlagFilterChips counts={counts} value={type} onChange={(t) => setQuery({ type: t === type ? null : t })} label={B.typeLabel} allLabel={B.allTypes} />
        {filtered && <Button type="button" variant="ghost" size="sm" leftIcon="xmark" onClick={() => setQuery({ owner: null, type: null })}>{B.clear}</Button>}
      </div>
      <p className="acts-help">{B.dragHelp}</p>

      <div className="acts-board">
        {cols.map((col) => (
          <section key={col.stage} className={'acts-col' + (over === col.stage ? ' is-over' : '')} data-stage={col.stage} aria-labelledby={`acts-col-${col.stage}`}
            onDragOver={(e) => { if (dragging) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== col.stage) setOver(col.stage); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver((o) => (o === col.stage ? null : o)); }}
            onDrop={drop(col.stage)}>
            <header className="acts-col__head">
              <h2 className="acts-col__title" id={`acts-col-${col.stage}`} aria-label={B.columnLabel(col.label, col.count)}>
                {col.label} <span className="acts-col__count" aria-hidden="true">{col.count}</span>
              </h2>
              <span className="acts-col__total" data-total={col.stage === 'closed' ? '' : col.totalGBP} title={col.stage === 'closed' ? undefined : fmtGBP(col.totalGBP)}>
                {col.stage === 'closed' ? B.last30 : gbp(col.totalGBP)}
              </span>
            </header>
            {col.cards.length === 0
              ? <p className="acts-col__empty">{filtered ? B.noMatch : B.empty}</p>
              : (
                <ul className="acts-col__cards">
                  {col.cards.map((c) => (
                    <Card key={c.action.flagId} card={c} contract={estate.contractsById[c.action.contractId]} highlight={highlight === c.action.flagId}
                      onOpen={open} onMove={move} dragging={dragging} setDragging={setDragging} />
                  ))}
                </ul>
              )}
          </section>
        ))}
      </div>

      <CloseActionDialog open={!!closingFlag} flag={closingFlag} contract={closingFlag ? estate.contractsById[closingFlag.contractId] : null}
        action={closing ? actions[closing] : null} initialOutcome="resolved"
        onCancel={() => setClosing(null)} onConfirm={(input) => { const f = closingFlag; setClosing(null); cmd.close(f, input); setRefocus(f.id); }} />
    </div>
  );
}
