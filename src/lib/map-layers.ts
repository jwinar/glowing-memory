import { setNow, type GeoJSONSource, type MapLibreMap } from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
} from "geojson";
import { buildLegRoutes, sliceLegRoute, type LegRoute } from "@/lib/route";
import { evaluateCamera, getLegProgress, getLegs, type Trip } from "@/lib/trip";
import type { Stop } from "@/lib/types";

// Shared between the live preview (GlobeMap) and the export renderer, so
// what gets captured on export is provably what the user saw — same
// layers, same per-frame update function, just called from a different
// driver loop (rAF vs. frame-stepped).
//
// Route and current-position are GL layers, not DOM markers, precisely so
// they show up in an exported video frame: a captured canvas only contains
// what's drawn into the WebGL context, not the separately-overlaid pin
// Markers GlobeMap uses for drag interaction.

export const ROUTE_SOURCE_ID = "route";
export const ROUTE_LAYER_ID = "route-line";
export const STOPS_SOURCE_ID = "stops";
export const STOPS_LAYER_ID = "stops-circles";
export const CURRENT_SOURCE_ID = "current-position";
export const CURRENT_LAYER_ID = "current-position-circle";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

export function setupTripLayers(map: MapLibreMap): void {
  map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#ec4899", "line-width": 3, "line-opacity": 0.85 },
  });

  map.addSource(STOPS_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
  map.addLayer({
    id: STOPS_LAYER_ID,
    type: "circle",
    source: STOPS_SOURCE_ID,
    paint: {
      "circle-radius": 8,
      "circle-color": "#ec4899",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  map.addSource(CURRENT_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
  map.addLayer({
    id: CURRENT_LAYER_ID,
    type: "circle",
    source: CURRENT_SOURCE_ID,
    paint: {
      "circle-radius": 6,
      "circle-color": "#0ea5e9",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
}

export function updateStopsLayer(map: MapLibreMap, stops: Stop[]): void {
  const source = map.getSource<GeoJSONSource>(STOPS_SOURCE_ID);
  if (!source) return;
  const features: Feature<Point>[] = stops.map((stop) => ({
    type: "Feature",
    properties: { id: stop.id, name: stop.name },
    geometry: { type: "Point", coordinates: [stop.lng, stop.lat] },
  }));
  source.setData({ type: "FeatureCollection", features });
}

function partsToGeometry(
  parts: number[][][],
): LineString | MultiLineString | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return { type: "LineString", coordinates: parts[0] };
  return { type: "MultiLineString", coordinates: parts };
}

export function buildTripLegRoutes(trip: Trip): LegRoute[] {
  return buildLegRoutes(getLegs(trip));
}

// The one function called every frame by both preview and export: freezes
// the map's clock, positions the camera, and redraws the route + current-
// position layers for that instant.
export function applyTripFrame(
  map: MapLibreMap,
  trip: Trip,
  legRoutes: LegRoute[],
  tMs: number,
): void {
  setNow(tMs);
  const camera = evaluateCamera(trip, tMs);
  map.jumpTo(camera);

  const progress = getLegProgress(trip, tMs);
  const routeFeatures: Feature<LineString | MultiLineString>[] = [];
  let currentTip: [number, number] | null = null;

  progress.forEach((leg, index) => {
    const sliced = sliceLegRoute(legRoutes[index], leg.t);
    const geometry = partsToGeometry(sliced.parts);
    if (geometry) {
      routeFeatures.push({ type: "Feature", properties: {}, geometry });
    }
    if (leg.t > 0 && leg.t < 1) currentTip = sliced.tip;
  });

  map
    .getSource<GeoJSONSource>(ROUTE_SOURCE_ID)
    ?.setData({ type: "FeatureCollection", features: routeFeatures });

  const position = currentTip ?? camera.center;
  map.getSource<GeoJSONSource>(CURRENT_SOURCE_ID)?.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: position },
      },
    ],
  });
}
