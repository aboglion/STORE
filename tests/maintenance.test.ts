import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
    getMaintenanceStatus,
    isMaintenanceActive,
    setMaintenanceMode,
} from "@/lib/server/backups";

describe("store maintenance mode", () => {
    beforeEach(() => {
        setMaintenanceMode(false);
    });

    afterEach(() => {
        setMaintenanceMode(false);
    });

    it("starts in inactive state", () => {
        expect(isMaintenanceActive()).toBe(false);
        const status = getMaintenanceStatus();
        expect(status.active).toBe(false);
    });

    it("activates maintenance mode with reason, message and expected duration", () => {
        const ok = setMaintenanceMode(true, "ספירת מלאי תקופתית", {
            message: "אנו עורכים ספירת מלאי שנתית ונשוב בקרוב",
            expectedDuration: "עד השעה 16:00",
        });

        expect(ok).toBe(true);
        expect(isMaintenanceActive()).toBe(true);

        const status = getMaintenanceStatus();
        expect(status.active).toBe(true);
        expect(status.reason).toBe("ספירת מלאי תקופתית");
        expect(status.message).toBe("אנו עורכים ספירת מלאי שנתית ונשוב בקרוב");
        expect(status.expectedDuration).toBe("עד השעה 16:00");
        expect(status.startedAt).toBeDefined();
    });

    it("cleans up maintenance mode when deactivated", () => {
        setMaintenanceMode(true, "בדיקה");
        expect(isMaintenanceActive()).toBe(true);

        const ok = setMaintenanceMode(false);
        expect(ok).toBe(true);
        expect(isMaintenanceActive()).toBe(false);

        const status = getMaintenanceStatus();
        expect(status.active).toBe(false);
    });
});
