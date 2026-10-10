import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import type {
    AppSettings,
    Category,
    ProductWithImages,
    StoreThemeKey,
} from "@/types/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { localizedText, type Locale } from "@/lib/i18n/config";

/**
 * Cache tags used by the storefront data layer.
 * Admin mutations call revalidateTag(...) with these tags so the
 * storefront reflects changes immediately without a full redeploy.
 */
export const STORE_CACHE_TAGS = {
    settings: "settings",
    categories: "categories",
    products: "products",
} as const;

/** Safety-net revalidation window for storefront data (seconds). */
const STORE_CACHE_REVALIDATE = 300;

const DEFAULT_SETTINGS: AppSettings = {
    store_name: "החנות שלי",
    store_name_ar: "متجري",
    legal_business_name: "מאפיית הבוטיק בע״מ",
    business_id: "516000000",
    business_address: "רחוב הרצל 1, תל אביב-יפו",
    business_email: "support@store.co.il",
    business_hours: "א׳-ה׳ 08:00-20:00, ו׳ 08:00-14:00",
    accessibility_officer_name: "שירות לקוחות ונגישות",
    accessibility_officer_phone: "03-0000000",
    accessibility_officer_email: "accessibility@store.co.il",
    delivery_fee_agorot: 1500,
    free_delivery_threshold_agorot: 20000,
    low_stock_threshold_default: 5,
    currency: "ILS",
    contact_phone: "03-0000000",
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
        legal_business_name:
            (read("legal_business_name") as string) || DEFAULT_SETTINGS.legal_business_name,
        business_id:
            (read("business_id") as string) || DEFAULT_SETTINGS.business_id,
        business_address:
            (read("business_address") as string) || DEFAULT_SETTINGS.business_address,
        business_email:
            (read("business_email") as string) || DEFAULT_SETTINGS.business_email,
        business_hours:
            (read("business_hours") as string) || DEFAULT_SETTINGS.business_hours,
        accessibility_officer_name:
            (read("accessibility_officer_name") as string) || DEFAULT_SETTINGS.accessibility_officer_name,
        accessibility_officer_phone:
            (read("accessibility_officer_phone") as string) || DEFAULT_SETTINGS.accessibility_officer_phone,
        accessibility_officer_email:
            (read("accessibility_officer_email") as string) || DEFAULT_SETTINGS.accessibility_officer_email,
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

// ---------------------------------------------------------------------------
// Cached readers
//
// All storefront reads go through the cookies-free public client (RLS already
// restricts reads to active rows) and are wrapped in unstable_cache so the
// production server does not hit Supabase on every request. React cache()
// additionally dedupes within a single request (e.g. product page +
// generateMetadata, or categories fetched twice on a filtered home page).
// ---------------------------------------------------------------------------

const getSettingsCached = unstable_cache(
    async (): Promise<AppSettings> => {
        const supabase = createPublicClient();
        const { data } = await supabase.from("settings").select("key, value");
        return mapSettingsRows((data ?? []) as Array<{ key: string; value: unknown }>);
    },
    ["settings"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.settings] }
);

const getCategoriesCached = unstable_cache(
    async (): Promise<Category[]> => {
        const supabase = createPublicClient();
        const { data } = await supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });
        return (data ?? []) as Category[];
    },
    ["categories"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.categories] }
);

const getProductsCached = unstable_cache(
    async (): Promise<ProductWithImages[]> => {
        const supabase = createPublicClient();
        const { data } = await supabase
            .from("products")
            .select("*, images:product_images(id, storage_path, alt_text, sort_order)")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });
        return (data ?? []) as ProductWithImages[];
    },
    ["products"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.products] }
);

const getProductBySlugCached = unstable_cache(
    async (slug: string): Promise<ProductWithImages | null> => {
        const supabase = createPublicClient();
        const { data } = await supabase
            .from("products")
            .select("*, images:product_images(*)")
            .eq("slug", slug)
            .eq("is_active", true)
            .maybeSingle();
        return (data as ProductWithImages) ?? null;
    },
    ["product-by-slug"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.products] }
);

/** Settings read for the storefront (cached, cookies-free). */
export const getSettings = cache(async (): Promise<AppSettings> => {
    return getSettingsCached();
});

/**
 * Settings read that avoids next/headers cookies().
 * Use in the root layout so it can stay prerender-safe.
 */
export const getPublicSettings = cache(async (): Promise<AppSettings> => {
    return getSettingsCached();
});

/** Localized store name with Hebrew fallback. */
export function getStoreName(settings: AppSettings, locale: Locale): string {
    return localizedText(locale, settings.store_name, settings.store_name_ar);
}

export const getStorefrontCategories = cache(
    async (locale: Locale): Promise<Category[]> => {
        const categories = await getCategoriesCached();
        return [...categories].sort((a, b) =>
            localizedText(locale, a.name_he, a.name_ar).localeCompare(
                localizedText(locale, b.name_he, b.name_ar),
                locale === "ar" ? "ar" : "he"
            )
        );
    }
);

export const getStorefrontProducts = cache(
    async (
        categorySlug?: string,
        locale: Locale = "he"
    ): Promise<{
        products: ProductWithImages[];
    }> => {
        const [products, categories] = await Promise.all([
            getProductsCached(),
            categorySlug ? getStorefrontCategories(locale) : Promise.resolve([]),
        ]);

        let filtered = products;
        if (categorySlug) {
            const category = categories.find((c) => c.slug === categorySlug);
            if (category) {
                filtered = products.filter((p) => p.category_id === category.id);
            }
        }

        const sorted = [...filtered].sort((a, b) =>
            localizedText(locale, a.name_he, a.name_ar).localeCompare(
                localizedText(locale, b.name_he, b.name_ar),
                locale === "ar" ? "ar" : "he"
            )
        );

        return { products: sorted };
    }
);

export const getPublicProductBySlug = cache(
    async (slug: string): Promise<ProductWithImages | null> => {
        return getProductBySlugCached(slug);
    }
);
