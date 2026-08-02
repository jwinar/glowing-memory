"use client";

import type { MapLibreMap } from "maplibre-gl";
import { useCallback, useMemo, useState } from "react";
import GlobeMap from "@/components/GlobeMap";
import PlaceSearch from "@/components/PlaceSearch";
import StopsList from "@/components/StopsList";
import TransportBar from "@/components/TransportBar";
import { useStops } from "@/hooks/useStops";
import { useTripPlayer } from "@/hooks/useTripPlayer";
import type { GeocodeResult } from "@/lib/geocode";
import { buildTrip } from "@/lib/trip";

export default function Home() {
  const { stops, addStop, moveStop, renameStop, removeStop } = useStops();
  const [map, setMap] = useState<MapLibreMap | null>(null);

  const trip = useMemo(() => buildTrip(stops), [stops]);
  const player = useTripPlayer(map, trip);

  const handlePlaceSelect = useCallback(
    (result: GeocodeResult) => {
      addStop(result.lng, result.lat, result.label);
      map?.flyTo({ center: [result.lng, result.lat], zoom: 6 });
    },
    [addStop, map],
  );

  return (
    <div className="relative h-dvh w-dvw">
      <GlobeMap
        stops={stops}
        onAddStop={(lng, lat) => addStop(lng, lat)}
        onMoveStop={moveStop}
        onMapReady={setMap}
      />

      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <div className="pointer-events-auto rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-zinc-800 shadow dark:bg-black/70 dark:text-zinc-100">
          Travel Animator — prototype
        </div>
        <div className="pointer-events-auto">
          <PlaceSearch onSelect={handlePlaceSelect} />
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-4 max-h-[50dvh] w-72 overflow-auto rounded-lg bg-white/90 p-3 shadow dark:bg-black/70">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Stops ({stops.length})
        </h2>
        <StopsList stops={stops} onRename={renameStop} onRemove={removeStop} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <TransportBar
          isPlaying={player.isPlaying}
          tMs={player.tMs}
          totalMs={player.totalMs}
          onPlay={player.play}
          onPause={player.pause}
          onSeek={player.seek}
        />
      </div>
    </div>
  );
}
