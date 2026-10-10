import { describe, expect, it } from "vitest";

import {
    findIsraelCity,
    ISRAEL_CITIES,
    searchIsraelCities,
} from "@/lib/data/israel-cities";

describe("ISRAEL_CITIES dataset", () => {
    it("is a comprehensive list of settlements", () => {
        expect(ISRAEL_CITIES.length).toBeGreaterThanOrEqual(500);
    });

    it("has no duplicate Hebrew names", () => {
        const names = ISRAEL_CITIES.map((c) => c.nameHe);
        expect(new Set(names).size).toBe(names.length);
    });

    it("keeps coordinates mostly unique (adjacent settlements may share a rounded centroid)", () => {
        const coords = ISRAEL_CITIES.map((c) => `${c.lat},${c.lng}`);
        const unique = new Set(coords).size;
        // Allow a small number of collisions from rounded approximate centroids.
        expect(coords.length - unique).toBeLessThanOrEqual(15);
    });

    it("keeps every settlement within Israel bounds", () => {
        for (const city of ISRAEL_CITIES) {
            expect(city.lat, city.nameHe).toBeGreaterThanOrEqual(29.4);
            expect(city.lat, city.nameHe).toBeLessThanOrEqual(33.5);
            expect(city.lng, city.nameHe).toBeGreaterThanOrEqual(34.0);
            expect(city.lng, city.nameHe).toBeLessThanOrEqual(36.0);
        }
    });

    it("has non-empty Hebrew and Arabic names", () => {
        for (const city of ISRAEL_CITIES) {
            expect(city.nameHe.trim().length, city.nameHe).toBeGreaterThan(0);
            expect(city.nameAr.trim().length, city.nameHe).toBeGreaterThan(0);
        }
    });
});

describe("searchIsraelCities", () => {
    it("matches by exact Hebrew name", () => {
        const results = searchIsraelCities("נצרת", 1);
        expect(results[0]?.nameHe).toBe("נצרת");
    });

    it("matches by exact Arabic name", () => {
        const results = searchIsraelCities("الناصرة", 1);
        expect(results[0]?.nameHe).toBe("נצרת");
    });

    it("matches by alias", () => {
        const results = searchIsraelCities("תל אביב", 1);
        expect(results[0]?.nameHe).toBe("תל אביב - יפו");
    });

    it("matches by prefix", () => {
        const results = searchIsraelCities("באר", 5);
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((c) => c.nameHe.startsWith("באר"))).toBe(true);
    });

    it("returns the top settlements when the query is empty", () => {
        const results = searchIsraelCities("", 5);
        expect(results.length).toBe(5);
    });

    it("returns no results for a non-existent settlement", () => {
        expect(searchIsraelCities("אטלנטיס", 5)).toHaveLength(0);
    });
});

describe("findIsraelCity", () => {
    it("finds a city by Hebrew name", () => {
        expect(findIsraelCity("חיפה")?.nameHe).toBe("חיפה");
    });

    it("finds a city by Arabic name", () => {
        expect(findIsraelCity("بئر السبع")?.nameHe).toBe("באר שבע");
    });

    it("returns null for empty or unknown input", () => {
        expect(findIsraelCity("")).toBeNull();
        expect(findIsraelCity("   ")).toBeNull();
        expect(findIsraelCity("אין כזה יישוב")).toBeNull();
    });
});
