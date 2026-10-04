import { z } from "zod";

export const paymentMethodSchema = z.enum([
    "cash",
    "card_gateway",
    "card_link",
    "card_terminal",
]);

export const addressFormSchema = z.object({
    full_address: z
        .string()
        .trim()
        .min(3, "נא להזין כתובת מלאה")
        .max(300, "כתובת ארוכה מדי"),
    city: z.string().trim().max(100, "עיר ארוכה מדי").optional().or(z.literal("")),
    street: z.string().trim().max(150, "רחוב ארוך מדי").optional().or(z.literal("")),
    house_number: z
        .string()
        .trim()
        .max(20)
        .optional()
        .or(z.literal("")),
    entrance: z.string().trim().max(20).optional().or(z.literal("")),
    apartment: z.string().trim().max(20).optional().or(z.literal("")),
});

export const checkoutSchema = z.object({
    full_name: z
        .string()
        .trim()
        .min(2, "נא להזין שם מלא")
        .max(120, "שם ארוך מדי"),
    phone: z.string().trim().min(7, "נא להזין מספר טלפון תקין"),
    address: addressFormSchema,
    payment_method: paymentMethodSchema,
    customer_notes: z.string().trim().max(1000).optional().or(z.literal("")),
    // Optional geolocation, provided by the browser when approved.
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    location_source: z
        .enum(["browser_geolocation", "manual"])
        .optional()
        .default("manual"),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/** One cart line as submitted to the server action. */
export const checkoutItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
});

export const checkoutPayloadSchema = z.object({
    customer: checkoutSchema,
    items: z.array(checkoutItemSchema).min(1, "הסל ריק"),
});

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;