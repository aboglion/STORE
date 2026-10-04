import { describe, expect, it } from "vitest";
import {
    formatIsraeliPhone,
    isValidIsraeliPhone,
    normalizeIsraeliPhone,
} from "@/lib/utils/phone";

describe("normalizeIsraeliPhone", () => {
    it("normalizes 0501234567 to +972501234567", () => {
        expect(normalizeIsraeliPhone("0501234567")).toBe("+972501234567");
    });

    it("normalizes dash-separated numbers", () => {
        expect(normalizeIsraeliPhone("050-123-4567")).toBe("+972501234567");
    });

    it("normalizes already-formatted E.164 numbers", () => {
        expect(normalizeIsraeliPhone("+972501234567")).toBe("+972501234567");
    });

    it("normalizes numbers with spaces and parens", () => {
        expect(normalizeIsraeliPhone("+972 50 123 4567")).toBe("+972501234567");
    });

    it("handles landline numbers", () => {
        expect(normalizeIsraeliPhone("03-1234567")).toBe("+97231234567");
    });

    it("rejects empty input", () => {
        expect(normalizeIsraeliPhone("")).toBeNull();
    });

    it("rejects non-Israeli numbers", () => {
        expect(normalizeIsraeliPhone("+15551234567")).toBeNull();
    });

    it("rejects invalid short numbers", () => {
        expect(normalizeIsraeliPhone("123")).toBeNull();
    });
});

describe("isValidIsraeliPhone", () => {
    it("returns true for valid numbers", () => {
        expect(isValidIsraeliPhone("0501234567")).toBe(true);
        expect(isValidIsraeliPhone("+972501234567")).toBe(true);
    });

    it("returns false for invalid numbers", () => {
        expect(isValidIsraeliPhone("abc")).toBe(false);
        expect(isValidIsraeliPhone("+1999")).toBe(false);
    });
});

describe("formatIsraeliPhone", () => {
    it("formats mobile numbers", () => {
        expect(formatIsraeliPhone("+972501234567")).toBe("050-123-4567");
    });

    it("formats landline numbers", () => {
        expect(formatIsraeliPhone("+97231234567")).toBe("03-123-4567");
    });

    it("returns input unchanged when format is unexpected", () => {
        expect(formatIsraeliPhone("050-123-4567")).toBe("050-123-4567");
    });
});