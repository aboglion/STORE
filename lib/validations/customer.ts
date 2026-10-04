import { z } from "zod";

export const updateCustomerNotesSchema = z.object({
    customer_id: z.string().uuid(),
    notes: z.string().trim().max(2000).optional().nullable(),
});

export const customerSearchSchema = z.object({
    q: z.string().trim().max(100).optional().default(""),
});