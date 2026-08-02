"use client";

import type { MapLibreMap } from "maplibre-gl";
import { useCallback, useRef } from "react";
import GlobeMap from "@/components/GlobeMap";
import PlaceSearch from "@/components/PlaceSearch";
import StopsList from "@/components/StopsList";
import { useStops } from "@/hooks/useStops";
import type { GeocodeResult } from "@/lib/geocode";

export default function Home() {
  const { stops, addStop, moveStop, renameStop, removeStop } = useStops();
  const mapRef = useRef<MapLibreMap | null>(null);

  const handleMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map;
  }, []);

  const handlePlaceSelect = useCallback(
    (result: GeocodeResult) => {
      addStop(result.lng, result.lat, result.label);
      mapRef.current?.flyTo({ center: [result.lng, result.lat], zoom: 6 });
    },
    [addStop],
  );

  return (
    <div className="relative h-dvh w-dvw">
      <GlobeMap
        stops={stops}
        onAddStop={(lng, lat) => addStop(lng, lat)}
        onMoveStop={moveStop}
        onMapReady={handleMapReady}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-start justify-between p-4">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-zinc-800 shadow dark:bg-black/70 dark:text-zinc-100">
            Travel Animator — prototype
          </div>
          <PlaceSearch onSelect={handlePlaceSelect} />
        </div>

        <div className="pointer-events-auto max-h-[50dvh] w-72 overflow-auto rounded-lg bg-white/90 p-3 shadow dark:bg-black/70">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Stops ({stops.length})
          </h2>
          <StopsList stops={stops} onRename={renameStop} onRemove={removeStop} />
        </div>
      </div>
    </div>
  );
}
