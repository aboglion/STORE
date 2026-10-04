"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { storageImageUrl } from "@/lib/utils/images";

export interface CartProductDetail {
    id: string;
    slug: string;
    name_he: string;
    price_agorot: number;
    stock_quantity: number;
    is_active: boolean;
    image_url: string | null;
}

/**
 * Returns fresh product data for cart rendering. The cart itself is stored
 * in localStorage; prices displayed here always come from the server and are
 * never trusted during checkout (the create_order RPC recomputes them).
 */
export async function getCartProductDetails(
    productIds: string[]
): Promise<CartProductDetail[]> {
    const ids = Array.from(new Set(productIds));
    if (ids.length === 0) return [];

    const admin = createAdminClient();
    const { data } = await admin
        .from("products")
        .select(
            "id, slug, name_he, price_agorot, stock_quantity, is_active, images:product_images(id, storage_path, sort_order)"
        )
        .in("id", ids);

    const items = (data ?? []) as Array<{
        id: string;
        slug: string;
        name_he: string;
        price_agorot: number;
        stock_quantity: number;
        is_active: boolean;
        images: { id: string; storage_path: string; sort_order: number }[];
    }>;

    return items.map((p) => ({
        id: p.id,
        slug: p.slug,
        name_he: p.name_he,
        price_agorot: p.price_agorot,
        stock_quantity: p.stock_quantity,
        is_active: p.is_active,
        image_url: p.images[0]
            ? storageImageUrl(p.images[0].storage_path)
            : null,
    }));
}