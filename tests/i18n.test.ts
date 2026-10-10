import { describe, expect, it } from "vitest";
import he from "../messages/he.json";
import ar from "../messages/ar.json";
import {
    DEFAULT_LOCALE,
    detectLocale,
    isLocale,
    localizedText,
} from "@/lib/i18n/config";

type MessageTree = { [key: string]: string | MessageTree };

function flattenKeys(obj: MessageTree, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "string") return [path];
        return flattenKeys(value as MessageTree, path);
    });
}

describe("i18n configuration", () => {
    it("detects Arabic from Accept-Language and Hebrew otherwise", () => {
        expect(detectLocale("ar,en;q=0.9")).toBe("ar");
        expect(detectLocale("ar-IL,en;q=0.8")).toBe("ar");
        expect(detectLocale("he-IL,en;q=0.9")).toBe("he");
        expect(detectLocale("en-US,en;q=0.9")).toBe("he");
        expect(detectLocale(null)).toBe(DEFAULT_LOCALE);
        expect(detectLocale(undefined)).toBe(DEFAULT_LOCALE);
    });

    it("validates locale values", () => {
        expect(isLocale("he")).toBe(true);
        expect(isLocale("ar")).toBe(true);
        expect(isLocale("fr")).toBe(false);
        expect(isLocale(undefined)).toBe(false);
    });

    it("localizedText picks Arabic with Hebrew fallback", () => {
        expect(localizedText("he", "עברית", "عربية")).toBe("עברית");
        expect(localizedText("ar", "עברית", "عربية")).toBe("عربية");
        expect(localizedText("ar", "עברית", "")).toBe("עברית");
        expect(localizedText("ar", "עברית", null)).toBe("עברית");
        expect(localizedText("ar", "עברית", "   ")).toBe("עברית");
    });
});

describe("message dictionaries", () => {
    it("he.json and ar.json have identical key sets", () => {
        const heKeys = flattenKeys(he as MessageTree).sort();
        const arKeys = flattenKeys(ar as MessageTree).sort();

        expect(heKeys).toEqual(arKeys);
    });

    it("includes required cart and product localization keys in both languages", () => {
        expect(he.cart).toHaveProperty("perUnit");
        expect(ar.cart).toHaveProperty("perUnit");
        expect(he.cart.perUnit).toBe("ליחידה");
        expect(ar.cart.perUnit).toBe("للقطعة");

        expect(he.cart).toHaveProperty("includingVat");
        expect(ar.cart).toHaveProperty("includingVat");
        expect(he.cart).toHaveProperty("vatNotice");
        expect(ar.cart).toHaveProperty("vatNotice");

        expect(he.product).toHaveProperty("perUnit");
        expect(ar.product).toHaveProperty("perUnit");

        expect(he.admin.products).toHaveProperty("active");
        expect(ar.admin.products).toHaveProperty("active");
        expect(he.admin.products).toHaveProperty("inactive");
        expect(ar.admin.products).toHaveProperty("inactive");
    });

    it("every Arabic value is a non-empty string", () => {
        const arKeys = flattenKeys(ar as MessageTree);
        for (const key of arKeys) {
            const value = key
                .split(".")
                .reduce<unknown>((acc, part) => (acc as MessageTree)?.[part], ar);
            expect(typeof value).toBe("string");
            expect((value as string).trim().length).toBeGreaterThan(0);
        }
    });
});
