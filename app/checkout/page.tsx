import type { Metadata } from "next";

import { CheckoutView } from "@/components/store/checkout-view";
import { StoreChrome } from "@/components/store/store-chrome";

export const metadata: Metadata = {
    title: "צ'קאאוט",
};

export default function CheckoutPage() {
    return (
        <StoreChrome>
            <div className="grid gap-6">
                <h1 className="text-2xl font-bold">צ'קאאוט</h1>
                <CheckoutView />
            </div>
        </StoreChrome>
    );
}