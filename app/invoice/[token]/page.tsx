import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FileQuestion } from "lucide-react";

import { InvoiceView } from "@/components/invoice/invoice-view";
import { getOrderByInvoiceToken } from "@/lib/data/orders";
import { getSettings } from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("invoice");
    return { title: t("title") };
}

export default async function InvoicePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const t = await getTranslations("invoice");
    const [detail, settings] = await Promise.all([
        getOrderByInvoiceToken(token),
        getSettings(),
    ]);

    if (!detail) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <FileQuestion className="size-7" />
                </span>
                <h1 className="font-display text-xl font-extrabold">{t("notFound")}</h1>
                <p className="text-sm text-muted-foreground">{t("notFoundHint")}</p>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-muted/30 pb-10">
            <InvoiceView detail={detail} settings={settings} />
        </div>
    );
}