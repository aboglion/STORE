import { describe, expect, it } from "vitest";
import {
    CUSTOMER_STATUS_DESCRIPTIONS,
    NEXT_LOGICAL_STATUS,
    NEXT_STATUS_ACTION_LABELS,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_STEPS,
    PAYMENT_METHOD_LABELS,
    PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import { checkoutSchema, checkoutPayloadSchema } from "@/lib/validations/checkout";
import type { OrderStatus } from "@/types/database.types";

/** Stub translate function for schema factories (returns the key itself). */
const t = (key: string) => key;

describe("order statuses and workflow definitions", () => {
    const allStatuses: OrderStatus[] = [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "canceled",
    ];

    it("has message keys for all order statuses", () => {
        for (const s of allStatuses) {
            expect(ORDER_STATUS_LABELS[s]).toBeTruthy();
            expect(typeof ORDER_STATUS_LABELS[s]).toBe("string");
            expect(ORDER_STATUS_LABELS[s]).toMatch(/^status\./);
        }
    });

    it("has rich customer descriptions for all statuses", () => {
        for (const s of allStatuses) {
            const desc = CUSTOMER_STATUS_DESCRIPTIONS[s];
            expect(desc).toBeDefined();
            expect(desc.titleKey).toBeTruthy();
            expect(desc.subtitleKey).toBeTruthy();
            expect(typeof desc.step).toBe("number");
        }
    });

    it("defines sequential forward step progression", () => {
        expect(ORDER_STATUS_STEPS).toEqual([
            "pending",
            "confirmed",
            "preparing",
            "out_for_delivery",
            "delivered",
        ]);

        // Each step maps to the subsequent logical step
        expect(NEXT_LOGICAL_STATUS.pending).toBe("confirmed");
        expect(NEXT_LOGICAL_STATUS.confirmed).toBe("preparing");
        expect(NEXT_LOGICAL_STATUS.preparing).toBe("out_for_delivery");
        expect(NEXT_LOGICAL_STATUS.out_for_delivery).toBe("delivered");
        expect(NEXT_LOGICAL_STATUS.delivered).toBeUndefined();
    });

    it("provides admin action label keys for each forward transition", () => {
        expect(NEXT_STATUS_ACTION_LABELS.pending).toBe("admin.orders.actions.approve");
        expect(NEXT_STATUS_ACTION_LABELS.confirmed).toBe("admin.orders.actions.startPrep");
        expect(NEXT_STATUS_ACTION_LABELS.preparing).toBe("admin.orders.actions.dispatch");
        expect(NEXT_STATUS_ACTION_LABELS.out_for_delivery).toBe("admin.orders.actions.markDelivered");
    });

    it("defines valid payment method and payment status label keys", () => {
        expect(PAYMENT_METHOD_LABELS.cash).toBe("payment.cash");
        expect(PAYMENT_METHOD_LABELS.card_terminal).toBe("payment.card_terminal");

        expect(PAYMENT_STATUS_LABELS.unpaid).toBe("payment.unpaid");
        expect(PAYMENT_STATUS_LABELS.paid).toBe("payment.paid");
    });
});

describe("checkout form & payload validation", () => {
    it("validates valid customer checkout form data", () => {
        const validForm = {
            full_name: "ישראל ישראלי",
            phone: "054-1234567",
            address: {
                full_address: "הרצל 15, תל אביב",
                city: "תל אביב",
            },
            payment_method: "cash",
            customer_notes: "נא לצלצל בפעמון",
            location_source: "manual",
        };

        const result = checkoutSchema(t).safeParse(validForm);
        expect(result.success).toBe(true);
    });

    it("rejects checkout with invalid phone number", () => {
        const invalidForm = {
            full_name: "ישראל ישראלי",
            phone: "12345",
            address: {
                full_address: "הרצל 15",
            },
            payment_method: "cash",
        };

        const result = checkoutSchema(t).safeParse(invalidForm);
        expect(result.success).toBe(false);
    });

    it("rejects checkout with empty customer name", () => {
        const invalidForm = {
            full_name: "",
            phone: "054-1234567",
            address: {
                full_address: "הרצל 15",
            },
            payment_method: "cash",
        };

        const result = checkoutSchema(t).safeParse(invalidForm);
        expect(result.success).toBe(false);
    });

    it("validates checkout payload with cart items", () => {
        const payload = {
            customer: {
                full_name: "ישראל ישראלי",
                phone: "054-1234567",
                address: {
                    full_address: "הרצל 15, תל אביב",
                    city: "תל אביב",
                },
                payment_method: "cash",
            },
            items: [{ product_id: "00000000-0000-0000-0000-000000000001", quantity: 2 }],
        };

        const result = checkoutPayloadSchema(t).safeParse(payload);
        expect(result.success).toBe(true);
    });

    it("rejects checkout payload with empty cart", () => {
        const payload = {
            customer: {
                full_name: "ישראל ישראלי",
                phone: "054-1234567",
                address: {
                    full_address: "הרצל 15",
                },
                payment_method: "cash",
            },
            items: [],
        };

        const result = checkoutPayloadSchema(t).safeParse(payload);
        expect(result.success).toBe(false);
    });
});
