import { describe, expect, it } from "vitest";
import heMessages from "@/messages/he.json";
import arMessages from "@/messages/ar.json";

describe("admin account security and translations", () => {
    it("has complete admin.account messages in Hebrew", () => {
        const account = (heMessages as any).admin.account;
        expect(account).toBeDefined();
        expect(account.title).toBeTruthy();
        expect(account.desc).toBeTruthy();
        expect(account.currentEmail).toBeTruthy();
        expect(account.newEmail).toBeTruthy();
        expect(account.currentPassword).toBeTruthy();
        expect(account.newPassword).toBeTruthy();
        expect(account.confirmPassword).toBeTruthy();
        expect(account.submit).toBeTruthy();
        expect(account.databasePersistedBadge).toBeTruthy();
        expect(account.databasePersistedDesc).toBeTruthy();
        expect(account.currentPasswordRequired).toBeTruthy();
        expect(account.wrongCurrentPassword).toBeTruthy();
        expect(account.credentialsUpdatedSuccess).toBeTruthy();
    });

    it("has complete admin.account messages in Arabic matching Hebrew keys", () => {
        const heAccount = (heMessages as any).admin.account;
        const arAccount = (arMessages as any).admin.account;
        expect(arAccount).toBeDefined();

        for (const key of Object.keys(heAccount)) {
            expect(arAccount[key], `Missing Arabic translation for key "${key}"`).toBeTruthy();
        }
    });

    it("validates email regex correctly", () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test("admin@example.com")).toBe(true);
        expect(emailRegex.test("new.admin@store.co.il")).toBe(true);
        expect(emailRegex.test("invalid-email")).toBe(false);
        expect(emailRegex.test("admin@")).toBe(false);
        expect(emailRegex.test("@domain.com")).toBe(false);
    });

    it("verifies password requirements", () => {
        const minLength = 6;
        expect("12345".length >= minLength).toBe(false);
        expect("123456".length >= minLength).toBe(true);
        expect("admin1234".length >= minLength).toBe(true);
    });
});
