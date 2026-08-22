/* ------------------------------------------------------------------
   Footer — closing chrome in the same glass language.
------------------------------------------------------------------ */

const Footer = () => {
  const { ArrowUpRight } = window.Icons;
  return (
    <footer className="relative w-full bg-black px-6 md:px-16 lg:px-20 pb-14 pt-4">
      <div className="liquid-glass rounded-[1.25rem] p-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="liquid-glass rounded-full flex items-center justify-center shrink-0"
              style={{ width: 40, height: 40 }}
            >
              <span className="font-heading italic text-white text-xl leading-none lowercase">a</span>
            </span>
            <span className="font-heading italic text-white text-3xl tracking-[-1px] leading-none">
              Aeon
            </span>
          </div>
          <p className="mt-4 text-sm text-white/60 font-body font-light leading-snug max-w-md">
            Cinematic storefronts, honest arithmetic. Model every operational cost before you commit
            a single unit of stock.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4">
          <button
            type="button"
            onClick={() => window.scrollToId("calculator")}
            className="rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium font-body whitespace-nowrap flex items-center gap-1.5 hover:bg-white/90 transition-colors"
          >
            Run the numbers
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <p className="text-[11px] text-white/40 font-body font-light max-w-xs md:text-right leading-snug">
            Fee presets reflect published 2026 rate cards for Amazon, Shopify, Etsy, eBay, TikTok Shop
            and Walmart. Figures are estimates, not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
};

window.Footer = Footer;
