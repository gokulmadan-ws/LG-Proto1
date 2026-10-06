// Spend by contract year (R42, R51) and the Guildford moment (R40): YearBars against an ANNUAL cap, CumulativeLine against a WHOLE-TERM cap with the
// crossing annotated ("Cap crossed, 8 Apr 2025"). Both are fed by the chart adapters from the engine output; the by-year table beside them carries
// every figure as text and its total is the same spend-to-date figure the key figures and the payments table show.
import { useMemo } from 'react';
import { COPY } from '../../lib/copy.js';
import { fmtDate, fmtGBP, fmtGBPPence } from '../../lib/format.js';
import { DataTable, Panel } from '../../ui/index.js';
import {
  BULLET_LEGEND, ChartFigure, CumulativeLine, LINE_LEGEND, Legend, YearBars, cumulativeSeries, cumulativeTable, gbpFull, yearBarsProps,
} from '../../charts/index.js';
import { DETAIL } from './strings.js';

function yearRows(estate, contract) {
  const from = estate.council.spendDataFrom;
  return estate.summaries[contract.id].byYear.map((y) => {
    const before = y.to < from;            // the whole contract year is before the spend files start: no figure, not "£0"
    const partialFiles = !before && y.from < from;
    return { id: y.year, year: y.year, partial: y.partial, dates: `${fmtDate(y.from)} to ${fmtDate(y.to)}`, spend: y.spendGBP, before, partialFiles };
  });
}

export function SpendSection({ contract, estate }) {
  const S = DETAIL.spend;
  const d = estate.derived[contract.id];
  const cap = contract.cap;
  const annual = !!cap && cap.basis === 'annual';
  const closeAt = estate.opts.nearCapThreshold;
  const series = useMemo(() => cumulativeSeries(estate, contract.id), [estate, contract.id]);
  const rows = useMemo(() => yearRows(estate, contract), [estate, contract]);
  const partial = d.spend.coverage === 'partial';
  // CumulativeLine draws the end label (value and share of cap) beside the "Cap" label; when the line ends just above the cap (C-007, 114%) the two
  // collide at 340px, so that range gets a taller plot. (Request for A3 in docs/handoff/V6.md: the collision test should allow for two lines.)
  const over = d.cap.testable && d.cap.utilisation > 1 && d.cap.utilisation < 1.35;

  const columns = [
    {
      key: 'year', label: S.yearCols.year, rowHeader: true, nowrap: true,
      render: (r) => <>{S.year(r.year)}{r.partial && <span className="cd-ytd">{S.yearToDate}</span>}</>,
    },
    { key: 'dates', label: S.yearCols.dates, nowrap: true, render: (r) => r.dates },
    {
      key: 'spend', label: S.yearCols.spend, num: true, nowrap: true,
      render: (r) => (r.before ? <span className="cd-muted">{S.notInFiles}</span> : <>{r.partialFiles && <span className="cd-atleast">{S.atLeast} </span>}{fmtGBPPence(r.spend)}</>),
    },
  ];

  return (
    <Panel as="h2" id="cd-spend-title" title={S.title} description={S.description} padded={24}>
      <div className="cd-spend">
        <div className="cd-spend__chart">
          {!cap ? null : annual ? (
            <ChartFigure as="h3" title={S.annualTitle(fmtGBP(cap.amountGBP))} legend={<Legend items={BULLET_LEGEND} label="Cap legend" />} footnote={S.yearsNote}>
              <YearBars {...yearBarsProps(estate, contract.id)} format={gbpFull} height={260} closeAt={closeAt} />
            </ChartFigure>
          ) : (
            <ChartFigure
              as="h3" title={S.cumulativeTitle} legend={<Legend items={LINE_LEGEND(cap.amountGBP)} label="Cap legend" />}
              table={cumulativeTable(series, cap.amountGBP)}
              footnote={(
                <>
                  {cap.source === 'contract_value' && <span className="cd-note">{S.estimateCap(fmtGBP(cap.amountGBP))} </span>}
                  {partial && <span className="cd-note">{COPY.partialCoverageNote(d.spend.coverageFrom)}</span>}
                </>
              )}
            >
              <CumulativeLine series={series} cap={cap.amountGBP} closeAt={closeAt} height={over ? 440 : 340} subject={contract.title} />
            </ChartFigure>
          )}
        </div>
        <div className="cd-spend__years">
          <h3 className="cd-spend__h">{S.yearsTitle}</h3>
          <DataTable
            caption={S.yearsCaption} columns={columns} rows={rows} rowKey="id"
            footer={[{ key: 'total', label: S.total, values: { spend: <>{partial && <span className="cd-atleast">{S.atLeast} </span>}{fmtGBPPence(d.spend.toDate)}</> } }]}
          />
        </div>
      </div>
    </Panel>
  );
}

export default SpendSection;
