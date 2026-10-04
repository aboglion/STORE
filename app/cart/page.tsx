import type { Metadata } from "next";

import { CartView } from "@/components/store/cart-view";
import { StoreChrome } from "@/components/store/store-chrome";

export const metadata: Metadata = {
    title: "סל קניות",
};

export default function CartPage() {
    return (
        <StoreChrome>
            <div className="grid gap-6">
                <h1 className="text-2xl font-bold">סל קניות</h1>
                <CartView />
            </div>
        </StoreChrome>
    );
}