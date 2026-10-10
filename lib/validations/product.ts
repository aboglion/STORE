import { z } from "zod";

import type { ValidationMessages } from "@/lib/validations/checkout";

/**
 * Product form schema. Prices are entered in shekels (as strings),
 * converted to agorot before persisting.
 */
export function productFormSchema(t: ValidationMessages) {
    return z.object({
        name_he: z
            .string()
            .trim()
            .min(2, t("productName"))
            .max(200, t("nameTooLong")),
        name_ar: z.string().trim().max(200).optional().or(z.literal("")),
        slug: z
            .string()
            .trim()
            .min(2, t("slug"))
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t("slugInvalid")),
        description_he: z.string().trim().max(4000).optional().or(z.literal("")),
        description_ar: z.string().trim().max(4000).optional().or(z.literal("")),
        price_shekels: z
            .string()
            .trim()
            .min(1, t("price"))
            .refine(
                (v) => /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
                t("priceInvalid")
            ),
        compare_at_price_shekels: z
            .string()
            .trim()
            .optional()
            .or(z.literal(""))
            .refine(
                (v) => !v || /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
                t("comparePriceInvalid")
            ),
        cost_shekels: z
            .string()
            .trim()
            .optional()
            .or(z.literal(""))
            .refine(
                (v) => !v || /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
                t("costInvalid")
            ),
        stock_quantity: z.coerce.number().int().min(0, t("stockNegative")),
        low_stock_threshold: z.coerce
            .number()
            .int()
            .min(0, t("lowStockInvalid")),
        category_id: z.string().uuid().nullable().optional(),
        is_active: z.boolean().default(true),
        sort_order: z.coerce.number().int().min(0).default(0),
    });
}

export type ProductFormValues = z.infer<ReturnType<typeof productFormSchema>>;

export function categoryFormSchema(t: ValidationMessages) {
    return z.object({
        name_he: z
            .string()
            .trim()
            .min(2, t("categoryName"))
            .max(100),
        name_ar: z.string().trim().max(100).optional().or(z.literal("")),
        slug: z
            .string()
            .trim()
            .min(2)
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t("slugInvalidShort")),
        is_active: z.boolean().default(true),
        sort_order: z.coerce.number().int().min(0).default(0),
    });
}

export type CategoryFormValues = z.infer<ReturnType<typeof categoryFormSchema>>;
