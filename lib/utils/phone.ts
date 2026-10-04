import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normalizes an Israeli phone number to E.164 (+972XXXXXXXXX).
 * Returns null when the input cannot be parsed as a valid Israeli
 * number. Accepts: 0501234567, 050-123-4567, +972501234567, ...
 */
export function normalizeIsraeliPhone(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Preferred path: let libphonenumber-js do the parsing.
    try {
        const parsed = parsePhoneNumberFromString(trimmed, "IL");
        if (parsed?.isValid() && parsed.country === "IL") {
            return parsed.number; // "+972501234567"
        }
    } catch {
        // fall through to the manual path
    }

    // Manual fallback: keep only digits.
    let digits = trimmed.replace(/\D+/g, "");
    if (!digits) return null;

    if (digits.startsWith("972")) {
        digits = digits.slice(3);
    } else if (digits.startsWith("0")) {
        digits = digits.slice(1);
    }

    if (digits.length > 10) return null;

    const candidate = `+972${digits}`;
    return isValidPhoneNumber(candidate) ? candidate : null;
}

/**
 * Formats an E.164 Israeli number for display: 050-123-4567 / 03-123-4567.
 * Falls back to the raw input when the format is unexpected.
 */
export function formatIsraeliPhone(phone: string): string {
    if (!phone.startsWith("+972")) return phone;

    const national = phone.slice(4); // strip +972

    if (national.length === 9 && national.startsWith("5")) {
        return `0${national.slice(0, 2)}-${national.slice(2, 5)}-${national.slice(5)}`;
    }

    if (national.length === 8) {
        return `0${national.slice(0, 1)}-${national.slice(1, 4)}-${national.slice(4)}`;
    }

    return phone;
}

/** True when the user's phone input parses to a valid Israeli number. */
export function isValidIsraeliPhone(input: string): boolean {
    return normalizeIsraeliPhone(input) !== null;
}