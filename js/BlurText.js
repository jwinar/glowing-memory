/* ------------------------------------------------------------------
   BlurText — word-by-word blur-in, fired the first time the block
   crosses 10% visibility.

   Words are laid out with a flex parent and an em-based right margin
   rather than a non-breaking space: the headline runs at
   letter-spacing -4px, which swallows a real space character.
------------------------------------------------------------------ */

const BlurText = ({
  text = "",
  delay = 100,
  className = "",
  stepDuration = 0.35,
  threshold = 0.1,
  justify = "center",
  startDelay = 0,
  as: Tag = "p",
}) => {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  const words = React.useMemo(() => String(text).split(" ").filter(Boolean), [text]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const from = { filter: "blur(10px)", opacity: 0, y: 50 };
  const keyframes = {
    filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
    opacity: [0, 0.5, 1],
    y: [50, -5, 0],
  };

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: justify,
        rowGap: "0.1em",
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={from}
          animate={inView ? keyframes : from}
          transition={{
            duration: stepDuration * 2,
            times: [0, 0.5, 1],
            ease: "easeOut",
            delay: startDelay + (index * delay) / 1000,
          }}
          style={{
            display: "inline-block",
            marginRight: "0.28em",
            willChange: "transform, filter, opacity",
          }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
};

window.BlurText = BlurText;
