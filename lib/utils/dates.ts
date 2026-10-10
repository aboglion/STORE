import { format, formatDistanceToNow, formatRelative } from "date-fns";
import { ar, he } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

import type { Locale } from "@/lib/i18n/config";

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { he, ar };

export function formatDateTime(iso: string, locale: Locale = "he"): string {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", {
        locale: DATE_FNS_LOCALES[locale],
    });
}

export function formatDate(iso: string, locale: Locale = "he"): string {
    return format(new Date(iso), "dd/MM/yyyy", {
        locale: DATE_FNS_LOCALES[locale],
    });
}

export function formatTime(iso: string, locale: Locale = "he"): string {
    return format(new Date(iso), "HH:mm", {
        locale: DATE_FNS_LOCALES[locale],
    });
}

export function relativeTime(iso: string, locale: Locale = "he"): string {
    return formatDistanceToNow(new Date(iso), {
        addSuffix: true,
        locale: DATE_FNS_LOCALES[locale],
    });
}

export function formatRelativeDuration(
    iso: string,
    base?: string,
    locale: Locale = "he"
): string {
    return formatRelative(
        new Date(iso),
        base ? new Date(base) : new Date(),
        { locale: DATE_FNS_LOCALES[locale] }
    );
}
