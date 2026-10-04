/**
 * All money in the database is stored as integer agorot.
 * 100 agorot = 1 ILS. Everything below converts to/from display.
 */

/** 1250 agorot → "12.50 ₪" (he-IL formatting) */
export function formatILS(agorot: number): string {
    return new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
    }).format(agorot / 100);
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