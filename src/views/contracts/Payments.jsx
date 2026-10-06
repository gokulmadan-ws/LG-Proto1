// The payments behind the spend figure (R38, R51): every payment linked to this contract, paged 20, newest first, with the name as it was paid and the
// supplier it was matched to (and how). The total row is the spend-to-date figure to the penny; payments dated after the end date are marked and totalled
// separately. Caption: "Sample payments (fictional)" (R12). Sorting and paging are local state; the page resets when the contract changes (key it).
import { useMemo, useState } from 'react';
import { paymentsFor } from '../../lib/estate.js';
import { COPY, matchMethodLabel } from '../../lib/copy.js';
import { fmtDate, fmtGBPPence } from '../../lib/format.js';
import { DataTable, EmptyState, Pager, Panel, Pill } from '../../ui/index.js';
import { DETAIL } from './strings.js';

const PAGE_SIZE = 20;

export function PaymentsSection({ contract, estate }) {
  const P = DETAIL.payments;
  const pay = useMemo(() => paymentsFor(estate, contract.id), [estate, contract.id]);
  const suppliers = useMemo(() => Object.fromEntries(estate.data.suppliers.map((s) => [s.id, s.legalName])), [estate]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });

  const sorted = useMemo(() => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    const get = sort.key === 'amount' ? (a) => a.payment.amountGBP : (a) => a.payment.date;
    return [...pay.all].sort((a, b) => {
      const x = get(a), y = get(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sign || a.payment.id.localeCompare(b.payment.id);
    });
  }, [pay, sort]);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
    setPage(1);
  };

  const columns = [
    {
      key: 'date', label: P.columns.date, sortable: true, nowrap: true,
      render: (a) => (
        <span className="cd-pay__date">
          {fmtDate(a.payment.date)}
          {a.period === 'after_end' && <Pill tone="warning" icon="calendar-xmark" size="sm">{P.afterEnd}</Pill>}
        </span>
      ),
    },
    { key: 'ref', label: P.columns.ref, nowrap: true, render: (a) => <span className="cd-ref">{a.payment.id}</span> },
    { key: 'name', label: P.columns.name, minWidth: 200, render: (a) => a.payment.supplierNameRaw },
    {
      key: 'supplier', label: P.columns.supplier, minWidth: 220,
      render: (a) => {
        const m = estate.matches.get(a.payment.supplierNameRaw);
        return (
          <span className="cd-pay__who">
            <span>{suppliers[a.supplierId] || contract.supplierName}</span>
            {m && <span className="cd-pay__how">{matchMethodLabel(m.method)}, {m.score.toFixed(2)}</span>}
          </span>
        );
      },
    },
    { key: 'amount', label: P.columns.amount, sortable: true, num: true, nowrap: true, render: (a) => fmtGBPPence(a.payment.amountGBP) },
  ];

  const footer = [{ key: 'total', label: P.total(pay.all.length, pay.all.length > PAGE_SIZE), values: { amount: fmtGBPPence(pay.totalGBP) } }];
  if (pay.afterEnd.length > 0) footer.push({ key: 'after', label: P.totalAfter(pay.afterEnd.length), values: { amount: fmtGBPPence(pay.afterEndGBP) } });

  return (
    <Panel as="h2" id="cd-payments-title" title={P.title} count={pay.all.length} description={P.description(estate.council)} padded={false}
      footer={<p className="cd-pfoot">{P.note} {COPY.vatNote}</p>}>
      {pay.all.length === 0 ? (
        <EmptyState as="h3" icon="receipt" title={P.empty}>{P.emptyHelp}</EmptyState>
      ) : (
        <>
          <DataTable className="cd-pay" caption={COPY.paymentsCaption} columns={columns} rows={rows} rowKey={(a) => a.payment.id} sort={sort} onSort={onSort} footer={footer} />
          <div className="cd-pager"><Pager page={page} pageSize={PAGE_SIZE} total={pay.all.length} onPage={setPage} unit="payment" label={P.pagerLabel} /></div>
        </>
      )}
    </Panel>
  );
}

export default PaymentsSection;
