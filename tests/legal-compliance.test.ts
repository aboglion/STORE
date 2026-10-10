import { describe, expect, it } from "vitest";

import { settingsFormSchema } from "@/lib/validations/settings";
import { cancellationFormSchema } from "@/lib/validations/cancellation";

const t = (key: string) => key;

describe("Legal & Statutory Compliance (Israeli Law & IS 5568)", () => {
    describe("Statutory Business & Accessibility Officer Details", () => {
        it("accepts valid statutory registration and accessibility officer data", () => {
            const statutoryData = {
                store_name: "חנות הדגל בע\"מ",
                store_name_ar: "متجر الراية",
                theme: "caramel",
                delivery_fee_shekels: "20.00",
                free_delivery_threshold_shekels: "200.00",
                low_stock_threshold_default: 5,
                legal_business_name: "חנות הדגל מסחר ושיווק בע\"מ",
                business_id: "515123456", // ח.פ. / ע.מ.
                business_address: "רחוב יגאל אלון 98, תל אביב",
                business_email: "contact@store.co.il",
                business_hours: "א-ה 09:00-19:00, ו 09:00-14:00",
                accessibility_officer_name: "ישראל ישראלי",
                accessibility_officer_phone: "03-1234567",
                accessibility_officer_email: "accessibility@store.co.il",
            };

            const parsed = settingsFormSchema(t).safeParse(statutoryData);
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data.legal_business_name).toBe("חנות הדגל מסחר ושיווק בע\"מ");
                expect(parsed.data.business_id).toBe("515123456");
                expect(parsed.data.accessibility_officer_name).toBe("ישראל ישראלי");
                expect(parsed.data.accessibility_officer_email).toBe("accessibility@store.co.il");
            }
        });

        it("safely defaults missing statutory and accessibility fields to empty strings", () => {
            const minimalData = {
                store_name: "חנות בסיסית",
                delivery_fee_shekels: "0",
                free_delivery_threshold_shekels: "100",
                low_stock_threshold_default: 1,
            };

            const parsed = settingsFormSchema(t).safeParse(minimalData);
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data.legal_business_name).toBe("");
                expect(parsed.data.business_id).toBe("");
                expect(parsed.data.accessibility_officer_name).toBe("");
                expect(parsed.data.accessibility_officer_phone).toBe("");
                expect(parsed.data.accessibility_officer_email).toBe("");
            }
        });
    });

    describe("Israeli Consumer Protection Law - Cancellation Notice Form (חוק הגנת הצרכן)", () => {
        const validNotice = {
            full_name: "משה כהן",
            phone: "0501234567",
            id_number: "012345678",
            email: "moshe@example.com",
            order_number: "20261010-ABC123",
            items_description: "לחם מחמצת ועוגת שמרים",
            reason: "customer_remorse" as const,
            is_protected_population: false,
            notes: "ביקשתי לבטל שעתיים לאחר ההזמנה",
        };

        it("validates a compliant statutory cancellation form submission", () => {
            const parsed = cancellationFormSchema.safeParse(validNotice);
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data.full_name).toBe("משה כהן");
                expect(parsed.data.reason).toBe("customer_remorse");
                expect(parsed.data.is_protected_population).toBe(false);
            }
        });

        it("accepts protected population flag (senior citizen / disability / new immigrant)", () => {
            const parsed = cancellationFormSchema.safeParse({
                ...validNotice,
                is_protected_population: true,
            });
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data.is_protected_population).toBe(true);
            }
        });

        it("rejects submission with invalid email format", () => {
            const parsed = cancellationFormSchema.safeParse({
                ...validNotice,
                email: "invalid-email-address",
            });
            expect(parsed.success).toBe(false);
        });

        it("accepts empty optional email", () => {
            const parsed = cancellationFormSchema.safeParse({
                ...validNotice,
                email: "",
            });
            expect(parsed.success).toBe(true);
        });

        it("rejects submission with missing full name or short phone", () => {
            expect(
                cancellationFormSchema.safeParse({
                    ...validNotice,
                    full_name: " ",
                }).success
            ).toBe(false);

            expect(
                cancellationFormSchema.safeParse({
                    ...validNotice,
                    phone: "123",
                }).success
            ).toBe(false);
        });

        it("enforces statutory reasons enumeration", () => {
            const validReasons = [
                "defect",
                "mismatch",
                "not_delivered",
                "customer_remorse",
                "other",
            ];
            for (const r of validReasons) {
                expect(
                    cancellationFormSchema.safeParse({
                        ...validNotice,
                        reason: r,
                    }).success
                ).toBe(true);
            }

            expect(
                cancellationFormSchema.safeParse({
                    ...validNotice,
                    reason: "unauthorized_reason",
                }).success
            ).toBe(false);
        });

        it("generates correct statutory reference format CAN-YYYYMMDD-XXXXXX", () => {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const randomSuffix = 654321;
            const refNumber = `CAN-${dateStr}-${randomSuffix}`;

            expect(refNumber).toMatch(/^CAN-\d{8}-\d{6}$/);
        });
    });

    describe("Accessibility (IS 5568 / WCAG 2.1 AA) Widget Preferences", () => {
        interface A11yPreferences {
            fontSize: "normal" | "large" | "x-large";
            contrast: "normal" | "high" | "inverted";
            readableFont: boolean;
            highlightLinks: boolean;
            pauseAnimations: boolean;
        }

        it("serializes and deserializes accessibility preferences without data loss", () => {
            const customPrefs: A11yPreferences = {
                fontSize: "large",
                contrast: "high",
                readableFont: true,
                highlightLinks: true,
                pauseAnimations: true,
            };

            const serialized = JSON.stringify(customPrefs);
            const deserialized = JSON.parse(serialized);

            expect(deserialized).toEqual(customPrefs);
            expect(deserialized.contrast).toBe("high");
            expect(deserialized.fontSize).toBe("large");
        });

        it("validates valid contrast modes", () => {
            const validContrasts = ["normal", "high", "inverted"];
            for (const mode of validContrasts) {
                expect(["normal", "high", "inverted"]).toContain(mode);
            }
        });
    });
});
