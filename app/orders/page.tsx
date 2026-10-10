import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StoreChrome } from "@/components/store/store-chrome";
import { CustomerOrdersView } from "@/components/store/customer-orders-view";
import { getPublicOrder } from "@/lib/actions/orders-public";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("orders");
    return {
        title: t("title"),
        description: t("description"),
    };
}

export default async function CustomerOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ order?: string }>;
}) {
    const { order: orderNumber } = await searchParams;

    const initialOrder = orderNumber ? await getPublicOrder(orderNumber) : null;

    return (
        <StoreChrome>
            <div className="py-2 sm:py-6">
                <CustomerOrdersView initialOrder={initialOrder} />
            </div>
        </StoreChrome>
    );
}
