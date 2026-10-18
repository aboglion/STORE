import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import heMessages from "@/messages/he.json";
import arMessages from "@/messages/ar.json";

describe("PWA Specification and Assets", () => {
    it("ensures all required PWA icons exist in public directory", () => {
        const requiredIcons = [
            "icon.svg",
            "icon-192.png",
            "icon-512.png",
            "icon-maskable-192.png",
            "icon-maskable-512.png",
            "apple-touch-icon.png",
        ];

        for (const file of requiredIcons) {
            const filePath = path.join(process.cwd(), "public", file);
            expect(fs.existsSync(filePath), `Missing asset: public/${file}`).toBe(true);
            const stats = fs.statSync(filePath);
            expect(stats.size).toBeGreaterThan(100);
        }
    });

    it("ensures service worker public/sw.js exists and handles installation/offline cache", () => {
        const swPath = path.join(process.cwd(), "public", "sw.js");
        expect(fs.existsSync(swPath)).toBe(true);
        const content = fs.readFileSync(swPath, "utf-8");
        expect(content).toContain("addEventListener('install'");
        expect(content).toContain("addEventListener('fetch'");
        expect(content).toContain("icon-192.png");
    });

    it("ensures full translation parity for pwa dictionary in Hebrew and Arabic", () => {
        const heKeys = Object.keys(heMessages.pwa).sort();
        const arKeys = Object.keys(arMessages.pwa).sort();

        expect(heKeys.length).toBeGreaterThan(5);
        expect(heKeys).toEqual(arKeys);

        for (const key of heKeys) {
            const heVal = (heMessages.pwa as Record<string, string>)[key];
            const arVal = (arMessages.pwa as Record<string, string>)[key];
            expect(typeof heVal).toBe("string");
            expect(heVal.trim().length).toBeGreaterThan(0);
            expect(typeof arVal).toBe("string");
            expect(arVal.trim().length).toBeGreaterThan(0);
        }
    });
});
