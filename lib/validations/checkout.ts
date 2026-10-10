import { z } from "zod";

/** Minimal translate function signature (next-intl compatible). */
export type ValidationMessages = (key: string) => string;

export const paymentMethodSchema = z.enum([
    "cash",
    "card_gateway",
    "card_link",
    "card_terminal",
]);

export function addressFormSchema(t: ValidationMessages) {
    return z.object({
        full_address: z
            .string()
            .trim()
            .min(3, t("fullAddress"))
            .max(300, t("addressTooLong")),
        city: z
            .string()
            .trim()
            .max(100, t("cityTooLong"))
            .optional()
            .or(z.literal("")),
        street: z
            .string()
            .trim()
            .max(150, t("streetTooLong"))
            .optional()
            .or(z.literal("")),
        house_number: z
            .string()
            .trim()
            .max(20)
            .optional()
            .or(z.literal("")),
        entrance: z.string().trim().max(20).optional().or(z.literal("")),
        apartment: z.string().trim().max(20).optional().or(z.literal("")),
    });
}

export function checkoutSchema(t: ValidationMessages) {
    return z.object({
        full_name: z
            .string()
            .trim()
            .min(2, t("fullName"))
            .max(120, t("nameTooLong")),
        phone: z.string().trim().min(7, t("phone")),
        address: addressFormSchema(t),
        payment_method: paymentMethodSchema,
        customer_notes: z.string().trim().max(1000).optional().or(z.literal("")),
        // Optional geolocation, provided by the browser when approved.
        lat: z.number().min(-90).max(90).optional().nullable(),
        lng: z.number().min(-180).max(180).optional().nullable(),
        location_source: z
            .enum([
                "browser_geolocation",
                "map_pin",
                "manual",
                "geocoded",
                "admin_pinned",
                "courier_pinned",
            ])
            .optional()
            .default("manual"),
        // Location quality, set by the server geocoding fallback.
        location_confidence: z
            .enum(["high", "medium", "low"])
            .optional()
            .nullable(),
        location_accuracy_m: z.number().positive().optional().nullable(),
    });
}

export type CheckoutFormValues = z.infer<ReturnType<typeof checkoutSchema>>;

/** One cart line as submitted to the server action. */
export const checkoutItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
});

export function checkoutPayloadSchema(t: ValidationMessages) {
    return z.object({
        customer: checkoutSchema(t),
        items: z.array(checkoutItemSchema).min(1, t("emptyCart")),
    });
}

export type CheckoutPayload = z.infer<ReturnType<typeof checkoutPayloadSchema>>;
