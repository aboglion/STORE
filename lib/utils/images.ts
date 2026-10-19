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

/**
 * Generates an ultra-lightweight inline SVG Data URL for Next.js Image placeholder="blur".
 * Renders instantly (0ms network request) with a smooth gaussian blur & subtle gradient.
 */
export function getBlurSvgDataUrl(width = 40, height = 40): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="50%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <filter id="b" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="8" />
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)" />
  <circle cx="${Math.round(width / 2)}" cy="${Math.round(height / 2)}" r="${Math.round(Math.min(width, height) / 3)}" fill="#94a3b8" filter="url(#b)" opacity="0.3" />
</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_BLUR_DATA_URL = getBlurSvgDataUrl(40, 40);