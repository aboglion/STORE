/**
 * Normalizes a free-text address so identical addresses typed
 * slightly differently map to the same key:
 *   - trims whitespace
 *   - lowercases
 *   - strips punctuation (.,;'"()[] and Hebrew geresh/gershayim)
 *   - collapses repeated whitespace
 */
export function normalizeAddress(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[.,;'"()\[\]{}<>/\\_\-]/g, " ")
        .replace(/[\u05BE\u05F3\u05F4]/g, " ") // Hebrew maqaf, geresh, gershayim
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Composes a single display line from address parts.
 * (falls back to full_address when parts are missing)
 */
export function composeAddressLine(input: {
    full_address: string;
    street?: string | null;
    house_number?: string | null;
    entrance?: string | null;
    apartment?: string | null;
    city?: string | null;
}): string {
    const parts = [
        input.street,
        input.house_number,
        input.entrance ? `כניסה ${input.entrance}` : null,
        input.apartment ? `דירה ${input.apartment}` : null,
        input.city,
    ].filter(Boolean);

    if (parts.length === 0) return input.full_address;
    return parts.join(" ");
}