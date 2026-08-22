/* ------------------------------------------------------------------
   engine.js — ecommerce operational cost / unit-economics model.

   Everything here is pure: `analyze(inputs)` takes the raw form state
   and returns every derived number the UI renders. No DOM, no React,
   so it can be unit-tested in isolation (see test/engine.test.js).

   Cost model, per GROSS order (i.e. every order placed, including the
   ones that later come back as returns):

     revenue charged   = price x (1 - discount) + shipping charged
     revenue retained  = revenue charged x (1 - return rate)
     landed cost/unit  = (buy + freight + duty + customs + prep)
                         / (1 - defect rate)
     goods consumed    = landed x (1 - return rate x resale recovery)
     referral fee      = charged on every order; refunded on returns
                         except the marketplace's refund admin cut
     payment fee       = % + fixed, NOT refunded (Stripe / Shopify
                         Payments keep processing fees on refunds)
     fulfilment        = pick/pack/ship + outbound postage + storage
     returns handling  = return rate x cost to take one unit back
     advertising       = paid on every order, returned or not
------------------------------------------------------------------ */
(function () {
  "use strict";

  /* ---------------- currencies ---------------- */
  var CURRENCIES = {
    USD: { symbol: "$", code: "USD", locale: "en-US", decimals: 2, step: 1 },
    EUR: { symbol: "€", code: "EUR", locale: "de-DE", decimals: 2, step: 1 },
    GBP: { symbol: "£", code: "GBP", locale: "en-GB", decimals: 2, step: 1 },
    CAD: { symbol: "CA$", code: "CAD", locale: "en-CA", decimals: 2, step: 1 },
    AUD: { symbol: "A$", code: "AUD", locale: "en-AU", decimals: 2, step: 1 },
    SGD: { symbol: "S$", code: "SGD", locale: "en-SG", decimals: 2, step: 1 },
    INR: { symbol: "₹", code: "INR", locale: "en-IN", decimals: 0, step: 50 },
    IDR: { symbol: "Rp", code: "IDR", locale: "id-ID", decimals: 0, step: 1000 },
  };

  /* ---------------- marketplace presets ----------------
     Fee levels reflect published 2026 rate cards for the major
     channels. They are starting points — every field stays editable. */
  var PRESETS = {
    amazon_fba: {
      label: "Amazon FBA",
      blurb: "Referral + fulfilment + monthly storage, payments bundled in.",
      values: {
        referralFeePct: 15, fulfillmentFeePerUnit: 5.14, outboundShippingPerUnit: 0,
        storagePerUnit: 0.42, paymentPct: 0, paymentFixed: 0, otherVariablePct: 0,
        refundAdminPct: 20, returnCostPerReturn: 6.5, returnRatePct: 8,
        subscriptionFee: 39.99, adModel: "acos", acosPct: 12,
      },
    },
    shopify_dtc: {
      label: "Shopify DTC",
      blurb: "No referral cut, but you carry payments, postage and CAC.",
      values: {
        referralFeePct: 0, fulfillmentFeePerUnit: 3.25, outboundShippingPerUnit: 7.4,
        storagePerUnit: 0.35, paymentPct: 2.9, paymentFixed: 0.3, otherVariablePct: 0,
        refundAdminPct: 0, returnCostPerReturn: 9, returnRatePct: 12,
        subscriptionFee: 39, adModel: "cpa", adSpendPerUnit: 14,
      },
    },
    etsy: {
      label: "Etsy",
      blurb: "6.5% transaction + listing + payment processing.",
      values: {
        referralFeePct: 6.5, fulfillmentFeePerUnit: 1.5, outboundShippingPerUnit: 5.6,
        storagePerUnit: 0.1, paymentPct: 3, paymentFixed: 0.25, otherVariablePct: 0,
        refundAdminPct: 0, returnCostPerReturn: 6, returnRatePct: 6,
        subscriptionFee: 0, adModel: "acos", acosPct: 12,
      },
    },
    ebay: {
      label: "eBay",
      blurb: "Final value fee incl. payment processing, plus per-order fee.",
      values: {
        referralFeePct: 13.25, fulfillmentFeePerUnit: 1.5, outboundShippingPerUnit: 6.2,
        storagePerUnit: 0.1, paymentPct: 0, paymentFixed: 0.4, otherVariablePct: 0,
        refundAdminPct: 0, returnCostPerReturn: 7, returnRatePct: 7,
        subscriptionFee: 27.95, adModel: "acos", acosPct: 8,
      },
    },
    tiktok_shop: {
      label: "TikTok Shop",
      blurb: "Low commission, high creator/affiliate cost.",
      values: {
        referralFeePct: 8, fulfillmentFeePerUnit: 2.8, outboundShippingPerUnit: 5.5,
        storagePerUnit: 0.2, paymentPct: 0, paymentFixed: 0.3, otherVariablePct: 5,
        refundAdminPct: 0, returnCostPerReturn: 7.5, returnRatePct: 15,
        subscriptionFee: 0, adModel: "acos", acosPct: 15,
      },
    },
    walmart_wfs: {
      label: "Walmart WFS",
      blurb: "Referral + Walmart Fulfilment Services.",
      values: {
        referralFeePct: 15, fulfillmentFeePerUnit: 5.5, outboundShippingPerUnit: 0,
        storagePerUnit: 0.75, paymentPct: 0, paymentFixed: 0, otherVariablePct: 0,
        refundAdminPct: 0, returnCostPerReturn: 6, returnRatePct: 9,
        subscriptionFee: 0, adModel: "acos", acosPct: 14,
      },
    },
  };

  /* Referral-fee percentages by marketplace category. */
  var CATEGORIES = [
    { label: "Custom / other", pct: null },
    { label: "Most categories", pct: 15 },
    { label: "Amazon device accessories", pct: 45 },
    { label: "Jewellery", pct: 20 },
    { label: "Fine art", pct: 20 },
    { label: "Beauty, health & personal care", pct: 15 },
    { label: "Clothing & accessories", pct: 17 },
    { label: "Home & kitchen", pct: 15 },
    { label: "Toys & games", pct: 15 },
    { label: "Sports & outdoors", pct: 15 },
    { label: "Grocery & gourmet", pct: 8 },
    { label: "Consumer electronics", pct: 8 },
    { label: "Cameras & photo", pct: 8 },
    { label: "Personal computers", pct: 6 },
    { label: "Base equipment power tools", pct: 12 },
  ];

  /* ---------------- default scenario ---------------- */
  var DEFAULTS = {
    /* revenue */
    sellingPrice: 59.9,
    discountPct: 5,
    shippingChargedToCustomer: 0,
    unitsPerMonth: 850,

    /* landed cost */
    buyingPrice: 11.4,
    inboundFreightPerUnit: 1.85,
    dutyPct: 12,
    customsPerUnit: 0.35,
    packagingPerUnit: 0.9,
    defectRatePct: 2,

    /* channel + fulfilment */
    referralFeePct: 15,
    fulfillmentFeePerUnit: 5.14,
    outboundShippingPerUnit: 0,
    storagePerUnit: 0.42,
    paymentPct: 0,
    paymentFixed: 0,
    otherVariablePct: 0,

    /* marketing */
    adModel: "acos",
    adSpendPerUnit: 9,
    acosPct: 12,

    /* returns */
    returnRatePct: 8,
    returnCostPerReturn: 6.5,
    returnRecoveryPct: 55,
    refundAdminPct: 20,

    /* fixed monthly overhead */
    subscriptionFee: 39.99,
    softwareFee: 120,
    payrollFee: 1800,
    otherFixed: 350,

    /* finance */
    taxPct: 21,
    inventoryCoverDays: 60,
    targetMarginPct: 25,
  };

  var NUMERIC_KEYS = Object.keys(DEFAULTS).filter(function (k) {
    return typeof DEFAULTS[k] === "number";
  });

  /* ---------------- helpers ---------------- */
  function num(value) {
    if (typeof value === "number") return isFinite(value) ? value : 0;
    if (value === null || value === undefined || value === "") return 0;
    var parsed = parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
    return isFinite(parsed) ? parsed : 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function safeDiv(a, b) {
    return b === 0 || !isFinite(b) ? 0 : a / b;
  }

  function parseInputs(raw) {
    var out = {};
    raw = raw || {};
    NUMERIC_KEYS.forEach(function (key) {
      out[key] = num(raw[key] === undefined ? DEFAULTS[key] : raw[key]);
    });
    out.adModel = raw.adModel === "cpa" ? "cpa" : raw.adModel === "acos" ? "acos" : DEFAULTS.adModel;
    return out;
  }

  /* ---------------- the model ---------------- */
  function compute(raw) {
    var i = parseInputs(raw);

    var returnRate = clamp(i.returnRatePct, 0, 100) / 100;
    var recovery = clamp(i.returnRecoveryPct, 0, 100) / 100;
    var defect = clamp(i.defectRatePct, 0, 95) / 100;
    var adminCut = clamp(i.refundAdminPct, 0, 100) / 100;
    var discount = clamp(i.discountPct, 0, 100) / 100;

    /* --- revenue --- */
    var netPrice = i.sellingPrice * (1 - discount);
    var revenueCharged = netPrice + i.shippingChargedToCustomer;
    var revenueRetained = revenueCharged * (1 - returnRate);
    var refundedRevenue = revenueCharged * returnRate;

    /* --- landed cost per sellable unit --- */
    var duty = i.buyingPrice * (i.dutyPct / 100);
    var landedRaw = i.buyingPrice + i.inboundFreightPerUnit + duty + i.customsPerUnit + i.packagingPerUnit;
    var landedCost = safeDiv(landedRaw, 1 - defect) || landedRaw;
    var goodsCost = landedCost * (1 - returnRate * recovery);

    /* --- channel fees --- */
    var referralFee = revenueCharged * (i.referralFeePct / 100) * ((1 - returnRate) + returnRate * adminCut);
    var paymentFee = i.paymentPct > 0 || i.paymentFixed > 0
      ? revenueCharged * (i.paymentPct / 100) + i.paymentFixed
      : 0;
    var otherVariable = revenueCharged * (i.otherVariablePct / 100);
    var channelFee = referralFee + otherVariable;

    /* --- fulfilment --- */
    var fulfillment = i.fulfillmentFeePerUnit + i.outboundShippingPerUnit;
    var storage = i.storagePerUnit;
    var returnsHandling = returnRate * i.returnCostPerReturn;

    /* --- advertising --- */
    var adCost = i.adModel === "acos" ? revenueCharged * (i.acosPct / 100) : i.adSpendPerUnit;

    /* --- margins --- */
    var variableBeforeAds = goodsCost + channelFee + paymentFee + fulfillment + storage + returnsHandling;
    var contributionBeforeAds = revenueRetained - variableBeforeAds;
    var variableCost = variableBeforeAds + adCost;
    var contribution = revenueRetained - variableCost;
    var contributionPct = safeDiv(contribution, revenueRetained) * 100;
    var contributionBeforeAdsPct = safeDiv(contributionBeforeAds, revenueRetained) * 100;
    var grossProfit = revenueRetained - goodsCost;
    var grossMarginPct = safeDiv(grossProfit, revenueRetained) * 100;

    /* --- monthly roll-up --- */
    var units = Math.max(0, i.unitsPerMonth);
    var fixedCost = i.subscriptionFee + i.softwareFee + i.payrollFee + i.otherFixed;
    var fixedPerUnit = safeDiv(fixedCost, units);

    var monthly = {
      grossRevenue: revenueCharged * units,
      refunds: refundedRevenue * units,
      netRevenue: revenueRetained * units,
      goods: goodsCost * units,
      channel: channelFee * units,
      payment: paymentFee * units,
      fulfillment: fulfillment * units,
      storage: storage * units,
      returns: returnsHandling * units,
      ads: adCost * units,
      variable: variableCost * units,
      contribution: contribution * units,
      fixed: fixedCost,
    };
    monthly.operating = monthly.contribution - fixedCost;
    monthly.tax = Math.max(0, monthly.operating) * (clamp(i.taxPct, 0, 100) / 100);
    monthly.net = monthly.operating - monthly.tax;

    var taxPerUnit = safeDiv(monthly.tax, units);
    var operatingPerUnit = contribution - fixedPerUnit;
    var netProfitPerUnit = operatingPerUnit - taxPerUnit;
    var netMarginPct = safeDiv(monthly.net, monthly.netRevenue) * 100;
    var operatingMarginPct = safeDiv(monthly.operating, monthly.netRevenue) * 100;

    /* --- break-even + efficiency --- */
    var breakEvenUnits = contribution > 0 ? fixedCost / contribution : Infinity;
    var breakEvenRoas = contributionBeforeAds > 0 ? revenueCharged / contributionBeforeAds : Infinity;
    var maxCpa = contributionBeforeAds;
    var totalCostPerUnit = variableCost + fixedPerUnit;
    var roiOnCost = safeDiv(netProfitPerUnit, totalCostPerUnit) * 100;
    var markupPct = safeDiv(i.sellingPrice - landedCost, landedCost) * 100;
    var cashTiedInStock = landedCost * safeDiv(units, 30) * i.inventoryCoverDays;
    var paybackUnits = contribution > 0 ? cashTiedInStock / contribution : Infinity;

    /* --- where each unit of revenue goes --- */
    var breakdown = [
      { key: "goods", label: "Product landed cost", value: goodsCost, tone: "#ffffff" },
      { key: "channel", label: "Marketplace / channel fee", value: channelFee, tone: "#d4d4d4" },
      { key: "payment", label: "Payment processing", value: paymentFee, tone: "#b4b4b4" },
      { key: "fulfillment", label: "Fulfilment & shipping", value: fulfillment, tone: "#969696" },
      { key: "storage", label: "Storage", value: storage, tone: "#7d7d7d" },
      { key: "returns", label: "Returns handling", value: returnsHandling, tone: "#666666" },
      { key: "refunds", label: "Refunded revenue", value: refundedRevenue, tone: "#525252" },
      { key: "ads", label: "Advertising", value: adCost, tone: "#404040" },
      { key: "fixed", label: "Fixed overhead", value: fixedPerUnit, tone: "#303030" },
      { key: "tax", label: "Tax", value: taxPerUnit, tone: "#232323" },
      { key: "profit", label: "Net profit", value: Math.max(0, netProfitPerUnit), tone: "#ffffff", isProfit: true },
    ];
    var breakdownTotal = breakdown.reduce(function (sum, row) { return sum + Math.max(0, row.value); }, 0);
    breakdown.forEach(function (row) {
      row.pct = safeDiv(Math.max(0, row.value), breakdownTotal) * 100;
    });

    return {
      inputs: i,
      /* per unit */
      netPrice: netPrice,
      revenueCharged: revenueCharged,
      revenueRetained: revenueRetained,
      refundedRevenue: refundedRevenue,
      landedCost: landedCost,
      goodsCost: goodsCost,
      duty: duty,
      referralFee: referralFee,
      channelFee: channelFee,
      paymentFee: paymentFee,
      otherVariable: otherVariable,
      fulfillment: fulfillment,
      storage: storage,
      returnsHandling: returnsHandling,
      adCost: adCost,
      variableCost: variableCost,
      variableBeforeAds: variableBeforeAds,
      fixedPerUnit: fixedPerUnit,
      totalCostPerUnit: totalCostPerUnit,
      taxPerUnit: taxPerUnit,
      contribution: contribution,
      contributionPct: contributionPct,
      contributionBeforeAds: contributionBeforeAds,
      contributionBeforeAdsPct: contributionBeforeAdsPct,
      grossProfit: grossProfit,
      grossMarginPct: grossMarginPct,
      operatingPerUnit: operatingPerUnit,
      netProfitPerUnit: netProfitPerUnit,
      netMarginPct: netMarginPct,
      operatingMarginPct: operatingMarginPct,
      markupPct: markupPct,
      roiOnCost: roiOnCost,
      /* monthly */
      units: units,
      fixedCost: fixedCost,
      monthly: monthly,
      /* thresholds */
      breakEvenUnits: breakEvenUnits,
      breakEvenRoas: breakEvenRoas,
      maxCpa: maxCpa,
      cashTiedInStock: cashTiedInStock,
      paybackUnits: paybackUnits,
      breakdown: breakdown,
    };
  }

  /* ----------------------------------------------------------------
     Price solver. Every cost line is monotonic in price, so a plain
     bisection converges fast and stays correct even as the fee mix
     changes (percentage fees, fixed fees, ad models).
  ---------------------------------------------------------------- */
  function solvePrice(raw, objective) {
    var lo = 0.01;
    var hi = Math.max(100, num(raw.sellingPrice) * 25 + 1000);
    var atHi = objective(compute(Object.assign({}, raw, { sellingPrice: hi })));
    if (!(atHi > 0)) return null; /* unreachable at any sane price */
    var atLo = objective(compute(Object.assign({}, raw, { sellingPrice: lo })));
    if (atLo > 0) return lo;

    for (var step = 0; step < 90; step++) {
      var mid = (lo + hi) / 2;
      var v = objective(compute(Object.assign({}, raw, { sellingPrice: mid })));
      if (v > 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  function analyze(raw) {
    var result = compute(raw);

    result.breakEvenPrice = solvePrice(raw, function (r) { return r.contribution; });
    result.breakEvenPriceWithFixed = solvePrice(raw, function (r) { return r.monthly.operating; });

    var target = clamp(num(raw.targetMarginPct === undefined ? DEFAULTS.targetMarginPct : raw.targetMarginPct), -100, 99);
    result.targetMarginPct = target;
    result.targetMarginPrice = solvePrice(raw, function (r) { return r.netMarginPct - target; });

    /* Price sensitivity ladder. */
    result.sensitivity = [-20, -10, 0, 10, 20].map(function (delta) {
      var price = num(raw.sellingPrice) * (1 + delta / 100);
      var scenario = compute(Object.assign({}, raw, { sellingPrice: price }));
      return {
        delta: delta,
        price: price,
        netMarginPct: scenario.netMarginPct,
        profitPerUnit: scenario.netProfitPerUnit,
        contribution: scenario.contribution,
        monthlyNet: scenario.monthly.net,
        breakEvenUnits: scenario.breakEvenUnits,
      };
    });

    /* Health verdict, benchmarked against DTC contribution-margin norms. */
    var cm = result.contributionPct;
    var verdict;
    if (!isFinite(cm) || result.revenueRetained <= 0) {
      verdict = { level: "empty", title: "Awaiting inputs", note: "Enter a selling price to model the unit." };
    } else if (cm < 0) {
      verdict = { level: "critical", title: "Losing money per order", note: "Variable costs exceed retained revenue — every sale deepens the hole." };
    } else if (cm < 15) {
      verdict = { level: "danger", title: "Below survival line", note: "Under 15% contribution leaves nothing for overhead or ad testing." };
    } else if (cm < 30) {
      verdict = { level: "warn", title: "Thin but workable", note: "15–30% contribution works only at high volume and low CAC." };
    } else if (cm < 45) {
      verdict = { level: "good", title: "Healthy unit economics", note: "30–45% contribution is the standard scaling band for DTC." };
    } else {
      verdict = { level: "great", title: "Strong margin headroom", note: "Above 45% contribution you can outbid competitors on ads." };
    }
    result.verdict = verdict;

    return result;
  }

  /* ---------------- formatting ---------------- */
  function formatMoney(value, currencyCode, opts) {
    opts = opts || {};
    var cur = CURRENCIES[currencyCode] || CURRENCIES.USD;
    if (!isFinite(value)) return "—";
    var decimals = opts.decimals !== undefined ? opts.decimals : cur.decimals;
    /* Collapse values that round to nothing so we never print "-$0.00". */
    if (Math.abs(value) < 0.5 / Math.pow(10, decimals)) value = 0;
    var abs = Math.abs(value);
    var compactSuffix = "";
    if (opts.compact && abs >= 1000000) { value = value / 1000000; compactSuffix = "M"; decimals = 1; }
    else if (opts.compact && abs >= 10000) { value = value / 1000; compactSuffix = "k"; decimals = 1; }
    var body = Math.abs(value).toLocaleString(cur.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return (value < 0 ? "-" : "") + cur.symbol + body + compactSuffix;
  }

  function formatPct(value, decimals) {
    if (!isFinite(value)) return "—";
    return (value < 0 ? "-" : "") + Math.abs(value).toFixed(decimals === undefined ? 1 : decimals) + "%";
  }

  function formatNumber(value, decimals) {
    if (!isFinite(value)) return "—";
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals === undefined ? 0 : decimals,
    });
  }

  function toCsv(result, currencyCode) {
    var cur = CURRENCIES[currencyCode] || CURRENCIES.USD;
    var rows = [["Metric", "Per unit (" + cur.code + ")", "Per month (" + cur.code + ")"]];
    var r2 = function (v) { return isFinite(v) ? v.toFixed(2) : ""; };
    var units = result.units || 1;
    var push = function (label, perUnit, perMonth) { rows.push([label, r2(perUnit), r2(perMonth)]); };

    push("Revenue charged", result.revenueCharged, result.monthly.grossRevenue);
    push("Refunded revenue", -result.refundedRevenue, -result.monthly.refunds);
    push("Net revenue", result.revenueRetained, result.monthly.netRevenue);
    push("Product landed cost", -result.goodsCost, -result.monthly.goods);
    push("Marketplace / channel fee", -result.channelFee, -result.monthly.channel);
    push("Payment processing", -result.paymentFee, -result.monthly.payment);
    push("Fulfilment & shipping", -result.fulfillment, -result.monthly.fulfillment);
    push("Storage", -result.storage, -result.monthly.storage);
    push("Returns handling", -result.returnsHandling, -result.monthly.returns);
    push("Advertising", -result.adCost, -result.monthly.ads);
    push("Contribution margin", result.contribution, result.monthly.contribution);
    push("Fixed overhead", -result.fixedPerUnit, -result.fixedCost);
    push("Operating profit", result.operatingPerUnit, result.monthly.operating);
    push("Tax", -result.taxPerUnit, -result.monthly.tax);
    push("Net profit", result.netProfitPerUnit, result.monthly.net);
    rows.push([]);
    rows.push(["Units per month", String(units), ""]);
    rows.push(["Contribution margin %", result.contributionPct.toFixed(2), ""]);
    rows.push(["Net margin %", result.netMarginPct.toFixed(2), ""]);
    rows.push(["Break-even price", r2(result.breakEvenPrice), ""]);
    rows.push(["Break-even units / month", isFinite(result.breakEvenUnits) ? Math.ceil(result.breakEvenUnits) : "never", ""]);
    rows.push(["Break-even ROAS", isFinite(result.breakEvenRoas) ? result.breakEvenRoas.toFixed(2) : "n/a", ""]);
    rows.push(["Max cost per acquisition", r2(result.maxCpa), ""]);
    rows.push(["Cash tied up in stock", r2(result.cashTiedInStock), ""]);

    return rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell === undefined ? "" : cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\n");
  }

  window.CostEngine = {
    CURRENCIES: CURRENCIES,
    PRESETS: PRESETS,
    CATEGORIES: CATEGORIES,
    DEFAULTS: DEFAULTS,
    NUMERIC_KEYS: NUMERIC_KEYS,
    num: num,
    clamp: clamp,
    analyze: analyze,
    compute: compute,
    solvePrice: solvePrice,
    formatMoney: formatMoney,
    formatPct: formatPct,
    formatNumber: formatNumber,
    toCsv: toCsv,
  };
})();
