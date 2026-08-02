"use client";

import { useCallback, useState } from "react";
import { exportTripToVideo } from "@/lib/export";
import type { Trip } from "@/lib/trip";
import type { Stop } from "@/lib/types";

const PRESETS = [
  { label: "9:16", width: 720, height: 1280 },
  { label: "1:1", width: 720, height: 720 },
  { label: "16:9", width: 1280, height: 720 },
] as const;

export default function ExportPanel({
  trip,
  stops,
}: {
  trip: Trip;
  stops: Stop[];
}) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const disabled = trip.totalMs === 0 || isExporting;

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    setProgress(0);
    try {
      const preset = PRESETS[presetIndex];
      const blob = await exportTripToVideo(trip, stops, {
        width: preset.width,
        height: preset.height,
        fps: 30,
        onProgress: setProgress,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trip.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }, [trip, stops, presetIndex]);

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-lg bg-white/90 p-3 shadow dark:bg-black/70">
      <div className="flex gap-1">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setPresetIndex(i)}
            disabled={isExporting}
            className={`rounded px-2 py-1 text-xs disabled:opacity-40 ${
              i === presetIndex
                ? "bg-pink-500 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled}
        className="rounded-full bg-pink-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {isExporting ? `Exporting… ${Math.round(progress * 100)}%` : "Export MP4"}
      </button>
      {error && (
        <p className="max-w-48 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
