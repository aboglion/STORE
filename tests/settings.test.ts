import { describe, expect, it } from "vitest";
import {
    DEFAULT_STORE_THEME,
    STORE_THEMES,
    STORE_THEME_KEYS,
} from "@/lib/theme";
import { settingsFormSchema } from "@/lib/validations/settings";

/** Stub translate function for schema factories (returns the key itself). */
const t = (key: string) => key;

describe("store themes configuration", () => {
    it("defines valid default store theme", () => {
        expect(STORE_THEME_KEYS).toContain(DEFAULT_STORE_THEME);
        expect(DEFAULT_STORE_THEME).toBe("caramel");
    });

    it("has metadata and valid hex swatches for every theme", () => {
        for (const key of STORE_THEME_KEYS) {
            const theme = STORE_THEMES[key];
            expect(theme).toBeDefined();
            expect(theme.label).toBeTruthy();
            expect(theme.description).toBeTruthy();
            expect(theme.swatches).toHaveLength(2);
            expect(theme.swatches[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(theme.swatches[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });
});

describe("settings form validation schema", () => {
    it("accepts valid settings data with all fields", () => {
        const valid = {
            store_name: "מאפיית הבוטיק",
            store_name_ar: "مخبز البوتيك",
            logo_url: "logos/store-logo.png",
            theme: "forest",
            delivery_fee_shekels: "15.00",
            free_delivery_threshold_shekels: "150.00",
            low_stock_threshold_default: 5,
            contact_phone: "03-5551234",
        };

        const result = settingsFormSchema(t).safeParse(valid);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.store_name).toBe("מאפיית הבוטיק");
            expect(result.data.store_name_ar).toBe("مخبز البوتيك");
            expect(result.data.theme).toBe("forest");
            expect(result.data.logo_url).toBe("logos/store-logo.png");
        }
    });

    it("applies defaults for optional fields", () => {
        const minimal = {
            store_name: "חנות חדשה",
            delivery_fee_shekels: "10",
            free_delivery_threshold_shekels: "200",
            low_stock_threshold_default: 3,
        };

        const result = settingsFormSchema(t).safeParse(minimal);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.theme).toBe("caramel");
            expect(result.data.logo_url).toBe("");
            expect(result.data.contact_phone).toBe("");
            expect(result.data.store_name_ar).toBe("");
        }
    });

    it("accepts all valid theme keys", () => {
        for (const theme of STORE_THEME_KEYS) {
            const result = settingsFormSchema(t).safeParse({
                store_name: "בדיקה",
                theme,
                delivery_fee_shekels: "0",
                free_delivery_threshold_shekels: "100",
                low_stock_threshold_default: 0,
            });
            expect(result.success).toBe(true);
        }
    });

    it("rejects invalid theme key", () => {
        const result = settingsFormSchema(t).safeParse({
            store_name: "בדיקה",
            theme: "neon_rainbow",
            delivery_fee_shekels: "15",
            free_delivery_threshold_shekels: "100",
            low_stock_threshold_default: 5,
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty store name", () => {
        const result = settingsFormSchema(t).safeParse({
            store_name: "   ",
            delivery_fee_shekels: "15",
            free_delivery_threshold_shekels: "100",
            low_stock_threshold_default: 5,
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid fee format", () => {
        const invalidFees = ["abc", "-10", "12.345", "10,20,30"];
        for (const fee of invalidFees) {
            const result = settingsFormSchema(t).safeParse({
                store_name: "חנות",
                delivery_fee_shekels: fee,
                free_delivery_threshold_shekels: "100",
                low_stock_threshold_default: 5,
            });
            expect(result.success).toBe(false);
        }
    });

    it("rejects negative low stock threshold", () => {
        const result = settingsFormSchema(t).safeParse({
            store_name: "חנות",
            delivery_fee_shekels: "15",
            free_delivery_threshold_shekels: "100",
            low_stock_threshold_default: -1,
        });
        expect(result.success).toBe(false);
    });
});
