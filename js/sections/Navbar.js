/* ------------------------------------------------------------------
   Navbar — fixed glass pill. Every link resolves to a real section,
   and both CTAs drop the visitor straight into the cost model.
------------------------------------------------------------------ */

const NAV_LINKS = [
  { label: "Home", target: "hero" },
  { label: "Voyages", target: "capabilities" },
  { label: "Worlds", target: "capabilities" },
  { label: "Innovation", target: "calculator" },
  { label: "Plan Launch", target: "calculator" },
];

const Navbar = () => {
  const { ArrowUpRight } = window.Icons;

  const go = (event, target) => {
    event.preventDefault();
    window.scrollToId(target);
  };

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 px-8 lg:px-16">
      <div className="flex items-center justify-between">
        {/* logo */}
        <a
          href="#hero"
          onClick={(e) => go(e, "hero")}
          aria-label="Aeon home"
          className="liquid-glass rounded-full flex items-center justify-center shrink-0"
          style={{ width: 48, height: 48 }}
        >
          <span className="font-heading italic text-white text-2xl leading-none lowercase">a</span>
        </a>

        {/* centre cluster — desktop only */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="liquid-glass rounded-full flex items-center px-1.5 py-1.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={`#${link.target}`}
                onClick={(e) => go(e, link.target)}
                className="px-3 py-2 text-sm font-medium text-white/90 font-body rounded-full hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.scrollToId("calculator")}
            className="rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium font-body whitespace-nowrap flex items-center gap-1.5 hover:bg-white/90 transition-colors"
          >
            Claim a Spot
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        {/* spacer to balance the logo */}
        <div className="shrink-0 invisible" style={{ width: 48, height: 48 }} aria-hidden="true" />
      </div>
    </nav>
  );
};

window.Navbar = Navbar;
