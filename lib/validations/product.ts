import { z } from "zod";

/**
 * Product form schema. Prices are entered in shekels (as strings),
 * converted to agorot before persisting.
 */
export const productFormSchema = z.object({
    name_he: z
        .string()
        .trim()
        .min(2, "נא להזין שם מוצר")
        .max(200, "שם ארוך מדי"),
    slug: z
        .string()
        .trim()
        .min(2, "נא להזין slug")
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug יכול להכיל רק אותיות קטנות, ספרות ומקפים"),
    description_he: z.string().trim().max(4000).optional().or(z.literal("")),
    price_shekels: z
        .string()
        .trim()
        .min(1, "נא להזין מחיר")
        .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")), "מחיר לא תקין"),
    compare_at_price_shekels: z
        .string()
        .trim()
        .optional()
        .or(z.literal(""))
        .refine(
            (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
            "מחיר השוואה לא תקין"
        ),
    stock_quantity: z.coerce.number().int().min(0, "מלאי לא יכול להיות שלילי"),
    low_stock_threshold: z.coerce
        .number()
        .int()
        .min(0, "סף מלאי נמוך לא תקין"),
    category_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().default(true),
    sort_order: z.coerce.number().int().min(0).default(0),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const categoryFormSchema = z.object({
    name_he: z.string().trim().min(2, "נא להזין שם קטגוריה").max(100),
    slug: z
        .string()
        .trim()
        .min(2)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug לא תקין"),
    is_active: z.boolean().default(true),
    sort_order: z.coerce.number().int().min(0).default(0),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;