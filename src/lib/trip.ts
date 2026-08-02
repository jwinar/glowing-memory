import {
  easeCubicIn,
  easeCubicInOut,
  easeCubicOut,
  easeLinear,
  easeQuadInOut,
  easeSinInOut,
} from "d3-ease";
import type { Stop } from "@/lib/types";

const EASE_FNS = {
  linear: easeLinear,
  cubicIn: easeCubicIn,
  cubicOut: easeCubicOut,
  cubicInOut: easeCubicInOut,
  quadInOut: easeQuadInOut,
  sinInOut: easeSinInOut,
} as const;

export type EaseName = keyof typeof EASE_FNS;

export interface CameraState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

// Plain data, JSON-serializable — this is what makes it possible for the
// export renderer to consume exactly what the preview used, with nothing
// lost in translation (see the plan's "single source of truth" note).
export interface TripSettings {
  dwellMs: number;
  legMs: number;
  ease: EaseName;
  restZoom: number;
  peakZoomOut: number;
  pitch: number;
}

export const DEFAULT_TRIP_SETTINGS: TripSettings = {
  dwellMs: 1200,
  legMs: 2500,
  ease: "cubicInOut",
  restZoom: 9,
  peakZoomOut: 3,
  pitch: 45,
};

type Segment =
  | { kind: "dwell"; stop: Stop; startMs: number; durationMs: number }
  | { kind: "fly"; from: Stop; to: Stop; startMs: number; durationMs: number };

export interface Trip {
  settings: TripSettings;
  segments: Segment[];
  totalMs: number;
}

export function buildTrip(
  stops: Stop[],
  settings: TripSettings = DEFAULT_TRIP_SETTINGS,
): Trip {
  const segments: Segment[] = [];
  let cursor = 0;

  stops.forEach((stop, index) => {
    segments.push({
      kind: "dwell",
      stop,
      startMs: cursor,
      durationMs: settings.dwellMs,
    });
    cursor += settings.dwellMs;

    const next = stops[index + 1];
    if (next) {
      segments.push({
        kind: "fly",
        from: stop,
        to: next,
        startMs: cursor,
        durationMs: settings.legMs,
      });
      cursor += settings.legMs;
    }
  });

  return { settings, segments, totalMs: cursor };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Interpolates the short way around the globe so a Tokyo -> Los Angeles leg
// crosses the Pacific / antimeridian instead of visually dragging the
// whole map back through Europe. (Camera-center interpolation only — the
// actual flight-path arc drawn on the map is @turf/great-circle, milestone 5.)
function lerpLng(a: number, b: number, t: number) {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return a + delta * t;
}

const DEFAULT_CAMERA: CameraState = {
  center: [0, 20],
  zoom: 1.5,
  bearing: 0,
  pitch: 0,
};

export function evaluateCamera(trip: Trip, tMs: number): CameraState {
  if (trip.segments.length === 0) return DEFAULT_CAMERA;

  const clamped = Math.min(Math.max(tMs, 0), trip.totalMs);
  const segment =
    trip.segments.find(
      (s) => clamped >= s.startMs && clamped < s.startMs + s.durationMs,
    ) ?? trip.segments[trip.segments.length - 1];

  const localT =
    segment.durationMs === 0
      ? 1
      : Math.min(
          Math.max((clamped - segment.startMs) / segment.durationMs, 0),
          1,
        );

  const { restZoom, peakZoomOut, pitch } = trip.settings;

  if (segment.kind === "dwell") {
    return {
      center: [segment.stop.lng, segment.stop.lat],
      zoom: restZoom,
      bearing: 0,
      pitch,
    };
  }

  const ease = EASE_FNS[trip.settings.ease];
  const eased = ease(localT);
  const center: [number, number] = [
    lerpLng(segment.from.lng, segment.to.lng, eased),
    lerp(segment.from.lat, segment.to.lat, eased),
  ];
  // Pull the zoom out around the midpoint of the flight and back in at
  // both ends — the camera "lifts off, arcs, and lands" feel.
  const arcOut = Math.sin(eased * Math.PI);
  const zoom = restZoom - arcOut * peakZoomOut;

  return { center, zoom, bearing: 0, pitch };
}
