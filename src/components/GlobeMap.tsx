"use client";

import maplibregl, { type GeoJSONSource, type MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildLegRoutes, sliceLegRoute } from "@/lib/route";
import { getLegProgress, getLegs, type Trip } from "@/lib/trip";
import type { Stop } from "@/lib/types";

// OpenFreeMap: no API key, unlimited use, self-hostable later. Swap for a
// self-hosted Protomaps PMTiles style once we're ready to own the tiles —
// or override at build time without a code change via this env var.
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";

const ROUTE_SOURCE_ID = "route";
const ROUTE_LAYER_ID = "route-line";
const EMPTY_ROUTE_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

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

function createPlaneElement() {
  const el = document.createElement("div");
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.background = "#0ea5e9";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
  return el;
}

function partsToGeometry(
  parts: number[][][],
): LineString | MultiLineString | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return { type: "LineString", coordinates: parts[0] };
  return { type: "MultiLineString", coordinates: parts };
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
  const planeMarkerRef = useRef<maplibregl.Marker | null>(null);
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
      style: STYLE_URL,
      center: [0, 20],
      zoom: 1.5,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: EMPTY_ROUTE_FC });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ec4899",
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });
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
    };
    // Map is created once; onMapReady is captured at that point, matching
    // the "run once" intent of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the map's pin markers in sync with the stops list: add markers for
  // new stops, remove markers for deleted ones. Dragging a marker updates
  // the stop's coordinates via onMoveStop rather than the other way around,
  // so an already-present marker never needs its position reset here.
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
  }, [stops]);

  // The great-circle path per leg only depends on the trip's stops, not on
  // playback time — recomputing it every frame would be wasted work.
  const legRoutes = useMemo(() => buildLegRoutes(getLegs(trip)), [trip]);

  // Draw each leg's route up to its current progress, and place a marker
  // at the tip of whichever leg is currently mid-flight (none, if the trip
  // is dwelling at a stop or hasn't started).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const progress = getLegProgress(trip, tMs);
    const features: Feature<LineString | MultiLineString>[] = [];
    let planeTip: [number, number] | null = null;

    progress.forEach((leg, index) => {
      const sliced = sliceLegRoute(legRoutes[index], leg.t);
      const geometry = partsToGeometry(sliced.parts);
      if (geometry) features.push({ type: "Feature", properties: {}, geometry });
      if (leg.t > 0 && leg.t < 1) planeTip = sliced.tip;
    });

    const source = map.getSource<GeoJSONSource>(ROUTE_SOURCE_ID);
    source?.setData({ type: "FeatureCollection", features });

    if (planeTip) {
      if (!planeMarkerRef.current) {
        // setLngLat must come before addTo — an added marker with no
        // position yet throws when MapLibre tries to project it.
        planeMarkerRef.current = new maplibregl.Marker({
          element: createPlaneElement(),
        })
          .setLngLat(planeTip)
          .addTo(map);
      } else {
        planeMarkerRef.current.setLngLat(planeTip);
      }
    } else if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
      planeMarkerRef.current = null;
    }
  }, [mapLoaded, trip, tMs, legRoutes]);

  return <div ref={containerRef} className="h-full w-full" />;
}
