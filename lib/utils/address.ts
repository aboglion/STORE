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

/**
 * Formats a Nominatim display_name into a short customer-facing address line.
 *
 * Nominatim names look like:
 *   "Herzl St 12, Haifa, Haifa District, 3300000, Israel"
 *   "הרצל 12, חיפה, מחוז חיפה, 3300000, ישראל"
 *
 * We keep the first two meaningful segments (street + city) and drop the
 * district / postcode / country tail so the value fits the address textbox.
 */
export function formatGeocodedAddress(displayName: string): string {
    const parts = (displayName || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return parts.slice(0, 2).join(", ");
}

/**
 * Best-guess city segment from a Nominatim display_name.
 *
 * The city is typically the 2nd segment (index 1). Returns null when there
 * is no city segment. The caller matches the result against the Israel
 * settlements list (findIsraelCity) to autofill the city field.
 */
export function extractCitySegment(displayName: string): string | null {
    const parts = (displayName || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length < 2) return null;
    return parts[1] ?? null;
}