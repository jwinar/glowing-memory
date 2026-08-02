"use client";

import type { Stop } from "@/lib/types";

export default function StopsList({
  stops,
  onRename,
  onRemove,
}: {
  stops: Stop[];
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  if (stops.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Search a place above, or click anywhere on the globe to drop a pin.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1">
      {stops.map((stop, index) => (
        <li
          key={stop.id}
          className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[11px] font-semibold text-white">
            {index + 1}
          </span>
          <input
            value={stop.name}
            onChange={(e) => onRename(stop.id, e.target.value)}
            className="min-w-0 flex-1 truncate bg-transparent text-sm text-zinc-800 focus:outline-none dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => onRemove(stop.id)}
            aria-label={`Remove ${stop.name}`}
            className="shrink-0 rounded px-1.5 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
          >
            ×
          </button>
        </li>
      ))}
    </ol>
  );
}
