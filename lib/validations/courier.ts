import { z } from "zod";

export const vehicleTypeSchema = z.enum(["car", "scooter", "bike", "foot"]);

const hexColorSchema = z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "invalidHexColor");

/** Free-form courier profile (create + update share the shape). */
export const courierSchema = z.object({
    full_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(20),
    vehicle_type: vehicleTypeSchema,
    color: hexColorSchema,
    is_active: z.boolean().optional().default(true),
    notes: z.string().trim().max(1000).optional().nullable(),
});

export type CourierFormValues = z.infer<typeof courierSchema>;

/** Bulk assignment / transfer / return-to-store payload. */
export const assignOrdersSchema = z.object({
    order_ids: z.array(z.string().uuid()).min(1).max(200),
    /** null = return the orders to the store pool. */
    courier_id: z.string().uuid().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
});

export type AssignOrdersValues = z.infer<typeof assignOrdersSchema>;

/** Status transitions the courier portal may request. */
export const courierStatusSchema = z.enum([
    "out_for_delivery",
    "delivered",
    "preparing",
]);

export const courierUpdateStatusSchema = z.object({
    token: z.string().trim().min(16).max(128),
    order_id: z.string().uuid(),
    to_status: courierStatusSchema,
    note: z.string().trim().max(500).optional().nullable(),
});

export type CourierUpdateStatusValues = z.infer<
    typeof courierUpdateStatusSchema
>;

/** Throttled GPS report from the courier's browser. */
export const courierLocationSchema = z.object({
    token: z.string().trim().min(16).max(128),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(10000).optional().nullable(),
});

export type CourierLocationValues = z.infer<typeof courierLocationSchema>;