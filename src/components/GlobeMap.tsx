"use client";

import maplibregl, { restoreNow, type MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyTripFrame,
  buildTripLegRoutes,
  setupTripLayers,
  updateStopsLayer,
} from "@/lib/map-layers";
import { DEFAULT_STYLE_URL } from "@/lib/map-style";
import type { Trip } from "@/lib/trip";
import type { Stop } from "@/lib/types";

function createPinElement() {
  const el = document.createElement("div");
  el.style.width = "22px";
  el.style.height = "22px";
  el.style.borderRadius = "50% 50% 50% 0";
  el.style.background = "#ec4899";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
  el.style.transform = "rotate(-45deg)";
  el.style.cursor = "grab";
  return el;
}

interface GlobeMapProps {
  stops: Stop[];
  trip: Trip;
  tMs: number;
  onAddStop: (lng: number, lat: number) => void;
  onMoveStop: (id: string, lng: number, lat: number) => void;
  onMapReady?: (map: MapLibreMap) => void;
}

export default function GlobeMap({
  stops,
  trip,
  tMs,
  onAddStop,
  onMoveStop,
  onMapReady,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Refs so the mount-only effect below always calls the latest callbacks
  // without needing to re-run (and re-create the map) when they change.
  const onAddStopRef = useRef(onAddStop);
  const onMoveStopRef = useRef(onMoveStop);
  useEffect(() => {
    onAddStopRef.current = onAddStop;
    onMoveStopRef.current = onMoveStop;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE_URL,
      center: [0, 20],
      zoom: 1.5,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      setupTripLayers(map);
      setMapLoaded(true);
      onMapReady?.(map);
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

    map.on("click", (e) => {
      onAddStopRef.current(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      restoreNow();
    };
    // Map is created once; onMapReady is captured at that point, matching
    // the "run once" intent of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the map's pin markers (for drag interaction) and the "stops" GL
  // layer (for export, which only sees what's drawn in the canvas) both in
  // sync with the stops list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const currentIds = new Set(stops.map((s) => s.id));

    for (const [id, marker] of markers) {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    for (const stop of stops) {
      if (markers.has(stop.id)) continue;

      const marker = new maplibregl.Marker({
        element: createPinElement(),
        draggable: true,
      })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        onMoveStopRef.current(stop.id, lng, lat);
      });

      markers.set(stop.id, marker);
    }

    if (mapLoaded) updateStopsLayer(map, stops);
  }, [stops, mapLoaded]);

  // The great-circle path per leg only depends on the trip's stops, not on
  // playback time — recomputing it every frame would be wasted work.
  const legRoutes = useMemo(() => buildTripLegRoutes(trip), [trip]);

  // Same per-frame update the export renderer uses (see map-layers.ts),
  // just called from React state instead of a frame-stepped export loop.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    applyTripFrame(map, trip, legRoutes, tMs);
  }, [mapLoaded, trip, tMs, legRoutes]);

  return <div ref={containerRef} className="h-full w-full" />;
}
