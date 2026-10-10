import { beforeEach, describe, expect, it } from "vitest";
import {
    getStoredRecentOrders,
    removeRecentOrder,
    saveRecentOrder,
    type StoredRecentOrder,
} from "@/lib/utils/recent-orders";

describe("recent orders client storage helper", () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};

        // Mock window and localStorage
        const localStorageMock = {
            getItem: (key: string) => mockStorage[key] ?? null,
            setItem: (key: string, val: string) => {
                mockStorage[key] = val;
            },
            removeItem: (key: string) => {
                delete mockStorage[key];
            },
            clear: () => {
                mockStorage = {};
            },
        };

        // Attach to global
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).window = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).localStorage = localStorageMock;
    });

    it("returns empty array when nothing is stored", () => {
        expect(getStoredRecentOrders()).toEqual([]);
    });

    it("saves a new recent order and retrieves it", () => {
        const order: StoredRecentOrder = {
            orderNumber: "20261009-000001",
            totalAgorot: 3390,
            placedAt: "2026-10-09T19:09:43.000Z",
            customerName: "גדכדגכ",
            itemsCount: 1,
        };

        saveRecentOrder(order);

        const stored = getStoredRecentOrders();
        expect(stored).toHaveLength(1);
        expect(stored[0].orderNumber).toBe("20261009-000001");
        expect(stored[0].totalAgorot).toBe(3390);
    });

    it("deduplicates orders and moves newest to top", () => {
        const order1: StoredRecentOrder = {
            orderNumber: "ORD-1",
            totalAgorot: 1000,
            placedAt: "2026-10-01",
        };
        const order2: StoredRecentOrder = {
            orderNumber: "ORD-2",
            totalAgorot: 2000,
            placedAt: "2026-10-02",
        };

        saveRecentOrder(order1);
        saveRecentOrder(order2);

        let stored = getStoredRecentOrders();
        expect(stored).toHaveLength(2);
        expect(stored[0].orderNumber).toBe("ORD-2");

        // Re-save order1 with updated total
        saveRecentOrder({
            ...order1,
            totalAgorot: 1500,
        });

        stored = getStoredRecentOrders();
        expect(stored).toHaveLength(2);
        expect(stored[0].orderNumber).toBe("ORD-1");
        expect(stored[0].totalAgorot).toBe(1500);
    });

    it("removes an order by order number", () => {
        saveRecentOrder({ orderNumber: "A", totalAgorot: 100, placedAt: "1" });
        saveRecentOrder({ orderNumber: "B", totalAgorot: 200, placedAt: "2" });

        expect(getStoredRecentOrders()).toHaveLength(2);

        removeRecentOrder("A");

        const stored = getStoredRecentOrders();
        expect(stored).toHaveLength(1);
        expect(stored[0].orderNumber).toBe("B");
    });
});
