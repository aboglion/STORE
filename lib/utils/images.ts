import { PRODUCT_IMAGES_BUCKET } from "@/lib/constants";

const KNOWN_DEMO_SLUGS = new Set([
    "baguette",
    "cheesecake",
    "chocolate-cake",
    "coffee-beans",
    "feta",
    "olive-mix",
    "orange-juice",
    "sourdough",
]);

/**
 * Public URL for a storage object in the product-images bucket.
 */
export function storageImageUrl(storagePath: string): string {
    if (!storagePath) return "";

    const base =
        process.env.SUPABASE_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "http://127.0.0.1:54321";

    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
        return storagePath;
    }

    const cleanPath = storagePath.startsWith("/")
        ? storagePath.slice(1)
        : storagePath;

    return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${cleanPath}`;
}

/**
 * Best available image URL for a product.
 * Uses the first storage image when one exists; otherwise falls back to a
 * demo placeholder so the catalog never renders a broken box.
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

/** Demo placeholder for a product, keyed by its slug or fallback generic. */
export function demoImageUrl(slug: string): string {
    if (slug && KNOWN_DEMO_SLUGS.has(slug)) {
        return `/products/${slug}.svg`;
    }
    return "/products/placeholder.svg";
}