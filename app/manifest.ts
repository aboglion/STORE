import type { MetadataRoute } from "next";
import { cookies } from "next/headers";

import { getPublicSettings } from "@/lib/data/storefront";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

/**
 * Web App Manifest route (served at `/manifest.webmanifest`).
 *
 * The W3C spec requires `name`, `short_name` and `description` to be plain
 * strings — browsers ignore the `{ lang, value }` object array form and log
 * "property ignored, type string expected". This route localizes those fields
 * for the visitor's locale (from the NEXT_LOCALE cookie) and returns valid
 * string values, so the console stays clean in both Hebrew and Arabic.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const cookieStore = await cookies();
    const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale: Locale = isLocale(rawLocale) ? rawLocale : "he";
    const isAr = locale === "ar";

    let storeName = isAr ? "جولدن ماركت" : "גולדן מארקט";
    try {
        const settings = await getPublicSettings();
        storeName = isAr
            ? settings.store_name_ar || settings.store_name || storeName
            : settings.store_name || storeName;
    } catch {
        // Keep the defaults when settings are unavailable.
    }

    return {
        name: storeName,
        short_name: isAr ? "جولدن ماركت" : "גולדן מארקט",
        description: isAr
            ? "سوبر ماركت جولدن ماركت رهط — طلب سهل وتوصيل حتى البيت"
            : "סופרמרקט גולדן מארקט רהט — הזמנה קלה ומשלוח עד הבית",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#FAF6EE",
        theme_color: "#95582b",
        dir: "rtl",
        lang: locale,
        prefer_related_applications: false,
        icons: [
            {
                src: "/icon.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any",
            },
            {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon-maskable-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/icon-maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
        shortcuts: [
            {
                name: isAr ? "الكتالوج" : "הקטלוג",
                short_name: isAr ? "الكتالوج" : "קטלוג",
                description: isAr ? "تصفح جميع المنتجات" : "צפייה בכל המוצרים",
                url: "/",
                icons: [{ src: "/icon-192.png", sizes: "192x192" }],
            },
            {
                name: isAr ? "طلباتي" : "ההזמנות שלי",
                short_name: isAr ? "طلباتي" : "הזמנות",
                description: isAr ? "מעקב אחר ההזמנות שלי" : "מעקב אחר ההזמנות שלי",
                url: "/orders",
                icons: [{ src: "/icon-192.png", sizes: "192x192" }],
            },
        ],
    };
}