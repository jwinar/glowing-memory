import { describe, expect, it } from "vitest";
import {
  buildTrip,
  evaluateCamera,
  getLegProgress,
  getLegs,
  type Trip,
} from "@/lib/trip";
import type { Stop } from "@/lib/types";

const tokyo: Stop = { id: "a", name: "Tokyo", lng: 139.69, lat: 35.68 };
const losAngeles: Stop = { id: "b", name: "Los Angeles", lng: -118.24, lat: 34.05 };
const paris: Stop = { id: "c", name: "Paris", lng: 2.35, lat: 48.86 };

describe("buildTrip", () => {
  it("produces no segments for an empty trip", () => {
    const trip = buildTrip([]);
    expect(trip.segments).toHaveLength(0);
    expect(trip.totalMs).toBe(0);
  });

  it("is a single dwell for one stop, with no legs", () => {
    const trip = buildTrip([tokyo]);
    expect(trip.segments).toEqual([
      { kind: "dwell", stop: tokyo, startMs: 0, durationMs: trip.settings.dwellMs },
    ]);
    expect(trip.totalMs).toBe(trip.settings.dwellMs);
  });

  it("alternates dwell/fly/dwell for two stops, summing to totalMs", () => {
    const trip = buildTrip([tokyo, paris]);
    expect(trip.segments.map((s) => s.kind)).toEqual(["dwell", "fly", "dwell"]);
    expect(trip.totalMs).toBe(2 * trip.settings.dwellMs + trip.settings.legMs);
  });
});

describe("evaluateCamera", () => {
  it("returns a stable default when there are no stops", () => {
    const trip = buildTrip([]);
    const a = evaluateCamera(trip, 0);
    const b = evaluateCamera(trip, 9999);
    expect(a).toEqual(b);
  });

  it("holds the camera fixed on a stop for its entire dwell", () => {
    const trip = buildTrip([tokyo]);
    const start = evaluateCamera(trip, 0);
    const mid = evaluateCamera(trip, trip.settings.dwellMs / 2);
    const end = evaluateCamera(trip, trip.settings.dwellMs - 1);
    expect(start.center).toEqual([tokyo.lng, tokyo.lat]);
    expect(mid.center).toEqual([tokyo.lng, tokyo.lat]);
    expect(end.center).toEqual([tokyo.lng, tokyo.lat]);
  });

  it("clamps to the final camera state past the end of the trip", () => {
    const trip = buildTrip([tokyo, paris]);
    const atEnd = evaluateCamera(trip, trip.totalMs - 1);
    const wayPastEnd = evaluateCamera(trip, trip.totalMs + 50_000);
    expect(wayPastEnd).toEqual(atEnd);
  });

  it("pulls the zoom out around the midpoint of a flight leg", () => {
    const trip = buildTrip([tokyo, paris]);
    const legStart = trip.segments.find((s) => s.kind === "fly")!.startMs;
    const legDuration = trip.settings.legMs;

    const atTakeoff = evaluateCamera(trip, legStart);
    const atMidflight = evaluateCamera(trip, legStart + legDuration / 2);
    const atLanding = evaluateCamera(trip, legStart + legDuration);

    expect(atMidflight.zoom).toBeLessThan(atTakeoff.zoom);
    expect(atMidflight.zoom).toBeLessThan(atLanding.zoom);
  });

  it("crosses the antimeridian the short way for a Tokyo -> LA leg", () => {
    // Naive lng lerp (no wraparound) would sweep back through Europe/Africa,
    // i.e. every interpolated longitude would sit between -118.24 and
    // 139.69 going the "long way" (through 0°). The short way crosses the
    // Pacific through +/-180°, so interpolated longitudes should stay
    // outside that range instead.
    const trip = buildTrip([tokyo, losAngeles], {
      ...buildTrip([]).settings,
      dwellMs: 0,
      legMs: 1000,
    });
    const quarter = evaluateCamera(trip, 250).center[0];
    const half = evaluateCamera(trip, 500).center[0];
    const threeQuarter = evaluateCamera(trip, 750).center[0];

    for (const lng of [quarter, half, threeQuarter]) {
      const wentTheLongWayThroughEurope = lng > -118.24 && lng < 139.69;
      expect(wentTheLongWayThroughEurope).toBe(false);
    }
  });

  it("round-trips through JSON without losing data", () => {
    // Trip must stay plain, JSON-serializable data (no functions/classes) so
    // it can be persisted and handed to a server-side renderer unchanged —
    // the "single source of truth" the plan's architecture depends on.
    const trip = buildTrip([tokyo, paris]);
    const roundTripped: Trip = JSON.parse(JSON.stringify(trip));
    expect(roundTripped).toEqual(trip);
  });
});

describe("getLegs", () => {
  it("is empty for a trip with no legs", () => {
    expect(getLegs(buildTrip([]))).toEqual([]);
    expect(getLegs(buildTrip([tokyo]))).toEqual([]);
  });

  it("lists legs in order, ignoring dwell segments", () => {
    const trip = buildTrip([tokyo, paris, losAngeles]);
    expect(getLegs(trip)).toEqual([
      { from: tokyo, to: paris },
      { from: paris, to: losAngeles },
    ]);
  });
});

describe("getLegProgress", () => {
  it("marks every leg as not-started at t=0", () => {
    const trip = buildTrip([tokyo, paris, losAngeles]);
    expect(getLegProgress(trip, 0).every((l) => l.t === 0)).toBe(true);
  });

  it("marks every leg complete once the trip is over", () => {
    const trip = buildTrip([tokyo, paris, losAngeles]);
    expect(
      getLegProgress(trip, trip.totalMs).every((l) => l.t === 1),
    ).toBe(true);
  });

  it("reports partial progress only for the currently-active leg", () => {
    const trip = buildTrip([tokyo, paris, losAngeles]);
    const secondLegStart =
      trip.settings.dwellMs * 2 + trip.settings.legMs; // through first dwell, first leg, second dwell
    const midSecondLeg = secondLegStart + trip.settings.legMs / 2;

    const progress = getLegProgress(trip, midSecondLeg);
    expect(progress[0].t).toBe(1); // Tokyo -> Paris already flown
    expect(progress[1].t).toBeGreaterThan(0); // Paris -> LA in progress
    expect(progress[1].t).toBeLessThan(1);
  });
});
