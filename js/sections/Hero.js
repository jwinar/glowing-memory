/* ------------------------------------------------------------------
   Hero — full-viewport video stage. The clip is scaled to 120% and
   pinned to the top of the frame because the focal point sits high.
------------------------------------------------------------------ */

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";

const PARTNERS = ["Aeon", "Vela", "Apex", "Orbit", "Zeno"];

const rise = (delay) => ({
  initial: { filter: "blur(10px)", opacity: 0, y: 20 },
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: "easeOut" },
});

const HeroStat = ({ icon, value, label }) => (
  <div className="liquid-glass p-5 w-[220px] rounded-[1.25rem] flex flex-col justify-between">
    <div className="text-white">{icon}</div>
    <div className="mt-6">
      <div className="font-heading italic text-white text-4xl tracking-[-1px] leading-none">{value}</div>
      <div className="text-xs text-white font-body font-light mt-2">{label}</div>
    </div>
  </div>
);

const Hero = () => {
  const { ArrowUpRight, Play, Clock, Globe } = window.Icons;

  return (
    <section id="hero" className="relative w-full h-screen min-h-[720px] overflow-hidden bg-black">
      <window.FadingVideo
        src={HERO_VIDEO}
        className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0"
        style={{ width: "120%", height: "120%" }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <window.Navbar />

        {/* ---- centre stage ---- */}
        <div className="flex-1 flex flex-col items-center justify-center text-center pt-24 px-4">
          <motion.div {...rise(0.4)}>
            <div className="liquid-glass rounded-full flex items-center gap-3 pl-1 pr-3 py-1">
              <span className="rounded-full bg-white text-black px-3 py-1 text-xs font-semibold font-body">
                New
              </span>
              <span className="text-sm text-white/90 font-body">
                Maiden Crewed Voyage to Mars Arrives 2026
              </span>
            </div>
          </motion.div>

          <div className="mt-6">
            <window.BlurText
              text="Venture Past Our Sky Across the Universe"
              delay={100}
              className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.8] max-w-2xl justify-center tracking-[-4px]"
            />
          </div>

          <motion.p
            {...rise(0.8)}
            className="mt-4 text-sm md:text-base text-white max-w-2xl font-body font-light leading-tight"
          >
            Discover the universe in ways once unimaginable. Our pioneering vessels and breakthrough
            engineering bring deep-space exploration within reach—secure and extraordinary.
          </motion.p>

          <motion.div {...rise(1.1)} className="flex items-center gap-6 mt-6">
            <button
              type="button"
              onClick={() => window.scrollToId("calculator")}
              className="liquid-glass-strong rounded-full px-5 py-2.5 text-sm font-medium text-white font-body flex items-center gap-2"
            >
              Start Your Voyage
              <ArrowUpRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => window.scrollToId("capabilities")}
              className="text-sm font-medium text-white font-body flex items-center gap-2"
            >
              View Liftoff
              <Play className="h-4 w-4" />
            </button>
          </motion.div>

          <motion.div {...rise(1.3)} className="flex items-stretch gap-4 mt-8">
            <HeroStat
              icon={<Clock className="h-7 w-7" />}
              value="34.5 Min"
              label="Average Videos Watch Time"
            />
            <HeroStat
              icon={<Globe className="h-7 w-7" />}
              value="2.8B+"
              label="Users Across the Globe"
            />
          </motion.div>
        </div>

        {/* ---- partners ---- */}
        <motion.div {...rise(1.4)} className="flex flex-col items-center gap-4 pb-8">
          <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
            Collaborating with top aerospace pioneers globally
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16 px-4">
            {PARTNERS.map((name) => (
              <span
                key={name}
                className="font-heading italic text-white text-2xl md:text-3xl tracking-tight"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

window.Hero = Hero;
