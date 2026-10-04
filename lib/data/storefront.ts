import "server-only";

import type {
    AppSettings,
    Category,
    ProductWithImages,
} from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_SETTINGS: AppSettings = {
    store_name: "החנות שלי",
    delivery_fee_agorot: 1500,
    free_delivery_threshold_agorot: 20000,
    low_stock_threshold_default: 5,
    currency: "ILS",
    contact_phone: "",
};

export async function getSettings(): Promise<AppSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("key, value");

    const map = new Map<string, unknown>(
        (data ?? []).map((s) => [s.key, s.value])
    );

    const read = (key: keyof AppSettings): unknown => {
        const raw = map.get(key);
        if (raw && typeof raw === "object") {
            return (raw as { value?: unknown }).value;
        }
        return undefined;
    };

    return {
        store_name:
            (read("store_name") as string) ?? DEFAULT_SETTINGS.store_name,
        delivery_fee_agorot:
            (read("delivery_fee_agorot") as number) ??
            DEFAULT_SETTINGS.delivery_fee_agorot,
        free_delivery_threshold_agorot:
            (read("free_delivery_threshold_agorot") as number) ??
            DEFAULT_SETTINGS.free_delivery_threshold_agorot,
        low_stock_threshold_default:
            (read("low_stock_threshold_default") as number) ??
            DEFAULT_SETTINGS.low_stock_threshold_default,
        currency:
            (read("currency") as string) ?? DEFAULT_SETTINGS.currency,
        contact_phone:
            (read("contact_phone") as string) ?? DEFAULT_SETTINGS.contact_phone,
    };
}

export async function getStorefrontCategories(): Promise<Category[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    return (data ?? []) as Category[];
}

export async function getStorefrontProducts(categorySlug?: string): Promise<{
    products: ProductWithImages[];
}> {
    const supabase = await createClient();

    const { data } = await supabase
        .from("products")
        .select("*, images:product_images(id, storage_path, alt_text, sort_order)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name_he", { ascending: true });

    let products = (data ?? []) as ProductWithImages[];

    if (categorySlug) {
        const categories = await getStorefrontCategories();
        const category = categories.find((c) => c.slug === categorySlug);
        if (category) {
            products = products.filter((p) => p.category_id === category.id);
        }
    }

    return { products };
}

export async function getPublicProductBySlug(
    slug: string
): Promise<ProductWithImages | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("products")
        .select("*, images:product_images(*)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

    return (data as ProductWithImages) ?? null;
}