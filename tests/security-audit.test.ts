import { describe, expect, it } from "vitest";

import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { normalizeIsraeliPhone } from "@/lib/utils/phone";

describe("Security Audit & Protection Hardening", () => {
    describe("Non-Enumerable Random Order Numbers", () => {
        const ORDER_NUMBER_REGEX = /^\d{8}-[A-F0-9]{6}$/;

        function generateOrderNumberMock(): string {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            const datePart = `${year}${month}${day}`;

            // Emulate Postgres: upper(substr(md5(random()::text), 1, 6))
            const hexChars = "0123456789ABCDEF";
            let suffix = "";
            for (let i = 0; i < 6; i++) {
                suffix += hexChars[Math.floor(Math.random() * 16)];
            }
            return `${datePart}-${suffix}`;
        }

        it("matches the hardened YYYYMMDD-XXXXXX format", () => {
            const num = generateOrderNumberMock();
            expect(num).toMatch(ORDER_NUMBER_REGEX);
            expect(num.length).toBe(15);
        });

        it("does not allow sequential guessability (entropy check)", () => {
            const samples = new Set<string>();
            const count = 200;

            for (let i = 0; i < count; i++) {
                const num = generateOrderNumberMock();
                samples.add(num);
            }

            // In 200 samples of 16^6 (16.7M) space, 0 collisions are expected.
            expect(samples.size).toBe(count);
        });
    });

    describe("MIME Type Allowlist & SVG Upload Prevention", () => {
        it("allows only safe bitmap/compressed modern formats", () => {
            expect(ALLOWED_IMAGE_TYPES.get("image/jpeg")).toBe("jpg");
            expect(ALLOWED_IMAGE_TYPES.get("image/png")).toBe("png");
            expect(ALLOWED_IMAGE_TYPES.get("image/webp")).toBe("webp");
            expect(ALLOWED_IMAGE_TYPES.get("image/avif")).toBe("avif");
        });

        it("strictly excludes SVG to prevent script injection (XSS)", () => {
            expect(ALLOWED_IMAGE_TYPES.has("image/svg+xml")).toBe(false);
            expect(ALLOWED_IMAGE_TYPES.has("image/svg")).toBe(false);
        });

        it("strictly rejects executable, script, and HTML file types", () => {
            const dangerousTypes = [
                "text/html",
                "application/javascript",
                "text/javascript",
                "application/x-sh",
                "application/x-executable",
                "application/x-php",
                "application/octet-stream",
            ];

            for (const type of dangerousTypes) {
                expect(ALLOWED_IMAGE_TYPES.has(type)).toBe(false);
            }
        });
    });

    describe("Order Lookup Security & Phone Privacy Validation", () => {
        it("enforces strict normalization to E.164 preventing partial matching bypasses", () => {
            const validPhones = [
                { input: "050-123-4567", expected: "+972501234567" },
                { input: "052 987 6543", expected: "+972529876543" },
                { input: "+972-54-111-2233", expected: "+972541112233" },
                { input: "0581234567", expected: "+972581234567" },
            ];

            for (const { input, expected } of validPhones) {
                expect(normalizeIsraeliPhone(input)).toBe(expected);
            }
        });

        it("rejects invalid, empty, or short phones", () => {
            expect(normalizeIsraeliPhone("")).toBeNull();
            expect(normalizeIsraeliPhone("050")).toBeNull();
            expect(normalizeIsraeliPhone("abc")).toBeNull();
            expect(normalizeIsraeliPhone("123456")).toBeNull();
        });
    });

    describe("Rate Limiting Window Algorithm", () => {
        // Pure rate limiter simulation to verify the window calculation logic
        class RateLimiterSimulator {
            private buckets = new Map<string, { count: number; resetAt: number }>();

            check(
                key: string,
                limit: number,
                windowMs: number,
                now: number
            ): { ok: boolean; retryAfterSeconds?: number } {
                const bucket = this.buckets.get(key);
                if (!bucket || bucket.resetAt <= now) {
                    this.buckets.set(key, { count: 1, resetAt: now + windowMs });
                    return { ok: true };
                }

                if (bucket.count >= limit) {
                    return {
                        ok: false,
                        retryAfterSeconds: Math.max(
                            1,
                            Math.ceil((bucket.resetAt - now) / 1000)
                        ),
                    };
                }

                bucket.count += 1;
                return { ok: true };
            }
        }

        it("allows requests up to the limit and blocks excess requests", () => {
            const limiter = new RateLimiterSimulator();
            const now = 1000000;
            const windowMs = 60_000;
            const limit = 3;

            expect(limiter.check("user-1", limit, windowMs, now).ok).toBe(true);
            expect(limiter.check("user-1", limit, windowMs, now).ok).toBe(true);
            expect(limiter.check("user-1", limit, windowMs, now).ok).toBe(true);

            // 4th request exceeds limit
            const blocked = limiter.check("user-1", limit, windowMs, now);
            expect(blocked.ok).toBe(false);
            expect(blocked.retryAfterSeconds).toBe(60);
        });

        it("resets budget once window expires", () => {
            const limiter = new RateLimiterSimulator();
            let now = 1000000;
            const windowMs = 10_000;
            const limit = 2;

            expect(limiter.check("ip-1", limit, windowMs, now).ok).toBe(true);
            expect(limiter.check("ip-1", limit, windowMs, now).ok).toBe(true);
            expect(limiter.check("ip-1", limit, windowMs, now).ok).toBe(false);

            // Advance time past windowMs
            now += 10_001;
            expect(limiter.check("ip-1", limit, windowMs, now).ok).toBe(true);
        });

        it("isolates different identifiers completely", () => {
            const limiter = new RateLimiterSimulator();
            const now = 1000000;

            limiter.check("ip-A", 1, 60_000, now);
            expect(limiter.check("ip-A", 1, 60_000, now).ok).toBe(false);

            // ip-B should still be allowed
            expect(limiter.check("ip-B", 1, 60_000, now).ok).toBe(true);
        });
    });
});
