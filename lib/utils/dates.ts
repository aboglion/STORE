import { format, formatDistanceToNow, formatRelative } from "date-fns";
import { he } from "date-fns/locale";

export function formatDateTime(iso: string): string {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: he });
}

export function formatDate(iso: string): string {
    return format(new Date(iso), "dd/MM/yyyy", { locale: he });
}

export function formatTime(iso: string): string {
    return format(new Date(iso), "HH:mm", { locale: he });
}

export function relativeTime(iso: string): string {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: he });
}

export function formatRelativeDuration(iso: string, base?: string): string {
    return formatRelative(
        new Date(iso),
        base ? new Date(base) : new Date(),
        { locale: he }
    );
}