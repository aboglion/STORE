import type { AddressSnapshot } from "@/types/database.types";

/**
 * Client-safe helpers for reasoning about an order's location quality.
 * (lib/data/orders.ts is server-only, so the admin UI uses this instead.)
 */

export type OrderLocationStatus = "missing" | "imprecise" | "ok";

/**
 * Classifies an order's address snapshot:
 *   - "missing"   — no coordinates at all (courier map drops the stop).
 *   - "imprecise" — coordinates exist but are only city-level (low confidence).
 *   - "ok"        — building/street-level coordinates.
 */
export function orderLocationStatus(
    snapshot: AddressSnapshot | null | undefined
): OrderLocationStatus {
    if (!snapshot) return "missing";
    const hasCoords = snapshot.lat != null && snapshot.lng != null;
    if (!hasCoords) return "missing";
    if (snapshot.location_confidence === "low") return "imprecise";
    return "ok";
}

/** True when the order should be flagged for admin/courier attention. */
export function needsLocationAttention(
    snapshot: AddressSnapshot | null | undefined
): boolean {
    return orderLocationStatus(snapshot) !== "ok";
}