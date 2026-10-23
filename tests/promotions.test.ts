import { describe, expect, it } from "vitest";

import {
    computeCartPricing,
    describePromotion,
    isPromotionActive,
    toPromotionSnapshot,
    type CartPricingLine,
} from "@/lib/promotions/engine";
import type { Promotion } from "@/types/database.types";

const SETTINGS = {
    delivery_fee_agorot: 1500,
    free_delivery_threshold_agorot: 20000,
};

function promo(overrides: Partial<Promotion>): Promotion {
    return {
        id: "p1",
        name_he: "מבצע",
        name_ar: null,
        type: "multi_buy",
        is_active: true,
        starts_at: null,
        ends_at: null,
        scope_type: "all",
        category_id: null,
        product_ids: [],
        config: {},
        image_path: null,
        sort_order: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

function line(overrides: Partial<CartPricingLine>): CartPricingLine {
    return {
        product_id: "prod-1",
        quantity: 1,
        unit_price_agorot: 1000,
        category_id: "cat-1",
        ...overrides,
    };
}

describe("promotion engine — multi-buy (buy X get Y)", () => {
    it("grants Y free units per group of X+Y", () => {
        const result = computeCartPricing(
            [line({ quantity: 4, unit_price_agorot: 1000 })],
            [
                promo({
                    type: "multi_buy",
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
                }),
            ],
            SETTINGS
        );
        // 4 units × 10₪ = 40₪, 1 free → 30₪
        expect(result.subtotal_agorot).toBe(4000);
        expect(result.discount_agorot).toBe(1000);
        expect(result.total_agorot).toBe(4000 - 1000 + 1500);
        expect(result.applied).toHaveLength(1);
        expect(result.applied[0].discount_agorot).toBe(1000);
    });

    it("scales with multiple groups", () => {
        const result = computeCartPricing(
            [line({ quantity: 8, unit_price_agorot: 1000 })],
            [
                promo({
                    type: "multi_buy",
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
                }),
            ],
            SETTINGS
        );
        // 8 units → 2 groups of 4 → 2 free → 6 paid
        expect(result.discount_agorot).toBe(2000);
    });

    it("applies partial discount when the group is not complete", () => {
        const result = computeCartPricing(
            [line({ quantity: 3, unit_price_agorot: 1000 })],
            [
                promo({
                    type: "multi_buy",
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
                }),
            ],
            SETTINGS
        );
        // 3 units < 4 → no free unit
        expect(result.discount_agorot).toBe(0);
    });

    it("supports a discount percent below 100", () => {
        const result = computeCartPricing(
            [line({ quantity: 4, unit_price_agorot: 1000 })],
            [
                promo({
                    type: "multi_buy",
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 50 },
                }),
            ],
            SETTINGS
        );
        // 1 granted unit at 50% off → 500 agorot
        expect(result.discount_agorot).toBe(500);
    });
});

describe("promotion engine — price deal", () => {
    it("charges the deal price instead of the regular price", () => {
        const result = computeCartPricing(
            [line({ quantity: 2, unit_price_agorot: 1000 })],
            [
                promo({
                    type: "price_deal",
                    config: { deal_price_agorot: 700 },
                }),
            ],
            SETTINGS
        );
        // 2 × (10₪ - 7₪) = 6₪ discount
        expect(result.discount_agorot).toBe(600);
        expect(result.total_agorot).toBe(2000 - 600 + 1500);
    });

    it("ignores deals priced above the regular price", () => {
        const result = computeCartPricing(
            [line({ unit_price_agorot: 500 })],
            [
                promo({
                    type: "price_deal",
                    config: { deal_price_agorot: 700 },
                }),
            ],
            SETTINGS
        );
        expect(result.discount_agorot).toBe(0);
    });

    it("uses the configured original price instead of the live product price", () => {
        const description = describePromotion(
            promo({
                type: "price_deal",
                config: { deal_price_agorot: 700, original_price_agorot: 1250 },
            }),
            2000
        );
        expect(description.description_he).toContain("12.50 ₪");
        expect(description.description_he).toContain("7 ₪");
        expect(description.description_he).not.toContain("20 ₪");
    });
});

describe("promotion engine — free shipping", () => {
    it("waives delivery when the minimum quantity is met", () => {
        const result = computeCartPricing(
            [line({ quantity: 3 })],
            [
                promo({
                    type: "free_shipping",
                    config: { min_quantity: 3 },
                }),
            ],
            SETTINGS
        );
        expect(result.free_shipping).toBe(true);
        expect(result.delivery_fee_agorot).toBe(0);
    });

    it("keeps delivery when the minimum quantity is not met", () => {
        const result = computeCartPricing(
            [line({ quantity: 2 })],
            [
                promo({
                    type: "free_shipping",
                    config: { min_quantity: 3 },
                }),
            ],
            SETTINGS
        );
        expect(result.free_shipping).toBe(false);
        expect(result.delivery_fee_agorot).toBe(1500);
    });

    it("waives delivery when the minimum subtotal is met", () => {
        const result = computeCartPricing(
            [line({ quantity: 1, unit_price_agorot: 15000 })],
            [
                promo({
                    type: "free_shipping",
                    config: { min_subtotal_agorot: 10000 },
                }),
            ],
            SETTINGS
        );
        expect(result.free_shipping).toBe(true);
        expect(result.delivery_fee_agorot).toBe(0);
    });
});

describe("promotion engine — delivery threshold", () => {
    it("waives delivery above the free-delivery threshold", () => {
        const result = computeCartPricing(
            [line({ quantity: 1, unit_price_agorot: 25000 })],
            [],
            SETTINGS
        );
        expect(result.delivery_fee_agorot).toBe(0);
    });

    it("charges delivery below the threshold", () => {
        const result = computeCartPricing(
            [line({ quantity: 1, unit_price_agorot: 5000 })],
            [],
            SETTINGS
        );
        expect(result.delivery_fee_agorot).toBe(1500);
    });
});

describe("promotion engine — scope", () => {
    it("applies category-scoped promotions only to that category", () => {
        const result = computeCartPricing(
            [
                line({ product_id: "a", category_id: "cat-1", quantity: 4, unit_price_agorot: 1000 }),
                line({ product_id: "b", category_id: "cat-2", quantity: 4, unit_price_agorot: 1000 }),
            ],
            [
                promo({
                    type: "multi_buy",
                    scope_type: "category",
                    category_id: "cat-1",
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
                }),
            ],
            SETTINGS
        );
        expect(result.discount_agorot).toBe(1000);
    });

    it("applies product-scoped promotions only to the selected products", () => {
        const result = computeCartPricing(
            [
                line({ product_id: "a", quantity: 4, unit_price_agorot: 1000 }),
                line({ product_id: "b", quantity: 4, unit_price_agorot: 1000 }),
            ],
            [
                promo({
                    type: "multi_buy",
                    scope_type: "products",
                    product_ids: ["a"],
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
                }),
            ],
            SETTINGS
        );
        expect(result.discount_agorot).toBe(1000);
    });
});

describe("promotion engine — activation", () => {
    it("ignores inactive promotions", () => {
        const result = computeCartPricing(
            [line({ quantity: 4, unit_price_agorot: 1000 })],
            [
                promo({
                    is_active: false,
                    type: "multi_buy",
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
                }),
            ],
            SETTINGS
        );
        expect(result.discount_agorot).toBe(0);
    });

    it("ignores promotions outside their date range", () => {
        const now = new Date("2026-06-01T00:00:00Z");
        const future = promo({
            type: "multi_buy",
            starts_at: "2026-07-01T00:00:00Z",
            config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
        });
        const past = promo({
            type: "multi_buy",
            ends_at: "2026-05-01T00:00:00Z",
            config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
        });
        expect(isPromotionActive(future, now)).toBe(false);
        expect(isPromotionActive(past, now)).toBe(false);
    });

    it("activates promotions inside their date range", () => {
        const now = new Date("2026-06-01T00:00:00Z");
        const active = promo({
            type: "multi_buy",
            starts_at: "2026-05-01T00:00:00Z",
            ends_at: "2026-07-01T00:00:00Z",
            config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
        });
        expect(isPromotionActive(active, now)).toBe(true);
    });
});

describe("promotion engine — snapshot", () => {
    it("converts applied promotions into a frozen receipt snapshot", () => {
        const result = computeCartPricing(
            [line({ quantity: 4, unit_price_agorot: 1000 })],
            [
                promo({
                    type: "multi_buy",
                    config: { buy_quantity: 3, get_quantity: 1, discount_percent: 100 },
                }),
            ],
            SETTINGS
        );
        const snapshot = toPromotionSnapshot(result.applied);
        expect(snapshot).toHaveLength(1);
        expect(snapshot[0].promotion_id).toBe("p1");
        expect(snapshot[0].discount_agorot).toBe(1000);
        expect(snapshot[0].description_he).toContain("קנה 3");
    });
});