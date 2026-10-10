import { describe, expect, it } from "vitest";

import {
    buildForwardCacheKey,
    buildReverseCacheKey,
    mapConfidence,
} from "@/lib/server/geocoding";

describe("mapConfidence", () => {
    it("maps building/house-level results to high", () => {
        for (const type of [
            "building",
            "house",
            "residential",
            "apartments",
            "shop",
            "hotel",
            "hospital",
            "school",
            "place_of_worship",
        ]) {
            expect(mapConfidence(type)).toBe("high");
        }
    });

    it("maps street-level results to medium", () => {
        for (const type of [
            "road",
            "street",
            "highway",
            "pedestrian",
            "footway",
            "address",
            "bus_stop",
        ]) {
            expect(mapConfidence(type)).toBe("medium");
        }
    });

    it("maps city/locality results to low", () => {
        for (const type of [
            "city",
            "town",
            "village",
            "hamlet",
            "locality",
            "suburb",
            "country",
            "postcode",
        ]) {
            expect(mapConfidence(type)).toBe("low");
        }
    });

    it("falls back through addresstype -> type -> class", () => {
        expect(mapConfidence(null, "road", "highway")).toBe("medium");
        expect(mapConfidence(null, null, "building")).toBe("high");
    });

    it("treats unknown types as medium (a coordinate exists)", () => {
        expect(mapConfidence("water")).toBe("medium");
        expect(mapConfidence("natural")).toBe("medium");
    });

    it("returns none when nothing is provided", () => {
        expect(mapConfidence()).toBe("none");
        expect(mapConfidence(null, null, null)).toBe("none");
    });
});

describe("buildForwardCacheKey", () => {
    it("joins structured parts and normalizes them", () => {
        const key = buildForwardCacheKey({
            full_address: "herzl 12, tel aviv",
            street: "הרצל",
            house_number: "12",
            city: "תל אביב",
        });
        expect(key).toBe("fwd:12 הרצל תל אביב");
    });

    it("falls back to full_address when no structured parts exist", () => {
        const key = buildForwardCacheKey({
            full_address: "  Herzl 12, Tel-Aviv; ",
        });
        expect(key).toBe("fwd:herzl 12 tel aviv");
    });

    it("maps equivalent addresses to the same cache key", () => {
        const a = buildForwardCacheKey({
            full_address: "herzl 12, tel aviv",
            street: "הרצל",
            house_number: "12",
            city: "תל אביב",
        });
        const b = buildForwardCacheKey({
            full_address: "herzl 12, tel aviv",
            street: "  הרצל ",
            house_number: "12",
            city: "תל אביב",
        });
        expect(a).toBe(b);
    });
});

describe("buildReverseCacheKey", () => {
    it("formats coordinates to 5 decimal places", () => {
        expect(buildReverseCacheKey(31.91123456, 34.85123456)).toBe(
            "rev:31.91123,34.85123"
        );
    });

    it("is deterministic for the same point", () => {
        expect(buildReverseCacheKey(32.1, 34.9)).toBe(
            buildReverseCacheKey(32.1, 34.9)
        );
    });
});