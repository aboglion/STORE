"use client";

export interface StoredRecentOrder {
    orderNumber: string;
    /** Phone used to authorize lookups of this order (required). */
    phone: string;
    totalAgorot: number;
    placedAt: string;
    customerName?: string;
    itemsCount?: number;
}

const STORAGE_KEY = "omar_recent_orders_v1";
const MAX_STORED = 20;

export function getStoredRecentOrders(): StoredRecentOrder[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch {
        return [];
    }
}

export function saveRecentOrder(order: StoredRecentOrder) {
    if (typeof window === "undefined") return;
    try {
        const current = getStoredRecentOrders();
        // Remove existing duplicate if present
        const filtered = current.filter((o) => o.orderNumber !== order.orderNumber);
        // Prepend newest
        const updated = [order, ...filtered].slice(0, MAX_STORED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Ignore localStorage quota or private browsing errors
    }
}

export function removeRecentOrder(orderNumber: string) {
    if (typeof window === "undefined") return;
    try {
        const current = getStoredRecentOrders();
        const updated = current.filter((o) => o.orderNumber !== orderNumber);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Ignore errors
    }
}
