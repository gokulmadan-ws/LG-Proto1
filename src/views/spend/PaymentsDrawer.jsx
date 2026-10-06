// The payments behind a spend figure (R38), in a kit Drawer.
//   <ContractPaymentsDrawer contractId onClose />   every payment counted against a contract, subtotal to the penny, "Paid after the end date" listed
//                                                   separately; annual caps add YearBars and a contract-year selector so the year total reconciles.
//   <PayeeDrawer payee onClose />                   every payment under one payee name that has no contract on the register.
// Both are driven by the address (?payments=<contractId> and ?payee=<name>), so Back, reload and Share keep them, and both read the live estate.
import { useMemo, useState } from 'react';
import { useEstate, paymentsFor } from '../../lib/estate.js';
import { COPY, capBasisLabel, capSourceLabel, capStateLabel } from '../../lib/copy.js';
import { evidenceFor, evidenceForField } from '../../lib/evidenceFor.js';
import { fmtGBP, fmtGBPPence, fmtDate, fmtPct, plural } from '../../lib/format.js';
import { hrefFor } from '../../lib/router.js';
import { ClauseLink } from '../../components/index.js';
import { Drawer, Panel, Segmented } from '../../ui/index.js';
import DS from '../../ui/ds.js';
import { BULLET_LEGEND, CapStatePill, ChartFigure, Legend, YearBars, gbpFull, yearBarsProps } from '../../charts/index.js';
import { PaymentList, sumGBP } from './PaymentList.jsx';
import { PAY } from './strings.js';

const { Button } = DS;

/** The clause that states the cap: the cap flag's own evidence first, then the maximum, then the contract value. */
export function capClauseFor(estate, contractId) {
  const d = estate.derived[contractId];
  const flagId = (d.flagIds || []).find((id) => { const f = estate.flagsById[id]; return f && (f.type === 'overCap' || f.type === 'nearCap'); });
  const flag = flagId ? estate.flagsById[flagId] : null;
  return (flag && evidenceFor(flag)) || evidenceForField(contractId, 'maximumValue') || evidenceForField(contractId, 'awardedTotalValue');
}

function Figure({ label, children, sub }) {
  return (
    <div className="pay-fig">
      <dt className="pay-fig__label">{label}</dt>
      <dd className="pay-fig__value">{children}</dd>
      {sub && <dd className="pay-fig__sub">{sub}</dd>}
    </div>
  );
}

function ContractPaymentsBody({ estate, contract }) {
  const c = contract;
  const d = estate.derived[c.id];
  const cap = d.cap;
  const pay = useMemo(() => paymentsFor(estate, c.id), [estate, c.id]);
  const years = estate.summaries[c.id].byYear;
  const annual = cap.testable && cap.basis === 'annual' && years.length > 0;
  const worst = annual ? years.reduce((m, y) => (y.spendGBP > m.spendGBP ? y : m), years[0]) : null;
  const [sel, setSel] = useState(annual ? String(worst.year) : 'all');
  const yearOfPayment = (p) => { const y = years.find((x) => p.date >= x.from && p.date <= x.to); return y ? y.year : 0; };
  const selectedYear = annual && sel !== 'all' ? years.find((y) => String(y.year) === sel) : null;

  const rows = pay.all.filter((a) => !selectedYear || yearOfPayment(a.payment) === selectedYear.year);
  const inTerm = rows.filter((a) => a.period !== 'after_end').map((a) => a.payment);
  const afterEnd = rows.filter((a) => a.period === 'after_end').map((a) => a.payment);
  const totalGBP = sumGBP(rows.map((a) => a.payment));
  const over = cap.testable && cap.excessGBP > 0;
  const partial = estate.summaries[c.id].coverage === 'partial';

  const yearRows = annual ? years.map((y) => ({ ...y, over: Math.max(0, y.spendGBP - cap.capGBP) })) : [];
  const yearTable = annual ? {
    columns: [
      { key: 'year', label: 'Contract year' }, { key: 'dates', label: 'Dates' }, { key: 'spend', label: 'Spend', align: 'right' },
      { key: 'share', label: 'Share of annual cap', align: 'right' }, { key: 'over', label: 'Over by', align: 'right' },
    ],
    rows: yearRows.map((y) => ({
      id: y.year, year: `Year ${y.year}${y.partial ? ' (year to date)' : ''}`, dates: `${fmtDate(y.from)} to ${fmtDate(y.to)}`, spend: gbpFull(y.spendGBP),
      share: fmtPct(y.spendGBP / cap.capGBP, 1), over: y.over > 0 ? gbpFull(y.over) : 'None',
    })),
  } : null;
  const overYears = yearRows.filter((y) => y.over > 0);

  return (
    <div className="pay">
      {cap.testable && (
        <dl className="pay-figs" aria-label="Cap summary">
          {annual
            ? <Figure label={PAY.figures.worst} sub={`Year ${worst.year}, ${PAY.indicative.toLowerCase()}`}>{fmtGBP(cap.spendAgainstCap)}</Figure>
            : <Figure label={PAY.figures.spend} sub={`${PAY.figures.paymentsCount(pay.all.length)}, ${PAY.indicative.toLowerCase()}`}>{partial && <small>At least </small>}{fmtGBP(cap.spendAgainstCap)}</Figure>}
          <Figure label={annual ? 'Annual cap' : PAY.figures.cap} sub={`${capSourceLabel(cap)} · ${capBasisLabel(cap)}`}>{fmtGBP(cap.capGBP)}</Figure>
          <Figure label={PAY.figures.share} sub={<CapStatePill state={cap.state} label={capStateLabel(cap)} wrap />}>{fmtPct(cap.utilisation, 1)}</Figure>
          {over
            ? <Figure label={`${PAY.figures.over}, ${PAY.indicative.toLowerCase()}`} sub={annual ? 'Across all contract years' : null}>{fmtGBP(cap.excessGBP)}</Figure>
            : <Figure label="Headroom, indicative" sub="Left before the cap">{fmtGBP(Math.max(0, cap.capGBP - cap.spendAgainstCap))}</Figure>}
        </dl>
      )}
      {partial && <p className="pay-note"><i className="fa-solid fa-circle-info" aria-hidden="true" /> {COPY.partialCoverageNote(estate.summaries[c.id].coverageFrom)}</p>}

      {annual && (
        <section className="pay-section" aria-labelledby="pay-years-h">
          <h3 id="pay-years-h" className="pay-section__h">{PAY.yearsTitle}</h3>
          <p className="pay-section__p">{PAY.yearsNote}</p>
          <Panel padded={16}>
            <ChartFigure as="h4" title={`Spend in each contract year against the annual cap of ${fmtGBP(cap.capGBP)}`} legend={<Legend items={BULLET_LEGEND} label="Cap legend" />} table={yearTable}>
              <YearBars {...yearBarsProps(estate, c.id)} format={gbpFull} height={200} />
            </ChartFigure>
          </Panel>
          <p className="pay-section__p pay-section__p--strong">
            {overYears.length ? overYears.map((y) => PAY.yearOver(y.year, fmtGBP(y.over))).join(' ') : PAY.yearsAllWithin}{' '}
            <span className="pay-section__muted">{PAY.yearHighest(worst.year, fmtGBP(worst.spendGBP))}</span>
          </p>
        </section>
      )}

      <section className="pay-section" aria-labelledby="pay-list-h">
        <h3 id="pay-list-h" className="pay-section__h">{PAY.paymentsTitle}</h3>
        {annual && (
          <div className="pay-select">
            <span className="pay-select__label" id="pay-year-label">{PAY.yearSelector}</span>
            <Segmented label={PAY.yearSelector} value={sel} onChange={setSel}
              options={[...years.map((y) => ({ value: String(y.year), label: PAY.yearOption(y.year, y.partial) })), { value: 'all', label: PAY.allYears }]} />
          </div>
        )}
        <div className="pay-block">
          <h4 className="pay-block__h">{PAY.inTerm} <span className="pay-block__count">{plural(inTerm.length, 'payment')}</span></h4>
          <PaymentList payments={inTerm} caption={`${PAY.inTerm}, ${c.title}${selectedYear ? `, year ${selectedYear.year}` : ''}`} pagerLabel="Payments in the contract term pages"
            withYear={annual && !selectedYear} yearOf={(p) => yearOfPayment(p)} subtotalLabel={PAY.subtotal(inTerm.length, inTerm.length > 12)}
            empty={selectedYear ? PAY.noneForYear : PAY.none} />
        </div>
        {afterEnd.length > 0 && (
          <div className="pay-block">
            <h4 className="pay-block__h">{PAY.afterEnd} <span className="pay-block__count">{plural(afterEnd.length, 'payment')}</span></h4>
            <p className="pay-block__p">{PAY.afterEndNote}</p>
            <PaymentList payments={afterEnd} caption={`${PAY.afterEnd}, ${c.title}`} pagerLabel="Payments after the end date pages" subtotalLabel={PAY.subtotal(afterEnd.length, afterEnd.length > 12)} />
          </div>
        )}
        <div className="pay-total" data-pay-total={totalGBP.toFixed(2)}>
          <div>
            <span className="pay-total__label">{selectedYear ? PAY.totalYear(selectedYear.year) : annual ? PAY.totalRange : PAY.total}</span>
            <span className="pay-total__note">
              {afterEnd.length > 0 && <>{PAY.split(fmtGBPPence(sumGBP(inTerm)), fmtGBPPence(sumGBP(afterEnd)))} </>}
              {selectedYear && selectedYear.year === (worst && worst.year) ? PAY.yearTotalNote : PAY.totalNote}
            </span>
          </div>
          <strong className="pay-total__value">{fmtGBPPence(totalGBP)}</strong>
        </div>
      </section>
    </div>
  );
}

/** Drawer for one contract. `contractId` null closes it. Remount per contract so the year selector starts on the worst year. */
export function ContractPaymentsDrawer({ contractId, onClose }) {
  const { estate } = useEstate();
  const c = contractId ? estate.contractsById[contractId] : null;
  const clause = c && estate.derived[c.id].cap.testable ? capClauseFor(estate, c.id) : null;
  const footer = c && (
    <div className="pay-foot">
      <div className="pay-foot__links">
        {clause && <ClauseLink contractId={clause.contractId} extractionId={clause.extractionId} page={clause.page} from="spend" context={c.title} />}
        <a className="pay-link" href={hrefFor('contracts', { seg: [c.id] })}><i className="fa-regular fa-folder-open" aria-hidden="true" /><span className="pay-link__t">{PAY.openContract}<span className="sr-only">, {c.title}</span></span></a>
      </div>
      <Button variant="outline" onClick={onClose}>{PAY.closePanel}</Button>
    </div>
  );
  return (
    <Drawer open={!!c} onClose={onClose} size="lg" className="pay-drawer" title={PAY.title}
      subtitle={c ? `${c.title} · ${c.supplierName}` : null} footer={footer}>
      {c && <ContractPaymentsBody key={c.id} estate={estate} contract={c} />}
    </Drawer>
  );
}

/** Drawer for one payee with no contract on the register: every payment under that exact name. */
export function PayeeDrawer({ payee, onClose }) {
  const { estate } = useEstate();
  const list = useMemo(() => (payee ? estate.data.payments.filter((p) => p.supplierNameRaw === payee).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1)) : []), [estate, payee]);
  const open = !!payee && list.length > 0;
  const total = sumGBP(list);
  return (
    <Drawer open={open} onClose={onClose} size="lg" className="pay-drawer" title={PAY.payeeTitle} subtitle={payee}
      footer={open ? <div className="pay-foot"><a className="pay-link" href={hrefFor('spend', { seg: ['matches'] })}><i className="fa-solid fa-link" aria-hidden="true" /><span className="pay-link__t">See supplier matches</span></a><Button variant="outline" onClick={onClose}>{PAY.closePanel}</Button></div> : null}>
      {open && (
        <div className="pay">
          <dl className="pay-figs pay-figs--two" aria-label="Payee summary">
            <Figure label="Total paid under this name" sub={`Indicative, ${plural(list.length, 'payment')}`}>{fmtGBP(total)}</Figure>
            <Figure label="Contract on the register" sub={PAY.payeeNote}>None</Figure>
          </dl>
          <section className="pay-section" aria-labelledby="pay-payee-h">
            <h3 id="pay-payee-h" className="pay-section__h">{PAY.paymentsTitle}</h3>
            <PaymentList payments={list} caption={`Payments to ${payee}`} pagerLabel="Payee payments pages" />
            <div className="pay-total" data-pay-total={total.toFixed(2)}>
              <div><span className="pay-total__label">{PAY.payeeNoteTotal}</span><span className="pay-total__note">Equal to the amount on the list, to the penny.</span></div>
              <strong className="pay-total__value">{fmtGBPPence(total)}</strong>
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
