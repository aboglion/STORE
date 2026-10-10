import "server-only";

import type {
    AppSettings,
    Category,
    ProductWithImages,
    StoreThemeKey,
} from "@/types/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { localizedText, type Locale } from "@/lib/i18n/config";

const DEFAULT_SETTINGS: AppSettings = {
    store_name: "החנות שלי",
    store_name_ar: "متجري",
    delivery_fee_agorot: 1500,
    free_delivery_threshold_agorot: 20000,
    low_stock_threshold_default: 5,
    currency: "ILS",
    contact_phone: "",
    logo_url: "",
    theme: "caramel",
};

function mapSettingsRows(rows: Array<{ key: string; value: unknown }>): AppSettings {
    const map = new Map<string, unknown>(rows.map((s) => [s.key, s.value]));

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
        store_name_ar:
            (read("store_name_ar") as string) ?? DEFAULT_SETTINGS.store_name_ar,
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
        logo_url:
            (read("logo_url") as string) ?? DEFAULT_SETTINGS.logo_url,
        theme:
            (read("theme") as StoreThemeKey) ?? DEFAULT_SETTINGS.theme,
    };
}

export async function getSettings(): Promise<AppSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("key, value");

    return mapSettingsRows((data ?? []) as Array<{ key: string; value: unknown }>);
}

/**
 * Settings read that avoids next/headers cookies().
 * Use in the root layout so it can stay prerender-safe.
 */
export async function getPublicSettings(): Promise<AppSettings> {
    const supabase = createPublicClient();
    const { data } = await supabase.from("settings").select("key, value");

    return mapSettingsRows((data ?? []) as Array<{ key: string; value: unknown }>);
}

/** Localized store name with Hebrew fallback. */
export function getStoreName(settings: AppSettings, locale: Locale): string {
    return localizedText(locale, settings.store_name, settings.store_name_ar);
}

export async function getStorefrontCategories(
    locale: Locale
): Promise<Category[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    const categories = (data ?? []) as Category[];
    return categories.sort((a, b) =>
        localizedText(locale, a.name_he, a.name_ar).localeCompare(
            localizedText(locale, b.name_he, b.name_ar),
            locale === "ar" ? "ar" : "he"
        )
    );
}

export async function getStorefrontProducts(
    categorySlug?: string,
    locale: Locale = "he"
): Promise<{
    products: ProductWithImages[];
}> {
    const supabase = await createClient();

    const { data } = await supabase
        .from("products")
        .select("*, images:product_images(id, storage_path, alt_text, sort_order)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    let products = (data ?? []) as ProductWithImages[];

    if (categorySlug) {
        const categories = await getStorefrontCategories(locale);
        const category = categories.find((c) => c.slug === categorySlug);
        if (category) {
            products = products.filter((p) => p.category_id === category.id);
        }
    }

    products = products.sort((a, b) =>
        localizedText(locale, a.name_he, a.name_ar).localeCompare(
            localizedText(locale, b.name_he, b.name_ar),
            locale === "ar" ? "ar" : "he"
        )
    );

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
