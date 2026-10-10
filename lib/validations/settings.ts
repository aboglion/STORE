import { z } from "zod";

import { STORE_THEME_KEYS } from "@/lib/theme";
import type { StoreThemeKey } from "@/types/database.types";
import type { ValidationMessages } from "@/lib/validations/checkout";

export function settingsFormSchema(t: ValidationMessages) {
    return z.object({
        store_name: z.string().trim().min(1, t("storeName")).max(100),
        store_name_ar: z.string().trim().max(100).optional().default(""),
        logo_url: z.string().trim().max(500).optional().default(""),
        theme: z
            .enum(STORE_THEME_KEYS as [StoreThemeKey, ...StoreThemeKey[]])
            .default("caramel"),
        delivery_fee_shekels: z
            .string()
            .trim()
            .refine(
                (v) => /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
                t("deliveryFeeInvalid")
            ),
        free_delivery_threshold_shekels: z
            .string()
            .trim()
            .refine(
                (v) => /^\d+(\.\d{1,2})?$/.test(v.replace(",", ".")),
                t("freeDeliveryInvalid")
            ),
        low_stock_threshold_default: z.coerce
            .number()
            .int()
            .min(0, t("invalidValue")),
        contact_phone: z.string().trim().max(30).optional().default(""),
    });
}

export type SettingsFormValues = z.infer<ReturnType<typeof settingsFormSchema>>;
