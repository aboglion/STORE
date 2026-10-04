import { describe, expect, it } from "vitest";
import {
    agorotToShekelInput,
    formatILS,
    shekelInputToAgorot,
    shekelsToAgorot,
} from "@/lib/utils/currency";

describe("money math (agorot <-> shekels)", () => {
    it("parses shekel input to agorot", () => {
        expect(shekelInputToAgorot("12.50")).toBe(1250);
        expect(shekelInputToAgorot("12")).toBe(1200);
        expect(shekelInputToAgorot("0.01")).toBe(1);
        expect(shekelInputToAgorot("12,5")).toBe(1250);
    });

    it("rejects invalid input", () => {
        expect(shekelInputToAgorot("abc")).toBeNull();
        expect(shekelInputToAgorot("-5")).toBeNull();
        expect(shekelInputToAgorot("12.345")).toBeNull();
        expect(shekelInputToAgorot("")).toBeNull();
    });

    it("converts shekels to agorot with rounding", () => {
        expect(shekelsToAgorot(12.5)).toBe(1250);
        expect(shekelsToAgorot(12.345)).toBe(1235);
        expect(shekelsToAgorot(0)).toBe(0);
    });

    it("formats agorot as ILS", () => {
        expect(formatILS(1250)).toBe("12.50 ₪");
        expect(formatILS(0)).toBe("0.00 ₪");
        expect(formatILS(100)).toBe("1.00 ₪");
    });

    it("converts agorot to shekel input string", () => {
        expect(agorotToShekelInput(1250)).toBe("12.50");
        expect(agorotToShekelInput(1200)).toBe("12");
        expect(agorotToShekelInput(0)).toBe("0");
    });
});