import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CheckoutView } from "@/components/store/checkout-view";
import { StoreChrome } from "@/components/store/store-chrome";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("checkout");
    return {
        title: t("title"),
    };
}

export default async function CheckoutPage() {
    const t = await getTranslations("checkout");

    return (
        <StoreChrome>
            <div className="flex flex-col gap-6 w-full min-w-0">
                <h1 className="font-display text-2xl font-extrabold tracking-tight">
                    {t("title")}
                </h1>
                <CheckoutView />
            </div>
        </StoreChrome>
    );
}
