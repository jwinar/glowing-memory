/* ------------------------------------------------------------------
   icons.js — inline SVG set. Lucide-style strokes for UI chrome,
   Material paths for the capability cards.
------------------------------------------------------------------ */

const strokeBase = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Svg = ({ children, className = "h-5 w-5", viewBox = "0 0 24 24", ...rest }) => (
  <svg className={className} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

/* ---------- lucide-style ---------- */
const ArrowUpRight = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase}>
    <path d="M7 17L17 7" />
    <path d="M7 7h10v10" />
  </Svg>
);

const Play = ({ className = "h-4 w-4" }) => (
  <Svg className={className}>
    <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
  </Svg>
);

const Clock = ({ className = "h-7 w-7" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

const Globe = ({ className = "h-7 w-7" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
  </Svg>
);

const ChevronDown = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

const Package = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="m21 8-9-5-9 5v8l9 5 9-5V8Z" />
    <path d="m3 8 9 5 9-5" />
    <path d="M12 13v8" />
  </Svg>
);

const Tag = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M20.6 13.6 13.6 20.6a2 2 0 0 1-2.8 0l-7.4-7.4A2 2 0 0 1 2.8 11.8V4.8A2 2 0 0 1 4.8 2.8h7a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.8" cy="7.8" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

const Truck = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M2 6.5h11v10H2z" />
    <path d="M13 10h4.2l2.8 3.2v3.3H13z" />
    <circle cx="6" cy="18" r="1.8" />
    <circle cx="16.5" cy="18" r="1.8" />
  </Svg>
);

const Megaphone = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="m3 11 15-6v14l-15-6z" />
    <path d="M3 11v0a2.5 2.5 0 0 0 0 5h1v4h3v-4" />
  </Svg>
);

const RotateBack = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
  </Svg>
);

const Building = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
    <path d="M15 10h3a2 2 0 0 1 2 2v9" />
    <path d="M8 7h3M8 11h3M8 15h3M2 21h20" />
  </Svg>
);

const Sliders = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M4 20v-6M4 10V4M12 20v-9M12 7V4M20 20v-4M20 12V4" />
    <path d="M2 14h4M10 7h4M18 16h4" />
  </Svg>
);

const Download = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </Svg>
);

const Copy = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
);

const Reset = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 4v5h-5" />
  </Svg>
);

const Pin = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.6}>
    <path d="M12 17v5" />
    <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />
  </Svg>
);

const Info = ({ className = "h-3.5 w-3.5" }) => (
  <Svg className={className} {...strokeBase} strokeWidth={1.8}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);

const Check = ({ className = "h-4 w-4" }) => (
  <Svg className={className} {...strokeBase}>
    <path d="m4 12 5 5L20 6" />
  </Svg>
);

/* ---------- Material (filled) ---------- */
const MaterialIcon = ({ path, className = "h-6 w-6 text-white" }) => (
  <Svg className={className} fill="currentColor" stroke="none">
    <path d={path} />
  </Svg>
);

const MATERIAL_PATHS = {
  image: "M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm1-4h12l-3.75-5-3 4L9 13l-3 4Z",
  movie: "M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.89-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4Z",
  lightbulb: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z",
};

const Icons = {
  Svg,
  ArrowUpRight,
  Play,
  Clock,
  Globe,
  ChevronDown,
  Package,
  Tag,
  Truck,
  Megaphone,
  RotateBack,
  Building,
  Sliders,
  Download,
  Copy,
  Reset,
  Pin,
  Info,
  Check,
  MaterialIcon,
  MATERIAL_PATHS,
};

window.Icons = Icons;
