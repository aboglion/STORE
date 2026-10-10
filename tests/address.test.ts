import { describe, expect, it } from "vitest";
import {
    composeAddressLine,
    normalizeAddress,
} from "@/lib/utils/address";
import { orderLocationStatus } from "@/lib/utils/location";

describe("normalizeAddress", () => {
    it("trims and lowercases", () => {
        expect(normalizeAddress("  הרצל  12, תל אביב ")).toBe(
            "הרצל 12 תל אביב"
        );
    });

    it("collapses repeated whitespace", () => {
        expect(normalizeAddress("הרצל    12   תל אביב")).toBe(
            "הרצל 12 תל אביב"
        );
    });

    it("strips commas, dots and quotes", () => {
        expect(normalizeAddress("רח' הרצל 12, ת\"א")).toBe(
            "רח הרצל 12 ת א"
        );
    });

    it("strips English punctuation", () => {
        expect(normalizeAddress("Herzl 12, Tel-Aviv; apartment 3.")).toBe(
            "herzl 12 tel aviv apartment 3"
        );
    });

    it("maps equivalent addresses to the same key", () => {
        const a = normalizeAddress('  הרצל   12, תל אביב ');
        const b = normalizeAddress("הרצל 12 תל אביב");
        expect(a).toBe(b);
    });
});

describe("composeAddressLine", () => {
    it("joins parts when available", () => {
        expect(
            composeAddressLine({
                full_address: "herzl 12",
                street: "הרצל",
                house_number: "12",
                entrance: "א",
                apartment: "4",
                city: "תל אביב",
            })
        ).toBe("הרצל 12 כניסה א דירה 4 תל אביב");
    });

    it("falls back to full_address when no parts exist", () => {
        expect(
            composeAddressLine({ full_address: "כתובת חופשית" })
        ).toBe("כתובת חופשית");
    });
});


describe("orderLocationStatus", () => {
    it("returns missing when the snapshot has no coordinates", () => {
        expect(orderLocationStatus(null)).toBe("missing");
        expect(
            orderLocationStatus({
                full_address: "x",
                normalized_address: "x",
            })
        ).toBe("missing");
        expect(
            orderLocationStatus({
                full_address: "x",
                normalized_address: "x",
                lat: null,
                lng: null,
            })
        ).toBe("missing");
    });

    it("returns imprecise for low-confidence coordinates", () => {
        expect(
            orderLocationStatus({
                full_address: "x",
                normalized_address: "x",
                lat: 31.9,
                lng: 34.8,
                location_confidence: "low",
            })
        ).toBe("imprecise");
    });

    it("returns ok for high/medium confidence coordinates", () => {
        expect(
            orderLocationStatus({
                full_address: "x",
                normalized_address: "x",
                lat: 31.9,
                lng: 34.8,
                location_confidence: "high",
            })
        ).toBe("ok");
        expect(
            orderLocationStatus({
                full_address: "x",
                normalized_address: "x",
                lat: 31.9,
                lng: 34.8,
                location_confidence: "medium",
            })
        ).toBe("ok");
        expect(
            orderLocationStatus({
                full_address: "x",
                normalized_address: "x",
                lat: 31.9,
                lng: 34.8,
            })
        ).toBe("ok");
    });
});
