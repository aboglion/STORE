import { PRODUCT_IMAGES_BUCKET } from "@/lib/constants";

/** Public URL for a storage object in the product-images bucket. */
export function storageImageUrl(storagePath: string): string {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return "";

    return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${storagePath}`;
}

/**
 * Best available image URL for a product.
 * Uses the first storage image when one exists; otherwise falls back to a
 * local demo placeholder so the catalog never renders an empty box.
 */
export function productImageUrl(
    storagePath: string | null | undefined,
    slug: string
): string {
    if (storagePath) {
        const url = storageImageUrl(storagePath);
        if (url) return url;
    }
    return demoImageUrl(slug);
}

/** Local demo placeholder for a product, keyed by its slug. */
export function demoImageUrl(slug: string): string {
    return `/products/${slug}.svg`;
}