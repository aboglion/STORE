import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAddress } from "@/lib/utils/address";
import type { LocationConfidence } from "@/types/database.types";

/**
 * Server-side Nominatim (OpenStreetMap) geocoding.
 *
 * Policy compliance (https://operations.osmfoundation.org/policies/nominatim/):
 *   - All requests carry a custom User-Agent identifying this app.
 *   - A shared in-memory token bucket enforces ≤ 1 request/second.
 *   - Results are cached in `geocode_cache` so repeated addresses never
 *     re-hit the public service.
 *   - Requests time out (~4s) and every failure degrades gracefully —
 *     geocoding is a best-effort enhancement, never a blocker.
 *
 * This module is the ONLY place that talks to Nominatim. The browser proxy
 * (app/api/geocode/route.ts) and the createOrder fallback both call it, so
 * the throttle and cache are shared.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT =
    "OmarBakeryDelivery/1.0 (https://omar.example.com; contact@example.com)";
const TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type GeocodeConfidence = LocationConfidence | "none";

export interface GeocodeResult {
    lat: number | null;
    lng: number | null;
    confidence: GeocodeConfidence;
    display_name: string | null;
}

export interface GeocodeAddressInput {
    city?: string | null;
    street?: string | null;
    house_number?: string | null;
    full_address: string;
}

// ---------------------------------------------------------------------------
// Confidence mapping
// ---------------------------------------------------------------------------

const HIGH_TYPES = new Set([
    "building", "house", "residential", "apartments", "amenity", "shop",
    "office", "tourism", "hotel", "hospital", "school", "university",
    "college", "kindergarten", "place_of_worship", "commercial", "industrial",
    "public_building", "healthcare", "education", "leisure", "sport",
    "craft", "club", "government", "military", "religion", "service",
    "social_facility", "catering", "food", "library", "museum", "theatre",
    "cinema", "bank", "post_office", "police", "fire_station", "townhall",
    "courthouse", "embassy", "guest_house", "hostel", "motel", "dormitory",
    "farm", "warehouse", "works", "yes",
]);

const MEDIUM_TYPES = new Set([
    "road", "street", "highway", "pedestrian", "footway", "cycleway",
    "path", "track", "bridleway", "steps", "corridor", "platform",
    "service_road", "living_street", "primary", "secondary", "tertiary",
    "unclassified", "residential_road", "bus_stop", "address", "square",
    "traffic_signals", "crossing",
]);

const LOW_TYPES = new Set([
    "city", "town", "village", "hamlet", "locality", "suburb",
    "neighbourhood", "neighborhood", "quarter", "borough", "municipality",
    "county", "district", "region", "state", "province", "country",
    "island", "islet", "peninsula", "postcode", "administrative",
]);

/**
 * Maps a Nominatim result to a confidence level.
 * Pure function — unit tested.
 */
export function mapConfidence(
    addresstype?: string | null,
    type?: string | null,
    klass?: string | null
): GeocodeConfidence {
    const key = (addresstype || type || klass || "").toLowerCase();
    if (HIGH_TYPES.has(key)) return "high";
    if (MEDIUM_TYPES.has(key)) return "medium";
    if (LOW_TYPES.has(key)) return "low";
    // A real coordinate was found but the type is unknown — treat as medium.
    return key ? "medium" : "none";
}

// ---------------------------------------------------------------------------
// Cache keys (pure — unit tested)
// ---------------------------------------------------------------------------

export function buildForwardCacheKey(input: GeocodeAddressInput): string {
    const line = [input.house_number, input.street, input.city]
        .filter((p) => p && p.trim())
        .join(", ");
    const query = line.trim() || input.full_address;
    return `fwd:${normalizeAddress(query)}`;
}

export function buildReverseCacheKey(lat: number, lng: number): string {
    return `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
}

// ---------------------------------------------------------------------------
// Cache (best-effort; failures never propagate)
// ---------------------------------------------------------------------------

async function readCache(queryNorm: string): Promise<GeocodeResult | null> {
    try {
        const admin = createAdminClient();
        const { data } = await admin
            .from("geocode_cache")
            .select("lat, lng, confidence, display_name, created_at")
            .eq("query_norm", queryNorm)
            .maybeSingle();
        if (!data) return null;
        const ageMs = Date.now() - new Date(data.created_at).getTime();
        if (ageMs > CACHE_TTL_MS) return null;
        return {
            lat: data.lat,
            lng: data.lng,
            confidence: data.confidence,
            display_name: data.display_name,
        };
    } catch {
        return null;
    }
}

async function writeCache(queryNorm: string, result: GeocodeResult): Promise<void> {
    try {
        const admin = createAdminClient();
        await admin.from("geocode_cache").upsert(
            {
                query_norm: queryNorm,
                lat: result.lat,
                lng: result.lng,
                confidence: result.confidence,
                display_name: result.display_name,
            },
            { onConflict: "query_norm" }
        );
    } catch {
        // best-effort
    }
}

// ---------------------------------------------------------------------------
// Nominatim HTTP (throttled, time-boxed)
// ---------------------------------------------------------------------------

interface NominatimPlace {
    lat?: string;
    lon?: string;
    display_name?: string;
    addresstype?: string;
    type?: string;
    class?: string;
}

// Shared token bucket: at most 1 request/second to Nominatim.
let lastRequestAt = 0;

async function throttleNominatim(): Promise<void> {
    const now = Date.now();
    const waitMs = Math.max(0, 1000 - (now - lastRequestAt));
    if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastRequestAt = Date.now();
}

async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    ms: number
): Promise<Response> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("geocode timeout")), ms)
    );
    return Promise.race([fetch(url, init), timeout]);
}

async function nominatimGet(
    path: "search" | "reverse",
    params: Record<string, string>
): Promise<unknown> {
    const url = new URL(`${NOMINATIM_BASE}/${path}`);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }
    }
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("accept-language", "he,ar,en");

    await throttleNominatim();

    try {
        const res = await fetchWithTimeout(
            url.toString(),
            {
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: "application/json",
                },
            },
            TIMEOUT_MS
        );
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

function placeToResult(place: NominatimPlace): GeocodeResult {
    const lat = parseFloat(place.lat ?? "");
    const lng = parseFloat(place.lon ?? "");
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return { lat: null, lng: null, confidence: "none", display_name: null };
    }
    return {
        lat,
        lng,
        confidence: mapConfidence(place.addresstype, place.type, place.class),
        display_name: place.display_name ?? null,
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Forward geocodes an address (structured query first, free-text fallback).
 * Consults and writes `geocode_cache`. Never throws.
 */
export async function geocodeAddress(
    input: GeocodeAddressInput
): Promise<GeocodeResult> {
    const queryNorm = buildForwardCacheKey(input);
    const cached = await readCache(queryNorm);
    if (cached) return cached;

    const structured: Record<string, string> = { countrycodes: "il" };
    if (input.street) structured.street = input.street;
    if (input.city) structured.city = input.city;
    if (input.house_number) structured.house_number = input.house_number;

    let places: NominatimPlace[] = [];
    if (structured.street && structured.city) {
        const data = await nominatimGet("search", { ...structured, limit: "1" });
        if (Array.isArray(data)) places = data as NominatimPlace[];
    }
    if (places.length === 0) {
        const data = await nominatimGet("search", {
            q: input.full_address,
            countrycodes: "il",
            limit: "1",
        });
        if (Array.isArray(data)) places = data as NominatimPlace[];
    }

    const result: GeocodeResult =
        places.length > 0
            ? placeToResult(places[0])
            : { lat: null, lng: null, confidence: "none", display_name: null };

    await writeCache(queryNorm, result);
    return result;
}

/**
 * Reverse geocodes a coordinate. The returned lat/lng are the requested
 * point (the pin stays where the user dropped it); the confidence and
 * display_name describe what Nominatim found there. Never throws.
 */
export async function reverseGeocode(
    lat: number,
    lng: number
): Promise<GeocodeResult> {
    const queryNorm = buildReverseCacheKey(lat, lng);
    const cached = await readCache(queryNorm);
    if (cached) {
        return { lat, lng, confidence: cached.confidence, display_name: cached.display_name };
    }

    const data = await nominatimGet("reverse", {
        lat: lat.toFixed(6),
        lon: lng.toFixed(6),
        zoom: "18",
    });

    const found =
        data && typeof data === "object" ? placeToResult(data as NominatimPlace) : null;
    const result: GeocodeResult =
        found && found.lat !== null
            ? { lat, lng, confidence: found.confidence, display_name: found.display_name }
            : { lat: null, lng: null, confidence: "none", display_name: null };

    await writeCache(queryNorm, result);
    return result;
}

/**
 * Free-text search returning up to `limit` candidates (for the pin picker).
 * Throttled but not cached — it is an interactive, user-driven action.
 * Never throws.
 */
export async function searchAddresses(
    query: string,
    limit = 5
): Promise<GeocodeResult[]> {
    const data = await nominatimGet("search", {
        q: query,
        countrycodes: "il",
        limit: String(limit),
    });
    if (!Array.isArray(data)) return [];
    return (data as NominatimPlace[])
        .map(placeToResult)
        .filter((r) => r.lat !== null && r.lng !== null);
}