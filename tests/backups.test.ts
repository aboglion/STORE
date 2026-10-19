import { describe, expect, it } from "vitest";

import {
    BACKUP_ID_PATTERN,
    DEFAULT_BACKUP_TZ,
    formatInTz,
    getNextScheduledRun,
    isValidBackupId,
    normalizeConfig,
} from "@/lib/server/backups";

describe("backup id validation", () => {
    it("accepts valid backup folder ids", () => {
        for (const id of [
            "20261017T203000Z_manual",
            "20260101T030000Z_scheduled",
            "20261231T235959Z_pre-restore",
            "20261019T101500Z_uploaded",
        ]) {
            expect(isValidBackupId(id)).toBe(true);
            expect(BACKUP_ID_PATTERN.test(id)).toBe(true);
        }
    });

    it("rejects malformed ids and path traversal attempts", () => {
        const bad = [
            "",
            "20261017T203000Z", // missing type suffix
            "20261017T203000Z_other", // invalid type
            "20261017T203000Z_manual/../../etc", // traversal
            "20261017T203000Z_manual/evil",
            "../20261017T203000Z_manual",
            "manual",
            "20261017_203000_manual",
            "X0261017T203000Z_manual",
            "20261017T20300Z_manual", // too short
            "20261017T203000Z_manual\n",
        ];
        for (const id of bad) {
            expect(isValidBackupId(id)).toBe(false);
        }
    });
});

describe("config normalization", () => {
    it("applies defaults when input is empty", () => {
        const cfg = normalizeConfig({});
        expect(cfg.enabled).toBe(true);
        expect(cfg.times).toEqual(["03:00", "16:00"]);
        expect(cfg.retention).toBe(30);
        expect(cfg.timezone).toBe(DEFAULT_BACKUP_TZ);
    });

    it("filters invalid times and dedupes + sorts", () => {
        const cfg = normalizeConfig({
            times: ["16:00", "03:00", "16:00", "25:00", "09:99", "bad"],
        });
        expect(cfg.times).toEqual(["03:00", "16:00"]);
    });

    it("clamps retention to [1, 90]", () => {
        expect(normalizeConfig({ retention: 0 }).retention).toBe(1);
        expect(normalizeConfig({ retention: 500 }).retention).toBe(90);
        expect(normalizeConfig({ retention: 15 }).retention).toBe(15);
        expect(normalizeConfig({ retention: Number.NaN }).retention).toBe(30);
    });

    it("honors the enabled flag", () => {
        expect(normalizeConfig({ enabled: false }).enabled).toBe(false);
        expect(normalizeConfig({ enabled: true }).enabled).toBe(true);
    });
});

describe("next scheduled run (Asia/Jerusalem, DST-aware)", () => {
    const tz = "Asia/Jerusalem";

    it("returns the next time today when it is still ahead", () => {
        const now = new Date("2026-10-17T08:00:00Z"); // 11:00 Jerusalem (IDT, UTC+3)
        const next = getNextScheduledRun(["03:00", "16:00"], tz, now);
        expect(next).not.toBeNull();
        // 16:00 IDT = 13:00 UTC
        expect(next!.toISOString()).toBe("2026-10-17T13:00:00.000Z");
    });

    it("rolls over to tomorrow when all times already passed", () => {
        const now = new Date("2026-10-17T14:00:00Z"); // 17:00 Jerusalem
        const next = getNextScheduledRun(["03:00", "16:00"], tz, now);
        expect(next).not.toBeNull();
        // next: tomorrow 03:00 Israel. In October (DST, UTC+3) → 00:00 UTC
        expect(next!.toISOString()).toBe("2026-10-18T00:00:00.000Z");
    });

    it("handles winter time (UTC+2) correctly", () => {
        const now = new Date("2026-01-10T12:00:00Z"); // 14:00 IST (UTC+2)
        const next = getNextScheduledRun(["16:00"], tz, now);
        expect(next).not.toBeNull();
        // 16:00 IST = 14:00 UTC
        expect(next!.toISOString()).toBe("2026-01-10T14:00:00.000Z");
    });

    it("returns null when no valid times are configured", () => {
        expect(getNextScheduledRun([], tz)).toBeNull();
        expect(getNextScheduledRun(["25:00", "abc"], tz)).toBeNull();
    });
});

describe("formatting", () => {
    it("formats a date in the Jerusalem timezone", () => {
        const out = formatInTz(new Date("2026-10-17T13:00:00Z"), "Asia/Jerusalem", "he-IL");
        expect(out).toContain("2026");
        // 13:00 UTC = 16:00 Jerusalem — the time should appear
        expect(out).toMatch(/\d{1,2}:\d{2}/);
    });
});

describe("maintenance mode", () => {
    it("can activate and deactivate maintenance mode", async () => {
        const { isMaintenanceActive, setMaintenanceMode, getMaintenanceStatus } = await import("@/lib/server/backups");
        expect(isMaintenanceActive()).toBe(false);

        const ok = setMaintenanceMode(true, "test-maintenance");
        expect(ok).toBe(true);
        expect(isMaintenanceActive()).toBe(true);

        const status = getMaintenanceStatus();
        expect(status.active).toBe(true);
        expect(status.reason).toBe("test-maintenance");
        expect(status.startedAt).toBeDefined();

        setMaintenanceMode(false);
        expect(isMaintenanceActive()).toBe(false);
    });
});

