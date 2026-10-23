"use server";

import { z } from "zod";

import { getActivePromotions } from "@/lib/data/promotions";
import { getSettings } from "@/lib/data/storefront";
import { createAdminClient } from "@/lib/supabase/admin";
import { productImageUrl } from "@/lib/utils/images";
import type { Promotion } from "@/types/database.types";

export interface CartProductDetail {
    id: string;
    slug: string;
    name_he: string;
    name_ar: string | null;
    price_agorot: number;
    category_id: string | null;
    stock_quantity: number;
    is_active: boolean;
    image_url: string | null;
}

const cartProductIdsSchema = z.array(z.string().uuid()).max(50);

/**
 * Returns fresh product data for cart rendering. The cart itself is stored
 * in localStorage; prices displayed here always come from the server and are
 * never trusted during checkout (the create_order RPC recomputes them).
 */
export async function getCartProductDetails(
    productIds: string[]
): Promise<CartProductDetail[]> {
    const parsed = cartProductIdsSchema.safeParse(productIds);
    if (!parsed.success) return [];

    const ids = Array.from(new Set(parsed.data));
    if (ids.length === 0) return [];

    const admin = createAdminClient();
    const { data } = await admin
        .from("products")
        .select(
            "id, slug, name_he, name_ar, price_agorot, category_id, stock_quantity, is_active, images:product_images(id, storage_path, sort_order)"
        )
        .in("id", ids);

    const items = (data ?? []) as Array<{
        id: string;
        slug: string;
        name_he: string;
        name_ar: string | null;
        price_agorot: number;
        category_id: string | null;
        stock_quantity: number;
        is_active: boolean;
        images: { id: string; storage_path: string; sort_order: number }[];
    }>;

    return items.map((p) => ({
        id: p.id,
        slug: p.slug,
        name_he: p.name_he,
        name_ar: p.name_ar,
        price_agorot: p.price_agorot,
        category_id: p.category_id,
        stock_quantity: p.stock_quantity,
        is_active: p.is_active,
        image_url: productImageUrl(p.images[0]?.storage_path, p.slug),
    }));
}

export interface CartPricingData {
    products: CartProductDetail[];
    settings: {
        delivery_fee_agorot: number;
        free_delivery_threshold_agorot: number;
    };
    promotions: Promotion[];
}

/**
 * Everything the cart/checkout UI needs to render live pricing:
 * fresh product rows, the delivery settings and the active promotions.
 * The authoritative total is always recomputed server-side at checkout.
 */
export async function getCartPricing(
    productIds: string[]
): Promise<CartPricingData> {
    const [products, settings, promotions] = await Promise.all([
        getCartProductDetails(productIds),
        getSettings(),
        getActivePromotions(),
    ]);

    return {
        products,
        settings: {
            delivery_fee_agorot: settings.delivery_fee_agorot,
            free_delivery_threshold_agorot:
                settings.free_delivery_threshold_agorot,
        },
        promotions,
    };
}
