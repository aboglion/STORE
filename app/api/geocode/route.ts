import { NextResponse } from "next/server";

import {
    geocodeAddress,
    reverseGeocode,
    searchAddresses,
} from "@/lib/server/geocoding";
import { rateLimit } from "@/lib/server/rate-limit";

/**
 * Server-side geocoding proxy.
 *
 * The browser NEVER talks to Nominatim directly — the usage policy requires a
 * custom User-Agent and ≤ 1 req/s, both enforced inside lib/server/geocoding.ts.
 * This route adds a per-IP rate limit so one client cannot flood the queue.
 *
 * POST body:
 *   { mode: "forward", full_address, city?, street?, house_number? }
 *   { mode: "reverse", lat, lng }
 *   { mode: "search",  query, limit? }
 */

export const runtime = "nodejs";

const IP_LIMIT = 30; // requests
const IP_WINDOW_MS = 60_000; // per minute

interface GeocodeRequestBody {
    mode?: string;
    full_address?: string;
    city?: string;
    street?: string;
    house_number?: string;
    lat?: number;
    lng?: number;
    query?: string;
    limit?: number;
}

export async function POST(request: Request) {
    const rl = await rateLimit({
        key: "geocode-proxy",
        limit: IP_LIMIT,
        windowMs: IP_WINDOW_MS,
    });
    if (!rl.ok) {
        return NextResponse.json(
            { error: "RATE_LIMITED", retryAfterSeconds: rl.retryAfterSeconds },
            {
                status: 429,
                headers: { "Retry-After": String(rl.retryAfterSeconds) },
            }
        );
    }

    let body: GeocodeRequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    switch (body.mode) {
        case "forward": {
            const fullAddress =
                typeof body.full_address === "string" ? body.full_address.trim() : "";
            if (!fullAddress) {
                return NextResponse.json({ error: "MISSING_ADDRESS" }, { status: 400 });
            }
            const result = await geocodeAddress({
                full_address: fullAddress,
                city: typeof body.city === "string" ? body.city : null,
                street: typeof body.street === "string" ? body.street : null,
                house_number:
                    typeof body.house_number === "string" ? body.house_number : null,
            });
            return NextResponse.json({ ok: true, result });
        }

        case "reverse": {
            const lat = typeof body.lat === "number" ? body.lat : Number.NaN;
            const lng = typeof body.lng === "number" ? body.lng : Number.NaN;
            if (
                Number.isNaN(lat) ||
                Number.isNaN(lng) ||
                lat < -90 ||
                lat > 90 ||
                lng < -180 ||
                lng > 180
            ) {
                return NextResponse.json({ error: "INVALID_COORDS" }, { status: 400 });
            }
            const result = await reverseGeocode(lat, lng);
            return NextResponse.json({ ok: true, result });
        }

        case "search": {
            const query =
                typeof body.query === "string" ? body.query.trim() : "";
            if (!query) {
                return NextResponse.json({ error: "MISSING_QUERY" }, { status: 400 });
            }
            const limit = Math.min(
                Math.max(typeof body.limit === "number" ? body.limit : 5, 1),
                10
            );
            const results = await searchAddresses(query, limit);
            return NextResponse.json({ ok: true, results });
        }

        default:
            return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
    }
}