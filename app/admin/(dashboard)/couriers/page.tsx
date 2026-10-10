import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { CouriersView } from "@/components/admin/couriers-view";
import { requireAdmin } from "@/lib/auth";
import { getCouriers, getCouriersLiveRows } from "@/lib/data/couriers";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.couriers");
    return {
        title: t("title"),
    };
}

export default async function AdminCouriersPage() {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.couriers");

    const [couriers, liveRows] = await Promise.all([
        getCouriers(),
        getCouriersLiveRows(),
    ]);

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight">
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("count", { count: couriers.length })}
                </p>
            </div>

            <CouriersView
                couriers={couriers}
                liveRows={liveRows}
                locale={locale}
            />
        </div>
    );
}