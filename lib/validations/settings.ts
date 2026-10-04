import { z } from "zod";

export const settingsFormSchema = z.object({
    store_name: z.string().trim().min(1, "נא להזין שם חנות").max(100),
    delivery_fee_shekels: z
        .string()
        .trim()
        .refine(
            (v) => /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
            "דמי משלוח לא תקינים"
        ),
    free_delivery_threshold_shekels: z
        .string()
        .trim()
        .refine(
            (v) => /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
            "סף משלוח חינם לא תקין"
        ),
    low_stock_threshold_default: z.coerce
        .number()
        .int()
        .min(0, "ערך לא תקין"),
    contact_phone: z.string().trim().max(30).optional().default(""),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;