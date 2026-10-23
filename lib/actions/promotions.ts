"use server";

import { randomUUID } from "crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, PRODUCT_IMAGES_BUCKET } from "@/lib/constants";
import { STORE_CACHE_TAGS } from "@/lib/data/storefront";
import { createAdminClient } from "@/lib/supabase/admin";
import { shekelInputToAgorot } from "@/lib/utils/currency";
import { promotionFormSchema } from "@/lib/validations/promotion";

export type PromotionActionResult = { error?: string } | undefined;

export type PromotionImageActionResult = { path?: string; error?: string } | undefined;

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
    const admin = createAdminClient();

    // Remove the promotion image from storage first (best effort).
    const { data: promotion } = await admin
        .from("promotions")
        .select("image_path")
        .eq("id", id)
        .maybeSingle();

    if (promotion?.image_path) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([promotion.image_path]);
    }

    const { error } = await admin.from("promotions").delete().eq("id", id);

    if (error) return { error: te("deletePromotionFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
}

// ---------------------------------------------------------------------------
// Promotion card image
// ---------------------------------------------------------------------------

export async function uploadPromotionImage(
    promotionId: string,
    file: File
): Promise<PromotionImageActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    if (file.size > 10 * 1024 * 1024) {
        return { error: te("fileTooLarge") };
    }

    const ext = ALLOWED_IMAGE_TYPES.get(file.type);
    if (!ext) {
        return { error: te("invalidImageType") };
    }

    const admin = createAdminClient();
    const storagePath = `promotions/${promotionId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
            contentType: file.type || "image/jpeg",
            upsert: false,
        });

    if (uploadError) return { error: te("uploadImageFailed") };

    // Remove any previous image to avoid orphaned files.
    const { data: promotion } = await admin
        .from("promotions")
        .select("image_path")
        .eq("id", promotionId)
        .maybeSingle();

    if (promotion?.image_path && promotion.image_path !== storagePath) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([promotion.image_path]);
    }

    const { error: updateError } = await admin
        .from("promotions")
        .update({ image_path: storagePath })
        .eq("id", promotionId);

    if (updateError) {
        await admin.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
        return { error: te("saveImageFailed") };
    }

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
    return { path: storagePath };
}

export async function removePromotionImage(
    promotionId: string
): Promise<PromotionActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");
    const admin = createAdminClient();

    const { data: promotion } = await admin
        .from("promotions")
        .select("image_path")
        .eq("id", promotionId)
        .maybeSingle();

    if (promotion?.image_path) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([promotion.image_path]);
    }

    const { error } = await admin
        .from("promotions")
        .update({ image_path: null })
        .eq("id", promotionId);

    if (error) return { error: te("deleteImageFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
}

// ---------------------------------------------------------------------------
// Site-wide promotions banner (stored in the settings table)
// ---------------------------------------------------------------------------

export interface PromotionsBannerValues {
    image_path: string;
    title_he: string;
    title_ar: string;
    enabled: boolean;
}

export async function uploadPromotionsBannerImage(
    file: File
): Promise<PromotionImageActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    if (file.size > 10 * 1024 * 1024) {
        return { error: te("fileTooLarge") };
    }

    const ext = ALLOWED_IMAGE_TYPES.get(file.type);
    if (!ext) {
        return { error: te("invalidImageType") };
    }

    const admin = createAdminClient();
    const storagePath = `promotions/banner-${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
            contentType: file.type || "image/jpeg",
            upsert: false,
        });

    if (uploadError) return { error: te("uploadImageFailed") };

    // Remove the previous banner file (best effort).
    const { data: current } = await admin
        .from("settings")
        .select("value")
        .eq("key", "promotions_banner")
        .maybeSingle();

    const currentPath = (
        (current?.value as { value?: { image_path?: string } } | null)?.value
            ?.image_path ?? ""
    ).trim();

    if (currentPath && currentPath !== storagePath) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([currentPath]);
    }

    revalidateTag(STORE_CACHE_TAGS.settings);
    return { path: storagePath };
}

export async function updatePromotionsBanner(
    values: PromotionsBannerValues
): Promise<PromotionActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    const { error } = await createAdminClient()
        .from("settings")
        .upsert(
            {
                key: "promotions_banner",
                value: {
                    value: {
                        image_path: values.image_path.trim(),
                        title_he: values.title_he.trim(),
                        title_ar: values.title_ar.trim(),
                        enabled: values.enabled,
                    },
                },
            },
            { onConflict: "key" }
        );

    if (error) return { error: te("saveSettingsFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidatePath("/promotions");
    revalidateTag(STORE_CACHE_TAGS.settings);
    revalidateTag(STORE_CACHE_TAGS.promotions);
}

export async function removePromotionsBanner(): Promise<PromotionActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");
    const admin = createAdminClient();

    const { data: current } = await admin
        .from("settings")
        .select("value")
        .eq("key", "promotions_banner")
        .maybeSingle();

    const currentPath = (
        (current?.value as { value?: { image_path?: string } } | null)?.value
            ?.image_path ?? ""
    ).trim();

    if (currentPath) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([currentPath]);
    }

    const { error } = await admin
        .from("settings")
        .upsert(
            {
                key: "promotions_banner",
                value: {
                    value: { image_path: "", title_he: "", title_ar: "", enabled: false },
                },
            },
            { onConflict: "key" }
        );

    if (error) return { error: te("deleteImageFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidatePath("/promotions");
    revalidateTag(STORE_CACHE_TAGS.settings);
    revalidateTag(STORE_CACHE_TAGS.promotions);
}