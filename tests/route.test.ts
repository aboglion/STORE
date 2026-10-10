import { describe, expect, it } from "vitest";

import {
    haversineMeters,
    metersToKm,
    optimizeRoute,
    roundMinutes,
    type RouteStop,
} from "@/lib/utils/route";

/** Fixed origin used in ordering tests (Tel Aviv coastal point). */
const ORIGIN = { lat: 32.0853, lng: 34.7818 };

describe("haversineMeters", () => {
    it("returns 0 for identical points", () => {
        expect(haversineMeters({ lat: 32.0853, lng: 34.7818 }, { lat: 32.0853, lng: 34.7818 })).toBe(0);
    });

    it("1 degree of latitude is ~111.19 km", () => {
        const meters = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
        expect(meters).toBeGreaterThan(110_000);
        expect(meters).toBeLessThan(112_500);
    });

    it("Tel Aviv to Jerusalem is roughly 60 km", () => {
        const tlv = { lat: 32.0853, lng: 34.7818 };
        const jerusalem = { lat: 31.7683, lng: 35.2137 };
        const km = metersToKm(haversineMeters(tlv, jerusalem));
        expect(km).toBeGreaterThan(52);
        expect(km).toBeLessThan(66);
    });

    it("is symmetric", () => {
        const a = { lat: 31.9, lng: 34.8 };
        const b = { lat: 32.1, lng: 35.1 };
        expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
    });
});

describe("optimizeRoute", () => {
    const stop = (id: string, lat: number, lng: number): RouteStop => ({
        id,
        lat,
        lng,
    });

    it("returns empty plan for no stops", () => {
        const plan = optimizeRoute(null, []);
        expect(plan.ordered).toEqual([]);
        expect(plan.unlocated).toEqual([]);
        expect(plan.totalMeters).toBe(0);
        expect(plan.legsMeters).toEqual([]);
    });

    it("handles a single located stop", () => {
        const plan = optimizeRoute(null, [stop("a", 32, 34.8)]);
        expect(plan.ordered.map((s) => s.id)).toEqual(["a"]);
        expect(plan.legsMeters).toEqual([0]);
    });

    it("never worsens the tour vs. the input order (2-opt safety)", () => {
        const stops = [
            stop("a", 32.01, 34.8),
            stop("b", 32.05, 34.85),
            stop("c", 32.09, 34.8),
            stop("d", 32.11, 34.9),
            stop("e", 32.0, 34.9),
        ];
        const origin = { lat: 32.0853, lng: 34.7818 };

        const optimized = optimizeRoute(origin, stops);

        // Verify it actually visits every stop exactly once.
        expect(optimized.ordered.map((s) => s.id).sort()).toEqual(
            ["a", "b", "c", "d", "e"].sort()
        );

        // 2-opt must not produce a longer tour than the naive input order.
        const inputOrderPlan = optimizeRoute(origin, [
            stop("a", 32.01, 34.8),
            stop("b", 32.05, 34.85),
            stop("c", 32.09, 34.8),
            stop("e", 32.0, 34.9),
            stop("d", 32.11, 34.9),
        ]);
        expect(optimized.totalMeters).toBeLessThanOrEqual(inputOrderPlan.totalMeters);
        expect(planSelfDistance(optimized)).toBeCloseTo(optimized.totalMeters, 0);
    });

    it("places the closest stop to the origin first", () => {
        const origin = { lat: 32.0, lng: 34.8 };
        const stops = [
            stop("far", 32.2, 34.8),
            stop("near", 32.01, 34.8),
            stop("mid", 32.1, 34.8),
        ];
        const plan = optimizeRoute(origin, stops);
        expect(plan.ordered[0].id).toBe("near");
        // First leg is the shortest of the three origin->stop distances.
        const dNear = haversineMeters(origin, { lat: 32.01, lng: 34.8 });
        expect(plan.legsMeters[0]).toBeCloseTo(dNear, 0);
    });

    it("separates stops without coordinates into unlocated", () => {
        const plan = optimizeRoute(null, [
            stop("with", 32.0, 34.8),
            { id: "without", lat: null, lng: null },
            stop("also", 32.1, 34.9),
        ]);
        expect(plan.ordered.map((s) => s.id)).toEqual(["with", "also"]);
        expect(plan.unlocated.map((s) => s.id)).toEqual(["without"]);
    });

    it("computes totalMinutes from drive + service time", () => {
        const stops = [stop("a", 32.0, 34.8), stop("b", 32.01, 34.8)];
        const plan = optimizeRoute(null, stops);
        // ~1.1 km drive at 25 km/h ≈ 2.7 min + 2 × 3 min service.
        expect(plan.totalMinutes).toBeGreaterThan(6);
        expect(plan.totalMinutes).toBeLessThan(9);
    });

    it("rounds durations to whole minutes (min 1)", () => {
        expect(roundMinutes(0.4)).toBe(1);
        expect(roundMinutes(6.2)).toBe(6);
        expect(roundMinutes(7.6)).toBe(8);
    });

    it("deterministic across repeated calls", () => {
        const stops = [
            stop("a", 32.01, 34.8),
            stop("b", 32.05, 34.85),
            stop("c", 32.09, 34.8),
            stop("d", 32.11, 34.9),
            stop("e", 32.0, 34.9),
        ];
        const first = optimizeRoute(ORIGIN, stops).ordered.map((s) => s.id);
        const second = optimizeRoute(ORIGIN, stops).ordered.map((s) => s.id);
        expect(first).toEqual(second);
    });
});

/** Sums legsMeters from a plan to cross-check totalMeters. */
function planSelfDistance(plan: { legsMeters: number[] }): number {
    return plan.legsMeters.reduce((a: number, b: number) => a + b, 0);
}