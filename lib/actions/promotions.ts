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
            // Only store a single original_price_agorot if scope is a single product or global 'all'.
            // For multiple products or categories, each product retains its own individual original price.
            const isSingleProduct = data.scope_type === "products" && data.product_ids.length === 1;
            const isGlobalScope = data.scope_type === "all";

            if (isSingleProduct || isGlobalScope) {
                const originalPrice =
                    originalPriceOverride ??
                    shekelInputToAgorot(data.original_price_shekels ?? "");
                if (originalPrice != null) {
                    config.original_price_agorot = originalPrice;
                }
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

async function getCategoryProductIds(
    admin: ReturnType<typeof createAdminClient>,
    categoryId: string
): Promise<string[]> {
    const { data } = await admin
        .from("products")
        .select("id")
        .eq("category_id", categoryId);
    return (data ?? []).map((p) => p.id);
}

/**
 * Applies a price deal to a set of products.
 * Each product's individual original price is preserved in compare_at_price_agorot,
 * and price_agorot is updated to the deal price.
 */
async function applyPriceDealToProducts(
    admin: ReturnType<typeof createAdminClient>,
    productIds: string[],
    dealPriceAgorot: number
) {
    if (productIds.length === 0) return;

    const { data: dbProducts } = await admin
        .from("products")
        .select("id, price_agorot, compare_at_price_agorot")
        .in("id", productIds);

    if (!dbProducts || dbProducts.length === 0) return;

    for (const prod of dbProducts) {
        // If already in a sale/compare price, keep it. Otherwise its current price_agorot is original!
        const originalPrice = prod.compare_at_price_agorot ?? prod.price_agorot;
        await admin
            .from("products")
            .update({
                price_agorot: dealPriceAgorot,
                compare_at_price_agorot: originalPrice,
            })
            .eq("id", prod.id);
    }
}

/**
 * Restores products from a price deal.
 * Each product's original price (stored in compare_at_price_agorot) is restored to price_agorot,
 * and compare_at_price_agorot is reset to null.
 */
async function restoreProductsFromDeal(
    admin: ReturnType<typeof createAdminClient>,
    productIds: string[]
) {
    if (productIds.length === 0) return;

    const { data: dbProducts } = await admin
        .from("products")
        .select("id, price_agorot, compare_at_price_agorot")
        .in("id", productIds)
        .not("compare_at_price_agorot", "is", null);

    if (!dbProducts || dbProducts.length === 0) return;

    for (const prod of dbProducts) {
        if (prod.compare_at_price_agorot != null) {
            await admin
                .from("products")
                .update({
                    price_agorot: prod.compare_at_price_agorot,
                    compare_at_price_agorot: null,
                })
                .eq("id", prod.id);
        }
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

    let resolvedSingleOriginalPrice: number | null = null;
    if (
        parsed.data.type === "price_deal" &&
        parsed.data.scope_type === "products" &&
        parsed.data.product_ids.length === 1
    ) {
        resolvedSingleOriginalPrice = shekelInputToAgorot(parsed.data.original_price_shekels ?? "");
        if (resolvedSingleOriginalPrice == null) {
            const { data: dbProducts } = await admin
                .from("products")
                .select("price_agorot, compare_at_price_agorot")
                .eq("id", parsed.data.product_ids[0])
                .maybeSingle();
            if (dbProducts) {
                resolvedSingleOriginalPrice =
                    dbProducts.compare_at_price_agorot || dbProducts.price_agorot;
            }
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
            config: buildConfig(parsed.data.type, parsed.data, resolvedSingleOriginalPrice),
            image_path: parsed.data.image_path?.trim() || null,
            sort_order: parsed.data.sort_order,
        })
        .select("id")
        .single();

    if (error) return { error: te("savePromotionFailed") };

    // When a price_deal is active, apply deal price to all affected products
    if (parsed.data.type === "price_deal" && parsed.data.is_active) {
        const dealPrice = shekelInputToAgorot(parsed.data.deal_price_shekels ?? "");
        if (dealPrice != null) {
            if (parsed.data.scope_type === "products" && parsed.data.product_ids.length > 0) {
                await applyPriceDealToProducts(admin, parsed.data.product_ids, dealPrice);
                revalidateTag(STORE_CACHE_TAGS.products);
            } else if (parsed.data.scope_type === "category" && parsed.data.category_id) {
                const catProductIds = await getCategoryProductIds(admin, parsed.data.category_id);
                await applyPriceDealToProducts(admin, catProductIds, dealPrice);
                revalidateTag(STORE_CACHE_TAGS.products);
            }
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
        .select("type, scope_type, product_ids, category_id, config, is_active")
        .eq("id", id)
        .maybeSingle();

    let oldAffectedProductIds: string[] = [];
    if (existingPromotion?.type === "price_deal" && existingPromotion.is_active) {
        if (existingPromotion.scope_type === "products" && existingPromotion.product_ids?.length) {
            oldAffectedProductIds = existingPromotion.product_ids;
        } else if (existingPromotion.scope_type === "category" && existingPromotion.category_id) {
            oldAffectedProductIds = await getCategoryProductIds(admin, existingPromotion.category_id);
        }
    }

    let resolvedSingleOriginalPrice: number | null = null;
    if (
        parsed.data.type === "price_deal" &&
        parsed.data.scope_type === "products" &&
        parsed.data.product_ids.length === 1
    ) {
        resolvedSingleOriginalPrice = shekelInputToAgorot(parsed.data.original_price_shekels ?? "");
        if (resolvedSingleOriginalPrice == null) {
            const existingConfig = existingPromotion?.config as Record<string, unknown> | null;
            resolvedSingleOriginalPrice = (existingConfig?.original_price_agorot as number) ?? null;
        }
        if (resolvedSingleOriginalPrice == null) {
            const { data: dbProducts } = await admin
                .from("products")
                .select("price_agorot, compare_at_price_agorot")
                .eq("id", parsed.data.product_ids[0])
                .maybeSingle();
            if (dbProducts) {
                resolvedSingleOriginalPrice =
                    dbProducts.compare_at_price_agorot || dbProducts.price_agorot;
            }
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
            config: buildConfig(parsed.data.type, parsed.data, resolvedSingleOriginalPrice),
            ...(parsed.data.image_path !== undefined
                ? { image_path: parsed.data.image_path.trim() || null }
                : {}),
            sort_order: parsed.data.sort_order,
        })
        .eq("id", id);

    if (error) return { error: te("updatePromotionFailed") };

    // Determine new affected products
    let newAffectedProductIds: string[] = [];
    if (parsed.data.type === "price_deal" && parsed.data.is_active) {
        if (parsed.data.scope_type === "products" && parsed.data.product_ids.length) {
            newAffectedProductIds = parsed.data.product_ids;
        } else if (parsed.data.scope_type === "category" && parsed.data.category_id) {
            newAffectedProductIds = await getCategoryProductIds(admin, parsed.data.category_id);
        }
    }

    // 1. Any product no longer affected gets its own original price restored
    const removedProductIds = oldAffectedProductIds.filter(
        (pid) => !newAffectedProductIds.includes(pid)
    );
    if (removedProductIds.length > 0) {
        await restoreProductsFromDeal(admin, removedProductIds);
        revalidateTag(STORE_CACHE_TAGS.products);
    }

    // 2. Active products in deal get updated with deal price and their own original prices
    if (newAffectedProductIds.length > 0) {
        const dealPrice = shekelInputToAgorot(parsed.data.deal_price_shekels ?? "");
        if (dealPrice != null) {
            await applyPriceDealToProducts(admin, newAffectedProductIds, dealPrice);
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
        .select("image_path, type, scope_type, product_ids, category_id, config")
        .eq("id", id)
        .maybeSingle();

    if (promotion?.image_path) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([promotion.image_path]);
    }

    // Restore product prices if this was a price_deal
    if (promotion?.type === "price_deal") {
        let productIdsToRestore: string[] = [];
        if (promotion.scope_type === "products" && promotion.product_ids?.length) {
            productIdsToRestore = promotion.product_ids;
        } else if (promotion.scope_type === "category" && promotion.category_id) {
            productIdsToRestore = await getCategoryProductIds(admin, promotion.category_id);
        }

        if (productIdsToRestore.length > 0) {
            await restoreProductsFromDeal(admin, productIdsToRestore);
            revalidateTag(STORE_CACHE_TAGS.products);
        }
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
            .select("id, type, scope_type, product_ids, category_id, config")
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

            if (promo.type === "price_deal") {
                let productIdsToRestore: string[] = [];
                if (promo.scope_type === "products" && promo.product_ids?.length) {
                    productIdsToRestore = promo.product_ids;
                } else if (promo.scope_type === "category" && promo.category_id) {
                    productIdsToRestore = await getCategoryProductIds(admin, promo.category_id);
                }

                if (productIdsToRestore.length > 0) {
                    await restoreProductsFromDeal(admin, productIdsToRestore);
                    productsAffected = true;
                }
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