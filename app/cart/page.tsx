import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CartView } from "@/components/store/cart-view";
import { StoreChrome } from "@/components/store/store-chrome";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("cart");
    return {
        title: t("title"),
    };
}

export default async function CartPage() {
    const t = await getTranslations("cart");

    return (
        <StoreChrome>
            <div className="grid gap-6">
                <h1 className="font-display text-2xl font-extrabold tracking-tight">
                    {t("title")}
                </h1>
                <CartView />
            </div>
        </StoreChrome>
    );
}
