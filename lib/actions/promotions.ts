"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { STORE_CACHE_TAGS } from "@/lib/data/storefront";
import { createAdminClient } from "@/lib/supabase/admin";
import { shekelInputToAgorot } from "@/lib/utils/currency";
import { promotionFormSchema } from "@/lib/validations/promotion";

export type PromotionActionResult = { error?: string } | undefined;

function toIsoOrNull(value: string | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const iso = new Date(trimmed).toISOString();
    return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function buildConfig(
    type: string,
    data: z.infer<ReturnType<typeof promotionFormSchema>>
): Record<string, unknown> {
    switch (type) {
        case "multi_buy":
            return {
                buy_quantity: data.buy_quantity,
                get_quantity: data.get_quantity,
                discount_percent: data.discount_percent,
            };
        case "price_deal": {
            const dealPrice = shekelInputToAgorot(data.deal_price_shekels ?? "");
            return { deal_price_agorot: dealPrice ?? 0 };
        }
        case "free_shipping": {
            const minSubtotal = shekelInputToAgorot(
                data.min_subtotal_shekels ?? ""
            );
            return {
                min_quantity: data.min_quantity,
                min_subtotal_agorot: minSubtotal ?? 0,
            };
        }
        default:
            return {};
    }
}

export async function createPromotion(
    values: z.infer<ReturnType<typeof promotionFormSchema>>
): Promise<PromotionActionResult> {
    await requireAdmin();

    const t = await getTranslations("validation");
    const te = await getTranslations("admin.errors");

    const parsed = promotionFormSchema(t).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const { error } = await createAdminClient().from("promotions").insert({
        name_he: parsed.data.name_he,
        name_ar: parsed.data.name_ar || null,
        type: parsed.data.type,
        is_active: parsed.data.is_active,
        starts_at: toIsoOrNull(parsed.data.starts_at),
        ends_at: toIsoOrNull(parsed.data.ends_at),
        scope_type: parsed.data.scope_type,
        category_id:
            parsed.data.scope_type === "category" ? parsed.data.category_id : null,
        product_ids:
            parsed.data.scope_type === "products" ? parsed.data.product_ids : [],
        config: buildConfig(parsed.data.type, parsed.data),
        sort_order: parsed.data.sort_order,
    });

    if (error) return { error: te("savePromotionFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
}

export async function updatePromotion(
    id: string,
    values: z.infer<ReturnType<typeof promotionFormSchema>>
): Promise<PromotionActionResult> {
    await requireAdmin();

    const t = await getTranslations("validation");
    const te = await getTranslations("admin.errors");

    const parsed = promotionFormSchema(t).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const { error } = await createAdminClient()
        .from("promotions")
        .update({
            name_he: parsed.data.name_he,
            name_ar: parsed.data.name_ar || null,
            type: parsed.data.type,
            is_active: parsed.data.is_active,
            starts_at: toIsoOrNull(parsed.data.starts_at),
            ends_at: toIsoOrNull(parsed.data.ends_at),
            scope_type: parsed.data.scope_type,
            category_id:
                parsed.data.scope_type === "category" ? parsed.data.category_id : null,
            product_ids:
                parsed.data.scope_type === "products" ? parsed.data.product_ids : [],
            config: buildConfig(parsed.data.type, parsed.data),
            sort_order: parsed.data.sort_order,
        })
        .eq("id", id);

    if (error) return { error: te("updatePromotionFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
}

export async function deletePromotion(id: string): Promise<PromotionActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    const { error } = await createAdminClient()
        .from("promotions")
        .delete()
        .eq("id", id);

    if (error) return { error: te("deletePromotionFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
}