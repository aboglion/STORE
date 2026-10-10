import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StoreChrome } from "@/components/store/store-chrome";
import { CustomerOrdersView } from "@/components/store/customer-orders-view";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("orders");
    return {
        title: t("title"),
        description: t("description"),
    };
}

export default async function CustomerOrdersPage() {
    return (
        <StoreChrome>
            <div className="py-2 sm:py-6">
                <Suspense fallback={null}>
                    <CustomerOrdersView />
                </Suspense>
            </div>
        </StoreChrome>
    );
}
