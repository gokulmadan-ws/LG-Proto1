// One table of payments for the drill-downs (R38): date, reference, name as paid, amount, with a subtotal row to the penny.
// Paged when it is long. The subtotal covers EVERY row passed in, not just the page on screen.
import { useState } from 'react';
import { DataTable, Pager } from '../../ui/index.js';
import { fmtDate, fmtGBPPence } from '../../lib/format.js';
import { PAY } from './strings.js';

/** Sum of amounts rounded to the penny (the same rule as paymentsFor in estate.js). */
export const sumGBP = (payments) => Math.round(payments.reduce((s, p) => s + p.amountGBP, 0) * 100) / 100;

/**
 * @param {object} props
 * @param {{ id: string, date: string, supplierNameRaw: string, amountGBP: number }[]} props.payments  raw payment rows (a.payment of an attributed payment)
 * @param {string} props.caption  accessible name of the table
 * @param {number} [props.pageSize=12]
 * @param {string} [props.pagerLabel]  unique name for the pager (axe landmark-unique)
 * @param {boolean} [props.withYear]  adds a "Year" column (annual caps); `yearOf(payment)` supplies the number
 * @param {(p: object) => number} [props.yearOf]
 * @param {string} [props.subtotalLabel]  overrides the subtotal wording
 */
export function PaymentList({ payments, caption, pageSize = 12, pagerLabel = 'Payments pages', withYear = false, yearOf, subtotalLabel, empty = PAY.none, className = '' }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(payments.length / pageSize));
  const current = Math.min(page, pages);
  const shown = payments.slice((current - 1) * pageSize, current * pageSize);
  const columns = [
    { key: 'date', label: PAY.cols.date, nowrap: true, render: (p) => <><time dateTime={p.date}>{fmtDate(p.date)}</time><span className="pay-ref-sm kx-mono">{p.id}</span></> },
    { key: 'ref', label: PAY.cols.ref, nowrap: true, render: (p) => <span className="kx-mono">{p.id}</span> },
    { key: 'name', label: PAY.cols.name, minWidth: 110, render: (p) => p.supplierNameRaw },
    ...(withYear ? [{ key: 'year', label: PAY.cols.year, nowrap: true, render: (p) => yearOf(p) }] : []),
    { key: 'amount', label: PAY.cols.amount, num: true, nowrap: true, render: (p) => fmtGBPPence(p.amountGBP) },
  ];
  return (
    <div className={('pay-list ' + className).trim()}>
      <DataTable dense caption={caption} columns={columns} rows={shown} rowKey="id" empty={empty}
        footer={payments.length ? [{ key: 'sub', label: subtotalLabel || PAY.subtotal(payments.length, payments.length > pageSize), values: { amount: fmtGBPPence(sumGBP(payments)) } }] : undefined} />
      <Pager page={current} pageSize={pageSize} total={payments.length} onPage={setPage} unit="payment" label={pagerLabel} />
    </div>
  );
}

export default PaymentList;
