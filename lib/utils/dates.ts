import { formatDistanceToNow, formatRelative } from "date-fns";
import { ar, he } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

import type { Locale } from "@/lib/i18n/config";

export const ISRAEL_TIMEZONE = "Asia/Jerusalem";

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { he, ar };

function toValidDate(input: string | Date | null | undefined): Date | null {
    if (!input) return null;
    const d = typeof input === "string" ? new Date(input) : input;
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date/timestamp in Israel timezone (Asia/Jerusalem) as "dd/MM/yyyy HH:mm".
 */
export function formatDateTime(
    iso: string | Date | null | undefined,
    _locale: Locale = "he"
): string {
    const d = toValidDate(iso);
    if (!d) return "";

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: ISRAEL_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(d);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "";

    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

/**
 * Formats a date/timestamp in Israel timezone (Asia/Jerusalem) as "dd/MM/yyyy".
 */
export function formatDate(
    iso: string | Date | null | undefined,
    _locale: Locale = "he"
): string {
    const d = toValidDate(iso);
    if (!d) return "";

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: ISRAEL_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).formatToParts(d);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "";

    return `${get("day")}/${get("month")}/${get("year")}`;
}

/**
 * Formats a date/timestamp in Israel timezone (Asia/Jerusalem) as "HH:mm".
 */
export function formatTime(
    iso: string | Date | null | undefined,
    _locale: Locale = "he"
): string {
    const d = toValidDate(iso);
    if (!d) return "";

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: ISRAEL_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(d);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "";

    return `${get("hour")}:${get("minute")}`;
}

/**
 * Relative time description (e.g., "לפני 5 דקות" / "منذ 5 دقائق").
 */
export function relativeTime(
    iso: string | Date | null | undefined,
    locale: Locale = "he"
): string {
    const d = toValidDate(iso);
    if (!d) return "";

    return formatDistanceToNow(d, {
        addSuffix: true,
        locale: DATE_FNS_LOCALES[locale] ?? he,
    });
}

/**
 * Relative duration between a date and a base date.
 */
export function formatRelativeDuration(
    iso: string | Date,
    base?: string | Date,
    locale: Locale = "he"
): string {
    const d = toValidDate(iso) ?? new Date();
    const b = (base ? toValidDate(base) : null) ?? new Date();
    return formatRelative(d, b, { locale: DATE_FNS_LOCALES[locale] ?? he });
}

/**
 * Computes the exact UTC instant representing midnight (00:00:00) of the current day
 * in the Israel timezone (Asia/Jerusalem). Handles DST transitions cleanly.
 */
export function getIsraelStartOfDayUtc(now: Date = new Date()): Date {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: ISRAEL_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);

    const map = new Map(parts.map((p) => [p.type, p.value]));
    const y = +map.get("year")!;
    const mo = +map.get("month")!;
    const d = +map.get("day")!;

    const candidate = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
    const candParts = new Intl.DateTimeFormat("en-US", {
        timeZone: ISRAEL_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(candidate);

    const getCand = (type: string) => candParts.find((p) => p.type === type)?.value ?? "0";
    const deltaMin = +getCand("hour") * 60 + +getCand("minute");
    return new Date(candidate.getTime() - deltaMin * 60_000);
}

/**
 * Formats a Date into a string suitable for HTML datetime-local inputs
 * ("YYYY-MM-DDTHH:mm") in Israel timezone.
 */
export function toIsraelDatetimeLocal(date: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: ISRAEL_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "00";

    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
