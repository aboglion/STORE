import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StoreChrome } from "@/components/store/store-chrome";
import { OrderSuccessView } from "@/components/store/order-success-view";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("orderSuccess");
    return {
        title: t("title"),
    };
}

export default async function OrderSuccessPage({
    params,
    searchParams,
}: {
    params: Promise<{ orderNumber: string }>;
    searchParams: Promise<{ total?: string }>;
}) {
    const { orderNumber } = await params;
    const { total } = await searchParams;

    return (
        <StoreChrome>
            <OrderSuccessView orderNumber={orderNumber} total={total} />
        </StoreChrome>
    );
}
