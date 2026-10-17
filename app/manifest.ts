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

    let storeName = isAr ? "متجري" : "החנות שלי";
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
        short_name: isAr ? "متجري" : "החנות",
        description: isAr
            ? "متجر إلكتروني — طلب سهل وتوصيل حتى البيت"
            : "חנות מקוונת — הזמנה קלה ומשלוח עד הבית",
        start_url: "/",
        display: "standalone",
        background_color: "#FAF6EE",
        theme_color: "#95582b",
        dir: "rtl",
        lang: locale,
        icons: [
            {
                src: "/icon.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any",
            },
        ],
    };
}