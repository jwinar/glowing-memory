/* ------------------------------------------------------------------
   Capabilities — second video stage, full-bleed this time.
------------------------------------------------------------------ */

const CAPABILITIES_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4";

const CAPABILITY_CARDS = [
  {
    icon: "image",
    title: "AI Scenery",
    body: "AI analyzes your product to create indistinguishable natural environments — from Icelandic cliffs to misty forests.",
    tags: ["Natural Context", "Photo Realism", "Infinite Settings", "Eco-Vibe"],
  },
  {
    icon: "movie",
    title: "Batch Production",
    body: "Style your entire product line in minutes. Create a unified visual identity for catalogues and social media without weeks of retouching.",
    tags: ["Scale Fast", "Visual Consistency", "Time Saver", "Ready to Post"],
  },
  {
    icon: "lightbulb",
    title: "Smart Lighting",
    body: "Automatic lighting and material adjustment. Achieve flawless integration with realistic shadows and sunlight.",
    tags: ["Ray Tracing", "Physical Shadows", "Studio Quality", "Sunlight Sync"],
  },
];

const CapabilityCard = ({ card, index }) => {
  const { MaterialIcon, MATERIAL_PATHS } = window.Icons;
  return (
    <motion.div
      initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
      whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay: 0.15 * index, ease: "easeOut" }}
      className="liquid-glass rounded-[1.25rem] p-6 min-h-[360px] flex flex-col"
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className="liquid-glass rounded-[0.75rem] flex items-center justify-center shrink-0"
          style={{ width: 44, height: 44 }}
        >
          <MaterialIcon path={MATERIAL_PATHS[card.icon]} className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 max-w-[70%]">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="liquid-glass rounded-full px-3 py-1 text-[11px] text-white/90 font-body whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="mt-6">
        <h3 className="font-heading italic text-white text-3xl md:text-4xl tracking-[-1px] leading-none">
          {card.title}
        </h3>
        <p className="mt-3 text-sm text-white/90 font-body font-light leading-snug max-w-[32ch]">
          {card.body}
        </p>
      </div>
    </motion.div>
  );
};

const Capabilities = () => (
  <section id="capabilities" className="relative min-h-screen w-full overflow-hidden bg-black">
    <window.FadingVideo
      src={CAPABILITIES_VIDEO}
      className="absolute inset-0 w-full h-full object-cover z-0"
    />

    <div className="relative z-10 px-8 md:px-16 lg:px-20 pt-24 pb-10 flex flex-col min-h-screen">
      <div className="mb-auto">
        <motion.p
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-sm font-body text-white/80 mb-6"
        >
          // Capabilities
        </motion.p>

        <h2 className="font-heading italic text-white text-6xl md:text-7xl lg:text-[6rem] leading-[0.9] tracking-[-3px]">
          <window.BlurText
            text="Production"
            delay={100}
            justify="flex-start"
            className="font-heading italic text-white"
            as="span"
          />
          <window.BlurText
            text="evolved"
            delay={100}
            startDelay={0.12}
            justify="flex-start"
            className="font-heading italic text-white"
            as="span"
          />
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        {CAPABILITY_CARDS.map((card, index) => (
          <CapabilityCard key={card.title} card={card} index={index} />
        ))}
      </div>
    </div>
  </section>
);

window.Capabilities = Capabilities;
