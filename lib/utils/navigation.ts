/**
 * Navigation deep-links used by the courier portal (Navigate sheet).
 * Falls back to a maps address-search URL when the order has no coordinates.
 */

export type NavigationApp = "waze" | "google" | "apple";

export interface NavigationTarget {
    app: NavigationApp;
    /** Full external URL — open with window.open(url, "_blank", "noopener"). */
    url: string;
    /** Short label used in the sheet (localized by the caller). */
    labelKey: string;
}

function coordsUrlTargets(lat: number, lng: number): Omit<NavigationTarget, "labelKey">[] {
    return [
        { app: "waze", url: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
        {
            app: "google",
            url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
        },
        { app: "apple", url: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` },
    ];
}

/** Address-search fallback when the order has no saved coordinates. */
export function addressSearchUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function navigationTargets(
    lat: number | null | undefined,
    lng: number | null | undefined,
    address: string
): NavigationTarget[] {
    if (typeof lat === "number" && typeof lng === "number") {
        const labelKeys: Record<NavigationApp, string> = {
            waze: "nav.waze",
            google: "nav.google",
            apple: "nav.apple",
        };
        return coordsUrlTargets(lat, lng).map((t) => ({
            ...t,
            labelKey: labelKeys[t.app],
        }));
    }

    const searchUrl = addressSearchUrl(address || "");
    return [
        { app: "waze", url: searchUrl, labelKey: "nav.waze" },
        { app: "google", url: searchUrl, labelKey: "nav.google" },
        { app: "apple", url: searchUrl, labelKey: "nav.apple" },
    ];
}

/**
 * Preferred order for the navigate sheet based on the device:
 * iOS devices list Apple Maps first, everything else lists Waze first
 * (Waze is the most common navigation app in Israel).
 */
export function sortedNavigationTargets(
    targets: NavigationTarget[],
    isIos: boolean
): NavigationTarget[] {
    const rank: Record<NavigationApp, number> = isIos
        ? { apple: 0, waze: 1, google: 2 }
        : { waze: 0, google: 1, apple: 2 };
    return [...targets].sort((a, b) => rank[a.app] - rank[b.app]);
}

export function isIosDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}