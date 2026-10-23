import { z } from "zod";

import type { ValidationMessages } from "@/lib/validations/checkout";

export const PROMOTION_TYPES = ["multi_buy", "price_deal", "free_shipping"] as const;
export const PROMOTION_SCOPE_TYPES = ["all", "category", "products"] as const;

/**
 * Promotion form schema. Money fields are entered in shekels (as strings)
 * and converted to agorot before persisting. Type-specific fields are
 * validated conditionally based on the selected promotion type.
 */
export function promotionFormSchema(t: ValidationMessages) {
    return z
        .object({
            name_he: z
                .string()
                .trim()
                .min(2, t("promotionName"))
                .max(200, t("nameTooLong")),
            name_ar: z.string().trim().max(200).optional().or(z.literal("")),
            type: z.enum(PROMOTION_TYPES),
            is_active: z.boolean().default(true),
            starts_at: z.string().optional().or(z.literal("")),
            ends_at: z.string().optional().or(z.literal("")),
            scope_type: z.enum(PROMOTION_SCOPE_TYPES).default("all"),
            category_id: z.string().uuid().nullable().optional(),
            product_ids: z.array(z.string().uuid()).default([]),
            sort_order: z.coerce.number().int().min(0).default(0),
            // multi_buy
            buy_quantity: z.coerce.number().int().min(0).default(0),
            get_quantity: z.coerce.number().int().min(0).default(0),
            discount_percent: z.coerce.number().int().min(0).max(100).default(100),
            // price_deal
            deal_price_shekels: z
                .string()
                .trim()
                .optional()
                .or(z.literal(""))
                .refine(
                    (v) => !v || /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
                    t("priceInvalid")
                ),
            // free_shipping
            min_quantity: z.coerce.number().int().min(0).default(0),
            min_subtotal_shekels: z
                .string()
                .trim()
                .optional()
                .or(z.literal(""))
                .refine(
                    (v) => !v || /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
                    t("priceInvalid")
                ),
        })
        .superRefine((data, ctx) => {
            if (data.type === "multi_buy") {
                if (data.buy_quantity < 1) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["buy_quantity"],
                        message: t("buyQuantityRequired"),
                    });
                }
                if (data.get_quantity < 1) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["get_quantity"],
                        message: t("getQuantityRequired"),
                    });
                }
            }
            if (data.type === "price_deal" && !data.deal_price_shekels?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["deal_price_shekels"],
                    message: t("dealPriceRequired"),
                });
            }
            if (data.type === "free_shipping") {
                const hasMinQuantity = data.min_quantity > 0;
                const hasMinSubtotal = Boolean(data.min_subtotal_shekels?.trim());
                if (!hasMinQuantity && !hasMinSubtotal) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["min_quantity"],
                        message: t("freeShippingConditionRequired"),
                    });
                }
            }
            if (data.scope_type === "category" && !data.category_id) {
                ctx.addIssue({
                    code: "custom",
                    path: ["category_id"],
                    message: t("categoryRequired"),
                });
            }
            if (data.scope_type === "products" && data.product_ids.length === 0) {
                ctx.addIssue({
                    code: "custom",
                    path: ["product_ids"],
                    message: t("productsRequired"),
                });
            }
        });
}

export type PromotionFormValues = z.infer<ReturnType<typeof promotionFormSchema>>;