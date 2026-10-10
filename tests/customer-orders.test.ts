import { describe, expect, it } from "vitest";
import he from "../messages/he.json";
import ar from "../messages/ar.json";
import {
    CUSTOMER_STATUS_DESCRIPTIONS,
    NEXT_LOGICAL_STATUS,
    NEXT_STATUS_ACTION_LABELS,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_STEPS,
    ORDER_STATUS_TRANSITIONS,
} from "@/lib/constants";
import {
    cancelOrderSchema,
    orderStatusSchema,
    updateOrderStatusSchema,
} from "@/lib/validations/order";
import { normalizeIsraeliPhone } from "@/lib/utils/phone";
import { localizedText } from "@/lib/i18n/config";
import type { OrderStatus } from "@/types/database.types";

type MessageTree = { [key: string]: string | MessageTree };

function resolveKey(obj: unknown, path: string): string | undefined {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
        if (!current || typeof current !== "object") return undefined;
        current = (current as MessageTree)[part];
    }
    return typeof current === "string" ? current : undefined;
}

describe("Customer Orders Tracking & Lookup Validation", () => {
    it("normalizes and sanitizes phone numbers for customer lookup", () => {
        expect(normalizeIsraeliPhone("050-123-4567")).toBe("+972501234567");
        expect(normalizeIsraeliPhone("052 987 6543")).toBe("+972529876543");
        expect(normalizeIsraeliPhone("+972-54-111-2233")).toBe("+972541112233");
        expect(normalizeIsraeliPhone("0581234567")).toBe("+972581234567");
        expect(normalizeIsraeliPhone("02-6543210")).toBe("+97226543210");

        // Invalid phone numbers
        expect(normalizeIsraeliPhone("")).toBeNull();
        expect(normalizeIsraeliPhone("12345")).toBeNull();
        expect(normalizeIsraeliPhone("invalid-phone")).toBeNull();
    });

    it("sanitizes digits for phone search regex query", () => {
        const rawPhones = [
            "050-123-4567",
            "050 123 4567",
            "(050) 123-4567",
            "+972-50-1234567",
        ];
        for (const raw of rawPhones) {
            const digits = raw.replace(/\D+/g, "");
            expect(digits.length).toBeGreaterThanOrEqual(10);
            expect(digits).not.toMatch(/\s|-|\(|\)/);
        }
    });

    it("generates correct QR tracking URL format for customer barcode", () => {
        const orderNumber = "20261010-000042";
        const siteUrl = "https://example.com";
        const trackingUrl = `${siteUrl}/orders?order=${encodeURIComponent(orderNumber)}`;

        expect(trackingUrl).toBe("https://example.com/orders?order=20261010-000042");

        const parsed = new URL(trackingUrl);
        expect(parsed.pathname).toBe("/orders");
        expect(parsed.searchParams.get("order")).toBe(orderNumber);
    });

    it("handles order numbers with special characters safely in URL query", () => {
        const specialOrderNumber = "ORD #123/2026";
        const siteUrl = "https://example.com";
        const trackingUrl = `${siteUrl}/orders?order=${encodeURIComponent(specialOrderNumber)}`;

        const parsed = new URL(trackingUrl);
        expect(parsed.searchParams.get("order")).toBe(specialOrderNumber);
    });
});

describe("Order Status Workflow & Transitions", () => {
    it("validates all possible order status enum values", () => {
        const validStatuses: OrderStatus[] = [
            "pending",
            "confirmed",
            "preparing",
            "out_for_delivery",
            "delivered",
            "canceled",
        ];

        for (const status of validStatuses) {
            expect(orderStatusSchema.safeParse(status).success).toBe(true);
        }

        expect(orderStatusSchema.safeParse("unknown").success).toBe(false);
        expect(orderStatusSchema.safeParse("").success).toBe(false);
        expect(orderStatusSchema.safeParse(123).success).toBe(false);
    });

    it("validates admin order status update payloads", () => {
        const validPayload = {
            order_id: "a0000000-0000-0000-0000-000000000001",
            to_status: "preparing",
            note: "החל תהליך הכנה במטבח",
        };
        const parsed = updateOrderStatusSchema.safeParse(validPayload);
        expect(parsed.success).toBe(true);

        // Invalid UUID
        expect(
            updateOrderStatusSchema.safeParse({
                ...validPayload,
                order_id: "not-a-uuid",
            }).success
        ).toBe(false);

        // Invalid status
        expect(
            updateOrderStatusSchema.safeParse({
                ...validPayload,
                to_status: "shipped",
            }).success
        ).toBe(false);

        // Note exceeding 500 characters
        expect(
            updateOrderStatusSchema.safeParse({
                ...validPayload,
                note: "x".repeat(501),
            }).success
        ).toBe(false);
    });

    it("validates order cancellation schema", () => {
        const valid = cancelOrderSchema.safeParse({
            order_id: "a0000000-0000-0000-0000-000000000001",
            note: "בוטל לבקשת הלקוח",
        });
        expect(valid.success).toBe(true);
    });

    it("enforces allowed status transitions logic", () => {
        expect(ORDER_STATUS_TRANSITIONS.pending).toEqual(["confirmed", "canceled"]);
        expect(ORDER_STATUS_TRANSITIONS.confirmed).toEqual(["preparing", "canceled"]);
        expect(ORDER_STATUS_TRANSITIONS.preparing).toEqual(["out_for_delivery", "canceled"]);
        expect(ORDER_STATUS_TRANSITIONS.out_for_delivery).toEqual(["delivered"]);
        expect(ORDER_STATUS_TRANSITIONS.delivered).toEqual([]);
        expect(ORDER_STATUS_TRANSITIONS.canceled).toEqual([]);
    });

    it("maps linear step progression in order timeline", () => {
        expect(ORDER_STATUS_STEPS).toEqual([
            "pending",
            "confirmed",
            "preparing",
            "out_for_delivery",
            "delivered",
        ]);

        ORDER_STATUS_STEPS.forEach((step, idx) => {
            const currentStepIndex = ORDER_STATUS_STEPS.indexOf(step);
            expect(currentStepIndex).toBe(idx);
            const progressPercent = (currentStepIndex / (ORDER_STATUS_STEPS.length - 1)) * 100;
            expect(progressPercent).toBeGreaterThanOrEqual(0);
            expect(progressPercent).toBeLessThanOrEqual(100);
        });

        // Cancelled order is not part of the standard forward progress steps
        expect(ORDER_STATUS_STEPS.includes("canceled")).toBe(false);
    });

    it("maps logical next status for quick status updating", () => {
        expect(NEXT_LOGICAL_STATUS.pending).toBe("confirmed");
        expect(NEXT_LOGICAL_STATUS.confirmed).toBe("preparing");
        expect(NEXT_LOGICAL_STATUS.preparing).toBe("out_for_delivery");
        expect(NEXT_LOGICAL_STATUS.out_for_delivery).toBe("delivered");
        expect(NEXT_LOGICAL_STATUS.delivered).toBeUndefined();
    });
});

describe("Order Localization & Translation Parity", () => {
    const allStatuses: OrderStatus[] = [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "canceled",
    ];

    it("has valid Hebrew and Arabic translations for all ORDER_STATUS_LABELS", () => {
        for (const status of allStatuses) {
            const key = ORDER_STATUS_LABELS[status];
            expect(key).toBeDefined();

            const heText = resolveKey(he, key);
            const arText = resolveKey(ar, key);

            expect(heText, `Missing Hebrew for ${key}`).toBeTruthy();
            expect(arText, `Missing Arabic for ${key}`).toBeTruthy();
            expect(heText?.trim().length).toBeGreaterThan(0);
            expect(arText?.trim().length).toBeGreaterThan(0);
        }
    });

    it("has valid Hebrew and Arabic translations for all CUSTOMER_STATUS_DESCRIPTIONS", () => {
        for (const status of allStatuses) {
            const desc = CUSTOMER_STATUS_DESCRIPTIONS[status];
            expect(desc).toBeDefined();

            const heTitle = resolveKey(he, desc.titleKey);
            const arTitle = resolveKey(ar, desc.titleKey);
            const heSubtitle = resolveKey(he, desc.subtitleKey);
            const arSubtitle = resolveKey(ar, desc.subtitleKey);

            expect(heTitle, `Missing Hebrew title for ${desc.titleKey}`).toBeTruthy();
            expect(arTitle, `Missing Arabic title for ${desc.titleKey}`).toBeTruthy();
            expect(heSubtitle, `Missing Hebrew subtitle for ${desc.subtitleKey}`).toBeTruthy();
            expect(arSubtitle, `Missing Arabic subtitle for ${desc.subtitleKey}`).toBeTruthy();
        }
    });

    it("has valid Hebrew and Arabic translations for all NEXT_STATUS_ACTION_LABELS", () => {
        const statuses = Object.keys(NEXT_STATUS_ACTION_LABELS) as OrderStatus[];
        for (const s of statuses) {
            const key = NEXT_STATUS_ACTION_LABELS[s];
            if (!key) continue;

            const heText = resolveKey(he, key);
            const arText = resolveKey(ar, key);

            expect(heText, `Missing Hebrew action for ${key}`).toBeTruthy();
            expect(arText, `Missing Arabic action for ${key}`).toBeTruthy();
        }
    });

    it("has essential orders translation keys in both languages", () => {
        const requiredOrdersKeys = [
            "orders.title",
            "orders.description",
            "orders.myOrders",
            "orders.searchByPhone",
            "orders.noRecentOrders",
            "orders.findOrder",
            "orders.phone",
            "orders.customerName",
            "orders.searchOrder",
            "orders.track",
            "orders.showQr",
            "orders.orderedItems",
            "orders.totalToPay",
        ];

        for (const key of requiredOrdersKeys) {
            const heVal = resolveKey(he, key);
            const arVal = resolveKey(ar, key);
            expect(heVal, `Missing Hebrew key ${key}`).toBeTruthy();
            expect(arVal, `Missing Arabic key ${key}`).toBeTruthy();
        }
    });

    it("has essential QR barcode translation keys in both languages", () => {
        const requiredQrKeys = [
            "qr.title",
            "qr.hint",
            "qr.download",
            "qr.copyLink",
            "qr.copied",
            "qr.viewTrack",
        ];

        for (const key of requiredQrKeys) {
            const heVal = resolveKey(he, key);
            const arVal = resolveKey(ar, key);
            expect(heVal, `Missing Hebrew QR key ${key}`).toBeTruthy();
            expect(arVal, `Missing Arabic QR key ${key}`).toBeTruthy();
        }
    });

    it("localizes order item snapshots with fallback to Hebrew", () => {
        const heSnapshot = "עוגת שוקולד חמה";
        const arSnapshot = "كعكة الشوكولاتة الساخنة";

        // Hebrew locale always gets Hebrew snapshot
        expect(localizedText("he", heSnapshot, arSnapshot)).toBe(heSnapshot);
        expect(localizedText("he", heSnapshot, null)).toBe(heSnapshot);

        // Arabic locale gets Arabic snapshot when available
        expect(localizedText("ar", heSnapshot, arSnapshot)).toBe(arSnapshot);

        // Arabic locale falls back to Hebrew if Arabic is null or whitespace
        expect(localizedText("ar", heSnapshot, null)).toBe(heSnapshot);
        expect(localizedText("ar", heSnapshot, "")).toBe(heSnapshot);
        expect(localizedText("ar", heSnapshot, "   ")).toBe(heSnapshot);
    });
});
