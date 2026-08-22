/* ------------------------------------------------------------------
   Results.js — read-only views over an engine result.
------------------------------------------------------------------ */

const VERDICT_COPY = {
  empty: "—",
  critical: "Critical",
  danger: "At risk",
  warn: "Thin",
  good: "Healthy",
  great: "Strong",
};

/* Horizontal stacked bar: where each unit of revenue actually goes. */
const RevenueBreakdown = ({ result, currency }) => {
  const { formatMoney, formatPct } = window.CostEngine;
  const rows = result.breakdown.filter((row) => row.value > 0.0001);
  const loss = result.netProfitPerUnit < 0;

  return (
    <div className="liquid-glass rounded-[1.25rem] p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h4 className="font-heading italic text-white text-2xl tracking-[-1px] leading-none">
          Where the money goes
        </h4>
        <span className="text-[11px] text-white/45 font-body">per order</span>
      </div>

      <div className="flex w-full h-3 rounded-full overflow-hidden bg-white/[0.06]">
        {rows.map((row) => (
          <span
            key={row.key}
            className="h-full"
            style={{
              width: `${row.pct}%`,
              background: row.tone,
              opacity: row.isProfit ? 1 : 0.9,
            }}
            title={`${row.label}: ${formatPct(row.pct)}`}
          />
        ))}
      </div>

      {loss ? (
        <p className="mt-3 text-[11px] font-body text-white/70 leading-snug">
          Costs exceed revenue on this unit — the bar shows the cost stack only, with no profit slice
          left to draw.
        </p>
      ) : null}

      <ul className="mt-4 space-y-1.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2.5 text-xs font-body">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: row.tone, boxShadow: "0 0 0 1px rgba(255,255,255,0.18)" }}
            />
            <span className={`flex-1 truncate ${row.isProfit ? "text-white" : "text-white/60"} font-light`}>
              {row.label}
            </span>
            <span className="tabular-nums text-white/75 w-16 text-right">
              {formatMoney(row.value, currency)}
            </span>
            <span className="tabular-nums text-white/45 w-12 text-right">{formatPct(row.pct, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* The four thresholds that decide whether you can scale. */
const BreakEvenPanel = ({ result, currency }) => {
  const { formatMoney, formatNumber } = window.CostEngine;

  const items = [
    {
      label: "Break-even price",
      value: result.breakEvenPrice === null ? "—" : formatMoney(result.breakEvenPrice, currency),
      note: "Covers variable cost only",
    },
    {
      label: "Price to clear overhead",
      value:
        result.breakEvenPriceWithFixed === null
          ? "—"
          : formatMoney(result.breakEvenPriceWithFixed, currency),
      note: `At ${formatNumber(result.units)} units / month`,
    },
    {
      label: "Break-even units",
      value: isFinite(result.breakEvenUnits) ? formatNumber(Math.ceil(result.breakEvenUnits)) : "never",
      note: "Orders needed to cover fixed cost",
    },
    {
      label: "Break-even ROAS",
      value: isFinite(result.breakEvenRoas) ? `${result.breakEvenRoas.toFixed(2)}x` : "—",
      note: `Max CPA ${formatMoney(result.maxCpa, currency)}`,
    },
  ];

  return (
    <div className="liquid-glass rounded-[1.25rem] p-5">
      <h4 className="font-heading italic text-white text-2xl tracking-[-1px] leading-none mb-4">
        Thresholds
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-body font-medium">
              {item.label}
            </div>
            <div className="font-heading italic text-white text-2xl tracking-[-1px] leading-none mt-2">
              {item.value}
            </div>
            <div className="text-[11px] text-white/45 font-body font-light mt-1.5 leading-snug">
              {item.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const VerdictPanel = ({ result, currency }) => {
  const { formatMoney, formatPct } = window.CostEngine;
  const verdict = result.verdict;
  return (
    <div className="liquid-glass rounded-[1.25rem] p-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-body font-medium text-white">
          {VERDICT_COPY[verdict.level]}
        </span>
        <h4 className="font-heading italic text-white text-2xl tracking-[-1px] leading-none">
          {verdict.title}
        </h4>
      </div>
      <p className="mt-3 text-sm text-white/70 font-body font-light leading-snug">{verdict.note}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-body text-white/85">
          Gross margin {formatPct(result.grossMarginPct)}
        </span>
        <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-body text-white/85">
          Markup {formatPct(result.markupPct, 0)}
        </span>
        <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-body text-white/85">
          ROI on cost {formatPct(result.roiOnCost, 0)}
        </span>
        <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-body text-white/85">
          Landed {formatMoney(result.landedCost, currency)}
        </span>
        <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-body text-white/85">
          Stock cash {formatMoney(result.cashTiedInStock, currency, { compact: true })}
        </span>
      </div>
    </div>
  );
};

/* Full monthly P&L, per unit and per month. */
const Ledger = ({ result, currency }) => {
  const { formatMoney, formatNumber } = window.CostEngine;
  const { LedgerRow } = window.CalcControls;
  const m = result.monthly;
  const money = (value) => formatMoney(value, currency);
  const monthMoney = (value) => formatMoney(value, currency, { decimals: 0 });
  /* Cost lines print with a leading minus — except when they round to zero. */
  const cost = (value) => (Math.abs(value) < 0.005 ? money(0) : `-${money(value)}`);
  const monthCost = (value) => (Math.abs(value) < 0.5 ? monthMoney(0) : `-${monthMoney(value)}`);

  return (
    <div className="liquid-glass rounded-[1.25rem] p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h4 className="font-heading italic text-white text-3xl tracking-[-1px] leading-none">
          Monthly P&amp;L
        </h4>
        <span className="text-[11px] text-white/45 font-body">
          {formatNumber(result.units)} orders / month
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 pb-2 text-[11px] uppercase tracking-[0.14em] text-white/40 font-body font-medium">
        <span>Line</span>
        <span className="text-right w-24">Per unit</span>
        <span className="text-right w-28">Per month</span>
      </div>

      <LedgerRow label="Revenue charged" perUnit={money(result.revenueCharged)} perMonth={monthMoney(m.grossRevenue)} hint="Selling price less discount, plus any shipping you charge the customer." />
      <LedgerRow label="Refunds" perUnit={cost(result.refundedRevenue)} perMonth={monthCost(m.refunds)} indent hint="Revenue handed back on returned orders." />
      <LedgerRow label="Net revenue" perUnit={money(result.revenueRetained)} perMonth={monthMoney(m.netRevenue)} emphasis />

      <LedgerRow label="Product landed cost" perUnit={cost(result.goodsCost)} perMonth={monthCost(m.goods)} hint="Buying price + inbound freight + duty + customs + prep, grossed up for defective units and net of resellable returns." />
      <LedgerRow label="Marketplace / channel fee" perUnit={cost(result.channelFee)} perMonth={monthCost(m.channel)} hint="Referral or commission plus any other percentage channel fee." />
      <LedgerRow label="Payment processing" perUnit={cost(result.paymentFee)} perMonth={monthCost(m.payment)} hint="Percentage + fixed fee. Processors keep these on refunded orders." />
      <LedgerRow label="Fulfilment &amp; shipping" perUnit={cost(result.fulfillment)} perMonth={monthCost(m.fulfillment)} hint="Pick, pack and outbound postage per order." />
      <LedgerRow label="Storage" perUnit={cost(result.storage)} perMonth={monthCost(m.storage)} />
      <LedgerRow label="Returns handling" perUnit={cost(result.returnsHandling)} perMonth={monthCost(m.returns)} hint="Return rate x cost to take one unit back and re-process it." />
      <LedgerRow label="Advertising" perUnit={cost(result.adCost)} perMonth={monthCost(m.ads)} hint="Paid on every order placed, including the ones later returned." />
      <LedgerRow label="Contribution margin" perUnit={money(result.contribution)} perMonth={monthMoney(m.contribution)} emphasis />

      <LedgerRow label="Fixed overhead" perUnit={cost(result.fixedPerUnit)} perMonth={monthCost(m.fixed)} hint="Subscriptions, software, payroll and everything else that does not scale with orders." />
      <LedgerRow label="Operating profit" perUnit={money(result.operatingPerUnit)} perMonth={monthMoney(m.operating)} emphasis />
      <LedgerRow label="Tax" perUnit={cost(result.taxPerUnit)} perMonth={monthCost(m.tax)} />
      <LedgerRow label="Net profit" perUnit={money(result.netProfitPerUnit)} perMonth={monthMoney(m.net)} emphasis />
    </div>
  );
};

/* Price ladder: what a +/-20% move does to the whole model. */
const Sensitivity = ({ result, currency }) => {
  const { formatMoney, formatPct, formatNumber } = window.CostEngine;
  const find = (delta) => result.sensitivity.find((row) => row.delta === delta);
  const base = find(0);
  const up = find(10);
  const down = find(-10);

  return (
    <div className="liquid-glass rounded-[1.25rem] p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h4 className="font-heading italic text-white text-3xl tracking-[-1px] leading-none">
          Price sensitivity
        </h4>
        <span className="text-[11px] text-white/45 font-body">holding cost and volume steady</span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-white/40 font-body font-medium">
              <th className="text-left font-medium pb-3">Scenario</th>
              <th className="text-right font-medium pb-3 pl-4">Price</th>
              <th className="text-right font-medium pb-3 pl-4">Contribution</th>
              <th className="text-right font-medium pb-3 pl-4">Net margin</th>
              <th className="text-right font-medium pb-3 pl-4">Profit / unit</th>
              <th className="text-right font-medium pb-3 pl-4">Monthly net</th>
              <th className="text-right font-medium pb-3 pl-4">Break-even units</th>
            </tr>
          </thead>
          <tbody>
            {result.sensitivity.map((row) => {
              const base = row.delta === 0;
              return (
                <tr
                  key={row.delta}
                  className={`border-t ${base ? "border-white/20" : "border-white/[0.06]"}`}
                >
                  <td className={`py-3 font-body text-sm ${base ? "text-white" : "text-white/60"}`}>
                    {base ? "Current" : `${row.delta > 0 ? "+" : ""}${row.delta}%`}
                  </td>
                  <td className={`py-3 pl-4 text-right tabular-nums font-body text-sm ${base ? "text-white" : "text-white/70"}`}>
                    {formatMoney(row.price, currency)}
                  </td>
                  <td className={`py-3 pl-4 text-right tabular-nums font-body text-sm ${base ? "text-white" : "text-white/70"}`}>
                    {formatMoney(row.contribution, currency)}
                  </td>
                  <td className={`py-3 pl-4 text-right tabular-nums font-body text-sm ${base ? "text-white" : "text-white/70"}`}>
                    {formatPct(row.netMarginPct)}
                  </td>
                  <td className={`py-3 pl-4 text-right tabular-nums font-body text-sm ${base ? "text-white" : "text-white/70"}`}>
                    {formatMoney(row.profitPerUnit, currency)}
                  </td>
                  <td className={`py-3 pl-4 text-right tabular-nums font-body text-sm ${base ? "text-white" : "text-white/70"}`}>
                    {formatMoney(row.monthlyNet, currency, { decimals: 0 })}
                  </td>
                  <td className={`py-3 pl-4 text-right tabular-nums font-body text-sm ${base ? "text-white" : "text-white/70"}`}>
                    {isFinite(row.breakEvenUnits) ? formatNumber(Math.ceil(row.breakEvenUnits)) : "never"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex-1 min-h-[24px]" />

      <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-body font-medium">
            Margin per 10% price move
          </div>
          <div className="font-heading italic text-white text-2xl tracking-[-1px] leading-none mt-2">
            {formatPct(Math.abs(up.netMarginPct - base.netMarginPct))}
          </div>
          <p className="text-[11px] text-white/45 font-body font-light mt-1.5 leading-snug">
            Every cost line is fixed in cash terms, so a price rise drops almost straight through to
            margin.
          </p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-body font-medium">
            Cost of a 10% discount
          </div>
          <div className="font-heading italic text-white text-2xl tracking-[-1px] leading-none mt-2">
            {formatMoney(Math.max(0, base.monthlyNet - down.monthlyNet), currency, { decimals: 0 })}
          </div>
          <p className="text-[11px] text-white/45 font-body font-light mt-1.5 leading-snug">
            Monthly profit given up by discounting, before any lift in volume.
          </p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-body font-medium">
            Volume needed to match it
          </div>
          <div className="font-heading italic text-white text-2xl tracking-[-1px] leading-none mt-2">
            {down.contribution > 0
              ? formatPct((base.contribution / down.contribution - 1) * 100, 0)
              : "—"}
          </div>
          <p className="text-[11px] text-white/45 font-body font-light mt-1.5 leading-snug">
            Extra orders a 10% discount must generate just to stand still.
          </p>
        </div>
      </div>
    </div>
  );
};

window.CalcResults = { RevenueBreakdown, BreakEvenPanel, VerdictPanel, Ledger, Sensitivity };
