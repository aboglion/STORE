import { describe, expect, it } from "vitest";

import {
    ISRAEL_TIMEZONE,
    formatDate,
    formatDateTime,
    formatRelativeDuration,
    formatTime,
    getIsraelStartOfDayUtc,
    relativeTime,
    toIsraelDatetimeLocal,
} from "@/lib/utils/dates";

describe("Israel Timezone & Date Formatting Utilities", () => {
    it("exports ISRAEL_TIMEZONE as Asia/Jerusalem", () => {
        expect(ISRAEL_TIMEZONE).toBe("Asia/Jerusalem");
    });

    describe("formatDateTime", () => {
        it("formats UTC summer timestamp (IDT = UTC+3) in Israel time", () => {
            // 2026-07-15T10:30:00Z -> 13:30 Israel Daylight Time
            const formatted = formatDateTime("2026-07-15T10:30:00Z");
            expect(formatted).toBe("15/07/2026 13:30");
        });

        it("formats UTC winter timestamp (IST = UTC+2) in Israel time", () => {
            // 2026-01-15T10:30:00Z -> 12:30 Israel Standard Time
            const formatted = formatDateTime("2026-01-15T10:30:00Z");
            expect(formatted).toBe("15/01/2026 12:30");
        });

        it("handles late-night UTC timestamp that crosses into next day in Israel", () => {
            // 2026-10-17T22:30:00Z (UTC) is 2026-10-18 01:30 in Israel (UTC+3)
            const formatted = formatDateTime("2026-10-17T22:30:00Z");
            expect(formatted).toBe("18/10/2026 01:30");
        });

        it("accepts Date instances", () => {
            const date = new Date("2026-05-20T08:15:00Z");
            expect(formatDateTime(date)).toBe("20/05/2026 11:15");
        });

        it("returns empty string for null, undefined or invalid dates", () => {
            expect(formatDateTime(null)).toBe("");
            expect(formatDateTime(undefined)).toBe("");
            expect(formatDateTime("invalid-date")).toBe("");
        });
    });

    describe("formatDate", () => {
        it("formats date as dd/MM/yyyy in Israel timezone", () => {
            // 2026-12-31T23:00:00Z -> 2027-01-01 in Israel (+2)
            expect(formatDate("2026-12-31T23:00:00Z")).toBe("01/01/2027");
            expect(formatDate("2026-12-31T21:00:00Z")).toBe("31/12/2026");
        });
    });

    describe("formatTime", () => {
        it("formats time as HH:mm in Israel timezone", () => {
            // Summer (UTC+3): 09:05Z -> 12:05
            expect(formatTime("2026-08-10T09:05:00Z")).toBe("12:05");
            // Winter (UTC+2): 09:05Z -> 11:05
            expect(formatTime("2026-02-10T09:05:00Z")).toBe("11:05");
        });
    });

    describe("toIsraelDatetimeLocal", () => {
        it("formats into YYYY-MM-DDTHH:mm input string in Israel time", () => {
            const date = new Date("2026-06-15T14:45:00Z"); // +3h in summer = 17:45
            expect(toIsraelDatetimeLocal(date)).toBe("2026-06-15T17:45");
        });
    });

    describe("getIsraelStartOfDayUtc", () => {
        it("computes exact midnight in Israel as UTC instant", () => {
            // Summer test date: 2026-07-20 15:00 UTC (18:00 Israel)
            const summerTest = new Date("2026-07-20T15:00:00Z");
            const summerMidnight = getIsraelStartOfDayUtc(summerTest);

            // In summer (UTC+3), midnight July 20 is 2026-07-19T21:00:00.000Z
            expect(summerMidnight.toISOString()).toBe("2026-07-19T21:00:00.000Z");

            // Format back in Israel timezone to confirm wall-clock 00:00
            const checkFmt = new Intl.DateTimeFormat("en-GB", {
                timeZone: ISRAEL_TIMEZONE,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            }).format(summerMidnight);

            expect(checkFmt).toBe("20/07/2026, 00:00:00");
        });

        it("computes exact midnight in Israel during winter time", () => {
            // Winter test date: 2026-01-10 15:00 UTC (17:00 Israel)
            const winterTest = new Date("2026-01-10T15:00:00Z");
            const winterMidnight = getIsraelStartOfDayUtc(winterTest);

            // In winter (UTC+2), midnight Jan 10 is 2026-01-09T22:00:00.000Z
            expect(winterMidnight.toISOString()).toBe("2026-01-09T22:00:00.000Z");
        });
    });

    describe("relativeTime and formatRelativeDuration", () => {
        it("formats relative duration in Hebrew and Arabic", () => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

            const heRelative = relativeTime(fiveMinutesAgo, "he");
            const arRelative = relativeTime(fiveMinutesAgo, "ar");

            expect(heRelative).toBeTruthy();
            expect(arRelative).toBeTruthy();

            const heDuration = formatRelativeDuration(fiveMinutesAgo, now.toISOString(), "he");
            const arDuration = formatRelativeDuration(fiveMinutesAgo, now.toISOString(), "ar");
            expect(heDuration).toBeTruthy();
            expect(arDuration).toBeTruthy();
        });
    });
});
