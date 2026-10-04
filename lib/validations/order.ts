import { z } from "zod";

export const orderStatusSchema = z.enum([
    "pending",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
    "canceled",
]);

export const paymentStatusSchema = z.enum([
    "unpaid",
    "authorized",
    "paid",
    "failed",
    "refunded",
]);

export const updateOrderStatusSchema = z.object({
    order_id: z.string().uuid(),
    to_status: orderStatusSchema,
    note: z.string().trim().max(500).optional().nullable(),
});

export const updatePaymentStatusSchema = z.object({
    order_id: z.string().uuid(),
    payment_status: paymentStatusSchema,
});

export const cancelOrderSchema = z.object({
    order_id: z.string().uuid(),
    note: z.string().trim().max(500).optional().nullable(),
});