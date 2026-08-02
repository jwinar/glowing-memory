"use client";

export default function TransportBar({
  isPlaying,
  tMs,
  totalMs,
  onPlay,
  onPause,
  onSeek,
}: {
  isPlaying: boolean;
  tMs: number;
  totalMs: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (tMs: number) => void;
}) {
  const disabled = totalMs === 0;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 shadow dark:bg-black/70">
      <button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        disabled={disabled}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white disabled:opacity-40"
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(totalMs, 1)}
        value={Math.min(tMs, totalMs)}
        disabled={disabled}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-56 accent-pink-500 disabled:opacity-40"
      />
      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
        {(tMs / 1000).toFixed(1)}s / {(totalMs / 1000).toFixed(1)}s
      </span>
    </div>
  );
}
