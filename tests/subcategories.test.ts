import { describe, it, expect } from "vitest";
import {
    getSubcategoriesForCategory,
    matchesSubcategory,
    SUBCATEGORIES_BY_CATEGORY_SLUG,
} from "@/lib/data/subcategories";

describe("Subcategories & Filtering", () => {
    it("should provide subcategories for known categories", () => {
        const frozenSubs = getSubcategoriesForCategory("icecream-frozen");
        expect(frozenSubs.length).toBeGreaterThan(0);
        expect(frozenSubs.map((s) => s.id)).toContain("icecream");
        expect(frozenSubs.map((s) => s.id)).toContain("pastry");
        expect(frozenSubs.map((s) => s.id)).toContain("veggies-chips");
    });

    it("should match frozen items to their appropriate subcategories", () => {
        const frozenSubs = getSubcategoriesForCategory("icecream-frozen");
        const icecreamSub = frozenSubs.find((s) => s.id === "icecream")!;
        const pastrySub = frozenSubs.find((s) => s.id === "pastry")!;
        const veggiesSub = frozenSubs.find((s) => s.id === "veggies-chips")!;

        expect(matchesSubcategory("טילון קרמיסימו וניל", icecreamSub)).toBe(true);
        expect(matchesSubcategory("בורקס גבינה 800 גרם", pastrySub)).toBe(true);
        expect(matchesSubcategory("סנפרוסט אפונה ירוקה עדינה", veggiesSub)).toBe(true);
        expect(matchesSubcategory("ציפס 2 קילו תפוגן", veggiesSub)).toBe(true);
    });

    it("should match dairy items to dairy subcategories", () => {
        const dairySubs = getSubcategoriesForCategory("dairy-cheese-eggs");
        const milkSub = dairySubs.find((s) => s.id === "milk")!;
        const cheeseSub = dairySubs.find((s) => s.id === "cheese")!;
        const eggsSub = dairySubs.find((s) => s.id === "eggs")!;

        expect(matchesSubcategory("חלב תנובה 3%", milkSub)).toBe(true);
        expect(matchesSubcategory("גבינה צהובה עמק 28%", cheeseSub)).toBe(true);
        expect(matchesSubcategory("ביצים L תבנית 30", eggsSub)).toBe(true);
    });

    it("should handle unknown categories gracefully", () => {
        expect(getSubcategoriesForCategory("non-existent-cat")).toEqual([]);
    });
});
