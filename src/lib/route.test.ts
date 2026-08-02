import { describe, expect, it } from "vitest";
import { buildLegRoutes, sliceLegRoute } from "@/lib/route";
import type { Stop } from "@/lib/types";

const tokyo: Stop = { id: "a", name: "Tokyo", lng: 139.69, lat: 35.68 };
const losAngeles: Stop = { id: "b", name: "Los Angeles", lng: -118.24, lat: 34.05 };
const paris: Stop = { id: "c", name: "Paris", lng: 2.35, lat: 48.86 };

describe("buildLegRoutes", () => {
  it("produces a route with several points per leg", () => {
    const [route] = buildLegRoutes([{ from: tokyo, to: paris }]);
    const totalPoints = route.parts.reduce((sum, p) => sum + p.length, 0);
    expect(totalPoints).toBeGreaterThan(2);
  });

  it("splits into multiple parts for a leg crossing the antimeridian", () => {
    const [route] = buildLegRoutes([{ from: tokyo, to: losAngeles }]);
    expect(route.parts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("sliceLegRoute", () => {
  const [route] = buildLegRoutes([{ from: tokyo, to: paris }]);

  it("draws nothing at t=0", () => {
    const sliced = sliceLegRoute(route, 0);
    expect(sliced.parts).toEqual([]);
    expect(sliced.tip).toBeNull();
  });

  it("draws the full route at t=1", () => {
    const sliced = sliceLegRoute(route, 1);
    expect(sliced.parts).toEqual(route.parts);
  });

  it("draws a strictly growing prefix as t increases", () => {
    const countPoints = (parts: number[][][]) =>
      parts.reduce((sum, p) => sum + p.length, 0);

    const quarter = sliceLegRoute(route, 0.25);
    const half = sliceLegRoute(route, 0.5);
    expect(countPoints(quarter.parts)).toBeLessThan(countPoints(half.parts));
    expect(quarter.tip).not.toBeNull();
    expect(half.tip).not.toBeNull();
  });


  it("never emits a degenerate single-point line", () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const sliced = sliceLegRoute(route, t);
      for (const part of sliced.parts) {
        expect(part.length).not.toBe(1);
      }
    }
  });
});
