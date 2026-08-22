/* ------------------------------------------------------------------
   Unit tests for the cost engine. No dependencies:

       node test/engine.test.js
------------------------------------------------------------------ */
const path = require("path");

global.window = {};
require(path.join(__dirname, "..", "js", "calc", "engine.js"));
const Engine = global.window.CostEngine;
const D = Engine.DEFAULTS;

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
  } else {
    failures.push(name + (detail ? "  ->  " + detail : ""));
  }
}

function near(name, actual, expected, tolerance = 0.01) {
  check(name, Math.abs(actual - expected) <= tolerance, `got ${actual}, expected ${expected}`);
}

const scenario = (overrides) => Engine.analyze(Object.assign({}, D, overrides));

/* ---------- landed cost ---------- */
{
  const r = scenario({ defectRatePct: 0 });
  const expected = D.buyingPrice + D.inboundFreightPerUnit + D.buyingPrice * (D.dutyPct / 100) + D.customsPerUnit + D.packagingPerUnit;
  near("landed cost sums its parts", r.landedCost, expected);

  const withDefects = scenario({ defectRatePct: 20 });
  near("defects gross up the landed cost of sellable units", withDefects.landedCost, expected / 0.8);
  check("defects raise landed cost", withDefects.landedCost > r.landedCost);
}

/* ---------- revenue ---------- */
{
  const r = scenario({ discountPct: 10, shippingChargedToCustomer: 5, returnRatePct: 0 });
  near("revenue charged applies discount and adds shipping", r.revenueCharged, D.sellingPrice * 0.9 + 5);
  near("no returns means nothing refunded", r.refundedRevenue, 0);
  near("net revenue equals charged when nothing is returned", r.revenueRetained, r.revenueCharged);

  const returned = scenario({ returnRatePct: 25 });
  near("returns cut retained revenue proportionally", returned.revenueRetained, returned.revenueCharged * 0.75);
}

/* ---------- returns ---------- */
{
  const noRecovery = scenario({ returnRatePct: 20, returnRecoveryPct: 0 });
  const fullRecovery = scenario({ returnRatePct: 20, returnRecoveryPct: 100 });
  check("resellable returns lower the goods cost", fullRecovery.goodsCost < noRecovery.goodsCost);
  near("zero recovery consumes the full landed cost", noRecovery.goodsCost, noRecovery.landedCost);
  near("full recovery consumes only the units that stick", fullRecovery.goodsCost, fullRecovery.landedCost * 0.8);

  const higherReturns = scenario({ returnRatePct: 30 });
  const lowerReturns = scenario({ returnRatePct: 5 });
  check("more returns means less contribution", higherReturns.contribution < lowerReturns.contribution);
}

/* ---------- refund admin cut ---------- */
{
  const keepsNothing = scenario({ returnRatePct: 20, refundAdminPct: 0 });
  const keepsAll = scenario({ returnRatePct: 20, refundAdminPct: 100 });
  near("a full refund of the referral fee costs 80% of the headline fee",
    keepsNothing.referralFee, keepsNothing.revenueCharged * (D.referralFeePct / 100) * 0.8);
  near("keeping the whole admin cut costs the full fee",
    keepsAll.referralFee, keepsAll.revenueCharged * (D.referralFeePct / 100));
}

/* ---------- payment fees ---------- */
{
  const r = scenario({ paymentPct: 2.9, paymentFixed: 0.3 });
  near("payment fee is percentage plus fixed", r.paymentFee, r.revenueCharged * 0.029 + 0.3);
  near("no payment fee configured means no payment fee charged", scenario({ paymentPct: 0, paymentFixed: 0 }).paymentFee, 0);
}

/* ---------- contribution and profit ---------- */
{
  const r = scenario({});
  near("contribution is retained revenue less every variable cost",
    r.contribution, r.revenueRetained - r.variableCost);
  near("contribution percent is against net revenue",
    r.contributionPct, (r.contribution / r.revenueRetained) * 100);
  near("ads are the only gap between the two contribution figures",
    r.contributionBeforeAds - r.contribution, r.adCost);
  near("monthly contribution scales with units", r.monthly.contribution, r.contribution * r.units, 0.5);
  near("operating profit is contribution less fixed cost",
    r.monthly.operating, r.monthly.contribution - r.fixedCost, 0.5);
  near("net profit is operating profit less tax", r.monthly.net, r.monthly.operating - r.monthly.tax, 0.5);
  near("tax applies the configured rate", r.monthly.tax, r.monthly.operating * (D.taxPct / 100), 0.5);
}

/* ---------- ad models ---------- */
{
  const acos = scenario({ adModel: "acos", acosPct: 20 });
  near("ACoS spends a share of revenue", acos.adCost, acos.revenueCharged * 0.2);
  const cpa = scenario({ adModel: "cpa", adSpendPerUnit: 7.5 });
  near("cost per order is a flat amount", cpa.adCost, 7.5);
}

/* ---------- break-even identities ---------- */
{
  const r = scenario({});
  near("break-even ROAS is revenue over the margin available for ads",
    r.breakEvenRoas, r.revenueCharged / r.contributionBeforeAds);

  /* Spending exactly max CPA should wipe out contribution. */
  const atMaxCpa = scenario({ adModel: "cpa", adSpendPerUnit: r.maxCpa });
  near("spending max CPA leaves zero contribution", atMaxCpa.contribution, 0, 0.02);

  const atBreakEvenPrice = scenario({ sellingPrice: r.breakEvenPrice });
  near("break-even price zeroes out contribution", atBreakEvenPrice.contribution, 0, 0.02);

  const atOverheadPrice = scenario({ sellingPrice: r.breakEvenPriceWithFixed });
  near("break-even-with-overhead price zeroes operating profit", atOverheadPrice.monthly.operating, 0, 1);

  const atTarget = scenario({ sellingPrice: r.targetMarginPrice });
  near("target margin solver hits the requested margin", atTarget.netMarginPct, D.targetMarginPct, 0.05);

  near("break-even units cover fixed cost exactly",
    r.breakEvenUnits * r.contribution, r.fixedCost, 1);
}

/* ---------- the breakdown reconciles ---------- */
{
  const r = scenario({});
  const total = r.breakdown.reduce((sum, row) => sum + Math.max(0, row.value), 0);
  near("every slice of the revenue bar adds back to the order value", total, r.revenueCharged, 0.02);
  near("bar percentages total 100", r.breakdown.reduce((s, row) => s + row.pct, 0), 100, 0.01);
}

/* ---------- loss-making scenarios ---------- */
{
  const r = scenario({ sellingPrice: 5 });
  check("a price below cost yields negative contribution", r.contribution < 0);
  check("a loss is flagged as critical", r.verdict.level === "critical", r.verdict.level);
  check("break-even units are unreachable at a loss", !isFinite(r.breakEvenUnits));
  const profitSlice = r.breakdown.find((row) => row.isProfit);
  near("no profit slice is drawn at a loss", profitSlice.value, 0);
}

/* ---------- edge cases ---------- */
{
  const empty = Engine.analyze({});
  check("an empty input object falls back to defaults", isFinite(empty.contribution));

  const zeroed = scenario({ sellingPrice: 0, unitsPerMonth: 0 });
  check("zero units does not produce NaN", isFinite(zeroed.contribution), String(zeroed.contribution));
  check("zero units gives no monthly revenue", zeroed.monthly.netRevenue === 0);
  check("zero price is reported as awaiting input", zeroed.verdict.level === "empty", zeroed.verdict.level);

  const junk = scenario({ sellingPrice: "abc", buyingPrice: "", dutyPct: null });
  check("unparseable input is treated as zero", isFinite(junk.contribution));

  const extreme = scenario({ defectRatePct: 200 });
  check("a defect rate over 100% is clamped, not divided by zero", isFinite(extreme.landedCost));

  const capped = scenario({ discountPct: 500 });
  check("a discount over 100% is clamped", capped.netPrice >= 0);
}

/* ---------- formatting ---------- */
{
  check("money formats with the currency symbol", Engine.formatMoney(12.5, "USD") === "$12.50");
  check("money rounds to whole units for IDR", Engine.formatMoney(1234, "IDR").indexOf(",") === -1);
  check("negative money keeps the sign ahead of the symbol", Engine.formatMoney(-3, "USD") === "-$3.00");
  check("values that round to nothing lose their sign", Engine.formatMoney(-0.001, "USD") === "$0.00",
    Engine.formatMoney(-0.001, "USD"));
  check("large values compact", Engine.formatMoney(1500000, "USD", { compact: true }) === "$1.5M",
    Engine.formatMoney(1500000, "USD", { compact: true }));
  check("percentages format to one decimal", Engine.formatPct(30.46) === "30.5%", Engine.formatPct(30.46));
  check("percentages accept a decimal count", Engine.formatPct(30.4567, 2) === "30.46%", Engine.formatPct(30.4567, 2));
  check("infinite values render as an em dash", Engine.formatPct(Infinity) === "—");
  const csv = Engine.toCsv(scenario({}), "USD");
  check("CSV export includes a net profit row", csv.indexOf("Net profit") !== -1);
  check("CSV export is comma separated", csv.split("\n")[0].split(",").length === 3);
}

/* ---------- presets ---------- */
{
  Object.keys(Engine.PRESETS).forEach((key) => {
    const r = scenario(Engine.PRESETS[key].values);
    check(`preset ${key} produces finite economics`, isFinite(r.contribution) && isFinite(r.netMarginPct));
    check(`preset ${key} stays profitable on the default product`, r.contribution > 0,
      `contribution ${r.contribution.toFixed(2)}`);
  });
}

/* ---------- report ---------- */
if (failures.length) {
  console.log(`${passed} passed, ${failures.length} FAILED\n`);
  failures.forEach((f) => console.log("  x " + f));
  process.exit(1);
}
console.log(`All ${passed} assertions passed.`);
