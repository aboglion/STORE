"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { CART_STORAGE_KEY } from "@/lib/constants";
import type { CartItem } from "@/types/database.types";

type CartContextValue = {
    items: CartItem[];
    count: number;
    addItem: (productId: string, quantity?: number) => void;
    setQuantity: (productId: string, quantity: number) => void;
    removeItem: (productId: string) => void;
    clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(CART_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as CartItem[];
                if (Array.isArray(parsed)) setItems(parsed);
            }
        } catch {
            // corrupted storage — start fresh
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // storage unavailable (private mode etc.)
        }
    }, [items, hydrated]);

    const addItem = useCallback((productId: string, quantity = 1) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.product_id === productId);
            if (existing) {
                return prev.map((i) =>
                    i.product_id === productId
                        ? { ...i, quantity: i.quantity + quantity }
                        : i
                );
            }
            return [...prev, { product_id: productId, quantity }];
        });
    }, []);

    const setQuantity = useCallback((productId: string, quantity: number) => {
        setItems((prev) =>
            quantity <= 0
                ? prev.filter((i) => i.product_id !== productId)
                : prev.map((i) =>
                    i.product_id === productId ? { ...i, quantity } : i
                )
        );
    }, []);

    const removeItem = useCallback((productId: string) => {
        setItems((prev) => prev.filter((i) => i.product_id !== productId));
    }, []);

    const clear = useCallback(() => {
        setItems([]);
    }, []);

    const count = useMemo(
        () => items.reduce((sum, i) => sum + i.quantity, 0),
        [items]
    );

    return (
        <CartContext.Provider
            value={{ items, count, addItem, setQuantity, removeItem, clear }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}