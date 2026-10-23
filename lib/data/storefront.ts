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
    promotions: "promotions",
} as const;

/** Safety-net revalidation window for storefront data (seconds). */
const STORE_CACHE_REVALIDATE = 300;

const DEFAULT_SETTINGS: AppSettings = {
    store_name: "גולדן מארקט",
    store_name_ar: "جولدن ماركت",
    legal_business_name: "גולדן מארקט בע״מ",
    business_id: "516000000",
    business_address: "מתחם 3, מול היכל התרבות, רהט",
    business_email: "support@goldenmarket.co.il",
    business_hours: "א׳-ש׳ 09:00-22:00",
    accessibility_officer_name: "שירות לקוחות ונגישות",
    accessibility_officer_phone: "08-6000000",
    accessibility_officer_email: "accessibility@goldenmarket.co.il",
    delivery_fee_agorot: 1500,
    free_delivery_threshold_agorot: 20000,
    low_stock_threshold_default: 5,
    currency: "ILS",
    contact_phone: "08-6000000",
    logo_url: "",
    theme: "caramel",
    promotions_banner: {
        image_path: "",
        title_he: "",
        title_ar: "",
        enabled: false,
    },
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
        promotions_banner: (() => {
            // Settings rows store the actual value under the `value` key.
            // The banner (saved by updatePromotionsBanner) stores a nested
            // object under that same key, so unwrap it here. Both shapes are
            // supported so already-saved banners display correctly.
            const bannerValue = read("promotions_banner") as
                | { value?: unknown }
                | null
                | undefined;
            const banner = (bannerValue?.value ?? bannerValue) as {
                image_path?: string;
                title_he?: string;
                title_ar?: string;
                enabled?: boolean;
            } | null | undefined;
            return {
                image_path:
                    banner?.image_path ??
                    DEFAULT_SETTINGS.promotions_banner.image_path,
                title_he:
                    banner?.title_he ??
                    DEFAULT_SETTINGS.promotions_banner.title_he,
                title_ar:
                    banner?.title_ar ??
                    DEFAULT_SETTINGS.promotions_banner.title_ar,
                enabled:
                    banner?.enabled ??
                    DEFAULT_SETTINGS.promotions_banner.enabled,
            };
        })(),
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
        const [{ data: categories }, { data: counts }] = await Promise.all([
            supabase
                .from("categories")
                .select("*")
                .eq("is_active", true)
                .order("sort_order", { ascending: true }),
            supabase
                .from("category_product_counts")
                .select("category_id, product_count"),
        ]);
        const countMap = new Map<string, number>(
            (counts ?? []).map((c: { category_id: string; product_count: number }) => [
                c.category_id,
                c.product_count,
            ])
        );
        return ((categories ?? []) as Category[]).map((cat) => ({
            ...cat,
            product_count: countMap.get(cat.id) ?? 0,
        }));
    },
    ["categories"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.categories] }
);

async function fetchAllProductsForCategory(categoryId: string): Promise<ProductWithImages[]> {
    const supabase = createPublicClient();
    const pageSize = 1000;
    let from = 0;
    const all: ProductWithImages[] = [];
    while (true) {
        const { data, error } = await supabase
            .from("products")
            .select("*, images:product_images(id, storage_path, alt_text, sort_order)")
            .eq("category_id", categoryId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        all.push(...(data as ProductWithImages[]));
        if (data.length < pageSize) break;
        from += pageSize;
    }
    return all;
}

const getCategoryProductsCached = unstable_cache(
    async (categoryId: string): Promise<ProductWithImages[]> => {
        return fetchAllProductsForCategory(categoryId);
    },
    ["category-products"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.products] }
);

const getTotalProductsCountCached = unstable_cache(
    async (): Promise<number> => {
        const supabase = createPublicClient();
        const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true);
        return count ?? 0;
    },
    ["total-products-count"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.products] }
);

export const getTotalProductCount = cache(async (): Promise<number> => {
    return getTotalProductsCountCached();
});

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
        if (!categorySlug) {
            return { products: [] };
        }

        const categories = await getStorefrontCategories(locale);
        const category = categories.find((c) => c.slug === categorySlug);
        if (!category) {
            return { products: [] };
        }

        const products = await getCategoryProductsCached(category.id);
        const sorted = [...products].sort((a, b) =>
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
