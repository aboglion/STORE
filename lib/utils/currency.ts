import type { Locale } from "@/lib/i18n/config";

/**
 * All money in the database is stored as integer agorot.
 * 100 agorot = 1 ILS. Everything below converts to/from display.
 */

/** 1250 agorot → "12.50 ₪" (Latin digits in both locales) */
export function formatILS(agorot: number, locale: Locale = "he"): string {
    return new Intl.NumberFormat(locale === "ar" ? "ar" : "he-IL", {
        style: "currency",
        currency: "ILS",
        numberingSystem: "latn",
    })
        .format(agorot / 100)
        .replace(/[\u200e\u200f]/g, "")
        .replace(/[\u00a0\u202f]/g, " ");
}

/** 1250 agorot → "12.50" (for form inputs) */
export function agorotToShekelInput(agorot: number): string {
    return (agorot / 100).toFixed(2).replace(/\.00$/, "");
}

/**
 * Parses a shekel string ("12.50", "12,5", "12") to agorot.
 * Returns null when the input is not a valid non-negative amount.
 */
export function shekelInputToAgorot(input: string): number | null {
    const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

    const value = Number(cleaned);
    if (!Number.isFinite(value) || value < 0) return null;

    return Math.round(value * 100);
}

/** 12.345 → 1235 agorot (defensive rounding for float inputs) */
export function shekelsToAgorot(shekels: number): number {
    return Math.round(shekels * 100);
}
