/* ------------------------------------------------------------------
   runtime.js — global shims loaded before any component file.
   No JSX here, so this runs as a plain <script> (before Babel's queue).
------------------------------------------------------------------ */
(function () {
  "use strict";

  /* Framer Motion emits a benign "unique key prop" warning for the keyframe
     arrays used by BlurText. Filter just those, pass everything else through. */
  var nativeError = console.error.bind(console);
  var MUTED = ['unique "key" prop', "Each child in a list", "keys should be unique"];
  console.error = function () {
    var first = arguments[0];
    if (typeof first === "string") {
      for (var i = 0; i < MUTED.length; i++) {
        if (first.indexOf(MUTED[i]) !== -1) return;
      }
    }
    nativeError.apply(null, arguments);
  };

  /* --------------------------------------------------------------
     Motion access with a graceful fallback: if the CDN bundle failed
     to load, `motion.div` still renders a plain <div> minus the
     animation props, so the page stays usable instead of blank.
  -------------------------------------------------------------- */
  var lib = window.Motion || window.FramerMotion || {};
  var ANIM_PROPS = [
    "initial", "animate", "exit", "transition", "variants", "whileHover",
    "whileTap", "whileInView", "whileFocus", "whileDrag", "viewport",
    "layout", "layoutId", "drag", "onAnimationComplete", "custom",
  ];

  function stripAnimProps(props) {
    var out = {};
    for (var key in props) {
      if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
      if (ANIM_PROPS.indexOf(key) !== -1) continue;
      out[key] = props[key];
    }
    return out;
  }

  function makeFallback() {
    var cache = {};
    function build(tag) {
      if (!cache[tag]) {
        cache[tag] = function (props) {
          var rest = stripAnimProps(props || {});
          var children = rest.children;
          delete rest.children;
          return React.createElement(tag, rest, children);
        };
      }
      return cache[tag];
    }
    if (typeof Proxy === "function") {
      return new Proxy({}, { get: function (_t, tag) { return build(String(tag)); } });
    }
    var plain = {};
    ["div", "span", "p", "a", "section", "button", "li", "h1", "h2", "h3"].forEach(function (t) {
      plain[t] = build(t);
    });
    return plain;
  }

  window.motion = lib.motion || makeFallback();
  window.AnimatePresence = lib.AnimatePresence || function (props) { return props.children || null; };
  window.MOTION_AVAILABLE = !!lib.motion;

  /* Shared entrance transition used across the page. */
  window.RISE_IN = {
    initial: { filter: "blur(10px)", opacity: 0, y: 20 },
    animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  };

  /* Smooth-scroll helper used by the nav and CTAs. */
  window.scrollToId = function (id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Hide the boot shim once React has mounted something. */
  window.dismissBoot = function () {
    var boot = document.getElementById("boot");
    if (!boot) return;
    boot.classList.add("hide");
    setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 500);
  };
})();
