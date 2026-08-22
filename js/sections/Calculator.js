/* ------------------------------------------------------------------
   Calculator — the working part of the site.

   Left column: every operational cost line, grouped.
   Right column: live unit economics, sticky on desktop.
   Below: full monthly P&L and a price-sensitivity ladder.
------------------------------------------------------------------ */

const STORAGE_KEY = "aeon.cost-model.v1";

const CURRENCY_OPTIONS = Object.keys(window.CostEngine.CURRENCIES).map((code) => ({
  value: code,
  label: `${code} ${window.CostEngine.CURRENCIES[code].symbol}`,
}));

const PRESET_OPTIONS = Object.keys(window.CostEngine.PRESETS).map((key) => ({
  value: key,
  label: window.CostEngine.PRESETS[key].label,
}));

const loadSaved = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
};

const Calculator = () => {
  const Engine = window.CostEngine;
  const { Field, GlassSelect, Segmented, GhostButton, Panel, StatTile } = window.CalcControls;
  const { RevenueBreakdown, BreakEvenPanel, VerdictPanel, Ledger, Sensitivity } = window.CalcResults;
  const { Tag, Package, Truck, Megaphone, RotateBack, Building, Download, Copy, Reset, Pin, Check } =
    window.Icons;

  const saved = React.useMemo(loadSaved, []);
  const [inputs, setInputs] = React.useState(() =>
    Object.assign({}, Engine.DEFAULTS, saved ? saved.inputs : null)
  );
  const [currency, setCurrency] = React.useState(() => (saved && saved.currency) || "USD");
  const [preset, setPreset] = React.useState(() => (saved && saved.preset) || "amazon_fba");
  const [category, setCategory] = React.useState("Most categories");
  const [baseline, setBaseline] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const result = React.useMemo(() => Engine.analyze(inputs), [inputs]);
  const symbol = Engine.CURRENCIES[currency].symbol;

  /* Persist quietly; a refresh should never lose a half-built model. */
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, currency, preset }));
    } catch (error) {
      /* private mode / quota — not worth interrupting the user over */
    }
  }, [inputs, currency, preset]);

  const set = (key) => (value) => setInputs((prev) => Object.assign({}, prev, { [key]: value }));

  const applyPreset = (key) => {
    setPreset(key);
    const values = Engine.PRESETS[key].values;
    setInputs((prev) => Object.assign({}, prev, values));
  };

  const applyCategory = (label) => {
    setCategory(label);
    const match = Engine.CATEGORIES.find((item) => item.label === label);
    if (match && match.pct !== null) set("referralFeePct")(match.pct);
  };

  const reset = () => {
    setInputs(Object.assign({}, Engine.DEFAULTS));
    setPreset("amazon_fba");
    setCategory("Most categories");
    setBaseline(null);
  };

  const summaryText = () => {
    const money = (value) => Engine.formatMoney(value, currency);
    return [
      "AEON — ecommerce operating cost model",
      "",
      `Selling price          ${money(inputs.sellingPrice)}`,
      `Landed cost / unit     ${money(result.landedCost)}`,
      `Total cost / unit      ${money(result.totalCostPerUnit)}`,
      `Contribution margin    ${money(result.contribution)}  (${Engine.formatPct(result.contributionPct)})`,
      `Net profit / unit      ${money(result.netProfitPerUnit)}  (${Engine.formatPct(result.netMarginPct)})`,
      `Net profit / month     ${money(result.monthly.net)} on ${Engine.formatNumber(result.units)} orders`,
      "",
      `Break-even price       ${result.breakEvenPrice === null ? "—" : money(result.breakEvenPrice)}`,
      `Break-even units       ${isFinite(result.breakEvenUnits) ? Math.ceil(result.breakEvenUnits) : "never"}`,
      `Break-even ROAS        ${isFinite(result.breakEvenRoas) ? result.breakEvenRoas.toFixed(2) + "x" : "—"}`,
      `Max cost per order     ${money(result.maxCpa)}`,
      `Cash tied up in stock  ${money(result.cashTiedInStock)}`,
    ].join("\n");
  };

  const copySummary = () => {
    const text = summaryText();
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
      return;
    }
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    try { document.execCommand("copy"); } catch (error) { /* nothing else to try */ }
    document.body.removeChild(scratch);
    done();
  };

  const downloadCsv = () => {
    const blob = new Blob([Engine.toCsv(result, currency)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aeon-cost-model.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* Delta chips against a pinned scenario. */
  const delta = (selector, format) => {
    if (!baseline) return null;
    const before = selector(baseline);
    const after = selector(result);
    const diff = after - before;
    if (!isFinite(diff) || Math.abs(diff) < 0.005) return "no change";
    return `${diff > 0 ? "+" : ""}${format(diff)}`;
  };

  const money = (value) => Engine.formatMoney(value, currency);

  return (
    <section id="calculator" className="relative w-full bg-black py-24 px-6 md:px-16 lg:px-20">
      {/* header */}
      <div className="mb-12">
        <motion.p
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-sm font-body text-white/80 mb-6"
        >
          // Mission control
        </motion.p>

        <h2 className="font-heading italic text-white text-6xl md:text-7xl lg:text-[6rem] leading-[0.9] tracking-[-3px]">
          <window.BlurText text="Operating cost," delay={90} justify="flex-start" className="font-heading italic text-white" as="span" />
          <window.BlurText text="decoded" delay={90} startDelay={0.12} justify="flex-start" className="font-heading italic text-white" as="span" />
        </h2>

        <motion.p
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="mt-6 text-sm md:text-base text-white/80 max-w-2xl font-body font-light leading-snug"
        >
          Buying price, freight, duty, marketplace commission, fulfilment, storage, payment
          processing, advertising, returns and overhead — every line that stands between a sale and
          the money you keep. Change one number and the whole model re-prices instantly.
        </motion.p>
      </div>

      {/* toolbar */}
      <div className="liquid-glass rounded-[1.25rem] p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[260px] overflow-x-auto no-scrollbar">
          <Segmented options={PRESET_OPTIONS} value={preset} onChange={applyPreset} />
        </div>
        <div className="w-[140px]">
          <GlassSelect value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GhostButton
            onClick={() => setBaseline(baseline ? null : result)}
            icon={Pin}
            title="Pin the current numbers, then compare as you edit"
          >
            {baseline ? "Clear baseline" : "Pin baseline"}
          </GhostButton>
          <GhostButton onClick={copySummary} icon={copied ? Check : Copy}>
            {copied ? "Copied" : "Copy summary"}
          </GhostButton>
          <GhostButton onClick={downloadCsv} icon={Download}>CSV</GhostButton>
          <GhostButton onClick={reset} icon={Reset}>Reset</GhostButton>
        </div>
      </div>

      <p className="text-[11px] text-white/40 font-body font-light mb-8 max-w-3xl leading-snug">
        {Engine.PRESETS[preset].blurb} Preset rates are 2026 published list prices and every field
        stays editable — override anything with your own contract numbers.
      </p>

      {/* two-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
        {/* ---- inputs ---- */}
        <div className="flex flex-col gap-5">
          <Panel title="Revenue" icon={Tag} subtitle="What the customer actually pays you">
            <Field
              label="Selling price"
              hint="List price per unit before any discount."
              prefix={symbol}
              value={inputs.sellingPrice}
              onChange={set("sellingPrice")}
              range={{ min: 0, max: 500, step: 0.5 }}
            />
            <Field
              label="Average discount"
              hint="Blended promo, coupon and sale discount across all orders."
              suffix="%"
              value={inputs.discountPct}
              onChange={set("discountPct")}
              range={{ min: 0, max: 60, step: 0.5 }}
            />
            <Field
              label="Shipping charged"
              hint="Postage revenue you collect from the customer, per order."
              prefix={symbol}
              value={inputs.shippingChargedToCustomer}
              onChange={set("shippingChargedToCustomer")}
            />
            <Field
              label="Orders per month"
              hint="Gross orders placed, before returns."
              value={inputs.unitsPerMonth}
              onChange={set("unitsPerMonth")}
              range={{ min: 0, max: 5000, step: 10 }}
            />
          </Panel>

          <Panel title="Landed cost" icon={Package} subtitle="Getting one sellable unit into your warehouse">
            <Field label="Buying price" hint="Supplier invoice price per unit, ex-works." prefix={symbol} value={inputs.buyingPrice} onChange={set("buyingPrice")} range={{ min: 0, max: 200, step: 0.25 }} />
            <Field label="Inbound freight" hint="Sea or air freight allocated per unit." prefix={symbol} value={inputs.inboundFreightPerUnit} onChange={set("inboundFreightPerUnit")} />
            <Field label="Duty / tariff" hint="Import duty as a percentage of the goods value." suffix="%" value={inputs.dutyPct} onChange={set("dutyPct")} range={{ min: 0, max: 60, step: 0.5 }} />
            <Field label="Customs & brokerage" hint="Clearance, brokerage and port charges, per unit." prefix={symbol} value={inputs.customsPerUnit} onChange={set("customsPerUnit")} />
            <Field label="Packaging & prep" hint="Retail packaging, labels, inserts, prep-centre work." prefix={symbol} value={inputs.packagingPerUnit} onChange={set("packagingPerUnit")} />
            <Field label="Defect rate" hint="Units written off on arrival. Their cost is absorbed by the sellable units." suffix="%" value={inputs.defectRatePct} onChange={set("defectRatePct")} range={{ min: 0, max: 25, step: 0.5 }} />
          </Panel>

          <Panel title="Channel & fulfilment" icon={Truck} subtitle="What the platform and the warehouse take">
            <div className="sm:col-span-2">
              <GlassSelect
                label="Category (sets referral fee)"
                hint="Marketplace referral rates vary by category — picking one fills the field below."
                value={category}
                onChange={applyCategory}
                options={Engine.CATEGORIES.map((item) => ({
                  value: item.label,
                  label: item.pct === null ? item.label : `${item.label} — ${item.pct}%`,
                }))}
              />
            </div>
            <Field label="Referral / commission" hint="Marketplace cut of the order total." suffix="%" value={inputs.referralFeePct} onChange={set("referralFeePct")} range={{ min: 0, max: 45, step: 0.25 }} />
            <Field label="Fulfilment fee" hint="Pick, pack and ship charged by FBA, WFS or your 3PL." prefix={symbol} value={inputs.fulfillmentFeePerUnit} onChange={set("fulfillmentFeePerUnit")} />
            <Field label="Outbound postage" hint="Carrier cost when you ship it yourself. Leave at zero on FBA/WFS." prefix={symbol} value={inputs.outboundShippingPerUnit} onChange={set("outboundShippingPerUnit")} />
            <Field label="Storage per unit" hint="Monthly storage allocated to one unit of throughput." prefix={symbol} value={inputs.storagePerUnit} onChange={set("storagePerUnit")} />
            <Field label="Payment processing" hint="Card rate, e.g. 2.9% on Shopify Payments. Zero when the marketplace bundles it into the referral fee." suffix="%" value={inputs.paymentPct} onChange={set("paymentPct")} range={{ min: 0, max: 6, step: 0.1 }} />
            <Field label="Payment fixed fee" hint="Per-transaction flat fee, e.g. 0.30." prefix={symbol} value={inputs.paymentFixed} onChange={set("paymentFixed")} />
            <Field label="Other variable fee" hint="Affiliate cut, digital services fee, FX spread — anything else that scales with revenue." suffix="%" value={inputs.otherVariablePct} onChange={set("otherVariablePct")} range={{ min: 0, max: 20, step: 0.25 }} />
          </Panel>

          <Panel title="Advertising" icon={Megaphone} subtitle="The cost of finding the buyer">
            <div className="sm:col-span-2">
              <span className="block text-[11px] uppercase tracking-[0.14em] text-white/50 font-body font-medium mb-2">
                Ad model
              </span>
              <Segmented
                options={[
                  { value: "acos", label: "% of revenue (ACoS)" },
                  { value: "cpa", label: "Cost per order" },
                ]}
                value={inputs.adModel}
                onChange={set("adModel")}
              />
            </div>
            <Field
              label="Ad spend as % of revenue"
              hint="Ad cost of sale. 22% means you spend 22 cents of every revenue dollar on ads."
              suffix="%"
              value={inputs.acosPct}
              onChange={set("acosPct")}
              range={{ min: 0, max: 60, step: 0.5 }}
              disabled={inputs.adModel !== "acos"}
            />
            <Field
              label="Ad spend per order"
              hint="Blended customer acquisition cost for one order."
              prefix={symbol}
              value={inputs.adSpendPerUnit}
              onChange={set("adSpendPerUnit")}
              range={{ min: 0, max: 120, step: 0.5 }}
              disabled={inputs.adModel !== "cpa"}
            />
          </Panel>

          <Panel title="Returns" icon={RotateBack} subtitle="The quiet margin killer">
            <Field label="Return rate" hint="Share of orders that come back." suffix="%" value={inputs.returnRatePct} onChange={set("returnRatePct")} range={{ min: 0, max: 50, step: 0.5 }} />
            <Field label="Cost per return" hint="Return postage, inspection and re-processing for one unit." prefix={symbol} value={inputs.returnCostPerReturn} onChange={set("returnCostPerReturn")} />
            <Field label="Resellable share" hint="Percentage of returned units you can sell again at full price." suffix="%" value={inputs.returnRecoveryPct} onChange={set("returnRecoveryPct")} range={{ min: 0, max: 100, step: 1 }} />
            <Field label="Refund admin cut" hint="Slice of the referral fee the marketplace keeps on a refund — Amazon keeps 20%." suffix="%" value={inputs.refundAdminPct} onChange={set("refundAdminPct")} range={{ min: 0, max: 100, step: 1 }} />
          </Panel>

          <Panel title="Overhead & finance" icon={Building} subtitle="Costs that do not move with volume">
            <Field label="Platform subscription" hint="Seller plan or store subscription, per month." prefix={symbol} value={inputs.subscriptionFee} onChange={set("subscriptionFee")} />
            <Field label="Software & apps" hint="Analytics, helpdesk, email, apps — per month." prefix={symbol} value={inputs.softwareFee} onChange={set("softwareFee")} />
            <Field label="Payroll & contractors" hint="Salaries, VAs, agencies — per month." prefix={symbol} value={inputs.payrollFee} onChange={set("payrollFee")} />
            <Field label="Other fixed cost" hint="Rent, insurance, accounting — per month." prefix={symbol} value={inputs.otherFixed} onChange={set("otherFixed")} />
            <Field label="Tax on profit" hint="Income tax applied to operating profit." suffix="%" value={inputs.taxPct} onChange={set("taxPct")} range={{ min: 0, max: 50, step: 1 }} />
            <Field label="Stock cover" hint="Days of inventory you hold. Drives the cash locked up in stock." suffix="days" value={inputs.inventoryCoverDays} onChange={set("inventoryCoverDays")} range={{ min: 0, max: 180, step: 5 }} />
          </Panel>
        </div>

        {/* ---- live results ---- */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatTile
              label="Net profit / unit"
              value={money(result.netProfitPerUnit)}
              sub={Engine.formatPct(result.netMarginPct) + " net margin"}
              delta={delta((r) => r.netProfitPerUnit, (d) => money(d))}
            />
            <StatTile
              label="Contribution / unit"
              value={money(result.contribution)}
              sub={Engine.formatPct(result.contributionPct) + " of net revenue"}
              delta={delta((r) => r.contribution, (d) => money(d))}
            />
            <StatTile
              label="Total cost / unit"
              value={money(result.totalCostPerUnit)}
              sub={`Landed ${money(result.landedCost)}`}
              delta={delta((r) => r.totalCostPerUnit, (d) => money(d))}
            />
            <StatTile
              label="Net profit / month"
              value={Engine.formatMoney(result.monthly.net, currency, { compact: true })}
              sub={`${Engine.formatNumber(result.units)} orders`}
              delta={delta(
                (r) => r.monthly.net,
                (d) => Engine.formatMoney(d, currency, { compact: true })
              )}
            />
          </div>

          <VerdictPanel result={result} currency={currency} />
          <RevenueBreakdown result={result} currency={currency} />
          <BreakEvenPanel result={result} currency={currency} />

          {/* target-margin solver */}
          <div className="liquid-glass rounded-[1.25rem] p-5">
            <h4 className="font-heading italic text-white text-2xl tracking-[-1px] leading-none">
              Target margin solver
            </h4>
            <p className="text-[11px] text-white/45 font-body font-light mt-2 leading-snug">
              The price that would deliver your target net margin, with every other cost held where it
              is now.
            </p>
            <div className="mt-4 flex items-end gap-4">
              <div className="w-[130px] shrink-0">
                <Field
                  label="Target margin"
                  suffix="%"
                  value={inputs.targetMarginPct}
                  onChange={set("targetMarginPct")}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-body font-medium mb-2">
                  Required price
                </div>
                <div className="font-heading italic text-white text-4xl tracking-[-1px] leading-none">
                  {result.targetMarginPrice === null ? "—" : money(result.targetMarginPrice)}
                </div>
              </div>
            </div>
            {result.targetMarginPrice !== null ? (
              <p className="mt-3 text-[11px] text-white/45 font-body font-light leading-snug">
                {result.targetMarginPrice > Engine.num(inputs.sellingPrice)
                  ? `That is ${money(result.targetMarginPrice - Engine.num(inputs.sellingPrice))} above your current price.`
                  : `You are already ${money(Engine.num(inputs.sellingPrice) - result.targetMarginPrice)} above the price you need.`}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ---- full statements ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <Ledger result={result} currency={currency} />
        <Sensitivity result={result} currency={currency} />
      </div>
    </section>
  );
};

window.Calculator = Calculator;
