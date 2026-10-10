import "server-only";

import { headers } from "next/headers";

/**
 * In-memory fixed-window rate limiter.
 *
 * Designed for the single-instance Docker deployment (no Redis needed).
 * If the app ever scales horizontally, swap the storage layer for a shared
 * store (Redis/Upstash) behind the same interface.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Lazy cleanup so the map never grows unbounded with stale IPs.
function purgeExpired(now: number) {
    if (buckets.size < 10_000) return;
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

async function getClientIp(): Promise<string> {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult =
    | { ok: true }
    | { ok: false; retryAfterSeconds: number };

/**
 * Checks the request against a fixed-window budget.
 *
 * @param key        Logical action name, e.g. "login" or "create-order".
 * @param limit      Maximum allowed requests within the window.
 * @param windowMs   Window length in milliseconds.
 * @param identifier Optional extra scope (e.g. normalized phone) — combined
 *                   with the client IP so one IP cannot bypass via rotation.
 */
export async function rateLimit(options: {
    key: string;
    limit: number;
    windowMs: number;
    identifier?: string;
}): Promise<RateLimitResult> {
    const { key, limit, windowMs, identifier } = options;
    const ip = await getClientIp();
    const bucketKey = `${key}:${identifier ?? ""}:${ip}`;
    const now = Date.now();

    purgeExpired(now);

    const bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
        return { ok: true };
    }

    if (bucket.count >= limit) {
        return {
            ok: false,
            retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        };
    }

    bucket.count += 1;
    return { ok: true };
}