/* ------------------------------------------------------------------
   controls.js — the glass form kit used by the cost model.
------------------------------------------------------------------ */

const Hint = ({ text }) => {
  const { Info } = window.Icons;
  if (!text) return null;
  return (
    <span className="relative inline-flex group align-middle" tabIndex={0} aria-label={text}>
      <Info className="h-3.5 w-3.5 text-white/40 group-hover:text-white/80 group-focus:text-white/80 transition-colors" />
      <span
        className="pointer-events-none absolute left-1/2 bottom-full z-40 mb-2 hidden w-56 -translate-x-1/2 rounded-[0.85rem] bg-black/95 px-3 py-2 text-[11px] font-body font-light leading-snug text-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.12)] group-hover:block group-focus:block"
      >
        {text}
      </span>
    </span>
  );
};

/* A labelled numeric input with an optional slider underneath. */
const Field = ({
  label,
  hint,
  prefix,
  suffix,
  value,
  onChange,
  step = "any",
  min,
  max,
  range,
  disabled,
}) => {
  const handle = (event) => onChange(event.target.value);
  return (
    <label className={`block ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/50 font-body font-medium mb-2">
        {label}
        <Hint text={hint} />
      </span>
      <div className="liquid-glass rounded-full flex items-center gap-1 px-4 py-2.5">
        {prefix ? <span className="text-white/45 text-sm font-body shrink-0">{prefix}</span> : null}
        <input
          type="number"
          inputMode="decimal"
          className="w-full min-w-0 bg-transparent text-white text-sm font-body outline-none"
          value={value}
          onChange={handle}
          step={step}
          min={min}
          max={max}
          placeholder="0"
        />
        {suffix ? <span className="text-white/45 text-sm font-body shrink-0">{suffix}</span> : null}
      </div>
      {range ? (
        <input
          type="range"
          className="mt-3"
          min={range.min}
          max={range.max}
          step={range.step || 1}
          value={window.CostEngine.num(value)}
          onChange={handle}
          aria-label={`${label} slider`}
        />
      ) : null}
    </label>
  );
};

const GlassSelect = ({ label, hint, value, onChange, options }) => {
  const { ChevronDown } = window.Icons;
  return (
    <label className="block">
      {label ? (
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/50 font-body font-medium mb-2">
          {label}
          <Hint text={hint} />
        </span>
      ) : null}
      <div className="liquid-glass rounded-full flex items-center px-4 py-2.5">
        <select
          className="glass-select w-full appearance-none bg-transparent text-white text-sm font-body outline-none cursor-pointer"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="h-4 w-4 text-white/45 shrink-0 pointer-events-none" />
      </div>
    </label>
  );
};

const Segmented = ({ options, value, onChange, className = "" }) => (
  <div className={`liquid-glass rounded-full inline-flex items-center p-1 ${className}`}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-body whitespace-nowrap transition-colors ${
            active ? "bg-white text-black font-semibold" : "text-white/70 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const GhostButton = ({ children, onClick, icon: Icon, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="liquid-glass rounded-full px-3.5 py-2 text-xs font-body text-white/85 hover:text-white flex items-center gap-2 transition-colors"
  >
    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
    {children}
  </button>
);

/* Collapsible group of fields. */
const Panel = ({ title, icon: Icon, subtitle, children, defaultOpen = true }) => {
  const { ChevronDown } = window.Icons;
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="liquid-glass rounded-[1.25rem] p-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 text-left"
        aria-expanded={open}
      >
        <span
          className="liquid-glass rounded-[0.75rem] flex items-center justify-center shrink-0 text-white"
          style={{ width: 38, height: 38 }}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-heading italic text-white text-2xl leading-none tracking-[-1px]">
            {title}
          </span>
          {subtitle ? (
            <span className="block text-[11px] text-white/50 font-body font-light mt-1">{subtitle}</span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-white/45 shrink-0 transition-transform duration-300 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open ? <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">{children}</div> : null}
    </div>
  );
};

/* Headline number tile with an optional delta against a pinned baseline. */
const StatTile = ({ label, value, sub, delta, tone = "neutral", wide }) => {
  const toneClass =
    tone === "positive" ? "text-white" : tone === "negative" ? "text-white/60" : "text-white";
  return (
    <div className={`liquid-glass rounded-[1.25rem] p-5 flex flex-col ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/50 font-body font-medium">
        {label}
      </span>
      <span className={`font-heading italic ${toneClass} text-4xl tracking-[-1px] leading-none mt-3`}>
        {value}
      </span>
      <span className="flex items-center gap-2 mt-2 min-h-[18px]">
        {sub ? <span className="text-xs text-white/55 font-body font-light">{sub}</span> : null}
        {delta ? (
          <span className="liquid-glass rounded-full px-2 py-0.5 text-[10px] font-body text-white/85 whitespace-nowrap">
            {delta}
          </span>
        ) : null}
      </span>
    </div>
  );
};

/* One line of the P&L. */
const LedgerRow = ({ label, perUnit, perMonth, emphasis, indent, hint }) => (
  <div
    className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-2.5 ${
      emphasis ? "border-t border-white/15" : "border-t border-white/[0.06]"
    }`}
  >
    <span
      className={`flex items-center gap-1.5 font-body text-sm truncate ${
        emphasis ? "text-white font-medium" : "text-white/65 font-light"
      } ${indent ? "pl-4" : ""}`}
    >
      {label}
      <Hint text={hint} />
    </span>
    <span
      className={`text-right tabular-nums font-body text-sm w-24 ${
        emphasis ? "text-white" : "text-white/75"
      }`}
    >
      {perUnit}
    </span>
    <span
      className={`text-right tabular-nums font-body text-sm w-28 ${
        emphasis ? "text-white font-medium" : "text-white/75"
      }`}
    >
      {perMonth}
    </span>
  </div>
);

window.CalcControls = { Hint, Field, GlassSelect, Segmented, GhostButton, Panel, StatTile, LedgerRow };
