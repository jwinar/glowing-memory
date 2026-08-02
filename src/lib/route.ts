import { greatCircle } from "@turf/turf";
import type { Feature, LineString, MultiLineString } from "geojson";
import type { Leg } from "@/lib/trip";

// A route's points as one or more ordered parts — a LineString has a single
// part, a MultiLineString has one per antimeridian crossing.
type LineParts = number[][][];

function toLineParts(feature: Feature<LineString | MultiLineString>): LineParts {
  return feature.geometry.type === "LineString"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

export interface LegRoute extends Leg {
  parts: LineParts;
}

// Precomputes the great-circle path for each leg. Cheap enough to redo
// whenever the trip's stops change (npoints=100 per leg), so callers should
// memoize this on the trip reference rather than recomputing every frame.
export function buildLegRoutes(legs: Leg[]): LegRoute[] {
  return legs.map((leg) => ({
    ...leg,
    parts: toLineParts(
      greatCircle([leg.from.lng, leg.from.lat], [leg.to.lng, leg.to.lat], {
        npoints: 100,
      }),
    ),
  }));
}

// Keeps only the first `t` fraction of a route's points, in order across
// parts — this is what turns a fully-drawn great circle into a trail that
// grows as the leg's progress `t` advances from 0 to 1.
function sliceLineParts(parts: LineParts, t: number): LineParts {
  if (t <= 0) return [];
  if (t >= 1) return parts;

  const totalPoints = parts.reduce((sum, part) => sum + part.length, 0);
  let remaining = Math.max(2, Math.round(t * totalPoints));

  const result: LineParts = [];
  for (const part of parts) {
    if (remaining <= 0) break;
    if (part.length <= remaining) {
      result.push(part);
      remaining -= part.length;
    } else if (remaining >= 2) {
      result.push(part.slice(0, remaining));
      remaining = 0;
    } else {
      break;
    }
  }
  return result;
}

export interface SlicedLeg {
  parts: LineParts;
  /** The last drawn point — where a "current position" marker belongs. */
  tip: [number, number] | null;
}

export function sliceLegRoute(route: LegRoute, t: number): SlicedLeg {
  const parts = sliceLineParts(route.parts, t);
  const lastPart = parts[parts.length - 1];
  const tip = lastPart ? (lastPart[lastPart.length - 1] as [number, number]) : null;
  return { parts, tip };
}
