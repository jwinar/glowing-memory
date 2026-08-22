/* ------------------------------------------------------------------
   FadingVideo — looping background video with a hand-rolled crossfade.

   No CSS transitions anywhere: every opacity change is driven by
   requestAnimationFrame so a new fade can pick up mid-flight from
   wherever the previous one left off.

     - starts at opacity 0
     - fades in over FADE_MS once the first frame is decodable
     - fades out FADE_OUT_LEAD seconds before the clip runs out
     - loops manually on `ended` (the loop attribute stays off, which
       is what gives us the black-free seam)
------------------------------------------------------------------ */

const FADE_MS = 500;
const FADE_OUT_LEAD = 0.55; /* seconds */

const FadingVideo = ({ src, className = "", style, poster }) => {
  const videoRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const timeoutRef = React.useRef(null);
  const fadingOutRef = React.useRef(false);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const fadeTo = (target, duration = FADE_MS) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      /* Resume from the live opacity so interrupted fades stay smooth. */
      const from = parseFloat(video.style.opacity || "0") || 0;
      const delta = target - from;
      if (duration <= 0 || delta === 0) {
        video.style.opacity = String(target);
        return;
      }
      const startedAt = performance.now();
      const step = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        video.style.opacity = String(from + delta * progress);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const safePlay = () => {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
    };

    const handleLoadedData = () => {
      video.style.opacity = "0";
      fadingOutRef.current = false;
      safePlay();
      fadeTo(1, FADE_MS);
    };

    const handleTimeUpdate = () => {
      const remaining = video.duration - video.currentTime;
      if (!fadingOutRef.current && remaining <= FADE_OUT_LEAD && remaining > 0) {
        fadingOutRef.current = true;
        fadeTo(0, FADE_MS);
      }
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      timeoutRef.current = setTimeout(() => {
        video.currentTime = 0;
        safePlay();
        fadingOutRef.current = false;
        fadeTo(1, FADE_MS);
      }, 100);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    /* The element may already be buffered when React attaches. */
    if (video.readyState >= 2) handleLoadedData();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={{ opacity: 0, ...style }}
      src={src}
      poster={poster}
      autoPlay
      muted
      playsInline
      preload="auto"
    />
  );
};

window.FadingVideo = FadingVideo;
