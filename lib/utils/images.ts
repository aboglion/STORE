import { PRODUCT_IMAGES_BUCKET } from "@/lib/constants";

/** Public URL for a storage object in the product-images bucket. */
export function storageImageUrl(storagePath: string): string {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return "";

    return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${storagePath}`;
}