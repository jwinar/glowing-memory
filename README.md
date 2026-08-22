# Aeon — cinematic landing page + ecommerce cost calculator

A single-page site with two full-height cinematic video sections and a working
unit-economics calculator underneath. Everything runs from CDNs and static
files — no build step, no bundler, no framework CLI.

```
index.html              markup, Tailwind config, liquid-glass CSS, script order
js/runtime.js           console filter, Framer Motion shim, scroll helpers
js/icons.js             inline SVG set
js/FadingVideo.js       rAF-driven video crossfade + manual looping
js/BlurText.js          word-by-word blur-in on scroll
js/sections/            Navbar, Hero, Capabilities, Calculator, Footer
js/calc/engine.js       the cost model (pure, no DOM)
js/calc/controls.js     glass form kit
js/calc/Results.js      stat tiles, revenue breakdown, P&L, sensitivity
test/engine.test.js     65 assertions over the cost model
```

## Running it

Babel compiles the `type="text/babel"` files in the browser by `fetch`-ing
them, so the page needs to be served over HTTP — opening `index.html` from
the filesystem will not work.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

```bash
node test/engine.test.js   # cost model tests, no dependencies
```

## The calculator

The site's working feature. It models what actually stands between a sale and
the money you keep, per order and per month.

**Inputs** — selling price, discount, shipping charged, monthly order volume;
buying price, inbound freight, duty, customs, packaging, defect rate;
referral/commission, fulfilment fee, outbound postage, storage, payment
processing (% + fixed), other variable fees; advertising as either ACoS or a
flat cost per order; return rate, cost per return, resellable share, refund
admin cut; subscription, software, payroll and other fixed overhead; tax rate
and stock cover days.

**Outputs** — landed cost, total cost per unit, contribution margin, net profit
and net margin per unit and per month, gross margin, markup, ROI on cost, cash
tied up in stock, a revenue-allocation bar, a full monthly P&L, and a price
sensitivity ladder at ±10% and ±20%.

**Thresholds** — break-even price, price needed to clear overhead at current
volume, break-even units per month, break-even ROAS and max cost per
acquisition, plus a solver for the price that hits a target net margin.

Six marketplace presets (Amazon FBA, Shopify DTC, Etsy, eBay, TikTok Shop,
Walmart WFS) load published 2026 list rates; every field stays editable. Eight
currencies, scenario pinning for before/after deltas, CSV export, clipboard
summary, and localStorage persistence.

### How the model works

Costs are computed per **gross order** — every order placed, including the ones
that later come back — because ads, fulfilment and payment fees are all paid on
orders that end up refunded.

```
revenue charged  = price x (1 - discount) + shipping charged
revenue retained = revenue charged x (1 - return rate)
landed cost      = (buy + freight + duty + customs + prep) / (1 - defect rate)
goods consumed   = landed x (1 - return rate x resellable share)
referral fee     = charged on every order, refunded on returns except the
                   marketplace's refund admin cut (Amazon keeps 20%)
payment fee      = % + fixed, never refunded — processors keep these
contribution     = revenue retained - all variable costs
break-even ROAS  = revenue charged / contribution before ads
```

Defective units are absorbed by the sellable ones rather than silently ignored,
and the revenue-allocation bar reconciles exactly back to the order value.

## Notes

- Video fades are driven entirely by `requestAnimationFrame`, not CSS
  transitions. Each fade reads the live opacity so an interrupted fade resumes
  from where the last one stopped, and the `loop` attribute stays off so the
  restart can be crossfaded by hand.
- `framer-motion@11`'s UMD bundle registers itself as `window.Motion`, so the
  shim in `index.html` keeps whichever global actually landed rather than
  overwriting it. If the bundle fails to load entirely, `js/runtime.js`
  substitutes plain DOM elements and the page still renders.
- Fee presets reflect published 2026 rate cards. They are estimates for
  modelling, not financial advice.
