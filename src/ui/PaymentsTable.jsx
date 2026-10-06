import { useState } from 'react';
import { DataTable } from './DataTable.jsx';
import { Pager } from './Pager.jsx';

const GBP = (x) => '£' + Number(x).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATE = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]} ${m[1]}` : '';
};

const COLUMNS = [
  { key: 'date', label: 'Date', nowrap: true, render: (a) => DATE(a.payment.date) },
  { key: 'payment', label: 'Payment', minWidth: 200, render: (a) => (
    <span className="kx-payments__what">
      <span>{a.payment.purpose}</span>
      <span className="kx-payments__who">{a.payment.supplierNameRaw}<span aria-hidden="true"> · </span><span className="kx-mono">{a.payment.id}</span></span>
    </span>
  ) },
  { key: 'amount', label: 'Amount', num: true, nowrap: true, render: (a) => GBP(a.payment.amountGBP) },
];

/**
 * The payments behind a contract's spend figure (requirement R38): every contributing payment, a subtotal to the penny,
 * and the payments made AFTER the contract ended in their own table with their own subtotal.
 * Feed it with paymentsFor(estate, contractId) from src/lib/estate.js.
 *
 * The subtotal row equals `contract spend to date` shown on the cap row (the engine sums the same payments).
 *
 * @param {object} props
 * @param {{ inTerm: object[], afterEnd: object[], totalGBP: number, inTermGBP: number, afterEndGBP: number }} props.payments result of paymentsFor()
 * @param {number} [props.pageSize=20] rows per page of the in-term table (0 shows all, scrolling)
 * @param {number} [props.maxHeight] px; scrolls the in-term table under a sticky header when pageSize is 0
 * @param {string} [props.contractLabel] used in the table captions ("Highways reactive maintenance")
 * @param {string} [props.pagerLabel='Payments pages'] accessible name of the pager; make it unique when two pagers are on screen
 */
export function PaymentsTable({ payments, pageSize = 20, maxHeight, contractLabel = 'this contract', pagerLabel = 'Payments pages' }) {
  const [page, setPage] = useState(1);
  const { inTerm, afterEnd, totalGBP, inTermGBP, afterEndGBP } = payments;
  const rows = pageSize ? inTerm.slice((page - 1) * pageSize, page * pageSize) : inTerm;
  const key = (a) => a.payment.id;
  return (
    <div className="kx-payments">
      <DataTable
        caption={`Payments counted against ${contractLabel}, ${inTerm.length} in total`} columns={COLUMNS} rows={rows} rowKey={key} maxHeight={maxHeight}
        footer={[{ key: 'sub', label: pageSize && inTerm.length > pageSize ? `Subtotal, all ${inTerm.length.toLocaleString('en-GB')} payments` : `Subtotal, ${inTerm.length.toLocaleString('en-GB')} payments`, values: { amount: GBP(inTermGBP) } }]}
        empty="No payments are linked to this contract." />
      {pageSize > 0 && <Pager page={page} pageSize={pageSize} total={inTerm.length} onPage={setPage} unit="payment" label={pagerLabel} />}
      {afterEnd.length > 0 && (
        <div className="kx-payments__after">
          <h3 className="kx-section-title">Paid after the end date</h3>
          <p className="kx-caption">These payments are dated after the contract ended. They are included in the total below.</p>
          <DataTable caption={`Payments dated after the end of ${contractLabel}`} columns={COLUMNS} rows={afterEnd} rowKey={key}
            footer={[{ key: 'sub', label: `Subtotal, ${afterEnd.length.toLocaleString('en-GB')} payments`, values: { amount: GBP(afterEndGBP) } }]} />
        </div>
      )}
      <div className="kx-payments__total">
        <span>Total paid to date</span>
        <strong className="kx-num">{GBP(totalGBP)}</strong>
      </div>
    </div>
  );
}

export default PaymentsTable;
