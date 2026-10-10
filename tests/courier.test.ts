import { describe, expect, it } from "vitest";

import {
    assignOrdersSchema,
    courierClaimSchema,
    courierDeclineSchema,
    courierLocationSchema,
    courierSchema,
    courierStatusSchema,
    courierUpdateStatusSchema,
    vehicleTypeSchema,
} from "@/lib/validations/courier";
import {
    addressSearchUrl,
    navigationTargets,
    sortedNavigationTargets,
    type NavigationTarget,
} from "@/lib/utils/navigation";

describe("Courier Schema & Validations", () => {
    describe("vehicleTypeSchema", () => {
        it("accepts supported vehicle types", () => {
            const allowed = ["car", "scooter", "bike", "foot"];
            for (const type of allowed) {
                expect(vehicleTypeSchema.safeParse(type).success).toBe(true);
            }
        });

        it("rejects unknown vehicle types", () => {
            const forbidden = ["truck", "skateboard", "drone", ""];
            for (const type of forbidden) {
                expect(vehicleTypeSchema.safeParse(type).success).toBe(false);
            }
        });
    });

    describe("courierSchema", () => {
        const validProfile = {
            full_name: "דני שליח",
            phone: "050-1234567",
            vehicle_type: "scooter",
            color: "#3b82f6",
            is_active: true,
            notes: "שליח אזור מרכז",
        };

        it("validates a compliant courier profile", () => {
            const result = courierSchema.safeParse(validProfile);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.full_name).toBe("דני שליח");
                expect(result.data.color).toBe("#3b82f6");
            }
        });

        it("defaults is_active to true when omitted", () => {
            const { is_active: _isActive, ...withoutActive } = validProfile;
            const result = courierSchema.safeParse(withoutActive);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.is_active).toBe(true);
            }
        });

        it("validates 6-character hex color format strictly", () => {
            expect(courierSchema.safeParse({ ...validProfile, color: "#10B981" }).success).toBe(true);
            expect(courierSchema.safeParse({ ...validProfile, color: "#000000" }).success).toBe(true);
            expect(courierSchema.safeParse({ ...validProfile, color: "#ffffff" }).success).toBe(true);

            // Invalid hex formats
            expect(courierSchema.safeParse({ ...validProfile, color: "#fff" }).success).toBe(false);
            expect(courierSchema.safeParse({ ...validProfile, color: "blue" }).success).toBe(false);
            expect(courierSchema.safeParse({ ...validProfile, color: "#12345G" }).success).toBe(false);
            expect(courierSchema.safeParse({ ...validProfile, color: "123456" }).success).toBe(false);
        });

        it("enforces name and phone boundary lengths", () => {
            expect(courierSchema.safeParse({ ...validProfile, full_name: "א" }).success).toBe(false);
            expect(courierSchema.safeParse({ ...validProfile, phone: "123" }).success).toBe(false);
            expect(courierSchema.safeParse({ ...validProfile, phone: "0".repeat(25) }).success).toBe(false);
        });
    });

    describe("assignOrdersSchema (Bulk Assignment)", () => {
        const orderId1 = "11111111-1111-4111-8111-111111111111";
        const orderId2 = "22222222-2222-4222-8222-222222222222";
        const courierId = "33333333-3333-4333-8333-333333333333";

        it("validates assigning multiple orders to a courier", () => {
            const result = assignOrdersSchema.safeParse({
                order_ids: [orderId1, orderId2],
                courier_id: courierId,
                note: "משלוח דחוף",
            });
            expect(result.success).toBe(true);
        });

        it("validates returning orders to store (courier_id = null)", () => {
            const result = assignOrdersSchema.safeParse({
                order_ids: [orderId1],
                courier_id: null,
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.courier_id).toBeNull();
            }
        });

        it("rejects empty order list", () => {
            const result = assignOrdersSchema.safeParse({
                order_ids: [],
                courier_id: courierId,
            });
            expect(result.success).toBe(false);
        });

        it("rejects non-uuid identifiers", () => {
            expect(
                assignOrdersSchema.safeParse({
                    order_ids: ["not-a-uuid"],
                    courier_id: courierId,
                }).success
            ).toBe(false);

            expect(
                assignOrdersSchema.safeParse({
                    order_ids: [orderId1],
                    courier_id: "not-a-uuid",
                }).success
            ).toBe(false);
        });
    });

    describe("courierStatusSchema & Update Validation", () => {
        const dummyToken = "abcdef1234567890abcdef";
        const validOrderId = "11111111-1111-4111-8111-111111111111";

        it("allows only permissible courier-driven statuses", () => {
            expect(courierStatusSchema.safeParse("out_for_delivery").success).toBe(true);
            expect(courierStatusSchema.safeParse("delivered").success).toBe(true);
            expect(courierStatusSchema.safeParse("preparing").success).toBe(true);

            // Forbidden for courier directly:
            expect(courierStatusSchema.safeParse("pending").success).toBe(false);
            expect(courierStatusSchema.safeParse("confirmed").success).toBe(false);
            expect(courierStatusSchema.safeParse("canceled").success).toBe(false);
        });

        it("validates courierUpdateStatusSchema with valid payload", () => {
            const result = courierUpdateStatusSchema.safeParse({
                token: dummyToken,
                order_id: validOrderId,
                to_status: "out_for_delivery",
                note: "בדרך אל הלקוח",
            });
            expect(result.success).toBe(true);
        });

        it("rejects update when token is too short", () => {
            const result = courierUpdateStatusSchema.safeParse({
                token: "short",
                order_id: validOrderId,
                to_status: "delivered",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("courierLocationSchema (GPS Reporting)", () => {
        const validToken = "1234567890123456";

        it("accepts valid geographic coordinates and accuracy", () => {
            const result = courierLocationSchema.safeParse({
                token: validToken,
                lat: 32.0853,
                lng: 34.7818,
                accuracy: 12.5,
            });
            expect(result.success).toBe(true);
        });

        it("rejects out-of-range coordinates", () => {
            // Latitude > 90
            expect(
                courierLocationSchema.safeParse({
                    token: validToken,
                    lat: 91.0,
                    lng: 34.7818,
                }).success
            ).toBe(false);

            // Latitude < -90
            expect(
                courierLocationSchema.safeParse({
                    token: validToken,
                    lat: -90.5,
                    lng: 34.7818,
                }).success
            ).toBe(false);

            // Longitude > 180
            expect(
                courierLocationSchema.safeParse({
                    token: validToken,
                    lat: 32.0,
                    lng: 181.0,
                }).success
            ).toBe(false);

            // Negative accuracy
            expect(
                courierLocationSchema.safeParse({
                    token: validToken,
                    lat: 32.0,
                    lng: 34.0,
                    accuracy: -5,
                }).success
            ).toBe(false);
        });
    });

    describe("courierClaimSchema & courierDeclineSchema", () => {
        const token = "abcdef1234567890abcdef";
        const orderId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

        it("validates order claim payload", () => {
            const result = courierClaimSchema.safeParse({
                token,
                order_id: orderId,
            });
            expect(result.success).toBe(true);
        });

        it("validates order decline with optional note", () => {
            const result = courierDeclineSchema.safeParse({
                token,
                order_id: orderId,
                note: "הרכב תקוע",
            });
            expect(result.success).toBe(true);
        });

        it("rejects claim with invalid order UUID", () => {
            const result = courierClaimSchema.safeParse({
                token,
                order_id: "not-a-uuid",
            });
            expect(result.success).toBe(false);
        });
    });
});

describe("Navigation & Deep Linking", () => {
    it("generates correct coordinate deep links for Waze, Google Maps, and Apple Maps", () => {
        const lat = 32.0853;
        const lng = 34.7818;
        const targets = navigationTargets(lat, lng, "הרצל 1, תל אביב");

        expect(targets).toHaveLength(3);

        const waze = targets.find((t) => t.app === "waze");
        expect(waze?.url).toBe(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);

        const google = targets.find((t) => t.app === "google");
        expect(google?.url).toBe(
            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
        );

        const apple = targets.find((t) => t.app === "apple");
        expect(apple?.url).toBe(`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`);
    });

    it("falls back to address-search URL when coordinates are missing", () => {
        const address = "רחוב דיזנגוף 50, תל אביב";
        const targets = navigationTargets(null, null, address);

        expect(targets).toHaveLength(3);
        const expectedSearch = addressSearchUrl(address);
        expect(expectedSearch).toBe(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        );

        for (const t of targets) {
            expect(t.url).toBe(expectedSearch);
        }
    });

    it("prioritizes Apple Maps on iOS devices", () => {
        const targets: NavigationTarget[] = [
            { app: "google", url: "https://google.com", labelKey: "nav.google" },
            { app: "waze", url: "https://waze.com", labelKey: "nav.waze" },
            { app: "apple", url: "https://apple.com", labelKey: "nav.apple" },
        ];

        const sorted = sortedNavigationTargets(targets, true);
        expect(sorted.map((t) => t.app)).toEqual(["apple", "waze", "google"]);
    });

    it("prioritizes Waze on non-iOS devices (Android / Desktop)", () => {
        const targets: NavigationTarget[] = [
            { app: "apple", url: "https://apple.com", labelKey: "nav.apple" },
            { app: "google", url: "https://google.com", labelKey: "nav.google" },
            { app: "waze", url: "https://waze.com", labelKey: "nav.waze" },
        ];

        const sorted = sortedNavigationTargets(targets, false);
        expect(sorted.map((t) => t.app)).toEqual(["waze", "google", "apple"]);
    });
});
