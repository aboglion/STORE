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

export type PromotionActionResult = { error?: string; id?: string } | undefined;

export type PromotionImageActionResult = { path?: string; error?: string } | undefined;

function toIsoOrNull(value: string | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const iso = new Date(trimmed).toISOString();
    return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function buildConfig(
    type: string,
    data: z.infer<ReturnType<typeof promotionFormSchema>>,
    originalPriceOverride?: number | null
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
            const config: Record<string, unknown> = {
                deal_price_agorot: dealPrice ?? 0,
            };
            const originalPrice =
                originalPriceOverride ??
                shekelInputToAgorot(data.original_price_shekels ?? "");
            if (originalPrice != null) {
                config.original_price_agorot = originalPrice;
            }
            return config;
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

    const admin = createAdminClient();

    let resolvedOriginalPrice = shekelInputToAgorot(parsed.data.original_price_shekels ?? "");
    if (
        parsed.data.type === "price_deal" &&
        parsed.data.scope_type === "products" &&
        parsed.data.product_ids.length > 0 &&
        resolvedOriginalPrice == null
    ) {
        const { data: dbProducts } = await admin
            .from("products")
            .select("price_agorot, compare_at_price_agorot")
            .in("id", parsed.data.product_ids)
            .limit(1);
        if (dbProducts && dbProducts.length > 0) {
            resolvedOriginalPrice =
                dbProducts[0].compare_at_price_agorot || dbProducts[0].price_agorot;
        }
    }

    const { data, error } = await admin
        .from("promotions")
        .insert({
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
            config: buildConfig(parsed.data.type, parsed.data, resolvedOriginalPrice),
            image_path: parsed.data.image_path?.trim() || null,
            sort_order: parsed.data.sort_order,
        })
        .select("id")
        .single();

    if (error) return { error: te("savePromotionFailed") };

    // When a price_deal on specific products is active, update their store price
    if (
        parsed.data.type === "price_deal" &&
        parsed.data.scope_type === "products" &&
        parsed.data.product_ids.length > 0
    ) {
        const dealPrice = shekelInputToAgorot(parsed.data.deal_price_shekels ?? "");
        if (dealPrice != null && parsed.data.is_active) {
            await admin
                .from("products")
                .update({
                    price_agorot: dealPrice,
                    ...(resolvedOriginalPrice != null
                        ? { compare_at_price_agorot: resolvedOriginalPrice }
                        : {}),
                })
                .in("id", parsed.data.product_ids);
            revalidateTag(STORE_CACHE_TAGS.products);
        }
    }

    revalidatePath("/admin/promotions");
    revalidatePath("/products");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);

    // New promotion id — lets the client attach a card image right after.
    return { id: data?.id };
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

    const admin = createAdminClient();

    // Fetch existing promotion to handle product price transitions
    const { data: existingPromotion } = await admin
        .from("promotions")
        .select("type, scope_type, product_ids, config, is_active")
        .eq("id", id)
        .maybeSingle();

    const existingConfig = existingPromotion?.config as Record<string, unknown> | null;
    let resolvedOriginalPrice = shekelInputToAgorot(parsed.data.original_price_shekels ?? "");
    if (resolvedOriginalPrice == null) {
        resolvedOriginalPrice = (existingConfig?.original_price_agorot as number) ?? null;
    }
    if (
        parsed.data.type === "price_deal" &&
        parsed.data.scope_type === "products" &&
        parsed.data.product_ids.length > 0 &&
        resolvedOriginalPrice == null
    ) {
        const { data: dbProducts } = await admin
            .from("products")
            .select("price_agorot, compare_at_price_agorot")
            .in("id", parsed.data.product_ids)
            .limit(1);
        if (dbProducts && dbProducts.length > 0) {
            resolvedOriginalPrice =
                dbProducts[0].compare_at_price_agorot || dbProducts[0].price_agorot;
        }
    }

    const { error } = await admin
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
            config: buildConfig(parsed.data.type, parsed.data, resolvedOriginalPrice),
            ...(parsed.data.image_path !== undefined
                ? { image_path: parsed.data.image_path.trim() || null }
                : {}),
            sort_order: parsed.data.sort_order,
        })
        .eq("id", id);

    if (error) return { error: te("updatePromotionFailed") };

    // Sync product prices when price_deal on products is toggled or updated
    const oldProductIds = (existingPromotion?.product_ids as string[]) || [];
    const newProductIds = parsed.data.scope_type === "products" ? parsed.data.product_ids : [];
    const oldOriginalPrice = (existingConfig?.original_price_agorot as number) ?? resolvedOriginalPrice;

    // 1. Products removed from this promotion (or deactivated or changed type)
    const removedProductIds = oldProductIds.filter(
        (pid) => !newProductIds.includes(pid) || !parsed.data.is_active || parsed.data.type !== "price_deal"
    );
    if (
        existingPromotion?.type === "price_deal" &&
        existingPromotion?.scope_type === "products" &&
        removedProductIds.length > 0 &&
        oldOriginalPrice != null
    ) {
        await admin
            .from("products")
            .update({
                price_agorot: oldOriginalPrice,
                compare_at_price_agorot: null,
            })
            .in("id", removedProductIds);
        revalidateTag(STORE_CACHE_TAGS.products);
    }

    // 2. Active products in this promotion
    if (
        parsed.data.type === "price_deal" &&
        parsed.data.scope_type === "products" &&
        newProductIds.length > 0
    ) {
        const dealPrice = shekelInputToAgorot(parsed.data.deal_price_shekels ?? "");
        if (parsed.data.is_active && dealPrice != null) {
            await admin
                .from("products")
                .update({
                    price_agorot: dealPrice,
                    ...(resolvedOriginalPrice != null
                        ? { compare_at_price_agorot: resolvedOriginalPrice }
                        : {}),
                })
                .in("id", newProductIds);
            revalidateTag(STORE_CACHE_TAGS.products);
        } else if (!parsed.data.is_active && oldOriginalPrice != null) {
            await admin
                .from("products")
                .update({
                    price_agorot: oldOriginalPrice,
                    compare_at_price_agorot: null,
                })
                .in("id", newProductIds);
            revalidateTag(STORE_CACHE_TAGS.products);
        }
    }

    revalidatePath("/admin/promotions");
    revalidatePath("/products");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
}

export async function deletePromotion(id: string): Promise<PromotionActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");
    const admin = createAdminClient();

    // Fetch promotion details before deleting to clean image and restore product prices
    const { data: promotion } = await admin
        .from("promotions")
        .select("image_path, type, scope_type, product_ids, config")
        .eq("id", id)
        .maybeSingle();

    if (promotion?.image_path) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([promotion.image_path]);
    }

    // Restore product prices if this was a price_deal
    const promoConfig = promotion?.config as Record<string, unknown> | null;
    const originalPrice = promoConfig?.original_price_agorot as number | undefined;
    const productIds = promotion?.product_ids as string[] | undefined;
    if (
        promotion?.type === "price_deal" &&
        promotion?.scope_type === "products" &&
        productIds?.length &&
        originalPrice != null
    ) {
        await admin
            .from("products")
            .update({
                price_agorot: originalPrice,
                compare_at_price_agorot: null,
            })
            .in("id", productIds);
        revalidateTag(STORE_CACHE_TAGS.products);
    }

    const { error } = await admin.from("promotions").delete().eq("id", id);

    if (error) return { error: te("deletePromotionFailed") };

    revalidatePath("/admin/promotions");
    revalidatePath("/products");
    revalidatePath("/");
    revalidateTag(STORE_CACHE_TAGS.promotions);
}

/**
 * Automatically cleans up expired promotions (ends_at has passed).
 * Marks them is_active = false and restores affected products' original prices.
 */
export async function cleanupExpiredPromotions(): Promise<void> {
    try {
        const admin = createAdminClient();
        const nowIso = new Date().toISOString();

        const { data: expiredPromos, error } = await admin
            .from("promotions")
            .select("id, type, scope_type, product_ids, config")
            .eq("is_active", true)
            .not("ends_at", "is", null)
            .lt("ends_at", nowIso);

        if (error || !expiredPromos || expiredPromos.length === 0) {
            return;
        }

        let productsAffected = false;

        for (const promo of expiredPromos) {
            await admin
                .from("promotions")
                .update({ is_active: false })
                .eq("id", promo.id);

            const config = promo.config as Record<string, unknown> | null;
            const originalPrice = config?.original_price_agorot as number | undefined;
            const productIds = promo.product_ids as string[] | undefined;

            if (
                promo.type === "price_deal" &&
                promo.scope_type === "products" &&
                productIds?.length &&
                originalPrice != null
            ) {
                await admin
                    .from("products")
                    .update({
                        price_agorot: originalPrice,
                        compare_at_price_agorot: null,
                    })
                    .in("id", productIds);
                productsAffected = true;
            }
        }

        if (productsAffected) {
            revalidateTag(STORE_CACHE_TAGS.products);
        }
        revalidateTag(STORE_CACHE_TAGS.promotions);
    } catch (e) {
        console.error("cleanupExpiredPromotions error:", e);
    }
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

    const imagePath = values.image_path.trim();
    const hasImage = Boolean(imagePath);

    const { error } = await createAdminClient()
        .from("settings")
        .upsert(
            {
                key: "promotions_banner",
                value: {
                    value: {
                        image_path: imagePath,
                        title_he: values.title_he.trim(),
                        title_ar: values.title_ar.trim(),
                        enabled: hasImage ? (values.enabled ?? true) : false,
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