/**
 * i18n configuration — cookie-based locale (no URL prefixes).
 *
 * Both locales are RTL; only the `lang` attribute changes.
 */

export const LOCALES = ["he", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

/** Cookie name used by the middleware + setLocale action. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
    return value === "he" || value === "ar";
}

/**
 * Detects the locale from an Accept-Language header.
 * Arabic browsers get Arabic; everything else falls back to Hebrew.
 */
export function detectLocale(
    acceptLanguage: string | null | undefined
): Locale {
    if (!acceptLanguage) return DEFAULT_LOCALE;
    const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
    if (first.startsWith("ar")) return "ar";
    return DEFAULT_LOCALE;
}

/**
 * Picks the localized string for the current locale.
 * Arabic falls back to the Hebrew value when the Arabic field is empty.
 */
export function localizedText(
    locale: Locale,
    he: string,
    ar?: string | null
): string {
    if (locale === "ar" && ar && ar.trim().length > 0) return ar;
    return he;
}
