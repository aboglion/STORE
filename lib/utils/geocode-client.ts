/**
 * Client-side helpers for the geocoding proxy (app/api/geocode/route.ts).
 *
 * Safe to import from client components — never talks to Nominatim directly,
 * only to our own server route which enforces the usage policy.
 */

export interface GeocodeClientResult {
    lat: number | null;
    lng: number | null;
    confidence: "high" | "medium" | "low" | "none";
    display_name: string | null;
}

async function postGeocode<T>(body: unknown): Promise<T | null> {
    try {
        const res = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

export async function geocodeForward(input: {
    full_address: string;
    city?: string | null;
    street?: string | null;
    house_number?: string | null;
}): Promise<GeocodeClientResult | null> {
    const data = await postGeocode<{ ok: true; result: GeocodeClientResult }>({
        mode: "forward",
        ...input,
    });
    return data?.result ?? null;
}

export async function geocodeReverse(
    lat: number,
    lng: number
): Promise<GeocodeClientResult | null> {
    const data = await postGeocode<{ ok: true; result: GeocodeClientResult }>({
        mode: "reverse",
        lat,
        lng,
    });
    return data?.result ?? null;
}

export async function geocodeSearch(
    query: string,
    limit = 5
): Promise<GeocodeClientResult[]> {
    const data = await postGeocode<{ ok: true; results: GeocodeClientResult[] }>({
        mode: "search",
        query,
        limit,
    });
    return data?.results ?? [];
}